# 民生 OS v0.15 — Official Critical Exposure Acquisition, Wave 2

## Acquisition result

Wave 2 uses a release-level multi-route model. An official index is an auditable discovery route; an `ORIGINAL` route is the sole route eligible to back a REAL observation. A route records role, URL/local reference, HTTP status, title, release date, data period, MIME type, SHA-256, fetch time, identity/content verification and failures. Browser startup and all tests remain offline.

The explicit LIVE run recorded six successful official routes: PBOC index + original release, MOF fiscal index + original release, and MOF debt index + original release. The full route audit is in `sources/official-v015/manifests/live-acquisition-v015.json`; original HTML files are local-only under `sources/official-v015/raw/` and are excluded from Git.

## Accepted REAL observations

### PBOC — 2026 Q2 loan-direction statistics (2026-06 period-end)

| Official indicator | Value | Scope / status |
| --- | ---: | --- |
| RMB real-estate loan balance | 50.74 万亿元 | Banking real-estate loans, stock |
| RMB real-estate loan YoY | -4.9% | Published rate |
| Real-estate development loan balance | 12.65 万亿元 | Development-loan stock only |
| Development loan YoY | -8.5% | Published rate |
| Personal housing loan balance | 36.29 万亿元 | Personal-housing-loan stock |
| Personal housing loan YoY | -3.8% | Published rate |

The records remain separate: household loans and household medium/long-term loans are not mapped to personal housing loans; development loans are not complete developer financing; the real-estate total is not added to either component; no balance is interpreted as a debt-service flow or loss amount.

### MOF — 2026 H1 fiscal statistics

| Official indicator | Value | Scope / status |
| --- | ---: | --- |
| National government-fund budget revenue | 15,244 亿元 | National cumulative revenue |
| Local government-fund own revenue | 12,847 亿元 | Local cumulative own revenue |
| State-owned land-use-right transfer revenue | 9,778 亿元 | Local gross cumulative revenue |

Land-transfer revenue is not net available fiscal resource, a single-city value, or a loss amount.

### MOF — June 2026 local-government debt and bonds

| Official indicator | Value | Scope / status |
| --- | ---: | --- |
| Legal local-government debt balance | 587,706 亿元 | June period-end; excludes LGFV/implicit debt |
| General debt balance / special debt balance | 178,413 / 409,293 亿元 | Separate legal-debt stocks |
| H1 bond issuance / new issuance / refinancing issuance | 58,706 / 24,475 / 34,231 亿元 | Separate cumulative issuance flows |
| H1 principal repaid / interest paid | 19,232 / 7,693 亿元 | Government-bond flow scope only |

Refinancing issuance is not new fiscal resource. Bond principal and interest are not silently expanded to all local-government obligations.

## Derived records

Seven ratio records are stored separately as `DERIVED`, never replacing a published observation. Each contains formula, input IDs and input revisions; an input revision marks the ratio `STALE`.

- Personal housing loans / real-estate loans: 71.52%
- Development loans / real-estate loans: 24.93%
- Land-transfer revenue / local government-fund own revenue: 76.11%
- General debt / legal local debt: 30.36%
- Special debt / legal local debt: 69.64%
- New bonds / H1 issuance: 41.69%
- Refinancing bonds / H1 issuance: 58.31%

These are descriptive structures only. They are not loss, debt-service, net-resource or full-coverage measures.

## Qualification and readiness

The new personal-housing-loan and development-loan balances are `QUALIFIED_WITH_LIMITATIONS` for `EXPOSURE_STOCK`; gross land-transfer revenue is qualified only for `FISCAL_PRESSURE_ANCHOR`; legal debt is qualified only for `DEBT_STRUCTURE`; bond principal/interest flows are qualified only for their limited `DEBT_SERVICE_FLOW` scope.

Both core chains remain `DIRECTION_ONLY`:

- Household: income direction → mortgage exposure is observed, but applicable rate, term, amortization, income/debt distribution, liquid assets and consumption elasticity are missing.
- Property/fiscal: land-transfer pressure is observed, but developer collections/full financing, land-purchase elasticity, lags and gross-to-net fiscal-resource conversion are missing.

No loss model, debt-service model, LGFV estimate, bank credit-loss model or causal-edge upgrade is created. Overall causal validation remains `PARTIAL`.

## Interfaces and research

`window.MinshengOfficialWave2Intake` adds route/release validation, semantic duplicate versus revision classification, strict PBOC/MOF parsers, safe ratio derivation and derived-record staleness. R029–R032 record the Wave 2 research subjects and retain the remaining evidence gaps.

The existing critical-exposure page receives a compact Wave 2 section showing source release, period, value, stock/flow/rate semantics, derived-record count and readiness warnings. It explicitly states that LGFV is excluded from legal local debt, land-transfer revenue is not net fiscal resource, and personal housing-loan balance is not debt service.
