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
  return result.stdout || '';
}

function git(cwd, args, executeImpl = execute) {
  return executeImpl(cwd, 'git', args).trim();
}

function currentBranch(cwd, executeImpl = execute) {
  const result = childProcess.spawnSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd, encoding: 'utf8' });
  if (result.status === 1) return null;
  if (result.error || result.status !== 0) throw result.error || new Error(`git symbolic-ref failed with ${result.status}`);
  return result.stdout.trim();
}

function refSha(cwd, ref) {
  const result = childProcess.spawnSync('git', ['rev-parse', '--verify', ref], { cwd, encoding: 'utf8' });
  if (result.status === 128) return null;
  if (result.error || result.status !== 0) throw result.error || new Error(`git rev-parse ${ref} failed with ${result.status}`);
  return result.stdout.trim();
}

function ensureCheckedOutMain(cwd, executeImpl = execute) {
  const head = git(cwd, ['rev-parse', 'HEAD'], executeImpl);
  const branch = currentBranch(cwd, executeImpl);
  const main = refSha(cwd, 'refs/heads/main');
  if (branch === 'main' && main === head) return { status: 'ALREADY_CHECKED_OUT_MAIN', head };
  git(cwd, ['checkout', '-B', 'main', head], executeImpl);
  const verifiedBranch = currentBranch(cwd, executeImpl);
  const verifiedHead = git(cwd, ['rev-parse', 'HEAD'], executeImpl);
  const verifiedMain = refSha(cwd, 'refs/heads/main');
  if (verifiedBranch !== 'main' || verifiedHead !== head || verifiedMain !== head) throw new Error('CONTINUITY_MAIN_CHECKOUT_VERIFICATION_FAILED');
  return { status: 'CHECKED_OUT_MAIN_AT_HEAD', head };
}

function simulationEnvironment() {
  return { ...process.env, MINSHENG_CI_CONTINUITY_CHILD: '1' };
}

function runPublicCiAsMain(directory, label, executeImpl = execute) {
  const mainState = ensureCheckedOutMain(directory, executeImpl);
  process.stdout.write(`CONTINUITY_SIMULATION START ${label} ${mainState.status}\n`);
  executeImpl(directory, process.execPath, ['tools/run_public_ci.js'], simulationEnvironment());
  process.stdout.write(`CONTINUITY_SIMULATION PASS ${label}\n`);
}

function runContinuitySimulation(options = {}) {
  const sourceRoot = options.root || root;
  const executeImpl = options.execute || execute;
  const makeDirectory = options.makeDirectory || (() => fs.mkdtempSync(path.join(os.tmpdir(), 'minsheng-v0331-continuity-')));
  const removeDirectory = options.removeDirectory || (directory => fs.rmSync(directory, { recursive: true, force: true }));
  const directory = makeDirectory();
  try {
    executeImpl(sourceRoot, 'git', ['clone', '--no-local', sourceRoot, directory]);
    if (options.afterClone) options.afterClone(directory);
    runPublicCiAsMain(directory, 'merged-pr-main', executeImpl);
    const futureDocument = path.join(directory, 'V0331_FUTURE_MAIN_SIMULATION.md');
    fs.writeFileSync(futureDocument, '# v0.33.1 future-main simulation\n\nSynthetic documentation-only continuity probe.\n', 'utf8');
    git(directory, ['add', 'V0331_FUTURE_MAIN_SIMULATION.md'], executeImpl);
    git(directory, ['-c', 'user.name=Codex', '-c', 'user.email=codex@local', 'commit', '-m', 'test: simulate future public main documentation update'], executeImpl);
    runPublicCiAsMain(directory, 'future-documentation-main', executeImpl);
    const status = git(directory, ['status', '--porcelain'], executeImpl);
    if (status) throw new Error('CONTINUITY_SIMULATION_WORKTREE_POLLUTION');
    console.log('v0.33.2 continuous main checkout simulation PASS (merged PR and future documentation main)');
  } finally {
    removeDirectory(directory);
  }
}

if (require.main === module) runContinuitySimulation();
module.exports = { currentBranch, ensureCheckedOutMain, execute, git, refSha, runContinuitySimulation, runPublicCiAsMain, simulationEnvironment };
