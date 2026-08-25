# v0.30 — Official Data Operations Hub

## Boundary

This control plane unifies official-release discovery, route resolution, raw acquisition, validation, staging, semantic-diff and qualification audit trails. It is not an automatic REAL-importer. `APPROVED_SUBMISSION` requires a verified immutable run and an explicit, candidate-bound approval record; the generic Wave 1 run has zero candidates and zero submissions.

## Pipeline and modes

`RELEASE_DISCOVERY → ROUTE_RESOLUTION → RAW_ACQUISITION → CONTENT_VALIDATION → PARSER_STAGING → SEMANTIC_DIFF → QUALIFICATION → MATERIALIZATION_PREVIEW → APPROVED_SUBMISSION`

`tools/run_official_data_ops.py` supports `discovery`, `acquire`, `replay`, `preview`, and `submit`. `replay` only accepts a local manifest and does not network. `submit` fails safely without a matching approval record and qualified candidates. Raw artifacts are content-addressed beneath ignored `sources/official-v030/raw/`.

## Wave 1 LIVE audit

Run: `v030_wave1_live_20260822`; immutable manifest: `sources/official-v030/manifests/live-acquisition-v030.json`.

- 17 release-family routes attempted across 12 providers.
- Eight valid raw responses from six providers; SHA-256 recomputation matched all eight.
- Domestic official successes: PBOC and MOF. International official successes: World Bank, BIS and OECD.
- DBnomics succeeded only as an explicitly labelled aggregator with `LICENSE_REVIEW_REQUIRED`; it is not primary-source evidence.
- NBS, bank-IR routes and IMF failures remain in the manifest. MOF local-debt route returned HTTP 502. No failures were changed into fixtures.
- Staged candidates / qualified / submissions / new REAL: `0 / 0 / 0 / 0`.

No source-health outcome changes prior REAL records. No scheduler is installed; `--due-only` is a future scheduling interface only.
