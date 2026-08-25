# 民生 OS v0.14 — Official Critical Exposure Acquisition, Wave 1

## Scope and acceptance boundary

Wave 1 adds only traceable observations from original official sources. A non-empty value is never sufficient to unlock a loss parameter. The intake keeps source document, raw-artifact SHA-256, locator, field, period, parser version and mapping version together.

At Wave 1 completion, the metadata-only local inventory at `sources/official-v014/manifests/local-source-inventory.json` contained 31 source-like local artifacts: 6 confirmed original-official artifacts and 25 user-supplied/external or unverified artifacts. The inventory is now refreshed by later official waves. Raw official HTML is deliberately excluded from Git at `sources/official-v014/raw/`; the manifest and record provenance retain relative paths and checksums only.

## LIVE acquisition result (2026-08-20)

| Institution | Official release | Result | Accepted Wave 1 use |
| --- | --- | --- | --- |
| NBS | 2026年上半年居民收入和消费支出情况 | HTTP 200, SHA-256 `04FF31C146E6D8CF59152AFCCB12478741CE260C0A12E8A86F6DADCB3F09E192` | Household-income direction anchor only |
| PBOC | 2026年上半年金融统计数据报告 | HTTP 200, SHA-256 `C37B01A8B99F3D2F4A99071394665A566A3C129B4F3EA5486B839B9DE449484E` | Household-credit direction anchor only |
| MOF | 2025年财政收支情况 | HTTP 502 | No observation accepted |
| MOF | 2025年全国地方政府债务相关表 | HTTP 502 | No observation accepted |

Accepted NBS records preserve the published first-half cumulative, per-capita semantics: national income 22,981 yuan, urban 30,126 yuan, rural 12,699 yuan, national nominal year-on-year growth 5.2%, and real growth 4.2%. None is scaled to a household-sector total or decomposed to a quarter.

The PBOC record preserves the published statement that household loans decreased by 3,668亿元 (366.8 billion yuan) in the first half as a `-3668` 亿元 cumulative flow. It is **not** a personal-housing-loan balance, mortgage rate, maturity, or debt-service measure.

## Qualification and calculation discipline

- `household_income_per_capita_national_h1_2026` is `QUALIFIED_WITH_LIMITATIONS` only for `HOUSEHOLD_INCOME_DIRECTION_ANCHOR`.
- `household_loan_change_h1_2026` is `QUALIFIED_WITH_LIMITATIONS` only for `HOUSEHOLD_CREDIT_DIRECTION_ANCHOR`.
- The household/debt/liquidity and property/developer/local-fiscal chains remain `DIRECTION_ONLY`.
- No `CALCULATED` loss, debt-service, liquidity, fiscal-resource, LGFV, or property-developer result is created in this version.
- The existing PBOC REAL records are reviewed as REAL. The new broad household-loan flow remains explicitly scoped and cannot be remapped as a mortgage balance.

## Interfaces

`window.MinshengOfficialWave1Intake` provides strict parser, staging, review and reporting helpers. The parser rejects a source if its expected title/context/value markers are absent; it does not infer values from arbitrary digits. Its staged candidates retain source and raw artifact IDs, checksum, parser version and mapping version. Seeded REAL records correspond only to successfully fetched original artifacts and remain idempotent by ID.

The critical-exposure page receives a compact Wave 1 status panel after the existing v0.13 view renders. Local persistence retains Wave 1 reports, staging/review arrays and qualification results without storing raw HTML in browser state.

## Remaining acquisition gaps

The next acquisition wave needs original official, locatable observations for:

1. household total disposable income or compatible aggregation basis;
2. personal housing-loan balance, rate and repayment/maturity structure;
3. developer cash flow, debt, repayment and financing structure;
4. land-use-right transfer income plus net available fiscal resource/transfer treatment;
5. local government legal debt, maturity and interest-service structure; and
6. bank real-estate, mortgage and LGFV exposures with coverage, vintage and revision checks.

MOF source availability is a current intake blocker, not a reason to use a secondary source, proxy, or fabricated value.
