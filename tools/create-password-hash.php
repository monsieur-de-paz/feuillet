<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
fwrite(STDERR,"Mot de passe (12 caractères minimum, lu sur l’entrée standard) :\n");
$password=rtrim((string)fgets(STDIN),"\r\n");
if(strlen($password)<12){fwrite(STDERR,"Mot de passe trop court.\n");exit(1);}
echo password_hash($password,PASSWORD_DEFAULT)."\n";
