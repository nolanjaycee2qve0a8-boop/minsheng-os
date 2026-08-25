'use strict';

const fs = require('fs');
const vm = require('vm');
const context = { console, window: {} };
context.window = context;
const load = file => vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
[
  'data/indicators.js', 'data/data-records.js', 'data/international-statistics-seed.js',
  'data/international-comparison-pack-seed.js', 'modules/international-comparison-pack.js'
].forEach(load);

const api = context.MinshengInternationalComparisonPack;
const must = (value, message) => { if (!value) throw new Error(message); };
const near = (a, b, tolerance = 1e-10) => Math.abs(a - b) <= tolerance;
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/v020-world-bank-synthetic.json', 'utf8'));
must(fixture.fixtureKind === 'TEST_FIXTURE_SYNTHETIC', 'fixture is explicitly synthetic');

const countries = [
  ['CHN', 'Synthetic China'], ['USA', 'Synthetic United States'], ['JPN', 'Synthetic Japan'],
  ['KOR', 'Synthetic Korea'], ['DEU', 'Synthetic Germany']
];
const rows = [];
for (const indicator of fixture.indicators) {
  for (const [countryiso3code, countryName] of countries) {
    for (const year of fixture.years) {
      const index = rows.length;
      rows.push({
        indicator: { id: indicator.id, value: indicator.name }, country: { value: countryName }, countryiso3code,
        date: String(year), value: index < fixture.nullObservationCount ? null : Number((index + 1) / 10), obs_status: ''
      });
    }
  }
}
const payload = [{ lastupdated: 'SYNTHETIC_TEST_FIXTURE' }, rows];
const state = {
  records: context.MinshengDataRecords, internationalObservationRecords: [], internationalConcepts: [],
  internationalCoverageGaps: [], internationalComparisonAssessments: [], internationalDerivedTransformations: []
};
const syntheticContext = { artifactId: 'TEST_FIXTURE_SYNTHETIC', rawSha256: 'SYNTHETIC_NOT_LIVE', fixtureKind: fixture.fixtureKind };
const materialized = api.materializeWorldBank(payload, syntheticContext);
must(materialized.length === 160, 'synthetic 160-record reconciliation');
must(materialized.filter(row => row.value === null && row.observationStatus === 'UNKNOWN_STATUS').length === 26, 'synthetic nulls stay unknown');
const run = api.submitWorldBank(state, payload, syntheticContext);
must(run.parsed === 160 && run.submitted === 160, 'synthetic submission reconciliation');
const fixtureRecords = state.internationalObservationRecords.filter(row => row.fixtureKind === 'TEST_FIXTURE_SYNTHETIC');
must(fixtureRecords.length === 160 && fixtureRecords.every(row => row.status === 'MOCK'), 'fixture cannot become REAL');
must(!fixtureRecords.some(row => row.status === 'REAL' || row.sourceIdentity === 'INTERNATIONAL_OFFICIAL_DIRECT'), 'fixture never enters LIVE acquisition');
must(api.submitWorldBank(state, payload, syntheticContext).duplicates === 160, 'idempotent synthetic replay');
must(new Set(materialized.map(row => row.id)).size === 160, 'stable keys');

const quarterly = [{ period: '2024-Q1', value: 100 }, { period: '2024-Q2', value: 101 }, { period: '2024-Q3', value: 102 }, { period: '2024-Q4', value: 103 }, { period: '2025-Q1', value: 110 }];
const yoy = api.deriveYoY(quarterly, { frequency: 'QUARTERLY' });
must(yoy.output.length === 1 && near(yoy.output[0].value, 10), 'quarterly YoY uses exact lag four');
must(api.deriveYoY([{ period: '2024-Q1', value: 100 }, { period: '2025-Q2', value: 110 }], { frequency: 'QUARTERLY' }).output.length === 0, 'no nearby substitution');
must(api.deriveYoY([{ period: '2024', value: 100 }, { period: '2025', value: 110 }], { frequency: 'ANNUAL' }).output.length === 1, 'annual lag one');
must(api.deriveYoY([{ period: '2024-01', value: 100 }, { period: '2025-01', value: 110 }], { frequency: 'MONTHLY' }).output.length === 1, 'monthly lag twelve');
must(api.rebase(quarterly, 'missing').status === 'BLOCKED', 'missing base blocked');
const left = { conceptId: 'X', dataNature: 'INDEX', indexBase: '2010=100', originalIndicatorName: 'x' };
must(api.assess(left, { ...left, indexBase: '2015=100' }).status === 'TREND_ONLY', 'base prevents level comparison');
must(api.assess({ conceptId: 'a' }, { conceptId: 'b' }).status === 'NOT_COMPARABLE', 'semantic mismatch');
must(!state.records.some(row => String(row.id).includes('intl_')), 'domestic records isolated');
console.log('v0.20 international comparison tests PASS');
