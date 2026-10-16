// v4.9 — clock stops only for shift and Night; toasts; SKIP passes shifts when they are not stopped; dead seam: hulls stand down, no order; evac button greys; big buttons; building hull in the Fleet panel
// v4.35: тост — #toasts .toast; смена и Ночь — #noteL; мир — окно мира #ovl; советник — LNI.adv(); Флот — #side (вкладка fleet); SKIP — [data-act="skip"]
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const showWorld=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  await U.start('en',309573272);
  // 1. a pauseNow event does not stop the real clock; a toast appears
  await p.evaluate(()=>{ LNU.shiftStop=false; LNU.paused=false; LNU.speed=10; LN.pauseNow=true; log(LN,'ship_ready',{n:1}) });
  await p.waitForTimeout(500);
  ok('clock kept running through pauseNow', await p.evaluate(()=>LNU.paused===false&&LN.day>=2), await p.evaluate(()=>LN.day));
  ok('toast shown', await p.evaluate(()=>!!document.querySelector('#toasts .toast')));
  // 2. shift stops the clock (with the stop on); the window closes with its button
  await U.clear();
  await p.evaluate(()=>{ LNU.paused=true; LNU.shiftStop=true; LN.day=79; LNU.paused=false }); await p.waitForTimeout(400);
  ok('shift stops the clock', await p.evaluate(()=>LNU.paused===false&&LN.shiftOpen===true&&LNI.halted()===true));
  await U.tap('#noteL [data-act="shiftok"]');
  // 3. SKIP passes shifts when the stop is off (v4.35: the SKIP button replaces FF)
  await p.evaluate(()=>{ LNU.shiftStop=false; LNU.paused=true });
  const d0=await p.evaluate(()=>LN.day);
  await U.tap('[data-act="skip"]'); await p.waitForTimeout(200);
  ok('SKIP: shift does not stop the skip', await p.evaluate(d=>LN.day>d+1&&LNU.paused===true,d0), d0+' → '+(await p.evaluate(()=>LN.day)));
  // 4. the Night still stops the clock
  await U.clear();
  await p.evaluate(()=>{ LN.driveLvl=2; LN.gen=2; ensureGen(2); revealNight(LN); LNU.paused=false; LNdraw() }); await p.waitForTimeout(400);
  ok('Night stops the clock', await p.evaluate(()=>LNI.big()==='night'&&LNI.halted()===true&&!LN.nightSeen));
  await U.tap('#noteL [data-act="nightok"]'); await p.evaluate(()=>{ LNU.paused=true });
  // 5. dead seam: hulls stand down, the order is refused, the world offers only evacuation
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(id=>{ LN.earth.people=300; LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); setLine(LN,s.id,id,'earth'); window.T1=s.id; LN.reserves[id]=3; },mine);   // v4.34: no renewal switch (setRenew removed)
  await p.evaluate(()=>{ LNU.shiftStop=false; LNU.speed=10; LNU.paused=false }); await p.waitForTimeout(900); await p.evaluate(()=>{ LNU.paused=true; LNdraw() });
  await p.evaluate(()=>{ for(let i=0;i<60;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() }); await U.clear();
  ok('depleted logged (LN.log)', await p.evaluate(()=>LN.log.some(l=>l.code==='depleted')));
  ok('clock not paused by depletion', await p.evaluate(()=>LNU.paused===true&&LN.pauseNow===false));
  ok('map: the dead world is drawn in the alarm colour (#FF2A1A)', await p.evaluate(id=>document.querySelector('#map .wd[data-p="'+id+'"]').innerHTML.indexOf('#FF2A1A')>=0,mine), await p.evaluate(id=>LNI.wst(id),mine));
  ok('v4.34: nobody replaces the hull that found nothing (no hull is ordered or left on the spent line)', await p.evaluate(id=>onLine(LN,id).length===0,mine));
  ok('orderFor refused on a dead seam with an empty surface (orderCheck depleted)', await p.evaluate(id=>orderCheck(LN,id,'courier')==='depleted'&&orderFor(LN,id,'courier')==='depleted',mine));
  ok('hull came home and stood down (nothing_left)', await p.evaluate(()=>{ const s=shipById(LN,window.T1); return LN.log.some(l=>l.code==='nothing_left'&&l.d.n===s.id)&&(s.mode==='idle'||s.mode==='dead')&&!s.from }));
  await showWorld(mine);
  const dead=await p.evaluate(()=>({order:document.querySelectorAll('#ovl [data-act="order"]').length, evac:!!document.querySelector('#ovl [data-act="evac"]'), txt:document.getElementById('ovl').textContent.replace(/\s+/g,' ')}));
  ok('dead world, empty surface: no order button, evacuation offered', dead.order===0&&dead.evac, JSON.stringify(dead).slice(0,200));
  ok('dead world window says the seam is exhausted', /exhausted|worked out|Worked out/i.test(dead.txt), dead.txt.slice(0,200));
  // 6. evacuate button greys once pressed
  await p.evaluate(id=>{ LN.earth.metal=5000; buildShip(LN,HULLS.findIndex(h=>h.gen===LN.gen&&h.key==='courier')); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; LNU.pickShip=s.id; LNdraw() },mine);
  const evr=await p.evaluate(id=>abandon(LN,LNU.pickShip,id),mine);
  await showWorld(mine);
  ok('evac button disabled and says under way', await p.evaluate(()=>{ const b=document.querySelector('#ovl [data-act="evac"]'); return !!b&&b.getAttribute('aria-disabled')==='true' }), evr+' '+(await win()).slice(0,160));
  // 7. big buttons on the Earth panel: a survey when a sector can be opened
  await p.evaluate(()=>{ LN.earth.metal=1e5; LN.earth.parts=1e4; LN.earth.fuel=1e5; LN.earth.food=1e5; LN.driveLvl=5; ensureGen(5); LN.gen=5; LN.nightSeen=true; PLANETS.filter(q=>q.sec<=1).forEach(q=>{ if(!LN.colonies[q.id]) LN.colonies[q.id]={pid:q.id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0} }); LNdraw() });
  await U.tab('tech');
  const sv=await p.evaluate(()=>[...document.querySelectorAll('#side [data-act="survey"]')].map(b=>b.getAttribute('aria-disabled')==='true'?'off':'on').join(','));
  ok('survey button in the Tech panel when a sector can be opened', /on/.test(sv), sv);
  await U.tab('tech');
  // 8. v4.17 (F-12/F-13): the building hull sits in the Fleet panel with a progress bar; no yard queue above the dock
  await p.evaluate(()=>{ buildShip(LN,HULLS.findIndex(h=>h.gen===LN.gen&&h.key==='courier')); LNdraw() });
  await U.tab('fleet');
  const yq=await p.evaluate(()=>{ const s=LN.ships[LN.ships.length-1]; const rows=[...document.querySelectorAll('#side .bar u, #side .pbar')].length;
    return {mode:s.mode, id:s.id, rows, side:document.getElementById('side').textContent.replace(/\s+/g,' ')} });
  ok('building hull listed in the Fleet panel (number on the row)', yq.mode==='building'&&yq.side.indexOf('no. '+yq.id)>=0||yq.side.indexOf('No. '+yq.id)>=0||yq.side.indexOf(String(yq.id))>=0, JSON.stringify(yq).slice(0,260));
  // v4.35: полоса прогресса — во вкладке Yard (и на карточках постройки на карте), во Флоте её нет по дизайну
  await U.tab('fleet'); await U.tab('fleet'); await U.tab('yard');
  ok('building hull has a progress bar in the Yard (v4.35: the bar lives in Yard, not Fleet)', await p.evaluate(()=>document.querySelectorAll('#ovl .yr2 .bar u').length>0), await p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' ').slice(0,200)));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
