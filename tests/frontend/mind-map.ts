import assert from "node:assert/strict";
import {
  makeMap,
  defaultFolds,
  visibleMapNodes,
  switchTheme,
  switchLayout,
  canParent,
  childIdea,
  appendChildRows,
  setChildSide,
} from "../../frontend/src/mind-map-model";
import { nodeHeight, linkPath, underlined } from "../../frontend/src/mind-map-geometry";
let map = makeMap();
map.nodes[1].x = 432;
map.nodes[1].y = -212;
const original = structuredClone(map);
const parents = map.nodes.map((n) => n.parent);
for (const layout of ["flow", "org", "tree", "radial", "flow", "radial"]) {
  map = switchLayout(map, layout);
  assert.deepEqual(
    map.nodes.map((n) => n.parent),
    parents,
  );
  assert.deepEqual(map.links, original.links);
}
assert.equal(map.nodes[1].x, 432);
assert.equal(map.nodes[1].y, -212);
const org = switchLayout(map, "org");
org.nodes[2].x = 999;
const back = switchLayout(switchLayout(org, "tree"), "org");
assert.equal(back.nodes[2].x, 999);
assert.deepEqual(
  original.nodes.map((n) => n.parent),
  parents,
);
assert.equal(canParent(map, map.nodes[0].id, map.nodes[1].id), false);
assert.equal(canParent(map, map.nodes[1].id, map.nodes[0].id), true);
const child = childIdea(map, map.nodes[1].id)!;
assert.equal(child.parent, map.nodes[1].id);
assert.ok(!map.nodes.some((n) => n.id === child.id));
const withChild = { ...map, nodes: [...map.nodes, child] };
assert.equal(canParent(withChild, map.nodes[1].id, child.id), false);
assert.equal(switchLayout(withChild, "flow").nodes.length, 6);
const limit = {
  ...map,
  nodes: Array.from({ length: 300 }, () => map.nodes[0]),
};
assert.equal(childIdea(limit, map.nodes[0].id), null);
console.log(
  "PASS layout round-trips preserve topology and manual positions, including children and cycle checks",
);

const styled = makeMap();
styled.nodes[1].note = "Un contenu conservé";
styled.nodes[1].x = 1111;
const themed = switchTheme(
  switchTheme(switchTheme(styled, "branches"), "organic"),
  "cards",
);
assert.deepEqual(themed.nodes, styled.nodes);
assert.equal(themed.layout, styled.layout);
assert.equal(themed.theme, "cards");
for (const theme of ["branches", "organic", "classic"]) {
  let m = switchTheme(styled, theme);
  for (let depth = 0; depth < 5; depth++) {
    const parent = m.nodes.at(-1)!;
    const next = childIdea(m, parent.id)!;
    assert.equal(next.parent, parent.id);
    assert.equal(next.note, "");
    m = { ...m, nodes: [...m.nodes, next] };
  }
  assert.equal(m.nodes.length, 10);
  assert.deepEqual(
    m.nodes.slice(0, 5).map((n) => n.parent),
    styled.nodes.map((n) => n.parent),
  );
}
console.log(
  "PASS visual templates preserve text, notes, parents and manual layouts; nested children in every style",
);

const hierarchy = makeMap();
const nested = childIdea(hierarchy, hierarchy.nodes[1].id)!;
hierarchy.nodes.push(nested);
hierarchy.theme = "organic";
const folded = defaultFolds(hierarchy);
assert.ok(folded.includes(hierarchy.nodes[1].id));
assert.ok(!visibleMapNodes(hierarchy, folded).some((n) => n.id === nested.id));
assert.ok(visibleMapNodes(hierarchy, []).some((n) => n.id === nested.id));
assert.equal(childIdea(hierarchy, nested.id)?.parent, nested.id);
console.log(
  "PASS folds retain hierarchy and allow new children at every depth",
);

