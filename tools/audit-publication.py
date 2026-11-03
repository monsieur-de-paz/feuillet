#!/usr/bin/env python3
"""Fail safely on tracked runtime data or known secret patterns; never print secret values."""
import argparse,pathlib,re,subprocess,sys,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--history',action='store_true');p.add_argument('--archive',type=pathlib.Path);args=p.parse_args()
SECRET=re.compile(rb'(?:\bgh[pousr]_[A-Za-z0-9_]{25,}|\bgithub_pat_[A-Za-z0-9_]{30,}|\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|\bAKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')
def private(path):
 parts=pathlib.PurePosixPath(path).parts;name=parts[-1].lower() if parts else ''
 return any(x in ['.git','node_modules','__pycache__','.private'] for x in parts) or name=='config.php' or name.startswith(('.env','config.php.')) or bool(re.search(r'\.(?:sqlite(?:-.*)?|db|sql(?:\.gz)?|log|pem|key|p12|pfx|bak|old|orig|swp|swo|pyc)$',name)) or name.endswith('~') or ('storage' in parts and name!='.htaccess')
def inspect(path,data,origin):
 if private(path):issues.append(f'{origin}: forbidden private path {path}')
 if len(data)<4000000 and b'\0' not in data[:8192] and SECRET.search(data):issues.append(f'{origin}: secret pattern in {path} (value redacted)')
issues=[];count=0
paths=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
for path in filter(None,paths):
 f=ROOT/path
 if f.is_symlink():issues.append(f'tree: symlink {path}');continue
 if f.is_file():inspect(path,f.read_bytes(),'tree');count+=1
if args.history:
 # Inspect every historical filename, including aliases sharing an existing blob.
 historical=subprocess.check_output(['git','log','--all','--format=','--name-only','-z'],cwd=ROOT).decode().split('\0')
 for path in set(x.strip('\n') for x in historical if x.strip('\n')):
  if private(path):issues.append(f'history: forbidden private path {path}')
 listing=subprocess.check_output(['git','rev-list','--objects','--all'],cwd=ROOT).decode().splitlines();names=dict(line.split(' ',1) if ' ' in line else (line,'') for line in listing)
 proc=subprocess.Popen(['git','cat-file','--batch-check=%(objectname) %(objecttype) %(objectsize)'],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE);meta=proc.communicate(('\n'.join(names)+'\n').encode())[0].decode().splitlines()
 blobs=[(oid,int(size)) for oid,kind,size in map(str.split,meta) if kind=='blob'];proc=subprocess.Popen(['git','cat-file','--batch'],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 for oid,size in blobs:
  if size>4000000:
   if private(names[oid]):issues.append(f'history: forbidden private path {names[oid]}')
   continue
  proc.stdin.write((oid+'\n').encode());proc.stdin.flush();proc.stdout.readline();data=proc.stdout.read(size);proc.stdout.read(1);inspect(names[oid],data,'history:'+oid[:12]);count+=1
 proc.stdin.close();proc.wait()
if args.archive:
 with zipfile.ZipFile(args.archive) as archive:
  for entry in archive.infolist():
   if entry.is_dir():continue
   if entry.filename.startswith('/') or '..' in pathlib.PurePosixPath(entry.filename).parts or ((entry.external_attr >> 16) & 0o170000)==0o120000:
    issues.append('archive: unsafe path or symlink '+entry.filename);continue
   if entry.file_size>64000000:issues.append('archive: oversized member '+entry.filename);continue
   inspect(entry.filename,archive.read(entry),'archive');count+=1
for issue in issues:print(issue)
print(f'Publication audit: {count} files/blobs inspected, {len(issues)} findings. No secret values printed.')
sys.exit(bool(issues))
