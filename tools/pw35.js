// v4.17 — fleet panel, progress bars, spent world (feedback batch 2: F-12..F-16); v4.31 — line panel without generation pages, take off / move chips, evacuation off without a courier (F-36, F-38). Real mouse. node pw35.js [page.html]
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const page=process.argv[2]||'long-night.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150)};
  const closePf=async()=>{ for(let i=0;i<8;i++){ if(await p.isVisible('#pf')) await tap('[data-act="pfok"]'); else if(await p.evaluate(()=>!!LN.shiftOpen)) await tap('[data-act="shiftok"]'); else if(await p.isVisible('[data-act="nightok"]')) await tap('[data-act="nightok"]'); else if(await p.isVisible('#nofree')) await tap('[data-act="nofreeclose"]'); else break } };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false } LNdraw() },n); await closePf() };
  const toast=async()=>(await p.textContent('#toast'))||'';
  const rail=async()=>await p.evaluate(()=>document.getElementById('rail').textContent);
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/'+page); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  await p.evaluate(()=>{ LNU.pro.on=false; LNU.pro.stage=99; LNU.paused=true; var E=LN.earth; E.metal=9000; E.food=20000; E.fuel=9000; E.parts=4000; E.people=3000; LNdraw() });

  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  await tap('[data-act="colonize"]'); await run(45);
  ok('world founded', await p.evaluate(id=>!!LN.colonies[id],mine));

  // === F-12: the top-left panel is the fleet
  const tabs=await p.evaluate(()=>[].slice.call(document.querySelectorAll('#advisor .advtab')).map(e=>e.textContent.replace(/\s+/g,' ').trim()));
  ok('top-left panel has two tabs: Fleet and Needs a decision', tabs.length===2&&/^Fleet/.test(tabs[0])&&/Needs a decision/i.test(tabs[1]), JSON.stringify(tabs));
  ok('Fleet is the tab that is open', await p.evaluate(()=>document.querySelector('#advisor .advtab.on').textContent.indexOf('Fleet')===0&&!!document.querySelector('#advisor .advbody.fleet')));
  const rowsN=await p.evaluate(()=>document.querySelectorAll('#advisor .fl-row').length), shipsN=await p.evaluate(()=>LN.ships.filter(s=>s.mode!=='dead').length);
  ok('every hull of the fleet has a row', rowsN===shipsN&&rowsN>0, rowsN+' rows / '+shipsN+' ships');

  // === F-13: a hull in the yards has a progress bar that fills
  await p.evaluate(()=>{ LN.lastBuild=buildShip(LN,hullAt('courier',0)); LNdraw() });
  const bar1=await p.evaluate(()=>{ var r=document.querySelector('#advisor .fl-row.bld .pbar>i'); return r?parseFloat(r.style.width):null });
  ok('hull in the yards shows a bar', bar1!==null&&bar1>=0&&bar1<100, bar1);
  await run(6);
  const bar2=await p.evaluate(()=>{ var r=document.querySelector('#advisor .fl-row.bld .pbar>i'); return r?parseFloat(r.style.width):null });
  ok('the bar fills as years pass', bar2!==null&&bar2>bar1, bar1+' → '+bar2);
  const grp=await p.evaluate(()=>[].slice.call(document.querySelectorAll('#advisor .fl-grp')).map(e=>e.textContent.replace(/\s+/g,' ').trim()));
  ok('hulls are grouped: In the yards / Free at Earth / On the lines…', grp.some(g=>/^In the yards/.test(g))&&grp.some(g=>/^Free at Earth/.test(g)), JSON.stringify(grp));
  const rowTxt=await p.evaluate(()=>document.querySelector('#advisor .fl-row.bld').textContent.replace(/\s+/g,' '));
  ok('a yard row says class, number, years left and cap/speed', /Courier/.test(rowTxt)&&/no\. \d+/.test(rowTxt)&&/yrs left/.test(rowTxt)&&/yr\/s/.test(rowTxt), rowTxt);
  await p.screenshot({path:require('os').tmpdir()+'/v417-fleet.png',clip:{x:0,y:60,width:700,height:640}});

  // tabs switch with the mouse and the advisor is still there
  await tap('#advisor [data-tab="advice"]');
  ok('Needs-a-decision tab shows the advice list', await p.evaluate(()=>!!document.querySelector('#advisor .advbody')&&!document.querySelector('#advisor .advbody.fleet')&&document.querySelector('#advisor #advhead').classList.contains('on')));
  await tap('#advisor [data-tab="fleet"]');
  ok('…and Fleet comes back', await p.evaluate(()=>!!document.querySelector('#advisor .advbody.fleet')));
  await tap('#advtog');
  ok('the panel collapses to its tab bar', await p.evaluate(()=>!document.querySelector('#advisor .advbody')));
  await tap('#advtog');

  // === F-14: the buy menu no longer lists what is being built
  await p.evaluate(()=>{ LNU.dockOpen=true; LNdraw() });
  ok('dock has no yard queue', await p.evaluate(()=>!document.querySelector('#dock .yardq')&&!/In the yards/.test(document.getElementById('dock').textContent)));
  await p.evaluate(()=>{ LNU.tab='earth'; LNdraw() });
  ok('Earth tab has no "In the yards" block either (the fleet panel owns it)', !/In the yards/.test(await rail()));
  await p.screenshot({path:require('os').tmpdir()+'/v417-dock.png',clip:{x:0,y:560,width:1250,height:440}});

  // === v4.31 (F-36): one row per class, the yards lay down the current generation; no generation track
  await p.evaluate(()=>{ LN.gen=2; ensureGen(2); LNU.sel=Object.keys(LN.colonies)[0]; LNU.tab='target'; LNdraw() });
  const sel0=await p.evaluate(()=>LNU.sel);
  ok('no generation track or pages in the line panel', await p.evaluate(()=>!document.querySelector('.gtrack')&&!document.querySelector('.lg-box')&&!document.querySelector('[data-act="lgen"]')));
  const rowName0=await p.evaluate(()=>document.querySelector('.so-row .so-name b').textContent);
  ok('the order rows are the current generation (III)', /III/.test(rowName0), rowName0);
  ok('one row per open class', await p.evaluate(()=>{ var n={}; document.querySelectorAll('.so-row [data-act="want"].plus').forEach(function(b){ n[b.dataset.c]=(n[b.dataset.c]||0)+1 }); return Object.keys(n).every(function(c){return n[c]===1}) }));
  // press + on the courier row: a Courier III is laid down for THIS world
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&shipClass(s)==='courier') s.mode='dead' }); LNU.tab='target'; LNdraw() });
  await tap('[data-act="want"][data-c="courier"].plus');
  const t1=await toast(); await run(2);   // the yards lay the hull down on their next yearly pass
  const laid=await p.evaluate(id=>({want:LN.lines[id].want.courier, ys:LN.ships.filter(s=>s.mode==='building'&&s.hull===hullAt('courier',2)).length, gen:LN.lines[id].gen||null}),sel0);
  ok('+ orders the current generation: the yards build a Courier III for this world, nothing pinned', laid.want>=1&&laid.ys>=1&&!laid.gen&&/yards are building/.test(t1), JSON.stringify(laid)+' | '+t1);
  await run(14);
  const onLine=await p.evaluate(id=>LN.ships.filter(s=>(s.from===id||(s.pend&&s.pend.from===id))&&s.mode!=='dead'&&shipClass(s)==='courier').map(s=>hullGen(s)),sel0);
  ok('the hull that took the line is generation III', onLine.length>0&&onLine.every(g=>g===2), JSON.stringify(onLine));
  ok('one generation on the line: the row says "1 on the line" and lists no generations (v4.31)', /1 on the line/.test(await rail())&&!/on line: [IVX]+\u00d7/.test(await rail()), (await rail()).match(/on the line[^\n]{0,30}/));
  // an idle hull of an OLDER generation at Earth goes first, not a new build (no pages: any generation that reaches)
  await p.evaluate(()=>{ buildShip(LN,hullAt('hauler',1)) }); await run(20);
  const freeH=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&shipClass(s)==='hauler'&&hullGen(s)===1).length);
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  const ybefore=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='building').length);
  await tap('[data-act="want"][data-c="hauler"].plus');
  const t2=await toast();
  ok('a free hull of an older generation is announced as going first', freeH>0&&/free hull at Earth goes first/.test(t2), 'free='+freeH+' | '+t2);
  await run(2);
  ok('…and nothing new was laid down', await p.evaluate(()=>LN.ships.filter(s=>s.mode==='building').length)<=ybefore);
  await run(3);
  ok('the hull rows under the line name the generation (Hauler II)', /Hauler [^\n]{0,20}II(?![IVX])/.test(await rail()), (await rail()).match(/Hull \d+[^\n]{0,60}/g));
  // under the hulls: 'Take off the line' and 'Move to:' chips
  const hulls=await p.evaluate(()=>document.querySelectorAll('#rail .lh').length);
  const acts=await p.evaluate(()=>[].slice.call(document.querySelectorAll('#rail .lh-act')).map(e=>e.textContent.replace(/\s+/g,' ').trim()));
  ok('every hull of the line has a "Take off the line" button under it', hulls>=2&&acts.length===hulls&&acts.every(t=>/Take off the line/.test(t)), JSON.stringify(acts));
  ok('…and no "Move to" chips while this is the only world', acts.every(t=>!/Move to/.test(t)), '');
  ok('the old × chip is gone', await p.evaluate(()=>![].slice.call(document.querySelectorAll('#rail .chip.x')).some(e=>e.textContent.trim()==='×')));
  const hid=await p.evaluate(id=>LN.ships.filter(s=>(s.from===id||(s.pend&&s.pend.from===id))&&s.mode!=='dead'&&shipClass(s)==='hauler')[0].id,sel0);
  const wantB=await p.evaluate(id=>LN.lines[id].want.hauler,sel0);
  await tap('#rail .lh-act [data-act="unroute"][data-s="'+hid+'"]');
  const off1=await p.evaluate(a=>{ const s=shipById(LN,a.id); return {from:s.from, pend:!!s.pend, want:LN.lines[a.pid]?LN.lines[a.pid].want.hauler:0, toast:document.getElementById('toast').textContent} },{id:hid,pid:sel0});
  ok('"Take off the line" with the mouse: the hull is off the line and the counter follows', !off1.from&&!off1.pend&&off1.want===wantB-1&&/released/i.test(off1.toast), JSON.stringify(off1));
  // a second world: the chips appear and move a hull with one click
  const mine2=await p.evaluate(id=>PLANETS.filter(q=>q.sec===0&&q.id!==id&&q.kind!=='works').sort((a,b)=>a.dist-b.dist)[0].id,sel0);
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine2);
  await tap('[data-act="colonize"]'); await run(60);
  ok('second world founded', await p.evaluate(id=>!!LN.colonies[id],mine2));
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },sel0);
  const cid=await p.evaluate(id=>LN.ships.filter(s=>(s.from===id||(s.pend&&s.pend.from===id))&&s.mode!=='dead'&&shipClass(s)==='courier')[0].id,sel0);
  const chip=await p.$('#rail .lh-act [data-act="move"][data-s="'+cid+'"][data-p="'+mine2+'"]');
  ok('a "Move to → world" chip for the other world under the courier', !!chip, await p.evaluate(()=>[].slice.call(document.querySelectorAll('#rail .lh-act')).map(e=>e.textContent.replace(/\s+/g,' ').trim()).join(' | ')));
  ok('…labelled "Move to:"', /Move to:/.test(await rail()));
  const wantC=await p.evaluate(id=>LN.lines[id].want.courier,sel0);
  await tap('#rail .lh-act [data-act="move"][data-s="'+cid+'"][data-p="'+mine2+'"]');
  // v4.32 (Nikita, 13.10: 'перевод по готовности, никаких очередей'): in flight the order is only remembered — nothing moves, no counter moves
  const st=a=>{ const s=shipById(LN,a.id); return {mode:s.mode, from:s.from, moveTo:s.moveTo||null, want1:LN.lines[a.p1]?LN.lines[a.p1].want.courier:0, want2:LN.lines[a.p2]?LN.lines[a.p2].want.courier:0, toast:document.getElementById('toast').textContent, row:[].slice.call(document.querySelectorAll('#rail .lh')).map(e=>e.textContent.replace(/\s+/g,' ')).join(' | ')} };
  const mv0=await p.evaluate(st,{id:cid,p1:sel0,p2:mine2});
  if(mv0.moveTo){
    ok('in flight: the order is remembered, the hull stays on its line, both counters untouched', mv0.from===sel0&&mv0.moveTo===mine2&&mv0.want1===wantC&&mv0.want2===0&&/changes line when it next docks/.test(mv0.toast), JSON.stringify(mv0));
    ok('…and the hull row says where it will go', /moves to .+ when it docks/.test(mv0.row), mv0.row);
    await p.screenshot({path:require('os').tmpdir()+'/v432-move-wait.png',clip:{x:1040,y:60,width:560,height:900}});
    for(let i=0;i<40&&await p.evaluate(id=>!!shipById(LN,id).moveTo,cid);i++) await run(5);
  } else ok('at the pier: the hull goes at once', mv0.from===mine2&&/sent to/.test(mv0.toast), JSON.stringify(mv0));
  const mv=await p.evaluate(st,{id:cid,p1:sel0,p2:mine2});
  ok('once it has docked the hull is on the new line: old counter -1, new counter 1', mv.from===mine2&&!mv.moveTo&&mv.want1===wantC-1&&mv.want2===1, JSON.stringify(mv));
  ok('core refuses a move onto the same world', await p.evaluate(a=>moveLine(LN,a.id,a.p)==='samenode',{id:cid,p:mine2}));
  await p.screenshot({path:require('os').tmpdir()+'/v431-line.png',clip:{x:1040,y:60,width:560,height:900}});

  // === F-15: a spent world offers only evacuation
  await p.evaluate(id=>{ LN.reserves[id]=0; LN.colonies[id].store.metal=0; /* v4.18: locked only when the surface is empty too */ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&shipClass(s)==='courier') s.mode='dead' }); LNU.sel=id; LNU.tab='target'; LNdraw() },sel0);
  const titles=await p.evaluate(()=>[].slice.call(document.querySelectorAll('#rail .blk h3')).map(e=>e.textContent.trim()));
  ok('spent world: only its card and the "Spent world" block remain', titles.length===2&&/Spent world/i.test(titles[1]), JSON.stringify(titles));
  const btns=await p.evaluate(()=>[].slice.call(document.querySelectorAll('#rail button')).filter(e=>!e.classList.contains('tab')).map(e=>(e.dataset.act||e.className)));
  ok('…and the only action is evacuation', btns.length===1&&btns[0]==='evac', JSON.stringify(btns));
  const dtxt=await rail();
  ok('…no standing order, free hulls, last report, kit or stats', !/Standing order|Free hulls|Last report|Mine works|Hulls for this world|BUILD|kit/i.test(dtxt), '');
  ok('…it says the stockyard is empty', /stockyard is empty/.test(dtxt), dtxt.slice(dtxt.indexOf('Spent'),dtxt.indexOf('Spent')+240));
  await p.screenshot({path:require('os').tmpdir()+'/v417-spent.png',clip:{x:1040,y:60,width:560,height:500}});
  // v4.31 (F-38): no free courier → the button is off and says why
  const evOff=await p.evaluate(()=>{ var bt=document.querySelector('[data-act="evac"]'); return bt?{d:bt.getAttribute('aria-disabled'),w:bt.getAttribute('data-why')}:null });
  ok('evacuation is off without a free courier (evacNoCourier)', evOff&&evOff.d==='true'&&evOff.w==='evacNoCourier', JSON.stringify(evOff));
  await tap('[data-act="evac"]');
  ok('pressing it says no courier reaches the world', /No free courier at Earth can reach/.test(await toast()), await toast());
  await p.evaluate(()=>{ buildShip(LN,hullAt('courier',2)) }); await run(20);
  ok('…a free courier switches it back on', await p.evaluate(()=>{ var bt=document.querySelector('[data-act="evac"]'); return bt&&bt.getAttribute('aria-disabled')!=='true' }));
  await tap('[data-act="evac"]');
  const te=await toast();
  ok('evacuation launches (or says why not)', await p.evaluate(id=>LN.ships.some(s=>s.job==='evac'&&s.dest===id),sel0)||te.length>0, te);
  // a living world keeps all its blocks
  await p.evaluate(id=>{ LN.reserves[id]=5000; LNU.tab='target'; LNdraw() },sel0);
  ok('a world with a seam keeps its blocks', /Planet work fleet/.test(await rail()));

  // === RU
  await p.evaluate(id=>{ LNU.lang='ru'; LNU.sel=id; LNU.tab='target'; LNdraw() },mine2);   // v4.31: the world that has hulls on its line
  const ru=await p.evaluate(()=>({left:document.getElementById('advisor').textContent, rail:document.getElementById('rail').textContent}));
  ok('RU: panel tabs Флот / Требует решения', /Флот/.test(ru.left), ru.left.replace(/\s+/g,' ').slice(0,120));
  ok('RU: "Снять с линии" under the hulls, no generation track', /Снять с линии/.test(ru.rail)&&!/Поколение корпуса/.test(ru.rail), '');
  await p.screenshot({path:require('os').tmpdir()+'/v417-ru.png',clip:{x:0,y:60,width:1600,height:640}});

  // === v4.32: a free hull of the current generation is scrapped from its Fleet row (the Earth-tab block went in v4.31)
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ const x=document.querySelector('#note [data-act="noteok"]'); if(x) x.click() } LNU.paused=true; LNU.pro.on=false;
    let s=LN.ships.find(o=>o.mode==='idle'&&o.at==='earth'&&!(o.from&&o.to)&&!o.reserve&&!o.mutiny);
    if(!s){ s=LN.ships.find(o=>o.mode!=='dead'&&o.mode!=='building'); s.mode='idle'; s.at='earth'; s.from=null; s.to=null; s.pend=null; s.reserve=false; s.mutiny=false; s.retire=false }
    window.__sc={id:s.id,metal:LN.earth.metal,n:LN.ships.filter(o=>o.mode!=='dead').length}; LNU.leftTab='fleet'; LNU.advOpen=true; LNdraw() });
  const scSel='#advisor .fl-row.free [data-act="scrap"][data-s="'+(await p.evaluate(()=>window.__sc.id))+'"]';
  ok('free hull has a Scrap button in its Fleet row', await p.isVisible(scSel), (await p.textContent(scSel).catch(()=>'')).replace(/\s+/g,' '));
  await p.locator(scSel).scrollIntoViewIfNeeded(); await p.screenshot({path:require('os').tmpdir()+'/v432-fleet-scrap.png',clip:{x:0,y:60,width:700,height:560}});
  { const bb=await p.locator(scSel).boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(200) }
  const scR=await p.evaluate(()=>({n:LN.ships.filter(o=>o.mode!=='dead').length,metal:LN.earth.metal,gone:!LN.ships.some(o=>o.id===window.__sc.id&&o.mode!=='dead'),toast:document.getElementById('toast').textContent}));
  ok('the click scraps that hull and pays the metal back', scR.gone&&scR.metal>await p.evaluate(()=>window.__sc.metal), JSON.stringify(scR));
  ok('reserved and mutinied hulls get no Scrap button there', await p.evaluate(()=>{ const s=LN.ships.find(o=>o.mode!=='dead'&&o.mode!=='building'); if(!s) return true; s.mode='idle'; s.at='earth'; s.from=null; s.to=null; s.reserve=true; LNdraw(); const r=!document.querySelector('#advisor [data-act="scrap"][data-s="'+s.id+'"]'); s.reserve=false; LNdraw(); return r }));
  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERROR '+String(e).slice(0,400)) }
fs.writeFileSync(require('os').tmpdir()+'/pw35.out',out.join('\n')+'\n'); console.log(out.join('\n')); })();
