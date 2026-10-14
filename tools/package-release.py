#!/usr/bin/env python3
"""Package an installable distribution; exclude all local runtime data."""
import argparse, hashlib, json, pathlib, re, subprocess, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=pathlib.Path,required=True,help='Directory for the ZIP and SHA-256 file')
args=parser.parse_args()
version=re.search(r"const FEUILLET_VERSION = '([^']+)';",(ROOT/'app/bootstrap.php').read_text()).group(1)
if (ROOT/'.git').exists():
    paths=[ROOT/p for p in subprocess.check_output(['git','-C',str(ROOT),'ls-files','-z']).decode().split('\0') if p]
else:
    paths=[p for p in ROOT.rglob('*') if p.is_file()]
def permitted(p):
    relative=p.relative_to(ROOT)
    if any(part in ['.git','node_modules','__pycache__'] for part in relative.parts):return False
    if relative.parts[0] in ['storage'] and relative.as_posix()!='storage/.htaccess':return False
    if p.name=='config.php' or p.name.startswith(('.env','config.php.')):return False
    if p.suffix.lower() in ['.log','.sqlite','.db','.zip','.pyc'] or '.sqlite-' in p.name:return False
    return True
paths=sorted(p for p in paths if permitted(p) and p.is_file() and p.name!='update-manifest.json')
manifest={'format':'feuillet-distribution','protocol':1,'version':version,'php_min':'8.3.0','extensions':['pdo','mbstring','fileinfo','zip','curl','tokenizer'],'database_tables':['pages','revisions','files','spaces','app_settings','categories','collections','collection_properties','collection_rows','collection_forms','form_uploads'],'files':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.relative_to(ROOT).parts[0]!='storage'}}
manifest_path=ROOT/'update-manifest.json'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
paths.append(manifest_path)
for required in ['README.md','LICENSE','public/assets/app.js','public/assets/app.css','public/index.php','public/setup.php','storage/.htaccess']:
    if ROOT/required not in paths:raise SystemExit('Required distribution file missing: '+required)
args.output.mkdir(parents=True,exist_ok=True)
archive=args.output/f'Feuillet-{version}.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as output:
    for p in paths:output.write(p,'feuillet/'+p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(archive) as output:
    if output.testzip() is not None:raise SystemExit('Invalid ZIP')
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.sha256')).write_text(checksum+'  '+archive.name+'\n')
print(f'{archive.name}: {len(paths)} files, {archive.stat().st_size} bytes; SHA-256 {checksum}')
