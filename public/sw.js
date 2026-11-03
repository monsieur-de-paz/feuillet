/* Feuillet: public reading copies only. No API, media or administrator document cache. */
const base=new URL('./',self.location),VERSION='0.21.1',PREFIX='feuillet-'+encodeURIComponent(base.pathname)+'-',SHELL=PREFIX+'shell-'+VERSION,PAGES=PREFIX+'public-pages',SETTINGS=PREFIX+'preferences',key=new URL('offline-enabled',base).href;
const assets=['offline.html','offline.js','reading.js','pwa.js','pwa.css','reader.css','gallery.css','interface.css','theme.js','theme-colors.js','theme-toggle.css','emoji-font.css','file-preview.js','file-preview.css','video-lazy.js','favicon.svg','icons.svg','feuillet-logo.png','manifest.webmanifest'];
const enabled=async()=>{try{return Boolean(await(await caches.open(SETTINGS)).match(key))}catch{return false}};
const canonical=url=>{const u=new URL('reader-state.php',base);for(const k of ['page','root'])if(url.searchParams.has(k))u.searchParams.set(k,url.searchParams.get(k));return u.href};
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(SHELL);await c.addAll(assets.map(a=>new Request(new URL(a,base),{cache:'reload'})));self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const n of await caches.keys())if(n.startsWith(PREFIX+'shell-')&&n!==SHELL)await caches.delete(n);await self.clients.claim()})()));
self.addEventListener('message',event=>event.waitUntil((async()=>{const command=event.data?.command;
 if(command==='enable'){await(await caches.open(SETTINGS)).put(key,new Response('yes'));}
 if(command==='clear'){await caches.delete(PAGES);await caches.delete(SETTINGS);}
 if(command!=='status')event.ports[0]?.postMessage({ok:true});
 if(command==='status'){const c=await caches.open(PAGES),entries=[];for(const k of await c.keys()){const r=await c.match(k);if(Date.now()-Number(r.headers.get('X-Feuillet-Saved'))>86400000){await c.delete(k);continue;}entries.push({url:k.url,title:decodeURIComponent(r.headers.get('X-Feuillet-Title')||'Page')});}event.ports[0]?.postMessage({enabled:await enabled(),pages:entries.length,entries});}
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 const relative=url.pathname.slice(base.pathname.length);
 if(/^fonts\/(Quicksand|Fraunces|NotoSans(?:-Bold|-Italic|-BoldItalic)?)\.ttf$/.test(relative)){event.respondWith((async()=>{const c=await caches.open(SHELL),hit=await c.match(request);if(hit)return hit;const r=await fetch(request);if(r.ok)event.waitUntil(c.put(request,r.clone()));return r})());return;}
 if(assets.includes(relative)){if(url.searchParams.has('v')&&url.searchParams.get('v')!==VERSION){event.respondWith(fetch(request));return;}event.respondWith((async()=>{const c=await caches.open(SHELL),hit=await c.match(new URL(relative,base));return hit||fetch(request)})());return;}
 if(relative==='reader-state.php'){
  event.respondWith((async()=>{
   if(!await enabled())return fetch(request);
   let cache;try{cache=await caches.open(PAGES)}catch{return fetch(request)}const cacheKey=canonical(url);let saved=await cache.match(cacheKey);
   if(saved&&Date.now()-Number(saved.headers.get('X-Feuillet-Saved'))>86400000){await cache.delete(cacheKey);saved=null;}
   const network=fetch(request).then(async response=>{
    try{if(response.ok){const text=await response.clone().text();const value=JSON.parse(text);
     if(value.unavailable){const root=url.searchParams.get('root')||url.searchParams.get('page');for(const k of await cache.keys()){const u=new URL(k.url);if((u.searchParams.get('root')||u.searchParams.get('page'))===root)await cache.delete(k);} }
     if(value.html&&value.offlineEligible&&text.length<2000000&&await enabled()){
      await cache.put(cacheKey,new Response(text,{headers:{'Content-Type':'application/json','X-Feuillet-Saved':String(Date.now()),'X-Feuillet-Title':encodeURIComponent(value.title||'Page')}}));const keys=await cache.keys();while(keys.length>40)await cache.delete(keys.shift());
     }
    }}catch{/* Cache/quota errors must never break an online response. */}return response;
   });
   // Continue validation even if a slow connection causes the stored copy to be returned.
   event.waitUntil(network.catch(()=>{}));
   if(!saved)return network;
   const fallback=()=>new Response(saved.body,{headers:{'Content-Type':'application/json','X-Feuillet-Offline':'1'}});
   let timer;try{return await Promise.race([network,new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback()),1500)})]);}catch{return fallback();}finally{clearTimeout(timer);}
  })());return;
 }
 if(request.mode==='navigate'&&(relative==='index.php'||relative==='')&&!url.searchParams.has('edit')&&!url.searchParams.has('form')&&!url.searchParams.has('dashboard')){
  event.respondWith((async()=>{if(!await enabled())return fetch(request);const network=fetch(request);event.waitUntil(network.catch(()=>{}));let timer;try{return await Promise.race([network,new Promise(resolve=>{timer=setTimeout(async()=>resolve((await caches.open(SHELL)).match(new URL('offline.html',base))),1800)})]);}catch{return(await caches.open(SHELL)).match(new URL('offline.html',base));}finally{clearTimeout(timer)}})());
 }
});
