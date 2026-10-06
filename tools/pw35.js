// v4.17 — fleet panel, progress bars, spent world, generation track (feedback batch 2: F-12..F-16). Real mouse. node pw35.js [page.html]
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

  // === F-16: generation track in the standing order
  await p.evaluate(()=>{ LN.gen=2; ensureGen(2); LNU.lineGen=null; LNU.sel=Object.keys(LN.colonies)[0]; LNU.tab='target'; LNdraw() });
  const sel0=await p.evaluate(()=>LNU.sel);
  const segs=await p.evaluate(()=>[].slice.call(document.querySelectorAll('.gtrack .gseg')).map(e=>e.textContent+(e.classList.contains('on')?'*':'')));
  ok('track shows every generation up to the newest, newest selected', JSON.stringify(segs)==='["I","II","III*"]', JSON.stringify(segs));
  const rowName0=await p.evaluate(()=>document.querySelector('.so-row .so-name b').textContent);
  ok('the order rows are the newest generation (III)', /III/.test(rowName0), rowName0);
  // click the middle segment with the real mouse
  const segPos=async()=>{ await p.locator('.gtrack').first().scrollIntoViewIfNeeded(); return await p.evaluate(()=>[].slice.call(document.querySelectorAll('.gtrack .gseg')).map(e=>{var r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width}})) };
  const genNow=()=>p.evaluate(()=>(LNU.lineGen===null||LNU.lineGen===undefined)?LN.gen:LNU.lineGen);
  const bbs=await segPos();
  ok('the track is wide enough to hit (each generation ≥ 40 px)', bbs.every(s=>s.w>=40), JSON.stringify(bbs.map(s=>Math.round(s.w))));
  await p.mouse.click(bbs[1].x,bbs[1].y); await p.waitForTimeout(150);
  ok('clicking II selects generation II', await p.evaluate(()=>LNU.lineGen===1&&/II/.test(document.querySelector('.so-row .so-name b').textContent)&&!/III/.test(document.querySelector('.so-row .so-name b').textContent)), await p.evaluate(()=>document.querySelector('.so-row .so-name b').textContent));
  // drag from II to I and to III (the pointer is tracked on the document, the track is redrawn under it)
  let bb2=await segPos();
  await p.mouse.move(bb2[1].x,bb2[1].y); await p.mouse.down(); await p.mouse.move(bb2[0].x,bb2[0].y,{steps:6});
  ok('dragging to the left end selects generation I while the button is held', await p.evaluate(()=>LNU.lineGen===0), await p.evaluate(()=>LNU.lineGen));
  await p.mouse.move(bb2[2].x,bb2[2].y,{steps:8}); await p.mouse.up(); await p.waitForTimeout(100);
  ok('dragging to the right end selects the newest again (follows the newest)', await p.evaluate(()=>LNU.lineGen===null), await p.evaluate(()=>String(LNU.lineGen)));
  // the arrows
  await tap('[data-act="lgen"][data-d="-1"]');
  ok('◀ steps one generation back', (await genNow())===1, await genNow());

  // press + on generation II: a hull of generation II is laid down for THIS world
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&shipClass(s)==='courier') s.mode='dead' }); LNU.tab='target'; LNdraw() });
  await tap('[data-act="want"][data-c="courier"].plus');
  const t1=await toast(); await run(2);   // the yards lay the hull down on their next yearly pass
  const pinned=await p.evaluate(id=>({pin:lineGenPin(LN,id,'courier'), want:LN.lines[id].want.courier, ys:LN.ships.filter(s=>s.mode==='building'&&s.hull===hullAt('courier',1)).length}),sel0);
  ok('+ on generation II pins II and the yards build a Courier II for this world', pinned.pin===1&&pinned.want>=1&&pinned.ys>=1&&/yards are building/.test(t1), JSON.stringify(pinned)+' | '+t1);
  await run(14);
  const onLine=await p.evaluate(id=>LN.ships.filter(s=>(s.from===id||(s.pend&&s.pend.from===id))&&s.mode!=='dead'&&shipClass(s)==='courier').map(s=>hullGen(s)),sel0);
  ok('the hull that took the line is generation II', onLine.length>0&&onLine.every(g=>g===1), JSON.stringify(onLine));
  ok('the order row lists it by generation ("on line: II×1")', /on line: II×\d/.test(await rail()), (await rail()).match(/on line:[^\n]{0,30}/));
  // a hull of generation II already idle at Earth goes first, not a new build
  await p.evaluate(()=>{ buildShip(LN,hullAt('hauler',1)) }); await run(20);
  const freeH=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&shipClass(s)==='hauler'&&hullGen(s)===1).length);
  await p.evaluate(()=>{ LNU.lineGen=1; LNU.tab='target'; LNdraw() });
  const ybefore=await p.evaluate(()=>LN.ships.filter(s=>s.mode==='building').length);
  await tap('[data-act="want"][data-c="hauler"].plus');
  const t2=await toast();
  ok('a free hull of the picked generation is announced as going first', freeH>0&&/free hull at Earth goes first/.test(t2), 'free='+freeH+' | '+t2);
  await run(2);
  ok('…and nothing new was laid down', await p.evaluate(()=>LN.ships.filter(s=>s.mode==='building').length)<=ybefore);

  // generation I is retired (yards build only the newest and the one before): + is closed with a reason
  await p.evaluate(()=>{ LNU.lineGen=0; LNU.tab='target'; LNdraw() });
  const dis=await p.evaluate(()=>{ var bt=document.querySelector('[data-act="want"][data-c="courier"].plus'); return bt?{d:bt.getAttribute('aria-disabled'),w:bt.getAttribute('data-why')}:null });
  ok('generation I (retired) has + closed with gen_retired', dis&&dis.d==='true'&&dis.w==='gen_retired', JSON.stringify(dis));
  await tap('[data-act="want"][data-c="courier"].plus');
  ok('pressing it says why', /no longer build this generation/.test(await toast()), await toast());
  ok('the track warns about it', /no longer lay this generation down/.test(await rail()));
  await p.screenshot({path:require('os').tmpdir()+'/v417-track.png',clip:{x:1040,y:60,width:560,height:900}});

  // === F-15: a spent world offers only evacuation
  await p.evaluate(id=>{ LNU.lineGen=null; LN.reserves[id]=0; LN.colonies[id].store.metal=0; /* v4.18: locked only when the surface is empty too */ LNU.sel=id; LNU.tab='target'; LNdraw() },sel0);
  const titles=await p.evaluate(()=>[].slice.call(document.querySelectorAll('#rail .blk h3')).map(e=>e.textContent.trim()));
  ok('spent world: only its card and the "Spent world" block remain', titles.length===2&&/Spent world/i.test(titles[1]), JSON.stringify(titles));
  const btns=await p.evaluate(()=>[].slice.call(document.querySelectorAll('#rail button')).filter(e=>!e.classList.contains('tab')).map(e=>(e.dataset.act||e.className)));
  ok('…and the only action is evacuation', btns.length===1&&btns[0]==='evac', JSON.stringify(btns));
  const dtxt=await rail();
  ok('…no standing order, free hulls, last report, kit or stats', !/Standing order|Free hulls|Last report|Mine works|Hulls for this world|BUILD|kit/i.test(dtxt), '');
  ok('…it says the stockyard is empty', /stockyard is empty/.test(dtxt), dtxt.slice(dtxt.indexOf('Spent'),dtxt.indexOf('Spent')+240));
  await p.screenshot({path:require('os').tmpdir()+'/v417-spent.png',clip:{x:1040,y:60,width:560,height:500}});
  await p.evaluate(()=>{ buildShip(LN,hullAt('courier',2)) }); await run(20);
  await tap('[data-act="evac"]');
  const te=await toast();
  ok('evacuation launches (or says why not)', await p.evaluate(id=>LN.ships.some(s=>s.job==='evac'&&s.dest===id),sel0)||te.length>0, te);
  // a living world keeps all its blocks
  await p.evaluate(id=>{ LN.reserves[id]=5000; LNU.tab='target'; LNdraw() },sel0);
  ok('a world with a seam keeps its blocks', /Planet work fleet/.test(await rail()));

  // === RU
  await p.evaluate(()=>{ LNU.lang='ru'; LNU.sel=Object.keys(LN.colonies)[0]; LNU.tab='target'; LNdraw() });
  const ru=await p.evaluate(()=>({left:document.getElementById('advisor').textContent, rail:document.getElementById('rail').textContent}));
  ok('RU: panel tabs Флот / Требует решения', /Флот/.test(ru.left), ru.left.replace(/\s+/g,' ').slice(0,120));
  ok('RU: generation track label', /Поколение корпуса/.test(ru.rail), '');
  await p.screenshot({path:require('os').tmpdir()+'/v417-ru.png',clip:{x:0,y:60,width:1600,height:640}});

  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERROR '+String(e).slice(0,400)) }
fs.writeFileSync(require('os').tmpdir()+'/pw35.out',out.join('\n')+'\n'); console.log(out.join('\n')); })();
