# v0.19 — 国际统计数据供应商接入底座

## 范围

v0.19 增加 provider-neutral 国际统计接口，支持 World Bank Indicators API V2 与 DBnomics Web API V22 的能力登记、原始响应 manifest、统一观察值、概念注册、来源比较和精准 STALE。国际观察值仅用于国际比较参考，不能进入损失、DSTI、房企现金桥或因果验证。

## LIVE 数据

World Bank 官方 API 直连取得 CHN、USA、JPN、KOR、DEU 的 2018—2024 年度 GDP（现价美元）、实际 GDP 增速、人均 GDP、人口、城镇化率与 CPI 通胀；批量响应包含 210 条期间观察值，界面登记每个概念/国家的最新 2024 年值。

DBnomics 路径冻结 `WB/WDI` 的五条年度名义 GDP series 以及 `IMF/IFS/M.CN.PCPI_IX`。DBnomics 永远标记为聚合再分发；WB/WDI 与 World Bank API 的同源 GDP 只作为 `SAME_UPSTREAM_DUPLICATE`，不增加证据数量。IMF 月度 CPI 指数与 World Bank 年度 CPI 通胀是 `SEMANTIC_MISMATCH`，不进行数值冲突判断。

所有 raw 响应保留在 `sources/official-v019/raw/`（Git 忽略）；manifest 保存 endpoint、上游、内容类型、大小、SHA-256 和缓存标记。World Bank 与 DBnomics provider 的公开再分发条款未在本版本完成法律审阅，均为 `LICENSE_REVIEW_REQUIRED`。

## 安全规则

- World Bank 直连：`INTERNATIONAL_OFFICIAL_DIRECT`。
- DBnomics：`AGGREGATOR_REDISTRIBUTED_OFFICIAL`，并保存 `provider/dataset/series`。
- 空值保留 UNKNOWN；没有历史 vintage 不宣称 PIT 或 revision history。
- `ACTUAL`、`PROVISIONAL`、`ESTIMATE`、`FORECAST`、`SCENARIO`、`UNKNOWN_STATUS` 独立；DBnomics 首批未提供可审计 observation-status 时保留 `UNKNOWN_STATUS`。
- 中国 NBS/PBOC/MOF 直采优先，v0.18 商品房销售、到位资金、平均销售单价和土地出让收入不被国际近似序列覆盖。

## 缺口

家庭债务、政府债务、房价指数、房价收入比、住房投资、住房贷款、基尼和居民消费等概念尚未形成 v0.19 资格映射，保持 UNKNOWN。下一版应在许可、频率、口径和实际/预测状态确认后逐项接入，而非用相邻序列补齐。
