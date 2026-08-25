# Public Reproducibility

公共基线为 v0.33.1，公共 CI 使用 Node.js 22 与 Python 3.11，并只运行离线、确定性的公共测试。`node tools/run_public_ci.js` 的 manifest 是唯一的测试分类来源：它会验证公共边界、fixture 隔离、selector population、Python 用例、语法、compile 与 clean export。分类不绑定某一个 `main` 提交，因此合并和后续文档更新都继续受同一内容不变量约束。

local-only 验证需要用户自行从原始发布者取得银行年报或其他原件；缺少原件时状态必须是 `LOCAL_SOURCE_VALIDATION_NOT_RUN`。真实 Chromium/Edge 审计是本地增强验证，公共 CI 明确记录 `LOCAL_BROWSER_VALIDATION_NOT_RUN`。LIVE acquisition、审批与 REAL materialization 不在公共 CI 中运行。

公开 tree 只含结构化事实、来源定位、SHA、公式、审计元数据和原创测试 fixture；不含第三方原始 PDF、HTML、ZIP 或下载响应。`LICENSE_REVIEW_REQUIRED` 不代表已获得再分发授权，详见 [第三方数据边界](THIRD_PARTY_DATA_BOUNDARY.md)。

GitHub Actions 依赖均固定到经上游发布标签核验的完整提交 SHA，并保留可读的版本注释。仓库当前没有开源许可证。公共测试可复现软件边界，不替代原始资料核验，也不授权第三方内容再分发。
