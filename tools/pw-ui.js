// pw-ui — общий путь по интерфейсу v4.35 для браузерных сценариев (новый DOM, см. side-session-notes/dom-v435.md).
// Клики — настоящей мышью по центру элемента (или по точке, где элемент действительно под курсором).
// Сценарии подключают: const UI=require('./pw-ui.js'). regress.sh копирует pw*.js в work/.run вместе с ним.
const path=require('path');
const WORK=process.env.LB_WORK||path.resolve(__dirname,'..','work');
const URL=()=>require('url').pathToFileURL(WORK).href;

// страница с ошибками и помощниками; file — имя сборки в work/ (page.html = long-night.html)
async function newPage(b,{vp={width:1600,height:1000},file='page.html'}={}){
  const p=await b.newPage({viewport:vp}); p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  p.file=file; return p }

function ui(p){
  // клик по центру элемента; элемент прокручивается; ждёт появления (панели перерисовываются каждый тик)
  const tap=async sel=>{ for(let k=0;;k++){ const bb=await p.evaluate(q=>{ const e=document.querySelector(q); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return r.width?{x:r.left+r.width/2,y:r.top+r.height/2}:null },sel);
    if(bb){ await p.mouse.click(bb.x,bb.y); await p.waitForTimeout(120); return } if(k>=8) throw new Error('no '+sel); await p.waitForTimeout(150) } };
  // клик по координатам (для карты и мест, где центр закрыт другим элементом)
  const at=async(x,y)=>{ await p.mouse.click(x,y); await p.waitForTimeout(120) };
  // большие окна, которые останавливают время: смена (с остановкой), событие, Ночь, личное дело
  const closeBig=async()=>{ for(let i=0;i<8;i++){ await p.evaluate(()=>LNdraw());   // окно могло открыться в ядре (botRun), а отрисовка ещё не прошла
      const k=await p.evaluate(()=>LNI.big());
      if(k==='shift') await tap('[data-act="shiftok"]'); else if(k==='night') await tap('[data-act="nightok"]'); else if(k==='note') await tap('[data-act="noteok"]'); else break } };
  const clear=async()=>{ await closeBig();
    for(let i=0;i<4&&await p.isVisible('#pfL [data-act="pfok"]');i++) await tap('#pfL [data-act="pfok"]') };
  const speed=async v=>{ if(v===0){ if(!(await p.evaluate(()=>LNU.paused))) await tap('#top [data-act="spd"][data-v="0"]') } else await tap('#top [data-act="spd"][data-v="'+v+'"]') };
  const pause=()=>speed(0);
  const play=async(v=10)=>{ await speed(v) };
  // идти вперёд на скорости v, закрывая окна, пока cond() истинно не станет; cap — число итераций по ~250 мс
  const until=async(cond,cap=400,v=10)=>{ await play(v); for(let t=0;t<cap;t++){ if(await cond()) return true; await clear(); if(await p.evaluate(()=>LNU.paused)) await play(v); await p.waitForTimeout(250) } return !!(await cond()) };
  // идти N лет (по LN.day) на скорости v
  const years=async(n,v=10,cap=600)=>{ const d0=await p.evaluate(()=>LN.day); const ok=await until(async()=>(await p.evaluate(()=>LN.day))>=d0+n||!!(await p.evaluate(()=>LN.over)),cap,v); await pause(); return ok };
  // точка на карте, по которой мышь попадает в мир pid (центр круга, иначе края); null — мир полностью закрыт другим
  const point=pid=>p.evaluate(pid=>{ const c=document.querySelector('#map .wd[data-p="'+pid+'"] circle[fill="transparent"]'); if(!c) return null;
      const bb=c.getBoundingClientRect(), cx=bb.left+bb.width/2, cy=bb.top+bb.height/2, r=bb.width/2;
      for(const [dx,dy] of [[0,0],[0.5,0],[-0.5,0],[0,0.5],[0,-0.5],[0.5,0.5],[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5]]){ const x=cx+dx*r, y=cy+dy*r, e=document.elementFromPoint(x,y), w=e&&e.closest&&e.closest('#map .wd[data-p]');
        if(w&&w.dataset.p===pid) return {x:x,y:y} } return null },pid);
  // открыть окно мира мышью (если окно уже открыто — не трогаем: клик мимо окна его закрывает)
  const openWorld=async pid=>{ await clear(); if(await p.evaluate(p=>LNU.win===p,pid)) return true;
    if(await p.evaluate(()=>!!LNU.win)) { await p.keyboard.press('Escape'); await p.waitForTimeout(60) }   // чужое окно мира закрыть, иначе клик мимо окна уходит в фон
    const pt=await point(pid); if(!pt) return false; await at(pt.x,pt.y); return await p.evaluate(p=>LNU.win===p,pid) };
  const closeWin=()=>p.keyboard.press('Escape');
  // вкладка: клик по кнопке (повторный клик закрывает)
  const tab=async v=>{ await clear(); await tap('#tabs [data-act="tab"][data-v="'+v+'"]') };   // личное дело на весь экран закрывает вкладки: сначала закрыть
  const tabOn=async v=>p.evaluate(v=>{ const b=document.querySelector('#tabs [data-act="tab"][data-v="'+v+'"]'); return !!b&&b.classList.contains('on') },v);
  const day=()=>p.evaluate(()=>LN.day);
  // язык и новая игра с сидом через меню ≡ (как игрок)
  // v4.36: обучение и нарратив выключены хуком «всё открыто» (LNtut.off): без экрана запуска, голоса и помощника; сценарий обучения — pw41
  const start=async(lang,seed,{tut=false}={})=>{ await p.goto(URL()+'/'+p.file); await p.waitForTimeout(300);
    if(!tut) await p.evaluate(()=>window.LNtut&&LNtut.off());
    if(lang) await tap('[data-lang="'+lang+'"]');
    if(seed!==undefined){ await tap('[data-act="pop"][data-v="menu"]'); await p.fill('#seedin',String(seed)); await tap('[data-act="new"]') }
    await p.evaluate(()=>{ LNU.shiftStop=false }) };
  return {tap,at,closeBig,clear,speed,pause,play,until,years,point,openWorld,closeWin,tab,tabOn,day,start} }

module.exports={newPage,ui,WORK,URL};
