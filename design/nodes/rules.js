/* ---------- правила узлов (только песочница, в игре этого нет) ---------- */
var NP={batchA:0, batchFrom:3, hubK:2, courierEarth:1, courierHop:1, chains:true};
var HUB_KEYS=['metal','food','fuel','parts'];
function hubOf(c){ return c.hub||(c.hub={metal:0,food:0,fuel:0,parts:0}) }
function hubSum(c){ var h=c&&c.hub; return h?h.metal+h.food+h.fuel+h.parts:0 }
function haulerHold(G){ return HULL_BASE[1].cap*Math.pow(HULL_BASE[1].grow,G.gen||0) }
function hubCap(G){ return NP.hubK>=99?Infinity:Math.round(NP.hubK*haulerHold(G)) }
function batchM(G,p){ if(!NP.batchA||!(G.gen||0)||p.kind==='works'||p.sec<NP.batchFrom) return 0; return Math.round(NP.batchA*haulerHold(G)) }
function inbound(G,pid){ for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode!=='dead'&&o.mode!=='missing'&&o.to===pid) return true } return false }
function chainReaches(G,a,b){ var seen={}, st=[a]; while(st.length){ var n=st.pop(); if(n===b) return true; if(seen[n]) continue; seen[n]=1;
    for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode!=='dead'&&o.from===n&&o.to&&o.to!=='earth') st.push(o.to) } } return false }
/* можно ли этому судну стоять на линии from → to; код отказа читает панель */
function lineCheck(G,s,from,to){ var pf=planet(from), h=HULLS[s.hull], cour=h.key==='courier';
  if(to==='earth'){
    if(pf.sec>shipRange(s)) return 'range';
    if(cour&&pf.sec>NP.courierEarth) return 'courierFar';
    if(h.cap<batchM(G,pf)) return 'batch';
    return 'ok' }
  if(!NP.chains) return 'nochain';
  if(to===from) return 'samenode';
  var pt=planet(to); if(!pt) return 'nocolony';
  if(pf.kind==='works'||pt.kind==='works') return 'works';   // заводу нужно сырьё с Земли, линия мимо Земли его уморит
  if(pt.sec>pf.sec) return 'outward';
  if(pf.sec-pt.sec>shipRange(s)) return 'range';
  if(cour&&pf.sec-pt.sec>NP.courierHop) return 'courierHop';
  if(chainReaches(G,to,from)) return 'loop';
  return 'ok' }
function goHome(G,s){ s.origin=s.at; s.dest='earth'; s.at=null; s.mode='transit'; s.dir='in'; s.t=legDays(G,s.origin,'earth',s); s.total=s.t; s.batchWait=false; s.hubWait=false }
/* груз у узла: в склад перевалки сколько влезет, остальное ждёт на борту. Ничего не сгорает. */
function hubUnload(G,s,node){ var c=G.colonies[node]; if(!c){ s.hubWait=false; return }
  var h=hubOf(c), room=Math.max(0,hubCap(G)-hubSum(c)), left=0;
  for(var i=0;i<HUB_KEYS.length;i++){ var k=HUB_KEYS[i], g=Math.min(room,s.cargo[k]||0); if(g>0){ h[k]+=g; s.cargo[k]-=g; room-=g; c.hubIn=(c.hubIn||0)+g } left+=s.cargo[k]||0 }
  if(s.cargo.people){ c.pop+=s.cargo.people; s.cargo.people=0 }
  s.hubWait=left>0.5 }
function hubLoad(c,s,room){ var h=c.hub; if(!h) return room;
  for(var i=0;i<HUB_KEYS.length;i++){ var k=HUB_KEYS[i], g=Math.min(room,Math.floor(h[k])); if(g>0){ h[k]-=g; s.cargo[k]=(s.cargo[k]||0)+g; room-=g } }
  return room }
function noteFill(s,here){ if(here!==s.from) return; var c=s.cargo, l=(c.metal+c.food+c.fuel+c.parts)/Math.max(1,s.cap); s.fillE=s.fillE==null?l:s.fillE*0.7+l*0.3 }
/* держит судно на дальнем конце: null — можно лететь */
function farGate(G,s,here,dest){
  if(here==='earth'){ s.batchWait=false; return null }
  if(s.hubWait){ hubUnload(G,s,here); if(s.hubWait) return 'hubfull' }
  if(here===s.from){
    var lc=lineCheck(G,s,s.from,s.to);
    if(lc!=='ok'&&lc!=='loop'){ s.kicked=lc; s.from=null; s.to=null; s.pend=null; goHome(G,s); return 'kicked' }
    if(dest==='earth'){ var bm=batchM(G,planet(here)); if(bm&&pileLeft(G,here)<bm&&(G.reserves[here]>0||inbound(G,here))){ s.batchWait=true; return 'batch' } }
  }
  s.batchWait=false; return null }
