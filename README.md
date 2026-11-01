# 历史全集 history-atlas（可发布版）

零依赖纯静态站：`npm run build` 生成 `dist/`，可直接双击打开，也可部署到 GitHub/Cloudflare Pages。

## 构建

```
npm run build     # 生成 dist/
npm run validate  # 校验 frontmatter / period 隔离 / 图片许可
npm run coverage  # 生成 data/coverage-report.md
```

## 分区一键通读

每个朝代一页读完开国、盛世、衰败、灭亡四章：首页卡片与朝代页顶部的“一键通读”进入 `read-<朝代>.html`，总览见 `reads.html`。章内官方条目按年份排序、全文一页读完，民间条目只在章末作对照、不混入正史主线；时间交错（如五代石敬瑭早于世宗、宋靖康是北宋之亡）与无典型盛世的朝代（秦、五代、三国、西夏）在各章导读中明说，不硬凑。分章数据在 `content/domestic/<朝代>/phases.yaml`，条目分章标签见 `docs/schema.md`。

## 首页筛选

国内/国外 → 官方/民间/混合 → 朝代 → 条目，另有年份筛选、搜索、时间线、传承图、疆域图视��。

## 合规声明

- 本站处于 未能联网核验 环境：页码多标 待核，疆域图为自绘示意 SVG（CC0），不声称精确边界。
- 演义小说影视只作 后世演绎，不当史料；不确定标 存疑/待考/争议。
- 图片政策见 docs/image-policy.md。
## 本地打开与部署

- 本地打开: 直接用浏览器打开 dist/index.html(无需服务器,纯静态)。
- GitHub Pages: 将 dist/ 作为发布目录,或复制到 docs/ 后开启 Pages。
- Cloudflare/Vercel: 构建命令 node scripts/build.mjs,输出目录 dist/。
- 搜索: 首页筛选 + search.html 全文检索(search-index.json),零依赖可用。
- 时间线: timelines.html 按朝代分组聚合展示,不混写正文。
