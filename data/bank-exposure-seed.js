/* v0.21 audited-bank disclosure registry. This is an entity sample, never a national series. */
window.MinshengBankExposureSeed=(()=>{
  const reportPeriod='2025-12-31',unit='RMB million',sourceRevision='2025-annual-report';
  const english={
    ICBC:{file:'icbc_2025_annual_report_en.pdf',sha:'149A2194A7B3A3F6C4EF0C0872DAA765E2D2BD35BDC51F1318F47EA7AAB25215',url:'https://v.icbc.com.cn/userfiles/Resources/ICBCLTD/download/2026/2025AnnualReport.pdf',pages:295},
    ABC:{file:'abc_2025_annual_report.pdf',sha:'92E8FCCF530422A615C4563EB8845661F995C932B0B132044BE1871BD7DD6F02',url:'https://www.abchina.com/en/investor-relations/performance-reports/annual-reports/202603/P020260423652699711023.pdf',pages:380},
    PSBC:{file:'psbc_2025_annual_report_en.pdf',sha:'D437FAF974AC5D89D1BA3715210ACD65497484B34675BA5A3283883FE6B6F412',url:'https://www.psbc.com/en/investor_relations/finance/financial_reports/202604/P020260415322721338496.pdf',pages:439}
  };
  const chinese={
    ICBC:{file:'icbc_2025_annual_report.pdf',sha:'15A148052F4743A63288ADAB9329B73DBD65AD3D147A9BDD3A21230493F82C59',url:'https://www.icbc-ltd.com/page/1211087084107182080.html',pages:299},
    PSBC:{file:'psbc_2025_annual_report.pdf',sha:'6D6ACF8F449C493FFEA0E04D330DA5012776CE88BFC86C173D9E2F1E66136AEC',url:'https://www.psbc.com/cn/gyyc/tzzgx/gsgg/aggg/202603/P020260327777965568736.pdf',pages:null}
  };
  const record=(id,entity,concept,value,page,table,row,scope,notes='')=>({
    id,entity,reportingPeriod:reportPeriod,asOf:reportPeriod,consolidationScope:scope,exposureConcept:concept,exposureConceptSource:'EXPLICIT',value,currency:'CNY',unit,
    rawValueText:String(value).replace(/\B(?=(\d{3})+(?!\d))/g,','),rawFieldText:row,pdfPage:page,printedPage:page===38&&entity==='ABC'?36:page===31?29:page===76?74:page===51?49:50,
    tableTitle:table,rowLabel:row,columnLabel:'31 December 2025 / Amount',sourceRevision,sourceUrl:english[entity].url,localFile:`sources/official-v021/raw/${english[entity].file}`,sha256:english[entity].sha,
    reportTitle:`${entity} 2025 Annual Report`,reportLanguage:'EN',sourceClass:'AUDITED_ENTITY_DISCLOSURE',auditStatus:'VISUALLY_VERIFIED_BY_CODEX',textExtraction:{tool:'pypdf',version:'6.10.0',result:'MATCHED_AND_VISUALLY_RECONCILED'},
    visualReviewStatus:'VISUALLY_VERIFIED_BY_CODEX',visualReviewNotes:'Rendered at 250 DPI from the official English PDF; table heading, 2025 Amount column, row label and unit matched.',parserVersion:'v0.21.0',mappingVersion:'v0.21.0',
    intendedUse:['BANK_SAMPLE_EVIDENCE_ONLY'],limitations:['BANK_SAMPLE_ONLY_NOT_NATIONAL','LOAN_EXPOSURE_NOT_LOSS'],notes
  });
  const records=[
    record('bank_icbc_2025_personal_mortgage','ICBC','PERSONAL_MORTGAGE_LOANS',5875868,31,'Distribution of loans by business line','Residential mortgages','CONSOLIDATED'),
    record('bank_icbc_2025_corporate_real_estate','ICBC','CORPORATE_REAL_ESTATE_LOANS',864576,76,'Distribution of corporate loans and non-performing corporate loans of domestic branches by industry of loan customers','Real estate','DOMESTIC_BRANCHES','Industry-of-loan-customers disclosure for domestic branches, not a group-consolidated figure.'),
    record('bank_abc_2025_personal_mortgage','ABC','PERSONAL_MORTGAGE_LOANS',4816355,38,'Distribution of Retail Loans by Product Type','Residential mortgage loans','CONSOLIDATED'),
    record('bank_abc_2025_corporate_real_estate','ABC','CORPORATE_REAL_ESTATE_LOANS',874310,38,'Distribution of Corporate Loans by Industry','Real estate','CONSOLIDATED','Classification is based on the industries in which borrowers operate.'),
    record('bank_psbc_2025_personal_mortgage','PSBC','PERSONAL_MORTGAGE_LOANS',2373341,51,'Personal Loans by Product Type','Residential mortgage loans','CONSOLIDATED'),
    record('bank_psbc_2025_corporate_real_estate','PSBC','CORPORATE_REAL_ESTATE_LOANS',347818,52,'Corporate Loans by Industry','Real estate','CONSOLIDATED')
  ];
  const coverage=Object.keys(english).map(entity=>({id:`bank_coverage_${entity}_2025`,entity,reportingPeriod:reportPeriod,reportTitle:'2025 Annual Report',sourceClass:'AUDITED_ENTITY_DISCLOSURE',auditStatus:'AUDITED',officialEnglish:{...english[entity],localFile:`sources/official-v021/raw/${english[entity].file}`},officialChinese:chinese[entity]?{...chinese[entity],localFile:`sources/official-v021/raw/${chinese[entity].file}`,relationship:'SAME_REPORT_DIFFERENT_LANGUAGE_VERSION'}:null,mortgageDisclosure:'AUDITED_ENTITY_DISCLOSURE',corporateRealEstateDisclosure:'AUDITED_ENTITY_DISCLOSURE',assetQualityDisclosure:'DISCOVERY_ONLY',lgfvDirectNumericDisclosure:'UNKNOWN',lgfvEvidenceStatus:'DISCOVERY_ONLY',lgfvReviewStatus:'NO_SCOPE_DEFINED_NUMERIC_DISCLOSURE_FOUND',limitations:['BANK_SAMPLE_ONLY_NOT_NATIONAL','LOAN_EXPOSURE_NOT_LOSS','LGFV_AND_INFRASTRUCTURE_EQUIVALENCE_REJECTED']}));
  return {version:'v0.21.0',records,coverage,assessments:[{id:'bank_lgfv_direct_exposure_2025',status:'BLOCKED',value:null,reason:'Reviewed annual-report text discusses LGFV risk management but provides no directly reviewed, scope-defined LGFV numeric exposure.',limitations:['LGFV_AND_INFRASTRUCTURE_EQUIVALENCE_REJECTED','LOCAL_GOV_BOND_AND_LGFV_OVERLAP']},{id:'bank_asset_quality_2025',status:'DISCOVERY_ONLY',value:null,reason:'NPL tables were located but are not converted to PD, realised loss, or a loss-engine input.',limitations:['NPL_RATIO_NOT_PD','ALLOWANCE_NOT_REALIZED_LOSS']}],run:{id:'bank_exposure_live_v021',status:'COMPLETE',targetBanks:Object.keys(english),acquiredBanks:Object.keys(english),acceptedRecords:records.length,rejectedCandidates:0,unknownAssessments:2,fixtureCounted:false}};
})();
