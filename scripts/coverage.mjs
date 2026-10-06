import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(process.argv[2] || '.');
const DOM = path.join(ROOT, 'content', 'domestic');
const GROUPS = ['qin','han','three-kingdoms','jin','northern-southern','sui','tang','five-dynasties-ten-kingdoms','song','liao','western-xia','jin-dynasty','yuan','ming','qing'];
function countMd(d){ let n=0, off=0, folk=0;
  for(const sub of ['official','folk']){ const p = path.join(d,sub); if(!fs.existsSync(p)) continue;
    for(const f of fs.readdirSync(p)){ if(!f.endsWith('.md')) continue; n++; if(sub==='official') off++; else folk++; } }
  return { n:n, off:off, folk:folk }; }
const L = ['# 覆盖率报告','', '生成: ' + new Date().toISOString(), '', '| 分组 | 综述 | 帝系 | 掌权表 | 时间线 | 官方条目 | 民间条目 | maps | 状态 |', '|---|---|---|---|---|---|---|---|---|'];
let totOff=0, totFolk=0;
const TODO = [];
for(const g of GROUPS){
  const gd = path.join(DOM, g);
  const has = function(f){ return fs.existsSync(path.join(gd,f)) ? 'Y' : '-'; };
  const c = fs.existsSync(gd) ? countMd(gd) : { n:0, off:0, folk:0 };
  totOff += c.off; totFolk += c.folk;
  const maps = fs.existsSync(path.join(gd,'maps')) ? 'Y' : '-';
  const ok = (has('dynasty.md')==='Y' && has('emperors.yaml')==='Y' && has('power-holders.yaml')==='Y' && has('timeline.yaml')==='Y' && c.off>=1 && c.folk>=1 && maps==='Y');
  L.push('| ' + g + ' | ' + has('dynasty.md') + ' | ' + has('emperors.yaml') + ' | ' + has('power-holders.yaml') + ' | ' + has('timeline.yaml') + ' | ' + c.off + ' | ' + c.folk + ' | ' + maps + ' | ' + (ok?'MVP达标':'待补') + ' |');
  if(!ok) TODO.push('- [ ] ' + g + ': 补齐缺失模块(目标: 官方>=3/民间>=1/时间线>=8条/传承图掌权表疆域图齐备)');
  else if(c.off<3) TODO.push('- [ ] ' + g + ': 官方条目仅' + c.off + '条,向3条以上扩展');
}
L.push('', '合计: 官方条目 ' + totOff + ' / 民间条目 ' + totFolk, '', '## TODO(增量扩展,不追求一次穷尽)', '');
for(const t of TODO) L.push(t);
L.push('', '## 史料清单与方法', '', '- 正史: 史记/汉书/后汉书/三国志/晋书/宋书/魏书/隋书/旧唐书/新唐书/旧五代史/新五代史/资治通鉴/宋史/辽史/金史/元史/明史/清实录(传世本,具体版本待考,页码待核,未能联网核验)', '- 民间: 野史笔记/口头传说/碑刻诗话等,凡演绎一律标folk/low后世演绎,不作史料', '- 图片: 自绘文字示意SVG(CC0),不下载外网图,不套现代边界', '- 时间线隔离: 每文件单period_id;全局页仅分组聚合展示', '');
L.push('', '## 国外七组', '', '| 分组 | 综述 | 时间线 | mindmap | 官方条目 | 民间条目 | 状态 |', '|---|---|---|---|---|---|---|');
const FOREIGN = ['egypt','mesopotamia','greece-rome','india','islamic','europe-medieval','modern'];
let fOff=0, fFolk=0;
for(const g of FOREIGN){
  const gd = path.join(ROOT,'content','foreign',g);
  const hasF = function(f){ return fs.existsSync(path.join(gd,f)) ? 'Y' : '-'; };
  const cc = fs.existsSync(gd) ? countMd(path.join(ROOT,'content','foreign',g)) : { n:0, off:0, folk:0 };
  fOff += cc.off; fFolk += cc.folk;
  const okF = (hasF('overview.md')==='Y' && hasF('timeline.yaml')==='Y' && hasF('mindmap.yaml')==='Y' && cc.off>=2 && cc.folk>=1);
  L.push('| ' + g + ' | ' + hasF('overview.md') + ' | ' + hasF('timeline.yaml') + ' | ' + hasF('mindmap.yaml') + ' | ' + cc.off + ' | ' + cc.folk + ' | ' + (okF?'达标':'待交稿') + ' |');
}
L.push('', '国外合计: 官方条目 ' + fOff + ' / 民间条目 ' + fFolk, '');
fs.mkdirSync(path.join(ROOT,'data'), { recursive:true });
fs.writeFileSync(path.join(ROOT,'data','coverage-report.md'), L.join('\n'), 'utf8');
console.log('coverage: official=' + totOff + ' folk=' + totFolk);