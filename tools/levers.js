// Read-only for the repo: patched COPIES of core and bot in a temp folder, one variant per process. Run from work/: node ../tools/levers.js <variant>
// variant: words joined by + : base, L<n> (hulls per line), G<x> (courier hold growth), CHEAP (big hulls cheaper), Z<n> (no courier on lines of sec>=n),
//   B<a> (Earth's batch: from Gen II on, M = a x the current hauler's hold), F<n> (with B: lines of sec<n take no batch; default 2). B does not combine with Z.
const fs=require('fs'), path=require('path'), scratch=fs.mkdtempSync(path.join(require('os').tmpdir(),'levers-'));
const v=process.argv[2]||'base', words=v.split('+');
function rep(s,a,b){ if(!s.includes(a)) throw new Error('no match: '+a.slice(0,70)); return s.split(a).join(b) }
let c=fs.readFileSync('core.js','utf8'), m=fs.readFileSync('../tools/sim.js','utf8');
m=rep(m,"C.tick(G); G.pauseNow=false; step(C,G,bot,d,st) }","global.__gen=G.gen||0; C.tick(G); G.pauseNow=false; step(C,G,bot,d,st); if(global.__snap) global.__snap(C,G,d,bot,seed) }");
let LIM=0;
for(const w of words){
  if(w==='base'||w[0]==='Q'||w[0]==='F') continue;
  // H: the bot settles no new world while a farm stands without a line (a player would not; the plain bot spends Earth's last people that way)
  if(w==='H'){ m=rep(m,"if(!arkOnly&&E.people>K.EARTH_KEEP+P.hands&&","if(!arkOnly&&!Object.keys(G.colonies).some(k=>C.planet(k).kind==='farm'&&!C.onLine(G,k).length)&&E.people>K.EARTH_KEEP+P.hands&&"); continue }
  if(w[0]==='B'){ const a=+w.slice(1), fw=words.find(x=>x[0]==='F'), F=fw?+fw.slice(1):2;
    c=rep(c,'function canReachSector(s,sec){ return sec<=shipRange(s) }','function canReachSector(s,sec){ return sec<=shipRange(s) }\n'+
      'function batchM(G,p){ if(!(G.gen||0)||p.kind==="works"||p.sec<'+F+') return 0; return Math.round('+a+'*HULL_BASE[1].cap*Math.pow(HULL_BASE[1].grow,G.gen)) }\n'+
      'function batchOk(G,s,p){ return (HULLS[s.hull]?HULLS[s.hull].cap:0)>=batchM(G,p) }');
    c=rep(c,"if(!canReachSector(s,planet(from).sec)) return 'range';","if(!canReachSector(s,planet(from).sec)||!batchOk(G,s,planet(from))) return 'range';");
    c=rep(c,"if(!canReachSector({hull:hi},p.sec)) return 'range';","if(!canReachSector({hull:hi},p.sec)||!batchOk(G,{hull:hi},p)) return 'range';");
    c=rep(c,"if(!canReachSector(s,p.sec)) return 'range';\n  if(G.reserves[pid]<=0&&p.kind!=='works'&&pileLeft(G,pid)<1) return 'depleted';\n  /* v4.32","if(!canReachSector(s,p.sec)||!batchOk(G,s,p)) return 'range';\n  if(G.reserves[pid]<=0&&p.kind!=='works'&&pileLeft(G,pid)<1) return 'depleted';\n  /* v4.32");
    // at the far end: a hold too small for the batch goes home off the line; otherwise she waits for the pile. A dead seam sends its remainder as is. Works are exempt: hulls bring their feed, waiting would deadlock.
    c=rep(c,"var d=legDist(here,dest);\n  var f=Math.max(1,","if(here!=='earth'&&dest==='earth'){ var bp=planet(here), bm=bp?batchM(G,bp):0;\n"+
      "    if(bm&&G.reserves[here]>0){ if(!batchOk(G,s,bp)){ s.from=null; s.to=null; s.pend=null; s.origin=here; s.dest='earth'; s.at=null; s.mode='transit'; s.dir='in'; s.t=legDays(G,here,'earth',s); s.total=s.t; return 'ok' }\n"+
      "      if(pileLeft(G,here)<bm) return 'batch' } }\n  var d=legDist(here,dest);\n  var f=Math.max(1,");
    // a hull released while waiting at the far end heads home (in the game no hull ever stands idle there)
    c=rep(c,"if(s.mode==='idle'){ if(s.from&&s.to) sail(G,s); continue }","if(s.mode==='idle'){ if(s.from&&s.to) sail(G,s); else if(s.at&&s.at!=='earth'){ s.origin=s.at; s.dest='earth'; s.at=null; s.mode='transit'; s.dir='in'; s.t=legDays(G,s.origin,'earth',s); s.total=s.t } continue }");
    m=rep(m,"'orderKit','canKit'","'batchOk','orderKit','canKit'");
    m=rep(m,"if(!C.canReachSector({hull:hi},p.sec)) return 'range';","if(!C.canReachSector({hull:hi},p.sec)||!C.batchOk(G,{hull:hi},p)) return 'range';");
    m=rep(m,"if(!wantSum(L)){ setW(C,G,st,k,'courier',1);","if(!wantSum(L)){ setW(C,G,st,k,CLS.find(c=>yardOk(C,G,k,c)!=='range'&&yardOk(C,G,k,c)!=='locked')||'courier',1);");
    m=rep(m,"(fits('courier')?'courier':null)","(fits('courier')&&yardOk(C,G,k,'courier')!=='range'?'courier':null)");
    continue;
  }
  if(w[0]==='L'){ LIM=+w.slice(1);
    c=rep(c,"if(!canReachSector({hull:hi},p.sec)) return 'range';\n  if(G.reserves[pid]<=0","if(!canReachSector({hull:hi},p.sec)) return 'range';\n  if(onLine(G,pid).length>="+LIM+") return 'lineFull';\n  if(G.reserves[pid]<=0");
    c=rep(c,"if(s.mode==='building'||s.mode==='transit'){ s.pend={from:from,to:to}","var ol_=onLine(G,from); if(from!=='earth'&&ol_.length>="+LIM+"&&ol_.indexOf(s)<0) return 'lineFull';\n  if(s.mode==='building'||s.mode==='transit'){ s.pend={from:from,to:to}");
    c=rep(c,"if((s.from||(s.pend&&s.pend.from))===pid) return 'samenode';","if((s.from||(s.pend&&s.pend.from))===pid) return 'samenode';\n  if(onLine(G,pid).length>="+LIM+") return 'lineFull';");
    // the bot at the limit swaps its smallest hull for a bigger class, as a player would
    m=rep(m,"if(cls&&wantSum(L)<8) setW(C,G,st,k,cls,(L[cls]||0)+1) }",
      "if(cls&&wantSum(L)<"+LIM+") setW(C,G,st,k,cls,(L[cls]||0)+1);\n"+
      "        else if(wantSum(L)>="+LIM+"){ for(const big of (P.big?['freighter','hauler']:['hauler'])){ if(!fits(big)||yardOk(C,G,k,big)!=='ok') continue;\n"+
      "          const rank=x=>CLS.indexOf(x); const vic=C.onLine(G,k).filter(o=>o.mode!=='building'&&rank(C.HULLS[o.hull].key)<rank(big)).sort((a,b)=>a.cap-b.cap)[0]; if(!vic) continue;\n"+
      "          const vc=C.HULLS[vic.hull].key; C.clearLine(G,vic.id); setW(C,G,st,k,vc,Math.max(0,(L[vc]||0)-1)); setW(C,G,st,k,big,(L[big]||0)+1); break } } }");
  }
  else if(w[0]==='G'){ c=rep(c,"crew:8,  grow:1.9","crew:8,  grow:"+w.slice(1)) }
  else if(w==='CHEAP'){ c=rep(c,"metal:130, fuel:45,  parts:26","metal:80, fuel:45,  parts:15"); c=rep(c,"metal:320, fuel:120, parts:85","metal:160, fuel:120, parts:40") }
  else if(w[0]==='Z'){ const R=+w.slice(1);
    c=rep(c,'function canReachSector(s,sec){ return sec<=shipRange(s) }','function canReachSector(s,sec){ return sec<=shipRange(s) }\nfunction canLineSector(s,sec){ return canReachSector(s,sec)&&!((HULLS[s.hull]||{}).key==="courier"&&sec>='+R+') }');
    c=rep(c,"if(!canReachSector(s,planet(from).sec)) return 'range';","if(!canLineSector(s,planet(from).sec)) return 'range';");
    c=rep(c,"if(!canReachSector({hull:hi},p.sec)) return 'range';","if(!canLineSector({hull:hi},p.sec)) return 'range';");
    c=rep(c,"if(!canReachSector(s,p.sec)) return 'range';\n  if(G.reserves[pid]<=0&&p.kind!=='works'&&pileLeft(G,pid)<1) return 'depleted';\n  /* v4.32","if(!canLineSector(s,p.sec)) return 'range';\n  if(G.reserves[pid]<=0&&p.kind!=='works'&&pileLeft(G,pid)<1) return 'depleted';\n  /* v4.32");
    m=rep(m,"'orderKit','canKit'","'canLineSector','orderKit','canKit'");
    m=rep(m,"if(!C.canReachSector({hull:hi},p.sec)) return 'range';","if(!C.canLineSector({hull:hi},p.sec)) return 'range';");
    m=rep(m,"if(!wantSum(L)){ setW(C,G,st,k,'courier',1);","if(!wantSum(L)){ setW(C,G,st,k,CLS.find(c=>yardOk(C,G,k,c)!=='range'&&yardOk(C,G,k,c)!=='locked')||'courier',1);");
    m=rep(m,"(fits('courier')?'courier':null)","(fits('courier')&&yardOk(C,G,k,'courier')!=='range'?'courier':null)");
  }
}
const tag=v.replace(/[^A-Za-z0-9.]/g,'_');
const cp=path.join(scratch,'lv-core-'+tag+'.js'), sp=path.join(scratch,'lv-sim-'+tag+'.js');
fs.writeFileSync(cp,c); fs.writeFileSync(sp,m);
const {load,play}=require(sp); const C=load(cp);
// Q<a>: a world's output (mines, wells, farms and works) grows by a per generation of the drive
{ const q=words.find(w=>w[0]==='Q'); if(q){ const a=+q.slice(1), P0=C.K.PROD, R0=C.K.REFINE;
  Object.defineProperty(C.K,'PROD',{get(){ return P0*(1+a*(global.__gen||0)) },configurable:true});
  Object.defineProperty(C.K,'REFINE',{get(){ return R0*(1+a*(global.__gen||0)) },configurable:true}) } }
