#!/usr/bin/env python3
"""Structured database/formula/form HTTP tests in an isolated install. --mysql uses an owned local server."""
import base64, importlib.util, io, json, pathlib, subprocess, sys, unittest, zipfile
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('feuillet_smoke',HERE/'smoke.py');harness=importlib.util.module_from_spec(spec);spec.loader.exec_module(harness)

class Databases(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        harness.Integration.setUpClass();cls.admin=harness.Integration.admin;cls.visitor=harness.Integration.visitor
    @classmethod
    def tearDownClass(cls): harness.Integration.tearDownClass()
    def ok(self,response,status=200): self.assertEqual(response[0],status,response[1]);return response[1]
    def invalid(self,response): self.assertIn(response[0],(400,422),response[1])
    def prop(self,db,name,type,config=None,required=False):
        return self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':name,'type':type,'config':config or {},'required':required}))['property']
    def page(self,content):
        p=self.ok(self.admin.api('save',{'title':'Référence publique','content':{'type':'doc','content':content}}))['page']
        return self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
    def values(self,name='Cours',amount=10): return {self.title['id']:name,self.amount['id']:amount}
    def test_01_typed_crud_and_versions(self):
        self.ok(self.visitor.api('db_list'),401)
        db=self.ok(self.admin.api('db_save',{'name':'Suivi de ressources'}))['database'];self.assertEqual(db['visibility'],'private')
        title=self.prop(db,'Nom','title',required=True);amount=self.prop(db,'Montant','number');email=self.prop(db,'Courriel','email');date=self.prop(db,'Date','date');select=self.prop(db,'État','select',{'options':['À lire','Lu']})
        type(self).db=db;type(self).title=title;type(self).amount=amount;type(self).email=email
        self.invalid(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:'  '}}))
        self.invalid(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:'Cours',amount['id']:'10'}}))
        self.invalid(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:'Cours',email['id']:'invalide'}}))
        self.invalid(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:'Cours',date['id']:'2026-02-31'}}))
        self.invalid(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:'Cours',select['id']:'Inconnu'}}))
        row=self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':self.values()}))['row'];self.assertEqual(row['values'][amount['id']],10);type(self).row=row
        self.ok(self.admin.api('row_save',{'id':row['id'],'db_id':db['id'],'version':row['version']-1,'values':self.values()}),409)
        self.ok(self.visitor.api('public_db_get',query='&id='+db['id']),404)
    def test_02_safe_formulas_and_cycles(self):
        total=self.prop(self.db,'TTC','formula',{'expression':'round(prop("Montant") * 1.2, 2)'})
        text=self.prop(self.db,'Résumé','formula',{'expression':'concat(prop("Nom"), " : ", if(prop("Montant") > 0, "oui", "non"))'})
        rows=self.ok(self.admin.api('db_get',query='&id='+self.db['id']))['rows'];row=next(r for r in rows if r['id']==self.row['id'])
        self.assertEqual(row['derived'][total['id']],12);self.assertEqual(row['derived'][text['id']],'Cours : oui')
        preview=self.ok(self.admin.api('formula_preview',{'db_id':self.db['id'],'expression':'if(true, sum(1, 2, 3), 1 / 0)'}));self.assertEqual(preview['value'],6)
        self.assertIn('error',self.ok(self.admin.api('formula_preview',{'db_id':self.db['id'],'expression':'system("id")'})))
        self.assertIn('error',self.ok(self.admin.api('formula_preview',{'db_id':self.db['id'],'expression':'1 / 0'})))
        self.invalid(self.admin.api('property_save',{'db_id':self.db['id'],'name':'Injection','type':'formula','config':{'expression':'1; file_get_contents("/etc/passwd")'}}))
        a=self.prop(self.db,'Cycle A','formula',{'expression':'prop("Cycle B") + 1'});b=self.prop(self.db,'Cycle B','formula',{'expression':'prop("Cycle A") + 1'})
        row=self.ok(self.admin.api('db_get',query='&id='+self.db['id']))['rows'][0];self.assertIn(a['id'],row['errors']);self.assertIn(b['id'],row['errors'])
    def test_03_relations_rollups_and_validation(self):
        target=self.ok(self.admin.api('db_save',{'name':'Séances'}))['database'];name=self.prop(target,'Séance','title');number=self.prop(target,'Durée','number')
        one=self.ok(self.admin.api('row_save',{'db_id':target['id'],'values':{name['id']:'Séance secrète',number['id']:2}}))['row']
        two=self.ok(self.admin.api('row_save',{'db_id':target['id'],'values':{name['id']:'Autre séance',number['id']:8}}))['row']
        rel=self.prop(self.db,'Séances liées','relation',{'target_db_id':target['id']})
        rollup=self.prop(self.db,'Total durée','rollup',{'relation_property_id':rel['id'],'target_property_id':number['id'],'operation':'sum'})
        count=self.prop(self.db,'Nombre','rollup',{'relation_property_id':rel['id'],'target_property_id':number['id'],'operation':'count'})
        avg=self.prop(self.db,'Moyenne','rollup',{'relation_property_id':rel['id'],'target_property_id':number['id'],'operation':'avg'})
        vals=self.values('Avec relations',20);vals[rel['id']]=[one['id'],two['id']]
        row=self.ok(self.admin.api('row_save',{'db_id':self.db['id'],'values':vals}))['row']
        self.assertEqual(row['derived'][rollup['id']],10);self.assertEqual(row['derived'][count['id']],2);self.assertEqual(row['derived'][avg['id']],5)
        vals[rel['id']]=[self.row['id']];self.invalid(self.admin.api('row_save',{'db_id':self.db['id'],'values':vals}))
        type(self).rel=rel;type(self).rollup=rollup;type(self).target=target;type(self).target_rows=[one,two]
    def test_04_explicit_public_gate_and_private_relations(self):
        db=self.ok(self.admin.api('db_save',{'id':self.db['id'],'version':self.db['version'],'name':self.db['name'],'visibility':'public'}))['database'];type(self).db=db
        self.ok(self.visitor.api('public_db_get',query='&id='+db['id']),404)
        self.page([{'type':'databaseView','attrs':{'dbId':db['id']}}])
        hidden=self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':self.values('LIGNE_PRIVEE_ANNOTATION',50),'visibility':'private'}))['row']
        bundle=self.ok(self.visitor.api('public_db_get',query='&id='+db['id']))
        self.assertNotIn('LIGNE_PRIVEE_ANNOTATION',json.dumps(bundle));self.assertNotIn(hidden['id'],json.dumps(bundle));self.assertNotIn('Séance secrète',json.dumps(bundle))
        for row in bundle['rows']:self.assertEqual(row['values'][self.rel['id']],[])
        for row in bundle['rows']:self.assertEqual(row['derived'][self.rollup['id']],0)
        type(self).hidden=hidden
    def test_05_forms_private_answers_and_typed_validation(self):
        files=self.prop(self.db,'Pièce jointe','files');type(self).files=files
        form=self.ok(self.admin.api('form_save',{'db_id':self.db['id'],'name':'Déposer une réponse','fields':[self.title['id'],self.email['id'],files['id']],'public':True}))['form'];type(self).form=form
        bundle=self.ok(self.visitor.api('form_get',query='&token='+form['token']));self.assertNotIn('rows',bundle);self.assertNotIn('db_id',bundle['form']);self.assertNotIn('config',str(bundle.get('solutions','')))
        self.ok(self.visitor.api('form_get',query='&id='+form['id']),404)
        self.page([{'type':'formView','attrs':{'formId':form['id']}}]);self.ok(self.visitor.api('form_get',query='&id='+form['id']))
        self.ok(self.visitor.api('form_submit',{'token':form['token'],'values':{self.title['id']:'Réponse'}},authenticated=False),403)
        self.invalid(self.visitor.api('form_submit',{'token':form['token'],'website':'robot','values':{self.title['id']:'Réponse'}}))
        self.invalid(self.visitor.api('form_submit',{'token':form['token'],'values':{self.title['id']:'Réponse',self.email['id']:'invalid'}}))
        self.ok(self.visitor.api('form_submit',{'token':form['token'],'website':'','values':{self.title['id']:'REPONSE_FORMULAIRE_PRIVEE',self.email['id']:'eleve@example.org'}}))
        admin=self.ok(self.admin.api('db_get',query='&id='+self.db['id']));response=next(r for r in admin['rows'] if r['values'][self.title['id']]=='REPONSE_FORMULAIRE_PRIVEE');self.assertEqual(response['visibility'],'private');self.assertTrue(response['from_form'])
        self.assertNotIn('REPONSE_FORMULAIRE_PRIVEE',json.dumps(self.ok(self.visitor.api('public_db_get',query='&id='+self.db['id']))))
        self.invalid(self.admin.api('row_save',{'db_id':self.db['id'],'id':response['id'],'version':response['version'],'visibility':'public','values':response['values']}))
        self.invalid(self.admin.api('form_save',{'db_id':self.db['id'],'name':'Relations cachées','fields':[self.rel['id']],'public':True}))
    def test_06_form_upload_ownership_and_media_privacy(self):
        f=self.ok(self.visitor.upload('form_upload','reponse.txt',b'COPIE_ELEVE_PRIVEE','text/plain',fields={'token':self.form['token'],'website':''}))['file'];self.ok(self.visitor.request(f['url']),404)
        stranger=harness.Client(self.admin.base);stranger.session()
        self.invalid(stranger.api('form_submit',{'token':self.form['token'],'values':{self.title['id']:'Vol de fichier',self.files['id']:[f['id']]}}))
        self.ok(self.visitor.api('form_submit',{'token':self.form['token'],'values':{self.title['id']:'Copie avec fichier',self.files['id']:[f['id']]}}))
        self.ok(self.visitor.request(f['url']),404);self.assertEqual(self.admin.request(f['url'])[0],200)
        self.invalid(self.visitor.api('form_submit',{'token':self.form['token'],'values':{self.title['id']:'Réutilisation',self.files['id']:[f['id']]}}))
        self.invalid(self.visitor.upload('form_upload','script.html',b'<script>alert(1)</script>','text/html',fields={'token':self.form['token']}))
        type(self).form_file=f
    def test_07_csv_export_and_public_files(self):
        f=self.ok(self.admin.upload('upload','document.txt',b'Ressource publique','text/plain'))['file'];vals=self.values('=HYPERLINK("https://evil.example")',3);vals[self.files['id']]=[f['id']]
        self.ok(self.admin.api('row_save',{'db_id':self.db['id'],'values':vals,'visibility':'public'}))
        self.assertEqual(self.visitor.request(f['url'])[0],200)
        self.assertNotIn(self.form_file['id'],json.dumps(self.ok(self.visitor.api('public_db_get',query='&id='+self.db['id']))))
        status,csv,_=self.admin.api('db_export',query='&id='+self.db['id']);self.assertEqual(status,200);self.assertIn(b"'=HYPERLINK",csv)
        self.ok(self.visitor.api('db_export',query='&id='+self.db['id']),401)
    def test_08_property_form_conflicts(self):
        self.ok(self.admin.api('property_save',{'id':self.amount['id'],'db_id':self.db['id'],'name':'Montant','type':'number','version':0}),409)
        self.ok(self.admin.api('form_save',{'id':self.form['id'],'db_id':self.db['id'],'name':'Formulaire','fields':[self.title['id']],'public':False,'version':0}),409)
        form=self.ok(self.admin.api('form_save',{'id':self.form['id'],'db_id':self.db['id'],'name':self.form['name'],'fields':self.form['fields'],'public':False,'version':self.form['version']}))['form']
        self.ok(self.visitor.api('form_get',query='&token='+form['token']),404)
        self.ok(self.visitor.api('form_submit',{'token':form['token'],'values':{self.title['id']:'Après fermeture'}}),404)

    def test_09_backup_helpers_private_remapping(self):
        installation=harness.Integration.install
        script=harness.Integration.sandbox/'database-import-check.php'
        source='<?php require '+json.dumps(str(installation/'app'/'bootstrap.php'))+'; $data=database_backup(); $files=[];foreach(query("SELECT id FROM files")->fetchAll() as $f)$files[$f["id"]]=$f["id"];db()->beginTransaction();try{$maps=database_import($data,$files);db()->commit();echo encoded(["backup"=>$data,"maps"=>$maps]);}catch(Throwable $e){if(db()->inTransaction())db()->rollBack();fwrite(STDERR,$e->getMessage());exit(1);}'
        script.write_text(source)
        result=subprocess.run([harness.ARGS.php,str(script)],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr);data=json.loads(result.stdout);maps=data['maps']
        self.assertNotEqual(maps['databases'][self.db['id']],self.db['id'])
        imported=self.ok(self.admin.api('db_get',query='&id='+maps['databases'][self.db['id']]))
        self.assertEqual(imported['database']['visibility'],'private');self.assertTrue(all(r['visibility']=='private' for r in imported['rows']))
        form=next(f for f in imported['forms'] if f['id']==maps['forms'][self.form['id']]);self.assertFalse(form['public']);self.assertNotEqual(form['token'],self.form['token'])
        original=next(r for r in data['backup']['rows'] if r['db_id']==self.db['id'] and r['values'].get(self.title['id'])=='Avec relations')
        row=next(r for r in imported['rows'] if r['id']==maps['rows'][original['id']]);relation=maps['properties'][self.rel['id']]
        self.assertEqual(row['values'][relation],[maps['rows'][r['id']] for r in self.target_rows])
        self.assertEqual(row['derived'][maps['properties'][self.rollup['id']]],10)
        response=next(r for r in imported['rows'] if r['from_form']);self.assertEqual(response['source_form_id'],maps['forms'][self.form['id']])
        self.ok(self.visitor.api('form_get',query='&token='+form['token']),404)
        self.ok(self.visitor.api('public_db_get',query='&id='+imported['database']['id']),404)

    def test_10_zip_v3_endpoints_complete_restore(self):
        space=self.ok(self.admin.api('save_space',{'name':'Espace archive','icon':'📚'}))['id']
        category=self.ok(self.admin.api('save_category',{'space_id':space,'name':'Ressources annexes'}))['id']
        image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
        cover=self.ok(self.admin.upload('upload','couverture.png',image,'image/png'))['file']
        form=self.ok(self.admin.api('form_get',query='&id='+self.form['id']))['form']
        form=self.ok(self.admin.api('form_save',{'id':form['id'],'db_id':self.db['id'],'version':form['version'],'name':form['name'],'fields':form['fields'],'public':True}))['form']
        page=self.ok(self.admin.api('save',{'title':'Archive complète 0.3','space_id':space,'category_id':category,'cover_id':cover['id'],'cover_position':{'x':23,'y':77},'content':{'type':'doc','content':[{'type':'databaseView','attrs':{'dbId':self.db['id']}},{'type':'formView','attrs':{'formId':form['id'],'token':form['token']}}]}}))['page']
        self.ok(self.admin.api('settings',{'notebook':{'title':'Carnet sauvegardé','subtitle':'Ressources','max_upload':4194304}}))
        status,archive,_=self.admin.api('export');self.assertEqual(status,200)
        with zipfile.ZipFile(io.BytesIO(archive)) as z:manifest=json.loads(z.read('manifest.json'))
        self.assertEqual(manifest['version'],3);self.assertIn('categories',manifest);self.assertIn('database_data',manifest);self.assertEqual(manifest['settings']['notebook']['title'],'Carnet sauvegardé')
        previous_pages={p['id'] for p in self.ok(self.admin.api('pages'))['pages']};previous_files={f['id'] for f in self.ok(self.admin.api('files'))['files']}
        self.ok(self.admin.api('settings',{'notebook':{'title':'Carnet actuel'}}))
        result=self.ok(self.admin.upload('import','archive-v3.zip',archive,'application/zip'));self.assertGreater(result['databases'],0);self.assertGreater(result['categories'],0)
        self.assertEqual(self.ok(self.admin.api('settings'))['notebook']['title'],'Carnet actuel')
        imported_meta=next(p for p in self.ok(self.admin.api('pages'))['pages'] if p['id'] not in previous_pages and p['title']==page['title'])
        imported=self.ok(self.admin.api('page',query='&id='+imported_meta['id']))['page'];self.assertEqual(imported['visibility'],'private');self.assertNotEqual(imported['space_id'],space);self.assertNotEqual(imported['category_id'],category);self.assertNotEqual(imported['cover_id'],cover['id']);self.assertEqual(imported['cover_position'],{'x':23,'y':77})
        cats=self.ok(self.admin.api('categories'))['categories'];matched=next(c for c in cats if c['id']==imported['category_id']);self.assertEqual(matched['space_id'],imported['space_id']);self.assertEqual(matched['name'],'Ressources annexes')
        db_node,form_node=imported['content']['content'];self.assertNotEqual(db_node['attrs']['dbId'],self.db['id']);self.assertNotEqual(form_node['attrs']['formId'],form['id']);self.assertNotIn('token',form_node['attrs'])
        bundle=self.ok(self.admin.api('db_get',query='&id='+db_node['attrs']['dbId']));self.assertEqual(bundle['database']['visibility'],'private');self.assertTrue(all(r['visibility']=='private' for r in bundle['rows']))
        restored_form=next(f for f in bundle['forms'] if f['id']==form_node['attrs']['formId']);self.assertFalse(restored_form['public']);self.assertNotEqual(restored_form['token'],form['token']);self.ok(self.visitor.api('form_get',query='&token='+restored_form['token']),404)
        attached=next(r for r in bundle['rows'] if r['from_form'] and r['values'].get(next(p['id'] for p in bundle['properties'] if p['name']=='Pièce jointe')))
        fileprop=next(p for p in bundle['properties'] if p['name']=='Pièce jointe');f_id=attached['values'][fileprop['id']][0];self.assertNotIn(f_id,previous_files);self.ok(self.visitor.request('media.php?id='+f_id),404);self.assertEqual(self.admin.request('media.php?id='+f_id)[0],200)
        self.ok(self.admin.upload('import','settings-v3.zip',archive,'application/zip',fields={'apply_settings':'1'}))
        self.assertEqual(self.ok(self.admin.api('settings'))['notebook']['title'],'Carnet sauvegardé')
        # Older formats remain accepted when new optional sections are absent.
        legacy=io.BytesIO();old=dict(manifest);old['version']=2;old.pop('database_data',None);old.pop('categories',None)
        with zipfile.ZipFile(io.BytesIO(archive)) as source,zipfile.ZipFile(legacy,'w',zipfile.ZIP_DEFLATED) as target:
            for name in source.namelist():target.writestr(name,json.dumps(old).encode() if name=='manifest.json' else source.read(name))
        self.ok(self.admin.upload('import','legacy-v2.zip',legacy.getvalue(),'application/zip'))

    def test_11_removing_last_field_closes_form(self):
        db=self.ok(self.admin.api('db_save',{'name':'Test fermeture automatique'}))['database'];field=self.prop(db,'Question','text')
        form=self.ok(self.admin.api('form_save',{'db_id':db['id'],'name':'Dernière question','fields':[field['id']],'public':True}))['form']
        self.ok(self.admin.api('property_delete',{'id':field['id'],'version':field['version']}))
        self.ok(self.visitor.api('form_get',query='&token='+form['token']),404)
        self.ok(self.visitor.api('form_submit',{'token':form['token'],'values':{}}),404)

    def test_12_markdown_embedded_databases_readable_values(self):
        page=self.page([{'type':'databaseView','attrs':{'dbId':self.db['id']}},{'type':'formView','attrs':{'formId':self.form['id']}}])
        status,raw,_=self.admin.api('export_markdown',query='&id='+page['id']);self.assertEqual(status,200)
        text=raw.decode('utf-8');self.assertIn('Montant',text);self.assertIn('Total durée',text)
        self.assertIn('reponse.txt',text);self.assertIn('Séance secrète',text);self.assertIn('index.php?form=',text)
        self.assertNotIn('| '+self.form_file['id']+' |',text)
        self.ok(self.visitor.api('export_markdown',query='&id='+page['id']),401)

if __name__=='__main__':unittest.main(argv=[__file__]+harness.REMAINING,verbosity=2)
