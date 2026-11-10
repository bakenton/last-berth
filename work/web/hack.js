/* THE HACK — the Helm wakes the crew of what was just won (Nikita, 04.11: «мини игра, которая появляется, когда ты открываешь новое
   поколение двигателя + думаю за уровень ковчега надо тоже»). A port of the serpent of design/hack-v4.html (variant 1, 02.11):
   the swarm is gone (Nikita, 04.11: «только змей»). The ladder of 6 levels is the prototype's, number for number.
   The page's last scripts: ui.js opens it (hackCheck) when the core has a hack waiting (G.hackQ, core.js «the hack»); the core
   only learns of the win (hackWin). Losing costs nothing and there is no way around it; NOT NOW closes it and the generation or
   ark level waits. All the words come from the texts table through o.T (keys hk_*): no game text here.
   window.LBhack: open(o) · isOpen() · state() · sim(level,seed,bot,maxT) for the bots · cheat() — the scenarios' win. */
(function(){
'use strict';
if(window.LBhack) return;

var HP=3, SPEED=300, FIRE=.09, SHOT=900, INV=1.2, R_ME=5, TAU=Math.PI*2, GS=60;
function rng(seed){ var s=(seed>>>0)||1; return function(){ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296 } }
function clamp(v,a,b){ return v<a?a:v>b?b:v }
function dist(a,b,c,d){ return Math.hypot(a-c,b-d) }
function angDiff(a,b){ return ((a-b+Math.PI)%TAU+TAU)%TAU-Math.PI }
var COARSE=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
var AW=960, AH=600, G=null, O=null, lv=1, attempt=0, OPEN=false, SIM=false, MODE='serpent', S3=Math.sqrt(3);   // v5.09: MODE 'serpent' (a drive mark) or 'hive' (the ark)
var input={mx:0,my:0,ax:480,ay:300,auto:COARSE,world:false};

/* the ladder: one new thing on each level (design/hack-v4.html; bot wins of 60: 60 · 59 · 55 · 51 · 34 · 22) */
var LV={
 1:{n:5,sHp:4,hHp:10,sp:92,spUp:4,turn:1.4,every:0,bs:150,red:0,redN:0,lead:0,ter:['post','post','bar','bar','post'],mud:0,mEvery:0,mCap:0,drop:0,sp2:90,dash:0,split:0,gun:0},
 2:{n:6,sHp:4,hHp:10,sp:98,spUp:4,turn:1.45,every:1.3,bs:150,red:0,redN:0,lead:0,ter:['ell','bar','bar','post','post','post'],mud:0,mEvery:0,mCap:0,drop:0,sp2:90,dash:0,split:0,gun:0},
 3:{n:6,sHp:4,hHp:10,sp:102,spUp:4,turn:1.5,every:1.6,bs:155,red:0,redN:0,lead:0,ter:['ell','ell','bar','post','post','post'],mud:0,mEvery:2.6,mCap:4,drop:1,sp2:95,dash:0,split:0,gun:0},
 4:{n:7,sHp:3,hHp:10,sp:106,spUp:4,turn:1.55,every:1.5,bs:160,red:0,redN:0,lead:0,ter:['long','ell','bar','post','post','post'],mud:3,mEvery:2.3,mCap:5,drop:1,sp2:100,dash:.25,split:0,gun:0},
 5:{n:7,sHp:3,hHp:10,sp:106,spUp:4,turn:1.55,every:1.6,bs:155,red:10,redN:2,lead:0,ter:['long','ell','bar','bar','post','post'],mud:3,mEvery:2.6,mCap:4,drop:1,sp2:98,dash:.2,split:.15,gun:0},
 6:{n:7,sHp:3,hHp:10,sp:110,spUp:4,turn:1.65,every:1.5,bs:160,red:8.5,redN:3,lead:.2,ter:['long','long','tee','ell','post','post','post'],mud:4,mEvery:2.4,mCap:5,drop:1,sp2:100,dash:.2,split:.15,gun:.1}};
var TOP=6;

function newRun(seed){
  attempt++; orient();
  G={P:MODE==='hive'?hiveP(lv):LV[lv],t:0,state:'play',rnd:rng(seed||((O&&O.seed)||1)*7+104729*lv+attempt*2731),hitstop:0,shake:0,glitch:0,
     WW:AW,WH:AH,cam:{x:0,y:0},me:{x:AW/2,y:AH-70,hp:HP,inv:1,fire:0,ang:-Math.PI/2},
     shots:[],bul:[],en:[],walls:[],zones:[],fx:[],spark:0,dieT:0,dx:0,dy:0};
  (MODE==='hive'?initHive:init)(G,G.P); camera();
}
function orient(){ var p=innerHeight>innerWidth; AW=p?600:960; AH=p?960:600 }
function bullet(x,y,a,sp,k){ G.bul.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,k:k}) }
function aimed(x,y,tx,ty,n,spr,sp,k){ var a=Math.atan2(ty-y,tx-x), side=G.rnd()<.5?-1:1; for(var q=0;q<n;q++){ var o=n%2?(q-(n-1)/2):(q-(n/2-1))*side; bullet(x,y,a+o*spr,sp,k) } }
function burst(x,y,col,n,sp){ for(var i=0;i<n;i++){ var a=G.rnd()*TAU, s=sp*(.3+G.rnd()*.7); G.fx.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:0,life:.3+G.rnd()*.4,col:col}) } }
function wallAt(x,y,pad){ pad=pad||0; for(var i=0;i<G.walls.length;i++){ var w=G.walls[i]; if(x>w.x-pad&&x<w.x+w.w+pad&&y>w.y-pad&&y<w.y+w.h+pad) return w } return null }
function los(x0,y0,x1,y1){ var d=dist(x0,y0,x1,y1), n=Math.ceil(d/12); for(var i=1;i<n;i++){ if(wallAt(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n)) return false } return true }
function hurt(){
  var m=G.me; if(m.inv>0||G.state!=='play') return;
  m.hp--; m.inv=INV; G.hitstop=.09; G.shake=14; G.glitch=.3; beep(90,.25,.07,'sawtooth');
  burst(m.x,m.y,'#F2F1EC',16,260);
  G.bul=G.bul.filter(function(b){ return dist(b.x,b.y,m.x,m.y)>130 });
  if(m.hp<=0) lose();
}
function lose(){ G.state='lost'; burst(G.me.x,G.me.y,'#FF2A1A',40,380); onEnd('lost') }
function win(x,y){ G.dx=x; G.dy=y; G.dieT=1.2; G.state='dying'; G.bul.forEach(function(b){ burst(b.x,b.y,b.k==='r'?'#FF2A1A':'#FF8A1F',1,90) }); G.bul=[]; G.en=[]; G.zones=[]; G.shake=22; G.glitch=.6; beep(60,.9,.09,'sawtooth') }
function kill(e){ var i=G.en.indexOf(e); if(i>=0) G.en.splice(i,1); burst(e.x,e.y,e.goal?'#F2F1EC':'#C9CFD6',e.goal?26:12,e.goal?340:240); if(e.goal){ G.hitstop=.05; G.shake=8; beep(150,.2,.06,'sawtooth') } else beep(240,.08,.04); onKill(G,e) }
function hitEnemy(e){ e.hp--; e.flash=.07; G.spark++; if(G.spark%3===0) beep(320+200*(1-e.hp/(e.max||e.hp||1)),.03,.018); if(G.state==='play'&&e.hp<=0) kill(e) }

