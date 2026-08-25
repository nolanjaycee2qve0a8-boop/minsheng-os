const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..'),context={console,window:{}};context.window=context;
['data/calibrations.js','data/calibration-specs.js','modules/series-builder.js','modules/lag-explorer.js','modules/regression-engine.js','modules/pair-readiness.js','modules/historical-backfill-engine.js','modules/calibration-engine.js','modules/historical-calibration-runner.js'].forEach(file=>vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file}));
const must=(condition,message)=>{if(!condition)throw Error(message);};
const make=(indicatorId,seriesId,period,value,transformation,aggregation)=>({id:`${indicatorId}_${period}`,status:'REAL',sourceId:'nbs',indicatorId,seriesId,period,value,convertedValue:value,frequency:'monthly',observationType:'growth_rate',transformation,aggregation,revision:0});
const rows=[];for(let i=0;i<48;i++){const year=2019+Math.floor(i/12),month=String(i%12+1).padStart(2,'0'),period=`${year}-${month}`;rows.push(make('property_sales_area_yoy','CN.NBS.PROPERTY_SALES_AREA.YTD.YOY',period,i/10,'YTD_YOY','YTD'),make('retail_sales_ytd_yoy','CN.NBS.RETAIL_SALES.YTD.YOY',period,i/11,'YTD_YOY','YTD'));}
const result=context.MinshengHistoricalCalibrationRunner.run(context.MinshengCalibrationSpecsV094[1],rows);
must(result.preRegistrationStatus==='PRE_REGISTERED'&&result.ytdWarning==='OVERLAPPING_WINDOW_WARNING'&&result.decision==='RESEARCH_ESTIMATE_ONLY','v0.9.4 runner must preserve YTD warning and pre-registration');
const commitContext={console,window:{MinshengSourceDocuments:[],MinshengDataRecords:[]}};commitContext.window=commitContext.window;vm.runInNewContext(fs.readFileSync(path.join(root,'data/nbs-v094-real-commit.js'),'utf8'),commitContext,{filename:'data/nbs-v094-real-commit.js'});
must(commitContext.window.MinshengSourceDocuments.length===2&&commitContext.window.MinshengDataRecords.length===6&&commitContext.window.MinshengDataRecords.every(x=>x.status==='REAL'),'Manual REAL commit must contain only the reviewed industrial and retail records');
console.log('v0.9.4 calibration runner tests PASS');
