/* PLAYTEST — бот-игрок через настоящий браузер. Играет мышью по видимому интерфейсу (клики по картам/кнопкам, закрывает модалки),
   смотрит на экран глазами аудита и пишет отчёт + лог. Запускать после правок интерфейса или по команде Никиты.
     node tools/playtest.js [--minutes 4] [--seed 309573272] [--viewport 1500x950] [--god] [--out dir] [--shots]
   --god   использовать work/LAST-BERTH-god.html и промотку GOD.skip в «пустых» местах: доходит дальше за те же минуты
           (тогда это уже не чистое время игрока — в отчёте помечено).
   Результат: work/playtest/<метка>/report.md · events.json (всё, что бот делал и видел) · game-log.json (экспорт лога игры) · shots/*.png
   Бот не оценивает «ощущение» — он ловит механические проблемы (ошибки, утечки текста, обрезка, перекрытия, мёртвые кнопки,
   зависания, перебор модалок) и честно пишет, сколько раз и где игроку «нечего делать». Ощущение оцениваешь по скриншотам и журналу. */
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),url=require('url');
const argv=process.argv.slice(2); const arg=(n,d)=>{ const i=argv.indexOf('--'+n); return i<0?d:(argv[i+1]&&!argv[i+1].startsWith('--')?argv[i+1]:true) };
const MIN=+arg('minutes',4), SEED=String(arg('seed','309573272')), VP=String(arg('viewport','1500x950')).split('x').map(Number);
const GOD=!!arg('god',false), SHOTS_ALL=!!arg('shots',false);
const ROOT=path.resolve(__dirname,'..');
const stamp=new Date().toISOString().replace(/[:T]/g,'-').slice(0,16)+(VP[0]<700?'-mobile':'');
const OUT=path.resolve(String(arg('out',path.join(ROOT,'work','playtest',stamp)))); fs.mkdirSync(path.join(OUT,'shots'),{recursive:true});
const ev=[]; const issues=new Map(); const marks=[]; const t0=Date.now();
const wall=()=>+((Date.now()-t0)/1000).toFixed(1);
const rec=(type,o)=>ev.push(Object.assign({t:wall(),type},o));

