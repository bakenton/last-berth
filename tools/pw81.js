// pw81 — v5.44, p.17 of Nikita's v5.43 playtest (19.11): the drive programme is the empire's, not a works world's. Real mouse.
//  1  the tech tab: «Start the programme» is a click with no world chosen; before and while it runs no text names a works world
//  2  the objective card (Start Drive / Parts for Drive) names no works world either
//  3  a works world closed — evacuated, or its ring gone dark — does not stop the programme (no drive_lost, G.drive stays)
//  4  an old save with G.drive = '<world id>' loads, keeps the programme, and the programme finishes a mark
//  5  the log's drive_started / drive_mark carry no world; the toast says «Drive programme started.»
//  6  390×844: the tech tab and the card fit, no horizontal scroll
//  7  no page errors
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const path=require('path');
const SHOTS=path.join(process.env.LB_WORK||path.join(__dirname,'..','work'),'playtest','drive-r2');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const SEED=309573272;
// a works world, three more worlds, all settled with hands enough: the gate (4 worlds ever settled) and DRIVE_POP at a works
async function setup(p,U){
  await U.start('en',SEED);
  const W=await p.evaluate(()=>{ GOD.maxAll();
    const free=PLANETS.filter(x=>!LN.colonies[x.id]&&x.sec<=1).sort((a,b)=>a.dist-b.dist);
    const works=free.filter(x=>x.kind==='works')[0], others=free.filter(x=>x.kind!=='works').slice(0,3);
    const ids=[works.id].concat(others.map(x=>x.id));
    ids.forEach(k=>{ LNU.win=k; GOD.settle(); LNU.win=null });
    return {works:works.id, name:works.name.toUpperCase(), ids} });
  const N=await p.evaluate(W=>{ for(let i=0;i<4000&&!W.ids.every(k=>LN.colonies[k]);i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    W.ids.forEach(k=>{ if(LN.colonies[k]) LN.colonies[k].pop=Math.max(LN.colonies[k].pop,K.DRIVE_POP+15) });
    LN.earth.parts=20; LN.earth.metal=LN.earth.food=LN.earth.fuel=50000; LN.earth.people=Math.max(LN.earth.people,3000);
    LNU.notes=[]; LNU.win=null; LNdraw();
    return {have:W.ids.filter(k=>LN.colonies[k]).length, settled:settledCount(LN), need:driveReachFor(LN), lvl:LN.driveLvl||0} },W);
  await U.clear();
  return Object.assign(W,N) }
const openTech=async(p,U)=>{ await U.clear(); if(await p.evaluate(()=>LNU.tab!=='tech')) await U.tab('tech'); await p.waitForTimeout(250) };
const sideText=p=>p.evaluate(()=>{ const s=document.querySelector('#side'); return s?s.innerText.replace(/\s+/g,' '):'' });
const cardText=p=>p.evaluate(()=>{ const s=document.querySelector('#cards'); return s?s.innerText.replace(/\s+/g,' '):'' });
(async()=>{ try{
  require('fs').mkdirSync(SHOTS,{recursive:true});
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const W=await setup(p,U);
  ok('0: set-up — four worlds settled, a works with hands enough', W.have===4&&W.settled>=W.need&&W.lvl===0, JSON.stringify(W));
  // 1/2 — before
  await openTech(p,U);
  const t0=await sideText(p), c0=await cardText(p);
  const btn0=await p.evaluate(()=>{ const e=document.querySelector('#side [data-act="drive"]'); return e?{t:e.innerText,why:e.dataset.why||'',dis:e.disabled||e.classList.contains('off')}:null });
  await p.screenshot({path:SHOTS+'/drive-before-1440.png'});
  ok('1: the button is there and is not refused (no world to choose)', btn0&&!btn0.why&&/Start the programme/i.test(btn0.t), JSON.stringify(btn0));
  ok('1: no text on the tech tab names the works world (before)', t0.indexOf(W.name)<0&&!/\bat\s+[A-Z]{3,}/.test(t0.replace(/Settled worlds|AT\b/g,'')), t0.slice(0,200));
  ok('2: the objective card row «Start Drive II» names no world — «The Tech tab» under it (before)', /START DRIVE II The Tech tab/i.test(c0)&&!/START DRIVE II[^|]*·\s*ring/i.test(c0), c0.slice(0,260));
  await p.screenshot({path:SHOTS+'/card-before-1440.png',clip:await p.evaluate(()=>{ const e=document.querySelector('#cards'); const r=e.getBoundingClientRect(); return {x:Math.max(0,r.left-8),y:Math.max(0,r.top-8),width:Math.min(innerWidth-Math.max(0,r.left-8),r.width+16),height:Math.min(innerHeight-Math.max(0,r.top-8),r.height+16)} })});
  // start by a real click — no world is chosen
  const log0=await p.evaluate(()=>LN.log.length);
  await U.tap('#side [data-act="drive"]'); await p.waitForTimeout(300);
  const R=await p.evaluate(log0=>({drive:LN.drive, work:LN.driveWork, lvl:LN.driveLvl||0,
    ev:LN.log.slice(log0).filter(e=>e.code==='drive_started'||e.code==='drive_mark').map(e=>({code:e.code,d:e.d})),
    toast:[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent).join('|')}),log0);
  ok('1: the click starts the programme: G.drive is a flag, not a world', R.drive===1&&!(typeof R.drive==='string'), JSON.stringify(R));
  ok('5: drive_started carries no world; the toast says «Drive programme started.»', R.ev.some(e=>e.code==='drive_started'&&e.d&&e.d.p===undefined)&&/Drive programme started\./.test(R.toast), JSON.stringify(R));
  await p.evaluate(()=>{ LNU.notes=[]; LNdraw() }); await openTech(p,U);
  const t1=await sideText(p), c1=await cardText(p);
  await p.screenshot({path:SHOTS+'/drive-running-1440.png'});
  ok('1: no text on the tech tab names the works world (running); the strip says the programme runs', t1.indexOf(W.name)<0&&/programme running/i.test(t1)&&!/Start the programme/i.test(t1), t1.slice(0,220));
  const O=await p.evaluate(()=>objectives(LN).now.filter(o=>/^o_(parts|drive)$/.test(o.code)));
  ok('2: the objective is «Parts for Drive» with no world on it (core)', O.length===1&&O[0].code==='o_parts'&&O[0].p===undefined, JSON.stringify(O));
  ok('2: the card row «Parts for Drive II» is a count with no world under it (running)', /PARTS FOR DRIVE II \d+ \/ \d+/i.test(c1)&&!/PARTS FOR DRIVE II[^|]*·\s*ring/i.test(c1), c1.slice(0,260));
  await p.screenshot({path:SHOTS+'/card-running-1440.png',clip:await p.evaluate(()=>{ const e=document.querySelector('#cards'); const r=e.getBoundingClientRect(); return {x:Math.max(0,r.left-8),y:Math.max(0,r.top-8),width:Math.min(innerWidth-Math.max(0,r.left-8),r.width+16),height:Math.min(innerHeight-Math.max(0,r.top-8),r.height+16)} })});
  // 3 — the works world is evacuated: the programme stays
  const ev=await p.evaluate(W=>{ const c=Object.keys(LN.colonies).length;
    const hull=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&HULLS[s.hull].key==='courier')||LN.ships.find(s=>s.mode==='idle'&&s.at==='earth');
    const r=hull?abandon(LN,hull.id,W.works):'nohull'; return {r,c} },W);
  const gone=await p.evaluate(W=>{ for(let i=0;i<3000&&LN.colonies[W.works];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } return {gone:!LN.colonies[W.works], drive:LN.drive, lost:LN.log.some(e=>e.code==='drive_lost'), lvl:LN.driveLvl||0, work:LN.driveWork} },W);
  ok('3: the works world is evacuated and the programme is still running (no drive_lost)', ev.r==='ok'&&gone.gone&&(gone.drive===1||gone.lvl>0)&&!gone.lost, JSON.stringify({ev,gone}));
  // 3b — its ring goes dark
  const W2=await setup(p,U);
  await openTech(p,U); await U.tap('#side [data-act="drive"]'); await p.waitForTimeout(250);
  const dk=await p.evaluate(W=>{ const sec=planet(W.works).sec; const before=LN.drive; LN.door={at:LN.day,dark:{},out:{}}; ringDark(LN,sec); tick(LN); return {before,after:LN.drive,gone:!LN.colonies[W.works],lost:LN.log.some(e=>e.code==='drive_lost')} },W2);
  ok('3: a ring gone dark takes the works world and not the programme', dk.before===1&&dk.after===1&&dk.gone&&!dk.lost, JSON.stringify(dk));
  // 4 — an old save
  const W3=await setup(p,U);
  const sv=await p.evaluate(W=>{ LN.drive=W.works; LN.driveWork=30; LN.earth.parts=0; const t=LNsave(); return t },W3);
  const ld=await p.evaluate(t=>{ LNload(t); return {drive:LN.drive, work:LN.driveWork} },sv);
  ok('4: an old save (G.drive = a world id) loads with the programme running', ld.drive===1&&ld.work===30, JSON.stringify(ld));
  await openTech(p,U);
  const t4=await sideText(p);
  ok('4: the tech tab of the old save says the programme runs, offers no second start', /programme running/i.test(t4)&&!/Start the programme/i.test(t4), t4.slice(0,200));
  const fin=await p.evaluate(()=>{ LN.hackGate=false; LN.driveWork=driveWorkFor(LN)-1; const w=Object.keys(LN.colonies).filter(k=>planet(k).kind==='works')[0]; LN.colonies[w].store.metal=5000; LN.colonies[w].store.food=5000;
    for(let i=0;i<400&&!(LN.driveLvl>=1);i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    const m=LN.log.filter(e=>e.code==='drive_mark')[0]; return {lvl:LN.driveLvl||0,drive:LN.drive,m:m&&m.d} });
  ok('4: the old save’s programme finishes the mark; drive_mark carries no world', fin.lvl===1&&!fin.drive&&fin.m&&fin.m.p===undefined, JSON.stringify(fin));
  // 6 — the phone
  const q=await UI.newPage(b,{vp:{width:390,height:844}}); const V=UI.ui(q);
  const W4=await setup(q,V);
  await openTech(q,V);
  const ph0=await q.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,t:document.querySelector('#side').innerText.replace(/\s+/g,' ')}));
  await q.screenshot({path:SHOTS+'/drive-before-390.png'});
  await V.tap('#side [data-act="drive"]'); await q.waitForTimeout(300); await q.evaluate(()=>{ LNU.notes=[]; LNdraw() }); await openTech(q,V);
  const ph1=await q.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,t:document.querySelector('#side').innerText.replace(/\s+/g,' '),drive:LN.drive}));
  await q.screenshot({path:SHOTS+'/drive-running-390.png'});
  ok('6: 390 px, before — no horizontal scroll and no works world named', ph0.sw<=ph0.iw&&ph0.t.indexOf(W4.name)<0, JSON.stringify({sw:ph0.sw,iw:ph0.iw}));
  ok('6: 390 px, running — started by a click, no horizontal scroll, no works world named', ph1.drive===1&&ph1.sw<=ph1.iw&&ph1.t.indexOf(W4.name)<0&&/programme running/i.test(ph1.t), JSON.stringify({sw:ph1.sw,iw:ph1.iw,drive:ph1.drive}));
  await V.clear(); const cardOk=await q.evaluate(()=>{ const e=document.querySelector('#cards'); return e?{t:e.innerText.replace(/\s+/g,' '),sw:document.documentElement.scrollWidth,iw:innerWidth}:null });
  await q.evaluate(()=>{ LNU.win=null; LNU.tab=null; LNdraw() }); await q.screenshot({path:SHOTS+'/card-running-390.png'});
  ok('6: 390 px, the card fits; its drive row is a count with no world', cardOk&&cardOk.sw<=cardOk.iw&&/PARTS FOR DRIVE II \d+ \/ \d+/i.test(cardOk.t)&&!/PARTS FOR DRIVE II[^|]*·\s*ring/i.test(cardOk.t), JSON.stringify(cardOk).slice(0,240));
  ok('7: no page errors', !p.errs.length&&!q.errs.length, p.errs.concat(q.errs).join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
