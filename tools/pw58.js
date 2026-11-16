// pw58 — v5.21 (Никита, 12.11, живой плейтест v5.20: «не хватает цели», «у заводов формулировка странная»):
// карточка цели на карте (B3), журнал целей по клику мышью, «Show» ведёт к месту; окно завода «You bring → It makes» (W2), «?» с расходом.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW58_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await U.start('en',11);
  await U.pause();
  await p.evaluate(()=>{ LNU.shiftStop=false; LN.safe=true;
    window.COL=()=>({pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0});
    window.TICK=n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } };
    window.HULL=()=>{ LN.earth.metal=1e5; LN.earth.people=Math.max(LN.earth.people,400); buildShip(LN,HULLS.findIndex(h=>h.gen===(LN.gen||0)&&h.key==='courier')); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; return s.id } });

  // 1. the card: first objective, on the chart, top right
  let tx=await p.innerText('#cards .ocard');
  const o0=await p.evaluate(()=>objectives(LN).now[0]);
  ok('card: the first objective is a first world', /settle your first world/i.test(tx)&&o0.code==='o_first'&&!!o0.p, tx.replace(/\n/g,' | '));
  ok('card: names the world and its ring', /ring 1/i.test(tx), tx.replace(/\n/g,' | '));
  const box=await p.evaluate(()=>{ const r=document.querySelector('#cards .ocard').getBoundingClientRect(), m=document.getElementById('mapbox').getBoundingClientRect(); return {right:Math.round(m.right-r.right),top:Math.round(r.top-m.top),w:Math.round(r.width)} });
  ok('card: top right of the chart', box.right<=20&&box.top<=20&&box.w>=250, JSON.stringify(box));
  await shot('1-card-start');

  // 2. nothing the helper has not opened: no drive bar, no ark, the fallback objective
  const lockTx=await p.evaluate(()=>{ const t=LNU.tut, keep={lock:t.lock,open:t.open}; t.lock=true; t.open={}; LNdraw(); const s=document.querySelector('#cards .ocard').innerText, ft=!!document.querySelector('#cards .ocard .ft'); t.lock=keep.lock; t.open=keep.open; LNdraw(); return {s,ft} });
  ok('card under the helper: no bars of what is not open yet', !lockTx.ft&&/first world/i.test(lockTx.s), lockTx.s.replace(/\n/g,' | '));
  ok('card with everything open: the drive bar', /drive ii/i.test(await p.innerText('#cards .ocard .ft')), await p.innerText('#cards .ocard .ft'));

  // 3. the mouse opens the journal; «Show» opens the world
  await U.tap('#cards .ocard');
  ok('journal: opens by the mouse', await p.isVisible('#goals'));
  tx=await p.innerText('#goals');
  ok('journal: Now, and the next drive with its two bars', /now/i.test(tx)&&/next · drive ii/i.test(tx)&&/settle 4 worlds/i.test(tx)&&/then parts at a works/i.test(tx), tx.replace(/\n/g,' | '));
  await shot('2-journal-start');
  await U.tap('#goals [data-act="goal"][data-v="0"]');
  ok('journal: Show opens the world of the objective', await p.evaluate(id=>LNU.win===id,o0.p), await p.evaluate(()=>LNU.win));
  await p.keyboard.press('Escape');

  // 4. a farm, a mine and a works with no line: after the idle years the objective is to feed the works
  const ids=await p.evaluate(()=>{ const pick=k=>(PLANETS.find(q=>q.sec===0&&q.kind===k)||PLANETS.find(q=>q.sec<=1&&q.kind===k)||{}).id||null, farm=pick('farm'), mine=pick('mine'), works=pick('works');
    [farm,mine,works].forEach(id=>{ if(id&&!LN.colonies[id]) LN.colonies[id]=Object.assign({pid:id},COL()) });
    LN.earth.food=1e5; LN.earth.fuel=1e5; LN.earth.metal=1e5;
    [farm,mine].forEach(id=>{ const a=HULL(); setLine(LN,a,id,'earth') });
    TICK(12); LNdraw(); return {farm,mine,works} });
  ok('fixture: a works in reach', !!ids.works, JSON.stringify(ids));
  let now=await p.evaluate(()=>objectives(LN).now.map(o=>o.code+(o.p?':'+o.p:'')));
  ok('objective: feed the works no line feeds', now.indexOf('o_feed:'+ids.works)>=0, now.join(' '));
  tx=await p.innerText('#cards .ocard');
  // v5.33: the card carries the first two objectives — «N more» counts what is left after them
  { const n=await p.evaluate(()=>document.querySelectorAll('#cards .ocard .sg').length), all=await p.evaluate(()=>objectives(LN).now.length);
    ok('card: the second objective stands under the first; «N more» only when there are more than two', n===1&&(all>2?new RegExp((all-2)+' more','i').test(tx):!/\d+ more/i.test(tx)), all+' objectives · '+tx.replace(/\n/g,' | ')) }

  // 5. the works window: You bring → It makes, one bar, the verdict
  await U.tap('#cards .ocard');
  const feedI=await p.evaluate(id=>objectives(LN).now.findIndex(o=>o.code==='o_feed'),ids.works);
  await U.tap('#goals [data-act="goal"][data-v="'+feedI+'"]');
  ok('Show: the works window', await p.evaluate(id=>LNU.win===id,ids.works));
  tx=await p.innerText('#ovl .win');
  ok('works: You bring → It makes', /you bring/i.test(tx)&&/it makes/i.test(tx)&&/metal/i.test(tx)&&/rations/i.test(tx)&&/parts/i.test(tx), tx.replace(/\n/g,' | '));
  ok('works: no «This world eats» and no per-resource figures until asked', !/this world eats/i.test(tx)&&!/· line/i.test(tx), tx.replace(/\n/g,' | '));
  ok('works without a line: fed 0%, the verdict and its button', /line brings\s*\??\s*0%/i.test(tx.replace(/\n/g,' '))&&/the line brings too little/i.test(tx)&&await p.isVisible('#ovl .vd [data-act="world"][data-f="add"]'), tx.replace(/\n/g,' | '));
  await shot('3-works-idle');
  // a hull on its line: fed by what the line carries of what the works burn
  const fit=await p.evaluate(id=>{ const a=HULL(); setLine(LN,a,id,'earth'); TICK(40); LNdraw(); const f=lineFit(LN,id); return {need:f.need,carries:f.carries,idle:LN.colonies[id].idleWorks||0} },ids.works);
  const pct=Math.round(Math.min(1,fit.carries/fit.need)*100);
  tx=(await p.innerText('#ovl .fed')).replace(/\n/g,' ');
  ok('works with a line: the bar is the line against the need', tx.indexOf(pct+'%')>=0, tx+' · '+JSON.stringify(fit));
  if(pct<75){ ok('works, thin line: the verdict and its button', /the line brings too little/i.test(await p.innerText('#ovl .vd'))&&await p.isVisible('#ovl .vd [data-act="world"][data-f="add"]')) }
  else ok('works, fed line: no verdict', !(await p.isVisible('#ovl .vd')));
  await U.tap('#ovl [data-act="feedhelp"]');
  tx=await p.innerText('#ovl .win');
  ok('«?»: what it burns a year, by the mouse', /this world eats/i.test(tx)&&/\/yr · line/i.test(tx), tx.replace(/\n/g,' | ').slice(0,400));
  await shot('4-works-line-help');
  await U.tap('#ovl [data-act="feedhelp"]');
  ok('«?»: closes again', !/this world eats/i.test(await p.innerText('#ovl .win')));
  await p.keyboard.press('Escape');

  // 6. the Night has a date: the wake bar, the three checks, the done list
  await p.evaluate(()=>{ log(LN,'surveyed',{s:secName(1)}); LN.driveLvl=1; LN.gen=1; ensureGen(1); log(LN,'drive_mark',{p:'x',n:2,s:3});
    LN.night=LN.day+3000; LN.nightSeen=true; LN.arkMark=3; log(LN,'night_dated',{y:LN.night,n:3000}); LNdraw() });
  await U.clear();
  tx=(await p.innerText('#cards .ocard .ft')).replace(/\n/g,' ');
  ok('card: Drive III and Wake 0 of those who would board', /drive iii/i.test(tx)&&/wake\s*0 \/ \d/i.test(tx), tx);
  now=await p.evaluate(()=>objectives(LN).now.map(o=>o.code));
  ok('objective: the first ark ring, no convoy yet', now.indexOf('o_ark')>=0&&now.indexOf('o_convoy')<0, now.join(' '));
  await U.tap('#cards .ocard');
  tx=await p.innerText('#goals');
  ok('journal: the Night with its year, wake and sleep on', /the night/i.test(tx)&&/year \d+/i.test(tx)&&/wake/i.test(tx)&&/sleep on/i.test(tx), tx.replace(/\n/g,' | ').slice(0,500));
  ok('journal: three checks — pods, convoy, ark drive; not red three thousand years before the Night', await p.evaluate(()=>document.querySelectorAll('#goals .ock').length===3&&document.querySelectorAll('#goals .ock.yet').length===3));
  ok('journal: what is done, newest first', /drive ii/i.test(tx)&&/ring charted/i.test(tx)&&/the night dated/i.test(tx), tx.replace(/\n/g,' | ').slice(-300));
  await shot('5-journal-night');
  const arkI=await p.evaluate(()=>objectives(LN).now.findIndex(o=>o.code==='o_ark'));
  await U.tap('#goals [data-act="goal"][data-v="'+arkI+'"]');
  ok('Show: the ark window', await p.evaluate(()=>LNU.win==='ark'));
  await p.keyboard.press('Escape');
  // v5.22 — the end is near and not a pod is bought: the ark comes before the works nobody feeds (a mouse run of v5.21:
  // 286 years to the Night, no ring, and the card said «Feed the works»)
  now=await p.evaluate(id=>{ onLine(LN,id).forEach(s=>clearLine(LN,s.id)); LN.night=LN.day+700; LNdraw(); return objectives(LN).now.map(o=>o.code) },ids.works);
  ok('fixture: the works is unfed again and the Night is 700 years off', now.indexOf('o_feed')>=0, now.join(' '));
  ok('near the Night: the first ring stands before the works and the hack', now.indexOf('o_ark')>=0&&now.indexOf('o_ark')<now.indexOf('o_feed')&&(now.indexOf('o_hack')<0||now.indexOf('o_ark')<now.indexOf('o_hack')), now.join(' '));
  tx=await p.innerText('#cards .ocard');
  ok('card near the Night, no pods: buy the first ark ring', /buy the first ark ring/i.test(tx), tx.replace(/\n/g,' | '));
  await shot('6-card-ark-first');
  const far=await p.evaluate(()=>{ const n=LN.night; LN.night=LN.day+3000; const r=objectives(LN).now.map(o=>o.code); LN.night=n; return r });
  ok('three thousand years off: the works first, as before', far.indexOf('o_feed')<far.indexOf('o_ark'), far.join(' '));
  // a ring is there, the Night inside NIGHT_NEAR: the convoy comes first
  now=await p.evaluate(()=>{ LN.ark=LN.ark||{}; LN.ark.rings=1; LN.ark.woke=1; LN.night=LN.day+300; LNdraw(); return objectives(LN).now.map(o=>o.code) });
  tx=await p.innerText('#cards .ocard');
  ok('card near the Night, a ring bought: gather the convoy', /gather the convoy/i.test(tx)&&/0 of \d+ hulls/i.test(tx)&&now[0]==='o_convoy'&&now.indexOf('o_convoy')<now.indexOf('o_feed'), tx.replace(/\n/g,' | ')+' · '+now.join(' '));
  await shot('7-card-convoy');
  ok('no page errors', !errs.length, errs.join(' ; '));
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
