<?php
declare(strict_types=1);
function h(mixed $s): string { return htmlspecialchars(is_scalar($s)?(string)$s:'',ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'); }
function render_document(array $node,string $pageId='',bool $public=true): string {
    $t=$node['type']??'';$a=$node['attrs']??[];$children='';foreach($node['content']??[] as $child)$children.=render_document($child,$pageId,$public);
    if($t==='text'){
        $v=h($node['text']??'');foreach($node['marks']??[] as $m){$v=match($m['type']??''){'bold'=>'<strong>'.$v.'</strong>','italic'=>'<em>'.$v.'</em>','underline'=>'<u>'.$v.'</u>','strike'=>'<s>'.$v.'</s>','code'=>'<code>'.$v.'</code>','highlight'=>'<mark'.(css_color($m['attrs']['color']??'')?' style="background-color:'.h(css_color($m['attrs']['color'])).'"':'').'>'.$v.'</mark>','textStyle'=>css_color($m['attrs']['color']??'')?'<span style="color:'.h(css_color($m['attrs']['color'])).'">'.$v.'</span>':$v,'subscript'=>'<sub>'.$v.'</sub>','superscript'=>'<sup>'.$v.'</sup>','link'=>safe_url($m['attrs']['href']??'')?'<a href="'.h(safe_url($m['attrs']['href'])).'" target="_blank" rel="noopener noreferrer">'.$v.'</a>':$v,default=>$v};}return $v;
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
        return '<a class="page-link" href="index.php?page='.rawurlencode($p['slug']).($public?'&read=1':'').'"><span>'.render_page_icon($p).'</span> '.h(($a['label']??'')?:$p['title']).'</a>';
    }
    if($t==='buttonLink'||$t==='bookmark'){
        $url=safe_url($a['href']??'');if(!$url)return '';
        if($t==='buttonLink')return '<a class="resource-button" href="'.h($url).'" target="_blank" rel="noopener noreferrer">↗ '.h($a['label']??$url).'</a>';
        return '<a class="bookmark" href="'.h($url).'" target="_blank" rel="noopener noreferrer"><strong>'.h($a['title']??$url).'</strong><p>'.h($a['description']??'').'</p><small>'.h($a['source']??parse_url($url,PHP_URL_HOST)).' ↗</small></a>';
    }
    if($t==='image'){
        $src=!empty($a['fileId'])?'media.php?id='.rawurlencode($a['fileId']):safe_url($a['src']??'');if(!$src)return '';
         $width=max(10,min(100,(int)($a['width']??100)));$align=in_array($a['align']??'',['left','center','right'],true)?$a['align']:'center';$margin=match($align){'left'=>'0 auto 0 0','right'=>'0 0 0 auto',default=>'0 auto'};$caption='';if(!empty($a['fileId'])){$file=query('SELECT attribution FROM files WHERE id=?',[$a['fileId']])->fetch();$attr=json_decode($file['attribution']??'null',true);if($attr)$caption='<figcaption class="image-attribution">'.h($attr['author']??'').' · '.h($attr['license']??'').(safe_url($attr['source_url']??'')?' · <a href="'.h(safe_url($attr['source_url'])).'" rel="noopener noreferrer" target="_blank">Wikimedia Commons</a>':'').'</figcaption>';}return '<figure class="image-align-'.$align.'" style="width:'.$width.'%;margin:'.$margin.'"><img loading="lazy" src="'.h($src).'" alt="'.h($a['alt']??'').'">'.$caption.'</figure>';
    }
    if($t==='fileBlock'){
        $id=str_limit($a['fileId']??'',36);$f=query('SELECT name,mime,size FROM files WHERE id=?',[$id])->fetch();if(!$f||($public&&!file_public($id)))return '';
        $url='media.php?id='.rawurlencode($id);$link='<a class="download" href="'.$url.'&download=1">↓ '.h($f['name']).' <small>('.h(round((int)$f['size']/1024)).' Ko)</small></a>';
        if(($a['mode']??'')==='pdf'&&$f['mime']==='application/pdf')return '<section class="file-block"><iframe class="pdf-reader" title="'.h($f['name']).'" src="pdf-viewer.php?id='.rawurlencode($id).'"></iframe>'.$link.'<a href="'.$url.'" target="_blank" rel="noopener">Ouvrir le PDF</a></section>';
        if(($a['mode']??'')==='audio'&&str_starts_with($f['mime'],'audio/'))return '<section class="file-block"><audio controls preload="metadata" src="'.$url.'"></audio>'.$link.'</section>';
        if(($a['mode']??'')==='video'&&str_starts_with($f['mime'],'video/'))return '<section class="file-block"><video controls playsinline preload="metadata" src="'.$url.'"></video>'.$link.'</section>';
        return '<section class="file-block">'.$link.'</section>';
    }
    if($t==='gallery'){
        $all=page_rows();$selection=!empty($a['manual'])?array_values(array_intersect($a['pageIds']??[],array_keys($all))):array_keys($all);$cards='';$count=0;$columns=max(1,min(6,(int)($a['columns']??2)));$rows=max(0,min(12,(int)($a['rows']??2)));$layout=($a['layout']??'grid')==='list'?'list':'grid';$aspect=in_array($a['aspect']??'', ['16/9','4/3','1/1','3/4','auto'],true)?$a['aspect']:'16/9';$limit=$rows?$rows*($layout==='list'?1:$columns):500;
        foreach($selection as $id){$r=$all[$id];if($r['deleted_at']||!ancestors_active($r,$all)||($public&&($r['visibility']!=='public'||!$r['published'])))continue;$p=row_page($r,$public);
            if(empty($a['manual'])&&!empty($a['parentId'])&&$p['parent_id']!==$a['parentId'])continue;if(empty($a['manual'])&&!empty($a['kind'])&&$p['kind']!==$a['kind'])continue;if($p['id']===$pageId)continue;if($count++ >= $limit)break;
            $cards.='<article class="gallery-card-wrapper"><a class="gallery-card" href="index.php?page='.rawurlencode($p['slug']).($public?'&read=1':'').'">'.(!empty($p['cover_id'])?'<img loading="lazy" style="aspect-ratio:'.h($aspect).';object-position:'.h(($p['cover_position']['x']??50).'% '.($p['cover_position']['y']??50).'%').'" src="media.php?id='.rawurlencode($p['cover_id']).'" alt="">':'').'<div><strong>'.render_page_icon($p).' '.h($p['title']).'</strong>'.(!empty($p['description'])?'<p>'.h($p['description']).'</p>':'').'</div></a><div class="gallery-card-credits">'.render_credit($p['cover_attribution']??null).render_credit($p['icon_attribution']??null).'</div></article>';
        }
        return '<section class="gallery-block">'.(!empty($a['title'])?'<h2>'.h($a['title']).'</h2>':'').'<div class="gallery layout-'.$layout.' columns-'.$columns.'" style="--gallery-columns:'.$columns.';'.($layout==='list'?'display:flex;flex-direction:column;':'grid-template-columns:repeat('.$columns.',minmax(0,1fr));').'">'.($cards?:'<p class="muted">Aucune ressource dans cette galerie.</p>').'</div></section>';
    }
    if($t==='databaseView')return render_database_view(str_limit($a['dbId']??'',36),$public);
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

function render_page_icon(array $page): string { return !empty($page['icon_id'])?'<img class="page-icon-image" src="media.php?id='.rawurlencode($page['icon_id']).'" alt="" style="width:1em;height:1em;object-fit:contain;display:inline-block">':h($page['icon']??'📄'); }


/** Same visibility policy as public_db_get; never render private/form responses. */
function render_database_view(string $id,bool $public): string {
    try{$bundle=database_bundle($id,$public||!admin());}catch(Throwable){return '<section class="embedded-database reader-embed-unavailable"><p>Cette base n’est pas disponible.</p></section>';}
    $properties=$bundle['properties'];$files=array_column($bundle['files'],null,'id');$head='';$body='';
    foreach($properties as $property)$head.='<th scope="col">'.h($property['name']).'</th>';
    foreach(array_slice($bundle['rows'],0,500) as $row){$cells='';foreach($properties as $property){$value=$row['derived'][$property['id']]??$row['values'][$property['id']]??null;
        if($property['type']==='files'){$text='';foreach(is_array($value)?$value:[] as $fileId){$file=$files[$fileId]??null;if(!$file)continue;$text.='<a class="database-file" href="media.php?id='.rawurlencode($fileId).'&download=1">'.h($file['name']).'</a>';}}
        elseif($property['type']==='checkbox')$text=!empty($value)?'<span aria-label="Oui">✓</span>':'<span aria-label="Non">—</span>';
        elseif(is_array($value))$text=h(implode(', ',array_map(fn($v)=>is_scalar($v)?(string)$v:encoded($v),$value)));
        elseif(is_bool($value))$text=$value?'Oui':'Non';
        else $text=h($value===null?'—':$value);
        $cells.='<td>'.$text.'</td>';
    }$body.='<tr>'.$cells.'</tr>';}
    $title='<h2>'.h($bundle['database']['name']).'</h2>';
    if(!$properties)return '<section class="embedded-database">'.$title.'<p>Cette base ne contient pas encore de propriétés.</p></section>';
    if(!$body)$body='<tr><td colspan="'.count($properties).'">Aucune ligne disponible.</td></tr>';
    $more=count($bundle['rows'])>500?'<p class="muted">Les 500 premières lignes sont affichées dans cette vue de lecture.</p>':'';
    return '<section class="embedded-database">'.$title.'<div class="table-scroll"><table><thead><tr>'.$head.'</tr></thead><tbody>'.$body.'</tbody></table></div>'.$more.'</section>';
}
function render_form_view(string $id,bool $public): string {
    // Force the published reference gate even when an admin reads the public version.
    if($public){$record=query('SELECT is_public FROM collection_forms WHERE id=?',[$id])->fetch();if(!$record||!(bool)$record['is_public']||!database_node_reference('formView',$id))return '<section class="embedded-form reader-embed-unavailable"><p>Ce formulaire n’est pas disponible.</p></section>';}
    try{$bundle=database_form_get($id);}catch(Throwable){return '<section class="embedded-form reader-embed-unavailable"><p>Ce formulaire n’est pas disponible.</p></section>';}
    $form=$bundle['form'];$title='<h2>'.h($form['name']).'</h2>';
    if(empty($form['public']))return '<section class="embedded-form">'.$title.'<p>Ce formulaire est privé. Ouvre ses réglages pour activer le partage.</p></section>';
    $link='index.php?form='.rawurlencode($form['token']);$fields='';foreach($bundle['properties'] as $property)$fields.='<li>'.h($property['name']).(!empty($property['required'])?' <span class="muted">(obligatoire)</span>':'').'</li>';
    return '<section class="embedded-form">'.$title.'<p>Les réponses sont envoyées à l’enseignant et restent privées.</p>'.($fields?'<ul class="form-fields-preview">'.$fields.'</ul>':'').'<a class="resource-button" href="'.h($link).'">Ouvrir et remplir le formulaire ↗</a><noscript><p>JavaScript est nécessaire pour envoyer les réponses et les pièces jointes.</p></noscript></section>';
}

/** Public breadcrumbs use only active published snapshots, even for logged-in readers. */
function reader_ancestors(array $page): array {
    $all=page_rows();$chain=[];$seen=[$page['id']=>true];$id=$page['parent_id']??null;
    while($id){
        if(isset($seen[$id]))break;$seen[$id]=true;$row=$all[$id]??null;
        if(!$row||$row['deleted_at']||!ancestors_active($row,$all))break;
        if($row['visibility']!=='public'||!$row['published'])break;
        $ancestor=row_page($row,true);array_unshift($chain,$ancestor);$id=$row['parent_id'];
    }
    return $chain;
}
function render_reader_breadcrumbs(array $page): string {
    $html='<nav class="reader-breadcrumbs" aria-label="Fil d’Ariane"><ol><li><a href="index.php?read=1">'.h(notebook_settings()['title']).'</a></li>';
    foreach(reader_ancestors($page) as $ancestor)$html.='<li><span class="breadcrumb-separator" aria-hidden="true">›</span><a href="index.php?page='.rawurlencode($ancestor['slug']).'&amp;read=1">'.h($ancestor['title']).'</a></li>';
    return $html.'<li><span class="breadcrumb-separator" aria-hidden="true">›</span><span aria-current="page">'.h($page['title']).'</span></li></ol></nav>';
}

function list_public_pages(): array {
    $pages=[];$all=page_rows();foreach($all as $row){if($row['deleted_at']||$row['visibility']!=='public'||!$row['published']||!ancestors_active($row,$all))continue;$p=row_page($row,true);unset($p['content']);$pages[]=$p;}return $pages;
}
