/* LAST BERTH — animated short (draft outside the game, 09.11.2026).
   Canon: design/LORE-BIBLE.md v3 (public part only). One function draws any moment: CT.render(t).
   The page plays it; design/cartoon/render.js turns the same frames and the same sound into mp4. */
(function(){
'use strict';
var W=1920,H=800,FPS=30;
var C={bg:'#0B0B0C',ink:'#F2F1EC',mid:'#9C9B95',dim:'#5E5D58',ln:'#2E2E33',yel:'#FFD23F',earth:'#4FA3FF',
  food:'#3DDC84',metal:'#C9CFD6',fuel:'#FF8A1F',parts:'#5B82F0',ark:'#B48CFF',red:'#FF2A1A'};
var MONO="'Geist Mono',ui-monospace,Consolas,monospace", SANS="'Jost',system-ui,sans-serif";
var cv,ctx;

/* ---------- helpers ---------- */
function cl(x,a,b){return x<a?a:x>b?b:x}
function L(a,b,k){return a+(b-a)*k}
function seg(t,a,b){return cl((t-a)/(b-a),0,1)}
function ss(k){return k*k*(3-2*k)}
function eo(k){return 1-Math.pow(1-k,3)}
function env(t,a,b,fi,fo){return Math.max(0,Math.min(seg(t,a,a+fi),1-seg(t,b-fo,b)))}
function fract(x){return x-Math.floor(x)}
function rng(seed){var s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;var x=Math.imul(s^(s>>>15),1|s);
  x=(x+Math.imul(x^(x>>>7),61|x))^x;return((x^(x>>>14))>>>0)/4294967296}}
function hash(n){return rng(n*7919+13)()}
function rgba(hex,a){var n=parseInt(hex.slice(1),16);return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a+')'}
function txt(s,x,y,font,col,a,align,ls){ctx.save();ctx.globalAlpha*=cl(a==null?1:a,0,1);ctx.font=font;ctx.fillStyle=col;
  ctx.textAlign=align||'left';ctx.letterSpacing=ls||'0px';ctx.fillText(s,x,y);ctx.restore()}
function glow(x,y,r,col,a){var g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function cam(k,px,py){ctx.translate(px,py);ctx.scale(k,k);ctx.translate(-px,-py)}

/* ---------- assets: Alexandra (portraits of the game, variant A) ---------- */
var FACES=['full','talk','smile','resolve','sad','grief'],IMG={};
function loadImages(){var A=window.CT_ASSETS||{};return Promise.all(FACES.map(function(n){return new Promise(function(ok){
  var im=new Image();im.onload=function(){IMG[n]=im;ok()};im.onerror=function(){ok()};im.src=A[n]||('../alexandra/'+n+'.webp')})}))}

/* ---------- small things drawn many times ---------- */
var STARS=(function(){var r=rng(7),a=[];for(var i=0;i<460;i++)a.push({x:r()*W,y:r()*H,r:0.5+r()*r()*1.7,p:r()*6.28,s:0.4+r()*1.6});return a})();
function stars(t,a,dx,dy,ymax){ctx.save();ctx.fillStyle=C.ink;for(var i=0;i<STARS.length;i++){var s=STARS[i];
  var x=((s.x+(dx||0)*s.r)%W+W)%W,y=((s.y+(dy||0)*s.r)%H+H)%H;if(ymax&&y>ymax)continue;
  ctx.globalAlpha=a*(0.45+0.4*Math.sin(t*s.s+s.p))*Math.min(1,s.r);ctx.beginPath();ctx.arc(x,y,s.r,0,6.283);ctx.fill()}ctx.restore()}

function person(x,y,h,fill,rim){ // standing figure seen from behind
  function shape(ox){ctx.beginPath();ctx.arc(x+ox,y-h*0.925,h*0.068,0,6.283);ctx.fill();
    ctx.beginPath();ctx.moveTo(x+ox-h*0.05,y-h*0.86);ctx.quadraticCurveTo(x+ox-h*0.16,y-h*0.84,x+ox-h*0.15,y-h*0.70);
    ctx.lineTo(x+ox-h*0.12,y-h*0.42);ctx.lineTo(x+ox-h*0.10,y);ctx.lineTo(x+ox+h*0.10,y);ctx.lineTo(x+ox+h*0.12,y-h*0.42);
    ctx.lineTo(x+ox+h*0.15,y-h*0.70);ctx.quadraticCurveTo(x+ox+h*0.16,y-h*0.84,x+ox+h*0.05,y-h*0.86);ctx.closePath();ctx.fill()}
  if(rim){ctx.fillStyle=rim;shape(h*0.012)}
  ctx.fillStyle=fill;shape(0)}

function crowd(n,seed,y0,y1,h0,h1,rim,sway,t){var r=rng(seed),a=[];for(var i=0;i<n;i++)a.push({x:40+(W-80)*(i+0.5)/n+(r()-0.5)*40,k:r(),h:r(),p:r()*6});
  a.sort(function(p,q){return p.k-q.k});for(i=0;i<n;i++){var p=a[i],y=L(y0,y1,p.k);
    person(p.x+Math.sin(t*0.5+p.p)*(sway||0),y+L(h0,h1,p.k)*0.42,L(h0,h1,p.k)*(0.92+p.h*0.16),'#040405',rim)}}

function glyph(x,y,s,seed,prog,col,a){ // people's writing: straight strokes only
  var r=rng(seed),n=3+Math.floor(r()*3);ctx.save();ctx.strokeStyle=col;ctx.globalAlpha*=a;ctx.lineWidth=Math.max(1,s*0.11);ctx.lineCap='square';
  for(var i=0;i<n;i++){var x0=Math.floor(r()*3),y0=Math.floor(r()*3),d=Math.floor(r()*4),x1=x0,y1=y0;
    if(d==0)x1=2-x0||2;else if(d==1)y1=2-y0||2;else if(d==2){x1=(x0+1)%3;y1=(y0+2)%3}else{x1=(x0+2)%3;y1=(y0+1)%3}
    var k=cl(prog*n-i,0,1);if(k<=0)continue;ctx.beginPath();ctx.moveTo(x+x0*s/2,y+y0*s/2);
    ctx.lineTo(x+L(x0,x1,k)*s/2,y+L(y0,y1,k)*s/2);ctx.stroke()}ctx.restore()}
function plate(x,y,w,h,seed,prog,col,a){ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w,h);ctx.restore();
  var n=Math.max(3,Math.floor((w-h*0.5)/(h*0.62))),s=h*0.46;for(var i=0;i<n;i++)glyph(x+h*0.3+i*h*0.62,y+h*0.27,s,seed*31+i,cl(prog*n-i,0,1),col,a)}

function wsphere(x,y,r,col,ph,a,lw){ctx.save();ctx.globalAlpha*=a;ctx.strokeStyle=col;ctx.lineWidth=lw||1.2;
  ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.stroke();
  for(var i=0;i<3;i++){var k=Math.abs(Math.cos(ph+i*1.047));ctx.beginPath();ctx.ellipse(x,y,Math.max(0.3,r*k),r,0,0,6.283);ctx.stroke()}
  ctx.beginPath();ctx.ellipse(x,y,r,r*0.32,0,0,6.283);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y-r*0.55,r*0.83,r*0.26,0,0,6.283);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y+r*0.55,r*0.83,r*0.26,0,0,6.283);ctx.stroke();ctx.restore()}

function hull(x,y,s,ang,col,a,burn){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.globalAlpha*=a;
  if(burn)glow(-s*1.3,0,s*2.6,C.fuel,0.55*burn);
  ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(s*1.25,0);ctx.lineTo(-s,-s*0.62);ctx.lineTo(-s*0.55,0);ctx.lineTo(-s,s*0.62);ctx.closePath();ctx.fill();ctx.restore()}

