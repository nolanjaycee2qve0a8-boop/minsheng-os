window.MinshengImportExport = (() => {
  const evidenceTypes=['FACT','ESTIMATE','INFERENCE','HYPOTHESIS','FORECAST','SCENARIO','OPINION'];
  const validateEvidence = item => {if(!item?.id||!item.title||!item.sourceId||!evidenceTypes.includes(item.evidenceType))return '证据必须包含 id、title、sourceId 和合法 evidenceType。';return null};
  const validateResearch = item => {if(!item?.id||!item.title||!item.hypothesis)return '研究必须包含 id、title 和 hypothesis。';return null};
  const parseJson = text => {try{const value=JSON.parse(text);if(!value||typeof value!=='object')throw new Error();return {value,errors:[]}}catch{return {value:null,errors:['JSON 格式无效。']}}};
  const parseCsv = text => {const rows=text.trim().split(/\r?\n/).map(line=>line.split(',').map(v=>v.trim()));if(rows.length<2)return {headers:[],rows:[],errors:['CSV 至少需要标题行与一条数据。']};const headers=rows.shift();const required=['id','name','value','unit','period','sourceId','evidenceType'];const missing=required.filter(h=>!headers.includes(h));return {headers,rows:rows.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??'']))),errors:missing.length?[`缺少必需字段：${missing.join(', ')}`]:[]};};
  const download = (filename,payload) => {const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url)};
  return {evidenceTypes,validateEvidence,validateResearch,parseJson,parseCsv,download};
})();
