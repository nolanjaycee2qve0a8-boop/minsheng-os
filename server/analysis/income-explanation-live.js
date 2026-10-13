'use strict';
// No auto authorization, credential access or network on import. Reuses sendOnce and the v1 journal.
const {createHash}=require('node:crypto');
const {requestDraft,validateEnvelope,CONTEXT,SOURCE_BINDINGS,QUESTION}=require('./income-explanation-preflight');
const {sendOnce}=require('./deepseek-live-once');
const {beijingDay,reserveMicroUsd,INPUT_TOKEN_RESERVE}=require('./deepseek-budget-ledger');
const BODY_SHA='c68d427982b1ce35ebd7b83a54db08c89ac99936c7e59afc1632456b9c22ba59';
const BUDGET=Object.freeze({calls:1,automaticRetries:0,dailyCalls:1,dailyMicroUsd:3100,reservedMicroUsd:3072,
  inputTokens:8192,outputTokens:512,model:'deepseek-flash',inputPerMillionMicroUsd:300000,outputPerMillionMicroUsd:1200000});
function boundRequest(){
  const r=requestDraft();
  if(r.bodyBytes!==3730||r.bodySha256!==BODY_SHA||r.body.model!==BUDGET.model)throw Error('REQUEST_BINDING_MISMATCH');
  const authorizationDigest=createHash('sha256').update(JSON.stringify({version:'income-live-1',
    requestDigest:r.authorizationDigest,budget:BUDGET,limits:r.limits})).digest('hex');
  return {...r,authorizationDigest};
}
function checkReady(ledger,now=new Date(),requireGrant=true){
  const r=boundRequest();
  if(!ledger||ledger.authorizationDigest!==r.authorizationDigest)throw Error('AUTHORIZATION_SCOPE_MISMATCH');
  const state=ledger.inspect(),p=state.policy,at=now.getTime();
  if(!Number.isFinite(at))throw Error('CLOCK_INVALID');
  if(state.rows.some(x=>x.kind==='OVERAGE'))throw Error('LEDGER_OVERAGE_REVIEW_REQUIRED');
  if(!p||p.dailyCalls>BUDGET.dailyCalls||p.dailyMicroUsd>BUDGET.dailyMicroUsd||
      p.price.model!==BUDGET.model||p.price.inputPerMillionMicroUsd!==BUDGET.inputPerMillionMicroUsd||
      p.price.outputPerMillionMicroUsd!==BUDGET.outputPerMillionMicroUsd||reserveMicroUsd(p.price)!==3072)throw Error('BUDGET_BINDING_MISMATCH');
  if(at<Date.parse(p.price.confirmedAt)||at>=Date.parse(p.price.expiresAt))throw Error('PRICE_UNKNOWN');
  const today=state.rows.filter(x=>x.kind==='RESERVE'&&x.day===beijingDay(now));
  if(today.length>=p.dailyCalls||today.reduce((n,x)=>n+x.microUsd,0)+3072>p.dailyMicroUsd)throw Error('DAILY_BUDGET_EXHAUSTED');
  if(requireGrant&&![...state.grants.values()].some(x=>x.questionDigest===r.authorizationDigest&&
    !state.spent.has(x.id)&&Date.parse(x.expiresAt)>at))throw Error('ONE_CALL_AUTHORIZATION_MISSING');
  return state;
}
const CODES=new Set(['AUTHORIZATION_SCOPE_MISMATCH','REQUEST_BINDING_MISMATCH','BUDGET_BINDING_MISMATCH',
 'ONE_CALL_AUTHORIZATION_MISSING','DAILY_BUDGET_EXHAUSTED','PRICE_UNKNOWN','LEDGER_MISSING','LEDGER_CORRUPT','LEDGER_LOCKED',
 'LEDGER_OVERAGE_REVIEW_REQUIRED','AUTHENTICATION_FAILED','RATE_LIMITED','PROVIDER_FAILURE','MALFORMED_RESPONSE',
 'MALFORMED_OR_TRUNCATED_RESPONSE','USAGE_LIMIT_REJECTED','FACT_BINDING_MISMATCH','CALCULATION_BINDING_MISMATCH',
 'LIMITATIONS_MISSING','EXPLANATION_SCOPE_MISMATCH','EXPLANATION_REVIEW_REJECTED','SOURCE_OR_OUTPUT_INSTRUCTION_REJECTED',
 'TIMEOUT_OUTCOME_UNKNOWN','NETWORK_OUTCOME_UNKNOWN','CREDENTIAL_UNAVAILABLE','RESPONSE_LIMIT_EXCEEDED','INPUT_LIMIT_EXCEEDED']);
