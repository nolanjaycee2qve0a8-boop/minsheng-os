'use strict';
// Official documentation snapshot; proposed use only, not trial authorization.
const PRICING=Object.freeze({version:'deepseek-flash-peak-20261004',checkedAt:'2026-10-04',source:'https://api-docs.deepseek.com/quick_start/pricing/',model:'deepseek-flash',documentedModelVersion:'DeepSeek-V4.1-Flash',inputHitMicroUsdPerMillion:6000,inputMissMicroUsdPerMillion:300000,outputMicroUsdPerMillion:1200000});
const POLICY=Object.freeze({version:'proposed-pilot-20261004',priceVersion:PRICING.version,maxAttempts:20,totalMicroUsd:1000000,monthlyMicroUsd:5000000,maxInputTokens:6000,maxOutputTokens:1600,approval:'PENDING'});
// One approved lifetime pilot. No monthly reset/renewal or monthly spending grant.
const LIVE_POLICY=Object.freeze({version:'approved-first-pilot-20261004',priceVersion:PRICING.version,maxAttempts:20,totalMicroUsd:1000000,maxInputTokens:6000,maxOutputTokens:1600,reservationInputTokens:1048576,approval:'FIRST_PILOT_APPROVED',autoRenew:false});
function usageCost(usage){
 const keys=['prompt_tokens','completion_tokens','prompt_cache_hit_tokens','prompt_cache_miss_tokens','total_tokens'];
 if(!usage||keys.some(k=>!Number.isSafeInteger(usage[k])||usage[k]<0||usage[k]>1000000000)||usage.prompt_tokens!==usage.prompt_cache_hit_tokens+usage.prompt_cache_miss_tokens||usage.total_tokens!==usage.prompt_tokens+usage.completion_tokens)throw Error('USAGE_UNKNOWN');
 if(usage.prompt_tokens_details?.cached_tokens!==undefined&&usage.prompt_tokens_details.cached_tokens!==usage.prompt_cache_hit_tokens)throw Error('USAGE_UNKNOWN');
 const reasoning=usage.completion_tokens_details?.reasoning_tokens;if(reasoning!==undefined&&reasoning!==0)throw Error('USAGE_UNKNOWN');
 const numerator=BigInt(usage.prompt_cache_hit_tokens)*BigInt(PRICING.inputHitMicroUsdPerMillion)+BigInt(usage.prompt_cache_miss_tokens)*BigInt(PRICING.inputMissMicroUsdPerMillion)+BigInt(usage.completion_tokens)*BigInt(PRICING.outputMicroUsdPerMillion);
 const cost=Number((numerator+999999n)/1000000n);if(!Number.isSafeInteger(cost))throw Error('USAGE_UNKNOWN');
 return {costMicroUsd:cost,usage:Object.fromEntries(keys.map(k=>[k,usage[k]]))};
}
const reserveCost=()=>Math.ceil(POLICY.maxInputTokens*PRICING.inputMissMicroUsdPerMillion/1000000)+Math.ceil(POLICY.maxOutputTokens*PRICING.outputMicroUsdPerMillion/1000000);
const liveReserveCost=()=>Math.ceil(LIVE_POLICY.reservationInputTokens*PRICING.inputMissMicroUsdPerMillion/1000000+LIVE_POLICY.maxOutputTokens*PRICING.outputMicroUsdPerMillion/1000000);
module.exports={PRICING,POLICY,LIVE_POLICY,usageCost,reserveCost,liveReserveCost};
