/* v0.32 deterministic structured-statement briefing engine. */
window.MinshengEvidenceBriefing=(()=>{
 const C=window.MinshengResearchBriefingConfig||{statements:[],version:'UNKNOWN'};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const hash=x=>{let h=2166136261;for(const c of JSON.stringify(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16);};
 const types=['OFFICIAL_CHANGE_DIGEST','SECTOR_STATUS_BRIEF','DATA_GAP_BRIEF','FORECAST_OUTCOME_BRIEF','SCENARIO_MONITORING_BRIEF','REVISION_AND_STALE_BRIEF','COMBINED_RESEARCH_BRIEF'];
 const pick=(type,scenarios,pending)=>C.statements.filter(s=>{
  if(s.classification==='PENDING_REVIEW'&&!pending)return false;
  if(type==='OFFICIAL_CHANGE_DIGEST'&&pending&&s.statementType==='SOURCE_FAILURE')return false;
  if(type==='OFFICIAL_CHANGE_DIGEST')return ['NO_NEW_RELEASE','SOURCE_FAILURE','REVISION_NOTICE','STALE_WARNING'].includes(s.statementType);
  if(type==='SECTOR_STATUS_BRIEF')return ['REAL','DERIVED','UNKNOWN','BLOCKED'].includes(s.classification);
  if(type==='DATA_GAP_BRIEF')return ['UNKNOWN','BLOCKED','SOURCE_HEALTH'].includes(s.classification);
  if(type==='FORECAST_OUTCOME_BRIEF')return s.statementType==='FORECAST_EVALUATION';
  if(type==='SCENARIO_MONITORING_BRIEF')return scenarios&&s.statementType==='SCENARIO_RESULT';
  if(type==='REVISION_AND_STALE_BRIEF')return ['REVISION_NOTICE','STALE_WARNING','SOURCE_FAILURE'].includes(s.statementType);
  return (scenarios||s.classification!=='SCENARIO')&&(pending||s.classification!=='PENDING_REVIEW');
 });
 const render=s=>{
  if(s.renderTemplateId==='REAL_LEVEL')return `官方发布显示：${s.subject}截至${s.period}，记录值为${s.value}${s.unit}（范围：${s.scope}）。`;
  if(s.renderTemplateId==='DERIVED_RATIO')return `按已登记公式计算，${s.subject}为${s.value}${s.unit}；公式：${s.transformation}。`;
  if(s.renderTemplateId==='FORECAST_ERROR')return `机构预测相对首次发布实际值的误差为${s.value}${s.unit}；预测不等于实际。`;
  if(s.renderTemplateId==='SCENARIO_STATUS')return `在显式假设下，${s.subject}为${s.qualification}；该结果属于银行样本情景。`;
  if(s.renderTemplateId==='UNKNOWN_GAP')return `当前没有合格数据：${s.subject}。`;
  if(s.renderTemplateId==='BLOCKED')return `正式计算继续阻断：${s.subject}。`;
  if(s.renderTemplateId==='NO_NEW_RELEASE')return '无新合格发布；未批准候选仅保留在 PENDING_REVIEW。';
  return `来源监测记录：${s.subject}存在失败或待复核路由，既有 REAL 不因此失效。`;
 };
 const quality=statements=>{const errors=[];statements.forEach(s=>{if(s.value!==null&&s.value!==undefined&&!s.sourceRecordIds?.length)errors.push(`${s.statementId}:NUMERIC_SOURCE_REQUIRED`);if(s.classification==='REAL'&&!s.evidenceLocators?.length)errors.push(`${s.statementId}:REAL_LOCATOR_REQUIRED`);if(s.classification==='DERIVED'&&(!s.transformation||s.sourceRecordIds.length<2))errors.push(`${s.statementId}:DERIVATION_REQUIRED`);if(s.classification==='SCENARIO'&&!s.limitations?.length)errors.push(`${s.statementId}:SCENARIO_LIMITATION_REQUIRED`);if(['UNKNOWN','BLOCKED'].includes(s.classification)&&s.value===0)errors.push(`${s.statementId}:UNKNOWN_ZERO_FORBIDDEN`);if(s.classification==='PENDING_REVIEW')errors.push(`${s.statementId}:PENDING_IN_FORMAL_SET`);});return {pass:!errors.length,errors,numericStatements:statements.filter(s=>s.value!==null&&s.value!==undefined).length};};
 const create=({type='COMBINED_RESEARCH_BRIEF',asOf='2026-08-23T00:00:00Z',includeScenarios=false,includePendingReview=false,parentBriefingId=null}={})=>{
  if(!types.includes(type))throw Error('BRIEFING_TYPE_UNSUPPORTED');
  const statements=pick(type,includeScenarios,includePendingReview).map(s=>({...clone(s),renderedText:render(s)}));
  const audit=quality(statements),identity={type,asOf,includeScenarios,includePendingReview,statements:statements.map(s=>s.statementId),rules:C.version};
  return {briefingId:`brief_${hash(identity)}`,briefingType:type,asOf,populationContractVersion:'1.0.0',rulesVersion:C.version,templateVersion:C.templateVersion,sourceSnapshot:statements.flatMap(s=>s.sourceRecordIds),statementIds:statements.map(s=>s.statementId),statements,limitations:[...new Set(statements.flatMap(s=>s.limitations||[]))],parentBriefingId,qualityAudit:audit,fingerprint:hash(identity),immutable:true,createdAt:asOf,headlines:statements.filter(s=>['REVISION_NOTICE','NO_NEW_RELEASE','SOURCE_FAILURE'].includes(s.statementType)&&s.classification!=='PENDING_REVIEW').slice(0,3).map((s,i)=>({statementId:s.statementId,priority:i+1,selectionRule:'QUALIFIED_REVISION_THEN_RELEASE_THEN_STALE_THEN_BLOCKED_THEN_FORECAST_THEN_SOURCE_HEALTH',limitations:s.limitations}))};
 };
 const exportBrief=(b,format)=>{if(format==='json')return JSON.stringify(b,null,2);if(format==='markdown')return `# ${b.briefingType}\n\nAs-of: ${b.asOf}\n\n${b.statements.map(s=>`- ${s.renderedText} Evidence: ${s.evidenceLocators.join(', ')}`).join('\n')}\n\n## 强制限制\n${b.limitations.map(x=>`- ${x}`).join('\n')}`;return `<!doctype html><meta charset="utf-8"><title>${b.briefingType}</title><h1>${b.briefingType}</h1><p>As-of: ${b.asOf}</p><ul>${b.statements.map(s=>`<li>${s.renderedText}<br><code>${s.evidenceLocators.join(', ')}</code></li>`).join('')}</ul><h2>强制限制</h2><ul>${b.limitations.map(x=>`<li>${x}</li>`).join('')}</ul>`;};
 return {VERSION:C.version,types,create,quality,exportBrief,render};
})();