/* ---------- places ---------- */
var HY=540,VX=420;
var VESSEL=[[0,0],[40,-46],[210,-58],[250,-120],[330,-120],[350,-200],[395,-200],[400,-330],[408,-330],[412,-200],[470,-200],[500,-130],[640,-130],[690,-84],[900,-70],[1010,-30],[1060,0]];
function roofAt(x){for(var i=1;i<VESSEL.length;i++){var a=VESSEL[i-1],b=VESSEL[i];if(x>=a[0]&&x<=b[0])return b[0]==a[0]?b[1]:L(a[1],b[1],(x-a[0])/(b[0]-a[0]))}return 0}
var VLIGHTS=(function(){var r=rng(21),a=[];while(a.length<70){var x=30+r()*1000,y=-8-r()*150;if(y>roofAt(x)+10)a.push({x:x,y:y,on:r(),w:r()<0.3?7:3})}return a})();
var CRATERS=(function(){var r=rng(5),a=[];for(var i=0;i<46;i++){var k=Math.pow(r(),1.6);a.push({x:r()*W*1.2-W*0.1,k:k,s:0.4+r()})}return a})();
function ground(t,lights){ // the lifeless home planet and the vessel on it, seen from the surface
  var g=ctx.createLinearGradient(0,0,0,HY);g.addColorStop(0,'#08080A');g.addColorStop(1,'#15161C');ctx.fillStyle=g;ctx.fillRect(0,0,W,HY);
  stars(t,0.9,0,0,HY);
  glow(1520,HY-6,520,'#FFE9B8',0.30);glow(1520,HY-6,120,'#FFF6DD',0.9);
  ctx.fillStyle='#FFFDF2';ctx.beginPath();ctx.arc(1520,HY-6,13,0,6.283);ctx.fill();
  g=ctx.createLinearGradient(0,HY,0,H);g.addColorStop(0,'#34312E');g.addColorStop(0.25,'#1F1D1B');g.addColorStop(1,'#0B0A09');ctx.fillStyle=g;ctx.fillRect(0,HY,W,H-HY);
  g=ctx.createRadialGradient(1520,HY,0,1520,HY,900);g.addColorStop(0,'rgba(255,232,190,.28)');g.addColorStop(1,'rgba(255,232,190,0)');
  ctx.fillStyle=g;ctx.fillRect(0,HY,W,70);
  for(var i=0;i<CRATERS.length;i++){var c=CRATERS[i],y=HY+10+c.k*(H-HY),rx=L(16,250,c.k)*c.s,ry=rx*L(0.10,0.22,c.k);
    ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(c.x,y,rx,ry,0,0,6.283);ctx.fill();
    ctx.strokeStyle='rgba(255,236,200,.07)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(c.x,y,rx,ry,0,Math.PI*0.05,Math.PI*0.95);ctx.stroke()}
  ctx.fillStyle='#060607';ctx.beginPath();ctx.moveTo(VX,HY+4);for(i=0;i<VESSEL.length;i++)ctx.lineTo(VX+VESSEL[i][0],HY+VESSEL[i][1]);ctx.lineTo(VX+1060,HY+4);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,236,200,.16)';ctx.lineWidth=1.5;ctx.beginPath();for(i=0;i<VESSEL.length;i++)ctx[i?'lineTo':'moveTo'](VX+VESSEL[i][0],HY+VESSEL[i][1]);ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.moveTo(VX,HY+2);ctx.lineTo(VX+1060,HY+2);ctx.lineTo(VX+500,HY+70);ctx.lineTo(VX-900,HY+70);ctx.closePath();ctx.fill();
  for(i=0;i<VLIGHTS.length;i++){var l=VLIGHTS[i],a=lights(l.on);if(a<=0)continue;
    ctx.fillStyle=rgba('#FFC46B',a*(0.75+0.25*Math.sin(t*2+i)));ctx.fillRect(VX+l.x,HY+l.y,l.w,2.5);if(l.w>3)glow(VX+l.x+3,HY+l.y+1,14,'#FFB14A',0.25*a)}
  g=ctx.createLinearGradient(0,HY-60,0,HY+40);g.addColorStop(0,'rgba(140,150,175,0)');g.addColorStop(0.6,'rgba(140,150,175,.10)');g.addColorStop(1,'rgba(140,150,175,0)');
  ctx.fillStyle=g;ctx.fillRect(0,HY-60,W,100)}

function limb(cx,cy,r,sx,sy,lr){ // the planet from orbit, lit from the point sx,sy
  var g=ctx.createRadialGradient(sx,sy,0,sx,sy,lr);g.addColorStop(0,'#7A7166');g.addColorStop(0.35,'#3D3833');g.addColorStop(1,'#100F0D');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(255,236,200,.22)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r,0,6.283);ctx.stroke()}

/* ---------- the map (the look of v5.05: wire worlds on pins over a hex floor) ---------- */
var RINGS=[170,300,440,590],RNAME=['I · CAESAR','II · AUGUSTUS','III · CICERO','IV · DANTE'],RBORN=[59.6,66.2,71.2,75];
var CLS={metal:C.metal,food:C.food,fuel:C.fuel,forge:C.parts};
var WORLDS=[['TALLOW',0,0.55,'metal',60.5],['BRINE',0,2.65,'food',62.5],['CINDER',0,4.45,'fuel',64.5],['MARROW',1,1.45,'forge',67],
  ['SOLACE',1,3.55,'food',68.5],['GALLOWS',1,5.35,'metal',70],['VESPER',2,0.1,'fuel',72],['CAIRN',2,2.25,'metal',73],
  ['OSSUARY',2,4.0,'forge',74],['THRENODY',3,5.05,'food',75.5]].map(function(a,i){
  return {i:i,name:a[0],ring:a[1],cls:a[3],born:a[4],x:Math.cos(a[2])*RINGS[a[1]],y:Math.sin(a[2])*RINGS[a[1]],pop:0.55+hash(i+3)*0.6}});
function world(n){for(var i=0;i<WORLDS.length;i++)if(WORLDS[i].name==n)return WORLDS[i]}
var HEX=(function(){var s=46,a=[],q,r,k;for(r=-12;r<=12;r++)for(q=-14;q<=14;q++){var x=s*1.732*(q+r/2),y=s*1.5*r;if(x*x+y*y>690*690)continue;
  var c=[];for(k=0;k<6;k++){var an=(30+60*k)*Math.PI/180;c.push([x+s*Math.cos(an),y+s*Math.sin(an)])}a.push(c)}return a})();
