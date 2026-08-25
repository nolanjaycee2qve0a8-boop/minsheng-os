# v0.26 情景不确定性与区间边界引擎

v0.26 只对已经存在的情景运行做确定性边界评估。它不引入新数据、因果系数、概率分布、Monte Carlo、VaR/ES、自动置信水平或全国预测区间。

## 支持的输入

- 连续 range：必须有有限且单位一致的上下界；只有登记为 `PROVEN_MONOTONIC` 才评估端点。
- discrete set：对全部离散值进行穷举，稳定排序，不随机抽样。
- paired scenarios：只评估用户显式提供的成对参数向量。
- `UNKNOWN`：阻断运行，不会转换为上下界。
- `RESEARCH_PROXY_INTERVAL`：必须引用 v0.25 已审核、当前有效且具场景资格的候选参数；结果始终保留 `CONTAINS_PROXY_SCENARIO`。

## 组合方式与方法

| Mode | Method | 约束 |
| --- | --- | --- |
| `ONE_AT_A_TIME_RANGE` | `ONE_AT_A_TIME_EVALUATION` | 恰好一个连续范围 |
| `RECTANGULAR_BOUNDS` | `MONOTONIC_ENDPOINT_EVALUATION` 或 `EXHAUSTIVE_DISCRETE_GRID` | 必须声明全部组合可行 |
| `PAIRED_PARAMETER_SCENARIOS` | `PAIRED_SCENARIO_EVALUATION` | 不补全或推断缺失组合 |

默认最多运行 1,000 个确定性组合。超过上限会被阻断，绝不截断、抽样或静默省略组合。

## 输出与限制

每个 envelope 保存参数定义、输入指纹、实际组合、阻断组合、上下边界、argmin/argmax、单位、方法、规则版本、精度、告警、父运行引用和失效状态。运行历史不可变；上游运行或研究候选参数失效会精确标记依赖 envelope 和跨部门 case 为 `STALE`。

结果始终附带以下限制：

- 情景区间不是统计置信区间
- 区间内各参数组合没有自动赋予概率
- 研究区间不能自动外推为中国全国预测区间
- UNKNOWN不会自动转换为上下界
- 跨部门结果区间不能相加为总损失

v0.24 结果矩阵现在明示 point/range、lower、upper、方法、参数集引用、不确定性类型、概率状态、适用范围与限制。只有语义、区间类型、方法、概率状态和范围一致的 case 才能比较；所有跨部门总损失汇总继续阻断。

## 引擎接入

- v0.16：抵押利率、期限及其他显式按揭情景假设。
- v0.18：销售、回款、融资、购地与土地收入情景假设。
- v0.23：迁徙率、LGD、期限等银行样本情景假设；不改变其“拨备和资本吸收前毛情景信用损失”口径，也不外推全国。
- v0.25：仅显式审核过的研究代理参数；不会成为 REAL、默认参数或正式因果边。

`formalLoss` 仍为 `BLOCKED`，`causalValidation` 仍为 `PARTIAL`。
