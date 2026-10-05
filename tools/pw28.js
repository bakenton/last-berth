// v4.8 — one founding party at a time, few-hands hint, idle old hulls scrapped, line block shows surface stock and hulls, HTML cache, people constants
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
  // 1. people constants
  ok('hands 2.0 at year 0, 1.09 at 8400 (with a full larder)', await p.evaluate(()=>{ const f0=LN.earth.food; LN.earth.food=1e6; const a=handsRate(LN)/fedMult(LN); LN.day=8400; const b=handsRate(LN)/fedMult(LN); LN.day=0; LN.earth.food=f0; return Math.abs(a-2)<1e-9&&Math.abs(b-2/1.84)<1e-9 }));
  // 2. one founding party at a time
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(id=>{ LN.earth.people=300; LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  await tap('[data-act="colonize"]');
  ok('first party sails', await p.evaluate(()=>LN.ships.some(s=>s.job==='colonize')));
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('card says a party is on its way', /already on its way/.test(await rail()));
  ok('no second Found button', !(await p.isVisible('[data-act="colonize"]')));
  ok('colonize() returns enroute', await p.evaluate(id=>{ const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); return colonize(LN,s.id,id,26,0)==='enroute' },mine));
  // 3. too few hands: button disabled with a hint
  const mine2=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[1].id);
  await p.evaluate(id=>{ LN.earth.people=40; LNU.sel=id; LNU.tab='target'; LNdraw() },mine2);
  ok('few-hands hint and disabled button', /Not enough hands at home/.test(await rail())&&await p.evaluate(()=>document.querySelector('[data-act="colonize"]').getAttribute('aria-disabled')==='true'));
  // 4. idle old hull scrapped after IDLE_SCRAP years once a newer generation is open
  await p.evaluate(()=>{ LN.earth.people=300; LN.gen=1; ensureGen(1); LN.driveLvl=1; });
  const oldId=await p.evaluate(()=>{ const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); return s?s.id:null });
  ok('an idle Gen I hull exists', oldId!==null);
  await run(12);
  ok('yard_scrap logged and the hull is gone', await p.evaluate(id=>LN.log.some(l=>l.code==='yard_scrap'&&l.d.n===id)&&shipById(LN,id).mode==='dead',oldId));
  // 5. line block: surface stock and hulls list
  await run(30); await p.evaluate(id=>{ LN.colonies[id].store.metal=1234; LN.earth.metal=900; LN.earth.parts=500; LN.earth.fuel=800; setWant(LN,id,'courier',1); LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  await run(2); await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  const r=await rail();
  ok('surface stock shown (big status)', /On the surface\d{3,5}People\d+/.test(r), r.match(/On the surface[^\n]{0,60}/)?.[0]);
  ok('hull row shown', /Hulls working this line/.test(r)&&/Hull \d+ · Courier/.test(r), r.slice(r.indexOf('Hulls working'),r.indexOf('Hulls working')+200));
  // 6. HTML cache: a second draw with nothing changed rewrites nothing
  const same=await p.evaluate(()=>{ LNdraw(); const el=document.querySelector('#railbody'); const a=el.innerHTML; el.dataset.mark='x'; LNdraw(); return el.dataset.mark==='x'&&a===el.innerHTML });
  ok('rail not rewritten when unchanged', same);
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  const q=await b.newPage({viewport:{width:1600,height:1000}}); q.errs=[]; q.on('pageerror',e=>q.errs.push(String(e)));
  await q.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  await q.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await q.waitForTimeout(300);
  await q.click('[data-lang="ru"]'); await q.click('[data-act="oskip"]'); await q.click('[data-act="gskip"]'); await q.waitForTimeout(150);
  const mru=await q.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await q.evaluate(id=>{ LNU.shiftStop=false; LN.earth.people=300; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); colonize(LN,s.id,id,26,0); LNU.sel=id; LNU.tab='target'; LNdraw() },mru);
  ok('RU enroute text', /уже летит с партией основания/.test(await q.evaluate(()=>document.querySelector('#rail').textContent)));
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
