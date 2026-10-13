'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {createLedger,questionDigest}=require('../server/analysis/deepseek-budget-ledger');
const {boundRequest,BUDGET,checkReady,createIncomeGate,QUESTION}=require('../server/analysis/income-explanation-live');
const {sampleResponse,requestDraft}=require('../server/analysis/income-explanation-preflight');
const {approveOneInteractively,approvalPolicy,main:launcherMain}=require('../server/analysis/deepseek-live-service');
const panel=require('../modules/income-explanation-panel');
const {loadManifest,validateManifest,buildExecutionPlan}=require('../tools/run_public_ci');
let n=0;const eq=(a,b)=>{n++;assert.deepEqual(a,b)},ok=x=>{n++;assert.ok(x)},reject=(f,c)=>{n++;assert.throws(f,e=>e.message===c)};
const NOW=new Date('2026-10-13T08:00:00Z'),expiry='2026-10-13T08:30:00Z';
const legacyPolicy={...approvalPolicy(NOW),dailyCalls:3,dailyMicroUsd:10000};
const originalFetch=globalThis.fetch;let accidentalNetwork=0;
globalThis.fetch=async()=>{accidentalNetwork++;throw Error('REAL_NETWORK_FORBIDDEN')};
function setup(){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'minsheng-income-live-test-'));
 const old=createLedger({directory,now:()=>NOW});old.initialize(legacyPolicy);
 const ledger=createLedger({directory,now:()=>NOW,authorizationDigest:boundRequest().authorizationDigest});return {directory,old,ledger};}
