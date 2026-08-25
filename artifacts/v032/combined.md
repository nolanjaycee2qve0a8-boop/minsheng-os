# COMBINED_RESEARCH_BRIEF

As-of: 2026-08-23T00:00:00Z

- 官方发布显示：全国居民人均可支配收入截至2026-H1，记录值为22981元（范围：HOUSEHOLD_PER_CAPITA_NATIONAL）。 Evidence: doc_nbs_household_income_2026h1:表1/全国居民人均可支配收入
- 官方发布显示：房地产开发贷款余额截至2026-06，记录值为12.65万亿元（范围：PROPERTY_DEVELOPMENT_LOANS）。 Evidence: doc_pboc_loan_destination_2026q2_v015:房地产贷款
- 官方发布显示：国有土地使用权出让收入截至2026-H1，记录值为9778亿元（范围：LOCAL_GOVERNMENT_GROSS_LAND_TRANSFER）。 Evidence: doc_mof_fiscal_2026h1_v015:政府性基金预算
- 官方发布显示：地方政府法定债务余额截至2026-06，记录值为587706亿元（范围：LOCAL_GOVERNMENT_LEGAL_DEBT）。 Evidence: doc_mof_local_debt_2026m06_v015:地方政府债务余额
- 按已登记公式计算，土地出让收入占地方政府性基金本级收入比重为76.11%；公式：record_mof_land_transfer_revenue_2026h1_v015 / record_mof_local_fund_own_revenue_2026h1_v015 × 100。 Evidence: derived:land_transfer_share_of_local_fund_2026h1
- 机构预测相对首次发布实际值的误差为-0.5百分点；预测不等于实际。 Evidence: doc_wb_update_2025_06:p24, doc_nbs_2025_communique:National accounts
- 在显式假设下，银行房地产信用损失情景能力为BANK_SAMPLE_SCENARIO_READY_WITH_EXPLICIT_INPUTS；该结果属于银行样本情景。 Evidence: v023_bank_sample_scenario_readiness
- 当前没有合格数据：LGFV 直接、可审计敞口。 Evidence: v023_lgfv_scenario_readiness
- 正式计算继续阻断：居民正式债务服务计算。 Evidence: household_income_per_capita_national_h1_2026
- 来源监测记录：部分官方路由存在失败或待复核路由，既有 REAL 不因此失效。 Evidence: sources/official-v031/manifests/live-due-only-v031.json

## 强制限制
- 人均累计收入，不得扩展为居民总收入。
- 仅为一种融资工具，不代表完整房企融资。
- 毛收入，不是净财政资源。
- 不包括 LGFV 与隐性债务。
- 按已登记公式计算；不是净财政资源。
- 预测不等于实际；仅一个可评价样本，不形成机构排名。
- 情景不是预测或现实损失；银行样本不代表全国。
- 当前没有合格数据；不得以相邻概念替代。
- 按揭余额不等于偿债流；缺利率、期限、摊还与分布。
- 路由失败不使既有 REAL 失效。