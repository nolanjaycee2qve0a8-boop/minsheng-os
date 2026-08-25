'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const excluded = new Set(['run_public_default_tests.js', 'v029-browser-audit-tests.js', 'v0321-public-boundary-tests.js', 'v033-public-ci-tests.js']);
const tests = fs.readdirSync(__dirname)
  .filter(name => /^v\d+.*-tests\.js$/.test(name) && !excluded.has(name))
  .sort();
for (const file of tests) {
  const result = childProcess.spawnSync(process.execPath, [path.join('tests', file)], { cwd: root, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0 || result.error) throw result.error || new Error(`Public default test failed: ${file}`);
}
console.log(`public default JavaScript tests PASS (${tests.length}); local real-browser audit is intentionally separate`);
