<?php
declare(strict_types=1);
require_once __DIR__."/customization.php";
if(is_file(__DIR__."/databases.php"))require_once __DIR__."/databases.php";

function migrate_schema(PDO $pdo): void {
    try { if($pdo->query("SELECT value FROM app_settings WHERE name='schema_version'")->fetchColumn()==='3'){if(function_exists('databases_schema'))databases_schema($pdo);return;} } catch(PDOException) {}
    $mysql=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql';$suffix=$mysql?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4':'';
    $pdo->exec("CREATE TABLE IF NOT EXISTS spaces (id VARCHAR(36) PRIMARY KEY,name VARCHAR(120) NOT NULL,icon VARCHAR(64) NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0)$suffix");
    $pdo->exec("CREATE TABLE IF NOT EXISTS app_settings (name VARCHAR(80) PRIMARY KEY,value TEXT NOT NULL)$suffix");
    foreach(['pages'=>['space_id'=>'VARCHAR(36) NULL','icon_id'=>'VARCHAR(36) NULL','appearance'=>'TEXT NULL','category_id'=>'VARCHAR(36) NULL','cover_position'=>'TEXT NULL'],'files'=>['attribution'=>'TEXT NULL']] as $table=>$columns){
        $existing=$mysql?array_column($pdo->query("SHOW COLUMNS FROM $table")->fetchAll(PDO::FETCH_ASSOC),'Field'):array_column($pdo->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC),'name');
        foreach($columns as $column=>$type)if(!in_array($column,$existing,true)){
            try{$pdo->exec("ALTER TABLE $table ADD COLUMN $column $type");}catch(PDOException $e){$again=$mysql?array_column($pdo->query("SHOW COLUMNS FROM $table")->fetchAll(PDO::FETCH_ASSOC),'Field'):array_column($pdo->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC),'name');if(!in_array($column,$again,true))throw $e;}
        }
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS categories (id VARCHAR(36) PRIMARY KEY,space_id VARCHAR(36) NULL,name VARCHAR(60) NOT NULL,legacy_kind VARCHAR(16) NULL,sort_order INTEGER NOT NULL DEFAULT 0,deleted_at VARCHAR(32) NULL)$suffix");
    $scopes=[null];foreach($pdo->query('SELECT id FROM spaces')->fetchAll(PDO::FETCH_ASSOC) as $space)$scopes[]=$space['id'];
    foreach($scopes as $space)category_seed($pdo,$space);
    foreach($pdo->query("SELECT id,kind,space_id,published FROM pages WHERE category_id IS NULL AND kind IN ('class','article')")->fetchAll(PDO::FETCH_ASSOC) as $page){
        $q=$pdo->prepare('SELECT id FROM categories WHERE '.($page['space_id']?'space_id=?':'space_id IS NULL').' AND legacy_kind=?');$q->execute($page['space_id']?[$page['space_id'],$page['kind']]:[$page['kind']]);$category=$q->fetchColumn();
        $published=$page['published']?json_decode($page['published'],true):null;if($published){$published['category_id']=$category;}
        $pdo->prepare('UPDATE pages SET category_id=?,published=? WHERE id=?')->execute([$category,$published?encoded($published):null,$page['id']]);
    }
    if(function_exists('databases_schema'))databases_schema($pdo);
    $pdo->exec($mysql?"INSERT INTO app_settings (name,value) VALUES ('schema_version','3') ON DUPLICATE KEY UPDATE value='3'":"INSERT INTO app_settings (name,value) VALUES ('schema_version','3') ON CONFLICT(name) DO UPDATE SET value='3'");
}
function appearance_defaults(): array { return ['font'=>'sans','background'=>'#FFFFFF','text'=>'#37352F','accent'=>'#38795D','width'=>'normal','focus'=>false,'mode'=>'light']; }
function css_color(mixed $value): string { return is_string($value)&&preg_match('/^#[a-fA-F0-9]{6}$/D',$value)?strtoupper($value):''; }
function validate_appearance(mixed $value,bool $partial=false): array {
    if(!is_array($value))fail('Style de page invalide.');$out=$partial?[]:appearance_defaults();
    foreach(['background','text','accent'] as $key)if(array_key_exists($key,$value)){if(!css_color($value[$key]))fail('Couleur invalide.');$out[$key]=css_color($value[$key]);}
    foreach(['font'=>['sans','serif','mono','quicksand','fraunces'],'width'=>['normal','wide'],'mode'=>['light','dark','oled']] as $key=>$allowed)if(array_key_exists($key,$value)){if(!in_array($value[$key],$allowed,true))fail('Style invalide.');$out[$key]=$value[$key];}
    if(array_key_exists('focus',$value)){if(!is_bool($value['focus']))fail('Mode de lecture invalide.');$out['focus']=$value['focus'];}
    return $out;
}
function global_appearance(): array { $json=query("SELECT value FROM app_settings WHERE name='appearance'")->fetchColumn();return array_replace(appearance_defaults(),$json?json_decode($json,true):[]); }
function page_appearance(array $page): array { return array_replace(global_appearance(),$page['appearance']??[]); }
function appearance_css(array $appearance): string {
    $a=validate_appearance($appearance);$font=match($a['font']){'serif'=>'Georgia,serif','mono'=>'monospace','quicksand'=>'Quicksand,system-ui,sans-serif','fraunces'=>'Fraunces,Georgia,serif',default=>'system-ui,sans-serif'};
    $dark=$a['mode']!=='light';$surface=$a['mode']==='oled'?'#000000':($dark?'#17191D':$a['background']);
    $variables='--surface:'.$surface.';--surface-muted:'.($dark?'#202329':'#F7F8F4').';--ink:'.$a['text'].';--muted:'.($dark?'#AFB3BD':'#818778').';--line:'.($dark?'#373A42':'#E4E6DF').';--accent:'.$a['accent'].';--green:'.$a['accent'].';color-scheme:'.($dark?'dark':'light').';';
    return $variables.'--page-background:' .$a['background'].';--page-text:'.$a['text'].';--page-accent:'.$a['accent'].';background:'.$a['background'].';color:'.$a['text'].';font-family:'.$font.';';
}
function check_space(?string $id): void { if($id&&!query('SELECT id FROM spaces WHERE id=?',[$id])->fetch())fail('Espace introuvable.'); }
function list_spaces(bool $public=false): array {
    $spaces=query('SELECT * FROM spaces ORDER BY sort_order,name')->fetchAll();foreach($spaces as &$s)$s['sort_order']=(int)$s['sort_order'];unset($s);
    if(!$public)return $spaces;$ids=[];foreach(page_rows() as $row)if(!$row['deleted_at']&&$row['visibility']==='public'&&$row['published']&&ancestors_active($row,page_rows())){$p=json_decode($row['published'],true);if(!empty($p['space_id']))$ids[]=$p['space_id'];}
    return array_values(array_filter($spaces,fn($s)=>in_array($s['id'],$ids,true)));
}
function spaces_mutate(array $in,bool $delete=false): array {
    $id=!empty($in['id'])?str_limit($in['id'],36):uuid();if(!empty($in['id']))check_space($id);
    if($delete||!empty($in['delete'])){query('UPDATE pages SET space_id=NULL WHERE space_id=?',[$id]);foreach(query('SELECT id,published FROM pages WHERE published IS NOT NULL')->fetchAll() as $r){$p=json_decode($r['published'],true);if(($p['space_id']??null)===$id){$p['space_id']=null;query('UPDATE pages SET published=? WHERE id=?',[encoded($p),$r['id']]);}}query('UPDATE categories SET space_id=NULL,legacy_kind=NULL WHERE space_id=?',[$id]);query('DELETE FROM spaces WHERE id=?',[$id]);}
    else{$name=str_limit($in['name']??'',120);if(!$name)fail('Donne un nom à cet espace.');$icon=str_limit($in['icon']??'📚',64);$order=(int)($in['sort_order']??0);if(query('SELECT id FROM spaces WHERE id=?',[$id])->fetch())query('UPDATE spaces SET name=?,icon=?,sort_order=? WHERE id=?',[$name,$icon,$order,$id]);else query('INSERT INTO spaces (id,name,icon,sort_order) VALUES (?,?,?,?)',[$id,$name,$icon,$order]);}
    if(!$delete&&empty($in['delete']))category_seed(db(),$id);
    return ['spaces'=>list_spaces(),'id'=>$id];
}
function rename_file(array $in): array {
    $id=str_limit($in['id']??'',36);$f=query('SELECT * FROM files WHERE id=?',[$id])->fetch();if(!$f)fail('Fichier introuvable.',404);
    $name=str_limit(preg_replace('/[\x00-\x1f\x7f]/u','',basename(str_replace('\\','/',(string)($in['name']??'')))),240);if(!$name||$name==='.'||$name==='..')fail('Nom de fichier invalide.');
    $ext=pathinfo($f['name'],PATHINFO_EXTENSION);$given=pathinfo($name,PATHINFO_EXTENSION);if(!$given&&$ext)$name.='.'.$ext;elseif(strtolower($given)!==strtolower($ext))fail('Conserve l’extension du fichier.');
    $rewrite=function(array $node)use(&$rewrite,$id,$name,$f):array{if(($node['attrs']['fileId']??null)===$id){if(($node['type']??'')==='fileBlock')$node['attrs']['name']=$name;foreach(['alt','title'] as $key)if(($node['attrs'][$key]??null)===$f['name'])$node['attrs'][$key]=$name;}foreach($node['content']??[] as $i=>$child)$node['content'][$i]=$rewrite($child);return $node;};
    $pdo=db();$pdo->beginTransaction();try{
        query('UPDATE files SET name=? WHERE id=?',[$name,$id]);
        foreach(page_rows() as $row){$doc=json_decode($row['content'],true);$new=$rewrite($doc);$snapshot=$row['published']?json_decode($row['published'],true):null;$newSnapshot=$snapshot;if($snapshot)$newSnapshot['content']=$rewrite($snapshot['content']);
            if(encoded($new)!==encoded($doc)||encoded($newSnapshot)!==encoded($snapshot)){
                if($newSnapshot&&($newSnapshot['version']??0)===(int)$row['version'])$newSnapshot['version']=(int)$row['version']+1;
                query('UPDATE pages SET content=?,published=?,version=version+1,updated_at=? WHERE id=?',[encoded($new),$newSnapshot?encoded($newSnapshot):null,now(),$row['id']]);
            }
        }
        foreach(query('SELECT id,snapshot FROM revisions')->fetchAll() as $r){$snapshot=json_decode($r['snapshot'],true);$snapshot['content']=$rewrite($snapshot['content']);query('UPDATE revisions SET snapshot=? WHERE id=?',[encoded($snapshot),$r['id']]);}
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return ['file'=>file_info(query('SELECT * FROM files WHERE id=?',[$id])->fetch()),'pages'=>list_pages()['pages']];
}
function commons_fetch(string $url,int $maximum=2097152): string {
    $parts=parse_url($url);if(($parts['scheme']??'')!=='https'||!in_array($parts['host']??'',['commons.wikimedia.org','upload.wikimedia.org'],true)||isset($parts['user'])||isset($parts['pass'])||isset($parts['port']))fail('Adresse de ressource refusée.');
    if(!extension_loaded('curl'))fail('L’extension PHP cURL est nécessaire à la recherche d’images.',503,'curl_missing');
    $curl=curl_init($url);$data='';curl_setopt_array($curl,[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>6,CURLOPT_TIMEOUT=>20,CURLOPT_USERAGENT=>'Feuillet/0.3 (open-source notebook; https://github.com/monsieur-de-paz/feuillet)',CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_WRITEFUNCTION=>function($c,$chunk)use(&$data,$maximum){if(strlen($data)+strlen($chunk)>$maximum)return 0;$data.=$chunk;return strlen($chunk);}]);
    $ok=curl_exec($curl);$status=curl_getinfo($curl,CURLINFO_RESPONSE_CODE);unset($curl);if($ok===false||$status!==200)fail('Wikimedia est temporairement indisponible. Tu peux toujours envoyer une image depuis ton ordinateur.',502,'image_source_unavailable');return $data;
}
function commons_api(array $parameters): array { $data=commons_fetch('https://commons.wikimedia.org/w/api.php?'.http_build_query(array_merge(['action'=>'query','format'=>'json','formatversion'=>2],$parameters)));try{$json=json_decode($data,true,80,JSON_THROW_ON_ERROR);}catch(Throwable){fail('Réponse Wikimedia invalide.',502);}if(isset($json['error']))fail('Recherche Wikimedia indisponible.',502);return $json['query']['pages']??[]; }
function commons_images(array $pages): array {
    $results=[];foreach($pages as $page){$info=$page['imageinfo'][0]??null;if(!$info)continue;$meta=$info['extmetadata']??[];$clean=fn($key)=>str_limit(html_entity_decode(strip_tags((string)($meta[$key]['value']??'')),ENT_QUOTES,'UTF-8'),2000);$url=$info['thumburl']??$info['url']??'';if(parse_url($url,PHP_URL_HOST)!=='upload.wikimedia.org')continue;$results[]=['title'=>$page['title'],'url'=>$url,'thumb'=>$url,'source_url'=>$info['descriptionurl']??'','source'=>$info['descriptionurl']??'','author'=>$clean('Artist'),'license'=>$clean('LicenseShortName'),'license_url'=>$clean('LicenseUrl')];}return $results;
}
function image_search(string $query): array { if(!$query)return [];return commons_images(commons_api(['generator'=>'search','gsrsearch'=>str_limit($query,120).' filetype:bitmap','gsrnamespace'=>6,'gsrlimit'=>18,'prop'=>'imageinfo','iiprop'=>'url|extmetadata','iiurlwidth'=>960])); }
function image_import(array $in): array {
    $title=str_limit($in['title']??'',240);if(!str_starts_with($title,'File:')||str_contains($title,'|'))fail('Sélectionne une image dans les résultats Wikimedia.');
    $images=commons_images(commons_api(['titles'=>$title,'prop'=>'imageinfo','iiprop'=>'url|extmetadata','iiurlwidth'=>1600]));if(!$images)fail('Image introuvable.',404);$image=$images[0];$bytes=commons_fetch($image['url'],min(upload_limit(),10485760));
    $dir=storage().'/temporary';if(!is_dir($dir))mkdir($dir,0700,true);$path=tempnam($dir,'image-');file_put_contents($path,$bytes);$mime=(new finfo(FILEINFO_MIME_TYPE))->file($path);$ext=match($mime){'image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp','image/avif'=>'avif',default=>''};
    try{if(!$ext)fail('Format d’image refusé.');$name=pathinfo(substr($title,5),PATHINFO_FILENAME).'.'.$ext;return persist_file(['name'=>$name,'tmp_name'=>$path,'error'=>UPLOAD_ERR_OK],false,['source_url'=>safe_url($image['source_url']),'author'=>$image['author'],'license'=>$image['license'],'license_url'=>safe_url($image['license_url'])]);}finally{if(is_file($path))unlink($path);}
}
function markdown_inline(string $text): array {
    $nodes=[];$pattern='/(!?\[[^\]]+\]\([^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|~~[^~]+~~)/u';$parts=preg_split($pattern,$text,-1,PREG_SPLIT_DELIM_CAPTURE|PREG_SPLIT_NO_EMPTY);
    foreach($parts as $part){if(preg_match('/^!?\[([^\]]+)\]\(([^)]+)\)$/u',$part,$m)){if(str_starts_with($part,'!'))$nodes[]=['type'=>'text','text'=>$m[1].' ('.$m[2].')'];else $nodes[]=['type'=>'text','text'=>$m[1],'marks'=>[['type'=>'link','attrs'=>['href'=>safe_url($m[2])]]]];}elseif(preg_match('/^(\*\*|__|~~|`|\*)(.+)\1$/us',$part,$m)){$nodes[]=['type'=>'text','text'=>$m[2],'marks'=>[['type'=>match($m[1]){'**','__'=>'bold','~~'=>'strike','`'=>'code',default=>'italic'}]]];}else $nodes[]=['type'=>'text','text'=>$part];}return $nodes;
}
function markdown_list(array $lines,int &$index,int $base): array {
    preg_match('/^(\s*)([-*+]|\d+\.)\s+(.*)$/u',$lines[$index],$first);$ordered=preg_match('/^\d+\.$/',$first[2]);$task=preg_match('/^\[([ xX])\]\s+(.*)$/u',$first[3],$taskFirst);$type=$task?'taskList':($ordered?'orderedList':'bulletList');$items=[];
    while($index<count($lines)&&preg_match('/^(\s*)([-*+]|\d+\.)\s+(.*)$/u',$lines[$index],$m)){
        $indent=strlen(str_replace("\t",'    ',$m[1]));if($indent<$base)break;
        if($indent>$base){if(!$items)break;$items[count($items)-1]['content'][]=markdown_list($lines,$index,$indent);continue;}
        $isTask=preg_match('/^\[([ xX])\]\s+(.*)$/u',$m[3],$tm);$current=$isTask?'taskList':(preg_match('/^\d+\.$/',$m[2])?'orderedList':'bulletList');if($current!==$type)break;
        $item=['type'=>$isTask?'taskItem':'listItem','content'=>[['type'=>'paragraph','content'=>markdown_inline($isTask?$tm[2]:$m[3])]]];if($isTask)$item['attrs']=['checked'=>strtolower($tm[1])==='x'];$items[]=$item;$index++;
    }$result=['type'=>$type,'content'=>$items];if($ordered)$result['attrs']=['start'=>(int)$first[2]];return $result;
}
function markdown_document(string $text): array {
    $blocks=[];$lines=explode("\n",str_replace(["\r\n","\r"],"\n",$text));$paragraph=[];$flush=function()use(&$blocks,&$paragraph){if($paragraph){$blocks[]=['type'=>'paragraph','content'=>markdown_inline(implode(' ',$paragraph))];$paragraph=[];}};
    for($i=0;$i<count($lines);$i++){$line=$lines[$i];if(preg_match('/^<!-- feuillet-document:[A-Za-z0-9+\/=]+ -->$/',$line))continue;
        if(trim($line)===''){$flush();continue;}if(str_starts_with($line,'```')){$flush();$language=str_limit(substr($line,3),60);$code=[];while(++$i<count($lines)&&!str_starts_with($lines[$i],'```'))$code[]=$lines[$i];$blocks[]=['type'=>'codeBlock','attrs'=>['language'=>$language],'content'=>[['type'=>'text','text'=>implode("\n",$code)]]];continue;}
        if(preg_match('/^(#{1,6})\s+(.+)$/u',$line,$m)){$flush();$blocks[]=['type'=>'heading','attrs'=>['level'=>min(3,strlen($m[1]))],'content'=>markdown_inline($m[2])];continue;}
        if(preg_match('/^\s*(?:---+|\*\*\*+)\s*$/',$line)){$flush();$blocks[]=['type'=>'horizontalRule'];continue;}
        if(preg_match('/^>\s?(.*)$/u',$line,$m)){$flush();$blocks[]=['type'=>'blockquote','content'=>[['type'=>'paragraph','content'=>markdown_inline($m[1])]]];continue;}
        if(preg_match('/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/u',$line,$m)){$flush();$blocks[]=markdown_list($lines,$i,strlen(str_replace("\t",'    ',$m[1])));$i--;continue;}
        if(preg_match('/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/u',trim($line),$m)){$flush();$blocks[]=['type'=>'image','attrs'=>['src'=>safe_url($m[2]),'alt'=>$m[1],'width'=>100,'align'=>'center']];continue;}
        if(str_contains($line,'|')&&isset($lines[$i+1])&&preg_match('/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/',$lines[$i+1])){$flush();$rows=[];$header=true;$headerLine=$line;$i++;
            do{$source=$header?$headerLine:($lines[$i]??'');$cells=array_map('trim',explode('|',trim(trim($source),'|')));$rows[]=['type'=>'tableRow','content'=>array_map(fn($cell)=>['type'=>$header?'tableHeader':'tableCell','content'=>[['type'=>'paragraph','content'=>markdown_inline($cell)]]],$cells)];if($header){$header=false;$i++;}else $i++;}while($i<count($lines)&&str_contains($lines[$i],'|')&&trim($lines[$i])!=='');$i--;$blocks[]=['type'=>'table','content'=>$rows];continue;}

        $paragraph[]=$line;
    }$flush();return ['type'=>'doc','content'=>$blocks?:[['type'=>'paragraph']]];
}
function markdown_node(array $node): string {
    $type=$node['type']??'';$a=$node['attrs']??[];$children=implode('',array_map('markdown_node',$node['content']??[]));
    if($type==='text'){$text=$node['text']??'';foreach($node['marks']??[] as $mark)$text=match($mark['type']){'bold'=>'**'.$text.'**','italic'=>'*'.$text.'*','strike'=>'~~'.$text.'~~','code'=>'`'.$text.'`','link'=>'['.$text.']('.safe_url($mark['attrs']['href']??'').')',default=>$text};return $text;}
    if(in_array($type,['bulletList','orderedList','taskList'],true)){$lines=[];$number=(int)($a['start']??1);foreach($node['content']??[] as $item){$parts=$item['content']??[];$first=array_shift($parts);$body=trim(markdown_node($first??['type'=>'paragraph']));$prefix=$type==='orderedList'?($number++).'. ':'- ';if($type==='taskList')$prefix.=!empty($item['attrs']['checked'])?'[x] ':'[ ] ';$line=$prefix.$body;foreach($parts as $part)$line.="\n".preg_replace('/^/m','  ',rtrim(markdown_node($part)));$lines[]=$line;}return implode("\n",$lines)."\n\n";}
    if($type==='table'){$rows=[];foreach($node['content']??[] as $i=>$row){$cells=array_map(fn($cell)=>str_replace(['|',"\n"],['\\|',' '],trim(markdown_node($cell))),$row['content']??[]);$rows[]='| '.implode(' | ',$cells).' |';if($i===0)$rows[]='| '.implode(' | ',array_fill(0,count($cells),'---')).' |';}return implode("\n",$rows)."\n\n";}
    if($type==='databaseView'){
        try{$bundle=database_bundle(str_limit($a['dbId']??'',36),!admin());}catch(Throwable){return '> Base indisponible' ."\n\n";}
        $escape=fn($text)=>str_replace(['|',"\r","\n"],['\\|',' ',' '],(string)$text);$properties=$bundle['properties'];$files=array_column($bundle['files'],null,'id');$out='## '.$escape($bundle['database']['name'])."\n\n";
        if(!$properties)return $out;
        $out.='| '.implode(' | ',array_map(fn($p)=>$escape($p['name']),$properties))." |\n| ".implode(' | ',array_fill(0,count($properties),'---'))." |\n";
        foreach($bundle['rows'] as $row){$cells=[];foreach($properties as $property){$value=$row['derived'][$property['id']]??$row['values'][$property['id']]??null;
            if($property['type']==='files')$value=array_map(fn($id)=>isset($files[$id])?$files[$id]['name']:$id,is_array($value)?$value:[]);
            elseif($property['type']==='relation')$value=array_map(function($id){$r=query('SELECT db_id,values_json FROM collection_rows WHERE id=?',[$id])->fetch();if(!$r)return 'Fiche';$vals=json_decode($r['values_json'],true);foreach(database_properties($r['db_id']) as $p)if($p['type']==='title')return (string)($vals[$p['id']]??'Sans titre');return 'Fiche';},is_array($value)?$value:[]);
            $cells[]=$escape(isset($row['errors'][$property['id']])?'Calcul indisponible':(is_array($value)?implode(', ',$value):(is_bool($value)?($value?'Oui':'Non'):($value??'—'))));
        }$out.='| '.implode(' | ',$cells)." |\n";}return $out."\n";
    }
    if($type==='formView'){$id=str_limit($a['formId']??'',36);$form=query('SELECT name,token FROM collection_forms WHERE id=?',[$id])->fetch();return $form?'['.$form['name'].'](index.php?form='.$form['token'].")\n\n":'> Formulaire indisponible' ."\n\n";}
    if($type==='gallery'){$links=[];$all=page_rows();foreach(!empty($a['manual'])?($a['pageIds']??[]):array_keys($all) as $id){$row=$all[$id]??null;if(!$row||$row['deleted_at']||!ancestors_active($row,$all))continue;if(empty($a['manual'])&&!empty($a['parentId'])&&$row['parent_id']!==$a['parentId'])continue;if(empty($a['manual'])&&!empty($a['kind'])&&$row['kind']!==$a['kind'])continue;$links[]='- ['.$row['title'].'](index.php?page='.$row['slug'].')';}return '## '.($a['title']??'Galerie')."\n\n".implode("\n",$links)."\n\n";}
    if($type==='quiz'){$text='## '.($a['title']??'Quiz')."\n\n";foreach($a['questions']??[] as $q){$text.='### '.($q['prompt']??'Question')."\n\n";foreach($q['options']??[] as $option)$text.='- [ ] '.$option."\n";$text.="\n";}return $text;}
    return match($type){'paragraph'=>$children."\n\n",'heading'=>str_repeat('#',max(1,min(6,(int)($a['level']??2)))).' '.$children."\n\n",'hardBreak'=>"\n",'horizontalRule'=>"---\n\n",'codeBlock'=>"```".($a['language']??'')."\n".implode('',array_column($node['content']??[],'text'))."\n```\n\n",'blockquote'=>'> '.str_replace("\n","\n> ",trim($children))."\n\n",'fileBlock'=>'['.($a['name']??'Fichier').'](media.php?id='.($a['fileId']??'').")\n\n",'image'=>'!['.($a['alt']??'Image').']('.(!empty($a['fileId'])?'media.php?id='.$a['fileId']:safe_url($a['src']??'')).")\n\n".markdown_credit(!empty($a['fileId'])?file_attribution($a['fileId']):null),'buttonLink','bookmark'=>'['.($a['label']??$a['title']??'Lien').']('.safe_url($a['href']??'').")\n\n",'pageLink'=>'['.($a['label']??'Page').'](index.php?page='.($a['pageId']??'').")\n\n",'details'=>'### '.($a['summary']??'Détails')."\n\n".$children,'callout'=>'> '.($a['icon']??'💡').' '.str_replace("\n","\n> ",trim($children))."\n\n",default=>$children};
}
function export_markdown(array $page): never {
    $metadata=base64_encode(encoded(['title'=>$page['title'],'content'=>$page['content']]));$body='# '.$page['title']."\n\n".markdown_credit($page['cover_attribution']??null).markdown_credit($page['icon_attribution']??null).markdown_node($page['content'])."\n<!-- feuillet-document:$metadata -->\n";
    header('Content-Type: text/markdown; charset=utf-8');header('Content-Disposition: attachment; filename="page.md"; filename*=UTF-8\'\''.rawurlencode($page['title'].'.md'));echo $body;exit;
}
function import_markdown(): array {
    $f=$_FILES['file']??null;if(!$f||($f['error']??1)!==UPLOAD_ERR_OK)fail('Fichier Markdown manquant.',413);if(strtolower(pathinfo($f['name'],PATHINFO_EXTENSION))!=='md'||filesize($f['tmp_name'])>2097152)fail('Choisis un fichier .md de moins de 2 Mo.');$text=file_get_contents($f['tmp_name']);if(!mb_check_encoding($text,'UTF-8'))fail('Le fichier Markdown doit être en UTF-8.');
    $title=pathinfo($f['name'],PATHINFO_FILENAME);if(preg_match('/^#\s+(.+)$/m',$text,$m))$title=$m[1];$doc=markdown_document($text);
    if(($doc['content'][0]['type']??'')==='heading'&&($doc['content'][0]['attrs']['level']??0)===1){$heading=implode('',array_column($doc['content'][0]['content']??[],'text'));if($heading===$title){array_shift($doc['content']);if(!$doc['content'])$doc['content']=[['type'=>'paragraph']];}}
    if(preg_match('/<!-- feuillet-document:([A-Za-z0-9+\/=]+) -->/',$text,$m))try{$data=json_decode(base64_decode($m[1],true)?:'',true,80,JSON_THROW_ON_ERROR);$doc=normalize_doc($data['content']);$title=str_limit($data['title']??$title);}catch(Throwable){}
    return save_page(['title'=>$title,'content'=>$doc,'space_id'=>$_POST['space_id']??null,'parent_id'=>$_POST['parent_id']??null]);
}

function file_attribution(?string $id): ?array { if(!$id)return null;$json=query('SELECT attribution FROM files WHERE id=?',[$id])->fetchColumn();return $json?json_decode($json,true):null; }
function page_credits(array $page): array { $page['cover_attribution']=file_attribution($page['cover_id']??null);$page['icon_attribution']=file_attribution($page['icon_id']??null);return $page; }
function render_credit(?array $credit): string { if(!$credit)return '';return '<small class="image-attribution">'.h($credit['author']??'').' · '.h($credit['license']??'').(safe_url($credit['source_url']??'')?' · <a href="'.h(safe_url($credit['source_url'])).'" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>':'').'</small>'; }

function markdown_credit(?array $credit): string { if(!$credit)return '';return 'Crédit : '.($credit['author']??'').' · '.($credit['license']??'').' · '.safe_url($credit['source_url']??'')."\n\n"; }
