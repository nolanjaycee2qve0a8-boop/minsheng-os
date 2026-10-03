'use strict';

const assert = require('assert');
const { reviewStaging } = require('../tools/review_pboc_candidate_staging.js');

let assertions = 0;
function must(condition, message) { assertions += 1; assert.ok(condition, message); }

const staging = {
  artifactType: 'OFFICIAL_CANDIDATE_STAGING_AUDIT',
  runId: 'staging_test',
  source: { provider: 'PBOC', releaseFamily: 'PBOC_FINANCIAL_STATISTICS', rawSha256: 'A'.repeat(64) },
  observation: { period: '2026-08', methodologyHints: [{ indicatorId: 'money_m1' }] },
  controls: { knowledgeBaseEffect: 'NONE', dashboardEffect: 'NONE', publicationEligible: false },
  candidates: [
    { id: 'm2', indicatorId: 'money_m2', sourceField: 'M2', period: '2026-08', status: 'CANDIDATE_PARSED', unit: '万亿元', frequency: 'monthly', aggregation: 'POINT', value: 1 },
    { id: 'm1yoy', indicatorId: 'money_m1_yoy', sourceField: 'M1同比增长', period: '2026-08', status: 'CANDIDATE_PARSED', unit: '%', frequency: 'monthly', aggregation: 'PERIOD', value: 2 },
    { id: 'flow', indicatorId: 'household_loan_change', sourceField: '住户贷款增加', period: '2026-08', status: 'CANDIDATE_PARSED', unit: '万亿元', frequency: 'monthly', aggregation: 'UNKNOWN', value: 3 },
    { id: 'ambiguous', indicatorId: 'rmb_loan_balance', sourceField: '人民币贷款余额', period: '2026-08', status: 'BLOCKED_AMBIGUOUS' }
  ]
};
const indicators = [
  { id: 'money_m2', sourceId: 'pboc', preferredUnit: '亿元', frequency: 'monthly', status: 'SCHEMA', methodologyNotes: 'MOCK metadata' },
  { id: 'money_m1_yoy', sourceId: 'pboc', preferredUnit: '%', frequency: 'monthly', status: 'SCHEMA', methodologyNotes: 'MOCK metadata' },
  { id: 'household_loan_change', sourceId: 'pboc', preferredUnit: '亿元', frequency: 'irregular', status: 'SCHEMA', methodologyNotes: 'MOCK metadata' },
  { id: 'rmb_loan_balance', sourceId: 'pboc', preferredUnit: '亿元', frequency: 'monthly', status: 'SCHEMA', methodologyNotes: 'MOCK metadata' }
];
const audit = reviewStaging(staging, indicators);
must(audit.artifactType === 'OFFICIAL_CANDIDATE_MANUAL_REVIEW_AUDIT', 'review audit type must be explicit');
must(audit.summary.total === 4 && audit.summary.blocked === 4 && audit.summary.materializationEligible === 0, 'review must not auto-approve candidates');
must(audit.reviewPolicy.automaticMaterialization === 'PROHIBITED' && audit.reviewPolicy.valuesIncluded === false, 'review policy must reject automatic materialization and value copies');
must(audit.reviews.every(item => !Object.hasOwn(item, 'value')), 'review entries must omit candidate values');
const m2 = audit.reviews.find(item => item.candidateId === 'm2');
must(m2.blockers.includes('UNIT_CONVERSION_REVIEW_REQUIRED') && m2.blockers.includes('TARGET_METADATA_MOCK_ISOLATION'), 'unit conversion and mock-target isolation must block M2');
const m1Yoy = audit.reviews.find(item => item.candidateId === 'm1yoy');
must(m1Yoy.blockers.includes('METHODOLOGY_CHANGE_REVIEW_REQUIRED'), 'M1 methodology hint must extend to its growth-rate candidate');
const flow = audit.reviews.find(item => item.candidateId === 'flow');
must(flow.blockers.includes('AGGREGATION_UNRESOLVED') && flow.blockers.includes('FREQUENCY_RECONCILIATION_REQUIRED'), 'flow candidates require aggregation and frequency reconciliation');
const ambiguous = audit.reviews.find(item => item.candidateId === 'ambiguous');
must(ambiguous.blockers.includes('AMBIGUOUS_SOURCE_VALUE') && ambiguous.materialization === 'PROHIBITED', 'ambiguous candidates must stay blocked');

console.log(`v013 PBOC candidate review tests: PASS (${assertions} assertions)`);