const seeds=[101,102,103,104,105,106,107,108], bots=['idle','greedy','rush','serial','ark','bank'], years=[1000,2000,3000];
const S={};
const CL=['courier','hauler','freighter'];
const W={};   // hull-years on a line, and those of them spent waiting at the far end for a batch
global.__snap=(C,G,d,bot,seed)=>{ const sw=W[bot]=W[bot]||{w:0,o:0};
  for(const s of G.ships){ if(s.from&&s.to&&s.mode!=='dead'&&s.mode!=='building'&&s.mode!=='missing'){ sw.o++; if(s.mode==='idle'&&s.at&&s.at!=='earth') sw.w++ } }
  if(!years.includes(d)||(bot!=='rush'&&bot!=='serial')) return;
  const a=S[bot+d]=S[bot+d]||{n:0,c:0,h:0,f:0,hc:0,hh:0,hf:0,metal:0,Nc:[],best:{courier:0,hauler:0,freighter:0,none:0}};
  a.n++; a.metal+=G.earth.metal||0;
  for(const s of G.ships){ if(s.mode==='dead'||s.mode==='missing') continue; const h=C.HULLS[s.hull], k=h.key[0]; a[k]++; a['h'+k]+=s.cap||h.cap }
  for(const k in G.colonies){ const lr=C.lineRate(G,k); if(!lr||lr.makes<=0) continue; const p=C.planet(k); let best=null;
    for(const cls of CL){ const h=C.HULLS.find(x=>x.key===cls&&x.gen===(G.gen||0)); if(!h) continue;
      const y=h.cap/Math.max(1,C.legDays(G,k,'earth',{hull:h.id})*2), N=lr.makes/y; if(cls==='courier') a.Nc.push(N);
      if(p.sec>sectorOf(h)) continue;
      const n=Math.max(1,Math.ceil(N-1e-9)); if(LIM&&n>LIM) continue;
      const cost=n*(h.metal+(h.parts||0)); if(!best||cost<best.cost) best={cls,cost} }
    a.best[best?best.cls:'none']++ } };
