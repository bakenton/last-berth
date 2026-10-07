/* LONG NIGHT — headless balance harness.
   node sim.js <core.js> <days> [seeds]
   Bots (F-20, Nikita 05.10): idle and greedy are the floor — they must lose. The rest are STYLES of play, all on standing orders:
     rush    — Nikita: settle everything in reach at once, chart and run the drive as early as allowed, biggest hulls
     serial  — the tester: one live world per trade; when it runs dry, evacuate and settle the next
     ark     — v4.24: the depositor — sets an ark level aside as soon as the Night is dated (even yearly share), stops growing 1200 years out
     bank    — v4.24: the all-in buyer — saves, buys the best level it can pay for outright (bulk discount) 600 years out
   (visitor / hoarder dropped 06.10 by Nikita: two player styles + the ark runner.)
   Legacy bots (expand / pro / tidy / late) still run with BOTS=expand,pro,tidy,late. */
const STYLES={
  rush:   {hands:30, keep:60,   sFood:30,  sMetal:120,  big:true, evac:true},
  serial: {hands:30, keep:260,  sFood:90,  sMetal:300,  serial:true, evac:true},
  ark:    {hands:30, keep:60,   sFood:30,  sMetal:120,  big:true, evac:true, ark:true, arkLeft:1200, dep:true, level:2},
  bank:   {hands:30, keep:60,   sFood:30,  sMetal:120,  big:true, evac:true, ark:true, arkLeft:600, buyLeft:600}
};
const fs=require('fs');
function load(path){
  const src=fs.readFileSync(path,'utf8');
  const names=['newGame','tick','K','SECTORS','PLANETS','HULLS','planet','reach','settledCount','buildShip','colonize',
    'setLine','survey','canSurvey','startDrive','scrap','scrapIdle','shipById','canDepart','canReachSector',
    'sectorLimit','hullGen','popCap','surveyCost','driveReachFor','driveWorkFor','lineRate','snap','ensureGen',
    'arkBuy','arkPlan','arkLevel','arkSouls','nightLeft','abandon','clearLine','leftBehind',
    'orderKit','canKit','kitCost','lineHold','kitOpen','kitTier','exportLog','setWant','setRenew','lineOf','lineCount','lineWant','yardCheck'];
  const f=new Function(src+'\n;return {'+names.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')+'};');
  return f();
}
function freeHulls(G){return G.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to))}
function lined(G,pid){return G.ships.some(s=>s.mode!=='dead'&&s.from===pid)}

