'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const context = { console, crypto: crypto.webcrypto, TextEncoder, window: {} };
context.window = context;
for (const file of ['modules/rfc4180.js', 'modules/nbs-period-normalizer.js', 'data/series-registry.js', 'modules/nbs-official-export-intake.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const must = (condition, message) => { if (!condition) throw new Error(message); };
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/v0951-nbs-synthetic.json'), 'utf8'));
const csv = rows => ['指标,地区,数据时间,数值', ...rows.map(row => row.join(','))].join('\n');

(async () => {
  const intake = context.MinshengNbsOfficialExportIntake;
  must(fixture.fixtureKind === 'TEST_FIXTURE_SYNTHETIC', 'fixture is explicitly synthetic');
  const areaContent = csv(fixture.area);
  const preview = await intake.preview({ content: areaContent, fileName: 'synthetic-area.csv', fileSize: Buffer.byteLength(areaContent) });
  const staged = intake.stage({ preview, layoutConfirmed: true });
  must(preview.detection.detectedLayout === 'LONG' && preview.sha256, 'synthetic LONG layout has a deterministic checksum');
  const area = staged.records.find(record => record.seriesId === 'CN.NBS.PROPERTY_SALES_AREA.YTD.YOY');
  must(area?.value === -11.8 && area.period === '2026-07' && area.aggregation === 'YTD', 'area field maps with YTD semantics');
  must(area.provenance.fileName === 'synthetic-area.csv' && staged.status === 'REVIEW_REQUIRED', 'preview candidate retains provenance and remains uncommitted');
  const industrialContent = csv(fixture.industrial);
  const industrial = await intake.preview({ content: industrialContent, fileName: 'synthetic-industrial.csv' });
  const industrialStage = intake.stage({ preview: industrial, layoutConfirmed: true });
  must(industrialStage.records.some(record => record.seriesId === 'CN.NBS.INDUSTRIAL_VALUE_ADDED.MONTHLY.YOY' && record.value === 4.5), 'industrial alias is recognized');
  const commit = { console, window: { MinshengSourceDocuments: [], MinshengRawPayloads: [], MinshengDataRecords: [{ id: 'record_nbs_industrial_monthly_yoy_202607' }, { id: 'record_nbs_retail_monthly_yoy_202607' }, { id: 'record_nbs_retail_ytd_yoy_202607' }] } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data/nbs-v095-manual-export-commit.js'), 'utf8'), commit, { filename: 'data/nbs-v095-manual-export-commit.js' });
  const records = commit.window.MinshengDataRecords;
  must(commit.window.MinshengSourceDocuments.length === 6 && commit.window.MinshengRawPayloads.length === 6 && records.filter(record => record.status === 'REAL').length === 3, 'committed audit metadata preserves six external sources and three non-conflicting REAL records');
  must(records.find(record => record.id === 'record_nbs_industrial_monthly_yoy_202607').supportingSourceDocumentIds?.includes('doc_nbs_export_industrial_202607'), 'same-value industrial export is retained as corroboration');
  console.log('v0.9.5.1 historical import run tests PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
