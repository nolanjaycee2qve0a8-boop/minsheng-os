/* v0.13: explicitly approved, narrow PBOC August 2026 acceptance.
   These REAL observations are independent of legacy MOCK/demo indicators. */
(()=>{
 const version='v0.13.1', importedAt='2026-09-27T00:00:00.000Z';
 const approval={
  id:'approval_pboc_financial_statistics_202608_limited_20260927',
  artifact:'sources/official-v030/manifests/v013-pboc-financial-statistics-202608-limited-acceptance-approval-20260927.json',
  artifactSha256:'D83B51CB7A35A7D52E1E34CF87C291E2C720F2971C2711CDEEE18993432A8D40',
  proposalSha256:'EFD9CBEEB2E2C8B08BC684848F93AD2583A25D04FF857EC833929BE90C79A9C4',
  stagingSha256:'DE55704152ABAFCC91430EE45B9967E01A62F8AE314AC3105542C16041F602E3',
  reviewSha256:'0018FBAC145D791364130147C40218B4B42B0EE70B0DDCF7426FFB47857A7BDC'
 };
 const rawSha256='B47CECA8192FF24B28E56ABD420F95988A42FB2362799C7BE58E886DC8CE8F61';
 const url='https://www.pbc.gov.cn/goutongjiaoliu/113456/113469/2026091414593871200/index.html';
 const doc={id:'doc_pboc_financial_statistics_202608_v013',title:'2026年8月金融统计数据报告',sourceId:'pboc',sourceType:'official_primary',institutionId:'pboc',documentType:'statistical_release',publicationDate:'2026-09-14',dataPeriodStart:'2026-08-01',dataPeriodEnd:'2026-08-31',fetchDate:'2026-09-27',asOf:'2026-09-14',originalUrl:url,originalSite:true,officialMirror:false,status:'REAL_SOURCE',version:1,parserVersion:'pboc-stat-report-1.0.0',mappingVersion:version,rawPayloadId:'raw_pboc_financial_statistics_202608_v013',relativeRawPath:'sources/official-v030/raw/B4/B47CECA8192FF24B28E56ABD420F95988A42FB2362799C7BE58E886DC8CE8F61.html',checksum:rawSha256,mimeType:'text/html',tags:['PBOC','official','financial-statistics','2026-08','limited-acceptance'],relatedIndicatorIds:['money_m0','money_m0_yoy','money_m2','money_m2_yoy','rmb_deposit_balance','social_financing_stock'],relatedDataRecordIds:[],notes:'Limited approval for six named aggregate observations only. It does not modify legacy MOCK/demo indicators and does not qualify any trend, causal, property-sector, mortgage, or debt-service analysis.'};
 const raw={id:doc.rawPayloadId,sourceId:'pboc',sourceDocumentId:doc.id,fileName:doc.relativeRawPath.split('/').at(-1),relativePath:doc.relativeRawPath,fileSize:41477,checksum:rawSha256,checksumAlgorithm:'SHA-256',mimeType:'text/html',fetchedAt:importedAt,originalUrl:url,originalSite:true,status:'FETCHED',storageType:'external_local_source',binaryStatus:'available',parserVersion:doc.parserVersion,mappingVersion:version,immutable:true};
 const rows=[
  ['money_m0','M0',14.83,'万亿元',148300,'亿元','stock','POINT','CURRENCY_IN_CIRCULATION','candidate_b47ceca8192ff24b_money_m0'],
  ['money_m0_yoy','M0同比增长',7.5,'%',7.5,'%','growth_rate','PERIOD','CURRENCY_IN_CIRCULATION','candidate_b47ceca8192ff24b_money_m0_yoy'],
  ['money_m2','M2',356.81,'万亿元',3568100,'亿元','stock','POINT','BROAD_MONEY','candidate_b47ceca8192ff24b_money_m2'],
  ['money_m2_yoy','M2同比增长',7.5,'%',7.5,'%','growth_rate','PERIOD','BROAD_MONEY','candidate_b47ceca8192ff24b_money_m2_yoy'],
  ['rmb_deposit_balance','人民币存款余额',347.67,'万亿元',3476700,'亿元','stock','POINT','RMB_DEPOSITS','candidate_b47ceca8192ff24b_rmb_deposit_balance'],
  ['social_financing_stock','社会融资规模存量',464.8,'万亿元',4648000,'亿元','stock','POINT','SOCIAL_FINANCING','candidate_b47ceca8192ff24b_social_financing_stock']
 ];
 const record=(row,index)=>{const [indicatorId,sourceField,originalValue,originalUnit,value,unit,observationType,aggregation,sectorScope,candidateId]=row;return {id:`record_pboc_${indicatorId}_202608_v013`,seriesId:`CN.PBOC.${indicatorId.toUpperCase()}.MONTHLY.${observationType.toUpperCase()}`,indicatorId,value,convertedValue:value,unit,convertedUnit:unit,originalValue:String(originalValue),originalUnit,conversionRule:originalUnit==='万亿元'?'SOURCE_VALUE_X_10000':'IDENTITY',frequency:'monthly',aggregation,observationType,transformation:observationType==='growth_rate'?'yoy':'raw',period:'2026-08',periodStart:'2026-08-01',periodEnd:'2026-08-31',periodLabel:'2026年8月',geography:'CN',sectorScope,dataNature:observationType==='growth_rate'?'RATE':'STOCK',currency:originalUnit==='%'?null:'CNY',priceBasis:'NOT_APPLICABLE',measure:observationType==='growth_rate'?'YOY_GROWTH':'PERIOD_END_BALANCE',sourceId:'pboc',sourceDocumentId:doc.id,rawPayloadId:raw.id,releaseDate:doc.publicationDate,asOf:doc.asOf,importedAt,evidenceType:'FACT',status:'REAL',revision:0,previousRecordId:null,qualityFlags:['OFFICIAL_PRIMARY','LIMITED_ACCEPTANCE','NO_AUTOMATIC_INFERENCE'],provenance:{rawPayloadId:raw.id,sourceDocumentId:doc.id,originalFile:doc.relativeRawPath,checksum:rawSha256,parser:'pboc_financial_stats@pboc-stat-report-1.0.0',parserVersion:doc.parserVersion,mappingVersion:version,mappingId:`map_pboc_202608_${indicatorId}`,approvalId:approval.id,approvalArtifact:approval.artifact,approvalArtifactSha256:approval.artifactSha256,proposalSha256:approval.proposalSha256,stagingAuditSha256:approval.stagingSha256,manualReviewAuditSha256:approval.reviewSha256,acceptedCandidateId:candidateId,locator:{locatorType:'text',sectionTitle:'中国人民银行金融统计数据报告',period:'2026-08'},originalField:sourceField,originalCell:`${originalValue}${originalUnit}`,transformationHistory:[originalUnit==='万亿元'?'Published source unit retained in provenance; converted to 亿元 only via the approved ×10000 rule.':'Published percentage retained without unit conversion.','Limited acceptance: no trend, causal, property-exposure, mortgage, or debt-service inference.']},notes:'Explicitly approved limited official observation. It remains separate from legacy MOCK/demo indicator values.'};};
 const records=rows.map(record);
 doc.relatedDataRecordIds=records.map(item=>item.id);
 const pushUnique=(target,items)=>items.forEach(item=>{if(!target.some(existing=>existing.id===item.id))target.push(item);});
 window.MinshengSourceDocuments??=[];window.MinshengRawPayloads??=[];window.MinshengDataRecords??=[];
 pushUnique(window.MinshengSourceDocuments,[doc]);pushUnique(window.MinshengRawPayloads,[raw]);pushUnique(window.MinshengDataRecords,records);
 window.MinshengPboc202608LimitedAcceptance={version,approval,document:doc,rawPayload:raw,records,excludedIndicatorIds:['money_m1','money_m1_yoy','household_loan_change','household_deposit_change','rmb_loan_balance','rmb_loan_change','rmb_deposit_change','social_financing_flow'],dashboardEffect:'NONE',knowledgeBaseEffect:'LIMITED_REAL_OBSERVATIONS_ONLY'};
})();
