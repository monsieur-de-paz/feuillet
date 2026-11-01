#!/usr/bin/env python3
import importlib.util,pathlib,unittest,base64
HERE=pathlib.Path(__file__).resolve().parent
s=importlib.util.spec_from_file_location('lazy_h',HERE/'smoke.py');h=importlib.util.module_from_spec(s);s.loader.exec_module(h)
class Videos(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.a=h.Integration.admin;cls.v=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def test_01_no_video_source_before_click_and_poster_access(self):
  video=self.ok(self.a.upload('upload','Video.mp4',b'Fake safe test video','video/mp4'))['file'];poster=self.ok(self.a.upload('upload','Miniature.png',base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6xZ0AAAAASUVORK5CYII='),'image/png'))['file']
  blocks=[{'type':'fileBlock','attrs':dict(fileId=video['id'],mode='video',posterId=poster['id'] if i==0 else '')} for i in range(3)]
  page=self.ok(self.a.api('save',{'title':'Trois vidéos','content':{'type':'doc','content':blocks}}))['page'];self.ok(self.v.request(poster['url']),404);self.ok(self.a.api('publish',{'id':page['id'],'version':page['version']}));html=self.ok(self.v.request('index.php?page='+page['id']+'&read=1')).decode();self.assertNotIn('<video',html);self.assertEqual(html.count('data-video-src='),3);self.assertIn('video-lazy.js',html);self.assertIn('video-placeholder.svg',html);self.ok(self.v.request(poster['url']));preview=self.ok(self.v.request('file-preview.php?id='+video['id'])).decode();self.assertIn('preload="none"',preview)
  target=self.ok(self.a.api('save',{'title':'Copie vidéo'}))['page'];copy=self.ok(self.a.api('blocks_copy',{'id':target['id'],'version':target['version'],'content':{'type':'doc','content':[blocks[0]]},'paths':[[0]]}))['page'];attrs=copy['content']['content'][0]['attrs'];self.assertNotEqual(attrs['posterId'],poster['id']);self.assertNotEqual(attrs['fileId'],video['id']);self.ok(self.v.request('media.php?id='+attrs['posterId']),404)
 def test_02_poster_must_be_image(self):
  f=self.ok(self.a.upload('upload','Texte.txt',b'Test','text/plain'))['file'];self.ok(self.a.api('save',{'title':'Invalide','content':{'type':'doc','content':[{'type':'fileBlock','attrs':{'fileId':f['id'],'posterId':f['id']}}]}}),400)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
