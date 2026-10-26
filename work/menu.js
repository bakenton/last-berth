/* LAST BERTH — the main menu and the start-up terminal. v4.40 (Nikita 23–24.10: design/menu-v1.html variant 5 — the hex relief
   in 3D, a dive past the edge of the field into space, then the terminal of HELM waking the base up, design/INTRO-DRAFT.md).
   No game rules here: ui.js opens it (LBMENU.open) and hands it the texts (the UI table, mn_* and tm_*), the save on record
   and what each item does. The page stays one file: the scene is drawn in WebGL2 (a 2D canvas when there is none), the sound
   is made in Web Audio after the first press. */
var LBMENU=(function(){
var O=null, ROOT=null, UI=null, CV=null, GLX=null, OPEN=false, SEL=1, BUSY=false;
function T(k,p){ return O.T(k,p) }
function snd(){ return !!(O&&O.sound()) }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function mark(){ return '<svg class="mmk" viewBox="0 0 120 120" aria-hidden="true"><use href="#i-markf"/></svg>' }
function phone(){ return !!(ROOT&&ROOT.classList.contains('phone')) }

/* ---------- the scene: a field of hex columns running at the camera (WebGL2), the stars over it ---------- */
var PAL={ink:'#F2F1EC',mid:'#9C9B95',dim:'#5E5D58',ppl:'#FFD23F',earth:'#4FA3FF',food:'#3DDC84',fuel:'#FF8A1F',metal:'#C9CFD6',red:'#FF2A1A',ark:'#B48CFF',bg:'#0b0b0c'};
function rgba(hex,a){ var n=parseInt(hex.slice(1),16); return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')' }
function rng(s){ return function(){ s=(s*1664525+1013904223)%4294967296; return s/4294967296 } }
function hsh(n){ n=Math.sin(n)*43758.5453; return n-Math.floor(n) }
function vn3(x,y,z){ var xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z), xf=x-xi, yf=y-yi, zf=z-zi, f=function(a){ return a*a*(3-2*a) }, u=f(xf), v=f(yf), w=f(zf);
  function h(i,j,k){ return hsh(i*157.3+j*113.7+k*271.9) }
  var a=h(xi,yi,zi), b=h(xi+1,yi,zi), c=h(xi,yi+1,zi), d=h(xi+1,yi+1,zi), e=h(xi,yi,zi+1), f2=h(xi+1,yi,zi+1), g=h(xi,yi+1,zi+1), hh=h(xi+1,yi+1,zi+1);
  return (a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*(1-w)+(e+(f2-e)*u+(g-e)*v+(e-f2-g+hh)*u*v)*w }
function skyStars(c,w,h,t,st,yMax,n){ if(st.reset||!st.sk||st.skn!==n){ var rg=rng(99); st.sk=[]; st.skn=n; for(var i=0;i<n;i++) st.sk.push([rg(),rg(),.5+rg()*1.2,rg()*6.28,rg()]) }
  for(var j=0;j<st.sk.length;j++){ var s=st.sk[j], y=s[1]*yMax; c.fillStyle=(s[4]<.15?'rgba(255,226,170,':'rgba(220,230,255,')+(.18+.5*(.5+.5*Math.sin(t*(.4+s[2]*.4)+s[3]))*(1-y/yMax*.5))+')'; c.fillRect(s[0]*w,y,s[2]*h/760,s[2]*h/760) } }
function fbm2(x,y,z){ return (vn3(x,y,z)*.55+vn3(x*2.1+7.3,y*2.1+1.9,z*1.3)*.3+vn3(x*4.3+3.1,y*4.3+8.8,z*1.7)*.15) }
/* the same field flat, for a browser without WebGL2. hex ground in perspective: the world is a hexagonal field, the camera hangs low above it */
function hexGround(c,w,h,t,st,ph,mode){ var u=h/760, hy=h*.34+PTR.y*h*.012, f=h*.9, cx=w/2+PTR.x*h*.035, R=ph?.32:.29, dz=1.5*R, dx=Math.sqrt(3)*R, Hc=2.1, zs=t*.22, z0=2.2, z1=ph?14:22, jmin=Math.floor((zs+z0)/dz)-1, jmax=Math.ceil((zs+z1)/dz)+1, j, i, k;
  c.fillStyle=PAL.bg; c.fillRect(0,0,w,h); skyStars(c,w,h,t,st,hy*1.03,ph?80:140);
  var g=c.createRadialGradient(cx,hy,0,cx,hy,h*.55); g.addColorStop(0,'rgba(255,200,90,.16)'); g.addColorStop(.4,'rgba(255,200,90,.05)'); g.addColorStop(1,'rgba(255,200,90,0)'); c.fillStyle=g; c.fillRect(0,0,w,hy+h*.1);
  var hz=c.createLinearGradient(0,hy-h*.2,0,hy+h*.2); hz.addColorStop(0,'rgba(255,200,90,0)'); hz.addColorStop(.5,'rgba(255,200,90,.075)'); hz.addColorStop(1,'rgba(255,200,90,0)'); c.fillStyle=hz; c.fillRect(0,hy-h*.2,w,h*.4);
  var xmax=(w/2/f)*z1+2, imax=Math.ceil(xmax/dx)+1;
  for(j=jmax;j>=jmin;j--){ var Z=j*dz-zs, fog=Math.max(0,Math.min(1,(Z-2)/(z1-2))); if(Z<z0||Z>z1) continue;
    for(i=-imax;i<=imax;i++){ var X=(i+((j&1)?.5:0))*dx, n=fbm2(i*.23+((j&1)?.12:0),j*.23,t*.04+3), hgt=mode==='plain'?0:Math.max(0,(n-.40))*(ph?3.4:4.2)*(mode==='mix'?Math.max(0,Math.min(1,(Z-(ph?5:7))/(ph?3:4))):1), rel=hgt>.03||mode==='relief';
      var wave=Math.max(0,Math.sin(Z*.7+Math.abs(X)*.18-t*1.3)); wave=Math.pow(wave,mode==='relief'?6:10);
      var sc=[]; for(k=0;k<6;k++){ var a=(30+60*k)*Math.PI/180, wx=X+Math.cos(a)*R*.94, wz=Z+Math.sin(a)*R*.94, zz=Math.max(.3,wz), ff=f/zz; sc.push([cx+wx*ff,hy+(Hc-hgt)*ff,hy+Hc*ff]) }
      if(sc[0][0]<-60||sc[3][0]>w+60) { if(Math.max(sc[0][0],sc[3][0])<-60||Math.min(sc[0][0],sc[3][0])>w+60) continue }
      var vis=Math.max(0,1-Math.pow(fog,.8)), pk=Math.min(1,hgt/(ph?1.2:1.5)); if(vis<.03) continue;
      if(rel&&hgt>.02&&vis>.3){ for(k=0;k<6;k++){ var a1=(60+60*k)*Math.PI/180, nx=Math.cos(a1), nz=Math.sin(a1); if(nx*(-X)+nz*(-Z)<=0) continue; var p0=sc[k], p1=sc[(k+1)%6];
          c.fillStyle='rgba('+(16+Math.round(pk*40))+','+(16+Math.round(pk*30))+','+(18+Math.round(pk*8))+','+vis+')'; c.beginPath(); c.moveTo(p0[0],p0[1]); c.lineTo(p1[0],p1[1]); c.lineTo(p1[0],p1[2]); c.lineTo(p0[0],p0[2]); c.closePath(); c.fill(); c.strokeStyle='rgba(242,241,236,'+(.06*vis)+')'; c.lineWidth=1; c.stroke() } }
      c.beginPath(); for(k=0;k<6;k++){ if(k) c.lineTo(sc[k][0],sc[k][1]); else c.moveTo(sc[k][0],sc[k][1]) } c.closePath();
      if(rel){ c.fillStyle='rgba('+(13+Math.round(pk*38+wave*14))+','+(14+Math.round(pk*32+wave*10))+','+(16+Math.round(pk*12))+','+vis+')'; c.fill() } else if(wave>.05){ c.fillStyle=rgba(PAL.ppl,.18*wave*vis); c.fill() }
      var edge=rel?(pk>.5?rgba(PAL.ppl,(.15+.5*pk+.4*wave)*vis):'rgba(242,241,236,'+((.09+.2*wave)*vis)+')'):(wave>.05?rgba(PAL.ppl,(.2+.75*wave)*vis):'rgba(242,241,236,'+(.12*vis)+')');
      c.strokeStyle=edge; c.lineWidth=Math.max(1,u*(1+wave*.8)); c.stroke() } }
 }
function hexRelief2D(c,w,h,t,st,ph){ hexGround(c,w,h,t,st,ph,'relief') }

/* the camera leans after the pointer; a new item flashes the field (PULSE) */
var PTR={x:0,y:0,tx:0,ty:0}, PULSE={at:-1e9};
function ptrMove(e){ PTR.tx=(e.clientX/innerWidth-.5)*2; PTR.ty=(e.clientY/innerHeight-.5)*2 }
function ptrLoop(){ if(!OPEN) return; PTR.x+=(PTR.tx-PTR.x)*.05; PTR.y+=(PTR.ty-PTR.y)*.05; requestAnimationFrame(ptrLoop) }
function pulseAge(){ return (performance.now()-PULSE.at)/1000 }
/* the scene runs while its canvas is in the page and rests under the terminal; without WebGL2 the same field is drawn flat (no dive then) */
function sceneStart(cv){ var gl=null, sc=null, t0=performance.now();
  try{ gl=cv.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'}) }catch(e){ gl=null }
  if(gl) sc=hexScene(gl,phone());
  if(sc){ GLX=gl; var dpr=Math.min(window.devicePixelRatio||1,1.5);
    cv.addEventListener('webglcontextlost',function(e){ e.preventDefault(); if(OPEN&&cv.isConnected){ GLX=null; flatStart(cv,t0) } });   // the GPU was reset: the flat field, no dive
    (function frame(){ if(!cv.isConnected) return; if(!document.hidden&&!BT.ov){ var w=Math.max(2,Math.round(cv.clientWidth*dpr)), h=Math.max(2,Math.round(cv.clientHeight*dpr)); if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h } sc.draw((performance.now()-t0)/1000+4,w,h,phone()) }
      if(window.__GLSLOW) setTimeout(frame,window.__GLSLOW); else requestAnimationFrame(frame) })();   // __GLSLOW: the scenarios slow the frames down in a browser without a GPU
    return }
  flatStart(cv,t0) }
function flatStart(cv,t0){ var c2=document.createElement('canvas'); c2.className='mcv'; cv.parentNode.replaceChild(c2,cv); CV=c2;
  var ctx=c2.getContext('2d'), st={}, lastF=0, dpr2=Math.min(window.devicePixelRatio||1,1.25); GLX=null; if(!ctx) return;
  (function frame(){ if(!c2.isConnected) return; var nowF=performance.now(); if(nowF-lastF>=32&&!document.hidden&&!BT.ov){ lastF=nowF;
      var w=Math.max(2,Math.round(c2.clientWidth*dpr2)), h=Math.max(2,Math.round(c2.clientHeight*dpr2)); if(c2.width!==w||c2.height!==h){ c2.width=w; c2.height=h; st.reset=true }
      hexRelief2D(ctx,w,h,(nowF-t0)/1000,st,phone()); st.reset=false }
    requestAnimationFrame(frame) })() }

/* ---------- the menu: what the game can do at its start (continue the autosave, a new run, a save file, language, sound) ---------- */
function items(){ var s=O.save(); return [
  {id:'cont',label:T('mn_cont'),sub:s?T('mn_contSub',{y:s.y,w:s.w}):T('mn_empty'),off:!s},
  {id:'new',label:T('mn_new'),sub:''},
  {id:'load',label:T('mn_load'),sub:T('mn_loadSub')},
  {id:'lang',label:T('mn_lang'),sub:T('mn_langVal')},
  {id:'sound',label:T('mn_sound'),sub:snd()?T('mn_on'):T('mn_off')}] }
function firstOn(){ var I=items(); for(var i=0;i<I.length;i++) if(!I[i].off) return i; return 0 }
function drawUI(){ if(!UI) return; var I=items(); if(I[SEL]&&I[SEL].off) SEL=firstOn();
  UI.innerHTML='<div class="mtop">'+mark()+'<div class="mname">LAST BERTH</div><div class="mrun"><i></i></div></div>'+
    '<div class="msm">'+I.map(function(it,i){ return '<div class="mit'+(it.off?' off':'')+(i===SEL?' on':'')+'" data-i="'+i+'" data-id="'+it.id+'"><span class="l">'+esc(it.label)+'<span class="s">'+esc(it.sub)+'</span></span></div>' }).join('')+'<div class="mmsg" role="status"></div></div>'+
    '<button class="mtst" type="button" data-m="test">▶ '+esc(T('mn_test'))+'</button><div class="mver">v'+esc(O.v)+'</div>' }
function select(i){ if(i===SEL) return; SEL=i; PULSE.at=performance.now(); UI.querySelectorAll('.mit').forEach(function(e){ e.classList.toggle('on',+e.dataset.i===SEL) }) }
function act(i){ var it=items()[i]; if(!it||it.off||BUSY) return;
  if(it.id==='new'){ diveThen(termPlay); return }
  if(it.id==='cont'){ diveThen(function(){ var why=O.cont(); if(why===true) fadeOut(); else { diveBack(); note(why) } }); return }
  if(it.id==='load'){ O.load(); return }
  if(it.id==='lang'){ O.setLang(O.lang()==='en'?'ru':'en'); drawUI(); return }
  if(it.id==='sound'){ O.setSound(!snd()); if(snd()) maStart(); maSet(); drawUI(); return } }
function test(){ if(BUSY) return; diveThen(function(){ O.test(); fadeOut() }) }
/* a word in the menu itself (a save that would not load): the game's toasts are under the menu */
var NOTE=null;
function note(txt){ var m=UI&&UI.querySelector('.mmsg'); if(!m) return; m.textContent=txt; m.classList.add('on'); clearTimeout(NOTE); NOTE=setTimeout(function(){ m.classList.remove('on') },5000) }

/* ---------- the dive: the camera speeds over the field, past its edge and into space; then black ---------- */
var DIVE={at:Infinity,back:-1e9}, DIVE_MS=4200;
function diveBack(){ DIVE.at=Infinity; DIVE.back=performance.now(); BUSY=false; ROOT.classList.remove('diving') }
function diveThen(fn){ if(BUSY) return; BUSY=true; if(!GLX){ fn(); return }
  maClick('select'); maTone(70,DIVE_MS/1000,.14,'sine',0,360); maTone(140,DIVE_MS/1000,.05,'triangle',.2,720);
  DIVE.at=performance.now(); ROOT.classList.add('diving'); setTimeout(function(){ if(OPEN&&DIVE.at!==Infinity) fn() },DIVE_MS) }
function smst(a,b,x){ var t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t) }

var HEX_VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aCell;
uniform float uT, uScroll, uAsp, uCamX, uCamH, uDive, uK, uFov, uPitch, uEdge;
uniform vec2 uGrid;
out vec3 vP; out vec2 vL; out float vH; out float vTop; out float vZ; out float vNear; out float vSide; out float vY; out float vEdge;
float h13(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ return vn(p)*.55+vn(p*2.1+vec3(7.3,1.9,3.3))*.3+vn(p*4.3+vec3(3.1,8.8,5.5))*.15; }
void main(){
  float R=uGrid.x, dz=uGrid.y, dx=1.7320508*R, z0=2.0;
  float rowF=uScroll/dz, rowAbs=aCell.y+floor(rowF), par=mod(rowAbs,2.0);
  float zf=z0+aCell.y*dz-fract(rowF)*dz;
  float X=(aCell.x+.5*par)*dx;
  float n=fbm(vec3(aCell.x*.23+par*.12, rowAbs*.23, uT*.04+3.));
  float hgt=max(0.,n-.40)*uK*smoothstep(2.6,7.5,zf);
  vec3 P=vec3(X+aPos.x*R, aPos.y*hgt, zf+aPos.z*R);
  /* the dive: the field ends at uEdge (distance ahead of the camera); the camera flies over that edge into space */
  vP=P; vL=aPos.xz/.94; vH=hgt; vTop=aNrm.y; vZ=P.z; vNear=smoothstep(z0-.3,z0+1.8,zf); vSide=aNrm.x; vY=aPos.y; vEdge=zf-uEdge;
  float vx=P.x-uCamX, vy=P.y-uCamH, vz=-P.z, f=1./tan(uFov*.5);
  float near=.1, far=80.;
  vec4 cp=vec4(f/uAsp*vx, f*vy, (far+near)/(near-far)*vz+2.*far*near/(near-far), -vz);
  cp.y+=(.32-uPitch)*cp.w;
  gl_Position=cp;
}`;
var HEX_FS=`#version 300 es
precision highp float;
in vec3 vP; in vec2 vL; in float vH; in float vTop; in float vZ; in float vNear; in float vSide; in float vY; in float vEdge;
uniform float uT, uPulse, uFade, uVoid;
out vec4 oC;
float hexd(vec2 p){ return max(abs(p.x),max(abs(p.x*.5+p.y*.8660254),abs(p.x*.5-p.y*.8660254)))/.8660254; }
void main(){
  if(vEdge>0.) discard;
  float rim=1.-smoothstep(0.,1.1,-vEdge);
  float z=vZ, fog=clamp((z-2.)/20.,0.,1.), vis=1.-pow(fog,.8);
  float pk=clamp(vH/1.55,0.,1.);
  float wave=pow(max(0.,sin(z*.65+abs(vP.x)*.16-uT*1.1)),9.);
  vec3 gold=vec3(1.,.8,.28), col;
  if(vTop>.5){
    float d=hexd(vL), edge=smoothstep(.78,.97,d), inner=1.-smoothstep(0.,.95,d);
    col=vec3(.040,.041,.047)+gold*(.06*pk+.10*wave+.06*uPulse)*(.6+.8*inner);
    col+=gold*edge*(.16+.95*pk+.9*wave+.7*uPulse)+vec3(.9)*edge*.07;
    col+=gold*pk*pk*.10*inner;
    col+=gold*rim*(.35*edge+.06);
  } else {
    float g=clamp(vY,0.,1.);
    float facing=.55+.45*abs(vSide);
    col=mix(vec3(.012,.012,.015), gold*(.10+.55*pk+.45*wave+.35*uPulse), pow(g,2.4))*facing;
    col+=vec3(.9)*smoothstep(.93,1.,g)*.05;
  }
  vec3 fogc=vec3(.082,.062,.033)*(1.-uVoid);
  col=mix(fogc,col,vis);
  col*=vNear*(1.-uFade); col*=mix(1.,.55,smoothstep(.0,.8,1.-vZ/9.)*step(vZ,9.));
  oC=vec4(col,1.);
}`;
var SKY_VS=`#version 300 es
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.-1.,0.,1.); }`;
var SKY_FS=`#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT,uFade,uHor,uPulse,uWarp,uSc,uVoid,uFly,uFz; out vec4 oC;
vec3 h33(vec3 p3){ p3=fract(p3*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yxz+33.33); return fract((p3.xxy+p3.yxx)*p3.zyx); }
void main(){
  vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y, dy=uv.y-uHor, warm=1.-uVoid; vec3 Hc=vec3(.082,.062,.033);
  vec3 col=vec3(.043,.043,.047)*warm;
  col+=vec3(1.,.78,.35)*(.045+.02*uPulse)*exp(-dy*dy*16.)*(.55+.45*exp(-pow((uv.x-.5)*asp*1.2,2.)))*warm;
  col=mix(col,Hc,exp(-abs(dy)*13.)*.92*warm);
  if(dy<0.){ col=mix(col,Hc,smoothstep(0.,-.03,dy)*warm); col*=mix(1.,.3,smoothstep(0.,-.4,dy)*warm); }
  /* in the void the stars fill the whole sky, below the old horizon too */
  if(dy>0.||uVoid>0.){
    for(int L=0;L<3;L++){ float s=(L==0)?34.:(L==1)?80.:160.; float th=(L==0)?.93:(L==1)?.95:.965; vec2 p=vec2(uv.x*asp,uv.y)*s+vec2(uT*.01*float(L+1),-uSc*(.5+.5*float(L))); vec2 g=floor(p), f=fract(p)-.5; vec3 hh=h33(vec3(g,float(L)*7.3));
      if(hh.x>th){ vec2 off=(hh.yz-.5)*.7; float d=length(vec2(f.x-off.x,(f.y-off.y)/(1.+uWarp*(6.+4.*float(L))))); float mag=(hh.x-th)/(1.-th); float rr=(L==0)?.07:(L==1)?.05:.035; float b=smoothstep(rr,0.,d)*(.35+.9*mag); b*=(.65+.35*sin(uT*(.6+hh.y*2.)+hh.z*40.))*(1.+uWarp*1.6); col+=b*mix(vec3(.75,.85,1.),vec3(1.,.9,.75),hh.z)*((L==0)?1.1:.65)*mix(smoothstep(0.,.14,dy),1.,uVoid); } }
  }
  /* flight: layers of stars come at the camera out of the vanishing point on the horizon, stretched along their path by the speed */
  if(uFly>0.){ vec2 q=(gl_FragCoord.xy-uRes*vec2(.5,uHor))/uRes.y; vec2 dir=normalize(q+1e-5);
    for(int i=0;i<5;i++){ float d=fract(float(i)*.2+uFz), sc=mix(26.,.7,d); vec2 p=q*sc+vec2(float(i)*17.3,float(i)*5.1), g=floor(p), f=fract(p)-.5; vec3 hh=h33(vec3(g,float(i)+11.));
      if(hh.x>.88){ vec2 o=f-(hh.yz-.5)*.6; float al=dot(o,dir), pe=dot(o,vec2(-dir.y,dir.x)); float r=length(vec2(al/(1.+uFly*5.*d),pe));
        col+=smoothstep(.035,0.,r)*smoothstep(0.,.3,d)*smoothstep(1.,.8,d)*uFly*1.4*mix(vec3(.8,.88,1.),vec3(1.,.88,.65),hh.z); } } }
  col*=1.-.35*pow(length((uv-.5)*vec2(1.,.9)),2.);
  col*=1.-uFade;
  oC=vec4(col,1.);
}`;
function glProg(gl,vs,fs){ function sh(t,s){ var o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){ console.error('shader: '+gl.getShaderInfoLog(o)); return null } return o }
  var a=sh(gl.VERTEX_SHADER,vs), b=sh(gl.FRAGMENT_SHADER,fs); if(!a||!b) return null; var p=gl.createProgram(); gl.attachShader(p,a); gl.attachShader(p,b); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)){ console.error('link: '+gl.getProgramInfoLog(p)); return null } return p }
function hexMesh(){ var P=[], N=[], k, a0, a1, R=.94;
  function v(x,y,z,nx,ny,nz){ P.push(x,y,z); N.push(nx,ny,nz) }
  for(k=0;k<6;k++){ a0=(30+60*k)*Math.PI/180; a1=(30+60*(k+1))*Math.PI/180; var x0=Math.cos(a0)*R, z0=Math.sin(a0)*R, x1=Math.cos(a1)*R, z1=Math.sin(a1)*R, am=(a0+a1)/2, nx=Math.cos(am), nz=Math.sin(am);
    v(0,1,0,0,1,0); v(x0,1,z0,0,1,0); v(x1,1,z1,0,1,0);
    v(x0,0,z0,nx,0,nz); v(x1,0,z1,nx,0,nz); v(x1,1,z1,nx,0,nz); v(x0,0,z0,nx,0,nz); v(x1,1,z1,nx,0,nz); v(x0,1,z0,nx,0,nz) }
  return {P:new Float32Array(P),N:new Float32Array(N),n:P.length/3} }

/* the scene; null when a shader does not compile (the flat field takes over) */
function hexScene(gl,ph){ var sky=glProg(gl,SKY_VS,SKY_FS), hex=glProg(gl,HEX_VS,HEX_FS); if(!sky||!hex) return null;
  var mesh=hexMesh(), R=.29, dz=1.5*R, dx=Math.sqrt(3)*R, rows=Math.ceil((22-2.0)/dz)+2, imax=Math.ceil(((ph?10:20))/dx), inst=[], i, j;
  for(j=0;j<rows;j++) for(i=-imax;i<=imax;i++) inst.push(i,j);
  var vao=gl.createVertexArray(); gl.bindVertexArray(vao);
  var b0=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b0); gl.bufferData(gl.ARRAY_BUFFER,mesh.P,gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
  var b1=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b1); gl.bufferData(gl.ARRAY_BUFFER,mesh.N,gl.STATIC_DRAW); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
  var b2=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b2); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inst),gl.STATIC_DRAW); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2,2,gl.FLOAT,false,0,0); gl.vertexAttribDivisor(2,1);
  var U=function(p,n){ return gl.getUniformLocation(p,n) }, nInst=inst.length/2, scroll=0, base=0, fz=0, last=null;
  return { draw:function(t,w,h,ph){ var dt=last===null?0:Math.min(.1,t-last); last=t; var da=(performance.now()-DIVE.at)/(DIVE_MS), dive=da>=0?Math.min(1,da):0, e=dive*dive*(3-2*dive), pa=pulseAge(), pulse=pa<1.3?(1-pa/1.3)*.8:0, bf=Math.max(0,1-(performance.now()-DIVE.back)/1000);
      /* the dive: the camera speeds up over the field (D, ahead of it the field now has an edge), flies past the edge at full speed (A of the dive),
         then goes on through space among oncoming stars while slowing (spd); the warm haze drains to black (vd), everything dims last (fade) */
      var A=.62, E0=18, dn=Math.min(1,dive/A), D=E0*dn*dn, spd=dive<A?dn:1-.7*smst(A,1,dive), edge=dive>0?E0+.6-D:1e4, vd=smst(.08,.5,dive), fade=Math.max(smst(.8,1,dive),bf);
      if(dive<=0) base+=dt*.28; scroll=base+D; fz+=dt*(dive>0?spd*1.1:0); pulse=Math.max(pulse,dive<A?.3*spd:0); gl.viewport(0,0,w,h); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.clearColor(.043,.043,.047,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(sky); gl.uniform2f(U(sky,'uRes'),w,h); gl.uniform1f(U(sky,'uT'),t); gl.uniform1f(U(sky,'uFade'),fade); gl.uniform1f(U(sky,'uHor'),.66); gl.uniform1f(U(sky,'uWarp'),0); gl.uniform1f(U(sky,'uSc'),0); gl.uniform1f(U(sky,'uVoid'),vd); gl.uniform1f(U(sky,'uFly'),dive>0?spd*smst(.12,.45,dive):0); gl.uniform1f(U(sky,'uFz'),fz); gl.uniform1f(U(sky,'uPulse'),pulse); gl.drawArrays(gl.TRIANGLES,0,3);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.useProgram(hex);
      gl.uniform1f(U(hex,'uT'),t); gl.uniform1f(U(hex,'uScroll'),scroll); gl.uniform1f(U(hex,'uAsp'),w/h); gl.uniform1f(U(hex,'uCamX'),PTR.x*1.1); gl.uniform1f(U(hex,'uCamH'),2.1+PTR.y*.18-e*.35); gl.uniform1f(U(hex,'uDive'),dive); gl.uniform1f(U(hex,'uPitch'),0); gl.uniform1f(U(hex,'uK'),ph?3.4:4.4); gl.uniform1f(U(hex,'uFov'),(1.0+.25*spd)*1.02); gl.uniform2f(U(hex,'uGrid'),R,dz); gl.uniform1f(U(hex,'uPulse'),pulse); gl.uniform1f(U(hex,'uFade'),fade); gl.uniform1f(U(hex,'uEdge'),edge); gl.uniform1f(U(hex,'uVoid'),vd);
      gl.bindVertexArray(vao); gl.drawArraysInstanced(gl.TRIANGLES,0,mesh.n,nInst) } } }


/* ---------- sound: the menu's low drone (ticks on hover, a soft chord on a choice), ducked under the terminal ---------- */
var MA={c:null,m:null,duck:false};
function maSet(){ if(!MA.c) return; MA.m.gain.setTargetAtTime((snd()&&!MA.duck)?.5:0,MA.c.currentTime,.35) }
function maStart(){ if(MA.c||!snd()) return; try{ var c=new (window.AudioContext||window.webkitAudioContext)(), m=c.createGain(), i; m.gain.value=0; m.connect(c.destination); MA.c=c; MA.m=m;
  var lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=190; lp.Q.value=.7; lp.connect(m);
  [[55,'sawtooth',.05],[55.35,'sawtooth',.05],[110.2,'sine',.05],[82.4,'triangle',.035]].forEach(function(o){ var os=c.createOscillator(), g=c.createGain(); os.type=o[1]; os.frequency.value=o[0]; g.gain.value=o[2]; os.connect(g); g.connect(lp); os.start() });
  var lf=c.createOscillator(), lg=c.createGain(); lf.frequency.value=.07; lg.gain.value=70; lf.connect(lg); lg.connect(lp.frequency); lf.start();
  var nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate), d=nb.getChannelData(0); for(i=0;i<d.length;i++) d[i]=Math.random()*2-1; var ns=c.createBufferSource(); ns.buffer=nb; ns.loop=true; var bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=420; bp.Q.value=.5; var ng=c.createGain(); ng.gain.value=.018; ns.connect(bp); bp.connect(ng); ng.connect(m); ns.start();
  MA.nb=nb; maSet() }catch(e){ MA.c=null } }
function maTone(f,dur,g,type,delay,slide){ if(!MA.c||!snd()||MA.duck) return; var c=MA.c, t=c.currentTime+(delay||0), o=c.createOscillator(), e=c.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+dur); e.gain.setValueAtTime(.0001,t); e.gain.exponentialRampToValueAtTime(g,t+.012); e.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(e); e.connect(MA.m); o.start(t); o.stop(t+dur+.05) }
function maClick(kind){ if(kind==='hover'){ maTone(1180,.07,.05,'sine') } else if(kind==='select'){ maTone(70,.5,.5,'sine',0,38); maTone(220,1.4,.07,'sine',.02); maTone(330,1.6,.05,'sine',.06); maTone(440,1.8,.03,'sine',.1) } }
function maDuck(on){ MA.duck=on; maSet() }
function maStop(){ var c=MA.c; MA.c=null; MA.duck=false; if(c){ try{ c.close() }catch(e){} } }

/* the terminal's sound: a fan, a 50 Hz buzz, a whining disk; it rises while the machine works and calms as the systems come on. Every system answers with its own sound */
function auStart(){ try{ if(!snd()||BT.au) return;
  var c=new (window.AudioContext||window.webkitAudioContext)(), m=c.createGain(), i, nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate), d=nb.getChannelData(0);
  for(i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  m.gain.value=0.8; m.connect(c.destination);
  var ns=c.createBufferSource(); ns.buffer=nb; ns.loop=true; var bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=360; bp.Q.value=.8; var fan=c.createGain(); fan.gain.value=0; ns.connect(bp); bp.connect(fan); fan.connect(m); ns.start();
  var hu=c.createOscillator(); hu.type='sawtooth'; hu.frequency.value=50; var hl=c.createBiquadFilter(); hl.type='lowpass'; hl.frequency.value=140; var hg=c.createGain(); hg.gain.value=0; hu.connect(hl); hl.connect(hg); hg.connect(m); hu.start();
  var wh=c.createOscillator(); wh.type='sine'; wh.frequency.value=70; var wg=c.createGain(); wg.gain.value=0; wh.connect(wg); wg.connect(m); wh.start();
  BT.au={c:c,m:m,nb:nb,bp:bp,fan:fan,hg:hg,wh:wh,wg:wg};
  var t=c.currentTime;
  var th=c.createOscillator(), tg=c.createGain(); th.frequency.value=64; tg.gain.setValueAtTime(.16,t); tg.gain.exponentialRampToValueAtTime(.0005,t+.3); th.connect(tg); tg.connect(m); th.start(t); th.stop(t+.35); auClick(.1);
  fan.gain.setTargetAtTime(.075,t+.1,.7); hg.gain.setTargetAtTime(.05,t+.1,.5);
  wh.frequency.setValueAtTime(48,t+.15); wh.frequency.exponentialRampToValueAtTime(118,t+2.2); wg.gain.setValueAtTime(0,t+.1); wg.gain.linearRampToValueAtTime(.05,t+1.4); wg.gain.linearRampToValueAtTime(.03,t+2.6);
 }catch(e){ console.error('audio',e); BT.au=null } }
function auLevel(){ var a=BT.au; if(!a) return; var t=a.c.currentTime, ns=BT.ns, w=BT.act;
  a.fan.gain.setTargetAtTime(.018+.04*ns+(w?BT.pf.fan:0),t,.25); a.bp.frequency.setTargetAtTime(w?BT.pf.bp:240,t,.35);
  a.hg.gain.setTargetAtTime(.022+.026*ns,t,.3); a.wg.gain.setTargetAtTime(.012+.02*ns+(w?.02:0),t,.25); a.wh.frequency.setTargetAtTime(w?BT.pf.wh:100-14*(1-ns),t,.5) }
function auClick(v){ var a=BT.au; if(!a) return; var c=a.c, s=c.createBufferSource(), g=c.createGain(), t=c.currentTime; s.buffer=a.nb; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0005,t+.018); s.connect(g); g.connect(a.m); s.start(t,Math.random()*1.5,.03) }
function auBeep(f,ms,vol){ var a=BT.au; if(!a) return; var c=a.c, o=c.createOscillator(), g=c.createGain(), t=c.currentTime, v=vol||.022; o.type='triangle'; o.frequency.value=f; g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(v,t+.012); g.gain.setValueAtTime(v,t+ms/1000); g.gain.exponentialRampToValueAtTime(.0005,t+ms/1000+.04); o.connect(g); g.connect(a.m); o.start(t); o.stop(t+ms/1000+.06) }
function auTone(type,f0,f1,dur,g,delay){ var a=BT.au; if(!a) return; var c=a.c, t=c.currentTime+(delay||0), o=c.createOscillator(), e=c.createGain();
  o.type=type; o.frequency.setValueAtTime(f0,t); if(f1!==f0) o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  e.gain.setValueAtTime(.0001,t); e.gain.exponentialRampToValueAtTime(g,t+Math.min(.03,dur/3)); e.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(e); e.connect(a.m); o.start(t); o.stop(t+dur+.05) }
function auNoise(f0,f1,dur,g,q,delay){ var a=BT.au; if(!a) return; var c=a.c, t=c.currentTime+(delay||0), s=c.createBufferSource(), b=c.createBiquadFilter(), e=c.createGain();
  s.buffer=a.nb; s.loop=true; b.type='bandpass'; b.Q.value=q||1.2; b.frequency.setValueAtTime(f0,t); b.frequency.exponentialRampToValueAtTime(f1,t+dur);
  e.gain.setValueAtTime(.0001,t); e.gain.exponentialRampToValueAtTime(g,t+dur*.3); e.gain.exponentialRampToValueAtTime(.0001,t+dur); s.connect(b); b.connect(e); e.connect(a.m); s.start(t,Math.random()); s.stop(t+dur+.05) }
function auPad(type,f0,f1,dur,g,delay){ var a=BT.au; if(!a) return; var c=a.c, t=c.currentTime+(delay||0), o=c.createOscillator(), e=c.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1!==f0) o.frequency.exponentialRampToValueAtTime(f1,t+dur); e.gain.setValueAtTime(.0001,t); e.gain.exponentialRampToValueAtTime(g,t+dur*.35); e.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(e); e.connect(a.m); o.start(t); o.stop(t+dur+.05) }
function auClickAt(v,delay){ setTimeout(function(){ auClick(v) },delay*1000) }
function auWork(k,d){ var i, notes;
  if(k==='air'){ auNoise(160,1100,d*.55,.09,1.1); auNoise(1100,260,d*.5,.07,.9,d*.5); auPad('sine',55,175,d,.07); auPad('triangle',110,330,d,.025,.1) }
  else if(k==='hatch'){ auPad('sawtooth',40,68,d,.05); for(i=0;i<Math.floor(d/.42);i++){ auTone('sine',72,34,.34,.17,i*.42); auClickAt(.09,i*.42) } auPad('sine',90,130,d,.03,.2) }
  else if(k==='tape'){ for(i=0;i<Math.floor(d*15);i++) auClickAt(.02+Math.random()*.03,i/15+Math.random()*.03); notes=[330,392,440,523,494,587]; for(i=0;i<Math.floor(d*5);i++) auTone('triangle',notes[i%6],notes[i%6],.08,.028,i*.2); auPad('sine',120,200,d,.025) }
  else if(k==='yard'){ for(i=0;i<Math.floor(d*3.4);i++){ auNoise(900,2800,.12,.06,1.5,i*.29); auTone('triangle',92,58,.16,.12,i*.29) } auPad('sine',90,300,d,.05); auPad('triangle',180,420,d,.018,.3) }
  else if(k==='cap'){ auPad('sine',44,64,d,.14); auPad('sine',110,110,d,.04,.1); auPad('sine',165,171,d,.035,.3); auPad('sine',220,226,d,.025,.5); auPad('sine',330,333,d,.015,.8) }
  else if(k==='tr'){ notes=[262,330,392,523,392,659,523,784,659,988]; for(i=0;i<notes.length;i++) auTone('triangle',notes[i],notes[i],.28,.032,i*(d/notes.length)); auPad('sine',130,196,d,.04) }
  BT.pf=PF[k]||PF.def; auLevel() }
function auLoc(k){ if(k===1){ auNoise(250,1500,1.6,.06,.8); auPad('sine',150,300,1.8,.05); auTone('sine',880,880,.5,.02,1.6) } else if(k===2){ auNoise(180,1900,2.6,.09,.8); auPad('sine',70,260,2.8,.08); auPad('triangle',140,520,2.6,.025,.2); auTone('sine',660,660,.9,.03,2.6); auTone('sine',990,990,1.2,.018,2.65) } else { auNoise(150,2400,3.2,.1,.8); auPad('sine',50,200,3.2,.11); auPad('triangle',100,420,3.0,.03,.2); auTone('sine',330,330,2.2,.04,3.2); auTone('sine',660,660,2.6,.03,3.25); auTone('sine',990,990,2.4,.016,3.3); auTone('sine',55,40,1.2,.2,3.2) } }
function auLine(cls,sp){ if(!BT.au) return; if(cls==='f'){ auTone('sine',165,150,.16,.05); auTone('sine',110,110,.2,.04,.05) } else if(cls==='cm'){ auClick(.02) } else if(cls==='no'){ } else if(!sp){ auClick(.025); auTone('sine',840,840,.04,.012) } else { auClick(.012) } }
function auErr(){ auBeep(196,110,.035); setTimeout(function(){ auBeep(147,170,.035) },180) }
function auPost(){ auBeep(620,140,.03) }
function auSend(){ auClick(.03); auTone('triangle',392,392,.09,.05); auTone('triangle',587,587,.14,.05,.075) }
function auDegauss(){ auTone('sine',55,22,.7,.22); auNoise(100,900,.5,.09,.6) }
function auCalm(){ auTone('sine',220,220,2.6,.03,.1); auTone('sine',330,330,2.4,.022,.2); auTone('sine',440,440,2.0,.012,.35) }
function auStop(){ var a=BT.au; BT.au=null; if(!a) return; try{ a.m.gain.setTargetAtTime(0,a.c.currentTime,.2) }catch(e){} setTimeout(function(){ try{ a.c.close() }catch(e){} },900) }

/* ---------- the start-up terminal (design/INTRO-DRAFT.md, 22.10): an old machine waking up. It hums, flickers, the letters fall
   apart and settle as the systems come on; each system asks for its verb, a wrong one is refused with the reason. Last comes
   the translation — Alexandra. Then the game. ---------- */
/* the run before the first question: l — a line (class, key), w — a pause, t — a working bar (key, ms), loc — the panel on the
   right zooms in (sector, system, planet), mem — the memory count */
var PRE=[['l','cm','tm_p01'],['l','','tm_p02'],['l','','tm_p03'],['l','','tm_p04'],['l','','tm_p05'],['w',300],['t','tm_p06',1300],['loc',1,1800],['l','','tm_p07'],
  ['mem'],['l','','tm_p08'],['t','tm_p09',450],['t','tm_p10',450],['t','tm_p11',450],['t','tm_p12',450],['t','tm_p13',450],['t','tm_p14',450],['l','ok','tm_p15'],['loc',2,2600],['l','','tm_p16'],
  ['l','','tm_p17'],['l','','tm_p18'],['l','f','tm_p19'],['t','tm_p20',700],['l','ok','tm_p21'],['loc',3,3400],['l','ok','tm_p22'],['l','','tm_p23'],['l','f','tm_p24'],['w',350]];
/* the six systems, in order: their sound, the right verb (of four), how many lines the start-up prints */
var SYS=[{k:'air',sig:'air',ok:0,ni:4},{k:'hatch',sig:'hatch',ok:1,ni:3},{k:'store',sig:'tape',ok:2,ni:3},{k:'yard',sig:'yard',ok:3,ni:3},{k:'cap',sig:'cap',ok:2,ni:3},{k:'tr',sig:'tr',ok:3,ni:3}];
function sk(s,f,n){ return 'tm_'+s.k+'_'+f+(n||'') }
var NOISE=[1,.85,.66,.48,.32,.16,0], GLY='▒░▓█#@%&?/\\<>|01ΞΨ§¤µ¦ƒ';
var PF={def:{bp:350,wh:124,fan:.026},air:{bp:540,wh:150,fan:.05},hatch:{bp:150,wh:62,fan:.03},tape:{bp:760,wh:190,fan:.018},yard:{bp:380,wh:96,fan:.04},cap:{bp:190,wh:54,fan:.032},tr:{bp:650,wh:205,fan:.02}};
var BT={pf:PF.def,timers:[],run:0,fin:null,ask:null,busy:false,box:null,q:null,ov:null,ns:1,act:false,au:null,tick:null,hud:null,h:null,sysN:0,done:false};

/* the panel on the right: the sector grid, the system with its lit orbit, the wireframe Earth */
function planetSVG(){ var R=78, m='', i, g='', st='', rg=rng(37);
  for(i=-5;i<=5;i++){ g+='<line x1="'+(i*20)+'" y1="-90" x2="'+(i*20)+'" y2="90" class="gl"/>' } for(i=-4;i<=4;i++){ g+='<line x1="-100" y1="'+(i*20)+'" x2="100" y2="'+(i*20)+'" class="gl"/>' }
  for(i=0;i<46;i++) st+='<circle cx="'+((rg()-.5)*196).toFixed(1)+'" cy="'+((rg()-.5)*172).toFixed(1)+'" r="'+(.8+rg()*1.4).toFixed(1)+'" class="sd"/>';
  var s1='<g class="s1">'+g+st+'<g class="mk0"><circle cx="18" cy="-6" r="7" class="m0c"/><circle cx="18" cy="-6" r="1.8" class="m0d"/><path d="M4 -6h8M24 -6h8M18 -20v8M18 0v8" class="m0x"/><text x="30" y="-12" class="m0t">'+esc(T('tm_sector'))+' 00/AE</text></g><text x="-96" y="-82" class="ct">X 0412.7</text><text x="96" y="-82" class="ct" text-anchor="end">Y 0087.2</text><text x="-96" y="86" class="ct">'+esc(T('tm_grid'))+'</text></g>';
  var oc='', rs=[26,44,64,88], ds='';
  rs.forEach(function(r,k){ oc+='<ellipse cx="0" cy="0" rx="'+r+'" ry="'+(r*.28).toFixed(1)+'" class="or'+(k===2?' hot':'')+'"/>'; var an=[1.1,4.0,.61,2.4][k]; ds+='<circle cx="'+(r*Math.cos(an)).toFixed(1)+'" cy="'+(r*.28*Math.sin(an)).toFixed(1)+'" r="'+(k===2?2.6:1.6)+'" class="pd'+(k===2?' me':'')+'"/>' });
  var s2='<g class="s2"><circle r="14" class="sg"/><circle r="4.6" class="sc"/>'+oc+ds+'<text x="0" y="-22" class="m0t" text-anchor="middle">'+esc(T('tm_system'))+'</text></g>';
  for(i=-3;i<=3;i++){ var y=i*R/4, rx=Math.sqrt(R*R-y*y); m+='<ellipse cx="0" cy="'+y.toFixed(1)+'" rx="'+rx.toFixed(1)+'" ry="'+(rx*.16).toFixed(1)+'" class="lat"/>' }
  for(i=0;i<4;i++) m+='<ellipse cx="0" cy="0" rx="'+R+'" ry="'+R+'" class="lon" style="animation-delay:-'+(i*2)+'s"/>';
  var s3='<g class="s3"><circle r="'+(R+4)+'" class="halo"/><circle r="'+R+'" class="disc"/><circle r="'+R+'" class="rim"/>'+m+'<g class="blips"></g><g class="cr"><path d="M-96 -82h14M-89 -89v14"/><path d="M82 -82h14M89 -89v14"/><path d="M-96 78h14M-89 71v14"/><path d="M82 78h14M89 71v14"/></g><text x="0" y="86" class="pn">'+esc(T('tm_earth'))+'</text></g>';
  return '<svg class="pl" viewBox="-100 -90 200 180" aria-hidden="true"><defs><radialGradient id="mpgd" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#17304d"/><stop offset=".55" stop-color="#0a121c"/><stop offset="1" stop-color="#050608"/></radialGradient></defs>'+s1+s2+s3+'</svg>' }
function locRows(){ return '<div class="loc"><div class="lr r1"><span>'+esc(T('tm_sector'))+'</span><b>00/AE</b></div><div class="lr r2"><span>'+esc(T('tm_system'))+'</span><b>'+esc(T('tm_noName'))+'</b></div><div class="lr r3"><span>'+esc(T('tm_planet'))+'</span><b>'+esc(T('tm_earth'))+'</b></div></div>' }
var BLIPS=[[-30,-25],[22,-38],[40,12],[-8,32],[-44,14],[10,-4]];
function addBlip(k){ var g=BT.ov&&BT.ov.querySelector('.blips'), p=BLIPS[k-1]; if(!g||!p) return; g.insertAdjacentHTML('beforeend','<circle cx="'+p[0]+'" cy="'+p[1]+'" r="7" class="bpr"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.6" class="bp"/>') }
function trimBox(){ var box=BT.box; if(!box) return; while(box.scrollHeight>box.clientHeight+2&&box.children.length>2) box.removeChild(box.firstChild) }
/* the clock in the corner and the wait under the question */
function hudTick(){ var ov=BT.ov; if(!ov) return; trimBox(); var h=BT.h, s=Math.max(0,Math.floor((Date.now()-h.t0)/1000-1.7)), u=ov.querySelector('[data-g="up"]');
  if(u) u.textContent=('0'+Math.floor(s/60)).slice(-2)+':'+('0'+(s%60)).slice(-2);
  var w=ov.querySelector('.wt'); if(w&&h.ask) w.textContent=T('tm_wait',{n:Math.floor((Date.now()-h.ask)/1000)})+' '+'|/-\\'.charAt(Math.floor(Date.now()/160)%4) }
function glyph(){ return GLY.charAt((Math.random()*GLY.length)|0) }
function scrambleAll(){ var box=BT.box; if(!box) return; var ns=BT.ns+(BT.act?.45:0), k;
  for(k=0;k<box.children.length;k++){ var d=box.children[k], t=d._t; if(t==null||d._typing) continue;
    if(ns<=0.01){ if(d.textContent!==t) d.textContent=t; d.classList.remove('tear'); continue }
    var o='', p=ns*.04, i, c; for(i=0;i<t.length;i++){ c=t.charAt(i); o+=(c!==' '&&Math.random()<p)?glyph():c } d.textContent=o;
    if(Math.random()<ns*.05){ d.classList.add('tear'); (function(x){ setTimeout(function(){ x.classList.remove('tear') },110) })(d) } }
  if(BT.ov) BT.ov.classList.toggle('act',BT.act) }
function setNoise(n){ BT.ns=NOISE[Math.min(6,n)]; auLevel() }
function termClear(){ BT.run++; BT.timers.forEach(clearTimeout); BT.timers=[]; clearInterval(BT.tick); clearInterval(BT.hud); BT.tick=BT.hud=null; BT.fin=null; BT.ask=null; BT.act=false; auStop() }
function newLine(cls,text){ var box=BT.box, d=document.createElement('div'); d.className='bl '+cls; d._t=text; d._typing=true; box.appendChild(d); while(box.scrollHeight>box.clientHeight+2&&box.children.length>2) box.removeChild(box.firstChild); return d }
function btype(cls,text,done,sp){ var d=newLine(cls,text), run=BT.run, i=0, tm, b=sp?sp*3.6:38;
  function fin(){ if(run!==BT.run) return; clearTimeout(tm); d._typing=false; d.textContent=text; BT.fin=null; if(cls!=='f') auLine(cls,sp); if(done) BT.timers.push(setTimeout(done,sp?200:520)) }
  function tick(){ if(run!==BT.run) return; i++; var bad=Math.random()<BT.ns*.4&&text.charAt(i-1)!==' '; d.textContent=text.slice(0,i-1)+(bad?glyph():text.charAt(i-1)); if(i%2===0) auClick(.006); if(i>=text.length){ fin(); return } tm=setTimeout(tick,b+Math.random()*b*1.3); BT.timers.push(tm) }
  BT.fin=fin; tick() }
function memtest(done){ var d=newLine('',''), run=BT.run, n=0, tm, end=T('tm_mtEnd'); d._typing=true;
  function fin(){ if(run!==BT.run) return; clearTimeout(tm); d._typing=false; d._t=end; d.textContent=end; auPost(); BT.fin=null; BT.timers.push(setTimeout(done,400)) }
  function tick(){ if(run!==BT.run) return; n+=16+((Math.random()*16)|0); if(n>=640){ fin(); return } d.textContent=T('tm_mt',{n:('0000'+n).slice(-4)}); auClick(.012); if(((n/16)|0)%3===0) auBeep(180+n*.5,22,.012); tm=setTimeout(tick,52); BT.timers.push(tm) }
  BT.fin=fin; tick() }
function think(label,ms,done,sig){ if(sig) auWork(sig,ms/1000); var run=BT.run, th=newLine('tk',''), hx=newLine('hx',''), t0=Date.now(), p=0, tm, ck;
  th._typing=true; hx._typing=true; BT.act=true; auLevel();
  ck=setInterval(function(){ if(run!==BT.run){ clearInterval(ck); return } auClick(.014+Math.random()*.02) },70+((Math.random()*60)|0)); BT.timers.push(ck);
  function bar(v){ var n=Math.round(v/5); return label+' ['+new Array(n+1).join('#')+new Array(21-n).join('.')+'] '+('  '+Math.round(v)).slice(-3)+'%' }
  function fin(){ if(run!==BT.run) return; clearTimeout(tm); clearInterval(ck); th._typing=false; th._t=label+' ['+new Array(21).join('#')+'] ok'; th.textContent=th._t; if(hx.parentNode) hx.parentNode.removeChild(hx);
    BT.act=false; BT.pf=PF.def; BT.fin=null; auLevel(); BT.timers.push(setTimeout(done,200)) }
  function tick(){ if(run!==BT.run) return; var f=(Date.now()-t0)/ms; if(f>=1){ fin(); return }
    p=Math.min(99,p+Math.random()*(f<.5?9:5)); th.textContent=bar(p); var s='',i; for(i=0;i<22;i++) s+=('0'+((Math.random()*256)|0).toString(16)).slice(-2).toUpperCase()+' '; hx.textContent=s;
    tm=setTimeout(tick,55); BT.timers.push(tm) }
  BT.fin=fin; tick() }
function seq(list,fn,done){ var k=0; (function go(){ if(k>=list.length){ done(); return } var it=list[k++]; fn(it,go,k-1) })() }
/* one system asks for its verb: a wrong one is refused with the reason and asked again; the right one starts it */
function termAsk(s,next){ var q=BT.q, ov=BT.ov, vs=[1,2,3,4].map(function(n){ return T(sk(s,'v',n)) });
  q.innerHTML='<span class="pm">&gt;</span>'+vs.map(function(v,i){ return '<button class="vb" type="button" data-vb="'+i+'"><i>'+(i+1)+'</i>'+esc(v)+'</button>' }).join('')+'<span class="wt"></span>'; BT.busy=false; BT.h.ask=Date.now(); trimBox();
  BT.ask=function(i){ i=+i; if(!(i>=0&&i<4)||BT.busy) return; BT.busy=true; BT.h.ask=0; q.innerHTML=''; auSend();
    btype('cm','> '+vs[i],function(){
      if(i===s.ok){ BT.ask=null;
        think('│  '+vs[i]+' · '+T(sk(s,'n')),s.sig==='tr'?2400:1500,function(){
          var init=[]; for(var j=1;j<=s.ni;j++) init.push(T(sk(s,'i',j)));
          seq(init,function(line,go,ix){ auTone('triangle',440*Math.pow(2,ix/5),440*Math.pow(2,ix/5),.09,.03); btype('','├─ '+line,go,4) },function(){ var k=+ov.getAttribute('data-n')+1; ov.setAttribute('data-n',k); BT.sysN=k; setNoise(k); addBlip(k);
            auBeep(523,110,.035); setTimeout(function(){ auBeep(784,160,.03) },130); if(k===6) auCalm(); btype('ok','└─ '+T(sk(s,'ok')),next) }) },s.sig) }
      else { auErr(); btype('no','│  '+T('tm_refuse',{r:T(sk(s,'r',i+1))}),function(){ termAsk(s,next) }) } }) } }
function termPlay(){ maDuck(true); ROOT.classList.remove('diving'); termClear();
  var run=++BT.run, name=T('mn_pult');
  ROOT.insertAdjacentHTML('beforeend','<div class="mterm" data-n="0"><div class="wr"><div class="mn"><div class="bh">'+mark()+'<span>'+esc(name)+'</span><div class="tb">'+esc(T('tm_up'))+' <b data-g="up">00:00</b></div></div><div class="bo"></div><div class="bq"></div></div><div class="hud">'+planetSVG()+locRows()+'</div></div><button class="bskip" type="button" data-m="skip">'+esc(T('tm_skip'))+'</button><div class="bhint">'+esc(T('tm_hint'))+'</div></div>');
  var ov=ROOT.querySelector('.mterm'); BT.ov=ov; BT.box=ov.querySelector('.bo'); BT.q=ov.querySelector('.bq'); BT.fin=null; BT.ask=null; BT.busy=false; BT.ns=1; BT.act=false; BT.sysN=0; BT.done=false;
  BT.h={t0:Date.now(),ask:0}; auStart(); BT.tick=setInterval(scrambleAll,110); BT.hud=setInterval(hudTick,120);
  var q=[]; q.push(function(n){ BT.timers.push(setTimeout(function(){ ov.classList.add('on'); auDegauss(); n() },1700)) });
  var lastL=-1; PRE.forEach(function(p,i){ if(p[0]==='l') lastL=i });
  PRE.forEach(function(p,pi){ var t=p[0], pf=pi===0?'':(pi===lastL?'└─ ':'├─ ');
    if(t==='l') q.push(function(n){ btype(p[1],pf+T(p[2],{name:name.toLowerCase(),v:O.v}),n,5) });
    else if(t==='w') q.push(function(n){ BT.timers.push(setTimeout(n,p[1])) });
    else if(t==='t') q.push(function(n){ think('│  '+T(p[1]),p[2],n) });
    else if(t==='mem') q.push(function(n){ memtest(n) });
    else if(t==='loc') q.push(function(n){ ov.setAttribute('data-loc',p[1]); auLoc(p[1]); BT.timers.push(setTimeout(n,p[2])) }) });
  SYS.forEach(function(s){ q.push(function(n){ auLine('f'); btype('f','■ '+T(sk(s,'f')),n) }); [1,2,3].forEach(function(j){ q.push(function(n){ btype('',(j===3?'└─ ':'├─ ')+T(sk(s,'d',j)),n,4) }) }); q.push(function(n){ BT.timers.push(setTimeout(n,300)) }); q.push(function(n){ termAsk(s,n) }) });
  q.push(function(n){ btype('cm',T('tm_her'),n) }); q.push(function(){ BT.timers.push(setTimeout(termEnd,1800)) });
  var k=0; (function go(){ if(run!==BT.run) return; var f=q[k++]; if(f) f(go) })() }
/* the end of the terminal, by its last line, SKIP or Esc: the run begins, the black lifts off the map */
function termEnd(){ if(BT.done||!BT.ov) return; BT.done=true; termClear(); O.newRun(); fadeOut() }
function termKey(e){ if(e.key==='Escape'){ termEnd(); return }
  if(e.key===' '||e.key==='Enter'){ e.preventDefault(); if(BT.fin) BT.fin(); return }
  if(/^[1-4]$/.test(e.key)&&BT.ask) BT.ask(+e.key-1) }

/* ---------- open, close, presses ---------- */
function onClick(e){ if(!OPEN) return; e.stopPropagation(); var t=e.target; maStart();
  if(BT.ov&&!BT.done){ var vb=t.closest('[data-vb]'); if(vb){ if(BT.ask) BT.ask(vb.dataset.vb); return } if(t.closest('[data-m="skip"]')){ termEnd(); return } if(BT.fin) BT.fin(); return }
  if(t.closest('[data-m="test"]')){ test(); return }
  var it=t.closest('.mit[data-i]'); if(it&&!BUSY){ var i=+it.dataset.i; if(items()[i].off) return; select(i); act(i) } }
function onOver(e){ if(!OPEN||BUSY||BT.ov) return; var it=e.target.closest&&e.target.closest('.mit[data-i]'); if(!it) return; var i=+it.dataset.i; if(items()[i].off||i===SEL) return; select(i); maClick('hover') }
/* the keys belong to the menu while it is up: nothing reaches the game under it */
function onKey(e){ if(!OPEN) return; e.stopPropagation(); maStart(); if(e.target&&e.target.tagName==='INPUT') return;
  if(BT.ov&&!BT.done){ termKey(e); return } if(BUSY) return;
  var I=items(), n=I.length, i=SEL, d=0;
  if(e.key==='ArrowDown'||e.key==='ArrowRight') d=1; else if(e.key==='ArrowUp'||e.key==='ArrowLeft') d=-1;
  else if(e.key==='Enter'||e.key===' '){ e.preventDefault(); act(SEL); return }
  else if(/^[1-5]$/.test(e.key)){ var j=+e.key-1; if(!I[j].off){ select(j); act(j) } return }
  else return;
  e.preventDefault(); do{ i=(i+d+n)%n }while(I[i].off); select(i); maClick('hover') }
function onResize(){ if(ROOT) ROOT.classList.toggle('phone',innerWidth<720) }
function onVis(){ [MA.c,BT.au&&BT.au.c].forEach(function(c){ if(!c) return; if(document.hidden) c.suspend(); else c.resume() }) }
var WIRED=false;
function open(opts){ O=opts; ROOT=document.getElementById('menu'); if(!ROOT) return; OPEN=true; BUSY=false; SEL=1; DIVE.at=Infinity; DIVE.back=-1e9; BT.ov=null; BT.done=false;
  if(!WIRED){ WIRED=true; ROOT.addEventListener('click',onClick); ROOT.addEventListener('mouseover',onOver); window.addEventListener('keydown',onKey,true); window.addEventListener('resize',onResize); document.addEventListener('mousemove',ptrMove); document.addEventListener('visibilitychange',onVis) }
  ROOT.className=''; onResize(); ROOT.hidden=false; ROOT.innerHTML='<canvas class="mcv"></canvas><div class="mui"></div>';
  CV=ROOT.querySelector('.mcv'); UI=ROOT.querySelector('.mui'); SEL=firstOn()===0?0:1; drawUI(); sceneStart(CV); ptrLoop() }
/* gone at once (the scenarios' hook, a file loaded) or lifting off the map */
function close(){ if(!OPEN) return; OPEN=false; termClear(); maStop();
  if(GLX){ try{ var lc=GLX.getExtension('WEBGL_lose_context'); if(lc) lc.loseContext() }catch(e){} GLX=null }
  ROOT.hidden=true; ROOT.className=''; ROOT.innerHTML=''; UI=CV=null; BT.ov=null; if(O&&O.closed) O.closed() }
function fadeOut(){ if(!OPEN) return; ROOT.classList.add('out'); setTimeout(close,650) }
return {open:open,close:close,fadeOut:fadeOut,note:note,isOpen:function(){ return OPEN }};
})();
