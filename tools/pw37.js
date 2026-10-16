// v4.28 — F-11: the larder forecast. An idle desk (no farm line) must get the 'food_horizon' notice centuries before
// the famine, the advisor line, the Earth cell horizon, EN and RU, no raw placeholders. node pw37.js [page.html]
// v4.35: уведомление — #noteL (окно «note»), советник — LNI.adv(), запасы — полоса #res .rc[data-r="food"].
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const page=process.argv[2]||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{file:page}); const U=UI.ui(p);
  // уведомления: текст окна «note» читается перед закрытием
  const notes=[];
  const closeNotes=async()=>{ for(let i=0;i<12;i++){ const k=await p.evaluate(()=>LNI.big());
      if(k==='note'){ notes.push(await p.evaluate(()=>document.getElementById('noteL').textContent.replace(/\s+/g,' '))); await U.tap('#noteL [data-act="noteok"]') }
      else if(k==='shift'){ await U.tap('#noteL [data-act="shiftok"]') } else if(k==='night'){ await U.tap('#noteL [data-act="nightok"]') } else break } };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.over) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await closeNotes() };
  await U.start('en',11);
  await p.evaluate(()=>{ LNU.shiftStop=false; LNdraw() });

  // === an idle desk: no farm line ever. Run until the notice speaks or 1600 years pass.
  let warn=null; for(let i=0;i<16&&!warn;i++){ await run(100); warn=await p.evaluate(()=>{ var e=LN.log.find(e=>e.code==='food_horizon'); return e?{day:e.day,d:e.d}:null }) }
  ok('food horizon notice fired', !!warn, JSON.stringify(warn));
  ok('fired at or after K.FOOD_PAUSE_FROM', warn&&warn.day>=600, warn&&warn.day);
  ok('forecast year lies ahead by FOOD_HORIZON at most', warn&&warn.d.n>0&&warn.d.n<=400&&warn.d.y===warn.day+warn.d.n, warn&&JSON.stringify(warn.d));
  const fc=await p.evaluate(()=>LN.foodFc&&{y:LN.foodFc.y,n:LN.foodFc.n,hungry:!!LN.hungry,day:LN.day,food:Math.round(LN.earth.food)});
  ok('Earth is not hungry yet when the forecast speaks', fc&&!fc.hungry, JSON.stringify(fc));
  const t1=notes.join(' ');
  ok('EN larder line shown in a notice', /THE LARDERS HAVE A DATE\. On today's lines Earth's rations run out around year \d+, \d+ years from now; \d+ in store, \d+ farms feeding home\./.test(t1), (t1.match(/THE LARDERS[^.]*\.[^.]*\./)||[t1.slice(0,200)])[0]);
  ok('no raw placeholders in the notice', !/\{[ynhk]\}/.test(t1));

  // === the advisor carries it, no undefined
  const advTxt=()=>p.evaluate(()=>LNI.adv().map(r=>r[1]+' '+r[2]).join(' | '));
  const adv=await advTxt();
  // v4.35: советник — только о мирах (Nikita 15.10): строки о провизии Земли там больше не выводятся
  ok('advisor lists worlds only (Nikita 15.10): every row points at a world', await p.evaluate(()=>LNI.adv().every(r=>!!planet(r[3]))), adv.slice(0,200));
  ok('advisor line has no undefined/placeholder', !/undefined|\{[ynh]\}/.test(adv));

  // === the Earth cell shows the horizon year
  const cell=await p.evaluate(()=>{ var e=document.querySelector('#res .rc[data-r="food"]'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('rations cell: "ends ≈ YEAR"', /ends ≈ \d{3,4}/.test(cell), cell);
  await p.screenshot({path:'v428-horizon-en.png'});

  // === RU: the same desk in Russian (own run)
  const q=await UI.newPage(b,{file:page}); const V=UI.ui(q);
  await V.start('ru',11);
  const notesRu=[]; let gotRu=false;
  for(let i=0;i<16&&!gotRu;i++){ await q.evaluate(()=>{ for(let k=0;k<100;k++){ if(LN.over) break; tick(LN); LN.pauseNow=false } LNdraw() });
    for(let j=0;j<12;j++){ const k=await q.evaluate(()=>LNI.big()); if(k==='note'){ const t=await q.evaluate(()=>document.getElementById('noteL').textContent.replace(/\s+/g,' ')); notesRu.push(t); if(/У КЛАДОВЫХ/.test(t)) gotRu=true; await V.tap('#noteL [data-act="noteok"]') } else if(k==='shift') await V.tap('#noteL [data-act="shiftok"]'); else if(k==='night') await V.tap('#noteL [data-act="nightok"]'); else break } }
  const t2=notesRu.join(' ');
  ok('RU larder line shown in a notice', /У КЛАДОВЫХ ПОЯВИЛАСЬ ДАТА/.test(t2), (t2.match(/У КЛАДОВЫХ.{0,160}/)||[t2.slice(0,160)])[0]);
  const advRu=await q.evaluate(()=>LNI.adv().map(r=>r[1]+' '+r[2]).join(' | '));
  ok('RU advisor lists worlds only (Nikita 15.10)', await q.evaluate(()=>LNI.adv().every(r=>!!planet(r[3]))), advRu.slice(0,200));
  const cellRu=await q.evaluate(()=>{ var e=document.querySelector('#res .rc[data-r="food"]'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('RU rations cell: "кончится ≈ YEAR"', /кончится ≈ \d{3,4}/.test(cellRu), cellRu);
  await q.close();

  // === the famine really comes later: the warning was ahead of it, not after
  await run(600);
  const later=await p.evaluate(()=>({day:LN.day,hungry:!!LN.hungry,famine:LN.famine||0,over:LN.over||null,first:(LN.log.find(e=>e.code==='earth_dead')||{}).day||null}));
  ok('famine starts after the warning (lead > 150 years)', later.first&&warn&&later.first-warn.day>150, JSON.stringify(later));
  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+String(e).slice(0,300)) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length); process.exit(0);
})();
