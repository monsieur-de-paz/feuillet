import assert from 'node:assert/strict';
import {wheelTarget,columnText,wheelLabel} from '../../frontend/src/destiny-wheel-model';
for(const n of [1,2,3,24,60])for(let i=0;i<n;i++){const rotation=wheelTarget(731,i,n);assert.ok(rotation>731+360*4);const angle=((rotation+(i+.5)*360/n)%360+360)%360;assert.ok(angle<.00001||Math.abs(angle-360)<.00001);}
assert.equal(columnText([{values:{p:'Alpha\nA'}},{values:{p:'Bravo'}},{values:{p:''}},{values:{p:false}},{values:{p:0}}],'p'),'Alpha A\nBravo\nNon\n0');
console.log('PASS wheel pointer alignment for every segment; grouped copy preserves labels, zero/false and line isolation');

assert.equal(wheelLabel("Équipe avec un très long nom pour tester le secteur",12).length,2);assert.ok(wheelLabel("Équipe avec un très long nom pour tester le secteur",12).at(-1)?.endsWith("…"));assert.equal(wheelLabel("Un nom long dans une roue dense",40).length,1);

import {animateWheel,wheelDuration,wheelMotion} from '../../frontend/src/wheel-motion';
assert.equal(wheelDuration('auto',true),0);
assert.equal(wheelDuration('auto',false),5200);
assert.equal(wheelDuration('full',true),5200);
assert.equal(wheelDuration('light',true),1800);
assert.equal(wheelDuration('off',false),0);
assert.equal(wheelMotion('invalid'),'auto');
// Exercise the actual animation runner with frames working, missing, or paused.
function motionHarness(frames:boolean, duration=1800) {
 let time=0,seq=0,done=0;
 const tasks=new Map<number,{at:number,cb:()=>void}>(),paints:number[]=[];
 const later=(cb:()=>void,delay:number)=>{const id=++seq;tasks.set(id,{at:time+delay,cb});return id;};
 const clock={now:()=>time,frame:(cb:()=>void)=>frames?later(cb,16):0,cancelFrame:(id:number)=>{tasks.delete(id);},later,cancelLater:(id:number)=>{tasks.delete(id);}};
 const control=animateWheel(200,2245,duration,a=>paints.push(a),()=>done++,clock);
 function advance(until:number) {
  while(true){const next=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>until)break;time=next[1].at;tasks.delete(next[0]);next[1].cb();}time=until;
 }
 return {control,paints,advance,tasks,get done(){return done;}, pauseUntil(t:number){time=t;for(const task of [...tasks.values()])task.cb();}};
}
for(const frames of [true,false]){
 const h=motionHarness(frames);h.advance(400);assert.ok(h.paints.at(-1)!>200&&h.paints.at(-1)!<2245);
 h.advance(1900);assert.equal(h.paints.at(-1),2245);assert.equal(h.done,1);assert.equal(h.tasks.size,0);
 assert.ok(h.paints.every((a,i)=>!i||a>=h.paints[i-1]));h.control.finish();assert.equal(h.done,1);
}
const canceled=motionHarness(true);canceled.advance(200);canceled.control.cancel();canceled.advance(6000);assert.equal(canceled.done,0);assert.equal(canceled.tasks.size,0);
const paused=motionHarness(true);paused.pauseUntil(9000);assert.equal(paused.done,1);assert.equal(paused.paints.at(-1),2245);assert.equal(paused.tasks.size,0);
const changed=motionHarness(true);changed.advance(100);changed.control.finish();assert.equal(changed.done,1);assert.equal(changed.tasks.size,0);
const immediate=motionHarness(true,0);assert.equal(immediate.done,1);assert.equal(immediate.paints.at(-1),2245);assert.equal(immediate.tasks.size,0);
console.log('PASS wheel motion policies, opt-in under reduced motion, timer fallback, paused frames, cancellation and exact destination');
