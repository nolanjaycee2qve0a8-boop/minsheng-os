'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createLedger, beijingDay, reserveMicroUsd, questionDigest } =
  require('../server/analysis/deepseek-budget-ledger');
const { sendOnce, createLiveGate, readCredentialFromTty } = require('../server/analysis/deepseek-live-once');
const { previewFirstRequest, FIRST_QUESTION, MODEL, LIMITS } = require('../server/analysis/deepseek-live-preflight');
const { createStructuredSandbox, normalizeQuestion } = require('../server/analysis/structured-claims');
const { QUESTIONS } = require('../server/analysis/offline-evidence-analysis');
const { EventEmitter } = require('node:events');
const { createSession, validateTurn } = require('../modules/evidence-analysis-session');
const { createServer } = require('../server/analysis/offline-demo-server');
const { approvalPolicy } = require('../server/analysis/deepseek-live-service');
let n=0;
const eq=(actual,expected)=>{n++;assert.deepEqual(actual,expected)};
const ok=value=>{n++;assert.ok(value)};
const throws=(fn,code)=>{n++;assert.throws(fn, e=>e.message===code)};
const PRICE={model:MODEL,inputPerMillionMicroUsd:300000,outputPerMillionMicroUsd:1200000,
  confirmedAt:'2026-10-11T00:00:00.000Z',expiresAt:'2026-10-13T00:00:00.000Z'};
const POLICY={version:1,model:MODEL,dailyCalls:3,dailyMicroUsd:10000,price:PRICE};
const NOW='2026-10-12T15:59:00.000Z';
function setup(date=NOW,policy=POLICY){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'minsheng-gate-test-'));
  const ledger=createLedger({directory:dir,now:()=>new Date(date)});ledger.initialize(policy);
  return {dir,ledger};
}
async function childReserve(dir){
  const modulePath=path.resolve(__dirname,'../server/analysis/deepseek-budget-ledger.js');
  const script='const {createLedger}=require(process.argv[1]);try{createLedger({directory:process.argv[2],now:()=>new Date(process.argv[3])}).reserve({requestBytes:2100});process.stdout.write("OK")}catch(e){process.stdout.write(e.message)}';
  return new Promise(resolve=>{
    const child=spawn(process.execPath,['-e',script,modulePath,dir,NOW],{env:{PATH:process.env.PATH},windowsHide:true});
    let out='';child.stdout.on('data',x=>out+=x);child.on('close',()=>resolve(out));
  });
}
async function validClaims(){
  const raw=await createStructuredSandbox().run(normalizeQuestion(QUESTIONS[0]));
  eq(raw.status,'HUMAN_REVIEW_REQUIRED');
  const fields={FACT:['id','type','evidenceId','evidenceClassification','value','unit','period','geography','scope'],
    GAP:['id','type','evidenceId'],ASSUMPTION:['id','type','text','evidenceIds','dependsOn'],
    INFERENCE:['id','type','text','evidenceIds','dependsOn','uncertainty','causalStatus']};
  return {schemaVersion:'v037-claims-1',claims:raw.claims.map(c=>Object.fromEntries(fields[c.type].map(k=>[k,c[k]])))};
}
const envelope=claims=>({model:MODEL,choices:[{finish_reason:'stop',message:{content:JSON.stringify(claims)}}],
  usage:{prompt_tokens:900,completion_tokens:100}});
