window.MinshengAuditLog = (() => {
  const create = (action,entityType,entityId,before,after,reason='') => ({id:`audit_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,timestamp:new Date().toISOString(),action,entityType,entityId,before:before??null,after:after??null,reason});
  const add = (collection,entry) => { collection.push(entry); return entry; };
  return {create,add};
})();
