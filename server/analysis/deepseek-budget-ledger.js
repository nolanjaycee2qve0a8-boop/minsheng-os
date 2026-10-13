'use strict';
// Append-only, fsync-before-send journal. A left-behind lock or partial record
// is deliberately not repaired automatically: either condition denies sending.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { MODEL, FIRST_QUESTION, LIMITS } = require('./deepseek-live-preflight');

const INPUT_TOKEN_RESERVE = 8192; // includes conservative framing margin over the 6000-byte body cap
const OUTPUT_TOKEN_RESERVE = LIMITS.outputTokens;
const digest = value => createHash('sha256').update(value).digest('hex');
const questionDigest = digest(FIRST_QUESTION);
function beijingDay(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw Error('CLOCK_INVALID');
  return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
function integer(value, min = 0) { return Number.isSafeInteger(value) && value >= min; }
function policyValid(p) {
  return p && p.version === 1 && p.model === MODEL && integer(p.dailyCalls, 1) &&
    integer(p.dailyMicroUsd, 1) && p.dailyCalls <= 100 &&
    p.price && p.price.model === MODEL &&
    integer(p.price.inputPerMillionMicroUsd, 1) && integer(p.price.outputPerMillionMicroUsd, 1) &&
    Number.isFinite(Date.parse(p.price.confirmedAt)) && Number.isFinite(Date.parse(p.price.expiresAt)) &&
    Date.parse(p.price.expiresAt) > Date.parse(p.price.confirmedAt);
}
function reserveMicroUsd(price) {
  if (!price || !integer(price.inputPerMillionMicroUsd, 1) ||
      !integer(price.outputPerMillionMicroUsd, 1)) throw Error('PRICE_UNKNOWN');
  return Math.ceil((INPUT_TOKEN_RESERVE * price.inputPerMillionMicroUsd +
    OUTPUT_TOKEN_RESERVE * price.outputPerMillionMicroUsd) / 1000000);
}
function createLedger({ directory, now = () => new Date(), authorizationDigest = questionDigest }) {
  if (!path.isAbsolute(directory || '')) throw Error('LEDGER_ABSOLUTE_PATH_REQUIRED');
  if (!/^[a-f0-9]{64}$/.test(authorizationDigest || '')) throw Error('AUTHORIZATION_DIGEST_INVALID');
  const journal = path.join(directory, 'deepseek-budget-v1.jsonl');
  const lock = path.join(directory, 'deepseek-budget-v1.lock');
  function locked(work) {
    if (!fs.existsSync(directory)) throw Error('LEDGER_MISSING');
    try { fs.mkdirSync(lock); } catch { throw Error('LEDGER_LOCKED'); }
    try { return work(); } finally { fs.rmdirSync(lock); }
  }
  function entries() {
    let raw;
    try { raw = fs.readFileSync(journal, 'utf8'); } catch { throw Error('LEDGER_MISSING'); }
    if (!raw.endsWith('\n')) throw Error('LEDGER_CORRUPT');
    const lines = raw.trimEnd().split('\n');
    let previous = 'GENESIS';
    const rows = lines.map(line => {
      let row;
      try { row = JSON.parse(line); } catch { throw Error('LEDGER_CORRUPT'); }
      const { hash, ...rest } = row;
      if (row.prev !== previous || hash !== digest(JSON.stringify(rest))) throw Error('LEDGER_CORRUPT');
      previous = hash;
      return row;
    });
    if (!rows.length || rows[0].kind !== 'POLICY' || !policyValid(rows[0].policy) ||
        rows.slice(1).some(row => !['GRANT','RESERVE','OVERAGE'].includes(row.kind))) throw Error('LEDGER_CORRUPT');
    const grants = new Map(), reservations = new Set();
    for (const row of rows.slice(1)) {
      if (row.kind === 'GRANT') {
        if (!row.id || grants.has(row.id) || !/^[a-f0-9]{64}$/.test(row.questionDigest || '') ||
            !Number.isFinite(Date.parse(row.expiresAt))) throw Error('LEDGER_CORRUPT');
        grants.set(row.id, row);
      } else if (row.kind === 'RESERVE') {
        if (!row.id || reservations.has(row.id) || !grants.has(row.grantId) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(row.day) || !integer(row.microUsd, 1) ||
            row.questionDigest !== grants.get(row.grantId).questionDigest) throw Error('LEDGER_CORRUPT');
        reservations.add(row.id);
      } else if (!reservations.has(row.reservationId) || !integer(row.inputTokens, 1) ||
          !integer(row.outputTokens, 0)) throw Error('LEDGER_CORRUPT');
    }
    const spent = new Set(rows.filter(row => row.kind === 'RESERVE').map(row => row.grantId));
    if (spent.size !== reservations.size) throw Error('LEDGER_CORRUPT');
    return { rows, grants, spent };
  }
  function append(rows, payload) {
    const rest = { ...payload, prev: rows.at(-1).hash };
    const line = JSON.stringify({ ...rest, hash: digest(JSON.stringify(rest)) }) + '\n';
    const fd = fs.openSync(journal, 'a');
    try { fs.writeSync(fd, line); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  }
  function initialize(policy) {
    if (!policyValid(policy)) throw Error('POLICY_INVALID');
    fs.mkdirSync(directory, { recursive: true });
    return locked(() => {
      const rest = { kind: 'POLICY', policy, prev: 'GENESIS' };
      const fd = fs.openSync(journal, 'wx', 0o600);
      try { fs.writeSync(fd, JSON.stringify({ ...rest, hash: digest(JSON.stringify(rest)) }) + '\n');
        fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    });
  }
  function grantOne({ id = randomUUID(), expiresAt }) {
    return locked(() => {
      const state = entries();
      if (!id || state.grants.has(id) || !Number.isFinite(Date.parse(expiresAt)) ||
          Date.parse(expiresAt) <= now().getTime()) throw Error('GRANT_INVALID');
      append(state.rows, { kind: 'GRANT', id, questionDigest: authorizationDigest, expiresAt });
      return id;
    });
  }
  function reserve({ id = randomUUID(), requestBytes }) {
    return locked(() => {
      const state = entries(), policy = state.rows[0].policy, at = now();
      if (state.rows.some(row => row.kind === 'OVERAGE')) throw Error('LEDGER_OVERAGE_REVIEW_REQUIRED');
      if (!integer(requestBytes, 1) || requestBytes > LIMITS.inputBytes) throw Error('INPUT_LIMIT_EXCEEDED');
      if (at.getTime() < Date.parse(policy.price.confirmedAt) ||
          at.getTime() >= Date.parse(policy.price.expiresAt)) throw Error('PRICE_UNKNOWN');
      const microUsd = reserveMicroUsd(policy.price), day = beijingDay(at);
      const today = state.rows.filter(row => row.kind === 'RESERVE' && row.day === day);
      if (today.length >= policy.dailyCalls ||
          today.reduce((n, row) => n + row.microUsd, 0) + microUsd > policy.dailyMicroUsd)
        throw Error('DAILY_BUDGET_EXHAUSTED');
      const grant = [...state.grants.values()].find(row => !state.spent.has(row.id) &&
        row.questionDigest === authorizationDigest && Date.parse(row.expiresAt) > at.getTime());
      if (!grant) throw Error('ONE_CALL_AUTHORIZATION_MISSING');
      if (state.rows.some(row => row.id === id)) throw Error('DUPLICATE_REQUEST');
      append(state.rows, { kind: 'RESERVE', id, grantId: grant.id, day, microUsd,
        questionDigest: authorizationDigest, at: at.toISOString() });
      return { id, day, microUsd, grantId: grant.id };
    });
  }
  function inspect() { return locked(() => entries()); }
  function flagOverage({ reservationId, inputTokens, outputTokens }) {
    return locked(() => {
      const state = entries();
      if (!state.rows.some(row => row.kind === 'RESERVE' && row.id === reservationId) ||
          !integer(inputTokens, 1) || !integer(outputTokens)) throw Error('OVERAGE_INVALID');
      append(state.rows, { kind: 'OVERAGE', reservationId, inputTokens, outputTokens });
    });
  }
  return Object.freeze({ initialize, grantOne, reserve, flagOverage, inspect, journal, authorizationDigest });
}
module.exports = { createLedger, beijingDay, reserveMicroUsd, INPUT_TOKEN_RESERVE,
  OUTPUT_TOKEN_RESERVE, questionDigest };
