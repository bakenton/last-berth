/* map3d/common.js — shared by the 3D map drafts: the chart of a real run (data.js), the camera, mouse/finger input, picking, the info panel.
   Plane coordinates: X right, Z toward the viewer (= the game's screen y), Y up. Earth at the origin. A world stands on a CIRCLE of its ring
   (the game squashes the rings into ellipses 1.32 × 0.90 to fake the tilt; here the camera tilts for real), pushed apart at POS_GAP like layoutPos. */
(function(){
var M=window.MAP;
var COL={metal:'#C9CFD6',food:'#3DDC84',fuel:'#FF8A1F',parts:'#F2F1EC',people:'#FFD23F',red:'#FF2A1A',earth:'#4FA3FF',ink:'#F2F1EC',mid:'#9C9B95',dim:'#5E5D58',bg:'#0B0B0C',yel:'#FFD23F'};
var KCOL={mine:COL.metal,farm:COL.food,well:COL.fuel,works:COL.parts};
var CLSCOL={courier:'#45D4E8',hauler:'#FF6FB5',freighter:'#F2F1EC'};
var KNAME={mine:'MINE · METAL',farm:'FARM · FOOD',well:'WELL · FUEL',works:'WORKS · PARTS'};
function hash(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619) } return ((h>>>0)%10000)/10000 }

/* ---- layout: circles, pushed apart ---- */
var W=M.worlds.map(function(w){ var R=M.sectors[w.sec].r; return {w:w,x:Math.cos(w.ang)*R,z:Math.sin(w.ang)*R} });
for(var it=0;it<40;it++){ var moved=false;
  for(var i=0;i<W.length;i++) for(var j=i+1;j<W.length;j++){ var a=W[i],b=W[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||0.01;
    if(d<28){ var k=(28-d)/2/d; a.x-=dx*k; a.z-=dz*k; b.x+=dx*k; b.z+=dz*k; moved=true } }
  if(!moved) break }
var BY={}; W.forEach(function(o){ var w=o.w; w.px=o.x; w.pz=o.z; w.h=0; w.seed=hash(w.id); BY[w.id]=w });
var OUTER=M.sectors[M.sectors.length-1].r;
var routes=[]; M.worlds.forEach(function(w){ if(w.on&&w.line) routes.push({a:w.line,b:w.id,kind:w.kind}) });
function nodePos(id){ if(id==='earth') return [0,0,0]; var w=BY[id]; return w?[w.px,w.h,w.pz]:null }

/* ---- matrices (column-major, like GL) ---- */
function persp(fov,asp,n,f){ var t=1/Math.tan(fov/2), nf=1/(n-f); return [t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)*nf,-1, 0,0,2*f*n*nf,0] }
function lookAt(e,c,u){ var z=norm(sub(e,c)), x=norm(cross(u,z)), y=cross(z,x);
  return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -dot(x,e),-dot(y,e),-dot(z,e),1] }
function mul(a,b){ var o=new Array(16); for(var c=0;c<4;c++) for(var r=0;r<4;r++){ var s=0; for(var k=0;k<4;k++) s+=a[k*4+r]*b[c*4+k]; o[c*4+r]=s } return o }
function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]] } function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2] }
function cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]] } function norm(a){ var l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l] }

/* ---- the camera: a target on the plane, yaw, pitch (90° = straight down, as the game's chart), distance ---- */
var cam={tx:0,tz:30,yaw:0,pitch:52,dist:1700,fov:38,minPitch:12,maxPitch:89.5,minDist:260,maxDist:7000};
/* the whole chart in the frame: a narrow (phone) screen backs the camera off until the outer ring fits across */
function fitDist(base){ var a=innerWidth/innerHeight, th=Math.tan(cam.fov*Math.PI/360)*a; return Math.max(base,(OUTER+90)/th) }
var view={W:1,H:1,V:null,P:null,VP:null,eye:null};
function update(Wd,Ht){ view.W=Wd; view.H=Ht;
  var ph=cam.pitch*Math.PI/180, th=cam.yaw*Math.PI/180;
  var e=[cam.tx+cam.dist*Math.cos(ph)*Math.sin(th), cam.dist*Math.sin(ph), cam.tz+cam.dist*Math.cos(ph)*Math.cos(th)];
  var up=cam.pitch>89?[-Math.sin(th),0,-Math.cos(th)]:[0,1,0];
  view.eye=e; view.V=lookAt(e,[cam.tx,0,cam.tz],up); view.P=persp(cam.fov*Math.PI/180,Wd/Ht,20,20000); view.VP=mul(view.P,view.V) }
