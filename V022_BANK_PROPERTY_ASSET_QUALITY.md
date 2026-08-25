# v0.22 — 银行房地产资产质量证据包

## Scope and source boundary

This release reuses the local, SHA-256-verified official English 2025 annual reports already acquired in v0.21 for ICBC, ABC and PSBC. It stores independently auditable, entity-level 2025 values and 2024 comparative columns exactly as published in the 2025 reports. The comparative column is labelled `COMPARATIVE_AS_PUBLISHED_IN_2025_REPORT`; it is not presented as a separately acquired 2024 report.

Each accepted observation retains the local original path, SHA-256, PDF page, printed page, table title, row, column, raw value, unit, scope, report language and visual-review status. PDF text was located with pypdf 6.10.0 and the six core tables were visually reconciled from 250 DPI Poppler renders.

## Accepted scope-specific disclosures

All balances are RMB million. Ratios are published NPL ratios, not recalculated probabilities.

| Bank | Scope | 2025 corporate real-estate NPL / ratio | 2025 residential-mortgage NPL / ratio | PDF table page |
| --- | --- | --- | --- | --- |
| ICBC | Corporate: domestic branches; mortgage: consolidated | 46,576 / 5.39% | 62,250 / 1.06% | 76 / 75 |
| ABC | Consolidated | 47,197 / 5.40% | 44,235 / 0.92% | 84 / 83 |
| PSBC | Corporate: domestic branches; mortgage: consolidated | 5,473 / 1.58% | 16,235 / 0.69% | 146 / 144 |

The same tables provide 2024 comparative scope records: ICBC 43,964 / 4.99% and 44,317 / 0.73%; ABC 46,339 / 5.40% and 36,598 / 0.73%; PSBC 5,972 / 1.94% and 15,231 / 0.64%.

Bank-wide total NPL balances and ratios are retained only as background context: ICBC 399,013 / 1.31%, ABC 343,456 / 1.27%, PSBC 91,524 / 0.95% for 2025 (with their published 2024 comparative values). They are expressly prohibited from being re-labelled as property NPL metrics.

## Derived-ratio and reconciliation policy

Four matching-scope 2025 checks reconcile after published rounding: ICBC mortgage 1.06%, ICBC corporate real estate 5.39%, ABC mortgage 0.92%, and ABC corporate real estate 5.40%. They are separate `DERIVED_FROM_ENTITY_DISCLOSURE` records and do not overwrite the published ratios.

PSBC mortgage candidate calculation is 0.6841% from the separately disclosed v0.21 balance, while the report publishes 0.69%; it is retained as `RECONCILIATION_MISMATCH`, not accepted as a replacement. PSBC corporate real estate is `CROSS_SCOPE_RATIO_DERIVATION_REJECTED`: the NPL table is domestic-branch scope while the v0.21 exposure is not an approved matching denominator.

## Prohibited interpretations

- NPL ratio is an accounting classification result, not PD, expected loss, realised loss, LGD, EAD or a stress-scenario default probability.
- Allowance/ECL, Stage 2, Stage 3 and overdue metrics are not silently substituted for property NPL or final economic loss.
- ICBC, ABC and PSBC are a disclosed bank sample, not the national banking sector. No sample aggregate can be extrapolated nationally.
- LGFV asset quality remains `UNKNOWN`; it is not inferred from infrastructure lending, local-government bonds or public-sector lending.

## Readiness

Corporate real-estate and mortgage asset quality are `OBSERVED_FOR_BANK_SAMPLE_ONLY`. National qualified bank quality is `QUALIFIED_WITH_LIMITATIONS`; LGFV direct asset quality is `UNKNOWN/BLOCKED`; formal bank loss calculation remains `BLOCKED`; causal validation remains `PARTIAL`. No PD/LGD/EAD or loss-allocation path has been created or upgraded.

## Revisions and immutability

Each derived record carries input IDs and input revisions. A revision to one input marks only its dependent derived record `STALE`; completed historical runs are never rewritten. The asset-quality registry is isolated from national `records`, loss allocation, household DSTI, developer cash flow and causal-estimation collections.
