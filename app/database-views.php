<?php
declare(strict_types=1);

/** Presentation works on the already authorised bundle, never on hidden database rows. */
function database_view_value(array $row,array $property,array $bundle): mixed {
    $value=$row['derived'][$property['id']]??$row['values'][$property['id']]??null;
    if($property['type']==='relation'&&is_array($value))$value=array_map(fn($id)=>$bundle['relation_labels'][$id]??'Fiche liée',$value);
    if($property['type']==='files'&&is_array($value)){$files=array_column($bundle['files'],null,'id');$value=array_map(fn($id)=>$files[$id]['name']??'Fichier',$value);}
    return $value;
}
function database_view_text(mixed $value): string {
    if(is_array($value))return implode(', ',array_map('database_view_text',$value));
    if(is_bool($value))return $value?'true':'false';
    return is_scalar($value)?(string)$value:'';
}
function database_view_normalize(string $value): string {
    return strtr(mb_strtolower($value),['à'=>'a','á'=>'a','â'=>'a','ã'=>'a','ä'=>'a','å'=>'a','ç'=>'c','è'=>'e','é'=>'e','ê'=>'e','ë'=>'e','ì'=>'i','í'=>'i','î'=>'i','ï'=>'i','ñ'=>'n','ò'=>'o','ó'=>'o','ô'=>'o','õ'=>'o','ö'=>'o','ù'=>'u','ú'=>'u','û'=>'u','ü'=>'u','ý'=>'y','ÿ'=>'y']);
}
function database_view_rows(array $bundle,array $config): array {
    $props=array_column($bundle['properties'],null,'id');$rows=$bundle['rows'];
    foreach(array_slice(is_array($config['filters']??null)?$config['filters']:[],0,10) as $filter){
        if(!is_array($filter)||!isset($props[$filter['propertyId']??'']))continue;$property=$props[$filter['propertyId']];
        $rows=array_values(array_filter($rows,function($row)use($bundle,$property,$filter){
            $value=database_view_value($row,$property,$bundle);$text=database_view_normalize(database_view_text($value));$expected=database_view_normalize(database_view_text($filter['value']??''));$empty=$value===null||$value===''||$value===[];
            $same=is_array($value)&&$property['type']!=='relation'?in_array($expected,array_map(fn($v)=>database_view_normalize(database_view_text($v)),$value),true):$text===$expected;
            $numeric=in_array($property['type'],['number','formula','rollup'],true);$comparison=$numeric?(is_numeric($value)&&is_numeric($filter['value']??null)?((float)$value<=>(float)$filter['value']):null):strnatcasecmp($text,$expected);
            return match($filter['operator']??'contains'){
                'isEmpty'=>$empty,'isNotEmpty'=>!$empty,'equals'=>$same,'notEquals'=>!$same,
                'gt'=>!$empty&&$comparison!==null&&$comparison>0,'gte'=>!$empty&&$comparison!==null&&$comparison>=0,'lt'=>!$empty&&$comparison!==null&&$comparison<0,'lte'=>!$empty&&$comparison!==null&&$comparison<=0,
                default=>str_contains($text,$expected)};
        }));
    }
    $sort=$config['sort']??null;
    if(is_array($sort)&&isset($props[$sort['propertyId']??''])){
        $property=$props[$sort['propertyId']];$direction=($sort['direction']??'asc')==='desc'?-1:1;
        usort($rows,function($a,$b)use($bundle,$property,$direction){$x=database_view_value($a,$property,$bundle);$y=database_view_value($b,$property,$bundle);$xe=$x===null||$x===''||$x===[];$ye=$y===null||$y===''||$y===[];if($xe||$ye)return $xe===$ye?0:($xe?1:-1);$cmp=is_numeric($x)&&is_numeric($y)?((float)$x<=>(float)$y):strnatcasecmp(database_view_normalize(database_view_text($x)),database_view_normalize(database_view_text($y)));return $direction*$cmp;});
    }
    return $rows;
}
