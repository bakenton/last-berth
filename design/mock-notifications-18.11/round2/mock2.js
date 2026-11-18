// Four directions for the game's notices (Nikita 18.11: «уведомления либо незаметные, либо бесят, либо графоманские —
// поищи, как в других играх, и собери макеты»). Drawn over the real screen; the game code is untouched.
// node mock2.js <repo> <outdir>
const path=require('path'), fs=require('fs');
const [,,REPO,OUT]=process.argv; fs.mkdirSync(OUT,{recursive:true});
const src=fs.readFileSync(path.join(REPO,'work','page.html'),'utf8'), pat='var OUT=outerR(), es=prj([0,22,0])';
if(src.indexOf(pat)<0){ console.log('projection anchor not found'); process.exit(1) }
fs.writeFileSync(path.join(OUT,'mock-page.html'),src.replace(pat,'window.__prj=prj; '+pat)); process.env.LB_WORK=OUT;
const {chromium}=require(path.join(REPO,'node_modules','playwright')); const UI=require(path.join(REPO,'tools','pw-ui.js'));
const ALEX='url(data:image/webp;base64,'+fs.readFileSync(path.join(REPO,'work','web','alexandra','happy.webp')).toString('base64')+')';
const ALARM='url(data:image/webp;base64,'+fs.readFileSync(path.join(REPO,'work','web','alexandra','alarm.webp')).toString('base64')+')';

const CSS=`#mk *{box-sizing:border-box} #mk{font-family:Jost,sans-serif}
.t-cap{position:fixed;left:96px;bottom:14px;background:#FFD21A;color:#000;padding:8px 14px;font:600 14px Jost,sans-serif;letter-spacing:.06em;z-index:70;max-width:560px;line-height:1.35}
.t-cap small{display:block;font-weight:500;font-size:12px;letter-spacing:0}
.tile{width:46px;height:46px;border:1px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#141414;font:700 13px Jost,sans-serif;gap:1px}
.tip1{position:absolute;right:54px;top:6px;background:#141414;border:1px solid #FF2A1A;color:#ddd;font:500 13px Jost,sans-serif;padding:6px 10px;white-space:nowrap}
.ltr{display:flex;align-items:center;justify-content:flex-end;gap:8px;height:36px}
.ltr span{font:600 11px Jost,sans-serif;letter-spacing:.14em;padding:5px 9px;background:#141414;border:1px solid #333;color:#ccc}
.ltr i{width:36px;height:30px;display:flex;align-items:center;justify-content:center;border:1px solid}
.big{display:flex;flex-direction:column;justify-content:center;padding:0 14px;height:45px;border-left:1px solid #2a2a2a;border-right:1px solid #2a2a2a;background:#120606}
.big em{font-style:normal;font:600 10px Jost,sans-serif;letter-spacing:.2em;color:#FF2A1A}
.big b{font:500 22px 'JetBrains Mono',monospace;color:#FF2A1A;line-height:1} .big b small{font:500 11px Jost,sans-serif;color:#aaa;margin-left:6px}
.sub{position:fixed;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;background:rgba(10,10,10,.82);padding:8px 18px 8px 8px;font:500 15px Jost,sans-serif;color:#eee;white-space:nowrap}
.sub .f{width:40px;height:40px;background-size:cover;background-position:center top;flex:none}
.sub b{color:#FFD21A;letter-spacing:.14em;font-size:11px;margin-right:8px}`;

const ICON={
 ring:c=>`<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="40 4 6 4"/><circle cx="12" cy="12" r="3" fill="${c}"/></svg>`,
 hull:c=>`<svg width="24" height="24" viewBox="0 0 24 24"><path d="M4 16 L12 5 L20 16 Z" fill="none" stroke="${c}" stroke-width="2"/><path d="M10 9 L14 9" stroke="#FFD21A" stroke-width="2"/></svg>`,
 mail:c=>`<svg width="20" height="14" viewBox="0 0 20 14"><rect x="1" y="1" width="18" height="12" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M1 1 L10 8 L19 1" fill="none" stroke="${c}" stroke-width="1.6"/></svg>`,
 pod:c=>`<svg width="24" height="24" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="5" fill="none" stroke="${c}" stroke-width="2"/></svg>`,
};

