<?php
declare(strict_types=1);

/** Administrative decoration only; never grants public access to a file. */
function space_visual_defaults(): array { return ['icon_id'=>null,'cover_id'=>null,'cover_position'=>['x'=>50,'y'=>50]]; }
function space_visual(string $id): array {
    $raw=query('SELECT value FROM app_settings WHERE name=?',['space_visual_'.$id])->fetchColumn();
    $value=$raw?json_decode($raw,true):[];
    return array_replace(space_visual_defaults(),is_array($value)?$value:[]);
}
function space_visual_store(string $id,array $input): void {
    $out=space_visual($id);
    foreach(['icon_id','cover_id'] as $key)if(array_key_exists($key,$input)){
        $value=$input[$key];
        if($value===null||$value===''){$out[$key]=null;continue;}
        if(!is_string($value)||!preg_match('/^[a-f0-9-]{36}$/D',$value))fail('Référence d’image de carnet invalide.');
        $file=query('SELECT mime FROM files WHERE id=?',[$value])->fetch();
        if(!$file||!str_starts_with($file['mime'],'image/'))fail('Choisis une image existante pour le carnet.');
        $out[$key]=$value;
    }
    if(array_key_exists('cover_position',$input)){
        $position=$input['cover_position'];if(!is_array($position))fail('Position de couverture invalide.');
        foreach(['x','y'] as $key)if(isset($position[$key])&&(!is_numeric($position[$key])||!is_finite((float)$position[$key])))fail('Position de couverture invalide.');
        $out['cover_position']=cover_position(array_replace($out['cover_position'],$position));
    }
    query('DELETE FROM app_settings WHERE name=?',['space_visual_'.$id]);
    query('INSERT INTO app_settings (name,value) VALUES (?,?)',['space_visual_'.$id,encoded($out)]);
}
function decorate_spaces(array $spaces): array {
    $visuals=[];foreach(query("SELECT name,value FROM app_settings WHERE name LIKE 'space_visual_%'")->fetchAll() as $row){$value=json_decode($row['value'],true);if(is_array($value))$visuals[substr($row['name'],13)]=$value;}
    $ids=[];foreach($visuals as $value)foreach(['icon_id','cover_id'] as $key)if(!empty($value[$key]))$ids[]=$value[$key];$files=[];
    if($ids){$ids=array_values(array_unique($ids));foreach(query('SELECT id,attribution FROM files WHERE id IN ('.implode(',',array_fill(0,count($ids),'?')).')',$ids)->fetchAll() as $row)$files[$row['id']]=json_decode($row['attribution']??'null',true);}
    foreach($spaces as &$space){$space=array_replace($space,space_visual_defaults(),$visuals[$space['id']]??[]);$space['cover_attribution']=$files[$space['cover_id']??'']??null;$space['icon_attribution']=$files[$space['icon_id']??'']??null;}unset($space);return $spaces;
}
