/* Shared v0.13 provider contract: selection is IDs only; prose is reconstructed locally. */
(function(root){
 'use strict';
 function approvedEvidence(statements){
  if(!Array.isArray(statements)||!statements.length||statements.length>8)throw Error('PROVIDER_INPUT_INVALID');
  const ids=new Set();let size=0;
  const result=statements.map(item=>{if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(item.id)||ids.has(item.id)||typeof item.text!=='string')throw Error('PROVIDER_INPUT_INVALID');ids.add(item.id);size+=item.text.length;return {id:item.id,text:item.text};});
  if(size>12000)throw Error('PROVIDER_INPUT_INVALID');return result;
 }
 function validateSelection(ids,statements){
  const approved=approvedEvidence(statements),allowed=new Set(approved.map(x=>x.id));
  if(!Array.isArray(ids)||!ids.length||ids.length>8||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!allowed.has(id)))throw Error('PROVIDER_RESPONSE_INVALID');
  return [...ids];
 }
 const api=Object.freeze({approvedEvidence,validateSelection});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.MinshengEvidenceIdSelection=api;
})(typeof window==='object'?window:globalThis);
