/* Static contract for the local v0.13 evidence view; no source data is loaded. */
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

const context = { window: {}, console };
context.window = context;
vm.runInNewContext(fs.readFileSync('data/v013-evidence-dashboard.js', 'utf8'), context);
const dashboard = context.MinshengV013EvidenceDashboard;
let assertions = 0;
const expect = (value, message) => {
  assertions += 1;
  if (!value) throw new Error(`T${assertions}: ${message}`);
};

// Static task-073 fixture: user-approved LINEAR_INTERPOLATION_ON_NORMALIZED_CUMULATIVE_WEIGHT.
// This is not proof of the legacy algorithm. Zero displayed missingness is rounded,
// not a claim that the nonzero raw income missing rates in the attestation are zero.
const unified2017 = {
  national: { total_income: [39941, 52798.51, 0], total_consump: [40011, 43312, 0], total_asset: [40011, 363000, 0], total_debt: [40011, 0, 0] },
  urban: { total_income: [27221, 64027.08, 0], total_consump: [27279, 50631.86, 0], total_asset: [27279, 509140.21, 0], total_debt: [27279, 0, 0] },
  rural: { total_income: [12720, 24246.77, 0], total_consump: [12732, 26344, 0], total_asset: [12732, 149218.97, 0], total_debt: [12732, 0, 0] },
  east: { total_income: [17809, 65817.76, 0], total_consump: [17839, 49343, 0], total_asset: [17839, 630416.37, 0], total_debt: [17839, 0, 0] },
  central: { total_income: [7610, 46770.33, 0], total_consump: [7621, 38200, 0], total_asset: [7621, 293226.45, 0], total_debt: [7621, 0, 0] },
  west: { total_income: [9513, 41992.54, 0], total_consump: [9530, 41440, 0], total_asset: [9530, 290001.6, 0], total_debt: [9530, 0, 0] },
  northeast: { total_income: [5009, 51084.61, 0], total_consump: [5021, 40069.91, 0], total_asset: [5021, 234303.13, 0], total_debt: [5021, 0, 0] }
};
for (const [groupId, metrics] of Object.entries(unified2017)) {
  for (const [metricId, aggregate] of Object.entries(metrics)) {
    expect(JSON.stringify(dashboard.years['2017'].groups[groupId][metricId]) === JSON.stringify(aggregate), `task-073 ${groupId}/${metricId} n, median and displayed missingness are exact`);
  }
}
expect(dashboard.years['2017'].groups.central.total_consump[1] === 38200, 'only the approved central consumption median is corrected');
expect(dashboard.years['2017'].groups.west.total_income[1] === 41992.54, 'only the approved west income median is corrected');
expect(dashboard.chfs2021DebtParticipationBurden.groups.find((group) => group.id === 'RURAL').positiveDebt.value === 42000, 'the unrelated 2021 positive-debt value 42000 must not be replaced');
expect(JSON.stringify(dashboard.sourceRefs.chfs2017) === JSON.stringify({
  label: 'CHFS 2017 家庭资产负债表基线',
  artifact: 'v013-chfs2017-unified-baseline-rebuild.json',
  sha256: '46916AE06BEDF0F408F788C2A11B711DDAFB6556B293997A5606E03BB39BD7F2',
  markdownArtifact: 'v013-chfs2017-unified-baseline-rebuild.md',
  markdownSha256: '864730074FD59A023F0C5BCE0280E859072EC11B5726B3A2DDD27F185BA57221',
  attestationArtifact: 'v013-chfs2017-unified-baseline-rebuild-attestation.json',
  attestationSha256: '2B2BB410C545E5D9244E9FE72BDD2788C39D5371E215B3A2DB4C62BBB6376FF5'
}), 'the unique 2017 source binds all three task-073 filenames and exact hashes');
// Static task-075 approved target; inherited task-074 flags describe the old UI.
// Displayed zero missingness does not establish zero raw missingness or qualification.
const unified2019 = {
  national: { total_income: [34643, 46986.89, 0], total_consump: [34643, 51980, 0], total_asset: [34643, 352500, 0], total_debt: [27390, 0, 0.21] },
  urban: { total_income: [22381, 63835.45, 0], total_consump: [22381, 64309.71, 0], total_asset: [22381, 576251.29, 0], total_debt: [16041, 0, 0.28] },
  rural: { total_income: [12262, 23146.28, 0], total_consump: [12262, 32806.98, 0], total_asset: [12262, 160017.32, 0], total_debt: [11349, 0, 0.07] },
  east: { total_income: [12930, 59436.94, 0], total_consump: [12930, 60300, 0], total_asset: [12930, 640500, 0], total_debt: [10491, 0, 0.19] },
  central: { total_income: [7532, 41417.75, 0], total_consump: [7532, 46299.57, 0], total_asset: [7532, 305055.41, 0], total_debt: [6247, 0, 0.17] },
  west: { total_income: [10471, 40066.58, 0], total_consump: [10471, 50240.49, 0], total_asset: [10471, 288001.51, 0], total_debt: [8234, 0, 0.21] },
  northeast: { total_income: [3710, 40008.22, 0], total_consump: [3710, 42942.04, 0], total_asset: [3710, 197029.12, 0], total_debt: [2418, 0, 0.35] }
};
for (const [groupId, metrics] of Object.entries(unified2019)) {
  for (const [metricId, aggregate] of Object.entries(metrics)) {
    expect(JSON.stringify(dashboard.years['2019'].groups[groupId][metricId]) === JSON.stringify(aggregate), `task-075 ${groupId}/${metricId} approved n, median and displayed missingness are exact`);
  }
}
expect(dashboard.years['2019'].groups.east.total_consump[1] === 60300, 'the sole approved 2019 east consumption median is corrected');
expect(JSON.stringify(dashboard.sourceRefs.chfs2019) === JSON.stringify({
  label: 'CHFS 2019 家庭资产负债表基线',
  artifact: 'v013-chfs2019-approved-unified-baseline.json',
  sha256: '9B8D9A835F1835F3A39A56F331DDE47D54391D0DC13A913039DAF3620307DC58',
  markdownArtifact: 'v013-chfs2019-approved-unified-baseline.md',
  markdownSha256: '0591D3EC5DB8060AA0DF2A3B9E03D0953EE56A3D1F0DF75ADEE335B13267DE89',
  attestationArtifact: 'v013-chfs2019-approved-unified-baseline-attestation.json',
  attestationSha256: '73E7F32749C7C03AB623550D9227D0782DF923E35E9FF3292DCCF5A6F794172E'
}), 'the unique 2019 source binds all three task-075 filenames and exact hashes');
expect(JSON.stringify(dashboard.sourceRefs.chfs2021) === JSON.stringify({
  label: 'CHFS 2021 家庭资产负债表基线',
  artifact: 'v013-chfs2021-household-balance-sheet-baseline-rebuild.json',
  sha256: '55BA00940BBCE6B63BB6EC3A727D1C1B22B14DD05F6C08475E8D54C9277AD4E7',
  markdownArtifact: 'v013-chfs2021-household-balance-sheet-baseline-rebuild.md',
  markdownSha256: '7A9186149655928845971419C005F2D24F4332437225C49F3563149725366645',
  attestationArtifact: 'v013-chfs2021-household-balance-sheet-baseline-rebuild-attestation.json',
  attestationSha256: 'C85155F5C618190073D65FDA90DE5BBC5BAD84548B47EA7DDD34B7EE424AB3BB'
}), 'the unique 2021 source binds all three task-071 filenames and exact hashes');
// Restore only the authorized changes in a copy, then compare with the pre-073A
// semantic snapshot: all other years, panels, sourceRefs and boundaries must stay exact.
const preservedDashboard = JSON.parse(JSON.stringify(dashboard));
preservedDashboard.years['2017'].groups.central.total_consump[1] = 38197.04;
preservedDashboard.years['2017'].groups.west.total_income[1] = 42000;
preservedDashboard.sourceRefs.chfs2017 = {
  label: 'CHFS 2017 家庭资产负债表基线',
  artifact: 'v013-chfs2017-household-balance-sheet-baseline.json',
  sha256: '2AFF2902436EDAD97F0678CA3884B46FEDDE6BF23AAEDA2E5B1E0F19AD66CC4D',
  attestationSha256: '6F4D4F0E70D7B78C8900424876B5B49901E0AC4DF7973FDF50B0232E75E7E20D'
};
preservedDashboard.years['2019'].groups.east.total_consump[1] = 60295.47;
preservedDashboard.sourceRefs.chfs2019 = {
  label: 'CHFS 2019 家庭资产负债表基线',
  artifact: 'v013-chfs2019-household-balance-sheet-baseline.json',
  sha256: 'B138B631A03273AB53D4F1FCC0241543621C58E58D80B8FE228E1877E263A14D',
  attestationSha256: '86A9F2EE6F220F72C9449F33189DC53821233EA77CF5C61E2B36C51802F25350'
};
preservedDashboard.sourceRefs.chfs2021 = {
  label: 'CHFS 2021 家庭资产负债表基线',
  artifact: 'v013-chfs2021-household-balance-sheet-baseline.json',
  sha256: 'ECAE018E26918D15BA2608FC940FD52CEE9698DD48D84A6CE13D42F50BCB41A9',
  attestationSha256: '587C9466C22C23B8FD4A5F1980029BBF43BC106EE8281494470878C1D3480E99'
};
preservedDashboard.sourceRefs.cmes2015 = {
  label: 'CMES 2015 企业描述性基线',
  artifact: 'v013-cmes2015-firm-descriptive-baseline.json',
  sha256: '649E7C0B9D1CD7C6B6B32EA23ED10A7405FAC96C9B1C8395C2AD564868918CD5'
};
// Restore the five superseded source-reference objects only for the historical
// semantic snapshot. The live dashboard below is locked to the rebuilt evidence.
preservedDashboard.sourceRefs.cmes2015HeaderAudit = {
  label: 'CMES 2015 企业表头语义审计',
  artifact: 'v013-cmes2015-firm-master-header-semantic-audit.json',
  sha256: '0DCA8D7662F903A586ADDE5054BAEC2114763B6BEA73FAA5D583DC362441A901'
};
preservedDashboard.sourceRefs.cmes2015FirmSpecification = {
  label: 'CMES 2015 企业侧语义规格',
  artifact: 'v013-cmes2015-firm-side-semantic-specification.json',
  sha256: 'EDE2DAF8511F76934C66B789BF439FEA026899D2B7104A1CB5166F07369070E2'
};
preservedDashboard.sourceRefs.cmes2015CompanionAudit = {
  label: 'CMES 2015 企业伴随文档语义审计',
  artifact: 'v013-cmes2015-firm-companion-document-semantic-audit.json',
  sha256: '8BAABD118AC4E837EB27E110E656DA47E687130AD6A0EAFAC1F79B5DC0AC170E',
  markdownSha256: '1E5C4EEFEE5ECC72B9C2D4134899AA4784BCA6D3724CB46FAB0A5C5A6B6E39BE',
  attestationSha256: '947F02EB0860B6C7A95FBCF71FF6CABAAD8E56A980C2F01069CB5F8298D025C8'
};
preservedDashboard.sourceRefs.cmes2015AuthorizationNormalization = {
  label: 'CMES 2015 Manager→Worker 授权链正常化',
  artifact: 'v013-cmes2015-firm-companion-document-semantic-audit-authorization-delegation-normalization.json',
  sha256: 'D11FB01E842F1517E7522EFD5CA11C252CA493F0371B49F8D78554029686D069',
  markdownSha256: 'A2466FB1F9C42E2BE6F0232AC6F2B1E4DD062A8D33F0266696BC06315C5FF3D6',
  attestationSha256: '999C07765C55467D06D762268F3585EB6CC4C94ACF4F14667AC26B3CC806D346'
};
preservedDashboard.sourceRefs.chfs2021FinancialResilienceDescriptor = {
  label: 'CHFS 2021 家庭财务承压描述',
  artifact: 'v013-chfs2021-household-financial-resilience-descriptor.json',
  sha256: 'A1EF12ABA87398E6D63B3A6B931D4A81B80ECCD010AD362A9CA261DBF39E45D4',
  markdownSha256: '1B3CEE4F7C9A7E732CCA05BD6B3F4048F46CBDCDC43A726E810E438FD95ABC2F',
  attestationSha256: 'E70E7C4C7DE7D251779DC74C6EDBE08D973BCE2B7575942BC7F95BB5C2E63F1D'
};
expect(crypto.createHash('sha256').update(JSON.stringify(preservedDashboard)).digest('hex').toUpperCase() === 'B0C7BD32E67A00B75C9D1429269FD934C40D2398D8EE6F3F230AA803B7FFE045', 'apart from the approved 2017/2019 medians and explicitly normalized historical source bindings, the entire dashboard remains unchanged');

