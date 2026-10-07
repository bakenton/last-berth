/* TRACE — временной ряд забега бота: как идут люди/еда/металл/миры по векам. Ответ на «где именно ломается».
   node tools/trace.js <bot> [seed=11] [years=4500] [step=200]       (из work/; core.js рядом)
   Колонки — из snap() ядра (пишется раз в 50 лет). Печатает таблицу + события (голод, потери, финал).
   TRACE_CSV=file.csv — полный ряд (каждые 50 лет) в файл. */
const {load,play}=require('./sim.js'); const fs=require('fs');
const [bot,seed=11,years=4500,step=200]=process.argv.slice(2);
if(!bot){ console.log('usage: node tools/trace.js <idle|greedy|rush|serial|ark|bank> [seed] [years] [step]'); process.exit(2) }
const C=load(process.env.CORE||'core.js');
let G; const row=play(C,+seed,+years,bot,g=>{G=g});
const cols=['day','people','food','metal','fuel','parts','needF','cols','dry','pop','ships','idle','out','hands','sectors','drive','berths','hungry'];
const fmt=v=>v===undefined||v===null?'-':(typeof v==='boolean'?(v?'!':''):v);
const tick=Math.max(50,Math.round(+step/50)*50);
console.log('bot='+bot+' seed='+seed+' → '+row.over+' @ yr '+row.day+' · worlds '+row.worlds+' · gen '+row.gen+' · souls '+row.souls);
console.log(cols.join('\t'));
for(const s of (G.snaps||[])) if(s.day%tick===0) console.log(cols.map(c=>fmt(s[c])).join('\t').replace(/\t\t/g,'\t-\t'));
const ev={}; for(const e of G.log||[]){ ev[e.code]=(ev[e.code]||0)+1 }
console.log('log events:', Object.entries(ev).sort((a,b)=>b[1]-a[1]).slice(0,14).map(([k,v])=>k+'×'+v).join(' '));
if(process.env.TRACE_CSV){ fs.writeFileSync(process.env.TRACE_CSV,[cols.join(',')].concat((G.snaps||[]).map(s=>cols.map(c=>s[c]??'').join(','))).join('\n')); console.log('csv →',process.env.TRACE_CSV) }
