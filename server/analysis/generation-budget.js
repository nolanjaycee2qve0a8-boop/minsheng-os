'use strict';
// One local JSON ledger, synchronous file transactions, fail-closed lock recovery.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PRICING,POLICY,LIVE_POLICY,PILOT_ID,usageCost,reserveCost,liveReserveCost}=require('./generation-pricing');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function createBudgetLedger({file,now=()=>new Date(),limits={},policyKind='OFFLINE',bootstrap=false,executorId=null}={}){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('ABSOLUTE_PRIVATE_LEDGER_REQUIRED');
 if(!['OFFLINE','LIVE_FIRST_PILOT'].includes(policyKind))throw Error('BUDGET_POLICY_INVALID');const live=policyKind==='LIVE_FIRST_PILOT',basePolicy=live?LIVE_POLICY:POLICY,reservedCost=live?liveReserveCost:reserveCost;
 const allowed=live?['maxAttempts','totalMicroUsd']:['maxAttempts','totalMicroUsd','monthlyMicroUsd'];if(!limits||typeof limits!=='object'||Array.isArray(limits)||Object.keys(limits).some(k=>!allowed.includes(k))||Object.entries(limits).some(([k,v])=>!Number.isSafeInteger(v)||v<0||v>basePolicy[k]))throw Error('BUDGET_LIMITS_INVALID');
 const policy=Object.freeze({...basePolicy,...limits});
 if(live&&(typeof bootstrap!=='boolean'||typeof executorId!=='string'||!/^[a-f0-9]{64}$/.test(executorId)))throw Error('PILOT_EXECUTOR_REQUIRED');let initializing=live&&bootstrap;
 const directory=fs.realpathSync(path.dirname(file)),target=path.join(directory,path.basename(file)),lock=target+'.lock';
 if((fs.statSync(directory).mode&0o077)!==0)throw Error('LEDGER_DIRECTORY_NOT_PRIVATE');
 const assertRegular=()=>{let stat;try{stat=fs.lstatSync(target)}catch(e){if(e.code!=='ENOENT')throw e}if(stat&&(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0))throw Error('LEDGER_PATH_UNSAFE')};
 const blank=()=>({version:1,policy:copy(policy),pricing:copy(PRICING),blocked:false,requests:{}});
 const marker=target+'.pilot',identity={pilot:PILOT_ID,executorId};
 function assertInitialized(){
  if(!fs.existsSync(target)||!fs.existsSync(marker))throw Error('PILOT_LEDGER_MISSING');
  const stat=fs.lstatSync(marker);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw Error('PILOT_IDENTITY_UNSAFE');
  let recorded,fd;try{fd=fs.openSync(marker,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);recorded=JSON.parse(fs.readFileSync(fd,'utf8'))}catch{throw Error('PILOT_IDENTITY_INVALID')}finally{if(fd!==undefined)fs.closeSync(fd)}
  if(hash(recorded)!==hash(identity))throw Error('PILOT_EXECUTOR_OR_ID_MISMATCH');
 }
 function validate(state){
  if(!state||state.version!==1||hash(state.policy)!==hash(policy)||hash(state.pricing)!==hash(PRICING)||typeof state.blocked!=='boolean'||!state.requests||Array.isArray(state.requests))throw Error('LEDGER_CORRUPT_OR_POLICY_CHANGED');
  for(const [id,r] of Object.entries(state.requests))if(!/^[A-Za-z0-9_-]{1,64}$/.test(id)||!r||r.id!==id||!/^[a-f0-9]{64}$/.test(r.digest)||!/^\d{4}-\d{2}$/.test(r.month)||r.priceVersion!==PRICING.version||!['RESERVED','UNKNOWN','SETTLED'].includes(r.state)||!Number.isSafeInteger(r.heldMicroUsd)||r.heldMicroUsd<0||r.reservedMicroUsd!==reservedCost()||(r.state!=='SETTLED'&&r.heldMicroUsd!==r.reservedMicroUsd))throw Error('LEDGER_CORRUPT_OR_POLICY_CHANGED');
  for(const r of Object.values(state.requests))if(r.state==='SETTLED'?(usageCost(r.usage).costMicroUsd!==r.heldMicroUsd||r.overrun!==(r.usage.prompt_tokens>POLICY.maxInputTokens||r.usage.completion_tokens>POLICY.maxOutputTokens||r.heldMicroUsd>r.reservedMicroUsd)||!r.result||(r.overrun&&!state.blocked)):(r.usage!==null||r.result!==null))throw Error('LEDGER_CORRUPT_OR_POLICY_CHANGED');
  return state;
 }
 function persist(state){
  const tmp=target+'.tmp-'+crypto.randomBytes(12).toString('hex');let fd;
  try{fd=fs.openSync(tmp,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);fs.writeFileSync(fd,JSON.stringify(state));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(tmp,target);const parent=fs.openSync(directory,fs.constants.O_RDONLY);try{fs.fsyncSync(parent)}finally{fs.closeSync(parent)}}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
 }
 function transaction(fn){
  if(!fs.lstatSync(directory).isDirectory()||(fs.statSync(directory).mode&0o077)!==0)throw Error('LEDGER_DIRECTORY_NOT_PRIVATE');
  if(live&&!initializing)assertInitialized();
  let fd;try{fd=fs.openSync(lock,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600)}catch{throw Error('LEDGER_LOCKED')}
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid}));fs.fsyncSync(fd);assertRegular();
   if(live&&!initializing)assertInitialized();
   if(initializing){if(fs.existsSync(target)||fs.existsSync(marker))throw Error('PILOT_ALREADY_BOOTSTRAPPED');const markerFd=fs.openSync(marker,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);try{fs.writeFileSync(markerFd,JSON.stringify(identity));fs.fsyncSync(markerFd)}finally{fs.closeSync(markerFd)}const parent=fs.openSync(directory,fs.constants.O_RDONLY);try{fs.fsyncSync(parent)}finally{fs.closeSync(parent)}}
   let state=blank();if(live&&!initializing||fs.existsSync(target)){let input;try{input=fs.openSync(target,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW)}catch(e){if(live&&e.code==='ENOENT')throw Error('PILOT_LEDGER_MISSING');throw e}try{let parsed;try{parsed=JSON.parse(fs.readFileSync(input,'utf8'))}catch{throw Error('LEDGER_CORRUPT_OR_POLICY_CHANGED')}state=validate(parsed)}finally{fs.closeSync(input)}}const result=fn(state);if(live&&!initializing)assertInitialized();persist(validate(state));return copy(result)}finally{fs.closeSync(fd);fs.unlinkSync(lock)}
 }
 function reserve({requestId,digest}){
  if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(requestId)||['__proto__','constructor','prototype'].includes(requestId)||typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))throw Error('REQUEST_ID_OR_DIGEST_INVALID');
  return transaction(state=>{
   const prior=Object.prototype.hasOwnProperty.call(state.requests,requestId)?state.requests[requestId]:null;
   if(prior){if(prior.digest!==digest)throw Error('REQUEST_ID_REUSED_FOR_DIFFERENT_PAYLOAD');return {created:false,record:prior}}
   if(state.blocked)throw Error('BUDGET_FROZEN');const records=Object.values(state.requests),month=now().toISOString().slice(0,7),amount=reservedCost();if(live&&records.some(r=>r.state!=='SETTLED'))throw Error('PILOT_UNRESOLVED_REQUEST');
   const total=records.reduce((sum,r)=>sum+r.heldMicroUsd,0),monthly=records.filter(r=>r.month===month).reduce((sum,r)=>sum+r.heldMicroUsd,0);
   if(records.length>=policy.maxAttempts||total+amount>policy.totalMicroUsd||!live&&monthly+amount>policy.monthlyMicroUsd)throw Error('BUDGET_LIMIT_REACHED');
   const record={id:requestId,digest,month,priceVersion:PRICING.version,reservedMicroUsd:amount,heldMicroUsd:amount,state:'RESERVED',usage:null,result:null};state.requests[requestId]=record;return {created:true,record};
  });
 }
 function unknown(requestId){return transaction(state=>{const r=state.requests[requestId];if(!r)throw Error('REQUEST_NOT_RESERVED');if(r.state==='RESERVED')r.state='UNKNOWN';return r})}
 function settle(requestId,usage,result,manual=false){
  const billed=usageCost(usage);
  return transaction(state=>{
   const r=state.requests[requestId];if(!r||!(r.state==='RESERVED'||manual&&r.state==='UNKNOWN'))throw Error('REQUEST_NOT_RESERVED');
   const overrun=usage.prompt_tokens>POLICY.maxInputTokens||usage.completion_tokens>POLICY.maxOutputTokens||billed.costMicroUsd>r.reservedMicroUsd;
   r.state='SETTLED';r.heldMicroUsd=billed.costMicroUsd;r.usage=billed.usage;r.result=copy(overrun?{status:'USAGE_OVERRUN_BUDGET_FROZEN',mode:live?'LIVE_CONTROLLED_GENERATION':'OFFLINE_INJECTED_GENERATION',providerUsed:live,externalRequests:live?1:0,actualCostMicroUsd:live?null:0}:result);r.overrun=overrun;if(overrun)state.blocked=true;return r;
  });
 }
 if(live){transaction(state=>state);initializing=false}
 return Object.freeze({reserve,unknown,settle,policy,reconcileUsage:(requestId,usage)=>settle(requestId,usage,{status:'COST_RECONCILED_NO_ANSWER',mode:live?'LIVE_CONTROLLED_GENERATION':'OFFLINE_INJECTED_GENERATION',providerUsed:live,externalRequests:0,actualCostMicroUsd:live?null:0},true),snapshot:()=>transaction(state=>state)});
}
module.exports={createBudgetLedger};
