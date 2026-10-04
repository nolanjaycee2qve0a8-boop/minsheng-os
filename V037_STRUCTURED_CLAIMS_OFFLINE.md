# v0.37 结构化生成分析合同：仅离线准备

本地基线 `b6fff5c34b0958c7e46ed8633e951425fd0b920f`；最新远端 main 为 PR7 squash 提交 `d6f3f0cb4cc25f740654ef9a9e644209aaaff248`。main 文件树与 PR7 的 `2aa8169` 相同；b6fff5c 相对 main 仅多四个 v036 离线候选文件。本阶段从 b6fff5c 建立 `codex/structured-claims-offline-20261004`，不重移植 PR7，不推送、创建 PR、合并或发布，也不改 UI、既有 provider、网络或凭证。

## 这次比模板多了什么

| 阶段 | 正文能力 | 验证含义 |
| --- | --- | --- |
| v035/v036 模板 | 证据句及边界由本地规则重建；现有 DeepSeek adapter 只选择 ID | 不允许模型新增分析正文 |
| 本次离线 sandbox | 固定合成响应提供结构化 claim；允许新写的条件性假设/分析句，不强制等于原模板 | 事实字段可精确核对；自由假设和推断始终 HUMAN_REVIEW_REQUIRED，不是自动证实 |
| 将来真实受控生成 | 另行批准新 generation adapter、归一化摘要外传和费用后，模型可提出不同的分析句 | 仍需同等 schema/引用/依赖验证与人工复核；当前代码没有这一网络能力 |

当前没有真实模型输出，也没有声称完成自由自然语言问答。仅支持二十个现有验收问题到白名单摘要的确定性映射。未知/新地域/新时间/任意自由问题不能被偷偷当成已归一化问题；下一步需要另行扩展并测试本地归一化，而不是向外发送原题求模型自行解释。程序能检验字段绑定、结构和已知显式违约，不能证明自然语言推断的语义正确、因果可识别或逻辑完备。

## 最小接口与摘要白名单

`server/analysis/structured-claims.js` 导出 `createStructuredSandbox()`、`normalizeQuestion()`、`CATALOG`、`preflight()`。不启动服务，不加载 process.env、key 或网络 transport，不调用既有外部 provider。底层仍复用 v036 本地证据组织与 v035 citation gate；新 validator 独立重建可信语料，不信响应自带的来源、答案上下文或验证状态。

二十问题清单继承 v036。摘要仅包含以下五字段；额外 rawText、question、history、私有 ID、任意意图字符串均被拒绝：

```json
{
  "intent": "MECHANISM",
  "metricIds": ["LAND_GROSS", "PUBLIC_SPENDING"],
  "period": "2026-H1",
  "geography": "CN",
  "scenario": "NONE"
}
```

intent 限 LEVEL/SHARE/MECHANISM/GAP_REVIEW/SCENARIO/CAUSAL_SUPPORT/COMPARE_BASIS；metricIds、period、scenario 进一步限定为 CATALOG 中已登记的组合，地域仅 CN；重复 metric ID 拒绝，顺序无关。当前阶段不允许摘要任意拼接，避免把不存在的证据伪装成检索命中。

未来 payload 候选仅为 `contractVersion`、`questionSummary`、`approvedEvidence`。事实证据只投影 id/classification/value/unit/period/geography/scope/text；缺口和情景只投影 id/classification/text，不发送 raw 原件、原题、历史、路径、SHA、整份资料库或凭证。本轮实际外发为空；这些新字段外发未经本轮授权。真实生成还需加入固定 schema/system 合同并重新批准整个实际请求，不能直接套用以前 ID-only 外发许可。

## Structured claim 输出合同

顶层严格为 `{schemaVersion:"v037-claims-1", claims:[...]}`，最多32条，ID 唯一。未知字段及类型拒绝。没有任意自由 summary/conclusion 字段供模型绕开 claim 验证。

- FACT：只有 id/type/evidenceId/evidenceClassification/value/unit/period/geography/scope。仅引用 REAL/DERIVED，数值必须为有限 number，字段逐项严格相等；不接受模型事实正文。本地补入原证据句，validation 为 FIELD_MATCHED_TO_APPROVED_RECORD。这只是与已登记记录匹配，未重新验收原始材料，semanticTruthVerified=false。
- GAP：只有 id/type/evidenceId。只能引用本问题的已知 GAP/UNKNOWN/BLOCKED，本地补入缺口句，value=null；不能补零或删除 mandatory gap。
- ASSUMPTION：id/type/text/evidenceIds/dependsOn；text 必须显式以“假设”开始，引用合法。已有案例情景必须保留引用；自由假设不升级为观测。
- INFERENCE：id/type/text/evidenceIds/dependsOn/uncertainty/causalStatus；依赖必须指向此前的 claim，拒绝自环/前向引用/重复引用。引用必须由直接依赖的证据集合支撑，不能顺手挂一个无依赖来源。uncertainty 固定 HYPOTHESIS_ONLY，causalStatus 固定 NOT_IDENTIFIED。