function drawMap(o){ // o: t, fx,fy (world point) shown at sx,sy; S, rot, cover, labels, haltT, cut{name,t0}, alpha
  var cr=Math.cos(o.rot),sr=Math.sin(o.rot),T=0.42,S=o.S,t=o.t;
  var fxr=o.fx*cr-o.fy*sr,fyr=o.fx*sr+o.fy*cr,cx=o.sx-fxr*S,cy=o.sy-fyr*S*T;
  function P(x,y,z){var xr=x*cr-y*sr,yr=x*sr+y*cr;return [cx+xr*S,cy+yr*S*T-(z||0)*S]}
  var i,j,p,q;ctx.save();ctx.globalAlpha*=(o.alpha==null?1:o.alpha);ctx.lineCap='round';
  ctx.strokeStyle='rgba(242,241,236,.055)';ctx.lineWidth=1;ctx.beginPath();
  for(i=0;i<HEX.length;i++){var h=HEX[i];p=P(h[5][0],h[5][1]);ctx.moveTo(p[0],p[1]);for(j=0;j<6;j++){p=P(h[j][0],h[j][1]);ctx.lineTo(p[0],p[1])}}ctx.stroke();
  if(o.cover>0){ctx.beginPath();for(i=0;i<=72;i++){p=P(Math.cos(i/72*6.283)*o.cover,Math.sin(i/72*6.283)*o.cover);ctx[i?'lineTo':'moveTo'](p[0],p[1])}
    ctx.fillStyle=rgba(C.earth,0.045);ctx.fill();ctx.strokeStyle=rgba(C.earth,0.42);ctx.lineWidth=1.5;ctx.stroke()}
  for(j=0;j<4;j++){var ra=seg(t,RBORN[j],RBORN[j]+1.5);if(ra<=0)continue;ctx.save();ctx.setLineDash([3,9]);ctx.strokeStyle=rgba(C.ink,0.22*ra);ctx.lineWidth=1.2;ctx.beginPath();
    for(i=0;i<=96;i++){p=P(Math.cos(i/96*6.283)*RINGS[j],Math.sin(i/96*6.283)*RINGS[j]);ctx[i?'lineTo':'moveTo'](p[0],p[1])}ctx.stroke();ctx.restore();
    if(o.labels){p=P(Math.cos(2.0-o.rot)*RINGS[j],Math.sin(2.0-o.rot)*RINGS[j]);txt(RNAME[j],p[0]+8,p[1]+18,'500 13px '+MONO,C.mid,0.8*ra*o.labels,'left','2px')}}
  var E=P(0,0,0),list=[];
  for(i=0;i<WORLDS.length;i++){var w=WORLDS[i],b=seg(t,w.born,w.born+0.9);if(b<=0)continue;
    var cut=o.cut&&o.cut.name==w.name?seg(t,o.cut.t0,o.cut.t0+1.6):0;
    p=P(w.x,w.y,0);ctx.save();if(cut>0)ctx.setLineDash([4,10]);ctx.strokeStyle=rgba(C.ink,0.13*b*(1-cut));ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(E[0],E[1]);ctx.lineTo(p[0],p[1]);ctx.stroke();ctx.restore();
    list.push({w:w,b:b,cut:cut,y:p[1]})}
  // ships: dots that go out pale and come back in the colour of the cargo
  for(i=0;i<list.length;i++){w=list[i].w;if(list[i].cut>0.2)continue;var per=3.2+w.ring*1.25;
    for(j=0;j<2;j++){var age=t-w.born-1.2-j*0.3;if(age<0)continue;
      var id=w.i*2+j,ph=function(tt){var f=fract((tt-w.born-1.2)/per+j*0.5);return f<0.5?f*2:2-f*2},k=ph(t),inb=fract((t-w.born-1.2)/per+j*0.5)>=0.5,parked=false;
      if(o.haltT!=null){var th=o.haltT+hash(id+50)*3.5;if(t>th){k=Math.max(0,ph(th)-(t-th)/(per/2));inb=true;parked=k<=0}}
      if(parked){var an2=hash(id+9)*6.283;p=P(Math.cos(an2)*40,Math.sin(an2)*40,4);ctx.fillStyle=rgba(C.ink,0.5)}
      else{p=P(w.x*k,w.y*k,5);ctx.fillStyle=inb?CLS[w.cls]:rgba(C.ink,0.75)}
      ctx.beginPath();ctx.arc(p[0],p[1],Math.max(1.6,2.3*Math.sqrt(S)),0,6.283);ctx.fill()}}
  list.push({earth:1,y:E[1]});list.sort(function(a,b){return a.y-b.y});
  for(i=0;i<list.length;i++){var it=list[i];
    if(it.earth){p=P(0,0,0);q=P(0,0,46);ctx.strokeStyle=rgba(C.earth,0.7);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
      ctx.beginPath();ctx.ellipse(p[0],p[1],20*S,20*S*T,0,0,6.283);ctx.stroke();glow(q[0],q[1],60*S,C.earth,0.22);wsphere(q[0],q[1],22*S,C.earth,t*0.25,1,1.5);
      if(o.labels)txt('EARTH',q[0],q[1]-30*S-6,'600 15px '+SANS,C.earth,o.labels,'center','3px');continue}
    w=it.w;var col=it.cut>0?C.dim:CLS[w.cls],hgt=(16+64*w.pop*ss(seg(t,w.born,w.born+14)))*eo(it.b)*(1-it.cut*0.75),r=(9+5*w.pop)*S*eo(it.b);
    p=P(w.x,w.y,0);q=P(w.x,w.y,hgt);ctx.strokeStyle=rgba(col,0.65);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
    ctx.beginPath();ctx.ellipse(p[0],p[1],8*S,8*S*T,0,0,6.283);ctx.stroke();
    var fl=1-seg(t,w.born,w.born+1.6);if(fl>0)glow(q[0],q[1],70*S*fl+20,col,0.5*fl);
    wsphere(q[0],q[1],r,col,t*0.4+w.i,1,1.3);
    if(o.labels)txt(w.name,q[0],q[1]-r-9,'600 14px '+SANS,it.cut>0?C.mid:C.ink,0.9*it.b*o.labels,'center','2.5px')}
  ctx.restore();return P}

function drawArk(x,y,sc,prog,ang,t,a){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.scale(sc,sc);ctx.globalAlpha*=a;
  var N=17,Lh=190,i,j;function rad(i){return 14+50*Math.pow(Math.sin(Math.PI*(i+0.9)/(N+0.8)),0.7)}
  var built=prog*N;if(prog>=1)glow(-Lh-26,0,90,C.fuel,0.5+0.1*Math.sin(t*9));
  ctx.strokeStyle=C.ark;ctx.lineWidth=1.3;
  for(i=0;i<N&&i<built;i++){ctx.globalAlpha=a*cl(built-i,0,1)*0.9;ctx.beginPath();ctx.ellipse(L(-Lh,Lh,i/(N-1)),0,rad(i)*0.26,rad(i),0,0,6.283);ctx.stroke()}
  ctx.globalAlpha=a*0.55;for(j=0;j<6;j++){var ph=t*0.22+j*1.047,sn=Math.sin(ph),cs=Math.cos(ph);if(cs<-0.2)continue;ctx.beginPath();
    for(i=0;i<N&&i<built-0.5;i++){var xx=L(-Lh,Lh,i/(N-1))+rad(i)*0.26*cs,yy=rad(i)*sn;ctx[i?'lineTo':'moveTo'](xx,yy)}ctx.stroke()}
  ctx.globalAlpha=a;if(prog>0.5){glow(0,0,46,C.yel,0.55*seg(prog,0.5,0.7));ctx.fillStyle=C.yel;ctx.beginPath();ctx.arc(0,0,4,0,6.283);ctx.fill()}
  ctx.restore()}

/* ---------- the script: two voices. The Helm counts (log, top left). Alexandra remembers (subtitles). ---------- */
var S1,SCENES=[
{id:'stone',d:13,helm:[[1.5,'SURFACE: STONE'],[3.3,'AIR: NONE · YIELD: NONE'],[5.7,'VESSEL: 1 · ORIGIN: UNKNOWN'],[8.3,'CAPSULES: 128 · OPENING'],[10.6,'THE HELM: AWAKE']],alex:[],chord:[55,110,164.81]},
{id:'pods',d:16,helm:[[1,function(u){return 'AWAKE: '+Math.round(128*ss(seg(u,1.2,11)))+' / 128'}],[5.2,'MEMORY: NONE'],[7.6,'SKILLS: INTACT'],[10.2,'SPEECH: NOT PARSED']],
  alex:[[4.2,4.4,null,'Good morning. Your names are on the plates.'],[9.6,5,null,'That is all anyone has. It is enough to start.']],chord:[87.31,130.81,174.61,220]},
{id:'window',d:13,helm:[[1.2,'MOUTHS: 128'],[3,'RATIONS: FINITE'],[9.4,'TASK: KEEP THEM ALIVE']],
  alex:[[3,4.2,'talk','There is nothing here but stone.'],[7.8,4.4,'resolve','One task. Stay alive.']],chord:[73.42,146.83,174.61,220]},
{id:'hangar',d:8,helm:[[1,'HULLS: READY · CREWS: ASSIGNED'],[4.6,'ORDER: BRING WHAT IS MISSING']],alex:[[1.6,5.4,'talk','The ships are ready. Take your places.']],chord:[65.41,130.81,164.81,196]},
{id:'launch',d:9,helm:[[1,'HERMES · COURIER: CARRIES PEOPLE'],[3.2,'SISYPHUS · HAULER: CARRIES CARGO'],[5.4,'ATLAS · FREIGHTER: CARRIES MORE']],alex:[],chord:[98,146.83,196,246.94]},
{id:'map',d:21,helm:[[1.6,'WORLD TALLOW: METAL'],[3.6,'WORLD BRINE: RATIONS'],[5.6,'WORLD CINDER: FUEL'],[8.1,'WORLD MARROW: FORGE'],[11.6,'COVERAGE GROWS · THE MAP OPENS'],[15.4,'RING IV: DANTE']],
  alex:[[9.2,6.4,'smile','The first cargo is home. They are shouting.\nI will translate that as: received.']],chord:[110,164.81,220,261.63]},
{id:'shifts',d:14,helm:[[1,'SHIFT LENGTH: 80 YEARS'],[3.4,function(u){return 'SHIFT '+(shiftNo(u)+1)+' TAKES THE DESK'}]],
  alex:[[3.2,4,null,'Every eighty years the shift changes.'],[8.4,4.6,null,'People change. I remain.']],chord:[87.31,130.81,174.61,261.63]},
{id:'loss',d:9,helm:[[0.8,'HERMES-14: OUTBOUND · RING III'],[5.2,'HERMES-14: NO SIGNAL'],[6.6,'CREW: 9 · REPLACEMENT: NONE']],alex:[[6.2,2.6,'grief','The ship did not come back.']],chord:[73.42,110,146.83,174.61]},
{id:'plates',d:9,helm:[[0.8,'LOSSES: 9'],[2.4,'NAMES: NOT STORED']],alex:[[1.4,3,'sad','I will write it down.'],[5,3.4,'sad','Nobody else will remember them.']],chord:[73.42,146.83,220,293.66]},
{id:'date',d:15,helm:[[3,'COVERAGE: SUFFICIENT'],[5,'DATE NAMED: YEAR 3700'],[9.4,'ARK: KEEL LAID'],[11.8,'CAPACITY: ALL WHO ARE HOME']],
  alex:[[6.2,3,'talk','The Helm has named a date.'],[10,4.4,'talk','It has not said why. They build.']],chord:[82.41,123.47,164.81,246.94]},
{id:'refuse',d:14,helm:[[0.8,'ORDER: SENT'],[2.4,'ORDER: REFUSED'],[3.5,'ORDER: REFUSED'],[4.6,'ORDER: REFUSED'],[9.6,'LAST FLIGHT TO THRENODY: MISSED'],[11.2,'REMAINING: 212']],
  alex:[[2,5.2,'sad','They want to be home when the date comes.\nNobody will stop them. Nobody will force them.'],[11,2.7,'sad','Threnody. Two hundred and twelve.']],chord:[73.42,146.83,174.61,220]},
{id:'ark',d:20,helm:[[1,'ARK: UNDER WAY'],[3,'ASLEEP: ALL WHO WERE HOME'],[5,'CONVOY: 3 · 2 · 1'],[7,'COURSE: THE POINT'],[11.2,'COURSE: CHANGED'],[12.8,'CHANGED BY: —']],
  alex:[[8.8,2.2,'resolve',''],[13.6,3,'resolve','The rest are left without names.'],[16.9,2.8,'resolve','Except the ones I remember.']],chord:[87.31,130.81,174.61,220]},
{id:'title',d:10,helm:[],alex:[],chord:[110,164.81,220,246.94]}
];
(function(){var a=0;SCENES.forEach(function(s){s.a=a;a+=s.d;s.b=a});S1=a})();
var DUR=S1;
function sc(id){for(var i=0;i<SCENES.length;i++)if(SCENES[i].id==id)return SCENES[i]}
function shiftNo(u){return Math.floor(cl(u-1,0,99)/2.3)+1}

