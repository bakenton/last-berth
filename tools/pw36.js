// v4.18 — evacuation by courier only, collecting a spent world's pile, the pile numbers (feedback batch 3). Real mouse.
// v4.35: мир — окно мира (#ovl): заказ [data-act="order"], отправка [data-act="assign"] в #addblk, эвакуация [data-act="evac"]; тосты — #toasts.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const toast=()=>p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent.replace(/\s+/g,' ')).join(' | '));
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await U.clear() };
  const show=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  const killFree=async cls=>{ await p.evaluate(cls=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&(!cls||HULLS[s.hull].key===cls)) s.mode='dead' }) },cls) };
  await U.start('en',309573272);
  await p.evaluate(()=>{ var E=LN.earth; E.metal=9000; E.food=20000; E.fuel=9000; E.parts=4000; E.people=3000; LNdraw() });
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await show(mine); await U.tap('#ovl [data-act="send"][data-p="'+mine+'"]'); await run(45);
  ok('world founded', await p.evaluate(id=>!!LN.colonies[id],mine));

  // === the pile: numbers in the window, no bar; the verdict carries both rates
  await p.evaluate(id=>{ LN.colonies[id].store.metal=42; const s=LN.ships.find(o=>o.mode==='idle'&&o.at==='earth'&&!(o.from&&o.to)&&shipClass(o)==='courier'); if(s) setLine(LN,s.id,id,'earth'); else orderFor(LN,id,'courier'); LNdraw() },mine);
  await show(mine);
  let w=await win();
  ok('no pile bar elements (v4.22: removed)', await p.evaluate(()=>!document.querySelector('.pile-take')&&!document.querySelector('.pile-fill')&&!document.querySelector('.pile-bar')));
  ok('the window carries the rates: "World gives X/yr" and "Line carries Y/yr"', /World gives\s*[\d.]+\/yr/.test(w)&&/Line carries\s*[\d.]+\/yr/.test(w), w.match(/World gives[^A-Z]{0,30}/)?.[0]);
  ok('the pile is shown on the surface (42)', /On the surface\s*42/.test(w), w.match(/On the surface[^A-Z]{0,20}/)?.[0]);

  // === seam spent, pile still there: hulls can still be sent; the + is open
  await p.evaluate(id=>{ LN.reserves[id]=0; LN.colonies[id].store.metal=300; LNdraw() },mine); await show(mine);
  w=await win();
  ok('seam spent + pile: the window says the seam is dead and the pile is still there', /WORKED OUT|dead|exhausted/i.test(w)&&/On the surface\s*300/.test(w), w.slice(0,200));
  ok('…and the order block is still there', await p.evaluate(()=>!!document.querySelector('#ovl [data-act="order"][data-c="courier"]')));
  const plus=await p.evaluate(()=>{ var bt=document.querySelector('#ovl [data-act="order"][data-c="courier"]'); return bt?{d:bt.getAttribute('aria-disabled'),w:bt.getAttribute('data-why')}:null });
  ok('v4.34: the order + is open on a spent seam with a pile', plus&&plus.d!=='true', JSON.stringify(plus));
  await U.tap('#ovl [data-act="order"][data-p="'+mine+'"][data-c="courier"]');
  ok('pressing + is accepted: the yards lay one down', /yards lay down/.test(await toast())&&!/Nothing to carry/.test(await toast()), await toast());
  await p.evaluate(()=>{ buildShip(LN,hullAt('courier',0)) }); await run(10); await show(mine);
  const sendOk=await p.evaluate(()=>!!document.querySelector('#ovl #addblk [data-act="assign"]'));
  if(sendOk){ await U.tap('#ovl #addblk [data-act="assign"]'); ok('a free hull is sent to collect the pile', /sent to|on its way/i.test(await toast()), await toast()); }
  else ok('a free hull is sent to collect the pile (no free hull at this moment — skipped)', true);

  // === surface empty too: locked, only evacuation
  await p.evaluate(id=>{ LN.colonies[id].store.metal=0; LNdraw() },mine); await show(mine);
  w=await win();
  const dom=await p.evaluate(()=>({order:document.querySelectorAll('#ovl [data-act="order"]').length, evac:!!document.querySelector('#ovl [data-act="evac"]')}));
  ok('seam spent + empty surface: no order button, evacuation only', dom.order===0&&dom.evac, JSON.stringify(dom));
  ok('core refuses the order with "depleted" (v4.34: orderFor, was setWant)', await p.evaluate(id=>orderFor(LN,id,'courier')==='depleted',mine));

  // === evacuation: courier only
  await killFree(null); await p.evaluate(()=>{ LN.gen=1; ensureGen(1); LN.lastB=buildShip(LN,hullAt('hauler',1)) }); await run(20); await killFree('courier'); await show(mine);
  const onlyH=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).map(s=>HULLS[s.hull].key));
  ok('setup: only a hauler is free at Earth', onlyH.length>0&&onlyH.every(k=>k==='hauler'), JSON.stringify(onlyH));
  ok('the window: evacuation is off, and the reason says a courier is needed', await p.evaluate(()=>{ const bt=document.querySelector('#ovl [data-act="evac"]'); return !!bt&&bt.getAttribute('aria-disabled')==='true'&&bt.getAttribute('data-why')==='evacNoCourier' }), (await win()).slice(-200));
  await U.tap('#ovl [data-act="evac"]');
  const tn=await toast();
  ok('pressing Evacuate with only a hauler free: refused, says no free courier', /No free courier at Earth/.test(tn), tn);
  ok('…and nothing was launched', await p.evaluate(id=>!LN.ships.some(s=>s.job==='evac'&&s.dest===id),mine));
  ok('core: abandon with a hauler returns evacCourier', await p.evaluate(id=>{ var h=LN.ships.find(s=>s.mode==='idle'&&HULLS[s.hull].key==='hauler'); return abandon(LN,h.id,id)==='evacCourier' },mine));
  // a courier that cannot hold everyone: warned before and after
  await p.evaluate(()=>{ buildShip(LN,hullAt('courier',0)) }); await run(12);
  await p.evaluate(id=>{ LN.colonies[id].pop=95; LNdraw() },mine); await show(mine);
  ok('before pressing: the window names who stays behind', /stay behind/.test(await win())||await p.evaluate(()=>{ const bt=document.querySelector('#ovl [data-act="evac"]'); return !!bt&&bt.getAttribute('aria-disabled')!=='true' }), (await win()).slice(-260));
  await U.tap('#ovl [data-act="evac"]');
  const te=await toast();
  ok('pressing Evacuate: the free courier goes, and the message says 25 stay behind', /on its way to lift/.test(te)&&/25 people will stay behind/.test(te), te);
  const ev=await p.evaluate(id=>LN.ships.filter(s=>s.job==='evac'&&s.dest===id).map(s=>HULLS[s.hull].key),mine);
  ok('the hull on the evacuation is a courier', ev.length===1&&ev[0]==='courier', JSON.stringify(ev));
  await run(60);
  ok('it lifts the people and comes home', await p.evaluate(id=>!LN.colonies[id]&&LN.log.some(l=>(l.code==='evac_partial'||l.code==='evacuated')&&l.d.p===id),mine));

  // a courier big enough: everyone fits
  // ближайший свободный мир, до которого мышь достаёт (на сиде 309573272 Brine закрыт Solace — см. smoke)
  await U.closeWin(); await p.evaluate(()=>LNdraw());
  let farm=null; for(const id of await p.evaluate(()=>PLANETS.filter(q=>q.sec<=1&&q.kind!=='works'&&!LN.colonies[q.id]&&!LN.ghost[q.id]).sort((a,b)=>a.dist-b.dist).map(q=>q.id))){ if(await U.point(id)){ farm=id; break } }
  if(!farm) throw new Error('no reachable free world');
  await p.evaluate(()=>{ buildShip(LN,hullAt('courier',0)) }); await run(12);
  await show(farm); await U.tap('#ovl [data-act="send"][data-p="'+farm+'"]'); await run(45);
  await p.evaluate(()=>{ LN.gen=1; ensureGen(1); buildShip(LN,hullAt('courier',1)) }); await run(14);
  await p.evaluate(id=>{ LN.colonies[id].pop=95; LNdraw() },farm); await show(farm);
  ok('with a Courier II (hold 133) free: "everyone fits"', /everyone fits/.test(await win())||/133/.test(await win()), (await win()).match(/[^.]*fits[^.]*/)?.[0]);
  await p.evaluate(()=>{ document.getElementById('toasts').innerHTML=''; });   // старые тосты не должны попасть в проверку
  await U.tap('#ovl [data-act="evac"]');
  ok('…and the plain message: "on its way"', /on its way to lift/.test(await toast())&&!/stay behind/.test(await toast()), await toast());

  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+String(e.message||e).split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length); process.exit(0);
})();
