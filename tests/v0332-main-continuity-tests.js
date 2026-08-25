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
  if (result.error || result.status !== 0) throw result.error || new Error(`git ${args.join(' ')} failed with ${result.status}`);
  return result.stdout.trim();
}

function withClone(label, action) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `minsheng-v0332-${label}-`));
  try {
    command(root, ['clone', '--no-local', root, directory]);
    action(directory);
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

withClone('checked-out-main', directory => {
  command(directory, ['checkout', 'main']);
  const legacy = childProcess.spawnSync('git', ['branch', '-f', 'main', 'HEAD'], { cwd: directory, encoding: 'utf8' });
  must(legacy.status !== 0, 'legacy branch-force command must fail when main is checked out');
  const result = continuity.ensureCheckedOutMain(directory);
  must(result.status === 'ALREADY_CHECKED_OUT_MAIN', 'checked-out main must be a no-op');
});

withClone('feature-main-exists', directory => {
  command(directory, ['checkout', '-b', 'continuity-feature']);
  commitDocumentation(directory, 'FEATURE.md');
  const expected = command(directory, ['rev-parse', 'HEAD']);
  const result = continuity.ensureCheckedOutMain(directory);
  must(result.status === 'CHECKED_OUT_MAIN_AT_HEAD', 'feature checkout must switch to temporary main');
  must(continuity.currentBranch(directory) === 'main' && continuity.refSha(directory, 'refs/heads/main') === expected, 'main must point at feature head');
});

withClone('detached-head', directory => {
  command(directory, ['checkout', '--detach', 'HEAD']);
  const expected = command(directory, ['rev-parse', 'HEAD']);
  continuity.ensureCheckedOutMain(directory);
  must(continuity.currentBranch(directory) === 'main' && continuity.refSha(directory, 'refs/heads/main') === expected, 'detached HEAD must become checked-out main');
});

withClone('missing-main', directory => {
  command(directory, ['checkout', '-b', 'continuity-no-main']);
  commitDocumentation(directory, 'NO_MAIN.md');
  if (continuity.refSha(directory, 'refs/heads/main')) command(directory, ['update-ref', '-d', 'refs/heads/main']);
  must(continuity.refSha(directory, 'refs/heads/main') === null, 'local main ref must be absent for this case');
  const expected = command(directory, ['rev-parse', 'HEAD']);
  continuity.ensureCheckedOutMain(directory);
  must(continuity.currentBranch(directory) === 'main' && continuity.refSha(directory, 'refs/heads/main') === expected, 'missing main must be created at HEAD');
});

withClone('normal-merge', directory => {
  command(directory, ['checkout', '-b', 'continuity-merge-candidate']);
  commitDocumentation(directory, 'MERGE.md');
  const candidate = command(directory, ['rev-parse', 'HEAD']);
  command(directory, ['checkout', '-b', 'continuity-merge-base', 'origin/main']);
  command(directory, ['-c', 'user.name=Codex', '-c', 'user.email=codex@local', 'merge', '--no-ff', '--no-edit', candidate]);
  continuity.ensureCheckedOutMain(directory);
  must(continuity.currentBranch(directory) === 'main', 'normal merge commit must be accepted');
});

withClone('squash-and-future', directory => {
  command(directory, ['checkout', '-b', 'continuity-squash-candidate']);
  commitDocumentation(directory, 'SQUASH.md');
  const candidate = command(directory, ['rev-parse', 'HEAD']);
  command(directory, ['checkout', '-b', 'continuity-squash-base', 'origin/main']);
  command(directory, ['merge', '--squash', candidate]);
  command(directory, ['-c', 'user.name=Codex', '-c', 'user.email=codex@local', 'commit', '-m', 'test: squash-like continuity']);
  continuity.ensureCheckedOutMain(directory);
  commitDocumentation(directory, 'FUTURE.md');
  continuity.ensureCheckedOutMain(directory);
  must(continuity.currentBranch(directory) === 'main', 'squash and future documentation main must be accepted');
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
console.log('v0.33.2 checked-out-main continuity tests PASS');
