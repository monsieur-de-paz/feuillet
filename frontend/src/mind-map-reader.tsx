import {createRoot,type Root} from 'react-dom/client';
const roots=new Map<Element,Root>();
let loading=false;
async function mount(){for(const [el,root] of roots)if(!el.isConnected){root.unmount();roots.delete(el);}const pending=[...document.querySelectorAll<HTMLElement>('[data-mind-map-data]')].filter(el=>!roots.has(el));if(!pending.length||loading)return;loading=true;try{const {MindMap}=await import('./MindMap');for(const el of pending){if(!el.isConnected||roots.has(el))continue;try{const data=JSON.parse(el.dataset.mindMapData||'');const root=createRoot(el);roots.set(el,root);root.render(<MindMap data={data}/>);}catch{el.textContent='Carte mentale indisponible.';}}}finally{loading=false;}}
void mount();new MutationObserver(()=>void mount()).observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
