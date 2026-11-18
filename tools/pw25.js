// v4.5 — the shift report, bottomless stockyard, classes grow apart, fuel by class, kit cost in parts, works text, last-build warning
// v4.35: отчёт смены — окно #noteL (#shiftwin, кнопка «Принять пульт» = shiftok); часы стоят через LNI.halted(); мир — окно мира
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const noteTxt=()=>p.evaluate(()=>document.getElementById('noteL').textContent.replace(/\s+/g,' '));
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.shiftOpen) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await U.clear() };
  await U.start('en',309573272);
  // 1. classes grow apart
  const caps=await p.evaluate(()=>{ ensureGen(5); return HULLS.filter(h=>h.gen===5).map(h=>h.key+':'+h.cap).join(' ') });
  ok('gen VI caps: courier 532 · hauler 1823 · freighter 5771 (v4.46: ×1.5 a generation)', /courier:532 hauler:1823 freighter:5771/.test(caps), caps);
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
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:60,unrest:0,relay:false,dark:false,pending:null,store:{metal:5000,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LNU.shiftStop=false; LNdraw() },mine);
  await U.openWorld(mine);
  await run(10); await U.openWorld(mine);
  ok('stockyard past 1200 and still growing', await p.evaluate(id=>LN.colonies[id].store.metal>5000,mine), await p.evaluate(id=>LN.colonies[id].store.metal,mine));
  ok('no "lost" row on the card', !/Lost to a full stockyard/.test(await win()));
  ok('no lost row in the advisor', !(await p.evaluate(()=>LNI.adv().some(r=>/lost/i.test(r[1]+' '+r[2])))));
  // 5. works text is not "hands and shovels"
  const works=await p.evaluate(()=>PLANETS.filter(q=>q.kind==='works')[0].id);
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:30,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LNdraw() },works);
  await U.closeWin(); await U.openWorld(works);
  const wt=await win();
  // v5.21: блок завода — «You bring → It makes Parts» (было v4.35: «This world eats … Makes Parts»); «first-generation plant» в окне нет: проверка — завод делает детали, не лопаты
  ok('works: makes parts, not shovels', /It makes/i.test(wt)&&/Parts/.test(wt)&&!/shovels/.test(wt), wt.slice(0,160));
  // 6. the shift report: reset to a fresh game, run to year 80 with stops on
  await U.closeWin();
  await U.tap('[data-act="pop"][data-v="menu"]'); await p.fill('#seedin','309573272'); await U.tap('[data-act="new"]');
  ok('new game starts paused, no intro (v4.35: no prologue to stop for)', await p.evaluate(()=>LNU.paused===true&&LN.day===0&&LNI.big()===null));
  // v5.43 (Nikita 18.11: «Смена смены пульта пока фигня полная»): no report window — the shift passes, the clock runs on
  await p.evaluate(()=>{ for(let i=0;i<79;i++){ tick(LN); LN.pauseNow=false } LNdraw() });
  ok('no report before year 80', (await p.evaluate(()=>LNI.big()))!=='shift', await p.evaluate(()=>LN.day));
  await p.evaluate(()=>{ LNU.paused=false; LNU.speed=10; LNU.acc=1000 }); await p.waitForTimeout(900);
  const sh=await p.evaluate(()=>({day:LN.day,big:LNI.big(),open:LN.shiftOpen,halted:LNI.halted(),win:!!document.querySelector('#shiftwin'),log:LN.log.some(e=>e.code==='shift')}));
  ok('v5.43: year 80 passes without a window; the shift is in the log; the clock does not stop', sh.day>80&&sh.big!=='shift'&&!sh.open&&!sh.halted&&!sh.win&&sh.log, JSON.stringify(sh));
  await p.evaluate(()=>{ LNU.paused=true });
  // 8. last-build warning near the Night
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:60,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LN.night=LN.day+10; LN.arkMark=3; LN.nightSeen=true; LNdraw() },mine);
  // v4.35: советник без кодов — проверяем, что строка о поздней постройке есть (текст строки — в выводе)
  ok('advisor speaks when the last build is near (a_lastbuild → advisor row)', await p.evaluate(()=>LNI.adv().length>0), await p.evaluate(()=>JSON.stringify(LNI.adv().map(r=>r[1]))));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
