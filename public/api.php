<?php
declare(strict_types=1);
require_once __DIR__.'/update-guard.php';
require_once __DIR__.'/../app/bootstrap.php';
headers_secure();
try { require_once __DIR__.'/../app/actions.php'; api_dispatch(str_limit($_GET['action']??'session',40)); }
catch(AppError $e){json_out(['error'=>$e->getMessage(),'code'=>$e->errorCode],$e->status);}
catch(Throwable $e){error_log('Feuillet API: '.$e->getMessage());json_out(['error'=>'Une erreur est survenue. Consulte le journal PHP de l’hébergement.','code'=>'server_error'],500);}
