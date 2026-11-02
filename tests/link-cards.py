import importlib.util,pathlib,unittest,base64
HERE=pathlib.Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('link_h',HERE/'smoke.py');h=importlib.util.module_from_spec(s);s.loader.exec_module(h)
class Links(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.a=h.Integration.admin;cls.v=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def test_preview_access_and_cache(self):
  import hashlib,json
  url='https://example.org/article';result={'metadata':{'title':'Un article','description':'Résumé'},'files':[],'warnings':[]}
  folder=h.Integration.install/'storage'/'temporary';folder.mkdir(exist_ok=True)
  (folder/('link-preview-'+hashlib.sha256(url.encode()).hexdigest()+'.json')).write_text(json.dumps(result))
  self.ok(self.v.api('link_preview',{'url':url}),401)
  self.ok(self.a.api('link_preview'),405)
  self.assertEqual(self.ok(self.a.api('link_preview',{'url':url})),result)
  for bad in ['http://example.org','https://127.0.0.1','https://[::1]','https://user:pass@example.org']:
   self.ok(self.a.api('link_preview',{'url':bad}),400)
 def test_visuals_rights_copy_and_backup(self):
  image=self.ok(self.a.upload('upload','Icon.png',base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6xZ0AAAAASUVORK5CYII='),'image/png'))['file'];attrs={'href':'https://example.org/','label':'Bouton','title':'Carte','iconId':image['id'],'posterId':image['id'],'description':'Aperçu'};doc={'type':'doc','content':[{'type':'buttonLink','attrs':attrs},{'type':'bookmark','attrs':attrs}]};p=self.ok(self.a.api('save',{'title':'Liens','content':doc}))['page'];self.ok(self.v.request(image['url']),404);self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}));html=self.ok(self.v.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('link-card-preview',html);self.assertIn('link-card-body',html);self.ok(self.v.request(image['url']));target=self.ok(self.a.api('save',{'title':'Copie'}))['page'];copy=self.ok(self.a.api('blocks_copy',{'id':target['id'],'version':target['version'],'content':doc,'paths':[[0],[1]]}))['page'];a=copy['content']['content'][1]['attrs'];self.assertNotEqual(a['iconId'],image['id']);self.assertEqual(a['iconId'],a['posterId'])
  archive=self.ok(self.a.api('export'));self.ok(self.a.upload('import','backup.zip',archive,'application/zip'))
 def test_untrusted_preview_and_image_reference(self):
  doc={'type':'doc','content':[{'type':'bookmark','attrs':{'href':'https://example.org','previewUrl':'javascript:alert(1)'}}]};p=self.ok(self.a.api('save',{'title':'Sûr','content':doc}))['page'];self.assertEqual(p['content']['content'][0]['attrs']['previewUrl'],'');doc['content'][0]['attrs']['iconId']='00000000-0000-4000-8000-000000000000';self.ok(self.a.api('save',{'title':'Invalide','content':doc}),400)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