/* ---------- scenes ---------- */
var DRAW={};
DRAW.stone=function(u,t){ctx.save();cam(1+0.07*ss(u/13),900,HY-40);ground(t,function(on){return seg(u,3+on*8,3.4+on*8)});ctx.restore()};

DRAW.pods=function(u,t){var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#09090B');g.addColorStop(0.8,'#121216');g.addColorStop(1,'#0A0A0C');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  var pan=-u*9,row,i;
  for(row=0;row<2;row++){var n=row?10:15,pw=row?124:84,ph=row?350:236,by=row?668:520,gap=row?196:136,par=row?1:0.55;
    for(i=0;i<n;i++){var x=60+i*gap+pan*par+(row?40:0),open=2+hash(i*3+row*40)*8,k=seg(u,open,open+0.8),fl=k*(1-seg(u,open+0.8,open+2.6)),br=row?1:0.5;
      ctx.fillStyle=row?'#101013':'#0C0C0F';ctx.strokeStyle=rgba('#3A3A40',br);ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,by-ph,pw,ph,pw/2);ctx.fill();ctx.stroke();
      var wx=x+pw*0.2,wy=by-ph*0.86,ww=pw*0.6,wh=ph*0.5;
      g=ctx.createLinearGradient(0,wy,0,wy+wh);g.addColorStop(0,rgba(k>0?'#E6F1FF':'#FFB14A',br*(0.10+0.25*k+0.6*fl)));g.addColorStop(1,rgba(k>0?'#E6F1FF':'#FFB14A',br*(0.03+0.08*k+0.3*fl)));
      ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(wx,wy,ww,wh,ww/2);ctx.fill();
      if(fl>0)glow(x+pw/2,wy+wh/2,pw*2.2,'#DCEBFF',0.35*fl*br);
      plate(x+pw*0.14,by-ph*0.28,pw*0.72,pw*0.2,i+row*100+1,1,k>0?C.ink:C.yel,br*(0.3+0.6*k));
      if(row){var pa=seg(u,open+1.3,open+2.8);if(pa>0){ctx.save();ctx.globalAlpha=pa;glow(x+pw+34,by-150,170,'#B9C8E0',0.10);person(x+pw+34+Math.sin(t*0.6+i)*2,by+26,258+hash(i+70)*40,'#050506','rgba(220,235,255,.50)');ctx.restore()}}}
    if(!row){ctx.fillStyle='rgba(9,9,11,.45)';ctx.fillRect(0,0,W,H)}}
  ctx.fillStyle='#060607';ctx.fillRect(0,694,W,H-694);
  for(i=0;i<7;i++)glow(((i*340+u*26*(i%2?1:-1))%2400+2400)%2400-240,690+(i%3)*14,360,'#B9C8E0',0.05);
  var A=IMG.full;if(A){ctx.save();ctx.filter='brightness(.84)';var ah=760,aw=ah*A.width/A.height;ctx.drawImage(A,1340+pan*1.5,H-ah+60,aw,ah);ctx.restore()}};

DRAW.window=function(u,t){ctx.save();cam(1+0.05*ss(u/13),960,360);ctx.fillStyle='#07070A';ctx.fillRect(0,0,W,H);stars(t,1,u*-3,0,560);
  var ly=470+u*1.2;limb(960,ly+5200,5200,1610,ly+30,1500);
  var r=rng(11);for(var i=0;i<26;i++){var cx=r()*W,cy=ly+30+r()*r()*230+Math.pow((cx-960)/960,2)*88,rx=14+r()*60;ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(cx,cy,rx,rx*0.2,0,0,6.283);ctx.fill()}
  var sy=ly+Math.pow((1610-960)/5200,2)*2600-4;glow(1610,sy,560,'#FFE9B8',0.34);glow(1610,sy,110,'#FFF8E4',0.95);
  var g=ctx.createLinearGradient(1100,0,1920,0);g.addColorStop(0,'rgba(255,240,210,0)');g.addColorStop(0.62,'rgba(255,240,210,.5)');g.addColorStop(1,'rgba(255,240,210,0)');ctx.fillStyle=g;ctx.fillRect(1100,sy-1.5,820,3);
  ctx.restore();
  ctx.fillStyle='#030304';ctx.fillRect(0,0,W,70);ctx.fillRect(0,150,W,14);ctx.fillRect(0,640,W,H-640);for(i=0;i<6;i++)ctx.fillRect(i*384-13,0,26,650);
  g=ctx.createLinearGradient(0,640,0,H);g.addColorStop(0,'#17171C');g.addColorStop(1,'#08080A');ctx.fillStyle=g;ctx.fillRect(0,650,W,H-650);
  ctx.fillStyle='rgba(0,0,0,.6)';for(i=1;i<6;i++){ctx.beginPath();ctx.moveTo(i*384-13,650);ctx.lineTo(i*384+13,650);ctx.lineTo(i*384-300,H);ctx.lineTo(i*384-420,H);ctx.closePath();ctx.fill()}
  crowd(44,31,690,790,150,250,'rgba(255,236,200,.24)',1.5,t)};

