'use strict';
const { renderLocalIncomeEvidence } = require('./local-income-evidence');
const INCOME_PAGE=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>两期收入证据与程序计算</title><style>body{font:17px/1.7 system-ui;max-width:900px;margin:32px auto;padding:16px;color:#153e38;background:#f6faf8}section,article{background:white;border:1px solid #bccfc8;padding:20px;margin:16px 0}button{padding:12px;font:inherit}pre{white-space:pre-wrap;overflow-wrap:anywhere}a,code{overflow-wrap:anywhere}</style>
<h1>两期收入证据与程序计算</h1><p role="alert">账本待对账，真实发送暂停。历史应用记录声明一次调用，预算链缺少预留记录，原因未证实。本版本没有解除或重新授权入口；刷新、跨日、重启不解除挂起。</p>
${renderLocalIncomeEvidence()}
<p>下方模型结果区与本地证据区分开。本轮未进行模型分析；既往接口链验收不代表自由分析能力已通过。</p>
<section><h2 id="question">这些变化说明什么，不能据此推断什么？</h2><button id="send" disabled data-reconciliation-hold="true">真实发送已暂停</button><p id="notice" role="status">尚未发送；本页面没有读取密钥的入口。离线问答与模拟测试不受此限制。</p></section>
<h2>当前结果</h2><section id="current">尚无结果。</section><details id="history"><summary>历史结果（默认折叠）</summary><div id="history-items"></div></details>
<script src="/modules/income-explanation-panel.js"></script></html>`;
module.exports={INCOME_PAGE};
