'use strict';
// Direct TLS only. No redirects, proxy env, retries, configurable host or logging.
const https=require('node:https');
const {PRICING}=require('./generation-pricing');
const ENDPOINT='https://api.deepseek.com/chat/completions',SECRET_NAME='DEEPSEEK_API_KEY',PILOT='minsheng-deepseek-first-20-usd1';
const approved=new WeakMap();
function validateHandoff(handoff,now=()=>new Date()){
 const keys=['pilot','networkReady','secretReady','priceVersion','priceCheckedAt'];
 if(!handoff||Object.keys(handoff).sort().join('|')!==keys.sort().join('|')||handoff.pilot!==PILOT||handoff.networkReady!==true||handoff.secretReady!==true||handoff.priceVersion!==PRICING.version||handoff.priceCheckedAt!==now().toISOString().slice(0,10)||handoff.priceCheckedAt!==PRICING.checkedAt)throw Error('LIVE_HANDOFF_NOT_READY');
}
function createLiveTransport({handoff,networkSecret,requestImpl=https.request,now=()=>new Date()}={}){
 validateHandoff(handoff,now);if(typeof requestImpl!=='function')throw Error('LIVE_TRANSPORT_CONFIGURATION_INVALID');
 // Metadata supplies the officially confirmed non-secret sentinel, never the key.
 const keys=['key','domain','placeholder','source'];
 if(!networkSecret||Object.keys(networkSecret).sort().join('|')!==keys.sort().join('|')||networkSecret.key!==SECRET_NAME||networkSecret.domain!=='api.deepseek.com'||networkSecret.source!=='OFFICIAL_NETWORK_SECRET_METADATA'||typeof networkSecret.placeholder!=='string'||!/^[\x21-\x7e]{1,512}$/.test(networkSecret.placeholder))throw Error('NETWORK_SECRET_METADATA_REQUIRED');
 const placeholder=networkSecret.placeholder;
 const receipt=Object.freeze({...handoff});
 const transport=Object.freeze({mode:'LIVE',send(request){
  validateHandoff(receipt,now);
  const fields=['url','method','body','redirect','networkAllowed','credentials','maxResponseBytes','signal'];
  if(!request||Object.keys(request).sort().join('|')!==fields.sort().join('|')||request.url!==ENDPOINT||request.method!=='POST'||request.redirect!=='error'||request.networkAllowed!==true||request.credentials!=='omit'||typeof request.body!=='string'||Buffer.byteLength(request.body,'utf8')>6000||request.maxResponseBytes!==65536||!(request.signal instanceof AbortSignal)||request.signal.aborted)throw Error('LIVE_REQUEST_REJECTED');
  return new Promise((resolve,reject)=>{
   let req,res,timer,done=false,size=0;const chunks=[];
   const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);request.signal.removeEventListener('abort',abort);if(error){res?.destroy();req?.destroy();reject(Error('LIVE_TRANSPORT_FAILED'))}else resolve(value)};
   const abort=()=>finish(true);request.signal.addEventListener('abort',abort,{once:true});
   timer=setTimeout(abort,8000);
   try{
    req=requestImpl({protocol:'https:',hostname:'api.deepseek.com',port:443,path:'/chat/completions',method:'POST',servername:'api.deepseek.com',rejectUnauthorized:true,minVersion:'TLSv1.2',agent:false,headers:{'Content-Type':'application/json',Accept:'application/json','Accept-Encoding':'identity',Authorization:`Bearer ${placeholder}`,'Content-Length':Buffer.byteLength(request.body,'utf8')}},response=>{
     res=response;response.on('error',()=>finish(true));response.on('aborted',()=>finish(true));response.on('close',()=>{if(!done)finish(true)});
     const length=response.headers?.['content-length'];if(response.statusCode!==200||response.headers?.['content-encoding']&&response.headers['content-encoding']!=='identity'||length!==undefined&&(!/^\d+$/.test(String(length))||Number(length)>request.maxResponseBytes)){finish(true);return}
     response.on('data',chunk=>{if(done)return;size+=chunk.length;if(size>request.maxResponseBytes){finish(true);return}chunks.push(Buffer.from(chunk))});
     response.on('end',()=>finish(false,{status:200,body:Buffer.concat(chunks).toString('utf8')}));
    });req.on('error',()=>finish(true));if(request.signal.aborted||done){abort();req.destroy();return}req.end(request.body);
   }catch{finish(true)}
  });
 }});approved.set(transport,{receipt,now});return transport;
}
function isLiveTransport(transport){return approved.has(transport)}
function checkTransportReady(transport){const record=approved.get(transport);if(!record)throw Error('LIVE_TRANSPORT_UNREVIEWED');validateHandoff(record.receipt,record.now)}
module.exports={createLiveTransport,isLiveTransport,checkTransportReady,validateHandoff,SECRET_NAME,PILOT};