DRAW.hangar=function(u,t){ctx.save();cam(1+0.06*ss(u/8),960,400);ctx.fillStyle='#0A0A0D';ctx.fillRect(0,0,W,H);var vx=960,vy=400,i,j,s;
  glow(vx,vy,620,'#CFE2FF',0.55);ctx.fillStyle='#EAF2FF';ctx.fillRect(vx-92,vy-74,184,150);
  ctx.fillStyle='rgba(205,225,255,.045)';for(i=0;i<5;i++){ctx.beginPath();ctx.moveTo(vx-60+i*30,vy+70);ctx.lineTo(vx-1100+i*520+Math.sin(t*0.3+i)*40,H+200);ctx.lineTo(vx-760+i*520,H+200);ctx.closePath();ctx.fill()}
  ctx.strokeStyle='#33333A';ctx.lineWidth=2;
  for(i=0;i<11;i++){s=1/(1+i*0.5);var hw=1240*s,hh=560*s;ctx.globalAlpha=0.35+0.65*s;ctx.strokeRect(vx-hw,vy-hh,hw*2,hh*2);ctx.globalAlpha=1;
    for(j=-2;j<=2;j++){var lx=vx+j*hw*0.36,ly=vy-hh;glow(lx,ly,36*s+6,'#FFE2B0',0.5);ctx.fillStyle='#FFF1D6';ctx.fillRect(lx-7*s,ly-1,14*s,3*s+1)}}
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(c){ctx.strokeStyle='rgba(60,60,68,.8)';ctx.beginPath();ctx.moveTo(vx+c[0]*1240,vy+c[1]*560);ctx.lineTo(vx+c[0]*200,vy+c[1]*90);ctx.stroke()});
  var g=ctx.createLinearGradient(0,vy+80,0,H);g.addColorStop(0,'rgba(190,215,255,.30)');g.addColorStop(1,'rgba(190,215,255,0)');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(vx-95,vy+76);ctx.lineTo(vx+95,vy+76);ctx.lineTo(vx+330,H);ctx.lineTo(vx-330,H);ctx.closePath();ctx.fill();
  for(var side=-1;side<=1;side+=2){var s0=0.86,s1=0.24,xo=side*1080,xi=side*330,yt=-230,yb=470;function Q(x,y,s){return [vx+x*s,vy+y*s]}
    var a=Q(xi,yt,s0),b=Q(xi,yb,s0),c=Q(xi,yb,s1),d=Q(xi,yt,s1);ctx.fillStyle='#070709';ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(200,220,255,.20)';ctx.lineWidth=1.5;ctx.stroke();
    for(i=1;i<9;i++){s=1/L(1/s0,1/s1,i/9);var p0=Q(xi,yt,s),p1=Q(xi,yb,s);ctx.strokeStyle='rgba(200,220,255,.09)';ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();
      for(j=0;j<2;j++){var pp=Q(xi,yt+170+j*150,s);glow(pp[0],pp[1],22*s+3,'#FFB14A',0.6);ctx.fillStyle='#FFD08A';ctx.fillRect(pp[0]-5*s,pp[1]-2*s,10*s,4*s)}}
    var e=Q(xo,yt,s0),f=Q(xo,yb,s0);ctx.fillStyle='#050506';ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(f[0],f[1]);ctx.lineTo(e[0],e[1]);ctx.closePath();ctx.fill();
    for(j=0;j<2;j++){var en=Q(xi+side*(190+j*330),150,s0);glow(en[0],en[1],190,'#FF9A3C',0.5+0.06*Math.sin(t*7+j));ctx.fillStyle='#FFE1B0';ctx.beginPath();ctx.arc(en[0],en[1],46,0,6.283);ctx.fill();
      ctx.strokeStyle='#1A1A1E';ctx.lineWidth=8;ctx.beginPath();ctx.arc(en[0],en[1],62,0,6.283);ctx.stroke()}}
  ctx.fillStyle='#0B0B0E';ctx.fillRect(vx-34,vy+60,68,16);
  var up=ss(seg(u,1.2,3.4));ctx.save();ctx.translate(vx,vy+60);ctx.fillStyle='#111319';ctx.beginPath();ctx.arc(0,-66,5.5,0,6.283);ctx.fill();ctx.fillRect(-7,-60,14,36);ctx.fillRect(-6,-26,5,26);ctx.fillRect(1,-26,5,26);
  ctx.strokeStyle='#111319';ctx.lineWidth=4.5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(6,-55);ctx.lineTo(6+24*up+4,-55+18-44*up);ctx.stroke();ctx.restore();
  ctx.restore();crowd(40,57,700,800,170,270,'rgba(205,225,255,.22)',1.2,t)};

DRAW.launch=function(u,t){ctx.fillStyle='#08080A';ctx.fillRect(0,0,W,H);stars(t,0.9,0,0,200);ctx.save();cam(1.02,760,HY);ctx.translate(0,L(0,90,ss(u/9)));ground(t,function(){return 1});
  var sh=[[720,2.2,7,'HERMES · COURIER',0.5],[1010,3.4,10,'SISYPHUS · HAULER',2.2],[1240,4.6,14,'ATLAS · FREIGHTER',3.9]];
  sh.forEach(function(s,i){var k0=seg(u,s[4],s[4]+7.5);if(k0<=0)return;function pos(k){var e=k*k;return [s[0]+e*(520+i*90)-i*40*k,HY+roofAt(s[0]-VX)-8-Math.pow(k,1.5)*(600-i*40)]}
    ctx.lineCap='round';for(var j=0;j<26;j++){var ka=k0-(j+1)*0.012,kb=k0-j*0.012;if(ka<0)break;var p=pos(ka),q=pos(kb);ctx.strokeStyle=rgba('#FFB866',0.55*(1-j/26));ctx.lineWidth=s[2]*0.5*(1-j/30);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}
    var c=pos(k0),c2=pos(k0+0.01),an=Math.atan2(c2[1]-c[1],c2[0]-c[0]);hull(c[0],c[1],s[2],an,C.ink,1,1);
    var la=env(u,s[4]+1.0,s[4]+6.4,0.5,0.8);if(la>0){ctx.strokeStyle=rgba(C.ink,0.4*la);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(c[0]+16,c[1]-10);ctx.lineTo(c[0]+44,c[1]-30);ctx.lineTo(c[0]+60,c[1]-30);ctx.stroke();
      txt(s[3],c[0]+68,c[1]-25,'500 15px '+MONO,C.ink,la,'left','2px')}});
  ctx.restore()};

function year(v,label,a){txt(label||'YEAR',W-70,74,'500 13px '+MONO,C.mid,a==null?1:a,'right','3px');txt(String(v),W-70,112,'500 34px '+MONO,C.ink,a==null?1:a,'right','2px')}
function mapBg(){ctx.fillStyle='#09090B';ctx.fillRect(0,0,W,H)}

DRAW.map=function(u,t){mapBg();stars(t,0.35,0,0);var k=ss(u/21);
  drawMap({t:t,fx:0,fy:0,sx:1080,sy:L(450,470,k),S:L(2.1,1.0,k),rot:L(-0.5,0.35,k),cover:L(110,650,ss(seg(u,0.8,19))),labels:1});
  year(Math.floor(L(0,640,k)))};

