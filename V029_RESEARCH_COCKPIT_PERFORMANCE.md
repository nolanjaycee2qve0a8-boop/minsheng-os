# v0.29 Research Cockpit & Performance Audit

## Scope and safety boundary

v0.29 adds only a read-only selector/view-model and progressively mounted UI. It does not create or mutate observations, scenario runs, loss-allocation runs, causal edges, forecast evaluations, source provenance or historical records. The raw state remains the single source of truth.

## Architecture

- The legacy page views are retained in the inert `#v029LegacyViews` template for source compatibility, rather than being active DOM.
- `app.js` continues data migration/hydration but short-circuits legacy renderers whenever `#researchCockpitRoot` is present.
- `research-cockpit.js` owns `#cockpit/<module>` routes. Mounting replaces the prior module root; a module view therefore releases its rows, controls and per-view listeners before the next view mounts.
- The view-model reads top-level existing stores, exposes classification/STALE/department selectors, and never writes those arrays.
- The 15 modules use a fixed page window (10/25/50), stable copied sorting, pure filtering, expandable provenance, UI-state-only persistence and current-view JSON/CSV/Markdown exports.

## Baseline and post-boot DOM audit

The local browser policy rejected `file://` navigation, so no Chrome/DevTools timing is claimed. The following reproducible static audit counts element tags from `d78cb48:index.html`, then counts active tags after excluding the inert legacy template and post-boot removable script tags:

| Measurement | Baseline | v0.29 | Change |
| --- | ---: | ---: | ---: |
| Active static DOM nodes | 547 | 77 | -85.92% |
| Legacy template nodes | n/a | 324 inert | not rendered |
| First-screen complete table rows | legacy static views | 0 | eliminated |

The post-boot script-element cleanup releases loader nodes only after all local scripts execute; it does not copy or delete data.

## Full-data selector harness

The non-browser harness loads the complete v0.10–v0.28 seeded data scripts and the `app.js` state assembly without a DOM. Results:

- selector records: 915
- six department summaries: 6
- UNKNOWN/BLOCKED instances surfaced: 155
- summary build: 142.07 ms
- 20 module-equivalent select/sort/page cycles: 355.28 ms
- maximum list window: 25 rows in the measured cycle

This is a historical selector/mount-proxy observation, not a claim of Chrome rendering performance and not a population contract. Its 915 rows were measured in the earlier non-browser load path before the v0.29.1 full browser inventory; they are retained for provenance only.

## Semantic preservation

Mandatory warnings are immediately displayed per module: scenario versus REAL, bank sample versus national, NPL versus PD, gross land revenue versus net fiscal resource, deterministic interval versus confidence interval, `NO_CROSS_SECTOR_TOTAL`, forecast/scenario/retrospective isolation, and UNKNOWN versus zero. Exports carry the active filter, record counts, classifications, state flags and the module warning.

## v0.29.1 selector population contract

Contract `1.0.0` independently enumerates declared runtime object-array stores and then compares their identities with the Cockpit selector. It does not call the selector to compute the expected value.

| Population item | Result |
| --- | ---: |
| Independent declared-store population | 1,642 |
| Cockpit selector population | 1,642 |
| Homepage summary | 1,642 |
| Reconciliation | MATCH |
| Duplicate object references | 0 |
| UI alias projections excluded | 4 entries from `forecastAssumptions` / `forecastRisks` |

The four excluded entries are aliases of the canonical `assumptions` and `risks` arrays, not removed data. The contract preserves valid revisions and records semantic ID collisions (`relationships`/`calibrationRelationships`, `sources`/`institutionRegistry`) as diagnostics rather than deleting them.

The 1,642 entries are not 1,642 REAL observations: 717 are classified `REAL`, 13 `DERIVED`, 181 `UNKNOWN`, 22 `MOCK`, 3 `BLOCKED`, 2 `SCENARIO`, and 704 `OTHER`. By domain, 581 are observations, 88 ledger lines, 121 research/evidence entries, 124 source/provenance entries, 72 bootstrap-derived metadata entries, 34 readiness/assessment entries, 70 international observations, 33 forecasts, 9 bank disclosures, 6 causal records, and 504 other typed stores. Full store-by-store counts and duplicate diagnostics are in `artifacts/v029.1/selector-population-audit.json`.

