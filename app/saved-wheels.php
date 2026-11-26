<?php
declare(strict_types=1);

function wheel_record_id(mixed $id): string {
    if (!is_string($id) || !preg_match('/\A[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\z/', $id)) fail('Identifiant de roue ou de dossier invalide.');
    return $id;
}

function wheel_record(string $prefix, mixed $id): array {
    $key = $prefix.wheel_record_id($id);
    $raw = query('SELECT value FROM app_settings WHERE name=?', [$key])->fetchColumn();
    if ($raw === false) fail('Roue ou dossier introuvable.',404);
    return [$key, $raw, json_decode($raw,true,512,JSON_THROW_ON_ERROR)];
}

function wheel_record_update(string $key,string $raw,array $record): void {
    if (query('UPDATE app_settings SET value=? WHERE name=? AND value=?',[encoded($record),$key,$raw])->rowCount() !== 1) fail('Les réglages ont changé ailleurs. Rouvre cet élément avant de réessayer.',409,'conflict');
}

function wheel_workspace_records(): array {
    $folders=[];$wheels=[];
    foreach(query("SELECT name,value FROM app_settings WHERE name LIKE 'wheel-folder:%' OR name LIKE 'wheel-saved:%'")->fetchAll() as $row) {
        $record=json_decode($row['value'],true,512,JSON_THROW_ON_ERROR);
        if(str_starts_with($row['name'],'wheel-folder:')) $folders[]=$record;
        else $wheels[]=array_intersect_key($record,array_flip(['id','name','folder','database','updated_at','version']))+['lastDraw'=>$record['state']['history'][array_key_last($record['state']['history'])]['at']??null];
    }
    return ['folders'=>$folders,'wheels'=>$wheels];
}

function saved_wheel_entries(array $wheel): array {
    $linked=[];$warning=null;
    if($wheel['database']){
        try {
            [$linked]=wheel_database_entries([
                'id'=>$wheel['database'], 'property'=>$wheel['property'], 'source'=>$wheel['source'],
                'all'=>true
            ],true);
        }catch(AppError $e){
            // A removed source must not erase the wheel, its manual entries or its history.
            if(!in_array($e->status,[400,404],true))throw $e;
            $warning=$e->getMessage();
        }
    }
    $entries=$wheel['manual'];
    $overrides=(array)$wheel['overrides'];
    foreach($linked as $entry){
        $override=$overrides[$entry['id']]??[];
        $label=$override['label']??$entry['label'];
        if(empty($override['hidden'])&&$label!=='')$entries[]=['id'=>$entry['id'],'label'=>$label];
    }
    if(count($entries)>2000)$warning='Plus de 2 000 entrées dans cette roue. Masque des entrées ou sélectionne un formulaire.';
    return [$entries,$linked,$warning];
}

function saved_wheel_draw(string $action,array $in): never {
    [$key,$raw,$wheel]=wheel_record('wheel-saved:', $in['saved_id']);
    [$entries,,$warning]=saved_wheel_entries($wheel);
    $state=$wheel['state'];
    if($action!=='wheel_state'){
        if($action==='wheel_spin'&&$warning)fail('Répare la source de cette roue dans ses réglages avant de lancer un tirage.',409);
        $state=wheel_transition($action,$state,$entries,$in);
        $wheel['state']=$state;
        $wheel['updated_at']=now();
        wheel_record_update($key,$raw,$wheel);
    }
    json_out(['state'=>$state,'entries'=>wheel_eligible($entries,$state),'total'=>count($entries),'groups'=>[],'warning'=>$warning]);
}

