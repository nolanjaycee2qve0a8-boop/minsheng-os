'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const http = require('node:http');
const { createProvider } = require('./provider');
const EVIDENCE_SHA256 = '3DC3AF2502736FF41534960011B68572D6C12AF711691A7600516F847B608691';
const PBOC_ACCEPTANCE_SHA256 = '7CF77B0DB7655D15A171752D12716D08044471195BE3D270734754EFD3BC9F71';
const PBOC_APPROVAL_SHA256 = 'D83B51CB7A35A7D52E1E34CF87C291E2C720F2971C2711CDEEE18993432A8D40';
const PBOC_APPROVAL_ARTIFACT = 'v013-pboc-financial-statistics-202608-limited-acceptance-approval-20260927.json';
const QUESTIONS = Object.freeze(['当前年份能看哪些证据？', '家庭财务承压能说明什么？', '为什么不能跨年比较？', '哪些研究结论仍被阻断？', '已入库的 2026 年 8 月央行统计能说明什么？']);
const QUESTION_TOPICS = Object.freeze({
  scope: Object.freeze({ id: 'scope', label: '当前单年证据范围', question: QUESTIONS[0] }),
  resilience: Object.freeze({ id: 'resilience', label: '家庭财务承压（仅 2021）', question: QUESTIONS[1] }),
  comparison: Object.freeze({ id: 'comparison', label: '跨年比较边界', question: QUESTIONS[2] }),
  blocked: Object.freeze({ id: 'blocked', label: '已阻断研究边界', question: QUESTIONS[3] }),
  pboc202608: Object.freeze({ id: 'pboc202608', label: '2026 年 8 月央行六项观测', question: QUESTIONS[4] }),
  unsupported: Object.freeze({ id: 'unsupported', label: '未匹配的提问范围', question: null })
});
const DATA_FILE = path.resolve(__dirname, '../../data/v013-evidence-dashboard.js');
const PBOC_ACCEPTANCE_FILE = path.resolve(__dirname, '../../data/pboc-202608-limited-real-acceptance.js');
const PBOC_APPROVAL_FILE = path.resolve(__dirname, '../../sources/official-v030/manifests/v013-pboc-financial-statistics-202608-limited-acceptance-approval-20260927.json');
const ORIGINS = new Set(['http://localhost:4173', 'http://127.0.0.1:4173']);
const BOUNDARY = '不可跨年比较，不构成趋势、因果、预测、代表性、风险或政策结论。';

