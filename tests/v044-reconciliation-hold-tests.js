'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawn } = require('node:child_process');
const hold = require('../server/analysis/reconciliation-hold');
const { createLedger, questionDigest } = require('../server/analysis/deepseek-budget-ledger');
const { approvalPolicy, approveOneInteractively, createApprovedServer, main: launcher } = require('../server/analysis/deepseek-live-service');
const { boundRequest, createIncomeGate, QUESTION } = require('../server/analysis/income-explanation-live');
const { createLiveGate, sendOnce } = require('../server/analysis/deepseek-live-once');
const { createProvider } = require('../server/analysis/provider');
const { requestDraft } = require('../server/analysis/income-explanation-preflight');
const panel = require('../modules/income-explanation-panel');
const { INCOME_PAGE } = require('../server/analysis/income-explanation-page');
const { loadManifest, validateManifest, buildExecutionPlan } = require('../tools/run_public_ci');
let n = 0, network = 0, keyReads = 0;
const eq = (a,b) => { n++; assert.deepEqual(a,b); };
const ok = v => { n++; assert.ok(v); };
const denies = f => { n++; assert.throws(f,e=>e.message==='RECONCILIATION_REQUIRED'); };
const now = new Date('2026-10-14T01:00:00Z');
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { network++; throw Error('NETWORK_FORBIDDEN'); };
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'minsheng-hold-synthetic-'));
  const old = createLedger({directory:dir,now:()=>now}); old.initialize(approvalPolicy(now));
  old.grantOne({id:'synthetic-old',expiresAt:'2026-10-15T00:00:00Z'});
  const journal = fs.readFileSync(old.journal);
  const evidencePath=path.join(dir,'synthetic-evidence.txt'); fs.writeFileSync(evidencePath,'SYNTHETIC APPLICATION RECORD, NOT A PROVIDER RECEIPT');
  const binding = {...hold.productionCase(),caseId:'SYNTHETIC-ONLY',
    journal:{path:old.journal,bytes:journal.length,sha256:hold.sha(journal)},
    evidence:[{path:evidencePath,sha256:hold.sha(fs.readFileSync(evidencePath))}]};
  fs.writeFileSync(path.join(dir,'fixture-binding.json'),JSON.stringify(binding));
  return {dir,old,journal,binding};
}
function child(mode,dir,cwd) {
  return new Promise((resolve,reject)=>{
    const p=spawn(process.execPath,[__filename,'child',mode,dir],{cwd,windowsHide:true,env:{PATH:process.env.PATH}});
    let out='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>out+=x);p.on('error',reject);
    p.on('close',code=>resolve({code,out}));
  });
}
function childMain() {
  const [mode,dir]=process.argv.slice(3);
  if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'minsheng-hold-synthetic-')) throw Error('SYNTHETIC_ONLY');
  const binding=JSON.parse(fs.readFileSync(path.join(dir,'fixture-binding.json')));
  if(mode==='inspect'){process.stdout.write(JSON.stringify(hold.inspectHold(binding)));return;}
  if(mode==='write'){
    const ledger=createLedger({directory:dir,reconciliationRequired:true,now:()=>new Date('2030-01-01T00:00:00Z')});
    try{ledger.reserve({requestBytes:3730});process.stdout.write('UNEXPECTED_SEND');}catch(e){process.stdout.write(e.message);}return;
  }
  if(mode==='crash-before'||mode==='crash-after'){
    const link=fs.linkSync;
    fs.linkSync=(...args)=>{if(mode==='crash-after')link(...args);process.exit(23);};
  }
  try{hold.publishHold(binding);process.stdout.write('PUBLISHED');}catch(e){process.stdout.write('DENIED:'+e.code+':'+e.message);}
}
async function main() {
  const t=fixture(); eq(hold.inspectHold(t.binding).status,'HOLD_MISSING'); denies(hold.assertSendingAllowed);
  for(const invalid of [{...t.binding,state:'CLEARED'},{...t.binding,version:2}]){
    n++;assert.throws(()=>hold.publishHold(invalid),e=>e.message==='HOLD_BINDING_INVALID');
    eq(hold.inspectHold(invalid).status,'HOLD_BINDING_INVALID');
    eq(fs.readFileSync(t.old.journal),t.journal);
  }
  const published=hold.publishHold(t.binding); eq(hold.inspectHold(t.binding).status,'HELD');
  eq(hold.sha(fs.readFileSync(published.record)),published.sha256); eq(fs.readFileSync(t.old.journal),t.journal);
  eq(JSON.parse(fs.readFileSync(published.record)).payload.binding.discrepancy.reportedHistoricalCalls,1);
  eq(hold.inspectHold(t.binding).allowed,false); denies(hold.assertSendingAllowed);
  for(const scope of [questionDigest,boundRequest().authorizationDigest]) {
    for(const clock of [now,new Date('2026-10-16T01:00:00Z')]) {
      const ledger=createLedger({directory:t.dir,authorizationDigest:scope,now:()=>clock});
      denies(()=>ledger.initialize(approvalPolicy(clock)));
      denies(()=>ledger.grantOne({expiresAt:'2030-01-01T00:00:00Z'}));
      denies(()=>ledger.restrictPolicy(approvalPolicy(clock)));
      denies(()=>ledger.reserve({requestBytes:3730}));
      denies(()=>ledger.flagOverage({reservationId:'fake',inputTokens:496,outputTokens:77}));
      eq(ledger.inspect().rows.map(x=>x.kind),['POLICY','GRANT']);
    }
  }
  const restart=await child('inspect',t.dir,os.tmpdir());eq(restart.code,0);eq(JSON.parse(restart.out).status,'HELD');
  const writes=await Promise.all(Array.from({length:4},()=>child('write',t.dir,os.tmpdir())));
  writes.forEach(x=>{eq(x.code,0);eq(x.out,'RECONCILIATION_REQUIRED');});eq(fs.readFileSync(t.old.journal),t.journal);
  // Tampering, deletion, identity changes and evidence changes never become an allow state.
  const record=fs.readFileSync(published.record);
  fs.writeFileSync(published.record,'{');eq(hold.inspectHold(t.binding).status,'HOLD_UNREADABLE');
  fs.writeFileSync(published.record,record);const changed=JSON.parse(record);changed.payload.binding.state='CLEARED';
  changed.sha256=hold.sha(JSON.stringify(changed.payload));fs.writeFileSync(published.record,JSON.stringify(changed));
  eq(hold.inspectHold(t.binding).status,'HOLD_CORRUPT');denies(hold.assertSendingAllowed);
  fs.unlinkSync(published.record);eq(hold.inspectHold(t.binding).status,'HOLD_MISSING');denies(hold.assertSendingAllowed);
  fs.writeFileSync(published.record,record);
  const alternate={...t.binding,journal:{...t.binding.journal,path:path.join(t.dir,'other.jsonl')}};
  fs.writeFileSync(alternate.journal.path,t.journal);eq(hold.inspectHold(alternate).status,'HOLD_CORRUPT');
  fs.appendFileSync(t.old.journal,'altered');eq(hold.inspectHold(t.binding).status,'HOLD_IDENTITY_MISMATCH');
  fs.writeFileSync(t.old.journal,t.journal);fs.appendFileSync(t.binding.evidence[0].path,'changed');
  eq(hold.inspectHold(t.binding).status,'HOLD_EVIDENCE_MISMATCH');denies(hold.assertSendingAllowed);
  const missing=fixture();fs.unlinkSync(missing.old.journal);
  const restricted=createLedger({directory:missing.dir,reconciliationRequired:true});denies(()=>restricted.initialize(approvalPolicy(now)));
  eq(fs.existsSync(missing.old.journal),false);
  // Concurrent exclusive publication: no journal append and no overwriting a winner.
  const concurrent=fixture();const race=await Promise.all(Array.from({length:4},()=>child('publish',concurrent.dir)));
  eq(race.filter(x=>x.out==='PUBLISHED').length,1);ok(race.every(x=>x.code===0));
  eq(fs.readFileSync(concurrent.old.journal),concurrent.journal);eq(hold.inspectHold(concurrent.binding).status,'HELD');
  for(const phase of ['crash-before','crash-after']){
    const crash=fixture();eq((await child(phase,crash.dir)).code,23);
    eq(hold.inspectHold(crash.binding).status,'HOLD_INTERRUPTED');
    eq(JSON.parse((await child('inspect',crash.dir,os.tmpdir())).out).allowed,false);
    ok((await child('publish',crash.dir)).out.startsWith('DENIED')); // no auto recovery / stale-lock deletion
    eq(fs.readFileSync(crash.old.journal),crash.journal);denies(hold.assertSendingAllowed);
  }
  // Current standard old/new production entry points, before ledger access or credentials.
  for(const mode of ['authorize-income','serve-income-approved','authorize-one','serve-approved']){
    n++;await assert.rejects(launcher(mode),e=>e.message===(mode.endsWith('-income')||mode==='serve-income-approved'?'RECONCILIATION_REQUIRED':'OLD_ENTRY_DISABLED'));
  }
  const forbiddenLedger=new Proxy({},{get(){throw Error('LEDGER_ACCESS_FORBIDDEN');}});
  const key=()=>{keyReads++;throw Error('CREDENTIAL_ACCESS_FORBIDDEN');};
  denies(()=>createApprovedServer({ledger:forbiddenLedger,credentialProvider:key}));
  const real=createIncomeGate({ledger:forbiddenLedger,credentialProvider:key,mode:'REAL',enabled:true});
  const paused=await real.analyze({question:QUESTION});eq(paused.status,'RECONCILIATION_REQUIRED');eq(paused.externalRequests,0);eq(paused.reservation,null);ok(panel.valid(paused));
  const old=createLiveGate({ledger:{reserve(){throw Error('RESERVE_FORBIDDEN');}},credentialProvider:key,mode:'REAL',enabled:true});
  eq((await old.analyze({question:'any'})).status,'RECONCILIATION_REQUIRED');
  n++;await assert.rejects(sendOnce(requestDraft(),{credentialProvider:key}),e=>e.message==='RECONCILIATION_REQUIRED');
  denies(()=>createProvider({env:new Proxy({},{get(){keyReads++;throw Error('ENV_ACCESS_FORBIDDEN');}})}));
  const syntheticProtected=createLedger({directory:concurrent.dir,reconciliationRequired:true});let prompts=0;
  n++;await assert.rejects(approveOneInteractively({ledger:syntheticProtected,input:{isTTY:true},output:{isTTY:true,write(){prompts++;}},confirm:async()=>{prompts++;return '';}}),e=>e.message==='RECONCILIATION_REQUIRED');
  eq(prompts,0);eq(network,0);eq(keyReads,0);
  // Historical mode labels remain attached to their own results; pause has no stale success.
  const session=panel.createSession(async()=>paused);await session.send();await session.send();
  eq(session.current.facts,[]);eq(session.history.length,1);ok(panel.label(session.current).includes('真实发送暂停'));
  eq(panel.createSession(async()=>paused).current,null);
  ok(INCOME_PAGE.includes('账本待对账，真实发送暂停'));ok(INCOME_PAGE.includes('disabled data-reconciliation-hold="true"'));
  const button={disabled:false,getAttribute:()=> 'true'};panel.install({getElementById:()=>button});eq(button.disabled,true);eq(button.onclick,undefined);
  const manifest=loadManifest();validateManifest(manifest);ok(buildExecutionPlan(manifest).some(x=>x.args?.[0]==='tests/v044-reconciliation-hold-tests.js'));
  eq(boundRequest().bodyBytes,3730);eq(boundRequest().bodySha256,'c68d427982b1ce35ebd7b83a54db08c89ac99936c7e59afc1632456b9c22ba59');
  eq(network,0);eq(keyReads,0);console.log('v044 reconciliation hold PASS ('+n+' assertions; synthetic journals only; external sends 0; credential reads 0)');
}
if(process.argv[2]==='child'){childMain();globalThis.fetch=originalFetch;}
else main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{globalThis.fetch=originalFetch;});
