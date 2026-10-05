// v3.6.2 → v4.14: «Подтянуть тексты» на вкладке Земля, с подменённым опубликованным CSV.
// Фикстуры (страница со ссылкой и CSV листа) сценарий создаёт сам. 01.10.2026: переписан на PASS/FAIL, добавлен oskip, aria-disabled.
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const fs=require('fs');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,200):''));
const DIR='/home/claude/ln/', URL='https://sheet.test/pub?output=csv';
(async()=>{ let b; try{
  const page=fs.readFileSync(DIR+'long-night.html','utf8');
  if(!/id="lb-texts" data-url=""/.test(page)) throw new Error('lb-texts data-url not empty in the build');
  fs.writeFileSync(DIR+'long-night-url.html',page.replace('id="lb-texts" data-url=""','id="lb-texts" data-url="'+URL+'"'));
  const CSV=['table,key,en,ru,where,status,note',
    'UI,day,Year-X,Год-X,header,live,changed in the sheet',
    'UI,a_idle,Hulls idle at Earth.,Корпуса без дела.,advisor,live,lost its {n}: the build must keep its own line',
    'UI,tabEarth,DRAFT,ЧЕРНОВИК,tab,draft,not live: must be ignored'].join('\n')+'\n';
  b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const open=async(file,route)=>{
    const p=await b.newPage({viewport:{width:1600,height:1000}});
    p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
    await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
    if(route) await p.route('https://sheet.test/**',route);
    await p.goto('file://'+DIR+file); await p.waitForTimeout(250);
    p.tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded({timeout:5000}); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
    await p.tap('[data-lang="en"]'); await p.tap('[data-act="oskip"]'); await p.tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false});
    return p;
  };
  const block=p=>p.evaluate(()=>{const h=[...document.querySelectorAll('#railbody .blk h3')].find(x=>/^Texts|^Тексты/.test(x.textContent.trim())); if(!h) return null; const btn=h.parentElement.querySelector('[data-act="texts"]'); return {text:h.parentElement.textContent.replace(/\s+/g,' ').trim(),off:btn?btn.getAttribute('aria-disabled')==='true':null}});
  const day=p=>p.textContent('[data-t="day"]');
  // 1. опубликованная сборка: ссылки нет, ?dev нет → блока нет
  let p=await open('long-night.html');
  ok('release build: texts block hidden', (await block(p))===null);
  ok('release build: no page errors', p.errs.length===0, p.errs[0]); await p.close();
  // 2. ссылки нет, ?dev → блок есть, кнопка заблокирована
  p=await open('long-night.html?dev'); const b2=await block(p);
  ok('?dev: texts block shown', !!b2, b2&&b2.text);
  ok('?dev without link: button aria-disabled', !!b2&&b2.off===true); await p.close();
  // 3. ссылка + лист отвечает → тексты заменены, битый плейсхолдер и черновик отброшены
  p=await open('long-night-url.html', r=>r.fulfill({status:200,contentType:'text/csv; charset=utf-8',headers:{'access-control-allow-origin':'*'},body:CSV}));
  const day0=await day(p); const b3=await block(p);
  ok('link: button enabled', !!b3&&b3.off===false);
  await p.tap('[data-act="texts"]'); await p.waitForTimeout(600);
  const toastOk=(await p.textContent('#toast')||'').trim();
  ok('sheet row applied (header year label)', (await day(p)).trim()==='Year-X', day0+' → '+(await day(p)));
  ok('draft row ignored (Earth tab)', !/DRAFT/.test(await p.textContent('.tab[data-tab="earth"]')), await p.textContent('.tab[data-tab="earth"]'));
  const adv=await p.textContent('#advisor');
  ok('row that lost {n} falls back to the build', !/Hulls idle at Earth\./.test(await p.evaluate(()=>document.body.textContent)) && (!/idle at Earth/.test(adv)||/\d+ hull\(s\) idle at Earth/.test(adv)), (adv.match(/[^.]*idle at Earth[^.]*\./)||['(advisor has no idle line)'])[0]);
  await p.tap('#b-lang'); await p.waitForTimeout(150);
  ok('RU column applied', (await day(p)).trim()==='Год-X', await day(p));
  ok('sheet case: no page errors', p.errs.length===0, p.errs[0]); await p.close();
  // 4. ссылка есть, лист недоступен → тост об ошибке, встроенные тексты на месте
  p=await open('long-night-url.html', r=>r.abort());
  await p.tap('[data-act="texts"]'); await p.waitForTimeout(700);
  const toastFail=(await p.textContent('#toast')||'').trim();
  ok('unreachable sheet: built-in texts stay', (await day(p)).trim()===day0.trim(), await day(p));
  ok('unreachable sheet: different message than success', toastFail.length>0&&toastFail!==toastOk, toastOk+' | '+toastFail);
  ok('unreachable case: no page errors', p.errs.length===0, p.errs[0]); await p.close();
}catch(e){ ok('scenario ran to the end', false, e.message.split('\n')[0]) }
  if(b) await b.close();
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length);
})();
