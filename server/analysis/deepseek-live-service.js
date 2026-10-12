'use strict';
// Future opt-in local launcher. No credential is read when imported or when
// the offline demo starts. Never pass the API key as an argument or env var.
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline/promises');
const { createLedger } = require('./deepseek-budget-ledger');
const { createLiveGate, readCredentialFromTty } = require('./deepseek-live-once');
const { createOfflineEvidenceAnalysis } = require('./offline-evidence-analysis');
const { createServer, PORT } = require('./offline-demo-server');
const { MODEL } = require('./deepseek-live-preflight');

const LEDGER_DIRECTORY = path.join(os.homedir(), 'AppData', 'Local', 'MinshengOS', 'deepseek-live-ledger');
const PEAK_PRICE = Object.freeze({ model: MODEL, inputPerMillionMicroUsd: 300000,
  outputPerMillionMicroUsd: 1200000 });
function approvalPolicy(now = new Date()) {
  return { version: 1, model: MODEL, dailyCalls: 3, dailyMicroUsd: 10000,
    price: { ...PEAK_PRICE, confirmedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString() } };
}
function createApprovedServer({ ledger, credentialProvider, fetchImpl, mode = 'REAL' } = {}) {
  // Reading an existing ledger is safe. Missing/corrupt/stale policy or missing
  // one-call grant is rejected later by reserve() before fetch is reached.
  ledger.inspect();
  const gate = createLiveGate({ ledger, credentialProvider, fetchImpl, mode, enabled: true });
  return createServer(createOfflineEvidenceAnalysis(), gate);
}
async function approveOneInteractively({ ledger = createLedger({ directory: LEDGER_DIRECTORY }),
  input = process.stdin, output = process.stdout, now = new Date() } = {}) {
  if (!input.isTTY || !output.isTTY) throw Error('INTERACTIVE_TTY_REQUIRED');
  output.write('Check https://api-docs.deepseek.com/quick_start/pricing/ now.\n');
  output.write('Proposed peak uncached prices: $0.30 input / $1.20 output per 1M tokens.\n');
  output.write('Daily ceiling: 3 attempts and $0.01 reserved; this command grants ONE public request only.\n');
  const rl = readline.createInterface({ input, output });
  let answer;
  try { answer = await rl.question('Type APPROVE ONE PUBLIC REQUEST AND VERIFY PRICES: '); }
  finally { rl.close(); }
  if (answer !== 'APPROVE ONE PUBLIC REQUEST AND VERIFY PRICES')
    throw Error('AUTHORIZATION_NOT_GIVEN');
  try { ledger.inspect(); }
  catch (error) {
    if (error.message !== 'LEDGER_MISSING') throw error;
    ledger.initialize(approvalPolicy(now));
  }
  // A pre-existing price cannot be silently refreshed; expiry fails closed.
  const state = ledger.inspect(), price = state.rows[0].policy.price;
  if (price.model !== MODEL || price.inputPerMillionMicroUsd !== PEAK_PRICE.inputPerMillionMicroUsd ||
      price.outputPerMillionMicroUsd !== PEAK_PRICE.outputPerMillionMicroUsd ||
      now.getTime() >= Date.parse(price.expiresAt)) throw Error('PRICE_UNKNOWN');
  return ledger.grantOne({ expiresAt: new Date(now.getTime() + 30 * 60000).toISOString() });
}
async function main(mode) {
  if (mode === 'authorize-one') {
    await approveOneInteractively();
    console.log('ONE_CALL_GRANT_RECORDED; no API request or key read');
    return;
  }
  if (mode !== 'serve-approved') throw Error('MODE_REQUIRED');
  const ledger = createLedger({ directory: LEDGER_DIRECTORY });
  const state = ledger.inspect(), now = Date.now();
  if (!state.rows.some(row => row.kind === 'GRANT' && !state.spent.has(row.id) &&
      Date.parse(row.expiresAt) > now)) throw Error('ONE_CALL_AUTHORIZATION_MISSING');
  if (now >= Date.parse(state.rows[0].policy.price.expiresAt)) throw Error('PRICE_UNKNOWN');
  const key = await readCredentialFromTty();
  let server;
  try { server = createApprovedServer({ ledger, credentialProvider: async () => key }); }
  catch (error) { key.fill(0); throw error; }
  server.on('error', () => { key.fill(0); console.error('LOCAL_LIVE_SERVICE_FAILED'); process.exitCode = 1; });
  server.on('close', () => key.fill(0));
  server.listen(PORT, '127.0.0.1', () =>
    console.log('LOCAL_LIVE_GATE_READY http://127.0.0.1:' + PORT + '/#qa/analysis-offline'));
}
if (require.main === module) main(process.argv[2]).catch(error => {
  // Only allowlisted codes; never print provider exceptions, request bodies or key.
  const codes = new Set(['MODE_REQUIRED','INTERACTIVE_TTY_REQUIRED','AUTHORIZATION_NOT_GIVEN',
    'LEDGER_MISSING','LEDGER_CORRUPT','LEDGER_LOCKED','PRICE_UNKNOWN',
    'ONE_CALL_AUTHORIZATION_MISSING']);
  console.error(codes.has(error.message) ? error.message : 'LOCAL_LIVE_GATE_FAILED');
  process.exitCode = 1;
});
module.exports = { createApprovedServer, approveOneInteractively, approvalPolicy, LEDGER_DIRECTORY };
