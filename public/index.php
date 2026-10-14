<?php
declare(strict_types=1);
require_once __DIR__.'/update-guard.php';
require_once __DIR__.'/../app/bootstrap.php';
if(!installed()){header('Location: setup.php');exit;}
headers_secure();require_once __DIR__.'/../app/reader.php';
$print=!empty($_GET['print']);$read=!empty($_GET['read'])||$print||(!admin()&&empty($_GET['edit'])&&empty($_GET['form']));$forcePublic=$read&&!($print&&admin());$selected=null;$error=null;
try{
    if($forcePublic)reader_scope_request();
    if(!empty($_GET['page']))$selected=get_page(str_limit($_GET['page'],190),$forcePublic);
}catch(AppError $e){$error=$e->getMessage();if($read)http_response_code($e->status);}
?>
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title><?=h($selected?$selected['title'].' — '.notebook_settings()['title']:notebook_settings()['title'])?></title><link rel="icon" href="favicon.svg" type="image/svg+xml"><?php if($read):?><link rel="stylesheet" href="reader.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="gallery.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="theme-toggle.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="interface.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="emoji-font.css?v=<?=h(FEUILLET_VERSION)?>"><?php else:?><link rel="stylesheet" href="assets/app.css?v=<?=h(FEUILLET_VERSION)?>"><link rel="stylesheet" href="emoji-font.css?v=<?=h(FEUILLET_VERSION)?>"><noscript><link rel="stylesheet" href="reader.css?v=<?=h(FEUILLET_VERSION)?>"></noscript><?php endif;?></head><body data-base-mode="<?=h(($selected?page_appearance($selected):global_appearance())['mode'])?>"<?=$read?' style="'.h(appearance_css($selected?page_appearance($selected):global_appearance())).'"':''?>>
<?php if($read):?><header class="reader-header"><?php if($selected):?><?=render_reader_breadcrumbs($selected)?><?php else:?><span class="reader-brand"><?=render_reader_brand()?></span><?php endif;?><div class="reader-header-actions"><a class="reader-edit-link" href="index.php?edit=1<?=!empty($_GET['page'])?'&amp;page='.rawurlencode(str_limit($_GET['page'],190)):''?>"><?=admin()?'Modifier':'Espace enseignant'?></a><?=render_reader_theme_toggle()?></div></header><?php endif;?>
<div id="root"<?=$read&&!$print?' data-reader-page="'.h(str_limit($_GET['page']??'',190)).'" data-reader-root="'.h(reader_root_id()??'').'" data-reader-token="'.h(reader_token($selected)).'"':''?>>
<?php if($selected):?>
<?=render_reader_page($selected,$forcePublic||!admin())?>
<?php elseif($error):?><?=render_reader_empty(true)?>
<?php else:?><?=render_reader_empty()?><?php endif;?>
</div>
<?php if($read):?><?=render_powered_by()?><?php endif;?>
<?php if(!$read):?><script type="module" src="assets/app.js?v=<?=h(FEUILLET_VERSION)?>"></script><?php else:?><script src="theme-colors.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="theme.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><script src="reading.js?v=<?=h(FEUILLET_VERSION)?>" defer></script><?php endif;?>
</body></html>
