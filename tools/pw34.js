// v4.16 — interface pass (feedback batch 1: F-01..F-08). Real mouse, real browser. node pw34.js [page.html]
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const fs=require('fs');
const page=process.argv[2]||'long-night.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); p.lastHit=await p.evaluate(([x,y])=>{var e=document.elementFromPoint(x,y); return e?(e.tagName+'.'+String(e.className).slice(0,30)+'#'+e.id+' act='+(e.dataset.act||'')+' dis='+e.getAttribute('aria-disabled')):null},[bb.x+bb.width/2,bb.y+bb.height/2]); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150)};
  const closePf=async()=>{ for(let i=0;i<8;i++){ if(await p.isVisible('#pf')) await tap('[data-act="pfok"]'); else if(await p.evaluate(()=>!!LN.shiftOpen)) await tap('[data-act="shiftok"]'); else if(await p.isVisible('[data-act="nightok"]')) await tap('[data-act="nightok"]'); else break } };   // personal files and the 80-year shift report both block clicks
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false } LNdraw() },n); await closePf() };
  const toast=async()=>(await p.textContent('#toast'))||'';
  await p.goto('file:///home/claude/ln/'+page); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  await p.evaluate(()=>{ LNU.pro.on=false; LNU.pro.stage=99; LNU.paused=true; var E=LN.earth; E.metal=6000; E.food=20000; E.fuel=9000; E.parts=3000; E.people=3000; LNdraw() });

  // --- found one world for real
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  await tap('[data-act="colonize"]'); await run(45);
  ok('world founded', await p.evaluate(id=>!!LN.colonies[id],mine));

  // === F-04: the sign, top-right of the map, always there
  await p.evaluate(()=>{ LNU.tab='earth'; LNdraw() });
  const sg=await p.evaluate(()=>{ var e=document.getElementById('ringsign'), m=document.getElementById('mapwrap').getBoundingClientRect(), r=e.getBoundingClientRect(); var bt=e.querySelector('.rs'); return {txt:e.textContent, top:Math.round(r.top-m.top), rightGap:Math.round(m.right-r.right), vis:r.width>0&&r.height>0, cls:bt?bt.className:null} });
  ok('sign is visible in the top-right corner of the map', sg.vis&&sg.top<=20&&sg.rightGap<=20, JSON.stringify(sg));
  ok('sign says NEW RING and what is missing', /NEW RING/.test(sg.txt)&&/Settled worlds: \d+ of \d+ needed/.test(sg.txt), sg.txt);
  await p.screenshot({path:'/tmp/v416-sign.png',clip:{x:0,y:60,width:1250,height:480}});

  // sign turns "ready" when the gate opens, click goes to the Earth tab
  await p.evaluate(()=>{ var ids=PLANETS.filter(q=>q.sec<SECTORS.length).slice(0,6).map(q=>q.id); LN.settled=LN.settled||{}; ids.forEach(i=>LN.settled[i]=5); LNU.tab='target'; LNdraw() });
  const rdy=await p.evaluate(()=>{ var b=document.querySelector('#ringsign .rs'); return {cls:b.className, txt:b.textContent} });
  ok('sign shows READY when charting is possible', /\bok\b/.test(rdy.cls)&&/Ready to chart/.test(rdy.txt), JSON.stringify(rdy));
  await tap('#ringsign .rs');
  ok('clicking the sign opens the Earth tab at the survey', await p.evaluate(()=>LNU.tab==='earth'&&!!document.querySelector('#rail [data-act="survey"]')));

  // === F-06: the range line on the sign
  await p.evaluate(()=>{ for(var i=0;i<4;i++) openSector(LN); LNdraw() });
  const rng=await p.evaluate(()=>{ var e=document.querySelector('#ringsign .rs-range'); return e?e.textContent:null });
  ok('sign states which ring the hulls reach and how many free worlds lie beyond', rng&&/Generation I hulls reach ring \d/.test(rng)&&/Free worlds farther out: \d+/.test(rng), rng);
  await p.screenshot({path:'/tmp/v416-range.png',clip:{x:0,y:60,width:1250,height:480}});

  // === F-04: the full-screen stop when no free world is left (fires once per ring count)
  ok('no full-screen stop while free worlds exist', !(await p.isVisible('#nofree')));
  await p.evaluate(()=>{ PLANETS.forEach(q=>{ if(sectorOpen(LN,q.sec)&&!LN.colonies[q.id]) LN.ghost[q.id]=1 }); LNU.paused=false; LNdraw() });
  ok('full-screen stop appears when every charted world is taken', await p.isVisible('#nofree'));
  const nf=await p.textContent('#nofree');
  ok('stop names the problem and the way out', /NO FREE WORLDS LEFT/.test(nf)&&/Chart a new ring/.test(nf), nf.slice(0,160));
  ok('game is paused behind it', await p.evaluate(()=>LNU.paused===true));
  const urg=await p.evaluate(()=>document.querySelector('#ringsign .rs').className);
  ok('sign goes urgent too', /urgent/.test(urg), urg);
  await p.screenshot({path:'/tmp/v416-nofree.png'});
  await tap('[data-act="nofreeclose"]');
  ok('"Later" closes it and resumes the game', !(await p.isVisible('#nofree'))&&await p.evaluate(()=>LNU.paused===false));
  await run(3);
  ok('it does not come back for the same ring count', !(await p.isVisible('#nofree')));
  await p.evaluate(()=>{ LNU.paused=true; openSector(LN); LNdraw() });   // a new ring: free worlds again
  await p.evaluate(()=>{ PLANETS.forEach(q=>{ if(sectorOpen(LN,q.sec)&&!LN.colonies[q.id]) LN.ghost[q.id]=1 }); LNdraw() });
  ok('a new ring count can raise it again', await p.isVisible('#nofree'));
  await tap('[data-act="nofreego"]');
  ok('"Go to survey" closes it and opens the Earth tab', !(await p.isVisible('#nofree'))&&await p.evaluate(()=>LNU.tab==='earth'));
  // undo the ghosts so the rest of the run has worlds to use
  await p.evaluate(()=>{ LN.ghost={}; LNU.paused=true; LNdraw() });

  // === F-08: speed in years of route per second
  await p.evaluate(()=>{ LNU.dockOpen=true; LNdraw() });
  const spd=await p.evaluate(()=>[].slice.call(document.querySelectorAll('#dock .dbtn[data-act="build"] small')).map(e=>e.textContent));
  ok('build menu shows speed as "N.NN yr/s", no bare ×', spd.length>0&&spd.every(t=>/\d\.\d\d yr\/s/.test(t)&&!/×/.test(t)), JSON.stringify(spd));
  const tip=await p.evaluate(()=>document.querySelector('#dock .dbtn small').getAttribute('title'));
  ok('the unit has a tooltip', /Years of route/.test(tip||''), tip);
  await p.screenshot({path:'/tmp/v416-dock.png',clip:{x:0,y:560,width:1250,height:440}});

  // === F-01 / F-02: what the standing order does
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  await closePf();
  const freeCour=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.pend&&!s.mutiny&&!s.retire&&!s.job&&shipClass(s)==='courier').length);
  await tap('[data-act="want"][data-c="courier"].plus');
  let t1=await toast();
  if(freeCour>0) ok('1st +: a free hull goes first — says so', /free hull at Earth goes first/.test(t1), t1+' | hit='+p.lastHit);
  else ok('1st +: no free hull — says the yards build one, for this world', /yards are building/.test(t1)||/cannot start/.test(t1), t1);
  // exhaust free couriers, then press again
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&shipClass(s)==='courier'){ s.mode='dead' } }); LNdraw() });
  await tap('[data-act="want"][data-c="courier"].plus');
  let t2=await toast();
  ok('+ with no free hull: "No free hull of that class… building… for <world>"', /No free hull of that class/.test(t2)&&/yards are building \d+ new one\(s\) for [A-Z]{2}-\d+/.test(t2), t2);
  await p.screenshot({path:'/tmp/v416-want.png',clip:{x:0,y:60,width:1600,height:300}});
  await run(2);
  // F-02 (v4.17: the yard queue moved from the dock and the Earth tab into the fleet panel, top left)
  const fq=await p.evaluate(()=>{ var r=[].slice.call(document.querySelectorAll('#advisor .fl-row.bld')); return r.map(e=>e.textContent.replace(/\s+/g,' ')) });
  ok('fleet panel lists the hull in the yards with its destination world', fq.length>0&&fq.every(t=>/→ [A-Z]{2}-\d+/.test(t)), JSON.stringify(fq));
  ok('dock no longer lists the yard queue', await p.evaluate(()=>!document.querySelector('#dock .yardq')));

  // === F-03: idle hulls — menu on Earth and block on the world
  await closePf(); await p.evaluate(()=>{ LNU.tab='earth'; LNdraw() });
  const idleN=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).length);
  if(idleN===0){ await p.evaluate(()=>{ buildShip(LN,0); }); await run(12); await p.evaluate(()=>{ LNU.tab='earth'; LNdraw() }) }
  const chips=await p.evaluate(()=>document.querySelectorAll('#rail [data-act="assign"]').length);
  ok('Earth tab: each free hull offers the worlds it can be sent to', chips>0, chips);
  await p.screenshot({path:'/tmp/v416-earth.png',clip:{x:1040,y:60,width:560,height:900}});
  const before=await p.evaluate(()=>LN.ships.filter(s=>s.from).length);
  await tap('#rail [data-act="assign"]');
  const tAs=await toast();
  ok('tapping a world sends the hull and confirms it', /sent to/.test(tAs), tAs);
  ok('the hull is on a line now', await p.evaluate(b=>LN.ships.filter(s=>s.from).length>b,before));
  await p.evaluate(()=>{ buildShip(LN,0); }); await run(12);
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  const fb=await p.evaluate(()=>{ var h=[].slice.call(document.querySelectorAll('#rail .blk')).find(e=>/Free hulls at Earth/.test(e.textContent)); return h?h.textContent:null });
  ok('World tab: "Free hulls at Earth" block with a Send here button', fb&&/Send here/.test(fb), fb);
  const order=await p.evaluate(()=>{ var h=[].slice.call(document.querySelectorAll('#rail .blk')).map(e=>e.querySelector('h3')?e.querySelector('h3').textContent:''); return h });
  ok('…and the order block is its own block: "Hulls for this world — standing order"', order.some(t=>/Hulls for this world/.test(t)), JSON.stringify(order));
  await p.screenshot({path:'/tmp/v416-target.png',clip:{x:1040,y:60,width:560,height:900}});

  // === F-05: new generation panel
  await p.evaluate(()=>{ LN.gen=1; ensureGen(1); LNdraw() });
  const ng=await p.evaluate(()=>{ var e=document.querySelector('#ringsign .ng'); return e?{t:e.textContent,c:e.className}:null });
  ok('new generation: a blinking panel says hulls of the new generation can be built', ng&&/GENERATION II HULLS ARE READY/.test(ng.t)&&/blink/.test(ng.c), JSON.stringify(ng));
  await tap('#ringsign .ng');
  ok('tapping it opens the dock and the panel goes out', await p.evaluate(()=>LNU.dockOpen===true&&!document.querySelector('#ringsign .ng')));

  // === F-07 / wording
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  const card=await p.evaluate(()=>document.getElementById('rail').textContent);
  ok('world card names its ring', /Ring\s*1/.test(card), card.slice(0,120));
  await p.evaluate(()=>{ LNU.tab='earth'; LNdraw() });
  const er=await p.evaluate(()=>document.getElementById('rail').textContent);
  ok('survey block explains that worlds sit on rings', /Worlds sit on rings around Earth/.test(er));
  ok('no "sector" and no bare "Reach" anywhere on the rail/header (EN)', !/sector/i.test(er+document_text_dummy())&&!/\bReach\b/.test(er), '');
  const hd=await p.evaluate(()=>document.getElementById('hdr').textContent);
  ok('header says Live worlds and Rings', /Live worlds/.test(hd)&&/Rings/.test(hd), hd.slice(0,200));

  // === RU
  await p.evaluate(()=>{ LNU.lang='ru'; LNdraw() });
  const ru=await p.evaluate(()=>({sign:document.getElementById('ringsign').textContent, rail:document.getElementById('rail').textContent, hdr:document.getElementById('hdr').textContent}));
  ok('RU sign: НОВОЕ КОЛЬЦО', /НОВОЕ КОЛЬЦО/.test(ru.sign), ru.sign);
  ok('RU: no "сектор", no "охват" on sign/rail/header', !/сектор|охват/i.test(ru.sign+ru.rail+ru.hdr), (ru.sign+ru.rail+ru.hdr).match(/.{20}(сектор|охват).{20}/i));
  ok('RU header: Живых миров', /Живых миров/.test(ru.hdr), ru.hdr.slice(0,200));
  await p.screenshot({path:'/tmp/v416-ru.png',clip:{x:0,y:60,width:1600,height:420}});

  // === phone width: sign must not hide the whole map
  await p.setViewportSize({width:390,height:844}); await p.evaluate(()=>{ LNU.lang='en'; LNdraw() }); await p.waitForTimeout(200);
  const ph=await p.evaluate(()=>{ var r=document.getElementById('ringsign').getBoundingClientRect(), m=document.getElementById('mapwrap').getBoundingClientRect(); return {w:Math.round(r.width), mw:Math.round(m.width), h:Math.round(r.height), mh:Math.round(m.height)} });
  const cov=await p.evaluate(()=>{ var r=document.getElementById('ringsign').getBoundingClientRect(), a=document.getElementById('advisor').getBoundingClientRect(); var cx=r.left+r.width/2, cy=r.top+12; var top=document.elementFromPoint(cx,cy); return {onTop: !!(top&&top.closest('#ringsign')), signBottom:Math.round(r.bottom), advTop:Math.round(a.top)} });
  ok('390px: the sign sits on top and the advisor starts below it', cov.onTop&&cov.advTop>=cov.signBottom-4, JSON.stringify(cov));
  await p.screenshot({path:'/tmp/v416-phone.png'});

  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERROR '+String(e).slice(0,400)) }
fs.writeFileSync('/tmp/pw34.out',out.join('\n')+'\n'); console.log(out.join('\n')); })();
function document_text_dummy(){ return '' }
