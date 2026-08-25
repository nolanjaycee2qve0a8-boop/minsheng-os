'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.resolve(__dirname, '..');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'minsheng-os-public-export-'));
const forbidden = [String.fromCharCode(92) + 'Users' + String.fromCharCode(92), ['C:', 'Users', ''].join('/'), ['', 'Users', ''].join('/'), ['', 'home', ''].join('/')];

function command(file, args, cwd) {
  const result = childProcess.spawnSync(file, args, { cwd, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.status !== 0 || result.error) throw result.error || new Error(`${file} failed with ${result.status}`);
}

try {
  const files = childProcess.execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  for (const relative of files) {
    const source = path.join(root, relative);
    const destination = path.join(target, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  const copied = files.map(relative => path.join(target, relative));
  if (copied.some(file => /(^|[\\/])sources[\\/].*[\\/]raw[\\/]/.test(path.relative(target, file)) || path.extname(file).toLowerCase() === '.pdf')) throw new Error('clean export included raw source material');
  for (const file of copied.filter(file => /\.(js|json|md|html|css|py|txt|xml|csv|ya?ml)$/i.test(file))) {
    const text = fs.readFileSync(file, 'utf8');
    if (forbidden.some(value => text.includes(value))) throw new Error(`clean export contains a personal absolute path: ${path.relative(target, file)}`);
  }
  command(process.execPath, [path.join('tests', 'run_public_default_tests.js')], target);
  console.log(`clean public export PASS (${files.length} files; no .git or ignored sources copied)`);
} finally {
  if (target.startsWith(path.join(os.tmpdir(), 'minsheng-os-public-export-'))) fs.rmSync(target, { recursive: true, force: true });
}
