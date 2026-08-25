# v0.21 Bank Property and LGFV Exposure Evidence

This is an isolated audited-entity disclosure layer, not a national banking series. The accepted records are three explicit personal/residential mortgage balances and three explicit corporate real-estate-industry loan balances from the 2025 annual reports of ICBC, ABC and PSBC. Each record retains the official file SHA-256, page, printed page, table, row, 2025 amount column, raw value and unit. They never enter national `records`, DSTI, property cash-bridge, loss or causal engines.

Extraction used `pypdf 6.10.0` against the official English versions. Every accepted page was rendered from the original PDF at 250 DPI with Poppler `pdftoppm 26.05.0` and marked `VISUALLY_VERIFIED_BY_CODEX`; OCR was not used. ICBC and PSBC Chinese files are retained as `SAME_REPORT_DIFFERENT_LANGUAGE_VERSION` support material, not duplicate economic evidence.

The scope is deliberately heterogeneous: ICBC corporate real-estate lending is `DOMESTIC_BRANCHES`; ABC and PSBC are `CONSOLIDATED`. They must not be summed or extrapolated to national banking. A loan balance is not a loss; an NPL ratio is not PD; an allowance/ECL is not a realised loss; Stage 2 is not NPL.

LGFV is `UNKNOWN` / `BLOCKED`: reviewed material discusses risk management but contains no direct, scope-defined numeric LGFV exposure suitable for a formal record. Infrastructure, construction, public-sector loans and local-government bonds are not substitutes for LGFV exposure.

The full file and cell-level audit is in `sources/official-v021/manifests/extraction-audit-v021.json`; official-file acquisition and language-version links are in `sources/official-v021/manifests/live-acquisition-v021.json`.
