# v0.28 中国实际 GDP 机构预测 Vintage 基准包（Wave 1）

v0.28 只覆盖 `CHINA_ANNUAL_REAL_GDP_GROWTH` 的 2023–2025 年。它复用 v0.27 的预测—结果门禁，不创建预测模型，也不把 scenario、estimate、政策目标或当前数据库值转换成历史预测 Vintage。

## 已取得的官方材料

本地 SHA 审计已保存 4 个 World Bank 原件和 4 个 NBS 原件。World Bank June 2023 Table 1 给出 2023/2024/2025 的 5.6%、4.6%、4.4% 预测；December 2023、December 2024 和 June 2025 官方发布页/报告提供后续 Vintage。NBS 首次发布实际增长为 2023 年 5.2%、2024 年 5.0%、2025 年 5.0%；2024 年最终核实维持 5.0%。

所有来源路径、SHA、提取口径和失败入口见 [LIVE acquisition manifest](sources/official-v028/manifests/live-acquisition-v028.json) 与 [extraction audit](sources/official-v028/manifests/extraction-audit-v028.json)。原始文件仅存于 Git 忽略的本地审计目录。

## IMF 多入口恢复

IMF 主站的 5 个历史 PDF/附件入口仍返回 HTTP 403，且每条 URL、方法、状态与 MIME 均保留在 manifest；它们没有被当作缺失数据的替代品。随后从主站 landing page 发现并取得 IMF 自有 eLibrary 的同版 WEO 正式章节原件：October 2022、October 2023 与 October 2024 各一条独立 release identity。前两条从 HTML 中的明确预测句提取；October 2024 从官方章节 PDF 的 printed page 34、Annex Table 1.1.2 提取，表头明确标注 `Projections`。PDF 的 magic bytes、MIME 和 pypdf 解析均已验证，视觉核验状态仅记为 `VISUALLY_VERIFIED_BY_CODEX`。

三条 IMF 预测分别为 2023 年 4.4%、2024 年 4.2%、2025 年 4.5%，全部早于对应 NBS first-release actual，均为 `SOURCE_PUBLISHED_FORECAST` / `PRE_YEAR`。每条保留 local raw file、SHA-256、行或页表定位、raw field 与 forecast-status 依据；同一 2024 WEO 的 HTML 和 PDF 仅为 supporting artifacts，不重复计数。

## 选择与评价

每个 provider/target year/time bucket 的最早合格官方预测被确定性标记为 `PRIMARY_BENCHMARK`；后续版本为 `ADDITIONAL_VINTAGE`。选择不读取误差。GDP 误差一律为百分点；更晚 Vintage 永远附带 `LATER_VINTAGE_HAS_INFORMATION_ADVANTAGE`。

v0.27 的 World Bank 2025 anchor 以引用方式保留，未复制或覆盖。首次发布与最新版本分开；修订或 benchmark rule 变化会精准标记依赖评价和 aggregate 为 `STALE`。

## Wave 1 状态

现有 2 个 provider、9 条合格 Vintage（World Bank 6、IMF 3）、3 个 target year、两个 bucket，以及至少 6 条 first-release evaluation 和 2 条 provider/bucket descriptive aggregate，达到 Wave 1 的硬门槛。后期 Vintage 具有信息优势，样本仍不足以形成机构排名。

`v0.28 Overall Acceptance: ACCEPTED_WITH_LIMITATIONS`
