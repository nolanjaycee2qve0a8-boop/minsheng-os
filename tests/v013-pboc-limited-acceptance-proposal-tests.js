'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const proposal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sources', 'official-v030', 'manifests', 'v013-pboc-financial-statistics-202608-limited-acceptance-proposal-20260927.json'), 'utf8'));
let assertions = 0;
function must(condition, message) { assertions += 1; assert.ok(condition, message); }
function containsValueKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => key === 'value' || containsValueKey(child));
}

must(proposal.artifactType === 'LIMITED_OFFICIAL_OBSERVATION_ACCEPTANCE_PROPOSAL', 'proposal type must be explicit');
must(proposal.proposalStatus === 'PENDING_HUMAN_ACCEPTANCE', 'proposal must not be an approval artifact');
must(proposal.scope.maximumCandidateCount === 6 && proposal.allowedCandidateMappings.length === 6, 'proposal must limit the candidate set to six');
must(proposal.scope.automaticMaterialization === 'PROHIBITED' && proposal.scope.dashboardEffect === 'NONE' && proposal.scope.knowledgeBaseEffect === 'NONE', 'proposal must not materialize into product data');
must(!containsValueKey(proposal), 'proposal must contain mapping rules, not observation values');
must(proposal.allowedCandidateMappings.filter(item => item.targetUnit === '亿元').every(item => item.unitTransform === 'SOURCE_VALUE_X_10000'), 'monetary stock conversions must be explicit and deterministic');
must(proposal.allowedCandidateMappings.filter(item => item.targetUnit === '%').every(item => item.unitTransform === 'IDENTITY'), 'growth-rate mappings must keep their unit');
const excluded = new Map(proposal.excludedCandidates.map(item => [item.indicatorId, item.reason]));
must(excluded.get('money_m1') === 'METHODOLOGY_CHANGE_REVIEW_REQUIRED' && excluded.get('money_m1_yoy') === 'METHODOLOGY_CHANGE_REVIEW_REQUIRED', 'M1 candidates must remain excluded');
must(excluded.get('household_loan_change').includes('AGGREGATION_UNRESOLVED') && excluded.get('household_deposit_change').includes('FREQUENCY_RECONCILIATION_REQUIRED'), 'household flows must remain excluded');
must(['rmb_loan_balance', 'rmb_loan_change', 'rmb_deposit_change', 'social_financing_flow'].every(id => excluded.get(id) === 'AMBIGUOUS_SOURCE_VALUE'), 'ambiguous source candidates must remain excluded');
must(proposal.requiredAcceptanceChecks.some(item => item.includes('named human reviewer')) && proposal.prohibitions.includes('No use of this proposal as an approval artifact.'), 'future acceptance must require a distinct human approval');

console.log(`v013 PBOC limited acceptance proposal tests: PASS (${assertions} assertions)`);
