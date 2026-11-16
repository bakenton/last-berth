// pw66 — v5.31 (партия Никиты 16.11 на v5.29, design/PLAYTEST-v529-nikita.md, остаток группы A, и три ответа Никиты по v5.30):
//  A      «+N/yr on this line» — прирост вывоза, не мощность судна (не больше того, чего линии не хватает; 0 — серым);
//  B, C   desk → Helm в живых строках; doomsday и shift_long2 под нынешний лор;
//  п. 31  окно ковчега: капсул занято / куплено, людей всего и где они;      п. 22  запас хаба на первой вкладке его окна;
//  п. 24  хаб на мёртвой жиле — работающий хаб: цвет шара, советник и список миров не зовут эвакуировать;
//  п. 27  помощник ведёт к обменнику (отказ «не хватает ресурса» / запас Земли кончается);   п. 10  первый пакет улучшения — задание помощника;
//  п. 6   (ревизор v5.30) вердикт завода «add a hull» при судне на верфи — проверка, что он честный.
// Клики — мышью по видимым кнопкам; состояние готовится через ядро. Снимки: PW66_SHOTS=<папка>. Сборка: PW66_FILE (по умолчанию page.html).
// PW66_BEFORE=1 — тот же путь по старой сборке только ради снимков «до»: итог не судит.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path'), zlib=require('zlib');
const SHOTS=process.env.PW66_SHOTS||null, BEFORE=!!process.env.PW66_BEFORE, FILE=process.env.PW66_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
// a PNG (8 bit, RGB or RGBA, not interlaced) → pixels: to count the hub's magenta on the chart
function png(buf){ let o=8, W=0, H=0, ct=0; const id=[];
  while(o<buf.length){ const len=buf.readUInt32BE(o), type=buf.toString('ascii',o+4,o+8), d=buf.subarray(o+8,o+8+len);
    if(type==='IHDR'){ W=d.readUInt32BE(0); H=d.readUInt32BE(4); ct=d[9] } else if(type==='IDAT') id.push(d); o+=12+len }
  const bpp=ct===6?4:3, raw=zlib.inflateSync(Buffer.concat(id)), st=W*bpp, px=Buffer.alloc(H*st);
  for(let y=0;y<H;y++){ const f=raw[y*(st+1)]; for(let x=0;x<st;x++){ const v=raw[y*(st+1)+1+x], a=x>=bpp?px[y*st+x-bpp]:0, b=y?px[(y-1)*st+x]:0, c=(x>=bpp&&y)?px[(y-1)*st+x-bpp]:0;
      let r; if(f===0) r=v; else if(f===1) r=v+a; else if(f===2) r=v+b; else if(f===3) r=v+((a+b)>>1); else { const q=a+b-c, pa=Math.abs(q-a), pb=Math.abs(q-b), pc=Math.abs(q-c); r=v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c) }
      px[y*st+x]=r&255 } }
  return {W,H,bpp,px} }
