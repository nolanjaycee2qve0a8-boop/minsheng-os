'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createSession}=require('../modules/evidence-analysis-session');
const {createOfflineEvidenceAnalysis,QUESTIONS}=require('../server/analysis/offline-evidence-analysis');
const sessions=require('../modules/evidence-analysis-session');
let count=0,syntheticFetches=0;
function eq(actual,expected,message){count++;assert.deepEqual(actual,expected,message)}
function ok(value,message){count++;assert.ok(value,message)}
function browserFixture(responses){
 const controls=new Map();
 const root={innerHTML:'',querySelector(selector){
  if(!controls.has(selector))controls.set(selector,{value:'',dataset:{},textContent:'',focus(){}});
  return controls.get(selector);
 },querySelectorAll(){return []}};
 const context={window:{MinshengEvidenceAnalysisSession:sessions},
  document:{getElementById:()=>root},location:{hash:'#qa/analysis-offline'},
  setTimeout(){},addEventListener(){},history:{pushState(){},replaceState(){}},
  fetch:async(url,options)=>{
   if(url==='/api/analysis/offline')return {ok:true,status:200,
    json:async()=>createOfflineEvidenceAnalysis().analyze(JSON.parse(options.body))};
   syntheticFetches++;
   eq(url,'/api/analysis/live','fixture cannot reach a real provider or other endpoint');
   if(!responses.length)throw Error('SYNTHETIC_TRANSPORT_FAILURE');
   const value=responses.shift();
   if(value instanceof Error)throw value;
   return {ok:true,status:200,json:async()=>value};
  }};
 const source=fs.readFileSync(path.join(__dirname,'../modules/evidence-analysis-workspace.js'),'utf8');
 vm.runInNewContext(source,context,{filename:'evidence-analysis-workspace.js'});
 return {root,controls,workspace:context.window.MinshengEvidenceAnalysisWorkspace};
}
function currentHtml(html){return html.split('<section aria-label="当前分析">')[1].split('<details data-analysis-history>')[0]}
function historyHtml(html){return html.split('<details data-analysis-history>')[1]}
async function main(){
 const service=createOfflineEvidenceAnalysis();
 const offline=await service.analyze({question:QUESTIONS[0]});
 const liveQuestion='2026年上半年全国居民人均可支配收入是多少？';
 // This is an in-memory, redacted transport fixture, not a DeepSeek response or a new call.
 const real={...offline,question:liveQuestion,status:'REAL_API_VALIDATED',
  inputContract:{...offline.inputContract,question:liveQuestion},
  transport:'REAL_API',providerUsed:true,externalRequests:1,simulation:null,
  model:'deepseek-flash',validationStatus:'EXISTING_CHAIN_PASSED',
  evidenceVersion:'TEST_ONLY_SYNTHETIC',usage:{inputTokens:12,outputTokens:8}};
 const failed={question:liveQuestion,status:'AUTHENTICATION_FAILED',facts:[],inferences:[],
  gaps:[],sources:[],providerUsed:true,externalRequests:1,simulation:null,
  notice:'脱敏样例：认证失败；未获得可核验答案。'};
 const malformed={...real,facts:[{...real.facts[0],value:'REDACTED_MISMATCH'}]};
 const simulatedGate={...real,status:'SIMULATED_GATE_VALIDATED',transport:'SIMULATED_HTTP_ONLY',
  providerUsed:false,externalRequests:0,simulation:'SIMULATED_HTTP_ONLY'};
 const queue=[real,failed,malformed,simulatedGate,new Error('SYNTHETIC_TRANSPORT_FAILURE')];
 const page=browserFixture(queue);
 await page.workspace.session.send(QUESTIONS[0]);page.workspace.render();
 ok(page.root.innerHTML.includes('固定离线模拟，非 DeepSeek 实测'),'offline result is marked simulated');
 ok(page.root.innerHTML.includes('推断（模拟，待人工审核）'),'offline inference stays simulated');
 page.controls.get('[data-analysis-mode]').onclick();
 ok(page.root.innerHTML.includes('尚无分析。'),'mode switch clears the former current answer');
 await page.workspace.liveSession.send(liveQuestion);page.workspace.render();
 ok(currentHtml(page.root.innerHTML).includes('真实 DeepSeek API · 已通过证据校验'),
  'validated live-shaped fixture gets validated label from result');
 ok(currentHtml(page.root.innerHTML).includes('推断（真实 API，待人工审核）'),
  'live inference keeps human-review boundary');
 ok(currentHtml(page.root.innerHTML).includes('本地原网页未重新核验'),
  'live result does not promote local source review');
 ok(!currentHtml(page.root.innerHTML).includes('仅为固定模拟'),
  'live result does not inherit the offline simulation sentence');
 await page.workspace.liveSession.send(liveQuestion);page.workspace.render();
 ok(currentHtml(page.root.innerHTML).includes('真实请求失败或未获授权'),
  'failed live request has a failure label');
 ok(!currentHtml(page.root.innerHTML).includes('22981'),
  'failed current answer does not retain prior success fact');
 ok(historyHtml(page.root.innerHTML).includes('真实 DeepSeek API · 已通过证据校验'),
  'historical answer retains its own validated-result label');
 await page.workspace.liveSession.send(liveQuestion);page.workspace.render();
 eq(page.workspace.liveSession.current.status,'LIVE_RESPONSE_REJECTED',
  'invalid live-shaped response is rejected before display');
 ok(currentHtml(page.root.innerHTML).includes('真实模式响应校验失败'),
  'validation failure is distinct from request failure');
 ok(!currentHtml(page.root.innerHTML).includes('22981'),
  'validation failure cannot inherit prior result');
 await page.workspace.liveSession.send(liveQuestion);page.workspace.render();
 ok(currentHtml(page.root.innerHTML).includes('模拟传输，非真实 API'),
  'simulated gate is not labelled real even on the live route');
 ok(!currentHtml(page.root.innerHTML).includes('真实 DeepSeek API · 已通过证据校验'),
  'route alone cannot turn a simulated result into a real one');
 ok(historyHtml(page.root.innerHTML).includes('真实模式响应校验失败'),
  'historical validation failure keeps its own mode and status');
 await page.workspace.liveSession.send(liveQuestion);page.workspace.render();
 eq(page.workspace.liveSession.current.status,'LIVE_SERVICE_UNAVAILABLE',
  'transport exception is a distinct live failure');
 ok(currentHtml(page.root.innerHTML).includes('真实服务未返回可核验结果'),
  'live transport failure does not claim simulated service failure');
 ok(currentHtml(page.root.innerHTML).includes('外部调用：未知'),
  'unknown send outcome is not incorrectly logged as zero calls');
 page.controls.get('[data-analysis-mode]').onclick();
 ok(page.root.innerHTML.includes('尚无分析。'),'switching back clears live result and history');
 const reload=browserFixture([]);reload.workspace.render();
 ok(reload.root.innerHTML.includes('尚无分析。'),'fresh page starts with no answer');
 ok(!reload.root.innerHTML.includes('TEST_ONLY_SYNTHETIC'),'refresh has no prior fixture state');
 const offlineFailure=createSession({respond:async()=>{throw Error('SYNTHETIC_OFFLINE_FAILURE')}});
 eq((await offlineFailure.send(QUESTIONS[0])).status,'SERVICE_UNAVAILABLE',
  'offline transport failure remains separate from live failure');
 eq(syntheticFetches,5,'only five in-memory fixture responses were used');
 console.log('v040 analysis mode copy: PASS ('+count+' assertions; synthetic only; real API calls 0)');
}
main().catch(error=>{console.error(error);process.exitCode=1});
