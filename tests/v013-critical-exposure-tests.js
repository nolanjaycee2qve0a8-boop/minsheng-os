const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),context={console,window:{}};context.window=context;
const load=file=>vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
['config/critical-exposure-qualification-rules.js','data/critical-exposure-qualifications.js','data/causal-edge-validation.js'].forEach(load);
load('modules/persistence.js');
const migrated=context.MinshengPersistence.migrate({},'0.12');
if(!['criticalExposureItems','qualificationAssessments','calculationReadinessRecords','causalEdges','causalValidationRecords','downstreamStaleness'].every(key=>Array.isArray(migrated[key])))throw Error('v0.13 persistence migration must add safe empty collections without qualifying data.');
const direct=(id,intendedUses,recordId='real_0')=>({id,name:id,dataSemantic:'DIRECT_OBSERVATION',value:0,unit:'CNY_100M',dataNature:'STOCK',period:'2026-06',asOf:'2026-07-01',vintage:'2026-07-01',geography:'CN',sectorScope:'TEST_TOTAL',consolidationScope:'TEST',sourceRef:'Official source',sourceRecordIds:[recordId],qualificationStatus:'MAPPED',intendedUses,duplicateRisk:false});
context.data={records:[{id:'real_0',revision:0,status:'REAL'},{id:'real_1',revision:0,status:'REAL'},{id:'mock_record',revision:0,status:'MOCK'}],research:[],evidence:[],auditLog:[],criticalExposureItems:[
 direct('direct_a',['TEST_NUMERIC','TEST_PROXY','USE_A']),direct('direct_b',['TEST_NUMERIC'],'real_1'),
 {...direct('missing_source',['TEST_NUMERIC']),sourceRef:null,sourceRecordIds:[]},
 {...direct('missing_unit',['TEST_NUMERIC']),unit:null},
 {...direct('missing_period',['TEST_NUMERIC']),period:null},
 {...direct('mock_source',['TEST_NUMERIC'],'mock_record')},
 {...direct('bad_scope',['TEST_NUMERIC']),dataNature:'FLOW'},
 {...direct('derived_missing',['TEST_NUMERIC']),dataSemantic:'DERIVED',derivation:{formula:null,inputIds:[]}},
 {...direct('proxy_only',['TEST_PROXY']),dataSemantic:'PROXY',proxyRestrictions:['Sample bias must remain visible.']},
 {...direct('rejected_item',['TEST_NUMERIC']),qualificationStatus:'REJECTED'}
],qualificationAssessments:[],calculationReadinessRecords:[],causalEdges:[],causalValidationRecords:[],downstreamStaleness:[],lossAllocationRuns:[{id:'historical_run',qualificationAssessmentIds:[],historicalPayload:{amount:null,status:'IMMUTABLE'}}]};
load('modules/critical-exposure-qualification.js');
const engine=context.MinshengCriticalExposureQualification,must=(value,message)=>{if(!value)throw Error(message);};
const rules=context.MinshengCriticalExposureQualificationRules;
rules.readinessRequirements.TEST_NUMERIC={directional:true,items:['direct_a','direct_b'],intendedUse:'TEST_NUMERIC'};
rules.readinessRequirements.TEST_PROXY={directional:true,items:['direct_a','proxy_only'],intendedUse:'TEST_PROXY'};
rules.readinessRequirements.TEST_BLOCKED={directional:true,items:['direct_a','missing_source'],intendedUse:'TEST_NUMERIC'};

const qualified=engine.assess('direct_a','TEST_NUMERIC');
must(qualified.status==='QUALIFIED'&&qualified.qualifiedForFormal,'A direct, traceable value of zero must qualify for its approved intended use.');
must(engine.assess('household_disposable_income_total','HOUSEHOLD_INCOME_TO_LIQUIDITY_NUMERIC').status==='DISCOVERED','An unacquired critical gap must remain DISCOVERED rather than being turned into zero or an estimate.');
must(engine.assess('direct_a','USE_B').blockerCodes.includes('INTENDED_USE_NOT_APPROVED'),'Intended-use mismatch must block a formally valid source.');
must(engine.assess('missing_source','TEST_NUMERIC').blockerCodes.includes('SOURCE_MISSING'),'Missing source must block a non-empty value.');
must(engine.assess('missing_unit','TEST_NUMERIC').blockerCodes.includes('UNIT_MISSING'),'Missing units must block formal qualification.');
must(engine.assess('missing_period','TEST_NUMERIC').blockerCodes.includes('PERIOD_MISSING'),'Missing periods must block formal qualification.');
must(engine.assess('mock_source','TEST_NUMERIC').blockerCodes.includes('MOCK_SOURCE_NOT_ELIGIBLE'),'A MOCK source record must not qualify a direct observation.');
must(engine.assess('bad_scope','TEST_NUMERIC',{expectedNature:'STOCK'}).blockerCodes.includes('STOCK_FLOW_MISMATCH'),'Stock/flow mismatch must be explicit.');
must(engine.assess('derived_missing','TEST_NUMERIC').failedRules.includes('DERIVATION_FORMULA_MISSING'),'Derived values need a reproducible formula.');
must(engine.assess('proxy_only','TEST_PROXY').status==='PROXY_ONLY','Proxy data must remain proxy-only.');
must(engine.assess('rejected_item','TEST_NUMERIC').status==='REJECTED','Rejected items cannot be reinstated by a value.');

