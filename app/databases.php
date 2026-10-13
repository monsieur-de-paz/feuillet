<?php
declare(strict_types=1);
require_once __DIR__.'/formulas.php';

function databases_schema(PDO $pdo): void {
    try{if($pdo->query("SELECT value FROM app_settings WHERE name='database_schema_version'")->fetchColumn()==='2')return;}catch(PDOException){}
    $mysql=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql';$text=$mysql?'LONGTEXT':'TEXT';$suffix=$mysql?' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci':'';
    $pdo->exec("CREATE TABLE IF NOT EXISTS collections (id VARCHAR(36) PRIMARY KEY,name VARCHAR(160) NOT NULL,visibility VARCHAR(16) NOT NULL DEFAULT 'private',version INTEGER NOT NULL DEFAULT 1,created_at VARCHAR(32) NOT NULL,updated_at VARCHAR(32) NOT NULL)$suffix");
    $pdo->exec("CREATE TABLE IF NOT EXISTS collection_properties (id VARCHAR(36) PRIMARY KEY,db_id VARCHAR(36) NOT NULL,name VARCHAR(160) NOT NULL,type VARCHAR(24) NOT NULL,config $text NOT NULL,is_required INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1)$suffix");
    $pdo->exec("CREATE TABLE IF NOT EXISTS collection_rows (id VARCHAR(36) PRIMARY KEY,db_id VARCHAR(36) NOT NULL,values_json $text NOT NULL,source_form_id VARCHAR(36) NULL,visibility VARCHAR(16) NOT NULL DEFAULT 'private',version INTEGER NOT NULL DEFAULT 1,created_at VARCHAR(32) NOT NULL,updated_at VARCHAR(32) NOT NULL)$suffix");
    $pdo->exec("CREATE TABLE IF NOT EXISTS collection_forms (id VARCHAR(36) PRIMARY KEY,db_id VARCHAR(36) NOT NULL,name VARCHAR(160) NOT NULL,fields $text NOT NULL,is_public INTEGER NOT NULL DEFAULT 0,token VARCHAR(64) NOT NULL UNIQUE,version INTEGER NOT NULL DEFAULT 1,created_at VARCHAR(32) NOT NULL)$suffix");
    $pdo->exec("CREATE TABLE IF NOT EXISTS form_uploads (file_id VARCHAR(36) PRIMARY KEY,form_id VARCHAR(36) NOT NULL,owner VARCHAR(64) NOT NULL,used_row_id VARCHAR(36) NULL,created_at VARCHAR(32) NOT NULL)$suffix");
    $columns=$mysql?array_column($pdo->query('SHOW COLUMNS FROM collection_rows')->fetchAll(PDO::FETCH_ASSOC),'Field'):array_column($pdo->query('PRAGMA table_info(collection_rows)')->fetchAll(PDO::FETCH_ASSOC),'name');if(!in_array('source_form_id',$columns,true))$pdo->exec('ALTER TABLE collection_rows ADD COLUMN source_form_id VARCHAR(36) NULL');
    foreach(['idx_collection_properties_db'=>['collection_properties','db_id'],'idx_collection_rows_db'=>['collection_rows','db_id,created_at'],'idx_collection_forms_db'=>['collection_forms','db_id'],'idx_form_uploads_owner'=>['form_uploads','form_id,owner']] as $name=>[$table,$fields]){
        if($mysql){$q=$pdo->prepare("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=?");$q->execute([$table,$name]);if(!$q->fetchColumn())$pdo->exec("CREATE INDEX $name ON $table ($fields)");}else $pdo->exec("CREATE INDEX IF NOT EXISTS $name ON $table ($fields)");
    }
    $pdo->exec($mysql?"INSERT INTO app_settings (name,value) VALUES ('database_schema_version','2') ON DUPLICATE KEY UPDATE value='2'":"INSERT INTO app_settings (name,value) VALUES ('database_schema_version','2') ON CONFLICT(name) DO UPDATE SET value='2'");
}
function database_record(string $id): array { $r=query('SELECT * FROM collections WHERE id=?',[$id])->fetch();if(!$r)fail('Base introuvable.',404);$r['version']=(int)$r['version'];return $r; }
function database_properties(string $id): array { $rows=query('SELECT * FROM collection_properties WHERE db_id=? ORDER BY sort_order,id',[$id])->fetchAll();foreach($rows as &$p){$p['config']=json_decode($p['config'],true)?:[];$p['required']=(bool)$p['is_required'];unset($p['is_required']);$p['sort_order']=(int)$p['sort_order'];$p['version']=(int)$p['version'];}unset($p);return $rows; }
function database_rows_raw(string $id,bool $public=false): array { $where=$public?" AND visibility='public' AND source_form_id IS NULL":'';$rows=query('SELECT * FROM collection_rows WHERE db_id=?'.$where.' ORDER BY created_at,id LIMIT 5000',[$id])->fetchAll();foreach($rows as &$r){$r['values']=json_decode($r['values_json'],true)?:[];unset($r['values_json']);$r['version']=(int)$r['version'];$r['from_form']=!empty($r['source_form_id']);}unset($r);return $rows; }
function database_form_row(array $f): array { $f['fields']=json_decode($f['fields'],true)?:[];$f['public']=(bool)$f['is_public'];unset($f['is_public']);$f['version']=(int)$f['version'];return $f; }
function database_node_reference(string $type,string $id): bool {
    $all=page_rows();$walk=function(array $n)use(&$walk,$type,$id):bool{if(($n['type']??'')===$type&&in_array($id,[$n['attrs']['dbId']??null,$n['attrs']['databaseId']??null,$n['attrs']['formId']??null],true))return true;foreach($n['content']??[] as $child)if($walk($child))return true;return false;};
    foreach($all as $p)if(!$p['deleted_at']&&$p['visibility']==='public'&&$p['published']&&ancestors_active($p,$all)){$snapshot=json_decode($p['published'],true);if($walk($snapshot['content']??[]))return true;}return false;
}
function database_public(string $id): bool { $r=query('SELECT visibility FROM collections WHERE id=?',[$id])->fetch();return $r&&$r['visibility']==='public'&&database_node_reference('databaseView',$id); }
function database_property_config(string $type,mixed $config): array {
    if(!is_array($config))fail('Options de propriété invalides.');$out=[];
    if(in_array($type,['select','multiselect'],true)){$options=$config['options']??[];if(!is_array($options)||count($options)>100)fail('100 choix maximum.');$out['options']=array_values(array_unique(array_filter(array_map(fn($s)=>str_limit($s,120),$options))));}
    if($type==='relation'){$target=str_limit($config['target_db_id']??'',36);database_record($target);$out['target_db_id']=$target;}
    if($type==='formula'){$expression=str_limit($config['expression']??'',4096);if(!$expression)fail('Écris une formule.');try{(new FeuilletFormula($expression))->parse();}catch(Throwable $e){fail($e->getMessage());}$out['expression']=$expression;}
    if($type==='rollup'){$out=['relation_property_id'=>str_limit($config['relation_property_id']??'',36),'target_property_id'=>str_limit($config['target_property_id']??'',36),'operation'=>$config['operation']??'count'];if(!in_array($out['operation'],['sum','count','avg','min','max'],true))fail('Agrégation inconnue.');}
    return $out;
}
function database_value(array $p,mixed $value,bool $required=true): mixed {
    $empty=$value===null||$value===''||$value===[];
    if($empty){if($required&&$p['required']&&$p['type']==='checkbox')fail('Case obligatoire : '.$p['name']);if($required&&$p['required']&&!in_array($p['type'],['formula','rollup','checkbox'],true))fail('Champ obligatoire : '.$p['name']);return $p['type']==='checkbox'?false:(in_array($p['type'],['files','relation','multiselect'],true)?[]:null);}
    $type=$p['type'];$name=$p['name'];
    if(in_array($type,['text','title','email','phone','url','date','select'],true)){
        if(!is_string($value)||mb_strlen($value)>10000)fail('Texte invalide : '.$name);$value=trim($value);if($value===''&&$required&&$p['required'])fail('Champ obligatoire : '.$name);
        if($type==='email'&&!filter_var($value,FILTER_VALIDATE_EMAIL))fail('Adresse e-mail invalide : '.$name);
        if($type==='url'&&(!filter_var($value,FILTER_VALIDATE_URL)||!preg_match('~^https?://~i',$value)))fail('Adresse web invalide : '.$name);
        if($type==='phone'&&(!preg_match('/^\+?[0-9][0-9 .()\-]{5,30}[0-9]$/D',$value)||strlen(preg_replace('/\D/','',$value))<7||strlen(preg_replace('/\D/','',$value))>15))fail('Téléphone invalide : '.$name);
        if($type==='date'){if(!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value))fail('Date invalide : '.$name);[$y,$m,$d]=array_map('intval',explode('-',$value));if(!checkdate($m,$d,$y))fail('Date invalide : '.$name);}
        if($type==='select'&&!in_array($value,$p['config']['options']??[],true))fail('Choix inconnu : '.$name);return $value;
    }
    if($type==='number'){if((!is_int($value)&&!is_float($value))||!is_finite((float)$value)||abs((float)$value)>1e15)fail('Nombre invalide : '.$name);return $value;}
    if($type==='checkbox'){if(!is_bool($value))fail('Case à cocher invalide : '.$name);if($required&&$p['required']&&!$value)fail('Case obligatoire : '.$name);return $value;}
    if(in_array($type,['multiselect','files','relation'],true)){
        if(!is_array($value)||!array_is_list($value)||count($value)>200)fail('Liste invalide : '.$name);foreach($value as $v)if(!is_string($v))fail('Valeur invalide : '.$name);$value=array_values(array_unique($value));
        foreach($value as $v){if(!is_string($v))fail('Valeur invalide : '.$name);if($type==='multiselect'&&!in_array($v,$p['config']['options']??[],true))fail('Choix inconnu : '.$name);if($type==='files'&&!query('SELECT id FROM files WHERE id=?',[$v])->fetch())fail('Fichier introuvable : '.$name);if($type==='relation'&&!query('SELECT id FROM collection_rows WHERE id=? AND db_id=?',[$v,$p['config']['target_db_id']])->fetch())fail('Relation introuvable : '.$name);}
        return $value;
    }
    if(in_array($type,['formula','rollup'],true))return null;fail('Type de propriété inconnu.');
}
function database_values(array $properties,mixed $input,bool $required=true): array {
    if(!is_array($input))fail('Valeurs de ligne invalides.');$ids=array_column($properties,'id');foreach(array_keys($input) as $id)if(!in_array($id,$ids,true))fail('Propriété inconnue.');$values=[];
    foreach($properties as $p)if(!in_array($p['type'],['formula','rollup'],true))$values[$p['id']]=database_value($p,$input[$p['id']]??null,$required);return $values;
}
function database_compute_rows(string $id,bool $public=false): array {
    $cache=[];$memo=[];$active=[];$operations=0;
    $load=function(string $db)use(&$cache,$public):array{if(!isset($cache[$db])){$visible=!$public||database_public($db);$props=$visible?database_properties($db):[];$rows=$visible?database_rows_raw($db,$public):[];$cache[$db]=['props'=>array_column($props,null,'id'),'names'=>array_column($props,'id','name'),'rows'=>array_column($rows,null,'id')];}return $cache[$db];};
    $resolve=function(string $db,string $rowId,string $propertyId,int $depth=0)use(&$resolve,&$load,&$memo,&$active,&$operations,$public):mixed{
        if($depth>32)throw new RuntimeException('Calcul trop complexe.');$key=$db.'|'.$rowId.'|'.$propertyId;if(array_key_exists($key,$memo))return $memo[$key];if(isset($active[$key]))throw new RuntimeException('Dépendance circulaire.');$bundle=$load($db);$p=$bundle['props'][$propertyId]??null;$row=$bundle['rows'][$rowId]??null;if(!$p||!$row)return null;if(in_array($p['type'],['formula','rollup'],true)&&++$operations>100000)throw new RuntimeException('Calcul trop complexe.');$active[$key]=true;
        try{
            if($p['type']==='formula'){$value=(new FeuilletFormula($p['config']['expression']))->evaluate(function($name)use($bundle,$db,$rowId,$depth,&$resolve){$id=$bundle['names'][$name]??null;if(!$id)throw new RuntimeException('Propriété inconnue : '.$name);return $resolve($db,$rowId,$id,$depth+1);});}
            elseif($p['type']==='rollup'){
                $relation=$bundle['props'][$p['config']['relation_property_id']]??null;if(!$relation||$relation['type']!=='relation')throw new RuntimeException('Choisis une propriété Relation.');$target=$relation['config']['target_db_id'];$related=$resolve($db,$rowId,$relation['id'],$depth+1);$targetBundle=$load($target);$values=[];
                foreach(is_array($related)?$related:[] as $targetRow)if(isset($targetBundle['rows'][$targetRow]))$values[]=$resolve($target,$targetRow,$p['config']['target_property_id'],$depth+1);
                $operation=$p['config']['operation'];if($operation==='count')$value=count($values);else{$numbers=array_values(array_filter($values,fn($v)=>$v!==null));foreach($numbers as $n)if(!is_int($n)&&!is_float($n))throw new RuntimeException('Agrégation numérique sur un champ non numérique.');$value=$numbers?match($operation){'sum'=>array_sum($numbers),'avg'=>array_sum($numbers)/count($numbers),'min'=>min($numbers),'max'=>max($numbers)}:($operation==='sum'?0:null);}
            }else{$value=$row['values'][$p['id']]??null;if($public&&$p['type']==='relation'){$target=$load($p['config']['target_db_id']);$value=array_values(array_filter(is_array($value)?$value:[],fn($related)=>isset($target['rows'][$related])));}}
            $memo[$key]=$value;return $value;
        }finally{unset($active[$key]);}
    };
    $bundle=$load($id);$result=[];foreach($bundle['rows'] as $r){$r['derived']=[];$r['errors']=[];foreach($bundle['props'] as $p)try{$v=$resolve($id,$r['id'],$p['id']);if(in_array($p['type'],['formula','rollup'],true))$r['derived'][$p['id']]=$v;else $r['values'][$p['id']]=$v;}catch(Throwable $e){$r['derived'][$p['id']]=null;$r['errors'][$p['id']]=$e->getMessage();}$result[]=$r;}return $result;
}
function database_bundle(string $id,bool $public=false): array {
    $database=database_record($id);if($public&&!database_public($id))fail('Base introuvable.',404);$properties=database_properties($id);$rows=database_compute_rows($id,$public);if($public)foreach($rows as &$r){foreach($r['errors'] as $key=>$message)$r['errors'][$key]='Calcul indisponible';}unset($r);$files=[];
    foreach($properties as &$p){if($public&&in_array($p['type'],['formula','rollup','relation'],true))$p['config']=[];if($p['type']==='files')foreach($rows as $r)foreach($r['values'][$p['id']]??[] as $fileId){$f=query('SELECT * FROM files WHERE id=?',[$fileId])->fetch();if($f)$files[$fileId]=file_info($f);}}unset($p);
    $relationLabels=[];$labelRows=[];$labelProps=[];
    foreach($properties as $property)if($property['type']==='relation')foreach($rows as $row)foreach($row['values'][$property['id']]??[] as $relatedId){
        if(array_key_exists($relatedId,$relationLabels))continue;$related=$labelRows[$relatedId]??query('SELECT * FROM collection_rows WHERE id=?',[$relatedId])->fetch();$labelRows[$relatedId]=$related;if(!$related||($public&&($related['visibility']!=='public'||!empty($related['source_form_id'])||!database_public($related['db_id']))))continue;
        $targetProps=$labelProps[$related['db_id']]??database_properties($related['db_id']);$labelProps[$related['db_id']]=$targetProps;$values=json_decode($related['values_json'],true);$label='Fiche';foreach($targetProps as $targetProperty)if($targetProperty['type']==='title'){$label=str_limit($values[$targetProperty['id']]??'',160)?:'Sans titre';break;}$relationLabels[$relatedId]=$label;
    }
    return ['database'=>$database,'properties'=>$properties,'rows'=>$rows,'files'=>array_values($files),'relation_labels'=>$relationLabels,'forms'=>$public?[]:array_map('database_form_row',query('SELECT * FROM collection_forms WHERE db_id=? ORDER BY created_at',[$id])->fetchAll())];
}
function database_file_public(string $fileId): bool {
    foreach(query("SELECT id FROM collections WHERE visibility='public'")->fetchAll() as $db){if(!database_public($db['id']))continue;$properties=array_filter(database_properties($db['id']),fn($p)=>$p['type']==='files');foreach(database_rows_raw($db['id'],true) as $r)foreach($properties as $p)if(in_array($fileId,$r['values'][$p['id']]??[],true))return true;}return false;
}
function database_reconcile_forms(string $dbId): void {
    $allowed=array_column(array_filter(database_properties($dbId),fn($p)=>!in_array($p['type'],['relation','formula','rollup'],true)),'id');
    foreach(query('SELECT id,fields,is_public FROM collection_forms WHERE db_id=?',[$dbId])->fetchAll() as $form){$old=json_decode($form['fields'],true);$fields=array_values(array_intersect($old,$allowed));if($fields!==$old||(!$fields&&$form['is_public']))query('UPDATE collection_forms SET fields=?,is_public=?,version=version+1 WHERE id=?',[encoded($fields),$fields?(int)$form['is_public']:0,$form['id']]);}
}
function database_row_save(array $in,?array $allowed=null,bool $submission=false): array {
    $dbId=str_limit($in['db_id']??'',36);database_record($dbId);$old=!empty($in['id'])?query('SELECT * FROM collection_rows WHERE id=? AND db_id=?',[str_limit($in['id'],36),$dbId])->fetch():null;if(!empty($in['id'])&&!$old)fail('Ligne introuvable.',404);
    if($old&&(int)($in['version']??-1)!==(int)$old['version'])fail('Cette ligne a été modifiée. Recharge-la.',409,'conflict');$props=database_properties($dbId);if($allowed!==null)$props=array_values(array_filter($props,fn($p)=>in_array($p['id'],$allowed,true)));$values=database_values($props,$in['values']??[]);$visibility=$submission?'private':($in['visibility']??($old['visibility']??'public'));if(!in_array($visibility,['public','private'],true))fail('Visibilité de ligne invalide.');$id=$old['id']??uuid();$source=$old['source_form_id']??($submission?($in['source_form_id']??null):null);if($source&&$visibility!=='private')fail('Les réponses aux formulaires restent privées.');if(!$old&&(int)query('SELECT COUNT(*) FROM collection_rows WHERE db_id=?',[$dbId])->fetchColumn()>=5000)fail('5000 lignes maximum par base.',413);
    if($old){$q=query('UPDATE collection_rows SET values_json=?,visibility=?,version=version+1,updated_at=? WHERE id=? AND version=?',[encoded($values),$visibility,now(),$id,$old['version']]);if($q->rowCount()!==1)fail('Conflit de modification.',409,'conflict');}
    else query('INSERT INTO collection_rows (id,db_id,values_json,source_form_id,visibility,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',[$id,$dbId,encoded($values),$source,$visibility,1,now(),now()]);
    if($submission)return ['id'=>$id];
    foreach(database_compute_rows($dbId) as $row)if($row['id']===$id)return $row;fail('Ligne introuvable.',500);
}
function database_form_get(string $value,bool $token=false): array {
    $row=query('SELECT * FROM collection_forms WHERE '.($token?'token':'id').'=?',[$value])->fetch();if(!$row)fail('Formulaire introuvable.',404);$form=database_form_row($row);
    if(!admin()&&(!$form['public']||(!$token&&!database_node_reference('formView',$form['id']))))fail('Formulaire introuvable.',404);
    $props=array_values(array_filter(database_properties($form['db_id']),fn($p)=>in_array($p['id'],$form['fields'],true)&&!in_array($p['type'],['relation','formula','rollup'],true)));
    if(!admin()){unset($form['db_id'],$form['version']);foreach($props as &$p)unset($p['db_id'],$p['version']);unset($p);}return ['form'=>$form,'properties'=>$props];
}
function form_upload_owner(): string { start_session();return hash_hmac('sha256',session_id(),cfg()['secret']); }
function form_owned_file(string $id): bool { $owner=form_upload_owner();return (bool)query('SELECT file_id FROM form_uploads WHERE file_id=? AND owner=?',[$id,$owner])->fetch(); }
function database_dispatch(string $action,string $method): void {
    $actions=['db_list','db_get','db_save','db_delete','property_save','property_delete','row_save','row_patch','row_delete','form_save','form_get','form_submit','form_upload','db_export','public_db_get','formula_preview'];if(!in_array($action,$actions,true))return;
    $mutations=['db_save','db_delete','property_save','property_delete','row_save','row_patch','row_delete','form_save','form_submit','form_upload','formula_preview'];$expected=in_array($action,$mutations,true)?'POST':'GET';if($method!==$expected)fail('Méthode non autorisée.',405);if($expected==='POST')csrf();
    if($action==='form_get')json_out(database_form_get(str_limit($_GET['token']??$_GET['id']??'',64),isset($_GET['token'])));
    if($action==='public_db_get')json_out(database_bundle(str_limit($_GET['id']??'',36),true));
    if(in_array($action,['form_submit','form_upload'],true)){
        $in=$action==='form_upload'?$_POST:json_in();if(!empty($in['website']))fail('Envoi refusé.',400);$token=str_limit($in['token']??'',64);$record=query('SELECT * FROM collection_forms WHERE token=? AND is_public=1',[$token])->fetch();if(!$record)fail('Formulaire introuvable.',404);$form=database_form_row($record);$owner=form_upload_owner();limit_rate('form-'.$action.'-'.$form['id'],$action==='form_upload'?20:40,600);
        if($action==='form_upload'){
            $props=database_properties($form['db_id']);$hasFiles=false;foreach($props as $p)if($p['type']==='files'&&in_array($p['id'],$form['fields'],true))$hasFiles=true;if(!$hasFiles)fail('Ce formulaire ne reçoit pas de fichiers.');
            $lock=form_upload_lock($form['id']);$stored=null;
            try{
                form_prune_uploads($form['id']);
                $pending=(int)query('SELECT COUNT(*) FROM form_uploads WHERE form_id=? AND owner=? AND used_row_id IS NULL',[$form['id'],$owner])->fetchColumn();if($pending>=10)fail('10 fichiers en attente maximum.',429);
                $total=(int)query('SELECT SUM(files.size) FROM files JOIN form_uploads ON files.id=form_uploads.file_id WHERE form_uploads.form_id=? AND form_uploads.used_row_id IS NULL',[$form['id']])->fetchColumn();
                if(empty($_FILES['file'])||($_FILES['file']['error']??1)!==UPLOAD_ERR_OK)fail('Fichier manquant ou trop volumineux.',413);
                $incoming=filesize($_FILES['file']['tmp_name']);if($incoming===false||$incoming>209715200-$total)fail('Ce formulaire a atteint sa limite de fichiers en attente.',413);
                $stored=receive_file($_FILES['file']);query('INSERT INTO form_uploads (file_id,form_id,owner,used_row_id,created_at) VALUES (?,?,?,?,?)',[$stored['id'],$form['id'],$owner,null,now()]);
            }catch(Throwable $e){if($stored){$row=query('SELECT path FROM files WHERE id=?',[$stored['id']])->fetch();if($row&&is_file(storage().'/files/'.$row['path']))unlink(storage().'/files/'.$row['path']);query('DELETE FROM files WHERE id=?',[$stored['id']]);}throw $e;}
            finally{flock($lock,LOCK_UN);fclose($lock);}$stored['expires_at']=gmdate('Y-m-d\TH:i:s\Z',time()+86400);json_out(['file'=>$stored,'message'=>'Les pièces jointes non envoyées expirent après 24 heures.']);
        }
        $submissionLock=form_upload_lock($form['id']);try{
        $props=array_values(array_filter(database_properties($form['db_id']),fn($p)=>in_array($p['id'],$form['fields'],true)&&!in_array($p['type'],['relation','formula','rollup'],true)));$values=database_values($props,$in['values']??[]);$fileIds=[];
        foreach($props as $p)if($p['type']==='files')foreach($values[$p['id']]??[] as $fid){if(!query('SELECT file_id FROM form_uploads WHERE file_id=? AND form_id=? AND owner=? AND used_row_id IS NULL AND created_at>=?',[$fid,$form['id'],$owner,gmdate('Y-m-d\TH:i:s\Z',time()-86400)])->fetch())fail('Cette pièce jointe est expirée ou ne correspond pas à ton envoi. Ajoute-la à nouveau.');$fileIds[]=$fid;}
        $pdo=db();$pdo->beginTransaction();try{$row=database_row_save(['db_id'=>$form['db_id'],'values'=>$values,'source_form_id'=>$form['id']],array_column($props,'id'),true);foreach($fileIds as $fid)query('UPDATE form_uploads SET used_row_id=? WHERE file_id=? AND used_row_id IS NULL',[$row['id'],$fid]);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}}finally{flock($submissionLock,LOCK_UN);fclose($submissionLock);}json_out(['ok'=>true,'message'=>'Ta réponse a bien été envoyée.']);
    }
    need_admin();
    if($action==='db_list')json_out(['databases'=>array_map(fn($r)=>array_replace($r,['version'=>(int)$r['version']]),query('SELECT * FROM collections ORDER BY created_at,id')->fetchAll())]);
    if($action==='db_get')json_out(database_bundle(str_limit($_GET['id']??'',36)));
    if($action==='db_export'){
        $bundle=database_bundle(str_limit($_GET['id']??'',36));header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="base.csv"');$out=fopen('php://output','wb');fwrite($out,"\xEF\xBB\xBF");$cell=function($v){$s=is_array($v)?implode(', ',$v):(string)($v??'');return !is_int($v)&&!is_float($v)&&preg_match('/^(?:\s*[=+\-@]|[\t\r\n]|[＝＋－＠])/u',$s)?"'".$s:$s;};fputcsv($out,array_map(fn($p)=>$cell($p['name']),$bundle['properties']),',','"','');foreach($bundle['rows'] as $r)fputcsv($out,array_map(fn($p)=>$cell($r['derived'][$p['id']]??$r['values'][$p['id']]??null),$bundle['properties']),',','"','');fclose($out);exit;
    }
    $in=json_in();
    if($action==='db_save'){$id=!empty($in['id'])?str_limit($in['id'],36):uuid();$old=!empty($in['id'])?database_record($id):null;if($old&&(int)($in['version']??-1)!==$old['version'])fail('Base modifiée ailleurs.',409,'conflict');$name=str_limit($in['name']??'',160);if(!$name)fail('Donne un nom à la base.');$visibility=$in['visibility']??($old['visibility']??'private');if(!in_array($visibility,['private','public'],true))fail('Visibilité invalide.');if($old){$q=query('UPDATE collections SET name=?,visibility=?,version=version+1,updated_at=? WHERE id=? AND version=?',[$name,$visibility,now(),$id,$old['version']]);if($q->rowCount()!==1)fail('Conflit de modification.',409,'conflict');}else query('INSERT INTO collections (id,name,visibility,version,created_at,updated_at) VALUES (?,?,?,?,?,?)',[$id,$name,$visibility,1,now(),now()]);json_out(['database'=>database_record($id)]);}
    if($action==='db_delete'){$id=str_limit($in['id']??'',36);$r=database_record($id);if((int)($in['version']??-1)!==$r['version'])fail('Base modifiée ailleurs.',409,'conflict');$pdo=db();$pdo->beginTransaction();try{query('DELETE FROM form_uploads WHERE form_id IN (SELECT id FROM collection_forms WHERE db_id=?)',[$id]);foreach(['collection_forms','collection_rows','collection_properties'] as $table)query("DELETE FROM $table WHERE db_id=?",[$id]);$q=query('DELETE FROM collections WHERE id=? AND version=?',[$id,$r['version']]);if($q->rowCount()!==1)fail('Conflit de suppression.',409,'conflict');$pdo->commit();}catch(Throwable $e){$pdo->rollBack();throw $e;}json_out(['ok'=>true]);}
    if($action==='property_save'){
        $dbId=str_limit($in['db_id']??'',36);database_record($dbId);$id=!empty($in['id'])?str_limit($in['id'],36):uuid();$old=!empty($in['id'])?query('SELECT * FROM collection_properties WHERE id=? AND db_id=?',[$id,$dbId])->fetch():null;if(!empty($in['id'])&&!$old)fail('Propriété introuvable.',404);if($old&&(int)($in['version']??-1)!==(int)$old['version'])fail('Propriété modifiée ailleurs.',409,'conflict');if(!$old&&count(database_properties($dbId))>=100)fail('100 propriétés maximum.');
        $name=str_limit($in['name']??'',160);if(!$name)fail('Donne un nom à la propriété.');if(query('SELECT id FROM collection_properties WHERE db_id=? AND name=? AND id<>?',[$dbId,$name,$id])->fetch())fail('Une propriété porte déjà ce nom.');$type=$in['type']??'text';if(!in_array($type,['text','title','number','select','multiselect','date','checkbox','email','phone','url','files','relation','formula','rollup'],true))fail('Type de propriété inconnu.');$config=database_property_config($type,$in['config']??[]);
        if($type==='rollup'){$props=array_column(database_properties($dbId),null,'id');$relation=$props[$config['relation_property_id']]??null;if(!$relation||$relation['type']!=='relation')fail('Choisis une propriété Relation.');$targetProps=array_column(database_properties($relation['config']['target_db_id']),null,'id');if(!isset($targetProps[$config['target_property_id']]))fail('Champ cible introuvable.');}
        $required=!empty($in['required']);if($old&&!in_array($type,['formula','rollup'],true)){ $candidate=['id'=>$id,'name'=>$name,'type'=>$type,'config'=>$config,'required'=>$required];foreach(database_rows_raw($dbId) as $existingRow)database_value($candidate,$existingRow['values'][$id]??null,false); }$order=(int)($in['sort_order']??($old['sort_order']??count(database_properties($dbId))));
        if($old){$q=query('UPDATE collection_properties SET name=?,type=?,config=?,is_required=?,sort_order=?,version=version+1 WHERE id=? AND version=?',[$name,$type,encoded($config),(int)$required,$order,$id,$old['version']]);if($q->rowCount()!==1)fail('Conflit de modification.',409,'conflict');}else query('INSERT INTO collection_properties (id,db_id,name,type,config,is_required,sort_order,version) VALUES (?,?,?,?,?,?,?,?)',[$id,$dbId,$name,$type,encoded($config),(int)$required,$order,1]);database_reconcile_forms($dbId);$props=database_properties($dbId);json_out(['property'=>array_column($props,null,'id')[$id],'properties'=>$props]);
    }
    if($action==='property_delete'){
        $id=str_limit($in['id']??'',36);$p=query('SELECT * FROM collection_properties WHERE id=?',[$id])->fetch();if(!$p)fail('Propriété introuvable.',404);if((int)($in['version']??-1)!==(int)$p['version'])fail('Propriété modifiée ailleurs.',409,'conflict');$pdo=db();$pdo->beginTransaction();
        try{$q=query('DELETE FROM collection_properties WHERE id=? AND version=?',[$id,$p['version']]);if($q->rowCount()!==1)fail('Conflit de suppression.',409,'conflict');foreach(database_rows_raw($p['db_id']) as $r){unset($r['values'][$id]);query('UPDATE collection_rows SET values_json=?,version=version+1 WHERE id=?',[encoded($r['values']),$r['id']]);}foreach(query('SELECT id,fields,is_public FROM collection_forms WHERE db_id=?',[$p['db_id']])->fetchAll() as $f){$fields=array_values(array_diff(json_decode($f['fields'],true),[$id]));query('UPDATE collection_forms SET fields=?,is_public=?,version=version+1 WHERE id=?',[encoded($fields),$fields?(int)$f['is_public']:0,$f['id']]);}$versions=database_reconcile_views($p['db_id'],$id);$pdo->commit();}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}json_out(['ok'=>true,'page_versions'=>$versions]);
    }
    if($action==='row_patch'){
        $id=str_limit($in['id']??'',36);$r=query('SELECT * FROM collection_rows WHERE id=?',[$id])->fetch();if(!$r)fail('Ligne introuvable.',404);if((int)($in['version']??-1)!==(int)$r['version'])fail('Cette ligne a été modifiée.',409,'conflict');
        $propertyId=str_limit($in['property_id']??'',36);$properties=array_column(database_properties($r['db_id']),null,'id');$property=$properties[$propertyId]??null;if(!$property||in_array($property['type'],['formula','rollup'],true))fail('Ce champ ne peut pas être modifié.');
        if(!array_key_exists('value',$in))fail('Valeur de champ manquante.');$values=json_decode($r['values_json'],true);$values[$propertyId]=database_value($property,$in['value']);
        $q=query('UPDATE collection_rows SET values_json=?,version=version+1,updated_at=? WHERE id=? AND version=?',[encoded($values),now(),$id,$r['version']]);if($q->rowCount()!==1)fail('Cette ligne a été modifiée.',409,'conflict');foreach(database_compute_rows($r['db_id']) as $row)if($row['id']===$id)json_out(['row'=>$row]);fail('Ligne introuvable.',500);
    }
    if($action==='row_save')json_out(['row'=>database_row_save($in)]);
    if($action==='row_delete'){$id=str_limit($in['id']??'',36);$r=query('SELECT * FROM collection_rows WHERE id=?',[$id])->fetch();if(!$r)fail('Ligne introuvable.',404);if((int)($in['version']??-1)!==(int)$r['version'])fail('Ligne modifiée ailleurs.',409,'conflict');$q=query('DELETE FROM collection_rows WHERE id=? AND version=?',[$id,$r['version']]);if($q->rowCount()!==1)fail('Conflit de suppression.',409,'conflict');json_out(['ok'=>true]);}
    if($action==='form_save'){$dbId=str_limit($in['db_id']??'',36);database_record($dbId);$id=!empty($in['id'])?str_limit($in['id'],36):uuid();$old=!empty($in['id'])?query('SELECT * FROM collection_forms WHERE id=? AND db_id=?',[$id,$dbId])->fetch():null;if(!empty($in['id'])&&!$old)fail('Formulaire introuvable.',404);if($old&&(int)($in['version']??-1)!==(int)$old['version'])fail('Formulaire modifié ailleurs.',409,'conflict');$fields=$in['fields']??[];if(!is_array($fields)||!array_is_list($fields)||count($fields)>100)fail('Champs du formulaire invalides.');$props=array_column(database_properties($dbId),null,'id');foreach($fields as $fid)if(!isset($props[$fid])||in_array($props[$fid]['type'],['formula','rollup','relation'],true))fail('Ce champ ne peut pas être exposé dans un formulaire.');$fields=array_values(array_unique($fields));$name=str_limit($in['name']??'Formulaire',160)?:'Formulaire';$public=!empty($in['public']);if($public&&!$fields)fail('Ajoute au moins un champ avant de publier.');if($old){$q=query('UPDATE collection_forms SET name=?,fields=?,is_public=?,version=version+1 WHERE id=? AND version=?',[$name,encoded($fields),(int)$public,$id,$old['version']]);if($q->rowCount()!==1)fail('Conflit de modification.',409,'conflict');}else query('INSERT INTO collection_forms (id,db_id,name,fields,is_public,token,version,created_at) VALUES (?,?,?,?,?,?,?,?)',[$id,$dbId,$name,encoded($fields),(int)$public,bin2hex(random_bytes(20)),1,now()]);json_out(['form'=>database_form_row(query('SELECT * FROM collection_forms WHERE id=?',[$id])->fetch())]);}
    if($action==='formula_preview'){$id=str_limit($in['db_id']??'',36);database_record($id);$props=database_properties($id);$rows=database_compute_rows($id);$row=null;foreach($rows as $r)if($r['id']===($in['row_id']??''))$row=$r;if(!$row)$row=$rows[0]??['values'=>[],'derived'=>[]];$names=array_column($props,'id','name');try{$value=(new FeuilletFormula(str_limit($in['expression']??'',4096)))->evaluate(function($name)use($names,$row){if(!isset($names[$name]))throw new RuntimeException('Propriété inconnue : '.$name);return $row['derived'][$names[$name]]??$row['values'][$names[$name]]??null;});json_out(['value'=>$value]);}catch(Throwable $e){json_out(['value'=>null,'error'=>$e->getMessage()]);}}
    fail('Action inconnue.',404);
}
function database_backup(): array {
    $databases=query('SELECT * FROM collections')->fetchAll();$properties=query('SELECT * FROM collection_properties')->fetchAll();$rows=query('SELECT * FROM collection_rows')->fetchAll();$forms=query('SELECT * FROM collection_forms')->fetchAll();foreach($properties as &$p)$p['config']=json_decode($p['config'],true);unset($p);foreach($rows as &$r){$r['values']=json_decode($r['values_json'],true);unset($r['values_json']);}unset($r);foreach($forms as &$f)$f['fields']=json_decode($f['fields'],true);unset($f);return ['version'=>1,'databases'=>$databases,'properties'=>$properties,'rows'=>$rows,'forms'=>$forms];
}
function database_import(array $data,array $fileMap=[],array $pageMap=[]): array {
    if(!$data)return ['databases'=>[],'forms'=>[]];if(($data['version']??null)!==1)fail('Version de sauvegarde des bases inconnue.');foreach(['databases'=>500,'properties'=>10000,'rows'=>20000,'forms'=>1000] as $key=>$max)if(!is_array($data[$key]??null)||count($data[$key])>$max)fail('Sauvegarde des bases trop volumineuse.');$maps=['databases'=>[],'properties'=>[],'rows'=>[],'forms'=>[]];
    foreach($maps as $key=>$_)foreach($data[$key] as $item){$old=$item['id']??'';if(!is_string($old)||!preg_match('/^[a-f0-9-]{36}$/D',$old)||isset($maps[$key][$old]))fail('Identifiant de base invalide.');$maps[$key][$old]=uuid();}
    foreach($data['databases'] as $d)query('INSERT INTO collections (id,name,visibility,version,created_at,updated_at) VALUES (?,?,?,?,?,?)',[$maps['databases'][$d['id']],str_limit($d['name']??'Base importée',160),'private',1,now(),now()]);
    $types=['text','title','number','select','multiselect','date','checkbox','email','phone','url','files','relation','formula','rollup'];
    foreach($data['properties'] as $p){$dbId=$maps['databases'][$p['db_id']]??null;if(!$dbId||!in_array($p['type']??'',$types,true)||!is_array($p['config']??null))fail('Propriété importée invalide.');$c=$p['config'];if($p['type']==='relation')$c['target_db_id']=$maps['databases'][$c['target_db_id']??'']??'';if($p['type']==='rollup'){foreach(['relation_property_id','target_property_id'] as $key)$c[$key]=$maps['properties'][$c[$key]??'']??'';}$c=database_property_config($p['type'],$c);query('INSERT INTO collection_properties (id,db_id,name,type,config,is_required,sort_order,version) VALUES (?,?,?,?,?,?,?,?)',[$maps['properties'][$p['id']],$dbId,str_limit($p['name']??'Champ',160),$p['type'],encoded($c),(int)!empty($p['is_required']),(int)($p['sort_order']??0),1]);}
    $oldProps=array_column($data['properties'],null,'id');
    foreach($data['rows'] as $r){$dbId=$maps['databases'][$r['db_id']]??null;if(!$dbId||!is_array($r['values']??null))fail('Ligne importée invalide.');$values=[];foreach($r['values'] as $oldId=>$value){$p=$oldProps[$oldId]??null;if(!$p||!isset($maps['properties'][$oldId]))continue;if($p['type']==='files')$value=array_values(array_filter(array_map(fn($id)=>$fileMap[$id]??null,is_array($value)?$value:[])));if($p['type']==='relation')$value=array_values(array_filter(array_map(fn($id)=>$maps['rows'][$id]??null,is_array($value)?$value:[])));$values[$maps['properties'][$oldId]]=$value;}query('INSERT INTO collection_rows (id,db_id,values_json,source_form_id,visibility,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',[$maps['rows'][$r['id']],$dbId,encoded($values),$maps['forms'][$r['source_form_id']??'']??null,'private',1,now(),now()]);}
    $propertiesCache=[];$rowCounts=[];foreach($maps['rows'] as $newId){$r=query('SELECT * FROM collection_rows WHERE id=?',[$newId])->fetch();$dbId=$r['db_id'];$rowCounts[$dbId]=($rowCounts[$dbId]??0)+1;if($rowCounts[$dbId]>5000)fail('5000 lignes maximum par base importée.',413);$propertiesCache[$dbId]=$propertiesCache[$dbId]??database_properties($dbId);$typed=database_values($propertiesCache[$dbId],json_decode($r['values_json'],true),false);query('UPDATE collection_rows SET values_json=? WHERE id=?',[encoded($typed),$newId]);}
    foreach($data['forms'] as $f){$dbId=$maps['databases'][$f['db_id']]??null;if(!$dbId||!is_array($f['fields']??null))fail('Formulaire importé invalide.');$fields=array_values(array_filter(array_map(fn($id)=>$maps['properties'][$id]??null,$f['fields'])));query('INSERT INTO collection_forms (id,db_id,name,fields,is_public,token,version,created_at) VALUES (?,?,?,?,?,?,?,?)',[$maps['forms'][$f['id']],$dbId,str_limit($f['name']??'Formulaire importé',160),encoded($fields),0,bin2hex(random_bytes(20)),1,now()]);}
    return $maps;
}

