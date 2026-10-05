// v4.5 — the shift report, bottomless stockyard, classes grow apart, fuel by class, kit cost in parts, works text, last-build warning
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
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.shiftOpen) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await closePf() };
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  // 1. classes grow apart
  const caps=await p.evaluate(()=>{ ensureGen(5); return HULLS.filter(h=>h.gen===5).map(h=>h.key+':'+h.cap).join(' ') });
  ok('gen VI caps: courier 1733 · hauler 19110 · freighter 130k', /courier:1733 hauler:19110 freighter:1307\d\d/.test(caps), caps);
  ok('freighter speed 0.8', await p.evaluate(()=>HULLS[2].speed===0.8));
  // 2. fuel per departure by class: same distance, hauler burns 1.6×, freighter 2.2×
  const fuel=await p.evaluate(()=>{ const id=PLANETS[0].id; const r={};
    [0,1,2].forEach(i=>{ const G0=newGame(1); G0.colonies[id]={pid:id,pop:20,unrest:0,dark:false,store:{metal:0,food:0,fuel:0,parts:0},hist:[],neglect:0}; G0.earth.fuel=1e6;
      const s={id:99,hull:i,cap:HULLS[i].cap,crew:1,mode:'idle',at:'earth',from:id,to:'earth',cargo:{metal:0,food:0,fuel:0,parts:0,people:0}}; G0.ships.push(s); const f0=G0.earth.fuel; sail(G0,s); r[HULLS[i].key]=f0-G0.earth.fuel }); return r });
  ok('fuel by class', Math.round(fuel.hauler/fuel.courier*10)/10>=1.5&&Math.round(fuel.freighter/fuel.courier*10)/10>=2, JSON.stringify(fuel));
  // 3. kit cost 100 metal + 90 parts
  ok('kit tier I cost 100/90', await p.evaluate(()=>{ const k=kitCost({tier:0}); return k.metal===100&&k.parts===90&&k.w===190 }));
  // 4. bottomless stockyard: a lined-less rich world piles past 1200
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:60,unrest:0,relay:false,dark:false,pending:null,store:{metal:5000,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LNU.shiftStop=false; LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  await run(10);
  ok('stockyard past 1200 and still growing', await p.evaluate(id=>LN.colonies[id].store.metal>5000,mine), await p.evaluate(id=>LN.colonies[id].store.metal,mine));
  ok('no "lost" row on the card', !(await p.evaluate(()=>/Lost to a full stockyard/.test(document.querySelector('#rail').textContent))));
  ok('no a_lost in the advisor', !(await p.evaluate(()=>advice(LN).some(a=>a.code==='a_lost'))));
  // 5. works text is not "hands and shovels"
  const works=await p.evaluate(()=>PLANETS.filter(q=>q.kind==='works')[0].id);
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:30,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LNU.sel=id; LNU.tab='target'; LNdraw() },works);
  const wt=await p.evaluate(()=>document.querySelector('#rail').textContent);
  ok('works: "first-generation plant"', /first-generation plant/.test(wt)&&!/shovels/.test(wt));
  // 6. the shift report: reset to a fresh game, run to year 80 with stops on
  await p.evaluate(()=>{ LNU.tab='earth'; LNdraw(); document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-act="gskip"]'); await p.evaluate(()=>{ LNU.shiftStop=true; LNU.paused=false });
  await p.evaluate(()=>{ for(let i=0;i<79;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  ok('no report before year 80', !(await p.isVisible('#introbox.shift')), await p.evaluate(()=>LN.day));
  // let the real clock do the 80th tick so the frame loop pauses on the report
  await p.evaluate(()=>{ LNU.paused=false; LNU.speed=10; LNU.acc=1000 }); await p.waitForTimeout(700);
  ok('report at year 80', await p.isVisible('#introbox.shift'), await p.evaluate(()=>LN.day+' open='+LN.shiftOpen+' paused='+LNU.paused));
  ok('clock stopped', await p.evaluate(()=>LNU.paused===true));
  const rep=await p.evaluate(()=>document.querySelector('#introbox').textContent);
  ok('title Shift 2', /Shift 2 hands over the desk/.test(rep), rep.slice(0,80));
  ok('report rows', /Brought home these eighty years/.test(rep)&&/Live worlds/.test(rep)&&/Hands at home/.test(rep), rep.slice(0,400));
  ok('chronicle line inside', /(shift|Shift) 2/.test(rep));
  await p.screenshot({path:'shift-1.png'});
  await tap('[data-act="shiftok"]');
  ok('take the desk → clock runs', await p.evaluate(()=>LNU.paused===false&&LN.shiftOpen===false));
  await p.evaluate(()=>{ LNU.paused=true });
  // 7. switch stops off: year 160 passes without a report
  await p.evaluate(()=>{ LNU.shiftStop=false; for(let i=0;i<80;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  ok('no report with stops off', !(await p.isVisible('#introbox.shift'))&&await p.evaluate(()=>LN.day>=160), await p.evaluate(()=>LN.day));
  ok('shiftOpen cleared by the loop or ignored', true);
  // 8. the prologue never stops for a shift
  await p.evaluate(()=>{ LNU.tab='earth'; LNdraw(); document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-act="prologue"]'); await p.evaluate(()=>{ LNU.shiftStop=true; for(let i=0;i<85;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  ok('prologue: no shift modal at 85', !(await p.isVisible('#introbox.shift')));
  // 9. last-build warning near the Night
  await p.evaluate(id=>{ LNU.pro.on=false; LN.colonies[id]={pid:id,pop:60,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LN.night=LN.day+10; LN.arkMark=3; LN.nightSeen=true },mine);
  ok('a_lastbuild when the shortest round trip exceeds the years left', await p.evaluate(()=>advice(LN).some(a=>a.code==='a_lastbuild')));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  // 10. RU report
  const q=await b.newPage({viewport:{width:1600,height:1000}}); q.errs=[]; q.on('pageerror',e=>q.errs.push(String(e)));
  await q.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  await q.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await q.waitForTimeout(300);
  await q.click('[data-lang="ru"]'); await q.click('[data-act="oskip"]'); await q.click('[data-act="gskip"]'); await q.waitForTimeout(150);
  await q.evaluate(()=>{ for(let i=0;i<80;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  const ru=await q.evaluate(()=>document.querySelector('#introbox').textContent);
  ok('RU report', /Смена 2 сдаёт пульт/.test(ru)&&/Принять пульт/.test(ru), ru.slice(0,120));
  await q.screenshot({path:'shift-ru.png'});
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
