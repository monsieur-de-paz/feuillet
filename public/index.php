<?php
declare(strict_types=1);
require_once __DIR__.'/update-guard.php';
require_once __DIR__.'/../app/bootstrap.php';
if(!installed()){header('Location: setup.php');exit;}
headers_secure();require_once __DIR__.'/../app/reader.php';
if(PHP_SAPI==='cli-server'){
    $path=substr($_SERVER['PATH_INFO']??'',1);
    if(share_path_valid($path)&&parse_url($_SERVER['REQUEST_URI']??'',PHP_URL_PATH)===cookie_path().$path){
        $_GET=['share'=>$path];
    }
}
$shared=array_key_exists('share', $_GET);
$editShare=$shared&&!empty($_GET['edit']);
$validShare=$shared&&share_path_valid($_GET['share']);
if($shared){
    unset($_GET['page'],$_GET['root'],$_GET['print'],$_GET['form']);
    if(!$editShare)$_GET['read']='1';
    else unset($_GET['read']);
}
$formRequest=!empty($_GET['form']);$projectionRequest=!empty($_GET['project']);
$print=!empty($_GET['print']);$read=!empty($_GET['read'])||$print||(!admin()&&empty($_GET['edit'])&&empty($_GET['form'])&&empty($_GET['project']));$forcePublic=$read&&!($print&&admin());$selected=null;$error=null;
if($read){$GLOBALS['feuillet_read_admin']=admin();session_write_close();$GLOBALS['feuillet_readonly']=true;}
try{
    if($shared&&(!$editShare||admin()))resolve_share_request();
    if($editShare&&admin())redirect_shared_editor();
    if($forcePublic)reader_scope_request();
    if(!empty($_GET['page']))$selected=get_page(str_limit($_GET['page'],190),$forcePublic);
    elseif($forcePublic)$selected=public_home_page();
}catch(AppError $e){
    if($e->status===404&&$shared&&admin()&&!$editShare&&!empty($_GET['page'])){
        try{redirect_shared_editor();}catch(AppError){}
    }
    if($editShare&&admin()){header('Location: index.php?edit=1');exit;}
    $error=$e->getMessage();if($read)http_response_code($e->status);
}
?>
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title><?=h($selected?$selected['title'].' — '.notebook_settings()['title']:notebook_settings()['title'])?></title><link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#303030"><meta name="apple-mobile-web-app-capable" content="yes"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="stylesheet" href="pwa.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="icon" href="favicon.svg" type="image/svg+xml"><?php if($read):?><link rel="stylesheet" href="reader.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="gallery.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="theme-toggle.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="interface.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="emoji-font.css?v=<?=h(FEUILLET_VERSION)?>"><?php else:?><link rel="stylesheet" href="assets/app.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="emoji-font.css?v=<?=h(FEUILLET_VERSION)?>"><noscript><link rel="stylesheet" href="reader.css?v=<?=h(FEUILLET_VERSION)?>"></noscript><?php endif;?><link rel="stylesheet" href="file-preview.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="atelier.css?v=<?=h(FEUILLET_VERSION)?>-<?=filemtime(__DIR__.'/atelier.css')?>"><link rel="stylesheet" href="forms.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="rivage.css?v=<?=h(FEUILLET_VERSION)?>-<?=filemtime(__DIR__.'/rivage.css')?>"></head><body<?php if($formRequest||$projectionRequest):?> data-form-screen="1"<?php endif;?> data-base-mode="<?=h(($selected?page_appearance($selected):global_appearance())['mode'])?>"<?=($read||$formRequest||$projectionRequest)?' style="'.h(appearance_css($selected?page_appearance($selected):global_appearance())).'"':''?>>
<?php if($read):?><header class="reader-header"><?=render_reader_header_contents($selected)?></header><?php endif;?>
<div id="root"<?php if($read&&!$print&&(!$shared||$validShare)):?>
 data-reader-page="<?=h($shared?'':str_limit($_GET['page']??'',190))?>"
 data-reader-root="<?=h(reader_is_home()?'':(reader_root_id()??''))?>"
 data-reader-token="<?=h(reader_token($selected))?>"<?php if($validShare):?>
 data-reader-share="<?=h($_GET['share'])?>"<?php endif;?><?php endif;?>>
<?php if(($formRequest||$projectionRequest)&&!$read):?>
<header class="reader-header"><?=render_reader_header_contents(null)?></header>
<main class="form-page form-skeleton" aria-busy="true" aria-label="Chargement du formulaire">
<span class="sr-only" role="status">Chargement…</span>
<div class="form-heading" aria-hidden="true"><i class="skeleton-piece skeleton-icon"></i><i class="skeleton-piece skeleton-title"></i><i class="skeleton-piece skeleton-subtitle"></i></div>
<div class="form-sheet" aria-hidden="true"><?php for($i=0;$i<3;$i++):?><div class="skeleton-field"><i class="skeleton-piece skeleton-label"></i><i class="skeleton-piece skeleton-input"></i></div><?php endfor;?><i class="skeleton-piece skeleton-button"></i></div>
</main><noscript><p class="form-noscript">Active JavaScript pour ouvrir ce formulaire et envoyer ta réponse.</p></noscript>
<?php elseif($selected):?>
<?=render_reader_page($selected,$forcePublic||!admin())?>
<?php elseif($error):?><?=render_reader_empty(true)?>
<?php else:?><?=render_reader_empty()?><?php endif;?>
</div>
<?php if($read):?><?=render_powered_by()?><?php endif;?>
<?php if(($formRequest||$projectionRequest)&&!$read):?><script src="theme-colors.js?v=<?=h(FEUILLET_VERSION)?>"></script><script src="theme.js?v=<?=h(FEUILLET_VERSION)?>"></script><?php endif;?>
<?php if(!$read):?><script type="module" src="assets/app.js?v=<?=h(FEUILLET_VERSION)?>"></script><?php else:?><script src="theme-colors.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="theme.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="reading.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="atelier.js?v=<?=h(FEUILLET_VERSION)?>-<?=filemtime(__DIR__.'/atelier.js')?>" defer></script><?php endif;?>
<script src="pwa.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="embed-channel.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="video-lazy.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="file-preview.js?v=<?=h(FEUILLET_VERSION)?>" defer></script></body></html>