function createIncomeGate({ledger,credentialProvider,fetchImpl,mode='SIMULATED',enabled=false,now=()=>new Date(),timeoutMs=8000}={}){
  if(!['SIMULATED','REAL'].includes(mode)||
    (mode==='SIMULATED'&&(typeof fetchImpl!=='function'||fetchImpl===globalThis.fetch))||
    (mode==='REAL'&&fetchImpl!==undefined&&fetchImpl!==globalThis.fetch))throw Error('TRANSPORT_MODE_INVALID');
  let pending=false,used=false;
  async function analyze({question}={}){
    let attempted=false,reservation=null;
    const empty={schemaVersion:'income-live-result-1',question,mode,model:BUDGET.model,status:'NOT_AUTHORIZED',
      providerUsed:false,externalRequests:0,transport:mode==='REAL'?'REAL_NOT_SENT':'SIMULATED_HTTP_ONLY',
      facts:[],calculation:null,explanation:null,limitations:[],sources:[],semanticTruthVerified:false,
      bodySha256:BODY_SHA,sourceBindings:SOURCE_BINDINGS,validationStatus:'NOT_VALIDATED'};
    if(!enabled)return empty;
    if(question!==QUESTION)return {...empty,status:'QUESTION_NOT_APPROVED'};
    if(pending)return {...empty,status:'DUPLICATE_SUBMISSION'};
    if(used)return {...empty,status:'ONE_CALL_LIMIT'};
    pending=true;
    try{
      const request=boundRequest();checkReady(ledger,now());
      reservation=ledger.reserve({requestBytes:request.bodyBytes,constraints:BUDGET});used=true;
      const reply=await sendOnce(request,{credentialProvider,fetchImpl:mode==='REAL'?globalThis.fetch:fetchImpl,
        timeoutMs,onAttempt:()=>{attempted=true}});
      const usage=reply?.body?.usage;
      if(usage&&Number.isSafeInteger(usage.prompt_tokens)&&usage.prompt_tokens>0&&
        Number.isSafeInteger(usage.completion_tokens)&&usage.completion_tokens>=0&&
        (usage.prompt_tokens>INPUT_TOKEN_RESERVE||usage.completion_tokens>512))
        ledger.flagOverage({reservationId:reservation.id,inputTokens:usage.prompt_tokens,outputTokens:usage.completion_tokens});
      const checked=validateEnvelope(reply);
      return {...empty,...checked,status:mode==='REAL'?'REAL_INCOME_VALIDATED_REVIEW_REQUIRED':'SIMULATED_INCOME_VALIDATED_REVIEW_REQUIRED',
        providerUsed:mode==='REAL',externalRequests:mode==='REAL'?1:0,transport:mode==='REAL'?'REAL_API':'SIMULATED_HTTP_ONLY',
        validationStatus:'INCOME_BINDINGS_PASSED',sources:CONTEXT.evidence,formula:CONTEXT.calculation.formula,
        boundary:CONTEXT.commonBasis,calledAt:now().toISOString(),reservation};
    }catch(error){return {...empty,status:CODES.has(error.message)?error.message:'INCOME_RESPONSE_REJECTED',
      providerUsed:mode==='REAL'&&attempted,externalRequests:mode==='REAL'&&attempted?1:0,
      transport:mode==='REAL'?(attempted?'REAL_API':'REAL_NOT_SENT'):'SIMULATED_HTTP_ONLY',reservation};
    }finally{pending=false;}
  }
  return Object.freeze({analyze});
}
module.exports={boundRequest,BUDGET,checkReady,createIncomeGate,QUESTION,BODY_SHA};
