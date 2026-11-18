// Four whole-system variants for the game's notices (Nikita 18.11: «переделывать уже все абсолютно… никакого графоманства;
// смена — фигня, полезны только два задания; меню NEEDS A DECISION нравится; таблица задач справа — можно лучше»).
// The same moment in all four: ring VII fails in 45 y (140 people on Reave, Clinker); shift 36 has come with two orders;
// hull 52 was lost (6 crew); 4 worlds have no hulls on the line; the player has just scrapped a hull.
// Drawn over the real screen with the game's own markup (the decision menu's rows, the objective card's rows). node mock4.js <repo> <outdir>
const path=require('path'), fs=require('fs');
const [,,REPO,OUT]=process.argv; fs.mkdirSync(OUT,{recursive:true});
const src=fs.readFileSync(path.join(REPO,'work','page.html'),'utf8'), pat='var OUT=outerR(), es=prj([0,22,0])';
if(src.indexOf(pat)<0){ console.log('projection anchor not found'); process.exit(1) }
fs.writeFileSync(path.join(OUT,'mock-page.html'),src.replace(pat,'window.__prj=prj; '+pat)); process.env.LB_WORK=OUT;
const {chromium}=require(path.join(REPO,'node_modules','playwright')); const UI=require(path.join(REPO,'tools','pw-ui.js'));
const FACE='url(data:image/webp;base64,'+fs.readFileSync(path.join(REPO,'work','web','alexandra','avatar.webp')).toString('base64')+')';

const CSS=`
.mk-flash{position:fixed;display:flex;align-items:center;gap:8px;border:1px solid #FF2A1A;background:#1a0806;color:#FF2A1A;font:600 11px Jost,sans-serif;letter-spacing:.14em;padding:0 12px;z-index:9999}
.mk-flash span{color:#ddd;letter-spacing:.04em;font-weight:500;font-size:12px}
.mk-sec{display:flex;justify-content:space-between;align-items:center;font:600 10px Jost,sans-serif;letter-spacing:.2em;color:#8a8a8a;padding:9px 12px 5px;border-top:1px solid #2a2a2a}
.mk-sec b{color:#FFD21A;font-weight:600} .mk-sec.red b{color:#FF2A1A}
.mk-row{display:grid;grid-template-columns:3px 1fr auto;gap:9px;align-items:center;padding:6px 12px;font:500 12.5px Jost,sans-serif;color:#ddd}
.mk-row i{align-self:stretch;background:#555} .mk-row.red i{background:#FF2A1A} .mk-row.yel i{background:#FFD21A} .mk-row.gone{opacity:.45}
.mk-row b{display:block;font-weight:600;letter-spacing:.06em;font-size:12px} .mk-row.red b{color:#FF2A1A}
.mk-row small{display:block;color:#8a8a8a;font-size:11px;margin-top:1px}
.mk-row em{font-style:normal;font:600 10px Jost,sans-serif;letter-spacing:.14em;border:1px solid #ddd;padding:4px 7px;white-space:nowrap}
.mk-row em.y{border-color:#FFD21A;color:#000;background:#FFD21A}
.mk-pin{position:fixed;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border:1px solid;background:#121212;z-index:9999}
.mk-pin svg{width:14px;height:14px}
.mk-tick{position:fixed;display:flex;align-items:center;gap:0;height:28px;background:#0d0d0d;border-bottom:1px solid #2a2a2a;font:500 12px 'JetBrains Mono',monospace;color:#bbb;z-index:9999;white-space:nowrap;overflow:hidden}
.mk-tick > span{padding:0 14px;height:100%;display:flex;align-items:center;border-right:1px solid #222}
.mk-tick .r{color:#FF2A1A;background:#1a0806} .mk-tick .y{color:#FFD21A} .mk-tick .d{color:#777} .mk-tick .ok{color:#2fa36b}
.mk-face{width:30px;height:30px;background-size:cover;background-position:center 8%;flex:none;border:1px solid #FFD21A}
`;

