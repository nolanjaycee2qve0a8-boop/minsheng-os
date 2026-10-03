# v0.13 本地问答后端（第二期离线实现）

本轮建立 `/api/analysis` 的请求、证据、边界与错误契约，以及经用户明确批准的 DeepSeek 证据选择适配器。v0.13 网页问答仅在本机 HTTP 页面请求这个 loopback 服务：五个推荐问题可直接使用；自然语言问题先由本机规则映射到一个已批准主题，不能映射的问题不调用模型。`file:` 页面和非本机页面不会发出请求。

## 运行

需要 Node.js 18 或更新版本，无新增依赖。在项目根目录运行：

```powershell
node server/analysis/service.js
```

仅监听 `127.0.0.1:4174`。可访问 `http://127.0.0.1:4174/api/analysis/health` 获取推荐问题与年份。服务不提供静态文件，也不启动网页服务。未设置密钥时 provider 固定返回 `EXTERNAL_PROVIDER_NOT_CONFIGURED`；不会有外部请求或模型费用。

网页的静态文件服务应运行在 `http://localhost:4173` 或 `http://127.0.0.1:4173`。问答窗口只连接固定的 `http://127.0.0.1:4174/api/analysis`，不发送浏览器凭据或 Referrer。服务未启动、未配置密钥、响应不符合受控契约或发生错误时，网页会显示本地边界说明，不会把它标记为 AI 回答。

POST `/api/analysis` 必须使用 `Content-Type: application/json` 和本地网页来源 `Origin: http://localhost:4173` 或 `http://127.0.0.1:4173`：

```json
{"question":"当前年份能看哪些证据？","year":"2021"}
```

请求只接受这两个字段；年份为字符串 `2017` / `2019` / `2021`，问题 1–500 字符，传输体最多 4096 字节。五个精确推荐问题保留；自然语言仅可被本机规则映射到“当前单年证据范围”“家庭财务承压（仅 2021）”“跨年比较边界”“已阻断研究边界”或“2026 年 8 月央行六项观测”。未匹配问题返回 `UNSUPPORTED_QUESTION`，不交给 provider。预测、因果、房地产、按揭、居民偿债、政策建议与风险评估均返回 `BLOCKED`，不交给 provider。未配置 provider 的常规描述请求返回 HTTP 503 和 `EXTERNAL_PROVIDER_NOT_CONFIGURED`，同时提供 `mode: LOCAL_POLICY` 的本地证据与原始来源引用；前端不得将其标记为模型回答。

跨年比较、已阻断问题及 2017/2019 财务承压问题直接返回 `BLOCKED`，不会调用 provider。2021 财务承压证据保留 `DESCRIPTIVE_2021_ONLY`，不升级为不限范围的 VERIFIED。引用复制现有 sourceRefs 的文件名、SHA、三联件字段；启动时校验整个仪表盘文件的固定 SHA，证据文件变化需要审查并更新后端绑定。服务不读取 TEMP 三联件或原始微观数据，不宣称重新验收来源。

## 本地配额与输出契约

- `MINSHENG_AI_PORT`：默认 4174。
- `MINSHENG_AI_REQUESTS_PER_MINUTE`：默认 10，最多 60，全服务共享。
- `MINSHENG_AI_DAILY_CALLS`：默认 100，最多 1000，按 UTC 天计数；只有未来启用的 provider 尝试消耗此槽位，失败也计数。
- 配额仅存内存，重启清零，不是生产级用户鉴权、持久账单或美元预算。
- 检索仅为全国现有聚合指标及 2021 财务承压比率，不做计算、插补或联接。
- provider 接口只允许选择已有证据句子的 1–8 个不同 ID，服务端重建回答文字，始终附上全部边界与来源。模型自由文字不进入最终输出。

## 已批准的 DeepSeek 外发合同

设置服务器环境变量 `DEEPSEEK_API_KEY` 后，服务只会向固定目的地 `https://api.deepseek.com/chat/completions` 发送当前选中年份命中的全国聚合证据句子：指标名称、既有中位数、有效 n、缺失/排除率、单位、单年边界，以及服务端固定选择指令；最多 12000 字符。自然语言原题只到本机 loopback 服务用于规则匹配，绝不会转发给 DeepSeek。不会发送整份知识库、微观记录、ID、自由输入、TEMP 路径、历史会话或文件。

密钥仅从服务器环境读取并只用于该固定目的地的 Authorization，不写入前端、文件、响应或日志。默认模型为 `deepseek-chat`；可用受限的 `DEEPSEEK_MODEL` 覆盖。请求禁止重定向，8 秒超时，响应最多 32 KiB，`max_tokens` 为 160。模型只能返回 1–8 个既有证据句子的 ID；服务端重建最终文字并继续附上来源与边界。测试使用内存 mock，不会实际联系 DeepSeek。

## 验证及部署限制

```powershell
node tests/v013-analysis-service-tests.js
node tests/v013-qa-loopback-contract-tests.js
```

测试直接调用 HTTP handler 或 browser-side mock，完全离线、无套接字。覆盖非法请求、提示词注入、年份限制、BLOCKED 拒绝、精确 sourceRefs 与数值、低 n、provider 禁用/错误/不合法输出、输入/响应体积、超时、配额并发、HTTP 来源控制，以及网页端 loopback 回退。

这是单机开发服务。Origin/Host 校验防止普通恶意网页访问，不代替用户认证，无法阻止本机进程伪造请求。公网部署前必须增加身份认证、持久配额与审计、TLS 和运维部署配置；不要将此服务绑定公网或直接做无认证公网代理。
