<?php
declare(strict_types=1);
require_once __DIR__.'/database-views.php';
function h(mixed $s): string { return htmlspecialchars(is_scalar($s)?(string)$s:'',ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
function render_document(array $node,string $pageId='',bool $public=true): string {
    $t=$node['type']??'';$a=$node['attrs']??[];$children='';
    if($t==='toggleHeading'){
        $parts=$node['content']??[];$title=array_shift($parts);
        return '<details class="toggle-heading"><summary>'.render_document($title??['type'=>'heading','attrs'=>['level'=>2]],$pageId,$public).'</summary><div class="toggle-heading-body">'.implode('',array_map(fn($n)=>render_document($n,$pageId,$public),$parts)).'</div></details>';
    }
    foreach($node['content']??[] as $child)$children.=render_document($child,$pageId,$public);
    if($t==='text'){
        $v=h($node['text']??'');foreach($node['marks']??[] as $m){$v=match($m['type']??''){'bold'=>'<strong>'.$v.'</strong>','italic'=>'<em>'.$v.'</em>','underline'=>'<u>'.$v.'</u>','strike'=>'<s>'.$v.'</s>','code'=>'<code>'.$v.'</code>','highlight'=>'<mark'.(css_color($m['attrs']['color']??'')?' style="background-color:'.h(css_color($m['attrs']['color'])).'"':'').'>'.$v.'</mark>','textStyle'=>strtolower($m['attrs']['color']??'')!=='#37352f'&&css_color($m['attrs']['color']??'')?'<span style="color:'.h(css_color($m['attrs']['color'])).'">'.$v.'</span>':$v,'subscript'=>'<sub>'.$v.'</sub>','superscript'=>'<sup>'.$v.'</sup>','link'=>safe_url($m['attrs']['href']??'')?'<a href="'.h(safe_url($m['attrs']['href'])).'" target="_blank" rel="noopener noreferrer">'.$v.'</a>':$v,default=>$v};}return $v;
    }
    if($t==='doc')return $children;
    if($t==='paragraph')return '<p>'.($children?:'<br>').'</p>';
    if($t==='hardBreak')return '<br>';
    if($t==='heading'){$level=max(1,min(6,(int)($a['level']??2)));return '<h'.$level.'>'.$children.'</h'.$level.'>';}
    if($t==='bulletList'||$t==='taskList')return '<ul class="'.($t==='taskList'?'task-list':'').'">'.$children.'</ul>';
    if($t==='orderedList')return '<ol start="'.max(1,(int)($a['start']??1)).'">'.$children.'</ol>';
    if($t==='listItem')return '<li>'.$children.'</li>';
    if($t==='taskItem')return '<li class="task-item"><input type="checkbox" disabled '.(!empty($a['checked'])?'checked':'').'><div>'.$children.'</div></li>';
    if($t==='blockquote')return '<blockquote>'.$children.'</blockquote>';
    if($t==='horizontalRule')return '<hr>';
    if($t==='codeBlock')return '<pre><code>'.$children.'</code></pre>';
    if($t==='table')return '<div class="table-scroll"><table>'.$children.'</table></div>';
    if($t==='tableRow')return '<tr>'.$children.'</tr>';
    if($t==='tableCell'||$t==='tableHeader'){$tag=$t==='tableHeader'?'th':'td';return '<'.$tag.' colspan="'.max(1,min(20,(int)($a['colspan']??1))).'" rowspan="'.max(1,min(20,(int)($a['rowspan']??1))).'">'.$children.'</'.$tag.'>';}
    if($t==='callout'){$tone=in_array($a['tone']??'', ['blue','green','amber','red','gray'],true)?$a['tone']:'gray';return '<aside class="callout tone-'.$tone.'"><span class="callout-icon">'.h($a['icon']??'💡').'</span><div>'.$children.'</div></aside>';}
    if($t==='columns')return '<div class="columns">'.$children.'</div>';
    if($t==='column')return '<div class="column">'.$children.'</div>';
    if($t==='details')return '<details><summary>'.h($a['summary']??'En savoir plus').'</summary>'.$children.'</details>';
    if($t==='pageLink'){
        try{$p=get_page(str_limit($a['pageId']??'',36),$public);}catch(Throwable){return '';}
        return '<a class="page-link" href="'.h($public?reader_page_url($p):'index.php?page='.rawurlencode($p['slug'])).'"><span>'.render_page_icon($p).'</span> '.h($p['title']).'</a>';
    }
    if($t==='buttonLink'||$t==='bookmark'){
        $url=safe_url($a['href']??'');if(!$url)return '';
        if($t==='buttonLink')return '<a class="resource-button" href="'.h($url).'" target="_blank" rel="noopener noreferrer">↗ '.h($a['label']??$url).'</a>';
        return '<a class="bookmark" href="'.h($url).'" target="_blank" rel="noopener noreferrer"><strong>'.h($a['title']??$url).'</strong><p>'.h($a['description']??'').'</p><small>'.h($a['source']??parse_url($url,PHP_URL_HOST)).' ↗</small></a>';
    }
    if($t==='mapBlock'){
        $address=str_limit($a['address']??'',500);if(!$address)return '';
        $src=map_embed_url($a['embedUrl']??'')?:'https://maps.google.com/maps?q='.rawurlencode($address).'&z=14&output=embed';
        return '<section class="map-block"><header><span aria-hidden="true">⌖</span><strong>'.h($address).'</strong></header><iframe title="'.h('Carte : '.$address).'" src="'.h($src).'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe><a href="'.h('https://www.google.com/maps/search/?api=1&query='.rawurlencode($address)).'" target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps ↗</a></section>';
    }
    if($t==='image'){
        $src=!empty($a['fileId'])?'media.php?id='.rawurlencode($a['fileId']):safe_url($a['src']??'');if(!$src)return '';
         $width=max(10,min(100,(int)($a['width']??100)));$align=in_array($a['align']??'',['left','center','right'],true)?$a['align']:'center';$margin=match($align){'left'=>'0 auto 0 0','right'=>'0 0 0 auto',default=>'0 auto'};$caption='';if(!empty($a['fileId'])){$file=query('SELECT attribution FROM files WHERE id=?',[$a['fileId']])->fetch();$attr=json_decode($file['attribution']??'null',true);if($attr)$caption='<figcaption class="image-attribution">'.h($attr['author']??'').' · '.h($attr['license']??'').(safe_url($attr['source_url']??'')?' · <a href="'.h(safe_url($attr['source_url'])).'" rel="noopener noreferrer" target="_blank">'.h($attr['source_name']??'Wikimedia Commons').'</a>':'').'</figcaption>';}return '<figure class="image-align-'.$align.'" style="width:'.$width.'%;margin:'.$margin.'"><img loading="lazy" src="'.h($src).'" alt="'.h($a['alt']??'').'">'.$caption.'</figure>';
    }
    if($t==='fileBlock'){
        $id=str_limit($a['fileId']??'',36);$f=query('SELECT name,mime,size FROM files WHERE id=?',[$id])->fetch();if(!$f||($public&&!file_public($id)))return '';
        $url='media.php?id='.rawurlencode($id);$mode=in_array($a['mode']??'', ['pdf','audio','video'],true)?$a['mode']:'download';
        $extension=strtoupper(pathinfo($f['name'],PATHINFO_EXTENSION)?:'FICHIER');$size=(int)$f['size'];$sizeLabel=$size>=1048576?round($size/1048576,1).' Mo':max(1,(int)ceil($size/1024)).' Ko';
        $eye='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
        $download='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>';
        $caption='<div class="attachment-caption"><span class="attachment-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg></span><div class="attachment-info"><strong>'.h($f['name']).'</strong><small>'.h($extension).' <span aria-hidden="true">·</span> '.h($sizeLabel).'</small></div><div class="attachment-actions"><button type="button" class="file-preview-trigger" data-file-preview="'.h($id).'" data-file-name="'.h($f['name']).'">'.$eye.'<span>Aperçu</span></button><a class="attachment-download" href="'.$url.'&download=1" aria-label="'.h('Télécharger '.$f['name']).'">'.$download.'<span>Télécharger</span></a></div></div>';
        $media='';
        if($mode==='pdf'&&$f['mime']==='application/pdf')$media='<iframe class="pdf-reader" title="'.h($f['name']).'" loading="lazy" src="pdf-viewer.php?id='.rawurlencode($id).'"></iframe>';
        elseif($mode==='audio'&&str_starts_with($f['mime'],'audio/'))$media='<audio controls preload="metadata" src="'.$url.'"></audio>';
        elseif($mode==='video'&&str_starts_with($f['mime'],'video/'))$media='<video controls playsinline preload="metadata" src="'.$url.'"></video>';
        return '<section class="file-block attachment-block mode-'.h($media?$mode:'download').'">'.$media.$caption.'</section>';
    }
    if($t==='gallery')return render_gallery($a,$pageId,$public);
    if($t==='databaseView')return render_database_view(str_limit($a['dbId']??'',36),$public,is_array($a['viewConfig']??null)?$a['viewConfig']:[]);
    if($t==='formView')return render_form_view(str_limit($a['formId']??'',36),$public);
    if($t==='quiz'){
        $html='<form class="quiz" data-page="'.h($pageId).'" data-quiz="'.h($a['quizId']??'').'"><h3>'.h($a['title']??'À toi de jouer').'</h3>';
        foreach($a['questions']??[] as $i=>$q){$html.='<fieldset data-question="'.h($q['id']).'" data-type="'.h($q['type']).'"><legend>'.($i+1).'. '.h($q['prompt']??'').'</legend>';
            if($q['type']==='short')$html.='<input type="text" name="'.h($q['id']).'" aria-label="Ta réponse" autocomplete="off">';
            else foreach($q['options']??[] as $j=>$opt)$html.='<label class="quiz-option"><input type="'.($q['type']==='multiple'?'checkbox':'radio').'" name="'.h($q['id']).'[]" value="'.$j.'"> '.h($opt).'</label>';
            $html.='<div class="quiz-feedback" aria-live="polite"></div></fieldset>';
        }
        return $html.'<button type="submit" class="primary">Vérifier mes réponses</button> <button type="reset">Recommencer</button><p class="quiz-score" aria-live="polite"></p><noscript>Active JavaScript pour obtenir une correction immédiate.</noscript></form>';
    }
    return $children;
}

function render_page_icon(array $page): string {
    if(!empty($page['icon_id']))return '<img class="page-icon-image feuillet-icon" src="media.php?id='.rawurlencode($page['icon_id']).'" alt="" style="width:1em;height:1em;object-fit:contain;display:inline-block">';
    return render_feuillet_icon($page['icon']??'📄');
}
function render_feuillet_icon(string $value): string {
    if(in_array($value,['f.','feuillet'],true))return str_replace(['#263A35','<svg '],['currentColor','<svg class="feuillet-logo" aria-hidden="true" '],trim(file_get_contents(FEUILLET_ROOT.'/public/feuillet-logo.svg')));
    if(preg_match('/^lucide:([a-z0-9-]{1,60})(:#[a-fA-F0-9]{6})?$/D',$value,$match)){
        $color=isset($match[2])?' style="color:'.h(substr($match[2],1)).'"':'';
        return '<svg viewBox="0 0 24 24" class="feuillet-icon feuillet-web-icon" width="1em" height="1em" aria-hidden="true"'.$color.'><use href="icons.svg#'.h($match[1]).'"></use></svg>';
    }
    return '<span class="feuillet-icon feuillet-emoji" aria-hidden="true">'.h($value).'</span>';
}



/** Same visibility policy as public_db_get; never render private/form responses. */
function render_database_view(string $id,bool $public,array $config=[]): string {
    try{$bundle=database_bundle($id,$public||!admin());}catch(Throwable){return '<section class="embedded-database reader-embed-unavailable"><p>Cette base n’est pas disponible.</p></section>';}
    $rows=database_view_rows($bundle,$config);$hidden=is_array($config['hiddenPropertyIds']??null)?$config['hiddenPropertyIds']:[];$properties=array_values(array_filter($bundle['properties'],fn($p)=>$p['type']==='title'||!in_array($p['id'],$hidden,true)));$files=array_column($bundle['files'],null,'id');$head='';$body='';
    foreach($properties as $property)$head.='<th scope="col">'.h($property['name']).'</th>';
    foreach(array_slice($rows,0,500) as $row){$cells='';foreach($properties as $property){$value=$row['derived'][$property['id']]??$row['values'][$property['id']]??null;
        if($property['type']==='files'){$text='';foreach(is_array($value)?$value:[] as $fileId){$file=$files[$fileId]??null;if(!$file)continue;$text.='<a class="database-file" href="media.php?id='.rawurlencode($fileId).'&download=1">'.h($file['name']).'</a>';}}
        elseif(in_array($property['type'],['select','multiselect'],true))$text=render_status_tags($property,$value);
        elseif($property['type']==='relation')$text=h(database_view_text(database_view_value($row,$property,$bundle)));
        elseif($property['type']==='checkbox')$text=!empty($value)?'<span aria-label="Oui">✓</span>':'<span aria-label="Non">—</span>';
        elseif(is_array($value))$text=h(implode(', ',array_map(fn($v)=>is_scalar($v)?(string)$v:encoded($v),$value)));
        elseif(is_bool($value))$text=$value?'Oui':'Non';
        else $text=h($value===null?'—':$value);
        $cells.='<td>'.$text.'</td>';
    }$body.='<tr>'.$cells.'</tr>';}
    $title='<h2>'.h($bundle['database']['name']).'</h2>';
    if(!$properties)return '<section class="embedded-database">'.$title.'<p>Cette base ne contient pas encore de propriétés.</p></section>';
    if(!$body)$body='<tr><td colspan="'.count($properties).'">Aucune ligne disponible.</td></tr>';
    $more=count($rows)>500?'<p class="muted">Les 500 premières lignes sont affichées dans cette vue de lecture.</p>':'';
    if(($config['layout']??'table')==='gallery'){
        $cards='';foreach(array_slice($rows,0,500) as $row){$fields='';foreach($properties as $property){$value=database_view_value($row,$property,$bundle);$fields.='<div><strong>'.h($property['name']).'</strong><p>'.(in_array($property['type'],['select','multiselect'],true)?render_status_tags($property,$value):h($value===null||$value===''||$value===[]?'—':database_view_text($value))).'</p></div>';}$cards.='<article class="database-gallery-card">'.$fields.'</article>';}
        return '<section class="embedded-database">'.$title.'<div class="database-reader-gallery">'.($cards?:'<p>Aucune ligne disponible.</p>').'</div>'.$more.'</section>';
    }
    if(($config['layout']??'table')==='chart'){
        $number=null;$label=null;foreach($bundle['properties'] as $property){if(!$label&&$property['type']==='title')$label=$property;if(!$number&&in_array($property['type'],['number','formula','rollup'],true))$number=$property;}
        if($number&&$label){$bars='';$max=1;foreach($rows as $row)$max=max($max,abs((float)(database_view_value($row,$number,$bundle)??0)));foreach(array_slice($rows,0,100) as $row){$value=database_view_value($row,$number,$bundle);if(!is_numeric($value))continue;$bars.='<div class="database-reader-bar"><span>'.h(database_view_text(database_view_value($row,$label,$bundle))).'</span><div><i style="width:'.h(max(0,min(100,abs((float)$value)/$max*100))).'%"></i></div><strong>'.h($value).'</strong></div>';}
            return '<section class="embedded-database">'.$title.'<p>'.h($number['name']).'</p><div class="database-reader-chart">'.$bars.'</div></section>';
        }
    }
    return '<section class="embedded-database">'.$title.'<div class="table-scroll"><table><thead><tr>'.$head.'</tr></thead><tbody>'.$body.'</tbody></table></div>'.$more.'</section>';
}
function render_form_view(string $id,bool $public): string {
    // Force the published reference gate even when an admin reads the public version.
    if($public){$record=query('SELECT is_public FROM collection_forms WHERE id=?',[$id])->fetch();if(!$record||!(bool)$record['is_public']||!database_node_reference('formView',$id))return '<section class="embedded-form reader-embed-unavailable"><p>Ce formulaire n’est pas disponible.</p></section>';}
    try{$bundle=database_form_get($id);}catch(Throwable){return '<section class="embedded-form reader-embed-unavailable"><p>Ce formulaire n’est pas disponible.</p></section>';}
    $form=$bundle['form'];$title='<h2>'.h($form['name']).'</h2>';
    if(empty($form['public']))return '<section class="embedded-form">'.$title.'<p>Ce formulaire est privé. Ouvre ses réglages pour activer le partage.</p></section>';
    $link='index.php?form='.rawurlencode($form['token']);$fields='';foreach($bundle['properties'] as $property)$fields.='<li>'.h($property['name']).(!empty($property['required'])?' <span class="muted">(obligatoire)</span>':'').'</li>';
    return '<section class="embedded-form">'.$title.'<p>Les réponses sont envoyées à l’administrateur du site et restent privées.</p>'.($fields?'<ul class="form-fields-preview">'.$fields.'</ul>':'').'<a class="resource-button" href="'.h($link).'">Ouvrir et remplir le formulaire ↗</a><noscript><p>JavaScript est nécessaire pour envoyer les réponses et les pièces jointes.</p></noscript></section>';
}

/** Public breadcrumbs use only active published snapshots, even for logged-in readers. */
function reader_ancestors(array $page): array {
    $all=page_rows();$chain=[];$seen=[$page['id']=>true];$id=$page['parent_id']??null;
    while($id){
        if(!reader_page_allowed($id)||$page['id']===reader_root_id()||isset($seen[$id]))break;$seen[$id]=true;$row=$all[$id]??null;
        if(!$row||$row['deleted_at']||!ancestors_active($row,$all))break;
        if($row['visibility']!=='public'||!$row['published'])break;
        $ancestor=row_page($row,true);array_unshift($chain,$ancestor);$id=$row['parent_id'];
    }
    return $chain;
}
function render_reader_breadcrumbs(array $page): string {
    $chain=[...reader_ancestors($page),$page];
    $html='<nav class="reader-breadcrumbs" aria-label="Fil d’Ariane"><ol>';
    foreach($chain as $i=>$entry){$html.='<li>'.($i?'<span class="breadcrumb-separator" aria-hidden="true">›</span>':'<span class="reader-brand-icon">'.render_page_icon(['icon'=>notebook_settings()['icon']??'f.','icon_id'=>notebook_settings()['icon_id']??null]).'</span>');
        $html.=$entry['id']===$page['id']?'<span aria-current="page">'.h($entry['title']).'</span>':'<a href="'.h(reader_page_url($entry)).'">'.h($entry['title']).'</a>';$html.='</li>';
    }
    return $html.'</ol></nav>';
}

function list_public_pages(): array {
    $pages=[];$all=page_rows();foreach($all as $row){if($row['deleted_at']||$row['visibility']!=='public'||!$row['published']||!ancestors_active($row,$all)||!reader_page_allowed($row['id']))continue;$p=row_page($row,true);unset($p['content']);$pages[]=$p;}return $pages;
}

function render_reader_brand(): string { $n=notebook_settings();return '<span class="reader-brand-icon">'.render_page_icon(['icon'=>$n['icon']??'f.','icon_id'=>$n['icon_id']??null]).'</span><span>'.h($n['title']).'</span>'; }

function render_gallery(array $attrs,string $pageId,bool $public): string {
    $all=page_rows();$manual=!empty($attrs['manual']);$selection=$manual?array_values(array_intersect($attrs['pageIds']??[],array_keys($all))):array_keys($all);
    $columns=max(1,min(6,(int)($attrs['columns']??2)));$rows=max(0,min(12,(int)($attrs['rows']??2)));$layout=($attrs['layout']??'grid')==='list'?'list':'grid';
    $aspect=in_array($attrs['aspect']??'', ['16/9','4/3','1/1','3/4','auto'],true)?$attrs['aspect']:'16/9';$limit=$rows?$rows*($layout==='list'?1:$columns):500;$count=0;$cards='';
    foreach($selection as $id){$row=$all[$id];if($id===$pageId||$row['deleted_at']||!ancestors_active($row,$all)||($public&&($row['visibility']!=='public'||!$row['published']||!reader_page_allowed($id))))continue;$p=row_page($row,$public);
        if(!$manual&&!empty($attrs['parentId'])&&$p['parent_id']!==$attrs['parentId'])continue;if(!$manual&&!empty($attrs['kind'])&&$p['kind']!==$attrs['kind'])continue;
        if($count>=500)break;$hidden=$count++ >= $limit;$icon=render_page_icon($p);$preview=$p['cover_id']?'<img loading="lazy" style="object-position:'.h(($p['cover_position']['x']??50).'% '.($p['cover_position']['y']??50).'%').'" src="media.php?id='.rawurlencode($p['cover_id']).'" alt="">':'<div class="gallery-placeholder"><span>'.$icon.'</span></div>';
        $cards.='<div class="gallery-card"'.($hidden?' hidden data-gallery-extra="1"':'').'><a class="gallery-card-main" href="'.h($public?reader_page_url($p):'index.php?page='.rawurlencode($p['slug'])).'">'.$preview.'<div class="gallery-card-text"><strong>'.$icon.' '.h($p['title']).'</strong>'.($p['description']?'<p>'.h($p['description']).'</p>':'').($p['kind']==='article'&&$p['source_name']?'<small>'.h($p['source_name']).'</small>':'').'</div></a>';
        foreach(['cover_attribution','icon_attribution'] as $key)if(!empty($p[$key]))$cards.=str_replace('class="image-attribution"','class="image-attribution compact"',render_credit($p[$key]));$cards.='</div>';
    }
    $styles='--gallery-columns:'.$columns.';--gallery-mobile-columns:'.min(2,$columns).';--gallery-aspect:'.h($aspect).';';
    return '<section class="gallery-block gallery-v2 layout-'.$layout.'" style="'.$styles.'"><div class="gallery-heading"><h3>'.h($attrs['title']??'Collection').'</h3></div><div class="gallery-grid gallery-v2-grid">'.($cards?:'<p class="muted">Aucune ressource publiée dans cette collection pour le moment.</p>').'</div>'.($count>$limit?'<button type="button" class="gallery-show-more" aria-expanded="false" data-gallery-toggle>Afficher tout ('.$count.')</button>':'').'</section>';
}

function render_reader_theme_toggle(): string {
    $sun='<svg width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><use href="icons.svg#sun"/></svg>';
    $moon='<svg width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><use href="icons.svg#moon"/></svg>';
    $chevron='<svg width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><use href="icons.svg#chevron-down"/></svg>';
    return '<div class="feuillet-theme-toggle"><button type="button" class="theme-main-button" data-theme-main aria-label="Activer le mode sombre"><span class="theme-symbols" aria-hidden="true">'.$sun.$moon.'</span></button><details class="theme-options"><summary aria-label="Choisir le thème">'.$chevron.'</summary><div><button type="button" data-theme-value="system">Système</button><button type="button" data-theme-value="light">Clair</button><button type="button" data-theme-value="dark">Sombre</button><button type="button" data-theme-value="oled">Noir OLED</button><button type="button" data-theme-value="inherit">Thème du carnet</button></div></details></div>';
}

function render_status_tags(array $property,mixed $value): string {
    $values=is_array($value)?$value:($value===null||$value===''?[]:[(string)$value]);$html='';
    foreach($values as $label){$color=$property['config']['option_colors'][$label]??null;$style=is_string($color)&&preg_match('/^#[0-9a-fA-F]{6}$/D',$color)?' style="--tag-color:'.h($color).'"':'';$html.='<span class="database-status-tag"'.$style.'>'.h($label).'</span>';}
    return $html?:'—';
}
