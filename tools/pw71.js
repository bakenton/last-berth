// pw71 — v5.37 (п. 13 фидбека Никиты по партии v5.29: «Нужны подзадания… построить столько-то судов такого-то типа. Чтобы на линии ходили
//     только суда такого типа»; приказы смены, выбор из двух, награда — люди или готовое судно: «Хорошо»; объём — «да»):
//  1  окно новой смены несёт два приказа с наградами; «Take» мышью берёт один; второго нет; 1440×900 и 390×844 (окно в экране);
//  2  взятый приказ — строка в карточке цели (что, сколько сделано, сколько лет осталось, награда) и в журнале целей с полосой;
//  3  выполнен — награда на Земле (люди или судно поколения верфи у причала), журнал order_done; не выполнен в срок — order_failed, ничего не отнято.
// Клики — мышью; состояние готовится через ядро и GOD. Снимки: PW71_SHOTS=<папка>. Сборка: PW71_FILE.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW71_SHOTS||null, FILE=process.env.PW71_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n,sel)=>{ if(!SHOTS) return; const f=path.join(SHOTS,n+'.png'); const e=sel&&await pg.$(sel); if(e&&await e.isVisible()) await e.screenshot({path:f}); else await pg.screenshot({path:f}) };
  // two worlds settled, then the clock runs to the next shift; the shift's window stands
  const toShift=p=>p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1};
    PLANETS.filter(q=>q.sec===0&&q.kind!=='works').sort((a,b)=>a.dist-b.dist).slice(0,2).forEach(w=>{ LNU.win=w.id; GOD.settle(); LNU.win=null });
    for(let i=0;i<400&&(LN.stats.founded||0)<2;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    GOD.maxAll(); const d0=LN.day; for(let i=0;i<200&&!LN.shiftOpen;i++){ tick(LN); LN.pauseNow=false } LNU.notes=[]; LNdraw();
    return {open:LN.shiftOpen, offer:(LN.orders&&LN.orders.offer||[]).map(o=>({k:o.k,n:o.n,rw:o.rw})), d:LN.day-d0} });

  for(const [tag,vp] of [['',{width:1440,height:900}],['-390',{width:390,height:844}]]){
    const p=await UI.newPage(b,{vp,file:FILE}); const U=UI.ui(p);
    await U.start('en',11); await U.pause(); await p.waitForTimeout(300); 
    const s=await toShift(p); await p.waitForTimeout(400); await p.evaluate(()=>LNdraw());
    const w=await p.evaluate(()=>{ const e=document.querySelector('#cards .ordc'); if(!e) return null; const r=e.getBoundingClientRect();
      return {rows:[...e.querySelectorAll('.orc')].map(x=>x.textContent), takes:e.querySelectorAll('[data-act="ordtake"]').length, inScr:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1} });
    await shot(p,'o1-shift-offer'+tag);
    ok('1'+tag+': the new shift\'s card carries two orders (v5.43: no window), each with its reward and a «Take»', !!w&&s.open&&s.offer.length===2&&w.takes===2&&w.rows.length===2, JSON.stringify({s,w}));
    ok('1'+tag+': the first pays in people, the second in a hull', s.offer.length===2&&s.offer[0].rw.people>0&&!!s.offer[1].rw.hull, JSON.stringify(s.offer));
    ok('1'+tag+': the orders are inside the screen', !!w&&w.inScr, JSON.stringify(w));
    await U.tap('#cards .ordc [data-act="ordtake"][data-i="0"]'); await p.waitForTimeout(300);
    const t=await p.evaluate(()=>({on:LN.orders.on&&LN.orders.on.k, offer:LN.orders.offer.length, line:!!document.querySelector('#cards .ocard .sg.ord')&&!document.querySelector('#cards .ordc')}));
    await shot(p,'o2-shift-taken'+tag);
    ok('1'+tag+': «Take» with the mouse takes the first; the other is gone; the card now names the order taken', !!t.on&&t.offer===0&&t.line, JSON.stringify(t));
    await U.clear(); await p.evaluate(()=>LNdraw()); await p.waitForTimeout(200);
    const c=await p.evaluate(()=>{ const e=document.querySelector('#cards .ocard .sg.ord'); return e?e.textContent:null });
    await shot(p,'o3-card-order'+tag, tag?null:'#cards .ocard');
    ok('2'+tag+': the card carries the order: what, how far, the years left, the reward', !!c&&/order/i.test(c)&&/years left/i.test(c), c);
    if(!tag){
      await U.tap('#cards .ocard'); await p.waitForTimeout(300);
      const j=await p.evaluate(()=>{ const e=document.getElementById('goals'); return e?e.textContent:'' }); await shot(p,'o4-journal','#goals');
      ok('2: the journal of objectives has the order with its bar and its due year', /order/i.test(j)&&/due by/i.test(j), j.slice(0,200));
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      const sv=await p.evaluate(()=>{ const g=JSON.parse(JSON.stringify(LN)); return {on:!!(g.orders&&g.orders.on), k:g.orders&&g.orders.on&&g.orders.on.k} });
      ok('2: the order taken lives through a save (the run as JSON)', sv.on, JSON.stringify(sv));
      // 3: done — the reward
      const done=await p.evaluate(()=>{ const o=LN.orders.on, rw=o.rw, p0=LN.earth.people, h0=LN.ships.length; o.at=orderCur(LN,o)-o.n; tick(LN); LN.pauseNow=false;
        const l=LN.log.slice(-20).filter(e=>e.code.indexOf('order_done')===0)[0]; return {rw, dp:LN.earth.people-p0, dh:LN.ships.length-h0, l:!!l, on:!!LN.orders.on} });
      ok('3: done — the people join Earth (order_done), the order is off', done.l&&!done.on&&(done.rw.people?done.dp>=done.rw.people-1:done.dh===1), JSON.stringify(done));
      // the next shift, the hull reward, and a failure: nothing taken from Earth
      const s2=await p.evaluate(()=>{ LN.shiftOpen=false; for(let i=0;i<200&&!LN.shiftOpen;i++){ tick(LN); LN.pauseNow=false } const of=LN.orders.offer.length; const r=orderTake(LN,1); const o=LN.orders.on;
        const h0=LN.ships.length; o.at=orderCur(LN,o)-o.n; tick(LN); LN.pauseNow=false; const got=LN.ships.slice(h0).filter(s=>s.at==='earth'&&s.mode==='idle').map(s=>HULLS[s.hull].key+':'+s.hull);
        LN.shiftOpen=false; for(let i=0;i<200&&!LN.shiftOpen;i++){ tick(LN); LN.pauseNow=false } orderTake(LN,0); const o2=LN.orders.on, E0=JSON.stringify(LN.earth); LN.day=o2.due; tick(LN); LN.pauseNow=false;
        const f=LN.log.slice(-20).some(e=>e.code==='order_failed'); return {of, r, rw:o.rw, got, failed:f, on:!!LN.orders.on, sameMetal:JSON.parse(E0).metal<=LN.earth.metal+50} });
      ok('3: the second order pays in a hull of the yards\' generation, standing at the pier', s2.of===2&&s2.r==='ok'&&s2.got.length===1&&s2.got[0].indexOf(s2.rw.hull)===0, JSON.stringify(s2));
      ok('3: not done in time — order_failed, the order is off, nothing is taken', s2.failed&&!s2.on, JSON.stringify(s2));
      ok('no page errors', !p.errs.length, p.errs.join(' | ')) }
    await p.close() }
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
