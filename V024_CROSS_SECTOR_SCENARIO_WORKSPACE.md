# v0.24 — 跨部门情景工作台

v0.24 将 v0.16 居民按揭、v0.17 cohort、v0.18 房企/土地财政和 v0.23 银行信用损失运行组织为不可变的 scenario case。它只保存子运行引用与快照语义，不重算、不改写子引擎，也不创建跨部门传导系数。

## Default boundary

所有 case 均为 `CROSS_SECTOR_SCENARIO_ONLY`，正式状态是 `NO_CROSS_SECTOR_TOTAL`。人民币单位相同不构成可加资格：月供、现金缺口、毛土地收入变化、敞口存量和银行毛情景信用损失必须并列展示。

工作台阻断存量/流量、期限、地理、人口范围、银行样本/全国、共享敞口、毛收入/净资源和跨引擎语义不一致的聚合。政策资源仅可作为 `POTENTIAL_ABSORPTION_RESOURCE` 另列，不自动抵扣任何结果。

## Integration and matrix

支持引用 v0.16、v0.17、v0.18、v0.23 的稳定 run ID；并可通过 v0.23 API 创建新的、仍须通过自身参数/范围门禁的子运行。结果矩阵保留 sector、engine、run ID、measure、unit、stock/flow、time basis、horizon、geography、population/exposure scope、classification、readiness、overlap group 和限制。

v0.24 的统一 shock manifest 仅登记参数。没有显式用户桥接时，其映射状态为 `NO_VALIDATED_MAPPING`；房价、销售、收入、土地收入或房企现金缺口不会自动变换为银行迁徙率、LGD、违约率或损失。

## Lifecycle

case 首次创建即冻结；修改通过 `forkCase` 生成新 ID 并保留 parent reference。底层 child run stale 后，仅引用它的 case stale，随后只使依赖该 case 的 comparison stale；旧 payload 不重算也不覆盖。Overall Causal Validation 保持 `PARTIAL`，formal loss 保持 `BLOCKED`。
