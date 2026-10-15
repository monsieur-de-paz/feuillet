#!/usr/bin/env python3
"""Feuillet 0.3 HTTP regression checks: branding, themes, categories, publication trees and SSR gates.
Uses an isolated copy and owned SQLite/MySQL server; never a configured installation.
"""
import base64, importlib.util, json, pathlib, shutil, subprocess, unittest
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('feuillet_customization_harness',HERE/'smoke.py')
harness=importlib.util.module_from_spec(spec);spec.loader.exec_module(harness)

class Customization(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        harness.Integration.setUpClass();cls.admin=harness.Integration.admin;cls.visitor=harness.Integration.visitor
    @classmethod
    def tearDownClass(cls): harness.Integration.tearDownClass()
    def ok(self,response,status=200):self.assertEqual(response[0],status,response[1]);return response[1]
    def invalid(self,response):self.assertIn(response[0],(400,422),response[1]);return response[1]
    def save(self,page=None,**patch):
        payload={'title':'Test 0.3','content':{'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'Document 0.3'}]}]}}
        if page:payload.update(page)
        payload.update(patch);return self.ok(self.admin.api('save',payload))['page']
    def publish(self,page):return self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}))['page']
    def get(self,page,public=False):return self.ok((self.visitor if public else self.admin).api('page',query='&id='+page['id']))['page']
    def space(self,name):return self.ok(self.admin.api('save_space',{'name':name,'icon':'📚'}))['id']
    def category(self,name,space=None,**patch):return self.ok(self.admin.api('save_category',{'name':name,'space_id':space,**patch}))['id']
    def sql(self,text):
        integration=harness.Integration
        if harness.ARGS.mysql:
            result=subprocess.run([shutil.which('mysql') or 'mysql','--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+str(integration.mysql_port),'--user=root','feuillet_test','--execute='+text],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
        else:
            import sqlite3
            with sqlite3.connect(integration.install/'storage'/'feuillet.sqlite') as conn:conn.executescript(text)
    def test_01_branding_upload_limit_and_permissions(self):
        original=self.ok(self.admin.api('settings'))['notebook']
        new={**original,'title':'Carnet libre 0.3','subtitle':'Mes ressources et mes idées','max_upload':1048576}
        settings=self.ok(self.admin.api('settings',{'notebook':new}))
        self.assertEqual(settings['notebook'],new)
        self.assertEqual(self.visitor.session()['name'],new['title'])
        html=self.visitor.request('index.php?read=1')[1].decode();self.assertIn(new['title'],html)
        health=self.ok(self.admin.api('health'));self.assertEqual(health['configured_upload_limit'],1048576);self.assertLessEqual(health['upload_limit'],1048576)
        self.ok(self.admin.upload('upload','trop-grand.txt',b'A'*1048577,'text/plain'),413)
        self.invalid(self.admin.api('settings',{'notebook':{'title':''}}))
        self.invalid(self.admin.api('settings',{'notebook':{'max_upload':0}}))
        self.invalid(self.admin.api('settings',{'notebook':{'max_upload':1073741825}}))
        self.ok(self.visitor.api('settings',{'notebook':new}),401)
        self.ok(self.admin.api('settings',{'notebook':new},authenticated=False),403)
        self.ok(self.admin.api('settings',{'notebook':original}))
    def test_02_scoped_categories_rename_order_archive_restore(self):
        a=self.space('Sciences 0.3');b=self.space('Documentation 0.3')
        all_categories=self.ok(self.admin.api('categories'))['categories']
        default=self.ok(self.admin.api('spaces'))['spaces'][0]['id']
        for scope in [default,a,b]:self.assertEqual({x['legacy_kind'] for x in all_categories if x['space_id']==scope and x['legacy_kind']},{'class','article'})
        self.assertEqual({c['name'] for c in all_categories if c['space_id']==a},{'Notes','Articles'})
        cat=self.category('Travaux pratiques',a,sort_order=42);other=self.category('Archives de presse',b,sort_order=5)
        self.assertNotIn(cat,json.dumps(self.ok(self.visitor.api('categories'))))
        p=self.save(title='TP partagé',space_id=a,category_id=cat)
        self.invalid(self.admin.api('save',{**p,'category_id':other}))
        self.invalid(self.admin.api('save_category',{'id':cat,'space_id':b,'name':'Déplacement illégal'}))
        self.ok(self.admin.api('save_category',{'id':cat,'space_id':a,'name':'Expériences','sort_order':-1}))
        listing=self.ok(self.admin.api('categories'))['categories'];updated=next(c for c in listing if c['id']==cat)
        self.assertEqual((updated['name'],updated['sort_order']),('Expériences',-1))
        p=self.publish(p);self.assertIn(cat,[c['id'] for c in self.ok(self.visitor.api('categories',query='&root='+p['id']))['categories']])
        self.ok(self.admin.api('delete_category',{'id':cat}))
        archived=next(c for c in self.ok(self.admin.api('categories'))['categories'] if c['id']==cat);self.assertTrue(archived['deleted_at'])
        self.assertEqual(self.get(p)['category_id'],cat);self.assertEqual(self.get(p,True)['category_id'],cat)
        self.assertNotIn(cat,[c['id'] for c in self.ok(self.visitor.api('categories',query='&root='+p['id']))['categories']])
        self.ok(self.admin.api('restore_category',{'id':cat}))
        self.assertFalse(next(c for c in self.ok(self.admin.api('categories'))['categories'] if c['id']==cat)['deleted_at'])
        self.assertIn(cat,[c['id'] for c in self.ok(self.visitor.api('categories',query='&root='+p['id']))['categories']])
        self.ok(self.visitor.api('save_category',{'name':'Intrusion'}),401)
    def test_03_scope_move_rebinds_categories_and_descendants(self):
        a=self.space('Origine 0.3');b=self.space('Destination 0.3')
        parent=self.save(title='Classe à déplacer',kind='class',space_id=a)
        child=self.save(title='Article dans la classe',kind='article',parent_id=parent['id'])
        self.assertEqual(child['space_id'],a)
        category_a=parent['category_id'];self.assertTrue(category_a)
        moved=self.ok(self.admin.api('move',{'id':parent['id'],'version':parent['version'],'parent_id':None,'space_id':b,'sort_order':0}))['page']
        child=self.get(child);self.assertEqual(moved['space_id'],b);self.assertEqual(child['space_id'],b)
        categories={c['id']:c for c in self.ok(self.admin.api('categories'))['categories']}
        self.assertNotEqual(moved['category_id'],category_a)
        for page in [moved,child]:self.assertEqual(categories[page['category_id']]['space_id'],b)
        self.ok(self.admin.api('delete_space',{'id':b}))
        for page in [moved,child]:self.assertTrue(self.get(page)['space_id']);self.assertNotEqual(self.get(page)['space_id'],b)
    def test_04_cover_position_theme_fonts_and_snapshot(self):
        image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
        f=self.ok(self.admin.upload('upload','position.png',image,'image/png'))['file']
        style={'font':'fraunces','background':'#000000','text':'#EEEEEE','accent':'#78B8FF','width':'wide','focus':True,'mode':'oled'}
        p=self.save(title='Position et thème',cover_id=f['id'],cover_position={'x':120,'y':-10},appearance=style)
        self.assertEqual(p['cover_position'],{'x':100,'y':0});self.assertEqual(p['appearance']['mode'],'oled')
        p=self.publish(p);p=self.save(p,cover_position={'x':18,'y':73},appearance={**style,'font':'quicksand'})
        public=self.get(p,True);self.assertEqual(public['cover_position'],{'x':100,'y':0});self.assertEqual(public['appearance']['font'],'fraunces')
        html=self.visitor.request('index.php?page='+p['id']+'&read=1')[1].decode();self.assertIn('object-position:100% 0%',html);self.assertIn('#000000',html);self.assertIn('Fraunces',html)
        p=self.publish(p);self.assertEqual(self.get(p,True)['cover_position'],{'x':18,'y':73})
        self.invalid(self.admin.api('save',{**p,'appearance':{'font':'javascript'}}))
        self.invalid(self.admin.api('settings',{'appearance':{'mode':'<script>'}}))
        for font in ['Quicksand.ttf','Fraunces.ttf']:self.assertEqual(self.visitor.request('fonts/'+font)[0],200)
    def test_05_publish_and_private_cascade_with_media(self):
        f=self.ok(self.admin.upload('upload','descendant.txt',b'FICHIER_DESCENDANT_PRIVE','text/plain'))['file']
        parent=self.save(title='Parent public en un clic');child=self.save(title='Enfant privé initial',parent_id=parent['id']);grandchild=self.save(title='Petit-enfant',parent_id=child['id'],content={'type':'doc','content':[{'type':'fileBlock','attrs':{'fileId':f['id'],'name':f['name'],'mode':'download'}}]})
        result=self.ok(self.admin.api('publish',{'id':parent['id'],'version':parent['version']}));self.assertEqual(result['published_count'],3)
        for p in [parent,child,grandchild]:self.assertEqual(self.get(p,True)['visibility'],'public')
        self.assertEqual(self.visitor.request(f['url'])[0],200)
        grandchild=self.save(self.get(grandchild),title='Petit-enfant modifié')
        parent=self.publish(self.get(parent));self.assertEqual(self.get(grandchild,True)['title'],'Petit-enfant modifié')
        self.ok(self.admin.api('visibility',{'id':parent['id'],'version':parent['version'],'visibility':'private'}))
        for p in [parent,child,grandchild]:self.ok(self.visitor.api('page',query='&id='+p['id']),404)
        self.ok(self.visitor.request(f['url']),404)
    def test_06_ssr_database_and_form_visibility_match_api(self):
        db=self.ok(self.admin.api('db_save',{'name':'Base SSR privée'}))['database']
        prop=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Ressource','type':'text','config':{}}))['property']
        public_row=self.ok(self.admin.api('row_save',{'db_id':db['id'],'visibility':'public','values':{prop['id']:'LIGNE_SSR_VISIBLE_033'}}))['row']
        private_row=self.ok(self.admin.api('row_save',{'db_id':db['id'],'visibility':'private','values':{prop['id']:'LIGNE_SSR_PRIVEE_034'}}))['row']
        form=self.ok(self.admin.api('form_save',{'db_id':db['id'],'name':'Formulaire SSR','public':True,'fields':[prop['id']]}))['form']
        p=self.publish(self.save(title='Données intégrées',content={'type':'doc','content':[{'type':'databaseView','attrs':{'dbId':db['id']}},{'type':'formView','attrs':{'formId':form['id']}}]}))
        self.ok(self.visitor.api('public_db_get',query='&id='+db['id']),404)
        html=self.visitor.request('index.php?page='+p['id']+'&read=1')[1].decode();self.assertNotIn('LIGNE_SSR_VISIBLE_033',html);self.assertNotIn('Base SSR privée',html);self.assertIn('form='+form['token'],html)
        db=self.ok(self.admin.api('db_save',{**db,'visibility':'public'}))['database']
        self.assertEqual(len(self.ok(self.visitor.api('public_db_get',query='&id='+db['id']))['rows']),1)
        self.ok(self.visitor.api('form_submit',{'token':form['token'],'values':{prop['id']:'REPONSE_SSR_PRIVEE_035'}}))
        html=self.visitor.request('index.php?page='+p['id']+'&read=1')[1].decode();self.assertIn('LIGNE_SSR_VISIBLE_033',html);self.assertNotIn('LIGNE_SSR_PRIVEE_034',html);self.assertNotIn('REPONSE_SSR_PRIVEE_035',html);self.assertIn('<table>',html)
        self.assertNotIn('REPONSE_SSR_PRIVEE_035',json.dumps(self.ok(self.visitor.api('public_db_get',query='&id='+db['id']))))
        closed=self.ok(self.admin.api('form_save',{**form,'public':False}))['form'];html=self.visitor.request('index.php?page='+p['id']+'&read=1')[1].decode();self.assertNotIn(form['token'],html)
        self.ok(self.visitor.api('form_get',query='&token='+form['token']),404)
        self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}));self.ok(self.visitor.api('public_db_get',query='&id='+db['id']),404)
    def test_07_v2_to_v3_migration_is_idempotent(self):
        space=self.space('Migration 0.2 vers 0.3');p=self.publish(self.save(title='Classe historique',kind='class',space_id=space))
        self.sql("ALTER TABLE pages DROP COLUMN category_id; ALTER TABLE pages DROP COLUMN cover_position; DROP TABLE categories; UPDATE app_settings SET value='2' WHERE name='schema_version';")
        counts=[]
        for _ in range(2):
            got=self.get(p);self.assertEqual((got['title'],got['version'],got['space_id']),(p['title'],p['version'],space));self.assertEqual(got['cover_position'],{'x':50,'y':50});self.assertTrue(got['category_id'])
            categories=self.ok(self.admin.api('categories'))['categories'];counts.append(len(categories));self.assertEqual(next(c for c in categories if c['id']==got['category_id'])['legacy_kind'],'class')
            self.assertEqual(self.get(p,True)['category_id'],got['category_id'])
        self.assertEqual(counts[0],counts[1])

    def test_08_reader_breadcrumbs_published_titles_and_links(self):
        parent=self.save(title='Parent de référence');child=self.save(title='Enfant de référence',parent_id=parent['id']);leaf=self.save(title='Page visitée',parent_id=child['id'])
        self.publish(parent)
        status,html,_=self.visitor.request('index.php?page='+leaf['slug']+'&read=1&root='+parent['id']);self.assertEqual(status,200);html=html.decode()
        self.assertIn('aria-label="Fil d’Ariane"',html);self.assertIn('aria-current="page"',html)
        self.assertIn('index.php?page='+parent['slug']+'&amp;read=1',html);self.assertIn('index.php?page='+child['slug']+'&amp;read=1',html)
        self.assertLess(html.index('Parent de référence'),html.index('Enfant de référence'))
        parent=self.save(self.get(parent),title='TITRE_BROUILLON_PARENT_CACHE')
        status,html,_=self.visitor.request('index.php?page='+leaf['slug']+'&read=1&root='+parent['id']);self.assertEqual(status,200);self.assertNotIn('TITRE_BROUILLON_PARENT_CACHE',html.decode())
        self.ok(self.admin.api('visibility',{'id':parent['id'],'version':parent['version'],'visibility':'private'}))
        self.publish(self.get(leaf))
        status,html,_=self.visitor.request('index.php?page='+leaf['slug']+'&read=1');self.assertEqual(status,200);self.assertNotIn('Parent de référence',html.decode());self.assertNotIn('Enfant de référence',html.decode());self.assertNotIn('TITRE_BROUILLON_PARENT_CACHE',html.decode())

    def test_09_reader_index_never_contains_admin_private_titles(self):
        p=self.save(title='INDEX_NE_DOIT_PAS_REVELER_LE_PRIVE')
        self.ok(self.admin.api('homepage',{'id':p['id']}),410)
        status,html,_=self.admin.request('index.php?read=1');self.assertEqual(status,200);self.assertNotIn(p['title'],html.decode())
        p=self.publish(p);p=self.save(p,title='TITRE_BROUILLON_INDEX_CACHE')
        status,html,_=self.admin.request('index.php?page='+p['id']+'&read=1');self.assertEqual(status,200);self.assertIn('INDEX_NE_DOIT_PAS_REVELER_LE_PRIVE',html.decode());self.assertNotIn('TITRE_BROUILLON_INDEX_CACHE',html.decode())

if __name__=='__main__':unittest.main(argv=[__file__]+harness.REMAINING,verbosity=2)
