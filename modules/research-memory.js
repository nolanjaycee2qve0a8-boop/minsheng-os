window.MinshengResearchMemory = (() => {
  const today=()=>new Date().toISOString().slice(0,10);
  const appendHistory=(research,{newConfidence,newConclusion,reason,addedEvidenceIds=[],removedEvidenceIds=[]})=>{research.history??=[];research.history.push({date:today(),previousConfidence:research.confidence,newConfidence,previousConclusion:research.currentConclusion,newConclusion,reason,addedEvidenceIds,removedEvidenceIds});research.confidence=newConfidence;research.currentConclusion=newConclusion;research.updatedAt=today();return research;};
  const linkEvidence=(research,evidence)=>{const target=evidence.stance==='CONTRADICT'?'contradictingEvidenceIds':'evidenceIds';research[target]??=[];if(!research[target].includes(evidence.id))research[target].push(evidence.id);return research;};
  return {today,appendHistory,linkEvidence};
})();
