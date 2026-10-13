<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/../app/bootstrap.php';
if(!installed()){fwrite(STDERR,"Ce carnet n’est pas installé.\n");exit(1);}
fwrite(STDERR,"Nouveau mot de passe (12 caractères minimum, lu sur l’entrée standard) :\n");
$password=rtrim((string)fgets(STDIN),"\r\n");
if(strlen($password)<12){fwrite(STDERR,"Mot de passe trop court.\n");exit(1);}
$config=cfg();$config['password_hash']=password_hash($password,PASSWORD_DEFAULT);unset($password);
$path=getenv('FEUILLET_CONFIG')?:FEUILLET_ROOT.'/config.php';$tmp=$path.'.'.bin2hex(random_bytes(8)).'.tmp';
if(file_put_contents($tmp,"<?php\nreturn ".var_export($config,true).";\n",LOCK_EX)===false||!chmod($tmp,0600)||!rename($tmp,$path)){fwrite(STDERR,"Impossible d’écrire la configuration.\n");exit(1);}
// Invalidate existing admin sessions after a credential reset.
foreach(glob(storage().'/sessions/sess_*')?:[] as $session)if(is_file($session))unlink($session);
fwrite(STDERR,"Mot de passe remplacé. Les sessions existantes sont fermées.\n");
