'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {localEvidence,renderLocalIncomeEvidence}=require('../server/analysis/local-income-evidence');
const {CONTEXT,SOURCE_BINDINGS,requestDraft}=require('../server/analysis/income-explanation-preflight');
const {createIncomeGate,QUESTION}=require('../server/analysis/income-explanation-live');
const {createApprovedServer}=require('../server/analysis/deepseek-live-service');
const {createServer}=require('../server/analysis/offline-demo-server');
const {INCOME_PAGE}=require('../server/analysis/income-explanation-page');
const panel=require('../modules/income-explanation-panel');
const {loadManifest,validateManifest,buildExecutionPlan}=require('../tools/run_public_ci');
let count=0,sends=0,keys=0;
const eq=(a,b)=>{count++;assert.deepEqual(a,b);},ok=x=>{count++;assert.ok(x);},clone=x=>JSON.parse(JSON.stringify(x));
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{sends++;throw Error('NETWORK_FORBIDDEN');};
function get(port,url,method='GET') {return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path:url,method},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString(),headers:res.headers}));});r.on('error',reject);r.end();});}
async function main(){
 const v=localEvidence();eq(v.mode,'LOCAL_EVIDENCE_CALCULATION');eq(v.modelAnalysisPerformed,false);eq(v.providerUsed,false);eq(v.externalRequests,0);
 eq(v.sources.map(x=>x.value),[21840,22981]);eq(v.sources.map(x=>x.period),['2025-H1','2026-H1']);eq(v.sources.map(x=>x.unit),['元/人','元/人']);
 eq(v.sources.map(x=>x.verification.sha256),SOURCE_BINDINGS.map(x=>x.sha256));eq(v.calculation.difference,1141);eq(v.calculation.nominalPercent,'5.22436');eq(v.calculation.sourceClaim,false);
 eq(v.officialRealGrowth,{value:4.2,unit:'%',evidenceId:'nbs_income_pc_2026_h1',computed:false});
 eq(v.artifact.sha256,'5d8dda761e0041bc0a4e07df1bd29a3011206ae17a45875a280a7741319cb747');
 eq(v.calculation.inputIds,v.sources.map(x=>x.evidenceId));
 for(const html of [renderLocalIncomeEvidence(),INCOME_PAGE]){
  for(const text of ['本地证据核验／程序计算，未进行本轮模型分析','21840','22981','1141','5.22436%','实际增幅 4.2%','交接快照本地核验','本机未重新下载','中国全国','1—6月累计','名义现价','未由两个现价金额复算实际增幅'])ok(html.includes(text));
  for(const s of v.sources){ok(html.includes(s.url));ok(html.includes(s.published));ok(html.includes(s.verification.acquired));ok(html.includes(s.verification.sha256));}
 }
 ok(INCOME_PAGE.includes('disabled data-reconciliation-hold="true"'));ok(INCOME_PAGE.includes('账本待对账，真实发送暂停'));
 // Drift must suppress the entire local result rather than carrying an old success forward.
 for(const mutate of [x=>x.evidence[0].value=0,x=>x.evidence[0].unit='万元',x=>x.evidence[1].period='2026-Q2',x=>x.evidence[1].region='其他地区',x=>x.evidence[1].url='https://example.invalid',x=>x.evidence[0].title='<script>bad</script>',x=>x.evidence[1].officialRealPercent=5.22436,x=>x.calculation.nominalPercent='4.2',x=>x.calculation.difference=1140,x=>x.nature='TEST_SYNTHETIC',x=>x.commonBasis='其他统计口径，不再可比']){
  const changed=clone(CONTEXT);mutate(changed);count++;assert.throws(()=>localEvidence(changed));
  const failed=renderLocalIncomeEvidence(changed);ok(failed.includes('LOCAL_EVIDENCE_UNAVAILABLE'));eq(failed.includes('1141'),false);eq(failed.includes('21840'),false);
 }
 const wrongBinding=clone(SOURCE_BINDINGS);wrongBinding[0].sha256='0'.repeat(64);count++;assert.throws(()=>localEvidence(CONTEXT,wrongBinding));
 eq(renderLocalIncomeEvidence(CONTEXT,wrongBinding).includes('21840'),false);
 // Fresh real gate must stop before ledger, credentials, reservation and network.
 const ledger=new Proxy({},{get(){throw Error('LEDGER_ACCESS_FORBIDDEN');}}),credentialProvider=()=>{keys++;throw Error('KEY_READ_FORBIDDEN');};
 const result=await createIncomeGate({ledger,credentialProvider,mode:'REAL',enabled:true}).analyze({question:QUESTION});
 eq(result.status,'RECONCILIATION_REQUIRED');eq(result.externalRequests,0);eq(result.facts,[]);eq(result.calculation,null);eq(result.reservation,null);
 count++;assert.throws(()=>createApprovedServer({ledger,credentialProvider}),e=>e.message==='RECONCILIATION_REQUIRED');
 const session=panel.createSession(async()=>result);await session.send();await session.send();eq(session.history.length,1);eq(session.current.facts,[]);ok(panel.label(session.current).includes('暂停'));
 eq(panel.valid({...result,...v}),false);eq(panel.createSession(async()=>result).current,null);
 const button={disabled:false,getAttribute:()=> 'true'};panel.install({getElementById:()=>button});eq(button.disabled,true);eq(button.onclick,undefined);
 // Actual local GET/refresh/POST rejection. Uses no provider and no real ledger.
 const port=19451,server=createServer(undefined,null,port,undefined,INCOME_PAGE);
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const first=await get(port,'/income-explanation'),refresh=await get(port,'/income-explanation');
  eq(first.status,200);eq(refresh.body,first.body);ok(first.body.includes('LOCAL_EVIDENCE_CALCULATION'));eq(first.headers['cache-control'],'no-store');
  eq((await get(port,'/api/analysis/live','POST')).status,403);eq((await get(port,'/api/analysis/offline/health')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
 eq(requestDraft().bodyBytes,3730);eq(requestDraft().bodySha256,'c68d427982b1ce35ebd7b83a54db08c89ac99936c7e59afc1632456b9c22ba59');
 const manifest=loadManifest();validateManifest(manifest);ok(buildExecutionPlan(manifest).some(x=>x.args?.[0]==='tests/v045-local-income-evidence-tests.js'));
 eq(sends,0);eq(keys,0);console.log('v045 local income evidence PASS ('+count+' assertions; real API sends 0; credential reads 0)');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{globalThis.fetch=originalFetch;});
