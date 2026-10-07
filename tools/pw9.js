const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html');
  await p.waitForTimeout(400);
  await p.screenshot({path:'v1-lang.png'});
  await tap('[data-lang="ru"]'); await tap('[data-act="oskip"]'); await p.waitForTimeout(200);
  await p.screenshot({path:'v2-guide.png'});
  await tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false}); await p.waitForTimeout(200);
  console.log('year label:', await p.textContent('[data-t="day"]'), '| night cell:', await p.textContent('#h-night'));
  // real click still works under the new style
  const id=await p.evaluate(()=>PLANETS[3].id);
  let box=await p.locator('[data-p="'+id+'"] circle.hit').boundingBox();
  await p.mouse.click(box.x+box.width/2, box.y+box.height/2); await p.waitForTimeout(200);
  console.log('click -> tab:', await p.evaluate(()=>document.querySelector('.tab.on').dataset.tab));
  console.log('intro state:', await p.evaluate(()=>{const e=document.getElementById('intro');return {hidden:e.hidden,display:getComputedStyle(e).display,h2:(e.querySelector('h2')||{}).textContent}}));
  {const tb=await p.locator('.tab[data-tab="earth"]').boundingBox();
   console.log('at tab centre:', await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e?(e.id||e.className||e.tagName):null},[tb.x+tb.width/2,tb.y+tb.height/2]), 'box', JSON.stringify(tb));}
  // play a bit
  await tap('#b-auto'); await tap('[data-spd="10"]'); await p.waitForTimeout(3000); await tap('#b-pause');
  await p.screenshot({path:'v3-desk.png'});
  // force the Night
  await p.evaluate(()=>{ const G=window.LN; G.earth.metal=9000;G.earth.parts=3000;G.earth.fuel=9000;G.earth.food=9000; revealNight(G); });
  await tap('.tab[data-tab="worlds"]'); await tap('.tab[data-tab="earth"]'); await p.waitForTimeout(200);
  console.log('night modal shown:', await p.isVisible('#intro'), '| title:', await p.textContent('#introbox h2'));
  await p.screenshot({path:'v4-night.png'});
  await tap('[data-act="nightok"]'); await p.waitForTimeout(200);
  if(await p.isVisible('#pf')) await tap('[data-act="pfok"]');   // v3.9: the shift chief has a word first
  await tap('.tab[data-tab="worlds"]'); await tap('.tab[data-tab="earth"]');
  console.log('night cell:', await p.textContent('#h-night'));
  const rail=await p.textContent('#railbody');
  console.log('ark block:', /Ковчег|Ark/.test(rail), '| buy available:', await p.evaluate(()=>!!document.querySelector('[data-act="arkbuy"]:not([aria-disabled])')));
  // v4.24: the ark has levels now, not berths; select level and buy it
  await tap('[data-act="arksel"][data-l="1"]'); await p.waitForTimeout(80);
  await tap('[data-act="arkbuy"]'); await p.waitForTimeout(80);
  console.log('ark level:', await p.evaluate(()=>window.LN.ark.lv), '| level paid:', await p.evaluate(()=>arkLevel(window.LN)));
  await p.screenshot({path:'v5-ark.png'});
  // jump to the end
  await p.evaluate(()=>{ const G=window.LN; G.driveLvl=G.arkMark; G.gen=G.driveLvl; ensureGen(G.gen); G.night=G.day+2; });   // v4.0: the ark needs its drive
  // play fast until night arrives and finishes
  await tap('[data-spd="10"]');
  for(let i=0;i<20&&!(await p.evaluate(()=>window.LN.over));i++){ await p.waitForTimeout(400) }
  await tap('#b-pause'); await p.waitForTimeout(200);
  console.log('over:', await p.evaluate(()=>window.LN.over), '| souls:', await p.evaluate(()=>window.LN.souls));
  console.log('end title:', await p.textContent('#ovbox h2'));
  await p.screenshot({path:'v6-end.png'});
  console.log('errors:', errs.length?errs:'none');
  await b.close();
})();
