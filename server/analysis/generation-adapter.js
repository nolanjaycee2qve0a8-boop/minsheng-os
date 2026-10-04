'use strict';
const crypto=require('node:crypto');
const {createStructuredSandbox,CATALOG}=require('./structured-claims');
const {PRICING,POLICY,usageCost}=require('./generation-pricing');
const {isLiveTransport,checkTransportReady}=require('./generation-transport');
const ENDPOINT='https://api.deepseek.com/chat/completions',MAX_RESPONSE_BYTES=65536;
const SYSTEM='Return JSON only, {"schemaVersion":"v037-claims-1","claims":[...]}. Use only supplied evidence. Copy EVERY REAL/DERIVED as FACT {id,type,evidenceId,evidenceClassification,value,unit,period,geography,scope}; copy EVERY GAP/UNKNOWN/BLOCKED as GAP {id,type,evidenceId}. For every SCENARIO include ASSUMPTION {id,type,text,evidenceIds,dependsOn}; text starts with 假设. You may add conditional ASSUMPTION and INFERENCE {id,type,text,evidenceIds,dependsOn,uncertainty:"HYPOTHESIS_ONLY",causalStatus:"NOT_IDENTIFIED"}. Dependencies reference earlier claim IDs; inference citations must follow dependencies. No numeric free prose or proven causal claims. All free prose needs human review; citations do not identify causality. No extra fields, tools, private data or outside sources.';
async function prepareGeneration(summary,{live=false}={}){
 const prepared=await createStructuredSandbox().prepare(summary),canonical=prepared.payload.questionSummary;
 const publicPayload=live?{...prepared.payload,questionSummary:{topic:CATALOG.find(x=>JSON.stringify(x.summary)===JSON.stringify(canonical)).id,metricIds:canonical.metricIds,period:canonical.period,geography:canonical.geography}}:prepared.payload;
 const body={model:PRICING.model,thinking:{type:'disabled'},temperature:0,max_tokens:POLICY.maxOutputTokens,stream:false,response_format:{type:'json_object'},messages:[{role:'system',content:SYSTEM},{role:'user',content:JSON.stringify(publicPayload)}]},inputEnvelopeBytes=Buffer.byteLength(JSON.stringify(body),'utf8')+1024;
 if(inputEnvelopeBytes>POLICY.maxInputTokens)throw Error('INPUT_ENVELOPE_EXCEEDED');return {prepared,body,inputEnvelopeBytes};
}
function createGenerationAdapter({ledger,transport=null,liveEnabled=false,timeoutMs=8000}={}){
 const live=liveEnabled===true&&isLiveTransport(transport);
 if((liveEnabled||transport?.mode==='LIVE')&&!live)throw Error('LIVE_REQUIRES_SEPARATE_APPROVAL');
 if(transport&&!live&&(transport.mode!=='OFFLINE_MOCK'||typeof transport.send!=='function'))throw Error('OFFLINE_TRANSPORT_REQUIRED');
 if(live&&(ledger?.policy?.version!=='approved-first-pilot-20261004'||ledger.policy.approval!=='FIRST_PILOT_APPROVED'||ledger.policy.autoRenew!==false))throw Error('LIVE_BUDGET_POLICY_REQUIRED');
 const transportSend=transport?.send,transportUnchanged=()=>transport?.mode===(live?'LIVE':'OFFLINE_MOCK')&&transport.send===transportSend;
 if(!ledger||typeof ledger.reserve!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('ADAPTER_CONFIGURATION_INVALID');
 const sandbox=createStructuredSandbox(),pending=new Map();
 const meta={mode:live?'LIVE_CONTROLLED_GENERATION':'OFFLINE_INJECTED_GENERATION',providerUsed:false,externalRequests:0,actualCostMicroUsd:live?null:0},resultMeta=live?{...meta,providerUsed:true,externalRequests:1}:meta;
 const notice=live?'首轮受控生成；自由分析待人工复核，usage估算不是最终账单。':'仅为注入 mock 的离线 generation 验证；自由分析仍待人工复核。';
 function rawClaims(claims){return {schemaVersion:'v037-claims-1',claims:claims.map(c=>{const keys=c.type==='FACT'?['id','type','evidenceId','evidenceClassification','value','unit','period','geography','scope']:c.type==='GAP'?['id','type','evidenceId']:c.type==='ASSUMPTION'?['id','type','text','evidenceIds','dependsOn']:['id','type','text','evidenceIds','dependsOn','uncertainty','causalStatus'];return Object.fromEntries(keys.map(k=>[k,c[k]]))})}}
 async function generate(request){
  if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).sort().join('|')!=='requestId|summary')return {...meta,status:'PREFLIGHT_REJECTED'};
  const {requestId,summary}=request;
  if(!transport)return {...meta,status:'OFFLINE_NO_TRANSPORT'};
  if(!transportUnchanged())return {...meta,status:'PREFLIGHT_REJECTED'};
  let prepared,body,digest;
  try{
   if(live)checkTransportReady(transport);
   ({prepared,body}=await prepareGeneration(summary,{live}));
   digest=crypto.createHash('sha256').update(JSON.stringify({body,priceVersion:PRICING.version,policyVersion:POLICY.version})).digest('hex');if(!transportUnchanged())throw Error('TRANSPORT_CHANGED');
  }catch{return {...meta,status:'PREFLIGHT_REJECTED'}}
  const previous=pending.get(requestId);if(previous){if(previous.digest!==digest)return {...meta,status:'REQUEST_ID_REUSED_FOR_DIFFERENT_PAYLOAD'};return previous.promise}
  let reservation;try{reservation=ledger.reserve({requestId,digest})}catch(e){return {...meta,status:'PREFLIGHT_REJECTED',reason:['BUDGET_FROZEN','BUDGET_LIMIT_REACHED','PILOT_UNRESOLVED_REQUEST','PILOT_LEDGER_MISSING','PILOT_EXECUTOR_OR_ID_MISMATCH','LEDGER_LOCKED','LEDGER_PATH_UNSAFE','LEDGER_CORRUPT_OR_POLICY_CHANGED','REQUEST_ID_OR_DIGEST_INVALID','REQUEST_ID_REUSED_FOR_DIFFERENT_PAYLOAD'].includes(e.message)?e.message:'LEDGER_UNAVAILABLE'}}
  if(!reservation.created){
   const r=reservation.record;if(r.state!=='SETTLED')return {...meta,status:'REQUEST_HELD_NO_RETRY',replayed:true};
   if(r.result.status!=='HUMAN_REVIEW_REQUIRED')return {...meta,status:['OFFLINE_RESPONSE_REJECTED','LIVE_RESPONSE_REJECTED','USAGE_OVERRUN_BUDGET_FROZEN','COST_RECONCILED_NO_ANSWER'].includes(r.result.status)?r.result.status:'OFFLINE_CACHED_RESULT_REJECTED',replayed:true,applicationAccountedMicroUsd:r.heldMicroUsd};
   try{const validated=await sandbox.validate(prepared.payload.questionSummary,rawClaims(r.result.claims));if(Object.keys(r.result).sort().join('|')!==[...Object.keys(meta),'status','summary','claims','citations','boundary','notice'].sort().join('|')||JSON.stringify(validated)!==JSON.stringify(r.result.claims)||JSON.stringify(r.result.summary)!==JSON.stringify(prepared.payload.questionSummary)||JSON.stringify(r.result.citations)!==JSON.stringify(prepared.localFallback.citations)||r.result.boundary!==prepared.localFallback.boundary||r.result.notice!==notice||Object.keys(resultMeta).some(k=>r.result[k]!==resultMeta[k]))throw Error('CACHE_INVALID');return {...r.result,externalRequests:0,replayed:true,applicationAccountedMicroUsd:r.heldMicroUsd}}catch{return {...meta,status:'OFFLINE_CACHED_RESULT_REJECTED',replayed:true}}
  }
  const promise=(async()=>{
   let timer;const controller=new AbortController();
   try{
    const response=await Promise.race([Promise.resolve().then(()=>{if(!transportUnchanged())throw Error('TRANSPORT_CHANGED');return transportSend.call(transport,Object.freeze({url:ENDPOINT,method:'POST',body:JSON.stringify(body),redirect:'error',credentials:'omit',signal:controller.signal,maxResponseBytes:MAX_RESPONSE_BYTES,networkAllowed:live}))}),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('TRANSPORT_TIMEOUT'))},timeoutMs)})]);
    if(!response||response.status!==200||typeof response.body!=='string'||Buffer.byteLength(response.body,'utf8')>MAX_RESPONSE_BYTES)throw Error('UNKNOWN_PROVIDER_FAILURE');
    const payload=JSON.parse(response.body);if(payload.model!==PRICING.model||payload.object!=='chat.completion')throw Error('UNKNOWN_PROVIDER_FAILURE');usageCost(payload.usage);
    let result;
    try{
     if(payload.model!==PRICING.model||payload.object!=='chat.completion'||payload.choices?.length!==1||payload.choices[0].finish_reason!=='stop'||payload.choices[0].message?.role!=='assistant'||typeof payload.choices[0].message.content!=='string'||payload.choices[0].message.tool_calls?.length||payload.choices[0].message.reasoning_content)throw Error('RESPONSE_SCHEMA_INVALID');
     const claims=await sandbox.validate(prepared.payload.questionSummary,JSON.parse(payload.choices[0].message.content));result={...resultMeta,status:'HUMAN_REVIEW_REQUIRED',summary:prepared.payload.questionSummary,claims,citations:prepared.localFallback.citations,boundary:prepared.localFallback.boundary,notice};
    }catch{result={...resultMeta,status:live?'LIVE_RESPONSE_REJECTED':'OFFLINE_RESPONSE_REJECTED',localFallback:prepared.localFallback}}
    const settled=ledger.settle(requestId,payload.usage,result);
    return {...settled.result,applicationAccountedMicroUsd:settled.heldMicroUsd};
   }catch{
    // Unknown billing is never released and the ID cannot retry, even after restart.
    try{ledger.unknown(requestId)}catch{}
    return {...resultMeta,status:live?'LIVE_PROVIDER_FAILED_COST_HELD':'OFFLINE_PROVIDER_FAILED_COST_HELD',localFallback:prepared.localFallback};
   }finally{if(timer)clearTimeout(timer)}
  })();
  pending.set(requestId,{digest,promise});try{return await promise}finally{pending.delete(requestId)}
 }
 return Object.freeze({generate});
}
module.exports={createGenerationAdapter,prepareGeneration,ENDPOINT,MAX_RESPONSE_BYTES};
