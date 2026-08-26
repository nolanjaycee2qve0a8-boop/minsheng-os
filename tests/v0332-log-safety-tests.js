'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.resolve(__dirname, '..');
const diagnostics = require('../tools/subprocess-diagnostics.js');

const must = (value, message) => { if (!value) throw new Error(message); };
const node = process.execPath;
const token = (prefix, label) => [prefix.slice(0, 2), prefix.slice(2), label, 'x'.repeat(28)].join('');
const baseCanaries = [
  token('ghp_', 'classic'), token('gho_', 'oauth'), token('ghu_', 'user'), token('ghs_', 'server'), token('ghr_', 'refresh'),
  token('github_pat_', 'fine'), token('sk-', 'openai'), ['Bear', 'er ', 'bearer', 'x'.repeat(28)].join(''),
  ['Auth', 'orization: ', 'Bearer ', 'auth', 'x'.repeat(28)].join(''), ['https://user', ':pass@example.test/path'].join('')
];
const queryCanaries = [
  ['access', '_token=', 'access', 'x'.repeat(28)].join(''), ['api', '_key=', 'api', 'x'.repeat(28)].join(''),
  ['api', '-key=', 'dash', 'x'.repeat(28)].join(''), ['authorization', '=', 'query', 'x'.repeat(28)].join(''), ['token', '=', 'token', 'x'.repeat(28)].join('')
];
const canaries = [...baseCanaries, ...queryCanaries];
const queryUrl = `https://example.test/path?${queryCanaries.join('&')}`;
const mixedCase = token('GhU_', 'mixed');
const childFailure = `const c=${JSON.stringify([...baseCanaries, queryUrl, mixedCase])}; process.stdout.write('out\\n'+c.join('  \\n ')); process.stderr.write('err\\n'+c.join('  \\n ')); process.exit(17);`;

function capture(script) {
  return childProcess.spawnSync(node, ['-e', script], { cwd: root, encoding: 'utf8' });
}

function assertSafe(result, label, expectedState = 'exit status 17') {
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  must(result.status === 17, `${label} must preserve parent exit status`);
  for (const canary of [...canaries, mixedCase]) must(!output.includes(canary), `${label} leaked a canary`);
  must(output.includes('[REDACTED]'), `${label} must retain redaction marker`);
  must(output.includes(expectedState), `${label} must retain failure state`);
  const thrown = output.split('THROWN=')[1] || '';
  must(thrown.trim().length <= diagnostics.MAX_DIAGNOSTIC_LENGTH, `${label} thrown diagnostic must remain bounded`);
}

function invoke(modulePath, expression, childSource = childFailure) {
  return capture(`
    const runner = require(${JSON.stringify(modulePath)});
    try { ${expression.replace('__CHILD__', JSON.stringify(childSource))} }
    catch (error) { process.stdout.write('THROWN=' + error.message + '\\n'); process.exitCode = 17; }
  `);
}

assertSafe(invoke(path.join(root, 'tools', 'run_v0331_continuity_simulation.js'), "runner.execute(process.cwd(), process.execPath, ['-e', __CHILD__]);"), 'continuity runner');
assertSafe(invoke(path.join(root, 'tools', 'run_public_ci.js'), "runner.runStage('diagnostic-probe', process.execPath, ['-e', __CHILD__], process.cwd());"), 'public CI stage');
assertSafe(invoke(path.join(root, 'tools', 'run_clean_public_export.js'), "runner.command(process.execPath, ['-e', __CHILD__], process.cwd());"), 'clean export command');

const defaultProbe = path.join(os.tmpdir(), `minsheng-log-safety-${process.pid}.js`);
try {
  fs.writeFileSync(defaultProbe, childFailure, 'utf8');
  assertSafe(invoke(path.join(root, 'tests', 'run_public_default_tests.js'), `runner.runPublicDefaultTests(process.cwd(), [${JSON.stringify(defaultProbe)}]);`, childFailure), 'public default runner');
} finally {
  if (fs.existsSync(defaultProbe)) fs.rmSync(defaultProbe, { force: true });
}

const spawnCanary = token('ghu_', 'sync');
const spawnThrow = capture(`
  const diagnostics = require(${JSON.stringify(path.join(root, 'tools', 'subprocess-diagnostics.js'))});
  try { diagnostics.runSubprocess({ cwd: process.cwd(), file: 'C:/safe/node.exe', spawnSync: () => { throw { message: ${JSON.stringify(spawnCanary)}, cause: ${JSON.stringify(canaries[0])} }; } }); }
  catch (error) { process.stdout.write('THROWN=' + error.message); process.exitCode = 17; }
`);
must(!(spawnThrow.stdout || '').includes(spawnCanary) && !(spawnThrow.stdout || '').includes(canaries[0]), 'synchronous spawn throw leaked a canary');
must((spawnThrow.stdout || '').includes('spawn failure') && (spawnThrow.stdout || '').includes('[REDACTED]'), 'synchronous spawn throw must be formatted and redacted');

