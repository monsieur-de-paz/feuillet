<?php
declare(strict_types=1);

/** The visitor home is an ordinary page, with the same draft/publication rules. */
function homepage_id(): ?string {
    $raw=query("SELECT value FROM app_settings WHERE name='homepage_id'")->fetchColumn();
    $id=$raw?json_decode($raw,true):null;
    return is_string($id)&&preg_match('/^[a-f0-9-]{36}$/D',$id)?$id:null;
}
function homepage_settings(): array {
    $id=homepage_id();$page=null;
    if($id){try{$page=get_page($id);}catch(AppError){}}
    return ['id'=>$id,'title'=>$page['title']??null,'published'=>!empty($page)&&$page['visibility']==='public'&&!empty($page['published_at'])];
}
function homepage_select(?string $id): void {
    if($id)get_page($id);
    $pdo=db();$pdo->beginTransaction();
    try{query("DELETE FROM app_settings WHERE name='homepage_id'");query('INSERT INTO app_settings (name,value) VALUES (?,?)',['homepage_id',encoded($id)]);$pdo->commit();}
    catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function homepage_mutate(array $input): array {
    if(!empty($input['create'])){
        // A manual empty gallery never starts publishing newly created private courses.
        $page=save_page(['title'=>'Bienvenue dans mon carnet','icon'=>'🏠','description'=>'Mes cours, mes ressources et mes découvertes.',
            'content'=>['type'=>'doc','content'=>[
                ['type'=>'paragraph','content'=>[['type'=>'text','text'=>'Bienvenue ! Retrouvez ici les ressources que je vous partage.']]],
                ['type'=>'gallery','attrs'=>['title'=>'À découvrir','manual'=>true,'pageIds'=>[],'columns'=>2,'rows'=>0,'layout'=>'grid','aspect'=>'16/9']],
                ['type'=>'paragraph']]]]);
        homepage_select($page['id']);return ['homepage'=>homepage_settings(),'page'=>$page];
    }
    if(!array_key_exists('id',$input)||($input['id']!==null&&!is_string($input['id'])))fail('Page d’accueil invalide.');
    $id=$input['id']!==null?str_limit($input['id'],36):null;homepage_select($id);
    return ['homepage'=>homepage_settings()];
}
