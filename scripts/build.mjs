import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
const ROOT = path.resolve(process.argv[2] || '.');
const DIST = path.join(ROOT, 'dist');
const DOM = path.join(ROOT, 'content', 'domestic');
const GROUPS = [
  ['qin','秦','-221~前207'],
  ['han','汉(西汉/新莽/东汉)','前202~220'],
  ['three-kingdoms','三国','220~280'],
  ['jin','晋','265~420'],
  ['northern-southern','南北朝','304~589'],
  ['sui','隋','581~618'],
  ['tang','唐','618~907'],
  ['five-dynasties-ten-kingdoms','五代十国','907~979'],
  ['song','宋','960~1279'],
  ['liao','辽','916~1125'],
  ['western-xia','西夏','1038~1227'],
  ['jin-dynasty','金','1115~1234'],
  ['yuan','元','1206~1368'],
  ['ming','明','1368~1644'],
  ['qing','清','1616~1912']
];
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function parseFM(t){
  const m = t.match(/^---\s*\n([\s\S]*?)\n---/);
  if(!m) return { fm:{}, body:t };
  const fm = {};
  for(const ln of m[1].split('\n')){
    const mm = ln.match(/^\s*([A-Za-z_]+)\s*:\s*(.*?)\s*$/);
    if(mm) fm[mm[1]] = mm[2];
  }
  return { fm:fm, body:t.slice(m[0].length) };
}
function mdBody(h){
  let s = esc(h);
  s = s.replace(/```mermaid([\s\S]*?)```/g, function(m0, code){ return '<pre class="mermaid">' + code + '</pre>'; });
  s = s.replace(/^###\s?(.*)$/gm, '<h3>$1</h3>');
  s = s.replace(/^##\s?(.*)$/gm, '<h2>$1</h2>');
  s = s.replace(/^#\s?(.*)$/gm, '<h1>$1</h1>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const lines = s.split('\n'); let o = []; let inul = false;
  for(const ln of lines){
    if(/^\s*[-*]\s+/.test(ln)){ if(!inul){ o.push('<ul>'); inul = true; } o.push('<li>' + ln.replace(/^\s*[-*]\s+/, '') + '</li>'); }
    else { if(inul){ o.push('</ul>'); inul = false; }
      if(/^<h[123]>/.test(ln) || /^<pre/.test(ln) || ln.trim()==='') o.push(ln);
      else o.push('<p>' + ln + '</p>'); }
  }
  if(inul) o.push('</ul>');
  return o.join('\n').replace(/<p><h/g, '<h').replace(/<\/h([123])><\/p>/g, '</h$1>');
}
function page(title, crumb, body){
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + ' | 历史全集</title>' +
    '<link rel="stylesheet" href="style.css">' +
    '<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>' +
    '</head><body><div class="wrap">' +
    '<header class="top"><div class="crumb">' + crumb + '</div><h1>' + esc(title) + '</h1></header>' +
    body +
    '<footer>历史全集静态站 · 零依赖构建 · 史料均注来源版本定位，未核验处标“页码待核/未能联网核验”；演绎与史料严格区分；疆域图为文字示意非精确测绘。</footer>' +
    '<script>if(window.mermaid){mermaid.initialize({startOnLoad:true});}</script>' +
    '</div></body></html>';
}
function readEntries(group){
  const out = [];
  for(const sub of ['official','folk']){
    const d = path.join(DOM, group, sub);
    if(!fs.existsSync(d)) continue;
    for(const f of fs.readdirSync(d)){
      if(!f.endsWith('.md')) continue;
      const t = fs.readFileSync(path.join(d,f), 'utf8');
      const r = parseFM(t);
      out.push({ file:f, sub:sub, fm:r.fm, body:r.body });
    }
  }
  return out;
}
fs.rmSync(DIST, { recursive:true, force:true });
fs.mkdirSync(DIST, { recursive:true });
try{ fs.copyFileSync(path.join(ROOT,'assets','style.css'), path.join(DIST,'style.css')); }catch(e){}
const index = []; const searchIdx = [];
const dynCards = [];
for(const g of GROUPS){
  const gid = g[0], gname = g[1], grange = g[2];
  const gd = path.join(DOM, gid);
  let dynFM = {}, dynBody = '综述缺失';
  try{ const r = parseFM(fs.readFileSync(path.join(gd,'dynasty.md'),'utf8')); dynFM = r.fm; dynBody = r.body; }catch(e){}
  const entries = readEntries(gid);
  const nOff = entries.filter(function(e){return e.sub==='official';}).length;
  const nFolk = entries.filter(function(e){return e.sub==='folk';}).length;
  let empRaw = '', powRaw = '', tlRaw = '', mapMeta = '', mapSvg = '', mapFile = '';
  try{ empRaw = fs.readFileSync(path.join(gd,'emperors.yaml'),'utf8'); }catch(e){}
  try{ powRaw = fs.readFileSync(path.join(gd,'power-holders.yaml'),'utf8'); }catch(e){}
  try{ tlRaw = fs.readFileSync(path.join(gd,'timeline.yaml'),'utf8'); }catch(e){}
  try{
    const md = path.join(gd,'maps');
    if(fs.existsSync(md)){
      for(const f of fs.readdirSync(md)){ if(f.endsWith('.svg') && !mapFile) mapFile = f; }
      if(fs.existsSync(path.join(md,'meta.yaml'))) mapMeta = fs.readFileSync(path.join(md,'meta.yaml'),'utf8');
      if(mapFile){
        fs.mkdirSync(path.join(DIST,'maps'), { recursive:true });
        fs.copyFileSync(path.join(md,mapFile), path.join(DIST,'maps',gid+'-'+mapFile));
        mapSvg = fs.readFileSync(path.join(md,mapFile),'utf8');
      }
    }
  }catch(e){}
  let listHtml = '';
  for(const e of entries){
    const eid = e.fm.id || (gid+'-'+e.file.replace(/\.md$/,''));
    const et = e.fm.title || e.file;
    const st = e.fm.source_type || e.sub;
    listHtml += '<li><a href="entry-' + eid + '.html">' + esc(et) + '</a> <span class="badge">' + esc(st) + '</span> <span class="badge">' + esc(e.fm.period_id||'') + '</span></li>';
    searchIdx.push({ id:eid, title:et, group:gid, gname:gname, stype:st, period:String(e.fm.period_id||''), year:String(e.fm.start_year||''), text:(et+' '+dynBody+' '+e.body).slice(0,600) });
    const ehtml = page(et, '<a href="index.html">首页</a> / <a href="dynasty-'+gid+'.html">'+esc(gname)+'</a> / 条目',
      '<article class="entry">' + mdBody(e.body) + '</article>' +
      '<h2>来源与定位</h2><table><tr><th>字段</th><th>值</th></tr>' +
      ['id','period_id','source_type','source_title','source_author','source_version','source_locator','start_year','end_year','confidence'].map(function(k){ return '<tr><td>'+k+'</td><td>'+esc(e.fm[k]||'')+'</td></tr>'; }).join('') + '</table>' +
      '<p><a href="dynasty-'+gid+'.html">返回'+esc(gname)+'</a> · <a href="index.html">首页</a></p>');
    fs.writeFileSync(path.join(DIST,'entry-'+eid+'.html'), ehtml, 'utf8');
  }
  const dhtml = page(gname+' · '+grange, '<a href="index.html">首页</a> / 国内',
    '<h2>政权综述</h2><article class="entry">' + mdBody(dynBody) + '</article>' +
    '<h2>皇帝传承图(Mermaid 示意)</h2><p>名义君主/实际掌权/追尊与割据在 emperors.yaml 与正文中区分标注。</p>' +
    '<h2>帝系表 emperors.yaml</h2><pre>' + esc(empRaw) + '</pre>' +
    '<h2>实际掌权人表 power-holders.yaml</h2><pre>' + esc(powRaw) + '</pre>' +
    '<h2>独立时间线 timeline.yaml(本朝代隔离展示)</h2><pre>' + esc(tlRaw) + '</pre>' +
    '<h2>疆域图(文字示意,非精确)</h2>' + (mapFile ? '<div>' + mapSvg + '</div>' : '<p>暂缺 svg,见文字描述</p>') + '<pre>' + esc(mapMeta) + '</pre>' +
    '<h2>史料条目(官 '+nOff+' / 民 '+nFolk+')</h2><ul>' + listHtml + '</ul>' +
    '<p><a href="timelines.html">全局时间线(分组聚合)</a> · <a href="index.html">首页</a> · <a href="search.html">搜索</a></p>');
  fs.writeFileSync(path.join(DIST,'dynasty-'+gid+'.html'), dhtml, 'utf8');
  dynCards.push({ gid:gid, gname:gname, grange:grange, nOff:nOff, nFolk:nFolk });
  index.push({ gid:gid, gname:gname, tl:tlRaw });
}
let cards = '';
for(const c of dynCards){
  cards += '<div class="card"><h3><a href="dynasty-'+c.gid+'.html">'+esc(c.gname)+'</a></h3><p>'+esc(c.grange)+' · 官方'+c.nOff+' / 民间'+c.nFolk+'</p><p><a href="dynasty-'+c.gid+'.html">进入 '+esc(c.gname)+'</a></p></div>';
}
const homeBody = '<nav class="filters">' +
  '<select id="fGroup"><option value="">全部朝代</option>' + dynCards.map(function(c){ return '<option value="'+c.gid+'">'+esc(c.gname)+'</option>'; }).join('') + '</select>' +
  '<select id="fType"><option value="">官方/民间/混合</option><option value="official">官方</option><option value="folk">民间</option><option value="mixed">混合</option></select>' +
  '<input id="fYear" placeholder="年份过滤,如 960" style="width:140px">' +
  '<input id="fQ" placeholder="关键词搜索" style="width:200px">' +
  '</nav><div class="grid" id="dynGrid">' + cards + '</div>' +
  '<h2>条目检索</h2><div id="res"></div>' +
  '<p><a href="timelines.html">时间线视图</a> · <a href="search.html">搜索页</a> · <a href="foreign.html">国外占位框架</a> · <a href="coverage.html">覆盖率报告</a></p>' +
  '<script>' +
  'var IDX=' + JSON.stringify(searchIdx).replace(/</g, '\\u003c') + ';' +
  'function run(){var q=document.getElementById(\'fQ\').value;var ty=document.getElementById(\'fType\').value;var gr=document.getElementById(\'fGroup\').value;var yr=document.getElementById(\'fYear\').value.trim();' +
  'var r=IDX.filter(function(e){if(gr&&e.group!==gr)return false;if(ty&&e.stype!==ty)return false;if(yr&&!(e.text.indexOf(yr)>-1||e.year===yr))return false;if(q&&e.text.indexOf(q)<0&&e.title.indexOf(q)<0)return false;return true;});' +
  'document.getElementById(\'res\').innerHTML=r.slice(0,200).map(function(e){return \'<p><a href="entry-\'+e.id+\'.html">\'+e.title+\'</a> <span class="badge">\'+e.gname+\'</span><span class="badge">\'+e.stype+\'</span></p>\';}).join(\'\')+\'<p>命中 \'+r.length+\' 条(最多显示200)</p>\';' +
  'document.getElementById(\'fQ\').oninput=run;document.getElementById(\'fType\').onchange=run;document.getElementById(\'fGroup\').onchange=run;document.getElementById(\'fYear\').oninput=run;run();' +
  '</script>';
fs.writeFileSync(path.join(DIST,'index.html'), page('历史全集 · 首页筛选','国内 / 国外', homeBody), 'utf8');
let tlAll = '';
for(const it of index){ tlAll += '<h2 id="'+it.gid+'">' + esc(it.gid) + '</h2><pre>' + esc(it.tl) + '</pre>'; }
fs.writeFileSync(path.join(DIST,'timelines.html'), page('全局时间线(按朝代分组聚合展示)','<a href="index.html">首页</a> / 时间线', '<p>各朝代时间线独立成段,仅聚合展示,不混写正文。</p>'+tlAll), 'utf8');
const fef = path.join(ROOT,'content','foreign','_framework.md');
let feb = '国外部分待确认,不填充史料。';
try{ feb = parseFM(fs.readFileSync(fef,'utf8')).body; }catch(e){}
fs.writeFileSync(path.join(DIST,'foreign.html'), page('国外 · 占位框架','<a href="index.html">首页</a> / 国外', '<article class="entry">'+mdBody(feb)+'</article>'), 'utf8');
fs.writeFileSync(path.join(DIST,'search-index.json'), JSON.stringify(searchIdx, null, 1), 'utf8');
const sbody = '<input id="q" placeholder="输入关键词" style="width:260px;padding:8px"> <div id="r"></div>' +
  '<script>fetch(\'search-index.json\').then(function(x){return x.json();}).then(function(IDX){' +
  'function go(){var q=document.getElementById(\'q\').value;var r=IDX.filter(function(e){return !q||e.text.indexOf(q)>-1||e.title.indexOf(q)>-1;});' +
  'document.getElementById(\'r\').innerHTML=r.slice(0,200).map(function(e){return \'<p><a href="entry-\'+e.id+\'.html">\'+e.title+\'</a> \'+e.gname+\'/\'+e.stype+\'</p>\';}).join(\'\')+\'<p>命中 \'+r.length+\' 条</p>\';}' +
  'document.getElementById(\'q\').oninput=go;go();});</script>';
fs.writeFileSync(path.join(DIST,'search.html'), page('搜索','<a href="index.html">首页</a> / 搜索', sbody), 'utf8');
try{
  execSync('node scripts/coverage.mjs .', { cwd:ROOT, stdio:'inherit' });
  fs.copyFileSync(path.join(ROOT,'data','coverage-report.md'), path.join(DIST,'coverage-src.md'));
  const cov = fs.readFileSync(path.join(ROOT,'data','coverage-report.md'),'utf8');
  fs.writeFileSync(path.join(DIST,'coverage.html'), page('覆盖率报告','<a href="index.html">首页</a> / 覆盖', '<pre>'+esc(cov)+'</pre>'), 'utf8');
}catch(e){ console.log('coverage step warn ' + e.message); }
try{
  execSync('node scripts/validate.mjs .', { cwd:ROOT, stdio:'inherit' });
  fs.copyFileSync(path.join(ROOT,'data','validation-report.md'), path.join(DIST,'validation-report.md'));
}catch(e){ console.log('validate in build failed'); process.exit(1); }
console.log('build ok -> dist');