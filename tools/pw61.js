// pw61 — v5.25 (Никита, 13.11: «первый вариант, но в справке должны быть значки… в игре много значков и некоторые не ясно что значат»):
// «?» в шапке каждого окна открывает лист справки — что это, с чего начать, что есть что со значками окна.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW61_SHOTS||null, REF=!!process.env.PW61_REF;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await U.start('en',11);
  await U.pause();
  // a mid-game fixture: a mine, a farm, a well, a works with machines, hulls on their lines, the Night dated, a ring of pods
  const ids=await p.evaluate(()=>{ LNU.shiftStop=false; LN.safe=true;
    const COL=t=>({pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:t,fuelOut:0});
    window.TICK=n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } };
    const HULL=()=>{ LN.earth.metal=1e5; LN.earth.parts=1e4; LN.earth.people=Math.max(LN.earth.people,600); buildShip(LN,HULLS.findIndex(h=>h.gen===(LN.gen||0)&&h.key==='courier')); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; return s.id };
    const pick=k=>(PLANETS.find(q=>q.sec===0&&q.kind===k)||PLANETS.find(q=>q.sec<=1&&q.kind===k)||{}).id||null;
    const mine=pick('mine'), farm=pick('farm'), well=pick('well'), works=pick('works'), free=(PLANETS.find(q=>q.sec<=1&&![mine,farm,well,works].includes(q.id))||{}).id;
    LN.driveLvl=2; LN.gen=2; ensureGen(2);
    [[mine,1],[farm,0],[well,0],[works,1]].forEach(([id,t])=>{ if(id) LN.colonies[id]=Object.assign({pid:id},COL(t)) });
    LN.earth.food=3e4; LN.earth.metal=1e5; LN.earth.fuel=5000;
    [mine,farm,well,works].forEach(id=>{ if(id){ const a=HULL(); setLine(LN,a,id,'earth') } });
    HULL();
    LN.night=LN.day+2400; LN.nightSeen=true; LN.arkMark=3; LN.ark=LN.ark||{}; LN.ark.rings=1; LN.ark.woke=1;
    TICK(30); LNdraw(); return {mine,farm,well,works,free} });
  await U.clear();
  if(REF){   // reference shots of every window, to write the help from what is on the screen
    for(const v of ['earth','yard','ark']){ await U.tab(v); await shot('ref-'+v); await p.keyboard.press('Escape') }
    for(const v of ['worlds','tech','fleet']){ await U.tab(v); await shot('ref-'+v); if(v==='tech'){ await U.tap('#side [data-v="drive"]').catch(()=>{}); await shot('ref-tech-drive') } await U.tab(v) }
    await U.openWorld(ids.mine); await shot('ref-world'); await U.wtab('up'); await shot('ref-world-up'); await U.wtab('hub').catch(()=>{}); await shot('ref-world-hub'); await p.keyboard.press('Escape');
    await U.openWorld(ids.works); await shot('ref-works'); await p.keyboard.press('Escape');
    await U.openWorld(ids.free); await shot('ref-free'); await p.keyboard.press('Escape');
    await U.tap('#cards .ocard'); await shot('ref-goals'); await p.keyboard.press('Escape');
  }
  // the sheet: opened by the mouse, two headings, the signs of the window in its list, shut by the same button
  const sheet=()=>p.evaluate(()=>{ const s=document.getElementById('hsheet'); if(!s) return null; const r=s.getBoundingClientRect();
    const li=[...s.querySelectorAll('li')];
    return {keys:[...s.querySelectorAll('.hk')].map(e=>e.innerText.trim()),p:[...s.querySelectorAll('p')].map(e=>e.innerText.trim().length),rows:li.length,
      signs:li.filter(e=>e.querySelector('.hi svg, .hi .hdot, .hi .gen, .hi .htx')).length,bold:li.filter(e=>e.querySelector('b')&&/ — /.test(e.innerText)).length,
      raw:li.filter(e=>/^h_|undefined/.test(e.innerText)).length+[...s.querySelectorAll('p')].filter(e=>/^h_|undefined/.test(e.innerText)).length,
      h:Math.round(r.height),on:!!document.querySelector('.wh .qb.on')} });
  const good=(s,n)=>!!s&&s.keys.join('|').toUpperCase()==='WHAT THIS IS|DO FIRST|WHAT IS WHAT'&&s.p.length===2&&s.p.every(x=>x>20)&&s.rows===n&&s.signs===n&&s.bold===n&&s.raw===0&&s.on;
  const wins=[['earth',5,'#ovl'],['yard',7,'#ovl'],['ark',6,'#ovl']];
  for(const [v,n,box] of wins){
    await U.tab(v);
    ok(v+': a «?» by the cross, no sheet until asked', await p.isVisible(box+' .wh .qb')&&!(await sheet()));
    await U.tap(box+' .wh .qb');
    const s=await sheet();
    ok(v+': the sheet — what this is, do first, '+n+' signs with their words', good(s,n), JSON.stringify(s));
    await shot('help-'+v);
    await U.tap(box+' .wh .qb');
    ok(v+': the same button shuts the sheet', !(await sheet())&&await p.evaluate(v=>LNU.win===v,v));
    await U.tap(box+' .wh .qb'); await U.tap(box+' .wh .xb');
    await U.tab(v);
    ok(v+': shut with the window, the sheet does not come back', !(await sheet()));
    await U.tap(box+' .wh .xb');
  }
  for(const [v,n] of [['worlds',6],['tech',5],['fleet',5]]){
    await U.tab(v);
    await U.tap('#side .wh .qb');
    const s=await sheet();
    ok(v+': the sheet in the side panel', good(s,n), JSON.stringify(s));
    await shot('help-'+v);
    await U.tap('#side .wh .xb');
    ok(v+': the cross shuts the panel and its sheet', await p.evaluate(()=>!LNU.tab&&!LNU.help));
  }
  for(const [k,id,n] of [['world',ids.mine,6],['works',ids.works,5],['free',ids.free,5]]){   // v5.27: a free world that has a gift gets a fifth line — «Found here»
    await U.openWorld(id);
    await U.tap('#ovl .wh .qb');
    const s=await sheet();
    ok(k+': the sheet of a world’s window', good(s,n), JSON.stringify(s));
    await shot('help-'+k);
    await p.keyboard.press('Escape');
    ok(k+': Escape shuts the sheet first, the window stays', !(await sheet())&&await p.evaluate(id=>LNU.win===id,id));
    await p.keyboard.press('Escape');
  }
  await U.tap('#cards .ocard');
  ok('the journal of objectives has no «?» (it is a list of what to do itself)', !(await p.isVisible('#ovl .wh .qb'))&&await p.isVisible('#ovl .wh .xb'));
  await p.keyboard.press('Escape');
  ok('no page errors', !errs.length, errs.join(' ; '));
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
