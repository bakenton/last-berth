// Раунд 2: пять черновиков трюма из гексов (hex.js) поверх настоящего окна Ark. Запуск из корня: node design/ark-menu/shots-hex.js [H1,H3]
const {chromium}=require('playwright'); const path=require('path'); const UI=require('../../tools/pw-ui.js'); const setup=require('./state.js');
const OUT=__dirname, ONLY=(process.argv[2]||'H1,H2,H3,H4,H5').split(',');
(async()=>{ const b=await chromium.launch(); const p=await UI.newPage(b,{vp:{width:1500,height:950}}); const U=UI.ui(p);
  await U.start('en',309573272); await setup(p); await U.clear(); await U.tab('ark'); await p.waitForTimeout(400);
  await p.addScriptTag({path:path.join(OUT,'hex.js')});
  for(const k of ONLY){
    const r=await p.evaluate(k=>{ if(!document.getElementById('ahcss')){ const s=document.createElement('style'); s.id='ahcss'; s.textContent=ARKHEX.css; document.head.appendChild(s) }
      const bd=document.querySelector('#ovl .win .bd'); bd.innerHTML=ARKHEX[k]();
      const t=document.getElementById('amtop'); if(t) t.remove(); document.getElementById('top').insertAdjacentHTML('beforeend',k[0]==='F'?ARKHEX.top3():k[0]==='C'?ARKHEX.top2():ARKHEX.top());
      const w=document.querySelector('#ovl .win').getBoundingClientRect(); return {h:Math.round(w.height),bottom:Math.round(w.bottom),vh:innerHeight,scroll:bd.scrollHeight>bd.clientHeight+2} },k);
    console.log(k,JSON.stringify(r));
    await p.waitForTimeout(150); await p.screenshot({path:path.join(OUT,'hex-'+k+'.png')}); await p.locator('#ovl .win').screenshot({path:path.join(OUT,'hex-'+k+'-window.png')}) }
  console.log('errs',p.errs.length,p.errs.join(' | ').slice(0,300)); await b.close() })();
