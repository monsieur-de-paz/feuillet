#!/usr/bin/env python3
import importlib.util,pathlib,unittest
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('wheel_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Wheels(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  h.Integration.setUpClass();cls.a=h.Integration.admin;cls.v=h.Integration.visitor
  cls.db=cls.a.api('db_create',{'name':'Wheel fixture'})[1]['database'];cls.title=cls.a.api('db_get',query='&id='+cls.db['id'])[1]['properties'][0]
  cls.group=cls.a.api('property_save',{'db_id':cls.db['id'],'name':'Classe','type':'select','config':{'options':['A','B']}})[1]['property']
  cls.ids={}
  for name,g in [('Alpha','A'),('Alpha','A'),('Bravo','B')]:
   r=cls.a.api('row_save',{'db_id':cls.db['id'],'values':{cls.title['id']:name,cls.group['id']:g}})[1]['row'];cls.ids[r['id']]=g
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def scope(self,group='A'):return {'id':self.db['id'],'property':self.title['id'],'groupBy':self.group['id'],'group':group,'all':False,'source':''}
 def test_01_access_validation(self):
  s=self.scope();self.ok(self.v.api('wheel_state',s),401);self.ok(self.a.api('wheel_state',s,authenticated=False),403);self.ok(self.a.api('wheel_state'),405)
  self.ok(self.a.api('wheel_state',{**s,'property':[]}),400);self.ok(self.a.api('wheel_state',{**s,'property':'missing'}),400);self.ok(self.a.api('wheel_state',{**s,'group':{'bad':'object'}}),400)
 def test_02_durable_draws_group_isolation_decision_and_reset(self):
  s=self.scope();data=self.ok(self.a.api('wheel_state',s));self.assertEqual(len(data['entries']),2);self.assertEqual(len(data['groups']),2)
  picked=[]
  for _ in range(2):
   draw=self.ok(self.a.api('wheel_spin',{**s,'revision':data['state']['revision']}));p=draw['state']['pending'];self.assertEqual(self.ids[p['id']],'A');picked.append(p['id'])
   loaded=self.ok(self.a.api('wheel_state',s));self.assertEqual(loaded['state']['pending'],p)
   self.ok(self.a.api('wheel_spin',{**s,'revision':draw['state']['revision']}),409)
   self.ok(self.a.api('wheel_decide',{**s,'revision':draw['state']['revision'],'drawId':'wrong','decision':'remove'}),400)
   data=self.ok(self.a.api('wheel_decide',{**s,'revision':draw['state']['revision'],'drawId':p['drawId'],'decision':'remove'}))
  self.assertEqual(len(set(picked)),2);self.assertEqual(len(data['entries']),0)
  self.ok(self.a.api('wheel_spin',{**s,'revision':data['state']['revision']}),400)
  other=self.ok(self.a.api('wheel_state',self.scope('B')));self.assertEqual(len(other['entries']),1);self.assertEqual(other['state']['excluded'],[])
  restored=self.ok(self.a.api('wheel_reset',{**s,'revision':data['state']['revision']}));self.assertEqual(len(restored['entries']),2);self.assertEqual(restored['state']['history'],[])
  draw=self.ok(self.a.api('wheel_spin',{**s,'revision':restored['state']['revision']}));self.ok(self.a.api('wheel_spin',{**s,'revision':restored['state']['revision']}),409)
  kept=self.ok(self.a.api('wheel_decide',{**s,'revision':draw['state']['revision'],'drawId':draw['state']['pending']['drawId'],'decision':'keep'}));self.assertEqual(len(kept['entries']),2)
 def test_03_independent_columns_and_sources(self):
  s={**self.scope(),'property':self.group['id']};data=self.ok(self.a.api('wheel_state',s));self.assertEqual(data['state']['revision'],0);self.assertEqual(len(data['entries']),2)
  allrows=self.ok(self.a.api('wheel_state',{**self.scope(),'all':True,'group':None}));self.assertEqual(len(allrows['entries']),3);self.assertEqual(allrows['state']['revision'],0)
  form=self.ok(self.a.api('form_save',{'db_id':self.db['id'],'name':'Other source','fields':[self.title['id']],'public':True}))['form']
  filtered=self.ok(self.a.api('wheel_state',{**self.scope(),'source':form['id']}));self.assertEqual(filtered['entries'],[])
  self.ok(self.a.api('wheel_state',{**self.scope(),'source':'missing'}),404)
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
