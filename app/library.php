<?php
declare(strict_types=1);
/** Administrator-only inventory of links already saved in pages. No remote fetch. */
function library_links(): array {
    need_admin();$links=[];$seen=[];
    $rows=query('SELECT id,title,content,visibility FROM pages WHERE deleted_at IS NULL ORDER BY updated_at DESC');
    while($page=$rows->fetch()){
        $walk=function(array $node)use(&$walk,&$links,&$seen,$page){
            if(count($links)>=1000)return;
            $attrs=$node['attrs']??[];$candidates=[];
            if(in_array($node['type']??'', ['bookmark','buttonLink','webVideo'],true))$candidates[]=[$attrs['href']??$attrs['url']??'', $attrs['title']??$attrs['label']??''];
            foreach($node['marks']??[] as $mark)if(($mark['type']??'')==='link')$candidates[]=[$mark['attrs']['href']??'', $node['text']??''];
            foreach($candidates as [$href,$title]){
                if(count($links)>=1000)break;
                $href=safe_url($href);if(!preg_match('~^https?://~i',$href))continue;
                $key=$page['id'].'|'.$href;if(isset($seen[$key]))continue;$seen[$key]=true;
                $links[]=['href'=>$href,'title'=>str_limit($title?:$href,300),'page_id'=>$page['id'],'page_title'=>$page['title'],'visibility'=>$page['visibility']];
            }
            foreach($node['content']??[] as $child)if(is_array($child))$walk($child);
        };
        $doc=json_decode($page['content'],true);if(is_array($doc))$walk($doc);if(count($links)>=1000)break;
    }
    return ['links'=>$links];
}

/** Saved web-video blocks from drafts and published pages, never remote metadata. */
function library_videos(): array {
    need_admin();
    session_write_close();
    $videos=[];$truncated=false;
    $rows=query('SELECT id,title,content,published,visibility FROM pages WHERE deleted_at IS NULL ORDER BY updated_at DESC,id DESC');
    while($page=$rows->fetch()){
        $walk=function(array $node)use(&$walk,&$videos,&$truncated,$page){
            if(($node['type']??'')==='webVideo'){
                $attrs=is_array($node['attrs']??null)?$node['attrs']:[];
                if($source=video_embed_source($attrs['url']??null)){
                    $key=hash('sha256',$source['kind'].'|'.$source['src']);
                    if(!isset($videos[$key])&&count($videos)>=1000)$truncated=true;
                    else{
                        if(!isset($videos[$key]))$videos[$key]=$source+['id'=>$key,'title'=>'','pages'=>[]];
                        $title=str_limit($attrs['title']??'',300);
                        if($videos[$key]['title']===''&&$title!=='')$videos[$key]['title']=$title;
                        $videos[$key]['pages'][$page['id']]=['id'=>$page['id'],'title'=>$page['title']];
                    }
                }
            }
            foreach($node['content']??[] as $child)if(is_array($child))$walk($child);
        };
        $draft=json_decode($page['content'],true);if(is_array($draft))$walk($draft);
        if($page['visibility']==='public'&&$page['published']){
            $snapshot=json_decode($page['published'],true);
            if(is_array($snapshot['content']??null))$walk($snapshot['content']);
        }
    }
    foreach($videos as &$video){
        $video['pages']=array_values($video['pages']);
        if($video['title']==='')$video['title']=$video['kind']==='media'
            ? str_limit(rawurldecode(basename(parse_url($video['url'],PHP_URL_PATH)??'')),300)
            : 'Vidéo '.$video['label'];
    }unset($video);
    return ['videos'=>array_values($videos),'truncated'=>$truncated];
}
