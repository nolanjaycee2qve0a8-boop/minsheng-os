/* Offline semantic validation for the deliberately small public-ci YAML subset. */
'use strict';

const fs = require('fs');
const path = require('path');
const workflow = path.resolve(__dirname, '..', '.github', 'workflows', 'public-ci.yml');

const ACTIONS = Object.freeze({
  checkout: 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2',
  node: 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0',
  python: 'actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5.6.0'
});
const RUNNER_COMMAND = 'node tools/run_public_ci.js';
const CONCURRENCY_GROUP = 'public-ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}';

function fail(code) {
  throw new Error(code);
}

function countMatches(text, expression) {
  return [...text.matchAll(expression)].length;
}

function block(text, key, indentation = '') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`^${indentation}${escaped}:\\r?\\n([\\s\\S]*?)(?=^${indentation}[^\\s#][^:]*:|(?![\\s\\S]))`, 'm');
  const match = text.match(expression);
  return match ? match[1] : null;
}

function meaningfulLines(value) {
  return value.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
}

function requireSingleExact(text, expression, code) {
  if (countMatches(text, expression) !== 1) fail(code);
}

function validateStructure(text) {
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (/\t/.test(line) || /^ +/.test(line) && (line.match(/^ +/)[0].length % 2 !== 0)) fail(`YAML_INDENTATION_INVALID:${index + 1}`);
    if (!/^\s*(?:-\s+)?[A-Za-z][A-Za-z0-9_\- ]*:\s*(?:.*)?$/.test(line) && !/^\s*-\s+uses:\s+[^\s]+(?:\s+#.+)?$/.test(line) && !/^\s*-\s+name:\s+.+$/.test(line) && !/^\s*\}\}\s*$/.test(line)) fail(`YAML_STRUCTURE_INVALID:${index + 1}`);
  }
}

function validateTriggers(text) {
  const triggers = block(text, 'on');
  if (!triggers) fail('WORKFLOW_TRIGGER_BLOCK_MISSING');
  for (const event of ['push', 'pull_request']) {
    const eventBlock = block(triggers, event, '  ');
    if (!eventBlock || meaningfulLines(eventBlock).length !== 1 || meaningfulLines(eventBlock)[0] !== 'branches: [main]') fail(`WORKFLOW_TRIGGER_MAIN_REQUIRED:${event}`);
  }
  const events = meaningfulLines(triggers).filter(line => /^[A-Za-z_][A-Za-z0-9_\-]*:$/.test(line));
  if (JSON.stringify(events) !== JSON.stringify(['push:', 'pull_request:'])) fail('WORKFLOW_TRIGGER_SCOPE_INVALID');
}

function validatePermissions(text) {
  const permissions = block(text, 'permissions');
  if (!permissions || meaningfulLines(permissions).length !== 1 || meaningfulLines(permissions)[0] !== 'contents: read') fail('WORKFLOW_PERMISSIONS_NOT_READ_ONLY');
}

function validateConcurrency(text) {
  const concurrency = block(text, 'concurrency');
  const lines = concurrency ? meaningfulLines(concurrency) : [];
  if (lines.length !== 2 || lines[0] !== `group: ${CONCURRENCY_GROUP}`) fail('WORKFLOW_CONCURRENCY_GROUP_INVALID');
  if (lines[1] !== 'cancel-in-progress: true') fail('WORKFLOW_CONCURRENCY_CANCELLATION_REQUIRED');
}

function validateJob(text) {
  const jobs = block(text, 'jobs');
  const job = jobs ? block(jobs, 'public-reproducibility', '  ') : null;
  if (!job) fail('WORKFLOW_PUBLIC_JOB_MISSING');
  requireSingleExact(job, /^    timeout-minutes: 20$/gm, 'WORKFLOW_TIMEOUT_INVALID');
  if (countMatches(job, /^    timeout-minutes:/gm) !== 1) fail('WORKFLOW_TIMEOUT_INVALID');
  for (const [name, pin] of Object.entries(ACTIONS)) {
    requireSingleExact(job, new RegExp(`^\\s*- uses: ${pin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm'), `WORKFLOW_ACTION_PIN_INVALID:${name}`);
  }
  if (countMatches(job, /^\s*- uses:/gm) !== Object.keys(ACTIONS).length) fail('WORKFLOW_ACTION_SET_INVALID');
  if (!text.includes('fetch-depth: 0')) fail('YAML_REQUIRED_VALUE_MISSING:fetch-depth: 0');
  requireSingleExact(job, /^          node-version: '22'$/gm, 'WORKFLOW_NODE_VERSION_INVALID');
  requireSingleExact(job, /^          python-version: '3\.11'$/gm, 'WORKFLOW_PYTHON_VERSION_INVALID');
  if (countMatches(job, /^          (?:node-version|python-version):/gm) !== 2) fail('WORKFLOW_RUNTIME_CONFIGURATION_INVALID');
  const runLines = [...job.matchAll(/^        run: (.+)$/gm)].map(match => match[1]);
  if (runLines.length !== 1 || runLines[0] !== RUNNER_COMMAND) fail('WORKFLOW_RUNNER_COMMAND_INVALID');
}

function validateForbiddenContent(text) {
  if (/secrets\.|GITHUB_TOKEN|permissions:\s*write|git\s+push|gh\s+(?:api|pr|repo)|\bapproval\b|\brelease\b|\bLIVE\b|\bREAL(?:[_ -]?submission)?\b/i.test(text)) fail('YAML_PUBLIC_CI_PRIVILEGE_OR_NETWORK_WRITE_FORBIDDEN');
  if (/raw\/|\.pdf|validate_local_bank_sources|run_official_.*live|run_v031_watch/i.test(text)) fail('YAML_PUBLIC_CI_RAW_OR_LOCAL_ONLY_FORBIDDEN');
}

function validatePublicCiWorkflow(file = workflow) {
  const text = fs.readFileSync(file, 'utf8');
  validateStructure(text);
  validateTriggers(text);
  validatePermissions(text);
  validateConcurrency(text);
  validateJob(text);
  validateForbiddenContent(text);
  return { status: 'YAML_SEMANTIC_VALIDATION_PASSED', parser: 'PROJECT_SEMANTIC_SUBSET_VALIDATOR', file: path.relative(path.resolve(__dirname, '..'), file) };
}

if (require.main === module) process.stdout.write(`${JSON.stringify(validatePublicCiWorkflow())}\n`);
module.exports = { ACTIONS, CONCURRENCY_GROUP, RUNNER_COMMAND, validatePublicCiWorkflow };
