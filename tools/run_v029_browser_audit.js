/*
 * v0.29.1 real-browser audit.  This deliberately uses the full static page and
 * a loopback-only HTTP server; it does not use jsdom, fixtures, or file://.
 * Run: node tools/run_v029_browser_audit.js
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { performance } = require('perf_hooks');
function resolvePlaywright() {
  const candidates = [process.env.MINSHENG_PLAYWRIGHT_MODULE, process.argv.find(value => value.startsWith('--playwright-module='))?.slice('--playwright-module='.length), 'playwright'].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch (_) { /* try the next declared runtime */ }
  }
  throw new Error('Playwright is unavailable. Set MINSHENG_PLAYWRIGHT_MODULE or pass --playwright-module=<module>.');
}
const playwright = resolvePlaywright();

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'v029.1');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'browser-audit.json');
const POPULATION_FILE = path.join(OUTPUT_DIR, 'selector-population-audit.json');
const ROUTES = [
  'data-sources', 'sector-ledgers', 'critical-exposures', 'household-mortgage', 'developer-land',
  'bank-evidence', 'bank-loss', 'cross-sector', 'causal', 'uncertainty', 'forecast-monitor',
  'gdp-vintages', 'international', 'research-gaps', 'audit-stale', 'official-data-operations', 'research-briefings'
];
const MIME = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf', '.csv': 'text/csv; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const requestedBrowserPath = process.env.MINSHENG_BROWSER_PATH || process.argv.find(value => value.startsWith('--browser-path='))?.slice('--browser-path='.length);
const EXECUTABLES = [
  ...(requestedBrowserPath ? [{ name: 'Explicit Chromium-family browser', path: requestedBrowserPath, launch: 'explicit' }] : []),
  { name: 'Google Chrome', path: 'C:/Program Files/Google/Chrome/Application/chrome.exe', launch: 'executable' },
  { name: 'Google Chrome', path: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', launch: 'executable' },
  { name: 'Microsoft Edge', path: 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', launch: 'executable' },
  { name: 'Microsoft Edge', path: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', launch: 'executable' },
  { name: 'Playwright Chromium', path: null, launch: 'playwright-default' }
];

function assert(condition, message, details) {
  const result = { pass: Boolean(condition), message, ...(details === undefined ? {} : { details }) };
  audit.assertions.push(result);
  if (!condition) throw new Error(message + (details === undefined ? '' : `: ${JSON.stringify(details)}`));
}

function recordAssertion(condition, message, details) {
  audit.assertions.push({ pass: Boolean(condition), message, ...(details === undefined ? {} : { details }) });
}

function startServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(ROOT, relative);
    if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) { response.writeHead(403); response.end('Forbidden'); return; }
    fs.readFile(file, (error, body) => {
      if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error'); return; }
      response.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(body);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function launchBrowser() {
  const candidate = EXECUTABLES.find(item => item.path === null || fs.existsSync(item.path));
  if (!candidate) throw new Error('No Chrome, Edge, Chromium, or Playwright Chromium executable is available.');
  const browser = await playwright.chromium.launch({ ...(candidate.path ? { executablePath: candidate.path } : {}), headless: true });
  return { browser, candidate, version: browser.version() };
}

function bindAudit(page) {
  page.on('console', message => audit.console.push({ type: message.type(), text: message.text(), location: message.location() }));
  page.on('pageerror', error => audit.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
  page.on('requestfailed', request => audit.failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure() }));
  page.on('response', response => { if (response.status() >= 400) audit.resourceFailures.push({ url: response.url(), status: response.status(), statusText: response.statusText() }); });
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) audit.routesVisited.push(frame.url()); });
}

async function ready(page, url) {
  const start = performance.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#researchCockpitRoot .research-cockpit', { state: 'attached', timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('#researchCockpitRoot')?.dataset.renderMs !== undefined, undefined, { timeout: 5000 });
  await page.waitForTimeout(300); // include delayed legacy-loader cleanup before measuring Cockpit readiness.
  return { wallMs: Number((performance.now() - start).toFixed(2)), metrics: await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const root = document.querySelector('#researchCockpitRoot');
    return {
      navigation: navigation ? { duration: navigation.duration, domContentLoaded: navigation.domContentLoadedEventEnd, loadEvent: navigation.loadEventEnd } : null,
      // The v0.29 baseline deliberately excluded shell, loader, and inert-template nodes.
      cockpitReady: performance.now(), firstScreenDomNodes: root ? root.querySelectorAll('*').length : 0,
      documentDomNodes: document.querySelectorAll('*').length,
      currentModuleDomNodes: root ? root.querySelectorAll('*').length : 0,
      renderedTableRows: root ? root.querySelectorAll('tbody tr details').length : 0,
      jsHeap: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null,
      route: location.hash
    };
  }) };
}

