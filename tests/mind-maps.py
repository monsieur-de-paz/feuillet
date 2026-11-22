#!/usr/bin/env python3
import importlib.util,pathlib,unittest,copy
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('map_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Maps(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.a=h.Integration.admin;cls.v=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def map(self):return {'title':'Idées <script>alert(1)</script>','display':'preview','layout':'tree','nodes':[{'id':'root','parent':'','text':'Centre','x':0,'y':0},{'id':'branch','parent':'root','text':'Une idée','x':290,'y':0}],'links':[{'from':'branch','to':'root','color':'#123456'}]}
 def save(self,m):return self.a.api('save',{'title':'Carte test','content':{'type':'doc','content':[{'type':'mindMap','attrs':{'map':m}}]}})
 def test_round_trip_publication_and_readonly(self):
  p=self.ok(self.save(self.map()))['page'];self.ok(self.v.api('page',query='&id='+p['id']),404);self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}))
  html=self.ok(self.v.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('data-mind-map-data',html);self.assertIn('mind-map-reader.js',html);self.assertNotIn('<script>alert(1)</script>',html)
  p2=self.ok(self.a.api('page',query='&id='+p['id']))['page'];self.assertEqual(p2['content']['content'][0]['attrs']['map']['nodes'][1]['text'],'Une idée')
  self.ok(self.v.api('save',{'id':p['id'],'content':p['content']}),401)
 def test_backup_round_trip_and_independent_payload(self):
  p=self.ok(self.save(self.map()))['page'];raw=self.ok(self.a.api('export'));self.ok(self.a.upload('import','backup.zip',raw,'application/zip'))
  copies=[page for page in self.ok(self.a.api('pages'))['pages'] if page['title']=='Carte test' and page['id']!=p['id']];self.assertTrue(copies)
  restored=self.ok(self.a.api('page',query='&id='+copies[0]['id']))['page'];self.assertEqual(restored['content']['content'][0]['attrs']['map']['nodes'][0]['text'],'Centre')
  self.ok(self.a.api('save',{'title':'invalid','content':{'type':'doc','content':[{'type':'mindMap'}]}}),400)
 def test_layout_positions_survive_save_and_reload(self):
  m=self.map();m['theme']='organic';m['styleLayouts']={'cards':'radial','organic':'orbit'};m['nodes'][1]['note']='Un détail important';m['views']={'radial':{'root':{'x':12,'y':34},'branch':{'x':456,'y':789}}}
  p=self.ok(self.save(m))['page'];saved=self.ok(self.a.api('page',query='&id='+p['id']))['page']['content']['content'][0]['attrs']['map'];self.assertEqual(saved['views'],m['views']);self.assertEqual(saved['theme'],'organic');self.assertEqual(saved['styleLayouts'],m['styleLayouts']);self.assertEqual(saved['nodes'][1]['note'],'Un détail important')
  m['views']['radial']['root']['x']='invalid';self.ok(self.save(m),400)
 def test_child_rows_survive_save_and_invalid_placement_rejected(self):
  m=self.map();m['nodes'][0]['childrenSide']='above';m['nodes'][1]['row']=True
  p=self.ok(self.save(m))['page'];saved=self.ok(self.a.api('page',query='&id='+p['id']))['page']['content']['content'][0]['attrs']['map']
  self.assertEqual(saved['nodes'][0]['childrenSide'],'above');self.assertTrue(saved['nodes'][1]['row'])
  for invalid in ['sideways',{'html':'<script>'},['above']]:
   m['nodes'][0]['childrenSide']=invalid;self.ok(self.save(m),400)
 def test_scenes_and_sections_are_preserved_and_guarded(self):
  m=self.map();m['nodes'][1]['content']='Une section <script>alert(1)</script>';m['scenes']={'cards:tree':{'signature':'abc123','positions':{'root':{'x':0,'y':0},'branch':{'x':300,'y':50}}}}
  p=self.ok(self.save(m))['page'];saved=self.ok(self.a.api('page',query='&id='+p['id']))['page']['content']['content'][0]['attrs']['map'];self.assertEqual(saved['scenes'],m['scenes']);self.assertEqual(saved['nodes'][1]['content'],m['nodes'][1]['content'])
  self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}));html=self.ok(self.v.request('index.php?page='+p['id']+'&read=1')).decode();self.assertNotIn('<script>alert(1)</script>',html)
  m['scenes']['cards:tree']['positions']['root']['x']='bad';self.ok(self.save(m),400)
  m['scenes']='bad';self.ok(self.save(m),400)
 def test_media_access_and_active_payloads(self):
  f=self.ok(self.a.upload('upload','map-note.txt',b'Private map attachment','text/plain'))['file']
  m=self.map();m['nodes'][1].update({'outline':'underline','media':[{'kind':'file','fileId':f['id'],'title':'Document'},{'kind':'link','url':'https://example.com','title':'Lien'},{'kind':'video','url':'https://youtu.be/dQw4w9WgXcQ','src':'javascript:alert(1)','title':'Vidéo'}]})
  p=self.ok(self.save(m))['page'];saved=p['content']['content'][0]['attrs']['map']['nodes'][1];self.assertEqual(saved['outline'],'underline');self.assertTrue(saved['media'][2]['src'].startswith('https://www.youtube-nocookie.com/'))
  self.ok(self.v.request('media.php?id='+f['id']),404);self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}));self.ok(self.v.request('media.php?id='+f['id']))
  m['nodes'][1]['media']=[{'kind':'link','url':'javascript:alert(1)'}];self.ok(self.save(m),400)
  m['nodes'][1]['media']=[{'kind':'form','token':'<script>'}];self.ok(self.save(m),400)
 def test_reject_cycles_and_broken_refs_and_active_urls(self):
  for patch in ['cycle','missing','duplicate','overflow']:
   m=self.map()
   if patch=='cycle':m['nodes'][0]['parent']='branch'
   if patch=='missing':m['links'][0]['to']='absent'
   if patch=='duplicate':m['nodes'][1]['id']='root'
   if patch=='overflow':m['nodes']=m['nodes']*200
   self.ok(self.save(m),400)
  m=self.map();m['nodes'][0].update({'url':'javascript:alert(1)','fill':'url(javascript:alert(1))'})
  p=self.ok(self.save(m))['page'];n=p['content']['content'][0]['attrs']['map']['nodes'][0];self.assertEqual(n['url'],'');self.assertEqual(n['fill'],'#E4EEE8')
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
