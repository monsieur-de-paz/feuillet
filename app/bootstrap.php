<?php
declare(strict_types=1);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

const FEUILLET_VERSION = '0.6.1';
const FEUILLET_ROOT = __DIR__ . '/..';

function cfg(): array {
    static $config;
    if ($config === null) {
        $path = getenv('FEUILLET_CONFIG') ?: FEUILLET_ROOT . '/config.php';
        $config = is_file($path) ? require $path : [];
    }
    return $config;
}
function installed(): bool { return !empty(cfg()['password_hash']); }
function storage(): string { return cfg()['storage'] ?? FEUILLET_ROOT . '/storage'; }
function db(): PDO {
    if (isset($GLOBALS['feuillet_pdo'])) return $GLOBALS['feuillet_pdo'];
    $c = cfg();
    if (($c['driver'] ?? '') === 'sqlite') {
        $pdo = new PDO('sqlite:' . $c['sqlite_path']);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA busy_timeout = 5000');
    } else {
        $pdo = new PDO('mysql:host=' . $c['db_host'] . ';port=' . ($c['db_port'] ?? 3306) . ';dbname=' . $c['db_name'] . ';charset=utf8mb4', $c['db_user'], $c['db_password']);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    $GLOBALS['feuillet_pdo'] = $pdo;
    migrate_schema($pdo);
    return $pdo;
}
function schema(PDO $pdo): void {
    $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    $text = $mysql ? 'LONGTEXT' : 'TEXT';
    $suffix = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
    $pdo->exec("CREATE TABLE IF NOT EXISTS pages (id VARCHAR(36) PRIMARY KEY, slug VARCHAR(190) NOT NULL UNIQUE, parent_id VARCHAR(36) NULL, title VARCHAR(255) NOT NULL, icon VARCHAR(64) NOT NULL, cover_id VARCHAR(36) NULL, kind VARCHAR(16) NOT NULL, description TEXT NOT NULL, tags TEXT NOT NULL, source_url TEXT NOT NULL, source_name VARCHAR(255) NOT NULL, content $text NOT NULL, visibility VARCHAR(16) NOT NULL, published $text NULL, published_at VARCHAR(32) NULL, sort_order INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1, deleted_at VARCHAR(32) NULL, created_at VARCHAR(32) NOT NULL, updated_at VARCHAR(32) NOT NULL)$suffix");
    $pdo->exec("CREATE TABLE IF NOT EXISTS revisions (id VARCHAR(36) PRIMARY KEY, page_id VARCHAR(36) NOT NULL, version INTEGER NOT NULL, title VARCHAR(255) NOT NULL, snapshot $text NOT NULL, created_at VARCHAR(32) NOT NULL)$suffix");
    $pdo->exec("CREATE TABLE IF NOT EXISTS files (id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, mime VARCHAR(190) NOT NULL, size BIGINT NOT NULL, path VARCHAR(64) NOT NULL, created_at VARCHAR(32) NOT NULL)$suffix");
    migrate_schema($pdo);
}
function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $dir = storage() . '/sessions';
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    session_save_path($dir);
    session_name('feuillet_session');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    session_set_cookie_params(['lifetime'=>0,'path'=>cookie_path(),'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','httponly'=>true,'samesite'=>'Lax']);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    if (!empty($_SESSION['admin']) && ($_SESSION['last_seen'] ?? 0) < time() - 43200) unset($_SESSION['admin']);
    if (!empty($_SESSION['admin'])) $_SESSION['last_seen'] = time();
}
function cookie_path(): string { $p = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')); return rtrim($p, '/') . '/'; }
function admin(): bool { start_session(); return !empty($_SESSION['admin']); }
function need_admin(): void { if (!admin()) fail('Connexion nécessaire.', 401, 'authentication_required'); }
function csrf(): void {
    start_session();
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf'] ?? '');
    if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) fail('Session expirée. Recharge la page.', 403, 'csrf');
}
function fail(string $message, int $status = 400, string $code = 'invalid_request'): never { throw new AppError($message, $status, $code); }
class AppError extends RuntimeException { public function __construct(string $message, public int $status=400, public string $errorCode='invalid_request') { parent::__construct($message); } }
function json_out(array $data, int $status=200): never { http_response_code($status); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_INVALID_UTF8_SUBSTITUTE); exit; }
function json_in(): array {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4 * 1024 * 1024) fail('Cette page est trop volumineuse.', 413);
    $raw=file_get_contents('php://input',false,null,0,4*1024*1024+1);
    if($raw===false)fail('Données illisibles.');
    if(strlen($raw)>4*1024*1024)fail('Cette page est trop volumineuse.',413);
    try { $v = json_decode($raw, true, 80, JSON_THROW_ON_ERROR); }
    catch (Throwable) { fail('Données JSON invalides.'); }
    if (!is_array($v)) fail('Données invalides.');
    return $v;
}
function query(string $sql, array $args=[]): PDOStatement { $q = db()->prepare($sql); $q->execute($args); return $q; }
function uuid(): string { $b=random_bytes(16); $b[6]=chr((ord($b[6])&15)|64); $b[8]=chr((ord($b[8])&63)|128); $h=bin2hex($b); return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20); }
function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
function str_limit(mixed $s, int $max=255): string { if (!is_string($s)) return ''; return mb_substr(trim($s),0,$max); }
function encoded(mixed $v): string { return json_encode($v, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR); }
function safe_url(mixed $url): string {
    if (!is_string($url)) return '';
    $url=trim($url);
    if (preg_match('~^https?://[^\s<>]+$~iu', $url) && !preg_match('/[\x00-\x20]/', $url)) return $url;
    if (preg_match('~^mailto:[^\s<>]+$~iu', $url)) return $url;
    return '';
}
function headers_secure(): void {
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('X-Frame-Options: SAMEORIGIN');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; connect-src 'self'; font-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header('Cache-Control: no-store');
}
function limit_rate(string $scope, int $max, int $window): void {
    $dir=storage().'/limits'; if(!is_dir($dir)) mkdir($dir,0700,true);
    $key=hash_hmac('sha256',$scope.'|'.($_SERVER['REMOTE_ADDR']??'local'),cfg()['secret']??'setup');
    $fp=fopen($dir.'/'.$key.'.json','c+'); if(!$fp) fail('Service temporairement indisponible.',503);
    flock($fp,LOCK_EX); $rows=json_decode(stream_get_contents($fp)?:'[]',true)?:[];
    $rows=array_values(array_filter($rows,fn($t)=>is_int($t)&&$t>time()-$window));
    if(count($rows)>=$max){flock($fp,LOCK_UN);fclose($fp);fail('Trop de tentatives. Réessaie dans quelques minutes.',429,'rate_limit');}
    $rows[]=time(); ftruncate($fp,0);rewind($fp);fwrite($fp,encoded($rows));flock($fp,LOCK_UN);fclose($fp);
}
function normalize_doc(mixed $doc): array {
    if (!is_array($doc) || ($doc['type']??'') !== 'doc') fail('Document invalide.');
    $count=0; $walk=function($node,$depth) use (&$walk,&$count): array {
        if (!is_array($node) || ++$count>12000 || $depth>32) fail('Document trop complexe.');
        $types=['doc','paragraph','text','heading','bulletList','orderedList','listItem','taskList','taskItem','blockquote','horizontalRule','hardBreak','codeBlock','table','tableRow','tableCell','tableHeader','callout','columns','column','details','toggleHeading','pageLink','buttonLink','bookmark','fileBlock','image','gallery','quiz','databaseView','formView'];
        if(!in_array($node['type']??'', $types, true)) fail('Type de bloc inconnu : '.str_limit($node['type']??'',40));
        $out=['type'=>$node['type']];
        if($node['type']==='text'){if(!is_string($node['text']??null))fail('Texte de bloc invalide.');$out['text']=$node['text'];}
        if(isset($node['attrs'])) {
            if(!is_array($node['attrs'])) fail('Attributs de bloc invalides.');
            $out['attrs']=$node['attrs'];
            if(strlen(encoded($out['attrs']))>250000) fail('Bloc trop volumineux.');
            if($node['type']==='quiz') validate_quiz($out['attrs']);
            foreach(['href','src'] as $key)if(isset($out['attrs'][$key]))$out['attrs'][$key]=safe_url($out['attrs'][$key]);
            if($node['type']==='databaseView'){$id=str_limit($out['attrs']['dbId']??'',36);database_record($id);$out['attrs']=['dbId'=>$id,'viewConfig'=>database_view_config($id,$out['attrs']['viewConfig']??[])];}
            if($node['type']==='formView'){$id=str_limit($out['attrs']['formId']??'',36);if(!query('SELECT id FROM collection_forms WHERE id=?',[$id])->fetch())fail('Formulaire introuvable.');$out['attrs']=['formId'=>$id];}
            if($node['type']==='gallery'){ $out['attrs']['pageIds']=array_values(array_unique(array_filter(array_slice(is_array($out['attrs']['pageIds']??null)?$out['attrs']['pageIds']:[],0,500),fn($id)=>is_string($id)&&preg_match('/^[a-f0-9-]{36}$/',$id))));$out['attrs']['columns']=max(1,min(6,(int)($out['attrs']['columns']??2)));$out['attrs']['rows']=max(0,min(12,(int)($out['attrs']['rows']??2)));$out['attrs']['layout']=($out['attrs']['layout']??'grid')==='list'?'list':'grid';$out['attrs']['aspect']=in_array($out['attrs']['aspect']??'', ['16/9','4/3','1/1','3/4','auto'],true)?$out['attrs']['aspect']:'16/9'; }
            if($node['type']==='image'&&!empty($out['attrs']['fileId']))$out['attrs']['src']='media.php?id='.rawurlencode((string)$out['attrs']['fileId']);
            if($node['type']==='image'){ $out['attrs']['width']=max(10,min(100,(int)($out['attrs']['width']??100)));$out['attrs']['align']=in_array($out['attrs']['align']??'',['left','center','right'],true)?$out['attrs']['align']:'center'; }
            if($node['type']==='fileBlock' || ($node['type']==='image' && !empty($out['attrs']['fileId']))) {
                $id=$out['attrs']['fileId']??'';
                if(!is_string($id)||!query('SELECT id FROM files WHERE id=?',[$id])->fetch()) fail('Pièce jointe introuvable.');
            }
        }
        if(isset($node['marks'])) {
            if(!is_array($node['marks'])||count($node['marks'])>20)fail('Mise en forme invalide.');
            $out['marks']=[];
            foreach($node['marks'] as $m) {
                if(!is_array($m)||!in_array($m['type']??'', ['bold','italic','underline','strike','code','highlight','link','textStyle','subscript','superscript'],true)) continue;
                if(($m['type']??'')==='link') $m['attrs']=['href'=>safe_url($m['attrs']['href']??'')];
                if(in_array($m['type']??'',['textStyle','highlight'],true))$m['attrs']=['color'=>css_color($m['attrs']['color']??'')];
                if(($m['type']??'')==='textStyle'&&in_array(strtolower($m['attrs']['color']??''),['','#37352f'],true))continue;
                $out['marks'][]=$m;
            }
        }
        if(isset($node['content'])) {
            if(!is_array($node['content'])) fail('Contenu de bloc invalide.');
            $out['content']=array_values(array_filter(array_map(fn($n)=>$walk($n,$depth+1),$node['content']),fn($n)=>$n['type']!=='text'||$n['text']!==''));
        }
        if($out['type']==='toggleHeading') {
            $parts=$out['content']??[];
            if(count($parts)<2||($parts[0]['type']??'')!=='heading'||!in_array($parts[0]['attrs']['level']??null,[1,2,3],true))fail('Titre dépliable invalide.');
            foreach(array_slice($parts,1) as $part)if(in_array($part['type'],['text','hardBreak','doc'],true))fail('Contenu du titre dépliable invalide.');
            unset($out['attrs']);
        }
        return $out;
    };
    return $walk($doc,0);
}
function validate_quiz(array $attrs): void {
    if(empty($attrs['quizId'])||!is_string($attrs['quizId'])) fail('Identifiant du quiz manquant.');
    $questions=$attrs['questions']??[];
    if(!is_array($questions)||count($questions)>50) fail('Un quiz peut contenir au maximum 50 questions.');
    $seen=[];
    foreach($questions as $q){
        if(!is_array($q)||!is_string($q['id']??null)||isset($seen[$q['id']])||!in_array($q['type']??'', ['single','multiple','boolean','short'],true)) fail('Question invalide.');
        $seen[$q['id']]=true;
        if(!is_array($q['options']??[])||count($q['options']??[])>20||!is_array($q['correct']??[])||!is_array($q['answers']??[])) fail('Réponses du quiz invalides.');
    }
}
function row_page(array $row, bool $public=false): array {
    if($public){ $p=json_decode($row['published']??'null',true); if(!is_array($p)) fail('Page introuvable.',404); $p['category_id']=$p['category_id']??null;$p['cover_position']=cover_position($p['cover_position']??null);$p['space_id']=$p['space_id']??null;$p['icon_id']=$p['icon_id']??null;$p['appearance']=$p['appearance']??[];$p['visibility']='public'; $p['parent_id']=$row['parent_id']; $p['sort_order']=(int)$row['sort_order']; $p['content']=public_doc($p['content']); $p['has_unpublished_changes']=false; return page_credits($p); }
    $row['content']=json_decode($row['content'],true);
    $row['appearance']=json_decode($row['appearance']??'{}',true)?:[];
    $row['category_id']=$row['category_id']??null;$row['cover_position']=cover_position(json_decode($row['cover_position']??'null',true));$row['space_id']=$row['space_id']??null; $row['icon_id']=$row['icon_id']??null;
    $row['tags']=json_decode($row['tags'],true)?:[];
    $row['version']=(int)$row['version']; $row['sort_order']=(int)$row['sort_order'];
    $published=json_decode($row['published']??'null',true);
    $row['has_unpublished_changes']=$row['visibility']==='public' && ($published['version']??0)!==$row['version'];
    unset($row['published']);
    return page_credits($row);
}
function public_doc(array $doc): array {
    if(($doc['type']??'')==='databaseView'&&!database_public(str_limit($doc['attrs']['dbId']??'',36)))return ['type'=>'paragraph'];
    if(($doc['type']??'')==='formView'){$id=str_limit($doc['attrs']['formId']??'',36);$f=query('SELECT is_public FROM collection_forms WHERE id=?',[$id])->fetch();if(!$f||!$f['is_public'])return ['type'=>'paragraph'];}

    if(($doc['type']??'')==='pageLink') {
        $id=$doc['attrs']['pageId']??'';
        $r=is_string($id)?query('SELECT * FROM pages WHERE id=?',[$id])->fetch():false;
        if(!$r||$r['deleted_at']||$r['visibility']!=='public'||!$r['published']||!ancestors_active($r,page_rows())||!reader_page_allowed($r['id'])) return ['type'=>'paragraph'];
    }
    if(($doc['type']??'')==='gallery'&&!empty($doc['attrs']['manual'])) { $doc['attrs']['pageIds']=array_values(array_filter($doc['attrs']['pageIds']??[],function($id){$r=is_string($id)?query('SELECT * FROM pages WHERE id=?',[$id])->fetch():false;return $r&&!$r['deleted_at']&&$r['visibility']==='public'&&$r['published']&&ancestors_active($r,page_rows())&&reader_page_allowed($r['id']);})); }
    if(($doc['type']??'')==='quiz') foreach($doc['attrs']['questions']??[] as $i=>$q){unset($q['correct'],$q['answers'],$q['explanation']);$doc['attrs']['questions'][$i]=$q;}
    foreach($doc['content']??[] as $i=>$child) $doc['content'][$i]=public_doc($child);
    return $doc;
}
function ancestors_active(array $row, array $all): bool {
    $seen=[];
    while(!empty($row['parent_id'])){
        if(isset($seen[$row['parent_id']])) return false;
        $seen[$row['parent_id']]=true;
        $row=$all[$row['parent_id']]??null;
        if(!$row || $row['deleted_at']) return false;
    }
    return true;
}
function page_rows(): array { $rows=query('SELECT * FROM pages ORDER BY sort_order, created_at')->fetchAll();return array_column($rows,null,'id'); }
function get_page(string $id, bool $forcePublic=false): array {
    $row=query('SELECT * FROM pages WHERE id=? OR slug=?',[$id,$id])->fetch();
    if(!$row||$row['deleted_at']||!ancestors_active($row,page_rows())) fail('Page introuvable.',404,'not_found');
    $public=$forcePublic||!admin();
    if($public && ($row['visibility']!=='public'||empty($row['published']))) fail('Page introuvable.',404,'not_found');
    if($public&&!reader_page_allowed($row['id']))fail('Page introuvable.',404,'not_found');
    $page=row_page($row,$public);if($public&&reader_scope_active()&&$page['id']===reader_root_id())$page['parent_id']=null;return $page;
}
function list_pages(): array {
    $all=page_rows();$isAdmin=admin();$pages=[];$trash=[];
    foreach($all as $row){
        if($row['deleted_at']){if($isAdmin){$p=row_page($row);unset($p['content']);$trash[]=$p;}continue;}
        if(!ancestors_active($row,$all))continue;
        if(!$isAdmin&&($row['visibility']!=='public'||empty($row['published'])||!reader_page_allowed($row['id'])))continue;
        $p=row_page($row,!$isAdmin);unset($p['content']);
        $pages[]=$p;
    }
    if(!$isAdmin){$ids=array_column($pages,'id');foreach($pages as &$p)if(!in_array($p['parent_id'],$ids,true))$p['parent_id']=null;unset($p);}
    return $isAdmin ? ['pages'=>$pages,'trash'=>$trash,'spaces'=>list_spaces(),'categories'=>categories_list(false,true)] : ['pages'=>$pages,'spaces'=>list_spaces(true),'categories'=>categories_list(true)];
}
function check_parent(?string $parent, ?string $id): void {
    $seen=$id?[$id=>true]:[];
    while($parent){ if(isset($seen[$parent])) fail('Une page ne peut pas contenir son propre parent.');$seen[$parent]=true;$r=query('SELECT parent_id,deleted_at FROM pages WHERE id=?',[$parent])->fetch();if(!$r||$r['deleted_at'])fail('Page parente introuvable.');$parent=$r['parent_id']; }
}
function revision_save(array $page): void {
    query('INSERT INTO revisions (id,page_id,version,title,snapshot,created_at) VALUES (?,?,?,?,?,?)',[uuid(),$page['id'],$page['version'],$page['title'],encoded($page),now()]);
    $old=query('SELECT id FROM revisions WHERE page_id=? ORDER BY created_at DESC, version DESC',[$page['id']])->fetchAll();
    foreach(array_slice($old,30) as $r)query('DELETE FROM revisions WHERE id=?',[$r['id']]);
}
function save_page(array $input): array {
    $id=isset($input['id'])?str_limit($input['id'],36):uuid();
    $existing=isset($input['id'])?get_page($id):null;
    if($existing && (int)($input['version']??-1)!==$existing['version'])fail('Cette page a été modifiée ailleurs. Recharge-la avant de continuer.',409,'conflict');
    $title=str_limit($input['title']??'Sans titre')?:'Sans titre';
    $parent=!empty($input['parent_id'])?str_limit($input['parent_id'],36):null;check_parent($parent,$id);
    $coverValue=array_key_exists('cover_id',$input)?$input['cover_id']:($existing['cover_id']??null);
    $cover=$coverValue?str_limit($coverValue,36):null;
    $iconValue=array_key_exists('icon_id',$input)?$input['icon_id']:($existing['icon_id']??null);$iconId=$iconValue?str_limit($iconValue,36):null;
    if($iconId){$f=query('SELECT mime FROM files WHERE id=?',[$iconId])->fetch();if(!$f||!str_starts_with($f['mime'],'image/'))fail('L’icône doit être une image.');}
    $spaceValue=array_key_exists('space_id',$input)?$input['space_id']:($existing['space_id']??($parent?query('SELECT space_id FROM pages WHERE id=?',[$parent])->fetchColumn():null));$spaceId=$spaceValue?str_limit($spaceValue,36):ensure_default_notebook();if($parent)$spaceId=query('SELECT space_id FROM pages WHERE id=?',[$parent])->fetchColumn()?:$spaceId;check_space($spaceId);
    $appearance=validate_appearance($input['appearance']??($existing['appearance']??[]),true);
    if($cover){$f=query('SELECT mime FROM files WHERE id=?',[$cover])->fetch();if(!$f||!str_starts_with($f['mime'],'image/'))fail('La couverture doit être une image.');}
    $content=normalize_doc($input['content']??['type'=>'doc','content'=>[['type'=>'paragraph']]]);
    $kind=in_array($input['kind']??($existing['kind']??''), ['page','article','class'],true)?($input['kind']??$existing['kind']):'page';
    $categoryValue=array_key_exists('category_id',$input)?$input['category_id']:($existing['category_id']??category_for_kind($spaceId,$kind));$categoryId=$categoryValue?str_limit($categoryValue,36):null;
    if($existing&&($existing['space_id']??null)!==$spaceId&&!array_key_exists('category_id',$input))$categoryId=category_for_kind($spaceId,$kind);category_validate($categoryId,$spaceId);
    $position=cover_position($input['cover_position']??($existing['cover_position']??null));
    $tags=array_values(array_unique(array_filter(array_map(fn($t)=>str_limit($t,50),is_array($input['tags']??null)?array_slice($input['tags'],0,30):[]))));
    $args=[$parent,$title,validate_icon($input['icon']??'📄'),$cover,$kind,str_limit($input['description']??'',2000),encoded($tags),safe_url($input['source_url']??''),str_limit($input['source_name']??''),encoded($content),now(),$spaceId,$iconId,encoded($appearance),$categoryId,encoded($position)];
    $pdo=db();$pdo->beginTransaction();
    try{
        if($existing){$q=query('UPDATE pages SET parent_id=?,title=?,icon=?,cover_id=?,kind=?,description=?,tags=?,source_url=?,source_name=?,content=?,updated_at=?,space_id=?,icon_id=?,appearance=?,category_id=?,cover_position=?,version=version+1 WHERE id=? AND version=?',array_merge($args,[$id,$existing['version']]));if($q->rowCount()!==1)fail('Conflit de modification.',409,'conflict');}
        else { $slug=substr(trim(preg_replace('/[^a-z0-9]+/','-',mb_strtolower(iconv('UTF-8','ASCII//TRANSLIT//IGNORE',$title)?:$title)),'-'),0,120)?:'page';$slug.='-'.substr($id,0,8);query('INSERT INTO pages (parent_id,title,icon,cover_id,kind,description,tags,source_url,source_name,content,updated_at,space_id,icon_id,appearance,category_id,cover_position,id,slug,visibility,sort_order,version,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',array_merge($args,[$id,$slug,'private',(int)($input['sort_order']??0),1,now()]));}
        if($parent)publish_inherited_children($parent);
        if($existing)auto_publish_page($id);
        $p=row_page(query('SELECT * FROM pages WHERE id=?',[$id])->fetch());revision_save($p);$pdo->commit();return $p;
    } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function files_in(array $doc): array {
    $ids=[];if(is_string($doc['attrs']['fileId']??null))$ids[]=$doc['attrs']['fileId'];
    foreach($doc['content']??[] as $child)$ids=array_merge($ids,files_in($child));
    return array_values(array_unique($ids));
}
function file_public(string $id): bool {
    if((notebook_settings()['icon_id']??null)===$id)return true;
    if(function_exists('database_file_public')&&database_file_public($id))return true;
    $all=page_rows();
    foreach($all as $row){if($row['deleted_at']||$row['visibility']!=='public'||!$row['published']||!ancestors_active($row,$all))continue;$p=json_decode($row['published'],true);if(($p['cover_id']??null)===$id||($p['icon_id']??null)===$id||in_array($id,files_in($p['content']??[]),true))return true;}
    return false;
}
function file_info(array $row): array { $row['attribution']=json_decode($row['attribution']??'null',true);unset($row['path']);$row['size']=(int)$row['size'];$row['url']='media.php?id='.rawurlencode($row['id']);return $row; }
function ini_bytes(string $s): int { $n=(float)$s;return (int)($n*match(strtolower(substr(trim($s),-1))){'g'=>1073741824,'m'=>1048576,'k'=>1024,default=>1}); }
function upload_limit(): int { return min(server_upload_limit(),(int)notebook_settings()['max_upload']); }
function receive_file(array $f): array { return persist_file($f,true); }
function persist_file(array $f,bool $uploaded=true,?array $attribution=null): array {
    if(($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)fail('Envoi échoué. Vérifie la taille maximale autorisée.',413,'upload_error');
    $name=str_limit(basename(str_replace('\\','/',$f['name']??'')),240);
    $ext=strtolower(pathinfo($name,PATHINFO_EXTENSION));
    $types=['pdf'=>'application/pdf','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','gif'=>'image/gif','webp'=>'image/webp','avif'=>'image/avif','mp3'=>'audio/mpeg','wav'=>'audio/wav','ogg'=>'audio/ogg','m4a'=>'audio/mp4','mp4'=>'video/mp4','webm'=>'video/webm','mov'=>'video/quicktime','txt'=>'text/plain','md'=>'text/plain','csv'=>'text/csv','json'=>'application/json','doc'=>'application/msword','docx'=>'application/vnd.openxmlformats-officedocument.wordprocessingml.document','odt'=>'application/vnd.oasis.opendocument.text','xls'=>'application/vnd.ms-excel','xlsx'=>'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','ods'=>'application/vnd.oasis.opendocument.spreadsheet','ppt'=>'application/vnd.ms-powerpoint','pptx'=>'application/vnd.openxmlformats-officedocument.presentationml.presentation','odp'=>'application/vnd.oasis.opendocument.presentation','zip'=>'application/zip','rtf'=>'application/rtf','epub'=>'application/epub+zip','stl'=>'application/octet-stream'];
    if(!isset($types[$ext]))fail('Ce format de fichier n’est pas autorisé.');
    $size=filesize($f['tmp_name']);if($size===false||$size>upload_limit())fail('Fichier trop volumineux.',413);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if(file_mime_forbidden((string)$mime))fail('Contenu de fichier refusé.');
    if($ext==='pdf'&&$mime!=='application/pdf')fail('Ce fichier n’est pas un PDF valide.');
    if(str_starts_with($types[$ext],'image/'))validate_image_file($f['tmp_name'],(string)$mime);
    $id=uuid();$path=bin2hex(random_bytes(24));$dir=storage().'/files';if(!is_dir($dir))mkdir($dir,0700,true);
    if(!($uploaded?move_uploaded_file($f['tmp_name'],$dir.'/'.$path):rename($f['tmp_name'],$dir.'/'.$path)))fail('Impossible de conserver ce fichier.',500);
    chmod($dir.'/'.$path,0600);
    try{query('INSERT INTO files (id,name,mime,size,path,created_at) VALUES (?,?,?,?,?,?)',[$id,$name,$types[$ext],$size,$path,now()]);if($attribution)query('UPDATE files SET attribution=? WHERE id=?',[encoded($attribution),$id]);}catch(Throwable $e){unlink($dir.'/'.$path);throw $e;}
    return file_info(query('SELECT * FROM files WHERE id=?',[$id])->fetch());
}
function file_mime_forbidden(string $mime): bool {
    return in_array($mime,['text/html','text/x-php','application/x-php','application/x-httpd-php','application/x-executable','application/x-pie-executable','application/x-sharedlib','application/x-dosexec','application/x-msdownload','image/svg+xml'],true);
}
function validate_image_file(string $path,string $mime): void {
    $dimensions=getimagesize($path);if(!$dimensions||!in_array($mime,['image/jpeg','image/png','image/gif','image/webp','image/avif'],true))fail('Image invalide.');
    if($dimensions[0]>20000||$dimensions[1]>20000||$dimensions[0]*$dimensions[1]>64000000)fail('Image trop grande (64 millions de pixels maximum).',413,'image_dimensions');
}
function descendants(string $id): array {
    $all=page_rows();$ids=[$id];for($i=0;$i<count($ids);$i++)foreach($all as $r)if($r['parent_id']===$ids[$i]&&!in_array($r['id'],$ids,true))$ids[]=$r['id'];return $ids;
}

require_once __DIR__.'/features.php';

require_once __DIR__.'/sharing.php';