function enemy(o){ o.flash=0; o.max=o.hp; o.tell=0; o.seen=0; o.rot=0; G.en.push(o); return o }
function turret(x,y,hp,every,n,sp,o){ o=o||{}; o.kind='turret'; o.x=x; o.y=y; o.r=o.r||16; o.hp=hp; o.every=every; o.n=n; o.sp=sp; o.fire=o.fire||(.8+G.rnd()*every); return enemy(o) }
function chaser(x,y,sp,o){ o=o||{}; o.kind=o.kind||'chaser'; if(G.grid&&wallAt(x,y,8)){ var fc=nearFree(G,x,y); x=cellX(fc); y=cellY(fc) } o.x=x; o.y=y; o.r=o.r||10; o.hp=o.hp||3; o.sp=sp; o.touch=1; o.die1=1; return enemy(o) }
function step1(e,dx,dy){ var p=e.r*.4; if(!wallAt(e.x+dx,e.y,p)) e.x+=dx; if(!wallAt(e.x,e.y+dy,p)) e.y+=dy }   // a step that slides along walls
var AI={
 turret:function(e,dt){ var t=G.me; e.fire-=dt; e.tell=clamp(1-e.fire/.35,0,1);
   if(e.fire<=0){ if((e.range&&dist(e.x,e.y,t.x,t.y)>e.range)||(G.walls.length&&!los(e.x,e.y,t.x,t.y))){ e.fire=.45; return }
     e.fire=e.every*(.85+G.rnd()*.3); aimed(e.x,e.y,t.x,t.y,e.n,.22,e.sp,'o') } },
 chaser:function(e,dt){ var t=G.me, a=Math.atan2(t.y-e.y,t.x-e.x);
   if(G.flow&&!los(e.x,e.y,t.x,t.y)){ var n=G.flow[cellAt(e.x,e.y)]; if(n>=0) a=Math.atan2(cellY(n)-e.y,cellX(n)-e.x) }
   step1(e,Math.cos(a)*e.sp*dt,Math.sin(a)*e.sp*dt); e.rot+=dt*5 },
 dasher:function(e,dt){ e.st=e.st||0; e.tm=(e.tm===undefined?.6+G.rnd():e.tm)-dt; var m=G.me;
   if(e.st===0){ var a0=Math.atan2(m.y-e.y,m.x-e.x); e.a=a0; step1(e,Math.cos(a0)*50*dt,Math.sin(a0)*50*dt); if(e.tm<=0){ e.st=1; e.tm=.55; beep(500,.06,.015) } }
   else if(e.st===1){ if(e.tm<=0){ e.st=2; e.tm=.42 } }
   else { var px=e.x, py=e.y; step1(e,Math.cos(e.a)*e.sp*dt,Math.sin(e.a)*e.sp*dt); e.x=clamp(e.x,10,G.WW-10); e.y=clamp(e.y,10,G.WH-10); if(e.tm<=0||(e.x===px&&e.y===py)){ e.st=0; e.tm=.9+G.rnd() } } },
 splitter:function(e,dt){ AI.chaser(e,dt) },
 small:function(e,dt){ AI.chaser(e,dt) }
};
/* the small ones: a mark on the field becomes an enemy; a big one splits into three small */
function hatch(z,sp,bs){
  if(z.sp==='chaser') chaser(z.x,z.y,sp+G.rnd()*22,{hp:2,cnt:1});
  else if(z.sp==='dasher') enemy({kind:'dasher',x:z.x,y:z.y,r:11,hp:3,sp:540,touch:1,cnt:1});
  else if(z.sp==='splitter') chaser(z.x,z.y,sp*.62,{kind:'splitter',r:15,hp:6,cnt:2});
  else turret(z.x,z.y,4,1.9,1,bs,{cnt:2,r:15,fire:1}) }
function broke(e,sp){ for(var i=0;i<3;i++){ var a=i/3*TAU+G.rnd(); chaser(e.x+Math.cos(a)*16,e.y+Math.sin(a)*16,sp*1.15,{kind:'small',r:7,hp:1,cnt:0}) } }

/* the relief: walls and thick strips on a 60×60 grid, the outer row always free, the map always connected */
var SHAPES={post:[[[0,0,2,2]],[[0,0,1,1]]],bar:[[[0,0,4,1]],[[0,0,1,4]]],long:[[[0,0,7,1]],[[0,0,1,6]]],
 ell:[[[0,0,4,1],[0,0,1,3]],[[0,0,4,1],[3,0,1,3]],[[0,2,4,1],[0,0,1,3]],[[0,2,4,1],[3,0,1,3]]],
 tee:[[[0,0,5,1],[2,0,1,3]],[[0,2,5,1],[2,0,1,3]],[[0,0,1,5],[0,2,3,1]],[[2,0,1,5],[0,2,3,1]]]};
function cellAt(x,y){ return clamp(Math.floor(x/GS),0,G.GC-1)+clamp(Math.floor(y/GS),0,G.GR-1)*G.GC }
function cellX(c){ return (c%G.GC+.5)*GS }
function cellY(c){ return (((c/G.GC)|0)+.5)*GS }
function linked(grid,GC,GR){ var from=-1, n=0, i, seen=[]; for(i=0;i<GC*GR;i++){ seen.push(0); if(!grid[i]){ n++; if(from<0) from=i } }
  var q=[from], got=1; seen[from]=1; while(q.length){ var c=q.pop(), nb=[]; if(c%GC>0) nb.push(c-1); if(c%GC<GC-1) nb.push(c+1); if(c>=GC) nb.push(c-GC); if(c+GC<GC*GR) nb.push(c+GC);
    nb.forEach(function(k){ if(!seen[k]&&!grid[k]){ seen[k]=1; got++; q.push(k) } }) } return got===n }
function terrain(G,P){ var GC=Math.round(AW/GS), GR=Math.round(AH/GS), grid=[], i, sx=Math.floor(G.me.x/GS), sy=Math.floor(G.me.y/GS);
  G.GC=GC; G.GR=GR; for(i=0;i<GC*GR;i++) grid.push(0);
  (P.ter||[]).forEach(function(kind){ for(var tr=0;tr<40;tr++){ var vs=SHAPES[kind], v=vs[(G.rnd()*vs.length)|0], w=0, h=0; v.forEach(function(r){ w=Math.max(w,r[0]+r[2]); h=Math.max(h,r[1]+r[3]) });
      if(w>GC-2||h>GR-2) continue; var x0=1+((G.rnd()*(GC-1-w))|0), y0=1+((G.rnd()*(GR-1-h))|0), ok=true, cs=[];
      v.forEach(function(r){ for(var y=y0+r[1];y<y0+r[1]+r[3];y++) for(var x=x0+r[0];x<x0+r[0]+r[2];x++) cs.push([x,y]) });
      cs.forEach(function(c){ if(Math.abs(c[0]-sx)<=2&&Math.abs(c[1]-sy)<=2) ok=false; if(G.keep&&c[0]>=G.keep[0]&&c[0]<=G.keep[2]&&c[1]>=G.keep[1]&&c[1]<=G.keep[3]) ok=false; for(var dy=-1;dy<=1;dy++) for(var dx=-1;dx<=1;dx++){ var k=c[0]+dx+(c[1]+dy)*GC; if(c[0]+dx>=0&&c[0]+dx<GC&&grid[k]) ok=false } });   // shapes never touch: no pass narrower than a cell
      if(!ok) continue; var g2=grid.slice(); cs.forEach(function(c){ g2[c[0]+c[1]*GC]=1 }); if(!linked(g2,GC,GR)) continue;
      grid=g2; v.forEach(function(r){ G.walls.push({x:(x0+r[0])*GS,y:(y0+r[1])*GS,w:r[2]*GS,h:r[3]*GS}) }); return } });
  G.grid=grid; G.mud=[];
  for(i=0;i<(P.mud||0);i++){ for(var t2=0;t2<30;t2++){ var mw=2+((G.rnd()*2)|0), mh=2+((G.rnd()*2)|0), mx=(G.rnd()*(GC-mw+1))|0, my=(G.rnd()*(GR-mh+1))|0, free=true;
      for(var yy=my;yy<my+mh;yy++) for(var xx=mx;xx<mx+mw;xx++){ if(grid[xx+yy*GC]||(Math.abs(xx-sx)<=1&&Math.abs(yy-sy)<=1)) free=false }
      if(free&&G.mud.every(function(q){ return mx*GS>=q.x+q.w||(mx+mw)*GS<=q.x||my*GS>=q.y+q.h||(my+mh)*GS<=q.y })){ G.mud.push({x:mx*GS,y:my*GS,w:mw*GS,h:mh*GS}); break } } }
  flow(G,cellAt(G.me.x,G.me.y)) }
