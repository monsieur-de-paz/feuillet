<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
headers_secure();
try{
    if(!installed())fail('Introuvable.',404);
    $id=str_limit($_GET['id']??'',36);$f=query('SELECT * FROM files WHERE id=?',[$id])->fetch();
    if(!$f||(!admin()&&!file_public($id)))fail('Fichier introuvable.',404);
    $path=storage().'/files/'.$f['path'];if(!is_file($path))fail('Fichier introuvable.',404);
    $size=filesize($path);$start=0;$end=$size-1;$partial=false;
    $range=$_SERVER['HTTP_RANGE']??'';
    if($range){
        if(!preg_match('/^bytes=(\d*)-(\d*)$/',$range,$m)||($m[1]===''&&$m[2]==='')){header('Content-Range: bytes */'.$size);fail('Plage invalide.',416);}
        if($m[1]===''){$length=(int)$m[2];if($length<=0){header('Content-Range: bytes */'.$size);fail('Plage invalide.',416);}$start=max(0,$size-$length);}
        else{$start=(int)$m[1];$end=$m[2]===''?$end:min($end,(int)$m[2]);}
        if($start>$end||$start>=$size){header('Content-Range: bytes */'.$size);fail('Plage invalide.',416);}$partial=true;
    }
    $inline=in_array($f['mime'],['application/pdf','image/jpeg','image/png','image/gif','image/webp','image/avif','audio/mpeg','audio/wav','audio/ogg','audio/mp4','video/mp4','video/webm','video/quicktime'],true)&&empty($_GET['download']);
    header('Content-Type: '.$f['mime']);header('Accept-Ranges: bytes');
    header('Content-Disposition: '.($inline?'inline':'attachment').'; filename="document.'.preg_replace('/[^a-z0-9]/i','',pathinfo($f['name'],PATHINFO_EXTENSION)).'"; filename*=UTF-8\'\''.rawurlencode($f['name']));
    if($partial){http_response_code(206);header("Content-Range: bytes $start-$end/$size");}
    header('Content-Length: '.max(0,$end-$start+1));
    session_write_close();unset($GLOBALS['feuillet_pdo']);
    if(($_SERVER['REQUEST_METHOD']??'GET')==='HEAD')exit;
    $fp=fopen($path,'rb');fseek($fp,$start);$remaining=$end-$start+1;
    while($remaining>0&&!feof($fp)){ $chunk=fread($fp,min(65536,$remaining)); if($chunk===false)break;echo $chunk;$remaining-=strlen($chunk);if(connection_aborted())break; }
    fclose($fp);
}catch(AppError $e){http_response_code($e->status);header('Content-Type: text/plain; charset=utf-8');echo $e->getMessage();}
catch(Throwable $e){error_log('Feuillet média: '.$e->getMessage());http_response_code(500);header('Content-Type: text/plain; charset=utf-8');echo 'Fichier indisponible.';}
