#!/usr/bin/env python3
"""Form customisation, exact grouping, backup/copy and security on an owned install."""
import importlib.util,pathlib,unittest,base64,json,subprocess,uuid
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('design_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Design(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def fixture(self):
  db=self.ok(self.admin.api('db_save',{'name':'Design fixture '+uuid.uuid4().hex[:8]}))['database']
  def prop(name,type,required=False,config={}):return self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':name,'type':type,'required':required,'config':config}))['property']
  name=prop('Nom interne','title',True);group=prop('Groupe','select',False,{'options':['A','B']})
  form=self.ok(self.admin.api('form_save',{'db_id':db['id'],'name':'Envoi','fields':[name['id'],group['id']],'public':True}))['form']
  return db,name,group,form
 def save(self,form,design):return self.ok(self.admin.api('form_save',{**form,'config':design}))['form']
 def test_00_migration_keeps_legacy_form_and_handles_parallel_requests(self):
  db,name,group,form=self.fixture()
  setup=h.Integration.install/'simulate-old-schema.php';worker=h.Integration.install/'migrate-design.php'
  bootstrap=json.dumps(str(h.Integration.install/'app/bootstrap.php'))
  setup.write_text('<?php require '+bootstrap+'; db()->exec("ALTER TABLE collection_forms DROP COLUMN config");query("UPDATE app_settings SET value=? WHERE name=?",["2","database_schema_version"]);')
  result=subprocess.run([h.ARGS.php,str(setup)],capture_output=True,text=True);self.assertEqual(result.returncode,0,result.stderr)
  worker.write_text('<?php require '+bootstrap+'; db(); echo "ok";')
  processes=[subprocess.Popen([h.ARGS.php,str(worker)],stdout=subprocess.PIPE,stderr=subprocess.PIPE) for _ in range(8)]
  for process in processes:
   out,err=process.communicate(timeout=20);self.assertEqual(process.returncode,0,err.decode());self.assertEqual(out,b'ok')
  restored=self.ok(self.visitor.api('form_get',query='&token='+form['token']))['form'];self.assertEqual(restored['id'],form['id']);self.assertEqual(restored['config']['submitLabel'],'Envoyer ma réponse')
 def test_01_custom_texts_question_required_independent(self):
  db,name,group,form=self.fixture();self.assertEqual(form['config']['template'],'atelier')
  form=self.save(form,{'template':'aurora','animation':'immersive','submitLabel':'Déposer mon projet','successTitle':'Projet reçu !','questions':{name['id']:{'label':'Votre projet','required':False},group['id']:{'required':True,'placeholder':'Choisir le groupe'}}})
  result=self.ok(self.visitor.api('form_get',query='&token='+form['token']));self.assertEqual(result['form']['config']['submitLabel'],'Déposer mon projet')
  self.assertEqual(self.admin.api('db_get',query='&id='+db['id'])[1]['properties'][0]['name'],'Nom interne')
  self.ok(self.visitor.api('form_submit',{'token':form['token'],'values':{name['id']:'',group['id']:'A'}}))
  self.ok(self.visitor.api('form_submit',{'token':form['token'],'values':{name['id']:'',group['id']:''}}),400)
  self.assertEqual(self.ok(self.admin.api('db_get',query='&id='+db['id']))['rows'][0]['visibility'],'private')
  extra=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Internal field','type':'text','config':{}}))['property']
  form=self.save(form,{**form['config'],'questions':{**form['config']['questions'],extra['id']:{'label':'HIDDEN QUESTION'}}})
  public=self.ok(self.visitor.api('form_get',query='&token='+form['token']));self.assertNotIn('HIDDEN QUESTION',json.dumps(public))
  updated=self.ok(self.admin.api('form_save',{k:v for k,v in form.items() if k!='config'}))['form'];self.assertEqual(updated['config'],form['config'])
 def test_02_closed_enums_and_plain_text(self):
  db,name,group,form=self.fixture()
  for cfg in [{'template':'<script>'},{'animation':'evil'},{'accent':'red;display:none'},{'font':'url(x)'},{'submitLabel':''},{'successTitle':'a'*301},{'questions':{name['id']:{'required':'false'}}},{'coverId':'javascript:alert(1)'}]:self.ok(self.admin.api('form_save',{**form,'config':cfg}),400)
  form=self.save(form,{'introText':'<img src=x onerror=alert(1)>','openLabel':'Rendre mon travail'})
  page=self.ok(self.admin.api('save',{'title':'Lien','content':{'type':'doc','content':[{'type':'formView','attrs':{'formId':form['id'],'buttonLabel':'Je dépose mon projet'}}]}}))['page'];self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}))
  html=self.ok(self.visitor.request('index.php?page='+page['id']+'&read=1')).decode();self.assertIn('Je dépose mon projet',html);self.assertIn('&lt;img',html);self.assertNotIn('<img src=x',html)
  page=self.ok(self.admin.api('save',{'title':'Zero','content':{'type':'doc','content':[{'type':'formView','attrs':{'formId':form['id'],'buttonLabel':'0'}}]}}))['page'];self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}));html=self.ok(self.visitor.request('index.php?page='+page['id']+'&read=1')).decode();self.assertIn('>0 <span aria-hidden=',html)
 def test_03_cover_publication_and_copy_remapping(self):
  db,name,group,form=self.fixture();png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
  image=self.ok(self.admin.upload('upload','cover.png',png,'image/png'))['file'];self.ok(self.visitor.request('media.php?id='+image['id']),404)
  form=self.save(form,{'coverId':image['id'],'successTitle':'Merci pour votre projet','questions':{name['id']:{'label':'Votre projet'}}});self.ok(self.visitor.request('media.php?id='+image['id']))
  private=self.ok(self.admin.api('form_save',{**form,'public':False}))['form'];self.ok(self.visitor.request('media.php?id='+image['id']),404)
  target=self.ok(self.admin.api('save',{'title':'Copie'}))['page']
  result=self.ok(self.admin.api('blocks_copy',{'id':target['id'],'version':target['version'],'content':{'type':'doc','content':[{'type':'formView','attrs':{'formId':form['id']}},{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':{'layout':'table','groupBy':group['id']}}}]},'paths':[[0],[1]]}))
  cloned=self.ok(self.admin.api('form_get',query='&id='+result['page']['content']['content'][0]['attrs']['formId']))
  cp=next(p for p in cloned['properties'] if p['name']=='Nom interne');self.assertEqual(cloned['form']['config']['questions'][cp['id']]['label'],'Votre projet');self.assertNotEqual(cloned['form']['config']['coverId'],image['id']);self.assertFalse(cloned['form']['public']);cg=next(p for p in cloned['properties'] if p['name']=='Groupe');self.assertEqual(result['page']['content']['content'][1]['attrs']['viewConfig']['groupBy'],cg['id'])
  previous={d['id'] for d in self.ok(self.admin.api('db_list'))['databases']}
  archive=self.ok(self.admin.api('export'));self.ok(self.admin.upload('import','backup.zip',archive,'application/zip'))
  copied=next(d for d in self.ok(self.admin.api('db_list'))['databases'] if d['id'] not in previous and d['name']==db['name']);bundle=self.ok(self.admin.api('db_get',query='&id='+copied['id']));f=bundle['forms'][0];p=next(p for p in bundle['properties'] if p['name']=='Nom interne')
  self.assertFalse(f['public']);self.assertNotEqual(f['token'],form['token']);self.assertNotEqual(f['config']['coverId'],image['id']);self.assertEqual(f['config']['questions'][p['id']]['label'],'Votre projet');self.assertNotIn(name['id'],f['config']['questions'])
 def test_04_grouping_projection_and_public_view_permissions(self):
  db,name,group,form=self.fixture()
  for label,g in [('Un','A'),('Deux','A'),('Trois','B')]:self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{name['id']:label,group['id']:g},'visibility':'public'}))
  result=self.ok(self.admin.api('db_projection',query='&id='+db['id']+'&group='+group['id']));self.assertEqual(sorted(r['groupValue'] for r in result['rows']),['A','A','B']);self.assertEqual(result['columns'],[name['id']]);self.ok(self.visitor.api('db_projection',query='&id='+db['id']+'&group='+group['id']),401)
  other=self.fixture();self.ok(self.admin.api('db_projection',query='&id='+db['id']+'&group='+other[1]['id']),400)
  db=self.ok(self.admin.api('db_save',{**db,'visibility':'public'}))['database']
  page=self.ok(self.admin.api('save',{'title':'Grouped','content':{'type':'doc','content':[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':{'layout':'table','groupBy':group['id']}}}]}}))['page'];self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}))
  html=self.ok(self.visitor.request('index.php?page='+page['id']+'&read=1')).decode();self.assertIn('database-record-group',html);self.assertIn('2 fiche',html)
  self.ok(self.visitor.api('form_submit',{'token':form['token'],'values':{name['id']:'SECRET ANSWER',group['id']:'A'}}))
  html=self.ok(self.visitor.request('index.php?page='+page['id']+'&read=1')).decode();self.assertNotIn('SECRET ANSWER',html)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
