<?php
declare(strict_types=1);
require_once __DIR__.'/block-transfer.php';

/** One bounded graph, one destination save: no references back to mutable originals. */
final class BlockCopy {
    public array $pages=[],$pageDocs=[],$pageMap=[],$owners=[],$files=[],$fileMap=[],$paths=[],$databases=[],$databaseMap=[];
    private array $all,$slugs=[],$databaseQueue=[];
    private int $bytes=0,$nodes=0;
    public function __construct(private string $target) {
        $this->all=page_rows();foreach($this->all as $id=>$row)$this->slugs[$row['slug']]=$id;
    }
    private function page(string $id,string $owner): void {
        if(isset($this->pages[$id]))return;
        $row=$this->all[$id]??null;
        if(!$row||$row['deleted_at']||!ancestors_active($row,$this->all))fail('Une page copiée est introuvable. Recharge la page source.',409,'copy_missing');
        if(count($this->pages)>=100)fail('Cette copie contient plus de 100 pages. Copie une galerie plus petite.',413);
        $this->pages[$id]=$row;$this->pageMap[$id]=uuid();$this->owners[$id]=$owner;
    }
    private function file(string $id): void {
        if(isset($this->files[$id]))return;
        $f=query('SELECT * FROM files WHERE id=?',[$id])->fetch();if(!$f)fail('Un fichier copié est introuvable.',409,'copy_missing');
        $this->bytes+=(int)$f['size'];if(count($this->files)>=500||$this->bytes>268435456)fail('Cette copie contient trop de fichiers (500 fichiers ou 256 Mo maximum).',413);
        if(!preg_match('/^[a-f0-9]{48}$/D',$f['path']))fail('Chemin de fichier invalide.',500);
        $this->files[$id]=$f;
    }
    private function database(string $id): void {
        if(isset($this->databaseQueue[$id]))return;
        if(count($this->databaseQueue)>=50)fail('Cette copie contient trop de bases liées.',413);
        $this->databaseQueue[$id]=true;
    }
    private function localPage(string $url): ?string {
        $u=parse_url($url);if(!$u||!isset($u['path'])||!in_array(basename($u['path']),['index.php'],true))return null;
        if(isset($u['host'])&&strtolower($u['host'].(isset($u['port'])?':'.$u['port']:''))!==strtolower($_SERVER['HTTP_HOST']??''))return null;
        if(str_starts_with($u['path'],'/')&&$u['path']!==cookie_path().'index.php')return null;
        parse_str($u['query']??'',$q);$value=$q['page']??null;if(!is_string($value))return null;
        return isset($this->all[$value])?$value:($this->slugs[$value]??null);
    }
    public function collect(array $node,string $owner): array {
        if(++$this->nodes>100000)fail('Cette copie contient trop de blocs.',413);
        $type=$node['type']??'';$a=$node['attrs']??[];
        if($type==='gallery'){
            $ids=!empty($a['manual'])?($a['pageIds']??[]):array_keys(array_filter($this->all,fn($r)=>$r['id']!==$owner&&!$r['deleted_at']&&ancestors_active($r,$this->all)&& (empty($a['parentId'])||$r['parent_id']===$a['parentId'])&&(empty($a['kind'])||$r['kind']===$a['kind'])));
            foreach($ids as $id)$this->page($id,$owner);
            $node['attrs']=array_replace($a,['manual'=>true,'parentId'=>'','kind'=>'','pageIds'=>$ids]);
        }
        if($type==='pageLink'&&!empty($a['pageId']))$this->page($a['pageId'],$owner);
        if(!empty($a['fileId']))$this->file($a['fileId']);
        if($type==='databaseView'&&!empty($a['dbId']))$this->database($a['dbId']);
        if($type==='formView'&&!empty($a['formId'])){$form=query('SELECT db_id FROM collection_forms WHERE id=?',[$a['formId']])->fetch();if(!$form)fail('Formulaire copié introuvable.',409,'copy_missing');$this->database($form['db_id']);}
        if(is_string($a['href']??null)&&($id=$this->localPage($a['href'])))$this->page($id,$owner);
        foreach($node['marks']??[] as $m)if(($m['type']??'')==='link'&&is_string($m['attrs']['href']??null)&&($id=$this->localPage($m['attrs']['href'])))$this->page($id,$owner);
        foreach($node['content']??[] as $i=>$child)$node['content'][$i]=$this->collect($child,$owner);
        return $node;
    }
    public function expand(): void {
        for($i=0;$i<count($this->pages);$i++){
            $id=array_keys($this->pages)[$i];$row=$this->pages[$id];
            foreach($this->all as $child)if($child['parent_id']===$id&&!$child['deleted_at'])$this->page($child['id'],$id);
            foreach(['cover_id','icon_id'] as $key)if(!empty($row[$key]))$this->file($row[$key]);
            $this->pageDocs[$id]=$this->collect(normalize_doc(json_decode($row['content'],true)),$id);
        }
        $data=['version'=>1,'databases'=>[],'properties'=>[],'rows'=>[],'forms'=>[]];
        for($i=0;$i<count($this->databaseQueue);$i++){
            $id=array_keys($this->databaseQueue)[$i];$data['databases'][]=database_record($id);
            foreach(query('SELECT * FROM collection_properties WHERE db_id=? ORDER BY sort_order,id',[$id])->fetchAll() as $p){$p['config']=json_decode($p['config'],true);if($p['type']==='relation')$this->database($p['config']['target_db_id']);$data['properties'][]=$p;}
            foreach(query('SELECT * FROM collection_rows WHERE db_id=? ORDER BY created_at,id LIMIT 5001',[$id])->fetchAll() as $r){$r['values']=json_decode($r['values_json'],true);unset($r['values_json']);$data['rows'][]=$r;}
            foreach(query('SELECT * FROM collection_forms WHERE db_id=?',[$id])->fetchAll() as $f){$f['fields']=json_decode($f['fields'],true);$data['forms'][]=$f;}
            if(count($data['rows'])>20000||count($data['properties'])>10000||count($data['forms'])>1000)fail('Cette copie contient trop de données liées.',413);
        }
        $props=array_column($data['properties'],null,'id');foreach($data['rows'] as $r)foreach($r['values'] as $id=>$value)if(($props[$id]['type']??'')==='files')foreach($value??[] as $fid)$this->file($fid);
        $this->databases=$data;
    }
    public function createFiles(): void {
        foreach($this->files as $old=>$f){
            $source=storage().'/files/'.$f['path'];$disk=bin2hex(random_bytes(24));$path=storage().'/files/'.$disk;
            if(!is_file($source)||is_link($source))fail('Un fichier copié est absent du stockage.',409,'copy_missing');
            $this->paths[]=$path;if(!copy($source,$path)||filesize($path)!==(int)$f['size'])fail('Impossible de dupliquer un fichier. Vérifie l’espace disponible.',500);
            chmod($path,0600);$id=uuid();$this->fileMap[$old]=$id;
            query('INSERT INTO files (id,name,mime,size,path,created_at,attribution) VALUES (?,?,?,?,?,?,?)',[$id,$f['name'],$f['mime'],$f['size'],$disk,now(),$f['attribution']??null]);
        }
        $this->databaseMap=database_import($this->databases,$this->fileMap,$this->pageMap);
    }
    public function rewrite(array $node): array {
        $a=$node['attrs']??[];$maps=$this->databaseMap;
        if(isset($a['fileId'])){$a['fileId']=$this->fileMap[$a['fileId']]??'';if(($node['type']??'')==='image')$a['src']='media.php?id='.$a['fileId'];}
        if(isset($a['pageId'])&&$a['pageId']!=='')$a['pageId']=$this->pageMap[$a['pageId']]??'';
        if(($node['type']??'')==='gallery'){$a['pageIds']=array_map(fn($id)=>$this->pageMap[$id],$a['pageIds']);$a['manual']=true;$a['parentId']='';$a['kind']='';}
        if(isset($a['dbId']))$a['dbId']=$maps['databases'][$a['dbId']]??'';
        if(isset($a['formId'])){$a['formId']=$maps['forms'][$a['formId']]??'';unset($a['token']);}
        if(isset($a['viewConfig'])){
            $v=$a['viewConfig'];$p=$maps['properties']??[];
            if(isset($v['hiddenPropertyIds']))$v['hiddenPropertyIds']=array_map(fn($id)=>$p[$id]??'', $v['hiddenPropertyIds']);
            if(isset($v['filters']))foreach($v['filters'] as &$f)$f['propertyId']=$p[$f['propertyId']]??'';unset($f);
            if(!empty($v['sort']))$v['sort']['propertyId']=$p[$v['sort']['propertyId']]??'';$a['viewConfig']=$v;
        }
        if(($node['type']??'')==='quiz'){$a['quizId']=uuid();foreach($a['questions']??[] as $i=>$q)$a['questions'][$i]['id']=uuid();}
        if(is_string($a['href']??null)&&($id=$this->localPage($a['href']))&&isset($this->pageMap[$id]))$a['href']=((!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')?'https':'http').'://'.$_SERVER['HTTP_HOST'].cookie_path().'index.php?page='.$this->pageMap[$id];
        if(isset($node['attrs']))$node['attrs']=$a;
        foreach($node['marks']??[] as $i=>$m)if(($m['type']??'')==='link'&&($id=$this->localPage($m['attrs']['href']??''))&&isset($this->pageMap[$id]))$node['marks'][$i]['attrs']['href']=((!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off')?'https':'http').'://'.$_SERVER['HTTP_HOST'].cookie_path().'index.php?page='.$this->pageMap[$id];
        foreach($node['content']??[] as $i=>$c)$node['content'][$i]=$this->rewrite($c);return $node;
    }
    public function createPages(array $target): void {
        foreach($this->pages as $old=>$row){
            $p=row_page($row);$id=$this->pageMap[$old];$parent=$this->pageMap[$p['parent_id']??'']??$this->target;
            $category=$p['space_id']===$target['space_id']?$p['category_id']:category_for_kind($target['space_id'],$p['kind']);
            $doc=normalize_doc($this->rewrite($this->pageDocs[$old]));
            query('INSERT INTO pages (id,slug,parent_id,title,icon,cover_id,kind,description,tags,source_url,source_name,content,visibility,sort_order,version,created_at,updated_at,space_id,icon_id,appearance,category_id,cover_position) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[$id,'copie-'.substr($id,0,8),$parent,$p['title'],$p['icon'],$this->fileMap[$p['cover_id']??'']??null,$p['kind'],$p['description'],encoded($p['tags']),$p['source_url'],$p['source_name'],encoded($doc),'private',$p['sort_order'],1,now(),now(),$target['space_id'],$this->fileMap[$p['icon_id']??'']??null,encoded($p['appearance']),$category,encoded($p['cover_position'])]);
        }
        foreach($this->pageMap as $id){check_parent(query('SELECT parent_id FROM pages WHERE id=?',[$id])->fetchColumn()?:null,$id);revision_save(get_page($id));}
    }
}
function block_copy_node(array &$doc,array $path): array {
    $node=&$doc;foreach($path as $i){if(!isset($node['content'][$i]))fail('Emplacement de collage invalide.');$node=&$node['content'][$i];}
    if(!in_array($node['type']??'', ['gallery','pageLink','fileBlock','image','databaseView','formView','quiz','buttonLink','bookmark','paragraph','heading','text'],true))fail('Bloc de copie invalide.');
    return $node;
}
function blocks_copy(array $in): array {
    $pdo=db();$pdo->beginTransaction();$copy=null;
    try{
        $id=str_limit($in['id']??'',36);$row=query('SELECT * FROM pages WHERE id=?'.($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':''),[$id])->fetch();
        if(!$row||$row['deleted_at']||!ancestors_active($row,page_rows()))fail('Page de destination introuvable.',404);
        if(!is_int($in['version']??null)||$in['version']!==(int)$row['version'])fail('La page a changé. Recharge-la avant de coller.',409,'conflict');
        $doc=normalize_doc($in['content']??null);$paths=block_transfer_paths(is_array($in['paths']??null)?$in['paths']:[]);$copy=new BlockCopy($id);$nodes=[];
        $owner=str_limit($in['source_id']??$id,36)?:$id;
        foreach($paths as $path)$nodes[]=$copy->collect(block_copy_node($doc,$path),$owner);
        $copy->expand();$copy->createFiles();$copy->createPages(row_page($row));
        foreach($paths as $i=>$path){$node=&$doc;foreach($path as $index)$node=&$node['content'][$index];$node=$copy->rewrite($nodes[$i]);unset($node);}
        $doc=normalize_doc($doc);
        $q=query('UPDATE pages SET content=?,version=version+1,updated_at=? WHERE id=? AND version=?',[encoded($doc),now(),$id,(int)$row['version']]);if($q->rowCount()!==1)fail('Conflit de collage.',409,'conflict');
        publish_inherited_children($id);auto_publish_page($id);revision_save(get_page($id));
        $page=get_page($id);$pdo->commit();return ['page'=>$page,'files'=>array_map(fn($fid)=>file_info(query('SELECT * FROM files WHERE id=?',[$fid])->fetch()),array_values($copy->fileMap)),'copied'=>['pages'=>count($copy->pageMap),'files'=>count($copy->fileMap),'databases'=>count($copy->databaseMap['databases']??[])]];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();if($copy)foreach($copy->paths as $path)if(is_file($path))unlink($path);throw $e;}
}
