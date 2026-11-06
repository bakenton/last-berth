// hubs (v5.01, from the nodes-game branch): how the network bot plays. Per style: ark sailed / lost, souls, and at year 3000 the network (hubs, feeders), the share
// of the hold in couriers and the hulls on trunk (hub -> Earth), feeder (world -> hub) and plain Earth lines. VERBOSE=1: every run.
// Run from work/: node ../tools/nodes-diag.js [bots] [seeds] [years]
// env: as sim.js (NOHUB=1, NOEX=1, EX_YEARS, HUB_FROM, HUB_HALF) and K_<NAME>=<value> to set core constants (K_HUB_SAME=1).
// 05.11 (parts check): every run counts the yard's answers to the bot (orderFor / buildShip codes: cost, parts, crew...) and the
// (o: orderFor, b: buildShip; the bot probes several hulls with buildShip, so b:cost counts tries) and the
// line-years the bot wanted a hull on a line and Earth lacked its parts (wantP) or metal (wantM). For a lost run it prints the
// Earth 300 years before the end: generation, parts, metal, people; and, for the 300 years before the last famine starts (famine
// lasts DEAD_DAYS 260), the farm-years by what held the farms (see farms()); the most of them names the cause. PARTS=0 hides it.
const path=require('path');
const {load,step,CLS}=require('./sim.js');
const bots=(process.argv[2]||'idle,greedy,rush,serial,ark,bank').split(','), seeds=(process.argv[3]||'11,22,33,44,55,66,77,88').split(',').map(Number), days=+(process.argv[4]||4500);
const AT=3000, BACK=300;
function net(C,G){ const o={hubs:0,feeders:0,trunkC:0,trunkB:0,feedC:0,feedB:0,earthC:0,earthB:0,holdC:0,hold:0};
  for(const k in G.colonies){ if(G.colonies[k].via) o.feeders++; if(C.isHub&&C.isHub(G,k)) o.hubs++ }
  for(const s of G.ships){ if(s.mode==='dead'||s.mode==='missing') continue; const big=C.HULLS[s.hull].key!=='courier';
    o.hold+=s.cap; if(!big) o.holdC+=s.cap;
    if(!(s.from&&s.to)) continue;
    if(s.to!=='earth') o[big?'feedB':'feedC']++; else if(C.isHub&&C.isHub(G,s.from)) o[big?'trunkB':'trunkC']++; else o[big?'earthB':'earthC']++ }
  return o }
/* the bot wanted more hulls of a class on a line than it has: what Earth lacked for the hull the yards offer */
function wants(C,G,st,R){ const E=G.earth;
  for(const k in st.want||{}){ const L=st.want[k]; if(!G.colonies[k]) continue;
    for(const cls of CLS){ if((L[cls]||0)<=C.lineCount(G,k,cls)) continue; const hi=C.orderHull(G,cls,k); if(hi===null) continue; const h=C.HULLS[hi];
      if(E.parts<(h.parts||0)) R.wantP++; else if(E.metal<h.metal) R.wantM++ } } }
/* one year of the farms, for the famine's cause: per farm, is food piling up for want of hulls, and what would the yards answer
   for each class (orderCheck with the hull orderHull offers). A farm-year is
   pile: no food sitting — more hulls would not help (too few farms, or the seam is dry);
   ok: food sits and some class could be ordered now — the bot did not (its own floors, pace, or plan);
   limit-parts / limit-fuel: food sits, the courier is barred (orderCheck 'range': the courier rule or the ring's reach), the big
   hulls lack parts (fuel); parts / fuel / metal: food sits, every class lacks it; other: anything else (crew, night, evacuation). */
function farms(C,G){ const E=G.earth, o={};
  for(const k in G.colonies){ if(C.planet(k).kind!=='farm') continue; const lr=C.lineRate(G,k); let y;
    if(!lr||!(lr.piling&&lr.sitting>200)) y='pile';
    else { const code={}, short=new Set();
      for(const cls of CLS){ const hi=C.orderHull(G,cls,k); code[cls]=hi===null?'locked':C.orderCheck(G,k,cls,hi);
        if(code[cls]==='cost'){ const h=C.HULLS[hi]; for(const r of ['parts','fuel','metal']) if(E[r]<(h[r]||0)) short.add(r) } }
      const big=['hauler','freighter'].map(c=>code[c]), res=['parts','fuel','metal'].find(r=>short.has(r))||'';
      y=CLS.some(c=>code[c]==='ok')?'ok':code.courier==='range'&&big.every(c=>c==='cost'||c==='locked')?'limit-'+res:CLS.every(c=>code[c]==='cost'||code[c]==='locked')?res:'other' }
    o[y]=(o[y]||0)+1 }
  return o }
