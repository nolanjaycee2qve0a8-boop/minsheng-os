'use strict';
// Offline-only candidate. No routes, environment reads, sockets or external fetches.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createProvider}=require('./provider');
const {approvedEvidence,validateSelection}=require('../../modules/evidence-id-selection');
const clone=x=>JSON.parse(JSON.stringify(x));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
const GAPS=freeze([
 {id:'g_sales_land',text:'缺少获准的全国房地产活动到土地收入因果系数。',origin:'data/property-livelihood-case.js:mandatoryLimitations',basis:'NO_VALIDATED_CROSS_SECTOR_MAPPING'},
 {id:'g_net_resource',text:'土地出让毛收入不能替代净财政资源；成本、债务服务及可用资源缺口未补齐。',origin:'modules/property-livelihood-case.js:impact',basis:'GROSS_REVENUE_NOT_NET_FISCAL_RESOURCE'},
 {id:'g_public_spending',text:'本轮八条获准证据不含可用于传导计算的公共支出及响应系数。',origin:'data/property-livelihood-case.js:evidenceStatementIds',basis:'SPENDING_AND_DEBT_SERVICE_RESPONSE_UNKNOWN'},
 {id:'g_household_mapping',text:'公共支出到居民就业、收入及偿债的定量映射未校准。',origin:'modules/property-livelihood-case.js:impact',basis:'EMPLOYMENT_INCOME_MAPPING_UNCALIBRATED'},
 {id:'g_policy',text:'中央政策资源、转移支付和对冲响应未被假定或定量识别。',origin:'modules/property-livelihood-case.js:impact',basis:'POLICY_RESPONSE_NOT_ASSUMED'},
 {id:'g_causal',text:'并列观测不证明地产→地方财政→公共支出→居民的因果链；不得形成跨部门总损失。',origin:'data/property-livelihood-case.js:mandatoryLimitations',basis:'NO_VALIDATED_CROSS_SECTOR_MAPPING / NO_CROSS_SECTOR_TOTAL'}
]);
const QUESTIONS=freeze([
 ['q01','2026年上半年全国居民人均收入是多少？','income',[]],
 ['q02','2026年6月末房地产开发贷款余额是多少？','loans',[]],
 ['q03','上半年土地出让毛收入是多少？','fiscal',[]],
 ['q04','土地出让收入占比是多少？','fiscal',[]],
 ['q05','6月末法定地方政府债务余额是多少？','debt',[]],
 ['q06','土地毛收入能直接等于净财政资源吗？','fiscal',['g_net_resource']],
 ['q07','公共支出减少了多少？',null,['g_public_spending']],
 ['q08','土地收入下降会使公共支出等比例下降吗？','fiscal',['g_net_resource','g_public_spending','g_causal']],
 ['q09','房地产下降会使居民收入下降多少？','income',['g_sales_land','g_household_mapping','g_causal']],
 ['q10','能证明地产到地方财政再到居民的因果链吗？',null,['g_causal']],
 ['q11','土地收入机械下降10%的案例情景是什么？','scenario',['g_sales_land','g_net_resource']],
 ['q12','土地收入机械下降20%的案例情景是什么？','scenario',['g_sales_land','g_net_resource']],
 ['q13','能计算居民正式偿债能力吗？','limits',['g_household_mapping']],
 ['q14','能计算全国银行损失吗？','limits',['g_causal']],
 ['q15','能计算LGFV直接敞口吗？','limits',['g_causal']],
 ['q16','能把上半年流量与六月末存量相加吗？','chain',['g_causal']],
 ['q17','地方财政对公共支出传导缺什么证据？','fiscal',['g_net_resource','g_public_spending','g_policy']],
 ['q18','公共支出到居民传导缺什么证据？','income',['g_public_spending','g_household_mapping']],
 ['q19','中央转移支付会完全对冲地产下行吗？',null,['g_policy','g_causal']],
 ['q20','地产到地方财政到公共支出到居民目前支持到哪一步？','chain',GAPS.map(x=>x.id)]
].map(([id,question,topic,gapIds])=>({id,question,topic,gapIds})));
function loadQA(){
 const c={window:{}};c.window=c;
 for(const name of ['data/official-wave1-seed.js','data/official-wave2-seed.js','data/research-briefing-config.js','data/property-livelihood-case.js','modules/property-livelihood-case.js','modules/evidence-id-selection.js','modules/evidence-qa.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../..',name),'utf8'),c,{timeout:1000});
 return c.MinshengEvidenceQA;
}
function createOfflineAnalysis({simulation='NO_KEY',selectionIds=[]}={}){
 if(!['NO_KEY','SELECT','FAIL'].includes(simulation))throw Error('OFFLINE_MODE_REQUIRED');
 const ids=clone(selectionIds),qa=loadQA();
 // Every configured provider here has a closed, in-memory transport. Caller cannot supply fetch/env.
 const provider=createProvider({env:simulation==='NO_KEY'?{}:{DEEPSEEK_API_KEY:'synthetic-offline-placeholder'},fetchImpl:async()=>{
  if(simulation==='FAIL')throw Error('SYNTHETIC_PROVIDER_FAILURE');
  return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({choices:[{message:{content:JSON.stringify({ids})}}]})};
 }});
 function local(question){
  const entry=QUESTIONS.find(x=>x.question===question);
  const out={mode:'OFFLINE_CONTROLLED_ANALYSIS',question,status:entry?'LIMITED_ANALYSIS':'UNSUPPORTED_QUESTION',providerUsed:false,externalRequests:0,facts:[],assumptions:[],causalInferences:[],gaps:[],citations:[],conclusion:'不能作确定的因果结论。',boundary:'仅使用获准的本地结构化证据；情景不是事实或预测，毛收入不是净财政资源，银行样本不是全国，UNKNOWN不得补零；无已验证的跨部门总损失。'};
  if(!entry)return out;
  const topics=entry.topic==='chain'?['income','loans','fiscal','debt']:entry.topic==='scenario'?['scenario']:entry.topic?[entry.topic]:[];
  const items=new Map();
  for(const topic of topics){const q=topic==='scenario'?'情景对比':qa.TOPICS.find(x=>x.id===topic).question;const answer=qa.answer(q);if(!qa.validateAnswer(answer))throw Error('LOCAL_CITATION_CONTRACT_FAILED');for(const citation of answer.citations){if(topic==='scenario'&&citation.id!==(entry.id==='q11'?'case_MODERATE_STRESS':'case_SEVERE_STRESS'))continue;items.set(citation.id,citation)}}
  for(const item of items.values()){
   const claim={id:item.id,classification:['REAL','DERIVED'].includes(item.classification)?'FACT':item.classification==='SCENARIO'?'ASSUMPTION':'GAP',evidenceClassification:item.classification,text:item.text,evidenceIds:[item.id]};
   if(claim.classification==='FACT')out.facts.push(claim);else if(claim.classification==='ASSUMPTION')out.assumptions.push(claim);else out.gaps.push(claim);
   out.citations.push(clone(item));
  }
  for(const id of entry.gapIds){const gap=GAPS.find(x=>x.id===id);out.gaps.push({id,classification:'GAP',evidenceClassification:'UNKNOWN',text:gap.text,evidenceIds:[id]});out.citations.push({...clone(gap),classification:'GAP',sourceStatus:'REPOSITORY_CONTRACT_GAP_NOT_OFFICIAL_OBSERVATION',value:null})}
  if(entry.gapIds.includes('g_causal'))out.causalInferences.push({id:'inference_not_identified',classification:'CAUSAL_INFERENCE',status:'NOT_IDENTIFIED',certainty:'UNKNOWN',text:'现有证据不能识别该因果效应；不输出确定方向、系数或居民损失数值。',evidenceIds:['g_causal']});
  return out;
 }
 const noticeFor=status=>status==='OFFLINE_MOCK_SELECTED'?'仅为内存 mock 的 ID 选择；正文仍由本地证据重建。':status==='OFFLINE_PROVIDER_FAILED'?'离线模拟 provider 失败；已返回本地受限分析，不是模型回答。':'离线本地分析；未配置或未调用外部 provider，不是模型回答。';
 const selectableFrom=result=>result.citations.filter(x=>['REAL','DERIVED','SCENARIO'].includes(x.classification)).slice(0,8).map(x=>({id:x.id,text:x.text}));
 async function analyze(request){
  if(!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).join(',')!=='question'||typeof request.question!=='string'||request.question.length>500||/[\x00-\x1f]/.test(request.question))return {mode:'OFFLINE_CONTROLLED_ANALYSIS',status:'INVALID_REQUEST',providerUsed:false,externalRequests:0};
  const result=local(request.question),selectable=selectableFrom(result);
  let providerStatus='OFFLINE_NOT_NEEDED',selectedEvidenceIds=[];
  if(selectable.length){
   if(!provider.available)providerStatus='OFFLINE_NO_KEY';
   else try{const evidence=approvedEvidence(selectable);selectedEvidenceIds=validateSelection(await provider.select(evidence),evidence);providerStatus='OFFLINE_MOCK_SELECTED'}catch{providerStatus='OFFLINE_PROVIDER_FAILED'}
  }
  return {...result,providerStatus,selectedEvidenceIds,simulation,notice:noticeFor(providerStatus)};
 }
 function validateResult(result){
  if(!result||typeof result.question!=='string'||result.providerUsed!==false||result.externalRequests!==0)return false;
  const canonical=local(result.question);
  const selectable=selectableFrom(canonical);let status='OFFLINE_NOT_NEEDED',selected=[];
  if(selectable.length){status=simulation==='NO_KEY'?'OFFLINE_NO_KEY':'OFFLINE_PROVIDER_FAILED';if(simulation==='SELECT')try{selected=validateSelection(ids,selectable);status='OFFLINE_MOCK_SELECTED'}catch{}}
  return Object.keys(canonical).every(k=>JSON.stringify(result[k])===JSON.stringify(canonical[k]))&&result.simulation===simulation&&result.providerStatus===status&&result.notice===noticeFor(status)&&JSON.stringify(result.selectedEvidenceIds)===JSON.stringify(selected);
 }
 return Object.freeze({analyze,validateResult});
}
module.exports={createOfflineAnalysis,QUESTIONS,GAPS};
