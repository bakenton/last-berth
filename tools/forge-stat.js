/* FORGE-STAT — простой кузниц и остановки машин по стилям ботов (F-14). Счётчики G.forge пишет ядро; правила их не читают.
   node ../tools/forge-stat.js [bots=rush,serial,ark,bank] [years=4500] [seeds=11,22,33,44,55,66,77,88]     (из work/; core.js рядом)
   SET="FEED_BUFFER=2,KIT_GRACE=20" — константы в памяти; CORE=путь — другое ядро.
   «простой» = доля лет кузницы, когда она сделала меньше, чем могла. Причина: noline (на линии нет судов), room (последний рейс
   упёрся в трюм, хотя суда линии в сумме возят нужное), thin (упёрся в трюм, и линия возит меньше, чем кузница жжёт), earth (упёрся в запас Земли), late (рейс был полный, но склад кончился до следующего). */
const {load,play}=require('./sim.js');
const [bots='rush,serial,ark,bank',years='4500',seedsS='11,22,33,44,55,66,77,88']=process.argv.slice(2);
const seeds=seedsS.split(',').map(Number), set=(process.env.SET||'').split(',').filter(Boolean).map(x=>x.split('='));
const avg=a=>a.length?+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'—', pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—', W=['noline','thin','room','earth','late'];
console.log(['bot','sailed','souls','forge-y','short','noline','thin','room','earth','late','made','lostFeed','lostKit','kit-y','down','d.noline','d.thin','d.room','d.earth','d.late','cut metal','cut food','cut fuel','thin carries/need','parts@1000','parts@1500','parts@2000','pace@1500','gen'].join('\t'));
for(const b of bots.split(',')){
  const T={y:0,short:0,made:0,lostFeed:0,lostKit:0,why:{},ky:0,down:0,dw:{},loads:0,clips:{},thinR:0,thinN:0}; let sailed=0,souls=0; const at={1000:[],1500:[],2000:[]}, pace=[], gens=[];
  for(const sd of seeds){
    const C=load(process.env.CORE||'core.js'); set.forEach(([k,v])=>{ C.K[k]=+v });
    const r=play(C,sd,+years,b,G=>{
      (G.snaps||[]).forEach(n=>{ if(at[n.day]) at[n.day].push(n.parts); if(n.day===1500) pace.push(n.pace) }); gens.push(G.gen||0);
      for(const k in G.forge||{}){ const f=G.forge[k], works=C.planet(k).kind==='works';
        if(works){ T.y+=f.y; T.short+=f.short; T.made+=f.made; T.lostFeed+=f.lostFeed; T.lostKit+=f.lostKit; for(const w in f.why) T.why[w]=(T.why[w]||0)+f.why[w]; T.loads+=f.loads; T.thinR+=f.thinR||0; T.thinN+=f.thinN||0; for(const w in f.clips) T.clips[w]=(T.clips[w]||0)+f.clips[w] }
        T.ky+=f.y; T.down+=f.down; for(const w in f.downWhy) T.dw[w]=(T.dw[w]||0)+f.downWhy[w] } });
    if(r.over==='night'){ sailed++; souls+=r.souls } }
  const cut=res=>pct(['room','earth'].reduce((a,w)=>a+(T.clips[res+'_'+w]||0),0),T.loads);
  console.log([b,sailed+'/'+seeds.length,Math.round(souls/seeds.length),T.y,pct(T.short,T.y),...W.map(w=>pct(T.why[w]||0,T.y)),Math.round(T.made/seeds.length),Math.round(T.lostFeed/seeds.length),Math.round(T.lostKit/seeds.length),T.ky,pct(T.down,T.ky),...W.map(w=>pct(T.dw[w]||0,T.ky)),cut('metal'),cut('food'),cut('fuel'),T.thinN?(T.thinR/T.thinN).toFixed(2):'—',avg(at[1000]),avg(at[1500]),avg(at[2000]),avg(pace),avg(gens)].join('\t'));
}
