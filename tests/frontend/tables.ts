import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorState } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import { TableMap, CellSelection, addRowAfter, addColumnAfter, deleteRow, deleteColumn, mergeCells, splitCell } from "@tiptap/pm/tables";
import { ColoredTableCell, ColoredTableHeader, colorTableCells, styleTable } from "../../frontend/src/table-formatting";
import { selectTableAxis } from "../../frontend/src/table-selection";

const editor = new Editor({element:null, extensions:[StarterKit,Table,TableRow,ColoredTableHeader,ColoredTableCell],content:{type:"doc",content:[{type:"paragraph"}]}});
const cell = (text:string, attrs={}) => ({type:"tableCell",attrs,content:[{type:"paragraph",content:[{type:"text",text}]}]});
const doc = editor.schema.nodeFromJSON({type:"doc",content:[{type:"table",content:[
  {type:"tableRow",content:[cell("A"),cell("B"),cell("C")]},
  {type:"tableRow",content:[cell("D"),cell("E"),cell("F")]},
  {type:"tableRow",content:[cell("G"),cell("H"),cell("I")]},
]}]});
let state=EditorState.create({schema:editor.schema,doc,plugins:[history()]});
const dispatch=(tr:any)=>{state=state.apply(tr)};
const select=(axis:"row"|"column"|"table",index=0,anchor=index)=>{
  const tr=selectTableAxis(state,0,axis,index,anchor);assert.ok(tr);dispatch(tr);
};
select("row",1);
assert.ok((state.selection as CellSelection).isRowSelection());
assert.ok(deleteRow(state,dispatch));
assert.equal(state.doc.firstChild!.textContent,"ABCGHI");
assert.ok(undo(state,dispatch));
assert.ok(state.doc.eq(doc),"Undo restores the full row contents");
select("column",2,1);
assert.ok((state.selection as CellSelection).isColSelection());
assert.ok(deleteColumn(state,dispatch));
assert.equal(TableMap.get(state.doc.firstChild!).width,1);
assert.equal(state.doc.firstChild!.textContent,"ADG");

const merged=editor.schema.nodeFromJSON({type:"doc",content:[{type:"table",content:[
  {type:"tableRow",content:[cell("Large",{colspan:2}),cell("Last")]},
  {type:"tableRow",content:[cell("Tall",{rowspan:2}),cell("Middle"),cell("Right")]},
  {type:"tableRow",content:[cell("Bottom"),cell("Corner")]},
]}]});
state=EditorState.create({schema:editor.schema,doc:merged});
select("row",2);assert.ok(addRowAfter(state,dispatch));
assert.equal(TableMap.get(state.doc.firstChild!).height,4);
select("column",2);assert.ok(addColumnAfter(state,dispatch));
assert.equal(TableMap.get(state.doc.firstChild!).width,4);
assert.equal(state.doc.firstChild!.textContent,merged.firstChild!.textContent,"Appends preserve merged cells and their contents");
select("table");assert.ok(mergeCells(state,dispatch));
assert.equal(state.doc.firstChild!.childCount,4);
assert.ok(splitCell(state,dispatch));
assert.equal(TableMap.get(state.doc.firstChild!).width,4);
state.doc.check();
assert.equal(selectTableAxis(state,0,"row",999),null);
assert.equal(selectTableAxis(state,999999,"column",0),null);
console.log("Tables: whole rows/columns, ranges, deletion/undo, merged cells, append and merge/split passed");

state=EditorState.create({schema:editor.schema,doc,plugins:[history()]});
select("row",1);assert.ok(colorTableCells("violet")(state,dispatch));
assert.equal(state.doc.firstChild!.child(1).child(0).attrs.cellTone,"violet");
assert.equal(state.doc.firstChild!.child(0).child(0).attrs.cellTone,null);
assert.ok(styleTable("double","blue")(state,dispatch));
assert.equal(state.doc.firstChild!.child(0).child(2).type.name,"tableHeader");
assert.equal(state.doc.firstChild!.child(2).child(0).type.name,"tableHeader");
assert.equal(state.doc.firstChild!.child(2).child(1).type.name,"tableCell");
assert.equal(state.doc.firstChild!.child(2).child(1).attrs.cellTone,null);
assert.equal(state.doc.textContent,doc.textContent);
assert.ok(styleTable("plain")(state,dispatch));
assert.equal(state.doc.firstChild!.child(0).child(0).attrs.cellTone,null);
assert.ok(undo(state,dispatch));
state=EditorState.create({schema:editor.schema,doc:merged});select("table");
assert.ok(styleTable("left","green")(state,dispatch));state.doc.check();
assert.equal(state.doc.firstChild!.firstChild!.firstChild!.attrs.colspan,2);
assert.equal(state.doc.textContent,merged.textContent);
console.log("Table colours: scoped selections, double entry, reset, undo and merged content preserved");
