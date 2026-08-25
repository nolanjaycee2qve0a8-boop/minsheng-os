window.MinshengConfidence = (() => {
  const sourceWeights = {official_primary:1,official_report:.9,multilateral:.88,academic:.85,market_data:.82,investment_bank:.75,media:.6,expert:.55,social_media:.3,survey:.5,unknown:.3};
  const evidenceTypeWeights = {FACT:1,ESTIMATE:.8,INFERENCE:.65,FORECAST:.5,OPINION:.4,HYPOTHESIS:.25,SCENARIO:.2};
  const freshnessWeight = date => { const months=Math.max(0,(new Date('2026-08-18')-new Date(date))/2629800000); return months<=3?1:months<=12?.75:.5; };
  const score = evidence => (sourceWeights[evidence.sourceType] ?? .3) * (evidenceTypeWeights[evidence.evidenceType] ?? .2) * (evidence.confidence ?? 0) * (evidence.importance ?? 0) * freshnessWeight(evidence.publishedAt);
  const independenceAdjustment=items=>{const seen={};return items.map(item=>{const group=item.independenceGroup||item.sourceDocumentId||item.sourceId||'unknown',index=seen[group]||0;seen[group]=index+1;return {item,group,weight:[1,.6,.4,.3][Math.min(index,3)]};});};
  const explain = (research,evidence) => { const related=evidence.filter(e=>e.relatedResearch.includes(research.id)), support=related.filter(e=>e.stance==='SUPPORT'), contradict=related.filter(e=>e.stance==='CONTRADICT'), adjusted=independenceAdjustment(related), adjustedScore=stance=>adjusted.filter(x=>x.item.stance===stance).reduce((sum,x)=>sum+score(x.item)*x.weight,0), supportScore=adjustedScore('SUPPORT'), contradictScore=adjustedScore('CONTRADICT'), netEvidence=supportScore-contradictScore; return {support,contradict,supportScore,contradictScore,netEvidence,confidence:research.confidence ?? null,independenceAdjustment:adjusted,demoRule:'同一独立组权重依次为 1.00 / 0.60 / 0.40 / 0.30（DEMO 研究规则）'}; };
  return {sourceWeights,evidenceTypeWeights,freshnessWeight,score,independenceAdjustment,explain};
})();
