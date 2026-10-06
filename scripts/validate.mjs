import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2] || '.');
const DOM = path.join(ROOT, 'content', 'domestic');
const GROUPS = {
  'qin': ['qin'],
  'han': ['han-western','xin','han-eastern'],
  'three-kingdoms': ['wei','shu','wu','three-kingdoms'],
  'jin': ['jin-western','jin-eastern','jin'],
  'northern-southern': ['northern-southern','sixteen-kingdoms'],
  'sui': ['sui'],
  'tang': ['tang'],
  'five-dynasties-ten-kingdoms': ['five-dynasties','ten-kingdoms','five-dynasties-ten-kingdoms'],
  'song': ['song-northern','song-southern','song'],
  'liao': ['liao'],
  'western-xia': ['western-xia'],
  'jin-dynasty': ['jin-jurchen'],
  'yuan': ['yuan'],
  'ming': ['ming'],
  'qing': ['qing']
};
const REQ = ['id','title','period_id','dynasty','polity','source_type','source_title','source_author','source_version','source_locator','start_year','end_year','confidence'];
const NINE = ['摘要','原文摘录','白话解释','关键人物','关键事件','制度与地理','争议与不同记载','来源与版本','关联条目'];
function parseFM(t) {
  const m = t.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const ln of m[1].split('\n')) {
    const mm = ln.match(/^\s*([A-Za-z_]+)\s*:\s*(.*?)\s*$/);
    if (mm) fm[mm[1]] = mm[2];
  }
  return { fm: fm, body: t.slice(m[0].length) };
}
const errors = []; const warns = []; const seen = {};
let files = 0;
function walk(d, group) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p, group); continue; }
    if (!f.endsWith('.md')) continue;
    files++;
    const rel = path.relative(ROOT, p).replace(/\\/g, '/');
    const t = fs.readFileSync(p, 'utf8');
    const r = parseFM(t);
    if (!r) { errors.push(rel + ': 缺 frontmatter'); continue; }
    const fm = r.fm;
    for (const k of REQ) { if (!(k in fm) || String(fm[k]) === '') errors.push(rel + ': 缺字段 ' + k); }
    if ('period_id' in fm) {
      const pv = String(fm.period_id);
      if (/[,\[\]]/.test(pv)) errors.push(rel + ': period_id 必须单值: ' + pv);
      else if (group && GROUPS[group] && !GROUPS[group].includes(pv)) errors.push(rel + ': period_id ' + pv + ' 不属于分组 ' + group);
    }
    if ('source_type' in fm && !['official','folk','mixed'].includes(String(fm.source_type))) errors.push(rel + ': source_type 非法: ' + fm.source_type);
    if ('confidence' in fm && !['high','medium','low','disputed'].includes(String(fm.confidence))) errors.push(rel + ': confidence 非法: ' + fm.confidence);
    if ('id' in fm) { if (seen[fm.id]) errors.push(rel + ': id 重复 ' + fm.id + ' (见 ' + seen[fm.id] + ')'); else seen[fm.id] = rel; }
    if (rel.includes('/official/') || rel.includes('/folk/')) {
      let hit = 0;
      for (const s of NINE) { if (r.body.includes(s)) hit++; }
      if (hit < 7) warns.push(rel + ': 九节只命中 ' + hit + '/9');
      if (!/未能联网核验|页码|待核/.test(t)) warns.push(rel + ': 未声明页码待核/未能联网核验');
    }
  }
}
for (const g of Object.keys(GROUPS)) {
  const gd = path.join(DOM, g);
  if (!fs.existsSync(gd)) { errors.push('缺分组目录: ' + g); continue; }
  walk(gd, g);
  for (const need of ['dynasty.md','emperors.yaml','power-holders.yaml','timeline.yaml']) {
    if (!fs.existsSync(path.join(gd, need))) warns.push(g + ': 缺 ' + need);
  }
  const maps = path.join(gd, 'maps');
  if (!fs.existsSync(maps)) warns.push(g + ': 缺 maps/');
}
const fw = path.join(ROOT, 'content', 'foreign', '_framework.md');
if (!fs.existsSync(fw)) warns.push('缺国外框架占位 foreign/_framework.md');
const lines = ['# 校验报告','', '扫描 md: ' + files + '，错误 ' + errors.length + '，警告 ' + warns.length, '', '## 错误', ''];
for (const e of errors) lines.push('- ' + e);
lines.push('', '## 警告', '');
for (const w of warns) lines.push('- ' + w);
lines.push('');
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'validation-report.md'), lines.join('\n'), 'utf8');
console.log('validate: files=' + files + ' errors=' + errors.length + ' warns=' + warns.length);
for (const e of errors) console.log('ERROR ' + e);
for (const w of warns.slice(0, 40)) console.log('WARN ' + w);
process.exit(errors.length ? 1 : 0);