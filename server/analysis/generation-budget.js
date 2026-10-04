'use strict';
// One local JSON ledger, synchronous file transactions, fail-closed lock recovery.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PRICING,POLICY,usageCost,reserveCost}=require('./generation-pricing');
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function createBudgetLedger({file,now=()=>new Date(),limits={}}={}){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('ABSOLUTE_PRIVATE_LEDGER_REQUIRED');
 const allowed=['maxAttempts','totalMicroUsd','monthlyMicroUsd'];if(!limits||typeof limits!=='object'||Array.isArray(limits)||Object.keys(limits).some(k=>!allowed.includes(k))||Object.entries(limits).some(([k,v])=>!Number.isSafeInteger(v)||v<0||v>POLICY[k]))throw Error('BUDGET_LIMITS_INVALID');
 const policy=Object.freeze({...POLICY,...limits});
 const directory=fs.realpathSync(path.dirname(file)),target=path.join(directory,path.basename(file)),lock=target+'.lock';
 if((fs.statSync(directory).mode&0o077)!==0)throw Error('LEDGER_DIRECTORY_NOT_PRIVATE');
 const assertRegular=()=>{if(fs.existsSync(target)){const stat=fs.lstatSync(target);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)throw Error('LEDGER_PATH_UNSAFE')}};
 const blank=()=>({version:1,policy:copy(policy),pricing:copy(PRICING),blocked:false,requests:{}});
 function validate(state){
  if(!state||state.version!==1||hash(state.policy)!==hash(policy)||hash(state.pricing)!==hash(PRICING)||typeof state.blocked!=='boolean'||!state.requests||Array.isArray(state.requests))throw Error('LEDGER_CORRUPT_OR_POLICY_CHANGED');
  for(const [id,r] of Object.entries(state.requests))if(!/^[A-Za-z0-9_-]{1,64}$/.test(id)||!r||r.id!==id||!/^[a-f0-9]{64}$/.test(r.digest)||!/^\d{4}-\d{2}$/.test(r.month)||r.priceVersion!==PRICING.version||!['RESERVED','UNKNOWN','SETTLED'].includes(r.state)||!Number.isSafeInteger(r.heldMicroUsd)||r.heldMicroUsd<0||r.reservedMicroUsd!==reserveCost()||(r.state!=='SETTLED'&&r.heldMicroUsd!==r.reservedMicroUsd))throw Error('LEDGER_CORRUPT_OR_POLICY_CHANGED');
  for(const r of Object.values(state.requests))if(r.state==='SETTLED'?(usageCost(r.usage).costMicroUsd!==r.heldMicroUsd||r.overrun!==(r.usage.prompt_tokens>POLICY.maxInputTokens||r.usage.completion_tokens>POLICY.maxOutputTokens||r.heldMicroUsd>r.reservedMicroUsd)||!r.result||(r.overrun&&!state.blocked)):(r.usage!==null||r.result!==null))throw Error('LEDGER_CORRUPT_OR_POLICY_CHANGED');
  return state;
 }
 function persist(state){
  const tmp=target+'.tmp-'+crypto.randomBytes(12).toString('hex');let fd;
  try{fd=fs.openSync(tmp,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);fs.writeFileSync(fd,JSON.stringify(state));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(tmp,target);const parent=fs.openSync(directory,fs.constants.O_RDONLY);try{fs.fsyncSync(parent)}finally{fs.closeSync(parent)}}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
 }
 function transaction(fn){
  let fd;try{fd=fs.openSync(lock,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600)}catch{throw Error('LEDGER_LOCKED')}
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid}));fs.fsyncSync(fd);assertRegular();let state=blank();if(fs.existsSync(target)){const input=fs.openSync(target,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);try{let parsed;try{parsed=JSON.parse(fs.readFileSync(input,'utf8'))}catch{throw Error('LEDGER_CORRUPT_OR_POLICY_CHANGED')}state=validate(parsed)}finally{fs.closeSync(input)}}const result=fn(state);persist(validate(state));return copy(result)}finally{fs.closeSync(fd);fs.unlinkSync(lock)}
 }
 function reserve({requestId,digest}){
  if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(requestId)||['__proto__','constructor','prototype'].includes(requestId)||typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))throw Error('REQUEST_ID_OR_DIGEST_INVALID');
  return transaction(state=>{
   const prior=Object.prototype.hasOwnProperty.call(state.requests,requestId)?state.requests[requestId]:null;
   if(prior){if(prior.digest!==digest)throw Error('REQUEST_ID_REUSED_FOR_DIFFERENT_PAYLOAD');return {created:false,record:prior}}
   if(state.blocked)throw Error('BUDGET_FROZEN');const records=Object.values(state.requests),month=now().toISOString().slice(0,7),amount=reserveCost();
   const total=records.reduce((sum,r)=>sum+r.heldMicroUsd,0),monthly=records.filter(r=>r.month===month).reduce((sum,r)=>sum+r.heldMicroUsd,0);
   if(records.length>=policy.maxAttempts||total+amount>policy.totalMicroUsd||monthly+amount>policy.monthlyMicroUsd)throw Error('BUDGET_LIMIT_REACHED');
   const record={id:requestId,digest,month,priceVersion:PRICING.version,reservedMicroUsd:amount,heldMicroUsd:amount,state:'RESERVED',usage:null,result:null};state.requests[requestId]=record;return {created:true,record};
  });
 }
 function unknown(requestId){return transaction(state=>{const r=state.requests[requestId];if(!r)throw Error('REQUEST_NOT_RESERVED');if(r.state==='RESERVED')r.state='UNKNOWN';return r})}
 function settle(requestId,usage,result,manual=false){
  const billed=usageCost(usage);
  return transaction(state=>{
   const r=state.requests[requestId];if(!r||!(r.state==='RESERVED'||manual&&r.state==='UNKNOWN'))throw Error('REQUEST_NOT_RESERVED');
   const overrun=usage.prompt_tokens>POLICY.maxInputTokens||usage.completion_tokens>POLICY.maxOutputTokens||billed.costMicroUsd>r.reservedMicroUsd;
   r.state='SETTLED';r.heldMicroUsd=billed.costMicroUsd;r.usage=billed.usage;r.result=copy(overrun?{status:'USAGE_OVERRUN_BUDGET_FROZEN',mode:'OFFLINE_INJECTED_GENERATION',providerUsed:false,externalRequests:0,actualCostMicroUsd:0}:result);r.overrun=overrun;if(overrun)state.blocked=true;return r;
  });
 }
 return Object.freeze({reserve,unknown,settle,policy,reconcileUsage:(requestId,usage)=>settle(requestId,usage,{status:'COST_RECONCILED_NO_ANSWER',mode:'OFFLINE_INJECTED_GENERATION',providerUsed:false,externalRequests:0,actualCostMicroUsd:0},true),snapshot:()=>transaction(state=>state)});
}
module.exports={createBudgetLedger};
