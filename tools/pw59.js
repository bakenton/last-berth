// pw59 — v5.23 (Никита, 13.11: «топливо сделать полностью абстрактным»): топливо возят только на Землю, машины жгут её запас.
// В трюме и на мире топлива нет; окно техники без «Fuel on site»; у завода с машинами в «You bring» нет Fuel;
// у Земли нет лишнего — подсказка с годами до остановки, потом «machines stand»; топливо вернулось — снова работают.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW59_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const showWorld=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await U.start('en',11);
  await U.pause();
  const ids=await p.evaluate(()=>{ LNU.shiftStop=false; LN.safe=true;
    window.COL=t=>({pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:t,fuelOut:0});
    window.TICK=n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } };
    window.HULL=()=>{ LN.earth.metal=1e5; LN.earth.parts=1e4; LN.earth.people=Math.max(LN.earth.people,400); buildShip(LN,HULLS.findIndex(h=>h.gen===(LN.gen||0)&&h.key==='courier')); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; return s.id };
    const pick=k=>(PLANETS.find(q=>q.sec===0&&q.kind===k)||PLANETS.find(q=>q.sec<=1&&q.kind===k)||{}).id||null, mine=pick('mine'), works=pick('works');
    LN.driveLvl=2; LN.gen=2; ensureGen(2);
    [mine,works].forEach(id=>{ LN.colonies[id]=Object.assign({pid:id},COL(2)) });
    LN.earth.food=1e5; LN.earth.metal=1e5; LN.earth.fuel=5000;
    [mine,works].forEach(id=>{ const a=HULL(); setLine(LN,a,id,'earth') });
    window.SEEN={hold:0,site:0}; window.WATCH=()=>{ LN.ships.forEach(s=>{ if(s.cargo&&s.cargo.fuel>0&&s.dest!=='earth') SEEN.hold++ }); for(const k in LN.colonies) if(planet(k).kind!=='well'&&(LN.colonies[k].store.fuel||0)>0) SEEN.site++ };
    const f0=LN.earth.fuel, sp0=LN.fuelSpent||0; let flown=0;
    for(let i=0;i<60;i++){ const before=LN.earth.fuel, k0=LN.kitFuel||0; tick(LN); LN.pauseNow=false; LN.shiftOpen=false; WATCH(); }
    LNdraw(); return {mine,works,f0,f1:LN.earth.fuel,kit:LN.kitFuel||0,burn:kitBurn(LN.colonies[mine])+kitBurn(LN.colonies[works]),seen:SEEN,out:[mine,works].map(id=>LN.colonies[id].fuelOut||0)} });
  ok('fixture: a mine and a works with machines, each on a line', !!ids.mine&&!!ids.works, JSON.stringify(ids));

  // 1. the rule: nothing in a hold, nothing on a world, Earth's stock pays
  ok('60 years: no fuel in an outbound hold, none on a world', ids.seen.hold===0&&ids.seen.site===0, JSON.stringify(ids.seen));
  ok('the machines burnt Earth’s stock: 60 years of both worlds', Math.abs(ids.kit-ids.burn*60)<0.01&&ids.f1<ids.f0, 'burnt '+ids.kit+' of '+ids.burn*60+' · Earth '+ids.f0+' → '+Math.round(ids.f1));
  ok('they run', ids.out.join()==='0,0', ids.out.join());

  // 2. the machines block: what they burn a year, no «fuel on site»
  await showWorld(ids.mine);
  await U.wtab('up');
  let tx=await win();
  ok('machines block: burns a year, no «Fuel on site»', await p.isVisible('#mach')&&/burns/i.test(tx)&&!/fuel on site/i.test(tx), (tx.match(/MACHINES.{0,160}/i)||[tx.slice(0,200)])[0]);
  await shot('1-machines-running');
  await p.keyboard.press('Escape');

  // 3. a works with machines: You bring metal and rations — not fuel
  await showWorld(ids.works);
  tx=await p.innerText('#ovl .trade');
  ok('works with machines: «You bring» is metal and rations, no fuel', /metal/i.test(tx)&&/rations/i.test(tx)&&!/fuel/i.test(tx), tx.replace(/\n/g,' | '));
  const fit=await p.evaluate(id=>{ const f=lineFit(LN,id), r=feedRates(LN,id); return {need:f.need,keys:Object.keys(r).join()} },ids.works);
  ok('the line owes the works no fuel', fit.keys==='metal,food', JSON.stringify(fit));
  await shot('2-works-no-fuel');
  await p.keyboard.press('Escape');

  // 4. Earth has none to spare: the fleet flies, the machines count down and stand
  const dry=await p.evaluate(id=>{ for(let i=0;i<3;i++){ LN.earth.fuel=kitFloor(LN); TICK(1) } LNdraw();   // Earth makes a little fuel of her own — hold her at the floor
    return {out:LN.colonies[id].fuelOut||0,live:kitLive(LN.colonies[id]),floor:Math.round(kitFloor(LN)),fuel:Math.round(LN.earth.fuel),fly:LN.ships.filter(s=>s.mode==='transit').length} },ids.mine);
  ok('Earth at the floor: the machines take nothing, the hulls still fly', dry.out===3&&dry.live&&dry.fly>0, JSON.stringify(dry));
  await showWorld(ids.mine);
  await U.wtab('up');
  tx=await win();
  ok('machines block: the years left before they stand', /no fuel to spare: the machines stand in 12 years/i.test(tx), (tx.match(/MACHINES.{0,220}/i)||[tx.slice(0,200)])[0]);
  await shot('3-machines-dregs');
  await p.evaluate(()=>{ for(let i=0;i<13;i++){ LN.earth.fuel=kitFloor(LN); TICK(1) } LN.earth.fuel=kitFloor(LN); LNdraw() });
  await U.clear();
  await showWorld(ids.mine);
  await U.wtab('up');
  tx=await win();
  const st=await p.evaluate(id=>({live:kitLive(LN.colonies[id]),log:LN.log.some(l=>l.code==='kit_starved'),adv:advice(LN).some(a=>a.code==='a_kitfuel')}),ids.mine);
  ok('15 years short: the machines stand, the log and the advisor say so', !st.live&&st.log&&st.adv, JSON.stringify(st));
  ok('machines block: Earth has no fuel to spare', /earth has no fuel to spare\. the machines stand/i.test(tx), (tx.match(/MACHINES.{0,220}/i)||[tx.slice(0,200)])[0]);
  await shot('4-machines-stand');
  await p.keyboard.press('Escape');

  // 5. fuel again: they run
  const back=await p.evaluate(id=>{ LN.earth.fuel=5000; TICK(2); LNdraw(); return {live:kitLive(LN.colonies[id]),log:LN.log.some(l=>l.code==='kit_running')} },ids.mine);
  ok('fuel at home again: the machines run', back.live&&back.log, JSON.stringify(back));

  // 6. an old save: fuel left on a world goes home with the line, the machines do not touch it
  const old=await p.evaluate(id=>{ const c=LN.colonies[id]; c.exHub=true; c.store.fuel=300; const e0=LN.delivered.fuel; TICK(80); return {left:Math.round(c.store.fuel||0),home:Math.round(LN.delivered.fuel-e0)} },ids.mine);
  ok('fuel an old save left on a world is carried home', old.left<300, JSON.stringify(old));
  ok('no page errors', !errs.length, errs.join(' ; '));
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
