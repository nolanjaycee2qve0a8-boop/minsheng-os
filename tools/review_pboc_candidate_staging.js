'use strict';

/* Local, deterministic review of a PBOC candidate-staging audit.
 * Review output deliberately contains no candidate values and cannot submit.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_ROOT = path.join(ROOT, 'sources', 'official-v030', 'manifests');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
}

function resolveManifest(relativePath, code) {
  if (typeof relativePath !== 'string' || !relativePath) fail(code);
  const candidate = path.resolve(ROOT, relativePath);
  const relative = path.relative(MANIFEST_ROOT, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail(code);
  return candidate;
}

function loadIndicators() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data', 'indicators.js'), 'utf8'), sandbox, { filename: 'indicators.js' });
  if (!Array.isArray(sandbox.window.MinshengIndicators)) fail('INDICATOR_REGISTRY_UNAVAILABLE');
  return sandbox.window.MinshengIndicators;
}

function targetMetadata(indicator) {
  return {
    id: indicator.id,
    sourceId: indicator.sourceId || null,
    preferredUnit: indicator.preferredUnit || indicator.unit || null,
    frequency: indicator.frequency || null,
    status: indicator.status || null,
    methodologyNotes: indicator.methodologyNotes || null
  };
}

function candidateReview(candidate, indicators, methodologyHints) {
  const indicator = indicators.find(item => item?.id === candidate.indicatorId);
  const blockers = [];
  if (candidate.status !== 'CANDIDATE_PARSED') blockers.push(candidate.status === 'BLOCKED_AMBIGUOUS' ? 'AMBIGUOUS_SOURCE_VALUE' : 'SOURCE_CANDIDATE_NOT_PARSED');
  if (!indicator) blockers.push('TARGET_INDICATOR_UNMAPPED');
  if (indicator && indicator.sourceId !== 'pboc') blockers.push('TARGET_SOURCE_MISMATCH');
  if (indicator && indicator.status === 'SCHEMA') blockers.push('TARGET_METADATA_SCHEMA_ONLY');
  if (indicator && /MOCK/i.test(String(indicator.methodologyNotes || ''))) blockers.push('TARGET_METADATA_MOCK_ISOLATION');
  if (indicator && candidate.unit && indicator.preferredUnit && candidate.unit !== indicator.preferredUnit) blockers.push('UNIT_CONVERSION_REVIEW_REQUIRED');
  if (candidate.aggregation === 'UNKNOWN') blockers.push('AGGREGATION_UNRESOLVED');
  if (indicator && candidate.frequency && indicator.frequency && candidate.frequency !== indicator.frequency) blockers.push('FREQUENCY_RECONCILIATION_REQUIRED');
  if (methodologyHints.some(hint => candidate.indicatorId === hint.indicatorId || candidate.indicatorId === `${hint.indicatorId}_yoy`)) blockers.push('METHODOLOGY_CHANGE_REVIEW_REQUIRED');
  return {
    candidateId: candidate.id,
    indicatorId: candidate.indicatorId || null,
    sourceField: candidate.sourceField || null,
    period: candidate.period || null,
    candidateStatus: candidate.status,
    target: indicator ? targetMetadata(indicator) : null,
    reviewStatus: blockers.length ? 'BLOCKED_PENDING_HUMAN_REVIEW' : 'REVIEW_REQUIRED',
    blockers,
    materialization: 'PROHIBITED',
    valueIncluded: false
  };
}

function reviewStaging(staging, indicators) {
  if (!staging || staging.artifactType !== 'OFFICIAL_CANDIDATE_STAGING_AUDIT') fail('STAGING_AUDIT_REQUIRED');
  if (staging.controls?.knowledgeBaseEffect !== 'NONE' || staging.controls?.dashboardEffect !== 'NONE' || staging.controls?.publicationEligible !== false) fail('UNSAFE_STAGING_CONTROLS');
  if (staging.source?.provider !== 'PBOC' || staging.source?.releaseFamily !== 'PBOC_FINANCIAL_STATISTICS') fail('PBOC_STAGING_REQUIRED');
  if (!Array.isArray(staging.candidates) || !Array.isArray(indicators)) fail('CANDIDATE_OR_INDICATOR_LIST_REQUIRED');
  const methodologyHints = staging.observation?.methodologyHints || [];
  const reviews = staging.candidates.map(candidate => candidateReview(candidate, indicators, methodologyHints));
  return {
    schemaVersion: '1.0.0',
    artifactType: 'OFFICIAL_CANDIDATE_MANUAL_REVIEW_AUDIT',
    immutable: true,
    sourceAudit: {
      runId: staging.runId,
      sourceRawSha256: staging.source.rawSha256,
      sourceAuditSha256: null,
      period: staging.observation?.period || null,
      releaseFamily: staging.source.releaseFamily
    },
    reviewPolicy: {
      automaticMaterialization: 'PROHIBITED',
      automaticQualification: 'PROHIBITED',
      automaticSubmission: 'PROHIBITED',
      valuesIncluded: false,
      decisionAuthority: 'HUMAN_REVIEW_REQUIRED'
    },
    reviews,
    summary: {
      total: reviews.length,
      blocked: reviews.filter(item => item.reviewStatus.startsWith('BLOCKED')).length,
      reviewRequired: reviews.filter(item => item.reviewStatus === 'REVIEW_REQUIRED').length,
      materializationEligible: 0
    }
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith('--') || argv[index + 1] === undefined) fail('INVALID_ARGUMENTS');
    args[argv[index].slice(2)] = argv[index + 1];
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args['input-staging'] || !args['output-review']) fail('REQUIRED_ARGUMENT_MISSING');
  const inputPath = resolveManifest(args['input-staging'], 'INPUT_STAGING_OUTSIDE_MANIFEST_ROOT');
  const outputPath = resolveManifest(args['output-review'], 'OUTPUT_REVIEW_OUTSIDE_MANIFEST_ROOT');
  if (fs.existsSync(outputPath)) fail('OUTPUT_ALREADY_EXISTS');
  const raw = fs.readFileSync(inputPath);
  const audit = reviewStaging(JSON.parse(raw.toString('utf8')), loadIndicators());
  audit.sourceAudit.sourceAuditSha256 = sha256(raw);
  fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`, { flag: 'wx', encoding: 'utf8' });
  process.stdout.write(`${JSON.stringify({ output: path.relative(ROOT, outputPath).replaceAll('\\', '/'), summary: audit.summary, automaticMaterialization: 'PROHIBITED' })}\n`);
}

module.exports = { reviewStaging, sha256 };
if (require.main === module) main(process.argv.slice(2));
