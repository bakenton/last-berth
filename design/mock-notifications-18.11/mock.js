// Mockup of the notification layout (Nikita 18.11 «Да, макет»). The game code is untouched: a scratch copy of page.html
// exposes the map projection; everything new is drawn over the real screen. node mock.js <repo> <outdir>
const path=require('path'), fs=require('fs');
const [,,REPO,OUT]=process.argv;
fs.mkdirSync(OUT,{recursive:true});
const src=fs.readFileSync(path.join(REPO,'work','page.html'),'utf8');
const pat='var OUT=outerR(), es=prj([0,22,0])';
if(src.indexOf(pat)<0){ console.log('projection anchor not found'); process.exit(1) }
fs.writeFileSync(path.join(OUT,'mock-page.html'),src.replace(pat,'window.__prj=prj; '+pat));
process.env.LB_WORK=OUT;
const {chromium}=require(path.join(REPO,'node_modules','playwright'));
const UI=require(path.join(REPO,'tools','pw-ui.js'));

const CSS=`
.mk-pl{position:fixed;display:flex;align-items:center;gap:10px;background:#141414;font:500 12.5px Jost,sans-serif;color:#ddd;padding:7px 14px;white-space:nowrap;z-index:50}
.mk-pl b{letter-spacing:.14em;font-size:11px}
.mk-red{border:1px solid #FF2A1A;box-shadow:0 0 18px rgba(255,42,26,.35)} .mk-red b{color:#FF2A1A}
.mk-grey{border:1px dashed #666} .mk-grey b{color:#aaa}
.mk-more{border:1px solid #444;color:#aaa;padding:7px 10px}
.mk-num{position:fixed;width:26px;height:26px;border-radius:50%;background:#FFD21A;color:#000;font:700 15px Jost,sans-serif;display:flex;align-items:center;justify-content:center;z-index:60;box-shadow:0 0 0 3px #000}
.mk-shift{position:fixed;display:flex;align-items:center;gap:14px;background:rgba(20,20,20,.96);border:1px solid #FFD21A;border-left:4px solid #FFD21A;padding:8px 18px 8px 8px;z-index:50;font:500 13px Jost,sans-serif;color:#ddd}
.mk-shift img{width:46px;height:46px;object-fit:cover;object-position:top}
.mk-shift b{color:#FFD21A;letter-spacing:.14em;font-size:12px;display:block}
.mk-shift span{color:#aaa} .mk-shift i{font-style:normal;color:#FFD21A;margin-left:12px;letter-spacing:.1em;font-size:11px}
.mk-toast{position:fixed;background:#141414;border:1px solid #2fa36b;color:#ddd;font:500 13px Jost,sans-serif;padding:10px 16px;z-index:50}
.mk-dec{position:fixed;background:#141414;border:1px solid #FF2A1A;z-index:50;font:500 13px Jost,sans-serif;color:#ddd;width:380px}
.mk-dec .h{padding:8px 14px;letter-spacing:.14em;font-size:11px;color:#FF2A1A;border-bottom:1px solid #333}
.mk-dec .r{padding:9px 14px;border-bottom:1px solid #262626;display:flex;justify-content:space-between;gap:10px}
.mk-dec .r.top{border-left:4px solid #FF2A1A;background:#1d1111}
.mk-dec .r em{font-style:normal;color:#FFD21A;font-size:11px;letter-spacing:.1em;white-space:nowrap}
`;

