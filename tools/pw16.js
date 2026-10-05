// v3.8 prologue walkthrough as a first-time player, real mouse, RU. Time advances through the real clock at 8x.
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
  const st=async()=>p.evaluate(()=>{const U=window.U||null; return null});
  const state=async()=>p.evaluate(()=>({stage:(window.LN&&document.querySelector('#task .tk span:last-child')||{}).textContent, task:(document.querySelector('#task .tt')||{}).textContent, year:window.LN.day,
     worlds:[...document.querySelectorAll('#map .pnode')].length, res:[...document.querySelectorAll('#res .rcell .k')].map(e=>e.textContent.trim()).join('/'),
     hdr:[...document.querySelectorAll('#hdr .hcell')].filter(c=>!c.hidden).length, dock:!document.getElementById('dock').hidden, tabs:[...document.querySelectorAll('.tab')].filter(t=>!t.hidden).length,
     callout:(document.getElementById('callout')||{}).textContent, rails:[...document.querySelectorAll('.rail')].map(e=>e.id||e.dataset.act||e.className).join(','), ring:!!document.querySelector('.railring')}));
  const waitStage=async(n,limit)=>{ const t0=Date.now(); while(Date.now()-t0<limit){ const s=await p.evaluate(()=>document.querySelector('#task .tk span:last-child').textContent); if(s.startsWith(n+' ')) return true; await p.waitForTimeout(300) } return false };
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="ru"]'); await tap('[data-act="oskip"]'); await p.waitForTimeout(200);
  console.log('start screen:', (await p.textContent('#introbox')).replace(/\s+/g,' ').slice(0,120));
  await p.screenshot({path:'q0-start.png'});
  await tap('[data-act="prologue"]'); await p.waitForTimeout(200);
  console.log('S0:', JSON.stringify(await state()));
  await p.screenshot({path:'q1-s0.png'});
  await tap('[data-act="callok"]');
  // rails: the Worlds tab is hidden; the dock hidden; clicking Earth on the map does nothing
  const mine=await p.evaluate(()=>document.querySelector('#map .pnode').dataset.p);
  let bb=await p.locator('[data-p="'+mine+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(200);
  console.log('target opened:', await p.evaluate(()=>document.querySelector('.tab.on').dataset.tab), '| preview:', await p.textContent('#prev'));
  console.log('preview (party decided by the game):', await p.textContent('#prev'));   // v4.4: no settler field
  await p.screenshot({path:'q2-target.png'});
  await tap('[data-act="colonize"]'); await p.waitForTimeout(200);
  console.log('after found:', JSON.stringify(await state()));
  // rails block a scrap/route? try clicking a tab that is hidden: worlds — cannot; try the pause pulse
  await tap('#b-auto'); // HOLD off so the clock runs through arrivals
  await tap('[data-spd="10"]');
  console.log('stage 2 reached:', await waitStage(2,40000), JSON.stringify(await state()));
  await tap('#b-pause'); await p.screenshot({path:'q3-s1.png'});
  // open the line: click mine, route
  bb=await p.locator('[data-p="'+mine+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(200);
  console.log('standing order card:', (await p.textContent('.so-row')||'').slice(0,80));   // v4.13: no Orders block, no #prev on a settled world
  await tap('[data-act="want"][data-c="courier"].plus'); await p.waitForTimeout(200);
  console.log('after line:', JSON.stringify(await state()));
  await tap('[data-spd="10"]');
  console.log('stage 3 reached:', await waitStage(3,60000), JSON.stringify(await state()));
  await tap('#b-pause'); await p.screenshot({path:'q4-s2.png'});
  console.log('errors:', errs.length?errs:'none');
  await b.close();
})();
