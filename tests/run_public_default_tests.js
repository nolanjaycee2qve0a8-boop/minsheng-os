'use strict';

const childProcess = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { loadManifest, validateManifest } = require('../tools/run_public_ci.js');
const { runSubprocess } = require('../tools/subprocess-diagnostics.js');

function runPublicDefaultTests(projectRoot = root, files = null) {
  const manifest = loadManifest(projectRoot);
  validateManifest(manifest, projectRoot);
  for (const file of files || manifest.publicDefault) {
    process.stdout.write(runSubprocess({ cwd: projectRoot, file: process.execPath, args: [file] }));
  }
  console.log(`public default JavaScript tests PASS (${(files || manifest.publicDefault).length}); manifest is the authoritative classification`);
}

if (require.main === module) runPublicDefaultTests();
module.exports = { runPublicDefaultTests };
