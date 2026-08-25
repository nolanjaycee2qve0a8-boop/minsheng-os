window.MinshengRegimeAnalysis=(()=>{
 function classify(results){const signs=results.map(x=>Math.sign(x.beta??x.pearson??0)).filter(Boolean);if(!signs.length)return 'UNKNOWN';return new Set(signs).size>1?'UNSTABLE':results.length>1?'STABLE':'PARTIALLY_STABLE';}
 return {classify};
})();
