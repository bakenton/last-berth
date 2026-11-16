// pw65 — v5.30 (партия Никиты 16.11 на v5.29, design/PLAYTEST-v529-nikita.md, группа A — правки без новых правил):
//  п. 1  нет свободного судна — под отказом кнопка в верфь;      п. 2  заказанное судно сразу видно в «Line carries» и в полосе (штриховкой);
//  п. 16 у судна из флота (FREE и OTHER LINES) — сколько оно повезёт на этой линии;   п. 25 завод: «Line brings» выше 100%;
//  п. 26 блок хаба у мира, который возит на хаб, — кнопка выключена и говорит почему;  п. 14 INSTITUTE → HELM;
//  п. 28 перевод, заказанный судну в полёте на линии мир ↔ хаб, исполняется у хаба (раньше читался только у Земли и висел вечно).
// Клики — мышью по видимым кнопкам; состояние готовится через ядро. Снимки: PW65_SHOTS=<папка>. Сборка: PW65_FILE (по умолчанию page.html).
// PW65_BEFORE=1 — тот же путь по старой сборке только ради снимков «до»: новых кнопок не жмёт, итог не судит.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW65_SHOTS||null, BEFORE=!!process.env.PW65_BEFORE, FILE=process.env.PW65_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n,sel)=>{ if(!SHOTS) return; const f=path.join(SHOTS,n+'.png'); const e=sel&&await pg.$(sel); if(e) await e.screenshot({path:f}); else await pg.screenshot({path:f}) };
  const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const toast=()=>p.evaluate(()=>(document.getElementById('toasts')||{}).innerText||'');
  const run=n=>p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNU.notes=[]; LNdraw() },n);
  const win=()=>p.evaluate(()=>{ const w=document.querySelector('#ovl .win'); return w?w.innerText.replace(/\s+/g,' '):'' });
  const reopen=async pid=>{ await p.evaluate(()=>{ LNU.win=null; LNU.pop=null; LNdraw() }); const r=await U.openWorld(pid); await p.waitForTimeout(250); return r };

  // ---------- p.1: no free hull → the way to the yards ----------
  const A=await p.evaluate(()=>{ LN.safe=true; const d=dockWorld(LN,0), r1=PLANETS.filter(q=>q.sec===0&&q.id!==d);
    const nw=r1.filter(q=>q.kind!=='works').sort((a,b)=>a.dist-b.dist); return {w1:nw[0].id, w2:nw[1].id, wk:(r1.filter(q=>q.kind==='works')[0]||{}).id, free:nw[2]?nw[2].id:d} });
  for(const k of [A.w1,A.w2]){ if(!(await p.evaluate(()=>LN.ships.some(s=>s.mode==='idle'&&s.at==='earth'&&!s.job)))) break;
    await U.openWorld(k); if(await p.$('#ovl [data-act="send"]:not([aria-disabled])')) await U.tap('#ovl [data-act="send"]'); await p.keyboard.press('Escape') }
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth') s.crewWait=true }); LNdraw() });   // whoever is left has no crew: nobody free at the pier
  ok('a free world opens by the mouse', await reopen(A.free));
  const n1=await p.evaluate(()=>{ const w=document.querySelector('#ovl .why'), y=document.querySelector('#toyard [data-act="tab"]'), s=document.querySelector('#ovl [data-act="send"]');
    const R=e=>e?e.getBoundingClientRect():null, a=R(w), c=R(y);
    return {why:w?w.innerText.trim():'', btn:y?y.innerText.replace(/\s+/g,' ').trim():'', v:y?y.dataset.v:'', under:!!(a&&c&&c.top>=a.bottom-1&&c.top-a.bottom<24&&c.width>200), code:s?s.dataset.why:''} });
  await shot(p,'p01-no-free-hull','#ovl .win');
  if(!BEFORE){
    ok('p.1: «No free hull at Earth.» and, right under it, the button to the yards', /^No free hull at Earth\.$/.test(n1.why)&&/^BUILD A HULL IN THE YARD$/i.test(n1.btn)&&n1.v==='yard'&&n1.under, JSON.stringify(n1));
    await U.tap('#ovl [data-act="send"]'); await p.waitForTimeout(200);
    ok('p.1: the refused SEND SETTLERS names the yards too', n1.code==='nofreeYard'&&/No free hull at Earth\. Build one in the Yard\./.test(await toast()), n1.code+' / '+await toast());
    await U.tap('#toyard [data-act="tab"]'); await p.waitForTimeout(250);
    const y1=await p.evaluate(()=>({win:LNU.win, t:(document.querySelector('#ovl .win')||{}).innerText||'', b:!!document.querySelector('#ovl [data-act="build"]')}));
    ok('p.1: the button opens the Yard on «Build a free hull»', y1.win==='yard'&&/BUILD A FREE HULL/i.test(y1.t)&&y1.b, y1.win+' / '+y1.t.slice(0,80).replace(/\n/g,' | '));
    await shot(p,'p01-yard-opened','#ovl .win');
    await p.keyboard.press('Escape') }
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ s.crewWait=false }); LNU.win=null; LNdraw() });

  // ---------- setup: worlds settled, Earth rich ----------
  await p.evaluate(A=>{ GOD.maxAll(); for(const k of [A.w1,A.w2,A.wk]){ if(k&&!LN.colonies[k]&&!enRoute(LN,k)){ LNU.win=k; GOD.settle() } } LNU.win=null;
    for(let i=0;i<400&&![A.w1,A.w2,A.wk].every(k=>!k||LN.colonies[k]);i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    for(let i=0;i<60;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }   // the settlers' hulls come home
    LN.ships.forEach(s=>{ if(s.mode!=='dead'&&!s.job) clearLine(LN,s.id) }); GOD.maxAll(); LNU.notes=[]; LNdraw() },A);
  await p.waitForTimeout(2600);   // the gift chips of the landings fly off the screen
  ok('setup: two worlds and a works of ring I settled', await p.evaluate(A=>[A.w1,A.w2,A.wk].every(k=>k&&!!LN.colonies[k]),A), JSON.stringify(A));

  // ---------- p.2: a hull ordered for the line is seen in «Line carries» and in the bar at once ----------
  const carr=()=>p.evaluate(()=>{ const r=document.getElementById('rw-carries'); if(!r) return null; const rows=[...r.querySelectorAll('.rw')].map(e=>e.innerText.replace(/\s+/g,' ').trim());
    const s=r.querySelector('.soon'), bar=r.querySelector('.bar.flow')||document.querySelector('#ovl .fed .bar'), W=e=>e?e.getBoundingClientRect().width:0, u=bar&&bar.querySelector('u:not(.soon)'), h=bar&&bar.querySelector('u.soon');
    return {rows, soon:s?s.innerText.trim():'', tip:s?s.title:'', sw:s?getComputedStyle(s.querySelector('i')).backgroundImage.slice(0,25):'', bar:Math.round(W(bar)), solid:Math.round(W(u)), hatch:Math.round(W(h)),
      hatchBg:h?getComputedStyle(h).backgroundImage.slice(0,25):'', hatchX:h&&u?Math.round(h.getBoundingClientRect().left-u.getBoundingClientRect().right):null} });
  await p.evaluate(()=>{ LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at==='earth') s.reserve=false }) });
  ok('a settled world opens by the mouse', await reopen(A.w1));
  let c0=await carr(); await shot(p,'p02-a-before-order','#ovl .win');
  ok('before the order: the line carries 0.0, the bar is empty, nothing is coming', !!c0&&/Line carries 0\.0\/yr$/.test(c0.rows[1])&&c0.solid===0&&c0.hatch===0&&!c0.soon, JSON.stringify(c0));
  await U.tap('#oc-courier [data-act="order"]'); await p.waitForTimeout(300);
  let c1=await carr(); const y2=await p.evaluate(w=>{ const s=onLine(LN,w)[0]; return s?{mode:s.mode,y:hullYield(LN,w,s),soon:lineFit(LN,w).carries,makes:lineRate(LN,w).makes,row:(document.querySelector('#hr-'+s.id)||{}).innerText||''}:null },A.w1);
  await shot(p,BEFORE?'p02-b-ordered-before':'p02-b-ordered','#ovl .win');
  ok('the hull is laid down for this line', !!y2&&y2.mode==='building'&&/in the yard/i.test(y2.row), JSON.stringify(y2));
  if(!BEFORE){
    ok('p.2: at once the number shows what is coming, apart from what flies — «0.0/yr +N»', /Line carries 0\.0\/yr \+\d/.test(c1.rows[1])&&Math.abs(parseFloat(c1.soon.replace('+',''))-y2.y)<0.06&&/yards/i.test(c1.tip), JSON.stringify(c1)+' / '+y2.y.toFixed(2));
    const want=Math.round(Math.min(1,y2.y/y2.makes)*c1.bar);
    ok('p.2: and the bar fills by that much, hatched (the solid part is still empty)', c1.solid===0&&Math.abs(c1.hatch-want)<=3&&c1.hatch>3&&/repeating-linear/.test(c1.hatchBg)&&/repeating-linear/.test(c1.sw), JSON.stringify({hatch:c1.hatch,want,bar:c1.bar,bg:c1.hatchBg}));
    await run(40); await reopen(A.w1); const c2=await carr();
    ok('p.2: when she flies the line the hatch is gone and the number is hers', !c2.soon&&c2.hatch===0&&c2.solid>3&&!/0\.0\/yr/.test(c2.rows[1]), JSON.stringify(c2));
    await shot(p,'p02-c-flying','#ovl .win') }
  else await run(40);

  // ---------- p.16: a hull of the fleet says what she would carry here ----------
  const F=await p.evaluate(A=>{ const g=LN.gen||0, ix=k=>HULLS.findIndex(h=>h.key===k&&h.gen===g), a=GOD.hull(ix('courier')), h=GOD.hull(ix('hauler')), o=GOD.hull(ix('hauler'));
    const r=setLine(LN,o.id,A.w2,'earth'); LNU.addTab='free'; LNdraw(); return {a:a.id,h:h.id,o:o.id,r, ya:hullYield(LN,A.w1,a), yh:hullYield(LN,A.w1,h), yo:hullYield(LN,A.w1,o)} },A);
  await reopen(A.w1);
  const rowOf=id=>p.evaluate(id=>{ const e=document.getElementById('ah-'+id); if(!e) return null; const y=e.querySelector('.ay'), bt=e.querySelector('.ha .b'), R=x=>x?x.getBoundingClientRect():null, a=R(y), c=R(bt);
    return {t:e.innerText.replace(/\s+/g,' ').trim(), y:y?y.innerText.trim():'', fits:!!(a&&c&&a.right<=c.left+1&&a.width>40), h:Math.round(R(e).height)} },id);
  const f1=await rowOf(F.a), f2=await rowOf(F.h); await shot(p,'p16-a-free','#addblk');
  if(!BEFORE){
    const num=s=>parseFloat((s.match(/^\+([\d.]+)\/yr on this line$/)||[])[1]);
    ok('p.16: FREE — every hull says «+N/yr on this line», her own number', !!f1&&!!f2&&Math.abs(num(f1.y)-F.ya)<0.06&&Math.abs(num(f2.y)-F.yh)<0.06&&F.ya!==F.yh, JSON.stringify([f1,f2,F.ya.toFixed(2),F.yh.toFixed(2)]));
    ok('p.16: the number stands in the row, left of ASSIGN, the row is no taller', f1.fits&&f2.fits&&f1.h<=44&&/ASSIGN$/i.test(f1.t), JSON.stringify([f1.fits,f2.fits,f1.h]));
    await U.tap('#addblk [data-act="addtab"][data-v="other"]'); await p.waitForTimeout(200);
    const f3=await rowOf(F.o); await shot(p,'p16-b-other-lines','#addblk');
    ok('p.16: OTHER LINES — the same number for a hull that would move here', F.r==='ok'&&!!f3&&Math.abs(num(f3.y)-F.yo)<0.06&&f3.fits&&/MOVE HERE$/i.test(f3.t), JSON.stringify(f3)+' / '+F.yo.toFixed(2));
    await U.tap('#addblk [data-act="addtab"][data-v="free"]');
    const cb=await carr(); await U.tap('#ah-'+F.h+' [data-act="assign"]'); await p.waitForTimeout(250); const ca=await carr();
    ok('p.16: ASSIGN puts her on the line and the line carries that much more', await p.evaluate(([w,id])=>shipById(LN,id).from===w,[A.w1,F.h])&&ca.solid>=cb.solid&&ca.rows[1]!==cb.rows[1], cb.rows[1]+' → '+ca.rows[1]) }
  else { await U.tap('#addblk [data-act="addtab"][data-v="other"]'); await p.waitForTimeout(200); await shot(p,'p16-b-other-lines','#addblk') }

  // ---------- p.25: the works — a line that brings more than it burns says so ----------
  const Wk=await p.evaluate(A=>{ const g=LN.gen||0, i=HULLS.findIndex(h=>h.key==='courier'&&h.gen===g); let n=0;
    while(n<12){ const f=lineFit(LN,A.wk); if(f.need>0.001&&f.carries/f.need>1.25) break; const s=GOD.hull(i); setLine(LN,s.id,A.wk,'earth'); n++ }
    for(let k=0;k<30;k++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } GOD.maxAll(); LNU.notes=[]; LNdraw();
    const f=lineFit(LN,A.wk); return {n, share:f.carries/f.need} },A.wk?A:null);
  await reopen(A.wk);
  const w1=await p.evaluate(()=>{ const f=document.querySelector('#ovl .fed'); if(!f) return null; const bar=f.querySelector('.bar'), u=bar.querySelector('u'), W=e=>e.getBoundingClientRect();
    return {pct:f.querySelector('.lbl b').innerText.trim(), over:W(u).right<=W(bar).right+0.5, full:Math.round(W(u).width)>=Math.round(W(bar).width)-1, col:getComputedStyle(f.querySelector('.lbl b')).color} });
  await shot(p,'p25-works-line-brings','#ovl .wcol.wl');
  if(!BEFORE) ok('p.25: «Line brings» shows the real share above 100%, the bar stops at its end', Wk.share>1.25&&!!w1&&w1.pct===Math.round(Wk.share*100)+'%'&&parseInt(w1.pct)>100&&w1.over&&w1.full, JSON.stringify(w1)+' / '+Wk.share.toFixed(3));
  await p.evaluate(()=>{ LNU.win=null; LNdraw() });

  // ---------- setup: a hub on ring II, two feeders on ring III ----------
  const H=await p.evaluate(()=>{ GOD.maxAll(); GOD.drive(); GOD.drive(); LN.gen=1; LN.driveLvl=Math.max(1,K.KIT_GATE_DRIVE);
    const nw=PLANETS.filter(x=>x.kind!=='works'&&!LN.colonies[x.id]);
    const hub=nw.filter(x=>x.sec===1).sort((a,b)=>a.dist-b.dist)[0], fd=nw.filter(x=>x.sec===2&&x.dist>hub.dist).sort((a,b)=>a.dist-b.dist);
    const W={hub:hub.id,f1:fd[0].id,f2:fd[1].id};
    for(const k of [W.hub,W.f1,W.f2]){ LNU.win=k; GOD.settle() } LNU.win=null;
    for(let i=0;i<3000&&![W.hub,W.f1,W.f2].every(k=>LN.colonies[k]);i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    for(let i=0;i<120;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    LN.ships.forEach(s=>{ if(s.mode!=='dead'&&!s.job&&[W.hub,W.f1,W.f2].indexOf(s.from)>=0) clearLine(LN,s.id) });   // a dock's gift hull would muddle the count
    GOD.maxAll(); W.r=[buildHub(LN,W.hub),setVia(LN,W.f1,W.hub),setVia(LN,W.f2,W.hub)].join(); W.hubName=(document.querySelector('#map .wd[data-p="'+W.hub+'"] text')||{}).textContent||'';
    LN.reserves[W.f1]=0; LN.colonies[W.f1].store[planet(W.f1).dep]=4367;   // as Pale on Nikita's shot: the seam dead, the pile still there
    LNU.notes=[]; LNU.wtab='world'; LNdraw(); return W });
  await p.waitForTimeout(2600);
  ok('setup: a hub, two worlds shipping to it', H.r==='ok,ok,ok', JSON.stringify(H));

  // ---------- p.26: a world that ships to a hub shows the hub block, the button off with its reason ----------
  for(const [k,tag] of [[H.f1,'worked-out, pile on the surface'],[H.f2,'live seam']]){
    ok('the feeder opens by the mouse ('+tag+')', await reopen(k));
    const hb=await p.evaluate(()=>{ const t=document.querySelector('#ovl .wrail [data-act="wtab"][data-v="hub"]'), b=document.querySelector('#hubblk [data-act="hubbuild"]');
      return {tab:!!t, btn:!!b, off:b?b.getAttribute('aria-disabled'):null, line:(document.getElementById('hubwhy')||{}).innerText||'', why:b?b.dataset.why:null, whyp:b?b.dataset.whyp:null, win:(document.querySelector('#ovl .win')||{}).innerText.slice(0,400).replace(/\s+/g,' ')} });
    if(BEFORE){ if(k===H.f1) await shot(p,'p26-feeder-hub-block','#ovl .win'); continue }
    ok('p.26: the card has a HUB tab and the build button, off, with the reason «hubFeeder» ('+tag+')', hb.tab&&hb.btn&&hb.off==='true'&&hb.why==='hubFeeder', JSON.stringify(hb).slice(0,260));
    await U.wtab('hub'); const seen=await p.evaluate(()=>{ const e=document.getElementById('hubwhy'), r=e&&e.getBoundingClientRect(); return {t:e?e.innerText.trim():'', vis:!!(r&&r.width>50&&r.height>8)} });
    ok('p.26: the reason stands over the button, in words ('+tag+')', seen.vis&&/^Ships to the hub at \S+ — a feeder cannot be a hub\.$/.test(seen.t), JSON.stringify(seen));
    await U.tap('#hubblk [data-act="hubbuild"]'); await p.waitForTimeout(250);
    const t=await toast(), isHubNow=await p.evaluate(k=>isHub(LN,k),k);
    ok('p.26: the press builds nothing and says why: this world ships to the hub ('+tag+')', !isHubNow&&/ships its goods to the hub at \S+\. A world that feeds a hub cannot be one/.test(t), t.slice(-200));
    if(k===H.f1) await shot(p,'p26-feeder-hub-block','#ovl .win') }
  if(!BEFORE){
    await U.wtab('world'); await U.tap('#viaseg [data-act="via"][data-v="earth"]'); await p.waitForTimeout(250);
    const hb2=await p.evaluate(k=>{ const b=document.querySelector('#hubblk [data-act="hubbuild"]'); return {via:LN.colonies[k].via||null, why:b?b.dataset.why:null, core:hubBuildCheck(LN,k)} },H.f2);
    ok('p.26: «Ship goods to → Earth» by the mouse — the reason «feeder» is gone (what is left is the hub limit of this drive)', hb2.via===null&&hb2.why==='hubCap'&&hb2.core==='hubCap', JSON.stringify(hb2));
    await p.evaluate(H=>{ setVia(LN,H.f2,H.hub); LNdraw() },H) }

  // ---------- p.28: a move ordered in flight on a world → hub line is carried out at the hub ----------
  const S=await p.evaluate(([H,A])=>{ [H.f1,H.f2,H.hub,A.w1].forEach(k=>{ LN.reserves[k]=1e7 }); const g=LN.gen||0, i=HULLS.findIndex(h=>h.key==='hauler'&&h.gen===g), mk=()=>{ const s=GOD.hull(i); return {id:s.id, r:setLine(LN,s.id,H.f1,'earth')} };
    const a=mk(), b2=mk(), c=mk(), d=mk(), s=shipById(LN,a.id);
    for(let k=0;k<2000&&!(s.mode==='transit'&&s.origin===H.f1&&s.dest===H.hub&&s.t>3);k++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false }
    GOD.maxAll(); LNU.notes=[]; LNU.addTab='other'; LNdraw();
    return {a:a.id,b:b2.id,c:c.id,d:d.id, r:[a.r,b2.r,c.r,d.r].join(), fly:s.mode+' '+s.origin+'>'+s.dest, to:shipById(LN,a.id).to} },[H,A]);
  ok('setup: four haulers on the feeder\'s line, all on their way to the hub', S.r==='ok,ok,ok,ok'&&S.to===H.hub&&S.fly==='transit '+H.f1+'>'+H.hub, JSON.stringify(S));
  await reopen(H.f2); await p.evaluate(()=>{ LNU.addTab='other'; LNdraw() }); await p.waitForTimeout(150);
  await U.tap('#ah-'+S.a+' [data-act="move"]'); await p.waitForTimeout(250);
  const m0=await p.evaluate(([id,w])=>{ const s=shipById(LN,id); return {moveTo:s.moveTo||null, from:s.from, a:LN.actions[LN.actions.length-1]} },[S.a,H.f2]);
  ok('MOVE HERE by the mouse on a hull in flight: the order is kept, she stays on her line for now', m0.moveTo===H.f2&&m0.from===H.f1&&m0.a&&m0.a.k==='move'&&m0.a.r==='queued', JSON.stringify(m0));
  await reopen(H.f1); const r0=await p.evaluate(id=>(document.getElementById('hr-'+id)||{}).innerText||'',S.a);
  ok('her row on the old line says «moves to … on docking»', /moves to \S+ on docking/i.test(r0), r0.replace(/\s+/g,' '));
  await shot(p,'p28-a-move-ordered','#ovl .wcol.wr');
  // the other three orders go through the core: the hub's own line, a world on an Earth line, a line queued by setLine
  const O=await p.evaluate(([S,H,A])=>({b:moveLine(LN,S.b,H.hub), c:moveLine(LN,S.c,A.w1), d:setLine(LN,S.d,H.f2,'earth')}),[S,H,A]);
  const T=await p.evaluate(([S,H,A,cap])=>{ const ids=[S.a,S.b,S.c,S.d], path={}, took={}, away=[]; let re=0, seq=LN.logSeq||0; ids.forEach(i=>{ path[i]=[]; took[i]=null });
    const want={[S.a]:H.f2,[S.b]:H.hub,[S.c]:A.w1,[S.d]:H.f2};
    for(let y=1;y<=cap;y++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false;
      LN.ships.forEach(s=>{ if(s.mode==='idle'&&s.at&&s.at!=='earth') away.push(s.id+'@'+s.at) });
      LN.log.forEach(e=>{ if(e.seq>seq&&e.code==='reassigned'&&ids.indexOf(e.d.n)>=0) re++ }); seq=LN.logSeq;   // the log forgets traffic: count as it goes
      ids.forEach(i=>{ const s=shipById(LN,i), at=s.mode==='transit'?s.origin+'>'+s.dest:'@'+s.at; if(path[i][path[i].length-1]!==at) path[i].push(at);
        if(took[i]===null&&s.from===want[i]&&!s.moveTo&&!s.pend) took[i]=y });
      if(ids.every(i=>took[i]!==null)) break }
    LNU.notes=[]; LNdraw();
    const st=i=>{ const s=shipById(LN,i); return {from:s.from,to:s.to,moveTo:s.moveTo||null,pend:!!s.pend,took:took[i],path:path[i].slice(0,6).join(' ')} };
    return {a:st(S.a),b:st(S.b),c:st(S.c),d:st(S.d),away:away.slice(0,4),re:re} },[S,H,A,BEFORE?300:900]);
  await reopen(BEFORE?H.f1:H.f2); await shot(p,BEFORE?'p28-b-300-years-later':'p28-b-moved','#ovl .wcol.wr');
  if(!BEFORE){
    const noEarth=x=>!/earth/.test(x.path);
    ok('p.28: moved to a sister feeder — she takes the line at the hub and flies straight out, Earth not touched', T.a.from===H.f2&&T.a.to===H.hub&&!T.a.moveTo&&T.a.took!==null&&noEarth(T.a), JSON.stringify(T.a));
    ok('p.28: moved to the hub\'s own line — taken at the hub, she carries its depot to Earth', O.b==='queued'&&T.b.from===H.hub&&T.b.to==='earth'&&T.b.took!==null&&new RegExp('^'+H.f1+'>'+H.hub+' '+H.hub+'>earth').test(T.b.path), JSON.stringify(T.b));
    ok('p.28: moved to a world on an Earth line — she leaves the old line at the hub, comes to Earth and takes it there', O.c==='queued'&&T.c.from===A.w1&&T.c.to==='earth'&&T.c.took!==null&&new RegExp('^'+H.f1+'>'+H.hub+' '+H.hub+'>earth earth>'+A.w1).test(T.c.path), JSON.stringify(T.c));
    ok('p.28: a line queued by Assign (setLine) in flight is taken at the hub as well', O.d==='queued'&&T.d.from===H.f2&&T.d.to===H.hub&&!T.d.pend&&T.d.took!==null&&noEarth(T.d), JSON.stringify(T.d));
    ok('p.28: every hull logged «reassigned» once; none was left idle at a foreign pier', T.re===4&&T.away.length===0, JSON.stringify({re:T.re,away:T.away}));
    const r1=await p.evaluate(id=>(document.getElementById('hr-'+id)||{}).innerText||'',S.a);
    ok('p.28: the new line\'s card lists her, no «moves to» left', !!r1&&!/moves to/i.test(r1), r1.replace(/\s+/g,' ')) }

  // ---------- p.14: the Night's window speaks as the Helm ----------
  await p.evaluate(()=>{ LNU.win=null; LN.nightSeen=false; GOD.night(); LNdraw() }); await p.waitForTimeout(300);
  const N=await p.evaluate(()=>{ const w=document.querySelector('.nwin'); return {big:LNI.big(), cap:w?(w.querySelector('.icap')||{}).childNodes[0].textContent:'', t:w?w.innerText.replace(/\s+/g,' '):''} });
  await shot(p,'p14-night-window','.nwin');
  if(!BEFORE){
    ok('p.14: the window of the dated Night is headed HELM and says «The Helm\'s task changes»', N.big==='night'&&N.cap==='HELM'&&/The Helm's task changes: build an ark/.test(N.t)&&!/institute/i.test(N.t), JSON.stringify(N).slice(0,260));
    const live=await p.evaluate(()=>{ const rows=JSON.parse(document.getElementById('lb-texts').textContent), keys=['tut_inst','nar_N09_2','nar_N10_2','nar_N13b_a','role_sci','doomsday.1','doomsday','shift_long2'];
      const hit=rows.filter(r=>keys.indexOf(r[1])>=0&&r[0]!=='GUIDE'); return {n:hit.length, bad:hit.filter(r=>/institut/i.test(r[2])||/институт/i.test(r[3])).map(r=>r[1]), helm:hit.filter(r=>/helm/i.test(r[2])&&/пульт/i.test(r[3])).length} });
    ok('p.14: the eight live lines that said Institute say Helm (EN) and Пульт (RU)', live.n===8&&live.bad.length===0&&live.helm===8, JSON.stringify(live)) }
  ok('no page errors', p.errs.length===0, p.errs.join(' | '));

  // ---------- p.1 under the helper: no button to a Yard the player has not been shown ----------
  if(!BEFORE){
    const q=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const Q=UI.ui(q);
    await Q.start(null,undefined,{tut:true}); await Q.menuNew('en'); await q.waitForTimeout(300);
    const g=await q.evaluate(()=>{ const t=LNI.tut(), d=dockWorld(LN,0), w=PLANETS.filter(x=>x.sec===0&&x.id!==d&&!LN.colonies[x.id])[0].id;
      LN.ships.forEach(s=>{ s.crewWait=true }); LNU.win=w; LNdraw();
      const o=document.getElementById('ovl'); return {lock:t.lock, yard:t.open.indexOf('yard')>=0, why:(o.querySelector('.why')||{}).innerText||'', btn:!!o.querySelector('#toyard'), code:(o.querySelector('[data-act="send"]')||{dataset:{}}).dataset.why} });
    ok('p.1 with the helper, before the Yard is opened: the refusal stands alone and names no Yard', g.lock&&!g.yard&&/No free hull at Earth\./.test(g.why)&&!g.btn&&g.code==='nofree', JSON.stringify(g));
    ok('no page errors (helper)', q.errs.length===0, q.errs.join(' | ')) }
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(!BEFORE&&out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
