#!/usr/bin/env python3
"""Security boundaries over HTTP against a disposable install; owned SQLite or local MySQL only."""
from contextlib import closing
import base64, http.client, importlib.util, io, json, pathlib, struct, subprocess, unittest, urllib.parse, uuid, warnings, zipfile, zlib
HERE=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('feuillet_security_harness',HERE/'smoke.py');harness=importlib.util.module_from_spec(spec);spec.loader.exec_module(harness)

class Security(unittest.TestCase):
    @classmethod
    def setUpClass(cls):harness.Integration.setUpClass();cls.admin=harness.Integration.admin;cls.visitor=harness.Integration.visitor
    @classmethod
    def tearDownClass(cls):harness.Integration.tearDownClass()
    def ok(self,response,status=200):self.assertEqual(response[0],status,response[1]);return response[1]
    def invalid(self,response):self.assertIn(response[0],(400,413,422),response[1]);return response[1]
    def page(self,nodes=None,**patch):return self.ok(self.admin.api('save',{'title':'Sécurité','content':{'type':'doc','content':nodes or [{'type':'paragraph'}]},**patch}))['page']
    def publish(self,p):return self.ok(self.admin.api('publish',{'id':p['id'],'version':p['version']}))['page']
    def db(self,name='Base audit',public=False):return self.ok(self.admin.api('db_save',{'name':name,'visibility':'public' if public else 'private'}))['database']
    def prop(self,db,name='Texte',kind='text',config=None,required=False):return self.ok(self.admin.api('property_save',{'db_id':db['id'],'name':name,'type':kind,'config':config or {},'required':required}))['property']
    def test_01_auth_csrf_methods_and_headers(self):
        for action in ['files','export','db_list','history','export_markdown']:
            self.ok(self.visitor.api(action,query='&id='+str(uuid.uuid4())),401)
        for action in ['save','db_save','row_patch','settings','homepage']:
            self.ok(self.admin.api(action,{'title':'x'},authenticated=False),403)
        self.ok(self.admin.request('api.php?action=logout',method='GET'),405)
        self.assertTrue(self.admin.session()['authenticated'])
        response=self.visitor.api('session');headers={k.lower():v for k,v in response[2].items()}
        self.assertIn("object-src 'none'",headers['content-security-policy']);self.assertIn("frame-ancestors 'self'",headers['content-security-policy'])
        self.assertEqual(headers['x-content-type-options'],'nosniff');self.assertIn('no-store',headers['cache-control'])
        self.ok(self.visitor.api('page',query='&id='+urllib.parse.quote("' OR 1=1 --")),404)
    def test_02_session_fixation_and_token_rotation(self):
        client=harness.Client(self.admin.base);chosen='a'*32;cookie_name=next(c.name for c in self.admin.cookies if c.name.startswith('feuillet_'))
        status,body,headers=client.request('api.php?action=session',headers={'Cookie':cookie_name+'='+chosen})
        self.assertEqual(status,200,body);self.assertNotIn(cookie_name+'='+chosen,headers.get('Set-Cookie',''))
        client.csrf=body['csrf'];before_token=client.csrf;before_id=next(c.value for c in client.cookies if c.name==cookie_name)
        self.ok(client.api('login',{'password':harness.Integration.password}))
        after_id=next(c.value for c in client.cookies if c.name==cookie_name);self.assertNotEqual(before_id,after_id)
        self.ok(client.api('save',{'title':'Old CSRF'}),403)
        client.session();self.assertNotEqual(client.csrf,before_token)
        self.ok(client.api('logout',{}));self.assertFalse(client.session()['authenticated'])
        cookie=next(c for c in client.cookies if c.name==cookie_name);self.assertTrue(cookie.has_nonstandard_attr('HttpOnly'));self.assertEqual(cookie.get_nonstandard_attr('SameSite'),'Lax')
    def test_03_stored_payloads_and_private_embed_metadata(self):
        secret=self.db('SECRET_DB_NAME_044');field=self.prop(secret,'SECRET_FIELD_045')
        form=self.ok(self.admin.api('form_save',{'db_id':secret['id'],'name':'SECRET_FORM_046','fields':[field['id']],'public':False}))['form']
        payload='"><img src=x onerror=alert(44)>'
        nodes=[{'type':'paragraph','content':[{'type':'text','text':payload,'marks':[{'type':'link','attrs':{'href':'javascript:alert(1)'}}]}]}, {'type':'buttonLink','attrs':{'href':'javascript:alert(2)','label':payload}}, {'type':'image','attrs':{'src':'javascript:alert(3)','alt':payload}}, {'type':'databaseView','attrs':{'dbId':secret['id']}}, {'type':'formView','attrs':{'formId':form['id']}}]
        p=self.publish(self.page(nodes,title=payload))
        public=self.ok(self.visitor.api('page',query='&id='+p['id']))['page'];serialized=json.dumps(public)
        self.assertNotIn(secret['id'],serialized);self.assertNotIn(form['id'],serialized);self.assertNotIn('javascript:',serialized)
        html=self.visitor.request('index.php?page='+p['id']+'&read=1')[1].decode();self.assertIn('&lt;img',html);self.assertNotIn('<img src=x',html);self.assertNotIn('SECRET_DB_NAME_044',html)
    def test_04_body_and_document_complexity_limits(self):
        self.ok(self.admin.request('api.php?action=save',b'{"title":"'+b'A'*(4*1024*1024)+b'"}',{'Content-Type':'application/json','X-CSRF-Token':self.admin.csrf}),413)
        nested={'type':'paragraph'}
        for _ in range(34):nested={'type':'column','content':[nested]}
        self.invalid(self.admin.api('save',{'content':{'type':'doc','content':[nested]}}))
        self.invalid(self.admin.api('save',{'content':{'type':'doc','content':[{'type':'paragraph'}]*12001}}))
        # Transfer-Encoding omits CONTENT_LENGTH; the stream itself must still be bounded.
        url=urllib.parse.urlparse(self.admin.base);conn=http.client.HTTPConnection(url.hostname,url.port,timeout=10)
        cookies='; '.join(c.name+'='+c.value for c in self.admin.cookies)
        chunks=iter([b'{"title":"',b'A'*(4*1024*1024),b'"}'])
        conn.request('POST','/api.php?action=save',body=chunks,headers={'Content-Type':'application/json','X-CSRF-Token':self.admin.csrf,'Cookie':cookies},encode_chunked=True)
        response=conn.getresponse();status=response.status;body=response.read();conn.close();self.assertEqual(status,413,body)
    def test_05_upload_content_and_image_dimensions(self):
        self.invalid(self.admin.upload('upload','texte-php.txt',b'<?php echo "code"; ?>','text/plain'))
        self.invalid(self.admin.upload('upload','faux.pdf',b'<html>actif</html>','application/pdf'))
        self.invalid(self.admin.upload('upload','image.svg',b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>','image/svg+xml'))
        def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
        huge=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',30000,30000,8,2,0,0,0))+chunk(b'IEND',b'')
        response=self.admin.upload('upload','pixels.png',huge,'image/png');self.invalid(response)
        for path in ['../config.php','../storage/feuillet.sqlite','app/bootstrap.php','config.php']:
            response=self.visitor.request(path);raw=response[1] if isinstance(response[1],bytes) else json.dumps(response[1]).encode()
            # PHP's development server may return its index fallback (200); source/storage must remain absent.
            self.assertNotIn(b'<?php',raw);self.assertNotIn(b'SQLite format 3',raw);self.assertNotIn(b'password_hash',raw)
    def test_06_public_form_file_owner_and_quota(self):
        db=self.db();field=self.prop(db,'Pièce jointe','files');text=self.prop(db,'Message')
        form=self.ok(self.admin.api('form_save',{'db_id':db['id'],'name':'Fichiers audit','fields':[field['id'],text['id']],'public':True}))['form']
        a=harness.Client(self.admin.base);b=harness.Client(self.admin.base);a.session();b.session()
        uploaded=self.ok(a.upload('form_upload','réponse.txt',b'REPONSE_PRIVEE_047','text/plain',{'token':form['token']}))['file']
        self.ok(a.request(uploaded['url']),404);self.ok(self.visitor.api('file_info',query='&id='+uploaded['id']),404)
        self.invalid(b.api('form_submit',{'token':form['token'],'values':{field['id']:[uploaded['id']],text['id']:'Vol de pièce jointe'}}))
        self.ok(a.api('form_submit',{'token':form['token'],'values':{field['id']:[uploaded['id']],text['id']:'Une réponse'}}))
        self.invalid(a.api('form_submit',{'token':form['token'],'values':{field['id']:[uploaded['id']],text['id']:'Réutilisation'}}))
        bundle=self.ok(self.admin.api('db_get',query='&id='+db['id']));row=bundle['rows'][0]
        self.invalid(self.admin.api('row_save',{**row,'db_id':db['id'],'visibility':'public'}))
        # No large data allocation: simulate an existing pending file's byte count in the owned test DB.
        fresh=self.ok(b.upload('form_upload','quota.txt',b'audit','text/plain',{'token':form['token']}))['file']
        sql="UPDATE files SET size=209715198 WHERE id='"+fresh['id']+"';"
        integration=harness.Integration
        if harness.ARGS.mysql:
            command=['mysql','--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+str(integration.mysql_port),'--user=root','feuillet_test','--execute='+sql];result=subprocess.run(command,capture_output=True,text=True);self.assertEqual(result.returncode,0,result.stderr)
        else:
            import sqlite3
            with closing(sqlite3.connect(integration.install/'storage'/'feuillet.sqlite')) as dbconn:dbconn.execute(sql);dbconn.commit()
        self.ok(b.upload('form_upload','dépassement.txt',b'four','text/plain',{'token':form['token']}),413)
        self.assertNotIn('dépassement.txt',[f['name'] for f in self.ok(self.admin.api('files'))['files']])
    def test_07_typed_row_patch_view_config_and_private_labels(self):
        target=self.db('Cible publique',True);title=self.prop(target,'Titre','title');secret=self.ok(self.admin.api('row_save',{'db_id':target['id'],'visibility':'private','values':{title['id']:'ETIQUETTE_PRIVEE_048'}}))['row'];visible=self.ok(self.admin.api('row_save',{'db_id':target['id'],'visibility':'public','values':{title['id']:'Étiquette publique'}}))['row']
        db=self.db('Source',True);required=self.prop(db,'Nom','title',required=True);amount=self.prop(db,'Nombre','number');related=self.prop(db,'Relation','relation',{'target_db_id':target['id']})
        row=self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{required['id']:'Initial',amount['id']:2,related['id']:[secret['id'],visible['id']]}}))['row']
        self.ok(self.visitor.api('row_patch',{'id':row['id'],'version':row['version'],'property_id':amount['id'],'value':3}),401)
        self.invalid(self.admin.api('row_patch',{'id':row['id'],'version':row['version'],'property_id':amount['id'],'value':'pas un nombre'}))
        patched=self.ok(self.admin.api('row_patch',{'id':row['id'],'version':row['version'],'property_id':amount['id'],'value':3}))['row'];self.assertEqual(patched['values'][required['id']],'Initial');self.assertEqual(patched['values'][amount['id']],3)
        self.ok(self.admin.api('row_patch',{'id':row['id'],'version':row['version'],'property_id':amount['id'],'value':4}),409)
        self.invalid(self.admin.api('row_patch',{'id':row['id'],'version':patched['version'],'property_id':required['id'],'value':''}))
        config={'layout':'gallery','filters':[{'propertyId':amount['id'],'operator':'gte','value':1}],'sort':{'propertyId':required['id'],'direction':'asc'},'hiddenPropertyIds':[related['id']]}
        p=self.publish(self.page([{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':config}},{'type':'databaseView','attrs':{'dbId':target['id']}}]))
        bundle=self.ok(self.visitor.api('public_db_get',query='&id='+db['id']));self.assertEqual(bundle['relation_labels'],{visible['id']:'Étiquette publique'});self.assertNotIn('ETIQUETTE_PRIVEE_048',json.dumps(bundle))
        bad={**config,'hiddenPropertyIds':[title['id']]};self.invalid(self.admin.api('save',{**p,'content':{'type':'doc','content':[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':bad}}]}}))
        self.invalid(self.admin.api('save',{**p,'content':{'type':'doc','content':[{'type':'databaseView','attrs':{'dbId':db['id'],'viewConfig':{**config,'filters':config['filters']*11}}}]}}))
    def test_08_formula_intermediate_budget_and_no_execution(self):
        db=self.db();text=self.prop(db,'Texte');self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{text['id']:'a'*10000}}))
        expression='count(concat('+','.join(['prop("Texte")']*11)+'))'
        result=self.ok(self.admin.api('formula_preview',{'db_id':db['id'],'expression':expression}));self.assertIn('error',result)
        result=self.ok(self.admin.api('formula_preview',{'db_id':db['id'],'expression':'system("touch /tmp/feuillet-owned")'}));self.assertIn('error',result)
    def test_09_archive_preflight_rollback_and_ordinary_page_restore(self):
        def archive(manifest,files=None,extra=None,duplicate=False):
            result=io.BytesIO()
            with warnings.catch_warnings():
                warnings.simplefilter('ignore',UserWarning)
                with zipfile.ZipFile(result,'w',zipfile.ZIP_DEFLATED) as z:
                    z.writestr('manifest.json',json.dumps(manifest))
                    for name,data in (files or {}).items():z.writestr(name,data)
                    if extra:z.writestr(extra,b'escape')
                    if duplicate:z.writestr('manifest.json','{}')
            return result.getvalue()
        before=self.ok(self.admin.api('pages'))['pages'];beforefiles=self.ok(self.admin.api('files'))['files']
        empty={'format':'feuillet-backup','version':3,'pages':[],'files':[]}
        for name in ['../escape','/absolute','files/../../escape']:self.invalid(self.admin.upload('import','archive.zip',archive(empty,extra=name),'application/zip'))
        self.invalid(self.admin.upload('import','archive.zip',archive(empty,duplicate=True),'application/zip'))
        malformed={**empty,'pages':[{'id':str(uuid.uuid4()),'content':{'type':'doc','content':[{'type':'paragraph'}]*12001}}]}
        self.invalid(self.admin.upload('import','archive.zip',archive(malformed),'application/zip'))
        fid=str(uuid.uuid4());php={**empty,'files':[{'id':fid,'name':'php.txt','entry':'files/'+fid}]};self.invalid(self.admin.upload('import','archive.zip',archive(php,{'files/'+fid:b'<?php echo "active"; ?>'}),'application/zip'))
        self.assertEqual(len(self.ok(self.admin.api('pages'))['pages']),len(before));self.assertEqual(len(self.ok(self.admin.api('files'))['files']),len(beforefiles))
        page=self.page(title='Ancien accueil conservé')
        _,raw,_=self.admin.api('export');manifest=json.loads(zipfile.ZipFile(io.BytesIO(raw)).read('manifest.json'));self.assertNotIn('homepage_id',manifest['settings'])
        self.ok(self.admin.upload('import','restauration.zip',raw,'application/zip',{'apply_settings':'1'}));copies=[p for p in self.ok(self.admin.api('pages'))['pages'] if p['title']==page['title'] and p['id']!=page['id']];self.assertTrue(copies);self.assertTrue(all(p['visibility']=='private' for p in copies))
    def test_10_expired_uploads_cleanup_preserves_reused_files(self):
        db=self.db();field=self.prop(db,'Fichiers','files');form=self.ok(self.admin.api('form_save',{'db_id':db['id'],'name':'Expiration audit','public':True,'fields':[field['id']]}))['form']
        client=harness.Client(self.admin.base);client.session()
        dead=self.ok(client.upload('form_upload','abandonné.txt',b'abandon','text/plain',{'token':form['token']}))['file']
        keeper=self.ok(client.upload('form_upload','cours-préservé.txt',b'cours','text/plain',{'token':form['token']}))['file']
        course=self.page([{'type':'fileBlock','attrs':{'fileId':keeper['id'],'name':keeper['name'],'mode':'download'}}])
        used=self.ok(client.upload('form_upload','réponse-envoyée.txt',b'envoyee','text/plain',{'token':form['token']}))['file']
        self.ok(client.api('form_submit',{'token':form['token'],'values':{field['id']:[used['id']]}}))
        brand=self.ok(client.upload('form_upload','logo.png',base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='),'image/png',{'token':form['token']}))['file']
        self.ok(self.admin.api('settings',{'notebook':{'icon_id':brand['id']}}))
        integration=harness.Integration;ids=','.join("'"+f['id']+"'" for f in [dead,keeper,used,brand]);sql="UPDATE form_uploads SET created_at='2020-01-01T00:00:00Z' WHERE file_id IN ("+ids+");"
        if harness.ARGS.mysql:
            result=subprocess.run(['mysql','--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+str(integration.mysql_port),'--user=root','feuillet_test','--execute='+sql],capture_output=True,text=True);self.assertEqual(result.returncode,0,result.stderr)
        else:
            import sqlite3
            with closing(sqlite3.connect(integration.install/'storage'/'feuillet.sqlite')) as connection:connection.execute(sql);connection.commit()
        self.invalid(client.api('form_submit',{'token':form['token'],'values':{field['id']:[dead['id']]}}))
        self.ok(client.upload('form_upload','nouveau.txt',b'nouveau','text/plain',{'token':form['token']}))
        self.ok(self.admin.request(dead['url']),404);self.assertEqual(self.admin.request(keeper['url'])[0],200);self.assertEqual(self.admin.request(used['url'])[0],200)
        self.assertEqual(self.ok(self.admin.api('page',query='&id='+course['id']))['page']['content']['content'][0]['attrs']['fileId'],keeper['id'])
        self.ok(self.visitor.request(brand['url']));self.ok(self.admin.api('settings',{'notebook':{'icon_id':None}}))
    def test_11_csv_arrays_are_neutralized(self):
        import csv
        db=self.db();choice=self.prop(db,'Choix','multiselect',{'options':['=1+1','Normal']})
        self.ok(self.admin.api('row_save',{'db_id':db['id'],'values':{choice['id']:['=1+1']}}))
        status,raw,_=self.admin.api('db_export',query='&id='+db['id']);self.assertEqual(status,200)
        rows=list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))));self.assertEqual(rows[1][0],"'=1+1")

    def test_13_empty_text_import_preserves_the_document(self):
        document={'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'TEXTE_A_CONSERVER'},{'type':'text','text':''}]},{'type':'paragraph','content':[{'type':'text','text':''}]}]}
        page=self.ok(self.admin.api('save',{'title':'Import avec texte vide','content':document}))['page']
        self.assertEqual(page['content']['content'][0]['content'],[{'type':'text','text':'TEXTE_A_CONSERVER'}])
        self.assertEqual(page['content']['content'][1]['content'],[])
        document['content'][0]['content']=[{'type':'text','text':{'malformed':True}}]
        self.invalid(self.admin.api('save',{'title':'Texte invalide','content':document}))

    def test_99_login_rate_limit(self):
        blocked=None
        for _ in range(12):
            response=self.visitor.api('login',{'password':'incorrect'});blocked=response[0]
            if blocked==429:break
            self.assertEqual(blocked,401,response[1])
        self.assertEqual(blocked,429)

if __name__=='__main__':unittest.main(argv=[__file__]+harness.REMAINING,verbosity=2)
