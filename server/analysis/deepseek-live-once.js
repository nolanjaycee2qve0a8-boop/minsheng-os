'use strict';
// No route, key store, retry, or implicit authorization. A caller must supply
// an explicitly granted persistent ledger and an in-memory credential provider.
const { createSimulatedGate, FIRST_QUESTION, LIMITS, MODEL } = require('./deepseek-live-preflight');
const { questionDigest, INPUT_TOKEN_RESERVE } = require('./deepseek-budget-ledger');

async function sendOnce(request, { credentialProvider, fetchImpl = globalThis.fetch, onAttempt = () => {},
  timeoutMs = LIMITS.timeoutMs } = {}) {
  if (typeof credentialProvider !== 'function' || typeof fetchImpl !== 'function')
    throw Error('TRANSPORT_NOT_CONFIGURED');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > LIMITS.timeoutMs)
    throw Error('TIMEOUT_POLICY_INVALID');
  let secret, timer, timedOut = false;
  const controller = new AbortController();
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { timedOut = true; controller.abort();
      reject(Error('TIMEOUT_OUTCOME_UNKNOWN')); }, timeoutMs);
  });
  try {
    const pendingCredential = Promise.resolve().then(() => credentialProvider());
    pendingCredential.then(value => {
      if (timedOut && Buffer.isBuffer(value)) value.fill(0);
    }, () => {});
    secret = await Promise.race([pendingCredential, deadline]);
    if (!Buffer.isBuffer(secret) || secret.length < 20 || secret.length > 256 ||
        !Buffer.from(secret.toString('utf8')).equals(secret) ||
        !/^sk-[\x21-\x7e]+$/.test(secret.toString('utf8')))
      throw Error('CREDENTIAL_UNAVAILABLE');
    const body = JSON.stringify(request.body);
    if (Buffer.byteLength(body, 'utf8') > LIMITS.inputBytes) throw Error('INPUT_LIMIT_EXCEEDED');
    const operation = (async () => {
      onAttempt();
      const response = await fetchImpl(request.endpoint, { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secret.toString('utf8') },
        body, signal: controller.signal, redirect: 'error', cache: 'no-store' });
      if (!response || !Number.isInteger(response.status)) throw Error('NETWORK_OUTCOME_UNKNOWN');
      if (response.status !== 200) return { status: response.status, body: null };
      if (!/^application\/json(?:\s*;|$)/i.test(response.headers?.get?.('content-type') || ''))
        throw Error('MALFORMED_RESPONSE');
      const reader = response.body?.getReader?.();
      if (!reader) throw Error('MALFORMED_RESPONSE');
      const chunks = []; let bytes = 0;
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > LIMITS.responseBytes) { controller.abort(); throw Error('RESPONSE_LIMIT_EXCEEDED'); }
        chunks.push(Buffer.from(part.value));
      }
      let parsed;
      try { parsed = JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')); }
      catch { throw Error('MALFORMED_RESPONSE'); }
      return { status: 200, body: parsed };
    })();
    return await Promise.race([operation, deadline]);
  } catch (error) {
    if (timedOut) throw Error('TIMEOUT_OUTCOME_UNKNOWN');
    if (['CREDENTIAL_UNAVAILABLE','INPUT_LIMIT_EXCEEDED','MALFORMED_RESPONSE',
      'RESPONSE_LIMIT_EXCEEDED'].includes(error.message)) throw Error(error.message);
    throw Error('NETWORK_OUTCOME_UNKNOWN');
  } finally {
    clearTimeout(timer);
    if (Buffer.isBuffer(secret)) secret.fill(0);
  }
}