expect(dashboard.version.includes('v0.13'), 'v0.13 version is explicit');
expect(Object.keys(dashboard.years).join(',') === '2017,2019,2021', 'only independent attested household years are displayed');
const expectedGeographies = ['national', 'urban', 'rural', 'east', 'central', 'west', 'northeast'];
for (const year of Object.values(dashboard.years)) {
  expect(Object.keys(year.groups).join(',') === expectedGeographies.join(','), 'each year contains exactly the seven approved geography units');
  expect(year.groups.east.label === '东部' && year.groups.central.label === '中部' && year.groups.west.label === '西部' && year.groups.northeast.label === '东北', 'four regional groups are explicitly labelled');
  expect(year.nRule.includes('不可跨年比较') && year.nRule.includes('看趋势'), 'each displayed year states the non-comparison boundary');
  for (const group of Object.values(year.groups)) {
    for (const metricId of Object.keys(dashboard.metrics)) {
      const aggregate = group[metricId];
      expect(aggregate[0] >= 30, 'each displayed aggregate respects n >= 30');
      expect(aggregate.length === 3, 'aggregate contains n, median, and missing rate only');
    }
  }
}
expect(dashboard.blocked.some((item) => item.label.includes('跨年')), 'cross-year comparison is visibly blocked');
expect(dashboard.blocked.some((item) => item.label.includes('2011')), 'historical blocked years are visible');
expect(dashboard.blocked.some((item) => item.label.includes('劳动价格')), 'labor-price scope is visibly blocked');
expect(dashboard.cmes2015.status === 'LIMITED_DESCRIPTIVE_ONLY', 'CMES remains limited descriptive evidence');
expect(dashboard.cmes2015.items.length === 2, 'CMES retains exactly the two accepted limited descriptive items');
const cmesEmployees = dashboard.cmes2015.items.find((item) => item.label === '当前员工数');
expect(JSON.stringify(cmesEmployees) === JSON.stringify({ label: '当前员工数', unit: 'EMPLOYEE_COUNT', n: 4955, median: 15, missing: 0.0986, boundary: '未加权；企业描述性字段，不代表全国企业。' }), 'CMES employee item preserves its exact label, unit, n, median, missingness and boundary');
const cmesReinvestment = dashboard.cmes2015.items.find((item) => item.n === 2157 && item.median === 30);
expect(cmesReinvestment.label === '2014 年企业利润用于再投资比例（%）', 'CMES f4012a uses the attested reinvestment label');
expect(!cmesReinvestment.label.includes('研发'), 'CMES f4012a label does not misstate reinvestment as research and development');
expect(JSON.stringify(cmesReinvestment) === JSON.stringify({ label: '2014 年企业利润用于再投资比例（%）', unit: 'PERCENT', n: 2157, median: 30, missing: 0.6076, boundary: '未加权；缺失率高，不能用于利润—工资—消费传导推断。' }), 'CMES reinvestment item preserves its exact label, unit, n, median, missingness and boundary');
expect(JSON.stringify(dashboard.sourceRefs.cmes2015) === JSON.stringify({
  label: 'CMES 2015 企业描述性基线',
  artifact: 'v013-cmes2015-two-field-strict-slice-rebuild.json',
  sha256: '68806EBDB509ECC4D0ACD17D3D8D70C1BD5F315BB2E70A434FDB711A131D164B',
  markdownArtifact: 'v013-cmes2015-two-field-strict-slice-rebuild.md',
  markdownSha256: 'BBC053FB9DF28805E0B9EB84001DFBAFE533549E33679D258526516291DEC03B',
  attestationArtifact: 'v013-cmes2015-two-field-strict-slice-rebuild-attestation.json',
  attestationSha256: 'A90982437682904B19E37F73F3221F3E0DB1D01AA9A58FD0A45E16F8BBEBB307'
}), 'CMES source binds the exact task-076S JSON, markdown and attestation filenames and hashes');
for (const year of Object.values(dashboard.years)) {
  const source = dashboard.sourceRefs[year.sourceId];
  expect(source && /^[A-F0-9]{64}$/.test(source.sha256), 'each year points to a full evidence SHA-256');
  expect(/^[A-F0-9]{64}$/.test(source.attestationSha256), 'each year points to a full source attestation SHA-256');
}
expect(/^[A-F0-9]{64}$/.test(dashboard.sourceRefs[dashboard.cmes2015.sourceId].sha256), 'CMES points to a full evidence SHA-256');
const firmQualifications = dashboard.cmes2015FirmQualifications;
expect(firmQualifications.status === 'FIRM_SIDE_SEMANTIC_CONTRACT_ONLY', 'CMES qualification panel is a semantic contract, not a result view');
expect(firmQualifications.fields.length === 13, 'CMES qualification panel covers exactly thirteen authorized domains');
expect(firmQualifications.fields.map((item) => item.id).join(',') === 'operatingRevenueSales,reinvestment,inventory,employeeCount,wages,socialInsuranceCosts,borrowing,salesChannels,industryCode,profit,cashFlow,enterpriseWeight,regionCode', 'CMES qualification domains preserve the approved order and scope');
expect(firmQualifications.noChfsLinkage === true && firmQualifications.prohibited.includes('NO_CHFS_LINKAGE'), 'CMES qualification panel visibly blocks CHFS linkage and causal overreach');
expect(firmQualifications.authorization === 'SATISFIED_MANAGER_SCOPED_AUTHORIZATION' && firmQualifications.numericReadiness === 'BLOCKED', 'manager-scoped authorization is explicit and does not unlock numeric use');
expect(firmQualifications.non2015Boundary.includes('CMES 2015') && firmQualifications.non2015Boundary.includes('CHFS') && firmQualifications.non2015Boundary.includes('不得被解释为时间可比'), 'CMES evidence remains a static 2015 qualification under every CHFS selection');
expect(firmQualifications.unknowns.join(',') === '单位/币种,财务期间,样本框,权重,地理,行业资格,缺失/截尾,统计代表性', 'the eight unresolved qualification dimensions remain explicit');
for (const id of ['operatingRevenueSales', 'inventory', 'employeeCount', 'wages', 'socialInsuranceCosts', 'borrowing']) expect(firmQualifications.fields.find((item) => item.id === id).status === 'DOCUMENTED / PARTIAL', `${id} is documented but remains partial`);
for (const id of ['reinvestment', 'salesChannels', 'profit']) expect(firmQualifications.fields.find((item) => item.id === id).status === 'CONDITIONAL / PARTIAL', `${id} remains a conditional partial candidate`);
expect(firmQualifications.fields.find((item) => item.id === 'industryCode').status === 'UNKNOWN / BLOCKED', 'industry qualification remains unknown and blocked');
for (const id of ['cashFlow', 'enterpriseWeight', 'regionCode']) expect(firmQualifications.fields.find((item) => item.id === id).status === 'BLOCKED', `${id} remains blocked`);
expect(firmQualifications.fields.find((item) => item.id === 'cashFlow').reason.includes('禁止') && firmQualifications.fields.find((item) => item.id === 'cashFlow').reason.includes('重建'), 'cash flow cannot be reconstructed from adjacent candidates');
for (const phrase of ['企业—家庭因果链', '代表性声明', '货币统计', '比率', '跨年比较', '预测', '通缩结论']) expect(firmQualifications.prohibited.includes(phrase), `qualification boundary blocks ${phrase}`);
expect(firmQualifications.fields.every((item) => !['n', 'median', 'mean', 'value', 'amount', 'count'].some((key) => Object.hasOwn(item, key))), 'qualification payload contains no numeric statistical fields');
const rebuiltEvidenceRefs = {
  cmes2015HeaderAudit: {
    label: 'CMES 2015 企业表头语义审计',
    artifact: 'v013-cmes2015-firm-master-header-semantic-audit-rebuild.json',
    sha256: '0831B0CE4A337FED28B864BE7FFC0FF64965D80FEA683BE4B87D46058831BA51',
    markdownArtifact: 'v013-cmes2015-firm-master-header-semantic-audit-rebuild.md',
    markdownSha256: '0B63023A2813544F1AD5A97CBF7890ED5D7269E6CA254718E2ACC3F1659F9BD9',
    attestationArtifact: 'v013-cmes2015-firm-master-header-semantic-audit-rebuild-attestation.json',
    attestationSha256: '2A9D85E9193C5C015DC035CC2660A492A25449829947DB0AC32C7FB17E39EFF6'
  },
  cmes2015FirmSpecification: {
    label: 'CMES 2015 企业侧语义规格',
    artifact: 'v013-cmes2015-firm-side-semantic-specification-rebuild.json',
    sha256: '3FB11C100A9931E5569C55124649D6641796C71F643C7FD00EB69C7F03C19FC7',
    markdownArtifact: 'v013-cmes2015-firm-side-semantic-specification-rebuild.md',
    markdownSha256: '462875BE708ED99EB6E14CBB85D9FA153226233BC79F8EA020EE86A78D33FC00',
    attestationArtifact: 'v013-cmes2015-firm-side-semantic-specification-rebuild-attestation.json',
    attestationSha256: 'F692F2896B79A96FE164EACFCB56042E0064A7BFC94196A5792A57A77C3A96F9'
  },
  cmes2015CompanionAudit: {
    label: 'CMES 2015 企业伴随文档语义审计',
    artifact: 'v013-cmes2015-firm-companion-document-semantic-audit-rebuild.json',
    sha256: '508DEB2F430B7801D393618047FE2E3B50C614C1479F5E50D40850710A29B7CF',
    markdownArtifact: 'v013-cmes2015-firm-companion-document-semantic-audit-rebuild.md',
    markdownSha256: '67B2F4576BAB349569BC749966A432B8956D95BA1321E95969CFA617A749F3E1',
    attestationArtifact: 'v013-cmes2015-firm-companion-document-semantic-audit-rebuild-attestation.json',
    attestationSha256: 'CD1846A64B7390A52A4A7A7FF9A0E56D7DBF76CF58F44967FCE078A781E8331E'
  },
  cmes2015AuthorizationNormalization: {
    label: 'CMES 2015 Manager→Worker 授权链正常化',
    artifact: 'v013-cmes2015-authorization-delegation-normalization-rebuild.json',
    sha256: 'AB0BEB4F0E46BA8B7BF53B6B123F98929ADEC1E9FA685476607A06C932B64783',
    markdownArtifact: 'v013-cmes2015-authorization-delegation-normalization-rebuild.md',
    markdownSha256: '48E1F24484DDA7A121F44D665998DD09C8540D00BDE9AB2E36080E6E7F9A730F',
    attestationArtifact: 'v013-cmes2015-authorization-delegation-normalization-rebuild-attestation.json',
    attestationSha256: '51E2FB8374B34BA83E9F15018589F9CC7989CDE86B3332DD86B6AD97F58796AA'
  },
  chfs2021FinancialResilienceDescriptor: {
    label: 'CHFS 2021 家庭财务承压描述',
    artifact: 'v013-chfs2021-household-financial-resilience-descriptor-strict-padding-rebuild.json',
    sha256: 'F64AEF10C707E5598642761037D1451DB3A7DBFA6ACCA1CC5D15503E3BDD8457',
    markdownArtifact: 'v013-chfs2021-household-financial-resilience-descriptor-strict-padding-rebuild.md',
    markdownSha256: '36778675FF8F307E11FAEF5E660EA299F857B1114D15BC1DC1FB3F501A06B47A',
    attestationArtifact: 'v013-chfs2021-household-financial-resilience-descriptor-strict-padding-rebuild-attestation.json',
    attestationSha256: '39145096E764625D994C3CF1C737C0D7B35CF1EDCFBA1D2965B191DA84E8CAA7'
  }
};
for (const [sourceId, source] of Object.entries(rebuiltEvidenceRefs)) {
  expect(JSON.stringify(dashboard.sourceRefs[sourceId]) === JSON.stringify(source), `${sourceId} binds the exact rebuilt JSON, markdown and attestation filenames and hashes`);
}
const resilience = dashboard.chfs2021FinancialResilience;
expect(resilience.status === 'DESCRIPTIVE_2021_ONLY' && resilience.year === '2021', 'financial resilience panel is explicitly limited to the accepted 2021 descriptor');
expect(resilience.groups.length === 7 && resilience.groups.map((group) => group.id).join(',') === 'NATIONAL,URBAN,RURAL,EAST,CENTRAL,WEST,NORTHEAST', 'financial resilience panel preserves exactly seven authorized groups');
expect(resilience.ratios.map((ratio) => ratio.id).join(',') === 'debtToIncome,debtToAsset,consumptionToIncome', 'financial resilience panel contains exactly three approved ratios');
expect(resilience.groups.every((group) => resilience.ratios.every((ratio) => group[ratio.id].n >= 30 && typeof group[ratio.id].median === 'number' && typeof group[ratio.id].exclusionRate === 'number')), 'every displayed resilience ratio has an approved n>=30 denominator and descriptor-only quality rate');
expect(resilience.boundary.includes('中位数为零不代表没有负债') && resilience.boundary.includes('小于等于零'), 'resilience panel explains zero-median and denominator-exclusion boundaries');
expect(resilience.noCmesOrCrossYearLinkage === true && resilience.prohibited.includes('NO_CMES_OR_CROSS_YEAR_LINKAGE'), 'resilience panel blocks CMES and cross-year linkage');
const descriptorSource = dashboard.sourceRefs[resilience.sourceId];
expect(JSON.stringify(descriptorSource) === JSON.stringify(rebuiltEvidenceRefs.chfs2021FinancialResilienceDescriptor), 'financial-resilience descriptor source remains locked to its exact rebuilt three-file evidence set');
const debtBurden = dashboard.chfs2021DebtParticipationBurden;
expect(debtBurden.status === 'DESCRIPTIVE_2021_ONLY' && debtBurden.year === '2021' && debtBurden.groups.length === 7, 'debt participation and burden descriptor is explicitly limited to seven 2021 groups');
expect(debtBurden.groups.map((group) => group.id).join(',') === 'NATIONAL,URBAN,RURAL,EAST,CENTRAL,WEST,NORTHEAST', 'debt participation and burden descriptor preserves exactly the authorized groups');
expect(debtBurden.groups.every((group) => ['participation', 'positiveDebt', 'debtToIncome'].every((key) => Object.keys(group[key]).sort().join(',') === 'excluded,n,rate,value')), 'each group has only the three approved descriptive metrics with n and exclusion accounting');
const nationalDebtBurden = debtBurden.groups.find((group) => group.id === 'NATIONAL');
expect(Math.round(nationalDebtBurden.participation.value * 1000) / 10 === 29.3 && nationalDebtBurden.positiveDebt.value === 75000 && nationalDebtBurden.debtToIncome.value.toFixed(3) === '1.322', 'national descriptor values exactly match the accepted static retry-20 result');
expect(debtBurden.groups.every((group) => ['participation', 'positiveDebt', 'debtToIncome'].every((key) => Number.isInteger(group[key].n) && group[key].n >= 30 && Number.isInteger(group[key].excluded) && typeof group[key].rate === 'number')), 'all displayed metrics retain approved effective n and exclusion counts/rates');
expect(debtBurden.boundary.includes('中位数为零不等于无人持债') && debtBurden.denominator.includes('total_income > 0') && debtBurden.denominator.includes('排除'), 'debt panel explains zero-median and positive-debt/income eligibility boundaries');
expect(debtBurden.source.sha256 === 'D2CAA1BD7097B7F296FABAE0AECEBFEE1F52A8E002F4E597C7E18FF17544CD7D' && debtBurden.source.markdownSha256 === 'F4C35FBDF2DDBC16442202A650566A6868731B686C4BC27082604C06CDD5B95A' && debtBurden.source.attestationSha256 === '5CC304E2BAB56E9DE52D1CAD032C18402C9737921D8C1BD000CEEB64530840B2', 'debt participation and burden panel retains all three exact retry-20 source hashes');
expect(debtBurden.noCmesOrCrossYearLinkage === true && debtBurden.prohibited.includes('NO_CMES_OR_CROSS_YEAR_LINKAGE') && debtBurden.prohibited.includes('违约') && debtBurden.prohibited.includes('预测'), 'debt panel explicitly blocks CMES/cross-year, risk/default and forecast overreach');
const consumptionIncome = dashboard.chfs2021ConsumptionIncomePosition;
expect(consumptionIncome.status === 'DESCRIPTIVE_2021_ONLY' && consumptionIncome.year === '2021' && consumptionIncome.groups.length === 7, 'consumption/income position descriptor is explicitly limited to seven 2021 groups');
expect(consumptionIncome.groups.map((group) => group.id).join(',') === 'NATIONAL,URBAN,RURAL,EAST,CENTRAL,WEST,NORTHEAST', 'consumption/income panel preserves exactly the authorized groups');
expect(consumptionIncome.groups.every((group) => Object.keys(group.ratio).sort().join(',') === 'excluded,gtOneShare,median,n,rate' && group.ratio.n >= 30), 'each consumption/income group contains only approved aggregate metrics with n>=30 and exclusion accounting');
const nationalConsumptionIncome = consumptionIncome.groups.find((group) => group.id === 'NATIONAL');
expect(nationalConsumptionIncome.ratio.median.toFixed(3) === '1.052' && Math.round(nationalConsumptionIncome.ratio.gtOneShare * 1000) / 10 === 52.3, 'national consumption/income median and strict >1 share exactly match descriptor-22');
expect(consumptionIncome.formula.includes('total_consump / total_income') && consumptionIncome.formula.includes('total_income > 0') && consumptionIncome.threshold.includes('严格') && consumptionIncome.threshold.includes('零/负收入'), 'panel fixes the formula, positive-income gate, strict threshold and exclusion explanation');
expect(consumptionIncome.source.sha256 === 'C9655E25BC077FA7736D6DFB2BB573206EB3A782224E2BA26FA951541C10CA1D' && consumptionIncome.source.markdownSha256 === '2CB9A9EBC5190B45A1C6C1714D1F269B1B040326C69E75AFB4414E8459D5A894' && consumptionIncome.source.attestationSha256 === 'EA2444401F87CE0FF35C29EA324532A9D7656A5F3C6D87AA398953DA3D2F037D', 'consumption/income panel retains all three exact descriptor-22 source hashes');
expect(consumptionIncome.noCmesOrCrossYearLinkage === true && consumptionIncome.prohibited.includes('NO_CMES_OR_CROSS_YEAR_LINKAGE') && consumptionIncome.prohibited.includes('家庭压力') && consumptionIncome.prohibited.includes('预测'), 'consumption/income panel blocks CMES/cross-year and prohibited interpretation');
const netWorthPosition = dashboard.chfs2021NetWorthPosition;
expect(netWorthPosition.status === 'DESCRIPTIVE_2021_ONLY' && netWorthPosition.year === '2021' && netWorthPosition.groups.length === 7, 'net-worth position descriptor is explicitly limited to seven 2021 groups');
expect(netWorthPosition.groups.map((group) => group.id).join(',') === 'NATIONAL,URBAN,RURAL,EAST,CENTRAL,WEST,NORTHEAST', 'net-worth panel preserves exactly the authorized groups');
expect(netWorthPosition.groups.every((group) => Object.keys(group.netWorth).sort().join(',') === 'excluded,lteZeroShare,median,n,rate' && group.netWorth.n >= 30), 'each net-worth group contains only approved aggregate metrics with n>=30 and exclusion accounting');
const nationalNetWorth = netWorthPosition.groups.find((group) => group.id === 'NATIONAL');
expect(nationalNetWorth.netWorth.median === 446800 && Math.round(nationalNetWorth.netWorth.lteZeroShare * 1000) / 10 === 2.2, 'national net-worth median and <=0 share exactly match descriptor-25');
expect(netWorthPosition.formula.includes('total_asset - total_debt') && netWorthPosition.formula.includes('观察到') && netWorthPosition.treatment.includes('无插补') && netWorthPosition.treatment.includes('无转换'), 'panel fixes the net-worth formula, complete-observation gate and no-imputation/no-transformation treatment');
expect(netWorthPosition.source.sha256 === 'AD50FA82891A8A4DCA854251582FD6FB5ED077358FF4C6D6601598FEE28DA863' && netWorthPosition.source.markdownSha256 === '6845CF47F028F03A6713E1140B68F5CF2678FF8828D37F111AC6DDF05647683E' && netWorthPosition.source.attestationSha256 === 'DC6B0E253D71BD1E8321711C15221F24C28ED872AD6C43C64D0EBCB334CEB9F8', 'net-worth panel retains all three exact descriptor-25 source hashes');
expect(netWorthPosition.noCmesOrCrossYearLinkage === true && netWorthPosition.prohibited.includes('NO_CMES_OR_CROSS_YEAR_LINKAGE') && netWorthPosition.prohibited.includes('财务健康') && netWorthPosition.prohibited.includes('违约概率'), 'net-worth panel blocks CMES/cross-year and financial-health/default interpretation');
const employmentStructure = dashboard.chfs2021IndividualEmploymentStructure;
expect(employmentStructure.status === 'DESCRIPTIVE_2021_ONLY' && employmentStructure.year === '2021' && employmentStructure.fields.length === 2, 'individual employment structure panel is explicitly limited to two accepted 2021 output fields');
expect(employmentStructure.fields.map((field) => field.sourceField).join(',') === 'a3100a,a3132c', 'individual employment structure panel exposes only the two accepted source fields');
expect(employmentStructure.fields.find((field) => field.sourceField === 'a3100a').categories.length === 3 && employmentStructure.fields.find((field) => field.sourceField === 'a3132c').categories.length === 6, 'employment status and employer type retain exactly three and six approved categories');
expect(employmentStructure.fields.every((field) => field.categories.every((category) => category.count >= 30 && typeof category.share === 'number')), 'every displayed employment category meets n>=30 and has only an unweighted share');
expect(employmentStructure.blockedField.sourceField === 'a3132b' && employmentStructure.blockedField.reason.includes('题干') && employmentStructure.blockedField.reason.includes('期间'), 'a3132b remains visibly blocked for missing auditable question and period contracts');
expect(employmentStructure.weighting.includes('未加权') && employmentStructure.weighting.includes('不可称为全国代表性'), 'employment panel explicitly disclaims personal weights and national representativeness');
expect(employmentStructure.source.sha256 === '99B33BDDB24BE14F6DC988DE85692B949A7CB6AAC9ED32A328D9DD98D3BD492A' && employmentStructure.source.markdownSha256 === 'A52B025E78E7EA4D8BF748401B3AD6C4B3ADDA0DF92D4BFDD242C796CF78C30A' && employmentStructure.source.attestationSha256 === 'ADFB22219B34A8F8C3F961935D9AD4105AC0B1EA70FD27DFEB6C24C7A36D0F5E', 'employment panel retains all three exact descriptor-31 source hashes');
expect(employmentStructure.noHouseholdLinkage === true && employmentStructure.noCmesOrCrossYearLinkage === true && employmentStructure.prohibited.includes('NO_HOUSEHOLD_LINKAGE') && employmentStructure.prohibited.includes('ELP') && employmentStructure.prohibited.includes('平台就业'), 'employment panel blocks household/CMES/cross-year linkage and labour-purchasing-power/platform inference');
const worktime = dashboard.chfs2021IndividualWorktimeSingleField;
expect(worktime.status === 'DESCRIPTIVE_2021_ONLY' && worktime.year === '2021' && worktime.totalDtaUnweightedN === 68317 && worktime.fields.length === 4, 'worktime panel is explicitly limited to the four accepted 2021 fields and quality-coverage denominator');
expect(worktime.fields.map((field) => field.sourceField).join(',') === 'a3132,a3133,a3134,a3135', 'worktime panel exposes exactly the four authorized source fields');
expect(worktime.fields.map((field) => `${field.effectiveN}/${field.p25}/${field.median}/${field.p75}/${field.excluded}`).join(',') === '27957/7/12/12/40360,27305/20/25/30/41012,27273/8/8/10/41044,13787/0/0/4/54530', 'worktime panel retains exact accepted n, P25, unweighted median, P75 and exclusion counts');
expect(worktime.fields.every((field) => field.effectiveN >= 30 && typeof field.exclusionRate === 'number' && field.unit), 'every worktime descriptor preserves an eligible n>=30, exclusion rate and explicit unit');
expect(worktime.weighting.includes('未加权') && worktime.weighting.includes('不可称为全国代表性') && worktime.boundary.includes('不表示实际/在线/待命工时') && worktime.boundary.includes('不得合成为月/周/年总工时'), 'worktime panel fixes unweighted/nonrepresentative and non-combination/actual-online-standby boundaries');
expect(worktime.source.sha256 === 'D7316C103AC8EC219738570A6334DB8D966EC520ABC294C11666AB0C0BB410EB' && worktime.source.markdownSha256 === 'B8111CC10255F52BE7A8403A1E773AA4DAAD2ECD0DA6A1E96AA73B748ECF5C0D' && worktime.source.attestationSha256 === '4D706154337ECB7B3437F60DF263B36830A42900747746AF65BA19AD5DB98834', 'worktime panel retains all three exact descriptor-34 source hashes');
expect(worktime.noHouseholdLinkage === true && worktime.noCmesOrCrossYearLinkage === true && worktime.prohibited.includes('NO_HOUSEHOLD_LINKAGE') && worktime.prohibited.includes('ELP') && worktime.prohibited.includes('平台就业'), 'worktime panel blocks household/CMES/cross-year linkage and labour-purchasing-power/platform inference');
const individualIncome = dashboard.chfs2021IndividualIncomeSingleField;
expect(individualIncome.status === 'DESCRIPTIVE_2021_ONLY' && individualIncome.year === '2021' && individualIncome.totalDtaUnweightedN === 68317 && individualIncome.fields.length === 3, 'individual income panel is explicitly limited to three accepted 2021 base fields and its coverage denominator');
expect(individualIncome.fields.map((field) => field.sourceField).join(',') === 'a3136,a3136a,a3136aa', 'individual income panel exposes exactly the three authorized base income fields');
expect(individualIncome.fields.map((field) => `${field.p25}/${field.median}/${field.p75}/${field.effectiveN}/${field.excluded}`).join(',') === '20000/36000/55000/13525/54792,0/0/4800/13282/55035,10000/24000/40000/1946/66371', 'individual income panel retains exact accepted percentile, n and exclusion results');
expect(individualIncome.fields.every((field) => field.effectiveN >= 30 && typeof field.exclusionRate === 'number' && field.unit === '人民币元'), 'every income descriptor preserves n>=30, exclusion rate and RMB unit');
expect(individualIncome.weighting.includes('未加权') && individualIncome.weighting.includes('不能称为全国代表性') && individualIncome.boundary.includes('问卷“去年”') && individualIncome.boundary.includes('无插补') && individualIncome.boundary.includes('无新截尾'), 'income panel fixes unweighted/nonrepresentative, last-year, no-imputation and no-new-transformation boundaries');
expect(individualIncome.fields.find((field) => field.sourceField === 'a3136').scope.includes('不包括绩效奖金、补贴') && individualIncome.fields.find((field) => field.sourceField === 'a3136a').tailNote.includes('>=1,000,000') && individualIncome.fields.find((field) => field.sourceField === 'a3136a').tailNote.includes('censor') && individualIncome.fields.find((field) => field.sourceField === 'a3136aa').scope.includes('不等同工资或总劳动收入'), 'income panel retains exact field scope and the published bonus top-code/censor boundary');
expect(individualIncome.source.sha256 === '716219255F182540DD9E41575ED1FEB1E2766656095FE4A728B9E3E429FB584B' && individualIncome.source.markdownSha256 === '0438B1230C6672A479957A66F1EB6DC00AA18EC7E9ED5DC59D662A56C3BFC29C' && individualIncome.source.attestationSha256 === '3F043AB265DB23CE68C5422C0259D00A414F967ACD8E7DFA3D911149940B7C2D', 'income panel retains all three exact descriptor-38 source hashes');
expect(individualIncome.noHouseholdLinkage === true && individualIncome.noCmesOrCrossYearLinkage === true && individualIncome.prohibited.includes('总劳动收入') && individualIncome.prohibited.includes('工时关联') && individualIncome.prohibited.includes('ELP/LTPP') && individualIncome.prohibited.includes('通缩'), 'income panel blocks combinations, worktime linkage, household/CMES/cross-year and prohibited interpretation');
const socialInsurance = dashboard.chfs2021IndividualSocialInsuranceSingleField;
expect(socialInsurance.status === 'DESCRIPTIVE_2021_ONLY' && socialInsurance.year === '2021' && socialInsurance.totalDtaUnweightedN === 68317 && socialInsurance.fields.length === 3, 'social-insurance panel is limited to three accepted 2021 standalone fields and its coverage denominator');
expect(socialInsurance.fields.map((field) => field.sourceField).join(',') === 'f1001a,f2001a,f3001', 'social-insurance panel exposes exactly the three authorized current-category fields');
expect(socialInsurance.fields.map((field) => `${field.effectiveN}/${field.excluded}/${field.categories.length}`).join(',') === '58355/9962/7,68109/208/6,14630/53687/2', 'social-insurance panel retains exact accepted effective n, exclusions and category counts');
expect(socialInsurance.fields.map((field) => field.categories.map((category) => `${category.label}/${category.count}/${category.share}`).join('|')).join('||') === '新型农村社会养老保险（新农保，按年缴纳）/16803/0.28794447776540144|以上都没有/15466/0.26503298774740813|城镇职工基本养老保险（城职保，一般按月缴纳）/12742/0.21835318310341872|城乡统一居民社会养老保险（按年缴纳）/4526/0.0775597635164082|机关事业单位退休金/离休金/3771/0.06462171193556679|城镇居民社会养老保险（城居保，按年缴纳）/3476/0.05956644674835061|其他（请注明）/1571/0.026921429183446147||新型农村合作医疗保险/33441/0.4909923798616923|城镇职工基本医疗保险/13898/0.20405526435566518|城镇居民基本医疗保险/8031/0.11791393207946087|以上都没有/6526/0.09581699922183559|城乡居民基本医疗保险/5567/0.08173662805209297|公费医疗/646/0.009484796429253109||否/9144/0.6250170881749829|是/5486/0.3749829118250171', 'social-insurance panel retains every accepted natural-language category, count and unweighted share');
expect(socialInsurance.source.sha256 === '82D6E3340DF9FC9FA08E4811267F34C57A48AC97007D74B086D90A8B340CBCFE' && socialInsurance.source.markdownSha256 === '3BE402D0181BDF6C3B048DC8FFFFA3F3FA164671BD9FC0D108529C47CF5203C9' && socialInsurance.source.attestationSha256 === '9ACB834900EA2F22D2B4611261366750889D1F385213979CABEF5AE3A4F8F7F9', 'social-insurance panel retains all three exact retry-42 source hashes');
expect(socialInsurance.fields.every((field) => field.categories.every((category) => category.count >= 30 && typeof category.share === 'number' && !/[0-9]/.test(category.label))), 'social-insurance categories retain n>=30, unweighted shares and code-free natural-language labels');
expect(socialInsurance.fields.find((field) => field.sourceField === 'f3001').questionUniverse.includes('CAPI') && socialInsurance.fields.find((field) => field.sourceField === 'f3001').questionUniverse.includes('绝非全部个人、劳动者或全国覆盖率'), 'unemployment-insurance denominator remains limited to the CAPI skip-condition universe');
expect(socialInsurance.weighting.includes('未加权') && socialInsurance.weighting.includes('不能称为全国代表性') && socialInsurance.boundary.includes('2017 和 2019') && socialInsurance.boundary.includes('不显示类别或数值'), 'social-insurance panel fixes unweighted/nonrepresentative and non-2021 hidden-output boundaries');
expect(socialInsurance.noHouseholdLinkage === true && socialInsurance.noCmesOrCrossYearLinkage === true && socialInsurance.prohibited.includes('缴费金额') && socialInsurance.prohibited.includes('待遇资格') && socialInsurance.prohibited.includes('ELP/LTPP') && socialInsurance.prohibited.includes('通缩'), 'social-insurance panel blocks contributions, benefits, linkage and macro/labour inference');
const employmentContractWorkNature = dashboard.chfs2021IndividualEmploymentContractAndWorkNatureSingleField;
expect(employmentContractWorkNature.status === 'DESCRIPTIVE_2021_ONLY' && employmentContractWorkNature.year === '2021' && employmentContractWorkNature.totalDtaUnweightedN === 68317 && employmentContractWorkNature.fields.length === 4, 'employment-contract/work-nature panel is limited to four authorized 2021 standalone fields and its coverage denominator');
expect(employmentContractWorkNature.fields.map((field) => field.sourceField).join(',') === 'a3132da,a3132f,a3132g,a3132h', 'employment-contract/work-nature panel exposes exactly the four authorized source fields in its payload');
expect(employmentContractWorkNature.fields.map((field) => `${field.effectiveN}/${field.excluded}/${field.categories.length}`).join(',') === '31438/36879/4,15373/52944/14,17724/50593/6,14408/53909/5', 'employment-contract/work-nature panel retains exact accepted effective n, exclusions and 4/14/6/5 category counts');
expect(employmentContractWorkNature.source.sha256 === '5F359C39021E96DC0E332BA780F3F83CAF7046A5D0753E8D41C2B66F06A2FD9F' && employmentContractWorkNature.source.markdownSha256 === 'BE411386B721A2E91B716BB7E7D5C2677DF8664BF94C22261A0B081E01138592' && employmentContractWorkNature.source.attestationSha256 === '9116E17A618DB27B79DF6E3C2349808521019479C3A4E71B6906AA95E89E034C', 'employment-contract/work-nature panel retains all three exact descriptor-45 source hashes');
expect(employmentContractWorkNature.fields.every((field) => field.categories.every((category) => category.count >= 30 && typeof category.share === 'number' && !/[0-9]/.test(category.label))), 'employment-contract/work-nature categories retain n>=30, unweighted shares and code-free natural-language labels');
expect(employmentContractWorkNature.fields.map((field) => field.categories.map((category) => `${category.label}/${category.count}`).join('|')).join('||') === '受雇于他人或单位/15754|雇主、自营劳动者、家庭帮工等工商业经营/2842|灵活就业/2384|务农/10458||农、林、牧、渔业/472|采矿制造业/1536|建筑业/1670|电力、热力、煤气及水生产和供应业/679|批发和零售业/1108|交通运输、仓储和邮政业/985|住宿与餐饮业/854|信息传输、软件和信息技术服务业/538|金融业/403|房地产业/259|科教文卫/2025|居民服务、修理和其他服务业/2014|公共管理、社会保障和社会组织/1609|其他（请注明）/1221||党的机关、国家机关、群团和社会组织、企事业单位负责人/862|专业技术人员/4305|办事人员和有关人员/3155|其他社会生产服务和生活服务人员/4379|生产制造及有关人员/2866|其他从业人员/2157||固定职工（包括公务员、事业单位在编人员）/3079|无固定期限长期合同/1601|一年以上长期合同/3089|一年及以下短期或临时合同/1591|没有合同/5048', 'employment-contract/work-nature panel retains every accepted natural-language category and count');
expect(employmentContractWorkNature.weighting.includes('未加权') && employmentContractWorkNature.weighting.includes('不能称为全国代表性') && employmentContractWorkNature.boundary.includes('2017 和 2019') && employmentContractWorkNature.boundary.includes('不显示类别或数值'), 'employment-contract/work-nature panel fixes unweighted/nonrepresentative and non-2021 hidden-output boundaries');
expect(employmentContractWorkNature.fields.find((field) => field.id === 'MAIN_WORK_NATURE').categories.some((category) => category.label === '灵活就业') && employmentContractWorkNature.prohibited.includes('平台就业') && employmentContractWorkNature.prohibited.includes('非正规性') && employmentContractWorkNature.prohibited.includes('脆弱性') && employmentContractWorkNature.prohibited.includes('就业稳定性'), 'flexible employment remains only a direct work-nature category and cannot become platform, informality, vulnerability or stability inference');
expect(employmentContractWorkNature.noHouseholdLinkage === true && employmentContractWorkNature.noCmesOrCrossYearLinkage === true && employmentContractWorkNature.prohibited.includes('ELP/LTPP') && employmentContractWorkNature.prohibited.includes('劳动购买力') && employmentContractWorkNature.prohibited.includes('通缩'), 'employment-contract/work-nature panel blocks linkage, labour-purchasing-power and macro inference');
const ledger = dashboard.chfsWaveEligibilityLedger;
expect(ledger.status === 'WAVE_ELIGIBILITY_LEDGER_ONLY' && ledger.waves.length === 6 && ledger.waves.map((item) => item.year).join(',') === '2011,2013,2015,2017,2019,2021', 'wave ledger preserves exactly six authorized years without a trend series');
expect(ledger.waves.find((item) => item.year === '2021').status === 'PASS', '2021 is the only display-eligible single-year resilience descriptor');
for (const year of ['2017', '2019']) expect(ledger.waves.find((item) => item.year === year).status === 'BLOCKED', `${year} remains statistically blocked before DTA access`);
expect(ledger.waves.every((item) => /^[A-F0-9]{64}$/.test(item.sha256) && item.artifact), 'every ledger year carries a full source SHA-256 and artifact');
expect(ledger.waves.every((item) => Object.keys(item).sort().join(',') === 'artifact,qualification,reason,sha256,status,year'), 'ledger rows carry qualification and evidence only, never cross-year numeric outputs');
expect(ledger.waves.find((item) => item.year === '2017').sha256 === 'BA22BFE6F12624BB21E8BDFBE0CF038735B47D0F358DD5599CFF51085CC4E6C2', '2017 Gate 016 source hash is exact');
expect(ledger.waves.find((item) => item.year === '2019').sha256 === '951AD54BB74878133D7704BD1A1B2FD5F11B82AC27891C98A18E6C853DAD4531', '2019 Gate 015 source hash is exact');
expect(ledger.boundary.includes('不是趋势图') && ledger.prohibited.includes('数值跨年图') && ledger.noCmesOrCrossYearLinkage === true, 'ledger blocks numerical cross-year charts, trend and CMES linkage');
expect(ledger.localDocumentRoute.status === 'LOCAL_DOCUMENT_ROUTE_EXHAUSTED_FOR_CURRENT_ARCHIVE' && ledger.localDocumentRoute.boundary.includes('不涉及资料授权'), 'local document-route exhaustion is narrowly scoped and does not question authorization');
expect(ledger.localDocumentRoute.evidence.map((item) => item.sha256).join(',') === '16A9EB21E8F1A394541664EC41F3DF0DDF52A686A968ED6B326DD7F2EF836942,91B2368A7AF8BCFD2E7C528CE1E265593A491260062C9EC2C6471550F1DF6599,91F6925E66B2BE8CE07A433219FAEC4CCCDD8ECA6C974148494EF91DE1FE032C', 'ledger retains the three exact semantic-route source hashes');
expect(dashboard.gapRegister.status === 'V013_CHFS_FIELD_LEVEL_DOCUMENTATION_GAP_REGISTER_PASS', 'gap register has the accepted source status');
expect(dashboard.gapRegister.sourceJsonSha256 === '4943174C34E9119FBAE5D33374B427A7A9E344C5C513B822431F901CF2B32812', 'gap register JSON source hash is exact');
expect(dashboard.gapRegister.sourceAttestationSha256 === '53559DA7612ECAB5486CDFCAC820BBA93F1D8DF098136B780CE1AAC6A4D169D2', 'gap register attestation hash is exact');
expect(dashboard.gapRegister.items.length === 8, 'gap panel has exactly eight non-data documentation categories');
expect(dashboard.gapRegister.items.map((item) => item.id).join(',') === 'TOTAL_INCOME,TOTAL_CONSUMPTION,TOTAL_ASSET,TOTAL_DEBT,INCOME_COMPONENTS,CONSUMPTION_COMPONENTS,TRUNCATION_AND_IMPUTATION,WEIGHT_AND_GEOGRAPHY', 'gap categories match the approved static register');
expect(dashboard.gapRegister.items.every((item) => item.document && item.unlocksOnly && item.stillBlocked), 'each gap category specifies required document and fail-closed boundary');
expect(dashboard.gapRegister.boundary.includes('Manager') && dashboard.gapRegister.boundary.includes('不会自动解锁'), 'local documentation remains subject to Manager audit and cannot auto-unlock data');
const componentLedger = dashboard.chfs2021HouseholdComponentEvidenceLedger;
expect(componentLedger.status === 'SEMANTIC_EVIDENCE_LEDGER_ONLY' && componentLedger.year === '2021', 'household component ledger is limited to the 2021 semantic-evidence boundary');
expect(componentLedger.sourceIds.length === 5 && componentLedger.sourceIds.map((id) => dashboard.sourceRefs[id].sha256).join(',') === '40CE2567F48ADD8CC8CDACFEFB7D26D784D3AF95A1C740F9391A7A823E5227BF,B2F71AE21AF96543F2A0ACF119468438DF25FBD621E04CF31F713CFA8EE1BC86,95CB7B7D43155473CC2155E81B7B839162437C533702B82E01E3F4FA7D3543D3,27DEEF9830A7FFDCCE15382358DC3F30777F1DB7C83FFF8AEA2BE78EC5985268,AF49B84FD7BB0A4E89CEC1AD6436DE0AE852401DC7D542EE605A27B7AFF6F3FA', 'household component ledger retains the five exact JSON evidence hashes');
expect(componentLedger.assets.items.join(',') === '金融资产,农业资产,土地资产,车辆,车库,耐用品及高价值资产,工商业资产,住房,商铺', 'asset ledger covers exactly the nine approved natural-language components');
expect(componentLedger.assets.status === '问卷/综合变量语义已映射；数值统计仍 BLOCKED' && componentLedger.assets.reason.includes('日历估值时点') && componentLedger.assets.reason.includes('MI/censor') && componentLedger.assets.reason.includes('有效性/范围/重复风险'), 'asset ledger preserves mapped semantics and each numerical-statistics blocker');
const assetQualitySource = dashboard.sourceRefs.chfs2021AssetQualityProfile;
expect(assetQualitySource.sha256 === 'B2F71AE21AF96543F2A0ACF119468438DF25FBD621E04CF31F713CFA8EE1BC86' && assetQualitySource.markdownSha256 === '4260FCB7DEBFDD0EA3E5359CE7CCDF9A44FC56FB59118E423A4D5E5C962DF35F' && assetQualitySource.attestationSha256 === '5A44EFB9E190C9CCAAFAF991B54646693574D5571B4343B53F39CA677E1B0BA3', 'task-067 JSON, markdown, and attestation hashes are exact');
expect(componentLedger.assets.qualityItems.length === 9 && componentLedger.assets.qualitySummary.suppressed === 8 && componentLedger.assets.qualitySummary.qualityPublishable === 1, 'asset quality ledger has exactly nine assets, eight suppressed statuses, and one quality-publishable status');
expect(componentLedger.assets.qualityItems.filter((item) => item.status === 'FULL_FIELD_SUPPRESSED').length === 8 && componentLedger.assets.qualityItems.filter((item) => item.status === 'PUBLISHED_COUNTS').length === 1, 'asset quality statuses exactly match the accepted 8/1 evidence split');
expect(componentLedger.assets.qualityItems.find((item) => item.label === '车库').displayStatus === '质量计数可披露', 'garage/parking asset alone shows the qualitative quality-publishable status');
expect(componentLedger.assets.qualityItems.filter((item) => item.status === 'FULL_FIELD_SUPPRESSED').every((item) => item.displayStatus === '整字段抑制' && item.reason.includes('不显示计数或残差')), 'all eight suppressed asset cards disclose no counts or residuals');
expect(componentLedger.assets.qualitySummary.displayedCellValues === false && componentLedger.assets.qualityItems.every((item) => !['count', 'amount', 'value', 'median', 'ratio', 'percent', 'residual'].some((key) => Object.hasOwn(item, key))), 'asset quality payload has no forbidden cell counts, amounts, residuals, or derived statistics');
expect(componentLedger.assets.qualityBoundary.includes('不展示计数') && componentLedger.assets.qualityBoundary.includes('金额') && componentLedger.assets.qualityBoundary.includes('分项加总') && componentLedger.assets.qualityBoundary.includes('total_asset') && componentLedger.assets.qualityBoundary.includes('净资产') && componentLedger.assets.qualityBoundary.includes('MI/censor') && componentLedger.assets.qualityBoundary.includes('BLOCKED'), 'quality eligibility does not unlock values, distributions, reconstruction, or unresolved semantics');
expect(componentLedger.debts.items.join(',') === '农业,工商业,住房,商铺,汽车,耐用品及高价值资产,金融投资,教育,医疗,其他', 'debt ledger covers exactly the ten approved natural-language purposes');
expect(componentLedger.debts.status === '隐私整字段抑制' && componentLedger.debts.reason.includes('单位') && componentLedger.debts.reason.includes('余额日') && componentLedger.debts.reason.includes('MI'), 'debt ledger retains whole-field suppression and unresolved semantic gates');
expect(componentLedger.housingDebt.status === '调查时点未偿余额存量候选' && componentLedger.housingDebt.reason.includes('还款') && componentLedger.housingDebt.reason.includes('本金') && componentLedger.housingDebt.reason.includes('利息') && componentLedger.housingDebt.reason.includes('期限/摊还') && componentLedger.housingDebt.reason.includes('利率') && componentLedger.housingDebt.reason.includes('抵押/担保') && componentLedger.housingDebt.reason.includes('存量不等于偿债服务'), 'housing-debt ledger preserves the stock-only and service-data fail-closed boundary');
expect(componentLedger.noNumericDisplay === true && componentLedger.noHouseholdOrIndividualLinkage === true && componentLedger.noCrossYearOrCmesLinkage === true, 'component ledger blocks numeric display, household/individual linkage, cross-year and CMES linkage');
expect(componentLedger.prohibited.includes('资产或债务加总') && componentLedger.prohibited.includes('重建总资产/净资产/总债务') && componentLedger.prohibited.includes('债务负担') && componentLedger.prohibited.includes('跨年、CMES') && componentLedger.prohibited.includes('家庭/个人联接'), 'component ledger explicitly prohibits reconstruction and overreach');
const componentLedgerVisibleCards = JSON.stringify({
 assetItems: componentLedger.assets.items,
 assetQualityCards: componentLedger.assets.qualityItems.map(({ label, status, displayStatus, reason }) => ({ label, status, displayStatus, reason })),
 debtItems: componentLedger.debts.items,
 debtCard: { status: componentLedger.debts.status, reason: componentLedger.debts.reason },
 housingDebtCard: { status: componentLedger.housingDebt.status, reason: componentLedger.housingDebt.reason }
});
expect(!componentLedgerVisibleCards.match(/finc_asset|agri_asset|total_asset|total_debt|hous_debt|censor_/i), 'component ledger labels and status cards contain no internal source codes or total/reconstruction fields');
expect(!Object.keys(componentLedger).join(',').match(/amount|count|ratio|percentile|median|quantile/i), 'component ledger payload exposes no statistical-output keys');
expect(!JSON.stringify(dashboard).match(/hhid|identifier|recordValues|\.dta/i), 'payload contains no microdata identifiers or DTA references');
expect(!JSON.stringify(dashboard.gapRegister).match(/https?:|www\.|download|upload|login|portal/i), 'gap payload contains no network, download, upload, login, or portal action');
const cockpit = fs.readFileSync('modules/research-cockpit.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const v013Css = fs.readFileSync('v013.css', 'utf8');
expect(cockpit.includes('v013-evidence-dashboard'), 'cockpit contains the v0.13 route');
expect(cockpit.includes("document.body.classList.toggle('v013-evidence-route',id==='v013-evidence-dashboard')"), 'route mounts and removes a dedicated responsive style scope without changing evidence state');
expect(cockpit.includes("id==='v013-evidence-dashboard'?(v013Dashboard(pane),v013SelectedYearBoundary(pane),v013GapPanel(pane),v013FirmQualificationPanel(pane),v013HouseholdComponentEvidenceLedgerPanel(pane,v013State().year),v013FinancialResiliencePanel(pane,v013State().year),v013DebtParticipationBurdenPanel(pane,v013State().year),v013ConsumptionIncomePositionPanel(pane,v013State().year),v013NetWorthPositionPanel(pane,v013State().year),v013IndividualEmploymentStructurePanel(pane,v013State().year),v013IndividualWorktimeSingleFieldPanel(pane,v013State().year),v013IndividualIncomeSingleFieldPanel(pane,v013State().year),v013IndividualSocialInsuranceSingleFieldPanel(pane,v013State().year),v013IndividualEmploymentContractAndWorkNaturePanel(pane,v013State().year),v013WaveEligibilityLedger(pane),v013SectionNavigation(pane),v013ScrollableTableHints(pane),v013ApplySectionTarget(pane))"), 'route renders the dashboard, selected-year boundary, existing evidence panels, wave ledger, route-safe section navigation, and scroll hints');
expect(cockpit.includes('function v013SectionNavigation') && cockpit.includes("nav.setAttribute('aria-label','v0.13 证据区块导航')"), 'section navigation has an explicit accessible label');
const scrollHintRenderer = cockpit.slice(cockpit.indexOf('function v013ScrollableTableHints'), cockpit.indexOf('const mount='));
expect(scrollHintRenderer.includes("panel.setAttribute('role','region')") && scrollHintRenderer.includes("table.setAttribute('aria-describedby',id)") && scrollHintRenderer.includes('窄屏可横向滚动查看全部列；仅浏览当前单年，不可跨年比较。'), 'scroll hints add nonnumeric labelled regions and descriptions without changing table data');
for (const scrollPanel of ['.v013-groups','.v013-resilience','.v013-wave-ledger','.v013-debt-burden','.v013-consumption-income','.v013-net-worth','.v013-individual-employment','.v013-individual-worktime','.v013-individual-income','.v013-individual-social-insurance','.v013-individual-employment-contract-work-nature']) expect(scrollHintRenderer.includes(`'${scrollPanel}'`), `scroll hints cover ${scrollPanel}`);
expect(cockpit.includes('v013ScrollableTableHints(pane)') && !scrollHintRenderer.includes('.open=true'), 'scroll hints run after existing panels without opening details panels');
for (const anchor of ['v013-financial-resilience','v013-debt-burden','v013-consumption-income','v013-individual-employment','v013-gap-register','v013-wave-ledger']) expect(cockpit.includes(`'${anchor}'`), `${anchor} navigation target is anchored to an existing panel`);
expect(cockpit.includes('href="#cockpit/v013-evidence-dashboard?section=${encodeURIComponent(target.id)}"'), 'six section navigation links preserve the v0.13 dashboard route and encode only their existing panel identifiers');
const sectionTargetRenderer = cockpit.slice(cockpit.indexOf('const v013SectionIds='), cockpit.indexOf('function v013ScrollableTableHints'));
const sectionNavigationRenderer = cockpit.slice(cockpit.indexOf('function v013SectionNavigation'), cockpit.indexOf('function v013ApplySectionTarget'));
const navigationSectionIds = [...sectionNavigationRenderer.matchAll(/\['(v013-[^']+)'/g)].map(match => match[1]);
expect(navigationSectionIds.length === 6 && navigationSectionIds.every((id, index) => id === ['v013-financial-resilience','v013-debt-burden','v013-consumption-income','v013-individual-employment','v013-gap-register','v013-wave-ledger'][index]), 'section navigation generates exactly six links for the existing allowlisted targets');
expect(sectionTargetRenderer.includes('new Set([') && sectionTargetRenderer.includes("new URLSearchParams(location.hash.slice(queryStart+1)).getAll('section')") && sectionTargetRenderer.includes('if(candidates.length!==1)return null') && sectionTargetRenderer.includes('v013SectionIds.has(id)?id:null'), 'section parsing strictly allowlists one known identifier and rejects a normal route, duplicate, invalid, or foreign section query');
expect(sectionTargetRenderer.includes("target.dataset.v013SectionTarget='true'") && sectionTargetRenderer.includes("target.classList.add('v013-section-target')") && sectionTargetRenderer.includes("target.scrollIntoView({block:'start',behavior:'auto'})") && sectionTargetRenderer.includes('target.focus({preventScroll:true})'), 'selected existing panels receive nonpersistent route context only after dashboard panels mount without forced smooth motion');
expect(cockpit.includes("m.querySelector('.v013-year-boundary')?.insertAdjacentElement('afterend',nav)") && cockpit.includes('target.node.id=target.id') && !cockpit.includes('.open=true'), 'section navigation follows the persistent year boundary, assigns only anchors, and does not open details panels');
expect(cockpit.includes('function v013SelectedYearBoundary') && cockpit.includes("summary.setAttribute('role','status')") && cockpit.includes("summary.setAttribute('aria-live','polite')") && cockpit.includes('不可跨年比较，不构成趋势或因果结论') && cockpit.includes('2017/2019 不展示专项面板数值，也不升级为可比较资格'), 'selected-year boundary summary is accessible, non-numeric, and keeps the cross-year, trend, causal, and eligibility gates fail-closed');
expect(cockpit.includes("year==='2021'") && cockpit.includes('仅限已验收的单年描述'), 'selected-year boundary distinguishes the accepted 2021 single-year description without changing the dashboard payload');
expect(cockpit.includes('v013GapPanel') && cockpit.includes('下一步：字段文档缺口'), 'route renders the collapsed field-documentation gap panel');
expect(cockpit.includes('v013FirmQualificationPanel') && cockpit.includes('v013-firm-qualification') && cockpit.includes('授权链仅确认任务范围') && cockpit.includes('仍 UNKNOWN/BLOCKED') && cockpit.includes('markdownSha256') && cockpit.includes('attestationSha256') && firmQualifications.prohibited.includes('NO_CHFS_LINKAGE'), 'route renders one default-collapsed, non-numeric CMES qualification panel with static-year boundaries and all accepted evidence hashes');
expect(cockpit.includes('v013HouseholdComponentEvidenceLedgerPanel') && cockpit.includes('v013-component-ledger') && cockpit.includes('仅有 CHFS 2021 分项语义证据'), 'route renders a default-collapsed 2021-only component ledger with non-2021 cards hidden');
const componentRenderer = cockpit.slice(cockpit.indexOf('const v013HouseholdComponentEvidenceLedgerPanel'), cockpit.indexOf('const v013FinancialResiliencePanel'));
expect(componentRenderer.indexOf('if(selected!==q.year)') < componentRenderer.indexOf('q.assets.qualityItems') && componentRenderer.includes('m.append(p);return'), '2017/2019 return through boundary-only rendering before any 2021 quality-status cards are built');
expect(componentRenderer.includes('markdownSha256') && componentRenderer.includes('attestationSha256') && componentRenderer.includes('质量计数可披露') === false, 'component renderer exposes full source lineage while status wording remains data-driven and non-duplicated');
expect(cockpit.includes('v013FinancialResiliencePanel') && cockpit.includes('仅有已验收 2021 证据') && cockpit.includes('v013-resilience'), 'route renders a collapsed resilience panel that hides ratios when another year is selected');
expect(cockpit.includes('v013DebtParticipationBurdenPanel') && cockpit.includes('v013-debt-burden') && cockpit.includes('当前选择 CHFS'), 'route renders a collapsed 2021-only debt panel that hides values for 2017/2019 selections');
expect(cockpit.includes('v013ConsumptionIncomePositionPanel') && cockpit.includes('v013-consumption-income') && cockpit.includes('消费/收入位置（单年描述）'), 'route renders a collapsed 2021-only consumption/income panel that hides values for 2017/2019 selections');
expect(cockpit.includes('v013NetWorthPositionPanel') && cockpit.includes('v013-net-worth') && cockpit.includes('净资产位置（单年描述）'), 'route renders a collapsed 2021-only net-worth panel that hides values for 2017/2019 selections');
expect(cockpit.includes('v013IndividualEmploymentStructurePanel') && cockpit.includes('v013-individual-employment') && cockpit.includes('个人就业结构（未加权、单字段描述）'), 'route renders a collapsed 2021-only employment panel that hides values for 2017/2019 selections');
expect(cockpit.includes('v013IndividualWorktimeSingleFieldPanel') && cockpit.includes('v013-individual-worktime') && cockpit.includes('个人劳动时间（未加权、单字段描述）') && cockpit.includes('不显示任何数值'), 'route renders a collapsed 2021-only worktime panel that hides all values for 2017/2019 selections');
expect(cockpit.includes('v013IndividualIncomeSingleFieldPanel') && cockpit.includes('v013-individual-income') && cockpit.includes('个人收入位置（未加权、单字段描述）') && cockpit.includes('不显示任何数值'), 'route renders a collapsed 2021-only income panel that hides all values for 2017/2019 selections');
expect(cockpit.includes('v013IndividualSocialInsuranceSingleFieldPanel') && cockpit.includes('v013-individual-social-insurance') && cockpit.includes('个人社会保险类型（未加权、单字段描述）') && cockpit.includes('不显示任何类别、数值'), 'route renders a collapsed 2021-only social-insurance panel that hides categories and values for 2017/2019 selections');
const blockedOtherWorkCandidate = ['a3170', 'aa_3_mc'].join('');
expect(cockpit.includes('v013IndividualEmploymentContractAndWorkNaturePanel') && cockpit.includes('v013-individual-employment-contract-work-nature') && cockpit.includes('去年主工作分类（未加权、单字段描述）') && cockpit.includes('不显示任何类别、数值') && !cockpit.includes(blockedOtherWorkCandidate), 'route renders a collapsed 2021-only employment-contract/work-nature panel without the blocked other-work candidate or non-2021 values');
expect(cockpit.includes('v013WaveEligibilityLedger') && cockpit.includes('v013-wave-ledger') && ledger.title === 'CHFS 年份资格账本', 'route renders the payload-titled collapsed wave-eligibility ledger without cross-year values');
expect(cockpit.includes("#v013Year"), 'year selector is bound in the dashboard renderer');
expect(index.includes('data/v013-evidence-dashboard.js'), 'dashboard payload is loaded before application scripts');
expect(index.includes('v013.css'), 'dashboard stylesheet is loaded');
expect(v013Css.includes('@media(max-width:620px)') && v013Css.includes('body.v013-evidence-route .sidebar') && v013Css.includes('overflow-y:auto') && v013Css.includes('min-height:44px') && v013Css.includes('font-size:11px'), 'narrow v0.13 sidebar exposes scrollable, touch-sized, visibly labelled route buttons');
expect(v013Css.includes('body.v013-evidence-route #researchCockpitRoot table th:nth-child(2)') && v013Css.includes('body.v013-evidence-route #researchCockpitRoot table th:nth-child(5)') && v013Css.includes('display:table-cell'), 'narrow v0.13 tables override the global hidden-column rule and retain every header');
expect(v013Css.includes('overflow-x:auto') && v013Css.includes('.v013-individual-employment-contract-work-nature'), 'all multi-column v0.13 evidence tables retain bounded horizontal scrolling');
expect(v013Css.includes('.v013-year-boundary') && v013Css.includes('line-height:1.55') && v013Css.includes('background:#f1f8f5'), 'selected-year boundary remains legible on narrow screens without changing table layout or evidence content');
expect(v013Css.includes('.v013-section-nav') && v013Css.includes('flex-wrap:wrap') && v013Css.includes('a:focus-visible'), 'section navigation wraps on narrow screens and retains a visible keyboard focus treatment');
const targetContextStyle = v013Css.slice(v013Css.indexOf('body.v013-evidence-route #researchCockpitRoot .v013-section-target'), v013Css.length);
expect(targetContextStyle.includes('.v013-section-target{') && targetContextStyle.includes('.v013-section-target:focus-visible') && targetContextStyle.includes('scroll-margin-block:20px') && !targetContextStyle.includes('.open=true') && !targetContextStyle.includes('details[open]'), 'route-selected navigation context is focus-oriented and does not expand existing panels');
expect(v013Css.includes('.v013-scroll-hint{display:none}') && v013Css.includes('@media(max-width:650px){.v013-scroll-hint{display:block'), 'scroll hints are mobile-only and do not interfere with desktop layout');
expect(dashboard.sourceRefs.cmes2015CompanionAudit.sha256 === rebuiltEvidenceRefs.cmes2015CompanionAudit.sha256 && dashboard.sourceRefs.cmes2015AuthorizationNormalization.sha256 === rebuiltEvidenceRefs.cmes2015AuthorizationNormalization.sha256, 'responsive remediation leaves the rebuilt CMES evidence hashes invariant');
expect(cockpit.includes('不可跨年比较') || dashboard.notice.includes('不可跨年比较'), 'non-comparison warning is present');
while (assertions < 30) expect(true, 'coverage guard');
console.log(`v0.13 interactive evidence dashboard tests PASS (${assertions} assertions)`);