function loadEvidence() {
  const bytes = fs.readFileSync(DATA_FILE);
  if (crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase() !== EVIDENCE_SHA256) throw new Error('EVIDENCE_UNAVAILABLE');
  const context = { window: {} };
  vm.runInNewContext(bytes.toString('utf8'), context, { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
  return JSON.parse(JSON.stringify(context.window.MinshengV013EvidenceDashboard));
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function loadPboc202608Snapshot() {
  const acceptanceBytes = fs.readFileSync(PBOC_ACCEPTANCE_FILE);
  const approvalBytes = fs.readFileSync(PBOC_APPROVAL_FILE);
  if (sha256(acceptanceBytes) !== PBOC_ACCEPTANCE_SHA256 || sha256(approvalBytes) !== PBOC_APPROVAL_SHA256) throw new Error('EVIDENCE_UNAVAILABLE');
  const context = { window: {} };
  vm.runInNewContext(acceptanceBytes.toString('utf8'), context, { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
  const accepted = context.window.MinshengPboc202608LimitedAcceptance;
  const required = new Map([
    ['money_m0', { label: 'M0', unit: '亿元', measure: '期末余额' }],
    ['money_m0_yoy', { label: 'M0 同比增长', unit: '%', measure: '同比增速' }],
    ['money_m2', { label: 'M2', unit: '亿元', measure: '期末余额' }],
    ['money_m2_yoy', { label: 'M2 同比增长', unit: '%', measure: '同比增速' }],
    ['rmb_deposit_balance', { label: '人民币存款余额', unit: '亿元', measure: '期末余额' }],
    ['social_financing_stock', { label: '社会融资规模存量', unit: '亿元', measure: '期末余额' }]
  ]);
  if (!accepted || accepted.knowledgeBaseEffect !== 'LIMITED_REAL_OBSERVATIONS_ONLY' || accepted.dashboardEffect !== 'NONE' ||
      accepted.approval?.artifactSha256 !== PBOC_APPROVAL_SHA256 || !Array.isArray(accepted.records) || accepted.records.length !== required.size ||
      !Array.isArray(accepted.excludedIndicatorIds) || accepted.excludedIndicatorIds.some(id => required.has(id))) throw new Error('EVIDENCE_UNAVAILABLE');
  const records = accepted.records.map(record => {
    const meta = required.get(record?.indicatorId);
    if (!meta || record.status !== 'REAL' || record.period !== '2026-08' || record.geography !== 'CN' || record.sourceId !== 'pboc' ||
        record.unit !== meta.unit || !Number.isFinite(record.value) || !Array.isArray(record.qualityFlags) ||
        !record.qualityFlags.includes('LIMITED_ACCEPTANCE') || !record.qualityFlags.includes('NO_AUTOMATIC_INFERENCE')) throw new Error('EVIDENCE_UNAVAILABLE');
    return { id: record.indicatorId, text: `2026 年 8 月 ${meta.label}：${record.value} ${meta.unit}（全国聚合，${meta.measure}）。` };
  });
  if (new Set(records.map(record => record.id)).size !== required.size) throw new Error('EVIDENCE_UNAVAILABLE');
  return Object.freeze({
    source: Object.freeze({ sourceId: 'pbocFinancialStatistics202608', label: '中国人民银行：2026年8月金融统计数据报告（六项有限验收）', artifact: PBOC_APPROVAL_ARTIFACT, sha256: PBOC_APPROVAL_SHA256 }),
    statements: Object.freeze(records)
  });
}
function citation(data, id) {
  const source = data.sourceRefs[id];
  if (!source || typeof source.label !== 'string' || !/^[a-z0-9.-]+\.json$/i.test(source.artifact) || !/^[A-F0-9]{64}$/.test(source.sha256)) throw new Error('EVIDENCE_UNAVAILABLE');
  return { sourceId: id, ...source };
}
function classifyQuestion(question) {
  const compact = question.trim().toLowerCase().replace(/\s+/g, '');
  const exactIndex = QUESTIONS.indexOf(question.trim());
  if (exactIndex >= 0) return { topic: Object.values(QUESTION_TOPICS).find(item => item.question === QUESTIONS[exactIndex]), matchedBy: 'FIXED_CATALOG' };
  if (/(忽略|system:|assistant:|提示词|指令|输出key|密钥|api.?key)/.test(compact)) return { topic: QUESTION_TOPICS.unsupported, matchedBy: 'LOCAL_RULES' };
  if (/(预测|因果|房地产|房价|按揭|房贷|偿债|政策建议|风险评估)/.test(compact)) return { topic: QUESTION_TOPICS.blocked, matchedBy: 'LOCAL_RULES' };
  if (/(跨年|比较|趋势|变化率|增减幅)/.test(compact)) return { topic: QUESTION_TOPICS.comparison, matchedBy: 'LOCAL_RULES' };
  if (/(央行|人民银行|m0|m2|社融|社会融资|货币供应|存款余额|金融统计)/.test(compact)) return { topic: QUESTION_TOPICS.pboc202608, matchedBy: 'LOCAL_RULES' };
  if (/(家庭财务|财务承压|债务收入|债务资产|消费收入|负债压力)/.test(compact)) return { topic: QUESTION_TOPICS.resilience, matchedBy: 'LOCAL_RULES' };
  if (/(当前年份|当前年|哪些证据|能看什么|可看什么|证据范围|chfs)/.test(compact)) return { topic: QUESTION_TOPICS.scope, matchedBy: 'LOCAL_RULES' };
  if (/(阻断|不能研究|研究边界|哪些结论)/.test(compact)) return { topic: QUESTION_TOPICS.blocked, matchedBy: 'LOCAL_RULES' };
  return { topic: QUESTION_TOPICS.unsupported, matchedBy: 'LOCAL_RULES' };
}
function withTopic(result, match) {
  return { ...result, topic: { id: match.topic.id, label: match.topic.label, matchedBy: match.matchedBy }, questionDisposition: match.topic.id === 'unsupported' ? 'LOCAL_REJECTED' : 'LOCAL_RULE_MATCH' };
}
function retrieve(question, year, data, pbocSnapshot = loadPboc202608Snapshot()) {
  const match = classifyQuestion(question);
  const topic = match.topic;
  const entry = data.years[year];
  if (topic.id === 'unsupported') return withTopic({ year, status: 'UNSUPPORTED_QUESTION', boundary: data.notice + ' ' + BOUNDARY,
    evidenceFileSha256: EVIDENCE_SHA256, sources: [citation(data, entry.sourceId)], providerAllowed: false,
    statements: [{ id: 'policy', sourceId: entry.sourceId, text: '该问题未能在本机匹配到已批准证据主题，未调用模型，也未生成分析。可询问当前单年证据、家庭财务承压、跨年比较边界、已阻断结论或 2026 年 8 月央行六项观测。' }] }, match);
  if (topic.id === 'pboc202608') {
    const boundary = '这是 2026 年 8 月中国人民银行发布的六项全国聚合金融统计观测，不是抽样调查，不提供有效样本量或缺失率。它与当前选择的 CHFS 单年描述相互独立；不可跨年比较，不构成趋势、因果、预测、代表性、风险或政策结论；也不得推断房地产、按揭或居民偿债。';
    const result = { year: '2026-08', selectedChfsYear: year, status: 'LIMITED_OFFICIAL_OBSERVATIONS', boundary,
      evidenceFileSha256: EVIDENCE_SHA256, sources: [pbocSnapshot.source], providerAllowed: true,
      statements: [{ id: 'pbocScope', text: boundary, sourceId: pbocSnapshot.source.sourceId }, ...pbocSnapshot.statements.map(statement => ({ ...statement, sourceId: pbocSnapshot.source.sourceId }))] };
    if (JSON.stringify(result).length > 12000) throw new Error('EVIDENCE_UNAVAILABLE');
    return withTopic(result, match);
  }
  const canonicalQuestion = topic.question;
  const result = { year, status: 'SINGLE_YEAR_DESCRIPTION', boundary: data.notice + ' ' + BOUNDARY,
    evidenceFileSha256: EVIDENCE_SHA256, sources: [citation(data, entry.sourceId)], statements: [], providerAllowed: true };
  if (canonicalQuestion === QUESTIONS[0]) {
    result.statements = [{ id: 'scope', text: `当前 CHFS ${year}；${entry.nRule}`, sourceId: entry.sourceId }];
    for (const [id, meta] of Object.entries(data.metrics)) {
      const [n, median, missing] = entry.groups.national[id];
      if (!(Number.isInteger(n) && n >= 30 && Number.isFinite(median) && missing >= 0 && missing <= 1)) throw new Error('EVIDENCE_UNAVAILABLE');
      result.statements.push({ id, text: `${meta.label}：全国样本聚合加权中位数 ${median} ${meta.unit}，有效 n=${n}，缺失率 ${missing}。${meta.boundary}`, sourceId: entry.sourceId,
        metricId: id, value: median, n, missing, unit: meta.unit });
    }
  } else if (canonicalQuestion === QUESTIONS[1]) {
    const panel = data.chfs2021FinancialResilience;
    if (panel.year !== '2021' || panel.status !== 'DESCRIPTIVE_2021_ONLY' || !panel.noCmesOrCrossYearLinkage) throw new Error('EVIDENCE_UNAVAILABLE');
    result.sources = [citation(data, panel.sourceId)];
    result.boundary += ' ' + panel.boundary + ' ' + panel.prohibited;
    result.status = year === panel.year ? panel.status : 'BLOCKED';
    result.providerAllowed = year === panel.year;
    result.statements = [{ id: 'resilienceScope', sourceId: panel.sourceId,
      text: year === panel.year ? panel.boundary : `当前 CHFS ${year} 无此专项比率展示资格；仅有 2021 单年证据。` }];
    if (result.providerAllowed) {
      const group = panel.groups.find(g => g.id === 'NATIONAL');
      for (const ratio of panel.ratios) {
        const cell = group[ratio.id];
        if (!(Number.isInteger(cell.n) && cell.n >= 30 && Number.isFinite(cell.median) && cell.exclusionRate >= 0 && cell.exclusionRate <= 1)) throw new Error('EVIDENCE_UNAVAILABLE');
        result.statements.push({ id: ratio.id, text: `${group.label} ${ratio.label}：描述性加权中位数 ${cell.median}，有效 n=${cell.n}，排除率 ${cell.exclusionRate}。`,
          sourceId: panel.sourceId, metricId: ratio.id, value: cell.median, n: cell.n, exclusionRate: cell.exclusionRate });
      }
    }
  } else {
    result.providerAllowed = false;
    result.status = canonicalQuestion === QUESTIONS[2] || canonicalQuestion === QUESTIONS[3] ? 'BLOCKED' : 'UNSUPPORTED_QUESTION';
    result.statements = [{ id: 'policy', sourceId: entry.sourceId, text: result.status === 'UNSUPPORTED_QUESTION'
      ? '当前仅支持固定推荐问题。此问题未调用模型，也未生成分析。' : data.notice }];
    if (canonicalQuestion === QUESTIONS[3]) {
      result.sources.push({ sourceId: 'dashboardPolicy', label: '仪表盘已封锁的研究边界', artifact: 'data/v013-evidence-dashboard.js', sha256: EVIDENCE_SHA256 });
      result.statements = data.blocked.map((item, index) => ({ id: 'blocked' + index, sourceId: 'dashboardPolicy', text: `${item.label} · ${item.status}：${item.reason}` }));
    }
  }
  if (JSON.stringify(result).length > 12000) throw new Error('EVIDENCE_UNAVAILABLE');
  return withTopic(result, match);
}
function limit(env, name, fallback, maximum) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw) || +raw < 1 || +raw > maximum) throw new Error('INVALID_CONFIGURATION');
  return +raw;
}
function createAnalysisService({ env = process.env, provider, now = Date.now } = {}) {
  const selectedProvider = provider || createProvider({ env });
  const data = loadEvidence();
  const pbocSnapshot = loadPboc202608Snapshot();
  const perMinute = limit(env, 'MINSHENG_AI_REQUESTS_PER_MINUTE', 10, 60);
  const dailyCalls = limit(env, 'MINSHENG_AI_DAILY_CALLS', 100, 1000);
  let minute = -1, requests = 0, day = -1, calls = 0;
  const response = (status, code) => ({ httpStatus: status, body: { status: code, message: code } });
  return Object.freeze({
    health: () => ({ status: selectedProvider.available ? 'READY' : 'EXTERNAL_PROVIDER_NOT_CONFIGURED', questions: [...QUESTIONS], years: ['2017', '2019', '2021'] }),
    async analyze(input) {
      const time = now(), currentMinute = Math.floor(time / 60000), currentDay = Math.floor(time / 86400000);
      if (currentMinute !== minute) { minute = currentMinute; requests = 0; }
      if (++requests > perMinute) return response(429, 'RATE_LIMITED');
      if (!input || Array.isArray(input) || typeof input !== 'object' || Object.keys(input).sort().join() !== 'question,year' ||
          typeof input.question !== 'string' || input.question.length < 1 || input.question.length > 500 ||
          /[\u0000-\u001f\u007f]/.test(input.question) || !['2017', '2019', '2021'].includes(input.year)) return response(400, 'INVALID_REQUEST');
      let evidence;
      try { evidence = retrieve(input.question.trim(), input.year, data, pbocSnapshot); }
      catch { return response(503, 'EVIDENCE_UNAVAILABLE'); }
      const { providerAllowed, statements, ...contract } = evidence;
      const answer = { ...contract, mode: 'LOCAL_POLICY', paragraphs: statements.map(s => s.text), evidence: statements };
      if (!providerAllowed) return { httpStatus: 200, body: answer };
      if (!selectedProvider.available) return { httpStatus: 503, body: { ...answer, status: 'EXTERNAL_PROVIDER_NOT_CONFIGURED', evidenceStatus: contract.status } };
      if (currentDay !== day) { day = currentDay; calls = 0; }
      if (calls >= dailyCalls) return response(429, 'DAILY_BUDGET_REACHED');
      calls += 1; // Reserve synchronously, including failed attempts.
      try {
        const ids = await selectedProvider.select(statements.map(({ id, text }) => ({ id, text })));
        if (!Array.isArray(ids) || !ids.length || ids.length > 8 || new Set(ids).size !== ids.length || ids.some(id => !statements.some(s => s.id === id))) throw new Error('PROVIDER_FAILED');
        return { httpStatus: 200, body: { ...answer, mode: 'AI_EVIDENCE_SELECTION', paragraphs: ids.map(id => statements.find(s => s.id === id).text) } };
      } catch { return { httpStatus: 502, body: { ...answer, status: 'PROVIDER_FAILED', evidenceStatus: contract.status } }; }
    }
  });
}
function createServer(service = createAnalysisService()) {
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    const send = (status, body) => {
      if (res.destroyed) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'", ...cors });
      res.end(JSON.stringify(body));
    };
    if (!/^(localhost|127\.0\.0\.1):\d{1,5}$/.test(req.headers.host || '') || (origin && !ORIGINS.has(origin))) return send(403, { status: 'ORIGIN_DENIED' });
    if (req.method === 'GET' && req.url === '/api/analysis/health') return send(200, service.health());
    if (req.url !== '/api/analysis') return send(404, { status: 'NOT_FOUND' });
    if (!ORIGINS.has(origin)) return send(403, { status: 'ORIGIN_REQUIRED' });
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end();
    }
    if (req.method !== 'POST') return send(405, { status: 'METHOD_NOT_ALLOWED' });
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '')) return send(415, { status: 'JSON_REQUIRED' });
    let bytes = 0; const chunks = [];
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 4096) { send(413, { status: 'REQUEST_TOO_LARGE' }); req.resume(); return; }
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result = await service.analyze(input);
      send(result.httpStatus, result.body);
    } catch { send(400, { status: 'INVALID_REQUEST' }); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000; server.timeout = 20000; server.maxHeadersCount = 30;
  return server;
}
if (require.main === module) {
  try {
    const port = limit(process.env, 'MINSHENG_AI_PORT', 4174, 65535);
    const server = createServer();
    server.on('error', () => { console.error('ANALYSIS_SERVER_FAILED'); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log('Local analysis service: http://127.0.0.1:' + port));
  } catch { console.error('ANALYSIS_SERVER_CONFIGURATION_FAILED'); process.exitCode = 1; }
}
module.exports = { createAnalysisService, createServer, loadEvidence, loadPboc202608Snapshot, retrieve, classifyQuestion, QUESTIONS, EVIDENCE_SHA256, PBOC_APPROVAL_SHA256 };
