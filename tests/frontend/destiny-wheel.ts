import assert from 'node:assert/strict';
import {wheelTarget,columnText,wheelLabel} from '../../frontend/src/destiny-wheel-model';
for(const n of [1,2,3,24,60])for(let i=0;i<n;i++){const rotation=wheelTarget(731,i,n);assert.ok(rotation>731+360*4);const angle=((rotation+(i+.5)*360/n)%360+360)%360;assert.ok(angle<.00001||Math.abs(angle-360)<.00001);}
assert.equal(columnText([{values:{p:'Alpha\nA'}},{values:{p:'Bravo'}},{values:{p:''}},{values:{p:false}},{values:{p:0}}],'p'),'Alpha A\nBravo\nNon\n0');
console.log('PASS wheel pointer alignment for every segment; grouped copy preserves labels, zero/false and line isolation');

assert.equal(wheelLabel("Équipe avec un très long nom pour tester le secteur",12).length,2);assert.ok(wheelLabel("Équipe avec un très long nom pour tester le secteur",12).at(-1)?.endsWith("…"));assert.equal(wheelLabel("Un nom long dans une roue dense",40).length,1);
