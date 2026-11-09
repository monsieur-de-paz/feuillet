<?php
require __DIR__.'/../app/bootstrap.php';
require __DIR__.'/../app/link-preview.php';
function check($ok,$label){if(!$ok)throw new RuntimeException($label);echo "PASS $label\n";}
$url='https://example.org/news/story';
$meta=link_parse('<html><head><title>Fallback</title><meta property="og:title" content="Titre &amp; café"><meta name="twitter:title" content="Twitter"><meta name="description" content="  Un résumé  "><meta property="og:image" content="../image.jpg"><link rel="icon" href="/favicon.png"></head></html>',$url);
check($meta['title']==='Titre & café','Open Graph priority and Unicode/entities');
check($meta['description']==='Un résumé','description fallback');
check($meta['image']==='https://example.org/image.jpg','relative preview URL');
check($meta['icon']==='https://example.org/favicon.png','favicon resolution');
check(link_parse('<title>Titre seul</title>',$url)['title']==='Titre seul','HTML title fallback');
check(link_absolute($url,'//cdn.example.org/a.png')==='https://cdn.example.org/a.png','protocol relative');
foreach(['javascript:alert(1)','data:image/png;base64,abc','http://example.org/image','file:///tmp/test',"/path\nheader"] as $bad)check(link_absolute($url,$bad)==='','reject unsafe metadata URL');
foreach(['https://127.0.0.1','https://[::1]','https://a:b@example.org','https://example.org:443','http://example.org',"https://example.org/a\npath","https://example.org/a\\b"] as $bad){try{image_remote_address($bad);throw new RuntimeException('accepted unsafe target');}catch(AppError){echo "PASS SSRF URL rejected\n";}}
check(link_parse('<meta property="og:title" content="&lt;script&gt;bad&lt;/script&gt; Safe">',$url)['title']==='bad Safe','metadata stripped to text');

foreach(['100.64.0.1','224.0.0.1','198.18.0.1','192.0.0.1','2001:db8::1','2002:7f00:1::','::ffff:127.0.0.1'] as $ip)check(!image_public_ip($ip),'non-public DNS result rejected '.$ip);
check(image_public_ip('8.8.8.8')&&image_public_ip('2606:4700:4700::1111'),'public IPv4 and IPv6 allowed');