/* the way round: for every cell, the next one on the path to the ship. The small ones follow it; the serpent does not need it */
function flow(G,to){ var GC=G.GC, GR=G.GR, n=[], d=[], i; for(i=0;i<GC*GR;i++){ n.push(-1); d.push(1e9) } d[to]=0; G.flowTo=to; var q=[to], h=0;
  while(h<q.length){ var c=q[h++], nb=[]; if(c%GC>0) nb.push(c-1); if(c%GC<GC-1) nb.push(c+1); if(c>=GC) nb.push(c-GC); if(c+GC<GC*GR) nb.push(c+GC);
    nb.forEach(function(k){ if(!G.grid[k]&&d[k]>d[c]+1){ d[k]=d[c]+1; n[k]=c; q.push(k) } }) } G.flow=n; G.fd=d }
function nearFree(G,x,y){ var best=cellAt(G.me.x,G.me.y), bd=1e9; for(var c=0;c<G.grid.length;c++){ if(G.grid[c]) continue; var d=dist(cellX(c),cellY(c),x,y); if(d<bd){ bd=d; best=c } } return best }
function freeCell(G,minD){ for(var tr=0;tr<40;tr++){ var c=(G.rnd()*G.GC*G.GR)|0; if(!G.grid[c]&&dist(cellX(c),cellY(c),G.me.x,G.me.y)>=minD) return c } return -1 }

/* THE SERPENT: the head hunts straight through the walls; only the last link takes damage */
function init(G,P){ var hx=G.rnd()<.5?120:AW-120, hy=100; G.me.x=AW-hx; G.me.y=AH-90; terrain(G,P);
  G.head=enemy({kind:'head',x:hx,y:hy,r:17,hp:P.hHp,arm:1,touch:1,goal:1,a:Math.PI/2});
  G.segs=[]; G.trail=[]; G.goalHp=P.hHp+P.n*P.sHp;
  for(var i=70+P.n*7*4;i>=0;i-=4) G.trail.push({x:hx,y:hy-i});
  for(i=0;i<P.n;i++) G.segs.push(enemy({kind:'seg',x:hx,y:hy,r:14,hp:P.sHp,arm:1,touch:1,goal:0}));
  G.fT=P.every||1; G.rT=P.red||0; G.spT=P.mEvery?P.mEvery*1.5:0; G.lx=G.me.x; G.ly=G.me.y; G.vx=0; G.vy=0 }
function step(G,P,dt){ var h=G.head, m=G.me, sp=P.sp+(P.n-G.segs.length)*P.spUp, i, z;
  if(dt>0){ G.vx+=((m.x-G.lx)/dt-G.vx)*Math.min(1,dt*5); G.vy+=((m.y-G.ly)/dt-G.vy)*Math.min(1,dt*5) } G.lx=m.x; G.ly=m.y;
  var c=cellAt(m.x,m.y); if(c!==G.flowTo) flow(G,c);
  var want=Math.atan2(m.y+G.vy*P.lead-h.y,m.x+G.vx*P.lead-h.x)+Math.sin(G.t*1.3)*.45*clamp((dist(h.x,h.y,m.x,m.y)-90)/160,0,1);
  if(h.x<70||h.x>G.WW-70||h.y<70||h.y>G.WH-70) want=Math.atan2(G.WH/2-h.y,G.WW/2-h.x);
  h.a+=clamp(angDiff(want,h.a),-P.turn*dt,P.turn*dt); h.x+=Math.cos(h.a)*sp*dt; h.y+=Math.sin(h.a)*sp*dt;
  var l=G.trail[G.trail.length-1]; if(dist(l.x,l.y,h.x,h.y)>=4){ G.trail.push({x:h.x,y:h.y}); if(G.trail.length>400) G.trail.shift() }
  for(i=0;i<G.segs.length;i++){ var q=G.trail[Math.max(0,G.trail.length-1-(i+1)*7)]; G.segs[i].x=q.x; G.segs[i].y=q.y; G.segs[i].arm=i===G.segs.length-1?0:1 }
  if(!G.segs.length) h.arm=0;
  // a link inside a wall does not fire: walls are cover from the fire, not from the serpent itself
  if(P.every){ G.fT-=dt; if(G.fT<=0){ var sh=G.segs.filter(function(s){ return !wallAt(s.x,s.y)&&los(s.x,s.y,m.x,m.y) }); if(sh.length){ G.fT=P.every; var s=sh[(G.rnd()*sh.length)|0]; bullet(s.x,s.y,Math.atan2(m.y-s.y,m.x-s.x),P.bs,'o') } else G.fT=.3 } }
  if(P.red){ G.rT-=dt; if(G.rT<=0){ if(wallAt(h.x,h.y)) G.rT=.3; else { G.rT=P.red; aimed(h.x,h.y,m.x,m.y,P.redN,.3,150,'r'); beep(180,.12,.03,'triangle') } } }
  // the small ones: the shorter the serpent, the thicker they come
  if(P.mEvery){ var p=1-G.segs.length/P.n; G.spT-=dt;
    if(G.spT<=0&&G.en.length-G.segs.length-1+G.zones.length<P.mCap*(.6+.4*p)){ G.spT=P.mEvery*(1-.3*p); var at=freeCell(G,220); if(at>=0){ var r=G.rnd(); G.zones.push({k:'mark',x:cellX(at),y:cellY(at),t:.75,sp:r<P.gun?'gun':r<P.gun+P.dash?'dasher':r<P.gun+P.dash+P.split?'splitter':'chaser'}) } } }
  for(i=G.zones.length-1;i>=0;i--){ z=G.zones[i]; z.t-=dt; if(z.t<=0){ G.zones.splice(i,1); hatch(z,P.sp2,P.bs) } } }
/* THE HIVE (v5.09, Nikita 10.11: «Нужно разделить взломы. Сделать либо врага, либо ещё что-то под каждый тип, где тип двигателя и соты» →
   «Давай твоё решение»): the ark's hack. A core behind rings of hex cells — as many rings as the level (four fit the field; past that the
   cells and the core grow thicker, so the ladder has no top). Every cell takes damage; the rings turn, opposite ways, so a gap moves;
   the outer cells release small ones; the core fires through its own cells. Kill the core. A siege, where the serpent is a chase. */
