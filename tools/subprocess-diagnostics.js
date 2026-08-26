/* Bounded, secret-safe diagnostics for offline public-CI subprocesses. */
'use strict';

const childProcess = require('child_process');
const MAX_DIAGNOSTIC_LENGTH = 500;
const TRUNCATION_MARKER = '[TRUNCATED]';

function normalizeMaxLength(value) {
  if (value === undefined) return MAX_DIAGNOSTIC_LENGTH;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function safeString(value) {
  if (value === null || value === undefined) return '';
  try {
    return String(value);
  } catch (_error) {
    return '[UNPRINTABLE]';
  }
}

function errorMessage(value) {
  if (!value || typeof value !== 'object') return safeString(value);
  try {
    return safeString(value.message);
  } catch (_error) {
    return '[UNPRINTABLE_ERROR]';
  }
}

function redactDiagnostic(value, maxLength = MAX_DIAGNOSTIC_LENGTH) {
  const limit = normalizeMaxLength(maxLength);
  const normalized = safeString(value)
    .replace(/github_pat_[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]+/gi, '[REDACTED]')
    .replace(/Authorization\s*:\s*[^\r\n]+/gi, 'Authorization: [REDACTED]')
    .replace(/Bearer\s+[^\s'"`]+/gi, 'Bearer [REDACTED]')
    .replace(/:\/\/[^\s/@:]+:[^\s/@]+@/g, '://[REDACTED]@')
    .replace(/([?&](?:access_token|api[_-]?key|authorization|token)=)[^&#\s]+/gi, '$1[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= limit) return normalized;
  if (limit === 0) return '';
  if (limit <= TRUNCATION_MARKER.length) return TRUNCATION_MARKER.slice(0, limit);
  return `${normalized.slice(0, limit - TRUNCATION_MARKER.length - 1)} ${TRUNCATION_MARKER}`;
}

function failureState(result) {
  if (result.signal) return `signal ${result.signal}`;
  if (Number.isInteger(result.status)) return `exit status ${result.status}`;
  return 'spawn failure';
}

function subprocessFailure(file, args, result, maxLength = MAX_DIAGNOSTIC_LENGTH) {
  const limit = normalizeMaxLength(maxLength);
  const safeResult = result && typeof result === 'object' ? result : {};
  const command = String(file).split(/[\\/]/).pop() || 'subprocess';
  const prefix = `${command} failed with ${failureState(safeResult)}`;
  if (prefix.length >= limit) return new Error(prefix.slice(0, limit));
  const details = redactDiagnostic([
    errorMessage(safeResult.error),
    safeResult.stdout,
    safeResult.stderr
  ].filter(Boolean).join('\n'), limit - prefix.length - 2);
  return new Error(`${prefix}${details ? `: ${details}` : ''}`.slice(0, limit));
}

function runSubprocess({ cwd, file, args = [], env = process.env, spawnSync = childProcess.spawnSync }) {
  let result;
  try {
    result = spawnSync(file, args, { cwd, encoding: 'utf8', env });
  } catch (error) {
    throw subprocessFailure(file, args, { error: { message: errorMessage(error) }, status: null, signal: null, stdout: '', stderr: '' });
  }
  if (!result || typeof result !== 'object') throw subprocessFailure(file, args, { error: { message: 'INVALID_SPAWN_RESULT' }, status: null, signal: null, stdout: '', stderr: '' });
  if (result.error || result.status !== 0) throw subprocessFailure(file, args, result);
  return String(result.stdout || '');
}

module.exports = { MAX_DIAGNOSTIC_LENGTH, TRUNCATION_MARKER, errorMessage, normalizeMaxLength, redactDiagnostic, runSubprocess, subprocessFailure };
