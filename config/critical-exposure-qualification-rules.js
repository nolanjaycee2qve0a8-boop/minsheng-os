/* v0.13 qualification rules are deterministic, intended-use aware, and deliberately conservative. */
window.MinshengCriticalExposureQualificationRules={
 version:'v0.13.0',
 allowedSemanticTypes:['DIRECT_OBSERVATION','DERIVED','PROXY','ASSUMPTION','MOCK','UNKNOWN'],
 formalUse:'FORMAL_REAL_NUMERIC_LOSS',
 requiredFields:['sourceRef','period','asOf','unit','dataNature','sectorScope','geography','valueType'],
 blockingQualityFlags:['UNRESOLVED_SCOPE_CONFLICT','UNRESOLVED_UNIT_CONFLICT','DUPLICATE_RISK','STOCK_FLOW_MISMATCH'],
 causalEvidenceStrength:{OFFICIAL_DIRECT_STATISTIC:4,OFFICIAL_INDIRECT_STATISTIC:3,AUDIT_OR_REGULATORY_DISCLOSURE:3,INSTITUTION_RESEARCH:2,ACADEMIC_RESEARCH:2,COMPANY_SAMPLE:1,NEWS_OR_EXPERT:1,MODEL_INFERENCE:0,UNVERIFIED_HYPOTHESIS:0,CORRELATION_ONLY:0},
 readinessRequirements:{
  PROPERTY_SALES_DEVELOPER_LOCAL_FISCAL:{directional:true,items:['developer_sales_cash_flow','developer_financing','land_related_fiscal_revenue'],intendedUse:'PROPERTY_SALES_TO_LOCAL_FISCAL_NUMERIC'},
  HOUSEHOLD_INCOME_DEBT_LIQUIDITY:{directional:true,items:['household_disposable_income_total','household_mortgage_balance','household_debt_service'],intendedUse:'HOUSEHOLD_INCOME_TO_LIQUIDITY_NUMERIC'}
 }
};
