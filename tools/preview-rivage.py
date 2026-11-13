#!/usr/bin/env python3
"""Local-only Rivage sandbox. Durable data in ignored .private/rivage; never resets existing notes."""
import argparse,base64,datetime,hashlib,importlib.util,json,math,os,pathlib,shutil,socket,sqlite3,struct,subprocess,sys,zlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
PRIVATE=ROOT/'.private/rivage';CONFIG=PRIVATE/'config.php';ACCESS=PRIVATE/'access.json'
def art(index):
 w,h=1280,640
 palettes=[((235,236,221),(201,222,210),(139,177,160),(76,130,114),(43,102,93)),((231,231,224),(198,215,221),(151,180,194),(91,131,150),(54,93,116)),((242,231,211),(229,207,183),(204,164,135),(168,120,101),(116,91,84))]
 sky,lake,far,mid,near=palettes[index%3];rows=[]
 def ridge(x,layer):
  return [255+63*math.sin(x*.007+1)+24*math.sin(x*.019),325+63*math.sin(x*.006+3)+22*math.sin(x*.015),415+46*math.sin(x*.004+1.4)+20*math.sin(x*.017)][layer]
 for y in range(h):
  row=bytearray()
  for x in range(w):
   color=sky
   if y>ridge(x,0):color=far
   if y>ridge(x,1):color=mid
   if y>ridge(x,2):color=near
   if y>465:
    t=(y-465)/(h-465);color=tuple(int(lake[k]*(1-t*.24)+near[k]*t*.24) for k in range(3))
    if y%19==0 and 120<x<w-100:color=tuple(min(255,c+9) for c in color)
   if (x-1020)**2+(y-155)**2<45**2:color=(249,241,217)
   grain=((x*13+y*7)%5)-2
   row.extend(max(0,min(255,c+grain)) for c in color)
  rows.append(b'\0'+bytes(row))
 def chunk(kind,data):return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
def pdf():
 stream=b'BT /F1 26 Tf 64 740 Td (Feuillet - Rivage) Tj 0 -46 Td /F1 12 Tf (Une page pour vos idees.) Tj 0 -24 Td (Document de demonstration, sans donnee personnelle.) Tj ET'
 objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
 data=b'%PDF-1.4\n';offsets=[0]
 for i,obj in enumerate(objects,1):offsets.append(len(data));data+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
 xref=len(data);data+=b'xref\n0 6\n0000000000 65535 f \n'+b''.join(f'{v:010d} 00000 n \n'.encode() for v in offsets[1:])+b'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+str(xref).encode()+b'\n%%EOF'
 return data

