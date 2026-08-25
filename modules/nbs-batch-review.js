/* Release-parser candidates -> reviewable canonical-record proposals.
   Downloaded HTML remains raw evidence; this module never fetches or guesses. */
window.MinshengNbsBatchReview=(()=>{
 const clone=value=>JSON.parse(JSON.stringify(value));
 const registry=()=>window.MinshengSeriesRegistryV092||[];
 const key=record=>`${record.seriesId}|${record.period}`;
 function stage({parsedDocuments=[],existingRecords=[]}){
  const staged=[],records=[],summary={valid:0,ambiguous:0,unmapped:0,revision:0,conflict:0,duplicate:0};
  const existing=new Map((existingRecords||[]).filter(r=>r.status==='REAL'&&!r.deleted).map(r=>[key(r),r]));
  parsedDocuments.forEach(document=>{
   (document.candidates||[]).forEach((candidate,index)=>{
    const meta=registry().find(item=>item.seriesId===candidate.seriesId);
    const sourceDocumentId=document.sourceDocumentId||candidate.sourceDocumentId;
    if(!meta||candidate.unit!==meta.unit){staged.push({id:`stage_nbs_unmapped_${sourceDocumentId}_${index}`,status:'UNMAPPED',candidate,issues:['UNMAPPED_OR_INVALID_UNIT']});summary.unmapped++;return;}
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(candidate.period)||!Number.isFinite(candidate.value)){staged.push({id:`stage_nbs_invalid_${sourceDocumentId}_${index}`,status:'AMBIGUOUS',candidate,issues:['INVALID_PERIOD_OR_VALUE']});summary.ambiguous++;return;}
    const record={id:`record_nbs_${candidate.seriesId.replaceAll('.','_')}_${candidate.period.replace('-','')}`,seriesId:candidate.seriesId,indicatorId:meta.indicatorId,value:candidate.value,convertedValue:candidate.value,unit:candidate.unit,convertedUnit:candidate.unit,originalValue:candidate.value,originalUnit:candidate.unit,frequency:meta.frequency,observationType:meta.observationType,transformation:candidate.transformation,aggregation:candidate.aggregation,period:candidate.period,periodKind:candidate.periodKind,periodStart:candidate.periodStart,periodEnd:candidate.periodEnd,status:'REAL',sourceId:'nbs',sourceDocumentId,rawPayloadId:document.rawPayloadId||`raw_nbs_collector_${String(sourceDocumentId).replace('doc_nbs_collector_','')}`,revision:0,historicalVintageType:'ORIGINAL',comparabilityAdjusted:false,comparabilityBasis:null,methodologyNote:null,structuralGaps:candidate.periodKind==='JAN_FEB_COMBINED'?[`${candidate.period.slice(0,4)}-01`]:[],missingReason:candidate.periodKind==='JAN_FEB_COMBINED'?'NOT_SEPARATELY_PUBLISHED':null,qualityFlags:[],provenance:{officialUrl:document.originalUrl||null,checksum:document.checksum||null,parserVersion:candidate.parserVersion,originalText:candidate.originalText,paragraphIndex:candidate.paragraphIndex,sectionTitle:candidate.sectionTitle,tableTitle:candidate.tableTitle},notes:'Deterministically parsed from an official NBS release and manually accepted.'};
    const prior=existing.get(key(record));
    if(prior){const same=Number(prior.convertedValue??prior.value)===record.value;if(same){staged.push({id:`stage_nbs_duplicate_${sourceDocumentId}_${index}`,status:'DUPLICATE_CORROBORATING',record,candidate,issues:['SAME_OFFICIAL_VALUE'],primaryRecordId:prior.id});summary.duplicate++;}else{staged.push({id:`stage_nbs_conflict_${sourceDocumentId}_${index}`,status:'CONFLICT',record,candidate,issues:['REVISION_OR_SOURCE_CONFLICT_REVIEW'],primaryRecordId:prior.id});summary.conflict++;}return;}
    if((candidate.methodologyHints||[]).length){staged.push({id:`stage_nbs_method_${sourceDocumentId}_${index}`,status:'METHODOLOGY_WARNING',record,candidate,issues:candidate.methodologyHints});summary.revision++;return;}
    staged.push({id:`stage_nbs_${sourceDocumentId}_${index}`,status:'STAGED',record,candidate,issues:[]});records.push(record);existing.set(key(record),record);summary.valid++;
   });
  });
  return {id:`nbs_release_batch_${Date.now()}`,status:'REVIEW_REQUIRED',parsedDocuments:parsedDocuments.length,records,staged,summary};
 }
 function acceptAllValid(state,batch){state.records??=[];state.historicalStaging??=[];state.historicalImportBatches??=[];state.sourceDocuments??=[];const accepted=batch.staged.filter(item=>item.status==='STAGED').map(item=>clone(item.record));const already=new Set(state.records.map(record=>record.id));const committed=accepted.filter(record=>!already.has(record.id));state.records.push(...committed);state.historicalStaging.push(...batch.staged.map(item=>({...clone(item),reviewStatus:item.status==='STAGED'?'ACCEPTED':'REVIEW_REQUIRED'})));const ids=new Set(committed.map(record=>record.sourceDocumentId));state.sourceDocuments.filter(document=>ids.has(document.id)).forEach(document=>{document.status='REAL';document.relatedIndicatorIds=[...new Set([...document.relatedIndicatorIds||[],...committed.filter(record=>record.sourceDocumentId===document.id).map(record=>record.indicatorId)])];document.relatedDataRecordIds=[...new Set([...document.relatedDataRecordIds||[],...committed.filter(record=>record.sourceDocumentId===document.id).map(record=>record.id)])];});state.historicalImportBatches.push({id:batch.id,status:'COMMITTED',sourceId:'nbs',parsedDocuments:batch.parsedDocuments,summary:clone(batch.summary),committedRecordIds:committed.map(record=>record.id),reviewedAt:new Date().toISOString()});return {accepted:committed,reviewRequired:batch.staged.filter(item=>item.status!=='STAGED')};
 }
 return {stage,acceptAllValid};
})();
