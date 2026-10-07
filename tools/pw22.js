// v4.2 — the clock, the desk journal, hull prices, mutiny
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,260):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const closePf=async()=>{ for(let i=0;i<6&&await p.isVisible('#pf');i++) await tap('[data-act="pfok"]') };
  const redraw=async()=>{ await closePf(); await tap('.tab[data-tab="worlds"]'); await closePf(); await tap('.tab[data-tab="earth"]'); await p.waitForTimeout(120) };
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{LNU.shiftStop=false}); await p.addScriptTag({content:BOT});
  // 1. speed buttons and the clock
  const spd=await p.evaluate(()=>[...document.querySelectorAll('[data-spd]')].map(e=>e.dataset.spd+':'+e.textContent).join(' '));
  ok('speed buttons 1/2/4/10', spd==='1:1× 2:2× 4:4× 10:10×', spd);
  ok('default speed 2×', await p.evaluate(()=>LNU.speed===2));
  await tap('[data-spd="1"]'); const y0=await p.evaluate(()=>LN.day); await p.waitForTimeout(3100); await tap('#b-pause');
  const y1=await p.evaluate(()=>LN.day);
  ok('1× is about a year per 1.5 s', y1-y0>=1&&y1-y0<=3, (y1-y0)+' years in 3.1 s');
  // 2. journal: desk by default, receipts hidden, cycle desk -> all -> chronicle
  await p.evaluate(()=>botRun(300)); await redraw();
  const cnt=async()=>p.evaluate(()=>({mode:LNU.logMode, btn:document.getElementById('b-logf').textContent, lines:document.querySelectorAll('#log .le').length, receipts:[...document.querySelectorAll('#log .le')].filter(e=>/hauled|Delivered|took on|Picked up|leaves Earth|sets out/i.test(e.textContent)).length, voices:document.querySelectorAll('#log .le.vo').length}));
  let c1=await cnt();
  ok('journal opens on Desk with no receipts', c1.mode==='desk'&&c1.btn==='Desk'&&c1.receipts===0&&c1.lines>0, JSON.stringify(c1));
  await tap('#b-logf'); let c2=await cnt();
  ok('second view is All, with receipts', c2.mode==='all'&&c2.btn==='All entries'&&c2.lines>c1.lines, JSON.stringify(c2));
  await tap('#b-logf'); let c3=await cnt();
  ok('third view is Chronicle only', c3.mode==='chron'&&c3.btn==='Chronicle'&&c3.voices===0, JSON.stringify(c3));
  await tap('#b-logf'); ok('cycles back to Desk', (await cnt()).mode==='desk');
  await p.screenshot({path:'y1-desk.png',clip:{x:0,y:830,width:1600,height:170}});
  // 3. hull prices in the dock (gen IV freighter must be under 5k metal)
  const price=await p.evaluate(()=>{ ensureGen(3); const h=HULLS.find(h=>h.key==='freighter'&&h.gen===3); return {metal:h.metal,parts:h.parts,cap:h.cap} });
  ok('gen IV freighter costs about 4.4k metal / 3.3k parts', price.metal<5000&&price.parts>3000, JSON.stringify(price));
  // 4. mutiny: date the Night close, keep lines running, watch crews come home
  await p.evaluate(()=>{ const G=LN; if(!G.night) revealNight(G); G.night=G.day+220; G.nightSeen=true; G.earth.food=1e5; G.earth.metal=1e5; G.earth.fuel=1e5; });
  await redraw();
  const before=await p.evaluate(()=>LN.ships.filter(s=>s.from&&s.to&&s.mode!=='dead').length);
  const mut=await p.evaluate(()=>{ const G=LN; let first=null; for(let i=0;i<200&&!G.over;i++){ tick(G); G.pauseNow=false; const m=G.log.find(e=>e.code==='mutiny'); if(m&&first===null) first=G.night-m.day; }
    return {first, n:G.stats.mutinies, home:G.ships.filter(s=>s.mutiny&&s.mode==='idle'&&s.at==='earth').length, lined:G.ships.filter(s=>s.from&&s.to&&s.mode!=='dead').length, far:G.log.filter(e=>e.code==='mutiny'&&e.d.at==='far').length, earth:G.log.filter(e=>e.code==='mutiny'&&e.d.at==='earth').length} });
  ok('crews mutiny inside the last ~200 years and come home', mut.n>0&&mut.home>0&&mut.lined<before&&mut.first<=220, JSON.stringify(mut)+' lined before '+before);
  await redraw();
  const rail=(await p.textContent('#railbody')).replace(/\s+/g,' ');
  ok('Earth tab lists refusing hulls with MUTINIED pill and scrap', /Refusing orders/.test(rail)&&/MUTINIED/.test(rail)&&/breakers will have them/.test(rail), rail.match(/Refusing orders.{0,200}/)?.[0]);
  await p.locator('#railbody .blk:has-text("Refusing orders")').first().screenshot({path:'y2-mutiny.png'});
  const adv=await p.evaluate(()=>{ const a=advice(LN).find(x=>x.code==='a_mutiny'); return a?a.n:null });
  ok('advisor carries a_mutiny with the count', adv>0, adv);
  // a mutinied hull refuses a line order with the right message
  const ref=await p.evaluate(()=>{ const G=LN; const s=G.ships.find(s=>s.mutiny&&s.mode==='idle'); const k=Object.keys(G.colonies).find(k=>!G.colonies[k].dark); return {r:setLine(G,s.id,k,'earth'), msg:null} });
  ok('a mutinied hull refuses orders', ref.r==='mutiny', JSON.stringify(ref));
  const logTxt=await p.textContent('#log');
  ok('journal: mutiny line + captain voice', /REFUSES ORDERS/.test(logTxt)&&/(arithmetic on the bridge|The crew voted)/.test(logTxt));
  const vo=await p.evaluate(()=>LN.log.filter(e=>e.code==='voice'&&/^mutiny/.test(e.d.k)).length);
  ok('captain voices logged for mutinies', vo>0, vo);
  // crews at home count for the ark
  const souls=await p.evaluate(()=>{ const G=LN; G.driveLvl=G.arkMark; G.gen=G.driveLvl; ensureGen(G.gen); G.earth.parts=1e5; G.earth.metal=1e5; G.earth.fuel=1e5; G.earth.food=1e5;
    // v4.24: buy level 1 to enable ark boarding
    arkBuy(G,1);
    return {souls:arkSouls(G), docked:crewDocked(G), people:Math.round(G.earth.people), arkLevel:arkLevel(G)} });
  ok('mutinied crews stand on the pier (crewDocked > 0, they board)', souls.docked>0&&souls.souls>0, JSON.stringify(souls));
  // scrap a mutinied hull by click
  const idm=await p.evaluate(()=>LN.ships.find(s=>s.mutiny&&s.mode==='idle').id);
  await tap('#railbody .blk:has-text("Refusing orders") [data-act="scrap"]');
  ok('scrap works on a mutinied hull', await p.evaluate(id=>LN.ships.find(s=>s.id===id).mode==='dead', idm));
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
  } catch(e){ out.push('ERROR '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); process.exit(0);
})();
