#!/usr/bin/env python3
"""Feuillet 0.4.1: inheritance, adaptive text, status colors and private media inventory."""
import importlib.util,pathlib,unittest,json,io,zipfile
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('workspace_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Workspace(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def setUp(self):self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':False,'auto_publish':True}}))
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def page(self,title,parent=None,content=None,**attrs):return self.ok(self.admin.api('save',{'title':title,'parent_id':parent,'content':{'type':'doc','content':content or [{'type':'paragraph'}]},**attrs}))['page']
 def publish(self,p):return self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
 def public(self,p):return self.ok(self.visitor.api('page',query='&id='+p['id']))['page']
 def test_01_shortcut_validation_and_backup(self):
  settings=self.ok(self.admin.api('settings',{'notebook':{'sidebar_shortcut':'Mod+Shift+B'}}));self.assertEqual(settings['notebook']['sidebar_shortcut'],'Mod+Shift+B')
  self.ok(self.admin.api('settings',{'notebook':{'sidebar_shortcut':'javascript:alert(1)'}}),400)
  self.ok(self.admin.api('settings',{'notebook':{'sidebar_shortcut':None}}),400)
  self.ok(self.admin.api('settings',{'notebook':{'sidebar_shortcut':''}}))
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':'true'}}),400)
 def test_02_inheritance_existing_new_nested_and_private_roots(self):
  parent=self.publish(self.page('Parent public'));child=self.page('Enfant existant',parent['id']);nested=self.page('Petit enfant',child['id']);secret=self.page('Racine privée');hidden=self.page('Enfant privé',secret['id'])
  self.ok(self.visitor.api('page',query='&id='+child['id']),404)
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':True}}));self.public(child);self.public(nested);self.ok(self.visitor.api('page',query='&id='+hidden['id']),404)
  new=self.page('Enfant nouveau',parent['id']);self.assertEqual(new['visibility'],'public');self.public(new)
  self.ok(self.admin.api('visibility',{'id':new['id'],'version':new['version'],'visibility':'private'}),400)
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':False}}));newprivate=self.page('Nouveau privé',parent['id']);self.assertEqual(newprivate['visibility'],'private')
  self.public(child) # turning off does not revoke already published pages
 def test_03_move_subtree_and_private_parent_revocation(self):
  p=self.publish(self.page('Destination publique'));root=self.page('À déplacer');child=self.page('Enfant déplacé',root['id'])
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':True}}));root=self.ok(self.admin.api('move',{'id':root['id'],'version':root['version'],'parent_id':p['id']}))['page'];self.public(root);self.public(child)
  self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}));self.ok(self.visitor.api('page',query='&id='+root['id']),404)
 def test_04_adaptive_color_old_and_explicit_marks(self):
  p=self.page('Texte adaptatif',content=[{'type':'paragraph','content':[{'type':'text','text':'DEFAUT_THEME','marks':[{'type':'bold'},{'type':'textStyle','attrs':{'color':'#37352F'}}]},{'type':'text','text':'ROUGE_FIXE','marks':[{'type':'textStyle','attrs':{'color':'#D44C47'}}]}]}]);marks=p['content']['content'][0]['content'][0]['marks'];self.assertEqual(marks,[{'type':'bold'}]);p=self.publish(p);html=self.ok(self.visitor.api('render',query='&id='+p['id']))['html'];self.assertNotIn('color:#37352F',html);self.assertIn('color:#D44C47',html)
 def test_05_status_colors_public_views_and_backup(self):
  db=self.ok(self.admin.api('db_save',{'name':'États colorés','visibility':'public'}))['database']
  prop=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'État','type':'select','config':{'options':['À faire','Terminé'],'option_colors':{'À faire':'#D44C47','Terminé':'#38795D'}}}))['property']
  row=self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{prop['id']:'À faire'}}))['row']
  p=self.publish(self.page('États intégrés',content=[{'type':'databaseView','attrs':{'dbId':db['id']}},{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':{'layout':'gallery'}}}]))
  html=self.ok(self.visitor.api('render',query='&id='+p['id']))['html'];self.assertEqual(html.count('--tag-color:#D44C47'),2)
  public=self.ok(self.visitor.api('public_db_get',query='&id='+db['id']));self.assertEqual(public['properties'][0]['config']['option_colors']['À faire'],'#D44C47')
  self.ok(self.admin.api('property_save',{'id':prop['id'],'db_id':db['id'],'version':prop['version'],'name':'État','type':'select','config':{'options':['À faire'],'option_colors':{'À faire':'red;position:fixed'}}}),400)
  status,raw,_=self.admin.api('export');self.assertEqual(status,200)
  with zipfile.ZipFile(io.BytesIO(raw)) as z:manifest=json.loads(z.read('manifest.json'));self.assertTrue(any(p['config'].get('option_colors',{}).get('À faire')=='#D44C47' for p in manifest['database_data']['properties']))
 def test_06_media_private_published_draft_history_and_unauthorized(self):
  file=self.ok(self.admin.upload('upload','usage.txt',b'MEDIA_USAGE','text/plain'))['file'];block={'type':'fileBlock','attrs':{'fileId':file['id'],'name':file['name'],'mode':'download'}}
  private=self.page('UTILISATION_PRIVEE',content=[block]);public=self.publish(self.page('UTILISATION_PUBLIQUE',content=[block]))
  usages=self.ok(self.admin.api('file_usage',query='&id='+file['id']));self.assertTrue(usages['public']);pages={u['id']:u for u in usages['usages'] if u['kind']=='page'};self.assertEqual(pages[private['id']]['visibility'],'private');self.assertTrue(pages[public['id']]['published'])
  self.ok(self.visitor.api('file_usage',query='&id='+file['id']),401)
  public=self.ok(self.admin.api('save',{**public,'content':{'type':'doc','content':[{'type':'paragraph'}]}}))['page'];usages=self.ok(self.admin.api('file_usage',query='&id='+file['id']));self.assertFalse(usages['public']);self.assertTrue(any(u['kind']=='revision' for u in usages['usages']))
  self.ok(self.admin.api('file_usage',query='&id=missing'),404)
 def test_07_media_database_form_visibility_and_usage(self):
  file=self.ok(self.admin.upload('upload','field.txt',b'FIELD_USAGE','text/plain'))['file'];db=self.ok(self.admin.api('db_save',{'name':'Dossiers privés'}))['database'];prop=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Document','type':'files','config':{}}))['property'];self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{prop['id']:[file['id']]}}));result=self.ok(self.admin.api('file_usage',query='&id='+file['id']));self.assertFalse(result['public']);usage=next(u for u in result['usages'] if u['kind']=='database');self.assertEqual(usage['visibility'],'private');self.assertEqual(usage['places'],['Document'])
 def test_08_form_files_stay_private_with_inheritance(self):
  db=self.ok(self.admin.api('db_save',{'name':'Réponses protégées','visibility':'public'}))['database'];prop=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Copie','type':'files','config':{}}))['property'];form=self.ok(self.admin.api('form_save',{'db_id':db['id'],'name':'Répondre','fields':[prop['id']],'public':True}))['form']
  self.publish(self.page('Formulaire public',content=[{'type':'databaseView','attrs':{'dbId':db['id']}},{'type':'formView','attrs':{'formId':form['id']}}]));self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':True}}))
  file=self.ok(self.visitor.upload('form_upload','copie.txt',b'COPIE_PRIVEE','text/plain',fields={'token':form['token'],'website':''}))['file'];pending=self.ok(self.admin.api('file_usage',query='&id='+file['id']));self.assertFalse(pending['public']);self.assertTrue(any(u['kind']=='pending' for u in pending['usages']))
  self.ok(self.visitor.api('form_submit',{'token':form['token'],'values':{prop['id']:[file['id']]}}));result=self.ok(self.admin.api('file_usage',query='&id='+file['id']));self.assertFalse(result['public']);record=next(u for u in result['usages'] if u['kind']=='database');self.assertTrue(record['from_form']);self.assertEqual(record['visibility'],'private');self.ok(self.visitor.request(file['url']),404)
 def test_09_gallery_indirect_usages(self):
  png=bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010804000000b51c0c020000000b4944415478da6364f80f00010501012718e3660000000049454e44ae426082')
  image=self.ok(self.admin.upload('upload','icone.png',png,'image/png'))['file'];card=self.publish(self.page('Carte illustrée',icon_id=image['id']));parent=self.publish(self.page('Galerie parent',content=[{'type':'gallery','attrs':{'manual':True,'pageIds':[card['id']]}}]));result=self.ok(self.admin.api('file_usage',query='&id='+image['id']));usage=next(u for u in result['usages'] if u['kind']=='page' and u['id']==parent['id']);self.assertIn('Carte de galerie',usage['places']);self.assertTrue(usage['published'])
 def test_10_inheritance_preserves_already_published_draft(self):
  parent=self.publish(self.page('Parent'));child=self.publish(self.page('Enfant publié',parent['id']));self.ok(self.admin.api('settings',{'notebook':{'auto_publish':False}}));child=self.ok(self.admin.api('save',{**child,'title':'BROUILLON_DEJA_PUBLIC'}))['page'];self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':True}}));self.assertNotEqual(self.public(child)['title'],'BROUILLON_DEJA_PUBLIC')
 def test_11_dark_accent_is_derived_and_source_preserved(self):
  self.ok(self.admin.api('settings',{'appearance':{'mode':'dark','background':'#17191D','text':'#EEEEF0','accent':'#112233'}}));p=self.publish(self.page('Accent adaptatif'));html=self.ok(self.visitor.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('--accent-base:#112233',html);self.assertNotIn('--accent:#112233;',html);self.assertIn('theme-colors.js?v=',html);self.assertEqual(self.ok(self.admin.api('settings'))['appearance']['accent'],'#112233')
  self.ok(self.admin.api('settings',{'appearance':{'mode':'light','accent':'#112233'}}));html=self.ok(self.visitor.request('index.php?page='+p['id']+'&read=1')).decode();self.assertIn('--accent:#112233;',html)
 def test_12_restore_respects_parent_inheritance(self):
  parent=self.publish(self.page('Parent pour restauration'));child=self.page('Enfant restauré',parent['id']);self.ok(self.admin.api('trash',{'id':child['id'],'version':child['version']}));self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':True}}));self.ok(self.visitor.api('page',query='&id='+child['id']),404);restored=self.ok(self.admin.api('restore',{'id':child['id']}))['page'];self.assertEqual(restored['visibility'],'public');self.public(restored)
  self.ok(self.admin.api('settings',{'notebook':{'auto_publish_children':False}}));self.ok(self.admin.api('trash',{'id':restored['id'],'version':restored['version']}));restored=self.ok(self.admin.api('restore',{'id':restored['id']}))['page'];self.assertEqual(restored['visibility'],'private')
if __name__=='__main__':unittest.main(argv=[__file__,*h.REMAINING],verbosity=2)
