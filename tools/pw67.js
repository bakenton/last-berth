// pw67 — v5.32 (партия Никиты 16.11 на v5.29, design/PLAYTEST-v529-nikita.md, блок B — числа, и взлом улья):
//  2.1  вылет с поселенцами стоит топлива ×10 (K.FOUND_FUEL): цена в окне свободного мира колец 1 и 2, отказ при нехватке, списание — одна функция
//       foundFuel; курьер эвакуации и рейс линии — по старой цене;
//  2.2  первый хаб 2 500 металла (детали 750, рост ×1,5 прежние);   2.3  еда за капсулы ×1,5: кольцо I — 1 800 еды / 600 металла;
//  2.4  экипаж отказывается за 1–1,5 оборота линии до Ночи (было 1,5–3): год в предупреждении советника;
//  3    улей: кольца сот вращаются заметно (0,5 рад/с на уровне 1), ядро стреляет чаще, красные веера с первого уровня — уровни 1 и 3, по два кадра.
// Задание про первый пакет в карточке цели (часть 1) — pw66. Клики — мышью по видимым кнопкам; состояние готовится через ядро.
// Снимки: PW67_SHOTS=<папка>. Сборка: PW67_FILE (по умолчанию page.html). PW67_BEFORE=1 — тот же путь по старой сборке только ради снимков «до»: итог не судит.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW67_SHOTS||null, BEFORE=!!process.env.PW67_BEFORE, FILE=process.env.PW67_FILE||'page.html';
const K_WARN=100;   // K.MUTINY_WARN: years before the first refusal the Helm is told
const out=[]; const ok=(n,c,x)=>{ if(!BEFORE) out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):'')) };
const digits=t=>(String(t).match(/\d[\d\s   ]*/g)||[]).map(x=>+x.replace(/\D/g,''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n,sel)=>{ if(!SHOTS) return; const f=path.join(SHOTS,n+'.png'); const e=sel&&await pg.$(sel); if(e&&await e.isVisible()) await e.screenshot({path:f}); else await pg.screenshot({path:f}) };
  const mk=async()=>{ const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); return [p,UI.ui(p)] };
  const waitFor=async(p,fn,ms=8000)=>{ for(let t=0;t<ms;t+=100){ if(await fn()) return true; await p.waitForTimeout(100) } return !!(await fn()) };
  const [p,U]=await mk();
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const toast=()=>p.evaluate(()=>(document.getElementById('toasts')||{}).textContent||'');
  const reopen=async pid=>{ await p.evaluate(()=>{ LNU.win=null; LNU.tab=null; LNU.pop=null; LNdraw() }); const r=await U.openWorld(pid); await p.waitForTimeout(250); return r };
  const old=pid=>p.evaluate(pid=>Math.max(1,Math.round(planet(pid).dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(LN)))),pid);
  const prow=()=>p.evaluate(()=>{ const e=document.querySelector('#ovl .prow'), b=document.querySelector('#ovl [data-act="send"]'); return {t:e?e.innerText.replace(/\s+/g,' ').trim():'', pr:[...document.querySelectorAll('#ovl .prow .pr')].map(x=>x.innerText.replace(/\s+/g,' ').trim()), why:b?b.dataset.why||'':null} });

  // ---------- 2.1: the settlers' departure costs ten times the fuel ----------
  const W=await p.evaluate(()=>{ LN.safe=true; const f=s=>PLANETS.filter(q=>q.sec===s&&!LN.colonies[q.id]&&!(LN.ghost&&LN.ghost[q.id])).sort((a,b)=>a.dist-b.dist); return {r1:f(0)[0].id, r1b:f(0)[1].id, r2:f(1)[0].id, fuel0:LN.earth.fuel, day:LN.day} });
  const N={};
  for(const [k,pid] of [['r1',W.r1],['r2',W.r2]]){
    ok('2.1: a free world of ring '+(k==='r1'?1:2)+' opens by the mouse', await reopen(pid));
    const o=await old(pid), pr=await prow(), f=digits(pr.pr[0]||'')[0]; N[k]={old:o,now:f};
    await shot(p,'b1-send-'+(k==='r1'?'ring1':'ring2'),'#ovl .win');
    const c=BEFORE?null:await p.evaluate(pid=>({ff:foundFuel(LN,pid), x:K.FOUND_FUEL, per:K.FUEL_PER_DIST, exp:Math.max(1,Math.round(planet(pid).dist*K.FUEL_PER_DIST*10/Math.sqrt(driveSpeed(LN))))}),pid);
    ok('2.1: ring '+(k==='r1'?1:2)+' — FOUND A COLONY · PRICE shows the core\'s foundFuel: the old price ×10 (K.FOUND_FUEL 10, K.FUEL_PER_DIST as it was)', !!c&&c.x===10&&c.per===0.135&&f===c.ff&&c.ff===c.exp&&Math.abs(f-o*10)<=5&&f>o*8, 'window '+f+' · core '+(c&&c.ff)+' · old '+o+' · '+pr.t) }
  ok('2.1: the price grows with the distance — ring 2 dearer than ring 1; year 0, 240 fuel at home pays for the first settlers', N.r2.now>N.r1.now&&W.day<5&&W.fuel0>=N.r1.now, JSON.stringify(N)+' fuel at home '+W.fuel0);
  // short of fuel: the reason on the button and in the toast, nothing leaves
  ok('the nearest world of ring 1 opens again', await reopen(W.r1));
  await p.evaluate(n=>{ LN.earth.fuel=n-1; LNU.notes=[]; LNdraw() },N.r1.now); await p.waitForTimeout(200);
  const sh=await prow(); await shot(p,'b1-send-short-of-fuel','#ovl .win');
  await U.tap('#ovl [data-act="send"]'); await p.waitForTimeout(300);
  const tt=await toast(), st0=await p.evaluate(pid=>({en:!!enRoute(LN,pid), fuel:LN.earth.fuel, chk:canDepart(LN,LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'),pid,true), chkLine:canDepart(LN,LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'),pid)}),W.r1);
  ok('2.1: one fuel short of the new price — the button is off for fuel, the press says so, nobody leaves', sh.why==='short_fuel'&&/fuel/i.test(tt)&&!st0.en&&st0.fuel===N.r1.now-1, JSON.stringify(sh).slice(0,120)+' · '+tt.slice(-70));
  ok('2.1: the core refuses the settlers for fuel and would let a line run go at the old price (canDepart with and without the settlers)', st0.chk==='fuel'&&st0.chkLine==='ok', JSON.stringify(st0));
  await p.evaluate(n=>{ LN.earth.fuel=n+7; LNU.notes=[]; LNdraw() },N.r1.now); await p.waitForTimeout(200);
  await U.tap('#ovl [data-act="send"]'); await p.waitForTimeout(300);
  const st1=await p.evaluate(pid=>({en:!!enRoute(LN,pid), fuel:LN.earth.fuel}),W.r1);
  ok('2.1: SEND SETTLERS by the mouse with the fuel at home — she leaves, Earth pays exactly the price of the window', st1.en&&st1.fuel===7, JSON.stringify(st1)+' price '+N.r1.now);
  // the evacuation courier and a line run pay the old price
  const EV=await p.evaluate(W=>{ GOD.maxAll(); for(let i=0;i<300&&!LN.colonies[W.r1];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    const g=LN.gen||0, c=GOD.hull(HULLS.findIndex(h=>h.key==='courier'&&h.gen===g)), l=GOD.hull(HULLS.findIndex(h=>h.key==='courier'&&h.gen===g));
    const o=Math.round(planet(W.r1).dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(LN)));
    LN.earth.fuel=5000; const r2=setLine(LN,l.id,W.r1,'earth'); let sailed=null; for(let i=0;i<40&&sailed===null;i++){ const r0=LN.fuelRate||0; tick(LN); LN.pauseNow=false; LN.shiftOpen=false; if(l.mode==='transit') sailed=((LN.fuelRate||0)-r0*0.95)/0.05 }   // the core's own count of the year's departures (fuelRate is its running mean)
    LN.earth.fuel=5000; const r=abandon(LN,c.id,W.r1), evac=5000-LN.earth.fuel;
    LNU.notes=[]; LNU.win=null; LNdraw(); return {settled:!!LN.colonies[W.r1], r, evac, r2, sailed:sailed===null?null:+sailed.toFixed(2), old:o, found:typeof foundFuel==='function'?foundFuel(LN,W.r1):null} },W);
  ok('2.1: the evacuation courier leaves for the OLD price ('+EV.old+' fuel, the settlers paid '+EV.found+') — saving people did not get dearer', EV.settled&&EV.r==='ok'&&EV.evac===EV.old&&EV.found>EV.old*8, JSON.stringify(EV));
  ok('2.1: a run of the line burns the old price too (the core\'s count of the year\'s departures)', EV.r2==='ok'&&EV.sailed!==null&&EV.sailed>=EV.old-0.01&&EV.sailed<=EV.old*2+0.01&&EV.sailed<EV.found/4, JSON.stringify(EV));

  // ---------- 2.2: the first hub — 2 500 metal ----------
  const H=await p.evaluate(W=>{ GOD.maxAll(); LN.driveLvl=1; LN.gen=1; ensureGen(1); LNU.win=W.r1b; GOD.settle(); LNU.win=null; for(let i=0;i<300&&!LN.colonies[W.r1b];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    const pid=Object.keys(LN.colonies).filter(k=>planet(k).kind!=='works'&&LN.colonies[k].pop>0&&!LN.ships.some(s=>s.job==='evac'&&s.dest===k))[0];
    LN.earth.metal=2500; LN.earth.parts=750; LNU.notes=[]; LNdraw(); return {pid, cost:hubCost(LN), check:hubBuildCheck(LN,pid), hubs:Object.keys(LN.colonies).filter(k=>LN.colonies[k].hub).length} },W);
  await p.waitForTimeout(2600);   // the gift chips of the landing fly off
  ok('a settled world opens by the mouse', await reopen(H.pid)); await U.wtab('hub'); await p.waitForTimeout(250);
  const hb=await p.evaluate(()=>{ const e=document.getElementById('hubblk'), pr=e&&e.querySelector('.prow'), bt=e&&e.querySelector('[data-act="hubbuild"]'); return {t:pr?pr.innerText.replace(/\s+/g,' ').trim():'', pr:pr?[...pr.querySelectorAll('.pr')].map(x=>x.innerText):[], off:bt?bt.getAttribute('aria-disabled'):null} });
  await shot(p,'b2-first-hub-price','#ovl .win');
  ok('2.2: the first hub costs 2 500 metal and 750 parts — in the core and on the HUB tab', H.cost.metal===2500&&H.cost.parts===750&&digits(hb.pr[0]||'')[0]===2500&&digits(hb.pr[1]||'')[0]===750, JSON.stringify(H.cost)+' · '+hb.t);
  ok('2.2: with exactly 2 500 metal and 750 parts at home the button is on', H.check==='ok'&&hb.off!=='true', H.check+' '+JSON.stringify(hb));
  if(!BEFORE){ await U.tap('#hubblk [data-act="hubbuild"]'); await p.waitForTimeout(300) }
  const hb2=await p.evaluate(pid=>({hub:!!LN.colonies[pid].hub, metal:Math.round(LN.earth.metal), parts:Math.round(LN.earth.parts), next:hubCost(LN)}),H.pid);
  ok('2.2: BUILD by the mouse — the hub stands, Earth paid all of it; the second hub is ×1.5 (3 750 / 1 125)', hb2.hub&&hb2.metal===0&&hb2.parts===0&&hb2.next.metal===3750&&hb2.next.parts===1125, JSON.stringify(hb2));

  // ---------- 2.3: rations for the pods ×1.5 ----------
  await p.evaluate(()=>{ GOD.maxAll(); GOD.nightIn(2400); LN.nightSeen=true; LNU.win=null; LNU.notes=[]; LNdraw() }); await U.clear(); await U.tab('ark'); await p.waitForTimeout(300);
  const cellPt=await p.evaluate(()=>{ const e=document.querySelector('#ovl .hold .hr[data-v="1"] .hx'); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} });
  if(cellPt){ await p.mouse.click(cellPt.x,cellPt.y); await p.waitForTimeout(300) }
  const ak=await p.evaluate(()=>{ const e=document.getElementById('arkcard'); return {t:e?e.innerText.replace(/\s+/g,' ').trim():'', pr:e?[...e.querySelectorAll('.pr')].map(x=>x.innerText.replace(/\s+/g,' ').trim()):[], rings:[1,2,3,4,5,6,7,8,9].map(k=>arkRingPrice(k)), ladder:K.ARK_PRICE.food.join()} });
  await shot(p,'b3-ark-ring1-price','#ovl .win');
  const an=ak.pr.map(x=>digits(x)[0]);
  ok('2.3: v5.44 — rings I–IX cost (food / metal) 1 800/600 · 5 200/2 000 · 11 800/6 000 · 22 000/13 000 · 34 000/24 000 · 43 000/36 000 · 48 000/45 000 · 50 000/50 000 · 50 000/50 000, none above the ceiling', ak.rings.map(r=>r.food).join()==='1800,5200,11800,22000,34000,43000,48000,50000,50000'&&ak.rings.map(r=>r.metal).join()==='600,2000,6000,13000,24000,36000,45000,50000,50000', ak.ladder+' '+JSON.stringify(ak.rings));
  ok('2.3: the card of ring I in the Ark window names 1 800 rations and 600 metal', an.includes(1800)&&an.includes(600)&&!an.includes(1200), JSON.stringify(ak.pr)+' · '+ak.t.slice(0,160));
  if(!BEFORE){ await p.evaluate(()=>{ LN.earth.food=1800+500; LN.earth.metal=600; LNdraw() }); await p.waitForTimeout(150); await U.tap('#arkcard [data-act="arkbuy"]'); await p.waitForTimeout(300) }
  const ab=await p.evaluate(()=>({paid:arkPaid(LN), food:Math.round(LN.earth.food), metal:Math.round(LN.earth.metal)}));
  ok('2.3: FILL RING by the mouse — ring I is paid, 1 800 rations and 600 metal gone', ab.paid===1&&ab.food===500&&ab.metal===0, JSON.stringify(ab));

  // ---------- 2.4: the crews refuse later — 1 to 1.5 round trips before the Night ----------
  const M=await p.evaluate(W=>{ GOD.maxAll(); LNU.win=null; LNU.tab=null;
    const far=W.r2; if(!LN.colonies[far]){ LNU.win=far; GOD.settle(); LNU.win=null; for(let i=0;i<400&&!LN.colonies[far];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } }   // a world of ring 2: the far line breaks first
    LN.ships.forEach(s=>{ if(s.mode!=='dead'&&!s.job&&s.from&&s.to) clearLine(LN,s.id) });
    const g=LN.gen||0; GOD.maxAll(); for(let n=0;n<3;n++){ const s=GOD.hull(HULLS.findIndex(h=>h.key==='courier'&&h.gen===g)); setLine(LN,s.id,far,'earth') }
    const on=LN.ships.filter(x=>x.mode!=='dead'&&x.from&&x.to), mf=mutinyForecast(LN), rows=on.map(x=>{ const pid=x.from==='earth'?x.to:x.from, rt=legDays(LN,pid,'earth',x)*2, y=Math.floor(LN.night-(K.MUTINY_MIN+temper(LN,x))*rt); return {id:x.id,pid,rt,y,turns:+((LN.night-y)/rt).toFixed(2),oldY:Math.floor(LN.night-(1.5+temper(LN,x)/K.MUTINY_SPREAD*1.5)*rt)} });
    const first=rows.slice().sort((a,b)=>a.y-b.y)[0];
    LN.mutinyWarned=false; LN.day=mf.y-K.MUTINY_WARN-3; LN.dismissed={}; LNU.notes=[]; LNU.shiftStop=false;
    for(let i=0;i<8&&!LN.mutinyWarned;i++){ tick(LN); LN.shiftOpen=false } const e=LN.log.filter(x=>x.code==='mutiny_warn').pop(); LNdraw();
    return {min:K.MUTINY_MIN, spread:K.MUTINY_SPREAD, night:LN.night, y:mf.y, y2:mutinyForecast(LN).y, pid:mf.pid, name:planet(mf.pid).name, rows, first, day:LN.day, warn:e?e.d:null, warnDay:e?e.day:null, sold:advice(LN).filter(r=>r.code==='a_mutinysoon').map(r=>r.n)[0]} },W);
  await p.waitForTimeout(400);
  const adv=await p.evaluate(()=>({big:LNI.big(), t:(document.getElementById('noteL')||{}).innerText||'', top:((document.querySelector('#top .night')||{}).innerText||'').replace(/\s+/g,' ')}));
  await shot(p,'b4-first-refusal-warning');
  ok('2.4: K.MUTINY_MIN 1.0, K.MUTINY_SPREAD 0.5 — every crew of a line counts 1 to 1.5 round trips', M.min===1&&M.spread===0.5&&M.rows.length>=3&&M.rows.every(r=>r.turns>=0.99&&r.turns<=1.51), JSON.stringify(M.rows));
  ok('2.4: the first refusal comes later than it did — year '+M.y+' of a Night in '+M.night+' (the old count: '+(M.first&&M.first.oldY)+')', !!M.first&&M.y===M.first.y&&M.first.oldY<M.y, JSON.stringify(M.first));
  ok('2.4: a hundred years before it the Helm is told, in a window that stops the clock: «THE CREWS ARE COUNTING. In N years the first line (…) refuses to sail»', !!M.warn&&M.warn.n<=K_WARN&&M.warn.n>=K_WARN-3&&M.warnDay+M.warn.n===M.y2&&adv.big==='note'&&new RegExp('THE CREWS ARE COUNTING\\. In '+M.warn.n+' years the first line \\('+M.name+'\\) refuses to sail','i').test(adv.t.replace(/\s+/g,' ')), JSON.stringify(M.warn)+' year '+M.warnDay+' · '+adv.t.replace(/\s+/g,' ').slice(0,140)+' · '+adv.top);
  await U.clear();
  // what moved with K.MUTINY_MIN: the refusal of an order for a line, the advisor's «a hull built now will not sail»
  const MO=await p.evaluate(M=>{ const r=M.rows.filter(x=>x.pid===M.pid)[0]||M.rows[0], cls='courier', hi=currentHull(LN,cls), h=HULLS[hi], rt=legDays(LN,r.pid,lineTo(LN,r.pid),{hull:hi})*2, d0=LN.day;
    const at=left=>{ LN.day=LN.night-left; return orderCheck(LN,r.pid,cls,hi) };
    const a=at(Math.ceil(h.days+1.25*rt)+1), b=at(Math.floor(h.days+1.0*rt)-1); LN.day=d0; return {a,b,rt,days:h.days,cls} },M);
  ok('2.4: a hull for a line is still ordered 1.25 round trips before the Night (was refused under 1.5) and refused under 1.0 («No crew will sign»)', MO.a!=='orderNight'&&MO.b==='orderNight', JSON.stringify(MO));
  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await p.close();

  // ---------- 3: the hive — the rings turn in sight, the core is a threat; levels 1 and 3, two frames each ----------
  const [q,Q]=await mk(); const HS=()=>q.evaluate(()=>LBhack.state());
  await Q.start('en',11,{hack:true}); await Q.clear();
  await q.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.nightSeen=true; G.earth.food+=90000; G.earth.metal+=60000; LNdraw() });
  const ring=async k=>{ await Q.closeBig(); if(!(await q.evaluate(()=>LNU.tab==='ark'||LNU.win==='ark'))) await Q.tab('ark'); await q.waitForTimeout(250);
    const pt=await q.evaluate(k=>{ const e=document.querySelector('#ovl .hold .hr[data-v="'+k+'"] .hx'); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} },k);
    if(!pt) return false; await q.mouse.click(pt.x,pt.y); await q.waitForTimeout(250); await Q.tap('#arkcard [data-act="arkbuy"]'); await q.waitForTimeout(250);
    await Q.tap('#hkneed [data-act="hack"]'); return waitFor(q,async()=>(await HS()).open) };
  const frames=async(k,tag)=>{
    const opened=await ring(k), s0=await HS();
    ok('3: ring '+k+' bought by the mouse, START THE HACK opens the hive of level '+k, opened&&s0.kind==='hive'&&s0.lv===k&&s0.panel==='intro', JSON.stringify(s0).slice(0,160));
    await Q.tap('#hkGo'); await waitFor(q,async()=>(await HS()).game==='play');
    const h=await HS(); await q.mouse.move(h.ox+h.aw*0.82*h.k,h.oy+(h.ah-8)*h.k);   // the aim away from the hive: nothing is shot off, the rings are whole in both frames
    await q.waitForTimeout(700); const a=await HS(); await shot(q,tag+'-frame-a'); const t0=Date.now();
    await q.waitForTimeout(1500); const c=await HS(); await shot(q,tag+'-frame-b'); const dt=(Date.now()-t0)/1000;
    const turn=a.ang!==undefined&&c.ang!==undefined&&a.ang!==null&&c.ang!==null?Math.abs(c.ang-a.ang):null;
    ok('3: level '+k+' — between two frames ~1.5 s apart the outer cells have turned by what the eye sees (over 25°; at the old .1 rad/s it was under 10°)', turn!==null&&turn>0.44&&c.game==='play', 'turned '+(turn===null?'—':(turn*180/Math.PI).toFixed(0)+'°')+' in '+dt.toFixed(2)+' s · spin '+c.spin+' rad/s · game '+c.game+' hp '+c.hp);
    ok('3: level '+k+' — the numbers of the hive: spin '+(0.45+0.05*k).toFixed(2)+' rad/s', c.spin!==undefined&&Math.abs(c.spin-(0.45+0.05*k))<1e-9, String(c.spin));
    await q.evaluate(()=>LBhack.cheat()); await waitFor(q,async()=>(await HS()).panel==='won',12000); await waitFor(q,()=>q.isVisible('#hkDone'),8000); await Q.tap('#hkDone'); await q.waitForTimeout(400); return c };
  await frames(1,'c1-hive-level1');
  // ring II the same way, without frames; then ring III
  const o2=await ring(2); if(o2){ await Q.tap('#hkGo'); await waitFor(q,async()=>(await HS()).game==='play'); await q.evaluate(()=>LBhack.cheat()); await waitFor(q,async()=>(await HS()).panel==='won',12000); await waitFor(q,()=>q.isVisible('#hkDone'),8000); await Q.tap('#hkDone'); await q.waitForTimeout(400) }
  await frames(3,'c3-hive-level3');
  const sim=BEFORE?null:await q.evaluate(()=>{ const stand=()=>{}; const r=[1,3].map(l=>{ let lost=0, t=0; for(let s=1;s<=6;s++){ const x=LBhack.sim(l,s*7919+l,stand,150,'hive'); if(x.r==='lost'){ lost++; t+=x.t } } return {l,lost,t:lost?+(t/lost).toFixed(1):null} }); return r });
  ok('3: a player who stands still and does nothing is shot down on levels 1 and 3 (six seeds each) — the core reaches the far side of the field', !!sim&&sim.every(r=>r.lost===6), JSON.stringify(sim));
  ok('no page errors (the hive)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran — '+String(e&&e.stack||e).slice(0,500)) }
console.log(out.join('\n')); if(BEFORE) console.log('PASS before-shots taken (PW67_BEFORE=1, nothing judged)'); else if(out.some(l=>l.startsWith('FAIL'))) process.exit(1); process.exit(0) })();
