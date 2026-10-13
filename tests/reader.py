#!/usr/bin/env python3
"""Public polling tokens, gallery presentation and access revocation in an isolated install."""
import importlib.util,pathlib,unittest
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('reader_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Reader(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def page(self,title,content=None):return self.ok(self.admin.api('save',{'title':title,'content':{'type':'doc','content':content or [{'type':'paragraph'}]}}))['page']
 def publish(self,p):return self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
 def state(self,p,token='',client=None):return self.ok((client or self.visitor).request('reader-state.php?page='+p['id']+'&token='+token))
 def test_01_snapshot_and_token_no_unchanged_html(self):
  p=self.publish(self.page('PAGE_VISIBLE'));state=self.state(p);self.assertIn('PAGE_VISIBLE',state['html']);self.assertEqual(len(state['token']),64)
  unchanged=self.state(p,state['token']);self.assertEqual(unchanged,{'token':state['token']})
  p['title']='BROUILLON_NON_PUBLIE';self.ok(self.admin.api('save',p));state2=self.state(p,state['token']);self.assertEqual(state2,{'token':state['token']})
  state3=self.state(p,client=self.admin);self.assertNotIn('BROUILLON_NON_PUBLIE',state3['html']);self.assertIn('PAGE_VISIBLE',state3['html'])
 def test_02_auto_changes_and_private_revocation(self):
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish':True}}));p=self.publish(self.page('AVANT_AUTO'));state=self.state(p)
  p=self.ok(self.admin.api('save',{**p,'title':'APRES_AUTO'}))['page'];changed=self.state(p,state['token']);self.assertNotEqual(changed['token'],state['token']);self.assertIn('APRES_AUTO',changed['html'])
  self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}));hidden=self.state(p,changed['token'],self.admin);self.assertTrue(hidden['unavailable']);self.assertNotIn('APRES_AUTO',hidden['html']);self.assertIn('Page indisponible',hidden['html'])
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish':False}}))
 def test_03_gallery_same_classes_ratio_order_and_more(self):
  a=self.publish(self.page('CARTE_PREMIERE'));b=self.publish(self.page('CARTE_DEUXIEME'));secret=self.page('CARTE_PRIVEE')
  p=self.publish(self.page('Galerie',[{'type':'gallery','attrs':{'manual':True,'pageIds':[b['id'],secret['id'],a['id']],'columns':1,'rows':1,'aspect':'3/4','title':'Portraits'}}]));state=self.state(p);html=state['html']
  self.assertIn('gallery-block gallery-v2 layout-grid',html);self.assertIn('gallery-card-main',html);self.assertIn('gallery-placeholder',html);self.assertIn('--gallery-aspect:3/4',html);self.assertIn('--gallery-columns:1',html);self.assertLess(html.index('CARTE_DEUXIEME'),html.index('CARTE_PREMIERE'));self.assertNotIn('CARTE_PRIVEE',html);self.assertIn('data-gallery-toggle',html);self.assertIn('hidden data-gallery-extra',html)
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish':True}}));a=self.ok(self.admin.api('save',{**a,'title':'CARTE_RENOMMEE'}))['page'];updated=self.state(p,state['token']);self.assertIn('CARTE_RENOMMEE',updated['html'])
 def test_04_database_visible_changes_but_private_answers_no_token(self):
  db=self.ok(self.admin.api('db_save',{'name':'Base publique','visibility':'public'}))['database'];prop=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Nom','type':'title'}))['property'];row=self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{prop['id']:'FICHE_INITIALE'}}))['row'];zero=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Zéro','type':'number'}))['property'];row=self.ok(self.admin.api('row_patch',{'id':row['id'],'property_id':zero['id'],'version':row['version'],'value':0}))['row'];p=self.publish(self.page('Une base',[{'type':'databaseView','attrs':{'dbId':db['id']}},{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':{'layout':'gallery'}}}]));state=self.state(p);self.assertIn('<strong>Zéro</strong><p>0</p>',state['html'])
  self.ok(self.admin.api('row_patch',{'id':row['id'],'property_id':prop['id'],'version':row['version'],'value':'FICHE_MODIFIEE'}));changed=self.state(p,state['token']);self.assertIn('FICHE_MODIFIEE',changed['html'])
  self.ok(self.admin.api('row_save',{'db_id':db['id'],'visibility':'private','values':{prop['id']:'REPONSE_PRIVEE_SECRETE'}}));same=self.state(p,changed['token']);self.assertEqual(same,{'token':changed['token']})
 def test_05_empty_home_brand_and_theme_controls(self):
  n=self.ok(self.admin.api('settings'))['notebook'];self.ok(self.admin.api('settings',{'notebook':{**n,'icon':'lucide:book-open:#2563EB'}}));state=self.ok(self.visitor.request('reader-state.php'));self.assertIn('icons.svg#book-open',state['breadcrumbs']);self.assertIn('#2563EB',state['breadcrumbs']);html=self.ok(self.visitor.request('index.php?read=1')).decode();self.assertIn('theme-toggle.css',html);self.assertIn('theme.js',html);self.assertIn('data-theme-main',html)
  self.ok(self.visitor.request('reader-state.php',{},method='POST'),405)
if __name__=='__main__':unittest.main(argv=[__file__,*h.REMAINING],verbosity=2)
