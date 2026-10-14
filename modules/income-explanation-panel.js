(function(root){'use strict';
const QUESTION='这些变化说明什么，不能据此推断什么？';
const SHA='c68d427982b1ce35ebd7b83a54db08c89ac99936c7e59afc1632456b9c22ba59';
const ids=['nbs_income_pc_2025_h1','nbs_income_pc_2026_h1'];
const limits=['INDIVIDUAL','MEDIAN_DISTRIBUTION','DEBT','CAUSAL','FUTURE','REAL_FROM_NOMINAL'];
function valid(r){
 if(!r||r.schemaVersion!=='income-live-result-1'||r.question!==QUESTION||r.bodySha256!==SHA||!Array.isArray(r.facts)||!Array.isArray(r.sources))return false;
 const real=r.status==='REAL_INCOME_VALIDATED_REVIEW_REQUIRED',mock=r.status==='SIMULATED_INCOME_VALIDATED_REVIEW_REQUIRED';
 if(!real&&!mock)return r.validationStatus==='NOT_VALIDATED'&&!r.facts.length&&!r.sources.length&&r.calculation===null&&r.explanation===null;
 if(real?!(r.mode==='REAL'&&r.providerUsed===true&&r.externalRequests===1&&r.transport==='REAL_API'):
   !(r.mode==='SIMULATED'&&r.providerUsed===false&&r.externalRequests===0&&r.transport==='SIMULATED_HTTP_ONLY'))return false;
 return r.validationStatus==='INCOME_BINDINGS_PASSED'&&r.semanticTruthVerified===false&&r.explanation?.validation==='HUMAN_REVIEW_REQUIRED'&&r.explanation.verifiedConclusion===false&&
 JSON.stringify(r.facts)===JSON.stringify([{evidenceId:ids[0],field:'income',value:21840,unit:'元/人'},{evidenceId:ids[1],field:'income',value:22981,unit:'元/人'},{evidenceId:ids[1],field:'officialRealPercent',value:4.2,unit:'%'}])&&
 r.calculation?.calculationId==='calc_income_pc_2025h1_2026h1'&&JSON.stringify(r.calculation.inputIds)===JSON.stringify(ids)&&r.calculation.difference===1141&&r.calculation.unit==='元/人'&&r.calculation.nominalPercent==='5.22436'&&
 JSON.stringify(r.limitations)===JSON.stringify(limits)&&r.sources.length===2&&r.sources.every((s,i)=>s.evidenceId===ids[i]&&/^https:\/\/www\.stats\.gov\.cn\//.test(s.url));
}
function label(r){return r.status==='RECONCILIATION_REQUIRED'?'账本待对账，真实发送暂停':r.status==='REAL_INCOME_VALIDATED_REVIEW_REQUIRED'?'真实 API：字段校验通过，解释待人工审核':r.status==='SIMULATED_INCOME_VALIDATED_REVIEW_REQUIRED'?'模拟响应：未发送 DeepSeek，解释待人工审核':'失败或未授权：没有已校验结果，不自动重试';}
function createSession(respond){let current=null,pending=false;const history=[];return {
 get current(){return current},get history(){return history.slice()},get pending(){return pending},
 async send(){if(pending)return;pending=true;if(current)history.push(current);current=null;
 try{const r=await respond();current=valid(r)?{...r,displayTime:new Date().toISOString()}:{status:'PAGE_RESPONSE_REJECTED',question:QUESTION,displayTime:new Date().toISOString()};}
 catch{current={status:'NETWORK_OUTCOME_UNKNOWN',question:QUESTION,displayTime:new Date().toISOString()};}
 finally{pending=false}return current;}
};}
function install(document){const button=document.getElementById('send');if(!button)return;
 if(button.getAttribute?.('data-reconciliation-hold')==='true'){button.disabled=true;return;}
 const session=createSession(async()=>{const response=await fetch('/api/analysis/live',{method:'POST',cache:'no-store',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:QUESTION})});
 if(response.status===403)return {schemaVersion:'income-live-result-1',question:QUESTION,bodySha256:SHA,status:'EXTERNAL_CALL_NOT_AUTHORIZED',validationStatus:'NOT_VALIDATED',facts:[],sources:[],calculation:null,explanation:null};
 if(!response.ok)throw Error('LOCAL_FAILURE');return response.json()});
 const text=(host,tag,value)=>{const e=document.createElement(tag);e.textContent=value;host.appendChild(e);return e};
 function show(host,r){if(!r)return;const a=document.createElement('article');host.appendChild(a);text(a,'h3',label(r));text(a,'p',r.question+' · '+r.displayTime);text(a,'p','状态：'+r.status);
 if(!valid(r)||!['REAL_INCOME_VALIDATED_REVIEW_REQUIRED','SIMULATED_INCOME_VALIDATED_REVIEW_REQUIRED'].includes(r.status))return;
 text(a,'h4','原文事实（证据绑定）');text(a,'pre',JSON.stringify(r.facts,null,2));
 text(a,'h4','程序计算（不是原文引用或模型独立计算）');text(a,'p',r.formula);text(a,'pre',JSON.stringify(r.calculation,null,2));
 text(a,'h4','解释（待人工审核）');text(a,'p',r.explanation.text);
 text(a,'h4','局限');text(a,'p','只解释全国人均平均值同口径名义变化；不能推断人人增收、中位数或分配改善、偿债能力、因果或未来趋势。实际增长4.2%仅来自官方原文。');text(a,'p',r.boundary);
 text(a,'p','模型：'+r.model+' · 调用时间：'+r.calledAt+' · token用量：'+JSON.stringify(r.usage));
 for(const s of r.sources){text(a,'p',s.evidenceId+' · '+s.period+' · '+s.region+' · '+s.unit+' · 发布：'+s.published);const link=text(a,'a',s.title);link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';}
 text(a,'pre','来源版本：'+JSON.stringify(r.sourceBindings));}
 function render(){const c=document.getElementById('current'),h=document.getElementById('history-items');c.replaceChildren();h.replaceChildren();if(!session.current)text(c,'p',session.pending?'正在处理；不展示先前成功结果。':'尚无结果。');show(c,session.current);session.history.forEach(r=>show(h,r));button.disabled=session.pending;}
 button.onclick=async()=>{if(session.pending)return;const p=session.send();document.getElementById('notice').textContent='正在检查单次授权；不自动重试。';render();await p;render();document.getElementById('notice').textContent=label(session.current)};
 render();return session;
}
const api={valid,label,createSession,install};if(typeof module==='object'&&module.exports)module.exports=api;else{root.MinshengIncomePanel=api;install(document)}
})(typeof window==='object'?window:globalThis);
