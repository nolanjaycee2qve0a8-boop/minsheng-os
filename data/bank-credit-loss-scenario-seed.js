/* v0.23 configuration only. It contains no loss observation or default parameters. */
window.MinshengBankCreditLossScenarioSeed=(()=>({
  version:'v0.23.0',
  scopeRulesVersion:'bank-credit-loss-scope-rules-1.0.0',
  scopeRules:[
    {id:'scope_icbc_mortgage_2025',bank:'ICBC',portfolio:'PERSONAL_MORTGAGE',exposureId:'bank_icbc_2025_personal_mortgage',nplId:'asset_quality_icbc_2025_personal_mortgage_npl_balance',compatibility:'EXACT_SCOPE_MATCH',semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ICBC',accountingScope:'LOAN_DISCLOSURE'}},
    {id:'scope_icbc_corporate_re_2025',bank:'ICBC',portfolio:'CORPORATE_REAL_ESTATE',exposureId:'bank_icbc_2025_corporate_real_estate',nplId:'asset_quality_icbc_2025_corporate_real_estate_npl_balance',compatibility:'EXACT_SCOPE_MATCH',semantics:{geography:'CHINA_DOMESTIC_BRANCHES',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ICBC',accountingScope:'LOAN_DISCLOSURE'}},
    {id:'scope_abc_mortgage_2025',bank:'ABC',portfolio:'PERSONAL_MORTGAGE',exposureId:'bank_abc_2025_personal_mortgage',nplId:'asset_quality_abc_2025_personal_mortgage_npl_balance',compatibility:'EXACT_SCOPE_MATCH',semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ABC',accountingScope:'LOAN_DISCLOSURE'}},
    {id:'scope_abc_corporate_re_2025',bank:'ABC',portfolio:'CORPORATE_REAL_ESTATE',exposureId:'bank_abc_2025_corporate_real_estate',nplId:'asset_quality_abc_2025_corporate_real_estate_npl_balance',compatibility:'EXACT_SCOPE_MATCH',semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ABC',accountingScope:'LOAN_DISCLOSURE'}},
    {id:'scope_psbc_mortgage_2025',bank:'PSBC',portfolio:'PERSONAL_MORTGAGE',exposureId:'bank_psbc_2025_personal_mortgage',nplId:'asset_quality_psbc_2025_personal_mortgage_npl_balance',compatibility:'EXACT_SCOPE_MATCH',semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'PSBC',accountingScope:'LOAN_DISCLOSURE'}},
    {id:'scope_psbc_corporate_re_2025',bank:'PSBC',portfolio:'CORPORATE_REAL_ESTATE',exposureId:'bank_psbc_2025_corporate_real_estate',nplId:'asset_quality_psbc_2025_corporate_real_estate_npl_balance',compatibility:'SCOPE_MISMATCH_BLOCKED',reason:'PSBC corporate real-estate exposure is consolidated while the accepted NPL disclosure is domestic-branch scope.'}
  ],
  readiness:[
    {id:'v023_bank_sample_scenario_readiness',status:'BANK_SAMPLE_SCENARIO_READY_WITH_EXPLICIT_INPUTS',scope:'BANK_SAMPLE_ONLY',formalBankLoss:'BLOCKED',nationalBankLoss:'BLOCKED',lgfvScenario:'BLOCKED',causalValidation:'PARTIAL'},
    {id:'v023_lgfv_scenario_readiness',status:'LGFV_SCENARIO_BLOCKED',reason:'LGFV direct exposure remains UNKNOWN/BLOCKED.'},
    {id:'v023_national_bank_loss_readiness',status:'NATIONAL_BANK_LOSS_BLOCKED',reason:'Three audited entities cannot be extrapolated to the national banking system.'},
    {id:'v023_formal_bank_loss_readiness',status:'FORMAL_BANK_LOSS_BLOCKED',reason:'Scenario assumptions do not establish an observed or formal bank loss.'}
  ],
  gaps:[
    {id:'v023_gap_property_pd',status:'UNKNOWN',name:'Observed property-credit PD by matching bank, portfolio and scope'},
    {id:'v023_gap_property_lgd',status:'UNKNOWN',name:'Observed property-credit LGD and recovery timing by matching bank, portfolio and scope'},
    {id:'v023_gap_property_allowance',status:'UNKNOWN',name:'Matching property allowance/ECL and capital absorption evidence'},
    {id:'v023_gap_lgfv_asset_quality',status:'UNKNOWN',name:'Direct, auditable LGFV asset-quality exposure'}
  ],
  research:[{id:'research_v023_bank_credit_loss_scenario_boundary',title:'Bank property credit-loss scenarios are explicit assumptions, not observed losses',type:'RESEARCH_METHOD',status:'SCENARIO_ONLY',confidence:null,requiredData:['Explicit scenario migration rate','Explicit scenario LGD','Explicit scenario horizon'],supportingEvidenceIds:[],conclusion:'NPL balances may anchor existing-stock scenarios, but neither published nor derived NPL ratios become PD or migration assumptions.',limitations:['BANK_SAMPLE_ONLY_NOT_NATIONAL','NOT_FORMAL_BANK_LOSS','NO_ALLOWANCE_OR_CAPITAL_NETTING']}]
}))();
