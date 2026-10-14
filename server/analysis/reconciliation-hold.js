'use strict';
// Restrictive-only incident control. There is deliberately NO cleared/allowed state.
// Audit sidecar loss, corruption, a new day, or another cwd cannot enable sending.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash, randomUUID } = require('node:crypto');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const directory = path.join(os.homedir(), 'AppData', 'Local', 'MinshengOS', 'deepseek-live-ledger');
const audit = 'D:/项目数据/民生/2026-10-13-income-live-launcher-aa4a4540a54f4620a1a37cce358aa1ec/ledger-audit-20261014-6b73f1';
const incident = {
  version: 1, caseId: 'ledger-audit-20261014-6b73f1', state: 'HOLD',
  reason: 'HISTORICAL_USAGE_UNRECONCILED',
  journal: { path: path.join(directory, 'deepseek-budget-v1.jsonl'), bytes: 709,
    sha256: '1afd548799cf196d530deb31560eaf78aae45b4ef637f1164e522c3d597ccf67' },
  evidence: [
    { path: audit + '/REPORT.txt', sha256: '355ab2f567a830e7f962bcbe4d3f2ccfe3f7dac1463e3a7d49f3e07961079782' },
    { path: audit + '/EVIDENCE.json', sha256: '075aebe63ff4ef7216ff3fc047f35cece545b7d179570d2adf083476ccdf0d91' },
    { path: path.join(os.homedir(), 'Documents', 'ChatGPT', '民生备份', '2026-10-12',
        'phase5-deepseek-result-mode-1c7d811-20261012', 'LIVE_ACCEPTANCE.md'),
      sha256: 'e7823b4f7f8421e1545489426eb2351e52ede7a829539b1e29848319e5f7b7f5' }
  ],
  discrepancy: { journalKinds: ['POLICY', 'GRANT'], reserveCount: 0,
    reportedHistoricalCalls: 1, reportedInputTokens: 496, reportedOutputTokens: 77,
    evidenceLevel: 'APPLICATION_ACCEPTANCE_RECORD', independentProviderReceipt: false,
    rootCause: 'UNDETERMINED', actualBillKnown: false }
};
function productionCase() { return JSON.parse(JSON.stringify(incident)); }
function assertSendingAllowed() { throw Error('RECONCILIATION_REQUIRED'); }
function canonical(p) {
  const resolved = path.resolve(p);
  const actual = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  return process.platform === 'win32' ? actual.toLowerCase() : actual;
}
function protectedDirectory(p) {
  return canonical(p) === canonical(directory) ||
    fs.existsSync(path.join(p, 'reconciliation-hold-v1.json')) ||
    fs.existsSync(path.join(p, 'reconciliation-hold-v1.pending'));
}
function regularFile(p) {
  // Never follow sidecar-supplied paths. Reject symbolic/reparse links in the trusted paths too.
  if (!path.isAbsolute(p)) throw Error('HOLD_IDENTITY_MISMATCH');
  let cursor = p;
  for (;;) {
    if (fs.lstatSync(cursor).isSymbolicLink()) throw Error('HOLD_IDENTITY_MISMATCH');
    const parent = path.dirname(cursor); if (parent === cursor) break; cursor = parent;
  }
  if (!fs.statSync(p).isFile()) throw Error('HOLD_IDENTITY_MISMATCH');
  return fs.readFileSync(p);
}
function verifyBindings(binding) {
  if (!binding || binding.version !== 1 || binding.state !== 'HOLD' ||
      binding.reason !== 'HISTORICAL_USAGE_UNRECONCILED' ||
      !binding.caseId || !binding.journal || !Array.isArray(binding.evidence) ||
      !binding.evidence.length || binding.discrepancy?.rootCause !== 'UNDETERMINED' ||
      binding.discrepancy?.independentProviderReceipt !== false)
    throw Error('HOLD_BINDING_INVALID');
  const bytes = regularFile(binding.journal.path);
  if (bytes.length !== binding.journal.bytes || sha(bytes) !== binding.journal.sha256)
    throw Error('HOLD_IDENTITY_MISMATCH');
  for (const e of binding.evidence) {
    if (sha(regularFile(e.path)) !== e.sha256) throw Error('HOLD_EVIDENCE_MISMATCH');
  }
}
function locations(binding) {
  const dir = path.dirname(binding.journal.path);
  return { dir, record: path.join(dir, 'reconciliation-hold-v1.json'),
    pending: path.join(dir, 'reconciliation-hold-v1.pending'),
    lock: path.join(dir, 'deepseek-budget-v1.lock') };
}
function inspectHold(binding = productionCase()) {
  const loc = locations(binding);
  try {
    verifyBindings(binding);
    if (fs.existsSync(loc.pending) || fs.existsSync(loc.lock)) return { status: 'HOLD_INTERRUPTED', allowed: false };
    if (!fs.existsSync(loc.record)) return { status: 'HOLD_MISSING', allowed: false };
    const bytes = regularFile(loc.record), envelope = JSON.parse(bytes.toString('utf8'));
    if (Object.keys(envelope).sort().join() !== 'payload,sha256' ||
        sha(JSON.stringify(envelope.payload)) !== envelope.sha256 ||
        Object.keys(envelope.payload).sort().join() !== 'binding,createdAt' ||
        !Number.isFinite(Date.parse(envelope.payload.createdAt)) ||
        JSON.stringify(envelope.payload.binding) !== JSON.stringify(binding))
      return { status: 'HOLD_CORRUPT', allowed: false };
    return { status: 'HELD', allowed: false, bytes: bytes.length, sha256: sha(bytes) };
  } catch (e) {
    return { status: ['HOLD_BINDING_INVALID', 'HOLD_IDENTITY_MISMATCH', 'HOLD_EVIDENCE_MISMATCH'].includes(e.message)
      ? e.message : 'HOLD_UNREADABLE', allowed: false };
  }
}
function publishHold(binding = productionCase()) {
  // Maintenance API only: it cannot authorize, unlock, reset or amend the JSONL.
  // Synthetic tests pass their own binding; production installation uses the fixed case.
  verifyBindings(binding); // invalid state cannot publish even a misleading deny-only audit record
  const loc = locations(binding);
  fs.mkdirSync(loc.lock); // same exclusive lock as reserve/grant; no stale-lock removal
  const stage = path.join(loc.dir, 'hold-stage-' + randomUUID());
  try {
    verifyBindings(binding);
    if (fs.existsSync(loc.record) || fs.existsSync(loc.pending)) throw Error('HOLD_ALREADY_EXISTS');
    const pendingFd = fs.openSync(loc.pending, 'wx', 0o600);
    try { fs.writeSync(pendingFd, binding.caseId); fs.fsyncSync(pendingFd); } finally { fs.closeSync(pendingFd); }
    const payload = { binding, createdAt: new Date().toISOString() };
    const bytes = Buffer.from(JSON.stringify({ payload, sha256: sha(JSON.stringify(payload)) }) + '\n');
    const fd = fs.openSync(stage, 'wx', 0o600);
    try { fs.writeSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    verifyBindings(binding);
    fs.linkSync(stage, loc.record); // atomic publication, refuses to overwrite an existing name
    if (!regularFile(loc.record).equals(bytes)) throw Error('HOLD_PUBLICATION_FAILED');
    fs.unlinkSync(stage); fs.unlinkSync(loc.pending); // only this invocation's exact files
    return { record: loc.record, bytes: bytes.length, sha256: sha(bytes) };
  } finally {
    // Failed/interrupted publication leaves pending/stage evidence, never an allow state.
    fs.rmdirSync(loc.lock);
  }
}
module.exports = { productionCase, assertSendingAllowed, protectedDirectory, inspectHold, publishHold, sha };