function play(C,seed,days,bot){
  const G=C.newGame(seed);
  const {PLANETS,HULLS,K}=C;
  const reachOK=(s,p)=>C.canReachSector(s,p.sec);
  for(let d=0;d<days&&!G.over;d++){
    C.tick(G); G.pauseNow=false;
    if(bot==='idle') continue;
    const E=G.earth;
    const maxSec = bot==='greedy' ? 1 : 99;
    const P=STYLES[bot]||{hands:30, keep:(bot==='pro'||bot==='tidy'||bot==='late')?260:60, sFood:90, sMetal:300, evac:bot==='tidy'||bot==='late', legacy:true};
    const pro = !P.legacy||bot==='pro'||bot==='tidy'||bot==='late';   // v4.15: 'tidy' = pro that also evacuates spent worlds, as a player does
    if(P.every&&d%P.every!==0) continue;                    // a visitor is away between visits
    const per=n=>!!P.every||d%n===0;                         // on a visit every periodic chore is due
    const need=G.need||{food:5,metal:3};
    for(let rep=0;rep<(P.reps||1);rep++){

    // 1. every settled world wants a line — pro uses standing orders (v4.6), the others still push hulls by hand
    for(const k in G.colonies){
      if(lined(G,k)) continue;
      const p=C.planet(k);
      if(pro){ if(!C.lineWant(G,k,'courier')&&!C.lineWant(G,k,'hauler')) { C.setWant(G,k,'courier',1); C.setRenew(G,k,true) } continue }
      const s=freeHulls(G).find(s=>reachOK(s,p));
      if(s) C.setLine(G,s.id,k,'earth');
    }
    // 2. settle the best free world we can reach (deeper is richer)
    const arkOnly=P.ark&&G.night&&C.nightLeft(G)<=P.arkLeft;                              // the ark runner stops growing once the Night is dated
    if(!arkOnly&&E.people>K.EARTH_KEEP+P.hands&&!(P.foodYears&&E.food<need.food*P.foodYears)){
      let best=null,bv=-1e9;
      for(let i=0;i<PLANETS.length;i++){
        const p=PLANETS[i];
        if(p.sec>=C.SECTORS.length||p.sec>maxSec) continue;
        if(G.colonies[p.id]||G.ghost[p.id]) continue;
        if(P.serial&&Object.keys(G.colonies).some(k=>C.planet(k).kind===p.kind&&(p.kind==='works'||G.reserves[k]>0))) continue;   // one live world per trade
        const s=freeHulls(G).find(s=>reachOK(s,p));
        if(!s) continue;
        let v = -p.dist;   // nearest first: the chart fills outward on its own
        if(pro){ const liveWell=Object.keys(G.colonies).some(k=>C.planet(k).kind==='well'&&G.reserves[k]>0);
          if(!liveWell&&p.kind==='well') v+=1000;
          if(p.kind==='farm'&&E.food>(G.need?G.need.food:5)*80) v-=500;
          if(p.kind==='farm'&&E.food<(G.need?G.need.food:5)*40) v+=800; }
        if(v>bv){bv=v;best={p,s}}
      }
      if(best) C.colonize(G,best.s.id,best.p.id,26,0);
    }
    // 1b. v4.4: a world whose stockyard is filling faster than the line carries gets a second hull (pro)
    if(pro&&per(15)){
      for(const k in G.colonies){ const c=G.colonies[k]; if(!lined(G,k)) continue;
        const lr=C.lineRate(G,k); if(!lr||!lr.piling) continue;
        if((c.store[lr.dep]||0)<3000) continue;   // v4.5: the yard is bottomless; a pile this big means the line is thin
        // v4.6: one more hull on the standing order — a hauler if the class reaches, else a courier
        const cls=(C.yardCheck(G,k,'hauler')!=='range'&&C.yardCheck(G,k,'hauler')!=='locked')?'hauler':'courier';
        if(C.lineWant(G,k,cls)<4){ C.setWant(G,k,cls,C.lineWant(G,k,cls)+1); C.setRenew(G,k,true); break }
      }
    }
    // 3. yards — cheapest hull that can serve the deepest world wanting service
    if(!arkOnly&&freeHulls(G).length<(pro?2:1)){
      let want=0;
      for(const k in G.colonies){ if(!lined(G,k)) want=Math.max(want,C.planet(k).sec);
        else if(pro){ const lr=C.lineRate(G,k); if(lr&&lr.piling&&(G.colonies[k].store[lr.dep]||0)>3000) want=Math.max(want,C.planet(k).sec) } }
      for(let i=0;i<PLANETS.length;i++){ const p=PLANETS[i];
        if(p.sec<C.SECTORS.length&&p.sec<=maxSec&&!G.colonies[p.id]&&!G.ghost[p.id]) want=Math.max(want,p.sec) }
      const keep = P.keep;
      const cands=HULLS.map((h,i)=>({h,i}))
        .filter(x=>x.h.gen===(G.gen||0))
        .filter(x=>bot==='greedy'?x.h.key==='courier':true)
        .filter(x=>(x.h.reach||0)<=C.reach(G))
        .filter(x=>C.sectorLimit? true:true);
      // range-aware: prefer the cheapest class that actually reaches `want`
      const fits=cands.filter(x=>{
        const probe={hull:x.i};
        return C.canReachSector(probe,want);
      });
      // v4.5: a pile that a courier cannot clear wants a hauler — pro reaches for the class, not the cheapest hull
      let bulk=0; if(pro) for(const k in G.colonies){ const lr=C.lineRate(G,k); if(lr&&lr.piling&&lined(G,k)) bulk=Math.max(bulk,G.colonies[k].store[lr.dep]||0) }
      const pool0=(fits.length?fits:cands);
      const pool=((bulk>3000||P.big)&&pool0.some(x=>x.h.key==='hauler') ? pool0.filter(x=>x.h.key!=='courier') : pool0).sort((a,b)=>a.h.metal-b.h.metal);
      for(const x of pool){
        if(E.metal-x.h.metal<keep) continue;
        if(C.buildShip(G,x.i)==='ok') break;
      }
    }
    // 4. the drive programme
    if(bot!=='greedy'&&bot!=='expand'&&!G.drive){
      for(const k in G.colonies){ const p=C.planet(k);
        if(p.kind==='works'&&G.colonies[k].pop>=K.DRIVE_POP&&(C.settledCount||C.reach)(G)>=C.driveReachFor(G)){
          if(C.startDrive(G,k)==='ok') break; } }
    }
    // 4b. v4.4 kits: pro invests in the richest lined world whose seam will outlast the kit; if no hull on
    //     that line can carry it, buy the cheapest current-generation hull that can and put it there
    if(pro&&C.kitOpen(G)&&per(10)){
      let best=null,bv=0;
      const liveWell2=Object.keys(G.colonies).some(k=>C.planet(k).kind==='well'&&G.reserves[k]>0);
      for(const k in G.colonies){ const c=G.colonies[k], p=C.planet(k); if(!lined(G,k)) continue;
        if(E.fuel<800||!liveWell2) break;                       // the machines drink fuel: no well, no kit
        if(p.kind==='farm'&&E.food>(G.need?G.need.food:5)*60) continue;
        if(C.canKit(G,k)!=='ok') continue;
        const kc=C.kitCost(c);
        if(G.reserves[k]!==Infinity && G.reserves[k] < c.pop*p.rich*K.PROD*Math.pow(K.KIT_OUT,kc.tier)*200) continue;
        if(E.metal-kc.metal<400) continue;
        const v=c.pop*p.rich/(kc.tier); if(v>bv){bv=v;best={k,kc,p}} }
      if(best){
        if(C.lineHold(G,best.k)>=best.kc.w) C.orderKit(G,best.k);
        else {
          const cands=HULLS.map((h,i)=>({h,i})).filter(x=>x.h.gen===(G.gen||0)&&x.h.cap>=best.kc.w&&C.canReachSector({hull:x.i},best.p.sec)).sort((a,b)=>a.h.metal-b.h.metal);
          const free=freeHulls(G).find(s=>s.cap>=best.kc.w&&reachOK(s,best.p));
          if(free){ C.setLine(G,free.id,best.k,'earth'); C.orderKit(G,best.k) }
          else if(cands.length&&E.metal-cands[0].h.metal-best.kc.metal>400) C.buildShip(G,cands[0].i);
        }
      }
    }
    // 4b. v4.15 'tidy': a spent world (seam dry, stockyard empty) is evacuated — people come home, the ghost stays on the chart
    if(P.evac&&per(25)){
      for(const k in G.colonies){ const c=G.colonies[k]; const p=C.planet(k);
        if(p.kind==='works'||!(G.reserves[k]<=0)) continue;
        const dep=p.dep; if(((c.store&&c.store[dep])||0)>=1) continue;
        const s=freeHulls(G).find(s=>reachOK(s,p)&&C.HULLS[s.hull].key==='courier'); if(s){ C.abandon(G,s.id,k); break } }   // v4.18: only a courier lifts a settlement
    }
    // 5. chart further out
    if(bot!=='greedy'&&!(bot==='late'&&G.day<1600)&&!arkOnly&&C.canSurvey(G)==='ok'){   // 'late' = tidy that does not chart before year 1600: a player who misses the window
      const nd=G.need||{food:4,metal:3};
      if(E.food>nd.food*P.sFood&&E.metal>P.sMetal) C.survey(G);
    }
    // 7. the Long Night: expand and pro buy berths; only pro takes the empire apart in time
    if(G.night&&C.arkBuy&&bot!=='greedy'){
      const left=C.nightLeft(G);
      if(P.dep){ if(!G.ark.mode) C.arkPlan(G,P.level||2) }                                   // the depositor: choose a level once, Earth sets it aside
      else if(left<=(P.buyLeft||600)&&!G.ark.mode){ for(let l=4;l>=1;l--){ if(C.arkBuy(G,l)==='ok') break } }   // everyone else: the best level they can pay outright
      if(pro&&left<=400){
        // stop expanding: release lines, lift colonies with whatever is free, scrap what is home
        G.ships.forEach(s=>{ if(s.from&&s.to&&s.mode!=='dead') C.clearLine(G,s.id) });
        for(const k in G.colonies){
          const p=C.planet(k); const s=freeHulls(G).find(s=>reachOK(s,p)&&C.HULLS[s.hull].key==='courier'); if(s) C.abandon(G,s.id,k); }
        if(left<=150||per(25)) freeHulls(G).forEach(s=>C.scrap(G,s.id));
      }
    }
    // 6. break up hulls the yards no longer build
    if(pro&&per(120)) C.scrapIdle(G,(G.gen||0)-2);
    }
  }
  if(process.env.DUMP&&bot==='pro'&&seed==+process.env.DUMP){ require('fs').writeFileSync(require('os').tmpdir()+'/dump.json',C.exportLog(G)) }
  let worlds=0, depth=0, couriers=0, big=0, tiers=0;
  for(const k in G.colonies){ worlds++; depth+=1+C.planet(k).sec*0.5; tiers+=(G.colonies[k].tier||0) }
  G.ships.forEach(s=>{ if(s.mode==='dead')return; const h=C.HULLS[s.hull]; if(h.key==='courier')couriers++; else big++ });
  let crew=0; G.ships.forEach(s=>{ if(s.mode!=='dead') crew+=(s.crew||0) });
  const souls = G.over==='night' ? (G.souls||0) : 0;
  return {seed, bot, day:G.day, over:G.over||'alive', worlds, sectors:C.SECTORS.length, gen:G.gen||0,
    souls, berths:G.ark?C.arkLevel(G):0, night:G.night||0,
    idlePeople:Math.round(G.earth.people), crew, out:+(1+0).toFixed(2),
    score:+(depth+ (G.gen||0)*3 + C.SECTORS.length*2 + tiers*0.5).toFixed(1), couriers, big, tiers,
    deepest:Math.max(0,...Object.keys(G.colonies).map(k=>C.planet(k).sec))};
}

