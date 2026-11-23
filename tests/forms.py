#!/usr/bin/env python3
"""Public form shell, action styling and private projection integration regression."""
import importlib.util,pathlib,unittest,json,urllib.parse
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('form_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Forms(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  h.Integration.setUpClass();cls.admin=h.Integration.admin;cls.visitor=h.Integration.visitor
  def ok(r):assert r[0]==200,r;return r[1]
  cls.db=ok(cls.admin.api('db_save',{'name':'Projection test'}))['database']
  def prop(name,type):return ok(cls.admin.api('property_save',{'db_id':cls.db['id'],'name':name,'type':type,'config':{}}))['property']
  cls.title=prop('Projet','title');cls.email=prop('Courriel privé','email');cls.file=prop('Document','files')
  cls.form=ok(cls.admin.api('form_save',{'db_id':cls.db['id'],'name':'Envoyer mon projet','fields':[cls.title['id'],cls.email['id'],cls.file['id']],'public':True}))['form']
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def projection(self,extra=''):return self.admin.api('db_projection',query='&id='+self.db['id']+extra)
 def test_01_shell_has_skeleton_instead_of_home(self):
  html=self.ok(self.visitor.request('index.php?form='+self.form['token'])).decode()
  self.assertIn('form-skeleton',html);self.assertIn('aria-busy="true"',html);self.assertIn('forms.css',html)
  self.assertNotIn('<h1',html);self.assertNotIn('reader-empty',html)
  self.assertEqual(html.count('class="reader-header"'),1)
  project=self.ok(self.visitor.request('index.php?project='+self.db['id'])).decode();self.assertIn('form-skeleton',project);self.assertNotIn('Projection test',project)
 def test_02_projection_requires_admin_and_get(self):
  self.ok(self.visitor.api('db_projection',query='&id='+self.db['id']),401)
  self.ok(self.visitor.api('db_projection',query='&id='+self.db['id']+'&token='+self.form['token']),401)
  self.ok(self.admin.api('db_projection',{'id':self.db['id']}),405)
  self.ok(self.admin.api('db_projection',query="&id="+urllib.parse.quote("' OR 1=1 --")),404)
 def test_03_submission_then_refresh_and_selected_values_only(self):
  upload=self.ok(self.visitor.upload('form_upload','private-project.txt',b'Synthetic private document','text/plain',{'token':self.form['token']}))['file']
  self.ok(self.visitor.api('form_submit',{'token':self.form['token'],'values':{self.title['id']:'Projet reçu <script>alert(1)</script>',self.email['id']:'synthetic@example.test',self.file['id']:[upload['id']]}}))
  data=self.ok(self.projection());self.assertEqual(data['total'],1);self.assertEqual(data['columns'],[self.title['id'],self.file['id']])
  self.assertEqual(list(data['rows'][0]['values']),[self.title['id'],self.file['id']]);self.assertNotIn('synthetic@example.test',json.dumps(data));self.assertEqual(data['rows'][0]['attachments'][self.file['id']][0]['id'],upload['id']);self.assertNotIn(self.form['token'],json.dumps(data))
  selected=self.ok(self.projection('&columns='+self.file['id']));self.assertEqual(selected['rows'][0]['values'],{self.file['id']:1})
  empty=self.ok(self.projection('&columns='));self.assertEqual(empty['columns'],[]);self.assertEqual(empty['rows'][0]['values'],{})
  self.assertIn('no-store',self.projection()[2]['Cache-Control'])
  other=self.ok(self.admin.api('db_save',{'name':'Other'}))['database']
  otherform=self.ok(self.admin.api('form_save',{'db_id':other['id'],'name':'Other form','fields':[],'public':False}))['form']
  self.ok(self.projection('&source='+otherform['id']),404)
  self.assertEqual(self.ok(self.projection('&source='+self.form['id']))['total'],1)
 def test_04_action_styles_persist_and_public_parity(self):
  for style in ['soft','solid','outline','minimal']:
   page=self.ok(self.admin.api('save',{'title':'Actions '+style,'content':{'type':'doc','content':[{'type':'buttonLink','attrs':{'href':'https://example.com','label':'Un bouton','buttonStyle':style,'buttonSize':'large'}},{'type':'formView','attrs':{'formId':self.form['id'],'buttonStyle':style,'buttonSize':'compact'}}]}}))['page']
   self.assertEqual(page['content']['content'][1]['attrs']['buttonStyle'],style)
   self.ok(self.admin.api('publish',{'id':page['id'],'version':page['version']}))
   html=self.ok(self.visitor.request('index.php?page='+page['id']+'&read=1')).decode()
   self.assertIn('form-invitation',html);self.assertIn('action-'+style+' action-compact',html);self.assertIn('action-'+style+' action-large',html)
  page=self.ok(self.admin.api('save',{'title':'Invalid style','content':{'type':'doc','content':[{'type':'formView','attrs':{'formId':self.form['id'],'buttonStyle':'\" onclick=\"alert(1)','buttonSize':'evil'}}]}}))['page']
  self.assertEqual(page['content']['content'][0]['attrs']['buttonStyle'],'soft');self.assertEqual(page['content']['content'][0]['attrs']['buttonSize'],'regular')
 def test_05_projection_limit_and_latest_rows(self):
  for i in range(202):self.ok(self.admin.api('row_save',{'db_id':self.db['id'],'values':{self.title['id']:f'Line {i}'}}))
  result=self.ok(self.projection());self.assertEqual(result['total'],203);self.assertEqual(len(result['rows']),200);self.assertEqual(result['limit'],200)
  dates=[row['created_at'] for row in result['rows']];self.assertEqual(dates,sorted(dates,reverse=True))
 def test_06_projection_editing_and_conditional_rules(self):
  state=self.ok(self.admin.api('property_save',{'db_id':self.db['id'],'name':'État','type':'select','config':{'options':['À faire','Terminé']}}))['property']
  check=self.ok(self.admin.api('property_save',{'db_id':self.db['id'],'name':'Passé','type':'checkbox'}))['property']
  row=self.ok(self.admin.api('row_save',{'db_id':self.db['id'],'values':{self.title['id']:'Oral',state['id']:'À faire',check['id']:False}}))['row']
  result=self.ok(self.projection('&columns='+','.join([self.title['id'],state['id'],check['id']])))
  self.assertTrue(all(r['values'][check['id']] is False for r in result['rows']));self.assertIn('version',result['rows'][0]);self.assertEqual(next(p for p in result['properties'] if p['id']==state['id'])['config']['options'],['À faire','Terminé'])
  changed=self.ok(self.admin.api('row_patch',{'id':row['id'],'version':row['version'],'property_id':check['id'],'value':True}))['row'];self.assertTrue(changed['values'][check['id']])
  self.ok(self.admin.api('row_patch',{'id':row['id'],'version':row['version'],'property_id':check['id'],'value':False}),409)
  changed=self.ok(self.admin.api('row_patch',{'id':row['id'],'version':changed['version'],'property_id':state['id'],'value':'Terminé'}))['row']
  rules=[{'property':state['id'],'operator':'equals','value':'Terminé','color':'green'}]
  payload={'id':self.db['id'],'version':result['database']['version'],'rules':rules}
  self.ok(self.visitor.api('projection_save',payload),401)
  self.ok(self.admin.api('projection_save',payload,authenticated=False),403)
  saved=self.ok(self.admin.api('projection_save',payload));self.assertEqual(saved['rules'],rules)
  self.ok(self.admin.api('projection_save',payload),409)
  fresh=self.ok(self.projection('&columns='+self.title['id']));self.assertEqual(fresh['rules'],rules)
  actual=next(r for r in fresh['rows'] if r['id']==row['id']);self.assertEqual(actual['conditionValues'][state['id']],'Terminé');self.assertNotIn(state['id'],actual['values'])
  bad={**payload,'version':saved['version'],'rules':[{**rules[0],'color':'url(javascript:bad)'}]};self.ok(self.admin.api('projection_save',bad),400)
  self.ok(self.admin.api('projection_save',{**bad,'rules':rules*21}),400)
  self.ok(self.admin.api('projection_save',{**bad,'rules':[{**rules[0],'property':[] }]}),400)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
