// v4.1 — the world lives by the date: collapse lore, the physicist, the square, era shifts, quiet voices
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,260):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  async function open(lang){
    const p=await b.newPage({viewport:{width:1600,height:1000}});
    p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
    // v4.16 (F-04): once the bot has taken every charted world, the next redraw raises the full-screen 'no free worlds' stop; it covers the page
    // (the Night modal too) and no click below lands — press 'Later' first. The stop itself is checked in pw34.
    // v4.30 (Nikita, 11.10): full-screen notices (#note) are a queue that pauses the desk; close them as the other windows
    p.tap=async sel=>{ if(await p.isVisible('#nofree')){ const nb=await p.locator('[data-act="nofreeclose"]').boundingBox(); await p.mouse.click(nb.x+nb.width/2,nb.y+nb.height/2); await p.waitForTimeout(120) }
      for(let i=0;i<8&&await p.isVisible('#note [data-act="noteok"]');i++){ const nb=await p.locator('#note [data-act="noteok"]').first().boundingBox(); if(!nb) break; await p.mouse.click(nb.x+nb.width/2,nb.y+nb.height/2); await p.waitForTimeout(120) }
      const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
    p.pf=async()=>{ if(!(await p.isVisible('#pf'))) return null; const t=(await p.textContent('#pfbox')).replace(/\s+/g,' '); return t };
    p.closePf=async()=>{ for(let i=0;i<6&&await p.isVisible('#pf');i++) await p.tap('[data-act="pfok"]'); for(let i=0;i<8;i++){ const ok=await p.evaluate(()=>{ const b=document.querySelector('#note [data-act="noteok"]'); if(!b||getComputedStyle(b.closest('#note')).display==='none') return false; b.click(); return true }); if(!ok) break; await p.waitForTimeout(100) } };   // dialogs: DOM click, as in pw37
    p.redraw=async()=>{ await p.closePf(); await p.tap('.tab[data-tab="worlds"]'); await p.closePf(); await p.tap('.tab[data-tab="earth"]'); await p.waitForTimeout(120) };
    await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
    await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
    await p.tap('[data-lang="'+lang+'"]'); await p.tap('[data-act="oskip"]'); await p.tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false}); await p.addScriptTag({content:BOT});
    return p;
  }
  // ---- A: English ----
  let p=await open('en');
  await p.evaluate(()=>{ botRun(430); const G=window.LN; if(!G.night) revealNight(G); });
  await p.tap('.tab[data-tab="worlds"]'); await p.tap('.tab[data-tab="earth"]'); await p.waitForTimeout(150);
  const modal=(await p.textContent('#introbox')).replace(/\s+/g,' ');
  ok('A night modal: collapse lore, no spectra', /falling in on itself/.test(modal)&&/outrun the collapse/.test(modal)&&!/spectra/.test(modal), modal.slice(0,200));
  await p.screenshot({path:'x1-night.png'});
  await p.tap('[data-act="nightok"]'); await p.waitForTimeout(150);
  let f=await p.pf();
  ok('A physicist speaks on the date, with the forecast year', !!f&&/Institute physicist/.test(f)&&/Generation (IV|V|VI)/.test(f)&&/year \d{3,4}|year —/.test(f), f);
  await p.screenshot({path:'x2-physicist.png'});
  await p.closePf();
  // first shift after the date -> chronicle 'dated' + a quiet chief line, no window
  await p.evaluate(()=>{ const G=window.LN; const next=Math.ceil((G.day+1)/K.SHIFT_YEARS)*K.SHIFT_YEARS; botRun(next-G.day+1); });
  await p.redraw();
  // v4.30 (Nikita, 11.10): a quiet line is a card at the foot of the chart (#pf.low), not a window — 'no window' means no full-screen one
  let st=await p.evaluate(()=>{const G=window.LN; const sh=G.log.filter(e=>e.code==='shift').pop(); return {k:sh.d.k, quiet:G.log.some(e=>e.code==='voice'&&/^date_shift/.test(e.d.k)), pf:!!(LNU.pf&&!LNU.pf.low), card:!!(LNU.pf&&LNU.pf.low)}});
  ok('A first shift after the date is "dated"; chief line quiet (no window)', st.k==='dated'&&st.quiet&&!st.pf, JSON.stringify(st));
  // v4.30: the journal is gone; the chronicle line lives in LN.log (the text is no longer on the page)
  ok('A the dated shift line is in the chronicle (LN.log)', await p.evaluate(()=>window.LN.log.some(e=>e.code==='shift'&&e.d.k==='dated')));
  // era lines over the next shifts
  await p.evaluate(()=>{ botRun(K.SHIFT_YEARS*6); });
  await p.redraw();
  st=await p.evaluate(()=>window.LN.log.filter(e=>e.code==='shift').map(e=>e.d.k).slice(-7).join(','));
  ok('A every other shift is an era line while the Night is far', /long/.test(st)&&/(grow|calm|shrink|idle|hungry|empty)/.test(st), st);
  // quiet voices on events + lost hulls: inject the log codes the core would write
  const q=await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>!G.colonies[k].dark); const p=planet(k);
    const seq0=G.logSeq||0; LNU.voiceLast=-1000;   // v4.30: a quiet line waits VOICE_GAP after the last one; the test starts with a clear gap (as the crash case below)
    log(G,'ev_short',{p:k,q:300,dep:p.dep}); log(G,'ev_seam',{p:k,q:500,dep:p.dep}); log(G,'ev_rich',{p:k,q:120,dep:p.dep}); log(G,'ev_wreck',{p:k,q:80,dep:p.dep}); log(G,'ev_disaster',{p:k,q:7}); log(G,'ship_written_off',{n:3,c:8});
    LNU.pf=null; LNdraw();
    const v=G.log.filter(e=>e.code==='voice'&&e.seq>seq0).map(e=>e.d.k);
    // v4.30: quiet voices are a card (#pf.low), never a full-screen window; the text of the card is read here
    const card=document.querySelector('#pf.low');
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
  await p.screenshot({path:'x4-crash.png'}); await p.closePf();
  // the ark drive lands -> physicist window with wake %
  await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>planet(k).kind==='works')||Object.keys(G.colonies)[0]; G.driveLvl=G.arkMark-1; G.gen=G.driveLvl; LNU.voiceLast=-1000; driveDone(G,k); LNdraw(); });
  f=await p.pf();
  const w0=await p.evaluate(()=>Math.round(K.ARK_WAKE[0]*100));   // v4.29: the ladder starts at 30 (was 60) — read it from the core
  ok('A ark-drive mark opens the physicist with wake %', !!f&&/Institute physicist/.test(f)&&new RegExp(w0+' (of every hundred|out of a hundred)').test(f), f);
  await p.screenshot({path:'x5-arkdrive.png'}); await p.closePf();
  // 900 years out: doomsday chronicle + chief window
  await p.evaluate(()=>{ const G=window.LN; G.night=G.day+K.DOOMSDAY_AT+1; G.earth.food=1e5; G.earth.metal=1e5; botRun(2); LNdraw(); });
  f=await p.pf();
  // v4.30: the journal is gone — the chronicle line is checked in LN.log, the window text here
  const dd=await p.evaluate(()=>({chron:window.LN.log.some(e=>e.code==='doomsday')}));
  ok('A 900 years out: doomsday chronicle (LN.log) + shift chief window', dd.chron&&!!f&&/Shift chief/.test(f)&&/(square|congregation)/.test(f), f);
  await p.screenshot({path:'x6-doomsday.png'}); await p.closePf();
  // dusk shifts
  await p.evaluate(()=>{ botRun(K.SHIFT_YEARS*4); });
  await p.redraw();
  st=await p.evaluate(()=>window.LN.log.filter(e=>e.code==='shift').map(e=>e.d.k).slice(-4).join(','));
  ok('A inside the last thousand years shifts turn to dusk', /dusk/.test(st), st);
  // v4.30: the journal is gone; the dusk lines are checked as chronicle entries (LN.log), their wording is no longer on the page
  ok('A dusk lines are in the chronicle (LN.log)', await p.evaluate(()=>window.LN.log.some(e=>e.code==='shift'&&/dusk/.test(e.d.k))));
  ok('A no page errors', !p.errs.length, p.errs.join(' | '));
  await p.close();
  // ---- B: Russian, the grounded ending mentions the collapse ----
  p=await open('ru');
  await p.evaluate(()=>{ botRun(200); const G=window.LN; revealNight(G); });
  await p.tap('.tab[data-tab="worlds"]'); await p.tap('.tab[data-tab="earth"]'); await p.waitForTimeout(150);
  const mru=(await p.textContent('#introbox')).replace(/\s+/g,' ');
  ok('B RU modal: collapse', /падает само в себя/.test(mru)&&/от коллапса не уйдёт/.test(mru), mru.slice(0,160));
  await p.tap('[data-act="nightok"]'); await p.waitForTimeout(150);
  f=await p.pf();
  ok('B RU physicist', !!f&&/Физик Института/.test(f)&&/поколения IV/.test(f), f);
  await p.screenshot({path:'x7-ru-physicist.png'}); await p.closePf();
  await p.evaluate(()=>{ const E=window.LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; window.LN.night=window.LN.day+2; });
  await p.redraw();
  await p.tap('[data-spd="10"]');
  for(let i=0;i<10&&!(await p.evaluate(()=>window.LN.over));i++){ await p.closePf(); if((await p.textContent('#b-pause'))==='▶') await p.tap('#b-pause'); await p.waitForTimeout(700); }
  const ovB=(await p.textContent('#ovbox')).replace(/\s+/g,' ');
  ok('B RU ending: dark closed over', /Тьма сомкнулась/.test(ovB), ovB.slice(0,200));
  ok('B no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
  } catch(e){ out.push('ERROR '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); process.exit(0);
})();
