/* v0.22 audited bank asset-quality registry. Entity disclosures, never national estimates. */
window.MinshengBankAssetQualitySeed=(()=>{
  const current='2025-12-31', comparative='2024-12-31', unit='RMB million';
  const reports={
    ICBC:{file:'icbc_2025_annual_report_en.pdf',sha:'149A2194A7B3A3F6C4EF0C0872DAA765E2D2BD35BDC51F1318F47EA7AAB25215',url:'https://v.icbc.com.cn/userfiles/Resources/ICBCLTD/download/2026/2025AnnualReport.pdf'},
    ABC:{file:'abc_2025_annual_report.pdf',sha:'92E8FCCF530422A615C4563EB8845661F995C932B0B132044BE1871BD7DD6F02',url:'https://www.abchina.com/en/investor-relations/performance-reports/annual-reports/202603/P020260423652699711023.pdf'},
    PSBC:{file:'psbc_2025_annual_report_en.pdf',sha:'D437FAF974AC5D89D1BA3715210ACD65497484B34675BA5A3283883FE6B6F412',url:'https://www.psbc.com/en/investor_relations/finance/financial_reports/202604/P020260415322721338496.pdf'}
  };
  const comma=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const record=(id,entity,portfolio,concept,period,value,page,printedPage,table,row,scope,kind='BALANCE',notes='')=>({
    id,entity,bank:entity,reportingPeriod:period,asOf:period,comparisonStatus:period===comparative?'COMPARATIVE_AS_PUBLISHED_IN_2025_REPORT':'CURRENT_REPORT_PERIOD',
    portfolio,concept,value,unit:kind==='RATIO'?'percent':unit,currency:kind==='RATIO'?null:'CNY',measurementKind:kind,
    publicationStatus:kind==='RATIO'?'PUBLISHED_RATIO':'PUBLISHED_BALANCE',sourceClass:'AUDITED_ENTITY_DISCLOSURE',consolidationScope:scope,geography:scope==='CONSOLIDATED'?'GROUP_CONSOLIDATED':'CHINA_DOMESTIC_BRANCHES',
    rawValueText:kind==='RATIO'?`${value.toFixed(2)}%`:comma(value),rawFieldText:row,pdfPage:page,printedPage,tableTitle:table,rowLabel:row,columnLabel:period===current?'2025':'2024',
    sourceRevision:'2025-annual-report',sourceUrl:reports[entity].url,localFile:`sources/official-v021/raw/${reports[entity].file}`,sha256:reports[entity].sha,reportTitle:`${entity} 2025 Annual Report`,reportLanguage:'EN',
    auditStatus:'VISUALLY_VERIFIED_BY_CODEX',visualReviewStatus:'VISUALLY_VERIFIED_BY_CODEX',visualReviewNotes:'Rendered at 250 DPI from the official English PDF; table heading, period column, row label, value and unit matched.',
    textExtraction:{tool:'pypdf',version:'6.10.0',result:'MATCHED_AND_VISUALLY_RECONCILED'},parserVersion:'v0.22.0',mappingVersion:'v0.22.0',revision:0,
    intendedUse:['BANK_SAMPLE_ASSET_QUALITY_ONLY'],limitations:['BANK_SAMPLE_ONLY_NOT_NATIONAL','NPL_RATIO_NOT_PD','NPL_BALANCE_NOT_FINAL_LOSS','ALLOWANCE_NOT_REALIZED_LOSS'],notes
  });
  const npl=(bank,portfolio,period,balance,ratio,page,printed,table,row,scope)=>[
    record(`asset_quality_${bank.toLowerCase()}_${period.slice(0,4)}_${portfolio.toLowerCase()}_npl_balance`,bank,portfolio,`${portfolio}_NPL_BALANCE`,period,balance,page,printed,table,row,scope),
    record(`asset_quality_${bank.toLowerCase()}_${period.slice(0,4)}_${portfolio.toLowerCase()}_npl_ratio`,bank,portfolio,`${portfolio}_NPL_RATIO`,period,ratio,page,printed,table,row,scope,'RATIO')
  ];
  const records=[
    ...npl('ICBC','PERSONAL_MORTGAGE',current,62250,1.06,75,73,'Distribution of Loans and NPLs','Residential mortgages','CONSOLIDATED'),
    ...npl('ICBC','PERSONAL_MORTGAGE',comparative,44317,0.73,75,73,'Distribution of Loans and NPLs','Residential mortgages','CONSOLIDATED'),
    ...npl('ICBC','CORPORATE_REAL_ESTATE',current,46576,5.39,76,74,'Distribution of corporate loans and non-performing corporate loans of domestic branches by industry of loan customers','Real estate','DOMESTIC_BRANCHES'),
    ...npl('ICBC','CORPORATE_REAL_ESTATE',comparative,43964,4.99,76,74,'Distribution of corporate loans and non-performing corporate loans of domestic branches by industry of loan customers','Real estate','DOMESTIC_BRANCHES'),
    ...npl('ABC','PERSONAL_MORTGAGE',current,44235,0.92,83,81,'Distribution of Non-Performing Loans by Business Type','Residential mortgage loans','CONSOLIDATED'),
    ...npl('ABC','PERSONAL_MORTGAGE',comparative,36598,0.73,83,81,'Distribution of Non-Performing Loans by Business Type','Residential mortgage loans','CONSOLIDATED'),
    ...npl('ABC','CORPORATE_REAL_ESTATE',current,47197,5.40,84,82,'Distribution of Corporate Non-Performing Loans by Industry','Real estate','CONSOLIDATED'),
    ...npl('ABC','CORPORATE_REAL_ESTATE',comparative,46339,5.40,84,82,'Distribution of Corporate Non-Performing Loans by Industry','Real estate','CONSOLIDATED'),
    ...npl('PSBC','PERSONAL_MORTGAGE',current,16235,0.69,144,142,'Distribution of Non-Performing Loans by Product Type','Residential mortgage loans','CONSOLIDATED'),
    ...npl('PSBC','PERSONAL_MORTGAGE',comparative,15231,0.64,144,142,'Distribution of Non-Performing Loans by Product Type','Residential mortgage loans','CONSOLIDATED'),
    ...npl('PSBC','CORPORATE_REAL_ESTATE',current,5473,1.58,146,144,'Domestic Non-Performing Corporate Loans by Industry','Real estate','DOMESTIC_BRANCHES'),
    ...npl('PSBC','CORPORATE_REAL_ESTATE',comparative,5972,1.94,146,144,'Domestic Non-Performing Corporate Loans by Industry','Real estate','DOMESTIC_BRANCHES'),
    ...npl('ICBC','BANK_TOTAL',current,399013,1.31,75,73,'Distribution of loans by five-category classification','Total','CONSOLIDATED'),
    ...npl('ICBC','BANK_TOTAL',comparative,379458,1.34,75,73,'Distribution of loans by five-category classification','Total','CONSOLIDATED'),
    ...npl('ABC','BANK_TOTAL',current,343456,1.27,83,81,'Distribution of Loans by Five-category Classification','Total','CONSOLIDATED'),
    ...npl('ABC','BANK_TOTAL',comparative,322165,1.30,83,81,'Distribution of Loans by Five-category Classification','Total','CONSOLIDATED'),
    ...npl('PSBC','BANK_TOTAL',current,91524,0.95,144,142,'Distribution of Loans by Five-Category Classification','Total','CONSOLIDATED'),
    ...npl('PSBC','BANK_TOTAL',comparative,80319,0.90,144,142,'Distribution of Loans by Five-Category Classification','Total','CONSOLIDATED')
  ];
  const byId=id=>records.find(x=>x.id===id);
  const derived=(id,nplId,exposureId,publishedId)=>{const a=byId(nplId),denom=(window.MinshengBankExposureSeed?.records||[]).find(x=>x.id===exposureId),published=byId(publishedId),value=a&&denom?a.value/denom.value*100:null;return {id,entity:a?.entity,bank:a?.entity,portfolio:a?.portfolio,concept:a?.concept.replace('_NPL_BALANCE','_NPL_RATIO'),reportingPeriod:current,asOf:current,comparisonStatus:'CURRENT_REPORT_PERIOD',value,displayValue:value==null?null:Number(value.toFixed(2)),unit:'percent',currency:null,measurementKind:'RATIO',publicationStatus:'DERIVED_FROM_ENTITY_DISCLOSURE',formula:'NPL balance / matching-scope disclosed loan balance × 100',inputRecordIds:[nplId,exposureId],inputRevisions:[a?.revision??0,denom?.revision??0],publishedComparatorId:publishedId,reconciliationTolerance:0.005,reconciliationStatus:Math.abs(Number(value.toFixed(2))-published.value)<0.005?'ROUNDING_MATCH':'RECONCILIATION_MISMATCH',sourceClass:'DERIVED_FROM_ENTITY_DISCLOSURE',consolidationScope:a?.consolidationScope,geography:a?.geography,sourceRevision:'2025-annual-report',status:'ACTIVE',intendedUse:['BANK_SAMPLE_ASSET_QUALITY_ONLY'],limitations:['BANK_SAMPLE_ONLY_NOT_NATIONAL','NPL_RATIO_NOT_PD','NPL_BALANCE_NOT_FINAL_LOSS'],revision:0};};
  const derivedRecords=[
    derived('asset_quality_icbc_2025_personal_mortgage_npl_ratio_derived','asset_quality_icbc_2025_personal_mortgage_npl_balance','bank_icbc_2025_personal_mortgage','asset_quality_icbc_2025_personal_mortgage_npl_ratio'),
    derived('asset_quality_icbc_2025_corporate_real_estate_npl_ratio_derived','asset_quality_icbc_2025_corporate_real_estate_npl_balance','bank_icbc_2025_corporate_real_estate','asset_quality_icbc_2025_corporate_real_estate_npl_ratio'),
    derived('asset_quality_abc_2025_personal_mortgage_npl_ratio_derived','asset_quality_abc_2025_personal_mortgage_npl_balance','bank_abc_2025_personal_mortgage','asset_quality_abc_2025_personal_mortgage_npl_ratio'),
    derived('asset_quality_abc_2025_corporate_real_estate_npl_ratio_derived','asset_quality_abc_2025_corporate_real_estate_npl_balance','bank_abc_2025_corporate_real_estate','asset_quality_abc_2025_corporate_real_estate_npl_ratio')
  ];
  const assessments=[
    {id:'asset_quality_psbc_2025_mortgage_reconciliation',entity:'PSBC',status:'RECONCILIATION_MISMATCH',publishedRatio:0.69,candidateDerivedRatio:16235/2373341*100,tolerance:0.005,reason:'The product-table published ratio is retained. Its display does not reconcile within the stated tolerance to the separate v0.21 balance; no derived replacement is accepted.'},
    {id:'asset_quality_psbc_2025_corporate_scope',entity:'PSBC',status:'CROSS_SCOPE_RATIO_DERIVATION_REJECTED',reason:'Domestic-branch NPL table cannot be divided by the separately disclosed consolidated corporate real-estate loan balance.'},
    ...Object.keys(reports).map(entity=>({id:`asset_quality_${entity.toLowerCase()}_2025_lgfv`,entity,status:'UNKNOWN',value:null,reason:'No directly reviewed, scope-defined LGFV asset-quality disclosure was accepted.',limitations:['LGFV_ASSET_QUALITY_UNKNOWN','NO_NATIONAL_EXTRAPOLATION']}))
  ];
  const coverage=Object.keys(reports).map(entity=>({id:`asset_quality_coverage_${entity.toLowerCase()}_2025`,entity,reportingPeriod:current,sourceClass:'AUDITED_ENTITY_DISCLOSURE',report:{...reports[entity],localFile:`sources/official-v021/raw/${reports[entity].file}`},corporateRealEstateNpl:'AUDITED_ENTITY_DISCLOSURE',personalMortgageNpl:'AUDITED_ENTITY_DISCLOSURE',bankWideNpl:'AUDITED_ENTITY_DISCLOSURE',lgfvAssetQuality:'UNKNOWN',limitations:['BANK_SAMPLE_ONLY_NOT_NATIONAL','NO_NATIONAL_EXTRAPOLATION']}));
  return {version:'v0.22.0',records,derivedRecords,assessments,coverage,run:{id:'bank_asset_quality_v022',status:'COMPLETE',targetBanks:Object.keys(reports),acceptedRecords:records.length,acceptedDerivedRecords:derivedRecords.length,comparativeRecords:records.filter(x=>x.comparisonStatus.startsWith('COMPARATIVE')).length,rejectedCandidates:2,unknownAssessments:3,fixtureCounted:false}};
})();
