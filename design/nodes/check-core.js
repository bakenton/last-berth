// Проверка правил песочницы без браузера: собирает маленькую сеть на копии ядра и смотрит потоки. node design/nodes/check-core.js
const path=require('path'), C=require(path.join(require('os').tmpdir(),'lb-nodes-core.js')), SNAP=C.SNAP;
let fails=0; const ok=(c,t)=>{ console.log((c?'PASS ':'FAIL ')+t); if(!c) fails++ };
function fresh(){ const S=JSON.parse(JSON.stringify(SNAP)), G=C.newGame(S.seed); while(C.SECTORS.length<S.nSec) C.openSector(G); C.ensureGen(S.gen);
  const rnd=G.rnd, full=Object.assign({},G.reserves); for(const k in S) if(k!=='nSec') G[k]=S[k]; G.rnd=rnd; G.reserves=full; G.safe=true;
  const E=G.earth; G.ships.forEach(s=>{ if(s.mode!=='dead') E.people+=s.crew||0 }); for(const c in G.colonies) E.people+=G.colonies[c].pop;
  G.colonies={}; G.ships=[]; G.ghost={}; G.settled={}; E.metal=2e5; E.parts=2e5; E.fuel=2e5; E.food=2e5; E.people=2e4;
  C.K.NIGHT_TRIGGER_SECTORS=1e9; C.K.NIGHT_TRIGGER_YEAR=1e9; C.K.COLONY_LOSS=0; C.K.EVENT_CHANCE=0; return G }
const put=(G,pid,pop)=>{ G.colonies[pid]={pid,pop:pop||100,store:{metal:0,food:0,fuel:0,parts:0},founded:G.day} };
const hull=(G,key)=>{ const r=C.buildShip(G,C.currentHull(G,key)); if(r!=='ok') throw new Error(key+' '+r); return G.ships[G.ships.length-1] };
const run=(G,n)=>{ for(let i=0;i<n&&!G.over;i++){ C.tick(G); G.pauseNow=false } };

let G=fresh();
const mines=C.PLANETS.filter(p=>p.kind==='mine'), far=mines.filter(p=>p.sec>=3).sort((a,b)=>b.sec-a.sec)[0]||mines[mines.length-1];
const same=C.PLANETS.filter(p=>p.kind==='mine'&&p.sec>=far.sec-1&&p.id!==far.id)[0];
const hub=C.PLANETS.filter(p=>p.kind!=='works'&&p.id!==far.id&&p.sec===far.sec-1&&(!same||p.id!==same.id))[0];
ok(!!far&&!!hub,'есть дальний мир и узел: '+far.name+' кольцо '+(far.sec+1)+', '+hub.name+' кольцо '+(hub.sec+1));
put(G,far.id); put(G,hub.id);
const cc=hull(G,'courier'), hh=hull(G,'hauler');
const npBatch=C.NP.batchFrom; C.NP.batchFrom=0;
ok(C.lineCheck(G,cc,far.id,'earth')!=='ok','курьеру нельзя с дальнего кольца к Земле: '+C.lineCheck(G,cc,far.id,'earth'));
ok(C.lineCheck(G,cc,far.id,hub.id)==='ok','курьеру можно к соседнему кольцу');
ok(C.lineCheck(G,cc,hub.id,far.id)==='outward','наружу нельзя');
ok(C.setLine(G,cc.id,far.id,hub.id)==='queued','курьер встал на линию (ещё на верфи)');
ok(C.setLine(G,hh.id,hub.id,'earth')==='queued','тягач встал на линию узел → Земля');
const before=Object.assign({},G.delivered), res0=G.reserves[far.id];
run(G,400);
const c=G.colonies[hub.id]; const dep=far.dep, got=G.delivered[dep]-before[dep];
ok(cc.to===hub.id&&cc.from===far.id,'курьер остался на линии');
ok(c.hubIn>0,'узел принял груз в перевалку: '+Math.round(c.hubIn));
ok(G.reserves[far.id]<res0,'дальний мир копает');
ok(got>0,'груз дальнего мира дошёл до Земли: '+Math.round(got)+' '+dep);
ok(Math.abs(cc.cap-(C.HULLS[cc.hull].cap))<1,'трюм курьера настоящий');
ok(C.hubSum(c)<=C.hubCap(G)+1,'перевалка не выше потолка: '+Math.round(C.hubSum(c))+' / '+C.hubCap(G));

// потолок: без вывоза курьер ждёт с грузом и ничего не теряется
G=fresh(); put(G,far.id); put(G,hub.id,100); C.NP.hubK=0.05;
const c2=hull(G,'courier'); C.setLine(G,c2.id,far.id,hub.id); run(G,400);
const hh2=G.colonies[hub.id], onBoard=c2.cargo.metal+c2.cargo.food+c2.cargo.fuel+c2.cargo.parts;
ok(c2.hubWait===true,'склад полон: курьер ждёт');
ok(onBoard>0,'груз на борту: '+onBoard);
ok(C.hubSum(hh2)<=C.hubCap(G)+1,'перевалка у потолка '+Math.round(C.hubSum(hh2))+' / '+C.hubCap(G));
C.clearLine(G,c2.id); run(G,300);
ok(c2.at==='earth','снятое судно вернулось домой');
C.NP.hubK=2;

// партия: тягач ждёт, пока не набралось
G=fresh(); C.NP.batchFrom=npBatch; put(G,far.id,1); const h3=hull(G,'hauler');
const mM=C.batchM(G,far); ok(mM>0,'партия на дальнем кольце '+mM);
if(C.lineCheck(G,h3,far.id,'earth')==='range'){ console.log('(тягач не дотягивает, берём грузовоз)') }
const big=C.lineCheck(G,h3,far.id,'earth')==='ok'?h3:hull(G,'freighter');
ok(C.setLine(G,big.id,far.id,'earth')==='queued','большое судно на линии');
let sawWait=false, left0=null; for(let i=0;i<600&&!sawWait;i++){ C.tick(G); G.pauseNow=false; if(big.batchWait) sawWait=true }
ok(sawWait,'судно ждёт партию');
run(G,900); const dg=G.delivered[far.dep]; ok(dg>=mM||G.colonies[far.id].store[far.dep]<mM,'когда набрано, партия идёт на Землю: доставлено '+Math.round(dg));

// правило поменялось на ходу: курьер снимается и идёт домой, партия не теряется
G=fresh(); C.NP.courierEarth=99; C.NP.batchA=0; put(G,far.id); const c4=hull(G,'courier'); const rr=C.setLine(G,c4.id,far.id,'earth');
ok(rr==='queued'||rr==='range','курьер на дальней линии: '+rr);
if(rr==='queued'){ run(G,200); C.NP.courierEarth=1; run(G,300); ok(!c4.from&&c4.kicked==='courierFar','правило сняло курьера'); ok(c4.at==='earth','курьер дома') }
C.NP.courierEarth=1; C.NP.batchA=0.5;

// длинный прогон без проверок: падать не должен, снимок бота тоже
G=fresh(); put(G,far.id); put(G,hub.id); const c5=hull(G,'courier'), h5=hull(G,'freighter'); C.setLine(G,c5.id,far.id,hub.id); C.setLine(G,h5.id,hub.id,'earth'); run(G,3000);
ok(!G.night,'Ночь выключена'); ok(G.day>=3000||!!G.over,'3000 лет без ошибок, год '+G.day);
console.log(fails?('ПРОВАЛОВ: '+fails):'всё зелёное'); process.exit(fails?1:0);
