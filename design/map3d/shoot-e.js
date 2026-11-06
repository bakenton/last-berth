/* map3d/shoot-e.js — E v2 in Chromium: overview, a real drag and a real click, close-ups of the hub and of a metal/works pair, the two toggles by mouse.
   node design/map3d/shoot-e.js → design/map3d/shots/e-hybrid-{desk,phone}-{1..6}.png */
const path=require('path'), {chromium}=require(path.join(__dirname,'../../node_modules/playwright'));
const sizes=[{n:'desk',w:1440,h:900},{n:'phone',w:390,h:844,touch:true},{n:'desk-run2',w:1440,h:900,q:'?run=2'},{n:'phone-run2',w:390,h:844,touch:true,q:'?run=2'}];
const shot=(p,n)=>p.screenshot({path:path.join(__dirname,'shots','e-hybrid-'+n+'.png')});
(async()=>{ const b=await chromium.launch();
  for(const sz of sizes){ const ctx=await b.newContext({viewport:{width:sz.w,height:sz.h},deviceScaleFactor:sz.touch?2:1,hasTouch:!!sz.touch});
    const p=await ctx.newPage(), errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()) });
    await p.goto('file:///'+path.join(__dirname,'e-hybrid.html').split(path.sep).join('/')+(sz.q||'')); await p.waitForTimeout(900);
    // the names of the outermost worlds: inside the screen?
    const edge=await p.evaluate(()=>{ const C=M3; C.update(innerWidth,innerHeight); let mn=1e9,mx=-1e9; C.M.worlds.forEach(w=>{ const s=C.project([w.px,w.h,w.pz]); if(s){ mn=Math.min(mn,s.x); mx=Math.max(mx,s.x) } }); return Math.round(mn)+'..'+Math.round(mx)+' of '+innerWidth });
    await shot(p,sz.n+'-1');
    const cx=sz.w/2, cy=sz.h/2; await p.mouse.move(cx,cy); await p.mouse.down(); for(let i=1;i<=12;i++) await p.mouse.move(cx+i*14,cy-i*4); await p.mouse.up(); await p.waitForTimeout(300);
    const turned=await p.evaluate(()=>M3.cam.yaw.toFixed(1)+'/'+M3.cam.pitch.toFixed(1));
    const hub=await p.evaluate(()=>{ const C=M3, w=C.M.worlds.find(w=>w.hub); C.update(innerWidth,innerHeight); const s=C.project([w.px,w.h,w.pz]); return {x:s.x,y:s.y,name:w.name} });
    await p.mouse.click(hub.x,hub.y); await p.waitForTimeout(300); const info=await p.evaluate(()=>document.getElementById('info').innerText.replace(/\n/g,' | '));
    await shot(p,sz.n+'-2');
    // close-up: the hub and its feeders
    await p.evaluate(()=>{ const C=M3, w=C.M.worlds.find(w=>w.hub); C.cam.tx=w.px; C.cam.tz=w.pz; C.cam.dist=innerWidth<600?620:520; C.cam.pitch=26; C.cam.yaw=Math.atan2(w.px,w.pz)*180/Math.PI+20 });
    await p.waitForTimeout(300); await shot(p,sz.n+'-3');
    // close-up: the nearest settled metal/works pair
    const pair=await p.evaluate(()=>{ const C=M3, W=C.M.worlds.filter(w=>w.on); let best=null;
      W.filter(a=>a.kind==='mine'&&!a.hub).forEach(a=>W.filter(b=>b.kind==='works').forEach(b=>{ const d=Math.hypot(a.px-b.px,a.pz-b.pz), e=Math.hypot((a.px+b.px)/2,(a.pz+b.pz)/2), sc=d+e*0.6; if(!best||sc<best.sc) best={a,b,d,e,sc} }));
      // the pair and Earth in one frame: aim between the pair and Earth, look from the pair's side
      const a=best.a, b=best.b, mx=(a.px+b.px)/2, mz=(a.pz+b.pz)/2; C.cam.tx=mx*0.6; C.cam.tz=mz*0.6; C.cam.dist=(innerWidth<600?520:380)+Math.max(best.d,best.e)*1.1; C.cam.pitch=24; C.cam.yaw=Math.atan2(mx,mz)*180/Math.PI+15;
      return a.name+'/'+b.name+' '+Math.round(best.d) });
    await p.waitForTimeout(300); await shot(p,sz.n+'-4');
    // the toggles, by mouse: solid spheres, then the hub line to magenta (two clicks)
    const tgl=async t=>{ const r=await p.evaluate(t=>{ const e=document.querySelector('[data-t='+t+']').getBoundingClientRect(); return {x:e.x+e.width/2,y:e.y+e.height/2} },t); await p.mouse.click(r.x,r.y) };
    await tgl('sph'); await shot(p,sz.n+'-5');
    await p.evaluate(()=>{ const C=M3, w=C.M.worlds.find(w=>w.hub); C.cam.tx=w.px; C.cam.tz=w.pz; C.cam.dist=innerWidth<600?620:520; C.cam.pitch=26; C.cam.yaw=Math.atan2(w.px,w.pz)*180/Math.PI+20 }); await p.waitForTimeout(300);
    const st=await p.evaluate(()=>(E2.solid()?'solid':'wire')+'/'+E2.hubColor()); await shot(p,sz.n+'-6');
    console.log(sz.n,'x-range',edge,'| drag',turned,'| click',hub.name,'→',info,'| pair',pair,'(mine/works)','| toggles',st,errs.length?'| ERR '+errs.slice(0,3).join(' ; '):'');
    await ctx.close() }
  await b.close() })();
