#!/usr/bin/env python3
"""Private notebook decoration, partial saves and ZIP restoration in owned installs."""
import importlib.util,pathlib,unittest,base64,json,io,zipfile
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('notebook_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Notebooks(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def create(self,name='Carnet décoré'):
  id=self.ok(self.admin.api('save_space',{'name':name,'icon':'📚','sort_order':9}))['id'];return id
 def get(self,id):return next(s for s in self.ok(self.admin.api('spaces'))['spaces'] if s['id']==id)
 def image(self):return self.ok(self.admin.upload('upload','couverture.png',base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),'image/png'))['file']
 def test_01_partial_writes_preserve_name_order_and_cover(self):
  id=self.create();image=self.image();self.ok(self.admin.api('save_space',{'id':id,'cover_id':image['id'],'cover_position':{'x':25,'y':72}}));self.ok(self.admin.api('save_space',{'id':id,'name':'Renommé'}));self.ok(self.admin.api('save_space',{'id':id,'icon':'🌿','icon_id':image['id']}));s=self.get(id);self.assertEqual((s['name'],s['sort_order'],s['cover_id'],s['icon_id']),('Renommé',9,image['id'],image['id']));self.assertEqual(s['cover_position'],{'x':25,'y':72});self.ok(self.admin.api('save_space',{'id':id,'cover_id':None}));self.assertIsNone(self.get(id)['cover_id']);self.assertEqual(self.get(id)['icon_id'],image['id'])
 def test_02_validation_is_atomic_and_images_only(self):
  id=self.create();f=self.ok(self.admin.upload('upload','texte.txt',b'Not an image','text/plain'))['file'];before=self.get(id)
  for patch in [{'cover_id':f['id']},{'icon_id':f['id']},{'cover_id':'javascript:x'},{'cover_id':'a'*36},{'cover_position':{'y':'bad'}},{'cover_position':'bad'},{'name':[]},{'icon':'lucide:missing-icon'}]:
   self.ok(self.admin.api('save_space',{'id':id,'name':'Ne doit pas rester',**patch}),400);self.assertEqual(self.get(id),before)
  self.ok(self.admin.api('save_space',{'id':id,'cover_position':{'x':-30,'y':500}}));self.assertEqual(self.get(id)['cover_position'],{'x':0,'y':100})
 def test_03_notebook_media_stay_private_and_inventory_links_it(self):
  id=self.create('PRIVÉ_MEDIA_CARNET');image=self.image();self.ok(self.admin.api('save_space',{'id':id,'icon_id':image['id'],'cover_id':image['id']}));p=self.ok(self.admin.api('save',{'title':'Une page publique','space_id':id}))['page'];self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))
  self.ok(self.visitor.request('media.php?id='+image['id']),404);public=self.ok(self.visitor.api('spaces',query='&root='+p['id']))['spaces'];self.assertTrue(public);self.assertNotIn(image['id'],json.dumps(public));usage=self.ok(self.admin.api('file_usage',query='&id='+image['id']));self.assertFalse(usage['public']);s=next(u for u in usage['usages'] if u['kind']=='space' and u['id']==id);self.assertEqual(s['visibility'],'private');self.assertEqual(set(s['places']),{'Icône','Couverture'})
 def test_04_zip_remaps_cover_and_icon_and_keeps_position(self):
  id=self.create('ZIP_VISUEL');image=self.image();self.ok(self.admin.api('save_space',{'id':id,'cover_id':image['id'],'icon_id':image['id'],'cover_position':{'x':17,'y':83}}));raw=self.ok(self.admin.api('export'));self.ok(self.admin.upload('import','sauvegarde.zip',raw,'application/zip'));copies=[s for s in self.ok(self.admin.api('spaces'))['spaces'] if s['name']=='ZIP_VISUEL' and s['id']!=id];self.assertTrue(copies);s=copies[-1];self.assertNotEqual(s['cover_id'],image['id']);self.assertEqual(s['icon_id'],s['cover_id']);self.assertEqual(s['cover_position'],{'x':17,'y':83});self.ok(self.admin.request('media.php?id='+s['cover_id']));self.ok(self.visitor.request('media.php?id='+s['cover_id']),404)
 def test_05_permissions_and_deletion(self):
  id=self.create();image=self.image();self.ok(self.visitor.api('save_space',{'id':id,'cover_id':image['id']}),401);self.ok(self.admin.api('save_space',{'id':id,'cover_id':image['id']},authenticated=False),403);self.ok(self.admin.api('save_space',{'id':id,'cover_id':image['id']}));self.ok(self.admin.api('delete_space',{'id':id}));usage=self.ok(self.admin.api('file_usage',query='&id='+image['id']));self.assertFalse(any(u['kind']=='space' and u.get('id')==id for u in usage['usages']))
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
