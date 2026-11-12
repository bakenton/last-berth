const fs=require('fs');const src=fs.readFileSync(process.env.CORE||'work/core.js','utf8');
const names=['newGame','tick','K','PLANETS','HULLS','buildShip','setLine','lineFit','lineRate','forgeOf','planet','feedRates','legDays','popWant'];
const C=new Function(src+'\n;return {'+names.map(n=>n+':'+n).join(',')+'};')();
for(const cls of ['courier','far']) for(const nh of [1,2,3,5]){
  const G=C.newGame(11); G.safe=true;
  const w=C.PLANETS.filter(q=>q.kind==='works').sort((a,b)=>a.dist-b.dist)[cls==='courier'?0:1]; if(!w) continue;
  G.colonies[w.id]={pid:w.id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0};
  for(let i=0;i<nh;i++){ G.earth.metal=1e6; G.earth.people=1e4; C.buildShip(G,C.HULLS.findIndex(h=>h.gen===0&&h.key==='courier')); const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=C.HULLS[s.hull].crew; C.setLine(G,s.id,w.id,'earth') }
  let m0=0,l0=null; const Y=2600; const modes={}; let idleYears=0, ppl=0;
  for(let d=0;d<Y;d++){ G.earth.metal=1e6; G.earth.food=1e6; G.earth.fuel=1e6; G.colonies[w.id].pop=40; C.tick(G); G.pauseNow=false; G.shiftOpen=false;
    if(d===599){ m0=C.forgeOf(G,w.id).made; l0={m:G.ledger.metalOut||0,f:G.ledger.foodOut||0,p:G.ledger.peopleOut||0} }
    if(d>=600) for(const s of G.ships){ if(s.from===w.id){ modes[s.mode]=(modes[s.mode]||0)+1 } } }
  const f=C.lineFit(G,w.id), lr=C.lineRate(G,w.id), fo=C.forgeOf(G,w.id), fed=Math.min(1,f.carries/f.need), real=(fo.made-m0)/(Y-600);
  const s0=G.ships.find(s=>s.from===w.id), rt=C.legDays(G,w.id,'earth',s0)*2;
  const dm=((G.ledger.metalOut||0)-l0.m)/(Y-600), df=((G.ledger.foodOut||0)-l0.f)/(Y-600), dp=((G.ledger.peopleOut||0)-l0.p)/(Y-600);
  console.log(cls,nh,'hulls · dist',Math.round(w.dist),'rt',rt,'cap',s0.cap,'· makes',lr.makes.toFixed(2),'need',f.need.toFixed(2),'carries',f.carries.toFixed(2),'· fed',(fed*100).toFixed(0)+'%','· real',real.toFixed(2),
    '\n   delivered/yr metal',dm.toFixed(2),'food',df.toFixed(2),'people',dp.toFixed(2),'· popWant',C.popWant(w),'· clips',JSON.stringify(fo.clips),'why',JSON.stringify(fo.why),'short yrs',fo.short,'/',fo.y,
    '\n   ship modes',JSON.stringify(modes),'· store m/f',Math.round(G.colonies[w.id].store.metal),Math.round(G.colonies[w.id].store.food));
}
