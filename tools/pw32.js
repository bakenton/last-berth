// v4.14 — fixes from the live run 398763448: evacuation takes a free hull on its own (stale pick), a dead seam with a pile still
// gets hulls (+ allowed, yards serve it), yards count build time against the mutiny check, no "ark sailed" line at 0 berths,
// physicist line without a forecast year reads as a sentence, a_yard_cost reason is a sentence, version string 4.14
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const closePf=async()=>{ for(let i=0;i<6&&await p.isVisible('#pf');i++) await tap('[data-act="pfok"]') };
  const run=async n=>p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false } LNdraw() },n);
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='398763448'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{ LNU.shiftStop=false });
  const ver=await p.evaluate(()=>JSON.parse(exportLog(LN)).v);
  ok('version string 4.1x–4.2x in the run log', /^4\.[12]\d$/.test(ver), ver);   // by format, as in pw31: the number moves every iteration; v4.20+ accepts 4.2x

  // 1. evacuation with a stale pick: the player opened an unsettled world (pick = hull A), hull A left to found a colony,
  //    then "Evacuate" on a settled world must take the other free hull, not answer 'busy'
  const W=await p.evaluate(()=>{ const m=PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist); return {a:m[0].id,b:m[1].id} });
  await p.evaluate(w=>{ LN.earth.people=400; LN.earth.fuel=5000; LN.safe=true; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); colonize(LN,s.id,w.a,0,0); },W);
  await run(40); await closePf();
  ok('colony founded (fixture)', await p.evaluate(w=>!!LN.colonies[w.a],W));
  // open the other (unsettled) mine: shipChips sets U.pickShip to the first free hull
  await p.evaluate(w=>{ LNU.sel=w.b; LNU.tab='target'; LNdraw() },W);
  const picked=await p.evaluate(()=>LNU.pickShip);
  ok('opening an unsettled world picks a hull', picked!==null, picked);
  // that hull leaves: found the second mine with it; the first hull is home by now (fixture: make sure one hull is free)
  await p.evaluate(w=>{ colonize(LN,LNU.pickShip,w.b,0,0); const free=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); if(!free){ buildShip(LN,0); LN.ships[LN.ships.length-1].mode='idle'; LN.ships[LN.ships.length-1].t=0 } },W);
  await run(2); await closePf();
  const st=await p.evaluate(()=>({pick:LNU.pickShip, pickMode:(shipById(LN,LNU.pickShip)||{}).mode, free:LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth').length}));
  ok('fixture: picked hull is away, another hull is free at Earth', st.pickMode==='transit'&&st.free>0, JSON.stringify(st));
  await p.evaluate(w=>{ LNU.sel=w.a; LNU.tab='target'; LNdraw() },W);
  await tap('[data-act="evac"]');
  const ev=await p.evaluate(()=>({toast:document.getElementById('toast').textContent, cls:document.getElementById('toast').className, going:LN.ships.some(s=>s.job==='evac'&&s.mode==='transit'), last:LN.actions[LN.actions.length-1]}));
  ok('evacuation launched with the free hull (no "not at Earth")', ev.going&&/good/.test(ev.cls)&&!/not at Earth/.test(ev.toast), JSON.stringify(ev));
  ok('evac action logged ok', ev.last&&ev.last.k==='evacuate'&&ev.last.r==='ok', JSON.stringify(ev.last));
  // 2. no free hull at all: the reason names the hull coming home or says to order one
  await p.evaluate(w=>{ LNU.sel=w.b; LNU.tab='target'; LNdraw() },W);
  await run(60); await closePf();
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'){ s.mode='transit'; s.at=null; s.origin='earth'; s.dest='earth'; s.dir='in'; s.t=9; s.total=9 } }); LNdraw() });
  await p.evaluate(w=>{ LNU.sel=w.b; LNU.tab='target'; LNdraw() },W);
  await tap('[data-act="evac"]');
  const ev2=await p.evaluate(()=>({toast:document.getElementById('toast').textContent, cls:document.getElementById('toast').className, last:LN.actions[LN.actions.length-1]}));
  // v4.18 (F-17): only a courier lifts a settlement — the toast is MSG.evacNoCourier + evacW_wait / evacW_orderC
  ok('no free hull: red toast names a courier coming home or tells to build one', /bad/.test(ev2.cls)&&/No free courier at Earth can reach/.test(ev2.toast)&&/(Hull \d+ is home in \d+ years?|Build a courier in the dock)/.test(ev2.toast), ev2.toast);
  ok('no free hull: action logged with reason evacNoHull', ev2.last&&ev2.last.r==='evacNoHull', JSON.stringify(ev2.last));

  // 3. dead seam with a pile: + allowed, yards put a hull on it; empty pile: + blocked
  await run(12); await closePf();
  const D=await p.evaluate(w=>{ const id=w.b; const c=LN.colonies[id]; if(!c) return null; LN.reserves[id]=0; c.store.metal=500; LN.earth.metal=3000; LN.earth.fuel=5000; LN.earth.people=400;
    const r1=setWant(LN,id,'courier',1); tick(LN); LN.pauseNow=false; const L=lineOf(LN,id); LNU.sel=id; LNU.tab='target'; LNdraw();
    const plus=document.querySelector('[data-act="want"][data-c="courier"].plus'); return {r1, wait:L&&L.wait&&L.wait.courier, on:onLine(LN,id).length, plus:!!plus, plusOff:plus&&plus.getAttribute('aria-disabled')} },W);
  ok('dead seam + pile: setWant ok, yards do not answer depleted, a hull is on the line', D&&D.r1==='ok'&&D.wait!=='depleted'&&D.on>0, JSON.stringify(D));
  ok('dead seam + pile: + button is there and enabled', D&&D.plus&&D.plusOff!=='true', JSON.stringify(D));   // 05.10: a missing button used to pass
  // v4.17/v4.18: seam spent AND surface empty — the standing order is not drawn at all, the card is the 'Spent world' block with evacuation only
  const D2=await p.evaluate(w=>{ const id=w.b; LN.colonies[id].store.metal=0; LNdraw(); const plus=document.querySelector('[data-act="want"][data-c="courier"].plus');
    return {plus:!!plus, acts:[...new Set([...document.querySelectorAll('#railbody .blk [data-act]')].map(b=>b.dataset.act))].join(','), spent:/Spent world/.test(document.querySelector('#rail').textContent), r:setWant(LN,id,'courier',3)} },W);
  ok('dead seam, empty pile: no +, only evacuation under "Spent world", setWant depleted', !D2.plus&&D2.acts==='evac'&&D2.spent&&D2.r==='depleted', JSON.stringify(D2));

  // 4. yards: build time counts against the mutiny check
  const Y=await p.evaluate(w=>{ const id=w.b; LN.reserves[id]=5000; LN.night=LN.day+30; LN.arkMark=3; LN.earth.metal=99999; LN.earth.fuel=99999; LN.earth.parts=99999; LN.earth.people=999;
    const hi=currentHull(LN,'courier'); const h=HULLS[hi]; const round=legDays(LN,id,'earth',{hull:hi})*2; return {chk:yardCheck(LN,id,'courier'), days:h.days, round, left:30} },W);
  ok('yardCheck says mutiny when build time + 1.5×round exceeds the years left', Y.chk==='mutiny'&&Y.days+1.5*Y.round>30, JSON.stringify(Y));
  const Y2=await p.evaluate(w=>{ LN.night=LN.day+3000; return yardCheck(LN,w.b,'courier') },W);
  ok('yardCheck ok again with the Night far away', Y2==='ok', Y2);

  // 5. a_yard_cost reads as a sentence, not "— metal"
  const A=await p.evaluate(w=>{ const id=w.b; LN.earth.metal=0; LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)){ s.mode='transit'; s.at=null; s.origin='earth'; s.dest='earth'; s.dir='in'; s.t=9; s.total=9 } });
    setWant(LN,id,'courier',4); tick(LN); LN.pauseNow=false; LNU.sel=id; LNdraw(); const t=document.getElementById('advisor').textContent; const adv=advice(LN).find(x=>x.code==='a_yard_cost');
    setWant(LN,id,'courier',1); LN.earth.metal=3000; return {adv:adv&&adv.r, t} },W);
  ok('advisor: a_yard_cost raised with reason metal', A.adv==='metal', JSON.stringify(A.adv));
  ok('advisor: yard reason translated (no raw "— metal")', !/— metal\./.test(A.t)&&(!/waits on the yards/.test(A.t)||/waits on the yards — yards wait: not enough metal/.test(A.t)), A.t.slice(0,300));

  // 6. physicist line without a forecast: a sentence, no "year —"
  await p.evaluate(()=>{ LN.night=null; LN.nightSeen=false; LN.arkMark=null; revealNight(LN); LNdraw() });
  await tap('[data-act="nightok"]'); await p.waitForTimeout(150);
  const V=await p.evaluate(()=>({pf:document.getElementById('pf')?document.getElementById('pf').textContent:'', line:(LN.log.filter(l=>l.code==='voice'&&/night_dated/.test(l.d.k)).pop()||{}).d}));
  ok('physicist: no "year —"; the sentence says why there is no year yet', !/year —|—年/.test(V.pf)&&/(never ready|is ready in year \d+)/.test(V.pf), V.pf.slice(0,300));
  await closePf();

  // 7. 0 berths at the Night: no "ark left on schedule" chronicle line
  await p.evaluate(()=>{ LN.driveLvl=LN.arkMark; LN.gen=LN.arkMark; ensureGen(LN.gen); LN.ark.berths=0; LN.ark.blocks=0; LN.night=LN.day+2; for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  const N=await p.evaluate(()=>({over:LN.over, sailed:LN.log.some(l=>l.code==='ark_sailed'), woke:LN.log.some(l=>l.code==='ark_woke'), night:LN.log.some(l=>l.code==='night'), title:document.getElementById('ovbox').textContent.slice(0,80)}));
  ok('0 berths: ending is Night without ark_sailed / ark_woke lines', N.over==='night'&&!N.sailed&&!N.woke&&N.night&&/THE NIGHT CAME/.test(N.title), JSON.stringify(N));

  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close(); await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
