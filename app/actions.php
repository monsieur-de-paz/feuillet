<?php
declare(strict_types=1);

function api_dispatch(string $action): never {
    if(!installed()) fail('Installation nécessaire.',503,'setup_required');
    start_session();
    $method=$_SERVER['REQUEST_METHOD']??'GET';
    if(str_starts_with($action,'update_')){require_once __DIR__.'/updates.php';updates_dispatch($action,$method);}
    if(function_exists('database_dispatch'))database_dispatch($action,$method);
    $postActions=['login','logout','save','publish','visibility','duplicate','trash','restore','move','restore_revision','upload','import','quiz','spaces','save_space','delete_space','settings','rename_file','image_import','import_markdown','import_document','save_category','delete_category','restore_category','homepage','public_home'];
    if(in_array($action,$postActions,true)&&!(in_array($action,['spaces','settings','public_home'],true)&&$method==='GET')) {if($method!=='POST')fail('Méthode non autorisée.',405);csrf();}
    elseif($method!=='GET')fail('Méthode non autorisée.',405);
    if($action==='session')json_out(['authenticated'=>admin(),'csrf'=>$_SESSION['csrf'],'name'=>notebook_settings()['title'],'installed'=>true,'version'=>FEUILLET_VERSION]);
    if($action==='login'){
        limit_rate('login',10,900);$in=json_in();
        if(!is_string($in['password']??null)||!password_verify($in['password'],cfg()['password_hash']))fail('Mot de passe incorrect.',401,'invalid_password');
        session_regenerate_id(true);$_SESSION['admin']=true;$_SESSION['last_seen']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));
        json_out(['authenticated'=>true,'csrf'=>$_SESSION['csrf'],'name'=>notebook_settings()['title']]);
    }
    if($action==='logout'){$_SESSION=[];session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));json_out(['authenticated'=>false,'csrf'=>$_SESSION['csrf']]);}
    if(!admin()&&in_array($action,['pages','spaces','categories','search','page','render'],true))reader_scope_request(str_limit($_GET['id']??'',190));
    if($action==='pages')json_out(list_pages());
    if($action==='categories')json_out(['categories'=>categories_list(!admin(),admin())]);
    if($action==='spaces'&&$method==='GET')json_out(['spaces'=>list_spaces(!admin())]);
    if($action==='settings'&&$method==='GET')json_out(['appearance'=>global_appearance(),'notebook'=>notebook_settings(),'server_upload_limit'=>server_upload_limit()]);
    if($action==='search'){
        $search=search_normalize(str_limit($_GET['q']??'',120));$found=[];
        foreach(list_pages()['pages'] as $metadata){
            if(!empty($_GET['space_id'])&&($metadata['space_id']??null)!==$_GET['space_id'])continue;
            $p=get_page($metadata['id']);$haystack=$p['title'].' '.$p['description'].' '.implode(' ',$p['tags']).' '.$p['source_name'].' '.document_text($p['content']);
            foreach(files_in($p['content']) as $fid){$name=query('SELECT name FROM files WHERE id=?',[$fid])->fetchColumn();if($name)$haystack.=' '.$name;}
            if($search===''||str_contains(search_normalize($haystack),$search))$found[]=$metadata;
            if(count($found)>=200)break;
        }
        json_out(['pages'=>$found]);
    }
    if($action==='file_info'){$file=query('SELECT * FROM files WHERE id=?',[str_limit($_GET['id']??'',36)])->fetch();if(!$file||(!admin()&&!file_public($file['id'])))fail('Fichier introuvable.',404);json_out(['file'=>file_info($file)]);}
    if($action==='page')json_out(['page'=>get_page(str_limit($_GET['id']??'',190),!empty($_GET['published']))]);
    if($action==='render'){
        require_once __DIR__.'/render.php';$public=!admin()||!empty($_GET['published']);$p=get_page(str_limit($_GET['id']??'',190),$public);json_out(['html'=>render_document($p['content'],$p['id'],$public)]);
    }
    if($action==='quiz'){limit_rate('quiz',120,600);$in=json_in();$p=get_page(str_limit($in['page_id']??'',190));
        // Public retrieval removes solutions; grading uses the actual published snapshot.
        if(!admin()){$row=query('SELECT published FROM pages WHERE id=?',[$p['id']])->fetch();$p=json_decode($row['published'],true);}
        $quiz=find_quiz($p['content'],str_limit($in['quiz_id']??'',80));if(!$quiz)fail('Quiz introuvable.',404);
        if(!is_array($in['answers']??null))fail('Réponses invalides.');
        $results=[];$score=0;
        foreach($quiz['questions']??[] as $q){$answer=$in['answers'][$q['id']]??null;$correct=false;
            if($q['type']==='short'){$normalize=fn($s)=>mb_strtolower(preg_replace('/\s+/u',' ',trim(is_string($s)?$s:'')));$expected=array_map($normalize,$q['answers']??[]);$correct=is_string($answer)&&in_array($normalize($answer),$expected,true);$display=$q['answers']??[];}
            else{$actual=is_array($answer)?array_values(array_unique(array_map('intval',$answer))):[];$expected=array_values(array_unique(array_map('intval',$q['correct']??[])));sort($actual);sort($expected);$correct=$actual===$expected&&count($expected)>0;$display=array_map(fn($i)=>($q['options']??[])[$i]??'', $expected);}
            if($correct)$score++;$results[]=['id'=>$q['id'],'correct'=>$correct,'explanation'=>str_limit($q['explanation']??'',3000),'expected'=>$display];
        }
        json_out(['score'=>$score,'total'=>count($results),'results'=>$results]);
    }
    need_admin();
    if($action==='public_home')json_out($method==='GET'?public_home_status():public_home_mutate(json_in()));
    if($action==='homepage')fail('Le partage se fait désormais directement depuis chaque page.',410,'removed_feature');
    if(in_array($action,['save_category','delete_category','restore_category'],true))json_out(categories_mutate($action,json_in()));
    if(in_array($action,['spaces','save_space','delete_space'],true))json_out(spaces_mutate(json_in(),$action==='delete_space'));
    if($action==='settings'){$in=json_in();$values=[];if(array_key_exists('appearance',$in))$values['appearance']=validate_appearance($in['appearance']);if(array_key_exists('notebook',$in))$values['notebook']=notebook_validate($in['notebook']);$pdo=db();$pdo->beginTransaction();try{foreach($values as $name=>$value){query('DELETE FROM app_settings WHERE name=?',[$name]);query('INSERT INTO app_settings (name,value) VALUES (?,?)',[$name,encoded($value)]);}if(isset($values['notebook'])&&$values['notebook']['auto_publish_children'])publish_inherited_children();$pdo->commit();}catch(Throwable $e){$pdo->rollBack();throw $e;}json_out(['appearance'=>global_appearance(),'notebook'=>notebook_settings(),'server_upload_limit'=>server_upload_limit()]);}
    if($action==='rename_file')json_out(rename_file(json_in()));
    if($action==='image_search'){$images=image_search(str_limit($_GET['q']??'',120));json_out(['images'=>$images,'results'=>$images]);}
    if($action==='image_import')json_out(['file'=>image_import(json_in())]);
    if($action==='import_document'){require_once __DIR__.'/document-import.php';json_out(['page'=>import_document()]);}
    if($action==='import_markdown')json_out(['page'=>import_markdown()]);
    if($action==='export_markdown')export_markdown(get_page(str_limit($_GET['id']??'',190)));
    if($action==='health')json_out(['php'=>PHP_VERSION,'driver'=>db()->getAttribute(PDO::ATTR_DRIVER_NAME),'upload_limit'=>upload_limit(),'configured_upload_limit'=>notebook_settings()['max_upload'],'server_upload_limit'=>server_upload_limit(),'storage_writable'=>is_writable(storage()),'version'=>FEUILLET_VERSION]);
    if($action==='file_usage')json_out(media_usage(str_limit($_GET['id']??'',36)));
    if($action==='files')json_out(['files'=>array_map('file_info',query('SELECT * FROM files ORDER BY created_at DESC')->fetchAll())]);
    if($action==='upload'){if(empty($_FILES['file']))fail('Aucun fichier reçu. La limite d’envoi a peut-être été dépassée.',413);json_out(['file'=>receive_file($_FILES['file'])]);}
    if($action==='history'){
        $p=get_page(str_limit($_GET['id']??'',36));$history=query('SELECT id,title,version,created_at FROM revisions WHERE page_id=? ORDER BY version DESC',[$p['id']])->fetchAll();json_out(['history'=>$history]);
    }
    if($action==='export'){require_once __DIR__.'/backup.php';export_backup();}
    if($action==='import'){require_once __DIR__.'/backup.php';import_backup();}
    $in=json_in();
    if($action==='save')json_out(['page'=>save_page($in)]);
    $id=str_limit($in['id']??'',36);
    if($action==='restore'){
        $row=query('SELECT * FROM pages WHERE id=?',[$id])->fetch();if(!$row)fail('Page introuvable.',404);
        if($row['parent_id']){$parent=query('SELECT deleted_at FROM pages WHERE id=?',[$row['parent_id']])->fetch();if(!$parent||$parent['deleted_at'])query('UPDATE pages SET parent_id=NULL WHERE id=?',[$id]);}
        $pdo=db();$pdo->beginTransaction();try{foreach(descendants($id) as $child)query("UPDATE pages SET deleted_at=NULL,visibility='private',published=NULL,published_at=NULL,version=version+1,updated_at=? WHERE id=?",[now(),$child]);if($row['parent_id'])publish_inherited_children($row['parent_id']);$pdo->commit();}catch(Throwable $e){$pdo->rollBack();throw $e;}
        json_out(['page'=>get_page($id)]);
    }
    $p=get_page($id);
    if($action==='duplicate'){$p['title'].=' — copie';unset($p['id'],$p['version']);json_out(['page'=>save_page($p)]);}
    if($action==='trash'){
        $pdo=db();$pdo->beginTransaction();try{foreach(descendants($id) as $child)query("UPDATE pages SET deleted_at=?,visibility='private',published=NULL,published_at=NULL,version=version+1,updated_at=? WHERE id=?",[now(),now(),$child]);$pdo->commit();}catch(Throwable $e){$pdo->rollBack();throw $e;}
        json_out(['ok'=>true]);
    }
    if((int)($in['version']??-1)!==$p['version'])fail('Cette page a été modifiée ailleurs. Recharge-la.',409,'conflict');
    if($action==='publish')json_out(publish_tree($p));
    if($action==='visibility'){
        if(notebook_settings()['auto_publish_children']&&$p['parent_id']){$parentRow=query('SELECT visibility,published FROM pages WHERE id=?',[$p['parent_id']])->fetch();if($parentRow&&$parentRow['visibility']==='public'&&$parentRow['published'])fail('Désactive la publication automatique des sous-pages, ou rends leur page parente privée.');}
        if(($in['visibility']??'')!=='private')fail('Utilise Publier pour rendre une page publique.');
        $pdo=db();$pdo->beginTransaction();try{foreach(descendants($id) as $child)query("UPDATE pages SET visibility='private',published=NULL,published_at=NULL WHERE id=?",[$child]);$pdo->commit();}catch(Throwable $e){$pdo->rollBack();throw $e;}json_out(['page'=>get_page($id),'pages'=>list_pages()['pages']]);
    }
    if($action==='move'){
        $parent=!empty($in['parent_id'])?str_limit($in['parent_id'],36):null;check_parent($parent,$id);
        $space=array_key_exists('space_id',$in)?($in['space_id']?:null):($parent?query('SELECT space_id FROM pages WHERE id=?',[$parent])->fetchColumn():$p['space_id']);$space=$parent?(query('SELECT space_id FROM pages WHERE id=?',[$parent])->fetchColumn()?:ensure_default_notebook()):($space?:ensure_default_notebook());check_space($space);
        $category=$space!==($p['space_id']??null)?category_for_kind($space,$p['kind']):($p['category_id']??null);$pdo=db();$pdo->beginTransaction();try{$q=query('UPDATE pages SET parent_id=?,sort_order=?,space_id=?,category_id=?,version=version+1,updated_at=? WHERE id=? AND version=?',[$parent,(int)($in['sort_order']??0),$space,$category,now(),$id,$p['version']]);if($q->rowCount()!==1)fail('Conflit de modification.',409,'conflict');foreach(descendants($id) as $child)if($child!==$id){$row=query('SELECT * FROM pages WHERE id=?',[$child])->fetch();$category=($row['space_id']?:null)!==$space?category_for_kind($space,$row['kind']):($row['category_id']??null);query('UPDATE pages SET space_id=?,category_id=?,version=version+1,updated_at=? WHERE id=?',[$space,$category,now(),$child]);auto_publish_page($child);}if($parent)publish_inherited_children($parent);auto_publish_page($id);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}json_out(['page'=>get_page($id),'pages'=>list_pages()['pages']]);
    }
    if($action==='restore_revision'){
        $r=query('SELECT snapshot FROM revisions WHERE id=? AND page_id=?',[str_limit($in['revision_id']??'',36),$id])->fetch();if(!$r)fail('Version introuvable.',404);
        $snapshot=json_decode($r['snapshot'],true);$snapshot['id']=$id;$snapshot['version']=$p['version'];json_out(['page'=>save_page($snapshot)]);
    }
    fail('Action inconnue.',404);
}
function find_quiz(array $doc,string $id): ?array {
    if(($doc['type']??'')==='quiz'&&($doc['attrs']['quizId']??'')===$id)return $doc['attrs'];
    foreach($doc['content']??[] as $child){$q=find_quiz($child,$id);if($q)return $q;}return null;
}
function search_normalize(string $s): string { return mb_strtolower(iconv('UTF-8','ASCII//TRANSLIT//IGNORE',$s)?:$s); }
function document_text(array $doc): string {
    $text=is_string($doc['text']??null)?$doc['text']:'';
    foreach(['summary','label','title','description','name'] as $key)if(is_string($doc['attrs'][$key]??null))$text.=' '.$doc['attrs'][$key];
    if(($doc['type']??'')==='quiz')foreach($doc['attrs']['questions']??[] as $q){$text.=' '.str_limit($q['prompt']??'',3000);foreach($q['options']??[] as $option)$text.=' '.str_limit($option,3000);}
    foreach($doc['content']??[] as $child)$text.=' '.document_text($child);return $text;
}
