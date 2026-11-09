<?php
declare(strict_types=1);

/** Resolve relative metadata/redirect URLs. Network validation happens on every fetch. */
function link_absolute(string $base,string $reference): string {
    $reference=trim($reference);if(!$reference||preg_match('/[\x00-\x20\x7f\\\\]/',$reference))return '';
    if(preg_match('/^[a-z][a-z0-9+.-]*:/i',$reference))return str_starts_with(strtolower($reference),'https://')?$reference:'';
    $p=parse_url($base);$origin='https://'.($p['host']??'');
    if(str_starts_with($reference,'//'))return 'https:'.$reference;
    if($reference[0]==='#')return preg_replace('/#.*$/','',$base).$reference;
    if($reference[0]==='?')return $origin.($p['path']??'/').$reference;
    $path=$reference[0]==='/'?$reference:preg_replace('~/[^/]*$~','/', $p['path']??'/').$reference;
    $parts=explode('/', $path);$out=[];foreach($parts as $part){if($part==='..')array_pop($out);elseif($part!=='.')$out[]=$part;}
    return $origin.implode('/',$out);
}
function link_fetch(string $url,int $maximum,string &$final,?callable $stopAtRedirect=null): string {
    if(!extension_loaded('curl'))fail('L’extension PHP cURL est nécessaire aux aperçus.',503);
    $deadline=microtime(true)+8;
    for($hop=0;$hop<4;$hop++){
        if($hop && $stopAtRedirect && $stopAtRedirect($url)){$final=$url;return '';}
        if(microtime(true)>=$deadline)fail('Le site met trop de temps à répondre.',502);
        [$host,$ip]=image_remote_address($url);$data='';$location='';$curl=curl_init($url);
        curl_setopt_array($curl,[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT_MS=>max(1,(int)(1000*($deadline-microtime(true)))),CURLOPT_PROXY=>'',CURLOPT_RESOLVE=>[$host.':443:'.(str_contains($ip,':')?'['.$ip.']':$ip)],CURLOPT_USERAGENT=>'Feuillet/'.FEUILLET_VERSION.' (+https://github.com/monsieur-de-paz/feuillet)',CURLOPT_HEADERFUNCTION=>function($c,$line)use(&$location){if(str_starts_with(strtolower($line),'location:'))$location=trim(substr($line,9));return strlen($line);},CURLOPT_WRITEFUNCTION=>function($c,$chunk)use(&$data,$maximum){if(strlen($data)+strlen($chunk)>$maximum)return 0;$data.=$chunk;return strlen($chunk);}]);
        $ok=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_RESPONSE_CODE);unset($curl);
        if($ok===false)fail('Impossible de récupérer cet aperçu. Le site peut bloquer les accès automatiques.',502);
        if(in_array($status,[301,302,303,307,308],true)&&$location){$url=link_absolute($url,$location);continue;}
        if($status!==200)fail('Le site ne permet pas de récupérer cet aperçu (HTTP '.$status.').',502);
        $final=$url;return $data;
    }fail('Trop de redirections pour cet aperçu.',502);
}
function link_parse(string $html,string $url): array {
    if(!class_exists('DOMDocument'))fail('L’extension PHP DOM est nécessaire aux aperçus.',503);
    $dom=new DOMDocument();$old=libxml_use_internal_errors(true);
    try{$dom->loadHTML('<?xml encoding="UTF-8">'.$html,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING);}finally{libxml_clear_errors();libxml_use_internal_errors($old);}
    $meta=[];foreach($dom->getElementsByTagName('meta') as $element){$key=strtolower($element->getAttribute('property')?:$element->getAttribute('name'));if(!isset($meta[$key]))$meta[$key]=trim($element->getAttribute('content'));}
    $text=fn($s,$max)=>str_limit(trim(preg_replace('/\s+/u',' ',strip_tags($s))??''),$max);
    $icon='';foreach($dom->getElementsByTagName('link') as $element){$rel=strtolower($element->getAttribute('rel'));if(preg_match('/(?:^|\s)(?:icon|apple-touch-icon)(?:\s|$)/',$rel)){$candidate=link_absolute($url,$element->getAttribute('href'));if($candidate&&(!$icon||!str_ends_with(strtolower(parse_url($candidate,PHP_URL_PATH)??''),'.svg'))){$icon=$candidate;if(str_contains($rel,'apple-touch-icon'))break;}}}
    return ['title'=>$text($meta['og:title']??$meta['twitter:title']??($dom->getElementsByTagName('title')->item(0)?->textContent??''),240),'description'=>$text($meta['og:description']??$meta['twitter:description']??$meta['description']??'',2000),'image'=>link_absolute($url,$meta['og:image']??$meta['twitter:image']??''),'icon'=>$icon?:link_absolute($url,'/favicon.ico')];
}
function link_preview_image(string $url,string $name): ?array {
    if(!$url)return null;$final='';$bytes=link_fetch($url,min(upload_limit(),5242880),$final);
    // ICO containers may contain a PNG or a DIB. Convert locally, never expose the original container.
    if(substr($bytes,0,4)==="\x00\x00\x01\x00" && strlen($bytes)>=22){
        $entry=unpack('Cwidth/Cheight/Ccolors/Creserved/vplanes/vbits/Vsize/Voffset',substr($bytes,6,16));
        if($entry['offset']>=22 && $entry['size']<=strlen($bytes)-$entry['offset']){
            $payload=substr($bytes,$entry['offset'],$entry['size']);
            if(str_starts_with($payload,"\x89PNG\r\n\x1a\n"))$bytes=$payload;
            elseif(function_exists('imagecreatefrombmp') && strlen($payload)>=40 && unpack('V',substr($payload,0,4))[1]===40){
                $dib=unpack('Vwidth/Vheight/vplanes/vbits',substr($payload,4,12));
                if($dib['width']>0 && $dib['width']<=256 && $dib['height']>0 && $dib['height']<=512 && in_array($dib['bits'],[24,32],true)){
                    $height=(int)($dib['height']/2);$payload=substr_replace($payload,pack('V',$height),8,4);
                    $bmp="BM".pack('VvvV',14+strlen($payload),0,0,54).$payload;
                    $stream=fopen('php://memory','r+');fwrite($stream,$bmp);rewind($stream);$image=@imagecreatefrombmp($stream);fclose($stream);
                    if($image){ob_start();imagepng($image);$bytes=ob_get_clean();imagedestroy($image);}
                }
            }
        }
    }
    $dir=storage().'/temporary';if(!is_dir($dir))mkdir($dir,0700,true);$path=tempnam($dir,'preview-');
    try{
        file_put_contents($path,$bytes);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($path);
        // Active formats such as SVG remain excluded from the media pipeline.
        $ext=match($mime){'image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp','image/avif'=>'avif',default=>''};
        if(!$ext)return null;
        return persist_file(['name'=>$name.'.'.$ext,'tmp_name'=>$path,'error'=>UPLOAD_ERR_OK],false);
    }finally{if(is_file($path))unlink($path);}
}
function link_preview(array $input): array {
    $url=str_limit($input['url']??'',6000);if(!str_starts_with($url,'https://'))fail('La récupération automatique nécessite une adresse HTTPS.');
    limit_rate('link_preview',60,600);
    $cache=storage().'/temporary/link-preview-'.hash('sha256',$url).'.json';
    if(empty($input['refresh'])&&is_file($cache)&&filemtime($cache)>time()-3600){
        $hit=json_decode(file_get_contents($cache),true);$valid=is_array($hit)&&isset($hit['metadata'],$hit['files']);
        foreach($hit['files']??[] as $file)if(!query('SELECT id FROM files WHERE id=?',[$file['id']])->fetchColumn())$valid=false;
        if($valid)return $hit;
    }
    $final='';$html=link_fetch($url,2097152,$final);$meta=link_parse($html,$final);$files=[];$warnings=[];
    foreach(['icon'=>'iconId','image'=>'posterId'] as $source=>$target){
        try{$file=link_preview_image($meta[$source],$source==='icon'?'Icône du lien':'Aperçu du lien');if(!$file&&$source==='icon')$file=link_preview_image(link_absolute($final,'/favicon.ico'),'Icône du lien');if($file){$files[]=$file;$meta[$target]=$file['id'];}elseif($meta[$source])$warnings[]='Le format de l’'.($source==='icon'?'icône':'image').' n’est pas pris en charge.';}
        catch(Throwable){$warnings[]='L’'.($source==='icon'?'icône':'image').' n’a pas pu être récupérée.';}
    }
    unset($meta['icon'],$meta['image']);$result=['metadata'=>$meta,'files'=>$files,'warnings'=>$warnings];
    if(!is_dir(dirname($cache)))mkdir(dirname($cache),0700,true);file_put_contents($cache,encoded($result),LOCK_EX);return $result;
}