for (const theme of ["cards", "branches", "organic", "classic"]) {
  const source = { ...makeMap(), theme };
  const parent = source.nodes[1];
  const before = structuredClone(source);
  let rows = appendChildRows(source, parent.id, ["Observer", "Comparer", "", "Choisir"], "below");
  const added = rows.nodes.filter(n => n.parent === parent.id);
  assert.deepEqual(added.map(n => n.text), ["Observer", "Comparer", "Choisir"]);
  assert.ok(added.every(n => n.row && Math.abs(n.x - parent.x - 44) < 0.001 && n.y > parent.y));
  for (let i = 1; i < added.length; i++) {
    assert.ok(added[i].y - nodeHeight(added[i], theme) / 2 > added[i-1].y + nodeHeight(added[i-1], theme) / 2);
  }
  const nestedRows = appendChildRows(rows, added[0].id, ["Sous-niveau", "Autre détail"], "below");
  rows = setChildSide(nestedRows, parent.id, "above");
  assert.ok(rows.nodes.filter(n => n.parent === parent.id).every(n => n.y < parent.y));
  assert.deepEqual(rows.nodes.map(n => [n.id,n.parent,n.text]), nestedRows.nodes.map(n => [n.id,n.parent,n.text]));
  // Whole child subtrees are stacked, not only their first nodes.
  const first = rows.nodes.find(n => n.id === added[0].id)!;
  const second = rows.nodes.find(n => n.id === added[1].id)!;
  assert.ok(second.y + nodeHeight(second,theme)/2 < first.y - nodeHeight(first,theme)/2);
  assert.ok(underlined(rows, first));
  assert.ok(linkPath(rows, rows.nodes.find(n=>n.id===parent.id)!, first).includes(" V"));
  const reset = setChildSide(rows, parent.id, "auto");
  assert.ok(reset.nodes.filter(n => n.parent === parent.id).every(n => !n.row));
  assert.deepEqual(source, before);
  assert.equal(rows.nodes.find(n=>n.id===source.nodes[2].id)?.text, source.nodes[2].text);
}
const collisionSource = makeMap("tree");
collisionSource.nodes[1].x=350; collisionSource.nodes[1].y=-190;
collisionSource.nodes[2].x=350; collisionSource.nodes[2].y=100;
const room = appendChildRows(collisionSource,collisionSource.nodes[1].id,["Un","Deux","Trois","Quatre"],"below");
const lastRow=room.nodes.at(-1)!, neighbour=room.nodes.find(n=>n.id===collisionSource.nodes[2].id)!;
assert.deepEqual(neighbour,collisionSource.nodes[2]);
assert.deepEqual(room.nodes.slice(0,collisionSource.nodes.length),collisionSource.nodes);
const firstRow=room.nodes.find(n=>n.parent===collisionSource.nodes[1].id)!;
const aboveNested=appendChildRows(room,firstRow.id,["Détail au-dessus"],"above");
const ancestor=aboveNested.nodes.find(n=>n.id===collisionSource.nodes[1].id)!, detail=aboveNested.nodes.at(-1)!;
assert.deepEqual(aboveNested.nodes.slice(0,room.nodes.length),room.nodes);
assert.ok(Math.abs(detail.x-ancestor.x)>=nodeWidth(room.theme)||Math.abs(detail.y-ancestor.y)>=(nodeHeight(detail)+nodeHeight(ancestor))/2);
assert.ok(detail.y < aboveNested.nodes.find(n=>n.id===firstRow.id)!.y);
const almostFull = makeMap();
while (almostFull.nodes.length < 299) almostFull.nodes.push({...almostFull.nodes[1],id:crypto.randomUUID()});
assert.equal(appendChildRows(almostFull,almostFull.nodes[1].id,["A","B"],"above").nodes.length,300);
console.log("PASS stacked child rows above/below every style: nested groups, input order, template reset, independent nodes and 300-node bound");

