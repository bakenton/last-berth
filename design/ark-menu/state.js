// общее состояние для снимков окна ковчега: поздняя середина партии, Ночь датирована, уровень I куплен, конвой неполный
module.exports=async function(p){ await p.evaluate(()=>{ LNU.shiftStop=false; LN.safe=true; const E=LN.earth;
  LN.driveLvl=2; LN.gen=2; ensureGen(2); while(SECTORS.length<6) openSector(LN); revealNight(LN); LN.nightSeen=true;
  LN.driveLvl=5; LN.gen=5; ensureGen(5); LN.day=2900; LN.night=3802;
  E.people=5180; E.metal=31400; E.food=14200; E.fuel=9100; E.parts=2460;
  arkBuy(LN,1);
  const mk=(cls,gen,res)=>{ buildShip(LN,HULLS.findIndex(h=>h.gen===gen&&h.key===cls)); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; if(res) setReserve(LN,s.id,true) };
  E.metal=1e6; E.parts=1e6; E.fuel=1e6; mk('courier',5,true); mk('courier',5,true); mk('courier',4,true); mk('hauler',5,true); mk('freighter',4,false);
  E.people=5180; E.metal=31400; E.food=14200; E.fuel=9100; E.parts=2460; LNU.notes=[]; LNU.pf=null; LNdraw() }) };
