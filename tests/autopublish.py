#!/usr/bin/env python3
"""Atomic automatic publication, privacy and notebook icon HTTP checks on a disposable install."""
import base64, importlib.util, io, json, pathlib, unittest, zipfile
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('feuillet_publication_harness',HERE/'smoke.py');harness=importlib.util.module_from_spec(spec);spec.loader.exec_module(harness)
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=')
class Publication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):harness.Integration.setUpClass();cls.admin=harness.Integration.admin;cls.visitor=harness.Integration.visitor
    @classmethod
    def tearDownClass(cls):harness.Integration.tearDownClass()
    def setUp(self):self.ok(self.admin.api('settings',{'notebook':{'auto_publish':True}}))
    def ok(self,response,status=200):self.assertEqual(response[0],status,response[1]);return response[1]
    def page(self,p=None,text='Cours',**attrs):
        payload={'title':'Mon cours','parent_id':None,'icon':'📖','content':{'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':text}]}]}}
        if p:payload.update({key:p[key] for key in ['id','version','parent_id','title','icon']})
        payload.update(attrs);return self.ok(self.admin.api('save',payload))['page']
    def publish(self,p):return self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
    def public(self,p):return self.ok(self.visitor.api('page',query='&id='+p['id']))['page']
    def test_01_default_and_new_private_pages(self):
        self.assertIs(harness.Integration.initial_notebook['auto_publish'],True)
        p=self.page(visibility='public');self.assertEqual(p['visibility'],'private');self.ok(self.visitor.api('page',query='&id='+p['id']),404)
        p=self.publish(p);child=self.page(parent_id=p['id'],visibility='public');self.assertEqual(child['visibility'],'private')
        self.ok(self.visitor.api('page',query='&id='+child['id']),404)
        self.page(p,text='Parent actualisé');self.ok(self.visitor.api('page',query='&id='+child['id']),404)
    def test_02_published_save_and_conflict_are_atomic(self):
        p=self.publish(self.page());old_version=p['version'];p=self.page(p,text='ACTUALISATION_DIRECTE',title='Cours actualisé')
        live=self.public(p);self.assertEqual(live['version'],old_version+1);self.assertEqual(live['version'],p['version']);self.assertEqual(live['title'],'Cours actualisé');self.assertIn('ACTUALISATION_DIRECTE',json.dumps(live));self.assertFalse(p['has_unpublished_changes'])
        self.ok(self.admin.api('save',{'id':p['id'],'version':old_version,'title':'STALE_DATA'}),409);self.assertEqual(self.public(p),live)
        self.assertEqual(self.ok(self.admin.api('page',query='&id='+p['id']+'&published=1'))['page']['version'],live['version'])
    def test_03_media_cover_icon_visibility_immediately(self):
        p=self.publish(self.page());pdf=self.ok(self.admin.upload('upload','cours.pdf',b'%PDF-1.4\nDOCUMENT_COURS\n%%EOF','application/pdf'))['file'];image=self.ok(self.admin.upload('upload','photo.png',PNG,'image/png'))['file']
        self.ok(self.visitor.request(pdf['url']),404);self.ok(self.visitor.request(image['url']),404)
        p=self.page(p,cover_id=image['id'],icon_id=image['id'],cover_position={'x':12,'y':87},content={'type':'doc','content':[{'type':'fileBlock','attrs':{'fileId':pdf['id'],'name':pdf['name'],'mode':'pdf'}}]})
        self.ok(self.visitor.request(pdf['url']));self.ok(self.visitor.request(image['url']));live=self.public(p);self.assertEqual(live['cover_position'],{'x':12,'y':87});self.assertEqual(live['cover_id'],image['id'])
        p=self.page(p,cover_id=None,icon_id=None);self.ok(self.visitor.request(pdf['url']),404);self.ok(self.visitor.request(image['url']),404)
    def test_04_draft_option_and_return_to_private(self):
        p=self.publish(self.page());self.ok(self.admin.api('settings',{'notebook':{'auto_publish':False}}));p=self.page(p,text='SECRET_DRAFT');self.assertTrue(p['has_unpublished_changes']);self.assertNotIn('SECRET_DRAFT',json.dumps(self.public(p)))
        self.ok(self.admin.api('settings',{'notebook':{'auto_publish':True}}));self.assertNotIn('SECRET_DRAFT',json.dumps(self.public(p)))
        p=self.page(p,text='NOUVELLE_VERSION_PUBLIQUE');self.assertIn('NOUVELLE_VERSION_PUBLIQUE',json.dumps(self.public(p)))
        p=self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}))['page'];p=self.page(p,text='PRIVE');self.ok(self.visitor.api('page',query='&id='+p['id']),404)
        self.ok(self.admin.api('settings',{'notebook':{'auto_publish':'false'}}),400)
    def test_05_notebook_icon_public_and_backup_remap(self):
        image=self.ok(self.admin.upload('upload','carnet.png',PNG,'image/png'))['file'];self.ok(self.visitor.request(image['url']),404)
        settings=self.ok(self.admin.api('settings',{'notebook':{'icon':'lucide:book-open:#38795D','icon_id':image['id'],'auto_publish':True}}))['notebook'];self.assertEqual(settings['icon_id'],image['id']);self.ok(self.visitor.request(image['url']))
        self.ok(self.admin.api('settings',{'notebook':{'icon':'lucide:../bad'}}),400)
        status,raw,_=self.admin.api('export');self.assertEqual(status,200)
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:manifest=json.loads(archive.read('manifest.json'));self.assertEqual(manifest['settings']['notebook']['icon_id'],image['id'])
        self.ok(self.admin.upload('import','carnet.zip',raw,'application/zip',{'apply_settings':'1'}));restored=self.ok(self.admin.api('settings'))['notebook'];self.assertNotEqual(restored['icon_id'],image['id']);self.assertEqual(restored['icon'],'lucide:book-open:#38795D');self.assertIs(restored['auto_publish'],True);self.ok(self.visitor.request('media.php?id='+restored['icon_id']))
        self.ok(self.admin.api('settings',{'notebook':{'icon_id':None}}));self.ok(self.visitor.request('media.php?id='+restored['icon_id']),404)
    def test_06_move_keeps_public_snapshots_current(self):
        first=self.ok(self.admin.api('save_space',{'name':'Espace initial','icon':'📚'}));second=self.ok(self.admin.api('save_space',{'name':'Espace destination','icon':'📙'}))
        parent=self.page(space_id=first['id']);child=self.page(parent_id=parent['id']);parent=self.publish(parent);child=self.ok(self.admin.api('page',query='&id='+child['id']))['page']
        moved=self.ok(self.admin.api('move',{'id':parent['id'],'version':parent['version'],'parent_id':None,'space_id':second['id']}))['page']
        self.assertEqual(self.public(moved)['space_id'],second['id']);self.assertEqual(self.public(moved)['version'],moved['version'])
        livechild=self.public(child);self.assertEqual(livechild['space_id'],second['id']);self.assertEqual(livechild['version'],child['version']+1)
if __name__=='__main__':unittest.main(argv=[__file__]+harness.REMAINING,verbosity=2)
