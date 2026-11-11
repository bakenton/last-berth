// pw56 — v5.10: проигрыш взлома кольца и повтор, настоящими клавишами и мышью (в v5.10 было «не проверено»).
// A — кольцо I оплачено, взлом проигран (игрок сам идёт в улей): экран проигрыша, ничего не потеряно, RETRY → победа, кольцо считается.
// B — проигрыш → NOT NOW: взлом закрыт, окно ковчега и карточка ждут, кольцо II отказывает; START THE HACK снова → победа.
// C — v5.11: у судна, чей экипаж отказался летать, в Yard есть кнопка «в конвой» (с v5.10 оно в счёт идёт, только если поставлено).
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const path=require('path');
const UI=require('./pw-ui.js');
const SHOTS=process.env.PW56_SHOTS||null;
const out=[]; const ok=(n,v,x)=>out.push((v?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const mk=async()=>{ const p=await UI.newPage(b,{vp:{width:1440,height:900}}); return [p,UI.ui(p)] };
  const helpers=p=>({ txt:sel=>p.evaluate(q=>{ const e=document.querySelector(q); return e?e.innerText.replace(/\n+/g,' | '):'' },sel),
    waitFor:async(fn,ms=8000)=>{ for(let t=0;t<ms;t+=100){ if(await fn()) return true; await p.waitForTimeout(100) } return !!(await fn()) },
    cell:async sel=>{ const bb=await p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} },sel); if(!bb) return false; await p.mouse.click(bb.x,bb.y); await p.waitForTimeout(200); return true } });
  const snap=p=>p.evaluate(()=>({paid:arkPaid(LN),held:arkRings(LN),q:(LN.hackQ||[]).map(h=>h.k+h.l).join(),food:Math.round(LN.earth.food),metal:Math.round(LN.earth.metal),day:LN.day,hacks:LN.hacks||0}));
  // ring I is paid and waits for the hack; the hack is opened by the player's press and lost by walking into the hive
  const loseOnce=async(p,U,H,waitFor,tag)=>{
    await U.tap('#hkGo'); ok(tag+' the fight starts', await waitFor(async()=>(await H()).game==='play'), JSON.stringify(await H()).slice(0,120));
    // проиграть надо нарочно: стоять на месте, прицел вниз от улья (выстрелы уходят в край поля). Идти в соты нельзя — игрок проходит улей
    // насквозь и с той стороны расстреливает ядро за 6 с (проверено 11.11); с прицелом вверх стоящий выигрывает уровень 1 сам за ~100 с
    const h=await H(); await p.mouse.move(h.ox+h.aw/2*h.k,h.oy+(h.ah-6)*h.k); await p.waitForTimeout(60); const t0=Date.now();
    if(SHOTS){ await p.waitForTimeout(6000); await shot(p,tag+'0-fight') }
    const lost=await waitFor(async()=>(await H()).panel==='lost',80000);
    ok(tag+' three hits lose the hack', lost, 'after '+((Date.now()-t0)/1000).toFixed(1)+' s · '+JSON.stringify(await H()).slice(0,140)); return lost };
  const setup=async(p,U,cell)=>{ await U.start('en',11,{hack:true}); await U.clear();
    await p.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.nightSeen=true; G.earth.food+=20000; G.earth.metal+=9000; LNdraw() });
    await U.closeBig(); await U.tab('ark'); await cell('#ovl .hold .hr[data-v="1"] .hx'); await U.tap('#arkcard [data-act="arkbuy"]'); await p.waitForTimeout(200) };

  // ---- A. lost, RETRY, won ----
  { const [p,U]=await mk(); const {txt,waitFor,cell}=helpers(p); const H=()=>p.evaluate(()=>LBhack.state());
    await setup(p,U,cell); const s0=await snap(p);
    ok('A ring I is paid and waits for the hack', s0.paid===1&&s0.held===0&&s0.q==='ark1', JSON.stringify(s0));
    await U.tap('#hkneed [data-act="hack"]'); await waitFor(async()=>(await H()).open);
    if(await loseOnce(p,U,H,waitFor,'A')){
      const lt=await txt('#hkLost'); const vis=await p.evaluate(()=>['hkRetry','hkLater2'].map(i=>{ const e=document.getElementById(i), r=e.getBoundingClientRect(); return !!(r.width&&r.height)&&e.textContent.trim().length>0 }));
      ok('A the lost screen: a headline, RETRY and NOT NOW', lt.length>10&&vis[0]&&vis[1], lt.slice(0,200));
      await shot(p,'A1-lost');
      const s1=await snap(p);
      ok('A losing costs nothing: the ring stays paid, food and metal untouched, the clock stood', s1.paid===1&&s1.held===0&&s1.q==='ark1'&&s1.food===s0.food&&s1.metal===s0.metal&&s1.day===s0.day&&s1.hacks===s0.hacks, JSON.stringify(s1));
      await U.tap('#hkRetry');
      ok('A RETRY starts the second attempt of the same level', await waitFor(async()=>(await H()).game==='play')&&(await H()).attempt>=1&&(await H()).lv===1, JSON.stringify(await H()).slice(0,140));
      await p.evaluate(()=>LBhack.cheat()); await waitFor(async()=>(await H()).panel==='won'); await waitFor(()=>p.isVisible('#hkDone'),8000);
      await U.tap('#hkDone'); await p.waitForTimeout(400); const s2=await snap(p);
      ok('A won on the retry: ring I counts, the queue is empty', s2.held===1&&s2.q===''&&!(await H()).open, JSON.stringify(s2)) }
    ok('A no page errors', p.errs.length===0, p.errs.join(' | ').slice(0,300)); await p.close() }

  // ---- B. lost, NOT NOW, the window waits, START THE HACK again ----
  { const [p,U]=await mk(); const {txt,waitFor,cell}=helpers(p); const H=()=>p.evaluate(()=>LBhack.state());
    await setup(p,U,cell); const s0=await snap(p);
    await U.tap('#hkneed [data-act="hack"]'); await waitFor(async()=>(await H()).open);
    if(await loseOnce(p,U,H,waitFor,'B')){
      await U.tap('#hkLater2'); await p.waitForTimeout(400);
      const s1=await snap(p); const w=await p.evaluate(()=>({open:LBhack.isOpen(),need:!!document.querySelector('#hkneed [data-act="hack"]'),card:!!document.querySelector('.bcard.hk'),next:arkCheck(LN,2),
        later:LN.actions.filter(a=>a.k==='hack_later').length,wait:document.querySelectorAll('#ovl .hold .hx.wait').length}));
      ok('B NOT NOW closes the hack; nothing is lost', !w.open&&s1.paid===1&&s1.held===0&&s1.q==='ark1'&&s1.food===s0.food&&s1.metal===s0.metal, JSON.stringify(s1));
      ok('B the Ark window and the card still ask for the hack; ring II is refused; ring I dashed', w.need&&w.card&&w.next==='hack'&&w.wait===6&&w.later===1, JSON.stringify(w)+' · '+(await txt('#hkneed')));
      await shot(p,'B1-later');
      await U.tap('#hkneed [data-act="hack"]');
      ok('B START THE HACK opens the same hack again', await waitFor(async()=>(await H()).open)&&(await H()).kind==='hive'&&(await H()).lv===1&&(await H()).panel==='intro', JSON.stringify(await H()).slice(0,140));
      await U.tap('#hkGo'); await waitFor(async()=>(await H()).game==='play'); await p.evaluate(()=>LBhack.cheat()); await waitFor(async()=>(await H()).panel==='won'); await waitFor(()=>p.isVisible('#hkDone'),8000);
      await U.tap('#hkDone'); await p.waitForTimeout(400); const s2=await snap(p);
      const on=await p.evaluate(()=>document.querySelectorAll('#ovl .hold .hr:not(#cvring) .hx.on').length);
      ok('B won: ring I counts and is purple, the request is gone', s2.held===1&&s2.q===''&&on===6&&!(await p.evaluate(()=>!!document.querySelector('#hkneed'))), JSON.stringify(s2)+' on '+on);
      await shot(p,'B2-won') }
    ok('B no page errors', p.errs.length===0, p.errs.join(' | ').slice(0,300)); await p.close() }
  // ---- C. a hull whose crew refused: the Yard offers the convoy (found by the mouse run of 11.11: the card had SCRAP only) ----
  { const [p,U]=await mk(); const {txt}=helpers(p);
    await U.start('en',11); await U.clear();
    const id=await p.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.nightSeen=true; const s=G.ships.find(x=>x.mode!=='dead'&&x.mode!=='missing'&&x.mode!=='building'); if(!s) return null;
      s.mode='idle'; s.at='earth'; s.from=null; s.to=null; s.pend=null; s.job=null; s.reserve=false; s.mutiny=true; LNdraw(); return s.id });
    await U.closeBig(); await U.tab('yard'); await p.waitForTimeout(200);
    const sel='#ovl [data-act="reserve"][data-s="'+id+'"][data-on="1"]'; const c0=await p.evaluate(()=>arkConvoy(LN).have);
    const card=await txt('#ovl .pc.mut');
    ok('C the refused hull at the pier has the convoy button', id!==null&&(await p.locator(sel).count())===1, 'hull '+id+' · '+card);
    await shot(p,'C1-refused-at-pier');
    await U.tap(sel); await p.waitForTimeout(250);
    const c1=await p.evaluate(id=>{ const s=shipById(LN,id); return {res:!!s.reserve,mut:!!s.mutiny,in:convoyHull(LN,s),have:arkConvoy(LN).have,act:(LN.actions[LN.actions.length-1]||{}).k,scrap:!!document.querySelector('#ovl [data-act="scrap"][data-s="'+id+'"]'),back:!!document.querySelector('#ovl [data-act="reserve"][data-s="'+id+'"][data-on="0"]')} },id);
    ok('C pressed: the hull stands in the convoy and counts; SCRAP is gone, the way back is there', c1.res&&c1.mut&&c1.in&&c1.have===c0+1&&c1.act==='reserve'&&!c1.scrap&&c1.back, JSON.stringify(c1)+' was '+c0);
    await shot(p,'C2-refused-in-convoy');
    ok('C no page errors', p.errs.length===0, p.errs.join(' | ').slice(0,300)); await p.close() }
  await b.close();
 }catch(e){ out.push('FAIL crash — '+String(e&&e.stack||e).slice(0,400)) }
 console.log(out.join('\n')); const bad=out.filter(l=>!l.startsWith('PASS')).length; console.log('pw56 '+(out.length-bad)+'/'+out.length); process.exit(bad?1:0);
})();
