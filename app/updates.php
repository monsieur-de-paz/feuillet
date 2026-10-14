<?php
declare(strict_types=1);
require_once __DIR__.'/update-safety.php';
const UPDATE_REPOSITORY='monsieur-de-paz/feuillet';
const UPDATE_TABLES=['pages','revisions','files','spaces','app_settings','categories','collections','collection_properties','collection_rows','collection_forms','form_uploads'];
function updates_dir(): string {$dir=storage().'/updates';if(!is_dir($dir)&&!mkdir($dir,0700,true))fail('Dossier des mises à jour inaccessible.',503);return $dir;}
function updates_state(): array {
    $path=updates_dir().'/settings.json';$value=is_file($path)?json_decode((string)file_get_contents($path),true):[];
    return array_replace(['notifications'=>true,'postponed_until'=>0,'ignored'=>[],'skip_until'=>null,'checked_at'=>0,'release'=>null,'error'=>null,'token'=>'','last_job'=>null],is_array($value)?$value:[]);
}
function updates_save(array $state): void {fu_write(updates_dir().'/settings.json',$state);}
function updates_job(string $id): array {if(!preg_match('/^[a-f0-9]{32}$/D',$id))fail('Mise à jour inconnue.',404);$path=updates_dir().'/'.$id.'/job.json';if(!is_file($path))fail('Mise à jour inconnue.',404);return json_decode((string)file_get_contents($path),true,32,JSON_THROW_ON_ERROR);}
function updates_job_save(array $job): void {$job['updated_at']=time();fu_write(updates_dir().'/'.$job['id'].'/job.json',$job);}
function updates_lock() { $fp=fopen(storage().'/deployment.lock','c+');if(!$fp||!flock($fp,LOCK_EX|LOCK_NB)){if($fp)fclose($fp);fail('Une opération est en cours. Réessaie dans quelques instants.',409,'update_busy');}return $fp; }
function updates_control_lock() { $fp=fopen(updates_dir().'/control.lock','c+');if(!$fp||!flock($fp,LOCK_EX|LOCK_NB)){if($fp)fclose($fp);fail('Une vérification ou préparation est en cours. Réessaie dans un instant.',409,'update_busy');}return $fp; }
function updates_available(array $state): bool {
    $r=$state['release'];return is_array($r)&&version_compare($r['version'],FEUILLET_VERSION,'>');
}
function updates_status(): array {
    $s=updates_state();$job=null;if($s['last_job'])try{$j=updates_job($s['last_job']);$job=['id'=>$j['id'],'phase'=>$j['phase'],'message'=>$j['message']??'','version'=>$j['version'],'updated_at'=>$j['updated_at']??0,'has_backup'=>!empty($j['database_sha256'])&&is_file(updates_dir().'/'.$j['id'].'/backup.json')];}catch(Throwable){}
    $available=updates_available($s);$r=$s['release'];
    $show=$available&&$s['notifications']&&$s['postponed_until']<=time()&&!in_array($r['version'],$s['ignored'],true)&&(!$s['skip_until']||version_compare($r['version'],$s['skip_until'],'>'));
    $checks=['curl'=>extension_loaded('curl'),'zip'=>class_exists(ZipArchive::class),'tokenizer'=>function_exists('token_get_all'),'code_writable'=>is_writable(FEUILLET_ROOT)&&is_writable(FEUILLET_ROOT.'/public')&&is_writable(FEUILLET_ROOT.'/app'),'storage_writable'=>is_writable(storage()),'distribution'=>is_file(FEUILLET_ROOT.'/update-manifest.json'),'git_checkout'=>is_dir(FEUILLET_ROOT.'/.git')];
    $ready=!in_array(false,array_diff_key($checks,['git_checkout'=>true]),true)&&!$checks['git_checkout'];
    return ['installed_version'=>FEUILLET_VERSION,'repository'=>UPDATE_REPOSITORY,'notifications'=>(bool)$s['notifications'],'token_configured'=>$s['token']!=='','checked_at'=>$s['checked_at'],'release'=>$r,'available'=>$available,'show_notification'=>$show,'check_error'=>$s['error'],'checks'=>$checks,'ready'=>$ready,'job'=>$job];
}
function updates_url(string $url,bool $asset=false): array {
    $p=parse_url($url);$host=$p['host']??'';
    if(!$p||($p['scheme']??'')!=='https'||isset($p['user'])||isset($p['pass'])||isset($p['port'])||isset($p['fragment']))fail('Adresse de mise à jour refusée.');
    if($host==='api.github.com'){
        if(isset($p['query'])||!preg_match('~^/repos/'.preg_quote(UPDATE_REPOSITORY,'~').'/releases/(latest|tags/v?\d+\.\d+\.\d+|assets/[1-9]\d*)$~D',$p['path']??''))fail('Dépôt de mise à jour refusé.');
    }elseif(!$asset||!in_array($host,['release-assets.githubusercontent.com','objects.githubusercontent.com'],true))fail('Serveur de mise à jour refusé.');
    return $p;
}
/** HTTPS, bounded streaming; redirects are validated and never carry the token off api.github.com. */
function updates_http(string $url,string $accept,int $max,?string $destination=null): string {
    if(!extension_loaded('curl'))fail('Active l’extension PHP cURL pour vérifier les mises à jour.',503);
    $token=updates_state()['token'];
    for($redirect=0;$redirect<4;$redirect++){
        $p=updates_url($url,$accept==='application/octet-stream');$headers=['Accept: '.$accept,'User-Agent: Feuillet/'.FEUILLET_VERSION,'X-GitHub-Api-Version: 2022-11-28'];
        if($p['host']==='api.github.com'&&$token!=='')$headers[]='Authorization: Bearer '.$token;
        $body='';$bytes=0;$location='';$out=$destination?fopen($destination,'wb'):null;if($destination&&!$out)fail('Téléchargement impossible.',500);
        $ch=curl_init($url);curl_setopt_array($ch,[CURLOPT_HTTPHEADER=>$headers,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>60,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
            CURLOPT_HEADERFUNCTION=>static function($ch,$line)use(&$location){if(str_starts_with(strtolower($line),'location:'))$location=trim(substr($line,9));return strlen($line);},
            CURLOPT_WRITEFUNCTION=>static function($ch,$chunk)use(&$body,&$bytes,$max,$out){$bytes+=strlen($chunk);if($bytes>$max)return 0;if($out)return fwrite($out,$chunk);$body.=$chunk;return strlen($chunk);}
        ]);
        try{$ok=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);}finally{unset($ch);if($out)fclose($out);}
        if(in_array($status,[301,302,303,307,308],true)&&$location!==''){updates_url($location,true);$url=$location;continue;}
        if($ok===false||$bytes>$max)fail('Téléchargement interrompu ou trop volumineux. Réessaie plus tard.',503,'update_download');
        if($status===404)fail('Releases indisponibles. Si le dépôt est privé, renseigne un jeton GitHub avec accès en lecture au contenu.',503,'update_private');
        if($status===401||$status===403)fail('GitHub refuse la vérification : vérifie le jeton ou réessaie après la limite de requêtes.',503,'update_access');
        if($status!==200)fail('GitHub est temporairement indisponible. Réessaie plus tard.',503,'update_download');return $body;
    }fail('Trop de redirections GitHub.',503);
}
function updates_release(array $raw): array {
    if(!empty($raw['draft'])||!empty($raw['prerelease'])||!preg_match('/^v?(\d+\.\d+\.\d+)$/D',$raw['tag_name']??'',$m))fail('Release stable compatible introuvable.');
    $version=$m[1];$asset=null;$sum=null;foreach($raw['assets']??[] as $a){if(($a['name']??'')==='Feuillet-'.$version.'.zip')$asset=$a;if(($a['name']??'')==='Feuillet-'.$version.'.sha256')$sum=$a;}
    if(!$asset||!$sum||!preg_match('/^sha256:([a-f0-9]{64})$/D',$asset['digest']??'',$hash))fail('La release ne contient pas une distribution vérifiable.');
    foreach([$asset,$sum] as $a){if(!is_int($a['id']??null)||$a['id']<1)fail('Pièce de release invalide.');}
    if(($asset['size']??0)<1||$asset['size']>104857600)fail('Distribution trop volumineuse.');
    return ['version'=>$version,'tag'=>$raw['tag_name'],'name'=>str_limit($raw['name']??'Feuillet '.$version,200),'notes'=>str_limit($raw['body']??'',12000),'url'=>'https://github.com/'.UPDATE_REPOSITORY.'/releases/tag/'.rawurlencode($raw['tag_name']),'asset_id'=>$asset['id'],'checksum_id'=>$sum['id'],'size'=>(int)$asset['size'],'sha256'=>$hash[1],'published_at'=>str_limit($raw['published_at']??'',50)];
}
function updates_check(bool $force=false): array {
    $s=updates_state();if(!$force&&(!$s['notifications']||$s['checked_at']>time()-86400))return updates_status();
    if($s['checked_at']>time()-60)return updates_status(); // even manual checks respect a small rate limit
    $s['checked_at']=time();$s['error']=null;
    try{$raw=json_decode(updates_http('https://api.github.com/repos/'.UPDATE_REPOSITORY.'/releases/latest','application/vnd.github+json',2097152),true,40,JSON_THROW_ON_ERROR);$s['release']=updates_release($raw);}catch(Throwable $e){$s['error']=$e instanceof AppError?$e->getMessage():'Réponse GitHub illisible. Réessaie plus tard.';}
    updates_save($s);return updates_status();
}
function updates_preferences(array $in): array {
    $s=updates_state();$action=$in['choice']??null;$version=$s['release']['version']??null;
    if($action==='later')$s['postponed_until']=time()+7*86400;
    elseif($action==='next'&&$version)$s['skip_until']=$version;
    elseif($action==='ignore'&&$version)$s['ignored']=array_slice(array_values(array_unique([...$s['ignored'],$version])),-100);
    elseif($action==='mute')$s['notifications']=false;
    elseif($action==='enable'){$s['notifications']=true;$s['postponed_until']=0;$s['ignored']=[];$s['skip_until']=null;}
    elseif($action!==null)fail('Choix de notification invalide.');
    if(array_key_exists('token',$in)){$token=$in['token'];if(!is_string($token)||strlen($token)>255||($token!==''&&!preg_match('/^[a-zA-Z0-9_]+$/D',$token)))fail('Jeton GitHub invalide.');$s['token']=$token;$s['checked_at']=0;$s['error']=null;}
    updates_save($s);return updates_status();
}
function updates_manifest(string $directory,?string $expected=null): array {
    $path=$directory.'/update-manifest.json';if(!is_file($path)||filesize($path)>2097152)fail('Manifeste de distribution absent.');$m=json_decode((string)file_get_contents($path),true,32,JSON_THROW_ON_ERROR);
    if(($m['format']??'')!=='feuillet-distribution'||($m['protocol']??0)!==1||!preg_match('/^\d+\.\d+\.\d+$/D',$m['version']??'')||($expected!==null&&$m['version']!==$expected)||!is_array($m['files']??null)||count($m['files'])>10000)fail('Distribution incompatible.');
    if(version_compare(PHP_VERSION,$m['php_min']??'8.3','<'))fail('Cette version demande un PHP plus récent. Modifie la version PHP dans ton hébergement.');
    foreach($m['extensions']??[] as $extension)if(!is_string($extension)||!extension_loaded($extension))fail('Extension PHP nécessaire : '.str_limit($extension,40));
    if(!is_array($m['database_tables']??null)||count($m['database_tables'])>64)fail('Liste des tables incompatible.');foreach($m['database_tables'] as $table)if(!is_string($table)||!preg_match('/^[a-z_]+$/D',$table))fail('Table de distribution invalide.');
    foreach($m['files'] as $relative=>$hash){if(!fu_path($relative)||$relative==='update-manifest.json'||!preg_match('/^[a-f0-9]{64}$/D',(string)$hash))fail('Chemin de manifeste interdit.');$file=fu_target($directory,$relative);if(!is_file($file)||hash_file('sha256',$file)!==$hash)fail('La distribution est incomplète ou endommagée.');if(str_ends_with($relative,'.php')){try{token_get_all((string)file_get_contents($file),TOKEN_PARSE);}catch(ParseError){fail('Un fichier PHP de la distribution est invalide.');}}}
    foreach(['app/bootstrap.php','app/updates.php','app/update-safety.php','public/index.php','public/api.php','public/update-guard.php','public/recover.php','public/update-health.php','public/assets/app.js','public/assets/app.css','storage/.htaccess'] as $required){if($required==='storage/.htaccess')continue;if(!isset($m['files'][$required]))fail('Fichier essentiel absent de la distribution.');}
    return $m;
}
function updates_start(string $version): array {
    $status=updates_status();if(!$status['ready'])fail('Cet hébergement ne permet pas la mise à jour intégrée. Consulte les vérifications et la procédure FTP.',503);
    $s=updates_state();if(!updates_available($s)||$version!==$s['release']['version'])fail('Vérifie la dernière release avant de l’installer.',409);
    if(is_file(storage().'/update-journal.json'))fail('Une installation doit être terminée ou restaurée.',409);
    if($s['last_job']){$last=updates_job($s['last_job']);if(!in_array($last['phase'],['complete','failed','rolled_back'],true)&&($last['updated_at']??0)>time()-900)fail('Une mise à jour est déjà préparée.',409);}
    $fresh=updates_release(json_decode(updates_http('https://api.github.com/repos/'.UPDATE_REPOSITORY.'/releases/tags/'.rawurlencode($s['release']['tag']),'application/vnd.github+json',2097152),true,40,JSON_THROW_ON_ERROR));
    if($fresh['sha256']!==$s['release']['sha256'])fail('La release a changé. Vérifie-la de nouveau.',409);
    $id=bin2hex(random_bytes(16));mkdir(updates_dir().'/'.$id,0700);
    $job=['id'=>$id,'version'=>$version,'previous_version'=>FEUILLET_VERSION,'release'=>$fresh,'phase'=>'download','message'=>'Téléchargement de la release','files_changed'=>false,'database_changed'=>false,'tables'=>UPDATE_TABLES,'created_at'=>time()];updates_job_save($job);$s['last_job']=$id;updates_save($s);return $job;
}
function updates_extract(array $job): void {
    $folder=updates_dir().'/'.$job['id'];$zip=new ZipArchive();if($zip->open($folder.'/release.zip')!==true)fail('Archive de release illisible.');
    $total=0;$seen=[];$stage=$folder.'/stage';mkdir($stage,0700);
    try{
        if($zip->numFiles>10000)fail('Archive trop complexe.');
        for($i=0;$i<$zip->numFiles;$i++){$s=$zip->statIndex($i);$name=$s['name'];if(!str_starts_with($name,'feuillet/'))fail('Racine de distribution invalide.');$relative=substr($name,9);
            if(isset($seen[$relative]))fail('Entrées de distribution en double.');$seen[$relative]=true;
            if($relative==='storage/.htaccess')continue;
            if(!fu_path($relative)||str_ends_with($relative,'/'))fail('Chemin d’archive dangereux.');
            $zip->getExternalAttributesIndex($i,$ops,$attr);$mode=($attr>>16)&0170000;if(in_array($mode,[0120000,0060000,0020000],true))fail('Lien ou périphérique interdit.');
            if(!empty($s['encryption_method']))fail('Archive chiffrée interdite.');$total+=$s['size'];if($total>209715200||$s['size']>67108864)fail('Distribution décompressée trop volumineuse.');
            $target=fu_target($stage,$relative);if(!is_dir(dirname($target)))mkdir(dirname($target),0700,true);$in=$zip->getStream($name);$out=fopen($target,'xb');if(!$in||!$out)fail('Extraction impossible.',500);
            try{$bytes=stream_copy_to_stream($in,$out,$s['size']+1);}finally{fclose($in);fclose($out);}if($bytes!==$s['size'])fail('Fichier de distribution incomplet.');chmod($target,0600);
        }
    }finally{$zip->close();}
    $m=updates_manifest($stage,$job['version']);$expected=array_keys($m['files']);$expected[]='update-manifest.json';$expected[]='storage/.htaccess';sort($expected);$actual=array_keys($seen);sort($actual);if($expected!==$actual)fail('L’archive contient des fichiers non déclarés.');
    $versionFile=file_get_contents($stage.'/app/bootstrap.php');if(!preg_match("/const FEUILLET_VERSION = '([^']+)';/",$versionFile,$matches)||$matches[1]!==$job['version'])fail('Version de logiciel incohérente.');
}
function updates_apply(array &$job): void {
    $folder=updates_dir().'/'.$job['id'];$stage=$folder.'/stage';$next=updates_manifest($stage,$job['version']);$old=updates_manifest(FEUILLET_ROOT);
    $paths=array_values(array_unique([...array_keys($old['files']),...array_keys($next['files']),'update-manifest.json']));
    $size=0;foreach($paths as $relative){$target=fu_target(FEUILLET_ROOT,$relative);if(is_file($target)){$size+=filesize($target);if(!is_writable($target))fail('Fichier non modifiable : '.$relative);}elseif(!is_writable(dirname($target))&&is_dir(dirname($target)))fail('Dossier non modifiable : '.dirname($relative));}
    $free=disk_free_space(FEUILLET_ROOT);if($free!==false&&$free<$size*3+filesize($folder.'/release.zip')*3+52428800)fail('Espace disque insuffisant pour la mise à jour et sa sauvegarde.');
    $journal=$job;$journal['tables']=$old['database_tables'];$journal['new_tables']=$next['database_tables'];$journal['phase']='backing_up';fu_copy(FEUILLET_ROOT.'/app/update-safety.php',updates_dir().'/recovery-engine.php',0600);fu_write(storage().'/update-journal.json',$journal);
    $hashes=[];$zip=new ZipArchive();if($zip->open($folder.'/code.zip',ZipArchive::CREATE|ZipArchive::EXCL)!==true)fail('Sauvegarde du logiciel impossible.');
    foreach($paths as $relative){$target=fu_target(FEUILLET_ROOT,$relative);if(is_file($target)){$hashes[$relative]=hash_file('sha256',$target);if(!$zip->addFile($target,$relative))fail('Sauvegarde du logiciel incomplète.');}}
    if(!$zip->close())fail('Sauvegarde du logiciel impossible.');chmod($folder.'/code.zip',0600);fu_write($folder.'/backup.json',['paths'=>$paths,'hashes'=>$hashes,'version'=>FEUILLET_VERSION]);
    $configPath=getenv('FEUILLET_CONFIG')?:FEUILLET_ROOT.'/config.php';fu_copy($configPath,$folder.'/config.php',0600);
    fu_database(db(),$folder,$journal['tables']);
    $snapshot=$folder.'/'.((cfg()['driver']??'')==='sqlite'?'database.sqlite':'database.jsonl');$journal['database_sha256']=hash_file('sha256',$snapshot);
    $journal['phase']='applying';$journal['files_changed']=true;fu_write(storage().'/update-journal.json',$journal);
    foreach($next['files'] as $relative=>$hash)fu_copy($stage.'/'.$relative,fu_target(FEUILLET_ROOT,$relative));
    fu_copy($stage.'/update-manifest.json',FEUILLET_ROOT.'/update-manifest.json');
    foreach(array_diff(array_keys($old['files']),array_keys($next['files'])) as $relative){$target=fu_target(FEUILLET_ROOT,$relative);if(is_file($target)&&!unlink($target))fail('Ancien fichier non supprimable.');}
    $job=$journal;$job['phase']='validating';$job['deadline']=time()+120;$job['message']='Vérification de la nouvelle version';fu_write(storage().'/update-journal.json',$job);updates_job_save($job);
}
function updates_step(string $id): array {
    $job=updates_job($id);if(!in_array($job['phase'],['download','extract','apply'],true))fail('Étape de mise à jour indisponible.',409);
    if((updates_state()['last_job']??null)!==$id)fail('Mise à jour remplacée par une autre.',409);
    $folder=updates_dir().'/'.$id;
    $deployment=$job['phase']==='apply'?updates_lock():null;
    try{
        if($job['phase']==='download'){
            $r=$job['release'];updates_http('https://api.github.com/repos/'.UPDATE_REPOSITORY.'/releases/assets/'.$r['asset_id'],'application/octet-stream',104857600,$folder.'/release.zip');
            $sum=updates_http('https://api.github.com/repos/'.UPDATE_REPOSITORY.'/releases/assets/'.$r['checksum_id'],'application/octet-stream',4096);
            if(!preg_match('/^([a-f0-9]{64})\s+Feuillet-'.preg_quote($job['version'],'/').'\.zip\s*$/D',trim($sum),$m)||$m[1]!==$r['sha256']||hash_file('sha256',$folder.'/release.zip')!==$r['sha256']||filesize($folder.'/release.zip')!==$r['size'])fail('L’empreinte de la release ne correspond pas. Rien n’a été installé.');
            $job['phase']='extract';$job['message']='Vérification des fichiers';
        }elseif($job['phase']==='extract'){updates_extract($job);$job['phase']='apply';$job['message']='Sauvegarde puis installation';}
        else updates_apply($job);
        updates_job_save($job);return ['job'=>['id'=>$job['id'],'version'=>$job['version'],'phase'=>$job['phase'],'message'=>$job['message']]];
    }catch(Throwable $e){
        if(is_file(storage().'/update-journal.json')){unset($GLOBALS['feuillet_pdo']);$journal=json_decode((string)file_get_contents(storage().'/update-journal.json'),true);fu_recover(FEUILLET_ROOT,storage(),$journal,cfg());}
        else{$job['phase']='failed';$job['message']=$e instanceof AppError?$e->getMessage():'La préparation a échoué. La version installée est conservée.';updates_job_save($job);}
        throw $e;
    }finally{if($deployment){flock($deployment,LOCK_UN);fclose($deployment);}}
}
function updates_download_backup(string $id): never {
    $job=updates_job($id);$folder=updates_dir().'/'.$id;if(!is_file($folder.'/backup.json'))fail('Sauvegarde de mise à jour indisponible.',404);
    $path=$folder.'/download.zip';$zip=new ZipArchive();if($zip->open($path,ZipArchive::CREATE|ZipArchive::OVERWRITE)!==true)fail('Téléchargement de sauvegarde impossible.',500);
    foreach(['code.zip','backup.json','config.php','database.sqlite','database.jsonl','job.json'] as $name)if(is_file($folder.'/'.$name))$zip->addFile($folder.'/'.$name,$name);
    $zip->addFromString('LISEZ-MOI.txt',"Sauvegarde privée avant mise à jour Feuillet. Contient la configuration et les identifiants SQL : conserver hors du web. Les médias restent dans storage/files et ne sont pas recopiés. Voir docs/MISES-A-JOUR.md pour la restauration FTP.\n");if(!$zip->close())fail('Sauvegarde indisponible.',500);chmod($path,0600);
    header('Content-Type: application/zip');header('Content-Disposition: attachment; filename="Feuillet-avant-'.$job['version'].'.zip"');header('Content-Length: '.filesize($path));readfile($path);@unlink($path);exit;
}
function updates_dispatch(string $action,string $method): never {
    need_admin();if($method==='GET'&&$action==='update_status')json_out(updates_status());
    if($method==='GET'&&$action==='update_backup'){updates_download_backup(str_limit($_GET['id']??'',32));}
    if($method!=='POST')fail('Méthode non autorisée.',405);csrf();$in=json_in();session_write_close();$readLock=$GLOBALS['feuillet_deployment_lock']??null;if(is_resource($readLock)){flock($readLock,LOCK_UN);fclose($readLock);unset($GLOBALS['feuillet_deployment_lock']);}$lock=updates_control_lock();
    try{
        if($action==='update_check')$result=updates_check(!empty($in['force']));
        elseif($action==='update_preferences')$result=updates_preferences($in);
        elseif($action==='update_start')$result=['job'=>updates_start(str_limit($in['version']??'',30))];
        elseif($action==='update_step')$result=updates_step(str_limit($in['id']??'',32));
        else fail('Action de mise à jour inconnue.',404);
    }finally{flock($lock,LOCK_UN);fclose($lock);}
    json_out($result);
}