const magenta=(buf,x0,y0,w,h)=>{ const g=png(buf); let n=0; for(let y=Math.max(0,y0);y<Math.min(g.H,y0+h);y++) for(let x=Math.max(0,x0);x<Math.min(g.W,x0+w);x++){ const i=y*g.W+x, r=g.px[i*g.bpp], gr=g.px[i*g.bpp+1], b=g.px[i*g.bpp+2]; if(r>150&&b>150&&gr<130&&r-gr>60) n++ } return n };
const nums=t=>(String(t).match(/[\d][\d\s   ]*(?:\.\d+)?/g)||[]).map(x=>+x.replace(/[^\d.]/g,''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n,sel)=>{ if(!SHOTS) return; const f=path.join(SHOTS,n+'.png'); const e=sel&&await pg.$(sel); if(e&&await e.isVisible()) await e.screenshot({path:f}); else await pg.screenshot({path:f}) };
  const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const toast=()=>p.evaluate(()=>(document.getElementById('toasts')||{}).textContent||'');   // textContent: the toasts are hidden while the helper speaks
  const reopen=async pid=>{ await p.evaluate(()=>{ LNU.win=null; LNU.tab=null; LNU.pop=null; LNdraw() }); const r=await U.openWorld(pid); await p.waitForTimeout(250); return r };
  const helper=()=>p.evaluate(()=>{ const t=LNI.tut(), h=document.querySelector('#helper .htx'), r=document.getElementById('tutRing'); return {msg:t.msg||null,mode:t.mode||null,q:t.q,help:t.help,text:h?h.textContent:'',ring:!!r&&getComputedStyle(r).display!=='none',win:LNU.win,wtab:LNU.wtab} });
  const SAID=[]; const note=h=>{ if(h.msg&&h.text&&!SAID.some(x=>x.id===h.msg)) SAID.push({id:h.msg,text:h.text,win:h.win}) };
  const waitMsg=async(id,n=30)=>{ let h; for(let i=0;i<n;i++){ h=await helper(); note(h); if(h.msg===id) return h; if(await p.isVisible('#pfL [data-act="pfok"]')){ await U.tap('#pfL [data-act="pfok"]'); continue } if(h.msg&&h.mode==='see') await U.tap('#helper [data-act="tutok"]'); else await p.waitForTimeout(150) } return h };
  const quiet=async()=>{ for(let i=0;i<40;i++){ if(await p.isVisible('#pfL [data-act="pfok"]')){ await U.tap('#pfL [data-act="pfok"]'); continue } const h=await helper(); note(h); if(!h.msg&&!h.q.length){ await p.waitForTimeout(250); const h2=await helper(); if(!h2.msg&&!h2.q.length) return true; continue } if(h.msg&&h.mode==='see') await U.tap('#helper [data-act="tutok"]'); else await p.waitForTimeout(150) } return false };

  // ---------- setup: two worlds and a works of ring I, Earth rich ----------
  const A=await p.evaluate(()=>{ LN.safe=true; const d=dockWorld(LN,0), r1=PLANETS.filter(q=>q.sec===0&&q.id!==d);
    const nw=r1.filter(q=>q.kind!=='works').sort((a,b)=>a.dist-b.dist); return {w1:nw[0].id, w2:nw[1].id, wk:(r1.filter(q=>q.kind==='works')[0]||{}).id} });
  await p.evaluate(A=>{ GOD.maxAll(); for(const k of [A.w1,A.w2,A.wk]){ if(k&&!LN.colonies[k]&&!enRoute(LN,k)){ LNU.win=k; GOD.settle() } } LNU.win=null;
    for(let i=0;i<400&&![A.w1,A.w2,A.wk].every(k=>!k||LN.colonies[k]);i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    for(let i=0;i<60;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    LN.ships.forEach(s=>{ if(s.mode!=='dead'&&!s.job) clearLine(LN,s.id) }); GOD.maxAll(); LNU.notes=[]; LNdraw() },A);
  await p.waitForTimeout(2600);   // the gift chips of the landings fly off the screen
  ok('setup: two worlds and a works of ring I settled', await p.evaluate(A=>[A.w1,A.w2,A.wk].every(k=>k&&!!LN.colonies[k]),A), JSON.stringify(A));

  // ---------- A: «+N/yr on this line» is what the hull adds, not what she can carry ----------
  const F=await p.evaluate(A=>{ const g=LN.gen||0, ix=k=>HULLS.findIndex(h=>h.key===k&&h.gen===g); LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth') s.reserve=false });
    const c=LN.colonies[A.w1]; c.pop=c.pop*2.6/lineRate(LN,A.w1).makes;   // a young world: she gives 2.6 a year — less than a hauler can carry (Nikita's shot: the world gives 4.1, the hull said +8.8)
    return {c:GOD.hull(ix('courier')).id, h:GOD.hull(ix('hauler')).id, h2:GOD.hull(ix('hauler')).id} },A);
  const gain=pid=>p.evaluate(pid=>{ const f=lineFit(LN,pid), lr=lineRate(LN,pid);
    return {makes:lr.makes, gap:f.gap, dry:lr.dry, sitting:lr.sitting, carries:f.carries,
      rows:[...document.querySelectorAll('#addblk .hr[id^="ah-"]')].map(e=>{ const id=+e.id.slice(3), s=LN.ships.find(x=>x.id===id), y=e.querySelector('.ay'); return {id, y:hullYield(LN,pid,s), t:y?y.textContent:'', col:y?getComputedStyle(y).color:''} }),
      cards:[...document.querySelectorAll('#ordblk .oc[id]')].map(e=>{ const y=e.querySelector('.oy'), bt=e.querySelector('[data-act="order"]'); return {id:e.id, y:bt?hullYield(LN,pid,{hull:+bt.dataset.h}):null, t:y?y.textContent:'', col:y&&y.firstElementChild?getComputedStyle(y.firstElementChild).color:''} }).filter(c=>c.t)} },pid);
  const fits=(t,v)=>{ const m=/^\+([\d.\s  ]+)\/yr on this line$/.exec(t); if(!m) return false; const x=+m[1].replace(/[^\d.]/g,''); return Math.abs(x-v)<=(v<10?0.051:0.51) };
  ok('a settled world opens by the mouse', await reopen(A.w1));
  let g1=await gain(A.w1); await shot(p,'a1-line-gain-free-hulls','#ovl .win');
  if(!BEFORE){
    ok('A: a hull that can carry more than the world gives is there to try the cap', g1.rows.some(r=>r.y>g1.gap+0.1)&&g1.gap>0.5, JSON.stringify({makes:g1.makes,gap:g1.gap,y:g1.rows.map(r=>+r.y.toFixed(2))}));
    ok('A: every free hull says what she would ADD: min(her yield, what the line still lacks)', g1.rows.length>=3&&g1.rows.every(r=>fits(r.t,Math.min(r.y,g1.gap))), g1.rows.map(r=>r.t+' (yield '+r.y.toFixed(1)+', lacks '+g1.gap.toFixed(1)+')').join(' · '));
    ok('A: no hull promises more than the world gives', g1.rows.concat(g1.cards).every(r=>nums(r.t)[0]<=g1.makes+0.051), 'makes '+g1.makes.toFixed(2)+' · '+g1.rows.concat(g1.cards).map(r=>r.t).join(' · '));
    ok('A: the yard cards say the same number — the gain, capped', g1.cards.length>=2&&g1.cards.every(c=>fits(c.t,Math.min(c.y,g1.gap))), g1.cards.map(c=>c.id+' '+c.t+' (yield '+c.y.toFixed(1)+')').join(' · '));
    // a hull that carries it all goes on the line by the mouse: the rest add nothing
    await U.tap('#ah-'+F.h+' [data-act="assign"]'); await p.waitForTimeout(300);
    ok('the world opens again', await reopen(A.w1));
    g1=await gain(A.w1); await shot(p,'a2-line-gain-line-full','#ovl .win');
    ok('A: the line now carries all the world gives', g1.gap<=0.001, 'gap '+g1.gap.toFixed(2)+' makes '+g1.makes.toFixed(2)+' carries '+g1.carries.toFixed(2));
    ok('A: every other hull says «+0.0/yr on this line», in grey', g1.rows.length>=2&&g1.rows.every(r=>r.t==='+0.0/yr on this line'&&r.col==='rgb(94, 93, 88)'), g1.rows.map(r=>r.t+' '+r.col).join(' · '));
    ok('A: the yard cards too', g1.cards.length>=2&&g1.cards.every(c=>c.t==='+0.0/yr on this line'&&c.col==='rgb(94, 93, 88)'), g1.cards.map(c=>c.t+' '+c.col).join(' · '));
    // a dead seam with a pile on the surface: the pile is what is left to carry — the hull's own yield
    await p.evaluate(k=>{ const c=LN.colonies[k], q=planet(k); LN.reserves[k]=0; c.dry=true; c.store[q.dep]=3000; LNdraw() },A.w2);
    ok('the worked-out world opens', await reopen(A.w2));
    const g2=await gain(A.w2); await shot(p,'a3-line-gain-dead-seam-pile','#ovl .win');
    ok('A: on a dead seam with 3 000 on the surface a hull says her own yield (the pile is the work)', g2.dry&&g2.rows.length>=2&&g2.rows.every(r=>fits(r.t,r.y)&&r.y>0.5), g2.rows.map(r=>r.t+' (yield '+r.y.toFixed(1)+')').join(' · ')) }

  // ---------- p.6 of the reviewer: the works' «add a hull» with a hull in the yards ----------
  ok('the works open by the mouse', await reopen(A.wk));
  const vd=()=>p.evaluate(k=>{ const f=lineFit(LN,k), v=document.querySelector('#ovl .vd'); return {share:f.need>0?f.carries/f.need:0, vd:v?v.innerText.replace(/\s+/g,' ').trim():'', fed:(document.querySelector('#ovl .fed .lbl b')||{}).innerText||''} },A.wk);
  const v0=await vd();
  ok('works with no line: «The line brings too little · ADD A HULL»', /The line brings too little ADD A HULL/i.test(v0.vd)&&v0.fed==='0%', JSON.stringify(v0));
  await U.tap('#oc-courier [data-act="order"]'); await p.waitForTimeout(300);
  const v1=await vd(); await shot(p,'r6-works-verdict-courier-in-yard','#ovl .win');
  ok('a courier in the yards for it brings under 75% — the verdict stands, and it is true', v1.share<0.75&&/ADD A HULL/i.test(v1.vd), JSON.stringify(v1));
  await U.tap('#oc-hauler [data-act="order"]'); await p.waitForTimeout(300);
  const v2=await vd(); await shot(p,'r6-works-verdict-gone','#ovl .win');
  ok('a hauler ordered on top closes the line — the verdict is gone while both are still in the yards', v2.share>=0.75&&!v2.vd&&await p.evaluate(k=>onLine(LN,k).every(s=>s.mode==='building'),A.wk), JSON.stringify(v2));

  // ---------- B, C: desk → Helm; doomsday and shift_long2 in the present lore ----------
  await p.keyboard.press('Escape');
  const TX=await p.evaluate(()=>{ const rows=JSON.parse(document.getElementById('lb-texts').textContent), by={}; rows.forEach(r=>{ by[r[0]+'.'+r[1]]=r });
    return {desk:rows.filter(r=>r[0]!=='GUIDE'&&/\bdesks?\b/i.test(r[2])).map(r=>r[0]+'.'+r[1]), doom:by['VOICE.doomsday.1'], long2:by['LOG.shift_long2'], takes:rows.filter(r=>/TAKES THE HELM/.test(r[2])).length} });
  if(!BEFORE){
    ok('B: «desk» is left only in fifteen rows no code of the build reads (the old intro, prologue and windows)', TX.desk.sort().join()==='UI.chronTag,UI.endB,UI.endChron,UI.endNightB3,UI.gDone,UI.logDesk,UI.nar_N01_4,UI.nightGo,UI.open.c3,UI.open.c4,UI.open.c5,UI.openBegin,UI.shiftT,UI.startSkip,UI.t5go', TX.desk.join(' '));
    ok('B: every shift line says SHIFT N TAKES THE HELM', TX.takes===22, TX.takes);
    ok('C: doomsday.1 — the hall of the Helm and the name plates, no square; EN and RU keep {n} {b} {h}', /hall of the Helm/.test(TX.doom[2])&&/name plates/.test(TX.doom[2])&&!/square|desk/.test(TX.doom[2])&&/зал Пульта/.test(TX.doom[3])&&!/площадь/.test(TX.doom[3])&&['{n}','{b}','{h}'].every(k=>TX.doom[2].includes(k)&&TX.doom[3].includes(k)), TX.doom[2].slice(0,120));
    ok('C: shift_long2 — the shift raises its children for the drive, no students', /raises its children for one trade now: the drive/.test(TX.long2[2])&&!/student|desk/i.test(TX.long2[2])&&!/учеников/.test(TX.long2[3])&&['{n}','{n2}','{c}'].every(k=>TX.long2[2].includes(k)&&TX.long2[3].includes(k)), TX.long2[2]) }
  // seen by the player: the shift window, a shift line and the doomsday voice
  await p.evaluate(()=>{ LNU.shiftStop=true; for(let i=0;i<200&&!LN.shiftOpen;i++){ tick(LN); LN.pauseNow=false } LNdraw() }); await p.waitForTimeout(400);
  const sh=await p.evaluate(()=>({big:LNI.big(), t:document.getElementById('noteL').innerText.replace(/\s+/g,' ')}));
  await shot(p,'b1-shift-window','#noteL');
  if(!BEFORE) ok('B: the shift window — «hands over the Helm» and the button TAKE THE HELM', sh.big==='shift'&&/Shift \d+ hands over the Helm\./.test(sh.t)&&/TAKE THE HELM/i.test(sh.t)&&!/desk/i.test(sh.t), sh.t.slice(0,160));
  await U.tap('#noteL [data-act="shiftok"]'); await p.waitForTimeout(250);
  let dm=''; for(let i=0;i<8&&!/hall of the Helm|площадь|square in front/.test(dm);i++){
    await p.evaluate(i=>{ LNU.notes=[]; if(!LN.night) GOD.nightIn(900); LN.nightSeen=true; LN.day+=1; log(LN,'doomsday',{n:300+i,b:600,h:Math.round(LN.earth.people)}); LNdraw() },i); await p.waitForTimeout(450);
    dm=await p.evaluate(()=>(document.getElementById('pfL')||{}).innerText||''); if(!/hall of the Helm|square in front/.test(dm)){ await p.evaluate(()=>{ LNU.pf=null; LNdraw() }); await p.waitForTimeout(150) } }
  await shot(p,'c1-doomsday-voice','#pfL');
  if(!BEFORE) ok('C: the voice of doomsday as the player hears it — the hall of the Helm, the name plates, the bulkheads', /hall of the Helm is full every morning: people stand under the name plates and wait/.test(dm)&&/paint on the bulkheads/.test(dm)&&!/desk|square/.test(dm), dm.replace(/\s+/g,' ').slice(0,200));
  if(await p.isVisible('#pfL [data-act="pfok"]')) await U.tap('#pfL [data-act="pfok"]'); await p.evaluate(()=>{ LNU.pf=null; LNdraw() }); await p.waitForTimeout(200);

  // ---------- p.31: the Ark window — pods filled of pods bought, people in all and where ----------
  await p.evaluate(()=>{ LNU.notes=[]; LNU.win=null; LNU.tab=null; GOD.nightIn(900); LN.nightSeen=true; GOD.maxAll(); LNdraw() }); await p.waitForTimeout(200);
  await U.tab('ark'); await p.waitForTimeout(300);
  const ark=()=>p.evaluate(()=>{ const T=id=>{ const e=document.getElementById(id); return e?e.innerText.replace(/\s+/g,' ').trim():null }, N=id=>{ const e=document.querySelector('#'+id+' b'); return e?+e.textContent.replace(/[^\d]/g,''):null };
    let wp=0, hp=0; for(const k in LN.colonies) wp+=Math.floor(LN.colonies[k].pop); LN.ships.forEach(s=>{ if(s.mode!=='dead') hp+=(s.crew||0)+((s.cargo&&s.cargo.people)||0) });
    const r=document.getElementById('arkppl'), w=document.querySelector('#ovl .win'), R=e=>e?e.getBoundingClientRect():null, a=R(r), c=R(w);
    return {pods:T('arkpods'), all:T('arkall'), nAll:N('arkall'), home:N('arkhome'), hulls:N('arkhulls'), worlds:N('arkworlds'), labels:[...document.querySelectorAll('#arkppl .ah-3 small')].map(e=>e.innerText.trim()).join(),
      st:{earth:Math.floor(LN.earth.people), hulls:Math.floor(hp), worlds:wp, caps:arkCaps(arkRings(LN)), filled:arkCapsuled(LN)}, inside:!!(a&&c&&a.bottom<=c.bottom+1&&a.right<=c.right+1&&a.width>200), wake:T('arkwake'), sleep:T('arksleep')} });
  let k0=await ark(); await shot(p,'p31-ark-no-ring','#ovl .win');
  if(!BEFORE){
    ok('p.31: the Ark window has the block, inside the window', k0.inside, JSON.stringify(k0).slice(0,240));
    ok('p.31: before the first ring — «Pods filled 0 / 0»', /^Pods filled 0 \/ 0$/.test(k0.pods), k0.pods);
    ok('p.31: «People in all» = Earth + fleet + worlds, each as the game holds it', k0.nAll===k0.st.earth+k0.st.hulls+k0.st.worlds&&k0.home===k0.st.earth&&k0.hulls===k0.st.hulls&&k0.worlds===k0.st.worlds&&k0.worlds>0&&k0.hulls>0, JSON.stringify({all:k0.nAll,home:k0.home,hulls:k0.hulls,worlds:k0.worlds,st:k0.st}));
    ok('p.31: the three cells are EARTH · FLEET · WORLDS', /^EARTH,FLEET,WORLDS$/i.test(k0.labels), k0.labels) }
  const bought=await p.evaluate(()=>{ GOD.maxAll(); const r=arkBuy(LN,1); LN.earth.people=737; LNdraw(); return r }); await p.waitForTimeout(300);
  const k1=await ark(); await shot(p,'p31-ark-ring-one','#ovl .win');
  if(!BEFORE){
    ok('p.31: one ring bought, 737 at home and crews at the pier — pods filled 600 / 600', bought==='ok'&&k1.st.caps===600&&k1.st.filled===600&&/^Pods filled 600 \/ 600$/.test(k1.pods), bought+' '+k1.pods);
    await p.evaluate(()=>{ LN.earth.people=107; LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth'){ s.mode='transit'; s.t=5; s.dest='earth'; s.at=null } }); LNdraw() }); await p.waitForTimeout(300);
    const k2=await ark(); await shot(p,'p31-ark-107-of-600','#ovl .win');
    ok('p.31: Nikita\'s shot — 107 at home, nobody at the pier: «Pods filled 107 / 600», and the sum still holds', /^Pods filled 107 \/ 600$/.test(k2.pods)&&k2.home===107&&k2.nAll===107+k2.hulls+k2.worlds, k2.pods+' · '+k2.all+' · '+k2.home+'+'+k2.hulls+'+'+k2.worlds) }
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ if(s.mode==='transit'&&s.dest==='earth'&&!s.from&&!s.job){ s.mode='idle'; s.at='earth'; s.dest=null; s.t=0 } }); GOD.maxAll(); LNU.win=null; LNdraw() });

  // ---------- setup: a hub on ring II ----------
  const H=await p.evaluate(()=>{ GOD.maxAll(); GOD.drive(); GOD.drive(); LN.gen=1; LN.driveLvl=Math.max(1,K.KIT_GATE_DRIVE);
    const nw=PLANETS.filter(x=>x.kind!=='works'&&!LN.colonies[x.id]&&!(LN.ghost&&LN.ghost[x.id]));
    const hub=nw.filter(x=>x.sec===1).sort((a,b)=>a.dist-b.dist)[0], fd=nw.filter(x=>x.sec===2&&x.dist>hub.dist).sort((a,b)=>a.dist-b.dist);
    const W={hub:hub.id,f1:fd[0].id};
    for(const k of [W.hub,W.f1]){ LNU.win=k; GOD.settle() } LNU.win=null;
    for(let i=0;i<3000&&![W.hub,W.f1].every(k=>LN.colonies[k]);i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    LN.ships.forEach(s=>{ if(s.mode!=='dead'&&!s.job&&[W.hub,W.f1].indexOf(s.from)>=0) clearLine(LN,s.id) });
    GOD.maxAll(); W.r=[buildHub(LN,W.hub),setVia(LN,W.f1,W.hub)].join();
    const g=LN.gen||0, i=HULLS.findIndex(h=>h.key==='hauler'&&h.gen===g), s1=GOD.hull(i), s2=GOD.hull(i); W.l=[setLine(LN,s1.id,W.hub,'earth'),setLine(LN,s2.id,W.f1,W.hub)].join();
    [W.hub,W.f1].forEach(k=>{ LN.reserves[k]=1e7 }); for(let n=0;n<40;n++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    const c=LN.colonies[W.hub]; c.store.metal=1234; c.store.food=567; c.store.parts=89; c.store.fuel=0; W.dep=planet(W.hub).dep; W.name=planet(W.hub).name;
    LNU.notes=[]; LNU.wtab='world'; LNdraw(); return W });
  await p.waitForTimeout(2600);
  ok('setup: a hub on ring II with a line to Earth and a feeder', /^ok,ok$/.test(H.r)&&!!H.l, JSON.stringify(H));

  // ---------- p.22: the hub's store on the first tab of her card ----------
  ok('the hub opens by the mouse', await reopen(H.hub));
  const hs=await p.evaluate(()=>{ const e=document.getElementById('hubstock'), r=e&&e.getBoundingClientRect(), pan=e&&e.closest('[data-pan]');
    return {t:e?e.innerText.replace(/\s+/g,' ').trim():null, vis:!!(r&&r.width>100&&r.height>8), tab:pan?pan.dataset.pan:null, surf:[...document.querySelectorAll('#rw-carries .rw span:first-child')].map(x=>x.innerText.trim()).join('|'), n:e?[...e.querySelectorAll('.hstk span')].map(x=>+x.textContent.replace(/[^\d]/g,'')):[]} });
  await shot(p,'p22-hub-store-world-tab','#ovl .win');
  if(!BEFORE){
    ok('p.22: on the WORLD tab of a hub — «In the hub\'s store» with every resource she holds', hs.vis&&hs.tab==='wtab:world'&&/^In the hub's store/.test(hs.t)&&hs.n.join()==='1234,567,89', JSON.stringify(hs));
    ok('p.22: it stands where «On the surface» stood (no second row for the same pile)', !/On the surface/.test(hs.surf), hs.surf);
    ok('p.22: the core keeps no limit for a store — nothing to draw as a capacity', await p.evaluate(k=>storeCap(LN.colonies[k])===Infinity,H.hub)) }

  // ---------- p.24: a hub on a dead seam is a working hub ----------
  // the picture is taken from the chart's element, not from the page: regress.sh makes page.screenshot a no-op unless --shots
  const sphere=async pid=>{ const r=await p.evaluate(pid=>{ const c=document.querySelector('#map .wd[data-p="'+pid+'"] circle[fill="transparent"]'), m=document.getElementById('map3d'); if(!c||!m) return null; const q=c.getBoundingClientRect(), o=m.getBoundingClientRect(); return {x:q.left+q.width/2-o.left,y:q.top+q.height/2-o.top} },pid);
    return r?magenta(await (await p.$('#map3d')).screenshot(),Math.round(r.x-9),Math.round(r.y-9),18,18):-1 };
  await p.evaluate(()=>{ LNU.win=null; LNU.tab=null; LNdraw() }); await p.waitForTimeout(900);
  const m0=await sphere(H.hub); await shot(p,'p24-map-hub-live-seam');
  await p.evaluate(([H,A,F])=>{ LN.reserves[H.hub]=0; LN.colonies[H.hub].dry=true; setLine(LN,F.h2,A.w2,'earth'); LNU.notes=[]; LNdraw() },[H,A,F]); await p.waitForTimeout(1200);
  const m1=await sphere(H.hub), m2=await sphere(A.w2); await shot(p,'p24-map-hub-dead-seam');
  const dh=await p.evaluate(([H,A])=>{ const adv=LNI.adv().map(r=>({pid:r[3],t:r[1],c:r[2]})); return {wst:LNI.wst(H.hub), wstDry:LNI.wst(A.w2), advHub:adv.filter(r=>r.pid===H.hub).map(r=>r.t+' / '+r.c), advDry:adv.filter(r=>r.pid===A.w2).map(r=>r.t+' / '+r.c)} },[H,A]);
  if(!BEFORE){
    ok('p.24: on the chart the sphere of a hub on a dead seam turns to the hub\'s magenta', m0<=2&&m1>=25, 'magenta pixels in 18×18 at the sphere: live seam '+m0+' → dead seam '+m1);
    ok('p.24: a worked-out world that is no hub keeps her own colour', m2<=2, 'magenta at the dry mine: '+m2);
    ok('p.24: the advisor does not call the hub a dead seam nor tell to evacuate her', dh.wst!=='dry'&&dh.wst!=='dead'&&!dh.advHub.some(t=>/seam|evacuate/i.test(t)), JSON.stringify(dh));
    ok('p.24: a worked-out world that is no hub is told as before — «seam dead … Haul it home, then evacuate»', dh.wstDry==='dry'&&dh.advDry.some(t=>/seam dead, .* on the surface \/ Haul it home, then evacuate/.test(t)), JSON.stringify(dh.advDry)) }
  ok('the dry hub opens by the mouse', await reopen(H.hub));
  const dw=await p.evaluate(()=>{ const rows=[...document.querySelectorAll('#ovl .wcol.wl .rw')], d=rows.filter(r=>/^Deposit/.test(r.innerText))[0], b=d&&d.querySelector('b'), dot=document.querySelector('#ovl .wrail [data-v="world"] .wdot');
    return {dep:d?d.innerText.replace(/\s+/g,' '):'', col:b?getComputedStyle(b).color:'', dot:dot?dot.className:'', alert:[...document.querySelectorAll('#ovl .wcol.wl .alert')].map(e=>e.innerText).join('|'), stock:(document.getElementById('hubstock')||{}).innerText||'', evac:!!document.querySelector('#ovl [data-act="evac"]'), short:(l=>l.carries<l.makes*0.8)(lineRate(LN,LNU.win))} });
  await shot(p,'p24-dry-hub-card','#ovl .win');
  if(!BEFORE){ ok('p.24: her card — «Deposit worked out» in grey, no «seam is dead… evacuate», the store in numbers; EVACUATE is still there (the rule is not touched)', /worked out/.test(dw.dep)&&dw.col==='rgb(156, 155, 149)'&&!/seam is dead/i.test(dw.alert)&&/1\s?234/.test(dw.stock)&&dw.evac, JSON.stringify(dw));
    ok('p.24: the red dot of her WORLD tab speaks for her line only — here it carries under 80% of what the feeders bring, so it is lit (reviewer v5.31: a dry hub\'s thin line was mute)', dw.short&&/red/.test(dw.dot), JSON.stringify({short:dw.short,dot:dw.dot}));
    const s2=await p.evaluate(H=>{ const g=LN.gen||0, i=HULLS.findIndex(h=>h.key==='freighter'&&h.gen===g); for(let n=0;n<3;n++){ const s=GOD.hull(i>=0?i:HULLS.findIndex(h=>h.key==='hauler'&&h.gen===g)); setLine(LN,s.id,H.hub,'earth') } for(let n=0;n<12;n++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LN.reserves[H.hub]=0; LNU.notes=[]; LNdraw(); const l=lineRate(LN,H.hub), dot=document.querySelector('#ovl .wrail [data-v="world"] .wdot'); return {short:l.carries<l.makes*0.8, carries:+l.carries.toFixed(1), makes:+l.makes.toFixed(1), dot:dot?dot.className:''} },H);
    ok('p.24: more hulls on her line — it keeps up, and the dot is gone though the seam is dead', !s2.short&&!/red/.test(s2.dot), JSON.stringify(s2)) }
  await p.evaluate(()=>{ LNU.win=null; LNdraw() }); await U.tab('worlds'); await p.waitForTimeout(300);
  const wl=await p.evaluate(([H,A])=>{ const row=k=>{ const e=document.querySelector('.side .tr[data-v="'+k+'"]'); return e?e.innerText.replace(/\s+/g,' ').trim():'' }; return {hub:row(H.hub), dry:row(A.w2)} },[H,A]);
  await shot(p,'p24-worlds-list','.side');
  if(!BEFORE) ok('p.24: the Worlds list — the hub is not «seam dead», the dry mine is', !/seam|dead|worked/i.test(wl.hub.replace(/^\S+/,''))&&/\S/.test(wl.hub)&&wl.dry!==''&&wl.dry!==wl.hub, wl.hub+' ‖ '+wl.dry);
  await U.tab('worlds');

  if(!BEFORE){
  // ---------- p.10: the first upgrade package is a task of the helper ----------
  const KW=await p.evaluate(A=>{ GOD.maxAll(); const g=LN.gen||0, need=kitCost(LN.colonies[A.w1]).w, i=HULLS.findIndex(h=>h.gen===g&&h.cap>=need&&h.key!=='courier');
    LN.reserves[A.w1]=1e7; const s=GOD.hull(i), r=setLine(LN,s.id,A.w1,'earth'); for(let n=0;n<30;n++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    const kg=kitGain(LN,A.w1); LNU.notes=[]; LNU.win=null; LNU.tab=null; LNdraw();
    return {r, need, hold:lineHold(LN,A.w1), open:kitOpen(LN), can:canKit(LN,A.w1), now:kg.now, wth:kg.with, x:K.KIT_OUT, name:planet(A.w1).name, kits:Object.keys(LN.colonies).filter(k=>LN.colonies[k].tier||LN.colonies[k].kit).length} },A);
  ok('setup: packages open, a hull on the line that lifts one, none ordered yet', KW.open&&KW.can==='ok'&&KW.hold>=KW.need&&KW.kits===0, JSON.stringify(KW));
  await U.tap('[data-act="pop"][data-v="menu"]'); await U.tap('[data-act="help"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const hk=await waitMsg('mK'); await p.waitForTimeout(350); const hk2=await helper();
  const pk=await p.evaluate(()=>{ const e=document.getElementById('pkg'), r=e&&e.getBoundingClientRect(), g=document.getElementById('tutRing').getBoundingClientRect(); return {vis:!!(r&&r.width>100), gain:e?(e.querySelector('.pk-g')||{}).innerText.replace(/\s+/g,' '):'', lit:!!r&&Math.abs(g.left-r.left)<12&&Math.abs(g.top-r.top)<12&&Math.abs(g.width-r.width)<24} });
  await shot(p,'p10-first-package-task');
  const KG=await p.evaluate(k=>{ const c=LN.colonies[k], g=c&&kitGain(LN,k); return c?{name:planet(k).name, kind:planet(k).kind, now:g.now, wth:g.with, can:canKit(LN,k), hold:lineHold(LN,k), w:kitCost(c).w}:null },hk2.win);
  ok('p.10: with the helper on she gives the task — a world that can take a package now, her card on UPGRADE, the package lit', hk.help&&hk2.msg==='mK'&&hk2.mode==='do'&&!!KG&&KG.can==='ok'&&KG.hold>=KG.w&&KG.kind!=='works'&&hk2.wtab==='up'&&pk.vis&&pk.lit&&hk2.ring, JSON.stringify(Object.assign({},hk2,pk,KG)).slice(0,300));
  const mk=/^Upgrade packages are open\. With one, (\S+) gives ×([\d.]+): ([\d.]+) → ([\d.]+) (metal|rations|fuel|parts) a year\. Order the first\.$/.exec(hk2.text)||[];
  ok('p.10: she says it in numbers — ×'+KW.x+', the world\'s output now → with the package', !!KG&&mk[1]&&mk[1].toUpperCase()===KG.name.toUpperCase()&&+mk[2]===KW.x&&Math.abs(+mk[3]-KG.now)<=(KG.now<10?0.051:0.51)&&Math.abs(+mk[4]-KG.wth)<=(KG.wth<10?0.051:0.51)&&Math.abs(KG.wth/KG.now-KW.x)<0.001&&nums(pk.gain)[0]>0, hk2.text+' · card: '+pk.gain+' · core: '+(KG?KG.now.toFixed(2)+' → '+KG.wth.toFixed(2):''));
  await p.mouse.click(700,450); await p.waitForTimeout(200);
  const miss=await p.evaluate(()=>({shk:document.getElementById('tutRing').classList.contains('shk'), msg:LNI.tut().msg}));
  ok('p.10: a press elsewhere is not let through (a task, as the first line and the first hull are)', miss.shk&&miss.msg==='mK', JSON.stringify(miss));
  await U.tap('#pkg [data-act="kit"]'); await p.waitForTimeout(350);
  const ka=await p.evaluate(k=>({kit:!!LN.colonies[k].kit||!!LN.colonies[k].kitShip, msg:LNI.tut().msg, log:LN.log.slice(-3).map(e=>e.code).join()}),hk2.win);
  ok('p.10: ORDER by the mouse — the package is ordered, the task is done', ka.kit&&ka.msg!=='mK'&&/kit_ordered/.test(ka.log), JSON.stringify(ka));
  ok('the helper falls quiet (the rules of the open card told, GOT IT)', await quiet());
  await p.evaluate(()=>{ LNU.win=null; LNdraw() }); await p.waitForTimeout(400);
  ok('p.10: said once — no second task while a package is on its way', (await helper()).msg!=='mK'&&!(await helper()).q.includes('mK'));

  // ---------- p.27: she leads to Earth's exchange when a button is refused for want of a resource ----------
  const early=SAID.filter(x=>x.id==='mX')[0]||null;   // the scenario's own jumps of Earth's stocks may have run one out on the way: she spoke already
  if(early) ok('p.27: (on the way) a stock running out with two piles beside it already brought her word, Earth open', /^Short of (rations|fuel|parts|metal), with \S+ and \S+ to spare\./.test(early.text)&&early.win==='earth', JSON.stringify(early));
  await p.evaluate(()=>{ GOD.maxAll(); LN.earth.metal=120; LN.stats.ex=0; delete LNU.tut.seen.mX; LNU.tut.ex=null; LNU.hist=[]; LNU.notes=[]; LNdraw() });
  ok('a world opens by the mouse', await reopen(A.w2)); ok('the helper is quiet before the press', await quiet());
  const ob=await p.evaluate(()=>{ const e=document.querySelector('#ordblk [data-act="order"][data-why="short_metal"]'); return e?{why:e.dataset.why,p:e.dataset.whyp,id:e.closest('.oc').id}:null });
  ok('setup: 120 metal at home — a hull in the yards is refused «short of metal»', !!ob, JSON.stringify(ob));
  await shot(p,'p27-a-refused-for-metal','#ovl .win');
  await U.tap('#'+ob.id+' [data-act="order"]'); await p.waitForTimeout(250);
  const tt=await toast(); const hx=await waitMsg('mX',20); await p.waitForTimeout(350);
  const ex=await p.evaluate(()=>{ const e=document.getElementById('exblk'), r=e&&e.getBoundingClientRect(), g=document.getElementById('tutRing').getBoundingClientRect(), on=q=>{ const b=document.querySelector(q+' button.on'); return b?b.dataset.v:null }, go=document.querySelector('#exblk [data-act="exgo"]');
    return {win:LNU.win, vis:!!(r&&r.width>100), lit:!!r&&Math.abs(g.left-r.left)<12&&Math.abs(g.top-r.top)<12, get:on('#exget'), pay:on('#expay'), n:on('#exn'), go:go?go.innerText.replace(/\s+/g,' ').trim():'', off:go?go.getAttribute('aria-disabled'):null, metal:Math.floor(LN.earth.metal)} });
  await shot(p,'p27-b-helper-leads-to-exchange');
  ok('p.27: the refusal is said as before (a toast with the shortfall)', /metal/i.test(tt), tt.slice(-120));
  ok('p.27: then she opens Earth and lights the exchange — metal chosen, a pair that has plenty, the amount that covers the gap', hx.msg==='mX'&&hx.mode==='see'&&ex.win==='earth'&&ex.vis&&ex.lit&&ex.get==='metal'&&!!ex.pay&&!/metal/.test(ex.pay)&&ex.off!=='true', JSON.stringify(Object.assign({text:hx.text},ex)).slice(0,300));
  ok('p.27: her words name what is short and what is to spare', /^Short of metal, with (rations|fuel|parts) and (rations|fuel|parts) to spare\. The exchange here turns two resources into a third — at a loss, to close a gap\.$/.test(hx.text), hx.text);
  await U.tap('#helper [data-act="tutok"]'); await p.waitForTimeout(250);
  await quiet();   // the first look into Earth's window has its own two words (m7, mH) for a player who never opened it
  await U.tap('#exblk [data-act="exgo"]'); await p.waitForTimeout(300);
  const ex2=await p.evaluate(()=>({metal:Math.floor(LN.earth.metal), ex:LN.stats.ex||0, msg:LNI.tut().msg, q:LNI.tut().q.join()}));
  await shot(p,'p27-c-exchanged','#ovl .win');
  ok('p.27: GOT IT, the exchange button by the mouse — metal is home (+'+ex.n+'), one exchange made, the old hint m26 does not repeat it', ex2.metal===ex.metal+(+ex.n)&&ex2.ex===1&&ex2.msg!=='m26'&&!/m26/.test(ex2.q), JSON.stringify(ex2));
  await quiet(); await p.evaluate(()=>{ LN.earth.metal=50; LNU.win=null; LNdraw() }); await reopen(A.w2); await quiet();
  const ob2=await p.evaluate(()=>{ const e=document.querySelector('#ordblk [data-act="order"][data-why="short_metal"]'); return e?e.closest('.oc').id:null });
  if(ob2){ await U.tap('#'+ob2+' [data-act="order"]'); await p.waitForTimeout(600) }
  ok('p.27: said once — the next refusal brings only its toast', !!ob2&&(await helper()).msg!=='mX'&&!(await helper()).q.includes('mX'), JSON.stringify(await helper()).slice(0,160));
  ok('no page errors', p.errs.length===0, p.errs.join(' | '));

  // ---------- p.27, the quiet way: a stock of Earth's runs out, two piles lie beside it ----------
  const q=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const Q=UI.ui(q);
  await Q.start('en',11); await Q.pause(); await q.waitForTimeout(300);
  await q.evaluate(()=>{ LN.safe=true; GOD.maxAll(); LN.earth.food=2000; LNU.hist=[]; LNdraw() }); let early2=null;   // piles of everything but rations; below, the larder is made to fall 25 a year (Earth alone eats less than she grows at the start)
  await Q.tap('[data-act="pop"][data-v="menu"]'); await Q.tap('[data-act="help"]'); await q.keyboard.press('Escape'); await q.waitForTimeout(300);
  let hq=null; await Q.play(4);
  for(let i=0;i<120;i++){ hq=await q.evaluate(()=>{ const nf=(LN.need||earthNeed(LN)).food; LN.earth.food=LN.day<12?2000-60*LN.day:Math.max(nf*20,nf*90-nf*2*(LN.day-12)); const t=LNI.tut(), h=document.querySelector('#helper .htx'); return {msg:t.msg||null,mode:t.mode,text:h?h.textContent:'',win:LNU.win,day:LN.day,food:Math.floor(LN.earth.food),eats:+((LN.need||{}).food||0).toFixed(1),big:LNI.big()} });
    if(hq.msg==='mX'&&hq.day<12&&!early2) early2=hq;
    if(hq.msg==='mX'||hq.day>120) break; if(hq.big) await Q.clear(); else if(hq.msg&&hq.mode==='see') await Q.tap('#helper [data-act="tutok"]'); else { if(await q.evaluate(()=>LNU.paused)) await Q.play(4); await q.waitForTimeout(250) } }
  await q.waitForTimeout(350); await shot(q,'p27-d-stock-runs-out');
  ok('p.27: Earth\'s rations run out (under a hundred years left) with metal, fuel and parts piled up — she leads to the exchange by herself', !early2&&hq.msg==='mX'&&hq.win==='earth'&&hq.day>=12&&hq.food>0&&hq.food<hq.eats*100&&/^Short of rations, with (metal|fuel|parts) and (metal|fuel|parts) to spare\./.test(hq.text), JSON.stringify(hq));
  ok('p.27: not on the bend of one big spend — the larder fell 60 a year for twelve years and still held centuries of Earth\'s own eating: she kept silent (reviewer v5.31)', !early2, JSON.stringify(early2));
  ok('no page errors (second page)', q.errs.length===0, q.errs.join(' | '));
  await q.close();

  // ---------- B, C seen by the player: the last lines of the chronicle on the end window ----------
  const r=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const R=UI.ui(r);
  await R.start('en',11); await R.pause(); await r.waitForTimeout(300);
  const en=await r.evaluate(()=>{ GOD.nightIn(3); LN.nightSeen=true; for(let i=0;i<40&&!LN.over;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    log(LN,'shift',{k:'long',n:4,n2:300,c:reach(LN),h:1,b:0,i:0}); LNU.notes=[]; LNU.pf=null; LNdraw(); return {over:LN.over, day:LN.day} }); await r.waitForTimeout(500);
  const ch=await r.evaluate(()=>{ const e=document.querySelector('#noteL .chron'); return {big:LNI.big(), t:e?e.innerText.replace(/\s+/g,' '):'', all:document.getElementById('noteL').innerText.replace(/\s+/g,' ').slice(0,300)} });
  await shot(r,'b2-end-window-chronicle','#noteL');
  ok('B, C: the end window\'s chronicle shows the shift\'s line as written — «SHIFT 4 TAKES THE HELM. 300 years to the Night. The shift raises its children for one trade now: the drive.»', !!en.over&&/SHIFT 4 TAKES THE HELM\. 300 years to the Night\. The shift raises its children for one trade now: the drive\./.test(ch.t)&&!/desk/i.test(ch.all), JSON.stringify(en)+' '+ch.t.slice(-330));
  ok('no page errors (third page)', r.errs.length===0, r.errs.join(' | '));
  }
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(!BEFORE&&out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
