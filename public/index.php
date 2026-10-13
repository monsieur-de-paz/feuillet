<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';
if(!installed()){header('Location: setup.php');exit;}
headers_secure();require_once __DIR__.'/../app/render.php';
$print=!empty($_GET['print']);$read=!empty($_GET['read'])||$print;$forcePublic=$read&&!($print&&admin());$selected=null;$error=null;
if(!empty($_GET['page'])){try{$selected=get_page(str_limit($_GET['page'],190),$forcePublic);}catch(AppError $e){$error=$e->getMessage();if($read)http_response_code($e->status);}}
?>
<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title><?=h($selected?$selected['title'].' — '.notebook_settings()['title']:notebook_settings()['title'])?></title><link rel="icon" href="favicon.svg" type="image/svg+xml"><?php if($read):?><link rel="stylesheet" href="reader.css"><?php else:?><link rel="stylesheet" href="assets/app.css"><noscript><link rel="stylesheet" href="reader.css"></noscript><?php endif;?></head><body<?=($read&&$selected)?' style="'.h(appearance_css(page_appearance($selected))).'"':''?>>
<?php if($read):?><header class="reader-header"><?php if($selected):?><?=render_reader_breadcrumbs($selected)?><?php else:?><a href="index.php?read=1">▤ <?=h(notebook_settings()['title'])?></a><?php endif;?><span>Ressource pédagogique</span></header><?php endif;?>
<div id="root">
<?php if($selected):?>
<?php if($selected['cover_id']):?><div class="page-cover"><img style="object-position:<?=h(($selected['cover_position']['x']??50).'% '.($selected['cover_position']['y']??50).'%')?>" src="media.php?id=<?=rawurlencode($selected['cover_id'])?>" alt=""></div><?php endif;?>
<main class="reader-page" style="<?=h((page_appearance($selected)['width']==='wide'?'max-width:1200px;':'').(page_appearance($selected)['focus']?'min-height:100vh;':''))?>"><div class="page-emoji"><?=render_page_icon($selected)?></div><?=render_credit($selected['cover_attribution']??null)?><?=render_credit($selected['icon_attribution']??null)?><h1><?=h($selected['title'])?></h1><?php if(!empty($selected['description'])):?><p class="page-description"><?=h($selected['description'])?></p><?php endif;?><?=render_document($selected['content'],$selected['id'],$forcePublic||!admin())?></main>
<?php elseif($error):?><main class="reader-page"><h1>Page indisponible</h1><p><?=h($error)?></p><a href="index.php">Revenir au carnet</a></main>
<?php else:?><main class="reader-page"><div class="brand">▤ <?=h(notebook_settings()['title'])?></div><h1>Les ressources à découvrir.</h1><p>Consulte les cours et les documents publiés.</p><div class="gallery"><?php foreach(list_public_pages() as $p):?><a class="gallery-card" href="index.php?page=<?=rawurlencode($p['slug'])?>&read=1"><div><?=render_page_icon($p)?> <strong><?=h($p['title'])?></strong></div></a><?php endforeach;?></div><noscript><p>JavaScript est nécessaire pour rédiger et administrer ton carnet. Les pages publiées restent consultables ici.</p></noscript></main><?php endif;?>
</div>
<?php if(!$read):?><script type="module" src="assets/app.js"></script><?php else:?><script src="reading.js" defer></script><?php endif;?>
</body></html>
