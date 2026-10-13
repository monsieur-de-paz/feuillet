import assert from 'node:assert/strict';
import React from 'react';
import {selectOptions} from '../../frontend/src/Select';
import {fitPopover,searchLabel} from '../../frontend/src/interface-geometry';
const option=(value:string, label:any, disabled=false)=>React.createElement('option',{value,disabled},label);
const grouped=React.createElement(React.Fragment,null,option('a','École'),React.createElement('optgroup',{label:'Archivées',disabled:true},option('b',React.createElement('strong',null,'Cours'))),false);
assert.deepEqual(selectOptions(grouped),[{value:'a',label:'École',disabled:false},{value:'b',label:'Cours',disabled:true}]);
assert.equal(searchLabel('ÉTAT / À préparer'),'etat / a preparer');
for (const [w,h] of [[320,740],[390,844],[1280,800],[945,853]]) {
  for(const [x,y] of [[0,0],[w-1,h-1],[w/2,h/2]]) {
    const fit=fitPopover({x,y,width:274,height:658,viewportWidth:w,viewportHeight:h});
    assert.ok(fit.left>=8 && fit.top>=8);
    assert.ok(fit.left+274<=w-8);
    assert.ok(fit.top+Math.min(658,fit.maxHeight)<=h-8);
  }
}
const above=fitPopover({x:200,y:690,width:240,height:300,viewportWidth:900,viewportHeight:740,anchorTop:650});
assert.equal(above.top,342);
const keyboard=fitPopover({x:20,y:450,width:350,height:600,viewportWidth:390,viewportHeight:300});
assert.equal(keyboard.maxHeight,284);assert.equal(keyboard.top,8);
console.log('16 interface checks passed: grouped/disabled choices, accent-insensitive search, menu bounds, upward opening and virtual keyboard');
