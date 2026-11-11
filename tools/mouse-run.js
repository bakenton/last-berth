/* MOUSE-RUN — партия от года 0 до конца настоящей мышью, решения принимает голова бота ядра (tools/sim.js step()).
   Никита, 10.11: «проклинал игру мышкой от начала и до конца» тремя стилями — рашер (rush), педант (serial), ленивый (lazy).
     node tools/mouse-run.js --style rush|serial|lazy|ark|bank --seed 11 [--viewport 1500x950] [--max-min 150] [--out dir]
   Как устроено:
     · раз в игровой год голова бота проигрывает свой ход на КОПИИ состояния (structuredClone) и отдаёт список действий;
     · руки ставят паузу кнопкой и исполняют каждое действие нажатием мыши по видимой кнопке (p.mouse.click по координатам);
     · результат каждого нажатия сверяется с журналом действий самой игры (LN.actions) и с причиной отказа кнопки (data-why, тост);
     · состояние игры скрипт не трогает нигде: page.evaluate только читает и планирует на копии.
   Что НЕ как у игрока: обучение, голоса и взлом Пульта выключены хуком «всё открыто» (LNtut.off), сид вписан в поле ≡ клавиатурой,
   скорость всегда ×4. Расхождения головы и рук (бот умеет то, чего нет у кнопок) пишутся в отчёт — это и есть предмет проверки.
   Результат: work/playtest/mouse-<стиль>-<сид>/report.md · events.json · game-log.json · shots/ */
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),url=require('url');
const argv=process.argv.slice(2); const arg=(n,d)=>{ const i=argv.indexOf('--'+n); return i<0?d:(argv[i+1]&&!argv[i+1].startsWith('--')?argv[i+1]:true) };
const STYLE=String(arg('style','rush')), SEED=String(arg('seed','11')), VP=String(arg('viewport','1500x950')).split('x').map(Number), MAXMIN=+arg('max-min',150);
if(!/^(rush|serial|lazy|ark|bank)$/.test(STYLE)){ console.error('--style: rush | serial | lazy | ark | bank'); process.exit(2) }
const ENV={}; String(arg('env','')).split(',').filter(x=>x&&x!=='true').forEach(kv=>{ const [k,v]=kv.split('='); ENV[k]=v===undefined?'1':v });   // --env ARK_KEEP=1: переключатели головы бота (в странице нет process.env)
const ROOT=path.resolve(__dirname,'..');
const OUT=path.resolve(String(arg('out',path.join(ROOT,'work','playtest','mouse-'+STYLE+'-'+SEED+(Object.keys(ENV).length?'-'+Object.keys(ENV).join('-').toLowerCase():''))))); fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(path.join(OUT,'shots'),{recursive:true});
const t0=Date.now(), wall=()=>+((Date.now()-t0)/1000).toFixed(1);
const ev=[], rec=(type,o)=>ev.push(Object.assign({t:wall(),type},o));
const EX_N={parts:[10,50,200],metal:[50,200,1000],food:[50,200,1000],fuel:[50,200,1000]};
const KIND={colonize:'colonize',setLine:'line',orderFor:'order',clearLine:'release',scrap:'scrap',buildShip:'build',startDrive:'drive',orderKit:'kit',abandon:'evacuate',survey:'survey',arkBuy:'arkbuy',setReserve:'reserve',buildHub:'hub',setVia:'via',exchange:'exchange'};