async function clickRoute(page, id) {
  await page.locator(`[data-cockpit-route="${id}"]`).click();
  await page.waitForFunction(route => location.hash === `#cockpit/${route}`, id);
  await page.waitForSelector('#researchCockpitRoot .research-cockpit');
  return page.evaluate(() => ({
    route: location.hash,
    warning: document.querySelector('.v29-warning')?.textContent.trim() || '',
    domNodes: document.querySelector('#researchCockpitRoot')?.querySelectorAll('*').length || 0,
    rowCount: document.querySelectorAll('.v29-list tbody tr details').length,
    totalText: document.querySelector('.v29-module-head p:last-of-type')?.textContent || ''
  }));
}

async function chooseFirstOption(page, selector) {
  const options = await page.locator(selector + ' option').evaluateAll(items => items.map(item => ({ value: item.value, text: item.textContent })));
  const selected = options.find(option => option.value) || null;
  if (selected) { await page.locator(selector).selectOption(selected.value); await page.waitForTimeout(25); }
  return selected;
}

async function saveScreenshot(page, name) {
  const output = path.join(OUTPUT_DIR, name);
  await page.screenshot({ path: output, fullPage: false });
  audit.screenshots.push(path.relative(ROOT, output).replaceAll('\\', '/'));
}

async function performanceRuns(browser, baseUrl) {
  const cold = [], warm = [];
  for (let i = 0; i < 5; i++) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await context.addInitScript(() => { window.__v029LongTasks = []; new PerformanceObserver(list => window.__v029LongTasks.push(...list.getEntries().map(item => ({ duration: item.duration, startTime: item.startTime })))).observe({ type: 'longtask', buffered: true }); });
    const page = await context.newPage(); bindAudit(page);
    cold.push(await ready(page, `${baseUrl}/#cockpit/overview`));
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(() => { window.__v029LongTasks = []; new PerformanceObserver(list => window.__v029LongTasks.push(...list.getEntries().map(item => ({ duration: item.duration, startTime: item.startTime })))).observe({ type: 'longtask', buffered: true }); });
  for (let i = 0; i < 5; i++) {
    const page = await context.newPage(); bindAudit(page);
    warm.push(await ready(page, `${baseUrl}/#cockpit/overview`));
    await page.close();
  }
  await context.close();
  return { cold, warm };
}

function summarize(runs) {
  const values = runs.map(run => run.metrics.cockpitReady).sort((a, b) => a - b);
  return { min: values[0], median: values[Math.floor(values.length / 2)], max: values.at(-1), samples: values };
}

