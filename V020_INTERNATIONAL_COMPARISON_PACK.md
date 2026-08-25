# v0.20 International Comparison Pack

The pack uses World Bank direct WDI responses and DBnomics delivery of BIS, OECD and IMF data. DBnomics is an aggregator, not a substitute for upstream identity. Raw LIVE responses remain local, Git-ignored, and their SHA-256 values are recorded in `sources/official-v020/manifests/live-acquisition-v020.json`.

Housing uses BIS quarterly nominal residential price indexes. Raw index levels are `TREND_ONLY`: compare same-series YoY or separately rebased (base=100) paths only. Nominal/real, base, geography and dwelling coverage are not silently harmonised; unresolved fields remain `UNKNOWN`.

OECD household debt is total household debt divided by net disposable income for USA/JPN/KOR/DEU. It is neither mortgage debt nor debt/GDP. China remains `UNKNOWN`; no PBOC or private-credit proxy is permitted.

IMF WEO 2025-04 general-government gross debt/GDP is distinct from central/local debt and from MOF legal local-government debt. Saved 2030 values are `FORECAST`; no complete PIT claim is made.

World Bank materialization preserves country, indicator, period, value/null, observation status, last updated, raw artifact and parser/mapping versions. Nulls remain `UNKNOWN_STATUS`; Gini is displayed by latest available survey period and is never forward-filled or ranked as a common-date value.

## v0.20.1 validation closure

The frozen `world_bank_comparison_2018_2025.json` LIVE artifact reconciles to **160** country-indicator-period records (four indicators × five countries × 2018–2025), including **26 published nulls**. The deterministic `materializeWorldBank` / `submitWorldBank` API is the only accepted route to materialize these observations: it preserves nulls, raw artifact identity, SHA-256, `lastupdated`, parser/mapping versions and stable IDs. Replays are idempotent; a changed stable key is revision-aware rather than a duplicate. The minimal fixture is test-only and is not part of LIVE totals.

The two earlier commits `4c50cdd` and `e39855e` are intermediate validation commits, not evidence that validation had passed at the time. Final acceptance rests on the subsequent dedicated test and full offline regression run.

`deriveYoY` uses only same-series annual/quarterly/monthly lags (1/4/12). `rebase` requires a present, non-zero base and produces `DERIVED_VISUAL_TRANSFORMATION`; neither interpolates. All license fields remain `LICENSE_REVIEW_REQUIRED`.

International records are restricted to research context and cannot overwrite Chinese official REAL records, enter DSTI/loss/cash-bridge/sector-balance-sheet calculations, or upgrade causal edges.