const returnedErrorCanary = token('ghr_', 'returned-error');
const originalError = new Error(returnedErrorCanary);
let returnedError;
try {
  diagnostics.runSubprocess({
    cwd: root,
    file: `C:/safe/${returnedErrorCanary}/node.exe`,
    spawnSync: () => ({ error: originalError, stdout: `${returnedErrorCanary} ${queryUrl}`, stderr: returnedErrorCanary, status: null, signal: null })
  });
} catch (error) {
  returnedError = error;
}
must(returnedError && returnedError !== originalError, 'returned spawn error must not escape directly');
must(returnedError.message.includes('spawn failure') && returnedError.message.includes('[REDACTED]'), 'returned spawn error must use redacted spawn-failure formatting');
must(returnedError.message.length <= diagnostics.MAX_DIAGNOSTIC_LENGTH, 'returned spawn error must remain bounded');
must(!returnedError.message.includes(returnedErrorCanary) && !returnedError.message.includes(queryUrl), 'returned spawn error leaked a raw diagnostic');

const signal = diagnostics.subprocessFailure('C:/safe/node.exe', [], { signal: 'SIGTERM', status: null, stdout: canaries[0], stderr: canaries[1], error: null });
must(signal.message.includes('signal SIGTERM') && signal.message.length <= diagnostics.MAX_DIAGNOSTIC_LENGTH, 'signal diagnostics must be bounded');

for (const limit of [undefined, 0, 1, 5, diagnostics.TRUNCATION_MARKER.length, diagnostics.TRUNCATION_MARKER.length + 1, 17, diagnostics.MAX_DIAGNOSTIC_LENGTH, -1, 1.8, NaN, Infinity]) {
  const normalized = diagnostics.normalizeMaxLength(limit);
  const output = diagnostics.redactDiagnostic('x'.repeat(diagnostics.MAX_DIAGNOSTIC_LENGTH + 25), limit);
  must(output.length <= normalized, `strict length bound failed for ${String(limit)}`);
  if (normalized >= diagnostics.TRUNCATION_MARKER.length) must(output.includes(diagnostics.TRUNCATION_MARKER), `truncation marker missing for ${String(limit)}`);
}

for (const limit of [undefined, 0, -1, 1, 5, diagnostics.TRUNCATION_MARKER.length, diagnostics.TRUNCATION_MARKER.length + 1, 17.8, NaN, Infinity, diagnostics.MAX_DIAGNOSTIC_LENGTH, 73]) {
  const normalized = diagnostics.normalizeMaxLength(limit);
  const message = diagnostics.subprocessFailure(
    `C:/safe/${token('ghp_', 'long-file')}/${'f'.repeat(800)}.exe`,
    [],
    {
      signal: `SIGTERM ${token('gho_', 'long-signal')}${'s'.repeat(800)}`,
      error: { message: `${token('ghu_', 'long-error')}${'e'.repeat(800)}` },
      stdout: `${token('ghs_', 'long-stdout')}${'o'.repeat(800)} ${queryUrl}`,
      stderr: `${token('sk-', 'long-stderr')}${'r'.repeat(800)}`,
      status: null
    },
    limit
  ).message;
  must(message.length <= normalized, `complete subprocess failure bound failed for ${String(limit)}`);
  for (const canary of [token('ghp_', 'long-file'), token('gho_', 'long-signal'), token('ghu_', 'long-error'), token('ghs_', 'long-stdout'), token('sk-', 'long-stderr'), queryUrl]) must(!message.includes(canary), `complete subprocess failure leaked ${String(limit)}`);
  if (normalized >= diagnostics.TRUNCATION_MARKER.length && normalized < 1200) must(message.includes(diagnostics.TRUNCATION_MARKER), `complete subprocess failure marker missing for ${String(limit)}`);
}
must(diagnostics.subprocessFailure('safe.exe', [], { status: 17, stdout: '', stderr: '', error: null }, 80).message.includes('exit status 17'), 'complete subprocess failure must retain state when space permits');

const legacy = capture(`
  const child = require('child_process').spawnSync(process.execPath, ['-e', ${JSON.stringify(`process.stderr.write(${JSON.stringify(canaries[0])}); process.exit(17);`)}], { encoding: 'utf8' });
  process.stderr.write(child.stderr || ''); process.exitCode = child.status;
`);
must((legacy.stderr || '').includes(canaries[0]), 'legacy raw stderr control must demonstrate the regression');
console.log('v0.33.2 subprocess log-safety tests PASS');
