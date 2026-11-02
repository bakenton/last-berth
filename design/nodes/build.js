// Песочница сети узлов: настоящее ядро work/core.js + правила узлов поверх него + снимок партии бота → design/nodes/nodes.html (один файл).
// node design/nodes/build.js   Игру не трогает: ядро правится только в памяти, заменой строк. Не совпала строка — сборка падает.
const fs=require('fs'),path=require('path');
const D=__dirname,R=path.join(D,'..','..'),rd=f=>fs.readFileSync(f,{encoding:'utf-8'});
function rep(s,a,b){ if(!s.includes(a)) throw new Error('нет строки в ядре: '+a.slice(0,70)); return s.split(a).join(b) }

const RULES=rd(path.join(D,'rules.js'));
function patched(){
  let c=rd(path.join(R,'work','core.js'));
  c=rep(c,'function canReachSector(s,sec){ return sec<=shipRange(s) }','function canReachSector(s,sec){ return sec<=shipRange(s) }\n'+RULES);
  // линия мир → узел или Земля
  c=rep(c,"to='earth';\n  if(!from||from==='earth') return 'samenode';","if(!to) to='earth';\n  if(!from||from==='earth') return 'samenode';");
  c=rep(c,"if(from==='earth') from=to;                  // tolerate either argument order","if(from==='earth'){ from=to; to='earth' }");
  c=rep(c,"if(!canReachSector(s,planet(from).sec)) return 'range';","var lc=lineCheck(G,s,from,to); if(lc!=='ok') return lc;");
  c=rep(c,"var pf=s.pend.from; s.pend=null; var pr=setLine(G,s.id,pf,'earth');","var pf=s.pend.from, pt_=s.pend.to; s.pend=null; var pr=setLine(G,s.id,pf,pt_);");
  // новая линия принимается на любой стоянке, не только у Земли
  c=rep(c,"if(node==='earth'){\n      if(s.moveTo){","if(node!=='earth'&&s.pend&&G.colonies[s.pend.from]){ s.from=s.pend.from; s.to=s.pend.to; s.pend=null; s.auto=true }\n    if(node==='earth'){\n      if(s.moveTo){");
  // стоянка на дальнем конце: склад полон, правило не пускает, партия не набрана
  c=rep(c,"var d=legDist(here,dest);\n  var f=Math.max(1,","var gate=farGate(G,s,here,dest); if(gate) return gate;\n  var d=legDist(here,dest);\n  var f=Math.max(1,");
  c=rep(c,"loadAt(G,s,here);\n  s.waiting=false; s.origin=here;","loadAt(G,s,here); noteFill(s,here);\n  s.waiting=false; s.origin=here;");
  // разгрузка у узла идёт в склад перевалки
  c=rep(c,"function unload(G,s,node){\n","function unload(G,s,node){\n  if(node!=='earth'&&node===s.to){ hubUnload(G,s,node); return }\n");
  // погрузка: судно у своего узла возвращается пустым; у источника берёт сперва перевалку, потом своё
  c=rep(c,"var c=G.colonies[node]; if(!c) return;\n  // only load if","var c=G.colonies[node]; if(!c) return;\n  if(node!==s.from) return;\n  // only load if");
  c=rep(c,"else return;                                        // a mine has no use for parts","else list=[planet(node).dep];");
  c=rep(c,"var each2=Math.floor(room/list.length);","room=hubLoad(c,s,room);\n  var each2=Math.floor(room/list.length);");
  c=rep(c,"if(g>0){ c.store[k2]-=g; s.cargo[k2]=g; room-=g;","if(g>0){ c.store[k2]-=g; s.cargo[k2]=(s.cargo[k2]||0)+g; room-=g;");
  c=rep(c,"if(left<1){ s.homeOnly=node } }","if(left<1&&hubSum(c)<1&&!inbound(G,node)){ s.homeOnly=node } }");
  // на поверхности лежит и перевалка; мир с входящей линией живёт и без своей жилы
  c=rep(c,"return Math.floor(c.store[p.kind==='works'?'parts':p.dep]||0) }","return Math.floor(c.store[p.kind==='works'?'parts':p.dep]||0)+Math.floor(hubSum(c))+(inbound(G,pid)?1:0) }");
  // судно, снятое с линии на дальнем конце, идёт домой (в игре там никто не стоит)
  c=rep(c,"if(s.mode==='idle'){ if(s.from&&s.to) sail(G,s); continue }","if(s.mode==='idle'){ if(s.from&&s.to) sail(G,s); else if(s.at&&s.at!=='earth'){ goHome(G,s) } continue }");
  c=rep(c,"if(o.from===node){ o.from=null; o.to=null }","if(o.from===node||o.to===node){ o.from=null; o.to=null }");
  return c;
}
const EXPORTS=['newGame','tick','K','SECTORS','PLANETS','HULLS','planet','openSector','ensureGen','buildShip','colonize','canDepart','setLine','clearLine','scrap','shipById','legDays','currentHull','lineRate','shipRange','earthNeed','foundParty','enRoute','lineCheck','batchM','hubCap','hubOf','hubSum','inbound','NP'];
const wrap=c=>'(function(){\n'+c+'\n;return {'+EXPORTS.map(n=>n+':'+n).join(',')+'}})()';

// снимок: настоящая партия бота rush, середина игры
function snapshot(seed,year){
  const sim=require(path.join(R,'tools','sim.js')), core=sim.load(path.join(R,'work','core.js'));
  let snap=null;
  sim.play(core,seed,year,'rush',G=>{ const o=Object.assign({},G); delete o.rnd; o.log=[]; o.actions=[]; o.foodFc=null; o.foodWarned=false; o.mutinyWarned=false; o.night=null; o.nightSeen=false; o.drive=null;
    for(const s of o.ships) s.mutiny=false; const rs={}; for(const k in o.reserves) rs[k]=o.reserves[k]===Infinity?-1:o.reserves[k]; o.reserves=rs;
    snap=JSON.parse(JSON.stringify(o)); snap.nSec=core.SECTORS.length });
  return snap;
}
const SEED=101, YEAR=1500, snap=snapshot(SEED,YEAR);
if(!snap.gen) throw new Error('в снимке нет поколения II');
let h=rd(path.join(D,'src.html'));
const fonts=rd(path.join(R,'work','web','fonts.css')),css=rd(path.join(R,'design','fusions','src','kit.css'));
h=h.replace('/*KIT*/',()=>fonts+css).replace('/*CORE*/',()=>'var C='+wrap(patched())+';').replace('/*SNAP*/',()=>'var SNAP='+JSON.stringify(snap)+';');
fs.writeFileSync(path.join(D,'nodes.html'),h,{encoding:'utf-8'});
fs.writeFileSync(path.join(require('os').tmpdir(),'lb-nodes-core.js'),'module.exports='+wrap(patched())+';\nmodule.exports.SNAP='+JSON.stringify(snap)+';\n',{encoding:'utf-8'});
console.log('nodes.html',Math.round(h.length/1024)+' КБ · снимок: сид',SEED,'год',snap.day,'поколение',snap.gen+1,'колец',snap.nSec,'миров',Object.keys(snap.colonies).length,'судов',snap.ships.filter(s=>s.mode!=='dead').length,
  'металл',Math.round(snap.earth.metal),'еда',Math.round(snap.earth.food),'топливо',Math.round(snap.earth.fuel),'детали',Math.round(snap.earth.parts),'люди',Math.round(snap.earth.people));
