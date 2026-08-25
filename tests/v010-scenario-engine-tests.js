const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),context={console,window:{},data:null};context.window=context;
const load=file=>vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
context.MinshengDataRecords=[
 {id:'m2_202007',indicatorId:'money_m2_yoy_derived_official',revision:0,status:'REAL'},
 {id:'industrial_202007',indicatorId:'industrial_value_added_yoy',revision:0,status:'REAL'},
 {id:'property_202007',indicatorId:'property_sales_area_yoy',revision:0,status:'REAL'},
 {id:'retail_202007',indicatorId:'retail_sales_ytd_yoy',revision:0,status:'REAL'}
];
context.MinshengSourceDocuments=[];context.MinshengRawPayloads=[];context.MinshengResearch=[];context.MinshengEvidence=[];context.MinshengCalibrationSeed={};context.MinshengCalibrationSpecsV094=[];context.MinshengScenarios=[];
['data/v010-baseline-snapshot.js','data/regimes.js','data/scenario-parameters.js'].forEach(load);
context.data={records:context.MinshengDataRecords,regimes:context.MinshengRegimes,scenarioParameters:context.MinshengScenarioParameters,parameterVersions:context.MinshengParameterVersions,scenariosV2:context.MinshengScenariosV2,scenarioRunsV2:[],baselineSnapshots:context.MinshengBaselineSnapshots,auditLog:[],scenarios:[]};
load('modules/scenario-v010-engine.js');
const engine=context.MinshengScenarioV010,must=(condition,message)=>{if(!condition)throw Error(message);};
let result=engine.validate({scenario:'scenario_v010_m2_industrial'});
must(result.status==='BLOCKED'&&result.reasons.includes('REGIME_REQUIRED'),'M2 must be blocked when no regime is selected');
result=engine.validate({scenario:'scenario_v010_m2_industrial',regimeSelection:{mode:'MANUAL',regimeId:'regime_2020_2022'}});
must(result.status==='READY_WITH_WARNINGS'&&result.propagation.targetDirection==='positive','2020-2022-like M2 case must preserve the positive historical association');
result=engine.validate({scenario:'scenario_v010_m2_industrial',regimeSelection:{mode:'MANUAL',regimeId:'regime_2023_plus'}});
must(result.status==='READY_WITH_WARNINGS'&&result.propagation.targetDirection==='negative','2023+-like M2 case must preserve the negative historical association');
result=engine.validate({scenario:'scenario_v010_property_pressure'});
must(result.status==='BLOCKED'&&result.reasons.includes('PARAMETER_MAPPING_REVIEW_REQUIRED'),'Research-estimate mapping must require manual acceptance');
must(engine.acceptMapping('param_property_retail_v1').ok,'Property mapping acceptance failed');
must(engine.setActive('param_property_retail_v1',true).ok,'Accepted property parameter activation failed');
result=engine.run({scenario:'scenario_v010_property_pressure'});
must(result.status==='READY_WITH_WARNINGS'&&result.propagation.targetDirection==='negative','Property shock must create directional negative retail pressure without a numeric effect');
must(result.run.provenance.parameterVersionIds.includes('param_property_retail_v1')&&result.run.provenance.sourceCalibrationIds.includes('v094_spec_property_retail_ytd'),'Scenario provenance is incomplete');
context.data.scenariosV2.push({id:'mixed',shock:{direction:'negative'},parameterVersionIds:['param_property_retail_v1','param_legacy_property_consumption_v1'],regimeSelection:{mode:'UNKNOWN'}});
result=engine.validate({scenario:'mixed'});
must(result.status==='READY_WITH_WARNINGS'&&result.warnings.includes('MIXED_PARAMETER_QUALITY'),'Mixed quality warning was not raised');
context.data.records.find(record=>record.id==='retail_202007').revision=1;
must(engine.refreshStaleness().some(item=>item.id==='param_property_retail_v1'),'Revised source record did not stale the parameter');
result=engine.validate({scenario:'scenario_v010_property_pressure'});
must(result.status==='BLOCKED'&&result.reasons.includes('STALE_PARAMETER'),'Stale parameter must block scenario propagation');
must(context.MinshengV010BaselineSnapshot.id==='minsheng-os-v0.9-calibration-baseline','Baseline marker is missing');
console.log('v0.10 regime-aware scenario engine tests PASS');
