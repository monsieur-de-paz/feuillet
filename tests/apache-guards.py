#!/usr/bin/env python3
"""Exercise real Apache .htaccess rules in an owned temporary document root (macOS)."""
import os,pathlib,socket,subprocess,tempfile,time,urllib.request,urllib.error,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1];modules=pathlib.Path('/usr/libexec/apache2');binary='/usr/sbin/httpd'
if not pathlib.Path(binary).exists() or not modules.exists():raise SystemExit('Use a local Apache with the documented module paths; no server is installed by this test.')
with tempfile.TemporaryDirectory(prefix='feuillet-apache-security-',dir='/private/tmp') as temporary:
 folder=pathlib.Path(temporary);www=folder/'www';www.mkdir();
 sensitive=['.env','.gitignore','.git/HEAD','sub/.git/config','config.php.bak','config.php.2026.tmp','notes.sql.gz','debug.log','private.key','feuillet.zip','copy.tar.gz','feuillet.sqlite-wal','storage/files/example','app/private.php']
 for name in sensitive+['manifest.webmanifest','.well-known/acme-challenge/test','index.html','index.php','sub/index.php']:
  p=www/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('OWNED_TEST_SENTINEL')
 with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
 config=f'ServerRoot "/usr"\nServerName 127.0.0.1\nListen 127.0.0.1:{port}\n'
 for module in ['mpm_event','unixd','authz_core','alias','rewrite']:config+=f'LoadModule {module}_module {modules}/mod_{module}.so\n'
 config+=f'User #{os.getuid()}\nGroup #{os.getgid()}\nDefaultRuntimeDir "{folder}"\nMutex file:{folder} default\nPidFile "{folder}/httpd.pid"\nErrorLog "{folder}/error.log"\nDocumentRoot "{www}"\n<Directory "{www}">\nOptions FollowSymLinks\nAllowOverride All\nRequire all granted\n</Directory>\n'
 (folder/'httpd.conf').write_text(config);proc=subprocess.Popen([binary,'-f',str(folder/'httpd.conf'),'-DFOREGROUND'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 def request(name):
  try:r=urllib.request.urlopen(f'http://127.0.0.1:{port}/{name}',timeout=5)
  except urllib.error.HTTPError as e:r=e
  with r:return r.status,r.read()
 try:
  for i in range(60):
   try:request('index.html');break
   except OSError:time.sleep(.05)
  (www/'.htaccess').write_bytes((ROOT/'public/.htaccess').read_bytes())
  shutil.copyfile(www/'.htaccess',www/'sub/.htaccess')
  (www/'index.php').write_text('ROOT_SHARE_HANDLER')
  (www/'sub/index.php').write_text('SUBDIRECTORY_SHARE_HANDLER')
  for name in sensitive:
   status,body=request(name);assert status in [403,404],(name,status);assert b'OWNED_TEST_SENTINEL' not in body;print('BLOCKED',name,status)
  for name in ['manifest.webmanifest','.well-known/acme-challenge/test','index.html']:assert request(name)[0]==200,name
  assert request('bessieres?share=elsewhere')[1]==b'ROOT_SHARE_HANDLER'
  assert request('sub/prive')[1]==b'SUBDIRECTORY_SHARE_HANDLER'
  print('Apache guards passed: sensitive files blocked; public assets, ACME and short URLs reachable.')
 finally:proc.terminate();proc.wait(timeout=10)
