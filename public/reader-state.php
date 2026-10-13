<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
headers_secure();
try{
    if(!installed())fail('Installation nécessaire.',503);
    if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET')fail('Méthode non autorisée.',405);
    require_once __DIR__.'/../app/reader.php';
    $requested=str_limit($_GET['page']??'',190);$id=$requested?:homepage_id();$page=null;$unavailable=false;
    if($id){try{$page=get_page($id,true);}catch(AppError $e){if($e->status!==404)throw $e;$unavailable=(bool)$requested;}}
    $token=reader_token($page);$result=['token'=>$token];
    if(!hash_equals($token,str_limit($_GET['token']??'',64))){
        $a=$page?page_appearance($page):global_appearance();$result+=['html'=>$page?render_reader_page($page):render_reader_empty($unavailable),'breadcrumbs'=>$page?render_reader_breadcrumbs($page):'<a class="reader-brand" href="index.php?read=1">'.render_reader_brand().'</a>','title'=>$page?$page['title'].' — '.notebook_settings()['title']:notebook_settings()['title'],'appearance'=>appearance_css($a),'mode'=>$a['mode'],'unavailable'=>$unavailable];
    }
    json_out($result);
}catch(AppError $e){json_out(['error'=>$e->getMessage()],$e->status);}
catch(Throwable $e){error_log('Feuillet lecture : '.$e->getMessage());json_out(['error'=>'Actualisation momentanément indisponible.'],500);}
