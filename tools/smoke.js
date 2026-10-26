// smoke — v4.35 interface, один сквозной прогон, реальная мышь:
// язык → поселить ближайшую ферму через окно мира → дождаться посадки → второе судно на линию (assign) →
// 200 лет на ×4 (смена / события / личные дела закрываются кнопками) → вкладки Worlds · Earth · Tech · Yard · Fleet · Ark → нет ошибок страницы.
// v4.40: главное меню → терминал — SKIP (раньше экран запуска), первая подсказка — SKIP THE HELPER (путь игрока, который обучение не хочет); голос Александры закрывается нажатием. Без скриншотов. Запуск через tools/regress.sh smoke (пути переписывает regress.sh).
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,200):''));
const WORK=process.env.LB_WORK||require('path').resolve(__dirname,'..','work');
(async()=>{ let b; try{
  b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  // Клик настоящей мышью по центру элемента. Координаты читаются одним вызовом (панели перерисовываются каждый тик при 10×);
  // пока элемента нет — повтор. Элемент прокручивается в видимую часть.
  const tap=async sel=>{ for(let k=0;;k++){ const bb=await p.evaluate(q=>{ const e=document.querySelector(q); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return r.width?{x:r.left+r.width/2,y:r.top+r.height/2}:null },sel);
    if(bb){ await p.mouse.click(bb.x,bb.y); await p.waitForTimeout(120); return } if(k>=6) throw new Error('no '+sel); await p.waitForTimeout(150) } };
  const SPD10='[data-act="spd"][data-v="4"]', PAUSE='[data-act="spd"][data-v="0"]';
  // закрыть всё, что останавливает время: смена (с остановкой), событие, Ночь, личное дело
  const clear=async()=>{ for(let i=0;i<8;i++){ const k=await p.evaluate(()=>LNI.big());
      if(k==='shift') await tap('[data-act="shiftok"]'); else if(k==='night') await tap('[data-act="nightok"]'); else if(k==='note') await tap('[data-act="noteok"]'); else break }
    if(await p.isVisible('#pfL [data-act="pfok"]')) await tap('#pfL [data-act="pfok"]');
    if(await p.isVisible('#voice.on')) await tap('#voice') };
  // идти на ×4, закрывая окна, пока cond() не станет истиной (или cap итераций)
  const until=async(cond,cap)=>{ for(let t=0;t<cap;t++){ if(await cond()) return true; await clear(); if(await p.evaluate(()=>LNU.paused)) await tap(SPD10); await p.waitForTimeout(250) } return !!(await cond()) };
  const day=()=>p.evaluate(()=>LN.day);
  await p.goto(require('url').pathToFileURL(WORK).href+'/page.html'); await p.waitForTimeout(300);
  // 1. v4.40: главное меню — «Новая игра» мышью: нырок, терминал Пульта, SKIP (язык меню — из браузера, здесь en)
  ok('main menu first, the clock stands', await p.isVisible('#menu .mit[data-id="new"]')&&await p.evaluate(()=>LNU.menu&&LNI.halted()));
  await tap('#menu .mit[data-id="new"]');
  for(let i=0;i<80&&!(await p.isVisible('#menu .mterm'));i++) await p.waitForTimeout(150);
  ok('the dive leads to the terminal', await p.isVisible('#menu .mterm'));
  await tap('#menu [data-m="skip"]'); for(let i=0;i<20&&await p.evaluate(()=>LNU.menu);i++) await p.waitForTimeout(100);
  ok('SKIP: the menu is gone, the run begins', await p.evaluate(()=>!LNU.menu&&LNU.langPicked&&LNI.big()===null&&LNU.lang==='en'));
  ok('first rule of the helper', await p.isVisible('#helper.on [data-act="tutskip"]'));
  await tap('#helper [data-act="tutskip"]');
  ok('helper skipped: everything open', await p.evaluate(()=>!LNI.tut().lock&&!LNI.tut().msg&&document.querySelectorAll('#tabs [data-act="tab"]').length===6));
  // фиксированный сид — через меню ≡, как игрок
  await tap('[data-act="pop"][data-v="menu"]'); await p.fill('#seedin','309573272'); await tap('[data-act="new"]');
  await p.waitForTimeout(200);
  // v4.41 (Никита 24.10): обучение есть в каждой новой игре; выключенное — только на ту партию
  ok('the next game starts with the helper again', await p.evaluate(()=>LNI.tut().help&&LNI.tut().lock&&LNI.tut().msg==='m0'&&localStorage.getItem('lb.help')===null));
  await tap('#helper [data-act="tutskip"]');
  ok('…and is turned off again for this run', await p.evaluate(()=>!LNI.tut().help&&!LNI.tut().lock&&!LNI.tut().msg));
  ok('new game started', await day()===0 && await p.evaluate(()=>LNU.paused===true));
  // 2. поселить ближайшую ферму: клик по миру → окно мира → «Отправить поселенцев»
  // Ближайшая ферма должна быть доступна мыши: в центре её кружка стоит чужой мир (на сиде 309573272 — Solace поверх Brine).
  // Точка клика — первая из проб (центр, края), где элемент под курсором принадлежит этой ферме.
  const cand=await p.evaluate(()=>PLANETS.filter(q=>q.kind==='farm'&&sectorOpen(LN,q.sec)&&!LN.colonies[q.id]).sort((a,b)=>a.dist-b.dist).map(f=>{
    const c=document.querySelector('#map .wd[data-p="'+f.id+'"] circle[fill="transparent"]'); if(!c) return {id:f.id,pt:null};
    const bb=c.getBoundingClientRect(), cx=bb.left+bb.width/2, cy=bb.top+bb.height/2, r=bb.width/2;
    for(const [dx,dy] of [[0,0],[0.5,0],[-0.5,0],[0,0.5],[0,-0.5],[0.5,0.5],[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5]]){ const x=cx+dx*r, y=cy+dy*r, e=document.elementFromPoint(x,y), w=e&&e.closest&&e.closest('#map .wd[data-p]');
      if(w&&w.dataset.p===f.id) return {id:f.id,pt:{x:x,y:y}} }
    const top=document.elementFromPoint(cx,cy), tw=top&&top.closest?top.closest('#map .wd[data-p]'):null;
    return {id:f.id,pt:null,cover:tw?tw.dataset.p:'?'} }));
  const near=cand[0]||{id:'-',pt:null}, pick=cand.find(c=>c.pt)||null;
  ok('nearest farm '+near.id+' is reachable with the mouse', !!near.pt, near.pt?'':'в центре её кружка стоит мир '+near.cover);
  if(!pick) throw new Error('no farm can be clicked');
  const farm=pick.id;
  await p.mouse.click(pick.pt.x,pick.pt.y); await p.waitForTimeout(120);
  ok('world window of the farm '+farm, await p.isVisible('#ovl .win'), farm);
  await tap('[data-act="send"][data-p="'+farm+'"]');
  ok('settlers sent', await p.evaluate(f=>LN.ships.some(s=>s.job==='colonize'&&s.dest===f),farm));
  // 3. ждать посадки (колония появилась), время на ×4
  const landed=await until(()=>p.evaluate(f=>!!LN.colonies[f],farm),150);
  ok('colony landed', landed, await day());
  // 4. второе судно на линию: пауза, окно мира, первая свободная строка «Добавить судно» → Назначить на линию
  await tap(PAUSE); await clear();
  // окно мира ещё открыто с отправки; клик мимо окна (на #ovl) закрыл бы его, поэтому открываем, только если закрыто
  if(!(await p.evaluate(()=>LNU.win))){ await p.mouse.click(pick.pt.x,pick.pt.y); await p.waitForTimeout(120) }
  await tap('#addblk [data-act="assign"]');
  ok('hull assigned to the line', await p.evaluate(f=>LN.ships.some(s=>s.from===f&&s.mode!=='dead'),farm));
  await p.keyboard.press('Escape');   // окно мира закрывается Escape (крестика нет)
  // 5. 200 лет на ×4
  const d0=await day();
  await tap(SPD10);
  const reached=await until(async()=>(await day())>=d0+200||await p.evaluate(()=>!!LN.over),700);   // v4.42: 4× is the top speed — 200 years take ~2 minutes
  await tap(PAUSE);
  const d1=await day();
  ok('200 years at x10', reached&&d1-d0>=200, d0+'→'+d1);
  ok('game still running', !(await p.evaluate(()=>LN.over)));
  // 6. вкладки: Worlds / Earth / Tech / Yard / Fleet / Ark — открываются и закрываются (повторный клик)
  const tabs=[['worlds','side'],['earth','ovl'],['tech','side'],['yard','ovl'],['fleet','side'],['ark','ovl']];
  for(const [v,where] of tabs){
    await clear();
    await tap('#tabs [data-act="tab"][data-v="'+v+'"]');
    const shown=await p.evaluate(([v,where])=>{ const btn=document.querySelector('#tabs [data-act="tab"][data-v="'+v+'"]');
      const box=document.getElementById(where==='side'?'side':'ovl'); const txt=box.textContent.trim().length;
      return !!btn&&btn.classList.contains('on')&&box.classList.contains('on')&&txt>20 },[v,where]);
    ok('tab '+v+' opens', shown);
    await tap('#tabs [data-act="tab"][data-v="'+v+'"]');
    ok('tab '+v+' closes', await p.evaluate(([v,where])=>!document.getElementById(where==='side'?'side':'ovl').classList.contains('on'),[v,where]));
  }
  // 7. ошибки: страница и лог игры (падение такта пишется в лог как crash)
  ok('no page errors', errs.length===0, errs.slice(0,2).join(' | '));
  ok('no crash in the game log', !(await p.evaluate(()=>LN.log.some(e=>e.code==='crash'))));
}catch(e){ ok('scenario ran to the end', false, e.message.split('\n')[0]) }
  if(b) await b.close();
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length);
})();
