'use strict';

const childProcess = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { loadManifest, validateManifest } = require('../tools/run_public_ci.js');
const { runSubprocess } = require('../tools/subprocess-diagnostics.js');

const manifest = loadManifest(root);
validateManifest(manifest, root);
for (const file of manifest.publicDefault) {
  process.stdout.write(runSubprocess({ cwd: root, file: process.execPath, args: [file] }));
}
console.log(`public default JavaScript tests PASS (${manifest.publicDefault.length}); manifest is the authoritative classification`);
