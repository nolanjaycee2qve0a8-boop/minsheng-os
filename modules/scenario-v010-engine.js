/* v0.10: regime-aware, non-probabilistic scenario propagation. */
window.MinshengScenarioV010=(()=>{
 const clone=value=>JSON.parse(JSON.stringify(value));
 const now=()=>new Date().toISOString();
 const state=()=>typeof data==='undefined'?null:data;
 const byId=(items,id)=>(items||[]).find(item=>item.id===id);
 const audit=(s,action,entityId,after,reason)=>{s.auditLog??=[];s.auditLog.push({id:`audit_v010_${action}_${Date.now()}`,timestamp:now(),action,entityType:'scenario_v2',entityId,after:clone(after),reason});};
 const mergeSeed=(target,seed)=>{target??=[];(seed||[]).forEach(item=>{if(!target.some(existing=>existing.id===item.id))target.push(clone(item));});return target;};
 function ensure(s=state()){
  if(!s)return null;
  s.regimes=mergeSeed(s.regimes,window.MinshengRegimes);
  (window.MinshengRegimes||[]).forEach(seed=>{const existing=byId(s.regimes,seed.id);if(existing&&existing!==seed){const active=existing.active===true;Object.assign(existing,clone(seed));existing.active=active;}});
  s.scenarioParameters=mergeSeed(s.scenarioParameters,window.MinshengScenarioParameters);
  s.parameterVersions=mergeSeed(s.parameterVersions,window.MinshengParameterVersions);
  s.scenariosV2=mergeSeed(s.scenariosV2,window.MinshengScenariosV2);
  s.scenarioRunsV2??=[];s.baselineSnapshots=mergeSeed(s.baselineSnapshots,window.MinshengBaselineSnapshots);
  (s.scenarios||[]).forEach(item=>{item.legacyScenario??=true;});
  return s;
 }
 function resolveRegime(s,selection={mode:'UNKNOWN'}){
  const mode=selection.mode||'UNKNOWN';
  if(mode==='MANUAL')return byId(s.regimes,selection.regimeId)||null;
  if(mode==='AUTO_RESEARCH')return (s.regimes||[]).find(item=>item.active===true)||null;
  return null;
 }
 function staleReasons(s,version){
  if(version.parameterStatus==='STALE'||version.stale)return ['PARAMETER_ALREADY_STALE'];
  const revisions=new Map((version.sourceRecordRevisionIds||[]).map(item=>{const [id,revision]=String(item).split(':r');return [id,Number(revision)];}));
  const records=new Map((s.records||[]).map(record=>[record.id,record]));
  return [...revisions].flatMap(([id,revision])=>{const record=records.get(id);if(!record||record.deleted)return [`SOURCE_RECORD_MISSING_OR_DELETED:${id}`];return (record.revision||0)>revision?[`SOURCE_RECORD_REVISED:${id}`]:[];});
 }
 function opposite(direction){return direction==='positive'?'negative':direction==='negative'?'positive':'unknown';}
 function propagatedDirection(shockDirection,relationshipDirection){if(!shockDirection||shockDirection==='neutral'||!relationshipDirection)return 'unknown';return shockDirection===relationshipDirection?'positive':'negative';}
 function validate(input,s=ensure()){
  const scenario=typeof input.scenario==='string'?byId(s.scenariosV2,input.scenario):input.scenario;
  if(!scenario)return {status:'BLOCKED',reasons:['SCENARIO_REQUIRED'],warnings:[],parameterVersions:[]};
  const ids=input.parameterVersionIds||scenario.parameterVersionIds||[],versions=ids.map(id=>byId(s.parameterVersions,id)).filter(Boolean);
  if(ids.length!==versions.length)return {status:'BLOCKED',reasons:['PARAMETER_VERSION_MISSING'],warnings:[],parameterVersions:versions};
  const selection=input.regimeSelection||scenario.regimeSelection||{mode:'UNKNOWN'},regime=resolveRegime(s,selection),reasons=[],warnings=[],directions=[];
  versions.forEach(version=>{
   const stale=staleReasons(s,version);if(stale.length){reasons.push('STALE_PARAMETER');warnings.push(...stale);return;}
   if(version.parameterStatus==='DATA_INSUFFICIENT'){reasons.push('DATA_INSUFFICIENT_PARAMETER');return;}
   if(version.parameterStatus==='UNSTABLE'){
    if(!regime){reasons.push('REGIME_REQUIRED');warnings.push('UNSTABLE_RELATIONSHIP_WARNING');return;}
    const regimeParameter=(version.regimeParameters||[]).find(item=>item.regimeId===regime.id);
    if(!regimeParameter){reasons.push('REGIME_NOT_APPLICABLE');return;}
    warnings.push('UNSTABLE_RELATIONSHIP_WARNING','REGIME_SPECIFIC_PARAMETER');directions.push(regimeParameter.direction);return;
   }
   if(version.parameterStatus==='RESEARCH_ESTIMATE'){
    if(version.mappingStatus!=='ACCEPTED'){reasons.push('PARAMETER_MAPPING_REVIEW_REQUIRED');return;}
    if(!version.active){reasons.push('PARAMETER_NOT_ACTIVE');return;}
    warnings.push('RESEARCH_ESTIMATE','CORRELATION_NOT_CAUSATION',...(version.warnings||[]));directions.push(version.direction);return;
   }
   if(version.parameterStatus==='DEMO'){warnings.push('DEMO_PARAMETER');directions.push(version.direction);return;}
   if(version.parameterStatus==='EXPERT_OVERRIDE'){warnings.push('EXPERT_OVERRIDE');directions.push(version.direction);return;}
   reasons.push(`UNSUPPORTED_PARAMETER_STATUS:${version.parameterStatus}`);
  });
  const stateAdvice=window.MinshengRegimeDetectionV011?.scenarioGate?.(s,scenario)||null;if(stateAdvice){reasons.push(...(stateAdvice.reasons||[]));warnings.push(...(stateAdvice.warnings||[]));}const statuses=[...new Set(versions.map(item=>item.parameterStatus))];if(statuses.length>1)warnings.push('MIXED_PARAMETER_QUALITY');
  const primaryDirection=directions.find(Boolean)||null;
  const status=reasons.length?'BLOCKED':warnings.length?'READY_WITH_WARNINGS':'READY';
  return {status,reasons:[...new Set(reasons)],warnings:[...new Set(warnings)],scenario,parameterVersions:versions,parameterVersionIds:versions.map(item=>item.id),regime,regimeSelection:selection,stateAdvice,propagation:{depth:'Direct',sourceDirection:scenario.shock?.direction||'neutral',relationshipDirection:primaryDirection,targetDirection:propagatedDirection(scenario.shock?.direction,primaryDirection),numericEstimate:null},weakestParameterStatus:statuses.includes('UNSTABLE')?'UNSTABLE':statuses.includes('DEMO')?'DEMO':statuses.includes('RESEARCH_ESTIMATE')?'RESEARCH_ESTIMATE':statuses[0]||'NONE'};
 }
 function acceptMapping(versionId,s=ensure()){
  const version=byId(s.parameterVersions,versionId);if(!version||version.parameterStatus!=='RESEARCH_ESTIMATE')return {ok:false,reason:'RESEARCH_ESTIMATE_REQUIRED'};
  version.mappingStatus='ACCEPTED';version.mappingAcceptedAt=now();audit(s,'ACCEPT_PARAMETER_MAPPING',versionId,{mappingStatus:version.mappingStatus},'Manual parameter-mapping acceptance; no numerical elasticity was added.');return {ok:true,version};
 }
 function setActive(versionId,active,s=ensure()){
  const version=byId(s.parameterVersions,versionId);if(!version)return {ok:false,reason:'PARAMETER_VERSION_MISSING'};
  if(active&&(version.mappingStatus!=='ACCEPTED'||version.parameterStatus==='UNSTABLE'))return {ok:false,reason:'ACTIVATION_NOT_ALLOWED'};
  const stale=staleReasons(s,version);if(active&&stale.length)return {ok:false,reason:'STALE_PARAMETER',details:stale};
  version.active=Boolean(active);const parameter=byId(s.scenarioParameters,version.parameterId);if(parameter)parameter.active=version.active;audit(s,active?'ACTIVATE_PARAMETER':'DEACTIVATE_PARAMETER',versionId,{active:version.active},'Manual parameter lifecycle action.');return {ok:true,version};
 }
 function refreshStaleness(s=ensure()){
  const stale=[];(s.parameterVersions||[]).forEach(version=>{const reasons=staleReasons(s,version);if(reasons.length&&!version.stale){version.stale=true;version.parameterStatus='STALE';version.active=false;stale.push({id:version.id,reasons});audit(s,'MARK_PARAMETER_STALE',version.id,{reasons},'Underlying provenance revision or deletion detected.');}});return stale;
 }
 function run(input,s=ensure()){
  const result=validate(input,s),entry={id:`scenario_v2_run_${Date.now()}`,scenarioId:result.scenario?.id||input.scenario||null,status:result.status,runDate:now(),parameterVersionIds:result.parameterVersionIds||[],regimeId:result.regime?.id||null,regimeSelection:result.regimeSelection||{mode:'UNKNOWN'},warnings:result.warnings||[],blockedLinks:result.reasons||[],weakestParameterStatus:result.weakestParameterStatus||null,propagation:result.propagation||null,provenance:{parameterVersionIds:result.parameterVersionIds||[],sourceCalibrationIds:(result.parameterVersions||[]).map(item=>item.sourceCalibrationId).filter(Boolean),sourceRecordRevisionIds:(result.parameterVersions||[]).flatMap(item=>item.sourceRecordRevisionIds||[]),regimeId:result.regime?.id||null},legacyScenario:false};
  s.scenarioRunsV2.push(entry);audit(s,result.status==='BLOCKED'?'BLOCK_SCENARIO':'RUN_SCENARIO_V2',entry.id,entry,result.status==='BLOCKED'?'Scenario validation blocked propagation.':'Conditional scenario run saved without historical re-estimation.');return {...result,run:entry};
 }
 function restoreV09Baseline(s=ensure()){
  const snapshot=window.MinshengV010BaselineSnapshot;if(!snapshot)return {ok:false,reason:'BASELINE_MISSING'};['records','sourceDocuments','rawPayloads','research','evidence'].forEach(key=>{if(snapshot.contents[key])s[key]=clone(snapshot.contents[key]);});s.scenarios=clone(window.MinshengScenarios||[]);s.scenariosV2=[];s.scenarioParameters=[];s.parameterVersions=[];s.scenarioRunsV2=[];ensure(s);audit(s,'RESTORE_V09_BASELINE',snapshot.id,{baselineId:snapshot.id},'Explicit restoration of the immutable v0.9 calibration baseline.');return {ok:true,baselineId:snapshot.id};
 }
 function persist(){const s=ensure();if(typeof saveLocalResearch==='function')saveLocalResearch();else window.MinshengPersistence?.save({...s});}
 function quality(version){return Object.entries(version.quality||{}).map(([key,value])=>`${key}: ${value}`).join(' · ');}
 function renderParameters(){const s=ensure(),root=document.getElementById('parameters');if(!root)return;root.innerHTML=`<div class="view-intro"><p class="eyebrow">v0.10 Parameter Workspace</p><h1>Scenario Parameters</h1><p>Historical calibration is mapped through reviewable versions. Correlation is not a causal coefficient.</p></div><section class="panel"><p class="attachment-note">Baseline: minsheng-os-v0.9-calibration-baseline · local immutable marker</p>${s.parameterVersions.map(version=>`<article class="method-event"><b>${version.relationshipId} · v${version.version}</b><p>${version.parameterStatus} · ${version.mappingStatus} · ${version.active?'ACTIVE':'INACTIVE'}</p><small>Lag ${version.lag?.min}–${version.lag?.max} · ${version.strengthClass} · ${quality(version)}</small><p>${(version.warnings||[]).join(' · ')||'No warnings'}</p><div class="modal-actions">${version.mappingStatus==='REVIEW_REQUIRED'?`<button class="secondary" data-accept-param="${version.id}">Accept mapping</button>`:''}${version.mappingStatus==='ACCEPTED'&&!version.active?`<button class="primary" data-activate-param="${version.id}">Activate</button>`:''}${version.active?`<button class="secondary" data-deactivate-param="${version.id}">Deactivate</button>`:''}</div></article>`).join('')}</section><section class="panel"><h2>Historical Regimes</h2>${s.regimes.map(regime=>`<p><b>${regime.name}</b> · ${regime.status} · ${regime.active?'ACTIVE_RESEARCH_REGIME':'not active'} · ${regime.description}</p>`).join('')}<button class="secondary" id="v010StaleCheck">Recheck provenance staleness</button><button class="secondary" id="v010RestoreBaseline">Restore v0.9 baseline</button></section>`;
  root.querySelectorAll('[data-accept-param]').forEach(button=>button.onclick=()=>{acceptMapping(button.dataset.acceptParam);persist();renderParameters();});root.querySelectorAll('[data-activate-param]').forEach(button=>button.onclick=()=>{const result=setActive(button.dataset.activateParam,true);if(!result.ok)alert(result.reason);persist();renderParameters();});root.querySelectorAll('[data-deactivate-param]').forEach(button=>button.onclick=()=>{setActive(button.dataset.deactivateParam,false);persist();renderParameters();});document.getElementById('v010StaleCheck').onclick=()=>{refreshStaleness();persist();renderParameters();};document.getElementById('v010RestoreBaseline').onclick=()=>{if(confirm('Restore the v0.9 calibration baseline and discard v0.10 scenario state?')){restoreV09Baseline();persist();renderParameters();renderScenario();}};
 }
 function renderScenarioV10(){const s=ensure(),section=document.getElementById('scenarios');if(!section)return;appState.scenarioV2Id??='scenario_v010_baseline';appState.scenarioRegimeSelection??={mode:'UNKNOWN'};const current=byId(s.scenariosV2,appState.scenarioV2Id)||s.scenariosV2[0],selection=appState.scenarioRegimeSelection,result=validate({scenario:current,regimeSelection:selection},s);section.innerHTML=`<div class="view-intro"><p class="eyebrow">v0.10 Regime-Aware Scenario Engine</p><h1>Scenario Calibration</h1><p>Conditional propagation only. No OLS coefficient is treated as a scenario elasticity.</p></div><div class="scenario-grid"><section class="panel scenario-selector"><p class="eyebrow">Scenario</p>${s.scenariosV2.map(item=>`<button class="scenario ${item.id===current.id?'active':''}" data-v010-scenario="${item.id}"><span>${item.code}</span><b>${item.name}</b><small>${item.description}</small></button>`).join('')}</section><section class="panel scenario-result"><p class="eyebrow">${current.code} · ${result.status}</p><h2>${current.name}</h2><label>Current Regime<select id="v010RegimeMode"><option value="UNKNOWN">UNKNOWN</option><option value="AUTO_RESEARCH">AUTO_RESEARCH</option><option value="MANUAL">MANUAL historical analogue</option></select></label><label id="v010ManualRegimeWrap">Historical analogue<select id="v010ManualRegime"><option value="">Select</option>${s.regimes.map(regime=>`<option value="${regime.id}">${regime.name}-like</option>`).join('')}</select></label><div class="impact-grid"><div><b>Scenario status</b><p>${result.status}</p></div><div><b>Propagation</b><p>${result.status==='BLOCKED'?'PROPAGATION_STOPPED':`Retail / target direction: ${result.propagation.targetDirection}`}</p></div><div><b>Weakest parameter</b><p>${result.weakestParameterStatus}</p></div><div><b>Warnings / blocks</b><p>${[...result.warnings,...result.reasons].join(' · ')||'None'}</p></div></div><p class="attachment-note">Parameter versions: ${(result.parameterVersionIds||[]).join(', ')||'none'} · no probability distribution or numeric effect range.</p><button class="primary" id="v010RunScenario">Validate and save run</button></section></div>`;
  const mode=document.getElementById('v010RegimeMode'),manual=document.getElementById('v010ManualRegime');mode.value=selection.mode||'UNKNOWN';manual.value=selection.regimeId||'';const redraw=()=>{appState.scenarioRegimeSelection={mode:mode.value,regimeId:manual.value||null};renderScenarioV10();};mode.onchange=redraw;manual.onchange=redraw;section.querySelectorAll('[data-v010-scenario]').forEach(button=>button.onclick=()=>{appState.scenarioV2Id=button.dataset.v010Scenario;appState.scenarioRegimeSelection={mode:'UNKNOWN'};renderScenarioV10();});document.getElementById('v010RunScenario').onclick=()=>{const runResult=run({scenario:current,regimeSelection:appState.scenarioRegimeSelection});persist();alert(`${runResult.status}: ${(runResult.warnings||[]).concat(runResult.reasons||[]).join(', ')||'saved'}`);renderScenarioV10();};
 }
 function installUi(){if(typeof document==='undefined'||typeof appState==='undefined')return;ensure();const nav=document.querySelector('.nav-item[data-view="scenarios"]');if(nav&&!document.querySelector('.nav-item[data-view="parameters"]'))nav.insertAdjacentHTML('afterend','<button class="nav-item" data-view="parameters"><i>≋</i>Parameters</button>');if(!document.getElementById('parameters'))document.getElementById('scenarios')?.insertAdjacentHTML('beforebegin','<section id="parameters" class="view"></section>');if(typeof titleMap!=='undefined')titleMap.parameters=['Scenario Parameters','Regime-aware parameter versions'];document.querySelector('.nav-item[data-view="parameters"]')?.addEventListener('click',()=>{showView('parameters');renderParameters();});window.renderScenario=renderScenarioV10;renderScenarioV10();}
 ensure();installUi();
 return {ensure,resolveRegime,staleReasons,validate,run,acceptMapping,setActive,refreshStaleness,restoreV09Baseline,renderParameters,renderScenario:renderScenarioV10};
})();
