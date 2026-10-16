// v3.6.2 → v4.14 → v4.35: «Подтянуть тексты» в меню ≡, с подменённым опубликованным CSV.
// Фикстуры (страница со ссылкой и CSV листа) сценарий создаёт сам. v4.35: кнопка — в меню ≡ (не на вкладке Земля); без ссылки — тост, не серая кнопка.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,200):''));
const DIR=UI.WORK+'/', URL='https://sheet.test/pub?output=csv';
(async()=>{ let b; try{
  const page=fs.readFileSync(DIR+'page.html','utf8');
  if(!/id="lb-texts" data-url=""/.test(page)) throw new Error('lb-texts data-url not empty in the build');
  fs.writeFileSync(DIR+'long-night-url.html',page.replace('id="lb-texts" data-url=""','id="lb-texts" data-url="'+URL+'"'));
  // v4.35 keys: u_year (верх, «YEAR»), u_yearsN (ночь, «{n} years»), u_tabEarth (вкладка); u_yearsN без {n} — отброшен, остаётся сборка
  const CSV=['table,key,en,ru,where,status,note',
    'UI,u_year,Year-X,Год-X,header,live,changed in the sheet',
    'UI,u_yearsN,years to the Night,лет до Ночи,header,live,lost its {n}: the build must keep its own line',
    'UI,u_tabEarth,DRAFT,ЧЕРНОВИК,tab,draft,not live: must be ignored'].join('\n')+'\n';
  b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  // открыть страницу (file — сборка с ссылкой или без), язык EN, сид; route — подмена листа
  const open=async(file,route,lang)=>{
    const p=await UI.newPage(b,{file:file}); const U=UI.ui(p);
    if(route) await p.route('https://sheet.test/**',route);
    await U.start(lang||'en'); await p.evaluate(()=>{ revealNight(window.LN); LNdraw() });
    return {p:p,U:U} };
  // меню ≡ открывается после закрытия большого окна (Ночь открыта сценарием)
  const openMenu=async(U,p)=>{ await U.clear(); await U.tap('[data-act="pop"][data-v="menu"]'); return p.evaluate(()=>LNU.pop==='menu') };
  const label=p=>p.evaluate(()=>(document.querySelector('#top .yr small')||{}).textContent||'');
  const nightTxt=p=>p.evaluate(()=>(document.querySelector('#top .yr.night span')||{}).textContent||'');
  const tabsTxt=p=>p.evaluate(()=>document.getElementById('tabs').textContent);
  const toastTxt=p=>p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent.replace(/\s+/g,' ').trim()).join(' | '));
  // 1. опубликованная сборка: ссылки нет, ?dev нет → кнопки в меню нет
  let r=await open('page.html'); const m0=await openMenu(r.U,r.p);
  ok('menu opens', m0);
  ok('release build: texts button hidden', (await r.p.$('[data-act="texts"]'))===null);
  ok('release build: no page errors', r.p.errs.length===0, r.p.errs[0]); await r.p.close();
  // 2. ссылки нет, ?dev → кнопка есть, нажатие даёт тост «ссылки нет», тексты не меняются
  r=await open('page.html?dev'); await openMenu(r.U,r.p);
  ok('?dev: texts button shown', (await r.p.$('[data-act="texts"]'))!==null);
  const labDev=await label(r.p);
  await r.U.tap('[data-act="texts"]'); await r.p.waitForTimeout(200);
  ok('?dev without link: press gives a toast, year label kept', (await toastTxt(r.p)).length>0&&(await label(r.p))===labDev, (await toastTxt(r.p))+' | '+(await label(r.p)));
  await r.p.close();
  // 3. ссылка + лист отвечает → тексты заменены, битый плейсхолдер и черновик отброшены
  r=await open('long-night-url.html', route=>route.fulfill({status:200,contentType:'text/csv; charset=utf-8',headers:{'access-control-allow-origin':'*'},body:CSV}));
  const lab0=await label(r.p), night0=await nightTxt(r.p);
  await openMenu(r.U,r.p);
  ok('link: button shown', (await r.p.$('[data-act="texts"]'))!==null);
  await r.U.tap('[data-act="texts"]'); await r.p.waitForTimeout(800);
  const toastOk=await toastTxt(r.p);
  ok('sheet row applied (header year label)', (await label(r.p)).trim()==='Year-X', lab0+' → '+(await label(r.p)));
  ok('draft row ignored (Earth tab)', !/DRAFT/.test(await tabsTxt(r.p)), (await tabsTxt(r.p)).slice(0,80));
  ok('row that lost {n} falls back to the build', /\d/.test(await nightTxt(r.p)), night0+' → '+(await nightTxt(r.p)));
  if(await r.p.evaluate(()=>LNU.pop!=='menu')) await openMenu(r.U,r.p);
  await r.U.tap('[data-act="lang"]'); await r.p.waitForTimeout(150);
  ok('RU column applied', (await label(r.p)).trim()==='Год-X', await label(r.p));
  ok('sheet case: no page errors', r.p.errs.length===0, r.p.errs[0]); await r.p.close();
  // 4. ссылка есть, лист недоступен → тост об ошибке, встроенные тексты на месте
  r=await open('long-night-url.html', route=>route.abort());
  await openMenu(r.U,r.p);
  await r.U.tap('[data-act="texts"]'); await r.p.waitForTimeout(900);
  const toastFail=await toastTxt(r.p);
  ok('unreachable sheet: built-in texts stay', (await label(r.p)).trim()===lab0.trim(), await label(r.p));
  ok('unreachable sheet: different message than success', toastFail.length>0&&toastFail!==toastOk, toastOk+' | '+toastFail);
  ok('unreachable case: no page errors', r.p.errs.length===0, r.p.errs[0]); await r.p.close();
}catch(e){ ok('scenario ran to the end', false, e.message.split('\n')[0]) }
  if(b) await b.close();
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length);
})();
