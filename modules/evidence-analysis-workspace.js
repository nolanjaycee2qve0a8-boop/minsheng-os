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
 const session=window.MinshengEvidenceAnalysisSession.createSession({respond:async question=>{
  const response=await fetch('/api/analysis/offline',{method:'POST',credentials:'omit',cache:'no-store',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});
  if(!response.ok)throw Error('LOCAL_SERVICE_UNAVAILABLE');
  return response.json();
 }});
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
 function turnHtml(result,turn){
  const sources=result.sources||[];
  return '<article class="panel analysis-turn"><h3>提问：'+escape(result.question)+'</h3>'+
   '<p>提问时间：'+escape(result.askedAt)+' · 来源：'+escape((result.sourceIds||[]).join('、')||'无合格来源')+'</p>'+
   '<p><b>'+escape(result.status)+'</b> · 固定离线模拟，非 DeepSeek 实测</p>'+
   '<p>'+escape(result.notice)+'</p>'+
   (result.analysisBasis?'<h4>分析依据</h4><p>'+escape(result.analysisBasis)+'</p>':'')+
   (result.facts?.length?'<h4>证据事实（字段已核对）</h4>'+result.facts.map(f=>'<p>'+escape(f.text)+links(f.evidenceIds,sources,turn)+'</p>').join(''):'')+
   (result.inferences?.length?'<h4>推断（模拟，待人工审核）</h4>'+result.inferences.map(i=>'<p>'+escape(i.text)+
    ' · '+escape(i.uncertainty)+links(i.evidenceIds,sources,turn)+'</p>').join(''):'')+
   (result.gaps?.length?'<h4>缺口</h4><ul>'+result.gaps.map(g=>'<li>'+escape(g.text)+'</li>').join('')+'</ul>':'')+
   (sources.length?'<details open><summary>可核验引用</summary><ul>'+sources.map((s,i)=>sourceHtml(s,turn,i)).join('')+
    '</ul><p>原文链接保留；浏览器若拒绝连接，不能声称已核对网页原文。</p></details>':'')+
   '<p>'+escape(result.boundary)+'</p></article>';
 }
 function render(){
  const root=host();if(!root)return;
  const current=session.current,history=session.history;
  root.innerHTML='<section class="research-cockpit"><div class="view-intro"><p class="eyebrow">EVIDENCE ANALYSIS · OFFLINE MOCK</p>'+
   '<h1>基于证据的分析（离线模拟）</h1><p>只接受本轮已登记的全国结构化证据。固定模拟响应不代表 DeepSeek 已接通；事实与推断分区，缺证据就拒答。</p></div>'+
   '<section class="panel"><form id="offlineAnalysisForm"><label for="offlineAnalysisQuestion">分析问题（单行，最多500字）</label>'+
   '<input id="offlineAnalysisQuestion" maxlength="500" autocomplete="off" value="'+escape(draft)+'" style="width:100%;padding:12px;margin:12px 0">'+
   '<button type="submit" '+(session.pending?'disabled':'')+'>发送</button> <button type="button" data-analysis-cancel '+(session.pending?'':'disabled')+
   '>取消</button> <button type="button" data-analysis-reset>新对话</button> <button type="button" data-analysis-back>返回有证据问答</button></form>'+
   '<p role="status" aria-live="polite" data-analysis-status>'+escape(notice)+'</p>'+
   '<p>当前仅支持下列固定问题；不含闲聊、算术、实时采集、历史预测或真实 API。</p>'+
   '<div aria-label="离线分析示例">'+questions.map((q,i)=>'<button type="button" data-analysis-example="'+i+'">'+escape(q)+'</button>').join(' ')+'</div></section>'+
   '<section aria-label="当前分析"><h2>当前分析</h2>'+(session.pending?'<p>正在校验本题模拟响应；先前答案已移入历史。</p>':
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
   const promise=session.send(question);notice='正在校验本地模拟响应…';render();
   const result=await promise;if(token!==generation||location.hash!==route)return;
   notice=result.notice||result.status;render();
  };
  root.querySelector('[data-analysis-cancel]').onclick=()=>{session.cancel();generation++;notice='已取消；本题未沿用旧答案。';render()};
  root.querySelector('[data-analysis-reset]').onclick=()=>{session.reset();generation++;draft='';lastSubmission={question:'',at:0};notice='新对话已开始。';render()};
  root.querySelector('[data-analysis-back]').onclick=()=>{leave();location.hash='#qa/evidence'};
  root.querySelectorAll('[data-analysis-example]').forEach(button=>button.onclick=()=>{draft=questions[Number(button.dataset.analysisExample)];input.value=draft;input.focus()});
  root.querySelectorAll('[data-analysis-cite]').forEach(link=>link.onclick=event=>{event.preventDefault();
   const target=document.getElementById(link.dataset.analysisCite);target?.scrollIntoView({block:'center'});target?.focus({preventScroll:true})});
 }
 function install(){
  const nav=document.querySelector('.sidebar nav');if(!nav||!host()||nav.querySelector('[data-analysis-route]'))return;
  const button=document.createElement('button');button.className='nav-item';button.dataset.analysisRoute='offline';
  button.textContent='证据分析（离线模拟）';
  const sync=()=>{if(location.hash===route){nav.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item===button));render()}
   else{button.classList.remove('active');leave()}};
  button.onclick=()=>{if(location.hash!==route)history.pushState(null,'',route);sync()};
  nav.querySelector('[data-cockpit-reset]')?.before(button);
  nav.addEventListener('click',event=>{if(location.hash===route&&event.target.closest('[data-cockpit-route],[data-case-route],[data-qa-route],[data-cockpit-reset]'))leave()},true);
  addEventListener('hashchange',sync);addEventListener('popstate',sync);
  if(initialRoute){history.replaceState(null,'',route);sync()}
 }
 if(typeof document!=='undefined')setTimeout(install,0);
 return {render,install,session};
})();
