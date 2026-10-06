// v4.6 — the line as a standing order: +/− counters, yards build and take idle hulls, renewal, retire to scrap, prologue via +
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
  // 1. found, then the card shows the standing-order block with three classes
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  await tap('[data-act="colonize"]'); await run(30); await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('colony founded', await p.evaluate(id=>!!LN.colonies[id],mine));
  ok('block present', /Planet work fleet/.test(await rail()));   // v4.20: the block is titled 'Line upkeep'
  ok('one class row at Generation I (only opened classes)', await p.evaluate(()=>document.querySelectorAll('#rail .so-row').length===1));
  ok('+ enabled for courier', await p.evaluate(()=>{ const bt=document.querySelector('[data-act="want"][data-c="courier"].plus'); return bt&&!bt.disabled }));
  // 2. + courier: the idle hull on the pier takes the line (no new build)
  const ships0=await p.evaluate(()=>LN.ships.length);
  await tap('[data-act="want"][data-c="courier"].plus');
  ok('want = 1', await p.evaluate(id=>lineWant(LN,id,'courier')===1,mine));
  await run(1);
  ok('idle hull took the line (yard_take)', await p.evaluate(()=>LN.log.some(l=>l.code==='yard_take')));
  ok('no new hull built', await p.evaluate(s0=>LN.ships.length===s0,ships0));
  ok('lineCount = 1', await p.evaluate(id=>lineCount(LN,id,'courier')===1,mine));
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('card: 1 on the line', /1 on the line/.test(await rail()), (await rail()).match(/Courier I[^\n]{0,80}/)?.[0]);
  // 3. + again with no idle hull: the yards lay one down when they can pay
  await p.evaluate(()=>{ LN.earth.metal=600; LN.earth.people=200; LN.earth.fuel=500; LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)) scrap(LN,s.id) }) });
  await tap('[data-act="want"][data-c="courier"].plus'); await run(1);
  ok('yard_line logged', await p.evaluate(()=>LN.log.some(l=>l.code==='yard_line')));
  ok('a hull is building for the line', await p.evaluate(id=>LN.ships.some(s=>s.mode==='building'&&s.lineFor===id),mine));
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('card: 1 in the yards', /1 in the yards/.test(await rail()));
  await run(12);
  ok('finished hull sails the line', await p.evaluate(id=>lineCount(LN,id,'courier')===2&&LN.ships.filter(s=>s.from===id).length>=1,mine));
  ok('shift report counts yard builds', await p.evaluate(()=>(LN.stats.yardBuilt||0)>=1));
  // 4. yards wait on metal: the card says so, the advisor says so
  await p.evaluate(()=>{ LN.earth.metal=10 });
  await tap('[data-act="want"][data-c="courier"].plus'); await run(2); await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('card: yards wait on metal', /yards wait: not enough metal/.test(await rail()));
  ok('advisor a_yard_cost', await p.evaluate(()=>advice(LN).some(a=>a.code==='a_yard_cost')));
  // 5. − : the newest wanted count drops, the oldest hull comes home to scrap
  await p.evaluate(()=>{ LN.earth.metal=600 });
  const want=await p.evaluate(id=>lineWant(LN,id,'courier'),mine);
  await tap('[data-act="want"][data-c="courier"]:not(.plus)'); await tap('[data-act="want"][data-c="courier"]:not(.plus)');
  ok('want down by 2', await p.evaluate(a=>lineWant(LN,a.id,'courier')===a.w-2,{id:mine,w:want}), await p.evaluate(id=>lineWant(LN,id,'courier'),mine));
  ok('a hull is marked to retire', await p.evaluate(id=>onLine(LN,id).some(s=>s.retire),mine));
  await run(60);
  ok('line_retired logged with metal back', await p.evaluate(()=>LN.log.some(l=>l.code==='line_retired'&&l.d.m>0)));
  ok('renewed stat', await p.evaluate(()=>(LN.stats.renewed||0)>=1));
  // 6. renewal: open Generation II while the line is piling → a successor is laid down, the old one retires on return
  await p.evaluate(id=>{ setWant(LN,id,'courier',1); setRenew(LN,id,true); LN.gen=1; ensureGen(1); LN.driveLvl=1; LN.earth.metal=3000; LN.earth.fuel=2000; LN.earth.parts=500; LN.earth.people=300; LN.colonies[id].pop=70; LN.colonies[id].store.metal=9000; LN.reserves[id]=1e6 },mine);
  await run(3);
  ok('yard_renew logged', await p.evaluate(()=>LN.log.some(l=>l.code==='yard_renew')), await p.evaluate(id=>JSON.stringify(lineOf(LN,id)),mine));
  await run(80);
  ok('Generation II hull on the line, old one gone', await p.evaluate(id=>{ const on=onLine(LN,id).filter(s=>!s.retire); return on.length>=1&&on.every(s=>hullGen(s)>=1) },mine), await p.evaluate(id=>onLine(LN,id).map(s=>s.id+':'+hullGen(s)+':'+s.mode+':'+(s.retire||'')).join(' '),mine));
  // 7. renewal off stays off
  await p.evaluate(()=>{ window.__g=LN.gen; LN.gen=Math.max(LN.gen||0,2); ensureGen(LN.gen); LNU.tab='target'; LNdraw() });   // v4.10+: renewal toggle shows from generation III
  await tap('[data-act="renew"]'); ok('renew toggled off', await p.evaluate(id=>lineOf(LN,id).renew===false,mine));
  await p.evaluate(()=>{ LN.gen=window.__g; LNdraw() });
  // 8. evacuation closes the order
  await p.evaluate(id=>{ LN.earth.people=300; const free=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); if(!free){ buildShip(LN,0); const n=LN.ships[LN.ships.length-1]; n.mode='idle'; n.t=0 } LNdraw() },mine);
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  const before=await p.evaluate(id=>!!lineOf(LN,id),mine);
  await p.evaluate(id=>{ const free=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); LNU.pickShip=free.id; abandon(LN,free.id,id); LNdraw() },mine);
  ok('evacuation closes the standing order', before&&await p.evaluate(id=>!lineOf(LN,id),mine));
  // 9. manual assignment moves the counters
  const mine2=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[1].id);
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LN.earth.metal=500; buildShip(LN,0); const n=LN.ships[LN.ships.length-1]; n.mode='idle'; n.t=0; setLine(LN,n.id,id,'earth') },mine2);
  ok('manual line bumps the counter to 1', await p.evaluate(id=>lineWant(LN,id,'courier')===1,mine2));
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
  ok('prologue task says press +', await q.evaluate(()=>/нажми \+ у курьера/.test(document.body.textContent)));
  for(let i=0;i<6&&await q.$('[data-act="callok"]');i++){ await q.click('[data-act="callok"]'); await q.waitForTimeout(80) }
  await q.click('[data-act="want"][data-c="courier"].plus'); await q.evaluate(()=>{ for(let i=0;i<2;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  ok('prologue: + puts the hull on the line', await q.evaluate(()=>LN.ships.some(s=>s.from===LNU.pro.w.mine)));
  await q.screenshot({path:'line-ru.png'});
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
