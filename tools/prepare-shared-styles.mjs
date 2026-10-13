import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
copyFileSync(fileURLToPath(new URL('../frontend/src/gallery-layout.css',import.meta.url)),fileURLToPath(new URL('../public/gallery.css',import.meta.url)));
console.log('Galeries : styles communs préparés.');
copyFileSync(fileURLToPath(new URL('../frontend/src/theme-toggle.css',import.meta.url)),fileURLToPath(new URL('../public/theme-toggle.css',import.meta.url)));

import {createRequire} from 'node:module';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const {buildSync}=require('esbuild');
buildSync({entryPoints:[fileURLToPath(new URL('../frontend/src/theme-colors.ts',import.meta.url))],outfile:fileURLToPath(new URL('../public/theme-colors.js',import.meta.url)),bundle:true,format:'iife',globalName:'FeuilletThemeColors',target:'es2020',minify:true});
console.log('Couleurs : algorithme partagé préparé pour le lecteur.');
