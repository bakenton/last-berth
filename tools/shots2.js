const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  const CSS=fs.readFileSync(require('path').join(__dirname,'fonts-local.css'),'utf8');
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:CSS}));
  await p.route('**/fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
  const tap=async sel=>{const L=p.locator(sel).first(); const bb=await L.boundingBox(); if(!bb){console.log('skip',sel);return} await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150)};
  const redraw=async()=>{ await tap('.tab[data-tab="worlds"]'); await tap('.tab[data-tab="earth"]'); await p.waitForTimeout(300); };
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(700);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false}); await p.addScriptTag({content:BOT});
  await p.evaluate(()=>document.fonts.ready); console.log('seed',await p.evaluate(()=>window.LN.seed),'font ok',await p.evaluate(()=>document.fonts.check('800 20px "Inter Tight"')));
  await p.evaluate(()=>botRun(650));
  await redraw(); if(await p.isVisible('#intro')) await tap('[data-act="nightok"]');
  // one world lifted, for an epitaph line
  await p.evaluate(()=>{const G=window.LN; const k=Object.keys(G.colonies).find(k=>G.reserves[k]!==Infinity&&G.reserves[k]<=0)||Object.keys(G.colonies)[0];
    G.ships.filter(s=>s.from===k).forEach(s=>clearLine(G,s.id));
    for(let i=0;i<300;i++){ tick(G); G.pauseNow=false; const f=G.ships.find(x=>x.mode==='idle'&&x.at==='earth'&&!(x.from&&x.to)&&canReachSector(x,planet(k).sec)); if(f){ abandon(G,f.id,k); break } }
    for(let i=0;i<300;i++){ tick(G); G.pauseNow=false; botStep(G,G.day); if(G.log.some(e=>e.code==='epitaph')) break }
    for(let i=0;i<30;i++){ tick(G); G.pauseNow=false; botStep(G,G.day); } });
  await redraw(); if(await p.isVisible('#intro')) await tap('[data-act="nightok"]');
  // 01 hero: select a working world so Target panel is informative
  await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>G.ships.some(s=>s.from===k)&&G.reserves[k]>0)||Object.keys(G.colonies)[0];
    document.querySelector('[data-p="'+k+'"] circle.hit').dispatchEvent(new MouseEvent('click',{bubbles:true})); });
  await p.waitForTimeout(300); await p.mouse.move(5,5);
  await p.screenshot({path:'portfolio/01-desk.png'});
  // 02 chronicle
  await tap('.tab[data-tab="earth"]'); await tap('#b-logf'); await tap('#b-logx'); await p.waitForTimeout(250); await p.mouse.move(5,5);
  await p.screenshot({path:'portfolio/_chron_full.png'});
  await tap('#b-logx'); await tap('#b-logf');
  // 03 night modal
  await p.evaluate(()=>{ const G=window.LN; G.nightSeen=false; if(!G.night) revealNight(G); });
  await redraw(); await p.mouse.move(5,5);
  await p.screenshot({path:'portfolio/_night_full.png'});
  await tap('[data-act="nightok"]');
  // 04 the unwinding: ark panel visible on Earth tab with left-behind rows, near the end
  await p.evaluate(()=>{ const G=window.LN; G.earth.metal=9000;G.earth.parts=4000;G.earth.food=12000;G.earth.fuel=8000;G.earth.people=620; for(let i=0;i<7;i++) buildArk(G); G.night=G.day+380; });
  await redraw(); await p.mouse.move(5,5);
  await p.evaluate(()=>{ const r=document.getElementById('railbody'); const h=[...r.querySelectorAll('.blk h3')].find(x=>/ark/i.test(x.textContent)); if(h) h.parentElement.scrollIntoView({block:'start'}); });
  await p.waitForTimeout(200);
  await p.screenshot({path:'portfolio/_ark_full.png'});
  // 05 ending
  await p.evaluate(()=>{ const G=window.LN; G.earth.people=1340; G.night=G.day+2; for(let i=0;i<3;i++){ tick(G); G.pauseNow=false } });
  await redraw(); await p.mouse.move(5,5);
  await p.screenshot({path:'portfolio/_end_full.png'});
  console.log('year',await p.evaluate(()=>window.LN.day),'souls',await p.evaluate(()=>window.LN.souls),'epitaphs',await p.evaluate(()=>window.LN.log.filter(e=>e.code==='epitaph').length),'errors',errs);
  await b.close();
})();
