// pw44 — v4.40 главное меню и стартовый терминал (work/menu.js, design/menu-v1.html вариант 5): меню перед игрой, время стоит;
// клавиши; «Язык» и «Звук»; «Тест-плей» (всё открыто, без помощника); «Продолжить» из автосохранения (год · миры);
// «Загрузить из файла»; терминал: отказ на неверный глагол, верный подключает систему, Esc пропускает; хук LNtut.off;
// без WebGL2 — плоский фон и терминал без нырка; телефон 390 px. Мышь настоящая, файл — через filechooser.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const menuOn=p=>p.evaluate(()=>LNU.menu&&LBMENU.isOpen()&&!document.getElementById('menu').hidden);
  const waitTerm=async p=>{ for(let i=0;i<80&&!(await p.isVisible('#menu .mterm'));i++) await p.waitForTimeout(150); return p.isVisible('#menu .mterm') };
  const waitGone=async p=>{ for(let i=0;i<60&&await p.evaluate(()=>LNU.menu);i++) await p.waitForTimeout(150); return p.evaluate(()=>!LNU.menu&&document.getElementById('menu').hidden) };
  const labels=p=>p.evaluate(()=>[...document.querySelectorAll('#menu .mit')].map(e=>e.querySelector('.l').firstChild.textContent+'|'+e.querySelector('.s').textContent+(e.classList.contains('off')?'|off':'')+(e.classList.contains('on')?'|on':'')));

  // 1. a first start: the menu, no save on record
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await p.goto(require('url').pathToFileURL(process.env.LB_WORK||require('path').resolve(__dirname,'..','work')).href+'/page.html'); await p.waitForTimeout(600);
  ok('the menu stands in front of the game, the clock stands', await menuOn(p)&&await p.evaluate(()=>LNI.halted()&&!LNU.langPicked&&LNI.big()===null));
  let L=await labels(p);
  ok('five items; Continue is dim with no record; New game is chosen', L.length===5&&L[0]==='Continue|no record|off'&&/^New game\|\|on$/.test(L[1])&&L[3]==='Language|English'&&/^Sound\|(on|off)$/.test(L[4]), L.join(' · '));
  ok('the mark, the name, Test play and the version', await p.evaluate(()=>!!document.querySelector('#menu .mtop use')&&document.querySelector('#menu .mname').textContent==='LAST BERTH'&&/Test play/.test(document.querySelector('#menu .mtst').textContent)&&/^v\d+\.\d+$/.test(document.querySelector('#menu .mver').textContent)));
  ok('the scene is drawn (WebGL2 or the flat field)', await p.evaluate(()=>{ const c=document.querySelector('#menu .mcv'); return !!c&&c.width>2 }));
  await p.keyboard.press('ArrowDown'); ok('arrow down: Load from file', (await labels(p))[2].endsWith('|on'));
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp');
  ok('arrows skip the dim Continue (wraps to Sound)', (await labels(p))[4].endsWith('|on'), (await labels(p)).join(' · '));
  ok('a key does not reach the game under the menu', await p.evaluate(()=>LNU.paused===true&&!LNU.tab));
  await U.tap('#menu .mit[data-id="lang"]');
  L=await labels(p); ok('Language: the menu speaks Russian at once', L[1].startsWith('Новая игра')&&L[3].startsWith('Язык|Русский')&&await p.evaluate(()=>LNU.lang==='ru'&&localStorage.getItem('lb.lang')==='ru'), L.join(' · '));
  await U.tap('#menu .mit[data-id="lang"]'); ok('…and back', (await labels(p))[1].startsWith('New game'));
  const s0=await p.evaluate(()=>localStorage.getItem('lb.sfx'));
  await U.tap('#menu .mit[data-id="sound"]'); const s1=await p.evaluate(()=>localStorage.getItem('lb.sfx'));
  ok('Sound: the game\'s sound setting flips and the item says so', s1!==s0&&(await labels(p))[4].startsWith(s1==='0'?'Sound|off':'Sound|on'), s0+' → '+s1);
  await U.tap('#menu .mit[data-id="sound"]');

  // 2. the terminal: a wrong verb is refused with its reason, the right one starts the system; Esc goes to the game
  await U.tap('#menu .mit[data-id="new"]');
  ok('New game: the dive, then the terminal', await waitTerm(p));
  ok('…the clock still stands', await p.evaluate(()=>LNU.menu&&LNI.halted()));
  for(let i=0;i<400&&!(await p.isVisible('#menu .vb'));i++){ await p.keyboard.press('Space'); await p.waitForTimeout(60) }   // space finishes each line
  ok('the first system asks for a verb: four of them', (await p.evaluate(()=>[...document.querySelectorAll('#menu .vb')].map(e=>e.textContent)))+''==='1clean,2purge,3seal,4disable');
  await U.tap('#menu .vb[data-vb="1"]');
  for(let i=0;i<60&&!(await p.evaluate(()=>[...document.querySelectorAll('#menu .bl.no')].some(e=>!e._typing)));i++){ await p.keyboard.press('Space'); await p.waitForTimeout(80) }
  ok('a wrong verb: refused, with the reason', await p.evaluate(()=>[...document.querySelectorAll('#menu .bl.no')].some(e=>e._t==='│  refused: purge needs clean filters.')));
  for(let i=0;i<60&&!(await p.isVisible('#menu .vb'));i++){ await p.keyboard.press('Space'); await p.waitForTimeout(80) }
  await p.keyboard.press('1');
  for(let i=0;i<120&&await p.evaluate(()=>document.querySelector('#menu .mterm').dataset.n==='0');i++){ await p.keyboard.press('Space'); await p.waitForTimeout(80) }
  ok('the right verb (key 1): the air comes on, the noise drops', await p.evaluate(()=>document.querySelector('#menu .mterm').dataset.n==='1'&&[...document.querySelectorAll('#menu .bl.ok')].some(e=>e._t==='└─ air: clear')));
  await p.keyboard.press('Escape');
  ok('Esc: the run begins, the menu lifts off', await waitGone(p)&&await p.evaluate(()=>LNU.langPicked&&LNI.tut().msg==='m0'));
  ok('the run log has the choice', await p.evaluate(()=>LN.actions.some(a=>a.k==='menu'&&a.d.go==='new')));
  ok('no page errors (menu, terminal)', p.errs.length===0, p.errs.join(' | '));

  // 3. Continue: an autosave on record — the item shows its year and worlds, a press loads it after the dive
  await p.evaluate(()=>{ LNtut.off(); const f=PLANETS.filter(w=>w.sec===0&&w.kind==='farm')[0], s=LN.ships.find(x=>x.mode==='idle'&&x.at==='earth'); colonize(LN,s.id,f.id,foundParty(LN,s,f.id),0);
    for(let i=0;i<120;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } localStorage.setItem('lb.save',LNsave()) });
  const want=await p.evaluate(()=>({y:LN.day,w:Object.keys(LN.colonies).length}));
  await p.reload(); await p.waitForTimeout(600);
  L=await labels(p); ok('a save on record: Continue shows year and worlds and is chosen first', L[0]==='Continue|year '+want.y+' · '+want.w+' worlds|on', L.join(' · ')+' want '+JSON.stringify(want));
  await U.tap('#menu .mit[data-id="cont"]');
  ok('Continue: after the dive the run is loaded, no terminal', await waitGone(p)&&await p.evaluate(y=>LN.day===y&&LNU.langPicked&&!document.querySelector('#menu .mterm'),want.y));
  ok('…and the clock waits for the player', await p.evaluate(()=>LNU.paused===true));

  const file=require('path').join(require('os').tmpdir(),'lb-pw44-save.json'); require('fs').writeFileSync(file,await p.evaluate(()=>LNsave()));
  // 3b. a broken autosave: Continue says so in the menu itself and stays there
  await p.evaluate(()=>localStorage.setItem('lb.save','{"v":1,"G":{"seed":1,"day":77,"colonies":{}},"x"')); await p.reload(); await p.waitForTimeout(600);
  await U.tap('#menu .mit[data-id="cont"]'); for(let i=0;i<60&&!(await p.isVisible('#menu .mmsg.on'));i++) await p.waitForTimeout(150);
  ok('a broken save: the menu stays and says it would not load', await menuOn(p)&&await p.evaluate(()=>/\S/.test(document.querySelector('#menu .mmsg.on').textContent)&&!LNU.langPicked), await p.evaluate(()=>{ const m=document.querySelector('#menu .mmsg'); return m&&m.textContent }));
  // 4. Load from file, from the menu
  await p.evaluate(()=>localStorage.removeItem('lb.save')); await p.reload(); await p.waitForTimeout(600);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),U.tap('#menu .mit[data-id="load"]')]);
  await fc.setFiles(file);
  ok('Load from file: the run is loaded, the menu lifts off', await waitGone(p)&&await p.evaluate(y=>LN.day===y&&LNU.langPicked,want.y));

  // 5. Test play: everything open, no helper, no terminal
  await p.reload(); await p.waitForTimeout(600);
  await U.tap('#menu [data-m="test"]');
  ok('Test play: no terminal, the game opens with everything open and no helper', await waitGone(p)&&await p.evaluate(()=>{ const t=LNI.tut(); return !t.lock&&!t.help&&!t.msg&&LN.day===0&&document.querySelectorAll('#tabs [data-act="tab"]').length===6 }));
  await U.tap('[data-act="pop"][data-v="menu"]'); await U.tap('#pop [data-act="new"]'); await p.waitForTimeout(200);
  ok('after Test play, a new game from ≡ starts with the helper', await p.evaluate(()=>{ const t=LNI.tut(); return t.help&&t.lock&&t.msg==='m0' }));
  ok('no page errors (continue, file, test play)', p.errs.length===0, p.errs.join(' | '));
  await p.close();

  // 6. the scenarios' hook: no menu, the language window stands
  const q=await UI.newPage(b,{vp:{width:1280,height:800}}); const V=UI.ui(q);
  await V.start(null);
  ok('LNtut.off: the menu is gone, the language window stands', await q.evaluate(()=>!LNU.menu&&document.getElementById('menu').hidden&&LNI.big()==='lang'));
  await V.tap('[data-lang="en"]'); ok('…and works as before', await q.evaluate(()=>LNU.langPicked&&LNI.big()===null));
  await q.close();

  // 7. no WebGL2: the flat field, New game goes to the terminal without a dive
  const r=await UI.newPage(b,{vp:{width:1280,height:800}}); const W=UI.ui(r);
  await r.addInitScript(()=>{ const g=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(t,o){ return t==='webgl2'?null:g.call(this,t,o) } });
  await r.goto(require('url').pathToFileURL(process.env.LB_WORK||require('path').resolve(__dirname,'..','work')).href+'/page.html'); await r.waitForTimeout(600);
  ok('no WebGL2: the menu stands on the flat field', await menuOn(r)&&await r.evaluate(()=>{ const c=document.querySelector('#menu .mcv'); return !!c&&!!c.getContext('2d') }));
  await W.tap('#menu .mit[data-id="new"]'); await r.waitForTimeout(300);
  ok('…New game goes straight to the terminal', await r.isVisible('#menu .mterm'));
  ok('no page errors (no WebGL2)', r.errs.length===0, r.errs.join(' | '));
  await r.close();

  // 8. a phone: everything in the screen
  const ph=await UI.newPage(b,{vp:{width:390,height:844}}); const P=UI.ui(ph);
  await ph.goto(require('url').pathToFileURL(process.env.LB_WORK||require('path').resolve(__dirname,'..','work')).href+'/page.html'); await ph.waitForTimeout(600);
  ok('phone: the menu in phone layout, every item inside the screen, no sideways scroll', await ph.evaluate(()=>document.getElementById('menu').classList.contains('phone')&&[...document.querySelectorAll('#menu .mit')].every(e=>{ const r=e.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.height>=40 })&&document.documentElement.scrollWidth<=innerWidth));
  await P.tap('#menu .mit[data-id="new"]');
  ok('phone: the terminal', await waitTerm(ph));
  await ph.close();
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
