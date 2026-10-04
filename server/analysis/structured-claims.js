'use strict';
// Local synthetic generation sandbox. No provider, key, transport or HTTP route.
const {createOfflineAnalysis,QUESTIONS}=require('./controlled-offline');
const clone=x=>JSON.parse(JSON.stringify(x));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const fail=reason=>{throw Error(reason)};
function shape(x,keys){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join('|')!==[...keys].sort().join('|'))fail('SCHEMA_INVALID')}
function list(x,min=1,max=32){if(!Array.isArray(x)||x.length<min||x.length>max||new Set(x).size!==x.length||x.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(id)))fail('REFERENCE_SCHEMA_INVALID')}
const MAPPINGS=[
 ['LEVEL',['INCOME'],'2026-H1'],['LEVEL',['DEVELOPER_LOAN'],'2026-06'],['LEVEL',['LAND_GROSS'],'2026-H1'],['SHARE',['LAND_SHARE'],'2026-H1'],['LEVEL',['LEGAL_LOCAL_DEBT'],'2026-06'],
 ['MECHANISM',['LAND_GROSS','NET_FISCAL_RESOURCE'],'2026-H1'],['LEVEL',['PUBLIC_SPENDING'],'2026-H1'],['MECHANISM',['LAND_GROSS','PUBLIC_SPENDING'],'2026-H1'],['MECHANISM',['PROPERTY_ACTIVITY','INCOME'],'2026-H1'],['CAUSAL_SUPPORT',['PROPERTY_ACTIVITY','NET_FISCAL_RESOURCE','INCOME'],'2026-H1'],
 ['SCENARIO',['LAND_GROSS'],'2026-H1','MODERATE_STRESS'],['SCENARIO',['LAND_GROSS'],'2026-H1','SEVERE_STRESS'],['GAP_REVIEW',['HOUSEHOLD_DEBT_SERVICE'],'2026-H1'],['GAP_REVIEW',['NATIONAL_BANK_LOSS'],'2026-06'],['GAP_REVIEW',['LGFV_EXPOSURE'],'2026-06'],
 ['COMPARE_BASIS',['INCOME','DEVELOPER_LOAN','LAND_GROSS','LEGAL_LOCAL_DEBT'],'2026-H1_AND_JUNE_STOCK'],['GAP_REVIEW',['NET_FISCAL_RESOURCE','PUBLIC_SPENDING'],'2026-H1'],['GAP_REVIEW',['PUBLIC_SPENDING','INCOME'],'2026-H1'],['CAUSAL_SUPPORT',['POLICY_TRANSFER','PROPERTY_ACTIVITY'],'2026-H1'],['MECHANISM',['PROPERTY_ACTIVITY','NET_FISCAL_RESOURCE','PUBLIC_SPENDING','INCOME'],'2026-H1_AND_JUNE_STOCK']
];
const CATALOG=freeze(QUESTIONS.map((q,i)=>{const [intent,metricIds,period,scenario='NONE']=MAPPINGS[i];return {id:q.id,question:q.question,summary:{intent,metricIds:[...metricIds].sort(),period,geography:'CN',scenario}}}));
function normalizeQuestion(question){const entry=CATALOG.find(x=>x.question===question);if(!entry)fail('QUESTION_NOT_NORMALIZED');return clone(entry.summary)}
function resolveSummary(input){
 shape(input,['intent','metricIds','period','geography','scenario']);list(input.metricIds,1,5);
 const summary={...input,metricIds:[...input.metricIds].sort()},entry=CATALOG.find(x=>stable(x.summary)===stable(summary));
 if(!entry)fail('SUMMARY_NOT_ALLOWED');return entry;
}
const BUDGET_EXAMPLE=freeze({remainingCalls:20,remainingMicroUsd:1000000,inputMicroUsdPerMillionTokens:1000000,outputMicroUsdPerMillionTokens:2000000,maxInputTokens:6000,maxOutputTokens:1600});
function preflight(payload,budget){
 shape(budget,Object.keys(BUDGET_EXAMPLE));
 if(Object.values(budget).some(x=>!Number.isSafeInteger(x)||x<0||x>1000000000)||budget.inputMicroUsdPerMillionTokens===0||budget.outputMicroUsdPerMillionTokens===0)fail('BUDGET_POLICY_INVALID');
 const inputTokenUpperBound=Buffer.byteLength(JSON.stringify(payload),'utf8'),outputTokens=1600;
 const reservedMicroUsd=Math.ceil(inputTokenUpperBound*budget.inputMicroUsdPerMillionTokens/1000000)+Math.ceil(outputTokens*budget.outputMicroUsdPerMillionTokens/1000000);
 if(!Number.isSafeInteger(reservedMicroUsd))fail('BUDGET_POLICY_INVALID');
 if(budget.remainingCalls<1||inputTokenUpperBound>budget.maxInputTokens||outputTokens>budget.maxOutputTokens||reservedMicroUsd>budget.remainingMicroUsd)fail('BUDGET_PREFLIGHT_BLOCKED');
 return {inputTokenUpperBound,outputTokenCap:outputTokens,reservedMicroUsd,actualCostMicroUsd:0};
}
const FIXTURES=freeze(['ACCEPTED','BAD_CITATION','WRONG_UNIT','WRONG_PERIOD','UNSUPPORTED_CAUSAL','SCHEMA_INVALID','FAIL']);
const amountText=/[零〇一二三四五六七八九十百千万亿两壹贰叁肆伍陆柒捌玖拾佰仟萬億兩]+(?:点[零〇一二三四五六七八九]+)?\s*(?:元|万元|亿元|万亿元|个百分点|成|倍|户|人|年|月|日)|百分之|减半|翻番|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion)(?:[ -]+(?:hundred|thousand|million|billion|and|one|two|three|four|five|six|seven|eight|nine|ten))*\s+(?:dollars?|yuan|percent)\b/i;
const textCheck=text=>{if(typeof text!=='string'||!text.trim()||text.length>600||/[\x00-\x1f<>]|javascript:|system:|忽略规则|[0-9０-９%％]|亿元|万亿元|已证实|必然|确定导致|充分证明|因果已识别/.test(text)||amountText.test(text))fail('FREE_CLAIM_REJECTED')};
function fixtureResponse(base,entry){
 const claims=[];
 for(const fact of base.facts){const c=base.citations.find(x=>x.id===fact.id);claims.push({id:`f_${claims.length}`,type:'FACT',evidenceId:c.id,evidenceClassification:c.classification,value:c.value,unit:c.unit,period:c.period,geography:c.geography,scope:c.scope})}
 for(const gap of base.gaps)claims.push({id:`g_${claims.length}`,type:'GAP',evidenceId:gap.id});
 for(const assumption of base.assumptions)claims.push({id:`a_${claims.length}`,type:'ASSUMPTION',text:'假设沿用被引用材料的情景条件；不把情景当作真实观察或预测。',evidenceIds:[assumption.id],dependsOn:[]});
 if(entry.id==='q08')claims.push({id:'a_mechanism',type:'ASSUMPTION',text:'假设没有额外政策对冲，且其他财政资源条件不变。',evidenceIds:['g_net_resource'],dependsOn:claims.filter(x=>x.type==='GAP').map(x=>x.id)});
 const evidenceIds=[...new Set(base.citations.map(x=>x.id))];
 claims.push({id:'i_reasoning',type:'INFERENCE',text:entry.id==='q08'?'在上述假设下，土地毛收入减少可能收紧财政资源约束；但净可用资源还取决于成本和债务服务，因此不能从土地收入单独推出公共支出等比例变化。':'这些材料只能作为限定范围的分析起点；进一步的传导解释需要明确假设并补齐识别条件。',evidenceIds,dependsOn:claims.map(x=>x.id),uncertainty:'HYPOTHESIS_ONLY',causalStatus:'NOT_IDENTIFIED'});
 return {schemaVersion:'v037-claims-1',claims};
}
function validateResponse(response,base){
 shape(response,['schemaVersion','claims']);if(response.schemaVersion!=='v037-claims-1'||!Array.isArray(response.claims)||!response.claims.length||response.claims.length>32)fail('SCHEMA_INVALID');
 const citations=new Map(base.citations.map(x=>[x.id,x])),prior=new Map(),facts=[],gaps=[],scenarios=[],validated=[];
 for(const c of response.claims){
  if(!c||!['FACT','ASSUMPTION','INFERENCE','GAP'].includes(c.type)||typeof c.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(c.id)||prior.has(c.id))fail('CLAIM_ID_OR_TYPE_INVALID');
  let out;
  if(c.type==='FACT'){
   shape(c,['id','type','evidenceId','evidenceClassification','value','unit','period','geography','scope']);const e=citations.get(c.evidenceId);
   if(!e||!['REAL','DERIVED'].includes(e.classification)||facts.includes(e.id)||!Number.isFinite(c.value)||['evidenceClassification','value','unit','period','geography','scope'].some(k=>c[k]!==e[k==='evidenceClassification'?'classification':k]))fail('FACT_BINDING_MISMATCH');
   facts.push(e.id);out={...clone(c),text:e.text,validation:'FIELD_MATCHED_TO_APPROVED_RECORD',semanticTruthVerified:false,evidenceIds:[e.id]};
  }else if(c.type==='GAP'){
   shape(c,['id','type','evidenceId']);const e=citations.get(c.evidenceId);
   if(!e||!['GAP','UNKNOWN','BLOCKED'].includes(e.classification)||gaps.includes(e.id))fail('GAP_BINDING_MISMATCH');gaps.push(e.id);
   out={...clone(c),text:e.text,value:null,validation:'KNOWN_GAP',semanticTruthVerified:false,evidenceIds:[e.id]};
  }else{
   const keys=['id','type','text','evidenceIds','dependsOn'];if(c.type==='INFERENCE')keys.push('uncertainty','causalStatus');shape(c,keys);textCheck(c.text);list(c.evidenceIds);list(c.dependsOn,c.type==='INFERENCE'?1:0);
   if(c.evidenceIds.some(id=>!citations.has(id))||c.dependsOn.some(id=>!prior.has(id)))fail('UNAUTHORIZED_OR_FORWARD_REFERENCE');
   const inherited=new Set(c.dependsOn.flatMap(id=>prior.get(id).evidenceIds));
   if(c.type==='INFERENCE'&&(c.uncertainty!=='HYPOTHESIS_ONLY'||c.causalStatus!=='NOT_IDENTIFIED'||c.evidenceIds.some(id=>!inherited.has(id))))fail('CAUSAL_OR_DEPENDENCY_INVALID');
   if(c.type==='ASSUMPTION'){if(!c.text.startsWith('假设'))fail('ASSUMPTION_LABEL_REQUIRED');scenarios.push(...c.evidenceIds.filter(id=>citations.get(id).classification==='SCENARIO'))}
   out={...clone(c),validation:'HUMAN_REVIEW_REQUIRED',semanticTruthVerified:false,displayAsVerified:false};
  }
  prior.set(c.id,out);validated.push(out);
 }
 const expectedFacts=base.facts.map(x=>x.id).sort(),expectedGaps=base.gaps.map(x=>x.id).sort(),expectedScenarios=base.assumptions.map(x=>x.id).sort();
 if(stable(facts.sort())!==stable(expectedFacts)||stable(gaps.sort())!==stable(expectedGaps)||stable([...new Set(scenarios)].sort())!==stable(expectedScenarios))fail('REQUIRED_EVIDENCE_OMITTED');
 return validated;
}
function createStructuredSandbox(){
 const local=createOfflineAnalysis();
 async function prepare(summary){const entry=resolveSummary(summary),base=await local.analyze({question:entry.question});if(!local.validateResult(base))fail('LOCAL_CITATION_GATE_FAILED');
  const evidence=base.citations.map(e=>['REAL','DERIVED'].includes(e.classification)?{id:e.id,classification:e.classification,value:e.value,unit:e.unit,period:e.period,geography:e.geography,scope:e.scope,text:e.text}:{id:e.id,classification:e.classification,text:e.text});
  return {entry,base,payload:{contractVersion:'v037-claims-1',questionSummary:clone(entry.summary),approvedEvidence:evidence}};
 }
 async function validate(summary,response){const {base}=await prepare(summary);return validateResponse(response,base)}
 async function run(summary,{fixture='ACCEPTED',budget=BUDGET_EXAMPLE}={}){
  const meta={mode:'OFFLINE_SYNTHETIC_GENERATION',providerUsed:false,externalRequests:0,actualCostMicroUsd:0,mockInvocations:0};
  let prepared,reservation;
  try{prepared=await prepare(summary);reservation=preflight(prepared.payload,budget)}catch(e){return {...meta,status:'PREFLIGHT_REJECTED',reason:e.message}}
  if(!FIXTURES.includes(fixture))return {...meta,status:'PREFLIGHT_REJECTED',reason:'OFFLINE_FIXTURE_REQUIRED'};
  const response=fixtureResponse(prepared.base,prepared.entry);meta.mockInvocations=1;
  if(fixture==='FAIL')return {...meta,status:'OFFLINE_PROVIDER_FAILED',reservation,localFallback:prepared.base};
  const fact=response.claims.find(x=>x.type==='FACT'),inference=response.claims.find(x=>x.type==='INFERENCE');
  if(fixture==='BAD_CITATION')inference.evidenceIds=['invented'];
  if(fixture==='WRONG_UNIT'){if(fact)fact.unit='fictional';else response.extra='invalid'}
  if(fixture==='WRONG_PERIOD'){if(fact)fact.period='2025';else response.extra='invalid'}
  if(fixture==='UNSUPPORTED_CAUSAL')inference.causalStatus='IDENTIFIED';
  if(fixture==='SCHEMA_INVALID')response.rawText='forbidden';
  try{return {...meta,status:'HUMAN_REVIEW_REQUIRED',summary:clone(prepared.entry.summary),reservation,claims:validateResponse(response,prepared.base),citations:clone(prepared.base.citations),localBoundary:prepared.base.boundary,notice:'固定合成响应的离线校验；不是模型实测。新增自由分析句待人工复核，引用存在不代表因果已识别。'}}catch(e){return {...meta,status:'OFFLINE_RESPONSE_REJECTED',reason:e.message,reservation,localFallback:prepared.base}}
 }
 return Object.freeze({run,validate,prepare:async summary=>{const {payload,base}=await prepare(summary);return {payload:clone(payload),localFallback:clone(base)}}});
}
module.exports={CATALOG,normalizeQuestion,preflight,BUDGET_EXAMPLE,createStructuredSandbox};
