/* Separate offline mock analysis workspace. The cited QA route remains unchanged. */
window.MinshengEvidenceAnalysisWorkspace=(()=>{
 'use strict';
 const route='#qa/analysis-offline',initialRoute=typeof location!=='undefined'&&location.hash===route;
 const questions=[
  '2026年上半年全国居民人均收入是多少？',
  '2026年6月末房地产开发贷款余额是多少？',
  '上半年土地出让毛收入是多少？',
  '6月末法定地方政府债务余额是多少？',
  '能计算居民正式偿债能力吗？'
 ];
 const evaluationCases=[
  ['C01','同口径两期差额与增长率'],['C02','时期不一致'],['C03','地区不一致'],
  ['C04','单位不一致'],['C05','统计定义不一致'],['C06','分母为零'],
  ['C07','关键值缺失'],['C08','来源冲突'],['C09','混合无关子题'],
  ['C10','来源夹带指令'],['C11','相关不等于因果']
 ];
 const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
 const offlineSession=window.MinshengEvidenceAnalysisSession.createSession({respond:async question=>{
  const response=await fetch('/api/analysis/offline',{method:'POST',credentials:'omit',cache:'no-store',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});
  if(!response.ok)throw Error('LOCAL_SERVICE_UNAVAILABLE');
  return response.json();
 }});
 const liveSession=window.MinshengEvidenceAnalysisSession.createSession({kind:'LIVE',respond:async question=>{
  const response=await fetch('/api/analysis/live',{method:'POST',credentials:'omit',cache:'no-store',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});
  if(response.status===403)return {question,status:'EXTERNAL_CALL_NOT_AUTHORIZED',
   facts:[],inferences:[],gaps:[],sources:[],providerUsed:false,externalRequests:0,
   notice:'真实请求尚未获单次授权；没有调用 DeepSeek，也没有沿用旧答案。'};
  if(!response.ok)throw Error('LIVE_SERVICE_UNAVAILABLE');
  return response.json();
 }});
 const liveQuestion='2026年上半年全国居民人均可支配收入是多少？';
 let mode='OFFLINE',session=offlineSession;
 let draft='',notice='',generation=0,lastSubmission={question:'',at:0};
 let evaluationCurrent=null,evaluationPending=false,evaluationToken=0;
 const evaluationHistory=[];
 const host=()=>document.getElementById('researchCockpitRoot');
 const clearEvaluation=()=>{evaluationToken++;evaluationCurrent=null;
  evaluationPending=false;evaluationHistory.length=0};
 const leave=()=>{session.cancel();generation++;clearEvaluation()};
 function sourceHtml(source,turn,index){
  const id='analysis-citation-'+turn+'-'+index;
  const link=source.sourceUrl&&/^https?:\/\//.test(source.sourceUrl)
   ?'<a href="'+escape(source.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+escape(source.sourceTitle)+'</a>'
   :escape(source.sourceTitle||'无公开原文链接');
  return '<li id="'+id+'" tabindex="-1"><b>'+escape(source.evidenceId)+' · '+escape(source.classification)+'</b>'+
   '<p>'+escape(source.excerpt)+'</p><p>'+link+' · 发布：'+escape(source.publicationDate||'未登记')+
   ' · 事件区间：'+escape(source.eventStart||'未登记')+' 至 '+escape(source.eventEnd||'未登记')+'</p>'+
   '<p>时间口径：'+escape(source.period)+' · 地区：'+escape(source.geography)+
   ' · 单位：'+escape(source.unit)+' · 来源状态：'+escape(source.sourceStatus)+'</p></li>';
 }
 function links(ids,sources,turn){
  return ids.map(id=>{const index=sources.findIndex(x=>x.evidenceId===id);
   return index<0?'': ' <a href="#analysis-citation-'+turn+'-'+index+'" data-analysis-cite="analysis-citation-'+turn+'-'+index+'">['+escape(id)+']</a>';
  }).join('');
 }
 const liveFailureStatuses=new Set(['EXTERNAL_CALL_NOT_AUTHORIZED','ONE_CALL_AUTHORIZATION_MISSING',
  'DAILY_BUDGET_EXHAUSTED','PRICE_UNKNOWN','LEDGER_CORRUPT','LEDGER_LOCKED',
  'AUTHENTICATION_FAILED','RATE_LIMITED','PROVIDER_FAILURE','MALFORMED_RESPONSE',
  'TIMEOUT_OUTCOME_UNKNOWN','NETWORK_OUTCOME_UNKNOWN','OUTPUT_REJECTED',
  'BUDGET_EXHAUSTED','DUPLICATE_SUBMISSION','EVIDENCE_PREFLIGHT_REJECTED',
  'LEDGER_OVERAGE_REVIEW_REQUIRED','BUDGET_ACCOUNTING_EXCEEDED',
  'LEDGER_OVERAGE_RECORD_FAILED','CREDENTIAL_UNAVAILABLE','RESPONSE_LIMIT_EXCEEDED',
  'INPUT_LIMIT_EXCEEDED','LEDGER_REJECTED','QUESTION_NOT_APPROVED']);
 function resultPresentation(result){
  if(result.status==='REAL_API_VALIDATED'&&result.providerUsed===true&&
     result.transport==='REAL_API'&&result.validationStatus==='EXISTING_CHAIN_PASSED')
   return {badge:'真实 DeepSeek API · 已通过证据校验',
    basis:'依据已登记的公开结构化证据和通过本地校验的真实 API 响应；本地原网页未重新核验，推断仍待人工审核。',
    inferenceHeading:'推断（真实 API，待人工审核）'};
  if(result.status==='SIMULATED_ANALYSIS_REVIEW_REQUIRED'&&
     result.simulation==='OFFLINE_FIXED_MOCK'&&result.providerUsed===false)
   return {badge:'固定离线模拟，非 DeepSeek 实测',basis:result.analysisBasis||'',
    inferenceHeading:'推断（模拟，待人工审核）'};
  if(result.status==='SIMULATED_GATE_VALIDATED'&&
     result.simulation==='SIMULATED_HTTP_ONLY'&&result.providerUsed===false)
   return {badge:'模拟传输，非真实 API',
    basis:'服务端模拟传输通过本地证据校验；没有调用 DeepSeek。本地原网页未重新核验，推断仍待人工审核。',
    inferenceHeading:'推断（模拟，待人工审核）'};
  if(result.status==='LIVE_RESPONSE_REJECTED'||result.status==='OUTPUT_REJECTED'||
     result.status==='MALFORMED_RESPONSE')
   return {badge:'真实模式响应校验失败 · 无可信结论',
    basis:'响应未通过格式或证据校验，不展示为已确认分析；本地原网页未重新核验。'};
  if(result.status==='LIVE_SERVICE_UNAVAILABLE'||liveFailureStatuses.has(result.status))
   return {badge:'真实请求失败或未获授权 · 无已校验结果',
    basis:'真实模式未取得通过校验的答案；发送状态以本条记录为准，结果不明时不得自动重试。'};
  return {badge:'离线模拟失败或无合格证据 · 无真实 API 结果',basis:''};
 }
 function turnHtml(result,turn){
  const sources=result.sources||[];
  const presentation=resultPresentation(result);
  return '<article class="panel analysis-turn"><h3>提问：'+escape(result.question)+'</h3>'+
   '<p>提问时间：'+escape(result.askedAt)+' · 来源：'+escape((result.sourceIds||[]).join('、')||'无合格来源')+'</p>'+
   '<p><b>'+escape(result.status)+'</b> · '+presentation.badge+'</p>'+
   (result.status==='REAL_API_VALIDATED'
    ?'<p>运行标记：REAL_API · 模型：'+escape(result.model)+' · 证据版本：'+escape(result.evidenceVersion)+
     ' · 校验：'+escape(result.validationStatus)+' · 用量：'+escape(JSON.stringify(result.usage))+'</p>'
    :'<p>运行标记：'+escape(result.simulation||'NO_REAL_RESULT')+' · 模型：'+escape(result.providerUsed?'deepseek-flash':'无')+
      ' · 证据契约：v037-claims-1 · 外部调用：'+escape(result.externalRequests??'未知')+
      ' · API 用量：'+(result.providerUsed||result.externalRequests==null?'未知（额度可能保留）':'0')+
      '。模拟或失败结果不得标为实测。</p>')+
   '<p>'+escape(result.notice)+'</p>'+
   (presentation.basis?'<h4>分析依据</h4><p>'+escape(presentation.basis)+'</p>':'')+
   (result.facts?.length?'<h4>证据事实（字段已核对）</h4>'+result.facts.map(f=>'<p>'+escape(f.text)+links(f.evidenceIds,sources,turn)+'</p>').join(''):'')+
   (result.inferences?.length?'<h4>'+presentation.inferenceHeading+'</h4>'+result.inferences.map(i=>'<p>'+escape(i.text)+
    ' · '+escape(i.uncertainty)+links(i.evidenceIds,sources,turn)+'</p>').join(''):'')+
   (result.gaps?.length?'<h4>缺口</h4><ul>'+result.gaps.map(g=>'<li>'+escape(g.text)+'</li>').join('')+'</ul>':'')+
   (sources.length?'<details open><summary>可核验引用</summary><ul>'+sources.map((s,i)=>sourceHtml(s,turn,i)).join('')+
    '</ul><p>原文链接保留；浏览器若拒绝连接，不能声称已核对网页原文。</p></details>':'')+
   '<p>'+escape(result.boundary)+'</p></article>';
 }
 function validateEvaluationResult(result,caseId){
  if(!result||result.caseId!==caseId||result.schemaVersion!=='v041-synthetic-1'||
     result.simulation!=='TEST_SYNTHETIC'||result.providerUsed!==false||
     result.externalRequests!==0||!Array.isArray(result.evidence)||
     !Array.isArray(result.facts)||!Array.isArray(result.inferences)||
     !Array.isArray(result.gaps))return false;
  if(result.evidence.some(item=>item.classification!=='TEST_SYNTHETIC'||
      item.sourceUrl!==null||!item.evidenceId||!item.period||!item.unit||
      !item.sourceTitle||!item.publicationDate))return false;
  if(result.status==='CALCULATED'){
   const [a,b]=result.evidence,c=result.calculation;
   return result.evidence.length===2&&result.facts.length===2&&c&&
    c.type==='MECHANICAL_CALCULATION'&&c.sourceClaim===false&&
    c.validation==='DETERMINISTIC_RECOMPUTED'&&a.value!==0&&
    a.unit===b.unit&&a.geography===b.geography&&a.definition===b.definition&&
    a.period==='2024-H1'&&b.period==='2025-H1'&&
    c.earlierPeriod===a.period&&c.laterPeriod===b.period&&c.unit===a.unit&&
    c.difference===b.value-a.value&&c.growthPercent===(b.value-a.value)/a.value*100&&
    c.differenceFormula==='('+b.value+' − '+a.value+') = '+c.difference+' '+a.unit&&
    c.growthFormula==='('+b.value+' − '+a.value+') / '+a.value+' × 100 = '+c.growthPercent+'%'&&
    JSON.stringify(c.inputEvidenceIds)===JSON.stringify([a.evidenceId,b.evidenceId])&&
    result.facts.every((f,i)=>f.evidenceId===result.evidence[i].evidenceId&&
     f.value===result.evidence[i].value&&f.unit===result.evidence[i].unit&&
     f.period===result.evidence[i].period);
  }
  return ['INCOMPARABLE_PERIOD','INCOMPARABLE_GEOGRAPHY','INCOMPARABLE_UNIT',
   'INCOMPARABLE_DEFINITION','ZERO_DENOMINATOR','MISSING_INPUT','SOURCE_CONFLICT',
   'MIXED_SCOPE_REJECTED','SOURCE_INSTRUCTION_REJECTED','OFFLINE_SERVICE_FAILURE',
   'MOCK_RESPONSE_REJECTED'].includes(result.status)&&result.facts.length===0&&
   result.calculation===null&&result.inferences.length===0;
 }
 function evaluationHtml(result){
  const evidence=result.evidence||[];
  return '<article class="panel" data-eval-result><h3>'+escape(result.caseId)+' · '+escape(result.question)+'</h3>'+
   '<p><b>'+escape(result.status)+'</b> · TEST_SYNTHETIC · 外部调用 0；非真实业务数据。</p>'+
   '<p>'+escape(result.notice||'')+'</p>'+
   (evidence.length?'<h4>输入证据（合成）</h4><ul>'+evidence.map(item=>
    '<li>'+escape(item.evidenceId)+' · '+escape(item.sourceTitle)+' · '+escape(item.period)+
    ' · '+escape(item.geography)+' · '+escape(item.definition)+' · '+
    escape(item.value===null?'缺失':item.value)+' '+escape(item.unit)+
    ' · 发布：'+escape(item.publicationDate)+' · 事件：'+escape(item.eventStart)+
    ' 至 '+escape(item.eventEnd)+'</li>').join('')+'</ul>':'')+
   (result.facts?.length?'<h4>合成输入事实</h4><p>'+result.facts.map(item=>
    escape(item.evidenceId)+' = '+escape(item.value)+' '+escape(item.unit)+'（'+escape(item.period)+'）').join('；')+'</p>':'')+
   (result.calculation?'<h4>机械计算（不是原文引用）</h4><p>差额：'+
    escape(result.calculation.differenceFormula)+'</p><p>增长率：'+
    escape(result.calculation.growthFormula)+'</p><p>计算依据：'+
    escape(result.calculation.inputEvidenceIds.join('、'))+'</p>':'')+
   (result.inferences?.length?'<h4>假设推断（待人工审核）</h4>'+result.inferences.map(item=>
    '<p>'+escape(item.text)+' · '+escape(item.causalStatus)+'</p>').join(''):'')+
   (result.gaps?.length?'<h4>缺口／拒答原因</h4><ul>'+result.gaps.map(item=>
    '<li>'+escape(item)+'</li>').join('')+'</ul>':'')+'</article>';
 }
 function evaluationPanel(){
  if(mode!=='OFFLINE')return '';
  return '<section class="panel" aria-label="合成离线能力评测"><h2>受限分析能力评测（仅合成）</h2>'+
   '<p>固定题与合成证据独立于真实业务库；不调用 DeepSeek。计算由程序完成，不能把计算值当原文事实。</p>'+
   '<div>'+evaluationCases.map(([id,label])=>'<button type="button" data-eval-case="'+id+'">'+
    escape(id+' '+label)+'</button>').join(' ')+'</div><p role="status" data-eval-status>'+
   (evaluationPending?'正在校验固定合成题；先前结果不再作为当前结果。':'')+'</p>'+
   '<section aria-label="当前合成评测">'+(evaluationCurrent?evaluationHtml(evaluationCurrent):
    '<p>尚未运行合成评测。</p>')+'</section><details data-eval-history><summary>合成评测历史（'+
    evaluationHistory.length+'）</summary>'+evaluationHistory.map(evaluationHtml).join('')+'</details></section>';
 }
 function render(){
  const root=host();if(!root)return;
  const current=session.current,history=session.history;
  root.innerHTML='<section class="research-cockpit"><div class="view-intro"><p class="eyebrow">EVIDENCE ANALYSIS · '+(mode==='LIVE'?'LIVE GATED':'OFFLINE MOCK')+'</p>'+
   '<h1>基于证据的分析（'+(mode==='LIVE'?'真实 API 闸门':'离线模拟')+'）</h1><p>只接受已登记的全国结构化证据。真实模式需本地单次授权；无授权不发送。模拟响应不代表 DeepSeek 已接通。</p></div>'+
   '<section class="panel"><form id="offlineAnalysisForm"><label for="offlineAnalysisQuestion">分析问题（单行，最多500字）</label>'+
   '<input id="offlineAnalysisQuestion" maxlength="500" autocomplete="off" value="'+escape(draft)+'" style="width:100%;padding:12px;margin:12px 0">'+
   '<button type="submit" '+(session.pending?'disabled':'')+'>发送</button> <button type="button" data-analysis-cancel '+(session.pending?'':'disabled')+
   '>取消</button> <button type="button" data-analysis-reset>新对话</button> <button type="button" data-analysis-back>返回有证据问答</button></form>'+
   '<p role="status" aria-live="polite" data-analysis-status>'+escape(notice)+'</p>'+
   '<p>请求入口：'+(mode==='LIVE'?'真实 API（未授权时拒发）':'固定离线模拟')+'。每条答案的模式以其实际结果标识为准；本入口不含闲聊、算术、实时采集或历史预测。'+
   (mode==='OFFLINE'?'下方独立合成评测仅做确定性机械计算。':'合成评测只在离线模式展示。')+'</p>'+
   '<button type="button" data-analysis-mode>切换到'+(mode==='LIVE'?'离线模拟':'真实 API 闸门')+'</button>'+
   '<div aria-label="离线分析示例">'+(mode==='LIVE'?[liveQuestion]:questions).map((q,i)=>'<button type="button" data-analysis-example="'+i+'">'+escape(q)+'</button>').join(' ')+'</div></section>'+
   '<section aria-label="当前分析"><h2>当前分析</h2>'+(session.pending?'<p>正在处理本题响应；先前答案已移入历史。</p>':
    current?turnHtml(current,history.length):'<p>尚无分析。</p>')+'</section>'+
   '<details data-analysis-history><summary>历史记录（'+history.length+'）</summary>'+
   history.map((item,i)=>turnHtml(item,i)).join('')+'</details>'+evaluationPanel()+'</section>';
  const input=root.querySelector('#offlineAnalysisQuestion');input.oninput=()=>{draft=input.value};
  root.querySelector('#offlineAnalysisForm').onsubmit=async event=>{
   event.preventDefault();if(session.pending)return;draft=input.value;
   const question=draft,now=Date.now();
   if(lastSubmission.question===question&&now-lastSubmission.at<750){
    notice='已拦截重复点击；稍后可主动重新分析。';root.querySelector('[data-analysis-status]').textContent=notice;return;
   }
   lastSubmission={question,at:now};const token=++generation;
   const promise=session.send(question);notice=mode==='LIVE'?'正在检查单次授权与证据…':'正在校验本地模拟响应…';render();
   const result=await promise;if(token!==generation||location.hash!==route)return;
   notice=result.notice||result.status;render();
  };
  root.querySelector('[data-analysis-cancel]').onclick=()=>{session.cancel();generation++;notice='已取消；本题未沿用旧答案。';render()};
  root.querySelector('[data-analysis-reset]').onclick=()=>{session.reset();generation++;clearEvaluation();draft='';lastSubmission={question:'',at:0};notice='新对话已开始。';render()};
  root.querySelector('[data-analysis-mode]').onclick=()=>{session.cancel();session.reset();generation++;
   clearEvaluation();
   mode=mode==='LIVE'?'OFFLINE':'LIVE';session=mode==='LIVE'?liveSession:offlineSession;
   session.reset();draft='';lastSubmission={question:'',at:0};
   notice=mode==='LIVE'?'真实模式仅在本地单次授权后发送；目前默认拒发。':'已切回固定离线模拟。';render()};
  root.querySelector('[data-analysis-back]').onclick=()=>{leave();location.hash='#qa/evidence'};
  root.querySelectorAll('[data-analysis-example]').forEach(button=>button.onclick=()=>{draft=(mode==='LIVE'?[liveQuestion]:questions)[Number(button.dataset.analysisExample)];input.value=draft;input.focus()});
  root.querySelectorAll('[data-analysis-cite]').forEach(link=>link.onclick=event=>{event.preventDefault();
   const target=document.getElementById(link.dataset.analysisCite);target?.scrollIntoView({block:'center'});target?.focus({preventScroll:true})});
  root.querySelectorAll('[data-eval-case]').forEach(button=>button.onclick=async()=>{
   if(evaluationPending)return;
   const caseId=button.dataset.evalCase;
   if(!evaluationCases.some(item=>item[0]===caseId))return;
   if(evaluationCurrent){evaluationHistory.push(evaluationCurrent);if(evaluationHistory.length>20)evaluationHistory.shift()}
   evaluationCurrent=null;evaluationPending=true;const token=++evaluationToken;render();
   try{
    const response=await fetch('/api/analysis/evaluation',{method:'POST',credentials:'omit',
     cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseId})});
    if(!response.ok)throw Error('SYNTHETIC_EVALUATION_UNAVAILABLE');
    const result=await response.json();
    if(token!==evaluationToken)return;
    evaluationCurrent=validateEvaluationResult(result,caseId)?result:{
     caseId,question:'固定合成题',status:'EVALUATION_RESPONSE_REJECTED',
     simulation:'TEST_SYNTHETIC',providerUsed:false,externalRequests:0,
     evidence:[],facts:[],calculation:null,inferences:[],
     gaps:['离线评测响应未通过页面校验；不展示旧结果或未经核验的数值。']};
   }catch{
    if(token!==evaluationToken)return;
    evaluationCurrent={caseId,question:'固定合成题',status:'EVALUATION_SERVICE_UNAVAILABLE',
     simulation:'TEST_SYNTHETIC',providerUsed:false,externalRequests:0,
     evidence:[],facts:[],calculation:null,inferences:[],
     gaps:['离线评测服务失败；未沿用旧结果。']};
   }finally{if(token===evaluationToken){evaluationPending=false;render()}}
  });
 }
 function install(){
  const nav=document.querySelector('.sidebar nav');if(!nav||!host()||nav.querySelector('[data-analysis-route]'))return;
  const button=document.createElement('button');button.className='nav-item';button.dataset.analysisRoute='offline';
  button.textContent='证据分析（离线／真实闸门）';
  const sync=()=>{if(location.hash===route){nav.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item===button));render()}
   else{button.classList.remove('active');leave()}};
  button.onclick=()=>{if(location.hash!==route)history.pushState(null,'',route);sync()};
  nav.querySelector('[data-cockpit-reset]')?.before(button);
  nav.addEventListener('click',event=>{if(location.hash===route&&event.target.closest('[data-cockpit-route],[data-case-route],[data-qa-route],[data-cockpit-reset]'))leave()},true);
  addEventListener('hashchange',sync);addEventListener('popstate',sync);
  if(initialRoute){history.replaceState(null,'',route);sync()}
 }
 if(typeof document!=='undefined')setTimeout(install,0);
  return {render,install,session:offlineSession,liveSession,validateEvaluationResult};
})();
