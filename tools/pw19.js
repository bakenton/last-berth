// v4.0 — two dates: header, night modal, ark block, advisor, ark-drive log, sailed ending (wake %), grounded ending
// v4.35: шапка — год и дата Ночи (макет ui-v7: YEAR · NIGHT), дата привода — во вкладке Ark (строка «Ark drive», READY);
// советник — только миры (Nikita 15.10); окна — #noteL (Ночь, финал), личное дело — #pfL.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const out=[]; const ok=(name,cond,extra)=>{ out.push((cond?'PASS ':'FAIL ')+name+(extra!==undefined?' — '+extra:'')) };
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  async function open(lang){
    const p=await UI.newPage(b); const U=UI.ui(p);
    await U.start(lang,309573272); await p.addScriptTag({content:BOT});
    p.U=U;
    p.pf=async()=>{ await U.closeBig(); if(!(await p.isVisible('#pfL .pfbox'))) return null; return (await p.textContent('#pfL')).replace(/\s+/g,' ') };
    p.big=async()=>p.evaluate(()=>document.getElementById('noteL').textContent.replace(/\s+/g,' '));
    p.arkTxt=async()=>{ await U.tab('ark'); const t=(await p.textContent('#ovl')).replace(/\s+/g,' '); await U.tab('ark'); return t };
    p.advWorlds=async()=>p.evaluate(()=>LNI.adv().every(r=>!!planet(r[3])));
    return p;
  }
  // ---------- A: English, the drive gets there ----------
  let p=await open('en');
  ok('A night cell hidden before the date', await p.evaluate(()=>!document.querySelector('#top .yr.night')));
  await p.evaluate(()=>{ botRun(430); const G=window.LN; if(!G.night) revealNight(G); LNdraw(); });
  const modal=await p.big();
  // v4.35: текст ночи назвал поколение двигателя, фраза про «два года» из нарратива ушла (срок — во вкладке Ark)
  ok('A night modal names the ark drive (v4.36: a row under N-09)', /Ark drive\s*gen (IV|V|VI)\+/.test(modal), modal.slice(0,240));
  await p.screenshot({path:'w1-night.png'});
  await p.U.tap('[data-act="nightok"]'); await p.pf();
  const hd=await p.evaluate(()=>({year:+((document.querySelector('#top .yr b')||{}).textContent||'NaN'),night:+((document.querySelector('#top .yr.night b')||{}).textContent||'NaN'),G:{day:LN.day,night:LN.night}}));
  ok('A header shows the year and the Night (макет v7)', hd.year===hd.G.day && hd.night===hd.G.night, JSON.stringify(hd));
  await p.screenshot({path:'w2-header.png',clip:{x:0,y:0,width:1600,height:70}});
  const rail=await p.arkTxt();
  // v5.10: the hive has no drive row — WAKE, SLEEP ON and the verdict; with no ring the verdict says so
  ok('A ark tab: WAKE, SLEEP ON and the verdict (no ring yet)', /Wake/.test(rail)&&/Sleep on/i.test(rail)&&/No ring of pods is filled/.test(rail), rail.match(/The ark[^]*?Wake[^]{0,160}/i)?.[0].slice(0,260));
  await p.U.tab('ark'); await p.locator('#ovl .win').first().screenshot({path:'w3-arkblock.png'}).catch(()=>{}); await p.U.tab('ark');
  ok('A advisor lists worlds only (Nikita 15.10): every row points at a world', await p.advWorlds(), JSON.stringify(await p.evaluate(()=>LNI.adv().map(r=>r[3]))));
  // forecast vs a real run: keep playing until the mark lands or 1400 years pass
  const race=await p.evaluate(()=>{ const G=window.LN; const smp=[]; let hit=null;
    for(let i=0;i<1400&&!G.over&&!hit;i++){ botRun(1); /* v4.10: 900 → 1400 */ if(i%100===0){ const f=driveForecast(G,G.arkMark); smp.push(G.day+':'+(f.st==='ok'?f.y:f.st+(f.n?'('+f.r+'/'+f.n+')':''))) } if(arkReady(G)) hit=G.day }
    return {hit,smp,lvl:G.driveLvl,mark:G.arkMark,over:G.over}; });
  ok('A bot reaches the ark drive by itself', !!race.hit, JSON.stringify(race));
  if(!race.hit){ await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>planet(k).kind==='works')||Object.keys(G.colonies)[0]; while(!arkReady(G)) driveDone(G,k); }); }
  await p.pf(); await p.evaluate(()=>LNdraw());
  // v4.30: the journal is gone; the commissioning is checked in LN.log (its wording is no longer on the page)
  ok('A log: ark drive commissioned (LN.log ark_drive)', await p.evaluate(()=>LN.log.some(e=>e.code==='ark_drive')));
  ok('A drive ready in the core (arkReady)', await p.evaluate(()=>arkReady(LN)));
  await p.screenshot({path:'w4-ready.png',clip:{x:0,y:0,width:1600,height:70}});
  // v5.10: the ring I of pods is bought by clicks — press its cell, then FILL RING I on the card
  const rd=await p.evaluate(()=>{ const E=window.LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4;E.people=Math.max(E.people,450); LNdraw(); return 1 });
  await p.U.tab('ark');
  await p.U.tap('#ovl .hold .hr[data-v="1"] .hx'); await p.U.tap('#arkcard [data-act="arkbuy"]');
  const arkLv=await p.evaluate(()=>window.LN.ark.rings);
  ok('A ring I bought by clicks', arkLv>=1, arkLv);
  const rd2=await p.evaluate(()=>(document.getElementById('arkfate')||{innerText:''}).innerText.replace(/\s+/g,' '));   // the tab stays open here: read it, do not toggle it
  // v5.10: with no convoy the verdict says nobody would wake (not the drive line); the drive's readiness is in the core
  ok('A ark tab: the drive is ready (core), the verdict says the ark sails, nobody wakes yet', await p.evaluate(()=>arkReady(LN))&&/The ark sails/i.test(rd2)&&/Nobody would wake/i.test(rd2), rd2);
  await p.U.tab('ark');
  // v5.10: nobody wakes without a convoy; the convoy is the hulls set aside at the pier — dock six and set them aside
  const cvA=await p.evaluate(()=>{ const G=window.LN; ['courier','courier','courier','hauler','hauler','freighter'].forEach(function(c){ const hi=hullAt(c,G.arkMark); if(hi!==null&&buildShip(G,hi)==='ok'){ const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.pend=null; s.reserve=true } }); return arkConvoy(G) });
  ok('A convoy gathered at the pier (six hulls set aside)', cvA.have>=6&&cvA.share>0, JSON.stringify({have:cvA.have,all:cvA.all,share:cvA.share}));
  await p.evaluate(()=>{ window.LN.night=window.LN.day+2; LNdraw() });
  await p.U.until(()=>p.evaluate(()=>!!window.LN.over),200,10); await p.U.pause();
  const end=await p.evaluate(()=>({over:LN.over,boarded:LN.boarded,souls:LN.souls,wake:LN.wake,grounded:LN.grounded,capsuled:LN.capsuled,convoy:LN.convoy}));
  const ov=await p.big();
  ok('A sailed: woke = floor(min(aboard, pods) x convoy share)', end.over==='night'&&!end.grounded&&end.boarded>0&&end.souls>0&&end.souls===Math.floor(Math.min(end.boarded,end.capsuled)*end.convoy.have/end.convoy.all+1e-9), JSON.stringify(end));
  ok('A ending shows boarded and woke', /Souls aboard/.test(ov)&&/Woke at the other end/.test(ov)&&/woke at the other end/i.test(ov), ov.slice(0,420));
  await p.screenshot({path:'w5-end.png'});
  ok('A no page errors', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---------- B: the drive never comes (v5.05: the game is English only; the Russian run is gone) ----------
  p=await open('en');
  await p.evaluate(()=>{ botRun(200); const G=window.LN; G.driveLvl=0; G.gen=0; revealNight(G); LNdraw(); });
  await p.U.tap('[data-act="nightok"]'); await p.pf();
  const hr=await p.evaluate(()=>({night:(document.querySelector('#top .yr.night')||{textContent:''}).textContent,year:(document.querySelector('#top .yr')||{textContent:''}).textContent,G:{night:LN.night}}));
  ok('B header: the Night date', !!hr.night&&hr.night.indexOf(String(hr.G.night))>=0, JSON.stringify(hr));
  await p.screenshot({path:'w6-ru-header.png',clip:{x:0,y:0,width:1600,height:70}});
  const ruArk=await p.arkTxt();
  ok('B ark tab: no ring yet — the verdict says so', /No ring of pods is filled/.test(ruArk), ruArk.match(/No ring.{0,40}/)?.[0]);
  ok('B advisor lists worlds only (Nikita 15.10)', await p.advWorlds(), JSON.stringify(await p.evaluate(()=>LNI.adv().map(r=>r[3]))));
  await p.evaluate(()=>{ const E=window.LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; LNdraw(); });
  await p.U.tab('ark'); await p.U.tap('#ovl .hold .hr[data-v="1"] .hx'); await p.U.tap('#arkcard [data-act="arkbuy"]');
  const fateB=await p.evaluate(()=>(document.getElementById('arkfate')||{innerText:''}).innerText.replace(/\s+/g,' '));
  ok('B the verdict names the generation once a ring is paid (Gen IV)', /Gen IV/.test(fateB), fateB);
  await p.U.tab('ark');
  await p.evaluate(()=>{ window.LN.night=window.LN.day+2; LNdraw() });
  await p.U.until(()=>p.evaluate(()=>!!window.LN.over),200,10); await p.U.pause();
  const endB=await p.evaluate(()=>({over:LN.over,souls:LN.souls,grounded:LN.grounded,rings:arkRings(LN),log:LN.log.filter(e=>e.code==='ark_grounded').length}));
  const ovB=await p.big();
  ok('B grounded: 0 souls, grounded log, verdict text', endB.grounded&&endB.souls===0&&endB.log===1&&/The Night/.test(ovB)&&/The ark did not sail/.test(ovB), JSON.stringify(endB)+' | '+ovB.slice(0,300));
  await p.screenshot({path:'w7-grounded.png'});
  ok('B no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
  } catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length); process.exit(0);
})();
