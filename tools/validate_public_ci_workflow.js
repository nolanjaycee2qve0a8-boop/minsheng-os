/* Offline structural validation for the deliberately small public-ci YAML subset. */
'use strict';

const fs = require('fs');
const path = require('path');
const workflow = path.resolve(__dirname, '..', '.github', 'workflows', 'public-ci.yml');

function validatePublicCiWorkflow(file = workflow) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (/\t/.test(line) || /^ +/.test(line) && (line.match(/^ +/)[0].length % 2 !== 0)) throw new Error(`YAML_INDENTATION_INVALID:${index + 1}`);
    if (!/^\s*(?:-\s+)?[A-Za-z][A-Za-z0-9_\- ]*:\s*(?:.*)?$/.test(line) && !/^\s*-\s+uses:\s+[^\s]+$/.test(line) && !/^\s*-\s+name:\s+.+$/.test(line) && !/^\s*\}\}\s*$/.test(line)) {
      throw new Error(`YAML_STRUCTURE_INVALID:${index + 1}`);
    }
  }
  const required = [
    'name: Public CI', 'push:', 'pull_request:', 'branches: [main]', 'permissions:', 'contents: read',
    'cancel-in-progress: true', 'timeout-minutes: 20', 'actions/checkout@v4', 'fetch-depth: 0', 'actions/setup-node@v4',
    "node-version: '22'", 'actions/setup-python@v5', "python-version: '3.11'", 'node tools/run_public_ci.js'
  ];
  for (const value of required) if (!text.includes(value)) throw new Error(`YAML_REQUIRED_VALUE_MISSING:${value}`);
  if (/secrets\.|GITHUB_TOKEN|permissions:\s*write|git\s+push|gh\s+(?:api|pr|repo)/i.test(text)) throw new Error('YAML_PUBLIC_CI_PRIVILEGE_OR_NETWORK_WRITE_FORBIDDEN');
  return { status: 'YAML_STRUCTURAL_VALIDATION_PASSED', parser: 'PROJECT_SUBSET_VALIDATOR', file: path.relative(path.resolve(__dirname, '..'), file) };
}

if (require.main === module) process.stdout.write(`${JSON.stringify(validatePublicCiWorkflow())}\n`);
module.exports = { validatePublicCiWorkflow };
