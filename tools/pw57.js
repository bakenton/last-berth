// pw57 — v5.12 (фидбек Никиты 11.11): снос хаба за четверть его цены (мышью), хаб на выработанном мире (мышью),
// машины на мёртвой жиле: ярус не продаётся, стоящие машины не жгут топлива. Клики — мышью по видимым кнопкам; состояние — хуками.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start('en',11); await U.clear();

  // setup: a hub on ring II with a feeder on ring III, both settled
  const W=await p.evaluate(()=>{ GOD.maxAll(); GOD.drive(); GOD.drive(); LN.gen=1; LN.driveLvl=Math.max(1,K.KIT_GATE_DRIVE);
    const nw=PLANETS.filter(x=>x.kind!=='works'&&!LN.colonies[x.id]);
    const hub=nw.filter(x=>x.sec===1).sort((a,b)=>a.dist-b.dist)[0];
    const fd=nw.filter(x=>x.sec===2&&x.dist>hub.dist).sort((a,b)=>a.dist-b.dist)[0];
    return {hub:hub.id, fd:fd.id} });
  for(const k of [W.hub,W.fd]) await p.evaluate(k=>{ LNU.win=k; GOD.settle(); LNU.win=null },k);
  const H=await p.evaluate(W=>{ for(let i=0;i<3000&&!(LN.colonies[W.hub]&&LN.colonies[W.fd]);i++) tick(LN);
    LN.earth.metal=LN.earth.parts=LN.earth.fuel=LN.earth.food=50000;
    const k=hubCost(LN), r1=buildHub(LN,W.hub), r2=setVia(LN,W.fd,W.hub);
    LN.colonies[W.hub].wait=7;
    return {r:r1+','+r2, k:k, paid:LN.colonies[W.hub].hubPaid} },W);
  ok('setup: hub built, its price kept on the hub, feeder via the hub', H.r==='ok,ok'&&H.paid&&H.paid.metal===H.k.metal&&H.paid.parts===H.k.parts, JSON.stringify(H));

  // 1. the hub's card shows what comes back and the button; the mouse pulls it down
  await U.openWorld(W.hub); await p.waitForTimeout(300);
  const back=await p.evaluate(()=>{ const e=document.querySelector('#ovl #hubraze'); return e?e.innerText.replace(/\s+/g,' '):'' });
  const want={m:Math.floor(H.k.metal*0.25), t:Math.floor(H.k.parts*0.25)};
  ok('the hub card says what comes back: a quarter of its price', new RegExp('Gives back\\s*'+want.m.toLocaleString('en').replace(/,/g,'[ ,\\u202f\\u00a0]?')+'\\s*'+want.t,'i').test(back), back+' / want '+JSON.stringify(want));
  await p.screenshot({path:(process.env.SHOT_DIR?process.env.SHOT_DIR+'/':'')+'pw57-hub.png'}).catch(()=>{});
  const e0=await p.evaluate(()=>({m:LN.earth.metal,t:LN.earth.parts}));
  const pop0=await p.evaluate(W=>LN.colonies[W.hub].pop,W);
  await U.tap('#ovl [data-act="hubraze"]'); await p.waitForTimeout(300);
  const R=await p.evaluate(([W,e0])=>{ const c=LN.colonies[W.hub], L=LN.log.filter(e=>e.code==='hub_razed');
    return {hub:!!c.hub, ex:!!c.exHub, dm:LN.earth.metal-e0.m, dt:LN.earth.parts-e0.t, via:LN.colonies[W.fd].via||null, wait:c.wait, pop:c.pop, n:L.length, d:L[0]&&L[0].d,
      hubBtn:!!document.querySelector('#ovl [data-act="hubbuild"]'), toast:(document.getElementById('toast')||{}).innerText||'' } },[W,e0]);
  ok('pulled down with the mouse: no hub, a quarter back on Earth', !R.hub&&R.ex&&R.dm===want.m&&R.dt===want.t, JSON.stringify(R));
  ok('the feeder goes back to Earth; the waiting hands stay on the world', R.via===null&&R.wait===0&&R.pop===pop0+7, JSON.stringify(R));
  ok('one hub_razed log line with the sums and 1 line', R.n===1&&R.d.m===want.m&&R.d.t===want.t&&R.d.n===1, JSON.stringify(R.d));
  ok('the build-a-hub button is back on the card', R.hubBtn);

  // 2. the ex-hub's depot still goes to Earth (not only its own trade)
  const D=await p.evaluate(W=>{ const c=LN.colonies[W.hub], dep=planet(W.hub).dep, other=['metal','food','parts'].find(q=>q!==dep);
    c.store[other]=200; return {other, kinds:depotKinds(LN,W.hub), pile:pileLeft(LN,W.hub)>=200} },W);
  ok('the ex-hub sends its leftover depot to Earth', D.kinds.includes(D.other)&&D.pile, JSON.stringify(D));

  // 3. a worked-out world: its card offers the hub, the mouse builds it, the card is a hub's again
  await p.evaluate(W=>{ const c=LN.colonies[W.hub]; LN.reserves[W.hub]=0; for(const q in c.store) c.store[q]=0; c.exHub=false; LNU.win=null; LNdraw() },W);
  await U.openWorld(W.hub); await p.waitForTimeout(300);
  const dead=await p.evaluate(()=>document.querySelector('#ovl .win').innerText);
  ok('the worked-out card offers a hub', /worked out|seam/i.test(dead)&&!!(await p.$('#ovl [data-act="hubbuild"]')), dead.slice(0,160).replace(/\n/g,' | '));
  await U.tap('#ovl [data-act="hubbuild"]'); await p.waitForTimeout(300);
  const B=await p.evaluate(W=>({hub:isHub(LN,W.hub), raze:!!document.querySelector('#ovl [data-act="hubraze"]'), store:!!document.querySelector('#ovl #hubstore')}),W);
  ok('hub built on the worked-out world with the mouse; its card is a hub card', B.hub&&B.raze&&B.store, JSON.stringify(B));
  await p.evaluate(W=>{ LN.colonies[W.hub].store.metal=0; LN.colonies[W.hub].store.food=0; LNdraw() },W);
  ok('an empty hub on a dead seam is not shown as a dead world', await p.evaluate(()=>!!document.querySelector('#ovl #hubstore')));

  // 4. machines on the dead seam: nothing for sale; standing machines burn no fuel and ask none from the line
  const M0=await p.evaluate(W=>({btn:!!document.querySelector('#ovl [data-act="kit"]'), why:canKit(LN,W.hub)}),W);
  ok('no tier to order on a dead seam', !M0.btn&&M0.why==='kitDry', JSON.stringify(M0));
  const M1=await p.evaluate(W=>{ const c=LN.colonies[W.hub]; c.tier=1; c.store.fuel=50; for(let i=0;i<20;i++) tick(LN); LNdraw();
    return {fuel:c.store.fuel, feed:feedRates(LN,W.hub).fuel||0, txt:(document.querySelector('#ovl #mach')||{}).innerText||'', btn:!!document.querySelector('#ovl [data-act="kit"]')} },W);
  ok('standing machines on a dead seam burn no fuel', M1.fuel>=50&&M1.feed===0, JSON.stringify(M1));
  ok('the card says the machines stand', /machines stand and burn no fuel/i.test(M1.txt)&&!M1.btn, M1.txt.replace(/\n/g,' | '));

  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await p.screenshot({path:(process.env.SHOT_DIR?process.env.SHOT_DIR+'/':'')+'pw57-end.png'}).catch(()=>{});
  await b.close();
 }catch(e){ out.push('ERROR '+String(e&&e.stack||e).slice(0,600)) }
 console.log(out.join('\n'));
 process.exit(out.some(l=>/^(FAIL|ERROR)/.test(l))?1:0);
})();