async function approve(ledger){let visible='';return approveOneInteractively({ledger,now:NOW,input:{isTTY:true},output:{isTTY:true,write:x=>visible+=x},confirm:async phrase=>{ok(phrase.includes(boundRequest().authorizationDigest));return phrase}})}
const envelope=()=>({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{content:JSON.stringify(sampleResponse())}}],usage:{prompt_tokens:1200,completion_tokens:400}});
const mock=(body=envelope(),status=200)=>async(_url,options)=>{eq(options.body,requestDraft().bodyText);eq(_url,boundRequest().endpoint);eq(options.redirect,'error');return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}})};
const credentials=()=>Buffer.from('sk-SYNTHETIC-NOT-A-REAL-KEY-00000');
const gate=(ledger,fetchImpl=mock(),extra={})=>createIncomeGate({ledger,credentialProvider:credentials,fetchImpl,now:()=>NOW,enabled:true,...extra});
async function main(){
 const r=boundRequest();eq(r.bodyBytes,3730);eq(r.bodySha256,'c68d427982b1ce35ebd7b83a54db08c89ac99936c7e59afc1632456b9c22ba59');eq(r.bodyText,requestDraft().bodyText);
 ok(r.authorizationDigest!==requestDraft().authorizationDigest);ok(r.authorizationDigest!==questionDigest);eq(BUDGET.dailyCalls,1);eq(BUDGET.reservedMicroUsd,3072);
 await assert.rejects(launcherMain('authorize-one'),e=>e.message==='OLD_ENTRY_DISABLED');n++;
 await assert.rejects(launcherMain('serve-approved'),e=>e.message==='OLD_ENTRY_DISABLED');n++;
 const missing=createLedger({directory:path.join(os.tmpdir(),'missing-income-'+Date.now()),authorizationDigest:r.authorizationDigest});
 await assert.rejects(approve(missing),e=>e.message==='LEDGER_MISSING');n++;
 ok(!fs.existsSync(path.dirname(missing.journal)));
 const a=setup(),original=fs.readFileSync(a.ledger.journal);
 let keyReads=0,sends=0;
 const inactive=gate(a.ledger,async()=>{sends++;return null},{enabled:false,credentialProvider:()=>{keyReads++;return credentials()}});
 eq((await inactive.analyze({question:QUESTION})).status,'NOT_AUTHORIZED');eq(keyReads,0);eq(sends,0);
 eq((await gate(a.ledger).analyze({question:QUESTION})).status,'BUDGET_BINDING_MISMATCH');
 await assert.rejects(approveOneInteractively({ledger:a.ledger,now:NOW,input:{isTTY:true},output:{isTTY:true,write(){}},confirm:async()=> 'no'}),e=>e.message==='AUTHORIZATION_NOT_GIVEN');n++;
 eq(fs.readFileSync(a.ledger.journal),original);
 a.old.grantOne({expiresAt:expiry});await approve(a.ledger);
 ok(fs.readFileSync(a.ledger.journal).subarray(0,original.length).equals(original));eq(a.ledger.inspect().policy.dailyCalls,1);eq(a.ledger.inspect().policy.dailyMicroUsd,3100);
 const g=gate(a.ledger);eq((await g.analyze({question:'2026年上半年全国居民人均可支配收入是多少？'})).status,'QUESTION_NOT_APPROVED');
 const success=await g.analyze({question:QUESTION});eq(success.status,'SIMULATED_INCOME_VALIDATED_REVIEW_REQUIRED');eq(success.externalRequests,0);eq(success.providerUsed,false);eq(success.reservation.microUsd,3072);ok(panel.valid(success));
 eq((await g.analyze({question:QUESTION})).status,'ONE_CALL_LIMIT');
 reject(()=>a.old.reserve({requestBytes:100}),'DAILY_BUDGET_EXHAUSTED'); // legacy reader sees tightened global policy
 const restart=createLedger({directory:a.directory,now:()=>NOW,authorizationDigest:r.authorizationDigest});
 eq((await gate(restart).analyze({question:QUESTION})).status,'DAILY_BUDGET_EXHAUSTED');
 const next=createLedger({directory:a.directory,now:()=>new Date('2026-10-14T01:00:00Z'),authorizationDigest:r.authorizationDigest});
 reject(()=>checkReady(next,new Date('2026-10-14T01:00:00Z')),'ONE_CALL_AUTHORIZATION_MISSING');
 await assert.rejects(approve(a.ledger),e=>e.message==='GRANT_ALREADY_RECORDED');n++;
 // Old grant / preflight-only grant / another budget never authorizes this request.
 for(const scope of [questionDigest,requestDraft().authorizationDigest,'a'.repeat(64)]){
  const t=setup();t.ledger.restrictPolicy(approvalPolicy(NOW));
  createLedger({directory:t.directory,now:()=>NOW,authorizationDigest:scope}).grantOne({expiresAt:expiry});
  eq((await gate(t.ledger).analyze({question:QUESTION})).status,'ONE_CALL_AUTHORIZATION_MISSING');
 }
 // Earlier real-style consumption remains in the day total; no new journal or refund.
 const consumed=setup();consumed.old.grantOne({expiresAt:expiry});consumed.old.reserve({requestBytes:2000});
 await assert.rejects(approve(consumed.ledger),e=>e.message==='DAILY_BUDGET_EXHAUSTED');n++;
 eq(consumed.ledger.inspect().rows.filter(x=>x.kind==='RESERVE').length,1);
 const low=setup();low.ledger.restrictPolicy({...approvalPolicy(NOW),dailyMicroUsd:3071});
 await assert.rejects(approve(low.ledger),e=>e.message==='DAILY_BUDGET_EXHAUSTED');n++;
 const corrupt=setup();fs.appendFileSync(corrupt.ledger.journal,'partial');
 eq((await gate(corrupt.ledger).analyze({question:QUESTION})).status,'LEDGER_CORRUPT');
 const failures=[['MALFORMED_OR_TRUNCATED_RESPONSE',()=>{const e=envelope();e.choices[0].finish_reason='length';return mock(e)}],
 ['FACT_BINDING_MISMATCH',()=>{const v=sampleResponse();v.facts[0].value=1;const e=envelope();e.choices[0].message.content=JSON.stringify(v);return mock(e)}],
 ['CALCULATION_BINDING_MISMATCH',()=>{const v=sampleResponse();v.calculation.calculationId='fake';const e=envelope();e.choices[0].message.content=JSON.stringify(v);return mock(e)}],
 ['AUTHENTICATION_FAILED',()=>mock({},401)],['RATE_LIMITED',()=>mock({},429)],['PROVIDER_FAILURE',()=>mock({},503)],
 ['MALFORMED_RESPONSE',()=>async()=>new Response('{',{headers:{'content-type':'application/json'}})],
 ['NETWORK_OUTCOME_UNKNOWN',()=>async()=>{throw Error('untrusted exception')}]];
 for(const [expected,make] of failures){const t=setup();await approve(t.ledger);const g=gate(t.ledger,make());const f=await g.analyze({question:QUESTION});eq(f.status,expected);eq(f.facts,[]);eq(f.calculation,null);eq(f.explanation,null);eq(t.ledger.inspect().spent.size,1);eq((await g.analyze({question:QUESTION})).status,'ONE_CALL_LIMIT');}
 const t=setup();await approve(t.ledger);let aborted=false;
 const slow=gate(t.ledger,async(_u,{signal})=>new Promise((_r,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'))})),{timeoutMs:20});
 const wait=slow.analyze({question:QUESTION});eq((await slow.analyze({question:QUESTION})).status,'DUPLICATE_SUBMISSION');eq((await wait).status,'TIMEOUT_OUTCOME_UNKNOWN');eq(aborted,true);eq(t.ledger.inspect().spent.size,1);
 const competition=setup();await approve(competition.ledger);
 const modulePath=path.resolve(__dirname,'../server/analysis/deepseek-budget-ledger');
 const script='const{createLedger}=require(process.argv[1]);try{createLedger({directory:process.argv[2],authorizationDigest:process.argv[3],now:()=>new Date(process.argv[4])}).reserve({requestBytes:3730,constraints:JSON.parse(process.argv[5])});process.stdout.write("OK")}catch(e){process.stdout.write(e.message)}';
 const jobs=await Promise.allSettled(Array.from({length:4},()=>new Promise(resolve=>{const c=spawn(process.execPath,['-e',script,modulePath,competition.directory,r.authorizationDigest,NOW.toISOString(),JSON.stringify(BUDGET)],{windowsHide:true,env:{PATH:process.env.PATH}});let out='';c.stdout.on('data',x=>out+=x);c.on('error',()=>resolve('ERROR'));c.on('close',()=>resolve(out))})));
 eq(jobs.filter(x=>x.status==='fulfilled'&&x.value==='OK').length,1);ok(jobs.every(x=>x.status==='fulfilled'&&['OK','LEDGER_LOCKED','DAILY_BUDGET_EXHAUSTED'].includes(x.value)));
 // UI fixture only: never a real result or a provider request.
 const realFixture={...success,mode:'REAL',status:'REAL_INCOME_VALIDATED_REVIEW_REQUIRED',providerUsed:true,externalRequests:1,transport:'REAL_API'};
 ok(panel.valid(realFixture));ok(panel.label(realFixture).includes('真实 API'));ok(panel.label(success).includes('模拟响应'));
 const staleSuccess={...success,status:'TIMEOUT_OUTCOME_UNKNOWN',facts:[],sources:[],calculation:null,explanation:null};
 eq(panel.valid(staleSuccess),false);
 const queue=[success,realFixture,{...staleSuccess,validationStatus:'NOT_VALIDATED'}];
 const session=panel.createSession(async()=>queue.shift());await session.send();await session.send();await session.send();eq(session.history.length,2);eq(session.current.facts,[]);eq(session.current.calculation,null);ok(panel.label(session.history[0]).includes('模拟'));ok(panel.label(session.history[1]).includes('真实'));eq(panel.createSession(async()=>success).current,null);
 const manifest=loadManifest();validateManifest(manifest);ok(buildExecutionPlan(manifest).some(x=>x.args?.[0]==='tests/v043-income-live-launcher-tests.js'));
 eq(accidentalNetwork,0);console.log('v043 income live launcher PASS ('+n+' assertions; mocked transport; real API calls 0)');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{globalThis.fetch=originalFetch});
