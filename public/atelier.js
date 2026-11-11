/* Local Atelier motion: no timers delaying navigation, no network or document content mutation. */
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let surface=null,key='',frame=0,disposed=false;
 const running=new Set();
 function enter(target){
  if(reduced.matches||document.hidden)return;
  const anim=target.animate([{translate:'0 6px'},{translate:'0 0'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
  running.add(anim);anim.finished.catch(()=>{}).finally(()=>running.delete(anim));
 }
 function check(){
  frame=0;if(disposed)return;
  const next=document.querySelector('.main-panel [data-page-key],#root [data-page-key]');
  if(!next)return;
  const id=next.getAttribute('data-page-key');
  if(key===id){surface=next;return;}
  const first=!surface;surface=next;key=id;
  if(!first)enter(next.querySelector('.page-body')||next);
 }
 const observer=new MutationObserver(records=>{
  if(records.some(r=>r.type==='attributes'||r.addedNodes.length)&&!frame)frame=requestAnimationFrame(check);
 });
 const boot=()=>{check();observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-page-key']});};
 function stop(){observer.disconnect();cancelAnimationFrame(frame);running.forEach(a=>a.cancel());running.clear();}
 reduced.addEventListener('change',()=>{if(reduced.matches){running.forEach(a=>a.cancel());running.clear();}});
 // Suspend observers while a document lives in the browser back/forward cache.
 addEventListener('pagehide',()=>{disposed=true;stop();});
 addEventListener('pageshow',e=>{if(e.persisted){disposed=false;boot();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
