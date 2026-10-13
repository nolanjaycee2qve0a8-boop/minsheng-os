'use strict';
// Future opt-in local launcher. No credential is read when imported or when
// the offline demo starts. Never pass the API key as an argument or env var.
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline/promises');
const { createLedger } = require('./deepseek-budget-ledger');
const { readCredentialFromTty } = require('./deepseek-live-once');
const { boundRequest, BUDGET, checkReady, createIncomeGate } = require('./income-explanation-live');
const { INCOME_PAGE } = require('./income-explanation-page');
const { createOfflineEvidenceAnalysis } = require('./offline-evidence-analysis');
const { createServer, PORT } = require('./offline-demo-server');
const { MODEL } = require('./deepseek-live-preflight');

const LEDGER_DIRECTORY = path.join(os.homedir(), 'AppData', 'Local', 'MinshengOS', 'deepseek-live-ledger');
const PEAK_PRICE = Object.freeze({ model: MODEL, inputPerMillionMicroUsd: 300000,
  outputPerMillionMicroUsd: 1200000 });
function approvalPolicy(now = new Date()) {
  return { version: 1, model: MODEL, dailyCalls: 1, dailyMicroUsd: 3100,
    price: { ...PEAK_PRICE, confirmedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString() } };
}
function createApprovedServer({ ledger, credentialProvider, fetchImpl, mode = 'REAL', now = () => new Date(), port = PORT } = {}) {
  // Reading an existing ledger is safe. Missing/corrupt/stale policy or missing
  // one-call grant is rejected later by reserve() before fetch is reached.
  checkReady(ledger,now());
  const gate = createIncomeGate({ ledger, credentialProvider, fetchImpl, mode, now, enabled: true });
  return createServer(createOfflineEvidenceAnalysis(), gate, port, undefined, INCOME_PAGE);
}
function incomeLedger(){return createLedger({directory:LEDGER_DIRECTORY,authorizationDigest:boundRequest().authorizationDigest})}
async function approveOneInteractively({ ledger = incomeLedger(),
  input = process.stdin, output = process.stdout, now = new Date(), confirm } = {}) {
  if (!input.isTTY || !output.isTTY) throw Error('INTERACTIVE_TTY_REQUIRED');
  const request=boundRequest();
  if(ledger.authorizationDigest!==request.authorizationDigest)throw Error('AUTHORIZATION_SCOPE_MISMATCH');
  // Missing/corrupt historical ledger stops here. NEVER initialize a replacement.
  const before=ledger.inspect();
  const grantId='income-live-'+request.authorizationDigest;
  if(before.grants.has(grantId))throw Error('GRANT_ALREADY_RECORDED');
  output.write('Check https://api-docs.deepseek.com/quick_start/pricing/ now.\n');
  output.write('Proposed peak uncached prices: $0.30 input / $1.20 output per 1M tokens.\n');
  output.write('DeepSeek POST '+request.endpoint+'; model '+MODEL+'; body SHA256 '+request.bodySha256+'\n');
  output.write('Question: '+JSON.parse(request.body.messages[1].content).question+'\n');
  output.write('Source versions: '+JSON.stringify(request.sourceBindings)+'\n');
  output.write('One attempt, zero retries, $0.003072 reserved; daily <=1 / $0.0031, Beijing day. No automatic daily grant.\n');
  const phrase='APPROVE INCOME '+request.authorizationDigest+' AND VERIFY PRICES';
  const rl = confirm ? null : readline.createInterface({ input, output });
  let answer;
  try { answer = confirm ? await confirm(phrase) : await rl.question('Type '+phrase+': '); }
  finally { rl?.close(); }
  if (answer !== phrase)
    throw Error('AUTHORIZATION_NOT_GIVEN');
  const proposed=approvalPolicy(now);
  proposed.dailyCalls=Math.min(proposed.dailyCalls,before.policy.dailyCalls);
  proposed.dailyMicroUsd=Math.min(proposed.dailyMicroUsd,before.policy.dailyMicroUsd);
  ledger.restrictPolicy(proposed); // append-only; retains every historical RESERVE across scopes
  checkReady(ledger,now,false);
  return ledger.grantOne({ id:grantId,expiresAt: new Date(now.getTime() + 30 * 60000).toISOString() });
}
async function main(mode) {
  if(mode==='authorize-one'||mode==='serve-approved')throw Error('OLD_ENTRY_DISABLED');
  if(mode==='preview-income'){const {bodyText,...request}=boundRequest();console.log(JSON.stringify({...request,budget:BUDGET},null,2));return;}
  if(mode===undefined||mode==='offline-income'){
    const server=createServer(createOfflineEvidenceAnalysis(),null,PORT,undefined,INCOME_PAGE);
    server.on('error',()=>{console.error('LOCAL_OFFLINE_SERVICE_FAILED');process.exitCode=1});
    server.listen(PORT,'127.0.0.1',()=>console.log('OFFLINE_ONLY http://127.0.0.1:'+PORT+'/income-explanation'));return;
  }
  if (mode === 'authorize-income') {
    await approveOneInteractively();
    console.log('ONE_CALL_GRANT_RECORDED; no API request or key read');
    return;
  }
  if (mode !== 'serve-income-approved') throw Error('MODE_REQUIRED');
  const ledger = incomeLedger();
  checkReady(ledger); // exact scope, price, grant AND shared day budget checked before hidden input
  const key = await readCredentialFromTty();
  let server;
  try { server = createApprovedServer({ ledger, credentialProvider: async () => key }); }
  catch (error) { key.fill(0); throw error; }
  server.on('error', () => { key.fill(0); console.error('LOCAL_LIVE_SERVICE_FAILED'); process.exitCode = 1; });
  server.on('close', () => key.fill(0));
  server.listen(PORT, '127.0.0.1', () =>
    console.log('LOCAL_LIVE_GATE_READY http://127.0.0.1:' + PORT + '/income-explanation'));
}
if (require.main === module) main(process.argv[2]).catch(error => {
  // Only allowlisted codes; never print provider exceptions, request bodies or key.
  const codes = new Set(['MODE_REQUIRED','INTERACTIVE_TTY_REQUIRED','AUTHORIZATION_NOT_GIVEN',
    'LEDGER_MISSING','LEDGER_CORRUPT','LEDGER_LOCKED','PRICE_UNKNOWN',
    'ONE_CALL_AUTHORIZATION_MISSING','OLD_ENTRY_DISABLED','GRANT_ALREADY_RECORDED',
    'AUTHORIZATION_SCOPE_MISMATCH','BUDGET_BINDING_MISMATCH','DAILY_BUDGET_EXHAUSTED','POLICY_RESTRICTION_INVALID',
    'REQUEST_BINDING_MISMATCH','LEDGER_OVERAGE_REVIEW_REQUIRED']);
  console.error(codes.has(error.message) ? error.message : 'LOCAL_LIVE_GATE_FAILED');
  process.exitCode = 1;
});
module.exports = { createApprovedServer, approveOneInteractively, approvalPolicy, LEDGER_DIRECTORY, main };
