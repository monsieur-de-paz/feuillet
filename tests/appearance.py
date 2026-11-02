import importlib.util,pathlib,unittest
HERE=pathlib.Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('appearance_h',HERE/'smoke.py');h=importlib.util.module_from_spec(s);s.loader.exec_module(h)
class Appearance(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.a=h.Integration.admin;cls.v=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def test_monochrome_and_custom_settings_public_and_page_override(self):
  p=self.ok(self.a.api('save',{'title':'Un thème lisible'}))['page'];self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}))
  for mode,bg,expected in [('light','#FFFFFF','#303030'),('dark','#17191D','#E5E5E5'),('oled','#000000','#F5F5F5')]:
   style={'accentMode':'monochrome','mode':mode,'background':bg};saved=self.ok(self.a.api('settings',{'appearance':style}))['appearance'];self.assertEqual(saved['accentMode'],'monochrome');html=self.ok(self.v.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('--accent:'+expected,html);self.assertIn('--accent-mode:monochrome',html)
  custom={'accentMode':'custom','accent':'#123456','accentDark':'#C6DDF6','accentOled':'#FFEEDD','mode':'dark','background':'#17191D'}
  saved=self.ok(self.a.api('settings',{'appearance':custom}))['appearance'];self.assertEqual(saved['accentDark'],'#C6DDF6');html=self.ok(self.v.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('--accent:#C6DDF6',html);self.assertIn('--accent-oled:#FFEEDD',html)
  p=self.ok(self.a.api('page',query='&id='+p['id']))['page'];p=self.ok(self.a.api('save',{**p,'appearance':{'accentMode':'monochrome','mode':'oled','background':'#000000'}}))['page'];self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}));html=self.ok(self.v.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('--accent:#F5F5F5',html)
 def test_validation_and_legacy_defaults(self):
  for bad in [{'accentMode':'evil'},{'accentDark':'red'},{'accentOled':'javascript:alert(1)'},{'accentDark':None}]:self.ok(self.a.api('settings',{'appearance':bad}),400)
  saved=self.ok(self.a.api('settings',{'appearance':{'accent':'#2563EB'}}))['appearance'];self.assertEqual(saved['accentMode'],'auto');self.assertEqual(saved['accentDark'],'');self.assertEqual(saved['accent'],'#2563EB')
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
