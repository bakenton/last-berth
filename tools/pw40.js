// v4.33 — the last lift: every settled world shows the year a courier must leave to be home before the Night; after it the
// world is cut off (button off, a line in the log, the people stay). Real mouse, EN and RU. node pw40.js [page.html]
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const page=process.argv[2]||'long-night.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const TMP=require('os').tmpdir();
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}}); p.setDefaultTimeout(8000);
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150)};
  const closePf=async()=>{ for(let i=0;i<12;i++){ const did=await p.evaluate(()=>{ var q=function(s){var e=document.querySelector(s); return e&&e.offsetParent!==null?e:null};
      var e=q('[data-act="pfok"]')||q('[data-act="shiftok"]')||q('[data-act="nightok"]')||q('[data-act="nofreeclose"]'); if(e){ e.click(); return true } if(LN.shiftOpen){ LNU.shiftStop=false; LN.shiftOpen=false; LNdraw(); return true } return false }); if(!did) break; await p.waitForTimeout(80) } };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.over) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await closePf() };
  const rail=async()=>await p.evaluate(()=>document.getElementById('rail').textContent.replace(/\s+/g,' '));
  const show=async id=>{ await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },id); await p.waitForTimeout(120) };
  const evacState=async()=>await p.evaluate(()=>{ var e=document.querySelector('#rail [data-act="evac"]'); return e?{off:e.getAttribute('aria-disabled')==='true',why:e.getAttribute('data-why')}:null });
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/'+page); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  await p.evaluate(()=>{ LNU.pro.on=false; LNU.pro.stage=99; LNU.paused=true; var E=LN.earth; E.metal=9000; E.food=20000; E.fuel=9000; E.parts=4000; E.people=3000; LNdraw() });
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await show(mine); await tap('[data-act="colonize"]'); await run(45);
  ok('world founded', await p.evaluate(id=>!!LN.colonies[id],mine));

  // === before the Night is dated the rail says nothing about a last lift
  await show(mine);
  ok('no Night — no last-lift line', await p.evaluate(id=>lastLift(LN,id)===null,mine)&&!/Last lift/.test(await rail()));

  // === the Night is dated, far away: a quiet line with the year
  const rt=await p.evaluate(id=>{ if(!LN.night) revealNight(LN); LN.nightSeen=true; return legDays(LN,'earth',id,LN.ships.filter(s=>HULLS[s.hull].key==='courier'&&s.mode!=='dead')[0])*2 },mine);
  await closePf();
  await p.evaluate(a=>{ LN.night=LN.day+a.rt+200; LNdraw() },{rt}); await show(mine);
  const r1=await rail(), l1=await p.evaluate(id=>lastLift(LN,id),mine);
  ok('far from the deadline: "Last lift … by year Y — 200 years"', l1.st==='open'&&l1.n===200&&new RegExp('Last lift: a courier must leave by year '+l1.y+' — 200 years from now').test(r1), JSON.stringify(l1)+' '+(r1.match(/Last lift.{0,80}/)||[''])[0]);
  ok('…and the desk is silent about it', !(await p.evaluate(()=>advice(LN).some(a=>a.code==='a_lastlift'))));
  ok('evacuation is still on offer', (await evacState())&&(await evacState()).why!=='evacLate', JSON.stringify(await evacState()));

  // === inside the warning window: the line turns amber, the desk names the world
  await p.evaluate(a=>{ LN.night=LN.day+a.rt+40; LNdraw() },{rt}); await show(mine);
  const cls2=await p.evaluate(()=>{ var e=[].slice.call(document.querySelectorAll('#rail div')).filter(d=>/^Last lift:/.test(d.textContent))[0]; return e?e.className:null });
  const a2=await p.evaluate(()=>advice(LN).filter(a=>a.code==='a_lastlift')[0]||null);
  ok('40 years out: the line is a warning', cls2==='warn', cls2);
  const r2=await rail(); ok('…and the world summary carries the year', /Last lift\s*year \d+ · in 40 yrs/.test(r2), (r2.match(/Seam lasts.{0,80}/)||[''])[0]);
  ok('…and the desk has one row for the nearest world', a2&&a2.pid===mine&&a2.n===40&&a2.k===1, JSON.stringify(a2));
  await p.evaluate(()=>{ LNU.advOpen=true; LNU.leftTab='advice'; LNdraw() }); await p.waitForTimeout(150);
  const body2=await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' '));
  ok('desk row reads in English, no raw placeholders', /Last lift for .{1,30} in 40 years \(by year \d+\): after that its \d+ people stay\. Worlds closing within 80 years: 1\./.test(body2), (body2.match(/Last lift for.{0,140}/)||['(row not on screen)'])[0]);
  await p.screenshot({path:TMP+'/v433-lift-warn.png'});

  // === the deadline is missed: the button is off, the rail says who stays, the log says it once
  await p.evaluate(a=>{ LN.night=LN.day+a.rt-5; LNdraw() },{rt}); await show(mine);
  const es=await evacState(), r3=await rail(), pop=await p.evaluate(id=>Math.floor(LN.colonies[id].pop),mine);
  ok('cut off: evacuation button is off with the reason evacLate', es&&es.off&&es.why==='evacLate', JSON.stringify(es));
  ok('cut off: the rail says the people stay', new RegExp('Cut off\\. No courier would be home before the Night — the '+pop+' here stay').test(r3), (r3.match(/Cut off.{0,90}/)||[''])[0]);
  ok('cut off: the world summary says so', /Last lift\s*cut off/.test(r3), (r3.match(/Seam lasts.{0,80}/)||[''])[0]);
  await closePf(); await p.screenshot({path:TMP+'/v433-lift-top.png',clip:{x:1250,y:150,width:350,height:400}});
  await tap('#rail [data-act="evac"]');
  const t3=((await p.textContent('#toast'))||'')+' @'+await p.evaluate(()=>{ var e=document.querySelector('#rail [data-act="evac"]'), r=e.getBoundingClientRect(), h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return (h?h.tagName+'.'+h.className+'#'+h.id:'none')+' '+Math.round(r.y) });
  ok('pressing it tells why', /Too late for .{1,30}: a courier would not be home before the Night/.test(t3), t3);
  ok('the rule itself refuses (abandon → evacLate)', await p.evaluate(id=>{ var s=LN.ships.filter(s=>HULLS[s.hull].key==='courier'&&s.mode==='idle'&&s.at==='earth'&&!s.mutiny)[0]; return s?abandon(LN,s.id,id):'no free courier' },mine)==='evacLate');
  // real clock, so the journal line reaches the screen the way the player gets it
  await p.evaluate(()=>{ LNU.paused=false; LNdraw() }); let seen='';
  for(let i=0;i<30&&!/CUT OFF/.test(seen);i++){ await p.waitForTimeout(150); seen=await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' ')) }
  await p.screenshot({path:TMP+'/v433-lift-log.png'});
  await p.evaluate(()=>{ LNU.paused=true; LNdraw() }); await closePf();
  const lg=await p.evaluate(id=>({n:LN.log.filter(e=>e.code==='world_cut'&&e.d.p===id).length, still:!!LN.colonies[id], cut:!!(LN.colonies[id]&&LN.colonies[id].cut)}),mine);
  ok('the log says it once and the world stays settled', lg.n===1&&lg.still&&lg.cut, JSON.stringify(lg));
  const body3=seen;
  ok('log line on screen', /IS CUT OFF\. No courier can go out and be home before the Night\. \d+ people stay there/.test(body3), (body3.match(/.{0,30}IS CUT OFF.{0,90}/)||['(not on screen)'])[0]);
  await show(mine); await p.screenshot({path:TMP+'/v433-lift-cut.png'});

  // === RU
  await p.evaluate(()=>{ LNU.lang='ru'; LNdraw() }); await show(mine);
  const r4=await rail();
  ok('RU: «Отрезан…» on the rail, no raw placeholders', /Отрезан\. Ни один курьер не успеет вернуться до Ночи — \d+ человек остаются здесь/.test(r4)&&!/\{[a-z]\}/.test(r4), (r4.match(/Отрезан.{0,90}/)||[''])[0]);
  await p.evaluate(a=>{ LN.night=LN.day+a.rt+40; LNdraw() },{rt}); await show(mine);
  const r5=await rail();
  ok('RU: «Последний рейс…» with the year', /Последний рейс: курьер должен уйти до \d+ года — через 40 лет/.test(r5), (r5.match(/Последний рейс.{0,80}/)||[''])[0]);
  await p.screenshot({path:TMP+'/v433-lift-ru.png'});

  // === reviewer's cases (13.10): the date must be one the button can keep
  const none=await p.evaluate(a=>{ LN.night=LN.day+a.rt+200; LN.ships.forEach(s=>{ if(HULLS[s.hull].key==='courier') s.mutiny=true }); LNdraw(); return lastLift(LN,a.id) },{rt,id:mine});
  await show(mine); const r6=await rail();
  ok('every courier has mutinied, the yards still could: "none", said on the rail', none.st==='none'&&/ни один курьер не успеет/.test(r6)&&/Заложенный сейчас новый/.test(r6), JSON.stringify(none)+' '+(r6.match(/Последний рейс.{0,60}/)||[''])[0]);
  ok('…and the desk does not count it as a deadline', !(await p.evaluate(()=>advice(LN).some(a=>a.code==='a_lastlift'))));
  const re=await p.evaluate(a=>{ LN.ships.forEach(s=>{ s.mutiny=false }); LN.colonies[a.id].cut=true; tick(LN); LN.pauseNow=false; LNdraw(); return {cut:LN.colonies[a.id].cut, st:lastLift(LN,a.id).st} },{id:mine});
  await closePf();
  ok('a world that is open again loses the cut flag', re.cut===false&&re.st==='open', JSON.stringify(re));
  const home=async left=>await p.evaluate(a=>{ LN.ships.forEach(s=>{ if(HULLS[s.hull].key==='courier'&&s.mode!=='dead'){ s.mode='transit'; s.at=null; s.origin=a.id; s.dest='earth'; s.dir='in'; s.t=10; s.total=15 } }); LN.night=LN.day+a.rt+a.left; LNdraw(); return lastLift(LN,a.id) },{rt,id:mine,left});
  const h1=await home(12); await show(mine); const e1=await evacState();
  ok('couriers 10 years from home, 12 to spare: open, and the button waits for a courier (not "too late")', h1.st==='open'&&h1.n===12&&e1&&e1.off&&e1.why==='evacNoCourier', JSON.stringify(h1)+' '+JSON.stringify(e1));
  const h2=await home(5);
  ok('couriers 10 years from home, 5 to spare: nobody makes it and a new hull would not either — cut', h2.st==='cut', JSON.stringify(h2));

  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERROR '+String(e).slice(0,400)) }
fs.writeFileSync(TMP+'/pw40.out',out.join('\n')+'\n'); console.log(out.join('\n')); })();
