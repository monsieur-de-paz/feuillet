<?php
declare(strict_types=1);

/** Private, atomic recovery copy, distinct from the SQL transaction. Never served publicly. */
function form_delivery_directory(): string {
    $path=storage().'/form-submissions';
    if(is_link($path))fail('Journal des envois indisponible.',503);
    if(!is_dir($path)&&!mkdir($path,0700,true))fail('Journal des envois indisponible.',503);
    return $path;
}
function form_delivery_path(string $formId,string $requestId): string {
    if(!preg_match('/^[a-f0-9-]{36}$/D',$formId)||!preg_match('/^[a-f0-9]{32}$/D',$requestId))fail('Identifiant d’envoi invalide.');
    $folder=form_delivery_directory().'/'.$formId;
    if(is_link($folder))fail('Journal des envois indisponible.',503);
    if(!is_dir($folder)&&!mkdir($folder,0700))fail('Journal des envois indisponible.',503);
    $path=$folder.'/'.$requestId.'.json';if(is_link($path))fail('Journal des envois indisponible.',503);return $path;
}
function form_delivery_write(string $path,array $journal): void {
    $text=json_encode($journal,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
    $tmp=$path.'.'.bin2hex(random_bytes(8)).'.tmp';$handle=fopen($tmp,'xb');
    if(!$handle)fail('Journal des envois indisponible.',503);
    try{
        if(!chmod($tmp,0600))throw new RuntimeException('Protection du journal impossible.');
        $offset=0;$length=strlen($text);
        while($offset<$length){$written=fwrite($handle,substr($text,$offset));if($written===false||$written===0)throw new RuntimeException('Journal incomplet.');$offset+=$written;}
        if(!fflush($handle)||(function_exists('fsync')&&!fsync($handle)))throw new RuntimeException('Journal non synchronisé.');
        fclose($handle);$handle=null;
        if(!rename($tmp,$path))throw new RuntimeException('Activation du journal impossible.');
    }finally{if(is_resource($handle))fclose($handle);if(is_file($tmp))unlink($tmp);}
}
function form_delivery_fingerprint(array $values): string {ksort($values);return hash('sha256',encoded($values));}
function form_delivery_retry(string $path,string $owner,array $rawValues,array $props): ?array {
    if(!is_file($path))return null;
    $journal=json_decode((string)file_get_contents($path),true,80,JSON_THROW_ON_ERROR);
    if(!hash_equals($journal['owner'],$owner))fail('Cet envoi a déjà été utilisé avec un autre contenu. Recharge le formulaire.',409,'submission_conflict');
    $values=database_values($props,$rawValues);
    if(!hash_equals($journal['fingerprint'],form_delivery_fingerprint($values)))fail('Cet envoi a déjà été utilisé avec un autre contenu. Recharge le formulaire.',409,'submission_conflict');
    $row=query('SELECT id,source_form_id FROM collection_rows WHERE id=?',[$journal['receipt']['id']])->fetch();
    if(!$row)fail('Un envoi précédent nécessite une vérification par l’administrateur. Conserve tes documents et la référence '.$journal['receipt']['id'].'.',409,'submission_review');
    if($row['source_form_id']!==$journal['receipt']['formId'])fail('Reçu non vérifiable.',409,'submission_review');
    foreach($journal['files'] as $f)if(!is_file(storage().'/files/'.$f['path']))fail('Une pièce jointe nécessite une vérification par l’administrateur.',409,'submission_review');
    return $journal['receipt'];
}
function form_delivery_prepare(array $form,array $row,array $values,array $fileIds,string $owner,string $requestId,string $path): array {
    $files=[];
    foreach(array_unique($fileIds) as $id){
        $f=query('SELECT * FROM files WHERE id=?',[$id])->fetch();
        if(!$f||!is_file(storage().'/files/'.$f['path'])||filesize(storage().'/files/'.$f['path'])!==(int)$f['size'])fail('Une pièce jointe est absente ou incomplète. Ajoute-la à nouveau.',409,'attachment_missing');
        $files[]=$f;
    }
    $receipt=['id'=>$row['id'],'formId'=>$form['id'],'requestId'=>$requestId,'receivedAt'=>now(),'fileCount'=>count($files)];
    form_delivery_write($path,['format'=>'feuillet-form-submission','version'=>1,'receipt'=>$receipt,'db_id'=>$form['db_id'],'owner'=>$owner,'fingerprint'=>form_delivery_fingerprint($values),'values'=>$values,'files'=>$files]);
    return $receipt;
}
/** Authenticated support inventory. Does not alter rows, media or journals. */
function form_delivery_audit(string $dbId): array {
    database_record($dbId);$uploads=[];$counts=['received'=>0,'pending'=>0,'expired'=>0,'unlinked'=>0,'missing'=>0];
    $q=query('SELECT u.*,f.name,f.mime,f.size,f.path,r.id AS row_exists,r.values_json FROM form_uploads u JOIN collection_forms form ON form.id=u.form_id LEFT JOIN files f ON f.id=u.file_id LEFT JOIN collection_rows r ON r.id=u.used_row_id WHERE form.db_id=? ORDER BY u.created_at DESC LIMIT 5001',[$dbId]);
    $truncated=false;
    while($u=$q->fetch()){
        if(count($uploads)>=5000){$truncated=true;break;}
        $exists=$u['path']!==null&&is_file(storage().'/files/'.$u['path']);
        $state=$u['used_row_id']==='expired'?'expired':($u['used_row_id']===null?'pending':($u['row_exists']?'received':'unlinked'));
        $counts[$state]++;if(!$exists)$counts['missing']++;
        $uploads[]=['id'=>$u['file_id'],'formId'=>$u['form_id'],'rowId'=>$u['row_exists'],'createdAt'=>$u['created_at'],'name'=>$u['name'],'size'=>(int)$u['size'],'state'=>$state,'available'=>$exists,'url'=>$exists?'media.php?id='.rawurlencode($u['file_id']).'&download=1':null];
    }
    $journals=[];
    foreach(query('SELECT id FROM collection_forms WHERE db_id=?',[$dbId])->fetchAll() as $f){
        $folder=storage().'/form-submissions/'.$f['id'];if(!is_dir($folder)||is_link($folder))continue;
        foreach(new DirectoryIterator($folder) as $entry){
            if(count($journals)>=5000)break 2;
            if(!$entry->isFile()||$entry->isLink()||!preg_match('/^[a-f0-9]{32}\.json$/D',$entry->getFilename()))continue;
            try{$j=json_decode((string)file_get_contents($entry->getPathname()),true,80,JSON_THROW_ON_ERROR);$exists=(bool)query('SELECT id FROM collection_rows WHERE id=?',[$j['receipt']['id']])->fetch();$journals[]=['receipt'=>$j['receipt'],'rowExists'=>$exists];}catch(Throwable){$journals[]=['error'=>'Journal illisible'];}
        }
    }
    $known=array_fill_keys(query('SELECT path FROM files')->fetchAll(PDO::FETCH_COLUMN),true);$unindexed=0;$dir=storage().'/files';
    if(is_dir($dir))foreach(new DirectoryIterator($dir) as $entry)if($entry->isFile()&&!$entry->isLink()&&preg_match('/^[a-f0-9]{48}$/D',$entry->getFilename())&&!isset($known[$entry->getFilename()]))$unindexed++;
    return ['counts'=>$counts,'uploads'=>$uploads,'truncated'=>$truncated,'journals'=>$journals,'unindexedFiles'=>$unindexed];
}
