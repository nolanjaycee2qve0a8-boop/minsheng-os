# v0.17 — Income Distribution & Mortgage Cohort Scenarios

The v0.17 evidence model separates `GROUP_MEAN`, `QUANTILE_POINT`, marginal, joint, sample and scenario distributions. NBS 2025 national income values are annual **per-capita** observations. The five quintile values are group means, not cut-points, household income, income totals or mortgage allocations.

The cohort engine reuses `MinshengMortgageScenario.calculate` from v0.16. It accepts explicit balance amounts or shares, reconciles them against PBOC's ¥36.29tn personal-housing-loan balance, preserves any `UNALLOCATED_RESIDUAL`, rejects over-allocation, and aggregates covered cohorts only. Scenario weighted rate/term results are `DERIVED_FROM_SCENARIO`, never official REAL.

Income and mortgage marginals are never joined automatically. Group DSTI is blocked unless the user creates a `SCENARIO_JOINT_DISTRIBUTION`; such output is `NOT_OBSERVED`, `NOT_OFFICIAL` and `NOT_FORMAL_DSTI`. No threshold, default, loss, delinquency, national DSTI or causal upgrade is generated.

Official policy evidence provides pricing/repricing context only. It does not establish national fixed/floating shares, remaining terms, repayment-method shares or a contract distribution. Bank disclosures and research surveys remain separate source classes and cannot be extrapolated to national REAL facts.
