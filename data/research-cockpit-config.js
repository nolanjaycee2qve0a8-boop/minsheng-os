/* v0.29 configuration only: routes, labels and mandatory semantic warnings. No observations live here. */
window.MinshengResearchCockpitConfig={version:'v0.29.0',modules:[
 {id:'data-sources',label:'数据与来源',collections:['records','sourceDocuments','files','rawPayloads'],warning:'UNKNOWN 不得显示为零；来源资格与完整 provenance 必须保留。'},
 {id:'sector-ledgers',label:'六部门账表',collections:['sectorBalanceSheets','sectorExposures','sectorDataGaps'],warning:'UNKNOWN、PARTIAL 与已观测数值严格区分。'},
 {id:'critical-exposures',label:'关键敞口资格',collections:['criticalExposureItems','qualificationAssessments','calculationReadinessRecords'],warning:'资格不足的数据不得进入正式计算。'},
 {id:'household-mortgage',label:'居民按揭与收入情景',collections:['mortgageScenarioRuns','distributionEvidence','mortgageCohortRuns'],warning:'情景不是 REAL；缺失的收入、期限与流动性信息不可补零。'},
 {id:'developer-land',label:'房企现金流与土地财政',collections:['developerCashflowRuns','realEstateFundingEvidence','officialDerivedRecords'],warning:'土地出让毛收入不是净财政资源；情景不是 REAL。'},
 {id:'bank-evidence',label:'银行房地产敞口与资产质量',collections:['bankDisclosureRecords','bankAssetQualityRecords','bankAssetQualityDerivedRecords'],warning:'银行样本不代表全国；不良率不是 PD。'},
 {id:'bank-loss',label:'银行信用损失情景',collections:['bankCreditLossScenarioRuns','bankCreditLossScenarioMatrices','bankCreditLossScenarioReadiness'],warning:'情景不是 REAL；不良率不是 PD，样本不得升级为全国损失。'},
 {id:'cross-sector',label:'跨部门情景工作台',collections:['crossSectorScenarioCases','crossSectorScenarioComparisons','crossSectorConsistencyAssessments'],warning:'跨部门结果不可直接加总；NO_CROSS_SECTOR_TOTAL 持续有效。'},
 {id:'causal',label:'因果证据与参数资格',collections:['causalStudyRecords','causalEstimateRecords','causalParameterCandidates','causalEdges'],warning:'相关或研究估计不自动构成因果结论。'},
 {id:'uncertainty',label:'确定性不确定性区间',collections:['scenarioRunsV2','scenarioParameters','parameterVersions'],warning:'确定性区间不是统计置信区间；情景不是预测。'},
 {id:'forecast-monitor',label:'预测与实际结果监测',collections:['forecastRegistrations','outcomeRecords','evaluationRuns','forecastOutcomeMatches'],warning:'Forecast、scenario 与 retrospective 不得混同。'},
 {id:'gdp-vintages',label:'中国 GDP Forecast Vintage',collections:['chinaGdpForecastVintages','chinaGdpActualVintages','chinaGdpBenchmarkSelections','chinaGdpBenchmarkAggregates'],warning:'后期 Vintage 具有信息优势；小样本不形成机构排名。'},
 {id:'international',label:'国际统计比较',collections:['internationalObservationRecords','internationalComparisons','internationalComparisonAssessments'],warning:'国际比较不替代国内官方统计，也不写入国内正式记录。'},
 {id:'research-gaps',label:'研究记录与数据缺口',collections:['research','evidence','sectorDataGaps','inbox'],warning:'研究候选与数据缺口不等于已验证结论。'},
 {id:'audit-stale',label:'审计、修订和 STALE 状态',collections:['auditLog','officialRevisionEvents','downstreamStaleness','methodologyEvents'],warning:'STALE 不能视为当前结论；修订链和原始定位必须保留。'},
 {id:'official-data-operations',label:'官方数据运维',collections:['officialOpsRegistry','officialOpsRuns','officialOpsArtifacts','officialOpsCandidates','officialOpsSemanticDiffs','officialOpsApprovals','officialOpsSubmissions','officialOpsSourceHealth','officialOpsRecoveryEvents','officialReleaseCalendars','officialWatchJobs','officialReviewQueue','officialWatchLocks','officialSchedulerStatus','officialWatchRuns'],warning:'本模块只读展示日历、watch、review 与审计结果：LIVE 获取不等于 REAL，未获明确审批不得提交；静态页面不会启动后台采集。',cliCommand:'python tools/run_v031_watch.py --watch --due-only --dry-run --as-of 2026-08-22T00:00:00Z'}
 ,{id:'research-briefings',label:'研究简报',collections:['researchBriefings','briefingStatements','briefingHistory'],warning:'事实、派生、预测和情景不可混同；简报不是投资建议；UNKNOWN 不会补零，跨部门结果不可加总。',cliCommand:'node tools/run_v032_briefing.js --type COMBINED_RESEARCH_BRIEF --format markdown --dry-run'}
],departments:[
 {id:'HOUSEHOLD',label:'居民',keys:['HOUSEHOLD','MORTGAGE','INCOME','RESIDENT']},
 {id:'PROPERTY_DEVELOPER',label:'开发商',keys:['PROPERTY_DEVELOPER','DEVELOPER','REAL_ESTATE','PROPERTY']},
 {id:'BANKING',label:'银行',keys:['BANK','BANKING','MORTGAGE','NPL']},
 {id:'LOCAL_GOVERNMENT',label:'地方政府',keys:['LOCAL_GOVERNMENT','LOCAL_DEBT','LAND_FISCAL','LAND_REVENUE']},
 {id:'LGFV',label:'LGFV',keys:['LGFV']},
 {id:'CENTRAL_GOVERNMENT',label:'中央政府',keys:['CENTRAL_GOVERNMENT','CENTRAL_FISCAL','CENTRAL_']}
],stateVersion:1,pageSizes:[10,25,50]};