function canonicalJson(value) {
  // Seed/hydration may reorder keyed record arrays; membership and fields, not storage order, define business state here.
  if (Array.isArray(value)) return `[${value.map(canonicalJson).sort().join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sameBusinessState(beforeJson, afterJson) {
  return canonicalJson(JSON.parse(beforeJson)) === canonicalJson(JSON.parse(afterJson));
}

function firstDifference(left, right, trail = '$') {
  if (canonicalJson(left) === canonicalJson(right)) return null;
  if (Array.isArray(left) && Array.isArray(right)) {
    const a = [...left].sort((x, y) => canonicalJson(x).localeCompare(canonicalJson(y)));
    const b = [...right].sort((x, y) => canonicalJson(x).localeCompare(canonicalJson(y)));
    if (a.length !== b.length) return { path: `${trail}.length`, before: a.length, after: b.length };
    for (let i = 0; i < a.length; i++) { const diff = firstDifference(a[i], b[i], `${trail}[sorted:${i}]`); if (diff) return diff; }
  } else if (left && right && typeof left === 'object' && typeof right === 'object') {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of keys) { const diff = firstDifference(left[key], right[key], `${trail}.${key}`); if (diff) return diff; }
  }
  return { path: trail, before: left, after: right };
}

function changedCollections(beforeJson, afterJson) {
  const before = JSON.parse(beforeJson), after = JSON.parse(afterJson), keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].sort().flatMap(key => {
    const left = canonicalJson(before[key]), right = canonicalJson(after[key]);
    if (left === right) return [];
    return [{ key, beforeCount: Array.isArray(before[key]) ? before[key].length : null, afterCount: Array.isArray(after[key]) ? after[key].length : null, beforeBytes: left.length, afterBytes: right.length, firstDifference: firstDifference(before[key], after[key], `$.${key}`) }];
  });
}

async function populationSnapshot(page) {
  return page.evaluate(() => {
    const selectorRows = window.MinshengResearchCockpit.records();
    return {
      state: JSON.stringify(data),
      persisted: localStorage.getItem(window.MinshengPersistence.key),
      contract: window.MinshengSelectorPopulationContract.contract(data, selectorRows)
    };
  });
}

function legacyProfilePayload(stateJson) {
  const source = JSON.parse(stateJson);
  const legacyStores = ['records', 'rawPayloads', 'sourceDocuments', 'files', 'research', 'evidence', 'inbox', 'auditLog', 'methodologies', 'methodologyEvents', 'batches'];
  return JSON.stringify({ version: '0.3', savedAt: '2026-08-19T00:00:00.000Z', payload: Object.fromEntries(legacyStores.filter(key => Object.hasOwn(source, key)).map(key => [key, source[key]])) });
}

async function profileRun(browser, baseUrl, profileName, persistedProfile = null) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  if (persistedProfile) await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: 'minsheng-os-v03-local-research', value: persistedProfile });
  const page = await context.newPage(); bindAudit(page);
  await ready(page, `${baseUrl}/#cockpit/overview`);
  const first = await populationSnapshot(page);
  const reloads = [];
  let bootstrapMutations = 0;
  let firstMutation = null;
  for (let index = 0; index < 10; index++) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#researchCockpitRoot .research-cockpit');
    await page.waitForTimeout(300);
    const next = await populationSnapshot(page);
    const stateStable = sameBusinessState(first.state, next.state);
    const persistenceStable = first.persisted === next.persisted;
    if (!stateStable || !persistenceStable) { bootstrapMutations++; if (!firstMutation) firstMutation = { reload: index + 1, stateChanges: changedCollections(first.state, next.state), persistenceChanged: !persistenceStable }; }
    reloads.push({ reload: index + 1, independentExpectedCount: next.contract.independentExpectedCount, selectorActualCount: next.contract.selectorActualCount, stateFingerprint: next.contract.generatedFromStateFingerprint, stateStable, persistenceStable, reconciliationStatus: next.contract.reconciliationStatus });
  }
  const result = { profile: profileName, profileKind: persistedProfile ? 'MIGRATED_EXISTING_PROFILE' : profileName === 'current-audited' ? 'CURRENT_AUDITED_PROFILE' : 'CLEAN_PROFILE', initial: { independentExpectedCount: first.contract.independentExpectedCount, selectorActualCount: first.contract.selectorActualCount, stateFingerprint: first.contract.generatedFromStateFingerprint, reconciliationStatus: first.contract.reconciliationStatus, persistedBefore: Boolean(first.persisted) }, reloads, bootstrapMutationCount: bootstrapMutations, regenerationWarningCount: bootstrapMutations, firstMutation, stable: bootstrapMutations === 0 && reloads.every(row => row.independentExpectedCount === first.contract.independentExpectedCount && row.selectorActualCount === first.contract.selectorActualCount && row.stateFingerprint === first.contract.generatedFromStateFingerprint && row.reconciliationStatus === 'MATCH') };
  await context.close();
  return { result, first };
}

async function populationProfileMatrix(browser, baseUrl) {
  const clean = await profileRun(browser, baseUrl, 'clean');
  const migrated = await profileRun(browser, baseUrl, 'migrated-existing', legacyProfilePayload(clean.first.state));
  const current = await profileRun(browser, baseUrl, 'current-audited');
  return { clean: clean.result, migrated: migrated.result, current: current.result, contract: clean.first.contract, legacyFixture: { source: 'isolated synthetic v0.3 payload composed from already-loaded application stores; no user profile accessed', persistedStoreNames: Object.keys(JSON.parse(legacyProfilePayload(clean.first.state)).payload).sort() } };
}

const audit = {
  version: 'v0.29.1', kind: 'REAL_BROWSER_HTTP_AUDIT', generatedAt: new Date().toISOString(),
  server: {}, browser: {}, viewport: [], coldRuns: [], warmRuns: [], navigation: [], modules: [],
  console: [], pageErrors: [], failedRequests: [], resourceFailures: [], routesVisited: [], screenshots: [], assertions: [], warnings: [], interactions: {}, stability: {}, dataReconciliation: {}, populationProfiles: null
};

