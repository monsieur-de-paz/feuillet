import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seen=new Map();
async function packages(dir){
  for(const item of await readdir(dir,{withFileTypes:true})){
    if(item.name.startsWith('.'))continue;
    const folder=path.join(dir,item.name);
    if(item.name.startsWith('@')){await packages(folder);continue;}
    if(!item.isDirectory())continue;
    let pkg;try{pkg=JSON.parse(await readFile(path.join(folder,'package.json'),'utf8'));}catch{continue;}
    const key=pkg.name+'@'+pkg.version;if(!seen.has(key)){
      const licenses=(await readdir(folder)).filter(name=>/^(license|licence|copying|notice)(\.|_|$)/i.test(name));
      let text='';for(const name of licenses)try{text+='\n\n--- '+name+' ---\n'+await readFile(path.join(folder,name),'utf8');}catch{}
      seen.set(key,{pkg,text});
    }
    try{await packages(path.join(folder,'node_modules'));}catch{}
  }
}
await packages(path.join(root,'frontend/node_modules'));
await mkdir(path.join(root,'licenses/npm'),{recursive:true});
let report='# Notices des dépendances\n\nLe code Feuillet est sous licence MIT. Les dépendances conservent leurs licences propres. Ce relevé inclut les composants distribués et les outils de compilation présents dans le verrouillage npm ; tous ne sont pas embarqués dans le JavaScript final. Aucun composant Tiptap Pro ni template commercial n’est utilisé.\n\n| Composant | Licence déclarée | Texte conservé |\n|---|---|---|\n';
for(const [key,{pkg,text}] of [...seen].sort(([a],[b])=>a.localeCompare(b))){
  const name=key.replace(/[^a-zA-Z0-9._-]/g,'_')+'.txt';
  if(text)await writeFile(path.join(root,'licenses/npm',name),key+'\n'+text);
  report+='| '+key+' | '+(typeof pkg.license==='string'?pkg.license:'Voir le package')+' | '+(text?'[Licence](licenses/npm/'+name+')':'Métadonnées npm')+' |\n';
}
report+='\nPDF.js 5.4.296 est également distribué sous Apache-2.0 dans `public/vendor/pdfjs/`, avec les licences propres aux polices, CMaps et décodeurs WASM dans leurs dossiers. REA est un outil d’analyse MIT, utilisé séparément pendant le développement et non embarqué dans le serveur. Les captures Notion sont des références documentaires attribuées à leur source ; la licence du code Feuillet ne modifie pas les droits des documents ni des captures.\n';
report+='\nLes polices Noto Sans Regular, Bold, Italic et BoldItalic sont distribuées dans `public/fonts/`, sous SIL Open Font License 1.1 ; leur texte de licence est conservé dans [public/fonts/OFL.txt](public/fonts/OFL.txt). Source : https://github.com/notofonts/noto-fonts .\n';
report+='\nLes captures Feuillet 0.2 et 0.3 dans `docs/` montrent aussi [Toyota Robot at Toyota Kaikan](https://commons.wikimedia.org/wiki/File:Toyota_Robot_at_Toyota_Kaikan.jpg), image sous [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). La page Commons fournit les informations de provenance ; ces images conservent leur licence propre.\n';
report+='\nLes polices variables Quicksand et Fraunces sont distribuées sous SIL Open Font License 1.1 dans `public/fonts/`. Leurs licences sont conservées dans Quicksand-OFL.txt et Fraunces-OFL.txt. Source officielle : https://github.com/google/fonts/tree/main/ofl/quicksand et https://github.com/google/fonts/tree/main/ofl/fraunces .\n';
await writeFile(path.join(root,'THIRD-PARTY-NOTICES.md'),report);
console.log(`${seen.size} notices de dépendances préparées.`);
