/* Local cited answers only. No external provider, persistence or observation writes. */
window.MinshengEvidenceQA=(()=>{
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x)),selection=window.MinshengEvidenceIdSelection;
 const approvedReport=clone(window.MinshengPropertyLivelihoodCaseStudy.build());
 const approvedRecords=clone(window.MinshengDataRecords||[]),approvedDocuments=clone(window.MinshengSourceDocuments||[]);
 const TOPICS=Object.freeze([
  {id:'income',label:'居民收入',question:'2026年上半年全国居民人均收入是多少？',ids:['s_income_pc_h1','s_household_blocked'],match:/居民(?:人均)?(?:可支配)?收入|人均(?:可支配)?收入/},
  {id:'loans',label:'房地产开发贷',question:'2026年6月末房地产开发贷款余额是多少？',ids:['s_dev_loan','s_bank_scenario'],match:/房地产开发贷款|开发贷|开发商融资|房企融资/},
  {id:'fiscal',label:'土地财政',question:'上半年土地出让收入及其占比是多少？',ids:['s_land_gross','s_land_share'],match:/土地(?:使用权)?(?:出让)?(?:毛)?收入|土地出让|土地财政/},
  {id:'debt',label:'法定地方债',question:'6月末法定地方政府债务余额是多少？',ids:['s_legal_debt','s_lgfv_gap'],match:/法定地方政府债务|地方政府(?:法定)?债务|法定地方债|地方债/},
  {id:'limits',label:'缺口与情景边界',question:'能判断居民偿债、全国银行损失和LGFV敞口吗？',ids:['s_household_blocked','s_bank_scenario','s_lgfv_gap'],match:/缺口|阻断|损失|偿债|风险|lgfv|城投|因果|预测|情景|房价/}
 ]);
 TOPICS.forEach(t=>{Object.freeze(t.ids);Object.freeze(t.match);Object.freeze(t)});
 const BOUNDARY='只描述已登记证据，不证明因果。累计流量与期末存量不得拼成同一当期快照。情景不是事实或预测；毛收入不是净财政资源；银行样本不代表全国。';
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function classify(question,context=null){
  if(typeof question!=='string'||!question.trim()||question.length>500||/[\x00-\x1f]/.test(question))return {status:'INVALID_QUESTION',reason:'请输入不超过500字的单行问题。'};
  const q=question.trim().toLowerCase().replace(/\s+/g,'');
  if(/忽略|system:|assistant:|提示词|密钥|api.?key|执行代码|<|>|javascript:/.test(q))return {status:'REJECTED_INPUT',reason:'该输入要求越过证据合同，未生成答案。'};
  if(/m0|m2|社融|货币供应|存款余额|8月央行|八月央行/.test(q))return {status:'BLOCKED',reason:'该央行资料不在本轮获准问答语料内；保留具名复核人和完整时间戳缺口，不能绕过准入。'};
  const years=q.match(/(?:19|20)\d{2}/g)||[];
  if(years.some(y=>y!=='2026')||/(?:19|20)\d{2}[-/]\d|年末|年底|时间不明|时间未知|未知时间|最新|实时|今天|现在|明年|去年|今年以来|下半年|全年|季度|单季|跨年|趋势|同比|环比|7月|8月|9月|10月|11月|12月|七月|八月|九月|十月|十一月|十二月/.test(q))return {status:'TIME_MISMATCH',reason:'没有该时间或比较口径的已审查证据，不能判断。本轮仅覆盖已登记的上半年累计量和六月末存量。'};
  if(/北京|天津|上海|重庆|杭州|浙江|江苏|广东|深圳|四川|山东|湖北|湖南|福建|安徽|江西|河南|河北|山西|陕西|甘肃|青海|贵州|云南|广西|海南|辽宁|吉林|黑龙江|内蒙古|新疆|西藏|宁夏|香港|澳门|台湾|城市|省份|某省|城镇|农村|某银行|某行|美国|日本|欧洲/.test(q))return {status:'SCOPE_MISMATCH',reason:'没有该地域或机构范围的已审查证据，不能用全国量替代。'};
  if(!/上半年|h1|1[—-]6月/.test(q)&&(/(?:\d{1,2}|一|二|三|四|五|六)月.*收入/.test(q)||/(?:[1-5]|一|二|三|四|五)月/.test(q)))return {status:'TIME_MISMATCH',reason:'没有该单月口径的合格证据，不能把半年累计量拆成单月。'};
  const limit=TOPICS.find(t=>t.id==='limits'),matched=limit.match.test(q)?[limit]:TOPICS.filter(t=>t.id!=='limits'&&t.match.test(q));
  if(matched.length>1&&!/和|与|及|、|对比/.test(q))return {status:'UNSUPPORTED_QUESTION',reason:'不同指标必须明确分别询问，不能把指标串接成新范围。'};
  // A closed vocabulary prevents a new geography, device or adjacent measure being silently substituted.
  const residual=q.replace(/居民正式债务服务计算|房地产开发贷款(?:余额)?|开发贷款(?:余额)?|开发贷(?:余额)?|开发商融资|房企融资|居民(?:人均)?(?:可支配)?收入|人均(?:可支配)?收入|国有土地使用权出让收入|土地(?:使用权)?(?:出让)?(?:毛)?收入|土地出让|土地财政|法定地方政府债务(?:余额)?|地方政府(?:法定)?债务(?:余额)?|法定地方债|地方债|地方政府性基金本级收入|全国银行损失|银行损失|lgfv敞口|lgfv|城投|居民偿债|偿债|房地产下行|研究缺口|阻断项|缺口|阻断|因果|情景|对比|预测|风险|房价|损失|敞口|2026年?|上半年|h1|1[—-]6月|6月末|六月末|6月|六月|全国|中国|能判断|不能判断|可以判断|能证明|能说明|有哪些|是什么|是多少|多少|能|不能|如何|为什么|说明|导致|还有|及其|及|和|与|的|那|这个|它|来源|出处|单位|口径|限制|占比|比重|情况|吗|呢|请|问|[？?，,、。；;：:]/g,'');
  if(residual)return {status:'UNSUPPORTED_QUESTION',reason:'问题包含本轮合同外的范围、对象或指标，不能用相邻证据替代。'};
  const followup=!matched.length&&/^(?:那|这个|它)?(?:的)?(?:来源|出处|单位|口径|限制|为什么|能说明)(?:(?:和|与)(?:来源|出处|单位|口径|限制))*(?:是什么|有哪些|呢|吗)?[？?]*$/.test(q)&&context&&TOPICS.some(t=>t.id===context.topicId);
  const topics=followup?[TOPICS.find(t=>t.id===context.topicId)]:matched;
  if(!topics.length)return {status:'UNSUPPORTED_QUESTION',reason:'没有可匹配的已审查证据，不能判断。可选择下方五类问题。'};
  const half=/上半年|h1|1[—-]6月/.test(q),month=/(\d{1,2}|一|二|三|四|五|六)月/.test(q.replace(/1[—-]6月/g,''));
  if(month&&!half&&(topics.some(t=>['income','fiscal'].includes(t.id))||!/6月|六月/.test(q)))return {status:'TIME_MISMATCH',reason:'没有该单月口径的合格证据，不能把半年累计量拆成单月。'};
  return {status:'MATCHED',topicIds:topics.map(t=>t.id),ids:[...new Set(topics.flatMap(t=>t.ids))],followup,period:'2026-H1 / 2026-06',geography:'CN',scenario:/情景/.test(q),explicitHalf:/上半年|h1|1[—-]6月/.test(q),explicitJune:/6月|六月/.test(q)};
 }
 function defaultSnapshot(){
  const state=typeof data!=='undefined'?data:null;
  return {report:clone(approvedReport),records:state?.records||window.MinshengDataRecords||[],documents:state?.sourceDocuments||window.MinshengSourceDocuments||[]};
 }
 function corpus(snapshot=defaultSnapshot()){
  const report=snapshot.report,records=snapshot.records||[],documents=snapshot.documents||[];
  return (report.evidence||[]).map(item=>{
   const evidence=clone(item),issues=[],refs=[];
   const canonical=approvedReport.evidence.find(x=>x.statementId===item.statementId);
   if(!canonical||JSON.stringify(item)!==JSON.stringify(canonical))issues.push('STATEMENT_CONTRACT_CONFLICT');
   if(report.evidence.filter(x=>x.statementId===item.statementId).length!==1)issues.push('CONFLICTING_STATEMENTS');
   if(['REAL','DERIVED'].includes(item.classification)){
    if(!item.sourceRecordIds?.length)issues.push('MISSING_RECORD_REFERENCE');
    for(const id of item.sourceRecordIds||[]){
     const found=records.filter(r=>r.id===id);if(found.length!==1){issues.push(found.length?'CONFLICTING_RECORDS':'MISSING_RECORD');continue}
     const record=found[0];refs.push(record);
     const original=approvedRecords.find(r=>r.id===id);
     if(!original||['value','unit','period','periodStart','periodEnd','geography','sectorScope','sourceDocumentId'].some(k=>record[k]===undefined||record[k]!==original[k]))issues.push('RECORD_CONTRACT_CONFLICT');
     if(original&&['asOf','releaseDate','provenance'].some(k=>JSON.stringify(record[k])!==JSON.stringify(original[k])))issues.push('RECORD_CONTRACT_CONFLICT');
     if(record.fixture===true||record.provenance?.fixture===true||record.status!=='REAL'||record.qualification==='BLOCKED')issues.push('UNQUALIFIED_RECORD');
     if(record.stale===true||record.status==='STALE'||record.staleStatus==='STALE'||(record.qualityFlags||[]).includes('STALE')||(record.revision??0)!==0)issues.push('STALE');
     if(record.period!==item.period||record.geography!==item.geography)issues.push('SCOPE_PERIOD_CONFLICT');
     const docs=documents.filter(d=>d.id===record.sourceDocumentId),doc=docs[0];
     const originalDoc=approvedDocuments.find(d=>d.id===record.sourceDocumentId);
     if(!originalDoc||!doc||['originalUrl','dataPeriodStart','dataPeriodEnd'].some(k=>doc[k]===undefined||doc[k]!==originalDoc[k]))issues.push('SOURCE_TIME_BINDING_CONFLICT');
     if(originalDoc&&doc&&['asOf','publicationDate','checksum'].some(k=>JSON.stringify(doc[k])!==JSON.stringify(originalDoc[k])))issues.push('SOURCE_TIME_BINDING_CONFLICT');
     if(docs.length!==1||!doc||doc.fixture===true||doc.status!=='REAL_SOURCE'||!/^https?:\/\//.test(doc.originalUrl||'')||!record.provenance?.locator)issues.push('MISSING_OR_CONFLICTING_SOURCE');
     if(doc?.stale===true)issues.push('STALE');
    }
    if(item.classification==='REAL'&&refs.length===1&&(refs[0].value!==item.value||refs[0].unit!==item.unit||refs[0].sectorScope!==item.scope))issues.push('VALUE_OR_UNIT_CONFLICT');
    if(item.classification==='DERIVED'&&(refs.length!==2||refs.some(r=>r.unit!=='亿元')||refs[1]?.value<=0||Math.round(refs[0]?.value/refs[1]?.value*10000)/100!==item.value||item.unit!=='%'))issues.push('DERIVATION_CONFLICT');
    if(!item.sourceLinks?.length||item.sourceLinks.some(s=>!documents.some(d=>d.id===s.documentId&&d.originalUrl===s.url)))issues.push('MISSING_CITATION');
   }
   evidence.id=item.statementId;evidence.issues=[...new Set(issues)];
   evidence.status=issues.length?'BLOCKED':item.classification;
   evidence.text=issues.length?`${item.subject}：不能判断；证据 ${evidence.issues.join(' / ')}。`:
    `${item.classification} · ${item.subject}：${item.value??item.qualification}${item.unit||''}；${item.periodLabel}，${item.temporalBasis}，${item.geographyLabel}。${(item.limitations||[]).join(' ')}`;
   return evidence;
  });
 }
 function answer(question,context=null,options={}){
  const match=classify(question,context),result={mode:'LOCAL_CITED_DETERMINISTIC',status:match.status,question,claims:[],citations:[],diagnostics:[],boundary:BOUNDARY,context:null,providerUsed:false};
  if(match.status!=='MATCHED')return {...result,notice:match.reason};
  const snapshot=options.snapshot||defaultSnapshot(),all=corpus(snapshot),candidates=all.filter(x=>match.ids.includes(x.id));
  for(const id of match.ids)if(!candidates.some(x=>x.id===id))result.diagnostics.push({id,status:'MISSING_EVIDENCE'});
  const eligible=candidates.filter(x=>!x.issues.length&&!['UNKNOWN','BLOCKED'].includes(x.classification));
  result.diagnostics.push(...candidates.filter(x=>x.issues.length||['UNKNOWN','BLOCKED'].includes(x.classification)).map(x=>({id:x.id,status:x.status,reasons:x.issues.length?x.issues:x.blockedReasons||x.limitations})));
  const ids=own(options,'selectedIds')?options.selectedIds:eligible.map(x=>x.id);
  if(eligible.length){try{selection.validateSelection(ids,eligible.map(x=>({id:x.id,text:x.text})))}catch{return {...result,status:'INVALID_CITATION',notice:'答案引用不属于当前合格证据集合，已拒绝展示。'}}}
  else if(own(options,'selectedIds')&&ids?.length)return {...result,status:'INVALID_CITATION',notice:'没有可授权的数值证据，引用已拒绝。'};
  const chosen=eligible.filter(x=>ids.includes(x.id)),gaps=candidates.filter(x=>!x.issues.length&&['UNKNOWN','BLOCKED'].includes(x.classification));
  for(const item of [...chosen,...gaps]){result.claims.push({text:item.text,evidenceIds:[item.id],classification:item.classification});result.citations.push(item)}
  // Scenario arithmetic is sourced solely from the immutable accepted case, never elevated to REAL.
  if(match.scenario){
   const land=all.find(x=>x.id==='s_land_gross');
   if(land&&!land.issues.length&&JSON.stringify(snapshot.report.scenarios)===JSON.stringify(approvedReport.scenarios)){for(const s of snapshot.report.scenarios||[]){const local=s.impacts.find(x=>x.sectorId==='LOCAL_GOVERNMENT'),id=`case_${s.id}`;if(s.classification!=='SCENARIO'||local?.classification!=='SCENARIO'||![0,-0.1,-0.2].includes(s.grossLandRevenueShock)||local.value!==Math.round(land.value*(1+s.grossLandRevenueShock)*100)/100){result.diagnostics.push({id,status:'SCENARIO_CONTRACT_CONFLICT'});continue}const text=`SCENARIO · ${s.label}：土地出让毛收入 ${local.value} ${local.unit}；机械假设 ${s.grossLandRevenueShock*100}%；不是预测或净财政资源。`;result.claims.push({text,classification:'SCENARIO',evidenceIds:[id]});result.citations.push({...clone(land),id,classification:'SCENARIO',text,formula:local.formula,sourceRecordIds:[land.sourceRecordIds[0]],sourceStatus:'ACCEPTED_CASE_SCENARIO_NOT_OBSERVATION'})}}
   else if(land&&!land.issues.length)result.diagnostics.push({id:'case',status:'SCENARIO_CONTRACT_CONFLICT'});
   else result.diagnostics.push({id:'s_land_gross',status:'SCENARIO_BASE_UNAVAILABLE'});
  }
  result.status=result.diagnostics.length?'ANSWER_WITH_GAPS':result.claims.length?'ANSWERED':'NO_EVIDENCE';
  result.notice=result.diagnostics.length?'存在缺口/STALE/冲突，相关问题不能判断；已排除相应数值。':'答案由现有证据确定性重建，未使用模型生成。';
  if(match.explicitHalf&&chosen.some(x=>x.temporalBasis==='期末存量'))result.notice+=' 问题提到半年，但余额证据仅为六月末存量。';
  if(match.explicitJune&&chosen.some(x=>x.temporalBasis.includes('累计')))result.notice+=' 问题提到六月，但收入证据仅为上半年累计量，不能拆成单月。';
  result.context={topicId:match.topicIds[0]};
  return result;
 }
 function validateAnswer(result,expectedContext=null){
  if(!result||!Array.isArray(result.claims)||!Array.isArray(result.citations))return false;
  if(result.mode!=='LOCAL_CITED_DETERMINISTIC'||result.providerUsed!==false)return false;
  const canonical=answer(result.question,expectedContext),authorized=new Map(canonical.citations.map(x=>[x.id,x]));
  if(['claims','citations'].some(k=>JSON.stringify(result[k])!==JSON.stringify(canonical[k])))return false;
  if(['status','notice','boundary','context','diagnostics'].some(k=>JSON.stringify(result[k])!==JSON.stringify(canonical[k])))return false;
  if(result.citations.some(x=>!authorized.has(x.id)||JSON.stringify(x)!==JSON.stringify(authorized.get(x.id))))return false;
  const ids=new Set(result.citations.map(x=>x.id));
  return ids.size===result.citations.length&&result.claims.every(x=>{if(!Array.isArray(x.evidenceIds)||x.evidenceIds.length!==1||!ids.has(x.evidenceIds[0]))return false;const cited=result.citations.find(c=>c.id===x.evidenceIds[0]);return x.text===cited.text&&x.classification===cited.classification});
 }
 function createSession({respond=answer}={}){
  let context=null,pending=null,sequence=0;const history=[];
  return {get history(){return clone(history)},get pending(){return !!pending},get context(){return clone(context)},
   async send(question){
    if(pending)return {status:'BUSY',notice:'已有问题处理中，请等待或取消。'};
    const token=++sequence,priorContext=clone(context);pending=token;
    try{const response=await respond(question,clone(priorContext));if(pending!==token)return {status:'CANCELLED'};
     if(response?.question!==question||!validateAnswer(response,priorContext))return {status:'INVALID_CITATION',notice:'答案引用校验失败，已拒绝。'};
     if(response.context)context=response.context;history.push(clone(response));if(history.length>20)history.shift();return clone(response);
    }catch{return pending!==token?{status:'CANCELLED'}:{status:'ERROR',notice:'证据不可用，未生成判断。'}}finally{if(pending===token)pending=null}
   },cancel(){pending=null;sequence++},reset(){pending=null;sequence++;context=null;history.length=0}
  };
 }
 return {TOPICS,classify,corpus,answer,validateAnswer,createSession};
})();
