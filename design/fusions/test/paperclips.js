// Проверка paperclips: node design/fusions/test/paperclips.js [bots|ui|all]
const {chromium}=require('E:/ClaudeCowork/last-berth/node_modules/playwright');
const path=require('path'),fs=require('fs');
const FILE='file:///'+path.resolve(__dirname,'..','paperclips.html').replace(/\\/g,'/');
const SHOTS=path.join(__dirname,'shots'); fs.mkdirSync(SHOTS,{recursive:true});
const mode=process.argv[2]||'all';
const SEEDS=[11,22,33,44,55,66,77,88];

/* ---------- боты: читают состояние как игрок, действуют через GAME.act, руки ограничены темпом ---------- */
const BOTS=`
(function(){
function hand(S,cd){ if((S._hand||0)>S.t) return false; S._hand=S.t+cd; return true }
function common(G,S,cfg){ var A=G.act,return_=0;
  if(!S.got.feed&&S.hungry>=1&&hand(S,.45)) A.feed();
  if(S.on.flight&&!S.got.line&&S.flight<=0) A.flight();
  if(S.on.dose){ var dw=cfg.dose; if(S.dis&&S.use.food>S.inc.food&&S.food/(S.use.food-S.inc.food)<S.yn-S.y) dw=Math.min(dw,.7); if(S.dose!==dw&&!S.broken.dose) A.dose(dw) }
  if(S.on.out&&S.outS!==cfg.out&&!S.dis) A.out(cfg.out);
  /* узлы: память под цену следующей дорогой цели */
  while(S.nodes>0&&!S.broken.core){ var L=G.available(); var want=0; L.forEach(function(x){ if(!cfg.skip[x.id]) want=Math.max(want,x.c) }); if(G.nextRing()&&S.on.fuel&&['food','fuel','metal'].some(function(r){ return G.depth(r)<500 })) want=Math.max(want,G.nextRing().c); if(S.got.date&&!S.got.ark) want=Math.max(want,1400); if(!S.got.date&&S.y>600) want=Math.max(want,750); A.node(G.cap()<want*1.05?'mem':'proc') }
  /* проект: первый доступный по приоритету */
  if(S.on.fuel&&!S.dis){ var urgent=['food','fuel','metal'].some(function(r){ return G.depth(r)<380 }),nr=G.nextRing(); if(urgent&&nr&&nr.req()){ if(G.cap()<nr.c){ } else if(A.buy(nr.id)===true){} else { return_=1 } } }
  var order=cfg.order; for(var i=0;!return_&&i<order.length;i++){ var id=order[i]; if(S.got[id]||cfg.skip[id]) continue; var r=A.buy(id); if(r===true) break; if(r!=='Ещё нельзя'&&(id==='date'||id==='ark'||(r.indexOf('металл')<0&&order.indexOf(id)<cfg.waitFor))) break }
  if(S.dis) return;
  /* суда и миры: один клик в секунду, пока нет автомата */
  if(S.on.yard&&hand2(S,cfg.shipCd)){ var W=S.W;
    var dead=W.filter(function(w){ return w.dead&&G.shipCount(w)>0 })[0]; if(dead){ A.move(dead.i) }
    /* запас металла под ближайший проект с ценой в металле */
    var res0=0; G.available().forEach(function(x){ if(x.m&&!cfg.skip[x.id]) res0=Math.max(res0,x.m) }); var free=S.metal-res0;
    var liveOf=function(r){ return W.filter(function(w){ return w.res===r&&w.founded&&!w.dead }) };
    var deficit=function(r){ return S.inc[r]-S.use[r] };
    ['metal','food','fuel'].some(function(r0){ if(r0==='fuel'&&!S.on.fuel) return false; if(liveOf(r0).length) return false; var nw0=W.filter(function(w){ return w.res===r0&&!w.founded&&w.ring<=S.ring })[0]; if(nw0) A.found(nw0.i); return !!nw0 });
    var res; if(S.on.fuel&&deficit('fuel')<S.use.fuel*.25) res='fuel'; else if(deficit('food')<S.use.food*.2) res='food'; else if(S.inc.metal<S.inc.food*cfg.mratio) res='metal'; else res=(S.inc.food*.5<S.use.food)?'food':'metal';
    var live=liveOf(res),tot=live.reduce(function(s,w){ return s+w.dep },0),burn=Math.max(S.inc[res],S.use[res]);
    if(!live.length||tot<burn*220){ var nw=W.filter(function(w){ return w.res===res&&!w.founded&&w.ring<=S.ring })[0]; if(nw){ var r=A.found(nw.i); if(r===true) return; if(!live.length) return } }
    if(live.length&&!S.got.autoyard&&free>=G.price(G.shipCls())){ live.sort(function(a,b){ return G.shipCount(a)/(a.dep+1)-G.shipCount(b)/(b.dep+1) }); A.ship(live[0].i) }
  }
  if(S.on.courier&&S.cour<cfg.cour&&S.got.date) A.courier();
  if(S.arkOn) A.arkShare(cfg.ark);
}
function hand2(S,cd){ if((S._hand2||0)>S.t) return false; S._hand2=S.t+cd; return true }
function dismantle(G,S,cfg){ var A=G.act; if(!S.dis||!hand(S,cfg.pace)) return;
  var W=S.W;
  /* 1) поднимать миры от дальних к ближним, пока есть что */
  var left0=S.yn-S.y,liftAt=cfg.liftAt; var lift=W.filter(function(w){ return w.pop>=1&&!w.lift&&(w.dead||left0<liftAt[w.res]+w.ring*40) }).sort(function(a,b){ return b.ring-a.ring })[0]; if(lift&&S.cour>0){ A.lift(lift.i); return }
  /* 2) панели без последствий */
  var left=S.yn-S.y;
  var soft=['stock','stats','ark','proj','core','clock'].filter(function(x){ return !S.broken[x] }); if(soft.length&&left<cfg.softAt){ A.brk(soft[0]); return }
  /* 3) линии: дальние раньше; топливо и рационы позже всех */
  var rank={metal:0,fuel:1,food:2};
  var lines=W.filter(function(w){ return G.shipCount(w)>0 }).sort(function(a,b){ return rank[a.res]-rank[b.res]||b.ring-a.ring });
  var l=lines[0]; if(l&&(left<cfg.dropAt[l.res]+l.ring*25)){ A.drop(l.i); return }
  /* 4) под самый конец: верфь, журнал, разборка, кнопка */
  if(left<cfg.endAt&&!lines.length){ var cl=W.some(function(w){ return w.lift }); if(!S.broken.yard&&(!cl||left<90)){ A.brk('yard'); return } if(!S.broken.dose){ A.brk('dose'); return } if(!S.broken.log&&cfg.breakLog&&left<70){ A.brk('log'); return } }
}
var base={shipCd:.8,liftAt:{metal:900,fuel:450,food:200},mratio:.6,dose:1,out:.45,ark:.7,cour:18,pace:1.2,beginAt:1050,softAt:700,dropAt:{metal:520,fuel:200,food:110},endAt:120,breakLog:false,waitFor:6,skip:{},
  order:['feed','line','yard','tug','ring2','courier','batch','auto','ring3','autoyard','frt','date','ark','hour','sum','ring4','ring5','tablets','copy','lists','kids','ration']};
function drive(G,S,cfg){ common(G,S,cfg); if(!S.dis&&S.arkOn&&S.yn-S.y<cfg.beginAt) G.act.begin(); dismantle(G,S,cfg) }
function mk(o){ var c=JSON.parse(JSON.stringify(base)); for(var k in o) c[k]=o[k]; return c }
return {
 idle:function(G,S){},
 late:(function(){ var c=mk({beginAt:200,liftAt:{metal:200,fuel:150,food:100},dropAt:{metal:120,fuel:80,food:40},softAt:150}); return function(G,S){ drive(G,S,c) } })(),
 novice:(function(){ var c=mk({shipCd:3,pace:2.5,beginAt:800,out:.5,cour:10}); return function(G,S){ drive(G,S,c) } })(),
 clicker:function(G,S){ if(!S.got.feed&&S.hungry>=1&&hand(S,.45)) G.act.feed(); if(S.on.flight&&S.flight<=0) G.act.flight() },
 sensible:function(G,S){ drive(G,S,base) },
 warm:(function(){ var c=mk({skip:{batch:1,hour:1,lists:1,kids:1,ration:1,subtract:1,compress:1}}); return function(G,S){ drive(G,S,c) } })(),
 cold:(function(){ var c=mk({order:['feed','line','yard','tug','ring2','batch','courier','hour','lists','auto','ring3','kids','autoyard','frt','date','ark','ration','sum','subtract','compress','ring4','ring5'],skip:{tablets:1,copy:1},breakLog:true}); return function(G,S){ drive(G,S,c) } })(),
 greedy:(function(){ var c=mk({order:['feed','line','yard','tug','ring2','batch','auto','ring3','hour','autoyard','frt','lists','sum','kids','ring4','ration','ring5','date','subtract','compress','ark'],dose:.7,out:.85,ark:.2,cour:2,beginAt:90}); return function(G,S){ drive(G,S,c) } })(),
 noark:(function(){ var c=mk({skip:{date:1,ark:1}}); return function(G,S){ drive(G,S,c) } })()
};
})()`;
async function runBots(page){ const res=await page.evaluate(({BOTS,SEEDS})=>{ const B=eval(BOTS),G=GAME,out={};
    for(const name of Object.keys(B)){ out[name]=[]; for(const sd of SEEDS){ G.reset(sd); let S=G.S,n=0; while(!S.over&&n<30000){ B[name](G,S); G.step(.25); n++ } const o=S.over||{}; out[name].push({seed:sd,souls:o.souls,seats:o.seats,home:o.home,left:o.left,names:o.names,why:o.why,t:Math.round(o.t||S.t),win:!!o.win,peak:o.peak,cold:o.cold,nodes:S.nodeN,inflight:o.inflight,crew:o.crew,fleet:G.fleet(),ring:S.ring,proj:Object.keys(S.got).length}) } } return out },{BOTS,SEEDS});
  const med=a=>a.slice().sort((x,y)=>x-y)[a.length>>1];
  console.log('бот\tсиды ок\tдуши мед\tмин-макс\tимён мед\tмест мед\tдома мед\tпик мед\tосталось\tсек\tфинал');
  for(const k in res){ const r=res[k]; console.log([k,r.filter(x=>x.win).length+'/'+r.length,med(r.map(x=>x.souls)),Math.min(...r.map(x=>x.souls))+'-'+Math.max(...r.map(x=>x.souls)),med(r.map(x=>x.names)),med(r.map(x=>x.seats)),med(r.map(x=>x.home)),med(r.map(x=>x.peak)),med(r.map(x=>x.left)),med(r.map(x=>x.t)),r[0].why].join('\t')) }
  if(process.env.DETAIL) console.log(JSON.stringify(res[process.env.DETAIL],null,0));
  return res }

