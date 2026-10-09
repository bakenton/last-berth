// v4.29 — the ark is paid for in one go (no deposits), needs a convoy at the pier, hulls can be set aside for it.
// EN and RU, real clicks on the rail, yards must not break up or take a reserved hull, no convoy = no departure.
// node pw38.js [page.html]
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const page=process.argv[2]||'long-night.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const TMP=require('os').tmpdir();
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}}); p.setDefaultTimeout(8000);
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150)};
  const closePf=async()=>{ for(let i=0;i<12;i++){ const did=await p.evaluate(()=>{ var q=function(s){var e=document.querySelector(s); return e&&e.offsetParent!==null?e:null};
      var e=q('[data-act="pfok"]')||q('[data-act="shiftok"]')||q('[data-act="nightok"]')||q('[data-act="nofreeclose"]'); if(e){ e.click(); return true } if(LN.shiftOpen){ LNU.shiftStop=false; LN.shiftOpen=false; LNdraw(); return true } return false }); if(!did) break; await p.waitForTimeout(80) } };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.over) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await closePf() };
  const rail=async()=>await p.evaluate(()=>{ var e=document.getElementById('railbody'); return e?e.textContent.replace(/\s+/g,' '):'' });
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/'+page); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='11'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  await p.evaluate(()=>{ LNU.pro.on=false; LNU.pro.stage=99; LNU.paused=true; LNdraw() });

  // === the Night is dated; the Earth tab shows the ark block
  await run(300);
  await p.evaluate(()=>{ if(!LN.night) revealNight(LN); LN.nightSeen=true; LNU.tab='earth'; LNdraw() }); await closePf(); await p.waitForTimeout(200);
  const r1=await rail();
  ok('no deposit button any more', !(await p.$('[data-act="arkplan"]')));
  ok('buy button, no discount', /Buy level 1/.test(r1)&&!/% off/.test(r1), (r1.match(/Buy level[^%]{0,40}/)||[''])[0]);
  ok('convoy rows: generation and 0 / 3', /Convoy at the pier, Generation [IVX]+\+/.test(r1)&&/0 \/ 3/.test(r1)&&/0 \/ 2/.test(r1)&&/0 \/ 1/.test(r1), (r1.match(/Convoy at the pier.{0,120}/)||[''])[0]);
  ok('wake ladder hint with four steps', /30% of the sleepers wake on the minimum, 60% one mark above, 85% two above, 100% three/.test(r1), (r1.match(/30%.{0,120}/)||[''])[0]);
  ok('no raw placeholders in the ark block', !/\{[a-z]\}/.test(r1), (r1.match(/.{0,40}\{[a-z]\}.{0,40}/)||[''])[0]);
  const price=await p.evaluate(()=>({m:LN.earth.metal, p:arkPrice(1).metal, cg:convoyGen(LN), mark:LN.arkMark}));
  ok('level 1 price is ×1.5 (metal 2250)', price.p===2250, JSON.stringify(price));
  ok('convoy generation = ark mark − 1', price.cg===price.mark-1, JSON.stringify(price));

  // === buy level 1 by clicks, at full price
  await p.evaluate(()=>{ const E=LN.earth; E.metal=9e4;E.parts=9e4;E.fuel=9e4;E.food=9e4; LNdraw() }); await p.waitForTimeout(150);
  await tap('#railbody [data-act="arksel"][data-l="1"]'); await tap('#railbody [data-act="arkbuy"]');
  const bought=await p.evaluate(()=>({lv:arkLevel(LN), metal:LN.earth.metal, paid:LN.ark.paid.metal, log:LN.log.filter(e=>e.code==='ark_bought').length}));
  ok('level 1 bought: paid 2250 metal, log line', bought.lv===1&&bought.paid===2250&&bought.metal===9e4-2250&&bought.log===1, JSON.stringify(bought));
  const r2=await rail();
  ok('level 2 is the next tab; "Still to pay" row shows the difference', /Still to pay/.test(r2)&&/Buy level 2/.test(r2), (r2.match(/Still to pay.{0,80}/)||[''])[0]);
  const owed=await p.evaluate(()=>arkOwed(LN,2).metal);
  ok('owed to level 2 = 6000 − 2250', owed===3750, owed);

  // === hulls at the pier: set one aside for the ark with a real click
  const ids=await p.evaluate(()=>{ const G=LN, g=convoyGen(G), made=[]; G.driveLvl=Math.max(G.driveLvl||0,G.arkMark); G.gen=G.driveLvl; ensureGen(G.gen); G.earth.people=Math.max(G.earth.people,2000); ['courier','courier','courier','hauler','hauler','freighter'].forEach(function(c){ const hi=hullAt(c,g); if(hi===null) return; if(buildShip(G,hi)==='ok'){ const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.pend=null; made.push(s.id) } }); LNdraw(); return made });
  ok('six hulls of the convoy generation built and docked', ids.length===6, JSON.stringify(ids));
  await p.waitForTimeout(150);
  const cv1=await p.evaluate(()=>arkConvoy(LN));
  ok('convoy counts docked hulls (3/2/1) and is gathered', cv1.ok&&cv1.have.courier>=3&&cv1.have.hauler>=2&&cv1.have.freighter>=1, JSON.stringify(cv1));
  const r3=await rail();
  ok('ark block says the convoy is gathered', /gathered/.test(r3), (r3.match(/Convoy at the pier.{0,60}/)||[''])[0]);
  ok('reserve button on a waiting hull', !!(await p.$('#railbody [data-act="reserve"][data-on="1"]')));
  await tap('#railbody [data-act="reserve"][data-on="1"][data-s="'+ids[0]+'"]');
  const rs=await p.evaluate(id=>{ const s=shipById(LN,id); return {reserve:!!s.reserve, mode:s.mode} },ids[0]);
  ok('click sets the hull aside', rs.reserve, JSON.stringify(rs));
  const r4=await rail();
  ok('the pill reads "ark reserve" and the button flips to Release', /ark reserve/.test(r4)&&/Release from the reserve/.test(r4), (r4.match(/ark reserve.{0,80}/)||[''])[0]);
  await p.evaluate(()=>{ var e=document.querySelector('#railbody [data-act="arkbuy"]'); if(e) e.scrollIntoView({block:'end'}) }); await p.waitForTimeout(150);
  await p.screenshot({path:TMP+'/v429-ark-en.png',clip:{x:1150,y:70,width:450,height:930}});

  // === the yards leave a reserved hull alone: no idle scrap of an old hull, no yard take for a standing order
  await p.evaluate(id=>{ const G=LN; G.gen=Math.max(G.gen||0,convoyGen(G)+1); ensureGen(G.gen); G.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&s.id!==id) s.reserve=false }); },ids[0]);
  await run(15);
  const alive=await p.evaluate(id=>{ const s=shipById(LN,id); const others=LN.ships.filter(function(o){return o.mode==='dead'&&o.scrapped}).length; return {mode:s.mode, reserve:!!s.reserve, from:s.from, scrappedOthers:others} },ids[0]);
  ok('after 15 years the reserved hull is still at the pier', alive.mode==='idle'&&alive.reserve&&!alive.from, JSON.stringify(alive));
  const pid=await p.evaluate(()=>Object.keys(LN.colonies)[0]||null);
  if(pid){ await p.evaluate(pid=>{ setWant(LN,pid,'courier',(lineWant(LN,pid,'courier')||0)+1) },pid); await run(3);
    const took=await p.evaluate(id=>{ const s=shipById(LN,id); return {from:s.from, pend:!!s.pend, reserve:!!s.reserve, taken:LN.log.some(function(e){return e.code==='yard_take'&&e.d.n===id})} },ids[0]);
    ok('a standing order does not take the reserved hull', !took.from&&!took.pend&&!took.taken, JSON.stringify(took)); }
  // a hand-given line releases it
  if(pid){ const rel=await p.evaluate((a)=>{ const r=setLine(LN,a.id,a.pid,'earth'); const s=shipById(LN,a.id); return {r:r, reserve:!!s.reserve} },{id:ids[0],pid}); ok('a line ordered by hand releases the reserve', (rel.r==='ok'||rel.r==='queued')&&!rel.reserve, JSON.stringify(rel)); }

  // === RU strings
  await p.evaluate(()=>document.querySelector('[data-lang="ru"]').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>{ ['[data-act="oskip"]','[data-act="gskip"]'].forEach(function(q){ var e=document.querySelector(q); if(e&&e.offsetParent!==null) e.click() }); LNU.tab='earth'; LNdraw() }); await p.waitForTimeout(200);
  const r5=await rail();
  ok('RU: convoy row, buy button, reserve pill', /Конвой у причала, поколение [IVX]+\+/.test(r5)&&/Купить уровень 2/.test(r5)&&/резерв ковчега|В резерв ковчега/.test(r5), (r5.match(/Конвой у причала.{0,100}/)||[''])[0]);
  ok('RU: no raw placeholders', !/\{[a-z]\}/.test(r5), (r5.match(/.{0,40}\{[a-z]\}.{0,40}/)||[''])[0]);
  await p.evaluate(()=>{ var e=document.querySelector('#railbody [data-act="arkbuy"]'); if(e) e.scrollIntoView({block:'end'}) }); await p.waitForTimeout(150);
  await p.screenshot({path:TMP+'/v429-ark-ru.png',clip:{x:1150,y:70,width:450,height:930}});
  await p.evaluate(()=>document.querySelector('[data-lang="en"]').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>{ ['[data-act="oskip"]','[data-act="gskip"]'].forEach(function(q){ var e=document.querySelector(q); if(e&&e.offsetParent!==null) e.click() }) });

  // === the advisor names the shortfall once the convoy is broken up
  await p.evaluate(()=>{ LN.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&HULLS[s.hull].key==='freighter') scrap(LN,s.id) }); LN.driveLvl=LN.arkMark; LN.gen=Math.max(LN.gen||0,LN.driveLvl); ensureGen(LN.gen); LNU.advOpen=true; LNU.leftTab='advice'; LNdraw() }); await p.waitForTimeout(200);
  const adv=await p.evaluate(()=>{ var e=document.querySelector('.advbody'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('advisor: "The convoy is short: … 0/1 freighters of Generation …"', /The convoy is short: \d\/3 couriers, \d\/2 haulers, 0\/1 freighters of Generation [IVX]+ or newer/.test(adv), (adv.match(/The convoy is short.{0,120}/)||adv.slice(0,160))[0]);

  // === no convoy on the day: the ark stays, its own verdict and chronicle line
  await p.evaluate(()=>{ LN.night=LN.day+2; LN.nightSeen=true; LNU.paused=false; LNdraw() });
  for(let i=0;i<12&&!(await p.evaluate(()=>LN.over));i++){ await run(1); await p.waitForTimeout(120) }
  const end=await p.evaluate(()=>({over:LN.over, grounded:LN.grounded, why:LN.groundedWhy, souls:LN.souls, log:LN.log.filter(e=>e.code==='ark_noconvoy').length, lv:arkLevel(LN), ready:arkReady(LN)}));
  ok('drive ready, level paid, convoy short → grounded by convoy, 0 souls, chronicle line', end.over==='night'&&end.grounded&&end.why==='convoy'&&end.souls===0&&end.log===1&&end.ready, JSON.stringify(end));
  await p.waitForTimeout(300);
  const ov=await p.evaluate(()=>{ var e=document.getElementById('ovbox'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('verdict: the convoy never gathered, convoy generation named', /convoy of Generation III hulls that was to go with it never gathered/.test(ov)&&/no convoy/.test(ov), ov.slice(0,300));
  await p.screenshot({path:TMP+'/v429-noconvoy-en.png'});
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL exception — '+String(e&&e.stack||e).slice(0,400)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log(`pw38 ${out.length-f}/${out.length}`); process.exit(f?1:0);
})();
