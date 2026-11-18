// Which advisor rows (core advice(G)) a real bot game shows, and how often — the raw data for the alert tiles.
const path=require('path'), fs=require('fs'), os=require('os'); const [,,REPO,STYLE='serial']=process.argv;
const {load,step}=require(path.join(REPO,'tools','sim.js'));
const tmp=path.join(os.tmpdir(),'core-adv.js');
fs.writeFileSync(tmp,fs.readFileSync(path.join(REPO,'work','core.js'),'utf8')+'\n;globalThis.__advice=advice;');
const C=load(tmp); C.advice=globalThis.__advice;
const G=C.newGame(11), st={idleY:{},fuelHist:[]}, seen={}; let samples=0, maxAt=0, maxN=0;
for(let d=0;d<4500&&!G.over;d++){ C.tick(G); G.pauseNow=false; step(C,G,STYLE,d,st);
  if(d%10===0){ samples++; const a=C.advice(G); a.forEach(r=>{ const k=r.code+':'+r.sev; seen[k]=(seen[k]||0)+1 });
    const n=new Set(a.filter(r=>r.sev!=='ok').map(r=>r.code)).size; if(n>maxN){ maxN=n; maxAt=G.day }
    if([300,1200,2300].includes(d)) console.log('y'+G.day+': '+a.map(r=>r.code+'/'+r.sev).join(' ')) } }
console.log('samples '+samples+' · most non-ok kinds at once: '+maxN+' (year '+maxAt+')');
console.log(Object.entries(seen).sort((a,b)=>b[1]-a[1]).map(e=>e[0]+'×'+e[1]).join(' '));