function wheel_workspace_dispatch(string $action,string $method): void {
    if(!in_array($action,['wheel_workspace','wheel_details','wheel_columns','wheel_source_preview','wheel_save','wheel_delete','wheel_folder_save','wheel_folder_delete'],true))return;
    need_admin();
    $read=in_array($action,['wheel_workspace','wheel_details','wheel_columns','wheel_source_preview'],true);
    if($method!==($read?'GET':'POST'))fail('Méthode non autorisée.',405);
    if(!$read)csrf();
    if($action==='wheel_workspace')json_out(wheel_workspace_records());
    if($action==='wheel_columns'){
        $id=wheel_record_id($_GET['id']??null);
        database_record($id);
        json_out([
            'properties'=>array_values(array_filter(database_properties($id),fn($p)=>!in_array($p['type'],['files','formula','rollup','relation'],true))),
            'forms'=>query('SELECT id,name FROM collection_forms WHERE db_id=? ORDER BY created_at,id',[$id])->fetchAll()
        ]);
    }
    if($action==='wheel_source_preview'){
        [$entries]=wheel_database_entries(['id'=>wheel_record_id($_GET['id']??null),'property'=>$_GET['property']??'','source'=>$_GET['source']??'','all'=>true],true);
        json_out(['entries'=>$entries]);
    }
    if($action==='wheel_details'){
        [,,$wheel]=wheel_record('wheel-saved:',$_GET['id']??null);
        [,$linked,$warning]=saved_wheel_entries($wheel);
        json_out(['wheel'=>$wheel,'linked'=>$linked,'warning'=>$warning]);
    }

    $in=json_in();
    $folderAction=str_starts_with($action,'wheel_folder_');
    $prefix=$folderAction?'wheel-folder:':'wheel-saved:';
    $old=null;
    if(isset($in['id'])){
        [$key,$raw,$old]=wheel_record($prefix,$in['id']);
        if(($in['version']??null)!==$old['version'])fail('Cet élément a été modifié ailleurs. Rouvre-le.',409,'conflict');
    }
    if(str_ends_with($action,'_delete')){
        if(!$old)fail('Élément introuvable.',404);
        if($folderAction){
            foreach(wheel_workspace_records()['wheels'] as $wheel)if($wheel['folder']===$old['id'])fail('Déplace d’abord les roues de ce dossier.',409);
        }
        if(query('DELETE FROM app_settings WHERE name=? AND value=?',[$key,$raw])->rowCount()!==1)fail('Cet élément a changé ailleurs.',409,'conflict');
        json_out(['ok'=>true]);
    }
    $name=trim(str_limit($in['name']??'',120));
    if($name==='')fail('Indique un nom.');
    $record=['name'=>$name,'id'=>$old['id']??uuid(),'version'=>($old['version']??0)+1,'updated_at'=>now()];
    if(!$folderAction){
        $folder=$in['folder']??'';
        if($folder!=='')wheel_record('wheel-folder:',$folder);
        $database=$in['database']??'';$property='';$source='';
        if($database!==''){
            $database=wheel_record_id($database);
            $property=$in['property']??'';
            $source=$in['source']??'';
            wheel_database_entries(['id'=>$database,'property'=>$property,'source'=>$source,'all'=>true],true);
        }
        $manual=$in['manual']??[];$overrides=$in['overrides']??[];
        if(!is_array($manual)||!array_is_list($manual)||count($manual)>2000||!is_array($overrides)||count($overrides)>5000)fail('Liste d’entrées invalide.');
        $entries=[];
        foreach($manual as $entry){
            if(!is_array($entry)||!is_string($entry['label']??null))fail('Entrée manuelle invalide.');
            $id=wheel_record_id($entry['id']??null);
            if(isset($entries[$id]))fail('Deux entrées ont le même identifiant.');
            $label=trim(str_limit($entry['label'],240));
            if($label!=='')$entries[$id]=['id'=>$id,'label'=>$label];
        }
        $clean=[];
        if($database!=='')foreach($overrides as $id=>$override){
            wheel_record_id($id);
            if(!is_array($override)||!is_bool($override['hidden']??false)||isset($override['label'])&&!is_string($override['label']))fail('Personnalisation invalide.');
            $label=isset($override['label'])?trim(str_limit($override['label'],240)):null;
            if($label!==null||!empty($override['hidden']))$clean[$id]=['label'=>$label,'hidden'=>$override['hidden']??false];
        }
        $state=$old['state']??wheel_empty_state();
        // Serialize configuration changes with draws, even when a client left a wheel open.
        $state['revision']++;
        $record+=['folder'=>$folder,'database'=>$database,'property'=>$property,'source'=>$source,'manual'=>array_values($entries),'overrides'=>(object)$clean,'state'=>$state];
        [,,$warning]=saved_wheel_entries($record);
        if($warning)fail($warning);
    }
    if($old)wheel_record_update($key,$raw,$record);
    else query('INSERT INTO app_settings(name,value) VALUES (?,?)',[$prefix.$record['id'],encoded($record)]);
    json_out([$folderAction?'folder':'wheel'=>$record]);
}
