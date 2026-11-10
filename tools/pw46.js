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

  // 2. v5.10 (ARK.md 2г; Nikita 10.11): WAKE · SLEEP ON is on the top bar in the Night; who wakes = min(aboard, pods) x the convoy's share
  const has=()=>p.evaluate(()=>{ const t=document.getElementById('top').innerText; return /WAKE/i.test(t)&&/SLEEP ON/i.test(t) });
  await p.evaluate(()=>{ LN.ark={rings:1,woke:1}; LN.driveLvl=3; LN.arkMark=2; LNdraw() });
  ok('top: WAKE · SLEEP ON with a ring paid and the drive at the mark', await p.evaluate(()=>arkRings(LN)>=1&&arkReady(LN))&&(await has()));
  await p.evaluate(()=>{ const G=LN; ['courier','hauler','freighter'].forEach(c=>{ const hi=currentHull(G,c), h=HULLS[hi]; for(let i=0;i<2;i++){ const s=JSON.parse(JSON.stringify(G.ships[0])); s.id=Math.max(...G.ships.map(o=>o.id))+1; s.hull=hi; s.cap=h.cap; s.crew=h.crew; s.mode='idle'; s.at='earth'; s.from=null; s.to=null; s.pend=null; s.job=null; s.mutiny=false; s.reserve=true; G.ships.push(s) } }); LNdraw() });
  const want=await p.evaluate(()=>({s:arkSouls(LN), cap:arkCapsuled(LN), share:arkConvoy(LN).share, w:arkWakeN(LN), have:arkConvoy(LN).have, all:arkConvoy(LN).all}));
  ok('wake = floor(min(aboard, pods) x convoy share), six hulls in the convoy', want.have>=6&&want.w>0&&want.w===Math.floor(want.cap*want.share+1e-9), JSON.stringify(want));
  await shot('top-bar');
  const ov=await p.evaluate(()=>{ const t=document.getElementById('top'); return t.scrollWidth-t.clientWidth });
  ok('top: fits at 1440', ov<=0,ov);
  await U.tap('#tabs [data-act="tab"][data-v="ark"]'); ok('the ark tab opens the ark', await p.evaluate(()=>LNU.win==='ark'));
  tx=await p.innerText('#arkwake'); ok('the ark window gives who wakes (min(aboard, pods) x share)', tx.replace(/\s/g,'').includes(String(want.w)), tx);
  await U.tap('#tabs [data-act="tab"][data-v="ark"]');

  // 3. the static over the map
  const fx=()=>p.evaluate(()=>{ const m=document.getElementById('mapbox'), e=document.getElementById('nightfx'), s=getComputedStyle(e), c=getComputedStyle(m); return {d:s.display,pe:s.pointerEvents,nf:+c.getPropertyValue('--nf'),nl:+c.getPropertyValue('--nl')} });
  const frames=async n=>{ if(!SHOTS) return; const sp0=await p.evaluate(()=>{ const a=LNU.paused,b=LNU.speed; LNU.paused=false; LNU.speed=1; return [a,b] }); await p.evaluate(()=>LNdraw()); await p.waitForTimeout(200); for(let i=1;i<=3;i++){ await p.screenshot({path:path.join(SHOTS,'map-'+n+'-f'+i+'.png')}); await p.waitForTimeout(170) } await p.evaluate(a=>{ LNU.paused=a[0]; LNU.speed=a[1]; LNdraw() },sp0) };
  let f=await fx(); ok('static: on, takes no clicks, 150 years out', f.d==='block'&&f.pe==='none'&&f.nf>0.45&&f.nf<0.65,JSON.stringify(f));
  await shot('map-150');
  await p.evaluate(()=>{ LN.night=LN.day+5; LNdraw() }); const f2=await fx();
  ok('static: grows to the end', f2.nf>0.9,JSON.stringify(f2));
  ok('static: the last 50 years are their own step', f2.nl>0.8,JSON.stringify(f2));
  await frames(5);
  await p.evaluate(()=>{ LN.night=LN.day+50; LNdraw() }); await frames(50);
  await p.evaluate(()=>{ LN.night=LN.day+5; LNdraw() });
  const under=await p.evaluate(()=>{ const m=document.getElementById('mapbox').getBoundingClientRect(), e=document.elementFromPoint(m.left+m.width/2,m.top+m.height/2); return !!e.closest('#map') });
  ok('static: the point at the middle of the map is still the map', under);
  await p.evaluate(()=>{ LN.night=LN.day+400; LNdraw() }); f=await fx(); ok('static: none 400 years out', f.d==='none',f.d);
  await p.evaluate(()=>{ LN.night=LN.day+150; LNdraw() });

  // 4. the convoy: hulls over the norm, all home
  await p.evaluate(()=>{ const G=LN, hi=currentHull(G,'courier'); const mk=()=>{ const h=HULLS[hi], s=JSON.parse(JSON.stringify(G.ships[0])); s.id=Math.max(...G.ships.map(o=>o.id))+1; s.hull=hi; s.cap=h.cap; s.crew=h.crew; s.mode='idle'; s.at='earth'; s.from=null; s.to=null; s.pend=null; s.job=null; s.mutiny=false; s.reserve=false; G.ships.push(s) };
    for(let i=0;i<6;i++) mk(); LNdraw() });
  await U.tap('#tabs [data-act="tab"][data-v="ark"]');
  await U.tap('#cvring .hx');
  tx=(await p.innerText('#arkcard')).replace(/\s+/g,' ');
  ok('convoy card: the hulls at the pier, on the lines and coming home are named', /at the pier/i.test(tx)&&/on the lines/i.test(tx)&&/coming home/i.test(tx), tx.slice(0,200));
  // a line to carry home
  await p.evaluate(()=>{ LNU.win=null; LN.night=LN.day+1000; LN.safe=true; const G=LN, w=PLANETS.filter(q=>q.sec===0&&!G.colonies[q.id]).sort((x,y)=>x.dist-y.dist)[0], s=G.ships.find(x=>x.mode==='idle'&&x.at==='earth'&&x.hull===0)||G.ships.find(x=>x.mode==='idle'&&x.at==='earth'); colonize(G,s.id,w.id,0,0); LNdraw() });
  await U.until(()=>p.evaluate(()=>Object.keys(LN.colonies).length>0),200,10); await U.pause();
  const onLines=await p.evaluate(()=>{ const G=LN, pid=Object.keys(G.colonies)[0]; G.ships.filter(x=>x.mode==='idle'&&x.at==='earth'&&!x.reserve).slice(0,2).forEach(s=>setLine(G,s.id,'earth',pid)); G.night=G.day+150; LNdraw(); return G.ships.filter(s=>s.mode!=='dead'&&s.mode!=='missing'&&s.mode!=='building'&&!s.mutiny&&!s.job&&(s.from||s.pend)).map(s=>s.id) });
  ok('all home: a line to work with', onLines.length>0,onLines.join());
  await p.evaluate(()=>{ LNU.win=null; LNdraw() }); await U.tap('#tabs [data-act="tab"][data-v="ark"]');   // the convoy card stays open (arkSel 'c' is kept)
  const lineTxt=(await p.innerText('#arkcard')).replace(/\s+/g,' ');
  ok('all home: the card counts the hulls on lines', new RegExp('on the lines\\s*'+onLines.length+'\\s*call home','i').test(lineTxt), lineTxt);
  await p.waitForSelector('#arkcard [data-act="allhome"]',{timeout:3000}).catch(()=>{});
  await U.tap('#arkcard [data-act="allhome"]');
  let bt=await p.innerText('#arkcard');
  ok('all home: the first press only asks', /Press again/i.test(bt)&&await p.evaluate(ids=>ids.every(i=>{ const s=shipById(LN,i); return s.from||s.pend }),onLines),bt);
  await shot('convoy-arm');
  await U.tap('#arkcard [data-act="allhome"]');
  ok('all home: the second press takes them off their lines into the convoy', await p.evaluate(ids=>ids.every(i=>{ const s=shipById(LN,i); return !s.from&&!s.pend&&!!s.reserve }),onLines));
  await shot('convoy');
  await U.closeWin().catch(()=>{}); await p.evaluate(()=>{ LNU.win=null; LNdraw() });
  await U.until(()=>p.evaluate(ids=>ids.every(i=>{ const s=shipById(LN,i); return s.mode==='idle'&&s.at==='earth' }),onLines),120,10); await U.pause();
  ok('all home: every one of them docks at Earth', await p.evaluate(ids=>ids.every(i=>{ const s=shipById(LN,i); return s.mode==='idle'&&s.at==='earth' }),onLines),JSON.stringify(await p.evaluate(ids=>ids.map(i=>{ const s=shipById(LN,i); return [i,s.mode,s.at] }),onLines)));
  await p.evaluate(()=>{ LNU.win=null; LNdraw() });

  // 5. v5.10: the last screen — the drive is there, one ring of pods, the convoy is what it is; the number that did not wake is said
  await p.evaluate(()=>{ const G=LN; G.ark={rings:1,woke:1}; G.night=G.day+1; LNdraw() });
  await U.until(()=>p.evaluate(()=>!!LN.over),200,10);
  const end=await p.evaluate(()=>({over:LN.over,b:LN.boarded,s:LN.souls,cap:LN.capsuled,cv:LN.convoy,gr:LN.grounded}));
  const share=end.cv&&end.cv.all?end.cv.have/end.cv.all:0;
  ok('end: the ark sailed; woke = floor(min(aboard, pods) x convoy share)', end.over==='night'&&!end.gr&&end.s>0&&end.s===Math.floor(Math.min(end.b,end.cap)*share+1e-9), JSON.stringify(end));
  tx=await p.innerText('.nwin');
  const flat=tx.replace(/\s+/g,' ');
  ok('end: aboard, woke at the other end, the pods and the convoy are named', /Souls aboard/i.test(flat)&&/Woke at the other end/i.test(flat)&&/Rings/i.test(flat)&&/Convoy/i.test(flat)&&/Carried along/i.test(flat), flat.slice(0,500));
  await shot('end');
  ok('no page errors', p.errs.length===0,p.errs.join(' | '));
  await b.close();
 }catch(e){ ok('crash',false,e.stack||e) }
 const fails=out.filter(l=>l.startsWith('FAIL')); console.log(out.join('\n')); console.log('pw46 '+(out.length-fails.length)+'/'+out.length+(fails.length?' FAIL':' ok')); process.exit(fails.length?1:0);
})();
