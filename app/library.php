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
