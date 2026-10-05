/* mechanical checks for the v3.2 range rule — not statistics, assertions */
const fs=require('fs');
function load(path){
  const src=fs.readFileSync(path,'utf8');
  const names=['newGame','tick','K','SECTORS','PLANETS','HULLS','planet','reach','buildShip','colonize',
   'setLine','survey','canSurvey','startDrive','canReachSector','sectorLimit','classRange','hullRange',
   'ensureGen','openSector','shipById','advice','surveyCost','classFor','genForSector'];
  return new Function(src+'\n;return {'+names.map(n=>n+':typeof '+n+'!=="undefined"?'+n+':undefined').join(',')+'};')();
}
function scenario(path,label,GEN){
  const C=load(path);
  const G=C.newGame(4242);
  // force the chart and the fleet to a given state
  G.gen=GEN; C.ensureGen(GEN);
  while(C.SECTORS.length<6) C.openSector(G);
  // one colony per sector so lines are legal
  const perSec={};
  C.PLANETS.forEach(p=>{ if(perSec[p.sec]===undefined) perSec[p.sec]=p.id });
  Object.values(perSec).forEach(id=>{
    G.colonies[id]={pid:id,pop:40,unrest:0,relay:false,dark:false,pending:null,
      store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0};
  });
  G.earth.fuel=1e6;
  const out=[];
  ['courier','hauler','freighter'].forEach(key=>{
    const hi=C.HULLS.findIndex(h=>h.key===key&&h.gen===GEN);
    const reached=[];
    for(let sec=0;sec<6;sec++){
      const s={id:G.nextShip++,hull:hi,cap:C.HULLS[hi].cap,mode:'idle',at:'earth',cargo:{metal:0,food:0,fuel:0,parts:0,people:0},
               out:{},take:{},missDays:0,bearing:null,job:null,auto:true};
      G.ships.push(s);
      const r=C.setLine(G,s.id,perSec[sec],'earth');
      reached.push(r==='range'?'-':(r==='ok'?sec:r[0]));
    }
    out.push(key.padEnd(10)+' sectors served: '+reached.join(' '));
  });
  // can the chart run past the fleet?
  const G2=C.newGame(77);
  G2.gen=0;
  for(let i=0;i<40;i++) G2.colonies['x'+i]={pid:C.PLANETS[0].id,pop:10,dark:false,store:{},hist:[],neglect:0};
  G2.earth.metal=1e6;G2.earth.food=1e6;G2.earth.fuel=1e6;G2.earth.parts=1e6;
  const before=C.SECTORS.length;
  let charted=0; for(let i=0;i<4;i++){ if(C.survey(G2)==='ok') charted++ }
  out.push('generation 0, charting 4 more sectors -> '+charted+' charted (was '+before+', now '+C.SECTORS.length+')');
  out.push('survey parts cost, sector 3/4/5: '+[3,4,5].map(n=>C.surveyCost(n).parts).join(' / '));
  console.log('== '+label+' ==\n  '+out.join('\n  ')+'\n');
}
scenario('core-old.js','v3.1 before \u00b7 6 sectors, generation III',3);
scenario('core.js','v3.2 after \u00b7 6 sectors, generation III',3);
scenario('core.js','v3.2 after \u00b7 6 sectors charted at generation 0 (the chart ran ahead)',0);
