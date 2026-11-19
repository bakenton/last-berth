// pw79 — v5.44, the interface batch of Nikita's v5.43 playtest (19.11). Real mouse.
//  1  ❚❚ / 1× / 2× / 4× with a world window open: the window closes and the clock runs; a toggle still pauses with no window
//  2  the card's world breathes on the map (.gpulse) and goes out at the first press on it; the tab the card leads to wears .gp
//  3  BUILDING — a block of its own, a timer row per hull
//  4  the order's result — a flash on the card, not a toast (pw78 has the done case; here the missed one)
//  5  a worked-out world wears the badge (red when nothing is left; the amber one (a pile waits) is not asserted — «dry» needs a line)
//  6  the WORLD block says «Produces / Seam lasts / Awaiting pickup»
//  7  a ring paid and not yet hacked: «Paid, awaiting the hack» in the ARK window and the verdict says so
//  10 a hub's name carries no seam percent
//  11 a hull told to move leaves the old line's figure and bar at once (hatched −x)
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await U.clear() };
  const st=()=>p.evaluate(()=>({day:LN.day,paused:LNU.paused,win:LNU.win,halted:LNI.halted()}));
  await U.start('en',309573272);
  // 1
  await U.openWorld('w1'); let s=await st(); ok('1: a world window holds the clock', s.win==='w1'&&s.halted);
  await U.tap('#top [data-act="spd"][data-v="0"]'); await p.waitForTimeout(1300); s=await st();
  ok('1: ❚❚ with the window open closes it and the clock runs', s.win===null&&!s.paused&&s.day>=1, JSON.stringify(s));
  await U.pause(); await U.openWorld('w1'); await U.tap('#top [data-act="spd"][data-v="2"]'); await p.waitForTimeout(1300); s=await st();
  ok('1: 2× with the window open closes it and runs', s.win===null&&!s.paused, JSON.stringify(s));
  await U.tap('#top [data-act="spd"][data-v="0"]'); s=await st(); ok('1: ❚❚ with no window pauses', s.paused&&s.win===null, JSON.stringify(s));
  // 2
  await p.evaluate(()=>{ LNU.seenGoal={}; LNdraw() });
  const g=await p.evaluate(()=>({t:(LNU.goalT||[]).map(t=>t.p),pulse:[...document.querySelectorAll('#map .gpulse')].length}));
  ok('2: the card\'s world breathes on the map', g.t.length===1&&g.pulse===1, JSON.stringify(g));
  await U.openWorld(g.t[0]); await U.closeWin(); await p.evaluate(()=>LNdraw());
  const g2=await p.evaluate(()=>({t:(LNU.goalT||[]).length,pulse:document.querySelectorAll('#map .gpulse').length}));
  ok('2: it goes out at the first press on it', g2.t===0&&g2.pulse===0, JSON.stringify(g2));
  await p.evaluate(()=>{ const orig=window.objectives; window.objectives=function(G){ var O=orig(G); O.now=[{code:'o_survey',n:2}].concat(O.now); return O }; LNU.seenGoal={}; LNdraw() });
  const g3=await p.evaluate(()=>({tab:!!document.querySelector('#tabs .tab.gp[data-v="tech"]'),ring:(LNU.goalT||[]).some(t=>t.ring)}));
  ok('2: a chart-ring objective: the Tech tab and the next ring breathe', g3.tab&&g3.ring, JSON.stringify(g3));
  await U.tap('#tabs [data-act="tab"][data-v="tech"]'); const g4=await p.evaluate(()=>({tab:!!document.querySelector('#tabs .tab.gp[data-v="tech"]'),ring:(LNU.goalT||[]).some(t=>t.ring)}));
  ok('2: the press on the Tech tab puts both out', !g4.tab&&!g4.ring, JSON.stringify(g4));
  await p.evaluate(()=>{ LNU.tab=null; LNdraw() });
  // 3
  await p.evaluate(()=>{ const E=LN.earth; E.metal=9000; E.food=20000; E.fuel=9000; E.parts=4000; E.people=3000; buildShip(LN,HULLS.findIndex(h=>h.gen===0&&h.key==='courier')); LNdraw() });
  const bl=await p.evaluate(()=>{ const e=document.querySelector('#cards .bblk'); return e?{head:e.querySelector('.hd').innerText.replace(/\s+/g,' '),rows:e.querySelectorAll('.bcard').length}:null });
  ok('3: BUILDING — a block with a timer row per hull', bl&&/BUILDING/i.test(bl.head)&&bl.rows===1, JSON.stringify(bl));
  // 4
  await p.evaluate(()=>{ log(LN,'order_failed',{k:'hulls'}); LNdraw() }); await U.play(2); await p.waitForTimeout(400); await U.pause();
  const f=await p.evaluate(()=>({toasts:document.querySelectorAll('#toasts .toast').length,no:(document.querySelector('#cards .ordf.no')||{}).textContent||null}));
  ok('4: an order missed — a red flash on the card, no toast', f.toasts===0&&/Order missed/.test(f.no||''), JSON.stringify(f));
  // 5, 6, 10, 11
  const mines=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist).slice(0,2).map(q=>q.id));
  for(const m of mines){ await U.openWorld(m); await U.tap('#ovl [data-act="send"][data-p="'+m+'"]'); await run(45) }
  await U.openWorld(mines[0]); await p.evaluate(()=>LNdraw());
  const w=await p.evaluate(()=>document.getElementById('ovl').innerText.replace(/\s+/g,' '));
  ok('6: the WORLD block: Produces / Seam lasts / Awaiting pickup', /Produces\s*[\d.]+\/yr/.test(w)&&/Seam lasts/.test(w)&&/Awaiting pickup/.test(w)&&!/World gives|Deposit|On the surface/.test(w), w.slice(0,260));
  await U.closeWin();
  await p.evaluate(m=>{ LN.reserves[m]=0; LN.colonies[m].store.metal=0; LNU.win=null; LNdraw() },mines[0]); let bd;
  bd=await p.evaluate(m=>({st:LNI.wst(m),n:document.querySelectorAll('#map .wd[data-p="'+m+'"] path[stroke-linecap="round"]').length,red:(document.querySelector('#map .wd[data-p="'+m+'"] path[stroke-linecap="round"]')||{getAttribute(){return ''}}).getAttribute('stroke')}),mines[0]);
  ok('5: worked out, nothing left — the red badge', bd.st==='dead'&&bd.n===1&&/FF2A1A/i.test(bd.red), JSON.stringify(bd));
  // 10: the hub's name has no percent
  const pct=await p.evaluate(m=>({live:/%/.test(document.querySelector('#map .wd[data-p="'+m+'"]').textContent)}),mines[1]);
  ok('(10) a live mine shows its seam percent', pct.live, JSON.stringify(pct));
  await p.evaluate(m=>{ LN.colonies[m].hub=true; LNdraw() },mines[1]);
  const pct2=await p.evaluate(m=>/%/.test(document.querySelector('#map .wd[data-p="'+m+'"]').textContent),mines[1]);
  ok('10: a hub carries no seam percent by its name', !pct2);
  await p.evaluate(m=>{ LN.colonies[m].hub=false; LNdraw() },mines[1]);
  // 11
  await p.evaluate(m=>{ LN.reserves[m]=5000; LNdraw() },mines[0]);
  const sid=await p.evaluate(m=>{ const s=LN.ships.find(o=>o.mode==='idle'&&o.at==='earth'&&!(o.from&&o.to)); if(!s) return 0; setLine(LN,s.id,m,'earth'); return s.id },mines[0]);
  for(let i=0;i<30&&sid;i++){ await run(1); if(await p.evaluate(i=>shipById(LN,i).mode==='transit',sid)) break }
  await U.openWorld(mines[0]); await p.evaluate(()=>LNdraw());
  const row=()=>p.evaluate(()=>{ const e=document.querySelector('#rw-carries'); return {t:e.innerText.replace(/\s+/g,' '),leave:!!e.querySelector('.soon.leave'),bar:e.querySelector('.bar u')?e.querySelector('.bar u').style.width:''} });
  const r0=await row(); await p.evaluate(a=>moveLine(LN,a[0],a[1]),[sid,mines[1]]); await p.evaluate(()=>LNdraw()); const r1=await row();
  ok('11: before the move the line carries; after it — the figure is off and a hatched −x stands', sid&&!r0.leave&&/Line carries\s*[1-9]/.test(r0.t)&&r1.leave&&/Line carries\s*0\.0\/yr\s*.*−/.test(r1.t)&&r1.bar==='0%', JSON.stringify({r0,r1}));
  await U.closeWin();
  // 7: paid, not hacked
  await p.evaluate(()=>{ LN.hackGate=true; const E=LN.earth; LN.driveLvl=2; LN.gen=2; ensureGen(2); while(SECTORS.length<6) openSector(LN); revealNight(LN); LN.nightSeen=true; LN.night=3802; E.people=5180; E.metal=31400; E.food=21400; E.fuel=9100; E.parts=2460; LNU.notes=[]; LNU.pf=null; LNdraw() });
  await U.clear(); await U.tab('ark'); await p.waitForTimeout(200);
  const before=await p.evaluate(()=>({f:Math.round(LN.earth.food),m:Math.round(LN.earth.metal)}));
  await U.tap('#ovl .hold .hr[data-v="1"] .hx'); await U.tap('#arkcard [data-act="arkbuy"]'); await p.waitForTimeout(200);
  const tst=await p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent).join('|'));
  const a=await p.evaluate(()=>({f:Math.round(LN.earth.food),m:Math.round(LN.earth.metal),paid:arkPaid(LN),rings:arkRings(LN),line:(document.getElementById('arkpaid')||{}).innerText||null,fate:(document.getElementById('arkfate')||{}).innerText||''}));
  ok('7: resources are taken at the press, the ring is paid and not yet counted', a.f<before.f&&a.m<before.m&&a.paid===1&&a.rings===0, JSON.stringify({before,a}));
  ok('7: the window says «Paid, awaiting the hack» and the verdict names the ring', /Paid, awaiting the hack/.test(a.line||'')&&/\+600/.test(a.line||'')&&/Ring I is paid/.test(a.fate), JSON.stringify(a));
  ok('7: the toast says paid / the hack, not «filled», with the same ring number as the hack card', /Ring I paid/.test(tst)&&!/filled/.test(tst), tst);
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
