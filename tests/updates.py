#!/usr/bin/env python3
"""Disposable HTTP upgrades, failure recovery and permission/security checks. No production fixture endpoints."""
import importlib.util,pathlib,unittest,json,hashlib,zipfile,subprocess,time,os,shutil
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('update_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Updates(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor;cls.install=h.Integration.install
  manifest=json.loads((h.ROOT/'update-manifest.json').read_text());cls.manifest=manifest
  for path in list(manifest['files'])+['update-manifest.json']:
   target=cls.install/path;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(h.ROOT/path,target)
  cls.original_config=(cls.install/'config.php').read_bytes()
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def seed(self,mode='ok',malicious=None):
  from uuid import uuid4
  id=uuid4().hex;folder=self.install/'storage/updates'/id;folder.mkdir(parents=True)
  files={name:(self.install/name).read_bytes() for name in self.manifest['files']}
  files['app/bootstrap.php']=files['app/bootstrap.php'].replace(b"FEUILLET_VERSION = '0.8.0'",b"FEUILLET_VERSION = '0.8.1'")
  files['public/upgrade-proof.txt']=b'New asset'
  if mode=='runtime':files['public/index.php']+=b"\n<?php throw new RuntimeException('Controlled entrypoint failure'); ?>"
  if mode=='migration':files['app/bootstrap.php']=files['app/bootstrap.php'].replace(b'    migrate_schema($pdo);',b'''    if(basename($_SERVER['SCRIPT_FILENAME']??'')==='update-health.php'){$pdo->exec("CREATE TABLE future_upgrade_probe (id INTEGER)");$pdo->exec("UPDATE pages SET title='Controlled corruption'");throw new RuntimeException('Controlled migration failure');}
    migrate_schema($pdo);''',1)
  if mode=='syntax':files['app/future.php']=b'<?php broken PHP !'
  manifest=dict(self.manifest,version='0.8.1',files={p:hashlib.sha256(data).hexdigest() for p,data in files.items()})
  if mode=='migration':manifest['database_tables']=[*manifest['database_tables'],'future_upgrade_probe']
  if mode=='hash':manifest['files']['public/upgrade-proof.txt']='0'*64
  files['update-manifest.json']=json.dumps(manifest).encode();files['storage/.htaccess']=(h.ROOT/'storage/.htaccess').read_bytes()
  archive=folder/'release.zip'
  with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
   for path,data in files.items():z.writestr('feuillet/'+path,data)
   if malicious:z.writestr(malicious,b'bad')
  release={'version':'0.8.1','tag':'v0.8.1','name':'Test release','notes':'Local fixture','url':'https://github.com/monsieur-de-paz/feuillet/releases/tag/v0.8.1','asset_id':1,'checksum_id':2,'size':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
  job={'id':id,'version':'0.8.1','previous_version':'0.8.0','release':release,'phase':'extract','message':'Test fixture','files_changed':False,'database_changed':False,'tables':['pages','revisions','files','spaces','app_settings','categories','collections','collection_properties','collection_rows','collection_forms','form_uploads'],'created_at':int(time.time()),'updated_at':int(time.time())}
  (folder/'job.json').write_text(json.dumps(job));state={'notifications':True,'checked_at':int(time.time()),'release':release,'last_job':id,'token':''};(folder.parent/'settings.json').write_text(json.dumps(state));return id,folder
 def step(self,id):return self.admin.api('update_step',{'id':id})
 def health(self,id):return self.admin.request('update-health.php',{'id':id},{'X-CSRF-Token':self.admin.csrf})
 def original(self):
  self.assertEqual((self.install/'config.php').read_bytes(),self.original_config)
  self.assertFalse((self.install/'public/upgrade-proof.txt').exists())
  self.assertFalse((self.install/'storage/update-journal.json').exists())
  for path,digest in self.manifest['files'].items():self.assertEqual(hashlib.sha256((self.install/path).read_bytes()).hexdigest(),digest,path)
 def test_01_access_and_preferences(self):
  self.ok(self.visitor.api('update_status'),401);self.ok(self.admin.api('update_step'),405)
  self.ok(self.admin.api('update_preferences',{'choice':'mute'},authenticated=False),403)
  id,_=self.seed();state=self.ok(self.admin.api('update_status'));self.assertTrue(state['ready']);self.assertTrue(state['show_notification']);self.assertNotIn('error',state);self.assertIn('check_error',state)
  for choice in ['later','next','ignore','mute']:
   result=self.ok(self.admin.api('update_preferences',{'choice':choice}));self.assertFalse(result['show_notification']);self.ok(self.admin.api('update_preferences',{'choice':'enable'}))
  self.ok(self.admin.api('update_preferences',{'token':'not-a-token\nheader'}),400)
  result=self.ok(self.admin.api('update_preferences',{'token':'github_pat_FakePrivateToken'}));self.assertTrue(result['token_configured']);self.assertNotIn('FakePrivateToken',json.dumps(result));self.ok(self.admin.api('update_preferences',{'token':''}))
  self.ok(self.visitor.request('recover.php',{}),401);self.ok(self.visitor.request('update-health.php',{}),401)
 def test_02_path_traversal_rejected(self):
  for malicious in ['feuillet/../owned.php','feuillet/config.php','feuillet/storage/files/overwrite','another-root/file.php']:
   id,folder=self.seed(malicious=malicious);self.ok(self.step(id),400);self.original()
 def test_03_hash_and_php_syntax_rejected_before_change(self):
  for mode in ['hash','syntax']:
   id,folder=self.seed(mode);self.ok(self.step(id),400);self.original();self.assertEqual(json.loads((folder/'job.json').read_text())['phase'],'failed')
 def test_04_runtime_failure_rolls_back_code(self):
  id,folder=self.seed('runtime');self.ok(self.step(id));self.ok(self.step(id));self.ok(self.visitor.request('index.php?read=1'),503)
  self.ok(self.visitor.request('update-health.php',{'id':id}),401);self.ok(self.admin.request('update-health.php',{'id':id},{'X-CSRF-Token':'wrong'}),403);result=self.ok(self.health(id),503);self.assertTrue(result['restored']);self.original();self.assertEqual(json.loads((folder/'job.json').read_text())['phase'],'rolled_back')
  self.ok(self.admin.api('update_backup',query='&id='+id));self.ok(self.visitor.api('update_backup',query='&id='+id),401)
 def test_05_failed_migration_restores_exact_database(self):
  p=self.ok(self.admin.api('save',{'title':'Keep my title','content':{'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'Private course'}]}]}}))['page']
  id,folder=self.seed('migration');self.ok(self.step(id));self.ok(self.step(id));result=self.ok(self.health(id),503);self.assertTrue(result['restored']);self.original();restored=self.ok(self.admin.api('page',query='&id='+p['id']))['page'];self.assertEqual(restored['title'],p['title']);self.assertEqual(restored['content'],p['content'])
  runner=h.Integration.sandbox/'schema-check.php';runner.write_text("<?php require "+repr(str(self.install/'app/bootstrap.php'))+"; try{db()->query('SELECT * FROM future_upgrade_probe');exit(1);}catch(PDOException){echo 'new table removed';}");result=subprocess.run([h.ARGS.php,str(runner)],capture_output=True);self.assertEqual(result.returncode,0,result.stderr)
 def test_06_interrupted_activation_is_recovered_on_next_visit(self):
  id,folder=self.seed();self.ok(self.step(id))
  runner=h.Integration.sandbox/'interrupt.php';runner.write_text("<?php require "+repr(str(self.install/'app/bootstrap.php'))+"; require "+repr(str(self.install/'app/updates.php'))+"; $lock=updates_lock(); $job=updates_job('"+id+"');updates_apply($job);")
  process=subprocess.Popen([h.ARGS.php,str(runner)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  journal=self.install/'storage/update-journal.json';killed=False
  for _ in range(10000):
   if journal.exists():
    try:phase=json.loads(journal.read_text()).get('phase')
    except (ValueError,FileNotFoundError):phase=''
    if phase=='applying':process.kill();killed=True;break
   if process.poll() is not None:break
   time.sleep(.0005)
  process.wait(timeout=10);self.assertTrue(killed,'Activation finished before crash simulation');self.ok(self.visitor.request('index.php?read=1'));self.original()
 def test_07_abandoned_validation_deadline_recovers(self):
  id,folder=self.seed();self.ok(self.step(id));self.ok(self.step(id));path=self.install/'storage/update-journal.json';journal=json.loads(path.read_text());journal['deadline']=0;path.write_text(json.dumps(journal));self.ok(self.visitor.request('index.php?read=1'));self.original()
 def test_08_update_url_policy(self):
  runner=h.Integration.sandbox/'urls.php';runner.write_text("<?php require "+repr(str(self.install/'app/bootstrap.php'))+"; require "+repr(str(self.install/'app/updates.php'))+"; foreach(['http://api.github.com/repos/monsieur-de-paz/feuillet/releases','https://api.github.com/repos/other/repo/releases','https://api.github.com@evil.test/x','https://localhost/x','https://api.github.com:443/repos/monsieur-de-paz/feuillet/releases'] as $url){try{updates_url($url,true);exit(1);}catch(AppError){}} updates_url('https://api.github.com/repos/monsieur-de-paz/feuillet/releases/latest'); echo 'policy ok';")
  result=subprocess.run([h.ARGS.php,str(runner)],capture_output=True);self.assertEqual(result.returncode,0,result.stderr)
 def test_09_filesystem_and_development_checkout_are_refused(self):
  id,folder=self.seed();git=self.install/'.git';git.mkdir()
  try:self.assertFalse(self.ok(self.admin.api('update_status'))['ready']);self.ok(self.admin.api('update_start',{'version':'0.8.1'}),503)
  finally:git.rmdir()
  self.ok(self.step(id));target=self.install/'app/bootstrap.php';target.chmod(0o444)
  try:self.ok(self.step(id),400);self.original()
  finally:target.chmod(0o644)
 def test_10_checks_do_not_put_readers_in_maintenance(self):
  runner=h.Integration.sandbox/'control-lock.php';marker=h.Integration.sandbox/'control-ready';runner.write_text("<?php require "+repr(str(self.install/'app/bootstrap.php'))+";require "+repr(str(self.install/'app/updates.php'))+";$lock=updates_control_lock();file_put_contents("+repr(str(marker))+",'ready');usleep(1000000);")
  process=subprocess.Popen([h.ARGS.php,str(runner)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  try:
   for _ in range(200):
    if marker.exists():break
    time.sleep(.005)
   self.assertTrue(marker.exists());self.ok(self.visitor.request('index.php?read=1'));self.ok(self.admin.api('update_preferences',{'choice':'enable'}),409)
  finally:process.wait(timeout=5)
  self.ok(self.admin.api('update_preferences',{'choice':'enable'}))
 def test_90_success_preserves_pages_media_config_and_session(self):
  p=self.ok(self.admin.api('save',{'title':'Course survives upgrade','content':{'type':'doc','content':[{'type':'paragraph'}]}}))['page'];file=self.ok(self.admin.upload('upload','Keep.txt',b'Keep media','text/plain'))['file']
  id,folder=self.seed();self.ok(self.step(id));job=self.ok(self.step(id))['job'];self.assertEqual(job['phase'],'validating');self.assertTrue((folder/'code.zip').exists());self.assertTrue((folder/('database.jsonl' if h.ARGS.mysql else 'database.sqlite')).exists());self.ok(self.health(id));self.assertEqual(self.ok(self.admin.api('session'))['version'],'0.8.1');self.assertEqual(self.ok(self.admin.api('page',query='&id='+p['id']))['page']['title'],p['title']);self.assertEqual(self.ok(self.admin.request('media.php?id='+file['id'])),b'Keep media');self.assertEqual((self.install/'config.php').read_bytes(),self.original_config);self.assertFalse((self.install/'storage/update-journal.json').exists());self.assertEqual((self.install/'public/upgrade-proof.txt').read_bytes(),b'New asset');recovered=self.ok(self.admin.request('recover.php',{'id':id},{'X-CSRF-Token':self.admin.csrf}));self.assertTrue(recovered['already_installed']);self.assertEqual(self.ok(self.admin.api('session'))['version'],'0.8.1')
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
