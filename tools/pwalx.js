// pwalx — портреты Александры (решение Никиты 04.11, вариант A; design/ALEXANDRA-FACES.md): картинки вшиты в сборку,
// аватарка — в помощнике; поза по ключу реплики — в полосе голоса (N-xx) и в строке больших окон (смена N-04);
// в полный рост — в конце терминала («I am here. I will translate.») и в финальном окне N-13. Мышью, 1440×900 и 1280×800.
// Скриншоты — при LB_SHOTS (regress.sh --shots) в work/.run/pwalx-<w>-*.png или в папку PWALX_SHOTS.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
// what the player sees in a portrait box: its class, the picture (a data: webp), the size on screen
const pic=(p,sel)=>p.evaluate(q=>{ const e=document.querySelector(q); if(!e) return null; const r=e.getBoundingClientRect(), cs=getComputedStyle(e);
  return {cls:e.className,img:/^url\("data:image\/webp;base64,.{1000}/.test(cs.backgroundImage),w:Math.round(r.width),h:Math.round(r.height),vis:r.width>0&&cs.display!=='none'&&+cs.opacity>0} },sel);
const terminalDone=async p=>{ for(let i=0;i<200&&await p.evaluate(()=>LNU.menu);i++) await p.waitForTimeout(150) };
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  for(const vp of [{width:1440,height:900},{width:1280,height:800}]){ const W=vp.width;
    const shot=async nm=>{ if(process.env.LB_SHOTS) await p.screenshot({path:require('path').join(process.env.PWALX_SHOTS||'.','pwalx-'+W+'-'+nm+'.png')}) };
    // 1. a new game from the menu: the terminal is played through (an answer to each question) to her line
    const p=await UI.newPage(b,{vp}); const U=UI.ui(p);
    await U.start(null,undefined,{tut:true});
    // the terminal is long (a scenario has 165 s): played through at one size (PWALX_TERM, 1440 by default), SKIP at the other
    if(W!==+(process.env.PWALX_TERM||1440)){ await U.menuNew('en'); await terminalDone(p) } else {
    await U.tap('#menu .mit[data-id="new"]');
    let full=null, tries=0;   // the answers are tried in turn, as a player who does not know the right one
    // Space finishes a typed line (the terminal's hint), the commands are clicked
    for(let i=0;i<600&&!full;i++){ if(await p.$('#menu .mterm .mfull')){ await p.waitForTimeout(1300); full=await pic(p,'#menu .mterm .mfull'); break }
      const vb=await p.$$('#menu .mterm .vb'); if(vb.length===4&&await vb[0].isVisible()){ const r=await vb[tries++%4].boundingBox(); await p.mouse.click(r.x+r.width/2,r.y+r.height/2) }
      else await p.keyboard.press('Space');
      await p.waitForTimeout(120) }
    const her=await p.evaluate(()=>[...document.querySelectorAll('#menu .mterm .bl')].map(e=>e._t||e.textContent).pop()||'');
    ok(W+': terminal — she steps in full height at her line', full&&full.img&&full.vis&&/afull/.test(full.cls)&&full.h>300, JSON.stringify(full));
    ok(W+': the line is hers', /alexandra/i.test(her), her);
    await shot('term');
    await terminalDone(p) }
    // 2. the helper: the bust (a rule has no face)
    for(let i=0;i<20&&!(await p.isVisible('#helper'));i++) await p.waitForTimeout(150);
    const hv=await pic(p,'#helper .hav');
    ok(W+': helper — the bust 72×90', hv&&hv.img&&/\bava\b/.test(hv.cls)&&!/fc-/.test(hv.cls)&&hv.w>=72&&hv.h>=90, JSON.stringify(hv)+' '+JSON.stringify(await p.evaluate(()=>({menu:LNU.menu,tut:LNI.tut(),lang:LNU.langPicked}))));
    await shot('helper');
    // 3. her voice: the pose by the line's key (the helper's queue is cleared, the story block pushed as the step would)
    const voice=async(id,par,want)=>{ await p.evaluate(([id,par])=>{ const t=LNU.tut; t.msg=null; t.q=[]; delete t.seen[id]; t.q.push({id:id,p:par}); LNdraw() },[id,par]);
      for(let i=0;i<20&&!(await p.isVisible('#voice.on'));i++) await p.waitForTimeout(100);
      await p.waitForTimeout(400); const v=await pic(p,'#voice .hav');
      ok(W+': voice '+id+' — '+want+' 96×120', v&&v.img&&v.vis&&v.cls.includes('fc-'+want)&&v.w>=96&&v.h>=120, JSON.stringify(v));
      await shot(id); await U.tap('#voice'); for(let i=0;i<10&&await p.isVisible('#voice.on');i++) await p.waitForTimeout(100) };
    await voice('N02',{world:'VESTA',n:'40'},'happy');
    await voice('N05',{ship:'ARGO',n:'12'},'grief');
    await voice('N12a',{},'talk');
    await voice('N12c',{},'alarm');
    await p.close() }
  // 4. the big windows, 1440 and 1280: the shift (N-04), the Night (N-09, the Institute only), the end (N-13)
  for(const vp of [{width:1440,height:900},{width:1280,height:800}]){ const W=vp.width;
    const p=await UI.newPage(b,{vp}); const U=UI.ui(p); const shot=async nm=>{ if(process.env.LB_SHOTS) await p.screenshot({path:require('path').join(process.env.PWALX_SHOTS||'.','pwalx-'+W+'-'+nm+'.png')}) };
    await U.start('en',11); await p.evaluate(()=>{ LNU.shiftStop=true });
    await p.evaluate(()=>{ LNU.speed=10; LNU.paused=false; LNdraw() });
    for(let i=0;i<400&&await p.evaluate(()=>LNI.big())!=='shift';i++){ await p.evaluate(()=>{ LN.earth.food=Math.max(LN.earth.food,400); if(LNU.paused&&!LNI.big()){ LNU.paused=false } }); await p.waitForTimeout(150) }
    const sh=await pic(p,'#noteL .alx .hav'), st=await p.evaluate(()=>(document.querySelector('#noteL .alx p')||{}).textContent||'');
    ok(W+': shift 1 (N-04) — smile 72×90 by her line', sh&&sh.img&&sh.cls.includes('fc-smile')&&sh.w>=72&&sh.h>=90&&/I stay/.test(st), JSON.stringify(sh)+' '+st);
    await shot('N04'); await U.tap('#noteL [data-act="shiftok"]');
    await p.evaluate(()=>{ LNU.paused=true; LN.night=LN.day+400; LN.nightSeen=false; LN.arkMark=1; LNdraw() });
    ok(W+': the Night window (N-09) stands, no line of hers', await p.evaluate(()=>LNI.big()==='night'&&!document.querySelector('#noteL .alx')));
    await shot('N09'); await U.tap('#noteL [data-act="nightok"]');
    await p.evaluate(()=>{ LN.over='night'; LN.boarded=900; LN.souls=700; LN.wake=0.78; LNdraw() });
    const fn=await pic(p,'#noteL .alx.full .hav'), ft=await p.evaluate(()=>(document.querySelector('#noteL .alx p')||{}).textContent||'');
    const fit=await p.evaluate(()=>{ const r=document.querySelector('#noteL .nwin').getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight+1 });
    ok(W+': the end (N-13) — full height by her line', fn&&fn.img&&/afull/.test(fn.cls)&&fn.h>=140&&/remember/.test(ft), JSON.stringify(fn)+' '+ft);
    ok(W+': the end window fits the screen', fit);
    await shot('N13');
    ok(W+': no page errors', !p.errs.length, p.errs.join(' | '));
    await p.close() }
  await b.close() }catch(e){ ok('run', false, e.stack) }
  console.log(out.join('\n')); const f=out.filter(x=>x.startsWith('FAIL')).length; console.log(f?'FAIL '+f+' of '+out.length:'ALL '+out.length+' PASS'); process.exit(f?1:0) })();
