// pw70 — v5.35 (остаток фидбека Никиты по партии v5.29, 16.11; «Да» на объём):
//  1  хаб на выработанном мире задним числом (п. 21: «мир уже все, но на него можно кликнуть и заселить хабом так сказать»):
//     могильный × на карте нажимается мышью, окно мира предлагает «Found a hub here» с ценой (поселенцы, топливо, хаб);
//     приказ платит цену хаба сразу и считает хаб в лимите; на посадке мир — хаб на мёртвой жиле, × нет;
//     судно, не севшее (неудачная посадка), возвращает цену хаба;
//  2  редкие материальные награды (п. 17: «Нужно что-то материальное, а не ресурсы»): выжившие (люди на Землю) и ядро двигателя
//     (работа в программу; без программы — в запас, берётся при запуске); знак на карте, строка в окне, в подсказке; 1440×900 и 390×844.
// Клики — мышью по видимым кнопкам; состояние готовится через ядро и GOD. Снимки: PW70_SHOTS=<папка>. Сборка: PW70_FILE.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW70_SHOTS||null, FILE=process.env.PW70_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n,sel)=>{ if(!SHOTS) return; const f=path.join(SHOTS,n+'.png'); const e=sel&&await pg.$(sel); if(e&&await e.isVisible()) await e.screenshot({path:f}); else await pg.screenshot({path:f}) };
  // a settled mine of ring 1, worked out and lifted: a grave marker (as the core leaves it after an evacuation)
  const ghost=p=>p.evaluate(()=>{ LN.safe=true; const w=PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0]; LNU.win=w.id; GOD.settle(); LNU.win=null;
    for(let i=0;i<300&&!LN.colonies[w.id];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    delete LN.colonies[w.id]; LN.reserves[w.id]=0; LN.ghost[w.id]=LN.day; LN.driveLvl=1; LN.gen=1; ensureGen(1); GOD.maxAll(); LN.sig={hub:1,ark:1,drive:1}; LNU.notes=[]; LNdraw(); return w.id });

  // ---------- 1. a hub on a worked-out world ----------
  { const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
    await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
    const w=await ghost(p); await p.waitForTimeout(300); await p.evaluate(()=>LNdraw());
    const opened=await U.openWorld(w); await p.waitForTimeout(300);
    const w1=await p.evaluate(()=>{ const e=document.querySelector('#ovl .win'); const bt=e&&e.querySelector('[data-act="hubfound"]'); return {txt:e?e.textContent:'', bt:!!bt, dis:bt&&bt.getAttribute('aria-disabled')==='true', why:bt&&bt.dataset.why} });
    await shot(p,'h1-ghost-window','#ovl .win');
    ok('1: the grave marker on the chart takes a press of the mouse and opens the world\'s window', opened, w);
    ok('1: a worked-out world offers «Found a hub here» with its price, live', w1.bt&&!w1.dis&&/found a hub here/i.test(w1.txt), JSON.stringify(w1).slice(0,240));
    const before=await p.evaluate(()=>({m:LN.earth.metal,k:LN.earth.parts,n:hubCount(LN),cost:hubCost(LN)}));
    await U.tap('#ovl [data-act="hubfound"]'); await p.waitForTimeout(300);
    const after=await p.evaluate(w=>({m:LN.earth.metal,k:LN.earth.parts,n:hubCount(LN),go:LN.ships.some(s=>s.job==='colonize'&&s.dest===w&&!!s.hubFound)}),w);
    ok('1: the order pays the hub at once and the hub counts in the cap while the settlers fly', after.go&&before.m-after.m===before.cost.metal&&before.k-after.k===before.cost.parts&&after.n===before.n+1, JSON.stringify({before,after}));
    const land=await p.evaluate(w=>{ for(let i=0;i<400&&!LN.colonies[w];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw(); const c=LN.colonies[w];
      return {col:!!c, hub:!!(c&&c.hub), ghost:!!(LN.ghost&&LN.ghost[w]), seam:LN.reserves[w], st:c?null:'none'} },w);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); await U.openWorld(w); await p.waitForTimeout(300); await shot(p,'h2-hub-landed','#ovl .win');
    ok('1: on the landing the world is a hub on a dead seam, its grave marker gone', land.col&&land.hub&&!land.ghost&&land.seam<=0, JSON.stringify(land));
    // a landing that fails gives the hub's price back
    const fail=await p.evaluate(()=>{ const w2=PLANETS.filter(q=>q.sec===0&&q.kind==='farm'&&!LN.colonies[q.id]).sort((a,b)=>a.dist-b.dist)[0]; LN.ghost[w2.id]=LN.day; LN.reserves[w2.id]=0; LN.driveLvl=2; LN.gen=2; ensureGen(2); GOD.maxAll();   // room for a second hub
      const i=HULLS.map((h,j)=>j).filter(j=>HULLS[j].key==='courier'&&HULLS[j].gen===(LN.gen||0))[0]; const s=GOD.hull(i); const m0=LN.earth.metal, k0=LN.earth.parts;
      const r=hubFound(LN,s.id,w2.id); const m1=LN.earth.metal; LN.safe=false; planet(w2.id).haz=9;   // the landing fails for sure
      for(let t=0;t<400&&s.mode!=='dead'&&s.job==='colonize';t++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
      LN.safe=true; return {r, paid:m0-m1, back:LN.earth.metal-m1, dead:s.mode==='dead', hf:s.hubFound} });
    ok('1: a landing that fails gives the hub\'s price back (nothing was built)', fail.r==='ok'&&fail.paid>0&&fail.dead&&fail.back>=fail.paid-1&&!fail.hf, JSON.stringify(fail));
    ok('1: no page errors', !p.errs.length, p.errs.join(' | '));
    await p.close() }

  // ---------- 2. the rare finds ----------
  for(const [tag,vp] of [['',{width:1440,height:900}],['-390',{width:390,height:844}]]){
    const p=await UI.newPage(b,{vp,file:FILE}); const U=UI.ui(p);
    await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
    // on a fresh run put survivors on one free world of ring 1 and an engine core on another (the seed decides it in play)
    const ws=await p.evaluate(()=>{ LN.safe=true; const dk=dockWorld(LN,0), fr=PLANETS.filter(q=>q.sec===0&&q.id!==dk&&q.kind!=='works').sort((a,b)=>a.dist-b.dist);
      LN.rares=LN.rares||{}; LN.rares[0]={p:fr[0].id,k:'folk'}; LN.sig={hub:1,ark:1,drive:1}; LNU.notes=[]; LNdraw();
      return {folk:fr[0].id, g:giftFor(LN,fr[0].id)} });
    await p.waitForTimeout(300); await p.evaluate(()=>LNdraw());
    const sign=await p.evaluate(id=>{ const g=document.querySelector('#map .wd[data-p="'+id+'"] .rsign'); return g?g.getAttribute('data-rare'):null },ws.folk);
    await shot(p,'r1-chart-folk'+tag);
    ok('2'+tag+': survivors on a world — the yellow sign by it on the chart, their own (data-rare=folk)', sign==='folk'&&!!ws.g&&ws.g.folk>0, JSON.stringify({sign,g:ws.g}));
    if(!tag){ const pt=await U.point(ws.folk); if(pt){ await p.mouse.move(pt.x,pt.y); await p.waitForTimeout(250) }
      const tip=await p.evaluate(()=>{ const t=document.getElementById('tip'); return {on:t.className==='on', txt:t.textContent} });
      ok('2: the tip by the world says how many people wait there', tip.on&&tip.txt.indexOf('+'+ws.g.folk)>=0, JSON.stringify(tip)) }
    await U.openWorld(ws.folk); await p.waitForTimeout(300);
    const row=await p.evaluate(()=>{ const r=document.querySelector('#ovl #gift [data-g="folk"]'); const w=document.querySelector('#ovl .win'), bx=w&&w.getBoundingClientRect(); return {txt:r?r.textContent:'', inScr:!!bx&&bx.right<=innerWidth+1&&bx.left>=-1} });
    await shot(p,'r2-window-folk'+tag,'#ovl .win');
    ok('2'+tag+': FOUND HERE names the survivors first, with their number; the window is inside the screen', /survivors/i.test(row.txt)&&row.txt.indexOf(String(ws.g.folk))>=0&&row.inScr, JSON.stringify(row));
    if(!tag){
      const e0=await p.evaluate(()=>LN.earth.people);
      await U.tap('#ovl [data-act="send"]'); await p.waitForTimeout(200);
      const landed=await p.evaluate(id=>{ const e1=LN.earth.people; for(let i=0;i<400&&!LN.colonies[id];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
        const l=LN.log.slice(-40).filter(e=>e.code==='rare_folk'&&e.d.p===id)[0]; return {e1, l:l&&l.d, col:!!LN.colonies[id]} },ws.folk);
      ok('2: the landing brings the survivors to Earth — the log names them, Earth\'s people grow by that number', landed.col&&!!landed.l&&landed.l.k===ws.g.folk, JSON.stringify(landed));
      // the engine core: no programme running — kept, and taken at its start
      const core=await p.evaluate(()=>{ const fr=PLANETS.filter(q=>q.sec===0&&!LN.colonies[q.id]&&q.id!==dockWorld(LN,0)&&q.kind!=='works').sort((a,b)=>a.dist-b.dist)[0];
        LN.rares[0]={p:fr.id,k:'core'}; const g=giftFor(LN,fr.id); const i=HULLS.map((h,j)=>j).filter(j=>HULLS[j].key==='courier'&&HULLS[j].gen===(LN.gen||0))[0]; const s=GOD.hull(i);
        GOD.maxAll(); colonize(LN,s.id,fr.id); for(let t=0;t<400&&!LN.colonies[fr.id];t++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
        const bank=LN.driveBank||0; return {g, bank, drive:LN.drive} });
      ok('2: an engine core with no programme running is kept for it (driveBank)', !!core.g&&core.g.core>0&&core.bank===core.g.core&&!core.drive, JSON.stringify(core));
      ok('2: no page errors', !p.errs.length, p.errs.join(' | ')) }
    await p.close() }

  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