def prepare():
 if CONFIG.is_file() and ACCESS.is_file():return
 PRIVATE.mkdir(parents=True,exist_ok=True);PRIVATE.chmod(0o700)
 spec=importlib.util.spec_from_file_location('rivage_fixture',ROOT/'tests/smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
 h.Integration.setUpClass()
 try:
  admin=h.Integration.admin
  def ok(r):
   if r[0]!=200:raise RuntimeError(str(r)[:500])
   return r[1]
  def text(s):return {'type':'text','text':s}
  def para(s):return {'type':'paragraph','content':[text(s)]}
  def heading(s,level=2):return {'type':'heading','attrs':{'level':level},'content':[text(s)]}
  def icon(s):return 'lucide:'+s+':#52796C'
  spaces=ok(admin.api('spaces'))['spaces'];first=spaces[0]
  def space(data):
   result=ok(admin.api('save_space',data));return next(s for s in result['spaces'] if s['id']==result['id'])
  first=space({**first,'name':'Les jours à venir','icon':icon('notebook-pen')})
  project=space({'name':'Projets en mouvement','icon':icon('layers')})
  reading=space({'name':'Lectures & découvertes','icon':icon('bookmark')})
  ok(admin.api('settings',{'notebook':{'title':'Feuillet.','subtitle':'Un peu de place pour vos idées','auto_publish':True,'auto_publish_children':True},'appearance':{'accent':'#52796C','font':'sans','mode':'light'}}))
  covers=[ok(admin.upload('upload',f'Paysage-Rivage-{i+1}.png',art(i),'image/png'))['file'] for i in range(3)]
  document=ok(admin.upload('upload','Quelques notes pour commencer.pdf',pdf(),'application/pdf'))['file']
  def page(title,emoji,description,blocks,space,cover=None,parent=None):
   return ok(admin.api('save',{'title':title,'icon':icon(emoji),'description':description,'space_id':space['id'],'parent_id':parent['id'] if parent else None,'cover_id':cover['id'] if cover else None,'content':{'type':'doc','content':blocks}}))['page']
  lake=page('À l’écoute des paysages','mountain','Prendre le temps de regarder, puis de raconter.',[para('Un lac tranquille, quelques lignes et une idée qui trouve sa place.'),heading('Ce que l’on emporte'),para('Une couleur aperçue en chemin. Un détail que l’on ne veut pas oublier. Ces petits fragments deviennent parfois le début de quelque chose.')],reading,covers[1])
  write=page('Écrire, sans se presser','feather','Le plaisir de laisser une trace, simplement.',[para('Le premier mot n’a pas besoin d’être le bon. Il ouvre seulement la porte au suivant.'),heading('Le fil de la journée'),{'type':'taskList','content':[{'type':'taskItem','attrs':{'checked':False},'content':[para('Garder une idée à portée de main.')]},{'type':'taskItem','attrs':{'checked':True},'content':[para('Faire de la place dans son carnet.')]},]},{'type':'toggleHeading','content':[heading('Une petite réserve d’idées',3),para('Les idées peuvent attendre ici jusqu’au moment où elles deviennent utiles.')]}],first,covers[2])
  plan=page('Les petits projets prennent vie','layers','Faire un premier pas, puis voir le chemin se dessiner.',[para('Un projet peut commencer avec trois lignes et beaucoup de curiosité.'),heading('À explorer'),{'type':'callout','attrs':{'tone':'gray','icon':'✳️'},'content':[para('Avancer à son rythme, avec une direction claire et le droit de changer d’avis.')]}],project)
  root=page('Faire de la place aux idées','sparkles','Un carnet ouvert. Une idée après l’autre.',[],first,covers[0])
  for child in [lake,write,plan]:
   child=ok(admin.api('move',{'id':child['id'],'version':child['version'],'parent_id':root['id']}))['page']
  def link(p):return {'type':'pageLink','attrs':{'pageId':p['id'],'presentation':'row','iconSize':'medium','showIcon':True}}
  nodes=[para('Il y a les idées qui passent, celles qui restent et celles que l’on aimerait partager. Ici, chacune peut trouver sa place.'),heading('Commencer par ce qui compte'),{'type':'callout','attrs':{'tone':'gray','icon':'✳️'},'content':[para('Un espace pour écrire librement, relier les idées et garder à portée de main ce qui mérite de rester.')]},{'type':'columns','content':[{'type':'column','content':[heading('À portée de main',3),link(write),link(plan)]},{'type':'column','content':[heading('Prendre le large',3),link(lake),para('Un peu d’air entre deux idées. Une autre manière de regarder.')]}]},heading('Un document à feuilleter'),{'type':'fileBlock','attrs':{'fileId':document['id'],'name':document['name'],'mime':document['mime'],'size':document['size'],'mode':'download'}},heading('Les pages du carnet'),{'type':'gallery','attrs':{'manual':True,'pageIds':[lake['id'],write['id'],plan['id']],'columns':3,'rows':1,'aspect':'4/3','title':'Un horizon à explorer'}}]
  root=ok(admin.api('save',{**root,'content':{'type':'doc','content':nodes}}))['page'];root=ok(admin.api('publish',{'id':root['id'],'version':root['version']}))['page']
  private=page('Une idée pour demain','moon','Les notes que l’on garde encore pour soi.',[para('Ce carnet de démonstration est personnel. Cette page reste privée pour vérifier les deux côtés de Feuillet.')],project)
  db=ok(admin.api('db_save',{'name':'Le fil des projets','visibility':'private'}))['database']
  title=ok(admin.api('property_save',{'db_id':db['id'],'name':'Idée','type':'title'}))['property']
  status=ok(admin.api('property_save',{'db_id':db['id'],'name':'Étape','type':'select','config':{'options':['À explorer','En mouvement','À partager']}}))['property']
  for label,state in [('Un carnet de lectures','En mouvement'),('Un petit voyage','À explorer'),('Une idée à transmettre','À partager')]:ok(admin.api('row_save',{'db_id':db['id'],'values':{title['id']:label,status['id']:state}}))
  project_page=page('Le fil des projets','layout-grid','Des idées qui avancent, chacune à leur rythme.',[para('Un aperçu de ce qui prend forme, à organiser librement.'),{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':{'layout':'table'}}}],project)
  # Give synthetic demo entries a stable, understandable order.
  source=h.Integration.install/'storage/feuillet.sqlite'
  with sqlite3.connect(source) as sql:
   for i,p in enumerate([private,lake,write,project_page,plan,root]):sql.execute('UPDATE pages SET updated_at=? WHERE id=?',(f'2026-11-13T{8+i:02d}:30:00Z',p['id']))
  storage=PRIVATE/'storage';shutil.copytree(h.Integration.install/'storage',storage,dirs_exist_ok=True)
  with sqlite3.connect(source) as src,sqlite3.connect(storage/'feuillet.sqlite') as dest:src.backup(dest)
  cfg=json.loads(subprocess.check_output(['php','-r','echo json_encode(require $argv[1]);',str(h.Integration.install/'config.php')]))
  cfg['storage']=str(storage);cfg['sqlite_path']=str(storage/'feuillet.sqlite')
  encoded=base64.b64encode(json.dumps(cfg).encode()).decode();CONFIG.write_text("<?php\n// Private local preview. Never publish.\nreturn json_decode(base64_decode('"+encoded+"'),true);\n");CONFIG.chmod(0o600)
  ACCESS.write_text(json.dumps({'password':h.Integration.password,'home':root['id'],'project':project_page['id'],'first_space':first['id']},indent=2));ACCESS.chmod(0o600)
  (PRIVATE/'README.txt').write_text('Rivage : données de démonstration locales. Vos modifications sont conservées ici. Ne pas publier ce dossier.\nRelancer : python3 tools/preview-rivage.py\n')
 finally:h.Integration.tearDownClass()

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8766);args=parser.parse_args()
 prepare()
 access=json.loads(ACCESS.read_text());port=args.port
 for candidate in range(port,port+20):
  try:
   with socket.socket() as probe:probe.bind(('127.0.0.1',candidate))
   port=candidate;break
  except OSError:continue
 else:raise SystemExit('Aucun port local disponible.')
 access['base']=f'http://127.0.0.1:{port}';ACCESS.write_text(json.dumps(access,indent=2));ACCESS.chmod(0o600)
 env={**os.environ,'FEUILLET_CONFIG':str(CONFIG)}
 print('Rivage local : '+access['base']+'/index.php?dashboard=1',flush=True)
 print('Données conservées dans '+str(PRIVATE),flush=True)
 child=subprocess.Popen(['php','-d','opcache.enable=0','-S',f'127.0.0.1:{port}','-t',str(ROOT/'public')],cwd=ROOT,env=env)
 try:child.wait()
 except KeyboardInterrupt:child.terminate();child.wait()
if __name__=='__main__':main()
