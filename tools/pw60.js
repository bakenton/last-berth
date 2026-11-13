// pw60 — v5.24 (Никита, 13.11, живой игрок: «некоторые окна не понять, как закрываются… чтобы все окна, у них был крестик
// в правом верхнем углу… нажимаешь, и любое окно в игре закрывается»): крестик в шапке каждого окна, боковой панели,
// всплывающего списка и большого окна; нажатие мышью закрывает именно то окно, на котором он стоит.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW60_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  const st=()=>p.evaluate(()=>({win:LNU.win||null,tab:LNU.tab||null,pop:LNU.pop||null}));
  // the cross: in the top right corner of its box, yellow, big enough to hit
  const cross=(sel,box)=>p.evaluate(([sel,box])=>{ const x=document.querySelector(sel), w=document.querySelector(box); if(!x||!w) return null;
    const a=x.getBoundingClientRect(), r=w.getBoundingClientRect(), cs=getComputedStyle(x);
    return {dx:Math.round(r.right-a.right),dy:Math.round(a.top-r.top),w:Math.round(a.width),h:Math.round(a.height),bg:cs.backgroundColor,label:x.getAttribute('aria-label')} },[sel,box]);
  const corner=c=>!!c&&c.dx>=0&&c.dx<=20&&c.dy>=0&&c.dy<=20&&c.w>=22&&c.h>=22&&c.label==='Close';
  await U.start('en',11);
  await U.pause();

  // 1. the windows of the left rail
  for(const v of ['earth','yard','ark']){
    await U.tab(v);
    const c=await cross('#ovl .wh .xb','#ovl .win');
    ok(v+': a cross in the top right corner of the window', (await st()).win===v&&corner(c), JSON.stringify(c));
    if(v==='yard') await shot('1-yard-cross');
    await U.tap('#ovl .wh .xb');
    ok(v+': the cross shuts it', (await st()).win===null&&!(await p.isVisible('#ovl .win')), JSON.stringify(await st()));
  }
  ok('the cross is yellow, not the red of an alarm', /rgb\(2[0-5]\d, 1[5-9]\d|rgb\(2[0-5]\d, 2\d\d, \d{1,2}\)/.test((await p.evaluate(()=>{ LNU.win='earth'; LNdraw(); return getComputedStyle(document.querySelector('#ovl .wh .xb')).backgroundColor }))), await p.evaluate(()=>getComputedStyle(document.querySelector('#ovl .wh .xb')).backgroundColor));
  await U.tap('#ovl .wh .xb');

  // 2. the journal of objectives and a world's window
  await U.tap('#cards .ocard');
  ok('journal: has the cross', (await st()).win==='goals'&&corner(await cross('#ovl .wh .xb','#ovl .win')));
  await U.tap('#ovl .wh .xb');
  ok('journal: the cross shuts it', (await st()).win===null);
  const pid=await p.evaluate(()=>(PLANETS.find(q=>q.sec===0)||{}).id);
  await U.openWorld(pid);
  ok('a world: has the cross', (await st()).win===pid&&corner(await cross('#ovl .wh .xb','#ovl .win')), JSON.stringify(await cross('#ovl .wh .xb','#ovl .win')));
  await shot('2-world-cross');
  await U.tap('#ovl .wh .xb');
  ok('a world: the cross shuts it', (await st()).win===null);

  // 3. the side panels; a window over a panel shuts alone
  for(const v of ['worlds','tech','fleet']){
    await U.tab(v);
    const c=await cross('#side .wh .xb','#side .side');
    ok(v+': a cross in the top right corner of the panel', (await st()).tab===v&&corner(c), JSON.stringify(c));
    if(v==='worlds') await shot('3-worlds-cross');
    await U.tap('#side .wh .xb');
    ok(v+': the cross shuts it', (await st()).tab===null, JSON.stringify(await st()));
  }
  await U.tab('worlds');
  await p.evaluate(()=>{ LNU.win='earth'; LNdraw() });
  await U.tap('#ovl .wh .xb');
  let s=await st();
  ok('a window over a panel: its cross shuts the window, the panel stays', s.win===null&&s.tab==='worlds', JSON.stringify(s));
  await U.tap('#side .wh .xb');
  ok('then the panel’s own cross shuts the panel', (await st()).tab===null);

  // 4. the advisor's list
  await U.tap('#top .adv');
  s=await st();
  const ac=await cross('#pop .xb','#pop .advl');
  ok('advisor: opens with a cross, yellow, in the corner of the list', s.pop==='adv'&&!!ac&&ac.dx>=0&&ac.dx<=20&&ac.dy>=0&&ac.dy<=20&&ac.w===22&&ac.h===22&&ac.bg==='rgb(255, 210, 63)', JSON.stringify(ac));
  await shot('4-advisor-cross');
  await U.tap('#pop .xb');
  ok('advisor: the cross shuts it', (await st()).pop===null);

  // 5. whole-screen notices: the cross is their acknowledging press
  await p.evaluate(()=>{ LNU.notes.push({k:'TEST',title:'A notice',body:'Body.'}); LNdraw() });
  ok('a notice: has the cross', await p.isVisible('#noteL .nwin .xb'));
  await shot('5-notice-cross');
  await U.tap('#noteL .nwin .xb');
  ok('a notice: the cross shuts it', await p.evaluate(()=>!LNU.notes.length)&&!(await p.isVisible('#noteL .nwin')));
  await p.evaluate(()=>{ LN.night=LN.day+3000; LN.nightSeen=false; LN.arkMark=3; LNdraw() });
  ok('the Night notice: has the cross', await p.isVisible('#noteL .nwin .xb'));
  await U.tap('#noteL .nwin .xb');
  ok('the Night notice: the cross is «continue»', await p.evaluate(()=>LN.nightSeen===true)&&!(await p.isVisible('#noteL .nwin')));

  // 6. Escape and the rail button still shut a window, as before
  await U.tab('yard'); await p.keyboard.press('Escape');
  ok('Escape still shuts a window', (await st()).win===null);
  await U.tab('yard'); await U.tab('yard');
  ok('the rail button pressed again still shuts it', (await st()).win===null);
  ok('no page errors', !errs.length, errs.join(' ; '));
  await b.close();
}catch(e){ ok('scenario ran', false, e&&e.stack||e) }
console.log(out.join('\n')); if(out.some(l=>l.startsWith('FAIL'))) process.exit(1) })();
