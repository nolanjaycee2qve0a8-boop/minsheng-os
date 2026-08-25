'use strict';

const childProcess = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { loadManifest, validateManifest } = require('../tools/run_public_ci.js');

const manifest = loadManifest(root);
validateManifest(manifest, root);
for (const file of manifest.publicDefault) {
  const result = childProcess.spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0 || result.error) throw result.error || new Error(`Public default test failed: ${file}`);
}
console.log(`public default JavaScript tests PASS (${manifest.publicDefault.length}); manifest is the authoritative classification`);
