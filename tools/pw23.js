// v4.3 — the opening: six cards after the language, skip, keys, replay from the start screen, RU
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,260):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const txt=async()=>await p.evaluate(()=>document.querySelector('#introbox .otext')?.textContent||'');
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  // 1. language → opening card 1, not the start screen
  await tap('[data-lang="en"]');
  ok('opening shown after language', await p.isVisible('#introbox.opening'));
  ok('start screen not shown yet', !(await p.isVisible('#startbox')));
  ok('card 1 text', /EARTH, YEAR 0/.test(await txt()), await txt());
  ok('card 1 art (svg)', await p.evaluate(()=>!!document.querySelector('#introbox .oart svg')));
  ok('clock paused behind the opening', await p.evaluate(()=>LNU.paused===true));
  await p.screenshot({path:'open-1.png'});
  // 2. next by button, by art click, by keys
  await tap('[data-act="onext"]'); ok('card 2 by button', /burns a little more/.test(await txt()), await txt());
  await tap('#introbox .oart'); ok('card 3 by clicking the picture', /one Institute/.test(await txt()), await txt());
  await p.keyboard.press('Space'); await p.waitForTimeout(80); ok('card 4 by Space', /orders hulls built/.test(await txt()), await txt());
  ok('Space did not unpause the clock', await p.evaluate(()=>LNU.paused===true));
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80); ok('card 5 by ArrowRight', /eighty years/.test(await txt()), await txt());
  await p.screenshot({path:'open-5.png'});
  await p.keyboard.press('Enter'); await p.waitForTimeout(80); ok('card 6 by Enter', /For now\./.test(await txt()), await txt());
  const last=await p.evaluate(()=>document.querySelector('#introbox .gnav .btn.prim').textContent);
  ok('last card button = sit down', last==='Sit down at the desk', last);
  ok('no skip on last card', !(await p.isVisible('[data-act="oskip"]')));
  await p.screenshot({path:'open-6.png'});
  await tap('[data-act="onext"]');
  ok('start screen after the last card', await p.isVisible('#startbox'));
  ok('opening class cleared', !(await p.isVisible('#introbox.opening')));
  // 3. replay from the start screen, then skip
  await tap('[data-act="opening"]'); ok('replay from start screen', /EARTH, YEAR 0/.test(await txt()));
  await tap('[data-act="oskip"]'); ok('skip → start screen', await p.isVisible('#startbox'));
  // 4. Escape skips; then the prologue still opens
  await tap('[data-act="opening"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(80);
  ok('Escape → start screen', await p.isVisible('#startbox'));
  await tap('[data-act="prologue"]'); ok('prologue starts after the opening', await p.evaluate(()=>LNU.pro.on===true));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  // 5. RU
  const q=await b.newPage({viewport:{width:1600,height:1000}}); q.errs=[]; q.on('pageerror',e=>q.errs.push(String(e)));
  await q.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  await q.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await q.waitForTimeout(300);
  await q.click('[data-lang="ru"]'); await q.waitForTimeout(120);
  const ru=await q.evaluate(()=>document.querySelector('#introbox .otext').textContent);
  ok('RU card 1', /ЗЕМЛЯ, ГОД 0/.test(ru), ru);
  const rub=await q.evaluate(()=>[...document.querySelectorAll('#introbox .gnav .btn')].map(e=>e.textContent).join('/'));
  ok('RU buttons', rub==='Пропустить/Дальше', rub);
  await q.screenshot({path:'open-ru.png'});
  // 6. narrow screen
  await q.setViewportSize({width:390,height:800}); await q.waitForTimeout(150);
  const fits=await q.evaluate(()=>{const r=document.querySelector('#introbox').getBoundingClientRect(); return r.right<=window.innerWidth+1&&r.bottom<=window.innerHeight+1&&document.documentElement.scrollWidth<=window.innerWidth});
  ok('fits 390px, no sideways scroll', fits);
  await q.screenshot({path:'open-390.png'});
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
