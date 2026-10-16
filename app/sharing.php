<?php
declare(strict_types=1);
require_once __DIR__.'/public-home.php';

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