(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const ctx=await b.newContext({viewport:{width:VP[0],height:VP[1]}});
  const p=await ctx.newPage(); const pageErrs=[];
  p.on('pageerror',e=>{ pageErrs.push(String(e).slice(0,200)); rec('pageerror',{e:String(e).slice(0,200)}) });
  await p.addInitScript(()=>{
    window.__toasts=[]; window.__ck=null; window.__gaps=[]; window.__phase='';
    (function(){ let last=0; const f=ts=>{ if(last&&ts-last>650&&window.LN&&window.LNU&&!LNU.paused) window.__gaps.push({dt:Math.round(ts-last),day:LN.day,ph:window.__phase}); last=ts; requestAnimationFrame(f) }; requestAnimationFrame(f) })();   // кадры длиннее года на ×4: за такой кадр игра проходит несколько лет разом
    window.addEventListener('click',e=>{ const t=e.target, a=t&&t.closest?t.closest('[data-act],[data-lang],#map .wd'):null; window.__ck={act:a?1:0,tag:t&&t.tagName} },true);
    document.addEventListener('DOMContentLoaded',()=>{ const box=document.getElementById('toasts'); if(!box) return;
      new MutationObserver(ms=>{ ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1&&/toast/.test(n.className)) window.__toasts.push({day:window.LN?window.LN.day:null,cls:n.className.replace('toast','').trim(),txt:(n.textContent||'').trim()}) })) }).observe(box,{childList:true}) });
  });
  const page=process.env.LB_PAGE?path.resolve(process.env.LB_PAGE):path.join(ROOT,'work','page.html');   // LB_PAGE: another build (e.g. play/V5/…-v5.11.html) to compare if(!fs.existsSync(page)){ console.error('нет сборки work/page.html'); process.exit(2) }
  await p.goto(url.pathToFileURL(page).href); await p.waitForTimeout(600);
  const wait=ms=>p.waitForTimeout(ms);
  const phase=ph=>p.evaluate(ph=>{ window.__phase=ph },ph).catch(()=>{});
  let shotN=0; async function shot(name){ await phase('shot'); const f='shots/'+String(++shotN).padStart(3,'0')+'-'+name.replace(/[^\w-]+/g,'_').slice(0,50)+'.png'; try{ await p.screenshot({path:path.join(OUT,f)}) }catch(e){} await phase(''); return f }

  /* ---------- мышь ---------- */
  const clicks={n:0,lost:0,covered:0};
  const has=async sel=>(await p.locator(sel).count())>0;
  /* tap(sel) → {res:'ok'|'disabled'|'covered'|'missing'|'lost', why, toast}. Нажатие на заблокированную кнопку делается: причина — в отчёт */
  async function tap(sel,opt){ opt=opt||{};
    for(let attempt=0;attempt<3;attempt++){
      const wt=await p.evaluate(sel=>{ const e=document.querySelector(sel), w=e&&!e.getClientRects().length&&e.closest('.wpan[hidden]'); return w?w.dataset.wtab:null },sel).catch(()=>null);   // v5.13: the world card's tabs — press the tab first, as a player
      if(wt&&!sel.includes('wrail')) await tap('#ovl .wrail [data-act="wtab"][data-v="'+wt+'"]',{soft:true});
      const L=p.locator(sel).first(); if(!(await L.count())) return {res:'missing'};
      try{ await L.scrollIntoViewIfNeeded({timeout:1000}) }catch(e){}
      const info=await p.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, t=document.elementFromPoint(x,y);
        return {x,y,w:r.width,hit:!!(t&&(e.contains(t)||t.contains(e))),top:t?(t.id?'#'+t.id:t.tagName):null,dis:e.getAttribute('aria-disabled')==='true',why:e.dataset.why||null,txt:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,60)} },sel).catch(()=>null);
      if(!info||!info.w) return {res:'missing'};
      if(!info.hit){ if(attempt<2&&!opt.nd){ await dismiss(); await p.evaluate(sel=>{ const e=document.querySelector(sel); if(e) e.scrollIntoView({block:'center'}) },sel).catch(()=>{}); await wait(150); continue }   // строка в прокручиваемом списке: игрок крутит колесо
        clicks.covered++; return {res:'covered',top:info.top} }
      const nT=await p.evaluate(()=>{ window.__ck=null; return window.__toasts.length });
      await p.mouse.move(info.x,info.y); await p.mouse.click(info.x,info.y); clicks.n++; await wait(opt.wait||80);
      const ck=await p.evaluate(()=>window.__ck).catch(()=>null);
      if(!ck||ck.act===0){ clicks.lost++; rec('click-lost',{sel}); continue }
      if(info.dis){ const ts=await p.evaluate(n=>window.__toasts.slice(n).map(t=>t.txt),nT).catch(()=>[]); return {res:'disabled',why:info.why,toast:ts[0]||null,txt:info.txt} }
      return {res:'ok',txt:info.txt} }
    return {res:'lost'} }
  const okTap=async(sel,opt)=>(await tap(sel,opt)).res==='ok';

  /* ---------- что видно (только чтение) ---------- */
  const S=()=>p.evaluate(()=>{ const G=window.LN,U=window.LNU; if(!G) return null; const E=G.earth;
    return {day:G.day,over:G.over||null,big:LNI.big(),pf:!!U.pf,paused:!!U.paused,speed:U.speed,halted:LNI.halted(),win:U.win||null,tab:U.tab||null,pop:U.pop||null,logOpen:!document.getElementById('logbox').hidden,
      people:Math.round(E.people),food:Math.round(E.food),metal:Math.round(E.metal),fuel:Math.round(E.fuel),parts:Math.round(E.parts),cols:Object.keys(G.colonies).length,settled:settledCount(G),
      ships:G.ships.filter(s=>s.mode!=='dead').length,sectors:SECTORS.length,gen:G.gen||0,drive:G.driveLvl||0,night:G.night||0,nightLeft:G.night?nightLeft(G):null,
      arkLv:arkRings(G),cvOk:G.night?arkConvoy(G).ok:false,hungry:!!G.hungry,hubs:(typeof hubCount==='function')?hubCount(G):0} }).catch(()=>null);
  const ust=()=>p.evaluate(()=>({win:LNU.win||null,tab:LNU.tab||null,pop:LNU.pop||null})).catch(()=>({}));

  /* ---------- большие окна ---------- */
  const interrupts={}; const bump=k=>{ interrupts[k]=(interrupts[k]||0)+1 };
  async function dismiss(){ let n=0;
    for(let i=0;i<8;i++){ const s=await S(); if(!s) break; let did=false;
      if(s.logOpen){ did=await okTap('#logbox [data-act="closelog"]',{nd:true}) }
      else if(s.big==='night'){ await shot('night-window-y'+s.day); did=await okTap('#noteL [data-act="nightok"]',{nd:true}); if(did) bump('окно Ночи') }
      else if(s.big==='shift'){ did=await okTap('#noteL [data-act="shiftok"]',{nd:true}); if(did) bump('отчёт смены') }
      else if(s.big==='note'){ did=await okTap('#noteL [data-act="noteok"]',{nd:true}); if(did) bump('событие') }
      else if(s.big==='over'||s.big==='lang') break;
      else if(s.pf){ did=await okTap('#pfL [data-act="pfok"]',{nd:true}); if(did) bump('личное дело') }
      if(!did) break; n++; await wait(60) }
    return n }

  /* ---------- окна и вкладки ---------- */
  const PAUSING=new Set(['earth','yard','ark']);
  async function clickOutside(){
    const pt=await p.evaluate(()=>{ const o=document.getElementById('ovl'), w=document.querySelector('#ovl .win'); if(!o||!w) return null;
      const r=o.getBoundingClientRect(), q=w.getBoundingClientRect();
      for(const [x,y] of [[r.right-24,r.bottom-24],[r.left+24,r.bottom-24],[r.right-24,r.top+24],[r.left+24,r.top+24]]){
        if(x<q.left||x>q.right||y<q.top||y>q.bottom){ const t=document.elementFromPoint(x,y); if(t&&t.id==='ovl') return [x,y] } } return null });
    if(!pt) return false; await p.mouse.click(pt[0],pt[1]); clicks.n++; await wait(100); return true }
  async function home(){
    for(let i=0;i<8;i++){ await dismiss(); const u=await ust(); if(!u.win&&!u.tab&&!u.pop) return true;
      if(u.pop){ if(await has('#pop .cancel')) await tap('#pop .cancel'); else if(await has('#top [data-act="pop"][data-v="'+u.pop+'"]')) await tap('#top [data-act="pop"][data-v="'+u.pop+'"]'); else await p.mouse.click(4,VP[1]-4); await wait(60); continue }
      if(u.win&&!PAUSING.has(u.win)){ if(!(await clickOutside())){ rec('close-outside-failed',{win:u.win}); await p.mouse.click(6,VP[1]-6) } await wait(60); continue }
      if(u.win){ await tap('#tabs [data-act="tab"][data-v="'+u.win+'"]'); await wait(60); continue }
      if(u.tab){ await tap('#tabs [data-act="tab"][data-v="'+u.tab+'"]'); await wait(60); continue } }
    return false }
  async function openTab(k){ await dismiss(); let u=await ust(); if((u.win===k||u.tab===k)&&!u.pop) return true;
    if(u.pop||(u.win&&!PAUSING.has(u.win))) await home();
    if(!(await okTap('#tabs [data-act="tab"][data-v="'+k+'"]'))) return false; await wait(120); u=await ust(); return u.win===k||u.tab===k }
  const point=pid=>p.evaluate(pid=>{ const c=document.querySelector('#map .wd[data-p="'+pid+'"] circle[fill="transparent"]'); if(!c) return null;
      const bb=c.getBoundingClientRect(), cx=bb.left+bb.width/2, cy=bb.top+bb.height/2, r=bb.width/2;
      for(const [dx,dy] of [[0,0],[0.5,0],[-0.5,0],[0,0.5],[0,-0.5],[0.5,0.5],[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5]]){ const x=cx+dx*r, y=cy+dy*r, e=document.elementFromPoint(x,y), w=e&&e.closest&&e.closest('#map .wd[data-p]');
        if(w&&w.dataset.p===pid) return {x:x,y:y} } return null },pid);
  const opened={map:0,list:0,fail:0};
  async function openWorld(pid){
    await dismiss(); const u=await ust(); if(u.win===pid&&!u.pop) return true;
    await home();
    let pt=await point(pid);
    if(!pt&&await has('#zoom [data-act="zoom"][data-v="fit"]')){ await tap('#zoom [data-act="zoom"][data-v="fit"]'); await wait(500); pt=await point(pid) }
    if(pt){ await p.mouse.move(pt.x,pt.y); await p.mouse.click(pt.x,pt.y); clicks.n++; for(let i=0;i<6;i++){ await wait(80); if((await ust()).win===pid){ opened.map++; return true } } }
    await home();
    if(await openTab('worlds')){ const r=await tap('#side button.tr[data-v="'+pid+'"]'); if(r.res==='ok'){ for(let i=0;i<6;i++){ await wait(80); if((await ust()).win===pid){ opened.list++; return true } } } }
    opened.fail++; rec('world-not-open',{pid,shot:await shot('world-not-open-'+pid)}); return false }

  /* ---------- старт: окно запуска, сид, новая игра ---------- */
  await p.evaluate(()=>window.LNtut&&LNtut.off());   // обучение, голоса и взлом выключены (хук сценариев «всё открыто»)
  await shot('start-window');
  if(!(await okTap('#noteL [data-lang="en"]'))) rec('start-fail',{what:'start window'});
  await wait(200);
  if(await okTap('#top [data-act="pop"][data-v="menu"]')){ await wait(150); await p.fill('#seedin',SEED); await okTap('#pop [data-act="new"]'); await wait(300) }
  const seedNow=String(await p.evaluate(()=>LN.seed)); if(seedNow!==SEED){ console.error('сид не применился: '+seedNow); process.exit(2) }
  /* голова бота: sim.js в замыкании (его имена не должны затирать функции ядра) */
  const simSrc=fs.readFileSync(path.join(ROOT,'tools','sim.js'),'utf8');
  const names=(simSrc.match(/const names=\[([\s\S]*?)\];/)||[])[1];
  const inPage='window.process={env:'+JSON.stringify(ENV)+'};(function(){'+simSrc.replace("const fs=require('fs');","const fs=null;").replace(/module\.exports=[^\n]*\n/,'window.SIM={STYLES,step};\n').replace('if(require.main===module){','if(false){')+'\n})();';
  await p.addScriptTag({content:inPage});
  await p.evaluate(names=>{ const list=eval('['+names+']'); const C0={}; list.forEach(n=>{ try{ C0[n]=eval(n) }catch(e){ C0[n]=undefined } });
    window.__mr={st:{idleY:{},fuelHist:[],want:{}},pend:[],C0};
    /* ход бота за год d на копии: что бы он сделал. Живую игру не трогает. */
    window.__plan=function(style,d){ const G0=window.LN, sh=Object.assign({},G0); delete sh.rnd; const Gc=structuredClone(sh), acts=[], C=Object.assign({},C0); Gc.rnd=mulberry32(1);   // кости игры — замыкание, в копию не идут; ход бота их не бросает
      for(const id of __mr.pend){ const s=Gc.ships.find(x=>x.id===id); if(s&&s.mode!=='dead') s.reserve=true }   // корпус, заложенный под конвой: у игрока нет кнопки «в резерв» до пирса, руки помнят сами
      const R=(f,o)=>{ acts.push(Object.assign({f},o)); return o.r };
      C.colonize=(G,sid,pid,people,food)=>{ const s=shipById(G,sid), np=foundParty(G,s,pid); const r=C0.colonize(G,sid,pid,np,food); return R('colonize',{sid,pid,people:np,asked:people,r}) };   // окно мира шлёт foundParty, не 26
      C.setLine=(G,sid,k,to)=>R('setLine',{sid,k,r:C0.setLine(G,sid,k,to)});
      C.orderFor=(G,k,cls,hi)=>R('orderFor',{k,cls,hi,r:C0.orderFor(G,k,cls,hi)});
      C.clearLine=(G,sid)=>{ const s=shipById(G,sid), had=!!(s&&(s.from||s.pend)), k=s&&(s.from||(s.pend&&s.pend.from)); const r=C0.clearLine(G,sid); if(had) R('clearLine',{sid,k,r}); return r };
      C.scrap=(G,sid)=>R('scrap',{sid,r:C0.scrap(G,sid)});
      C.buildShip=(G,hi)=>{ const r=C0.buildShip(G,hi); return R('buildShip',{hi,cls:HULLS[hi].key,newId:r==='ok'?G.nextShip-1:null,r}) };
      C.startDrive=(G,k)=>R('startDrive',{k,r:C0.startDrive(G,k)});
      C.orderKit=(G,k)=>R('orderKit',{k,r:C0.orderKit(G,k)});
      C.abandon=(G,sid,k)=>R('abandon',{sid,k,r:C0.abandon(G,sid,k)});
      C.survey=(G)=>{ const chk=canSurvey(G); if(chk==='ok'){ const c=surveyCost(SECTORS.length); for(const r of ['metal','food','fuel','parts','people']) G.earth[r]-=(c[r]||0) } return R('survey',{r:chk}) };   // кольцо открывает общие таблицы ядра — на копии только цена
      C.arkBuy=(G,l)=>R('arkBuy',{l,r:C0.arkBuy(G,l)});
      C.setReserve=(G,sid,on)=>R('setReserve',{sid,on:!!on,r:C0.setReserve(G,sid,on)});
      C.buildHub=(G,k)=>R('buildHub',{k,r:C0.buildHub(G,k)});
      C.setVia=(G,k,h)=>{ const was=(G.colonies[k]||{}).via||null; const r=C0.setVia(G,k,h); if(was!==h) R('setVia',{k,h,r}); return r };
      C.exchange=(G,r0,a,b,n)=>R('exchange',{res:r0,a,b,n,r:C0.exchange(G,r0,a,b,n)});
      let err=null; try{ SIM.step(C,Gc,style,d,__mr.st) }catch(e){ err=String(e&&e.stack||e).slice(0,400) }
      for(const a of acts){ if(a.f==='buildShip'&&a.newId!==null){ const s=Gc.ships.find(x=>x.id===a.newId); a.reserve=!!(s&&s.reserve) } }
      return {acts,err} };
  },names);
  await shot('year-0');
  await tap('#top [data-act="spd"][data-v="4"]');
  console.log('mouse-run '+STYLE+' seed '+SEED+' → '+OUT);

  /* ---------- руки: одно действие бота = нажатия мыши ---------- */
  const stat={}; const fails=[]; const notes={};
  const note=(k,ex)=>{ const x=notes[k]||(notes[k]={n:0,ex:ex||null,year:curDay}); x.n++ };
  let curDay=0;
  const actLen=()=>p.evaluate(()=>LN.actions.length);
  /* нажать кнопку действия и прочитать, что записала игра */
  async function press(sel,kind,n0){ if(n0===undefined) n0=await actLen();
    const r=await tap(sel); if(r.res!=='ok') return {ok:false,why:r.res+(r.why?':'+r.why:''),toast:r.toast||null,top:r.top||null};
    const got=await p.evaluate(({n0,kind})=>{ const a=LN.actions.slice(n0).filter(x=>x.k===kind); return a.length?a[a.length-1]:null },{n0,kind});
    if(!got) return {ok:false,why:'no-action-logged'};
    return {ok:got.r==='ok'||got.r==='queued',why:got.r,d:got.d} }
  const on=sel=>p.evaluate(s=>{ const e=document.querySelector(s); return !!e&&e.classList.contains('on') },sel);
  async function pickGen(scope,cls,hi,actSel){   // карточка заказа стоит на другом поколении — переключатель поколений
    const cur=await p.evaluate(s=>{ const e=document.querySelector(s); return e?e.dataset.h:null },actSel).catch(()=>null);
    if(cur!==null&&+cur===hi) return true;
    const g=scope+' [data-act="ordgen"][data-v="'+cls+':'+hi+'"]'; if(!(await has(g))) return false;
    await tap(g); await wait(80); return true }
  const HANDS={
    async colonize(a){ if(!(await openWorld(a.pid))) return {ok:false,why:'world-not-open'};
      const who='#ovl [data-act="who"][data-p="'+a.pid+'"][data-s="'+a.sid+'"]';
      if(await has(who)){ if(!(await on(who))) await tap(who) } else note('colonize: судна бота нет в списке «кто летит»','судно '+a.sid+' → '+a.pid);
      return press('#ovl [data-act="send"][data-p="'+a.pid+'"]','colonize') },
    async setLine(a){ if(!(await openWorld(a.k))) return {ok:false,why:'world-not-open'};
      if(await has('#ovl [data-act="addtab"][data-v="free"]')&&!(await on('#ovl [data-act="addtab"][data-v="free"]'))) await tap('#ovl [data-act="addtab"][data-v="free"]');
      const sel='#ovl #addblk [data-act="assign"][data-s="'+a.sid+'"][data-p="'+a.k+'"]';
      if(!(await has(sel))){ const why=await p.evaluate(id=>{ const e=document.getElementById('ah-'+id); return e?(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,90):'нет строки судна' },a.sid); return {ok:false,why:'assign-missing',toast:why} }
      return press(sel,'line') },
    async orderFor(a){ if(!(await openWorld(a.k))) return {ok:false,why:'world-not-open'};
      const sel='#ovl [data-act="order"][data-p="'+a.k+'"][data-c="'+a.cls+'"]';
      if(!(await has(sel))){ const g='#ovl #ordblk [data-act="ordgen"][data-v="'+a.cls+':'+a.hi+'"]';   // карточка стоит на поколении, выбранном раньше в другом окне (выбор общий на все миры), и оно сюда не достаёт
        if(await has(g)){ await tap(g); await wait(80); note('order: карточка помнила поколение из другого окна и писала «too short» — переключено','мир '+a.k+' · '+a.cls) } }
      if(!(await has(sel))){ const why=await p.evaluate(c=>{ const e=document.getElementById('oc-'+c); return e?(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,90):'нет карточки класса' },a.cls); return {ok:false,why:'order-missing',toast:why} }
      if(!(await pickGen('#ovl #ordblk',a.cls,a.hi,sel))) note('order: в окне мира нет поколения, которое выбрал бот','hull '+a.hi);
      return press(sel,'order') },
    async clearLine(a){ const k=await p.evaluate(id=>{ const s=shipById(LN,id); if(!s) return null; for(const k in LN.colonies){ if(onLine(LN,k).some(o=>o.id===id)) return k } return null },a.sid);
      if(!k) return {ok:true,skip:'судно уже без линии'};
      if(!(await openWorld(k))) return {ok:false,why:'world-not-open'};
      const sel='#ovl [data-act="unroute"][data-s="'+a.sid+'"]';
      if(!(await has(sel))){ const st=await p.evaluate(k=>LNI.wst(k),k); note('release: в окне мира «'+st+'» нет списка судов линии — снять судно негде','судно '+a.sid+' · мир '+k); return {ok:false,why:'unroute-missing:'+st} }
      return press(sel,'release') },
    async scrap(a){ if(!(await openTab('yard'))) return {ok:false,why:'yard-not-open'};
      const sel='#ovl [data-act="scrap"][data-s="'+a.sid+'"]'; const n0=await actLen();
      const r1=await tap(sel); if(r1.res!=='ok') return {ok:false,why:r1.res+(r1.why?':'+r1.why:''),toast:r1.toast||null};
      await wait(80); return press(sel,'scrap',n0) },
    async buildShip(a){ if(!(await openTab('yard'))) return {ok:false,why:'yard-not-open'};
      let sel='#ovl [data-act="build"][data-h="'+a.hi+'"]';
      if(!(await has(sel))){ const g='#ovl [data-act="ordgen"][data-v="'+a.cls+':'+a.hi+'"]'; if(await has(g)){ await tap(g); await wait(80) } }
      if(!(await has(sel))) return {ok:false,why:'build-missing',toast:'в Yard нет кнопки корпуса '+a.hi};
      const r=await press(sel,'build');
      if(r.ok&&a.reserve){ const id=await p.evaluate(()=>{ const id=LN.nextShip-1; __mr.pend.push(id); return id }); note('convoy: корпус заложен под конвой — «в резерв» только с пирса','судно '+id) }
      return r },
    async startDrive(a){ if(!(await openTab('tech'))) return {ok:false,why:'tech-not-open'};
      const chip='#side [data-act="driveat"][data-v="'+a.k+'"]'; if(await has(chip)&&!(await on(chip))) await tap(chip);
      return press('#side [data-act="drive"]','drive') },
    async orderKit(a){ if(!(await openWorld(a.k))) return {ok:false,why:'world-not-open'}; return press('#ovl [data-act="kit"][data-p="'+a.k+'"]','kit') },
    async abandon(a){ if(!(await openWorld(a.k))) return {ok:false,why:'world-not-open'};
      const r=await press('#ovl [data-act="evac"][data-p="'+a.k+'"]','evacuate'); if(r.ok&&r.d&&r.d.hull!==a.sid) note('evac: окно мира само выбрало курьера (бот называл другого)','бот '+a.sid+' · игра '+r.d.hull); return r },
    async survey(){ if(!(await openTab('tech'))) return {ok:false,why:'tech-not-open'}; const r=await press('#side [data-act="survey"]','survey'); if(r.ok) await shot('ring-charted-y'+curDay); return r },
    async arkBuy(a){ if(!(await openTab('ark'))) return {ok:false,why:'ark-not-open'};
      const buy='#ovl [data-act="arkbuy"][data-l="'+a.l+'"]';
      if(!(await has(buy))){ const ring='#ovl .hold .hr[data-v="'+a.l+'"] .hx';   // v5.10: карточка с ценой и кнопкой открывается нажатием на соты кольца
        if(!(await has(ring))){ note('arkbuy: кольца '+a.l+' в улье не нарисовано — игроку его купить негде','год '+curDay); return {ok:false,why:'ring-not-drawn'} }
        const r0=await tap(ring); if(r0.res!=='ok') return {ok:false,why:'ring-'+r0.res,top:r0.top||null}; await wait(100) }
      if(!(await has(buy))) return {ok:false,why:'arkbuy-missing'};
      const r=await press(buy,'arkbuy'); if(r.ok) await shot('ark-ring-'+a.l+'-y'+curDay); return r },
    async setReserve(a){ if(await p.evaluate(a=>{ const s=shipById(LN,a.sid); return !!s&&!!s.reserve===a.on },a)) return {ok:true,skip:'уже так'};
      const at=await p.evaluate(sid=>{ const s=shipById(LN,sid); return s?{pier:s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.pend,line:!!(s.from||s.pend)}:null },a.sid);
      if(a.on&&at&&!at.pier){   // v5.10: у судна на линии или в рейсе своей кнопки «в конвой» нет (CALL HOME в окне ковчега зовёт все разом) — игрок снимает его с линии в окне мира и ставит в конвой у пирса
        if(await p.evaluate(id=>__mr.pend.includes(id),a.sid)) return {ok:true,skip:'ждёт пирса'};
        if(at.line){ const r=await HANDS.clearLine({sid:a.sid}); if(!r.ok&&!r.skip) return r }
        await p.evaluate(id=>{ __mr.pend.push(id) },a.sid); note('convoy: судно не у пирса — снято с линии в окне мира, «в конвой» нажато у пирса','судно '+a.sid); return {ok:true,skip:'снято с линии, ждёт пирса'} }
      if(!(await openTab('yard'))) return {ok:false,why:'yard-not-open'}; return press('#ovl [data-act="reserve"][data-s="'+a.sid+'"][data-on="'+(a.on?1:0)+'"]','reserve') },
    async buildHub(a){ if(!(await openWorld(a.k))) return {ok:false,why:'world-not-open'}; const r=await press('#ovl [data-act="hubbuild"][data-p="'+a.k+'"]','hub'); if(r.ok) await shot('hub-built-y'+curDay); return r },
    async setVia(a){ const cur=await p.evaluate(k=>(LN.colonies[k]||{}).via||null,a.k); if(cur===a.h) return {ok:true,skip:'уже так'};
      if(!(await openWorld(a.k))) return {ok:false,why:'world-not-open'}; return press('#ovl [data-act="via"][data-p="'+a.k+'"][data-v="'+a.h+'"]','via') },
    async exchange(a){ if(!(await openTab('earth'))) return {ok:false,why:'earth-not-open'};
      if(!(await has('#exblk'))) return {ok:false,why:'exchange-missing'};
      const g='#exget [data-act="exget"][data-v="'+a.res+'"]'; if(!(await has(g))) return {ok:false,why:'exget-missing'}; if(!(await on(g))){ await tap(g); await wait(60) }
      let pr='#expay [data-act="expay"][data-v="'+a.a+'+'+a.b+'"]'; if(!(await has(pr))) pr='#expay [data-act="expay"][data-v="'+a.b+'+'+a.a+'"]';
      if(!(await has(pr))) return {ok:false,why:'expay-missing'}; if(!(await on(pr))){ await tap(pr); await wait(60) }
      const lots=EX_N[a.res]; let left=a.n, got=0, last={ok:false,why:'no-lot'};
      for(let i=0;i<8&&left>0;i++){ const lot=[...lots].reverse().find(x=>x<=left)||lots[0]; const ls='#exn [data-act="exn"][data-v="'+lot+'"]';
        if(await has(ls)&&!(await on(ls))){ await tap(ls); await wait(60) }
        last=await press('#exblk [data-act="exgo"]','exchange'); if(!last.ok) break; got+=lot; left-=lot }
      if(got!==a.n) note('exchange: бот меняет любое число, кнопки — партиями '+lots.join('/'),'бот '+a.n+' · мышью '+got);
      return got>0?{ok:true,why:'ok'}:last }
  };
  async function perform(a){ const k=a.f; const s=stat[k]||(stat[k]={plan:0,ok:0,fail:0,skip:0}); s.plan++;
    let r; try{ r=await Promise.race([HANDS[k](a),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout 30s')),30000))]) }catch(e){ r={ok:false,why:'hands-error',toast:String(e).slice(0,160)} }
    if(r.skip){ s.skip++; return }
    if(r.ok) s.ok++; else { s.fail++; const f={year:curDay,f:k,a,why:r.why,toast:r.toast||null}; if(fails.length<400) fails.push(f); rec('act-fail',f); if(s.fail<=3) f.shot=await shot('fail-'+k+'-y'+curDay) }
    rec('act',{year:curDay,f:k,ok:r.ok,why:r.why}) }

  /* ---------- главный цикл ---------- */
  const deadline=Date.now()+MAXMIN*60000; let lastStep=0, missed=0, maxJump=1, planErrs=0, lastDay=-1, stuckAt=Date.now(), lastShot=-1, lastPrint=-1, actYears=0, firsts={};
  const trace=[]; let fin=null;
  const mark=(k,cond,s)=>{ if(cond&&!firsts[k]){ firsts[k]={year:s.day,t:wall()}; return true } return false };
  while(Date.now()<deadline){
    await dismiss();
    const s=await S(); if(!s){ await wait(300); continue }
    curDay=s.day;
    if(s.over){ fin=s; break }
    if(s.day!==lastDay){ lastDay=s.day; stuckAt=Date.now() }
    else if(Date.now()-stuckAt>30000){ rec('stuck',{s,shot:await shot('stuck-y'+s.day)}); await home(); await tap('#top [data-act="spd"][data-v="4"]'); stuckAt=Date.now();
      if((notes['stuck']||{n:0}).n>=6){ console.log('застрял на годе '+s.day); break } note('stuck','год '+s.day) }
    if(s.day>lastStep&&!s.big&&!s.pf){
      if(s.day-lastStep>1&&lastStep>0){ missed+=s.day-lastStep-1; maxJump=Math.max(maxJump,s.day-lastStep) }
      for(let day=Math.max(lastStep+1,s.day-40); day<=s.day; day++){   // пропущенные годы (кадр вместил несколько лет) доигрываются по текущему состоянию, все подряд: «раз в 25 лет» ленивого не должно выпадать
        // корпуса, заложенные под конвой, дошли до пирса — в резерв, как только игра даёт кнопку
        const due=await p.evaluate(()=>{ const out=[]; __mr.pend=__mr.pend.filter(id=>{ const s=LN.ships.find(x=>x.id===id); if(!s||s.mode==='dead') return false; if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.pend){ if(!s.reserve) out.push(id); return false } return true }); return out });
        const plan=await p.evaluate(({style,d})=>__plan(style,d),{style:STYLE,d:day-1});
        if(plan.err){ planErrs++; rec('plan-error',{day,err:plan.err}); if(planErrs<=3) console.log('ошибка головы бота, год '+day+': '+plan.err.slice(0,200)) }
        const todo=plan.acts.filter(a=>a.r==='ok'||a.r==='queued');
        if(due.length||todo.length){ actYears++;
          const st=await S(); if(st&&!st.paused){ await tap('#top [data-act="spd"][data-v="0"]'); await wait(60) }   // пауза кнопкой, как игрок
          for(const id of due) await perform({f:'setReserve',sid:id,on:true,r:'ok'});
          for(const a of todo){ await perform(a); if((await S()).over) break }
          await home() } }
      lastStep=s.day }
    const s2=await S(); if(!s2) continue; if(s2.over){ fin=s2; break }
    if(mark('c1',s2.cols>=1,s2)) await shot('first-colony-y'+s2.day);
    mark('c5',s2.cols>=5,s2); mark('c10',s2.cols>=10,s2); mark('ring3',s2.sectors>=3,s2); mark('gen1',s2.gen>=1,s2); mark('gen2',s2.gen>=2,s2); mark('gen3',s2.gen>=3,s2); mark('hub',s2.hubs>=1,s2);
    mark('night',!!s2.night,s2); mark('ark1',s2.arkLv>=1,s2); mark('ark2',s2.arkLv>=2,s2); mark('ark3',s2.arkLv>=3,s2); mark('ark4',s2.arkLv>=4,s2); mark('convoy',s2.cvOk,s2); mark('hungry',s2.hungry,s2);
    if(s2.day-lastShot>=500){ lastShot=s2.day; await shot('y'+s2.day) }
    if(s2.day-lastPrint>=250){ lastPrint=s2.day; trace.push({day:s2.day,cols:s2.cols,people:s2.people,food:s2.food,metal:s2.metal,fuel:s2.fuel,parts:s2.parts,ships:s2.ships,gen:s2.gen,ring:s2.sectors,ark:s2.arkLv});
      console.log('год '+s2.day+' · '+wall()+' с · миров '+s2.cols+' · людей '+s2.people+' · еда '+s2.food+' · металл '+s2.metal+' · топл '+s2.fuel+' · дет '+s2.parts+' · судов '+s2.ships+' · пок '+s2.gen+' · колец '+s2.sectors+' · ковчег '+s2.arkLv+(s2.night?' · до Ночи '+s2.nightLeft:'')+' · кликов '+clicks.n) }
    if(!s2.big&&!s2.pf&&(s2.paused||s2.speed!==4)&&!s2.win&&!s2.tab&&!s2.pop) await tap('#top [data-act="spd"][data-v="4"]');
    else if(!s2.big&&!s2.pf&&(s2.win||s2.tab||s2.pop)) await home();
    await wait(60);
  }

  /* ---------- финал ---------- */
  await wait(800); const endShot=await shot('end');
  const finO=await p.evaluate(()=>({day:LN.day,over:LN.over||null,souls:LN.souls||0,boarded:LN.boarded||0,left:LN.left||0,arkLv:arkRings(LN),grounded:!!LN.grounded,groundedWhy:LN.groundedWhy||null,people:Math.round(LN.earth.people),
    cols:Object.keys(LN.colonies).length,settled:settledCount(LN),gen:LN.gen||0,sectors:SECTORS.length,acts:LN.actions.length,bigText:(document.getElementById('noteL')||{innerText:''}).innerText.replace(/\s+/g,' ').slice(0,700)})).catch(()=>({}));
  const gameLog=await p.evaluate(()=>{ try{ return exportLog(LN) }catch(e){ return JSON.stringify({err:String(e)}) } }).catch(()=>null);
  if(gameLog) fs.writeFileSync(path.join(OUT,'game-log.json'),gameLog);
  const gaps=await p.evaluate(()=>window.__gaps).catch(()=>[]); const gapBy={}; gaps.forEach(g=>{ const k=g.ph||'игра'; (gapBy[k]=gapBy[k]||{n:0,ms:0,max:0}); gapBy[k].n++; gapBy[k].ms+=g.dt; gapBy[k].max=Math.max(gapBy[k].max,g.dt) });
  const toastBad={}; (await p.evaluate(()=>window.__toasts).catch(()=>[])).filter(t=>/bad/.test(t.cls)).forEach(t=>{ const k=t.txt.replace(/\d+/g,'#').slice(0,110); toastBad[k]=toastBad[k]||{n:0,ex:t.txt,year:t.day}; toastBad[k].n++ });
  const sailed=finO.over==='night'&&finO.souls>0&&!finO.grounded;
  const res={style:STYLE,seed:+SEED,over:finO.over,sailed,souls:finO.souls,boarded:finO.boarded,arkLv:finO.arkLv,grounded:finO.grounded,groundedWhy:finO.groundedWhy,day:finO.day,wall:wall(),clicks:clicks.n,lost:clicks.lost,covered:clicks.covered,missed,maxJump,planErrs,actYears,pageErrs:pageErrs.length};
  res.gaps=gapBy; fs.writeFileSync(path.join(OUT,'events.json'),JSON.stringify({res,gaps:gaps.slice(0,600),finO,stat,notes,firsts,interrupts,opened,trace,fails,toastBad,pageErrs,events:ev.slice(-4000)},null,1));
  const L=[];
  L.push('# Партия мышью — '+STYLE+', сид '+SEED,'',
    '**Итог:** '+(finO.over?('конец: '+finO.over+(finO.over==='night'?(sailed?' — ковчег ушёл':' — ковчег НЕ ушёл'+(finO.groundedWhy?' ('+finO.groundedWhy+')':''))+' · разбужено '+finO.souls+' · на борту '+finO.boarded+' · уровень ковчега '+finO.arkLv:'')):'не доиграна (год '+finO.day+')')+
    ' · год '+finO.day+' · '+Math.round(wall()/60)+' мин реального времени на ×4 · нажатий мыши '+clicks.n+' (потеряно перерисовкой '+clicks.lost+', закрыто другим элементом '+clicks.covered+')',
    '**Не как у игрока:** обучение, голоса и взлом выключены хуком; сид вписан в поле; решения — голова бота `sim.js` ('+STYLE+(Object.keys(ENV).length?', '+Object.entries(ENV).map(x=>x.join('=')).join(' '):'')+') на копии состояния.','',
    '## Действия бота → мышь','','| действие | задумано | нажато и принято | отказ / не нашлось | не нужно |','|---|---|---|---|---|');
  for(const k of Object.keys(stat)) L.push('| '+k+' | '+stat[k].plan+' | '+stat[k].ok+' | '+stat[k].fail+' | '+stat[k].skip+' |');
  L.push('','Лет с действиями: '+actYears+' · лет, прошедших пачкой за один кадр: '+missed+' (самая большая пачка '+maxJump+'; длинные кадры: '+(Object.entries(gapBy).map(([k,v])=>k+' ×'+v.n+', до '+v.max+' мс').join('; ')||'нет')+') — доиграны следом'+' · ошибок головы бота: '+planErrs+' · ошибок страницы: '+pageErrs.length+' · миры открыты с карты '+opened.map+', из списка '+opened.list+', не открылись '+opened.fail,'');
  L.push('## Где руки расходятся с головой','');
  if(!Object.keys(notes).length) L.push('Не найдено.'); for(const k of Object.keys(notes)) L.push('- '+k+' ×'+notes[k].n+' · первый раз год '+notes[k].year+(notes[k].ex?' ('+notes[k].ex+')':''));
  L.push('','## Отказы (первые 40)','');
  const fw={}; fails.forEach(f=>{ const k=f.f+' ← '+f.why; (fw[k]=fw[k]||{n:0,ex:f}).n++ });
  L.push(Object.keys(fw).length?Object.entries(fw).sort((a,c)=>c[1].n-a[1].n).map(([k,v])=>'- '+k+' ×'+v.n+' · первый раз год '+v.ex.year+(v.ex.toast?' · «'+String(v.ex.toast).slice(0,110)+'»':'')+(v.ex.shot?' · '+v.ex.shot:'')).join('\n'):'Отказов нет.');
  L.push('','## Вехи','',Object.entries(firsts).map(([k,v])=>k+': год '+v.year+' ('+Math.round(v.t/60)+' мин)').join(' · '),'','Большие окна: '+(Object.entries(interrupts).map(([k,v])=>k+' ×'+v).join(', ')||'нет'),'',
    'Красные тосты: '+(Object.values(toastBad).sort((a,c)=>c.n-a.n).slice(0,10).map(t=>'«'+t.ex.slice(0,90)+'» ×'+t.n).join('; ')||'нет'),'','## Ряд (каждые 250 лет)','','```','год · миров · люди · еда · металл · топливо · детали · судов · поколение · колец · ковчег');
  trace.forEach(x=>L.push([x.day,x.cols,x.people,x.food,x.metal,x.fuel,x.parts,x.ships,x.gen,x.ring,x.ark].join(' · '))); L.push('```','','Экран конца: '+endShot,'','> '+String(finO.bigText||'').slice(0,600));
  fs.writeFileSync(path.join(OUT,'report.md'),L.join('\n'));
  await b.close();
  console.log('RESULT '+JSON.stringify(res));
  process.exit(0);
})().catch(e=>{ console.error('MOUSE-RUN CRASH',e); process.exit(3) });
