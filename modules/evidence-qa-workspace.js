/* Browser workspace for local cited QA. No fetch, credentials or model calls. */
window.MinshengEvidenceQAWorkspace=(()=>{
 'use strict';
 const api=window.MinshengEvidenceQA,route='#qa/evidence',initialRoute=typeof location!=='undefined'&&location.hash===route;
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const session=api.createSession({respond:(question,context)=>new Promise(resolve=>setTimeout(()=>resolve(api.answer(question,context)),0))});
 let draft='',notice='',generation=0,lastSubmission={question:'',at:0};
 const leave=()=>{session.cancel();generation++};
 const root=()=>document.getElementById('researchCockpitRoot');
 function citationHtml(item,index,turn){
  const links=(item.sourceLinks||[]).filter(s=>/^https?:\/\//.test(s.url||'')).map(s=>{
   const doc=(window.MinshengSourceDocuments||[]).find(d=>d.id===s.documentId&&d.originalUrl===s.url);
   return `<span><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a> · 发布日期：${escape(doc?.publicationDate||'未登记')} · <button type="button" data-qa-copy="${escape(s.url)}">复制原文链接</button></span>`;
  }).join(' · ');
  return `<li id="qa-citation-${turn}-${index}" tabindex="-1"><b>${escape(item.id)} · ${escape(item.classification)}</b><p>${escape(item.subject)} · ${escape(item.periodLabel)} · ${escape(item.temporalBasis)} · ${escape(item.unit||'无数值单位')} · ${escape(item.geographyLabel)}</p><p>${links||'缺口/能力状态：没有合格数值原始来源'}</p><p>记录：${escape((item.sourceRecordIds||[]).join(' · '))}</p><p>来源状态：${escape(item.sourceStatus)}${item.formula?` · 公式：${escape(item.formula)}`:''}</p></li>`;
 }
 function turnHtml(result,turn){
  const citations=result.citations||[],claims=result.claims||[];
  return `<article class="panel qa-turn"><h3>提问：${escape(result.question)}</h3><p>提问时间：${escape(result.askedAt||'本次会话')} · 来源：${escape((result.sourceIds||citations.map(x=>x.id)).join('、')||'无合格来源')}</p><p><b>${escape(result.status)}</b> · 本地确定性引用式回答</p><p>${escape(result.notice)}</p>${claims.map(c=>`<p>${escape(c.text)} ${c.evidenceIds.map(id=>{const index=citations.findIndex(x=>x.id===id);return `<a href="#qa-citation-${turn}-${index}" data-qa-cite="qa-citation-${turn}-${index}">[${escape(id)}]</a>`}).join(' ')}</p>`).join('')}${result.diagnostics?.length?`<h4>缺口、冲突与过期证据</h4><ul>${result.diagnostics.map(d=>`<li>${escape(d.id)} · ${escape(d.status)} · ${escape((d.reasons||[]).join(' / '))}</li>`).join('')}</ul>`:''}${citations.length?`<details open><summary>证据与原始来源</summary><ul>${citations.map((c,i)=>citationHtml(c,i,turn)).join('')}</ul>${citations.some(c=>c.sourceLinks?.length)?'<p>外链若连接关闭，属于浏览器访问阻塞；引用仍保留，不代表原文已打开。</p>':''}</details>`:''}<p>${escape(result.boundary)}</p></article>`;
 }
 function render(){
  const host=root();if(!host)return;
  const turns=session.history,current=turns.at(-1),earlier=session.pending?turns:turns.slice(0,-1);
  host.innerHTML=`<section class="research-cockpit"><div class="view-intro"><p class="eyebrow">LOCAL CITED QA · v0.35</p><h1>有证据引用的问答</h1><p>仅检索本地已登记的公开结构化证据。答案由程序重建，未使用 DeepSeek 或其他模型生成。缺证据就不能判断。</p></div><section class="panel"><form id="evidenceQaForm"><label for="evidenceQaQuestion">问题或后续追问（单行，最多500字）</label><input id="evidenceQaQuestion" maxlength="500" autocomplete="off" value="${escape(draft)}" style="width:100%;padding:12px;margin:12px 0"><button type="submit" ${session.pending?'disabled':''}>${session.pending?'核对引用中…':'发送'}</button> <button type="button" data-qa-cancel ${session.pending?'':'disabled'}>取消</button> <button type="button" data-qa-reset>新对话</button> <button type="button" data-qa-back>返回研究概览</button></form><p role="status" aria-live="polite" data-qa-status>${escape(notice)}</p><p>支持范围：全国，上半年累计收入/土地收入、六月末贷款/法定地方债；不提供实时数据或未经验证的因果结论。</p><div aria-label="推荐问题">${api.TOPICS.map(t=>`<button type="button" data-qa-example="${escape(t.id)}">${escape(t.label)}</button>`).join(' ')}</div></section><section data-qa-current aria-label="当前答案"><h2>当前答案</h2>${session.pending?'<p>正在核对当前问题，上一答案已移入历史。</p>':current?turnHtml(current,turns.length-1):'<p>尚无答案。</p>'}</section><details data-qa-history><summary>历史记录（${earlier.length}）</summary>${earlier.map((item,i)=>turnHtml(item,i)).join('')||'<p>暂无历史记录。</p>'}</details></section>`;
  const input=host.querySelector('#evidenceQaQuestion');input.addEventListener('input',()=>{draft=input.value});
  host.querySelector('#evidenceQaForm').addEventListener('submit',async event=>{
   event.preventDefault();if(session.pending)return;draft=input.value;const question=draft,now=Date.now();
   if(lastSubmission.question===question&&now-lastSubmission.at<750){notice='已拦截重复点击；稍后仍可主动重新查询。';const status=host.querySelector('[data-qa-status]');if(status)status.textContent=notice;return}
   lastSubmission={question,at:now};const current=++generation,promise=session.send(question);notice='正在核对本地证据与引用…';render();
   const result=await promise;if(generation!==current||location.hash!==route)return;
   notice=result.status==='CANCELLED'?'已取消，未保存回答。':result.notice||result.status;render();
  });
  host.querySelector('[data-qa-cancel]').onclick=()=>{session.cancel();generation++;notice='已取消，未保存回答。';render()};
  host.querySelector('[data-qa-reset]').onclick=()=>{session.reset();generation++;draft='';lastSubmission={question:'',at:0};notice='新对话已开始，追问上下文已清空。';render()};
  host.querySelector('[data-qa-back]').onclick=()=>{leave();location.hash='#cockpit/overview'};
  host.querySelectorAll('[data-qa-example]').forEach(button=>button.onclick=()=>{draft=api.TOPICS.find(t=>t.id===button.dataset.qaExample).question;input.value=draft;input.focus()});
  host.querySelectorAll('[data-qa-cite]').forEach(link=>link.onclick=event=>{event.preventDefault();const target=document.getElementById(link.dataset.qaCite);target?.scrollIntoView({block:'center'});target?.focus({preventScroll:true})});
  host.querySelectorAll('[data-qa-copy]').forEach(button=>button.onclick=async()=>{try{await navigator.clipboard.writeText(button.dataset.qaCopy);const status=host.querySelector('[data-qa-status]');if(status)status.textContent='已复制原文链接；能否打开由浏览器连接状态决定。'}catch{const status=host.querySelector('[data-qa-status]');if(status)status.textContent='复制链接失败；请从保留的原文链接手动复制。'}});
 }
 function install(){
  const nav=document.querySelector('.sidebar nav');if(!nav||!root()||nav.querySelector('[data-qa-route]'))return;
  const button=document.createElement('button');button.className='nav-item';button.dataset.qaRoute='evidence';button.textContent='有证据引用的问答';
  const sync=()=>{if(location.hash===route){nav.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===button));render()}else{button.classList.remove('active');session.cancel();generation++}};
  button.onclick=()=>{if(location.hash!==route)history.pushState(null,'',route);sync()};nav.querySelector('[data-cockpit-reset]')?.before(button);
  nav.addEventListener('click',event=>{if(location.hash===route&&event.target.closest('[data-cockpit-route],[data-case-route],[data-cockpit-reset]'))leave()},true);
  addEventListener('hashchange',sync);addEventListener('popstate',sync);
  if(initialRoute){history.replaceState(null,'',route);sync()}
 }
 if(typeof document!=='undefined')setTimeout(install,0);
 return {render,install,session};
})();
