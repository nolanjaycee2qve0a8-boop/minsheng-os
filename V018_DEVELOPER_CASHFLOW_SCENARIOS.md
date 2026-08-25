# v0.18 — 房企现金流与土地财政传导情景

## 证据与资格

本版本以国家统计局《2026年1—6月份全国房地产市场基本情况》为全国累计锚点。原始 HTML 保留在研究工作站，SHA-256 为 `AE82363BB34199514C8AC51EA28E309C3C4141C338E008C4F5E080B8FDF29AC4`。接受的 REAL 记录包括商品房销售面积 `40140` 万平方米、销售额 `37945` 亿元、房地产开发投资 `38074` 亿元、到位资金 `40233` 亿元，以及国内贷款 `5716`、自筹资金 `14740`、定金及预收款 `12442`、个人按揭贷款 `5137` 亿元。

这些都是全国房地产开发法人单位的 2026 年 1—6 月累计统计。销售额是销售活动/合同金额，不是实际销售回款；到位资金是实际用于房地产开发的货币资金累计口径，但不是完整会计现金流或自由现金；PBOC 的房地产开发贷款余额仍是存量敞口，不能加入期间资金流。

页面说明“利用外资”和“其他资金”属于到位资金定义中的分类，但未公布二者各自绝对量。已公布四项的总和与总到位资金差额为 `2198` 亿元；该值仅保留为对账差异，绝不自动映射为“其他资金”。

## 资金分类与安全派生

资金分类覆盖 `PROPERTY_SALES_ACTIVITY`、`DEPOSITS_AND_ADVANCES`、`INDIVIDUAL_MORTGAGE_RECEIPTS`、`DOMESTIC_LOANS_FLOW`、`DEVELOPER_LOAN_STOCK`、`SELF_RAISED_FUNDS`、`FOREIGN_FUNDS`、`OTHER_FUNDS`、`TOTAL_FUNDS_IN_PLACE` 以及未取得数据的融资分类。每项同时标识 `STOCK`、`FLOW`、`ACTIVITY_MEASURE` 等性质。

仅使用同期间、同范围的 REAL 输入生成 `DERIVED_FROM_REAL`：全国统计平均销售单价、已公布资金组成项占到位资金的比重，以及对账差异。每项保留公式、输入 observation ID 与 revision；任何输入修订都会令依赖的情景运行 `STALE`。平均单价不是房价指数，结构比重不是融资成本或偿债能力。

## Overlap policy 与现金桥

两种模式互斥：

- `SALES_BRIDGE`：`SalesCollectionsScenario = SalesAmount × CollectionRate`。回款率必须是显式且带来源的参数；定金及预收款、个人按揭到位资金和总到位资金不能再加入。
- `FUNDS_IN_PLACE`：直接使用官方到位资金总额作流入锚点；商品房销售额及销售回款不能加入。

桥接公式为：

`AvailableCashBeforeLand = OpeningLiquidity + EligibleInflows - MandatoryOutflows`

`CashAvailableForLand = max(0, AvailableCashBeforeLand - RequiredLiquidityReserve)`

`LEVEL_SCENARIO` 要求显式期初流动性、全部流入、建设/运营/税费/本金/利息/应付款/保交楼或监管刚性流出和储备；任何缺失都 `BLOCKED`。`DELTA_SCENARIO` 必须引用一条 LEVEL 基准运行，并以同口径、显式来源的流入/流出/储备变化计算增量；它不声称得到现金余额。

不会自动新增借款、削减刚性支出或将负缺口命名为违约。参数来源必须是 `OFFICIAL_OBSERVATION`、`AUDITED_ENTITY_DISCLOSURE`、`DERIVED_FROM_REAL`、`USER_SCENARIO`、`RESEARCH_PROXY` 或 `MODEL_ASSUMPTION`；`UNKNOWN` 与 `MOCK` 会阻断运行。

## 土地与财政传导

拿地变化仅可经显式 `FIXED_AMOUNT`、`PROPORTIONAL` 或 `PRIORITY_ALLOCATION` 规则产生。优先级份额不得超过 100%，少于 100% 的余额保持未分配，绝不自动归一化或默认全部拿地。

`GrossLandRevenueChange = LandPurchaseChange × TransactionRealization × PaymentRealization`

成交实现率、付款实现率、时间滞后、范围、国企/城投替代处理与价格/供地处理全部为显式输入。输出只能称为“土地出让毛收入情景变化”，带 `GROSS_NOT_NET_FISCAL_RESOURCE`。不计算地方净可用财政资源、一般公共预算损失、偿债缺口、LGFV 损失或公共服务削减。

## 隔离、readiness 与剩余缺口

每次运行不可变地保存锚点、版本、参数来源、重叠规则、对账、未分配余额、结果与限制。情景输出不会写入 REAL observation、部门资产负债表、正式损失分配或因果边。正式房地产链仍为 `DIRECTION_ONLY`；情景房地产链是 `READY_WITH_EXPLICIT_INPUTS`；地方净财政资源和正式数值损失均为 `BLOCKED`，总体因果验证仍为 `PARTIAL`。

仍需：实际销售回款、完整融资结构、刚性现金支出、到期债务、流动性储备、拿地弹性与时滞、国企/城投替代、土地净财政资源转换和城市级可比数据。下一版应优先补充可审计的上述真实输入，不应以情景输出替代它们。
