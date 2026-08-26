/* Bounded, secret-safe diagnostics for offline public-CI subprocesses. */
'use strict';

const childProcess = require('child_process');
const MAX_DIAGNOSTIC_LENGTH = 500;

function redactDiagnostic(value, maxLength = MAX_DIAGNOSTIC_LENGTH) {
  const normalized = String(value || '')
    .replace(/github_pat_[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]+/gi, '[REDACTED]')
    .replace(/Authorization\s*:\s*[^\r\n]+/gi, 'Authorization: [REDACTED]')
    .replace(/Bearer\s+[^\s'"`]+/gi, 'Bearer [REDACTED]')
    .replace(/:\/\/[^\s/@:]+:[^\s/@]+@/g, '://[REDACTED]@')
    .replace(/([?&](?:access_token|api[_-]?key|authorization|token)=)[^&#\s]+/gi, '$1[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)} [TRUNCATED]` : normalized;
}

function failureState(result) {
  if (result.signal) return `signal ${result.signal}`;
  if (Number.isInteger(result.status)) return `exit status ${result.status}`;
  return 'spawn failure';
}

function subprocessFailure(file, args, result) {
  const details = redactDiagnostic([
    result.error && result.error.message,
    result.stdout,
    result.stderr
  ].filter(Boolean).join('\n'));
  const command = String(file).split(/[\\/]/).pop() || 'subprocess';
  return new Error(`${command} failed with ${failureState(result)}${details ? `: ${details}` : ''}`);
}

function runSubprocess({ cwd, file, args = [], env = process.env, spawnSync = childProcess.spawnSync }) {
  const result = spawnSync(file, args, { cwd, encoding: 'utf8', env });
  if (result.error || result.status !== 0) throw subprocessFailure(file, args, result);
  return String(result.stdout || '');
}

module.exports = { MAX_DIAGNOSTIC_LENGTH, redactDiagnostic, runSubprocess, subprocessFailure };
