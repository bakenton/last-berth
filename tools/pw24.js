// v4.4 — extraction kits, demand-driven feeding, no settler fields, JSON run log, ark two marks above
// v4.35: панель мира — окно мира (#ovl .win, открывается мышью), советник — строки (LNI.adv), вкладка Worlds — #side
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ let b=null; try{
  b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  await U.start('en',309573272);
  // текст окна мира (открытого мышью) — «панель» старой рейки
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const showWorld=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false } LNdraw() },n); await U.clear() };
  // 1. the Found block: no settler / ration inputs, preview names the party
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await showWorld(mine);
  ok('no settler input', await p.evaluate(()=>document.querySelectorAll('#ovl input').length===0));
  ok('no ration input', await p.evaluate(()=>document.querySelectorAll('#ovl input[type="number"]').length===0));
  const prev=await win(); ok('preview says the party', /\d+ (people|settlers)/.test(prev), prev.match(/Settlers.{0,40}/)?.[0]);
  await U.tap('[data-act="send"][data-p="'+mine+'"]');
  const party=await p.evaluate(()=>LN.ships.find(s=>s.job==='colonize').cargo.people);
  const cap=await p.evaluate(a=>Math.min(popCap(planet(a.id)),70,Math.floor(LN.earth.people+a.party-K.EARTH_KEEP-K.FOUND_KEEP)),{id:mine,party});   // v4.7: the party leaves 50 hands at home
  ok('founding party = min(world, hold, people−50)', party===cap, party+' vs '+cap);
  ok('action logged people', await p.evaluate(()=>LN.actions.some(a=>a.k==='colonize'&&a.d.people>0)));
  // 2. gate closed before Generation III
  await run(40); await showWorld(mine);
  ok('colony founded', await p.evaluate(id=>!!LN.colonies[id],mine));
  // v4.35 (код: machines() — до Gen III блок техники не показан, «только шум»): подсказки про гейт в окне нет — вопрос в отчёте
  ok('machines block hidden before Gen III (v4.35 code)', !/Order tier/.test(await win()), (await win()).slice(0,200));
  ok('no kit order button before Gen III', !(await p.evaluate(()=>!!document.querySelector('#ovl [data-act="kit"]'))));
  ok('canKit = kitgate', await p.evaluate(id=>canKit(LN,id)==='kitgate',mine));
  // 3. open the gate, give resources, put a courier on the line, order a kit: it does not fit a courier
  await p.evaluate(id=>{ LN.driveLvl=2; LN.gen=2; ensureGen(2); LN.earth.metal=5000; LN.earth.parts=2000; LN.earth.fuel=3000; LN.earth.people=300;
    const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); setLine(LN,s.id,id,'earth'); LNdraw() },mine);   // v4.34: no renewal — setRenew is gone, the yards lay down nothing by themselves: the courier that carries the kit
  await run(3); await showWorld(mine);
  ok('order button enabled', await p.evaluate(()=>{ const bt=document.querySelector('#ovl [data-act="kit"]'); return !!bt&&bt.getAttribute('aria-disabled')!=='true' }));
  const wtxt=await win();
  ok('weight line names 190 and hold 70', /Needs a hold of 190 on the line — the biggest is 70\./.test(wtxt), wtxt.match(/Needs a hold[^.]*\./)?.[0]);
  const m0=await p.evaluate(()=>LN.earth.metal);
  await U.tap('#ovl [data-act="kit"]');
  ok('kit ordered: metal charged 100', await p.evaluate(m0=>Math.round(m0-LN.earth.metal)===100,m0), await p.evaluate(()=>LN.earth.metal));
  ok('kit on the pier', await p.evaluate(id=>LN.colonies[id].kit&&LN.colonies[id].kit.tier===1,mine));
  // v4.30: the journal is gone (Nikita, 11.10); the chronicle entry is checked in LN.log, its wording is not on the page any more
  ok('log kit_ordered (LN.log)', await p.evaluate(()=>LN.log.some(l=>l.code==='kit_ordered')));
  await showWorld(mine);
  ok('panel: kit will never fit a courier', /kit weighs 190; the biggest hold on this line is 70/.test(await win()), (await win()).slice(0,300));   // v4.35: текст «never fit» сменился на «kit weighs 190; the biggest hold … is 70» (та же причина)
  await run(60);
  ok('advisor a_kithold: the advisor names this world', await p.evaluate(id=>LNI.adv().some(r=>r[3]===id),mine), JSON.stringify(await p.evaluate(()=>LNI.adv().map(r=>r[1]))));
  ok('kit still on the pier after 60 years (courier too small)', await p.evaluate(id=>!!LN.colonies[id].kit,mine));
  // 4. a hauler joins the line: the kit rides out, the world gets tier I, fuel comes on the line
  await p.evaluate(id=>{ const h=HULLS.findIndex(h=>h.key==='hauler'&&h.gen===2); LN.earth.metal=9000; buildShip(LN,h); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.t=0; s.at='earth'; setLine(LN,s.id,id,'earth'); LNdraw() },mine);
  await run(2);
  ok('kit loaded on the hauler', await p.evaluate(id=>{ const c=LN.colonies[id]; return !c.kit&&!!c.kitShip },mine));
  ok('log kit_loaded', await p.evaluate(()=>LN.log.some(l=>l.code==='kit_loaded')));
  await run(40);
  ok('tier I built', await p.evaluate(id=>LN.colonies[id].tier===1,mine));
  // v4.30: the journal is gone; the build is checked in LN.log, the quiet settlement-head voice as a log voice (its card is #pfL.low)
  ok('log kit_built ×1.6 (LN.log)', await p.evaluate(()=>LN.log.some(l=>l.code==='kit_built')));
  ok('voice from the settlement head in the chronicle (LN.log)', await p.evaluate(()=>LN.log.some(l=>l.code==='voice'&&l.d.role==='role_head'&&/^kit_built/.test(l.d.k))));
  ok('output multiplied ×1.6', await p.evaluate(id=>{ const c=LN.colonies[id], q=planet(id); return Math.abs(lineRate(LN,id).makes-c.pop*q.rich*K.PROD*1.6)<1e-6 },mine));
  ok('stockyard bottomless', await p.evaluate(id=>storeCap(LN.colonies[id])===Infinity,mine));
  await run(60);
  ok('fuel delivered by the line', await p.evaluate(id=>LN.log.some(l=>l.code==='dropped'&&l.d.p===id&&l.d.u>0),mine), await p.evaluate(id=>LN.log.filter(l=>l.code==='dropped'&&l.d.p===id).map(l=>l.d.u).join(','),mine));
  // v4.35 (по макету): подписи миров без иконок; людей показывает подсказка #tip при наведении
  await U.closeWin(); await p.evaluate(()=>LNdraw());
  { const pt=await U.point(mine); if(pt){ await p.mouse.move(pt.x,pt.y); await p.waitForTimeout(150) } }
  ok('hover tip on a settled world shows its people (#tip)', await p.evaluate(id=>{ const t=document.getElementById('tip'); return t.className==='on'&&[...t.querySelectorAll('em')].some(e=>e.textContent.trim()===String(Math.floor(LN.colonies[id].pop))) },mine), await p.evaluate(()=>document.getElementById('tip').textContent.slice(0,120)));
  await U.tab('worlds');
  await showWorld(mine);
  ok('world window shows the tier: TIER I · RUNNING (v4.35: no ⚙I in the Worlds list, on purpose)', /TIER I · RUNNING/i.test(await win()), (await win()).match(/Machines.{0,60}/)?.[0]);
  await U.tab('worlds');
  await showWorld(mine);
  ok('world window shows the next tier: Tier II: x → y /yr (v4.35: no ×1.6)', /Tier II: [\d.]+ → [\d.]+ \/yr/.test(await win()), (await win()).match(/Tier II.{0,50}/)?.[0]);
  // 5. no fuel: after 15 years the machines stand; advisor speaks; fuel returns → running again
  await p.evaluate(id=>{ LN.colonies[id].store.fuel=0; LN.earth.fuel=0; LN.ships.forEach(s=>{ if(s.mode==='transit') s.cargo.fuel=0 }) },mine);
  await run(20);
  ok('kit_starved logged', await p.evaluate(()=>LN.log.some(l=>l.code==='kit_starved')));
  ok('multiplier off while starved', await p.evaluate(id=>rateMult(LN.colonies[id])===1,mine));
  ok('advisor a_kitfuel: the advisor names this world', await p.evaluate(id=>LNI.adv().some(r=>r[3]===id),mine));
  await p.evaluate(id=>{ LN.reserves[id]=1e6; LNdraw() },mine);   // v4.17: a spent seam shows only the evacuation button, so give the world a seam to read the kit panel
  await showWorld(mine);
  ok('panel says the machines stand', /The machines stand/.test(await win()), (await win()).match(/[^.]*machines[^.]*/)?.[0]);
  await p.evaluate(id=>{ LN.colonies[id].store.fuel=500 },mine); await run(2);
  ok('kit_running after fuel', await p.evaluate(()=>LN.log.some(l=>l.code==='kit_running')));
  // 6. tiermax + pending guards
  ok('canKit pending while another kit is ordered', await p.evaluate(id=>{ LN.earth.metal=9000; LN.earth.parts=5000; orderKit(LN,id); return canKit(LN,id)==='kitpending' },mine));
  ok('canKit tiermax at 4', await p.evaluate(id=>{ const c=LN.colonies[id]; c.kit=null; c.tier=4; return canKit(LN,id)==='tiermax' },mine));
  await p.evaluate(id=>{ LN.colonies[id].tier=1 },mine);
  // 7. the ark drive: two marks above the one held on the day of the date; 3300 years
  await p.evaluate(()=>{ LN.driveLvl=4; LN.gen=4; ensureGen(4); revealNight(LN); LN.nightSeen=true; LNdraw() });
  ok('arkMark = driveLvl+2', await p.evaluate(()=>LN.arkMark===6));
  ok('Night in 3300 years', await p.evaluate(()=>LN.night-LN.day===3300));
  await U.clear();
  // 8. JSON run log
  const j=await p.evaluate(()=>exportLog(LN));
  let J=null; try{ J=JSON.parse(j) }catch(e){}
  ok('run log is JSON', !!J);
  ok('JSON has chart with tiers, actions, snaps, fleet, night', !!(J&&J.chart&&J.chart.some(c=>c.colony&&c.colony.tier>0)&&J.actions.length&&J.fleet.length&&J.night&&J.night.year));
  ok('JSON action kit recorded', !!(J&&J.actions.some(a=>a.k==='kit')));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  // 9. RU
  const q=await UI.newPage(b); const V=UI.ui(q); await V.start('ru',309573272);
  const mineRu=await q.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await q.evaluate(id=>{ LN.driveLvl=2; LN.gen=2; ensureGen(2); LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:2,fuelOut:0}; LNdraw() },mineRu);
  await V.openWorld(mineRu); await q.evaluate(()=>LNdraw());
  const ru=await q.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  ok('RU kit block', /Техника/.test(ru)&&/ЯРУС/.test(ru)&&/Заказать ярус III/.test(ru), ru.match(/Техника.{0,80}/)?.[0]);   // v4.35: блок «Техника», «ЯРУС II · РАБОТАЕТ», «Заказать ярус III»
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  finally{ if(b) await b.close().catch(()=>{}) }   // v4.32: a failed run used to leave the browser open
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
