# 内容 Schema（强制）

## 史料条目 frontmatter（必填）

- id: period-official|folk|mixed-简称-nnn，全局唯一
- period_id: 单值，只能填一个，见 period 清单，禁止数组
- source_type: official | folk | mixed
- source_title/author/version/locator: 书名作者版本卷次篇名必填
- start_year/end_year: 整数，公元前为负
- confidence: high | medium | low | disputed
- 无联网核验必须在来源节写 未能联网核验，页码待核

## 正文九节顺序

摘要 / 原文摘录 / 白话解释 / 关键人物 / 关键事件 / 制度与地理 / 争议与不同记载 / 来源与版本 / 关联条目

原文摘录只允许确知公有领域古文短句，否则写 原文略见来源定位，严禁伪造长段古文。

## period 清单

qin; han-western, xin, han-eastern; wei, shu, wu; jin-western, jin-eastern;
sixteen-kingdoms, northern-southern; sui; tang; five-dynasties, ten-kingdoms;
song-northern, song-southern; liao; western-xia; jin-jurchen; yuan; ming; qing.
综述文件 period 用 three-kingdoms / northern-southern / five-dynasties-ten-kingdoms 且只做聚合跳转不写事件。