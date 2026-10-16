/* PLAYTEST — бот-игрок через настоящий браузер (интерфейс v4.35: карта + шесть вкладок + окно мира).
   Играет МЫШЬЮ по видимому интерфейсу: p.mouse.click по координатам элементов (не element.click()), закрывает большие окна,
   читает то, что видит игрок (тосты, строки советника, подписи кнопок), и пишет отчёт + лог + скриншоты.
     node tools/playtest.js [--minutes 4] [--seed 309573272] [--viewport 1500x950] [--god] [--out dir] [--shots]
                            [--style default|serial|rush] [--skip] [--rich] [--brain sim]
   Что делает бот: заселяет миры через окно мира («Send settlers»), ставит свободные суда на линии («Assign»), заказывает суда
   под линию («Order new»), строит в Yard, ведёт программу двигателя и разведку колец во вкладке Tech, чинит то, что говорит
   советник (#top .adv → строка → кнопка в окне мира, в том числе эвакуация), после даты Ночи покупает уровни ковчега (Ark) и
   держит конвой (reserve в Yard), ищет пропавшие суда (Fleet → Search). Раз в ~400 лет обходит все вкладки и аудитит экран.
   --style serial — «постепенный»: линия на мир по одной, ковчег уровнем 2 сразу после даты Ночи.
   --style rush   — «рашер»: по две линии на мир, крупные суда, ковчег — вабанк на лучший уровень.
   --god   work/LAST-BERTH-god.html (node tools/make-god.js) и GOD.skip в «пустых» местах: доходит дальше за те же минуты
           (это уже не чистое время игрока — в отчёте помечено).
   --skip  без --god: когда делать нечего, жмёт настоящую кнопку SKIP (промотка до события).
   --rich  только с --god: добивает недостающие ресурсы ковчега и держит Землю сытой через GOD.res (бот — плохой фермер; в отчёте помечено).
   --brain sim — решения принимает голова бота ядра (tools/sim.js step()) через API ядра, а не кликами; экран при этом рисуется,
           большие окна закрываются мышью, аудит идёт.
   Результат: work/playtest/<метка>/report.md · events.json · game-log.json (экспорт лога игры) · shots/*.png
   Бот ловит механику (ошибки, утечки текста, обрезка, перекрытия, потерянные клики, отказы кнопок, зависания, перебор окон),
   а не «ощущение»: ощущение — по скриншотам. */
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),url=require('url');
const argv=process.argv.slice(2); const arg=(n,d)=>{ const i=argv.indexOf('--'+n); return i<0?d:(argv[i+1]&&!argv[i+1].startsWith('--')?argv[i+1]:true) };
const MIN=+arg('minutes',4), SEED=String(arg('seed','309573272')), VP=String(arg('viewport','1500x950')).split('x').map(Number);
const GOD=!!arg('god',false), SHOTS_ALL=!!arg('shots',false), STYLE=String(arg('style','default')), BRAIN=String(arg('brain','ui'));
const REAL_SKIP=!!arg('skip',false), RICH=!!arg('rich',false);
if(!/^(default|serial|rush|ark|bank)$/.test(STYLE)){ console.error('--style: default | serial | rush | ark | bank'); process.exit(2) }
if(BRAIN==='sim'&&STYLE==='default'){ console.error('--brain sim needs --style rush|serial|ark|bank'); process.exit(2) }
const ROOT=path.resolve(__dirname,'..');
const stamp=new Date().toISOString().replace(/[:T]/g,'-').slice(0,16)+(VP[0]<700?'-mobile':'')+(STYLE!=='default'?'-'+STYLE:'')+(BRAIN==='sim'?'-sim':'')+(GOD?'-god':'');
const OUT=path.resolve(String(arg('out',path.join(ROOT,'work','playtest',stamp)))); fs.mkdirSync(path.join(OUT,'shots'),{recursive:true});
const ev=[]; const issues=new Map(); const marks=[]; const t0=Date.now();
const wall=()=>+((Date.now()-t0)/1000).toFixed(1);
const rec=(type,o)=>ev.push(Object.assign({t:wall(),type},o));
const SER=STYLE==='serial', RUSH=STYLE==='rush';

