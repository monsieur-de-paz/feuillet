#!/usr/bin/env python3
"""Check public-source allowance and rejection of leaked or unsafe ZIP entries."""
import pathlib,subprocess,tempfile,unittest,zipfile,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Publication(unittest.TestCase):
 def check_archive(self,entries,success):
  with tempfile.TemporaryDirectory(prefix='feuillet-publication-') as directory:
   archive=pathlib.Path(directory)/'distribution.zip'
   with zipfile.ZipFile(archive,'w') as z:
    for name,body in entries.items():z.writestr(name,body)
   p=subprocess.run([sys.executable,str(ROOT/'tools/audit-publication.py'),'--archive',str(archive)],cwd=ROOT,capture_output=True,text=True)
   self.assertEqual(p.returncode,0 if success else 1,p.stdout+p.stderr);return p.stdout
 def test_normal_public_source_is_allowed(self):
  self.check_archive({'feuillet/.gitignore':'config.php\n','feuillet/public/.htaccess':'Options -Indexes\n','feuillet/storage/.htaccess':'Require all denied\n'},True)
 def test_runtime_files_and_traversal_are_rejected(self):
  for path in ['feuillet/config.php','feuillet/public/.env','feuillet/storage/private.txt','../outside.txt','feuillet/database.sql.gz']:
   with self.subTest(path=path):self.check_archive({path:'OWNED_TEST_SENTINEL'},False)
 def test_provider_secret_detection_redacts_the_value(self):
  sentinel='ghp_'+'x'*36
  output=self.check_archive({'feuillet/example.txt':sentinel},False)
  self.assertNotIn(sentinel,output);self.assertIn('value redacted',output)
 def test_old_filename_is_checked_even_when_blob_is_shared(self):
  with tempfile.TemporaryDirectory(prefix='feuillet-history-') as directory:
   repo=pathlib.Path(directory);(repo/'tools').mkdir();(repo/'tools/audit-publication.py').write_bytes((ROOT/'tools/audit-publication.py').read_bytes())
   def git(*args):return subprocess.run(['git',*args],cwd=repo,check=True,capture_output=True)
   git('init','-q');(repo/'safe.txt').write_text('same innocuous contents');(repo/'config.php').write_text('same innocuous contents');git('add','.');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','Temporary historical fixture');git('rm','config.php');git('-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','Remove fixture')
   p=subprocess.run([sys.executable,str(repo/'tools/audit-publication.py'),'--history'],cwd=repo,capture_output=True,text=True)
   self.assertEqual(p.returncode,1,p.stdout+p.stderr);self.assertIn('history: forbidden private path config.php',p.stdout)
if __name__=='__main__':unittest.main(verbosity=2)
