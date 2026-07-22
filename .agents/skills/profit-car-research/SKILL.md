---
name: profit-car-research
description: 执行用户口令“我要赚钱攒钱买车”对应的A股全市场收盘研究，输出可供PDF和公众号复用的market_review.md、market_data.json与来源记录。只负责事实研究和交易计划，不负责PDF排版或公众号营销。
---

# A股赚钱效应研究技能

## 职责边界

本技能是流水线第一阶段，只做联网研究、结构化结论和交易计划。

- 不生成PDF；
- 不做公众号标题或营销排版；
- 对外正文中不得出现内部触发口令“我要赚钱攒钱买车”；
- 不根据旧报告冒充今日数据。

## 日期与交易日门禁

1. 使用北京时间确定绝对日期 `YYYY-MM-DD`。
2. 核验当天是否为中国大陆A股交易日。
3. 核验完整收盘数据是否已经发布。
4. 若休市、未收盘或数据不完整：停止流水线，不生成空报告，并说明原因。

## 联网研究要求

- 运行时联网获取；
- 核心数据至少双源交叉核验；
- 最新、可变数据注明来源和日期；
- 涨停、连板、晋级率、炸板率存在口径差异时保留口径说明；
- 无法确认的字段写 `null` 或“公开源未确认”，禁止猜测。

## 固定研究顺序

1. 市场赚钱效应；
2. 风格载体；
3. 板块方向；
4. 个股分层；
5. 买点与确认条件；
6. 仓位。

必须覆盖：

- 沪深主板、创业板、科创板、北交所；
- 10cm、20cm、30cm赚钱效应；
- 趋势容量 vs 连板情绪；
- 最近10—14个交易日板块演变；
- 龙头、中军、弹性前排、后排风险；
- 9:40、9:45、9:50执行计划。

## 研究方法

### 赚钱效率优先

先判断市场真正奖励哪种持仓方式：连板情绪、趋势容量、机构趋势、板块轮动、低吸修复或指数/ETF，而不是只看指数、题材名称或涨停数量。

### 趋势容量 vs 连板情绪

趋势容量观察：成交额、持续性、中军承接、趋势结构、板块扩散、核心股负反馈。

连板情绪观察：连板数量、高度、晋级率、炸板率、昨日涨停溢价、大面负反馈。

必须给出明确结论：趋势容量显著强于连板、连板主导、二者共振或二者同时走弱。“涨停很多但连板很少”通常是首板扩散或趋势修复，不可直接定义为接力主升。

### 板块层级

母主线、顺势确认、分歧观察、低位扩散、修复、退潮。每个核心板块说明资金体量、持续性、板块效应、龙头、中军、弹性、后排风险、次日确认条件。

### 时间窗口

- 9:40：第一波主动进攻是否形成真实板块效应，核心与中军是否同步。
- 9:45：指数、容量与题材是否同向，昨日强势是否负反馈，回落是否有承接。
- 9:50：形成当天第一版结论，决定仓位提升、维持或收缩。

## 输出文件

写入 `outputs/YYYY-MM-DD/`：

- `market_review.md`
- `market_data.json`
- `research_sources.md`

`market_review.md` 固定结构：一句话结论、市场摘要、今天真正奖励什么、趋势容量vs连板情绪、10/20/30cm、板块结构、龙头/中军/弹性/风险、10—14日演变、明日确认与失效条件、9:40/9:45/9:50、仓位策略、数据口径与风险提示。

`market_data.json` 最小字段：

```json
{
  "meta": {"date":"YYYY-MM-DD","timezone":"Asia/Shanghai","is_trading_day":true,"close_data_complete":true,"generated_at":"ISO-8601","model_scores_are_derived":true},
  "market": {"summary":"","indices":[],"turnover_total":null,"turnover_change":null,"advancers":null,"decliners":null,"limit_up":null,"limit_down":null,"consecutive_limit_count":null,"max_board":null,"promotion_rate":null,"broken_board_rate":null,"trend_capacity_score":null,"limit_up_emotion_score":null,"dominant_style":""},
  "sectors": [],
  "daily_details": [],
  "execution_plan": {"09:40":"","09:45":"","09:50":""},
  "position_strategy": {"recommended_range":"","increase_when":[],"reduce_when":[],"avoid":[]},
  "sources": []
}
```

不可确认的数据使用 `null`，模型分数必须明确是派生评分。
