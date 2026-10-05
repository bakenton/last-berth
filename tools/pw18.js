// v3.9 personal files: voices in the journal, the window at the moments that matter, the portrait
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const CSS=fs.readFileSync('fonts-local.css','utf8');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:CSS}));
  await p.route('**/fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const pf=async()=>p.evaluate(()=>{const e=document.getElementById('pf'); if(!e) return null; const c=e.querySelector('canvas'); const ctx=c.getContext('2d'); const d=ctx.getImageData(0,0,64,64).data; let lit=0; for(let i=0;i<d.length;i+=4) if(d[i]>100) lit++; return {text:e.textContent.replace(/\s+/g,' ').trim().slice(0,160), lit}});
  const redraw=async()=>{ await tap('.tab[data-tab="worlds"]'); await tap('.tab[data-tab="earth"]'); await p.waitForTimeout(150) };
  await p.goto('file:///home/claude/ln/long-night.html'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ document.getElementById('seedin').value='519788167'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="ru"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false}); await p.addScriptTag({content:BOT});
  // play 300 years through the real clock in chunks so voiceWatch sees the log grow
  await tap('#b-auto');
  for(let i=0;i<6;i++){ await p.evaluate(()=>botRun(50)); await redraw(); const f=await pf(); if(f){ console.log('pf at', await p.evaluate(()=>window.LN.day), '|', f.text, '| lit px', f.lit); await p.screenshot({path:'v-pf-'+i+'.png'}); await tap('[data-act="pfok"]'); } }
  const vo=await p.evaluate(()=>window.LN.log.filter(e=>e.code==='voice').map(e=>e.day+' '+e.d.role+' '+e.d.name+' '+e.d.k));
  console.log('voice lines in 300y:', vo.length, vo.slice(0,8).join(' | '));
  console.log('journal vo rendered:', await p.evaluate(()=>document.querySelectorAll('#log .le.vo').length), '| sample:', await p.evaluate(()=>{const e=document.querySelector('#log .le.vo'); return e?e.textContent.replace(/\s+/g,' ').slice(0,140):null}));
  // the date
  await p.evaluate(()=>{ const G=window.LN; G.nightSeen=true; revealNight(G); }); await redraw();
  let f=await pf(); console.log('night_dated pf:', JSON.stringify(f)); await p.screenshot({path:'v-pf-night.png'}); if(f) await tap('[data-act="pfok"]');
  // last flight: a line that cannot come back
  await p.evaluate(()=>{ const G=window.LN; G.night=G.day+20; }); await redraw();
  const k=await p.evaluate(()=>{const G=window.LN; const fr=G.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); const w=Object.keys(G.colonies).find(k=>fr&&canReachSector(fr,planet(k).sec)); return {w,s:fr&&fr.id}});
  if(k.w){ await p.evaluate(x=>{ window.LN.earth.fuel=1000; },0); const bb=await p.locator('[data-p="'+k.w+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150);
    await p.evaluate(x=>{ setLine(window.LN,x.s,x.w,'earth'); LNdraw() },k); await p.waitForTimeout(150);   // v4.13: no Orders block — the line is set through the core
    f=await pf(); console.log('last_flight pf:', JSON.stringify(f)); await p.screenshot({path:'v-pf-last.png'}); if(f) await tap('[data-act="pfok"]'); }
  // the pier
  await p.evaluate(()=>{ const G=window.LN; G.night=G.day+26; tick(G); G.pauseNow=false; }); await redraw();
  f=await pf(); console.log('ark_closed pf:', JSON.stringify(f)); if(f) await tap('[data-act="pfok"]');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
})();
