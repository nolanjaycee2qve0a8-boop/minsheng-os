/* Deterministic rules for PBOC Financial Statistics Reports. No NLP or inferred values. */
window.MinshengPbocParserRules={version:'pboc-stat-report-1.0.0',rules:[
  {id:'pboc_m0_balance',sourceField:'M0',indicatorId:'money_m0',keywords:['流通中货币','M0'],observationType:'stock',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'流通中货币[（(]M0[）)]余额(?:为|达)?([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_m1_balance',sourceField:'M1',indicatorId:'money_m1',keywords:['狭义货币','M1'],observationType:'stock',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'狭义货币[（(]M1[）)]余额(?:为|达)?([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_m2_balance',sourceField:'M2',indicatorId:'money_m2',keywords:['广义货币','M2'],observationType:'stock',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'广义货币[（(]M2[）)]余额(?:为|达)?([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_rmb_loan_balance',sourceField:'人民币贷款余额',indicatorId:'rmb_loan_balance',keywords:['人民币贷款余额'],observationType:'stock',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'人民币贷款余额(?:为|达)?([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_rmb_deposit_balance',sourceField:'人民币存款余额',indicatorId:'rmb_deposit_balance',keywords:['人民币存款余额'],observationType:'stock',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'人民币存款余额(?:为|达)?([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_household_loan_change',sourceField:'住户贷款增加',indicatorId:'household_loan_change',keywords:['住户贷款'],observationType:'flow',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'住户贷款(增加|减少)([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_household_deposit_change',sourceField:'住户存款增加',indicatorId:'household_deposit_change',keywords:['住户存款'],observationType:'flow',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'住户存款(增加|减少)([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_rmb_loan_flow',sourceField:'人民币贷款增加',indicatorId:'rmb_loan_change',keywords:['人民币贷款'],observationType:'flow',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'人民币贷款(增加|减少)([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_rmb_deposit_flow',sourceField:'人民币存款增加',indicatorId:'rmb_deposit_change',keywords:['人民币存款'],observationType:'flow',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'人民币存款(增加|减少)([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_social_financing_stock',sourceField:'社会融资规模存量',indicatorId:'social_financing_stock',keywords:['社会融资规模存量'],observationType:'stock',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'社会融资规模存量(?:为|达)?([0-9,.]+)(万亿元|亿元)'},
  {id:'pboc_social_financing_flow',sourceField:'社会融资规模增量',indicatorId:'social_financing_flow',keywords:['社会融资规模增量'],observationType:'flow',transformation:'raw',unitPattern:'万亿元|亿元',valuePattern:'社会融资规模增量(增加|减少|累计)?(?:为|达)?([0-9,.]+)(万亿元|亿元)'}
]};
