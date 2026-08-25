/* Deterministic, offline-only entry point for the public GitHub Actions job. */
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
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

function main(projectRoot = root) {
  const manifest = loadManifest(projectRoot);
  const manifestResult = validateManifest(manifest, projectRoot);
  let passed = 0;
  let notRun = 0;
  const nestedContinuity = process.env.MINSHENG_CI_CONTINUITY_CHILD === '1';

  function run(label, executable, args = []) {
    process.stdout.write(`CI_STAGE START ${label}\n`);
    const result = childProcess.spawnSync(executable, args, { cwd: projectRoot, encoding: 'utf8', env: process.env });
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
    return childProcess.execFileSync('git', ['ls-files', `*.${extension}`], { cwd: projectRoot, encoding: 'utf8' })
      .split(/\r?\n/).filter(Boolean);
  }

  function ensureClean() {
    const output = childProcess.execFileSync('git', ['status', '--porcelain'], { cwd: projectRoot, encoding: 'utf8' }).trim();
    if (output) throw new Error(`WORKTREE_POLLUTION: ${output.split(/\r?\n/).length} changed path(s)`);
  }

  try {
    ensureClean();
    process.stdout.write(`CI_MANIFEST ${JSON.stringify(manifestResult)}\n`);
    for (const relative of manifest.publicDefault) run(`public-default:${relative}`, process.execPath, [relative]);
    for (const relative of manifest.publicBoundary) run(`public-boundary:${relative}`, process.execPath, [relative]);
    for (const relative of manifest.ciInfrastructure) {
      if (nestedContinuity && relative === 'tools/run_v0331_continuity_simulation.js') {
        notRunStatus('continuity-simulation', 'NESTED_CONTINUITY_CHILD');
      } else {
        run(`ci-infrastructure:${relative}`, process.execPath, [relative]);
      }
    }
    run('python-public-tests', python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py']);
    for (const file of tracked('js')) run(`js-syntax:${file}`, process.execPath, ['--check', file]);
    for (const file of tracked('py')) run(`python-compile:${file}`, python, ['-m', 'py_compile', file]);
    run('clean-export-reproducibility', process.execPath, ['tools/run_clean_public_export.js']);
    notRunStatus('local-bank-source-validation', 'LOCAL_SOURCE_VALIDATION_NOT_RUN');
    notRunStatus('real-browser-validation', 'LOCAL_BROWSER_VALIDATION_NOT_RUN');
    notRunStatus('live-acquisition', 'LIVE_ACQUISITION_NOT_RUN');
    ensureClean();
    process.stdout.write(`PUBLIC_CI_SUMMARY PASS=${passed} FAIL=0 NOT_RUN=${notRun} policy=${manifest.networkPolicy}\n`);
  } catch (error) {
    process.stderr.write(`PUBLIC_CI_SUMMARY PASS=${passed} FAIL=1 NOT_RUN=${notRun} policy=${manifest.networkPolicy}\n`);
    throw error;
  }
}

if (require.main === module) main();
module.exports = { categories, loadManifest, validateManifest, main };