/* v5.09 ladder (tools/hack-bot.js, 30 seeds a level): the first block is short, not empty — two rings and a slow gun; four rings from
   level 3; red fans from 3; from level 2 a lost cell grows back (the hive heals what is left alone: keep the fire on one side). */
function hiveP(n){ var k=Math.min(n,10);   // past four rings the hive does not get thicker (a longer fight is not a harder one) — it fires faster and breeds more, to its caps at level 10
  return {hive:1,rings:Math.min(4,n+1),cHp:3+(n>=3?1:0),coreHp:14+2*Math.min(n,8),every:Math.max(.75,2.4-.25*n),bs:150+6*k,red:n>=3?Math.max(3.5,10-n):0,redN:n>=5?3:2,
    mEvery:Math.max(1,3-.35*n),mCap:Math.min(10,3+n),sp2:88+3*k,drop:n>=2?.35:0,grow:n>=2?Math.max(3,5-.4*n):0,spin:.1,ter:[],mud:0} }
function initHive(G,P){ var R=16, cx0=AW/2, cy0=58+P.rings*R*S3+R, D=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]], rad=P.rings*R*S3+R+34;
  G.me.x=AW/2; G.me.y=AH-70; G.hive=true; G.cells=[]; G.dead=[]; G.segs=[]; G.trail=[];
  G.keep=[Math.floor((cx0-rad)/GS),Math.floor((cy0-rad)/GS),Math.floor((cx0+rad)/GS),Math.floor((cy0+rad)/GS)];   // no wall inside the hive
  terrain(G,P);
  G.head=enemy({kind:'core',x:cx0,y:cy0,r:15,hp:P.coreHp,touch:1,goal:1});
  for(var ring=1;ring<=P.rings;ring++){ var q=0, rr=-ring; for(var side=0;side<6;side++) for(var j=0;j<ring;j++){ var dx=R*1.5*q, dy=R*S3*(rr+q/2);
      G.cells.push(enemy({kind:'cell',x:cx0+dx,y:cy0+dy,r:13,hp:P.cHp,touch:1,goal:0,ring:ring,a:Math.atan2(dy,dx),d:Math.hypot(dx,dy)})); q+=D[side][0]; rr+=D[side][1] } }
  G.goalHp=P.coreHp+G.cells.length*P.cHp; G.fT=P.every||1; G.rT=P.red||0; G.spT=P.mEvery*1.2; G.gT=P.grow||0 }
function stepHive(G,P,dt){ var m=G.me, h=G.head, i, e, c=cellAt(m.x,m.y); if(c!==G.flowTo) flow(G,c);
  for(i=0;i<G.cells.length;i++){ e=G.cells[i]; e.a+=P.spin*(e.ring%2?1:-1)*dt; e.x=h.x+Math.cos(e.a)*e.d; e.y=h.y+Math.sin(e.a)*e.d }
  for(i=0;i<G.dead.length;i++){ e=G.dead[i]; e.a+=P.spin*(e.ring%2?1:-1)*dt }   // an empty place turns with its ring
  if(P.grow){ G.gT-=dt; if(G.gT<=0){ G.gT=P.grow; if(G.dead.length){ var gi=(G.rnd()*G.dead.length)|0, g=G.dead[gi], gx=h.x+Math.cos(g.a)*g.d, gy=h.y+Math.sin(g.a)*g.d;
        if(dist(gx,gy,m.x,m.y)>60){ G.dead.splice(gi,1); G.cells.push(enemy({kind:'cell',x:gx,y:gy,r:13,hp:P.cHp,touch:1,goal:0,ring:g.ring,a:g.a,d:g.d,born:.35})); beep(420,.05,.012) } } } }
  if(P.every){ G.fT-=dt; if(G.fT<=0){ G.fT=P.every*(.85+G.rnd()*.3); aimed(h.x,h.y,m.x,m.y,1,.2,P.bs,'o') } }
  if(P.red){ G.rT-=dt; if(G.rT<=0){ G.rT=P.red; aimed(h.x,h.y,m.x,m.y,P.redN,.3,150,'r'); beep(180,.12,.03,'triangle') } }
  G.spT-=dt; if(G.spT<=0){ var small=0; for(i=0;i<G.en.length;i++) if(G.en[i].kind==='small') small++;
    if(small>=P.mCap){ G.spT=.4; return }
    var top=0; G.cells.forEach(function(q){ if(q.ring>top) top=q.ring }); var out=G.cells.filter(function(q){ return q.ring===top }), src=out.length?out[(G.rnd()*out.length)|0]:h, a=src===h?G.rnd()*TAU:Math.atan2(src.y-h.y,src.x-h.x);
    chaser(src.x+Math.cos(a)*22,src.y+Math.sin(a)*22,P.sp2+G.rnd()*18,{kind:'small',r:7,hp:1,cnt:0}); G.spT=P.mEvery } }
function onKill(G,e){ if(e.kind==='cell'){ G.cells.splice(G.cells.indexOf(e),1); G.dead.push({ring:e.ring,a:e.a,d:e.d}); G.shake=Math.max(G.shake,3); if(G.P.drop&&G.rnd()<G.P.drop) chaser(e.x,e.y,G.P.sp2*1.1,{kind:'small',r:7,hp:1,cnt:0}) }
  else if(e.kind==='seg'){ G.segs.splice(G.segs.indexOf(e),1); G.hitstop=.04; G.shake=7; beep(180,.12,.05,'sawtooth');
    for(var i=0;i<G.P.drop;i++){ var a=G.rnd()*TAU; chaser(e.x+Math.cos(a)*12,e.y+Math.sin(a)*12,G.P.sp2*1.1,{kind:'small',r:7,hp:1}) } }
  else if(e===G.head) win(e.x,e.y);
  else if(e.kind==='splitter') broke(e,G.P.sp2) }
function part(G){ var a=G.head.hp; (G.hive?G.cells:G.segs).forEach(function(s){ a+=s.hp }); return a/G.goalHp }
function targets(){ var m=G.me, near=G.en.filter(function(e){ return !e.arm&&e.kind!=='seg'&&e.kind!=='head'&&e.kind!=='cell'&&e.kind!=='core'&&dist(e.x,e.y,m.x,m.y)<170&&los(m.x,m.y,e.x,e.y) }).sort(function(a,b){ return dist(a.x,a.y,m.x,m.y)-dist(b.x,b.y,m.x,m.y) });
  var tail=G.segs.length?G.segs[G.segs.length-1]:G.head;
  if(G.hive){ var bd=1e9; tail=G.head; G.cells.forEach(function(c){ var d=dist(c.x,c.y,m.x,m.y); if(d<bd){ bd=d; tail=c } }) }   // the hive: the nearest cell, the core once the cells are gone
  return near.concat([tail]) }