async function trace(page,bot,seed){ const r=await page.evaluate(({BOTS,bot,seed})=>{ const B=eval(BOTS),G=GAME; G.reset(seed); let S=G.S,n=0,out=[],nx=0; while(!S.over&&n<30000){ B[bot](G,S); G.step(.25); n++; if(S.t>=nx){ nx+=30; out.push([Math.round(S.t),Math.round(S.y),Math.round(G.pop()),Math.round(S.home),Math.round(S.crew),Math.round(G.colonists()),Math.round(S.hungry),Math.round(S.food),Math.round(S.metal),Math.round(S.fuel),Math.round(S.inc.food*100)+'/'+Math.round(S.use.food*100),Math.round(S.inc.metal*100)+'/'+Math.round(S.use.metal*100),Math.round(S.inc.fuel*100)+'/'+Math.round(S.use.fuel*100),G.fleet(),S.cour,S.proc+'/'+S.mem,S.nodes,Math.round(S.tacts),S.ring,G.seats(),Math.round(S.names),S.trust.toFixed(2),Object.keys(S.got).length,S.dis?1:0].join(' ')) } } return {head:'t y P home crew col hun food metal fuel f+/- m+/- fu+/- fleet cour p/m nodes tacts ring seats names trust proj dis',out,over:S.over,got:Object.keys(S.got).join(',')} },{BOTS,bot,seed}); console.log(r.head); r.out.forEach(x=>console.log(x)); console.log(JSON.stringify(r.over).slice(0,400)); console.log(r.got) }
async function aim(page,loc){ const vis=await loc.isVisible(); if(!vis) throw new Error('не виден: '+loc); await loc.evaluate(e=>e.scrollIntoView({block:'center'})); await page.waitForTimeout(60); const b=await loc.boundingBox(); if(!b) throw new Error('нет элемента'); const x=b.x+b.width/2,y=b.y+b.height/2; const ok=await loc.evaluate((e,[x,y])=>{ const t=document.elementFromPoint(x,y); return !!t&&(t===e||e.contains(t)) },[x,y]); if(!ok) throw new Error('элемент перекрыт: '+await loc.evaluate((e,[x,y])=>e.outerHTML.slice(0,60)+' ← '+(document.elementFromPoint(x,y)||{outerHTML:'null'}).outerHTML.slice(0,120)+' @'+x+','+y+' scrollTop '+document.getElementById('lb-stage').scrollTop,[x,y])); if(b.height<40&&!/feed/.test(await loc.evaluate(e=>e.id))) throw new Error('зона нажатия '+b.height+': '+await loc.evaluate(e=>e.outerHTML.slice(0,80))); return [x,y] }
async function tapEl(page,loc){ const [x,y]=await aim(page,loc); await page.touchscreen.tap(x,y) }
async function clickEl(page,loc){ const [x,y]=await aim(page,loc); await page.mouse.click(x,y) }
const seen=(page,txt)=>page.getByText(txt,{exact:false}).first().isVisible();

