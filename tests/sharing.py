#!/usr/bin/env python3
"""Independent shared roots, real notebooks and legacy backups in disposable installs."""
import importlib.util,io,json,pathlib,unittest,zipfile,re
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('sharing_harness',HERE/'smoke.py');harness=importlib.util.module_from_spec(spec);spec.loader.exec_module(harness)
class Sharing(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  harness.Integration.setUpClass();cls.admin=harness.Integration.admin;cls.visitor=harness.Integration.visitor
 @classmethod
 def tearDownClass(cls):harness.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def page(self,title,content=None,parent=None,**attrs):return self.ok(self.admin.api('save',{'title':title,'parent_id':parent,'content':{'type':'doc','content':content or [{'type':'paragraph'}]},**attrs}))['page']
 def publish(self,p):return self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
 def html(self,client=None,path='index.php?read=1'):return self.ok((client or self.visitor).request(path)).decode()
 def test_01_root_has_no_home_or_global_directory(self):
  self.publish(self.page('AUTRE_GROUPE_INVISIBLE'))
  for client in [self.admin,self.visitor]:
   html=self.html(client);self.assertIn('reader-empty',html);self.assertNotIn('AUTRE_GROUPE_INVISIBLE',html);self.assertNotIn('accueil n’est',html)
  for endpoint,key in [('pages','pages'),('spaces','spaces'),('categories','categories'),('search','pages')]:self.assertEqual(self.ok(self.visitor.api(endpoint))[key],[])
 def test_02_direct_child_is_its_own_root(self):
  parent=self.page('PARENT_NON_AFFICHE');child=self.page('RACINE_PARTAGEE',parent=parent['id']);self.publish(parent)
  html=self.html(path='index.php?page='+child['id']+'&read=1');self.assertNotIn(parent['title'],html);self.assertNotIn('index.php?read=1',html);self.assertIn('aria-current="page">RACINE_PARTAGEE',html)
  self.assertIsNone(self.ok(self.visitor.api('page',query='&id='+child['id']))['page']['parent_id'])
 def test_03_descendant_links_keep_root_and_breadcrumbs(self):
  p=self.page('RACINE');c=self.page('ENFANT',parent=p['id']);leaf=self.page('FEUILLE',parent=c['id'])
  p=self.ok(self.admin.api('save',{**p,'content':{'type':'doc','content':[{'type':'pageLink','attrs':{'pageId':c['id']}}]}}))['page'];self.publish(p)
  html=self.html(path='index.php?page='+p['id']+'&read=1');self.assertIn('&amp;root='+p['id'],html)
  html=self.html(path='index.php?page='+leaf['id']+'&read=1&root='+p['id']);crumb=re.search(r'<nav class="reader-breadcrumbs".*?</nav>',html).group();self.assertLess(crumb.index('RACINE'),crumb.index('ENFANT'));self.assertLess(crumb.index('ENFANT'),crumb.index('FEUILLE'));self.assertNotIn('index.php?read=1',crumb)
 def test_04_siblings_other_groups_and_private_pages_are_filtered(self):
  p=self.page('GROUPE_A');c=self.page('COURS_A',parent=p['id']);self.publish(p);other=self.publish(self.page('GROUPE_B_SECRET_VISUEL'))
  ids=[x['id'] for x in self.ok(self.visitor.api('pages',query='&root='+p['id']))['pages']];self.assertEqual(set(ids),{p['id'],c['id']});self.ok(self.visitor.api('page',query='&id='+other['id']+'&root='+p['id']),404)
  self.ok(self.visitor.request('index.php?page='+other['id']+'&read=1&root='+p['id']),404)
  # Published links can still be shared separately. Root is navigation, not authentication.
  self.ok(self.visitor.request('index.php?page='+other['id']+'&read=1'))
 def test_05_galleries_and_pagelinks_do_not_discover_other_groups(self):
  p=self.page('COLLECTION_A');c=self.page('CARTE_A',parent=p['id']);outside=self.publish(self.page('CARTE_B_A_MASQUER'));hidden=self.page('PRIVEE')
  p=self.ok(self.admin.api('save',{**p,'content':{'type':'doc','content':[{'type':'gallery','attrs':{'manual':True,'pageIds':[c['id'],outside['id'],hidden['id']]}},{'type':'gallery','attrs':{'manual':False}},{'type':'pageLink','attrs':{'pageId':outside['id'],'label':'LIBELLE_B_A_MASQUER'}}]}}))['page'];self.publish(p)
  html=self.html(path='index.php?page='+p['id']+'&read=1');self.assertIn('CARTE_A',html)
  for text in [outside['title'],outside['id'],hidden['title'],'LIBELLE_B_A_MASQUER']:self.assertNotIn(text,html)
  doc=self.ok(self.visitor.api('page',query='&id='+p['id']))['page'];self.assertEqual(doc['content']['content'][0]['attrs']['pageIds'],[c['id']]);self.assertNotIn(outside['id'],json.dumps(doc))
 def test_06_search_and_category_scope(self):
  a=self.ok(self.admin.api('save_space',{'name':'CARNET_A'}))['id'];b=self.ok(self.admin.api('save_space',{'name':'CARNET_B'}))['id']
  ca=self.ok(self.admin.api('save_category',{'name':'RUBRIQUE_A','space_id':a}))['id'];cb=self.ok(self.admin.api('save_category',{'name':'RUBRIQUE_B','space_id':b}))['id']
  p=self.publish(self.page('RECHERCHE_A',space_id=a,category_id=ca));self.publish(self.page('RECHERCHE_B',space_id=b,category_id=cb));q='&root='+p['id']
  self.assertEqual([x['id'] for x in self.ok(self.visitor.api('spaces',query=q))['spaces']],[a]);self.assertEqual([x['id'] for x in self.ok(self.visitor.api('categories',query=q))['categories']],[ca]);self.assertEqual([x['id'] for x in self.ok(self.visitor.api('search',query=q+'&q=RECHERCHE'))['pages']],[p['id']])
 def test_07_polling_never_reveals_other_roots(self):
  p=self.publish(self.page('POLL_A'));other=self.publish(self.page('POLL_B'));url='reader-state.php?page='+p['id']+'&root='+p['id'];state=self.ok(self.visitor.request(url))
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish':True}}));state=self.ok(self.visitor.request(url));self.ok(self.admin.api('save',{**other,'title':'POLL_B_MODIFIE'}));unchanged=self.ok(self.visitor.request(url+'&token='+state['token']));self.assertEqual(unchanged,{'token':state['token']})
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish':False}}));self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}));state=self.ok(self.visitor.request(url));self.assertTrue(state['unavailable']);self.assertNotIn('POLL_B',json.dumps(state))
 def test_08_notebook_defaults_inheritance_and_rename(self):
  p=self.page('PAGE_DANS_CARNET');self.assertTrue(p['space_id']);c=self.page('SOUS_PAGE_CARNET',parent=p['id'],space_id=None);self.assertEqual(c['space_id'],p['space_id']);cats=self.ok(self.admin.api('categories'))['categories'];self.assertTrue(all(x['space_id'] for x in cats))
  self.ok(self.admin.api('save_space',{'id':p['space_id'],'name':'RENOMME','icon':'📖'}));self.assertTrue(any(x['name']=='RENOMME' for x in self.ok(self.admin.api('spaces'))['spaces']));self.assertEqual(self.ok(self.admin.api('page',query='&id='+p['id']))['page']['space_id'],p['space_id'])
 def test_09_delete_notebook_conserves_pages_categories_and_public_snapshot(self):
  a=self.ok(self.admin.api('save_space',{'name':'A supprimer'}))['id'];b=self.ok(self.admin.api('save_space',{'name':'Destination'}))['id'];cat=self.ok(self.admin.api('save_category',{'space_id':a,'name':'RUBRIQUE_CONSERVEE'}))['id'];p=self.publish(self.page('CONTENU_CONSERVE',space_id=a,category_id=cat))
  self.ok(self.admin.api('delete_space',{'id':a,'target_id':b}));page=self.ok(self.admin.api('page',query='&id='+p['id']))['page'];self.assertEqual(page['space_id'],b);self.assertEqual(page['category_id'],cat);self.assertEqual(self.ok(self.visitor.api('page',query='&id='+p['id']))['page']['space_id'],b);self.assertEqual(next(c for c in self.ok(self.admin.api('categories'))['categories'] if c['id']==cat)['space_id'],b)
 def test_10_legacy_home_feature_removed_and_backup_pages_kept(self):
  self.ok(self.admin.api('homepage',{'create':True}),410);self.assertNotIn('homepage',self.ok(self.admin.api('settings')))
  p=self.publish(self.page('Ancien accueil ordinaire'));raw=self.ok(self.admin.api('export'));z=zipfile.ZipFile(io.BytesIO(raw));manifest=json.loads(z.read('manifest.json'));self.assertNotIn('homepage_id',manifest['settings']);manifest['settings']['homepage_id']=p['id'];buf=io.BytesIO()
  with zipfile.ZipFile(buf,'w') as out:
   for name in z.namelist():out.writestr(name,json.dumps(manifest).encode() if name=='manifest.json' else z.read(name))
  self.ok(self.admin.upload('import','ancienne.zip',buf.getvalue(),'application/zip',{'apply_settings':'true'}));copies=[x for x in self.ok(self.admin.api('pages'))['pages'] if x['title']==p['title'] and x['id']!=p['id']];self.assertTrue(copies);self.assertTrue(all(x['space_id'] and x['visibility']=='private' for x in copies));self.assertNotIn(p['title'],self.html())
 def test_11_private_root_and_forged_scope(self):
  p=self.page('RACINE_PRIVEE');self.ok(self.visitor.request('index.php?page='+p['id']+'&read=1'),404);self.ok(self.visitor.api('pages',query='&root='+p['id']),404);self.ok(self.visitor.api('pages',query='&root=invalid'),404)
  self.ok(self.visitor.request('reader-state.php?page='+p['id']+'&root=invalid')) # safe unavailable representation, no content
 def test_12_powered_by_and_editor_entry(self):
  p=self.publish(self.page('CREDIT_TEST'));html=self.html(path='index.php?page='+p['id']);self.assertIn('Propulsé par',html);self.assertIn('créé par Monsieur de PAZ, enseignant en France',html);self.assertIn('https://github.com/monsieur-de-paz/feuillet',html);self.assertIn('?edit=1&amp;page=',html);self.assertNotIn('assets/app.js',html)
  edit=self.html(path='index.php?edit=1');self.assertIn('assets/app.js',edit);self.assertNotIn('AUTRE_GROUPE_INVISIBLE',edit)
 def test_13_linked_views_filter_sort_hide_and_layout(self):
  db=self.ok(self.admin.api('db_save',{'name':'Vues partagées','visibility':'public'}))['database']
  title=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Nom','type':'title'}))['property'];number=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Quantité','type':'number'}))['property'];other=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Note masquée','type':'text'}))['property']
  for name,num in [('POUR_TRI_A',3),('POUR_TRI_B',9),('HORS_FILTRE',1)]:self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:name,number['id']:num,other['id']:'TEXTE_MASQUE_VUE'}}))
  cfg={'layout':'table','filters':[{'propertyId':number['id'],'operator':'gte','value':3}],'sort':{'propertyId':number['id'],'direction':'desc'},'hiddenPropertyIds':[other['id']]}
  p=self.publish(self.page('VUE_ORDONNEE',[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':cfg}}]));html=self.html(path='index.php?page='+p['id']+'&read=1');self.assertLess(html.index('POUR_TRI_B'),html.index('POUR_TRI_A'));self.assertNotIn('HORS_FILTRE',html);self.assertNotIn('TEXTE_MASQUE_VUE',html)
  cfg['layout']='gallery';q=self.publish(self.page('VUE_GALERIE',[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':cfg}}]));html=self.html(path='index.php?page='+q['id']+'&read=1');self.assertIn('database-reader-gallery',html);self.assertIn('POUR_TRI_B',html)
  cfg['layout']='chart';r=self.publish(self.page('VUE_GRAPHIQUE',[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':cfg}}]));self.assertIn('database-reader-chart',self.html(path='index.php?page='+r['id']+'&read=1'))
  self.assertEqual(len(self.ok(self.visitor.api('public_db_get',query='&id='+db['id']))['rows']),3,'Filtering is presentation, not access control')
 def test_14_private_intermediate_blocks_navigation_but_direct_share_remains_possible(self):
  p=self.page('Racine de test');middle=self.page('Parent intermédiaire',parent=p['id']);leaf=self.page('Sous-page publique autonome',parent=middle['id']);self.publish(p)
  middle=self.ok(self.admin.api('page',query='&id='+middle['id']))['page'];self.ok(self.admin.api('visibility',{'id':middle['id'],'version':middle['version'],'visibility':'private'}));leaf=self.ok(self.admin.api('page',query='&id='+leaf['id']))['page'];self.publish(leaf)
  self.ok(self.visitor.api('page',query='&id='+leaf['id']+'&root='+p['id']),404);self.ok(self.visitor.api('page',query='&id='+leaf['id']))
 def test_15_delete_last_notebook_creates_real_destination(self):
  spaces=self.ok(self.admin.api('spaces'))['spaces']
  for space in spaces[:-1]:self.ok(self.admin.api('delete_space',{'id':space['id']}))
  last=self.ok(self.admin.api('spaces'))['spaces'];self.assertEqual(len(last),1);p=self.page('Dernier carnet conservé',space_id=last[0]['id']);self.ok(self.admin.api('delete_space',{'id':last[0]['id']}));after=self.ok(self.admin.api('spaces'))['spaces'];self.assertEqual(len(after),1);self.assertNotEqual(after[0]['id'],last[0]['id']);self.assertEqual(self.ok(self.admin.api('page',query='&id='+p['id']))['page']['space_id'],after[0]['id']);self.assertTrue(all(c['space_id']==after[0]['id'] for c in self.ok(self.admin.api('categories'))['categories']))
 def test_16_notebook_dashboard_does_not_expose_pages_to_visitors(self):
  space=self.ok(self.admin.api('save_space',{'name':'DASHBOARD_CARNET_PRIVE','icon':'📓'}))['id'];page=self.page('PAGE_SECRETE_DU_DASHBOARD',space_id=space)
  for suffix in ['', '&read=1']:
   html=self.html(path='index.php?dashboard=1&space='+space+suffix);self.assertNotIn('DASHBOARD_CARNET_PRIVE',html);self.assertNotIn(page['title'],html);self.assertIn('reader-empty',html)
  self.assertEqual(self.ok(self.visitor.api('pages',query='&space='+space))['pages'],[])
if __name__=='__main__':unittest.main(argv=[__file__,*harness.REMAINING],verbosity=2)
