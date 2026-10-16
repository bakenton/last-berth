// v4.6 — the line as a standing order: +/− counters, yards build and take idle hulls, renewal, retire to scrap, prologue via +
// v4.34 (Nikita, 14–15.10): the standing order is gone. + orders a new hull for this line (paid now); a free hull goes on the line by hand
// (Send here = setLine); take off = clearLine (the hull comes back free, nothing is scrapped or retired); nothing renews by itself.
// Checks rewritten for that; the v4.6 wording is kept where the mechanic still exists.
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
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await closePf() };
  const rail=async()=>await p.evaluate(()=>document.querySelector('#rail').textContent);
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{ LNU.shiftStop=false });
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  // 1. found, then the card shows the line block with three classes
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  await tap('[data-act="colonize"]'); await run(30); await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('colony founded', await p.evaluate(id=>!!LN.colonies[id],mine));
  ok('block present', /Planet work fleet/.test(await rail()));   // v4.20: the block is titled 'Line upkeep'
  ok('one class row at Generation I (only opened classes)', await p.evaluate(()=>document.querySelectorAll('#rail .so-row').length===1));
  ok('+ enabled for courier (v4.34: data-act=order)', await p.evaluate(()=>{ const bt=document.querySelector('[data-act="order"][data-c="courier"].plus'); return !!bt&&bt.getAttribute('aria-disabled')!=='true' }));
  // 2. v4.34: + never takes a free hull. It lays a new courier down for this line; the idle hull on the pier stays free
  const free0=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).map(s=>s.id));
  await tap('[data-act="order"][data-c="courier"].plus');
  await run(1);
  ok('order: a new hull is laid down for this line (yard_line logged, lineFor set)', await p.evaluate(id=>LN.log.some(l=>l.code==='yard_line')&&LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine));
  ok('no pier hull taken: the free hulls at Earth stay free', free0.length>0&&await p.evaluate(ids=>ids.every(id=>{ const s=shipById(LN,id); return !!s&&s.mode==='idle'&&!s.from&&!s.to }),free0), JSON.stringify(free0));
  ok('lineCount counts the hull being built', await p.evaluate(id=>lineCount(LN,id,'courier')===1,mine));
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('card: 1 in the yards', /1 in the yards/.test(await rail()));
  // 3. another order with no free hull: the yards lay one down when they can pay
  await p.evaluate(()=>{ LN.earth.metal=600; LN.earth.people=200; LN.earth.fuel=500; LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)) scrap(LN,s.id) }) });
  await tap('[data-act="order"][data-c="courier"].plus'); await run(1);
  ok('second order logged (yard_line twice)', await p.evaluate(()=>LN.log.filter(l=>l.code==='yard_line').length>=2));
  ok('a hull is building for the line', await p.evaluate(id=>LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine));
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('card: hulls in the yards for this line', /in the yards/.test(await rail()));
  await run(12);
  ok('finished hull sails the line', await p.evaluate(id=>lineCount(LN,id,'courier')===2&&LN.ships.filter(s=>s.from===id).length>=1,mine));
  ok('shift report counts yard builds', await p.evaluate(()=>(LN.stats.yardBuilt||0)>=1));
  // 4. v4.34: no metal — the order button is off and says why (data-why=cost); the a_yard_cost advice and the 'yards wait' line are gone
  await p.evaluate(()=>{ LN.earth.metal=10; LNU.tab='target'; LNdraw() });
  const why=await p.evaluate(()=>{ const b=document.querySelector('[data-act="order"][data-c="courier"].plus'); return b?{off:b.getAttribute('aria-disabled'),why:b.getAttribute('data-why')}:null });
  ok('order off without metal: aria-disabled and data-why=cost', why&&why.off==='true'&&why.why==='cost', JSON.stringify(why));
  ok('no a_yard_cost advice (v4.34: removed)', await p.evaluate(()=>!advice(LN).some(a=>a.code==='a_yard_cost')));
  // 5. v4.34: no − button. Take off the line: the hull comes back free, nothing is scrapped or retired
  await p.evaluate(()=>{ LN.earth.metal=600 });
  ok('no − button on the line (v4.34: want is gone)', await p.evaluate(()=>!document.querySelector('[data-act="want"]')));
  const hid=await p.evaluate(id=>{ const s=LN.ships.find(o=>o.from===id&&o.mode!=='dead'&&o.mode!=='building'); return s?s.id:null },mine);
  ok('a hull is on the line to take off', hid!==null, hid);
  if(hid!==null){
    await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
    await tap('#rail [data-act="unroute"][data-s="'+hid+'"]');
    ok('take off: the hull is off the line and not scrapped', await p.evaluate(id=>{ const s=shipById(LN,id); return !s.from&&!s.to&&s.mode!=='dead' },hid));
    await run(60);
    ok('…it is not scrapped and no line_retired is logged (v4.34)', await p.evaluate(id=>{ const s=shipById(LN,id); return s.mode!=='dead'&&!LN.log.some(l=>(l.code==='scrapped'||l.code==='line_retired')&&l.d&&l.d.n===id) },hid));
    ok('…and it is back at Earth, free, after 60 years (v4.34: returned, not retired)', await p.evaluate(id=>{ const s=shipById(LN,id); return s.mode==='idle'&&s.at==='earth'&&!s.from&&!s.to },hid));
  }
  // 6. v4.34: no renewal. Generation II opens while the line is piling: nothing is laid down for the line by itself
  await p.evaluate(id=>{ LN.gen=1; ensureGen(1); LN.driveLvl=1; LN.earth.metal=3000; LN.earth.fuel=2000; LN.earth.parts=500; LN.earth.people=300; LN.colonies[id].pop=70; LN.colonies[id].store.metal=9000; LN.reserves[id]=1e6 },mine);
  await run(80);
  ok('no yard_renew logged (v4.34: no renewal)', await p.evaluate(()=>!LN.log.some(l=>l.code==='yard_renew')));
  ok('no Generation II hull laid down for the line', await p.evaluate(id=>!LN.ships.some(s=>s.mode!=='dead'&&s.lineFor===id&&hullGen(s)>=1),mine), await p.evaluate(id=>LN.ships.filter(s=>s.mode!=='dead'&&s.lineFor===id).map(s=>s.id+':'+hullGen(s)+':'+s.mode).join(' '),mine));
  // 7. v4.34: no renewal switch on the line at any generation (setRenew removed)
  await p.evaluate(()=>{ window.__g=LN.gen; LN.gen=Math.max(LN.gen||0,2); ensureGen(LN.gen); LNU.tab='target'; LNdraw() });
  ok('no renew switch at Generation III (v4.34)', await p.evaluate(()=>!document.querySelector('[data-act="renew"]')));
  await p.evaluate(()=>{ LN.gen=window.__g; LNdraw() });
  // 8. evacuation: the free hull goes; afterwards nothing is laid down for the evacuated world
  await p.evaluate(id=>{ LN.earth.people=300; const free=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); if(!free){ buildShip(LN,0); const n=LN.ships[LN.ships.length-1]; n.mode='idle'; n.t=0 } LNdraw() },mine);
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  await p.evaluate(id=>{ const free=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); LNU.pickShip=free.id; abandon(LN,free.id,id); LNdraw() },mine);
  await run(20);
  ok('after evacuation nothing is still being laid down for the world (v4.34: no order to close; weak check, see report)', await p.evaluate(id=>!LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine));
  // 9. v4.34: a free hull sent by hand (Send here = setLine) puts it on the line; no counter, no order
  const mine2=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[1].id);
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LN.earth.metal=500; buildShip(LN,0); const n=LN.ships[LN.ships.length-1]; n.mode='idle'; n.t=0; setLine(LN,n.id,id,'earth') },mine2);
  ok('manual line: the hull is on the line (lineCount 1), nothing ordered for it', await p.evaluate(id=>lineCount(LN,id,'courier')===1&&!LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine2));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  // 10. RU card + prologue pulse target exists
  const q=await b.newPage({viewport:{width:1600,height:1000}}); q.errs=[]; q.on('pageerror',e=>q.errs.push(String(e)));
  await q.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  await q.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await q.waitForTimeout(300);
  await q.click('[data-lang="ru"]'); await q.click('[data-act="oskip"]'); await q.click('[data-act="prologue"]'); await q.waitForTimeout(200);
  const mineRu=await q.evaluate(()=>LNU.pro.w.mine);
  await q.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mineRu);
  await q.evaluate(()=>{ const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); colonize(LN,s.id,LNU.pro.w.mine,26,0); for(let i=0;i<40;i++){ tick(LN); LN.pauseNow=false } LNdraw(); LNU.sel=LNU.pro.w.mine; LNU.tab='target'; LNdraw() });
  for(let i=0;i<6&&await q.isVisible('#pf');i++) await q.click('[data-act="pfok"]');
  const ru=await q.evaluate(()=>document.querySelector('#rail').textContent);
  ok('RU block', /Рабочий флот планеты/.test(ru), ru.match(/Рабочий флот[^\n]{0,120}/)?.[0]);   // v4.20: RU block title is 'Автоподдержание линии'
  ok('prologue task says press Send here (v4.34, t1)', await q.evaluate(()=>/нажми «Отправить сюда» у свободного/.test(document.body.textContent)));
  for(let i=0;i<6&&await q.$('[data-act="callok"]');i++){ await q.click('[data-act="callok"]'); await q.waitForTimeout(80) }
  await q.click('[data-act="assign"]'); await q.evaluate(()=>{ for(let i=0;i<2;i++){ tick(LN); LN.pauseNow=false } LNdraw() });   // v4.34: the prologue line step is Send here, not +
  ok('prologue: Send here puts the free hull on the line', await q.evaluate(()=>LN.ships.some(s=>s.from===LNU.pro.w.mine)));
  await q.screenshot({path:'line-ru.png'});
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
