// pw68 — v5.33 (ответы Никиты 16.11 по v5.32):
//  1  карточка цели OBJECTIVE: главная цель и под ней подцель («Можно сделать главную цель и ниже подцель») — первая цель списка крупно, как раньше,
//     следующая под ней мельче, со своей строкой; «N more» считает остаток после двух; список целей и его порядок — ядра, не тронуты;
//     проверяется с одной целью, с двумя и с длинной подцелью (первый пакет улучшения с числом), 1440×900 и 390×844;
//  2  улей: все кольца сот вращаются в одну сторону, как одно целое («Давай по улью») — соты не наезжают друг на друга; уровень 3, два кадра.
// Клики — мышью по видимым кнопкам; состояние готовится через ядро. Снимки: PW68_SHOTS=<папка>. Сборка: PW68_FILE (по умолчанию page.html).
// PW68_BEFORE=1 — тот же путь по старой сборке только ради снимков «до»: итог не судит.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW68_SHOTS||null, BEFORE=!!process.env.PW68_BEFORE, FILE=process.env.PW68_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>{ if(!BEFORE) out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):'')) };
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n,sel)=>{ if(!SHOTS) return; const f=path.join(SHOTS,n+'.png'); const e=sel&&await pg.$(sel); if(e&&await e.isVisible()) await e.screenshot({path:f}); else await pg.screenshot({path:f}) };
  const waitFor=async(p,fn,ms=8000)=>{ for(let t=0;t<ms;t+=100){ if(await fn()) return true; await p.waitForTimeout(100) } return !!(await fn()) };
  // what the card shows, and what the core's list says (cut to what is open, as the card cuts it: here everything is open)
  const card=pg=>pg.evaluate(()=>{ const e=document.querySelector('#cards .ocard'); if(!e) return null; const t=e.querySelector('.tt'), sm=t.querySelector('small'), g=e.querySelector('.sg'), gb=g&&g.querySelector('b'), gs=g&&g.querySelector('small'), em=e.querySelector('.hd em'), r=e.getBoundingClientRect(), box=document.getElementById('cards').getBoundingClientRect(), fs=x=>parseFloat(getComputedStyle(x).fontSize);
    return {main:(t.childNodes[0]||{}).textContent||'', mainSub:sm?sm.textContent:'', sub:gb?gb.textContent:null, subSub:gs?gs.textContent:null, more:em?em.textContent:null, cutMain:!!sm&&sm.scrollWidth>sm.clientWidth+1, cutSub:!!gs&&gs.scrollWidth>gs.clientWidth+1,
      fMain:fs(t), fSub:gb?fs(gb):null, below:g?g.getBoundingClientRect().top>=t.getBoundingClientRect().bottom-1:null, inBox:r.left>=box.left-1&&r.right<=box.right+1&&r.right<=innerWidth, h:Math.round(r.height), codes:objectives(LN).now.map(o=>o.code)} });
  const journal=pg=>pg.evaluate(()=>[...document.querySelectorAll('#goals .orow')].map(r=>r.querySelector('b').textContent.split(' — ')[0]));

  for(const [tag,vp] of [['',{width:1440,height:900}],['-390',{width:390,height:844}]]){
    const p=await UI.newPage(b,{vp,file:FILE}); const U=UI.ui(p); const big=!tag;
    await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
    // ---------- one objective: a new game ----------
    const c1=await card(p); await shot(p,'o1-one-objective'+tag, big?'#cards .ocard':null);
    ok('1'+tag+': a new game has one objective — the card is as it was: no second line, no «more»', !!c1&&c1.codes.length===1&&c1.sub===null&&c1.more===null&&/settle your first world/i.test(c1.main)&&c1.inBox, JSON.stringify(c1));
    // ---------- two and more: the first world settled, no hull on its line ----------
    await p.evaluate(()=>{ LN.safe=true; GOD.maxAll(); const w=PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0]; LNU.win=w.id; GOD.settle(); LNU.win=null;
      for(let i=0;i<300&&!LN.colonies[w.id];i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
      LN.ships.forEach(s=>{ if(s.mode!=='dead'&&!s.job&&s.from&&s.to) clearLine(LN,s.id) }); GOD.maxAll(); LNU.notes=[]; LNdraw() });
    await p.waitForTimeout(big?2600:600);
    const c2=await card(p); await shot(p,'o2-main-and-sub'+tag, big?'#cards .ocard':null);
    ok('1'+tag+': with two objectives the card carries both — the first large, the second under it and smaller, each with its own line', !!c2&&c2.codes.length>=2&&!!c2.sub&&c2.below===true&&c2.fSub<c2.fMain&&!!c2.subSub&&c2.inBox, JSON.stringify(c2));
    ok('1'+tag+': «N more» counts what is left after the two (none when there are only two)', !!c2&&(c2.codes.length>2?new RegExp('^'+(c2.codes.length-2)+' more$','i').test(c2.more||''):c2.more===null), JSON.stringify({codes:c2&&c2.codes,more:c2&&c2.more}));
    if(big){
      await U.tap(BEFORE?'#cards .ocard':'#cards .ocard .sg'); await p.waitForTimeout(300);
      const j=await journal(p); await shot(p,'o2-journal','#goals');
      ok('1: a press on the second line opens the journal (the card is one button); its first two rows are the card\'s two, in the core\'s order', j.length>=2&&!!c2&&j[0].toLowerCase()===c2.main.trim().toLowerCase()&&j[1].toLowerCase()===(c2.sub||'').trim().toLowerCase(), JSON.stringify(j)+' · '+JSON.stringify([c2&&c2.main,c2&&c2.sub]));
      await p.keyboard.press('Escape'); await p.waitForTimeout(200) }
    // ---------- a long second line: Earth is hungry (a farm first), the first upgrade package under it ----------
    const L=await p.evaluate(()=>{ GOD.maxAll(); LN.driveLvl=Math.max(LN.driveLvl||0,K.KIT_GATE_DRIVE); const k=Object.keys(LN.colonies)[0], g=LN.gen||0, need=kitCost(LN.colonies[k]).w, i=HULLS.findIndex(h=>h.gen===g&&h.cap>=need&&h.key!=='courier');
      LN.reserves[k]=1e7; const s=GOD.hull(i), r=setLine(LN,s.id,k,'earth'); for(let n=0;n<20;n++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
      GOD.maxAll(); LN.earth.food=0; LN.hungry=true; LNU.notes=[]; LNU.win=null; LNdraw(); return {r, open:kitOpen(LN), first:kitFirst(LN), codes:objectives(LN).now.map(o=>o.code)} });
    await p.waitForTimeout(300);
    const c3=await card(p); await shot(p,'o3-long-sub'+tag, big?'#cards .ocard':null); if(big) await shot(p,'o3-long-sub-screen');
    ok('1'+tag+': hungry Earth first, the first upgrade package second — the long line with its number stands whole under it', !!c3&&L.codes[1]==='o_kit'&&/upgrade package/i.test(c3.sub||'')&&/×[\d.]+: [\d.]+ → [\d.]+ \S+ a year$/.test(c3.subSub||'')&&!c3.cutSub&&!c3.cutMain&&c3.inBox, JSON.stringify(c3)+' '+JSON.stringify(L));
    ok('no page errors'+tag, p.errs.length===0, p.errs.join(' | '));
    await p.close() }

  // ---------- 2: the hive turns as one piece ----------
  const q=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const Q=UI.ui(q); const HS=()=>q.evaluate(()=>LBhack.state());
  await Q.start('en',11,{hack:true}); await Q.clear();
  await q.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.nightSeen=true; G.earth.food+=90000; G.earth.metal+=60000; LNdraw() });
  const ring=async k=>{ await Q.closeBig(); if(!(await q.evaluate(()=>LNU.tab==='ark'||LNU.win==='ark'))) await Q.tab('ark'); await q.waitForTimeout(250);
    const pt=await q.evaluate(k=>{ const e=document.querySelector('#ovl .hold .hr[data-v="'+k+'"] .hx'); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} },k);
    if(!pt) return false; await q.mouse.click(pt.x,pt.y); await q.waitForTimeout(250); await Q.tap('#arkcard [data-act="arkbuy"]'); await q.waitForTimeout(250);
    await Q.tap('#hkneed [data-act="hack"]'); return waitFor(q,async()=>(await HS()).open) };
  const win=async()=>{ await q.evaluate(()=>LBhack.cheat()); await waitFor(q,async()=>(await HS()).panel==='won',12000); await waitFor(q,()=>q.isVisible('#hkDone'),8000); await Q.tap('#hkDone'); await q.waitForTimeout(400) };
  for(const k of [1,2]){ if(await ring(k)){ await Q.tap('#hkGo'); await waitFor(q,async()=>(await HS()).game==='play'); await win() } }
  const opened=await ring(3), s0=await HS();
  ok('2: ring 3 bought by the mouse, START THE HACK opens the hive of level 3', opened&&s0.kind==='hive'&&s0.lv===3&&s0.panel==='intro', JSON.stringify(s0).slice(0,160));
  await Q.tap('#hkGo'); await waitFor(q,async()=>(await HS()).game==='play');
  const h=await HS(); await q.mouse.move(h.ox+h.aw*0.82*h.k,h.oy+(h.ah-8)*h.k);   // the aim away from the hive: the comb is whole in both frames
  await q.waitForTimeout(700); const a=await HS(); await shot(q,'h3-hive-level3-frame-a'); const t0=Date.now();
  await q.waitForTimeout(1500); const c=await HS(); await shot(q,'h3-hive-level3-frame-b'); const dt=(Date.now()-t0)/1000;
  const dOut=c.ang!==undefined&&a.ang!=null?c.ang-a.ang:null, dIn=c.ang1!==undefined&&a.ang1!=null?c.ang1-a.ang1:null, deg=x=>x===null?'—':(x*180/Math.PI).toFixed(0)+'°';
  ok('2: level 3 — between two frames ~1.5 s apart the inner ring and the outer ring have turned the same way by the same angle (the hive is one piece)', dOut!==null&&dIn!==null&&dOut>0.44&&Math.abs(dOut-dIn)<0.01&&c.game==='play', 'outer '+deg(dOut)+' · inner '+deg(dIn)+' in '+dt.toFixed(2)+' s · spin '+c.spin);
  ok('2: the speed is as it was in v5.32 — 0.60 rad/s at level 3', Math.abs(c.spin-0.6)<1e-9, String(c.spin));
  ok('2: no cell runs over another — the nearest two centres stay a comb\'s step apart in both frames (27.7 px; the cells are 13 px in radius)', a.near!==undefined&&a.near>26.5&&c.near>26.5&&Math.abs(a.near-c.near)<0.05, 'near '+(a.near&&a.near.toFixed(2))+' → '+(c.near&&c.near.toFixed(2)));
  await win();
  ok('no page errors (the hive)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran — '+String(e&&e.stack||e).slice(0,500)) }
console.log(out.join('\n')); if(BEFORE) console.log('PASS before-shots taken (PW68_BEFORE=1, nothing judged)'); else if(out.some(l=>l.startsWith('FAIL'))) process.exit(1); process.exit(0) })();
