# v0.23 — 银行房地产信用损失情景引擎

## Boundary

v0.23 is an isolated bank-sample scenario engine. It reuses only the audited entity exposure anchors from v0.21 and NPL-balance anchors from v0.22. Outputs are always `SCENARIO_ESTIMATE` (or `PROXY_SCENARIO` when explicitly requested), `BANK_SAMPLE_ONLY`, `NOT_OBSERVED_LOSS`, and `NOT_FORMAL_BANK_LOSS`. They are never REAL observations, audit disclosures, national-bank estimates, loss-allocation results, capital conclusions, PD forecasts or causal findings.

Published/derived NPL ratios, bank-wide NPL ratios, allowance/ECL, Stage 2/3, overdue rates, history, house prices and PBOC national balances are excluded from scenario parameter defaults. In particular, `PUBLISHED_NPL_RATIO → PD` and `HISTORICAL_NPL_RATIO → SCENARIO_MIGRATION_RATE` are prohibited.

## Eligibility matrix

| Bank / portfolio | Eligibility | Reason |
| --- | --- | --- |
| ICBC / personal mortgage | `EXACT_SCOPE_MATCH` | Consolidated audited exposure and NPL balance, 2025-12-31, RMB million |
| ICBC / corporate real estate | `EXACT_SCOPE_MATCH` | Domestic-branch audited exposure and NPL balance, 2025-12-31, RMB million |
| ABC / personal mortgage | `EXACT_SCOPE_MATCH` | Consolidated audited pair |
| ABC / corporate real estate | `EXACT_SCOPE_MATCH` | Consolidated audited pair |
| PSBC / personal mortgage | `EXACT_SCOPE_MATCH` | Consolidated audited pair |
| PSBC / corporate real estate | `SCOPE_MISMATCH_BLOCKED` | Consolidated exposure cannot be paired with domestic-branch NPL disclosure |

The registered scope-rule table is the only approved source of legacy semantic compatibility. It checks bank, as-of/reporting period, scope, geography, portfolio, currency/unit, on/off-balance, gross/net, audited entity and accounting scope. Explicit unit conversion to RMB million is permitted; unregistered string similarity is not.

## Modes and formulas

- **A — `EXISTING_NPL_RECOVERY_SCENARIO`**: `observedNplBalance × scenarioLGD`.
- **B — `NEW_MIGRATION_SCENARIO`**: `(grossExposure − observedNplBalance) × scenarioMigrationRate × scenarioLGD`; requires an eligible pair and non-negative performing exposure.
- **C — `COMBINED_STOCK_AND_FLOW_SCENARIO`**: A + B, only with the explicit `INCLUDE_EXISTING_NPL_STOCK` selection. It carries `STOCK_FLOW_COMBINATION`, `NO_ALLOWANCE_NETTING`, `NO_CAPITAL_IMPACT` and `NOT_EXPECTED_LOSS`.
- **D — `TOTAL_EXPOSURE_FRACTION_SCENARIO`**: `grossExposure × scenarioMigrationRate × scenarioLGD`; it is mutually exclusive with the existing-NPL stock and marked `SIMPLIFIED_TOTAL_EXPOSURE_SCENARIO`.

All outputs are gross scenario credit loss before allowance and capital. The engine never nets provisions/ECL, taxes, capital, CET1, RWA, policy support or recovery resources.

## Inputs, runs and sensitivity

Every relevant parameter must be explicitly entered with a source type of `USER_SCENARIO`, `MODEL_ASSUMPTION` or `RESEARCH_PROXY`. Migration rate and LGD accept either DECIMAL or PERCENT inputs, normalize to `[0,1]`, preserve raw and normalized values, and accept zero. Horizon must be positive and explicitly measured in MONTH, QUARTER or YEAR. Empty fields do not become defaults.

Each completed run is immutable and stores references/revisions, raw and normalized inputs, assumption manifest, formula and engine versions, horizon, warnings, limitations and separate display/internal outputs. A `RESEARCH_PROXY` input produces `PROXY_SCENARIO`.

The sensitivity API requires explicitly supplied migration and LGD arrays, deterministically sorts and de-duplicates them, permits at most 100 cells, stores the source manifest on each cell, and never chooses a most-likely cell or emits a risk rating.

## Aggregation, blocking and staleness

Single-bank runs are primary. A bank-sample aggregate requires explicit opt-in, ready runs, equal mode/portfolio/parameters/horizon, exact scope eligibility and unique scope rules. It is permanently labelled `BANK_SAMPLE_SCENARIO_ONLY_NOT_NATIONAL`; no national extrapolation is available.

LGFV returns `LGFV_EXPOSURE_UNKNOWN_BLOCKED`; national banking loss returns `NATIONAL_BANK_LOSS_BLOCKED`. Direct LGFV quality is still unknown.

Only referenced exposure/NPL revisions, the scope-rule version, formula version or engine version stale a run. Simplified Mode D does not reference an NPL and therefore does not stale on an NPL revision. Staleness changes lifecycle metadata only; historical inputs and output payloads remain unchanged.

## Readiness

- `BANK_SAMPLE_SCENARIO_READY_WITH_EXPLICIT_INPUTS`
- `EXISTING_NPL_SCENARIO_READY`
- `NEW_MIGRATION_SCENARIO_READY`
- `COMBINED_SCENARIO_READY`
- `SCOPE_MISMATCH_BLOCKED`
- `LGFV_SCENARIO_BLOCKED`
- `NATIONAL_BANK_LOSS_BLOCKED`
- `FORMAL_BANK_LOSS_BLOCKED`

Formal numerical bank loss, national bank loss, LGFV loss, core loss chains and overall causal validation are not upgraded. Overall causal validation remains `PARTIAL`.
