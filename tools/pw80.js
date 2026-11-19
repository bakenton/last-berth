// pw80 — v5.44, round 2 of the interface batch (Nikita's v5.43 playtest, 19.11). Real mouse.
//  1  the six rewards of the shift's orders each draw a chip on the card: icon + number (the slips: the hull icon + a word), the full words on hover
//  2  the order's result — the flash names what came (people, a pile of metal / fuel / parts, the slips done, a hull; the slips with none building: the hull instead)
//  3  a press on a tile of the strip (metal, rations, fuel, parts, people) opens the breakdown: in / out / net a year, the numbers equal the ledger; a second press closes it
//  4  390×844: no horizontal scroll, the breakdown and the card sit inside the screen
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const path=require('path');
const SHOTS=path.join(process.env.LB_WORK||path.join(__dirname,'..','work'),'playtest','ui-r2');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  require('fs').mkdirSync(SHOTS,{recursive:true});
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const run=async n=>{ await p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() },n); await U.clear() };
  await U.start('en',309573272);
  // a run with traffic: two mines, so the ledger has deliveries, departures, own output, eating
  const mines=await p.evaluate(()=>PLANETS.filter(q=>q.sec===0&&q.kind==='mine').sort((a,b)=>a.dist-b.dist).slice(0,2).map(q=>q.id));
  for(const m of mines){ await U.openWorld(m); await U.tap('#ovl [data-act="send"][data-p="'+m+'"]'); await run(45) }
  await run(40);
  // 1 — the chips
  const RW=[['people',{people:37},/^\+37$/,/37 people/],['hull',{hull:'freighter'},/^\+1$/,/hull/i],['metal',{metal:600},/^\+600$/,/600 metal/],['fuel',{fuel:400},/^\+400$/,/400 fuel/],['parts',{parts:150},/^\+150$/,/150 parts/],['yard',{yard:1,fb:'courier'},/Slips done/,/slips/i]];
  const chips=[];
  for(const [k,rw,tx,tt] of RW){
    await p.evaluate(rw=>{ LN.orders.on=null; LN.orders.offer=[{k:'hulls',c:'courier',n:2,no:1,rw:rw},{k:'survey',n:1,no:1,rw:rw}]; LNdraw() },rw); await U.clear();
    const c=await p.evaluate(()=>{ const e=document.querySelector('#cards .ordc .orc .rw'); return e?{t:e.innerText.trim(),title:e.title,svg:e.querySelectorAll('svg').length,use:(e.querySelector('use')||{getAttribute(){return null}}).getAttribute('href'),col:(e.querySelector('svg')||{style:{}}).style.color,w:e.getBoundingClientRect().width}:null });
    chips.push(c&&c.col);
    ok('1: '+k+' — a chip with an icon and the number', c&&c.svg===1&&tx.test(c.t)&&c.w>14, JSON.stringify(c));
    ok('1: '+k+' — the full words on hover', c&&tt.test(c.title), c&&c.title);
    if(k==='hull') ok('1: hull — the hull icon', c&&/#i-freighter/.test(c.use||''), c&&c.use);
    if(k==='yard') ok('1: yard — the hull icon of the fallback class and the word', c&&/#i-courier/.test(c.use||''), c&&c.use);
    if(k==='metal'){ await p.evaluate(()=>{ LNU.win=null; LNU.tab=null; LNdraw() }); await p.screenshot({path:SHOTS+'/p80-order-metal-1440.png'}) }
    if(k==='parts'){ await p.evaluate(()=>{ LNU.win=null; LNU.tab=null; LNdraw() }); await p.screenshot({path:SHOTS+'/p80-order-parts-1440.png'}) }
  }
  ok('1: the three piles wear three different icon colours', new Set([chips[2],chips[3],chips[4]]).size===3, chips.join(' '));
  // 2 — the flash after the order
  await p.evaluate(()=>{ const E=LN.earth; E.metal=9000; E.food=20000; E.fuel=9000; E.parts=4000; E.people=3000; buildShip(LN,HULLS.findIndex(h=>h.gen===0&&h.key==='courier')); LNdraw() });
  const FL=[['people',{people:37},/^\+37$/,null],['metal',{metal:600},/^\+600$/,null],['fuel',{fuel:400},/^\+400$/,null],['parts',{parts:150},/^\+150$/,null],['yard',{yard:1,fb:'courier'},/^\+[1-9]$/,'#i-courier'],['hull',{hull:'freighter'},/^\+1$/,'#i-freighter'],['yard-none',{yard:1,fb:'courier'},/^\+1$/,'#i-courier']];
  for(const [k,rw,tx,use] of FL){
    await p.evaluate(([k,rw])=>{ LN.orders.on=null; LN.orders.offer=[{k:'hulls',c:'courier',n:1,no:1,rw:rw},{k:'survey',n:1,no:1,rw:rw}];
      if(k==='yard'){ if(!LN.ships.some(s=>s.mode==='building')) buildShip(LN,HULLS.findIndex(h=>h.gen===0&&h.key==='courier')) }
      if(k==='yard-none'){ for(const s of LN.ships) if(s.mode==='building') s.mode='dead' }
      orderTake(LN,0); const o=LN.orders.on; o.at=orderCur(LN,o)-o.n; tick(LN); LN.pauseNow=false; LN.shiftOpen=false; LNdraw() },[k,rw]);
    await U.play(2); await p.waitForTimeout(450); await U.pause();
    const f=await p.evaluate(()=>{ const e=document.querySelector('#cards .ordf.ok'); return e?{t:e.innerText.replace(/\s+/g,' ').trim(),rw:(e.querySelector('.rw')||{innerText:''}).innerText.trim(),use:(e.querySelector('.rw use')||{getAttribute(){return null}}).getAttribute('href'),toasts:[...document.querySelectorAll('#toasts .toast')].filter(t=>/order of the shift/i.test(t.textContent)).length}:null });
    ok('2: '+k+' — the flash names what came', f&&/Order done/i.test(f.t)&&tx.test(f.rw)&&(!use||f.use===use)&&f.toasts===0, JSON.stringify(f));
    if(k==='metal') await p.screenshot({path:SHOTS+'/p80-flash-metal-1440.png'});
    await p.evaluate(()=>{ LNU.ordFlash=null; LNdraw() }); await U.clear();
  }
  // 3 — the breakdown (the strip's trend needs a drawn year each: a dense history, as a playing player has)
  await p.evaluate(()=>{ for(let i=0;i<66;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false; LNdraw() } }); await U.clear();
  const tiles=['metal','food','fuel','parts','people'];
  const led=(k,n)=>p.evaluate(([k,n])=>{ const Y=LN.years, FK=LN.fk, rows=Y.slice(Y.length-Math.min(n,Y.length)), m={}; rows.forEach(r=>{ for(let j=0;j<r.f.length;j+=2){ const key=FK[r.f[j]]; if(key.indexOf(k+'.')===0) m[key.slice(k.length+1)]=(m[key.slice(k.length+1)]||0)+r.f[j+1] } });
    const o={}; for(const a in m) o[a]=m[a]/rows.length; return {n:rows.length,o} },[k,n]);
  const NUM=s=>parseFloat(s.replace(/\s/g,'').replace('−','-').replace('+','').replace('/yr',''));
  for(const k of tiles){
    await U.clear(); await U.tap('#res [data-r="'+k+'"]'); await p.waitForTimeout(150);
    const r=await p.evaluate(()=>{ const e=document.querySelector('#pop .flw'); if(!e) return null; return {head:e.querySelector('.sec').innerText.replace(/\s+/g,' ').trim(),rows:[...e.children].filter(c=>c.classList.contains('fr')||c.classList.contains('fh')).map(c=>({h:c.classList.contains('fh'),net:c.classList.contains('net'),l:c.firstChild.textContent.trim(),v:(c.querySelector('b')||{innerText:''}).innerText.trim()}))} });
    ok('3: '+k+' — the press opens the breakdown', !!r&&r.rows.length>=1, JSON.stringify(r));
    if(!r) continue;
    const nY=+(/LAST\s+(\d+)\s+YR/i.exec(r.head)||[0,0])[1]; const L=await led(k,nY||10); const sum=a=>a.reduce((s,x)=>s+x,0);
    const net=r.rows.find(x=>x.net), inH=r.rows.find(x=>x.h&&!x.net&&/^In/.test(x.l)), outH=r.rows.find(x=>x.h&&/^Out/.test(x.l));
    const eIn=sum(Object.values(L.o).filter(v=>v>=0.05)), eOut=-sum(Object.values(L.o).filter(v=>v<=-0.05));
    const tol=v=>Math.max(0.15,Math.abs(v)*0.006);
    ok('3: '+k+' — In / Out / Net equal the ledger (last '+L.n+' years)', net&&Math.abs(NUM(net.v)-(eIn-eOut))<=tol(eIn-eOut)+0.1&&(!inH||Math.abs(NUM(inH.v)-eIn)<=tol(eIn))&&(!outH||Math.abs(NUM(outH.v)+eOut)<=tol(eOut)), JSON.stringify({net:net&&net.v,inH:inH&&inH.v,outH:outH&&outH.v,eIn,eOut,n:L.n}));
    let side=null, sums={In:0,Out:0}, okSort=true, prev=1e9;
    for(const x of r.rows){ if(x.h&&!x.net){ side=/^In/.test(x.l)?'In':/^Out/.test(x.l)?'Out':null; prev=1e9; continue } if(x.net) side=null; if(side&&!x.h){ const v=Math.abs(NUM(x.v)); sums[side]+=v; if(!/^Other/.test(x.l)){ if(v>prev+1e-9) okSort=false; prev=v } } }
    ok('3: '+k+' — rows sorted by size, the rows add to the side', okSort&&(!inH||Math.abs(sums.In-NUM(inH.v))<=Math.max(0.6,0.02*eIn))&&(!outH||Math.abs(sums.Out+NUM(outH.v))<=Math.max(0.6,0.02*eOut)), JSON.stringify({sums,okSort}));
    ok('3: '+k+' — at most 4 rows + Other a side, short labels', r.rows.filter(x=>!x.h).length<=10&&r.rows.every(x=>x.l.length<=20), r.rows.map(x=>x.l).join('/'));
    if(k==='fuel') await p.screenshot({path:SHOTS+'/p80-breakdown-fuel-1440.png'});
    // the tile's trend and the breakdown's NET are one number (people: the tile is the births, not a stock change — compared with the Births row)
    const tl=await p.evaluate(k=>{ const e=document.querySelector('#res [data-r="'+k+'"] span'); return e?e.innerText.trim():null },k);
    const tv=tl?NUM(tl.replace('▲','').replace('▼','−').replace('—','')):null;
    if(k!=='people'){ const ex=await p.evaluate(k=>{ const h=LNU.hist, a=h[Math.max(0,h.length-61)], z=h[h.length-1]; return {tile:(z[k]-a[k])/(z.day-a.day), net:flowRecent(LN,k,60).net} },k);
      ok('3: '+k+' — unrounded: the ledger net equals the stock change the tile reads', Math.abs(ex.tile-ex.net)<=0.025, JSON.stringify(ex)) }
    if(k!=='people') ok('3: '+k+' — the NET equals the tile trend (last '+nY+' yr, 60 asked)', nY===60&&tv!==null&&net&&Math.abs(NUM(net.v)-tv)<=0.051, JSON.stringify({tile:tl,net:net&&net.v,nY}));
    else { const own=r.rows.find(x=>!x.h&&/Births/.test(x.l)); ok('3: people — the tile is the births rate; the Births row is near it (not a stock delta)', own&&tv!==null&&Math.abs(NUM(own.v)-tv)<=Math.max(0.5,tv*0.15), JSON.stringify({tile:tl,own:own&&own.v,net:net&&net.v})) }
    await U.tap('#res [data-r="'+k+'"]'); await p.waitForTimeout(100);
    ok('3: '+k+' — a second press closes it', await p.evaluate(()=>!document.querySelector('#pop .flw')));
  }
  await U.tap('#res [data-r="people"]'); const pl=await p.evaluate(()=>(document.querySelector('#pop .flw')||{innerText:''}).innerText); ok('3: people — own output is «Births»', /Births/.test(pl), pl.replace(/\s+/g,' '));
  await U.tap('#pop .xb'); ok('3: the × closes it', await p.evaluate(()=>!document.querySelector('#pop .flw')));
  ok('3: pressing a tile opens no window', await p.evaluate(()=>!LNU.win));
  const young=await p.evaluate(()=>{ const g=JSON.parse(JSON.stringify(LN)); g.years=[]; return flowRecent(g,'metal',10) }); ok('3: flowRecent on an empty ledger is empty', young.n===0&&!young.inn.length&&!young.out.length&&young.net===0, JSON.stringify(young));
  // 4 — the phone
  const q=await UI.newPage(b,{vp:{width:390,height:844}}); const V=UI.ui(q);
  await V.start('en',309573272);
  for(const m of mines){ await V.openWorld(m); await V.tap('#ovl [data-act="send"][data-p="'+m+'"]'); await q.evaluate(()=>{ for(let i=0;i<45;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNdraw() }); await V.clear() }
  await q.evaluate(()=>{ for(let i=0;i<40;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LN.orders.on=null; LN.orders.offer=[{k:'hulls',c:'courier',n:2,no:1,rw:{metal:600}},{k:'survey',n:1,no:1,rw:{parts:150}}]; LNdraw() }); await V.clear();
  const ph0=await q.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,chip:!!document.querySelector('#cards .ordc .orc .rw svg')}));
  ok('4: 390 px, the order card — no horizontal scroll, chips drawn', ph0.sw<=ph0.iw&&ph0.chip, JSON.stringify(ph0));
  await q.evaluate(()=>{ LNU.win=null; LNU.tab=null; LNdraw() }); await q.screenshot({path:SHOTS+'/p80-order-390.png'});
  for(const k of tiles){ await V.tap('#res [data-r="'+k+'"]'); await q.waitForTimeout(120);
    const ph=await q.evaluate(()=>{ const e=document.querySelector('#pop .flw'); if(!e) return null; const r=e.getBoundingClientRect(); return {l:r.left,r:r.right,t:r.top,b:r.bottom,sw:document.documentElement.scrollWidth,iw:innerWidth,ih:innerHeight} });
    ok('4: '+k+' — the breakdown fits the 390 px screen, no horizontal scroll', ph&&ph.l>=-0.5&&ph.r<=ph.iw+0.5&&ph.b<=ph.ih&&ph.sw<=ph.iw, JSON.stringify(ph));
    if(k==='fuel'){ await q.evaluate(()=>{ const t=document.getElementById('toasts'); t.innerHTML='<div class="toast">Founding party of 61 leaves for CINDER.</div>' }); }
    const tv4=await q.evaluate(()=>getComputedStyle(document.getElementById('toasts')).visibility); ok('4: '+k+' — a toast is hidden while the breakdown is open', tv4==='hidden', tv4);
    if(k==='fuel') await q.screenshot({path:SHOTS+'/p80-breakdown-fuel-390.png',clip:{x:0,y:0,width:390,height:330}});
    await V.tap('#res [data-r="'+k+'"]') }
  ok('no page errors', !p.errs.length&&!q.errs.length, p.errs.concat(q.errs).join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
