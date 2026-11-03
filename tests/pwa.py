import importlib.util,pathlib,unittest,json
HERE=pathlib.Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('pwa_h',HERE/'smoke.py');h=importlib.util.module_from_spec(s);s.loader.exec_module(h)
class Pwa(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.a=h.Integration.admin;cls.v=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def test_only_published_anonymous_snapshots_can_be_stored(self):
  p=self.ok(self.a.api('save',{'title':'Public hors connexion'}))['page'];self.ok(self.v.request('reader-state.php?page='+p['id']))
  self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}));state=self.ok(self.v.request('reader-state.php?page='+p['id']));self.assertTrue(state['offlineEligible']);self.assertIn('Public hors connexion',state['html']);self.assertFalse(self.ok(self.a.request('reader-state.php?page='+p['id']))['offlineEligible'])
  p=self.ok(self.a.api('page',query='&id='+p['id']))['page'];self.ok(self.a.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}));state=self.ok(self.v.request('reader-state.php?page='+p['id']));self.assertFalse(state['offlineEligible']);self.assertTrue(state['unavailable']);self.assertNotIn('Public hors connexion',state['html'])
 def test_installation_assets_and_public_text_response(self):
  manifest=self.ok(self.v.request('manifest.webmanifest'));manifest=json.loads(manifest) if isinstance(manifest,bytes) else manifest;self.assertEqual(manifest['display'],'standalone');self.assertEqual(manifest['scope'],'./')
  for path in ['sw.js','pwa.js','offline.html','offline.js','pwa.css']:self.ok(self.v.request(path))
  p=self.ok(self.a.api('save',{'title':'Texte avant médias'}))['page'];self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}));html=self.ok(self.v.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('manifest.webmanifest',html);self.assertIn('pwa.js',html);self.assertIn('Texte avant médias',html)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
