// pw41 — v4.36 обучение и нарратив (design/ui-v7.html, BRIEF «Обучение»), EN: новый игрок из главного меню (v4.40) проходит все 12 шагов
// до Ночи с помощником — мышью (проводник tools/pw-tut.js); затем SKIP THE HELPER, ≡ Helper off/on, старое сохранение без U.tut.
// RU — pw42. Скриншоты ключевых шагов — при LB_SHOTS (regress.sh --shots) в work/.run/pw41-*.png.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'), TUT=require('./pw-tut.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ const T0=Date.now(); try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  // 1. a new player, the whole way to the Night
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start(null,undefined,{tut:true});
  ok('helper on for a first game', await p.evaluate(()=>LNI.tut().lock&&LNI.tut().help&&LNI.tut().q[0]==='m0'));
  await p.evaluate(()=>{ LNU.shiftStop=true });
  // v4.40: the main menu first, then the start-up terminal (the launch screen N-01 is gone)
  ok('main menu first, the clock stands', await p.isVisible('#menu .mit[data-id="new"]')&&await p.evaluate(()=>LNU.menu&&LNI.halted()&&!LNI.tut().msg));
  const mn=await U.menuNew('en');
  ok('New game: the dive, then the terminal of HELM', mn.term&&/^\*\* helm \d+\.\d+ · cold start \*\*$/.test(mn.first)&&mn.halted, JSON.stringify(mn));
  ok('SKIP in the terminal: the map and the first rule', mn.gone&&await p.evaluate(()=>LNI.tut().msg==='m0'), JSON.stringify(mn));
  ok('at the start only rations and people are seen', await p.evaluate(()=>[...document.querySelectorAll('#res .rc[data-r]')].map(e=>e.dataset.r).join()==='food,people'));
  ok('at the start no tab is open', await p.evaluate(()=>document.querySelectorAll('#tabs [data-act="tab"]').length===0));
  const r=await TUT.drive(p,U,{deadline:T0+120000,shots:process.env.LB_SHOTS?'pw41':null});
  const S=r.seen, M=r.marks, F=M.final;
  ok('all 12 steps open, to the Night and the ark', F.step===11, 'step '+F.step+' day '+F.day+' over '+M.over+' · '+S.join(' '));
  const want=['m0','m1','m2','m3','N02','m4','m8','mM','m9','m10','m14','m15','N07','m17','N08','m16','N09','m18','m19'];   // m12 waits for the first parts at home
  const miss=want.filter(x=>!S.includes(x)); ok('every rule and story block of the steps was shown', !miss.length, 'missing '+miss.join(' ')+' · '+S.join(' '));
  const order=want.filter(x=>S.includes(x)).map(x=>S.indexOf(x)); ok('in the order of the steps', order.every((v,i)=>!i||v>order[i-1]), S.join(' '));
  ok('m12 «Parts are home» only with parts at home', !S.includes('m12')||(M.h_m12&&M.h_m12.parts>0), JSON.stringify(M.h_m12||null));
  ok('first rule: rations end in the forecast year', /Rations run out in \d+\./.test((M.h_m0||{}).text||''), (M.h_m0||{}).text);
  ok('time stands while she speaks', Object.keys(M).filter(k=>k.startsWith('h_')).every(k=>M[k].halted), Object.keys(M).filter(k=>k.startsWith('h_')&&!M[k].halted).join(' '));
  ok('a miss in a "do" step shakes the ring, the step stays', M.miss&&M.miss.shake&&M.miss.still, JSON.stringify(M.miss));
  ok('FUEL shows in the settlers\' price with m2', M.fuelInPrice===2, M.fuelInPrice);
  ok('her voice: the first landing report (N-02)', /Report from [A-Z]+: \d+ people landed/.test(M.v_N02||''), M.v_N02);
  ok('the first shift window speaks for the Institute (N-04)', /Shift 1 hands over the desk/.test(M.n04||'')&&/I stay/.test(M.n04||''), (M.n04||'').slice(0,160));
  ok('the Night window is N-09', /in \d+ our galaxy collapses/.test(M.n09||''), (M.n09||'').slice(0,160));
  ok('a new tab shows a yellow dot until opened', M.earthDot===true&&M.earthDotAfter===false, M.earthDot+' '+M.earthDotAfter);
  ok('by occasion: the first look into Earth tells time stops (m7)', S.includes('m7'), S.join(' '));
  ok('ring II hidden until its step, then shown', M.ring2Before>0&&M.ring2After>M.ring2Before, M.ring2Before+' → '+M.ring2After);
  ok('at the end every resource, tab and the Night counter are seen', await p.evaluate(()=>document.querySelectorAll('#res .rc[data-r]').length===5&&document.querySelectorAll('#tabs [data-act="tab"]').length===6&&!!document.querySelector('#top .night')));
  ok('the core opened every resource the run met', await p.evaluate(()=>['metal','fuel','parts'].every(k=>LN.opened[k]!==undefined)), await p.evaluate(()=>JSON.stringify(LN.opened)));
  ok('no hull lost before the advisor step (G.safe)', await p.evaluate(()=>LN.safe===false));
  ok('no page errors (tutorial run)', p.errs.length===0, p.errs.join(' | '));
  // 2. save in the middle of the tutorial, load: the lock and what was said stay
  const sv=await p.evaluate(()=>LNsave()); await p.evaluate(s=>LNload(s),sv);
  ok('a save keeps the tutorial state', await p.evaluate(()=>{ const t=LNI.tut(); return t.lock&&t.step===11&&t.help }));
  await p.close();
  // 3. SKIP in the terminal, then SKIP THE HELPER on the first rule
  const q=await UI.newPage(b,{vp:{width:1280,height:800}}); const V=UI.ui(q);
  await V.start(null,undefined,{tut:true}); await V.menuNew('en'); await q.waitForTimeout(300);
  ok('SKIP in the terminal goes to the map and the first rule', await q.evaluate(()=>LNI.tut().nar===null&&LNI.tut().msg==='m0'));
  ok('SKIP THE HELPER only on the first rule', await q.evaluate(()=>!!document.querySelector('#helper [data-act="tutskip"]')));
  await V.tap('#helper [data-act="tutskip"]');
  ok('helper skipped: everything open at once, nothing said', await q.evaluate(()=>{ const t=LNI.tut(); return !t.lock&&!t.help&&!t.msg&&document.querySelectorAll('#res .rc[data-r]').length===5&&document.querySelectorAll('#tabs [data-act="tab"]').length===6&&!!document.querySelector('#top [data-act="skip"]') }));
  ok('…and the core opened every resource', await q.evaluate(()=>['metal','fuel','parts'].every(k=>LN.opened[k]===0)&&LN.safe===false));
  ok('…the clock still stands until the player starts it', await q.evaluate(()=>LNU.paused===true));
  // the story goes on without the helper: the first landing is still told
  await q.evaluate(()=>{ const s=LN.ships.find(x=>x.mode==='idle'&&x.at==='earth'); const f=PLANETS.filter(w=>w.sec===0&&w.kind==='farm')[0]; colonize(LN,s.id,f.id,foundParty(LN,s,f.id),0); for(let i=0;i<60&&!Object.keys(LN.colonies).length;i++){ tick(LN); LN.pauseNow=false } LNdraw(); LNdraw(); LNdraw() });
  ok('…the story goes on: her voice at the first landing', await q.evaluate(()=>LNI.tut().nar==='N02'&&document.getElementById('voice').classList.contains('on')));
  ok('her voice does not stop the clock', await q.evaluate(()=>{ LNU.paused=false; return !LNI.halted() }));
  await V.tap('#voice'); ok('a press on her voice closes it', await q.evaluate(()=>LNI.tut().nar===null));
  // ≡ Helper off / on
  await V.tap('[data-act="pop"][data-v="menu"]');
  ok('≡ shows Helper off', /Helper\s*off/i.test(await q.evaluate(()=>document.querySelector('#pop [data-act="help"]').textContent)));
  await V.tap('#pop [data-act="help"]');
  ok('≡ Helper on: the rules speak again, nothing is hidden', await q.evaluate(()=>{ const t=LNI.tut(); return t.help&&!t.lock }));
  ok('…the choice is for this run only: nothing kept in the browser', await q.evaluate(()=>localStorage.getItem('lb.help')===null));
  // 4. a save from before v4.36 (no U.tut): everything open, no helper, the story goes on from here
  const old=await q.evaluate(()=>{ const o=JSON.parse(LNsave()); delete o.U.tut; return JSON.stringify(o) });
  await q.evaluate(s=>LNload(s),old);
  ok('old save: everything open, no helper, nothing told again', await q.evaluate(()=>{ const t=LNI.tut(); return !t.lock&&!t.help&&!t.msg&&!t.nar&&!t.q.length&&t.step>=2&&document.querySelectorAll('#tabs [data-act="tab"]').length===6 }), JSON.stringify(await q.evaluate(()=>LNI.tut())));
  ok('no page errors (skip, menu, old save)', q.errs.length===0, q.errs.join(' | '));
  // 5. v4.41 (Никита 24.10): обучение есть в каждой новой игре — SKIP THE HELPER выключает его только на эту партию
  const w=await UI.newPage(b,{vp:{width:1280,height:800}}); const X=UI.ui(w);
  await X.start(null,undefined,{tut:true}); await X.menuNew('en'); await w.waitForTimeout(300);
  await X.tap('#helper [data-act="tutskip"]'); ok('SKIP THE HELPER: off for this run', await w.evaluate(()=>!LNI.tut().help));
  await X.tap('[data-act="pop"][data-v="menu"]'); await X.tap('#pop [data-act="new"]'); await w.waitForTimeout(200);
  ok('the next new game starts with the helper anyway', await w.evaluate(()=>{ const t=LNI.tut(); return t.help&&t.lock&&t.msg==='m0' }));
  ok('no page errors (helper again)', w.errs.length===0, w.errs.join(' | ')); await w.close();
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