const corePath=process.argv[2]||'core.js';
const days=+(process.argv[3]||2600);
const seeds=(process.argv[4]||'11,22,33,44,55,66,77,88').split(',').map(Number);
const bots=(process.env.BOTS?process.env.BOTS.split(','):['idle','greedy','rush','serial','ark','bank']);
const agg={};
for(const bot of bots){
  const rows=seeds.map(sd=>play(load(corePath),sd,days,bot));
  const avg=f=>+(rows.reduce((a,r)=>a+f(r),0)/rows.length).toFixed(1);
  agg[bot]={score:avg(r=>r.score), worlds:avg(r=>r.worlds), sectors:avg(r=>r.sectors), gen:avg(r=>r.gen),
    deepest:avg(r=>r.deepest), day:avg(r=>r.day), alive:rows.filter(r=>r.over==='alive').length,
    courier:avg(r=>r.couriers), big:avg(r=>r.big), home:avg(r=>r.idlePeople), crew:avg(r=>r.crew),
    souls:avg(r=>r.souls), berths:avg(r=>r.berths), sailed:rows.filter(r=>r.over==='night').length, night:avg(r=>r.night), tiers:avg(r=>r.tiers||0)};
}
console.log(corePath, days+'d', seeds.length+' seeds');
console.log(['bot','score','worlds','sect','gen','deep','end yr','alive','courier','big','home','crew','night@','berths','souls','sailed','tiers'].join('\t'));
for(const b of bots){const a=agg[b];
  console.log([b,a.score,a.worlds,a.sectors,a.gen,a.deepest,a.day,a.alive+'/'+seeds.length,a.courier,a.big,a.home,a.crew,a.night,a.berths,a.souls,a.sailed+'/'+seeds.length,a.tiers].join('\t'));}
