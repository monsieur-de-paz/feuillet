let pdfjs;
const status=document.getElementById('pdf-status'),number=document.getElementById('page-number'),container=document.getElementById('pdf-container'),canvas=document.getElementById('pdf-canvas'),text=document.getElementById('pdf-text'),pageBox=document.getElementById('pdf-page');
let pdf,current=1,zoom=1,task,generation=0;
async function render(){
  if(!pdf)return;const pass=++generation;if(task)try{task.cancel();}catch{};
  try{
    const page=await pdf.getPage(current);if(pass!==generation)return;
    const base=page.getViewport({scale:1});const scale=Math.min(2.5,Math.max(.3,(container.clientWidth-30)/base.width))*zoom;const viewport=page.getViewport({scale});const ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.floor(viewport.width*ratio);canvas.height=Math.floor(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';pageBox.style.width=viewport.width+'px';pageBox.style.height=viewport.height+'px';pageBox.style.setProperty('--scale-factor',String(scale));pageBox.style.setProperty('--total-scale-factor',String(scale));pageBox.style.setProperty('--scale-round-x','1px');pageBox.style.setProperty('--scale-round-y','1px');
    task=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});await task.promise;if(pass!==generation)return;
    text.replaceChildren();const content=await page.getTextContent();if(pass!==generation)return;await new pdfjs.TextLayer({textContentSource:content,container:text,viewport}).render();
    number.value=String(current);document.getElementById('previous').disabled=current===1;document.getElementById('next').disabled=current===pdf.numPages;status.textContent='';
  }catch(error){if(error.name!=='RenderingCancelledException')status.textContent='Lecture indisponible. Utilise le bouton de téléchargement.';}
}
function change(n){if(!pdf)return;current=Math.max(1,Math.min(pdf.numPages,n));render();container.scrollTop=0;}
document.getElementById('previous').onclick=()=>change(current-1);document.getElementById('next').onclick=()=>change(current+1);
number.onchange=()=>change(Number(number.value)||1);document.getElementById('zoom-out').onclick=()=>{zoom=Math.max(.5,zoom-.2);render();};document.getElementById('zoom-in').onclick=()=>{zoom=Math.min(2,zoom+.2);render();};
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,150);});
try{
  const version=encodeURIComponent(document.body.dataset.version||'');
  pdfjs=await import('./pdf-engine.php?v='+version);
  pdfjs.GlobalWorkerOptions.workerSrc='./pdf-engine.php?worker=1&v='+version;
  pdf=await pdfjs.getDocument({url:'media.php?id='+encodeURIComponent(document.body.dataset.file),cMapUrl:'vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'vendor/pdfjs/standard_fonts/',wasmUrl:'vendor/pdfjs/wasm/'}).promise;
  document.getElementById('page-count').textContent='/ '+pdf.numPages;number.max=String(pdf.numPages);await render();
}catch(error){status.textContent='L’aperçu du PDF est indisponible. Tu peux télécharger le document avec le bouton ↓.';document.getElementById('pdf-page').hidden=true;document.getElementById('previous').disabled=true;document.getElementById('next').disabled=true;console.error('Feuillet PDF :',error);}
