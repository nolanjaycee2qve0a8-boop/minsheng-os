/* Transparent, central research thresholds. They classify available REAL series; they are not a forecasting model. */
window.MinshengRegimeFeatureConfig={
 minHistoryN:24,
 minZScoreN:24,
 directionThresholds:{veryWeakPercentile:.25,weakPercentile:.45,strongPercentile:.75,veryStrongPercentile:.9},
 staleAfterPeriods:3,
 features:{
  m2_yoy_derived_official:{indicatorId:'money_m2_yoy_derived_official',label:'M2 derived official YoY',transformation:'YOY',higherIsStronger:true,allowDerivedFromReal:true},
  industrial_value_added_yoy:{indicatorId:'industrial_value_added_yoy',label:'Industrial value added monthly YoY',transformation:'MONTHLY_YOY',higherIsStronger:true},
  retail_sales_ytd_yoy:{indicatorId:'retail_sales_ytd_yoy',label:'Retail sales YTD YoY',transformation:'YTD_YOY',higherIsStronger:true},
  property_sales_area_ytd_yoy:{indicatorId:'property_sales_area_yoy',label:'Property sales area YTD YoY',transformation:'YTD_YOY',higherIsStronger:true},
  social_financing_stock_yoy:{indicatorId:'social_financing_stock_yoy',label:'Social financing stock YoY',transformation:'YOY',higherIsStronger:true},
  household_loan_change:{indicatorId:'household_loan_change',label:'Household loan change',transformation:'YTD_FLOW',higherIsStronger:true},
  household_deposit_change:{indicatorId:'household_deposit_change',label:'Household deposit change',transformation:'YTD_FLOW',higherIsStronger:true},
  m1_m2_gap:{indicatorId:'m1_m2_gap',label:'M1 minus M2 YoY gap',transformation:'YOY_GAP',higherIsStronger:true},
  export_yoy:{indicatorId:'export_yoy',label:'Exports YoY',transformation:'YOY',higherIsStronger:true},
  cpi_yoy:{indicatorId:'cpi_yoy',label:'CPI YoY',transformation:'YOY',higherIsStronger:true},
  policy_support_actions:{policyMetric:'actions',label:'Reviewed policy support actions',transformation:'POLICY_EVIDENCE',higherIsStronger:true},
  policy_priority_shift:{policyMetric:'priorityShift',label:'Reviewed policy priority shift',transformation:'POLICY_EVIDENCE',higherIsStronger:true},
  policy_risk_commitment:{policyMetric:'riskCommitment',label:'Reviewed financial-risk commitment',transformation:'POLICY_EVIDENCE',higherIsStronger:true}
 }
};
