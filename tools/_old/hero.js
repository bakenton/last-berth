const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const CSS=fs.readFileSync('fonts-local.css','utf8');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  for(const [seed,years] of [[309573272,300],[309573272,420],[475030788,380],[90593335,420]]){
    const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2});
    await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:CSS}));
    await p.route('**/fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
    await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(500);
    await p.evaluate(s=>{ document.getElementById('seedin').value=String(s); document.querySelector('[data-act="new"]').click(); },seed);
    await p.evaluate(()=>{ document.querySelector('[data-lang="en"]').click(); document.querySelector('[data-act="gskip"]').click(); });
    await p.addScriptTag({content:BOT});
    await p.evaluate(y=>botRun(y),years);
    await p.evaluate(()=>{ const G=window.LN; G.nightSeen=true; const ks=Object.keys(G.colonies).filter(k=>G.ships.some(s=>s.from===k)&&G.reserves[k]>0); const k=ks[0]||Object.keys(G.colonies)[0];
      document.querySelector('[data-p="'+k+'"] circle.hit').dispatchEvent(new MouseEvent('click',{bubbles:true})); });
    await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300); await p.mouse.move(5,5);
    const st=await p.evaluate(()=>{const G=window.LN; return {y:G.day,cols:Object.keys(G.colonies).length,adv:advice(G).length,dry:Object.keys(G.colonies).filter(k=>G.reserves[k]<=0).length,food:Math.round(G.earth.food),over:G.over}});
    const f=`portfolio/_hero_${seed}_${years}.png`; await p.screenshot({path:f}); console.log(f,JSON.stringify(st));
    await p.close();
  }
  await b.close();
})();
