<?php
declare(strict_types=1);
/** Openverse is queried anonymously; downloads are re-resolved server-side and DNS pinned. */
function image_remote_address(string $url): array {
    $p=parse_url($url);$host=strtolower($p['host']??'');
    if(($p['scheme']??'')!=='https'||!$host||isset($p['user'])||isset($p['pass'])||isset($p['port'])||filter_var(trim($host,'[]'),FILTER_VALIDATE_IP)||!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/D',$host))fail('Adresse d’image refusée.');
    $records=dns_get_record($host,DNS_A|DNS_AAAA);$ips=[];
    foreach($records?:[] as $r){$ip=$r['ip']??$r['ipv6']??null;if(!$ip)continue;if(!filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE))fail('Adresse d’image refusée.');$ips[]=$ip;}
    if(!$ips)fail('Serveur d’image introuvable.',502);
    return [$host,$ips[0]];
}
function image_remote_fetch(string $url,int $maximum=2097152,int $timeout=15): string {
    if(!extension_loaded('curl'))fail('L’extension PHP cURL est nécessaire à la recherche d’images.',503);
    for($hop=0;$hop<4;$hop++){
        [$host,$ip]=image_remote_address($url);$data='';$location='';$c=curl_init($url);
        curl_setopt_array($c,[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>$timeout,CURLOPT_PROXY=>'',CURLOPT_RESOLVE=>[$host.':443:'.(str_contains($ip,':')?'['.$ip.']':$ip)],CURLOPT_USERAGENT=>'Feuillet/'.FEUILLET_VERSION.' (https://github.com/monsieur-de-paz/feuillet)',CURLOPT_HEADERFUNCTION=>function($c,$line)use(&$location){if(str_starts_with(strtolower($line),'location:'))$location=trim(substr($line,9));return strlen($line);},CURLOPT_WRITEFUNCTION=>function($c,$chunk)use(&$data,$maximum){if(strlen($data)+strlen($chunk)>$maximum)return 0;$data.=$chunk;return strlen($chunk);}]);
        $ok=curl_exec($c);$status=curl_getinfo($c,CURLINFO_RESPONSE_CODE);unset($c);
        if($ok===false)fail('La source d’image est temporairement indisponible.',502,'image_source_unavailable');
        if(in_array($status,[301,302,303,307,308],true)&&$location){
            if(str_starts_with($location,'/'))$location='https://'.$host.$location;
            $url=$location;continue;
        }
        if($status!==200)fail('La source d’image est temporairement indisponible.',502,'image_source_unavailable');return $data;
    }
    fail('Trop de redirections de la source d’image.',502);
}
function openverse_api(string $path): array {
    $data=image_remote_fetch('https://api.openverse.org/v1/images/'.$path,2097152,6);
    try{$json=json_decode($data,true,80,JSON_THROW_ON_ERROR);}catch(Throwable){fail('Réponse Openverse invalide.',502);}return $json;
}
function openverse_image(array $r): ?array {
    if(!preg_match('/^[a-f0-9-]{36}$/D',$r['id']??'')||!in_array($r['license']??'',['by','by-sa','cc0','pdm'],true)||!empty($r['mature']))return null;
    $url=safe_url($r['url']??'');$thumb=safe_url($r['thumbnail']??'');if(!str_starts_with($url,'https://')||!str_starts_with($thumb,'https://'))return null;
    return ['provider'=>'openverse','id'=>$r['id'],'title'=>str_limit($r['title']??'Image',240),'url'=>$url,'thumb'=>$thumb,'source_url'=>safe_url($r['foreign_landing_url']??''),'author'=>str_limit($r['creator']??'',2000),'license'=>strtoupper($r['license']).' '.str_limit($r['license_version']??'',20),'license_url'=>safe_url($r['license_url']??''),'source_name'=>'Openverse · '.str_limit($r['source']??$r['provider']??'',80)];
}
function nasa_images(array $parameters): array {
    $raw=image_remote_fetch('https://images-api.nasa.gov/search?'.http_build_query($parameters+['media_type'=>'image','page_size'=>18]),2097152,6);
    try{$json=json_decode($raw,true,80,JSON_THROW_ON_ERROR);}catch(Throwable){fail('Réponse NASA invalide.',502);}
    $results=[];foreach($json['collection']['items']??[] as $item){$data=$item['data'][0]??[];$id=$data['nasa_id']??'';$url=$item['links'][0]['href']??'';
        if(!is_string($id)||!preg_match('/^[a-zA-Z0-9_.-]{1,200}$/D',$id)||parse_url($url,PHP_URL_SCHEME)!=='https'||parse_url($url,PHP_URL_HOST)!=='images-assets.nasa.gov')continue;
        $results[]=['provider'=>'nasa','id'=>$id,'title'=>str_limit($data['title']??$id,240),'url'=>$url,'thumb'=>$url,'source_url'=>'https://images.nasa.gov/details/'.$id,'author'=>str_limit($data['photographer']??$data['secondary_creator']??('NASA / '.($data['center']??'')),2000),'license'=>'Conditions NASA','license_url'=>'https://www.nasa.gov/nasa-brand-center/images-and-media/','source_name'=>'NASA Images'];
    }return $results;
}
function image_search(string $query): array {
    if(!$query)return ['images'=>[],'results'=>[],'warnings'=>[]];
    $cache=storage().'/temporary/image-search-'.hash('sha256','v2|'.mb_strtolower($query)).'.json';
    if(is_file($cache)&&filemtime($cache)>time()-600){$hit=json_decode(file_get_contents($cache),true);if(is_array($hit))return $hit;}
    $groups=[];$warnings=[];
    try{$json=openverse_api('?'.http_build_query(['q'=>$query,'page_size'=>24,'license'=>'by,by-sa,cc0,pdm','mature'=>'false']));$groups[]=array_values(array_filter(array_map('openverse_image',$json['results']??[])));}catch(Throwable $e){$warnings[]='Openverse est momentanément indisponible.';}
    try{$commons=commons_images(commons_api(['generator'=>'search','gsrsearch'=>str_limit($query,120).' filetype:bitmap','gsrnamespace'=>6,'gsrlimit'=>24,'prop'=>'imageinfo','iiprop'=>'url|extmetadata','iiurlwidth'=>960]));$groups[]=array_map(fn($r)=>array_merge($r,['provider'=>'commons','source_name'=>'Wikimedia Commons']),$commons);}catch(Throwable $e){$warnings[]='Wikimedia Commons est momentanément indisponible.';}
    try{$groups[]=nasa_images(['q'=>$query]);}catch(Throwable $e){$warnings[]='NASA Images est momentanément indisponible.';}
    if(!$groups)fail('Les moteurs d’images sont momentanément indisponibles. Tu peux envoyer une image depuis ton appareil.',502,'image_source_unavailable');
    $images=[];$seen=[];for($i=0;$i<24;$i++)foreach($groups as $group)if(isset($group[$i])){$r=$group[$i];$key=$r['source_url']?:$r['url'];if(!isset($seen[$key])){$images[]=$r;$seen[$key]=true;}}
    $out=['images'=>$images,'results'=>$images,'warnings'=>$warnings];if(!is_dir(dirname($cache)))mkdir(dirname($cache),0700,true);file_put_contents($cache,encoded($out),LOCK_EX);return $out;
}
function image_import(array $in): array {
    if(($in['provider']??'commons')==='nasa'){
        $id=$in['id']??'';if(!is_string($id)||!preg_match('/^[a-zA-Z0-9_.-]{1,200}$/D',$id))fail('Sélectionne une image dans les résultats NASA.');
        $images=nasa_images(['nasa_id'=>$id]);if(!$images)fail('Image introuvable.',404);$image=$images[0];$bytes=image_remote_fetch($image['url'],min(upload_limit(),10485760));$title=$image['title'];
    }elseif(($in['provider']??'commons')==='openverse'){
        $id=$in['id']??'';if(!is_string($id)||!preg_match('/^[a-f0-9-]{36}$/D',$id))fail('Sélectionne une image dans les résultats.');
        $image=openverse_image(openverse_api(rawurlencode($id).'/'));if(!$image)fail('Image ou licence indisponible.',404);$bytes=image_remote_fetch($image['url'],min(upload_limit(),10485760));$title=$image['title'];
    }else{
        $title=str_limit($in['title']??'',240);if(!str_starts_with($title,'File:')||str_contains($title,'|'))fail('Sélectionne une image dans les résultats Wikimedia.');
        $images=commons_images(commons_api(['titles'=>$title,'prop'=>'imageinfo','iiprop'=>'url|extmetadata','iiurlwidth'=>1600]));if(!$images)fail('Image introuvable.',404);$image=$images[0];$image['source_name']='Wikimedia Commons';$bytes=commons_fetch($image['url'],min(upload_limit(),10485760));$title=substr($title,5);
    }
    $dir=storage().'/temporary';if(!is_dir($dir))mkdir($dir,0700,true);$path=tempnam($dir,'image-');
    try{file_put_contents($path,$bytes);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($path);$ext=match($mime){'image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp','image/avif'=>'avif',default=>''};if(!$ext)fail('Format d’image refusé.');$name=(pathinfo($title,PATHINFO_FILENAME)?:'Image').'.'.$ext;return persist_file(['name'=>$name,'tmp_name'=>$path,'error'=>UPLOAD_ERR_OK],false,['source_url'=>safe_url($image['source_url']),'author'=>$image['author'],'license'=>$image['license'],'license_url'=>safe_url($image['license_url']),'source_name'=>$image['source_name']]);}finally{if(is_file($path))unlink($path);}
}
