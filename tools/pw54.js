// pw54 — v5.10 «улей» (окно ковчега, design/ark-menu hex-F1/F2/F3), настоящей мышью: покой (WAKE, SLEEP ON, подсказка, без карточки),
// нажатие на кольцо сот (карточка: цена, капсулы, трюм, рационы, FILL RING), покупка колец II–III, нажатие на кольцо конвоя (ADD ALL),
// размеры окна 1440 / 1280 / 390. Состояние — как design/ark-menu/state.js (вставлено сюда: сценарии работают из плоской папки).
// Закрытие ковчега (взлом кольца, CALL HOME, экран конца, старое сохранение) — pw55; обучение m28 / m27 / m20 — pw41.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const path=require('path');
const UI=require('./pw-ui.js');
const SHOTS=process.env.PW54_SHOTS||null;
const out=[]; const ok=(n,v,x)=>out.push((v?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const shot=async(p,n,el)=>{ if(!SHOTS) return; if(el) await el.screenshot({path:path.join(SHOTS,n+'.png')}); else await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
// общее состояние: поздняя середина партии, Ночь датирована, кольцо I куплено, конвой неполный
async function setup(p){ await p.evaluate(()=>{ LNU.shiftStop=false; LN.safe=true; const E=LN.earth;
  LN.driveLvl=2; LN.gen=2; ensureGen(2); while(SECTORS.length<6) openSector(LN); revealNight(LN); LN.nightSeen=true;
  LN.driveLvl=5; LN.gen=5; ensureGen(5); LN.day=2900; LN.night=3802;
  E.people=5180; E.metal=31400; E.food=14200; E.fuel=9100; E.parts=2460;
  arkBuy(LN,1);
  const mk=(cls,gen,res)=>{ buildShip(LN,HULLS.findIndex(h=>h.gen===gen&&h.key===cls)); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; if(res) setReserve(LN,s.id,true) };
  E.metal=1e6; E.parts=1e6; E.fuel=1e6; mk('courier',5,true); mk('courier',5,true); mk('courier',4,true); mk('hauler',5,true); mk('freighter',4,false);
  E.people=5180; E.metal=31400; E.food=14200; E.fuel=9100; E.parts=2460; LNU.notes=[]; LNU.pf=null; LNdraw() }) }
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start('en',309573272); await setup(p); await U.clear(); await U.tab('ark'); await p.waitForTimeout(300);
  const txt=sel=>p.evaluate(s=>{ const e=document.querySelector(s); return e?e.innerText.replace(/\n+/g,' | '):null },sel);
  const st=()=>p.evaluate(()=>({rings:arkRings(LN),paid:arkPaid(LN),caps:arkCaps(arkRings(LN)),ab:arkSouls(LN),wk:arkWakeN(LN),cv:arkConvoy(LN),sel:LNU.arkSel===undefined?null:LNU.arkSel,
    cells:document.querySelectorAll('#ovl .hold .hr:not(#cvring) .hx').length,on:document.querySelectorAll('#ovl .hold .hr:not(#cvring) .hx.on').length,selc:document.querySelectorAll('#ovl .hold .hx.sel').length,
    cvc:document.querySelectorAll('#cvring .hx').length,cvon:document.querySelectorAll('#cvring .hx.on').length,food:Math.round(LN.earth.food),metal:Math.round(LN.earth.metal)}));
  const fits=()=>p.evaluate(()=>{ const w=document.querySelector('#ovl .win').getBoundingClientRect(), bd=document.querySelector('#ovl .win .bd'); return {bottom:Math.round(w.bottom),right:Math.round(w.right),vh:innerHeight,vw:innerWidth,scroll:bd.scrollHeight>bd.clientHeight+2} });
  const clickCell=async sel=>{ const bb=await p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} },sel); if(!bb) return false; await p.mouse.click(bb.x,bb.y); await p.waitForTimeout(200); return true };
  // 1. at rest
  let s=await st();
  ok('at rest: WAKE and SLEEP ON, the hint, no card', (await txt('#arkwake'))!==null&&(await txt('#arksleep'))!==null&&(await txt('#arkcard'))===null&&/Press the hive/i.test(await txt('#ovl .ah-hint')||''), (await txt('#arkwake'))+' / '+(await txt('#arksleep')));
  ok('WAKE = min(aboard, pods) x convoy share; SLEEP ON = the rest', s.wk===Math.floor(Math.min(s.ab,s.caps)*s.cv.share+1e-9)&&new RegExp(String(s.wk).replace(/\B(?=(\d{3})+(?!\d))/g,'.')).test((await txt('#arkwake')).replace(/[\s  ]/g,'.')), JSON.stringify(s));
  ok('the hive: ring I bought = 6 purple cells; the convoy ring has 36 cells', s.on===6&&s.cvc===36&&s.cvon===s.cv.lit, 'cells '+s.cells+' on '+s.on+' convoy lit '+s.cvon);
  ok('the top bar carries WAKE · SLEEP ON', /WAKE · SLEEP ON/i.test(await txt('#topwake')||''), await txt('#topwake'));
  let f=await fits(); ok('1440x900: the window fits, no scroll inside', f.bottom<=f.vh&&!f.scroll, JSON.stringify(f));
  await shot(p,'hive-1-rest');
  // 2. a ring pressed (ring III): the card, the preview of the purchase
  ok('a cell of ring III is under the mouse', await clickCell('#ovl .hold .hr[data-v="3"] .hx'));
  s=await st(); let card=await txt('#arkcard');
  ok('ring III pressed: the card — price, pods, hold, rations, FILL RING III', s.sel===3&&/RING III/i.test(card||'')&&/Price/i.test(card)&&/Pods \| \+3[\s  ]?000/i.test(card)&&/Rations/i.test(card)&&/FILL RING III/i.test(card), card);
  ok('the purchase is previewed on the hive (rings II and III lit pale)', s.selc===12+18, 'sel cells '+s.selc);
  await shot(p,'hive-2-ring');
  const before=s;
  await U.tap('#arkcard [data-act="arkbuy"]');
  s=await st();
  ok('FILL RING III by the mouse: rings 3, rations and metal paid (ring II + III: 10 800 food, 8 400 metal), the card closes', s.rings===3&&s.food===before.food-10800&&s.metal===before.metal-8400&&s.sel===null, JSON.stringify({rings:s.rings,food:s.food,metal:s.metal,on:s.on}));
  ok('the hive shows 36 purple cells (or the hack is asked for)', s.on===36||/Hack needed/i.test(await txt('#hkneed')||''), 'on '+s.on+' · '+(await txt('#hkneed')));
  // 3. the convoy ring pressed
  ok('a cell of the convoy ring is under the mouse', await clickCell('#cvring .hx'));
  s=await st(); card=await txt('#arkcard');
  ok('convoy pressed: in the convoy N of M, at the pier, on the lines, coming home', s.sel==='c'&&/IN THE CONVOY|In the convoy/i.test(card||'')&&new RegExp(s.cv.have+' of '+s.cv.all+' hulls','i').test(card)&&/At the pier/i.test(card)&&/On the lines/i.test(card)&&/Coming home/i.test(card), card);
  await shot(p,'hive-3-convoy');
  const had=s.cv.have;
  if(await p.isVisible('#arkcard [data-act="allpier"]')){ await U.tap('#arkcard [data-act="allpier"]'); s=await st();
    ok('ADD ALL puts the hulls at the pier into the convoy; the ring fills', s.cv.have>had&&s.cvon===s.cv.lit, 'was '+had+' now '+s.cv.have+'/'+s.cv.all+' lit '+s.cvon) }
  else ok('ADD ALL is offered', false, card);
  ok('pressed again — the card closes', await clickCell('#cvring .hx')&&(await st()).sel===null);
  await shot(p,'hive-4-full');
  // 4. sizes
  await p.setViewportSize({width:1280,height:800}); await p.waitForTimeout(300); await p.evaluate(()=>LNdraw()); await clickCell('#ovl .hold .hr[data-v="4"] .hx');
  f=await fits(); ok('1280x800: the window with a card fits, no scroll inside', f.bottom<=f.vh&&!f.scroll, JSON.stringify(f)+' · '+(await txt('#arkcard')));
  await shot(p,'hive-5-1280');
  await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(300); await p.evaluate(()=>LNdraw());
  ok('390 px: no horizontal page scroll', !(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)));
  await shot(p,'hive-6-390',await p.locator('#ovl .win').elementHandle());
  ok('no page errors', p.errs.length===0, p.errs.join(' | ').slice(0,300));
  await b.close();
 }catch(e){ out.push('FAIL crash — '+String(e&&e.stack||e).slice(0,400)) }
 console.log(out.join('\n')); const bad=out.filter(l=>!l.startsWith('PASS')).length; console.log('pw54 '+(out.length-bad)+'/'+out.length); process.exit(bad?1:0);
})();
