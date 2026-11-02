import importlib.util,pathlib,unittest,subprocess
HERE=pathlib.Path(__file__).resolve().parent;s=importlib.util.spec_from_file_location('thumb_h',HERE/'smoke.py');h=importlib.util.module_from_spec(s);s.loader.exec_module(h)
class Thumbnails(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  h.Integration.setUpClass();cls.a=h.Integration.admin;cls.v=h.Integration.visitor
  cls.image=subprocess.check_output(['php','-r','$im=imagecreatetruecolor(2400,1600);for($x=0;$x<2400;$x+=4)for($y=0;$y<1600;$y+=4){$c=imagecolorallocate($im,($x*7+$y)%256,($y*3)%256,($x+$y*2)%256);imagefilledrectangle($im,$x,$y,$x+3,$y+3,$c);}imagejpeg($im,null,80);'])
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1] if isinstance(r[1],dict) else str(r[1])[:100]);return r[1]
 def test_derivatives_auth_cache_and_original(self):
  file=self.ok(self.a.upload('upload','Test.jpg',self.image,'image/jpeg'))['file'];url=file['url']+'&thumb=320'
  self.ok(self.v.request(url),404)
  r=self.a.request(url);preview=self.ok(r);self.assertLess(len(preview),len(self.image)//3);self.assertEqual(r[2]['Content-Type'],'image/webp');self.assertEqual(r[2]['Cache-Control'],'private, no-cache')
  dims=subprocess.check_output(['php','-r','$i=getimagesizefromstring(stream_get_contents(STDIN));echo $i[0]."x".$i[1];'],input=preview).decode();self.assertEqual(dims,'320x213')
  self.ok(self.a.request(url,headers={'If-None-Match':r[2]['ETag']}),304)
  self.assertEqual(self.ok(self.a.request(file['url'])),self.image)
  self.assertEqual(self.ok(self.a.request(file['url']+'&thumb=100000')),self.image)
  p=self.ok(self.a.api('save',{'title':'Publié','content':{'type':'doc','content':[{'type':'image','attrs':{'fileId':file['id']}}]}}))['page'];p=self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}))['page'];self.assertEqual(self.ok(self.v.request(url)),preview)
  p=self.ok(self.a.api('visibility',{'id':p['id'],'visibility':'private','version':p['version']}))['page'];self.ok(self.v.request(url,headers={'If-None-Match':r[2]['ETag']}),404)
 def test_subpage_design_and_columns_render_privacy(self):
  root=self.ok(self.a.api('save',{'title':'Mise en page'}))['page']
  child=self.ok(self.a.api('save',{'parent_id':root['id'],'title':'Une ressource','icon':'🧭','description':'À explorer'}))['page'];self.ok(self.a.api('publish',{'id':child['id'],'version':child['version']}))
  private=self.ok(self.a.api('save',{'title':'SECRET','parent_id':root['id']}))['page']
  link=lambda id:{'type':'pageLink','attrs':{'pageId':id,'presentation':'card','iconSize':'large','showDescription':True,'showIcon':True}}
  doc={'type':'doc','content':[{'type':'columns','attrs':{'gap':'airy','ratio':'wide-left'},'content':[{'type':'column','content':[link(child['id'])]},{'type':'column','content':[link(private['id'])]}]}]}
  p=self.ok(self.a.api('save',{**root,'content':doc}))['page'];self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}))
  private=self.ok(self.a.api('page',query='&id='+private['id']))['page'];self.ok(self.a.api('visibility',{'id':private['id'],'version':private['version'],'visibility':'private'}))
  html=self.ok(self.v.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('subpage-link presentation-card icon-large',html);self.assertIn('gap-airy ratio-wide-left',html);self.assertIn('À explorer',html);self.assertNotIn('SECRET',html)
  doc['content'][0]['attrs']={'gap':'evil"','ratio':'evil"'};doc['content'][0]['content'][0]['content'][0]['attrs']['presentation']='evil"'
  p=self.ok(self.a.api('save',{'title':'Validation','content':doc}))['page'];self.assertEqual(p['content']['content'][0]['attrs']['gap'],'comfortable');self.assertEqual(p['content']['content'][0]['content'][0]['content'][0]['attrs']['presentation'],'row')
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
