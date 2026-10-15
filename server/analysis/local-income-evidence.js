'use strict';
// Read-only presentation of the existing verified public pair. No provider or ledger access.
const { CONTEXT, SOURCE_BINDINGS } = require('./income-explanation-preflight');
const ARTIFACT_SHA = '5d8dda761e0041bc0a4e07df1bd29a3011206ae17a45875a280a7741319cb747';
const VERIFIED_BASIS = '全国居民人均可支配收入平均数；各年1—6月累计；名义现价金额；季度口径不含自产自用。用户交接官方页面快照已核对，非本机在线重抓；未见正文修订说明，不保证没有其他修订。';
// Acquisition timestamps/locations are from the reviewed handoff, not a local download.
const VERIFIED = Object.freeze([
  Object.freeze({ id:'nbs_income_pc_2025_h1', value:21840, period:'2025-H1', published:'2025-07-15',
    title:'2025年上半年居民收入和消费支出情况',
    url:'https://www.stats.gov.cn/sj/zxfb/202507/t20250715_1960406.html',
    sha256:'6f2e6d795ed34785ac081c76c0dd1f7f5e69540502ae5c9d35c1200a43d3f369', bytes:239650,
    acquired:'2026-10-13T05:27:20.779712+00:00', line:301, offset:11763, length:1398 }),
  Object.freeze({ id:'nbs_income_pc_2026_h1', value:22981, period:'2026-H1', published:'2026-07-15',
    title:'2026年上半年居民收入和消费支出情况',
    url:'https://www.stats.gov.cn/sj/zxfbhjd/202607/t20260715_1964129.html',
    sha256:'04ff31c146e6d8cf59152afccb12478741ce260c0a12e8a86f6dadcb3f09e192', bytes:243208,
    acquired:'2026-10-13T05:27:53.666308+00:00', line:332, offset:12318, length:1398 })
]);
const escape = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function localEvidence(context=CONTEXT,bindings=SOURCE_BINDINGS) {
  if(context?.nature!=='PUBLIC_OFFICIAL_SNAPSHOT_HANDOFF_REVIEWED'||
      context.commonBasis!==VERIFIED_BASIS||
      !Array.isArray(context.evidence)||context.evidence.length!==2||!Array.isArray(bindings)||bindings.length!==2)
    throw Error('LOCAL_SOURCE_BINDING_MISMATCH');
  context.evidence.forEach((s,i)=>{
    const v=VERIFIED[i];
    if(s.evidenceId!==v.id||s.value!==v.value||s.period!==v.period||s.published!==v.published||
        s.title!==v.title||s.url!==v.url||s.region!=='中国全国'||s.unit!=='元/人'||
        bindings[i].evidenceId!==v.id||bindings[i].sha256!==v.sha256||
        (i===1&&s.officialRealPercent!==4.2))throw Error('LOCAL_SOURCE_BINDING_MISMATCH');
  });
  const [a,b]=context.evidence,difference=BigInt(b.value)-BigInt(a.value),denominator=BigInt(a.value);
  // Same exact integer, final half-up rounding used by the existing evidence audit.
  const numerator=difference*100n,rounded=(2n*numerator*100000n+denominator)/(2n*denominator);
  const digits=rounded.toString().padStart(6,'0'),nominalPercent=digits.slice(0,-5)+'.'+digits.slice(-5);
  const c=context.calculation;
  if(c?.difference!==Number(difference)||c.nominalPercent!==nominalPercent||c.unit!=='元/人'||
      c.calculationId!=='calc_income_pc_2025h1_2026h1'||
      JSON.stringify(c.inputIds)!==JSON.stringify(VERIFIED.map(x=>x.id)))throw Error('LOCAL_CALCULATION_MISMATCH');
  return {mode:'LOCAL_EVIDENCE_CALCULATION',modelAnalysisPerformed:false,providerUsed:false,externalRequests:0,
    sources:context.evidence.map((s,i)=>({...s,verification:{...VERIFIED[i]}})),
    calculation:{id:c.calculationId,inputIds:[...c.inputIds],difference:Number(difference),unit:c.unit,nominalPercent,
      differenceFormula:`${b.value} − ${a.value} = ${difference} 元/人`,
      growthFormula:`(${b.value} − ${a.value}) ÷ ${a.value} × 100% = ${nominalPercent}%`,
      rounding:'保留公开整数；按整数有理数运算，百分比最后四舍五入至小数点后5位。',sourceClaim:false},
    officialRealGrowth:{value:b.officialRealPercent,unit:'%',evidenceId:b.evidenceId,computed:false},
    artifact:{filename:'comparison.json',sha256:ARTIFACT_SHA},commonBasis:context.commonBasis};
}
function renderLocalIncomeEvidence(context=CONTEXT,bindings=SOURCE_BINDINGS) {
  let v;
  try { v=localEvidence(context,bindings); }
  catch { return '<section id="local-income-evidence" data-mode="LOCAL_EVIDENCE_UNAVAILABLE" role="alert"><h2>本地证据暂不可用</h2><p>来源或计算绑定不一致，已停止展示；请核对原核验产物。本轮未进行模型分析。</p></section>'; }
  const sources=v.sources.map(s=>{
    const m=s.verification;
    return `<article><h3>${escape(s.period)}：${escape(s.value)} 元/人</h3>
<p><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a> · 发布：${escape(s.published)}</p>
<p>中国全国 · 全国居民人均可支配收入平均数 · 1—6月累计 · 名义现价金额 · 单位：元/人</p>
<p>来源获取方式：交接快照本地核验。采集时间（交接方记录）：${escape(m.acquired)}；本机未重新下载。</p>
<details><summary>来源版本与原文定位</summary><p>证据ID：${escape(s.evidenceId)}</p><p>原文SHA-256：<code>${escape(m.sha256)}</code>；${m.bytes} 字节。</p>
<p>数值所在原HTML第 ${m.line} 行；UTF-8字节偏移 ${m.offset}（从0计）、跨度 ${m.length} 字节。</p></details></article>`;
  }).join('');
  return `<section id="local-income-evidence" data-mode="${v.mode}" aria-labelledby="local-income-heading">
<h2 id="local-income-heading">本地证据核验／程序计算，未进行本轮模型分析</h2>
<p>以下直接展示已核验的两期公开证据和程序复算，无需调用模型。</p>${sources}
<h3>机械计算（绑定两条输入证据）</h3><p><strong>${escape(v.calculation.differenceFormula)}</strong></p>
<p><strong>${escape(v.calculation.growthFormula)}</strong></p><p>${escape(v.calculation.rounding)}</p>
<p>计算ID：${escape(v.calculation.id)}；输入：${escape(v.calculation.inputIds.join(' + '))}。计算结果不作为某一条原文的直接引用。</p>
<h3>独立原文事实：2026上半年实际增幅 ${escape(v.officialRealGrowth.value)}%</h3>
<p>来源：${escape(v.officialRealGrowth.evidenceId)}。该值由官方公布并剔除价格因素；这里没有价格指数，未由两个现价金额复算实际增幅。</p>
<h3>可比性与判断边界</h3><p>${escape(v.commonBasis)}</p>
<p>仅比较全国人均平均数的同口径名义变化；不能据此判断每个人增收、中位数或收入分配改善、偿债能力、因果或未来趋势。季度口径不能与全年口径直接拼接。</p>
<p>官方公布的同比名义增幅为5.2%；公开整数复算按一位小数显示也为5.2%。显示精度可容纳差异，但不能认定唯一原因或修改原值。</p>
<details><summary>核验产物与来源限制</summary><p>${escape(v.artifact.filename)} · SHA-256：<code>${escape(v.artifact.sha256)}</code></p>
<p>本地核对交接快照的字节、正文及字段；哈希不是发布者数字签名。正文未见修订说明，不保证不存在其他更正。本区没有模型解释或模型用量记录。</p></details></section>`;
}
module.exports={localEvidence,renderLocalIncomeEvidence};
