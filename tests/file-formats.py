#!/usr/bin/env python3
"""Arbitrary attachments and vector previews, access control and backup round-trip."""
import importlib.util,pathlib,unittest,json
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('formats_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
SVG=b'''<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80"><defs><linearGradient id="g"><stop stop-color="#52796c"/><stop offset="1" stop-color="#93c5fd"/></linearGradient></defs><rect width="200" height="80" fill="url(#g)"/><text x="20" y="45">Feuillet SVG</text><script>document.title='EXECUTED'</script></svg>'''
class Formats(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.a=h.Integration.admin;cls.v=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def test_01_arbitrary_extensions_and_inert_delivery(self):
  for name,data in [('programme.py',b'print("example")'),('document.HTML',b'<html><script>alert(1)</script></html>'),('source.php',b'<?php echo "EXECUTED";?>'),('model.step',b'ISO-10303-21;'),('archive.7z',b'7z\x00sample'),('LICENSE',b'Example'),('empty.custom',b'')]:
   f=self.ok(self.a.upload('upload',name,data))['file'];self.assertEqual(f['name'],name)
   body=self.a.request(f['url']);self.assertEqual(body[1],data);self.assertIn('attachment',body[2]['Content-Disposition']);self.assertEqual(body[2]['Content-Type'],'application/octet-stream');self.assertEqual(body[2]['X-Content-Type-Options'],'nosniff')
   self.ok(self.v.request(f['url']),404)
 def test_02_svg_vector_public_preview_and_xml_safety(self):
  f=self.ok(self.a.upload('upload','dessin.SVG',SVG,'image/svg+xml'))['file'];self.assertEqual(f['mime'],'image/svg+xml')
  p=self.ok(self.a.api('save',{'title':'Vector image','cover_id':f['id'],'icon_id':f['id'],'content':{'type':'doc','content':[{'type':'image','attrs':{'fileId':f['id'],'src':f['url']}}]}}))['page'];self.ok(self.a.api('publish',{'id':p['id'],'version':p['version']}))
  for suffix in ['', '&thumb=320']:
   body=self.v.request(f['url']+suffix);self.assertEqual(body[1],SVG);self.assertEqual(body[2]['Content-Type'],'image/svg+xml');self.assertIn('inline',body[2]['Content-Disposition']);self.assertIn("script-src 'none'",body[2]['Content-Security-Policy']);self.assertIn('sandbox;',body[2]['Content-Security-Policy'])
  preview=self.ok(self.v.request('file-preview.php?id='+f['id'])).decode();self.assertIn('<img src=',preview)
  for bad in [b'<svg>',b'<html/>',b'<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>']:
   self.ok(self.a.upload('upload','unsafe.svg',bad),400)
 def test_03_public_form_any_extension_stays_private_and_in_library(self):
  db=self.ok(self.a.api('db_save',{'name':'Formats'}))['database'];prop=self.ok(self.a.api('property_save',{'db_id':db['id'],'name':'Pièces jointes','type':'files','config':{}}))['property']
  form=self.ok(self.a.api('form_save',{'db_id':db['id'],'name':'Documents','fields':[prop['id']],'public':True}))['form'];ids=[]
  for name,data in [('projet.sb3',b'Blockly project'),('schema.svg',SVG)]:
   f=self.ok(self.v.upload('form_upload',name,data,fields={'token':form['token']}))['file'];ids.append(f['id']);self.ok(self.v.request(f['url']),404)
  self.ok(self.v.api('form_submit',{'token':form['token'],'values':{prop['id']:ids}}))
  listing=self.ok(self.a.api('files'));self.assertTrue(all(id in json.dumps(listing) for id in ids))
  for id in ids:self.ok(self.v.request('media.php?id='+id),404)
 def test_04_backup_preserves_arbitrary_and_vector_originals(self):
  before=self.ok(self.a.api('files'))['files'];export=self.a.api('export');archive=self.ok(export);self.ok(self.a.upload('import','backup.zip',archive,'application/zip'))
  after=self.ok(self.a.api('files'))['files'];self.assertGreater(len(after),len(before))
  for name in ['dessin.SVG','programme.py','source.php','LICENSE']:
   old=next(f for f in before if f['name']==name);copies=[f for f in after if f['name']==name and f['id']!=old['id']];self.assertTrue(copies,name)
   self.assertEqual(self.a.request(old['url'])[1],self.a.request(copies[-1]['url'])[1])
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
