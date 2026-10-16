/* LOAD — how many hands-on actions a style of play costs, per century (v4.34, Nikita 14–15.10: lines manned by hand).
   node tools/load.js [core=core.js] [years=4500] [seeds=11,22,…,88]        (from work/, like sim.js)
   env: SIM=path/to/sim.js (default tools/sim.js; the pre-v4.34 bot: git show 5302338:tools/sim.js > tools/_sim433.js, core: git show 5302338:work/core.js — the last v4.33 commit) · BOTS=rush,serial (default rush,serial,ark,bank) · CSV=file (one row per seed)
   Wraps the core calls the bot makes; a call counts when it returns ok/queued (clearLine only when the hull had a line).
   line  = setLine + clearLine + moveLine + orderFor — putting hulls on lines, taking them off, ordering one for a line
   other = buildShip (free hull) + colonize + abandon + scrap + survey + startDrive + orderKit + setReserve + arkBuy
   For a core from before v4.34 (standing orders) it also counts what the player clicked (setWant: one click per unit of change)
   and what the yards did on their own (yard_take, yard_line, yard_renew, a retired hull scrapped) — that is the work the
   hands now do. Per century: mean over the run, the busiest century, and the mean over centuries with 15+ live worlds.
   hand = setLine + orderFor + moveLine — manning a line, without taking hulls off: the planner's 'no fuel, no well: the lines
   stop' rule takes every line off each year of a fuel crunch (in the old core too), which a player would not do.
   For a pre-v4.34 core, hand + auto is the same work: auto is what the yards did on their own. */
