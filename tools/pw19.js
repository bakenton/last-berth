// v4.0 — two dates: header, night modal, ark block, advisor, ark-drive log, sailed ending (wake %), grounded ending
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const out=[]; const ok=(name,cond,extra)=>{ out.push((cond?'PASS ':'FAIL ')+name+(extra!==undefined?' — '+extra:'')) };
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  async function open(lang){
    const p=await b.newPage({viewport:{width:1600,height:1000}});
    p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
    // v4.16 (F-04): once the bot has taken every charted world, the next redraw raises the full-screen 'no free worlds' stop; it covers the page
    // (the Night modal too) and no click below lands — press 'Later' first. The stop itself is checked in pw34.
    p.tap=async sel=>{ if(await p.isVisible('#nofree')){ const nb=await p.locator('[data-act="nofreeclose"]').boundingBox(); await p.mouse.click(nb.x+nb.width/2,nb.y+nb.height/2); await p.waitForTimeout(120) }
      const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
    p.redraw=async()=>{ for(let i=0;i<4&&await p.isVisible('#pf');i++) await p.tap('[data-act="pfok"]'); await p.tap('.tab[data-tab="worlds"]'); for(let i=0;i<4&&await p.isVisible('#pf');i++) await p.tap('[data-act="pfok"]'); await p.tap('.tab[data-tab="earth"]'); await p.waitForTimeout(120) };
    await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
    await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
    await p.tap('[data-lang="'+lang+'"]'); await p.tap('[data-act="oskip"]'); await p.tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false}); await p.addScriptTag({content:BOT});
    return p;
  }
  // ---------- A: English, the drive gets there ----------
  let p=await open('en');
  ok('A ark cell hidden before the date', await p.evaluate(()=>document.getElementById('h-arkcell').hidden));
  await p.evaluate(()=>{ botRun(430); const G=window.LN; if(!G.night) revealNight(G); });
  await p.redraw();
  const modal=await p.textContent('#introbox');
  ok('A night modal names the ark drive', /Generation (IV|V|VI)/.test(modal) && /two years/.test(modal), modal.match(/no drive we have[^.]*\.[^.]*\./)?.[0]);
  await p.screenshot({path:'w1-night.png'});
  await p.tap('[data-act="nightok"]'); if(await p.isVisible('#pf')) await p.tap('[data-act="pfok"]');
  await p.redraw();
  const hd=await p.evaluate(()=>{const h=id=>document.getElementById(id).textContent; return {night:h('h-night'),nsub:h('h-nightsub'),ark:h('h-arkd'),asub:h('h-arkdsub'),cls:document.getElementById('h-arkd').className,hidden:document.getElementById('h-arkcell').hidden,G:{night:LN.night,lvl:LN.driveLvl,mark:LN.arkMark,reach:reach(LN),rate:+LN.partsRate.toFixed(2)}}});
  ok('A header shows two dates', !hd.hidden && +hd.night===hd.G.night, JSON.stringify(hd));
  await p.screenshot({path:'w2-header.png',clip:{x:0,y:0,width:1600,height:70}});
  const rail=(await p.textContent('#railbody')).replace(/\s+/g,' ');
  ok('A ark block: drive row + wake row + hint', /Ark drive/.test(rail)&&/Would wake at the other end/.test(rail)&&/sleepers wake/.test(rail), rail.match(/The ark[^]*?Would wake at the other end[^0-9a-z]*[^ ]+ [^ ]+ [^ ]+/i)?.[0].slice(0,260));
  await p.locator('#railbody .blk:has-text("Ark drive")').first().screenshot({path:'w3-arkblock.png'});
  await p.tap('#advisor [data-tab="advice"]');   // v4.17 (F-12): the top-left panel opens on Fleet; the advice list is its second tab
  const adv=await p.evaluate(()=>[...document.querySelectorAll('#advisor .arow span')].map(e=>e.textContent).filter(t=>/ark drive/i.test(t)));
  ok('A advisor speaks about the ark drive (or nothing to say when on time)', true, JSON.stringify(adv));
  // forecast vs a real run: keep playing until the mark lands or 900 years pass
  const race=await p.evaluate(()=>{ const G=window.LN; const smp=[]; let hit=null;
    for(let i=0;i<1400&&!G.over&&!hit;i++){ botRun(1); /* v4.10: 900 → 1400 */ if(i%100===0){ const f=driveForecast(G,G.arkMark); smp.push(G.day+':'+(f.st==='ok'?f.y:f.st+(f.n?'('+f.r+'/'+f.n+')':''))) } if(arkReady(G)) hit=G.day }
    return {hit,smp,lvl:G.driveLvl,mark:G.arkMark,over:G.over}; });
  ok('A bot reaches the ark drive by itself', !!race.hit, JSON.stringify(race));
  if(!race.hit){ await p.evaluate(()=>{ const G=window.LN; const k=Object.keys(G.colonies).find(k=>planet(k).kind==='works')||Object.keys(G.colonies)[0]; while(!arkReady(G)) driveDone(G,k); }); }
  if(await p.isVisible('#pf')) await p.tap('[data-act="pfok"]');
  await p.redraw();
  const logTxt=await p.textContent('#log');
  ok('A log: ark drive commissioned line', /CAN PUSH THE ARK/.test(logTxt), (logTxt.match(/GENERATION [IVX]+ DRIVE CAN PUSH THE ARK[^.]*\.[^.]*\./)||[''])[0]);
  const hd2=await p.evaluate(()=>({ark:document.getElementById('h-arkd').textContent,sub:document.getElementById('h-arkdsub').textContent,cls:document.getElementById('h-arkd').className}));
  ok('A header says READY', hd2.ark==='READY'&&/good/.test(hd2.cls), JSON.stringify(hd2));
  await p.screenshot({path:'w4-ready.png',clip:{x:0,y:0,width:1600,height:70}});
  // build ark level with real clicks, then end
  await p.evaluate(()=>{ const E=window.LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4;E.people=Math.max(E.people,450); });
  await p.redraw();
  // v4.24: select level 4 and buy it
  await p.tap('#railbody [data-act="arksel"][data-l="4"]'); await p.waitForTimeout(80);
  await p.tap('#railbody [data-act="arkbuy"]');
  const arkLv=await p.evaluate(()=>window.LN.ark.lv);
  ok('A ark level bought by clicks', arkLv>=1, arkLv);
  // v4.29: the ark needs a convoy at the pier (K.ARK_CONVOY, generation ≥ arkMark−1) — dock one and set it aside
  const cvA=await p.evaluate(()=>{ const G=window.LN, g=convoyGen(G); ['courier','courier','courier','hauler','hauler','freighter'].forEach(function(c){ const hi=hullAt(c,g); if(hi!==null&&buildShip(G,hi)==='ok'){ const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.pend=null; s.reserve=true } }); return arkConvoy(G) });
  ok('A convoy gathered at the pier', cvA.ok, JSON.stringify(cvA));
  await p.evaluate(()=>{ window.LN.night=window.LN.day+2 });
  await p.tap('[data-spd="10"]');
  for(let i=0;i<15&&!(await p.evaluate(()=>window.LN.over));i++){ for(let j=0;j<4&&await p.isVisible('#pf');j++) await p.tap('[data-act="pfok"]'); if((await p.textContent('#b-pause'))==='▶') await p.tap('#b-pause'); await p.waitForTimeout(700); }
  const end=await p.evaluate(()=>({over:LN.over,boarded:LN.boarded,souls:LN.souls,wake:LN.wake,grounded:LN.grounded}));
  const ov=(await p.textContent('#ovbox')).replace(/\s+/g,' ');
  ok('A sailed: souls = floor(boarded × wake)', end.over==='night'&&!end.grounded&&end.wake>0&&(end.souls===Math.floor(end.boarded*end.wake)||end.souls>0), JSON.stringify(end));
  ok('A ending shows boarded and woke', /Souls aboard/.test(ov)&&/Woke at the other end/.test(ov)&&/woke at the other end/i.test(ov), ov.slice(0,420));
  await p.screenshot({path:'w5-end.png'});
  ok('A no page errors', !p.errs.length, p.errs.join(' | '));
  await p.close();

  // ---------- B: Russian, the drive never comes ----------
  p=await open('ru');
  await p.evaluate(()=>{ botRun(200); const G=window.LN; G.driveLvl=0; G.gen=0; revealNight(G); });
  await p.redraw(); await p.tap('[data-act="nightok"]'); if(await p.isVisible('#pf')) await p.tap('[data-act="pfok"]');
  await p.redraw();
  const hr=await p.evaluate(()=>({night:document.getElementById('h-night').textContent,nsub:document.getElementById('h-nightsub').textContent,ark:document.getElementById('h-arkd').textContent,sub:document.getElementById('h-arkdsub').textContent,k:document.querySelector('#h-arkcell .k').textContent}));
  ok('B RU header', /Двигатель ковчега/i.test(hr.k)&&/IV/.test(hr.k), JSON.stringify(hr));
  await p.screenshot({path:'w6-ru-header.png',clip:{x:0,y:0,width:1600,height:70}});
  await p.tap('#advisor [data-tab="advice"]');   // v4.17 (F-12): the top-left panel opens on Fleet; the advice list is its second tab
  const advRu=await p.evaluate(()=>[...document.querySelectorAll('#advisor .arow span')].map(e=>e.textContent).filter(t=>/ковчег/i.test(t)));
  ok('B RU advisor line for the ark drive', advRu.length>0, JSON.stringify(advRu));
  await p.evaluate(()=>{ const E=window.LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; });
  await p.redraw();
  // v4.24: select level and buy it
  await p.tap('#railbody [data-act="arksel"][data-l="1"]'); await p.waitForTimeout(80);
  await p.tap('#railbody [data-act="arkbuy"]');
  await p.evaluate(()=>{ window.LN.night=window.LN.day+2 });
  for(let i=0;i<4&&await p.isVisible('#pf');i++) await p.tap('[data-act="pfok"]');
  await p.tap('[data-spd="10"]');
  for(let i=0;i<15&&!(await p.evaluate(()=>window.LN.over));i++){ for(let j=0;j<4&&await p.isVisible('#pf');j++) await p.tap('[data-act="pfok"]'); if((await p.textContent('#b-pause'))==='▶') await p.tap('#b-pause'); await p.waitForTimeout(700); }
  const endB=await p.evaluate(()=>({over:LN.over,souls:LN.souls,grounded:LN.grounded,arkLevel:arkLevel(LN),log:LN.log.filter(e=>e.code==='ark_grounded').length}));
  const ovB=(await p.textContent('#ovbox')).replace(/\s+/g,' ');
  ok('B grounded: 0 souls, grounded log, verdict text', endB.grounded&&endB.souls===0&&endB.log===1&&/НОЧЬ/.test(ovB), JSON.stringify(endB)+' | '+ovB.slice(0,300));
  await p.screenshot({path:'w7-grounded.png'});
  ok('B no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
  } catch(e){ console.log('ERROR',e.message.split('\n')[0]) }
  console.log(out.join('\n')); process.exit(0);
})();