所有自由 ASSUMPTION/INFERENCE 均标 `HUMAN_REVIEW_REQUIRED`、`semanticTruthVerified:false`、`displayAsVerified:false`；这些标签由校验器生成，provider 无权传入。限制文本长度、控制符/HTML、数字结果及明显“必然/已证实/因果已识别”等措辞；该拦截不是自然语言证明器，也不能识别所有隐含断言。尚未复核的自由文本只能作为待审核候选保存/阅读，未来 UI 不得呈现为 VERIFIED 答案。事实、已知缺口和已有情景引用必须完整保留，删空、丢 warning 或把情景当事实均拒绝。

没有新增中国全国因果系数、公共支出数据或居民总损失。机械情景数字仍来自已有案例，本阶段模型不得通过自由文字提出新数值；新增计算合同不在本轮。外国研究/代理参数没有自动纳入。

## 实际离线示例：土地收入下降与公共支出

运行 `createStructuredSandbox().run(CATALOG[7].summary)`。以下新分析句来自模块内固定合成响应，不是 DeepSeek；validator 也允许测试中另一份不同的新分析句通过结构校验，但仍要求人工复核。

- FACT f_0 → s_land_gross：9778亿元，2026-H1，全国 CN，LOCAL_GOVERNMENT_GROSS_LAND_TRANSFER。本地证据正文明确毛收入不是净财政资源。
- FACT f_1 → s_land_share：76.11%，2026-H1，全国 CN，LOCAL_GOVERNMENT_FUND_BUDGET，DERIVED。
- GAP g_2 → g_net_resource：成本、债务服务及净可用资源缺口未补齐。
- GAP g_3 → g_public_spending：没有获准的公共支出及响应系数。
- GAP g_4 → g_causal：并列观测不证明因果链；不得形成跨部门总损失。
- ASSUMPTION a_mechanism：“假设没有额外政策对冲，且其他财政资源条件不变。”引用 g_net_resource，依赖 g_2/g_3/g_4。HUMAN_REVIEW_REQUIRED。
- INFERENCE i_reasoning：“在上述假设下，土地毛收入减少可能收紧财政资源约束；但净可用资源还取决于成本和债务服务，因此不能从土地收入单独推出公共支出等比例变化。”依赖 f_0/f_1/g_2/g_3/g_4/a_mechanism，引用上述五项证据。NOT_IDENTIFIED、HYPOTHESIS_ONLY、HUMAN_REVIEW_REQUIRED。

本例输出 mode=OFFLINE_SYNTHETIC_GENERATION、providerUsed=false、externalRequests=0、actualCostMicroUsd=0。边界完整保留：情景不是预测、毛收入不是净资源、样本不是全国、UNKNOWN 不补零、流量/存量不得相加。它展示了可提议的新推理形式，而不证明新推理成立。

## 预算超限预检与真实接入限制

`BUDGET_EXAMPLE` 是合成预算测试配置：20个剩余调用槽、USD 1 的示例余额，输入上限6000、输出请求1600 tokens，以及非真实价目的测试费率。没有获批费用，也没有实际扣费。预检计算当前候选 payload 的 UTF-8 字节数作为离线输入 token 保守预算，按输入与完整输出上限向上取整预留；调用槽、余额、输入/输出额度不足时，在 mockInvocations=0 阶段拒绝。失败/非法响应也显示预留额，不把失败视为免费。

这是对传入的示例预算余额做纯预检，不是持久账本；调用方可重置示例状态，不能因此宣称具备生产美元硬限额。UTF-8 字节预算仅覆盖当前 sandbox payload，不含尚未实现的真实 schema/system prompt、消息协议或实际模型 tokenizer；真实接入必须用完整最终请求重新测算、加入协议开销，建立受信任的持久原子额度预留、计费核对、重启/并发/失败控制和账户/网关硬上限。新的1600-token生成额度不同于旧ID-only的160-token额度，须重新批准最坏费用。v036 的 USD1首次/20次与USD5月上限仍只是待批准建议，不能据本文自动启用真实调用。

## 验证与交付

聚焦 `node tests/v037-structured-claims-tests.js`，逐题覆盖二十个摘要和合成响应、不同的新自由句仍待审核、事实 wrong value/unit/period/geography/scope、恶意 ID、FACT/GAP 类型偷换、schema/重复/删空、依赖与无依据因果、raw/history 偷渡及预算超限预检；关联 v036/v035/v013/v034。测试登记 public manifest。独立复核使用6.1 Sol；最终 clean commit 运行一次 aggregate，不用旧提交结果替代。

本阶段真实 DeepSeek/模型质量、收费、key读取或配置、原题/证据外传、LIVE、私有原件、浏览器均 NOT_RUN；没有 UI 改动。不公开网站，不 push/PR/merge。合成响应不成为 REAL 数据记录。
