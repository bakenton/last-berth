// v3.8 prologue stages 3-5: build a courier, settle the well and the works, take the desk
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const CSS=fs.readFileSync('fonts-local.css','utf8');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:CSS}));
  await p.route('**/fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const task=async()=>p.evaluate(()=>((document.querySelector('#task .tk span:last-child')||{}).textContent||'')+' · '+((document.querySelector('#task .tt')||{}).textContent||''));
  const stage=async()=>p.evaluate(()=>parseInt((document.querySelector('#task .tk span:last-child')||{textContent:'9'}).textContent));
  const run=async(years)=>{ await tap('[data-spd="10"]'); await p.waitForTimeout(years*160); await tap('#b-pause') };
  const clickWorld=async pid=>{ const bb=await p.locator('[data-p="'+pid+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150) };
  const dismiss=async()=>{ while(await p.evaluate(()=>!!document.getElementById('callout'))){ await tap('[data-act="callok"]'); } };
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="ru"]'); await tap('[data-act="oskip"]'); await tap('[data-act="prologue"]'); await dismiss(); await tap('#b-auto');
  // fast path through stages 0-2 (already verified in pw16)
  const w=await p.evaluate(()=>{ const W={}; PLANETS.forEach(p=>{ if(p.sec!==0) return; if(!W[p.kind]||p.dist<W[p.kind].dist) W[p.kind]=p }); return {mine:W.mine.id,farm:W.farm.id,well:W.well.id,works:W.works.id} });
  await clickWorld(w.mine); await tap('[data-act="colonize"]'); await run(40);
  await clickWorld(w.mine); await tap('[data-act="want"][data-c="courier"].plus'); await run(45);
  console.log('after 0-2:', await task()); await dismiss();
  // stage 2: farm
  await clickWorld(w.farm); await tap('[data-act="colonize"]'); await run(40);
  await clickWorld(w.farm); await tap('[data-act="want"][data-c="courier"].plus'); await run(2);
  console.log('S3:', await task(), '| dock visible:', await p.evaluate(()=>!document.getElementById('dock').hidden), '| res:', await p.evaluate(()=>[...document.querySelectorAll('#res .k')].map(e=>e.textContent.trim()).join('/')));
  await p.screenshot({path:'q5-s3.png'}); await dismiss(); await p.screenshot({path:'q5b-s3.png'});
  console.log('rails at S3:', await p.evaluate(()=>[...document.querySelectorAll('.rail')].map(e=>e.textContent.trim().slice(0,20)).join('|')));
  // build a courier from the dock, wait, settle the well
  const free0=await p.evaluate(()=>window.LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).length);
  await p.evaluate(()=>{ window.LN.earth.metal=Math.max(window.LN.earth.metal,300); window.LN.earth.fuel=Math.max(window.LN.earth.fuel,300) });
  await tap('#dock .dbtn'); await p.waitForTimeout(150); console.log('free before', free0, '| ships:', await p.evaluate(()=>window.LN.ships.length), '|', await task());
  await run(12); console.log('after build:', await task());
  await clickWorld(w.well); await tap('[data-act="colonize"]'); await run(50);
  await clickWorld(w.well); await tap('[data-act="want"][data-c="courier"].plus'); await run(2);
  console.log('S4:', await task()); await dismiss();
  await p.evaluate(()=>{ window.LN.earth.metal=Math.max(window.LN.earth.metal,300); window.LN.earth.fuel=Math.max(window.LN.earth.fuel,300); window.LN.earth.people=Math.max(window.LN.earth.people,80) });
  const fr=await p.evaluate(()=>window.LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).length);
  if(!fr){ await tap('#dock .dbtn'); await run(12); }
  await clickWorld(w.works); await tap('[data-act="colonize"]'); await run(60);
  await clickWorld(w.works); await tap('[data-act="want"][data-c="courier"].plus'); await run(2);
  console.log('S5:', await task(), '| worlds on map:', await p.evaluate(()=>document.querySelectorAll('#map .pnode').length), '| hdr cells:', await p.evaluate(()=>[...document.querySelectorAll('#hdr .hcell')].filter(c=>!c.hidden).length));
  await p.screenshot({path:'q6-s5.png'}); await dismiss();
  await tap('[data-act="prodone"]'); await p.waitForTimeout(200);
  console.log('after desk:', await p.evaluate(()=>({adv:!!document.querySelector('#advhead'), callout:(document.getElementById('callout')||{}).textContent, earthBlocks:document.querySelectorAll('#railbody .blk').length, safe:window.LN.safe})));
  await p.screenshot({path:'q7-full.png'});
  console.log('errors:', errs.length?errs:'none');
  await b.close();
})();
