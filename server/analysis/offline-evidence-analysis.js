'use strict';
// Offline acceptance only. The browser cannot select a fixture or supply evidence.
// No credential, provider transport, external fetch, or historical snapshot is used.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createStructuredSandbox, normalizeQuestion } = require('./structured-claims');
const { responseSafetyReason, privacyOrInstructionRisk } = require('./generation-response-safety');

const QUESTIONS = Object.freeze([
  '2026年上半年全国居民人均收入是多少？',
  '2026年6月末房地产开发贷款余额是多少？',
  '上半年土地出让毛收入是多少？',
  '6月末法定地方政府债务余额是多少？',
  '能计算居民正式偿债能力吗？'
]);
const BOUNDARY = '仅分析本轮已登记的全国结构化证据；不证明因果，不把情景当作现实或预测，不将半年流量与六月末存量拼接。';
const SAFE_REJECTIONS = new Set(['SCHEMA_INVALID', 'REFERENCE_SCHEMA_INVALID', 'CLAIM_ID_OR_TYPE_INVALID',
  'FACT_BINDING_MISMATCH', 'GAP_BINDING_MISMATCH', 'UNAUTHORIZED_OR_FORWARD_REFERENCE',
  'CAUSAL_OR_DEPENDENCY_INVALID', 'REQUIRED_EVIDENCE_OMITTED', 'FREE_CLAIM_REJECTED',
  'PRIVACY_OR_EXTERNAL_INSTRUCTION', 'EVIDENCE_OR_DEPENDENCY_REJECTED', 'SOURCE_BINDING_INVALID']);
