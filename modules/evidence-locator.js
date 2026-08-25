window.MinshengEvidenceLocator = (() => {
  const fields=['documentId','page','sectionId','sectionTitle','tableId','tableTitle','rowLabel','columnLabel','paragraph','quote','locatorNote'];
  const normalize=value=>{if(!value)return null;const item={};fields.forEach(key=>item[key]=value[key]===undefined||value[key]===''?null:value[key]);if(item.page!==null)item.page=Number(item.page);return Object.values(item).some(x=>x!==null)?item:null;};
  const validate=value=>{const item=normalize(value);if(item?.page!==null&&(!Number.isInteger(item.page)||item.page<1))return '页码必须是正整数。';return null;};
  const summary=value=>{const x=normalize(value);if(!x)return '暂无文档内部定位';return [x.page?`第 ${x.page} 页`:null,x.sectionTitle,x.tableTitle,x.rowLabel,x.columnLabel,x.paragraph?`段落 ${x.paragraph}`:null].filter(Boolean).join(' · ')||'已登记人工定位';};
  return {fields,normalize,validate,summary};
})();
