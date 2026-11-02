// Песочница в браузере: мышь 1280×800 и касание 390×844, заселить, цепочка мир → узел → Земля. node design/nodes/check-page.js
const {chromium}=require('E:/ClaudeCowork/last-berth/node_modules/playwright');
const path=require('path'),fs=require('fs');
const F='file:///'+path.resolve(__dirname,'nodes.html').replace(/\\/g,'/'), SH=process.argv[2]||require('os').tmpdir();
let bad=0; const ok=(c,m)=>{ console.log((c?'ok   ':'FAIL ')+m); if(!c) bad++ };

async function run(b,name,opt){
  const ctx=await b.newContext(opt), p=await ctx.newPage(), errs=[], net=[], touch=!!opt.hasTouch;
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()) });
  p.on('request',r=>{ if(!r.url().startsWith('file:')&&!r.url().startsWith('data:')) net.push(r.url()) });
  await p.goto(F); await p.waitForTimeout(300); await p.evaluate(()=>{ NS.G.safe=true });   // без случайных потерь: поселенцы и суда не гибнут посреди сценария
  const at=id=>p.evaluate(i=>{ const q=NS.pos()[i], r=document.getElementById('c').getBoundingClientRect(); return {x:q.x+r.left,y:q.y+r.top} },id);
  const tapAt=async q=>{ if(touch) await p.touchscreen.tap(q.x,q.y); else await p.mouse.click(q.x,q.y); await p.waitForTimeout(80) };
  const tapBtn=async sel=>{ const l=p.locator(sel).first(); await l.scrollIntoViewIfNeeded(); if(touch) await l.tap(); else await l.click(); await p.waitForTimeout(80) };
  const ids=await p.evaluate(()=>{ const P=NS.C.PLANETS, a=P.find(x=>x.sec===1&&x.kind==='mine'), b=P.filter(x=>x.sec===0&&x.kind!=='works').sort((u,v)=>{ const d=(q,r)=>Math.abs(q.ang-r.ang); return d(u,a)-d(v,a) })[0]; return {a:a.id,b:b.id,an:a.name,bn:b.name} });
  ok(await p.getByText('Партия сейчас').isVisible(),name+': панель правил видна');
  await tapBtn('[data-a=speed][data-v="15"]');
  await tapAt(await at(ids.a));
  ok((await p.locator('#panel h2').innerText())===ids.an,name+': мир выбран по карте — '+ids.an);
  await tapBtn('#panel [data-a=settle][data-v=courier]');
  ok(await p.getByText('Поселенцы в пути').isVisible(),name+': поселенцы в пути');
  await tapAt(await at(ids.b));
  await tapBtn('#panel [data-a=settle][data-v=courier]');
  await p.waitForFunction(i=>NS.G.colonies[i.a]&&NS.G.colonies[i.b],ids,{timeout:60000});
  ok(true,name+': оба мира заселены, год '+await p.evaluate(()=>NS.G.day));
  await tapBtn('[data-a=speed][data-v="0"]');
  // линия от дальнего к ближнему
  await tapAt(await at(ids.a)); await tapBtn('#panel [data-a=pick]');
  ok((await p.locator('#hint').innerText()).includes('Куда'),name+': подсказка выбора цели');
  await tapAt(await at(ids.b));
  ok(await p.locator('#panel [data-a=place][data-v=courier]').isEnabled(),name+': курьер доступен для линии к узлу');
  await tapBtn('#panel [data-a=place][data-v=courier]');
  if(!touch){ const qa=await at(ids.a), qe=await at('earth');   // та же линия перетаскиванием
    await p.mouse.move(qa.x,qa.y); await p.mouse.down(); await p.mouse.move(qe.x,qe.y,{steps:8}); await p.mouse.up(); await p.waitForTimeout(80);
    ok(await p.locator('#panel [data-a=place]').first().isVisible(),name+': перетаскивание открывает выбор судна'); await tapBtn('#panel [data-a=cancelPick]') }
  // линия от узла к Земле
  await tapAt(await at(ids.b)); await tapBtn('#panel [data-a=pick]');
  await tapAt(await at('earth'));
  await tapBtn('#panel [data-a=place][data-v=hauler]');
  const lines=await p.evaluate(i=>NS.G.ships.filter(s=>s.mode!=='dead').map(s=>{ const f=(s.pend?s.pend.from:s.from), t=(s.pend?s.pend.to:s.to); return f+'>'+t }),ids);
  ok(lines.includes(ids.a+'>'+ids.b)&&lines.includes(ids.b+'>earth'),name+': обе линии стоят');
  await tapBtn('[data-a=speed][data-v="15"]');
  await p.waitForFunction(i=>(NS.G.colonies[i.b].hubIn||0)>0,ids,{timeout:60000});
  ok(true,name+': узел получил груз, год '+await p.evaluate(()=>NS.G.day));
  await tapAt(await at(ids.b));
  const txt=await p.locator('#panel').innerText();
  ok(txt.includes('Перевалка'),name+': видно перевалку');
  await p.waitForTimeout(1500);
  await p.screenshot({path:path.join(SH,'nodes-'+name+'-world.png')});
  await tapBtn('[data-a=tab][data-v=fleet]'); await p.waitForTimeout(150);
  const fl=await p.locator('#panel').innerText(); ok(fl.includes('Узел')&&fl.includes(ids.bn),name+': флот показывает узел');
  await p.screenshot({path:path.join(SH,'nodes-'+name+'-fleet.png')});
  await tapBtn('[data-a=tab][data-v=rules]'); await tapBtn('[data-a=np][data-k=batchA][data-v="1"]');
  ok(await p.evaluate(()=>NS.C.NP.batchA===1),name+': правило переключается');
  await tapBtn('[data-a=speed][data-v="0"]');
  await p.screenshot({path:path.join(SH,'nodes-'+name+'-rules.png')});
  await p.locator('[data-a=restart][data-v=bot]').scrollIntoViewIfNeeded(); await tapBtn('[data-a=restart][data-v=bot]');
  ok(await p.evaluate(()=>Object.keys(NS.G.colonies).length>5&&NS.G.ships.length>5),name+': сеть бота загружена');
  await tapBtn('[data-a=speed][data-v="15"]'); await p.waitForTimeout(4000);
  ok(await p.evaluate(()=>NS.G.day>1510),name+': сеть бота идёт, год '+await p.evaluate(()=>NS.G.day));
  await p.screenshot({path:path.join(SH,'nodes-'+name+'-bot.png')});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+': нет горизонтальной прокрутки');
  ok(errs.length===0,name+': ошибок нет '+errs.slice(0,3).join(' | '));
  ok(net.length===0,name+': внешних запросов нет '+net.slice(0,2).join(' '));
  await ctx.close();
}
(async()=>{ const b=await chromium.launch(process.env.LB_CHROMIUM?{executablePath:process.env.LB_CHROMIUM}:{});
  await run(b,'desk',{viewport:{width:1280,height:800},locale:'en-US'});
  await run(b,'phone',{viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'en-US'});
  await b.close(); console.log(bad?('ПРОВАЛОВ: '+bad):'всё зелёное'); process.exit(bad?1:0) })();
