// pw63 — v5.27 (Никита, 13.11: «как минимум тупо за открытие планеты надо давать немного ресурсов. Тех же деталей или топлива, которых
// мало»; размер — «Да, 80%»; вид — черновик «A · on two rings», «Да, годится»): мир при ПЕРВОМ заселении даёт Земле детали и топливо —
// 80% цены разведки следующего кольца; топливо только в кольцах I–II; только ресурсы, которые игрок уже видит. Число видно до посадки
// (раздел FOUND HERE в окне мира и плашки под именем выбранного мира), при посадке плашки улетают в верхнюю панель, игра не встаёт.
// v5.29: миры сценария — без дока (док проверяет pw64).
// v5.34 (Никита 16.11, п. 8: «Пусть награда выводится при наведении. А когда открыл меню мира награда только в меню»): фишек под именем
// мира больше нет (#gchips не рисуется). Награда — в окне (#gift, FOUND HERE) и в подсказке #tip у мира при наведении мышью (em.tg).
// Проверки фишек переписаны на: при открытом окне #gchips нет; при наведении — #tip.on с двумя .tg (48 и 249 / 108).
// v5.28 (Никита 14.11): после посадки раздела в карточке мира нет; карточка заселённого мира — в две половины, без прокрутки вниз.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW63_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n)=>{ if(SHOTS) await pg.screenshot({path:path.join(SHOTS,n+'.png')}) };
  // what the window and the chart say about the gift of the world whose window is open
  const seen=pg=>pg.evaluate(()=>{ const R=e=>{ if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,r:r.right,b:r.bottom} };
    const g=document.getElementById('gift'), ch=document.getElementById('gchips'), pid=LNU.win, tx=pid&&document.querySelector('#map .wd[data-p="'+pid+'"] text'), cc=ch&&R(ch);
    const under=cc&&document.elementFromPoint(cc.x+cc.w/2,cc.y+cc.h/2);
    return {sec:g?g.querySelector('.sec').innerText.trim():null, got:!!g&&g.classList.contains('got'),
      rows:g?[...g.querySelectorAll('.gf')].map(e=>e.dataset.g+':'+e.innerText.replace(/\s+/g,' ').trim()):[],
      chips:ch?[...ch.querySelectorAll('.gch')].map(e=>e.dataset.g+':'+e.innerText.trim()):[], nchips:document.querySelectorAll('.gch').length,
      chipBox:cc, name:R(tx), win:R(document.querySelector('#ovl .win')), under:under?(under.id||under.className||under.tagName):null,
      sameSign:g?[...g.querySelectorAll('.gf')].every(e=>{ const a=e.querySelector('svg'), s=document.querySelector('#res .rc[data-r="'+e.dataset.g+'"] small svg'); return !!a&&!!s&&a.innerHTML===s.innerHTML }):null} });
  // the world of a ring that stands lowest on the screen: its name is not behind the window
  const lowest=(pg,sec)=>pg.evaluate(sec=>{ const a=PLANETS.filter(q=>q.sec===sec&&!LN.colonies[q.id]&&!(giftFor(LN,q.id)||{}).dock).map(q=>{ const c=document.querySelector('#map .wd[data-p="'+q.id+'"] circle'); return {id:q.id,y:c?c.getBoundingClientRect().top:-1} }); a.sort((u,v)=>v.y-u.y); return a.length?a[0].id:null },sec);
  // the clock by the core, a day at a time, until the settlers of pid are down (windows that would stop the desk are shut)
  const land=(pg,pid)=>pg.evaluate(pid=>{ const E=LN.earth; let prev={parts:E.parts,fuel:E.fuel}, day=null;
    for(let i=0;i<400&&!LN.colonies[pid];i++){ prev={parts:E.parts,fuel:E.fuel}; tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    const ev=LN.log.filter(e=>e.code==='colony_founded'&&e.d.p===pid).pop(); LNdraw();
    return {down:!!LN.colonies[pid],dParts:E.parts-prev.parts,dFuel:E.fuel-prev.fuel,gift:ev?ev.d.gift||null:undefined,cgift:LN.colonies[pid]?LN.colonies[pid].gift||null:undefined} },pid);

  // ---------- A. no helper: ring I — the numbers before the landing, the landing by the real clock, the card after ----------
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start('en',11); await U.pause();
  const k=await p.evaluate(()=>({share:K.GIFT_SHARE,rings:K.GIFT_FUEL_RINGS,c1:surveyCost(1),c2:surveyCost(2),c3:surveyCost(3)}));
  ok('the rule is in K: share 0.8, fuel from the first 2 rings', k.share===0.8&&k.rings===2, JSON.stringify(k));
  const W=await lowest(p,0), g0=await p.evaluate(w=>giftFor(LN,w),W);
  ok('core, ring I: 48 parts and 249 fuel — 80% of what charting ring II costs', !!g0&&g0.parts===48&&g0.fuel===249&&g0.parts===Math.round(0.8*k.c1.parts)&&g0.fuel===Math.round(0.8*k.c1.fuel), JSON.stringify(g0));
  ok('nothing by a world that is not chosen: no chips on the chart', (await seen(p)).nchips===0);
  // v5.34: hover — the gift is in the tip by the world, not on the chart
  const pt0=await U.point(W); if(pt0){ await p.mouse.move(pt0.x,pt0.y); await p.waitForTimeout(250) }
  const tipH=await p.evaluate(()=>{ const t=document.getElementById('tip'); return {on:t.className==='on', tg:[...t.querySelectorAll('.tg')].map(e=>e.textContent.replace(/\s+/g,' ').trim())} });
  ok('hover (v5.34): the tip by a free world carries its gift — the parts and the fuel', tipH.on&&tipH.tg.length===2&&/48/.test(tipH.tg[0])&&/249/.test(tipH.tg[1]), JSON.stringify(tipH));
  ok('the world opens by the mouse', await U.openWorld(W));
  let s=await seen(p);
  ok('window of a free world: FOUND HERE with the sign, the name and the number', /^found here$/i.test(s.sec||'')&&!s.got&&s.rows.length===2&&/^parts:PARTS \+48$/i.test(s.rows[0])&&/^fuel:FUEL \+249$/i.test(s.rows[1]), JSON.stringify(s.rows));
  ok('the signs are the ones of the top strip', s.sameSign===true);
  ok('v5.34: with the window open no chips on the chart — the gift stays in the window', s.nchips===0&&!(await p.evaluate(()=>!!document.getElementById('gchips'))), JSON.stringify({n:s.nchips}));
  ok('the gift block (#gift) is inside the window', await p.evaluate(()=>{ const g=document.getElementById('gift'), w=document.querySelector('#ovl .win'); return !!g&&!!w&&w.contains(g) }));
  await shot(p,'A1-free-world');
  await U.tap('#ovl .qb'); const hs=await p.evaluate(()=>[...document.querySelectorAll('#hsheet li')].map(e=>e.innerText.replace(/\s+/g,' ').trim()));
  ok('help of the window names it: «Found here — …»', hs.length===5&&/^\+ ?Found here — Earth gets it when settlers land.$/i.test(hs[4]), hs[4]);
  await shot(p,'A2-help'); await U.tap('#ovl .qb');
  const e0=await p.evaluate(()=>({parts:LN.earth.parts,fuel:LN.earth.fuel,log:LN.log.length}));
  await U.tap('#ovl [data-act="send"]');
  ok('settlers sent by the button', await p.evaluate(w=>!!enRoute(LN,w),W));
  s=await seen(p);
  ok('on the way: the window still says what waits there, no chips on the chart', s.rows.length===2&&/\+48$/.test(s.rows[0])&&/\+249$/.test(s.rows[1])&&s.nchips===0, JSON.stringify(s.rows)+' chips '+s.nchips);
  await shot(p,'A3-on-the-way');
  await p.keyboard.press('Escape');
  ok('window shut: no chips left on the chart', (await seen(p)).nchips===0);
  // the real clock at 4×, then 1× for the last years: a sample a day — the stores, the flying chips, the click of the counters
  await U.speed(4);
  for(let i=0;i<600;i++){ const t=await p.evaluate(w=>{ const sh=enRoute(LN,w); return sh?sh.t:0 },W); if(t<=3) break; await U.clear(); await p.waitForTimeout(40) }
  await U.speed(1);
  const smp=[]; let fly=[], tick={}, halted=false, flyShot=false;
  for(let i=0;i<500;i++){ const q=await p.evaluate(w=>({day:LN.day,parts:LN.earth.parts,fuel:LN.earth.fuel,down:!!LN.colonies[w],halted:LNI.halted(),big:LNI.big(),
      fly:[...document.querySelectorAll('#gfly .gch')].map(e=>{ const r=e.getBoundingClientRect(); return {g:e.dataset.g,t:e.innerText.trim(),x:r.left,y:r.top} }),
      tk:[...document.querySelectorAll('#res .rc.tk')].map(e=>e.dataset.r)}),W);
    if(!smp.length||smp[smp.length-1].day!==q.day) smp.push(q);
    if(q.fly.length){ fly.push(q.fly); if(!flyShot&&fly.length>8){ flyShot=true; await shot(p,'A4-flying') } }
    q.tk.forEach(r=>{ if(!tick[r]){ tick[r]=1 } }); if(q.halted||q.big) halted=true;
    if(q.down&&!q.fly.length&&fly.length&&tick.parts&&tick.fuel) break; await p.waitForTimeout(30) }
  await shot(p,'A5-landed');
  const li=smp.findIndex(q=>q.down), L=smp[li], P1=smp[li-1], P2=smp[li-2];
  ok('the landing was caught day by day', li>=2&&L.day===P1.day+1&&P1.day===P2.day+1, JSON.stringify(smp.slice(Math.max(0,li-2),li+1).map(q=>[q.day,q.parts,Math.round(q.fuel*10)/10])));
  ok('Earth got exactly the parts shown: +48 on the day of the landing', !!L&&L.parts-P1.parts===48&&P1.parts===e0.parts, L&&[e0.parts,P1.parts,L.parts].join(' → '));
  const jump=L?(L.fuel-P1.fuel)-(P1.fuel-P2.fuel):NaN;
  ok('Earth got exactly the fuel shown: +249 over an ordinary day', Math.abs(jump-249)<1.5, 'jump '+(Math.round(jump*100)/100));
  const ev=await p.evaluate(w=>{ const e=LN.log.filter(e=>e.code==='colony_founded'&&e.d.p===w).pop(); return {gift:e&&e.d.gift,c:LN.colonies[w].gift,settled:LN.settled[w]!==undefined} },W);
  ok('log of the run and the colony remember the gift', !!ev.gift&&ev.gift.parts===48&&ev.gift.fuel===249&&!!ev.c&&ev.c.parts===48&&ev.c.fuel===249&&ev.settled, JSON.stringify(ev));
  const f0=fly[0]||[], f1=fly[fly.length-1]||[], pa=f0.find(c=>c.g==='parts'), pb=fly.map(f=>f.find(c=>c.g==='parts')).filter(Boolean).pop();
  ok('at the landing the chips «+48» and «+249» leave the world for the top strip', fly.length>3&&fly.some(f=>f.some(c=>c.g==='parts'&&c.t==='+48'))&&fly.some(f=>f.some(c=>c.g==='fuel'&&c.t==='+249'))&&!!pa&&!!pb&&pb.y<pa.y-200&&pb.y<110, JSON.stringify({n:fly.length,from:pa,to:pb,last:f1.length}));
  ok('the counters of the strip click: parts and fuel', !!tick.parts&&!!tick.fuel, JSON.stringify(tick));
  ok('nothing stopped the game and nothing asked for a press', !halted&&await p.evaluate(()=>!LNU.paused&&!LNI.big()&&!document.querySelector('#gfly .gch')));
  await U.pause(); await U.clear();
  ok('the settled world opens by the mouse', await U.openWorld(W));
  s=await seen(p);
  // v5.28 (Никита 14.11: «награду уже после открытия показывать не надо»; «меню мира надо разделить пополам… про линию влезет»)
  ok('card of the settled world: no FOUND HERE, no chips — the colony still remembers the gift', s.sec===null&&s.rows.length===0&&s.nchips===0&&await p.evaluate(w=>!!LN.colonies[w].gift&&LN.colonies[w].gift.parts===48,W), JSON.stringify(s.rows)+' chips '+s.nchips);
  const hv=await p.evaluate(()=>{ const R=e=>{ const r=e.getBoundingClientRect(); return {x:r.left,r:r.right,y:r.top,b:r.bottom} }; const c=[...document.querySelectorAll('#ovl .wsplit>.wcol')], wb=document.querySelector('#ovl .wbody');
    const In=(q,k)=>{ const e=document.querySelector(q); return !!e&&c[k].contains(e)&&e.getBoundingClientRect().height>0 };
    return {n:c.length,a:c[0]&&R(c[0]),b:c[1]&&R(c[1]),scroll:c.map(e=>e.scrollHeight-e.clientHeight),body:wb.scrollHeight-wb.clientHeight,world:In('#rw-carries',0),line:In('#addblk',1),order:In('#ordblk',1),btn:(()=>{ const e=document.querySelector('#ordblk .oc .b'); if(!e) return null; const r=e.getBoundingClientRect(), w=document.querySelector('#ovl .win').getBoundingClientRect(); return r.bottom<=w.bottom&&r.height>0 })()} });
  ok('card of the settled world stands in two halves: the world on the left, its line and the yards on the right', hv.n===2&&hv.a.r<=hv.b.x+1&&Math.abs(hv.a.y-hv.b.y)<2&&hv.world&&hv.line&&hv.order, JSON.stringify(hv));
  ok('nothing to scroll down for: both halves and the window show all they hold, the BUILD button is in sight', hv.scroll.every(v=>v<=1)&&hv.body<=1&&hv.btn===true, JSON.stringify({scroll:hv.scroll,body:hv.body,btn:hv.btn}));
  await shot(p,'A6-settled-card'); await p.keyboard.press('Escape');

  // ---------- B. the same world a second time: nothing ----------
  // the fixture: the colony is lifted off (as an evacuation of a live seam leaves it) — the world is free again, G.settled remembers it
  await p.evaluate(w=>{ delete LN.colonies[w]; LN.ships.forEach(s=>{ if(s.from===w||s.to===w){ s.from=null; s.to=null } }); LN.earth.people=Math.max(LN.earth.people,300); LN.earth.fuel=Math.max(LN.earth.fuel,300);
    LN.ships.forEach(s=>{ if(s.mode==='transit'){ s.mode='idle'; s.at='earth'; s.dir=null; s.job=null; s.t=0 } }); LNdraw() },W);
  ok('core: a world settled before gives nothing', await p.evaluate(w=>giftFor(LN,w)===null&&LN.settled[w]!==undefined&&!LN.colonies[w],W));
  ok('the world, free again, opens by the mouse', await U.openWorld(W));
  s=await seen(p);
  ok('second time: no FOUND HERE in the window, no chips on the chart', s.sec===null&&s.rows.length===0&&s.nchips===0&&await p.isVisible('#ovl [data-act="send"]'), JSON.stringify(s.rows)+' chips '+s.nchips);
  await shot(p,'B1-second-time');
  await U.tap('#ovl [data-act="send"]'); await p.keyboard.press('Escape');
  let r=await land(p,W);
  ok('second landing: Earth gets nothing — no parts, no jump of fuel, no gift in the log', r.down&&r.dParts===0&&Math.abs(r.dFuel)<20&&r.gift===null&&r.cgift===null, JSON.stringify(r));
  await p.waitForTimeout(400);
  ok('second landing: nothing flies', await p.evaluate(()=>!document.querySelector('#gfly .gch')));

  // ---------- C. ring III: parts only ----------
  await p.evaluate(()=>{ while(SECTORS.length<3) openSector(LN); LN.driveLvl=2; LN.gen=2; ensureGen(2);
    const E=LN.earth; E.metal=1e5; E.parts=1e4; E.fuel=5000; E.food=1e5; E.people=Math.max(E.people,800); LN.safe=true;
    buildShip(LN,HULLS.findIndex(h=>h.gen===2&&h.key==='courier')); const sh=LN.ships[LN.ships.length-1]; sh.mode='idle'; sh.at='earth'; sh.t=0; LNdraw() });
  await U.clear(); await p.evaluate(()=>LNdraw());
  const W3=await lowest(p,2), g3=await p.evaluate(w=>giftFor(LN,w),W3), g2=await p.evaluate(()=>{ const q=PLANETS.find(q=>q.sec===1&&!LN.colonies[q.id]&&LN.settled[q.id]===undefined&&!(giftFor(LN,q.id)||{}).dock); return q?giftFor(LN,q.id):null });
  ok('core, ring II: 72 parts and 368 fuel', !!g2&&g2.parts===72&&g2.fuel===368, JSON.stringify(g2));
  ok('core, ring III: 108 parts and no fuel', !!g3&&g3.parts===108&&g3.fuel===undefined&&g3.parts===Math.round(0.8*k.c3.parts), JSON.stringify(g3));
  ok('a world of ring III opens by the mouse', !!W3&&await U.openWorld(W3), W3);
  s=await seen(p);
  ok('ring III, window: parts +108 alone, no fuel, no chips on the chart', s.rows.length===1&&/^parts:PARTS \+108$/i.test(s.rows[0])&&s.nchips===0, JSON.stringify(s.rows)+' chips '+s.nchips);
  await shot(p,'C1-ring3');
  await U.tap('#ovl [data-act="send"]');
  ok('settlers sent to ring III', await p.evaluate(w=>!!enRoute(LN,w),W3)); await p.keyboard.press('Escape');
  r=await land(p,W3);
  ok('ring III landing: +108 parts, no fuel given', r.down&&r.dParts===108&&Math.abs(r.dFuel)<20&&!!r.gift&&r.gift.parts===108&&r.gift.fuel===undefined, JSON.stringify(r));
  ok('no page errors (no helper)', p.errs.length===0, p.errs.join(' | '));

  // ---------- D. with the helper: parts are not met yet — the first world gives fuel alone, and opens nothing ----------
  const q=await UI.newPage(b,{vp:{width:1440,height:900}}); const Q=UI.ui(q);
  await Q.start(null,undefined,{tut:true}); await Q.menuNew('en');
  const tst=()=>q.evaluate(()=>LNI.tut());
  for(let i=0;i<40&&(await tst()).msg!=='m1';i++){ if(await q.isVisible('#helper [data-act="tutok"]')) await Q.tap('#helper [data-act="tutok"]'); else if(await q.isVisible('#voice')) await Q.tap('#voice'); else await q.waitForTimeout(150) }
  const farm=await q.evaluate(()=>LNU.tut.farm);
  await Q.tap('#map .wd[data-p="'+farm+'"] circle[fill="transparent"]');
  for(let i=0;i<20&&(await tst()).msg!=='m2';i++) await q.waitForTimeout(100);
  s=await seen(q);
  const stripD=await q.evaluate(()=>({parts:!!document.querySelector('#res .rc[data-r="parts"]'),fuel:!!document.querySelector('#res .rc[data-r="fuel"]'),open:isOpen(LN,'parts')}));
  ok('helper, first world: parts are not in the strip yet — FOUND HERE names fuel alone', (await tst()).msg==='m2'&&!stripD.parts&&stripD.fuel&&!stripD.open&&s.rows.length===1&&/^fuel:FUEL \+249$/i.test(s.rows[0])&&s.nchips===0, JSON.stringify({strip:stripD,rows:s.rows,chips:s.nchips}));
  await shot(q,'D1-helper-first-world');
  const hb=await q.evaluate(()=>{ const R=e=>{ const r=e.getBoundingClientRect(); return {y:r.top,b:r.bottom} }; const a=document.querySelector('#ovl [data-act="send"]'), t=document.getElementById('tutRing'); return {send:R(a),ring:t?R(t):null} });
  ok('the helper still points at SEND SETTLERS under the new section', !!hb.ring&&hb.ring.y<=hb.send.y+2&&hb.ring.b>=hb.send.b-2, JSON.stringify(hb));
  await Q.tap('#ovl [data-act="send"]');
  r=await land(q,farm);
  ok('helper, landing: fuel +249, no parts — and parts stay closed', r.down&&r.dParts===0&&!!r.gift&&r.gift.fuel===249&&r.gift.parts===undefined&&Math.abs(r.dFuel-249)<20&&await q.evaluate(()=>LN.earth.parts===0&&!isOpen(LN,'parts')), JSON.stringify(r));
  ok('no page errors (helper)', q.errs.length===0, q.errs.join(' | '));

  // ---------- E. 390 px: the card and the chips are on the screen, nothing sticks out ----------
  const m=await UI.newPage(b,{vp:{width:390,height:844}}); const M=UI.ui(m);
  await M.start('en',11); await M.pause();
  const Wm=await lowest(m,0);
  ok('390 px: the world opens by the mouse', await M.openWorld(Wm));
  s=await seen(m);
  const fit=await m.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
  const inScr=bx=>!!bx&&bx.x>=0&&bx.r<=390&&bx.y>=0&&bx.b<=844;
  const gm=await m.evaluate(()=>{ const r=document.getElementById('gift').getBoundingClientRect(), sd=document.querySelector('#ovl [data-act="send"]').getBoundingClientRect(); return {x:r.left,y:r.top,r:r.right,b:r.bottom,send:{x:sd.left,y:sd.top,r:sd.right,b:sd.bottom}} });
  ok('390 px: FOUND HERE and its button are inside the screen, the window too', s.rows.length===2&&inScr(gm)&&inScr(gm.send)&&inScr(s.win), JSON.stringify({gift:gm,win:s.win}));
  ok('390 px: the page does not scroll sideways or down', fit.sw<=fit.iw&&fit.sh<=fit.ih, JSON.stringify(fit));
  await shot(m,'E1-phone-free-world');
  await M.tap('#ovl [data-act="send"]'); await m.keyboard.press('Escape');
  await m.evaluate(w=>{ const sh=enRoute(LN,w); while(sh&&sh.t>2){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },Wm);
  await M.speed(1); let mfly=null;
  for(let i=0;i<300;i++){ const f=await m.evaluate(()=>[...document.querySelectorAll('#gfly .gch')].map(e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,r:r.right,b:r.bottom} })); if(f.length){ mfly=mfly||f; if(i%4===0) await shot(m,'E2-phone-flying') } else if(mfly) break; await m.waitForTimeout(30) }
  await M.pause();
  ok('390 px: the chips fly inside the screen', !!mfly&&mfly.every(inScr), JSON.stringify(mfly));
  await M.clear(); await M.openWorld(Wm); await shot(m,'E3-phone-settled');
  ok('no page errors (390 px)', m.errs.length===0, m.errs.join(' | '));
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