function fakeFetch(body, status=200){return async(_url,options)=>{
  ok(options.signal instanceof AbortSignal);
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
}}
async function main(){
  eq(FIRST_QUESTION,'2026年上半年全国居民人均可支配收入是多少？');
  eq(beijingDay(new Date('2026-10-12T15:59:00Z')),'2026-10-12');
  eq(beijingDay(new Date('2026-10-12T16:01:00Z')),'2026-10-13');
  eq(reserveMicroUsd(PRICE),3072);ok(reserveMicroUsd(PRICE)*3<=POLICY.dailyMicroUsd);
  eq(approvalPolicy(new Date(NOW)).dailyCalls,1);
  const preview=await previewFirstRequest();
  eq(JSON.parse(preview.body.messages[1].content).question,FIRST_QUESTION);
  eq(JSON.parse(preview.body.messages[1].content).evidence.map(x=>x.evidenceId),['s_income_pc_h1']);
  ok(Buffer.byteLength(JSON.stringify(preview.body),'utf8')<=LIMITS.inputBytes);
  let lateResolve,lateSends=0;const lateKey=Buffer.from('sk-simulated-test-only-123456789');
  const late=sendOnce(preview,{credentialProvider:()=>new Promise(resolve=>{lateResolve=resolve}),
    fetchImpl:async()=>{lateSends++;return fakeFetch(envelope({schemaVersion:'v037-claims-1',claims:[]}))()},
    timeoutMs:15});
  await assert.rejects(late,e=>e.message==='TIMEOUT_OUTCOME_UNKNOWN');n++;
  lateResolve(lateKey);await new Promise(r=>setTimeout(r,5));
  eq(lateSends,0);ok(lateKey.every(x=>x===0));
  const a=setup();throws(()=>a.ledger.reserve({requestBytes:2100}),'ONE_CALL_AUTHORIZATION_MISSING');
  a.ledger.grantOne({id:'approved-one',expiresAt:'2026-10-13T00:00:00.000Z'});
  const children=await Promise.all(Array.from({length:8},()=>childReserve(a.dir)));
  eq(children.filter(x=>x==='OK').length,1);
  const restarted=createLedger({directory:a.dir,now:()=>new Date(NOW)});
  throws(()=>restarted.reserve({requestBytes:2100}),'ONE_CALL_AUTHORIZATION_MISSING');
  eq(restarted.inspect().rows.filter(x=>x.kind==='RESERVE').length,1);
  // A new Beijing day resets daily totals, not one-call authorization.
  const nextDay=createLedger({directory:a.dir,now:()=>new Date('2026-10-12T16:01:00Z')});
  throws(()=>nextDay.reserve({requestBytes:2100}),'ONE_CALL_AUTHORIZATION_MISSING');
  const b=setup();b.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
  throws(()=>b.ledger.reserve({requestBytes:LIMITS.inputBytes+1}),'INPUT_LIMIT_EXCEEDED');
  b.ledger.reserve({id:'same-request',requestBytes:2100});
  throws(()=>b.ledger.reserve({id:'same-request',requestBytes:2100}),'ONE_CALL_AUTHORIZATION_MISSING');
  const low=setup(NOW,{...POLICY,dailyMicroUsd:3071});
  low.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
  throws(()=>low.ledger.reserve({requestBytes:2100}),'DAILY_BUDGET_EXHAUSTED');
  const daily=setup();
  for(let i=0;i<3;i++){
    daily.ledger.grantOne({id:'daily-'+i,expiresAt:'2026-10-13T00:00:00Z'});
    daily.ledger.reserve({requestBytes:2100});
  }
  daily.ledger.grantOne({id:'daily-four',expiresAt:'2026-10-13T00:00:00Z'});
  throws(()=>daily.ledger.reserve({requestBytes:2100}),'DAILY_BUDGET_EXHAUSTED');
  eq(daily.ledger.inspect().rows.filter(x=>x.kind==='RESERVE').length,3);
  const stale=setup('2026-10-13T00:01:00Z');
  stale.ledger.grantOne({expiresAt:'2026-10-14T00:00:00Z'});
  throws(()=>stale.ledger.reserve({requestBytes:2100}),'PRICE_UNKNOWN');
  const corrupt=setup();fs.appendFileSync(corrupt.ledger.journal,'{partial');
  throws(()=>corrupt.ledger.reserve({requestBytes:2100}),'LEDGER_CORRUPT');
  const locked=setup();fs.mkdirSync(path.join(locked.dir,'deepseek-budget-v1.lock'));
  throws(()=>locked.ledger.reserve({requestBytes:2100}),'LEDGER_LOCKED');
  const data=await validClaims();
  const approved=setup();approved.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
  let sends=0;const key=Buffer.from('sk-simulated-test-only-123456789');
  const gate=createLiveGate({ledger:approved.ledger,enabled:true,clock:()=>NOW,
    credentialProvider:async()=>key,fetchImpl:async(...args)=>{sends++;return fakeFetch(envelope(data))(...args)}});
  const result=await gate.analyze({question:FIRST_QUESTION});
  eq(result.status,'SIMULATED_GATE_VALIDATED');eq(result.providerUsed,false);
  eq(result.externalRequests,0);eq(result.transport,'SIMULATED_TRANSPORT');
  eq(result.facts[0].value,22981);eq(result.sources[0].evidenceId,'s_income_pc_h1');
  eq(result.reservation.reservedMicroUsd,3072);eq(sends,1);ok(key.every(x=>x===0));
  ok(validateTurn(FIRST_QUESTION,result,'LIVE'));
  const uiSession=createSession({kind:'LIVE',respond:async()=>result});
  eq((await uiSession.send(FIRST_QUESTION)).status,'SIMULATED_GATE_VALIDATED');
  const old=uiSession.current;
  const unavailable=createSession({kind:'LIVE',respond:async question=>({question,
    status:'EXTERNAL_CALL_NOT_AUTHORIZED',facts:[],inferences:[],gaps:[],sources:[],
    providerUsed:false,externalRequests:0})});
  await unavailable.send(FIRST_QUESTION);
  eq(unavailable.current.status,'EXTERNAL_CALL_NOT_AUTHORIZED');eq(unavailable.current.sources,[]);
  ok(old.sources.length===1);
  const swapped=createSession({kind:'LIVE',respond:async question=>
    question===FIRST_QUESTION?result:{question,status:'EXTERNAL_CALL_NOT_AUTHORIZED',
      facts:[],inferences:[],gaps:[],sources:[],providerUsed:false,externalRequests:0}});
  await swapped.send(FIRST_QUESTION);await swapped.send('下一题');
  eq(swapped.current.sources,[]);eq(swapped.history[0].sourceIds,['s_income_pc_h1']);
  ok(!validateTurn(FIRST_QUESTION,{...result,status:'REAL_API_VALIDATED'},'LIVE'));
  const server=createServer();let denied;
  server.emit('request',{headers:{host:'127.0.0.1:4189'},url:'/api/analysis/live',method:'POST'},
    {writableEnded:false,destroyed:false,writeHead(code){denied=code},end(){}});
  eq(denied,403);
  eq((await gate.analyze({question:FIRST_QUESTION})).status,'BUDGET_EXHAUSTED');
  const over=setup();over.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
  const largeUsage=envelope(data);largeUsage.usage.prompt_tokens=8193;
  const overGate=createLiveGate({ledger:over.ledger,enabled:true,
    credentialProvider:async()=>Buffer.from('sk-simulated-test-only-123456789'),
    fetchImpl:fakeFetch(largeUsage)});
  const exceeded=await overGate.analyze({question:FIRST_QUESTION});
  eq(exceeded.status,'BUDGET_ACCOUNTING_EXCEEDED');eq(exceeded.facts,[]);
  over.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
  throws(()=>over.ledger.reserve({requestBytes:2100}),'LEDGER_OVERAGE_REVIEW_REQUIRED');
  for(const [http,expected] of [[401,'AUTHENTICATION_FAILED'],[429,'RATE_LIMITED'],[503,'PROVIDER_FAILURE']]){
    const caseLedger=setup();caseLedger.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
    const failed=createLiveGate({ledger:caseLedger.ledger,enabled:true,
      credentialProvider:async()=>Buffer.from('sk-simulated-test-only-123456789'),
      fetchImpl:async()=>new Response(null,{status:http})});
    const answer=await failed.analyze({question:FIRST_QUESTION});
    eq(answer.status,expected);eq(answer.facts,[]);
    eq(caseLedger.ledger.inspect().rows.filter(x=>x.kind==='RESERVE').length,1);
  }
  const malformed=setup();malformed.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
  const badJson=createLiveGate({ledger:malformed.ledger,enabled:true,
    credentialProvider:async()=>Buffer.from('sk-simulated-test-only-123456789'),
    fetchImpl:async()=>new Response('{"choices":',{status:200,headers:{'content-type':'application/json'}})});
  eq((await badJson.analyze({question:FIRST_QUESTION})).status,'MALFORMED_RESPONSE');
  const duplicate=setup();duplicate.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
  let release;const waiting=createLiveGate({ledger:duplicate.ledger,enabled:true,
    credentialProvider:async()=>Buffer.from('sk-simulated-test-only-123456789'),
    fetchImpl:async()=>new Promise(r=>{release=r})});
  const pending=waiting.analyze({question:FIRST_QUESTION});
  await new Promise(r=>setTimeout(r,20));
  eq((await waiting.analyze({question:FIRST_QUESTION})).status,'DUPLICATE_SUBMISSION');
  release(await fakeFetch(envelope(data))('x',{signal:new AbortController().signal}));
  eq((await pending).status,'SIMULATED_GATE_VALIDATED');
  const timeout=setup();timeout.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
  let aborted=false;
  const timeoutGate=createLiveGate({ledger:timeout.ledger,enabled:true,timeoutMs:30,
    credentialProvider:async()=>Buffer.from('sk-simulated-test-only-123456789'),
    fetchImpl:async(_u,{signal})=>new Promise((_r,reject)=>signal.addEventListener('abort',()=>{
      aborted=true;reject(Error('aborted'));},{once:true}))});
  eq((await timeoutGate.analyze({question:FIRST_QUESTION})).status,'TIMEOUT_OUTCOME_UNKNOWN');
  ok(aborted);eq(timeout.ledger.inspect().rows.filter(x=>x.kind==='RESERVE').length,1);
  throws(()=>createLedger({directory:timeout.dir,now:()=>new Date(NOW)}).reserve({requestBytes:2100}),
    'ONE_CALL_AUTHORIZATION_MISSING');
  for(const [label,body] of [['truncated',{...envelope(data),choices:[{finish_reason:'length',message:{content:'{}'}}]}],
    ['bad citation',envelope({...data,claims:data.claims.map((c,i)=>i===0?{...c,evidenceId:'fake'}:c)})],
    ['bad value',envelope({...data,claims:data.claims.map((c,i)=>i===0?{...c,value:1}:c)})]]){
    const caseLedger=setup();caseLedger.ledger.grantOne({expiresAt:'2026-10-13T00:00:00Z'});
    const bad=createLiveGate({ledger:caseLedger.ledger,enabled:true,
      credentialProvider:async()=>Buffer.from('sk-simulated-test-only-123456789'),fetchImpl:fakeFetch(body)});
    const answer=await bad.analyze({question:FIRST_QUESTION});
    ok(answer.status!=='SIMULATED_GATE_VALIDATED',label);eq(answer.facts,[]);eq(answer.sources,[]);
  }
  const ttyInput=new EventEmitter();ttyInput.isTTY=true;ttyInput.setRawMode=()=>{};ttyInput.resume=()=>{};ttyInput.pause=()=>{};
  let visible='';const ttyOutput={isTTY:true,write:x=>visible+=x};
  const credential=readCredentialFromTty({input:ttyInput,output:ttyOutput});
  ttyInput.emit('data',Buffer.from('sk-simulated-test-only-123456789\r'));
  const simulatedKey=await credential;
  ok(simulatedKey.toString().startsWith('sk-'));ok(!visible.includes('simulated-test'));
  simulatedKey.fill(0);
  console.log('v039 one-shot gate: PASS ('+n+' assertions, zero real calls)');
}
main().catch(e=>{console.error(e);process.exitCode=1});
