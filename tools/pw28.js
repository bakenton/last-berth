// v4.8 — one founding party at a time, few-hands hint, idle old hulls scrapped, line block shows surface stock and hulls, HTML cache, people constants
// v4.35: карточка мира — #ovl (окно мира), Флот — #side (вкладка fleet), верфь — #ovl (вкладка yard); кэш отрисовки — setHTML (не переписывает неизменное)
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await U.clear() };
  const showWorld=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  await U.start('en',309573272);
  // 1. people constants
  ok('hands 2.0 at year 0, 1.09 at 8400 (with a full larder)', await p.evaluate(()=>{ const f0=LN.earth.food; LN.earth.food=1e6; const a=handsRate(LN)/fedMult(LN); LN.day=8400; const b=handsRate(LN)/fedMult(LN); LN.day=0; LN.earth.food=f0; return Math.abs(a-2)<1e-9&&Math.abs(b-1.09)<0.01 }));
  // 2. one founding party at a time
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(id=>{ LN.earth.people=300; LNdraw() },mine); await showWorld(mine);
  await U.tap('#ovl [data-act="send"][data-p="'+mine+'"]');
  ok('first party sails', await p.evaluate(()=>LN.ships.some(s=>s.job==='colonize')));
  await showWorld(mine);
  ok('card says a party is on its way', /Settlers on the way/.test(await win()), (await win()).slice(0,200));
  ok('no second Found button', !(await p.evaluate(id=>!!document.querySelector('#ovl [data-act="send"][data-p="'+id+'"]:not([aria-disabled="true"])'),mine)));
  ok('colonize() returns enroute', await p.evaluate(id=>{ const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); return colonize(LN,s.id,id,26,0)==='enroute' },mine));
  // 3. too few hands: button disabled with a hint
  const mine2=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[1].id);
  await p.evaluate(id=>{ LN.earth.people=40; LNdraw() },mine2); await showWorld(mine2);
  // v4.35: окно мира показывает «Send settlers» отключённой кнопкой; причина — data-why (код fewhands → текст MSG при нажатии)
  ok('few-hands: send button disabled with reason fewhands', await p.evaluate(id=>{ const bt=document.querySelector('#ovl [data-act="send"][data-p="'+id+'"]'); return !!bt&&bt.getAttribute('aria-disabled')==='true'&&bt.getAttribute('data-why')==='fewhands' },mine2));
  // 4. v4.31 (F-39), v4.34: an idle old hull stays on the pier once a newer generation is open; a hull is broken up one by one by hand
  await p.evaluate(()=>{ LN.earth.people=300; LN.gen=1; ensureGen(1); LN.driveLvl=1; LNdraw() });
  const oldId=await p.evaluate(()=>{ const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); return s?s.id:null });
  ok('an idle Gen I hull exists', oldId!==null);
  await run(12);
  ok('v4.31: no yard_scrap, the hull is still on the pier after 12 years', await p.evaluate(id=>!LN.log.some(l=>l.code==='yard_scrap')&&shipById(LN,id).mode==='idle',oldId));
  await U.tab('yard');
  ok('v4.34: the yard has no "Scrap idle Gen N" button', await p.evaluate(()=>!document.querySelector('#ovl [data-act="scrapgen"]')));
  // v4.34: the hull is broken up by hand, one at a time: the first press arms it, the second confirms
  const sel='#ovl [data-act="scrap"][data-s="'+oldId+'"]';
  ok('v4.34: the idle Gen I hull has a Scrap button on the yard pier', await p.isVisible(sel));
  await U.tap(sel); await U.tap(sel);
  ok('the second press breaks that one hull up (scrapped logged, hull dead)', await p.evaluate(id=>LN.log.some(l=>l.code==='scrapped')&&shipById(LN,id).mode==='dead',oldId));
  await U.tab('yard');
  // 5. line block: surface stock and hulls list. v4.34: a free hull is sent to the line by hand (setLine), or a new one is ordered (orderFor)
  await run(30);
  await p.evaluate(id=>{ LN.colonies[id].store.metal=1234; LN.earth.metal=900; LN.earth.parts=500; LN.earth.fuel=800; const s=LN.ships.find(o=>o.mode==='idle'&&o.at==='earth'&&!(o.from&&o.to)&&!o.reserve&&!o.mutiny); if(s) setLine(LN,s.id,id,'earth'); LNdraw() },mine);
  await run(2); await showWorld(mine);
  const r=await win();
  ok('surface stock shown (big status)', /On the surface\s*\d[\d ]{2,6}/.test(r), r.match(/On the surface[^A-Z]{0,30}/)?.[0]);
  ok('hull row shown', /On this line/.test(r)&&/Courier/.test(r), r.slice(r.indexOf('On this line'),r.indexOf('On this line')+200));
  // 6. HTML cache: a second draw with nothing changed rewrites nothing (setHTML compares the last string)
  const same=await p.evaluate(()=>{ LNdraw(); const el=document.getElementById('top'); el.dataset.mark='x'; LNdraw(); return el.dataset.mark==='x' });
  ok('top strip not rewritten when unchanged', same);
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  const q=await UI.newPage(b); const V=UI.ui(q); await V.start('ru',309573272);
  const mru=await q.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await q.evaluate(id=>{ LNU.shiftStop=false; LN.earth.people=300; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); colonize(LN,s.id,id,26,0); LNdraw() },mru);
  await V.openWorld(mru); await q.evaluate(()=>LNdraw());
  ok('RU enroute text', /Поселенцы в пути/.test(await q.evaluate(()=>document.getElementById('ovl').textContent)), (await q.evaluate(()=>document.getElementById('ovl').textContent)).slice(0,160));
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
