// v4.11 — dead seam keeps carrying the pile; hulls stand down only on an empty surface; pile bar; unsettled label; save button; constants in the log
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await b.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});
  p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e)));
  await p.route('**/fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fs.readFileSync('fonts-local.css','utf8')}));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120)};
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); for(let i=0;i<6&&await p.isVisible('#pf');i++) await tap('[data-act="pfok"]') };
  const rail=async()=>await p.evaluate(()=>document.querySelector('#rail').textContent);
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/long-night.html'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  await tap('[data-lang="en"]'); await tap('[data-act="oskip"]'); await tap('[data-act="gskip"]'); await p.evaluate(()=>{ LNU.shiftStop=false });
  const mine=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[0].id);
  // 1. unsettled label: people cap only
  ok('unsettled label: no × or %, and (v4.21, Nikita) no people count before anyone lands', await p.evaluate(id=>{ const g=document.querySelector('.pnode[data-p="'+id+'"]'); return g&&!/×|%/.test(g.textContent)&&!g.querySelector('use[href="#i-people"]') },mine));
  // 2. dead seam with a pile: line keeps running, + allowed, hulls stand down only when the surface is empty
  await p.evaluate(id=>{ LN.earth.people=300; LN.earth.fuel=5000; LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:200,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; const s=LN.ships.find(s=>s.mode==='idle'&&s.at==='earth'); setLine(LN,s.id,id,'earth'); setRenew(LN,id,false); window.T1=s.id; LN.reserves[id]=0; LN.colonies[id].dry=true; },mine);
  await run(3);
  ok('line survives depletion while the pile remains', await p.evaluate(id=>!!lineOf(LN,id)&&!shipById(LN,window.T1).homeOnly,mine));
  ok('setWant allowed while the pile remains', await p.evaluate(id=>setWant(LN,id,'courier',1)==='ok',mine));
  ok('yards still serve a dead seam while the pile remains (v4.14)', await p.evaluate(id=>{ setWant(LN,id,'courier',2); tick(LN); const w=lineOf(LN,id).wait.courier; setWant(LN,id,'courier',1); return w!=='depleted' },mine));
  await run(200);
  const st=await p.evaluate(id=>{ const s=shipById(LN,window.T1); return {pile:Math.floor(LN.colonies[id].store.metal), res:LN.reserves[id], mode:s.mode, from:s.from, nl:LN.log.some(l=>l.code==='nothing_left'&&l.d.p===id), seamEv:LN.log.some(l=>l.code==='ev_seam'&&l.d.p===id), hauled:Math.round((LN.colonies[id].hauledOut||{}).metal||0)} },mine);
  ok('pile carried out to zero, then the hull stood down (or a seam event revived the world)', (st.pile<1&&st.nl&&st.mode==='idle'&&!st.from)||(st.seamEv&&st.res>0), JSON.stringify(st));
  ok('setWant refused once the pile is gone (unless revived)', await p.evaluate(id=>(LN.reserves[id]>0)||setWant(LN,id,'courier',1)==='depleted',mine));
  // 3. pile bar and per-trip share
  const mine2=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist)[1].id);
  await p.evaluate(id=>{ LN.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:700,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0}; LN.earth.metal=2000; buildShip(LN,0); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=8; LNU.pickShip=s.id; LNU.sel=id; LNU.tab='target'; LNdraw() },mine2);
  let r=await rail();
  // v4.18 (F-19): the bar label carries the numbers — 'On the surface 700 · one hold 70 takes 70 per trip — 10% of the pile. Grey — the pile; white frame — one hull's hold.'
  ok('no pile bar or share label (v4.22)', !/one hold|of the pile/.test(r)&&!(await p.evaluate(()=>document.querySelector('.pile-bar'))));
  ok('no bar elements (v4.22)', await p.evaluate(()=>!document.querySelector('.pile-fill')&&!document.querySelector('.pile-take')));
  ok('class row says per trip, no share', /70 per trip/.test(r)&&!/per trip \(/.test(r), r.match(/per trip[^\n]{0,40}/)?.[0]);
  await p.evaluate(id=>{ setLine(LN,LNU.pickShip,id,'earth'); LNU.pickShip=null; LNU.tab='target'; LNdraw() },mine2);
  ok('still no bar when no hull is picked', !/one hold/.test(await rail()));
  // 4. save as file (local page → blob download)
  await p.evaluate(()=>{ LNU.tab='earth'; LNdraw() });
  await tap('[data-act="export"]');
  const dlP=p.waitForEvent('download',{timeout:5000}).catch(()=>null);
  await tap('[data-act="savelog"]');
  const dl=await dlP;
  ok('download offered with a .json name', !!dl&&/last-berth-\d+-\d+\.json/.test(dl.suggestedFilename()), dl?dl.suggestedFilename():'none');
  if(dl){ const path=await dl.path(); const J=JSON.parse(fs.readFileSync(path,'utf8')); ok('saved JSON has constants and a version string', /^4\.[12]\d$/.test(J.v)&&J.constants&&J.constants.KIT_METAL===100) }
  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('ERR '+e.stack) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