// All visual styles and spatial layouts must compose, including forests and
// explicit rows. Test the actual node extents, not only centre distances.
import {arrange,redistribute,independentIdea,reparentIdea,zoomAt} from '../../frontend/src/mind-map-model';
import {nodeWidth} from '../../frontend/src/mind-map-geometry';
import {importMindMap} from '../../frontend/src/mind-map-import';
let forest:ReturnType<typeof makeMap>;
// Build one reproducible hierarchy; each makeMap creates independent IDs.
forest=makeMap('tree');forest=appendChildRows(forest,forest.nodes[1].id,['Un','Deux','Trois'],'above');
forest.nodes.push(independentIdea(forest,{x:900,y:900})!);
for(const theme of ['cards','branches','organic','classic'])for(const layout of ['radial','tree','org','flow','bilateral','orbit']){
 const arranged=arrange({...forest,theme},layout);
 for(let i=0;i<arranged.nodes.length;i++)for(let j=i+1;j<arranged.nodes.length;j++){
  const a=arranged.nodes[i],b=arranged.nodes[j];
  assert.ok(Math.abs(a.x-b.x)>=nodeWidth(theme)-.01||Math.abs(a.y-b.y)>=(nodeHeight(a,theme)+nodeHeight(b,theme))/2-.01,`${theme}/${layout}: ${a.text} overlaps ${b.text}`);
 }
 assert.deepEqual(arranged.nodes.map(n=>[n.id,n.parent,n.text]),forest.nodes.map(n=>[n.id,n.parent,n.text]));
 assert.deepEqual(redistribute(redistribute(arranged)),redistribute(arranged));
}
for(const at of [{x:0,y:0},{x:729,y:128},{x:1110,y:800}])for(const z of [.05,.5,2,11]){
 const pan={x:91,y:-212},next=zoomAt(pan,z,at,1.25);
 assert.ok(Math.abs((at.x-pan.x)/z-(at.x-next.pan.x)/next.zoom)<1e-8);
 assert.ok(Math.abs((at.y-pan.y)/z-(at.y-next.pan.y)/next.zoom)<1e-8);
}
const free=independentIdea(forest,{x:-321,y:917})!;assert.equal(free.parent,'');assert.equal(free.x,-321);assert.equal(free.y,917);
const detached=reparentIdea(forest,forest.nodes[1].id,'');assert.equal(detached.nodes[1].parent,'');
assert.equal(reparentIdea(forest,forest.nodes[0].id,forest.nodes[1].id),forest);
const md=importMindMap('# Projet\nIntroduction\n## Observer\nTexte de la section\n### Comprendre\nContenu détaillé\n```md\n# Pas un titre\n```\n## Construire\nSuite','projet.md');
assert.equal(md.nodes[0].text,'Projet');assert.equal(md.nodes.length,4);assert.equal(md.nodes[2].parent,md.nodes[1].id);assert.ok(md.nodes[2].content?.includes('# Pas un titre'));
const tex=importMindMap(String.raw`\documentclass{article}
\title{Mon projet}
\begin{document}
\section{Première section} Texte \textbf{important}.
\subsection{Détails} Suite.
\section*{Conclusion} \input{secret.tex}
\end{document}`,'projet.tex');
assert.equal(tex.nodes[0].text,'Mon projet');assert.equal(tex.nodes[2].parent,tex.nodes[1].id);assert.ok(tex.nodes.at(-1)?.content?.includes('\\input{secret.tex}'));
assert.throws(()=>importMindMap('# A\n'+('x'.repeat(21000)),'a.md'));
assert.throws(()=>importMindMap('x'.repeat(1000001),'a.md'));
assert.throws(()=>importMindMap('\\section{Unclosed','a.tex'));
console.log('PASS all 24 style/layout pairs: non-overlapping forests, deterministic redistribution, free creation, cycle-safe conversions, pointer-anchored zoom and safe MD/TEX outlines');

import {redistributeAround} from '../../frontend/src/mind-map-model';
const centredSource=makeMap('bilateral');const chosen=centredSource.nodes[2];
const centred=redistributeAround(centredSource,chosen.id);
assert.equal(centred.nodes.find(n=>n.id===chosen.id)?.x,0);assert.equal(centred.nodes.find(n=>n.id===chosen.id)?.y,0);
assert.deepEqual(centred.nodes.map(n=>[n.id,n.parent,n.text]),centredSource.nodes.map(n=>[n.id,n.parent,n.text]));
assert.ok(underlined({...centred,theme:'cards'},{...centred.nodes[1],outline:'underline'}));
assert.ok(!underlined({...centred,theme:'branches'},{...centred.nodes[1],outline:'box'}));
console.log('PASS chosen redistribution centre preserves semantic parents; explicit outline overrides visual templates');

