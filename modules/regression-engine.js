/* Small auditable OLS implementation; no significance claim is produced. */
window.MinshengRegressionEngine=(()=>{
 function ols(rows){const n=rows.length;if(n<2)return {beta:null,intercept:null,rSquared:null,sampleSize:n};const mx=rows.reduce((s,r)=>s+r.x,0)/n,my=rows.reduce((s,r)=>s+r.y,0)/n;const denom=rows.reduce((s,r)=>s+(r.x-mx)**2,0);if(!denom)return {beta:null,intercept:null,rSquared:null,sampleSize:n};const beta=rows.reduce((s,r)=>s+(r.x-mx)*(r.y-my),0)/denom,intercept=my-beta*mx,sst=rows.reduce((s,r)=>s+(r.y-my)**2,0),sse=rows.reduce((s,r)=>s+(r.y-(intercept+beta*r.x))**2,0);return {beta,intercept,rSquared:sst?1-sse/sst:null,sampleSize:n,standardError:null,tStatistic:null,pValue:null};}
 return {ols};
})();
