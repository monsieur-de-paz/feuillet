// Run after npm ci in frontend/. Bundles the real source, never mocks Tiptap.
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'frontend/package.json'));
const { build } = require('esbuild');
const scratch = await mkdtemp(join(tmpdir(), 'feuillet-frontend-tests-'));
try {
  for (const name of ['database-views', 'block-presentations', 'block-roundtrip', 'documents', 'theme-colors', 'navigation', 'interface', 'sidebar-width', 'toggle-headings', 'block-moving']) {
    const outfile = join(scratch, name + '.mjs');
    await build({ entryPoints: [join(root, 'tests/frontend', name + '.ts')], bundle: true, platform: 'node', format: 'esm', outfile, nodePaths: [join(root, 'frontend/node_modules')], loader: { '.css': 'empty', '.svg': 'text', '.ttf': 'empty' }, logLevel: 'error' });
    const result = spawnSync(process.execPath, [outfile], { stdio: 'inherit', cwd: root });
    if (result.status !== 0) process.exitCode = 1;
  }
} finally { await rm(scratch, { recursive: true, force: true }); }
