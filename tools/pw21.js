// v4.1 — the world lives by the date: collapse lore, the physicist, the square, era shifts, quiet voices
// v4.35: окна — #noteL (ночь, смена, событие, финал), личное дело — #pfL (тихие голоса — карточка #pfL.low); журнала нет, строки — LN.log
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,260):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  // открыть новую игру; U — помощники интерфейса (закрывают большие окна перед кликом)
  async function open(lang){
    const p=await UI.newPage(b); const U=UI.ui(p);
    await U.start(lang,309573272); await p.addScriptTag({content:BOT});
    p.U=U;
    p.pf=async()=>{ await U.closeBig(); if(!(await p.isVisible('#pfL .pfbox'))) return null;   // личное дело на весь экран ждёт, пока закроется смена
       return (await p.textContent('#pfL')).replace(/\s+/g,' ') };
    p.big=async()=>p.evaluate(()=>document.getElementById('noteL').textContent.replace(/\s+/g,' '));
    p.redraw=async()=>{ await p.evaluate(()=>LNdraw()) };
    return p;
  }
  // ---- A: English ----
  let p=await open('en');
  await p.evaluate(()=>{ botRun(430); const G=window.LN; if(!G.night) revealNight(G); LNdraw(); });
  const modal=await p.big();
  ok('A night modal: collapse lore, no spectra', /falling in on itself/.test(modal)&&/outrun the collapse/.test(modal)&&!/spectra/.test(modal), modal.slice(0,200));
  await p.screenshot({path:'x1-night.png'});
  await p.U.tap('[data-act="nightok"]'); await p.waitForTimeout(150);
  let f=await p.pf();
  ok('A physicist speaks on the date, with the forecast year', !!f&&/Institute physicist/.test(f)&&/Generation (IV|V|VI)/.test(f)&&/year \d{3,4}|year —/.test(f), f);
  await p.screenshot({path:'x2-physicist.png'});
  await p.U.clear();
  // first shift after the date -> chronicle 'dated' + a quiet chief line, no window
  await p.evaluate(()=>{ const G=window.LN; const next=Math.ceil((G.day+1)/K.SHIFT_YEARS)*K.SHIFT_YEARS; botRun(next-G.day+1); LNdraw(); });
  // v4.30 (Nikita, 11.10): a quiet line is a card at the foot of the chart (#pfL.low), not a window — 'no window' means no full-screen one
  let st=await p.evaluate(()=>{const G=window.LN; const sh=G.log.filter(e=>e.code==='shift').pop(); return {k:sh.d.k, quiet:G.log.some(e=>e.code==='voice'&&/^date_shift/.test(e.d.k)), pf:!!(LNU.pf&&!LNU.pf.low), card:!!(LNU.pf&&LNU.pf.low)}});
  ok('A first shift after the date is "dated"; chief line quiet (no window)', st.k==='dated'&&st.quiet&&!st.pf, JSON.stringify(st));
  // v4.30: the journal is gone; the chronicle line lives in LN.log (the text is no longer on the page)
  ok('A the dated shift line is in the chronicle (LN.log)', await p.evaluate(()=>window.LN.log.some(e=>e.code==='shift'&&e.d.k==='dated')));
  // era lines over the next shifts
  await p.evaluate(()=>{ botRun(K.SHIFT_YEARS*6); LNdraw(); });
  st=await p.evaluate(()=>window.LN.log.filter(e=>e.code==='shift').map(e=>e.d.k).slice(-7).join(','));
  ok('A every other shift is an era line while the Night is far', /long/.test(st)&&/(grow|calm|shrink|idle|hungry|empty)/.test(st), st);
  // quiet voices on events + lost hulls: inject the log codes the core would write
  const q=await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>!G.colonies[k].dark); const p=planet(k);
    const seq0=G.logSeq||0; LNU.voiceLast=-1000;   // v4.30: a quiet line waits VOICE_GAP after the last one; the test starts with a clear gap (as the crash case below)
    log(G,'ev_short',{p:k,q:300,dep:p.dep}); log(G,'ev_seam',{p:k,q:500,dep:p.dep}); log(G,'ev_rich',{p:k,q:120,dep:p.dep}); log(G,'ev_wreck',{p:k,q:80,dep:p.dep}); log(G,'ev_disaster',{p:k,q:7}); log(G,'ship_written_off',{n:3,c:8});
    LNU.pf=null; LNdraw();
    const v=G.log.filter(e=>e.code==='voice'&&e.seq>seq0).map(e=>e.d.k);
    // v4.30: quiet voices are a card (#pfL.low), never a full-screen window; the text of the card is read here
    const card=document.querySelector('#pfL.low');
    return {v, pf:!!(LNU.pf&&!LNU.pf.low), card:!!LNU.pf&&!!LNU.pf.low, texts:card?card.textContent.replace(/\s+/g,' '):''} });
  ok('A five event voices + written-off are quiet (no full-screen window)', q.v.length===6&&!q.pf&&['seam_less','seam_more','seam_rich','wreck','disaster','written_off'].every(k=>q.v.some(x=>x.indexOf(k+'.')===0)), JSON.stringify(q.v)+' pf='+q.pf);
  // v4.30: quiet lines (quiet:true in voice()) are journal-only — no card, no window; the journal text is gone, so the role and the data are checked in LN.log
  ok('A quiet lines get no card (v4.30: they stay in the chronicle)', !q.card, JSON.stringify({card:q.card, texts:q.texts.slice(0,120)}));
  ok('A quiet lines carry a role and a name in LN.log', await p.evaluate(()=>['seam_less','seam_more','seam_rich','wreck','disaster','written_off'].every(k=>window.LN.log.some(e=>e.code==='voice'&&e.d.k.indexOf(k+'.')===0&&e.d.role&&e.d.name))));
  await p.screenshot({path:'x3-journal.png',clip:{x:0,y:830,width:1600,height:170}});
  // a crash on landing -> captain window (gap allowing)
  const cr=await p.evaluate(()=>{ const G=window.LN; LNU.voiceLast=-1000; const k=Object.keys(G.colonies)[0]; log(G,'colony_failed',{n:5,p:k}); LNdraw(); return {pf:LNU.pf?LNU.pf.role+'|'+LNU.pf.k+'|'+LNU.pf.sub:null} });
  f=await p.pf();
  ok('A crash on landing opens the captain\'s file', /role_captain\|crash/.test(cr.pf||'')&&!!f&&/Hull captain/.test(f)&&/hull 5/.test(f), f);
  await p.screenshot({path:'x4-crash.png'}); await p.U.clear();
  // the ark drive lands -> physicist window with wake %
  await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>planet(k).kind==='works')||Object.keys(G.colonies)[0]; G.driveLvl=G.arkMark-1; G.gen=G.driveLvl; LNU.voiceLast=-1000; driveDone(G,k); LNdraw(); });
  f=await p.pf();
  const w0=await p.evaluate(()=>Math.round(K.ARK_WAKE[0]*100));   // v4.29: the ladder starts at 30 (was 60) — read it from the core
  ok('A ark-drive mark opens the physicist with wake %', !!f&&/Institute physicist/.test(f)&&new RegExp(w0+' (of every hundred|out of a hundred)').test(f), f);
  await p.screenshot({path:'x5-arkdrive.png'}); await p.U.clear();
  // 900 years out: doomsday chronicle + chief window
  await p.evaluate(()=>{ const G=window.LN; G.night=G.day+K.DOOMSDAY_AT+1; G.earth.food=1e5; G.earth.metal=1e5; botRun(2); LNdraw(); });
  f=await p.pf();
  // v4.30: the journal is gone — the chronicle line is checked in LN.log, the window text here
  const dd=await p.evaluate(()=>({chron:window.LN.log.some(e=>e.code==='doomsday')}));
  ok('A 900 years out: doomsday chronicle (LN.log) + shift chief window', dd.chron&&!!f&&/Shift chief/.test(f)&&/(square|congregation)/.test(f), f);
  await p.screenshot({path:'x6-doomsday.png'}); await p.U.clear();
  // dusk shifts
  await p.evaluate(()=>{ botRun(K.SHIFT_YEARS*4); LNdraw(); });
  st=await p.evaluate(()=>window.LN.log.filter(e=>e.code==='shift').map(e=>e.d.k).slice(-4).join(','));
  ok('A inside the last thousand years shifts turn to dusk', /dusk/.test(st), st);
  // v4.30: the journal is gone; the dusk lines are checked as chronicle entries (LN.log), their wording is no longer on the page
  ok('A dusk lines are in the chronicle (LN.log)', await p.evaluate(()=>window.LN.log.some(e=>e.code==='shift'&&/dusk/.test(e.d.k))));
  ok('A no page errors', !p.errs.length, p.errs.join(' | '));
  await p.close();
  // ---- B: Russian, the grounded ending mentions the collapse ----
  p=await open('ru');
  await p.evaluate(()=>{ botRun(200); const G=window.LN; revealNight(G); LNdraw(); });
  const mru=await p.big();
  ok('B RU modal: collapse', /падает само в себя/.test(mru)&&/уйдёт от (коллапса|схлопывания)/.test(mru), mru.slice(0,160));
  await p.U.tap('[data-act="nightok"]'); await p.waitForTimeout(150);
  f=await p.pf();
  ok('B RU physicist', !!f&&/Физик Института/.test(f)&&/поколения IV/.test(f), f);
  await p.screenshot({path:'x7-ru-physicist.png'}); await p.U.clear();
  await p.evaluate(()=>{ const E=window.LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; window.LN.night=window.LN.day+2; LNdraw(); });
  await p.U.until(()=>p.evaluate(()=>!!window.LN.over),200,10); await p.U.pause();
  const ovB=await p.big();
  ok('B RU ending: dark closed over', /Тьма сомкнулась/.test(ovB), ovB.slice(0,200));
  ok('B no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
  } catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length); process.exit(0);
})();
