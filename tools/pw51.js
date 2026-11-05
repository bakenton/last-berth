// pw51 — взлом Пульта (Никита 04.11: «мини игра, которая появляется, когда ты открываешь новое поколение двигателя + думаю за
// уровень ковчега надо тоже»). Гейт: двигатель готов → поколение ждёт взлома; проигрыш → ещё раз; НЕ СЕЙЧАС → карточка, время идёт;
// победа → поколение открыто, блок памяти; уровень ковчега — так же, уровень сложности по номеру взлома. Клики и клавиши — настоящие;
// победа ставится хуком LBhack.cheat() (бой мышью проверяется уроном по хвосту); состояние — через хуки ядра.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const H=()=>p.evaluate(()=>LBhack.state());
  const vis=sel=>p.evaluate(q=>{ const e=document.querySelector(q); if(!e) return false; const r=e.getBoundingClientRect(); return r.width>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden]') },sel);
  const txt=sel=>p.evaluate(q=>{ const e=document.querySelector(q); return e?e.innerText:'' },sel);
  const waitFor=async(fn,ms=6000)=>{ for(let t=0;t<ms;t+=100){ if(await fn()) return true; await p.waitForTimeout(100) } return !!(await fn()) };

  // 0. a scenario run without the hook option never meets the hack (the other scenarios and bots stay as they were)
  await U.start('en',11);
  ok('without hack:true the gate is off', await p.evaluate(()=>!LN.hackGate));
  await U.start('en',11,{hack:true}); await U.clear();
  ok('with hack:true the gate is on', await p.evaluate(()=>LN.hackGate===true));

  // 1. the drive mark is done → the generation waits, the hack opens by itself, the clock stands
  const g0=await p.evaluate(()=>LN.gen||0);
  await p.evaluate(()=>{ const w=PLANETS.find(x=>x.kind==='works'); driveDone(LN,w?w.id:'earth'); LNdraw() });
  ok('drive done: the generation is not open yet', await p.evaluate(g=>(LN.gen||0)===g&&LN.hackQ.length===1&&LN.hackQ[0].k==='drive',g0));
  await U.play(4);
  ok('the hack window opens by itself', await waitFor(async()=>(await H()).open));
  const intro=await txt('#hkIntro');
  ok('intro: wakes HULL.GEN.II, fault level 1 of 6, rules', /THE HELM WAKES A COMMAND: HULL\.GEN\.II/.test(intro)&&/Fault level 1 of 6/.test(intro)&&/New: walls/.test(intro)&&/WASD/.test(intro), intro.replace(/\n/g,' | '));
  const d0=await U.day(); await p.waitForTimeout(1500);
  ok('the clock stands while the hack is open', (await U.day())===d0&&await p.evaluate(()=>LNI.halted()));
  ok('startDrive refuses while the hack waits', await p.evaluate(()=>{ const w=PLANETS.find(x=>x.kind==='works'); return startDrive(LN,w?w.id:'x')==='hack' }));

  // 2. ENTER with the mouse → the fight; keys move the ship, the mouse aims and the tail takes damage
  await U.tap('#hkGo');
  ok('ENTER starts the fight', await waitFor(async()=>{ const s=await H(); return s.game==='play'&&s.panel===null }));
  let s=await H(); const x0=s.me.x;
  await p.keyboard.down('KeyA'); await p.waitForTimeout(400); await p.keyboard.up('KeyA');
  s=await H(); ok('A moves the ship left', s.me.x<x0-40, x0+' → '+s.me.x);
  const left0=s.left; let hurtTail=false;
  for(let i=0;i<60&&!hurtTail;i++){   // aim the real mouse at the tail, again and again
    const t=await p.evaluate(()=>{ const s=LBhack.state(), ts=LBhack.targets(), e=ts[ts.length-1]; return e?{x:s.ox+e.x*s.k,y:s.oy+e.y*s.k}:null });
    if(t) await p.mouse.move(t.x,t.y); await p.waitForTimeout(100);
    s=await H(); if(s.game!=='play') break; hurtTail=s.left<left0 }
  ok('the mouse aims: the serpent takes damage', hurtTail, left0+' → '+s.left);

  // 3. losing: stand still until the serpent gets the ship → SIGNAL LOST → RETRY
  await p.mouse.move(5,5);
  ok('standing still loses the fight', await waitFor(async()=>(await H()).panel==='lost',60000), JSON.stringify(await H()));
  const lost=await txt('#hkLost');
  ok('the lost window: SIGNAL LOST, another try costs nothing', /SIGNAL LOST/.test(lost)&&/costs nothing/.test(lost)&&/RETRY/.test(lost)&&/NOT NOW/.test(lost), lost.replace(/\n/g,' | '));
  ok('a loss costs nothing: still generation I, hack waits', await p.evaluate(g=>(LN.gen||0)===g&&LN.hackQ.length===1,g0));
  await U.tap('#hkRetry');
  ok('RETRY starts a new fight at the same level', await waitFor(async()=>{ const s=await H(); return s.game==='play'&&s.lv===1&&s.hp===3 }));

  // 4. Escape → back to the door; NOT NOW → the window closes, the card stays, the clock runs, nothing opened
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok('Escape leaves the fight for the door', (await H()).panel==='intro');
  await U.tap('#hkLater1');
  ok('NOT NOW closes the hack', !(await H()).open);
  ok('the card HACK WAITING stands top right', await waitFor(()=>vis('#cards .bcard.hk'))&&/HACK WAITING/.test(await txt('#cards .bcard.hk'))&&/HULL\.GEN\.II/.test(await txt('#cards .bcard.hk')));
  await U.play(4); const d1=await U.day(); await p.waitForTimeout(1600);
  ok('the clock runs with the hack put off', (await U.day())>d1);
  ok('the hack stays closed while put off', !(await H()).open&&await p.evaluate(g=>(LN.gen||0)===g,g0));
  await U.tap('#cards .bcard.hk');
  ok('the card opens the hack again', await waitFor(async()=>(await H()).open));

  // 5. the win (Enter key starts it): COMMAND WOKE, the memory block, the unlock; CONTINUE → generation II is open
  await p.keyboard.press('Enter');
  ok('Enter starts the fight', await waitFor(async()=>(await H()).game==='play'));
  await p.evaluate(()=>LBhack.cheat());
  ok('the won window comes', await waitFor(async()=>(await H()).panel==='won'));
  ok('the core knows at once: generation II, one hack won', await p.evaluate(g=>(LN.gen||0)===g+1&&LN.hacks===1&&!LN.hackQ.length,g0));
  await waitFor(()=>vis('#hkDone'),8000);
  const won=await txt('#hkWon');
  ok('won: COMMAND WOKE: HULL.GEN.II, memory block, lore, unlock', /COMMAND WOKE: HULL\.GEN\.II/.test(won)&&/Recovered: 1 memory block/.test(won)&&/Design file/.test(won)&&/Generation II hulls can be ordered/.test(won), won.replace(/\n/g,' | '));
  await U.tap('#hkDone');
  ok('CONTINUE closes the hack', !(await H()).open);
  ok('the card is gone', !(await vis('#cards .bcard.hk')));
  await U.closeBig();

  // 6. the ark: a paid level waits for the hack at level 2 (the run's second hack)
  await U.pause();
  await p.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.nightSeen=true; const c=arkPrice(1); ['metal','parts','food','fuel'].forEach(r=>{ G.earth[r]+=c[r]+10 }); LNdraw() });
  await U.closeBig(); await U.tab('ark');
  await U.tap('[data-act="arkbuy"][data-l="1"]');
  ok('ark level I paid: not counted until the hack', await p.evaluate(()=>LN.ark.lv===1&&arkLevel(LN)===0&&LN.hackQ.length===1&&LN.hackQ[0].k==='ark'));
  ok('the hack opens for the ark', await waitFor(async()=>(await H()).open));
  const ai=await txt('#hkIntro');
  ok('ark intro: ARK.LVL.I, fault level 2 of 6, the new thing of level 2', /ARK\.LVL\.I\b/.test(ai)&&/Fault level 2 of 6/.test(ai)&&/links fire/.test(ai), ai.replace(/\n/g,' | '));
  ok('a second ark level cannot be bought while one waits', await p.evaluate(()=>arkCheck(LN,2)==='hack'));
  await U.tap('#hkGo'); await waitFor(async()=>(await H()).game==='play');
  await p.evaluate(()=>LBhack.cheat()); await waitFor(async()=>(await H()).panel==='won');
  await waitFor(()=>vis('#hkDone'),8000);
  const aw=await txt('#hkWon');
  ok('ark won: ARK.LVL.I, the second memory block, level I counts', /COMMAND WOKE: ARK\.LVL\.I\b/.test(aw)&&/Yard log/.test(aw)&&/Ark level I counts now/.test(aw)&&await p.evaluate(()=>arkLevel(LN)===1&&LN.hacks===2), aw.replace(/\n/g,' | '));
  await U.tap('#hkDone');

  // 7. the log keeps the attempts
  const acts=await p.evaluate(()=>LN.actions.filter(a=>/^hack_/.test(a.k)).map(a=>a.k).join(' '));
  ok('the log: hack_open, hack_lost, hack_later, hack_won', /hack_open/.test(acts)&&/hack_lost/.test(acts)&&/hack_later/.test(acts)&&/hack_won/.test(acts), acts);

  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
 }catch(e){ out.push('ERROR '+String(e&&e.stack||e).slice(0,600)) }
 console.log(out.join('\n'));
 process.exit(out.some(l=>/^(FAIL|ERROR)/.test(l))?1:0);
})();
