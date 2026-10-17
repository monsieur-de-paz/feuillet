#!/usr/bin/env python3
"""Cross-page atomic moves, previews and image import validation, on disposable data."""
import importlib.util,pathlib,unittest,json,subprocess
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('media_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
def p(text):return {'type':'paragraph','content':[{'type':'text','text':text}]}
class Features(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def page(self,title,blocks=None):return self.ok(self.admin.api('save',{'title':title,'content':{'type':'doc','content':blocks or [p('Texte initial')]}}))['page']
 def move(self,a,b,paths,**extra):return self.admin.api('blocks_transfer',dict(source_id=a['id'],source_version=a['version'],target_id=b['id'],target_version=b['version'],paths=paths,**extra))
 def current(self,p):return self.ok(self.admin.api('page',query='&id='+p['id']))['page']
 def test_01_group_order_marks_and_undo(self):
  a=self.page('Source',[p('A'),dict(p('B'),attrs={'textAlign':'center'}),p('C')]);b=self.page('Cible',[p('Avant')]);r=self.ok(self.move(a,b,[[2],[0]]));self.assertEqual(r['source']['content']['content'],[a['content']['content'][1]]);self.assertEqual([x['content'][0]['text'] for x in r['target']['content']['content']],['Avant','A','C']);undo=self.ok(self.admin.api('blocks_restore',r['undo']));self.assertEqual(undo['source']['content'],a['content']);self.assertEqual(undo['target']['content'],b['content'])
 def test_02_nested_only_child_keeps_valid_toggle(self):
  a=self.page('Dépliable',[{'type':'toggleHeading','content':[{'type':'heading','attrs':{'level':2},'content':[{'type':'text','text':'Titre'}]},p('Dedans')]}]);b=self.page('Destination');r=self.ok(self.move(a,b,[[0,1]]));self.assertEqual(r['source']['content']['content'][0]['content'][1],{'type':'paragraph'});self.assertEqual(r['target']['content']['content'][-1],p('Dedans'));self.ok(self.move(r['source'],r['target'],[[0,0]]),400)
 def test_03_versions_and_invalid_paths_leave_both_intact(self):
  a=self.page('A',[p('Conserver')]);b=self.page('B');new=self.ok(self.admin.api('save',{**b,'title':'Modifiée'}))['page'];self.ok(self.move(a,b,[[0]]),409);self.assertEqual(self.current(a)['content'],a['content']);self.assertEqual(self.current(new)['content'],new['content'])
  for paths in [[],[[9]],[['0']],[[0,0]],[[-1]]]:self.ok(self.move(a,new,paths),400 if paths!=[[9]] else 409)
  self.assertEqual(self.current(a)['content'],a['content']);self.ok(self.move(a,a,[[0]]),400)
 def test_04_parent_selection_deduplicates_descendants_and_attachments(self):
  f=self.ok(self.admin.upload('upload','Note.txt',b'Piece jointe','text/plain'))['file'];callout={'type':'callout','attrs':{'tone':'blue'},'content':[p('Enfant'),{'type':'fileBlock','attrs':{'fileId':f['id'],'name':f['name'],'mime':f['mime'],'mode':'download'}}]};a=self.page('Parent',[callout]);b=self.page('Cible vide',[{'type':'paragraph'}]);r=self.ok(self.move(a,b,[[0],[0,0],[0]]));self.assertEqual(r['count'],1);self.assertEqual(r['target']['content']['content'][0],callout);self.assertEqual(r['source']['content']['content'],[{'type':'paragraph'}]);self.ok(self.visitor.request('file-preview.php?id='+f['id']),404)
 def test_05_public_sync_and_private_destination(self):
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish':True}}));a=self.page('Publique',[p('Déplacé')]);self.ok(self.admin.api('publish',{'id':a['id'],'version':a['version']}));b=self.page('Privée');r=self.ok(self.move(self.current(a),b,[[0]]));public=self.ok(self.visitor.api('page',query='&id='+a['id']))['page'];self.assertNotIn('Déplacé',json.dumps(public));self.ok(self.visitor.api('page',query='&id='+b['id']),404);self.ok(self.admin.api('settings',{'notebook':{'auto_publish':False}}))
 def test_06_no_anonymous_csrf_or_get_mutations(self):
  self.ok(self.visitor.api('blocks_transfer',{}),401);self.ok(self.admin.api('blocks_transfer',{},authenticated=False),403);self.ok(self.admin.api('blocks_restore'),405)
 def test_07_preview_text_escaped_private_then_public(self):
  f=self.ok(self.admin.upload('upload','Texte.txt',b'Valeurs : 5 < 10 & 20 > 2','text/plain'))['file'];url='file-preview.php?id='+f['id'];self.ok(self.visitor.request(url),404);html=self.ok(self.admin.request(url)).decode();self.assertIn('5 &lt; 10 &amp; 20 &gt; 2',html);self.assertNotIn('<script>',html)
  page=self.page('Document',[{'type':'fileBlock','attrs':{'fileId':f['id'],'mode':'download'}}]);self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}));self.ok(self.visitor.request(url));html=self.ok(self.visitor.request('index.php?page='+page['id']+'&read=1')).decode();self.assertIn('data-file-preview="'+f['id']+'"',html);self.assertIn('file-preview.js',html)
 def test_08_unsupported_preview_fallback_and_trash(self):
  f=self.ok(self.admin.upload('upload','Objet.stl',b'solid example\nendsolid','application/octet-stream'))['file'];html=self.ok(self.admin.request('file-preview.php?id='+f['id']+'&theme=oled')).decode();self.assertIn('ne peut pas afficher ce format',html);self.assertIn('data-theme="oled"',html);self.assertNotIn('docs.google',html)
 def test_09_self_reference_and_conflicting_undo(self):
  b=self.page('Cible');a=self.page('Source',[{'type':'pageLink','attrs':{'pageId':b['id']}}]);self.ok(self.move(a,b,[[0]]),400)
  a=self.page('Source',[p('Texte')]);r=self.ok(self.move(a,b,[[0]]));self.ok(self.admin.api('save',{**r['target'],'content':{'type':'doc','content':[p('Nouveau texte à conserver')]}}));self.ok(self.admin.api('blocks_restore',r['undo']),409);self.assertIn('Nouveau texte à conserver',json.dumps(self.current(b),ensure_ascii=False))
 def test_10_image_import_untrusted_metadata_rejected(self):
  for data in [{'provider':'openverse','id':'../../etc/passwd'},{'provider':'openverse','id':'http://127.0.0.1/'},{'provider':'commons','title':'http://localhost/'}]:self.ok(self.admin.api('image_import',data),400)
 def test_11_public_default_system_option(self):
  html=self.ok(self.visitor.request('index.php')).decode();self.assertIn('data-theme-value="system"',html);self.assertIn('Système',html)
 def test_12_image_network_boundary_and_new_commons_host(self):
  code="""require 'app/bootstrap.php';foreach(['http://api.openverse.org/','https://127.0.0.1/x','https://localhost/x','https://[::1]/','https://user:pass@api.openverse.org/','https://api.openverse.org:443/x'] as $url){try{image_remote_address($url);exit(9);}catch(AppError){}}$r=commons_images([['title'=>'File:Test.jpg','imageinfo'=>[['thumburl'=>'https://thumb.wikimedia.org/example.jpg','descriptionurl'=>'https://commons.wikimedia.org/wiki/File:Test.jpg']]]]);if(count($r)!==1)exit(8);$r=openverse_image(['id'=>'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee','url'=>'https://images.example.org/a.jpg','thumbnail'=>'https://images.example.org/t.jpg','license'=>'by','mature'=>true]);if($r!==null)exit(7);require 'app/render.php';$credit=render_credit(['source_name'=>'NASA Images','source_url'=>'https://images.nasa.gov/example']);if(!str_contains($credit,'NASA Images')||str_contains($credit,'Wikimedia Commons'))exit(6);echo 'ok';"""
  result=subprocess.run([h.ARGS.php,'-r',code],cwd=h.ROOT,capture_output=True,text=True);self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(result.stdout,'ok')
 def test_13_pdf_engine_mime_is_public_fixed_and_cacheable(self):
  for query,name in [('', 'pdf.min.mjs'),('&worker=1','pdf.worker.min.mjs')]:
   response=self.visitor.request('pdf-engine.php?v=0.15.0'+query);body=self.ok(response);self.assertIn('text/javascript',response[2].get('Content-Type',''));self.assertIn('immutable',response[2].get('Cache-Control',''));self.assertEqual(body,(h.ROOT/'public/vendor/pdfjs'/name).read_bytes())
  body=self.ok(self.visitor.request('pdf-engine.php?path=../../config.php'));self.assertNotIn(h.Integration.password.encode(),body)
 def test_14_public_pdf_preview_uses_engine_and_private_is_hidden(self):
  f=self.ok(self.admin.upload('upload','Essai.pdf',b'%PDF-1.4\n% Test\n%%EOF','application/pdf'))['file'];self.ok(self.visitor.request('file-preview.php?id='+f['id']),404);self.ok(self.visitor.request('pdf-viewer.php?id='+f['id']),404)
  page=self.page('PDF public',[{'type':'fileBlock','attrs':{'fileId':f['id'],'mode':'download'}}]);self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}));html=self.ok(self.visitor.request('file-preview.php?id='+f['id'])).decode();self.assertIn('data-version="0.15.0"',html);self.assertIn('pdf-viewer.js?v=0.15.0',html);media=self.visitor.request(f['url'],headers={'Range':'bytes=0-7'});self.ok(media,206);self.assertEqual(media[1],b'%PDF-1.4')
 def test_15_attachment_card_has_separate_actions_and_escaped_name(self):
  f=self.ok(self.admin.upload('upload','Notes <exemple>.txt',b'Notes','text/plain'))['file'];page=self.page('Pièce jointe',[{'type':'fileBlock','attrs':{'fileId':f['id'],'mode':'download'}}]);self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}));html=self.ok(self.visitor.request('index.php?page='+page['id']+'&read=1')).decode();self.assertIn('attachment-caption',html);self.assertIn('attachment-info',html);self.assertIn('attachment-actions',html);self.assertIn('Notes &lt;exemple&gt;.txt',html);self.assertNotIn('<exemple>',html);self.assertIn('aria-label="Télécharger ',html)
 def test_16_cover_zoom_roundtrip_and_public_geometry(self):
  import base64
  image=self.ok(self.admin.upload('upload','Pixel.png',base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6xZ0AAAAASUVORK5CYII='),'image/png'))['file'];page=self.page('Couverture zoomée');page=self.ok(self.admin.api('save',{**page,'cover_id':image['id'],'cover_position':{'x':23,'y':78,'zoom':1.75}}))['page'];self.assertEqual(page['cover_position'],{'x':23,'y':78,'zoom':1.75});self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}));html=self.ok(self.visitor.request('index.php?page='+page['id']+'&read=1')).decode();self.assertIn('transform:scale(1.75)',html);self.assertIn('transform-origin:23% 78%',html)
  space=self.ok(self.admin.api('save_space',{'name':'Carnet de zoom','cover_id':image['id'],'cover_position':{'x':-20,'y':130,'zoom':9}}));selected=next(x for x in space['spaces'] if x['id']==space['id']);self.assertEqual(selected['cover_position'],{'x':0,'y':100,'zoom':3})
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
