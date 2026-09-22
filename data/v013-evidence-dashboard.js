/* v0.13 local evidence dashboard: only existing, deidentified n>=30 aggregates. */
window.MinshengV013EvidenceDashboard = Object.freeze({
  version: 'v0.13.0-local-evidence',
  title: 'v0.13 国内需求、劳动购买力与资产负债表',
  notice: '年份切换仅展示独立单年聚合视图：不可跨年比较、不可看趋势，也不构成因果、预测或政策结论。',
  sourceRefs: {
    chfs2017: { label: 'CHFS 2017 家庭资产负债表基线', artifact: 'v013-chfs2017-unified-baseline-rebuild.json', sha256: '46916AE06BEDF0F408F788C2A11B711DDAFB6556B293997A5606E03BB39BD7F2', markdownArtifact: 'v013-chfs2017-unified-baseline-rebuild.md', markdownSha256: '864730074FD59A023F0C5BCE0280E859072EC11B5726B3A2DDD27F185BA57221', attestationArtifact: 'v013-chfs2017-unified-baseline-rebuild-attestation.json', attestationSha256: '2B2BB410C545E5D9244E9FE72BDD2788C39D5371E215B3A2DB4C62BBB6376FF5' },
    chfs2019: { label: 'CHFS 2019 家庭资产负债表基线', artifact: 'v013-chfs2019-approved-unified-baseline.json', sha256: '9B8D9A835F1835F3A39A56F331DDE47D54391D0DC13A913039DAF3620307DC58', markdownArtifact: 'v013-chfs2019-approved-unified-baseline.md', markdownSha256: '0591D3EC5DB8060AA0DF2A3B9E03D0953EE56A3D1F0DF75ADEE335B13267DE89', attestationArtifact: 'v013-chfs2019-approved-unified-baseline-attestation.json', attestationSha256: '73E7F32749C7C03AB623550D9227D0782DF923E35E9FF3292DCCF5A6F794172E' },
    chfs2021: { label: 'CHFS 2021 家庭资产负债表基线', artifact: 'v013-chfs2021-household-balance-sheet-baseline-rebuild.json', sha256: '55BA00940BBCE6B63BB6EC3A727D1C1B22B14DD05F6C08475E8D54C9277AD4E7', markdownArtifact: 'v013-chfs2021-household-balance-sheet-baseline-rebuild.md', markdownSha256: '7A9186149655928845971419C005F2D24F4332437225C49F3563149725366645', attestationArtifact: 'v013-chfs2021-household-balance-sheet-baseline-rebuild-attestation.json', attestationSha256: 'C85155F5C618190073D65FDA90DE5BBC5BAD84548B47EA7DDD34B7EE424AB3BB' },
    cmes2015: { label: 'CMES 2015 企业描述性基线', artifact: 'v013-cmes2015-two-field-strict-slice-rebuild.json', sha256: '68806EBDB509ECC4D0ACD17D3D8D70C1BD5F315BB2E70A434FDB711A131D164B', markdownArtifact: 'v013-cmes2015-two-field-strict-slice-rebuild.md', markdownSha256: 'BBC053FB9DF28805E0B9EB84001DFBAFE533549E33679D258526516291DEC03B', attestationArtifact: 'v013-cmes2015-two-field-strict-slice-rebuild-attestation.json', attestationSha256: 'A90982437682904B19E37F73F3221F3E0DB1D01AA9A58FD0A45E16F8BBEBB307' },
    cmes2015HeaderAudit: { label: 'CMES 2015 企业表头语义审计', artifact: 'v013-cmes2015-firm-master-header-semantic-audit-rebuild.json', sha256: '0831B0CE4A337FED28B864BE7FFC0FF64965D80FEA683BE4B87D46058831BA51', markdownArtifact: 'v013-cmes2015-firm-master-header-semantic-audit-rebuild.md', markdownSha256: '0B63023A2813544F1AD5A97CBF7890ED5D7269E6CA254718E2ACC3F1659F9BD9', attestationArtifact: 'v013-cmes2015-firm-master-header-semantic-audit-rebuild-attestation.json', attestationSha256: '2A9D85E9193C5C015DC035CC2660A492A25449829947DB0AC32C7FB17E39EFF6' },
    cmes2015FirmSpecification: { label: 'CMES 2015 企业侧语义规格', artifact: 'v013-cmes2015-firm-side-semantic-specification-rebuild.json', sha256: '3FB11C100A9931E5569C55124649D6641796C71F643C7FD00EB69C7F03C19FC7', markdownArtifact: 'v013-cmes2015-firm-side-semantic-specification-rebuild.md', markdownSha256: '462875BE708ED99EB6E14CBB85D9FA153226233BC79F8EA020EE86A78D33FC00', attestationArtifact: 'v013-cmes2015-firm-side-semantic-specification-rebuild-attestation.json', attestationSha256: 'F692F2896B79A96FE164EACFCB56042E0064A7BFC94196A5792A57A77C3A96F9' },
    cmes2015CompanionAudit: { label: 'CMES 2015 企业伴随文档语义审计', artifact: 'v013-cmes2015-firm-companion-document-semantic-audit-rebuild.json', sha256: '508DEB2F430B7801D393618047FE2E3B50C614C1479F5E50D40850710A29B7CF', markdownArtifact: 'v013-cmes2015-firm-companion-document-semantic-audit-rebuild.md', markdownSha256: '67B2F4576BAB349569BC749966A432B8956D95BA1321E95969CFA617A749F3E1', attestationArtifact: 'v013-cmes2015-firm-companion-document-semantic-audit-rebuild-attestation.json', attestationSha256: 'CD1846A64B7390A52A4A7A7FF9A0E56D7DBF76CF58F44967FCE078A781E8331E' },
    cmes2015AuthorizationNormalization: { label: 'CMES 2015 Manager→Worker 授权链正常化', artifact: 'v013-cmes2015-authorization-delegation-normalization-rebuild.json', sha256: 'AB0BEB4F0E46BA8B7BF53B6B123F98929ADEC1E9FA685476607A06C932B64783', markdownArtifact: 'v013-cmes2015-authorization-delegation-normalization-rebuild.md', markdownSha256: '48E1F24484DDA7A121F44D665998DD09C8540D00BDE9AB2E36080E6E7F9A730F', attestationArtifact: 'v013-cmes2015-authorization-delegation-normalization-rebuild-attestation.json', attestationSha256: '51E2FB8374B34BA83E9F15018589F9CC7989CDE86B3332DD86B6AD97F58796AA' },
    chfs2021FinancialResilienceDescriptor: { label: 'CHFS 2021 家庭财务承压描述', artifact: 'v013-chfs2021-household-financial-resilience-descriptor-strict-padding-rebuild.json', sha256: 'F64AEF10C707E5598642761037D1451DB3A7DBFA6ACCA1CC5D15503E3BDD8457', markdownArtifact: 'v013-chfs2021-household-financial-resilience-descriptor-strict-padding-rebuild.md', markdownSha256: '36778675FF8F307E11FAEF5E660EA299F857B1114D15BC1DC1FB3F501A06B47A', attestationArtifact: 'v013-chfs2021-household-financial-resilience-descriptor-strict-padding-rebuild-attestation.json', attestationSha256: '39145096E764625D994C3CF1C737C0D7B35CF1EDCFBA1D2965B191DA84E8CAA7' },
    chfs2021AssetComponentAudit: { label: 'CHFS 2021 家庭资产分项表头与说明文档语义审计', artifact: 'v013-chfs2021-household-asset-component-header-and-companion-document-semantic-audit.json', sha256: '40CE2567F48ADD8CC8CDACFEFB7D26D784D3AF95A1C740F9391A7A823E5227BF' },
    chfs2021AssetQualityProfile: { label: 'CHFS 2021 家庭资产分项字段质量资格', artifact: 'v013-chfs2021-household-asset-component-field-quality-profile-pandas-recovery.json', sha256: 'B2F71AE21AF96543F2A0ACF119468438DF25FBD621E04CF31F713CFA8EE1BC86', markdownSha256: '4260FCB7DEBFDD0EA3E5359CE7CCDF9A44FC56FB59118E423A4D5E5C962DF35F', attestationSha256: '5A44EFB9E190C9CCAAFAF991B54646693574D5571B4343B53F39CA677E1B0BA3' },
    chfs2021DebtAuthorizationNormalization: { label: 'CHFS 2021 家庭债务分项审计授权链正常化', artifact: 'v013-chfs2021-household-debt-component-semantic-audit-authorization-normalization.json', sha256: '95CB7B7D43155473CC2155E81B7B839162437C533702B82E01E3F4FA7D3543D3' },
    chfs2021DebtQualityProfile: { label: 'CHFS 2021 家庭债务分项字段质量画像', artifact: 'v013-chfs2021-household-debt-component-field-quality-profile.json', sha256: '27DEEF9830A7FFDCCE15382358DC3F30777F1DB7C83FFF8AEA2BE78EC5985268' },
    chfs2021HousingDebtBoundary: { label: 'CHFS 2021 住房债务—偿债服务语义边界审计', artifact: 'v013-chfs2021-housing-debt-service-semantic-boundary-audit.json', sha256: 'AF49B84FD7BB0A4E89CEC1AD6436DE0AE852401DC7D542EE605A27B7AFF6F3FA' }
  },
  years: {
    '2017': { sourceId: 'chfs2017', nRule: '每个已呈现聚合单元均满足 unweighted n >= 30；本表仅为全国、城乡与东中西东北的 2017 单年聚合，不可跨年比较或看趋势。', groups: {
      national: { label: '全国样本聚合', total_income: [39941, 52798.51, 0], total_consump: [40011, 43312, 0], total_asset: [40011, 363000, 0], total_debt: [40011, 0, 0] },
      urban: { label: '城镇', total_income: [27221, 64027.08, 0], total_consump: [27279, 50631.86, 0], total_asset: [27279, 509140.21, 0], total_debt: [27279, 0, 0] },
      rural: { label: '农村', total_income: [12720, 24246.77, 0], total_consump: [12732, 26344, 0], total_asset: [12732, 149218.97, 0], total_debt: [12732, 0, 0] },
      east: { label: '东部', total_income: [17809, 65817.76, 0], total_consump: [17839, 49343, 0], total_asset: [17839, 630416.37, 0], total_debt: [17839, 0, 0] },
      central: { label: '中部', total_income: [7610, 46770.33, 0], total_consump: [7621, 38200, 0], total_asset: [7621, 293226.45, 0], total_debt: [7621, 0, 0] },
      west: { label: '西部', total_income: [9513, 41992.54, 0], total_consump: [9530, 41440, 0], total_asset: [9530, 290001.6, 0], total_debt: [9530, 0, 0] },
      northeast: { label: '东北', total_income: [5009, 51084.61, 0], total_consump: [5021, 40069.91, 0], total_asset: [5021, 234303.13, 0], total_debt: [5021, 0, 0] }
    }},
    '2019': { sourceId: 'chfs2019', nRule: '每个已呈现聚合单元均满足 unweighted n >= 30；本表仅为全国、城乡与东中西东北的 2019 单年聚合，不可跨年比较或看趋势；债务中位数的分母/缺失边界见单元脚注。', groups: {
      national: { label: '全国样本聚合', total_income: [34643, 46986.89, 0], total_consump: [34643, 51980, 0], total_asset: [34643, 352500, 0], total_debt: [27390, 0, 0.21] },
      urban: { label: '城镇', total_income: [22381, 63835.45, 0], total_consump: [22381, 64309.71, 0], total_asset: [22381, 576251.29, 0], total_debt: [16041, 0, 0.28] },
      rural: { label: '农村', total_income: [12262, 23146.28, 0], total_consump: [12262, 32806.98, 0], total_asset: [12262, 160017.32, 0], total_debt: [11349, 0, 0.07] },
      east: { label: '东部', total_income: [12930, 59436.94, 0], total_consump: [12930, 60300, 0], total_asset: [12930, 640500, 0], total_debt: [10491, 0, 0.19] },
      central: { label: '中部', total_income: [7532, 41417.75, 0], total_consump: [7532, 46299.57, 0], total_asset: [7532, 305055.41, 0], total_debt: [6247, 0, 0.17] },
      west: { label: '西部', total_income: [10471, 40066.58, 0], total_consump: [10471, 50240.49, 0], total_asset: [10471, 288001.51, 0], total_debt: [8234, 0, 0.21] },
      northeast: { label: '东北', total_income: [3710, 40008.22, 0], total_consump: [3710, 42942.04, 0], total_asset: [3710, 197029.12, 0], total_debt: [2418, 0, 0.35] }
    }},
    '2021': { sourceId: 'chfs2021', nRule: '每个已呈现聚合单元均满足 unweighted n >= 30；本表仅为全国、城乡与东中西东北的 2021 单年聚合，不可跨年比较或看趋势；此处为既有加权中位数的静态呈现。', groups: {
      national: { label: '全国样本聚合', total_income: [22027, 52670, 0], total_consump: [22027, 56324, 0], total_asset: [22027, 476500, 0], total_debt: [22027, 0, 0] },
      urban: { label: '城镇', total_income: [13324, 70350, 0], total_consump: [13324, 66124, 0], total_asset: [13324, 697145, 0], total_debt: [13324, 0, 0] },
      rural: { label: '农村', total_income: [8703, 26200, 0], total_consump: [8703, 37256, 0], total_asset: [8703, 232000, 0], total_debt: [8703, 0, 0] },
      east: { label: '东部', total_income: [8104, 70765, 0], total_consump: [8104, 66710, 0], total_asset: [8104, 831720, 0], total_debt: [8104, 0, 0] },
      central: { label: '中部', total_income: [3833, 48800, 0], total_consump: [3833, 50420, 0], total_asset: [3833, 409100, 0], total_debt: [3833, 0, 0] },
      west: { label: '西部', total_income: [8122, 48419.25, 0], total_consump: [8122, 54989, 0], total_asset: [8122, 446934, 0], total_debt: [8122, 0, 0] },
      northeast: { label: '东北', total_income: [1968, 44400, 0], total_consump: [1968, 45191, 0], total_asset: [1968, 226100, 0], total_debt: [1968, 0, 0] }
    }}
  },
  metrics: {
    total_income: { label: '家庭总收入', unit: 'RMB', boundary: '独立单年家庭聚合；不作跨年比较。' },
    total_consump: { label: '家庭总消费', unit: 'RMB', boundary: '独立单年家庭聚合；不作跨年比较。' },
    total_asset: { label: '家庭总资产', unit: 'RMB', boundary: '独立单年家庭聚合；不作跨年比较。' },
    total_debt: { label: '家庭总负债', unit: 'RMB', boundary: '中位数为零不等于无债；以各单元有效分母与缺失率为准。' }
  },
  cmes2015: { sourceId: 'cmes2015', status: 'LIMITED_DESCRIPTIVE_ONLY', items: [
    { label: '当前员工数', unit: 'EMPLOYEE_COUNT', n: 4955, median: 15, missing: 0.0986, boundary: '未加权；企业描述性字段，不代表全国企业。' },
    { label: '2014 年企业利润用于再投资比例（%）', unit: 'PERCENT', n: 2157, median: 30, missing: 0.6076, boundary: '未加权；缺失率高，不能用于利润—工资—消费传导推断。' }
  ]},
  cmes2015FirmQualifications: {
    status: 'FIRM_SIDE_SEMANTIC_CONTRACT_ONLY',
    title: 'CMES 2015 企业侧字段资格',
    referenceYear: '2015',
    authorization: 'SATISFIED_MANAGER_SCOPED_AUTHORIZATION',
    numericReadiness: 'BLOCKED',
    noChfsLinkage: true,
    non2015Boundary: '仅为 CMES 2015 静态字段证据；当前 CHFS 年份选择不会改变本面板，也不得被解释为时间可比。',
    boundary: '已记录字段候选不等于已可统计的经济指标；本区不显示企业统计值。授权链仅确认任务范围，不构成数值准入。',
    unknowns: ['单位/币种', '财务期间', '样本框', '权重', '地理', '行业资格', '缺失/截尾', '统计代表性'],
    prohibited: 'NO_CHFS_LINKAGE：禁止企业—家庭因果链、代表性声明、货币统计、比率、跨年比较、预测或通缩结论。',
    sourceIds: ['cmes2015CompanionAudit', 'cmes2015AuthorizationNormalization'],
    fields: [
      { id: 'operatingRevenueSales', label: '收入/销售', status: 'DOCUMENTED / PARTIAL', candidates: 'ba5003 / ba5021g', reason: '文档支持收入/销售候选；单位/币种、财务期间、样本与统计合同未闭合。' },
      { id: 'reinvestment', label: '再投资比例', status: 'CONDITIONAL / PARTIAL', candidates: 'f4012a', reason: '仅为利润用于再投资的条件性候选；分母、利润口径和处理合同未闭合。' },
      { id: 'inventory', label: '库存', status: 'DOCUMENTED / PARTIAL', candidates: 'f2002 / ba6001', reason: '文档支持存货价值和盘点间隔候选；估值、单位和统计合同未闭合。' },
      { id: 'employeeCount', label: '员工数', status: 'DOCUMENTED / PARTIAL', candidates: 'c1002 / c2002 / c2003', reason: '文档支持当前、正式和非正式员工候选；参照时点、样本框和代表性未闭合。' },
      { id: 'wages', label: '税前工资/收入', status: 'DOCUMENTED / PARTIAL', candidates: 'c2009_1 / c2009_2 / c2009_3', reason: '文档支持税前收入/工资候选；工时、单位/币种和处理合同未闭合。' },
      { id: 'socialInsuranceCosts', label: '社保成本', status: 'DOCUMENTED / PARTIAL', candidates: 'c2015_1 / c2015_2 / c4004', reason: '文档支持企业缴纳保费和五险一金候选；口径、期间和归属合同未闭合。' },
      { id: 'borrowing', label: '借款', status: 'DOCUMENTED / PARTIAL', candidates: 'e1019 / e1021 / e1025', reason: '文档支持贷款笔数、金额和期限候选；债务范围、时点、单位和统计合同未闭合。' },
      { id: 'salesChannels', label: '销售渠道', status: 'CONDITIONAL / PARTIAL', candidates: 'ba5001 / bb5001 / bb5003', reason: '渠道、电商和客户集中度仅为分段条件性候选；分类互斥、企业覆盖与期间未闭合。' },
      { id: 'industryCode', label: '行业资格', status: 'UNKNOWN / BLOCKED', candidates: 'a1005 / ba1008', reason: '候选代码存在，但分类标准、适用范围与外推资格均未闭合。' },
      { id: 'profit', label: '利润', status: 'CONDITIONAL / PARTIAL', candidates: 'bi4004', reason: '仅确认利润/分红存在性候选，不等于利润金额、利润率、现金流或传导指标。' },
      { id: 'cashFlow', label: '经营现金流', status: 'BLOCKED', candidates: '无直接字段', reason: 'task-52 未识别直接经营现金流字段；禁止由利润、再投资或资本开支候选重建。' },
      { id: 'enterpriseWeight', label: '企业权重', status: 'BLOCKED', candidates: '无直接表头字段', reason: '审计未确认企业权重，禁止假定加权或全国外推。' },
      { id: 'regionCode', label: '地区编码', status: 'BLOCKED', candidates: '无直接表头字段', reason: '审计未确认地区编码，禁止地区比较或外推。' }
    ]
  },
  chfs2021FinancialResilience: {
    status: 'DESCRIPTIVE_2021_ONLY',
    year: '2021',
    sourceId: 'chfs2021FinancialResilienceDescriptor',
    noCmesOrCrossYearLinkage: true,
    boundary: '仅 2021 年、仅描述性加权中位数。债务或比率中位数为零不代表没有负债；收入分母小于等于零、缺失或其他不合格记录均已排除并计入排除率。',
    prohibited: '禁止跨年比较、因果、预测、通缩解释或家庭健康判断；NO_CMES_OR_CROSS_YEAR_LINKAGE。',
    ratios: [
      { id: 'debtToIncome', label: '债务/收入比' },
      { id: 'debtToAsset', label: '资产负债率（负债/资产）' },
      { id: 'consumptionToIncome', label: '消费/收入比' }
    ],
    groups: [
      { id: 'NATIONAL', label: '全国', debtToIncome: { n: 21411, median: 0, exclusionRate: 0.027965678485495075 }, debtToAsset: { n: 22021, median: 0, exclusionRate: 0.00027239297226131566 }, consumptionToIncome: { n: 21411, median: 1.0518684098250746, exclusionRate: 0.027965678485495075 } },
      { id: 'URBAN', label: '城镇', debtToIncome: { n: 12989, median: 0, exclusionRate: 0.025142599819873913 }, debtToAsset: { n: 13318, median: 0, exclusionRate: 0.0004503152206544581 }, consumptionToIncome: { n: 12989, median: 0.9537294387050536, exclusionRate: 0.025142599819873913 } },
      { id: 'RURAL', label: '农村', debtToIncome: { n: 8422, median: 0, exclusionRate: 0.032287716879237045 }, debtToAsset: { n: 8703, median: 0, exclusionRate: 0 }, consumptionToIncome: { n: 8422, median: 1.3579545454545454, exclusionRate: 0.032287716879237045 } },
      { id: 'EAST', label: '东部', debtToIncome: { n: 7877, median: 0, exclusionRate: 0.028010858835143138 }, debtToAsset: { n: 8102, median: 0, exclusionRate: 0.00024679170779861795 }, consumptionToIncome: { n: 7877, median: 0.9635630420042112, exclusionRate: 0.028010858835143138 } },
      { id: 'CENTRAL', label: '中部', debtToIncome: { n: 3725, median: 0, exclusionRate: 0.02817636316201409 }, debtToAsset: { n: 3833, median: 0, exclusionRate: 0 }, consumptionToIncome: { n: 3725, median: 1.084566361873095, exclusionRate: 0.02817636316201409 } },
      { id: 'WEST', label: '西部', debtToIncome: { n: 7889, median: 0, exclusionRate: 0.028687515390297957 }, debtToAsset: { n: 8119, median: 0, exclusionRate: 0.00036936715094804237 }, consumptionToIncome: { n: 7889, median: 1.115305323920196, exclusionRate: 0.028687515390297957 } },
      { id: 'NORTHEAST', label: '东北', debtToIncome: { n: 1920, median: 0, exclusionRate: 0.024390243902439025 }, debtToAsset: { n: 1967, median: 0, exclusionRate: 0.0005081300813008131 }, consumptionToIncome: { n: 1920, median: 0.9991461633524323, exclusionRate: 0.024390243902439025 } }
    ]
  },
  chfs2021DebtParticipationBurden: {
    status: 'DESCRIPTIVE_2021_ONLY', year: '2021', noCmesOrCrossYearLinkage: true,
    source: { artifact: 'v013-chfs2021-household-debt-participation-burden-descriptor-retry.json', sha256: 'D2CAA1BD7097B7F296FABAE0AECEBFEE1F52A8E002F4E597C7E18FF17544CD7D', markdownSha256: 'F4C35FBDF2DDBC16442202A650566A6868731B686C4BC27082604C06CDD5B95A', attestationSha256: '5CC304E2BAB56E9DE52D1CAD032C18402C9737921D8C1BD000CEEB64530840B2' },
    boundary: '总负债或全样本比率中位数为零不等于无人持债；本面板仅描述 total_debt > 0 定义的正债家庭。',
    denominator: '债务/收入比仅在正债、total_income > 0 且两字段观察到时计算；所有非正收入、缺失与其他不合格记录均排除并计入排除率。',
    prohibited: '禁止风险、违约、偿付能力、家庭健康、因果、政策、预测、通缩、跨年或 CMES 解释；NO_CMES_OR_CROSS_YEAR_LINKAGE。',
    groups: [
      { id:'NATIONAL', label:'全国', participation:{value:0.293019831180573,n:22027,excluded:0,rate:0}, positiveDebt:{value:75000,n:6574,excluded:15453,rate:0.701548100059018}, debtToIncome:{value:1.32244515419006,n:6317,excluded:15710,rate:0.713215599037545} },
      { id:'URBAN', label:'城镇', participation:{value:0.27359601855278,n:13324,excluded:0,rate:0}, positiveDebt:{value:120000,n:3649,excluded:9675,rate:0.726133293305314}, debtToIncome:{value:1.38856279850006,n:3518,excluded:9806,rate:0.735965175622936} },
      { id:'RURAL', label:'农村', participation:{value:0.331763088703156,n:8703,excluded:0,rate:0}, positiveDebt:{value:42000,n:2925,excluded:5778,rate:0.663908996897622}, debtToIncome:{value:1.20170640945435,n:2799,excluded:5904,rate:0.678386763185109} },
      { id:'EAST', label:'东部', participation:{value:0.265221893787384,n:8104,excluded:0,rate:0}, positiveDebt:{value:100000,n:2042,excluded:6062,rate:0.748025666337611}, debtToIncome:{value:1.25215208530426,n:1973,excluded:6131,rate:0.756539980256663} },
      { id:'CENTRAL', label:'中部', participation:{value:0.263417959213257,n:3833,excluded:0,rate:0}, positiveDebt:{value:50000,n:1047,excluded:2786,rate:0.726845812679363}, debtToIncome:{value:1.19729995727539,n:1008,excluded:2825,rate:0.737020610487868} },
      { id:'WEST', label:'西部', participation:{value:0.350520461797714,n:8122,excluded:0,rate:0}, positiveDebt:{value:80000,n:3002,excluded:5120,rate:0.630386604284659}, debtToIncome:{value:1.40341103076935,n:2867,excluded:5255,rate:0.647008126077321} },
      { id:'NORTHEAST', label:'东北', participation:{value:0.221482038497925,n:1968,excluded:0,rate:0}, positiveDebt:{value:50000,n:483,excluded:1485,rate:0.754573170731707}, debtToIncome:{value:1.09565031528473,n:469,excluded:1499,rate:0.761686991869919} }
    ]
  },
  chfs2021ConsumptionIncomePosition: {
    status: 'DESCRIPTIVE_2021_ONLY', year: '2021', noCmesOrCrossYearLinkage: true,
    source: { artifact: 'v013-chfs2021-consumption-income-position-descriptor.json', sha256: 'C9655E25BC077FA7736D6DFB2BB573206EB3A782224E2BA26FA951541C10CA1D', markdownSha256: '2CB9A9EBC5190B45A1C6C1714D1F269B1B040326C69E75AFB4414E8459D5A894', attestationSha256: 'EA2444401F87CE0FF35C29EA324532A9D7656A5F3C6D87AA398953DA3D2F037D' },
    formula: 'consumptionToIncome = total_consump / total_income；仅 total_income > 0 且两字段观察到。',
    threshold: '严格消费/收入比 > 1；收入缺失、零/负收入、消费缺失与其他不合格记录均排除并计入排除率。',
    prohibited: '这不是家庭压力、贫困、透支、风险、家庭健康、因果、政策、预测、通缩或跨年趋势判断；NO_CMES_OR_CROSS_YEAR_LINKAGE。',
    groups: [
      { id:'NATIONAL', label:'全国', ratio:{median:1.0518684098250746,gtOneShare:0.5228039109718423,n:21411,excluded:616,rate:0.027965678485495075} },
      { id:'URBAN', label:'城镇', ratio:{median:0.9537294387050536,gtOneShare:0.4763800660883628,n:12989,excluded:335,rate:0.025142599819873913} },
      { id:'RURAL', label:'农村', ratio:{median:1.3579545454545454,gtOneShare:0.6162202081684344,n:8422,excluded:281,rate:0.032287716879237045} },
      { id:'EAST', label:'东部', ratio:{median:0.9635630420042112,gtOneShare:0.48508181032324,n:7877,excluded:227,rate:0.028010858835143138} },
      { id:'CENTRAL', label:'中部', ratio:{median:1.084566361873095,gtOneShare:0.5416031587684694,n:3725,excluded:108,rate:0.02817636316201409} },
      { id:'WEST', label:'西部', ratio:{median:1.115305323920196,gtOneShare:0.5490467199787612,n:7889,excluded:233,rate:0.028687515390297957} },
      { id:'NORTHEAST', label:'东北', ratio:{median:0.9991461633524323,gtOneShare:0.49958408813507016,n:1920,excluded:48,rate:0.024390243902439025} }
    ]
  },
  chfs2021NetWorthPosition: {
    status: 'DESCRIPTIVE_2021_ONLY', year: '2021', noCmesOrCrossYearLinkage: true,
    source: { artifact: 'v013-chfs2021-net-worth-position-descriptor.json', sha256: 'AD50FA82891A8A4DCA854251582FD6FB5ED077358FF4C6D6601598FEE28DA863', markdownSha256: '6845CF47F028F03A6713E1140B68F5CF2678FF8828D37F111AC6DDF05647683E', attestationSha256: 'DC6B0E253D71BD1E8321711C15221F24C28ED872AD6C43C64D0EBCB334CEB9F8' },
    formula: 'netWorth = total_asset - total_debt；仅 total_asset 与 total_debt 两字段观察到且权重为正时计算。',
    treatment: '无插补、无转换；资产/债务缺失与其他不合格记录均排除并计入排除率。',
    prohibited: '净资产 <= 0 仅为算术位置，不代表财务健康、资不抵债风险、违约概率、偿付能力、贫困、因果、政策、预测、通缩或跨年趋势；NO_CMES_OR_CROSS_YEAR_LINKAGE。',
    groups: [
      { id:'NATIONAL', label:'全国', netWorth:{median:446800,lteZeroShare:0.02229395514647138,n:22027,excluded:0,rate:0} },
      { id:'URBAN', label:'城镇', netWorth:{median:654448,lteZeroShare:0.0181345698880163,n:13324,excluded:0,rate:0} },
      { id:'RURAL', label:'农村', netWorth:{median:215700,lteZeroShare:0.0305903582942367,n:8703,excluded:0,rate:0} },
      { id:'EAST', label:'东部', netWorth:{median:797700,lteZeroShare:0.0152366662696619,n:8104,excluded:0,rate:0} },
      { id:'CENTRAL', label:'中部', netWorth:{median:390300,lteZeroShare:0.0177108070654746,n:3833,excluded:0,rate:0} },
      { id:'WEST', label:'西部', netWorth:{median:406450,lteZeroShare:0.026818253668142,n:8122,excluded:0,rate:0} },
      { id:'NORTHEAST', label:'东北', netWorth:{median:215830,lteZeroShare:0.0371576724832589,n:1968,excluded:0,rate:0} }
    ]
  },
  chfs2021IndividualEmploymentStructure: {
    status: 'DESCRIPTIVE_2021_ONLY', year: '2021', noHouseholdLinkage: true, noCmesOrCrossYearLinkage: true,
    source: { artifact: 'v013-chfs2021-individual-employment-structure-descriptor.json', sha256: '99B33BDDB24BE14F6DC988DE85692B949A7CB6AAC9ED32A328D9DD98D3BD492A', markdownSha256: 'A52B025E78E7EA4D8BF748401B3AD6C4B3ADDA0DF92D4BFDD242C796CF78C30A', attestationSha256: 'ADFB22219B34A8F8C3F961935D9AD4105AC0B1EA70FD27DFEB6C24C7A36D0F5E' },
    weighting: '未加权。没有个人权重合同，不可称为全国代表性。',
    boundary: '仅 2021 单字段就业结构描述；不推断工资、收入、工时、时薪、ELP/LTPP、劳动购买力、平台就业、稳定性、因果、政策、预测或通缩。',
    fields: [
      { id:'CURRENT_EMPLOYMENT_STATUS', sourceField:'a3100a', label:'当前就业状态', effectiveN:41427, excluded:26890, rate:0.39360627662221703, categories:[{label:'有工作且主要工作与上一年相同',count:28033,share:0.6766842880247181},{label:'没有工作',count:10364,share:0.2501750066381828},{label:'有工作但主要工作与上一年不同',count:3030,share:0.07314070533709899}], boundary:'上一年措辞仅为 2021 问卷内部回应类别，不构成跨年趋势。' },
      { id:'EMPLOYER_TYPE', sourceField:'a3132c', label:'工作单位类型', effectiveN:15322, excluded:52995, rate:0.7757220018443433, categories:[{label:'私营企业',count:5726,share:0.3737110037854066},{label:'党政机关/事业单位',count:3646,share:0.23795849105860853},{label:'个体工商户',count:2615,share:0.17066962537527738},{label:'国有及国有控股企业',count:2216,share:0.14462863855893487},{label:'其他请注明',count:848,share:0.05534525518861767},{label:'港澳台、外商投资企业',count:271,share:0.01768698603315494}], boundary:'工作单位类型不等于平台就业、稳定性、收入、工时或劳动购买力。' }
    ],
    blockedField: { sourceField:'a3132b', label:'就业状态', reason:'附着标签仅为“是/否”，缺少可审计题干、期间及覆盖合同；不显示结果。' },
    prohibited: 'NO_HOUSEHOLD_LINKAGE；NO_CMES_OR_CROSS_YEAR_LINKAGE；不得推断工资、收入、工时、时薪、ELP/LTPP、劳动购买力、平台就业、稳定性、因果、政策、预测或通缩；不得显示类别代码、ID、个人记录或更多劳动字段。'
  },
  chfs2021IndividualWorktimeSingleField: {
    status: 'DESCRIPTIVE_2021_ONLY', year: '2021', totalDtaUnweightedN: 68317, noHouseholdLinkage: true, noCmesOrCrossYearLinkage: true,
    source: { artifact: 'v013-chfs2021-individual-worktime-single-field-descriptor.json', sha256: 'D7316C103AC8EC219738570A6334DB8D966EC520ABC294C11666AB0C0BB410EB', markdownSha256: 'B8111CC10255F52BE7A8403A1E773AA4DAAD2ECD0DA6A1E96AA73B748ECF5C0D', attestationSha256: '4D706154337ECB7B3437F60DF263B36830A42900747746AF65BA19AD5DB98834' },
    weighting: '未加权。没有个人权重，不可称为全国代表性；总 DTA n=68,317 仅为质量覆盖分母。',
    boundary: '仅 2021 年、仅质量合格回答者的字段单项描述。工时不表示实际/在线/待命工时，且不得合成为月/周/年总工时。',
    fields: [
      { id:'WORK_MONTHS', sourceField:'a3132', label:'工作月数', unit:'月', p25:7, median:12, p75:12, effectiveN:27957, excluded:40360, exclusionRate:0.5907765184353811 },
      { id:'MONTHLY_WORKDAYS', sourceField:'a3133', label:'月均工作天数', unit:'天', p25:20, median:25, p75:30, effectiveN:27305, excluded:41012, exclusionRate:0.6003059297091522 },
      { id:'DAILY_WORK_HOURS', sourceField:'a3134', label:'日均工作小时数', unit:'小时', p25:8, median:8, p75:10, effectiveN:27273, excluded:41044, exclusionRate:0.6007743249838251 },
      { id:'WEEKLY_OVERTIME_HOURS', sourceField:'a3135', label:'周均加班小时数', unit:'小时', p25:0, median:0, p75:4, effectiveN:13787, excluded:54530, exclusionRate:0.7982068293362349 }
    ],
    prohibited: 'NO_HOUSEHOLD_LINKAGE；NO_CMES_OR_CROSS_YEAR_LINKAGE；不得用于收入、时薪、ELP/LTPP、劳动购买力、平台就业、稳定性、因果、政策、预测或通缩；不得显示 ID、个人记录或更多劳动字段。'
  },
  chfs2021IndividualIncomeSingleField: {
    status: 'DESCRIPTIVE_2021_ONLY', year: '2021', totalDtaUnweightedN: 68317, noHouseholdLinkage: true, noCmesOrCrossYearLinkage: true,
    source: { artifact: 'v013-chfs2021-individual-income-single-field-descriptor.json', sha256: '716219255F182540DD9E41575ED1FEB1E2766656095FE4A728B9E3E429FB584B', markdownSha256: '0438B1230C6672A479957A66F1EB6DC00AA18EC7E9ED5DC59D662A56C3BFC29C', attestationSha256: '3F043AB265DB23CE68C5422C0259D00A414F967ACD8E7DFA3D911149940B7C2D' },
    weighting: '未加权。没有个人权重，不能称为全国代表性；仅为该全国覆盖文件范围内的基础字段描述。',
    boundary: '仅 2021 年、问卷“去年”参考期的观察到且有限基础字段值。无插补、无新截尾或转换；不得自行归为日历年。',
    fields: [
      { id:'AFTER_TAX_WAGE_INCOME', sourceField:'a3136', label:'税后工资收入', unit:'人民币元', p25:20000, median:36000, p75:55000, effectiveN:13525, excluded:54792, exclusionRate:0.802025850081239, scope:'题干范围不包括绩效奖金、补贴。' },
      { id:'AFTER_TAX_BONUS_INCOME', sourceField:'a3136a', label:'税后奖金/绩效收入', unit:'人民币元', p25:0, median:0, p75:4800, effectiveN:13282, excluded:55035, exclusionRate:0.8055827978394836, tailNote:'发布基础字段将 >=1,000,000 元替换成 1,000,000 元，故上端分位数受限；不得读取或使用 censor 字段，不得恢复或推断顶端值。' },
      { id:'FREELANCE_INCOME', sourceField:'a3136aa', label:'自由职业者收入', unit:'人民币元', p25:10000, median:24000, p75:40000, effectiveN:1946, excluded:66371, exclusionRate:0.9715151426438514, scope:'保持单字段语义，不等同工资或总劳动收入。' }
    ],
    prohibited: 'NO_HOUSEHOLD_LINKAGE；NO_CMES_OR_CROSS_YEAR_LINKAGE；不得合并工资、奖金或自由职业者收入，不得构造总劳动收入；不得与工时关联，不得推断时薪、ELP/LTPP、劳动购买力、平台就业、稳定性、因果、政策、预测或通缩；不得显示 ID、个人记录、类别或交叉表。'
  },
  chfs2021IndividualSocialInsuranceSingleField: {
    status: 'DESCRIPTIVE_2021_ONLY', year: '2021', totalDtaUnweightedN: 68317, noHouseholdLinkage: true, noCmesOrCrossYearLinkage: true,
    source: { artifact: 'v013-chfs2021-individual-social-insurance-single-field-category-descriptor-retry.json', sha256: '82D6E3340DF9FC9FA08E4811267F34C57A48AC97007D74B086D90A8B340CBCFE', markdownSha256: '3BE402D0181BDF6C3B048DC8FFFFA3F3FA164671BD9FC0D108529C47CF5203C9', attestationSha256: '9ACB834900EA2F22D2B4611261366750889D1F385213979CABEF5AE3A4F8F7F9' },
    weighting: '未加权。没有个人权重，不能称为全国代表性；不是社会保险全国覆盖率。',
    boundary: '仅 2021 年、独立字段的当前类别描述。2017 和 2019 仅保留边界文字，不显示类别或数值；没有收入、工时、家庭、CMES 或跨年关联。',
    fields: [
      { id:'CURRENT_PENSION_CATEGORY', sourceField:'f1001a', label:'当前社会养老保险类型', questionUniverse:'系统载入的十六周岁及以上家庭成员当前回答；不是全部个人、劳动者或全国覆盖率。', denominator:'该字段观察到且类别可直接映射至问卷自然语言类别的有效回答。', effectiveN:58355, excluded:9962, exclusionRate:0.14582022044293513, categories:[
        { label:'新型农村社会养老保险（新农保，按年缴纳）', count:16803, share:0.28794447776540144 }, { label:'以上都没有', count:15466, share:0.26503298774740813 }, { label:'城镇职工基本养老保险（城职保，一般按月缴纳）', count:12742, share:0.21835318310341872 }, { label:'城乡统一居民社会养老保险（按年缴纳）', count:4526, share:0.0775597635164082 }, { label:'机关事业单位退休金/离休金', count:3771, share:0.06462171193556679 }, { label:'城镇居民社会养老保险（城居保，按年缴纳）', count:3476, share:0.05956644674835061 }, { label:'其他（请注明）', count:1571, share:0.026921429183446147 }
      ] },
      { id:'CURRENT_MEDICAL_CATEGORY', sourceField:'f2001a', label:'当前医疗保险类型', questionUniverse:'系统载入的家庭成员当前回答；不是全部个人、劳动者或全国覆盖率。', denominator:'该字段观察到且类别可直接映射至问卷自然语言类别的有效回答。', effectiveN:68109, excluded:208, exclusionRate:0.0030446301798966583, categories:[
        { label:'新型农村合作医疗保险', count:33441, share:0.4909923798616923 }, { label:'城镇职工基本医疗保险', count:13898, share:0.20405526435566518 }, { label:'城镇居民基本医疗保险', count:8031, share:0.11791393207946087 }, { label:'以上都没有', count:6526, share:0.09581699922183559 }, { label:'城乡居民基本医疗保险', count:5567, share:0.08173662805209297 }, { label:'公费医疗', count:646, share:0.009484796429253109 }
      ] },
      { id:'CURRENT_UNEMPLOYMENT_INSURANCE', sourceField:'f3001', label:'当前失业保险', questionUniverse:'仅 CAPI 跳题条件覆盖范围内的有效回答；绝非全部个人、劳动者或全国覆盖率。', denominator:'CAPI 跳题条件覆盖范围内该字段观察到且类别可直接映射至自然语言回答的有效回答。', effectiveN:14630, excluded:53687, exclusionRate:0.785851252250538, categories:[
        { label:'否', count:9144, share:0.6250170881749829 }, { label:'是', count:5486, share:0.3749829118250171 }
      ] }
    ],
    prohibited: 'NO_HOUSEHOLD_LINKAGE；NO_CMES_OR_CROSS_YEAR_LINKAGE；不得推断缴费金额、归属、连续性、待遇资格、待遇金额、待遇时长、充分性或稳定性；不得与收入、工时、家庭或 CMES 关联，不得推断 ELP/LTPP、劳动购买力、因果、政策、预测或通缩。'
  },
  chfs2021IndividualEmploymentContractAndWorkNatureSingleField: {
    status: 'DESCRIPTIVE_2021_ONLY', year: '2021', totalDtaUnweightedN: 68317, noHouseholdLinkage: true, noCmesOrCrossYearLinkage: true,
    source: { artifact: 'v013-chfs2021-individual-employment-contract-and-work-nature-single-field-category-descriptor.json', sha256: '5F359C39021E96DC0E332BA780F3F83CAF7046A5D0753E8D41C2B66F06A2FD9F', markdownSha256: 'BE411386B721A2E91B716BB7E7D5C2677DF8664BF94C22261A0B081E01138592', attestationSha256: '9116E17A618DB27B79DF6E3C2349808521019479C3A4E71B6906AA95E89E034C' },
    weighting: '未加权。没有个人权重，不能称为全国代表性。',
    boundary: '仅 2021 年；问卷中的“去年”是参考期，不能转写为日历年。2017 和 2019 仅保留边界文字，不显示类别或数值；四个字段独立描述，不提供组合、交叉表、家庭、CMES 或跨年链接。',
    fields: [
      { id:'MAIN_WORK_NATURE', sourceField:'a3132da', title:'去年主工作的工作性质', question:'去年，家庭成员最主要的那份工作的工作性质属于以下哪一类？', questionUniverse:'系统加载的家庭成员；仅当问卷就业状态跳题条件满足时询问。', skipCondition:'仅问卷规定的就业状态对象。', effectiveN:31438, excluded:36879, exclusionRate:0.5398217134827349, categories:[
        { label:'受雇于他人或单位', count:15754, share:0.5011133023729245 }, { label:'雇主、自营劳动者、家庭帮工等工商业经营', count:2842, share:0.09040015268146828 }, { label:'灵活就业', count:2384, share:0.07583179591577072 }, { label:'务农', count:10458, share:0.3326547490298365 }
      ] },
      { id:'MAIN_WORK_INDUSTRY', sourceField:'a3132f', title:'去年主工作单位的行业', question:'家庭成员去年工作单位属于什么行业？', questionUniverse:'系统加载的家庭成员；仅当主工作性质为受雇于他人或单位时询问。', skipCondition:'主工作性质为受雇于他人或单位。', effectiveN:15373, excluded:52944, exclusionRate:0.7749754819444648, categories:[
        { label:'农、林、牧、渔业', count:472, share:0.030703180901580692 }, { label:'采矿制造业', count:1536, share:0.09991543615429649 }, { label:'建筑业', count:1670, share:0.10863201717296558 }, { label:'电力、热力、煤气及水生产和供应业', count:679, share:0.04416834710206206 }, { label:'批发和零售业', count:1108, share:0.07207441618421909 }, { label:'交通运输、仓储和邮政业', count:985, share:0.06407337539842581 }, { label:'住宿与餐饮业', count:854, share:0.055551941715995576 }, { label:'信息传输、软件和信息技术服务业', count:538, share:0.03499642229883562 }, { label:'金融业', count:403, share:0.026214792168086906 }, { label:'房地产业', count:259, share:0.01684772002862161 }, { label:'科教文卫', count:2025, share:0.13172445196123073 }, { label:'居民服务、修理和其他服务业', count:2014, share:0.1310089117283549 }, { label:'公共管理、社会保障和社会组织', count:1609, share:0.10466402133610876 }, { label:'其他（请注明）', count:1221, share:0.07942496584921616 }
      ] },
      { id:'MAIN_WORK_OCCUPATION', sourceField:'a3132g', title:'去年主工作的职业', question:'去年该工作属于什么职业？', questionUniverse:'系统加载的家庭成员；仅当主工作性质为受雇于他人或单位或灵活就业时询问。', skipCondition:'主工作性质为受雇于他人或单位或灵活就业。', effectiveN:17724, excluded:50593, exclusionRate:0.7405623783245752, categories:[
        { label:'党的机关、国家机关、群团和社会组织、企事业单位负责人', count:862, share:0.048634619724667115 }, { label:'专业技术人员', count:4305, share:0.24289099526066352 }, { label:'办事人员和有关人员', count:3155, share:0.17800722184608442 }, { label:'其他社会生产服务和生活服务人员', count:4379, share:0.24706612502821035 }, { label:'生产制造及有关人员', count:2866, share:0.161701647483638 }, { label:'其他从业人员', count:2157, share:0.12169939065673663 }
      ] },
      { id:'MAIN_WORK_CONTRACT_NATURE', sourceField:'a3132h', title:'去年主工作的合同性质', question:'这份工作的合同性质？', questionUniverse:'系统加载的家庭成员；仅当主工作性质为受雇于他人或单位时询问。', skipCondition:'主工作性质为受雇于他人或单位。', effectiveN:14408, excluded:53909, exclusionRate:0.7891008094617737, categories:[
        { label:'固定职工（包括公务员、事业单位在编人员）', count:3079, share:0.21370072182121044 }, { label:'无固定期限长期合同', count:1601, share:0.1111188228761799 }, { label:'一年以上长期合同', count:3089, share:0.21439478067740145 }, { label:'一年及以下短期或临时合同', count:1591, share:0.1104247640199889 }, { label:'没有合同', count:5048, share:0.35036091060521934 }
      ] }
    ],
    prohibited: 'NO_HOUSEHOLD_LINKAGE；NO_CMES_OR_CROSS_YEAR_LINKAGE；“灵活就业”仅为问卷直接工作性质类别，不得推断平台就业、非正规性、脆弱性或就业稳定性；不得关联收入、工时、社会保险或任何其他字段，不得推断 ELP/LTPP、劳动购买力、因果、政策、预测或通缩。'
  },
  chfsWaveEligibilityLedger: {
    title: 'CHFS 年份资格账本',
    status: 'WAVE_ELIGIBILITY_LEDGER_ONLY',
    boundary: '这是资格账本，不是趋势图；年份不会并排数值比较，BLOCKED 不代表零或缺失结果。',
    localDocumentRoute: {
      status: 'LOCAL_DOCUMENT_ROUTE_EXHAUSTED_FOR_CURRENT_ARCHIVE',
      boundary: '仅适用于当前 archive 中未闭合的字段语义文档路线；不涉及资料授权，也不表示可改用其他年份或代理。',
      evidence: [
        { artifact: 'v013-a3-chfs-field-semantic-remediation-retry.json', sha256: '16A9EB21E8F1A394541664EC41F3DF0DDF52A686A968ED6B326DD7F2EF836942', status: 'V013_A3_CHFS_FIELD_SEMANTIC_REMEDIATION_RETRY_COMPLETE' },
        { artifact: 'v013-a3b-chfs-master-hh-header-semantic-audit.json', sha256: '91B2368A7AF8BCFD2E7C528CE1E265593A491260062C9EC2C6471550F1DF6599', status: 'V013_A3B_CHFS_MASTER_HH_HEADER_SEMANTIC_AUDIT_PASS' },
        { artifact: 'v013-a3c-chfs-remaining-companion-documents-semantic-audit.json', sha256: '91F6925E66B2BE8CE07A433219FAEC4CCCDD8ECA6C974148494EF91DE1FE032C', status: 'V013_A3C_CHFS_REMAINING_COMPANION_DOCUMENTS_SEMANTIC_AUDIT_PASS' }
      ]
    },
    waves: [
      { year: '2011', status: 'BLOCKED', qualification: '家庭资产负债表 / 财务承压：BLOCKED', reason: '总消费、总负债定义、共同单位、总字段处理传播与截尾合同未闭合。', artifact: 'v013-chfs2011-household-balance-sheet-baseline.json', sha256: 'A39978AB03A840762014A0491120BA480DA16B2F023D236A7CAF83045BB748A8' },
      { year: '2013', status: 'BLOCKED', qualification: '家庭资产负债表 / 财务承压：BLOCKED', reason: '总消费、总负债定义、参照期、共同单位、处理传播与截尾合同未闭合。', artifact: 'v013-chfs2013-household-balance-sheet-baseline.json', sha256: '2BC9661E186C82C9F63BE78AFC594F1930DC5E3211DFE21516C55AB18F620090' },
      { year: '2015', status: 'BLOCKED', qualification: '家庭资产负债表 / 财务承压：BLOCKED', reason: '总字段共同单位、收入/消费参照期、处理传播与截尾合同未闭合。', artifact: 'v013-chfs2015-household-balance-sheet-baseline.json', sha256: '6B351A9087D763B3AB909F3E0AF20D70BF0816C491F1BBC1C82CCBE535AD4DFF' },
      { year: '2017', status: 'BLOCKED', qualification: '家庭财务承压描述：BLOCKED', reason: 'Gate 016 在 DTA 读取前阻断：总字段插补与截尾语义仍 UNKNOWN。', artifact: 'v013-chfs2017-household-financial-resilience-descriptor-gate.json', sha256: 'BA22BFE6F12624BB21E8BDFBE0CF038735B47D0F358DD5599CFF51085CC4E6C2' },
      { year: '2019', status: 'BLOCKED', qualification: '家庭财务承压描述：BLOCKED', reason: 'Gate 015 在 DTA 读取前阻断：总收入/总消费的单位、期间、插补与截尾语义未闭合。', artifact: 'v013-chfs2019-household-financial-resilience-descriptor-gate.json', sha256: '951AD54BB74878133D7704BD1A1B2FD5F11B82AC27891C98A18E6C853DAD4531' },
      { year: '2021', status: 'PASS', qualification: '家庭财务承压：仅 2021 单年描述可展示', reason: '仅已验收的去标识化 n>=30 聚合；不是跨年趋势、因果、预测或家庭健康判断。', artifact: 'v013-chfs2021-household-financial-resilience-descriptor.json', sha256: 'A1EF12ABA87398E6D63B3A6B931D4A81B80ECCD010AD362A9CA261DBF39E45D4' }
    ],
    noCmesOrCrossYearLinkage: true,
    prohibited: '禁止数值跨年图、趋势、因果、预测、通缩解释、家庭健康判断或 CMES 联动。'
  },
  gapRegister: {
    status: 'V013_CHFS_FIELD_LEVEL_DOCUMENTATION_GAP_REGISTER_PASS',
    sourceJsonSha256: '4943174C34E9119FBAE5D33374B427A7A9E344C5C513B822431F901CF2B32812',
    sourceAttestationSha256: '53559DA7612ECAB5486CDFCAC820BBA93F1D8DF098136B780CE1AAC6A4D169D2',
    boundary: '资料放入本地后仍须 Manager 字段级审计；不会自动解锁数据读取、聚合或跨年比较。',
    items: [
      { id: 'TOTAL_INCOME', label: '家庭总收入', scope: '2011/2013 历史总量；2019 构成分母', needs: '字段级共同单位、总量构成/包含排除、参照期、缺失/插补传播、截尾规则', document: '发布方代码本或变量规则说明', unlocksOnly: '单波次字段资格复核', stillBlocked: '数据读取、跨年比较、趋势、因果或政策结论' },
      { id: 'TOTAL_CONSUMPTION', label: '家庭总消费', scope: '2011/2013 历史总量；2019 构成分母', needs: '总消费定义、共同单位、总参照期、缺失/插补传播、截尾规则', document: '发布方代码本或变量规则说明', unlocksOnly: '单波次字段资格复核', stillBlocked: '数据读取、跨年比较、趋势或需求因果推断' },
      { id: 'TOTAL_ASSET', label: '家庭总资产', scope: '2011/2013 历史总量', needs: '总字段映射、共同单位、缺失/插补传播、总量截尾行为', document: '发布方代码本或变量规则说明', unlocksOnly: '历史单波次资产总量审计', stillBlocked: '跨年财富趋势、跨波次调和或损失结论' },
      { id: 'TOTAL_DEBT', label: '家庭总负债', scope: '2011/2013 历史总量', needs: '总负债构成、共同单位、缺失/插补传播、截尾行为、合格构成规则', document: '发布方代码本或变量规则说明', unlocksOnly: '历史单波次负债总量审计', stillBlocked: '跨年负债比较、信用风险或损失分配结论' },
      { id: 'INCOME_COMPONENTS', label: '收入分项', scope: '2019 构成', needs: '分项与总收入分母关系、共同单位、缺失/插补传播、分项/总量截尾关系', document: '发布方变量规则说明', unlocksOnly: '逐分项单波次 n 门槛资格复核', stillBlocked: '代理替代、跨年份额或劳动价格推断' },
      { id: 'CONSUMPTION_COMPONENTS', label: '消费分项', scope: '2019 构成', needs: '分项与总消费分母关系、共同单位、参照期调和、缺失/插补传播、分项/总量截尾关系', document: '发布方变量规则说明', unlocksOnly: '逐分项单波次 n 门槛资格复核', stillBlocked: '分项加总替代、跨年份额或需求因果推断' },
      { id: 'TRUNCATION_AND_IMPUTATION', label: '截尾与插补', scope: '历史总量与 2019 构成', needs: '字段级截尾前后规则、阈值/版本/总体、插补字段身份、缺失向总量和分项传播规则', document: '发布方发布说明、转换规范或规则附录', unlocksOnly: '单一发布字段资格审计', stillBlocked: '静默插补、前向填充或以分项说明替代总字段证据' },
      { id: 'WEIGHT_AND_GEOGRAPHY', label: '权重与地理编码', scope: '单波次与跨波次使用', needs: '权重构造与适用总体、零/缺失权重语义、逐波次城乡/地区编码、地理修订和可比性说明', document: '逐波次代码本或抽样技术文档', unlocksOnly: '单波次地域描述资格复核', stillBlocked: '假定跨波次编码不变或未经定义的全国外推' }
    ]
  },
  chfs2021HouseholdComponentEvidenceLedger: {
    year: '2021',
    title: 'CHFS 2021 家庭资产与债务分项证据账本',
    status: 'SEMANTIC_EVIDENCE_LEDGER_ONLY',
    sourceIds: ['chfs2021AssetComponentAudit', 'chfs2021AssetQualityProfile', 'chfs2021DebtAuthorizationNormalization', 'chfs2021DebtQualityProfile', 'chfs2021HousingDebtBoundary'],
    boundary: '仅展示已审计的分项语义、资格状态与阻断原因；不展示任何数值或统计结果。',
    assets: {
      status: '问卷/综合变量语义已映射；数值统计仍 BLOCKED',
      reason: '日历估值时点、记录级 MI/censor，以及有效性/范围/重复风险尚未闭合。',
      items: ['金融资产', '农业资产', '土地资产', '车辆', '车库', '耐用品及高价值资产', '工商业资产', '住房', '商铺'],
      qualitySummary: { suppressed: 8, qualityPublishable: 1, displayedCellValues: false },
      qualityBoundary: '“质量计数可披露”只表示字段质量计数通过隐私门槛；页面仍不展示计数，且不解锁金额、分布、分项加总、total_asset 或净资产。单位、估值日期、MI/censor 含义和有效性/重复范围仍 BLOCKED。',
      qualityItems: [
        { label: '金融资产', status: 'FULL_FIELD_SUPPRESSED', displayStatus: '整字段抑制', reason: '至少一个非零质量子单元低于 n=30；不显示计数或残差。' },
        { label: '农业资产', status: 'FULL_FIELD_SUPPRESSED', displayStatus: '整字段抑制', reason: '至少一个非零质量子单元低于 n=30；不显示计数或残差。' },
        { label: '土地资产', status: 'FULL_FIELD_SUPPRESSED', displayStatus: '整字段抑制', reason: '至少一个非零质量子单元低于 n=30；不显示计数或残差。' },
        { label: '车辆', status: 'FULL_FIELD_SUPPRESSED', displayStatus: '整字段抑制', reason: '至少一个非零质量子单元低于 n=30；不显示计数或残差。' },
        { label: '车库', status: 'PUBLISHED_COUNTS', displayStatus: '质量计数可披露', reason: '仅展示资格状态；不展示实际计数，也不解锁任何金额或推导。' },
        { label: '耐用品及高价值资产', status: 'FULL_FIELD_SUPPRESSED', displayStatus: '整字段抑制', reason: '至少一个非零质量子单元低于 n=30；不显示计数或残差。' },
        { label: '工商业资产', status: 'FULL_FIELD_SUPPRESSED', displayStatus: '整字段抑制', reason: '至少一个非零质量子单元低于 n=30；不显示计数或残差。' },
        { label: '住房', status: 'FULL_FIELD_SUPPRESSED', displayStatus: '整字段抑制', reason: '至少一个非零质量子单元低于 n=30；不显示计数或残差。' },
        { label: '商铺', status: 'FULL_FIELD_SUPPRESSED', displayStatus: '整字段抑制', reason: '至少一个非零质量子单元低于 n=30；不显示计数或残差。' }
      ]
    },
    debts: {
      status: '隐私整字段抑制',
      reason: '单位、余额日与 MI 仍未解决；不得显示或推导任何数值结果。',
      items: ['农业', '工商业', '住房', '商铺', '汽车', '耐用品及高价值资产', '金融投资', '教育', '医疗', '其他']
    },
    housingDebt: {
      status: '调查时点未偿余额存量候选',
      reason: '还款、本金、利息、期限/摊还、利率与抵押/担保均 UNKNOWN/BLOCKED；存量不等于偿债服务。'
    },
    noNumericDisplay: true,
    noHouseholdOrIndividualLinkage: true,
    noCrossYearOrCmesLinkage: true,
    non2021Boundary: '2017/2019 仅保留边界说明；该账本的分项卡片只对 CHFS 2021 显示。',
    prohibited: '禁止资产或债务加总、重建总资产/净资产/总债务、债务负担或风险推断；禁止跨年、CMES 或家庭/个人联接。'
  },
  blocked: [
    { label: 'CHFS 2011 / 2013 / 2015 总量', status: 'BLOCKED', reason: '字段级单位、期间、缺失/插补传播与截尾处理尚未闭合。' },
    { label: '跨年量化比较与趋势', status: 'BLOCKED', reason: '2017/2019/2021 仍等待逐字段可比性映射；禁止合并、趋势、插值或代理。' },
    { label: '有效劳动价格 / LTPP / 平台就业传感器', status: 'BLOCKED', reason: '关键收入、工时、成本、价格篮子与许可合同尚未满足。' },
    { label: 'LGFV 直接敞口与通缩/债务通缩结论', status: 'UNKNOWN / BLOCKED', reason: '没有合格直接证据；本视图不产生宏观状态、因果或政策判断。' }
  ]
});
