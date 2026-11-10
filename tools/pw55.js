// pw55 — v5.10 ковчег перед закрытием, настоящей мышью: A — взлом кольца (покупка ждёт взлома, кольцо I считается после победы);
// B — CALL HOME (два нажатия, судно с линии в конвой); C — день Ночи и экран конца (кто сел, кто проснулся, кольца · капсулы, конвой);
// D — сохранение до v5.10 (уровень N читается как N колец). Окно — улей, см. pw54 (покой, карточка, размеры).
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const path=require('path');
const UI=require('./pw-ui.js');
const SHOTS=process.env.PW55_SHOTS||null;
const out=[]; const ok=(n,v,x)=>out.push((v?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const mk=async()=>{ const p=await UI.newPage(b,{vp:{width:1440,height:900}}); return [p,UI.ui(p)] };
  const helpers=p=>({ txt:sel=>p.evaluate(q=>{ const e=document.querySelector(q); return e?e.innerText.replace(/\n+/g,' | '):'' },sel),
    waitFor:async(fn,ms=8000)=>{ for(let t=0;t<ms;t+=100){ if(await fn()) return true; await p.waitForTimeout(100) } return !!(await fn()) },
    cell:async sel=>{ const bb=await p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} },sel); if(!bb) return false; await p.mouse.click(bb.x,bb.y); await p.waitForTimeout(200); return true } });
  // ---- A. the hack on a ring (a run with the gate on) ----
  { const [p,U]=await mk(); const {txt,waitFor,cell}=helpers(p); const H=()=>p.evaluate(()=>LBhack.state());
    await U.start('en',11,{hack:true}); await U.clear();
    await p.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.nightSeen=true; G.earth.food+=20000; G.earth.metal+=9000; LNdraw() });
    await U.closeBig(); await U.tab('ark'); await cell('#ovl .hold .hr[data-v="1"] .hx'); await U.tap('#arkcard [data-act="arkbuy"]');
    const a=await p.evaluate(()=>({paid:arkPaid(LN),held:arkRings(LN),q:(LN.hackQ||[]).map(h=>h.k+h.l).join(),wait:document.querySelectorAll('#ovl .hold .hx.wait').length,on:document.querySelectorAll('#ovl .hold .hr:not(#cvring) .hx.on').length,next:arkCheck(LN,2)}));
    ok('A ring I paid waits for the hack: not counted, drawn dashed, ring II refused', a.paid===1&&a.held===0&&a.q==='ark1'&&a.wait===6&&a.on===0&&a.next==='hack', JSON.stringify(a));
    ok('A the window asks: Hack needed: ARK.RING.I', /Hack needed: ARK\.RING\.I\b/i.test(await txt('#hkneed')), await txt('#hkneed'));
    await shot(p,'close-A1-hackneed');
    await U.tap('#hkneed [data-act="hack"]');
    ok('A the hack opens: the hive, level 1', await waitFor(async()=>(await H()).open)&&(await H()).kind==='hive'&&(await H()).lv===1, JSON.stringify(await H()).slice(0,140));
    const ai=await txt('#hkIntro'); ok('A intro names ARK.RING.I', /ARK\.RING\.I\b/.test(ai)&&/HIVE/.test(ai), ai.slice(0,200));
    await U.tap('#hkGo'); await waitFor(async()=>(await H()).game==='play'); await p.evaluate(()=>LBhack.cheat()); await waitFor(async()=>(await H()).panel==='won');
    await waitFor(()=>p.isVisible('#hkDone'),8000); const aw=await txt('#hkWon');
    ok('A won: «Ring I of the hive counts now»', /Ring I of the hive counts now/.test(aw), aw.slice(0,260));
    await U.tap('#hkDone'); await p.waitForTimeout(400);
    const a2=await p.evaluate(()=>({held:arkRings(LN),q:(LN.hackQ||[]).length,on:document.querySelectorAll('#ovl .hold .hr:not(#cvring) .hx.on').length,wait:document.querySelectorAll('#ovl .hold .hx.wait').length}));
    ok('A after the hack ring I counts and is purple', a2.held===1&&a2.q===0&&a2.on===6&&a2.wait===0, JSON.stringify(a2));
    ok('A no page errors', p.errs.length===0, p.errs.join(' | ').slice(0,300)); await p.close() }
  // ---- B. CALL HOME, C. the end screen ----
  { const [p,U]=await mk(); const {txt,cell}=helpers(p);
    await U.start('en',11); await U.clear();
    const pid=await p.evaluate(()=>{ const G=LN, pl=PLANETS.filter(q=>q.sec===0&&!G.colonies[q.id])[0]; const r=colonize(G,G.ships[0].id,pl.id,40,0); return r==='ok'?pl.id:('!'+r) });
    await U.until(async()=>await p.evaluate(id=>!!LN.colonies[id],pid),200); await U.pause();
    const line=await p.evaluate(id=>{ const G=LN, s=G.ships.filter(x=>x.mode==='idle'&&x.at==='earth'&&!x.from)[0]; return s?setLine(G,s.id,id,'earth'):'noship' },pid);
    await p.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.nightSeen=true; G.earth.food+=20000; G.earth.metal+=9000; LNdraw() });
    await U.closeBig(); await U.tab('ark'); await cell('#cvring .hx');
    let card=(await txt('#arkcard')).replace(/\s+/g,' '); const c0=await p.evaluate(()=>arkConvoy(LN));
    ok('B a hull on a line: «On the lines 1 · CALL HOME»', line==='ok'&&/On the lines \| 1 \| CALL HOME/i.test(card), 'colony '+pid+' line '+line+' · '+card);
    await U.tap('#arkcard [data-act="allhome"]'); card=await txt('#arkcard');
    ok('B the first press asks again', /PRESS AGAIN/i.test(card)&&(await p.evaluate(()=>arkConvoy(LN).have+arkConvoy(LN).way))===c0.have+c0.way, card);
    await U.tap('#arkcard [data-act="allhome"]'); const c1=await p.evaluate(()=>({cv:arkConvoy(LN),res:LN.ships.filter(s=>s.reserve).length,lines:LN.ships.filter(s=>s.from&&s.to).length}));
    ok('B the second press calls it home: in the convoy or on its way, off its line', c1.res===1&&c1.cv.have+c1.cv.way===1, JSON.stringify(c1));
    await shot(p,'close-B-callhome');
    // C. the Night comes: ring II bought, the drive ready, the hull called home docks or not
    if(await p.isVisible('#arkcard [data-act="allpier"]')) await U.tap('#arkcard [data-act="allpier"]');
    const pre=await p.evaluate(()=>{ const G=LN; G.driveLvl=G.arkMark; G.gen=G.driveLvl; ensureGen(G.gen); const r=arkBuy(G,2); G.night=G.day+3; LNdraw(); return {buy:r,ab:arkSouls(G),caps:arkCaps(arkRings(G)),cv:arkConvoy(G),wk:arkWakeN(G)} });
    await U.closeWin(); await U.until(async()=>!!(await p.evaluate(()=>LN.over)),60,1); await p.waitForTimeout(600); await p.evaluate(()=>LNdraw());
    const end=await p.evaluate(()=>({over:LN.over,boarded:LN.boarded,souls:LN.souls,convoy:LN.convoy,cargo:LN.cargo,capsuled:LN.capsuled})); const et=await txt('.nwin');
    ok('C the Night: everyone on Earth boarded, woken = min(aboard, pods) x share', end.over==='night'&&end.boarded>0&&end.souls===Math.floor(Math.min(end.boarded,1800)*end.convoy.have/end.convoy.all+1e-9), JSON.stringify(pre)+' → '+JSON.stringify(end));
    ok('C the end screen: aboard, woke, sleep on, rings · pods, convoy, carried along', /Souls aboard/.test(et)&&/Woke at the other end/.test(et)&&(end.boarded===end.souls||/Sleep on/i.test(et))&&/Rings · pods \| 2 · 1[\s  ]?800/.test(et)&&/Convoy \| \d+ \/ \d+/.test(et)&&/Carried along/.test(et), et.slice(0,700));
    await shot(p,'close-C-end');
    ok('B/C no page errors', p.errs.length===0, p.errs.join(' | ').slice(0,300)); await p.close() }
  // ---- D. a save from before v5.10 ----
  { const [p,U]=await mk();
    await U.start('en',11); await U.clear(); await p.evaluate(()=>{ LNU.shiftStop=true }); await U.years(90);
    const had=await p.evaluate(()=>{ const t=localStorage.getItem('lb.save'); if(!t) return false; const o=JSON.parse(t); if(!o.G.night){ o.G.night=o.G.day+3000; o.G.nightSeen=true; o.G.arkMark=3 }
      o.G.ark={paid:{metal:50000,parts:9000,food:60000,fuel:20000},lv:2,woke:2}; localStorage.setItem('lb.save',JSON.stringify(o)); return true });
    ok('D an autosave exists and is rewritten to the old form (levels I-II paid)', had);
    await p.goto(UI.URL()+'/'+p.file); await p.waitForTimeout(500);
    // «Continue» грузит около 4–5 с: ждём появления LN.day>0, а не полсекунды
    const btn=await p.isVisible('#menu .mit[data-id="cont"]'); if(btn) await U.tap('#menu .mit[data-id="cont"]');
    for(let i=0;i<120&&!(await p.evaluate(()=>!!window.LN&&LN.day>0));i++) await p.waitForTimeout(100);
    await p.waitForTimeout(300);
    const g=await p.evaluate(()=>window.LN?{ark:LN.ark,rings:arkRings(LN),caps:arkCaps(arkRings(LN)),day:LN.day}:null);
    ok('D the old save loads: level II reads as two rings, 1 800 pods', btn&&!!g&&g.rings===2&&g.caps===1800&&g.ark.paid===undefined, JSON.stringify(g));
    await p.evaluate(()=>window.LNtut&&LNtut.off()); await U.clear(); await U.tab('ark'); await p.waitForTimeout(300);
    const on=await p.evaluate(()=>document.querySelectorAll('#ovl .hold .hr:not(#cvring) .hx.on').length);
    ok('D the Ark window draws it: 18 purple cells', on===18, 'on '+on);
    await shot(p,'close-D-oldsave');
    ok('D no page errors', p.errs.length===0, p.errs.join(' | ').slice(0,300)); await p.close() }
  await b.close();
 }catch(e){ out.push('FAIL crash — '+String(e&&e.stack||e).slice(0,400)) }
 console.log(out.join('\n')); const bad=out.filter(l=>!l.startsWith('PASS')).length; console.log('pw55 '+(out.length-bad)+'/'+out.length); process.exit(bad?1:0);
})();
