# Contributing

请通过 feature branch → 测试 → Draft PR → CI → merge 的流程协作，不直接提交到 `main`。

- 不提交原始 PDF、HTML、下载缓存、token、密钥或 Cookie；
- synthetic fixture 永远不能升级为 `REAL`、LIVE acquisition 或正式证据；
- 银行样本不得外推为全国估计；
- 新数据必须保留来源 URL、SHA-256、Evidence Locator、统计期、口径和 revision 线索；
- `UNKNOWN` 不得补零；
- scenario 运行不得写入 `REAL`，也不得改变历史运行；
- 在提交 PR 前运行 `node tools/run_public_ci.js`。

涉及本地原件的验证必须保持 local-only，并明确报告未运行状态；不得把本机资料设为公共 CI 的依赖。
