'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const expected = {
  icbc_2025_annual_report_en: '149A2194A7B3A3F6C4EF0C0872DAA765E2D2BD35BDC51F1318F47EA7AAB25215',
  abc_2025_annual_report: '92E8FCCF530422A615C4563EB8845661F995C932B0B132044BE1871BD7DD6F02',
  psbc_2025_annual_report_en: 'D437FAF974AC5D89D1BA3715210ACD65497484B34675BA5A3283883FE6B6F412'
};

function validateLocalBankSources({ root = process.cwd() } = {}) {
  const sourceDirectory = path.join(root, 'sources', 'official-v021', 'raw');
  const missing = Object.keys(expected).filter(name => !fs.existsSync(path.join(sourceDirectory, `${name}.pdf`)));
  if (missing.length) return { status: 'LOCAL_SOURCE_VALIDATION_NOT_RUN', checked: 0, missing };
  const mismatches = Object.entries(expected).filter(([name, sha256]) => {
    const file = path.join(sourceDirectory, `${name}.pdf`);
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase() !== sha256;
  }).map(([name]) => name);
  return mismatches.length
    ? { status: 'LOCAL_SOURCE_VALIDATION_FAILED', checked: Object.keys(expected).length, mismatches }
    : { status: 'LOCAL_SOURCE_VALIDATION_PASSED', checked: Object.keys(expected).length };
}

if (require.main === module) {
  const result = validateLocalBankSources();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === 'LOCAL_SOURCE_VALIDATION_FAILED' ? 1 : 0;
}

module.exports = { expected, validateLocalBankSources };
