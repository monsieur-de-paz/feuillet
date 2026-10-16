<?php
declare(strict_types=1);
ini_set('display_errors','0');header('Cache-Control: no-store');header('Content-Type: application/json; charset=utf-8');header('X-Content-Type-Options: nosniff');
$root=dirname(__DIR__);$configPath=getenv('FEUILLET_CONFIG')?:$root.'/config.php';$lock=null;$journal=null;
try{
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){http_response_code(405);throw new RuntimeException('Méthode non autorisée.');}
    $config=require $configPath;$storage=$config['storage']??$root.'/storage';session_save_path($storage.'/sessions');session_name('feuillet_'.substr(hash('sha256',(realpath($storage)?:$storage).'|'.(rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME']??'/')),'/').'/')),0,16));ini_set('session.use_strict_mode','1');session_set_cookie_params(['lifetime'=>0,'path'=>rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME']??'/')),'/').'/','secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off','httponly'=>true,'samesite'=>'Lax']);session_start();
    if(empty($_SESSION['admin'])||($_SESSION['last_seen']??0)<time()-43200){http_response_code(401);throw new RuntimeException('Connexion nécessaire.');}
    $csrf=$_SERVER['HTTP_X_CSRF_TOKEN']??'';if(!is_string($csrf)||!hash_equals($_SESSION['csrf']??'', $csrf)){http_response_code(403);throw new RuntimeException('Session expirée.');}
    $lock=fopen($storage.'/deployment.lock','c+');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB)){http_response_code(409);throw new RuntimeException('Vérification en cours.');}
    $input=json_decode((string)file_get_contents('php://input',false,null,0,4096),true);$journal=json_decode((string)file_get_contents($storage.'/update-journal.json'),true,32,JSON_THROW_ON_ERROR);
    if(!is_array($input)||($input['id']??'')!==($journal['id']??null)||($journal['phase']??'')!=='validating'){http_response_code(409);$journal=null;throw new RuntimeException('Vérification indisponible.');}
    require_once $root.'/app/bootstrap.php';require_once $root.'/app/updates.php';require_once $root.'/app/actions.php';require_once $root.'/app/render.php';
    if(FEUILLET_VERSION!==$journal['version'])throw new RuntimeException('Version incohérente.');updates_manifest($root,$journal['version']);
    $journal['database_changed']=true;fu_write($storage.'/update-journal.json',$journal);
    $pdo=db();foreach($journal['new_tables']??$journal['tables'] as $table)$pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn();
    global_appearance();notebook_settings();render_document(['type'=>'doc','content'=>[['type'=>'paragraph','content'=>[['type'=>'text','text'=>'Feuillet']]]]],'',false);
    $bufferLevel=ob_get_level();ob_start();
    try{require $root.'/public/index.php';$entryHtml=(string)ob_get_contents();}
    finally{while(ob_get_level()>$bufferLevel)ob_end_clean();}
    if(!str_contains($entryHtml,'id="root"')||!str_contains($entryHtml,'assets/app.js'))throw new RuntimeException('La page d’administration ne démarre pas.');
    $journal['phase']='complete';$journal['message']='Feuillet '.$journal['version'].' est installé.';$journal['finished_at']=gmdate('c');updates_job_save($journal);
    if(!unlink($storage.'/update-journal.json'))throw new RuntimeException('Fin de maintenance impossible.');
    $state=updates_state();$state['error']=null;updates_save($state);
    echo json_encode(['ok'=>true,'version'=>FEUILLET_VERSION,'message'=>$journal['message']]);
}catch(Throwable $e){
    error_log('Feuillet update health: '.$e->getMessage());
    if($journal&&$lock&&isset($storage)){
        try{unset($GLOBALS['feuillet_pdo']);if(isset($pdo))$pdo=null;if(!function_exists('fu_recover'))require_once $storage.'/updates/recovery-engine.php';$journal['failed_phase']='validating';fu_recover($root,$storage,$journal,$config);http_response_code(503);echo json_encode(['error'=>'La nouvelle version ne démarre pas. La version précédente a été restaurée.','restored'=>true]);}
        catch(Throwable $rollback){error_log('Feuillet rollback: '.$rollback->getMessage());http_response_code(503);echo json_encode(['error'=>'Restauration à terminer. Les sauvegardes sont conservées ; consulte la procédure FTP.']);}
    }else{if(http_response_code()<400)http_response_code(503);echo json_encode(['error'=>'Vérification impossible. Réessaie ou restaure la version précédente.']);}
}finally{if($lock){flock($lock,LOCK_UN);fclose($lock);}}
