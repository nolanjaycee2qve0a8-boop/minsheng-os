/* Browser workspace for local cited QA. No fetch, credentials or model calls. */
window.MinshengEvidenceQAWorkspace=(()=>{
 'use strict';
 const api=window.MinshengEvidenceQA,route='#qa/evidence',initialRoute=typeof location!=='undefined'&&location.hash===route;
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const session=api.createSession({respond:(question,context)=>new Promise(resolve=>setTimeout(()=>resolve(api.answer(question,context)),0))});
 let draft='',notice='',generation=0;
 const root=()=>document.getElementById('researchCockpitRoot');
 function citationHtml(item,index,turn){
  const links=(item.sourceLinks||[]).filter(s=>/^https?:\/\//.test(s.url||'')).map(s=>`<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a>`).join(' · ');
  return `<li id="qa-citation-${turn}-${index}" tabindex="-1"><b>${escape(item.id)} · ${escape(item.classification)}</b><p>${escape(item.subject)} · ${escape(item.periodLabel)} · ${escape(item.temporalBasis)} · ${escape(item.unit||'无数值单位')} · ${escape(item.geographyLabel)}</p><p>${links||'缺口/能力状态：没有合格数值原始来源'}</p><p>记录：${escape((item.sourceRecordIds||[]).join(' · '))}</p><p>来源状态：${escape(item.sourceStatus)}${item.formula?` · 公式：${escape(item.formula)}`:''}</p></li>`;
 }
 function turnHtml(result,turn){
  const citations=result.citations||[],claims=result.claims||[];
  return `<article class="panel qa-turn"><h3>提问：${escape(result.question)}</h3><p><b>${escape(result.status)}</b> · 本地确定性引用式回答</p><p>${escape(result.notice)}</p>${claims.map(c=>`<p>${escape(c.text)} ${c.evidenceIds.map(id=>{const index=citations.findIndex(x=>x.id===id);return `<a href="#qa-citation-${turn}-${index}" data-qa-cite="qa-citation-${turn}-${index}">[${escape(id)}]</a>`}).join(' ')}</p>`).join('')}${result.diagnostics?.length?`<h4>缺口、冲突与过期证据</h4><ul>${result.diagnostics.map(d=>`<li>${escape(d.id)} · ${escape(d.status)} · ${escape((d.reasons||[]).join(' / '))}</li>`).join('')}</ul>`:''}${citations.length?`<details open><summary>证据与原始来源</summary><ul>${citations.map((c,i)=>citationHtml(c,i,turn)).join('')}</ul></details>`:''}<p>${escape(result.boundary)}</p></article>`;
 }
 function render(){
  const host=root();if(!host)return;
  host.innerHTML=`<section class="research-cockpit"><div class="view-intro"><p class="eyebrow">LOCAL CITED QA · v0.35</p><h1>有证据引用的问答</h1><p>仅检索本地已登记的公开结构化证据。答案由程序重建，未使用 DeepSeek 或其他模型生成。缺证据就不能判断。</p></div><section class="panel"><form id="evidenceQaForm"><label for="evidenceQaQuestion">问题或后续追问（单行，最多500字）</label><input id="evidenceQaQuestion" maxlength="500" autocomplete="off" value="${escape(draft)}" style="width:100%;padding:12px;margin:12px 0"><button type="submit" ${session.pending?'disabled':''}>${session.pending?'核对引用中…':'发送'}</button> <button type="button" data-qa-cancel ${session.pending?'':'disabled'}>取消</button> <button type="button" data-qa-reset>新对话</button> <button type="button" data-qa-back>返回研究概览</button></form><p role="status" aria-live="polite" data-qa-status>${escape(notice)}</p><p>支持范围：全国，上半年累计收入/土地收入、六月末贷款/法定地方债；不提供实时数据或未经验证的因果结论。</p><div aria-label="推荐问题">${api.TOPICS.map(t=>`<button type="button" data-qa-example="${escape(t.id)}">${escape(t.label)}</button>`).join(' ')}</div></section><div data-qa-history>${session.history.map(turnHtml).join('')}</div></section>`;
  const input=host.querySelector('#evidenceQaQuestion');input.addEventListener('input',()=>{draft=input.value});
  host.querySelector('#evidenceQaForm').addEventListener('submit',async event=>{
   event.preventDefault();if(session.pending)return;draft=input.value;const question=draft,current=++generation,promise=session.send(question);notice='正在核对本地证据与引用…';render();
   const result=await promise;if(generation!==current||location.hash!==route)return;
   notice=result.status==='CANCELLED'?'已取消，未保存回答。':result.notice||result.status;render();
  });
  host.querySelector('[data-qa-cancel]').onclick=()=>{session.cancel();generation++;notice='已取消，未保存回答。';render()};
  host.querySelector('[data-qa-reset]').onclick=()=>{session.reset();generation++;draft='';notice='新对话已开始，追问上下文已清空。';render()};
  host.querySelector('[data-qa-back]').onclick=()=>{location.hash='#cockpit/overview'};
  host.querySelectorAll('[data-qa-example]').forEach(button=>button.onclick=()=>{draft=api.TOPICS.find(t=>t.id===button.dataset.qaExample).question;input.value=draft;input.focus()});
  host.querySelectorAll('[data-qa-cite]').forEach(link=>link.onclick=event=>{event.preventDefault();const target=document.getElementById(link.dataset.qaCite);target?.scrollIntoView({block:'center'});target?.focus({preventScroll:true})});
 }
 function install(){
  const nav=document.querySelector('.sidebar nav');if(!nav||!root()||nav.querySelector('[data-qa-route]'))return;
  const button=document.createElement('button');button.className='nav-item';button.dataset.qaRoute='evidence';button.textContent='有证据引用的问答';
  const sync=()=>{if(location.hash===route){nav.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===button));render()}else{button.classList.remove('active');session.cancel();generation++}};
  button.onclick=()=>{if(location.hash!==route)history.pushState(null,'',route);sync()};nav.querySelector('[data-cockpit-reset]')?.before(button);
  addEventListener('hashchange',sync);addEventListener('popstate',sync);
  if(initialRoute){history.replaceState(null,'',route);sync()}
 }
 if(typeof document!=='undefined')setTimeout(install,0);
 return {render,install,session};
})();
