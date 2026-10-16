// v1 (первый прогон всей игры) → v4.35: язык, клик по миру, Ночь, ковчег, финал — на новом интерфейсе (окна #noteL, #ovl, вкладки #tabs).
// Пролог, вступление и руководство в v4.35 удалены: проверяется старт на паузе после выбора языка.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await U.start('ru');
  await p.screenshot({path:'v1-lang.png'});
  console.log('lang window:', await p.evaluate(()=>LNI.big()), '| paused at start:', await p.evaluate(()=>LNU.paused));
  // real click still works under the new style
  const id=await p.evaluate(()=>PLANETS[3].id);
  const opened=await U.openWorld(id);
  console.log('click -> world:', opened, '| window:', await p.evaluate(()=>LNU.win), '| wanted', id);
  await U.closeWin();
  // play a bit
  await U.years(3,10,200); await p.waitForTimeout(100);
  await p.screenshot({path:'v3-desk.png'});
  // force the Night
  await p.evaluate(()=>{ const G=window.LN; G.earth.metal=9000;G.earth.parts=3000;G.earth.fuel=9000;G.earth.food=9000; revealNight(G); LNdraw(); });
  console.log('night modal shown:', (await p.evaluate(()=>LNI.big()))==='night', '| title:', await p.textContent('#noteL h2').catch(()=>''));
  await p.screenshot({path:'v4-night.png'});
  await U.tap('[data-act="nightok"]'); await p.waitForTimeout(200);
  console.log('night cell:', await p.textContent('#top .night b').catch(()=>'none'));
  await U.tab('ark');
  const arkTxt=await p.textContent('#ovl').catch(()=>'');
  console.log('ark block:', /Ark|Ковчег|ковчег/i.test(arkTxt), '| buy available:', await p.evaluate(()=>!!document.querySelector('[data-act="arkbuy"]:not([aria-disabled="true"])')));
  // v4.24: the ark has levels, not berths; buy level 1
  await U.tap('[data-act="arkbuy"][data-l="1"]'); await p.waitForTimeout(80);
  console.log('ark level:', await p.evaluate(()=>window.LN.ark.lv), '| level paid:', await p.evaluate(()=>arkLevel(window.LN)));
  await p.screenshot({path:'v5-ark.png'});
  await U.tab('ark');
  // jump to the end
  await p.evaluate(()=>{ const G=window.LN; G.driveLvl=G.arkMark; G.gen=G.driveLvl; ensureGen(G.gen); G.night=G.day+2; LNdraw(); });   // v4.0: the ark needs its drive
  await U.until(()=>p.evaluate(()=>!!window.LN.over),200,10);
  await U.pause();
  console.log('over:', await p.evaluate(()=>window.LN.over), '| souls:', await p.evaluate(()=>window.LN.souls));
  console.log('end title:', await p.textContent('#noteL h2').catch(()=>''));
  await p.screenshot({path:'v6-end.png'});
  console.log('errors:', p.errs.length?p.errs:'none');
  await b.close();
})();
