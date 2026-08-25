window.MinshengCalibrationStaleness=(()=>{
 function stale(calibration,records,methodologyEvents){const ids=new Set(calibration.dataRecordIds||[]),seen=new Map((calibration.recordRevisionIds||[]).map(value=>{const [id,revision]=String(value).split(':r');return [id,Number(revision)];})),changed=(records||[]).some(r=>ids.has(r.id)&&(r.deleted||r.revision>(seen.get(r.id)??r.revision))),broken=(methodologyEvents||[]).some(e=>e.comparabilityImpact==='BREAK'&&[...(calibration.sourceIndicatorIds||[]),calibration.targetIndicatorId].includes(e.indicatorId));return changed||broken;}
 return {stale};
})();
