import assert from 'node:assert/strict';
import { editableDocument } from '../../frontend/src/types';
const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }, { type: 'text', text: 'Cours conservé' }] }] };
const clean = editableDocument(doc as any);
assert.equal(clean.content[0].content.length, 1);
assert.equal(clean.content[0].content[0].text, 'Cours conservé');
assert.equal(doc.content[0].content.length, 2);
console.log('3/3 empty text document checks passed');
