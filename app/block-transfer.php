<?php
declare(strict_types=1);
/** Content-only, two-page transaction. Versions prevent overwriting another tab. */
function block_transfer_paths(array $paths): array {
    if(!$paths||count($paths)>500)fail('Sélection de blocs invalide.');
    foreach($paths as $path){if(!is_array($path)||!$path||count($path)>32)fail('Sélection de blocs invalide.');foreach($path as $index)if(!is_int($index)||$index<0)fail('Sélection de blocs invalide.');}
    usort($paths,function($a,$b){for($i=0;$i<min(count($a),count($b));$i++)if($a[$i]!==$b[$i])return $a[$i]<=>$b[$i];return count($a)<=>count($b);});
    $roots=[];foreach($paths as $p){$covered=false;foreach($roots as $root)if(array_slice($p,0,count($root))===$root){$covered=true;break;}if(!$covered)$roots[]=$p;}return $roots;
}
function block_transfer_take(array &$doc,array $path): array {
    $index=array_shift($path);if(!isset($doc['content'][$index]))fail('Ce bloc n’existe plus.',409,'conflict');
    if($path){$node=block_transfer_take($doc['content'][$index],$path);}else{
        $node=$doc['content'][$index];
        if(in_array($node['type']??'', ['text','hardBreak','column','tableRow','tableCell','tableHeader','listItem','taskItem'],true)||(($doc['type']??'')==='toggleHeading'&&$index===0))fail('Déplace le bloc complet depuis sa poignée.');
        array_splice($doc['content'],$index,1);
    }
    if(empty($doc['content']))$doc['content']=[['type'=>'paragraph']];
    if(($doc['type']??'')==='toggleHeading'&&count($doc['content'])===1)$doc['content'][]=['type'=>'paragraph'];
    return $node;
}
function blocks_transfer(array $in,bool $restore=false): array {
    $source=str_limit($in['source_id']??'',36);$target=str_limit($in['target_id']??'',36);if(!$source||!$target||$source===$target)fail('Choisis une autre page.');
    $pdo=db();$pdo->beginTransaction();try{
        $ids=[$source,$target];sort($ids);$rows=[];
        foreach($ids as $id){$row=query('SELECT * FROM pages WHERE id=?'.($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':''),[$id])->fetch();if(!$row||$row['deleted_at'])fail('Page introuvable.',404);$rows[$id]=$row;}
        foreach(['source'=>$source,'target'=>$target] as $name=>$id)if(!is_int($in[$name.'_version']??null)||$in[$name.'_version']!==(int)$rows[$id]['version'])fail('Une des pages a changé. Recharge-la avant de déplacer les blocs.',409,'conflict');
        $beforeSource=json_decode($rows[$source]['content'],true);$beforeTarget=json_decode($rows[$target]['content'],true);
        if($restore){$sourceDoc=normalize_doc($in['source_content']??[]);$targetDoc=normalize_doc($in['target_content']??[]);$count=0;}
        else{
            $paths=block_transfer_paths(is_array($in['paths']??null)?$in['paths']:[]);$sourceDoc=$beforeSource;$nodes=[];
            foreach(array_reverse($paths) as $path)array_unshift($nodes,block_transfer_take($sourceDoc,$path));
            $containsSelf=function(array $node)use(&$containsSelf,$target){if(($node['type']??'')==='pageLink'&&($node['attrs']['pageId']??'')===$target)return true;foreach($node['content']??[] as $c)if($containsSelf($c))return true;return false;};foreach($nodes as $node)if($containsSelf($node))fail('Une sous-page ne peut pas être déplacée dans elle-même.');
            $targetDoc=$beforeTarget;$last=count($targetDoc['content']??[])-1;
            if($last>=0&&($targetDoc['content'][$last]['type']??'')==='paragraph'&&empty($targetDoc['content'][$last]['content']))array_splice($targetDoc['content'],$last,0,$nodes);else $targetDoc['content']=array_merge($targetDoc['content']??[],$nodes);
            $sourceDoc=normalize_doc($sourceDoc);$targetDoc=normalize_doc($targetDoc);$count=count($nodes);
        }
        foreach([$source=>$sourceDoc,$target=>$targetDoc] as $id=>$doc){$q=query('UPDATE pages SET content=?,version=version+1,updated_at=? WHERE id=? AND version=?',[encoded($doc),now(),$id,(int)$rows[$id]['version']]);if($q->rowCount()!==1)fail('Conflit de modification.',409,'conflict');auto_publish_page($id);revision_save(row_page(query('SELECT * FROM pages WHERE id=?',[$id])->fetch()));}
        $pdo->commit();return ['source'=>get_page($source),'target'=>get_page($target),'count'=>$count,'undo'=>['source_id'=>$source,'target_id'=>$target,'source_version'=>(int)$rows[$source]['version']+1,'target_version'=>(int)$rows[$target]['version']+1,'source_content'=>$beforeSource,'target_content'=>$beforeTarget]];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
