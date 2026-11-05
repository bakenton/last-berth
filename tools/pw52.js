// pw52 — v4.50 (итерация 6, ручная партия Claude 04.11 и решения Никиты 05.11): пробел под шагом помощника закрепляет паузу;
// «К технике» из окна-уведомления ставит паузу; кнопки «Строить» не съезжают после заказа; эвакуация берёт резерв ковчега последним;
// мир без линии при большом запасе Земли — серая строка вне счётчика «Нужно решение»; Пропуска нет (Никита 05.11). Клики — мышью; состояние ставится через хуки.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start('en',11); await U.clear();

  // 1. a held helper step: Space pins the pause, the clock stays when the step is gone
  const r0=await U.day(); await U.play(4); await p.waitForTimeout(1500); const r1=await U.day();
  ok('the clock runs at 4× (control)', r1>r0, r0+' → '+r1);
  await p.evaluate(()=>{ LNU.tut.msg={id:'m3',p:null,mode:'do',first:false,at:Date.now()}; LNdraw() }); await p.waitForTimeout(200);
  await p.keyboard.press('Space'); await p.waitForTimeout(150);
  await p.evaluate(()=>{ LNU.tut.msg=null; LNdraw() });
  const h0=await U.day(); await p.waitForTimeout(1500); const h1=await U.day();
  ok('Space under a held helper step pins the pause', h1===h0&&await p.evaluate(()=>LNU.paused), h0+' → '+h1);

  // 2. a note's way to a side tab («To Tech») pins the pause
  await U.play(4); await p.waitForTimeout(300);
  await p.evaluate(()=>{ LNU.notes.push({k:'Ring',title:'A new ring',body:'.',cls:'good',go:'tech',goL:'To Tech'}); LNdraw() }); await p.waitForTimeout(200);
  await U.tap('[data-act="notego"]');
  const t0=await U.day(); await p.waitForTimeout(1500); const t1=await U.day();
  ok('«To Tech» opens Tech and the clock stands', await p.evaluate(()=>LNU.tab==='tech'&&LNU.paused)&&t1===t0, t0+' → '+t1);
  await p.evaluate(()=>{ LNU.tab=null; LNdraw() });

  // 3. the yard: «Build» stays where it was after an order (a taller neighbour card no longer moves it)
  await p.evaluate(()=>{ LN.gen=LN.driveLvl=3; ensureGen(3); HULLS.forEach(h=>h.reach=0); Object.assign(LN.earth,{metal:9000,fuel:3000,parts:600,people:3000}); LNU.win='yard'; LNdraw() }); await p.waitForTimeout(250);
  const ys=()=>p.evaluate(()=>[...document.querySelectorAll('#ovl .oc [data-act="build"]')].map(e=>{ const r=e.getBoundingClientRect(); return Math.round(r.x)+':'+Math.round(r.y)+':'+Math.round(r.width) }).join(','));
  const cw=()=>p.evaluate(()=>[...document.querySelectorAll('#ovl .ord.big > .oc')].map(e=>Math.round(e.getBoundingClientRect().width)));
  const y0=await ys(), w0=await cw(); await U.tap('#ovl .oc [data-act="build"]'); await p.waitForTimeout(250); const y1=await ys();
  ok('«Build» buttons stand where they were after an order (x, y, width)', y0===y1&&new Set(y0.split(',').map(v=>v.split(':')[1])).size===1, y0+' → '+y1);
  ok('the yard cards are three equal columns', w0.length===3&&Math.max(...w0)-Math.min(...w0)<=1, w0.join(','));
  await p.evaluate(()=>{ LNU.win=null; LNdraw() });

  // 4. a world with no line: grey and out of the count while Earth holds 200 years of what it digs
  const wid=await p.evaluate(()=>{ const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); const w=PLANETS.find(x=>x.sec===0&&x.kind==='mine')||PLANETS.find(x=>x.sec===0&&x.kind!=='works'); return colonize(LN,s.id,w.id,40,40)==='ok'?w.id:null });
  await U.until(()=>p.evaluate(id=>!!LN.colonies[id]&&LNI.wst(id)==='noline',wid),300,4);
  await U.pause();
  const dep=await p.evaluate(id=>planet(id).dep,wid);
  const row=()=>p.evaluate(id=>{ const r=LNI.adv().find(r=>r[3]===id&&r[6]==='noline'); return r?r[0]:null },wid);
  const cnt=()=>p.evaluate(()=>+document.querySelector('#top .adv b').textContent);
  const grow=async()=>{ await U.until(()=>p.evaluate(()=>LNU.hist.length>=9),200,4); await U.pause() };   // the trend wants 6+ years of history
  await p.evaluate(d=>{ LN.earth[d]=40; LNU.hist=[]; },dep); await grow();
  const cLo=await row(), nLo=await cnt();
  await p.evaluate(d=>{ LN.earth[d]=1e6; LNU.hist=[]; },dep); await grow();
  const cHi=await row(), nHi=await cnt();
  ok('a world with no line counts while Earth is short of '+dep, !!cLo&&nLo>=1, cLo+' · count '+nLo);
  ok('… and goes grey, out of the count, with 200+ years in store', !!cHi&&cHi!==cLo&&nHi===nLo-1, cHi+' · count '+nHi);
  await U.tap('#top [data-act="pop"][data-v="adv"]'); await p.waitForTimeout(200);
  const grp=await p.evaluate(()=>{ const h=[...document.querySelectorAll('.advl .advh')].find(e=>e.nextElementSibling&&e.nextElementSibling.dataset.t==='noline'); return h?{c:getComputedStyle(h).color,n:h.querySelector('b').textContent,alone:document.querySelectorAll('.advl [data-t="noline"]').length}:null });
  ok('the advisor window: a group of grey rows is grey too', !!grp&&(grp.alone>1||!/255, 210, 63/.test(grp.c)), JSON.stringify(grp));
  await U.tap('#top [data-act="pop"][data-v="adv"]');

  // 5. evacuation: the hull kept for the ark goes last
  const ev=await p.evaluate(id=>{ const at=LN.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&shipClass(s)==='courier');
    let a=at[0]; if(!a) return 'no courier'; let c=JSON.parse(JSON.stringify(a)); c.id=Math.max(...LN.ships.map(s=>s.id))+1; LN.ships.push(c);
    a.reserve=true; LNU.win=id; LNdraw(); return {res:a.id,free:c.id} },wid);
  await p.waitForTimeout(200);
  if(typeof ev==='string') ok('evacuation picks a free courier', false, ev);
  else { await p.evaluate(()=>LNdraw());
    const bb=await p.$('#ovl [data-act="evac"]:not([data-why])'); if(bb) await U.tap('#ovl [data-act="evac"]');
    const who=await p.evaluate(()=>{ const s=LN.ships.find(s=>s.job==='evac'); return s?s.id:null });
    ok('evacuation sends a free courier, not the ark reserve', who!==null&&who!==ev.res, 'sent '+who+' · reserve '+ev.res+' · free '+ev.free) }

  ok('no Skip button (v4.50: only the speeds)', !(await p.$('[data-act="skip"]')) && (await p.$$('#top [data-act="spd"]')).length>=3);
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
 }catch(e){ ok('scenario ran', false, e.stack) }
 console.log(out.join('\n')); const f=out.filter(s=>s.startsWith('FAIL')).length; console.log((f?'FAIL':'PASS')+' pw52 '+(out.length-f)+'/'+out.length); process.exit(f?1:0) })();
