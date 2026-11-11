import { useEffect, useState, type ReactNode } from 'react';
import { Folder, FileText, Image, Music, Video, Link, ArrowLeft, List, LayoutGrid, ArrowUpRight, Globe, Lock } from 'lucide-react';
import { api, type FileRecord } from './types';
const folders=[['documents','Documents',FileText],['images','Images',Image],['audio','Audio',Music],['videos','Vidéos',Video],['other','Autres fichiers',Folder]] as const;
export function libraryCategory(file:FileRecord) {
 if(file.mime.startsWith('image/'))return 'images';if(file.mime.startsWith('audio/'))return 'audio';if(file.mime.startsWith('video/'))return 'videos';
 return /pdf|text\/|officedocument|msword|opendocument|rtf|spreadsheet|presentation/.test(file.mime)?'documents':'other';
}
type SavedLink={href:string;title:string;page_id:string;page_title:string;visibility:string};
export function LibraryNavigator({files,query,requested,children,onOpenPage}:{files:FileRecord[];query:string;requested:string|null;children:(files:FileRecord[])=>ReactNode;onOpenPage:(id:string)=>void}) {
 const [view,setView]=useState(()=>{try{return localStorage.getItem('feuillet.library.view')==='list'?'list':'folders';}catch{return 'folders';}});
 const [folder,setFolder]=useState('');const [links,setLinks]=useState<SavedLink[]|null>(null);const [error,setError]=useState('');
 useEffect(()=>{try{localStorage.setItem('feuillet.library.view',view);}catch{}},[view]);
 useEffect(()=>{if(folder!=='links'||links)return;let alive=true;void api<{links:SavedLink[]}>('library_links').then(r=>{if(alive)setLinks(r.links);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[folder,links]);
 useEffect(()=>setFolder(''),[requested]);
 const category=requested&&['cover','icon','image'].includes(requested)?'images':requested==='video'?'videos':requested==='audio'?'audio':requested==='pdf'?'documents':'';
 const visible=files.filter(file=>(!category||libraryCategory(file)===category)&&file.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 const items=view==='folders'&&folder?visible.filter(file=>libraryCategory(file)===folder):visible;
 return <div className={`library-browser library-view-${view}`}>
   <div className="library-browser-toolbar"><div>{view==='folders'&&folder?<button type="button" className="text-button" onClick={()=>setFolder('')}><ArrowLeft size={15}/>Tous les dossiers</button>:<span>{visible.length} fichier{visible.length!==1?'s':''}</span>}{folder&&<strong>{folder==='links'?'Liens':folders.find(f=>f[0]===folder)?.[1]}</strong>}</div>
   <div role="group" aria-label="Affichage de la bibliothèque"><button type="button" aria-label="Vue par dossiers" aria-pressed={view==='folders'} onClick={()=>setView('folders')}><LayoutGrid size={16}/></button><button type="button" aria-label="Vue en liste" aria-pressed={view==='list'} onClick={()=>{setView('list');setFolder('');}}><List size={16}/></button></div></div>
   {view==='folders'&&!folder&&!query?<div className="library-folders">{folders.filter(([id])=>!category||id===category).map(([id,label,Icon])=><button type="button" key={id} onClick={()=>setFolder(id)}><span><Icon size={24}/></span><strong>{label}</strong><small>{visible.filter(f=>libraryCategory(f)===id).length} fichiers</small></button>)}{!requested&&<button type="button" onClick={()=>setFolder('links')}><span><Link size={24}/></span><strong>Liens</strong><small>Enregistrés dans vos pages</small></button>}</div>:
    folder==='links'?<div className="library-links">{error&&<p role="alert">{error}</p>}{!links&&!error&&<p role="status">Chargement des liens…</p>}{links?.filter(l=>(l.title+' '+l.href+' '+l.page_title).toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(l=><article key={l.page_id+l.href}><Link size={20}/><div><a href={l.href} target="_blank" rel="noopener noreferrer">{l.title}<ArrowUpRight size={14}/></a><small>{l.href}</small><button type="button" onClick={()=>onOpenPage(l.page_id)}>{l.visibility==='public'?<Globe size={12}/>:<Lock size={12}/>}Dans {l.page_title}</button></div></article>)}{links?.length===0&&<p>Aucun lien enregistré pour le moment.</p>}</div>:<>{children(items)}{!items.length&&<p className="empty-list">Aucun fichier dans cette sélection.</p>}</>}
 </div>;
}
