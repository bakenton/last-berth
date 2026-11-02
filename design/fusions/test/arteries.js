// Проверка песочницы артерий: мышь на 1440×900 и касание на 390×844, тяга линии, отказы, сверка чисел с расчётом.
// node design/fusions/test/arteries.js
const {chromium}=require('E:/ClaudeCowork/last-berth/node_modules/playwright');
const path=require('path'),fs=require('fs');
const F='file:///'+path.resolve(__dirname,'..','arteries.html').replace(/\\/g,'/');
const SH=path.join(__dirname,'shots'); fs.mkdirSync(SH,{recursive:true});
let bad=0; const ok=(c,m)=>{ console.log((c?'ok   ':'FAIL ')+m); if(!c) bad++ };

async function run(b,name,opt,drag){
  const ctx=await b.newContext(opt), p=await ctx.newPage(), errs=[], net=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()) });
  p.on('request',r=>{ if(!r.url().startsWith('file:')&&!r.url().startsWith('data:')) net.push(r.url()) });
  await p.goto(F); await p.waitForTimeout(300);
  const pos=async id=>p.evaluate(i=>{ const q=GAME.xy(i), r=GAME.canvas.getBoundingClientRect(); return {x:q.x+r.left,y:q.y+r.top} },id);
  const par=id=>p.evaluate(i=>GAME.state.par[i],id);

  await drag(p,await pos('w25'),await pos('w20'));
  ok(await par('w25')==='w20',name+': линия Tallowfen → Loam протянута');
  ok(!(await p.locator('#hint').isVisible()),name+': подсказка ушла после первой линии');
  const sh=await p.evaluate(()=>GAME.calc(GAME.state.par).n);
  ok(sh>0,name+': флот считается, судов '+sh);

  await drag(p,await pos('w20'),await pos('w25'));
  ok(await par('w20')==='earth',name+': линия от Земли наружу отклонена');
  await p.locator('#hops .btn[data-h="1"]').click();
  ok(await p.locator('#warn').textContent()!=='',name+': при дальности 1 видно, кто не долетает');
  await drag(p,await pos('w24'),await pos('w1'));
  ok(await par('w24')==='earth',name+': перелёт дальше дальности отклонён');

  await p.locator('#hops .btn[data-h="2"]').click();
  await p.locator('#web').click();
  const m=await p.evaluate(()=>({t:GAME.calc(GAME.state.par),b:GAME.base}));
  const mp=Math.round(100*(m.t.metal/m.b.metal-1));
  console.log('     паутина при дальности 2: суда '+m.b.n+'→'+m.t.n+', металл '+mp+'%, экипаж '+Math.round(100*(m.t.crew/m.b.crew-1))+'%, топливо '+Math.round(100*(m.t.fuel/m.b.fuel-1))+'%, путь домой '+m.b.far+'→'+m.t.far);
  ok((await p.locator('#warn').textContent())==='',name+': паутина законна при дальности 2');

  const hub=await p.evaluate(()=>{ const c={}; Object.values(GAME.state.par).forEach(v=>{ if(v!=='earth') c[v]=(c[v]||0)+1 }); return Object.keys(c).sort((a,b)=>c[b]-c[a])[0] });
  const hp=await pos(hub);
  if(opt.hasTouch) await p.touchscreen.tap(hp.x,hp.y); else await p.mouse.click(hp.x,hp.y);
  await p.waitForTimeout(150);
  await p.locator('#fall').click();
  ok(/теряется \d+%/.test(await p.locator('#sel').textContent()),name+': падение узла считает потерю: '+(await p.locator('.lost').textContent()));
  await p.waitForTimeout(250);
  await p.screenshot({path:path.join(SH,'arteries-'+name+'-web.png')});
  await p.locator('#fall').click();
  await p.locator('#rays').click(); await p.waitForTimeout(150);
  await p.screenshot({path:path.join(SH,'arteries-'+name+'-rays.png')});

  const noScroll=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  ok(noScroll,name+': нет горизонтальной прокрутки');
  ok(!errs.length,name+': ошибок нет'+(errs.length?' '+errs.join(' | '):''));
  ok(!net.length,name+': сети нет');
  await ctx.close();
}

(async()=>{
  const b=await chromium.launch();
  await run(b,'pc',{viewport:{width:1440,height:900}},async(p,a,c)=>{ await p.mouse.move(a.x,a.y); await p.mouse.down(); await p.mouse.move((a.x+c.x)/2,(a.y+c.y)/2,{steps:5}); await p.mouse.move(c.x,c.y,{steps:5}); await p.mouse.up(); await p.waitForTimeout(60) });
  /* касание: настоящая тяга пальцем через CDP, tap в Playwright её не умеет */
  await run(b,'phone',{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2},async(p,a,c)=>{
    const s=await p.context().newCDPSession(p), ev=(type,x,y)=>s.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
    await ev('touchStart',a.x,a.y); for(let i=1;i<=6;i++) await ev('touchMove',a.x+(c.x-a.x)*i/6,a.y+(c.y-a.y)*i/6); await ev('touchEnd'); await p.waitForTimeout(80) });
  await b.close();
  console.log(bad?'ПРОВАЛОВ: '+bad:'всё зелёное'); process.exit(bad?1:0);
})();
