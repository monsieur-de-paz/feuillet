#!/usr/bin/env python3
"""Fresh JSON installation, rejected setup attempts and private configuration."""
import importlib.util,pathlib,unittest,re,json,sqlite3,stat
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('install_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Installation(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  class Harness(h.Integration):
   @classmethod
   def setup_installation(self):
    status,html,_=self.admin.request('setup.php');assert status==200;source=html.decode();csrf=re.search(r'name="csrf" value="([^"]+)"',source).group(1);key=(self.install/'storage/installation-key.txt').read_text().strip()
    self.setup_source=source;self.setup_csrf=csrf;values={'name':'Fresh setup','password':self.password,'password_confirm':self.password,'driver':'sqlite','csrf':csrf,'installation_key':key}
    for wrong in [dict(values,csrf='wrong'),dict(values,installation_key='0'*64),dict(values,password='short',password_confirm='short'),dict(values,password_confirm='different'),dict(values,password='🎓'*20,password_confirm='🎓'*20),dict(values,driver='mysql',db_host='localhost;attack',db_name='test',db_port=3306)]:
     status,result,_=self.admin.request('setup.php',wrong);assert status in (400,403),(status,result);assert not (self.install/'config.php').exists();assert key not in json.dumps(result)
    if h.ARGS.mysql:values.update(driver='mysql',db_host='127.0.0.1',db_port=self.mysql_port,db_name='feuillet_test',db_user='root',db_password='')
    else:
     path=self.install/'storage/feuillet.sqlite';db=sqlite3.connect(path);db.execute('CREATE TABLE pages (note TEXT)');db.execute("INSERT INTO pages VALUES ('keep me')");db.commit();db.close();status,result,_=self.admin.request('setup.php',values);assert status==400,(status,result);db=sqlite3.connect(path);assert db.execute('SELECT note FROM pages').fetchone()[0]=='keep me';db.close();path.unlink()
    status,result,_=self.admin.request('setup.php',values);assert status==200 and result['authenticated'],(status,result);self.json_success=result
  cls.harness=Harness;Harness.setUpClass();cls.admin=Harness.admin;cls.visitor=Harness.visitor;cls.install=Harness.install
 @classmethod
 def tearDownClass(cls):cls.harness.tearDownClass()
 def test_01_setup_assets_and_no_key_disclosure(self):
  source=self.harness.setup_source;self.assertIn('setup.js',source);self.assertIn('setup.css',source);self.assertEqual(source.count('data-step='),3)
  for asset in ['setup.js','setup.css','feuillet-logo.svg','fonts/NotoSans.ttf','fonts/NotoSans-Bold.ttf']:self.assertEqual(self.admin.request(asset)[0],200)
 def test_02_json_setup_is_authenticated_and_configuration_is_private(self):
  self.assertTrue(self.harness.json_success['authenticated']);self.assertTrue(self.admin.session()['authenticated']);path=self.install/'config.php';self.assertEqual(stat.S_IMODE(path.stat().st_mode),0o600);self.assertNotIn(self.harness.password,path.read_text());self.assertFalse((self.install/'storage/installation-key.txt').exists());self.assertFalse((self.install/'storage/installation-target.json').exists())
 def test_03_installer_cannot_overwrite_existing_installation(self):
  before=(self.install/'config.php').read_bytes();self.admin.request('setup.php',{'password':'Different','csrf':self.admin.csrf});self.assertEqual((self.install/'config.php').read_bytes(),before)
 def test_04_empty_fresh_notebook_and_public_boundary(self):
  pages=self.admin.api('pages')[1]['pages'];self.assertEqual(pages,[]);self.assertEqual(self.visitor.api('pages')[1]['pages'],[]);self.assertNotIn('Fresh setup',str(self.visitor.api('update_status')[1]));self.assertEqual(self.visitor.api('update_status')[0],401)
 def test_05_create_publish_read_media_and_private_again(self):
  p=self.admin.api('save',{'title':'First course','content':{'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'Fresh course'}]}]}})[1]['page'];f=self.admin.upload('upload','First.txt',b'Fresh file','text/plain')[1]['file'];p=self.admin.api('save',{'id':p['id'],'version':p['version'],'content':{'type':'doc','content':[{'type':'fileBlock','attrs':{'fileId':f['id'],'name':f['name'],'mime':f['mime'],'size':f['size'],'mode':'download'}}]}})[1]['page'];p=self.admin.api('publish',{'id':p['id'],'version':p['version']})[1]['page'];self.assertEqual(self.visitor.request('index.php?read=1&page='+p['slug'])[0],200);self.assertEqual(self.visitor.request('media.php?id='+f['id'])[0],200);self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'});self.assertEqual(self.visitor.request('media.php?id='+f['id'])[0],404)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
