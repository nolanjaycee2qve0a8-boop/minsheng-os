'use strict';
// Operator-run single topic. --check is purely offline; no env/secret reads.
const fs=require('node:fs'),path=require('node:path');
const {PRICING,LIVE_POLICY,liveReserveCost}=require('../server/analysis/generation-pricing');
const {CATALOG}=require('../server/analysis/structured-claims');
const {prepareGeneration,createGenerationAdapter}=require('../server/analysis/generation-adapter');
const {createLiveTransport,PILOT,SECRET_NAME,validateHandoff}=require('../server/analysis/generation-transport');
const {createBudgetLedger}=require('../server/analysis/generation-budget');
const LEDGER_FILE='/workspace/.minsheng-runtime/deepseek-first-pilot/budget.json';
function parseOptions(args){
 if(args.length===1&&args[0]==='--check')return {check:true};
 const flags=new Set(['--live','--handoff-ready']),values=new Set(['--topic','--price-version','--price-checked','--network-secret-placeholder']),result={};
 for(let i=0;i<args.length;i++){const key=args[i];if(Object.hasOwn(result,key)||!flags.has(key)&&!values.has(key))throw Error('PILOT_ARGUMENTS_INVALID');if(flags.has(key))result[key]=true;else{if(!args[i+1]||args[i+1].startsWith('--'))throw Error('PILOT_ARGUMENTS_INVALID');result[key]=args[++i]}}
 if(!result['--live']||!result['--handoff-ready']||[...values].some(k=>!result[k])||!CATALOG.some(x=>x.id===result['--topic']))throw Error('PILOT_HANDOFF_REQUIRED');return result;
}
async function inspect(){
 const inputs=[];for(const topic of CATALOG){const prepared=await prepareGeneration(topic.summary);inputs.push({topic:topic.id,inputEnvelopeBytes:prepared.inputEnvelopeBytes})}
 return {status:'OFFLINE_LAUNCH_CHECK',secretName:SECRET_NAME,networkSecretDomain:'api.deepseek.com',authorizationFormat:'Bearer <official non-secret placeholder>',placeholderSyntaxConfirmed:false,ledgerFile:LEDGER_FILE,policy:LIVE_POLICY,pricing:PRICING,reservedMicroUsd:liveReserveCost(),inputMeasurement:'UTF8_BYTES_PLUS_1024_NOT_ACTUAL_TOKENIZER',inputs,externalRequests:0,secretReads:0};
}
async function runPilot(options,{ledgerFile=LEDGER_FILE,requestImpl,now=()=>new Date()}={}){
 if(options.check)return inspect();
 const topic=CATALOG.find(x=>x.id===options['--topic']);if(!topic||options['--live']!==true||options['--handoff-ready']!==true)throw Error('PILOT_HANDOFF_REQUIRED');
 const handoff={pilot:PILOT,networkReady:true,secretReady:true,priceVersion:options['--price-version'],priceCheckedAt:options['--price-checked']};validateHandoff(handoff,now);
 await prepareGeneration(topic.summary);
 const directory=path.dirname(ledgerFile);if(!fs.existsSync(directory)||!fs.lstatSync(directory).isDirectory()||(fs.statSync(directory).mode&0o077)!==0)throw Error('PILOT_PRIVATE_PERSISTENT_DIRECTORY_REQUIRED');
 const lock=path.join(directory,'pilot-run.lock');let fd;try{fd=fs.openSync(lock,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600)}catch{throw Error('PILOT_ALREADY_RUNNING_OR_STALE_LOCK')}
 try{
  fs.writeFileSync(fd,JSON.stringify({pilot:PILOT,pid:process.pid}));fs.fsyncSync(fd);
  const ledger=createBudgetLedger({file:ledgerFile,policyKind:'LIVE_FIRST_PILOT',now}),transport=createLiveTransport({handoff,networkSecret:{key:SECRET_NAME,domain:'api.deepseek.com',source:'OFFICIAL_NETWORK_SECRET_METADATA',placeholder:options['--network-secret-placeholder']},requestImpl,now});
  return await createGenerationAdapter({ledger,transport,liveEnabled:true}).generate({requestId:`first-pilot-${topic.id}`,summary:topic.summary});
 }finally{fs.closeSync(fd);fs.unlinkSync(lock)}
}
if(require.main===module)Promise.resolve().then(()=>runPilot(parseOptions(process.argv.slice(2)))).then(result=>{process.stdout.write(JSON.stringify(result)+'\n');if(!['HUMAN_REVIEW_REQUIRED','OFFLINE_LAUNCH_CHECK'].includes(result.status))process.exitCode=2}).catch(()=>{process.stderr.write('GENERATION_PILOT_NOT_STARTED_OR_FAILED\n');process.exitCode=2});
module.exports={parseOptions,inspect,runPilot,LEDGER_FILE};
