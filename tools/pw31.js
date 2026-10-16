// v4.11 — dead seam keeps carrying the pile; hulls stand down only on an empty surface; pile numbers; unsettled world; save button; constants in the log
// v4.35: мир — окно мира (#ovl), подпись «неосвоенный» — маркер карты (#map .wd); сохранение — меню ≡ → Export → #logbox [data-act="savelog"]
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const showWorld=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await U.clear() };
  await U.start('en',309573272);
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  // 1. unsettled world: the window shows the people cap only, no count of people and no rate
  await showWorld(mine);
  const un=await win();
  ok('unsettled: no × or % and no people count before anyone lands (v4.21)', !/×|%/.test(un)&&!/People\s*\d/.test(un), un.slice(0,200));
  // 2. dead seam with a pile: line keeps running, orders allowed while the pile remains, hulls stand down only when the surface is empty
  await p.evaluate(id=>{ LN.earth.people=300; LN.earth.fuel=5000; LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:200,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); setLine(LN,s.id,id,'earth'); window.T1=s.id; LN.reserves[id]=3; LNdraw() },mine);
  await run(3);
  ok('line survives depletion while the pile remains (the hull is still on the line, s.from)', await p.evaluate(id=>shipById(LN,window.T1).from===id,mine));
  ok('order allowed while the pile remains: orderFor is not refused as depleted (v4.14)', await p.evaluate(id=>{ LN.earth.metal=1e5; LN.earth.parts=1e4; LN.earth.fuel=1e5; LN.earth.people=500; return orderFor(LN,id,'courier')==='ok' },mine));
  ok('the ordered hull is laid down for the dead seam (on the line while building)', await p.evaluate(id=>onLine(LN,id).some(s=>s.mode==='building'),mine));
  await run(200);
  const st=await p.evaluate(id=>{ const s=shipById(LN,window.T1); return {pile:Math.floor(LN.colonies[id].store.metal), res:LN.reserves[id], mode:s.mode, from:s.from, nl:LN.log.some(l=>l.code==='nothing_left'&&l.d.p===id), seamEv:LN.log.some(l=>/^ev_/.test(l.code)&&l.d.p===id)} },mine);
  ok('pile carried out to zero, then the hull stood down (or a seam event revived the world)', (st.pile<1&&st.nl&&st.mode==='idle'&&!st.from)||(st.seamEv&&st.res>0), JSON.stringify(st));
  ok('orderFor refused once the pile is gone (unless revived) (v4.34: setWant -> orderFor)', await p.evaluate(id=>(LN.reserves[id]>0)||orderFor(LN,id,'courier')==='depleted',mine));
  // 3. pile numbers and per-trip share in the window (v4.18: the numbers, no bar)
  const mine2=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[1].id);
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:700,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LN.earth.metal=2000; LNdraw() },mine2);
  await showWorld(mine2);
  let w=await win();
  ok('on the surface shows the pile (700)', /On the surface\s*700/.test(w), w.slice(0,200));
  ok('no pile bar elements (v4.22)', await p.evaluate(()=>!document.querySelector('.pile-fill')&&!document.querySelector('.pile-take')&&!document.querySelector('.pile-bar')));
  await p.evaluate(id=>{ const s=LN.ships.find(o=>o.mode==='idle'&&o.at==='earth'&&!(o.from&&o.to)); LNU.pickShip=s.id; LNdraw() },mine2);
  await showWorld(mine2);
  ok('the free hull is offered with its hold (70)', /70/.test(await win()), (await win()).slice(0,160));
  await p.evaluate(id=>{ setLine(LN,LNU.pickShip,id,'earth'); LNU.pickShip=null; LNdraw() },mine2);
  await showWorld(mine2);
  ok('the line is set by hand (assign went through the core)', await p.evaluate(id=>LN.ships.some(s=>s.from===id),mine2));
  // 4. save as file: menu → Export → log box → Save
  await U.tap('[data-act="pop"][data-v="menu"]');
  await U.tap('[data-act="export"]');
  const dlP=p.waitForEvent('download',{timeout:5000}).catch(()=>null);
  await U.tap('#logbox [data-act="savelog"]');
  const dl=await dlP;
  ok('download offered with a .json name', !!dl&&/last-berth-\d+-\d+\.json/.test(dl.suggestedFilename()), dl?dl.suggestedFilename():'none');
  if(dl){ const path=await dl.path(); const J=JSON.parse(fs.readFileSync(path,'utf8')); ok('saved JSON has constants and a version string', /^4\.[1-9]\d$/.test(J.v)&&J.constants&&J.constants.KIT_METAL===100) }
  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
