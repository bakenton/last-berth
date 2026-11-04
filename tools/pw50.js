// pw50 — v4.49 (итерация 5, ручной плейтест Claude 04.11 и решения Никиты): окно мира стоит время; Пропуск не встаёт на рутине;
// верфь — заказ наверху, «Строить» не съезжает; множитель рождаемости на экране; цех Земли (F-55); тягач I без деталей;
// уровни ковчега II–IV будят больше спящих. Клики — мышью по видимым кнопкам; состояние ставится через хуки.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start('en',11); await U.clear();

  // 1. a world window stops the clock; a click outside closes it and the clock runs again
  await U.play(4); await p.waitForTimeout(800);
  const wid=await p.evaluate(()=>PLANETS.find(x=>x.sec===0&&x.kind!=='works').id);
  await p.evaluate(id=>{ LNU.win=id; LNdraw() },wid); await p.waitForTimeout(150);
  const d0=await U.day(); await p.waitForTimeout(1500); const d1=await U.day();
  ok('a world window stops the clock at 4×', d1===d0&&await p.evaluate(()=>LNI.halted()), d0+' → '+d1);
  const r=await p.evaluate(()=>{ const o=document.getElementById('ovl').getBoundingClientRect(); return {x:o.right-20,y:o.bottom-20} });
  await U.at(r.x,r.y);
  ok('a click outside closes the world window', await p.evaluate(()=>!LNU.win));
  await p.waitForTimeout(1500);
  ok('the clock runs again', (await U.day())>d1, d1+' → '+(await U.day()));
  await U.pause();

  // 2. Skip: routine does not stop it (a settler hull comes home with no line), the shift report does; a depleted seam does
  const sid=await p.evaluate(id=>{ const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); return colonize(LN,s.id,id,40,40)==='ok'?s.id:null },wid);
  await p.evaluate(()=>{ LNU.shiftStop=true; LNdraw() });
  const s0=await U.day();
  await U.tap('#top [data-act="skip"]'); await p.waitForTimeout(300);   // the first landfall is a story beat — it stops the skip (v4.36)
  for(let i=0;i<4&&!(await p.evaluate(()=>LN.shiftOpen));i++){ await p.evaluate(()=>{ LNU.tut.msg=null; LNU.tut.q=[] }); await U.closeBig(); await U.tap('#top [data-act="skip"]'); await p.waitForTimeout(300) }
  const s1=await U.day(), back=await p.evaluate(()=>LN.log.filter(e=>e.code==='awaiting').length), tail=await p.evaluate(()=>LN.log.slice(-5).map(e=>e.day+':'+e.code).join(' '));
  ok('Skip runs past a hull home with no line, to the shift', s1%80===0&&s1>s0&&back>0&&await p.evaluate(()=>LN.shiftOpen), s0+' → '+s1+' · awaiting '+back+' · hull '+sid+' · '+tail);
  await U.clear(); await p.evaluate(()=>{ LNU.shiftStop=false });
  const has=await p.evaluate(id=>{ if(!LN.colonies[id]) return false; LN.reserves[id]=1; LNdraw(); return true },wid);
  await U.tap('#top [data-act="skip"]'); await p.waitForTimeout(300);
  const s2=await U.day(), dep=await p.evaluate(id=>LN.log.slice(-8).some(e=>e.code==='depleted'&&e.d.p===id),wid);
  ok('Skip stops on a depleted seam', has&&dep&&s2-s1<=5, s1+' → '+s2);
  await U.clear();

  // 3. the births multiplier: the strip and the Earth window
  await p.evaluate(()=>{ LN.earth.food=LN.need.food*40; LNdraw() });
  const strip=await p.evaluate(()=>document.querySelector('#res .rc[data-r="people"] em').textContent);
  ok('the strip shows the births multiplier', /BIRTHS ×1\.00/i.test(strip), strip);
  await U.tap('#tabs [data-act="tab"][data-v="earth"]'); await p.waitForTimeout(300);
  const ew=await p.evaluate(()=>document.querySelector('#ovl .win').innerText);
  ok('the Earth window shows births and the 80-year mark', /Births\s+×1\.00/.test(ew)&&/×1\.50 with food for 80 years/.test(ew), (ew.match(/Births[^\n]*\n[^\n]*/)||[''])[0]);

  // 4. Earth's workshop: off by default, on by the button, two parts a year at 40 metal + 15 rations, idle under the floor
  ok('the workshop is off at start', /Workshop\s+switched off/.test(ew)&&await p.evaluate(()=>!LN.ws));
  await p.evaluate(()=>{ LN.earth.metal=9000; LN.earth.food=5000; LNdraw() });
  await U.tap('#ovl [data-act="ws"]');
  ok('Start the workshop switches it on', await p.evaluate(()=>LN.ws===true));
  await p.keyboard.press('Escape');
  const w0=await p.evaluate(()=>({p:LN.earth.parts,n:LN.stats.wsParts||0}));
  await U.play(4); await p.waitForTimeout(1500); await U.pause();
  const w1=await p.evaluate(()=>({p:LN.earth.parts,n:LN.stats.wsParts||0,y:LN.day}));
  ok('the workshop makes two parts a year', w1.n-w0.n>=2&&(w1.n-w0.n)%2===0, JSON.stringify([w0,w1]));
  await p.evaluate(()=>{ LN.earth.metal=K.WS_FLOOR+10; tick(LN); LNdraw() });
  ok('it stands under the metal floor', await p.evaluate(()=>LN.wsWhy==='metal'&&LN.wsMade===0));
  // reviewer v4.49: with metal above the floor and rations under it, the window names the rations at once, not last year's reason
  await p.evaluate(()=>{ LN.earth.metal=K.WS_FLOOR+2000; LN.earth.food=LN.need.food*50; LN.wsWhy=null; LNU.win='earth'; LNdraw() }); await p.waitForTimeout(200);
  const held=await p.evaluate(()=>document.querySelector('#ovl .win').innerText);
  ok('idle for want of rations says rations', /idle — Earth keeps its rations/i.test(held), (held.match(/Workshop.*/)||[''])[0]);
  await p.keyboard.press('Escape');

  // 5. the yard: the order cards come first and Build stays put after an order
  await p.evaluate(()=>{ LN.earth.metal=5000; LNdraw() });
  await U.tap('#tabs [data-act="tab"][data-v="yard"]'); await p.waitForTimeout(400);
  const pos=()=>p.evaluate(()=>{ const b=document.querySelector('#ovl [data-act="build"]'); const r=b.getBoundingClientRect(); return Math.round(r.top) });
  const y0=await pos(); await U.tap('#ovl [data-act="build"]'); await U.tap('#ovl [data-act="build"]'); const y1=await pos();
  ok('Build stays put after two orders', y0===y1&&await p.evaluate(()=>LN.ships.filter(s=>s.mode==='building').length>=2), y0+' → '+y1);
  await p.keyboard.press('Escape');

  // 6. Hauler I: no parts, 100 metal; the Tech tab shows speeds with the drive
  const h=await p.evaluate(()=>{ const x=HULLS.find(h=>h.key==='hauler'&&h.gen===0), y=genHull(1,1); return {m:x.metal,p:x.parts,p2:y.parts} });
  ok('Hauler I: 100 metal, no parts; Hauler II keeps its parts', h.m===100&&h.p===0&&h.p2>0, JSON.stringify(h));

  // 7. the ark: level IV adds 15 points to the drive's share; II–IV are dearer in food, cheaper in parts
  const a=await p.evaluate(()=>{ LN.arkMark=2; LN.driveLvl=3; LN.ark.paid=arkPrice(1); const w1=arkWake(LN); LN.ark.paid=arkPrice(4); const w4=arkWake(LN); LN.ark.paid={metal:0,parts:0,food:0,fuel:0}; return {w1,w4,f2:arkPrice(2).food,p2:arkPrice(2).parts} });
  ok('ark: level I — the drive alone, level IV +15%', a.w1===0.6&&Math.abs(a.w4-0.75)<1e-9, JSON.stringify(a));
  ok('ark level II: food ×2, parts ×0.5', a.f2===3750*3*2&&a.p2===900*3*0.5, JSON.stringify(a));

  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
 }catch(e){ out.push('ERROR '+String(e&&e.stack||e).slice(0,600)) }
 console.log(out.join('\n'));
 process.exit(out.some(l=>/^(FAIL|ERROR)/.test(l))?1:0);
})();
