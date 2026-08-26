'use strict';

const childProcess = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const diagnostics = require('../tools/subprocess-diagnostics.js');
const continuity = require('../tools/run_v0331_continuity_simulation.js');

const must = (value, message) => { if (!value) throw new Error(message); };
const node = process.execPath;
const githubCanary = ['gh', 'p', '_', 'canary', 'x'.repeat(32)].join('');
const bearerCanary = ['Bear', 'er ', 'canary', 'x'.repeat(32)].join('');
const openAiCanary = ['s', 'k-', 'canary', 'x'.repeat(32)].join('');

function capture(script) {
  return childProcess.spawnSync(node, ['-e', script], { cwd: root, encoding: 'utf8' });
}

function invokeContinuity(childSource) {
  return capture(`
    const runner = require(${JSON.stringify(path.join(root, 'tools', 'run_v0331_continuity_simulation.js'))});
    try {
      runner.execute(process.cwd(), process.execPath, ['-e', ${JSON.stringify(childSource)}]);
    } catch (error) {
      process.stdout.write('THROWN=' + error.message + '\\n');
      process.exitCode = 17;
    }
  `);
}

function invokePublicRunner(childSource) {
  return capture(`
    const runner = require(${JSON.stringify(path.join(root, 'tools', 'run_public_ci.js'))});
    try {
      runner.runSubprocess({ cwd: process.cwd(), file: process.execPath, args: ['-e', ${JSON.stringify(childSource)}] });
    } catch (error) {
      process.stdout.write('THROWN=' + error.message + '\\n');
      process.exitCode = 17;
    }
  `);
}

function assertRedacted(result, label, canaries) {
  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  must(result.status === 17, `${label} must preserve non-zero status`);
  for (const canary of canaries) must(!combined.includes(canary), `${label} leaked canary into parent output`);
  must(combined.includes('[REDACTED]'), `${label} must retain a redaction marker`);
  must(/exit status 17/.test(combined), `${label} must retain child exit status`);
}

const childFailure = [
  `process.stdout.write(${JSON.stringify(`stdout ${githubCanary} ${openAiCanary}`)});`,
  `process.stderr.write(${JSON.stringify(`stderr ${bearerCanary} Authorization: ${githubCanary}`)});`,
  'process.exit(17);'
].join('');

assertRedacted(invokeContinuity(childFailure), 'continuity failure', [githubCanary, bearerCanary, openAiCanary]);
assertRedacted(invokePublicRunner(childFailure), 'public CI failure', [githubCanary, bearerCanary, openAiCanary]);

const errorCanary = ['gh', 'o', '_', 'error', 'x'.repeat(32)].join('');
let errorMessage = '';
try {
  diagnostics.runSubprocess({
    cwd: root,
    file: 'synthetic',
    spawnSync: () => ({ error: new Error(`synthetic error ${errorCanary}`), stdout: errorCanary, stderr: errorCanary, status: null, signal: null })
  });
} catch (error) {
  errorMessage = error.message;
}
must(errorMessage.includes('[REDACTED]') && !errorMessage.includes(errorCanary), 'result.error.message must be redacted');

const normalFailure = invokeContinuity("process.stderr.write('useful plain diagnostic'); process.exit(17);");
must((normalFailure.stdout || '').includes('useful plain diagnostic'), 'ordinary failure diagnostic must remain useful');

const success = capture(`
  const runner = require(${JSON.stringify(path.join(root, 'tools', 'run_v0331_continuity_simulation.js'))});
  runner.execute(process.cwd(), process.execPath, ['-e', "process.stdout.write('SAFE_PROGRESS')"]);
`);
must(success.status === 0 && (success.stdout || '').includes('SAFE_PROGRESS') && !(success.stderr || '').includes('SAFE_PROGRESS'), 'successful stdout must remain available');

const longDiagnostic = diagnostics.redactDiagnostic('x'.repeat(diagnostics.MAX_DIAGNOSTIC_LENGTH + 25));
must(longDiagnostic.endsWith('[TRUNCATED]') && longDiagnostic.length > diagnostics.MAX_DIAGNOSTIC_LENGTH, 'long diagnostics must truncate deterministically');

const legacy = capture(`
  const child = require('child_process').spawnSync(process.execPath, ['-e', ${JSON.stringify(`process.stderr.write(${JSON.stringify(githubCanary)}); process.exit(17);`)}], { encoding: 'utf8' });
  process.stderr.write(child.stderr || '');
  process.exitCode = child.status;
`);
must((legacy.stderr || '').includes(githubCanary), 'legacy raw stderr control must demonstrate the regression');
must(continuity.safeStderr(`Bearer ${bearerCanary}`).includes('[REDACTED]'), 'continuity compatibility redactor must cover Bearer values');
console.log('v0.33.2 subprocess log-safety tests PASS');
