<?php
declare(strict_types=1);

/** Admin-only inventory. Never return titles of private usages to a reader. */
function media_usage(string $id): array {
    need_admin();$file=query('SELECT * FROM files WHERE id=?',[$id])->fetch();if(!$file)fail('Fichier introuvable.',404);
    $rows=page_rows();$byId=array_column($rows,null,'id');$usages=[];$truncated=false;$dbReferences=[];
    $append=function(array $usage)use(&$usages,&$truncated){if(count($usages)>=200){$truncated=true;return;}$usages[]=$usage;};
    $references=function(array $page,bool $published)use($id,$byId,&$dbReferences):array{
        $places=[];if(($page['cover_id']??null)===$id)$places[]='Couverture';if(($page['icon_id']??null)===$id)$places[]='Icône';if(in_array($id,files_in($page['content']??[]),true))$places[]='Contenu';
        $walk=function(array $node)use(&$walk,&$places,$page,$published,$id,$byId,&$dbReferences){
            if(($node['type']??'')==='databaseView'){ $dbId=$node['attrs']['dbId']??'';if(isset($dbReferences[$dbId])&&(!$published||$dbReferences[$dbId]))$places[]='Base intégrée';}
            if(($node['type']??'')==='gallery'){$a=$node['attrs']??[];$targets=!empty($a['manual'])?($a['pageIds']??[]):array_keys($byId);
                foreach($targets as $target){$row=$byId[$target]??null;if(!$row||$target===($page['id']??null)||$row['deleted_at']||!ancestors_active($row,$byId))continue;if($published){if($row['visibility']!=='public'||!$row['published'])continue;$p=json_decode($row['published'],true);}else $p=row_page($row);if(empty($a['manual'])&&((!empty($a['parentId'])&&$p['parent_id']!==$a['parentId'])||(!empty($a['kind'])&&$p['kind']!==$a['kind'])))continue;if(($p['cover_id']??null)===$id||($p['icon_id']??null)===$id)$places[]='Carte de galerie';}}
            foreach($node['content']??[] as $child)$walk($child);
        };$walk($page['content']??[]);return array_values(array_unique($places));
    };
    $needle='%'.$id.'%';$props=[];$seenHistory=[];
    $matches=query('SELECT * FROM collection_rows WHERE values_json LIKE ? LIMIT 201',[$needle])->fetchAll();
    foreach($matches as $row){$properties=$props[$row['db_id']]??($props[$row['db_id']]=database_properties($row['db_id']));$values=json_decode($row['values_json'],true);$fields=[];$title='Fiche';foreach($properties as $p){if($p['type']==='files'&&in_array($id,$values[$p['id']]??[],true))$fields[]=$p['name'];if($p['type']==='title')$title=(string)($values[$p['id']]??'Sans titre');}if(!$fields)continue;$dbRecord=database_record($row['db_id']);$public=$row['visibility']==='public'&&!$row['source_form_id']&&database_public($row['db_id']);$dbReferences[$row['db_id']]=($dbReferences[$row['db_id']]??false)||$public;$append(['kind'=>'database','id'=>$row['db_id'],'title'=>$dbRecord['name'].' · '.$title,'visibility'=>$public?'public':'private','from_form'=>!!$row['source_form_id'],'places'=>$fields]);}
    foreach($rows as $row){$draft=$references(row_page($row),false);$snapshot=$row['published']?json_decode($row['published'],true):null;$published=$snapshot&&$row['visibility']==='public'&&!$row['deleted_at']&&ancestors_active($row,$rows)?$references($snapshot,true):[];
        if($draft||$published)$append(['kind'=>'page','id'=>$row['id'],'title'=>$row['title'],'visibility'=>$row['visibility'],'deleted'=>!!$row['deleted_at'],'draft'=>!!$draft,'published'=>!!$published,'places'=>array_values(array_unique([...$draft,...$published]))]);
    }
    foreach(query('SELECT page_id,snapshot FROM revisions WHERE snapshot LIKE ? LIMIT 201',[$needle])->fetchAll() as $revision){$p=json_decode($revision['snapshot'],true);if(!$p||!$references($p,false))continue;$key='revision:'.$revision['page_id'];if(isset($seenHistory[$key]))continue;$seenHistory[$key]=true;$append(['kind'=>'revision','id'=>$revision['page_id'],'title'=>$byId[$revision['page_id']]['title']??$p['title'],'visibility'=>'private','places'=>['Anciennes versions']]);}
    foreach(list_spaces() as $space){$places=[];if(($space['icon_id']??null)===$id)$places[]='Icône';if(($space['cover_id']??null)===$id)$places[]='Couverture';if($places)$append(['kind'=>'space','id'=>$space['id'],'title'=>$space['name'],'visibility'=>'private','places'=>$places]);}
    if((notebook_settings()['icon_id']??null)===$id)$append(['kind'=>'notebook','title'=>'Icône du site','visibility'=>'public','places'=>['Toutes les pages']]);
    if(query('SELECT file_id FROM form_uploads WHERE file_id=? AND used_row_id IS NULL',[$id])->fetch())$append(['kind'=>'pending','title'=>'Pièce jointe de formulaire en attente','visibility'=>'private','places'=>['Envoi non terminé']]);
    return ['file_id'=>$id,'public'=>file_public($id),'usages'=>$usages,'truncated'=>$truncated||count($matches)>200];
}
