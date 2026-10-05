// deck v2 screenshots (EN UI, 1600x1000 @2x, real fonts)
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const CSS=fs.readFileSync('fonts-local.css','utf8');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const mk=async()=>{ const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2}); p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
    await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:CSS}));
    await p.route('**/fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
    p.tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(140)};
    p.redraw=async()=>{ await p.tap('.tab[data-tab="worlds"]'); await p.tap('.tab[data-tab="earth"]'); await p.waitForTimeout(200) };
    p.clearPF=async()=>{ for(let i=0;i<5;i++){ if(await p.isVisible('#intro')&&await p.locator('[data-act="nightok"]').count()) await p.tap('[data-act="nightok"]'); if(await p.isVisible('#pf')) await p.tap('[data-act="pfok"]'); else break } };
    await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(600); await p.evaluate(()=>document.fonts.ready); return p };
  // 1. start screen + prologue
  let p=await mk();
  await p.tap('[data-lang="en"]'); await p.tap('[data-act="oskip"]'); await p.mouse.move(5,5); await p.waitForTimeout(200);
  await p.locator('#introbox').screenshot({path:'deck/start.png'});
  await p.tap('[data-act="prologue"]'); await p.waitForTimeout(250);
  await p.mouse.move(5,5); await p.screenshot({path:'deck/pro-0.png'});
  await p.tap('[data-act="callok"]');
  const mine=await p.evaluate(()=>document.querySelector('#map .pnode').dataset.p);
  let bb=await p.locator('[data-p="'+mine+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(250);
  await p.mouse.move(5,5); await p.screenshot({path:'deck/pro-1.png'});
  console.log('prologue errs', p.errs); await p.close();
  // 2. a mature run: desk, journal with voices, personal file, night, end
  p=await mk();
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await p.tap('[data-lang="en"]'); await p.tap('[data-act="oskip"]'); await p.tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false}); await p.addScriptTag({content:BOT});
  await p.evaluate(()=>botRun(560)); await p.redraw(); await p.clearPF();
  await p.tap('#b-auto'); // HOLD off
  for(let i=0;i<8;i++){ await p.tap('[data-spd="8"]'); await p.waitForTimeout(1200); await p.tap('#b-pause'); await p.clearPF(); await p.evaluate(()=>botRun(3)); }
  await p.redraw(); await p.clearPF();
  const k=await p.evaluate(()=>{const G=window.LN; return Object.keys(G.colonies).find(k=>G.ships.some(s=>s.from===k)&&G.reserves[k]>0&&planet(k).kind==='mine')||Object.keys(G.colonies)[0]});
  bb=await p.locator('[data-p="'+k+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(250);
  await p.mouse.move(5,5); await p.screenshot({path:'deck/desk.png'});
  console.log('trends', await p.evaluate(()=>[...document.querySelectorAll('#res .d')].map(e=>e.textContent).join(' | ')));
  // journal with voices
  await p.tap('.tab[data-tab="earth"]'); await p.tap('#b-logx'); await p.waitForTimeout(250); await p.mouse.move(5,5);
  await p.locator('#btm').screenshot({path:'deck/journal.png'});
  console.log('voices in log', await p.evaluate(()=>document.querySelectorAll('#log .le.vo').length));
  await p.tap('#b-logx');
  // the date + the chief's personal file
  await p.evaluate(()=>{ const G=window.LN; G.nightSeen=false; if(!G.night) revealNight(G); }); await p.redraw();
  await p.mouse.move(5,5); await p.locator('#introbox').screenshot({path:'deck/night.png'});
  await p.tap('[data-act="nightok"]'); await p.waitForTimeout(250);
  if(await p.isVisible('#pf')){ await p.mouse.move(5,5); await p.locator('#pfbox').screenshot({path:'deck/pf-chief.png'}); await p.tap('[data-act="pfok"]'); }
  // a captain: last flight
  await p.evaluate(()=>{ const G=window.LN; G.night=G.day+30; }); await p.redraw(); await p.clearPF();
  const t=await p.evaluate(()=>{const G=window.LN; G.earth.fuel=5000; const fr=G.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); const w=fr&&Object.keys(G.colonies).filter(k=>canReachSector(fr,planet(k).sec)).sort((a,b)=>planet(b).dist-planet(a).dist)[0]; return {w,s:fr&&fr.id}});
  if(t.w){ bb=await p.locator('[data-p="'+t.w+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(200);
    await p.evaluate(id=>document.querySelector('.chip[data-ship="'+id+'"]').click(),t.s); await p.waitForTimeout(120); await p.tap('[data-act="route"]'); await p.waitForTimeout(250);
    if(await p.isVisible('#pf')){ await p.locator('#pfbox').screenshot({path:'deck/pf-captain.png'}); await p.tap('[data-act="pfok"]'); } }
  // ending
  await p.evaluate(()=>{ const G=window.LN; G.earth.metal=9000;G.earth.parts=5000;G.earth.food=15000;G.earth.fuel=9000;G.earth.people=1500; for(let i=0;i<9;i++) buildArk(G); G.night=G.day+2; for(let i=0;i<3;i++){ tick(G); G.pauseNow=false } });
  await p.redraw(); await p.clearPF(); await p.waitForTimeout(200); await p.mouse.move(5,5);
  await p.locator('#ovbox').screenshot({path:'deck/end.png'});
  console.log('run errs', p.errs); await p.close();
  await b.close();
})();