function project(p){ var m=view.VP, x=p[0],y=p[1],z=p[2];
  var cx=m[0]*x+m[4]*y+m[8]*z+m[12], cy=m[1]*x+m[5]*y+m[9]*z+m[13], cw=m[3]*x+m[7]*y+m[11]*z+m[15];
  if(cw<=1) return null; return {x:(cx/cw+1)/2*view.W, y:(1-cy/cw)/2*view.H, w:cw} }
function pxPer(w){ return view.H/(2*w*Math.tan(cam.fov*Math.PI/360)) }   // screen px per world unit at clip w (= view depth)

/* ---- input: drag = turn, right drag / shift / two fingers = move, wheel / pinch = zoom, a tap = pick ---- */
var ptrs={}, gest=null, onChange=function(){}, onPick=function(){}, el=null;
function bind(target,o){ el=target; onChange=o.change||onChange; onPick=o.pick||onPick;
  el.addEventListener('contextmenu',function(e){ e.preventDefault() });
  el.addEventListener('wheel',function(e){ e.preventDefault(); zoom(e.deltaY>0?1.12:0.89) },{passive:false});
  el.addEventListener('pointerdown',function(e){ ptrs[e.pointerId]={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t:e.target};
    gest={moved:false,pan:e.button===2||e.shiftKey,n:Object.keys(ptrs).length,target:e.target}; pinch0=null });
  window.addEventListener('pointermove',function(e){ var p=ptrs[e.pointerId]; if(!p) return;
    var dx=e.clientX-p.x, dy=e.clientY-p.y; p.x=e.clientX; p.y=e.clientY;
    if(!gest.moved&&Math.abs(e.clientX-p.x0)+Math.abs(e.clientY-p.y0)<6) return; gest.moved=true;
    var ids=Object.keys(ptrs);
    if(ids.length>=2){ var a=ptrs[ids[0]], b=ptrs[ids[1]], d=Math.hypot(a.x-b.x,a.y-b.y);
      if(pinch0) zoom(pinch0/d); pinch0=d; pan(dx/2,dy/2); return }
    if(gest.pan) pan(dx,dy); else turn(dx,dy) });
  function up(e){ var p=ptrs[e.pointerId]; if(!p) return; delete ptrs[e.pointerId];
    if(gest&&!gest.moved&&!Object.keys(ptrs).length){ var r=el.getBoundingClientRect(); onPick(e.clientX-r.left,e.clientY-r.top,p.t) }
    if(!Object.keys(ptrs).length) gest=null; pinch0=null }
  window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);
}
var pinch0=null, anim=null;
function turn(dx,dy){ cam.yaw-=dx*0.25; cam.pitch=Math.max(cam.minPitch,Math.min(cam.maxPitch,cam.pitch+dy*0.25)); onChange() }
function pan(dx,dy){ var s=1/pxPer(cam.dist), th=cam.yaw*Math.PI/180, sp=Math.max(0.35,Math.sin(cam.pitch*Math.PI/180));
  cam.tx-=(dx*Math.cos(th)+dy*Math.sin(th)/sp)*s; cam.tz-=(-dx*Math.sin(th)+dy*Math.cos(th)/sp)*s;
  var r=Math.hypot(cam.tx,cam.tz), lim=OUTER+200; if(r>lim){ cam.tx*=lim/r; cam.tz*=lim/r } onChange() }
function zoom(f){ cam.dist=Math.max(cam.minDist,Math.min(cam.maxDist,cam.dist*f)); onChange() }
function goTo(o,ms){ var from={}, k; for(k in o) from[k]=cam[k]; var t0=performance.now(); ms=ms||600;
  anim=function(now){ var u=Math.min(1,(now-t0)/ms), e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2; for(k in o) cam[k]=from[k]+(o[k]-from[k])*e; onChange(); if(u>=1) anim=null } }
function step(now){ if(anim) anim(now) }