function slow(G){ var m=G.me; return G.mud.some(function(q){ return m.x>q.x&&m.x<q.x+q.w&&m.y>q.y&&m.y<q.y+q.h })?.55:1 }
/* for the bot: the nearest cell on the way from which the tail is seen and the head is not near */
function way(G){ if(G.hive) return null; var m=G.me, t=G.segs.length?G.segs[G.segs.length-1]:G.head, here=cellAt(m.x,m.y), best=-1, bd=1e9;
  if(dist(m.x,m.y,t.x,t.y)<420&&dist(m.x,m.y,t.x,t.y)>110&&los(m.x,m.y,t.x,t.y)) return null;
  for(var c=0;c<G.GC*G.GR;c++){ if(G.grid[c]||G.fd[c]>=bd) continue; var x=cellX(c), y=cellY(c), dd=dist(x,y,t.x,t.y); if(dd>420||dd<110||dist(x,y,G.head.x,G.head.y)<130||!los(x,y,t.x,t.y)) continue; best=c; bd=G.fd[c] }
  if(best<0||best===here) return null; while(G.flow[best]!==here&&G.flow[best]>=0) best=G.flow[best]; return [cellX(best),cellY(best)] }

function autoAim(){   // touch: an orange shot near comes first, then the nearest target
  var m=G.me, best=null, bd=1e9;
  G.bul.forEach(function(b){ if(b.k!=='o') return; var d=dist(b.x,b.y,m.x,m.y); if(d<130&&d<bd){ bd=d; best=[b.x,b.y] } });
  if(best) return Math.atan2(best[1]-m.y,best[0]-m.x);
  targets().forEach(function(e){ var d=dist(e.x,e.y,m.x,m.y); if(d<bd){ bd=d; best=[e.x,e.y] } });
  return best?Math.atan2(best[1]-m.y,best[0]-m.x):m.ang;
}
function camera(){ var m=G.me; G.cam.x=clamp(m.x-AW/2,0,Math.max(0,G.WW-AW)); G.cam.y=clamp(m.y-AH/2,0,Math.max(0,G.WH-AH)) }

function update(dt){
  var P=G.P, m=G.me, i, j, b, s, e;
  fxStep(dt);
  if(G.shake>0) G.shake=Math.max(0,G.shake-dt*40);
  if(G.glitch>0) G.glitch-=dt;
  if(G.state==='dying'){ G.dieT-=dt; if(G.rnd()<.4) burst(G.dx+(G.rnd()-.5)*50,G.dy+(G.rnd()-.5)*50,G.rnd()<.5?'#FFD23F':'#F2F1EC',8,300);
    if(G.dieT<=0){ G.state='won'; burst(G.dx,G.dy,'#FFD23F',90,600); onEnd('won') } return }
  if(G.state!=='play') return;
  if(G.hitstop>0){ G.hitstop-=dt; return }
  G.t+=dt;
  // the move: axis by axis, to slide along the walls
  var mag=Math.hypot(input.mx,input.my)||1, k=Math.min(1,Math.hypot(input.mx,input.my)), sl=slow(G), dx=input.mx/mag*k*SPEED*sl*dt, dy=input.my/mag*k*SPEED*sl*dt;
  var B={x0:10,x1:G.WW-10,y0:10,y1:G.WH-10};
  var nx=clamp(m.x+dx,B.x0,B.x1); if(!wallAt(nx,m.y,6)) m.x=nx;
  var ny=clamp(m.y+dy,B.y0,B.y1); if(!wallAt(m.x,ny,6)) m.y=ny;
  if(m.inv>0) m.inv-=dt;
  var aim=input.auto?autoAim():Math.atan2(input.ay+(input.world?0:G.cam.y)-m.y,input.ax+(input.world?0:G.cam.x)-m.x); m.ang=aim;
  m.fire-=dt;
  if(m.fire<=0){ m.fire=FIRE; G.shots.push({x:m.x+Math.cos(aim)*10,y:m.y+Math.sin(aim)*10,vx:Math.cos(aim)*SHOT,vy:Math.sin(aim)*SHOT,b:0}); if(Math.floor(G.t/FIRE)%2===0) beep(1400,.012,.006) }
  (G.hive?stepHive:step)(G,P,dt); if(G.state!=='play') return;
  camera();
  for(i=G.en.length-1;i>=0;i--){ e=G.en[i]; if(e.flash>0) e.flash-=dt; if(AI[e.kind]) AI[e.kind](e,dt);
    if(e.touch&&m.inv<=0&&dist(e.x,e.y,m.x,m.y)<R_ME+e.r*.8){ if(e.die1){ burst(e.x,e.y,'#C9CFD6',12,240); G.en.splice(i,1) } hurt(); if(G.state!=='play') return } }
  for(i=G.bul.length-1;i>=0;i--){ b=G.bul[i]; b.x+=b.vx*dt; b.y+=b.vy*dt;
    if(b.x<-20||b.y<-20||b.x>G.WW+20||b.y>G.WH+20||wallAt(b.x,b.y)){ G.bul.splice(i,1); continue }
    if(m.inv<=0&&dist(b.x,b.y,m.x,m.y)<R_ME+(b.k==='r'?6:5)){ hurt(); if(G.state!=='play') return; break } }   // hurt clears the shots around itself
  shots: for(i=G.shots.length-1;i>=0;i--){ s=G.shots[i]; s.x+=s.vx*dt; s.y+=s.vy*dt;
    if(s.x<0||s.y<0||s.x>G.WW||s.y>G.WH||wallAt(s.x,s.y)){ if(wallAt(s.x,s.y)) burst(s.x,s.y,'#5E5D58',1,80); G.shots.splice(i,1); continue }
    for(j=G.bul.length-1;j>=0;j--){ b=G.bul[j]; if(dist(b.x,b.y,s.x,s.y)<9){
      G.shots.splice(i,1); if(b.k==='o'){ burst(b.x,b.y,'#FF8A1F',5,170); G.bul.splice(j,1) } else burst(s.x,s.y,'#FF2A1A',2,90); continue shots } }
    for(j=G.en.length-1;j>=0;j--){ e=G.en[j]; if(dist(e.x,e.y,s.x,s.y)<e.r+2){
      G.shots.splice(i,1);
      if(e.arm) burst(s.x,s.y,'#5E5D58',2,90); else { hitEnemy(e); if(G.state!=='play') return }
      continue shots } }
  }
}
function fxStep(dt){ for(var i=G.fx.length-1;i>=0;i--){ var f=G.fx[i]; f.t+=dt; if(f.t>=f.life){ G.fx.splice(i,1); continue } f.x+=f.vx*dt; f.y+=f.vy*dt; f.vx*=.95; f.vy*=.95 } }

/* sound: the game's switch (lb.sfx) mutes it too */
var AC=null;
function muted(){ if(SIM) return true; try{ return localStorage.getItem('lb.sfx')==='0' }catch(e){ return false } }
function audio(){ if(AC) return; try{ AC=new (window.AudioContext||window.webkitAudioContext)() }catch(e){} }
function beep(f,d,g,type){
  if(!AC||muted()) return; var o=AC.createOscillator(), a=AC.createGain(), t=AC.currentTime;
  o.type=type||'square'; o.frequency.value=f; a.gain.setValueAtTime(g,t); a.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(a); a.connect(AC.destination); o.start(t); o.stop(t+d);
}