const numeric=engine.readiness('TEST_NUMERIC');
must(numeric.status==='QUALIFIED_NUMERIC'&&numeric.canFormalNumeric,'Only all-qualified direct inputs may unlock formal numeric readiness.');
const proxy=engine.readiness('TEST_PROXY',{allowProxy:true});
must(proxy.status==='PROXY_SCENARIO_ONLY'&&proxy.canProxyScenario&&!proxy.canFormalNumeric,'Proxy readiness must require explicit proxy permission and never become formal numeric.');
must(engine.readiness('TEST_BLOCKED').status==='DIRECTION_ONLY','A directional chain with an unqualified input must not be numerically ready.');
must(engine.readiness('PROPERTY_SALES_DEVELOPER_LOCAL_FISCAL').status==='DIRECTION_ONLY','Unacquired critical property/fiscal inputs remain direction-only.');
must(engine.readiness('HOUSEHOLD_INCOME_DEBT_LIQUIDITY').status==='DIRECTION_ONLY','Unacquired household/mortgage inputs remain direction-only.');
const gaps=context.data.criticalExposureItems;
must(gaps.find(item=>item.id==='household_mortgage_balance').blockers.includes('HOUSEHOLD_MEDIUM_LONG_TERM_LOANS_NOT_EQUIVALENT_TO_MORTGAGES'),'Household medium/long-term loans must not be silently mapped to mortgages.');
must(gaps.find(item=>item.id==='developer_financing').blockers.includes('REAL_ESTATE_DEVELOPMENT_FUNDS_NOT_DEBT_BALANCE'),'Developer funding flows must not be silently treated as debt stocks.');
must(gaps.find(item=>item.id==='bank_property_lgfv_exposure').blockers.includes('INFRASTRUCTURE_LOANS_NOT_EQUIVALENT_TO_LGFV_EXPOSURE'),'Infrastructure lending must not be silently treated as LGFV exposure.');
must(gaps.find(item=>item.id==='land_related_fiscal_revenue').blockers.includes('GROSS_LAND_REVENUE_NOT_NET_FISCAL_RESOURCE'),'Gross land revenue must not be silently treated as net fiscal resource.');
must(gaps.find(item=>item.id==='local_government_debt_service').blockers.includes('LEGAL_DEBT_AND_IMPLICIT_ESTIMATES_MUST_BE_SEPARATE'),'Legal debt and implicit-debt estimates must stay separate.');

['data/sector-balance-sheets.js','data/sector-exposures.js','data/sector-data-gaps.js','data/sector-shocks.js'].forEach(load);
Object.assign(context.data,{sectorBalanceSheets:context.MinshengSectorBalanceSheets,sectorExposures:context.MinshengSectorExposures,sectorDataGaps:context.MinshengSectorDataGaps,sectorSnapshots:[],debtServiceMetrics:[],lossAllocationLinks:[],balanceSheetRepairAssessments:[],scenarioRunsV2:[],policyActions:[]});
load('modules/loss-allocation-engine.js');
const loss=context.MinshengLossAllocationEngine.run({shockType:'PROPERTY_SALES_SHOCK',magnitude:-10});
must(loss.ok&&loss.run.qualificationReadiness.status==='DIRECTION_ONLY','The v0.12 loss path must consult v0.13 readiness before claiming a numerical result.');
must(loss.run.allocations.every(item=>item.amount===null),'A direction-only qualification result must keep numerical loss amounts BLOCKED.');

const edge=engine.validateCausalEdge('edge_property_sales_developer_cashflow');
must(edge.status==='HYPOTHESIS','No-evidence causal edge must remain a hypothesis.');
context.data.evidence.push({id:'correlation_only',evidenceStrength:'CORRELATION_ONLY',causalRelevance:false,scopeMatch:true,sourceRecordIds:['real_0']});
const correlation=engine.validateCausalEdge('edge_property_sales_developer_cashflow',['correlation_only']);
must(correlation.status!=='VALIDATED_FOR_SCOPE'&&correlation.blockerCodes.includes('CORRELATION_NOT_CAUSAL'),'Correlation evidence must not validate causality.');

const assessment=engine.recordAssessment('direct_a','TEST_NUMERIC');
context.data.lossAllocationRuns[0].qualificationAssessmentIds=[assessment.id];
const originalRun=JSON.stringify(context.data.lossAllocationRuns[0]);
context.data.records.find(item=>item.id==='real_0').revision=1;
const stale=engine.refreshStaleness();
must(context.data.qualificationAssessments.find(item=>item.id===assessment.id).status==='STALE','A revised source record must stale only its linked qualification assessment.');
must(context.data.calculationReadinessRecords.find(item=>item.id===numeric.id).status==='STALE','Readiness must stale when one of its assessments becomes stale.');
must(context.data.downstreamStaleness.some(item=>item.targetId==='historical_run'),'Downstream loss runs must receive a separate staleness marker.');
must(JSON.stringify(context.data.lossAllocationRuns[0])===originalRun,'Historical loss-run payload must remain immutable after staleness propagation.');
must(stale.length>=3,'Targeted staleness should report linked assessments, readiness and downstream consumers.');
must(context.data.research.filter(item=>/^R019$|^R02[0-3]$/.test(item.id)).length===5,'Critical data-gap research records R019-R023 must be registered.');
console.log('v0.13 critical-exposure qualification tests PASS');
