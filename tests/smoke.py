#!/usr/bin/env python3
"""HTTP integration checks against a disposable copy. Python stdlib only."""
import argparse, io, json, os, re, pathlib, shutil, socket, subprocess, tempfile, time, unittest, urllib.error, urllib.parse, urllib.request, http.cookiejar, uuid, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
PARSER = argparse.ArgumentParser(description=__doc__)
PARSER.add_argument('--php', default='php')
PARSER.add_argument('--mysql', action='store_true', help='Use an owned disposable local mysqld instead of SQLite')
PARSER.add_argument('--network', action='store_true', help='Also validate live Commons search and guarded import')
PARSER.add_argument('--keep', action='store_true', help='Preserve disposable installation for inspection')
ARGS, REMAINING = PARSER.parse_known_args()

class Client:
    def __init__(self, base):
        self.base = base
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.csrf = None
    def request(self, path, data=None, headers=None, method=None):
        h = dict(headers or {})
        if isinstance(data, dict):
            data = json.dumps(data).encode(); h['Content-Type'] = 'application/json'
        req = urllib.request.Request(self.base + '/' + path, data=data, headers=h, method=method)
        try: r = self.opener.open(req, timeout=10)
        except urllib.error.HTTPError as e: r = e
        status = r.status; response_headers = dict(r.headers)
        raw = r.read(); r.close()
        try: body = json.loads(raw)
        except (ValueError, UnicodeDecodeError): body = raw
        return status, body, response_headers
    def api(self, action, data=None, authenticated=True, query=''):
        headers = {'X-CSRF-Token': self.csrf} if authenticated and self.csrf else {}
        return self.request('api.php?action=' + action + query, data, headers)
    def session(self):
        status, result, _ = self.api('session')
        assert status == 200, result
        self.csrf = result['csrf']
        return result
    def upload(self, action, name, content, mime='application/octet-stream', fields=None):
        boundary = 'feuillet-' + uuid.uuid4().hex
        payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n'.encode() + content + f'\r\n--{boundary}--\r\n'.encode())
        if fields:
            payload=b''.join((f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n').encode() for key,value in fields.items())+payload
        return self.request('api.php?action=' + action, payload, {'Content-Type': 'multipart/form-data; boundary=' + boundary, 'X-CSRF-Token': self.csrf})

class Integration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try: cls._setUpClass()
        except BaseException:
            cls.tearDownClass(); raise
    @classmethod
    def _setUpClass(cls):
        test_directory = os.environ.get('FEUILLET_TEST_WORKDIR')
        if test_directory: pathlib.Path(test_directory).mkdir(parents=True, exist_ok=True)
        cls.sandbox = pathlib.Path(tempfile.mkdtemp(prefix='feuillet-smoke-', dir=test_directory))
        cls.install = cls.sandbox / 'feuillet'
        shutil.copytree(ROOT, cls.install, ignore=shutil.ignore_patterns('node_modules', '.git', 'frontend', 'tests', 'docs', 'config.php', 'storage'))
        (cls.install / 'storage').mkdir()
        cls.log = open(cls.sandbox / 'php-server.log', 'w')
        with socket.socket() as sock: sock.bind(('127.0.0.1', 0)); cls.port = sock.getsockname()[1]
        test_env = {key:value for key,value in os.environ.items() if key != 'FEUILLET_CONFIG'}
        cls.proc = subprocess.Popen([ARGS.php, '-S', f'127.0.0.1:{cls.port}', '-t', str(cls.install / 'public')], stdout=cls.log, stderr=cls.log, env=test_env)
        cls.admin = Client(f'http://127.0.0.1:{cls.port}')
        for _ in range(100):
            try: cls.admin.request('setup.php'); break
            except (OSError, urllib.error.URLError): time.sleep(.05)
        else: raise RuntimeError('PHP server did not start')
        # Test-install config is private and generated only in the disposable copy.
        cls.password = 'Smoke-' + uuid.uuid4().hex + '-Aa9!'
        if ARGS.mysql: cls.start_mysql()
        cls.setup_installation()
        cls.visitor = Client(cls.admin.base)
        cls.visitor.session()
        cls.admin.session()
        status, body, _ = cls.admin.api('login', {'password': cls.password})
        assert status == 200, body
        cls.admin.session()
        cls.page = None
        cls.file = None
    @classmethod
    def start_mysql(cls):
        binary = shutil.which('mysqld') or '/opt/homebrew/opt/mysql/bin/mysqld'
        if not pathlib.Path(binary).is_file(): raise RuntimeError('No existing mysqld binary; no server will be installed')
        cls.mysql_dir = cls.sandbox/'mysql'
        cls.mysql_dir.mkdir()
        result = subprocess.run([binary,'--no-defaults','--initialize-insecure','--datadir='+str(cls.mysql_dir)],capture_output=True,text=True)
        if result.returncode: raise RuntimeError('Owned MySQL init failed: '+result.stderr)
        with socket.socket() as sock: sock.bind(('127.0.0.1',0)); cls.mysql_port=sock.getsockname()[1]
        cls.mysql_proc=subprocess.Popen([binary,'--no-defaults','--datadir='+str(cls.mysql_dir),'--socket='+str(cls.sandbox/'mysql.sock'),'--port='+str(cls.mysql_port),'--bind-address=127.0.0.1','--mysqlx=OFF','--skip-log-bin','--pid-file='+str(cls.sandbox/'mysql.pid'),'--log-error='+str(cls.sandbox/'mysql.log')],stdout=cls.log,stderr=cls.log)
        command=[shutil.which('mysql') or 'mysql','--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+str(cls.mysql_port),'--user=root','--execute=CREATE DATABASE feuillet_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci']
        for _ in range(200):
            result=subprocess.run(command,capture_output=True,text=True)
            if not result.returncode: break
            if cls.mysql_proc.poll() is not None: raise RuntimeError('Owned MySQL startup failed: '+(cls.sandbox/'mysql.log').read_text())
            time.sleep(.05)
        else: raise RuntimeError('Owned MySQL startup timeout: '+result.stderr)
    @classmethod
    def setup_installation(cls):
        status, html, _ = cls.admin.request('setup.php')
        assert status == 200, html
        source = html.decode() if isinstance(html,bytes) else str(html)
        match = re.search(r'name=[\"\']csrf[\"\']\s+value=[\"\']([^\"\']+)', source)
        assert match, 'Installer CSRF field not found'
        cls.setup_csrf = match.group(1)
        values = {'name':'Test HTTP','password':cls.password,'password_confirm':cls.password,'driver':'sqlite','sqlite_name':'feuillet.sqlite','csrf':cls.setup_csrf}
        if ARGS.mysql: values.update(driver='mysql',db_host='127.0.0.1',db_port=cls.mysql_port,db_name='feuillet_test',db_user='root',db_password='')
        status, body, _ = cls.admin.request('setup.php', urllib.parse.urlencode(values).encode(), {'Content-Type':'application/x-www-form-urlencoded'})
        assert status in (200,302,303), body
        assert (cls.install/'config.php').is_file(), body
        assert cls.password not in (cls.install/'config.php').read_text(), 'Password stored in plaintext' 
    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'proc'): cls.proc.terminate(); cls.proc.wait(timeout=5)
        if hasattr(cls, 'mysql_proc'): cls.mysql_proc.terminate(); cls.mysql_proc.wait(timeout=20)
        if hasattr(cls, 'log'): cls.log.close()
        if hasattr(cls, 'sandbox'):
            if ARGS.keep: print('Disposable installation:', cls.sandbox)
            else: shutil.rmtree(cls.sandbox)
    def ok(self, response, status=200):
        self.assertEqual(response[0], status, response[1]); return response[1]
    def rejected(self, response):
        self.assertIn(response[0], (400,422), response[1]); return response[1]
    def page_save(self, page=None, **kw):
        payload = {'title':'Brouillon secret', 'parent_id':None, 'icon':'📘', 'content':{'type':'doc', 'content':[{'type':'paragraph','content':[{'type':'text','text':'Texte privé'}]}]}}
        if page: payload.update({k:page.get(k) for k in ['id','title','parent_id','icon','content','version']})
        payload.update(kw)
        return self.ok(self.admin.api('save', payload))['page']
    def publish(self, page):
        return self.ok(self.admin.api('publish', {'id':page['id'],'version':page['version']}))['page']
    def test_01_auth_and_csrf(self):
        self.assertFalse(self.visitor.session()['authenticated'])
        health=self.ok(self.admin.api('health')); self.assertEqual(health['driver'],'mysql' if ARGS.mysql else 'sqlite')
        response=self.admin.request('setup.php'); self.assertNotIn(b'name="csrf"',response[1] if isinstance(response[1],bytes) else b'','Installer remained available after setup')
        self.ok(self.visitor.api('save', {'title':'Intrusion'}), 401)
        self.ok(self.admin.api('save', {'title':'Sans jeton'}, authenticated=False), 403)
        other = Client(self.admin.base); other.session()
        self.ok(other.api('login', {'password':'admin'}), 401)
    def test_02_conflict_and_published_snapshot(self):
        p = self.page_save()
        self.ok(self.visitor.api('page', query='&id='+p['id']), 404)
        self.ok(self.admin.api('save', {'id':p['id'],'version':p['version']-1,'title':'Écrasement','content':p['content']}), 409)
        p = self.publish(p)
        old = self.ok(self.visitor.api('page',query='&id='+p['id']))['page']
        p = self.page_save(p,title='Nouveau titre secret',content={'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'NE_PAS_PUBLIER'}]}]})
        live = self.ok(self.visitor.api('page',query='&id='+p['id']))['page']
        self.assertEqual(live['title'],old['title']); self.assertNotIn('NE_PAS_PUBLIER', json.dumps(live))
        listing = self.ok(self.visitor.api('pages')); self.assertNotIn('Nouveau titre secret', json.dumps(listing)); self.assertNotIn('trash', listing)
        type(self).page = p
    def test_03_file_visibility_and_ranges(self):
        data = b'%PDF-1.4\n' + b'1234567890'*50 + b'\n%%EOF'
        f = self.ok(self.admin.upload('upload','cours.pdf',data,'application/pdf'))['file']
        self.ok(self.visitor.request(f['url']), 404)
        self.rejected(self.admin.upload('upload','active.html',b'<script>alert(1)</script>','text/html'))
        p = self.page_save(self.page,content={'type':'doc','content':[{'type':'fileBlock','attrs':{'fileId':f['id'],'name':f['name'],'mime':f['mime'],'size':f['size'],'mode':'pdf'}}]})
        self.ok(self.visitor.request(f['url']),404)
        p = self.publish(p)
        status, content, headers = self.visitor.request(f['url'],headers={'Range':'bytes=0-7'})
        self.assertEqual(status,206,content); self.assertEqual(content,data[:8]); self.assertEqual(headers.get('Content-Range'), f'bytes 0-7/{len(data)}')
        self.ok(self.visitor.request(f['url'],headers={'Range':'bytes=99999-'}),416)
        suffix=self.visitor.request(f['url'],headers={'Range':'bytes=-6'}); self.assertEqual(suffix[0],206); self.assertEqual(suffix[1],data[-6:])
        p = self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}))['page']
        self.ok(self.visitor.request(f['url']),404)
        p = self.publish(p)
        shared = self.publish(self.page_save(title='Fichier partagé',content=p['content']))
        p = self.ok(self.admin.api('visibility',{'id':p['id'],'version':p['version'],'visibility':'private'}))['page']
        self.assertEqual(self.visitor.request(f['url'])[0],200,'A reference in another public page must keep this file public')
        self.ok(self.admin.api('visibility',{'id':shared['id'],'version':shared['version'],'visibility':'private'}))
        self.ok(self.visitor.request(f['url']),404)
        p = self.publish(p); type(self).page = p; type(self).file = f
    def test_04_quiz_answers_hidden(self):
        quiz = {'type':'quiz','attrs':{'quizId':'q1','title':'Entraînement','questions':[{'id':'one','type':'single','prompt':'Deux plus deux ?','options':['3','4'],'correct':[1],'answers':[],'explanation':'Deux paires font quatre.'},{'id':'two','type':'short','prompt':'Capitale ?','options':[],'correct':[],'answers':['Paris'],'explanation':'Paris est la capitale.'}]}}
        p = self.publish(self.page_save(content={'type':'doc','content':[quiz]}))
        visible = self.ok(self.visitor.api('page',query='&id='+p['id']))['page']
        attrs = visible['content']['content'][0]['attrs']
        for q in attrs['questions']:
            for key in ['correct','answers','explanation']: self.assertNotIn(key,q)
        html = self.ok(self.visitor.api('render',query='&id='+p['id']))['html']
        self.assertNotIn('Paris est la capitale',html); self.assertNotIn('Deux paires',html)
        result = self.ok(self.visitor.api('quiz',{'page_id':p['id'],'quiz_id':'q1','answers':{'one':[1],'two':' paris '}}))
        self.assertEqual(result['score'],2); self.assertEqual(result['total'],2)
        self.assertEqual(result['results'][0]['explanation'],'Deux paires font quatre.')
    def test_05_descendant_trash_and_restore(self):
        parent = self.publish(self.page_save(title='Parent'))
        child = self.publish(self.page_save(title='Enfant',parent_id=parent['id']))
        grandchild = self.publish(self.page_save(title='Petit-enfant',parent_id=child['id']))
        self.ok(self.admin.api('trash',{'id':parent['id']}))
        for p in [parent,child,grandchild]: self.ok(self.visitor.api('page',query='&id='+p['id']),404)
        self.ok(self.admin.api('restore',{'id':parent['id']}))
        for p in [parent,child,grandchild]: self.ok(self.visitor.api('page',query='&id='+p['id']),404)
    def test_06_history_and_cycle_guard(self):
        p = self.page_save(title='Avant')
        p = self.page_save(p,title='Après')
        history = self.ok(self.admin.api('history',query='&id='+p['id']))['history']
        self.assertGreater(len(history),0)
        revision = next((h for h in history if h['title']=='Avant'),history[-1])
        restored = self.ok(self.admin.api('restore_revision',{'id':p['id'],'revision_id':revision['id'],'version':p['version']}))['page']
        self.assertEqual(restored['title'],revision['title']); self.assertEqual(restored['visibility'],'private')
        self.rejected(self.admin.api('move',{'id':restored['id'],'parent_id':restored['id'],'version':restored['version'],'sort_order':0}))
    def test_07_render_escapes_user_text(self):
        content={'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'<script>window.evil=1</script>', 'marks':[{'type':'link','attrs':{'href':'javascript:alert(1)'}}]}]},{'type':'buttonLink','attrs':{'href':'javascript:alert(2)','label':'Lien'}},{'type':'callout','attrs':{'tone':'blue','icon':'<img src=x onerror=alert(3)>'},'content':[{'type':'paragraph'}]}]}
        p=self.publish(self.page_save(title='<img src=x onerror=alert(4)>',content=content))
        html=self.ok(self.visitor.api('render',query='&id='+p['id']))['html']
        self.assertNotIn('<script>',html)
        self.assertNotIn('href="javascript:',html)
        self.assertNotIn('<img src=x onerror=',html)
        self.assertIn('&lt;script&gt;',html)
    def test_08_export_and_import(self):
        response = self.admin.api('export'); self.assertEqual(response[0],200,response[1])
        archive = response[1]; self.assertIsInstance(archive,bytes)
        with zipfile.ZipFile(io.BytesIO(archive)) as z:
            names = z.namelist(); self.assertTrue(any(n.endswith('.json') for n in names)); self.assertTrue(any(n.endswith('.html') for n in names)); self.assertTrue(any(self.file['id'] in n for n in names))
        before=self.ok(self.admin.api('pages'))['pages']; previous_ids={p['id'] for p in before}
        restored=self.ok(self.admin.upload('import','backup.zip',archive,'application/zip'))
        after=self.ok(self.admin.api('pages'))['pages']; imported=[p for p in after if p['id'] not in previous_ids]
        self.assertEqual(len(imported),restored['pages']); self.assertTrue(all(p['visibility']=='private' for p in imported))
        for p in imported: self.ok(self.visitor.api('page',query='&id='+p['id']),404)
        bad = io.BytesIO()
        with zipfile.ZipFile(bad,'w') as z: z.writestr('../escape.txt','unsafe'); z.writestr('manifest.json','{}')
        self.rejected(self.admin.upload('import','malicious.zip',bad.getvalue(),'application/zip'))
        self.assertFalse((self.install.parent/'escape.txt').exists())


    def test_09_search_uses_published_text(self):
        def paragraph(text): return {'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':text}]}]}
        p=self.publish(self.page_save(title='Recherche publique',content=paragraph('PHOTOVOLTAIQUE_VISIBLE_913')))
        p=self.page_save(p,title='Titre confidentiel nouveau',content=paragraph('NOCTURNE_BROUILLON_914'))
        visible=self.ok(self.visitor.api('search',query='&q=PHOTOVOLTAIQUE_VISIBLE_913'))['pages']
        self.assertIn(p['id'],[item['id'] for item in visible])
        self.assertNotIn('Titre confidentiel nouveau',json.dumps(visible))
        self.assertNotIn('NOCTURNE_BROUILLON_914',json.dumps(visible))
        self.assertEqual(self.ok(self.visitor.api('search',query='&q=NOCTURNE_BROUILLON_914'))['pages'],[])
        self.assertIn(p['id'],[item['id'] for item in self.ok(self.admin.api('search',query='&q=NOCTURNE_BROUILLON_914'))['pages']])
        private=self.page_save(title='Notes personnelles',content=paragraph('CONFIDENTIEL_PRIVE_915'))
        self.assertEqual(self.ok(self.visitor.api('search',query='&q=CONFIDENTIEL_PRIVE_915'))['pages'],[])
        self.assertIn(private['id'],[item['id'] for item in self.ok(self.admin.api('search',query='&q=CONFIDENTIEL_PRIVE_915'))['pages']])
    def test_10_private_page_links_and_quiz_search(self):
        private=self.page_save(title='Référence privée')
        quiz={'type':'quiz','attrs':{'quizId':'private-solutions','title':'Questions publiques','questions':[{'id':'a','type':'short','prompt':'QUESTION_VISIBLE_917','options':[],'correct':[],'answers':['SOLUTION_RESERVEE_918'],'explanation':'EXPLICATION_RESERVEE_919'}]}}
        link={'type':'pageLink','attrs':{'pageId':private['id'],'label':'LABEL_CONFIDENTIEL_916','icon':'🔒'}}
        p=self.publish(self.page_save(title='Ressources de recherche',content={'type':'doc','content':[link,quiz]}))
        visible=self.ok(self.visitor.api('page',query='&id='+p['id']))['page']
        rendered=self.ok(self.visitor.api('render',query='&id='+p['id']))['html']
        for forbidden in ['LABEL_CONFIDENTIEL_916',private['id'],'SOLUTION_RESERVEE_918','EXPLICATION_RESERVEE_919']:
            self.assertNotIn(forbidden,json.dumps(visible)); self.assertNotIn(forbidden,rendered)
        for term in ['LABEL_CONFIDENTIEL_916','SOLUTION_RESERVEE_918','EXPLICATION_RESERVEE_919']:
            self.assertEqual(self.ok(self.visitor.api('search',query='&q='+term))['pages'],[])
        matched=self.ok(self.visitor.api('search',query='&q=QUESTION_VISIBLE_917'))['pages']
        self.assertIn(p['id'],[item['id'] for item in matched])
    def test_11_pdf_viewer_obeys_file_visibility(self):
        viewer='pdf-viewer.php?id='+self.file['id']
        status,html,_=self.visitor.request(viewer)
        self.assertEqual(status,200); self.assertIn(b'pdf-canvas',html)
        p=self.ok(self.admin.api('visibility',{'id':self.page['id'],'version':self.page['version'],'visibility':'private'}))['page']
        self.ok(self.visitor.request(viewer),404)
        self.assertEqual(self.admin.request(viewer)[0],200)
        self.ok(self.visitor.request('pdf-viewer.php?id='+str(uuid.uuid4())),404)
        self.publish(p)

    def test_12_spaces_move_and_privacy(self):
        a=self.ok(self.admin.api('save_space',{'name':'Espace privé secret','icon':'📚'}))['id']
        b=self.ok(self.admin.api('spaces',{'name':'Cours publics','icon':'🌍'}))['id']
        self.assertNotIn(a,[s['id'] for s in self.ok(self.visitor.api('spaces'))['spaces']])
        parent=self.page_save(title='Dans un espace',space_id=a)
        child=self.page_save(title='Enfant dans espace',parent_id=parent['id'])
        self.assertEqual(child['space_id'],a)
        moved=self.ok(self.admin.api('move',{'id':parent['id'],'version':parent['version'],'parent_id':None,'space_id':b,'sort_order':0}))['page']
        child=self.ok(self.admin.api('page',query='&id='+child['id']))['page'];self.assertEqual(moved['space_id'],b);self.assertEqual(child['space_id'],b)
        moved=self.publish(moved)
        public=self.ok(self.visitor.api('pages'));self.assertIn(b,[s['id'] for s in public['spaces']]);self.assertNotIn(a,[s['id'] for s in public['spaces']])
        self.ok(self.admin.api('delete_space',{'id':b}))
        self.assertIsNone(self.ok(self.admin.api('page',query='&id='+moved['id']))['page']['space_id'])
        self.assertIsNone(self.ok(self.visitor.api('page',query='&id='+moved['id']))['page']['space_id'])
        type(self).test_space=a
    def test_13_styles_icon_and_cover_persistence(self):
        import base64
        image=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
        f=self.ok(self.admin.upload('upload','icone.png',image,'image/png'))['file']
        self.ok(self.visitor.request(f['url']),404)
        appearance={'font':'serif','background':'#FDF6E3','text':'#37352F','accent':'#337EA9','width':'wide','focus':True}
        self.ok(self.admin.api('settings',{'appearance':appearance}))
        self.assertEqual(self.ok(self.visitor.api('settings'))['appearance']['font'],'serif')
        self.rejected(self.admin.api('settings',{'appearance':{'background':'red;position:absolute'}}))
        p=self.page_save(title='Page stylisée',icon_id=f['id'],cover_id=f['id'],appearance={'font':'mono','text':'#D44C47'})
        p=self.page_save(p,title='Couverture conservée')
        self.assertEqual(p['cover_id'],f['id']);self.assertEqual(p['icon_id'],f['id']);self.assertEqual(p['appearance']['font'],'mono')
        p=self.publish(p);self.assertEqual(self.visitor.request(f['url'])[0],200)
        status,html,_=self.visitor.request('index.php?page='+p['id']+'&read=1');self.assertEqual(status,200);self.assertIn(b'page-icon-image',html);self.assertIn(b'#D44C47',html)
        draft=self.page_save(p,title='Impression brouillon privé')
        status,html,_=self.admin.request('index.php?page='+p['id']+'&read=1&print=1');self.assertEqual(status,200);self.assertIn('Impression brouillon privé'.encode(),html)
        status,html,_=self.visitor.request('index.php?page='+p['id']+'&read=1&print=1');self.assertEqual(status,200);self.assertNotIn('Impression brouillon privé'.encode(),html)
        type(self).icon_file=f
    def test_14_manual_gallery_and_formatting(self):
        public=self.publish(self.page_save(title='Carte publique'))
        private=self.page_save(title='Carte secrète')
        gallery={'type':'gallery','attrs':{'manual':True,'pageIds':[public['id'],private['id']],'layout':'list','columns':4,'rows':2,'aspect':'1/1','title':'Sélection'}}
        formatted={'type':'paragraph','content':[{'type':'text','text':'Texte coloré','marks':[{'type':'textStyle','attrs':{'color':'#D44C47'}},{'type':'highlight','attrs':{'color':'#EDF3EC'}}]}]}
        image={'type':'image','attrs':{'fileId':self.icon_file['id'],'src':self.icon_file['url'],'width':45,'align':'right','alt':'Illustration'}}
        p=self.publish(self.page_save(title='Galerie manuelle',content={'type':'doc','content':[gallery,formatted,image]}))
        doc=self.ok(self.visitor.api('page',query='&id='+p['id']))['page']['content'];self.assertEqual(doc['content'][0]['attrs']['pageIds'],[public['id']]);self.assertNotIn(private['id'],json.dumps(doc))
        html=self.ok(self.visitor.api('render',query='&id='+p['id']))['html'];self.assertIn('Carte publique',html);self.assertNotIn('Carte secrète',html);self.assertIn('layout-list',html);self.assertIn('width:45%',html);self.assertIn('#D44C47',html);self.assertIn('#EDF3EC',html)
        empty=self.publish(self.page_save(title='Galerie vide',content={'type':'doc','content':[{'type':'gallery','attrs':{'manual':True,'pageIds':[]}}]}))
        self.assertNotIn('Carte publique',self.ok(self.visitor.api('render',query='&id='+empty['id']))['html'])
    def test_15_rename_file_consistency(self):
        f=self.ok(self.admin.upload('upload','original.txt',b'Fichier de cours','text/plain'))['file']
        block={'type':'fileBlock','attrs':{'fileId':f['id'],'name':f['name'],'mime':f['mime'],'size':f['size'],'mode':'download'}}
        p=self.publish(self.page_save(title='Renommage',content={'type':'doc','content':[block]}))
        renamed=self.ok(self.admin.api('rename_file',{'id':f['id'],'name':'Nouveau nom'}))
        self.assertEqual(renamed['file']['name'],'Nouveau nom.txt')
        for client in [self.admin,self.visitor]:
            doc=self.ok(client.api('page',query='&id='+p['id']))['page'];self.assertEqual(doc['content']['content'][0]['attrs']['name'],'Nouveau nom.txt')
        current=self.ok(self.admin.api('page',query='&id='+p['id']))['page'];self.assertGreater(current['version'],p['version'])
        revision=self.ok(self.admin.api('history',query='&id='+p['id']))['history'][-1]
        restored=self.ok(self.admin.api('restore_revision',{'id':p['id'],'version':current['version'],'revision_id':revision['id']}))['page'];self.assertEqual(restored['content']['content'][0]['attrs']['name'],'Nouveau nom.txt')
        self.rejected(self.admin.api('rename_file',{'id':f['id'],'name':'executable.php'}))
    def test_16_markdown_import_export(self):
        source="""# Énergie et objets

## Comprendre

### Observer

Du **texte gras** et [une source](https://example.org).

- Premier
  - Sous-liste
- Deuxième

1. Étape
2. Suite

- [x] Terminé
- [ ] À faire

> Une citation

| Objet | Fonction |
| --- | --- |
| Lampe | Éclairer |

```html
<script>alert(1)</script>
```

![Illustration](https://example.org/image.png)
"""
        page=self.ok(self.admin.upload('import_markdown','cours.md',source.encode(),'text/markdown',fields={'space_id':self.test_space}))['page']
        self.assertEqual(page['title'],'Énergie et objets');self.assertEqual(page['space_id'],self.test_space);self.assertEqual(page['visibility'],'private')
        def types(node): return [node['type']]+[t for child in node.get('content',[]) for t in types(child)]
        found=types(page['content'])
        for kind in ['heading','bulletList','orderedList','taskList','blockquote','table','codeBlock','image']:self.assertIn(kind,found)
        self.assertGreater(found.count('bulletList'),1)
        html=self.ok(self.admin.api('render',query='&id='+page['id']))['html'];self.assertNotIn('<script>',html);self.assertIn('&lt;script&gt;',html)
        status,raw,headers=self.admin.api('export_markdown',query='&id='+page['id']);self.assertEqual(status,200);self.assertIn('attachment',headers['Content-Disposition']);self.assertIn('Énergie'.encode(),raw)
        imported=self.ok(self.admin.upload('import_markdown','retour.md',raw,'text/markdown'))['page'];self.assertEqual(imported['content'],page['content'])
    def test_17_backup_v3_fields(self):
        status,archive,_=self.admin.api('export');self.assertEqual(status,200)
        with zipfile.ZipFile(io.BytesIO(archive)) as z:manifest=json.loads(z.read('manifest.json'))
        self.assertEqual(manifest['version'],3);self.assertIn('spaces',manifest);self.assertIn('settings',manifest);self.assertIn('categories',manifest)
        previous={p['id'] for p in self.ok(self.admin.api('pages'))['pages']}
        self.ok(self.admin.upload('import','v2.zip',archive,'application/zip'))
        imported=[p for p in self.ok(self.admin.api('pages'))['pages'] if p['id'] not in previous]
        self.assertTrue(any(p['icon_id'] for p in imported));self.assertTrue(any(p['space_id'] for p in imported));self.assertTrue(all(p['visibility']=='private' for p in imported))
        icon_page=next(p for p in imported if p['icon_id']);self.assertNotEqual(icon_page['icon_id'],self.icon_file['id'])
        for p in imported:
            doc=self.ok(self.admin.api('page',query='&id='+p['id']))['page']['content']
            for node in doc.get('content',[]):
                if node['type']=='gallery' and node['attrs'].get('manual'):self.assertTrue(all(id not in previous for id in node['attrs'].get('pageIds',[])))
    def test_18_image_import_rejects_arbitrary_urls(self):
        self.rejected(self.admin.api('image_import',{'url':'http://127.0.0.1/private'}))
        self.rejected(self.admin.api('image_import',{'title':'https://example.org/image.png'}))
        self.rejected(self.admin.api('image_import',{'title':'File:bad|https://example.org'}))
        self.ok(self.visitor.api('image_search',query='&q=cat'),401)

    @unittest.skipUnless(ARGS.network,'Live Commons test requires --network')
    def test_19_live_commons_import_and_attribution(self):
        images=self.ok(self.admin.api('image_search',query='&q=solar%20panel'))['images'];self.assertGreater(len(images),0)
        self.assertTrue(images[0]['title'].startswith('File:'))
        f=self.ok(self.admin.api('image_import',{'title':images[0]['title']}))['file']
        self.assertTrue(f['mime'].startswith('image/'));self.assertIsNotNone(f['attribution']);self.assertTrue(f['attribution']['source_url'].startswith('https://commons.wikimedia.org/'))
        self.ok(self.visitor.api('file_info',query='&id='+f['id']),404)
        p=self.publish(self.page_save(title='Crédits Commons',cover_id=f['id'],icon_id=f['id'],content={'type':'doc','content':[{'type':'image','attrs':{'fileId':f['id'],'src':f['url'],'alt':f['name']}}]}))
        public=self.ok(self.visitor.api('page',query='&id='+p['id']))['page'];self.assertEqual(public['cover_attribution'],f['attribution']);self.assertEqual(public['icon_attribution'],f['attribution'])
        self.assertEqual(self.ok(self.visitor.api('file_info',query='&id='+f['id']))['file']['attribution'],f['attribution'])
        status,html,_=self.visitor.request('index.php?page='+p['id']+'&read=1');self.assertEqual(status,200);self.assertIn(f['attribution']['author'].encode(),html);self.assertIn(f['attribution']['license'].encode(),html)

    def test_20_idempotent_legacy_migration(self):
        baseline=self.ok(self.admin.api('pages'))['pages']
        saved={p['id']:(p['title'],p['version'],p['cover_id']) for p in baseline}
        sql='ALTER TABLE pages DROP COLUMN space_id; ALTER TABLE pages DROP COLUMN icon_id; ALTER TABLE pages DROP COLUMN appearance; ALTER TABLE files DROP COLUMN attribution; DROP TABLE spaces; DROP TABLE app_settings;'
        if ARGS.mysql:
            command=[shutil.which('mysql') or 'mysql','--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+str(self.mysql_port),'--user=root','feuillet_test','--execute='+sql]
            result=subprocess.run(command,capture_output=True,text=True);self.assertEqual(result.returncode,0,result.stderr)
        else:
            import sqlite3
            with sqlite3.connect(self.install/'storage'/'feuillet.sqlite') as connection: connection.executescript(sql)
        for _ in range(2):
            current=self.ok(self.admin.api('pages'))['pages'];self.assertEqual({p['id']:(p['title'],p['version'],p['cover_id']) for p in current},saved)
            self.assertTrue(all(p['space_id'] is None and p['icon_id'] is None for p in current))
            self.assertEqual(self.ok(self.admin.api('settings'))['appearance']['font'],'sans')

    def test_21_publication_cascades_and_private_revokes_tree(self):
        parent=self.page_save(title='Publication parent 0.3')
        child=self.page_save(title='Publication enfant 0.3',parent_id=parent['id'])
        leaf=self.page_save(title='Publication petit-enfant 0.3',parent_id=child['id'])
        result=self.ok(self.admin.api('publish',{'id':parent['id'],'version':parent['version']}))
        self.assertEqual(result['published_count'],3)
        for p in [parent,child,leaf]:self.assertEqual(self.ok(self.visitor.api('page',query='&id='+p['id']))['page']['visibility'],'public')
        self.ok(self.admin.api('visibility',{'id':parent['id'],'version':parent['version'],'visibility':'private'}))
        for p in [parent,child,leaf]:self.ok(self.visitor.api('page',query='&id='+p['id']),404)

if __name__=='__main__': unittest.main(argv=[__file__]+REMAINING,verbosity=2)
