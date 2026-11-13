#!/usr/bin/env python3
"""Saved web-video inventory and independent reuse in an owned installation."""
import importlib.util, pathlib, unittest, uuid
spec=importlib.util.spec_from_file_location('video_library_harness',pathlib.Path(__file__).with_name('smoke.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class VideoLibrary(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def block(self,url,title=''):return {'type':'webVideo','attrs':{'url':url,'title':title,'src':'https://forged.example/unsafe'}}
 def page(self,title,blocks):return self.ok(self.admin.api('save',{'title':title,'content':{'type':'doc','content':blocks}}))['page']
 def inventory(self):return self.ok(self.admin.api('library_videos'))
 def test_01_canonical_sources_nested_blocks_and_duplicate_pages(self):
  first='https://youtu.be/C9pN5DRZ-4E?t=18';second='https://www.youtube.com/watch?v=C9pN5DRZ-4E&start=18&utm_source=example'
  a=self.page('Vidéos privées A',[{'type':'columns','content':[{'type':'column','content':[self.block(first,'Électricité et énergie'),self.block(first)]}]}])
  b=self.page('Vidéos privées B',[self.block(second),self.block('https://vimeo.com/12345678/abcdef1234','Conférence'),self.block('https://www.tiktok.com/@example/video/6718335390845095173','Exemple vertical')])
  result=self.inventory();videos=result['videos'];youtube=[v for v in videos if v['src']=='https://www.youtube-nocookie.com/embed/C9pN5DRZ-4E?start=18']
  self.assertEqual(len(youtube),1);item=youtube[0];self.assertEqual(item['title'],'Électricité et énergie');self.assertEqual({p['id'] for p in item['pages']},{a['id'],b['id']});self.assertEqual(len(item['pages']),2)
  self.assertNotIn('forged',str(videos));self.assertTrue(any(v['src'].endswith('?h=abcdef1234') for v in videos));self.assertTrue(any(v['portrait'] and v['label']=='TikTok' for v in videos))
 def test_02_admin_only_read_only_and_no_http_cache(self):
  denied=self.visitor.api('library_videos');self.ok(denied,401);self.assertNotIn('videos',denied[1])
  self.ok(self.admin.api('library_videos',{}),405)
  response=self.admin.api('library_videos');self.ok(response);self.assertIn('no-store',response[2].get('Cache-Control',''))
 def test_03_published_snapshot_retained_until_private_and_trash_excluded(self):
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish':False}}))
  url='https://media.example.test/published-'+uuid.uuid4().hex+'.mp4'
  p=self.page('Vidéo encore publiée',[self.block(url,'Extrait publié')]);p=self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
  p=self.ok(self.admin.api('save',{**p,'content':{'type':'doc','content':[{'type':'paragraph'}]}}))['page']
  self.assertTrue(any(v['url']==url for v in self.inventory()['videos']))
  self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}))
  self.assertFalse(any(v['url']==url for v in self.inventory()['videos']))
  p=self.page('Vidéo retirée',[self.block(url)]);self.ok(self.admin.api('trash',{'id':p['id'],'version':p['version']}))
  self.assertFalse(any(v['url']==url for v in self.inventory()['videos']))
 def test_04_reinserted_block_is_independent_and_contains_no_inventory_metadata(self):
  url='https://media.example.test/reuse-'+uuid.uuid4().hex+'.webm'
  original=self.page('Source privée',[self.block(url,'Présentation originale')])
  video=next(v for v in self.inventory()['videos'] if v['url']==url)
  source={key:video[key] for key in ['url','src','label','kind','portrait','title']}
  target=self.page('Autre page',[{'type':'webVideo','attrs':source}]);attrs=target['content']['content'][0]['attrs']
  self.assertNotIn('pages',attrs);self.assertNotIn('id',attrs);self.assertEqual(attrs['url'],url)
  attrs['title']='Présentation indépendante';self.ok(self.admin.api('save',target))
  original=self.ok(self.admin.api('page',query='&id='+original['id']))['page'];self.assertEqual(original['content']['content'][0]['attrs']['title'],'Présentation originale')
  entry=next(v for v in self.inventory()['videos'] if v['url']==url);self.assertEqual(len(entry['pages']),2)
 def test_99_result_bound(self):
  token=uuid.uuid4().hex
  p=self.page('Inventaire volumineux',[self.block('https://media.example.test/'+token+'-'+str(i)+'.mp4') for i in range(1001)])
  result=self.inventory();self.assertEqual(len(result['videos']),1000);self.assertTrue(result['truncated'])
  self.ok(self.admin.api('trash',{'id':p['id'],'version':p['version']}))
if __name__=='__main__':unittest.main(argv=[__file__,*h.REMAINING],verbosity=2)
