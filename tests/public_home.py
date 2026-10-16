#!/usr/bin/env python3
"""Editable public root, explicit page selection and isolated share branches."""
import importlib.util,pathlib,unittest,json,io,zipfile,re
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('home_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class PublicHome(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def setUp(self):self.ok(self.admin.api('public_home',{'page_id':None}));self.ok(self.admin.api('settings',{'notebook':{'auto_publish':False}}))
 def page(self,title,parent=None):return self.ok(self.admin.api('save',{'title':title,'parent_id':parent}))['page']
 def publish(self,p):return self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
 def html(self,path='index.php?read=1',client=None):return self.ok((client or self.visitor).request(path)).decode()
 def test_01_permissions_create_once_and_private_draft(self):
  self.ok(self.visitor.api('public_home'),401);self.ok(self.visitor.api('public_home',{'create':True}),401);self.ok(self.admin.api('public_home',{'create':True},authenticated=False),403)
  first=self.ok(self.admin.api('public_home',{'create':True}));self.assertFalse(first['published']);self.assertEqual(first,self.ok(self.admin.api('public_home',{'create':True})));self.assertNotIn('Bienvenue dans cet espace',self.html());self.assertEqual(self.html().count('>Administration</a>'),1)
  self.ok(self.admin.api('public_home',{'page_id':'bad'}),400)
 def test_02_root_only_published_snapshot_and_polling(self):
  p=self.page('ACCUEIL_PUBLIE');self.ok(self.admin.api('public_home',{'page_id':p['id']}));self.assertNotIn(p['title'],self.html());p=self.publish(p);self.assertIn(p['title'],self.html());state=self.ok(self.visitor.request('reader-state.php'));self.assertIn(p['title'],state['html']);self.assertIn('reader-header-actions',state['header']);self.assertEqual(state['header'].count('>Administration</a>'),1)
  p=self.ok(self.admin.api('save',{**p,'title':'BROUILLON_HOME_SECRET'}))['page'];self.assertNotIn('BROUILLON_HOME_SECRET',self.html(client=self.admin));self.assertEqual(self.ok(self.visitor.request('reader-state.php?token='+state['token'])),{'token':state['token']})
  self.publish(p);updated=self.ok(self.visitor.request('reader-state.php?token='+state['token']));self.assertIn('BROUILLON_HOME_SECRET',updated['html']);self.assertNotEqual(updated['token'],state['token'])
 def test_03_explicit_cards_and_separate_share_roots(self):
  home=self.page('HOME_CHOISIE');chosen=self.publish(self.page('CARTE_CHOISIE'));other=self.publish(self.page('AUTRE_GROUPE_MASQUE'));private=self.page('NOTE_PRIVEE_MASQUEE')
  doc={'type':'doc','content':[{'type':'gallery','attrs':{'manual':True,'pageIds':[chosen['id'],other['id'],private['id']],'title':'Sélection'}},{'type':'pageLink','attrs':{'pageId':chosen['id'],'label':'ancien'}}]}
  # Only choose one public card; a private reference must stay invisible.
  doc['content'][0]['attrs']['pageIds']=[chosen['id'],private['id']];home=self.ok(self.admin.api('save',{**home,'content':doc}))['page'];self.ok(self.admin.api('public_home',{'page_id':home['id']}));self.publish(home)
  html=self.html();self.assertIn(chosen['title'],html);self.assertNotIn(other['title'],html);self.assertNotIn(private['title'],html);self.assertIn('root='+chosen['id'],html)
  pages=self.ok(self.visitor.api('pages'))['pages'];self.assertEqual({p['id'] for p in pages},{home['id'],chosen['id']});self.ok(self.visitor.api('page',query='&id='+other['id']+'&root='+home['id']),404)
  shared=self.html('index.php?page='+chosen['id']+'&read=1');self.assertNotIn(home['title'],shared);self.assertNotIn(other['title'],shared)
 def test_04_disable_delete_and_unavailable_page_login_only_in_header(self):
  p=self.publish(self.page('HOME_A_RETIRER'));self.ok(self.admin.api('public_home',{'page_id':p['id']}));self.ok(self.admin.api('public_home',{'page_id':None}));self.assertNotIn(p['title'],self.html());self.assertIn(p['title'],self.html('index.php?page='+p['id']))
  self.ok(self.admin.api('public_home',{'page_id':p['id']}));self.ok(self.admin.api('trash',{'id':p['id']}));self.assertNotIn(p['title'],self.html());r=self.visitor.request('index.php?page='+p['id']);self.ok(r,404);html=r[1].decode();self.assertEqual(html.count('>Administration</a>'),1);self.assertNotIn('Administration',html.split('</header>',1)[1].split('<footer',1)[0])
 def test_05_backup_remaps_home_without_publishing_import(self):
  p=self.publish(self.page('HOME_SAUVEGARDEE'));self.ok(self.admin.api('public_home',{'page_id':p['id']}));raw=self.ok(self.admin.api('export'));m=json.loads(zipfile.ZipFile(io.BytesIO(raw)).read('manifest.json'));self.assertEqual(m['settings']['public_home_id'],p['id'])
  self.ok(self.admin.upload('import','archive.zip',raw,'application/zip'));self.assertEqual(self.ok(self.admin.api('public_home'))['page_id'],p['id'])
  self.ok(self.admin.upload('import','archive.zip',raw,'application/zip',{'apply_settings':'true'}));state=self.ok(self.admin.api('public_home'));self.assertNotEqual(state['page_id'],p['id']);self.assertFalse(state['published']);self.assertNotIn(p['title'],self.html())
 def test_06_credit_version_and_header_persist_in_poll_response(self):
  p=self.publish(self.page('Crédit'));html=self.html('index.php?page='+p['id']);version=self.ok(self.admin.api('session'))['version'];self.assertIn('Feuillet '+version+'</a>',html);self.assertIn('créé par Monsieur de PAZ, enseignant en France.',html);self.assertNotIn('Sandro de PAZ',html)
  state=self.ok(self.visitor.request('reader-state.php?page='+p['id']));self.assertIn('reader-header-actions',state['header']);self.assertIn('Administration',state['header']);self.assertNotIn('Administration',state['html'])
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
