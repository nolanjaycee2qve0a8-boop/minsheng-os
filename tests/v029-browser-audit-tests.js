/* The browser audit is intentionally a real HTTP/Chromium run, not a DOM shim. */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const node = process.execPath;
const result = spawnSync(node, [path.join('tools', 'run_v029_browser_audit.js')], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 180000 });
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`v0.29.1 browser audit failed with exit status ${result.status}`);
console.log('v0.29.1 browser audit wrapper PASS');