/** Persisted linked-view settings: typed data only, no executable expressions. */
function database_view_config(string $dbId,mixed $value): array {
    if(!is_array($value))fail('Vue de base invalide.');$ids=array_column(database_properties($dbId),'id');
    $layout=$value['layout']??'table';if(!in_array($layout,['table','gallery','chart'],true))fail('Disposition de vue invalide.');
    $filters=$value['filters']??[];$hidden=$value['hiddenPropertyIds']??[];
    if(!is_array($filters)||!array_is_list($filters)||count($filters)>10||!is_array($hidden)||!array_is_list($hidden)||count($hidden)>100)fail('Vue trop complexe.');
    $out=['layout'=>$layout,'filters'=>[],'sort'=>null,'hiddenPropertyIds'=>[]];
    foreach($filters as $filter){if(!is_array($filter)||!in_array($filter['propertyId']??null,$ids,true)||!in_array($filter['operator']??'', ['contains','equals','notEquals','isEmpty','isNotEmpty','gt','gte','lt','lte'],true))fail('Filtre de vue invalide.');$v=$filter['value']??'';if(!is_string($v)&&!is_bool($v)&&!is_int($v)&&!is_float($v))fail('Valeur de filtre invalide.');if(is_string($v)&&mb_strlen($v)>10000)fail('Valeur de filtre trop longue.');if(is_float($v)&&!is_finite($v))fail('Valeur de filtre invalide.');$out['filters'][]=['propertyId'=>$filter['propertyId'],'operator'=>$filter['operator'],'value'=>$v];}
    if(!empty($value['sort'])){$sort=$value['sort'];if(!is_array($sort)||!in_array($sort['propertyId']??null,$ids,true)||!in_array($sort['direction']??'', ['asc','desc'],true))fail('Tri de vue invalide.');$out['sort']=['propertyId'=>$sort['propertyId'],'direction'=>$sort['direction']];}
    foreach($hidden as $id){if(!is_string($id)||!in_array($id,$ids,true))fail('Propriété de vue inconnue.');$out['hiddenPropertyIds'][]=$id;}$out['hiddenPropertyIds']=array_values(array_unique($out['hiddenPropertyIds']));return $out;
}

