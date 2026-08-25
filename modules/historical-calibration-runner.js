/* Runs only pre-registered REAL-only specifications; it does not infer causality. */
window.MinshengHistoricalCalibrationRunner=(()=>{
 const periods={ '2018-2019':['2018-01','2019-12'],'2020-2022':['2020-01','2022-12'],'2023+':['2023-01','9999-12'] };
 const inRange=(records,start,end)=>records.filter(record=>String(record.period)>=start&&String(record.period)<=end);
 function classify(result){if(result.status==='DATA_INSUFFICIENT')return 'DATA_INSUFFICIENT';const correlation=result.correlation?.pearson;if(!Number.isFinite(correlation))return 'DATA_INSUFFICIENT';return Math.abs(correlation)<.2?'WEAK':'RESEARCH_ESTIMATE';}
 function run(spec,records,methodologyEvents=[]){
  const base={...spec,lags:spec.lagSet,allowPartialTransformation:false};
  const result=window.MinshengCalibrationEngine.run(base,records,methodologyEvents);
  const ytd=spec.transformation.source==='YTD_YOY'||spec.transformation.target==='YTD_YOY';
  const regimes=(spec.regimes||[]).map(label=>{const range=periods[label];if(!range)return {label,status:'INSUFFICIENT_REGIME_SAMPLE'};const out=window.MinshengCalibrationEngine.run(base,inRange(records,...range),methodologyEvents);return {label,status:out.status==='DATA_INSUFFICIENT'?'INSUFFICIENT_REGIME_SAMPLE':out.status,pearson:out.correlation?.pearson??null,sampleSize:out.correlation?.sampleSize??0};});
  let rolling=[];
  if(spec.rolling?.enabled&&result.sourceSeries?.values.length>=spec.rolling.minN&&result.targetSeries?.values.length>=spec.rolling.minN){const rows=window.MinshengSeriesBuilder.align(result.sourceSeries,result.targetSeries,0);for(let index=spec.rolling.window-1;index<rows.length;index++)rolling.push({end:rows[index].period,sampleSize:spec.rolling.window,pearson:window.MinshengLagExplorer.pearson(rows.slice(index-spec.rolling.window+1,index+1))});}
  return {specId:spec.id,preRegistrationStatus:spec.status,result,status:result.status,relationshipStatus:classify(result),lagResults:result.lagResults||[],pearson:result.correlation?.pearson??null,spearman:result.correlation?.spearman??null,ols:result.regression||null,regimes,rolling,ytdWarning:ytd?'OVERLAPPING_WINDOW_WARNING':null,interpretation:ytd?'EXPLORATORY: YTD observations share overlapping cumulative windows.':'EXPLORATORY: correlation does not establish causality.',decision:'RESEARCH_ESTIMATE_ONLY'};
 }
 return {run};
})();
