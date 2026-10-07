// v4.28 — F-11: the larder forecast. An idle desk (no farm line) must get the journal pause 'food_horizon' centuries before
// the famine, the advisor line, the Earth rail horizon, EN and RU, no raw placeholders. node pw37.js [page.html]
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const page=process.argv[2]||'long-night.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000}}); p.setDefaultTimeout(8000);
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(150)};
  // dialogs are state, not the feature under test: close them by DOM click (the rail re-renders every tick, a mouse tap can lose the node)
  const closePf=async()=>{ for(let i=0;i<12;i++){ const did=await p.evaluate(()=>{ var q=function(s){var e=document.querySelector(s); return e&&e.offsetParent!==null?e:null};
      var e=q('[data-act="pfok"]')||q('[data-act="shiftok"]')||q('[data-act="nightok"]')||q('[data-act="nofreeclose"]'); if(e){ e.click(); return true } if(LN.shiftOpen){ LNU.shiftStop=false; LN.shiftOpen=false; LNdraw(); return true } return false }); if(!did) break; await p.waitForTimeout(80) } };
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ if(LN.over) break; tick(LN); LN.pauseNow=false } LNdraw() },n); await closePf() };
  const body=async()=>await p.evaluate(()=>document.body.textContent.replace(/\s+/g,' '));
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/'+page); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='11'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]');
  await p.evaluate(()=>{ LNU.pro.on=false; LNU.pro.stage=99; LNU.paused=true; LNdraw() });

  // === an idle desk: no farm line ever. Run until the journal speaks or 1600 years pass.
  let warn=null; for(let i=0;i<16&&!warn;i++){ await run(100); warn=await p.evaluate(()=>{ var e=LN.log.find(e=>e.code==='food_horizon'); return e?{day:e.day,d:e.d}:null }) }
  ok('journal pause food_horizon fired', !!warn, JSON.stringify(warn));
  ok('fired at or after K.FOOD_PAUSE_FROM', warn&&warn.day>=600, warn&&warn.day);
  ok('forecast year lies ahead by FOOD_HORIZON at most', warn&&warn.d.n>0&&warn.d.n<=400&&warn.d.y===warn.day+warn.d.n, warn&&JSON.stringify(warn.d));
  const fc=await p.evaluate(()=>LN.foodFc&&{y:LN.foodFc.y,n:LN.foodFc.n,hungry:!!LN.hungry,day:LN.day,food:Math.round(LN.earth.food)});
  ok('Earth is not hungry yet when the forecast speaks', fc&&!fc.hungry, JSON.stringify(fc));
  const t1=await body();
  ok('EN journal line visible', /THE LARDERS HAVE A DATE\. On today's lines Earth's rations run out around year \d+, \d+ years from now; \d+ in store, \d+ farms feeding home\./.test(t1), (t1.match(/THE LARDERS[^.]*\.[^.]*\./)||[''])[0]);
  ok('no raw placeholders in the journal line', !/\{[ynhk]\}/.test((t1.match(/THE LARDERS.{0,400}/)||[''])[0]));

  // === the advisor carries it, worst-first colouring, no undefined
  await p.evaluate(()=>{ LNU.advOpen=true; LNU.leftTab='advice'; LNdraw() }); await p.waitForTimeout(200);
  const adv=await p.evaluate(()=>{ var e=document.querySelector('.advbody'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('advisor: "Rations run out around year N — in M years"', /Rations run out around year \d+ — in \d+ years\./.test(adv), adv.slice(0,200));
  ok('advisor: farms on lines counted', /Farms on lines now: \d+\./.test(adv), adv.slice(0,200));
  ok('advisor line has no undefined/placeholder', !/undefined|\{[ynh]\}/.test(adv));

  // === the Earth rail shows the horizon year
  const rail=await p.evaluate(()=>{ var e=document.querySelector('#res .r-food .d'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('rations cell: "run out ~YEAR"', /run out ~\d+/.test(rail), rail);
  const foodCell=await p.evaluate(()=>{ var e=document.querySelector('#res .r-food .v'); return e?e.className:null });
  ok('food cell marked warn or bad', foodCell&&/warn|bad/.test(foodCell), foodCell);
  await p.screenshot({path:require('os').tmpdir()+'/v428-horizon-en.png',clip:{x:0,y:0,width:1600,height:1000}});

  // === RU
  await p.evaluate(()=>document.querySelector('[data-lang="ru"]').click()); await p.waitForTimeout(200);
  await p.evaluate(()=>{ ['[data-act="oskip"]','[data-act="gskip"]'].forEach(function(q){ var e=document.querySelector(q); if(e&&e.offsetParent!==null) e.click() }) }); await p.waitForTimeout(200);   // the language switch replays the opening
  await p.evaluate(()=>{ LNU.advOpen=true; LNU.leftTab='advice'; LNdraw() }); await p.waitForTimeout(200);
  const t2=await body();
  ok('RU journal line visible', /У КЛАДОВЫХ ПОЯВИЛАСЬ ДАТА\. При нынешних линиях провизия Земли кончится около \d+ года, через \d+ лет; в запасе \d+, ферм кормят дом \d+\./.test(t2), (t2.match(/У КЛАДОВЫХ.{0,200}/)||[''])[0]);
  const adv2=await p.evaluate(()=>{ var e=document.querySelector('.advbody'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('RU advisor: "Провизия кончится около N года — через M лет"', /Провизия кончится около \d+ года — через \d+ лет\./.test(adv2), adv2.slice(0,200));
  const rail2=await p.evaluate(()=>{ var e=document.querySelector('#res .r-food .d'); return e?e.textContent.replace(/\s+/g,' '):'' });
  ok('RU rations cell: "кончится ~YEAR"', /кончится ~\d+/.test(rail2), rail2);
  await p.screenshot({path:require('os').tmpdir()+'/v428-horizon-ru.png',clip:{x:0,y:0,width:1600,height:1000}});
  await p.screenshot({path:require('os').tmpdir()+'/v428-horizon-ru-crop.png',clip:{x:0,y:70,width:900,height:400}});
  await p.screenshot({path:require('os').tmpdir()+'/v428-horizon-ru-log.png',clip:{x:0,y:830,width:1230,height:170}});

  // === the famine really comes later: the warning was ahead of it, not after
  await run(600);
  const later=await p.evaluate(()=>({day:LN.day,hungry:!!LN.hungry,famine:LN.famine||0,over:LN.over||null,first:(LN.log.find(e=>e.code==='earth_dead')||{}).day||null}));
  ok('famine starts after the warning (lead > 150 years)', later.first&&later.first-warn.day>150, JSON.stringify(later));

  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERROR '+String(e).slice(0,400)) }
fs.writeFileSync(require('os').tmpdir()+'/pw37.out',out.join('\n')+'\n'); console.log(out.join('\n')); })();
