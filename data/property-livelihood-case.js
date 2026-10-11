/* v0.34: deterministic case contract. Scenario assumptions never become REAL observations. */
window.MinshengPropertyLivelihoodCase=Object.freeze({
 version:'v0.34.0',
 caseId:'property_livelihood_transmission_2026h1',
 title:'房地产活动下行情景：居民、银行与地方财政传导',
 question:'房地产活动下行如何影响居民、银行和地方财政；现有证据能支持到哪一步？',
 asOf:'2026-10-04T00:00:00Z',
 evidenceStatementIds:['s_income_pc_h1','s_dev_loan','s_land_gross','s_legal_debt','s_land_share','s_bank_scenario','s_lgfv_gap','s_household_blocked'],
 sectors:[
  {id:'PROPERTY_DEVELOPER',channel:'销售回款与融资',resultStatus:'DIRECTION_ONLY'},
  {id:'HOUSEHOLD',channel:'就业、收入、住房资产与偿债',resultStatus:'UNKNOWN'},
  {id:'BANKING',channel:'开发贷、按揭与抵押品信用损失',resultStatus:'BANK_SAMPLE_SCENARIO_ONLY'},
  {id:'LOCAL_GOVERNMENT',channel:'土地出让毛收入与债务服务',resultStatus:'SCENARIO_ESTIMATE_AVAILABLE'},
  {id:'LGFV',channel:'直接敞口与再融资',resultStatus:'UNKNOWN'},
  {id:'CENTRAL_GOVERNMENT',channel:'政策资源与转移支付响应',resultStatus:'UNKNOWN'}
 ],
 scenarios:[
  {id:'REFERENCE',label:'参照情景',classification:'SCENARIO',propertyActivityShock:0,grossLandRevenueShock:0,unit:'DECIMAL',mappingStatus:'NO_VALIDATED_CROSS_SECTOR_MAPPING'},
  {id:'MODERATE_STRESS',label:'温和压力',classification:'SCENARIO',propertyActivityShock:-0.10,grossLandRevenueShock:-0.10,unit:'DECIMAL',mappingStatus:'NO_VALIDATED_CROSS_SECTOR_MAPPING'},
  {id:'SEVERE_STRESS',label:'严重压力',classification:'SCENARIO',propertyActivityShock:-0.20,grossLandRevenueShock:-0.20,unit:'DECIMAL',mappingStatus:'NO_VALIDATED_CROSS_SECTOR_MAPPING'}
 ],
 excludedInputs:[
  {id:'pboc_202608_limited_acceptance',status:'EXCLUDED',reason:'MONETARY_SNAPSHOT_NOT_PROPERTY_EXPOSURE; APPROVAL_EVIDENCE_INCOMPLETE; PRIVATE_RAW_NOT_REVALIDATED'},
  {id:'private_raw_package',status:'NOT_AVAILABLE',reason:'OFFICIAL_HELPER_DOWNLOAD_FAILED_BEFORE_MATERIALIZATION'},
  {id:'browser_user_state',status:'UNKNOWN',reason:'NOT_SUPPLIED'}
 ],
 mandatoryLimitations:['SCENARIO_NOT_FORECAST','NO_VALIDATED_CROSS_SECTOR_MAPPING','NO_CROSS_SECTOR_TOTAL','GROSS_REVENUE_NOT_NET_FISCAL_RESOURCE','BANK_SAMPLE_NOT_NATIONAL','PRIVATE_RAW_NOT_REVALIDATED']
});