(async()=>{ const b=await chromium.launch(); const files=[];
 for(const vp of [{width:1440,height:900,tag:'pc'},{width:390,height:844,tag:'phone'}]){
  const p=await UI.newPage(b,{vp:{width:vp.width,height:vp.height},file:'mock-page.html'}); const U=UI.ui(p);
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const st=await p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; GOD.maxAll(); LN.driveLvl=5; LN.gen=5; ensureGen(5);
    while(SECTORS.length<K.RING_LAST) openSector(LN); for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LN.nightSeen=true;
    const pick=(sec,n)=>PLANETS.filter(q=>q.sec===sec&&q.kind!=='works').slice(0,n);
    const set=(q,pop)=>{ LN.colonies[q.id]={pid:q.id,pop,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[q.id]=1; LN.reserves[q.id]=Math.max(LN.reserves[q.id]||0,1e5) };
    const w7=pick(6,2); set(w7[0],90); set(w7[1],50); pick(5,1).forEach(q=>set(q,120)); pick(2,2).forEach(q=>set(q,200)); pick(0,2).forEach(q=>set(q,150));
    LN.day=1900; openDoor(LN); LN.nightSeen=true; LN.day=LN.door.dark[6]-47; tick(LN); LN.pauseNow=false; LNU.notes=[]; LNU.pf=null; LNdraw();
    return {w7:w7.map(q=>q.id), w7n:w7.map(q=>q.name), left:LN.door.dark[6]-LN.day, night:LN.night-LN.day} });
  await U.clear(); await p.evaluate(()=>{ LNU.notes=[]; LNU.pf=null; LNdraw(); const t=document.getElementById('toasts'); if(t) t.innerHTML='' }); await p.waitForTimeout(400);
  await p.evaluate(CSS=>{ const s=document.createElement('style'); s.textContent=CSS; document.head.appendChild(s) },CSS);

  // common helpers in the page
  await p.evaluate(()=>{
    window.__z=document.getElementById('top').getBoundingClientRect().width/1440;
    window.__reset=()=>{ const o=document.getElementById('mk'); if(o) o.remove(); const L=document.createElement('div'); L.id='mk'; L.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999'; document.body.appendChild(L);
      document.querySelectorAll('[data-mkhid]').forEach(e=>{ e.style.visibility=''; e.removeAttribute('data-mkhid') }); const a=document.querySelector('#top .adv'); if(a){ a.style.marginLeft=''; } return L };
    window.__hide=el=>{ if(el){ el.style.visibility='hidden'; el.setAttribute('data-mkhid','1') } };
    window.__ringPath=(sec,frac)=>{ const box=document.getElementById('mapbox').getBoundingClientRect(), svg=document.getElementById('map'), vb=svg.viewBox.baseVal, sc=Math.min(box.width/vb.width,box.height/vb.height), ox=box.left+(box.width-vb.width*sc)/2, oy=box.top+(box.height-vb.height*sc)/2, r=SECTORS[sec].r; let d='';
      const n=Math.round(180*frac); for(let k=0;k<=n;k++){ const a=-Math.PI/2+k/180*Math.PI*2, q=window.__prj([Math.cos(a)*r,0,Math.sin(a)*r]); if(!q) continue; d+=(d?'L':'M')+(ox+q.x*sc).toFixed(1)+' '+(oy+q.y*sc).toFixed(1) } return d };
    window.__svg=()=>{ const ns='http://www.w3.org/2000/svg', g=document.createElementNS(ns,'svg'); g.setAttribute('width',innerWidth); g.setAttribute('height',innerHeight); g.style.cssText='position:fixed;left:0;top:0'; document.getElementById('mk').appendChild(g); return g };
    window.__path=(g,d,attrs)=>{ const pa=document.createElementNS('http://www.w3.org/2000/svg','path'); pa.setAttribute('d',d); pa.setAttribute('fill','none'); for(const k in attrs) pa.setAttribute(k,attrs[k]); g.appendChild(pa); return pa };
    window.__cap=(t,s)=>{ return; const c=document.createElement('div'); c.className='t-cap'; c.innerHTML=t+'<small>'+s+'</small>'; const z=window.__z; if(z<1){ c.style.left='8px'; c.style.bottom='8px'; c.style.maxWidth='370px' } document.getElementById('mk').appendChild(c) };
    // the side tags and the decision button — what the new layouts replace
    window.__sideTags=()=>[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&/^(Idle at the pier|A hub can be built|No pods bought)/.test(e.textContent.trim()));
    window.__worldPt=id=>{ const c=document.querySelector('#map .wd[data-p="'+id+'"] circle'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,r:r.width/2} };
  });

  const shot=async n=>{ await p.waitForTimeout(200); const f=path.join(OUT,n+'-'+vp.tag+'.png'); await p.screenshot({path:f}); files.push(f) };

  // ── A · on the thing itself (Mini Metro, Into the Breach, FTL): no words; the threat drawn where it is, the timer on it
  await p.evaluate(({st,ICON})=>{ const L=__reset(), z=__z, g=__svg();
    __path(g,__ringPath(6,1),{stroke:'#FF2A1A','stroke-width':1.4*Math.max(z,.5),'stroke-opacity':.35,'stroke-dasharray':(6*z)+' '+(6*z)});
    __path(g,__ringPath(6,st.left/50),{stroke:'#FF2A1A','stroke-width':4*Math.max(z,.5),'stroke-linecap':'round'});
    st.w7.forEach(id=>{ const w=__worldPt(id); if(!w) return; const R=Math.max(w.r+9*z,7), f=st.left/50, a0=-Math.PI/2, a1=a0+f*Math.PI*2;
      __path(g,`M${w.x} ${w.y-R} A${R} ${R} 0 1 1 ${w.x-0.01} ${w.y-R}`,{stroke:'#FF2A1A','stroke-opacity':.3,'stroke-width':3*Math.max(z,.5)});
      __path(g,`M${w.x+R*Math.cos(a0)} ${w.y+R*Math.sin(a0)} A${R} ${R} 0 ${f>.5?1:0} 1 ${w.x+R*Math.cos(a1)} ${w.y+R*Math.sin(a1)}`,{stroke:'#FF2A1A','stroke-width':3*Math.max(z,.5)}) });
    // the shift: the year itself says it, for a moment
    const yr=[...document.querySelectorAll('#top *')].find(e=>e.children.length===0&&/^year$/i.test(e.textContent.trim()));
    if(yr){ const r=yr.getBoundingClientRect(), t=document.createElement('div'); t.style.cssText='position:fixed;left:'+(r.left)+'px;top:'+(r.bottom+2*z)+'px;font:600 '+(10*Math.max(z,.6))+'px Jost;letter-spacing:.18em;color:#000;background:#FFD21A;padding:2px 6px'; t.textContent='SHIFT 36'; L.appendChild(t) }
    __sideTags().forEach(__hide);
    __cap('A · ON THE THING ITSELF — Mini Metro, Into the Breach, FTL','No words on screen. The failing ring is a red line that shortens as its years run out; every world on it wears the same clock. The shift is a tag under the year for a few seconds. Detail on hover.');
  },{st,ICON:null});
  await shot('A-onthing');

  // ── B · alert tiles (Factorio, RimWorld alerts): a column of icons with one number each; there while it is true; hover — one line; click — to the place
  await p.evaluate(({st,ic})=>{ const L=__reset(), z=__z;
    const obj=[...document.querySelectorAll('body *')].find(e=>e.children.length===0&&e.textContent.trim()==='OBJECTIVE'); const ob=obj?obj.closest('div[class]').getBoundingClientRect():{right:innerWidth-12,bottom:300};
    const col=document.createElement('div'); col.style.cssText='position:fixed;right:'+(12*z)+'px;top:'+(ob.bottom+10*z)+'px;display:flex;flex-direction:column;gap:6px;transform:scale('+z+');transform-origin:top right';
    const tiles=[['#FF2A1A',ic.ring,st.left+'y',true],['#FFD21A',ic.hull,'2'],['#9A7CFF',ic.pod,'0']];
    tiles.forEach(([c,svg,n,tip])=>{ const t=document.createElement('div'); t.className='tile'; t.style.borderColor=c; t.style.color=c; t.style.position='relative'; t.innerHTML=svg+'<span>'+n+'</span>';
      if(tip){ t.style.boxShadow='0 0 14px rgba(255,42,26,.5)'; const tp=document.createElement('div'); tp.className='tip1'; tp.textContent='Ring VII goes dark in '+st.left+' y — 140 people on 2 worlds'; t.appendChild(tp) } col.appendChild(t) });
    L.appendChild(col);
    __sideTags().forEach(__hide); __hide(document.querySelector('#top .adv'));
    __cap('B · ALERT TILES — Factorio, RimWorld (alerts)','One column of icons, one number each, colour = how bad. A tile lives exactly as long as the trouble, then goes. Hover — one line; click — the map jumps there. Replaces the side tags and NEEDS A DECISION.');
  },{st,ic:{ring:ICON.ring('#FF2A1A'),hull:ICON.hull('#FFD21A'),pod:ICON.pod('#9A7CFF')}});
  await shot('B-tiles');

  // ── C · letters (RimWorld letters, Stellaris): what HAPPENED piles up as short envelopes; the game runs; open one — the full text
  await p.evaluate(({st,ic})=>{ const L=__reset(), z=__z;
    const obj=[...document.querySelectorAll('body *')].find(e=>e.children.length===0&&e.textContent.trim()==='OBJECTIVE'); const ob=obj?obj.closest('div[class]').getBoundingClientRect():{right:innerWidth-12,bottom:300};
    const col=document.createElement('div'); col.style.cssText='position:fixed;right:'+(12*z)+'px;top:'+(ob.bottom+10*z)+'px;display:flex;flex-direction:column;gap:4px;transform:scale('+z+');transform-origin:top right';
    [['#FF2A1A','RING VII FAILING',1],['#FFD21A','HULL 52 OVERDUE',1],['#8a8a8a','SHIFT 36 AT THE HELM',0],['#3FA9FF','COURIERS AT THE PIER',0]].forEach(([c,t,isNew])=>{
      const r=document.createElement('div'); r.className='ltr'; r.innerHTML='<span'+(isNew?' style="color:#fff;border-color:'+c+'"':'')+'>'+t+'</span><i style="border-color:'+c+';background:'+(isNew?c+'33':'#141414')+'">'+ic[c]+'</i>'; col.appendChild(r) });
    L.appendChild(col);
    __sideTags().forEach(__hide);
    __cap('C · LETTERS — RimWorld (letters), Stellaris','Things that happened stack on the right as three-word envelopes, coloured by weight; the game does not stop. Click — the full text with Alexandra; right-click — gone. The shift report is one of them.');
  },{st,ic:Object.fromEntries(['#FF2A1A','#FFD21A','#8a8a8a','#3FA9FF'].map(c=>[c,ICON.mail(c)]))});
  await p.evaluate(()=>{ window.__icMail=null });
  await shot('C-letters');

  // ── D · one threat, one voice (Frostpunk's storm countdown, radio lines): the single worst threat sits beside the Night as a second clock;
  //        Alexandra says the shift in one subtitle line at the bottom; everything else — the journal
  await p.evaluate(({st,alex,alarm})=>{ const L=__reset(), z=__z;
    const nl=[...document.querySelectorAll('#top *')].find(e=>e.children.length===0&&/^WAKE/.test(e.textContent.trim()));
    const wr=nl?nl.parentElement.getBoundingClientRect():{right:470*z,top:0};
    const adv=document.querySelector('#top .adv'); if(adv) adv.style.marginLeft=(150)+'px';
    const bx=document.createElement('div'); bx.className='big'; bx.style.cssText+=';position:fixed;left:'+(wr.right+14*z)+'px;top:0;transform:scale('+z+');transform-origin:top left';
    bx.innerHTML='<em>RING VII</em><b>'+st.left+'<small>years · 140</small></b>'; L.appendChild(bx);
    const g=__svg(); __path(g,__ringPath(6,1),{stroke:'#FF2A1A','stroke-width':1.6*Math.max(z,.5),'stroke-opacity':.7});
    const sb=document.createElement('div'); sb.className='sub'; sb.style.bottom=(90*z)+'px'; sb.style.transform='translateX(-50%) scale('+Math.max(z,.6)+')'; sb.style.transformOrigin='bottom center';
    sb.innerHTML='<div class="f" style="background-image:'+alex+'"></div><span><b>ALEXANDRA</b>Shift thirty-six. Three hundred and ninety-seven years to go.</span>'; L.appendChild(sb);
    __sideTags().forEach(__hide);
    __cap('D · ONE THREAT, ONE VOICE — Frostpunk (storm countdown), radio lines','Only the single worst threat gets a clock, next to the Night, same style. Alexandra says the shift in one subtitle line and it fades. No windows, no toasts; the rest is in the journal.');
  },{st,alex:ALEX,alarm:ALARM});
  await shot('D-onethreat');
  if(p.errs.length) console.log('page errors: '+p.errs.join(' | '));
  await p.close() }
 await b.close(); console.log(files.join('\n')) })().catch(e=>console.log('CRASH '+(e&&e.stack||e)));
