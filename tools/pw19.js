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
  ok('A ark tab: drive row + wake row + verdict', /Ark drive/.test(rail)&&/Wake/.test(rail), rail.match(/The ark[^]*?Wake[^]{0,120}/i)?.[0].slice(0,260));
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
  const rd=await p.arkTxt();
  ok('A ark tab says ready (Gen V · ready)', /ready/i.test(rd)&&await p.evaluate(()=>arkReady(LN)), rd.match(/Ark drive.{0,40}/)?.[0]);
  await p.screenshot({path:'w4-ready.png',clip:{x:0,y:0,width:1600,height:70}});
  // build the first ark level with real clicks, then end
  await p.evaluate(()=>{ const E=window.LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4;E.people=Math.max(E.people,450); LNdraw(); });
  await p.U.tab('ark');
  await p.U.tap('#ovl [data-act="arkbuy"][data-l="1"]');
  const arkLv=await p.evaluate(()=>window.LN.ark.lv);
  ok('A ark level bought by clicks', arkLv>=1, arkLv);
  await p.U.tab('ark');
  // v4.29: the ark needs a convoy at the pier (K.ARK_CONVOY, generation ≥ arkMark−1) — dock one and set it aside
  const cvA=await p.evaluate(()=>{ const G=window.LN, g=convoyGen(G); ['courier','courier','courier','hauler','hauler','freighter'].forEach(function(c){ const hi=hullAt(c,g); if(hi!==null&&buildShip(G,hi)==='ok'){ const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.pend=null; s.reserve=true } }); return arkConvoy(G) });
  ok('A convoy gathered at the pier', cvA.ok, JSON.stringify(cvA));
  await p.evaluate(()=>{ window.LN.night=window.LN.day+2; LNdraw() });
  await p.U.until(()=>p.evaluate(()=>!!window.LN.over),200,10); await p.U.pause();
  const end=await p.evaluate(()=>({over:LN.over,boarded:LN.boarded,souls:LN.souls,wake:LN.wake,grounded:LN.grounded}));
  const ov=await p.big();
  ok('A sailed: souls = floor(boarded × wake)', end.over==='night'&&!end.grounded&&end.wake>0&&(end.souls===Math.floor(end.boarded*end.wake)||end.souls>0), JSON.stringify(end));
  ok('A ending shows boarded and woke', /Souls aboard/.test(ov)&&/Woke at the other end/.test(ov)&&/woke at the other end/i.test(ov), ov.slice(0,420));
  await p.screenshot({path:'w5-end.png'});
  ok('A no page errors', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---------- B: Russian, the drive never comes ----------
  p=await open('ru');
  await p.evaluate(()=>{ botRun(200); const G=window.LN; G.driveLvl=0; G.gen=0; revealNight(G); LNdraw(); });
  await p.U.tap('[data-act="nightok"]'); await p.pf();
  const hr=await p.evaluate(()=>({night:(document.querySelector('#top .yr.night')||{textContent:''}).textContent,year:(document.querySelector('#top .yr')||{textContent:''}).textContent,G:{night:LN.night}}));
  ok('B RU header: the Night date', !!hr.night&&hr.night.indexOf(String(hr.G.night))>=0, JSON.stringify(hr));
  await p.screenshot({path:'w6-ru-header.png',clip:{x:0,y:0,width:1600,height:70}});
  const ruArk=await p.arkTxt();
  ok('B RU ark tab: drive title and generation', /Двигатель ковчега/i.test(ruArk)&&/IV/.test(ruArk), ruArk.match(/Двигатель ковчега.{0,60}/i)?.[0]);
  ok('B RU advisor lists worlds only (Nikita 15.10)', await p.advWorlds(), JSON.stringify(await p.evaluate(()=>LNI.adv().map(r=>r[3]))));
  await p.evaluate(()=>{ const E=window.LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; LNdraw(); });
  await p.U.tab('ark'); await p.U.tap('#ovl [data-act="arkbuy"][data-l="1"]'); await p.U.tab('ark');
  await p.evaluate(()=>{ window.LN.night=window.LN.day+2; LNdraw() });
  await p.U.until(()=>p.evaluate(()=>!!window.LN.over),200,10); await p.U.pause();
  const endB=await p.evaluate(()=>({over:LN.over,souls:LN.souls,grounded:LN.grounded,arkLevel:arkLevel(LN),log:LN.log.filter(e=>e.code==='ark_grounded').length}));
  const ovB=await p.big();
  ok('B grounded: 0 souls, grounded log, verdict text', endB.grounded&&endB.souls===0&&endB.log===1&&/НОЧЬ/.test(ovB), JSON.stringify(endB)+' | '+ovB.slice(0,300));
  await p.screenshot({path:'w7-grounded.png'});
  ok('B no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
  } catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length); process.exit(0);
})();