(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const ctx=await b.newContext({viewport:{width:VP[0],height:VP[1]},hasTouch:VP[0]<700});
  const p=await ctx.newPage();
  const consoleErrs=[]; p.on('pageerror',e=>{ consoleErrs.push(String(e)); addIssue('crit','pageerror',String(e).slice(0,200)) });
  p.on('console',m=>{ if(m.type()==='error'){ const t=m.text(); if(!/fonts\.(googleapis|gstatic)|ERR_FAILED|net::/.test(t)) addIssue('warn','console-error',t.slice(0,200)) } });
  await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const page=path.join(ROOT,'work',GOD?'LAST-BERTH-god.html':'page.html');
  if(!fs.existsSync(page)){ console.error('нет '+page+(GOD?' — сначала node tools/make-god.js':' — сначала сборка')); process.exit(2) }
  await p.goto(url.pathToFileURL(page).href); await p.waitForTimeout(400);

  /* ---------- проблемы ---------- */
  let shotN=0;
  async function shot(name){ const f='shots/'+String(++shotN).padStart(2,'0')+'-'+name.replace(/[^\w-]+/g,'_').slice(0,40)+'.png'; try{ await p.screenshot({path:path.join(OUT,f)}) }catch(e){} return f }
  function addIssue(sev,kind,detail,shotFile){ const key=kind+'|'+String(detail).replace(/\d+/g,'#').slice(0,80);
    const x=issues.get(key); if(x){ x.n++; x.lastYear=curYear; return }
    issues.set(key,{sev,kind,detail:String(detail).slice(0,260),n:1,year:curYear,t:wall(),shot:shotFile||null}) }
  let curYear=0;

  /* ---------- мышь и ввод ---------- */
  async function box(sel){ const L=p.locator(sel).first(); if(!(await L.count())) return null; try{ await L.scrollIntoViewIfNeeded({timeout:1500}) }catch(e){} return L.boundingBox() }
  async function tap(sel,opt){ opt=opt||{};
    let bb=await box(sel); if(!bb) return false;
    const probe=async()=>{ const x=bb.x+bb.width/2, y=bb.y+bb.height/2;
      const h=await p.evaluate(({x,y,sel})=>{ const t=document.elementFromPoint(x,y), want=document.querySelector(sel); return {ok:!!(t&&want&&(want.contains(t)||t.contains(want))), top:t?(t.id?'#'+t.id:t.tagName+'.'+String(t.className&&t.className.baseVal!==undefined?t.className.baseVal:t.className).split(' ')[0]):null} },{x,y,sel}).catch(()=>({ok:true}));
      return Object.assign(h,{x,y}) };
    let hit=await probe();
    if(!hit.ok){ await p.waitForTimeout(120); bb=await box(sel); if(!bb) return false; hit=await probe() }   // the page redraws every tick: measure again before blaming the layout
    if(!hit.ok){ if(!opt.soft) addIssue('warn','click-covered',sel+' перекрыт '+hit.top+' (viewport '+VP.join('x')+')',await shot('covered')); rec('tap-covered',{sel,top:hit.top}); return false }
    const dis=await p.evaluate(sel=>{ const e=document.querySelector(sel); return e?{d:e.getAttribute('aria-disabled')==='true',why:e.dataset.why||null,txt:(e.textContent||'').trim().slice(0,50)}:null },sel).catch(()=>null);
    await p.mouse.click(hit.x,hit.y); await p.waitForTimeout(opt.wait||90);
    if(dis&&dis.d){ rec('tap-disabled',{sel,why:dis.why,txt:dis.txt}); return false }
    return true }
  async function covered(sel){ const bb=await box(sel); if(!bb) return null; const x=bb.x+bb.width/2,y=bb.y+bb.height/2;
    return p.evaluate(({x,y,sel})=>{ const t=document.elementFromPoint(x,y), w=document.querySelector(sel); return !(t&&w&&(w.contains(t)||t.contains(w))) },{x,y,sel}).catch(()=>false) }
  // a world hidden under a panel: the player drags the chart until it shows (the map pans) — so does the bot, once
  async function tapPlanet(id){ const sel='[data-p="'+id+'"] circle.hit';
    if(await covered(sel)){ const bb=await box(sel), m=await box('#map'); if(bb&&m){ const cx=m.x+m.width*0.5, cy=m.y+m.height*0.45;
      await p.mouse.move(cx,cy); await p.mouse.down(); await p.mouse.move(cx+(cx-bb.x-bb.width/2)/2,cy+(cy-bb.y-bb.height/2)/2,{steps:4}); await p.mouse.move(cx+(cx-bb.x-bb.width/2),cy+(cy-bb.y-bb.height/2),{steps:4}); await p.mouse.up(); await p.waitForTimeout(120); rec('map-pan',{id}) } }
    return tap(sel) }

  /* ---------- состояние игры (то, что игрок видит в шапке) ---------- */
  const S=()=>p.evaluate(()=>{ const G=window.LN,U=window.LNU; if(!G) return null; const E=G.earth;
    return {day:G.day,over:G.over||null,people:Math.round(E.people),food:Math.round(E.food),metal:Math.round(E.metal),fuel:Math.round(E.fuel),parts:Math.round(E.parts),
      need:G.need||null,cols:Object.keys(G.colonies).length,settled:settledCount(G),reach:reach(G),night:G.night||0,nightLeft:G.night?nightLeft(G):null,
      paused:!!U.paused,speed:U.speed,tab:U.tab,sel:U.sel,pro:U.pro&&U.pro.on?U.pro.stage:0,gen:G.gen||0,drive:G.driveLvl||0,sectors:SECTORS.length,
      free:G.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).length,ships:G.ships.filter(s=>s.mode!=='dead').length,
      canSurvey:canSurvey(G),arkMode:G.ark&&G.ark.mode||null,hungry:!!G.hungry,logLen:G.log.length} }).catch(()=>null);

  /* ---------- модалки: сколько раз и каких перебили игроку ---------- */
  const MODALS=[['callok','подсказка'],['pfok','личные дела'],['shiftok','отчёт смены'],['nightok','модалка Ночи'],['nofreeclose','«нет свободных миров»'],['gskip','гид'],['nofreego','«нет свободных» → перейти']];
  const interrupts={};
  async function dismiss(){ let n=0;
    for(let i=0;i<8;i++){ let did=false;
      for(const [act,label] of MODALS){ if(act==='nofreego') continue;
        if(await p.locator('[data-act="'+act+'"]').first().isVisible().catch(()=>false)){ if(await tap('[data-act="'+act+'"]',{soft:true})){ interrupts[label]=(interrupts[label]||0)+1; did=true; n++ } } }
      if(!did) break }
    return n }
  async function ensureRunning(){ const s=await S(); if(!s) return;
    if(s.paused){ if(!(await tap('#b-pause',{soft:true}))) await p.keyboard.press('Space') }
    if(s.speed!==10) await tap('[data-spd="10"]',{soft:true}) }

  /* ---------- аудит экрана ---------- */
  async function audit(tag){
    const r=await p.evaluate(()=>{ const out=[]; const vw=innerWidth, vh=innerHeight;
      const vis=e=>{ const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return null; const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0) return null; return r };
      const name=e=>(e.id?'#'+e.id:e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/)[0]:''))+' «'+(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,40)+'»';
      // утечки текста — по текстовым узлам, с именем элемента (innerText не говорит, где)
      var LEAK=[[/undefined/,'undefined'],[/NaN/,'NaN'],[/\[object /,'[object]'],[/\{[a-zA-Z]+\}/,'{плейсхолдер}'],[/Infinity/,'Infinity'],[/(^|[^a-zA-Z])null([^a-zA-Z]|$)/,'null']];
      var tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT), tn, leaks=0;
      while((tn=tw.nextNode())&&leaks<6){ var pe=tn.parentElement; if(!pe||pe.closest('#god,#god-tab,script,style,noscript')) continue; var tx=tn.textContent; if(!tx.trim()) continue;
        for(var li=0;li<LEAK.length;li++){ var mm=tx.match(LEAK[li][0]); if(mm){ var rr=vis(pe); out.push(['crit','text-leak',LEAK[li][1]+' в '+name(pe)+(rr?'':' (скрыт)')+': «'+tx.replace(/\s+/g,' ').trim().slice(0,70)+'»']); leaks++; break } } }
      if(document.documentElement.scrollWidth>vw+2) out.push(['warn','page-hscroll','страница шире окна: '+document.documentElement.scrollWidth+'>'+vw]);
      var n=0, tiny=0, els=document.querySelectorAll('body *');
      for(var i=0;i<els.length&&n<40;i++){ var e=els[i]; if(e.closest('#god,#god-tab')) continue; var r=vis(e); if(!r) continue;
        var cs=getComputedStyle(e), own=Array.prototype.some.call(e.childNodes,function(c){return c.nodeType===3&&c.textContent.trim()});
        if(own&&e.scrollWidth>e.clientWidth+2&&cs.overflowX!=='visible'&&cs.overflowX!=='auto'&&cs.overflowX!=='scroll'){ out.push(['warn','clipped-text','обрезан по ширине: '+name(e)]); n++ }
        if(own&&parseFloat(cs.fontSize)<10) tiny++;
        if(own&&r.right>vw+3&&!e.closest('svg')) { out.push(['warn','offscreen','за правым краем: '+name(e)]); n++ }
        if(e.matches('[aria-disabled="true"]')&&!e.dataset.why&&e.tagName==='BUTTON') { out.push(['warn','disabled-no-reason','кнопка заблокирована без причины: '+name(e)]); n++ }
        if(vw<700&&(e.tagName==='BUTTON'||e.matches('[data-act]'))&&(r.height<30||r.width<30)&&r.width>4) { out.push(['info','small-target','мелкая цель нажатия '+Math.round(r.width)+'×'+Math.round(r.height)+': '+name(e)]); n++ } }
      if(tiny>40) out.push(['info','tiny-font',tiny+' текстовых элементов мельче 10px']);
      var labs=Array.prototype.filter.call(document.querySelectorAll('#map text'),function(t){ return vis(t)&&t.textContent.trim().length>=3 }), ov=0, ex='';
      for(var a=0;a<labs.length&&ov<6;a++){ var ra=labs[a].getBoundingClientRect(); for(var c=a+1;c<labs.length;c++){ var rb=labs[c].getBoundingClientRect();
        var ix=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left), iy=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);
        if(labs[a].textContent.trim()!==labs[c].textContent.trim()&&ix>2&&iy>2&&ix*iy>0.3*Math.min(ra.width*ra.height,rb.width*rb.height)){ ov++; ex=ex||labs[a].textContent.trim()+' × '+labs[c].textContent.trim() } } }
      if(ov) out.push(['warn','map-label-overlap','подписи на карте налезают друг на друга ('+ov+'+): '+ex]);
      var rb=document.getElementById('railbody'); if(rb&&vis(rb)&&rb.textContent.trim().length<10) out.push(['warn','empty-rail','правая колонка пустая']);
      return out }).catch(()=>[]);
    const fresh=r.filter(([sev,kind,detail])=>!issues.has(kind+'|'+String(detail).replace(/\d+/g,'#').slice(0,80)));
    const f=fresh.length?await shot(tag+'-'+fresh[0][1]):null; for(const [sev,kind,detail] of r) addIssue(sev,kind,detail,f) }

  /* ---------- вступление и пролог ---------- */
  rec('start',{page:path.basename(page),viewport:VP.join('x'),seed:SEED});
  await p.evaluate(s=>{ document.getElementById('seedin').value=s; document.querySelector('[data-act="new"]').click() },SEED);
  await tap('[data-lang="en"]'); await audit('lang');
  if(!(await tap('[data-act="oskip"]'))) addIssue('warn','no-skip','кнопка пропуска вступления не нашлась');
  await audit('start'); await tap('[data-act="prologue"]'); await dismiss();
  marks.push({t:wall(),year:0,what:'пролог начат'});

  /* ---------- политика игрока ---------- */
  const lastDid={}, did=[]; let stuckSince=Date.now(), lastDay=-1, lastActYear=0, idleStretches=[];
  async function act(name,fn){ const s0=await S(); let ok=false; try{ ok=await fn() }catch(e){ rec('bot-error',{act:name,err:String(e).slice(0,160)}) }
    if(ok){ const s1=await S(); rec('act',{act:name,year:s1&&s1.day}); did.push(name); lastActYear=s1?s1.day:lastActYear; lastDid[name]=lastActYear } else rec('act-fail',{act:name,year:s0&&s0.day}); return ok }
  const every=(name,years,y)=>(lastDid[name]===undefined)||(y-lastDid[name]>=years);

  async function policy(s){
    // 0. последний шаг пролога — кнопка «взять стол»
    if(await p.locator('[data-act="prodone"]').first().isVisible().catch(()=>false)){ if(await act('prodone',()=>tap('[data-act="prodone"]'))) return }
    // 1. заселить: ближайший свободный мир, в который есть кому лететь
    if(s.free>0&&s.people>110&&!s.arkMode&&every('colonize',6,s.day)){
      const pid=await p.evaluate(()=>{ const G=LN,E=G.earth; let best=null,bv=-1e9;
        for(const q of PLANETS){ if(q.sec>=SECTORS.length||G.colonies[q.id]||G.ghost[q.id]) continue; if(!document.querySelector('[data-p="'+q.id+'"] circle.hit')) continue;
          const sh=G.ships.find(x=>x.mode==='idle'&&x.at==='earth'&&!(x.from&&x.to)&&canReachSector(x,q.sec)); if(!sh) continue;
          let v=-q.dist; if(q.kind==='farm'&&E.food<(G.need?G.need.food:5)*40) v+=800; if(v>bv){bv=v;best=q.id} } return best });
      if(pid&&await act('colonize',async()=>{ if(!(await tapPlanet(pid))) return false; await p.waitForTimeout(120); return tap('[data-act="colonize"]') })) return }
    // 2. суда: когда свободных нет — заказать на верфи (кнопка «build» в панели Земли)
    if(s.free<2&&s.metal>260&&!s.arkMode&&every('build',5,s.day)){
      if(await act('build',async()=>{ await tap('.tab[data-tab="earth"]',{soft:true}); await dismiss(); return tap('[data-act="build"]:not([aria-disabled="true"])',{soft:true}) })) return }
    // 3. линии: у каждого мира должен быть курьер на постоянном заказе
    if(every('line',8,s.day)){
      const pid=await p.evaluate(()=>{ for(const k in LN.colonies){ if(!lineWant(LN,k,'courier')&&!lineWant(LN,k,'hauler')) return k } return null });
      if(pid&&await act('line',async()=>{ if(!(await tapPlanet(pid))) return false; await p.waitForTimeout(100); return tap('[data-act="want"].plus[data-c="courier"]:not([aria-disabled="true"])',{soft:true}) })) return }
    // 4. разведка колец
    if(s.canSurvey==='ok'&&s.food>300&&s.metal>300&&!s.arkMode&&every('survey',30,s.day)){
      if(await act('survey',async()=>{ await tap('.tab[data-tab="earth"]',{soft:true}); return tap('[data-act="survey"]:not([aria-disabled="true"])',{soft:true}) })) return }
    // 5. привод
    if(every('drive',40,s.day)){
      const pid=await p.evaluate(()=>{ if(LN.drive) return null; for(const k in LN.colonies){ const q=planet(k); if(q.kind==='works'&&LN.colonies[k].pop>=K.DRIVE_POP&&settledCount(LN)>=driveReachFor(LN)) return k } return null });
      if(pid&&await act('drive',async()=>{ if(!(await tapPlanet(pid))) return false; await p.waitForTimeout(100); return tap('[data-act="drive"]:not([aria-disabled="true"])',{soft:true}) })) return }
    // 6. Ночь: отложить место на ковчеге уровня 2
    if(s.night&&s.nightLeft!==null&&s.nightLeft<=1200&&!s.arkMode&&every('ark',60,s.day)){
      await act('ark',async()=>{ await tap('.tab[data-tab="earth"]',{soft:true}); await tap('[data-act="arksel"][data-l="2"]',{soft:true}); return tap('[data-act="arkplan"]:not([aria-disabled="true"])',{soft:true}) }) }
  }

  /* ---------- главный цикл ---------- */
  const deadline=Date.now()+MIN*60000; let step=0, auditEvery=6, lastShotYear=-999, seenOver=false, proStuckAt=0, lastStage=-1, stageSince=Date.now(), hacked=false;
  while(Date.now()<deadline){
    step++;
    const n=await dismiss(); if(n) rec('modals',{n});
    const s=await S(); if(!s){ rec('no-state',{}); await p.waitForTimeout(500); continue }
    curYear=s.day;
    if(s.over){ if(!seenOver){ seenOver=true; marks.push({t:wall(),year:s.day,what:'КОНЕЦ: '+s.over}); await shot('over-'+s.over); await audit('over') } break }
    // зависание: год не идёт дольше 12 секунд без паузы
    if(s.day!==lastDay){ lastDay=s.day; stuckSince=Date.now() }
    else if(Date.now()-stuckSince>12000&&!s.paused){ addIssue('crit','clock-stuck','год '+s.day+' не меняется 12+ с при включённых часах',await shot('stuck')); stuckSince=Date.now() }
    // пролог: следим за стадией; если не двигается 70 с — это тоже находка
    if(s.pro){ if(s.pro!==lastStage){ lastStage=s.pro; stageSince=Date.now(); marks.push({t:wall(),year:s.day,what:'пролог: стадия '+s.pro}) }
      else if(Date.now()-stageSince>70000&&!hacked){ addIssue('crit','prologue-stuck','пролог стоит на стадии '+s.pro+' 70+ с',await shot('prologue-stuck')); hacked=true;
        await p.evaluate(()=>{ const U=LNU; U.pro.on=false; U.pro.stage=6; LN.safe=false; U.pro.calls=['cAdvisor']; U.voiceSeq=Math.max(0,...LN.log.map(e=>e.seq||0)); U.shiftStop=false; LNdraw() }); marks.push({t:wall(),year:s.day,what:'пролог пропущен принудительно'}) } }
    else if(lastStage>0&&lastStage!==99){ marks.push({t:wall(),year:s.day,what:'пролог пройден'}); lastStage=99 }
    // первые вехи
    const first=(k,cond,what)=>{ if(cond&&!marks.some(m=>m.k===k)) marks.push({k,t:wall(),year:s.day,what}) };
    first('c1',s.cols>=1,'первая колония'); first('c5',s.cols>=5,'5 колоний'); first('c10',s.cols>=10,'10 колоний'); first('sv',s.sectors>2,'открыто третье кольцо');
    first('dr',s.drive>=1,'метка привода I'); first('nt',!!s.night,'Ночь датирована'); first('ark',!!s.arkMode,'ковчег заложен'); first('h',s.hungry,'Земля голодает');
    if(await p.evaluate(()=>!!LNU.logBig)){ rec('accidental-expand',{year:s.day}); await tap('#b-logx',{soft:true}) }
    await ensureRunning();
    await policy(s);
    // «нечего делать»: пока бот ничего не мог — копим растяжку
    if(s.day-lastActYear>=150&&!s.over){ if(!idleStretches.length||idleStretches[idleStretches.length-1].to!==undefined) idleStretches.push({from:lastActYear,to:undefined}); }
    else if(idleStretches.length&&idleStretches[idleStretches.length-1].to===undefined){ idleStretches[idleStretches.length-1].to=s.day }
    if(step%auditEvery===0) await audit('y'+s.day);
    if(SHOTS_ALL&&s.day-lastShotYear>=300){ lastShotYear=s.day; await shot('y'+s.day) }
    // режим бога: если игрок ничего не делал 100 лет, перемотать — чтобы дойти до позднего экрана
    if(GOD&&s.day-lastActYear>=100&&s.day<4000){ await p.evaluate(()=>GOD.skip(100)); rec('god-skip',{from:s.day}); lastActYear=s.day+100 }
    await p.waitForTimeout(260);
  }

  /* ---------- финал: итоговое состояние, журнал, экспорт ---------- */
  const fin=await S(); await dismiss(); await shot('final'); await audit('final');
  for(const tab of ['earth','worlds','fleet','advice']){ if(await tap('.tab[data-tab="'+tab+'"]',{soft:true})){ await p.waitForTimeout(150); await audit('tab-'+tab); if(tab==='worlds'||tab==='earth') await shot('tab-'+tab) } }
  const logText=await p.evaluate(()=>{ const e=document.getElementById('logbody')||document.getElementById('log'); return e?e.innerText.slice(0,6000):'' }).catch(()=>'');
  const gameLog=await p.evaluate(()=>{ try{ return exportLog(LN) }catch(e){ return JSON.stringify({err:String(e)}) } }).catch(()=>null);
  if(gameLog) fs.writeFileSync(path.join(OUT,'game-log.json'),gameLog);
  fs.writeFileSync(path.join(OUT,'events.json'),JSON.stringify({marks,interrupts,idleStretches,events:ev.slice(-3000)},null,1));

  const iss=[...issues.values()].sort((a,c)=>({crit:0,warn:1,info:2}[a.sev]-{crit:0,warn:1,info:2}[c.sev])||c.n-a.n);
  const yrs=fin?fin.day:0, secs=wall(); const cnt={}; did.forEach(a=>cnt[a]=(cnt[a]||0)+1);
  const disabledTaps={}; ev.filter(e=>e.type==='tap-disabled').forEach(e=>{ const k=(e.why||'без причины')+' ← '+e.txt; disabledTaps[k]=(disabledTaps[k]||0)+1 });
  const totalInt=Object.values(interrupts).reduce((a,c)=>a+c,0);
  const L=[];
  L.push('# Плейтест LAST BERTH — '+stamp, '',
    '**Страница:** '+path.basename(page)+(GOD?' (режим бога — часть лет промотана, это не чистое время игрока)':'')+' · **окно:** '+VP.join('×')+' · **seed:** '+SEED,
    '**Итог:** '+(fin?(fin.over?'конец игры: '+fin.over:'жива'):'?')+' · год '+yrs+' за '+secs+' с реального времени ('+(yrs/Math.max(1,secs)).toFixed(1)+' лет/с) · колоний '+(fin&&fin.cols)+' · людей на Земле '+(fin&&fin.people)+' · колец '+(fin&&fin.sectors)+' · привод '+(fin&&fin.drive),'');
  L.push('## Найденное ('+iss.length+')','');
  if(!iss.length) L.push('Механических проблем не поймано.','');
  for(const i of iss) L.push('- **['+i.sev+'] '+i.kind+'** ×'+i.n+' · год '+i.year+' — '+i.detail+(i.shot?' · ![]('+i.shot+')':''));
  L.push('','## Что делал игрок',''); L.push(Object.keys(cnt).length?Object.entries(cnt).map(([k,v])=>k+' ×'+v).join(' · '):'ничего не сделал (!)');
  L.push('','**Вехи** (год / секунды реального времени):',''); for(const m of marks) L.push('- год '+m.year+' · '+m.t+' с — '+m.what);
  L.push('','## Игровой опыт (цифры)','');
  L.push('- Прерываний модалками: **'+totalInt+'**'+(totalInt?' ('+Object.entries(interrupts).map(([k,v])=>k+' ×'+v).join(', ')+')':'')+' — на 100 лет: '+(totalInt/Math.max(1,yrs)*100).toFixed(1));
  const idleTotal=idleStretches.reduce((a,x)=>a+((x.to===undefined?yrs:x.to)-x.from),0);
  L.push('- Стоял без дела (≥150 лет подряд, бот не нашёл что нажать): '+idleStretches.length+' раз, всего '+idleTotal+' лет из '+yrs+(idleStretches.length?'; начала: '+idleStretches.slice(0,6).map(x=>x.from).join(', '):''));
  const dk=Object.entries(disabledTaps).sort((a,c)=>c[1]-a[1]);
  L.push('- Нажатия по заблокированным кнопкам (игрок пробовал, кнопка отвечала причиной): '+(dk.length?dk.slice(0,8).map(([k,v])=>k+' ×'+v).join('; '):'нет'));
  L.push('','## Журнал глазами игрока (хвост)','','```',(logText||'(журнал не прочитан)').split('\n').slice(0,40).join('\n'),'```','');
  L.push('Файлы: `events.json` (всё сделанное и увиденное), `game-log.json` (экспорт лога игры для balance), `shots/`.','');
  L.push('> Бот ловит механику, а не ощущение. Ощущение — по скриншотам из `shots/` и журналу выше.');
  fs.writeFileSync(path.join(OUT,'report.md'),L.join('\n'));
  await b.close();
  console.log('playtest → '+path.join(OUT,'report.md')); console.log('год '+yrs+' · '+(fin&&fin.over||'жива')+' · проблем: crit '+iss.filter(i=>i.sev==='crit').length+' · warn '+iss.filter(i=>i.sev==='warn').length+' · info '+iss.filter(i=>i.sev==='info').length+' · модалок '+totalInt);
  process.exit(iss.some(i=>i.sev==='crit')?1:0);
})().catch(e=>{ console.error('PLAYTEST CRASH',e); process.exit(3) });
