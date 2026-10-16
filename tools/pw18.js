// v3.9 personal files: voices in the journal, the window at the moments that matter, the portrait
// v4.35: личное дело — #pfL (полный экран: время стоит; карточка #pfL.low внизу: время идёт); журнала нет — голоса в LN.log
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  // личное дело: закрыть смену (если открыта) и прочитать карточку; read — текст и число «засвеченных» пикселей портрета
  const pf=async()=>{ await U.closeBig(); return p.evaluate(()=>{ const e=document.getElementById('pfL'); if(!e||!e.querySelector('.pfbox')) return null; const c=e.querySelector('canvas'); const ctx=c.getContext('2d'); const d=ctx.getImageData(0,0,64,64).data; let lit=0; for(let i=0;i<d.length;i+=4) if(d[i]>100) lit++; return {text:e.textContent.replace(/\s+/g,' ').trim().slice(0,160), lit} }) };
  const pfOk=async()=>{ for(let i=0;i<4&&await p.isVisible('#pfL [data-act="pfok"]');i++) await U.tap('#pfL [data-act="pfok"]') };
  const redraw=async()=>{ await p.evaluate(()=>LNdraw()) };
  await U.start('ru',519788167); await p.addScriptTag({content:BOT});
  // play 300 years through the real clock in chunks so voiceWatch sees the log grow
  await U.speed(10);
  // v4.30 (Nikita, 11.10): a crew voice that is not forced is a card at the foot of the chart (#pfL.low), no pause; count the cards on screen (quiet:true lines stay journal-only in voice())
  let lowSeen=0;
  for(let i=0;i<6;i++){ await p.evaluate(()=>botRun(50)); await redraw(); if(await p.isVisible('#pfL.low')) lowSeen++; const f=await pf(); if(f){ console.log('pf at', await p.evaluate(()=>window.LN.day), '|', f.text, '| lit px', f.lit); await p.screenshot({path:'v-pf-'+i+'.png'}); await pfOk() } }
  await U.pause();
  const vo=await p.evaluate(()=>window.LN.log.filter(e=>e.code==='voice').map(e=>e.day+' '+e.d.role+' '+e.d.name+' '+e.d.k));
  console.log('voice lines in 300y:', vo.length, vo.slice(0,8).join(' | '));
  console.log('crew cards on screen (#pfL.low):', lowSeen, '| card now:', await p.evaluate(()=>{const e=document.querySelector('#pfL.low'); return e?e.textContent.replace(/\s+/g,' ').slice(0,140):null}));
  // the date
  await p.evaluate(()=>{ const G=window.LN; G.nightSeen=true; revealNight(G); }); await redraw();
  let f=await pf(); console.log('night_dated pf:', JSON.stringify(f)); await p.screenshot({path:'v-pf-night.png'}); if(f) await pfOk();
  // last flight: a line that cannot come back (core sets the line; the UI shows the file)
  await p.evaluate(()=>{ const G=window.LN; G.night=G.day+20; }); await redraw();
  const k=await p.evaluate(()=>{const G=window.LN; const fr=G.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); const w=Object.keys(G.colonies).find(k=>fr&&canReachSector(fr,planet(k).sec)); return {w,s:fr&&fr.id}});
  if(k.w){ await p.evaluate(x=>{ window.LN.earth.fuel=1000; },0); await U.openWorld(k.w);
    await p.evaluate(x=>{ setLine(window.LN,x.s,x.w,'earth'); LNdraw() },k); await p.waitForTimeout(150);   // v4.13: no Orders block — the line is set through the core
    f=await pf(); console.log('last_flight pf:', JSON.stringify(f)); await p.screenshot({path:'v-pf-last.png'}); if(f) await pfOk(); }
  // the pier
  await p.evaluate(()=>{ const G=window.LN; G.night=G.day+26; tick(G); G.pauseNow=false; LNdraw(); });
  f=await pf(); console.log('ark_closed pf:', JSON.stringify(f)); if(f) await pfOk();
  console.log('errors:', p.errs.length?p.errs:'none');
  await b.close();
})();
