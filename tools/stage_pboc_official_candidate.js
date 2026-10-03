'use strict';

/*
 * Deterministic, local-only staging for one already-acquired PBOC report.
 * This tool writes a review artifact only. It never updates dashboard data,
 * qualification state, source references, or submission state.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const RAW_ROOT = path.join(ROOT, 'sources', 'official-v030', 'raw');
const RULES_PATH = path.join(ROOT, 'data', 'pboc-parser-rules.js');
const PARSER_PATH = path.join(ROOT, 'adapters', 'pboc-statistical-report-parser.js');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
}

function requireObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value;
}

function resolveInside(root, relativePath, code) {
  if (typeof relativePath !== 'string' || !relativePath) fail(code);
  const candidate = path.resolve(ROOT, relativePath);
  const relative = path.relative(root, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail(code);
  return candidate;
}

function reportTitle(html) {
  const title = String(html).match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i)?.[1];
  return title ? title.replace(/\s+/g, ' ').trim() : 'UNKNOWN';
}

function loadParser() {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(fs.readFileSync(RULES_PATH, 'utf8'), sandbox, { filename: 'pboc-parser-rules.js' });
  vm.runInNewContext(fs.readFileSync(PARSER_PATH, 'utf8'), sandbox, { filename: 'pboc-statistical-report-parser.js' });
  const parser = sandbox.window.MinshengPbocStatisticalReportParser;
  const rules = sandbox.window.MinshengPbocParserRules;
  if (!parser || !rules || !Array.isArray(rules.rules)) fail('PBOC_PARSER_OR_RULES_UNAVAILABLE');
  return { parser, rules };
}

function publicLocator(locator, period) {
  return {
    locatorType: locator?.locatorType || 'text',
    paragraphIndex: Number.isInteger(locator?.paragraphIndex) ? locator.paragraphIndex : null,
    sectionTitle: locator?.sectionTitle || '中国人民银行金融统计数据报告',
    period: period || null
  };
}

function stagedCandidate(candidate, rawSha) {
  const common = {
    id: `candidate_${rawSha.slice(0, 16).toLowerCase()}_${String(candidate.indicatorId || candidate.sourceField || 'unknown').replace(/[^a-zA-Z0-9_]+/g, '_')}`,
    sourceField: candidate.sourceField || null,
    indicatorId: candidate.indicatorId || null,
    period: candidate.period || null,
    parserConfidence: candidate.parserConfidence ?? null,
    publicationEligible: false,
    locator: publicLocator(candidate.locator, candidate.period),
    errors: Array.isArray(candidate.errors) ? candidate.errors : []
  };
  if (candidate.status === 'PARSED') {
    return {
      ...common,
      status: 'CANDIDATE_PARSED',
      ruleId: candidate.ruleId || null,
      value: candidate.value,
      unit: candidate.unit || null,
      frequency: candidate.frequency || null,
      aggregation: candidate.aggregation || null,
      observationType: candidate.observationType || null,
      transformation: candidate.transformation || null
    };
  }
  return {
    ...common,
    status: candidate.status === 'AMBIGUOUS' ? 'BLOCKED_AMBIGUOUS' : 'BLOCKED_VALIDATION',
    blocker: 'MANUAL_REVIEW_REQUIRED'
  };
}

function stageAcquiredReport({ manifest, raw, expectedParentSha256 }) {
  requireObject(manifest, 'STAGING_MANIFEST_REQUIRED');
  if (manifest?.families?.[0]?.id !== 'PBOC_FINANCIAL_STATISTICS') fail('PBOC_RELEASE_FAMILY_REQUIRED');
  const route = manifest.routes?.filter(item => item?.status === 'ACQUIRED');
  if (!Array.isArray(route) || route.length !== 1) fail('EXACTLY_ONE_ACQUIRED_ROUTE_REQUIRED');
  const acquired = route[0];
  if (acquired.routeType !== 'DISCOVERED_OFFICIAL_CANDIDATE') fail('DISCOVERED_OFFICIAL_ROUTE_REQUIRED');
  if (!/^https:\/\/www\.pbc\.gov\.cn\//.test(acquired.finalRoute || acquired.url || '')) fail('PBOC_OFFICIAL_HTTPS_ROUTE_REQUIRED');
  if (!/^[A-F0-9]{64}$/.test(String(acquired.sha256 || ''))) fail('RAW_SHA256_REQUIRED');
  if (String(acquired.discoveryArtifactSha256 || '').toUpperCase() !== String(expectedParentSha256 || '').toUpperCase()) fail('PARENT_DISCOVERY_HASH_MISMATCH');
  const bytes = Buffer.isBuffer(raw) ? raw : Buffer.from(raw || '');
  const rawSha256 = sha256(bytes);
  if (rawSha256 !== acquired.sha256) fail('RAW_SHA256_MISMATCH');
  const html = bytes.toString('utf8');
  const title = reportTitle(html);
  const { parser, rules } = loadParser();
  const parsed = parser.parse({ sourceId: 'pboc', content: html, contentType: 'text/html', title });
  if (parsed.status !== 'SUCCESS' || !parsed.period) fail('PBOC_PARSE_OR_PERIOD_FAILED');
  const candidates = parsed.candidates.map(candidate => stagedCandidate(candidate, rawSha256));
  return {
    schemaVersion: '1.0.0',
    artifactType: 'OFFICIAL_CANDIDATE_STAGING_AUDIT',
    immutable: true,
    runId: `${manifest.runId}_candidate_staging`,
    generatedAt: '2026-09-27T00:00:00Z',
    source: {
      provider: 'PBOC',
      releaseFamily: 'PBOC_FINANCIAL_STATISTICS',
      title,
      route: acquired.finalRoute || acquired.url,
      rawSha256,
      rawRelativePath: acquired.relativePath,
      parentDiscoveryArtifactSha256: acquired.discoveryArtifactSha256,
      acquisitionManifestFingerprint: manifest.manifestFingerprint || null
    },
    parser: {
      id: 'MinshengPbocStatisticalReportParser',
      version: parser.version,
      rulesVersion: rules.version,
      ruleCount: rules.rules.length,
      incompatibleRuleFixesLoaded: false
    },
    observation: {
      period: parsed.period,
      frequency: 'monthly',
      diagnostics: parsed.diagnostics,
      methodologyHints: parsed.hints.map(hint => ({
        id: hint.id,
        type: hint.type,
        indicatorId: hint.indicatorId || null,
        confidence: hint.confidence,
        status: hint.status,
        locator: publicLocator(hint.locator, parsed.period)
      }))
    },
    candidates,
    candidateSummary: {
      parsed: candidates.filter(item => item.status === 'CANDIDATE_PARSED').length,
      blockedAmbiguous: candidates.filter(item => item.status === 'BLOCKED_AMBIGUOUS').length,
      blockedValidation: candidates.filter(item => item.status === 'BLOCKED_VALIDATION').length
    },
    controls: {
      knowledgeBaseEffect: 'NONE',
      dashboardEffect: 'NONE',
      qualificationEffect: 'NONE',
      submission: null,
      reviewerApproval: null,
      publicationEligible: false,
      reviewRequired: true,
      blockedCandidateValuesOmitted: true
    }
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) fail('INVALID_ARGUMENTS');
    args[key.slice(2)] = value;
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args['input-manifest'] || !args['output-manifest'] || !args['expected-parent-sha256']) fail('REQUIRED_ARGUMENT_MISSING');
  const inputPath = resolveInside(path.join(ROOT, 'sources', 'official-v030', 'manifests'), args['input-manifest'], 'INPUT_MANIFEST_OUTSIDE_MANIFEST_ROOT');
  const outputPath = resolveInside(path.join(ROOT, 'sources', 'official-v030', 'manifests'), args['output-manifest'], 'OUTPUT_MANIFEST_OUTSIDE_MANIFEST_ROOT');
  if (fs.existsSync(outputPath)) fail('OUTPUT_ALREADY_EXISTS');
  const manifest = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const route = manifest.routes?.find(item => item?.status === 'ACQUIRED');
  const rawPath = resolveInside(RAW_ROOT, route?.relativePath, 'RAW_ARTIFACT_OUTSIDE_RAW_ROOT');
  const staged = stageAcquiredReport({
    manifest,
    raw: fs.readFileSync(rawPath),
    expectedParentSha256: args['expected-parent-sha256']
  });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(staged, null, 2)}\n`, { flag: 'wx', encoding: 'utf8' });
  process.stdout.write(`${JSON.stringify({ output: path.relative(ROOT, outputPath).replaceAll('\\', '/'), candidateSummary: staged.candidateSummary, publicationEligible: false })}\n`);
}

module.exports = { sha256, stageAcquiredReport };
if (require.main === module) main(process.argv.slice(2));
