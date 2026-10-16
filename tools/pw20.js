// v4.x шапка: на 1280 полоса (год, ресурсы, скорость, меню) не переносится; на 390 страница без горизонтального скролла.
// v4.35: шапка — #top (год, Ночь, скорость, меню) и #res (ресурсы). Телефонная вёрстка ещё не сделана (BRIEF, 16.10):
// на 390 весь стол масштабируется функцией fit() — проверка горизонтального скролла проходит по построению.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
(async()=>{ const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
 for(const vp of [{width:1280,height:720},{width:390,height:844}]){
  const p=await UI.newPage(b,{vp:vp}); const U=UI.ui(p);
  await U.start('en',309573272);
  await p.evaluate(()=>{ const G=window.LN; for(let i=0;i<300;i++){ tick(G); G.pauseNow=false } revealNight(G); G.nightSeen=true; LNdraw() });
  await U.clear(); await U.tab('worlds'); await U.tab('earth'); await p.waitForTimeout(150);
  const r=await p.evaluate(()=>{ const t=document.getElementById('top'), tb=t.getBoundingClientRect();
    return {topH:Math.round(tb.height), scrollW:document.documentElement.scrollWidth, vw:innerWidth} });   // полоса в одну строку: высота ≈ 46 px
  console.log(vp.width, JSON.stringify(r));
  console.log(vp.width, p.errs.length?'page errors: '+p.errs.join(' | '):'no errors');
  await p.screenshot({path:'hdr-'+vp.width+'.png',clip:{x:0,y:0,width:vp.width,height:Math.min(200,vp.height)}});
  await p.close();
 } await b.close(); })();
