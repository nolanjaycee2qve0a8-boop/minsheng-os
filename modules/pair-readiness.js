window.MinshengPairReadiness=(()=>{
 function check(left,right,{overrideReason=null}={}){if(!left||!right)return {status:'MISMATCH',reason:'SERIES_METADATA_REQUIRED'};const sameFrequency=left.frequency===right.frequency,sameTransformation=left.transformation===right.transformation,sameAggregation=left.aggregation===right.aggregation,samePeriodKind=(left.periodKind||null)===(right.periodKind||null);if(!sameFrequency||!sameTransformation||!sameAggregation||!samePeriodKind)return {status:overrideReason?'PARTIAL_MATCH':'MISMATCH',reason:overrideReason?'MANUAL_OVERRIDE':'FREQUENCY_TRANSFORMATION_OR_PERIOD_KIND_MISMATCH',overrideReason};return {status:'READY',reason:null};}
 return {check};
})();