async function ui(browser,name,opts,hit){ const ctx=await browser.newContext(opts); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push('pageerror '+e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push('console '+m.text()) });
  const shot=async s=>{ await page.waitForTimeout(450); await page.screenshot({path:path.join(SHOTS,'paperclips-'+name+'-'+s+'.png')}) };
  await page.goto(FILE+'?seed=11'); await page.waitForTimeout(200);
  /* окно «?» при входе */
  if(!await seen(page,'Вы — Пульт')) throw new Error('нет окна ?');
  await shot('0-help');
  await hit(page,page.getByRole('button',{name:'Играть',exact:true}));
  await shot('1-start');
  if(!await page.locator('#feed').isVisible()) throw new Error('нет кнопки ПОДАТЬ РАЦИОН');
  /* только одна кнопка */
  const panels0=await page.locator('.p').count(); if(panels0!==1) throw new Error('на старте панелей: '+panels0);
  /* первые решения руками */
  for(let i=0;i<14;i++){ await hit(page,page.locator('#feed')); await page.waitForTimeout(240) }
  if(!await seen(page,'ЛЮДИ')) throw new Error('нет панели ЛЮДИ');
  if(!await seen(page,'РАЦИОНЫ')) throw new Error('нет РАЦИОНЫ');
  const fed=await page.evaluate(()=>GAME.S.fed); if(fed<10) throw new Error('нажатий дошло '+fed);
  /* кормим до рейса */
  await page.evaluate(()=>{ GAME.S.food=49 }); await page.waitForTimeout(400);
  if(!await page.locator('#flight').isVisible()) throw new Error('нет кнопки РЕЙС');
  await hit(page,page.locator('#flight')); await page.waitForTimeout(200);
  if(await page.evaluate(()=>GAME.S.flight)<=0) throw new Error('рейс не пошёл');
  /* отказ объясняет причину */
  await hit(page,page.locator('#flight')); await page.waitForTimeout(100); if(!await page.locator('#lb-toast').isVisible()) throw new Error('нет отказа при повторном рейсе'); const refusal=await page.locator('#lb-toast').innerText(); if(!/в пути/i.test(refusal)) throw new Error('непонятный отказ: '+refusal);
  await page.evaluate(()=>{ GAME.speed=6 }); for(let i=0;i<8&&await page.evaluate(()=>GAME.S.flights<2);i++){ await page.waitForTimeout(500); await hit(page,page.locator('#feed')); if(await page.locator('#flight').isVisible()&&await page.evaluate(()=>GAME.S.flight<=0)) await hit(page,page.locator('#flight')) }
  await page.evaluate(()=>{ GAME.speed=1 });
  await page.waitForTimeout(300); if(!await seen(page,'РАЦИОН НА ЧЕЛОВЕКА')) throw new Error('нет ползунка рациона');
  /* ползунок настоящим указателем */
  const tr=page.locator('#p-dose .sl .tr').first(); await tr.evaluate(e=>e.scrollIntoView({block:'center'})); await page.waitForTimeout(60); const tb=await tr.boundingBox();
  if(opts.hasTouch){ await page.touchscreen.tap(tb.x+tb.width*.75,tb.y+tb.height/2) } else { await page.mouse.move(tb.x+tb.width*.5,tb.y+tb.height/2); await page.mouse.down(); await page.mouse.move(tb.x+tb.width*.75,tb.y+tb.height/2,{steps:4}); await page.mouse.up() }
  await page.waitForTimeout(100); const dose=await page.evaluate(()=>GAME.S.dose); if(Math.abs(dose-1.25)>.06) throw new Error('ползунок дал '+dose);
  await page.evaluate(()=>GAME.act.dose(1));
  /* первый проект: узел настоящим нажатием */
  await page.evaluate(()=>{ const S=GAME.S; S.serv=S.servNext+1; }); await page.waitForTimeout(300);
  if(!await seen(page,'ТАКТЫ И ПАМЯТЬ')) throw new Error('нет панели тактов');
  await page.evaluate(()=>{ GAME.S.tacts=30 }); await page.waitForTimeout(250);
  await hit(page,page.locator('[data-p="feed"]')); await page.waitForTimeout(250);
  if(!await page.evaluate(()=>GAME.S.got.feed)) throw new Error('проект РАЗДАЧА не куплен');
  if(await page.locator('#feed').isVisible()) throw new Error('кнопка кормления не исчезла');
  await shot('2-act1');

  /* отказ проекта: мало тактов */
  /* дальше бот ведёт партию на скорости в браузере; снимки середины */
  await page.evaluate(BOTS=>{ window.__B=eval(BOTS); window.__iv=setInterval(()=>{ const S=GAME.S; if(S.over) return; window.__B.sensible(GAME,S) },40); GAME.speed=30 },BOTS);
  await page.waitForFunction(()=>GAME.S.y>500,null,{timeout:120000}); await page.evaluate(()=>{ GAME.paused=true }); await shot('3-empire'); await page.evaluate(()=>{ GAME.paused=false });
  await page.waitForFunction(()=>GAME.S.got.date,null,{timeout:120000}); await page.evaluate(()=>{ GAME.paused=true }); await shot('4-date'); await page.evaluate(()=>{ GAME.paused=false });
  await page.waitForFunction(()=>GAME.S.arkOn,null,{timeout:120000}); await page.evaluate(()=>{ GAME.paused=true; GAME.speed=30 }); await shot('5-ark'); await page.evaluate(()=>{ GAME.paused=false });
  await page.waitForFunction(()=>GAME.S.got.sum||GAME.S.yn-GAME.S.y<1250,null,{timeout:120000}); await page.evaluate(()=>{ GAME.paused=true }); await shot('5b-sum');
  /* разборка руками: настоящие нажатия */
  await page.evaluate(()=>{ clearInterval(window.__iv); GAME.speed=1; GAME.S.cour=Math.max(GAME.S.cour,14); GAME.paused=true });
  const b=page.getByRole('button',{name:'НАЧАТЬ РАЗБОРКУ'}).first(); await hit(page,b); await page.waitForTimeout(350);
  if(!await page.evaluate(()=>GAME.S.dis)) throw new Error('разборка не началась');
  await shot('6-dis');
  /* журнал и панели исчезают буквально */
  for(const id of ['stock','stats','proj','core','dose','ark']){ const brk=page.locator('#p-'+id+' .brk'); await page.waitForTimeout(120); await hit(page,brk); await page.waitForTimeout(1100); if(await page.locator('#p-'+id).count()) throw new Error('панель не исчезла: '+id+' / '+await page.evaluate(i=>JSON.stringify([GAME.S.broken,GAME.S.over&&GAME.S.over.why,document.getElementById('p-'+i).__brk.textContent]),id)) }
  await shot('7-dis-mid');
  /* миры: поднять и снять настоящими нажатиями */
  let n=0; while(n<3){ const lift=page.locator('.w .a2.y').first(); if(!await lift.count()) break; await hit(page,lift); await page.waitForTimeout(150); n++ }
  const dr=page.locator('.w .a1.r').first(); const liveBefore=await page.evaluate(()=>GAME.fleet()); await hit(page,dr); await page.waitForTimeout(150); if(await page.evaluate(()=>GAME.fleet())>=liveBefore) throw new Error('линия не снята');
  await page.evaluate(()=>{ GAME.S.yn=Math.max(GAME.S.yn,GAME.S.y+500) });
  /* отказ: разборка без панелей */
  const wbk=page.locator('#p-worlds .brk'); await hit(page,wbk); await page.waitForTimeout(120); if(!await page.locator('#lb-toast').isVisible()) throw new Error('нет отказа на панели миров');
  for(const id of ['yard','clock','log']){ const brk=page.locator('#p-'+id+' .brk'); await hit(page,brk); await page.waitForTimeout(800); }
  await shot('8-dis-late');
  await hit(page,wbk); await page.waitForTimeout(1200);
  if(await page.locator('.p').count()) throw new Error('панели остались: '+await page.locator('.p').count());
  if(!await page.locator('#lastb').isVisible()) throw new Error('нет последней кнопки');
  await shot('9-last');
  await hit(page,page.locator('#lastb')); await page.waitForTimeout(250); await shot('9b-black');
  await page.waitForSelector('#again',{timeout:6000});
  await shot('A-end');
  const endTxt=await page.locator('#end').innerText(); if(!/ДУШ НА БОРТУ/.test(endTxt)) throw new Error('нет итога');
  await hit(page,page.locator('#again')); await page.waitForTimeout(350);
  if(!await page.locator('#feed').isVisible()) throw new Error('заново не сработало');
  if(await page.evaluate(()=>GAME.S.y>2)) throw new Error('заново: год не сброшен');
  /* геометрия: нет горизонтальной прокрутки */
  const sw=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth,document.getElementById('lb-stage').scrollWidth]); if(sw[0]>sw[1]||sw[2]>sw[1]) throw new Error('горизонтальная прокрутка '+sw);
  console.log(name,'итог:',endTxt.split('\n').slice(0,6).join(' | ').slice(0,200));
  if(errs.length) throw new Error(errs.join('; '));
  console.log(name,'ok'); await ctx.close() }

