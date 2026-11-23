<?php
declare(strict_types=1);
function wheel_group(mixed $value): mixed {
    if($value===null||$value===''||(is_array($value)&&!$value))return null;
    if(is_array($value)){sort($value,SORT_STRING);return $value;}return $value;
}
function wheel_label(mixed $value): string {return is_bool($value)?($value?'Oui':'Non'):(is_array($value)?implode(' · ',$value):(string)($value??''));}
function wheel_handle(string $action,array $in): never {
    $id=str_limit($in['id']??'',36);database_record($id);$props=array_column(database_properties($id),null,'id');
    $property=$in['property']??'';$groupBy=$in['groupBy']??'';$source=$in['source']??'';
    foreach([$property,$groupBy,$source] as $v)if(!is_string($v)||strlen($v)>36)fail('Paramètre de roue invalide.');
    if(!isset($props[$property])||in_array($props[$property]['type'],['files','formula','rollup','relation'],true))fail('Choisis une colonne de valeurs à tirer au sort.');
    if($groupBy&&(!isset($props[$groupBy])||in_array($props[$groupBy]['type'],['files','formula','rollup','relation'],true)))fail('Regroupement de roue invalide.');
    if(is_array($in['group']??null)&&!array_is_list($in['group']))fail('Groupe invalide.');$group=wheel_group($in['group']??null);if(!is_null($group)&&!is_string($group)&&!is_bool($group)&&!is_int($group)&&!is_float($group)&&!is_array($group))fail('Groupe invalide.');
    if(strlen(encoded($group))>4000)fail('Groupe trop long.');if(is_array($group))foreach($group as $g)if(!is_string($g))fail('Groupe invalide.');
    if(!is_bool($in['all']??null))fail('Choix de groupe invalide.');$all=$in['all'];$args=[$id];$where='db_id=?';
    if($source){if(!query('SELECT id FROM collection_forms WHERE id=? AND db_id=?',[$source,$id])->fetch())fail('Formulaire introuvable.',404);$where.=' AND source_form_id=?';$args[]=$source;}
    $rows=query('SELECT id,values_json FROM collection_rows WHERE '.$where.' ORDER BY created_at,id LIMIT 20001',$args)->fetchAll();if(count($rows)>20000)fail('Cette base est trop grande pour une roue : limite de 20 000 lignes.');
    $entries=[];$groups=[];
    foreach($rows as $row){$values=json_decode($row['values_json'],true)?:[];$g=$groupBy?wheel_group($values[$groupBy]??($props[$groupBy]['type']==='checkbox'?false:null)):null;
        $gkey=encoded($g);$groups[$gkey]=['key'=>$gkey,'value'=>$g,'label'=>$g===null?'Non renseigné':wheel_label($g)];
        if($groupBy&&!$all&&$g!==$group)continue;
        $value=$values[$property]??($props[$property]['type']==='checkbox'?false:null);$label=trim(wheel_label($value));if($label!=='')$entries[]=['id'=>$row['id'],'label'=>str_limit($label,240)];
    }
    if(count($entries)>2000)fail('Choisis un groupe plus petit : 2 000 valeurs maximum par roue.');
    $key='wheel:'.$id.':'.substr(hash('sha256',encoded([$property,$groupBy,$all,$group,$source])),0,20);
    $raw=query('SELECT value FROM app_settings WHERE name=?',[$key])->fetchColumn();$state=$raw?json_decode($raw,true):['revision'=>0,'history'=>[],'pending'=>null];$excludePrefix='wx:'.substr(hash('sha256',$key),0,24).':';$state['excluded']=array_column(query('SELECT value FROM app_settings WHERE name LIKE ?',[$excludePrefix.'%'])->fetchAll(),'value');
    if($action!=='wheel_state'){
        if(!is_int($in['revision']??null)||$in['revision']!==$state['revision'])fail('Cette roue a changé dans une autre fenêtre. Recharge-la avant de continuer.',409,'conflict');
        if($action==='wheel_spin'){
            if($state['pending'])fail('Choisis de garder ou retirer le dernier résultat avant de relancer.',409);
            $eligible=array_values(array_filter($entries,fn($e)=>!in_array($e['id'],$state['excluded'],true)));if(!$eligible)fail('Aucune valeur restante dans cette roue.');
            $picked=$eligible[random_int(0,count($eligible)-1)];$state['pending']=$picked+['drawId'=>uuid(),'at'=>now()];$state['history']=array_slice(array_merge($state['history'],[$state['pending']+['decision'=>'pending']]),-20);
        }elseif($action==='wheel_decide'){
            $decision=$in['decision']??'';if(!$state['pending']||!is_string($in['drawId']??null)||$state['pending']['drawId']!==$in['drawId']||!in_array($decision,['keep','remove'],true))fail('Résultat ou décision invalide.');
            if($decision==='remove')$state['excluded']=array_values(array_unique(array_merge($state['excluded'],[$state['pending']['id']])));
            foreach($state['history'] as &$h)if($h['drawId']===$state['pending']['drawId'])$h['decision']=$decision;unset($h);$state['pending']=null;
        }elseif($action==='wheel_reset'){$state['excluded']=[];$state['history']=[];$state['pending']=null;}
        $state['revision']++;$stored=$state;unset($stored['excluded']);$next=encoded($stored);$pdo=db();$pdo->beginTransaction();
        try{
            if($raw!==false){$q=query('UPDATE app_settings SET value=? WHERE name=? AND value=?',[$next,$key,$raw]);if($q->rowCount()!==1)fail('La roue a changé ailleurs.',409,'conflict');}
            else {try{query('INSERT INTO app_settings(name,value) VALUES (?,?)',[$key,$next]);}catch(PDOException){fail('La roue a changé ailleurs.',409,'conflict');}}
            if($action==='wheel_reset')query('DELETE FROM app_settings WHERE name LIKE ?',[$excludePrefix.'%']);
            if($action==='wheel_decide'&&($in['decision']??'')==='remove'){
                $last=$state['history'][array_key_last($state['history'])];query('INSERT INTO app_settings(name,value) VALUES (?,?)',[$excludePrefix.$last['id'],$last['id']]);
            }
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    }
    $eligible=array_values(array_filter($entries,fn($e)=>!in_array($e['id'],$state['excluded'],true)));$groups=array_values($groups);usort($groups,fn($a,$b)=>strnatcasecmp($a['label'],$b['label']));
    json_out(['state'=>$state,'entries'=>$eligible,'total'=>count($entries),'groups'=>$groups]);
}
