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
    'orderKit','canKit','kitCost','lineHold','kitOpen','kitTier','exportLog','setWant','setRenew','lineOf','lineCount','lineWant','yardCheck','legDays','mutinyForecast','foodForecast','foodShort'];
  const f=new Function(src+'\n;return {'+names.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')+'};');
  return f();
}
function freeHulls(G){return G.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.mutiny)}
const CLS=['courier','hauler','freighter'];
let noFreeWellNow=G=>true;
function lined(G,pid){return G.ships.some(s=>s.mode!=='dead'&&s.from===pid)}

/* v4.27: one year of the bot — the same head drives the sim and the browser bot (playtest.js --brain sim) */
function step(C,G,bot,d,st){
  const {PLANETS,HULLS,K}=C; const idleY=st.idleY, fuelHist=st.fuelHist;
  noFreeWellNow=G=>!PLANETS.some(p=>p.kind==='well'&&p.sec<C.SECTORS.length&&!G.colonies[p.id]&&!G.ghost[p.id]);
  const reachOK=(s,p)=>C.canReachSector(s,p.sec);
    if(bot==='idle') return;
    const E=G.earth;
    const maxSec = bot==='greedy' ? 1 : 99;
    const P=STYLES[bot]||{hands:30, keep:(bot==='pro'||bot==='tidy'||bot==='late')?260:60, sFood:90, sMetal:300, evac:bot==='tidy'||bot==='late', legacy:true};
    const pro = !P.legacy||bot==='pro'||bot==='tidy'||bot==='late';   // v4.15: 'tidy' = pro that also evacuates spent worlds, as a player does
    if(P.every&&d%P.every!==0) return;                    // a visitor is away between visits
    const per=n=>!!P.every||d%n===0;                         // on a visit every periodic chore is due
    const need=G.need||{food:5,metal:3};
    for(let rep=0;rep<(P.reps||1);rep++){

    // 1. every settled world wants a line.
    //    pro (v4.27 planner, Nikita 07.10 'боты тупые'): a standing order sized to what the world makes, in the class
    //    the yards can fill; renewal off (parts buy hulls, not replacements); a dead world's order is released;
    //    wells first when Earth is short of fuel, farms first when short of rations, works always.
    //    `unfilled` = hulls the yards still owe — while it is high, nothing else is bought.
    let unfilled=0, farmNeed=false, wellNeed=false, kindNeed={}, resv={metal:0,fuel:0,food:0}, fuelRunway=1e9, fuelTight=false;
    if(pro){
      // hands are the scarce currency: a hull idle on the pier for 15 years gives its crew back (scrap), the yards
      // never take Earth below EARTH_KEEP+hands, and a class is only ordered if two crews of it fit the pool
      for(const sh of G.ships){ if(sh.mode==='idle'&&sh.at==='earth'){ idleY[sh.id]=(idleY[sh.id]||0)+1; if(idleY[sh.id]>=15){ C.clearLine(G,sh.id); C.scrap(G,sh.id); delete idleY[sh.id] } } else delete idleY[sh.id] }
      // what Earth lives on: for each trade, the income of lined worlds whose seam will last, against the burn.
      // a trade with no lasting world behind it is 'needed' — settled first, its line served first, and it may
      // break the fleet gate and the survey gate (fuel comes only from wells; no fuel, no survey, no wells)
      const inc={food:0,fuel:0,metal:0}, lasting={food:0,fuel:0,metal:0};
      for(const k in G.colonies){ const p=C.planet(k), lr=C.lineRate(G,k); if(!lr||lr.dry||!lined(G,k)) continue;
        const dep=p.kind==='farm'?'food':p.kind==='well'?'fuel':p.kind==='mine'?'metal':null; if(!dep) continue;
        inc[dep]+=lr.makes; if(G.reserves[k]>Math.max(3000,lr.makes*300)) lasting[dep]++ }
      const nl=G.night?C.nightLeft(G):9999, late=nl<=600;
      const worksLined=Object.keys(G.colonies).some(k=>C.planet(k).kind==='works'&&lined(G,k));
      farmNeed=inc.food<need.food*1.5||!lasting.food;
      wellNeed=(inc.fuel<4&&E.fuel<4000)||!lasting.fuel;
      const mineNeed=(inc.metal<need.metal*1.5+4&&E.metal<6000)||!lasting.metal;
      kindNeed={farm:farmNeed,well:wellNeed,mine:mineNeed,works:!worksLined};
      let wellLeft=0; for(const k in G.colonies){ if(C.planet(k).kind==='well') wellLeft+=Math.max(0,G.reserves[k]||0) }
      const scF=C.surveyCost(C.SECTORS.length).fuel;
      fuelRunway=E.fuel+wellLeft; fuelTight=fuelRunway<scF*3+1500;   // the ring after this one still has to be paid for in fuel
      // reserves: the next survey must stay affordable (fuel comes only from wells — no fuel, no ring, no well),
      // and from 600 years out the larder must carry Earth to the Night, because the lines stop one by one (mutiny)
      const sc=C.surveyCost(C.SECTORS.length);
      resv={metal:Math.max(500,sc.metal+200), fuel:sc.fuel+300, food:sc.food+need.food*(late?nl+30:30)};
      const fuelShort=E.fuel<Math.max(1500,resv.fuel)||wellNeed, foodShort=E.food<Math.max(need.food*60,resv.food)||farmNeed, metalShort=E.metal<1500||mineNeed;
      if(G.night&&G.ark&&G.ark.mode==='deposit'&&nl<=400){ const L4=C.K.ARK_LEVELS[G.ark.target-1]||{};
        const owed=r=>Math.max(0,(L4[r]||0)-(G.ark.paid[r]||0));
        resv.fuel=Math.max(resv.fuel,C.K.FEED_FUEL_FLOOR+owed('fuel')+400); resv.metal=Math.max(resv.metal,owed('metal')+need.metal*20+200);
        // the larder is full and the fuel is not: the lines stop (every flight burns fuel); only wells keep flying
        const larderFull=E.food>=need.food*(nl+20)+owed('food')&&E.metal>=owed('metal')+need.metal*nl&&E.parts>=owed('parts');
        const fuelOwed=C.K.FEED_FUEL_FLOOR+owed('fuel');
        if(E.fuel<resv.fuel||(larderFull&&E.fuel<fuelOwed+600)){ for(const k in G.colonies){ const p=C.planet(k); if(p.kind==='well'||(p.kind==='farm'&&!larderFull&&E.fuel>=fuelOwed+100)) continue;
          for(const sh of G.ships){ if(sh.mode!=='dead'&&sh.from&&sh.to&&(sh.from===k||sh.to===k)) C.clearLine(G,sh.id) } } }
        if(E.parts<owed('parts')+50){ for(const k in G.colonies){ if(C.planet(k).kind!=='works') continue; const L=C.lineOf(G,k); if(L&&!(L.want.courier||L.want.hauler||L.want.freighter)) C.setWant(G,k,'courier',1) } } }
      // freeze: when a reserve is broken, standing orders that do not haul the short trade stop growing (the yards spend it)
      if(E.metal<resv.metal||E.fuel<resv.fuel){ for(const k in G.colonies){ const L=C.lineOf(G,k); if(!L) continue; const p=C.planet(k);
        const helps=(E.metal<resv.metal&&p.kind==='mine')||(E.fuel<resv.fuel&&p.kind==='well'); if(helps) continue;
        for(const c of CLS){ const have=C.lineCount(G,k,c); if((L.want[c]||0)>have) C.setWant(G,k,c,have) } } }
      const order=[];
      for(const k in G.colonies){ const p=C.planet(k), lr=C.lineRate(G,k); if(!lr) continue; let L=C.lineOf(G,k);
        if(lr.dry&&lr.sitting<1){ if(L){ for(const c of CLS) if(L.want[c]) C.setWant(G,k,c,0) } continue }
        if(L){ for(const c of CLS){ const w=L.want[c]||0, have=C.lineCount(G,k,c); if(w>have){ const yc=C.yardCheck(G,k,c);
          if(yc==='range'||yc==='locked'||yc==='retired'||yc==='mutiny') C.setWant(G,k,c,have); else unfilled+=w-have } } }
        if(!L||!(L.want.courier||L.want.hauler||L.want.freighter)){ C.setWant(G,k,'courier',1); C.setRenew(G,k,false); if(C.lineOf(G,k)) unfilled++; continue }
        const pri=(p.kind==='well'&&fuelShort?3:0)+(p.kind==='farm'&&foodShort?3:0)+(p.kind==='mine'&&metalShort?2.5:0)+(p.kind==='works'?2:0)+Math.min(1,lr.sitting/3000);
        if(lr.piling&&(lr.sitting>1500||lr.hulls===0)) order.push({k,pri}) }
      order.sort((a,b)=>b.pri-a.pri);
      const prelude=C.SECTORS.length<3;
      let crewOut=0; for(const sh of G.ships){ if(sh.mode!=='dead') crewOut+=(sh.crew||0) }
      const crewBudget=(E.people+crewOut)*0.6;
      if(d%25===0) fuelHist.push(E.fuel); const fuelFalling=fuelHist.length>=3&&E.fuel<fuelHist[fuelHist.length-3]&&E.fuel<6000;
      if(E.fuel<C.K.FEED_FUEL_FLOOR+300&&!lasting.fuel){ for(const k in G.colonies){ if(C.planet(k).kind==='well') continue;   // no fuel and no well: the lines stop until a well is lined
        for(const sh of G.ships){ if(sh.mode!=='dead'&&sh.from&&sh.to&&(sh.from===k||sh.to===k)) C.clearLine(G,sh.id) } } }
      if(fuelFalling){ for(let i=order.length-1;i>=0;i--){ if(C.planet(order[i].k).kind!=='well') order.splice(i,1) } }
      if(prelude){ for(let i=order.length-1;i>=0;i--){ const kind=C.planet(order[i].k).kind; if(kind==='mine'&&E.metal>sc.metal+300) order.splice(i,1) } }
      if(order.length&&per(5)&&unfilled<=2&&!(fuelTight&&noFreeWellNow(G))&&!(prelude&&E.fuel<sc.fuel+200)){ const k=order[0].k, L=C.lineOf(G,k);
        const classes=P.big?['freighter','hauler','courier']:['hauler','courier'];
        const crewOf=c=>{ let b=null; for(const h of HULLS){ if(h.key===c&&h.gen<=(G.gen||0)&&(!b||h.gen>b.gen)) b=h } return b?b.crew:999 };
        const fits=c=>E.people-K.EARTH_KEEP-P.hands>2*crewOf(c)&&crewOut+crewOf(c)<=crewBudget;
        const cls=classes.find(c=>fits(c)&&C.yardCheck(G,k,c)==='ok')||classes.find(c=>fits(c)&&C.yardCheck(G,k,c)==='parts')||(fits('courier')?'courier':null);
        const tot=(L.want.courier||0)+(L.want.hauler||0)+(L.want.freighter||0);
        if(cls&&tot<8) C.setWant(G,k,cls,(L.want[cls]||0)+1) }
    } else for(const k in G.colonies){
      if(lined(G,k)) continue;
      const p=C.planet(k);
      const s=freeHulls(G).find(s=>reachOK(s,p));
      if(s) C.setLine(G,s.id,k,'earth');
    }
    // 2. settle the best free world we can reach (deeper is richer)
    const arkOnly=G.night&&C.nightLeft(G)<=(P.ark?P.arkLeft:(pro?600:0));              // v4.27: every style stops growing before the end (the ark runner earlier) — the fleet shrinks, the tank fills
    const anyNeed=!!(kindNeed.farm||kindNeed.well||kindNeed.mine||kindNeed.works);
    if(!arkOnly&&E.people>K.EARTH_KEEP+P.hands&&!(P.foodYears&&E.food<need.food*P.foodYears)&&(!pro||unfilled<=2||anyNeed)){
      let best=null,bv=-1e9;
      for(let i=0;i<PLANETS.length;i++){
        const p=PLANETS[i];
        if(p.sec>=C.SECTORS.length||p.sec>maxSec) continue;
        if(G.colonies[p.id]||G.ghost[p.id]) continue;
        if(P.serial&&!kindNeed[p.kind]&&Object.keys(G.colonies).some(k=>C.planet(k).kind===p.kind&&(p.kind==='works'||G.reserves[k]>0))) continue;   // one live world per trade (a second when the first cannot keep Earth)
        if(pro&&G.night&&C.nightLeft(G)<=600&&!kindNeed[p.kind]) continue;   // 600 years out: only what Earth is short of
        if(pro&&unfilled>2&&!kindNeed[p.kind]) continue;   // the fleet is behind: only what Earth starves for
        const s=freeHulls(G).find(s=>reachOK(s,p));
        if(!s) continue;
        let v = -p.dist;   // nearest first: the chart fills outward on its own
        if(pro){ const liveWell=Object.keys(G.colonies).some(k=>C.planet(k).kind==='well'&&G.reserves[k]>0);
          if(!liveWell&&p.kind==='well') v+=1000;
          if(p.kind==='farm'&&E.food>(G.need?G.need.food:5)*80) v-=500;
          if(p.kind==='farm'&&E.food<(G.need?G.need.food:5)*40) v+=800;
          if(kindNeed[p.kind]) v+=(p.kind==='farm'?2000:p.kind==='well'?1800:p.kind==='works'?1600:1500); }
        if(v>bv){bv=v;best={p,s}}
      }
      if(best) C.colonize(G,best.s.id,best.p.id,26,0);
    }
    // 1b. v4.4: a world whose stockyard is filling faster than the line carries gets a second hull (pro)
    if(pro&&P.legacy&&per(15)){
      for(const k in G.colonies){ const c=G.colonies[k]; if(!lined(G,k)) continue;
        const lr=C.lineRate(G,k); if(!lr||!lr.piling) continue;
        if((c.store[lr.dep]||0)<3000) continue;   // v4.5: the yard is bottomless; a pile this big means the line is thin
        // v4.6: one more hull on the standing order — a hauler if the class reaches, else a courier
        const cls=(C.yardCheck(G,k,'hauler')!=='range'&&C.yardCheck(G,k,'hauler')!=='locked')?'hauler':'courier';
        if(C.lineWant(G,k,cls)<4){ C.setWant(G,k,cls,C.lineWant(G,k,cls)+1); C.setRenew(G,k,true); break }
      }
    }
    // 3. yards — cheapest hull that can serve the deepest world wanting service
    const prelude2=pro&&C.SECTORS.length<3;
    if(!arkOnly&&freeHulls(G).length<(pro?(prelude2?1:2):1)&&(!pro||unfilled===0)&&!(prelude2&&E.fuel<C.surveyCost(C.SECTORS.length).fuel+150)){
      let want=0;
      for(const k in G.colonies){ if(!lined(G,k)) want=Math.max(want,C.planet(k).sec);
        else if(pro){ const lr=C.lineRate(G,k); if(lr&&lr.piling&&(G.colonies[k].store[lr.dep]||0)>3000) want=Math.max(want,C.planet(k).sec) } }
      for(let i=0;i<PLANETS.length;i++){ const p=PLANETS[i];
        if(p.sec<C.SECTORS.length&&p.sec<=maxSec&&!G.colonies[p.id]&&!G.ghost[p.id]) want=Math.max(want,p.sec) }
      const keep = P.keep;
      const cands=HULLS.map((h,i)=>({h,i}))
        .filter(x=>x.h.gen<=(G.gen||0)&&x.h.gen>=(G.gen||0)-K.GEN_OVERLAP)   // v4.27: the yard window, not only the newest — parts grow ×3.4 a generation
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
      const pool=((bulk>3000||P.big)&&pool0.some(x=>x.h.key==='hauler') ? pool0.filter(x=>x.h.key!=='courier') : pool0).sort((a,b)=>(a.h.parts||0)-(b.h.parts||0)||a.h.metal-b.h.metal);
      let laid=false;
      for(const x of pool){
        if(E.metal-x.h.metal<keep) continue;
        if(pro&&E.people-K.EARTH_KEEP-P.hands<2*(x.h.crew||0)) continue;
        if(pro&&(E.metal-x.h.metal<resv.metal||E.fuel-x.h.fuel<resv.fuel)) continue;
        if(C.buildShip(G,x.i)==='ok'){ laid=true; break }
      }
      if(!laid&&pool0.length){ const x=pool0.sort((a,b)=>(a.h.parts||0)-(b.h.parts||0)||a.h.metal-b.h.metal)[0]; if(E.metal-x.h.metal>=keep) C.buildShip(G,x.i) }   // a courier beats nothing
    }
    // 3b. v4.27: a standing order the yards cannot fill for parts is pinned to the older generation they can
    if(pro&&per(10)){
      for(const k in G.colonies){ const L=C.lineOf(G,k); if(!L) continue;
        for(const cls of ['courier','hauler','freighter']){ if(!(L.want[cls]>C.lineCount(G,k,cls))) continue;
          if(C.yardCheck(G,k,cls)==='parts'&&(G.gen||0)>0){ const g=(G.gen||0)-1; if(!(L.gen&&L.gen[cls]===g)) C.setWant(G,k,cls,L.want[cls],g) } } }
    }
    // 4. the drive programme
    const partsStarved=pro&&Object.keys(G.colonies).some(k=>{ const L=C.lineOf(G,k); return L&&['courier','hauler','freighter'].some(c=>L.want[c]>C.lineCount(G,k,c)&&C.yardCheck(G,k,c)==='parts') });
    // v4.27: the ark mark is set from the drive held on the day the Night is dated (arkMark = driveLvl + ARK_ABOVE):
    //         a mark run before that day only raises the bar and the price of every hull after it. So: none before the
    //         Night; after it, up to the mark, and only while the yards owe nothing
    const driveWanted=!pro || (G.night&&(G.driveLvl||0)<G.arkMark&&unfilled<=1);
    if(bot!=='greedy'&&bot!=='expand'&&!G.drive&&driveWanted&&!partsStarved){
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
        if(E.metal-kc.metal<Math.max(400,resv.metal+500)) continue;
        if(!P.legacy&&E.fuel<resv.fuel+800) continue;
        if(!P.legacy&&C.SECTORS.length<3) continue;   // nothing drinks fuel before ring 3 is charted
        let v=c.pop*p.rich/(kc.tier); if(p.kind==='works'&&!P.legacy){ let pin=0; for(const k2 in G.colonies){ if(C.planet(k2).kind==='works'&&lined(G,k2)){ const l2=C.lineRate(G,k2); if(l2) pin+=l2.makes } } if(pin<20) v*=4 }
        if(v>bv){bv=v;best={k,kc,p}} }
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
    const noFreeWell=!PLANETS.some(p=>p.kind==='well'&&p.sec<C.SECTORS.length&&!G.colonies[p.id]&&!G.ghost[p.id]);
    const starved=pro&&(Object.keys(kindNeed).some(kind=>kindNeed[kind]&&!PLANETS.some(p=>p.kind===kind&&p.sec<C.SECTORS.length&&!G.colonies[p.id]&&!G.ghost[p.id]))
      ||(fuelTight&&noFreeWell)||C.SECTORS.length<3);   // ring 3 is charted as soon as the desk can: it dates the Night and holds the next wells
    if(bot!=='greedy'&&!(bot==='late'&&G.day<1600)&&!arkOnly&&C.canSurvey(G)==='ok'&&(!pro||((unfilled<=1||starved)&&(!(G.night&&C.nightLeft(G)<=600)||starved)))){   // 'late' = tidy that does not chart before year 1600: a player who misses the window
      const nd=G.need||{food:4,metal:3};
      const sc=C.surveyCost(C.SECTORS.length);
      if((E.food-sc.food>nd.food*Math.max(P.sFood,60)&&E.metal>P.sMetal)||starved) C.survey(G);   // v4.27: the survey eats rations ×1.52 a ring
    }
    // 7. the Long Night: expand and pro buy berths; only pro takes the empire apart in time
    if(G.night&&C.arkBuy&&bot!=='greedy'){
      const left=C.nightLeft(G);
      if(P.dep||(pro&&!P.buyLeft)){ if(!G.ark.mode) C.arkPlan(G,P.level||1);                   // v4.27: deposits from the day of the date (a player who waits pays with the larder)
        else if(G.ark.mode==='deposit'&&per(20)&&C.arkLevel(G)>=G.ark.target&&G.ark.target<4){ const nx=C.K.ARK_LEVELS[G.ark.target]; if(nx&&E.metal>nx.metal*1.3&&E.food>nx.food*1.3&&E.fuel>nx.fuel*1.3&&E.parts>nx.parts*1.3) C.arkPlan(G,G.ark.target+1) } }
      else if(left<=(P.buyLeft||600)&&!G.ark.mode){ for(let l=4;l>=1;l--){ if(C.arkBuy(G,l)==='ok') break } }   // the bank: the best level it can pay outright
      if(pro&&left<=1500){
        // v4.27: the lines run until their crews refuse (the larder carries Earth after that); a world is lifted in the
        // window where a courier still signs for the round trip; hulls idle on the pier give their crews back
        for(const k in G.colonies){ const p=C.planet(k);
          const cands=HULLS.map((h,i)=>({h,i})).filter(x=>x.h.key==='courier'&&x.h.gen<=(G.gen||0)&&x.h.gen>=(G.gen||0)-K.GEN_OVERLAP&&C.canReachSector({hull:x.i},p.sec)).sort((a,b)=>(a.h.parts||0)-(b.h.parts||0));
          if(!cands.length) continue;
          const rt=C.legDays(G,k,'earth',{hull:cands[0].i})*2;
          if(left<=3.2*rt+60){ const s=freeHulls(G).find(s=>reachOK(s,p)&&HULLS[s.hull].key==='courier'&&left>=(K.MUTINY_MIN+K.MUTINY_SPREAD)*C.legDays(G,k,'earth',s)*2+2);
            if(s){ if(C.abandon(G,s.id,k)!=='ok') continue }
            else if(per(5)&&E.metal-cands[0].h.metal>=300&&E.parts>=(cands[0].h.parts||0)) C.buildShip(G,cands[0].i) } }
        if(left<=100) freeHulls(G).forEach(s=>C.scrap(G,s.id));
      }
    }
    // 6. break up hulls the yards no longer build (legacy bots; the planner scraps by idle years)
    if(pro&&P.legacy&&per(120)) C.scrapIdle(G,(G.gen||0)-2);
    }
}

function play(C,seed,days,bot,hook){
  const G=C.newGame(seed);
  const {PLANETS,HULLS,K}=C; const idleY={}; const fuelHist=[];
  noFreeWellNow=G=>!PLANETS.some(p=>p.kind==='well'&&p.sec<C.SECTORS.length&&!G.colonies[p.id]&&!G.ghost[p.id]);
  const reachOK=(s,p)=>C.canReachSector(s,p.sec);
  const st={idleY,fuelHist};
  for(let d=0;d<days&&!G.over;d++){ C.tick(G); G.pauseNow=false; step(C,G,bot,d,st) }
  if(process.env.DUMP&&bot==='pro'&&seed==+process.env.DUMP){ require('fs').writeFileSync(require('os').tmpdir()+'/dump.json',C.exportLog(G)) }
  if(hook) hook(G);
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

module.exports={STYLES,load,play,step};
if(require.main===module){
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
}
