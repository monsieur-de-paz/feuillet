<?php
declare(strict_types=1);
/** Before bootstrap, every ordinary PHP request holds a shared deployment lock. */
if(PHP_SAPI==='cli')return;
$fuRoot=dirname(__DIR__);$fuConfigPath=getenv('FEUILLET_CONFIG')?:$fuRoot.'/config.php';
if(!is_file($fuConfigPath))return;
$fuConfig=require $fuConfigPath;$fuStorage=$fuConfig['storage']??$fuRoot.'/storage';
$fuEndpoint=basename($_SERVER['SCRIPT_FILENAME']??'');
if(in_array($fuEndpoint,['recover.php','update-health.php'],true))return;
$fuLock=fopen($fuStorage.'/deployment.lock','c+');
$fuBusy=function():never{http_response_code(503);header('Retry-After: 30');header('Content-Type: text/html; charset=utf-8');header('Cache-Control: no-store');echo '<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Feuillet se met à jour</title><p style="font:18px system-ui;max-width:36rem;margin:15vh auto;padding:24px">Feuillet se met à jour. Tes pages seront de nouveau disponibles dans un instant.</p></html>';exit;};
if(!$fuLock||!flock($fuLock,LOCK_SH|LOCK_NB))$fuBusy();
$fuJournalPath=$fuStorage.'/update-journal.json';
if(is_file($fuJournalPath)){
    $fuJournal=json_decode((string)file_get_contents($fuJournalPath),true);
    if(!is_array($fuJournal))$fuBusy();
    flock($fuLock,LOCK_UN);
    if(($fuJournal['phase']??'')==='validating'&&($fuJournal['deadline']??0)>time())$fuBusy();
    if(!flock($fuLock,LOCK_EX|LOCK_NB))$fuBusy();
    try{
        // Re-read after locking: another request may already have recovered.
        if(is_file($fuJournalPath)){$fuJournal=json_decode((string)file_get_contents($fuJournalPath),true,32,JSON_THROW_ON_ERROR);require_once $fuStorage.'/updates/recovery-engine.php';fu_recover($fuRoot,$fuStorage,$fuJournal,$fuConfig);}
    }catch(Throwable $e){error_log('Feuillet recovery: '.$e->getMessage());$fuBusy();}
    flock($fuLock,LOCK_SH);
}
$GLOBALS['feuillet_deployment_lock']=$fuLock;
register_shutdown_function(static function()use($fuLock):void{if(is_resource($fuLock)){flock($fuLock,LOCK_UN);fclose($fuLock);}});
unset($fuConfig,$fuConfigPath,$fuStorage,$fuRoot,$fuEndpoint,$fuJournalPath,$fuJournal,$fuBusy);
