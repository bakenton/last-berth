// pw75 — v5.42 (Никита 17.11: «игра учит всему что мы добавили?» → «Да, делай одним куском»): помощник говорит о том, что пришло после
//     v5.33 — по одному разу, в первый раз, когда это есть: знак редкой находки на карте (mRare), выработанный мир под хаб (mGhost), приказы смены
//     (mOrd), дверь за последним кольцом (mDoor), кольца гаснут (mDark). Каждая подсказка указывает на свою вещь и закрывается GOT IT мышью.
// Состояние готовится через ядро; помощник включён (start с tut:true), шаги обучения пройдены хуком. Снимки: PW75_SHOTS=<папка>.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW75_SHOTS||null, FILE=process.env.PW75_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);   // the scenarios' start mutes the helper; it is turned back on below (help) with its steps passed
  // the helper on, its twelve steps behind: everything open, nothing in the queue
  await p.evaluate(()=>{ const t=LNU.tut; t.help=true; t.lock=false; t.step=11; t.q=[]; t.msg=null; t.nar=null; ['m18','m28','m19','m7','mH','m27','m20','m21','m22','m24','m23','m13','m25','m26','mX','N03','m12','N07','m17'].forEach(k=>t.seen[k]=1);
    LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; LNU.paused=true; LNU.notes=[]; LNU.win=null; LNU.tab=null; LNdraw() });
  const wait=async id=>{ for(let i=0;i<40;i++){ const m=await p.evaluate(()=>{ LNU.notes=[]; LNdraw(); const t=LNI.tut(); return {msg:t.msg,tx:(document.querySelector('#helper .htx')||{}).textContent||''} }); if(m.msg===id) return m; await p.waitForTimeout(120) } return await p.evaluate(()=>({msg:LNI.tut().msg,q:LNU.tut.q.map(x=>x.id)})) };
  const gotIt=async()=>{ await p.waitForTimeout(350); await U.tap('#helper [data-act="tutok"]').catch(()=>{}); await p.waitForTimeout(200) };
  const ring=()=>p.evaluate(()=>{ const r=document.getElementById('tutRing'); return !!r&&r.getClientRects().length>0 });
  // mRare: a rare find's sign on the chart
  const hasSign=await p.evaluate(()=>!!document.querySelector('#map .rsign'));
  let m=await wait('mRare'); await shot('t1-mRare');
  ok('mRare: a rare sign on the chart — the helper names it (dock, survivors, an engine core)', hasSign&&m.msg==='mRare'&&/something rare/i.test(m.tx||'')&&await ring(), JSON.stringify(m));
  await gotIt();
  // mGhost: a worked-out world while a hub can be had
  await p.evaluate(()=>{ LN.driveLvl=1; LN.gen=1; ensureGen(1); const w=PLANETS.filter(q=>q.sec===0&&q.kind!=='works')[0]; LN.ghost[w.id]=LN.day||1; LN.reserves[w.id]=0; (LN.settled=LN.settled||{})[w.id]=1; LNdraw() });
  m=await wait('mGhost'); await shot('t2-mGhost'); const gd=await p.evaluate(()=>({cap:hubCap(LN),gh:Object.keys(LN.ghost),el:document.querySelectorAll('#map .wd.gh').length,win:LNU.win,tab:LNU.tab,step:LNU.tut.step,help:LNU.tut.help,seen:!!LNU.tut.seen.mGhost,big:LNI.big(),msg:LNU.tut.msg,nar:!!LNU.tut.nar}));
  ok('mGhost: a worked-out world — press it to found a hub', m.msg==='mGhost'&&/found a hub/i.test(m.tx||'')&&await ring(), JSON.stringify({m,gd}));
  await gotIt();
  // mOrd: the orders on offer
  await p.evaluate(()=>{ LN.orders={offer:[{k:'kit',n:1,rw:{people:40}},{k:'hulls',c:'courier',n:2,rw:{hull:'courier'}}],on:null}; LNdraw() });
  m=await wait('mOrd'); await shot('t3-mOrd');
  const qw=await p.evaluate(()=>LNU.win);
  ok('mOrd: the orders of the shift — the journal opens on them', m.msg==='mOrd'&&/take one of the two/i.test(m.tx||'')&&qw==='goals'&&await ring(), JSON.stringify({m,qw}));
  await gotIt(); await p.evaluate(()=>{ LNU.win=null; LN.orders={offer:[],on:null}; LNdraw() });
  // mDoor: the door on the chart
  await p.evaluate(()=>{ GOD.maxAll(); LN.driveLvl=5; LN.gen=5; ensureGen(5); while(SECTORS.length<K.RING_LAST) openSector(LN); for(let i=0;i<2;i++){ tick(LN); LN.pauseNow=false } LN.nightSeen=true; LNU.notes=[]; LNdraw() });
  await p.waitForTimeout(300);
  await U.clear(); m=await wait('mDoor'); await shot('t4-mDoor');
  ok('mDoor: the door past the last ring', m.msg==='mDoor'&&/only the door/i.test(m.tx||'')&&await ring(), JSON.stringify(m));
  await gotIt();
  // mDark: after the door
  await p.evaluate(()=>{ openDoor(LN); LNU.pf=null; LNdraw() }); await U.clear();
  m=await wait('mDark'); await shot('t5-mDark');
  ok('mDark: the rings go dark — the ring names say when', m.msg==='mDark'&&/go(es)? dark/i.test(m.tx||'')&&await ring(), JSON.stringify(m));
  await gotIt();
  const again=await p.evaluate(()=>{ for(let i=0;i<5;i++) LNdraw(); return LNI.tut().msg });
  ok('each is told once', !again, again);
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
