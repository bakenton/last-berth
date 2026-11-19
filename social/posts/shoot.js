// Post shots from the current build: node social/posts/shoot.js [seconds-of-play]
// -> social/posts/shots/{menu,map}-{x,ig}.png  (x: 1600x900, ig: 1080x1350)
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),url=require('url');
const ROOT=path.resolve(__dirname,'..','..');
const v=(fs.readFileSync(path.join(ROOT,'work','core.js'),'utf8').match(/var VERSION=\{v:'([^']+)'\}/)||[])[1];
let FILE=path.join(ROOT,'play','V5','LAST-BERTH-v'+v+'.html');
if(!fs.existsSync(FILE)){ const d=path.join(ROOT,'play','V5'); FILE=path.join(d,fs.readdirSync(d).filter(f=>/^LAST-BERTH-v[\d.]+\.html$/.test(f)).sort().pop()) }
const OUT=path.join(__dirname,'shots'); fs.mkdirSync(OUT,{recursive:true});
const PLAY=+(process.argv[2]||40);
(async()=>{ const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  for(const [tag,vp] of [['x',{width:1600,height:900}],['ig',{width:1080,height:1350}]]){
    const p=await b.newPage({viewport:vp,deviceScaleFactor:1}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
    const click=async sel=>{ const r=await p.locator(sel).first().boundingBox(); if(!r) return false; await p.mouse.click(r.x+r.width/2,r.y+r.height/2); await p.waitForTimeout(200); return true };
    await p.goto(url.pathToFileURL(FILE).href); await p.waitForTimeout(1500);
    // the debug entry (TEST PLAY) is hidden on the shots: players of a public build should not see it either
    const hideDebug=()=>p.evaluate(()=>{ document.querySelectorAll('#god,#god-tab').forEach(e=>e.style.display='none');
      document.querySelectorAll('button,a,div,span').forEach(e=>{ if(e.children.length<=2&&/^\s*\W*\s*test play\s*$/i.test(e.textContent)) e.style.visibility='hidden' }) });
    await hideDebug();
    await p.screenshot({path:path.join(OUT,'menu-'+tag+'.png')});
    await click('#menu .mit[data-id="new"]'); for(let i=0;i<80&&!(await p.isVisible('#menu .mterm'));i++) await p.waitForTimeout(150);
    await click('#menu [data-m="skip"]'); for(let i=0;i<30&&await p.evaluate(()=>LNU.menu);i++) await p.waitForTimeout(100);
    await p.waitForTimeout(800);
    await p.evaluate(()=>{ LNtut.off(); LNU.shiftStop=false; LNU.speed=10; LNU.paused=false; LNdraw() });
    const t0=Date.now();
    while(Date.now()-t0<PLAY*1000){ await p.waitForTimeout(500);
      for(const s of ['[data-act="shiftok"]','[data-act="nightok"]','#pfL [data-act="pfok"]','[data-act="nofreeclose"]']) if(await p.isVisible(s)) await click(s) }
    await p.evaluate(()=>{ LNU.paused=true; LNdraw() }); await hideDebug(); await p.waitForTimeout(600);
    await p.screenshot({path:path.join(OUT,'map-'+tag+'.png')});
    console.log(tag,'year',await p.evaluate(()=>Math.round(LN.year||0)),'errors',errs.length,errs.slice(0,2).join(' ; ').slice(0,200));
    await p.close() }
  await b.close();
})().catch(e=>{ console.error('FAIL',e); process.exit(1) });
