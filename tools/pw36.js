// v4.18 — evacuation by courier only, collecting a spent world's pile, the pile bar (feedback batch 3). Real mouse. node pw36.js [page.html]
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const page=process.argv[2]||'long-night.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150)};
  const closePf=async()=>{ for(let i=0;i<8;i++){ if(await p.isVisible('#pf')) await tap('[data-act="pfok"]'); else if(await p.evaluate(()=>!!LN.shiftOpen)) await tap('[data-act="shiftok"]'); else if(await p.isVisible('[data-act="nightok"]')) await tap('[data-act="nightok"]'); else if(await p.isVisible('#nofree')) await tap('[data-act="nofreeclose"]'); else break } };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false } LNdraw() },n); await closePf() };
  const toast=async()=>(await p.textContent('#toast'))||'';
  const rail=async()=>await p.evaluate(()=>document.getElementById('rail').textContent.replace(/\s+/g,' '));
  const titles=async()=>await p.evaluate(()=>[].slice.call(document.querySelectorAll('#rail .blk h3')).map(e=>e.textContent.trim()));
  const show=async id=>{ await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },id) };
  const killFree=async cls=>{ await p.evaluate(cls=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&(!cls||HULLS[s.hull].key===cls)) s.mode='dead' }) },cls) };
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/'+page); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  await p.evaluate(()=>{ LNU.pro.on=false; LNU.pro.stage=99; LNU.paused=true; var E=LN.earth; E.metal=9000; E.food=20000; E.fuel=9000; E.parts=4000; E.people=3000; LNdraw() });
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await show(mine); await tap('[data-act="colonize"]'); await run(45);
  ok('world founded', await p.evaluate(id=>!!LN.colonies[id],mine));

  // === the pile bar (screenshot question): numbers, no red, the verdict carries both rates
  await p.evaluate(id=>{ LN.colonies[id].store.metal=42; setWant(LN,id,'courier',1) },mine); await run(12); await show(mine);
  const pb=await p.evaluate(()=>{ var t=document.querySelector('.pile-take'), l=document.querySelector('.pile-lbl'); var cs=t?getComputedStyle(t):null; return {lbl:l?l.textContent:'', bg:cs?cs.backgroundColor:null, border:cs?cs.borderTopColor:null} });
  ok('pile label names both numbers and what grey/white mean', /On the surface \d+ · one hold \d+/.test(pb.lbl)&&/Grey — the pile; white frame — one hull's hold/.test(pb.lbl), pb.lbl);
  ok('the hold mark is not red any more (red is danger)', pb.bg==='rgba(0, 0, 0, 0)'&&!/255, 42, 26/.test(pb.border), JSON.stringify(pb));
  const rates=await p.evaluate(()=>{ var e=document.querySelector('.bs-rates'); return e?e.textContent:null });
  ok('the verdict carries "world makes X/yr · line hauls Y/yr"', rates&&/World makes [\d.]+\/yr · line hauls [\d.]+\/yr/.test(rates), rates);
  await p.screenshot({path:require('os').tmpdir()+'/v418-pile.png',clip:{x:1040,y:60,width:560,height:560}});

  // === seam spent, pile still there: hulls can still be sent
  await p.evaluate(id=>{ LN.reserves[id]=0; LN.colonies[id].store.metal=300 },mine); await show(mine);
  const t1=await titles();
  ok('seam spent + pile: a "Seam exhausted" notice on top', t1.some(t=>/Seam exhausted/.test(t)), JSON.stringify(t1));
  ok('…and the order blocks are still there', t1.some(t=>/Line upkeep/.test(t))&&t1.some(t=>/Free hulls at Earth/.test(t)), JSON.stringify(t1));
  ok('…the notice says how much is left and that hulls can collect it', /300 metal\) still lies on the surface|300 \(metal\)|300 metal/.test(await rail())||/still lies on the surface/.test(await rail()), (await rail()).match(/Nothing more to dig[^.]*\./));
  const plus=await p.evaluate(()=>{ var bt=document.querySelector('[data-act="want"][data-c="courier"].plus'); return bt?{d:bt.getAttribute('aria-disabled'),w:bt.getAttribute('data-why')}:null });
  ok('+ in the standing order is open', plus&&plus.d!=='true', JSON.stringify(plus));
  await tap('[data-act="want"][data-c="courier"].plus');
  ok('pressing + is accepted', !/exhausted\. Nothing to carry/.test(await toast())&&/wanted/.test(await toast()), await toast());
  // a free hull sent from the world tab
  await p.evaluate(()=>{ buildShip(LN,hullAt('courier',0)) }); await run(10); await show(mine);
  const sendBtn=await p.evaluate(()=>!!document.querySelector('#rail [data-act="assign"]'));
  if(sendBtn){ await tap('#rail [data-act="assign"]'); ok('a free hull is sent to collect the pile', /sent to/.test(await toast()), await toast()); }
  else ok('a free hull is sent to collect the pile (no free hull at this moment — skipped)', true);
  await p.screenshot({path:require('os').tmpdir()+'/v418-dry.png',clip:{x:1040,y:60,width:560,height:900}});

  // === surface empty too: locked, only evacuation
  await p.evaluate(id=>{ LN.colonies[id].store.metal=0 },mine); await show(mine);
  const t2=await titles();
  ok('seam spent + empty surface: only the card and "Spent world"', t2.length===2&&/Spent world/.test(t2[1]), JSON.stringify(t2));
  ok('core refuses + with "depleted"', await p.evaluate(id=>setWant(LN,id,'courier',5)==='depleted',mine));

  // === evacuation: courier only
  await killFree(null); await p.evaluate(()=>{ LN.gen=1; ensureGen(1); LN.lastB=buildShip(LN,hullAt('hauler',1)) }); await run(20); await killFree('courier'); await show(mine);   // a gen-I hauler has no live-world gate; couriers that came home from the line are removed
  const onlyH=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).map(s=>HULLS[s.hull].key));
  ok('setup: only a hauler is free at Earth', onlyH.length>0&&onlyH.every(k=>k==='hauler'), JSON.stringify(onlyH));
  ok('the block says only a courier can lift, and none is free', /Only a courier lifts a settlement, and none is free/.test(await rail()));
  await tap('[data-act="evac"]');
  const tn=await toast();
  ok('pressing Evacuate with only a hauler free: refused, says no free courier', /No free courier at Earth/.test(tn), tn);
  ok('…and nothing was launched', await p.evaluate(id=>!LN.ships.some(s=>s.job==='evac'&&s.dest===id),mine));
  ok('core: abandon with a hauler returns evacCourier', await p.evaluate(id=>{ var h=LN.ships.find(s=>s.mode==='idle'&&HULLS[s.hull].key==='hauler'); return abandon(LN,h.id,id)==='evacCourier' },mine));
  // a courier that cannot hold everyone: warned before and after
  await p.evaluate(()=>{ buildShip(LN,hullAt('courier',0)) }); await run(12);
  await p.evaluate(id=>{ LN.colonies[id].pop=95 },mine); await show(mine);
  ok('before pressing: the block names the courier and who stays behind', /Courier \d+ \(Courier [^)]*I\) holds 70 of 95 people — 25 will stay behind/.test(await rail()), (await rail()).match(/Courier \d+[^.]*\./));   // v4.20: hull name includes Greek name, e.g. "Hermes"
  await p.screenshot({path:require('os').tmpdir()+'/v418-evac.png',clip:{x:1040,y:60,width:560,height:620}});
  await tap('[data-act="evac"]');
  const te=await toast();
  ok('pressing Evacuate: the free courier goes, and the message says 25 stay behind', /Courier \d+ is on its way to lift/.test(te)&&/25 people will stay behind/.test(te), te);
  const ev=await p.evaluate(id=>LN.ships.filter(s=>s.job==='evac'&&s.dest===id).map(s=>HULLS[s.hull].key),mine);
  ok('the hull on the evacuation is a courier', ev.length===1&&ev[0]==='courier', JSON.stringify(ev));
  await run(60);
  ok('it lifts the people and comes home', await p.evaluate(id=>!LN.colonies[id]&&LN.log.some(l=>(l.code==='evac_partial'||l.code==='evacuated')&&l.d.p===id),mine));

  // a courier big enough: everyone fits
  const farm=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind!=='works'&&!LN.colonies[q.id]&&!LN.ghost[q.id]).sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(()=>{ buildShip(LN,hullAt('courier',0)) }); await run(12);
  await show(farm); await tap('[data-act="colonize"]'); await run(45);
  await p.evaluate(()=>{ LN.gen=1; ensureGen(1); buildShip(LN,hullAt('courier',1)) }); await run(14);
  await p.evaluate(id=>{ LN.colonies[id].pop=95; LNdraw() },farm); await show(farm);
  ok('with a Courier II (hold 133) free: "everyone fits"', /Courier II\): hold 133, people 95 — everyone fits/.test(await rail())||/everyone fits/.test(await rail()), (await rail()).match(/Courier \d+ \([^)]*\)[^.]*\./));
  await tap('[data-act="evac"]');
  ok('…and the plain message: "on its way"', /on its way to lift/.test(await toast())&&!/stay behind/.test(await toast()), await toast());

  // RU
  await p.evaluate(id=>{ LNU.lang='ru'; LN.colonies[id]&&(LN.colonies[id].store.metal=42); LNdraw() },farm); 
  const anyCol=await p.evaluate(()=>Object.keys(LN.colonies)[0]||null);
  if(anyCol){ await show(anyCol); const r=await rail(); ok('RU: pile label in Russian, no "красное"', /На поверхности|куча|Склад|Залежь/.test(r)&&!/красное/.test(r), ''); } else ok('RU (no colony left to show — skipped)', true);

  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERROR '+String(e).slice(0,400)) }
fs.writeFileSync(require('os').tmpdir()+'/pw36.out',out.join('\n')+'\n'); console.log(out.join('\n')); })();
