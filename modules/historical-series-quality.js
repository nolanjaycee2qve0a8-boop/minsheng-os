window.MinshengHistoricalSeriesQuality=(()=>{
 const month=value=>String(value||'').match(/^\d{4}-\d{2}/)?.[0]||null;
 function inspect(records){const ordered=[...(records||[])].sort((a,b)=>String(a.period).localeCompare(String(b.period))),periods=ordered.map(item=>month(item.period)).filter(Boolean),duplicates=[...new Set(periods.filter((p,i)=>periods.indexOf(p)!==i))],outOfOrder=(records||[]).map(item=>month(item.period)).filter(Boolean).filter((p,i,a)=>i&&p<a[i-1]),structural=[...new Set(ordered.flatMap(item=>item.structuralGaps||[]))],missingReason=structural.length?'STRUCTURAL_PERIOD_GAP':null;return {publishedObservations:ordered.length,duplicates,outOfOrder,structuralGaps:structural,unexpectedMissing:[],missingReason};}
 return {inspect};
})();
