---
name: a-share-wechat-pipeline
description: 总控A股公众号生产流水线。用户说“我现在要发公众号123了”“今天是新的一天并生成A股复盘、PDF图片和公众号文章”时触发；必须依次执行市场研究、仪表盘PDF/PNG/ZIP、公众号标题候选与确认后正文，禁止并行或跳步。
---

# A股研究—仪表盘—公众号总控技能

## 固定子技能与顺序

本技能只负责编排、状态管理、文件交接和失败恢复。固定顺序：

1. `$profit-car-research`
2. `$a-share-profit-dashboard`
3. `$wechat-123-publisher`

严禁并行、跳步或倒序。后一个阶段必须读取前一个阶段生成的真实文件，不能根据聊天记忆重新编造。

## 启动

1. 使用北京时间确定绝对日期 `YYYY-MM-DD`。
2. 创建 `outputs/YYYY-MM-DD/`。
3. 读取项目根目录 `AGENTS.md`。
4. 读取或初始化 `outputs/YYYY-MM-DD/pipeline_state.json`。
5. 如果状态文件已存在，从未完成阶段继续，不能默认重跑全部流程。

状态文件结构：

```json
{
  "date":"YYYY-MM-DD",
  "research":"not_started",
  "dashboard":"not_started",
  "publisher":"not_started",
  "selected_title":null,
  "updated_at":"ISO-8601"
}
```

合法状态：

- research：`not_started | running | completed | skipped_no_close_data | failed`
- dashboard：`not_started | running | completed | failed`
- publisher：`not_started | generating_titles | awaiting_title_confirmation | generating_article | completed | failed`

## 阶段一：市场研究

显式使用 `$profit-car-research`。要求输出：

- `outputs/YYYY-MM-DD/market_review.md`
- `outputs/YYYY-MM-DD/market_data.json`
- `outputs/YYYY-MM-DD/research_sources.md`

完成后校验：文件存在且非空；JSON可解析；`meta.date`等于当天；`meta.is_trading_day=true`；`meta.close_data_complete=true`；至少包含市场摘要、板块数据、三时间窗口和仓位策略。

若休市、未收盘或无完整数据，将 `research` 标记为 `skipped_no_close_data`，停止整个流水线，不生成空PDF或公众号稿。

## 阶段二：仪表盘

只有阶段一校验通过后，显式使用 `$a-share-profit-dashboard`。只读取阶段一文件，不重新发明市场结论。

必须生成：

- `outputs/YYYY-MM-DD/dashboard.pdf`
- `outputs/YYYY-MM-DD/dashboard-images/`
- `outputs/YYYY-MM-DD/dashboard-images.zip`
- `outputs/YYYY-MM-DD/dashboard_manifest.json`

校验：PDF存在且页数大于0；图片数量等于PDF页数；ZIP可打开且图片数量一致；manifest日期正确；微信号为 `Zhangting8889990`；所有图片路径存在。

## 阶段三：公众号标题门

只有阶段二校验通过后，显式使用 `$wechat-123-publisher`。

首次进入只做：

1. 读取 `market_review.md` 和 `dashboard_manifest.json`；
2. 生成6—8个高度差异化标题；
3. 写入 `outputs/YYYY-MM-DD/wechat/title_candidates.md`；
4. 更新状态为 `awaiting_title_confirmation`；
5. 向用户展示标题并停止。

同一轮禁止提前生成正文、HTML或上传草稿。

## 用户确认标题后

用户回复“选择第N个标题，继续”或同义表达时：

1. 读取当天 `pipeline_state.json`；
2. 不重新执行阶段一或阶段二；
3. 将 `selected_title` 写入状态；
4. 使用 `$wechat-123-publisher` 生成：
   - `wechat/article.md`
   - `wechat/article.html`
   - `wechat/assets_manifest.json`
5. 校验正文和HTML存在、图片路径有效、事实数字与 `market_review.md` 一致；
6. 更新 publisher 为 `completed`。

## 重跑规则

- “重新生成今天PDF”：只重跑阶段二，并把publisher重置为 `not_started`；
- “行情数据错了/重新研究”：重跑阶段一、二、三；
- “换标题”：只重跑阶段三标题门；
- “分割图片/压缩ZIP”：只调用阶段二导出能力；
- “继续公众号阶段”：必须复用当天已完成的研究和PDF文件。

## 文件交接契约

所有文件必须位于同一个 `outputs/YYYY-MM-DD/`，不得混用昨天PDF、今天正文和其他日期图片。

`dashboard_manifest.json` 至少包含：

```json
{
  "date":"YYYY-MM-DD",
  "pdf":"outputs/YYYY-MM-DD/dashboard.pdf",
  "zip":"outputs/YYYY-MM-DD/dashboard-images.zip",
  "wechat_id":"Zhangting8889990",
  "page_count":0,
  "images":[{"page":1,"path":".../page-01.png","purpose":"封面与市场结论"}]
}
```

## 失败规则

- 任一阶段交接验证失败：停止后续阶段，列出缺失文件或字段；
- 不得输出不存在的文件链接；
- 联网失败不得自动回退到样例数据；
- 公众号加工不得修改阶段一的市场事实；
- 对外正文不得出现内部口令“我要赚钱攒钱买车”。

## 用户日常入口

完整流水线：

```text
$a-share-wechat-pipeline
今天是新的一天，我现在要发公众号123了。
```

确认标题后：

```text
选择第3个标题，继续公众号阶段。不要重新执行市场研究和PDF生成，使用当天已有输出文件。
```