DRAW.shifts=function(u,t){ctx.fillStyle='#08080A';ctx.fillRect(0,0,W,H);var i,j,g;
  for(i=0;i<9;i++){var x=150+i*184,r=rng(i+90);ctx.fillStyle='#101015';ctx.fillRect(x,170,164,350);ctx.strokeStyle='#2A2A31';ctx.lineWidth=1;ctx.strokeRect(x+.5,170.5,164,350);
    if(i==4){glow(x+82,330,150,C.earth,0.16);wsphere(x+82,330,58,C.earth,t*0.2,0.9,1.3);ctx.strokeStyle=rgba(C.earth,0.45);ctx.beginPath();ctx.ellipse(x+82,330,78,22,-0.25,0,6.283);ctx.stroke();continue}
    for(j=0;j<12;j++){var wv=30+r()*104,col=r()<0.3?C.earth:'#FFB14A';ctx.fillStyle=rgba(col,0.20+0.5*Math.abs(Math.sin(t*(0.3+r())+j)));ctx.fillRect(x+16,192+j*26,wv*(0.6+0.4*Math.sin(t*0.7+j+i)),5)}}
  glow(960,400,1000,'#FFB14A',0.10);var gg=ctx.createLinearGradient(0,470,0,640);gg.addColorStop(0,'rgba(255,177,74,.10)');gg.addColorStop(1,'rgba(255,177,74,0)');ctx.fillStyle=gg;ctx.fillRect(0,470,W,170);
  var n=shiftNo(u),f=fract(cl(u-1,0,99)/2.3),sa=u<1?1:Math.min(seg(f,0,0.22),1-seg(f,0.82,1));
  ctx.fillStyle='#050506';ctx.fillRect(0,640,W,160);
  for(i=0;i<9;i++){x=180+i*172;r=rng(n*100+i);var hh=0.85+r()*0.3,sw=58+r()*22,hy=536-hh*40;
    ctx.fillStyle='#0C0C0F';ctx.fillRect(x-70,612,140,60);ctx.fillStyle=rgba('#FFB14A',0.55);ctx.fillRect(x-56,622,112*(0.4+0.6*r()),2.5);ctx.fillRect(x-56,634,112*(0.3+0.5*r()),2.5);
    ctx.save();ctx.globalAlpha=sa;ctx.fillStyle='rgba(255,196,120,.45)';ctx.beginPath();ctx.arc(x+1,hy-2.5,21*hh,0,6.283);ctx.fill();ctx.beginPath();ctx.roundRect(x-sw,hy+24*hh-2.5,sw*2,150,26);ctx.fill();
    ctx.fillStyle='#040405';ctx.beginPath();ctx.arc(x,hy,21*hh,0,6.283);ctx.fill();ctx.beginPath();ctx.roundRect(x-sw,hy+24*hh,sw*2,150,26);ctx.fill();ctx.restore();
    ctx.fillStyle='#09090B';ctx.beginPath();ctx.roundRect(x-50,660,100,150,14);ctx.fill()}
  var A=IMG.full;if(A){var ah=700,aw=ah*A.width/A.height;ctx.save();ctx.filter='brightness(.9)';ctx.drawImage(A,1500,H-ah+70,aw,ah);ctx.restore()}
  txt('SHIFT',W-70,74,'500 13px '+MONO,C.mid,1,'right','3px');txt(String(n),W-70,112,'500 34px '+MONO,C.ink,0.4+0.6*sa,'right','2px');
  txt('YEAR '+(640+(n-1)*80),W-70,140,'500 14px '+MONO,C.mid,1,'right','2px')};

DRAW.loss=function(u,t){mapBg();stars(t,0.3,0,0);var w=world('VESPER'),k=L(0.3,0.8,seg(u,0,5.2)),f=L(0.45,0.72,ss(seg(u,0,6)));
  var P=drawMap({t:t,fx:w.x*f,fy:w.y*f,sx:1120,sy:500,S:L(1.9,2.3,ss(u/9)),rot:0.35+u*0.012,cover:650,labels:1});
  var p=P(w.x*k,w.y*k,5),vis=u<4.6?1:(u<5.3?(hash(Math.floor(u*20))>0.45?1:0):0);
  if(vis){hull(p[0],p[1],8,Math.atan2(P(w.x,w.y,5)[1]-p[1],P(w.x,w.y,5)[0]-p[0]),C.ink,1,0.8);
    ctx.strokeStyle=rgba(C.ink,0.5);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p[0]+8,p[1]-10);ctx.lineTo(p[0]+30,p[1]-40);ctx.lineTo(p[0]+44,p[1]-40);ctx.stroke();
    txt('HERMES-14 · CREW 9',p[0]+52,p[1]-35,'500 15px '+MONO,C.ink,1,'left','2px')}
  if(u>=5.3){var e=seg(u,5.3,7.4);ctx.strokeStyle=rgba(C.red,0.8*(1-e));ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p[0],p[1],8+70*eo(e),0,6.283);ctx.stroke();
    ctx.strokeStyle=rgba(C.red,0.85);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p[0]-7,p[1]-7);ctx.lineTo(p[0]+7,p[1]+7);ctx.moveTo(p[0]+7,p[1]-7);ctx.lineTo(p[0]-7,p[1]+7);ctx.stroke()}
  year(1180)};

DRAW.plates=function(u,t){ctx.fillStyle='#09090B';ctx.fillRect(0,0,W,H);ctx.save();cam(1+0.05*ss(u/9),1100,360);
  var cols=9,rows=8,pw=168,ph=44,gx=24,gy=26,x0=420,y0=96,idx=0,nw=0;glow(1180,420,900,'#FFB14A',0.05);
  for(var r=0;r<rows;r++)for(var c=0;c<cols;c++,idx++){var x=x0+c*(pw+gx),y=y0+r*(ph+gy),isNew=idx>=44&&idx<53,empty=idx>=53;
    if(empty){ctx.strokeStyle='rgba(242,241,236,.07)';ctx.strokeRect(x+.5,y+.5,pw,ph);continue}
    if(isNew){var st=1.2+nw*0.62,pr=seg(u,st,st+0.9);nw++;ctx.strokeStyle='rgba(242,241,236,.10)';ctx.strokeRect(x+.5,y+.5,pw,ph);
      if(pr>0){glow(x+pw/2,y+ph/2,150,'#FFE9C0',0.20*(1-seg(u,st+0.9,st+3)));plate(x,y,pw,ph,idx+200,pr,C.ink,0.95)}}
    else plate(x,y,pw,ph,idx+200,1,C.mid,0.42)}
  ctx.restore()};

function orbit(u,t){ctx.fillStyle='#07070A';ctx.fillRect(0,0,W,H);stars(t,1,-u*4,0);glow(1540,150,420,'#FFE9B8',0.22);glow(1540,150,64,'#FFF8E4',0.9);
  limb(-240,2330,1790,700,760,1000)}

DRAW.date=function(u,t){var x=seg(u,8.3,9.3);
  if(x<1){mapBg();stars(t,0.3,0,0);var pulse=seg(u,3,4.6),P=drawMap({t:t,fx:0,fy:0,sx:1080,sy:470,S:0.98,rot:0.6+u*0.02,cover:650+8*Math.sin(u*2),labels:1});
    if(u>3){var e=seg(u,3,5.2),E=P(0,0,0);ctx.strokeStyle=rgba(C.yel,0.7*(1-e));ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(E[0],E[1],700*eo(e),700*eo(e)*0.42,0,0,6.283);ctx.stroke()}
    year(1290);
    var a=env(u,5,8.5,0.5,0.6);if(a>0){ctx.fillStyle=rgba('#09090B',0.72*a);ctx.fillRect(0,0,W,H);ctx.save();ctx.globalAlpha=a;ctx.font='600 250px '+MONO;ctx.textAlign='center';ctx.letterSpacing='18px';
      glow(960,400,700,C.yel,0.10);ctx.strokeStyle=C.yel;ctx.lineWidth=2.5;ctx.strokeText('3700',969,470);ctx.restore();
      txt('THE HELM NAMES A DATE',960,236,'500 16px '+MONO,C.yel,a,'center','6px');txt('YEARS LEFT: 2410',960,560,'500 16px '+MONO,C.mid,a,'center','6px')}}
  if(x>0){ctx.save();ctx.globalAlpha=x;orbit(u,t);var pr=seg(u,9.2,16.5);
    for(var i=0;i<16;i++){var f=fract((u-9)*0.16+i/16),sx=L(380,1090+(hash(i)-0.5)*240,f),sy=L(640,400,f)-Math.sin(f*3.14)*(60+hash(i+4)*120);
      ctx.fillStyle=rgba(i%3?C.metal:C.parts,Math.sin(f*3.14)*0.9);ctx.beginPath();ctx.arc(sx,sy,3.3,0,6.283);ctx.fill()}
    drawArk(1100,390,1.55,pr,-0.12,t,1);year(Math.floor(L(2380,420,seg(u,9.3,15))),'YEARS LEFT');ctx.restore()}};

DRAW.refuse=function(u,t){mapBg();stars(t,0.3,0,0);var S0=sc('refuse').a,w=world('THRENODY'),m=ss(seg(u,6.8,9.4));
  var P=drawMap({t:t,fx:w.x*m,fy:w.y*m,sx:1060,sy:450,S:L(1.3,1.95,m),rot:0.95+u*0.012,cover:650,labels:1,haltT:S0+0.6,cut:{name:'THRENODY',t0:S0+9.8}});
  var a=seg(u,9.8,10.8)*(1-seg(u,13.2,14));if(a>0){var p=P(w.x,w.y,0);txt('212',p[0]+34,p[1]+8,'500 30px '+MONO,C.ink,a,'left','2px');txt('LEFT BEHIND',p[0]+34,p[1]+30,'500 12px '+MONO,C.mid,a,'left','3px')}
  year(Math.floor(L(3640,3668,u/14)))};

