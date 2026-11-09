(()=>{
 function readerQuery(url){
  const path=url.pathname.split('/').pop();
  const share=url.searchParams.get('share')||(/^[a-z0-9][a-z0-9-]{0,63}$/.test(path)?path:'');
  if(share)return new URLSearchParams({share});
  const query=new URLSearchParams({page:url.searchParams.get('page')||''});
  if(url.searchParams.has('root'))query.set('root',url.searchParams.get('root'));
  return query;
 }
 let token=document.querySelector('#root')?.dataset.readerToken||'',timer=null,busy=false,pending=null;
 const userBusy=()=>[...document.querySelectorAll('audio,video')].some(e=>!e.paused)||document.querySelector('form.quiz:focus-within')||document.querySelector('form.quiz[data-touched="1"]')||document.activeElement?.tagName==='IFRAME'||Boolean(window.getSelection()?.toString());
 function replace(result){
  const root=document.querySelector('#root');if(!root||!result.html)return;
  const expanded=[...root.querySelectorAll('.gallery-v2')].filter(g=>g.querySelector('[data-gallery-toggle]')?.getAttribute('aria-expanded')==='true').map(g=>g.querySelector('.gallery-heading h3')?.textContent);const previousScroll=window.scrollY;root.innerHTML=result.html;root.querySelectorAll('.gallery-v2').forEach(g=>{if(expanded.includes(g.querySelector('.gallery-heading h3')?.textContent)){g.querySelectorAll('[data-gallery-extra]').forEach(c=>c.hidden=false);const toggle=g.querySelector('[data-gallery-toggle]');if(toggle){toggle.setAttribute('aria-expanded','true');toggle.textContent='Afficher moins'}}});token=result.token;root.dataset.readerToken=token;
  const header=document.querySelector('.reader-header');if(header){if(result.header)header.innerHTML=result.header;else{const actions=header.querySelector('.reader-header-actions');header.innerHTML=result.breadcrumbs;if(actions)header.append(actions);}}
  document.title=result.title;window.FeuilletReaderTheme?.setBase(result.appearance,result.mode);window.scrollTo({top:Math.min(previousScroll,document.documentElement.scrollHeight-innerHeight),behavior:'instant'});pending=null;document.querySelector('.reader-update-notice')?.remove();
 }
 function offer(result){pending=result;let notice=document.querySelector('.reader-update-notice');if(!notice){notice=document.createElement('div');notice.className='reader-update-notice';notice.setAttribute('role','status');const text=document.createElement('span');text.textContent='Une nouvelle version est disponible.';const button=document.createElement('button');button.type='button';button.textContent='Afficher la nouvelle version';button.addEventListener('click',()=>{if(pending)replace(pending)});notice.append(text,button);document.body.append(notice);}}
 async function check(){if(busy||document.hidden)return;const root=document.querySelector('#root');if(!root?.hasAttribute('data-reader-token'))return;busy=true;const view=readerView(root);
  try{const qs=root.dataset.readerShare?new URLSearchParams({share:root.dataset.readerShare,token}):new URLSearchParams({page:root.dataset.readerPage||'',root:root.dataset.readerRoot||root.dataset.readerPage||'',token});const response=await fetch('reader-state.php?'+qs,{credentials:'same-origin',cache:'no-store'});if(!response.ok)return;const result=await response.json();if(view!==readerView(root))return;if(result.token===token&&!result.unavailable)return;if(result.html){if(result.unavailable){memory.clear();replace(result);}else if(!userBusy())replace(result);else offer(result);}}
  catch{}finally{busy=false;}
 }

 const memory=new Map();let navigation=0;
 const readerView=root=>JSON.stringify([root.dataset.readerShare,root.dataset.readerPage,root.dataset.readerRoot]);
 const key=url=>readerQuery(url).toString();
 function setReaderLocation(root,url,resolvedRoot=''){
  const query=readerQuery(url);
  root.dataset.readerShare=query.get('share')||'';
  root.dataset.readerPage=query.get('page')||'';
  root.dataset.readerRoot=resolvedRoot||query.get('root')||'';
 }
 function note(message){let n=document.querySelector('.reader-network-status');if(!message){n?.remove();return}if(!n){n=document.createElement('div');n.className='reader-network-status';n.setAttribute('role','status');document.body.append(n)}n.textContent=message;}
 function show(result,url){const root=document.querySelector('#root');setReaderLocation(root,url,result.root);replace(result);window.scrollTo(0,0);}
 async function navigate(url,push=true){
  const pass=++navigation;
  const cacheKey=key(url);
  let hit=memory.get(cacheKey);
  if(hit&&Date.now()-hit.time>=600000){memory.delete(cacheKey);hit=null;}
  note('Ouverture de la page…');
  if(push)history.pushState({feuillet:true},'',url);
  const qs=readerQuery(url);
  if(hit)qs.set('token',hit.result.token);
  try{
   const response=await fetch('reader-state.php?'+qs,{credentials:'same-origin',cache:'no-store',priority:'high'});
   if(!response.ok)throw Error('Page indisponible');
   let result=await response.json();
   if(pass!==navigation)return;
   const offline=response.headers.get('X-Feuillet-Offline')==='1';
   if(!result.html&&!offline&&hit&&result.token===hit.result.token)result=hit.result;
   if(!result.html)throw Error('Page indisponible');
   if(result.unavailable)memory.clear();
   else if(!offline){
    memory.set(cacheKey,{result,time:Date.now()});
    while(memory.size>20)memory.delete(memory.keys().next().value);
   }
   show(result,url);
   note(offline?'Copie enregistrée · connexion indisponible.':null);
  }catch(error){
   if(pass!==navigation)return;
   const root=document.querySelector('#root');setReaderLocation(root,url);token='';
   const main=document.createElement('main');main.className='reader-page';
   const h=document.createElement('h1');h.textContent='Cette page est indisponible.';
   const p=document.createElement('p');p.textContent='La consultation nécessite une réponse du serveur ou une copie enregistrée hors connexion.';
   main.append(h,p);root.replaceChildren(main);note('');throw error;
  }
 }
 window.FeuilletReaderClear=()=>memory.clear();
 window.FeuilletReaderNavigate=navigate;window.FeuilletReaderRefresh=()=>{token='';void check()};
 window.addEventListener('popstate',()=>void navigate(new URL(location.href),false).catch(()=>{}));
 document.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const a=event.target.closest('a[href]');if(!a||a.target||a.hasAttribute('download'))return;const url=new URL(a.href);if(url.origin!==location.origin||!url.pathname.endsWith('/index.php')||!url.searchParams.has('page')||url.searchParams.has('edit')||url.searchParams.has('form')||url.hash)return;event.preventDefault();void navigate(url).catch(()=>{});});
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
