// v4.30 — the journal and the Earth cell are gone; crew cards sit at the foot of the chart and do not stop the clock;
// events, the drive, the larder date and a new ring stop it with a full-screen notice; the event bar blinks while an
// event runs; the convoy picker sets hulls aside with a plus. EN and RU, real clicks.
// node pw39.js [page.html]
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const page=process.argv[2]||'long-night.html';
const out=[]; let lang='en'; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+lang+' '+n+(x!==undefined?' — '+String(x).slice(0,300):''));
const TMP=require('os').tmpdir();
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
 for(lang of ['en','ru']){
  const p=await b.newPage({viewport:{width:1600,height:900}}); p.setDefaultTimeout(8000);
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150)};
  const shot=async n=>p.screenshot({path:TMP+'/v430-'+lang+'-'+n+'.png'});
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/'+page); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='11'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="'+lang+'"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  await p.evaluate(()=>{ LNU.pro.on=false; LNU.pro.stage=99; LNU.paused=true; LNU.shiftStop=false; LNdraw() });
  await p.evaluate(()=>{ for(let i=0;i<120;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() }); await p.waitForTimeout(200);
  ok('journal gone', !(await p.$('#btm'))&&!(await p.$('#log')));
  ok('Earth cell gone', !(await p.$('#h-stab')));
  const dock=await p.evaluate(()=>{ var d=document.getElementById('dock').getBoundingClientRect(), m=document.getElementById('mapwrap').getBoundingClientRect(); return {gap:Math.round(window.innerHeight-d.bottom), mapBottom:Math.round(window.innerHeight-m.bottom)} });
  ok('dock sits at the foot of the page', dock.gap<=14&&dock.mapBottom===0, JSON.stringify(dock));
  await shot('1-desk');

  // crew card: does not stop the clock
  await p.evaluate(()=>{ var k=Object.keys(LN.colonies)[0]; LNU.voiceLast=-999; log(LN,'colony_founded',{p:k,pop:30}); LNU.paused=false; LNdraw() }); await p.waitForTimeout(400);
  const pf=await p.evaluate(()=>{ var e=document.getElementById('pf'), bx=document.getElementById('pfbox'); if(!e||!bx) return null; var r=bx.getBoundingClientRect(); return {low:e.className, paused:LNU.paused, w:Math.round(r.width), bottom:Math.round(window.innerHeight-r.bottom), right:Math.round(window.innerWidth-r.right), txt:bx.textContent.slice(0,160)} });
  ok('crew card is low and the clock runs', pf&&pf.low==='low'&&pf.paused===false&&pf.bottom<=60&&pf.w<=470, JSON.stringify(pf));
  ok('crew card has no raw placeholders', pf&&!/\{\w+\}/.test(pf.txt), pf&&pf.txt);
  const d0=await p.evaluate(()=>LN.day); await p.waitForTimeout(2200); const d1=await p.evaluate(()=>LN.day);
  ok('years pass under the card', d1>d0, d0+' -> '+d1);
  await shot('2-crewcard');
  await tap('[data-act="pfok"]'); ok('card closes on its button with the clock running', !(await p.$('#pf')));

  // event warning: full screen, stops the clock, gives it back
  await p.evaluate(()=>{ LN.dir=LN.dir||{next:9e9,ev:[],n:0,seq:1}; LN.dir.next=9e9; LN.dir.ev.push({type:'storm',lobe:2,state:'warn',start:LN.day+30,end:LN.day+70,id:91}); log(LN,'storm_warn',{lobe:2,l:30,id:91}); LNdraw() }); await p.waitForTimeout(300);
  const nt=await p.evaluate(()=>{ var e=document.getElementById('note'); return e?{cls:e.className, paused:LNU.paused, txt:e.textContent.replace(/\s+/g,' ').slice(0,300), cover:e.getBoundingClientRect().width===window.innerWidth}:null });
  ok('event warning is a full-screen notice and stops the clock', nt&&nt.paused===true&&nt.cover&&nt.cls==='bad', JSON.stringify(nt));
  ok('notice names the event and the lobe, no placeholders', nt&&!/\{\w+\}/.test(nt.txt)&&/(Storm|Буря)/.test(nt.txt), nt&&nt.txt);
  const bar0=await p.evaluate(()=>{ var e=document.getElementById('evbar'); return {txt:e.textContent, blink:e.classList.contains('blink')} });
  ok('event bar: announced, steady', /(Storm|Буря)/.test(bar0.txt)&&!bar0.blink, JSON.stringify(bar0));
  await shot('3-event-notice');
  await tap('#note [data-act="noteok"]');
  ok('notice closes and the clock runs again', !(await p.$('#note'))&&(await p.evaluate(()=>LNU.paused))===false);
  await p.evaluate(()=>{ LNU.paused=true; LN.dir.ev[LN.dir.ev.length-1].start=LN.day; tick(LN); LN.pauseNow=false; LN.shiftOpen=false; LNdraw() }); await p.waitForTimeout(300);
  const bar1=await p.evaluate(()=>{ var e=document.getElementById('evbar'), r=e.getBoundingClientRect(); return {txt:e.textContent, blink:e.classList.contains('blink'), anim:getComputedStyle(e).animationName, x:Math.round(r.left), w:Math.round(r.width), note:!!document.getElementById('note')} });
  ok('event bar: running, blinking, no second notice', bar1.blink&&bar1.anim==='lbblink'&&!bar1.note, JSON.stringify(bar1));
  await shot('4-event-bar');

  // drive mark and ring notices queue one after another
  await p.evaluate(()=>{ LN.dir.ev.length=0; log(LN,'drive_mark',{p:'w0',n:2,s:3}); log(LN,'food_horizon',{y:1500,n:300,h:900,k:1}); LNdraw() }); await p.waitForTimeout(300);
  const n2=await p.evaluate(()=>{ var e=document.getElementById('note'); return e?e.textContent.replace(/\s+/g,' ').slice(0,260):null });
  ok('drive notice first', n2&&!/\{\w+\}/.test(n2)&&/(GENERATION|ПОКОЛЕНИ)/i.test(n2), n2);
  await shot('5-drive-notice'); await tap('#note [data-act="noteok"]'); await p.waitForTimeout(200);
  const n3=await p.evaluate(()=>{ var e=document.getElementById('note'); return e?e.textContent.replace(/\s+/g,' ').slice(0,260):null });
  ok('larder notice second', n3&&!/\{\w+\}/.test(n3)&&/1500/.test(n3), n3);
  await tap('#note [data-act="noteok"]');
  ok('queue empty', !(await p.$('#note')));
  await p.evaluate(()=>{ LNU.paused=true; var E=LN.earth; E.metal=9e5;E.parts=9e5;E.fuel=9e5;E.food=9e5;E.people=9e4; LN.settled=LN.settled||{}; for(var i=0;i<8;i++) LN.settled['w'+i]=1; LNU.ringNoted=SECTORS.length-1; LN._sc=canSurvey(LN); LNdraw() }); await p.waitForTimeout(300);
  const n4=await p.evaluate(()=>{ var e=document.getElementById('note'); return {can:LN._sc, txt:e?e.textContent.replace(/\s+/g,' ').slice(0,260):null} });
  if(n4.can==='ok'){ ok('ring notice with a go button', n4.txt&&!!(await p.$('#note [data-act="notego"]')), n4.txt); await shot('6-ring-notice'); await tap('#note [data-act="notego"]');
    ok('go button opens the Earth tab', (await p.evaluate(()=>LNU.tab))==='earth'&&!(await p.$('#note'))) }
  else ok('ring notice (survey not available on this seed: '+n4.can+')', true);

  // convoy picker
  await p.evaluate(()=>{ if(!LN.night) revealNight(LN); LN.nightSeen=true; LNU.tab='earth'; LNU.paused=true;
    var g=convoyGen(LN); ensureGen(g); LN.gen=g; LN.driveLvl=g; var E=LN.earth; E.metal=9e6;E.parts=9e6;E.fuel=9e6;E.food=9e6;E.people=9e4; for(var j=0;j<3;j++){ var id=(g)*3+j; buildShip(LN,id); buildShip(LN,id) } LN._b0=buildShip(LN,0);
    for(var i=0;i<LN.ships.length;i++){ var s=LN.ships[i]; if(s.mode==='building'){ s.mode='idle'; s.at='earth'; s.t=0 } } LNU.notes=[]; LNU.pf=null; LNdraw() });
  await p.waitForTimeout(300);
  for(let i=0;i<6;i++){ const e=await p.$('[data-act="nightok"],[data-act="pfok"],#note [data-act="noteok"],[data-act="nofreeclose"]'); if(!e) break; await e.click(); await p.waitForTimeout(120) }
  await p.evaluate(()=>{ LNU.tab='earth'; LNU.paused=true; LNdraw() }); await p.waitForTimeout(200);
  await p.locator('#railbody [data-act="convoyopen"]').scrollIntoViewIfNeeded(); await tap('#railbody [data-act="convoyopen"]');
  const c0=await p.evaluate(()=>{ var e=document.getElementById('convoybox'); return e?{rows:e.querySelectorAll('.cv-row').length, old:e.querySelectorAll('.cv-row.old').length, txt:e.textContent.replace(/\s+/g,' ').slice(0,300)}:null });
  ok('picker lists the hulls docked at Earth', c0&&c0.rows>=7&&!/\{\w+\}/.test(c0.txt), JSON.stringify(c0));
  await shot('7-convoy-open');
  const before=await p.evaluate(()=>arkConvoy(LN).have);
  await tap('#convoybox .cv-row:not(.old):not(.in) [data-act="reserve"]'); await tap('#convoybox .cv-row:not(.old):not(.in) [data-act="reserve"]');
  const c1=await p.evaluate(()=>({res:LN.ships.filter(s=>s.reserve).length, inRows:document.querySelectorAll('#convoybox .cv-row.in').length, open:!!document.getElementById('convoy')}));
  ok('two pluses set two hulls aside, the picker stays open', c1.res===2&&c1.inRows===2&&c1.open, JSON.stringify(c1)+' '+JSON.stringify(before));
  const oldBtn=await p.$('#convoybox .cv-row.old [data-act="reserve"]');
  if(oldBtn){ await tap('#convoybox .cv-row.old [data-act="reserve"]'); const t=await p.evaluate(()=>document.getElementById('toast').textContent); ok('an old hull is refused with a reason', /(Too old|Слишком старое)/.test(t)&&(await p.evaluate(()=>LN.ships.filter(s=>s.reserve).length))===2, t) }
  await tap('#convoybox .cv-row.in [data-act="reserve"]');
  ok('minus gives a hull back', (await p.evaluate(()=>LN.ships.filter(s=>s.reserve).length))===1);
  await shot('8-convoy-picked');
  await tap('[data-act="convoyclose"]'); ok('picker closes', !(await p.$('#convoy')));
  ok('no page errors', errs.length===0, errs.join(' | '));
  await p.close();
 }
  await b.close();
}catch(e){ out.push('FAIL exception — '+String(e&&e.stack||e).slice(0,400)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log(`pw39 ${out.length-f}/${out.length}`); process.exit(f?1:0);
})();
