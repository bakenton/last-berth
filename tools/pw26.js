// v4.6 — the line as a standing order: +/− counters, yards build and take idle hulls, renewal, retire to scrap
// v4.34 (Nikita, 14–15.10): the standing order is gone. + orders a new hull for this line (paid now); a free hull goes on the line by hand
// (Send here = setLine); take off = clearLine (the hull comes back free, nothing is scrapped or retired); nothing renews by itself.
// v4.35: карточка мира — окно мира (#ovl): блок «On this line», заказ — кнопки #ordblk [data-act="order"], снятие — [data-act="unroute"].
// Пролог (раздел 10 прежней версии) удалён вместе с ним; его проверка «Send here» — в smoke и разделе 9.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const showWorld=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await U.clear() };
  await U.start('en',309573272);
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  // 1. found, then the world window shows the line block with the order row
  await showWorld(mine);
  await U.tap('#ovl [data-act="send"][data-p="'+mine+'"]'); await run(30); await showWorld(mine);
  ok('colony founded', await p.evaluate(id=>!!LN.colonies[id],mine));
  ok('block present', /On this line/.test(await win()), (await win()).slice(0,200));
  ok('one class row at Generation I (only opened classes)', await p.evaluate(()=>document.querySelectorAll('#ordblk .oc').length===3), await p.evaluate(()=>document.querySelectorAll('#ordblk .oc').length));
  ok('order enabled for courier (v4.34: data-act=order)', await p.evaluate(()=>{ const bt=document.querySelector('#ovl [data-act="order"][data-c="courier"]'); return !!bt&&bt.getAttribute('aria-disabled')!=='true' }));
  // 2. v4.34: an order never takes a free hull. It lays a new courier down for this line; the idle hull on the pier stays free
  const free0=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).map(s=>s.id));
  await U.tap('#ovl [data-act="order"][data-p="'+mine+'"][data-c="courier"]');
  await run(1); await showWorld(mine);
  ok('order: a new hull is laid down for this line (yard_line logged, lineFor set)', await p.evaluate(id=>LN.log.some(l=>l.code==='yard_line')&&LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine));
  ok('no pier hull taken: the free hulls at Earth stay free', free0.length>0&&await p.evaluate(ids=>ids.every(id=>{ const s=shipById(LN,id); return !!s&&s.mode==='idle'&&!s.from&&!s.to }),free0), JSON.stringify(free0));
  ok('lineCount counts the hull being built', await p.evaluate(id=>lineCount(LN,id,'courier')===1,mine));
  ok('window: the hull in the yard is listed on the line', /Courier[^·]{0,20}in the yard/.test(await win()), (await win()).match(/in the yard[^T]{0,40}/)?.[0]);   // v4.35: строка линии «in the yard · N years → WORLD»
  // 3. another order with no free hull: the yards lay one down when they can pay
  await p.evaluate(()=>{ LN.earth.metal=600; LN.earth.people=200; LN.earth.fuel=500; LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)) scrap(LN,s.id) }) });
  await U.tap('#ovl [data-act="order"][data-p="'+mine+'"][data-c="courier"]'); await run(1); await showWorld(mine);
  ok('second order logged (yard_line twice)', await p.evaluate(()=>LN.log.filter(l=>l.code==='yard_line').length>=2));
  ok('a hull is building for the line', await p.evaluate(id=>LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine));
  await run(12); await showWorld(mine);
  ok('finished hull sails the line', await p.evaluate(id=>lineCount(LN,id,'courier')===2&&LN.ships.filter(s=>s.from===id).length>=1,mine));
  ok('shift report counts yard builds', await p.evaluate(()=>(LN.stats.yardBuilt||0)>=1));
  // 4. v4.34: no metal — the order button is off and says why (data-why=cost); the a_yard_cost advice is gone
  await p.evaluate(()=>{ LN.earth.metal=10; LNdraw() }); await showWorld(mine);
  const why=await p.evaluate(()=>{ const b=document.querySelector('#ovl [data-act="order"][data-c="courier"]'); return b?{off:b.getAttribute('aria-disabled'),why:b.getAttribute('data-why')}:null });
  ok('order off without metal: aria-disabled and data-why=short_metal (v4.35: shortWhy code)', why&&why.off==='true'&&why.why==='short_metal', JSON.stringify(why));
  ok('no a_yard_cost advice (v4.34: removed)', await p.evaluate(()=>!LNI.adv().some(r=>/yard cost/i.test(r[1]+r[2]))));
  // 5. v4.34: no − button. Take off the line: the hull comes back free, nothing is scrapped or retired
  await p.evaluate(()=>{ LN.earth.metal=600; LNdraw() });
  ok('no − button on the line (v4.34: want is gone)', await p.evaluate(()=>!document.querySelector('[data-act="want"]')));
  const hid=await p.evaluate(id=>{ const s=LN.ships.find(o=>o.from===id&&o.mode!=='dead'&&o.mode!=='building'); return s?s.id:null },mine);
  ok('a hull is on the line to take off', hid!==null, hid);
  if(hid!==null){
    await showWorld(mine);
    await U.tap('#ovl [data-act="unroute"][data-s="'+hid+'"]');
    ok('take off: the hull is off the line and not scrapped', await p.evaluate(id=>{ const s=shipById(LN,id); return !s.from&&!s.to&&s.mode!=='dead' },hid));
    await run(60);
    ok('…it is not scrapped and no line_retired is logged (v4.34)', await p.evaluate(id=>{ const s=shipById(LN,id); return s.mode!=='dead'&&!LN.log.some(l=>(l.code==='scrapped'||l.code==='line_retired')&&l.d&&l.d.n===id) },hid));
    ok('…and it is back at Earth, free, after 60 years (v4.34: returned, not retired)', await p.evaluate(id=>{ const s=shipById(LN,id); return s.mode==='idle'&&s.at==='earth'&&!s.from&&!s.to },hid));
  }
  // 6. v4.34: no renewal. Generation II opens while the line is piling: nothing is laid down for the line by itself
  await p.evaluate(id=>{ LN.gen=1; ensureGen(1); LN.driveLvl=1; LN.earth.metal=3000; LN.earth.fuel=2000; LN.earth.parts=500; LN.earth.people=300; LN.colonies[id].pop=70; LN.colonies[id].store.metal=9000; LN.reserves[id]=1e6 },mine);
  await run(80);
  ok('no yard_renew logged (v4.34: no renewal)', await p.evaluate(()=>!LN.log.some(l=>l.code==='yard_renew')));
  ok('no Generation II hull laid down for the line', await p.evaluate(id=>!LN.ships.some(s=>s.mode!=='dead'&&s.lineFor===id&&hullGen(s)>=1),mine), await p.evaluate(id=>LN.ships.filter(s=>s.mode!=='dead'&&s.lineFor===id).map(s=>s.id+':'+hullGen(s)+':'+s.mode).join(','),mine));
  // 7. v4.34: no renewal switch on the line at any generation (setRenew removed)
  await p.evaluate(()=>{ window.__g=LN.gen; LN.gen=Math.max(LN.gen||0,2); ensureGen(LN.gen); LNdraw() }); await showWorld(mine);
  ok('no renew switch at Generation III (v4.34)', await p.evaluate(()=>!document.querySelector('#ovl [data-act="renew"]')));
  await p.evaluate(()=>{ LN.gen=window.__g; LNdraw() });
  // 8. evacuation: the free hull goes; afterwards nothing is laid down for the evacuated world
  await p.evaluate(id=>{ LN.earth.people=300; const free=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); if(!free){ buildShip(LN,0); const n=LN.ships[LN.ships.length-1]; n.mode='idle'; n.t=0 } LNdraw() },mine);
  await p.evaluate(id=>{ const free=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); LNU.pickShip=free.id; abandon(LN,free.id,id); LNdraw() },mine);
  await run(20);
  ok('after evacuation nothing is still being laid down for the world (v4.34: no order to close; weak check, see report)', await p.evaluate(id=>!LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine));
  // 9. v4.34: a free hull sent by hand from the window (Assign = Send here) puts it on the line; no counter, no order
  const mine2=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[1].id);
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LN.earth.metal=500; buildShip(LN,0); const n=LN.ships[LN.ships.length-1]; n.mode='idle'; n.t=0; n.at='earth'; LNdraw() },mine2);
  await showWorld(mine2);
  await U.tap('#ovl #addblk [data-act="assign"]');
  ok('assign in the window puts a free hull on the line (v4.34: Send here)', await p.evaluate(id=>LN.ships.some(s=>s.from===id&&s.mode!=='dead'),mine2));
  ok('manual line: the hull is on the line (lineCount 1), nothing ordered for it', await p.evaluate(id=>lineCount(LN,id,'courier')===1&&!LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine2));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  // 10. RU: the same world window in Russian
  const q=await UI.newPage(b); const V=UI.ui(q); await V.start('ru',309573272);
  const mineRu=await q.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await q.evaluate(id=>{ LN.colonies[id]={pid:id,pop:30,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LNdraw() },mineRu);
  await V.openWorld(mineRu); await q.evaluate(()=>LNdraw());
  const ru=await q.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  ok('RU block of the line', /На этой линии/.test(ru), ru.match(/На этой линии.{0,60}/)?.[0]);
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.stack.split('\n').slice(0,2).join(' ')) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
