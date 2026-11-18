// Variant 5 «after Clash of Clans» (Nikita 18.11: «В Clash of Clans был хороший интерфейс»; phone — later).
// CoC's ways (from memory): red number badges on the corner buttons; a bubble over the building that wants a tap (a full collector,
// a finished upgrade); a timer bar over what is under way; season tasks with a progress bar and a reward icon; the attack log
// with a red badge. Carried over in the game's own look (thin lines, hex glyphs). Same moment as round 4. node mock5.js <repo> <outdir>
const path=require('path'), fs=require('fs');
const [,,REPO,OUT]=process.argv; fs.mkdirSync(OUT,{recursive:true});
const src=fs.readFileSync(path.join(REPO,'work','page.html'),'utf8'), pat='var OUT=outerR(), es=prj([0,22,0])';
if(src.indexOf(pat)<0){ console.log('projection anchor not found'); process.exit(1) }
fs.writeFileSync(path.join(OUT,'mock-page.html'),src.replace(pat,'window.__prj=prj; '+pat)); process.env.LB_WORK=OUT;
const {chromium}=require(path.join(REPO,'node_modules','playwright')); const UI=require(path.join(REPO,'tools','pw-ui.js'));
const FACE='url(data:image/webp;base64,'+fs.readFileSync(path.join(REPO,'work','web','alexandra','avatar.webp')).toString('base64')+')';

const CSS=`
.bd{position:absolute;min-width:20px;height:20px;border-radius:10px;background:#FF2A1A;color:#fff;font:700 12px Jost,sans-serif;display:flex;align-items:center;justify-content:center;padding:0 6px;box-shadow:0 0 0 2px #0b0b0b;z-index:5}
.bb{position:fixed;z-index:9999;display:flex;flex-direction:column;align-items:center;pointer-events:none}
.bb .hx{width:34px;height:38px;display:flex;align-items:center;justify-content:center;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);position:relative}
.bb .hx::before{content:'';position:absolute;inset:1.5px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:#121212}
.bb .hx svg{position:relative;width:16px;height:16px}
.bb .tl{width:1px;height:9px}
.bb .n{position:absolute;right:-8px;top:-4px;font:700 11px Jost,sans-serif;color:#fff;background:#FF2A1A;border-radius:8px;padding:0 5px;box-shadow:0 0 0 2px #0b0b0b}
.tmr{position:fixed;z-index:9999;display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none}
.tmr b{font:600 13px Jost,sans-serif;letter-spacing:.12em;color:#FF2A1A;background:#121212;border:1px solid #FF2A1A;padding:3px 10px}
.tmr .bar{width:120px;height:5px;background:#3a0b07;border:1px solid #FF2A1A}.tmr .bar u{display:block;height:100%;background:#FF2A1A}
.tsk{border-top:1px solid #2a2a2a;padding:8px 12px 10px}
.tsk .h{display:flex;align-items:center;justify-content:space-between;font:600 10px Jost,sans-serif;letter-spacing:.2em;color:#FFD21A;margin-bottom:6px}
.tsk .h span{display:flex;align-items:center;gap:7px}
.tsk .f{width:18px;height:18px;background:${'FACE'} center 8%/cover}
.tr{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #1f1f1f;font:600 12px Jost,sans-serif;letter-spacing:.06em;color:#eee}
.tr .rw{display:flex;align-items:center;gap:3px;font:700 12px Jost,sans-serif;color:#2fa36b;border:1px solid #2fa36b;padding:2px 6px}
.tr .rw svg{width:13px;height:13px}
.tr em{font-style:normal;font:700 10px Jost,sans-serif;letter-spacing:.14em;background:#FFD21A;color:#000;padding:4px 8px}
.ft2{position:fixed;z-index:9999;left:50%;transform:translateX(-50%);font:600 13px Jost,sans-serif;letter-spacing:.1em;color:#ddd;background:rgba(18,18,18,.9);border:1px solid #333;padding:6px 14px}
.ft2 b{color:#2fa36b}
`;

