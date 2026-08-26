/* Deterministic, offline-only entry point for the public GitHub Actions job. */
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const { runSubprocess } = require('./subprocess-diagnostics.js');
const root = path.resolve(__dirname, '..');
const python = process.env.PYTHON_BIN || process.env.PYTHON || 'python';
const categories = ['publicDefault', 'publicBoundary', 'ciInfrastructure', 'pythonPublic', 'localOnly', 'browserOnly', 'liveAcquisition'];

function loadManifest(projectRoot = root) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, 'config', 'public-ci-test-manifest.json'), 'utf8'));
}

function listPublicTestFiles(projectRoot, expression) {
  const directory = path.join(projectRoot, 'tests');
  return fs.readdirSync(directory)
    .filter(name => expression.test(name))
    .map(name => path.posix.join('tests', name))
    .sort();
}

function validateManifest(manifest, projectRoot = root) {
  if (manifest.networkPolicy !== 'OFFLINE_ONLY') throw new Error('MANIFEST_NETWORK_POLICY_INVALID');
  for (const category of categories) {
    if (!Array.isArray(manifest[category]) || manifest[category].length === 0) throw new Error(`MANIFEST_CATEGORY_INVALID:${category}`);
  }
  const owners = new Map();
  for (const category of categories) {
    for (const relative of manifest[category]) {
      if (typeof relative !== 'string' || relative.includes('..') || path.isAbsolute(relative)) throw new Error(`MANIFEST_PATH_INVALID:${category}`);
      if (!fs.existsSync(path.join(projectRoot, relative))) throw new Error(`MANIFEST_PATH_MISSING:${category}:${relative}`);
      if (owners.has(relative)) throw new Error(`MANIFEST_PATH_DUPLICATE:${relative}:${owners.get(relative)}:${category}`);
      owners.set(relative, category);
    }
  }
  const declaredJsTests = [...manifest.publicDefault, ...manifest.publicBoundary, ...manifest.browserOnly].sort();
  const actualJsTests = listPublicTestFiles(projectRoot, /^v\d+.*-tests\.js$/);
  if (JSON.stringify(declaredJsTests) !== JSON.stringify(actualJsTests)) throw new Error('MANIFEST_JS_TEST_CLASSIFICATION_MISMATCH');
  const declaredPyTests = [...manifest.pythonPublic].sort();
  const actualPyTests = listPublicTestFiles(projectRoot, /^test_.*\.py$/);
  if (JSON.stringify(declaredPyTests) !== JSON.stringify(actualPyTests)) throw new Error('MANIFEST_PY_TEST_CLASSIFICATION_MISMATCH');
  return { status: 'MANIFEST_VALIDATED', declaredPaths: owners.size, javascriptTests: actualJsTests.length, pythonTests: actualPyTests.length };
}

function buildExecutionPlan(manifest, nestedContinuity = false) {
  const runNode = (category, relative) => ({ kind: 'RUN', category, label: `${category}:${relative}`, executable: process.execPath, args: [relative] });
  const plan = [
    ...manifest.publicDefault.map(relative => runNode('public-default', relative)),
    ...manifest.publicBoundary.map(relative => runNode('public-boundary', relative)),
    ...manifest.ciInfrastructure.map(relative => nestedContinuity && relative === 'tools/run_v0331_continuity_simulation.js'
      ? { kind: 'NOT_RUN', category: 'ci-infrastructure', label: 'continuity-simulation', status: 'NESTED_CONTINUITY_CHILD' }
      : runNode('ci-infrastructure', relative)),
    ...manifest.pythonPublic.map(relative => ({ kind: 'RUN', category: 'python-public', label: `python-public:${relative}`, executable: python, args: [relative] })),
    { kind: 'NOT_RUN', category: 'local-only', label: 'local-bank-source-validation', status: 'LOCAL_SOURCE_VALIDATION_NOT_RUN' },
    { kind: 'NOT_RUN', category: 'browser-only', label: 'real-browser-validation', status: 'LOCAL_BROWSER_VALIDATION_NOT_RUN' },
    { kind: 'NOT_RUN', category: 'live-acquisition', label: 'live-acquisition', status: 'LIVE_ACQUISITION_NOT_RUN' }
  ];
  if (plan.some(step => step.kind === 'RUN' && ['localOnly', 'browserOnly', 'liveAcquisition'].includes(step.category))) throw new Error('EXECUTION_PLAN_FORBIDDEN_CATEGORY');
  return plan;
}

function main(projectRoot = root) {
  const manifest = loadManifest(projectRoot);
  const manifestResult = validateManifest(manifest, projectRoot);
  let passed = 0;
  let notRun = 0;
  const nestedContinuity = process.env.MINSHENG_CI_CONTINUITY_CHILD === '1';

  function run(label, executable, args = []) {
    process.stdout.write(`CI_STAGE START ${label}\n`);
    const stdout = runSubprocess({ cwd: projectRoot, file: executable, args, env: process.env });
    process.stdout.write(stdout);
    passed += 1;
    process.stdout.write(`CI_STAGE PASS ${label}\n`);
  }

  function notRunStatus(label, status) {
    notRun += 1;
    process.stdout.write(`CI_STAGE NOT_RUN ${label}: ${status}\n`);
  }

  function tracked(extension) {
    return runSubprocess({ cwd: projectRoot, file: 'git', args: ['ls-files', `*.${extension}`] })
      .split(/\r?\n/).filter(Boolean);
  }

  function ensureClean() {
    const output = runSubprocess({ cwd: projectRoot, file: 'git', args: ['status', '--porcelain'] }).trim();
    if (output) throw new Error(`WORKTREE_POLLUTION: ${output.split(/\r?\n/).length} changed path(s)`);
  }

  try {
    ensureClean();
    process.stdout.write(`CI_MANIFEST ${JSON.stringify(manifestResult)}\n`);
    for (const step of buildExecutionPlan(manifest, nestedContinuity)) {
      if (step.kind === 'RUN') run(step.label, step.executable, step.args);
      else notRunStatus(step.label, step.status);
    }
    for (const file of tracked('js')) run(`js-syntax:${file}`, process.execPath, ['--check', file]);
    for (const file of tracked('py')) run(`python-compile:${file}`, python, ['-m', 'py_compile', file]);
    run('clean-export-reproducibility', process.execPath, ['tools/run_clean_public_export.js']);
    ensureClean();
    process.stdout.write(`PUBLIC_CI_SUMMARY PASS=${passed} FAIL=0 NOT_RUN=${notRun} policy=${manifest.networkPolicy}\n`);
  } catch (error) {
    process.stderr.write(`PUBLIC_CI_SUMMARY PASS=${passed} FAIL=1 NOT_RUN=${notRun} policy=${manifest.networkPolicy}\n`);
    throw error;
  }
}

if (require.main === module) main();
module.exports = { categories, loadManifest, validateManifest, buildExecutionPlan, main, runSubprocess };
