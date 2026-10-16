// v4.7 — Earth empties (hands decay), the crossings take crews, hulls re-crew or wait; founding party keeps hands back
// v4.35: полоса ресурсов — #res .rc[data-r="people"]; отчёт смены — #noteL (#shiftwin); судно — LN-проверки и окно мира
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await U.clear() };
  await U.start('en',309573272);
  // 1. hands decay
  const hr=await p.evaluate(()=>[handsRate(LN)/fedMult(LN), (LN.day=4000, handsRate(LN)/fedMult(LN)), (LN.day=0, 0)]);
  ok('hands 2.0 at year 0, 1.43 at year 4000 (v4.8)', Math.abs(hr[0]-2)<1e-9&&Math.abs(hr[1]-2/1.4)<1e-9, hr.join(' '));
  ok('resource strip shows the people trend', await p.evaluate(()=>{ const e=document.querySelector('#res .rc[data-r="people"]'); return !!e&&/PEOPLE/i.test(e.textContent)&&/\d/.test(e.textContent) }), await p.evaluate(()=>(document.querySelector('#res .rc[data-r="people"]')||{textContent:'none'}).textContent.replace(/\s+/g,' ')));
  // 2. founding party leaves EARTH_KEEP + FOUND_KEEP at home
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  const fp=await p.evaluate(id=>{ LN.earth.people=100; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); return foundParty(LN,s,id) },mine);
  ok('founding party = min(world, hold, people−35)', fp===65, fp);
  // 3. attrition on return: a courier with 8 crew loses its share over trips (debt accumulates)
  await p.evaluate(id=>{ LN.earth.people=300; LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:500,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); s.crew=8; window.T1=s.id; setLine(LN,s.id,id,'earth'); LNdraw() },mine);
  await run(200);
  const st=await p.evaluate(()=>{ const s=shipById(LN,window.T1); return {crew:s.crew, debt:s.crewDebt, attr:LN.stats.attrition||0, lostLog:LN.log.filter(l=>l.code==='crew_lost').length} });
  ok('crew_lost logged and attrition counted', st.attr>=1&&st.lostLog>=1, JSON.stringify(st));
  ok('re-crewed from the pier (crew back to 8)', st.crew===8, st.crew);
  // 4. no hands at home: a hull below half crew waits; hands arrive → sails
  await p.evaluate(()=>{ const s=shipById(LN,window.T1); s.mode='idle'; s.at='earth'; s.t=0; s.crew=1; LN.earth.people=0; LN.earth.fuel=1000 });
  await run(3);
  ok('hull waits with crew_wait', await p.evaluate(()=>{ const s=shipById(LN,window.T1); return s.crewWait===true&&s.mode==='idle'&&LN.log.some(l=>l.code==='crew_wait') }), await p.evaluate(()=>{ const s=shipById(LN,window.T1); return s.mode+' '+s.crewWait }));
  // v4.35: советник — только миры (Nikita 15.10): строки о судах (a_crew) больше не там; проверка правила вместо кода
  ok('advisor lists worlds only (Nikita 15.10): no hull row for the crew', await p.evaluate(()=>LNI.adv().every(r=>!!planet(r[3]))), JSON.stringify(await p.evaluate(()=>LNI.adv().map(r=>r[1]))));
  await p.evaluate(()=>{ LN.earth.people=200; LN.hungry=false }); await run(2);
  ok('crew_signed and sails', await p.evaluate(()=>{ const s=shipById(LN,window.T1); return LN.log.some(l=>l.code==='crew_signed')&&s.mode==='transit'&&s.crew===8 }), await p.evaluate(()=>{ const s=shipById(LN,window.T1); return s.mode+' '+s.crew }));
  // 5. short-handed above half still sails
  await p.evaluate(()=>{ const s=shipById(LN,window.T1); s.mode='idle'; s.at='earth'; s.t=0; s.crew=5; LN.earth.people=0 });
  await run(2);
  ok('sails short-handed at 5 of 8', await p.evaluate(()=>shipById(LN,window.T1).mode==='transit'&&shipById(LN,window.T1).crew===5));
  // 6. shift report rows
  await p.evaluate(()=>{ LN.stats.attrition=(LN.stats.attrition||0)+3; LN.day=79; LNU.shiftStop=true; LNU.paused=false }); await p.evaluate(()=>{ tick(LN); LNdraw() });
  ok('report shows attrition and the hands rate', await p.evaluate(()=>{ const t=document.getElementById('noteL').textContent; return /Hands lost on the crossings/.test(t)&&/Earth still raises/.test(t) }), await p.evaluate(()=>document.getElementById('noteL').textContent.replace(/\s+/g,' ').slice(0,300)));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  const q=await UI.newPage(b); const V=UI.ui(q); await V.start('ru',309573272);
  await q.evaluate(()=>{ LNU.shiftStop=true; for(let i=0;i<80;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  ok('RU report row', await q.evaluate(()=>/Земля ещё даёт/.test(document.getElementById('noteL').textContent)));
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
