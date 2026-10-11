/* Isolated browser session for the offline evidence-analysis demo. */
(function(root) {
 'use strict';
 const clone=value=>JSON.parse(JSON.stringify(value));
 const allowed=new Set(['SIMULATED_ANALYSIS_REVIEW_REQUIRED','NO_EVIDENCE','UNSUPPORTED_QUESTION',
  'MOCK_TIMEOUT','MOCK_RATE_LIMIT','MOCK_RESPONSE_REJECTED','SOURCE_TEXT_REJECTED',
  'EVIDENCE_UNAVAILABLE','INVALID_REQUEST']);
 function validateTurn(question,result){
  if(!result||result.question!==question||!allowed.has(result.status)||
   result.simulation!=='OFFLINE_FIXED_MOCK'||result.providerUsed!==false||
   result.externalRequests!==0||!Array.isArray(result.facts)||!Array.isArray(result.inferences)||
   !Array.isArray(result.gaps)||!Array.isArray(result.sources))return false;
  const sources=new Map(result.sources.map(x=>[x.evidenceId,x]));
  if(sources.size!==result.sources.length)return false;
  if(result.status==='SIMULATED_ANALYSIS_REVIEW_REQUIRED'){
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
 function createSession({respond}={}){
  if(typeof respond!=='function')throw Error('ANALYSIS_RESPONDER_REQUIRED');
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
     const safe=validateTurn(question,response)?response:{
      question,status:'INVALID_ANALYSIS_RESPONSE',facts:[],inferences:[],gaps:[],sources:[],
      simulation:'OFFLINE_FIXED_MOCK',providerUsed:false,externalRequests:0,
      notice:'分析响应未通过页面核验，未显示先前答案。'
     };
     current={...clone(safe),askedAt:new Date().toISOString(),sourceIds:safe.sources.map(x=>x.evidenceId)};
     return clone(current);
    }catch{
     if(pending!==token)return {status:'CANCELLED'};
     current={question,status:'SERVICE_UNAVAILABLE',facts:[],inferences:[],gaps:[],sources:[],
      simulation:'OFFLINE_FIXED_MOCK',providerUsed:false,externalRequests:0,
      notice:'本地模拟服务不可用；未沿用先前答案。',askedAt:new Date().toISOString(),sourceIds:[]};
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
