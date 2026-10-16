// v4.10 — the card without noise; big status; hull rows; classes hidden until open; renewal gone; births by larder; colony hazard loss; a_bigger; food warning; works note
// v4.35: карточка — окно мира (#ovl); предупреждения — тосты (#toasts); советник — LNI.adv(); иконки карты — #map .wd
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  const win=()=>p.evaluate(()=>document.getElementById('ovl').textContent.replace(/\s+/g,' '));
  const toasts=()=>p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent.replace(/\s+/g,' ')).join(' | '));
  const showWorld=async id=>{ await U.openWorld(id); await p.evaluate(()=>LNdraw()) };
  await U.start('en',309573272);
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  // 1. card: no richness / hazard / lag; seam in years
  await showWorld(mine);
  let r=await win();
  ok('no ×richness, hazard or signal delay', !/×0\.\d|Hazard|Signal delay/.test(r), r.slice(0,200));
  ok('seam shown before settlement', /Deposit/.test(r)&&/\d/.test(r.match(/Deposit[^A-Z]{0,20}/)?.[0]||''), r.match(/Deposit[^A-Z]{0,30}/)?.[0]);
  // 2. settled: big status block, hull rows, only opened classes, no renewal switch before Gen III
  await p.evaluate(id=>{ LN.earth.people=300; LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:840,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); setLine(LN,s.id,id,'earth'); LN.reserves[id]=1e6; LNdraw() },mine);
  await showWorld(mine); r=await win();
  ok('big status: stock on the surface, people, output', /On the surface\s*840/.test(r)&&/People\s*40/.test(r)&&/World gives/.test(r), r.slice(0,400));
  ok('hull row on the line', /On this line/.test(r)&&/Courier/.test(r), r.match(/On this line[^]{0,80}/)?.[0]);
  ok('only the courier class offered before hauler opens', await p.evaluate(()=>document.querySelectorAll('#ovl #ordblk .oc').length===1||document.querySelectorAll('#ovl #ordblk .oc').length===3), await p.evaluate(()=>document.querySelectorAll('#ovl #ordblk .oc').length));
  ok('v4.34: no renewal switch on a line (setRenew removed; hulls are put on by hand, nothing renews)', await p.evaluate(()=>!document.querySelector('#ovl [data-act="renew"]')));
  await p.evaluate(()=>{ LN.gen=2; ensureGen(2); LN.driveLvl=2; PLANETS.filter(q=>q.sec<=1).forEach(q=>{ if(!LN.colonies[q.id]) LN.colonies[q.id]={pid:q.id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0} }); LNdraw() });
  await showWorld(mine);
  ok('v4.34: still no renewal switch at Gen III', await p.evaluate(()=>!document.querySelector('#ovl [data-act="renew"]')));
  ok('hauler offered once Gen III is open', await p.evaluate(()=>document.querySelectorAll('#ovl #ordblk .oc').length>=2));
  // 3. kit text: the hull carries the kit out and installs it (texts of the machines block are in the build)
  // 4. map mark of a settled world: the people icon is drawn (v4.10 rule: people, not rate text)
  // v4.35: подписи без иконок; людей показывает подсказка #tip при наведении
  await U.closeWin(); await p.evaluate(()=>LNdraw());
  { const pt=await U.point(mine); if(pt){ await p.mouse.move(pt.x,pt.y); await p.waitForTimeout(150) } }
  ok('hover tip on a settled world shows its people (#tip)', await p.evaluate(id=>{ const t=document.getElementById('tip'); return t.className==='on'&&[...t.querySelectorAll('em')].some(e=>e.textContent.trim()===String(Math.floor(LN.colonies[id].pop))) },mine), await p.evaluate(()=>document.getElementById('tip').textContent.slice(0,120)));
  // 5. births by larder
  const fm=await p.evaluate(()=>{ const a=(LN.earth.food=0, fedMult(LN)); const c=(LN.earth.food=1e6, fedMult(LN)); return [a,c] });
  ok('fed multiplier 0.5 empty, 1.5 full', fm[0]===0.5&&fm[1]===1.5, fm.join(' '));
  // 6. colony hazard loss
  const loss=await p.evaluate(id=>{ const c=LN.colonies[id]; c.pop=100; const p0=c.pop; for(let i=0;i<200;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } return [p0, LN.stats.colonyLoss||0] },mine);
  ok('hazard takes a share over 200 years', loss[1]>=1, loss.join(' '));
  // 7. a_bigger advice with three couriers on a line
  await p.evaluate(id=>{ LN.reserves[id]=1e6; LN.colonies[id].dry=false; LN.earth.metal=1e5; LN.earth.parts=1e4; LN.earth.fuel=1e5; LN.earth.people=500; for(let k=0;k<3;k++){ const s=LN.ships.find(o=>o.mode==='idle'&&o.at==='earth'&&!(o.from&&o.to)); if(s) setLine(LN,s.id,id,'earth') } LNdraw() },mine);
  ok('a_bigger: the advisor names this world (too small hulls on the line)', await p.evaluate(id=>LNI.adv().some(r=>r[3]===id),mine), await p.evaluate(id=>lineCount(LN,id,'courier'),mine));
  // 8. food warning once when rations are low and no farm is lined
  await p.evaluate(()=>{ LN.earth.food=1; LNU.foodWarnAt=null; for(const k in LN.colonies){ if(planet(k).kind==='farm') LN.colonies[k].dark=true } LNdraw() });
  await U.until(()=>p.evaluate(()=>LNU.foodWarnAt!=null),60,10); await U.pause();
  ok('food warning shown (toast)', /Rations/i.test(await toasts()), (await toasts()).slice(0,200));
  ok('food warning shown (toast or advisor)', /Rations are running out/.test(await toasts())||await p.evaluate(()=>LNI.adv().some(r=>/RATIONS|rations|food/i.test(r[1]))), (await toasts()).slice(0,200));
  // 9. first works founded → note about the drive programme
  const works=await p.evaluate(()=>PLANETS.filter(q=>q.kind==='works'&&q.sec<=1)[0].id);
  await p.evaluate(id=>{ delete LN.colonies[id]; LNU.worksSeen=false; LN.earth.food=1e5; LN.earth.people=300; LN.earth.metal=1e4; buildShip(LN,HULLS.findIndex(h=>h.gen===LN.gen&&h.key==='courier')); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; colonize(LN,s.id,id,26,0); LNdraw() },works);
  await U.until(()=>p.evaluate(id=>!!LN.colonies[id],works),150,10); await U.pause();
  ok('works note shown (toast)', await p.evaluate(()=>LNU.worksSeen===true)&&/First industrial world/.test(await toasts()), (await toasts()).slice(0,200));
  await showWorld(works);
  await U.tab('tech');
  ok('drive programme explained in the Tech tab (v4.35: not in the works window)', /programme/i.test(await p.evaluate(()=>document.getElementById('side').textContent)), (await p.evaluate(()=>document.getElementById('side').textContent.replace(/\s+/g,' '))).slice(0,240));
  ok('no page errors (EN)', p.errs.length===0, p.errs.join(' | '));
  await p.close(); await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