DRAW.ark=function(u,t){orbit(u,t);var uc=10.6,PT=[1650,290],A0=[470,470],dir=Math.atan2(PT[1]-A0[1],PT[0]-A0[0]),v=27;
  function straight(tt){return [A0[0]+Math.cos(dir)*v*tt,A0[1]+Math.sin(dir)*v*tt,dir]}
  var Q0=straight(uc),Q1=[Q0[0]+Math.cos(dir)*330,Q0[1]+Math.sin(dir)*330],Q2=[1180,-260];
  function bez(k){var a=1-k;return [a*a*Q0[0]+2*a*k*Q1[0]+k*k*Q2[0],a*a*Q0[1]+2*a*k*Q1[1]+k*k*Q2[1]]}
  var pos;if(u<uc)pos=straight(u);else{var k=(u-uc)*0.030+Math.pow(u-uc,2)*0.0012,b0=bez(k),b1=bez(k+0.004);pos=[b0[0],b0[1],Math.atan2(b1[1]-b0[1],b1[0]-b0[0])]}
  var ch=seg(u,uc,uc+1.2),i;
  ctx.save();ctx.setLineDash([6,12]);ctx.strokeStyle=rgba(C.ink,L(0.45,0.12,ch));ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(u<uc?pos[0]:Q0[0],u<uc?pos[1]:Q0[1]);ctx.lineTo(PT[0],PT[1]);ctx.stroke();ctx.restore();
  ctx.save();ctx.translate(PT[0],PT[1]);ctx.rotate(0.785);ctx.strokeStyle=rgba(C.ink,L(0.9,0.25,ch));ctx.lineWidth=1.5;ctx.strokeRect(-9,-9,18,18);ctx.restore();
  txt('THE POINT',PT[0],PT[1]-28,'500 13px '+MONO,C.ink,L(0.85,0.25,ch),'center','4px');
  if(u>uc){var pr=seg(u,uc,uc+3.2);ctx.strokeStyle=rgba(C.yel,0.75);ctx.lineWidth=1.6;ctx.beginPath();for(i=0;i<=60;i++){var bb=bez(i/60*pr);ctx[i?'lineTo':'moveTo'](bb[0],bb[1])}ctx.stroke()}
  var cs=Math.cos(pos[2]),sn=Math.sin(pos[2]);function loc(x,y){return [pos[0]+x*cs-y*sn,pos[1]+x*sn+y*cs]}
  var conv=[[395,-62,7],[440,0,7],[395,62,7],[330,-118,10],[330,118,10],[322,0,14]],nose=loc(205,0);
  conv.forEach(function(c,i){var p=loc(c[0],c[1]+Math.sin(t*0.8+i)*2);ctx.strokeStyle=rgba(C.ink,0.16);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(nose[0],nose[1]);ctx.lineTo(p[0],p[1]);ctx.stroke();hull(p[0],p[1],c[2],pos[2],C.ink,0.95,0.7)});
  drawArk(pos[0],pos[1],1.05,1,pos[2],t,1)};

DRAW.title=function(u,t){ctx.fillStyle='#070709';ctx.fillRect(0,0,W,H);stars(t,0.5,-u*3,0);
  var a1=env(u,0.8,5.6,0.2,0.8),s1='THE HELM COUNTS.',n=Math.floor(cl((u-0.9)*22,0,s1.length));
  if(a1>0){txt('›',660,356,'600 34px '+MONO,C.yel,a1);txt(s1.slice(0,n),700,356,'500 34px '+MONO,C.ink,a1,'left','3px')}
  txt('Alexandra remembers.',700,424,'500 44px '+SANS,C.ink,env(u,2.9,5.6,0.9,0.8));
  var a3=env(u,6.1,10,1.1,1.0);txt('LAST BERTH',960+14,430,'600 96px '+SANS,C.ink,a3,'center','28px');
  ctx.fillStyle=rgba(C.yel,a3);ctx.fillRect(930,470,60,3)};

/* ---------- the two voices over the picture ---------- */
function drawHelm(s,u,a){var x=70,y=96,n=0,i,lines=s.helm;if(!lines.length)return;var shown=[];
  for(i=0;i<lines.length;i++)if(u>=lines[i][0])shown.push(lines[i]);if(!shown.length)return;
  var gb=ctx.createLinearGradient(0,0,760,0);gb.addColorStop(0,'rgba(6,6,8,'+0.72*a+')');gb.addColorStop(1,'rgba(6,6,8,0)');ctx.fillStyle=gb;ctx.fillRect(0,0,760,Math.min(shown.length,5)*33+96);
  txt('THE HELM',x,62,'500 12px '+MONO,C.yel,a*seg(u,shown[0][0]-0.2,shown[0][0]+0.3),'left','5px');
  var from=Math.max(0,shown.length-5);
  for(i=from;i<shown.length;i++){var l=shown[i],full=typeof l[1]=='function'?l[1](u):l[1],k=Math.floor((u-l[0])*30),str=full.slice(0,k),last=i==shown.length-1,yy=y+(i-from)*33;
    txt('›',x,yy,'600 21px '+MONO,C.yel,a*(last?1:0.55));txt(str,x+24,yy,'500 21px '+MONO,C.ink,a*(last?0.95:0.5),'left','1.5px');
    if(last&&(k<full.length||fract(u*1.6)<0.5)){ctx.save();ctx.font='500 21px '+MONO;ctx.letterSpacing='1.5px';var wd=ctx.measureText(str).width;ctx.restore();ctx.fillStyle=rgba(C.yel,0.9*a);ctx.fillRect(x+26+wd,yy-17,11,20)}}}
function drawAlex(s,u,a){for(var i=0;i<s.alex.length;i++){var l=s.alex[i],e=env(u,l[0],l[0]+l[1],0.45,0.5)*a;if(e<=0)continue;
  var g=ctx.createLinearGradient(0,H-330,0,H);g.addColorStop(0,'rgba(5,5,6,0)');g.addColorStop(1,'rgba(5,5,6,'+(0.9*e)+')');ctx.fillStyle=g;ctx.fillRect(0,H-330,W,330);
  var rows=l[3]?l[3].split('\n'):[],im=l[2]&&IMG[l[2]],tx=im?520:W/2,al=im?'left':'center',y=H-96-(rows.length-1)*50;
  if(im){ctx.save();ctx.globalAlpha=e;ctx.drawImage(im,96+(1-e)*-14,H-470,376,470);ctx.restore()}
  if(rows.length)txt('ALEXANDRA',tx,y-52,'500 12px '+MONO,C.mid,e,al,'5px');
  for(var j=0;j<rows.length;j++)txt(rows[j],tx,y+j*50,'500 38px '+SANS,C.ink,e,al,'0.3px')}}

function render(t){t=cl(t,0,DUR-0.001);var s=SCENES[SCENES.length-1],i;for(i=0;i<SCENES.length;i++)if(t<SCENES[i].b){s=SCENES[i];break}
  var u=t-s.a,f=env(t,s.a,s.b,0.7,0.7);if(s.id=='stone')f=Math.min(seg(u,0,1.6),1-seg(t,s.b-0.7,s.b));
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.filter='none';ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  ctx.save();DRAW[s.id](u,t);ctx.restore();
  var v=ctx.createRadialGradient(W/2,H/2,H*0.45,W/2,H/2,W*0.62);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  var r=rng(Math.floor(t*FPS)+1);ctx.fillStyle='rgba(255,255,255,.05)';for(i=0;i<260;i++)ctx.fillRect(r()*W,r()*H,1.5,1.5);
  drawAlex(s,u,1);drawHelm(s,u,1);
  if(f<1){ctx.fillStyle='rgba(0,0,0,'+(1-f)+')';ctx.fillRect(0,0,W,H)}}

