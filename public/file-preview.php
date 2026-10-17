<?php
declare(strict_types=1);
require_once __DIR__.'/update-guard.php';require_once __DIR__.'/../app/bootstrap.php';headers_secure();
try{
    if(!installed())fail('Fichier introuvable.',404);
    $id=str_limit($_GET['id']??'',36);$f=query('SELECT * FROM files WHERE id=?',[$id])->fetch();
    if(!$f||(!admin()&&!file_public($id))||!is_file(storage().'/files/'.$f['path']))fail('Fichier introuvable.',404);
    if($f['mime']==='application/pdf'){header('Location: pdf-viewer.php?id='.rawurlencode($id));exit;}
    $theme=in_array($_GET['theme']??'',['light','dark','oled'],true)?$_GET['theme']:'system';
    $url='media.php?id='.rawurlencode($id);$mime=$f['mime'];$text=null;
    if(in_array($mime,['text/plain','text/csv','application/json'],true)){$text=file_get_contents(storage().'/files/'.$f['path'],false,null,0,1048576);if($text===false)fail('Aperçu indisponible.',404);}
    $h=fn($v)=>htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');session_write_close();
}catch(AppError $e){http_response_code($e->status);header('Content-Type: text/plain; charset=utf-8');echo $e->getMessage();exit;}
catch(Throwable $e){error_log('Feuillet aperçu: '.$e->getMessage());http_response_code(500);echo 'Aperçu indisponible.';exit;}
?><!doctype html><html lang="fr" data-theme="<?=$h($theme)?>"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=$h($f['name'])?></title><link rel="stylesheet" href="file-preview.css?v=<?=$h(FEUILLET_VERSION)?>"></head><body class="file-preview-document">
<?php if(in_array($mime,['image/jpeg','image/png','image/gif','image/webp','image/avif'],true)):?><img src="<?=$h($url)?>" alt="<?=$h($f['name'])?>">
<?php elseif(str_starts_with($mime,'video/')):?><video controls playsinline preload="metadata" src="<?=$h($url)?>"></video>
<?php elseif(str_starts_with($mime,'audio/')):?><div class="file-preview-audio"><span aria-hidden="true">♫</span><h1><?=$h($f['name'])?></h1><audio controls preload="metadata" src="<?=$h($url)?>"></audio></div>
<?php elseif($text!==null):?><article class="file-preview-text"><pre><?=$h($text)?></pre><?php if((int)$f['size']>1048576):?><p>Seul le premier mégaoctet est affiché. Télécharge le fichier pour le lire en entier.</p><?php endif;?></article>
<?php else:?><div class="file-preview-fallback"><span aria-hidden="true">▤</span><h1><?=$h($f['name'])?></h1><p>Le navigateur ne peut pas afficher ce format. Télécharge le fichier pour l’ouvrir avec ton application.</p><a href="<?=$h($url.'&download=1')?>">Télécharger le fichier</a></div><?php endif;?></body></html>
