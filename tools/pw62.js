// pw62 — v5.26 (Никита, 13.11: «если сразу будет ночь, то это хороший хук, но когда — пока неизвестно»; «в терминале можно добавить
// про ночь, потому что это важно»): Ночь стоит в верхней панели с нулевого года без даты — с помощником и без него; в журнале целей и в
// окне Земли она тоже есть; вкладка ковчега под помощником — закрытый силуэт; третье кольцо (правило ядра не тронуто) ставит дату, и
// панель становится прежней — год и «осталось». Строки терминала — в преамбуле перед первым вопросом.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW62_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const top=p=>p.evaluate(()=>{ const e=document.querySelector('#top .yr.night'); if(!e) return null; const r=e.getBoundingClientRect();
    return {nd:e.classList.contains('nd'),small:e.querySelector('small').innerText.trim(),b:e.querySelector('b').innerText.trim(),span:e.querySelector('span').innerText.trim(),
      w:Math.round(r.width),seen:r.width>0&&r.right<=innerWidth&&r.top>=0,wake:!!document.getElementById('topwake'),n:document.querySelectorAll('#top .yr.night').length} });

  // ---------- A. no helper: year 0, then the third ring dates the Night ----------
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const shot=async(n,pg)=>{ if(SHOTS) await (pg||p).screenshot({path:path.join(SHOTS,n+'.png')}) };
  await U.start('en',11); await U.pause();
  let t=await top(p);
  ok('year 0: the Night stands in the top bar, no date', !!t&&t.nd&&t.seen&&t.n===1&&/^NIGHT$/i.test(t.small)&&t.b==='????'&&/^date unknown$/i.test(t.span)&&await p.evaluate(()=>LN.day===0&&!LN.night), JSON.stringify(t));
  ok('year 0: no year in the cell, no WAKE · SLEEP ON yet', !!t&&!/\d/.test(t.b+t.span)&&!t.wake, JSON.stringify(t));
  await shot('A1-year0');
  await U.tab('earth');
  const er=await p.evaluate(()=>[...document.querySelectorAll('#ovl .rw')].map(e=>e.innerText.replace(/\s+/g,' ').trim()).filter(s=>/night/i.test(s)));
  ok('Earth window: the Night row says the date is unknown', er.length===1&&/^Night date unknown$/i.test(er[0]), er.join(' | '));
  await p.keyboard.press('Escape');
  await U.tap('#cards .ocard');
  let j=await p.evaluate(()=>({secs:[...document.querySelectorAll('#goals .sec')].map(e=>e.innerText.replace(/\s+/g,' ').trim()),ock:[...document.querySelectorAll('#goals .ock')].map(e=>e.className+' · '+e.innerText.replace(/\s+/g,' ').trim())}));
  ok('journal: «The Night — date unknown» and the way to the date (ring 3)', j.secs.some(s=>/^the night date unknown$/i.test(s))&&j.ock.length===1&&/yet/.test(j.ock[0])&&/Date chart ring 3$/i.test(j.ock[0]), JSON.stringify(j));
  await shot('A2-journal'); await p.keyboard.press('Escape');
  await U.tab('ark');
  ok('Ark window before the date: no hive, «no date yet»', /The Night has no date yet/i.test(await p.innerText('#ovl'))&&!(await p.isVisible('#ovl .hold')));
  await p.keyboard.press('Escape');
  // the way there, by the game's own rule: six worlds ever settled and the price of the survey — then the button in Tech, by the mouse
  await p.evaluate(()=>{ LN.settled=LN.settled||{}; PLANETS.filter(q=>q.sec<=1).slice(0,6).forEach(q=>{ LN.settled[q.id]=1 });
    const c=surveyCost(SECTORS.length), E=LN.earth; E.metal=c.metal+500; E.food=c.food+5000; E.fuel=c.fuel+500; E.parts=c.parts+50; E.people=c.people+K.EARTH_KEEP+200; openRes(LN,'metal'); openRes(LN,'fuel'); openRes(LN,'parts'); LNdraw() });
  ok('the survey of ring 3 is allowed', await p.evaluate(()=>canSurvey(LN)==='ok'&&SECTORS.length===2));
  await U.clear();   // the whole-screen note «a ring can be charted» comes with it
  await U.tap('#cards .ocard');
  const why=await p.evaluate(()=>[...document.querySelectorAll('#goals .orow')].map(e=>e.innerText.replace(/\s+/g,' ').trim()).filter(s=>/chart ring 3/i.test(s)));
  ok('journal, Now: «Chart ring 3» names the date as its reason', why.length===1&&/the date of the Night/i.test(why[0]), why.join(' | ')+' · '+await p.evaluate(()=>objectives(LN).now.map(o=>o.code).join(' ')+' · '+[...document.querySelectorAll('#goals .orow')].map(e=>e.innerText.replace(/\s+/g,' ').trim()).join(' | ')));
  await p.keyboard.press('Escape');
  await U.tab('tech');
  await U.tap('#side [data-act="survey"]');
  ok('the mouse charted ring 3', await p.evaluate(()=>SECTORS.length===3&&!LN.night));
  await U.tab('tech').catch(()=>{});
  // one year on: the core dates the Night (revealNight), the whole-screen notice stops the clock
  await p.evaluate(()=>{ tick(LN); LNdraw() });
  const d=await p.evaluate(()=>({night:LN.night,day:LN.day,big:LNI.big(),want:LN.day-1+K.NIGHT_YEARS}));
  ok('the third ring dates the Night (rule as it was: NIGHT_YEARS from that day)', d.night>0&&d.big==='night'&&(d.night===d.want||d.night===d.want+1), JSON.stringify(d));
  await shot('A3-night-notice');
  await U.tap('[data-act="nightok"]'); await U.clear();
  t=await top(p);
  ok('after the date: the year of the Night and the years left, no «unknown»', !!t&&!t.nd&&t.n===1&&t.b===String(d.night)&&/^\d[\d\s,.]* (yr|years?)/i.test(t.span)&&!/unknown|\?/i.test(t.b+t.span), JSON.stringify(t));
  ok('after the date: WAKE · SLEEP ON joins it', !!t&&t.wake);
  await shot('A4-dated');
  await U.tap('#cards .ocard');
  j=await p.evaluate(()=>({secs:[...document.querySelectorAll('#goals .sec')].map(e=>e.innerText.replace(/\s+/g,' ').trim()),ock:document.querySelectorAll('#goals .ock').length,done:[...document.querySelectorAll('#goals .odn')].map(e=>e.innerText.replace(/\s+/g,' ').trim())}));
  ok('journal after the date: the year, three checks, «The Night dated» in Done', j.secs.some(s=>new RegExp('^the night year '+d.night+'$','i').test(s))&&j.ock===3&&j.done.some(s=>/The Night dated: year/i.test(s)), JSON.stringify(j));
  await p.keyboard.press('Escape');
  await U.tab('earth');
  const er2=await p.evaluate(()=>[...document.querySelectorAll('#ovl .rw')].map(e=>e.innerText.replace(/\s+/g,' ').trim()).filter(s=>/^night/i.test(s)));
  ok('Earth window after the date: the year', er2.length===1&&er2[0].indexOf(String(d.night))>0&&!/unknown/i.test(er2[0]), er2.join(' | '));
  await p.keyboard.press('Escape');
  // the other way to the date: the year (NIGHT_TRIGGER_YEAR) — a fresh run, nothing charted
  await U.start('en',22); await U.pause();
  await p.evaluate(()=>{ LNU.shiftStop=false; LN.earth.food=1e6; LN.day=K.NIGHT_TRIGGER_YEAR-2; LNdraw() });
  t=await top(p); const before=!!t&&t.nd;
  await p.evaluate(()=>{ for(let i=0;i<3&&!LN.night;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() });
  await U.clear(); t=await top(p);
  ok('year '+(await p.evaluate(()=>K.NIGHT_TRIGGER_YEAR))+' with two rings: unknown until then, dated after', before&&!!t&&!t.nd&&t.b===String(await p.evaluate(()=>LN.night)), JSON.stringify(t));
  ok('no page errors (no helper)', p.errs.length===0, p.errs.join(' | '));

  // ---------- B. with the helper: the same cell at year 0, the ark a shut outline ----------
  const q=await UI.newPage(b,{vp:{width:1440,height:900}}); const Q=UI.ui(q);
  await Q.start(null,undefined,{tut:true});
  const mn=await Q.menuNew('en');
  ok('helper on: a new game from the menu, the first rule waits', mn.gone&&await q.evaluate(()=>LNI.tut().lock&&LNI.tut().msg==='m0'), JSON.stringify(mn));
  t=await top(q);
  ok('helper, year 0: the Night is in the top bar, no date', !!t&&t.nd&&t.seen&&t.b==='????'&&/^date unknown$/i.test(t.span)&&!t.wake, JSON.stringify(t));
  const sil=await q.evaluate(()=>{ const e=document.querySelector('#tabs .tab.sil'); if(!e) return null; const r=e.getBoundingClientRect();
    return {tag:e.tagName,svg:!!e.querySelector('svg'),text:e.innerText.trim(),act:e.getAttribute('data-act'),last:e===document.querySelector('#tabs').lastElementChild,x:r.left+r.width/2,y:r.top+r.height/2,tabs:document.querySelectorAll('#tabs [data-act="tab"]').length,blank:document.querySelectorAll('#tabs .tab.tlk:not(.sil)').length} });
  ok('helper, year 0: the ark tab is a shut outline — a sign, no word, not a button; the other tabs are still blank', !!sil&&sil.tag==='DIV'&&sil.svg&&sil.text===''&&!sil.act&&sil.last&&sil.tabs===0&&sil.blank===5, JSON.stringify(sil));
  await shot('B1-helper-year0',q);
  // the helper's first word is taken off the screen through the hook (it waits for a press on a farm), then a press on the outline: nothing opens
  await q.evaluate(()=>{ LNU.tut.msg=null; LNU.tut.q=[]; LNdraw() });
  await shot('B1b-helper-year0-clear',q);
  if(sil){ await q.mouse.click(sil.x,sil.y); await q.waitForTimeout(150) }
  ok('a press on the outline opens nothing', await q.evaluate(()=>!LNU.win&&!LNU.tab));
  // the date comes: the notice, then the Night step — the rule about the cell (m18) speaks of a year that is there now
  // (the steps before it open by their years: the run is moved to year 700 with a full larder)
  await q.evaluate(()=>{ LNU.shiftStop=false; LN.earth.food=1e6; LN.day=700; LNU.tut.q=[]; revealNight(LN); LN.pauseNow=false; LNdraw() });
  ok('helper: the date opens the whole-screen notice at once, the cell already shows the year', await q.evaluate(()=>LNI.big()==='night')&&!(await top(q)).nd);
  await Q.tap('[data-act="nightok"]');
  let m18=null; const seenB=[]; for(let i=0;i<90&&!m18;i++){ const s=await q.evaluate(()=>{ LNdraw(); return {msg:LNI.tut().msg,nar:LNI.tut().nar,big:LNI.big(),tx:(document.querySelector('#helper .htx')||{}).textContent||''} });
    if(s.msg&&seenB[seenB.length-1]!==s.msg) seenB.push(s.msg);
    if(s.msg==='m18'){ m18=s.tx; break }
    if(s.big||await q.evaluate(()=>!!LNU.pf)) await Q.clear(); else if(s.msg){ await q.waitForTimeout(330); await Q.tap('#helper [data-act="tutok"]').catch(()=>{}) } else if(s.nar) await Q.tap('#voice').catch(()=>{}); else await q.waitForTimeout(150) }
  ok('helper: m18 points at the cell and says the Night has its year now', /The Night has its year now/i.test(m18||''), (m18||'')+' · '+seenB.join(' ')+' · '+JSON.stringify(await q.evaluate(()=>Object.assign({day:LN.day,big:LNI.big(),pf:!!LNU.pf},LNI.tut()))).slice(0,220));
  await shot('B2-helper-m18',q);
  ok('helper: after the Night step the ark is a real tab', await q.evaluate(()=>!!document.querySelector('#tabs [data-act="tab"][data-v="ark"]')&&!document.querySelector('#tabs .tab.sil')));
  ok('no page errors (helper)', q.errs.length===0, q.errs.join(' | '));

  // ---------- C. the terminal: the Night is named before the first question ----------
  const r=await UI.newPage(b,{vp:{width:1440,height:900}}); const R=UI.ui(r);
  await R.start(null,undefined,{tut:true});
  await R.tap('#menu .mit[data-id="new"]');
  let lines=[]; for(let i=0;i<260;i++){ lines=await r.evaluate(()=>[...document.querySelectorAll('#menu .mterm .bl')].map(e=>({t:e._t||e.textContent,c:e.className}))); if(lines.some(l=>/systems offline/i.test(l.t))||await r.isVisible('#menu .mterm .bq button')) break; await r.waitForTimeout(250) }
  const ni=lines.findIndex(l=>/NIGHT \.+ detected/.test(l.t)), di=lines.findIndex(l=>/NIGHT · date \.+ no data/.test(l.t)), oi=lines.findIndex(l=>/systems offline/i.test(l.t));
  ok('terminal: «NIGHT … detected» and «NIGHT · date … no data», before «systems offline»', ni>=0&&di===ni+1&&oi>di, lines.slice(-6).map(l=>l.t).join(' | '));
  ok('terminal: both lines in the warning colour of the terminal', ni>=0&&di>=0&&/\bf\b/.test(lines[ni].c)&&/\bf\b/.test(lines[di].c), ni>=0&&di>=0?lines[ni].c+' · '+lines[di].c:'');
  await r.waitForTimeout(700); await shot('C1-terminal',r);
  ok('no page errors (terminal)', r.errs.length===0, r.errs.join(' | '));

  // ---------- D. a phone-wide window: the cell is on the screen ----------
  const m=await UI.newPage(b,{vp:{width:390,height:844}}); const M=UI.ui(m);
  await M.start('en',11); await M.pause();
  t=await top(m);
  ok('390 px, year 0: the Night cell is on the screen', !!t&&t.nd&&t.seen&&t.b==='????', JSON.stringify(t));
  await shot('D1-phone-year0',m);
  await m.evaluate(()=>{ revealNight(LN); LN.nightSeen=true; LNdraw() }); t=await top(m);
  ok('390 px, dated: the year is on the screen', !!t&&!t.nd&&t.seen, JSON.stringify(t));
  await shot('D2-phone-dated',m);
  ok('no page errors (390 px)', m.errs.length===0, m.errs.join(' | '));
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