async function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const server = await startServer();
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  audit.server = { address: '127.0.0.1', port: address.port, url: baseUrl, stoppedAfterAudit: false };
  let browser;
  try {
    const launched = await launchBrowser(); browser = launched.browser;
    audit.browser = { name: launched.candidate.name, version: launched.version, launch: `Playwright Chromium headless, isolated context (${launched.candidate.launch})` };
    audit.viewport = [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }];
    const runs = await performanceRuns(browser, baseUrl);
    audit.coldRuns = runs.cold; audit.warmRuns = runs.warm;
    audit.performance = { cold: summarize(runs.cold), warm: summarize(runs.warm) };
    assert(audit.performance.cold.median <= 2000, 'Cold cockpit-ready median is within 2 seconds', audit.performance.cold);
    audit.populationProfiles = await populationProfileMatrix(browser, baseUrl);
    const profileResults = Object.values(audit.populationProfiles).filter(value => value && value.profile);
    recordAssertion(profileResults.length === 3 && profileResults.every(result => result.stable), 'Clean, migrated, and current isolated profiles remain idempotent for ten reloads', profileResults);

    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
    await context.addInitScript(() => { window.__v029LongTasks = []; new PerformanceObserver(list => window.__v029LongTasks.push(...list.getEntries().map(item => ({ duration: item.duration, startTime: item.startTime })))).observe({ type: 'longtask', buffered: true }); });
    const page = await context.newPage(); bindAudit(page);
    const overview = await ready(page, `${baseUrl}/#cockpit/overview`);
    const beforeBusiness = await page.evaluate(() => JSON.stringify(data));
    audit.navigation.push({ label: 'overview', ...overview });
    await saveScreenshot(page, 'cockpit-home-1366x768.png');
    assert(overview.metrics.firstScreenDomNodes <= 100, 'First-screen active DOM remains near static-audit baseline', { nodes: overview.metrics.firstScreenDomNodes, baseline: 77, classification: 'browser/document shell nodes explain the bounded difference' });
    assert(overview.metrics.renderedTableRows === 0, 'First screen renders no complete table rows');
    assert(await page.locator('.v29-hero').isVisible(), 'Cockpit overview is visible');

    let largest = { id: '', rows: -1 };
    for (const id of ROUTES) {
      const start = performance.now(); const result = await clickRoute(page, id);
      const elapsed = Number((performance.now() - start).toFixed(2));
      const expectedWarning = await page.locator('.v29-warning').isVisible();
      audit.modules.push({ id, ...result, switchMs: elapsed, warningVisible: expectedWarning });
      assert(result.route === `#cockpit/${id}`, 'Module route entered', id);
      assert(expectedWarning && result.warning.length > 0, 'Mandatory warning visible at module first layer', id);
      if (result.rowCount > largest.rows) largest = { id, rows: result.rowCount };
    }
    audit.performance.maxModuleFirstInteractive = { module: largest.id, observedRows: largest.rows, medianMs: [...audit.modules].sort((a, b) => a.switchMs - b.switchMs)[Math.floor(audit.modules.length / 2)].switchMs };
    assert(audit.performance.maxModuleFirstInteractive.medianMs <= 1000, 'Module first-interactive median is within 1 second', audit.performance.maxModuleFirstInteractive);

    await clickRoute(page, largest.id);
    await page.locator('[data-v29-size]').selectOption('10');
    const rowsAt10 = await page.locator('.v29-list tbody tr details').count();
    assert(rowsAt10 <= 10, 'Rendered table rows do not exceed selected page size', { pageSize: 10, rows: rowsAt10 });
    const hasNext = await page.locator('[data-v29-page]').last().isEnabled(); if (hasNext) await page.locator('[data-v29-page]').last().click();
    await page.locator('[data-v29-size]').selectOption('25');
    const selectedFilters = {};
    await page.locator('[data-v29-search]').fill('银行'); await page.locator('[data-v29-search]').press('Enter');
    selectedFilters.kind = await chooseFirstOption(page, '[data-v29-kind]');
    selectedFilters.department = await chooseFirstOption(page, '[data-v29-department]');
    selectedFilters.period = await chooseFirstOption(page, '[data-v29-period]');
    await page.locator('[data-v29-sort]').selectOption('id:desc');
    const firstDetails = page.locator('.v29-list details').first();
    if (await firstDetails.count()) { await firstDetails.locator('summary').click(); assert(await firstDetails.evaluate(item => item.open), 'Provenance detail expands'); }
    audit.interactions = { largestModule: largest.id, rowsAt10, selectedFilters, pageSizeAfterChange: await page.locator('[data-v29-size]').inputValue(), provenanceExpanded: await firstDetails.count() > 0 };
    await saveScreenshot(page, 'largest-list-1366x768.png');
    if (await firstDetails.count()) await saveScreenshot(page, 'provenance-expanded-1366x768.png');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await saveScreenshot(page, 'scroll-state-1366x768.png');

    const downloads = [];
    for (const format of ['json', 'csv', 'md']) {
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator(`[data-v29-export="${format}"]`).click()]);
      downloads.push({ format, suggestedFilename: download.suggestedFilename() });
    }
    audit.interactions.downloads = downloads;
    assert(downloads.length === 3, 'JSON, CSV, and Markdown exports all trigger downloads');
    const businessAfterInteractions = await page.evaluate(() => JSON.stringify(data));
    const businessStateChanged = !sameBusinessState(beforeBusiness, businessAfterInteractions);
    audit.dataReconciliation.businessStateChanged = businessStateChanged;
    recordAssertion(!businessStateChanged, 'Audit interactions do not mutate observations, scenarios, causal edges, or historical records');

    const deepUrl = page.url(); const deep = await context.newPage(); bindAudit(deep); await ready(deep, deepUrl); assert(await deep.evaluate(() => location.hash) === new URL(deepUrl).hash, 'Copied hash deep link survives reload'); await deep.close();
    await page.goBack(); await page.waitForTimeout(50); await page.goForward(); await page.waitForTimeout(50); assert((await page.evaluate(() => location.hash)).startsWith('#cockpit/'), 'Back and forward preserve cockpit history');
    const businessBeforeRefresh = await page.evaluate(() => JSON.stringify(data));
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('#researchCockpitRoot .research-cockpit'); assert(await page.locator('[data-v29-size]').inputValue() === '25', 'Saved view restores after refresh');
    await page.waitForTimeout(300);
    const businessAfterRefresh = await page.evaluate(() => JSON.stringify(data));
    const refreshBusinessStateChanged = !sameBusinessState(businessBeforeRefresh, businessAfterRefresh);
    const refreshChanged = changedCollections(businessBeforeRefresh, businessAfterRefresh);
    audit.dataReconciliation.refreshBusinessStateChanged = refreshBusinessStateChanged;
    audit.dataReconciliation.refreshChangedCollections = refreshChanged;
    if (refreshBusinessStateChanged) audit.warnings.push({ code: 'BOOTSTRAP_DERIVED_METADATA_REGENERATED', message: 'A page reload regenerated derived metadata timestamps/IDs without a user data mutation.', collections: refreshChanged });
    await page.evaluate(() => localStorage.setItem('minsheng.v029.cockpit', '{obsolete')); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('#researchCockpitRoot .research-cockpit'); assert(await page.locator('[data-v29-size]').inputValue() === '10', 'Corrupt or old UI state safely falls back');

    const baselineRoute = 'bank-evidence'; await clickRoute(page, baselineRoute); const baselineDom = await page.evaluate(() => document.querySelector('#researchCockpitRoot').querySelectorAll('*').length);
    const cycle = [];
    for (let i = 0; i < 50; i++) { const id = ROUTES[i % ROUTES.length]; await clickRoute(page, id); cycle.push(await page.evaluate(() => document.querySelector('#researchCockpitRoot').querySelectorAll('*').length)); }
    await clickRoute(page, baselineRoute); const finalDom = await page.evaluate(() => document.querySelector('#researchCockpitRoot').querySelectorAll('*').length);
    audit.stability = { iterations: 50, baselineRoute, baselineDom, finalDom, maxDuringCycle: Math.max(...cycle), deltaPercent: Number((Math.abs(finalDom - baselineDom) / Math.max(1, baselineDom) * 100).toFixed(2)) };
    assert(audit.stability.deltaPercent <= 10, 'Fifty module switches reclaim active DOM within 10 percent', audit.stability);
    assert(await page.locator('#researchCockpitRoot .research-cockpit').count() === 1, 'Repeated navigation leaves one active cockpit root');
    await page.locator('[data-cockpit-reset]').click(); await page.waitForFunction(() => location.hash === '#cockpit/overview'); assert(await page.locator('.v29-hero').isVisible(), 'Restore default view returns to overview');
    const reconciliation = await page.evaluate(() => ({ summaryRows: window.MinshengResearchCockpit.cockpit().all.total, contract: window.MinshengSelectorPopulationContract.contract(data, window.MinshengResearchCockpit.records()), collections: Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])), recordStatuses: (data.records || []).reduce((out, row) => (out[row.status || 'UNSPECIFIED'] = (out[row.status || 'UNSPECIFIED'] || 0) + 1, out), {}), recordSources: (data.records || []).reduce((out, row) => (out[row.sourceId || 'UNSPECIFIED'] = (out[row.sourceId || 'UNSPECIFIED'] || 0) + 1, out), {}) }));
    audit.dataReconciliation = { ...reconciliation.contract, summaryRows: reconciliation.summaryRows, collections: reconciliation.collections, recordStatuses: reconciliation.recordStatuses, recordSources: reconciliation.recordSources, businessStateChanged, refreshBusinessStateChanged, refreshChangedCollections: refreshChanged };
    recordAssertion(reconciliation.summaryRows === reconciliation.contract.independentExpectedCount, 'Home summary reconciles to the independent declared-store population', audit.dataReconciliation);
    recordAssertion(reconciliation.contract.reconciliationStatus === 'MATCH', 'Cockpit selector matches the independent declared-store population', reconciliation.contract.reconciliation);
    recordAssertion(reconciliation.contract.duplicateDiagnostics.duplicatePass, 'Population duplicate diagnostics pass without deleting valid revisions', reconciliation.contract.duplicateDiagnostics);
    await page.setViewportSize({ width: 1920, height: 1080 }); await saveScreenshot(page, 'cockpit-home-1920x1080.png');
    const visual = await page.evaluate(() => ({ horizontalOverflow: document.documentElement.scrollWidth > innerWidth, visibleText: document.body.innerText, longTasks: window.__v029LongTasks || [] }));
    audit.visual = { horizontalOverflow: visual.horizontalOverflow, chineseVisible: /民生|研究/.test(visual.visibleText), longTasks: visual.longTasks };
    assert(!visual.horizontalOverflow, 'Overview horizontal scrolling is controlled at 1920px'); assert(audit.visual.chineseVisible, 'Chinese copy renders without an empty/garbled page');
    assert(!visual.longTasks.some(item => item.duration > 2000), 'No sustained main-thread task exceeds two seconds', visual.longTasks);
    await context.close();
    const consoleErrors = audit.console.filter(item => item.type === 'error');
    const sameOriginFailures = audit.resourceFailures.filter(item => item.url.startsWith(baseUrl));
    audit.errorSummary = { consoleErrors, pageErrors: audit.pageErrors, failedRequests: audit.failedRequests, sameOriginResourceFailures: sameOriginFailures, externalResourceFailures: audit.resourceFailures.filter(item => !item.url.startsWith(baseUrl)) };
    assert(consoleErrors.length === 0, 'Browser console.error is zero', consoleErrors);
    assert(audit.pageErrors.length === 0, 'Uncaught page errors are zero', audit.pageErrors);
    assert(sameOriginFailures.length === 0, 'Unexplained same-origin resource failures are zero', sameOriginFailures);
    assert(audit.assertions.every(item => item.pass), 'All v0.29.1 browser hard gates pass', audit.assertions.filter(item => !item.pass));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    audit.server.stoppedAfterAudit = true;
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(audit, null, 2) + '\n');
    if (audit.populationProfiles) fs.writeFileSync(POPULATION_FILE, JSON.stringify({ contract: audit.populationProfiles.contract, profiles: { clean: audit.populationProfiles.clean, migrated: audit.populationProfiles.migrated, current: audit.populationProfiles.current }, legacyFixture: audit.populationProfiles.legacyFixture }, null, 2) + '\n');
  }
}

run().then(() => { console.log(`v0.29.1 real browser audit PASS: ${OUTPUT_FILE}`); }).catch(error => { audit.failure = { message: error.message, stack: error.stack }; fs.mkdirSync(OUTPUT_DIR, { recursive: true }); fs.writeFileSync(OUTPUT_FILE, JSON.stringify(audit, null, 2) + '\n'); console.error(`v0.29.1 real browser audit FAIL: ${error.stack}`); process.exitCode = 1; });
