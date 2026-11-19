/* LAST BERTH — проверка книги потоков (v5.44): забег бота, экспорт, сходимость «приход − расход = разница запаса».
   node tools/flow-check.js [bot=serial] [seed=11] [years=4500]      (из work/; core.js рядом)
   Печатает: размер экспорта, остатки по ресурсам (сумма |r| по годам, число лет с остатком), итоги по статьям.
   FLOW_OUT=file.json — записать сам экспорт. Ничего не правит. */
const {load,play}=require('./sim.js'); const fs=require('fs');
const [bot='serial',seed=11,years=4500]=process.argv.slice(2);
const C=load(process.env.CORE||'core.js'); let G;
const row=play(C,+seed,+years,bot,g=>{G=g});
const js=C.exportLog(G), J=JSON.parse(js);
console.log('bot='+bot+' seed='+seed+' → '+row.over+' @ yr '+row.day+' · export '+(js.length/1048576).toFixed(2)+' MB · years '+J.years.length+' · articles '+J.flowKeys.length+' · snaps '+J.snaps.length);
const R=['people','metal','food','fuel','parts'], S=['metal','food','fuel','parts'];
const sum=(rows,i,key)=>rows.reduce((a,y)=>a+Math.abs(y[key][i]),0), cnt=(rows,i,key)=>rows.filter(y=>Math.abs(y[key][i])>0.5).length;
console.log('остаток Земли по ресурсам (Σ|r|, лет с |r|>0.5, первые такие годы):');
R.forEach((n,i)=>{ const bad=J.years.filter(y=>Math.abs(y.r[i])>0.5); console.log('  '+n.padEnd(7)+sum(J.years,i,'r').toFixed(1).padStart(10)+' '+String(bad.length).padStart(5)+'  '+bad.slice(0,6).map(y=>y.d+':'+y.r[i]).join(' ')) });
console.log('остаток складов колоний:');
S.forEach((n,i)=>{ const bad=J.years.filter(y=>Math.abs(y.rs[i])>0.5); console.log('  '+n.padEnd(7)+sum(J.years,i,'rs').toFixed(1).padStart(10)+' '+String(bad.length).padStart(5)+'  '+bad.slice(0,6).map(y=>y.d+':'+y.rs[i]).join(' ')) });
console.log('итоги по статьям (Земля):');
R.forEach(n=>{ const ks=Object.keys(J.flowTotal).filter(k=>k.startsWith(n+'.')); console.log('  '+n+': '+ks.map(k=>k.slice(n.length+1)+' '+Math.round(J.flowTotal[k])).join(' · ')) });
console.log('итоги по статьям (склады колоний):');
S.forEach(n=>{ const ks=Object.keys(J.flowTotal).filter(k=>k.startsWith('s.'+n+'.')); console.log('  '+n+': '+ks.map(k=>k.slice(3+n.length)+' '+Math.round(J.flowTotal[k])).join(' · ')) });
const y=J.years[J.years.length-1]; console.log('последний год: '+JSON.stringify(y).slice(0,300));
if(process.env.FLOW_OUT) fs.writeFileSync(process.env.FLOW_OUT,js);