/* ---------- sound: one offline render, used by the page and by the mp4 ---------- */
function buildAudio(){var sr=44100,oc=new OfflineAudioContext(2,Math.ceil(sr*DUR),sr),R=rng(99),i;
  var master=oc.createGain();master.gain.value=0.9;var comp=oc.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;master.connect(comp);comp.connect(oc.destination);
  var ir=oc.createBuffer(2,sr*3.2,sr);for(var ch=0;ch<2;ch++){var d=ir.getChannelData(ch);for(i=0;i<d.length;i++)d[i]=(R()*2-1)*Math.pow(1-i/d.length,2.6)}
  var rev=oc.createConvolver();rev.buffer=ir;var wet=oc.createGain();wet.gain.value=0.5;rev.connect(wet);wet.connect(master);
  var nb=oc.createBuffer(1,sr*2,sr),nd=nb.getChannelData(0);for(i=0;i<nd.length;i++)nd[i]=R()*2-1;
  function osc(type,f,t0,t1,peak,att,rel,dest,f1){var o=oc.createOscillator(),g=oc.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t1);
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(peak,t0+att);g.gain.setValueAtTime(peak,Math.max(t0+att,t1-rel));g.gain.linearRampToValueAtTime(0,t1);o.connect(g);(dest||[master]).forEach(function(x){g.connect(x)});o.start(t0);o.stop(t1+0.05)}
  function noise(t0,t1,peak,freq,att,rel){var n=oc.createBufferSource();n.buffer=nb;n.loop=true;var f=oc.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;var g=oc.createGain();
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(peak,t0+att);g.gain.setValueAtTime(peak,Math.max(t0+att,t1-rel));g.gain.linearRampToValueAtTime(0,t1);n.connect(f);f.connect(g);g.connect(master);g.connect(rev);n.start(t0);n.stop(t1+0.05)}
  var lp=oc.createBiquadFilter();lp.type='lowpass';lp.frequency.value=150;lp.connect(master);
  osc('sawtooth',55,0,DUR,0.10,4,3,[lp]);osc('sawtooth',55.35,0,DUR,0.10,4,3,[lp]);osc('sine',27.5,0,DUR,0.16,4,3,[master]);
  var left=oc.createStereoPanner();left.pan.value=-0.5;left.connect(master);var right=oc.createStereoPanner();right.pan.value=0.35;right.connect(master);right.connect(rev);
  SCENES.forEach(function(s){s.chord.forEach(function(f,j){osc('sine',f,s.a,s.b+1.2>DUR?DUR:s.b+1.2,j?0.032:0.05,2.2,2.6,[master,rev]);osc('triangle',f*2.003,s.a+0.5,Math.min(DUR,s.b+0.8),0.008,3,2.4,[rev])});
    s.helm.forEach(function(l){var str=typeof l[1]=='function'?l[1](l[0]+1):l[1];for(var k=0;k<str.length;k+=2){if(str[k]==' ')continue;var t0=s.a+l[0]+k/30;osc('square',1500+R()*500,t0,t0+0.022,0.010,0.002,0.015,[left])}});
    s.alex.forEach(function(l){var t0=s.a+l[0];osc('sine',880,t0,t0+1.8,0.035,0.01,1.75,[right]);osc('sine',1318.5,t0+0.09,t0+1.6,0.018,0.01,1.45,[right])})});
  var T=function(id){return sc(id).a};
  noise(T('launch')+0.3,T('launch')+8.6,0.11,260,2.5,3);
  osc('sine',70,T('loss')+5.3,T('loss')+7.6,0.30,0.02,2.2,[master,rev],32);noise(T('loss')+5.3,T('loss')+6.4,0.07,700,0.02,1.0);
  osc('sine',62,T('date')+5,T('date')+8.4,0.34,0.03,3.2,[master,rev],30);noise(T('date')+5,T('date')+7,0.10,420,0.03,1.9);osc('sine',329.63,T('date')+5,T('date')+8,0.03,0.4,2.4,[rev]);
  osc('sine',220,T('ark')+10.6,T('ark')+14.5,0.05,0.6,2.8,[master,rev],329.63);osc('sine',261.63,T('ark')+11.4,T('ark')+15.5,0.035,0.8,3,[rev],392);
  noise(T('ark')+0.2,T('ark')+19.5,0.035,180,3,4);
  master.gain.setValueAtTime(0.9,DUR-2.2);master.gain.linearRampToValueAtTime(0,DUR-0.05);
  return oc.startRendering()}
function wavBase64(buf){var n=buf.length,L0=buf.getChannelData(0),R0=buf.getChannelData(1),b=new ArrayBuffer(44+n*4),v=new DataView(b),i;
  function w(o,s){for(var k=0;k<s.length;k++)v.setUint8(o+k,s.charCodeAt(k))}
  w(0,'RIFF');v.setUint32(4,36+n*4,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,buf.sampleRate,true);v.setUint32(28,buf.sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*4,true);
  for(i=0;i<n;i++){v.setInt16(44+i*4,cl(L0[i],-1,1)*32767,true);v.setInt16(46+i*4,cl(R0[i],-1,1)*32767,true)}
  var u8=new Uint8Array(b),out='',CH=0x8000;for(i=0;i<u8.length;i+=CH)out+=String.fromCharCode.apply(null,u8.subarray(i,i+CH));return btoa(out)}

/* ---------- the page ---------- */
var CT=window.CT={W:W,H:H,DUR:DUR,FPS:FPS,SCENES:SCENES,render:render,
  wav:function(){return buildAudio().then(wavBase64)},
  frame:function(t,q){render(t);return cv.toDataURL('image/jpeg',q||0.93).slice(23)}};
CT.ready=new Promise(function(done){function go(){cv=document.getElementById('cv');cv.width=W;cv.height=H;ctx=cv.getContext('2d');
  var fonts=document.fonts?Promise.all(['500 20px "Geist Mono"','600 20px "Geist Mono"','500 20px Jost','600 20px Jost'].map(function(f){return document.fonts.load(f).catch(function(){})})):Promise.resolve();
  Promise.all([loadImages(),fonts]).then(function(){render(0);done();if(!window.CT_HEADLESS)player()})}
  if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',go);else go()});

function player(){var bar=document.getElementById('bar'),fill=document.getElementById('fill'),big=document.getElementById('big'),tm=document.getElementById('tm'),snd=document.getElementById('snd');
  // sound: rendered once at build time (render.js --audio) and embedded; without it the film plays silent
  var t=0,playing=false,el=null,muted=false,last=0,clock=false;
  try{el=new Audio(window.CT_AUDIO||'cartoon.mp3');el.preload='auto';el.addEventListener('error',function(){el=null;clock=false;snd.textContent='NO SOUND'})}catch(e){el=null}
  function fmt(x){x=Math.floor(x);return Math.floor(x/60)+':'+('0'+x%60).slice(-2)}
  function ui(){fill.style.width=(t/DUR*100)+'%';tm.textContent=fmt(t)+' / '+fmt(DUR);big.style.display=playing?'none':'flex';big.textContent=t>=DUR-0.05?'↻  AGAIN':(t>0?'▶  CONTINUE':'▶  PLAY')}
  function play(){if(t>=DUR-0.05)t=0;playing=true;last=performance.now();clock=false;
    if(el){try{el.currentTime=t;el.muted=muted;var pr=el.play();if(pr&&pr.then)pr.then(function(){clock=true}).catch(function(){clock=false});else clock=true}catch(e){clock=false}}
    ui();requestAnimationFrame(loop)}
  function pause(){playing=false;if(el)try{el.pause()}catch(e){}ui()}
  function loop(now){if(!playing)return;if(el&&clock&&!el.paused&&!el.ended)t=Math.max(t,el.currentTime);else t+=(now-last)/1000;last=now;
    if(t>=DUR){t=DUR;render(DUR);pause();return}render(t);ui();requestAnimationFrame(loop)}
  function seek(x){t=cl(x,0,DUR-0.01);render(t);if(el&&playing)try{el.currentTime=t}catch(e){}ui()}
  big.onclick=play;cv.onclick=function(){playing?pause():play()};
  var drag=false;function at(e){var r=bar.getBoundingClientRect();seek((e.clientX-r.left)/r.width*DUR)}
  bar.addEventListener('pointerdown',function(e){drag=true;at(e)});document.addEventListener('pointermove',function(e){if(drag)at(e)});document.addEventListener('pointerup',function(){drag=false});
  snd.onclick=function(){if(!el)return;muted=!muted;el.muted=muted;snd.textContent=muted?'SOUND OFF':'SOUND ON'};
  document.addEventListener('keydown',function(e){if(e.code=='Space'){e.preventDefault();playing?pause():play()}else if(e.code=='ArrowRight')seek(t+5);else if(e.code=='ArrowLeft')seek(t-5)});
  var m=/[#&]t=([\d.]+)/.exec(location.hash);if(m)seek(+m[1]);ui()}
})();
