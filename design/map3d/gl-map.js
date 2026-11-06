/* map3d/gl-map.js — the WebGL2 map of drafts A and C: the plane (hex grid, rings, lobes) and the worlds as lit spheres in WebGL2,
   lines, hulls and names on a 2D canvas above it. GLMAP({pins:true}) lifts the worlds on stems (draft C). */
function GLMAP(opt){ opt=opt||{};
var C=M3, M=C.M, cam=C.cam;
var bg=document.getElementById('bg'), cv=document.getElementById('stage'), ov=document.getElementById('ov');
C.stars(bg); addEventListener('resize',function(){ C.stars(bg) });
if(opt.pins){ M.worlds.forEach(function(w){ w.h=26+w.seed*70 }) }
var gl=null; try{ gl=cv.getContext('webgl2',{antialias:true,premultipliedAlpha:true,alpha:true}) }catch(e){}
if(!gl){ var n=document.querySelector('.nogl'); n.style.display='flex'; return }

function sh(t,s){ var o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o }
function prog(v,f){ var p=gl.createProgram(); gl.attachShader(p,sh(gl.VERTEX_SHADER,v)); gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f)); gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); var u={}, n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(var i=0;i<n;i++){ var a=gl.getActiveUniform(p,i), nm=a.name.replace(/\[0\]$/,''); u[nm]=gl.getUniformLocation(p,a.name) } p.u=u; return p }

var PV='#version 300 es\nlayout(location=0) in vec2 aP; uniform mat4 uVP; out vec2 vP; void main(){ vP=aP; gl_Position=uVP*vec4(aP.x,0.,aP.y,1.); }';
var PF='#version 300 es\nprecision highp float; in vec2 vP; out vec4 o; uniform float uR[8]; uniform int uN; uniform float uOuter;\n'+
 'float hexD(vec2 p){ p=abs(p); return max(dot(p,normalize(vec2(1.,1.732))),p.x); }\n'+
 'void main(){ float d=length(vP); vec2 uv=vP/46.; vec2 r=vec2(1.,1.732), h=r*.5; vec2 a=mod(uv,r)-h, b=mod(uv-h,r)-h; vec2 g=dot(a,a)<dot(b,b)?a:b;\n'+
 ' float e=.5-hexD(g); float fw=fwidth(e); float hx=1.-smoothstep(0.,fw*1.3,e); float fade=smoothstep(uOuter+300.,uOuter*.25,d);\n'+
 ' vec3 c=vec3(0.); float al=0.; float v=hx*.075*fade; c+=vec3(.95,.94,.92)*v; al+=v; float ang=atan(vP.y,vP.x);\n'+
 ' for(int i=0;i<8;i++){ if(i>=uN) break; float ld=abs(d-uR[i]); float aw=fwidth(d); float ln=1.-smoothstep(aw*.5,aw*1.6,ld); float dash=step(.55,fract(ang*uR[i]/7.)); v=ln*dash*.34; c+=vec3(.95,.94,.92)*v; al+=v; }\n'+
 ' for(int i=0;i<6;i++){ float t=-2.0944+float(i)*1.0472; vec2 dr=vec2(cos(t),sin(t)); float al2=dot(vP,dr); if(al2<34.||al2>uOuter+44.) continue;\n'+
 '  float pd=abs(vP.x*dr.y-vP.y*dr.x); float aw=fwidth(pd); float ln=1.-smoothstep(aw*.5,aw*1.6,pd); float dash=step(.7,fract(al2/7.)); v=ln*dash*.3; c+=vec3(.6,.59,.56)*v; al+=v; }\n'+
 ' float gw=exp(-d/80.)*.16; c+=vec3(1.,.82,.25)*gw; al+=gw; o=vec4(c,clamp(al,0.,1.)); }';
var SV='#version 300 es\nlayout(location=0) in vec2 aC; layout(location=1) in vec4 aPos; layout(location=2) in vec4 aCol;\n'+
 'uniform mat4 uV,uP; uniform float uPx; out vec2 vUV; out vec3 vL; out vec4 vCol;\n'+
 'void main(){ vec4 vp=uV*vec4(aPos.xyz,1.); bool e=aCol.a>2.5; float r=max(aPos.w,(e?14.:8.5)*uPx*(-vp.z)); float s=e?1.5:1.06;\n'+
 ' vp.xy+=aC*r*s; vUV=aC*s; gl_Position=uP*vp; vL=normalize(mat3(uV)*(e?vec3(-.6,.75,.35):(vec3(0.,30.,0.)-aPos.xyz))); vCol=aCol; }';
