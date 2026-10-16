// v4.15 — progress gates (charting, drive marks) count worlds EVER settled; hull classes keep live reach.
// Reproduces the shape of the v4.14 log (seed 966268745): 6+ worlds settled, most of them spent and evacuated,
// Earth rich — charting used to be shut for good ("needs reach 6", live colonies 3).
// v4.35: кольца — вкладка Tech (#side, [data-act="survey"]); сообщение о закрытом гейте — тост (#toasts); JSON — exportLog.
// Usage: node pw33.js [page.html]   (default page.html). On v4.14 the same run is EXPECTED to FAIL the gate checks.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const UI=require('./pw-ui.js');
const page=process.argv[2]||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,260):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{file:page}); const U=UI.ui(p);
  const toasts=()=>p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent.replace(/\s+/g,' ')).join(' | '));
  await U.start('en',966268745);
  const hasSettled=await p.evaluate(()=>typeof settledCount==='function');
  ok('page is '+(hasSettled?'v4.15 (settledCount present)':'v4.14 (no settledCount)'), true);

  // scenario: 6 worlds settled in the past, only 3 alive; Earth rich; two sectors open
  const st=await p.evaluate(()=>{
    var G=LN;
    var ids=PLANETS.filter(q=>q.sec<SECTORS.length).slice(0,6).map(q=>q.id);
    G.earth.metal=5000; G.earth.food=20000; G.earth.fuel=9000; G.earth.parts=3000; G.earth.people=3000;
    G.colonies={}; G.settled=G.settled||{};
    ids.forEach(function(id,i){ if(i<3){ G.colonies[id]={pop:40,tier:0,kit:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:10,dark:false} } else { G.ghost[id]=100; } G.settled[id]=10; });
    G.stats.founded=6; LNdraw();
    return {ids:ids, live:reach(G), settled:(typeof settledCount==='function'?settledCount(G):null), sectors:SECTORS.length, can:canSurvey(G)};
  });
  ok('scenario built: 3 live, 6 settled ever, 2 sectors', st.live===3&&st.sectors===2, JSON.stringify(st));
  ok('canSurvey says ok with 6 settled and 3 alive', st.can==='ok', st.can);

  // the Tech tab shows the gate in settled worlds and the button is live
  await U.tab('tech');
  const rowTxt=await p.evaluate(()=>document.getElementById('side').textContent.replace(/\s+/g,' '));
  ok('Tech tab survey row reads in settled worlds', /settled/i.test(rowTxt)&&/6\s*\/\s*6|6 of 6|6\/6/.test(rowTxt), (rowTxt.match(/.{0,60}settled.{0,40}/i)||[rowTxt.slice(0,200)])[0]);
  const dis=await p.evaluate(()=>{ var bt=document.querySelector('#side [data-act="survey"]'); return bt?{dis:bt.getAttribute('aria-disabled'),why:bt.getAttribute('data-why')}:null });
  ok('survey button is enabled', dis&&dis.dis!=='true', JSON.stringify(dis));

  // click it with the real mouse: a third sector opens
  await U.tap('#side [data-act="survey"]');
  const after=await p.evaluate(()=>({sectors:SECTORS.length, acts:LN.actions.filter(a=>a.k==='survey').map(a=>a.r)}));
  ok('survey opened sector 3', after.sectors===3, JSON.stringify(after));

  // a gate that is genuinely closed: only 5 settled ever (3 alive + 2 ghosts) -> says so in settled worlds
  const closed=await p.evaluate(()=>{ var G=LN;
    return {need:K.SURVEY_REACH*SECTORS.length, have:settledCount(G), can:canSurvey(G)};
  });
  ok('next charting needs 9 settled and says "settled"', closed.need===9&&closed.can==='settled', JSON.stringify(closed));
  await U.tab('tech'); await U.tab('tech');
  const why=await p.evaluate(()=>{ var bt=document.querySelector('#side [data-act="survey"]'); return bt?{dis:bt.getAttribute('aria-disabled'),why:bt.getAttribute('data-why'),p:bt.getAttribute('data-whyp')}:null });
  ok('disabled button carries needsettled with n and r', why&&why.dis==='true'&&why.why==='needsettled'&&/"n":9/.test(why.p||''), JSON.stringify(why));
  await U.tap('#side [data-act="survey"]');
  const msg=await toasts();
  ok('pressing the closed button says why, in settled worlds (not reach)', /settled worlds/.test(msg)&&/need/i.test(msg)&&!/Reach grows/.test(msg), msg);

  // drive gate: level 0 -> 1 needs 4 settled; with 6 settled and 3 alive the forecast must not say "settled" blocked
  const drv=await p.evaluate(()=>{ var G=LN; G.driveLvl=2; var f=driveForecast(G,3); return {need:driveReachFor(G), have:settledCount(G), live:reach(G), st:f.st, n:f.n, r:f.r, start:startDrive(G,Object.keys(G.colonies)[0])} });
  ok('drive step 2->3 needs 12 settled and reports it as settled (not reach)', drv.need===12&&(drv.st==='settled')&&drv.start==='settled', JSON.stringify(drv));

  // hull classes still gate on LIVE reach (decision: hulls untouched)
  const hull=await p.evaluate(()=>{ var G=LN; var hi=HULLS.findIndex(function(h){return h.key==='freighter'&&!h.gen}); return {freighterNeeds:HULLS[hi].reach, live:reach(G), gate:buildShip(G,hi)} });
  ok('freighter (needs live reach 6) is locked with 3 live colonies', hull.live===3&&hull.gate==='locked', JSON.stringify(hull));

  // JSON log carries both numbers
  const log=await p.evaluate(()=>{ var J=JSON.parse(exportLog(LN)); return {v:J.v, reach:J.earth.reach, settled:J.earth.settled} });
  // v4.30: the version check was a regexp that stopped at 4.29 (4.30 failed it); now a numeric 'minor >= 15'
  const vm=/^4\.(\d+)$/.exec(log.v||''); ok('JSON log: version 4.15+ with reach and settled', !!vm&&+vm[1]>=15&&log.reach===3&&log.settled>=6, JSON.stringify(log));

  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push("FAIL scenario ran to the end — "+String(e).slice(0,300)) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
