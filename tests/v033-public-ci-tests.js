'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const must = (value, message) => { if (!value) throw new Error(message); };
const text = file => fs.readFileSync(path.join(root, file), 'utf8');
const { categories, loadManifest, validateManifest } = require('../tools/run_public_ci.js');
const { validatePublicCiWorkflow } = require('../tools/validate_public_ci_workflow.js');

function hasGit() {
  return fs.existsSync(path.join(root, '.git'));
}

function trackedFiles() {
  if (hasGit()) return childProcess.execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  const files = [];
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else files.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  visit(root);
  return files.sort();
}

function expectFailure(action, code) {
  try {
    action();
  } catch (error) {
    must(String(error.message).includes(code), `expected ${code}, got ${error.message}`);
    return;
  }
  throw new Error(`expected failure: ${code}`);
}

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

const tracked = trackedFiles();
const workflow = text('.github/workflows/public-ci.yml');
const manifest = loadManifest(root);
const runner = text('tools/run_public_ci.js');
const parsed = validatePublicCiWorkflow();

must(parsed.status === 'YAML_STRUCTURAL_VALIDATION_PASSED', 'workflow YAML structural validation failed');
must(/^permissions:\r?\n  contents: read$/m.test(workflow), 'CI permissions must be read-only');
must(workflow.includes('fetch-depth: 0'), 'CI must retain full repository checkout for clean-export validation');
must(!/secrets\.|GITHUB_TOKEN|permissions:\s*write|git\s+push|gh\s+(?:api|pr|repo)/i.test(workflow), 'CI may not use secrets or write/network commands');
must(!/raw\/|\.pdf|validate_local_bank_sources|run_official_.*live|run_v031_watch/i.test(workflow), 'CI workflow must not read raw sources or run local/LIVE acquisition');
for (const pin of [
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0',
  'actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5.6.0'
]) must(workflow.includes(pin), `missing immutable verified action pin: ${pin}`);
must(!/actions\/(?:checkout|setup-node|setup-python)@v\d+/i.test(workflow), 'mutable major-version action tag found');
must(manifest.networkPolicy === 'OFFLINE_ONLY', 'public CI must be offline-only');
const manifestResult = validateManifest(manifest, root);
must(manifestResult.status === 'MANIFEST_VALIDATED', 'manifest did not validate');
must(categories.every(category => Array.isArray(manifest[category]) && manifest[category].length), 'manifest category missing or empty');
must(runner.includes('manifest.publicDefault') && runner.includes('manifest.publicBoundary') && runner.includes('manifest.ciInfrastructure'), 'runner is not manifest-driven');
must(runner.includes('LOCAL_SOURCE_VALIDATION_NOT_RUN') && runner.includes('LOCAL_BROWSER_VALIDATION_NOT_RUN') && runner.includes('LIVE_ACQUISITION_NOT_RUN'), 'NOT_RUN categories are not explicit');
must(!/https?:|fetch\(|http\.|https\.|LIVE_ACQUISITION_PASSED/.test(runner), 'public runner must not make network requests');
must(runner.includes('process.stderr.write') && runner.includes('result.status !== 0'), 'runner must propagate stderr and failure status');

const missing = deepCopy(manifest);
missing.publicDefault.push('tests/not-present-tests.js');
expectFailure(() => validateManifest(missing, root), 'MANIFEST_PATH_MISSING');
const duplicate = deepCopy(manifest);
duplicate.publicBoundary.push(duplicate.publicDefault[0]);
expectFailure(() => validateManifest(duplicate, root), 'MANIFEST_PATH_DUPLICATE');
const unclassified = deepCopy(manifest);
unclassified.publicDefault = unclassified.publicDefault.slice(1);
expectFailure(() => validateManifest(unclassified, root), 'MANIFEST_JS_TEST_CLASSIFICATION_MISMATCH');
must(runner.includes('validateManifest(manifest, projectRoot)'), 'runner must fail before executing an undeclared test set');

must(text('tests/v0321-public-boundary-tests.js').includes('LOCAL_SOURCE_VALIDATION_NOT_RUN'), 'local-only source boundary missing');
must(text('tests/v0322-synthetic-html-fixture-tests.js').includes('TEST_FIXTURE_SYNTHETIC'), 'synthetic fixture boundary missing');
for (const file of ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'PUBLIC_REPRODUCIBILITY.md', 'THIRD_PARTY_DATA_BOUNDARY.md']) must(fs.existsSync(path.join(root, file)), `missing public documentation: ${file}`);
must(text('README.md').includes('THIRD_PARTY_DATA_BOUNDARY.md'), 'README must link third-party boundary');
must(text('PUBLIC_REPRODUCIBILITY.md').includes('没有开源许可证'), 'public reproducibility document must state license boundary');
const restricted = tracked.filter(file => /(^|\/)(?:sources\/.*\/raw\/|\.env(?:\.|$)|credentials|secrets|tokens)(?:\/|$)|\.(?:pdf|pem|key|pfx|p12|db|sqlite3?)$/i.test(file));
must(restricted.length === 0, `public tree contains restricted file(s): ${restricted.join(', ')}`);
const slash = String.fromCharCode(92);
const personalPathFragments = [`C:${slash}Users${slash}`, ['', 'Users', ''].join('/'), ['', 'home', ''].join('/')];
const textFiles = tracked.filter(file => /\.(?:js|json|md|yml|yaml|py|html|css|txt)$/i.test(file));
must(textFiles.every(file => !personalPathFragments.some(fragment => text(file).includes(fragment))), 'public tree contains a personal absolute path');
if (hasGit()) {
  const remotes = childProcess.execFileSync('git', ['remote'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  must(!remotes.some(remote => /eos/i.test(remote)), 'EOS remote contamination detected');
}
console.log(`v0.33.1 public CI continuous-gate tests PASS (${tracked.length} public files; ${parsed.parser})`);
