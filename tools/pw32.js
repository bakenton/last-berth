// v4.14 — fixes from the live run 398763448: evacuation takes a free hull on its own (stale pick), a dead seam with a pile still
// gets hulls (+ allowed, yards serve it), yards count build time against the mutiny check, no "ark sailed" line at 0 berths,
// physicist line without a forecast year reads as a sentence, a_yard_cost reason is a sentence, version string 4.14
// v4.35: окно мира (#ovl; эвакуация — [data-act="evac"]), тосты (#toasts), личное дело (#pfL), финал (#noteL)
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const toasts=()=>p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.className+'|'+t.textContent.replace(/\s+/g,' ')).join(' || '));
  const showWorld=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false } LNdraw() },n); await U.clear() };
  await U.start('en',398763448);
  const ver=await p.evaluate(()=>JSON.parse(exportLog(LN)).v);
  ok('version string 4.xx in the run log', /^4\.[1-9]\d$/.test(ver), ver);   // by format, as in pw31: the number moves every iteration; v4.20+ accepts 4.2x

  // 1. evacuation takes a free hull on its own, another hull than the one that founded
  const W=await p.evaluate(()=>{ const m=PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist); return {a:m[0].id,b:m[1].id} });
  await p.evaluate(w=>{ LN.earth.people=400; LN.earth.fuel=5000; LN.safe=true; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); colonize(LN,s.id,w.a,0,0); LNdraw() },W);
  await run(40);
  ok('colony founded (fixture)', await p.evaluate(w=>!!LN.colonies[w.a],W));
  // the other (unsettled) mine: its window offers a free hull; that hull founds the second mine
  await p.evaluate(w=>{ const free=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); colonize(LN,free.id,w.b,0,0); const f2=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); if(!f2){ buildShip(LN,0); LN.ships[LN.ships.length-1].mode='idle'; LN.ships[LN.ships.length-1].t=0 } LNdraw() },W);
  await run(2);
  const st=await p.evaluate(()=>({free:LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth').length, transit:LN.ships.filter(s=>s.mode==='transit').length}));
  ok('fixture: a hull is away and another hull is free at Earth', st.transit>0&&st.free>0, JSON.stringify(st));
  await showWorld(W.a);
  await U.tap('#ovl [data-act="evac"]');
  const ev=await p.evaluate(()=>({going:LN.ships.some(s=>s.job==='evac'&&s.mode==='transit'), last:LN.actions[LN.actions.length-1]}));
  const tt=await toasts();
  ok('evacuation launched with the free hull (no "not at Earth")', ev.going&&/good/.test(tt)&&!/not at Earth/.test(tt), tt.slice(0,200));
  ok('evac action logged ok', ev.last&&ev.last.k==='evacuate'&&ev.last.r==='ok', JSON.stringify(ev.last));
  // 2. no free hull at all: the reason names the hull coming home or says to order one
  await run(60);
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'){ s.mode='transit'; s.at=null; s.origin='earth'; s.dest='earth'; s.dir='in'; s.t=9; s.total=9 } }); LNdraw() });
  await showWorld(W.b);
  const before=await p.evaluate(()=>LN.actions.length);
  const dis=await p.evaluate(()=>{ const b=document.querySelector('#ovl [data-act="evac"]'); return b?{off:b.getAttribute('aria-disabled'),why:b.getAttribute('data-why')}:null });
  ok('v4.31: evac button off with data-why=evacNoCourier (no free courier)', dis&&dis.off==='true'&&dis.why==='evacNoCourier', JSON.stringify(dis));
  await U.tap('#ovl [data-act="evac"]');
  const tt2=await toasts();
  // v4.18 (F-17): only a courier lifts a settlement — the toast is MSG.evacNoCourier + evacW_wait / evacW_orderC
  ok('no free hull: red toast names a courier coming home or tells to build one', /bad/.test(tt2)&&/No free courier at Earth can reach/.test(tt2)&&/(Courier \d+ is home in \d+ years?|build one in the Yard)/.test(tt2), tt2.slice(0,240));
  ok('nothing logged for the refused evacuation', await p.evaluate(n=>LN.actions.slice(n).every(a=>a.k!=='evacuate'||a.r!=='ok'),before));

  // 3. dead seam with a pile: + allowed, yards put a hull on it; empty pile: order off
  await run(12);
  const D=await p.evaluate(w=>{ const id=w.b; const c=LN.colonies[id]; if(!c) return null; LN.reserves[id]=0; c.store.metal=500; LN.earth.metal=3000; LN.earth.fuel=5000; LN.earth.people=400;
    const r1=orderFor(LN,id,'courier'); tick(LN); LN.pauseNow=false; return {r1, on:onLine(LN,id).length} },W);
  ok('dead seam + pile: order ok, the ordered hull is on the line (not depleted)', D&&D.r1==='ok'&&D.on>0, JSON.stringify(D));
  await showWorld(W.b);
  ok('dead seam + pile: order button is there and enabled', await p.evaluate(()=>{ const bt=document.querySelector('#ovl [data-act="order"][data-c="courier"]'); return !!bt&&bt.getAttribute('aria-disabled')!=='true' }));   // 05.10: a missing button used to pass
  const D2=await p.evaluate(w=>{ const id=w.b; LN.colonies[id].store.metal=0; LN.reserves[id]=0; LNdraw(); return {r:orderFor(LN,id,'courier')} },W);
  await showWorld(W.b);
  const D2dom=await p.evaluate(()=>({order:document.querySelectorAll('#ovl [data-act="order"]').length, evac:!!document.querySelector('#ovl [data-act="evac"]'), txt:document.getElementById('ovl').textContent.replace(/\s+/g,' ')}));
  ok('dead seam, empty pile: no order button, evacuation only, orderFor depleted', D2dom.order===0&&D2dom.evac&&/WORKED OUT|Worked out|worked out/i.test(D2dom.txt)&&D2.r==='depleted', JSON.stringify(D2)+' '+JSON.stringify(D2dom).slice(0,160));

  // 4. yards: build time counts against the Night (orderCheck orderNight)
  const Y=await p.evaluate(w=>{ const id=w.b; LN.reserves[id]=5000; LN.night=LN.day+30; LN.arkMark=3; LN.earth.metal=99999; LN.earth.fuel=99999; LN.earth.parts=99999; LN.earth.people=999;
    const hi=currentHull(LN,'courier'); const h=HULLS[hi]; const round=legDays(LN,id,'earth',{hull:hi})*2; return {chk:orderCheck(LN,id,'courier'), days:h.days, round, left:30} },W);
  ok('orderCheck says orderNight when build time + 1.5×round exceeds the years left', Y.chk==='orderNight'&&Y.days+1.5*Y.round>30, JSON.stringify(Y));
  const Y2=await p.evaluate(w=>{ LN.night=LN.day+3000; return orderCheck(LN,w.b,'courier') },W);
  ok('orderCheck ok again with the Night far away', Y2==='ok', Y2);

  // 5. the order button says why it is off: data-why=cost, aria-disabled; no a_yard_cost advice
  await p.evaluate(w=>{ const id=w.b; LN.night=null; LN.reserves[id]=5000; LN.colonies[id].store.metal=500; LN.earth.metal=0; LNdraw() },W);
  await showWorld(W.b);
  const A=await p.evaluate(w=>{ const id=w.b; const plus=document.querySelector('#ovl [data-act="order"][data-c="courier"]');
    return {code:orderCheck(LN,id,'courier'), off:plus&&plus.getAttribute('aria-disabled'), why:plus&&plus.getAttribute('data-why'), noAdv:!LNI.adv().some(x=>/yard cost/i.test(x[1]+x[2]))} },W);
  ok('order refused for cost — button off with data-why=short_metal (v4.35 shortWhy code)', A.code==='cost'&&A.off==='true'&&A.why==='short_metal', JSON.stringify(A));
  ok('no a_yard_cost advice (removed with the standing order)', A.noAdv, JSON.stringify(A));
  await p.evaluate(()=>{ LN.earth.metal=3000; LNdraw() });

  // 6. physicist line without a forecast: a sentence, no "year —"
  await p.evaluate(()=>{ LN.night=null; LN.nightSeen=false; LN.arkMark=null; revealNight(LN); LNdraw() });
  await U.closeBig(); await p.evaluate(()=>LNdraw());
  const pf=await p.evaluate(()=>{ const e=document.getElementById('pfL'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('physicist: no "year —"; the sentence says why there is no year yet', !/year —/.test(pf)&&/(never ready|is ready in year \d+)/.test(pf), pf.slice(0,300));
  await U.clear();

  // 7. 0 berths at the Night: no "ark left on schedule" chronicle line
  await p.evaluate(()=>{ LN.driveLvl=LN.arkMark; LN.gen=LN.arkMark; ensureGen(LN.gen); LN.ark.berths=0; LN.ark.blocks=0; LN.night=LN.day+2; for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  const N=await p.evaluate(()=>({over:LN.over, sailed:LN.log.some(l=>l.code==='ark_sailed'), woke:LN.log.some(l=>l.code==='ark_woke'), night:LN.log.some(l=>l.code==='night'), title:document.getElementById('noteL').textContent.slice(0,120)}));
  ok('0 berths: ending is Night without ark_sailed / ark_woke lines', N.over==='night'&&!N.sailed&&!N.woke&&N.night&&/The ark did not sail: not one ark level was paid/i.test(N.title), JSON.stringify(N));   // v4.36: N-13 (b)

  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
