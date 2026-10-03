'use strict';

// This is the only allowed external destination for the approved evidence
// transfer. Do not make this URL configurable from a browser request.
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';
const MAX_EVIDENCE_CHARS = 12000;
const MAX_RESPONSE_BYTES = 32768;
const REQUEST_TIMEOUT_MS = 8000;

function configString(env, name, fallback) {
  const value = env[name];
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(value)) throw new Error('INVALID_PROVIDER_CONFIGURATION');
  return value;
}
function cleanJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}
async function textAtMost(response, maximum) {
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > maximum) throw new Error('PROVIDER_RESPONSE_TOO_LARGE');
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maximum) throw new Error('PROVIDER_RESPONSE_TOO_LARGE');
    return text;
  }
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maximum) throw new Error('PROVIDER_RESPONSE_TOO_LARGE');
      chunks.push(next.value);
    }
  } finally { reader.releaseLock?.(); }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
}
function approvedEvidence(statements) {
  if (!Array.isArray(statements) || !statements.length || statements.length > 8) throw new Error('PROVIDER_INPUT_INVALID');
  const ids = new Set(); let size = 0;
  const evidence = statements.map(({ id, text }) => {
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || ids.has(id) || typeof text !== 'string') throw new Error('PROVIDER_INPUT_INVALID');
    ids.add(id); size += text.length;
    return { id, text };
  });
  if (size > MAX_EVIDENCE_CHARS) throw new Error('PROVIDER_INPUT_INVALID');
  return evidence;
}

function createProvider({ env = process.env, fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  // The key is retained only in this closure. It is never returned, logged,
  // embedded in a browser response, or included in the request body.
  const apiKey = env.DEEPSEEK_API_KEY;
  if (typeof apiKey !== 'string' || !apiKey.trim()) return Object.freeze({ available: false,
    async select() { throw new Error('EXTERNAL_PROVIDER_NOT_CONFIGURED'); }
  });
  const model = configString(env, 'DEEPSEEK_MODEL', DEFAULT_MODEL);
  if (typeof fetchImpl !== 'function') throw new Error('PROVIDER_FETCH_UNAVAILABLE');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error('INVALID_PROVIDER_CONFIGURATION');
  return Object.freeze({ available: true,
    async select(statements) {
      let timer = null;
      try {
      const evidence = approvedEvidence(statements), controller = new AbortController();
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const body = JSON.stringify({
        model, temperature: 0, max_tokens: 160, stream: false,
        messages: [
          { role: 'system', content: 'Select 1 to 8 evidence IDs from the supplied approved list. Return JSON only: {"ids":["id"]}. Do not write prose, calculations, advice, predictions, or use outside knowledge.' },
          { role: 'user', content: JSON.stringify({ approvedEvidence: evidence }) }
        ]
      });
        const response = await fetchImpl(DEEPSEEK_ENDPOINT, {
          method: 'POST', redirect: 'error', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${apiKey}` }, body
        });
        if (!response || !response.ok) throw new Error('PROVIDER_HTTP_FAILED');
        const payload = cleanJson(await textAtMost(response, MAX_RESPONSE_BYTES));
        const content = payload?.choices?.[0]?.message?.content;
        const selected = cleanJson(typeof content === 'string' ? content : '');
        const allowedIds = new Set(evidence.map(item => item.id));
        if (!Array.isArray(selected?.ids) || !selected.ids.length || selected.ids.length > 8 ||
            new Set(selected.ids).size !== selected.ids.length || selected.ids.some(id => typeof id !== 'string' || !allowedIds.has(id))) throw new Error('PROVIDER_RESPONSE_INVALID');
        return selected.ids;
      } catch (_) {
        // Do not expose provider body, request content, endpoint credentials, or errors.
        throw new Error('PROVIDER_FAILED');
      } finally { if (timer !== null) clearTimeout(timer); }
    }
  });
}
module.exports = { createProvider, DEEPSEEK_ENDPOINT, DEFAULT_MODEL };
