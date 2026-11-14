// pw64 — v5.29 (Никита, 14.11: редкие награды — «добавляем», первой док; объём — «Да, делаем»; design/START.md, «Решения Никиты 14.11»):
// один мир в каждом кольце несёт док (выбирает сид). На карте у него жёлтый шестиугольник со знаком дока, пока мир не заселён, и слово
// DOCK рядом — до первого нажатия на такой мир. В окне незаселённого мира док — первая строка FOUND HERE. При первом заселении на линии
// мира сразу стоит судно: бесплатно, без верфи, самый дешёвый класс, что долетает до кольца, текущее поколение, экипаж с ним.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW64_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n)=>{ if(SHOTS) await pg.screenshot({path:path.join(SHOTS,n+'.png')}) };
  // what the chart says: the worlds that carry the sign, the words beside them, where they are
  const chart=pg=>pg.evaluate(()=>{ const R=e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,r:r.right,b:r.bottom,w:r.width} };
    return {signs:[...document.querySelectorAll('#map .rsign')].map(e=>({p:e.closest('.wd').dataset.p,k:e.dataset.rare,box:R(e),hex:e.querySelector('path').getAttribute('stroke'),world:R(e.closest('.wd').querySelector('circle'))})),
      words:[...document.querySelectorAll('#map .rword')].map(e=>({p:e.closest('.wd').dataset.p,t:e.textContent,box:R(e)})), pings:document.querySelectorAll('#map .rping').length} });
  const gift=pg=>pg.evaluate(()=>{ const g=document.getElementById('gift'); if(!g) return {rows:[]}; const k=[...g.children].slice(1);
    return {sec:g.querySelector('.sec').innerText.trim(),rows:k.map(e=>(e.dataset.g||'?')+':'+e.innerText.replace(/\s+/g,' ').trim()),hex:!!g.querySelector('.gfr .ric path'),name:(g.querySelector('.gfr b')||{}).innerText||'',col:g.querySelector('.gfr b')?getComputedStyle(g.querySelector('.gfr b')).color:''} });
  const land=(pg,pid)=>pg.evaluate(pid=>{ const E=LN.earth; let prev=null;
    for(let i=0;i<400&&!LN.colonies[pid];i++){ prev={metal:E.metal,parts:E.parts,people:E.people,fuel:E.fuel,ships:LN.ships.length,yard:LN.stats.yardBuilt||0}; tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    const on=onLine(LN,pid), sh=on[on.length-1], ev=LN.log.filter(e=>e.code==='dock_hull'&&e.d.p===pid).pop(); LNdraw();
    return {down:!!LN.colonies[pid],dMetal:E.metal-prev.metal,dParts:E.parts-prev.parts,dPeople:E.people-prev.people,dFuel:E.fuel-prev.fuel,ships:LN.ships.length-prev.ships,yard:(LN.stats.yardBuilt||0)-prev.yard,docks:LN.stats.docks||0,
      evs:LN.log.filter(e=>e.code==='dock_hull'&&e.d.p===pid).length,on:on.length,hull:sh?{cargo:sh.cargo,id:sh.id,cls:shipClass(sh),gen:hullGen(sh),crew:sh.crew,full:HULLS[sh.hull].crew,mode:sh.mode,from:sh.from,to:sh.to,dock:sh.dock,price:HULLS[sh.hull].metal}:null,ev:ev?ev.d:null,gift:LN.colonies[pid]?LN.colonies[pid].gift:null} },pid);

  // ---------- A. no helper: the sign on the chart, the line in the window, the hull at the landing ----------
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const core=await p.evaluate(()=>({rings:SECTORS.length,docks:SECTORS.map((_,s)=>dockWorld(LN,s)),per:SECTORS.map((_,s)=>PLANETS.filter(q=>q.sec===s&&(giftFor(LN,q.id)||{}).dock).length),
    cls:SECTORS.map((_,s)=>(giftFor(LN,dockWorld(LN,s))||{}).dock),again:SECTORS.map((_,s)=>dockWorld(LN,s)),gen:LN.gen||0,want:SECTORS.map((_,s)=>classFor(s,LN.gen||0))}));
  ok('core: every charted ring has exactly one world with a dock, and it stays the same world', core.rings===2&&core.per.every(v=>v===1)&&core.docks.join()===core.again.join()&&core.docks.every(Boolean), JSON.stringify(core));
  ok('core: the dock holds the cheapest class that flies to its ring', core.cls.join()===core.want.join()&&core.cls[0]==='courier', core.cls.join()+' / '+core.want.join());
  let c=await chart(p);
  ok('chart: a yellow hexagon with the dock\'s sign by each of those worlds, and only by them', c.signs.length===2&&c.signs.map(s=>s.p).sort().join()===core.docks.slice().sort().join()&&c.signs.every(s=>s.k==='dock'&&/^#FFD23F$/i.test(s.hex)&&s.box.w>12), JSON.stringify(c.signs.map(s=>[s.p,s.hex,Math.round(s.box.w)])));
  ok('chart: the sign stands by its world, on the screen', c.signs.every(s=>Math.abs((s.box.x+s.box.r)/2-(s.world.x+s.world.r)/2)<60&&s.box.b<=s.world.b&&s.box.x>82&&s.box.r<1440&&s.box.y>100), JSON.stringify(c.signs.map(s=>[Math.round(s.box.x),Math.round(s.box.y),Math.round(s.world.x),Math.round(s.world.y)])));
  ok('chart: the word DOCK beside every sign before the first press', c.words.length===2&&c.words.every(w=>w.t==='DOCK')&&c.words.every(w=>{ const s=c.signs.find(q=>q.p===w.p); return !!s&&Math.abs(w.box.y-s.box.y)<14&&(w.box.x>=s.box.r-2||w.box.r<=s.box.x+2) }), JSON.stringify(c.words.map(w=>[w.p,w.t])));
  await shot(p,'A1-chart-signs');
  const D=core.docks[0], plain=await p.evaluate(d=>PLANETS.filter(q=>q.sec===0&&q.id!==d).map(q=>{ const cc=document.querySelector('#map .wd[data-p="'+q.id+'"] circle'); return {id:q.id,y:cc?cc.getBoundingClientRect().top:0} }).sort((a,b)=>b.y-a.y)[0].id,D);
  ok('a world without a dock opens by the mouse', await U.openWorld(plain));
  let g=await gift(p); c=await chart(p);
  ok('world without a dock: no sign by it, no DOCK line in its window — parts and fuel only', !c.signs.some(s=>s.p===plain)&&g.rows.length===2&&g.rows.every(r=>!/^dock/.test(r)), JSON.stringify(g.rows));
  ok('opening a world without a dock leaves the word DOCK on the chart', c.words.length===2);
  await p.keyboard.press('Escape');
  // the sign itself is the world: a press on it opens the window
  const sp=await p.evaluate(d=>{ const e=document.querySelector('#map .wd[data-p="'+d+'"] .rsign'), r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} },D);
  await U.at(sp.x,sp.y);
  ok('a press on the sign opens that world', await p.evaluate(d=>LNU.win===d,D));
  c=await chart(p); g=await gift(p);
  ok('after the first press on a world with a dock the word is gone, the signs stay', c.words.length===0&&c.signs.length===2, JSON.stringify({words:c.words.length,signs:c.signs.length}));
  ok('window: DOCK is the first line of FOUND HERE — the sign, the name in yellow, the class of the hull', /^found here$/i.test(g.sec||'')&&g.rows.length===3&&/^dock:DOCK A courier, ready\. Takes this world.s line\.$/i.test(g.rows[0])&&g.hex&&/255, 210, 63/.test(g.col), JSON.stringify(g));
  ok('window: the parts and the fuel are still there, after the dock', /^parts:PARTS \+48$/i.test(g.rows[1])&&/^fuel:FUEL \+249$/i.test(g.rows[2]), JSON.stringify(g.rows));
  await shot(p,'A2-window-dock');
  await U.tap('#ovl .qb'); const hs=await p.evaluate(()=>[...document.querySelectorAll('#hsheet li')].map(e=>e.innerText.replace(/\s+/g,' ').trim()));
  ok('help of the window names the dock', hs.length===6&&/^Dock — a ready hull joins this world.s line\.$/i.test(hs[5])&&await p.evaluate(()=>!!document.querySelector('#hsheet li:last-child .ric')), hs.slice(4).join(' | '));
  await U.tap('#ovl .qb');
  await U.tap('#ovl [data-act="send"]');
  ok('settlers sent by the button', await p.evaluate(d=>!!enRoute(LN,d),D));
  c=await chart(p);
  ok('on the way: the sign is still by the world', c.signs.some(s=>s.p===D));
  await p.keyboard.press('Escape');
  let r=await land(p,D);
  ok('the landing: one hull more, and she is on this world\'s line', r.down&&r.ships===1&&r.on===1&&!!r.hull&&r.hull.from===D&&r.hull.to==='earth'&&r.hull.dock===D, JSON.stringify(r.hull));
  ok('she is the class the window named, of the yards\' generation, her crew with her', !!r.hull&&r.hull.cls==='courier'&&r.hull.gen===core.gen&&r.hull.crew===r.hull.full&&r.hull.full>0, JSON.stringify(r.hull));
  ok('she left at once — no years in the yards, nothing laid down there', !!r.hull&&r.hull.mode==='transit'&&r.yard===0&&r.docks===1, JSON.stringify({mode:r.hull&&r.hull.mode,yard:r.yard,docks:r.docks}));
  // what left Earth that day is only what she carries to the world in her hold (a line's supplies), never her price or her crew
  const hc=(r.hull&&r.hull.cargo)||{};
  ok('Earth paid nothing for her: no metal, no parts, no hands', r.dMetal+(hc.metal||0)>-1&&r.dPeople+(hc.people||0)>-1&&r.dParts+(hc.parts||0)===48&&!!r.hull&&r.hull.price>=20&&r.hull.full>=4, JSON.stringify({dMetal:Math.round(r.dMetal*10)/10,dPeople:Math.round(r.dPeople*10)/10,dParts:r.dParts,hold:hc,price:r.hull&&r.hull.price,crew:r.hull&&r.hull.full}));
  ok('the parts and the fuel came as before, with the dock on top', !!r.gift&&r.gift.parts===48&&r.gift.fuel===249&&r.gift.dock==='courier'&&r.dFuel>200, JSON.stringify(r.gift)+' dFuel '+Math.round(r.dFuel));
  ok('log of the run: dock_hull with the world, the hull and the class', !!r.ev&&r.ev.p===D&&r.ev.k==='courier'&&r.ev.n===r.hull.id, JSON.stringify(r.ev));
  await p.waitForTimeout(250); await p.evaluate(()=>LNdraw());
  const toast=await p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(e=>e.innerText.trim()));
  ok('a line at the foot of the chart tells it; no window, nothing to press', toast.some(t=>/the dock.s courier takes this line\.$/i.test(t))&&await p.evaluate(()=>!LNI.big()), toast.join(' | '));
  c=await chart(p);
  ok('after the landing the sign is gone from that world; the other ring keeps its own', !c.signs.some(s=>s.p===D)&&c.signs.length===1&&c.signs[0].p===core.docks[1]&&c.words.length===0, JSON.stringify(c.signs.map(s=>s.p)));
  await shot(p,'A3-landed');
  await U.clear(); ok('the settled world opens by the mouse', await U.openWorld(D));
  const card=await p.evaluate(id=>({gift:!!document.getElementById('gift'),row:!!document.querySelector('#ovl .wcol.wr #hr-'+id),n:document.querySelectorAll('#ovl .wcol.wr .hr[id^="hr-"]').length}),r.hull.id);
  ok('card of the settled world: the hull stands in the line\'s half; no FOUND HERE', !card.gift&&card.row&&card.n===1, JSON.stringify(card));
  await shot(p,'A4-card-line'); await p.keyboard.press('Escape');

  // ---------- B. the same world a second time: no hull ----------
  await p.evaluate(w=>{ delete LN.colonies[w]; LN.ships.forEach(s=>{ if(s.from===w||s.to===w){ s.from=null; s.to=null } if(s.mode==='transit'){ s.mode='idle'; s.at='earth'; s.dir=null; s.job=null; s.t=0 } });
    LN.earth.people=Math.max(LN.earth.people,300); LN.earth.fuel=Math.max(LN.earth.fuel,300); LNdraw() },D);
  c=await chart(p);
  ok('settled before: no gift, no sign — the dock was emptied', await p.evaluate(w=>giftFor(LN,w)===null,D)&&!c.signs.some(s=>s.p===D));
  await U.openWorld(D); g=await gift(p);
  ok('second time: nothing in the window', g.rows.length===0&&await p.isVisible('#ovl [data-act="send"]'));
  await U.tap('#ovl [data-act="send"]'); await p.keyboard.press('Escape');
  r=await land(p,D);
  ok('second landing: no hull comes', r.down&&r.ships===0&&r.on===0&&r.evs===1&&r.docks===1, JSON.stringify({ships:r.ships,on:r.on,docks:r.docks}));

  // ---------- C. ring III: its own dock, a hauler in it ----------
  await p.evaluate(()=>{ while(SECTORS.length<3) openSector(LN); LNdraw() }); await U.clear(); await p.evaluate(()=>LNdraw());
  const r3=await p.evaluate(()=>({d:dockWorld(LN,2),n:PLANETS.filter(q=>q.sec===2&&(giftFor(LN,q.id)||{}).dock).length,cls:(giftFor(LN,dockWorld(LN,2))||{}).dock,parts:(giftFor(LN,dockWorld(LN,2))||{}).parts}));
  c=await chart(p);
  ok('ring III charted: one more world with a dock, its sign on the chart', r3.n===1&&c.signs.some(s=>s.p===r3.d)&&c.signs.length===2, JSON.stringify(r3)+' '+c.signs.map(s=>s.p).join());
  ok('the world of ring III with the dock opens by the mouse', await U.openWorld(r3.d));
  g=await gift(p);
  ok('ring III: the window names a hauler — a courier does not fly that far', r3.cls==='hauler'&&/^dock:DOCK A hauler, ready\./i.test(g.rows[0]||''), JSON.stringify(g.rows));
  await shot(p,'C1-ring3-hauler'); await p.keyboard.press('Escape');
  ok('no page errors (no helper)', p.errs.length===0, p.errs.join(' | '));

  // ---------- D. with the helper: one ring is seen — one sign; a new run starts with the word again ----------
  const q=await UI.newPage(b,{vp:{width:1440,height:900}}); const Q=UI.ui(q);
  await Q.start(null,undefined,{tut:true}); await Q.menuNew('en'); await q.waitForTimeout(300);
  c=await chart(q);
  const dq=await q.evaluate(()=>dockWorld(LN,0));
  ok('helper, year 0: only the first ring is on the chart — one sign, with its word', c.signs.length===1&&c.signs[0].p===dq&&c.words.length===1, JSON.stringify(c.signs.map(s=>s.p))+' words '+c.words.length);
  await shot(q,'D1-helper-chart');
  ok('no page errors (helper)', q.errs.length===0, q.errs.join(' | '));

  // another seed — another world (the dock is the seed's choice, the same every time the run is started)
  await Q.start('en',12); await Q.pause(); const s12=await q.evaluate(()=>[LN.seed,dockWorld(LN,0),dockWorld(LN,1)]);
  await Q.start('en',11); await Q.pause(); const s11=await q.evaluate(()=>[LN.seed,dockWorld(LN,0),dockWorld(LN,1)]);
  ok('the seed picks the worlds: seed 11 gives the same two again, seed 12 its own', s11[0]===11&&s11.slice(1).join()===core.docks.join()&&s12[0]===12&&s12.slice(1).every(Boolean), JSON.stringify([s11,s12]));

  // ---------- E. 390 px ----------
  const m=await UI.newPage(b,{vp:{width:390,height:844}}); const M=UI.ui(m);
  await M.start('en',11); await M.pause(); await m.waitForTimeout(300);
  c=await chart(m);
  const inScr=bx=>!!bx&&bx.x>=0&&bx.r<=390&&bx.y>=0&&bx.b<=844;
  ok('390 px: the signs and the words are on the screen', c.signs.length===2&&c.signs.every(s=>inScr(s.box))&&c.words.length===2&&c.words.every(w=>inScr(w.box)), JSON.stringify(c.signs.map(s=>[Math.round(s.box.x),Math.round(s.box.y)])));
  await shot(m,'E1-phone-chart');
  await M.openWorld(core.docks[0]); g=await gift(m);
  const fit=await m.evaluate(()=>{ const w=document.querySelector('#ovl .win').getBoundingClientRect(), e=document.querySelector('#gift .gfr').getBoundingClientRect(); return {win:[w.left,w.right,w.bottom],row:[e.left,e.right,e.bottom],sw:document.documentElement.scrollWidth,iw:innerWidth} });
  ok('390 px: the window with the DOCK line is inside the screen, nothing scrolls sideways', g.rows.length===3&&fit.win[0]>=0&&fit.win[1]<=390&&fit.win[2]<=844&&fit.row[0]>=fit.win[0]&&fit.row[1]<=fit.win[1]&&fit.sw<=fit.iw, JSON.stringify(fit));
  await shot(m,'E2-phone-window');
  ok('no page errors (390 px)', m.errs.length===0, m.errs.join(' | '));
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