/* партия целиком: бот в браузере, до итога, кнопка «заново» */
async function full(browser){ const ctx=await browser.newContext({viewport:{width:1440,height:900}}); const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text()) });
  await page.goto(FILE+'?auto=1&seed=33'); await page.evaluate(BOTS=>{ const B=eval(BOTS); setInterval(()=>{ if(!GAME.S.over) B.sensible(GAME,GAME.S) },30); GAME.speed=20 },BOTS);
  await page.waitForSelector('#again',{timeout:180000}); const t=await page.locator('#end').innerText(); console.log('партия целиком:',t.replace(/\n+/g,' | ').slice(0,300));
  await page.screenshot({path:path.join(SHOTS,'paperclips-full-end.png')}); await clickEl(page,page.locator('#again')); await page.waitForTimeout(300); if(!await page.locator('#feed').isVisible()) throw new Error('заново не сработало'); if(errs.length) throw new Error(errs.join(';')); await ctx.close(); console.log('full ok') }

(async()=>{ const browser=await chromium.launch();
  try{
    if(mode==='bots'||mode==='all'){ const c=await browser.newContext(); const p=await c.newPage(); await p.goto(FILE+'?auto=1'); await runBots(p); await c.close() }
    if(mode==='trace'){ const c=await browser.newContext(); const p=await c.newPage(); await p.goto(FILE+'?auto=1'); await trace(p,process.argv[3]||'sensible',+(process.argv[4]||11)); await c.close() }
    if(mode==='ui'||mode==='all'||mode==='desk') await ui(browser,'desk',{viewport:{width:1440,height:900}},clickEl);
    if(mode==='ui'||mode==='all'||mode==='phone') await ui(browser,'phone',{viewport:{width:390,height:844},hasTouch:true,isMobile:true},tapEl);
    if(mode==='full'||mode==='all') await full(browser);
  } finally { await browser.close() }
})().catch(e=>{ console.error('FAIL',e.stack.slice(0,500)); process.exit(1) });
