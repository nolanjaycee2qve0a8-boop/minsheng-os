# v0.25 Causal Evidence & Parameter Qualification Lab

## Boundary

Research evidence is separate from official observations. A study result can only be `RESEARCH_EVIDENCE`, `CAUSAL_PARAMETER_CANDIDATE`, `RESEARCH_PROXY`, or `DIRECTION_ONLY`. It cannot be a China-national `REAL` observation, default parameter, formal loss input, or automatic causal conclusion.

## Live acquisition

The audited live manifest is `sources/research-v025/manifests/live-acquisition-v025.json`. Eleven public originals were saved under the git-ignored `sources/research-v025/raw/` directory and SHA-256 checked. Two source servers returned 403 and are retained as failed acquisition records, not substituted with secondary summaries. The audit records version family, working-paper/publication relationship, status and local locator.

Eight target edges have a query and an outcome record. The evidence set contains at least eight qualified local sources, three China-related studies, and three studies with reviewed causal or causal-with-limitations designs. Absence of a direct estimate remains an explicit gap.

## Extraction and qualification

Each estimate keeps its study/version ID; table, page, panel, row, column and specification; coefficient, uncertainty (or `UNKNOWN`); treatment/outcome units; horizon; subgroup; weighting; transformation and limitations. `extraction-audit-v025.json` records all twenty causal-review dimensions and conflict examples. No coefficient transformation is performed in v0.25.

Identification classes distinguish causal designs, association, structural calibration, theory and descriptive work. Association cannot become a causal parameter. A local average treatment effect, a short-run treatment, a standardised coefficient, a log coefficient, an odds ratio, or an effect with unresolved units remains in its original form.

Transferability separately assesses geography, institutions, sample period, borrower/developer/bank type, leverage, housing market, mortgage recourse, rate regime, local-government finance, outcome, shock magnitude and horizon. Strong identification outside China is still not a China-national parameter.

## Candidate and edge review workflow

Candidates have one of `DIRECT_RESEARCH_SCENARIO_CANDIDATE`, `RESEARCH_PROXY_ONLY`, `DIRECTION_ONLY`, `NOT_NUMERICALLY_USABLE`, `BLOCKED`, or `REJECTED`. There is no default candidate. Every v0.25 candidate is prohibited from REAL and formal-loss paths.

The lab creates `CAUSAL_EDGE_REVIEW_PROPOSAL` records only. It does not alter `data/causal-edge-validation.js`; the overall state remains `PARTIAL`. Supporting and opposing studies remain separate study clusters, and no automatic meta-analysis or coefficient average is generated.

## Explicit v0.24 bridge

`bridgeToV024` requires: a reviewed candidate, matching target edge, evidence locator, explicit `RESEARCH_PROXY` or `USER_SCENARIO` mode, explicit confirmation, and new child-run and case input. It blocks association, `DIRECTION_ONLY`, unit/scope ambiguity, stale/superseded/retracted candidates, missing locators and cross-edge reuse. A successful bridge creates a new child run and a new v0.24 case marked `CONTAINS_PROXY_SCENARIO`; it leaves earlier cases immutable and does not propagate to another edge.

## Revision and staleness

Candidate revisions retain the prior object and mark it `SUPERSEDED` or `RETRACTED`. Only child runs citing the affected candidate, and their dependent v0.24 cases/comparisons, become stale. Historical outputs are retained unchanged and retracted candidates are blocked for new scenarios.

## User-facing warnings

- 研究系数不是官方统计数据
- 相关性证据不能自动升级因果
- 国外或局部样本系数不能自动外推中国全国
- 参数只能在显式研究情景中使用
- 系统不会自动选择或传播研究参数

## Acceptance

v0.25 is accepted with limitations only if the manifest, audit, seed data, qualification gate, explicit bridge and regression suite all pass. It does not solve the missing China-national developer cash-flow-to-land-purchase, mortgage-migration, or bank asset-quality causal estimates.