// New ideas and copied groups must never rewrite existing bubbles.
import {copyIdeas,encodeIdeas,decodeIdeas,pasteIdeas,deleteIdeas} from '../../frontend/src/mind-map-clipboard';
const clipboardSource=makeMap();
clipboardSource.nodes[1].content="Un contenu indépendant";
clipboardSource.nodes[1].outline="box";
clipboardSource.nodes[1].media=[{kind:"link",title:"Ressource",url:"https://example.org"}];
const beforeAddition=structuredClone(clipboardSource);
const newChild=childIdea(clipboardSource,clipboardSource.nodes[1].id)!;
assert.equal(newChild.content,"");assert.deepEqual(newChild.media,[]);assert.equal(newChild.outline,"auto");
assert.deepEqual(clipboardSource,beforeAddition);
for(const side of ['above','below'] as const){
 const appended=appendChildRows(clipboardSource,clipboardSource.nodes[0].id,['Une nouvelle idée','Une autre'],side);
 assert.deepEqual(appended.nodes.slice(0,clipboardSource.nodes.length),beforeAddition.nodes);
 assert.deepEqual(appended.links,clipboardSource.links);
 for(const n of appended.nodes.slice(clipboardSource.nodes.length))for(const other of appended.nodes.filter(o=>o.id!==n.id)){
  assert.ok(Math.abs(n.x-other.x)>=nodeWidth(appended.theme)||Math.abs(n.y-other.y)>=(nodeHeight(n)+nodeHeight(other))/2);
 }
}
clipboardSource.links=[{from:clipboardSource.nodes[0].id,to:clipboardSource.nodes[1].id,color:'#123456'}];
const copiedIds=clipboardSource.nodes.slice(0,2).map(n=>n.id);
const clip=copyIdeas(clipboardSource,copiedIds);
const decoded=decodeIdeas(encodeIdeas(clip))!;assert.ok(decoded);
const pasted=pasteIdeas(clipboardSource,decoded,{x:0,y:0})!;
assert.equal(pasted.ids.length,2);assert.ok(pasted.ids.every(id=>!copiedIds.includes(id)));
assert.deepEqual(pasted.data.nodes.slice(0,clipboardSource.nodes.length),clipboardSource.nodes);
assert.equal(pasted.data.nodes.at(-1)?.parent,pasted.ids[0]);
assert.equal(pasted.data.links.at(-1)?.to,pasted.ids[1]);
pasted.data.nodes.at(-1)!.media![0].title='Modifiée';
assert.equal(clipboardSource.nodes[1].media![0].title,'Ressource');assert.equal(clip.nodes[1].media![0].title,'Ressource');
const detachedClip=copyIdeas(clipboardSource,[clipboardSource.nodes[1].id]);assert.equal(detachedClip.nodes[0].parent,'');
const deleted=deleteIdeas(clipboardSource,[clipboardSource.nodes[0].id]);
assert.equal(deleted.nodes[0].parent,'');assert.equal(deleted.links.length,0);assert.deepEqual(deleted.nodes[0].media,clipboardSource.nodes[1].media);
assert.equal(deleteIdeas(clipboardSource,clipboardSource.nodes.map(n=>n.id)).nodes.length,1);
assert.equal(pasteIdeas({...clipboardSource,nodes:Array.from({length:299},()=>clipboardSource.nodes[0])},clip,{x:0,y:0}),null);
assert.equal(decodeIdeas('texte ordinaire'),null);
assert.equal(decodeIdeas('FEUILLET_MIND_MAP_V1\n'+JSON.stringify({...clip,nodes:[{...clip.nodes[0],parent:clip.nodes[0].id}]})),null);
assert.equal(decodeIdeas('FEUILLET_MIND_MAP_V1\n'+JSON.stringify({...clip,nodes:[{...clip.nodes[0],x:"invalid"}]})),null);
console.log('PASS non-destructive additions; independent group clipboard, remapped parents/links, deep metadata cloning, safe deletion and malformed clipboard rejection');


import {touchCamera,touchFrame} from '../../frontend/src/mind-map-touch';
const touchView={zoom:.3,pan:{x:70,y:120}};
const touchOrigin=touchFrame([{x:100,y:300},{x:200,y:300}]);
const pinch=touchCamera(touchView,touchOrigin,touchFrame([{x:50,y:320},{x:250,y:320}]));
assert.equal(pinch.zoom,.6);
assert.ok(Math.abs((150-touchView.pan.x)/.3-(150-pinch.pan.x)/.6)<1e-8);
assert.ok(Math.abs((300-touchView.pan.y)/.3-(320-pinch.pan.y)/.6)<1e-8);
const panTouch=touchCamera(touchView,touchFrame([{x:100,y:200}]),touchFrame([{x:160,y:240}]));
assert.deepEqual(panTouch,{zoom:.3,pan:{x:130,y:160}});
const rebased=touchCamera(pinch,touchFrame([{x:50,y:320}]),touchFrame([{x:80,y:330}]));
assert.equal(rebased.zoom,.6);assert.equal(rebased.pan.x,pinch.pan.x+30);assert.equal(rebased.pan.y,pinch.pan.y+10);
assert.equal(touchCamera({zoom:10,pan:{x:0,y:0}},touchOrigin,{...touchOrigin,distance:1e4}).zoom,12);
console.log('PASS reader touch gestures: anchored pinch, one-finger pan, two-to-one continuity and zoom bounds');
