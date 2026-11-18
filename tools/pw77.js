// pw77 — v5.43 (Nikita 18.11, «уведомления»: the log no longer pops up; the losses wait behind LOSSES). Переписан под новое правило.
//  1  кольцо VII пусто → дрожь, предупреждение и погасание в журнале; в LOSSES ничего не добавилось; тостов нет;
//  2  кольцо VI с миром → в LOSSES строки ring_dark (c≥1) и world_dark того мира; тостов нет;
//  3  кольцо V пусто, на него летит одно судно → в LOSSES строка ring_dark (s≥1), судно погибло; тостов нет.
// Время идёт настоящим циклом страницы (×10). Тосты собираются наблюдателем за #toasts (один за раз, по узлам).
// PW77_SHOTS=<папка> — скриншоты; PW77_FILE — сборка (по умолчанию page.html).
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW77_SHOTS||null, FILE=process.env.PW77_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const TREMOR_BEFORE=52;   // K.TREMOR_YEARS (50) + запас: с этого года идём ×10 до погасания
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const g=await p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; GOD.maxAll(); LN.driveLvl=5; LN.gen=5; ensureGen(5);
    while(SECTORS.length<K.RING_LAST) openSector(LN); tick(LN); LN.pauseNow=false; LN.nightSeen=true;
    for(const k in LN.colonies) if(planet(k).sec>=4) delete LN.colonies[k];   // кольца V, VI, VII пусты
    const w6=PLANETS.filter(q=>q.sec===5&&q.kind!=='works')[0], w5=PLANETS.filter(q=>q.sec===4&&q.kind!=='works')[0];
    openDoor(LN); LN.nightSeen=true;
    window.__T=[]; const seen=new WeakSet();
    new MutationObserver(()=>{ document.querySelectorAll('#toasts .toast').forEach(t=>{ if(!seen.has(t)){ seen.add(t); window.__T.push(t.textContent.replace(/\s+/g,' ').trim()) } }) })
      .observe(document.body,{childList:true,subtree:true});
    return {w6:w6.id,w5:w5.id,d7:LN.door.dark[6],d6:LN.door.dark[5],d5:LN.door.dark[4]} });
  // колонию на кольце VI ставим после прохода мимо тревоги VII (как было: мир появляется до его дня)
  await p.evaluate(w=>{ LN.colonies[w]={pid:w,pop:120,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[w]=1 },g.w6);
  const run=async(from,to)=>{ await p.evaluate(d=>{ LN.day=d; LNU.notes=[]; LNdraw() },from); await U.until(async()=>(await p.evaluate(()=>LN.day))>=to,400); await U.pause();
    await p.evaluate(()=>{ LNU.notes=[]; LNdraw() }); return p.evaluate(()=>window.__T.splice(0)) };
  // число строк LOSSES: кнопка с <b> (всего), красный бейдж — непросмотренные; нет кнопки = 0
  const lossN=()=>p.evaluate(()=>{ const bt=document.querySelector('#pfL .ltarch.loss'); return bt?+bt.querySelector('b').textContent:0 });
  const ringLog=(code,r)=>p.evaluate(([c,rr])=>LN.log.filter(e=>e.code===c&&e.d.r===rr).map(e=>e.d),[code,r]);

  // 1: ring VII, empty — tremor, warning and dark in the journal; nothing in LOSSES; no toast
  const n0=await lossN();
  let t=await run(g.d7-TREMOR_BEFORE,g.d7+2);
  const lg=await p.evaluate(()=>LN.log.filter(e=>/^ring_/.test(e.code)&&e.d.r==='VII').map(e=>e.code));
  ok('1: empty ring VII — tremor, warning and dark are in the journal', ['ring_tremor','ring_dark_near','ring_dark'].every(c=>lg.includes(c)), JSON.stringify(lg));
  const n1=await lossN();
  ok('1: an empty ring going dark adds nothing to LOSSES', n1===n0, n0+' → '+n1);
  ok('1: no toast at all while ring VII goes dark', t.length===0, JSON.stringify(t));

  // 2: ring VI holds a world — one ring_dark line and the world_dark line of that world in LOSSES; no toast
  const n2a=await lossN();
  t=await run(g.d6-TREMOR_BEFORE,g.d6+2); await shot('g2-ring6');
  const rd6=await ringLog('ring_dark','VI'), wd6=await p.evaluate(w=>LN.log.filter(e=>e.code==='world_dark'&&e.d.p===w).length,g.w6);
  const n2=await lossN();
  ok('2: ring VI with a world — ring_dark (c≥1) and world_dark are in LOSSES', rd6.some(d=>d.c>=1)&&wd6>=1&&n2>=n2a+2, JSON.stringify({rd6,wd6,n2a,n2}));
  ok('2: no toast while ring VI goes dark', t.length===0, JSON.stringify(t));

  // 3: ring V empty, one hull flying there — the hull is lost; ring_dark (s≥1) is in LOSSES; no toast
  const hid=await p.evaluate(w=>{ const s=LN.ships.find(x=>x.mode!=='dead'&&x.mode!=='building'); s.mode='transit'; s.at=null; s.dir='out'; s.dest=w; s.from=null; s.to=null; s.t=1e6; s.total=1e6; s.job='colonize'; s.crew=s.crew||5; return s.id },g.w5);
  const n3a=await lossN();
  t=await run(g.d5-TREMOR_BEFORE,g.d5+2);
  const rd5=await ringLog('ring_dark','V'), hull=await p.evaluate(id=>{ const s=LN.ships.find(x=>x.id===id); return s?s.mode:'gone' },hid);
  const n3=await lossN();
  ok('3: empty ring V with a hull bound there — ring_dark (s≥1) is in LOSSES and the hull is lost', rd5.some(d=>d.s>=1)&&hull==='dead'&&n3>=n3a+1, JSON.stringify({rd5,hull,n3a,n3}));
  ok('3: no toast while ring V goes dark with a hull on the way', t.length===0, JSON.stringify(t));

  // LOSSES: the list opens with the lines; the ring lines are there
  await U.tap('#pfL .ltarch.loss'); await p.waitForTimeout(300);
  const rows=await p.evaluate(()=>[...document.querySelectorAll('#pop .lss .lsr')].map(r=>r.textContent.replace(/\s+/g,' ').trim()));
  await shot('g3-losses-list');
  ok('LOSSES list has a line per loss (rows = count on the button)', rows.length===n3, JSON.stringify({rows:rows.length,n3}));
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