(async()=>{ const b=await chromium.launch(); const res=[];
 for(const vp of [{width:1440,height:900,tag:'pc'},{width:390,height:844,tag:'phone'}]){
  const p=await UI.newPage(b,{vp:{width:vp.width,height:vp.height},file:'mock-page.html'}); const U=UI.ui(p);
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const st=await p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; GOD.maxAll(); LN.driveLvl=5; LN.gen=5; ensureGen(5);
    while(SECTORS.length<K.RING_LAST) openSector(LN); for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LN.nightSeen=true;
    const pick=(sec,n)=>PLANETS.filter(q=>q.sec===sec&&q.kind!=='works').slice(0,n);
    const set=(q,pop)=>{ LN.colonies[q.id]={pid:q.id,pop,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[q.id]=1; LN.reserves[q.id]=Math.max(LN.reserves[q.id]||0,1e5) };
    const w7=pick(6,2); set(w7[0],90); set(w7[1],50); pick(5,1).forEach(q=>set(q,120)); pick(2,2).forEach(q=>set(q,200)); pick(0,2).forEach(q=>set(q,150));
    LN.day=1900; openDoor(LN); LN.nightSeen=true; LN.day=LN.door.dark[6]-48; tick(LN); LN.pauseNow=false;
    LNU.notes=[]; LNU.pf=null; LN.shiftOpen=true; LNdraw();
    const im=document.querySelector('#shiftwin .alx > div'); const a=im?getComputedStyle(im).backgroundImage:''; LN.shiftOpen=false; LNU.notes=[]; LNdraw();
    return {alex:a, w7:w7.map(q=>q.name), dark7:LN.door.dark[6]-LN.day, night:LN.night-LN.day} });
  st.alex='url(data:image/webp;base64,'+fs.readFileSync(path.join(REPO,'work','web','alexandra','happy.webp')).toString('base64')+')';
  await U.clear(); await p.evaluate(()=>{ LNU.notes=[]; LNU.pf=null; LNdraw(); const t=document.getElementById('toasts'); if(t) t.innerHTML='' }); await p.waitForTimeout(400);
  const z=vp.tag==='phone'?await p.evaluate(()=>{ const r=document.getElementById('top').getBoundingClientRect(); return r.width/1440 }):1;

  // A: ring VII failing, people on it
  await p.evaluate(({CSS,st,z})=>{
    const s=document.createElement('style'); s.textContent=CSS; document.head.appendChild(s);
    const box=document.getElementById('mapbox').getBoundingClientRect(), svg=document.getElementById('map'), vb=svg.viewBox.baseVal, sc=Math.min(box.width/vb.width,box.height/vb.height), ox=box.left+(box.width-vb.width*sc)/2, oy=box.top+(box.height-vb.height*sc)/2;
    const L=document.createElement('div'); L.id='mk'; L.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:40'; document.body.appendChild(L);
    // 2: the failing ring itself — a red band on the map
    const ns='http://www.w3.org/2000/svg', g=document.createElementNS(ns,'svg'); g.setAttribute('width',innerWidth); g.setAttribute('height',innerHeight); g.style.cssText='position:fixed;left:0;top:0;z-index:41';
    const r=SECTORS[6].r; let d='';
    for(let k=0;k<=180;k++){ const a=k/180*Math.PI*2, q=window.__prj([Math.cos(a)*r,0,Math.sin(a)*r]); if(!q) continue; d+=(d?'L':'M')+(ox+q.x*sc).toFixed(1)+' '+(oy+q.y*sc).toFixed(1) }
    for(const [w,o] of [[18*z,.18],[6*z,.45],[1.6*z,1]]){ const pa=document.createElementNS(ns,'path'); pa.setAttribute('d',d); pa.setAttribute('fill','none'); pa.setAttribute('stroke','#FF2A1A'); pa.setAttribute('stroke-width',w); pa.setAttribute('stroke-opacity',o); g.appendChild(pa) }
    L.appendChild(g);
    window.__ring=d;
    // 1: the strip at the top of the map — what has a countdown
    const ev=document.getElementById('evbar'); if(ev) ev.style.visibility='hidden';
    const top=document.getElementById('top').getBoundingClientRect(), res=document.getElementById('res').getBoundingClientRect();
    const strip=document.createElement('div'); strip.style.cssText='position:fixed;left:50%;transform:translateX(-50%) scale('+z+');transform-origin:top center;top:'+(res.bottom+8)+'px;display:flex;gap:6px;z-index:50';
    strip.innerHTML='<div class="mk-pl mk-red" style="position:static"><b>⚠ RING VII · SULLA FAILING</b><span>'+st.dark7+' y · 2 worlds · 140 people</span></div><div class="mk-pl mk-grey" style="position:static"><b>BREAKDOWNS · EARTH</b><span>23 y left</span></div><div class="mk-pl mk-more" style="position:static">+1</div>';
    L.appendChild(strip);
    // 3: NEEDS A DECISION — the ring first, red
    const adv=document.querySelector('#top .adv'); const ar=adv?adv.getBoundingClientRect():{left:top.left+380*z,bottom:top.bottom,width:200*z,top:top.top};
    if(adv){ adv.style.outline='2px solid #FF2A1A'; adv.style.color='#FF2A1A' }
    const dec=document.createElement('div'); dec.className='mk-dec'; dec.style.left=ar.left+'px'; dec.style.top=(ar.bottom+4)+'px'; dec.style.transform='scale('+z+')'; dec.style.transformOrigin='top left';
    dec.innerHTML='<div class="h">NEEDS A DECISION · 3</div><div class="r top"><span>Ring VII fails in '+st.dark7+' y — 140 people on '+st.w7.join(', ')+'</span><em>EVACUATE ›</em></div><div class="r"><span>2 hulls idle at the pier</span><em>SEND ›</em></div><div class="r"><span>Buy the first ark ring</span><em>ARK ›</em></div>';
    L.appendChild(dec); dec.style.display='none'; window.__dec=dec; window.__strip=strip;
    // 4: a toast — only the answer to the player's own act
    const tst=document.createElement('div'); tst.className='mk-toast'; tst.textContent='Scrapped — the metal is back at the yards.'; tst.style.right=(16*z)+'px'; tst.style.bottom=(70*z)+'px'; tst.style.transform='scale('+z+')'; tst.style.transformOrigin='bottom right'; L.appendChild(tst);
    window.__pos={strip:strip.getBoundingClientRect(),dec:dec.getBoundingClientRect(),tst:tst.getBoundingClientRect(),adv:ar};
  },{CSS,st,z});
  const pos=await p.evaluate(()=>{ const P=window.__pos, q=x=>({l:x.left,t:x.top,r:x.right,b:x.bottom}); return {strip:q(P.strip),dec:q(P.dec),tst:q(P.tst)} });
  const ringPt=await p.evaluate(()=>{ const m=window.__ring.match(/M([\d.]+) ([\d.]+)/); return m?{x:+m[1],y:+m[2]}:null });
  const nums=(list)=>p.evaluate(({list,z})=>{ list.forEach(([n,x,y])=>{ const d=document.createElement('div'); d.className='mk-num'; d.textContent=n; d.style.left=(x-13)+'px'; d.style.top=(y-13)+'px'; d.style.transform='scale('+Math.max(z,.55)+')'; document.getElementById('mk').appendChild(d) }) },{list,z});
  const advR=await p.evaluate(()=>{ const a=window.__pos.adv; return {r:a.right,t:a.top,b:a.bottom} });
  await nums([[1,pos.strip.l-14*z,pos.strip.t+16*z],[2,(ringPt?ringPt.x:vp.width/2)+18*z,(ringPt?ringPt.y:vp.height/2)-18*z],[3,advR.r+16*z,(advR.t+advR.b)/2],[4,pos.tst.l-16*z,pos.tst.t+18*z]]);
  await p.waitForTimeout(200); const fA=path.join(OUT,'A-'+vp.tag+'.png'); await p.screenshot({path:fA}); res.push(fA);
  await p.evaluate(()=>{ window.__strip.style.display='none'; window.__dec.style.display='block'; document.querySelectorAll('#mk .mk-num').forEach(n=>{ if(n.textContent!=='3') n.style.display='none' }) });
  await p.waitForTimeout(150); const fA2=path.join(OUT,'A2-'+vp.tag+'.png'); await p.screenshot({path:fA2}); res.push(fA2);

  // B: the shift — a plaque for 8 s, the game runs on
  await p.evaluate(({st,z})=>{ const L=document.getElementById('mk'); L.innerHTML='';
    const res=document.getElementById('res').getBoundingClientRect();
    const sh=document.createElement('div'); sh.className='mk-shift'; sh.style.left='50%'; sh.style.top=(res.bottom+8)+'px'; sh.style.transform='translateX(-50%) scale('+z+')'; sh.style.transformOrigin='top center';
    sh.innerHTML=(st.alex&&st.alex!=='none'?'<div style="width:46px;height:46px;background:'+st.alex+' center top/cover no-repeat;flex:none;border:1px solid #333"></div>':'')+'<div><b>SHIFT 36 TAKES THE HELM</b><span>'+st.night+' y to the Night · brought home 1 200 · 9 worlds</span></div><i>REPORT ›</i>';
    L.appendChild(sh); const bar=document.createElement('div'); bar.style.cssText='position:absolute;left:0;bottom:0;height:2px;width:62%;background:#FFD21A'; sh.appendChild(bar);
    const r=sh.getBoundingClientRect(); const d=document.createElement('div'); d.className='mk-num'; d.textContent='5'; d.style.left=(r.left-30)+'px'; d.style.top=(r.top+r.height/2-13)+'px'; d.style.transform='scale('+Math.max(z,.55)+')'; L.appendChild(d);
    const ev=document.getElementById('evbar'); if(ev) ev.style.visibility='visible' },{st,z});
  await p.waitForTimeout(200); const fB=path.join(OUT,'B-'+vp.tag+'.png'); await p.screenshot({path:fB}); res.push(fB);
  if(p.errs.length) console.log('page errors: '+p.errs.join(' | '));
  await p.close() }
 await b.close(); console.log(res.join('\n')) })().catch(e=>console.log('CRASH '+(e&&e.stack||e)));
