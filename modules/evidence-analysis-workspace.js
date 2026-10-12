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
 const host=()=>document.getElementById('researchCockpitRoot');
 const leave=()=>{session.cancel();generation++};
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
   '<p>请求入口：'+(mode==='LIVE'?'真实 API（未授权时拒发）':'固定离线模拟')+'。每条答案的模式以其实际结果标识为准；不含闲聊、算术、实时采集或历史预测。</p>'+
   '<button type="button" data-analysis-mode>切换到'+(mode==='LIVE'?'离线模拟':'真实 API 闸门')+'</button>'+
   '<div aria-label="离线分析示例">'+(mode==='LIVE'?[liveQuestion]:questions).map((q,i)=>'<button type="button" data-analysis-example="'+i+'">'+escape(q)+'</button>').join(' ')+'</div></section>'+
   '<section aria-label="当前分析"><h2>当前分析</h2>'+(session.pending?'<p>正在处理本题响应；先前答案已移入历史。</p>':
    current?turnHtml(current,history.length):'<p>尚无分析。</p>')+'</section>'+
   '<details data-analysis-history><summary>历史记录（'+history.length+'）</summary>'+
   history.map((item,i)=>turnHtml(item,i)).join('')+'</details></section>';
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
  root.querySelector('[data-analysis-reset]').onclick=()=>{session.reset();generation++;draft='';lastSubmission={question:'',at:0};notice='新对话已开始。';render()};
  root.querySelector('[data-analysis-mode]').onclick=()=>{session.cancel();session.reset();generation++;
   mode=mode==='LIVE'?'OFFLINE':'LIVE';session=mode==='LIVE'?liveSession:offlineSession;
   session.reset();draft='';lastSubmission={question:'',at:0};
   notice=mode==='LIVE'?'真实模式仅在本地单次授权后发送；目前默认拒发。':'已切回固定离线模拟。';render()};
  root.querySelector('[data-analysis-back]').onclick=()=>{leave();location.hash='#qa/evidence'};
  root.querySelectorAll('[data-analysis-example]').forEach(button=>button.onclick=()=>{draft=(mode==='LIVE'?[liveQuestion]:questions)[Number(button.dataset.analysisExample)];input.value=draft;input.focus()});
  root.querySelectorAll('[data-analysis-cite]').forEach(link=>link.onclick=event=>{event.preventDefault();
   const target=document.getElementById(link.dataset.analysisCite);target?.scrollIntoView({block:'center'});target?.focus({preventScroll:true})});
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
  return {render,install,session:offlineSession,liveSession};
})();