/* ---- picking by projection: the nearest world centre under the finger ---- */
function pick(x,y,rad){ var best=null, bd=1e9;
  M.worlds.forEach(function(w){ var s=project([w.px,w.h,w.pz]); if(!s) return; var d=Math.hypot(s.x-x,s.y-y), lim=Math.max(16,(rad||10)*pxPer(s.w)+8);
    if(d<lim&&d<bd){ bd=d; best=w } });
  if(!best){ var e=project([0,0,0]); if(e&&Math.hypot(e.x-x,e.y-y)<Math.max(20,22*pxPer(e.w))) best='earth' }
  return best }

/* ---- the chrome: title, buttons, info panel ---- */
function chrome(title,sub){
  var d=document.createElement('div'); d.className='chrome';
  d.innerHTML='<div class="ttl"><b>'+title+'</b><span>'+sub+'</span></div>'+
    '<div class="btns"><button data-v="top">TOP</button><button data-v="tilt">TILT</button><button data-v="low">LOW</button><a href="index.html">ALL DRAFTS</a></div>'+
    '<div class="info" id="info">TAP A WORLD · DRAG TO TURN · RIGHT DRAG / TWO FINGERS TO MOVE · WHEEL / PINCH TO ZOOM</div>'+
    '<div class="meta">SEED '+M.seed+' · YEAR '+M.year+' · '+M.worlds.filter(function(w){return w.on}).length+' OF '+M.worlds.length+' WORLDS SETTLED · '+M.ships.length+' HULLS IN FLIGHT</div>';
  document.body.appendChild(d); cam.dist=fitDist(cam.dist);
  d.querySelector('.btns').addEventListener('click',function(e){ var v=e.target.dataset.v; if(!v) return;
    if(v==='top') goTo({pitch:89.5,yaw:0,dist:fitDist(1500),tx:0,tz:0});
    if(v==='tilt') goTo({pitch:52,yaw:0,dist:fitDist(1700),tx:0,tz:30});
    if(v==='low') goTo({pitch:20,yaw:cam.yaw-30,dist:1150,tx:0,tz:0}) });
}
var SEL=null;
function select(w){ SEL=w; var i=document.getElementById('info'); if(!i) return;
  if(!w){ i.innerHTML='TAP A WORLD · DRAG TO TURN · RIGHT DRAG / TWO FINGERS TO MOVE · WHEEL / PINCH TO ZOOM'; i.className='info'; return }
  if(w==='earth'){ i.innerHTML='<b style="color:'+COL.earth+'">EARTH</b><span>'+routes.filter(function(r){return r.a==='earth'}).length+' LINES HOME</span>'; i.className='info on'; return }
  var st=w.on?((w.hub?'HUB · ':'')+'POP '+w.pop+' · LINE → '+(w.line==='earth'?'EARTH':(BY[w.line]?BY[w.line].name.toUpperCase():w.line))):(w.ghost?'ABANDONED':'FREE');
  i.innerHTML='<b style="color:'+(w.on?KCOL[w.kind]:COL.mid)+'">'+w.name.toUpperCase()+'</b><span>'+KNAME[w.kind]+' · RING '+(w.sec+1)+' · '+st+'</span>'; i.className='info on' }
function stars(cv){ var x=cv.getContext('2d'), r=hash('stars'), s=1; cv.width=innerWidth; cv.height=innerHeight;
  x.fillStyle=COL.bg; x.fillRect(0,0,cv.width,cv.height);
  for(var i=0;i<260;i++){ s=(s*16807)%2147483647; var a=s/2147483647; s=(s*16807)%2147483647; var b=s/2147483647; s=(s*16807)%2147483647; var q=s/2147483647;
    x.fillStyle='rgba(242,241,236,'+(0.06+q*0.22).toFixed(2)+')'; x.fillRect(a*cv.width,b*cv.height,q>0.93?1.6:1,q>0.93?1.6:1) } }
/* ships: a hull's place on its leg (it moves on, the run's own phase is its start) */
function shipAt(s,t){ var f=(s.f+t*0.035)%1; return f }

window.M3={M:M,COL:COL,KCOL:KCOL,CLSCOL:CLSCOL,BY:BY,routes:routes,OUTER:OUTER,nodePos:nodePos,cam:cam,view:view,update:update,project:project,pxPer:pxPer,
  bind:bind,goTo:goTo,step:step,pick:pick,chrome:chrome,select:select,sel:function(){return SEL},stars:stars,shipAt:shipAt,hash:hash,mul:mul};
})();
