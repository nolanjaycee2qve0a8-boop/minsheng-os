# v0.16 — Household Mortgage Debt-Service Scenario Engine

## Boundary

This release adds deterministic, auditable mortgage-payment scenarios. It does **not** recover national observed mortgage debt service, a formal household debt-service-to-income ratio (DSTI), a loss amount, or a causal effect. The formal household chain remains `DIRECTION_ONLY`; formal national household DSTI remains `BLOCKED`; overall causal validation remains `PARTIAL`.

`SCENARIO_ESTIMATE` records live only in `mortgageScenarioRuns`. They never enter `records` as REAL observations, `lossAllocationRuns`, or causal-edge validation.

## Official rate evidence

| Evidence | Value / rule | Type | Intended use | Stock-effective mortgage rate? |
| --- | --- | --- | --- | --- |
| PBOC 2025 H1 new personal-housing-loan rate | about 3.1% | `NEW_LOAN_RATE`, REAL | Explicitly labelled new-loan scenario evidence | No |
| PBOC Announcement [2024] No. 11 | fixed or floating contract; floating loans use the latest monthly LPR plus spread and may agree a repricing cycle | `POLICY_BENCHMARK` / repricing policy | Contract and repricing semantics | No |
| Five-year-plus LPR | no v0.16 stock-rate observation accepted | `POLICY_BENCHMARK` only if later ingested | Benchmark reference, never an automatic mortgage rate | No |
| Outstanding mortgage effective weighted rate | unavailable | `STOCK_EFFECTIVE_RATE` | Required for an observed-stock debt-service estimate | `UNKNOWN` |

The explicit LIVE manifest is [live-acquisition-v016.json](sources/official-v016/manifests/live-acquisition-v016.json). It records three PBOC original routes and their SHA-256 values. Raw source files are intentionally local-only and ignored by Git. No fixture is counted as LIVE.

## Calculation and units

Inputs identify a source type: `OFFICIAL_OBSERVATION`, `DERIVED_FROM_REAL`, `USER_SCENARIO`, `RESEARCH_PROXY`, `MODEL_ASSUMPTION`, `MOCK`, or `UNKNOWN`. Unknown values are blocked rather than defaulted. Any non-REAL input is copied into the immutable assumption manifest.

Amounts convert explicitly among yuan, ten-thousand yuan, hundred-million yuan, and trillion yuan. Calculation is in yuan, rounded only at returned money fields to cents. The largest supported national exposure is bounded below the safe integer range after cent rounding. Rates require either `PERCENT` (for example `3.1`) or `DECIMAL` (for example `0.031`); monthly rate is annual rate divided by twelve. `100 bp = 1 percentage point`.

For principal `P`, monthly rate `r`, and remaining months `n`:

```text
Equal payment: M = P / n                              when r = 0
               M = P × r × (1+r)^n / ((1+r)^n − 1)   when r > 0

Equal principal: monthly principal = P / n
                 payment in month t = P / n + (P − (t−1)P/n) × r
```

Both methods return first-year repayment, full-term repayment and interest, first-period components where applicable, and a specified-month balance. Formula balances are clamped to zero only at maturity; no rounded payment schedule is re-accumulated, avoiding artificial final residuals or negative balance.

## Scenario modes

| Mode | Principal source | Other core inputs | Output |
| --- | --- | --- | --- |
| Single loan | Explicit user input | Explicit rate, remaining term, method | `SCENARIO_ESTIMATE` |
| Standardized 1m | `MODEL_ASSUMPTION`: ¥1,000,000 | Explicit rate, remaining term, method | `SCENARIO_ESTIMATE`; not an average household |
| National exposure | PBOC REAL personal-housing-loan balance of ¥36.29tn | Explicit rate, term, method | `SCENARIO_ESTIMATE`, `MIXED_REAL_AND_ASSUMPTION`, `NOT_OBSERVED_DEBT_SERVICE`, `NOT_FORMAL_LOSS_RESULT` |

The national exposure is a stock anchor only. It is not a repayment flow. Its loans have heterogeneous contract rates, remaining terms, payment methods, prepayments, new lending, delinquencies, write-offs and balance changes.

## Shock, repricing, and DSTI

Rate shocks accept basis points, percentage points, or a directly supplied new annual rate. Repricing requires an explicit affected-balance fraction, repricing date and new rate. The unchanged balance remains at the old rate; no scenario assumes that all loans reprice immediately.

A household DSTI is available only when the user explicitly supplies a household monthly or annual income. It is converted to a monthly denominator and labelled `HOUSEHOLD_SCENARIO`, `USER_INPUT_BASED`, non-official, non-risk-rating and non-approval. No safety or danger threshold exists. Per-capita NBS income is never expanded into national household income.

## Staleness and immutability

Every run retains engine/formula versions, full inputs, source types, official record IDs and revisions, units, outputs, limitations, readiness and data version. Changing a parameter creates a new run. A newer revision of a referenced REAL observation, or a formula-version change, marks only dependent runs `STALE`; it never rewrites their original payload. User-principal runs are unaffected by unrelated official revisions.

## Remaining requirements for formal results

- National outstanding mortgage effective weighted rate and repricing distribution.
- Remaining-term and repayment-method distributions.
- Compatible national household disposable-income total, debt-service flow, principal/interest scope and period.
- Household income/debt distribution, liquid assets, prepayment, delinquency and default data.
- Consumption elasticity and causal evidence before any loss or consumption calculation.

No scenario result can satisfy these requirements by itself.
