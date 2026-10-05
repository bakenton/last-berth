// when do crews mutiny? pro bot through a forced late game: night set at year 1200+X; count mutinies by years-left and by line length
const fs=require('fs');
const src=fs.readFileSync('sim.js','utf8').split('const corePath')[0];
const M=new Function('require','process',src+';return {load,play};')(require,process);
for(const seed of [11,22,33,44]){
  const C=M.load('core.js'); const t0=C.tick; let rows=[];
  C.tick=function(G){ if(G.day===900){ G.night=G.day+600; G.arkMark=3; G.earth.food=1e6; G.earth.metal=1e5; G.earth.fuel=1e6; }
    // freeze the pro bot from releasing lines at left<=400 so we see the crews decide for themselves
    t0(G);
    G.log.filter(e=>e.code==='mutiny'&&!e.seen).forEach(e=>{ e.seen=1; const s=G.ships.find(x=>x.id===e.d.n); rows.push({left:G.night-G.day, at:e.d.at, round: s? Math.round(C.legDays? 0:0):0, hull:e.d.n}) });
  };
  const play=M.play; const r=play(C,seed,1500,'expand');   // expand bot never releases lines
  const byLeft={}; rows.forEach(x=>{ const b=Math.floor(x.left/50)*50; byLeft[b]=(byLeft[b]||0)+1 });
  console.log(seed,'mutinies',rows.length,'ships alive',r.couriers+r.big,'by years-left',JSON.stringify(byLeft),'far/earth',rows.filter(x=>x.at==='far').length+'/'+rows.filter(x=>x.at==='earth').length);
}
