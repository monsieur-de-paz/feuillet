<?php
declare(strict_types=1);
// This endpoint intentionally runs without bootstrap or the newly installed code.
ini_set('display_errors','0');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('Content-Type: application/json; charset=utf-8');
$root=dirname(__DIR__);$configPath=getenv('FEUILLET_CONFIG')?:$root.'/config.php';
try{
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){http_response_code(405);throw new RuntimeException('Méthode non autorisée.');}
    if(!is_file($configPath))throw new RuntimeException('Installation indisponible.');$config=require $configPath;$storage=$config['storage']??$root.'/storage';
    session_save_path($storage.'/sessions');session_name('feuillet_'.substr(hash('sha256',(realpath($storage)?:$storage).'|'.(rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME']??'/')),'/').'/')),0,16));ini_set('session.use_strict_mode','1');session_set_cookie_params(['lifetime'=>0,'path'=>rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME']??'/')),'/').'/','secure'=>!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off','httponly'=>true,'samesite'=>'Lax']);session_start();
    if(empty($_SESSION['admin'])||($_SESSION['last_seen']??0)<time()-43200){http_response_code(401);throw new RuntimeException('Connexion nécessaire.');}
    $csrf=$_SERVER['HTTP_X_CSRF_TOKEN']??'';if(!is_string($csrf)||!hash_equals($_SESSION['csrf']??'', $csrf)){http_response_code(403);throw new RuntimeException('Session expirée.');}
    $lock=fopen($storage.'/deployment.lock','c+');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB)){http_response_code(409);throw new RuntimeException('Installation encore en cours. Réessaie dans un instant.');}
    try{
        $input=json_decode((string)file_get_contents('php://input',false,null,0,4096),true);$requested=$input['id']??'';
        if(!is_string($requested)||!preg_match('/^[a-f0-9]{32}$/D',$requested)){http_response_code(400);throw new RuntimeException('Identifiant de mise à jour nécessaire.');}
        $path=$storage.'/update-journal.json';
        if(is_file($path)){$journal=json_decode((string)file_get_contents($path),true,32,JSON_THROW_ON_ERROR);if(($journal['id']??'')!==$requested){http_response_code(409);throw new RuntimeException('Une autre mise à jour est en cours.');}require_once $storage.'/updates/recovery-engine.php';fu_recover($root,$storage,$journal,$config);}
        if(!is_file($path)){
            $settingsPath=$storage.'/updates/settings.json';$settings=is_file($settingsPath)?json_decode((string)file_get_contents($settingsPath),true):[];
            $id=$settings['last_job']??'';if($id!==$requested){http_response_code(409);throw new RuntimeException('Cette opération a été remplacée par une autre.');}if(preg_match('/^[a-f0-9]{32}$/D',$id)){$jobPath=$storage.'/updates/'.$id.'/job.json';$job=json_decode((string)file_get_contents($jobPath),true);if(($job['phase']??'')==='complete'){echo json_encode(['ok'=>true,'already_installed'=>true,'message'=>'La nouvelle version est déjà installée.']);exit;}if(is_array($job)&&in_array($job['phase']??'', ['download','extract','apply'],true)){require_once $root.'/app/update-safety.php';$job['phase']='failed';$job['message']='Préparation annulée. La version installée est conservée.';fu_write($jobPath,$job);}}
        }
        $restored=($job['phase']??'')==='rolled_back'||(!empty($journal)&&(!empty($journal['files_changed'])||!empty($journal['database_changed'])));
        echo json_encode(['ok'=>true,'restored'=>$restored,'unchanged'=>!$restored,'message'=>$restored?'La version précédente a été restaurée.':'La préparation a été arrêtée avant le remplacement. La version installée est conservée.']);
    }finally{flock($lock,LOCK_UN);fclose($lock);}
}catch(Throwable $e){if(http_response_code()<400)http_response_code(503);error_log('Feuillet recovery endpoint: '.$e->getMessage());echo json_encode(['error'=>http_response_code()===503?'Restauration incomplète. Les sauvegardes sont conservées ; consulte la procédure FTP.':$e->getMessage()]);}
