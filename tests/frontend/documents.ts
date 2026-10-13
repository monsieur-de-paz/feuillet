import assert from 'node:assert/strict';
import { editableDocument } from '../../frontend/src/types';
const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }, { type: 'text', text: 'Cours conservé' }] }] };
const clean = editableDocument(doc as any);
assert.equal(clean.content[0].content.length, 1);
assert.equal(clean.content[0].content[0].text, 'Cours conservé');
assert.equal(doc.content[0].content.length, 2);


const styled = {type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Default',marks:[{type:'bold'},{type:'textStyle',attrs:{color:'#37352F'}}]},{type:'text',text:'Red',marks:[{type:'textStyle',attrs:{color:'#D44C47'}}]}]}]};
const adaptive = editableDocument(styled as any);
assert.equal(adaptive.content[0].content[0].marks.length,1);
assert.equal(adaptive.content[0].content[0].marks[0].type,'bold');
assert.equal(adaptive.content[0].content[1].marks[0].attrs.color,'#D44C47');
assert.equal(styled.content[0].content[0].marks.length,2);
assert.equal(adaptive.content[0].content[0].text,'Default');
console.log('8/8 document and adaptive text checks passed');
