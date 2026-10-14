import assert from 'node:assert/strict';
import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { ToggleHeading, toggleHeadingCommand, unwrapToggleHeading } from '../../frontend/src/ToggleHeading';
let checks=0;
for(const level of [1,2,3] as const) {
  const before={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Un titre',marks:[{type:'bold'}]}]},{type:'paragraph',content:[{type:'text',text:'Le voisin conservé'}]}]};
  const editor=new Editor({element:null,extensions:[StarterKit,ToggleHeading],content:before});
  const tr=editor.state.tr;
  tr.setSelection(TextSelection.create(tr.doc,3));
  assert.ok(toggleHeadingCommand(level)({tr,dispatch:()=>{}} as any));checks++;
  assert.equal(tr.doc.child(0).type.name,'toggleHeading');checks++;
  assert.equal(tr.doc.child(0).firstChild?.attrs.level,level);checks++;
  assert.equal(tr.doc.child(0).firstChild?.firstChild?.marks[0].type.name,'bold');checks++;
  assert.equal(tr.doc.child(1).textContent,'Le voisin conservé');checks++;
  assert.ok(toggleHeadingCommand(2)({tr,dispatch:()=>{}} as any));
  assert.equal(tr.doc.child(0).childCount,2);checks++;
  const roundtrip=editor.schema.nodeFromJSON(tr.doc.toJSON());roundtrip.check();
  assert.deepEqual(roundtrip.toJSON(),tr.doc.toJSON());checks++;
  assert.ok(unwrapToggleHeading({tr,dispatch:()=>{}} as any));
  assert.equal(tr.doc.childCount,3);checks++;
  assert.equal(tr.doc.child(0).firstChild?.marks[0].type.name,'bold');checks++;
  assert.equal(tr.doc.child(2).textContent,'Le voisin conservé');checks++;
}
console.log(`${checks}/${checks} actual Tiptap collapsible heading checks passed`);
