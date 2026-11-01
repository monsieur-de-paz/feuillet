import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
let click:any,created=0,played=0,replaced:any;
const document={addEventListener:(_type:string,cb:any)=>click=cb,createElement:()=>{created++;return {setAttribute(){},focus(){},play(){played++;return Promise.resolve();}};}};
vm.runInNewContext(fs.readFileSync('public/video-lazy.js','utf8'),{document});assert.equal(created,0);assert.equal(played,0);
const button={dataset:{videoSrc:'media.php?id=11111111-1111-4111-8111-111111111111'},querySelector:()=>({getAttribute:()=> 'video-placeholder.svg'}),getAttribute:()=> 'Lire',replaceWith:(v:any)=>replaced=v};
click({target:{closest:()=>button}});assert.equal(created,1);assert.equal(played,1);assert.equal(replaced.preload,'none');assert.equal(replaced.src,button.dataset.videoSrc);
button.dataset.videoSrc='https://evil.example/video.mp4';click({target:{closest:()=>button}});assert.equal(created,1);console.log('Lazy video: no player before click, explicit playback and fixed local URL policy');
