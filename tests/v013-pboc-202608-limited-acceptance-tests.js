'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const context = { window: {} }; context.window = context;
const load = file => vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });

['data/indicators.js', 'data/data-records.js', 'data/source-documents.js', 'data/raw-payloads.js'].forEach(load);
const before = new Map(context.MinshengIndicators.filter(item => ['money_m0','money_m0_yoy','money_m2','money_m2_yoy','rmb_deposit_balance','social_financing_stock'].includes(item.id)).map(item => [item.id, { value: item.value, status: item.status }]));
load('data/pboc-202608-limited-real-acceptance.js');

let assertions = 0;
function must(condition, message) { assertions += 1; assert.ok(condition, message); }
const accepted = context.MinshengPboc202608LimitedAcceptance;
const records = accepted.records;
const approvalPath = path.join(root, 'sources', 'official-v030', 'manifests', 'v013-pboc-financial-statistics-202608-limited-acceptance-approval-20260927.json');
const approvalBytes = fs.readFileSync(approvalPath);
const approval = JSON.parse(approvalBytes.toString('utf8'));
const boundArtifacts = {
  proposalSha256: 'v013-pboc-financial-statistics-202608-limited-acceptance-proposal-20260927.json',
  candidateStagingAuditSha256: 'v013-pboc-financial-statistics-202608-staging-20260927.json',
  manualReviewAuditSha256: 'v013-pboc-financial-statistics-202608-manual-review-20260927.json'
};
must(accepted.approval.id === 'approval_pboc_financial_statistics_202608_limited_20260927' && accepted.approval.artifactSha256 === 'D83B51CB7A35A7D52E1E34CF87C291E2C720F2971C2711CDEEE18993432A8D40' && accepted.dashboardEffect === 'NONE', 'acceptance requires the exact limited approval and must not update the dashboard');
must(accepted.governanceStatus === 'LIMITED_ACCEPTANCE_WITH_INCOMPLETE_APPROVAL_EVIDENCE' && accepted.approval.evidenceCompleteness === 'INCOMPLETE' && accepted.approval.evidenceGaps.join() === 'NAMED_REVIEWER_MISSING,FULL_TIMESTAMP_MISSING', 'derived acceptance must expose the missing named reviewer and full timestamp without rewriting the immutable approval');
must(crypto.createHash('sha256').update(approvalBytes).digest('hex').toUpperCase() === accepted.approval.artifactSha256 && approval.approvalStatus === 'APPROVED', 'acceptance must bind the actual explicit approval artifact');
must(Object.entries(boundArtifacts).every(([binding,file]) => { const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'sources','official-v030','manifests',file))).digest('hex').toUpperCase(); return approval.requiredBindings[binding]===actual&&accepted.approval[{proposalSha256:'proposalSha256',candidateStagingAuditSha256:'stagingSha256',manualReviewAuditSha256:'reviewSha256'}[binding]]===actual; }), 'approval and acceptance must bind the exact proposal, staging and manual-review artifact bytes');
must(records.length === 6 && new Set(records.map(item => item.id)).size === 6, 'exactly six unique approved REAL records must be created');
must(approval.scope.approvedCandidateIds.length === 6 && records.every(item => approval.scope.approvedCandidateIds.includes(item.provenance.acceptedCandidateId)), 'materialization must use exactly the approved candidate-id set');
must(records.every(item => item.status === 'REAL' && item.period === '2026-08' && item.sourceId === 'pboc'), 'accepted records must be real, monthly PBOC observations');
must(records.every(item => item.sourceDocumentId === accepted.document.id && item.rawPayloadId === accepted.rawPayload.id && item.provenance.approvalId === accepted.approval.id), 'every record must retain document, raw, and approval provenance');
must(records.every(item => item.provenance.checksum === 'B47CECA8192FF24B28E56ABD420F95988A42FB2362799C7BE58E886DC8CE8F61'), 'every record must bind the exact official report hash');
const exact = new Map(records.map(item => [item.indicatorId, item.convertedValue]));
must(exact.get('money_m0') === 148300 && exact.get('money_m0_yoy') === 7.5 && exact.get('money_m2') === 3568100 && exact.get('money_m2_yoy') === 7.5 && exact.get('rmb_deposit_balance') === 3476700 && exact.get('social_financing_stock') === 4648000, 'approved observations and conversions must match the bounded six-candidate acceptance');
must(records.filter(item => item.originalUnit === '万亿元').every(item => item.conversionRule === 'SOURCE_VALUE_X_10000' && item.convertedUnit === '亿元'), 'stock-unit conversion must be explicit');
must(records.filter(item => item.originalUnit === '%').every(item => item.conversionRule === 'IDENTITY' && item.convertedUnit === '%'), 'growth-rate units must remain unchanged');
must(records.every(item => item.qualityFlags.includes('NO_AUTOMATIC_INFERENCE')), 'limited records must carry inference protection');
must(accepted.excludedIndicatorIds.every(id => !records.some(item => item.indicatorId === id)), 'all excluded indicators must remain unmaterialized');
must([...before].every(([id, expected]) => { const current = context.MinshengIndicators.find(item => item.id === id); return current.value === expected.value && current.status === expected.status; }), 'legacy MOCK/demo indicator definitions must not be overwritten');
must(context.MinshengDataRecords.filter(item => records.some(record => record.id === item.id)).length === 6, 'accepted records must join the independent data-record layer once');

console.log(`v013 PBOC 2026-08 limited acceptance tests: PASS (${assertions} assertions)`);
