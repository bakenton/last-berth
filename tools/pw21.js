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
    p.tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
    p.pf=async()=>{ if(!(await p.isVisible('#pf'))) return null; const t=(await p.textContent('#pfbox')).replace(/\s+/g,' '); return t };
    p.closePf=async()=>{ for(let i=0;i<6&&await p.isVisible('#pf');i++) await p.tap('[data-act="pfok"]') };
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
  let st=await p.evaluate(()=>{const G=window.LN; const sh=G.log.filter(e=>e.code==='shift').pop(); return {k:sh.d.k, quiet:G.log.some(e=>e.code==='voice'&&/^date_shift/.test(e.d.k)), pf:!!LNU.pf}});
  ok('A first shift after the date is "dated"; chief line quiet (no window)', st.k==='dated'&&st.quiet&&!st.pf, JSON.stringify(st));
  let logTxt=await p.textContent('#log');
  ok('A journal shows the dated shift line', /inherit a year instead of a chart/.test(logTxt));
  // era lines over the next shifts
  await p.evaluate(()=>{ botRun(K.SHIFT_YEARS*6); });
  await p.redraw();
  st=await p.evaluate(()=>window.LN.log.filter(e=>e.code==='shift').map(e=>e.d.k).slice(-7).join(','));
  ok('A every other shift is an era line while the Night is far', /long/.test(st)&&/(grow|calm|shrink|idle|hungry|empty)/.test(st), st);
  // quiet voices on events + lost hulls: inject the log codes the core would write
  const q=await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>!G.colonies[k].dark); const p=planet(k);
    const seq0=G.logSeq||0;
    log(G,'ev_short',{p:k,q:300,dep:p.dep}); log(G,'ev_seam',{p:k,q:500,dep:p.dep}); log(G,'ev_rich',{p:k,q:120,dep:p.dep}); log(G,'ev_wreck',{p:k,q:80,dep:p.dep}); log(G,'ev_disaster',{p:k,q:7}); log(G,'ship_written_off',{n:3,c:8});
    LNU.pf=null; LNdraw();
    const v=G.log.filter(e=>e.code==='voice'&&e.seq>seq0).map(e=>e.d.k);
    return {v, pf:!!LNU.pf, texts:[...document.querySelectorAll('#log .le.vo')].filter(e=>e.textContent.indexOf(String(G.day).padStart(4,'0'))===0).map(e=>e.textContent).join(' || ')} });
  ok('A five event voices + written-off are journal-only', q.v.length===6&&!q.pf&&['seam_less','seam_more','seam_rich','wreck','disaster','written_off'].every(k=>q.v.some(x=>x.indexOf(k+'.')===0)), JSON.stringify(q.v)+' pf='+q.pf);
  ok('A journal renders them with role + resource word', /Settlement head/.test(q.texts)&&/Duty operator/.test(q.texts)&&!/\{dep\}|\{q\}/.test(q.texts), q.texts.slice(0,300));
  await p.screenshot({path:'x3-journal.png',clip:{x:0,y:830,width:1600,height:170}});
  // a crash on landing -> captain window (gap allowing)
  const cr=await p.evaluate(()=>{ const G=window.LN; LNU.voiceLast=-1000; const k=Object.keys(G.colonies)[0]; log(G,'colony_failed',{n:5,p:k}); LNdraw(); return {pf:LNU.pf?LNU.pf.role+'|'+LNU.pf.k+'|'+LNU.pf.sub:null} });
  f=await p.pf();
  ok('A crash on landing opens the captain\'s file', /role_captain\|crash/.test(cr.pf||'')&&!!f&&/Hull captain/.test(f)&&/hull 5/.test(f), f);
  await p.screenshot({path:'x4-crash.png'}); await p.closePf();
  // the ark drive lands -> physicist window with wake %
  await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>planet(k).kind==='works')||Object.keys(G.colonies)[0]; G.driveLvl=G.arkMark-1; G.gen=G.driveLvl; LNU.voiceLast=-1000; driveDone(G,k); LNdraw(); });
  f=await p.pf();
  ok('A ark-drive mark opens the physicist with wake %', !!f&&/Institute physicist/.test(f)&&/60 (of every hundred|out of a hundred)/.test(f), f);
  await p.screenshot({path:'x5-arkdrive.png'}); await p.closePf();
  // 900 years out: doomsday chronicle + chief window
  await p.evaluate(()=>{ const G=window.LN; G.night=G.day+K.DOOMSDAY_AT+1; G.earth.food=1e5; G.earth.metal=1e5; botRun(2); LNdraw(); });
  f=await p.pf();
  const dd=await p.evaluate(()=>({chron:window.LN.log.some(e=>e.code==='doomsday'), line:[...document.querySelectorAll('#log .le.ch')].map(e=>e.textContent).find(t=>/YEARS TO THE NIGHT\. Earth has learned/.test(t))||null}));
  ok('A 900 years out: doomsday chronicle line + shift chief window', dd.chron&&!!dd.line&&!!f&&/Shift chief/.test(f)&&/(square|congregation)/.test(f), (dd.line||'').slice(0,120)+' | '+f);
  await p.screenshot({path:'x6-doomsday.png'}); await p.closePf();
  // dusk shifts
  await p.evaluate(()=>{ botRun(K.SHIFT_YEARS*4); });
  await p.redraw();
  st=await p.evaluate(()=>window.LN.log.filter(e=>e.code==='shift').map(e=>e.d.k).slice(-4).join(','));
  ok('A inside the last thousand years shifts turn to dusk', /dusk/.test(st), st);
  logTxt=await p.textContent('#log');
  ok('A dusk lines render', /(congregation on the pier|struck from the berth list|builds nothing and sings)/.test(logTxt));
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
