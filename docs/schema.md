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
## 分区通读（开国 / 盛世 / 衰败 / 灭亡）

- 每条国内史料 frontmatter 增加 `phase: founding | golden | decline | fall`，主线只按官方条目分章，民间条目在章末作“民间 / 演绎对照”，不当史料。
- 每朝代 `content/domestic/<朝代>/phases.yaml` 写四章的 `label / years / intro / note`：`note` 用于如实标注时间交错（如五代石敬瑭早于世宗、宋靖康是北宋之亡而非全宋之亡），不硬凑盛世；无典型盛世的朝代（秦、五代、三国、西夏）在导读中明说，只以相对高点为章。
- 构建时 `scripts/build.mjs` 生成 `dist/read-<朝代>.html`（章内按 start_year 排序，全文一页读完，顶部有阅读进度条与分章锚点导航）与 `dist/reads.html`（全部朝代分章条目数总览），首页卡片与朝代页顶部均设“一键通读”入口。
- 分章校验：`phase` 非法值报错，缺 `phase` 的国内条目警告并在通读页末“未分区条目”中列出，不丢失。
