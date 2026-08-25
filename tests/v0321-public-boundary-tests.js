'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const slash = String.fromCharCode(92);
const forbiddenPaths = [`C:${slash}Users${slash}`, ['C:', 'Users', ''].join('/'), ['', 'Users', ''].join('/'), ['', 'home', ''].join('/')];
const forbiddenExtensions = new Set(['.pdf', '.pem', '.key', '.pfx', '.p12', '.db', '.sqlite', '.sqlite3']);
const textExtensions = new Set(['.js', '.json', '.md', '.html', '.css', '.py', '.txt', '.xml', '.csv', '.yml', '.yaml']);
const must = (value, message) => { if (!value) throw new Error(message); };
const lineOf = (text, index) => text.slice(0, index).split(/\r?\n/).length;
const git = (...args) => childProcess.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const isIgnored = file => childProcess.spawnSync('git', ['check-ignore', '--no-index', file], { cwd: root, encoding: 'utf8' }).status === 0;
const hasGit = fs.existsSync(path.join(root, '.git'));
const tracked = hasGit ? git('ls-files') : walk(root).map(file => path.relative(root, file).replaceAll(slash, '/'));

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? (entry.name === '.git' ? [] : walk(file)) : [file];
  });
}

const pathIssues = [];
for (const relative of tracked) {
  const absolute = path.join(root, relative);
  if (!textExtensions.has(path.extname(relative).toLowerCase()) || !fs.existsSync(absolute)) continue;
  const text = fs.readFileSync(absolute, 'utf8');
  for (const pattern of forbiddenPaths) {
    const index = text.indexOf(pattern);
    if (index !== -1) pathIssues.push(`${relative}:${lineOf(text, index)}`);
  }
}
must(pathIssues.length === 0, `personal absolute path found at ${pathIssues.join(', ')}`);
must(!tracked.some(file => forbiddenExtensions.has(path.extname(file).toLowerCase())), 'private/binary credential or PDF file is tracked');
must(!tracked.some(file => /(^|\/)sources\/.*\/raw\//.test(file)), 'raw source directory is tracked');
must(!tracked.some(file => /(^|\/)(\.env|credentials|secrets|tokens)(\/|$)/i.test(file)), 'environment or credential file is tracked');
must(!tracked.some(file => /eos/i.test(file)), 'EOS path or asset entered the public tree');
if (hasGit) {
  must(git('remote').every(remote => !/eos/i.test(remote)), 'EOS remote configured');
  const ignored = ['.env', '.env.local', 'credentials/local.json', 'secrets/local.json', 'tokens/local.txt', 'local.pem', 'local.key', 'local.pfx', 'local.p12', 'local.db', 'local.sqlite', 'local.sqlite3', 'node_modules/package.json', '.vscode/settings.json', '.idea/workspace.xml', '.DS_Store', 'Thumbs.db', 'downloads/source.zip', 'sources/official-v021/raw/local.pdf'];
  for (const file of ignored) must(isIgnored(file), `ignore rule missing for ${file}`);
  for (const file of ['tests/v020-international-comparison-tests.js', 'tests/fixtures/v020-world-bank-synthetic.json', 'sources/official-v028/manifests/live-acquisition-v028.json']) must(!isIgnored(file), `public file is accidentally ignored: ${file}`);
}
const v020 = fs.readFileSync(path.join(root, 'tests', 'v020-international-comparison-tests.js'), 'utf8');
const v021 = fs.readFileSync(path.join(root, 'tests', 'v021-bank-exposure-tests.js'), 'utf8');
const v022 = fs.readFileSync(path.join(root, 'tests', 'v022-bank-asset-quality-tests.js'), 'utf8');
must(!/official-v020\/raw/.test(v020) && !/official-v021\/raw/.test(v021) && !/official-v021\/raw/.test(v022), 'public default tests depend on ignored local sources');
must(v020.includes('TEST_FIXTURE_SYNTHETIC') && v020.includes("status === 'MOCK'"), 'synthetic international fixture could become REAL');
const localValidator = require('../tools/validate_local_bank_sources.js');
must(localValidator.validateLocalBankSources({ root: path.join(root, '__not_a_local_source__') }).status === 'LOCAL_SOURCE_VALIDATION_NOT_RUN', 'local-only validation is incorrectly reported as PASS');
const browserAudit = JSON.parse(fs.readFileSync(path.join(root, 'artifacts', 'v029.1', 'browser-audit.json'), 'utf8'));
must(!Object.prototype.hasOwnProperty.call(browserAudit.browser || {}, 'executablePath'), 'public audit stores browser executable path');
console.log(`v0.32.1 public repository boundary tests PASS (${tracked.length} public files checked)`);
