#!/usr/bin/env python3
"""Editable visitor homepage and persisted linked views, using a disposable installation."""
import importlib.util,io,json,pathlib,unittest,zipfile
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('feuillet_home_harness',HERE/'smoke.py');harness=importlib.util.module_from_spec(spec);spec.loader.exec_module(harness)
class Homepage(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  harness.Integration.setUpClass();cls.admin=harness.Integration.admin;cls.visitor=harness.Integration.visitor
 @classmethod
 def tearDownClass(cls):harness.Integration.tearDownClass()
 def ok(self,response,status=200):self.assertEqual(response[0],status,response[1]);return response[1]
 def page(self,title,content=None):return self.ok(self.admin.api('save',{'title':title,'content':{'type':'doc','content':content or [{'type':'paragraph'}]}}))['page']
 def publish(self,p):return self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
 def html(self,client=None,path='index.php?read=1'):return self.ok((client or self.visitor).request(path)).decode()
 def test_01_home_creation_permissions_and_empty_manual_gallery(self):
  self.ok(self.visitor.api('homepage',{'create':True}),401)
  self.ok(self.admin.api('homepage',{'create':True},authenticated=False),403)
  self.ok(self.admin.api('homepage'),405)
  result=self.ok(self.admin.api('homepage',{'create':True}));p=result['page'];type(self).home=p
  self.assertEqual(p['visibility'],'private');self.assertEqual(result['homepage']['id'],p['id'])
  gallery=next(n for n in p['content']['content'] if n['type']=='gallery');self.assertTrue(gallery['attrs']['manual']);self.assertEqual(gallery['attrs']['pageIds'],[])
  self.assertNotIn('homepage',self.ok(self.visitor.api('settings')))
  for client in [self.admin,self.visitor]:self.assertIn('pas encore publiée',self.html(client));self.assertNotIn(p['title'],self.html(client))
 def test_02_published_home_snapshot_and_all_texts(self):
  p=self.home;p.update(title='ACCUEIL_PERSONNALISE',description='Sous-titre personnalisé',content={'type':'doc','content':[{'type':'heading','attrs':{'level':2},'content':[{'type':'text','text':'MA_SECTION_PERSONNALISEE'}]}]})
  p=self.ok(self.admin.api('save',p))['page'];p=self.publish(p);type(self).home=p
  html=self.html();self.assertIn('ACCUEIL_PERSONNALISE',html);self.assertIn('MA_SECTION_PERSONNALISEE',html);self.assertIn('Sous-titre personnalisé',html);self.assertIn('class="brand-symbol"',html);self.assertIn('f.</span>',html)
  p['title']='BROUILLON_ACCUEIL_SECRET';p['description']='BROUILLON_DESCRIPTION';p=self.ok(self.admin.api('save',p))['page'];type(self).home=p
  for client in [self.admin,self.visitor]:
   html=self.html(client);self.assertIn('ACCUEIL_PERSONNALISE',html);self.assertNotIn('BROUILLON_ACCUEIL_SECRET',html);self.assertNotIn('BROUILLON_DESCRIPTION',html)
 def test_03_manual_gallery_order_and_exclusion(self):
  a=self.publish(self.page('PUBLIC_A'));b=self.publish(self.page('PUBLIC_B'));secret=self.page('SECRET_GALLERY_PAGE');outside=self.publish(self.page('PUBLIC_NOT_CHOSEN'))
  p=self.home;p['content']={'type':'doc','content':[{'type':'gallery','attrs':{'title':'Ordre choisi','manual':True,'pageIds':[b['id'],secret['id'],a['id']],'columns':2,'rows':0}}]}
  p=self.ok(self.admin.api('save',p))['page'];p=self.publish(p);type(self).home=p
  html=self.html();self.assertLess(html.index('PUBLIC_B'),html.index('PUBLIC_A'));self.assertNotIn('SECRET_GALLERY_PAGE',html);self.assertNotIn('PUBLIC_NOT_CHOSEN',html)
 def test_04_private_deleted_and_cleared_home(self):
  p=self.home;self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}));self.assertIn('pas encore publiée',self.html(self.admin))
  p=self.ok(self.admin.api('page',query='&id='+p['id']))['page'];p=self.publish(p)
  self.ok(self.admin.api('trash',{'id':p['id']}));self.assertIn('pas encore publiée',self.html());self.ok(self.admin.api('homepage',{'id':None}));self.assertIsNone(self.ok(self.admin.api('settings'))['homepage']['id'])
  self.ok(self.admin.api('homepage',{'id':'does-not-exist'}),404)
 def test_05_linked_views_filter_sort_hide_and_layout(self):
  db=self.ok(self.admin.api('db_save',{'name':'Vues partagées','visibility':'public'}))['database']
  title=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Nom','type':'title'}))['property'];number=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Quantité','type':'number'}))['property'];other=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Note masquée','type':'text'}))['property']
  for name,num in [('POUR_TRI_A',3),('POUR_TRI_B',9),('HORS_FILTRE',1)]:self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:name,number['id']:num,other['id']:'TEXTE_MASQUE_VUE'}}))
  cfg={'layout':'table','filters':[{'propertyId':number['id'],'operator':'gte','value':3}],'sort':{'propertyId':number['id'],'direction':'desc'},'hiddenPropertyIds':[other['id']]}
  p=self.publish(self.page('VUE_ORDONNEE',[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':cfg}}]));html=self.html(path='index.php?page='+p['id']+'&read=1');self.assertLess(html.index('POUR_TRI_B'),html.index('POUR_TRI_A'));self.assertNotIn('HORS_FILTRE',html);self.assertNotIn('TEXTE_MASQUE_VUE',html)
  cfg['layout']='gallery';q=self.publish(self.page('VUE_GALERIE',[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':cfg}}]));html=self.html(path='index.php?page='+q['id']+'&read=1');self.assertIn('database-reader-gallery',html);self.assertIn('POUR_TRI_B',html)
  cfg['layout']='chart';r=self.publish(self.page('VUE_GRAPHIQUE',[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':cfg}}]));self.assertIn('database-reader-chart',self.html(path='index.php?page='+r['id']+'&read=1'))
  self.assertEqual(len(self.ok(self.visitor.api('public_db_get',query='&id='+db['id']))['rows']),3,'Filtering is presentation, not access control')
 def test_06_home_backup_remaps_but_stays_private(self):
  p=self.publish(self.page('Accueil sauvegardé'));self.ok(self.admin.api('homepage',{'id':p['id']}))
  archive=self.ok(self.admin.api('export'));manifest=json.loads(zipfile.ZipFile(io.BytesIO(archive)).read('manifest.json'));self.assertEqual(manifest['settings']['homepage_id'],p['id'])
  result=self.ok(self.admin.upload('import','sauvegarde.zip',archive,'application/zip',{'apply_settings':'true'}));home=self.ok(self.admin.api('settings'))['homepage'];self.assertNotEqual(home['id'],p['id']);self.assertEqual(home['title'],p['title']);self.assertFalse(home['published']);self.assertIn('pas encore publiée',self.html())
if __name__=='__main__':unittest.main(argv=[__file__,*harness.REMAINING],verbosity=2)
