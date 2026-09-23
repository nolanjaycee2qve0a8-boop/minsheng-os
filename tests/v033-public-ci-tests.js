'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.resolve(__dirname, '..');
const must = (value, message) => { if (!value) throw new Error(message); };
const text = file => fs.readFileSync(path.join(root, file), 'utf8');
const { categories, loadManifest, validateManifest, buildExecutionPlan } = require('../tools/run_public_ci.js');
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

function expectWorkflowMutation(label, mutate, code) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'minsheng-v033-workflow-mutation-'));
  const file = path.join(directory, 'public-ci.yml');
  try {
    fs.writeFileSync(file, mutate(workflow), 'utf8');
    expectFailure(() => validatePublicCiWorkflow(file), code);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  must(!fs.existsSync(directory), `workflow mutation directory not removed: ${label}`);
}

const tracked = trackedFiles();
const workflow = text('.github/workflows/public-ci.yml');
const manifest = loadManifest(root);
const runner = text('tools/run_public_ci.js');
const parsed = validatePublicCiWorkflow();

must(parsed.status === 'YAML_SEMANTIC_VALIDATION_PASSED', 'workflow YAML semantic validation failed');
must(/^permissions:\r?\n  contents: read$/m.test(workflow), 'CI permissions must be read-only');
must(workflow.includes('fetch-depth: 0'), 'CI must retain full repository checkout for clean-export validation');
must(!/secrets\.|GITHUB_TOKEN|permissions:\s*write|git\s+push|gh\s+(?:api|pr|repo)|\bapproval\b|\brelease\b|\bLIVE\b|\bREAL(?:[_ -]?submission)?\b/i.test(workflow), 'CI may not use secrets, approval, release, LIVE or write/network commands');
must(!/raw\/|\.pdf|validate_local_bank_sources|run_official_.*live|run_v031_watch/i.test(workflow), 'CI workflow must not read raw sources or run local/LIVE acquisition');
for (const pin of [
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0',
  'actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5.6.0'
]) must(workflow.includes(pin), `missing immutable verified action pin: ${pin}`);
must(!/actions\/(?:checkout|setup-node|setup-python)@v\d+/i.test(workflow), 'mutable major-version action tag found');
expectWorkflowMutation('push-main-trigger', value => value.replace(/(  push:\r?\n    branches: )\[main\]/, '$1[release]'), 'WORKFLOW_TRIGGER_MAIN_REQUIRED:push');
expectWorkflowMutation('pull-request-main-trigger', value => value.replace(/(  pull_request:\r?\n    branches: )\[main\]/, '$1[release]'), 'WORKFLOW_TRIGGER_MAIN_REQUIRED:pull_request');
expectWorkflowMutation('trigger-scope', value => value.replace('  pull_request:', '  workflow_dispatch:\n  pull_request:'), 'WORKFLOW_TRIGGER_SCOPE_INVALID');
expectWorkflowMutation('read-only-permissions', value => value.replace('  contents: read', '  contents: write'), 'WORKFLOW_PERMISSIONS_NOT_READ_ONLY');
expectWorkflowMutation('concurrency-group', value => value.replace('group: public-ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}', 'group: public-ci-unscoped'), 'WORKFLOW_CONCURRENCY_GROUP_INVALID');
expectWorkflowMutation('concurrency-cancellation', value => value.replace('cancel-in-progress: true', 'cancel-in-progress: false'), 'WORKFLOW_CONCURRENCY_CANCELLATION_REQUIRED');
expectWorkflowMutation('timeout', value => value.replace('timeout-minutes: 20', 'timeout-minutes: 21'), 'WORKFLOW_TIMEOUT_INVALID');
expectWorkflowMutation('checkout-pin', value => value.replace('actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683', 'actions/checkout@v4'), 'WORKFLOW_ACTION_PIN_INVALID:checkout');
expectWorkflowMutation('node-pin', value => value.replace('actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020', 'actions/setup-node@v4'), 'WORKFLOW_ACTION_PIN_INVALID:node');
expectWorkflowMutation('python-pin', value => value.replace('actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065', 'actions/setup-python@v5'), 'WORKFLOW_ACTION_PIN_INVALID:python');
expectWorkflowMutation('node-version', value => value.replace("node-version: '22'", "node-version: '20'"), 'WORKFLOW_NODE_VERSION_INVALID');
expectWorkflowMutation('python-version', value => value.replace("python-version: '3.11'", "python-version: '3.12'"), 'WORKFLOW_PYTHON_VERSION_INVALID');
expectWorkflowMutation('runner-command', value => value.replace('run: node tools/run_public_ci.js', 'run: node tools/unapproved_runner.js'), 'WORKFLOW_RUNNER_COMMAND_INVALID');
expectWorkflowMutation('runner-command-uniqueness', value => value.replace('        run: node tools/run_public_ci.js', '        run: node tools/run_public_ci.js\n        run: node tools/unapproved_runner.js'), 'WORKFLOW_RUNNER_COMMAND_INVALID');
must(manifest.networkPolicy === 'OFFLINE_ONLY', 'public CI must be offline-only');
const manifestResult = validateManifest(manifest, root);
must(manifestResult.status === 'MANIFEST_VALIDATED', 'manifest did not validate');
must(categories.every(category => Array.isArray(manifest[category]) && manifest[category].length), 'manifest category missing or empty');
must(runner.includes('buildExecutionPlan(manifest, nestedContinuity)') && runner.includes('validateManifest(manifest, projectRoot)'), 'runner is not manifest-driven');
must(runner.includes('LOCAL_SOURCE_VALIDATION_NOT_RUN') && runner.includes('LOCAL_BROWSER_VALIDATION_NOT_RUN') && runner.includes('LIVE_ACQUISITION_NOT_RUN'), 'NOT_RUN categories are not explicit');
must(!/https?:|fetch\(|http\.|https\.|LIVE_ACQUISITION_PASSED/.test(runner), 'public runner must not make network requests');
must(runner.includes("require('./subprocess-diagnostics.js')") && runner.includes('runSubprocess'), 'runner must use bounded subprocess diagnostics');
const executionPlan = buildExecutionPlan(manifest);
const publicPaths = [...manifest.publicDefault, ...manifest.publicBoundary, ...manifest.ciInfrastructure, ...manifest.pythonPublic];
must(publicPaths.every(relative => executionPlan.some(step => step.kind === 'RUN' && step.args[0] === relative)), 'a declared public test is not executed');
for (const category of ['localOnly', 'browserOnly', 'liveAcquisition']) {
  must(manifest[category].every(relative => !executionPlan.some(step => step.kind === 'RUN' && step.args[0] === relative)), `${category} was incorrectly scheduled`);
}
must(executionPlan.filter(step => step.kind === 'NOT_RUN').length === 3, 'NOT_RUN categories must not count as PASS execution');

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
