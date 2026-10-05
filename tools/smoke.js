// smoke — один сквозной прогон: язык → пропуск вступления → пролог (стадия 1→2) → 200 лет на ×10 → вкладки Миры/Земля → Ночь → финал.
// Без скриншотов. Запуск через tools/regress.sh smoke (пути переписывает regress.sh).
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,200):''));
(async()=>{ let b; try{
  b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  await p.route('**/fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
  const tap=async sel=>{ for(let k=0;;k++){ try{ const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded({timeout:5000}); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120); return }catch(e){ if(k>=2||!/not attached|no /.test(e.message)) throw e; await p.waitForTimeout(150) } } };   // the UI redraws panels: retry a detached node
  const closePf=async()=>{ for(let i=0;i<6&&await p.isVisible('#pf');i++) await tap('[data-act="pfok"]') };
  const dismiss=async()=>{ for(let i=0;i<8&&await p.evaluate(()=>!!document.getElementById('callout'));i++) await tap('[data-act="callok"]') };
  const stage=async()=>p.evaluate(()=>parseInt((document.querySelector('#task .tk span:last-child')||{textContent:'0'}).textContent));
  const day=async()=>p.evaluate(()=>LN.day);
  const play=async()=>{ if(await p.evaluate(()=>LNU.paused)) await tap('#b-pause') };   // #b-pause toggles the clock; #b-auto is fast-forward — not used
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  // 1. язык и вступление
  await tap('[data-lang="en"]');
  ok('opening cards shown', await p.isVisible('[data-act="oskip"]'));
  await tap('[data-act="oskip"]');
  ok('start screen after skip', await p.isVisible('[data-act="prologue"]'));
  // 2. пролог: основать шахту, дождаться стадии 2
  await tap('[data-act="prologue"]'); await dismiss();
  ok('prologue stage 1', (await stage())===1, await stage());
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  const bb=await p.locator('[data-p="'+mine+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150);
  await tap('[data-act="colonize"]');
  ok('hull launched', await p.evaluate(()=>LN.ships.some(s=>s.job==='colonize')));
  await play(); await tap('[data-spd="10"]');
  for(let t=0;t<120&&(await stage())<2;t++){ await p.waitForTimeout(250); await dismiss(); await closePf() }
  ok('prologue stage 2', (await stage())>=2, await stage());
  // выход из пролога: рельсы пролога глотают клики, proEnd() не глобален — повторяем proEnd() (ui.js) через dev-хуки
  await p.evaluate(()=>{ const U=LNU; U.pro.on=false; U.pro.stage=6; LN.safe=false; U.pro.calls=['cAdvisor']; U.voiceSeq=Math.max(0,...LN.log.map(e=>e.seq||0)); U.shiftStop=false; LNdraw() });
  await dismiss(); ok('prologue closed', await p.evaluate(()=>!LNU.pro.on));
  // 3. 200 лет на ×10
  const d0=await day(); await play(); await tap('[data-spd="10"]');
  for(let t=0;t<200&&(await day())<d0+200&&!(await p.evaluate(()=>LN.over));t++){ await p.waitForTimeout(250); await closePf(); if(await p.isVisible('#intro')) await tap('[data-act="nightok"]') }
  const d1=await day(); await tap('#b-pause');   // pause
  ok('200 years at x10', d1-d0>=200, d0+'→'+d1);
  ok('game still running', !(await p.evaluate(()=>LN.over)));
  // 4. вкладки
  await closePf(); await tap('.tab[data-tab="worlds"]');
  ok('Worlds tab opens', await p.evaluate(()=>document.querySelector('.tab.on').dataset.tab==='worlds'&&document.getElementById('railbody').textContent.trim().length>20));
  await closePf(); await tap('.tab[data-tab="earth"]');
  ok('Earth tab opens', await p.evaluate(()=>document.querySelector('.tab.on').dataset.tab==='earth'&&document.getElementById('railbody').textContent.trim().length>20));
  // 5. Ночь
  await p.evaluate(()=>{ const G=LN; G.earth.metal=9000;G.earth.parts=3000;G.earth.fuel=9000;G.earth.food=9000; revealNight(G); LNdraw() });
  await closePf(); await tap('.tab[data-tab="worlds"]'); await tap('.tab[data-tab="earth"]');
  ok('Night modal', await p.isVisible('#intro'), await p.textContent('#introbox h2').catch(()=>''));
  await tap('[data-act="nightok"]'); await closePf();
  ok('Night date in header', /\d/.test(await p.textContent('#h-night')), await p.textContent('#h-night'));
  // 6. финал
  await p.evaluate(()=>{ const G=LN; G.driveLvl=G.arkMark; G.gen=G.driveLvl; ensureGen(G.gen); G.night=G.day+2 });
  await play();
  for(let t=0;t<40&&!(await p.evaluate(()=>LN.over));t++){ await p.waitForTimeout(250); await closePf() }
  ok('game over reached', !!(await p.evaluate(()=>LN.over)), await p.evaluate(()=>LN.over));
  ok('finale screen', await p.isVisible('#ovbox')&&(await p.textContent('#ovbox h2')).trim().length>0, await p.textContent('#ovbox h2').catch(()=>''));
  ok('no page errors', errs.length===0, errs.slice(0,2).join(' | '));
}catch(e){ ok('scenario ran to the end', false, e.message.split('\n')[0]) }
  if(b) await b.close();
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length);
})();
