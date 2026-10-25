// debug-check — панель отладки в обычной странице (v4.40: god-сборки нет; v4.43: включается кнопкой Test play главного меню), настоящий браузер: node tools/debug-check.js (из корня, после сборки)
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const path=require('path'),url=require('url');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,160):''));
(async()=>{ let b; try{
  b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1500,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await p.goto(url.pathToFileURL(path.resolve(__dirname,'..','work','page.html')).href); await p.waitForTimeout(800);
  ok('no DEBUG tab before TEST PLAY', !(await p.isVisible('#god-tab')));
  await p.keyboard.press('Backquote'); ok('` does nothing before TEST PLAY', !(await p.isVisible('#god')));
  const r=await p.locator('#menu [data-m="test"]').boundingBox(); await p.mouse.click(r.x+r.width/2,r.y+r.height/2);   // the main menu: Test play
  for(let i=0;i<60&&await p.evaluate(()=>LNU.menu);i++) await p.waitForTimeout(150);
  ok('TEST PLAY opens the panel', await p.isVisible('#god'));
  ok('DEBUG tab present', await p.isVisible('#god-tab'));
  ok('the menu is gone, everything open', await p.evaluate(()=>LNU.langPicked&&!LNU.menu&&document.getElementById('menu').hidden&&!LNI.tut().help));
  const btn=t=>p.click('#god [data-g="'+t+'"]',{timeout:4000});
  await btn('skip:100');
  const d1=await p.evaluate(()=>LN.day); ok('skip +100 moves clock', d1>=100, d1);
  await btn('skip:500'); const d2=await p.evaluate(()=>LN.day); ok('skip +500', d2>=d1+500, d1+'→'+d2);
  const m0=await p.evaluate(()=>LN.earth.metal); await btn('res:metal:2000');
  ok('metal +2k', Math.round((await p.evaluate(()=>LN.earth.metal))-m0)===2000);
  await btn('night'); ok('Night dated', await p.evaluate(()=>!!LN.night));
  await p.screenshot({path:path.resolve(__dirname,'..','work','debug-night.png')}); await btn('save:1'); const sd=await p.evaluate(()=>LN.day);
  await btn('skip:100'); await btn('load:1');
  const back=await p.evaluate(()=>({d:LN.day,n:Object.keys(LN.colonies).length,sec:SECTORS.length,pl:PLANETS.length}));
  ok('load restores the year', back.d===sd, sd+' vs '+back.d);
  await btn('skip:50'); ok('game ticks after load', (await p.evaluate(()=>LN.day))===sd+50);
  await btn('arkReady'); await btn('nightIn:30'); await btn('skip:50');
  await p.click('#god-tab'); ok('the tab closes the panel', !(await p.isVisible('#god')));
  await p.keyboard.press('Backquote'); ok('` opens it again', await p.isVisible('#god'));
  ok('game over reached via debug', !!(await p.evaluate(()=>LN.over)), await p.evaluate(()=>LN.over));
  ok('no page errors', errs.length===0, errs.slice(0,2).join(' | '));
  await p.screenshot({path:path.resolve(__dirname,'..','work','debug-check.png')});
}catch(e){ ok('scenario ran to the end', false, e.message.replace(/\s*\n\s*/g,' | ').slice(0,700)) }
  if(b) await b.close();
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.length);
})();
