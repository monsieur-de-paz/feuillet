<?php
declare(strict_types=1);
require_once __DIR__.'/render.php';

/** Cheap polling token; never load or hash private form answers. */
function reader_token(?array $page): string {
    $state=['home'=>homepage_id(),'notebook'=>notebook_settings(),'appearance'=>global_appearance()];
    if(!$page)return hash('sha256',encoded($state));
    $state['page']=$page;$state['ancestors']=array_map(fn($p)=>[$p['id'],$p['title'],$p['version']],reader_ancestors($page));
    $dbs=[];$forms=[];$files=files_in($page['content']);foreach(['cover_id','icon_id'] as $key)if($page[$key]??null)$files[]=$page[$key];if(notebook_settings()['icon_id']??null)$files[]=notebook_settings()['icon_id'];
    $walk=function(array $node)use(&$walk,&$dbs,&$forms){$attrs=$node['attrs']??[];if(($node['type']??'')==='databaseView'&&!empty($attrs['dbId']))$dbs[$attrs['dbId']]=true;if(($node['type']??'')==='formView'&&!empty($attrs['formId']))$forms[$attrs['formId']]=true;foreach($node['content']??[] as $child)$walk($child);};$walk($page['content']);
    $all=page_rows();$visible=[];foreach($all as $row)if(!$row['deleted_at']&&$row['visibility']==='public'&&$row['published']&&ancestors_active($row,$all)){$p=row_page($row,true);$visible[$p['id']]=[$p['id'],$p['title'],$p['description'],$p['icon'],$p['icon_id'],$p['cover_id'],$p['cover_position'],$p['kind'],$p['source_name'],$p['parent_id'],$p['sort_order'],$p['cover_attribution']??null,$p['icon_attribution']??null];}
    $state['public_page_cards']=$visible;
    $pending=array_keys($dbs);$seen=[];$count=0;
    while($pending&&$count++<64){$id=array_shift($pending);if(isset($seen[$id]))continue;$seen[$id]=true;
        if(!database_public($id)){$state['databases'][$id]=null;continue;}
        $record=database_record($id);$properties=database_properties($id);$state['databases'][$id]=[$record,$properties,query("SELECT COUNT(*) AS n,SUM(version) AS versions,MAX(updated_at) AS updated FROM collection_rows WHERE db_id=? AND visibility='public' AND source_form_id IS NULL",[$id])->fetch()];
        foreach($properties as $p)if($p['type']==='relation'&&!empty($p['config']['target_db_id']))$pending[]=$p['config']['target_db_id'];
    }
    foreach(array_keys($forms) as $id){$record=query('SELECT id,name,is_public,version,fields FROM collection_forms WHERE id=?',[$id])->fetch();$state['forms'][$id]=$record?:null;}
    foreach(array_chunk(array_values(array_unique($files)),200) as $chunk){$marks=implode(',',array_fill(0,count($chunk),'?'));foreach(query('SELECT id,name,attribution FROM files WHERE id IN ('.$marks.') ORDER BY id',$chunk)->fetchAll() as $file)$state['files'][]=$file;}
    return hash('sha256',encoded($state));
}
function render_reader_page(array $page,bool $public=true): string {
    $cover=$page['cover_id']?'<div class="page-cover"><img style="object-position:'.h(($page['cover_position']['x']??50).'% '.($page['cover_position']['y']??50).'%').'" src="media.php?id='.rawurlencode($page['cover_id']).'" alt=""></div>':'';
    $a=page_appearance($page);$style=($a['width']==='wide'?'max-width:1200px;':'').($a['focus']?'min-height:100vh;':'');
    return $cover.'<main class="reader-page" style="'.h($style).'"><div class="page-emoji">'.render_page_icon($page).'</div>'.render_credit($page['cover_attribution']??null).render_credit($page['icon_attribution']??null).'<h1>'.h($page['title']).'</h1>'.($page['description']?'<p class="page-description">'.h($page['description']).'</p>':'').render_document($page['content'],$page['id'],$public).'</main>';
}
function render_reader_empty(bool $unavailable=false): string {
    if($unavailable)return '<main class="reader-page"><h1>Page indisponible</h1><p>Cette page est privée ou a été retirée.</p><a href="index.php?read=1">Revenir à l’accueil</a></main>';
    $notebook=notebook_settings();return '<main class="reader-page"><h1>'.h($notebook['title']).'</h1><p>'.h($notebook['subtitle']).'</p><p>La page d’accueil n’est pas encore publiée.</p></main>';
}
