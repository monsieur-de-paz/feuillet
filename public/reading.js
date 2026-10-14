(()=>{
 let token=document.querySelector('#root')?.dataset.readerToken||'',timer=null,busy=false,pending=null;
 const userBusy=()=>[...document.querySelectorAll('audio,video')].some(e=>!e.paused)||document.querySelector('form.quiz:focus-within')||document.querySelector('form.quiz[data-touched="1"]')||document.activeElement?.tagName==='IFRAME'||Boolean(window.getSelection()?.toString());
 function replace(result){
  const root=document.querySelector('#root');if(!root||!result.html)return;
  const expanded=[...root.querySelectorAll('.gallery-v2')].filter(g=>g.querySelector('[data-gallery-toggle]')?.getAttribute('aria-expanded')==='true').map(g=>g.querySelector('.gallery-heading h3')?.textContent);const previousScroll=window.scrollY;root.innerHTML=result.html;root.querySelectorAll('.gallery-v2').forEach(g=>{if(expanded.includes(g.querySelector('.gallery-heading h3')?.textContent)){g.querySelectorAll('[data-gallery-extra]').forEach(c=>c.hidden=false);const toggle=g.querySelector('[data-gallery-toggle]');if(toggle){toggle.setAttribute('aria-expanded','true');toggle.textContent='Afficher moins'}}});token=result.token;root.dataset.readerToken=token;
  const header=document.querySelector('.reader-header');if(header){const theme=header.querySelector('.feuillet-theme-toggle');header.innerHTML=result.breadcrumbs; if(theme)header.append(theme);}
  document.title=result.title;window.FeuilletReaderTheme?.setBase(result.appearance,result.mode);window.scrollTo({top:Math.min(previousScroll,document.documentElement.scrollHeight-innerHeight),behavior:'instant'});pending=null;document.querySelector('.reader-update-notice')?.remove();
 }
 function offer(result){pending=result;let notice=document.querySelector('.reader-update-notice');if(!notice){notice=document.createElement('div');notice.className='reader-update-notice';notice.setAttribute('role','status');const text=document.createElement('span');text.textContent='Une nouvelle version est disponible.';const button=document.createElement('button');button.type='button';button.textContent='Afficher la nouvelle version';button.addEventListener('click',()=>{if(pending)replace(pending)});notice.append(text,button);document.body.append(notice);}}
 async function check(){if(busy||document.hidden)return;const root=document.querySelector('#root');if(!root?.hasAttribute('data-reader-token'))return;busy=true;
  try{const qs=new URLSearchParams({page:root.dataset.readerPage||'',root:root.dataset.readerRoot||root.dataset.readerPage||'',token});const response=await fetch('reader-state.php?'+qs,{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;const result=await response.json();if(result.html){if(result.unavailable||!userBusy())replace(result);else offer(result);}}
  catch{}finally{busy=false;}
 }
 function schedule(){clearTimeout(timer);timer=setTimeout(async()=>{await check();schedule()},15000)}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check()});window.addEventListener('focus',()=>void check());schedule();
 document.addEventListener('click',event=>{
  const toggle=event.target.closest('[data-gallery-toggle]');if(!toggle)return;const gallery=toggle.closest('.gallery-v2'),expanded=toggle.getAttribute('aria-expanded')==='true';gallery.querySelectorAll('[data-gallery-extra]').forEach(card=>card.hidden=expanded);toggle.setAttribute('aria-expanded',String(!expanded));toggle.textContent=expanded?'Afficher tout':'Afficher moins';
 });
 document.addEventListener('input',event=>{const form=event.target.closest('form.quiz');if(form)form.dataset.touched='1'});
 document.addEventListener('reset',event=>{const form=event.target.closest('form.quiz');if(!form)return;form.dataset.touched='0';form.querySelectorAll('.quiz-feedback,.quiz-score').forEach(el=>{el.textContent='';el.classList.remove('correct','incorrect')});if(pending)replace(pending)});
 document.addEventListener('submit',async event=>{
  const form=event.target.closest('form.quiz');if(!form)return;event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;form.dataset.touched='1';
  const answers={};form.querySelectorAll('fieldset').forEach(field=>{answers[field.dataset.question]=field.dataset.type==='short'?field.querySelector('input').value:[...field.querySelectorAll('input:checked')].map(el=>Number(el.value))});
  try{const session=await fetch('api.php?action=session').then(r=>r.json());const response=await fetch('api.php?action=quiz',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({page_id:form.dataset.page,quiz_id:form.dataset.quiz,answers})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Correction indisponible.');form.querySelector('.quiz-score').textContent=`Résultat : ${result.score} / ${result.total}`;result.results.forEach(q=>{const field=[...form.querySelectorAll('fieldset')].find(el=>el.dataset.question===q.id);if(!field)return;const feedback=field.querySelector('.quiz-feedback');feedback.className='quiz-feedback '+(q.correct?'correct':'incorrect');feedback.textContent=(q.correct?'✓ Bonne réponse. ':'↻ À revoir. Réponse attendue : '+q.expected.join(', ')+'. ')+q.explanation})}
  catch(error){form.querySelector('.quiz-score').textContent=error.message}finally{button.disabled=false}
 });
})();
