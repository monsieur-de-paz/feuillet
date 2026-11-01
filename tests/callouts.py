#!/usr/bin/env python3
"""Callout text marks and optional emoji survive save and anonymous rendering."""
import importlib.util,pathlib,unittest
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('callout_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Callouts(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def test_marks_and_optional_emoji(self):
  for icon in ['', '🧑🏽‍🚀',None]:
   attrs={'tone':'gray'}
   if icon is not None:attrs['icon']=icon
   doc={'type':'doc','content':[{'type':'callout','attrs':attrs,'content':[{'type':'heading','attrs':{'level':3},'content':[{'type':'text','text':'Violet = Objectifs','marks':[{'type':'textStyle','attrs':{'color':'#9065B0'}}]}]}]}]}
   doc['content']=[{'type':'heading','attrs':{'level':level},'content':[{'type':'text','text':'Titre coloré','marks':[{'type':'textStyle','attrs':{'color':'#D44C47'}}]}]} for level in [1,2,3]]+doc['content']
   r=self.admin.api('save',{'title':'Encadré test','content':doc});self.assertEqual(r[0],200,r[1]);page=r[1]['page'];self.assertEqual(page['content'],doc)
   r=self.admin.api('publish',{'id':page['id'],'version':page['version']});self.assertEqual(r[0],200,r[1]);r=self.visitor.request('index.php?page='+page['id']+'&read=1');self.assertEqual(r[0],200);html=r[1].decode();self.assertIn('style="color:#9065B0"',html);self.assertEqual(html.count('style="color:#D44C47"'),3)
   if icon=='':self.assertNotIn('class="callout-icon"',html)
   else:self.assertIn(icon or '💡',html)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
