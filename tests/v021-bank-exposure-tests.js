'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { validateLocalBankSources } = require('../tools/validate_local_bank_sources.js');
const context = { window: {}, console };
context.window = context;
for (const file of ['data/bank-exposure-seed.js', 'modules/bank-exposure-evidence.js']) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
const seed = context.MinshengBankExposureSeed;
const api = context.MinshengBankExposureEvidence;
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/v021-bank-extraction-synthetic.json', 'utf8'));
const must = (value, message) => { if (!value) throw new Error(message); };

must(fixture.fixtureKind === 'TEST_FIXTURE_SYNTHETIC' && fixture.records.every(row => row.sourceClass === 'TEST_FIXTURE_SYNTHETIC'), 'fixture is explicitly synthetic');
must(!fixture.records.some(row => row.status === 'REAL' || row.sourceIdentity === 'INTERNATIONAL_OFFICIAL_DIRECT'), 'fixture is not official evidence');
must(validateLocalBankSources({ root: path.join(__dirname, '__absent_local_source__') }).status === 'LOCAL_SOURCE_VALIDATION_NOT_RUN', 'public test reports missing local sources instead of passing');
must(seed.records.length === 6, 'six core records');
const expected = { bank_icbc_2025_personal_mortgage: 5875868, bank_icbc_2025_corporate_real_estate: 864576, bank_abc_2025_personal_mortgage: 4816355, bank_abc_2025_corporate_real_estate: 874310, bank_psbc_2025_personal_mortgage: 2373341, bank_psbc_2025_corporate_real_estate: 347818 };
for (const record of seed.records) {
  must(record.value === expected[record.id], `exact 2025 value ${record.id}`);
  must(record.columnLabel.includes('2025') && record.pdfPage && record.printedPage && record.tableTitle && record.rowLabel && record.rawValueText && record.unit === 'RMB million', `complete audit metadata ${record.id}`);
  must(record.visualReviewStatus === 'VISUALLY_VERIFIED_BY_CODEX' && api.validate(record).ok, `qualified entity disclosure ${record.id}`);
}
must(seed.coverage.filter(row => row.officialChinese).every(row => row.officialChinese.relationship === 'SAME_REPORT_DIFFERENT_LANGUAGE_VERSION'), 'language relationship retained');
const state = { records: [{ id: 'domestic' }] };
api.ensure(state);
must(state.bankDisclosureRecords.length === 6, 'seed materialises in isolated bank store');
const clone = { ...seed.records[0], id: 'new_locator', pdfPage: 999, printedPage: 999, visualReviewStatus: 'PENDING' };
must(api.validate(clone).errors.includes('VISUAL_VERIFICATION_REQUIRED'), 'visual gate');
clone.visualReviewStatus = 'VISUALLY_VERIFIED_BY_CODEX';
must(api.submit(state, clone).accepted && api.submit(state, clone).duplicate, 'audited locator accepts and replays idempotently');
must(api.validate({ ...clone, exposureConcept: 'INFRASTRUCTURE_LOANS', lgfvMapping: 'LGFV' }).errors.includes('LGFV_AND_INFRASTRUCTURE_EQUIVALENCE_REJECTED'), 'infrastructure is not LGFV');
must(api.validate({ ...clone, nplUsedAsPd: true }).errors.includes('NPL_RATIO_AS_PD_REJECTED'), 'NPL is not PD');
must(!state.records.some(row => row.id !== 'domestic'), 'bank evidence never writes domestic records');
must(api.sampleSum(seed.records.filter(row => row.exposureConcept === 'PERSONAL_MORTGAGE_LOANS')).status === 'BANK_SAMPLE_ONLY_NOT_NATIONAL', 'sample is not national');
must(api.sampleSum(seed.records.filter(row => row.exposureConcept === 'CORPORATE_REAL_ESTATE_LOANS')).created === false, 'scope mismatch prevents sample sum');
must(seed.assessments.find(row => row.id === 'bank_lgfv_direct_exposure_2025').status === 'BLOCKED', 'LGFV remains blocked');
console.log('v0.21 bank exposure tests PASS');
