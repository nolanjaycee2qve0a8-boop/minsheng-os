# 民生OS v0.13 — 关键敞口数据资格与因果验证

## Purpose

v0.13 adds an audit layer before a loss chain can claim a formal numerical result. It records what a critical item means, where it comes from, which period and scope it covers, and whether it is fit for one specific intended use. It does not add external observations or fabricate REAL data.

## Qualification semantics

`DIRECT_OBSERVATION`, `DERIVED`, `PROXY`, `ASSUMPTION`, `MOCK`, and `UNKNOWN` are distinct data semantics. A non-empty value is insufficient: source traceability, period, as-of date, unit, stock/flow/rate nature, sector and geography scope, duplicate-risk review, record validity, derivation reproducibility, and intended use are checked.

`PROXY` stays `PROXY_ONLY`; it can be used only by an explicitly enabled proxy scenario and never becomes formal REAL numeric input. `MOCK` and `ASSUMPTION` are rejected. `UNKNOWN` remains unknown, including when no amount is available. Zero is accepted as a real value only when all other qualification requirements are met.

## Current critical gaps

The following are candidate-source registrations, not observations and not estimates:

| Area | Item status | Formal numeric use |
| --- | --- | --- |
| Household income and mortgages | `DISCOVERED` | Blocked; total income and verified mortgage balance are not acquired. |
| Developer financing | `DISCOVERED` | Blocked; financing flow, debt balance and instruments must be separated. |
| Bank property/LGFV exposure | `DISCOVERED` | Blocked; infrastructure lending is not silently treated as LGFV exposure. |
| Land-related fiscal revenue | `DISCOVERED` | Blocked; gross land revenue is not net fiscal resource. |
| Local-government debt service | `DISCOVERED` | Blocked; legal debt and implicit-debt estimates remain separate. |

The two currently registered chains therefore produce `DIRECTION_ONLY`, with numeric effects remaining `BLOCKED`.

## Causal records

Six causal-edge records cover:

1. Property sales → developer cash flow → land purchases → land-use-right transfer revenue.
2. Household income → debt-service burden → liquidity buffer → consumption pressure.

They include scope, alternative explanations, confounders, boundary conditions, evidence version, and validation status. Existing records are `HYPOTHESIS` or `THEORY_SUPPORTED`, not causal proof. Correlation-only evidence cannot validate an edge. Overall causal validation remains `PARTIAL`.

## Staleness and history

Qualification assessments retain source-record revision tokens. A revision, deletion, stale source, evidence/rule-version change, or dependent assessment change marks only linked qualification, readiness, causal-validation, and downstream-run references as `STALE`. Historical loss-run payloads are not changed; a separate downstream-staleness event preserves the historical version and explains why it is no longer current.

## Research-facing API

`window.MinshengCriticalExposureQualification` exposes:

* `assess(item, intendedUse, options)` — structured, non-mutating qualification result.
* `recordAssessment(item, intendedUse, options)` — auditable assessment record.
* `readiness(chainId, options)` — `QUALIFIED_NUMERIC`, `DIRECTION_ONLY`, `PROXY_SCENARIO_ONLY`, `BLOCKED`, or `STALE`.
* `validateCausalEdge(edgeId, evidenceIds)` — bounded causal validation.
* `refreshStaleness()` — targeted staleness propagation.
* `report()` — a machine-readable gap, readiness, causal-edge, and stale-reference summary.

The minimal UI view “关键敞口资格” renders the same gap and readiness state without hiding blockers.

## Verification

```powershell
node tests/v013-critical-exposure-tests.js
node tests/v012-sector-loss-tests.js
```
