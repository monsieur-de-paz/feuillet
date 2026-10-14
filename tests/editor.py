#!/usr/bin/env python3
"""Collapsible headings: schema validation, public rendering, exports and revisions."""
import importlib.util,pathlib,unittest,json
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('editor_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Editor(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def toggle(self,level,title='Un titre',body='CONTENU_DEPLIABLE'):
  return {'type':'toggleHeading','content':[{'type':'heading','attrs':{'level':level},'content':[{'type':'text','text':title,'marks':[{'type':'bold'}]}]},{'type':'paragraph','content':[{'type':'text','text':body}]}]}
 def page(self,blocks):return self.ok(self.admin.api('save',{'title':'Test éditeur','content':{'type':'doc','content':blocks}}))['page']
 def test_01_three_levels_private_and_public(self):
  p=self.page([self.toggle(i,f'TITRE_{i}') for i in [1,2,3]])
  self.ok(self.visitor.api('page',query='&id='+p['id']),404)
  self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))
  html=self.ok(self.visitor.request('index.php?page='+p['id']+'&read=1')).decode()
  self.assertEqual(html.count('<details class="toggle-heading">'),3)
  for i in [1,2,3]:self.assertIn(f'<summary><h{i}><strong>TITRE_{i}</strong></h{i}></summary>',html)
  self.assertEqual(html.count('CONTENU_DEPLIABLE'),3)
  self.assertNotIn('floating-insert',html)
 def test_02_nested_content_retained(self):
  block=self.toggle(1);block['content'].append(self.toggle(3,'Titre enfant','CONTENU_ENFANT'))
  p=self.page([block]);self.assertEqual(p['content']['content'][0]['content'][2]['type'],'toggleHeading')
  self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))
  html=self.ok(self.visitor.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('CONTENU_ENFANT',html)
 def test_03_markdown_roundtrip(self):
  p=self.page([self.toggle(i) for i in [1,2,3]])
  raw=self.ok(self.admin.api('export_markdown',query='&id='+p['id']))
  self.assertIn(b'### **Un titre**',raw)
  restored=self.ok(self.admin.upload('import_markdown','retour.md',raw,'text/markdown'))['page']
  self.assertEqual(restored['content'],p['content'])
 def test_04_invalid_structure_rejected(self):
  for bad in [{'type':'toggleHeading','content':[]},{'type':'toggleHeading','content':[{'type':'paragraph'},{'type':'paragraph'}]},self.toggle(7),{'type':'toggleHeading','content':[{'type':'heading','attrs':{'level':2}},{'type':'text','text':'inline'}]}]:
   self.ok(self.admin.api('save',{'title':'Invalide','content':{'type':'doc','content':[bad]}}),400)
 def test_05_title_and_body_escaped(self):
  p=self.page([self.toggle(2,'<script>alert(1)</script>','<img src=x onerror=alert(1)>')]);self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))
  html=self.ok(self.visitor.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('&lt;script&gt;',html);self.assertNotIn('<script>alert',html);self.assertNotIn('<img src=x',html)
 def test_06_snapshot_and_revision_preserve_blocks(self):
  p=self.page([self.toggle(1)]);p=self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page'];self.ok(self.admin.api('settings',{'notebook':{'auto_publish':True}}))
  p=self.ok(self.admin.api('save',{**p,'content':{'type':'doc','content':[self.toggle(3,'MODIFIE')]}}))['page']
  public=self.ok(self.visitor.api('page',query='&id='+p['id']))['page'];self.assertEqual(public['content'],p['content'])
  history=self.ok(self.admin.api('history',query='&id='+p['id']))['history'];old=next(r for r in history if int(r['version'])==1)
  restored=self.ok(self.admin.api('restore_revision',{'id':p['id'],'version':p['version'],'revision_id':old['id']}))['page'];self.assertEqual(restored['content']['content'][0]['content'][0]['attrs']['level'],1)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
