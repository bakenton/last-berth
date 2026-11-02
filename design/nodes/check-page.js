// Песочница в браузере: мышь 1280×800 и касание 390×844. Линии сразу, хаб, суда в обе стороны. node design/nodes/check-page.js [папка снимков]
const {chromium}=require('E:/ClaudeCowork/last-berth/node_modules/playwright');
const path=require('path');
const F='file:///'+path.resolve(__dirname,'nodes.html').replace(/\\/g,'/'), SH=process.argv[2]||require('os').tmpdir();
let bad=0; const ok=(c,m)=>{ console.log((c?'ok   ':'FAIL ')+m); if(!c) bad++ };

async function run(b,name,opt){
  const ctx=await b.newContext(opt), p=await ctx.newPage(), errs=[], net=[], touch=!!opt.hasTouch;
  p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()) });
  p.on('request',r=>{ if(!r.url().startsWith('file:')&&!r.url().startsWith('data:')) net.push(r.url()) });
  await p.goto(F); await p.waitForTimeout(300); await p.evaluate(()=>{ NS.G.safe=true });   // без случайных потерь посреди сценария
  const at=id=>p.evaluate(i=>{ const q=NS.pos()[i], r=document.getElementById('c').getBoundingClientRect(); return {x:q.x+r.left,y:q.y+r.top} },id);
  const tapAt=async q=>{ if(touch) await p.touchscreen.tap(q.x,q.y); else await p.mouse.click(q.x,q.y); await p.waitForTimeout(80) };
  const tapBtn=async sel=>{ const l=p.locator(sel).first(); await l.scrollIntoViewIfNeeded(); if(touch) await l.tap(); else await l.click(); await p.waitForTimeout(80) };
  const linkBy=async(a,c)=>{ if(touch){ await tapAt(await at(a)); await tapBtn('#panel [data-a=pick]'); await tapAt(await at(c)) } else { const q=await at(a), e=await at(c); await p.mouse.move(q.x,q.y); await p.mouse.down(); await p.mouse.move(e.x,e.y,{steps:8}); await p.mouse.up(); await p.waitForTimeout(80) } };
  const settle=async id=>{ await tapAt(await at(id)); await tapBtn('#panel [data-a=settle][data-v=courier]') };
  const place=async(id,cls)=>{ await tapAt(await at(id)); await tapBtn('#panel [data-a=place][data-v='+cls+']') };
  // кольцо II: два рудника/скважины в хаб на кольце I — близко, рейсы короткие
  const ids=await p.evaluate(()=>{ const P=NS.C.PLANETS, s=P.filter(x=>x.sec===1&&x.kind!=='works'), a=s[0], c=s[1], hb=P.filter(x=>x.sec===0&&x.kind!=='works').sort((u,v)=>Math.abs(u.ang-a.ang)-Math.abs(v.ang-a.ang))[0]; return {a:a.id,c:c.id,b:hb.id,an:a.name,cn:c.name,bn:hb.name} });
  ok(await p.getByText('Партия сейчас').isVisible(),name+': панель правил видна');

  // 1. линии сразу, на незаселённых мирах, без судов и на паузе
  await linkBy(ids.a,ids.b);
  ok(await p.evaluate(i=>NS.links[i.a]===i.b,ids),name+': линия '+ids.an+' → '+ids.bn+' появилась сразу');
  await linkBy(ids.c,ids.b); await linkBy(ids.b,'earth');
  ok(await p.evaluate(i=>NS.links[i.c]===i.b&&NS.links[i.b]==='earth',ids),name+': хаб и линия к Земле появились сразу');
  await tapAt(await at(ids.b));
  ok((await p.locator('#panel').innerText()).includes('Хаб'),name+': панель называет хаб');
  await p.screenshot({path:path.join(SH,'nodes-'+name+'-1-plan.png')});
  // наружу — разворот, а не отказ
  if(!touch){ const far=await p.evaluate(i=>NS.C.PLANETS.find(x=>x.sec===2&&x.kind!=='works').id,ids); await linkBy(ids.b,far); ok(await p.evaluate(f=>NS.links[f],far)===ids.b,name+': потянули наружу — линия развернулась к Земле'); await tapAt(await at(far)); await tapBtn('#panel [data-a=unlink]'); ok(await p.evaluate(f=>!NS.links[f],far),name+': линия убирается') }

  // 2. заселить и поставить суда
  await tapBtn('[data-a=speed][data-v="15"]');
  for(const w of [ids.a,ids.c,ids.b]) await settle(w);
  await p.waitForFunction(i=>NS.G.colonies[i.a]&&NS.G.colonies[i.b]&&NS.G.colonies[i.c],ids,{timeout:90000});
  ok(true,name+': миры заселены, год '+await p.evaluate(()=>NS.G.day));
  await tapBtn('[data-a=speed][data-v="0"]');
  await place(ids.a,'courier'); await place(ids.c,'courier'); await place(ids.b,'hauler');
  const lines=await p.evaluate(()=>NS.G.ships.filter(s=>s.mode!=='dead').map(s=>(s.pend?s.pend.from:s.from)+'>'+(s.pend?s.pend.to:s.to)));
  ok(lines.includes(ids.a+'>'+ids.b)&&lines.includes(ids.c+'>'+ids.b)&&lines.includes(ids.b+'>earth'),name+': суда встали на линии');

  // 3. суда ходят по своим линиям в обе стороны
  await tapBtn('[data-a=speed][data-v="5"]');
  const legs=await p.evaluate(async i=>{ const seen={f:{},t:{}}; for(let n=0;n<400;n++){ NS.G.ships.forEach(s=>{ if(s.mode!=='transit') return; if(s.from===i.a&&s.to===i.b) seen.f[s.dest]=1; if(s.from===i.b&&s.to==='earth') seen.t[s.dest]=1 }); if(Object.keys(seen.f).length===2&&Object.keys(seen.t).length===2) break; await new Promise(r=>setTimeout(r,100)) } return seen },ids);
  ok(Object.keys(legs.f).length===2,name+': курьер ходит в обе стороны');
  ok(Object.keys(legs.t).length===2,name+': тягач ходит в обе стороны');
  await p.waitForFunction(i=>(NS.G.colonies[i.b].hubIn||0)>0,ids,{timeout:60000});
  for(let i=2;i<=4;i++){ await p.waitForTimeout(1300); await p.screenshot({path:path.join(SH,'nodes-'+name+'-'+i+'-run.png')}) }
  await tapBtn('[data-a=tab][data-v=fleet]'); await p.waitForTimeout(150);
  const fl=await p.locator('#panel').innerText(); ok(fl.includes('Узел')&&fl.includes(ids.bn),name+': флот показывает узел');
  await tapBtn('[data-a=speed][data-v="0"]');
  // 4. снять судно и сеть бота
  await tapBtn('[data-a=tab][data-v=rules]'); await tapBtn('[data-a=np][data-k=batchA][data-v="0.5"]');
  ok(await p.evaluate(()=>NS.C.NP.batchA===0.5),name+': правило переключается');
  await tapBtn('[data-a=restart][data-v=bot]');
  ok(await p.evaluate(()=>Object.keys(NS.links).length>5),name+': сеть бота показана линиями');
  await tapBtn('[data-a=speed][data-v="15"]'); await p.waitForTimeout(3000);
  await p.screenshot({path:path.join(SH,'nodes-'+name+'-5-bot.png')});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+': нет горизонтальной прокрутки');
  ok(errs.length===0,name+': ошибок нет '+errs.slice(0,3).join(' | '));
  ok(net.length===0,name+': внешних запросов нет '+net.slice(0,2).join(' '));
  await ctx.close();
}
(async()=>{ const b=await chromium.launch(process.env.LB_CHROMIUM?{executablePath:process.env.LB_CHROMIUM}:{});
  await run(b,'desk',{viewport:{width:1280,height:800},locale:'en-US'});
  await run(b,'phone',{viewport:{width:390,height:844},hasTouch:true,isMobile:true,locale:'en-US'});
  await b.close(); console.log(bad?('ПРОВАЛОВ: '+bad):'всё зелёное'); process.exit(bad?1:0) })();
