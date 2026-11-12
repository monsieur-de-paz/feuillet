import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { EditorState } from "@tiptap/pm/state";
import { history, undo, redo } from "@tiptap/pm/history";
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

// A live preview is a decoration, never a document edit or an undo step.
const {tablePreviewKey,tablePreviewPlugin}=await import("../../frontend/src/table-template-preview");
state=EditorState.create({schema:editor.schema,doc,plugins:[history(),tablePreviewPlugin()]});
const before=state.doc;
dispatch(state.tr.setMeta(tablePreviewKey,{pos:0,template:"double",tone:"blue"}).setMeta('addToHistory',false));
assert.ok(state.doc.eq(before));assert.equal(tablePreviewKey.getState(state)!.find().length,9);
dispatch(state.tr.setMeta(tablePreviewKey,null));assert.equal(tablePreviewKey.getState(state)!.find().length,0);
assert.equal(undo(state),false);
console.log("Table preview: document and undo untouched; decorations cleared on dismissal");

const {sortTableRows,tableNumber,tableHeaderRows,tableSortInfo}=await import("../../frontend/src/table-sorting");
const sortCell=(text:string,header=false,attrs={})=>({type:header?'tableHeader':'tableCell',attrs,content:[{type:'paragraph',content:text?[{type:'text',text,marks:[{type:'bold'}]}]:[]}]});
function sortDoc(rows:string[][],header=true) {
  return editor.schema.nodeFromJSON({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Before'}]},{type:'table',content:rows.map((row,i)=>({type:'tableRow',content:row.map((text,j)=>sortCell(text,header&&i===0,{cellTone:j===0?'blue':null,colwidth:[140+j*20]}))}))},{type:'paragraph',content:[{type:'text',text:'After'}]}]});
}
const numericDoc=sortDoc([['Nom','Quantité'],['Dix','10'],['Deux','2'],['Vide',''],['Moins','−3'],['Virgule','1,5'],['Deux bis','2']]);
const sortPos=numericDoc.firstChild!.nodeSize;
const labels=()=>Array.from({length:state.doc.child(1).childCount},(_,i)=>state.doc.child(1).child(i).firstChild!.textContent);
const resetSort=(doc=numericDoc)=>{state=EditorState.create({schema:editor.schema,doc,plugins:[history()]});};
const opts={column:1,mode:'auto' as const,direction:'asc' as const,headerRows:1};
resetSort();
assert.equal(tableSortInfo(state.doc.child(1),opts).mode,'number');
assert.equal(tableHeaderRows(state.doc.child(1)),1);
assert.ok(sortTableRows(sortPos,opts)(state,dispatch));
assert.deepEqual(labels(),['Nom','Moins','Virgule','Deux','Deux bis','Dix','Vide']);
const originalRows=new Map(Array.from({length:numericDoc.child(1).childCount},(_,i)=>{const row=numericDoc.child(1).child(i);return [row.firstChild!.textContent,row.toJSON()]}));
state.doc.child(1).forEach(row=>assert.deepEqual(row.toJSON(),originalRows.get(row.firstChild!.textContent),'Entire rows retain marks, colors and widths'));
assert.ok(state.doc.firstChild!.eq(numericDoc.firstChild!));assert.ok(state.doc.lastChild!.eq(numericDoc.lastChild!));
assert.ok((state.selection as CellSelection).isColSelection());state.doc.check();
const ascending=state.doc;
assert.ok(undo(state,dispatch));assert.ok(state.doc.eq(numericDoc));
assert.ok(redo(state,dispatch));assert.ok(state.doc.eq(ascending));
resetSort();assert.ok(sortTableRows(sortPos,{...opts,direction:'desc'})(state,dispatch));
assert.deepEqual(labels(),['Nom','Dix','Deux','Deux bis','Virgule','Moins','Vide']);

resetSort(sortDoc([['Titre','Valeur'],['Zèbre','3'],['école','2'],['Éclair','1'],['abeille','4'],['','0']]));
assert.ok(sortTableRows(sortPos,{...opts,column:0,mode:'text'})(state,dispatch));
assert.deepEqual(labels(),['Titre','abeille','Éclair','école','Zèbre','']);
resetSort(sortDoc([['Nom','Valeur'],['Chapitre 10','2'],['Chapitre 2','10'],['Chapitre 1','texte']]));
assert.ok(sortTableRows(sortPos,{...opts,column:0})(state,dispatch));
assert.deepEqual(labels(),['Nom','Chapitre 1','Chapitre 2','Chapitre 10']);
resetSort(sortDoc([['Nom','Valeur'],['Inconnu','n/a'],['Petit','2'],['Vide',''],['Grand','10']]));
assert.ok(sortTableRows(sortPos,{...opts,mode:'number',direction:'desc'})(state,dispatch));
assert.deepEqual(labels(),['Nom','Grand','Petit','Inconnu','Vide']);
resetSort(sortDoc([['Dix','10'],['Deux','2']],false));
assert.ok(sortTableRows(sortPos,{...opts,headerRows:0})(state,dispatch));assert.deepEqual(labels(),['Deux','Dix']);

const horizontal=editor.schema.nodeFromJSON({type:'doc',content:[{type:'table',content:[
 {type:'tableRow',content:[sortCell('En-tête',true,{colspan:2})]},
 {type:'tableRow',content:[sortCell('10',false,{colspan:2})]},
 {type:'tableRow',content:[sortCell('2'),sortCell('2')]},
]}]});
state=EditorState.create({schema:editor.schema,doc:horizontal});
assert.ok(sortTableRows(0,opts)(state,dispatch));assert.equal(state.doc.firstChild!.child(2).firstChild!.attrs.colspan,2);
assert.equal(state.doc.firstChild!.child(1).firstChild!.textContent,'2');assert.equal(TableMap.get(state.doc.firstChild!).problems,null);state.doc.check();
state=EditorState.create({schema:editor.schema,doc:merged});const untouched=state.doc;
assert.match(tableSortInfo(state.doc.firstChild!,{...opts,headerRows:0}).error,/plusieurs lignes/);
assert.equal(sortTableRows(0,{...opts,headerRows:0})(state,dispatch),false);assert.ok(state.doc.eq(untouched));
resetSort();
assert.equal(sortTableRows(sortPos,{...opts,column:999})(state,dispatch),false);
assert.equal(sortTableRows(sortPos,{...opts,headerRows:999})(state,dispatch),false);
assert.equal(sortTableRows(-1,opts)(state,dispatch),false);
assert.equal(sortTableRows(999999,opts)(state,dispatch),false);
assert.equal(sortTableRows(NaN,opts)(state,dispatch),false);
const twoHeaders=editor.schema.nodeFromJSON({type:'doc',content:[{type:'table',content:[
 {type:'tableRow',content:[sortCell('Groupe',true),sortCell('Quantité',true)]},
 {type:'tableRow',content:[sortCell('Nom',true),sortCell('Valeur',true)]},
 {type:'tableRow',content:[sortCell('Dix'),sortCell('10')]},
 {type:'tableRow',content:[sortCell('Deux'),sortCell('2')]},
]}]});
state=EditorState.create({schema:editor.schema,doc:twoHeaders});
assert.equal(tableHeaderRows(state.doc.firstChild!),2);
assert.ok(sortTableRows(0,{...opts,headerRows:2})(state,dispatch));
assert.ok(state.doc.firstChild!.child(0).eq(twoHeaders.firstChild!.child(0)));
assert.ok(state.doc.firstChild!.child(1).eq(twoHeaders.firstChild!.child(1)));
assert.equal(state.doc.firstChild!.child(2).firstChild!.textContent,'Deux');
for(const [text,number] of [['1 234,50 €',1234.5],['1\u202f234,50',1234.5],['1,234.50',1234.5],['1.234,50',1234.5],['−2,5',-2.5],['0',0],['1e3',1000],['1.234.567',1234567],['',null],['12 choses',null],['1.2.3',null],['Infinity',null],['1e9999',null]] as const)assert.equal(tableNumber(text),number,text);
console.log('Table sorting: numeric/text, accents, natural order, stable ties, blanks, intact rows, headers, merges, undo/redo and boundaries passed');
