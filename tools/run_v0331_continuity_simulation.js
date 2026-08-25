/* Verify that public CI validates repository content, not a one-time main SHA. */
'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.resolve(__dirname, '..');

function execute(cwd, file, args, env = process.env) {
  const result = childProcess.spawnSync(file, args, { cwd, encoding: 'utf8', env });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error || result.status !== 0) throw result.error || new Error(`${file} ${args.join(' ')} failed with ${result.status}`);
}

function simulationEnvironment() {
  return { ...process.env, MINSHENG_CI_CONTINUITY_CHILD: '1' };
}

function runPublicCiAsMain(directory, label) {
  execute(directory, 'git', ['branch', '-f', 'main', 'HEAD']);
  process.stdout.write(`CONTINUITY_SIMULATION START ${label}\n`);
  execute(directory, process.execPath, ['tools/run_public_ci.js'], simulationEnvironment());
  process.stdout.write(`CONTINUITY_SIMULATION PASS ${label}\n`);
}

function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'minsheng-v0331-continuity-'));
  try {
    execute(root, 'git', ['clone', '--no-local', root, directory]);
    runPublicCiAsMain(directory, 'merged-pr-main');
    const futureDocument = path.join(directory, 'V0331_FUTURE_MAIN_SIMULATION.md');
    fs.writeFileSync(futureDocument, '# v0.33.1 future-main simulation\n\nSynthetic documentation-only continuity probe.\n', 'utf8');
    execute(directory, 'git', ['add', 'V0331_FUTURE_MAIN_SIMULATION.md']);
    execute(directory, 'git', ['-c', 'user.name=Codex', '-c', 'user.email=codex@local', 'commit', '-m', 'test: simulate future public main documentation update']);
    runPublicCiAsMain(directory, 'future-documentation-main');
    const status = childProcess.execFileSync('git', ['status', '--porcelain'], { cwd: directory, encoding: 'utf8' }).trim();
    if (status) throw new Error('CONTINUITY_SIMULATION_WORKTREE_POLLUTION');
    console.log('v0.33.1 continuous main baseline simulation PASS (merged PR and future documentation main)');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

if (require.main === module) main();
module.exports = { main, runPublicCiAsMain, simulationEnvironment };