function createLiveGate({ ledger, credentialProvider, fetchImpl = globalThis.fetch,
  mode = 'SIMULATED', enabled = false, clock = () => new Date().toISOString(),
  timeoutMs = LIMITS.timeoutMs } = {}) {
  if (!ledger || typeof ledger.reserve !== 'function') throw Error('LEDGER_REQUIRED');
  if (!['SIMULATED','REAL'].includes(mode) || (mode === 'REAL' && fetchImpl !== globalThis.fetch))
    throw Error('TRANSPORT_MODE_INVALID');
  let failure = null, reservation = null, sent = false, pending = false;
  const checked = createSimulatedGate({ enabled, clock, timeoutMs,
    send: async request => {
      let reserved;
      try { reserved = ledger.reserve({ requestBytes: Buffer.byteLength(JSON.stringify(request.body), 'utf8') }); }
      catch (error) { failure = /^((LEDGER|PRICE|DAILY|ONE_CALL|INPUT|DUPLICATE)_)/.test(error.message)
        ? error.message : 'LEDGER_REJECTED'; throw Error(failure); }
      reservation = reserved;
      try { return await sendOnce(request, { credentialProvider, fetchImpl,
        onAttempt: () => { sent = true; },
        timeoutMs: Math.max(1, timeoutMs - 10) }); }
      catch (error) { failure = error.message; throw Error(failure); }
    } });
  async function analyze({ question } = {}) {
    if (pending) return { question, status: 'DUPLICATE_SUBMISSION', transport: 'NONE',
      providerUsed: false, externalRequests: 0, facts: [], inferences: [], gaps: [], sources: [] };
    pending = true;
    failure = null; reservation = null; sent = false;
    let result;
    try { result = await checked.analyze({ question }); }
    finally { pending = false; }
    const base = { ...result, model: MODEL, questionDigest,
      transport: mode === 'REAL' && sent ? 'REAL_API' : 'SIMULATED_TRANSPORT',
      providerUsed: mode === 'REAL' && sent, externalRequests: mode === 'REAL' && sent ? 1 : 0,
      reservation: reservation && { day: reservation.day, reservedMicroUsd: reservation.microUsd },
      simulation: mode === 'REAL' ? null : 'SIMULATED_HTTP_ONLY' };
    if (failure) return { ...base, status: failure, validationStatus: 'NOT_VALIDATED',
      facts: [], inferences: [], gaps: [], sources: [],
      notice: '本次调用失败或结果不明；额度已保留，不自动重试，也不展示旧答案。' };
    if (reservation && result.status === 'TIMEOUT') return { ...base,
      status: 'TIMEOUT_OUTCOME_UNKNOWN', validationStatus: 'NOT_VALIDATED',
      facts: [], inferences: [], gaps: [], sources: [],
      notice: '请求超时，服务端结果不明；额度不返还，不自动重试。' };
    if (reservation && result.status === 'SIMULATED_TRANSPORT_VALIDATED' &&
        result.usage.inputTokens > INPUT_TOKEN_RESERVE) {
      try { ledger.flagOverage({ reservationId: reservation.id,
        inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens }); }
      catch { return { ...base, status: 'LEDGER_OVERAGE_RECORD_FAILED', validationStatus: 'NOT_VALIDATED',
        facts: [], inferences: [], gaps: [], sources: [] }; }
      return { ...base, status: 'BUDGET_ACCOUNTING_EXCEEDED', validationStatus: 'NOT_VALIDATED',
        facts: [], inferences: [], gaps: [], sources: [],
        notice: '实际 token 用量超过预留上界；后续调用已锁定等待人工核对。' };
    }
    if (result.status !== 'SIMULATED_TRANSPORT_VALIDATED')
      return { ...base, facts: [], inferences: [], gaps: [], sources: [] };
    return { ...base, status: mode === 'REAL' ? 'REAL_API_VALIDATED' : 'SIMULATED_GATE_VALIDATED',
      notice: mode === 'REAL' ? '真实接口响应已通过既有证据校验；推断仍须人工审核。'
        : '模拟传输已通过校验；未向 DeepSeek 发送请求。' };
  }
  return Object.freeze({ analyze });
}

// Hidden TTY input; never reads environment variables, CLI arguments or files.
// Called only by a future explicitly approved local launcher, not in this turn.
async function readCredentialFromTty({ input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function')
    throw Error('INTERACTIVE_TTY_REQUIRED');
  output.write('DeepSeek API key (hidden; Enter to finish): ');
  const bytes = [];
  input.setRawMode(true); input.resume();
  try {
    return await new Promise((resolve, reject) => {
      const onData = chunk => {
        for (const byte of chunk) {
          if (byte === 3) { cleanup(); reject(Error('CREDENTIAL_CANCELLED')); return; }
          if (byte === 13 || byte === 10) {
            cleanup(); output.write('\n'); resolve(Buffer.from(bytes)); return;
          }
          if (byte === 8 || byte === 127) bytes.pop();
          else if (byte >= 33 && byte <= 126 && bytes.length < 256) bytes.push(byte);
        }
      };
      const cleanup = () => input.off('data', onData);
      input.on('data', onData);
    });
  } finally { input.setRawMode(false); input.pause(); }
}
module.exports = { sendOnce, createLiveGate, readCredentialFromTty };
