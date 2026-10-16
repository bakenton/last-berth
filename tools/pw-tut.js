// pw-tut — проводник по обучению v4.36 для pw41 (EN) и pw42 (RU): новый игрок с экрана запуска до Ночи, мышью.
// Подсказки «сделай» нажимаются по подсвеченному месту, «смотри» — GOT IT, голос — нажатием, большие окна — их кнопками.
// Остальная игра (поселить свободный мир, поставить свободное судно на линию, подкормить Землю) — через ядро, чтобы забег дожил до Ночи;
// время — кнопкой SKIP (она останавливается, когда помощнику есть что сказать) или ×10.
async function drive(p,U,{cap=150,deadline=Date.now()+110000,shots=null}={}){
  const seen=[], marks={};   // seen — что показано по порядку; marks — проверки по ходу
  const box=sel=>p.evaluate(q=>{ const e=document.querySelector(q); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return r.width?{x:r.left+r.width/2,y:r.top+r.height/2}:null },sel);
  const click=async sel=>{ const bb=await box(sel); if(!bb) return false; await p.mouse.click(bb.x,bb.y); await p.waitForTimeout(140); return true };
  const st=()=>p.evaluate(()=>Object.assign(LNI.tut(),{day:LN.day,big:LNI.big(),win:LNU.win,halted:LNI.halted(),pf:!!(LNU.pf),over:LN.over}));
  const shot=async nm=>{ if(shots) await p.screenshot({path:shots+'-'+nm+'.png'}) };
  // the run goes on by itself: a free hull settles the nearest visible free world or joins a line without hulls; Earth is fed
  const play=()=>p.evaluate(()=>{ const G=LN; G.earth.food=Math.max(G.earth.food,400); G.earth.people=Math.max(G.earth.people,160); G.earth.fuel=Math.max(G.earth.fuel,300); G.earth.metal=Math.max(G.earth.metal,500);
    if(LNU.tut.lock&&LNU.tut.step<3) return;   // the first world and its line are the player's (tutorial clicks)
    const free=G.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.pend&&!s.job&&!s.mutiny&&!s.crewWait);
    for(const s of free){ const empty=Object.keys(G.colonies).filter(k=>!onLine(G,k).length&&canReachSector(s,planet(k).sec))[0];
      if(empty){ setLine(G,s.id,empty,'earth'); continue }
      const vis=LNU.tut.lock&&!LNU.tut.open.ring2?0:9, w=PLANETS.filter(q=>q.sec<=vis&&q.sec<SECTORS.length&&!G.colonies[q.id]&&!(G.ghost&&G.ghost[q.id])&&!enRoute(G,q.id)&&canReachSector(s,q.sec)).sort((a,b)=>a.dist-b.dist)[0];
      if(w) colonize(G,s.id,w.id,foundParty(G,s,w.id),0) }
    if(LNU.tut.open.order||!LNU.tut.lock){ const lines=Object.keys(G.colonies); if(G.ships.filter(s=>s.mode!=='dead').length<3+lines.length&&lines.length) orderFor(G,lines[G.day%lines.length],'courier') } });
  for(let it=0;it<cap&&Date.now()<deadline;it++){
    const s=await st(); if(process.env.TUT_DEBUG) console.log(it,JSON.stringify(s).slice(0,240)); if(s.over){ marks.over=s.over; break }
    if(s.nar==='N01'){ if(!seen.includes('N01')){ seen.push('N01'); await shot('launch'); marks.launchFrames=await p.evaluate(()=>document.querySelectorAll('#launch .lfr').length) }
      await p.mouse.click(600,450); await p.waitForTimeout(300); continue }
    if(s.msg){ if(seen[seen.length-1]!==s.msg) seen.push(s.msg);
      if(!marks['h_'+s.msg]){ marks['h_'+s.msg]={parts:await p.evaluate(()=>LN.earth.parts+(LN.delivered.parts||0)),halted:s.halted,text:await p.evaluate(()=>document.querySelector('#helper .htx').textContent),ring:await p.evaluate(()=>getComputedStyle(document.getElementById('tutRing')).display!=='none')}; await shot(s.msg) }
      if(s.mode==='do'){
        if(s.msg==='m1'){ if(!marks.miss){ await p.mouse.click(160,700); await p.waitForTimeout(120); marks.miss={shake:await p.evaluate(()=>document.getElementById('tutRing').classList.contains('shk')),still:(await st()).msg==='m1'} }
          const pid=await p.evaluate(()=>LNU.tut.farm); marks.ring2Before=await p.evaluate(()=>document.querySelectorAll('#map .wd[data-p]').length);
          await click('#map .wd[data-p="'+pid+'"] circle[fill="transparent"]') }
        else if(s.msg==='m2'){ marks.fuelInPrice=await p.evaluate(()=>!!document.querySelector('#ovl .prow .pr svg')&&document.querySelectorAll('#ovl .prow .pr').length); await click('#ovl [data-act="send"]') }
        else if(s.msg==='m3') await click('#top [data-act="spd"][data-v="10"]');
        else if(s.msg==='m4') await click('#ovl [data-act="assign"]');
        else if(s.msg==='m8') await click('#ordblk [data-act="order"]:not([aria-disabled="true"])');
        else await click('#helper [data-act="tutok"]');
        continue }
      await click('#helper [data-act="tutok"]'); continue }
    if(s.nar){ if(seen[seen.length-1]!==s.nar) seen.push(s.nar); if(!marks['v_'+s.nar]){ marks['v_'+s.nar]=await p.evaluate(()=>document.querySelector('#voice .vtx').textContent); await shot(s.nar) }
      await click('#voice'); continue }
    if(s.big==='shift'){ if(!seen.includes('N04')){ seen.push('N04'); marks.n04=await p.evaluate(()=>document.getElementById('noteL').textContent.replace(/\s+/g,' ')); await shot('N04') } await click('#noteL [data-act="shiftok"]'); continue }
    if(s.big==='night'){ seen.push('N09'); marks.n09=await p.evaluate(()=>document.getElementById('noteL').textContent.replace(/\s+/g,' ')); await shot('N09'); await click('#noteL [data-act="nightok"]'); continue }
    if(s.big==='note'){ await click('#noteL [data-act="noteok"]'); continue }
    if(s.pf){ if(!(await click('#pfL [data-act="pfok"]'))) await p.evaluate(()=>{ LNU.pf=null; LNdraw() }); continue }
    if(s.step>=11&&!s.q.length) break;
    // the first look into Earth: the 'time stops' rule (by occasion)
    if(s.open.includes('earth')&&!marks.earthOpened){ marks.earthOpened=true; marks.earthDot=await p.evaluate(()=>!!document.querySelector('#tabs [data-v="earth"] .new')); await click('#tabs [data-v="earth"]'); continue }
    if(s.win==='earth'){ marks.earthDotAfter=await p.evaluate(()=>!!document.querySelector('#tabs [data-v="earth"] .new')); await click('#tabs [data-v="earth"]'); continue }
    if(s.win){ await p.keyboard.press('Escape'); await p.waitForTimeout(80); continue }
    if(s.step>=10&&marks.ring2After===undefined) marks.ring2After=await p.evaluate(()=>document.querySelectorAll('#map .wd[data-p]').length);
    await play();
    if(s.open.includes('skip')){ await click('#top [data-act="skip"]'); await p.waitForTimeout(80) }
    else { if(await p.evaluate(()=>LNU.paused)) await click('#top [data-act="spd"][data-v="10"]'); await p.waitForTimeout(400) }
  }
  marks.final=await st();
  return {seen,marks} }
module.exports={drive};
