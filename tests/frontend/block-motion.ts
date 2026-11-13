import assert from 'node:assert/strict';
import {Editor} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {TextSelection} from '@tiptap/pm/state';
import {splitBlock,joinBackward} from '@tiptap/pm/commands';
import {splitListItem} from '@tiptap/pm/schema-list';
import {BlockMotion} from '../../frontend/src/block-motion';
import {moveBlock} from '../../frontend/src/block-moving';
const p=(text:string)=>({type:'paragraph',content:[{type:'text',text}]});
// Real ProseMirror documents/commands; only layout and the animation clock are simulated.
const editor=new Editor({element:null,extensions:[StarterKit],content:{type:'doc',content:[p('A'),p('B'),p('C')]}});
const events=new Map<string,()=>void>(),frames=new Map<number,()=>void>();
let tick=0,played=0,cancelled=0;
class Element {
 top=0;
 contains(other:any){return this===other;}
 getBoundingClientRect(){return {top:this.top,left:0,bottom:this.top+20,height:20};}
 animate(){played++;return {finished:new Promise(()=>{}),cancel(){cancelled++;}};}
 addEventListener(n:string,fn:()=>void){events.set('view:'+n,fn);}
 removeEventListener(n:string){events.delete('view:'+n);}
}
const docEvents=new Map<string,()=>void>();
Object.assign(globalThis,{HTMLElement:Element,innerHeight:1000,document:{hidden:false,body:{classList:{contains:()=>false}},addEventListener:(n:string,fn:()=>void)=>docEvents.set(n,fn),removeEventListener:(n:string)=>docEvents.delete(n)},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:(fn:()=>void)=>{frames.set(++tick,fn);return tick;},cancelAnimationFrame:(id:number)=>frames.delete(id)});
const doms=new Map<any,Element>();
const view:any={state:editor.state,dom:new Element(),nodeDOM(pos:number){const node=this.state.doc.nodeAt(pos);if(!doms.has(node))doms.set(node,new Element());const el=doms.get(node)!;el.top=pos*10;return el;}};
const plugins=(BlockMotion.config.addProseMirrorPlugins as any).call({});
const motion=plugins[0].spec.view(view);
function flush(){const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn());}
function apply(tr:any){const previous=view.state;view.state=view.state.apply(tr);motion.update(view,previous);flush();view.state.doc.check();}
function command(fn:any){assert.ok(fn(view.state,(tr:any)=>apply(tr)));}
function select(pos:number){apply(view.state.tr.setSelection(TextSelection.create(view.state.doc,pos)));}
function writing(event='keydown'){events.get('view:'+event)!();}
writing();select(2);command(splitBlock);
assert.equal(view.state.doc.childCount,4);assert.equal(played,0,'Enter must not animate the new paragraph or following blocks');
select(4);writing();command(joinBackward);
assert.equal(view.state.doc.childCount,3);assert.equal(played,0,'Backspace joining paragraphs must stay still');
const list=view.state.schema.nodeFromJSON({type:'doc',content:[{type:'bulletList',content:[{type:'listItem',content:[p('Item')]},{type:'listItem',content:[p('Next')]}]},p('After')]});
writing('beforeinput');apply(view.state.tr.replaceWith(0,view.state.doc.content.size,list.content));select(7);
writing();command(splitListItem(view.state.schema.nodes.listItem));
assert.equal(view.state.doc.firstChild.childCount,3);assert.equal(played,0,'Enter in a bullet list must stay still');
select(11);writing('beforeinput');command(joinBackward);
assert.equal(view.state.doc.firstChild.childCount,2);assert.equal(played,0,'Native delete in a list must stay still');
// A pointer gesture starts a new deliberate block interaction.
docEvents.get('pointerdown')!();
const end=view.state.doc.content.size,last=view.state.doc.lastChild.nodeSize;
const moved=moveBlock(view.state,end-last,0);assert.ok(moved);apply(moved);
assert.ok(played>0,'pointer block moves keep their gentle layout transition');
writing('compositionstart');assert.equal(cancelled,played,'typing cancels any transition already running');
motion.destroy();assert.equal(events.size,0);assert.equal(docEvents.size,0);
console.log('Block motion: real Enter/split, Backspace/join and bullet-list commands stay still; pointer moves animate; typing cancels motion and listeners are cleaned up');
