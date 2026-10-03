# v0.13 官方数据准入基线盘点

盘点日期：2026-09-27  
盘点方式：只读检查本地来源登记与历史运维清单；没有执行采集、联网、解析或提交。

## 盘点结论

现有官方数据运维框架可以作为实时/定期数据接入的控制平面，但当前历史清单不能作为新的知识库事实来源。

- 被盘点清单：`sources/official-v030/manifests/live-acquisition-v030.json`
- 清单 SHA-256：`0BD957D4B560EC23ED56127762B652E7130817AD99C20134152B1122429FB55D`
- 该清单的参考日：2026-08-22，不代表 2026-09-27 的实时状态。
- 历史清单记录过网络使用；本次盘点没有网络使用。
- `stagedCandidates` 为 0，`semanticDiffs` 为 0，`approval` 为 `null`，`submission` 为 `null`。

因此，当前没有任何来自该运维清单的内容可以自动进入 v0.13 证据视图、问答上下文或知识库已验收层。

## 已登记的发布系列

共 17 个发布系列，覆盖 12 个提供方：

| 提供方 | 系列数 | 当前基线含义 |
| --- | ---: | --- |
| NBS | 3 | 家庭收入消费、房地产活动、GDP 实际值；仍需逐次验证 |
| PBOC | 3 | 金融统计、贷款投向、按揭政策；仍需逐次验证 |
| MOF | 2 | 财政收支资金、地方政府债务；仍需逐次验证 |
| ABC、BIS、CCB、DBNOMICS、ICBC、IMF、OECD、PSBC、WORLD_BANK | 9 | 登记或发现用途；不构成已验收数据 |

来源健康基线：7 个 `DEGRADED`、7 个 `UNKNOWN`、1 个 `CONTENT_TYPE_MISMATCH`、1 个 `HTTP_BLOCKED`、1 个 `LICENSE_REVIEW_REQUIRED`。这些状态都是拒绝自动发布的理由。

## 历史运维结果

| 流程阶段 | 历史状态 | 准入解释 |
| --- | --- | --- |
| RELEASE_DISCOVERY | COMPLETE | 仅发现声明路由 |
| ROUTE_RESOLUTION | COMPLETE | 仅确认候选路由 |
| RAW_ACQUISITION | COMPLETE | 不等于内容可用 |
| CONTENT_VALIDATION | FAILED | 后续阶段不能继续 |
| PARSER_STAGING / SEMANTIC_DIFF / QUALIFICATION | BLOCKED_BY_CONTENT_VALIDATION | 未形成候选、语义审查或资格结论 |
| MATERIALIZATION_PREVIEW | NOT_RUN | 没有可审阅的展示预览 |
| APPROVED_SUBMISSION | NOT_RUN | 没有进入知识层的授权 |

历史路由结果为 8 个 `ACQUIRED`、1 个 `CONTENT_REJECTED`、4 个 `HTTP_FAILED`、4 个 `NETWORK_FAILED`。其中 `ACQUIRED` 只表示当时获取到内容，不能替代定义、版本、单位、语义差异和审批核验。

## 下一步：最小离线演练

建议先针对一个不含微观数据的官方聚合发布，使用人工提供或已获许可的离线 fixture 演练以下内容：

1. 固定发布身份、内容哈希、统计期、单位、地域和版本；
2. 只在候选层生成解析草稿与语义差异；
3. 验证失败、修订和 `STALE` 路径均为 fail-closed；
4. 生成不写入仪表盘的物化预览；
5. 只有负责人提供绑定 run 与 candidate 的审批记录后，才讨论是否更新已验收知识层。

在这次离线演练完成前，不启动定时 watch，不采集外部数据，也不把任何“实时”内容发送到 DeepSeek 或展示在网页上。
