// v4.38 (Nikita, 19.10, option A) — the line's fit. A line that falls behind gets one fix in the advisor, in this order:
// a free hull at Earth → a spare hull off another line → the smallest new hull that closes the gap. A line with a hull
// too many gets a grey row naming her. The order cards say what a new hull adds on this line. Real mouse, EN and RU.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const TMP=require('os').tmpdir();
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.over) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await U.clear() };
  const adv=id=>p.evaluate(id=>LNI.adv().filter(r=>r[3]===id).map(r=>({t:r[1]+' | '+r[2],b:r[4],f:r[5],c:r[0]})),id);
  // press the advisor row of world id whose focus starts with pre: open the list (top «!» button), then the row itself
  const pressRow=async(id,pre)=>{ await U.clear(); if(await p.evaluate(()=>!!LNU.win)) { await p.keyboard.press('Escape'); await p.waitForTimeout(60) }
    await p.evaluate(()=>{ LNU.pop='adv'; LNdraw() });
    await U.tap('#pop .advl button[data-v="'+id+'"][data-f^="'+pre+'"]'); await p.evaluate(()=>LNdraw()) };
  const lit=sel=>p.evaluate(s=>{ const e=document.querySelector(s); return !!e&&e.classList.contains('focus') },sel);

  await U.start('en',309573272);
  await p.evaluate(()=>{ var E=LN.earth; E.metal=90000; E.food=90000; E.fuel=90000; E.parts=40000; E.people=6000; LN.opened={food:1,metal:1,fuel:1,parts:1}; LNdraw() });
  const [mine,farm]=await p.evaluate(()=>{ var m=PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist), f=PLANETS.filter(q=>q.sec===0&&q.kind==='farm').sort((a,b)=>a.dist-b.dist); return [m[0].id,f[0].id] });
  // two worlds, full of people, by the core (the founding itself is pw-tested elsewhere)
  // a founding can fail (colony_failed) — try again with another courier until the world stands
  await p.evaluate(a=>{ var go=function(n){ for(var k=0;k<n;k++){ tick(LN); LN.pauseNow=false } };
    [a.mine,a.farm].forEach(function(id){ for(var t=0;t<8&&!LN.colonies[id];t++){
      var s=LN.ships.filter(x=>x.mode==='idle'&&x.at==='earth'&&!(x.from&&x.to)&&!x.job)[0];
      if(!s){ buildShip(LN,currentHull(LN,'courier')); s=LN.ships[LN.ships.length-1]; for(var k=0;k<60&&s.mode==='building';k++) go(1) }
      colonize(LN,s.id,id,0,0); for(var k=0;k<300&&!LN.colonies[id]&&s.mode!=='dead';k++) go(1) } }); LNdraw() },{mine,farm});
  await U.clear();
  await p.evaluate(a=>{ [a.mine,a.farm].forEach(function(id){ var c=LN.colonies[id]; if(c) c.pop=popWant(planet(id)) }); LNdraw() },{mine,farm});
  ok('both worlds founded', await p.evaluate(a=>!!LN.colonies[a.mine]&&!!LN.colonies[a.farm],{mine,farm}), await p.evaluate(()=>'day '+LN.day));
  // every hull at Earth off the pier: scrap the free ones so the chain starts from «build»
  await p.evaluate(()=>{ LN.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)) s.mode='dead' }); LNdraw() });

  // === 1. the mine: one courier on the line, a pile on the surface, no hull to spare anywhere → order the smallest that closes
  await p.evaluate(id=>{ buildShip(LN,currentHull(LN,'courier')); var s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; setLine(LN,s.id,id,'earth');
    var c=LN.colonies[id]; c.store[planet(id).dep]=600; LNdraw() },mine);
  const f1=await p.evaluate(id=>{ var f=lineFit(LN,id), h=lineHelp(LN,id); return {need:f.need,car:f.carries,gap:f.gap,h:h,st:LNI.wst(id)} },mine);
  ok('mine falls behind (state half, gap > 0)', f1.st==='half'&&f1.gap>0, JSON.stringify(f1));
  ok('no free hull, no spare one → build', f1.h&&f1.h.kind==='build', JSON.stringify(f1.h));
  const a1=(await adv(mine))[0]||{};
  ok('advisor names the class and the numbers', /Order a (Courier|Hauler|Freighter) [IVX]+: \+[\d.,]+ a year, the line is [\d.,]+ short/.test(a1.t)&&a1.b==='Order a hull', a1.t+' / '+a1.b);
  await pressRow(mine,'oc:');
  ok('the row opens the mine with the order card lit', await p.evaluate(id=>LNU.win===id,mine)&&await lit('#oc-'+f1.h.cls), await p.evaluate(()=>LNU.focusK));
  const oy=await p.evaluate(()=>[...document.querySelectorAll('#ordblk .oc[id]')].map(e=>e.id+': '+((e.querySelector('.oy')||{}).textContent||'')));
  ok('every order card says what she adds on this line', oy.length>=1&&oy.every(t=>/\+[\d.,]+\/yr on this line/.test(t)), oy.join(' · '));
  await p.screenshot({path:TMP+'/pw43-order.png'});

  // === 2. a free courier at Earth comes first
  const free=await p.evaluate(()=>{ buildShip(LN,currentHull(LN,'courier')); var s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; LNdraw(); return s.id });
  const a2=(await adv(mine))[0]||{};
  const fn=await p.evaluate(id=>LNI.hname(shipById(LN,id)),free);
  ok('advisor: the free hull first, by number', a2.t.indexOf(fn+' stands idle at Earth')>=0&&a2.b==='Assign'&&a2.f==='free:'+free, a2.t+' / '+a2.f);
  await pressRow(mine,'free:');
  ok('the row opens the free tab with that hull lit', await p.evaluate(()=>LNU.addTab)==='free'&&await lit('#ah-'+free));
  await U.tap('#ah-'+free+' [data-act="assign"]');
  ok('assigned with the mouse: the hull is on the mine line', await p.evaluate(a=>{ var s=shipById(LN,a.free); return s.from===a.mine },{free,mine}));
  await p.screenshot({path:TMP+'/pw43-free.png'});

  // === 3. the farm has hulls to spare: a grey row there, and the mine (short again) is offered one of them
  await p.evaluate(a=>{ for(var i=0;i<12;i++){ buildShip(LN,currentHull(LN,'courier')); var s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; setLine(LN,s.id,a.farm,'earth') }
    var cf=LN.colonies[a.farm]; cf.store[planet(a.farm).dep]=0; cf.pop=popWant(planet(a.farm));
    var c=LN.colonies[a.mine]; c.store[planet(a.mine).dep]=900; c.pop=popWant(planet(a.mine))*3; LNdraw() },{farm,mine});
  const sp=await p.evaluate(id=>lineSpare(LN,id).map(s=>s.id),farm);
  const a3=(await adv(farm)).filter(r=>r.f.indexOf('hr:')===0)[0]||{};
  ok('farm: hulls too many, a grey row naming one', sp.length>0&&/the line can carry [\d.,]+ \w+ a year, it needs [\d.,]+/.test(a3.t)&&a3.f==='hr:'+sp[0]&&a3.c==='#9C9B95', sp.join(',')+' / '+a3.t);
  const all=await p.evaluate(()=>LNI.adv().map(r=>r[0]));
  ok('grey rows come last', all.lastIndexOf('#FFD23F')<all.indexOf('#9C9B95')||all.indexOf('#9C9B95')<0, all.join(','));
  const badge=await p.evaluate(()=>{ var b=document.querySelector('#top .adv b'); return {n:b?+b.textContent:-1, want:LNI.adv().filter(r=>r[0]!=='#9C9B95').length, grey:LNI.adv().filter(r=>r[0]==='#9C9B95').length} });
  ok('the badge counts what wants a decision, not the grey rows', badge.n===badge.want&&badge.grey>0, JSON.stringify(badge));
  const h3=await p.evaluate(id=>lineHelp(LN,id),mine);
  const a4=(await adv(mine))[0]||{};
  ok('mine: no free hull → move a spare one off the farm', h3&&h3.kind==='move'&&sp.indexOf(h3.sid)>=0&&/runs half empty on .+: \+[\d.,]+ a year here/.test(a4.t)&&a4.b==='Move here', JSON.stringify(h3)+' / '+a4.t);
  await U.clear(); await p.keyboard.press('Escape'); await p.evaluate(()=>{ LNU.pop='adv'; LNdraw() }); await p.screenshot({path:TMP+'/pw43-adv.png'});
  await pressRow(mine,'other:');
  ok('the row opens the other-lines tab with that hull lit', await p.evaluate(()=>LNU.addTab)==='other'&&await lit('#ah-'+h3.sid));
  await p.screenshot({path:TMP+'/pw43-move.png'});
  await U.tap('#ah-'+h3.sid+' [data-act="move"]');
  ok('moved with the mouse: the hull is bound for the mine', await p.evaluate(a=>{ var s=shipById(LN,a.sid); return s.from===a.mine||(s.pend&&s.pend.from===a.mine)||s.moveTo===a.mine },{sid:h3.sid,mine}));
  ok('…and counts for the mine at once: the farm offers no second hull for the same gap', await p.evaluate(a=>{ var h=lineHelp(LN,a.mine); return !h||h.sid!==a.sid },{sid:h3.sid,mine}));
  // the farm's grey row opens the hull on its line
  await pressRow(farm,'hr:');
  const sid2=await p.evaluate(()=>LNU.focusK);
  ok('the grey row lights the hull on the farm line', /^#hr-\d+$/.test(sid2)&&await lit(sid2), sid2);

  // === 4. a hull in the yards for the line counts: no new advice while she is coming
  await p.evaluate(id=>{ var c=LN.colonies[id]; c.pop=popWant(planet(id)); c.store[planet(id).dep]=600;
    LN.ships.forEach(function(s){ if((s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to))) s.mode='dead' });
    for(var k in LN.colonies) if(k!==id) LN.ships.forEach(function(s){ if(s.from===k) s.mode='dead' });
    for(var i=0;i<60&&lineFit(LN,id).gap>0;i++) orderFor(LN,id,'courier'); LNdraw() },mine);
  ok('hulls ordered for the line close the gap: not «half», no fix row', await p.evaluate(id=>LNI.wst(id)!=='half'&&!lineHelp(LN,id),mine), await p.evaluate(id=>LNI.wst(id)+' '+JSON.stringify(lineFit(LN,id).gap),mine));

  // === 4b. reviewer v4.38: a missing hull carries nothing; one free hull is offered to one line; grey rows leave the badge calm
  const miss=await p.evaluate(id=>{ var h=lineFit(LN,id).hulls[0], before=lineFit(LN,id).carries; h.mode='missing'; var r={was:before,now:lineFit(LN,id).carries,in:lineFit(LN,id).hulls.indexOf(h)>=0}; h.mode='building'; return r },mine);
  ok('a missing hull is not counted on her line', !miss.in&&miss.now<miss.was, JSON.stringify(miss));
  const two=await p.evaluate(a=>{ [a.mine,a.farm].forEach(function(id){ LN.ships.forEach(function(s){ if(s.from===id||s.lineFor===id||(s.pend&&s.pend.from===id)) s.mode='dead' });
      var c=LN.colonies[id]; c.pop=popWant(planet(id))*4; c.store[planet(id).dep]=900;
      buildShip(LN,currentHull(LN,'courier')); var o=LN.ships[LN.ships.length-1]; o.mode='idle'; o.at='earth'; o.t=0; setLine(LN,o.id,id,'earth') });
    buildShip(LN,currentHull(LN,'courier')); var s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; LNdraw();
    var rows=LNI.adv(); return {free:rows.filter(r=>/^free:/.test(r[5])).length, half:[a.mine,a.farm].filter(id=>LNI.wst(id)==='half').length} },{mine,farm});
  ok('two lines short, one free hull: only one row names her', two.half===2&&two.free===1, JSON.stringify(two));

  // === 5. RU: the same rows in Russian
  await p.evaluate(id=>{ var c=LN.colonies[id]; c.pop=popWant(planet(id))*4; c.store[planet(id).dep]=900; LNdraw() },mine);
  await p.evaluate(()=>{ LNU.lang='ru'; LNdraw() });
  const r5=(await adv(mine))[0]||{};
  ok('RU: «стоит у Земли без дела: … линии не хватает»', /стоит у Земли без дела: \+[\d.,]+ в год, линии не хватает [\d.,]+/.test(r5.t), r5.t);
  await U.openWorld(mine); await p.evaluate(()=>LNdraw());
  const oyr=await p.evaluate(()=>[...document.querySelectorAll('#ordblk .oc .oy')].map(e=>e.textContent));
  ok('RU: «/год на этой линии» on the cards', oyr.length&&oyr.every(t=>/\/год на этой линии/.test(t)), oyr.join(' · '));
  await p.screenshot({path:TMP+'/pw43-ru.png'});

  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
console.log(out.join('\n')); console.log((out.some(l=>l.startsWith('FAIL'))?'FAIL':'PASS')+' pw43 '+out.filter(l=>l.startsWith('PASS')).length+'/'+out.length);
})();
