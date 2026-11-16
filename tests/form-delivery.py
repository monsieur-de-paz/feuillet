#!/usr/bin/env python3
"""Receipt durability, replay safety and multiple anonymous pupils behind one IP."""
import importlib.util,pathlib,unittest,json,uuid,sqlite3,subprocess
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('delivery_harness',HERE/'smoke.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class Delivery(unittest.TestCase):
 @classmethod
 def setUpClass(cls):h.Integration.setUpClass();cls.admin=h.Integration.admin
 @classmethod
 def tearDownClass(cls):h.Integration.tearDownClass()
 def ok(self,r,status=200):self.assertEqual(r[0],status,r[1]);return r[1]
 def fixture(self):
  db=self.ok(self.admin.api('db_create',{'name':'Synthetic receipt checks'}))['database'];title=self.ok(self.admin.api('db_get',query='&id='+db['id']))['properties'][0]
  file=self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':'Document','type':'files','required':True,'config':{}}))['property']
  form=self.ok(self.admin.api('form_save',{'db_id':db['id'],'name':'Synthetic submission','fields':[title['id'],file['id']],'public':True}))['form']
  return db,title,file,form
 def send(self,form,title,file,label='Synthetic'):
  c=h.Client(self.admin.base);c.session();f=self.ok(c.upload('form_upload','document.txt',b'synthetic document','text/plain',{'token':form['token']}))['file'];body={'token':form['token'],'request_id':uuid.uuid4().hex,'values':{title['id']:label,file['id']:[f['id']]}};return c,f,body
 def sql(self,sql):
  if h.ARGS.mysql:
   p=subprocess.run(['mysql','--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+str(h.Integration.mysql_port),'--user=root','feuillet_test','--execute='+sql],capture_output=True,text=True);self.assertEqual(p.returncode,0,p.stderr)
  else:
   with sqlite3.connect(h.Integration.install/'storage/feuillet.sqlite') as connection:connection.executescript(sql)
 def test_01_receipt_is_private_durable_and_exact_replay_is_idempotent(self):
  db,title,file,form=self.fixture();c,f,body=self.send(form,title,file)
  result=self.ok(c.api('form_submit',body));receipt=result['receipt'];self.assertTrue(result['ok']);self.assertEqual(receipt['fileCount'],1);self.assertEqual(receipt['requestId'],body['request_id']);self.assertEqual(receipt['formId'],form['id'])
  path=h.Integration.install/'storage/form-submissions'/form['id']/(body['request_id']+'.json');j=json.loads(path.read_text());self.assertEqual(j['receipt'],receipt);self.assertEqual(j['values'],body['values']);self.assertEqual(path.stat().st_mode & 0o777,0o600)
  self.assertEqual(self.ok(c.api('form_submit',body))['receipt'],receipt)
  self.assertEqual(len(self.ok(self.admin.api('db_get',query='&id='+db['id']))['rows']),1)
  stranger=h.Client(self.admin.base);stranger.session();self.ok(stranger.api('form_submit',body),409)
  altered={**body,'values':{**body['values'],title['id']:'Other content'}};self.ok(c.api('form_submit',altered),409)
  self.ok(c.api('form_delivery_audit',query='&id='+db['id']),401);self.ok(c.api('form_delivery_audit',{'id':db['id']}),405)
  audit=self.ok(self.admin.api('form_delivery_audit',query='&id='+db['id']));self.assertEqual(audit['counts']['received'],1);self.assertTrue(audit['journals'][0]['rowExists']);self.assertNotIn('owner',json.dumps(audit));self.assertNotIn('fingerprint',json.dumps(audit))
  response=c.request('/storage/form-submissions/'+form['id']+'/'+body['request_id']+'.json');self.assertNotIn(j['owner'].encode(),response[1]);self.assertNotIn(b'feuillet-form-submission',response[1])
 def test_02_twenty_four_pupils_same_network_keep_all_rows_and_files(self):
  db,title,file,form=self.fixture();ids=set()
  for i in range(24):
   c,f,body=self.send(form,title,file,f'Pupil {i}');result=self.ok(c.api('form_submit',body));ids.add(result['receipt']['id'])
  self.assertEqual(len(ids),24);bundle=self.ok(self.admin.api('db_get',query='&id='+db['id']));self.assertEqual(len(bundle['rows']),24);self.assertEqual(len(bundle['files']),24)
 def test_03_no_success_when_media_is_missing_or_journal_unwritable(self):
  db,title,file,form=self.fixture();c,f,body=self.send(form,title,file)
  self.sql("UPDATE files SET path='000000000000000000000000000000000000000000000000' WHERE id='"+f['id']+"'")
  self.ok(c.api('form_submit',body),409);self.assertEqual(len(self.ok(self.admin.api('db_get',query='&id='+db['id']))['rows']),0)
  c,f,body=self.send(form,title,file);folder=h.Integration.install/'storage/form-submissions'/form['id'];folder.mkdir(exist_ok=True);(folder/(body['request_id']+'.json')).mkdir()
  self.ok(c.api('form_submit',body),500);self.assertEqual(len(self.ok(self.admin.api('db_get',query='&id='+db['id']))['rows']),0)
 def test_04_audit_finds_pending_and_unindexed_files_without_mutation(self):
  db,title,file,form=self.fixture();c,f,body=self.send(form,title,file)
  stray=h.Integration.install/'storage/files'/('a'*48);stray.write_bytes(b'unindexed synthetic bytes')
  audit=self.ok(self.admin.api('form_delivery_audit',query='&id='+db['id']));self.assertEqual(audit['counts']['pending'],1);self.assertGreaterEqual(audit['unindexedFiles'],1);self.assertTrue(audit['uploads'][0]['available']);self.assertEqual(self.admin.request(f['url'])[0],200);self.assertTrue(stray.exists())
if __name__=='__main__':unittest.main(argv=[__file__]+h.REMAINING,verbosity=2)
