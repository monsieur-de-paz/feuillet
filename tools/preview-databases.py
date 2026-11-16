#!/usr/bin/env python3
"""Local database-workbench demo. Keeps its own ignored storage; never opens production data."""
import argparse,base64,importlib.util,json,os,pathlib,shutil,socket,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
PRIVATE=ROOT/'.private/database-workbench';CONFIG=PRIVATE/'config.php';ACCESS=PRIVATE/'access.json'
def prepare():
 if CONFIG.is_file() and ACCESS.is_file():return
 PRIVATE.mkdir(parents=True,exist_ok=True);PRIVATE.chmod(0o700)
 spec=importlib.util.spec_from_file_location('workbench_preview',ROOT/'tests/smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
 h.Integration.setUpClass()
 try:
  admin=h.Integration.admin
  def ok(r):
   if r[0]!=200:raise RuntimeError(str(r)[:400])
   return r[1]
  def create(name):return ok(admin.api('db_create',{'name':name}))['database']
  def prop(db,name,type,config=None,required=False):return ok(admin.api('property_save',{'db_id':db['id'],'name':name,'type':type,'config':config or {},'required':required}))['property']
  def title(db):return ok(admin.api('db_get',query='&id='+db['id']))['properties'][0]
  def para(s):return {'type':'paragraph','content':[{'type':'text','text':s}]}
  ok(admin.api('settings',{'notebook':{'title':'Feuillet.','subtitle':'Des tableaux qui laissent place aux idées'},'appearance':{'accent':'#52796C','mode':'light','font':'sans'}}))
  targets=create('Les projets');tt=title(targets);target=ok(admin.api('row_save',{'db_id':targets['id'],'values':{tt['id']:'Un carnet à partager'}}))['row']
  db=create('Les idées en mouvement');name=title(db)
  state=prop(db,'État','select',{'options':['À explorer','En cours','Terminé'],'option_colors':{'À explorer':'#64748b','En cours':'#2563eb','Terminé':'#16a34a'}})
  category=prop(db,'Catégorie','select',{'options':['Écriture','Lecture','Projet']})
  amount=prop(db,'Budget','number');day=prop(db,'Échéance','date');done=prop(db,'Fait','checkbox')
  relation=prop(db,'Projet lié','relation',{'target_db_id':targets['id']});prop(db,'Budget TTC','formula',{'expression':'prop("Budget") * 1.2'})
  for i,label in enumerate(['Composer un carnet de voyage','Rassembler les ressources','Imaginer un nouvel atelier','Relire les premières notes','Préparer les documents','Écouter les retours']):
   ok(admin.api('row_save',{'db_id':db['id'],'values':{name['id']:label,state['id']:['À explorer','En cours','Terminé'][i%3],category['id']:['Écriture','Lecture','Projet'][i%3],amount['id']:25+i*12,day['id']:f'2026-12-{10+i:02d}',done['id']:i==2,relation['id']:[target['id']] if i==2 else []},'visibility':'private' if i==5 else 'public'}))
  prop(db,'Notes','text')
  db=ok(admin.api('db_save',{**db,'visibility':'public'}))['database']
  root=ok(admin.api('save',{'title':'Des données, simplement','icon':'lucide:layout-grid:#52796C','description':'Un tableau, ses propriétés et tous ses réglages. Ici même.','content':{'type':'doc','content':[para('Cliquez une cellule pour écrire. Les en-têtes ouvrent les réglages des colonnes ; les outils de la vue restent à droite du tableau.'),{'type':'databaseView','attrs':{'dbId':db['id']}}]}}))['page']
  root=ok(admin.api('publish',{'id':root['id'],'version':root['version']}))['page']
  empty=create('Un tableau vide');empty_page=ok(admin.api('save',{'title':'Partir d’une page blanche','content':{'type':'doc','content':[para('Le tableau reste visible même avant sa première ligne.'),{'type':'databaseView','attrs':{'dbId':empty['id']}}]}}))['page']
  store=PRIVATE/'storage';shutil.copytree(h.Integration.install/'storage',store,dirs_exist_ok=True)
  cfg=json.loads(subprocess.check_output(['php','-r','echo json_encode(require $argv[1]);',str(h.Integration.install/'config.php')]))
  cfg['storage']=str(store);cfg['sqlite_path']=str(store/'feuillet.sqlite')
  CONFIG.write_text("<?php\n// Private local demo. Never publish.\nreturn json_decode(base64_decode('"+base64.b64encode(json.dumps(cfg).encode()).decode()+"'),true);\n");CONFIG.chmod(0o600)
  ACCESS.write_text(json.dumps({'password':h.Integration.password,'page':root['slug'],'empty':empty_page['slug'],'database':db['id']},indent=2));ACCESS.chmod(0o600)
 finally:h.Integration.tearDownClass()
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8767);args=parser.parse_args();prepare()
 port=args.port
 for candidate in range(port,port+20):
  try:
   with socket.socket() as probe:probe.bind(('127.0.0.1',candidate))
   port=candidate;break
  except OSError:continue
 else:raise SystemExit('No local port available')
 access=json.loads(ACCESS.read_text());access['base']=f'http://127.0.0.1:{port}';ACCESS.write_text(json.dumps(access,indent=2));ACCESS.chmod(0o600)
 print(access['base']+'/index.php?page='+access['page'],flush=True)
 child=subprocess.Popen(['php','-d','opcache.enable=0','-S',f'127.0.0.1:{port}','-t',str(ROOT/'public')],cwd=ROOT,env={**os.environ,'FEUILLET_CONFIG':str(CONFIG)})
 try:child.wait()
 except KeyboardInterrupt:child.terminate();child.wait()
if __name__=='__main__':main()
