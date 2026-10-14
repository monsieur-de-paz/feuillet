<?php
declare(strict_types=1);
/** Standalone recovery engine. A private copy survives replacement of application code. */
function fu_write(string $path, array $value): void {
    $tmp=$path.'.'.bin2hex(random_bytes(8)).'.tmp';
    if(file_put_contents($tmp,json_encode($value,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES),LOCK_EX)===false)throw new RuntimeException('Écriture du journal impossible.');
    if(!chmod($tmp,0600)||!rename($tmp,$path)){@unlink($tmp);throw new RuntimeException('Activation du journal impossible.');}
}
function fu_path(string $relative): bool {
    if(strlen($relative)>300||!preg_match('~^[a-zA-Z0-9._/-]+$~D',$relative)||str_contains($relative,'\\'))return false;
    $parts=explode('/',$relative);foreach($parts as $part)if($part===''||$part==='.'||$part==='..'||in_array($part,['node_modules','.git','storage','config.php'],true))return false;
    return in_array($parts[0],['app','public','docs','frontend','tests','tools','licenses','.github'],true)||in_array($relative,['README.md','CHANGELOG.md','API-CONTRACT.md','THIRD-PARTY-NOTICES.md','LICENSE','.htaccess','.gitignore','config.example.php','update-manifest.json'],true);
}
function fu_target(string $root,string $relative): string {
    if(!fu_path($relative))throw new RuntimeException('Chemin de distribution interdit.');
    $current=$root;foreach(explode('/',$relative) as $part){$current.='/'.$part;if(is_link($current))throw new RuntimeException('Lien symbolique dans le dossier du logiciel.');}
    return $current;
}
function fu_copy(string $from,string $to,int $mode=0644): void {
    $dir=dirname($to);if(!is_dir($dir)&&!mkdir($dir,0755,true))throw new RuntimeException('Dossier de destination inaccessible.');
    $tmp=$to.'.feuillet-'.bin2hex(random_bytes(8)).'.tmp';
    if(!copy($from,$tmp)||!chmod($tmp,$mode)||!rename($tmp,$to)){@unlink($tmp);throw new RuntimeException('Remplacement de fichier impossible.');}
    if(function_exists('opcache_invalidate'))@opcache_invalidate($to,true);
}
function fu_database(PDO $pdo,string $folder,array $tables): void {
    if($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='sqlite'){
        $pdo->exec('VACUUM INTO '.$pdo->quote($folder.'/database.sqlite'));chmod($folder.'/database.sqlite',0600);return;
    }
    $out=fopen($folder.'/database.jsonl','xb');if(!$out)throw new RuntimeException('Sauvegarde SQL impossible.');chmod($folder.'/database.jsonl',0600);
    try{
        $ddl=[];foreach($tables as $table){if(!preg_match('/^[a-z_]+$/D',$table))throw new RuntimeException('Table invalide.');$row=$pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM);$ddl[$table]=$row[1];}
        $write=function(array $line)use($out):void{$text=json_encode($line,JSON_THROW_ON_ERROR|JSON_INVALID_UTF8_SUBSTITUTE)."\n";if(fwrite($out,$text)!==strlen($text))throw new RuntimeException('Espace disque insuffisant pour la sauvegarde SQL.');};
        $write(['tables'=>$ddl]);$pdo->beginTransaction();
        foreach($tables as $table){$q=$pdo->query('SELECT * FROM `'.$table.'`');while($row=$q->fetch(PDO::FETCH_ASSOC))$write(['table'=>$table,'row'=>$row]);$q->closeCursor();}
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}finally{fclose($out);}
}
function fu_restore_database(string $folder,array $config,array $tables,array $newTables=[]): void {
    if(($config['driver']??'')==='sqlite'){
        $target=$config['sqlite_path'];if(is_link($target))throw new RuntimeException('Base SQLite liée interdite.');
        fu_copy($folder.'/database.sqlite',$target,0600);foreach(['-wal','-shm'] as $suffix)if(is_file($target.$suffix)&&!unlink($target.$suffix))throw new RuntimeException('Journal SQLite inaccessible.');return;
    }
    $pdo=new PDO('mysql:host='.$config['db_host'].';port='.($config['db_port']??3306).';dbname='.$config['db_name'].';charset=utf8mb4',$config['db_user'],$config['db_password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $in=fopen($folder.'/database.jsonl','rb');if(!$in)throw new RuntimeException('Sauvegarde SQL absente.');
    try{
        $header=json_decode((string)fgets($in,16777216),true,32,JSON_THROW_ON_ERROR);$ddl=$header['tables']??[];
        if(array_keys($ddl)!==$tables)throw new RuntimeException('Manifeste SQL incompatible.');
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        foreach(array_reverse(array_values(array_unique([...$tables,...$newTables]))) as $table){if(!preg_match('/^[a-z_]+$/D',$table))throw new RuntimeException('Table invalide.');$pdo->exec('DROP TABLE IF EXISTS `'.$table.'`');}
        foreach($ddl as $sql)$pdo->exec($sql);
        $pdo->beginTransaction();$statements=[];
        while(($line=fgets($in,16777216))!==false){$record=json_decode($line,true,80,JSON_THROW_ON_ERROR);$table=$record['table']??'';$row=$record['row']??[];
            if(!in_array($table,$tables,true)||!is_array($row)||!$row)throw new RuntimeException('Ligne SQL incompatible.');
            if(!isset($statements[$table])){$columns=array_keys($row);foreach($columns as $column)if(!preg_match('/^[a-z_]+$/D',$column))throw new RuntimeException('Colonne SQL invalide.');$statements[$table]=$pdo->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`',$columns).'`) VALUES ('.implode(',',array_fill(0,count($columns),'?')).')');}
            $statements[$table]->execute(array_values($row));
        }
        $pdo->commit();$pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}finally{fclose($in);}
}
function fu_recover(string $root,string $storage,array $journal,array $config): void {
    $id=$journal['id']??'';if(!preg_match('/^[a-f0-9]{32}$/D',$id))throw new RuntimeException('Journal de récupération invalide.');
    $folder=$storage.'/updates/'.$id;
    if(!empty($journal['files_changed'])){
        $meta=json_decode((string)file_get_contents($folder.'/backup.json'),true,32,JSON_THROW_ON_ERROR);
        $zip=new ZipArchive();if($zip->open($folder.'/code.zip')!==true)throw new RuntimeException('Sauvegarde du logiciel illisible.');
        try{
            foreach($meta['paths'] as $relative){$target=fu_target($root,$relative);
                if(isset($meta['hashes'][$relative])){$bytes=$zip->getFromName($relative);if(!is_string($bytes)||hash('sha256',$bytes)!==$meta['hashes'][$relative])throw new RuntimeException('Sauvegarde du logiciel endommagée.');
                    $tmp=$folder.'/restore.tmp';if(file_put_contents($tmp,$bytes)===false)throw new RuntimeException('Restauration impossible.');fu_copy($tmp,$target);@unlink($tmp);
                }elseif(is_file($target)&&!unlink($target))throw new RuntimeException('Suppression de nouveau fichier impossible.');
            }
        }finally{$zip->close();}
    }
    if(!empty($journal['database_changed'])){ $snapshot=$folder.'/'.(($config['driver']??'')==='sqlite'?'database.sqlite':'database.jsonl');if(!is_file($snapshot)||hash_file('sha256',$snapshot)!==($journal['database_sha256']??''))throw new RuntimeException('Sauvegarde SQL endommagée.');fu_restore_database($folder,$config,$journal['tables'],$journal['new_tables']??[]);}
    $journal['phase']='rolled_back';$journal['message']='La mise à jour a échoué. La version précédente a été restaurée.';$journal['finished_at']=gmdate('c');
    fu_write($folder.'/job.json',$journal);if(is_file($storage.'/update-journal.json')&&!unlink($storage.'/update-journal.json'))throw new RuntimeException('Fin de restauration impossible.');
}
