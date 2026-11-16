/* LAST BERTH — поиск по живым строкам сборки (work/page.html, блок lb-texts). Код игры не трогает.
   node tools/texts-find.js <regex> [--key] [--en] [--tsv] [--max=N]
     <regex>   — без учёта регистра; по умолчанию ищет в ключе, EN и RU
     --key     — только по ключу (table.key);  --en — только по EN
     --tsv     — печатать строки как table⇥key⇥en⇥ru (годится в changed-texts.tsv); иначе en и ru режутся до 300 знаков
     --max=N   — не больше N строк (по умолчанию 80)
     --live    — только строки, которые сборка использует (правило tools/texts-ja-export.js: без GUIDE и без UI/MSG, чьего ключа нет в коде)
   Страницу целиком читать запрещено (500 КБ) — этот скрипт печатает только совпавшие строки. */
const fs=require('fs'), path=require('path');
const A=process.argv.slice(2), pat=A.find(a=>!a.startsWith('--'));
if(!pat){ console.log('usage: node tools/texts-find.js <regex> [--key] [--en] [--tsv] [--max=N]'); process.exit(2) }
const re=new RegExp(pat,'i'), KEY=A.includes('--key'), EN=A.includes('--en'), TSV=A.includes('--tsv');
const MAX=+((A.find(a=>a.startsWith('--max='))||'').slice(6))||80;
const page=path.join(path.resolve(__dirname,'..'),'work','page.html');
const m=fs.readFileSync(page,'utf8').match(/<script type="application\/json" id="lb-texts" data-url="[^"]*">([\s\S]*?)<\/script>/);
if(!m){ console.log('FAIL no lb-texts block'); process.exit(1) }
let all=JSON.parse(m[1]);
if(A.includes('--live')){ const W=path.dirname(page);
  const src=['core.js','menu.js','ui.js','web/hack.js','web/shell.html','web/debug.js'].map(f=>{ try{ return fs.readFileSync(path.join(W,f),'utf8') }catch(e){ return '' } }).join('\n');
  const quoted=new Set(); let x; const q=/['"`]([A-Za-z0-9_.]+)['"`]/g; while((x=q.exec(src))) quoted.add(x[1]);
  const prefixes=[...src.matchAll(/['"]([A-Za-z0-9_.]+)['"]\s*\+/g)].map(a=>a[1]);
  all=all.filter(([t,k])=>t==='GUIDE'?false:(t==='UI'||t==='MSG')?(quoted.has(k)||quoted.has(k.split('.')[0])||prefixes.some(p=>k.startsWith(p))):true) }
const rows=all.filter(r=>KEY?re.test(r[0]+'.'+r[1]):EN?re.test(r[2]):re.test(r[0]+'.'+r[1])||re.test(r[2])||re.test(r[3]));
const cut=s=>{ s=String(s).replace(/\n/g,'\\n'); return TSV||s.length<=300?s:s.slice(0,300)+'…' };
rows.slice(0,MAX).forEach(r=>console.log(TSV?[r[0],r[1],cut(r[2]),cut(r[3])].join('\t'):r[0]+'.'+r[1]+'\n  en: '+cut(r[2])+'\n  ru: '+cut(r[3])));
console.log('— '+rows.length+' строк'+(rows.length>MAX?' (показано '+MAX+')':''));
