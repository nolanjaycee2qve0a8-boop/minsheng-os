/* Isolated browser session for the offline evidence-analysis demo. */
(function(root) {
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const allowed=new Set(['SIMULATED_ANALYSIS_REVIEW_REQUIRED','NO_EVIDENCE','UNSUPPORTED_QUESTION',
  'MOCK_TIMEOUT','MOCK_RATE_LIMIT','MOCK_RESPONSE_REJECTED','SOURCE_TEXT_REJECTED',
  'EVIDENCE_UNAVAILABLE','INVALID_REQUEST']);
 const liveFailures=new Set(['EXTERNAL_CALL_NOT_AUTHORIZED','ONE_CALL_AUTHORIZATION_MISSING',
  'DAILY_BUDGET_EXHAUSTED','PRICE_UNKNOWN','LEDGER_CORRUPT','LEDGER_LOCKED',
  'AUTHENTICATION_FAILED','RATE_LIMITED','PROVIDER_FAILURE','MALFORMED_RESPONSE',
  'TIMEOUT_OUTCOME_UNKNOWN','NETWORK_OUTCOME_UNKNOWN','OUTPUT_REJECTED',
  'BUDGET_EXHAUSTED','DUPLICATE_SUBMISSION','EVIDENCE_PREFLIGHT_REJECTED',
  'LEDGER_OVERAGE_REVIEW_REQUIRED','BUDGET_ACCOUNTING_EXCEEDED',
  'LEDGER_OVERAGE_RECORD_FAILED','CREDENTIAL_UNAVAILABLE','RESPONSE_LIMIT_EXCEEDED',
  'INPUT_LIMIT_EXCEEDED','LEDGER_REJECTED','QUESTION_NOT_APPROVED']);
 function validateTurn(question,result,kind='OFFLINE'){
  if(!result||result.question!==question||!Array.isArray(result.facts)||!Array.isArray(result.inferences)||
   !Array.isArray(result.gaps)||!Array.isArray(result.sources))return false;
  if(kind==='LIVE'){
   if(result.status==='REAL_API_VALIDATED'||result.status==='SIMULATED_GATE_VALIDATED'){
    if(result.question!==question||result.validationStatus!=='EXISTING_CHAIN_PASSED'||
       result.model!=='deepseek-flash'||
       (result.status==='REAL_API_VALIDATED' &&
        (result.providerUsed!==true||result.externalRequests!==1||result.transport!=='REAL_API'))||
       (result.status==='SIMULATED_GATE_VALIDATED' &&
        (result.providerUsed!==false||result.externalRequests!==0||
         result.simulation!=='SIMULATED_HTTP_ONLY')))return false;
   }else return liveFailures.has(result.status)&&!result.facts.length&&
     !result.inferences.length&&!result.sources.length;
  }else if(result.question!==question||!allowed.has(result.status)||
   result.simulation!=='OFFLINE_FIXED_MOCK'||result.providerUsed!==false||
   result.externalRequests!==0)return false;
  const sources=new Map(result.sources.map(x=>[x.evidenceId,x]));
  if(sources.size!==result.sources.length)return false;
  if(['SIMULATED_ANALYSIS_REVIEW_REQUIRED','REAL_API_VALIDATED','SIMULATED_GATE_VALIDATED'].includes(result.status)){
   if(!result.inputContract||result.inputContract.question!==question||
      !Array.isArray(result.inputContract.evidence)||
      JSON.stringify(result.inputContract.evidence)!==JSON.stringify(result.sources))return false;
   if(!result.facts.length||result.sources.some(x=>!['REAL','DERIVED'].includes(x.classification)||
      !/^https?:\/\//.test(x.sourceUrl||'')||!x.sourceTitle||!x.publicationDate))return false;
   if(result.facts.some(x=>x.evidenceIds.length!==1||!sources.has(x.evidenceIds[0])||
     x.value!==sources.get(x.evidenceIds[0]).value||x.unit!==sources.get(x.evidenceIds[0]).unit||
     x.period!==sources.get(x.evidenceIds[0]).period||
     x.geography!==sources.get(x.evidenceIds[0]).geography))return false;
   if(result.inferences.some(x=>x.verifiedConclusion!==false||x.humanReviewRequired!==true||
     !x.evidenceIds.every(id=>sources.has(id))))return false;
  }else if(result.facts.length||result.inferences.length||result.sources.length)return false;
  return true;
 }
 function createSession({respond,kind='OFFLINE'}={}){
  if(typeof respond!=='function')throw Error('ANALYSIS_RESPONDER_REQUIRED');
  if(!['OFFLINE','LIVE'].includes(kind))throw Error('ANALYSIS_KIND_INVALID');
  let current=null,pending=null,sequence=0;const history=[];
  return Object.freeze({
   get current(){return current&&clone(current)},
   get history(){return clone(history)},
   get pending(){return pending!==null},
   async send(question){
    if(pending!==null)return {status:'BUSY'};
    if(current){history.push(current);if(history.length>20)history.shift();current=null}
    const token=++sequence;pending=token;
    try{
     const response=await respond(question);
     if(pending!==token)return {status:'CANCELLED'};
     const safe=validateTurn(question,response,kind)?response:{
      question,status:kind==='LIVE'?'LIVE_RESPONSE_REJECTED':'INVALID_ANALYSIS_RESPONSE',
      facts:[],inferences:[],gaps:[],sources:[],
      simulation:kind==='OFFLINE'?'OFFLINE_FIXED_MOCK':null,providerUsed:false,
      externalRequests:kind==='LIVE'?null:0,
      notice:kind==='LIVE'
       ?'真实模式响应未通过页面校验；是否已发送请求无法由页面确认，未显示先前答案。'
       :'离线模拟响应未通过页面校验；未显示先前答案。'
     };
     current={...clone(safe),askedAt:new Date().toISOString(),sourceIds:safe.sources.map(x=>x.evidenceId)};
     return clone(current);
    }catch{
     if(pending!==token)return {status:'CANCELLED'};
     current={question,status:kind==='LIVE'?'LIVE_SERVICE_UNAVAILABLE':'SERVICE_UNAVAILABLE',
      facts:[],inferences:[],gaps:[],sources:[],
      simulation:kind==='OFFLINE'?'OFFLINE_FIXED_MOCK':null,providerUsed:false,
      externalRequests:kind==='LIVE'?null:0,
      notice:kind==='LIVE'
       ?'真实服务未返回可核验结果；请求结果可能不明，未沿用先前答案，请勿自动重试。'
       :'本地模拟服务不可用；未沿用先前答案。',
      askedAt:new Date().toISOString(),sourceIds:[]};
     return clone(current);
    }finally{if(pending===token)pending=null}
   },
   cancel(){pending=null;sequence++},
   reset(){pending=null;sequence++;current=null;history.length=0}
  });
 }
 const api=Object.freeze({createSession,validateTurn});
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.MinshengEvidenceAnalysisSession=api;
})(typeof window==='object'?window:globalThis);
