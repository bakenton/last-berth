// Direction B in detail (Nikita 18.11: «Б»): alert tiles from the game's own icons. Drawn over the real screen; the game is untouched.
// node mock3.js <repo> <outdir>
const path=require('path'), fs=require('fs');
const [,,REPO,OUT]=process.argv; fs.mkdirSync(OUT,{recursive:true});
const src=fs.readFileSync(path.join(REPO,'work','page.html'),'utf8'), pat='var OUT=outerR(), es=prj([0,22,0])';
if(src.indexOf(pat)<0){ console.log('projection anchor not found'); process.exit(1) }
fs.writeFileSync(path.join(OUT,'mock-page.html'),src.replace(pat,'window.__prj=prj; '+pat)); process.env.LB_WORK=OUT;
const {chromium}=require(path.join(REPO,'node_modules','playwright')); const UI=require(path.join(REPO,'tools','pw-ui.js'));
const FACE='url(data:image/webp;base64,'+fs.readFileSync(path.join(REPO,'work','web','alexandra','avatar.webp')).toString('base64')+')';

const CSS=`
#mkc{position:fixed;display:flex;flex-direction:column;gap:6px;z-index:9999;pointer-events:none}
.tl{position:relative;width:50px;height:50px;border:1px solid;background:#121212;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:700 14px Jost,sans-serif;line-height:1}
.tl svg{width:22px;height:22px}
.tl small{font-size:10px;font-weight:600;margin-left:1px}
.tl.red{border-color:#FF2A1A;color:#FF2A1A;box-shadow:0 0 16px rgba(255,42,26,.45)}
.tl.yel{border-color:#FFD21A;color:#FFD21A}
.tl.dim{border-color:#3a3a3a;color:#8a8a8a}
.tl.new::after{content:'';position:absolute;right:-4px;top:-4px;width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px #000}
.tl.loss{background:#3a0b07}
.tl .fc{width:48px;height:48px;background-size:cover;background-position:center 8%;position:absolute;inset:0}
.tl .fn{position:absolute;right:2px;bottom:2px;background:#000;color:#FFD21A;font-size:11px;padding:1px 3px}
.tp{position:absolute;right:60px;top:50%;transform:translateY(-50%);background:#121212;border:1px solid #FF2A1A;padding:7px 12px;white-space:nowrap;font:500 13px Jost,sans-serif;color:#ddd}
.tp b{color:#FF2A1A;font-weight:600;letter-spacing:.08em;margin-right:6px}
.tp i{display:block;font-style:normal;color:#888;font-size:11px;margin-top:3px;letter-spacing:.06em}
`;

