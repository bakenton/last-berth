// pw48 — v4.46 по забегу Никиты 316286103: окно завода говорит «нужно / линия везёт» по топливу, металлу, еде; одна карточка
// на завод вместо двух; топливо грузится первым; WAKE ушёл с верхней полосы; флажок «рационы до Ночи» не висит; помехи с 300 лет;
// ковчег: уровень I по старой цене, II–IV ×3; трюм ×1.5 за поколение. Настоящая мышь.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW48_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  await U.start('en',309573272);
  await U.pause();

  // === 1. hulls and the ark price, straight from the rules
  const k=await p.evaluate(()=>{ ensureGen(5); const c=(key,g)=>HULLS.find(h=>h.key===key&&h.gen===g);
    return {f6:c('freighter',5).cap, h6:c('hauler',5).cap, c6:c('courier',5).cap, f1:c('freighter',0).cap, m:c('hauler',5).metal/c('hauler',0).metal, a1:arkPrice(1).metal, a2:arkPrice(2).metal, a4:arkPrice(4).metal} });
  ok('the hold grows ×1.5 a generation (Freighter VI ≈ 5771)', k.f6===Math.round(760*Math.pow(1.5,5))&&k.h6===Math.round(240*Math.pow(1.5,5))&&k.c6===Math.round(70*Math.pow(1.5,5)),JSON.stringify(k));
  ok('metal grows with the hold', Math.abs(k.m-Math.pow(1.5,5))<0.05,k.m);
  ok('ark: level I at the old price, II–IV ×3', k.a1===2250&&k.a2===18000&&k.a4===81000,JSON.stringify(k));

  // === 2. a works world with machines on a thin line
  const W=await p.evaluate(()=>{ const G=LN, wk=PLANETS.filter(q=>q.sec<=1&&q.kind==='works').sort((a,b)=>a.dist-b.dist)[0].id;
    G.earth.metal=90000; G.earth.food=90000; G.earth.fuel=90000; G.earth.parts=20000; G.earth.people=6000; G.opened={food:1,metal:1,fuel:1,parts:1};
    G.gen=2; G.driveLvl=3; ensureGen(2); LNtut.off();
    Object.keys(G.colonies).forEach(k=>{ delete G.colonies[k] }); G.ships.forEach(s=>{ s.mode='dead'; s.from=s.to=null });
    G.colonies[wk]={pop:popWant(planet(wk)),store:{metal:500,food:500,fuel:0,parts:0},founded:G.day,tier:2,hauledOut:{}};
    const hi=HULLS.findIndex(h=>h.key==='courier'&&h.gen===2); buildShip(G,hi); const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0;
    if(setLine(G,s.id,wk,'earth')!=='ok'){ s.from=wk; s.to='earth' }
    const f=lineFit(G,wk); s.cap=Math.max(1,Math.round(s.cap*(f.need*0.5)/f.carries)); LNdraw(); return wk });
  const order=await p.evaluate(id=>needsOf(LN,id),W);
  ok('the hold is filled fuel first', order&&order[0]==='fuel'&&order.join()==='fuel,metal,food',JSON.stringify(order));
  const load=await p.evaluate(id=>{ const G=LN, s=G.ships.find(q=>q.mode!=='dead'&&(q.from===id||q.to===id)); s.cap=20; loadAt(G,s,'earth'); return s.cargo },W);
  ok('a short hold still takes the fuel', load.fuel>0,JSON.stringify(load));
  const rows=await p.evaluate(()=>LNI.adv().map(r=>({t:r[1],s:r[2],k:r[6],w:r[3]})));
  const mine=rows.filter(r=>r.w===W);
  ok('one card for the works, with numbers, no second «machines stand» card', mine.length===1&&/the line brings [\d.,]+ a year, the works burn [\d.,]+/.test(mine[0].t),JSON.stringify(mine));
  await U.clear();
  await p.evaluate(id=>{ LNU.win=id; LNdraw() },W);
  const win=await p.evaluate(()=>{ const e=document.querySelector('.win'); return e?e.innerText.replace(/\s+/g,' '):'' });
  const lines=(win.match(/\/yr · line brings [\d.,]+/g)||[]).length;
  ok('the works window: need and what the line brings for fuel, metal and food', lines===3&&/Fuel/.test(win)&&/Metal/.test(win)&&/Rations/.test(win),win.slice(0,400));
  ok('the works window says how far the line is short', /a year short|stands idle|Order a|: \+[\d.,]+ a year/.test(win),win.slice(0,600));
  await shot('works-window');
  await U.closeWin();

  // === 3. the Night: no WAKE on the top bar, no «before the Night» flag, static from 300 years
  await p.evaluate(()=>{ const G=LN; G.night=G.day+290; G.foodFc={y:G.day+150,n:450,farms:0}; G.arkPaid={metal:2250,parts:450,food:1500,fuel:1200}; G.arkMark=0; LNdraw() });
  const top=await p.evaluate(()=>document.querySelector('#top').innerText.replace(/\s+/g,' '));
  ok('the top bar has no WAKE', !/wake/i.test(top),top);
  const flag=await p.evaluate(()=>{ const e=document.querySelector('#tabs [data-v="earth"] .flag'); return e?e.innerText:'' });
  ok('no «rations end before the Night» flag on Earth', !/before the Night/i.test(flag),flag);
  const fx=await p.evaluate(()=>document.querySelector('#mapbox').classList.contains('nfon'));
  ok('static is on 290 years out', fx);
  await p.evaluate(()=>{ LN.night=LN.day+310; LNdraw() });
  ok('and off 310 years out', !(await p.evaluate(()=>document.querySelector('#mapbox').classList.contains('nfon'))));
  await shot('night-top');
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
 }catch(e){ ok('crash',false,e.stack) }
 console.log(out.join('\n')); console.log((out.every(l=>l.startsWith('PASS'))?'ALL PASS':'SOME FAIL')+' ('+out.filter(l=>l.startsWith('PASS')).length+'/'+out.length+')');
 process.exit(out.every(l=>l.startsWith('PASS'))?0:1);
})();
