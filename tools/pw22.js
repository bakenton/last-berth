// v4.2 — the clock, hull prices, mutiny (v4.35: скорости в шапке, мятежный корабль — на верфи, ряд .pc.mut; советник — только по мирам)
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,260):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  await U.start('en',309573272); await p.addScriptTag({content:BOT});
  // 1. speed buttons and the clock
  const spd=await p.evaluate(()=>[...document.querySelectorAll('#top [data-act="spd"][data-v]:not([data-v="0"])')].map(e=>e.dataset.v+':'+e.textContent).join(' '));
  ok('speed buttons 1/2/4/10', spd==='1:1× 2:2× 4:4× 10:10×', spd);
  ok('default speed 2×', await p.evaluate(()=>LNU.speed===2));
  await U.speed(1); const y0=await p.evaluate(()=>LN.day); await p.waitForTimeout(3100); await U.pause();
  const y1=await p.evaluate(()=>LN.day);
  ok('1× is about a year per 1.5 s', y1-y0>=1&&y1-y0<=3, (y1-y0)+' years in 3.1 s');
  // 2. v4.30 (Nikita, 11.10): the journal panel is gone — its checks went with it (pw39 checks it is absent)
  await p.evaluate(()=>botRun(300)); await p.evaluate(()=>LNdraw());
  // 3. hull prices (gen IV freighter must be under 5k metal)
  const price=await p.evaluate(()=>{ ensureGen(3); const h=HULLS.find(h=>h.key==='freighter'&&h.gen===3); return {metal:h.metal,parts:h.parts,cap:h.cap} });
  ok('gen IV freighter costs about 4.4k metal / 3.3k parts', price.metal<5000&&price.parts>3000, JSON.stringify(price));
  // 4. mutiny: date the Night close, keep lines running, watch crews come home
  await p.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.night=G.day+220; G.nightSeen=true; G.earth.food=1e5; G.earth.metal=1e5; G.earth.fuel=1e5; LNdraw() });
  const before=await p.evaluate(()=>LN.ships.filter(s=>s.from&&s.to&&s.mode!=='dead').length);
  const mut=await p.evaluate(()=>{ const G=LN; let first=null; for(let i=0;i<200&&!G.over;i++){ tick(G); G.pauseNow=false; const m=G.log.find(e=>e.code==='mutiny'); if(m&&first===null) first=G.night-m.day; }
    return {first, n:G.stats.mutinies, home:G.ships.filter(s=>s.mutiny&&s.mode==='idle'&&s.at==='earth').length, lined:G.ships.filter(s=>s.from&&s.to&&s.mode!=='dead').length, far:G.log.filter(e=>e.code==='mutiny'&&e.d.at==='far').length, earth:G.log.filter(e=>e.code==='mutiny'&&e.d.at==='earth').length} });
  ok('crews mutiny inside the last ~200 years and come home', mut.n>0&&mut.home>0&&mut.lined<before&&mut.first<=220, JSON.stringify(mut)+' lined before '+before);
  await p.evaluate(()=>LNdraw());
  // v4.35: мятежные корабли у причала — на верфи (вкладка Yard), ряд .pc.mut с отметкой
  await U.tab('yard');
  const rows=await p.evaluate(()=>document.querySelectorAll('#ovl .pc.mut').length);
  ok('Yard lists refusing hulls at the pier, marked', rows>0&&(await p.evaluate(()=>!!document.querySelector('#ovl .pc.mut em'))), rows);
  await p.screenshot({path:'y2-mutiny.png'});
  await U.tab('yard');
  // v4.35: советник — только миры (Nikita 15.10, «не понимаю, что делать»): вместо проверки a_mutiny — проверка нового правила
  ok('advisor lists worlds only (Nikita 15.10): every row points at a world', await p.evaluate(()=>LNI.adv().every(r=>!!planet(r[3]))), await p.evaluate(()=>JSON.stringify(LNI.adv().map(r=>r[3]))));
  // a mutinied hull refuses a line order with the right message
  const ref=await p.evaluate(()=>{ const G=LN; const s=G.ships.find(s=>s.mutiny&&s.mode==='idle'); const k=Object.keys(G.colonies).find(k=>!G.colonies[k].dark); return {r:setLine(G,s.id,k,'earth'), msg:null} });
  ok('a mutinied hull refuses orders', ref.r==='mutiny', JSON.stringify(ref));
  // the mutiny is checked in LN.log (the line text is no longer on the page)
  ok('mutiny is in the chronicle (LN.log) with the captain voice', await p.evaluate(()=>LN.log.some(e=>e.code==='mutiny'))&&await p.evaluate(()=>LN.log.some(e=>e.code==='voice'&&/^mutiny/.test(e.d.k))));
  const vo=await p.evaluate(()=>LN.log.filter(e=>e.code==='voice'&&/^mutiny/.test(e.d.k)).length);
  ok('captain voices logged for mutinies', vo>0, vo);
  // crews at home count for the ark
  const souls=await p.evaluate(()=>{ const G=LN; G.driveLvl=G.arkMark; G.gen=G.driveLvl; ensureGen(G.gen); G.earth.parts=1e5; G.earth.metal=1e5; G.earth.fuel=1e5; G.earth.food=1e5;
    // v4.24: buy level 1 to enable ark boarding
    arkBuy(G,1);
    return {souls:arkSouls(G), docked:crewDocked(G), people:Math.round(G.earth.people), arkLevel:arkLevel(G)} });
  ok('mutinied crews stand on the pier (crewDocked > 0, they board)', souls.docked>0&&souls.souls>0, JSON.stringify(souls));
  // scrap a mutinied hull by two clicks (the first arms it, the second confirms)
  const idm=await p.evaluate(()=>LN.ships.find(s=>s.mutiny&&s.mode==='idle').id);
  await U.tab('yard');
  await U.tap('#ovl [data-act="scrap"][data-s="'+idm+'"]'); await U.tap('#ovl [data-act="scrap"][data-s="'+idm+'"]');
  ok('scrap works on a mutinied hull', await p.evaluate(id=>LN.ships.find(s=>s.id===id).mode==='dead', idm));
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
  } catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length); process.exit(0);
})();