Three isolated profiles were tested without accessing a user browser profile: clean, migrated legacy `0.3` payload, and current audited state. Each reconciles at 1,642 and remains stable over ten reloads with `bootstrapMutationCount=0` and `regenerationWarningCount=0`. The migration preserves current seed stores when an old payload does not contain them; compatibility-only empty defaults are no longer allowed to overwrite the base state.

## v0.29.1 real-browser audit

This section is a real browser measurement, not a replacement for the v0.29 selector harness above. The reproducible command is:

```text
node tools/run_v029_browser_audit.js
```

It starts a temporary `127.0.0.1` static HTTP server on an automatically assigned port, launches Microsoft Edge 151.0.4129.93 through Playwright in an isolated context, writes `artifacts/v029.1/browser-audit.json`, saves screenshots, and shuts the server down even when a gate fails. It does not use `file://`, jsdom, a reduced fixture, or a production dependency.

The latest run used 1366×768 and 1920×1080 viewports. It completed five cold and five warm navigations, all 15 routes, mandatory-warning checks, paging/page-size/search/status/department/period/sort controls, provenance expansion, JSON/CSV/Markdown downloads, hash reload, browser back/forward, saved-view recovery, corrupt-state fallback, default reset, and 50 module switches.

| Real-browser measurement | Result |
| --- | ---: |
| Cold cockpit-ready, ms (min / median / max) | 698.5 / 713.4 / 780.2 |
| Warm cockpit-ready, ms (min / median / max) | 673.2 / 682.5 / 690.1 |
| Largest-module first-interactive median, ms | 122.1 |
| First-screen active Cockpit DOM nodes | 83 |
| First-screen complete table rows | 0 |
| Maximum rendered data rows at page size 10 | 10 |
| Routes entered / mandatory warnings visible | 15 / 15 |
| Console errors / uncaught page errors / same-origin failures | 0 / 0 / 0 |
| 50-switch active-DOM change for same route | 0% (147 → 147) |
| Sustained main-thread tasks above 2 seconds | 0 |
| Export/route interaction business-state mutation | false |
| Saved view / corrupt-state fallback | restored / safely reset |
| Selector population contract / duplicate diagnostics | MATCH / PASS |
| Clean, migrated, current profiles × 10 reloads | stable / stable / stable |
| Bootstrap mutation / regeneration warning | 0 / 0 |

The 83-node first-screen Cockpit root is six nodes above the v0.29 77-node static baseline; the difference is bounded Cockpit/document shell markup. The full document count is intentionally reported separately because it includes the inert legacy template and source loader elements, which are not active Cockpit UI.

### Browser defects closed

- Removed the runtime dependency on remote Google Fonts and installed a data-URI favicon, eliminating external-font and missing-favicon console failures in the isolated browser.
- Kept v0.6/v0.7/v0.8 legacy workspace view creation out of the Cockpit root so those scripts no longer attempt to mount into absent legacy sections.
- Made the 15-module sidebar independently scrollable at short viewport heights.
- Scoped the v0.6 generic `.workspace` grid away from the sidebar workspace label, eliminating visible Chinese text overflow.

### Bootstrap idempotency fixes

Automatic v0.11 regime records, v0.12 debt-service metrics, v0.13 qualification/readiness records, and v0.9.1 historical import review metadata now use stable deterministic identifiers and derived timestamps for identical inputs. Manual actions retain realtime audit timestamps. Reloads do not save to persistent storage, add a revision, mark a dependency STALE, or mutate observations, scenario runs, causal edges, or historical runs.

## Acceptance

`v0.29 Overall Acceptance: ACCEPTED_WITH_LIMITATIONS`

`v0.29.1 Browser Validation: ACCEPTED`

The original v0.29 selector benchmark remains distinct from the real-browser audit. The accepted browser gate is the versioned contract's independent population reconciliation, duplicate diagnostics, and profile stability—not the historical fixed count of 915.
