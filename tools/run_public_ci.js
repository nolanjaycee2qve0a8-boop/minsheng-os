/* Deterministic, offline-only entry point for the public GitHub Actions job. */
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config', 'public-ci-test-manifest.json'), 'utf8'));
const python = process.env.PYTHON_BIN || process.env.PYTHON || 'python';
let passed = 0;
let notRun = 0;

function run(label, file, args = []) {
  process.stdout.write(`CI_STAGE START ${label}\n`);
  const result = childProcess.spawnSync(file, args, { cwd: root, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error || result.status !== 0) throw result.error || new Error(`${label} failed with exit status ${result.status}`);
  passed += 1;
  process.stdout.write(`CI_STAGE PASS ${label}\n`);
}

function notRunStatus(label, status) {
  notRun += 1;
  process.stdout.write(`CI_STAGE NOT_RUN ${label}: ${status}\n`);
}

function tracked(extension) {
  return childProcess.execFileSync('git', ['ls-files', `*.${extension}`], { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/).filter(Boolean);
}

function ensureClean() {
  const output = childProcess.execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
  if (output) throw new Error(`WORKTREE_POLLUTION: ${output.split(/\r?\n/).length} changed path(s)`);
}

try {
  if (manifest.networkPolicy !== 'OFFLINE_ONLY') throw new Error('public CI manifest must remain offline-only');
  ensureClean();
  run('workflow-yaml-structure', process.execPath, ['tools/validate_public_ci_workflow.js']);
  run('public-default-js', process.execPath, manifest.publicDefault);
  run('public-boundary-v0321', process.execPath, ['tests/v0321-public-boundary-tests.js']);
  run('public-boundary-v0322', process.execPath, ['tests/v0322-synthetic-html-fixture-tests.js']);
  run('selector-population-determinism', process.execPath, ['tests/v029-selector-population-tests.js']);
  run('v033-public-ci-gates', process.execPath, ['tests/v033-public-ci-tests.js']);
  run('python-tests', python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py']);
  for (const file of tracked('js')) run(`js-syntax:${file}`, process.execPath, ['--check', file]);
  for (const file of tracked('py')) run(`python-compile:${file}`, python, ['-m', 'py_compile', file]);
  run('clean-export-reproducibility', process.execPath, ['tools/run_clean_public_export.js']);
  const local = require('./validate_local_bank_sources.js').validateLocalBankSources({ root: path.join(root, '__public_ci_without_local_sources__') });
  if (local.status !== 'LOCAL_SOURCE_VALIDATION_NOT_RUN') throw new Error(`unexpected local-only status: ${local.status}`);
  notRunStatus('local-bank-source-validation', local.status);
  notRunStatus('real-browser-validation', 'LOCAL_BROWSER_VALIDATION_NOT_RUN');
  notRunStatus('live-acquisition', 'LIVE_ACQUISITION_NOT_RUN');
  ensureClean();
  process.stdout.write(`PUBLIC_CI_SUMMARY PASS=${passed} FAIL=0 NOT_RUN=${notRun} policy=${manifest.networkPolicy}\n`);
} catch (error) {
  process.stderr.write(`PUBLIC_CI_SUMMARY PASS=${passed} FAIL=1 NOT_RUN=${notRun} policy=${manifest.networkPolicy}\n`);
  throw error;
}
