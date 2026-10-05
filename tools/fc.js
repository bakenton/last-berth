// forecast accuracy: pro bot, forecast for the ark mark sampled every 100 years after the date vs the year it actually lands
const fs=require('fs');
const src=fs.readFileSync('sim.js','utf8').split('const corePath')[0];
const M=new Function('require','process',src+';return {load,play};')(require,process);
const names=['driveForecast','arkReady','arkWake'];
for(const seed of (process.argv[2]||'11,22,33,44,55,66,77,88').split(',').map(Number)){
  const C=M.load('core.js');
  const extra=new Function(fs.readFileSync('core.js','utf8')+';return {driveForecast,arkReady}')();
  const t0=C.tick; const samples=[]; let hit=null, G0=null;
  C.tick=function(G){ G0=G; t0(G);
    if(G.night&&G.arkMark!=null){
      if(!hit&&(G.driveLvl||0)>=G.arkMark) hit=G.day;
      if(!hit&&(G.day-(G.night-2200))%150===0){ const f=extra.driveForecast.call(null,G,G.arkMark); samples.push(G.day+':'+(f.st==='ok'?f.y:f.st)+(f.st==='settled'?'('+f.r+'/'+f.n+')':'')) }
    }};
  const r=M.play(C,seed,3200,'pro');
  console.log(seed,'night',G0.night,'mark',G0.arkMark,'lvl',G0.driveLvl,'hit',hit,'end',r.day,r.over,'|',samples.join(' '));
}
