<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
if(!installed()){header('Location: setup.php');exit;}
headers_secure();require_once __DIR__.'/../app/reader.php';
$print=!empty($_GET['print']);$read=!empty($_GET['read'])||$print;$forcePublic=$read&&!($print&&admin());$selected=null;$error=null;
if(!empty($_GET['page'])){try{$selected=get_page(str_limit($_GET['page'],190),$forcePublic);}catch(AppError $e){$error=$e->getMessage();if($read)http_response_code($e->status);}}
if($read&&!$selected&&!$error&&empty($_GET['page'])){$home=homepage_id();if($home){try{$selected=get_page($home,true);}catch(AppError){}}}
?>
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title><?=h($selected?$selected['title'].' — '.notebook_settings()['title']:notebook_settings()['title'])?></title><link rel="icon" href="favicon.svg" type="image/svg+xml"><?php if($read):?><link rel="stylesheet" href="reader.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="gallery.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="theme-toggle.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="interface.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="emoji-font.css?v=<?=h(FEUILLET_VERSION)?>"><?php else:?><link rel="stylesheet" href="assets/app.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="emoji-font.css?v=<?=h(FEUILLET_VERSION)?>"><noscript><link rel="stylesheet" href="reader.css?v=<?=h(FEUILLET_VERSION)?>"></noscript><?php endif;?></head><body data-base-mode="<?=h(($selected?page_appearance($selected):global_appearance())['mode'])?>"<?=$read?' style="'.h(appearance_css($selected?page_appearance($selected):global_appearance())).'"':''?>>
<?php if($read):?><header class="reader-header"><?php if($selected):?><?=render_reader_breadcrumbs($selected)?><?php else:?><a class="reader-brand" href="index.php?read=1"><?=render_reader_brand()?></a><?php endif;?><?=render_reader_theme_toggle()?></header><?php endif;?>
<div id="root"<?=$read&&!$print?' data-reader-page="'.h(str_limit($_GET['page']??'',190)).'" data-reader-token="'.h(reader_token($selected)).'"':''?>>
<?php if($selected):?>
<?=render_reader_page($selected,$forcePublic||!admin())?>
<?php elseif($error):?><main class="reader-page"><h1>Page indisponible</h1><p><?=h($error)?></p><a href="index.php">Revenir au carnet</a></main>
<?php else:?><main class="reader-page"><h1><?=h(notebook_settings()['title'])?></h1><p><?=h(notebook_settings()['subtitle'])?></p><p>La page d’accueil n’est pas encore publiée.</p><?php if(admin()):?><a href="index.php">Ouvrir le carnet pour préparer l’accueil</a><?php endif;?></main><?php endif;?>
</div>
<?php if(!$read):?><script type="module" src="assets/app.js?v=<?=h(FEUILLET_VERSION)?>"></script><?php else:?><script src="theme-colors.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="theme.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="reading.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><?php endif;?>
</body></html>
