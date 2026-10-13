<?php
declare(strict_types=1);

function category_seed(PDO $pdo, ?string $space): void {
    $mysql=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql';
    foreach(['class'=>'Classes','article'=>'Articles'] as $kind=>$name){
        $hash=hash('sha256','feuillet-category|'.($space??'general').'|'.$kind);
        $id=substr($hash,0,8).'-'.substr($hash,8,4).'-'.substr($hash,12,4).'-'.substr($hash,16,4).'-'.substr($hash,20,12);
        $sql=$mysql?'INSERT IGNORE INTO categories (id,space_id,name,legacy_kind,sort_order) VALUES (?,?,?,?,?)':'INSERT INTO categories (id,space_id,name,legacy_kind,sort_order) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING';
        $pdo->prepare($sql)->execute([$id,$space,$name,$kind,$kind==='class'?0:1]);
    }
}
function categories_list(bool $public=false, bool $includeArchived=false): array {
    $items=query('SELECT * FROM categories ORDER BY sort_order,name')->fetchAll();
    if(!$includeArchived)$items=array_values(array_filter($items,fn($c)=>!$c['deleted_at']));
    if($public){$ids=[];$all=page_rows();foreach($all as $row){if($row['deleted_at']||$row['visibility']!=='public'||!$row['published']||!ancestors_active($row,$all))continue;$snapshot=json_decode($row['published'],true);if(!empty($snapshot['category_id']))$ids[]=$snapshot['category_id'];}$items=array_values(array_filter($items,fn($c)=>in_array($c['id'],$ids,true)));}
    foreach($items as &$item)$item['sort_order']=(int)$item['sort_order'];unset($item);return $items;
}
function category_for_kind(?string $space,string $kind): ?string {
    $q=$space?query('SELECT id FROM categories WHERE space_id=? AND legacy_kind=? AND deleted_at IS NULL',[$space,$kind]):query('SELECT id FROM categories WHERE space_id IS NULL AND legacy_kind=? AND deleted_at IS NULL',[$kind]);return $q->fetchColumn()?:null;
}
function category_validate(?string $id, ?string $space): void {
    if(!$id)return;$category=query('SELECT * FROM categories WHERE id=?',[$id])->fetch();
    if(!$category||($category['space_id']?:null)!==$space)fail('Cette catégorie ne fait pas partie de cet espace.');
}
function categories_mutate(string $action,array $input): array {
    $id=!empty($input['id'])?str_limit($input['id'],36):uuid();$old=!empty($input['id'])?query('SELECT * FROM categories WHERE id=?',[$id])->fetch():null;
    if(!empty($input['id'])&&!$old)fail('Catégorie introuvable.',404);
    if($action==='delete_category'||$action==='restore_category')query('UPDATE categories SET deleted_at=? WHERE id=?',[$action==='delete_category'?now():null,$id]);
    else{
        $space=($input['space_id']??$old['space_id']??null)?:null;check_space($space);$name=str_limit($input['name']??'',60);if(!$name)fail('Donne un nom à la catégorie.');
        if($old&&($old['space_id']?:null)!==$space)fail('Une catégorie reste dans son espace.');
        $order=(int)($input['sort_order']??$old['sort_order']??0);
        if($old)query('UPDATE categories SET name=?,sort_order=? WHERE id=?',[$name,$order,$id]);
        else query('INSERT INTO categories (id,space_id,name,legacy_kind,sort_order) VALUES (?,?,?,?,?)',[$id,$space,$name,null,$order]);
    }
    return ['id'=>$id,'categories'=>categories_list(false,true)];
}
function notebook_settings(): array {
    $old=cfg()['name']??'Feuillet.';
    $title=in_array($old,['Le carnet de Sandro','Mon carnet','Mon carnet de cours'],true)?'Feuillet.':$old;
    $defaults=['title'=>$title,'subtitle'=>'Mon carnet pédagogique','max_upload'=>(int)(cfg()['max_upload']??104857600)];
    $raw=query("SELECT value FROM app_settings WHERE name='notebook'")->fetchColumn();
    return array_replace($defaults,$raw?json_decode($raw,true):[]);
}
function notebook_validate(array $input): array {
    $out=notebook_settings();
    foreach(['title'=>80,'subtitle'=>120] as $key=>$length)if(array_key_exists($key,$input)){
        if(!is_string($input[$key]))fail('Texte de carnet invalide.');$out[$key]=str_limit($input[$key],$length);
        if($key==='title'&&!$out[$key])fail('Donne un titre à ton carnet.');
    }
    if(array_key_exists('max_upload',$input)){
        if(!is_numeric($input['max_upload']))fail('Limite de fichier invalide.');$limit=(int)$input['max_upload'];
        if($limit<1048576||$limit>1073741824)fail('Choisis une limite comprise entre 1 et 1024 Mo.');$out['max_upload']=$limit;
    }
    return $out;
}
function server_upload_limit(): int { $a=ini_bytes(ini_get('upload_max_filesize'));$b=ini_bytes(ini_get('post_max_size'));return min($a?:PHP_INT_MAX,$b?:PHP_INT_MAX); }
function cover_position(mixed $value): array {
    if(!is_array($value))return ['x'=>50,'y'=>50];return ['x'=>max(0,min(100,(float)($value['x']??50))),'y'=>max(0,min(100,(float)($value['y']??50)))];
}
function publish_tree(array $page): array {
    $ids=descendants($page['id']);$pdo=db();$pdo->beginTransaction();$count=0;
    try{
        foreach($ids as $id){$row=query('SELECT * FROM pages WHERE id=?',[$id])->fetch();if(!$row||$row['deleted_at']||!ancestors_active($row,page_rows()))continue;
            if($id===$page['id']&&(int)$row['version']!==$page['version'])fail('Conflit de modification.',409,'conflict');
            $snapshot=row_page($row);$snapshot['visibility']='public';$snapshot['published_at']=now();$snapshot['has_unpublished_changes']=false;
            query("UPDATE pages SET visibility='public',published=?,published_at=? WHERE id=?",[encoded($snapshot),$snapshot['published_at'],$id]);$count++;
        }$pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return ['page'=>get_page($page['id']),'pages'=>list_pages()['pages'],'published_count'=>$count];
}
