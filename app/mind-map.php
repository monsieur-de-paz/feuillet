<?php
declare(strict_types=1);
function validate_mind_map(mixed $value): array {
    if(!is_array($value)||!is_array($value['nodes']??null)||count($value['nodes'])>300)fail('Une carte doit contenir de 0 à 300 idées.');
    $nodes=[];$ids=[];
    foreach($value['nodes'] as $n){
        if(!is_array($n)||!is_string($n['id']??null)||!preg_match('/^[a-zA-Z0-9-]{1,64}$/D',$n['id'])||isset($ids[$n['id']]))fail('Identifiant de bulle invalide.');$ids[$n['id']]=true;
        $node=['id'=>$n['id'],'parent'=>str_limit($n['parent']??'',64),'text'=>str_limit($n['text']??'Idée',1500),'note'=>str_limit($n['note']??'',1500),'content'=>str_limit($n['content']??'',20000)];
        if(isset($n['childrenSide'])&&!in_array($n['childrenSide'],['auto','above','below'],true))fail('Placement des sous-idées invalide.');
        $node['childrenSide']=$n['childrenSide']??'auto';$node['row']=!empty($n['row']);
        $node['outline']=in_array($n['outline']??'',['auto','underline','box'],true)?$n['outline']:'auto';
        $media=$n['media']??[];if(!is_array($media)||count($media)>30)fail('30 contenus maximum par idée.');$node['media']=[];
        foreach($media as $item){if(!is_array($item))fail('Contenu de carte invalide.');$kind=$item['kind']??'';$entry=['kind'=>$kind,'title'=>str_limit($item['title']??'Contenu',300)];
            if($kind==='file'){$id=str_limit($item['fileId']??'',36);$file=query('SELECT id,name,mime FROM files WHERE id=?',[$id])->fetch();if(!$file)fail('Fichier de carte introuvable.');$entry['fileId']=$id;$entry['mime']=$file['mime'];}
            elseif($kind==='link'){$url=safe_url($item['url']??'');if(!preg_match('~^https?://~i',$url))fail('Lien de carte invalide.');$entry['url']=$url;}
            elseif($kind==='video'){$video=video_embed_source($item['url']??null);if(!$video)fail('Vidéo de carte non reconnue.');$entry['url']=$video['url'];$entry['src']=$video['src'];$entry['player']=$video['kind']==='player';}
            elseif($kind==='form'){$token=$item['token']??'';if(!is_string($token)||!preg_match('/^[a-f0-9]{40}$/D',$token))fail('Formulaire de carte invalide.');$entry['token']=$token;}
            else fail('Type de contenu de carte invalide.');$node['media'][]=$entry;
        }
        foreach(['x','y'] as $key){$v=$n[$key]??0;if(!is_numeric($v)||!is_finite((float)$v))fail('Position de bulle invalide.');$node[$key]=max(-100000,min(100000,(float)$v));}
        foreach(['fill'=>'#E4EEE8','ink'=>'#243A36','line'=>'#73988B'] as $key=>$default)$node[$key]=css_color($n[$key]??'')?:$default;
        $node['bold']=!empty($n['bold']);$node['italic']=!empty($n['italic']);$node['size']=max(12,min(28,(int)($n['size']??16)));$url=safe_url($n['url']??'');$node['url']=preg_match('~^https?://~i',$url)?$url:'';$nodes[]=$node;
    }
    $parents=array_column($nodes,'parent','id');foreach($nodes as $n){if($n['parent']!==''&&!isset($ids[$n['parent']]))fail('Branche parente absente.');$seen=[];$id=$n['id'];while($id!==''){if(isset($seen[$id]))fail('Une carte ne peut pas contenir de boucle dans ses branches.');$seen[$id]=true;$id=$parents[$id]??'';}}
    $links=$value['links']??[];if(!is_array($links)||count($links)>600)fail('Trop de liens transversaux.');$clean=[];foreach($links as $l){if(!is_array($l)||!isset($ids[$l['from']??''],$ids[$l['to']??'']))fail('Lien de carte invalide.');$clean[]=['from'=>$l['from'],'to'=>$l['to'],'color'=>css_color($l['color']??'')?:'#73988B'];}
    $views=[];$rawViews=$value['views']??[];if(!is_array($rawViews))fail('Dispositions de carte invalides.');
    foreach(['radial','tree','org','flow','bilateral','orbit'] as $layout){if(!isset($rawViews[$layout]))continue;if(!is_array($rawViews[$layout])||count($rawViews[$layout])>300)fail('Disposition trop volumineuse.');$positions=[];foreach($rawViews[$layout] as $id=>$p){if(!isset($ids[$id]))continue;if(!is_array($p)||!is_numeric($p['x']??null)||!is_numeric($p['y']??null)||!is_finite((float)$p['x'])||!is_finite((float)$p['y']))fail('Position mémorisée invalide.');$positions[$id]=['x'=>max(-100000,min(100000,(float)$p['x'])),'y'=>max(-100000,min(100000,(float)$p['y']))];}$views[$layout]=(object)$positions;}
    if(isset($value['styleLayouts'])&&!is_array($value['styleLayouts']))fail('Styles mémorisés invalides.');
    $styleLayouts=[];foreach(['cards','branches','organic','classic'] as $theme){$layout=$value['styleLayouts'][$theme]??null;if(is_string($layout)&&in_array($layout,['radial','tree','org','flow','bilateral','orbit'],true))$styleLayouts[$theme]=$layout;}
    if(isset($value['scenes'])&&(!is_array($value['scenes'])||count($value['scenes'])>24))fail('Vues de carte invalides.');
    $scenes=[];foreach(($value['scenes']??[]) as $key=>$scene){if(!is_string($key)||!preg_match('/^(cards|branches|organic|classic):(radial|tree|org|flow|bilateral|orbit)$/D',$key)||!is_array($scene))fail('Vue de carte invalide.');$positions=[];if(!is_array($scene['positions']??null)||count($scene['positions'])>300)fail('Vue de carte trop volumineuse.');foreach($scene['positions'] as $id=>$point){if(!isset($ids[$id]))continue;if(!is_array($point)||!is_numeric($point['x']??null)||!is_numeric($point['y']??null)||!is_finite((float)$point['x'])||!is_finite((float)$point['y']))fail('Position de vue invalide.');$positions[$id]=['x'=>max(-100000,min(100000,(float)$point['x'])),'y'=>max(-100000,min(100000,(float)$point['y']))];}$signature=$scene['signature']??'';if(!is_string($signature)||!preg_match('/^[a-f0-9]{1,8}$/D',$signature))fail('Signature de vue invalide.');$scenes[$key]=['signature'=>$signature,'positions'=>(object)$positions];}
    return ['centerId'=>is_string($value['centerId']??null)&&isset($ids[$value['centerId']])?$value['centerId']:'','scenes'=>(object)$scenes,'title'=>str_limit($value['title']??'Carte mentale',200),'display'=>in_array($value['display']??'',['button','preview','page'],true)?$value['display']:'preview','layout'=>in_array($value['layout']??'',['radial','tree','org','flow','bilateral','orbit'],true)?$value['layout']:'radial','styleLayouts'=>(object)$styleLayouts,'theme'=>in_array($value['theme']??'',['cards','branches','organic','classic'],true)?$value['theme']:'cards','nodes'=>$nodes,'links'=>$clean,'views'=>(object)$views];
}