(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const ctx=await b.newContext({viewport:{width:VP[0],height:VP[1]},hasTouch:VP[0]<700});
  const p=await ctx.newPage();
  let curYear=0;
  p.on('pageerror',e=>{ addIssue('crit','pageerror',String(e).slice(0,200)) });
  p.on('console',m=>{ if(m.type()==='error'){ const t=m.text(); if(!/fonts\.(googleapis|gstatic)|ERR_FAILED|net::/.test(t)) addIssue('warn','console-error',t.slice(0,200)) } });
  // what the player reads and what a press really did: toasts (every one that appears), and the last click event's target
  await p.addInitScript(()=>{
    window.__toasts=[]; window.__ck=null; window.__md=null;
    window.addEventListener('mousedown',e=>{ window.__md=e.target },true);
    window.addEventListener('click',e=>{ const t=e.target, a=t&&t.closest?t.closest('[data-act],[data-lang],#map .wd'):null;
      window.__ck={act:a?1:0,tag:t&&t.tagName,ts:performance.now()} },true);
    document.addEventListener('DOMContentLoaded',()=>{ const box=document.getElementById('toasts'); if(!box) return;
      new MutationObserver(ms=>{ ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1&&/toast/.test(n.className)) window.__toasts.push({ts:performance.now(),day:window.LN?window.LN.day:null,cls:n.className.replace('toast','').trim(),txt:(n.textContent||'').trim()}) })) }).observe(box,{childList:true}) });
  });
  const page=path.join(ROOT,'work',GOD?'LAST-BERTH-god.html':'page.html');
  if(!fs.existsSync(page)){ console.error('нет '+page+(GOD?' — сначала node tools/make-god.js':' — сначала сборка')); process.exit(2) }
  await p.goto(url.pathToFileURL(page).href); await p.waitForTimeout(500);

  /* ---------- проблемы и снимки ---------- */
  let shotN=0;
  async function shot(name){ const f='shots/'+String(++shotN).padStart(2,'0')+'-'+name.replace(/[^\w-]+/g,'_').slice(0,40)+'.png'; try{ await p.screenshot({path:path.join(OUT,f)}) }catch(e){} return f }
  function addIssue(sev,kind,detail,shotFile){ const key=kind+'|'+String(detail).replace(/\d+/g,'#').slice(0,80);
    const x=issues.get(key); if(x){ x.n++; x.lastYear=curYear; return }
    issues.set(key,{sev,kind,detail:String(detail).slice(0,260),n:1,year:curYear,t:wall(),shot:shotFile||null}) }
  const keyShots=new Set();
  async function keyShot(k,name){ if(keyShots.has(k)) return; keyShots.add(k); marks.push({t:wall(),year:curYear,what:'снимок: '+name}); await shot(name) }

  /* ---------- мышь ---------- */
  const lastWhy={v:null};
  const refusals=new Map();   // «кнопка ← причина» → {n,text,year}
  const lost={n:0,retried:0,gaveUp:0};
  async function box(sel){ const L=p.locator(sel).first(); if(!(await L.count())) return null; try{ await L.scrollIntoViewIfNeeded({timeout:1200}) }catch(e){} return L.boundingBox() }
  const probeJs=({x,y,sel})=>{ const t=document.elementFromPoint(x,y); let want=document.querySelector(sel); if(want&&want.closest&&want.closest('#map .wd')) want=want.closest('#map .wd');
    return {ok:!!(t&&want&&(want.contains(t)||t.contains(want))), top:t?(t.id?'#'+t.id:t.tagName+'.'+String(t.className&&t.className.baseVal!==undefined?t.className.baseVal:t.className).split(' ')[0]):null} };
  /* tap(sel) → 'ok' | 'disabled' | 'covered' | 'missing' | 'lost'. A press on a refused button is made on purpose: the player
     gets the reason in a toast, and the reason is what the report wants. Taps the FIRST element matching sel. */
  async function tap(sel,opt){ opt=opt||{};
    for(let attempt=0;attempt<3;attempt++){
      let bb=await box(sel); if(!bb) return 'missing';
      const aim=async()=>{ const x=bb.x+bb.width/2, y=bb.y+bb.height/2; const h=await p.evaluate(probeJs,{x,y,sel}).catch(()=>({ok:true})); return Object.assign(h,{x,y}) };
      let hit=await aim();
      if(!hit.ok){ await p.waitForTimeout(120); bb=await box(sel); if(!bb) return 'missing'; hit=await aim() }   // the page redraws every tick: measure again before blaming the layout
      if(!hit.ok&&!opt.nd&&(hit.top==='#noteL'||hit.top==='#pfL'||hit.top==='#logbox')&&attempt<2){ if(await dismiss()) continue }   // a window popped up in the middle of the task: the player closes it and goes on
      if(!hit.ok){ if(!opt.soft) addIssue('warn','click-covered',sel+' перекрыт '+hit.top,await shot('covered')); rec('tap-covered',{sel,top:hit.top}); return 'covered' }
      const info=await p.evaluate(sel=>{ const e=document.querySelector(sel); return e?{d:e.getAttribute('aria-disabled')==='true',why:e.dataset.why||null,txt:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,50),act:e.dataset.act||null}:null },sel).catch(()=>null);
      const nT=await p.evaluate(()=>{ window.__ck=null; return window.__toasts.length }).catch(()=>0);
      await p.mouse.click(hit.x,hit.y); await p.waitForTimeout(opt.wait||60);
      const ck=await p.evaluate(()=>window.__ck).catch(()=>null);
      if(!ck||ck.act===0){   // the page redrew between press and release: the click landed on the wrapper, not on the button
        lost.n++; if(attempt===0) addIssue('warn','click-lost','нажатие потеряно перерисовкой: '+sel.slice(0,80)+' (событие click ушло на '+(ck?ck.tag:'ничего')+')',await shot('click-lost'));
        if(attempt<2){ lost.retried++; continue } lost.gaveUp++; return 'lost' }
      if(info&&info.d){ const toasts=await p.evaluate(n=>window.__toasts.slice(n).map(t=>t.txt),nT).catch(()=>[]);
        const k=(info.act||'?')+' «'+info.txt+'» ← '+(info.why||'без причины'); const r=refusals.get(k)||{n:0,text:toasts[0]||'(тоста не было)',year:curYear}; r.n++; refusals.set(k,r);
        if(!toasts.length) addIssue('warn','refusal-silent','кнопка отказала, а тоста с причиной нет: '+k);
        lastWhy.v=info.why||'disabled'; rec('tap-disabled',{sel,why:info.why,txt:info.txt,toast:toasts[0]||null}); return 'disabled' }
      return 'ok' }
    return 'lost' }
  const okTap=async(sel,opt)=>(await tap(sel,opt))==='ok';
  const enabled=sel=>sel+':not([aria-disabled="true"])';
  const wait=ms=>p.waitForTimeout(ms);
  async function hasEl(sel){ return (await p.locator(sel).count())>0 }
  async function vis(sel){ return p.locator(sel).first().isVisible().catch(()=>false) }

  /* ---------- состояние игры (то, что игрок видит в шапке и на вкладках) ---------- */
  const S=()=>p.evaluate(()=>{ const G=window.LN,U=window.LNU; if(!G) return null; const E=G.earth, I=window.LNI;
    const fr=G.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.pend&&!s.mutiny&&!s.crewWait&&!s.job);
    let adv=0, advR=[], fl={}; try{ const ar=I.adv(); adv=ar.length; advR=ar.map(r=>({v:r[3],f:r[5]})); const F=I.flags(); for(const k in F) fl[k]=F[k][0] }catch(e){}
    const wst={}, lines={}; for(const k in G.colonies){ try{ wst[k]=I.wst(k) }catch(e){} lines[k]=onLine(G,k).length }
    let cv=null; try{ if(G.night) cv=arkConvoy(G) }catch(e){}
    return {day:G.day,over:G.over||null,people:Math.round(E.people),food:Math.round(E.food),metal:Math.round(E.metal),fuel:Math.round(E.fuel),parts:Math.round(E.parts),
      cols:Object.keys(G.colonies).length,settled:settledCount(G),night:G.night||0,nightLeft:G.night?nightLeft(G):null,nightSeen:!!G.nightSeen,
      paused:!!U.paused,speed:U.speed,halted:I.halted(),big:I.big(),win:U.win||null,tab:U.tab||null,pop:U.pop||null,pf:U.pf?(U.pf.low?'low':'full'):null,
      logOpen:!document.getElementById('logbox').hidden,free:fr.length,freeIds:fr.map(s=>s.id),building:G.ships.filter(s=>s.mode==='building').length,
      missing:G.ships.filter(s=>s.mode==='missing').map(s=>s.id),ships:G.ships.filter(s=>s.mode!=='dead').length,adv,advR,flags:fl,wst,lines,
      sectors:SECTORS.length,drive:G.driveLvl||0,gen:G.gen||0,driveRunning:!!G.drive,canSurvey:canSurvey(G),arkLv:G.ark?arkLevel(G):0,arkReady:G.arkMark!==null&&G.arkMark!==undefined?arkReady(G):false,
      cv:cv&&{need:cv.need,have:cv.have,ok:cv.ok},souls:G.souls||0,hungry:!!G.hungry,logLen:G.log.length} }).catch(()=>null);

  /* ---------- большие окна: сколько раз и каких перебили игроку ---------- */
  const interrupts={}; const bump=l=>{ interrupts[l]=(interrupts[l]||0)+1 };
  async function dismiss(){ let n=0;
    for(let i=0;i<8;i++){ const s=await S(); if(!s) break; let did=false;
      if(s.logOpen){ if(await okTap('#logbox [data-act="closelog"]',{soft:true,nd:true})){ did=true } }
      else if(s.big==='night'){ if(await okTap('#noteL [data-act="nightok"]',{soft:true,nd:true})){ bump('окно Ночи'); did=true; await keyShot('night','night-modal-closed') } }
      else if(s.big==='shift'){ if(await okTap('#noteL [data-act="shiftok"]',{soft:true,nd:true})){ bump('отчёт смены'); did=true } }
      else if(s.big==='note'){ const go=s.canSurvey==='ok'&&await vis('#noteL [data-act="notego"]');
        if(await okTap(go?'#noteL [data-act="notego"]':'#noteL [data-act="noteok"]',{soft:true,nd:true})){ bump(go?'событие → Tech':'событие'); did=true } }
      else if(s.big==='over'||s.big==='lang') break;
      else if(s.pf){ if(await okTap('#pfL [data-act="pfok"]',{soft:true,nd:true})){ bump('личные дела'); did=true } }
      if(!did) break; n++ }
    return n }

  /* ---------- окна и вкладки ---------- */
  const PAUSING=new Set(['earth','yard','ark']);
  const ust=()=>p.evaluate(()=>({win:LNU.win||null,tab:LNU.tab||null,pop:LNU.pop||null})).catch(()=>({}));
  async function clickOutside(){
    const pt=await p.evaluate(()=>{ const o=document.getElementById('ovl'), w=document.querySelector('#ovl .win'); if(!o||!w) return null;
      const r=o.getBoundingClientRect(), q=w.getBoundingClientRect();
      for(const [x,y] of [[r.right-24,r.bottom-24],[r.left+24,r.bottom-24],[r.right-24,r.top+24],[r.left+24,r.top+24]]){
        if(x<q.left||x>q.right||y<q.top||y>q.bottom){ const t=document.elementFromPoint(x,y); if(t&&t.id==='ovl') return [x,y] } } return null });
    if(!pt) return false; await p.mouse.click(pt[0],pt[1]); await wait(100); return true }
  async function home(){   // nothing open: no popover, no window, no side panel
    for(let i=0;i<6;i++){ await dismiss(); const u=await ust(); if(!u.win&&!u.tab&&!u.pop) return true;
      if(u.pop){ await p.keyboard.press('Escape'); await wait(60); continue }
      if(u.win&&!PAUSING.has(u.win)){ await clickOutside(); const v=await ust(); if(v.win===u.win){ const dg=await p.evaluate(()=>({big:LNI.big(),pf:LNU.pf?(LNU.pf.low?'low':'full'):null,pop:LNU.pop,logOpen:!document.getElementById('logbox').hidden,paused:LNU.paused,day:LN.day}));
        if(!dg.big&&!dg.pf&&!dg.logOpen) addIssue('warn','close-outside','окно мира '+u.win+' не закрылось нажатием мимо окна (нет больших окон; год '+dg.day+')',await shot('close-outside'));
        rec('close-outside',dg); await p.keyboard.press('Escape') } await wait(60); continue }
      if(u.win){ await tap('#tabs [data-act="tab"][data-v="'+u.win+'"]',{soft:true}); await wait(60); continue }
      if(u.tab){ await tap('#tabs [data-act="tab"][data-v="'+u.tab+'"]',{soft:true}); await wait(60); continue } }
    return false }
  async function closeWorld(){ const u=await ust(); if(u.win&&!PAUSING.has(u.win)){ await clickOutside(); const v=await ust(); if(v.win===u.win) await p.keyboard.press('Escape') } }
  async function openTab(k){ await dismiss(); let u=await ust(); if(u.win===k||u.tab===k) return true;
    if(u.pop){ await p.keyboard.press('Escape'); await wait(50) }
    if(!(await okTap('#tabs [data-act="tab"][data-v="'+k+'"]'))) return false; await wait(120); u=await ust(); return u.win===k||u.tab===k }
  async function closeTab(k){ const u=await ust(); if(u.win===k||u.tab===k){ await tap('#tabs [data-act="tab"][data-v="'+k+'"]',{soft:true}); await wait(60) } }
  async function waitWin(pid){ for(let i=0;i<8;i++){ if((await ust()).win===pid) return true; await wait(80) } return false }
  async function openWorld(pid){
    await dismiss(); const u=await ust(); if(u.win===pid&&!u.pop) return true;
    await home();
    if(await okTap('#map .wd[data-p="'+pid+'"] circle[fill="transparent"]',{soft:true})&&await waitWin(pid)) return true;
    rec('open-world-via-list',{pid});   // under a panel or off the chart: the player opens it from the Worlds list
    await home(); if(!(await openTab('worlds'))) return false;
    if(await okTap('#side .tr[data-v="'+pid+'"]')&&await waitWin(pid)) return true;
    addIssue('warn','world-not-openable','мир '+pid+' не открылся ни с карты, ни из списка Worlds',await shot('world-not-open')); return false }

  /* ---------- скорость ---------- */
  async function ensureRunning(){ const s=await S(); if(!s||s.over||s.big) return;
    if(s.win&&PAUSING.has(s.win)) return;   // the bot is in the middle of a task: Yard / Earth / Ark stand the clock on purpose
    if(s.paused||s.speed!==10){ if(s.pop) await p.keyboard.press('Escape'); await tap('#top [data-act="spd"][data-v="10"]',{soft:true}) } }

  /* ---------- аудит экрана ---------- */
  async function audit(tag){
    const r=await p.evaluate(()=>{ const out=[]; const vw=innerWidth, vh=innerHeight;
      const vis=e=>{ const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return null; const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0) return null; return r };
      const name=e=>(e.id?'#'+e.id:e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/)[0]:''))+' «'+(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,40)+'»';
      var LEAK=[[/undefined/,'undefined'],[/NaN/,'NaN'],[/\[object /,'[object]'],[/\{[a-zA-Z0-9]+\}/,'{плейсхолдер}'],[/Infinity/,'Infinity'],[/(^|[^a-zA-Z])null([^a-zA-Z]|$)/,'null']];
      var tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT), tn, leaks=0;
      while((tn=tw.nextNode())&&leaks<6){ var pe=tn.parentElement; if(!pe||pe.closest('#god,#god-tab,script,style,noscript,#logbox')) continue; var tx=tn.textContent; if(!tx.trim()) continue;
        for(var li=0;li<LEAK.length;li++){ var mm=tx.match(LEAK[li][0]); if(mm){ var rr=vis(pe); out.push(['crit','text-leak',LEAK[li][1]+' в '+name(pe)+(rr?'':' (скрыт)')+': «'+tx.replace(/\s+/g,' ').trim().slice(0,70)+'»']); leaks++; break } } }
      if(document.documentElement.scrollWidth>vw+2) out.push(['warn','page-hscroll','страница шире окна: '+document.documentElement.scrollWidth+'>'+vw]);
      if(document.documentElement.scrollHeight>vh+2&&getComputedStyle(document.body).overflowY!=='hidden') out.push(['info','page-vscroll','страница выше окна: '+document.documentElement.scrollHeight+'>'+vh]);
      var n=0, tiny=0, els=document.querySelectorAll('body *');
      for(var i=0;i<els.length&&n<40;i++){ var e=els[i]; if(e.closest('#god,#god-tab,svg,#logbox')) continue; var r=vis(e); if(!r) continue;
        var cs=getComputedStyle(e), own=Array.prototype.some.call(e.childNodes,function(c){return c.nodeType===3&&c.textContent.trim()});
        if(own&&e.scrollWidth>e.clientWidth+2&&cs.overflowX!=='visible'&&cs.overflowX!=='auto'&&cs.overflowX!=='scroll'){ out.push(['warn','clipped-text','обрезан по ширине: '+name(e)]); n++ }
        if(own&&parseFloat(cs.fontSize)<10) tiny++;
        if(own&&r.right>vw+3){ out.push(['warn','offscreen','за правым краем: '+name(e)]); n++ }
        if(e.matches('[aria-disabled="true"]')&&!e.dataset.why&&(e.tagName==='BUTTON'||e.matches('[data-act]'))){ out.push(['warn','disabled-no-reason','кнопка заблокирована без причины: '+name(e)]); n++ } }
      if(tiny>60) out.push(['info','tiny-font',tiny+' текстовых элементов мельче 10px']);
      // окна: не вылезают за экран, содержимое не обрезано
      var win=document.querySelector('#ovl.on .win'); if(win){ var wr=win.getBoundingClientRect();
        if(wr.bottom>vh+2||wr.right>vw+2||wr.top<-2||wr.left<-2) out.push(['warn','win-offscreen','окно вылезает за экран: '+name(win)+' '+Math.round(wr.left)+','+Math.round(wr.top)+'–'+Math.round(wr.right)+','+Math.round(wr.bottom)+' из '+vw+'×'+vh]);
        var bd=win.querySelector('.bd'); if(bd&&bd.scrollHeight>bd.clientHeight+6&&getComputedStyle(bd).overflowY==='visible') out.push(['warn','win-clipped','содержимое окна не влезает и не прокручивается: '+name(win)]) }
      var sd=document.querySelector('#side.on'); if(sd){ var sr=sd.getBoundingClientRect(); if(sr.bottom>vh+2) out.push(['warn','side-offscreen','панель вкладки ниже экрана']) }
      // подписи на карте
      var labs=Array.prototype.filter.call(document.querySelectorAll('#map .wd text'),function(t){ return vis(t)&&t.textContent.trim().length>=3 }), ov=0, ex='';
      for(var a=0;a<labs.length&&ov<6;a++){ var ra=labs[a].getBoundingClientRect(); for(var c=a+1;c<labs.length;c++){ var rb=labs[c].getBoundingClientRect();
        var ix=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left), iy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
        if(labs[a].textContent.trim()!==labs[c].textContent.trim()&&ix>2&&iy>2&&ix*iy>0.3*Math.min(ra.width*ra.height,rb.width*rb.height)){ ov++; ex=ex||labs[a].textContent.trim()+' × '+labs[c].textContent.trim() } } }
      if(ov) out.push(['warn','map-label-overlap','подписи на карте налезают друг на друга ('+ov+'+): '+ex]);
      // значок советника совпадает с тем, что в списке
      try{ var ab=document.querySelector('#top .adv b'); if(ab&&+ab.textContent!==LNI.adv().length) out.push(['warn','adv-badge','число на кнопке советника '+ab.textContent+' ≠ строк '+LNI.adv().length]) }catch(e){}
      return out }).catch(()=>[]);
    const fresh=r.filter(([sev,kind,detail])=>!issues.has(kind+'|'+String(detail).replace(/\d+/g,'#').slice(0,80)));
    const f=fresh.length?await shot(tag+'-'+fresh[0][1]):null; for(const [sev,kind,detail] of r) addIssue(sev,kind,detail,f) }

  /* ---------- старт: язык, зерно, ход ---------- */
  rec('start',{page:path.basename(page),viewport:VP.join('x'),seed:SEED,style:STYLE});
  if(!(await okTap('#noteL [data-lang="en"]'))) addIssue('crit','no-lang','окно выбора языка не нашлось или не нажалось');
  await wait(150); await audit('lang');
  if(await okTap('#top [data-act="pop"][data-v="menu"]')){ await wait(100);
    if(await vis('#seedin')){ await p.fill('#seedin',SEED); await okTap('#pop [data-act="new"]'); await wait(200) } else addIssue('warn','no-seed-field','в меню ≡ нет поля сида') }
  const st0=await S(); if(!st0||String(await p.evaluate(()=>LN.seed))!==SEED) addIssue('warn','seed-not-set','сид не применился через меню: '+(await p.evaluate(()=>LN.seed)));
  await audit('start'); await keyShot('start','start');
  if(BRAIN==='sim'){
    const simSrc=fs.readFileSync(path.join(ROOT,'tools','sim.js'),'utf8');
    const names=(simSrc.match(/const names=\[([\s\S]*?)\];/)||[])[1];
    const inPage=simSrc.replace("const fs=require('fs');","const fs=null;").replace(/module\.exports=[^\n]*\n/,'window.SIM={STYLES,step};\n').replace('if(require.main===module){','if(false){');
    await p.addScriptTag({content:inPage});
    await p.evaluate(names=>{ const list=eval('['+names+']'); window.__C=Object.fromEntries(list.map(n=>[n,window[n]])); window.__st={idleY:{},fuelHist:[],want:{}}; window.__lastDay=-1 },names);
    rec('brain',{brain:'sim',style:STYLE}) }
  await tap('#top [data-act="spd"][data-v="10"]');
  marks.push({t:wall(),year:0,what:'игра начата на ×10'});

  /* ---------- учёт действий ---------- */
  const lastDid={}, lastTry={}, did=[], failWhy={}; let lastActYear=0; const idleStretches=[];
  const cool={}; const dur={}, durN={}; const tm={audit:0,tour:0,dismiss:0,skip:0,policy:0};   // (мир:действие) → год последней попытки
  async function act(name,fn){ const tA=Date.now(); const s0=await S(); const y0=s0?s0.day:curYear; lastTry[name]=y0; lastWhy.v=null; let ok=false;
    try{ ok=await Promise.race([fn(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('act timeout 25s')),25000))]) }catch(e){ rec('bot-error',{act:name,err:String(e).slice(0,200)}); addIssue('warn','bot-error',name+': '+String(e).slice(0,120)) }
    const s1=await S(); const y1=s1?s1.day:y0;
    dur[name]=(dur[name]||0)+(Date.now()-tA); durN[name]=(durN[name]||0)+1;
    if(ok){ rec('act',{act:name,year:y1}); did.push(name); lastActYear=y1; lastDid[name]=y1 }
    else{ rec('act-fail',{act:name,year:y0,why:lastWhy.v}); const k=name+' ← '+(lastWhy.v||'не получилось'); failWhy[k]=(failWhy[k]||0)+1 }
    return ok }
  const every=(name,years,y)=>(lastTry[name]===undefined)||(y-lastTry[name]>=years);
  const coolOk=(key,years,y)=>(cool[key]===undefined)||(y-cool[key]>=years);

  /* ---------- действия в окнах ---------- */
  // свободный мир: окно мира → «Send settlers»
  async function actSettle(pid){
    if(!(await openWorld(pid))) return false;
    if(!(await hasEl('#ovl [data-act="send"][data-p="'+pid+'"]'))){ rec('settle-no-button',{pid}); await closeWorld(); return false }
    if(!lastDid.whoTried&&(await p.locator('#ovl [data-act="who"]').count())>1){ lastDid.whoTried=1; await tap('#ovl [data-act="who"]:not(.on)') }   // pick another hull once: the radio must work
    const r=await tap('#ovl [data-act="send"][data-p="'+pid+'"]');
    await wait(150); const st=await p.evaluate(pid=>LNI.wst(pid),pid).catch(()=>null);
    if(r==='ok'&&st==='settling'){ await keyShot('settle','settlers-sent'); await closeWorld(); return true }
    await closeWorld(); return false }
  // в открытом окне заселённого мира: свободное судно → линия, иначе заказ под линию, иначе судно с другой линии
  async function fixAdd(pid,wantBig){
    // a crew is people: hulls past the cap eat Earth's hands (a first run ordered 29 couriers and starved Earth)
    const cap=RUSH?4:SER?2:3, have=await p.evaluate(pid=>onLine(LN,pid).length,pid).catch(()=>0), tot=await p.evaluate(()=>LN.ships.filter(s=>s.mode!=='dead').length).catch(()=>0);
    if(have>=cap||tot>5*Math.max(1,Object.keys(await p.evaluate(()=>LN.colonies).catch(()=>({}))).length)+4){ lastWhy.v='line-cap'; return null }
    if(await hasEl('#ovl [data-act="addtab"][data-v="free"].on')===false&&await hasEl('#ovl [data-act="addtab"][data-v="free"]')) await tap('#ovl [data-act="addtab"][data-v="free"]',{soft:true});
    // каждое четвёртое назначение — путём вкладки Fleet (pick → pickgo), чтобы проверить и этот путь
    if((lastDid.assignN||0)%4===3&&await hasEl('#ovl [data-act="assign"][data-p="'+pid+'"]')){
      lastDid.assignN=(lastDid.assignN||0)+1; const fid=await p.evaluate(()=>{ const s=LN.ships.find(x=>x.mode==='idle'&&x.at==='earth'&&!(x.from&&x.to)&&!x.pend&&!x.mutiny&&!x.crewWait&&!x.job); return s?s.id:null });
      if(fid!==null&&await viaFleet(fid,pid)) return 'fleet-assign' }
    if(await hasEl('#ovl #addblk [data-act="assign"][data-p="'+pid+'"]')){
      const r=await tap('#ovl #addblk [data-act="assign"][data-p="'+pid+'"]'); if(r==='ok'){ lastDid.assignN=(lastDid.assignN||0)+1; await keyShot('assign','first-line-assigned'); return 'assign' } }
    const prefs=(wantBig||RUSH)?['freighter','hauler','courier']:['courier'];
    for(const cls of prefs){ const sel='#ovl [data-act="order"][data-p="'+pid+'"][data-c="'+cls+'"]';
      if(await hasEl(enabled(sel))&&(await tap(enabled(sel)))==='ok'){ await keyShot('order','first-order'); return 'order:'+cls } }
    // ни свободного, ни заказа: прочитать причину у кнопки заказа курьера, затем попробовать судно с другой линии
    const cs='#ovl [data-act="order"][data-p="'+pid+'"][data-c="courier"]'; if(await hasEl(cs)) await tap(cs,{soft:true});
    if(await hasEl('#ovl [data-act="addtab"][data-v="other"]')){ await tap('#ovl [data-act="addtab"][data-v="other"]',{soft:true}); await wait(80);
      const mv='#ovl [data-act="move"][data-p="'+pid+'"]';
      if(await hasEl(enabled(mv))&&(await tap(enabled(mv)))==='ok'){ await tap('#ovl [data-act="addtab"][data-v="free"]',{soft:true}); return 'move' }
      await tap('#ovl [data-act="addtab"][data-v="free"]',{soft:true}) }
    return null }
  async function viaFleet(sid,pid){
    if(!(await openTab('fleet'))) return false;
    await tap('#side [data-act="filter"][data-v="free"]',{soft:true});
    if(!(await okTap('#side [data-act="pick"][data-v="send:'+sid+'"]'))){ await closeTab('fleet'); return false }
    await wait(100);
    const ok=await okTap('#pop [data-act="pickgo"][data-v="send:'+sid+':'+pid+'"]');
    if(!ok&&await hasEl('#pop .cancel')) await tap('#pop .cancel',{soft:true});
    await closeTab('fleet'); return ok }
  async function actLine(pid,wantBig){
    if(!(await openWorld(pid))) return false;
    const how=await fixAdd(pid,wantBig); await wait(80); await closeWorld(); return !!how }
  // эвакуация в открытом окне мира
  async function fixEvac(pid){
    const sel='#ovl [data-act="evac"][data-p="'+pid+'"]'; if(!(await hasEl(sel))) return null;
    const r=await tap(sel);
    if(r==='ok'){ await keyShot('evac','evacuation-ordered'); return 'evac' }
    if(lastWhy.v==='evacNoCourier') lastDid.wantCourier=curYear;
    return null }
  async function fixOrd(pid){ for(const cls of ['freighter','hauler','courier']){ const sel='#ovl [data-act="order"][data-p="'+pid+'"][data-c="'+cls+'"]'; if(await hasEl(enabled(sel))&&(await tap(enabled(sel)))==='ok') return 'order:'+cls } return null }
  async function actKit(pid){
    if(!(await openWorld(pid))) return false;
    const sel='#ovl #mach [data-act="kit"][data-p="'+pid+'"]'; let ok=false;
    if(await hasEl(enabled(sel))) ok=(await tap(enabled(sel)))==='ok';
    await closeWorld(); return ok }

  // советник: строка с проблемой → окно мира с подсвеченным местом → исправление
  const advSeen=new Map();
  async function actAdvisor(s){
    await home();
    if(!(await okTap('#top .adv'))) return false; await wait(100);
    const rows=await p.evaluate(()=>[...document.querySelectorAll('#pop .advl button[data-act="world"]')].map(b=>({v:b.dataset.v,f:b.dataset.f,t:b.innerText.replace(/\s+/g,' ').trim()}))).catch(()=>[]);
    for(const r of rows){ const k=r.t.replace(/\d+/g,'#'); const x=advSeen.get(k)||{n:0,year:s.day,t:r.t}; x.n++; advSeen.set(k,x) }
    rec('adv-rows',{n:rows.length,rows:rows.slice(0,5)});
    if(!rows.length){ await p.keyboard.press('Escape'); return false }
    let pick=null; for(const r of rows){ if(r.f==='add'&&s.wst[r.v]==='dry') continue; if(coolOk('adv:'+r.v+':'+r.f,r.f==='evac'?25:30,s.day)){ pick=r; break } }   // a dead seam with a pile left: the hulls already there haul it, more crews would only eat Earth's hands
    if(!pick){ await p.keyboard.press('Escape'); await wait(60); return false }
    cool['adv:'+pick.v+':'+pick.f]=s.day;
    if(!(await okTap('#pop .advl button[data-act="world"][data-v="'+pick.v+'"][data-f="'+pick.f+'"]'))) return false;
    const lit0=await p.evaluate(()=>document.querySelectorAll('#ovl .focus').length).catch(()=>0);   // right after the press, before the next tick redraws the window
    if(!(await waitWin(pick.v))){ addIssue('warn','adv-row-dead','строка советника не открыла мир '+pick.v+': «'+pick.t.slice(0,60)+'»'); return false }
    const lit=lit0;
    if(!lit&&pick.f!=='mach') addIssue('info','adv-no-focus','после строки советника ('+pick.f+') в окне мира нет подсветки места исправления (нет сразу или пропала за 0.1 с)');
    else if(lit&&(lastDid.focusChecks=(lastDid.focusChecks||0)+1)<=4){ await wait(500); const still=await p.evaluate(()=>document.querySelectorAll('#ovl .focus').length).catch(()=>0); const run=!((await S())||{}).halted;
      if(!still&&run) addIssue('info','adv-focus-lost','подсветка места исправления ('+pick.f+') исчезла меньше чем за 0.5 с: окно перерисовалось вместе с ходом времени') }
    let how=null;
    if(pick.f==='evac'||pick.f==='lift') how=await fixEvac(pick.v);
    else if(pick.f==='add') how=await fixAdd(pick.v,false);
    else if(pick.f==='ord') how=await fixOrd(pick.v);
    rec('adv-fix',{pid:pick.v,f:pick.f,how,text:pick.t.slice(0,90)}); if(!how) cool['adv:'+pick.v+':'+pick.f]=s.day+50;   // nothing to do here (cap, no courier): do not come back at once
    if(!how&&(lastDid.advFailShots||0)<3){ lastDid.advFailShots=(lastDid.advFailShots||0)+1; await shot('adv-nofix-'+pick.f); rec('adv-nofix-dom',{pid:pick.v,f:pick.f,dom:await p.evaluate(()=>(document.querySelector('#ovl .win')||{innerText:''}).innerText.replace(/s+/g,' ').slice(0,600))}) }
    await closeWorld(); return !!how }

  // Yard: построить свободное судно нужного класса
  async function actBuild(cls){
    if(!(await openTab('yard'))) return false;
    const idx=await p.evaluate(c=>{ const i=currentHull(LN,c); return i===null?null:i },cls);
    let ok=false;
    if(idx!==null){ const sel='#ovl [data-act="build"][data-h="'+idx+'"]'; if(await hasEl(sel)) ok=(await tap(sel))==='ok' }
    await closeTab('yard'); return ok }
  // Tech: разведка кольца / программа двигателя
  async function actTech(s){
    if(!(await openTab('tech'))) return false; let ok=false;
    if(s.canSurvey==='ok'&&await hasEl('#side [data-act="survey"]')){ ok=(await tap('#side [data-act="survey"]'))==='ok'; if(ok) await keyShot('survey','ring-charted') }
    if(!ok&&!s.driveRunning&&await hasEl('#side [data-act="drive"]')){
      const chips=await p.locator('#side [data-act="driveat"]').count(); if(chips>1&&!lastDid.chipTried){ lastDid.chipTried=1; await tap('#side [data-act="driveat"]:not(.on)',{soft:true}) }
      ok=(await tap('#side [data-act="drive"]'))==='ok'; if(ok) await keyShot('drive','drive-programme-started') }
    await closeTab('tech'); return ok }
  // Fleet: поиск пропавшего судна
  async function actSearch(s){
    if(!(await openTab('fleet'))) return false; await tap('#side [data-act="filter"][data-v="away"]',{soft:true});
    let ok=false; for(const m of s.missing){ const sel='#side [data-act="search"][data-m="'+m+'"]'; if(await hasEl(sel)){ ok=(await tap(sel))==='ok'; if(ok) break } }
    await closeTab('fleet'); return ok }

  // Ark: вклады уровней
  async function actArk(s){
    if(!(await openTab('ark'))) return false;
    if(!(await hasEl('#ovl [data-act="arkbuy"]'))){ await closeTab('ark'); return false }
    let levels; const left=s.nightLeft;
    if(RUSH) levels=[4,3,2,1]; else if(SER) levels=[2,1]; else levels=[2,1,3,4];
    let ok=false;
    for(const l of levels){ if(l<=s.arkLv) continue; const sel='#ovl [data-act="arkbuy"][data-l="'+l+'"]'; if(!(await hasEl(sel))) continue;
      if(RICH&&GOD&&!(await hasEl(enabled(sel)))){ await p.evaluate(()=>{ const E=LN.earth; for(const k of ['metal','food','fuel','parts']) E[k]=Math.max(E[k],12000); LNdraw() }); rec('rich-top-up',{l}); await wait(150) }
      if(await hasEl(enabled(sel))){ if((await tap(enabled(sel)))==='ok'){ ok=true; await keyShot('ark'+l,'ark-level-'+l+'-bought'); break } }
      else await tap(sel,{soft:true}) }   // refused: read why
    await closeTab('ark'); return ok }
  // конвой: сначала судна у пирса в резерв, потом достроить недостающий класс
  async function actConvoy(s){
    if(!s.cv||s.cv.ok) return false;
    if(!(await openTab('yard'))) return false; let n=0;
    for(let k=0;k<12;k++){
      const pickId=await p.evaluate(()=>{ const cv=arkConvoy(LN), res={courier:0,hauler:0,freighter:0};
        for(const s of LN.ships){ if(s.reserve&&convoyHull(LN,s)) res[shipClass(s)]++ }
        for(const s of LN.ships){ const c=shipClass(s); if(s.reserve||s.mutiny||!convoyHull(LN,s)) continue; if(res[c]<cv.need[c]) return s.id } return null });
      if(pickId===null) break;
      const sel='#ovl [data-act="reserve"][data-s="'+pickId+'"][data-on="1"]';
      if(!(await hasEl(sel))) break; if((await tap(sel))!=='ok') break; n++; await wait(60) }
    if(n) await keyShot('convoy','convoy-reserved');
    let built=false;
    const short=await p.evaluate(()=>{ const cv=arkConvoy(LN), res={courier:0,hauler:0,freighter:0}; for(const s of LN.ships){ if(s.reserve&&convoyHull(LN,s)) res[shipClass(s)]++ }
      return CLASSES.map(c=>({c,d:cv.need[c]-res[c]})).filter(x=>x.d>0) });
    if(short.length&&RICH&&GOD){ await p.evaluate(()=>{ const E=LN.earth; for(const k of ['metal','fuel','parts']) E[k]=Math.max(E[k],20000); E.people=Math.max(E.people,400); LNdraw() }); richTops++; rec('rich-convoy',{}); await wait(100) }
    for(const sh of short.slice(0,3)){ const idx=await p.evaluate(c=>currentHull(LN,c),sh.c); const sel='#ovl [data-act="build"][data-h="'+idx+'"]'; if(idx!==null&&await hasEl(sel)&&(await tap(sel))==='ok') built=true }
    await closeTab('yard'); return n>0||built }

  /* ---------- политика игрока ---------- */
  async function pickSettleTarget(skipIds){
    return p.evaluate(skip=>{ const E=LN.earth; let best=null,bv=-1e9;
      const live=k=>Object.keys(LN.colonies).some(c=>planet(c).kind===k&&(LN.reserves[c]>0||k==='works'));
      const nd=LN.need||{food:5,metal:3};
      for(const q of PLANETS){ if(!sectorOpen(LN,q.sec)||LN.colonies[q.id]||LN.ghost[q.id]||skip.includes(q.id)) continue; if(LNI.wst(q.id)!=='free') continue;
        const sh=LN.ships.find(x=>x.mode==='idle'&&x.at==='earth'&&!(x.from&&x.to)&&!x.pend&&!x.mutiny&&!x.crewWait&&!x.job&&canReachSector(x,q.sec)); if(!sh) continue;
        let v=-q.dist; if(!live(q.kind)) v+=400;   // one of each kind first
        if(q.kind==='farm'&&E.food<nd.food*40) v+=800; if(q.kind==='well'&&E.fuel<150) v+=700; if(q.kind==='works'&&E.parts<80&&Object.keys(LN.colonies).length>=2) v+=500; if(q.kind==='mine'&&E.metal<nd.metal*30) v+=600;
        if(v>bv){bv=v;best=q.id} } return best },skipIds) }
  async function policy(s){
    const y=s.day;
    // 1. ночь: ковчег и конвой
    if(s.night&&s.nightSeen){
      const left=s.nightLeft;
      const wantArk=RUSH?(left<=600&&s.arkLv<4):SER?(s.arkLv<2):(left<=1200&&s.arkLv<2);
      if(wantArk&&every('ark',RUSH?15:30,y)){ if(await act('ark',()=>actArk(s))) return true }
      if((s.arkLv>=1||left<=1600)&&s.cv&&!s.cv.ok&&every('convoy',12,y)){ if(await act('convoy',()=>actConvoy(s))) return true }
    }
    // 2. советник: эвакуация, линии, заказы
    if(s.adv&&every('advisor',3,y)&&s.advR.some(r=>!(r.f==='add'&&s.wst[r.v]==='dry')&&coolOk('adv:'+r.v+':'+r.f,r.f==='evac'?25:30,y))){ if(await act('advisor',()=>actAdvisor(s))) return true }
    // 3. заселить: свободный мир и свободное судно
    const colGap=RUSH?1:SER?30:6;
    if(s.free>0&&every('settle',colGap,y)){
      const skip=Object.keys(cool).filter(k=>k.startsWith('settle:')&&y-cool[k]<10).map(k=>k.slice(7));
      const pid=await pickSettleTarget(skip);
      if(pid){ cool['settle:'+pid]=y; if(await act('settle',()=>actSettle(pid))) return true } }
    // 4. линии: мир без линии или с недогрузом (то же, что говорит советник, — на случай, когда он молчит)
    if(every('line',RUSH?3:6,y)){
      let pid=null,big=false; for(const k in s.lines){ const st=s.wst[k], n=s.lines[k]; const cap=RUSH?3:SER?2:2;
        if((st==='noline'||st==='half'||st==='starve'||n===0)&&n<cap&&coolOk('line:'+k,20,y)){ pid=k; big=st==='half'; break } }
      if(pid){ cool['line:'+pid]=y; if(await act('line',()=>actLine(pid,big))) return true } }
    // 5. суда: свободных нет, а миры ждут — построить в Yard
    const freeWorlds=await p.evaluate(()=>PLANETS.some(q=>sectorOpen(LN,q.sec)&&LNI.wst(q.id)==='free'));
    if((s.free<1&&(freeWorlds||lastDid.wantCourier===y||s.cols<3))&&s.building<2&&!(s.night&&s.cv&&s.cv.ok)&&every('build',RUSH?2:SER?10:5,y)){
      const cls=(lastDid.wantCourier&&y-lastDid.wantCourier<40)?'courier':(s.metal>1500&&s.cols>=4&&y%3===0?'hauler':'courier');
      if(await act('build',()=>actBuild(cls))) return true }
    // 6. Tech: разведка кольца и программа двигателя (флаг вкладки)
    if((s.flags.tech||s.canSurvey==='ok')&&!(s.night&&s.arkLv>=1&&s.driveRunning)&&every('tech',RUSH?5:12,y)){
      if(await act('tech',()=>actTech(s))) return true }
    // 7. пропавшие суда
    if(s.missing.length&&every('search',30,y)){ if(await act('search',()=>actSearch(s))) return true }
    // 8. машины на мир, когда много металла и деталей
    if(s.metal>2500&&s.parts>400&&s.cols>=3&&every('kit',40,y)){
      const pid=await p.evaluate(()=>{ try{ for(const k in LN.colonies){ if(kitOpen(LN)&&canKit(LN,k)==='ok') return k } }catch(e){} return null });
      if(pid&&await act('kit',()=>actKit(pid))) return true }
  }

  /* ---------- обход вкладок (аудит всех экранов) ---------- */
  async function tour(tag){
    await home();
    for(const k of ['earth','worlds','tech','yard','fleet','ark']){
      if(await openTab(k)){ await wait(150); await audit(tag+'-'+k); if(k==='worlds'||k==='ark') await keyShot('tour-'+k,'tab-'+k); await closeTab(k) } }
    // окно мира: первый заселённый и первый свободный
    const ids=await p.evaluate(()=>{ const col=Object.keys(LN.colonies)[0], fr=PLANETS.find(q=>sectorOpen(LN,q.sec)&&!LN.colonies[q.id]&&!LN.ghost[q.id]&&LNI.wst(q.id)==='free'); return {col,fr:fr&&fr.id} });
    for(const pid of [ids.col,ids.fr]){ if(!pid) continue; if(await openWorld(pid)){ await wait(150); await audit(tag+'-world'); if(pid===ids.col) await keyShot('tour-world','world-window'); await closeWorld() } }
    await home() }

  /* ---------- главный цикл ---------- */
  const deadline=Date.now()+MIN*60000; let step=0, lastTour=-999, lastShotYear=-999, seenOver=false, lastDay=-1, stuckSince=Date.now(), lastBig=null, bigSince=0;
  let richTops=0; const trace=[]; let lastTrace=-999; let skipYears=0, godSkips=0, realSkips=0, idleRounds=0; const GOD_ACT=+arg('god-act',15), GOD_IDLE=+arg('god-idle',100);
  while(Date.now()<deadline){
    step++;
    let tq=Date.now(); const n0=await dismiss(); if(n0) rec('modals',{n:n0}); tm.dismiss+=Date.now()-tq;
    const s=await S(); if(!s){ rec('no-state',{}); await wait(500); continue }
    curYear=s.day;
    if(s.over){ if(!seenOver){ seenOver=true; marks.push({t:wall(),year:s.day,what:'КОНЕЦ: '+s.over}); await shot('over-'+s.over); await audit('over') } break }
    // зависание: год не идёт дольше 12 секунд при включённых часах
    if(s.day!==lastDay){ lastDay=s.day; stuckSince=Date.now() }
    else if(Date.now()-stuckSince>12000&&!s.halted){ addIssue('crit','clock-stuck','год '+s.day+' не меняется 12+ с при включённых часах',await shot('stuck')); stuckSince=Date.now() }
    // время стоит, а бот не может это снять: большое окно висит дольше 15 секунд
    if(s.big&&s.big!=='over'){ if(s.big!==lastBig){ lastBig=s.big; bigSince=Date.now() } else if(Date.now()-bigSince>15000){ addIssue('crit','modal-stuck','окно «'+s.big+'» не закрывается нажатием кнопки 15+ с',await shot('modal-stuck')); bigSince=Date.now() } } else lastBig=null;
    // вехи
    const first=(k,cond,what)=>{ if(cond&&!marks.some(m=>m.k===k)) marks.push({k,t:wall(),year:s.day,what}) };
    if(s.day-lastTrace>=100){ lastTrace=s.day; trace.push({day:s.day,cols:s.cols,people:s.people,metal:s.metal,food:s.food,fuel:s.fuel,parts:s.parts,ships:s.ships,free:s.free,adv:s.adv,lv:s.arkLv,drive:s.drive}) }
    first('c1',s.cols>=1,'первая колония'); first('c5',s.cols>=5,'5 колоний'); first('c10',s.cols>=10,'10 колоний'); first('sv',s.sectors>2,'открыто третье кольцо');
    first('dr',s.drive>=1,'метка привода I'); first('nt',!!s.night,'Ночь датирована'); first('ark',s.arkLv>=1,'уровень ковчега куплен'); first('cvk',!!(s.cv&&s.cv.ok),'конвой собран'); first('h',s.hungry,'Земля голодает');
    if(s.logOpen){ rec('accidental-log',{year:s.day}); await tap('#logbox [data-act="closelog"]',{soft:true,nd:true}) }
    if(GOD&&RICH&&(s.food<800||s.fuel<120)&&s.day>200){ await p.evaluate(()=>{ const E=LN.earth; if(E.food<800) GOD.res('food',3000); if(E.fuel<120) GOD.res('fuel',600) }); richTops++; rec('rich-feed',{year:s.day}) }   // --rich: the bot is a poor farmer; keep Earth fed so the run reaches the Night
    await ensureRunning();
    let acted=false;
    if(BRAIN==='sim'){
      const d=await p.evaluate(style=>{ const G=LN; if(G.over||G.day===window.__lastDay) return 0; let n=0;
        for(let dd=window.__lastDay<0?G.day:window.__lastDay+1; dd<=G.day; dd++){ SIM.step(window.__C,G,style,dd,window.__st); n++ }
        window.__lastDay=G.day; LNdraw(); return n },STYLE).catch(e=>{ rec('brain-error',{err:String(e).slice(0,200)}); return 0 });
      if(d) lastActYear=s.day; acted=false;
    } else if((!s.big&&!s.pf)||s.pf==='low') { tq=Date.now(); acted=await policy(s); tm.policy+=Date.now()-tq }
    // «нечего делать»: пока бот ничего не мог — копим растяжку
    if(s.day-lastActYear>=150&&!s.over){ if(!idleStretches.length||idleStretches[idleStretches.length-1].to!==undefined) idleStretches.push({from:lastActYear,to:undefined}) }
    else if(idleStretches.length&&idleStretches[idleStretches.length-1].to===undefined){ idleStretches[idleStretches.length-1].to=s.day }
    if(s.day-lastTour>=(GOD?1000:400)&&!s.big){ lastTour=s.day; tq=Date.now(); await tour('y'+s.day); tm.tour+=Date.now()-tq }
    else if(step%8===0){ tq=Date.now(); await audit('y'+s.day); tm.audit+=Date.now()-tq }
    if(SHOTS_ALL&&s.day-lastShotYear>=300){ lastShotYear=s.day; await shot('y'+s.day) }
    // промотка, когда игроку нечего делать (несколько кругов подряд бот ничего не смог): GOD.skip (--god) или настоящая кнопка SKIP (--skip)
    if(acted||s.big) idleRounds=0; else idleRounds++;
    // --god: между решениями бота время перематывается — 15 лет после действия, 100 после пустого круга (пока колоний меньше шести — 6 и 30: рост в начале решает забег) (бот делает ход раз в ~1 с реального времени)
    if(GOD&&s.day<5200&&!s.big&&(acted||idleRounds>=1)){ await home(); const d0=s.day, early=s.cols<6&&s.sectors<=2; let n=acted?(early?6:GOD_ACT):(early?30:GOD_IDLE); if(s.night&&s.nightLeft<2000&&s.nightLeft>150) n=Math.max(n,acted?40:200); if(s.night&&s.arkLv>=1&&s.cv&&s.cv.ok&&s.arkReady) n=Math.max(n,s.nightLeft>400?150:20);
      if(s.night&&s.nightLeft>20&&s.nightLeft<2500){ const rem=Math.max(5,(deadline-Date.now())/1000-MIN*60*0.12), it=(Date.now()-t0)/1000/Math.max(1,step); n=Math.max(n,Math.min(300,Math.ceil(s.nightLeft/(rem/Math.max(0.2,it))))) }
      if(s.hungry||s.food<400) n=Math.min(n,8);   // nobody winds the clock while Earth goes hungry
      await p.evaluate(n=>GOD.skip(n),n); godSkips++; skipYears+=n; rec('god-skip',{from:d0,n}); if(!acted) idleRounds=0 }
    else if(REAL_SKIP&&!GOD&&idleRounds>=3&&!s.big){ await home(); const d0=s.day; if(await okTap('#top [data-act="skip"]')){ await wait(1800); const s2=await S(); if(s2){ realSkips++; skipYears+=Math.max(0,s2.day-d0); rec('real-skip',{from:d0,to:s2.day}) } } idleRounds=0 }
    await wait(80);
  }

  /* ---------- финал ---------- */
  const fin=await S(); await dismiss(); await shot('final'); await audit('final');
  if(fin&&!fin.over){ await tour('final') }
  const finO=await p.evaluate(()=>({over:LN.over||null,souls:LN.souls||0,boarded:LN.boarded||0,arkLv:LN.ark?arkLevel(LN):0,grounded:!!LN.grounded,groundedWhy:LN.groundedWhy||null})).catch(()=>({}));
  const logText=await p.evaluate(()=>{ const e=document.getElementById('logtxt'); return e?String(e.value||'').slice(0,3000):'' }).catch(()=>'');
  const gameLog=await p.evaluate(()=>{ try{ return exportLog(LN) }catch(e){ return JSON.stringify({err:String(e)}) } }).catch(()=>null);
  if(gameLog) fs.writeFileSync(path.join(OUT,'game-log.json'),gameLog);
  const toastAll=await p.evaluate(()=>window.__toasts).catch(()=>[]);
  const toastBad={}; toastAll.filter(t=>/bad/.test(t.cls)).forEach(t=>{ const k=t.txt.replace(/\d+/g,'#').slice(0,110); toastBad[k]=toastBad[k]||{n:0,ex:t.txt,year:t.day}; toastBad[k].n++ });
  fs.writeFileSync(path.join(OUT,'events.json'),JSON.stringify({timing:{dur,durN,tm},trace,marks,interrupts,idleStretches,lost,refusals:[...refusals.entries()],failWhy,advisor:[...advSeen.values()],toasts:toastAll.slice(-300),events:ev.slice(-3000)},null,1));

  const iss=[...issues.values()].sort((a,c)=>({crit:0,warn:1,info:2}[a.sev]-{crit:0,warn:1,info:2}[c.sev])||c.n-a.n);
  const yrs=fin?fin.day:0, secs=wall(); const cnt={}; did.forEach(a=>cnt[a]=(cnt[a]||0)+1);
  const fails={}; ev.filter(e=>e.type==='act-fail').forEach(e=>{ fails[e.act]=(fails[e.act]||0)+1 });
  const totalInt=Object.values(interrupts).reduce((a,c)=>a+c,0);
  const L=[];
  const overTxt=finO.over?('конец игры: '+finO.over+(finO.over==='night'?' · на ковчеге '+(finO.boarded||0)+' · разбужено (души) '+finO.souls+' · уровень ковчега '+finO.arkLv+(finO.grounded?' · ковчег не отплыл ('+finO.groundedWhy+')':''):'')):'жива';
  L.push('# Плейтест LAST BERTH — '+stamp,'',
    '**Страница:** '+path.basename(page)+(GOD?' (режим бога — часть лет промотана GOD.skip ×'+godSkips+', это не чистое время игрока'+(RICH?'; --rich: ресурсы ковчега и еда/топливо Земли добиты через GOD (подкормок ×'+richTops+')':'')+')':'')+(REAL_SKIP&&!GOD?' · кнопка SKIP ×'+realSkips:'')+' · **окно:** '+VP.join('×')+(VP[0]<1180?' (интерфейс масштабируется целиком, цели нажатия мелкие)':'')+' · **seed:** '+SEED+' · **стиль:** '+STYLE,
    '**Итог:** '+overTxt+(BRAIN==='sim'?' · **голова: sim ('+STYLE+')** — действия через API ядра, не кликами':'')+' · год '+yrs+' за '+secs+' с ('+(yrs/Math.max(1,secs)).toFixed(1)+' лет/с'+(skipYears?', из них промотано '+skipYears:'')+') · колоний '+(fin&&fin.cols)+' · людей на Земле '+(fin&&fin.people)+' · колец '+(fin&&fin.sectors)+' · привод '+(fin&&fin.drive)+' · уровень ковчега '+(fin&&fin.arkLv),'');
  L.push('## Найденное ('+iss.length+')','');
  if(!iss.length) L.push('Механических проблем не поймано.','');
  for(const i of iss) L.push('- **['+i.sev+'] '+i.kind+'** ×'+i.n+' · год '+i.year+' — '+i.detail+(i.shot?' · ![]('+i.shot+')':''));
  L.push('','## Что делал игрок','');
  L.push(Object.keys(cnt).length?Object.entries(cnt).map(([k,v])=>k+' ×'+v).join(' · '):'ничего не сделал (!)');
  L.push('','Попытки, не давшие результата (действие ← причина отказа кнопки): '+(Object.keys(failWhy).length?Object.entries(failWhy).sort((a,c)=>c[1]-a[1]).slice(0,12).map(([k,v])=>k+' ×'+v).join('; '):'нет'));
  L.push('','**Вехи** (год / секунды реального времени):',''); for(const m of marks) L.push('- год '+m.year+' · '+m.t+' с — '+m.what);
  L.push('','## Отказы кнопок (нажал заблокированную — игрок увидел причину)','');
  const rf=[...refusals.entries()].sort((a,c)=>c[1].n-a[1].n);
  if(!rf.length) L.push('Заблокированных кнопок бот не нажимал.');
  else for(const [k,v] of rf.slice(0,25)) L.push('- '+k+' ×'+v.n+' · тост: «'+v.text+'» · с года '+v.year);
  L.push('','## Где застрял','');
  const failTop=Object.entries(fails).sort((a,c)=>c[1]-a[1]);
  L.push('- Неудачные попытки по действиям: '+(failTop.length?failTop.map(([k,v])=>k+' ×'+v).join(', '):'нет'));
  const idleTotal=idleStretches.reduce((a,x)=>a+((x.to===undefined?yrs:x.to)-x.from),0);
  L.push('- Стоял без дела (≥150 лет подряд, бот не нашёл что нажать): '+idleStretches.length+' раз, всего '+idleTotal+' лет из '+yrs+(idleStretches.length?'; начала: '+idleStretches.slice(0,6).map(x=>x.from).join(', '):''));
  L.push('- Потерянные нажатия (страница перерисовалась между нажатием и отпусканием): '+lost.n+'; повторено '+lost.retried+', не удалось '+lost.gaveUp);
  L.push('','## Игровой опыт (цифры)','');
  L.push('- Прерываний большими окнами: **'+totalInt+'**'+(totalInt?' ('+Object.entries(interrupts).map(([k,v])=>k+' ×'+v).join(', ')+')':'')+' — на 100 лет: '+(totalInt/Math.max(1,yrs)*100).toFixed(1));
  const advTop=[...advSeen.values()].sort((a,c)=>c.n-a.n).slice(0,8);
  L.push('- Строки советника (чаще всего): '+(advTop.length?advTop.map(a=>'«'+a.t.slice(0,90)+'» ×'+a.n).join('; '):'советник молчал'));
  const tb=Object.values(toastBad).sort((a,c)=>c.n-a.n).slice(0,10);
  L.push('- Красные тосты (`.toast.bad`): '+(tb.length?tb.map(t=>'«'+t.ex.slice(0,100)+'» ×'+t.n).join('; '):'нет'));
  L.push('','Ряд по векам (каждые ~300 лет): год · колоний · люди · металл · еда · топливо · детали · судов (свободных) · строк советника',''); L.push('```');
  trace.filter((x,i)=>i%3===0).forEach(x=>L.push(x.day+' · '+x.cols+' · '+x.people+' · '+x.metal+' · '+x.food+' · '+x.fuel+' · '+x.parts+' · '+x.ships+' ('+x.free+') · '+x.adv)); L.push('```');
  L.push('','## Журнал игры (хвост экспорта)','','```',(logText||'(журнал в окне не открывался; полный — game-log.json)').split('\n').slice(0,30).join('\n'),'```','');
  L.push('Файлы: `events.json` (всё сделанное и увиденное), `game-log.json` (экспорт лога игры для balance), `shots/`.','');
  L.push('> Бот ловит механику, а не ощущение. Ощущение — по скриншотам из `shots/`. Каждую находку перепроверяй по скриншоту.');
  fs.writeFileSync(path.join(OUT,'report.md'),L.join('\n'));
  await b.close();
  console.log('playtest → '+path.join(OUT,'report.md')); console.log('год '+yrs+' · '+overTxt+' · проблем: crit '+iss.filter(i=>i.sev==='crit').length+' · warn '+iss.filter(i=>i.sev==='warn').length+' · info '+iss.filter(i=>i.sev==='info').length+' · окон '+totalInt);
  process.exit(iss.some(i=>i.sev==='crit')?1:0);
})().catch(e=>{ console.error('PLAYTEST CRASH',e); process.exit(3) });
