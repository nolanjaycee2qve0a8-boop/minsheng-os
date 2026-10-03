'use strict';

const assert = require('assert');
const { sha256, stageAcquiredReport } = require('../tools/stage_pboc_official_candidate.js');

let assertions = 0;
function must(condition, message) { assertions += 1; assert.ok(condition, message); }
function throws(fn, code) {
  assertions += 1;
  assert.throws(fn, error => error?.code === code, code);
}

const parentSha = '12CCE95BE65F5D00B8E2B4FF0223AAB49E2F5B6F76984DFD3B42A0FE9AC8A689';
const html = `<!doctype html><title>2026年8月金融统计数据报告</title>
<main>2026年8月金融统计数据报告
流通中货币（M0）余额为1亿元，同比增长2%。
住户贷款增加3亿元。
人民币贷款余额为4万亿元。
人民币贷款余额为5万亿元。
统计口径调整说明。</main>`;
const raw = Buffer.from(html, 'utf8');
const manifest = {
  runId: 'test_pboc_202608',
  manifestFingerprint: 'TEST_FINGERPRINT',
  families: [{ id: 'PBOC_FINANCIAL_STATISTICS' }],
  routes: [{
    status: 'ACQUIRED',
    routeType: 'DISCOVERED_OFFICIAL_CANDIDATE',
    finalRoute: 'https://www.pbc.gov.cn/example/report.html',
    sha256: sha256(raw),
    relativePath: 'sources/official-v030/raw/AA/test.html',
    discoveryArtifactSha256: parentSha
  }]
};

const staged = stageAcquiredReport({ manifest, raw, expectedParentSha256: parentSha });
const stagedAgain = stageAcquiredReport({ manifest, raw, expectedParentSha256: parentSha });
must(staged.artifactType === 'OFFICIAL_CANDIDATE_STAGING_AUDIT', 'staging artifact type must be explicit');
must(JSON.stringify(stagedAgain) === JSON.stringify(staged), 'identical staging inputs must produce byte-stable audit content');
must(staged.source.title === '2026年8月金融统计数据报告', 'report title must come from acquired content');
must(staged.observation.period === '2026-08', 'monthly report period must be deterministic');
must(staged.parser.incompatibleRuleFixesLoaded === false, 'H1 compatibility fix must not be loaded for a monthly report');
must(staged.controls.publicationEligible === false && staged.controls.knowledgeBaseEffect === 'NONE', 'staging must not publish into the knowledge base');
const parsed = staged.candidates.filter(item => item.status === 'CANDIDATE_PARSED');
must(parsed.length === 3, 'supported, unambiguous fields and M0 growth rate must be staged');
must(parsed.every(item => item.publicationEligible === false && Number.isFinite(item.value)), 'parsed candidates remain non-publishable review records');
const ambiguous = staged.candidates.find(item => item.status === 'BLOCKED_AMBIGUOUS');
must(ambiguous?.indicatorId === 'rmb_loan_balance', 'duplicate explicit values must remain ambiguous');
must(!Object.hasOwn(ambiguous, 'value') && !Object.hasOwn(ambiguous, 'originalText'), 'blocked candidates must omit values and copied report text');
must(staged.observation.methodologyHints.length === 1, 'methodology hints must remain review-only diagnostics');
must(staged.observation.methodologyHints[0].id === `method_hint_${staged.observation.period}_${staged.observation.methodologyHints[0].locator.paragraphIndex}`, 'methodology hint identifier must derive from stable report coordinates');
throws(() => stageAcquiredReport({ manifest, raw, expectedParentSha256: 'A'.repeat(64) }), 'PARENT_DISCOVERY_HASH_MISMATCH');
throws(() => stageAcquiredReport({ manifest: { ...manifest, routes: [{ ...manifest.routes[0], sha256: 'B'.repeat(64) }] }, raw, expectedParentSha256: parentSha }), 'RAW_SHA256_MISMATCH');

console.log(`v013 PBOC candidate staging tests: PASS (${assertions} assertions)`);
