// pw49 — v4.46 (Никита 03.11): лог пишет время партии с нажатия New Game. Меню мышью, терминал, ход на 4×, пауза, экспорт,
// сохранение и загрузка: часы идут с нажатия, у действий и снимков есть s (секунды), в экспорте clock.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  await p.goto(require('url').pathToFileURL(process.env.LB_WORK||require('path').resolve(__dirname,'..','work')).href+'/page.html'); await p.waitForTimeout(600);
  ok('before the press there is no clock', await p.evaluate(()=>!LN.clock));
  const seen=await U.menuNew('en');
  const c0=await p.evaluate(()=>JSON.parse(JSON.stringify(LN.clock)));
  ok('the press starts the clock, the terminal counts as stopped', !!c0&&c0.from==='new'&&c0.ms>500&&c0.run<300&&/^\d{4}-/.test(c0.at),JSON.stringify(c0)+' '+JSON.stringify(seen));
  await U.clear();
  await p.evaluate(()=>LNtut.off());
  await U.play(4); await p.waitForTimeout(2500); await U.pause();
  const c1=await p.evaluate(()=>JSON.parse(JSON.stringify(LN.clock)));
  ok('running at 4× counts as running and by speed', c1.run-c0.run>1500&&(c1.sp[4]||0)>1500,JSON.stringify(c1));
  await p.waitForTimeout(1500);
  const c2=await p.evaluate(()=>JSON.parse(JSON.stringify(LN.clock)));
  ok('a pause counts in the total, not in running', c2.ms-c1.ms>1200&&c2.run===c1.run,JSON.stringify(c2));
  await p.evaluate(()=>{ LN.actions.length=0; act(LN,'probe',{}) });
  const J=await p.evaluate(()=>JSON.parse(exportLog(LN)));
  ok('export: clock with total, running, stopped and by speed', J.clock&&J.clock.from==='new'&&J.clock.total>=3&&J.clock.running>=1&&J.clock.bySpeed['4x']>=1,JSON.stringify(J.clock));
  ok('export: an action carries seconds since the press', J.actions[0]&&typeof J.actions[0].s==='number'&&J.actions[0].s>=3,JSON.stringify(J.actions[0]));
  const sv=await p.evaluate(()=>LNsave());
  await p.evaluate(t=>{ LNload(t) },sv);
  const c3=await p.evaluate(()=>JSON.parse(JSON.stringify(LN.clock)));
  ok('the clock survives save and load', c3&&c3.from==='new'&&Math.abs(c3.ms-c2.ms)<3000,JSON.stringify(c3));
  const old=JSON.parse(sv); delete old.G.clock;
  await p.evaluate(t=>{ LNload(t) },JSON.stringify(old));
  const c4=await p.evaluate(()=>({c:LN.clock,d:LN.day}));
  ok('a save without a clock counts from the load', c4.c&&c4.c.from==='save'&&c4.c.year===c4.d,JSON.stringify(c4));
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
 }catch(e){ out.push('ERROR '+String(e&&e.stack||e).slice(0,600)) }
 console.log(out.join('\n'));
 process.exit(out.some(l=>/^(FAIL|ERROR)/.test(l))?1:0);
})();
