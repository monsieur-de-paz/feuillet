<?php
declare(strict_types=1);

function public_home_id(): ?string {
    $raw=query("SELECT value FROM app_settings WHERE name='public_home'")->fetchColumn();$value=$raw?json_decode($raw,true):null;$id=$value['page_id']??null;
    return is_string($id)&&preg_match('/^[a-f0-9-]{36}$/D',$id)?$id:null;
}
function public_home_store(?string $id): void {
    $pdo=db();$own=!$pdo->inTransaction();if($own)$pdo->beginTransaction();try{query("DELETE FROM app_settings WHERE name='public_home'");query('INSERT INTO app_settings (name,value) VALUES (?,?)',['public_home',encoded(['page_id'=>$id])]);if($own)$pdo->commit();}catch(Throwable $e){if($own&&$pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function public_home_status(): array {
    $id=public_home_id();$row=$id?query('SELECT * FROM pages WHERE id=?',[$id])->fetch():null;
    return ['page_id'=>$row&&!$row['deleted_at']?$id:null,'published'=>!!($row&&!$row['deleted_at']&&$row['visibility']==='public'&&$row['published']&&ancestors_active($row,page_rows()))];
}
function public_home_mutate(array $input): array {
    if(!empty($input['create'])){
        $status=public_home_status();if($status['page_id'])return $status;
        $page=save_page(['title'=>'Bienvenue','description'=>'Notes, ressources et découvertes.','space_id'=>$input['space_id']??null,'content'=>['type'=>'doc','content'=>[
            ['type'=>'paragraph','content'=>[['type'=>'text','text'=>'Bienvenue dans cet espace. Retrouvez ici les pages que je souhaite partager.']]],
            ['type'=>'gallery','attrs'=>['manual'=>true,'pageIds'=>[],'title'=>'À découvrir','columns'=>2,'rows'=>0,'aspect'=>'16/9']]
        ]]]);public_home_store($page['id']);return public_home_status();
    }
    if(!array_key_exists('page_id',$input))fail('Choisis une page pour l’accueil public.');
    $id=$input['page_id'];if($id!==null){if(!is_string($id)||!preg_match('/^[a-f0-9-]{36}$/D',$id))fail('Page d’accueil invalide.');$page=get_page($id);if(!empty($page['deleted_at']))fail('Cette page est dans la corbeille.');}
    public_home_store($id);return public_home_status();
}
/** Root-only selection never falls back to an arbitrary public page. */
function public_home_page(): ?array {
    $id=public_home_id();if(!$id)return null;
    try{return get_page($id,true);}catch(AppError $e){if($e->status===404)return null;throw $e;}
}
function reader_is_home(): bool {return !empty($GLOBALS['feuillet_reader_home']);}
function reader_home_scope(array $root,array $all): void {
    $GLOBALS['feuillet_reader_scope']=[];$GLOBALS['feuillet_reader_root']=$root['id'];$GLOBALS['feuillet_reader_home']=true;
    $children=[];foreach($all as $row)if($row['parent_id'])$children[$row['parent_id']][]=$row['id'];
    $pending=[$root['id']];$seen=[];
    while($pending){$id=array_pop($pending);if(isset($seen[$id]))continue;$seen[$id]=true;$row=$all[$id]??null;if(!$row||$row['deleted_at']||$row['visibility']!=='public'||!$row['published']||!ancestors_active($row,$all))continue;$GLOBALS['feuillet_reader_scope'][$id]=true;foreach($children[$id]??[] as $child)$pending[]=$child;}
    $doc=json_decode($root['published'],true)['content']??[];
    $walk=function(array $node)use(&$walk,$all){$ids=[];$attrs=$node['attrs']??[];
        if(($node['type']??'')==='pageLink')$ids[]=$attrs['pageId']??'';
        if(($node['type']??'')==='gallery'&&!empty($attrs['manual']))$ids=$attrs['pageIds']??[];
        foreach($ids as $id){if(!is_string($id))continue;$row=$all[$id]??null;if($row&&!$row['deleted_at']&&$row['visibility']==='public'&&$row['published']&&ancestors_active($row,$all))$GLOBALS['feuillet_reader_scope'][$id]=true;}
        foreach($node['content']??[] as $child)$walk($child);
    };$walk($doc);
}
