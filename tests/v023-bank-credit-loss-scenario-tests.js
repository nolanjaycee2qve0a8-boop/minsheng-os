const fs=require('fs'),vm=require('vm');
const c={window:{},console};c.window=c;
for(const file of ['data/bank-exposure-seed.js','data/bank-asset-quality-seed.js','data/bank-credit-loss-scenario-seed.js','modules/bank-credit-loss-scenario-engine.js'])vm.runInNewContext(fs.readFileSync(file,'utf8'),c);
const api=c.MinshengBankCreditLossScenario,clone=x=>JSON.parse(JSON.stringify(x));let count=0;const must=(x,m)=>{count++;if(!x)throw Error(`T${count}: ${m}`);};
const fresh=()=>{const s={records:[{id:'real-observation'}],lossAllocationRuns:[{id:'formal-loss-run'}],research:[]};api.ensure(s);return s;};
const base=(overrides={})=>({bank:'ICBC',portfolio:'PERSONAL_MORTGAGE',mode:'NEW_MIGRATION_SCENARIO',scenarioMigrationRate:2,scenarioMigrationRateUnit:'PERCENT',scenarioMigrationRateSourceType:'USER_SCENARIO',scenarioLGD:40,scenarioLGDUnit:'PERCENT',scenarioLGDSourceType:'USER_SCENARIO',scenarioHorizon:12,scenarioHorizonUnit:'MONTH',scenarioHorizonSourceType:'USER_SCENARIO',...overrides});
// 1–8 anchors and eligibility gates.
const s=fresh(),matrix=api.eligibilityMatrix(s);must(s.bankDisclosureRecords.length===6&&s.bankAssetQualityRecords.length===36,'v021/v022 audited anchors materialised');
must(matrix.filter(x=>x.status==='EXACT_SCOPE_MATCH').length===5,'five exact scope combinations');
must(matrix.find(x=>x.bank==='PSBC'&&x.portfolio==='CORPORATE_REAL_ESTATE').status==='SCOPE_MISMATCH_BLOCKED','PSBC corporate scope blocked');
const pair=matrix[0],e=clone(s.bankDisclosureRecords.find(x=>x.id===pair.exposureId)),n=clone(s.bankAssetQualityRecords.find(x=>x.id===pair.nplId));
must(api.assessEligibility({...e,consolidationScope:'DOMESTIC_BRANCHES'},n,{semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ICBC',accountingScope:'LOAN_DISCLOSURE'}}).status==='SCOPE_MISMATCH_BLOCKED','consolidation mismatch');
must(api.assessEligibility({...e,geography:'OTHER'},n,{semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ICBC',accountingScope:'LOAN_DISCLOSURE'}}).status==='SCOPE_MISMATCH_BLOCKED','geography mismatch');
must(api.assessEligibility({...e,exposureConcept:'PERSONAL_LOANS'},n,{semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ICBC',accountingScope:'LOAN_DISCLOSURE'}}).status==='CONCEPT_MISMATCH_BLOCKED','concept mismatch');
must(api.assessEligibility({...e,asOf:'2024-12-31'},n,{semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ICBC',accountingScope:'LOAN_DISCLOSURE'}}).status==='PERIOD_MISMATCH_BLOCKED','period mismatch');
const converted=api.assessEligibility({...e,value:e.value*1e6,unit:'CNY'},n,{semantics:{geography:'GROUP_CONSOLIDATED',onOffBalance:'ON_BALANCE',grossNet:'GROSS',auditedEntity:'ICBC',accountingScope:'LOAN_DISCLOSURE'}});must(converted.status==='COMPATIBLE_WITH_EXPLICIT_RULE'&&converted.exposureCanonical===e.value,'explicit unit conversion');
// 9–12 formula modes and overlap discipline.
const a=api.run(base({mode:'EXISTING_NPL_RECOVERY_SCENARIO',scenarioMigrationRate:undefined,scenarioMigrationRateUnit:undefined,scenarioMigrationRateSourceType:undefined,runId:'a'}),s);must(a.run.outputs.grossScenarioCreditLossBeforeAllowanceAndCapital===24900,'Mode A formula');
const b=api.run(base({runId:'b'}),s);must(b.run.outputs.performingExposure===5813618&&b.run.outputs.newMigrationScenarioLoss===46508.944,'Mode B performing-exposure formula');
const cRun=api.run(base({mode:'COMBINED_STOCK_AND_FLOW_SCENARIO',existingNplTreatment:'INCLUDE_EXISTING_NPL_STOCK',existingNplTreatmentSourceType:'USER_SCENARIO',runId:'c'}),s);must(cRun.run.outputs.grossScenarioCreditLossBeforeAllowanceAndCapital===a.run.outputs.grossScenarioCreditLossBeforeAllowanceAndCapital+b.run.outputs.grossScenarioCreditLossBeforeAllowanceAndCapital&&cRun.run.warnings.includes('STOCK_FLOW_COMBINATION'),'Mode C non-overlap');
must(api.run(base({mode:'TOTAL_EXPOSURE_FRACTION_SCENARIO',existingNplTreatment:'INCLUDE_EXISTING_NPL_STOCK',runId:'d-block'}),s).status==='BLOCKED','Mode D excludes stock NPL');
const modeD=api.run(base({mode:'TOTAL_EXPOSURE_FRACTION_SCENARIO',runId:'d-ready'}),s);must(modeD.status==='READY'&&modeD.run.warnings.includes('SIMPLIFIED_TOTAL_EXPOSURE_SCENARIO'),'Mode D is a separate simplified scenario');
// 13–18 parameter boundaries and labels.
must(api.run(base({scenarioMigrationRate:-.1}),s).status==='BLOCKED'&&api.run(base({scenarioMigrationRate:101}),s).status==='BLOCKED','migration bounds');
must(api.run(base({scenarioLGD:-1}),s).status==='BLOCKED'&&api.run(base({scenarioLGD:101}),s).status==='BLOCKED','LGD bounds');
const zero=api.run(base({scenarioMigrationRate:0,scenarioLGD:0,runId:'zero'}),s);must(zero.status==='READY'&&zero.run.outputs.grossScenarioCreditLossBeforeAllowanceAndCapital===0,'zero explicit parameters valid');
must(api.run(base({scenarioLGD:undefined}),s).status==='BLOCKED','missing parameter blocked');
must(api.run(base({scenarioHorizon:undefined,scenarioHorizonUnit:''}),s).status==='BLOCKED','missing horizon blocked');
must(api.run(base({scenarioMigrationRate:NaN}),s).status==='BLOCKED'&&api.run(base({scenarioLGD:Infinity}),s).status==='BLOCKED','NaN and Infinity rejected');
must(cRun.run.classificationTags.includes('NOT_OBSERVED_LOSS')&&cRun.run.limitations.includes('GROSS_SCENARIO_CREDIT_LOSS_BEFORE_ALLOWANCE_AND_CAPITAL'),'stock flow labels');
// 19–25 NPL/allowance/capital/LGFV/national restrictions.
must(!Object.keys(base()).some(x=>/nplratio|pd/i.test(x))&&api.parameters(base()).manifest.every(x=>x.parameter!=='publishedNplRatio'),'published NPL ratio never becomes PD');
must(!Object.values(c.MinshengBankAssetQualitySeed.derivedRecords).some(x=>x.id===base().scenarioMigrationRate),'derived NPL ratio has no default migration role');
must(cRun.run.warnings.includes('NO_ALLOWANCE_NETTING'),'allowance not netted');
must(cRun.run.warnings.includes('NO_CAPITAL_IMPACT')&&!('capitalImpact' in cRun.run.outputs),'ECL/capital not calculated');
must(api.lgfvScenario().reasons[0]==='LGFV_EXPOSURE_UNKNOWN_BLOCKED','LGFV blocked');
must(api.nationalBankLoss().reasons[0]==='NATIONAL_BANK_LOSS_BLOCKED','national loss blocked');
must(api.run(base({bank:'PSBC',portfolio:'CORPORATE_REAL_ESTATE'}),s).status==='BLOCKED','scope-mismatch migration blocked');
// 26–32 immutable runs, sample aggregation, matrix and manifests.
must(b.run.bank==='ICBC'&&b.run.status==='READY'&&s.bankCreditLossScenarioRuns.some(x=>x.id==='b'),'single-bank run');
const abc=api.run(base({bank:'ABC',runId:'abc'}),s);const aggregate=api.aggregate({runIds:['b','abc'],scope:'BANK_SAMPLE_SCENARIO_ONLY_NOT_NATIONAL',explicitBankSampleAggregation:true},s);must(aggregate.status==='READY'&&aggregate.aggregate.limitations.includes('NO_NATIONAL_EXTRAPOLATION'),'sample aggregation eligibility/no extrapolation');
must(api.aggregate({runIds:['b','abc'],explicitBankSampleAggregation:false},s).status==='BLOCKED','sample requires explicit request');
const matrixRun=api.sensitivity({...base({runId:undefined}),scenarioMigrationRates:[3,1,1],scenarioLGDs:[50,25]},s);must(matrixRun.status==='READY'&&matrixRun.matrix.cells.length===4&&matrixRun.matrix.migrationRates.join(',')==='0.01,0.03','deterministic de-duplicated sensitivity matrix');
must(api.sensitivity(base(),s).status==='BLOCKED','no built-in sensitivity arrays');
must(matrixRun.matrix.cells.every(x=>x.classification==='SCENARIO_ESTIMATE'&&x.assumptionManifest.length>=3),'every sensitivity cell is scenario with sources');
must(cRun.run.assumptionManifest.length===4&&cRun.run.assumptionManifest.every(x=>x.sourceType==='USER_SCENARIO'),'assumption manifest');
const proxy=api.run(base({scenarioLGDSourceType:'RESEARCH_PROXY',runId:'proxy'}),s);must(proxy.run.classification==='PROXY_SCENARIO','proxy classification');
// 33–41 parameter revisions, stale targeting, isolation and readiness.
const later=api.run(base({scenarioMigrationRate:3,runId:'later'}),s);must(later.run.id!=='b'&&s.bankCreditLossScenarioRuns.filter(x=>x.bank==='ICBC').length>=4,'parameter change creates new immutable run');
const before=clone(b.run.outputs);s.bankDisclosureRecords.find(x=>x.id==='bank_icbc_2025_personal_mortgage').revision=1;const staleExposure=api.refreshStaleness(s);must(staleExposure.includes('b')&&s.bankCreditLossScenarioRuns.find(x=>x.id==='abc').status==='READY','exposure revision precisely stales ICBC only');
const nplRun=api.run(base({bank:'ABC',runId:'npl-run'}),s);s.bankAssetQualityRecords.find(x=>x.id==='asset_quality_abc_2025_personal_mortgage_npl_balance').revision=1;const staleNpl=api.refreshStaleness(s);must(staleNpl.includes('npl-run')&&s.bankCreditLossScenarioRuns.find(x=>x.id==='b').outputs.grossScenarioCreditLossBeforeAllowanceAndCapital===before.grossScenarioCreditLossBeforeAllowanceAndCapital,'NPL stale preserves historical payload');
const d=api.run(base({bank:'ICBC',mode:'TOTAL_EXPOSURE_FRACTION_SCENARIO',runId:'d',scenarioMigrationRate:1}),s);s.bankAssetQualityRecords.find(x=>x.id==='asset_quality_icbc_2025_personal_mortgage_npl_balance').revision=1;api.refreshStaleness(s);must(d.run.status==='READY'&&!s.bankCreditLossScenarioRuns.find(x=>x.id==='d').inputReferences.some(x=>x.collection==='bankAssetQualityRecords'),'Mode D does not depend on NPL');
must(s.records.length===1&&s.records[0].id==='real-observation'&&!s.lossAllocationRuns.some(x=>x.id==='b'),'no writes to REAL observations or loss allocation');
const report=api.report(s);must(report.readiness.some(x=>x.status==='FORMAL_BANK_LOSS_BLOCKED')&&report.causalValidation==='PARTIAL','formal loss and causality unchanged');
// 42 UI has blank numeric inputs and all mandatory warning text.
const index=fs.readFileSync('index.html','utf8'),moduleText=fs.readFileSync('modules/bank-credit-loss-scenario-engine.js','utf8');must(index.includes('bank-credit-loss-scenario-seed.js')&&index.includes('bank-credit-loss-scenario-engine.js')&&!/id="v023(Migration|LGD|Horizon)"[^>]*\svalue=/.test(moduleText)&&['这是银行样本情景，不是全国银行损失估计','不良率不会自动作为违约概率','LGD 和迁徙率均为用户情景假设','拨备和资本吸收前的毛情景损失','不会写入 REAL 记录或正式损失链'].every(x=>moduleText.includes(x)),'blank UI inputs and mandatory warnings');
console.log(`v0.23 bank credit-loss scenario tests PASS (${count} assertions)`);
