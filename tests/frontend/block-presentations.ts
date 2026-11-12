import assert from 'node:assert/strict';
import {reshapeColumns,Columns,PageLink,linkPreviewPatch,linkPresentationContent, transformSelectedLink,FileBlock} from '../../frontend/src/nodes';
globalThis.location={href:'https://feuillet.test/index.php'};
const uri='https://example.org/cours';
const button=linkPresentationContent('button',uri,'Cours');
assert.deepEqual(button,{type:'buttonLink',attrs:{href:uri,label:'Cours'}});
const card=linkPresentationContent('card',uri,'Cours','Description écrite');
assert.deepEqual(card.attrs,{href:uri,title:'Cours',description:'Description écrite',source:uri});
const inline=linkPresentationContent('inline',uri,'Cours');
assert.equal(inline.content[0].text,'Cours');assert.equal(inline.content[0].marks[0].attrs.href,uri);
let content,range;
const editor={getAttributes:()=>({href:uri}),commands:{extendMarkRange:()=>true},state:{selection:{from:4,to:9},doc:{textBetween:()=> 'Cours'}},chain:()=>({focus(){return this},insertContentAt(r,c){range=r;content=c;return this},run:()=>true})};
assert.equal(transformSelectedLink(editor,'button'),true);assert.deepEqual(range,{from:4,to:9});assert.equal(content.type,'buttonLink');
assert.equal(transformSelectedLink({...editor,getAttributes:()=>({href:'javascript:alert(1)'})},'card'),false);
assert.equal(FileBlock.config.addAttributes().mode.default,'download');
console.log('6/6 block presentation checks passed');

const before={href:uri,title:'Titre',description:'',iconId:'',icon:'↗',posterId:'',previewUrl:''};
const meta={title:'Article',description:'Résumé',iconId:'icon-id',posterId:'image-id'};
assert.deepEqual(linkPreviewPatch(before,before,meta),{metadataHref:uri,...meta,previewUrl:''});
assert.deepEqual(linkPreviewPatch(before,{...before,title:'Manuel',icon:'🌐',previewUrl:'https://example.org/manual.png'},meta),{metadataHref:uri,description:'Résumé'});
assert.equal(linkPreviewPatch(before,before,{}).title,undefined);
console.log('Metadata application preserves concurrent manual edits and missing fields');

const cols=[{type:'column',content:[{type:'paragraph',content:[{type:'text',text:'A'}]}]},{type:'column',content:[{type:'paragraph',content:[{type:'text',text:'B'}]}]},{type:'column',content:[{type:'paragraph',content:[{type:'text',text:'C'}]}]}];
const merged=reshapeColumns(cols,2);assert.equal(merged.length,2);assert.equal(merged[1].content.length,2);assert.equal(cols.length,3);assert.equal(cols[1].content.length,1);
assert.equal(reshapeColumns(cols,4)[3].content[0].type,'paragraph');assert.equal(Columns.config.content,'column{2,4}');assert.equal(PageLink.config.addAttributes().presentation.default,'row');
console.log('Subpage defaults and column reshape preserve content');

import {ButtonLink,FormEmbed} from '../../frontend/src/nodes';
import {buttonClasses} from '../../frontend/src/ButtonAppearance';
assert.equal(ButtonLink.config.addAttributes().buttonStyle.default,'soft');
assert.equal(FormEmbed.config.addAttributes().buttonSize.default,'regular');
const styled=linkPresentationContent('button',uri,'Déposer','',{buttonStyle:'solid',buttonSize:'large'});
assert.equal(styled.attrs.buttonStyle,'solid');assert.equal(styled.attrs.buttonSize,'large');
assert.equal(buttonClasses({buttonStyle:'evil',buttonSize:'evil'}),'resource-button feuillet-action action-soft action-regular');
console.log('Shared action styles, defaults and link transforms preserve button appearance');
