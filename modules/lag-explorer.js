window.MinshengLagExplorer=(()=>{
 const pearson=rows=>{const n=rows.length;if(n<2)return null;const mx=rows.reduce((s,r)=>s+r.x,0)/n,my=rows.reduce((s,r)=>s+r.y,0)/n;const a=rows.reduce((s,r)=>s+(r.x-mx)*(r.y-my),0),b=Math.sqrt(rows.reduce((s,r)=>s+(r.x-mx)**2,0)*rows.reduce((s,r)=>s+(r.y-my)**2,0));return b?a/b:null;};
 const rank=values=>values.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value).map((item,index)=>({index:item.index,value:index+1})).sort((a,b)=>a.index-b.index).map(x=>x.value);
 const spearman=rows=>{const rx=rank(rows.map(x=>x.x)),ry=rank(rows.map(x=>x.y));return pearson(rows.map((x,i)=>({x:rx[i],y:ry[i]})));};
 function explore(source,target,lags=[0,1,2,3,6,9,12]){return lags.map(lag=>{const rows=window.MinshengSeriesBuilder.align(source,target,lag);return {lag,lagMeaning:`source leads target by ${lag} month(s)`,sampleSize:rows.length,pearson:pearson(rows),spearman:spearman(rows)};});}
 return {pearson,spearman,explore};
})();
