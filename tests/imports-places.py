#!/usr/bin/env python3
"""Isolated document import, map embedding and admin-home access checks."""
import importlib.util,pathlib,unittest,json
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('import_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Features(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def imported(self,name,data):return self.ok(self.admin.upload('import_document',name,data,'application/octet-stream'))['page']
 def test_01_txt_literal_lines_and_private(self):
  p=self.imported('Notes.txt','Bonjour\nDeux lignes\n\n<script>alert(1)</script>'.encode());self.assertEqual(p['title'],'Notes');self.assertEqual(p['visibility'],'private');self.assertEqual(p['content']['content'][0]['content'][1]['type'],'hardBreak');self.ok(self.visitor.api('page',query='&id='+p['id']),404)
 def test_02_utf16_and_markdown(self):
  p=self.imported('Été.txt','Été ☀'.encode('utf-16'));self.assertIn('Été',json.dumps(p['content'],ensure_ascii=False));md=self.imported('Cours.markdown','# Mon cours\n\n**Fort**'.encode());self.assertEqual(md['title'],'Mon cours');self.assertEqual(md['content']['content'][0]['content'][0]['marks'][0]['type'],'bold')
 def test_03_rtf_styles_unicode_and_hidden_objects(self):
  raw=r'{\rtf1\ansi\uc1 Un \b texte gras\b0\par\i Italique\i0, caf\u233? {\v SECRET_CACHE} {\pict SECRET_IMAGE} {\*\objdata SECRET_OBJET} Fin}'.encode()
  p=self.imported('Document.rtf',raw);doc=json.dumps(p['content'],ensure_ascii=False);self.assertIn('bold',doc);self.assertIn('italic',doc);self.assertIn('café',doc);self.assertNotIn('SECRET',doc)
 def test_04_rejected_inputs_and_anonymous(self):
  self.ok(self.admin.upload('import_document','invalide.rtf',b'plain','text/rtf'),400);self.ok(self.admin.upload('import_document','image.exe',b'test','text/plain'),400);self.ok(self.admin.upload('import_document','large.txt',b'x'*2097153,'text/plain'),413);self.ok(self.visitor.upload('import_document','notes.txt',b'secret','text/plain'),401)
 def test_05_map_public_safe_and_export(self):
  r=self.ok(self.admin.api('save',{'title':'Lieu','content':{'type':'doc','content':[{'type':'mapBlock','attrs':{'address':'Toulouse <script>','embedUrl':'https://evil.test/embed'}}]}}))['page'];self.assertEqual(r['content']['content'][0]['attrs']['embedUrl'],'');self.ok(self.admin.api('publish',{'id':r['id'],'version':r['version']}));html=self.ok(self.visitor.request('index.php?page='+r['id']+'&read=1')).decode();self.assertIn('maps.google.com/maps?q=',html);self.assertIn('&lt;script&gt;',html);self.assertNotIn('evil.test',html);self.assertIn('sandbox="allow-scripts',html)
  md=self.ok(self.admin.api('export_markdown',query='&id='+r['id']));restored=self.imported('retour.md',md);self.assertEqual(restored['content'],r['content'])
 def test_06_maps_only_free_embed_origins(self):
  for url,allowed in [('https://www.google.com/maps/embed?pb=example',True),('https://www.google.com/maps/embed/v1/place?key=billed',False),('https://www.google.com/maps/embed?pb=example&key=billed',False),('https://www.google.com/maps/embed?pb=example&KEY=billed',False),('https://www.google.com.evil.test/maps/embed?pb=x',False),('javascript:alert(1)',False),('https://evil@www.google.com/maps/embed?pb=x',False)]:
   p=self.ok(self.admin.api('save',{'title':'Carte','content':{'type':'doc','content':[{'type':'mapBlock','attrs':{'address':'Paris','embedUrl':url}}]}}))['page'];self.assertEqual(bool(p['content']['content'][0]['attrs']['embedUrl']),allowed)
 def test_07_home_and_logo_public_boundaries(self):
  self.ok(self.admin.api('settings',{'notebook':{'icon':'feuillet','icon_id':None}}));html=self.ok(self.visitor.request('index.php?dashboard=1')).decode();self.assertNotIn('Les idées prennent place.',html);self.assertIn('feuillet-logo',html);self.assertEqual(self.ok(self.visitor.api('pages'))['pages'],[])
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
