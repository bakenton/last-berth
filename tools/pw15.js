// v3.7.1: the dock and the advisor never cover each other; both fold; both are resizable
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  for(const vp of [{width:1280,height:720},{width:1600,height:1000}]){
    const p=await b.newPage({viewport:vp});
    const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
    const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
    await p.goto('file:///home/claude/ln/long-night.html'); await p.waitForTimeout(300);
    await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
    await tap('[data-lang="ru"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false}); await p.addScriptTag({content:BOT});
    await p.evaluate(()=>botRun(520));
    // a tall dock: night on (ark row), old idle hulls (scrap row); a tall advisor: many worlds piling
    await p.evaluate(()=>{ const G=window.LN; G.nightSeen=true; if(!G.night) revealNight(G); G.earth.metal=9000; G.earth.parts=3000; G.earth.fuel=9000; G.earth.food=9000; });
    await tap('.tab[data-tab="worlds"]'); await tap('.tab[data-tab="earth"]'); await p.waitForTimeout(150);
    for(let i=0;i<6&&await p.isVisible('#pf');i++) await tap('[data-act="pfok"]');   // v4.14 audit: an open personal file (v3.9+) ate the fold clicks — folding went untested
    const geo=async()=>p.evaluate(()=>{const a=document.getElementById('advisor').getBoundingClientRect(), d=document.getElementById('dock').getBoundingClientRect(); return {advBottom:Math.round(a.bottom),dockTop:Math.round(d.top),advH:Math.round(a.height),dockH:Math.round(d.height),overlap:a.bottom>d.top+1,advRows:document.querySelectorAll('#advisor .arow').length,dockRows:document.querySelectorAll('#dock .dockrow').length,resize:getComputedStyle(document.getElementById('dock')).resize+'/'+getComputedStyle(document.getElementById('advisor')).resize}});
    console.log(vp.width+'x'+vp.height, 'open:', JSON.stringify(await geo()));
    await p.screenshot({path:'p1-'+vp.width+'.png'});
    await tap('#dockhd'); console.log('  dock folded:', JSON.stringify(await geo()));
    await tap('#dockhd'); await tap('#advhead'); console.log('  advisor folded:', JSON.stringify(await geo()));
    await tap('#advhead');
    // hand-resize the dock taller (simulate the native handle by setting height, as the browser would)
    await p.evaluate(()=>{ document.getElementById('dock').style.height='500px'; }); await tap('.tab[data-tab="worlds"]'); await tap('.tab[data-tab="earth"]');
    console.log('  dock dragged to 500px:', JSON.stringify(await geo()));
    console.log('  errors:', errs.length?errs:'none');
    await p.close();
  }
  await b.close();
})();
