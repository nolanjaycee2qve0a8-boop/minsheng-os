'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.resolve(__dirname, '..');
const continuity = require('../tools/run_v0331_continuity_simulation.js');
const must = (value, message) => { if (!value) throw new Error(message); };

function command(cwd, args) {
  const result = childProcess.spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw result.error || new Error(`git ${args.join(' ')} failed with exit status ${result.status}: ${continuity.safeStderr(result.stderr)}`);
  }
  return result.stdout.trim();
}

function withDetachedClone(label, action, sourceRoot = root) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `minsheng-v0332-${label}-`));
  try {
    const clone = continuity.cloneCurrentHead(sourceRoot, directory);
    must(continuity.currentBranch(directory) === null, `${label} must start detached`);
    must(command(directory, ['rev-parse', 'HEAD']) === clone.sourceHead, `${label} source HEAD mismatch`);
    action(directory, clone.sourceHead);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  must(!fs.existsSync(directory), `temporary clone not removed: ${label}`);
}

function commitDocumentation(directory, name) {
  fs.writeFileSync(path.join(directory, name), '# temporary continuity test\n', 'utf8');
  command(directory, ['add', name]);
  command(directory, ['-c', 'user.name=Codex', '-c', 'user.email=codex@local', 'commit', '-m', `test: ${name}`]);
}

must(!fs.readFileSync(path.join(root, 'tools/run_v0331_continuity_simulation.js'), 'utf8').includes("['branch', '-f', 'main', 'HEAD']"), 'legacy unsafe branch-force implementation returned');

withDetachedClone('checked-out-main', (directory, candidate) => {
  command(directory, ['checkout', '-B', 'main', candidate]);
  must(continuity.currentBranch(directory) === 'main', 'fixture failed to construct checked-out main');
  const legacy = childProcess.spawnSync('git', ['branch', '-f', 'main', 'HEAD'], { cwd: directory, encoding: 'utf8' });
  must(legacy.status !== 0, 'legacy branch-force command must fail when main is checked out');
  const result = continuity.ensureCheckedOutMain(directory);
  must(result.status === 'ALREADY_CHECKED_OUT_MAIN', 'checked-out main must be a no-op');
});

withDetachedClone('feature-main-exists', (directory, base) => {
  command(directory, ['checkout', '-B', 'main', base]);
  command(directory, ['checkout', '-b', 'continuity-feature', base]);
  commitDocumentation(directory, 'FEATURE.md');
  const expected = command(directory, ['rev-parse', 'HEAD']);
  const result = continuity.ensureCheckedOutMain(directory);
  must(result.status === 'CHECKED_OUT_MAIN_AT_HEAD', 'feature checkout must switch to temporary main');
  must(continuity.currentBranch(directory) === 'main' && continuity.refSha(directory, 'refs/heads/main') === expected, 'main must point at feature head');
});

withDetachedClone('detached-head', (directory, candidate) => {
  command(directory, ['checkout', '--detach', candidate]);
  continuity.ensureCheckedOutMain(directory);
  must(continuity.currentBranch(directory) === 'main' && continuity.refSha(directory, 'refs/heads/main') === candidate, 'detached HEAD must become checked-out main');
});

withDetachedClone('missing-main', (directory, base) => {
  command(directory, ['checkout', '-b', 'continuity-no-main', base]);
  commitDocumentation(directory, 'NO_MAIN.md');
  if (continuity.refSha(directory, 'refs/heads/main')) command(directory, ['update-ref', '-d', 'refs/heads/main']);
  must(continuity.refSha(directory, 'refs/heads/main') === null, 'local main must remain absent');
  const expected = command(directory, ['rev-parse', 'HEAD']);
  continuity.ensureCheckedOutMain(directory);
  must(continuity.currentBranch(directory) === 'main' && continuity.refSha(directory, 'refs/heads/main') === expected, 'missing main must be created at HEAD');
});

withDetachedClone('normal-merge', (directory, base) => {
  command(directory, ['checkout', '-B', 'continuity-base', base]);
  command(directory, ['checkout', '-b', 'continuity-merge-candidate', base]);
  commitDocumentation(directory, 'MERGE.md');
  const candidate = command(directory, ['rev-parse', 'HEAD']);
  command(directory, ['checkout', 'continuity-base']);
  command(directory, ['-c', 'user.name=Codex', '-c', 'user.email=codex@local', 'merge', '--no-ff', '--no-edit', candidate]);
  continuity.ensureCheckedOutMain(directory);
  must(continuity.currentBranch(directory) === 'main', 'normal merge commit must be accepted');
});

withDetachedClone('squash-and-future', (directory, base) => {
  command(directory, ['checkout', '-B', 'continuity-base', base]);
  command(directory, ['checkout', '-b', 'continuity-squash-candidate', base]);
  commitDocumentation(directory, 'SQUASH.md');
  const candidate = command(directory, ['rev-parse', 'HEAD']);
  command(directory, ['checkout', 'continuity-base']);
  command(directory, ['merge', '--squash', candidate]);
  command(directory, ['-c', 'user.name=Codex', '-c', 'user.email=codex@local', 'commit', '-m', 'test: squash-like continuity']);
  continuity.ensureCheckedOutMain(directory);
  commitDocumentation(directory, 'FUTURE.md');
  continuity.ensureCheckedOutMain(directory);
  must(continuity.currentBranch(directory) === 'main', 'squash and future documentation main must be accepted');
});

withDetachedClone('pr-source-contract', (source, sourceHead) => {
  if (continuity.refSha(source, 'refs/heads/main')) command(source, ['update-ref', '-d', 'refs/heads/main']);
  must(continuity.refSha(source, 'refs/heads/main') === null, 'PR-style source must not have local main');
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'minsheng-v0332-pr-target-'));
  try {
    const clone = continuity.cloneCurrentHead(source, target);
    if (continuity.refSha(target, 'refs/heads/main')) command(target, ['update-ref', '-d', 'refs/heads/main']);
    must(clone.sourceHead === sourceHead && continuity.currentBranch(target) === null && continuity.refSha(target, 'refs/heads/main') === null, 'detached PR source must clone its exact current HEAD without local main');
    const legacy = childProcess.spawnSync('git', ['checkout', 'main'], { cwd: target, encoding: 'utf8' });
    must(legacy.status !== 0, 'direct git checkout main must fail in the PR-style detached fixture');
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
  must(!fs.existsSync(target), 'PR target clone not removed');
});

let removedAfterFailure = false;
const failureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'minsheng-v0332-failure-cleanup-'));
try {
  continuity.runContinuitySimulation({
    root,
    makeDirectory: () => failureDirectory,
    afterClone: () => { throw new Error('INJECTED_CONTINUITY_FAILURE'); },
    removeDirectory: directory => { fs.rmSync(directory, { recursive: true, force: true }); removedAfterFailure = true; }
  });
  throw new Error('injected continuity failure was swallowed');
} catch (error) {
  must(error.message === 'INJECTED_CONTINUITY_FAILURE', 'injected failure must propagate');
}
must(removedAfterFailure && !fs.existsSync(failureDirectory), 'failure path must clean temporary clone');
console.log('v0.33.2 detached-head-safe continuity tests PASS');
