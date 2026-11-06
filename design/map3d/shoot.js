/* map3d/shoot.js — check each draft in Chromium: two screen sizes, a real mouse drag to turn, a real click on a world, the panel text.
   node design/map3d/shoot.js [page ...]   (from the repository root; playwright from node_modules) → design/map3d/shots/*.png */
const path=require('path'), {chromium}=require(path.join(__dirname,'../../node_modules/playwright'));
const pages=process.argv.slice(2).length?process.argv.slice(2):['a-plane','b-svg','c-pins','d-holo','e-hybrid'];
const sizes=[{n:'desk',w:1440,h:900},{n:'phone',w:390,h:844,touch:true}];
(async()=>{
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const pg of pages) for(const sz of sizes){
    const ctx=await b.newContext({viewport:{width:sz.w,height:sz.h},deviceScaleFactor:sz.touch?2:1,hasTouch:!!sz.touch});
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()) });
    await p.goto('file://'+path.join(__dirname,pg+'.html').replace(/\\/g,'/')); await p.waitForTimeout(900);
    const gl=await p.evaluate(()=>getComputedStyle(document.querySelector('.nogl')||document.body).display==='flex'?'NO-GL':'ok');
    await p.screenshot({path:path.join(__dirname,'shots',pg+'-'+sz.n+'-1.png')});
    // turn: a real mouse drag across the middle
    const cx=sz.w/2, cy=sz.h/2; await p.mouse.move(cx,cy); await p.mouse.down(); for(let i=1;i<=12;i++) await p.mouse.move(cx+i*14,cy-i*4); await p.mouse.up();
    await p.waitForTimeout(400);
    // a settled world: where it is on screen now, then a real click there
    const at=await p.evaluate(()=>{ const C=M3; C.update(innerWidth,innerHeight); let best=null;
      C.M.worlds.filter(w=>w.on).forEach(w=>{ const s=C.project([w.px,w.h,w.pz]); if(s&&s.x>40&&s.x<innerWidth-40&&s.y>80&&s.y<innerHeight-120&&(!best||s.w<best.s.w)) best={w,s} });
      return best?{x:best.s.x,y:best.s.y,name:best.w.name}:null });
    let info='-';
    if(at){ await p.mouse.click(at.x,at.y); await p.waitForTimeout(400); info=await p.evaluate(()=>document.getElementById('info').innerText.replace(/\n/g,' | ')) }
    await p.screenshot({path:path.join(__dirname,'shots',pg+'-'+sz.n+'-2.png')});
    const turned=await p.evaluate(()=>M3.cam.yaw.toFixed(1)+'/'+M3.cam.pitch.toFixed(1));
    // a close look: the camera low over the busiest world, its neighbours around it
    await p.evaluate(()=>{ const C=M3, w=C.M.worlds.filter(w=>w.on).sort((a,b)=>b.pop-a.pop)[0]; C.cam.tx=w.px*0.85; C.cam.tz=w.pz*0.85; C.cam.dist=innerWidth<600?560:430; C.cam.pitch=20; C.cam.yaw=Math.atan2(w.px,w.pz)*180/Math.PI+25 });
    await p.waitForTimeout(400); await p.screenshot({path:path.join(__dirname,'shots',pg+'-'+sz.n+'-3.png')});
    const yaw=await p.evaluate(()=>M3.cam.yaw.toFixed(1)+'/'+M3.cam.pitch.toFixed(1));
    console.log(pg,sz.n,'gl:'+gl,'cam after drag:'+turned,'clicked:'+(at?at.name:'none'),'info:'+info,errs.length?'ERR '+errs.slice(0,3).join(' ; '):'');
    await ctx.close() }
  await b.close() })();
