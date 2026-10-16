// v4.29 — the ark is paid for in one go (no deposits), needs a convoy at the pier, hulls can be set aside for it.
// EN and RU, real clicks; yards must not break up or take a reserved hull; no convoy = no departure.
// v4.35: вкладка Ark (#ovl: уровни [data-act="arkbuy"][data-l], конвой #convoy); резерв — верфь (Yard, [data-act="reserve"][data-s][data-on]);
// строки советника — только о мирах (Nikita 15.10), поэтому проверка «советник о конвое» заменена на правило «советник — миры».
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

  // === the Night is dated; the Ark tab shows the ark block
  await run(300);
  await p.evaluate(()=>{ if(!LN.night) revealNight(LN); LN.nightSeen=true; LNdraw() }); await U.clear();
  const r1=await ark();
  ok('no deposit button any more', !(await p.$('#ovl [data-act="arkplan"]')));
  ok('buy button, no discount', /Buy level 1|buy/i.test(r1)&&!/% off/.test(r1)&&await p.evaluate(()=>!!document.querySelector('#ovl [data-act="arkbuy"][data-l="1"]')), r1.slice(0,160));
  ok('convoy block: "Convoy · 3 · 2 · 1", generation III+, six empty slots', /Convoy · 3 · 2 · 1/.test(r1)&&/GEN III\+/.test(r1)&&(r1.match(/EMPTY/g)||[]).length===6, (r1.match(/Convoy · 3[^A-Z]{0,40}|EMPTY/)||[''])[0]);   // v4.35: слоты конвоя вместо «0 / 3»
  ok('no raw placeholders in the ark window', !/\{[a-z]\}/.test(r1), (r1.match(/.{0,40}\{[a-z]\}.{0,40}/)||[''])[0]);
  const price=await p.evaluate(()=>({m:LN.earth.metal, p:arkPrice(1).metal, cg:convoyGen(LN), mark:LN.arkMark}));
  ok('level 1 price is ×1.5 (metal 2250)', price.p===2250, JSON.stringify(price));
  ok('convoy generation = ark mark − 1', price.cg===price.mark-1, JSON.stringify(price));

  // === buy level 1 by clicks, at full price
  await p.evaluate(()=>{ const E=LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; LNdraw() });
  await ark();
  await U.tap('#ovl [data-act="arkbuy"][data-l="1"]');
  const bought=await p.evaluate(()=>({lv:arkLevel(LN), metal:LN.earth.metal, paid:LN.ark.paid.metal, log:LN.log.filter(e=>e.code==='ark_bought').length}));
  ok('level 1 bought: paid 2250 metal, log line', bought.lv===1&&bought.paid===2250&&bought.metal===9e4-2250&&bought.log===1, JSON.stringify(bought));
  const r2=await ark();
  ok('level 2 is the next, and its owed price is the difference (3 750)', await p.evaluate(()=>!!document.querySelector('#ovl [data-act="arkbuy"][data-l="2"]'))&&/3 750/.test(r2), (r2.match(/.{0,30}3 750.{0,10}/)||[''])[0]);   // v4.35: «Still to pay» — текст цены уровня
  const owed=await p.evaluate(()=>arkOwed(LN,2).metal);
  ok('owed to level 2 = 6000 − 2250', owed===3750, owed);

  // === hulls at the pier: set one aside for the ark with a real click (Yard)
  const ids=await p.evaluate(()=>{ const G=LN, g=convoyGen(G), made=[]; G.driveLvl=Math.max(G.driveLvl||0,G.arkMark); G.gen=G.driveLvl; ensureGen(G.gen); G.earth.people=Math.max(G.earth.people,400);
    const want={courier:3,hauler:2,freighter:1};
    Object.keys(want).forEach(function(c){ for(let i=0;i<want[c];i++){ const hi=hullAt(c,g); if(hi!==null&&buildShip(G,hi)==='ok'){ const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.pend=null; made.push(s.id) } } });
    return made });
  ok('six hulls of the convoy generation built and docked', ids.length===6, JSON.stringify(ids));
  await p.waitForTimeout(100);
  const cv1=await p.evaluate(()=>arkConvoy(LN));
  ok('convoy counts docked hulls (3/2/1) and is gathered', cv1.ok&&cv1.have.courier>=3&&cv1.have.hauler>=2&&cv1.have.freighter>=1, JSON.stringify(cv1));
  const r3=await ark();
  ok('ark window: the convoy slots are all filled', (r3.match(/EMPTY/g)||[]).length===0, (r3.match(/Convoy · 3[^A-Z]{0,40}/)||[''])[0]);   // v4.35: «gathered» — слоты заполнены
  const yw=await yard();
  ok('reserve button on a docked hull in the Yard (on = set aside)', await p.evaluate(id=>!!document.querySelector('#ovl [data-act="reserve"][data-s="'+id+'"][data-on="1"]'),ids[0]));
  await U.tap('#ovl [data-act="reserve"][data-s="'+ids[0]+'"][data-on="1"]');
  const rs=await p.evaluate(id=>{ const s=shipById(LN,id); return {reserve:!!s.reserve, mode:s.mode} },ids[0]);
  ok('click sets the hull aside', rs.reserve, JSON.stringify(rs));
  const yw2=await yard();
  ok('the reserved hull is marked and its button flips to release', /RESERVE|reserve|Reserve/i.test(yw2)&&await p.evaluate(id=>!!document.querySelector('#ovl [data-act="reserve"][data-s="'+id+'"][data-on="0"]'),ids[0]), (yw2.match(/.{0,30}reserve.{0,30}/i)||[''])[0]);
  // v4.31 (F-35): a mutinied hull at the pier still counts for the convoy
  const mut=await p.evaluate(id=>{ const s=shipById(LN,id); s.mutiny=true; s.from=null; s.to=null; s.pend=null; const cv=arkConvoy(LN); LNdraw(); return {ok:cv.ok, hull:cv.have.courier>=0} },ids[1]);
  ok('a mutinied hull counts for the convoy', mut.ok, JSON.stringify(mut));
  await p.evaluate(id=>{ shipById(LN,id).mutiny=false; LNdraw() },ids[1]);

  // === the yards leave a reserved hull alone
  await p.evaluate(id=>{ const G=LN; G.gen=Math.max(G.gen||0,convoyGen(G)+1); ensureGen(G.gen); G.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&s.id!==id&&!s.reserve){ s.from=null; s.to=null } }); LNdraw() },ids[0]);
  await run(15);
  const alive=await p.evaluate(id=>{ const s=shipById(LN,id); return {mode:s.mode, reserve:!!s.reserve, from:s.from} },ids[0]);
  ok('after 15 years the reserved hull is still at the pier', alive.mode==='idle'&&alive.reserve&&!alive.from, JSON.stringify(alive));
  const pid=await p.evaluate(()=>Object.keys(LN.colonies)[0]||null);
  if(pid){ const r=await p.evaluate(pid=>orderFor(LN,pid,'courier'),pid); await run(3);
    const took=await p.evaluate(id=>{ const s=shipById(LN,id); return {from:s.from, pend:!!s.pend, reserve:!!s.reserve, mode:s.mode} },ids[0]);
    ok('v4.34: an order for a line does not take the reserved hull (order ok, hull still reserved at the pier)', r==='ok'&&!took.from&&!took.pend&&took.reserve&&took.mode==='idle', JSON.stringify({r,took}));
    const rel=await p.evaluate(a=>{ const r=setLine(LN,a.id,a.pid,'earth'); const s=shipById(LN,a.id); return {r:r, reserve:!!s.reserve} },{id:ids[0],pid});
    ok('a hand-given line releases the reserve', rel.r==='ok'&&!rel.reserve, JSON.stringify(rel)); }

  // === the advisor lists worlds only (Nikita 15.10)
  ok('advisor lists worlds only (Nikita 15.10)', await p.evaluate(()=>LNI.adv().every(r=>!!planet(r[3]))), JSON.stringify(await p.evaluate(()=>LNI.adv().map(r=>r[1]))));

  // === no convoy on the day: the ark stays, its own verdict and chronicle line
  await p.evaluate(()=>{ LN.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&HULLS[s.hull].key==='freighter'&&!s.reserve) scrap(LN,s.id) }); LN.driveLvl=LN.arkMark; LN.gen=LN.arkMark; ensureGen(LN.gen); LN.night=LN.day+2; LN.nightSeen=true; LNU.paused=false; LNdraw() });
  for(let i=0;i<12&&!(await p.evaluate(()=>LN.over));i++){ await run(1); await p.waitForTimeout(60) }
  const end=await p.evaluate(()=>({over:LN.over, grounded:LN.grounded, why:LN.groundedWhy, souls:LN.souls, log:LN.log.filter(e=>e.code==='ark_noconvoy').length, lv:arkLevel(LN)}));
  ok('drive ready, level paid, convoy short → grounded by convoy, 0 souls, chronicle line', end.over==='night'&&end.grounded&&end.why==='convoy'&&end.souls===0&&end.log===1, JSON.stringify(end));
  await p.waitForTimeout(200);
  const ov=await p.evaluate(()=>{ var e=document.getElementById('noteL'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('verdict: the convoy never gathered, convoy generation named (v4.36: N-13 b)', /convoy of generation [IVX]+ is short of/.test(ov)&&/no convoy/.test(ov), ov.slice(0,200));
  ok('no page errors (EN)', !p.errs.length, p.errs.join(' | '));

  // === RU strings (own desk)
  const q=await UI.newPage(b,{file:page}); const V=UI.ui(q);
  await V.start('ru',11);
  await q.evaluate(()=>{ const E=LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; LN.driveLvl=0; LN.gen=0; if(!LN.night) revealNight(LN); LN.nightSeen=true; LNdraw() });
  await V.clear(); await q.evaluate(()=>{ LNU.win='ark'; LNdraw() });
  const ru=await q.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  ok('RU: convoy row and buy button', /Конвой/.test(ru)&&/Купить/.test(ru), ru.slice(0,160));
  ok('RU: no raw placeholders', !/\{[a-z]\}/.test(ru), (ru.match(/.{0,40}\{[a-z]\}.{0,40}/)||[''])[0]);
  ok('RU: no page errors', q.errs.length===0, q.errs.join(' | '));
  await q.close(); await b.close();
}catch(e){ out.push('FAIL exception — '+String(e&&e.stack||e).slice(0,400)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log('pw38 '+(out.length-f)+'/'+out.length); process.exit(f?1:0);
})();
