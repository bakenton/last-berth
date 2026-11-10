// pw50 — v4.49 (итерация 5, ручной плейтест Claude 04.11 и решения Никиты): окно мира стоит время; Пропуск не встаёт на рутине;
// (Пропуск убран в v4.50) верфь — заказ наверху, «Строить» не съезжает; множитель рождаемости на экране; обменник Земли (v5.01, вместо цеха F-55); тягач I без деталей;
// уровни ковчега II–IV будят больше спящих. Клики — мышью по видимым кнопкам; состояние ставится через хуки.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start('en',11); await U.clear();

  // 1. a world window stops the clock; a click outside closes it and the clock runs again
  await U.play(4); await p.waitForTimeout(800);
  const wid=await p.evaluate(()=>PLANETS.find(x=>x.sec===0&&x.kind!=='works').id);
  await p.evaluate(id=>{ LNU.win=id; LNdraw() },wid); await p.waitForTimeout(150);
  const d0=await U.day(); await p.waitForTimeout(1500); const d1=await U.day();
  ok('a world window stops the clock at 4×', d1===d0&&await p.evaluate(()=>LNI.halted()), d0+' → '+d1);
  const r=await p.evaluate(()=>{ const o=document.getElementById('ovl').getBoundingClientRect(); return {x:o.right-20,y:o.bottom-20} });
  await U.at(r.x,r.y);
  ok('a click outside closes the world window', await p.evaluate(()=>!LNU.win));
  await p.waitForTimeout(1500);
  ok('the clock runs again', (await U.day())>d1, d1+' → '+(await U.day()));
  await U.pause();

  // 2. v4.50 (Nikita 05.11: «пропуск целиком»): no Skip button — only the speeds
  ok('no Skip button', !(await p.$('#top [data-act="skip"]')) && (await p.$$('#top [data-act="spd"]')).length>=3);

  // 3. the births multiplier: the strip and the Earth window
  await p.evaluate(()=>{ LN.earth.food=LN.need.food*40; LNdraw() });
  const strip=await p.evaluate(()=>document.querySelector('#res .rc[data-r="people"] em').textContent);
  ok('the strip shows the births multiplier', /BIRTHS ×1\.00/i.test(strip), strip);
  await U.tap('#tabs [data-act="tab"][data-v="earth"]'); await p.waitForTimeout(300);
  const ew=await p.evaluate(()=>document.querySelector('#ovl .win').innerText);
  ok('the Earth window shows births and the 80-year mark', /Births\s+×1\.00/.test(ew)&&/×1\.50 with food for 80 years/.test(ew), (ew.match(/Births[^\n]*\n[^\n]*/)||[''])[0]);

  // 4. v5.01 (F-55 → exchange, Nikita 05.11): Earth's exchange — get one resource for two others; mouse on the visible buttons
  await p.evaluate(()=>{ LN.earth.metal=9000; LN.earth.food=5000; LN.earth.fuel=5000; LN.earth.parts=0; ['metal','fuel','parts'].forEach(k=>openRes(LN,k)); LNU.win='earth'; LNdraw() }); await p.waitForTimeout(250);
  ok('no workshop on the Earth tab', !(await p.$('#ovl [data-act="ws"]')) && await p.evaluate(()=>typeof workshop==='undefined'&&typeof setWorkshop==='undefined'));
  ok('the exchange block is on the Earth tab', !!(await p.$('#ovl #exblk [data-act="exgo"]')));
  await U.tap('#ovl [data-act="exget"][data-v="parts"]'); await U.tap('#ovl [data-act="expay"][data-v="metal+fuel"]'); await U.tap('#ovl [data-act="exn"][data-v="10"]');
  const c=await p.evaluate(()=>Object.assign(exchangeCost(LN,'parts','metal','fuel',10),{k:K.EX_K}));
  const e0=await p.evaluate(()=>({m:LN.earth.metal,f:LN.earth.fuel,p:LN.earth.parts}));
  await U.tap('#ovl [data-act="exgo"]'); await p.waitForTimeout(200);
  const e1=await p.evaluate(()=>({m:LN.earth.metal,f:LN.earth.fuel,p:LN.earth.parts}));
  ok('10 parts for metal + fuel at the exchange rate', e1.p-e0.p===10&&e0.m-e1.m===c.metal&&e0.f-e1.f===c.fuel&&c.metal===Math.ceil(10*4*c.k/2), JSON.stringify([c,e0,e1]));
  ok('the exchange is in the log', await p.evaluate(()=>LN.log.some(e=>e.code==='exchange')));
  // not enough to pay: the button refuses with the reason, nothing moves
  await p.evaluate(()=>{ LN.earth.fuel=10; LNdraw() }); await p.waitForTimeout(150);
  await U.tap('#ovl [data-act="exn"][data-v="200"]');
  const why=await p.evaluate(()=>{ const b=document.querySelector('#ovl [data-act="exgo"]'); return b&&(b.getAttribute('data-why')||'') });
  const e2=await p.evaluate(()=>({m:LN.earth.metal,f:LN.earth.fuel,p:LN.earth.parts}));
  await U.tap('#ovl [data-act="exgo"]'); await p.waitForTimeout(200);
  const e3=await p.evaluate(()=>({m:LN.earth.metal,f:LN.earth.fuel,p:LN.earth.parts}));
  ok('200 parts without the fuel: refused, stores unchanged', /fuel/i.test(why)&&JSON.stringify(e2)===JSON.stringify(e3), why);
  ok('the same resource cannot pay for itself', await p.evaluate(()=>exchangeCheck(LN,'parts','parts','metal',1)==='exSame'));
  await p.evaluate(()=>{ LN.earth.fuel=5000; LNdraw() });   // the yard step below orders hulls that burn fuel
  await p.keyboard.press('Escape');

  // 5. the yard: the order cards come first and Build stays put after an order
  await p.evaluate(()=>{ LN.earth.metal=5000; LNdraw() });
  await U.tap('#tabs [data-act="tab"][data-v="yard"]'); await p.waitForTimeout(400);
  const pos=()=>p.evaluate(()=>{ const b=document.querySelector('#ovl [data-act="build"]'); const r=b.getBoundingClientRect(); return Math.round(r.top) });
  const y0=await pos(); await U.tap('#ovl [data-act="build"]'); await U.tap('#ovl [data-act="build"]'); const y1=await pos();
  ok('Build stays put after two orders', y0===y1&&await p.evaluate(()=>LN.ships.filter(s=>s.mode==='building').length>=2), y0+' → '+y1);
  await p.keyboard.press('Escape');

  // 6. Hauler I: no parts, 100 metal; the Tech tab shows speeds with the drive
  const h=await p.evaluate(()=>{ const x=HULLS.find(h=>h.key==='hauler'&&h.gen===0), y=genHull(1,1); return {m:x.metal,p:x.parts,p2:y.parts} });
  ok('Hauler I: 100 metal, no parts; Hauler II keeps its parts', h.m===100&&h.p===0&&h.p2>0, JSON.stringify(h));

  // 7. v5.10 (ARK.md 2г): the rings of pods cost the ladder's sum over their capsules; nobody wakes without a convoy at the pier
  const a=await p.evaluate(()=>{ LN.arkMark=2; LN.driveLvl=3; const r=[1,2,3,4].map(k=>arkRingPrice(k)); const was=LN.ark; LN.ark={rings:1,woke:1}; const cv=arkConvoy(LN).have, w=arkWakeN(LN); LN.ark=was; return {r,cv,w} });
  ok('ark rings: 1 200/600, 3 200/2 000, 7 600/6 400, 19 000/22 000', a.r[0].food===1200&&a.r[0].metal===600&&a.r[1].food===3200&&a.r[1].metal===2000&&a.r[2].food===7600&&a.r[2].metal===6400&&a.r[3].food===19000&&a.r[3].metal===22000, JSON.stringify(a.r));
  ok('ark: no convoy at the pier = nobody wakes', a.cv===0&&a.w===0, JSON.stringify({cv:a.cv,w:a.w}));

  // 8. v5.02: the hub is evacuated while a feeder hull flies into it with a hold — the hold comes home, the line goes to Earth, one log line
  await U.clear();
  const W=await p.evaluate(()=>{ GOD.maxAll(); GOD.drive(); GOD.drive(); LN.gen=1; LN.driveLvl=1;
    const nw=PLANETS.filter(x=>x.kind!=='works'&&!LN.colonies[x.id]);
    const hub=nw.filter(x=>x.sec===1).sort((a,b)=>a.dist-b.dist)[0];
    const fd=nw.filter(x=>x.sec===2&&x.dist>hub.dist).sort((a,b)=>a.dist-b.dist)[0];
    return {hub:hub.id, fd:fd.id} });
  for(const k of [W.hub,W.fd]) await p.evaluate(k=>{ LNU.win=k; GOD.settle(); LNU.win=null },k);
  const H=await p.evaluate(W=>{ for(let i=0;i<3000&&!(LN.colonies[W.hub]&&LN.colonies[W.fd]);i++) tick(LN);
    LN.earth.metal=LN.earth.parts=LN.earth.fuel=LN.earth.food=50000;
    const r1=buildHub(LN,W.hub), r2=setVia(LN,W.fd,W.hub);
    const hi=HULLS.findIndex(h=>h.key==='hauler'&&h.gen===LN.gen), s=GOD.hull(hi), r3=setLine(LN,s.id,W.fd,'earth');
    const dep=planet(W.fd).dep;   // she is half-way from her world to the hub, the hold full of its trade
    s.cargo={metal:0,food:0,fuel:0,parts:0,people:0}; s.cargo[dep]=123; s.mode='transit'; s.at=null; s.origin=W.fd; s.dest=W.hub; s.dir='out'; s.total=500; s.t=400;
    LN.ships.filter(o=>o!==s&&o.mode==='transit'&&o.dest===W.hub).forEach(o=>{ o.dest='earth' });
    const ci=HULLS.findIndex(h=>h.key==='courier'&&h.gen===LN.gen); GOD.hull(ci); LNdraw();
    return {r:[r1,r2,r3].join(','), sid:s.id, dep, to:s.to} },W);
  ok('setup: hub, feeder via the hub, a hauler on the feeder line', H.r==='ok,ok,ok'&&H.to===W.hub, JSON.stringify(H));
  await U.openWorld(W.hub); await p.waitForTimeout(300);
  const ev=await p.$('#ovl [data-act="evac"]');
  if(ev){ await U.tap('#ovl [data-act="evac"]'); await p.waitForTimeout(300) }
  ok('evacuation ordered with the mouse', await p.evaluate(W=>LN.ships.some(o=>o.job==='evac'&&o.dest===W.hub),W), ev?'button found':'no evac button');
  await U.closeWin();
  const gone=await U.until(async()=>await p.evaluate(W=>!LN.colonies[W.hub],W),400,10);
  const toastT=await p.evaluate(()=>{ const e=document.querySelector('#toasts'); return e?e.innerText:'' });
  await U.pause();
  const A=await p.evaluate(([W,H])=>{ const s=shipById(LN,H.sid), L=LN.log.filter(e=>e.code==='hub_lost');
    return {n:L.length, d:L[0]&&L[0].d, via:LN.colonies[W.fd]&&LN.colonies[W.fd].via, from:s.from, to:s.to, hold:s.cargo[H.dep], mode:s.mode, dest:s.dest} },[W,H]);
  ok('hub evacuated: one hub_lost entry, 1 line', gone&&A.n===1&&A.d.p===W.hub&&A.d.n===1, JSON.stringify(A));
  ok('the hub_lost toast is on screen', /The hub at .+ is gone\. Lines back to Earth: 1\./.test(toastT), toastT.replace(/\n/g,' | '));
  ok('the feeder ships to Earth, the hauler keeps her line and her hold', A.via===null&&A.from===W.fd&&A.to==='earth'&&A.hold===123, JSON.stringify(A));
  const home=await p.evaluate(H=>{ const i0=LN.log.length; for(let i=0;i<1500;i++){ tick(LN); const e=LN.log.slice(i0).find(e=>e.code==='delivered'&&e.d.n===H.sid); if(e) return e.d } return null },H);
  const dk={metal:'m',food:'f',fuel:'u',parts:'t'}[H.dep];
  ok('the hold is delivered to Earth', !!home&&home[dk]===123, JSON.stringify(home));

  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
 }catch(e){ out.push('ERROR '+String(e&&e.stack||e).slice(0,600)) }
 console.log(out.join('\n'));
 process.exit(out.some(l=>/^(FAIL|ERROR)/.test(l))?1:0);
})();