var SF='#version 300 es\nprecision highp float; in vec2 vUV; in vec3 vL; in vec4 vCol; out vec4 o; uniform float uT;\n'+
 'void main(){ float r2=dot(vUV,vUV); float m=vCol.a; float fw=fwidth(r2);\n'+
 ' if(r2>1.){ if(m>2.5&&r2<2.25){ float h=(2.25-r2)/1.25; h=h*h*.5; o=vec4(vec3(.31,.64,1.)*h,h); return; } discard; }\n'+
 ' float edge=1.-smoothstep(1.-fw*1.5,1.,r2); vec3 n=vec3(vUV,sqrt(1.-r2)); float df=max(dot(n,vL),0.); float rim=pow(1.-n.z,3.); vec3 c=vCol.rgb, col;\n'+
 ' if(m>.5&&m<1.5) col=vec3(.06)+c*.14*(.4+df)+c*rim*.6;\n'+
 ' else if(m>1.5&&m<2.5) col=vec3(.09)*(.3+df*.7)+vec3(.2)*rim;\n'+
 ' else if(m>2.5){ float lat=asin(n.y), lon=atan(n.x,n.z)+uT*.15; col=c*(.16+.9*df); float g=smoothstep(.93,1.,abs(cos(lat*5.)))+smoothstep(.95,1.,abs(cos(lon*4.))); col+=vec3(.6,.8,1.)*g*.35*(.3+df)+vec3(.5,.75,1.)*rim*.7; }\n'+
 ' else col=c*(.30+.78*df)+c*rim*.35;\n'+
 ' o=vec4(col*edge,edge); }';
var pP=prog(PV,PF), pS=prog(SV,SF);
var L=4000, qb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,qb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-L,-L,L,-L,-L,L,L,L]),gl.STATIC_DRAW);
var vaP=gl.createVertexArray(); gl.bindVertexArray(vaP); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
var cb=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,cb); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
function hex(c){ return [parseInt(c.slice(1,3),16)/255,parseInt(c.slice(3,5),16)/255,parseInt(c.slice(5,7),16)/255] }
var inst=[]; M.worlds.forEach(function(w){ var k=hex(C.KCOL[w.kind]); inst.push(w.px,w.h,w.pz,w.on?12:9, k[0],k[1],k[2], w.on?0:(w.ghost?2:1)) });
var e3=hex(C.COL.earth); inst.push(0,0,0,24, e3[0],e3[1],e3[2],3);
var NI=inst.length/8, ib=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,ib); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inst),gl.STATIC_DRAW);
var vaS=gl.createVertexArray(); gl.bindVertexArray(vaS);
gl.bindBuffer(gl.ARRAY_BUFFER,cb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
gl.bindBuffer(gl.ARRAY_BUFFER,ib); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,0); gl.vertexAttribDivisor(1,1);
gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16); gl.vertexAttribDivisor(2,1);
gl.bindVertexArray(null);
var RAD=M.sectors.map(function(s){ return s.r });

var ox=ov.getContext('2d'), dpr=1, dirty=true;
function size(){ dpr=Math.min(window.devicePixelRatio||1,2); var w=innerWidth, h=innerHeight;
  [cv,ov].forEach(function(c){ c.width=Math.round(w*dpr); c.height=Math.round(h*dpr) }) }
size(); addEventListener('resize',size);

/* the route of a line: an arc over the plane (A) or a straight stem-to-stem line (C) */
function curve(a,b,n){ var o=[], lift=opt.pins?0:Math.hypot(b[0]-a[0],b[2]-a[2])*0.16;
  for(var i=0;i<=n;i++){ var t=i/n, x=a[0]+(b[0]-a[0])*t, y=a[1]+(b[1]-a[1])*t+4*lift*t*(1-t), z=a[2]+(b[2]-a[2])*t; o.push([x,y,z]) } return o }
