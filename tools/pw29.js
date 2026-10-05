// v4.9 — clock stops only for shift and Night; toasts; FF skips shifts; dead seam: big alert, red ring, hulls stand down, + disabled; evac button greys; big buttons; yard queue
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
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  // 1. a pauseNow event does not stop the real clock; a toast appears
  await p.evaluate(()=>{ LNU.shiftStop=false; LNU.paused=false; LNU.speed=10; LN.pauseNow=true; log(LN,'ship_ready',{n:1}) });
  await p.waitForTimeout(500);
  ok('clock kept running through pauseNow', await p.evaluate(()=>LNU.paused===false&&LN.day>=2), await p.evaluate(()=>LN.day));
  ok('toast shown bottom-right', await p.evaluate(()=>!!document.querySelector('#toasts .tst')));
  // 2. shift stops the clock; FF skips it
  await p.evaluate(()=>{ LNU.paused=true; LNU.shiftStop=true; LN.day=79; LNU.paused=false }); await p.waitForTimeout(400);
  ok('shift stops the clock', await p.evaluate(()=>LNU.paused===true&&LN.shiftOpen===true));
  await tap('[data-act="shiftok"]');
  await p.evaluate(()=>{ LNU.paused=true; LNU.ff=true; LN.day=159; LNU.paused=false }); await p.waitForTimeout(400);
  ok('FF: shift does not stop the clock', await p.evaluate(()=>LNU.paused===false&&LN.day>160), await p.evaluate(()=>LN.day+' '+LN.shiftOpen));
  ok('FF button lit', await p.evaluate(()=>document.getElementById('b-auto').classList.contains('on')&&document.getElementById('b-auto').textContent==='SKIP'));
  await p.evaluate(()=>{ LNU.paused=true; LNU.ff=false });
  // 3. the Night still stops the clock
  await p.evaluate(()=>{ LN.driveLvl=2; LN.gen=2; ensureGen(2); revealNight(LN); LNU.paused=false }); await p.waitForTimeout(400);
  ok('Night stops the clock', await p.evaluate(()=>LNU.paused===true&&!LN.nightSeen));
  await tap('[data-act="nightok"]'); await p.evaluate(()=>{ LNU.paused=true });
  // 4. dead seam: alert, red ring, hulls come home and stand down, + disabled, setWant refused
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  await p.evaluate(id=>{ LN.earth.people=300; LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); setLine(LN,s.id,id,'earth'); setRenew(LN,id,false); window.T1=s.id; LN.reserves[id]=3; },mine);
  await p.evaluate(()=>{ LNU.shiftStop=false; LNU.speed=10; LNU.paused=false }); await p.waitForTimeout(900); await p.evaluate(()=>{ LNU.paused=true; LNdraw() });
  ok('depleted logged, big alert shown', await p.evaluate(()=>LN.log.some(l=>l.code==='depleted')&&document.getElementById('alert')&&document.getElementById('alert').className.indexOf('show')>=0));
  ok('clock not paused by depletion', await p.evaluate(()=>LNU.paused===true&&LN.pauseNow===false));
  ok('map ring red on the dead world', await p.evaluate(id=>!!document.querySelector('.pnode.dead[data-p="'+id+'"] .blinkring'),mine));
  await p.evaluate(()=>{ for(let i=0;i<60;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() }); await closePf();
  ok('standing order removed once the hull found nothing (v4.11)', await p.evaluate(id=>!lineOf(LN,id),mine));
  ok('setWant refused on a dead seam with an empty surface', await p.evaluate(id=>setWant(LN,id,'courier',1)==='depleted',mine));
  ok('hull came home and stood down (nothing_left)', await p.evaluate(()=>{ const s=shipById(LN,window.T1); return LN.log.some(l=>l.code==='nothing_left'&&l.d.n===s.id)&&(s.mode==='idle'||s.mode==='dead')&&!s.from }));
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  ok('+ disabled on the dead world', await p.evaluate(()=>{ const b=document.querySelector('[data-act="want"][data-c="courier"].plus'); return b&&b.getAttribute('aria-disabled')==='true' }));
  // 5. evacuate button greys once pressed
  await p.evaluate(id=>{ LN.earth.metal=5000; buildShip(LN,HULLS.findIndex(h=>h.gen===LN.gen&&h.key==='courier')); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; LNU.pickShip=s.id; LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  const evr=await p.evaluate(id=>abandon(LN,LNU.pickShip,id),mine);
  await p.evaluate(()=>{ LNU.tab='target'; LNdraw() });
  ok('evac button disabled and says under way', await p.evaluate(()=>{ const b=document.querySelector('[data-act="evac"]'); return b&&b.getAttribute('aria-disabled')==='true'&&/under way/.test(b.textContent) }), evr+' '+await p.evaluate(()=>{ const b=document.querySelector('[data-act="evac"]'); return b?b.outerHTML.slice(0,120):'nobtn' }));
  // 6. big buttons on the Earth panel
  await p.evaluate(()=>{ LN.earth.metal=1e5; LN.earth.parts=1e4; LN.earth.fuel=1e5; LN.earth.food=1e5; LN.driveLvl=5; ensureGen(5); LN.gen=5; LN.nightSeen=true; PLANETS.filter(q=>q.sec<=1).forEach(q=>{ if(!LN.colonies[q.id]) LN.colonies[q.id]={pid:q.id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0} }); LNU.tab='earth'; LNdraw() });
  const bigs=await p.evaluate(()=>[...document.querySelectorAll('.btn.bigbtn')].map(b=>b.dataset.act).join(','));
  ok('big survey button when a sector can be opened', /survey/.test(bigs), bigs);
  ok('big ark button when berths can be bought', /ark/.test(bigs), bigs);
  // 7. yard queue above the dock
  await p.evaluate(()=>{ buildShip(LN,HULLS.findIndex(h=>h.gen===LN.gen&&h.key==='courier')); LNdraw() });
  ok('yard queue lists the building hull', await p.evaluate(()=>/In the yards:.*Hull \d+ Courier/.test(document.getElementById('dock').textContent)));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close(); await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
