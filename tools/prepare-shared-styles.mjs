import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
copyFileSync(fileURLToPath(new URL('../frontend/src/gallery-layout.css',import.meta.url)),fileURLToPath(new URL('../public/gallery.css',import.meta.url)));
console.log('Galeries : styles communs préparés.');
copyFileSync(fileURLToPath(new URL('../frontend/src/theme-toggle.css',import.meta.url)),fileURLToPath(new URL('../public/theme-toggle.css',import.meta.url)));
