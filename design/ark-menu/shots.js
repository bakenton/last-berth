// Снимки окна ковчега: как сейчас (00) и черновики под капсулы (A, B). Запуск из корня репозитория: node design/ark-menu/shots.js
// Черновики вставляются в настоящую страницу work/page.html поверх открытого окна Ark — стили и значки игры, состояние из state.js.
const {chromium}=require('playwright'); const path=require('path'); const UI=require('../../tools/pw-ui.js'); const setup=require('./state.js');
const OUT=__dirname;
(async()=>{ const b=await chromium.launch();
  for(const [name,vp] of [['',{width:1500,height:950}],['-1280',{width:1280,height:800}]]){
    const p=await UI.newPage(b,{vp}); const U=UI.ui(p);
    await U.start('en',309573272); await setup(p); await U.clear(); await U.tab('ark'); await p.waitForTimeout(400);
    if(!name) await p.screenshot({path:path.join(OUT,'00-now-v5.09.png')});
    if(!name) await p.locator('#ovl .win').screenshot({path:path.join(OUT,'00-now-v5.09-window.png')});
    await p.addScriptTag({path:path.join(OUT,'drafts.js')});
    for(const k of ['A','B']){
      const r=await p.evaluate(k=>{ if(!document.getElementById('amcss')){ const s=document.createElement('style'); s.id='amcss'; s.textContent=ARKDRAFT.css; document.head.appendChild(s) }
        const bd=document.querySelector('#ovl .win .bd'); if(!window.__cv) window.__cv=bd.innerHTML; bd.innerHTML=window.__cv; bd.innerHTML=ARKDRAFT[k]();
        const t=document.getElementById('amtop'); if(t) t.remove(); document.getElementById('top').insertAdjacentHTML('beforeend',ARKDRAFT.top());
        const w=document.querySelector('#ovl .win').getBoundingClientRect(); return {h:Math.round(w.height),bottom:Math.round(w.bottom),vh:innerHeight,sw:bd.scrollHeight>bd.clientHeight+2} },k);
      console.log(k+name,JSON.stringify(r));
      await p.waitForTimeout(150); await p.screenshot({path:path.join(OUT,'draft-'+k+name+'.png')});
      if(!name) await p.locator('#ovl .win').screenshot({path:path.join(OUT,'draft-'+k+'-window.png')}) }   // только окно — крупнее на телефоне
    console.log('errs',p.errs.length); await p.close() }
  await b.close() })();
