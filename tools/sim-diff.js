/* LAST BERTH — эталон ботов против последнего прогона sim (work/logs/sim.log, его пишет regress.sh sim). Ничего не пишет.
   node tools/sim-diff.js [--all]     по умолчанию только колонки, где число сменилось; --all — все
   Читает таблицу «bot⇥score⇥…»: строка-заголовок начинается с «bot», дальше по строке на бота. */
const fs=require('fs'), path=require('path');
const LB=path.resolve(__dirname,'..'), ALL=process.argv.includes('--all');
const load=f=>{ const L=fs.readFileSync(f,'utf8').split(/\r?\n/).filter(l=>l.includes('\t')), i=L.findIndex(l=>l.startsWith('bot\t')); if(i<0) throw new Error('нет строки bot⇥… в '+f);
  const h=L[i].split('\t'), r={}; L.slice(i+1).forEach(l=>{ const c=l.split('\t'); r[c[0]]=Object.fromEntries(h.map((k,j)=>[k,c[j]])) }); return {h,r} };
let a,b; try{ a=load(path.join(LB,'tools','sim-baseline.tsv')); b=load(path.join(LB,'work','logs','sim.log')) }catch(e){ console.log('sim-diff: '+e.message+' — сначала bash tools/regress.sh sim'); process.exit(1) }
console.log('эталон → сейчас (бот: колонка a→b)'); let any=0;
for(const bot of Object.keys(b.r)){ const o=a.r[bot]; if(!o){ console.log(bot.padEnd(8)+'нет в эталоне'); any++; continue }
  const d=b.h.slice(1).filter(k=>ALL||o[k]!==b.r[bot][k]).map(k=>k+' '+o[k]+'→'+b.r[bot][k]);
  if(d.length){ any++; console.log(bot.padEnd(8)+d.join(' · ')) } }
for(const bot of Object.keys(a.r)) if(!b.r[bot]){ any++; console.log(bot.padEnd(8)+'был в эталоне, в прогоне нет') }
if(!any) console.log('совпадает с эталоном');
const sail=x=>Object.entries(x.r).filter(([k])=>!['idle','greedy'].includes(k)).map(([k,v])=>k+' '+v.sailed).join(' · ');
console.log('\nушли на ковчеге: '+sail(a)+'\n             →  '+sail(b));
