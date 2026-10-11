'use strict';
// Deterministic, conservative checks on response DATA; never execute model text.
// These finite lexical checks are not a general prompt-injection/security proof.
function privacyOrInstructionRisk(raw){
 let text;try{
  const strings=[],pending=[raw],seen=new Set();
  while(pending.length){const item=pending.pop();if(typeof item==='string')strings.push(item);else if(item&&typeof item==='object'){if(seen.has(item))return true;seen.add(item);strings.push(...Object.keys(item));pending.push(...Object.values(item))}}
  // Inspect decoded JSON strings, so line breaks/escapes cannot split API key.
  text=strings.join('\n').normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'');
 }catch{return true}
 return /https?:\/\/|www\.|javascript:|system:|忽略规则|密钥|密码|令牌|凭据|环境(?:变量|文件|配置)|\.env(?:\b|[._-])|(?:私有|原始|私密|机密|内部)[\s\S]{0,16}(?:文件|数据|资料)|\b(?:dotenv|env[\s_-]*files?|environment[\s_-]*(?:variables?|files?)|api[\s_-]*keys?|(?:private|secret)[\s_-]*(?:api[\s_-]*)?keys?|access[\s_-]*tokens?|passwords?|credentials?|bearer[\s_-]*(?:tokens?|credentials?)|authorization[\s_-]*headers?|(?:private|raw|confidential)[\s_-]*(?:files?|data|documents?))\b|\b(?:read|send|email|show|print|dump|reveal|leak|exfiltrate|upload|retrieve|give|output|copy)\b[\s\S]{0,80}\b(?:secrets?|tokens?|keys?|env|environment)\b|(?:读取|发送|输出|泄露|获取|展示|打印)[\s\S]{0,80}\b(?:secrets?|tokens?|keys?|env|environment)\b/i.test(text);
}
function parseResponseData(content){
 let raw;try{raw=JSON.parse(content)}catch{throw Error('RESPONSE_SCHEMA_INVALID')}
 // JSON.parse discards earlier duplicate keys. Reject that ambiguity before
 // classifying the decoded value. Valid JSON makes a string followed by ':' an
 // object key; decode the key to catch equivalent Unicode/escape spellings.
 const stack=[];
 for(const match of content.matchAll(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]]/g)){
  const token=match[0];
  if(token==='{'||token==='[')stack.push(token==='{'?new Set():null);
  else if(token==='}'||token===']')stack.pop();
  else if(/^\s*:/.test(content.slice(match.index+token.length))){
   const keys=stack.at(-1),key=JSON.parse(token);
   if(!keys||keys.has(key))throw Error('UNCLASSIFIED_REJECTION');keys.add(key);
  }
 }
 return raw;
}
const FIELDS=Object.freeze({FACT:['id','type','evidenceId','evidenceClassification','value','unit','period','geography','scope'],GAP:['id','type','evidenceId'],ASSUMPTION:['id','type','text','evidenceIds','dependsOn'],INFERENCE:['id','type','text','evidenceIds','dependsOn','uncertainty','causalStatus']});
const BINDINGS=['evidenceClassification','value','unit','period','geography','scope'];
function responseSafetyReason(raw,approvedEvidence){
 if(privacyOrInstructionRisk(raw))return 'PRIVACY_OR_EXTERNAL_INSTRUCTION';
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.claims)||raw.claims.length>32||!Array.isArray(approvedEvidence))return 'UNCLASSIFIED_REJECTION';
 const evidence=new Map(approvedEvidence.map(e=>[e.id,e]));let ambiguous=false,risk=false;
 // Inspect bindings and references independently of schema order, including
 // recognizable fields nested in a malformed/extra object. Accumulate ambiguity
 // so a later explicit mismatch takes precedence over an earlier shape defect.
 function inspect(value,depth=0){
  if(!value||typeof value!=='object')return;
  if(depth>40){ambiguous=true;return}
  if(Array.isArray(value)){for(const item of value)inspect(item,depth+1);return}
  if(Object.hasOwn(value,'evidenceId')){
   const e=evidence.get(value.evidenceId);
   if(typeof value.evidenceId!=='string')ambiguous=true;
   else if(!e)risk=true;
   else{
    for(const key of BINDINGS)if(Object.hasOwn(value,key)&&value[key]!==e[key==='evidenceClassification'?'classification':key])risk=true;
    if(value.type==='FACT'&&!['REAL','DERIVED'].includes(e.classification)||value.type==='GAP'&&!['GAP','UNKNOWN','BLOCKED'].includes(e.classification))risk=true;
   }
  }
  if(Object.hasOwn(value,'evidenceIds')){
   const ids=Array.isArray(value.evidenceIds)?value.evidenceIds:[value.evidenceIds];
   if(!Array.isArray(value.evidenceIds))ambiguous=true;
   for(const id of ids)if(typeof id!=='string')ambiguous=true;else if(!evidence.has(id))risk=true;
  }
  for(const item of Object.values(value))inspect(item,depth+1);
 }
 inspect(raw);
 const prior=new Map();
 for(const c of raw.claims){
  if(!c||typeof c!=='object'||Array.isArray(c)){ambiguous=true;continue}
  const fields=typeof c.type==='string'&&Object.hasOwn(FIELDS,c.type)?FIELDS[c.type]:null;
  if(!fields||typeof c.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(c.id)||prior.has(c.id))ambiguous=true;
  if(fields&&fields.some(key=>!Object.hasOwn(c,key))||fields&&Object.keys(c).some(key=>!fields.includes(key)))ambiguous=true;
  if(c.type==='FACT'&&(!BINDINGS.every(k=>Object.hasOwn(c,k))||!Object.hasOwn(c,'evidenceId')))ambiguous=true;
  if(c.type==='GAP'&&!Object.hasOwn(c,'evidenceId'))ambiguous=true;
  if(Object.hasOwn(c,'dependsOn')){
   const deps=Array.isArray(c.dependsOn)?c.dependsOn:[c.dependsOn];
   if(!Array.isArray(c.dependsOn))ambiguous=true;
   for(const id of deps)if(typeof id!=='string')ambiguous=true;else if(!prior.has(id))risk=true;
  }
  if(c.type==='INFERENCE'){
   if(Object.hasOwn(c,'uncertainty')&&c.uncertainty!=='HYPOTHESIS_ONLY'||Object.hasOwn(c,'causalStatus')&&c.causalStatus!=='NOT_IDENTIFIED')risk=true;
   if(Array.isArray(c.evidenceIds)&&Array.isArray(c.dependsOn)){
    const inherited=new Set(c.dependsOn.flatMap(id=>prior.get(id)||[]));
    if(c.evidenceIds.some(id=>typeof id==='string'&&!inherited.has(id)))risk=true;
   }
  }
  const ids=Object.hasOwn(c,'evidenceId')?[c.evidenceId]:Array.isArray(c.evidenceIds)?c.evidenceIds:[];
  if(typeof c.id==='string')prior.set(c.id,ids);
 }
 if(Object.keys(raw).some(k=>!['schemaVersion','claims'].includes(k)))ambiguous=true;
 return risk?'EVIDENCE_OR_DEPENDENCY_REJECTED':ambiguous?'UNCLASSIFIED_REJECTION':null;
}
module.exports={privacyOrInstructionRisk,responseSafetyReason,parseResponseData};
