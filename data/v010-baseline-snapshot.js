/* Immutable local marker captured before v0.10 scenario-state additions. */
(()=>{
 const clone=value=>JSON.parse(JSON.stringify(value??null));
 const freeze=value=>{if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.freeze(value);Object.values(value).forEach(freeze);return value;};
 const snapshot={
  id:'minsheng-os-v0.9-calibration-baseline',
  createdAt:'2026-08-19T15:45:00.000Z',
  status:'IMMUTABLE_LOCAL_BASELINE',
  purpose:'Return point for the accepted v0.9 REAL data, research, intelligence, and historical calibration state before v0.10 scenario changes.',
  manifest:{
   'data/data-records.js':'C4525CE35DC241AC126648839F25AA728986379661D693B5BCC50E1BE041CEDA',
   'data/calibrations.js':'D2B76FBCB86920ABCD6C5E076DDEA227E6A933F3941183758E6488D4F6767FFE',
   'data/calibration-specs.js':'04F9A3BB19796D438851AD21FF2E45086B038836C1259125C83BDA30E7CF1E9F',
   'data/nbs-v0954-total-series-real-commit.js':'028F1ECF93B5A07CAB2F38E8F381A1178EBE2E941F84C5E29C1C425AF6C904C8',
   'data/pboc-v0952-derived-history.js':'B9288298C3E9CF737E255FE1A80A518994CC5C853E908981763CB8332F5A8179'
  },
  contents:{
   records:clone(window.MinshengDataRecords||[]),
   sourceDocuments:clone(window.MinshengSourceDocuments||[]),
   rawPayloads:clone(window.MinshengRawPayloads||[]),
   research:clone(window.MinshengResearch||[]),
   evidence:clone(window.MinshengEvidence||[]),
   policy:IntentionallyPresent(window.MinshengPolicyStatements),
   institutionalForecasts:IntentionallyPresent(window.MinshengForecasts),
   calibrationSeed:clone(window.MinshengCalibrationSeed||{}),
   calibrationSpecs:clone(window.MinshengCalibrationSpecsV094||[]),
   parameterVersions:[]
  }
 };
 function IntentionallyPresent(value){return clone(value||[]);}
 window.MinshengV010BaselineSnapshot=freeze(snapshot);
 window.MinshengBaselineSnapshots=[snapshot];
})();
