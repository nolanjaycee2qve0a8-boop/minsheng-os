'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const childProcess = require('child_process');
const listExportFiles = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  if (entry.name === '.git' || entry.name === 'node_modules') return [];
  const fullPath = path.join(directory, entry.name);
  return entry.isDirectory()
    ? listExportFiles(fullPath)
    : [path.relative(root, fullPath).split(path.sep).join('/')];
});
const tracked = fs.existsSync(path.join(root, '.git'))
  ? childProcess.execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean)
  : listExportFiles(root);
const html = tracked.filter(file => /\.html?$/.test(file));
const must = (value, message) => { if (!value) throw new Error(message); };
const oldFixtures = [
  'tests/fixtures/v014-nbs-income-2026h1.html', 'tests/fixtures/v014-pboc-financial-stats-2026h1.html',
  'tests/fixtures/v015-mof-debt-2026m06.html', 'tests/fixtures/v015-mof-fiscal-2026h1.html', 'tests/fixtures/v015-pboc-credit-2026q2.html'
];
must(oldFixtures.every(file => !tracked.includes(file)), 'former official HTML fixtures are not tracked');
const synthetic = html.filter(file => file.startsWith('tests/fixtures/synthetic/'));
must(synthetic.length === 5, 'five synthetic parser fixtures are tracked');
for (const file of synthetic) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  must(['TEST_FIXTURE_SYNTHETIC','NOT_REAL','NOT_LIVE','NOT_OFFICIAL_SOURCE','PROJECT_AUTHORED_TEST_MATERIAL'].every(marker => text.includes(marker)), `fixture declaration missing: ${file}`);
  must(!/https?:\/\//i.test(text) && !/sha-?256|checksum/i.test(text), `fixture contains source locator material: ${file}`);
  must(!/22981|3668|50\.74|15244|587706/.test(text), `fixture repeats an official production value: ${file}`);
  const paragraphs = [...text.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match => match[1].replace(/<[^>]*>/g, '').trim());
  must(paragraphs.every(paragraph => paragraph.length < 160), `fixture contains a long copied paragraph: ${file}`);
}
const allowedApplicationHtml = new Set(['index.html', 'artifacts/v032/data-gaps.html']);
const unknown = html.filter(file => !allowedApplicationHtml.has(file) && !synthetic.includes(file));
must(unknown.length === 0, `TRACKED_THIRD_PARTY_RAW_HTML: ${unknown.join(', ')}`);
must(fs.readFileSync(path.join(root, 'THIRD_PARTY_DATA_BOUNDARY.md'), 'utf8').includes('v0.14') && fs.readFileSync(path.join(root, 'THIRD_PARTY_DATA_BOUNDARY.md'), 'utf8').includes('v0.15'), 'third-party boundary documents synthetic parser fixtures');
const wave1 = fs.readFileSync(path.join(root, 'tests/v014-official-wave1-tests.js'), 'utf8');
const wave2 = fs.readFileSync(path.join(root, 'tests/v015-official-wave2-tests.js'), 'utf8');
must(wave1.includes('fixture_count') && wave1.includes('live_count') && wave1.includes('TEST_CANDIDATE'), 'Wave 1 test records fixture-only ingestion');
must(wave2.includes('published === false') && wave2.includes('fixture cannot count as LIVE'), 'Wave 2 test retains fixture/REAL/LIVE isolation');
console.log(`v0.32.2 synthetic HTML fixture tests PASS (${html.length} HTML files classified; TRACKED_THIRD_PARTY_RAW_HTML = 0)`);
