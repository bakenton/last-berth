// pw42 — v4.36 обучение и нарратив, 1280×800: новый игрок из меню проходит все 12 шагов до Ночи с помощником
// (проводник tools/pw-tut.js, мышью). v5.05: игра только на английском — прежняя русская версия стала английской (тексты
// из английской колонки; её проверки RU-языка убраны). SKIP, ≡ Helper и старое сохранение — pw41.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'), TUT=require('./pw-tut.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ const T0=Date.now(); try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1280,height:800}}); const U=UI.ui(p);
  await U.start(null,undefined,{tut:true}); await p.evaluate(()=>{ LNU.shiftStop=true });
  // v4.40: главное меню — «Новая игра», терминал, SKIP (v5.05: без пункта языка)
  const mn=await U.menuNew('en');
  ok('menu and terminal (English)', mn.lang==='en'&&mn.term&&/^\*\* .+ \*\*$/.test(mn.first)&&mn.gone, JSON.stringify(mn));
  const r=await TUT.drive(p,U,{deadline:T0+130000,shots:process.env.LB_SHOTS?'pw42':null});
  const S=r.seen, M=r.marks, F=M.final;
  ok('все 12 шагов до Ночи и ковчега', F.step===11, 'шаг '+F.step+' год '+F.day+' · '+S.join(' '));
  const want=['m0','m1','m2','m3','N02','m4','m8','mM','m9','m10','m14','m15','N07','m17','N08','m16','N09','m18','m19'];   // m12 waits for the first parts at home
  const miss=want.filter(x=>!S.includes(x)); ok('показаны все правила и блоки истории шагов', !miss.length, 'нет '+miss.join(' ')+' · '+S.join(' '));
  ok('first rule: rations end in the forecast year', /^Earth eats more every year\. Rations run out in \d+\.$/.test((M.h_m0||{}).text||''), (M.h_m0||{}).text);
  ok('m1 names the farm', /^Settle a world that grows food — [A-Z0-9 ]+\.$/.test((M.h_m1||{}).text||''), (M.h_m1||{}).text);
  ok('m9 — the yard tab is named', /in the YARD/.test((M.h_m9||{}).text||''), (M.h_m9||{}).text);
  ok('m19 — convoy generation in a number', /[Gg]eneration [IVX]+ or newer/.test((M.h_m19||{}).text||''), (M.h_m19||{}).text);
  ok('voice: the first landing report (N-02)', /^Report from [A-Z0-9 ]+: \d+ people landed\./.test(M.v_N02||''), M.v_N02);
  ok('shift window speaks for the Institute and Alexandra (N-04)', /Shift 1 hands over the desk\. Shift 2 takes it\./.test(M.n04||'')&&/ALEXANDRA/i.test(M.n04||''), (M.n04||'').slice(0,200));
  ok('Night window is N-09', /in \d+ our galaxy collapses/.test(M.n09||''), (M.n09||'').slice(0,200));
  ok('helper button: Got it', await p.evaluate(()=>!document.querySelector('#helper.on')||/Got it/i.test(document.querySelector('#helper').textContent)));
  ok('не осталось {плейсхолдеров} в репликах', !Object.keys(M).filter(k=>/^(h_|v_)/.test(k)).some(k=>/\{\w+\}/.test(typeof M[k]==='string'?M[k]:M[k].text)), Object.keys(M).filter(k=>/^(h_|v_)/.test(k)).map(k=>typeof M[k]==='string'?M[k]:M[k].text).filter(t=>/\{\w+\}/.test(t)).join(' | '));
  ok('нет ошибок страницы', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