function database_reconcile_views(string $dbId,string $deletedProperty): array {
    $rewrite=function(array $n)use(&$rewrite,$dbId,$deletedProperty):array{
        if(($n['type']??'')==='databaseView'&&($n['attrs']['dbId']??'')===$dbId&&is_array($n['attrs']['viewConfig']??null)){$v=$n['attrs']['viewConfig'];$v['filters']=array_values(array_filter($v['filters']??[],fn($f)=>($f['propertyId']??'')!==$deletedProperty));$v['hiddenPropertyIds']=array_values(array_diff($v['hiddenPropertyIds']??[],[$deletedProperty]));if(($v['sort']['propertyId']??'')===$deletedProperty)$v['sort']=null;$n['attrs']['viewConfig']=$v;}
        foreach($n['content']??[] as $i=>$child)$n['content'][$i]=$rewrite($child);return $n;
    };
    $versions=[];$locking=db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':'';
    foreach(query('SELECT * FROM pages WHERE content LIKE ? OR published LIKE ?'.$locking,['%'.$dbId.'%','%'.$dbId.'%'])->fetchAll() as $row){$doc=json_decode($row['content'],true);$new=$rewrite($doc);$snapshot=$row['published']?json_decode($row['published'],true):null;$newSnapshot=$snapshot;if($snapshot)$newSnapshot['content']=$rewrite($snapshot['content']);if(encoded($new)!==encoded($doc)||encoded($newSnapshot)!==encoded($snapshot)){if($newSnapshot&&($newSnapshot['version']??0)===(int)$row['version'])$newSnapshot['version']=(int)$row['version']+1;query('UPDATE pages SET content=?,published=?,version=version+1,updated_at=? WHERE id=?',[encoded($new),$newSnapshot?encoded($newSnapshot):null,now(),$row['id']]);$versions[$row['id']]=['before'=>(int)$row['version'],'after'=>(int)$row['version']+1];}}
    return $versions;
}