/* ---- the window ---- */
var root=null, cv=null, cx=null, DPR=1, W=0, H=0, K=1, OX=0, OY=0, endT=0, loreTimer=0, raf=0, last=0;
function $(id){ return document.getElementById(id) }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function T(k,p){ return O&&O.T?O.T(k,p):k }
function build(){
  if(root) return;
  root=document.createElement('div'); root.id='hack'; root.hidden=true;
  root.innerHTML='<canvas id="hkc"></canvas>'+
    '<div class="hk-ov" id="hkIntro"><div class="hk-who" id="hkWho"></div><h1 id="hkName"></h1><div class="hk-lv" id="hkLv"></div><div class="hk-fresh" id="hkNew"></div>'+
      '<div class="hk-rules"><div class="y" id="hkD"></div><div id="hkR1"></div><div id="hkR"></div><div class="o" id="hkR3"></div><div class="r" id="hkR4"></div></div>'+
      '<button type="button" class="hk-go" data-h="go" id="hkGo"></button><button type="button" class="hk-go q" data-h="later" id="hkLater1"></button></div>'+
    '<div class="hk-ov lost" id="hkLost" hidden><h1 id="hkLostH"></h1><div class="hk-sub" id="hkLostS"></div>'+
      '<button type="button" class="hk-go m" data-h="go" id="hkRetry"></button><button type="button" class="hk-go q" data-h="later" id="hkLater2"></button></div>'+
    '<div class="hk-ov" id="hkWon" hidden><div class="hk-lore" id="hkLore"></div><button type="button" class="hk-go" data-h="done" id="hkDone" style="visibility:hidden"></button></div>';
  document.body.appendChild(root);
  cv=$('hkc'); cx=cv.getContext('2d');
  // the game below never sees a press made here
  ['pointerdown','pointerup','click','dblclick','wheel','contextmenu'].forEach(function(t){ root.addEventListener(t,function(e){ e.stopPropagation(); if(t==='contextmenu') e.preventDefault() }) });
  root.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-h]'); if(!b) return; press(b.getAttribute('data-h')) });
  cv.addEventListener('pointerdown',function(e){ audio(); if(e.pointerType==='touch'){ input.auto=true; touch={x:e.clientX,y:e.clientY}; try{ cv.setPointerCapture(e.pointerId) }catch(_){} } });
  cv.addEventListener('pointermove',function(e){
    if(e.pointerType==='touch'){ if(touch&&G&&G.state==='play'){ var m=G.me, sl=slow(G), nx=clamp(m.x+(e.clientX-touch.x)/K*1.5*sl,10,G.WW-10), ny=clamp(m.y+(e.clientY-touch.y)/K*1.5*sl,10,G.WH-10); if(!wallAt(nx,m.y,6)) m.x=nx; if(!wallAt(m.x,ny,6)) m.y=ny; touch.x=e.clientX; touch.y=e.clientY } return }
    input.auto=false; input.ax=(e.clientX-OX)/K; input.ay=(e.clientY-OY)/K });
  cv.addEventListener('pointerup',function(){ touch=null }); cv.addEventListener('pointercancel',function(){ touch=null });
  window.addEventListener('resize',function(){ if(OPEN) resize() });
  window.addEventListener('keydown',onKey,true); window.addEventListener('keyup',onKeyUp,true);
}
var touch=null, keys={}, KEYMAP={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
function readKeys(){ var x=0,y=0; for(var k in keys) if(keys[k]&&KEYMAP[k]){ x+=KEYMAP[k][0]; y+=KEYMAP[k][1] } input.mx=x; input.my=y }
function onKey(e){ if(!OPEN) return; e.stopImmediatePropagation();
  if(KEYMAP[e.code]){ keys[e.code]=1; readKeys(); e.preventDefault(); return }
  if(e.code==='Escape'){ e.preventDefault(); if(G&&G.state==='play') intro(); return }   // out of the fight: back to the door, nothing lost
  if(e.code==='Enter'||e.code==='Space'){ e.preventDefault(); if(e.repeat) return;
    if(panel==='intro'||panel==='lost') go(); else if(panel==='won'&&$('hkDone').style.visibility==='visible') press('done') } }
function onKeyUp(e){ if(!OPEN) return; e.stopImmediatePropagation(); if(KEYMAP[e.code]){ keys[e.code]=0; readKeys() } }
var panel=null;
function show(id){ panel=id; $('hkIntro').hidden=id!=='intro'; $('hkLost').hidden=id!=='lost'; $('hkWon').hidden=id!=='won'; root.classList.toggle('play',!id) }
function press(h){ audio();
  if(h==='go') go();
  else if(h==='later'){ var cb=O&&O.onLater; close(); if(cb) cb() }
  else if(h==='done') close() }
function texts(){
  var hv=MODE==='hive';   // v5.09: the hive has its own name, level line and rules
  $('hkWho').textContent=fill1(T('hk_wake'),{c:O.who}); $('hkName').textContent=T(hv?'hk_nameB':'hk_name');
  $('hkLv').textContent=hv?fill1(T('hk_lvlB'),{n:hiveP(lv).rings}):fill1(T('hk_lvl'),{n:lv,m:TOP}); $('hkNew').textContent=hv?'':T('hk_new'+lv);
  $('hkD').textContent=T(hv?'hk_dB':'hk_d'); $('hkR1').textContent=T(COARSE?'hk_r1t':'hk_r1'); $('hkR').textContent=T(hv?'hk_rB':'hk_r'); $('hkR3').textContent=T('hk_r3'); $('hkR4').textContent=T('hk_r4');
  $('hkGo').textContent=T('hk_go'); $('hkLater1').textContent=T('hk_later'); $('hkLater2').textContent=T('hk_later');
  $('hkLostH').textContent=T('hk_lost'); $('hkLostS').textContent=T('hk_lostSub'); $('hkRetry').textContent=T('hk_retry'); $('hkDone').textContent=T('hk_done') }
function fill1(s,p){ return String(s).replace(/\{(\w+)\}/g,function(m,k){ return p&&p[k]!==undefined?p[k]:m }) }
function go(){ clearTimeout(endT); newRun(); show(null); keys={}; readKeys(); if(O&&O.onTry) O.onTry({k:'start',lv:lv}) }
function intro(){ clearInterval(loreTimer); clearTimeout(endT); newRun(); G.state='intro'; texts(); show('intro') }
function onEnd(kind){ if(SIM) return; clearTimeout(endT);
  if(O&&O.onTry) O.onTry({k:kind,lv:lv,t:+G.t.toFixed(1),hp:G.me.hp});
  if(kind==='won'&&O&&O.onWin&&!O.won){ O.won=true; O.onWin() }   // the core learns of it at once: a closed tab cannot lose the win
  endT=setTimeout(function(){ if(kind==='lost') show('lost'); else { show('won'); typeLore() } },kind==='lost'?420:500) }
function typeLore(){
  var lines=[fill1(T('hk_woke'),{c:O.who}),T('hk_mem'),'',O.lore||'','',O.unlock||''], text=lines.join('\n'), n=0, box=$('hkLore'), bt=$('hkDone');
  bt.style.visibility='hidden'; clearInterval(loreTimer);
  loreTimer=setInterval(function(){
    n+=2; var s=text.slice(0,n), out=s.split('\n').map(function(l,ix){ var cl=ix===0?'y':ix===1||ix===5?'m':''; return '<span class="'+cl+'">'+esc(l)+'</span>' }).join('\n');
    box.innerHTML=out+(n<text.length?'<span class="y">▌</span>':'');
    if(n>=text.length){ clearInterval(loreTimer); bt.style.visibility='visible'; try{ bt.focus() }catch(e){} }
  },24);
}
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1); W=innerWidth; H=innerHeight;
  cv.width=W*DPR; cv.height=H*DPR;
  var was=AW; orient();
  K=Math.min((W-24)/AW,(H-96)/AH); OX=(W-AW*K)/2; OY=(H-AH*K)/2+6;
  if(G&&was!==AW&&G.state==='play') newRun();
}
function ngon(n,r,rot){ cx.beginPath(); for(var i=0;i<n;i++){ var a=rot+i*TAU/n; cx[i?'lineTo':'moveTo'](r*Math.cos(a),r*Math.sin(a)) } cx.closePath() }
function ship(x,y,a,fill){ cx.save(); cx.translate(x,y); cx.rotate(a); cx.beginPath(); cx.moveTo(13,0); cx.lineTo(-9,-8); cx.lineTo(-5,0); cx.lineTo(-9,8); cx.closePath(); cx.fillStyle=fill; cx.fill(); cx.restore() }
/* the look: a white outline hurts, grey is armour, yellow is where to shoot */
var DR={
 turret:function(e){ cx.translate(e.x,e.y); ngon(6,e.r,e.rot); cx.fillStyle=e.flash>0?'#F2F1EC':'#0B0B0C'; cx.fill(); cx.strokeStyle='#F2F1EC'; cx.lineWidth=2; cx.stroke();
   ngon(6,3+(e.r-6)*(e.hp/e.max),e.rot); cx.fillStyle=e.tell>0?'rgb(255,'+Math.round(210-72*e.tell)+','+Math.round(63-32*e.tell)+')':'#F2F1EC'; cx.fill() },
 chaser:function(e){ cx.translate(e.x,e.y); cx.rotate(e.rot); cx.fillStyle=e.flash>0?'#F2F1EC':'#C9CFD6'; cx.fillRect(-8,-8,16,16); cx.fillStyle='#0B0B0C'; cx.fillRect(-3,-3,6,6) },
 small:function(e){ cx.translate(e.x,e.y); cx.rotate(e.rot); cx.fillStyle=e.flash>0?'#F2F1EC':'#C9CFD6'; cx.fillRect(-5,-5,10,10) },
 splitter:function(e){ cx.translate(e.x,e.y); cx.rotate(e.rot*.4); cx.strokeStyle=e.flash>0?'#F2F1EC':'#C9CFD6'; cx.lineWidth=2.5; cx.strokeRect(-12,-12,24,24); cx.fillStyle='#C9CFD6'; cx.fillRect(-4,-4,8,8) },
 dasher:function(e){ if(e.st===1){ var la=e.a; cx.strokeStyle='rgba(255,42,26,.6)'; cx.lineWidth=1; cx.setLineDash([6,5]); cx.beginPath(); cx.moveTo(e.x,e.y); cx.lineTo(e.x+Math.cos(la)*230,e.y+Math.sin(la)*230); cx.stroke(); cx.setLineDash([]) }
   cx.translate(e.x,e.y); cx.rotate(e.a||0); cx.beginPath(); cx.moveTo(14,0); cx.lineTo(-10,-10); cx.lineTo(-10,10); cx.closePath(); cx.fillStyle=e.flash>0?'#F2F1EC':(e.st?'#FF8A1F':'#C9CFD6'); cx.fill() },
 head:function(e){ cx.translate(e.x,e.y); cx.rotate(e.a); ngon(3,e.r+3,0); cx.fillStyle=e.flash>0?'#F2F1EC':(e.arm?'#0B0B0C':'#FFD23F'); cx.fill(); cx.strokeStyle=e.arm?'#F2F1EC':'#FFD23F'; cx.lineWidth=2.5; cx.stroke() },
 cell:function(e){ cx.translate(e.x,e.y); ngon(6,14,0); cx.fillStyle=e.flash>0?'#F2F1EC':'#141417'; cx.fill(); cx.strokeStyle='#FFD23F'; cx.lineWidth=1.8; cx.stroke(); ngon(6,2.5+8*(e.hp/e.max),0); cx.fillStyle=e.flash>0?'#F2F1EC':'rgba(255,210,63,.6)'; cx.fill() },
 core:function(e,now){ cx.translate(e.x,e.y); ngon(6,e.r+3+Math.sin((now||0)/260)*1.2,Math.PI/6); cx.fillStyle=e.flash>0?'#F2F1EC':'#FFD23F'; cx.fill(); cx.strokeStyle='#F2F1EC'; cx.lineWidth=2; cx.stroke(); ngon(6,5,Math.PI/6); cx.fillStyle='#0B0B0C'; cx.fill() },
 seg:function(e){ cx.translate(e.x,e.y); ngon(8,e.r,Math.PI/8); cx.fillStyle=e.flash>0?'#F2F1EC':(e.arm?'#141417':'#FFD23F'); cx.fill(); cx.strokeStyle=e.arm?'#9C9B95':'#FFD23F'; cx.lineWidth=2; cx.stroke() }
};
function draw(now){
  cx.setTransform(DPR,0,0,DPR,0,0); cx.fillStyle='#050506'; cx.fillRect(0,0,W,H);
  if(!G) return;
  var sx=G.shake?(Math.random()-.5)*G.shake:0, sy=G.shake?(Math.random()-.5)*G.shake:0, m=G.me, i;
  cx.translate(OX+sx,OY+sy); cx.scale(K,K);
  cx.fillStyle='#0B0B0C'; cx.fillRect(0,0,AW,AH);
  cx.save(); cx.beginPath(); cx.rect(0,0,AW,AH); cx.clip();
  cx.translate(-G.cam.x,-G.cam.y);
  cx.fillStyle='rgba(156,155,149,.22)'; for(var gx=0;gx<AW+60;gx+=60) for(var gy=0;gy<AH+60;gy+=60) cx.fillRect(gx,gy,1.5,1.5);
  (G.mud||[]).forEach(function(q){ cx.fillStyle='rgba(79,163,255,.07)'; cx.fillRect(q.x,q.y,q.w,q.h); cx.save(); cx.beginPath(); cx.rect(q.x,q.y,q.w,q.h); cx.clip(); cx.strokeStyle='rgba(79,163,255,.32)'; cx.lineWidth=1; cx.beginPath(); for(var hh=-q.h;hh<q.w;hh+=14){ cx.moveTo(q.x+hh,q.y+q.h); cx.lineTo(q.x+hh+q.h,q.y) } cx.stroke(); cx.restore() });
  G.zones.forEach(function(z){ cx.strokeStyle='rgba(255,42,26,'+(.3+.5*Math.abs(Math.sin(now/90)))+')'; cx.lineWidth=2; cx.beginPath(); cx.moveTo(z.x-8,z.y-8); cx.lineTo(z.x+8,z.y+8); cx.moveTo(z.x+8,z.y-8); cx.lineTo(z.x-8,z.y+8); cx.stroke() });
  cx.fillStyle='#17171B'; G.walls.forEach(function(w){ cx.fillRect(w.x,w.y,w.w,w.h) });
  if(G.grid){ cx.strokeStyle='#5E5D58'; cx.lineWidth=1.5; cx.beginPath(); for(i=0;i<G.grid.length;i++){ if(!G.grid[i]) continue; var gcx=i%G.GC, gcy=(i/G.GC)|0, a0=gcx*GS, b0=gcy*GS;
      if(gcx===0||!G.grid[i-1]){ cx.moveTo(a0,b0); cx.lineTo(a0,b0+GS) } if(gcx===G.GC-1||!G.grid[i+1]){ cx.moveTo(a0+GS,b0); cx.lineTo(a0+GS,b0+GS) } if(gcy===0||!G.grid[i-G.GC]){ cx.moveTo(a0,b0); cx.lineTo(a0+GS,b0) } if(gcy===G.GR-1||!G.grid[i+G.GC]){ cx.moveTo(a0,b0+GS); cx.lineTo(a0+GS,b0+GS) } } cx.stroke() }
  if(G.head&&G.state==='play'){ cx.strokeStyle='rgba(156,155,149,.5)'; cx.lineWidth=2; cx.beginPath(); cx.moveTo(G.head.x,G.head.y); G.segs.forEach(function(s){ cx.lineTo(s.x,s.y) }); cx.stroke() }
  G.en.forEach(function(e){ if(!DR[e.kind]) return; cx.save(); if((e.kind==='seg'||e.kind==='head')&&wallAt(e.x,e.y)) cx.globalAlpha=.4; DR[e.kind](e,now); cx.restore() });   // inside a wall the serpent is dim: it cannot be hit there
  G.bul.forEach(function(b){
    if(b.k==='o'){ cx.fillStyle='#FF8A1F'; cx.beginPath(); cx.arc(b.x,b.y,6,0,7); cx.fill(); cx.fillStyle='#FFD9A8'; cx.beginPath(); cx.arc(b.x,b.y,2.5,0,7); cx.fill() }
    else { cx.save(); cx.translate(b.x,b.y); cx.rotate(Math.PI/4); cx.fillStyle='#FF2A1A'; cx.fillRect(-5.5,-5.5,11,11); cx.fillStyle='#0B0B0C'; cx.fillRect(-1.8,-1.8,3.6,3.6); cx.restore() } });
  cx.lineWidth=2.5; cx.lineCap='round';
  cx.strokeStyle='#FFF6D0'; cx.beginPath(); G.shots.forEach(function(s){ cx.moveTo(s.x,s.y); cx.lineTo(s.x-s.vx*.016,s.y-s.vy*.016) }); cx.stroke();
  cx.lineCap='butt';
  if(G.state==='play'&&!(m.inv>0&&Math.floor(now/70)%2)){ ship(m.x,m.y,m.ang,'#F2F1EC'); cx.fillStyle='#FF2A1A'; cx.fillRect(m.x-1.5,m.y-1.5,3,3) }
  G.fx.forEach(function(f){ cx.globalAlpha=1-f.t/f.life; cx.fillStyle=f.col; cx.fillRect(f.x-2,f.y-2,4,4) }); cx.globalAlpha=1;
  cx.restore();
  cx.strokeStyle='#2E2E33'; cx.lineWidth=1/K; cx.strokeRect(0,0,AW,AH);
  // the strip: the name, the bar, the lives
  cx.setTransform(DPR,0,0,DPR,0,0);
  var bw=AW*K, tx=OX, ty=OY-22;
  cx.font='700 12px Jost,system-ui,sans-serif'; cx.textBaseline='middle'; cx.textAlign='left'; cx.fillStyle='#F2F1EC';
  cx.fillText(T(MODE==='hive'?'hk_nameB':'hk_name'),tx,ty);
  var hbx=tx+78, hbw=Math.max(40,bw-78-70), pt=G.state==='play'?part(G):0;
  cx.fillStyle='#202024'; cx.fillRect(hbx,ty-2,hbw,4); cx.fillStyle='#FFD23F'; cx.fillRect(hbx,ty-2,hbw*Math.max(0,pt),4);
  for(i=0;i<HP;i++){ var px=tx+bw-52+i*20; cx.beginPath(); cx.moveTo(px+7,ty); cx.lineTo(px-5,ty-6); cx.lineTo(px-5,ty+6); cx.closePath(); if(i<m.hp){ cx.fillStyle='#F2F1EC'; cx.fill() } else { cx.strokeStyle='#5E5D58'; cx.lineWidth=1; cx.stroke() } }
  if(G.glitch>0){ for(var s=0;s<5;s++){ var y2=Math.random()*H*DPR, gh2=(6+Math.random()*26)*DPR, dx2=(Math.random()-.5)*44*DPR; try{ cx.setTransform(1,0,0,1,0,0); cx.drawImage(cv,0,y2,W*DPR,gh2,dx2,y2,W*DPR,gh2) }catch(e){} } cx.setTransform(DPR,0,0,DPR,0,0) }
}
function frame(now){ if(!OPEN){ raf=0; return } var dt=Math.min(.04,(now-(last||now))/1000); last=now; if(G) update(dt); draw(now); raf=requestAnimationFrame(frame) }

