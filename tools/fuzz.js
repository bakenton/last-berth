/* FUZZ — бот-«хаос» для ядра. Не играет, а ломает: случайные допустимые (и недопустимые) действия через публичное API ядра,
   после каждого года — инварианты (нет NaN/Infinity/отрицательных запасов, нет дублей id, нет исключений).
   node tools/fuzz.js [core.js] [years=1500] [seeds=1..12]      FUZZ_SEEDS=5 FUZZ_YEARS=800
   Падение печатает seed, год и хвост действий — повторяется детерминированно (rnd бота = mulberry от seed). */
const {load}=require('./sim.js');
const path=process.argv[2]||'core.js';
const YEARS=+(process.argv[3]||process.env.FUZZ_YEARS||1500);
const NS=+(process.env.FUZZ_SEEDS||12);
const seeds=(process.argv[4]?process.argv[4].split(',').map(Number):Array.from({length:NS},(_,i)=>1000+i*37));
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>1)>>>0)/4294967296}}
const bad=v=>typeof v==='number'&&(!isFinite(v));
function inv(G,C){
  const E=G.earth, out=[];
  for(const k of ['metal','food','fuel','parts','people']){ if(bad(E[k])) out.push('earth.'+k+'='+E[k]); else if(E[k]<-1e-6) out.push('earth.'+k+' negative '+E[k]) }
  for(const k in G.colonies){ const c=G.colonies[k];
    if(bad(c.pop)||c.pop<0) out.push('colony '+k+' pop '+c.pop);
    if(c.store) for(const r in c.store){ if(bad(c.store[r])||c.store[r]<-1e-6) out.push('colony '+k+' store.'+r+' '+c.store[r]) }
    if(G.reserves[k]!==undefined&&(Number.isNaN(G.reserves[k])||G.reserves[k]<-1e-6)) out.push('reserve '+k+' '+G.reserves[k]) }
  const ids=new Set();
  for(const s of G.ships){ if(ids.has(s.id)) out.push('dup ship id '+s.id); ids.add(s.id);
    if(s.cargo) for(const r in s.cargo){ if(bad(s.cargo[r])||s.cargo[r]<-1e-6) out.push('ship '+s.id+' cargo.'+r+' '+s.cargo[r]) }
    if(bad(s.crew)||s.crew<0) out.push('ship '+s.id+' crew '+s.crew) }
  if(bad(G.day)) out.push('day NaN');
  return out;
}
function run(seed){
  const C=load(path), G=C.newGame(seed), R=rng(seed*7+1), tail=[];
  const pick=a=>a[Math.floor(R()*a.length)];
  const doAct=()=>{
    const live=G.ships.filter(s=>s.mode!=='dead'), keys=Object.keys(G.colonies);
    const free=live.filter(s=>s.mode==='idle'&&s.at==='earth');
    const pl=C.PLANETS.filter(p=>p.sec<C.SECTORS.length);
    const acts=[
      ['buildShip',()=>{const i=Math.floor(R()*C.HULLS.length); return C.buildShip(G,i)}],
      ['colonize',()=>{ if(!free.length||!pl.length) return; return C.colonize(G,pick(free).id,pick(pl).id,Math.floor(R()*60),Math.floor(R()*20)) }],
      ['setLine',()=>{ if(!live.length||!keys.length) return; return C.setLine(G,pick(live).id,pick(keys),'earth') }],
      ['clearLine',()=>{ if(!live.length) return; return C.clearLine(G,pick(live).id) }],
      ['setWant',()=>{ if(!keys.length) return; return C.setWant(G,pick(keys),pick(['courier','hauler','freighter']),Math.floor(R()*5)) }],
      ['setRenew',()=>{ if(!keys.length) return; return C.setRenew(G,pick(keys),R()<.5) }],
      ['survey',()=>C.survey(G)],
      ['startDrive',()=>{ if(!keys.length) return; return C.startDrive(G,pick(keys)) }],
      ['abandon',()=>{ if(!live.length||!keys.length) return; return C.abandon(G,pick(live).id,pick(keys)) }],
      ['scrap',()=>{ if(!live.length) return; return C.scrap(G,pick(live).id) }],
      ['scrapIdle',()=>C.scrapIdle(G,Math.floor(R()*3))],
      ['orderKit',()=>{ if(!keys.length) return; return C.orderKit(G,pick(keys)) }],
      ['arkBuy',()=>C.arkBuy&&C.arkBuy(G,1+Math.floor(R()*4))],
      ['arkPlan',()=>C.arkPlan&&C.arkPlan(G,1+Math.floor(R()*4))],
      ['gift',()=>{ const k=pick(['metal','food','fuel','parts']); G.earth[k]+=Math.floor(R()*2000) }]   // богатый хаос: иначе почти все действия отказывают
    ];
    const [name,fn]=pick(acts); tail.push(G.day+':'+name); if(tail.length>12) tail.shift();
    return fn();
  };
  const stats={acts:0};
  try{
    for(let d=0;d<YEARS&&!G.over;d++){
      C.tick(G); G.pauseNow=false;
      const n=Math.floor(R()*4); for(let i=0;i<n;i++){ doAct(); stats.acts++ }
      if(d%5===0){ const v=inv(G,C); if(v.length) return {seed,fail:v.slice(0,4),day:G.day,tail} }
    }
  }catch(e){ return {seed,fail:['EXCEPTION '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | ')],day:G.day,tail} }
  return {seed,ok:true,day:G.day,over:G.over||'alive',acts:stats.acts,worlds:Object.keys(G.colonies).length};
}
let failed=0;
for(const sd of seeds){ const r=run(sd);
  if(r.ok) console.log('ok   seed '+sd+' · '+r.over+' · yr '+r.day+' · '+r.acts+' acts · '+r.worlds+' worlds');
  else { failed++; console.log('FAIL seed '+sd+' · yr '+r.day+'\n  '+r.fail.join('\n  ')+'\n  tail: '+r.tail.join(' ')) } }
console.log(failed?('FUZZ: '+failed+'/'+seeds.length+' failed'):('FUZZ: '+seeds.length+'/'+seeds.length+' clean'));
process.exit(failed?1:0);
