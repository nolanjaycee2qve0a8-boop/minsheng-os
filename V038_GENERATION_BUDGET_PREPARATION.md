# v0.38 generation adapter 与持久预算：离线准备

基线 `2ddcfd4b159b23c70088173776ae23f215304d1d`，本地分支 `codex/generation-budget-offline-20261004`。既有 main/PR7、UI 和 v013 provider 不改。本阶段没有 push、PR、merge、网站或服务部署；API 文档只读查阅不等于调用 API。

## 官方规格快照与拟用模型

2026-10-04 查阅的[官方价格页](https://api-docs.deepseek.com/quick_start/pricing/)列出 `deepseek-flash`，模型版本标示 DeepSeek-V4.1-Flash。拟议试点选择此别名并关闭 thinking。美元/百万 tokens 的峰值价格为：输入缓存命中0.006、输入未命中0.30、输出1.20。离线快照 `deepseek-flash-peak-20261004` 保留日期、来源 URL、版本和三项费率，不按更低的非峰值价格或假定缓存命中预留。价格可能变化，真实启动前必须重查，不能把此快照视为长期保证。

[官方 Chat Completions 规格](https://api-docs.deepseek.com/api/create-chat-completion/)支持 OpenAI 格式的非流式请求。适配器固定目标 `https://api.deepseek.com/chat/completions`，request 为 model、thinking（disabled）、temperature（0）、max_tokens（1600）、stream（false）、response_format（json_object）和两条 messages（固定 system 合同及白名单 user JSON）。不使用 tools、beta、文件/图片输入或用户可配置 endpoint。

读取 choices 中 assistant 的 content，解析为 v037 claim schema；仅自然完成的单个响应进入校验。usage 核对 prompt/completion/total，以及缓存 hit/miss 的合计；可选缓存细项须一致，关闭 thinking 时额外 reasoning token 非零会按计费未知处理。错误模型、空内容、截断、非法 JSON/claim 和错误 usage 均不能作为成功模型回答。

[官方 JSON 输出说明](https://api-docs.deepseek.com/guides/json_mode/)要求 JSON 输出格式及明确的 JSON 指令，也提示内容可能为空或截断。JSON mode 不是 claim schema 或因果证明，因此仍经过本地 v037 validator，自由推断始终待人工复核。

## 当前可运行的离线接口

- `generation-adapter.js`：`createGenerationAdapter({ledger, transport, timeoutMs})`；transport 必须是显式 OFFLINE_MOCK，返回 `{status,body}`。没有默认 fetch，不读 env/key，没有真实网络 transport。LIVE 类型或 liveEnabled=true 直接拒绝，默认无 transport 为 OFFLINE_NO_TRANSPORT。该声明标签不是任意回调的安全沙箱，注入者是受信任服务端代码；测试额外封锁 fetch/http/https/socket 入口，不能依靠标签误认为回调无法联网。
- `generate({requestId,summary})`：严格只接受这两个字段；summary 由 v037 CATALOG 重建，原题/history/private/raw 不能进入 payload。发起后使用捕获的 canonical summary 校验，不信后来变更的调用对象。最终 claims 和引用来自可信本地 gate；缓存重放也重新校验完整内容及元数据。
- 请求通过固定 URL、POST、禁止重定向、8000ms timeout、64KiB 响应上限的 transport 接口；未知异常不返回 provider 错误正文或本地私有路径。未来真实 transport 还必须在读取流时执行大小限制、AbortSignal、TLS 和安全 Authorization，本轮仅实现注入协议，未实现这个真实 wrapper。

未来实际外发候选 user JSON 仅为 `contractVersion`、`questionSummary` 和 `approvedEvidence`。摘要包含 intent/metricIds/period/geography/scenario；事实证据包含 id/classification/value/unit/period/geography/scope/text，其他证据仅 id/classification/text。当前20个已登记问题/组合及对应已验收的公开结构化证据限定集合。不发原题、历史、请求ID、私有文件、原始材料、路径、来源 SHA、整份库或凭证。完整来源链接和原件未重新验收的限制在本地输出中保留。新的摘要和 generation 语料外发仍待批准，不能沿用旧 ID-only 外发许可自动发送。

## 持久预算与防重复接口

`generation-budget.js` 是单进程/本地 POSIX scope 的 JSON 账本。调用方必须显式指定已有0700私有目录内的绝对文件路径；文件及临时文件0600，拒绝 symlink/公开权限。测试只创建临时目录，不创建真实试点账本或凭证文件。

reserve 在发起 transport 前，同步取得排他 `.lock`，校验固定 policy/价格版本，写临时文件、fsync、atomic rename、fsync 父目录，再释放锁。预算记录先落盘才可发送。每条请求持久保存 opaque requestId、完整请求 digest、UTC月份、价格版本、预留/对账额、状态、净化 usage，以及通过 gate 的本地结果；不保存 Authorization、key、原请求/响应 body 或错误正文。

同一 ID+digest：同 adapter 并发共享一个 promise；其他实例或重启看到 RESERVED/UNKNOWN 只返回 REQUEST_HELD_NO_RETRY，不重复发送；SETTLED 重放净化缓存，不消耗新尝试。同 ID 不同摘要/证据/payload 则拒绝。幂等是本应用保证，不假定 DeepSeek 提供同等服务端幂等协议，不自动重试、不把“超时可能没收费”当作退款依据。

本候选 policy 为 PENDING：最多20个累计尝试、首轮总额USD1、月额USD5、输入包络6000、输出上限1600。这些只是待批准的上限建议，不是消费授权。可配置更小的 attempts/总额/月额，不能扩张建议上限；配置或价格版本变化不会静默重建旧账本。尝试不会在重启或跨月时重置；本轮是一个20次的有限试点，不是长期运营配额系统。

按峰值全输入未命中计算，每次预留 `6000×0.30/1M + 1600×1.20/1M = USD0.003720`，20次包络为USD0.0744；USD1总额是更宽的建议应用上限，不代表必须花完。账本按整数micro-USD向上取整。完整请求序列化字节及1024字节协议余量超过6000时先拒绝；这仍是未实测的保守估计，不是官方 tokenizer 证明。真实试点前要确认完整 system/schema/message 的输入计量余量；价格/输入上限假设不成立时上述包络也不成立，不能承诺账单绝对封顶。

HTTP/transport错误、timeout、缺失/不一致 usage、未知模型等保留全额预留，状态 UNKNOWN；拒绝回答但已有可信 usage 时，照样对账并计一次尝试。实际 usage 按 pinned hit/miss/output 单价核算，释放已知差额；超出 token包络/预留即记录实际估算额、冻结新请求，不隐藏超支。这里对账的是 reported usage×已核对价格，不是取得了 provider 最终发票。未知账务可由受信任操作者调用 reconcileUsage，依据独立取得的可信 usage 对账，但不会重发请求或生成新答案。

锁忙、损坏账本、版本不一致和权限异常均 fail closed。进程崩溃留下 `.lock` 时不会自动抢锁；操作者须确认所有使用该账本的进程停止，保留/检查账本和未决预留后才可移除孤立锁，不能删除预算记录退款。普通重启不会丢失计数；删除/回滚/复制账本、磁盘故障、特权篡改、多个主机/存储副本不在此单机模型内。本实现控制共享此账本的本应用请求预算，不能控制其他脚本/账户用户的花费，也不能替代账户层上限或保证 provider 账单绝对硬封顶。

## 真实试点审批清单：本阶段完成后停止

1. 批准主体/账户与调用目的：20个获准 topic 的受引用约束分析，生成结果仍需人工复核；不批准一般无边界问答或新语料。
2. 目标与模型：固定 api.deepseek.com 的 /chat/completions，deepseek-flash；非 thinking、非流式 JSON、最多1600输出 tokens。启动当天核对模型别名实际版本、当前价格与 usage；需要变更时重新审查快照与持久账本迁移，保留累计成本/未决请求。
3. 最多20次尝试，首轮USD1、月USD5建议上限，失败/未决也占槽；批准完整输入6000包络的计量依据和本应用预算范围。当前费率条件下预留USD0.003720/次。批准不等于账户总花费硬限额保证。
4. 明确批准上述新 payload 白名单逐字段及对应公开证据集合；不外发原题、会话、私有原件或更大资料包。
5. 指定持久私有账本位置、唯一服务进程、操作者及停止/撤销方法；真实上线前验证重启、锁、原子落盘、并发、权限、usage与账单差异处置，不能用临时账本或重新建账绕开计数。
6. 凭证由获授权操作者在服务端 secret manager 或短生命周期服务进程环境配置，通过真实 transport 注入 Authorization；不要在 chat 发 key，不写仓库/.env/前端/日志/账本。当前代码未读取、配置或验证真实 key；批准后才增加受审的 credential/network wrapper 和 LIVE授权门控，claim/预算核心无需大改。
7. 计划没有新 API 域名：沿用既有 api.deepseek.com；api-docs.deepseek.com 仅本轮官方文档只读。仍需批准启用实际出站及新的内容范围，确认运行环境现有 allowlist；若要求新增目的地、代理或重定向，另行批准，不能自动放宽网络。

## 验证

v038 覆盖20 topic 的 request/response、字段白名单、LIVE拒绝、无key/无默认网络、并发同ID与多实例、独立进程重启、未知失败预留、usage核算/异常、截断/非法claim、超包络冻结、缓存篡改、输入对象后改、ledger损坏/锁/权限及小预算拒绝。全测试为stub/mock；既有真实原件限制及UNKNOWN保持。真实DeepSeek/收费/credentials/network wrapper、LIVE、私有原件、浏览器均NOT_RUN，无UI改动。