function form_upload_lock(string $formId) {
    $dir=storage().'/locks';if(!is_dir($dir))mkdir($dir,0700,true);$handle=fopen($dir.'/form-'.hash('sha256',$formId).'.lock','c+');if(!$handle||!flock($handle,LOCK_EX))fail('Envoi temporairement indisponible.',503);return $handle;
}
/** Expired unfinished uploads only; submitted and reused teacher assets are retained. */
function form_prune_uploads(string $formId): void {
    $cutoff=gmdate('Y-m-d\TH:i:s\Z',time()-86400);$candidates=query('SELECT uploads.file_id,files.path FROM form_uploads uploads JOIN files ON files.id=uploads.file_id WHERE uploads.form_id=? AND uploads.used_row_id IS NULL AND uploads.created_at<? LIMIT 100',[$formId,$cutoff])->fetchAll();$propertyCache=[];
    foreach($candidates as $candidate){$id=$candidate['file_id'];$pattern='%'.$id.'%';$retain=(notebook_settings()['icon_id']??null)===$id;if(!$retain)$retain=(bool)query('SELECT id FROM pages WHERE cover_id=? OR icon_id=? OR content LIKE ? OR published LIKE ? LIMIT 1',[$id,$id,$pattern,$pattern])->fetch();if(!$retain)$retain=(bool)query('SELECT id FROM revisions WHERE snapshot LIKE ? LIMIT 1',[$pattern])->fetch();
        if(!$retain){$bytes=db()->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?'LENGTH(values_json)':'LENGTH(CAST(values_json AS BLOB))';$q=query('SELECT db_id,CASE WHEN '.$bytes.'>262144 THEN NULL ELSE values_json END AS values_json FROM collection_rows WHERE values_json LIKE ? LIMIT 101',[$pattern]);$checked=0;while($row=$q->fetch()){if(++$checked>100||$row['values_json']===null){$retain=true;break;}$properties=$propertyCache[$row['db_id']]??array_column(array_filter(database_properties($row['db_id']),fn($p)=>$p['type']==='files'),'id');$propertyCache[$row['db_id']]=$properties;$values=json_decode($row['values_json'],true);foreach($properties as $propertyId)if(in_array($id,$values[$propertyId]??[],true)){$retain=true;break 2;}}}
        // A tombstone preserves form/owner metadata and prevents reusing expired IDs.
        query("UPDATE form_uploads SET used_row_id='expired' WHERE file_id=? AND used_row_id IS NULL",[$id]);if($retain)continue;
        query('DELETE FROM files WHERE id=?',[$id]);$path=storage().'/files/'.$candidate['path'];if(is_file($path))unlink($path);
    }
}
