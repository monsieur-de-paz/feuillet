<?php
declare(strict_types=1);
require_once __DIR__.'/update-guard.php';
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
$checks=['PHP 8.3 ou plus'=>version_compare(PHP_VERSION,'8.3','>='),'PDO'=>extension_loaded('pdo'),'Pilote MySQL ou SQLite'=>extension_loaded('pdo_mysql')||extension_loaded('pdo_sqlite'),'mbstring'=>extension_loaded('mbstring'),'fileinfo'=>extension_loaded('fileinfo'),'ZIP'=>extension_loaded('zip'),'Dossier de configuration modifiable'=>is_writable(FEUILLET_ROOT),'Dossier de stockage modifiable'=>is_writable(storage())];
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
        $lock=fopen(storage().'/installation.lock','c+');if(!$lock)fail('Impossible de verrouiller l’installation.',500);if(!flock($lock,LOCK_EX))fail('Impossible de verrouiller l’installation.',500);
        $configPath=getenv('FEUILLET_CONFIG')?:FEUILLET_ROOT.'/config.php';if(is_file($configPath))fail('Une installation existe déjà.',409);
        $targetPath=storage().'/installation-target.json';
        $fingerprint=hash('sha256',($driver==='sqlite'?$c['sqlite_path']:$c['db_host'].':'.$c['db_port'].'/'.$c['db_name']).'|'.$installKey);
        $previous=is_file($targetPath)?json_decode((string)file_get_contents($targetPath),true):[];
        $existing=$driver==='sqlite'?$pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('pages','files','app_settings')")->fetchAll(PDO::FETCH_COLUMN):$pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        if(array_intersect($existing,['pages','files','app_settings'])&&($previous['fingerprint']??'')!==$fingerprint)fail('Cette base contient déjà une installation Feuillet. Choisis une base vide pour protéger ses données.');
        if(file_put_contents($targetPath,encoded(['fingerprint'=>$fingerprint]),LOCK_EX)===false||!chmod($targetPath,0600))fail('Impossible de préparer la connexion privée.',500);
        schema($pdo);
        $tmp=$configPath.'.'.bin2hex(random_bytes(8)).'.tmp';
        if(file_put_contents($tmp,"<?php\n// Configuration privée — ne pas publier sur GitHub.\nreturn ".var_export($c,true).";\n",LOCK_EX)===false)fail('Impossible de créer la configuration.',500);
        if(!chmod($tmp,0600)){unlink($tmp);fail('Impossible de protéger la configuration.',500);}if(!rename($tmp,$configPath))fail('Impossible d’activer la configuration.',500);
        if($driver==='sqlite')chmod($c['sqlite_path'],0600);
        unlink($installKeyPath);@unlink($targetPath);
        flock($lock,LOCK_UN);fclose($lock);
        session_regenerate_id(true);$_SESSION['admin']=true;$_SESSION['last_seen']=time();$_SESSION['csrf']=bin2hex(random_bytes(32));
        if($isJson)json_out(['ok'=>true,'csrf'=>$_SESSION['csrf'],'authenticated'=>true]);
        header('Location: index.php');exit;
    }catch(AppError $e){http_response_code($e->status);$error=$e->getMessage();if($isJson??false)json_out(['error'=>$error,'code'=>$e->errorCode],$e->status);}
    catch(Throwable $e){error_log('Feuillet installation: '.$e->getMessage());http_response_code(500);$error='Installation impossible. Consulte le journal PHP de l’hébergement.';if($isJson??false)json_out(['error'=>$error],500);}
}
$h=fn($s)=>htmlspecialchars((string)$s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
?>
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Installer Feuillet</title><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="setup.css?v=<?=$h(FEUILLET_VERSION)?>"><script src="setup.js?v=<?=$h(FEUILLET_VERSION)?>" defer></script></head>
<body class="installer"><a class="setup-skip" href="#installation">Aller à l’installation</a>
<div class="setup-layout"><aside class="setup-story"><a class="setup-brand" href="setup.php"><img src="feuillet-logo.svg" alt="" width="38" height="38"><span>Feuillet.</span></a>
<div class="story-copy"><p class="setup-eyebrow">UN CARNET QUI T’APPARTIENT</p><h1>Le début <br>d’une belle page.</h1><p>Tes notes enrichies, tes documents et tes idées, réunis sur ton propre hébergement.</p></div>
<div class="setup-landscape" aria-hidden="true"><img src="feuillet-logo.png" alt="" width="220" height="220"></div>
<div class="story-note"><span class="note-dot"></span><p>Chez toi, sur ton hébergement.<br><strong>Libre, sans abonnement.</strong></p></div></aside>
<main id="installation" class="setup-main"><header class="setup-heading"><div><p class="setup-eyebrow">INSTALLATION · <?=$h(FEUILLET_VERSION)?></p><h2>Bienvenue dans Feuillet.</h2><p>Quelques réglages, puis ton carnet est prêt.</p></div><span class="setup-duration">3 étapes</span></header>
<nav class="setup-progress" aria-label="Étapes de l’installation"><ol><li aria-current="step"><span>1</span>Hébergement</li><li><span>2</span>Carnet</li><li><span>3</span>Connexion</li></ol><div class="progress-track"><span></span></div></nav>
<div id="setup-error" class="setup-alert" role="alert" <?=$error?'':'hidden'?>><?=$h($error)?></div>
<form id="setup-form" method="post" autocomplete="off"><input type="hidden" name="csrf" value="<?=$h($_SESSION['csrf'])?>">
<fieldset data-step="0"><legend>Ton hébergement est-il prêt ?</legend><p class="step-description">Ces vérifications se font directement sur ton serveur.</p>
<ul class="setup-checks"><?php foreach($checks as $label=>$ok):?><li class="<?=$ok?'check-ok':'check-fail'?>"><span aria-label="<?=$ok?'Disponible':'Manquant'?>"><?=$ok?'✓':'!'?></span><?=$h($label)?></li><?php endforeach;?></ul>
<p class="setup-help">PHP <?=$h(PHP_VERSION)?> · limite d’envoi PHP <?=$h(ini_get('upload_max_filesize'))?>. <?=extension_loaded('curl')?'cURL disponible pour les mises à jour GitHub.':'Tu peux installer Feuillet ; active cURL pour les mises à jour intégrées.'?></p>
<div class="setup-key-note"><strong>Une clé pour protéger cette première installation</strong><p>Avec ton accès FTP, ouvre <code>storage/installation-key.txt</code> et copie la clé. Ce fichier privé sera supprimé après l’installation.</p></div>
<label for="installation-key">Clé privée d’installation</label><input id="installation-key" type="password" name="installation_key" required minlength="64" maxlength="64" pattern="[a-f0-9]{64}" autocomplete="off" spellcheck="false" placeholder="La clé copiée depuis ton hébergement">
</fieldset>
<fieldset data-step="1"><legend>Donne une place à tes idées.</legend><p class="step-description">Tu pourras modifier le nom et l’apparence du site plus tard.</p>
<label for="notebook-name">Nom de ton site</label><input id="notebook-name" name="name" value="Feuillet." required maxlength="80" autocomplete="organization">
<div class="setup-form-grid"><div><label for="password">Ton mot de passe</label><div class="password-field"><input id="password" type="password" name="password" minlength="12" required autocomplete="new-password"><button type="button" class="password-toggle" data-password="password" aria-label="Afficher le mot de passe" aria-pressed="false">Voir</button></div></div><div><label for="password-confirm">Confirme le mot de passe</label><div class="password-field"><input id="password-confirm" type="password" name="password_confirm" minlength="12" required autocomplete="new-password"><button type="button" class="password-toggle" data-password="password-confirm" aria-label="Afficher la confirmation" aria-pressed="false">Voir</button></div></div></div>
<p class="setup-help">Au moins 12 caractères, 72 octets maximum. Tu seras le seul administrateur ; tes visiteurs pourront consulter les pages que tu choisis de partager.</p><div class="password-meter" aria-hidden="true"><span></span></div><p id="password-hint" class="setup-help" aria-live="polite"></p>
</fieldset>
<fieldset data-step="2"><legend>Connecte ton carnet.</legend><p class="step-description">Sur OVH, retrouve ces informations dans Web Cloud → Hébergements → Bases de données.</p>
<label for="driver">Base de données</label><select id="driver" name="driver"><option value="mysql" <?=extension_loaded('pdo_mysql')?'':'disabled'?>>MySQL / MariaDB — conseillé sur OVH</option><?php if(extension_loaded('pdo_sqlite')):?><option value="sqlite">SQLite — local ou hébergement compatible</option><?php endif;?></select>
<div id="mysql-fields"><div class="setup-form-grid"><div><label for="db-host">Serveur SQL</label><input id="db-host" name="db_host" placeholder="nom.mysql.db" autocomplete="off"></div><div><label for="db-port">Port</label><input id="db-port" type="number" name="db_port" value="3306" min="1" max="65535"></div><div><label for="db-name">Nom de la base</label><input id="db-name" name="db_name" autocomplete="off"></div><div><label for="db-user">Utilisateur SQL</label><input id="db-user" name="db_user" autocomplete="off"></div></div><label for="db-password">Mot de passe SQL</label><div class="password-field"><input id="db-password" type="password" name="db_password" autocomplete="new-password"><button type="button" class="password-toggle" data-password="db-password" aria-label="Afficher le mot de passe SQL" aria-pressed="false">Voir</button></div></div>
<p id="sqlite-note" class="setup-help" hidden>La base sera créée dans le stockage privé. Aucun identifiant SQL n’est nécessaire.</p><div class="setup-summary"><span>✓</span><p>Tes pages commenceront en privé.<br>Tu choisiras ensuite lesquelles partager.</p></div>
</fieldset>
<div class="setup-actions"><button type="button" class="setup-back" hidden>← Retour</button><button type="button" class="setup-next" hidden <?=in_array(false,$checks,true)?'disabled':''?>>Continuer <span>→</span></button><button class="setup-submit" type="submit" <?=in_array(false,$checks,true)?'disabled':''?>><span>Créer mon carnet</span><span aria-hidden="true">→</span></button></div><p id="setup-status" role="status" aria-live="polite"></p>
</form><footer class="setup-footer"><small>Propulsé par <a href="https://github.com/monsieur-de-paz/feuillet" target="_blank" rel="noopener noreferrer">Feuillet</a>, créé par Sandro de PAZ.</small><span>Logiciel libre · MIT</span></footer></main></div></body></html>
