'use strict';
// Operator-run single topic. --check is purely offline; no env/secret reads.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PRICING,LIVE_POLICY,liveReserveCost}=require('../server/analysis/generation-pricing');
const {CATALOG}=require('../server/analysis/structured-claims');
const {prepareGeneration,createGenerationAdapter}=require('../server/analysis/generation-adapter');
const {createLiveTransport,PILOT,SECRET_NAME,validateHandoff}=require('../server/analysis/generation-transport');
const {createBudgetLedger}=require('../server/analysis/generation-budget');
const LEDGER_FILE='/workspace/.minsheng-runtime/deepseek-first-pilot/budget.json';
function parseOptions(args){
 if(args.length===1&&args[0]==='--check')return {check:true};
 const flags=new Set(['--live','--handoff-ready','--bootstrap','--bootstrap-authorized','--resume']),values=new Set(['--topic','--pilot','--price-version','--price-checked']),result={};
 for(let i=0;i<args.length;i++){const key=args[i];if(Object.hasOwn(result,key)||!flags.has(key)&&!values.has(key))throw Error('PILOT_ARGUMENTS_INVALID');if(flags.has(key))result[key]=true;else{if(!args[i+1]||args[i+1].startsWith('--'))throw Error('PILOT_ARGUMENTS_INVALID');result[key]=args[++i]}}
 if(result['--pilot']!==PILOT||!result['--price-version']||!result['--price-checked'])throw Error('PILOT_HANDOFF_REQUIRED');
 if(result['--bootstrap']){if(!result['--bootstrap-authorized']||result['--live']||result['--resume']||result['--topic']||result['--handoff-ready'])throw Error('PILOT_BOOTSTRAP_AUTHORIZATION_REQUIRED')}
 else if(!result['--live']||!result['--resume']||!result['--handoff-ready']||result['--bootstrap-authorized']||!CATALOG.some(x=>x.id===result['--topic']))throw Error('PILOT_HANDOFF_REQUIRED');return result;
}
async function inspect(){
 const inputs=[];for(const topic of CATALOG){const prepared=await prepareGeneration(topic.summary,{live:true});inputs.push({topic:topic.id,inputEnvelopeBytes:prepared.inputEnvelopeBytes})}
 return {status:'OFFLINE_LAUNCH_CHECK',pilot:PILOT,secretName:SECRET_NAME,networkSecretDomain:'api.deepseek.com',authorizationFormat:'Bearer <platform-injected env placeholder unchanged>',proxyRequired:true,bootstrap:'ONE_EXPLICIT_AUTHORIZATION_IN_FIRST_EXECUTOR',resume:'EXISTING_LEDGER_AND_SAME_EXECUTOR_REQUIRED',ledgerFile:LEDGER_FILE,policy:LIVE_POLICY,pricing:PRICING,reservedMicroUsd:liveReserveCost(),inputMeasurement:'UTF8_BYTES_PLUS_1024_NOT_ACTUAL_TOKENIZER',inputs,externalRequests:0,secretReads:0};
}
const executorIdentity=()=>crypto.createHash('sha256').update(fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8')).digest('hex');
async function runPilot(options,{ledgerFile=LEDGER_FILE,requestImpl,env,agentFactory,executorId,now=()=>new Date()}={}){
 if(options.check)return inspect();
 // Revalidate structured callers too; no separate API path can default to bootstrap.
 options=parseOptions(Object.entries(options).flatMap(([k,v])=>v===true?[k]:[k,v]));
 const topic=CATALOG.find(x=>x.id===options['--topic']);
 const handoff={pilot:PILOT,networkReady:true,secretReady:true,priceVersion:options['--price-version'],priceCheckedAt:options['--price-checked']};validateHandoff(handoff,now);
 if(topic)await prepareGeneration(topic.summary,{live:true});
 const directory=path.dirname(ledgerFile);if(!fs.existsSync(directory)||!fs.lstatSync(directory).isDirectory()||(fs.statSync(directory).mode&0o077)!==0)throw Error('PILOT_PRIVATE_PERSISTENT_DIRECTORY_REQUIRED');
 const lock=path.join(directory,'pilot-run.lock');let fd;try{fd=fs.openSync(lock,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600)}catch{throw Error('PILOT_ALREADY_RUNNING_OR_STALE_LOCK')}
 let transport;try{
  fs.writeFileSync(fd,JSON.stringify({pilot:PILOT,pid:process.pid}));fs.fsyncSync(fd);
  const ledger=createBudgetLedger({file:ledgerFile,policyKind:'LIVE_FIRST_PILOT',now,executorId:executorId??executorIdentity(),bootstrap:options['--bootstrap']===true});
  if(options['--bootstrap'])return {status:'PILOT_BOOTSTRAPPED',pilot:PILOT,externalRequests:0,secretReads:0};
  transport=createLiveTransport({handoff,env,requestImpl,agentFactory,now});
  return await createGenerationAdapter({ledger,transport,liveEnabled:true}).generate({requestId:`first-pilot-${topic.id}`,summary:topic.summary});
 }finally{transport?.close();fs.closeSync(fd);fs.unlinkSync(lock)}
}
if(require.main===module)Promise.resolve().then(()=>runPilot(parseOptions(process.argv.slice(2)))).then(result=>{process.stdout.write(JSON.stringify(result)+'\n');if(!['HUMAN_REVIEW_REQUIRED','OFFLINE_LAUNCH_CHECK','PILOT_BOOTSTRAPPED'].includes(result.status))process.exitCode=2}).catch(()=>{process.stderr.write('GENERATION_PILOT_NOT_STARTED_OR_FAILED\n');process.exitCode=2});
module.exports={parseOptions,inspect,runPilot,LEDGER_FILE};
