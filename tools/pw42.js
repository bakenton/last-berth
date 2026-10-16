// pw42 — v4.36 обучение и нарратив по-русски, 1280×800: новый игрок с экрана запуска проходит все 12 шагов до Ночи с помощником
// (проводник tools/pw-tut.js, мышью); тексты помощника, голоса и окон — из русской колонки листа. EN, SKIP и старое сохранение — pw41.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'), TUT=require('./pw-tut.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ const T0=Date.now(); try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1280,height:800}}); const U=UI.ui(p);
  await U.start(null,undefined,{tut:true}); await p.evaluate(()=>{ LNU.shiftStop=true });
  await U.tap('[data-lang="ru"]'); await p.waitForTimeout(300);
  ok('экран запуска по-русски', await p.evaluate(()=>LNI.tut().nar==='N01'&&document.querySelector('#launch .lfr.on .lln').textContent.startsWith('Земля выработана')&&/ИНСТИТУТ/i.test(document.querySelector('#launch .lcap').textContent)));
  const r=await TUT.drive(p,U,{deadline:T0+130000,shots:process.env.LB_SHOTS?'pw42':null});
  const S=r.seen, M=r.marks, F=M.final;
  ok('все 12 шагов до Ночи и ковчега', F.step===11, 'шаг '+F.step+' год '+F.day+' · '+S.join(' '));
  const want=['N01','m0','m1','m2','m3','N02','m4','m8','mM','m9','m10','m14','m15','N07','m17','N08','m16','N09','m18','m19'];   // m12 waits for the first parts at home
  const miss=want.filter(x=>!S.includes(x)); ok('показаны все правила и блоки истории шагов', !miss.length, 'нет '+miss.join(' ')+' · '+S.join(' '));
  ok('первое правило — по-русски, год из прогноза', /^Земля ест больше с каждым годом\. Рационы кончатся в \d+-м\.$/.test((M.h_m0||{}).text||''), (M.h_m0||{}).text);
  ok('m1 называет ферму', /^Заселите мир, где растёт еда, — [A-Z0-9 ]+\.$/.test((M.h_m1||{}).text||''), (M.h_m1||{}).text);
  ok('m9 — вкладка «Верфь» по-русски', /во вкладке ВЕРФЬ/.test((M.h_m9||{}).text||''), (M.h_m9||{}).text);
  ok('m19 — поколение конвоя числом', /суда [IVX]+ поколения и новее/.test((M.h_m19||{}).text||''), (M.h_m19||{}).text);
  ok('голос: доклад о первой посадке', /^Доклад с [A-Z0-9 ]+: высадились \d+ человек\./.test(M.v_N02||''), M.v_N02);
  ok('окно смены — Институт и Александра', /Смена 1 сдаёт пульт\. Заступает смена 2\./.test(M.n04||'')&&/АЛЕКСАНДРА/i.test(M.n04||'')&&/Принять пульт/.test(M.n04||''), (M.n04||'').slice(0,200));
  ok('окно Ночи — N-09', /Физики назвали дату: в \d+ наша галактика схлопнется\./.test(M.n09||''), (M.n09||'').slice(0,200));
  ok('кнопка «Понятно» по-русски', await p.evaluate(()=>!document.querySelector('#helper.on')||/Понятно/i.test(document.querySelector('#helper').textContent)));
  ok('не осталось {плейсхолдеров} в репликах', !Object.keys(M).filter(k=>/^(h_|v_)/.test(k)).some(k=>/\{\w+\}/.test(typeof M[k]==='string'?M[k]:M[k].text)), Object.keys(M).filter(k=>/^(h_|v_)/.test(k)).map(k=>typeof M[k]==='string'?M[k]:M[k].text).filter(t=>/\{\w+\}/.test(t)).join(' | '));
  ok('нет ошибок страницы', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
