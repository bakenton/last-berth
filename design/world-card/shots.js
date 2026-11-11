// Снимки карточки мира: как сейчас (now) и черновики A, B — кузница и рудник, окно на 1440×900 и левая колонка отдельно (-col: для телефона;
// на 390 игра лишь уменьшает стол целиком, окно не перестраивается).
// Запуск из корня репозитория: node design/world-card/shots.js  → design/world-card/<мир>-<вариант>-<ширина>.png
const {chromium}=require('playwright'); const path=require('path'); const UI=require('../../tools/pw-ui.js'); const setup=require('./state.js');
const OUT=process.env.SHOT_DIR||__dirname;
(async()=>{ const b=await chromium.launch(); const errs=[];
  for(const vp of [{width:1440,height:900}]){
    const p=await UI.newPage(b,{vp}); const U=UI.ui(p);
    await U.start('en',11); const W=await setup(p); await U.clear();
    await p.addScriptTag({path:path.join(__dirname,'drafts.js')});
    await p.evaluate(()=>{ const s=document.createElement('style'); s.id='wccss'; s.textContent=WCDRAFT.css+'#ovl .win .bd{max-height:none!important;overflow:visible!important}#ovl{overflow:auto}'; document.head.appendChild(s) });
    for(const [name,pid] of [['forge',W.forge],['mine',W.mine]]){
      await U.openWorld(pid); await p.waitForTimeout(300); await p.evaluate(()=>WCDRAFT.grab());
      const shot=async v=>{ const f=path.join(OUT,name+'-'+v+'-'+vp.width+'.png'); await p.locator('#ovl .win').screenshot({path:f}); if(vp.width>400) await p.locator('#ovl .win .bd > div').first().screenshot({path:path.join(OUT,name+'-'+v+'-col.png')}); console.log(f) };
      await shot('now');
      for(const v of ['A','B']){
        await p.evaluate(([pid,v])=>{ LNU.win=null; LNdraw(); LNU.win=pid; LNdraw(); WCDRAFT.grab();
          const col=document.querySelector('#ovl .win .bd > div'); col.innerHTML=WCDRAFT[v](pid); WCDRAFT.noYears() },[pid,v]);
        await p.waitForTimeout(150); await shot(v) } }
    errs.push(...p.errs); await p.close() }
  console.log('page errors',errs.length,errs.slice(0,3).join(' | ')); await b.close() })();
