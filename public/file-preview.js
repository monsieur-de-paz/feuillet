(()=>{
 let dialog,previous;
 const close=()=>{if(!dialog?.open)return;dialog.close();};
 function create(){
  dialog=document.createElement('dialog');dialog.className='feuillet-file-preview';dialog.setAttribute('aria-labelledby','file-preview-title');
  dialog.innerHTML='<header><div><span class="file-preview-eyebrow">Aperçu du fichier</span><h2 id="file-preview-title"></h2></div><a class="file-preview-download">Télécharger</a><button type="button" class="file-preview-close" aria-label="Fermer l’aperçu">×</button></header><iframe title="Aperçu du fichier" referrerpolicy="same-origin"></iframe>';
  document.body.append(dialog);dialog.querySelector('button').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  dialog.addEventListener('close',()=>{dialog.querySelector('iframe').src='about:blank';document.body.classList.remove('file-preview-open');previous?.focus({preventScroll:true});});
  dialog.querySelector('iframe').addEventListener('load',()=>{try{dialog.querySelector('iframe').contentDocument?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});}catch{}});
 }
 document.addEventListener('click',e=>{
  const trigger=e.target.closest?.('[data-file-preview]');if(!trigger)return;
  const id=trigger.dataset.filePreview;if(!/^[a-f0-9-]{36}$/.test(id||''))return;
  e.preventDefault();e.stopPropagation();if(!dialog)create();previous=trigger;
  const name=trigger.dataset.fileName||'Fichier';dialog.querySelector('h2').textContent=name;dialog.querySelector('iframe').title='Aperçu : '+name;
  const dark=matchMedia('(prefers-color-scheme: dark)').matches,theme=document.documentElement.dataset.theme||document.body.dataset.theme||((document.body.style.colorScheme==='dark')?'dark':document.body.style.colorScheme==='light'?'light':dark?'dark':'light');
  dialog.dataset.theme=theme;dialog.querySelector('iframe').src='file-preview.php?id='+encodeURIComponent(id)+'&theme='+encodeURIComponent(theme);dialog.querySelector('a').href='media.php?id='+encodeURIComponent(id)+'&download=1';
  if(!dialog.open){dialog.showModal();document.body.classList.add('file-preview-open');}dialog.querySelector('button').focus();
 });
 // Files dropped outside an editable page must never replace Feuillet in this tab.
 window.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();},true);
 window.addEventListener('drop',e=>{if(e.dataTransfer?.types.includes('Files')&&!(e.target instanceof HTMLInputElement&&e.target.type==='file'))e.preventDefault();},true);
})();

// Image previews are delegated so reader navigation needs no rebinding.
(()=>{
 let dialog,previous,overflow;
 function close(){if(dialog?.open)dialog.close();}
 document.addEventListener('click',event=>{
  const img=event.target instanceof Element?event.target.closest('img'):null;
  if(!img||img.closest('dialog,.image-lightbox,button,.tiptap,.page-emoji,.page-icon')||img.style.touchAction==='none')return;
  if(!img.closest('.reader-page,.page-cover,.gallery-cover-frame,.page-content,.page-heading,.notebook-cover'))return;
  const src=img.getAttribute('src');if(!src)return;
  event.preventDefault();event.stopPropagation();
  if(!dialog){
   dialog=document.createElement('dialog');dialog.className='feuillet-image-preview';dialog.setAttribute('aria-label','Image agrandie');
   const button=document.createElement('button');button.type='button';button.className='image-preview-close';button.setAttribute('aria-label','Fermer l’aperçu');button.textContent='×';button.addEventListener('click',close);
   dialog.append(button,document.createElement('img'),document.createElement('figcaption'));document.body.append(dialog);
   dialog.addEventListener('click',e=>{if(e.target!==dialog.querySelector('img')&&!e.target.closest('a,button'))close();});
   dialog.addEventListener('close',()=>{dialog.querySelector('img').removeAttribute('src');document.body.style.overflow=overflow;previous?.focus?.({preventScroll:true});});
  }
  previous=img.closest('a')||document.activeElement;overflow=document.body.style.overflow;
  const picture=dialog.querySelector('img');picture.src=src;picture.alt=img.alt||'Image agrandie';
  const caption=dialog.querySelector('figcaption');caption.replaceChildren();
  const credit=img.closest('.page-cover,.notebook-cover')?document.querySelector('.cover-source'):img.closest('figure,.gallery-card')?.querySelector('.image-attribution');
  if(credit)caption.append(credit.cloneNode(true));
  dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('button').focus();
 },true);
})();
