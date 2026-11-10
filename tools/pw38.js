// v4.29 — the ark is paid for in one go (no deposits); hulls can be set aside for the convoy; yards must not break up or take a convoy hull.
// v5.10 (design/ARK.md 2г): rings of pods instead of levels (ring I 1 200 food / 600 metal, ring II 3 200 / 2 000); the convoy is the
// hulls at the pier with the flag, counted by the piece over the whole fleet (no class, no generation); no convoy = nobody wakes, the ark still sails.
// EN, real clicks. The hive window itself is checked in pw54 (rest, card, convoy ring, sizes); this one checks the rules and the yards.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const page=process.argv[2]||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const TMP=require('os').tmpdir();
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{file:page}); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const toasts=()=>p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent.replace(/\s+/g,' ')).join(' | '));
  const ark=async()=>{ await U.clear(); await p.evaluate(()=>{ LNU.win='ark'; LNdraw() }); return win() };
  const yard=async()=>{ await U.clear(); await p.evaluate(()=>{ LNU.win='yard'; LNdraw() }); return win() };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.over) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await U.clear() };
  await U.start('en',11);
  await p.evaluate(()=>{ LNU.shiftStop=false; LNdraw() });

  // === the Night is dated; the Ark tab shows the hive
  await run(300);
  await p.evaluate(()=>{ if(!LN.night) revealNight(LN); LN.nightSeen=true; LNdraw() }); await U.clear();
  const r1=await ark();
  ok('no deposit button any more', !(await p.$('#ovl [data-act="arkplan"]')));
  ok('the hive at rest: WAKE and SLEEP ON, no card yet', /Wake/.test(r1)&&/Sleep on/i.test(r1)&&!(await p.$('#arkcard')), r1.slice(0,160));
  ok('the convoy ring has 36 cells', await p.evaluate(()=>document.querySelectorAll('#cvring .hx').length)===36);
  ok('no raw placeholders in the ark window', !/\{[a-z]\}/.test(r1), (r1.match(/.{0,40}\{[a-z]\}.{0,40}/)||[''])[0]);
  const price=await p.evaluate(()=>({food:arkRingPrice(1).food, metal:arkRingPrice(1).metal}));
  ok('ring I costs 1 200 food / 600 metal (ARK.md 2г)', price.food===1200&&price.metal===600, JSON.stringify(price));

  // === buy ring I by clicks, at full price
  await p.evaluate(()=>{ const E=LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; LNdraw() });
  await ark();
  await U.tap('#ovl .hold .hr[data-v="1"] .hx');
  await U.tap('#arkcard [data-act="arkbuy"]');
  const bought=await p.evaluate(()=>({rings:arkRings(LN), food:LN.earth.food, metal:LN.earth.metal, log:LN.log.filter(e=>e.code==='ark_bought').length}));
  ok('ring I bought: paid 1 200 food and 600 metal, log line', bought.rings===1&&bought.food===9e4-1200&&bought.metal===9e4-600&&bought.log===1, JSON.stringify(bought));
  await ark();
  await U.tap('#ovl .hold .hr[data-v="2"] .hx');
  ok('ring II is the next, its owed price is ring II alone (3 200 food / 2 000 metal)', await p.evaluate(()=>{ const o=arkOwed(LN,2); return o.food===3200&&o.metal===2000 })&&await p.isVisible('#arkcard [data-act="arkbuy"][data-l="2"]'), JSON.stringify(await p.evaluate(()=>arkOwed(LN,2))));

  // === hulls at the pier: built, docked, not yet in the convoy
  const ids=await p.evaluate(()=>{ const G=LN, g=G.arkMark, made=[]; G.driveLvl=Math.max(G.driveLvl||0,G.arkMark); G.gen=G.driveLvl; ensureGen(G.gen); G.earth.people=Math.max(G.earth.people,400);
    const want={courier:3,hauler:2,freighter:1};
    Object.keys(want).forEach(function(c){ for(let i=0;i<want[c];i++){ const hi=hullAt(c,g); if(hi!==null&&buildShip(G,hi)==='ok'){ const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.pend=null; made.push(s.id) } } });
    return made });
  ok('six hulls built and docked at Earth', ids.length===6, JSON.stringify(ids));
  await p.waitForTimeout(100);
  const cv0=await p.evaluate(()=>arkConvoy(LN));
  ok('docked hulls are not in the convoy until the player sets them aside', cv0.have===0&&cv0.all>=6, JSON.stringify(cv0));

  // === the Yard: set one aside with a real click
  const yw=await yard();
  ok('reserve button on a docked hull in the Yard (on = set aside)', await p.evaluate(id=>!!document.querySelector('#ovl [data-act="reserve"][data-s="'+id+'"][data-on="1"]'),ids[0]));
  await U.tap('#ovl [data-act="reserve"][data-s="'+ids[0]+'"][data-on="1"]');
  const rs=await p.evaluate(id=>{ const s=shipById(LN,id); return {reserve:!!s.reserve, mode:s.mode} },ids[0]);
  ok('click sets the hull aside, and the convoy counts it', rs.reserve&&(await p.evaluate(()=>arkConvoy(LN).have))===1, JSON.stringify(rs));
  const yw2=await yard();
  ok('the set-aside hull is marked and its button flips to release', await p.evaluate(id=>!!document.querySelector('#ovl [data-act="reserve"][data-s="'+id+'"][data-on="0"]'),ids[0]), (yw2.match(/.{0,30}(convoy|Convoy|release|Release).{0,30}/)||[''])[0]);

  // === the rest of the pier into the convoy by the mouse: ring the convoy, ADD ALL
  await ark();
  await U.tap('#cvring .hx');
  await U.tap('#arkcard [data-act="allpier"]');
  const cv1=await p.evaluate(()=>arkConvoy(LN));
  ok('ADD ALL puts the hulls at the pier into the convoy (counted by the piece)', cv1.have>=6&&cv1.share>0&&cv1.share<=1, JSON.stringify({have:cv1.have,all:cv1.all,share:cv1.share}));
  await ark();
  ok('the convoy ring lights the convoy share', (await p.evaluate(()=>document.querySelectorAll('#cvring .hx.on').length))===cv1.lit, 'lit '+cv1.lit);

  // v4.31 (F-35): a mutinied hull at the pier still counts for the convoy
  const mut=await p.evaluate(id=>{ const before=arkConvoy(LN).have; const s=shipById(LN,id); s.mutiny=true; s.from=null; s.to=null; s.pend=null; const cv=arkConvoy(LN); LNdraw(); return {before, after:cv.have} },ids[1]);
  ok('a mutinied hull still counts for the convoy', mut.after===mut.before, JSON.stringify(mut));
  await p.evaluate(id=>{ shipById(LN,id).mutiny=false; LNdraw() },ids[1]);
  // v5.10 (replaces the removed «convoy generation = ark mark − 1»): no generation is asked — an old hull set aside counts like any other
  const oldHull=await p.evaluate(()=>{ const G=LN, hi=hullAt('courier',Math.max(0,G.gen-K.GEN_OVERLAP)); if(hi===null||buildShip(G,hi)!=='ok') return {made:false, why:buildShip(G,hi)}; const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.pend=null; const h0=arkConvoy(G).have; s.reserve=true; return {made:true, before:h0, after:arkConvoy(G).have} });
  ok('an older hull (the oldest the yards still build) set aside counts for the convoy (no generation asked, v5.10)', oldHull.made&&oldHull.after===oldHull.before+1, JSON.stringify(oldHull));

  // === the yards leave a set-aside hull alone
  await p.evaluate(id=>{ const G=LN; G.gen=Math.max(G.gen||0,G.arkMark+1); ensureGen(G.gen); G.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&s.id!==id&&!s.reserve){ s.from=null; s.to=null } }); LNdraw() },ids[0]);
  await run(15);
  const alive=await p.evaluate(id=>{ const s=shipById(LN,id); return {mode:s.mode, reserve:!!s.reserve, from:s.from} },ids[0]);
  ok('after 15 years the set-aside hull is still at the pier', alive.mode==='idle'&&alive.reserve&&!alive.from, JSON.stringify(alive));
  const pid=await p.evaluate(()=>Object.keys(LN.colonies)[0]||null);
  if(pid){ const r=await p.evaluate(pid=>orderFor(LN,pid,'courier'),pid); await run(3);
    const took=await p.evaluate(id=>{ const s=shipById(LN,id); return {from:s.from, pend:!!s.pend, reserve:!!s.reserve, mode:s.mode} },ids[0]);
    ok('v4.34: an order for a line does not take the set-aside hull (order ok, hull still in the convoy at the pier)', r==='ok'&&!took.from&&!took.pend&&took.reserve&&took.mode==='idle', JSON.stringify({r,took}));
    const rel=await p.evaluate(a=>{ const r=setLine(LN,a.id,a.pid,'earth'); const s=shipById(LN,a.id); return {r:r, reserve:!!s.reserve} },{id:ids[0],pid});
    ok('a hand-given line takes the hull out of the convoy', rel.r==='ok'&&!rel.reserve, JSON.stringify(rel)); }

  // === the advisor lists worlds only (Nikita 15.10)
  ok('advisor lists worlds only (Nikita 15.10)', await p.evaluate(()=>LNI.adv().every(r=>!!planet(r[3]))), JSON.stringify(await p.evaluate(()=>LNI.adv().map(r=>r[1]))));

  // === v5.10: the ark sails with nobody in the convoy, and nobody wakes (ARK.md 2г: «без конвоя никто не проснётся»)
  await p.evaluate(()=>{ LN.ships.forEach(function(s){ s.reserve=false }); LN.driveLvl=LN.arkMark; LN.gen=LN.arkMark; ensureGen(LN.gen); LN.night=LN.day+2; LN.nightSeen=true; LNU.paused=false; LNdraw() });
  for(let i=0;i<12&&!(await p.evaluate(()=>LN.over));i++){ await run(1); await p.waitForTimeout(60) }
  const end=await p.evaluate(()=>({over:LN.over, grounded:LN.grounded, boarded:LN.boarded, souls:LN.souls, have:arkConvoy(LN).have, sailed:LN.log.filter(e=>e.code==='ark_sailed').length}));
  ok('drive ready, ring paid, empty convoy: the ark sails, 0 wake, not grounded', end.over==='night'&&!end.grounded&&end.boarded>0&&end.souls===0&&end.have===0&&end.sailed===1, JSON.stringify(end));
  await p.waitForTimeout(200);
  const ov=await p.evaluate(()=>{ var e=document.getElementById('noteL'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('end screen: souls aboard, woke at the other end 0', /Souls aboard/.test(ov)&&/Woke at the other end/.test(ov), ov.slice(0,200));
  ok('no page errors (EN)', !p.errs.length, p.errs.join(' | '));

  // === strings on a second desk (v5.05: English only)
  const q=await UI.newPage(b,{file:page}); const V=UI.ui(q);
  await V.start('en',11);
  await q.evaluate(()=>{ const E=LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; LN.driveLvl=0; LN.gen=0; if(!LN.night) revealNight(LN); LN.nightSeen=true; LNdraw() });
  await V.clear(); await q.evaluate(()=>{ LNU.win='ark'; LNdraw() });
  await V.tap('#ovl .hold .hr[data-v="1"] .hx');
  const ru=await q.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  ok('strings: the ring card names the ring and its buy button', /Ring I/.test(ru)&&/Fill ring I/i.test(ru), ru.slice(0,200));
  ok('strings: no raw placeholders', !/\{[a-z]\}/.test(ru), (ru.match(/.{0,40}\{[a-z]\}.{0,40}/)||[''])[0]);
  ok('strings: no page errors (second desk)', q.errs.length===0, q.errs.join(' | '));
  await q.close(); await b.close();
}catch(e){ out.push('FAIL exception — '+String(e&&e.stack||e).slice(0,400)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log('pw38 '+(out.length-f)+'/'+out.length); process.exit(f?1:0);
})();
