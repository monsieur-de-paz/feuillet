<?php
declare(strict_types=1);

/** Read Notion exports as data. Never execute their HTML or fetch external assets. */
final class NotionExport {
    private array $entries = [];
    private array $documents = [];
    private array $children = [];
    private array $pages = [];
    private array $assets = [];
    private array $storedPaths = [];
    private ?ZipArchive $zip = null;
    private int $nodes = 0;
    private int $htmlBytes = 0;
    private const COLORS = [
        'gray'=>'#787774','brown'=>'#936650','orange'=>'#c45500','yellow'=>'#a36b00',
        'green'=>'#307b60','blue'=>'#2b74a8','purple'=>'#8051a9','pink'=>'#ac457b','red'=>'#bd423e',
        'gray_background'=>'#e8e7e5','brown_background'=>'#f0e4dc','orange_background'=>'#fae7d4',
        'yellow_background'=>'#f8efcc','green_background'=>'#dfede6','blue_background'=>'#dcecf8',
        'purple_background'=>'#eee3f6','pink_background'=>'#f5e2ed','red_background'=>'#f8dfdd',
    ];

    public function import(string $file, string $filename, ?string $space): array {
        $this->readDocuments($file, $filename);
        if (!$this->documents) fail('Aucune page Notion au format HTML trouvée.');
        $childPaths = [];
        foreach ($this->documents as $path => $doc) {
            $folder = dirname($path);
            $parent = $folder.'.html';
            if (isset($this->documents[$parent])) $childPaths[$path] = $parent;
        }
        foreach ($this->documents as $path => $doc) {
            $xp = new DOMXPath($doc['body']->ownerDocument);
            foreach ($xp->query('.//figure//a[@href]', $doc['body']) as $link) {
                $figure = $link->parentNode;
                while ($figure instanceof DOMElement && $figure->tagName !== 'figure') $figure = $figure->parentNode;
                if (!$figure instanceof DOMElement || (!$this->has($figure, 'link-to-page') && !$this->has($figure, 'page'))) continue;
                $child = $this->relative($path, $link->getAttribute('href'));
                if (!$child || $child === $path || !isset($this->documents[$child])) continue;
                $childPaths[$child] ??= $path;
                if ($childPaths[$child] === $path) $this->children[$path][$child] = true;
            }
        }
        foreach ($childPaths as $path => $parent) $this->children[$parent][$path] = true;
        $roots = array_diff_key($this->documents, $childPaths);
        if (count($roots) !== 1) fail('Exporte une seule page Notion avec ses sous-pages, puis importe son ZIP HTML.');
        $root = array_key_first($roots);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $this->createTree($root, null, $space, 0, 0);
            if (count($this->pages) !== count($this->documents)) fail('Arborescence Notion incomplète ou circulaire.');
            foreach ($this->pages as $path => $page) {
                $document = $this->documents[$path];
                $this->nodes = 0;
                $blocks = $this->flow($document['body'], $path, 0);
                // Only synthesize a child link when the folder tree supplied it and the page did not.
                $references = [];
                $visit = function(array $node) use (&$visit,&$references) {
                    if(($node['type']??'')==='pageLink'&&!empty($node['attrs']['pageId']))$references[$node['attrs']['pageId']]=true;
                    foreach($node['content']??[] as $child)$visit($child);
                };
                foreach($blocks as $node)$visit($node);
                foreach(array_keys($this->children[$path]??[]) as $child) {
                    $target=$this->pages[$child];
                    if(!isset($references[$target['id']])&&$target['parent_id']===$page['id'])
                        $blocks[]=['type'=>'pageLink','attrs'=>['pageId'=>$target['id']]];
                }
                $cover = $this->asset($path, $document['cover']);
                if ($cover && str_starts_with($cover['mime'], 'image/')) {
                    $page['cover_id'] = $cover['id'];
                    $page['cover_position'] = ['y'=>$document['coverY']];
                }
                $this->pages[$path] = save_page(array_replace($page, ['content'=>['type'=>'doc','content'=>$blocks ?: [$this->paragraph()]]]));
            }
            $pdo->commit();
            return $this->pages[$root];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            foreach ($this->storedPaths as $path) if (is_file($path)) unlink($path);
            throw $e;
        } finally { $this->zip?->close(); }
    }

    private function readDocuments(string $file, string $filename): void {
        if (strtolower(pathinfo($filename,PATHINFO_EXTENSION)) !== 'zip') {
            if(filesize($file)>2*1024*1024)fail('Fichier HTML trop volumineux (2 Mo maximum).',413);
            $this->addDocument($filename, file_get_contents($file), true);
            return;
        }
        $zip = new ZipArchive();
        if ($zip->open($file, ZipArchive::RDONLY) !== true) fail('Archive ZIP invalide.');
        $this->zip = $zip;
        if ($zip->numFiles > 1000) fail('Le ZIP contient trop de fichiers (1 000 maximum).',413);
        $total = 0;
        for ($i=0; $i<$zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $name = $stat['name'] ?? '';
            if ($name === '' || strlen($name)>2048 || preg_match('~(?:^/|[\\\\:\\x00-\\x1f]|(?:^|/)\\.{1,2}(?:/|$))~', $name))
                fail('Le ZIP contient un chemin de fichier invalide.');
            $zip->getExternalAttributesIndex($i, $os, $attr);
            if ((($attr >> 16) & 0170000) === 0120000) fail('Le ZIP contient un lien symbolique.');
            if (str_ends_with($name,'/') || str_starts_with($name,'__MACOSX/')) continue;
            if (isset($this->entries[$name])) fail('Le ZIP contient des chemins en double.');
            $total += $stat['size'];
            if ($total > 96*1024*1024) fail('Le ZIP décompressé dépasse 96 Mo.',413);
            $this->entries[$name] = $stat['size'];
            if (strtolower(pathinfo($name,PATHINFO_EXTENSION)) !== 'html') continue;
            if ($stat['size'] > 2*1024*1024) fail('Une page de l’export dépasse 2 Mo.',413);
            $this->htmlBytes += $stat['size'];
            if ($this->htmlBytes > 12*1024*1024) fail('Les pages HTML de l’export dépassent 12 Mo au total.',413);
            $raw=$zip->getFromIndex($i,$stat['size']+1);
            if(!is_string($raw)||strlen($raw)!==$stat['size'])fail('Page HTML incomplète dans le ZIP.');
            $this->addDocument($name,$raw,false);
        }
    }
    private function addDocument(string $path, string $html, bool $required): void {
        if (trim($html)==='') {if($required)fail('Document HTML vide.');return;}
        $dom = new DOMDocument();
        $old = libxml_use_internal_errors(true);
        try { if (!$dom->loadHTML('<?xml encoding="UTF-8">'. $html, LIBXML_NONET|LIBXML_COMPACT)) fail('Document HTML invalide.'); }
        finally { libxml_clear_errors(); libxml_use_internal_errors($old); }
        $xp = new DOMXPath($dom);
        $class = "contains(concat(' ',normalize-space(@class),' '),' page-body ')";
        $body = $xp->query('//*['.$class.']')->item(0);
        if (!$body instanceof DOMElement) {
            if ($required) fail('Choisis un export HTML de Notion.');
            return;
        }
        if (count($this->documents) >= 100) fail('Import limité à 100 pages.',413);
        $title = $xp->query("//*[contains(concat(' ',normalize-space(@class),' '),' page-title ')]")->item(0)?->textContent;
        $icon = $xp->query("//header//*[contains(concat(' ',normalize-space(@class),' '),' page-header-icon ')]")->item(0);
        $emoji = $icon instanceof DOMElement ? $this->elementEmoji($icon) : '';
        $cover = $xp->query("//header//img[contains(concat(' ',normalize-space(@class),' '),' page-cover-image ')]")->item(0);
        $coverY = $cover instanceof DOMElement && preg_match('/object-position:[^;]*?([0-9]+(?:\.[0-9]+)?)%\s*(?:;|$)/i',$cover->getAttribute('style'),$position)
            ? max(0,min(100,(float)$position[1])) : 50;
        $description = $xp->query("//header//*[contains(concat(' ',normalize-space(@class),' '),' page-description ')]")->item(0)?->textContent;
        $name = preg_replace('/ [a-f0-9]{32}$/i','',pathinfo(basename($path),PATHINFO_FILENAME));
        $this->documents[$path] = [
            'body'=>$body,'title'=>str_limit($title ?: $name,255) ?: 'Page Notion',
            'icon'=>$emoji ?: '📄','description'=>str_limit($description??'',2000),
            'cover'=>$cover?->getAttribute('src')??'','coverY'=>$coverY,
        ];
    }
    private function createTree(string $path, ?string $parent, ?string $space, int $depth, int $order): void {
        if (isset($this->pages[$path])) return;
        if ($depth>24) fail('Arborescence Notion trop profonde.');
        $doc = $this->documents[$path];
        $page = save_page(['title'=>$doc['title'],'icon'=>$doc['icon'],'description'=>$doc['description'],'parent_id'=>$parent,'space_id'=>$space,'sort_order'=>$order]);
        $this->pages[$path] = $page;
        foreach (array_keys($this->children[$path]??[]) as $i=>$child) $this->createTree($child,$page['id'],$space,$depth+1,$i);
    }
    private function relative(string $from, string $href): string {
        if ($href==='' || preg_match('~^[a-z][a-z0-9+.-]*:|^[/#]~i',$href)) return '';
        $relative=rawurldecode(explode('#',explode('?',$href,2)[0],2)[0]);
        if (preg_match('~[\\\\:\\x00-\\x1f]~',$relative) || str_starts_with($relative,'/')) return '';
        $parts = dirname($from)==='.'?[]:explode('/',dirname($from));
        foreach (explode('/',$relative) as $piece) {
            if ($piece===''||$piece==='.') continue;
            if ($piece==='..') { if (!$parts) return ''; array_pop($parts); }
            else $parts[]=$piece;
        }
        return implode('/',$parts);
    }
    private function has(DOMElement $el, string $cls): bool {
        return in_array($cls,preg_split('/\\s+/',$el->getAttribute('class')),true);
    }
    private function emoji(string $value): string {
        $value=trim($value);
        return mb_strlen($value)<=12 && preg_match('/^\\p{Extended_Pictographic}/u',$value) ? $value : '';
    }
    private function elementEmoji(DOMElement $el): string {
        if ($el->hasAttribute('data-emoji')) return $this->emoji($el->getAttribute('data-emoji'));
        foreach ($el->getElementsByTagName('*') as $child) {
            if ($child->hasAttribute('data-emoji')) return $this->emoji($child->getAttribute('data-emoji'));
        }
        return $this->emoji($el->textContent);
    }
    private function bounded(int $depth): void {
        if($depth>48 || ++$this->nodes>18000)fail('Document Notion trop complexe.');
    }
    private function paragraph(array $content=[]): array {
        return $content?['type'=>'paragraph','content'=>$content]:['type'=>'paragraph'];
    }
    private function text(string $text, array $marks=[]): array {
        return ['type'=>'text','text'=>$text]+($marks?['marks'=>$marks]:[]);
    }
    private function safeWeb(string $raw): string {
        if(!str_starts_with(strtolower($raw),'https://')&&!str_starts_with(strtolower($raw),'http://'))return '';
        $url=parse_url($raw);
        return $url&&!empty($url['host'])&&!isset($url['user'])&&!isset($url['pass'])?safe_url($raw):'';
    }
    private function skip(DOMElement $element): bool {
        return in_array($element->tagName,['script','style','iframe','object','embed','svg','template','noscript','input','button'],true);
    }
    private function marks(DOMElement $node, array $marks): array {
        $tag=$node->tagName;
        $type=['strong'=>'bold','b'=>'bold','em'=>'italic','i'=>'italic','u'=>'underline','ins'=>'underline','s'=>'strike','del'=>'strike','code'=>'code','sub'=>'subscript','sup'=>'superscript'][$tag]??null;
        if($type)$marks[$type]=['type'=>$type];
        if($tag==='a'&&($href=$this->safeWeb($node->getAttribute('href'))))$marks['link']=['type'=>'link','attrs'=>['href'=>$href]];
        foreach(preg_split('/\\s+/',$node->getAttribute('class')) as $class) {
            $color=preg_replace('/^(?:highlight|block-color)-/','',$class);
            if(!isset(self::COLORS[$color]))continue;
            $kind=str_ends_with($color,'_background')?'highlight':'textStyle';
            $marks[$kind]=['type'=>$kind,'attrs'=>['color'=>self::COLORS[$color]]];
        }
        foreach(['color'=>'textStyle','background-color'=>'highlight'] as $css=>$kind)
            if(preg_match('/(?:^|;)\\s*'.$css.'\\s*:\\s*(#[0-9a-f]{6})\\b/i',$node->getAttribute('style'),$m))
                $marks[$kind]=['type'=>$kind,'attrs'=>['color'=>$m[1]]];
        return $marks;
    }
    private function inline(DOMNode $node, int $depth, array $marks=[]): array {
        $this->bounded($depth);
        if($node instanceof DOMText)return $node->data!==''?[$this->text($node->data,array_values($marks))]:[];
        if(!$node instanceof DOMElement || $this->skip($node))return [];
        if($node->tagName==='br')return [['type'=>'hardBreak']];
        if($node->hasAttribute('data-emoji')&&($emoji=$this->emoji($node->getAttribute('data-emoji'))))return [$this->text($emoji,array_values($marks))];
        if($node->tagName==='img')return $node->getAttribute('alt')!==''?[$this->text($node->getAttribute('alt'),array_values($marks))]:[];
        $out=[];
        $marks=$this->marks($node,$marks);
        foreach($node->childNodes as $child)array_push($out,...$this->inline($child,$depth+1,$marks));
        return $out;
    }
    private function flow(DOMElement $container, string $path, int $depth, array $skip=[]): array {
        $this->bounded($depth);
        $out=[];$pending=[];
        $flush=function()use(&$out,&$pending){
            if($pending && (count($pending)>1 || trim($pending[0]['text']??'')!=='' || $pending[0]['type']==='hardBreak'))$out[]=$this->paragraph($pending);
            $pending=[];
        };
        foreach($container->childNodes as $child) {
            if(in_array($child,$skip,true))continue;
            if($child instanceof DOMElement&&$this->skip($child))continue;
            if($child instanceof DOMElement&&in_array($child->tagName,['p','h1','h2','h3','h4','h5','h6','hr','pre','blockquote','ol','ul','dir','div','section','article','figure','details','aside','table','img'],true)){
                $flush();
                array_push($out,...$this->block($child,$path,$depth+1));
            }elseif($child instanceof DOMText&&trim($child->data)===''&&!$pending)continue;
            else array_push($pending,...$this->inline($child,$depth+1));
        }
        $flush();
        return $out;
    }
    private function asset(string $path, string $reference): ?array {
        $entry=$this->relative($path,$reference);
        if(!$entry||!isset($this->entries[$entry])||!$this->zip||$this->entries[$entry]>upload_limit())return null;
        if(array_key_exists($entry,$this->assets))return $this->assets[$entry];
        $stream=$this->zip->getStream($entry);
        if(!$stream)return $this->assets[$entry]=null;
        $temp=tempnam(sys_get_temp_dir(),'feuillet-notion-');
        if(!$temp){fclose($stream);fail('Impossible de préparer la pièce jointe.',500);}
        try{
            $out=fopen($temp,'wb');
            if(!$out)fail('Impossible de préparer la pièce jointe.',500);
            try{$written=stream_copy_to_stream($stream,$out,$this->entries[$entry]+1);}finally{fclose($out);}
            if($written!==$this->entries[$entry])fail('Pièce jointe incomplète.');
            $file=persist_file(['error'=>UPLOAD_ERR_OK,'tmp_name'=>$temp,'name'=>basename($entry)],false);
            $disk=query('SELECT path FROM files WHERE id=?',[$file['id']])->fetchColumn();
            $this->storedPaths[]=storage().'/files/'.$disk;
            return $this->assets[$entry]=$file;
        }catch(AppError $e){
            if($e->status>=500)throw $e;
            return $this->assets[$entry]=null;
        }finally{fclose($stream);if(is_file($temp))unlink($temp);}
    }
    private function attachment(string $path, string $href, string $label, bool $image=false): array {
        $file=$this->asset($path,$href);
        $alt=str_limit($label,240);
        if($image&&$file&&str_starts_with($file['mime'],'image/'))return ['type'=>'image','attrs'=>['fileId'=>$file['id'],'alt'=>$alt]];
        if($image&&!$file&&($url=$this->safeWeb($href))&&!preg_match('/(?:[?&](?:X-Amz-Signature|Signature|token)=|secure\.notion-static\.com|prod-files-secure\.s3)/i',$url))
            return ['type'=>'image','attrs'=>['src'=>$url,'alt'=>$alt]];
        $name=$file['name']??($alt?:str_limit(basename(rawurldecode(explode('?',$href,2)[0])),240)?:'Fichier Notion');
        return ['type'=>'fileBlock','attrs'=>['name'=>$name,'fileId'=>$file['id']??'','mime'=>$file['mime']??'','size'=>$file['size']??0,'mode'=>'download']];
    }
    private function block(DOMElement $el, string $path, int $depth): array {
        $this->bounded($depth);
        $tag=$el->tagName;
        if(preg_match('/^h([1-6])$/',$tag,$m))return [['type'=>'heading','attrs'=>['level'=>min(3,(int)$m[1])],'content'=>$this->inline($el,$depth+1)]];
        if($tag==='hr')return [['type'=>'horizontalRule']];
        if($tag==='pre')return [['type'=>'codeBlock','content'=>$el->textContent!==''?[$this->text($el->textContent)]:[]]];
        if($tag==='details'){
            $summary=null;
            foreach($el->childNodes as $child)if($child instanceof DOMElement&&$child->tagName==='summary'){$summary=$child;break;}
            $heading=$summary;
            if($summary)foreach($summary->childNodes as $child)if($child instanceof DOMElement&&preg_match('/^h[1-6]$/',$child->tagName)){$heading=$child;break;}
            $level=$heading&&preg_match('/^h([1-6])$/',$heading->tagName,$m)?min(3,(int)$m[1]):3;
            $title=['type'=>'heading','attrs'=>['level'=>$level],'content'=>$heading?$this->inline($heading,$depth+1):[]];
            return [['type'=>'toggleHeading','content'=>[$title,...($this->flow($el,$path,$depth+1,[$summary])?:[$this->paragraph()])]]];
        }
        if($this->has($el,'callout')||$el->getAttribute('data-block-type')==='callout'){
            $icon='';$skip=[];$tone='gray';
            foreach($el->childNodes as $child)if($child instanceof DOMElement&&$this->has($child,'icon')){$icon=$this->elementEmoji($child);$skip[]=$child;}
            if(!$skip&&($first=$el->firstElementChild)&&$first->tagName==='div'){
                foreach($first->childNodes as $inline)if($inline instanceof DOMElement&&$this->has($inline,'icon')){$icon=$this->elementEmoji($inline);$skip[]=$first;break;}
            }
            foreach(['blue'=>'blue','green'=>'green','red'=>'red','yellow'=>'amber','orange'=>'amber'] as $color=>$label)
                if($this->has($el,'block-color-'.$color.'_background'))$tone=$label;
            return [['type'=>'callout','attrs'=>['tone'=>$tone,'icon'=>$icon],'content'=>$this->flow($el,$path,$depth+1,$skip)?:[$this->paragraph()]]];
        }
        if($tag==='img')return [$this->attachment($path,$el->getAttribute('src'),$el->getAttribute('alt'),true)];
        if($tag==='figure'){
            $link=$el->getElementsByTagName('a')->item(0);
            $href=$link?->getAttribute('href')??'';
            $title=trim($link?->textContent??$el->textContent);
            if($this->has($el,'link-to-page')||$this->has($el,'page')){
                $child=$this->pages[$this->relative($path,$href)]??null;
                if($child)return [['type'=>'pageLink','attrs'=>['pageId'=>$child['id']]]];
                return [['type'=>'pageLink','attrs'=>['label'=>$title,'href'=>$this->safeWeb($href)]]];
            }
            if($link&&$link->hasAttribute('data-notion-file')) {
                $alias=$link->getAttribute('data-notion-file-alias');
                return [$this->attachment($path,$href,$alias?:$title)];
            }
            if(($img=$el->getElementsByTagName('img')->item(0))&&(!$this->has($el,'bookmark'))){
                $caption=$el->getElementsByTagName('figcaption')->item(0);
                return [$this->attachment($path,$img->getAttribute('src'),$img->getAttribute('alt'),true),...($caption?[$this->paragraph($this->inline($caption,$depth+1))]:[])];
            }
            foreach(['file','pdf','video','audio'] as $kind)if($this->has($el,$kind))return [$this->attachment($path,$href,$title)];
            if($this->has($el,'bookmark')&&($url=$this->safeWeb($href)))return [['type'=>'bookmark','attrs'=>['href'=>$url,'title'=>str_limit($title,240)]]];
        }
        if($tag==='ul'||$tag==='ol'){
            if($this->has($el,'toggle')) {
                $out=[];foreach($el->childNodes as $item)if($item instanceof DOMElement)array_push($out,...$this->flow($item,$path,$depth+1));
                return $out;
            }
            $task=$this->has($el,'to-do-list');$items=[];
            foreach($el->childNodes as $item)if($item instanceof DOMElement&&$item->tagName==='li'){
                $content=$this->flow($item,$path,$depth+1);
                if(($content[0]['type']??'')!=='paragraph')array_unshift($content,$this->paragraph());
                $checked=false;
                if($task)foreach($item->getElementsByTagName('*') as $check)if($this->has($check,'checkbox-on')){$checked=true;break;}
                $items[]=['type'=>$task?'taskItem':'listItem','content'=>$content]+($task?['attrs'=>['checked'=>$checked]]:[]);
            }
            return $items?[['type'=>$task?'taskList':($tag==='ol'?'orderedList':'bulletList'),'content'=>$items]+($tag==='ol'?['attrs'=>['start'=>max(1,(int)$el->getAttribute('start'))]]:[])]:[];
        }
        if($tag==='table'){
            $rows=[];
            foreach($el->getElementsByTagName('tr') as $row){
                $cells=[];
                foreach($row->childNodes as $cell)if($cell instanceof DOMElement&&in_array($cell->tagName,['td','th'],true))$cells[]=['type'=>$cell->tagName==='th'?'tableHeader':'tableCell','attrs'=>['colspan'=>max(1,min(20,(int)$cell->getAttribute('colspan'))),'rowspan'=>max(1,min(20,(int)$cell->getAttribute('rowspan')))],'content'=>$this->flow($cell,$path,$depth+1)?:[$this->paragraph()]];
                if($cells)$rows[]=['type'=>'tableRow','content'=>$cells];
            }
            return $rows?[['type'=>'table','content'=>$rows]]:[];
        }
        if($this->has($el,'column-list')){
            $cols=[];foreach($el->childNodes as $col)if($col instanceof DOMElement&&$this->has($col,'column'))$cols[]=['type'=>'column','content'=>$this->flow($col,$path,$depth+1)?:[$this->paragraph()]];
            if(count($cols)>=2&&count($cols)<=6)return [['type'=>'columns','content'=>$cols]];
        }
        if($tag==='blockquote')return [['type'=>'blockquote','content'=>$this->flow($el,$path,$depth+1)?:[$this->paragraph()]]];
        if($tag==='p')return [$this->paragraph($this->inline($el,$depth+1))];
        return $this->flow($el,$path,$depth+1);
    }
}