(async()=>{ const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await UI.newPage(b,{vp:{width:1440,height:900},file:'mock-page.html'}); const U=UI.ui(p);
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const st=await p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; GOD.maxAll(); LN.driveLvl=5; LN.gen=5; ensureGen(5);
    while(SECTORS.length<K.RING_LAST) openSector(LN); for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LN.nightSeen=true;
    const pick=(sec,n)=>PLANETS.filter(q=>q.sec===sec&&q.kind!=='works').slice(0,n);
    const set=(q,pop)=>{ LN.colonies[q.id]={pid:q.id,pop,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[q.id]=1; LN.reserves[q.id]=Math.max(LN.reserves[q.id]||0,1e5) };
    const w7=pick(6,2); set(w7[0],90); set(w7[1],50); pick(2,2).forEach(q=>set(q,200)); pick(0,2).forEach(q=>set(q,150));
    LN.day=1900; openDoor(LN); LN.nightSeen=true; LN.day=LN.door.dark[6]-44; tick(LN); LN.pauseNow=false; LNU.notes=[]; LNU.pf=null; LNdraw();
    return {w7:w7.map(q=>q.id),left:LN.door.dark[6]-LN.day,noline:Object.keys(LN.colonies).filter(k=>planet(k).sec<6&&!onLine(LN,k).length)} });
  await U.clear(); await p.evaluate(()=>{ LNU.notes=[]; LNU.pf=null; LNdraw(); const t=document.getElementById('toasts'); if(t) t.innerHTML='' });
  await U.tap('#top .adv'); await p.waitForTimeout(300);
  const icons=await p.evaluate(()=>[...document.querySelectorAll('#pop .advh svg')].map(s=>s.outerHTML)); await U.tap('#pop .xb'); await p.waitForTimeout(250);
  await p.evaluate(({CSS,FACE,st,icons})=>{ const s=document.createElement('style'); s.textContent=CSS.replace('FACE center',FACE+' center'); document.head.appendChild(s);
    const tint=(svg,c)=>(svg||'').replace(/(fill|stroke)="(?!none)[^"]*"/g,'$1="'+c+'"');
    const res=[...document.querySelectorAll('#res svg')].map(x=>x.outerHTML), tabs={}; document.querySelectorAll('#tabs button').forEach(b=>{ tabs[b.dataset.v]=b });
    // 1 · badges on the buttons, instead of the side flags
    document.querySelectorAll('#tabs em.flag').forEach(e=>e.style.visibility='hidden');
    const badge=(el,n,dx,dy)=>{ if(!el) return; el.style.position='relative'; const d=document.createElement('span'); d.className='bd'; d.textContent=n; d.style.right=(dx||10)+'px'; d.style.top=(dy||8)+'px'; el.appendChild(d) };
    badge(tabs.worlds,4); badge(tabs.fleet,2); badge(tabs.ark,'!');
    const adv=document.querySelector('#top .adv'); if(adv){ adv.style.position='relative'; badge(adv,5,-10,-9) }
    // 2 · bubbles over the worlds that want a tap
    const wpt=id=>{ const c=document.querySelector('#map .wd[data-p="'+id+'"] circle'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top} };
    const bub=(id,svg,col,n)=>{ const w=wpt(id); if(!w) return; const d=document.createElement('div'); d.className='bb'; d.innerHTML='<div style="position:relative"><div class="hx" style="background:'+col+'">'+tint(svg,col)+'</div>'+(n?'<span class="n">'+n+'</span>':'')+'</div><div class="tl" style="background:'+col+'"></div>';
      document.body.appendChild(d); const r=d.getBoundingClientRect(); d.style.left=(w.x-r.width/2)+'px'; d.style.top=(w.y-r.height-2)+'px' };
    st.w7.forEach((id,i)=>bub(id,icons[0],'#FF2A1A',i?50:90));
    st.noline.slice(0,4).forEach(id=>bub(id,icons[2],'#d8d8d8'));
    const coll=Object.keys(LN.colonies).filter(k=>st.noline.indexOf(k)<0&&st.w7.indexOf(k)<0)[0]; if(coll) bub(coll,res[0],'#2fa36b');
    // 3 · a timer on what is under way: the ring going dark
    const lab=[...document.querySelectorAll('#map text.nm')].find(t=>/^7 ·/.test(t.textContent));
    { const g=document.createElementNS('http://www.w3.org/2000/svg','svg'); }
    if(lab){ const r=lab.getBoundingClientRect(); const t=document.createElement('div'); t.className='tmr'; t.innerHTML='<b>RING VII · '+st.left+' Y</b><div class="bar"><u style="width:'+(st.left/50*100)+'%"></u></div>'; document.body.appendChild(t); const q=t.getBoundingClientRect(); t.style.left=(r.left+r.width/2-q.width/2)+'px'; t.style.top=(r.top-q.height-6)+'px'; lab.style.visibility='hidden' }
    // 4 · the shift's two orders as season tasks: what, the reward icon, take
    const c=document.querySelector('.ocard'), ft=c&&c.querySelector('.ft');
    if(c){ const box=document.createElement('div'); box.className='tsk'; const ppl=tint(res[4],'#2fa36b'), hull=tint(tabs.fleet&&tabs.fleet.querySelector('svg')?tabs.fleet.querySelector('svg').outerHTML:'','#2fa36b');
      box.innerHTML='<div class="h"><span><i class="f"></i>SHIFT 36 · PICK ONE</span><span style="color:#8a8a8a">120 Y</span></div>'+
        '<div class="tr"><span>400 METAL → EARTH</span><span class="rw">'+ppl+'+60</span><em>TAKE</em></div>'+
        '<div class="tr"><span>2 NEW HAULERS</span><span class="rw">'+hull+'+1</span><em>TAKE</em></div>';
      c.insertBefore(box,ft) }
    // 5 · the log with a red badge: losses wait there (CoC's attack log)
    const pf=[...document.querySelectorAll('body *')].find(e=>e.children.length===0&&/PERSONAL FILES/i.test(e.textContent)); const pfb=pf&&pf.closest('button,div');
    if(pfb){ const r=pfb.getBoundingClientRect(); const lg=document.createElement('div'); lg.style.cssText='position:fixed;left:'+(r.right+8)+'px;top:'+r.top+'px;height:'+r.height+'px;display:flex;align-items:center;gap:8px;border:1px solid #FF2A1A;background:#121212;color:#FF2A1A;font:600 11px Jost;letter-spacing:.18em;padding:0 22px 0 12px;z-index:9999';
      lg.innerHTML='✕ LOSSES<span class="bd" style="right:-9px;top:-9px">1</span>'; document.body.appendChild(lg) }
    // 6 · the answer to your own act: one line at the top, it fades
    const res2=document.getElementById('res').getBoundingClientRect(); const f=document.createElement('div'); f.className='ft2'; f.style.top=(res2.bottom+10)+'px'; f.innerHTML='HULL 17 SCRAPPED · <b>+180 METAL</b>'; document.body.appendChild(f);
  },{CSS,FACE,st,icons});
  await p.waitForTimeout(250); const f=path.join(OUT,'5-coc-pc.png'); await p.screenshot({path:f});
  if(p.errs.length) console.log('page errors: '+p.errs.join(' | '));
  await b.close(); console.log(f) })().catch(e=>console.log('CRASH '+(e&&e.stack||e)));
