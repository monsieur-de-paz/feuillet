import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
let clock=Date.now();class Clock extends Date { static now(){return clock} }
const listeners={},stores=new Map();
const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name);return {async match(k){return m.get(typeof k==='string'?k:k.url)?.clone()},async put(k,v){m.set(typeof k==='string'?k:k.url,v.clone())},async delete(k){return m.delete(typeof k==='string'?k:k.url)},async keys(){return [...m.keys()].map(u=>new Request(u))},async addAll(){}}},async keys(){return [...stores.keys()]},async delete(k){return stores.delete(k)}};
let online=true,value={html:'<h1>Public</h1>',title:'Une page',token:'a',offlineEligible:true};
const network=async()=>{if(!online)throw Error('offline');return new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}})};
runInNewContext(readFileSync('public/sw.js','utf8'),{self:{location:'https://example.test/feuillet/sw.js',addEventListener:(n,f)=>listeners[n]=f,clients:{claim:async()=>{}},skipWaiting:()=>{}},URL,Request,Response,caches,fetch:network,setTimeout,clearTimeout,Date:Clock,Boolean,JSON,Number,encodeURIComponent,decodeURIComponent});
async function command(command){let data;const tasks=[];listeners.message({data:{command},ports:[{postMessage:v=>data=v}],waitUntil:p=>tasks.push(p)});await Promise.all(tasks);return data}
async function request(path){const tasks=[];let result;listeners.fetch({request:new Request('https://example.test/feuillet/'+path),respondWith:p=>result=p,waitUntil:p=>tasks.push(p)});if(!result)return null;const r=await result;await Promise.all(tasks);return r}
assert.equal((await command('status')).pages,0);await request('reader-state.php?page=one&root=root');assert.equal((await command('status')).pages,0);
await command('enable');await request('reader-state.php?page=one&root=root');assert.equal((await command('status')).pages,1);
online=false;let r=await request('reader-state.php?page=one&root=root&token=a');assert.equal(r.headers.get('X-Feuillet-Offline'),'1');assert.equal((await r.json()).html,value.html);
await assert.rejects(request('reader-state.php?page=one&root=other'));
assert.equal(await request('api.php?action=pages'),null);assert.equal(await request('media.php?id=secret'),null);assert.equal(await request('pdf-viewer.php?id=secret'),null);
online=true;value={...value,html:'ADMIN',offlineEligible:false};await request('reader-state.php?page=admin');assert.equal((await command('status')).pages,1);
value={...value,html:'new',offlineEligible:true,token:'b'};await request('reader-state.php?page=one&root=root');online=false;assert.equal((await(await request('reader-state.php?page=one&root=root')).json()).html,'new');
online=true;value={...value,unavailable:true,offlineEligible:false};await request('reader-state.php?page=one&root=root');assert.equal((await command('status')).pages,0);
value={html:'public',title:'Page',offlineEligible:true};for(let i=0;i<42;i++)await request('reader-state.php?page='+i);assert.equal((await command('status')).pages,40);
clock+=86400001;assert.equal((await command('status')).pages,0);
await command('clear');assert.equal((await command('status')).enabled,false);assert.equal((await command('status')).pages,0);
console.log('PWA: opt-in, offline copy, root isolation, no admin/API/media caching, refresh, revocation, 40-page bound and clear passed');
