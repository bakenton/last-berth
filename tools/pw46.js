// pw46 — финал (Никита, 02.11, забег 221175121): сколько проснётся — на верхней панели; потери и причина — на последнем экране;
// справка «?» на TECH помнит состояние; помехи за последние 200 лет не мешают кликам; лишние суда конвоя и «все суда домой».
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW46_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  await U.start('en',11);
  await U.pause();

  // 1. the help on TECH: closed, opens, closes, stays across a reload
  await U.tap('#tabs [data-act="tab"][data-v="tech"]');
  ok('help: closed at first', !(await p.isVisible('.dhelp')));
  await U.tap('[data-act="drivehelp"]');
  let tx=await p.innerText('.dhelp');
  ok('help: the mouse opens it, it says where the parts go', /works worlds/.test(tx)&&/START spends/.test(tx),tx);
  ok('help: no word of the ark before the Night has a date', !/\bark\b/i.test(tx.replace('and the ark','')),tx);
  await shot('help-open');
  ok('help: the choice is stored', await p.evaluate(()=>localStorage.getItem('lb.driveHelp')==='1'));
  await U.tap('[data-act="drivehelp"]');
  ok('help: the mouse closes it', !(await p.isVisible('.dhelp')));
  await U.tap('[data-act="drivehelp"]');

  // the last years of a run with a dated Night, set through the hooks
  await p.evaluate(()=>{ const G=LN; G.night=G.day+150; G.nightSeen=true; G.arkMark=2; G.driveLvl=3; G.gen=3; ensureGen(3);
    G.earth.people=4000; G.earth.metal=99999; G.earth.fuel=99999; G.earth.food=99999; G.earth.parts=99999; LNtut.off(); LNdraw() });

  // 2. the top bar
  let top=await p.innerText('#top .yr.wake');
  const want=await p.evaluate(()=>{ const s=Math.floor(LN.earth.people)+crewDocked(LN), w=Math.floor(s*arkWake(LN)); return {s,w,l:s-w,pc:arkWake(LN)} });
  const n=x=>top.replace(/\s/g,'').includes(String(x));
  ok('top: who wakes and who does not, by the drive of today', want.pc===0.6&&n(want.w)&&n(want.l)&&/never wake/.test(top),top+' / '+JSON.stringify(want));
  await shot('top-bar');
  const ov=await p.evaluate(()=>{ const t=document.getElementById('top'); return t.scrollWidth-t.clientWidth });
  ok('top: fits at 1440', ov<=0,ov);
  await U.tap('#top .yr.wake'); ok('top: a click opens the ark', await p.evaluate(()=>LNU.win==='ark'));
  tx=await p.evaluate(()=>LNU.win); await U.tap('#top .yr.wake');
  await U.tap('#tabs [data-act="tab"][data-v="tech"]').catch(()=>{});
  if(!(await p.isVisible('.dhelp'))) await U.tap('#tabs [data-act="tab"][data-v="tech"]');
  tx=await p.innerText('.dhelp');
  ok('help: after the date it says the drive decides who wakes', /sleepers wake/.test(tx)&&/60%/.test(tx)&&/85%/.test(tx),tx);
  await shot('help-wake');
  await U.tap('#tabs [data-act="tab"][data-v="tech"]');

  // 3. the static over the map
  const fx=()=>p.evaluate(()=>{ const e=document.getElementById('nightfx'), s=getComputedStyle(e); return {d:s.display,pe:s.pointerEvents,nf:+s.getPropertyValue('--nf')} });
  let f=await fx(); ok('static: on, takes no clicks, 150 years out', f.d==='block'&&f.pe==='none'&&f.nf>0.2&&f.nf<0.5,JSON.stringify(f));
  await shot('map-150');
  await p.evaluate(()=>{ LN.night=LN.day+5; LNdraw() }); const f2=await fx();
  ok('static: grows to the end', f2.nf>0.9,JSON.stringify(f2));
  await shot('map-5');
  const under=await p.evaluate(()=>{ const m=document.getElementById('mapbox').getBoundingClientRect(), e=document.elementFromPoint(m.left+m.width/2,m.top+m.height/2); return !!e.closest('#map') });
  ok('static: the point at the middle of the map is still the map', under);
  await p.evaluate(()=>{ LN.night=LN.day+400; LNdraw() }); f=await fx(); ok('static: none 400 years out', f.d==='none',f.d);
  await p.evaluate(()=>{ LN.night=LN.day+150; LNdraw() });

  // 4. the convoy: hulls over the norm, all home
  await p.evaluate(()=>{ const G=LN, hi=currentHull(G,'courier'); const mk=()=>{ const h=HULLS[hi], s=JSON.parse(JSON.stringify(G.ships[0])); s.id=Math.max(...G.ships.map(o=>o.id))+1; s.hull=hi; s.cap=h.cap; s.crew=h.crew; s.mode='idle'; s.at='earth'; s.from=null; s.to=null; s.pend=null; s.job=null; s.mutiny=false; s.reserve=false; G.ships.push(s) };
    for(let i=0;i<6;i++) mk(); LNdraw() });
  await U.tap('#tabs [data-act="tab"][data-v="ark"]');
  tx=await p.innerText('#convoy');
  const extra=await p.evaluate(()=>{ const G=LN, c=arkConvoy(G).need.courier, m=G.ships.filter(s=>convoyHull(G,s)&&shipClass(s)==='courier'); return {k:m.length-c,n:m.slice(c).reduce((a,s)=>a+s.crew,0)} });
  ok('convoy: hulls over the norm say what their crews add', extra.k>0&&new RegExp('\\+'+extra.n+' crew souls').test(tx.replace(/\s(?=\d)/g,' ')),tx.slice(0,300)+' / '+JSON.stringify(extra));
  // a line to carry home
  await p.evaluate(()=>{ LNU.win=null; LN.night=LN.day+1000; LN.safe=true; const G=LN, w=PLANETS.filter(q=>q.sec===0&&!G.colonies[q.id]).sort((x,y)=>x.dist-y.dist)[0], s=G.ships.find(x=>x.mode==='idle'&&x.at==='earth'&&x.hull===0)||G.ships.find(x=>x.mode==='idle'&&x.at==='earth'); colonize(G,s.id,w.id,0,0); LNdraw() });
  await U.until(()=>p.evaluate(()=>Object.keys(LN.colonies).length>0),200,10); await U.pause();
  const onLines=await p.evaluate(()=>{ const G=LN, pid=Object.keys(G.colonies)[0]; G.ships.filter(x=>x.mode==='idle'&&x.at==='earth'&&!x.reserve).slice(0,2).forEach(s=>setLine(G,s.id,'earth',pid)); G.night=G.day+150; LNdraw(); return G.ships.filter(s=>s.mode!=='dead'&&s.mode!=='missing'&&s.mode!=='building'&&!s.mutiny&&!s.job&&(s.from||s.pend)).map(s=>s.id) });
  ok('all home: a line to work with', onLines.length>0,onLines.join());
  await p.evaluate(()=>{ LNU.win=null; LNdraw() }); await U.tap('#tabs [data-act="tab"][data-v="ark"]');
  await p.waitForSelector('[data-act="allhome"]',{timeout:3000}).catch(()=>{});
  let bt=await p.innerText('[data-act="allhome"]');
  ok('all home: the button counts the hulls on lines', new RegExp(': '+onLines.length+'$').test(bt.trim()),bt);
  await U.tap('[data-act="allhome"]');
  bt=await p.innerText('[data-act="allhome"]');
  ok('all home: the first press only asks', /Press again/i.test(bt)&&await p.evaluate(ids=>ids.every(i=>{ const s=shipById(LN,i); return s.from||s.pend }),onLines),bt);
  await shot('convoy-arm');
  await U.tap('[data-act="allhome"]');
  ok('all home: the second press takes them off their lines', await p.evaluate(ids=>ids.every(i=>{ const s=shipById(LN,i); return !s.from&&!s.pend }),onLines));
  const reserved=await p.evaluate(ids=>ids.filter(i=>{ const s=shipById(LN,i); return hullGen(s)>=convoyGen(LN)&&!s.reserve }).length,onLines);
  ok('all home: the hulls fit for the convoy are set aside', reserved===0,reserved);
  await shot('convoy');
  await U.closeWin().catch(()=>{}); await p.evaluate(()=>{ LNU.win=null; LNdraw() });
  await U.until(()=>p.evaluate(ids=>ids.every(i=>{ const s=shipById(LN,i); return s.mode==='idle'&&s.at==='earth' }),onLines),120,10); await U.pause();
  ok('all home: every one of them docks at Earth', await p.evaluate(ids=>ids.every(i=>{ const s=shipById(LN,i); return s.mode==='idle'&&s.at==='earth' }),onLines),JSON.stringify(await p.evaluate(ids=>ids.map(i=>{ const s=shipById(LN,i); return [i,s.mode,s.at] }),onLines)));
  await p.evaluate(()=>{ LNU.win=null; LNdraw() });

  // 5. the last screen: 60% wake, the reason in words, the number that was lost
  await p.evaluate(()=>{ const G=LN; G.ark.paid={metal:1e6,parts:1e6,food:1e6,fuel:1e6}; G.ark.lv=4;
    const need=arkConvoy(G).need; ['courier','hauler','freighter'].forEach(c=>{ const hi=currentHull(G,c), h=HULLS[hi]; for(let i=0;i<need[c];i++){ const s=JSON.parse(JSON.stringify(G.ships[0])); s.id=Math.max(...G.ships.map(o=>o.id))+1; s.hull=hi; s.cap=h.cap; s.crew=h.crew; s.mode='idle'; s.at='earth'; s.from=null; s.to=null; s.pend=null; s.job=null; s.mutiny=false; G.ships.push(s) } });
    G.night=G.day+1; LNdraw() });
  await U.until(()=>p.evaluate(()=>!!LN.over),200,10);
  const end=await p.evaluate(()=>({over:LN.over,b:LN.boarded,s:LN.souls,w:LN.wake,g:LN.driveLvl,gr:LN.grounded}));
  ok('end: the ark sailed on 60%', end.over==='night'&&!end.gr&&end.w===0.6,JSON.stringify(end));
  tx=await p.innerText('.nwin');
  const lost=(end.b-end.s).toLocaleString('en').replace(/,/g,'');
  const flat=tx.replace(/(\d)[\s,   ](?=\d)/g,'$1');
  ok('end: the loss and the reason are said', flat.includes(lost+' sleepers never woke')&&/generation IV drive/i.test(flat)&&/Generation V would have woken 85%/i.test(flat),flat.slice(0,500));
  ok('end: a row with the number', /never woke/i.test(tx));
  await shot('end');
  ok('no page errors', p.errs.length===0,p.errs.join(' | '));
  await b.close();
 }catch(e){ ok('crash',false,e.stack||e) }
 const fails=out.filter(l=>l.startsWith('FAIL')); console.log(out.join('\n')); console.log('pw46 '+(out.length-fails.length)+'/'+out.length+(fails.length?' FAIL':' ok')); process.exit(fails.length?1:0);
})();
