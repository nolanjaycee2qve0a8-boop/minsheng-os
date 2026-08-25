# NBS historical re-export required

Generated from the six official CSV exports supplied in `sources/manul/nbs/`.
Their actual **target-series** rows, not their file names or unrelated rows,
determine coverage. Some files contain annual/non-target rows; these do not
extend the coverage of the target calibration series.

| Series | Current coverage | Unique periods | Status | Required coverage |
| --- | --- | ---: | --- | --- |
| Industrial Monthly YOY | 2026-07 only | 1 | REEXPORT_REQUIRED / SINGLE_PERIOD_EXPORT | 2018-01 to latest available |
| Retail Monthly YOY | 2026-07 only | 1 | REEXPORT_REQUIRED / SINGLE_PERIOD_EXPORT | 2018-01 to latest available |
| Retail YTD YOY | 2026-07 only | 1 | REEXPORT_REQUIRED / SINGLE_PERIOD_EXPORT | 2018-01 to latest available |
| Property Sales Area YTD YOY | 2026-07 only | 1 | REEXPORT_REQUIRED / SINGLE_PERIOD_EXPORT | 2018-01 to latest available |
| Property Sales Value YTD YOY | 2026-07 only | 1 | REEXPORT_REQUIRED / SINGLE_PERIOD_EXPORT | 2018-01 to latest available |
| Private FAI YTD YOY | 2026-07 only | 1 | REEXPORT_REQUIRED / SINGLE_PERIOD_EXPORT | 2018-01 to latest available |

Use the existing NBS flow: **Preview → Mapping → Stage → Review → Commit → Series Readiness**. A historical export is `MULTI_PERIOD_EXPORT` only at 24+ unique periods; calibration remains gated at N ≥ 36 matched REAL observations.