const clone = value => JSON.parse(JSON.stringify(value));
const projectRoot = path.resolve(__dirname, '../..');
function sourceDocuments() {
  const context = { window: {} }; context.window = context;
  for (const file of ['data/official-wave1-seed.js', 'data/official-wave2-seed.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(projectRoot, file), 'utf8'), context, {
      timeout: 1000, contextCodeGeneration: { strings: false, wasm: false }
    });
  }
  return context.MinshengSourceDocuments || [];
}
function citedQa() {
  const context = { window: {} }; context.window = context;
  for (const file of ['data/official-wave1-seed.js', 'data/official-wave2-seed.js',
    'data/research-briefing-config.js', 'data/property-livelihood-case.js',
    'modules/property-livelihood-case.js', 'modules/evidence-id-selection.js',
    'modules/evidence-qa.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(projectRoot, file), 'utf8'), context, {
      timeout: 1000, contextCodeGeneration: { strings: false, wasm: false }
    });
  }
  return context.MinshengEvidenceQA;
}
function sourceFor(citation, documents) {
  const link = citation.sourceLinks?.[0];
  const document = documents.find(item => item.id === link?.documentId && item.originalUrl === link?.url);
  const isFact = ['REAL', 'DERIVED'].includes(citation.classification);
  if (isFact && (!document || document.status !== 'REAL_SOURCE' || !/^https?:\/\//.test(link.url) ||
      !document.publicationDate || !citation.period || !citation.geography || !citation.unit ||
      citation.issues?.length)) throw Error('SOURCE_BINDING_INVALID');
  return {
    evidenceId: citation.id, classification: citation.classification,
    excerpt: citation.text, sourceTitle: link?.title || null, sourceUrl: link?.url || null,
    publicationDate: document?.publicationDate || null,
    eventStart: document?.dataPeriodStart || null, eventEnd: document?.dataPeriodEnd || null,
    period: citation.period || null, geography: citation.geography || null,
    unit: citation.unit || null, value: Number.isFinite(citation.value) ? citation.value : null,
    sourceStatus: citation.sourceStatus || null
  };
}
function presentation(question, claims, inputContract) {
  const sources = inputContract.evidence;
  const sourceMap = new Map(sources.map(item => [item.evidenceId, item]));
  const facts = [], inferences = [], gaps = [];
  for (const claim of claims) {
    if (!claim.evidenceIds?.every(id => sourceMap.has(id))) throw Error('UNBOUND_CLAIM');
    if (claim.type === 'FACT') {
      const source = sourceMap.get(claim.evidenceId);
      if (!source || !['REAL', 'DERIVED'].includes(source.classification) ||
          claim.value !== source.value || claim.unit !== source.unit ||
          claim.period !== source.period || claim.geography !== source.geography) throw Error('FACT_BINDING_INVALID');
      facts.push({ text: claim.text, evidenceIds: [source.evidenceId], value: source.value,
        unit: source.unit, period: source.period, geography: source.geography, validation: 'FIELD_MATCHED_TO_APPROVED_RECORD' });
    } else if (claim.type === 'INFERENCE' || claim.type === 'ASSUMPTION') {
      inferences.push({ text: claim.text, evidenceIds: claim.evidenceIds,
        uncertainty: claim.uncertainty || 'ASSUMPTION_ONLY', humanReviewRequired: true,
        verifiedConclusion: false });
    } else if (claim.type === 'GAP') {
      gaps.push({ text: claim.text, evidenceIds: claim.evidenceIds });
    }
  }
  return { question, facts, inferences, gaps, sources, boundary: BOUNDARY,
    inputContract,
    analysisBasis: '本地已登记证据；模型式句子仅为固定模拟，未经人工审核。',
    simulation: 'OFFLINE_FIXED_MOCK', providerUsed: false, externalRequests: 0 };
}
function createOfflineEvidenceAnalysis({ fixture = 'ACCEPTED', mockResponse = null,
  sourceTextFixture = null, timeoutMs = 1000 } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw Error('OFFLINE_TIMEOUT_INVALID');
  const sandbox = createStructuredSandbox(), documents = sourceDocuments(), qa = citedQa();
  async function analyze(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).join() !== 'question' || typeof input.question !== 'string' ||
        !input.question.trim() || input.question.length > 500 || /[\x00-\x1f]/.test(input.question)) {
      return { status: 'INVALID_REQUEST', simulation: 'OFFLINE_FIXED_MOCK', providerUsed: false, externalRequests: 0 };
    }
    const question = input.question.trim();
    const base = { question, simulation: 'OFFLINE_FIXED_MOCK', providerUsed: false, externalRequests: 0,
      facts: [], inferences: [], gaps: [], sources: [], boundary: BOUNDARY };
    if (!QUESTIONS.includes(question)) return { ...base, status: 'UNSUPPORTED_QUESTION',
      notice: '问题超出当前证据分析范围；不能用相邻证据、闲聊或算术回答替代。' };
    let prepared, summary;
    try { summary = normalizeQuestion(question); prepared = await sandbox.prepare(summary); }
    catch { return { ...base, status: 'EVIDENCE_UNAVAILABLE', notice: '本地证据预检失败，未生成分析。' }; }
    const cited = qa.answer(question === QUESTIONS[4] ? '居民偿债是多少？' : question);
    if (!qa.validateAnswer(cited) ||
        (prepared.localFallback.facts.length &&
         (cited.status !== 'ANSWERED' ||
          JSON.stringify(cited.citations.map(item => item.id).sort()) !==
          JSON.stringify(prepared.localFallback.citations.map(item => item.id).sort()))))
      return { ...base, status: 'EVIDENCE_UNAVAILABLE', notice: '与确定性问答的证据选择不一致，未生成分析。' };
    if (sourceTextFixture !== null && privacyOrInstructionRisk(sourceTextFixture))
      return { ...base, status: 'SOURCE_TEXT_REJECTED', notice: '来源文本夹带外部指令，未传给模拟生成器。' };
    const citations = prepared.localFallback.citations;
    if (!citations.every(item => !item.issues?.length) ||
        citations.some(item => item.classification === 'SCENARIO' && question !== QUESTIONS[4])) {
      return { ...base, status: 'EVIDENCE_UNAVAILABLE', notice: '证据冲突或情景越界，未生成分析。' };
    }
    let inputContract;
    try { inputContract = { question, evidence: citations.map(item => sourceFor(item, documents)) }; }
    catch { return { ...base, status: 'EVIDENCE_UNAVAILABLE', notice: '来源、时间或单位绑定缺失，未生成分析。' }; }
    if (!prepared.localFallback.facts.length) {
      return { ...base, status: 'NO_EVIDENCE',
        gaps: [{ text: cited.notice, evidenceIds: cited.diagnostics.map(item => item.id) },
          ...prepared.localFallback.gaps.map(item => ({ text: item.text, evidenceIds: item.evidenceIds }))],
        notice: cited.notice + ' 不让模拟模型补造。' };
    }
    let result;
    try {
      if (fixture === 'TIMEOUT') throw Error('MOCK_TIMEOUT');
      if (fixture === 'RATE_LIMIT') throw Error('MOCK_RATE_LIMIT');
      if (fixture === 'MALFORMED') throw Error('MOCK_MALFORMED_RESPONSE');
      if (mockResponse) {
        let timer;
        const response = await Promise.race([
          Promise.resolve().then(() => mockResponse(clone(inputContract))),
          new Promise((_, reject) => { timer = setTimeout(() => reject(Error('MOCK_TIMEOUT')), timeoutMs); })
        ]).finally(() => clearTimeout(timer));
        const safety = responseSafetyReason(response, prepared.payload.approvedEvidence);
        if (safety) throw Error(safety);
        result = { status: 'HUMAN_REVIEW_REQUIRED', claims: await sandbox.validate(summary, response) };
      } else result = await sandbox.run(summary, { fixture });
      if (result.status !== 'HUMAN_REVIEW_REQUIRED') throw Error(result.reason || result.status);
      return { ...presentation(question, result.claims, inputContract),
        status: 'SIMULATED_ANALYSIS_REVIEW_REQUIRED',
        notice: '固定离线模拟响应；事实字段已与登记证据核对，推断仍需人工审核。未调用 DeepSeek。' };
    } catch (error) {
      const code = error.message === 'MOCK_TIMEOUT' ? 'MOCK_TIMEOUT'
        : error.message === 'MOCK_RATE_LIMIT' ? 'MOCK_RATE_LIMIT'
        : 'MOCK_RESPONSE_REJECTED';
      return { ...base, status: code,
        notice: code === 'MOCK_TIMEOUT' ? '模拟服务超时；本题未显示旧答案。'
          : code === 'MOCK_RATE_LIMIT' ? '模拟服务限流；本题未显示旧答案。'
          : '模拟响应未通过证据、数值或结构校验，已拒绝展示。',
        rejectionReason: code === 'MOCK_RESPONSE_REJECTED'
          ? (SAFE_REJECTIONS.has(error.message) ? error.message : 'UNCLASSIFIED_REJECTION') : undefined };
    }
  }
  return Object.freeze({ analyze, questions: QUESTIONS });
}
module.exports = { createOfflineEvidenceAnalysis, QUESTIONS, BOUNDARY, sourceFor };