function sectorOf(h){ return ({courier:1,hauler:2,freighter:3})[h.key]+h.gen }
const f=(x,n=0)=>(+x).toFixed(n);
const lines=[];
// LV_DEATHS=1: how each lost run of the four styles ended
const deathNote=(bot,seed)=>process.env.LV_DEATHS&&bot!=='idle'&&bot!=='greedy'?G=>{ if(G.over!=='lose') return; const E=G.earth, farms=Object.keys(G.colonies).filter(k=>C.planet(k).kind==='farm');
  const lined=farms.filter(k=>C.onLine(G,k).length), dry=farms.filter(k=>G.reserves[k]<=0).length, free=G.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)).length, built=G.ships.filter(s=>s.mode==='building').length, ships=G.ships.filter(s=>s.mode!=='dead').length;
  console.log('DEATH',bot,seed,'year',G.day,'gen',G.gen||0,'night',G.night||0,'metal',Math.round(E.metal),'fuel',Math.round(E.fuel),'parts',Math.round(E.parts),'people',Math.round(E.people),'worlds',Object.keys(G.colonies).length,'farms',farms.length,'lined',lined.length,'dry',dry,'ships',ships,'free',free,'building',built) }:undefined;
for(const bot of bots){ let won=0,souls=0,dead=0,worlds=0,left=0;
  for(const seed of seeds){ const r=play(C,seed,4500,bot,deathNote(bot,seed)); if(r.over==='night'&&r.souls>0){ won++; souls+=r.souls } else if(r.over!=='alive'&&r.over!=='night') dead++; worlds+=r.worlds }
  lines.push([v,bot,'ark',won+'/8','souls',won?Math.round(souls/won):0,'lost',dead,'worldsEnd',f(worlds/8,1),'wait%',W[bot]&&W[bot].o?f(100*W[bot].w/W[bot].o,1):0].join(' ')) }
for(const key of Object.keys(S)){ const a=S[key]; const hold=a.hc+a.hh+a.hf; a.Nc.sort((x,y)=>x-y);
  const tb=a.best.courier+a.best.hauler+a.best.freighter+a.best.none||1;
  lines.push([v,key,'hulls c/h/f',f(a.c/a.n,1),f(a.h/a.n,1),f(a.f/a.n,1),'hold%',f(100*a.hc/hold),f(100*a.hh/hold),f(100*a.hf/hold),'metal',f(a.metal/a.n),'Nc p50/p90',f(a.Nc[a.Nc.length>>1]||0,1),f(a.Nc[Math.floor(a.Nc.length*.9)]||0,1),'cheapest% c/h/f/none',f(100*a.best.courier/tb),f(100*a.best.hauler/tb),f(100*a.best.freighter/tb),f(100*a.best.none/tb)].join(' ')) }
fs.writeFileSync(path.join(scratch,'lv-out-'+tag+'.txt'),lines.join('\n')+'\n');
console.log(lines.join('\n'));
