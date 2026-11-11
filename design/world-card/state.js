// Состояние для снимков карточки мира: кузница (works) на кольце II с одной линией курьера, рудник (metal) на кольце II с курьером.
// Машины открыты (двигатель KIT_GATE_DRIVE), ярусов ещё нет. Числа — из ядра, ничего не подкручено, кроме складов Земли.
module.exports=async function(p){ return await p.evaluate(()=>{ LNU.shiftStop=false; LN.safe=true;
  GOD.maxAll(); LN.gen=2; ensureGen(2); LN.driveLvl=Math.max(2,K.KIT_GATE_DRIVE); while(SECTORS.length<4) openSector(LN);
  const free=PLANETS.filter(x=>!LN.colonies[x.id]&&x.sec>=1&&x.sec<=2).sort((a,b)=>a.dist-b.dist);
  const forge=free.find(x=>x.kind==='works'), mine=free.find(x=>x.kind==='metal')||free.find(x=>x.kind!=='works');
  for(const w of [forge,mine]){ LNU.win=w.id; GOD.settle(); LNU.win=null }
  for(let i=0;i<4000&&!(LN.colonies[forge.id]&&LN.colonies[mine.id]);i++) tick(LN);
  const E=LN.earth; E.metal=E.food=E.fuel=E.parts=1e6;
  const hc=HULLS.findIndex(h=>h.key==='courier'&&h.gen===2);
  for(const w of [forge,mine]){ buildShip(LN,hc); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; setLine(LN,s.id,w.id,'earth') }
  for(let i=0;i<60;i++) tick(LN);   // the lines settle into their pace, the forge eats
  E.metal=31400; E.food=14200; E.fuel=9100; E.parts=2460; LNU.notes=[]; LNU.pf=null; LNdraw();
  return {forge:forge.id, mine:mine.id} }) };
