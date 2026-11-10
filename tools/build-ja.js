/* LAST BERTH — японская сборка (Никита 10.11: «полная версия игры на японском, отдельная игра», для портфолио).
   node tools/build-ja.js [--allow-missing]
   Берёт готовую work/page.html (обычная сборка, её не трогает) и пишет play/JA/LAST-BERTH-vX.YY-ja.html:
     • тексты: texts/ja/ja-*.txt (строка «TABLE.key=перевод») встают в обе колонки (en и ru) блока lb-texts;
       плейсхолдеры {x} сверяются с EN; строка без перевода, которую сборка использует, — ошибка;
     • имена колец и миров — texts/ja/names.json (катакана, число имён то же);
     • слово «год», кнопка стартового окна, lang="ja", шрифтовой стек с японскими гарнитурами;
     • своё сохранение (lb.save.ja), чтобы японский файл не открывал партию английского и наоборот;
     • ссылка на Google Sheet убрана — перезагрузка текстов вернула бы английский.
   Ядро, баланс и разметка — те же байты, что в английской сборке. */
const fs=require('fs'), path=require('path');
const LB=path.resolve(__dirname,'..'), W=path.join(LB,'work'), JA=path.join(LB,'texts','ja');
const allowMissing=process.argv.includes('--allow-missing');
let s=fs.readFileSync(path.join(W,'page.html'),'utf8');
const err=[], note=[];
const once=(a,b,what)=>{ const n=s.split(a).length-1; if(n!==1){ err.push(what+': ожидалось 1 вхождение, найдено '+n); return } s=s.replace(a,()=>b) };

// 1. переводы
const ja={};
for(const f of fs.readdirSync(JA).filter(f=>/^ja-.*\.txt$/.test(f)).sort()){
  fs.readFileSync(path.join(JA,f),'utf8').replace(/^﻿/,'').split(/\r?\n/).forEach((l,i)=>{
    if(!l.trim()) return; const m=l.match(/^([A-Z]+)\.([^=]+)=(.*)$/);
    if(!m){ err.push(f+':'+(i+1)+' не разобрана'); return }
    const id=m[1]+'.'+m[2]; if(ja[id]!==undefined) err.push('дубль перевода '+id+' ('+f+')'); ja[id]=m[3].replace(/\\n/g,'\n') }) }

// 2. блок текстов
const re=/(<script type="application\/json" id="lb-texts" data-url=")[^"]*(">)([\s\S]*?)(<\/script>)/;
const m=s.match(re); if(!m){ console.log('FAIL нет блока lb-texts'); process.exit(1) }
const rows=JSON.parse(m[3]);
const ph=x=>(String(x||'').match(/\{\w+\}/g)||[]).sort().join();
const used=new Set(fs.existsSync(path.join(JA,'src.tsv'))?fs.readFileSync(path.join(JA,'src.tsv'),'utf8').split('\n').filter(Boolean).map(l=>{ const c=l.split('\t'); return c[0]+'.'+c[1] }):[]);
const seen=new Set(), missing=[]; let done=0, latin=[];
for(const r of rows){ const id=r[0]+'.'+r[1]; seen.add(id); const t=ja[id];
  if(t===undefined){ if(used.has(id)) missing.push(id); continue }
  if(!t) err.push('пустой перевод '+id);
  if(ph(t)!==ph(r[2])) err.push('плейсхолдеры '+id+'  en['+ph(r[2])+'] ja['+ph(t)+']');
  if(/[A-Za-z]{4,}/.test(t.replace(/\{\w+\}/g,''))&&!/^(tm_|hk_c|hk_r1|mn_loadSub)/.test(r[1])) latin.push(id);
  r[2]=t; r[3]=t; done++ }
for(const id in ja) if(!seen.has(id)) err.push('перевод без строки в сборке: '+id);
if(missing.length) (allowMissing?note:err).push('нет перевода ('+missing.length+'): '+missing.slice(0,20).join(' ')+(missing.length>20?' …':''));
if(latin.length) note.push('латиница в переводе ('+latin.length+'): '+latin.slice(0,12).join(' '));
s=s.replace(re,(_,a,b,c,d)=>a+b+JSON.stringify(rows).replace(/<\//g,'<\\/')+d);

// 3. имена
const names=JSON.parse(fs.readFileSync(path.join(JA,'names.json'),'utf8'));
for(const k of ['RING_NAMES','W_NAMES']){
  const r2=new RegExp('var '+k+'=\\[([^\\]]*)\\];'), x=s.match(r2);
  if(!x){ err.push('нет массива '+k); continue }
  const n=x[1].split(',').filter(v=>v.trim()).length;
  if(n!==names[k].length) err.push(k+': в ядре '+n+' имён, в names.json '+names[k].length);
  s=s.replace(r2,()=>'var '+k+'='+JSON.stringify(names[k])+';') }

// 4. слова в коде, язык страницы, сохранение
once("var YRS={en:['year','years','years'],ru:['год','года','лет']};","var YRS={en:['年','年','年'],ru:['年','年','年']};",'YRS');
once('data-lang="en">Start</button>','data-lang="en">開始</button>','кнопка стартового окна');
once('<html lang="en">','<html lang="ja">','lang');
once("SAVE_KEY='lb.save'","SAVE_KEY='lb.save.ja'",'SAVE_KEY');

// 5. шрифты: Jost и Geist Mono остаются для латиницы и цифр, каны и иероглифов в них нет — за ними идут японские гарнитуры
//    системы (macOS, Windows, Linux/Android); без этого моноширинные места упали бы в MS Gothic
const JP='Hiragino Sans,Hiragino Kaku Gothic ProN,Yu Gothic UI,Yu Gothic,Meiryo,Noto Sans JP,Noto Sans CJK JP';
let fonts=0;
s=s.replace(/(['"]?)(Jost|Geist Mono|Share Tech Mono)\1,/g,(a,q,f)=>{ fonts++; return q+f+q+','+JP+',' });
if(fonts<10) err.push('шрифтовых стеков найдено '+fonts+' — разметка изменилась?');
once('</style>\n</head>',':lang(ja) body{line-break:strict;word-break:normal;overflow-wrap:anywhere}\n</style>\n</head>','CSS');

const v=(s.match(/var VERSION=\{v:'([^']+)'\}/)||[])[1]||'x';
console.log('build-ja: v'+v+' · строк '+rows.length+' · переведено '+done+' · шрифтовых стеков '+fonts+' · ошибок '+err.length);
note.forEach(x=>console.log('  note '+x)); err.slice(0,40).forEach(x=>console.log('  ERR  '+x));
if(err.length) process.exit(1);
const out=path.join(LB,'play','JA'); fs.mkdirSync(out,{recursive:true});
const file=path.join(out,'LAST-BERTH-v'+v+'-ja.html');
fs.writeFileSync(file,s,'utf8');
console.log('→ '+path.relative(LB,file)+' · '+Math.round(s.length/1024)+' КБ');
