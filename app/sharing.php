<?php
declare(strict_types=1);
require_once __DIR__.'/public-home.php';

function share_path_valid(mixed $path): bool {
    return is_string($path) && strlen($path)<=64 && preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/', $path);
}

function share_page_id(mixed $path): ?string {
    if (!share_path_valid($path)) return null;
    $id=query('SELECT value FROM app_settings WHERE name=?', ['share-path:'.$path])->fetchColumn();
    return $id===false ? null : $id;
}

function share_paths_by_page(): array {
    $paths=[];
    foreach (query("SELECT name,value FROM app_settings WHERE name LIKE 'share-page:%'") as $row) {
        $paths[substr($row['name'], strlen('share-page:'))]=$row['value'];
    }
    return $paths;
}

/** A preferred address can change, but a previously shared address keeps its owner. */
function save_share_path(array $input): array {
    $id=str_limit($input['id']??'',36);
    if (!preg_match('/\A[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\z/', $id)) fail('Page introuvable.',404,'not_found');
    $raw=$input['path']??null;
    if (!is_string($raw)) fail('Adresse invalide.');
    $path=strtolower(trim($raw));
    if (str_starts_with($path,'/')) $path=substr($path,1);
    if ($path!=='' && !share_path_valid($path)) {
        fail('Utilise jusqu’à 64 lettres sans accent ou chiffres, séparés par des tirets.');
    }
    $publicPath=FEUILLET_ROOT.'/public/'.$path;
    if ($path!=='' && (file_exists($publicPath) || glob($publicPath.'.*'))) {
        fail('Cette adresse est réservée par Feuillet.',409,'share_path_reserved');
    }
    $pdo=db();
    $pdo->beginTransaction();
    try {
        // Serialize address edits for this page without changing its content version.
        query('UPDATE pages SET id=id WHERE id=?', [$id]);
        get_page($id);
        if ($path!=='') {
            $owner=share_page_id($path);
            if ($owner!==null && $owner!==$id) fail('Cette adresse est déjà utilisée.',409,'share_path_taken');
            if ($owner===null) {
                try {
                    query('INSERT INTO app_settings (name,value) VALUES (?,?)', ['share-path:'.$path,$id]);
                } catch (PDOException $error) {
                    if ($error->getCode()==='23000') fail('Cette adresse est déjà utilisée.',409,'share_path_taken');
                    throw $error;
                }
            }
        }
        $key='share-page:'.$id;
        query('DELETE FROM app_settings WHERE name=?', [$key]);
        if ($path!=='') query('INSERT INTO app_settings (name,value) VALUES (?,?)', [$key,$path]);
        $pdo->commit();
        return ['path'=>$path==='' ? null : $path];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

/** Resolve an address as a fresh sharing root, regardless of extra query parameters. */
function resolve_share_request(): void {
    unset($_GET['page'], $_GET['root']);
    $id=share_page_id($_GET['share']);
    if ($id===null) fail('Page introuvable.',404,'not_found');
    $_GET['page']=$id;
}

function redirect_shared_editor(): never {
    $page=get_page($_GET['page']);
    header('Location: index.php?edit=1&page='.rawurlencode($page['slug']));
    exit;
}

/** A shared link establishes its own public navigation root. It is not a password. */
function reader_scope_active(): bool { return array_key_exists('feuillet_reader_scope',$GLOBALS); }
function reader_root_id(): ?string { return $GLOBALS['feuillet_reader_root']??null; }
function reader_page_allowed(string $id): bool { return !reader_scope_active()||isset($GLOBALS['feuillet_reader_scope'][$id]); }
function reader_scope_request(string $fallback=''): void {
    $requested=str_limit($_GET['root']??($_GET['page']??$fallback),190);
    $GLOBALS['feuillet_reader_scope']=[];$GLOBALS['feuillet_reader_root']=null;$GLOBALS['feuillet_reader_home']=false;
    $explicit=(bool)$requested;$home=public_home_id();if(!$requested)$requested=$home??'';if(!$requested)return;
    $all=page_rows();$root=null;foreach($all as $row)if($row['id']===$requested||$row['slug']===$requested){$root=$row;break;}
    if(!$root||$root['deleted_at']||$root['visibility']!=='public'||!$root['published']||!ancestors_active($root,$all)){if(!$explicit)return;fail('Page introuvable.',404,'not_found');}
    if($root['id']===$home){reader_home_scope($root,$all);return;}
    $GLOBALS['feuillet_reader_root']=$root['id'];
    $pending=[$root['id']];$seen=[];$children=[];foreach($all as $row)if($row['parent_id'])$children[$row['parent_id']][]=$row['id'];
    // Stop at unpublished/private parents: their branches must not appear to readers.
    while($pending){$id=array_pop($pending);if(isset($seen[$id]))continue;$seen[$id]=true;$row=$all[$id]??null;
        if(!$row||$row['deleted_at']||$row['visibility']!=='public'||!$row['published'])continue;
        $GLOBALS['feuillet_reader_scope'][$id]=true;foreach($children[$id]??[] as $child)$pending[]=$child;
    }
}
function reader_page_url(array $page): string {
    return 'index.php?page='.rawurlencode($page['slug']??$page['id']).'&read=1'.(reader_root_id()?'&root='.rawurlencode(reader_is_home()&&$page['id']!==reader_root_id()?$page['id']:reader_root_id()):'');
}
function render_powered_by(): string {
    return '<footer class="feuillet-credit"><span>Propulsé par <a href="https://github.com/monsieur-de-paz/feuillet" target="_blank" rel="noopener noreferrer">Feuillet '.htmlspecialchars(FEUILLET_VERSION,ENT_QUOTES,'UTF-8').'</a>, créé par Monsieur de PAZ, enseignant en France.</span></footer>';
}
