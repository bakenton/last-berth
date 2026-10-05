const {chromium}=require('/opt/node-tools/node_modules/playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 for(const vp of [{width:1280,height:720},{width:390,height:844}]){
  const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/claude/ln/long-night.html'); await p.waitForTimeout(300);
  await p.click('[data-lang="en"]'); await p.click('[data-act="oskip"]'); await p.click('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false});
  await p.evaluate(()=>{ const G=window.LN; for(let i=0;i<300;i++){tick(G);G.pauseNow=false} revealNight(G); G.nightSeen=true; });
  for(let i=0;i<5&&await p.isVisible('#pf');i++) await p.click('[data-act="pfok"]'); await p.click('.tab[data-tab="worlds"]'); for(let i=0;i<5&&await p.isVisible('#pf');i++) await p.click('[data-act="pfok"]'); await p.click('.tab[data-tab="earth"]'); await p.waitForTimeout(200);
  const r=await p.evaluate(()=>{const h=document.getElementById('hdr').getBoundingClientRect(); return {hdrH:Math.round(h.height),scrollW:document.documentElement.scrollWidth,vw:innerWidth}});
  console.log(vp.width, JSON.stringify(await p.evaluate(()=>[...document.getElementById('hdr').children].filter(e=>!e.hidden).map(e=>(e.id||e.className)+':'+Math.round(e.getBoundingClientRect().width)+'/'+getComputedStyle(e).flex+'/'+getComputedStyle(e).minWidth)))); console.log(vp.width, JSON.stringify(r), errs.length?errs:'no errors');
  await p.screenshot({path:'hdr-'+vp.width+'.png',clip:{x:0,y:0,width:vp.width,height:Math.min(200,vp.height)}});
 } await b.close(); })();
