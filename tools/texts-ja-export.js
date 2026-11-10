/* LAST BERTH — выгрузка живых EN-строк сборки для японской версии. Код игры не трогает.
   node tools/texts-ja-export.js            → texts/ja/src.tsv (table \t key \t en), только строки, которые сборка использует
   Неиспользуемые UI/MSG (нет литерала ключа в коде) и GUIDE пропускаются; LOG/VOICE/RES идут целиком. */
const fs=require('fs'), path=require('path');
const LB=path.resolve(__dirname,'..'), W=path.join(LB,'work');
const html=fs.readFileSync(path.join(W,'page.html'),'utf8');
const m=html.match(/<script type="application\/json" id="lb-texts" data-url="[^"]*">([\s\S]*?)<\/script>/);
const rows=JSON.parse(m[1]);
const src=['core.js','menu.js','ui.js','web/hack.js','web/shell.html','web/debug.js'].map(f=>{ try{ return fs.readFileSync(path.join(W,f),'utf8') }catch(e){ return '' } }).join('\n');
const quoted=new Set(); let x; const q=/['"`]([A-Za-z0-9_.]+)['"`]/g; while((x=q.exec(src))) quoted.add(x[1]);
const prefixes=[...src.matchAll(/['"]([A-Za-z0-9_.]+)['"]\s*\+/g)].map(a=>a[1]);
const out=[], skip={}; let chars=0;
for(const [t,k,en] of rows){
  let use=true;
  if(t==='GUIDE') use=false;
  else if(t==='UI'||t==='MSG'){ const base=k.split('.')[0]; use=quoted.has(k)||quoted.has(base)||prefixes.some(p=>k.startsWith(p)) }
  if(!use){ skip[t]=(skip[t]||0)+1; continue }
  out.push([t,k,String(en).replace(/\t/g,' ').replace(/\n/g,'\n')].join('\t')); chars+=String(en).length;
}
fs.mkdirSync(path.join(LB,'texts','ja'),{recursive:true});
fs.writeFileSync(path.join(LB,'texts','ja','src.tsv'),out.join('\n')+'\n','utf8');
const by={}; out.forEach(l=>{ const t=l.split('\t')[0]; by[t]=(by[t]||0)+1 });
console.log('rows',rows.length,'· used',out.length,JSON.stringify(by),'· skipped',JSON.stringify(skip),'· en chars',chars);