const CAUSE=['limit-parts','limit-fuel','limit-metal','parts','fuel','metal','ok','other','pile'];   // ties go to the first
const f1=x=>(+x).toFixed(1);
for(const bot of bots){ const EX={}, A={n:0,sailed:0,lost:0,souls:0,snap:0,hubs:0,feeders:0,holdC:0,trunkB:0,feedC:0,feedB:0,earthC:0,earthB:0,worlds:0}, LOST=[], Rall={};
  for(const seed of seeds){
    const C=load(path.resolve('core.js'));
    for(const e in process.env){ if(e.startsWith('K_')) C.K[e.slice(2)]=+process.env[e] }
    const R={wantP:0,wantM:0,codes:{}}, tally=(w,r)=>{ if(r!=='ok') R.codes[w+r]=(R.codes[w+r]||0)+1; return r };
    const oF=C.orderFor, oB=C.buildShip; C.orderFor=function(){ return tally('o:',oF.apply(null,arguments)) }; C.buildShip=function(){ return tally('b:',oB.apply(null,arguments)) };
    const G=C.newGame(seed), st={idleY:{},fuelHist:[]}, H=[]; let n=null, F=null; const FH=[];
    for(let d=0;d<days&&!G.over;d++){ C.tick(G); G.pauseNow=false; step(C,G,bot,d,st); if(d===AT){ n=net(C,G); n.parts=G.earth.parts; n.metal=G.earth.metal; n.gen=G.gen||0 }
      if(!G.over){ FH.push(farms(C,G)); if(FH.length>BACK) FH.shift() }
      if(G.famine===1&&(!F||F.d<d-1)){ F={d,gen:G.gen||0,parts:Math.round(G.earth.parts),metal:Math.round(G.earth.metal),y:{}}; for(const x of FH) for(const k in x) F.y[k]=(F.y[k]||0)+x[k] }
      if(!G.over){ wants(C,G,st,R); const E=G.earth; H.push({d,gen:G.gen||0,parts:Math.round(E.parts),metal:Math.round(E.metal),people:Math.round(E.people),food:Math.round(E.food)}) } }
    for(const x of st.ex||[]){ const kx=x.r+'<'+x.a+'+'+x.b; EX[kx]=EX[kx]||{n:0,got:0,pay:{}}; EX[kx].n++; EX[kx].got+=x.n; EX[kx].pay[x.a]=(EX[kx].pay[x.a]||0)+x.x; EX[kx].pay[x.b]=(EX[kx].pay[x.b]||0)+x.y }   // nodes-1.02
    A.n++; if(G.over==='night'&&G.souls>0){ A.sailed++; A.souls+=G.souls } if(G.over==='lose') A.lost++;
    for(const c in R.codes) Rall[c]=(Rall[c]||0)+R.codes[c]; Rall.wantP=(Rall.wantP||0)+R.wantP; Rall.wantM=(Rall.wantM||0)+R.wantM;
    if(G.over==='lose'){ const b=H[Math.max(0,H.length-1-BACK)]||{}; LOST.push({seed,end:H.length,b,R,F}) }
    if(n){ A.snap++; for(const k of ['hubs','feeders','trunkB','feedC','feedB','earthC','earthB']) A[k]+=n[k]; A.holdC+=n.hold?n.holdC/n.hold:0; A.worlds+=Object.keys(G.colonies).length; A.parts=(A.parts||0)+n.parts; A.metal=(A.metal||0)+n.metal; A.gen=(A.gen||0)+n.gen }
    if(process.env.VERBOSE){ const E=G.earth; console.log(' ',bot,seed,G.over||'alive','souls',G.souls||0,'year',G.day,n?('hubs '+n.hubs+' feeders '+n.feeders+' trunk '+n.trunkC+'c/'+n.trunkB+'b feed '+n.feedC+'c/'+n.feedB+'b earth '+n.earthC+'c/'+n.earthB+'b'):'',G.over==='lose'?('people '+Math.round(E.people)+' food '+Math.round(E.food)):'') } }
  const s=A.snap||1;
  console.log([bot,'sailed',A.sailed+'/'+A.n,'lost',A.lost,'souls',A.sailed?Math.round(A.souls/A.sailed):0,'| y'+AT+':','hubs',f1(A.hubs/s),'feeders',f1(A.feeders/s),'courier hold%',Math.round(100*A.holdC/s),
    'trunk big',f1(A.trunkB/s),'feed c/b',f1(A.feedC/s)+'/'+f1(A.feedB/s),'earth c/b',f1(A.earthC/s)+'/'+f1(A.earthB/s),'gen',f1((A.gen||0)/s),'parts',Math.round((A.parts||0)/s),'metal',Math.round((A.metal||0)/s)].join(' '));
  const exK=Object.keys(EX).sort((a,b)=>EX[b].n-EX[a].n);   // nodes-1.02: the bot's exchanges per run — get<pay+pay: times, got, paid
  if(exK.length) console.log('  exchanges/run',f1(exK.reduce((m,k)=>m+EX[k].n,0)/A.n),'|',exK.map(k=>k+' ×'+f1(EX[k].n/A.n)+' +'+Math.round(EX[k].got/A.n)+' −'+Object.keys(EX[k].pay).map(r=>Math.round(EX[k].pay[r]/A.n)).join('/')).join(' · '));
  if(process.env.PARTS!=='0'){
    console.log('  refusals/run',Object.keys(Rall).sort().map(c=>c+' '+f1(Rall[c]/A.n)).join(' '));
    for(const L of LOST){ const b=L.b; console.log('  lost seed',L.seed,'end y'+L.end,'| y'+b.d+': gen',b.gen,'parts',b.parts,'metal',b.metal,'people',b.people,'food',b.food,
      '| refusals',Object.keys(L.R.codes).map(c=>c+' '+L.R.codes[c]).join(' ')||'-','wantP',L.R.wantP,'wantM',L.R.wantM);
      const F=L.F; if(F) console.log('    famine y'+F.d+': gen',F.gen,'parts',F.parts,'metal',F.metal,'| farm-years before it:',CAUSE.filter(c=>F.y[c]).map(c=>c+' '+F.y[c]).join(' '),'=>',CAUSE.reduce((m,c)=>(F.y[c]||0)>(F.y[m]||0)?c:m,CAUSE[0]).toUpperCase()) } } }
