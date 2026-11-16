// pw69 — v5.34 (остаток фидбека Никиты по партии v5.29, 16.11; второе «да» на объём):
//  1  следующее кольцо на карте с кнопкой SURVEY на нём (п. 5: «Хочу чтобы просто кольцо следующее было на карте, но на нём весела
//     кнопка разведать») — 1440×900 и 390×844: кнопка в рамке карты, с именем кольца, ценой и причиной отказа; разведка мышью
//     с карты открывает кольцо, и кнопка переезжает на следующее;
//  2  сигналы «хватает на важное» (п. 11): разовое окно на хаб, кольцо ковчега, поколение; метки вкладок «Миры» и «Ковчег»;
//  3  очередь эвакуации (п. 9): «Evacuate» ставит мир в очередь, курьер вылетает сам, когда мир пуст; нет курьера — ждёт;
//     отмена; при подъёме мира возвращается половина установленного пакета;
//  4  перила двигателя (п. 12): уровень впереди карты — предупреждение во вкладке «Техника», кнопка не заперта;
//  5  награда неоткрытого мира (п. 8): при наведении — в подсказке у мира; в открытом окне — только в окне (фишек под именем нет).
// Клики — мышью по видимым кнопкам; состояние готовится через ядро и GOD. Снимки: PW69_SHOTS=<папка>. Сборка: PW69_FILE.
// PW69_BEFORE=1 — тот же путь по старой сборке только ради снимков «до»: итог не судит.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW69_SHOTS||null, BEFORE=!!process.env.PW69_BEFORE, FILE=process.env.PW69_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>{ if(!BEFORE) out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):'')) };
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n,sel)=>{ if(!SHOTS) return; const f=path.join(SHOTS,n+'.png'); const e=sel&&await pg.$(sel); if(e&&await e.isVisible()) await e.screenshot({path:f}); else await pg.screenshot({path:f}) };
  const waitFor=async(p,fn,ms=6000)=>{ for(let t=0;t<ms;t+=100){ if(await fn()) return true; await p.waitForTimeout(100) } return !!(await fn()) };
  const ringBox=p=>p.evaluate(()=>{ const e=document.getElementById('ringbtn'); if(!e||e.hidden) return null; const r=e.getBoundingClientRect(), m=document.getElementById('mapbox').getBoundingClientRect(), bt=e.querySelector('.b');
    return {txt:e.textContent, inMap:r.left>=m.left-1&&r.right<=m.right+1&&r.top>=m.top-1&&r.bottom<=m.bottom+1, dis:bt&&bt.getAttribute('aria-disabled')==='true', why:bt&&bt.dataset.why, go:bt&&bt.classList.contains('go'),
      next:secName(SECTORS.length), n:SECTORS.length, w:Math.round(r.width) } });

  // ---------- 1. the next ring on the chart ----------
  for(const [tag,vp] of [['',{width:1440,height:900}],['-390',{width:390,height:844}]]){
    const p=await UI.newPage(b,{vp,file:FILE}); const U=UI.ui(p);
    await U.start('en',11); await U.pause(); await p.waitForTimeout(400); await p.evaluate(()=>LNdraw());
    const r1=await ringBox(p); await shot(p,'r1-ring-locked'+tag);
    if(BEFORE){ await p.close(); continue }
    ok('1'+tag+': a new game shows the next ring\'s order on the chart, inside its box, with the ring\'s name', !!r1&&r1.inMap&&r1.txt.indexOf(r1.next)>=0, JSON.stringify(r1));
    ok('1'+tag+': too few worlds — the button is refused, and says why («settle N more»)', !!r1&&r1.dis&&/settle \d+ more/i.test(r1.txt)&&r1.why==='needsettled', r1&&r1.txt);
    await U.tap('#ringbtn .b'); const t1=await p.evaluate(()=>[...document.querySelectorAll('#toasts .toast,#toast *')].map(e=>e.textContent).join(' | '));
    ok('1'+tag+': a press on the refused button tells the reason', /settled|worlds/i.test(t1), t1);
    await p.evaluate(()=>{ K.SURVEY_REACH=0; GOD.maxAll(); LNU.notes=[]; LNdraw() }); await p.waitForTimeout(300); await p.evaluate(()=>LNdraw());
    const r2=await ringBox(p); await shot(p,'r2-ring-open'+tag);
    ok('1'+tag+': when the ring can be charted the button is live and lit, with its price', !!r2&&!r2.dis&&r2.go&&/survey/i.test(r2.txt), JSON.stringify(r2));
    await U.tap('#ringbtn .b'); await p.waitForTimeout(300); await U.clear(); await p.evaluate(()=>LNdraw()); await p.waitForTimeout(200); await p.evaluate(()=>LNdraw());
    const r3=await ringBox(p); await shot(p,'r3-ring-next'+tag);
    ok('1'+tag+': the press with the mouse charts the ring (rings '+(r2&&r2.n)+' → '+(r3&&r3.n)+') and the button moves to the next one', !!r2&&!!r3&&r3.n===r2.n+1&&r3.txt.indexOf(r3.next)>=0&&r3.inMap, JSON.stringify(r3));
    ok('1'+tag+': no page errors', !p.errs.length, p.errs.join(' | '));
    await p.close() }

  // ---------- 2. signals: enough for a hub, an ark ring, a generation ----------
  if(!BEFORE){
    const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
    await U.start('en',22); await U.pause(); await p.waitForTimeout(300);
    await p.evaluate(()=>{ LN.safe=true; const w=PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0]; LNU.win=w.id; GOD.settle(); LNU.win=null;
      for(let i=0;i<300&&!LN.colonies[w.id];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
      LN.driveLvl=1; LN.gen=1; ensureGen(1); LNU.notes=[]; LNdraw() });   // hubs allowed = the generation (HUB_BASE 0): one from Generation II
    const noHub=await p.evaluate(()=>!(LN.sig&&LN.sig.hub)&&!(LNU.notes||[]).length);
    await p.evaluate(()=>{ GOD.maxAll(); LNdraw() });
    const got=await waitFor(p,()=>p.evaluate(()=>LNI.big()==='note'));
    const n1=await p.evaluate(()=>{ const e=document.querySelector('.nwin'); return e?e.textContent:'' }); await shot(p,'s1-note-hub');
    ok('2: no note while Earth cannot pay; with the metal and the parts a note says a hub is within reach, once', noHub&&got&&/HUB IS WITHIN REACH/.test(n1), n1);
    await U.tap('[data-act="notego"]'); await p.waitForTimeout(300);
    const wt=await p.evaluate(()=>LNU.tab||LNU.win);
    ok('2: its button opens the Worlds tab', wt==='worlds', wt);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); await U.clear(); await p.evaluate(()=>{ LNU.tab=null; LNU.win=null; LNdraw() }); await p.waitForTimeout(200);
    const fl=await p.evaluate(()=>{ const e=document.querySelector('#tabs [data-v="worlds"] .flag'); return e?e.textContent:'' }); await shot(p,'s2-flag-hub','#tabs');
    ok('2: after the note the Worlds tab carries the flag while it lasts', /hub can be built/i.test(fl), fl);
    const again=await p.evaluate(()=>{ LNU.notes=[]; LNdraw(); LNdraw(); return (LNU.notes||[]).filter(n=>/HUB/.test(n.title)).length });
    ok('2: the hub note is not said twice', again===0, again);
    await p.evaluate(()=>{ ['metal','food','parts'].forEach(k=>{ LN.earth[k]=0 }); GOD.night(); LN.nightSeen=true; LNU.notes=[]; LNdraw() });   // Earth cannot pay yet: the note comes with the stores
    await waitFor(p,()=>p.evaluate(()=>LNI.big()==='note'||LNI.big()==='night')); await U.clear();
    await p.evaluate(()=>{ GOD.maxAll(); LNdraw() });
    const got2=await waitFor(p,()=>p.evaluate(()=>(LNU.notes||[]).some(n=>/ARK RING/.test(n.title))||/ARK RING/.test((document.querySelector('.nwin')||{}).textContent||'')));
    await shot(p,'s3-note-ark'); await U.clear(); await p.evaluate(()=>LNdraw()); await p.waitForTimeout(200);
    const fa=await p.evaluate(()=>{ const e=document.querySelector('#tabs [data-v="ark"] .flag'); return e?e.textContent:'' });
    ok('2: with the Night dated and Earth able to pay — a note for the ark ring, and the Ark tab\'s flag', got2&&/ark ring I can be paid/i.test(fa), fa);
    ok('2: no page errors', !p.errs.length, p.errs.join(' | '));
    await p.close() }

  // ---------- 3. the evacuation queue ----------
  { const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
    await U.start('en',33); await U.pause(); await p.waitForTimeout(300);
    const w=await p.evaluate(()=>{ LN.safe=true; const w=PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0]; LNU.win=w.id; GOD.settle(); LNU.win=null;
      for(let i=0;i<300&&!LN.colonies[w.id];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
      const c=LN.colonies[w.id]; c.tier=1; LN.reserves[w.id]=40; c.store.metal=600; GOD.maxAll(); LN.sig={hub:1,ark:1,drive:1};
      LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&HULLS[s.hull].key==='courier').forEach(s=>{ s.mode='dead' });   // no courier free: the queue has to wait
      LNU.notes=[]; LNdraw(); return w.id });
    await U.openWorld(w); await p.waitForTimeout(300);
    const e0=await p.evaluate(()=>({q:!!document.querySelector('#ovl [data-act="evacq"]'),now:(document.querySelector('#ovl [data-act="evac"]')||{}).textContent||''}));
    await shot(p,'e1-window-evacuate','#ovl .win');
    if(!BEFORE){
      ok('3: a world that still holds something offers «Evacuate» (the queue) and «Evacuate now»', e0.q&&/evacuate now/i.test(e0.now), JSON.stringify(e0));
      await U.tap('#ovl [data-act="evacq"]'); await p.waitForTimeout(300);
      const e1=await p.evaluate(w=>({q:!!LN.colonies[w].evacQ, txt:(document.querySelector('#ovl .win')||{}).textContent||'', unq:!!document.querySelector('#ovl [data-act="evacunq"]')}),w);
      await shot(p,'e2-window-queued','#ovl .win');
      ok('3: the press puts the world in the queue; the window says so and offers to cancel', e1.q&&/in the queue/i.test(e1.txt)&&e1.unq, e1.txt.slice(0,200));
      await U.tap('#ovl [data-act="evacunq"]'); await p.waitForTimeout(250);
      const e2=await p.evaluate(w=>!LN.colonies[w].evacQ,w);
      ok('3: «Cancel the queue» takes it off', e2);
      await U.tap('#ovl [data-act="evacq"]'); await p.waitForTimeout(250);
      // the seam and the surface run dry; no courier at Earth: it waits
      await p.evaluate(w=>{ LN.reserves[w]=0; LN.colonies[w].store.metal=0; for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LNdraw() },w); await p.waitForTimeout(200);
      const e3=await p.evaluate(w=>({wait:LN.colonies[w]&&LN.colonies[w].evacWait, log:LN.log.slice(-30).some(e=>e.code==='evac_wait'&&e.d.p===w), txt:(document.querySelector('#ovl .win')||{}).textContent||''}),w);
      await shot(p,'e3-window-waiting','#ovl .win');
      ok('3: bare and no courier free — it waits, said once in the log and in the window', !!e3.wait&&e3.log&&/waiting for a free courier/i.test(e3.txt), e3.txt.slice(0,200));
      // a courier comes home: she sails on her own; on the lift half of the package comes back
      const e4=await p.evaluate(w=>{ const i=HULLS.map((h,j)=>j).filter(j=>HULLS[j].key==='courier'&&HULLS[j].gen===(LN.gen||0))[0]; const s=GOD.hull(i);
        const m0=LN.earth.metal, k0=LN.earth.parts; tick(LN); LN.pauseNow=false;
        const go=LN.ships.some(o=>o.id===s.id&&o.job==='evac'&&o.dest===w), auto=LN.log.slice(-20).some(e=>e.code==='evac_auto'&&e.d.p===w);
        for(let i=0;i<400&&LN.colonies[w];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
        const back=LN.log.slice(-60).filter(e=>e.code==='lift_back'&&e.d.p===w)[0];
        return {go, auto, gone:!LN.colonies[w], back:back&&back.d, dm:LN.earth.metal-m0, dk:LN.earth.parts-k0} },w);
      ok('3: a free courier at Earth — she sails on her own the next day (evac_auto)', e4.go&&e4.auto, JSON.stringify(e4));
      ok('3: the world is lifted and half of its package (tier I: 100 metal, 90 parts) comes back — 50 and 45', e4.gone&&!!e4.back&&e4.back.m===50&&e4.back.k===45, JSON.stringify(e4.back));
      ok('3: no page errors', !p.errs.length, p.errs.join(' | ')) }
    await p.close() }

  // ---------- 4. the drive ahead of the chart; 5. the gift on hover ----------
  { const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
    await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
    // 5 first, on the fresh chart: a free world of ring 1 under the mouse
    const fw=await p.evaluate(()=>{ const w=PLANETS.filter(q=>{ const g=q.sec===0&&giftFor(LN,q.id); return g&&['metal','food','fuel','parts'].some(k=>g[k]>0) }).sort((a,b)=>a.dist-b.dist)[0]; return w&&w.id });
    const pt=fw&&await U.point(fw); if(pt){ await p.mouse.move(pt.x,pt.y); await p.waitForTimeout(250) }
    const tip=await p.evaluate(()=>{ const t=document.getElementById('tip'); return {on:t.className==='on', chips:t.querySelectorAll('.tg').length, txt:t.textContent} });
    await shot(p,'g1-hover-tip');
    if(!BEFORE) ok('5: hovering a world not settled yet shows what it gives in the tip by the world', tip.on&&tip.chips>0, JSON.stringify(tip));
    await U.openWorld(fw); await p.waitForTimeout(300);
    const win=await p.evaluate(()=>({chips:!!document.getElementById('gchips'), block:!!document.querySelector('#ovl #gift')}));
    await shot(p,'g2-window-gift');
    if(!BEFORE) ok('5: with its window open the gift is in the window only — no chips under the name on the chart', !win.chips&&win.block, JSON.stringify(win));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.evaluate(()=>{ LN.driveLvl=3; LN.gen=3; ensureGen(3); LNU.notes=[]; LNdraw() });
    await U.tab('tech'); await p.waitForTimeout(300);
    const d=await p.evaluate(()=>{ const s=document.querySelector('.side .tpan:not([hidden])')||document.querySelector('.side'); const a=[...s.querySelectorAll('.alert')].map(e=>e.textContent).join(' | ');
      const bt=s.querySelector('[data-act="drive"]'); return {a, ring:secName(driveAhead(LN)-1), why:bt&&bt.dataset.why||'', core:driveAhead(LN)} });
    await shot(p,'d1-tech-ahead','.side');
    if(!BEFORE){
      ok('4: the next mark ahead of the chart — the Tech tab warns «chart ring N first — nothing new to fly to yet»', /ahead of the chart/i.test(d.a)&&d.a.indexOf(d.ring)>=0, JSON.stringify(d));
      ok('4: a warning only: the drive button is not refused for it', d.why!=='driveAhead', d.why);
      const d2=await p.evaluate(()=>{ LN.driveLvl=1; LN.gen=1; LNdraw(); return driveAhead(LN) });
      ok('4: the marks the packages open with (I, II) are never ahead', d2===0, d2);
      ok('4: no page errors', !p.errs.length, p.errs.join(' | ')) }
    await p.close() }

  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
