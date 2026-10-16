#!/usr/bin/env python3
"""Opt-in upgrade from a real older release after replacing only app/updates.php."""
import importlib.util,pathlib,unittest,os,zipfile,shutil,json,hashlib,subprocess,time,urllib.error,uuid,re
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('legacy_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
LEGACY=os.environ.get('FEUILLET_LEGACY_ARCHIVE');TARGET=os.environ.get('FEUILLET_TARGET_ARCHIVE')
@unittest.skipUnless(LEGACY and (h.ARGS.network or TARGET),'Set FEUILLET_LEGACY_ARCHIVE and either FEUILLET_TARGET_ARCHIVE or --network')
class LegacyUpdate(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.install=h.Integration.install
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def test_single_file_bridge_upgrades_ftp_install_preserving_private_data(self):
  config=(self.install/'config.php').read_bytes();page=self.ok(self.admin.api('save',{'title':'Keep private notes after FTP repair'}))['page'];media=self.ok(self.admin.upload('upload','private.txt',b'Keep private media','text/plain'))['file']
  h.Integration.proc.terminate();h.Integration.proc.wait(timeout=10)
  for path in list(self.install.iterdir()):
   if path.name in ['config.php','storage']:continue
   if path.is_dir():shutil.rmtree(path)
   else:path.unlink()
  with zipfile.ZipFile(LEGACY) as z:
   manifest=json.loads(z.read('feuillet/update-manifest.json'));old_version=manifest['version']
   for name in z.namelist():
    self.assertTrue(name.startswith('feuillet/'));relative=name.removeprefix('feuillet/');self.assertNotIn('..',pathlib.PurePosixPath(relative).parts)
    if relative.startswith('storage/') or relative=='config.php':continue
    target=self.install/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(z.read(name))
  readme=self.install/'README.md';changed=readme.read_bytes().replace(b'\n',b'\r\n')+b'\r\nLocal FTP content\r\n';readme.write_bytes(changed);missing=self.install/'docs/NOUVEAUTES-0.8.md';self.assertTrue(missing.exists());missing.unlink()
  # Exactly the one file supplied by the repair archive. Keep the old bootstrap/version/manifest.
  shutil.copyfile(h.ROOT/'app/updates.php',self.install/'app/updates.php')
  h.Integration.proc=subprocess.Popen([h.ARGS.php,'-d','opcache.enable=0','-S',f'127.0.0.1:{h.Integration.port}','-t',str(self.install/'public')],stdout=h.Integration.log,stderr=h.Integration.log,env={k:v for k,v in os.environ.items() if k!='FEUILLET_CONFIG'})
  for _ in range(100):
   try:session=self.admin.session();break
   except (OSError,urllib.error.URLError):time.sleep(.05)
  else:self.fail('Legacy test server did not restart')
  self.assertEqual(session['version'],old_version)
  current=json.loads((h.ROOT/'update-manifest.json').read_text())['version']
  if h.ARGS.network:
   state=self.ok(self.admin.api('update_check',{'force':True}));self.assertIsNone(state['check_error']);self.assertEqual(state['release']['version'],current)
   job=self.ok(self.admin.api('update_start',{'version':current}))['job'];id=job['id'];self.ok(self.admin.api('update_step',{'id':id}))
  else:
   id=uuid.uuid4().hex;folder=self.install/'storage/updates'/id;folder.mkdir(parents=True,exist_ok=True);shutil.copyfile(TARGET,folder/'release.zip')
   release={'version':current,'tag':'v'+current,'name':'Local real release','notes':'','url':'https://github.com/monsieur-de-paz/feuillet/releases/tag/v'+current,'size':(folder/'release.zip').stat().st_size,'sha256':hashlib.sha256((folder/'release.zip').read_bytes()).hexdigest()}
   job={'id':id,'version':current,'previous_version':old_version,'release':release,'phase':'extract','files_changed':False,'database_changed':False,'tables':manifest['database_tables'],'created_at':int(time.time()),'updated_at':int(time.time())};(folder/'job.json').write_text(json.dumps(job));(folder.parent/'settings.json').write_text(json.dumps({'notifications':True,'release':release,'last_job':id,'checked_at':int(time.time())}))
  folder=self.install/'storage/updates'/id
  self.assertEqual(self.ok(self.admin.api('update_step',{'id':id}))['job']['phase'],'apply')
  self.assertEqual(self.ok(self.admin.api('update_step',{'id':id}))['job']['phase'],'validating')
  with zipfile.ZipFile(folder/'code.zip') as z:self.assertEqual(z.read('README.md'),changed);self.assertNotIn('docs/NOUVEAUTES-0.8.md',z.namelist());self.assertEqual(z.read('app/updates.php'),(h.ROOT/'app/updates.php').read_bytes())
  self.ok(self.admin.request('update-health.php',{'id':id},{'X-CSRF-Token':self.admin.csrf}));self.assertEqual(self.admin.session()['version'],current);self.assertEqual((self.install/'config.php').read_bytes(),config)
  loaded=self.ok(self.admin.api('page',query='&id='+page['id']))['page'];self.assertEqual(loaded['title'],page['title']);self.assertEqual(loaded['visibility'],'private');self.assertEqual(self.ok(self.admin.request('media.php?id='+media['id'])),b'Keep private media')
  installed=json.loads((self.install/'update-manifest.json').read_text())
  for relative,digest in installed['files'].items():self.assertEqual(hashlib.sha256((self.install/relative).read_bytes()).hexdigest(),digest,relative)
  self.assertEqual(json.loads((folder/'job.json').read_text())['phase'],'complete');self.assertFalse((self.install/'storage/update-journal.json').exists())
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