(async()=>{ const b=await chromium.launch(); const files=[];
 for(const vp of [{width:1440,height:900,tag:'pc'},{width:390,height:844,tag:'phone'}]){
  const p=await UI.newPage(b,{vp:{width:vp.width,height:vp.height},file:'mock-page.html'}); const U=UI.ui(p);
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  const st=await p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; GOD.maxAll(); LN.driveLvl=5; LN.gen=5; ensureGen(5);
    while(SECTORS.length<K.RING_LAST) openSector(LN); for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LN.nightSeen=true;
    const pick=(sec,n)=>PLANETS.filter(q=>q.sec===sec&&q.kind!=='works').slice(0,n);
    const set=(q,pop)=>{ LN.colonies[q.id]={pid:q.id,pop,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[q.id]=1; LN.reserves[q.id]=Math.max(LN.reserves[q.id]||0,1e5) };
    const w7=pick(6,2); set(w7[0],90); set(w7[1],50); pick(5,1).forEach(q=>set(q,120)); pick(2,2).forEach(q=>set(q,200)); pick(0,2).forEach(q=>set(q,150));
    LN.day=1900; openDoor(LN); LN.nightSeen=true; LN.day=LN.door.dark[6]-46; tick(LN); LN.pauseNow=false; LNU.notes=[]; LNU.pf=null; LNdraw();
    return {w7n:w7.map(q=>q.name), left:LN.door.dark[6]-LN.day} });
  await U.clear(); await p.evaluate(()=>{ LNU.notes=[]; LNU.pf=null; LNdraw(); const t=document.getElementById('toasts'); if(t) t.innerHTML='' }); await p.waitForTimeout(400);

  await p.evaluate(({CSS,st,FACE,phone})=>{
    const s=document.createElement('style'); s.textContent=CSS; document.head.appendChild(s);
    // the game's own icons, recoloured
    const res=[...document.querySelectorAll('#res svg')].map(x=>x.outerHTML), tab={}; document.querySelectorAll('#tabs button').forEach(b=>{ const g=b.querySelector('svg'); if(g) tab[b.dataset.v]=g.outerHTML });
    const top=[...document.querySelectorAll('#top svg')].map(x=>x.outerHTML);
    const tint=(svg,c)=>svg.replace(/(fill|stroke)="(?!none)[^"]*"/g,'$1="'+c+'"').replace(/(fill|stroke):(?!none)[^;"]*/g,'$1:'+c).replace(/<svg/,'<svg style="color:'+c+'"');
    const IC={moon:top[1],people:res[4],fleet:tab.fleet,worlds:tab.worlds,tech:tab.tech,fuel:res[2]};
    // what replaced: the side flags and NEEDS A DECISION
    document.querySelectorAll('#tabs em.flag').forEach(e=>e.style.visibility='hidden'); const adv=document.querySelector('#top .adv'); if(adv) adv.style.visibility='hidden';
    const obj=[...document.querySelectorAll('body *')].find(e=>e.children.length===0&&e.textContent.trim()==='OBJECTIVE'); const ob=obj?obj.closest('div[class]').getBoundingClientRect():{bottom:300};
    const col=document.createElement('div'); col.id='mkc'; col.style.right=(phone?6:12)+'px'; col.style.top=(ob.bottom+(phone?8:10))+'px';
    if(phone){ col.style.transform='scale(.8)'; col.style.transformOrigin='top right' }
    const T=[
      {k:'red new',ic:tint(IC.moon,'#FF2A1A'),n:st.left,u:'y',tip:'<b>RING VII</b>goes dark in '+st.left+' y · 140 people on '+st.w7n.join(', ')+'<i>CLICK — SHOW ON THE MAP</i>',hover:!phone},
      {k:'red loss new',ic:tint(IC.fleet,'#FF2A1A'),n:'!',tip:'<b>HULL 52 LOST</b>6 crew<i>GONE ONCE SEEN</i>'},
      {k:'red',ic:tint(IC.people,'#FF2A1A'),n:38,u:'y',tip:'<b>CREWS REFUSE</b>in 38 y — bring the convoy home'},
      {k:'yel',ic:tint(IC.fleet,'#FFD21A'),n:2,tip:'<b>IDLE AT THE PIER</b>2 hulls'},
      {k:'yel',ic:tint(IC.worlds,'#FFD21A'),n:1,tip:'<b>NO LINE</b>Grist ships nothing home'},
      {k:'face new',n:36,tip:'<b>SHIFT 36</b>takes the Helm<i>CLICK — THE REPORT</i>'},
      {k:'dim',ic:tint(IC.tech,'#8a8a8a'),n:4,tip:'<b>IDEAS</b>4'},
    ];
    T.forEach(t=>{ const d=document.createElement('div'); d.className='tl '+t.k;
      if(t.k.indexOf('face')===0){ d.style.borderColor='#FFD21A'; d.innerHTML='<div class="fc" style="background-image:'+FACE+'"></div><span class="fn">'+t.n+'</span>' }
      else d.innerHTML=t.ic+'<span>'+t.n+(t.u?'<small>'+t.u+'</small>':'')+'</span>';
      if(t.hover){ const tp=document.createElement('div'); tp.className='tp'; tp.innerHTML=t.tip; d.appendChild(tp) }
      col.appendChild(d) });
    document.body.appendChild(col);
    window.__col=col;
  },{CSS,st,FACE,phone:vp.tag==='phone'});
  await p.waitForTimeout(200);
  const f=path.join(OUT,'B-'+vp.tag+'.png'); await p.screenshot({path:f}); files.push(f);
  if(vp.tag==='pc'){ const r=await p.evaluate(()=>{ const x=window.__col.getBoundingClientRect(); return {x:x.left-470,y:x.top-10,w:x.width+480,h:x.height+20} });
    const fz=path.join(OUT,'B-zoom.png'); await p.screenshot({path:fz,clip:{x:r.x,y:r.y,width:r.w,height:r.h}}); files.push(fz) }
  if(p.errs.length) console.log('page errors: '+p.errs.join(' | '));
  await p.close() }
 await b.close(); console.log(files.join('\n')) })().catch(e=>console.log('CRASH '+(e&&e.stack||e)));
