<?php
declare(strict_types=1);
require_once __DIR__.'/render.php';

function export_backup(): never {
    if(!class_exists(ZipArchive::class))fail('L’extension PHP ZIP est nécessaire.',503);
    $dir=storage().'/temporary';if(!is_dir($dir))mkdir($dir,0700,true);
    $path=$dir.'/'.bin2hex(random_bytes(20)).'.zip';
    register_shutdown_function(fn()=>is_file($path)?unlink($path):null);
    $zip=new ZipArchive();if($zip->open($path,ZipArchive::CREATE|ZipArchive::EXCL)!==true)fail('Impossible de créer la sauvegarde.',500);
    $pages=[];$all=page_rows();
    foreach($all as $row){$p=row_page($row);$p['published_snapshot']=json_decode($row['published']??'null',true);$pages[]=$p;
        $zip->addFromString('html/'.$p['id'].'.html','<!doctype html><html lang="fr"><meta charset="utf-8"><title>'.h($p['title']).'</title><link rel="stylesheet" href="../reader.css"><main class="reader-page"><h1>'.h($p['title']).'</h1>'.str_replace(['media.php?id=','&download=1'],['../files/',''],render_document($p['content'],$p['id'],false)).'</main></html>');
    }
    $files=[];foreach(query('SELECT * FROM files')->fetchAll() as $f){$filePath=storage().'/files/'.$f['path'];if(!is_file($filePath))continue;$files[]=['id'=>$f['id'],'name'=>$f['name'],'mime'=>$f['mime'],'size'=>(int)$f['size'],'entry'=>'files/'.$f['id'],'attribution'=>json_decode($f['attribution']??'null',true)];$zip->addFile($filePath,'files/'.$f['id']);}
    $zip->addFile(FEUILLET_ROOT.'/public/reader.css','reader.css');
    $zip->addFromString('manifest.json',encoded(['format'=>'feuillet-backup','version'=>3,'exported_at'=>now(),'pages'=>$pages,'files'=>$files,'spaces'=>list_spaces(),'settings'=>['appearance'=>global_appearance(),'notebook'=>notebook_settings(),'homepage_id'=>homepage_id()],'categories'=>categories_list(false,true),'database_data'=>database_backup()]));
    $zip->addFromString('LISEZ-MOI.txt',"Sauvegarde Feuillet\nmanifest.json contient les pages et les métadonnées. files/ contient les originaux (nom original dans le manifeste). html/ fournit une lecture de secours ; les liens internes et quiz nécessitent le logiciel. Importer cette archive dans Feuillet crée des copies privées et n'écrase rien. Les catégories, styles, bases, propriétés, relations et réponses privées sont inclus. Les imports restent privés et les formulaires sont fermés avec de nouveaux liens. La configuration de connexion et le mot de passe ne sont pas exportés.\n");
    if(!$zip->close())fail('Sauvegarde impossible. Vérifie l’espace disque disponible.',500);
    header('Content-Type: application/zip');header('Content-Disposition: attachment; filename="feuillet-'.gmdate('Y-m-d-His').'.zip"');header('Content-Length: '.filesize($path));session_write_close();readfile($path);unlink($path);exit;
}
function import_backup(): never {
    if(empty($_FILES['file'])||$_FILES['file']['error']!==UPLOAD_ERR_OK)fail('Archive manquante ou trop volumineuse.',413);
    $zip=new ZipArchive();if($zip->open($_FILES['file']['tmp_name'])!==true)fail('Archive ZIP invalide.');
    $sizeTotal=0;$entryNames=[];
    for($i=0;$i<$zip->numFiles;$i++){
        $s=$zip->statIndex($i);$name=$s['name'];if(isset($entryNames[$name]))fail('Archive contenant des entrées en double.');$entryNames[$name]=true;
        if(str_contains($name,'..')||str_contains($name,'\\')||str_starts_with($name,'/')||str_contains($name,"\0"))fail('Archive contenant un chemin dangereux.');
        $sizeTotal+=$s['size'];if($sizeTotal>1073741824||$zip->numFiles>10000)fail('Archive décompressée trop volumineuse.',413);
    }
    $stat=$zip->statName('manifest.json');if(!$stat||$stat['size']>16*1024*1024)fail('Manifeste absent ou trop volumineux.');
    try{$manifestText=$zip->getFromName('manifest.json',$stat['size']+1);if(!is_string($manifestText)||strlen($manifestText)!==$stat['size'])fail('Manifeste incomplet.');$manifest=json_decode($manifestText,true,80,JSON_THROW_ON_ERROR);}catch(Throwable){fail('Manifeste invalide.');}
    if(($manifest['format']??'')!=='feuillet-backup'||!in_array($manifest['version']??null,[1,2,3],true)||!is_array($manifest['pages']??null)||!is_array($manifest['files']??null)||count($manifest['pages'])>3000)fail('Ce ZIP n’est pas une sauvegarde Feuillet compatible.');
    foreach($manifest['pages'] as $page){if(!is_array($page)||!is_array($page['content']??null))fail('Document du manifeste invalide.');backup_document_shape($page['content']);}
    $fileMap=[];$pageMap=[];$spaceMap=[];$categoryMap=[];$databaseMaps=['databases'=>[],'forms'=>[]];$createdPaths=[];$pdo=db();$pdo->beginTransaction();
    try{
        $spaces=$manifest['spaces']??[];if(!is_array($spaces)||count($spaces)>500)fail('Espaces du manifeste invalides.');foreach($spaces as $space){if(!is_array($space)||!preg_match('/^[a-f0-9-]{36}$/',$space['id']??'')||isset($spaceMap[$space['id']]))fail('Espace du manifeste invalide.');$newId=uuid();$spaceMap[$space['id']]=$newId;query('INSERT INTO spaces (id,name,icon,sort_order) VALUES (?,?,?,?)',[$newId,str_limit($space['name']??'Espace importé',120),str_limit($space['icon']??'📚',64),(int)($space['sort_order']??0)]);}
        $categories=$manifest['categories']??[];if(!is_array($categories)||count($categories)>5000)fail('Catégories du manifeste invalides.');
        foreach($categories as $category){
            if(!is_array($category)||!preg_match('/^[a-f0-9-]{36}$/D',$category['id']??'')||isset($categoryMap[$category['id']]))fail('Catégorie du manifeste invalide.');
            $space=!empty($category['space_id'])?($spaceMap[$category['space_id']]??null):null;if(!empty($category['space_id'])&&!$space)fail('Espace de catégorie manquant.');$legacy=in_array($category['legacy_kind']??null,['class','article'],true)?$category['legacy_kind']:null;
            if($legacy){category_seed($pdo,$space);$q=$space?query('SELECT id FROM categories WHERE space_id=? AND legacy_kind=?',[$space,$legacy]):query('SELECT id FROM categories WHERE space_id IS NULL AND legacy_kind=?',[$legacy]);$newId=$q->fetchColumn();
                // General categories belong to the existing notebook; make copies instead of renaming them.
                if(!$space)$newId=uuid();
            }else $newId=uuid();
            $categoryMap[$category['id']]=$newId;$name=str_limit($category['name']??'Catégorie importée',60)?:'Catégorie importée';$deleted=!empty($category['deleted_at'])?now():null;
            if(query('SELECT id FROM categories WHERE id=?',[$newId])->fetch())query('UPDATE categories SET name=?,sort_order=?,deleted_at=? WHERE id=?',[$name,(int)($category['sort_order']??0),$deleted,$newId]);
            else query('INSERT INTO categories (id,space_id,name,legacy_kind,sort_order,deleted_at) VALUES (?,?,?,?,?,?)',[$newId,$space,$name,$legacy,(int)($category['sort_order']??0),$deleted]);
        }
        if(!$categories)foreach($spaceMap as $space)category_seed($pdo,$space);
        $importedAppearance=validate_appearance($manifest['settings']['appearance']??[],true);
        if(in_array($_POST['apply_settings']??false,[true,1,'1','true'],true)){query("DELETE FROM app_settings WHERE name='appearance'");query('INSERT INTO app_settings (name,value) VALUES (?,?)',['appearance',encoded(array_replace(appearance_defaults(),$importedAppearance))]);}
        foreach($manifest['files'] as $f){
            if(!is_array($f)||!preg_match('/^[a-f0-9-]{36}$/',$f['id']??'')||isset($fileMap[$f['id']]))fail('Fichier du manifeste invalide.');
            $entry='files/'.$f['id'];if(($f['entry']??$entry)!==$entry)fail('Chemin de pièce jointe invalide.');$s=$zip->statName($entry);if(!$s)fail('Une pièce jointe manque dans l’archive.');
            $newId=uuid();$disk=bin2hex(random_bytes(24));$dir=storage().'/files';if(!is_dir($dir))mkdir($dir,0700,true);$path=$dir.'/'.$disk;
            $in=$zip->getStream($entry);$out=fopen($path,'xb');if($out)$createdPaths[]=$path;if(!$in||!$out){if(is_resource($in))fclose($in);if(is_resource($out))fclose($out);fail('Impossible de restaurer un fichier.',500);}
            $written=stream_copy_to_stream($in,$out,$s['size']+1);fclose($in);fclose($out);chmod($path,0600);if($written!==$s['size'])fail('Fichier incomplet.');
            $name=str_limit(basename(str_replace('\\','/',$f['name']??'')),240);$ext=strtolower(pathinfo($name,PATHINFO_EXTENSION));
            if(!in_array($ext,['pdf','jpg','jpeg','png','gif','webp','avif','mp3','wav','ogg','m4a','mp4','webm','mov','txt','md','csv','json','doc','docx','odt','xls','xlsx','ods','ppt','pptx','odp','zip','rtf','epub','stl'],true))fail('Format de fichier interdit dans l’archive.');
            $mime=(new finfo(FILEINFO_MIME_TYPE))->file($path);
            if(file_mime_forbidden((string)$mime))fail('Contenu de fichier interdit dans l’archive.');
            if(str_starts_with((string)$mime,'image/'))validate_image_file($path,(string)$mime);
            if($ext==='pdf'&&$mime!=='application/pdf')fail('PDF invalide dans l’archive.');
            // Do not trust MIME supplied by the archive. Only safe formats may be displayed inline.
            $safeMime=match($ext){'pdf'=>'application/pdf','mp3'=>'audio/mpeg','wav'=>'audio/wav','ogg'=>'audio/ogg','m4a'=>'audio/mp4','mp4'=>'video/mp4','webm'=>'video/webm','mov'=>'video/quicktime',default=>str_starts_with((string)$mime,'image/')&&getimagesize($path)?$mime:'application/octet-stream'};
            query('INSERT INTO files (id,name,mime,size,path,created_at) VALUES (?,?,?,?,?,?)',[$newId,$name,$safeMime,$written,$disk,now()]);if(is_array($f['attribution']??null)){ $a=$f['attribution'];query('UPDATE files SET attribution=? WHERE id=?',[encoded(['source_url'=>safe_url($a['source_url']??''),'author'=>str_limit($a['author']??'',2000),'license'=>str_limit($a['license']??'',300),'license_url'=>safe_url($a['license_url']??'')]),$newId]);}$fileMap[$f['id']]=$newId;
        }
        if(in_array($_POST['apply_settings']??false,[true,1,'1','true'],true)&&isset($manifest['settings']['notebook'])){
            $notebook=$manifest['settings']['notebook'];if(!is_array($notebook))fail('Réglages du carnet invalides.');
            if(!empty($notebook['icon_id'])){if(!is_string($notebook['icon_id'])||!isset($fileMap[$notebook['icon_id']]))fail('Fichier d’icône du carnet manquant.');$notebook['icon_id']=$fileMap[$notebook['icon_id']];}
            $notebook=notebook_validate($notebook);query("DELETE FROM app_settings WHERE name='notebook'");query('INSERT INTO app_settings (name,value) VALUES (?,?)',['notebook',encoded($notebook)]);
        }
        foreach($manifest['pages'] as $p){if(!is_array($p)||!preg_match('/^[a-f0-9-]{36}$/',$p['id']??'')||isset($pageMap[$p['id']]))fail('Page du manifeste invalide.');$pageMap[$p['id']]=uuid();}
        $databaseData=$manifest['database_data']??[];if(!is_array($databaseData))fail('Sauvegarde des bases invalide.');$databaseMaps=database_import($databaseData,$fileMap,$pageMap);
        $rewrite=function(array $node) use (&$rewrite,$fileMap,$pageMap,$databaseMaps,$categoryMap,$spaceMap): array {
            if(isset($node['attrs']['fileId'])){$old=$node['attrs']['fileId'];if(!isset($fileMap[$old]))fail('Référence de fichier manquante.');$node['attrs']['fileId']=$fileMap[$old];if($node['type']==='image')$node['attrs']['src']='media.php?id='.$fileMap[$old];}
            if(isset($node['attrs']['pageIds']))$node['attrs']['pageIds']=array_values(array_filter(array_map(fn($id)=>$pageMap[$id]??null,is_array($node['attrs']['pageIds'])?$node['attrs']['pageIds']:[])));
            foreach(['dbId','databaseId'] as $key)if(isset($node['attrs'][$key]))$node['attrs'][$key]=$databaseMaps['databases'][$node['attrs'][$key]]??'';
            if(($node['type']??'')==='databaseView'&&!($node['attrs']['dbId']??''))return ['type'=>'paragraph'];
            if(isset($node['attrs']['viewConfig'])){$v=$node['attrs']['viewConfig'];if(!is_array($v))fail('Vue importée invalide.');$props=$databaseMaps['properties']??[];if(isset($v['hiddenPropertyIds']))$v['hiddenPropertyIds']=array_values(array_filter(array_map(fn($id)=>$props[$id]??null,is_array($v['hiddenPropertyIds'])?$v['hiddenPropertyIds']:[])));if(isset($v['filters'])){if(!is_array($v['filters']))fail('Filtres importés invalides.');$filters=[];foreach($v['filters'] as $filter){if(!is_array($filter))fail('Filtre importé invalide.');$old=$filter['propertyId']??'';if(isset($props[$old])){$filter['propertyId']=$props[$old];$filters[]=$filter;}}$v['filters']=$filters;}if(!empty($v['sort'])){$old=$v['sort']['propertyId']??'';$v['sort']=isset($props[$old])?array_replace($v['sort'],['propertyId'=>$props[$old]]):null;}$node['attrs']['viewConfig']=$v;}

            if(isset($node['attrs']['formId'])){$node['attrs']['formId']=$databaseMaps['forms'][$node['attrs']['formId']]??'';unset($node['attrs']['token']);}
            if(($node['type']??'')==='formView'&&!($node['attrs']['formId']??''))return ['type'=>'paragraph'];
            if(isset($node['attrs']['categoryId']))$node['attrs']['categoryId']=$categoryMap[$node['attrs']['categoryId']]??null;
            if(isset($node['attrs']['spaceId']))$node['attrs']['spaceId']=$spaceMap[$node['attrs']['spaceId']]??null;
            foreach(['pageId','parentId'] as $key)if(isset($node['attrs'][$key]))$node['attrs'][$key]=$pageMap[$node['attrs'][$key]]??'';
            foreach($node['content']??[] as $i=>$child)$node['content'][$i]=$rewrite($child);return $node;
        };
        foreach($manifest['pages'] as $p){
            $id=$pageMap[$p['id']];$icon=!empty($p['icon_id'])?($fileMap[$p['icon_id']]??null):null;$space=!empty($p['space_id'])?($spaceMap[$p['space_id']]??null):null;$appearance=validate_appearance(array_replace($importedAppearance,is_array($p['appearance']??null)?$p['appearance']:[]),true);$cover=!empty($p['cover_id'])?$fileMap[$p['cover_id']]??null:null;
            $doc=normalize_doc($rewrite($p['content']));$title=str_limit($p['title']??'Sans titre')?:'Sans titre';$kind=in_array($p['kind']??'', ['page','article','class'],true)?$p['kind']:'page';
            $parent=$pageMap[$p['parent_id']??'']??null;$category=!empty($p['category_id'])?($categoryMap[$p['category_id']]??null):category_for_kind($space,$kind);category_validate($category,$space);$position=cover_position($p['cover_position']??[]);
            query('INSERT INTO pages (id,slug,parent_id,title,icon,cover_id,kind,description,tags,source_url,source_name,content,visibility,sort_order,version,created_at,updated_at,space_id,icon_id,appearance,category_id,cover_position) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[$id,'importe-'.substr($id,0,8),$parent,$title,validate_icon($p['icon']??'📄'),$cover,$kind,str_limit($p['description']??'',2000),encoded(is_array($p['tags']??null)?array_map(fn($t)=>str_limit($t,50),$p['tags']):[]),safe_url($p['source_url']??''),str_limit($p['source_name']??''),encoded($doc),'private',(int)($p['sort_order']??0),1,now(),now(),$space,$icon,encoded($appearance),$category,encoded($position)]);
        }
        if(in_array($_POST['apply_settings']??false,[true,1,'1','true'],true)&&array_key_exists('homepage_id',$manifest['settings']??[])){$old=$manifest['settings']['homepage_id'];if($old!==null&&!is_string($old))fail('Page d’accueil importée invalide.');$new=$old!==null?($pageMap[$old]??null):null;query("DELETE FROM app_settings WHERE name='homepage_id'");query('INSERT INTO app_settings (name,value) VALUES (?,?)',['homepage_id',encoded($new)]);}
        foreach($pageMap as $id){$p=row_page(query('SELECT * FROM pages WHERE id=?',[$id])->fetch());check_parent($p['parent_id'],$id);revision_save($p);}
        $pdo->commit();$zip->close();json_out(['ok'=>true,'pages'=>count($pageMap),'files'=>count($fileMap),'spaces'=>count($spaceMap),'categories'=>count($categoryMap),'databases'=>count($databaseMaps['databases']),'forms'=>count($databaseMaps['forms'])]);
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();foreach($createdPaths as $path)if(is_file($path))unlink($path);$zip->close();throw $e;}
}

/** Bound complexity before recursive reference rewrites allocate a second document. */
function backup_document_shape(array $document): void {
    $count=0;$walk=function(mixed $node,int $depth)use(&$walk,&$count):void{if(!is_array($node)||++$count>12000||$depth>32)fail('Document importé trop complexe.');if(isset($node['content'])){if(!is_array($node['content']))fail('Contenu importé invalide.');foreach($node['content'] as $child)$walk($child,$depth+1);}};$walk($document,0);
}
