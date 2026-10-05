// v4.4 — extraction kits, demand-driven feeding, no settler fields, JSON run log, ark two marks above
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const closePf=async()=>{ for(let i=0;i<6&&await p.isVisible('#pf');i++) await tap('[data-act="pfok"]') };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false } LNdraw() },n); await closePf() };
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{ LNU.shiftStop=false });
  // 1. the Found block: no settler / ration inputs, preview names the party
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  ok('no settler input', !(await p.isVisible('#inP')));
  ok('no ration input', !(await p.isVisible('#inF')));
  const prev=await p.textContent('#prev'); ok('preview says the party', /^\d+ settlers/.test(prev.trim()), prev);
  await tap('[data-act="colonize"]');
  const party=await p.evaluate(()=>LN.ships.find(s=>s.job==='colonize').cargo.people);
  const cap=await p.evaluate(a=>Math.min(popCap(planet(a.id)),70,Math.floor(LN.earth.people+a.party-K.EARTH_KEEP-K.FOUND_KEEP)),{id:mine,party});   // v4.7: the party leaves 50 hands at home
  ok('founding party = min(world, hold, people−50)', party===cap, party+' vs '+cap);
  ok('action logged people', await p.evaluate(()=>LN.actions.some(a=>a.k==='colonize'&&a.d.people>0)));
  // 2. gate closed before Generation III
  await run(40); await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('colony founded', await p.evaluate(id=>!!LN.colonies[id],mine));
  ok('kit block visible', await p.evaluate(()=>/Mine works/.test(document.querySelector('#rail').textContent)));
  ok('gate text before Gen III', await p.evaluate(()=>/engineering programme opens with Generation III/.test(document.querySelector('#rail').textContent)));
  ok('canKit = kitgate', await p.evaluate(id=>canKit(LN,id)==='kitgate',mine));
  // 3. open the gate, give resources, put a courier on the line, order a kit: it does not fit a courier
  await p.evaluate(id=>{ LN.driveLvl=2; LN.gen=2; ensureGen(2); LN.earth.metal=5000; LN.earth.parts=2000; LN.earth.fuel=3000; LN.earth.people=300;
    const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)); setLine(LN,s.id,id,'earth'); setRenew(LN,id,false); LNdraw() },mine);   // v4.6: renewal off, or the yards would lay down a Gen II courier that carries the kit
  await run(3); await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('order button enabled', await p.evaluate(()=>{ const bt=document.querySelector('[data-act="kit"]'); return bt&&!bt.disabled }));
  const wtxt=await p.evaluate(()=>document.querySelector('#rail').textContent);
  ok('weight line names 190 and hold 70', /Needs a hold of 190 · biggest hull on this line holds 70/.test(wtxt), wtxt.match(/Kit weighs[^·]*·[^\n]{0,40}/)?.[0]);
  const m0=await p.evaluate(()=>LN.earth.metal);
  await tap('[data-act="kit"]');
  ok('kit ordered: metal charged 100', await p.evaluate(m0=>Math.round(m0-LN.earth.metal)===100,m0), await p.evaluate(()=>LN.earth.metal));
  ok('kit on the pier', await p.evaluate(id=>LN.colonies[id].kit&&LN.colonies[id].kit.tier===1,mine));
  ok('log kit_ordered with roman tier', await p.evaluate(()=>{ LNU.logMode='all'; LNdraw(); return /Tier I kit for .* laid out on the pier/.test(document.getElementById('log').textContent) }));
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('panel: kit will never fit a courier', await p.evaluate(()=>/will never fit/.test(document.querySelector('#rail').textContent)));
  await run(60);
  ok('advisor a_kithold', await p.evaluate(()=>advice(LN).some(a=>a.code==='a_kithold')));
  ok('kit still on the pier after 60 years (courier too small)', await p.evaluate(id=>!!LN.colonies[id].kit,mine));
  // 4. a hauler joins the line: the kit rides out, the world gets tier I, fuel comes on the line
  await p.evaluate(id=>{ const h=HULLS.findIndex(h=>h.key==='hauler'&&h.gen===2); LN.earth.metal=9000; buildShip(LN,h); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.t=0; s.at='earth'; setLine(LN,s.id,id,'earth'); LNdraw() },mine);
  await run(2);
  ok('kit loaded on the hauler', await p.evaluate(id=>{ const c=LN.colonies[id]; return !c.kit&&!!c.kitShip },mine));
  ok('log kit_loaded', await p.evaluate(()=>LN.log.some(l=>l.code==='kit_loaded')));
  await run(40);
  ok('tier I built', await p.evaluate(id=>LN.colonies[id].tier===1,mine));
  ok('log kit_built ×1.6', await p.evaluate(()=>{ LNU.logMode='all'; LNdraw(); return /TIER I MACHINES RUNNING\. Output ×1\.6/.test(document.getElementById('log').textContent) }));
  ok('voice from the settlement head in the journal', await p.evaluate(()=>/(The rig is up|children came out)/.test(document.getElementById('log').textContent)));
  ok('output multiplied ×1.6', await p.evaluate(id=>{ const c=LN.colonies[id], q=planet(id); return Math.abs(lineRate(LN,id).makes-c.pop*q.rich*K.PROD*1.6)<1e-6 },mine));
  ok('stockyard bottomless', await p.evaluate(id=>storeCap(LN.colonies[id])===Infinity,mine));
  await run(60);
  ok('fuel delivered by the line', await p.evaluate(id=>LN.log.some(l=>l.code==='dropped'&&l.d.p===id&&l.d.u>0),mine), await p.evaluate(id=>LN.log.filter(l=>l.code==='dropped'&&l.d.p===id).map(l=>l.d.u).join(','),mine));
  ok('map label carries the people icon (tier marker retired in v4.10)', await p.evaluate(id=>!!document.querySelector('.pnode[data-p="'+id+'"] use[href="#i-people"]'),mine));
  await p.evaluate(()=>{ LNU.tab='worlds'; LNdraw() });
  ok('worlds tab shows ⚙I', await p.evaluate(()=>/⚙I/.test(document.querySelector('#rail').textContent)));
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('panel tier row ×1.6', await p.evaluate(()=>/I · ×1\.6/.test(document.querySelector('#rail').textContent)));
  // 5. no fuel: after 15 years the machines stand; advisor speaks; fuel returns → running again
  await p.evaluate(id=>{ LN.colonies[id].store.fuel=0; LN.earth.fuel=0; LN.ships.forEach(s=>{ if(s.mode==='transit') s.cargo.fuel=0 }) },mine);
  await run(20);
  ok('kit_starved logged', await p.evaluate(()=>LN.log.some(l=>l.code==='kit_starved')));
  ok('multiplier off while starved', await p.evaluate(id=>rateMult(LN.colonies[id])===1,mine));
  ok('advisor a_kitfuel', await p.evaluate(()=>advice(LN).some(a=>a.code==='a_kitfuel')));
  await p.evaluate(id=>{ LN.reserves[id]=1e6; LNU.tab='target'; LNdraw() },mine);   // v4.17: a spent seam shows only the evacuation button, so give the world a seam to read the kit panel
  ok('panel says the machines stand', await p.evaluate(()=>/The machines stand/.test(document.querySelector('#rail').textContent)));
  await p.evaluate(id=>{ LN.colonies[id].store.fuel=500 },mine); await run(2);
  ok('kit_running after fuel', await p.evaluate(()=>LN.log.some(l=>l.code==='kit_running')));
  // 6. tiermax + pending guards
  ok('canKit pending while another kit is ordered', await p.evaluate(id=>{ LN.earth.metal=9000; LN.earth.parts=5000; orderKit(LN,id); return canKit(LN,id)==='kitpending' },mine));
  ok('canKit tiermax at 4', await p.evaluate(id=>{ const c=LN.colonies[id]; c.kit=null; c.tier=4; return canKit(LN,id)==='tiermax' },mine));
  await p.evaluate(id=>{ LN.colonies[id].tier=1 },mine);
  // 7. the ark drive: two marks above the one held on the day of the date; 3300 years
  await p.evaluate(()=>{ LN.driveLvl=4; LN.gen=4; ensureGen(4); revealNight(LN); LN.nightSeen=true; LNdraw() });
  ok('arkMark = driveLvl+2', await p.evaluate(()=>LN.arkMark===6));
  ok('Night in 3300 years', await p.evaluate(()=>LN.night-LN.day===3300));
  await tap('[data-act="nightok"]').catch(()=>{});
  // 8. JSON run log
  const j=await p.evaluate(()=>exportLog(LN));
  let J=null; try{ J=JSON.parse(j) }catch(e){}
  ok('run log is JSON', !!J);
  ok('JSON has chart with tiers, actions, snaps, fleet, night', !!(J&&J.chart&&J.chart.some(c=>c.colony&&c.colony.tier>0)&&J.actions.length&&J.fleet.length&&J.night&&J.night.year));
  ok('JSON action kit recorded', !!(J&&J.actions.some(a=>a.k==='kit')));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close();
  // 9. RU
  const q=await b.newPage({viewport:{width:1600,height:1000}}); q.errs=[]; q.on('pageerror',e=>q.errs.push(String(e)));
  await q.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  await q.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await q.waitForTimeout(300);
  await q.click('[data-lang="ru"]'); await q.click('[data-act="oskip"]'); await q.click('[data-act="gskip"]'); await q.waitForTimeout(150);
  const mineRu=await q.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await q.evaluate(id=>{ LN.driveLvl=2; LN.gen=2; ensureGen(2); LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:2,fuelOut:0}; LNU.sel=id; LNU.tab='target'; LNdraw() },mineRu);
  const ru=await q.evaluate(()=>document.querySelector('#rail').textContent);
  ok('RU kit block', /Карьерная техника/.test(ru)&&/Ярус/.test(ru)&&/Заказать комплект яруса III/.test(ru), ru.match(/Карьерная[^\n]{0,80}/)?.[0]);
  ok('no page errors (RU)', q.errs.length===0, q.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
