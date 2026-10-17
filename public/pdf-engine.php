<?php
declare(strict_types=1);
/** Fixed PDF.js assets with a reliable ES-module MIME type, including on shared hosts. */
require_once __DIR__.'/update-guard.php';
require_once __DIR__.'/../app/bootstrap.php';
headers_secure();
$worker=($_GET['worker']??'')==='1';$path=__DIR__.'/vendor/pdfjs/'.($worker?'pdf.worker.min.mjs':'pdf.min.mjs');
if(!is_file($path)){http_response_code(404);header('Content-Type: text/plain; charset=utf-8');echo 'Le moteur PDF est absent. Réinstalle la distribution complète.';exit;}
header('Content-Type: text/javascript; charset=utf-8');
header('Cache-Control: public, max-age='.(($_GET['v']??'')===FEUILLET_VERSION?'31536000, immutable':'3600'));
header('Content-Length: '.filesize($path));
if(($_SERVER['REQUEST_METHOD']??'GET')!=='HEAD')readfile($path);
