#!/usr/bin/env python3
"""Atomic inline database creation and its existing access boundary, on disposable data."""
import importlib.util,pathlib,unittest,sqlite3
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('workbench_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Workbench(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def test_01_authenticated_post_only(self):
  self.ok(self.visitor.api('db_create',{'name':'Denied'}),401)
  self.ok(self.admin.api('db_create'),405)
  self.ok(self.admin.request('api.php?action=db_create',{'name':'Denied'},{'X-CSRF-Token':'wrong'}),403)
 def test_02_create_private_table_with_a_title_property(self):
  result=self.ok(self.admin.api('db_create',{'name':'  Ma première base  ','visibility':'public','properties':[{'name':'untrusted'}]}))['database']
  self.assertEqual(result['name'],'Ma première base');self.assertEqual(result['visibility'],'private')
  bundle=self.ok(self.admin.api('db_get',query='&id='+result['id']));self.assertEqual(bundle['rows'],[]);self.assertEqual(len(bundle['properties']),1)
  self.assertEqual(bundle['properties'][0]['type'],'title');self.assertEqual(bundle['properties'][0]['name'],'Nom');self.assertFalse(bundle['properties'][0]['required'])
  self.ok(self.visitor.api('public_db_get',query='&id='+result['id']),404)
 def test_03_invalid_names_do_not_create_orphans(self):
  before=len(self.ok(self.admin.api('db_list'))['databases'])
  for name in ['', '  ', None, [], {}]:self.ok(self.admin.api('db_create',{'name':name}),400)
  self.assertEqual(len(self.ok(self.admin.api('db_list'))['databases']),before)
 def test_04_names_are_data_not_sql_or_markup(self):
  name="Notes'); DROP TABLE collections; -- <script>alert(1)</script>"
  d=self.ok(self.admin.api('db_create',{'name':name}))['database'];self.assertEqual(d['name'],name)
  bundle=self.ok(self.admin.api('db_get',query='&id='+d['id']));title=bundle['properties'][0]
  row=self.ok(self.admin.api('row_save',{'db_id':d['id'],'values':{title['id']:'Ressource'}}))['row']
  edited=self.ok(self.admin.api('row_patch',{'id':row['id'],'version':row['version'],'property_id':title['id'],'value':'Modifiée'}))['row']
  self.assertEqual(edited['values'][title['id']],'Modifiée')
  self.ok(self.admin.api('row_patch',{'id':row['id'],'version':row['version'],'property_id':title['id'],'value':'Stale'}),409)
  self.ok(self.admin.api('db_list'))
 def test_05_property_failure_rolls_back_creation(self):
  if h.ARGS.mysql:self.skipTest('SQLite failure injection; normal creation is tested on both engines')
  before=len(self.ok(self.admin.api('db_list'))['databases']);path=h.Integration.install/'storage/feuillet.sqlite'
  with sqlite3.connect(path) as db:db.execute("CREATE TRIGGER owned_creation_failure BEFORE INSERT ON collection_properties BEGIN SELECT RAISE(ABORT,'controlled property failure'); END")
  try:self.ok(self.admin.api('db_create',{'name':'Atomic rollback'}),500)
  finally:
   with sqlite3.connect(path) as db:db.execute('DROP TRIGGER owned_creation_failure')
  self.assertEqual(len(self.ok(self.admin.api('db_list'))['databases']),before)
 def test_06_public_table_semantics_and_private_rows(self):
  db=self.ok(self.admin.api('db_create',{'name':'Reader table'}))['database'];title=self.ok(self.admin.api('db_get',query='&id='+db['id']))['properties'][0]
  self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:'Visible row'},'visibility':'public'}))
  self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{title['id']:'PRIVATE_SENTINEL'},'visibility':'private'}))
  self.ok(self.admin.api('db_save',{**db,'visibility':'public'}))
  p=self.ok(self.admin.api('save',{'title':'A table','content':{'type':'doc','content':[{'type':'databaseView','attrs':{'dbId':db['id']}}]}}))['page'];self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))
  html=self.ok(self.visitor.request('index.php?read=1&page='+p['slug'])).decode()
  self.assertIn('database-workbench.css',html);self.assertIn('role="region" aria-label="Tableau : Reader table"',html);self.assertIn('<caption class="database-visually-hidden">Reader table</caption>',html);self.assertIn('<th scope="row">Visible row</th>',html);self.assertNotIn('PRIVATE_SENTINEL',html)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
