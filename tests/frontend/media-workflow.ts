import assert from 'node:assert/strict';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ToggleHeading } from '../../frontend/src/ToggleHeading';
import { FileBlock,ResizableImage } from '../../frontend/src/nodes';
import { blockJsonPaths,movableBlocks } from '../../frontend/src/block-moving';
import { uploadPositionPlugin,uploadKey,uploadedNode,insertUploadedFiles } from '../../frontend/src/EditorFileDrop';
import { readThemePreference,storeThemePreference,applyThemePreference } from '../../frontend/src/ThemeToggle';
import { defaultAppearance } from '../../frontend/src/types';
const data=new Map<string,string>();(globalThis as any).localStorage={getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)};
assert.equal(readThemePreference(),'system');storeThemePreference('oled');assert.equal(readThemePreference(),'oled');storeThemePreference(null);assert.equal(readThemePreference(),null);storeThemePreference('system');assert.equal(readThemePreference(),'system');
assert.equal(applyThemePreference(defaultAppearance,'system',true).mode,'dark');assert.equal(applyThemePreference(defaultAppearance,'system',false).mode,'light');assert.equal(applyThemePreference(defaultAppearance,'light',true).mode,'light');assert.equal(applyThemePreference(defaultAppearance,'oled',false).background,'#000000');assert.equal(applyThemePreference(defaultAppearance,null,true),defaultAppearance);
const p=(text:string)=>({type:'paragraph',content:[{type:'text',text}]});
const editor=new Editor({element:null,extensions:[StarterKit,ToggleHeading,FileBlock,ResizableImage],content:{type:'doc',content:[p('A'),{type:'toggleHeading',content:[{type:'heading',attrs:{level:2}},p('B')]},p('C')]}});
const blocks=movableBlocks(editor.state.doc);const inside=blocks.find(b=>b.node.textContent==='B'&&b.node.type.name==='paragraph')!;const parent=blocks.find(b=>b.node.type.name==='toggleHeading')!;
assert.deepEqual(blockJsonPaths(editor.state.doc,[inside.pos]),[[1,1]]);assert.deepEqual(blockJsonPaths(editor.state.doc,[inside.pos,parent.pos,0]),[[0],[1]]);
editor.registerPlugin(uploadPositionPlugin());let state=editor.state;state=state.apply(state.tr.setMeta(uploadKey,{pos:3,label:'Upload'}));state=state.apply(state.tr.insertText('More',1));assert.equal(uploadKey.getState(state)?.pos,7);state=state.apply(state.tr.delete(0,state.doc.content.size));assert.equal(uploadKey.getState(state),null);
for(const [mime,type,mode] of [['application/pdf','fileBlock','pdf'],['video/mp4','fileBlock','video'],['audio/mpeg','fileBlock','audio'],['application/zip','fileBlock','download'],['image/png','image','']]){const json=uploadedNode({id:'id',name:'File',mime,size:12,url:''});assert.equal(json.type,type);if(type==='fileBlock')assert.equal((json.attrs as any).mode,mode);const node=editor.schema.nodeFromJSON(json);node.check();assert.equal(node.attrs.fileId,'id');}
console.log('Media workflow checks passed: JSON paths, ancestor deduplication, pending upload anchor mapping, schema insertion and system/manual theme preferences');
// Execute the actual public theme script with OS and storage events, without a browser.
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
let osDark=true;const listeners:Record<string,Function>={},osListeners:Function[]=[];
const style:any={setProperty(k:string,v:string){this[k]=v;},getPropertyValue(k:string){return this[k]||'';}};
const body:any={dataset:{baseMode:'light'},style,getAttribute:()=>'',setAttribute:()=>{}};
const windowMock:any={addEventListener:(n:string,f:Function)=>listeners[n]=f};
const documentMock:any={body,documentElement:{style:{}},querySelectorAll:()=>[],addEventListener:()=>{}};
data.clear();
runInNewContext(readFileSync('public/theme.js','utf8'),{window:windowMock,document:documentMock,localStorage:(globalThis as any).localStorage,matchMedia:()=>({get matches(){return osDark},addEventListener:(_n:string,f:Function)=>osListeners.push(f)})});
assert.equal(body.dataset.theme,'dark');osDark=false;osListeners[0]();assert.equal(body.dataset.theme,'light');
storeThemePreference('oled');listeners.storage({key:'feuillet.theme'});assert.equal(body.dataset.theme,'oled');osDark=true;osListeners[0]();assert.equal(body.dataset.theme,'oled');
storeThemePreference(null);windowMock.FeuilletReaderTheme.setBase('','dark');assert.equal(body.dataset.theme,'dark');
console.log('Public theme script passed: system default, OS changes, manual persistence and author theme');

const original=editor.state.doc;const tr=insertUploadedFiles(editor.state,[{id:'one',name:'Premier.pdf',mime:'application/pdf',size:12,url:''},{id:'two',name:'Second.zip',mime:'application/zip',size:3,url:''}],original.content.size)!;assert.ok(tr);assert.equal(tr.doc.child(tr.doc.childCount-3).attrs.fileId,'one');assert.equal(tr.doc.child(tr.doc.childCount-2).attrs.fileId,'two');assert.equal(tr.doc.lastChild!.type.name,'paragraph');assert.ok(tr.doc.content.size>original.content.size);assert.equal(editor.state.doc,original);
console.log('Batch file insertion passed: Finder order, source text preserved, valid trailing paragraph and one atomic insertion');
