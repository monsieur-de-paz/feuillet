import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { ArrowLeft, Check } from 'lucide-react';
import { FloatingSurface } from './FloatingSurface';
import { tableTones, templateCell, type TableTemplate, type TableTone } from './table-formatting';
import { tablePreviewKey, tablePreviewPlugin } from './table-template-preview';
import './table-template-picker.css';
const templates: [TableTemplate,string,string][] = [
  ['top','En-tête en haut','Simple entrée'],
  ['left','En-tête à gauche','Simple entrée'],
  ['double','Double entrée','En haut et à gauche'],
  ['striped','Lignes alternées','Lecture facilitée'],
  ['plain','Neutre','Sans couleur ni en-tête'],
];
export function TableTemplatePicker({editor,pos,point,onClose,onBack,onApply}:{editor:Editor;pos:number;point:{x:number;y:number};onClose:()=>void;onBack:()=>void;onApply:(template:TableTemplate,tone:TableTone)=>void}) {
  const [tone,setTone] = useState<TableTone>('blue');
  const [active,setActive] = useState<TableTemplate>('top');
  const [previewing,setPreviewing] = useState(false);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    editor.registerPlugin(tablePreviewPlugin());
    return () => { if (!editor.isDestroyed) editor.unregisterPlugin(tablePreviewKey); };
  },[editor]);
  useLayoutEffect(() => { back.current?.focus({preventScroll:true}); },[]);
  function preview(template:TableTemplate,color=tone) {
    setActive(template);setPreviewing(true);
    editor.view.dispatch(editor.state.tr.setMeta(tablePreviewKey,{pos,template,tone:color}).setMeta('addToHistory',false));
  }
  function clear() {
    setPreviewing(false);
    if(!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(tablePreviewKey,null).setMeta('addToHistory',false));
  }
  return <FloatingSurface point={point} label="Modèles de tableau" role="dialog" className="table-template-picker" onClose={onClose}>
    <div onPointerLeave={clear}>
      <header><button ref={back} type="button" className="icon-button" aria-label="Retour aux actions du tableau" onClick={onBack}><ArrowLeft size={18}/></button><div><strong>Habiller le tableau</strong><p>Survole pour prévisualiser. Clique pour appliquer.</p></div></header>
      <fieldset className="table-template-tones"><legend>Palette</legend><div>{tableTones.map(([color,label])=><button key={color} type="button" title={label} aria-label={label} aria-pressed={tone===color} data-cell-tone={color} className="table-template-tone" onMouseEnter={()=>preview(active,color)} onFocus={()=>preview(active,color)} onClick={()=>{setTone(color);preview(active,color);}}>{tone===color&&<Check size={14}/>}</button>)}</div></fieldset>
      <div className="table-template-grid">{templates.map(([template,label,description])=><button key={template} type="button" className="table-template-card" data-active={previewing&&active===template} onMouseEnter={()=>preview(template)} onFocus={()=>preview(template)} onClick={()=>onApply(template,tone)}>
        <span aria-hidden="true" className="table-template-mini" data-cell-tone={tone}>{Array.from({length:12},(_,i)=>{const {header,colored}=templateCell({top:Math.floor(i/4),left:i%4},template);return <i key={i} data-filled={colored} data-strong={header}/>;})}</span>
        <strong>{label}</strong><small>{description}</small>
      </button>)}</div>
      <footer><span role="status">{previewing?'Aperçu temporaire':'Aucune modification enregistrée'}</span><button type="button" className="primary" onClick={()=>onApply(active,tone)}>Appliquer</button></footer>
    </div>
  </FloatingSurface>;
}
