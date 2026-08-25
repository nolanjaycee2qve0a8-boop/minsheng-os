/* v0.7.3: deterministic handling for a PBOC first-half financial statistics report. */
(()=>{
  const parser=window.MinshengPbocStatisticalReportParser,baseParse=parser.parse,flowFields=new Set(['人民币贷款增加','人民币存款增加','住户贷款增加','住户存款增加','社会融资规模增量']),yoyFields={
    '人民币贷款余额':['人民币贷款余额同比增长','rmb_loan_balance_yoy'],
    '人民币存款余额':['人民币存款余额同比增长','rmb_deposit_balance_yoy'],
    '社会融资规模存量':['社会融资规模存量同比增长','social_financing_stock_yoy']
  };
  parser.parse=args=>{
    const result=baseParse(args),source=`${args.title||''}\n${result.text||args.content||''}`,half=source.match(/(20\d{2})年上半年金融统计数据报告/);
    if(!half)return result;
    const period=`${half[1]}-06`,start=`${half[1]}-01-01`,end=`${half[1]}-06-30`;
    result.period=period;
    const initialCandidates=[...result.candidates];
    initialCandidates.forEach(candidate=>{
      if(candidate.status==='MANUAL_REVIEW'&&candidate.errors?.some(error=>error.includes('period'))){candidate.status='PARSED';candidate.errors=[];}
      candidate.period=period;
      if(candidate.locator)candidate.locator.period=period;
      if(flowFields.has(candidate.sourceField)){candidate.frequency='irregular';candidate.aggregation='H1';candidate.periodStart=start;candidate.periodEnd=end;}
      if(candidate.observationType!=='stock'||!yoyFields[candidate.sourceField])return;
      const [sourceField,indicatorId]=yoyFields[candidate.sourceField],match=String(candidate.originalText||'').match(/同比(?:增长|上升|下降)([0-9.]+)%/);
      if(match&&!result.candidates.some(item=>item.sourceField===sourceField))result.candidates.push({...candidate,ruleId:`${candidate.ruleId}_yoy`,sourceField,indicatorId,value:Number(match[1])*(/下降/.test(match[0])?-1:1),unit:'%',observationType:'growth_rate',transformation:'yoy',aggregation:'PERIOD',frequency:'monthly',periodStart:`${period}-01`,periodEnd:null,originalText:candidate.originalText});
    });
    result.status=result.candidates.length?'SUCCESS':result.status;
    return result;
  };
  const baseImport=window.MinshengOfficialTextIntake.importText;const importText=async args=>{const result=await baseImport(args);if(!result.staged||!result.parsed)return result;const candidates=new Map(result.parsed.candidates.map(candidate=>[candidate.sourceField,candidate]));result.staged.forEach(item=>{const candidate=candidates.get(item.sourceField);if(!candidate||!item.record)return;item.record.period=candidate.period;item.record.periodStart=candidate.periodStart??item.record.periodStart;item.record.periodEnd=candidate.periodEnd??item.record.periodEnd;item.record.frequency=candidate.frequency??item.record.frequency;item.record.aggregation=candidate.aggregation??item.record.aggregation;item.record.seriesId=`CN.PBOC.${item.record.indicatorId.toUpperCase()}.${item.record.frequency.toUpperCase()}.${item.record.observationType.toUpperCase()}`;});const starts=result.staged.map(item=>item.record?.periodStart).filter(Boolean).sort(),ends=result.staged.map(item=>item.record?.periodEnd).filter(Boolean).sort();result.sourceDocument.dataPeriodStart=starts[0]||result.sourceDocument.dataPeriodStart;result.sourceDocument.dataPeriodEnd=ends.at(-1)||result.sourceDocument.dataPeriodEnd;return result;};window.MinshengOfficialTextIntake.importText=importText;
  const bind=()=>{const button=byId('importOfficialText'),connector=data.connectors?.find(item=>item.id===appState.connectorId)||data.connectors?.find(item=>item.sourceId==='pboc');if(!button||button.dataset.v073Bound||!connector)return;button.dataset.v073Bound='1';button.onclick=()=>{window.MinshengOfficialTextIntake.openImport(connector);const form=byId('officialTextImportForm');if(!form)return;form.onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form)),result=await importText({state:data,connector,file:form.file.files[0],details:{title:values.title,sourceUrl:values.sourceUrl||null,releaseDate:values.releaseDate||null,sourceUpdatedAt:values.sourceUpdatedAt||null}});data.connectorRuns.push(result.run);if(result.staged){result.staged.forEach(item=>item.connectorRunId=result.run.id);data.stagedRecords.push(...result.staged);result.run.pendingSourceDocument=result.sourceDocument;result.run.pendingRawPayload=result.rawPayload;result.run.indicatorDrafts=result.drafts;data.indicatorDrafts.push(...result.drafts);data.methodologyHints.push(...result.hints);data.textLocators.push(...result.staged.filter(item=>item.locator).map(item=>({...item.locator,sourceDocumentId:result.sourceDocument.id,connectorRunId:result.run.id,sourceField:item.sourceField})));audit('PARSE_OFFICIAL_TEXT','connector_run',result.run.id,null,{diagnostics:result.run.diagnostics,rawPayloadId:result.rawPayload.id},'Deterministic PBOC H1 text parse; records remain staged.');}else audit('RUN_CONNECTOR','connector_run',result.run.id,null,result.run,result.run.errors.join('; '));saveLocalResearch();renderMethodologies();byId('modal').classList.remove('show');window.MinshengConnectorWorkspace.renderConnectors();if(result.staged)window.MinshengConnectorWorkspace.openStaging(result.run.id);};};};bind();new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
})();
