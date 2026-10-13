<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
headers_secure();
if(installed()){header('Location: index.php');exit;}
start_session();$error='';
$installKey='';$installKeyPath=storage().'/installation-key.txt';
try{
    // Only the hosting owner can read this secret through FTP or the private disk.
    $keyLock=fopen(storage().'/installation-key.lock','c+');if(!$keyLock||!flock($keyLock,LOCK_EX))fail('Impossible de préparer la clé d’installation.',503);
    try{
        if(!is_file($installKeyPath)){
            $keyFile=fopen($installKeyPath,'xb');if(!$keyFile)fail('Impossible de créer la clé d’installation.',503);
            try{if(!chmod($installKeyPath,0600))fail('Impossible de protéger la clé d’installation.',503);$newKey=bin2hex(random_bytes(32));if(fwrite($keyFile,$newKey."\n")!==65)fail('Impossible de conserver la clé d’installation.',503);}finally{fclose($keyFile);}
        }
        $installKey=trim((string)file_get_contents($installKeyPath));if(!preg_match('/^[a-f0-9]{64}$/D',$installKey))fail('Clé d’installation indisponible. Vérifie le dossier de stockage privé.',503);
    }finally{flock($keyLock,LOCK_UN);fclose($keyLock);}
}catch(AppError $e){http_response_code($e->status);$error=$e->getMessage();}
catch(Throwable){http_response_code(503);$error='Le dossier privé de stockage doit être modifiable pour préparer l’installation.';}
$checks=['PHP 8.3 ou plus'=>version_compare(PHP_VERSION,'8.3','>='),'PDO'=>extension_loaded('pdo'),'mbstring'=>extension_loaded('mbstring'),'fileinfo'=>extension_loaded('fileinfo'),'ZIP'=>extension_loaded('zip'),'Dossier de configuration modifiable'=>is_writable(FEUILLET_ROOT),'Dossier de stockage modifiable'=>is_writable(storage())];
if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
    try{
        $isJson=str_contains($_SERVER['CONTENT_TYPE']??'','application/json');$in=$isJson?json_in():$_POST;
        if($isJson&&!isset($_SERVER['HTTP_X_CSRF_TOKEN']))$_SERVER['HTTP_X_CSRF_TOKEN']=$in['csrf']??'';
        csrf();$providedKey=$in['installation_key']??'';if(!$installKey||!is_string($providedKey)||!hash_equals($installKey,trim($providedKey)))fail('Clé d’installation incorrecte. Lis-la dans storage/installation-key.txt avec ton accès FTP.',403,'installation_key');
        if(in_array(false,$checks,true))fail('Un prérequis manque. Consulte les vérifications ci-dessous.');
        $password=$in['password']??'';if(!is_string($password)||!mb_check_encoding($password,'UTF-8')||mb_strlen($password,'UTF-8')<12||strlen($password)>72)fail('Choisis un mot de passe de 12 caractères minimum (72 octets maximum).');
        if($password!==($in['password_confirm']??''))fail('Les deux mots de passe ne correspondent pas.');
        $driver=$in['driver']??'mysql';if(!in_array($driver,['mysql','sqlite'],true))fail('Base de données inconnue.');
        if(!extension_loaded('pdo_'.$driver))fail('Le pilote PDO de cette base manque.');
        $c=['name'=>str_limit($in['name']??'Feuillet.',80)?:'Feuillet.','driver'=>$driver,'password_hash'=>password_hash($password,PASSWORD_DEFAULT),'secret'=>bin2hex(random_bytes(32)),'storage'=>realpath(storage()),'max_upload'=>104857600];
        if($driver==='sqlite'){$c['sqlite_path']=$c['storage'].'/feuillet.sqlite';$pdo=new PDO('sqlite:'.$c['sqlite_path']);}
        else{
            $host=str_limit($in['db_host']??'',255);$name=str_limit($in['db_name']??'',128);$port=(int)($in['db_port']??3306);
            if(!preg_match('/^[a-zA-Z0-9._-]+$/',$host)||!preg_match('/^[a-zA-Z0-9_-]+$/',$name)||$port<1||$port>65535)fail('Serveur, nom de base ou port invalide.');
            $c+=['db_host'=>$host,'db_port'=>$port,'db_name'=>$name,'db_user'=>str_limit($in['db_user']??'',128),'db_password'=>is_string($in['db_password']??null)?$in['db_password']:''];
            try{$pdo=new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",$c['db_user'],$c['db_password']);}catch(Throwable){fail('Connexion impossible à la base. Vérifie les identifiants fournis par OVH.');}
        }
        $pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        $lock=fopen(storage().'/installation.lock','c+');if(!$lock)fail('Impossible de verrouiller l’installation.',500);flock($lock,LOCK_EX);
        $configPath=getenv('FEUILLET_CONFIG')?:FEUILLET_ROOT.'/config.php';if(is_file($configPath))fail('Une installation existe déjà.',409);
        schema($pdo);
        $tmp=$configPath.'.'.bin2hex(random_bytes(8)).'.tmp';
        if(file_put_contents($tmp,"<?php\n// Configuration privée — ne pas publier sur GitHub.\nreturn ".var_export($c,true).";\n",LOCK_EX)===false)fail('Impossible de créer la configuration.',500);
        chmod($tmp,0600);if(!rename($tmp,$configPath))fail('Impossible d’activer la configuration.',500);
        if($driver==='sqlite')chmod($c['sqlite_path'],0600);
        unlink($installKeyPath);
        flock($lock,LOCK_UN);fclose($lock);
        session_regenerate_id(true);$_SESSION['admin']=true;$_SESSION['last_seen']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));
        if($isJson)json_out(['ok'=>true,'csrf'=>$_SESSION['csrf'],'authenticated'=>true]);
        header('Location: index.php');exit;
    }catch(AppError $e){http_response_code($e->status);$error=$e->getMessage();if($isJson??false)json_out(['error'=>$error,'code'=>$e->errorCode],$e->status);}
    catch(Throwable $e){error_log('Feuillet installation: '.$e->getMessage());http_response_code(500);$error='Installation impossible. Consulte le journal PHP de l’hébergement.';}
}
$h=fn($s)=>htmlspecialchars((string)$s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
?>
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Installer Feuillet</title><link rel="stylesheet" href="reader.css"></head><body class="setup-body"><main class="setup-card"><div class="brand">▤ FEUILLET</div><p class="eyebrow">TON CARNET, CHEZ TOI</p><h1>Un espace pour écrire<br>et transmettre.</h1><p>Installe ton carnet personnel. Tes pages resteront privées jusqu’à leur publication.</p>
<?php if($error):?><div class="callout tone-red" role="alert"><?=$h($error)?></div><?php endif;?>
<details><summary>Vérifications de l’hébergement</summary><ul><?php foreach($checks as $label=>$ok):?><li><?=$ok?'✓':'✗'?> <?=$h($label)?></li><?php endforeach;?></ul><p>PHP <?=$h(PHP_VERSION)?> · Envoi PHP : <?=$h(ini_get('upload_max_filesize'))?></p></details>
<form method="post" autocomplete="off"><input type="hidden" name="csrf" value="<?=$h($_SESSION['csrf'])?>"><p class="small">Avec ton accès FTP, ouvre le fichier privé <code>storage/installation-key.txt</code>, puis colle sa clé ci-dessous. Elle sera supprimée après l’installation.</p><label>Clé privée d’installation<input type="password" name="installation_key" required minlength="64" maxlength="64" pattern="[a-f0-9]{64}" autocomplete="off"></label><label>Nom de ton carnet<input name="name" value="Feuillet." required maxlength="80"></label><div class="form-grid"><label>Ton mot de passe<input type="password" name="password" minlength="12" required autocomplete="new-password"></label><label>Confirme le mot de passe<input type="password" name="password_confirm" minlength="12" required autocomplete="new-password"></label></div><p class="small">12 caractères minimum. Tu seras le seul administrateur.</p>
<label>Base de données<select name="driver"><option value="mysql">MySQL / MariaDB — recommandé sur OVH</option><?php if(extension_loaded('pdo_sqlite')):?><option value="sqlite">SQLite — installation locale ou hébergement compatible</option><?php endif;?></select></label><p class="small">Pour SQLite, les champs suivants peuvent rester vides. Pour OVH, utilise les paramètres de ta base dans l’espace client.</p><div class="form-grid"><label>Serveur SQL<input name="db_host" placeholder="ex. : nom.mysql.db"></label><label>Port<input type="number" name="db_port" value="3306" min="1" max="65535"></label><label>Nom de la base<input name="db_name"></label><label>Utilisateur SQL<input name="db_user"></label></div><label>Mot de passe SQL<input type="password" name="db_password" autocomplete="new-password"></label><button class="primary" type="submit" <?=in_array(false,$checks,true)?'disabled':''?>>Créer mon carnet →</button></form><p class="small">Logiciel libre · Aucun compte auprès d’un service externe · Version <?=$h(FEUILLET_VERSION)?></p></main></body></html>
