// v4.33 — the last lift: every settled world shows the year a courier must leave to be home before the Night; after it the
// world is cut off (button off, a line in the log, the people stay). Real mouse, EN and RU.
// v4.35: мир — окно мира (#ovl: строка «Last lift», кнопка [data-act="evac"]); советник — LNI.adv() (только миры); тосты — #toasts.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const TMP=require('os').tmpdir();
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const toasts=()=>p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent.replace(/\s+/g,' ')).join(' | '));
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.over) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await U.clear() };
  const show=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  const evacState=async()=>await p.evaluate(()=>{ var e=document.querySelector('#ovl [data-act="evac"]'); return e?{off:e.getAttribute('aria-disabled')==='true',why:e.getAttribute('data-why')}:null });
  const advMine=async id=>p.evaluate(id=>LNI.adv().filter(r=>r[3]===id).map(r=>r[1]+' | '+r[2]).join(' || '),id);
  await U.start('en',309573272);
  await p.evaluate(()=>{ var E=LN.earth; E.metal=9000; E.food=20000; E.fuel=9000; E.parts=4000; E.people=3000; LNdraw() });
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await show(mine); await U.tap('#ovl [data-act="send"][data-p="'+mine+'"]'); await run(45);
  ok('world founded', await p.evaluate(id=>!!LN.colonies[id],mine));

  // === before the Night is dated the window says nothing about a last lift
  await show(mine);
  ok('no Night — no last-lift line', await p.evaluate(id=>lastLift(LN,id)===null,mine)&&!/Last lift/.test(await win()));

  // === the Night is dated, far away: a quiet line with the year
  const rt=await p.evaluate(id=>{ if(!LN.night) revealNight(LN); LN.nightSeen=true; return legDays(LN,'earth',id,LN.ships.filter(s=>HULLS[s.hull].key==='courier'&&s.mode!=='dead')[0])*2 },mine);
  await U.clear();
  await p.evaluate(a=>{ LN.night=LN.day+a.rt+200; LNdraw() },{rt}); await show(mine);
  const w1=await win(), l1=await p.evaluate(id=>lastLift(LN,id),mine);
  ok('far from the deadline: "Last lift … by year Y — 200 years"', l1.st==='open'&&l1.n===200&&new RegExp('Last lift[^A-Za-z]{0,5}(by year|year)? ?'+l1.y+'[^]{0,20}200 years').test(w1), JSON.stringify(l1)+' '+(w1.match(/Last lift.{0,80}/)||[''])[0]);
  ok('…and the advisor is silent about it (worlds rows only, no last-lift row by code)', !(await advMine(mine)).match(/[Ll]ast lift/), await advMine(mine));
  ok('evacuation is still on offer', (await evacState())&&(await evacState()).why!=='evacLate', JSON.stringify(await evacState()));

  // === inside the warning window: the desk names the world
  await p.evaluate(a=>{ LN.night=LN.day+a.rt+40; LNdraw() },{rt}); await show(mine);
  const a2=await p.evaluate(id=>LNI.adv().filter(r=>r[3]===id)[0]||null,mine);
  const w2=await win();
  ok('40 years out: the window names the last lift year, 40 years', /Last lift\s*\d+ · 40 years/.test(w2), (w2.match(/Last lift.{0,80}|.{0,40}40 years.{0,20}/)||[''])[0]);
  ok('…and the advisor has one row for the nearest world (last lift, 40 years)', !!a2&&a2[3]===mine, JSON.stringify(a2));
  ok('the advisor row reads in English, no raw placeholders', !!a2&&!/\{[a-z]\}/.test(a2[1]+a2[2])&&/40/.test(a2[1]+a2[2]), JSON.stringify(a2));
  await p.screenshot({path:TMP+'/v433-lift-warn.png'});

  // === the deadline is missed: the button is off, the window says who stays, the log says it once
  await p.evaluate(a=>{ LN.night=LN.day+a.rt-5; LNdraw() },{rt}); await show(mine);
  const es=await evacState(), w3=await win(), pop=await p.evaluate(id=>Math.floor(LN.colonies[id].pop),mine);
  ok('cut off: evacuation button is off with the reason evacLate', es&&es.off&&es.why==='evacLate', JSON.stringify(es));
  ok('cut off: the window says the people stay', new RegExp(pop+' (here )?(stay|people)|stay').test(w3)||/cut off/i.test(w3), (w3.match(/.{0,60}(cut off|stay).{0,60}/i)||[''])[0]);
  await U.tap('#ovl [data-act="evac"]');
  const t3=await toasts();
  ok('pressing it tells why', /Too late for .{1,30}: a courier would not be home before the Night/.test(t3), t3.slice(0,200));
  ok('the rule itself refuses (abandon → evacLate)', await p.evaluate(id=>{ var s=LN.ships.filter(s=>HULLS[s.hull].key==='courier'&&s.mode==='idle'&&s.at==='earth'&&!s.mutiny)[0]; return s?abandon(LN,s.id,id):'no free courier' },mine)==='evacLate');
  await p.evaluate(()=>{ LNU.paused=false; LNdraw() }); let seen='';
  for(let i=0;i<30&&!/CUT OFF|cut off/i.test(seen);i++){ await p.waitForTimeout(150); seen=await toasts()+' '+await p.evaluate(()=>document.getElementById('noteL').textContent) }
  await p.evaluate(()=>{ LNU.paused=true; LNdraw() }); await U.clear();
  const lg=await p.evaluate(id=>({n:LN.log.filter(e=>e.code==='world_cut'&&e.d.p===id).length, still:!!LN.colonies[id], cut:!!(LN.colonies[id]&&LN.colonies[id].cut)}),mine);
  ok('the log says it once and the world stays settled', lg.n===1&&lg.still&&lg.cut, JSON.stringify(lg));
  ok('the cut-off line is on screen (toast or note)', /IS CUT OFF|cut off/i.test(seen), seen.slice(0,200));
  await show(mine); await p.screenshot({path:TMP+'/v433-lift-cut.png'});

  // === RU
  await p.evaluate(()=>{ LNU.lang='ru'; LNdraw() }); await show(mine);
  const r4=await win();
  ok('RU: the window names the cut-off or the last lift in Russian, no raw placeholders', /Отрезан|Последний рейс/.test(r4)&&!/\{[a-z]\}/.test(r4), (r4.match(/Отрезан.{0,60}|Последний рейс.{0,60}/)||[r4.slice(0,160)])[0]);
  await p.screenshot({path:TMP+'/v433-lift-ru.png'});

  // === reviewer's cases (13.10): the date must be one the button can keep
  await p.evaluate(a=>{ LN.night=LN.day+a.rt+200; LN.ships.forEach(s=>{ if(HULLS[s.hull].key==='courier') s.mutiny=true }); LNdraw() },{rt});
  const none=await p.evaluate(a=>lastLift(LN,a.id),{id:mine});
  await show(mine);
  ok('every courier has mutinied: lastLift says none', none.st==='none', JSON.stringify(none));
  ok('…and the advisor does not count it as a deadline', !(await advMine(mine)).match(/[Ll]ast lift/), await advMine(mine));
  const re=await p.evaluate(a=>{ LN.ships.forEach(s=>{ s.mutiny=false }); LN.colonies[a.id].cut=true; tick(LN); LN.pauseNow=false; LNdraw(); return {cut:LN.colonies[a.id].cut, st:lastLift(LN,a.id).st} },{id:mine});
  await U.clear();
  ok('a world that is open again loses the cut flag', re.cut===false&&re.st==='open', JSON.stringify(re));
  const home=async left=>await p.evaluate(a=>{ LN.ships.forEach(s=>{ if(HULLS[s.hull].key==='courier'&&s.mode!=='dead'){ s.mode='transit'; s.at=null; s.origin=a.id; s.dest='earth'; s.dir='in'; s.t=10; s.total=15 } }); LN.night=LN.day+a.rt+a.left; LNdraw(); return lastLift(LN,a.id) },{id:mine,rt,left});
  const h1=await home(12); await show(mine); const e1=await evacState();
  ok('couriers 10 years from home, 12 to spare: open, and the button waits for a courier (not "too late")', h1.st==='open'&&h1.n===12&&e1&&e1.off&&e1.why==='evacNoCourier', JSON.stringify(h1)+' '+JSON.stringify(e1));
  const h2=await home(5);
  ok('couriers 10 years from home, 5 to spare: nobody makes it and a new hull would not either — cut', h2.st==='cut', JSON.stringify(h2));

  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+String(e.message||e).split('\n')[0]) }
fs.writeFileSync(TMP+'/pw40.out',out.join('\n')+'\n'); console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length); process.exit(0);
})();
