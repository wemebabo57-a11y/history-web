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
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
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
  const ls = s.split('\n'); let o = []; let inul = false;
  for(const ln of ls){
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
    '<footer>历史全集静态站 · 零依赖构建 · 史料均注来源版本定位，未核验处标“页码待核/未能联网核验”；演绎与史料严格区分；疆域图为自绘示意非精确测绘，禁套现代边界；官方图待用户提供后替换。</footer>' +
    '<script>if(window.mermaid){mermaid.initialize({startOnLoad:true});}</script>' +
    '</div></body></html>';
}
function cleanLabel(s){
  let t = String(s || '').replace(/[\(\)\[\]\{\}#:\"'`]/g, '').replace(/\|/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  if(t.length > 22) t = t.slice(0, 22);
  return t || '未命名';
}
function parseMindmap(t){
  const out = {};
  let sec = null; let branch = null;
  let lastNode = null;
  for(const raw of t.split('\n')){
    const ln = raw.replace(/\r$/, '');
    const secM = ln.match(/^(emperors_mindmap|power_mindmap|timeline_mindmap):/);
    if(secM){ sec = secM[1]; out[sec] = { root:'', branches:[] }; branch = null; lastNode = null; continue; }
    if(!sec) continue;
    const rootM = ln.match(/^\s*root:\s*"?(.*?)"?\s*$/);
    if(rootM && !out[sec].root){ out[sec].root = rootM[1]; continue; }
    const labM = ln.match(/^(\s*)- label:\s*"?(.*?)"?\s*$/);
    if(labM){
      const indent = labM[1].length;
      const label = labM[2];
      if(indent <= 5){ branch = { label:label, nodes:[] }; out[sec].branches.push(branch); lastNode = null; }
      else { if(!branch){ branch = { label:'分组', nodes:[] }; out[sec].branches.push(branch); } lastNode = { label:label, extra:'' }; branch.nodes.push(lastNode); }
      continue;
    }
    const rM = ln.match(/^\s*(reign|year|role|extra):\s*"?(.*?)"?\s*$/);
    if(rM && lastNode){ const v = rM[2]; if(v) lastNode.extra = (lastNode.extra ? lastNode.extra + ' ' : '') + v; }
  }
  return out;
}
function mmMermaid(root, branches){
  let s = 'mindmap\n  root((' + cleanLabel(root) + '))\n';
  const bs = branches.slice(0, 16);
  for(const b of bs){
    s += '    ' + cleanLabel(b.label) + '\n';
    const ns = b.nodes.slice(0, 16);
    for(const n of ns){
      let lab = cleanLabel(n.label);
      s += '      ' + lab + '\n';
      if(n.extra){ s += '        ' + cleanLabel(n.extra).slice(0, 18) + '\n'; }
    }
  }
  return s;
}
function mmEmpFlow(root, branches){
  const nodes = [];
  for(const br of (branches||[])){ for(const n of (br.nodes||[])){ nodes.push(n); } }
  const N = nodes.slice(0, 30);
  let s = 'flowchart LR\n';
  for(let i=0;i<N.length;i++){
    const n = N[i];
    const lab = cleanLabel(n.label).slice(0,12);
    const ex = cleanLabel(n.extra).slice(0,20);
    const txt = (lab + (ex ? ' ' + ex : '')).slice(0, 30);
    s += '  E'+i+'["' + txt + '"]\n';
    if(i>0) s += '  E'+(i-1)+' --> E'+i+'\n';
  }
  return s;
}
function mmTlFlow(root, branches){
  let s = 'flowchart TD\n';
  let prevLast = null;
  const bs = (branches||[]).slice(0,8);
  for(let bi=0; bi<bs.length; bi++){
    const br = bs[bi];
    const bl = cleanLabel(br.label).slice(0,14);
    s += '  subgraph P'+bi+'["' + bl + '"]\n  direction LR\n';
    const ns = (br.nodes||[]).slice(0,16);
    for(let k=0;k<ns.length;k++){
      const n = ns[k];
      const lab = cleanLabel(n.label).slice(0,12);
      const ex = cleanLabel(n.extra).slice(0,20);
      const txt = (lab + (ex ? ' ' + ex : '')).slice(0, 28);
      const id = 'P'+bi+'N'+k;
      s += '    '+id+'["' + txt + '"]\n';
      if(k>0) s += '    P'+bi+'N'+(k-1)+' --> '+id+'\n';
    }
    s += '  end\n';
    if(prevLast && ns.length) s += '  '+prevLast+' --> P'+bi+'N0\n';
    if(ns.length) prevLast = 'P'+bi+'N'+(ns.length-1);
  }
  return s;
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
  let enBody = '';
  try{ enBody = fs.readFileSync(path.join(gd,'dynasty.en.md'),'utf8'); }catch(e){ enBody = 'English version pending.'; }
  const entries = readEntries(gid);
  const nOff = entries.filter(function(e){return e.sub==='official';}).length;
  const nFolk = entries.filter(function(e){return e.sub==='folk';}).length;
  let empRaw = '', powRaw = '', tlRaw = '', mapMeta = '', mapFile = '';
  let realMaps = [];
  try{ empRaw = fs.readFileSync(path.join(gd,'emperors.yaml'),'utf8'); }catch(e){}
  try{ powRaw = fs.readFileSync(path.join(gd,'power-holders.yaml'),'utf8'); }catch(e){}
  try{ tlRaw = fs.readFileSync(path.join(gd,'timeline.yaml'),'utf8'); }catch(e){}
  let mmRaw = '';
  try{ mmRaw = fs.readFileSync(path.join(gd,'mindmap.yaml'),'utf8'); }catch(e){}
  const mm = mmRaw ? parseMindmap(mmRaw) : {};
  function mmBlock(key, title, fallback){
    const sec = mm[key];
    if(!sec || !sec.branches || !sec.branches.length) return '<h2>' + title + '</h2><p>思维导图数据缺失，见下方yaml明细。</p>';
    let code = key==='emperors_mindmap' ? mmEmpFlow(sec.root||title, sec.branches) : key==='timeline_mindmap' ? mmTlFlow(sec.root||title, sec.branches) : mmMermaid(sec.root || title, sec.branches);
    const hint = key==='emperors_mindmap' ? '<p class="mm-hint">时间顺序：从左到右为即位先后，箭头即传承方向。</p>' : key==='timeline_mindmap' ? '<p class="mm-hint">时间顺序：分期从上到下、期内从左到右为先后。</p>' : '';
    return '<h2>' + title + '</h2>' + hint + '<div class="mm-wrap"><pre class="mermaid">' + esc(code) + '</pre></div>';
  }
  try{
    const md = path.join(gd,'maps');
    if(fs.existsSync(md)){
      const files = fs.readdirSync(md);
      for(const f of files){ if(/\.(jpg|jpeg|png)$/i.test(f)) realMaps.push(f); }
      realMaps.sort();
      if(files.includes('territory.svg')) mapFile = 'territory.svg';
      else { for(const f of files){ if(f.endsWith('.svg') && !mapFile) mapFile = f; } }
      if(fs.existsSync(path.join(md,'meta.yaml'))) mapMeta = fs.readFileSync(path.join(md,'meta.yaml'),'utf8');
      if(mapFile || realMaps.length){
        fs.mkdirSync(path.join(DIST,'maps'), { recursive:true });
        for(const f of realMaps){ fs.copyFileSync(path.join(md,f), path.join(DIST,'maps',gid+'-'+f)); }
        if(mapFile) fs.copyFileSync(path.join(md,mapFile), path.join(DIST,'maps',gid+'-territory.svg'));
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
  const langSwitch = '<div class="lang-switch"><button id="btnZh" class="on" onclick="showLang(\'zh\')">中文</button><button id="btnEn" onclick="showLang(\'en\')">English</button></div>';
  const zhBlock = '<article class="entry" id="zh-block">' + mdBody(dynBody) + '</article>';
  const enBlock = '<article class="entry" id="en-block" style="display:none">' + mdBody(enBody) + '</article>';
  const langScript = '<script>function showLang(l){var z=document.getElementById(\'zh-block\');var e=document.getElementById(\'en-block\');var bz=document.getElementById(\'btnZh\');var be=document.getElementById(\'btnEn\');if(l===\'en\'){z.style.display=\'none\';e.style.display=\'block\';bz.className=\'\';be.className=\'on\';}else{e.style.display=\'none\';z.style.display=\'block\';be.className=\'\';bz.className=\'on\';}}</script>';
  let realHtml = '';
  const CAP = { 'ming-quantu-1.jpg': '图1 · 土木堡之变前巅峰（约1435年前后，疆域极盛）', 'ming-quantu-2.jpg': '图2 · 土木堡之变后（收缩态势，1449年后）', 'five-quantu-1.jpg': '图1 · 五代十国时期全图（用户提供本地图）' };
  for(const f of realMaps){ const cap = CAP[f] || f; realHtml += '<figure class="map-fig"><img src="maps/'+gid+'-'+f+'" loading="lazy"><figcaption>'+cap+'</figcaption></figure>'; }
  if(gid==='five-dynasties-ten-kingdoms'){ realHtml += '<p class="map-src">地图图片来源：用户本地提供（05-82五代十国时期全图.jpg；制图者/原书/许可待考；仅本地展示，勿再分发）</p>'; } else { realHtml += '<p class="map-src">地图图片来源：<a href="https://gitcode.com/open-source-toolkit/2fba6">gitcode.com/open-source-toolkit/2fba6</a>（用户提供下载地址；原包未声明制图者/原书/许可，仅本地展示，勿再分发）</p>'; }
  const mapHtml = '<h2>疆域图(真实地图图片)</h2>' + (realHtml ? realHtml : (mapFile ? '<figure class="map-fig"><img src="maps/'+gid+'-territory.svg" loading="lazy"></figure>' : '<p>暂缺图片</p>')) + '<details><summary>疆域图来源与许可(meta.yaml)</summary><pre>' + esc(mapMeta) + '</pre></details>';
  const dhtml = page(gname+' · '+grange, '<a href="index.html">首页</a> / 国内',
    '<h2>政权综述 · 中文 / English 独立切换</h2>' + langSwitch + zhBlock + enBlock + langScript +
    mmBlock('emperors_mindmap','皇帝传承思维导图') + '<details><summary>帝系表明细(emperors.yaml)</summary><pre>' + esc(empRaw) + '</pre></details>' +
    mmBlock('power_mindmap','实际掌权人思维导图') + '<details><summary>掌权表明细(power-holders.yaml)</summary><pre>' + esc(powRaw) + '</pre></details>' +
    mmBlock('timeline_mindmap','独立时间线思维导图(本朝代隔离展示)') + '<details><summary>时间线明细(timeline.yaml)</summary><pre>' + esc(tlRaw) + '</pre></details>' +
    mapHtml +
    '<h2>史料条目(官 '+nOff+' / 民 '+nFolk+')</h2><ul>' + listHtml + '</ul>' +
    '<p><a href="timelines.html">全局时间线(分组聚合)</a> · <a href="index.html">首页</a> · <a href="search.html">搜索</a></p>');
  fs.writeFileSync(path.join(DIST,'dynasty-'+gid+'.html'), dhtml, 'utf8');
  let thumb = 'territory.svg';
  try{ const mdf = fs.readdirSync(path.join(gd,'maps')); const jp = mdf.filter(function(f){ return /\.(jpg|jpeg|png)$/i.test(f); }).sort(); if(jp.length) thumb = jp[0]; }catch(e){}
  dynCards.push({ gid:gid, gname:gname, grange:grange, nOff:nOff, nFolk:nFolk, thumb:thumb });
  index.push({ gid:gid, gname:gname, tl:tlRaw });
}
let cards = '';
for(const c of dynCards){
  cards += '<div class="card"><div class="map-thumb"><img src="maps/'+c.gid+'-'+(c.thumb||'territory.svg')+'" alt="'+esc(c.gname)+'疆域图" loading="lazy"></div><h3><a href="dynasty-'+c.gid+'.html">'+esc(c.gname)+'</a></h3><p>'+esc(c.grange)+' · 官方'+c.nOff+' / 民间'+c.nFolk+'</p><p><a href="dynasty-'+c.gid+'.html">进入 '+esc(c.gname)+'</a></p></div>';
}
const homeBody = '<p class="lang-note">全站中英文独立切换：各朝代页顶部设 中文 / English 按钮，中英分开展示不混排。英文版为综述译介，史料原文以中文页为准。</p>' + '<nav class="filters">' +
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
/* timelines deferred until foreign tlAll merged */
const FOR = path.join(ROOT, 'content', 'foreign');
const FGROUPS = [
  ['egypt','古埃及','-3100~642'],
  ['mesopotamia','美索不达米亚','-3500~-539'],
  ['greece-rome','希腊罗马','-776~476'],
  ['india','印度','-1500~1858'],
  ['islamic','伊斯兰世界','622~1924'],
  ['europe-medieval','欧洲中世纪','476~1492'],
  ['modern','近代世界','1492~1945']
];
function readForeignEntries(gid){
  const out = [];
  for(const sub of ['official','folk']){
    const d = path.join(FOR, gid, sub);
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
const fCards = [];
for(const fg of FGROUPS){
  const gid = fg[0], gname = fg[1], grange = fg[2];
  const gd = path.join(FOR, gid);
  if(!fs.existsSync(gd)) continue;
  let ovFM = {}, ovBody = '综述缺失';
  try{ const r = parseFM(fs.readFileSync(path.join(gd,'overview.md'),'utf8')); ovFM = r.fm; ovBody = r.body; }catch(e){}
  let fempRaw = '', fpowRaw = '', ftlRaw = '', fmmRaw = '';
  try{ fempRaw = fs.readFileSync(path.join(gd,'emperors.yaml'),'utf8'); }catch(e){}
  try{ fpowRaw = fs.readFileSync(path.join(gd,'power-holders.yaml'),'utf8'); }catch(e){}
  try{ ftlRaw = fs.readFileSync(path.join(gd,'timeline.yaml'),'utf8'); }catch(e){}
  try{ fmmRaw = fs.readFileSync(path.join(gd,'mindmap.yaml'),'utf8'); }catch(e){}
  const fmm = fmmRaw ? parseMindmap(fmmRaw) : {};
  function fmmBlock(key, title){
    const sec = fmm[key];
    if(!sec || !sec.branches || !sec.branches.length) return '<h2>' + title + '</h2><p>思维导图数据缺失，见下方yaml明细。</p>';
    let code = key==='emperors_mindmap' ? mmEmpFlow(sec.root||title, sec.branches) : key==='timeline_mindmap' ? mmTlFlow(sec.root||title, sec.branches) : mmMermaid(sec.root || title, sec.branches);
    const hint = key==='emperors_mindmap' ? '<p class="mm-hint">时间顺序：从左到右为即位先后，箭头即传承方向。</p>' : key==='timeline_mindmap' ? '<p class="mm-hint">时间顺序：分期从上到下、期内从左到右为先后。</p>' : '';
    return '<h2>' + title + '</h2>' + hint + '<div class="mm-wrap"><pre class="mermaid">' + esc(code) + '</pre></div>';
  }
  const fentries = readForeignEntries(gid);
  const fnOff = fentries.filter(function(e){return e.sub==='official';}).length;
  const fnFolk = fentries.filter(function(e){return e.sub==='folk';}).length;
  let flistHtml = '';
  for(const e of fentries){
    const eid = e.fm.id || ('foreign-'+gid+'-'+e.file.replace(/\.md$/,''));
    const et = e.fm.title || e.file;
    const st = e.fm.source_type || e.sub;
    flistHtml += '<li><a href="entry-' + eid + '.html">' + esc(et) + '</a> <span class="badge">' + esc(st) + '</span> <span class="badge">' + esc(e.fm.period_id||'') + '</span></li>';
    searchIdx.push({ id:eid, title:et, group:'foreign-'+gid, gname:gname, stype:st, period:String(e.fm.period_id||''), year:String(e.fm.start_year||''), text:(et+' '+ovBody+' '+e.body).slice(0,600) });
    const ehtml = page(et, '<a href="index.html">首页</a> / <a href="foreign.html">国外</a> / <a href="dynasty-foreign-'+gid+'.html">'+esc(gname)+'</a> / 条目',
      '<article class="entry">' + mdBody(e.body) + '</article>' +
      '<h2>来源与定位</h2><table><tr><th>字段</th><th>值</th></tr>' +
      ['id','period_id','source_type','source_title','source_author','source_version','source_locator','start_year','end_year','confidence'].map(function(k){ return '<tr><td>'+k+'</td><td>'+esc(e.fm[k]||'')+'</td></tr>'; }).join('') + '</table>' +
      '<p><a href="dynasty-foreign-'+gid+'.html">返回'+esc(gname)+'</a> · <a href="foreign.html">国外</a> · <a href="index.html">首页</a></p>');
    fs.writeFileSync(path.join(DIST,'entry-'+eid+'.html'), ehtml, 'utf8');
  }
  const fdhtml = page(gname+' · '+grange, '<a href="index.html">首页</a> / <a href="foreign.html">国外</a> / '+esc(gname),
    '<p class="map-src">国外组无疆域图，仅文字记载与思维导图。</p>' +
    '<h2>综述</h2><article class="entry">' + mdBody(ovBody) + '</article>' +
    fmmBlock('emperors_mindmap','统治者传承思维导图') +
    fmmBlock('power_mindmap','实力人物思维导图') +
    fmmBlock('timeline_mindmap','独立时间线思维导图(本组隔离展示)') + '<details><summary>时间线明细(timeline.yaml)</summary><pre>' + esc(ftlRaw) + '</pre></details>' +
    '<h2>史料条目(官 '+fnOff+' / 民 '+fnFolk+')</h2><ul>' + flistHtml + '</ul>' +
    '<p><a href="foreign.html">国外总览</a> · <a href="index.html">首页</a> · <a href="search.html">搜索</a></p>');
  fs.writeFileSync(path.join(DIST,'dynasty-foreign-'+gid+'.html'), fdhtml, 'utf8');
  tlAll += '<h2 id="foreign-'+gid+'">' + esc(gname) + ' · 国外</h2><pre>' + esc(ftlRaw) + '</pre>';
  fCards.push({ gid:gid, gname:gname, grange:grange, nOff:fnOff, nFolk:fnFolk });
}
const fef = path.join(ROOT,'content','foreign','_framework.md');
let feb = '国外部分待确认,不填充史料。';
try{ feb = parseFM(fs.readFileSync(fef,'utf8')).body; }catch(e){}
let fhub = '<article class="entry">'+mdBody(feb)+'</article>';
if(fCards.length){
  fhub += '<h2>国外七组</h2><div class="grid">';
  for(const c of fCards){ fhub += '<div class="card"><h3><a href="dynasty-foreign-'+c.gid+'.html">'+esc(c.gname)+'</a></h3><p>'+esc(c.grange)+' · 官方'+c.nOff+' / 民间'+c.nFolk+'</p><p><a href="dynasty-foreign-'+c.gid+'.html">进入 '+esc(c.gname)+'</a></p></div>'; }
  fhub += '</div>';
} else { fhub += '<p>国外七组内容补齐中（埃及/两河/希腊罗马/印度/伊斯兰/中���纪/近代），待子代理交稿后展示。</p>'; }
fs.writeFileSync(path.join(DIST,'foreign.html'), page('国外 · 总览','<a href="index.html">首页</a> / 国外', fhub), 'utf8');
fs.writeFileSync(path.join(DIST,'timelines.html'), page('全局时间线(按朝代分组聚合展示)','<a href="index.html">首页</a> / 时间线', '<p>各朝代时间线独立成段,仅聚合展示,不混写正文；国外七组附后。</p>'+tlAll), 'utf8');
fs.writeFileSync(path.join(DIST,'search-index.json'), JSON.stringify(searchIdx, null, 1), 'utf8');
const sbody = '<input id="q" placeholder="输入关键词" style="width:260px;padding:8px"> <div id="r"></div>' +
  '<script>fetch(\'search-index.json\').then(function(x){return x.json();}).then(function(IDX){' +
  'function go(){var q=document.getElementById(\'q\').value;var r=IDX.filter(function(e){return !q||e.text.indexOf(q)>-1||e.title.indexOf(q)>-1;});' +
  'document.getElementById(\'r\').innerHTML=r.slice(0,200).map(function(e){return \'<p><a href="entry-\'+e.id+\'.html">\'+e.title+\'</a> \'+e.gname+\'/\'+e.stype+\'</p>\';}).join(\'\')+\'<p>命中 \'+r.length+\' 条</p>\';}' +
  'document.getElementById(\'q\').oninput=go;go();});</script>';
fs.writeFileSync(path.join(DIST,'search.html'), page('搜索','<a href="index.html">首页</a> / 搜索', sbody), 'utf8');
try{
  execSync('node scripts/coverage.mjs .', { cwd:ROOT, stdio:'inherit' });
  const cov = fs.readFileSync(path.join(ROOT,'data','coverage-report.md'),'utf8');
  fs.writeFileSync(path.join(DIST,'coverage.html'), page('覆盖率报告','<a href="index.html">首页</a> / 覆盖', '<pre>'+esc(cov)+'</pre>'), 'utf8');
}catch(e){ console.log('coverage step warn ' + e.message); }
try{
  execSync('node scripts/validate.mjs .', { cwd:ROOT, stdio:'inherit' });
  fs.copyFileSync(path.join(ROOT,'data','validation-report.md'), path.join(DIST,'validation-report.md'));
}catch(e){ console.log('validate in build failed'); process.exit(1); }
console.log('build ok -> dist');