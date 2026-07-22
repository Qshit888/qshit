<!-- BEGIN A-SHARE WECHAT PIPELINE -->
# A股研究、仪表盘与公众号生产流水线

## 总入口

当用户输入以下任一表达时，必须使用 `$a-share-wechat-pipeline`：

- 我现在要发公众号123了
- 我要发公众号123了
- 今天是新的一天，我现在要发公众号123了
- 把今天的A股复盘、PDF图片和公众号文章一起做完

当用户只说“我要赚钱攒钱买车”时，也使用该技能，但默认只执行市场研究阶段；若同时表达要发公众号，则执行完整流水线。

## 固定顺序

严禁并行、跳步或倒序：

1. 市场研究：沿用“我要赚钱攒钱买车”的赚钱效应优先框架。
2. 仪表盘：读取研究结果，生成横屏PDF、分页PNG和ZIP。
3. 公众号加工：读取研究正文和仪表盘图片，先给6—8个标题候选并暂停；标题确认后才生成正文和HTML。

阶段二必须读取阶段一的真实文件。阶段三必须读取阶段一正文和阶段二图片清单。禁止根据聊天印象重新编造行情、图表或个股结论。

## 阶段输出

阶段一：

- `outputs/YYYY-MM-DD/market_review.md`
- `outputs/YYYY-MM-DD/market_data.json`
- `outputs/YYYY-MM-DD/research_sources.md`

阶段二：

- `outputs/YYYY-MM-DD/dashboard.pdf`
- `outputs/YYYY-MM-DD/dashboard-images/`
- `outputs/YYYY-MM-DD/dashboard-images.zip`
- `outputs/YYYY-MM-DD/dashboard_manifest.json`

阶段三首次进入时：

- 只生成 `outputs/YYYY-MM-DD/wechat/title_candidates.md`
- 向用户展示6—8个标题候选并停止
- 等用户明确选择标题后，才生成公众号正文与HTML

## 状态恢复

必须维护：

`outputs/YYYY-MM-DD/pipeline_state.json`

用户确认标题后，不得重新执行市场研究和PDF生成，除非用户明确要求刷新数据。

## 事实和表达边界

- 市场事实、板块强弱、个股地位以阶段一为准。
- 图表与配图以阶段二生成物为准。
- 标题、口语化、营销引导、关键词、免责声明和公众号排版以阶段三规则为准。
- 公众号加工不得篡改研究结论。
- 触发口令“我要赚钱攒钱买车”不得出现在对外正文、PDF标题或公众号文章中。
- PDF微信号统一为 `Zhangting8889990`。
- 联网失败、休市或无完整收盘数据时，不得生成空报告，也不得用样例数据冒充实时数据。
<!-- END A-SHARE WECHAT PIPELINE -->