/* o: {T, level 1…6, who ('HULL.GEN.II'), lore, unlock, seed, onWin, onLater, onTry} */
function open(o){
  build(); O=o; O.won=false; MODE=o.kind==='hive'?'hive':'serpent'; lv=MODE==='hive'?Math.max(1,o.level|0||1):clamp(o.level|0||1,1,TOP); attempt=0; OPEN=true; root.hidden=false; keys={}; readKeys();
  resize(); intro(); last=0; if(!raf) raf=requestAnimationFrame(frame) }
function close(){ OPEN=false; clearInterval(loreTimer); clearTimeout(endT); if(root) root.hidden=true; keys={}; readKeys(); G=null; panel=null }

/* a run without a picture, for bots: step 1/60, the bot sets the input (aim in world coordinates) */
function sim(level,seed,bot,maxT,kind){
  var keepLv=lv, keepG=G, keepIn=input, keepM=MODE; SIM=true; MODE=kind==='hive'?'hive':'serpent'; lv=MODE==='hive'?Math.max(1,level|0):clamp(level,1,TOP); input={mx:0,my:0,ax:AW/2,ay:AH/2,auto:false,world:true};
  newRun(seed); var steps=0;
  while((G.state==='play'||G.state==='dying')&&G.t<maxT&&steps<maxT*60+400){ bot(G,input); update(1/60); steps++ }
  var pt=0; if(G.state!=='won'){ try{ pt=part(G) }catch(e){} }
  var out={r:G.state==='won'?'won':G.state==='lost'?'lost':'timeout',t:+G.t.toFixed(1),hp:G.me.hp,left:+pt.toFixed(2)};
  G=keepG; lv=keepLv; input=keepIn; MODE=keepM; SIM=false; return out;
}
/* the scenarios' win: the serpent loses every link and the head, the ordinary win follows */
function cheat(){ if(!G||G.state!=='play') return false; if(G.hive){ G.P.grow=0; G.cells.slice().forEach(function(c){ c.hp=1; hitEnemy(c) }); G.head.hp=1; hitEnemy(G.head); return G.state==='dying' }
  G.segs.slice().forEach(function(s){ s.hp=1; s.arm=0; hitEnemy(s) }); G.head.arm=0; G.head.hp=1; hitEnemy(G.head); return G.state==='dying' }
window.LBhack={open:open,isOpen:function(){ return OPEN },
  state:function(){ return {open:OPEN,panel:panel,kind:MODE,lv:lv,game:G?G.state:null,hp:G?G.me.hp:null,left:G&&G.head?+part(G).toFixed(3):null,attempt:attempt,ox:OX,oy:OY,k:K,aw:AW,ah:AH,me:G?{x:G.me.x,y:G.me.y}:null} },
  sim:sim,targets:function(){ return targets() },way:function(g){ return way(g||G) },cheat:cheat,TOP:TOP};
})();
