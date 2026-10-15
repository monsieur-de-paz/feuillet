#!/usr/bin/env python3
"""Opt-in end-to-end upgrade from public GitHub assets in an owned disposable install."""
import importlib.util,pathlib,unittest,json,hashlib,shutil,re,subprocess,os,time,urllib.error
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('public_update_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
@unittest.skipUnless(h.ARGS.network,'Use --network to download and install the current public release in the disposable copy')
class PublicUpdate(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.install=h.Integration.install
  manifest=json.loads((h.ROOT/'update-manifest.json').read_text())
  for path in list(manifest['files'])+['update-manifest.json']:
   target=cls.install/path;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(h.ROOT/path,target)
  # Simulate an older installed version, keeping all code hashes coherent.
  bootstrap=cls.install/'app/bootstrap.php';bootstrap.write_text(re.sub(r"const FEUILLET_VERSION = '[^']+';","const FEUILLET_VERSION = '0.0.0';",bootstrap.read_text(),count=1));manifest['version']='0.0.0';manifest['files']['app/bootstrap.php']=hashlib.sha256(bootstrap.read_bytes()).hexdigest();(cls.install/'update-manifest.json').write_text(json.dumps(manifest))
  # A real install loads the new PHP version in a fresh request/process.
  h.Integration.proc.terminate();h.Integration.proc.wait(timeout=10)
  h.Integration.proc=subprocess.Popen([h.ARGS.php,'-d','opcache.enable=0','-S',f'127.0.0.1:{h.Integration.port}','-t',str(cls.install/'public')],stdout=h.Integration.log,stderr=h.Integration.log,env={k:v for k,v in os.environ.items() if k!='FEUILLET_CONFIG'})
  for _ in range(100):
   try:cls.admin.session();break
   except (OSError,urllib.error.URLError):time.sleep(.05)
  else:raise RuntimeError('Disposable update server did not restart')
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def test_public_release_installs_and_preserves_private_content(self):
  original=(self.install/'config.php').read_bytes();p=self.ok(self.admin.api('save',{'title':'Private note preserved by public upgrade'}))['page']
  (self.install/'storage/updates').mkdir(exist_ok=True);settings=self.install/'storage/updates/settings.json';settings.write_text(json.dumps({'token':'obsolete-invalid-credential','checked_at':0,'notifications':True}))
  state=self.ok(self.admin.api('update_check',{'force':True}));self.assertIsNone(state['check_error']);self.assertTrue(state['available'],state);self.assertNotIn('token',json.loads(settings.read_text()));self.assertNotIn('token_configured',state);release=state['release']
  job=self.ok(self.admin.api('update_start',{'version':release['version']}));id=job['job']['id']
  for expected in ['extract','apply','validating']:
   result=self.ok(self.admin.api('update_step',{'id':id}));self.assertEqual(result['job']['phase'],expected)
  folder=self.install/'storage/updates'/id;self.assertEqual(hashlib.sha256((folder/'release.zip').read_bytes()).hexdigest(),release['sha256']);self.assertEqual((folder/'release.zip').stat().st_size,release['size']);self.assertTrue((folder/'code.zip').exists());self.assertTrue((folder/'backup.json').exists())
  self.ok(self.admin.request('update-health.php',{'id':id},{'X-CSRF-Token':self.admin.csrf}));self.assertEqual((self.install/'config.php').read_bytes(),original);self.assertEqual(self.ok(self.admin.api('page',query='&id='+p['id']))['page']['title'],p['title']);self.assertEqual(self.ok(self.admin.api('page',query='&id='+p['id']))['page']['visibility'],'private');self.assertEqual(self.ok(self.admin.api('update_status'))['installed_version'],release['version']);self.assertFalse((self.install/'storage/update-journal.json').exists())
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
