// v4.7 — Earth empties (hands decay), the crossings take crews, hulls re-crew or wait; founding party keeps hands back
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const closePf=async()=>{ for(let i=0;i<6&&await p.isVisible('#pf');i++) await tap('[data-act="pfok"]') };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await closePf() };
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{ LNU.shiftStop=false });
  // 1. hands decay
  const hr=await p.evaluate(()=>[handsRate(LN)/fedMult(LN), (LN.day=4000, handsRate(LN)/fedMult(LN)), (LN.day=0, 0)]);
  ok('hands 2.0 at year 0, 1.43 at year 4000 (v4.8)', Math.abs(hr[0]-2)<1e-9&&Math.abs(hr[1]-2/1.4)<1e-9, hr.join(' '));
  ok('resource strip shows the people trend', await p.evaluate(()=>{ LNU.tab='earth'; LNdraw(); return /people/i.test(document.querySelector('.rcell.r-people .k').textContent)&&/on earth/i.test(document.querySelector('.rcell.r-people .d').textContent) }));   // v4.13: the Earth stores block is gone
  // 2. founding party leaves EARTH_KEEP + FOUND_KEEP at home
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  const fp=await p.evaluate(id=>{ LN.earth.people=100; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); return foundParty(LN,s,id) },mine);
  ok('founding party = min(world, hold, people−35)', fp===65, fp);
  // 3. attrition on return: a courier with 8 crew loses its share over trips (debt accumulates)
  await p.evaluate(id=>{ LN.earth.people=300; LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:500,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); s.crew=8; setLine(LN,s.id,id,'earth'); setRenew(LN,id,false); window.T1=s.id },mine);
  await run(200);
  const st=await p.evaluate(()=>{ const s=shipById(LN,window.T1); return {crew:s.crew, debt:s.crewDebt, attr:LN.stats.attrition||0, lostLog:LN.log.filter(l=>l.code==='crew_lost').length} });
  ok('crew_lost logged and attrition counted', st.attr>=1&&st.lostLog>=1, JSON.stringify(st));
  ok('re-crewed from the pier (crew back to 8)', st.crew===8, st.crew);
  // 4. no hands at home: a hull below half crew waits; hands arrive → sails
  await p.evaluate(()=>{ const s=shipById(LN,window.T1); s.mode='idle'; s.at='earth'; s.t=0; s.crew=1; LN.earth.people=0; LN.earth.fuel=1000 });
  await run(3);
  ok('hull waits with crew_wait', await p.evaluate(()=>{ const s=shipById(LN,window.T1); return s.crewWait===true&&s.mode==='idle'&&LN.log.some(l=>l.code==='crew_wait') }), await p.evaluate(()=>{ const s=shipById(LN,window.T1); return s.mode+' '+s.crew+' '+s.crewWait }));
  ok('advisor a_crew', await p.evaluate(()=>advice(LN).some(a=>a.code==='a_crew')));
  await p.evaluate(()=>{ LN.earth.people=200; LN.hungry=false }); await run(2);
  ok('crew_signed and sails', await p.evaluate(()=>{ const s=shipById(LN,window.T1); return LN.log.some(l=>l.code==='crew_signed')&&s.mode==='transit'&&s.crew===8 }), await p.evaluate(()=>{ const s=shipById(LN,window.T1); return s.mode+' '+s.crew }));
  // 5. short-handed above half still sails
  await p.evaluate(()=>{ const s=shipById(LN,window.T1); s.mode='idle'; s.at='earth'; s.t=0; s.crew=5; LN.earth.people=0 });
  await run(2);
  ok('sails short-handed at 5 of 8', await p.evaluate(()=>shipById(LN,window.T1).mode==='transit'&&shipById(LN,window.T1).crew===5));
  // 6. shift report rows
  await p.evaluate(()=>{ LN.stats.attrition=(LN.stats.attrition||0)+3; LN.day=79; LNU.shiftStop=true; LNU.paused=false }); await p.evaluate(()=>{ tick(LN); LNdraw() });
  ok('report shows attrition and the hands rate', await p.evaluate(()=>{ const t=document.querySelector('#introbox').textContent; return /Hands lost on the crossings/.test(t)&&/Earth still raises/.test(t) }), await p.evaluate(()=>document.querySelector('#introbox').textContent.slice(0,300)));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  const q=await b.newPage({viewport:{width:1600,height:1000}}); q.errs=[]; q.on('pageerror',e=>q.errs.push(String(e)));
  await q.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  await q.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await q.waitForTimeout(300);
  await q.click('[data-lang="ru"]'); await q.click('[data-act="oskip"]'); await q.click('[data-act="gskip"]'); await q.waitForTimeout(150);
  await q.evaluate(()=>{ LNU.shiftStop=true; for(let i=0;i<80;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  ok('RU report row', await q.evaluate(()=>/Земля ещё даёт/.test(document.querySelector('#introbox').textContent)));
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
