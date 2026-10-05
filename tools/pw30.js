// v4.10 — the card without noise; big status; hull rows; classes hidden until open; renewal toggle from Gen III; births by larder; colony hazard loss; a_bigger; food alert; works note; map label icons
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const fs=require('fs');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const rail=async()=>await p.evaluate(()=>document.querySelector('#rail').textContent);
  await p.goto('file:///home/claude/ln/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{ LNU.shiftStop=false });
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  // 1. card: no richness / hazard / lag; seam in years
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  let r=await rail();
  ok('no ×richness, hazard or signal delay', !/×0\.\d|Hazard|Signal delay/.test(r), r.slice(0,200));
  ok('seam shown in units before settlement', /Seam lasts\d+ metal/.test(r), r.match(/Seam lasts[^\n]{0,30}/)?.[0]);
  // 2. settled: big status block, hull rows, only opened classes, no renewal toggle before Gen III
  await p.evaluate(id=>{ LN.earth.people=300; LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:840,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); setLine(LN,s.id,id,'earth'); LNU.sel=id; LNU.tab='target'; LNdraw() },mine);
  r=await rail();
  ok('big status: stock, people, output', /On the surface840/.test(r)&&/People40/.test(r)&&/Output\d/.test(r), r.match(/On the surface[^\n]{0,80}/)?.[0]);
  ok('verdict line', /Line keeps up|Line falls behind/.test(r));
  ok('seam in years', /Seam lasts\d+ yrs at this pace/.test(r), r.match(/Seam lasts[^\n]{0,40}/)?.[0]);
  ok('hull row on top of the order block', await p.evaluate(()=>!!document.querySelector('#rail .lhs .lh')));
  ok('only the courier row before hauler opens', await p.evaluate(()=>document.querySelectorAll('#rail .so-row').length===1));
  ok('no renewal toggle before Gen III', !(await p.isVisible('[data-act="renew"]')));
  await p.evaluate(()=>{ LN.gen=2; ensureGen(2); LN.driveLvl=2; PLANETS.filter(q=>q.sec<=1).forEach(q=>{ if(!LN.colonies[q.id]) LN.colonies[q.id]={pid:q.id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0} }); LNU.tab='target'; LNdraw() });
  ok('renewal toggle at Gen III', await p.isVisible('[data-act="renew"]'));
  ok('hauler row once it reaches', await p.evaluate(()=>document.querySelectorAll('#rail .so-row').length>=2));
  // 3. kit text
  ok('kit text says the hull carries it', /carries it out and installs it/.test(await rail()));
  // 4. map label: people icon and pile icon, no rate text
  ok('map label uses the people icon', await p.evaluate(id=>{ const g=document.querySelector('.pnode[data-p="'+id+'"]'); return g&&!!g.querySelector('use[href="#i-people"]')&&!/\/year/.test(g.textContent) },mine));
  // 5. births by larder
  const fm=await p.evaluate(()=>{ const a=(LN.earth.food=0, fedMult(LN)); const c=(LN.earth.food=1e6, fedMult(LN)); return [a,c] });
  ok('fed multiplier 0.5 empty, 1.5 full', fm[0]===0.5&&fm[1]===1.5, fm.join(' '));
  // 6. colony hazard loss and the line top-up
  const loss=await p.evaluate(id=>{ const c=LN.colonies[id]; c.pop=100; const p0=c.pop; for(let i=0;i<200;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } return [p0, LN.stats.colonyLoss||0] },mine);
  ok('hazard takes a share over 200 years', loss[1]>=1, loss.join(' '));
  // 7. a_bigger advice with three couriers on a line
  await p.evaluate(id=>{ LN.reserves[id]=1e6; LN.colonies[id].dry=false; LN.earth.metal=1e5; LN.earth.parts=1e4; LN.earth.fuel=1e5; LN.earth.people=500; const rw=setWant(LN,id,'courier',3); for(let i=0;i<40;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } },mine);
  ok('a_bigger', await p.evaluate(()=>advice(LN).some(a=>a.code==='a_bigger')), await p.evaluate(id=>lineCount(LN,id,'courier'),mine));
  // 8. yellow food alert once per shift when rations are low and no farm is lined
  await p.evaluate(()=>{ LN.earth.food=100; LNU.foodWarnAt=null; for(const k in LN.colonies){ if(planet(k).kind==='farm') LN.colonies[k].dark=true } LNU.paused=false; LNU.speed=10 }); await p.waitForTimeout(500); await p.evaluate(()=>{ LNU.paused=true });
  ok('food alert (yellow, blinking)', await p.evaluate(()=>{ const a=document.getElementById('alert'); return a&&/show/.test(a.className)&&/warn/.test(a.className)&&/Rations are running out/.test(a.textContent) }), await p.evaluate(()=>document.getElementById('alert')?document.getElementById('alert').className:'none'));
  // 9. first works founded → yellow note about the drive programme
  const works=await p.evaluate(()=>PLANETS.filter(q=>q.kind==='works'&&q.sec<=1)[0].id);
  await p.evaluate(id=>{ delete LN.colonies[id]; LNU.worksSeen=false; LN.earth.food=1e5; LN.earth.people=300; LN.earth.metal=1e4; buildShip(LN,HULLS.findIndex(h=>h.gen===LN.gen&&h.key==='courier')); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; colonize(LN,s.id,id,26,0); LNU.paused=false; LNU.speed=10 },works);
  await p.waitForTimeout(3500); await p.evaluate(()=>{ LNU.paused=true });
  ok('works note shown', await p.evaluate(()=>LNU.worksSeen===true&&/First industrial world/.test(document.getElementById('alert').textContent)), await p.evaluate(id=>[!!LN.colonies[id], LN.day, document.getElementById('alert').textContent.slice(0,80)],works));
  await p.evaluate(id=>{ LNU.sel=id; LNU.tab='target'; LNdraw() },works);
  ok('drive explained on the works card', /Hosting the drive programme here opens Generation/.test(await rail()));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close(); await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