function shipPoly(x,y,ang,cls,s){ var n=cls==='courier'?3:(cls==='hauler'?4:6), r=s;
  ox.beginPath(); for(var i=0;i<n;i++){ var a=ang+Math.PI*2*i/n+(n===4?Math.PI/4:0); var px=x+Math.cos(a)*r*(i===0&&n===3?1.4:1), py=y+Math.sin(a)*r*(i===0&&n===3?1.4:1); i?ox.lineTo(px,py):ox.moveTo(px,py) } ox.closePath();
  ox.fillStyle=C.CLSCOL[cls]; ox.fill(); ox.beginPath(); ox.arc(x+Math.cos(ang)*r*1.25,y+Math.sin(ang)*r*1.25,1.8,0,7); ox.fillStyle=C.COL.yel; ox.fill() }

function frame(now){ C.step(now); var W=innerWidth, H=innerHeight; C.update(W,H); var t=now/1000;
  gl.viewport(0,0,cv.width,cv.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(pP); gl.uniformMatrix4fv(pP.u.uVP,false,C.view.VP); gl.uniform1fv(pP.u.uR,new Float32Array(RAD.concat([0,0,0,0,0,0,0,0]).slice(0,8)));
  gl.uniform1i(pP.u.uN,RAD.length); gl.uniform1f(pP.u.uOuter,C.OUTER); gl.disable(gl.DEPTH_TEST); gl.bindVertexArray(vaP); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.enable(gl.DEPTH_TEST); gl.useProgram(pS); gl.uniformMatrix4fv(pS.u.uV,false,C.view.V); gl.uniformMatrix4fv(pS.u.uP,false,C.view.P);
  gl.uniform1f(pS.u.uPx,2*Math.tan(cam.fov*Math.PI/360)/H); gl.uniform1f(pS.u.uT,t); gl.bindVertexArray(vaS); gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,NI);

  ox.setTransform(dpr,0,0,dpr,0,0); ox.clearRect(0,0,W,H); ox.lineCap='round';
  var scr={}; function S(id){ if(scr[id]!==undefined) return scr[id]; var p=C.nodePos(id); var s=p?C.project(p):null;
    if(s){ var w=id==='earth'?null:C.BY[id]; s.r=Math.max(id==='earth'?14:8.5,(id==='earth'?24:(w&&w.on?12:9))*C.pxPer(s.w)) } return scr[id]=s }
  // stems and their feet on the plane (C)
  if(opt.pins) M.worlds.forEach(function(w){ var top=S(w.id), ft=C.project([w.px,0,w.pz]); if(!top||!ft) return;
    ox.strokeStyle=w.on?'rgba(242,241,236,.45)':'rgba(156,155,149,.25)'; ox.lineWidth=1; ox.setLineDash([2,3]); ox.beginPath(); ox.moveTo(top.x,top.y+top.r); ox.lineTo(ft.x,ft.y); ox.stroke(); ox.setLineDash([]);
    ox.beginPath(); for(var i=0;i<=20;i++){ var a=i/20*Math.PI*2, q=C.project([w.px+Math.cos(a)*7,0,w.pz+Math.sin(a)*7]); if(q) i?ox.lineTo(q.x,q.y):ox.moveTo(q.x,q.y) }
    ox.strokeStyle=w.on?C.KCOL[w.kind]:'rgba(156,155,149,.4)'; ox.globalAlpha=.7; ox.stroke(); ox.globalAlpha=1 });
  // lines
  C.routes.forEach(function(r){ var a=C.nodePos(r.a), b=C.nodePos(r.b), sa=S(r.a), sb=S(r.b); if(!sa||!sb) return; var pts=curve(a,b,36);
    ox.beginPath(); var st=false; pts.forEach(function(p){ var q=C.project(p); if(!q) return; if(Math.hypot(q.x-sa.x,q.y-sa.y)<sa.r||Math.hypot(q.x-sb.x,q.y-sb.y)<sb.r){ st=false; return }
      st?ox.lineTo(q.x,q.y):ox.moveTo(q.x,q.y); st=true });
    ox.strokeStyle=C.KCOL[r.kind]; ox.globalAlpha=.5; ox.lineWidth=1.6; ox.stroke(); ox.globalAlpha=1 });
  // hulls in flight
  M.ships.forEach(function(s){ var a=C.nodePos(s.from), b=C.nodePos(s.to); if(!a||!b) return; var f=C.shipAt(s,t), pts=curve(a,b,60), i=Math.min(59,Math.floor(f*60));
    var p=C.project(pts[i]), q=C.project(pts[i+1]); if(!p||!q) return; shipPoly(p.x,p.y,Math.atan2(q.y-p.y,q.x-p.x),s.cls,5.5) });
  // free worlds: the dashed rim of the game; the chosen one: a ring
  var boxes=[], sel=C.sel();
  M.worlds.forEach(function(w){ var s=S(w.id); if(!s) return;
    if(!w.on&&!w.ghost){ ox.setLineDash([3,2.5]); ox.strokeStyle='rgba(156,155,149,.8)'; ox.lineWidth=1.2; ox.beginPath(); ox.arc(s.x,s.y,s.r+1,0,7); ox.stroke(); ox.setLineDash([]) }
    if(w.ghost){ ox.fillStyle=C.COL.dim; ox.font='13px '+getComputedStyle(document.body).fontFamily; ox.textAlign='center'; ox.fillText('×',s.x,s.y+4) }
    if(sel===w){ ox.strokeStyle=C.COL.yel; ox.lineWidth=2; ox.beginPath(); ox.arc(s.x,s.y,s.r+7,0,7); ox.stroke() } });
  // names, nearest first, never on each other
  var order=M.worlds.map(function(w){ return {w:w,s:S(w.id)} }).filter(function(o){ return o.s }).sort(function(a,b){ return (b.w.on-a.w.on)||(a.s.w-b.s.w) });
  var e=S('earth'); if(e){ boxes.push({x0:e.x-e.r,x1:e.x+e.r,y0:e.y-e.r,y1:e.y+e.r}); ox.font='600 11px "Geist Mono",monospace'; ox.textAlign='center'; ox.fillStyle=C.COL.earth; ox.fillText('EARTH',e.x,e.y+e.r*1.5+14);
    if(sel==='earth'){ ox.strokeStyle=C.COL.yel; ox.lineWidth=2; ox.beginPath(); ox.arc(e.x,e.y,e.r*1.5+5,0,7); ox.stroke() } }
  ox.font='10.5px "Geist Mono",monospace'; ox.textAlign='left';
  order.forEach(function(o){ var w=o.w, s=o.s, nm=w.name.toUpperCase(), tw=ox.measureText(nm).width, fade=Math.max(.35,Math.min(1,2600/s.w));
    var cands=[[s.x+s.r+5,s.y-4],[s.x-s.r-5-tw,s.y-4],[s.x-tw/2,s.y-s.r-8],[s.x-tw/2,s.y+s.r+14]], ok=null;
    for(var i=0;i<cands.length&&!ok;i++){ var b={x0:cands[i][0]-2,x1:cands[i][0]+tw+2,y0:cands[i][1]-10,y1:cands[i][1]+3};
      if(!boxes.some(function(q){ return b.x0<q.x1&&q.x0<b.x1&&b.y0<q.y1&&q.y0<b.y1 })) ok=b }
    if(!ok) return; boxes.push(ok); ox.globalAlpha=fade*(w.ghost?.5:1); ox.fillStyle=w.on?C.COL.ink:C.COL.mid; ox.fillText(nm,ok.x0+2,ok.y1-3); ox.globalAlpha=1 });
  // ring names on the near side of each ring
  ox.font='9px "Geist Mono",monospace'; ox.fillStyle=C.COL.dim; ox.textAlign='center'; var th=cam.yaw*Math.PI/180;
  M.sectors.forEach(function(sc){ var q=C.project([Math.sin(th)*sc.r,0,Math.cos(th)*sc.r]); if(q) ox.fillText(sc.name,q.x,q.y+12) });
  requestAnimationFrame(frame) }
C.bind(ov,{pick:function(x,y){ C.select(C.pick(x,y,9)) }});
requestAnimationFrame(frame);
window.__ready=true;
}