const fs=require('fs'), path=require('path');
const [corePath='core.js', years='4500', seedsArg='11,22,33,44,55,66,77,88']=process.argv.slice(2);
const simPath=path.resolve(process.env.SIM||path.join(__dirname,'sim.js'));
const {step}=require(simPath);
const simSrc=fs.readFileSync(simPath,'utf8');
const names=eval('['+(simSrc.match(/const names=\[([\s\S]*?)\];/)||[])[1]+']').concat(['setWant','lineWant','orderFor','moveLine','tick','newGame']);
function loadCore(p){
  let src=fs.readFileSync(p,'utf8');
  // pre-v4.34 cores: count what the yards did on their own
  src=src.replace("log(G,'yard_take',","(G.stats.autoTake=(G.stats.autoTake||0)+1),log(G,'yard_take',");
  const uniq=[...new Set(names)];
  return new Function(src+'\n;return {'+uniq.map(n=>n+':(typeof '+n+'!=="undefined"?'+n+':undefined)').join(',')+'};')();
}
const LINE=['setLine','clearLine','moveLine','orderFor'], OTHER=['buildShip','colonize','abandon','scrap','survey','startDrive','orderKit','setReserve','arkBuy'];
const seeds=seedsArg.split(',').map(Number);
const bots=process.env.BOTS?process.env.BOTS.split(','):['rush','serial','ark','bank'];
const med=a=>{ const b=a.slice().sort((x,y)=>x-y); return b.length?b[Math.floor(b.length/2)]:0 };
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const rows=[];
console.log(path.basename(path.dirname(simPath))+'/'+path.basename(simPath)+' · '+corePath+' · '+years+'y · '+seeds.length+' seeds');
console.log(['bot','line/c','peak c','hand/c','hand peak','hand/c 15+w','other/c','clicks/c','auto/c','worlds max','mutinies','lost','sailed'].join('\t'));
for(const bot of bots){
  const R=[];
  for(const sd of seeds){
    const C=loadCore(corePath), G=C.newGame(sd), st={idleY:{},fuelHist:[]};
    const n={line:0,other:0,clicks:0}, cent={}, wc={}, kind={}, kcent={}, hand={};
    const Cw=Object.assign({},C);
    const bump=(k,c)=>{ n[k]+=c; if(k==='line'){ const b=Math.floor(G.day/100); cent[b]=(cent[b]||0)+c } };
    for(const f of LINE.concat(OTHER)) if(C[f]) Cw[f]=function(){ const a=arguments;
      let had=true; if(f==='clearLine'){ const s=C.shipById(G,a[1]); had=!!(s&&(s.from||s.pend||s.lineFor)) }
      const r=C[f].apply(null,a); if((r==='ok'||r==='queued')&&had){ bump(LINE.includes(f)?'line':'other',1); kind[f]=(kind[f]||0)+1;
        if(LINE.includes(f)){ const b=Math.floor(G.day/100), kc=kcent[b]=kcent[b]||{}; kc[f]=(kc[f]||0)+1;
          if(f!=='clearLine') hand[b]=(hand[b]||0)+1 } } return r };
    if(C.setWant) Cw.setWant=function(G_,pid,cls,k){ const was=C.lineWant(G_,pid,cls); const r=C.setWant(G_,pid,cls,k); if(r==='ok') n.clicks+=Math.abs(Math.max(0,Math.min(12,Math.round(k)))-was); return r };
    for(let d=0;d<+years&&!G.over;d++){ C.tick(G); G.pauseNow=false; step(Cw,G,bot,d,st);
      const b=Math.floor(G.day/100), w=Object.keys(G.colonies).length; if(!(wc[b]>=w)) wc[b]=w }
    const cs=Math.max(1,Math.ceil(G.day/100)), list=[], hl=[]; for(let b=0;b<cs;b++){ list.push(cent[b]||0); hl.push(hand[b]||0) }
    const big=hl.filter((x,b)=>(wc[b]||0)>=15);
    const auto=(G.stats.autoTake||0)+(C.setWant?(G.stats.yardBuilt||0)+(G.stats.renewed||0):0);
    const pk=list.indexOf(Math.max(...list));
    const r={bot,seed:sd,kind:Object.fromEntries(Object.entries(kind).map(([k,v])=>[k,v/cs])),peakAt:pk*100,peakKind:kcent[pk]||{},line:n.line/cs,peak:Math.max(...list),hand:hl.reduce((x,y)=>x+y,0)/cs,handPeak:Math.max(...hl),big:big.length?avg(big):null,other:n.other/cs,clicks:n.clicks/cs,auto:auto/cs,
      worlds:Math.max(0,...Object.values(wc)),mut:G.stats.mutinies||0,lost:G.stats.lost||0,sailed:G.over==='night'&&(G.souls||0)>0};
    R.push(r); rows.push(r);
  }
  const f1=x=>x.toFixed(1), bigs=R.map(r=>r.big).filter(x=>x!==null);
  console.log([bot,f1(avg(R.map(r=>r.line))),med(R.map(r=>r.peak)),f1(avg(R.map(r=>r.hand))),med(R.map(r=>r.handPeak)),bigs.length?f1(avg(bigs))+' ('+bigs.length+')':'—',f1(avg(R.map(r=>r.other))),f1(avg(R.map(r=>r.clicks))),f1(avg(R.map(r=>r.auto))),
    f1(avg(R.map(r=>r.worlds))),f1(avg(R.map(r=>r.mut))),f1(avg(R.map(r=>r.lost))),R.filter(r=>r.sailed).length+'/'+R.length].join('\t'));
  if(process.env.DETAIL){ const ks=LINE.concat(OTHER), pkk={}; R.forEach(r=>{ for(const k in r.peakKind) pkk[k]=(pkk[k]||0)+r.peakKind[k]/R.length });
    console.log('  per century by call: '+ks.map(k=>k+' '+f1(avg(R.map(r=>r.kind[k]||0)))).join(' · '));
    console.log('  busiest century starts at year (median) '+med(R.map(r=>r.peakAt))+'; in it, mean: '+Object.entries(pkk).map(([k,v])=>k+' '+f1(v)).join(' · ')) }
}
console.log('line/c, hand/c, other/c, clicks/c, auto/c — per century, mean over seeds; peak c, hand peak — busiest century (median of seeds); 15+w — centuries with 15+ live worlds (seeds that had any)');
if(process.env.CSV) fs.writeFileSync(process.env.CSV,'bot,seed,line,peak,hand,handpeak,big,other,clicks,auto,worlds,mutinies,lost,sailed\n'+rows.map(r=>[r.bot,r.seed,r.line.toFixed(2),r.peak,r.hand.toFixed(2),r.handPeak,r.big===null?'':r.big.toFixed(2),r.other.toFixed(2),r.clicks.toFixed(2),r.auto.toFixed(2),r.worlds,r.mut,r.lost,r.sailed?1:0].join(',')).join('\n')+'\n');