(async()=>{ const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const files=[];
 for(const vp of [{width:1440,height:900,tag:'pc'},{width:390,height:844,tag:'phone'}]){
  const newP=async()=>{ const p=await UI.newPage(b,{vp:{width:vp.width,height:vp.height},file:'mock-page.html'}); const U=UI.ui(p);
    await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
    const st=await p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; GOD.maxAll(); LN.driveLvl=5; LN.gen=5; ensureGen(5);
      while(SECTORS.length<K.RING_LAST) openSector(LN); for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LN.nightSeen=true;
      const pick=(sec,n)=>PLANETS.filter(q=>q.sec===sec&&q.kind!=='works').slice(0,n);
      const set=(q,pop)=>{ LN.colonies[q.id]={pid:q.id,pop,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[q.id]=1; LN.reserves[q.id]=Math.max(LN.reserves[q.id]||0,1e5) };
      const w7=pick(6,2); set(w7[0],90); set(w7[1],50); pick(2,2).forEach(q=>set(q,200)); pick(0,2).forEach(q=>set(q,150));
      LN.day=1900; openDoor(LN); LN.nightSeen=true; LN.day=LN.door.dark[6]-45; tick(LN); LN.pauseNow=false; LNU.notes=[]; LNU.pf=null; LNdraw();
      return {w7:w7.map(q=>q.id),w7n:w7.map(q=>q.name),left:LN.door.dark[6]-LN.day,noline:Object.keys(LN.colonies).filter(k=>planet(k).sec<6&&!onLine(LN,k).length)} });
    await U.clear(); await p.evaluate(()=>{ LNU.notes=[]; LNU.pf=null; LNdraw(); const t=document.getElementById('toasts'); if(t) t.innerHTML='' });
    await p.evaluate(CSS=>{ const s=document.createElement('style'); s.textContent=CSS; document.head.appendChild(s);
      window.__z=document.getElementById('top').getBoundingClientRect().width/1440;
      document.querySelectorAll('#tabs em.flag').forEach(e=>e.style.visibility='hidden');   // the side flags go in every variant
      window.__ring=(sec)=>{ const box=document.getElementById('mapbox').getBoundingClientRect(), svg=document.getElementById('map'), vb=svg.viewBox.baseVal, sc=Math.min(box.width/vb.width,box.height/vb.height), ox=box.left+(box.width-vb.width*sc)/2, oy=box.top+(box.height-vb.height*sc)/2, r=SECTORS[sec].r; let d='';
        for(let k=0;k<=180;k++){ const a=k/180*Math.PI*2, q=window.__prj([Math.cos(a)*r,0,Math.sin(a)*r]); if(!q) continue; d+=(d?'L':'M')+(ox+q.x*sc).toFixed(1)+' '+(oy+q.y*sc).toFixed(1) }
        const ns='http://www.w3.org/2000/svg', g=document.createElementNS(ns,'svg'); g.setAttribute('width',innerWidth); g.setAttribute('height',innerHeight); g.style.cssText='position:fixed;left:0;top:0;z-index:9998;pointer-events:none';
        const pa=document.createElementNS(ns,'path'); pa.setAttribute('d',d); pa.setAttribute('fill','none'); pa.setAttribute('stroke','#FF2A1A'); pa.setAttribute('stroke-width',Math.max(1.6*window.__z,1)); pa.setAttribute('stroke-opacity','.8'); g.appendChild(pa); document.body.appendChild(g) };
      window.__wpt=id=>{ const c=document.querySelector('#map .wd[data-p="'+id+'"] circle'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,r:r.width/2} };
      window.__scaleBox=(el,origin)=>{ const z=window.__z; if(z<1){ el.style.transform='scale('+Math.max(z,.42)+')'; el.style.transformOrigin=origin } };
    },CSS);
    return {p,U,st} };
  const shot=async(p,n)=>{ await p.waitForTimeout(250); const f=path.join(OUT,n+'-'+vp.tag+'.png'); await p.screenshot({path:f}); files.push(f) };
  // the decision menu's own icons (evacuate, no line)
  let icons;

  // ── 1 · ONE MENU: the decision menu is the only place; the button flashes the newest in three words
  { const {p,U,st}=await newP(); await U.tap('#top .adv'); await p.waitForTimeout(300);
    icons=await p.evaluate(()=>[...document.querySelectorAll('#pop .advh svg')].map(s=>s.outerHTML));
    await p.evaluate(({st,FACE})=>{ const L=document.querySelector('#pop .advl'), first=L.querySelector('.advh'), evRow=L.querySelector('button[data-t="evac"]'), nlRow=L.querySelector('button[data-t="noline"]');
      const H=(ic,t,n,red)=>{ const h=first.cloneNode(true); h.querySelector('span').textContent=t; h.querySelector('b').textContent=n; if(ic!==null){ const sv=h.querySelector('svg'); if(sv) sv.outerHTML=ic } if(red) h.style.color='#FF2A1A'; return h };
      const R=(proto,t,s,e,col)=>{ const r=proto.cloneNode(true); r.querySelector('b').textContent=t; r.querySelector('span').textContent=s; r.querySelector('em').textContent=e; if(col){ r.querySelector('i').style.background=col; r.querySelector('b').style.color=col==='#FFD21A'?'#FFD21A':'' } return r };
      const face='<i style="display:inline-block;width:18px;height:18px;background:'+FACE+' center 8%/cover;vertical-align:middle;margin-right:2px"></i>';
      const h1=H(null,'Shift 36 — take one order','2'); h1.querySelector('svg')&&h1.querySelector('svg').remove(); h1.insertAdjacentHTML('afterbegin',face); h1.style.color='#FFD21A';
      const o1=R(nlRow,'Deliver 400 metal to Earth','Reward: 60 people to Earth · 120 years','Take →','#FFD21A'), o2=R(nlRow,'Put 2 new hauler hulls on lines','Reward: a hauler hull, Generation V · 120 years','Take →','#FFD21A');
      const h2=H(first.querySelector('svg').outerHTML,'Ring going dark','1',true), r2=R(evRow,'RING VII · '+st.left+' y','140 people on '+st.w7n.join(', '),'Evacuate →');
      const h3=H(null,'Lost','1',true); h3.querySelector('svg')&&h3.querySelector('svg').remove(); const r3=R(evRow,'HULL 52 · 6 crew','On the Hollow run, year 2003','Seen ✓'); r3.style.opacity='.75';
      [h1,o1,o2,h2,r2,h3,r3].forEach(x=>L.insertBefore(x,first));
      // the evacuate group: the two cut-off rows were the ring's — fold them into the ring row
      L.querySelectorAll('button[data-t="evac"]').forEach((x,i)=>{ if(x!==r2&&x!==r3) x.remove() }); L.querySelectorAll('.advh').forEach(h=>{ if(/Evacuate/.test(h.textContent)) h.remove() });
      // the button: red, and the newest in three words beside it for a moment
      const a=document.querySelector('#top .adv'); a.style.borderColor='#FF2A1A'; a.style.background='#FF2A1A'; a.style.color='#000'; const ab=a.getBoundingClientRect();
      const f=document.createElement('div'); f.className='mk-flash'; f.style.borderColor='#FFD21A'; f.style.color='#FFD21A'; f.style.background='#1a1606'; f.style.left=(ab.right+8)+'px'; f.style.top=ab.top+'px'; f.style.height=ab.height+'px'; f.innerHTML='SHIFT 36<span>2 orders</span>'; document.body.appendChild(f); window.__scaleBox(f,'top left');
      // own act: the existing small toast stays — the only toast
      const t=document.createElement('div'); t.style.cssText='position:fixed;right:16px;bottom:64px;background:#141414;border:1px solid #333;color:#bbb;font:500 12.5px Jost;padding:8px 14px;z-index:9999'; t.textContent='Scrapped — the metal is back at the yards.'; document.body.appendChild(t); window.__scaleBox(t,'bottom right');
    },{st,FACE});
    await shot(p,'1-onemenu'); await p.close() }

  // ── 2 · THE HELM CARD: the objective card becomes the one console — goal · shift orders · now
  { const {p,U,st}=await newP();
    await p.evaluate(({st,FACE})=>{ const c=document.querySelector('.ocard'); if(!c) return; c.style.maxHeight='none'; c.style.height='auto';
      const ft=c.querySelector('.ft'); const sg=c.querySelector('.sg'); if(sg) sg.remove();
      const box=document.createElement('div'); box.innerHTML=
        '<div class="mk-sec"><span style="display:flex;align-items:center;gap:8px"><i class="mk-face" style="width:18px;height:18px;background-image:'+FACE+'"></i>SHIFT 36 · TAKE ONE</span><b>120 Y</b></div>'+
        '<div class="mk-row yel"><i></i><div><b>DELIVER 400 METAL</b><small>→ 60 people to Earth</small></div><em class="y">TAKE</em></div>'+
        '<div class="mk-row yel"><i></i><div><b>2 NEW HAULERS ON LINES</b><small>→ a hauler, Gen V</small></div><em class="y">TAKE</em></div>'+
        '<div class="mk-sec red"><span>NOW</span><b>3</b></div>'+
        '<div class="mk-row red"><i></i><div><b>RING VII · '+st.left+' Y</b><small>140 people on 2 worlds</small></div><em>EVAC</em></div>'+
        '<div class="mk-row red gone"><i></i><div><b>HULL 52 LOST</b><small>6 crew · Hollow run</small></div><em>✓</em></div>'+
        '<div class="mk-row"><i></i><div><b>4 WORLDS · NO LINE</b><small>nothing comes home</small></div><em>ADD</em></div>';
      c.insertBefore(box,ft);
      const a=document.querySelector('#top .adv'); if(a){ a.style.borderColor='#FF2A1A'; a.style.color='#FF2A1A' } },{st,FACE});
    await shot(p,'2-helmcard'); await p.close() }

  // ── 3 · THE MAP SPEAKS: the trouble is pinned on the thing with the menu's own icons; the card holds the shift's orders
  { const {p,U,st}=await newP();
    await p.evaluate(({st,icons,FACE})=>{ const z=window.__z; window.__ring(6);
      const pin=(id,ic,col,dx,dy)=>{ const w=window.__wpt(id); if(!w) return; const d=document.createElement('div'); d.className='mk-pin'; d.style.borderColor=col; d.style.left=(w.x+dx*Math.max(z,.5)-11)+'px'; d.style.top=(w.y+dy*Math.max(z,.5)-11)+'px'; d.innerHTML=ic.replace(/(fill|stroke)="(?!none)[^"]*"/g,'$1="'+col+'"'); if(z<1){ d.style.transform='scale('+Math.max(z*1.6,.6)+')' } document.body.appendChild(d) };
      st.w7.forEach(id=>pin(id,icons[0]||'',  '#FF2A1A',-24,0));
      st.noline.slice(0,4).forEach(id=>pin(id,icons[2]||icons[1]||'','#9a9a9a',-24,0));
      // the hull lost: a cross where she was
      const w=window.__wpt(st.noline[1]); if(w){ const x=document.createElement('div'); x.style.cssText='position:fixed;left:'+(w.x+40*Math.max(z,.5))+'px;top:'+(w.y+30*Math.max(z,.5))+'px;color:#FF2A1A;font:700 '+Math.max(16*z,9)+'px Jost;z-index:9999;letter-spacing:.1em'; x.textContent='✕ 52'; document.body.appendChild(x) }
      // the card: the shift is one line that opens in place
      const c=document.querySelector('.ocard'); const ft=c&&c.querySelector('.ft');
      if(c){ const box=document.createElement('div'); box.innerHTML='<div class="mk-sec" style="color:#FFD21A"><span style="display:flex;align-items:center;gap:8px"><i class="mk-face" style="width:18px;height:18px;background-image:'+FACE+'"></i>SHIFT 36 · TAKE ONE</span><b>120 Y</b></div>'+
        '<div class="mk-row yel"><i></i><div><b>DELIVER 400 METAL</b><small>→ 60 people to Earth</small></div><em class="y">TAKE</em></div>'+
        '<div class="mk-row yel"><i></i><div><b>2 NEW HAULERS ON LINES</b><small>→ a hauler, Gen V</small></div><em class="y">TAKE</em></div>'; c.insertBefore(box,ft) }
      const a=document.querySelector('#top .adv'); if(a){ a.style.borderColor='#FF2A1A'; a.style.color='#FF2A1A' } },{st,icons,FACE});
    await shot(p,'3-mapspeaks'); await p.close() }

  // ── 4 · THE HELM LINE: one console line under the strip, the Helm's own voice in log form; red stays pinned at the left
  { const {p,U,st}=await newP();
    await p.evaluate(({st,FACE})=>{ const z=window.__z, res=document.getElementById('res').getBoundingClientRect(), mb=document.getElementById('mapbox').getBoundingClientRect();
      const t=document.createElement('div'); t.className='mk-tick'; t.style.left=mb.left+'px'; t.style.top=res.bottom+'px'; const oc=document.querySelector('.ocard').getBoundingClientRect(); t.style.width=((oc.left-mb.left-10)/Math.max(z,.42))+'px';
      t.innerHTML='<span class="r">▲ RING VII · '+st.left+'Y · 140</span><span class="r">✕ HULL 52 · 6 CREW</span><span class="y" style="gap:8px"><i class="mk-face" style="width:20px;height:20px;background-image:'+FACE+'"></i>SHIFT 36 · 2 ORDERS ▸</span><span class="d">4 WORLDS · NO LINE</span><span class="ok">2005 · SCRAPPED HULL 17 · +180 METAL</span>';
      document.body.appendChild(t); window.__scaleBox(t,'top left'); window.__ring(6);
      const a=document.querySelector('#top .adv'); if(a){ a.style.borderColor='#FF2A1A'; a.style.color='#FF2A1A' } },{st,FACE});
    await shot(p,'4-helmline'); await p.close() }
 }
 await b.close(); console.log(files.join('\n')) })().catch(e=>console.log('CRASH '+(e&&e.stack||e)));
