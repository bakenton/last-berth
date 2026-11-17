# MAP — оглавление core.js / ui.js / menu.js

Сгенерировано `python3 tools/map.py > MAP.md` после каждой правки кода. Не править руками.
Навигация: `grep -n <имя> MAP.md` → `sed -n "<строка-40>,<строка+40>p" work/<файл>`. Код целиком не открывать.
Формат: `строка  имя(аргументы) [длина]  назначение`. «≈ …» = комментария нет, показано начало кода.

## core.js (2140 строк)

```
    3  var VERSION  LONG NIGHT — core simulation. No DOM. Pure state + pure-ish mutators.
    4  mulberry32(a) [1]  ≈ return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>

    6  ## THE CHART BUILDS ITSELF
   10  var SECTORS  ≈ [];
   11  var PLANETS  ≈ [];
   13  var LOBES  v4.21 (F-21): the chart is cut into six lobes of 60 degrees, the sides of the world. Lobe 0 is centred on twel
   14  lobeOf(ang) [1]  ≈ var a=((ang+LOBE_ARC*2)%(Math.PI*2)+Math.PI*2)%(Math.PI*2); return Math.floor(a/LOBE_ARC)%
   15  lobeEdge(i) [1]  ≈ return -LOBE_ARC*2+i*LOBE_ARC }
   16  lobeMid(i) [1]  ≈ return -Math.PI/2+i*LOBE_ARC }
   20  var RING_NAMES  v4.21 (Nikita, 06.10): rings carry a number and the name of an Italian figure — generals, artists, politicians
   21  var W_NAMES  ≈ ['Tallow','Brine','Cinder','Marrow','Solace','Vesper','Gallows','Ferrous','Hollow','Threno
   25  var DESIGS  ≈ ['LV','HD','NR','KX','QT','ZD','BC','GR','TS','WN','PX','MV','AR','EL','SH','UM'];
   27  secName(i) [1]  ≈ var n=RING_NAMES.length, cyc=Math.floor(i/n), nm=RING_NAMES[i%n].toUpperCase(); return (i+
   28  secRadius(i) [1]  ≈ return 170+i*88 }
   32  genSector(rnd,i) [20]  every sector gets one of each trade, so the player is never starved of fuel
   54  openSector(G) [18]  Appends one more sector to the chart. Called at world-gen and on every survey.
   74  surveyCost(n) [7]  what it costs to push the chart one sector further out
   84  canSurvey(G) [10]  v3.2: the chart is no longer bounded by what the fleet can reach. You may
   94  survey(G) [13]  ≈ var chk=canSurvey(G); if(chk!=='ok') return chk;

  108  ## HULL GENERATIONS
  121  var HULL_BASE  v4.5 (Nikita, 26.09, run 768210301: 'курьеры 5–6 поколений имбовые, тягачи и грузовозы бессмысленны'):
  126  var HULLS  ≈ [];
  127  genHull(gen,j) [12]  ≈ var b=HULL_BASE[j], g=gen;
  139  ensureGen(gen) [1]  ≈ while(HULLS.length<(gen+1)*3){ var g=Math.floor(HULLS.length/3); for(var j=0;j<3;j++) HULL

  140  ## RANGE
  150  var CLASS_RANGE  ≈ {courier:1, hauler:2, freighter:3};
  151  classRange(key,gen) [1]  ≈ return (CLASS_RANGE[key]||1)+gen }
  152  hullRange(h) [1]  ≈ return h? classRange(h.key,h.gen||0) : 0 }
  154  sectorLimit(gen) [1]  the furthest sector ANY hull of this generation can fly to (the freighter)
  155  hullGen(s) [1]  ≈ return (HULLS[s.hull]&&HULLS[s.hull].gen)||0 }
  156  shipRange(s) [1]  ≈ return hullRange(HULLS[s.hull]) }
  157  canReachSector(s,sec) [1]  ≈ return sec<=shipRange(s) }

  158  ## NODES-1.00 (NIKITA, 03.11): HUBS
  164  lineTo(G,pid) [1]  ≈ var c=G.colonies[pid]; return (c&&c.via&&G.colonies[c.via])?c.via:'earth' }
  165  feedersOf(G,pid) [1]  ≈ var out=[]; for(var k in G.colonies){ if(G.colonies[k].via===pid) out.push(k) } return out
  166  isHub(G,pid) [1]  ≈ var c=G.colonies[pid]; return !!(c&&c.hub) }
  167  hubCount(G) [3]  v5.35: a hub on its way to a worked-out world is one already
  170  hubCap(G) [1]  ≈ return K.HUB_BASE+(G.gen||0) }
  171  hubCost(G) [1]  ≈ var g=Math.pow(K.HUB_GROW,hubCount(G)); return {metal:Math.round(K.HUB_METAL*g), parts:Mat
  173  hubBuildCheck(G,pid) [5]  why this world cannot become a hub now; 'ok' when it can
  178  buildHub(G,pid) [6]  ≈ var r=hubBuildCheck(G,pid); if(r!=='ok') return r;
  189  canHubFound(G,shipId,pid) [8]  v5.35 (Nikita's run 16.11, p.21: «Хочу мочь кликнуть на планету, которую уже эвакуировали и мочь построить там
  197  hubFound(G,shipId,pid) [4]  ≈ var r=canHubFound(G,shipId,pid); if(r!=='ok') return r;
  201  hubFoundBack(G,s) [1]  ≈ if(!s.hubFound) return; G.earth.metal+=s.hubFound.metal; G.earth.parts+=s.hubFound.parts; 
  203  feedersHome(G,hub) [6]  v5.02: a hub's feeders go back to Earth with their hulls, as setVia does; a hull that cannot fly to Earth stan
  212  hubRefund(G,pid) [3]  v5.12 (Nikita 11.11: «снести хаб и получить четверть тех ресурсов, что я в него вложил»): a quarter of this hu
  215  razeHub(G,pid) [7]  ≈ var c=G.colonies[pid]; if(!c||!c.hub) return 'nohub';
  223  depotKinds(G,pid) [5]  a hub, or a world that was one: Earth takes the whole depot — less the fuel its own machines drink
  229  kitIdle(G,pid) [1]  v5.12 (Nikita 11.11, a spent hub sold a tier for +0 that burnt fuel): machines on a dead seam have nothing to 
  230  kitDrinks(G,pid) [1]  ≈ return kitTier(G.colonies[pid])>0&&!kitIdle(G,pid) }
  231  lineOk(G,s,pid) [6]  nodes-1.01: the line is full of couriers
  238  lineRefuse(G,s,pid) [7]  nodes-1.01 UI getter: why lineOk refuses this hull on this world's line — a MSG code; 'ok' when it flies. Mirr
  245  hubCheck(G,pid,hub) [9]  ≈ var c=G.colonies[pid], p=planet(pid); if(!c||!p) return 'nocolony';
  254  setVia(G,pid,hub) [12]  ≈ var r=hubCheck(G,pid,hub); if(r!=='ok') return r;
  267  hubHands(G,hub) [2]  hands a hub's line brings from Earth for its feeders: what they lack, less those already waiting at the hub
  270  hubLoad(G,s,hub,w) [5]  a feeder at her hub: the kit, then hands (v5.23: no fuel in the hold — the machines burn Earth's stock where t
  276  classFor(sec,gen) [5]  cheapest class that can serve a sector at this generation; null = nothing can
  282  genForSector(sec) [1]  generation needed before any hull can reach this sector
  284  var K  ≈ {
  454  planet(id) [1]  ≈ for(var i=0;i<PLANETS.length;i++)if(PLANETS[i].id===id)return PLANETS[i];return null}
  457  popCap(p) [1]  how many people a world can hold, and how many it wants before it digs at full rate
  458  popWant(p) [1]  ≈ return popCap(p) }

  459  ## V4.4: EXTRACTION KITS
  460  kitTier(c) [1]  ≈ return (c&&c.tier)||0 }
  461  kitLive(c) [1]  machines standing = no multiplier
  462  rateMult(c) [1]  ≈ return kitLive(c)? Math.pow(K.KIT_OUT,kitTier(c)) : 1 }
  465  storeCap(c) [1]  v4.5 (Nikita, 26.09: 'не хочу, чтобы ресурсы сгорали'): a world's stockyard has no ceiling. What the
  466  kitBurn(c) [1]  ≈ return K.KIT_FUEL*kitTier(c) }
  471  kitFloor(G) [1]  v5.23 (Nikita 13.11: «топливо сделать полностью абстрактным»): fuel is hauled to Earth only and burnt from her
  473  kitGain(G,pid) [3]  v4.31 (Nikita, 13.10, F-37): what the next kit does to this world in numbers — output a year now and with it, 
  476  kitCost(c) [2]  ≈ var t=kitTier(c)+1, m=Math.round(K.KIT_METAL*Math.pow(K.KIT_GROW,t-1)), p=Math.round(K.KIT
  478  kitOpen(G) [1]  ≈ return (G.driveLvl||0)>=K.KIT_GATE_DRIVE }
  482  kitPaid(c) [1]  v5.34 (Nikita's run 16.11, p.9: «когда эвакуирешь планету, то upgrade package тоже с собой забирали в ресурсах
  483  liftBack(G,pid) [4]  ≈ var c=G.colonies[pid]; if(!c) return null;
  488  lineHold(G,pid) [2]  the biggest hold on this world's line; 0 if nothing runs there
  490  canKit(G,pid) [11]  ≈ var c=G.colonies[pid]; if(!c) return 'nocolony';
  501  orderKit(G,pid) [8]  ≈ var r=canKit(G,pid); if(r!=='ok') return r;
  510  feedRates(G,node) [5]  what a world burns per year that Earth has to send it: works eat metal and rations (v5.23: the machines' fuel 
  518  fedMult(G) [1]  Earth's own output rides on the people left at home — but only so far.
  519  handsRate(G) [1]  v4.7: Earth empties
  520  earthOutput(G) [4]  ≈ var h=Math.max(0,G.earth.people-K.EARTH_CREW);
  525  crewOut(G) [1]  hands currently riding hulls rather than working at home
  528  crewAway(G) [1]  v3.9.1 (log 519788167: 1562 hands sat on hulls idle at Earth and were counted as left behind): a crew
  529  crewDocked(G) [1]  ≈ return crewOut(G)-crewAway(G) }
  535  earthNeed(G) [7]  G.earth.people is the pool of hands Earth can still put on a ship, not the
  545  openRes(G,res) [1]  v4.34 (Nikita, 15.10: 'игрок должен всё получать постепенно', option B): a resource is open from the day the p
  546  isOpen(G,res) [1]  a save from before v4.34 has every resource open
  547  burnAge(G,res) [1]  ≈ return 1+Math.max(0,G.day-((G.opened&&G.opened[res])||0))/K.APPETITE }
  548  openPaid(G,c) [1]  ≈ for(var r in c){ if(r!=='people'&&r!=='food'&&(c[r]||0)>0) openRes(G,r) } }
  551  pulseDrain(G,res) [4]  v4.20: what Earth takes a year while a crisis runs — at least the doubled burn, and PULSE_SHARE of what the em
  561  lobeCount(G,lobe) [1]  v4.21 (Nikita, 06.10, F-21): the director. Events come in three families, each told before it happens:
  562  lobeEvents(G,lobe) [1]  ≈ var out=[]; var E=(G.dir&&G.dir.ev)||[]; for(var i=0;i<E.length;i++) if(E[i].lobe===lobe) 
  563  activeCrisis(G) [1]  ≈ var E=(G.dir&&G.dir.ev)||[]; for(var i=0;i<E.length;i++) if((E[i].type==='crisis'||E[i].ty
  565  shipSpeed(G,s) [7]  how fast a hull moves right now: set by the lobe of the world at the other end of its trip
  572  stormAt(G,node) [5]  ≈ if(!node||node==='earth') return false; var p=planet(node); if(!p) return false;
  577  directorStep(G) [41]  ≈ var D=G.dir; if(!D) D=G.dir={next:K.DIR_FIRST,ev:[],n:0,seq:1};
  619  driveSpeed(G) [1]  crossings and signal lag both shrink with every drive mark earned
  620  driveWorkFor(G) [1]  ≈ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,G.driveLvl||0)) }
  621  driveReachFor(G) [1]  ≈ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*(G.driveLvl||0) }
  627  driveAhead(G) [3]  v5.34 (Nikita's run 16.11, p.12: «программа двигателя должна иди в ровень с кольцами… Чтобы игрок случайно не 
  631  newGame(seed) [19]  ≈ seed = seed||((Math.random()*1e9)|0);
  652  reach(G) [1]  reach = live settlements. The relay used to add +2; it is gone (Nikita, 23.09: orders no longer carry anything
  670  dockWorld(G,sec) [4]  v5.29 (Nikita 14.11: редкие награды — «добавляем», первой док; объём — «Да, делаем»; design/START.md, «Решения
  674  dockHull(G,pid,cls) [6]  ≈ var hi=currentHull(G,cls), h=hi===null?null:HULLS[hi]; if(!h) return null;
  685  rareWorld(G,sec) [5]  v5.35 (Nikita's run 16.11, p.17: «Редкие плюшки надо добавлять тоже дальше»; on the answer 16.11: «Нужно что-т
  690  giftFor(G,pid) [9]  ≈ var p=planet(pid); if(!p||(G.settled&&G.settled[pid]!==undefined)||G.colonies[pid]||(G.gho
  699  settledCount(G) [1]  ≈ var seen=G.settled||{}, n=0, k; for(k in seen) n++; for(k in G.colonies) if(!seen[k]) n++;
  700  sectorOpen(G,s) [1]  ≈ return s<SECTORS.length}
  701  travelDays(G,dist,ship) [4]  ≈ var sp=(ship&&HULLS[ship.hull]&&HULLS[ship.hull].speed)||1;
  705  legDays(G,a,b,ship) [1]  ≈ return travelDays(G,legDist(a,b),ship) }
  706  legDist(a,b) [9]  ≈ if(a===b) return 0;
  716  needsOf(G,node) [8]  ≈ if(node==='earth') return null;
  724  exportsOf(G,node) [4]  ≈ if(node==='earth') return ['metal','food'];
  728  loadAt(G,s,node) [65]  v4.4: cargo.kit rides alongside
  793  unload(G,s,node) [25]  ≈ var any=s.cargo.metal+s.cargo.food+s.cargo.fuel+s.cargo.parts+s.cargo.people;
  818  temper(G,s) [1]  ≈ var h=((s.id*2654435761)^(G.seed|0))>>>0; return K.MUTINY_SPREAD*((h%1000)/1000) }
  820  mutinyDue(G,s,round) [1]  would this crew refuse the run that starts here? (the desk can ask the same question)
  823  mutinyForecast(G) [7]  v4.27: the first crew that will refuse, by the same count the crews make — year, line, and the rations Earth
  833  lastLift(G,pid) [13]  v4.33 (Nikita, 13.10: 'не устраивает ощущение, что людей бросают… те люди на планетах обречены, ничего не сдел
  851  foodForecast(G,less) [17]  v4.28 (F-11, Nikita 08.10: the quiet famine — farms ran dry 440 years before the end and the larder warning ca
  870  foodShort(G) [1]  short = the rations run out inside FOOD_HORIZON years. ('Not reaching the Night' was tried and dropped: once t
  873  spentWorld(G,pid) [2]  v5.09 (Nikita 10.11: «делаем, чтоб судно не ходило пустым»): a world whose seam is dead and whose surface is b
  875  sail(G,s) [33]  ≈ var here=s.at, dest = here===s.from ? s.to : s.from;
  910  var CHRON  chronicle lines never roll off the cap: the log forgets traffic, not history
  911  log(G,code,d) [3]  v5.21: the objectives' list of what is done
  916  forgeOf(G,k) [1]  F-14 (Nikita, 02.11: 'кузницам не хватает топлива — в лог не идёт'): the run log keeps every world's machines 
  917  forgeEv(G,k,code) [1]  ≈ G.forgeEv=G.forgeEv||[]; if(G.forgeEv.length<4000) G.forgeEv.push({day:G.day,p:k,code:code
  918  feedWhy(G,k,c) [1]  ≈ if(!onLine(G,k).length) return 'noline'; if(c.clip==='room'){ var fit=lineFit(G,k); if(fit
  919  forgeTally(G,k,c,p,want,made) [10]  ≈ var f=forgeOf(G,k), w; f.y++;
  929  forgeLoad(G,k,c,cuts) [1]  ≈ var f=forgeOf(G,k), res; f.loads++; c.clip=null; for(res in cuts){ f.clips[res+'_'+cuts[re
  931  act(G,kind,d,res) [1]  player actions, kept whole for post-run analysis (exported from the UI)
  935  clockOut(G) [2]  v4.46 (Nikita, 03.11: «лог должен писать время партии с нажатия на New Game»): wall-clock of the run, kept by 
  937  snap(G) [14]  ≈ var E=G.earth, cols=0, pop=0, dry=0;
  952  exportLog(G) [13]  v4.4 (Nikita, 25.09): the run log is JSON — the designer reads it with a script, not with his eyes
  965  exportLogText(G) [27]  ≈ var L=[]; L.push('LAST BERTH run log · seed '+G.seed+' · year '+G.day+(G.over?' · '+G.over

  993  ## ACTIONS
  995  buildShip(G,hullId) [16]  ≈ var h=HULLS[hullId]; if(!h) return 'locked';
 1015  scrapValue(h) [1]  scrapping: an idle hull at Earth comes apart for part of what it cost.
 1016  scrap(G,shipId) [13]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1029  shipById(G,id) [1]  ≈ for(var i=0;i<G.ships.length;i++)if(G.ships[i].id===id)return G.ships[i];return null}
 1031  canDepart(G,s,pid,found,hubTo) [12]  hubTo (v5.35) — settlers founding a hub on a worked-out world // found — she carries settlers (v5.32: their de
 1046  foundFuel(G,pid) [1]  v5.32 (Nikita's run 16.11, pp. 3 and 7: «цена топливом за отправку вообще никакая. Надо больше намного… дальше
 1048  launch(G,s,pid,job,cargo) [11]  ≈ var p=planet(pid);
 1061  nextHome(G,pid,cls) [5]  v4.14: when no free hull at Earth can lift a world — the nearest rated hull on its way home, or null
 1066  enRoute(G,pid) [1]  ≈ for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='transit'&&o.job==='colon
 1067  foundParty(G,s,pid) [1]  ≈ return Math.max(0,Math.floor(Math.min(popCap(planet(pid)), s.cap, G.earth.people-K.EARTH_K
 1068  colonize(G,shipId,pid,people,food,hub) [17]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1089  setLine(G,shipId,from,to) [17]  A line is always world <-> Earth. Only Earth consumes, so a leg between two
 1109  clearLine(G,shipId) [1]  v3.8.1 (log 57539013, tester: "нельзя было снять судно"): a line ordered while the hull was in transit
 1112  moveLine(G,shipId,pid) [16]  v4.31 (Nikita, 13.10, F-36): 'move to → world' under a hull of the line panel — off its line and onto the othe

 1128  ## V4.34: LINES ARE MANNED BY HAND (NIKITA, 14–15.10)
 1132  var CLASSES  ≈ ['courier','hauler','freighter'];
 1133  pileLeft(G,pid) [1]  v4.11: what is still on the surface
 1134  shipClass(s) [1]  ≈ return HULLS[s.hull]?HULLS[s.hull].key:'courier' }
 1135  onLine(G,pid) [2]  ≈ var out=[]; for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='dead') conti
 1137  lineCount(G,pid,cls) [1]  ≈ var n=0, ships=onLine(G,pid); for(var i=0;i<ships.length;i++){ if(shipClass(ships[i])===cl
 1139  hullAt(cls,gen) [1]  the hull of a given generation. v4.31 (Nikita, 13.10, F-36): an order always takes the current generation
 1140  currentHull(G,cls) [1]  ≈ var best=null; for(var i=0;i<HULLS.length;i++){ var h=HULLS[i]; if(h.key!==cls) continue; 
 1145  orderHull(G,cls,pid) [7]  v4.42 (Nikita, 24.10): the hull the yards offer in this class — the current generation, or the one before it w
 1152  orderCheck(G,pid,cls,hull) [15]  ≈ if(!G.colonies[pid]) return 'nocolony';
 1168  orderFor(G,pid,cls,hull) [8]  order a new hull of the current generation for this line: paid now, she takes the line when she leaves the yar
 1178  var EX_RES  nodes-1.02: Earth's exchange — get n of one resource for two others, at once. G.stats.ex: exchanges made
 1179  exVal(r) [1]  ≈ return K['EX_V'+String(r).toUpperCase()] }
 1180  exchangeCost(G,get,a,b,n) [1]  ≈ var w=n*exVal(get)*K.EX_K/2, o={}; o[a]=Math.ceil(w/exVal(a)); o[b]=Math.ceil(w/exVal(b));
 1181  exchangeCheck(G,get,a,b,n) [8]  ≈ if(EX_RES.indexOf(get)<0||EX_RES.indexOf(a)<0||EX_RES.indexOf(b)<0) return 'exRes';
 1189  exchange(G,get,a,b,n) [5]  ≈ n=Math.floor(n); var r=exchangeCheck(G,get,a,b,n); if(r!=='ok') return r;
 1194  upgradeSave(G) [6]  v4.34: an older save burns as it did — every resource open from day 0
 1200  setAuto(G,shipId,pid) [1]  ≈ return setLine(G,shipId,'earth',pid) }
 1201  setAutoOld(G,shipId,pid) [7]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1208  setPolicy(G,shipId,pid,deliver,collect) [11]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1219  setRoute(G,shipId,pid,out,take) [13]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1232  dispatch(G,shipId,pid,out,take) [6]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1238  repeatRun(G,shipId) [6]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1244  clearRoute(G,shipId) [1]  ≈ var s=shipById(G,shipId);if(s)s.route=null;return 'ok'}
 1246  runRoute(G,s) [6]  ≈ var pid=s.route; if(!pid) return 'noroute';
 1255  abandon(G,shipId,pid) [13]  v4.18 (Nikita, 04.10): only a courier lifts a settlement
 1275  evacPick(G,pid) [8]  v5.34 (Nikita's run 16.11, p.9: «хочу, чтобы можно было поставить эвакуацию на очередь… Нажал эвакуация и как 
 1283  evacBare(G,pid) [3]  a hub: its whole depot (the reviewer of v5.34: the queue lost a hub's store)
 1286  canQueueEvac(G,pid) [6]  ≈ var c=G.colonies[pid], p=planet(pid); if(!c||!p) return 'nocolony';
 1292  queueEvac(G,pid) [2]  ≈ var r=canQueueEvac(G,pid); if(r!=='ok') return r;
 1294  unqueueEvac(G,pid) [2]  ≈ var c=G.colonies[pid]; if(!c||!c.evacQ) return 'evacNotQueued';
 1297  evacQueueTick(G) [6]  every day: a queued world that is bare sends for its courier; none free (or not fuel enough) — it waits, said 
 1305  search(G,shipId,missId) [12]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1321  startDrive(G,pid) [17]  the drive programme is repeatable: every mark cuts crossings and signal lag
 1338  driveDone(G,pid) [4]  ≈ G.driveWork=0; G.drive=null;
 1342  driveMark(G,pid) [7]  ≈ G.driveLvl=(G.driveLvl||0)+1;
 1349  researchHyper(G) [1]  ≈ return 'notworks' }

 1351  ## THE HACK: THE HELM WAKES THE CREW THAT RUNS WHAT WAS JUST WON
 1358  hackPush(G,h) [1]  ≈ (G.hackQ=G.hackQ||[]).push(h); G.pauseNow=true }
 1359  hackNext(G) [1]  ≈ return (G.hackQ&&G.hackQ[0])||null }
 1360  hackWait(G,k) [1]  ≈ return (G.hackQ||[]).some(function(h){ return h.k===k }) }
 1361  hackLevel(G) [1]  ≈ return Math.min(K.HACK_TOP,(G.hacks||0)+1) }
 1362  hackWin(G) [6]  ≈ var h=hackNext(G); if(!h) return 'nohack';

 1369  ## THE LONG NIGHT AND THE ARK
 1370  revealNight(G) [6]  ≈ if(G.night) return;

 1376  ## V4.0: THE SECOND DATE
 1377  workAt(l) [1]  ≈ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,l)) }
 1378  reachAt(l) [1]  ≈ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*l }
 1379  arkReady(G) [1]  ≈ return G.arkMark!==null&&G.arkMark!==undefined&&(G.driveLvl||0)>=G.arkMark }
 1383  driveForecast(G,target) [17]  when the drive reaches generation index `target` at the pace the works keep now.
 1400  nightLeft(G) [1]  ≈ return G.night? Math.max(0,G.night-G.day) : null }
 1401  var ARK_RES  ≈ ['metal','parts','food','fuel'], ARK_PAY=['food','metal'];
 1403  arkCaps(k) [1]  v5.10: the hive. G.ark.rings — rings paid for; G.ark.woke — rings whose hack is won (a run the interface start
 1404  arkUnit(r,i) [2]  the price of capsule No. i (from 0)
 1406  arkRingPrice(k) [3]  ≈ var a=arkCaps(k-1), b=arkCaps(k), o={food:0,metal:0};
 1409  arkPaid(G) [1]  ≈ return (G.ark&&G.ark.rings)||0 }
 1411  arkRings(G) [1]  the rings that hold: paid, and (the hack) their crew woken
 1413  arkOwed(G,k) [1]  what it costs to bring the hive up to ring k: the rings not yet paid, summed
 1414  arkHold(k) [3]  ≈ var H=K.ARK_HOLD, n=H.length, o={}, i, r;
 1418  arkCheck(G,k) [6]  a purchase brings the hive up to ring k in one go. 'ok' or why
 1424  arkBuy(G,k) [8]  ≈ var w=arkCheck(G,k); if(w!=='ok') return w;
 1433  arkFix(G) [1]  a save from before v5.10 held levels I-IV: a level becomes a ring (Claude — awaiting review)
 1438  fleetHull(s) [1]  v5.10: the convoy — the hulls the player set aside for the ark (s.reserve). Its share is those of them standin
 1439  convoyHull(G,s) [1]  ≈ return !!s.reserve&&s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to) }
 1440  arkConvoy(G) [5]  ≈ var all=0, have=0, way=0;
 1447  setReserve(G,shipId,on) [5]  v4.29: a hull set aside for the ark — the yards neither break it up for idling nor take it for a line; a line 
 1453  arkBoard(G) [1]  who boards if the ark left today: everyone on Earth and the crews at the pier — once there is a hive to board 
 1454  arkSouls(G) [1]  ≈ return arkRings(G)>=1 ? arkBoard(G) : 0 }
 1456  arkCapsuled(G) [1]  of them, who has a capsule; and who wakes: the capsuled, by the convoy's share. 0 until the ark drive is there
 1457  arkWakeN(G) [1]  ≈ return arkReady(G) ? Math.floor(arkCapsuled(G)*arkConvoy(G).share+1e-9) : 0 }
 1458  arkWake(G) [1]  the share of those aboard who wake
 1460  arkCargo(G) [1]  what rides along: what is left on Earth, up to the hold of the rings held
 1461  leftBehind(G) [5]  ≈ var col=0; for(var k in G.colonies) col+=G.colonies[k].pop;

 1467  ## THE CHRONICLE
 1469  chronShift(G,cols) [39]  ≈ var E=G.earth, idle=0;
 1517  ordersOf(G) [1]  v5.37 (Nikita's run 16.11, p.13: «Нужны подзадания, чтобы игроку было интересно между делом что-то делать и че
 1518  orderCur(G,o) [8]  new hulls only: built after the order was taken
 1526  orderLeft(G,o) [1]  ≈ return Math.max(0,Math.min(o.n,o.n-Math.max(0,orderCur(G,o)-o.at))) }
 1527  orderReward(G,i) [2]  ≈ if(i===0) return {people:Math.max(10,Math.round(K.ORDER_PEOPLE*surveyCost(SECTORS.length).
 1529  orderOffer(G,no) [14]  ≈ var O=ordersOf(G);
 1543  orderTake(G,i) [3]  ≈ var O=ordersOf(G); if(!O.offer||!O.offer[i]) return 'orderNone'; if(O.on) return 'orderOn'
 1546  giveHull(G,cls) [4]  ≈ var hi=currentHull(G,cls), h=hi===null?null:HULLS[hi]; if(!h) return null;
 1550  orderTick(G) [6]  ≈ var O=G.orders, o=O&&!Array.isArray(O)&&O.on; if(!o) return;

 1557  ## TICK
 1559  lineRate(G,pid) [24]  ≈ var p=planet(pid), c=G.colonies[pid]; if(!c) return null;

 1584  ## V4.38 (NIKITA, 19.10): THE LINE'S FIT — WHICH HULL TO ADD, WHICH ONE RUNS HALF EMPTY
 1588  var FIT_PILE  ≈ 120, // a surface pile this big is the line falling behind, and spare hulls are still clea
 1591  hullYield(G,pid,s) [1]  what one hull carries a year on this world's line, at her speed; a hull number or {hull:i} for one not yet bui
 1595  lineFit(G,pid) [8]  what the line must carry a year (the world's output, or what a works or a kit burns if that is more) against w
 1605  lineSpare(G,pid) [10]  the hulls this line can lose and still carry FIT_SPARE times what it must, the biggest first. None while the w
 1618  lineHelp(G,pid,opt) [18]  what to do about a line that falls behind: {kind:'free'|'move'|'build', sid|cls, add, gap}, or null when the h
 1637  tick(G) [290]  ≈ if(G.over) return;

 1928  ## THE ADVISOR: THE GAME DOES THE ARITHMETIC AND SAYS WHAT WANTS A DECISION
 1930  advice(G) [132]  ≈ var out=[], E=G.earth, i, k;

 2063  ## V5.21: OBJECTIVES — THE NEXT THING WORTH DOING, READ OFF THE GATES THAT ALREADY EXIST
 2068  var FEED_THIN  ≈ 0.75; // ui.js FORGE_WARN: a works' line that brings under this share of what it burns
 2069  var DONE  ≈ {first_landfall:1,surveyed:1,drive_mark:1,night_dated:1,ark_bought:1,ark_drive:1};
 2070  freeWorld(G,kind) [5]  ≈ var lim=Math.min(SECTORS.length,sectorLimit(G.gen||0)), best=null;
 2080  kitFirst(G) [5]  v5.31 → v5.32. The first upgrade package (Nikita's run 16.11, p.10: «когда можно строить upgrade package хочу 
 2085  objectives(G) [52]  ≈ var now=[], lvl=G.driveLvl||0, s=settledCount(G), need=driveReachFor(G), nc=reach(G), k, p
 2138  dismiss(G,key) [1]  ≈ G.dismissed[key]=G.day; return 'ok' }
 2139  undismissAll(G) [1]  ≈ G.dismissed={}; return 'ok' }
```

## ui.js (2553 строк)

```

   12  ## TEXTS
   18  var TXT  ≈ {src:'baked',n:0,at:null};
   19  var TXT_EL  ≈ document.getElementById('lb-texts');
   20  var TXT_BAKED  ≈ JSON.parse(TXT_EL.textContent);
   21  var TXT_URL  ≈ TXT_EL.getAttribute('data-url')||'';
   22  applyTexts(rows,src) [24]  ≈ var T2={UI:{en:{},ru:{}},LOG:{en:{},ru:{}},MSG:{en:{},ru:{}},RES:{en:{},ru:{}},VOICE:{en:{
   48  parseCSV(txt) [13]  RFC 4180 CSV, enough for a Google Sheets export: quoted cells, doubled quotes, newlines in cells
   62  parseTSV(txt) [1]  Google publishes TSV as plain tab-separated lines (no quoting) — the link Nikita shared is ?output=tsv
   63  sheetRows(txt) [14]  ≈ var first=txt.split(/\r?\n/,1)[0]||'';
   77  reloadTexts() [10]  ≈ if(!TXT_URL){ say('textsNoUrl'); return }
   87  textsVisible() [1]  ≈ return !!TXT_URL || /[?&]dev\b/.test(location.search) }
   90  var TONE  ≈ {voice:'vo',shift:'ch',first_landfall:'ch',epitaph:'ch',old_night:'ch',ark_sailed:'ch',ark
   93  var KIND  ≈ {mine:'kMine',farm:'kFarm',well:'kWell',works:'kWorks'};
   94  var RES  ≈ ['metal','food','fuel','parts','people'];
   96  var C  v3.7 (Nikita, 23.09): a world is drawn in the colour of what it gives — the same colour its resource has every
   97  var KCOL  v5.04 (Nikita 06.11, 3D-map drafts): parts are blue (#5B82F0, the gear), metal stays light grey — a works and 
   99  var CLSCOL  v4.35 (Nikita 15.10, design/ships-v3 option B): hulls are the game's silhouettes, filled with the colour of th
  100  var EVCOL  ≈ {fold:'91,192,235',storm:'255,138,31'};

  102  ## ICONS (DESIGN/ICONS-V1.HTML, ACCEPTED 14.10)
  103  var ST  ≈ 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linec
  104  gp(d,x) [1]  ≈ return '<path d="'+d+'" '+(x||'')+' '+ST+'/>' }
  105  fp(d,x) [1]  ≈ return '<path d="'+d+'" '+(x||'')+' '+FL+'/>' }
  106  var I  ≈ {
  161  ic(k,sz,col) [1]  ≈ sz=sz||16; return '<svg class="ic" viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'"'+(co
  162  var RESI  ≈ {metal:'metalA',food:'foodA',fuel:'fuelA',parts:'partsA',people:'peopleA'};
  163  resIc(k,sz) [1]  ≈ return ic(RESI[k],sz||14,C[k]) }
  164  shipIc(cls,sz) [1]  ≈ sz=sz||34; return '<svg class="gi" viewBox="0 0 64 40" width="'+sz+'" height="'+(sz*40/64)
  165  var WMARK  ≈ {mine:'<circle r="6"/>',farm:'<rect x="-5.5" y="-5.5" width="11" height="11"/>',well:'<pat
  166  wmark(kind,on,sz) [2]  ≈ sz=sz||14; var m=WMARK[kind].replace('/>',on?' fill="currentColor"/>':' fill="none" stroke

  169  ## STATE
  172  var U  U.tut / can(key): the tutorial decides what the player may see; with its lock off everything is open.
  174  var G  ≈ null;
  175  can(k) [1]  ≈ return !U.tut.lock||!!U.tut.open[k] }
  176  T(k,p) [1]  ≈ var s=(L[U.lang][k]!==undefined?L[U.lang][k]:k); return fill(s,p) }
  177  var YRS  ≈ {en:['year','years','years'],ru:['год','года','лет']};
  178  yrs(n) [3]  ≈ n=Math.abs(Math.round(+n||0)); var a=YRS[U.lang]||YRS.en;
  181  fill(s,p) [3]  ≈ if(!p) return s; return String(s).replace(/\{(\w+)\}/g,function(_,k){
  184  el(id) [1]  ≈ return document.getElementById(id) }
  186  var HTMLCACHE  v4.8 (Nikita, 27.09: 'игра подтормаживает'): a panel is only rewritten when its markup changed
  188  setHTML(id,html,key) [5]  v4.35 (reviewer): a panel rewritten on every tick kept losing its scroll — the scroll of its lists is carried 
  193  esc(s) [1]  ≈ return String(s).replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[
  195  num(x) [1]  numbers read in groups of three: 27 920
  196  dec(x) [1]  ≈ return (Math.abs(x)<10?x.toFixed(1):num(x)) }
  197  var ROMAN  ≈ ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  198  roman(n) [1]  ≈ return ROMAN[n]||String(n+1) }
  199  genB(g,old) [1]  ≈ return '<span class="gen'+(old?' old':'')+'">'+roman(g)+'</span>' }
  200  pname(id) [1]  ≈ var p=planet(id); return p?p.name.toUpperCase():id }
  201  hullName(h) [1]  v4.20: class + Greek name
  202  hname(s) [1]  ≈ return T(shipClass(s))+' '+roman(hullGen(s))+' '+fill(T('hullNo'),{n:s.id}) }
  203  kindWord(k) [1]  ≈ return T(KIND[k]) }

  205  ## PRICES: THE ICON AND THE NUMBER, THE SHORT PART RED; A RESOURCE THE PLAYER HAS NOT MET IS NOT SHOWN
  206  haveOf(k,E) [1]  ≈ return k==='people'?E.people-K.EARTH_KEEP:E[k] }
  207  price(c,E,sz) [4]  ≈ var out='';
  212  shortWhy(c,E) [4]  the first thing Earth is short of, as a why-code with the shortfall
  217  off(code,p) [1]  v4.12: a blocked button is never mute — off(code,p) marks it, and a press on it says why
  218  offW(w) [1]  ≈ return typeof w==='string'?off(w):off(w[0],w[1]) }
  219  whyText(code,p) [1]  ≈ return fill(MSG[U.lang][code]||code,p||null) }
  220  btn(label,act,data,kind,icon,dis) [2]  ≈ var d=''; for(var k in (data||{})) d+=' data-'+k+'="'+attr(data[k])+'"';

  223  ## V5.27: WHAT A WORLD GIVES WHEN IT IS FIRST SETTLED
  228  var GIFT_RES  Nikita 13.11 («как минимум тупо за открытие планеты надо давать немного ресурсов»; the look — draft «A · on tw
  229  giftKeys(g) [1]  ≈ return g?GIFT_RES.filter(function(k){ return g[k]>0&&can(k) }):[] }
  230  giftChip(k,v) [1]  ≈ return resIc(k,12)+'+'+num(v) }
  235  var RARE_HEX  v5.29 (Nikita 14.11, the first rare gift — the dock; draft «A · on two rings»: the rare one is a yellow hexago
  236  rareIc(k,px) [1]  ≈ return '<svg class="ric" viewBox="0 0 48 48" width="'+px+'" height="'+px+'" style="color:'
  237  dockRow(g) [1]  ≈ return g&&g.dock?'<div class="gfr" data-g="dock"><span class="gi">'+rareIc('dock',26)+'</s
  238  dockSeen() [1]  ≈ return !!(G.rareSeen&&G.rareSeen.dock) }
  240  var RARE_I  v5.35 (p.17): the rare finds — the dock, survivors, an engine core: which one a gift holds, its sign, its word
  241  rareKind(g) [1]  ≈ return !g?null:g.dock?'dock':g.folk?'folk':g.core?'core':null }
  242  rareSeen(k) [1]  ≈ return !!(G.rareSeen&&G.rareSeen[k]) }
  243  rareRow(g) [4]  ≈ if(!g) return '';
  247  giftBlock(g) [2]  ≈ var ks=giftKeys(g), dr=dockRow(g)+rareRow(g); if(!ks.length&&!dr) return '';
  253  giftTick(k) [1]  the landing: the chips leave the world for the strip and the counters there click. Nothing stops and there is 
  254  giftFly(pid,g) [11]  ≈ var ks=giftKeys(g); if(!ks.length||U.ff) return;

  266  ## MESSAGES
  269  toast(html,cls,ms,snd) [5]  v4.9 / v4.12 (Nikita, 30.09: 'когда я нажал кнопку, я хочу видеть подтверждение'): every order answers — a toa
  274  var GOOD_CODES  ≈ {ok:1,lineSet:1,policySet:1,copied:1,saved:1,textsOk:1,queued:1};
  275  say(code,p) [3]  ≈ var good=GOOD_CODES[code]||/^ok_/.test(code);
  278  logText(e) [9]  v4.42: head counts as on the end window («4 151», not «4151»); years stay as they are
  287  toastLast() [1]  ≈ toastOne(G.log[G.log.length-1]) }
  288  toastOne(e) [5]  v4.30: these stop the desk with a full-screen notice (voiceWatch)
  294  foodWatch() [3]  v4.10 (Nikita, 27.09): rations low and no farm feeding Earth → a yellow line, once a shift
  298  logKey(e) [1]  shift lines rotate between variants so a long calm run does not read as one sentence pasted ten times
  300  var SFX  ≈ (function(){
  339  var MUS  at the end of the page (build.py, web/music/*.mp3), turned into a Blob only when the track is due. Through the
  376  pressFx(x,y,kind) [2]  v4.12: the press mark — a square that blooms where the pointer hit, so a click is seen even when the
  379  attr(v) [1]  v4.12: a blocked button is never mute — off(code,p) marks it, and a click on it says why (see the click handle

  381  ## PERSONAL FILES
  387  var VOICE_GAP  ≈ 50, CAPT_TENURE=30;
  388  hash32(a,b) [1]  ≈ var h=(a|0)^0x9E3779B9; h=Math.imul(h^(b|0),0x85EBCA6B); h^=h>>>13; h=Math.imul(h,0xC2B2AE
  389  personName(seed) [1]  ≈ var pool=(T('names')||'').split(/\s+/).filter(Boolean); if(!pool.length) return '—'; retur
  390  serviceNo(seed) [1]  ≈ return 1000+(Math.abs(hash32(seed,77))%9000) }
  391  voiceKeys(trigger) [1]  ≈ return Object.keys(VOICE.en||{}).filter(function(k){ return k.indexOf(trigger+'.')===0 }) 
  392  voice(trigger,role,d,o) [19]  ≈ o=o||{}; var keys=voiceKeys(trigger); if(!keys.length) return;
  412  voiceLine(e) [1]  ≈ var v=VOICE[U.lang]||{}; var d={}; for(var q in e.d.d) d[q]=e.d.d[q]; if(d.p&&planet(d.p))
  414  voiceWatch() [57]  what the log said since last time, and who answers it
  472  drawPortrait(cv,seed) [40]  the face: 64×64, bone on black, ordered dither — nobody drew it, and it is different every time

  513  ## THE CHART IN 3D (V5.05, NIKITA 06.11: «КАРКАС», «ПЕРЕНОСИ В ИГРУ» — DESIGN/MAP3D/E-HYBRID.HTML V3)
  520  var CAM  ≈ {tx:0,tz:0,yaw:0,pitch:52,dist:1700,fov:38}, CFIT=true, CFITK='', MAPDRAGGED=false;
  521  var M3D  ≈ {W:1,H:1,VP:null,dpr:1,fk:'',ok:'',HX:null,HXR:0,LAY:null,NEB:null,last:0,dirty:true};
  522  var P3  ≈ {}, P3N=-1, POS_GAP=28, H0=14, HK=1.0, HSTEM=60, RS=11, RF=8, HEXR=46, HUBC='#E040FB', PAR
  523  p3(p) [1]  ≈ if(P3N!==PLANETS.length||!P3[p.id]) layout3(); return P3[p.id] }
  524  layout3() [6]  ≈ var Ls=PLANETS.map(function(q){ var R=SECTORS[q.sec].r; return {id:q.id,x:Math.cos(q.ang)*
  531  seamLeftP(q) [1]  v5.17 (Nikita 12.11: «вместо населения возле имени планеты писать процентаж жилы и чтобы цвет менялся»): what 
  532  seamPct(q) [1]  ≈ var v=seamLeftP(q); return v===null?'':' '+v+'%' }
  533  seamCol(q) [1]  ≈ var v=seamLeftP(q); return v>=50?C.food:v>=20?C.people:v>0?C.red:C.mid }
  535  wH(pid) [1]  v5.19 (Nikita 12.11: «кол-во людей на планете вообще погоды не делает» → «ровные»): every settled world stands
  536  node3(n) [1]  ≈ if(!n) return null; if(n==='earth') return [0,0,0]; var pp=planet(n); if(!pp) return null;
  537  outerR() [1]  ≈ return secRadius(Math.max(0,visRings()-1)) }
  540  m3persp(fov,asp,n,f) [1]  matrices, column-major as GL
  541  m3sub(a,b) [1]  ≈ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]] } function m3dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a
  542  m3cross(a,b) [1]  ≈ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]] } function m3norm(a){
  543  m3look(e,c,u) [2]  ≈ var z=m3norm(m3sub(e,c)), x=m3norm(m3cross(u,z)), y=m3cross(z,x);
  545  m3mul(a,b) [1]  ≈ var o=new Array(16); for(var c=0;c<4;c++) for(var r=0;r<4;r++){ var s=0; for(var k=0;k<4;k
  546  camUpdate() [4]  ≈ var ph=CAM.pitch*Math.PI/180, th=CAM.yaw*Math.PI/180;
  551  prj(p) [3]  a point of the plane's space → desk px inside the map box (w: the depth, for sizes)
  554  pxPer(w) [1]  ≈ return M3D.H/(2*w*Math.tan(CAM.fov*Math.PI/360)) }
  556  m3size() [4]  v5.08: the box's size comes from a ResizeObserver — reading clientWidth every frame of a turn made the browser
  561  camFit() [8]  the visible chart in the frame with room for the names: aim at its middle, back off until every world and its 
  569  camTurn(dx,dy) [1]  ≈ CAM.yaw-=dx*0.25; CAM.pitch=Math.max(14,Math.min(89.5,CAM.pitch+dy*0.25)); CFIT=false }
  570  camPan(dx,dy) [3]  ≈ camUpdate(); var s=1/pxPer(CAM.dist), th=CAM.yaw*Math.PI/180, sp=Math.max(0.35,Math.sin(CA
  573  camZoom(f) [1]  ≈ CAM.dist=Math.max(220,Math.min(12000,CAM.dist*f)); CFIT=false }

  575  ## THE STATE OF A WORLD, AS THE MAP, THE LIST AND THE ADVISOR SEE IT
  576  isDead(pid) [1]  ≈ var p=planet(pid); return !!G.colonies[pid]&&!G.colonies[pid].hub&&p.kind!=='works'&&G.res
  580  dryHub(pid) [1]  v5.31 (Nikita's run 16.11, p.24: «когда планета стала хабом, но истощилась. Она должна поменять свой шарик по 
  581  isDry(pid) [1]  ≈ var p=planet(pid); return !!G.colonies[pid]&&p.kind!=='works'&&G.reserves[pid]!==Infinity&
  582  worksHungry(pid) [3]  ≈ var p=planet(pid), c=G.colonies[pid]; if(!c||p.kind!=='works') return null;
  586  feedSplit(pid) [3]  what the works burn a year and what the line brings of each, in the order the hold is filled (needsOf: fuel, m
  592  lineSoon(pid) [5]  v5.30 (Nikita's run 16.11, p.2: «когда начинаю строить судно для линии я хочу, чтобы ползунок… тоже сразу запо
  600  lineGain(pid,s) [2]  v5.31 (Nikita 16.11 on v5.30: «ограничиваем»): what a hull would ADD to the line a year, not what she can carr
  602  gainTag(pid,s) [1]  ≈ var g=lineGain(pid,s); return '<b class="ay'+(g<0.05?' z':'')+'">'+esc(fill(T('u_lineAdds'
  603  soonTag(v) [1]  ≈ return v>0.005?'<span class="soon" title="'+attr(T('u_lineSoon'))+'"><i></i>+'+dec(v)+'</s
  604  wst(pid) [10]  v5.35: settlers on their way to found a hub there
  617  var THIN_WARN  Nikita, 26.10 («линия возит меньше или больше на 1 единицу, а уже уведомление»): a line speaks when it matters
  618  earthRunout(res) [1]  ≈ var t=trend(res); return t!==null&&t<-0.05&&G.earth[res]/-t<RUNOUT_YEARS }
  619  lineThin(pid) [3]  v4.38: a hull in the yards for the line counts
  622  seamYears(pid) [1]  ≈ var c=G.colonies[pid], p=planet(pid); if(!c||p.kind==='works'||G.reserves[pid]===Infinity|
  623  var BAD_ST  ≈ {dead:1,cut:1,starve:1};

  625  ## THE MAP
  626  m3rgb(h) [1]  ≈ return parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),1
  627  m3ring(cx,cy,cz,rad,n,a0,a1) [1]  ≈ var p=[]; a0=a0||0; a1=a1===undefined?Math.PI*2:a1; for(var i=0;i<=n;i++){ var a=a0+(a1-a0
  628  m3path(x,pts,close) [4]  prj's math inline: no object a point (hot)
  633  m3pathRing(x,cx,cy,cz,rad,n,close) [4]  a horizontal circle straight into a path (the same points as m3path(x,m3ring(…)), without the arrays)
  637  m3glow(x,col,b,post) [1]  ≈ x.shadowColor='rgba('+col+',.9)'; x.shadowBlur=b; x._post=!!post }
  639  m3rnd(seed) [1]  space: three star layers and a nebula, made once per size; drawn each frame with a little parallax on turning
  640  m3space() [11]  ≈ var T=1024;
  651  m3hexes(FR) [3]  ≈ if(M3D.HX&&M3D.HXR>=FR) return M3D.HX; var L=[], n=Math.ceil(FR/(HEXR*1.5))+2;

  654  ## V5.08: THE CHART THROUGH WEBGL
  662  var GLR  ≈ null;
  663  var M3SH  ≈ {
  693  m3glInit() [15]  ≈ var cv=el('map3d'), gl=null;
  709  var M3COL  a recorder: the part of the canvas 2D interface the scene uses, into triangles (x, y device px; d, hw: the lin
  710  m3col(s) [4]  ≈ var c=M3COL[s]; if(c) return c; var m;
  714  M3R() [2]  ≈ this.buf=new ArrayBuffer(1<<18); this.f=new Float32Array(this.buf); this.u8=new Uint8Array
  738  m3dash(S,D,k) [7]  a dash pattern (desk px, as the canvas: scaled with the transform) cut along a subpath; it starts again at eac
  747  var M3LP  a polyline as a strip: mitred joins (limit 4), butt ends, a 1 px soft edge on both sides; thinner than 1 px — 
  748  m3line(R,S,closed,hw,c,a) [18]  ≈ var n0=S.length>>1, P=M3LP, M=M3LM, n=0, i;
  767  m3draw(R,rec,res) [7]  a recorder's triangles to the GPU (uploaded again only after a reset) and drawn
  774  m3off(gl) [1]  ≈ for(var i=0;i<4;i++) gl.disableVertexAttribArray(i) }
  776  m3target(R,w,h) [5]  render targets at half size for the glow
  781  m3targets(R,W,H) [3]  ≈ var w=Math.max(1,Math.ceil(W/2)), h=Math.max(1,Math.ceil(H/2)); if(R.T&&R.T.w===w&&R.T.h==
  784  m3quad(R,prog) [1]  ≈ var gl=R.gl; gl.bindBuffer(gl.ARRAY_BUFFER,R.quad); gl.enableVertexAttribArray(prog.a.a_p)
  787  var M3SIG  one glow phase: per size class, its strokes into g, blurred across into t, along into a (over what is there); 
  788  m3wts(sg) [2]  ≈ var k=sg.toFixed(3); if(M3W[k]) return M3W[k]; var r=Math.min(12,Math.ceil(sg*3)), w=new F
  790  m3glowPass(R,recs,post,W,H,dst) [18]  ≈ var gl=R.gl, T=m3targets(R,W,H), B=R.P.blur, c, jobs=[], U=[1e9,1e9,-1e9,-1e9];
  809  m3tex(R,key,cv,rep) [5]  a canvas as a texture (premultiplied), kept by key
  818  var SKY_TURN  v5.38 (Nikita's v5.29 feedback p.19: «вращение космоса на бекграунде + добавить какие-то космические явления. 
  819  var M3MQ  ≈ window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  820  skyStill() [1]  ≈ return !!(M3MQ&&M3MQ.matches) }
  821  skyAng(t) [1]  ≈ return skyStill()?0:(t%SKY_TURN)/SKY_TURN*Math.PI*2 }
  822  skyNext(k,t) [1]  ≈ var r=SKY_EV[k]; return t+r[0]+Math.random()*(r[1]-r[0]) }
  823  skySpawn(S,k,t) [7]  ≈ var W=M3D.W, H=M3D.H, r=Math.random, a, sp, o;
  830  m3skyEmit(x,t) [18]  ≈ x.setTransform(M3D.dpr,0,0,M3D.dpr,0,0); var S=M3D.SKY, k, i, j;
  848  m3skyGL(R,W,H,t) [9]  ≈ if(!M3D.NEB) m3space(); var gl=R.gl, X=R.P.sky, k=M3D.dpr, w=M3D.W, h=M3D.H, span=w*0.4, N
  858  m3hexGL(R,FR,W,H) [16]  the plates: built when the floor's reach changes (a centre, a corner, a side, a fade per vertex), drawn by the
  875  m3floorEmit(fa,fb) [7]  the floor's lines: the darkening rims (under the plates) and the rings and the lobes (over them) — again only 
  883  m3sphere(x,cx,cy,cz,rad,col,spin,alph) [7]  a world's sphere, wire (Nikita 06.11: «каркас»): three parallels, four meridians turning slowly, a dark body, 
  891  m3orbit(x,a,h,front,col) [5]  the works' orbital ring, tilted: the half behind the sphere before it, the half in front after it
  897  m3dbl(x,a,b,col,wd) [3]  a double line on the floor: a hub's (to Earth, magenta) and a feeder's (to its hub, in its trade's colour)
  900  m3wcol(kind) [1]  ≈ return m3rgb(KCOL[kind]) }
  902  m3obEmit(x,vis) [14]  the footprints and the lines on the floor: again when the camera or the chart changes (who is settled, settlin
  917  m3waveEmit(x,t,OUT) [8]  the moving floor: the quiet wave and the events' lobes
  926  m3dynEmit(x,t,vis) [24]  the hulls and the worlds, every frame
  952  m3prep() [1]  the camera for this size and chart: the SVG needs it at once, the canvas draws on the next frame
  953  var M3RS  ≈ {fa:null,fb:null,ob:null,wv:null,dy:null,sk:null};
  954  draw3d(now) [27]  ≈ if(!G||!el('map3d')) return; m3prep(); var R=GLR===null?m3glInit():GLR; if(!R||R.lost) ret
  984  var SV  the SVG on top: a .wd per world at its sphere (hit, alarms, the open one, its name and people), Earth's, the l
  985  drawMap() [76]  ≈ if(!G) return; m3prep(); M3D.dirty=true; var i, W=M3D.W, H=M3D.H, S={s:'',k:'',n:-1,V:[]};
 1065  nextRing() [1]  v5.34 (Nikita's run 16.11, p.5: «когда кольцо все заселено, то надо показывать следующее, но без планет и чтоб
 1066  ringBtn() [12]  a tab or a window over the chart: the Tech tab has the same order
 1078  drawTip(g) [11]  ≈ var tip=el('tip'); if(!g||!G){ tip.className=''; return }
 1089  drawEvBar() [5]  ≈ var E=(can('events')&&G.dir&&G.dir.ev)||[], h='', live=false;

 1094  ## V5.21: THE OBJECTIVE — A CARD ON THE CHART (DRAFT B3 OF DESIGN/ORDERS/ROUND2.HTML) AND ITS JOURNAL
 1097  var OBJ_CAN  ≈ {o_kit:'machines',o_food:'tech',o_feed:'parts',o_settle:'tech',o_works:'tech',o_grow:'tech
 1098  var OBJ_GO  ≈ {o_drive:'tech',o_survey:'tech',o_parts:'tech',o_ark:'ark',o_pods:'ark',o_convoy:'ark',o_f
 1099  var HEXI  ≈ '<svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M6 .5 11 3.3v
 1102  objNow(O) [3]  v5.26: «Chart ring 3» is the way to the date of the Night — named as soon as the helper has shown the rings an
 1105  objT(pre,o) [1]  ≈ return fill(T(pre+o.code.slice(2)),{g:roman((o.g||1)-1),n:o.n===undefined?'':num(o.n),k:o.
 1108  kitNum(o) [1]  v5.32 (Nikita 16.11 on the helper's task of v5.31 that held the screen: «В табло задач вывести»; on the object
 1109  objSub(o) [6]  ≈ var p=o.p&&planet(o.p);
 1115  objBar(l,v,share,col) [1]  ≈ return '<div>'+esc(l)+'<b'+(col?' style="color:'+col+'"':'')+'>'+v+'</b><div class="bar"><
 1116  objFoot(O) [4]  red is an alarm: only when the Night is near (as the ark's flag and the advisor have it)
 1124  ordText(o) [2]  v5.37 (Nikita's run 16.11, p.13): the order of the shift — its words, its reward, how far it is
 1126  ordRw(o) [1]  ≈ var r=o.rw||{}; return '<i class="rwh">'+esc(T('ord_rw'))+'</i>'+(r.people?resIc('people',
 1127  ordProg(o) [1]  ≈ var done=Math.min(o.n,o.n-orderLeft(G,o)); return fill(T('ord_left'),{a:num(done),n:num(o.
 1128  ordLine() [2]  ≈ var o=G.orders&&G.orders.on; if(!o) return '';
 1130  ordOffer() [3]  ≈ var O=G.orders; if(!O||O.on||!O.offer||!O.offer.length) return '';
 1133  objCard() [4]  ≈ if(!G||G.over) return ''; var O=objectives(G), l=objNow(O), o=l[0], s2=l[1], ft=objFoot(O)
 1137  objDone(e) [2]  ≈ var d=e.d||{}, g=e.code==='ark_drive'?(d.g||0):(d.n||1)-1;
 1139  winGoals() [23]  v5.37: the order of the shift — taken, or the two on offer
 1162  objGo(i) [6]  ≈ var o=objNow(objectives(G))[i]; if(!o) return; var go=OBJ_GO[o.code];
 1170  building() [1]  v4.35: what the yards are building, top right of the map — the three nearest, and how many more
 1171  hullProgress(s) [1]  ≈ var h=HULLS[s.hull], tot=Math.max(1,h?h.days:1); return Math.max(0,Math.min(1,1-(s.t||0)/t
 1172  forWorld(s) [1]  ≈ return s.lineFor||(s.pend&&s.pend.from)||null }
 1173  drawCards() [7]  v5.21: the objective is the first card

 1181  ## TOP: THE YEAR, THE NIGHT, THE ADVISOR, THE CLOCK
 1184  winPause() [1]  v4.49 (Claude's playtest 04.11): a world window stops the clock too — at 4× up to 9 years went by while one wa
 1185  winLight() [1]  ≈ return !!U.win&&!!planet(U.win) }
 1186  bigKind() [1]  ≈ if(!U.langPicked) return U.menu?null:'lang'; if(G.over) return 'over'; if(G.night&&!G.nigh
 1187  modal() [1]  ≈ return !!U.menu||!!bigKind()||!!U.pf||!el('logbox').hidden||hackOn() }
 1192  hackOn() [1]  the hack (web/hack.js, Nikita 04.11): a finished drive mark or a paid ark level waits for it (core.js «the hac
 1193  hackWho(h) [1]  ≈ return h.k==='drive'? fill(T('hk_cGen'),{g:roman(h.g)}) : fill(T('hk_cArk'),{l:roman(h.l-1
 1194  hackCheck() [9]  v5.09: the two hacks are told apart — a drive mark meets the serpent at the number of the generation it opens 
 1203  halted() [1]  ≈ return U.paused||winPause()||modal()||tutHold() }
 1206  pauseToggle() [1]  ❚❚ / Space: a toggle only when the player's own pause is all that holds the clock. With a tab, card or helper 
 1207  var SPEEDS  ≈ [1,2,4]; // v4.42 (Nikita, 24.10): no 10× — presses were lost to the redraw at that pace
 1209  drawTop() [16]  v4.46 (Nikita, 03.11: «уведомление вверху не нужно, удалить»): the WAKE number of v4.45 is gone from the top b
 1227  var TREND_YEARS  v3.7 (Nikita, 23.09): a resource that is being spent faster than it comes in must say so. The trend is the rea
 1228  trendTick() [5]  ≈ var E=G.earth, h=U.hist;
 1233  trend(k) [1]  ≈ var h=U.hist; if(h.length<6) return null; var a=h[Math.max(0,h.length-1-TREND_YEARS)], b=h
 1236  peopleRate() [1]  v4.42: people are not a stockpile — the settlers and crews you send are a choice, not a trend (year 14 showed 
 1239  birthX() [1]  v4.49 (Claude's playtest 04.11, Nikita: «а это»): the births multiplier is the main lever of the score and was
 1240  birthCol(x) [1]  ≈ return x>=K.FED_MAX-0.005?C.food:(x>=1?C.people:C.red) }
 1241  birthTxt(x) [1]  ≈ return '×'+x.toFixed(2) }
 1242  drawRes() [11]  ≈ var E=G.earth, nd=G.need||earthNeed(G), h='';

 1254  ## TABS AND THEIR FLAGS
 1257  var TABS  BRIEF (Nikita 14.10): the flags speak of Earth, the yard, the fleet and the ark; the advisor is for worlds onl
 1258  freeAtPier() [1]  ≈ return G.ships.filter(function(s){ return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)
 1259  flags() [22]  Earth: hunger, then the larder, then metal and fuel
 1281  drawTabs() [7]  v5.26: the ark is there from year 0 — a shut outline, no word, no press

 1289  ## WINDOW PIECES
 1293  xb(act,v) [1]  v5.24 (Nikita 13.11, a live player: «некоторые окна не понять, как закрываются… чтобы все окна, у них был крес
 1298  hHex(col,full) [1]  v5.25 (Nikita 13.11, a live player: «хочу открыть какое-то меню, и там была какая-нибудь подсказка… что вот в 
 1299  hDot(col) [1]  ≈ return '<i class="hdot" style="background:'+col+'"></i>' }
 1300  hWm(kind) [1]  ≈ return '<span style="color:'+KCOL[kind]+'">'+wmark(kind,true,14)+'</span>' }
 1301  hDep() [1]  ≈ var p=planet(U.win); return resIc(p&&p.kind!=='works'?p.dep:'metal',15) }
 1302  var HELP  ≈ {
 1313  helpSheet(k) [4]  v5.29: [sign, words] — a line that is there only sometimes
 1317  head(title,sub,icon,what,hk) [3]  ≈ var on=hk&&U.help===hk;
 1320  sec(l,r,id) [1]  ≈ return '<div class="sec"'+(id?' id="'+id+'"':'')+'><span>'+l+'</span>'+(r!==undefined&&r!=
 1321  row(l,v,col,id) [1]  ≈ return '<div class="rw"'+(id?' id="'+id+'"':'')+'><span>'+l+'</span><b'+(col?' style="colo
 1322  hint(t,cls) [1]  ≈ return '<div class="hint'+(cls?' '+cls:'')+'">'+t+'</div>' }
 1323  alertBox(icon,t,warn) [1]  ≈ return '<div class="alert'+(warn?' warn':'')+'">'+ic(icon,16,warn?C.people:C.red)+'<span>'

 1325  ## EARTH: ONLY HOME AND ITS BURN (BRIEF)
 1327  var EX_N  nodes-1.02 (Nikita 05.11): Earth's exchange — what to get, which two resources pay, how much; the price in num
 1328  exOpen() [1]  ≈ return EX_RES.filter(function(k){ return can(k)&&isOpen(G,k) }) }
 1329  exBlock() [15]  ≈ var rs=exOpen(); if(rs.length<3) return '';
 1344  winEarth() [20]  ≈ var E=G.earth, nd=G.need||earthNeed(G), t=peopleRate(), h='';

 1365  ## BIG WINDOWS: LANGUAGE, THE END, THE NIGHT, THE SHIFT, NOTES — ONE AT A TIME, TIME STANDS
 1366  var NOTE_CODES  ≈ {drive_mark:'noteDrive',mutiny_warn:'noteArk',food_horizon:'noteEarth',night_near:'noteArk
 1367  evName(t) [1]  ≈ return T('ev'+t.charAt(0).toUpperCase()+t.slice(1)) }
 1368  note(o) [1]  ≈ U.notes.push(o) }
 1369  chronLines(k) [4]  ≈ var out='', n=0;
 1373  rw2(k,v,cls) [1]  ≈ return '<div class="rw"><span>'+k+'</span><b class="'+(cls||'')+'">'+v+'</b></div>' }
 1374  bigHtml(kind) [47]  ≈ if(kind==='lang') return '<div class="nwin" id="lang"><svg class="lmark2" viewBox="0 0 120
 1421  drawBig() [5]  v5.37: built again once an order is taken

 1427  ## PERSONAL FILES: A FACE FOR A CREW, AT THE FOOT OF THE MAP, OR THE WHOLE SCREEN FOR THE MOMENTS THAT MATTER
 1430  var STRIP_MS  a word from a crew: only the Night, the ark drive and the last flights still take the whole screen. The rest a
 1431  letterById(id) [1]  ≈ return (G.letters||[]).filter(function(l){ return l.id===id })[0]||null }
 1432  letterText(f) [1]  ≈ var v=VOICE[U.lang]||{}, d={}; for(var q in f.d) d[q]=f.d[q]; if(d.p&&planet(d.p)) d.p=pna
 1433  letterRow(f,open,fresh) [2]  ≈ var t=letterText(f);
 1435  paintLetters(box) [1]  ≈ box.querySelectorAll('canvas[data-seed]').forEach(function(c){ if(!c._done){ c._done=true;
 1436  lettersUnread() [1]  ≈ return (G.letters||[]).filter(function(l){ return !l.read }).length }
 1437  drawPF() [19]  ≈ var L0=el('pfL'), f=U.pf;
 1456  popLetters() [2]  ≈ var all=(G.letters||[]).slice().reverse();
 1460  freeWorlds() [1]  the Night stop, the no-free-worlds stop and the ring note — v4.30/v4.16, now as notes that open the Tech tab
 1461  watchRings() [15]  ≈ if(U.gk!==G){ U.gk=G; U.noFreeAt=null; U.ringNoted=undefined; U.notes=[] }
 1477  hubAfford() [2]  what Earth can pay for now — the flags and the notes above
 1479  arkAfford() [2]  ≈ if(!G.night) return false; var k=arkPaid(G)+1; if(arkCheck(G,k)!=='ok') return false;
 1481  driveAfford() [1]  ≈ return can('tech')&&!G.drive&&!driveAhead(G)&&startDriveWhy(driveHost())==='ok' }

 1482  ## THE TUTORIAL AND THE STORY (V4.36; DESIGN/UI-V7.HTML, BRIEF «ОБУЧЕНИЕ» AND «НАРРАТИВ В МАКЕТЕ»)
 1495  var TUTX  TUTX: off/story — this run goes without the helper and the voices (Test play, the scenarios' hook); hook — the
 1496  helpPref() [1]  ≈ return !TUTX.off }
 1497  var OPEN_ALL  ≈ ['people','food','line','speed','fuel','earth','metal','order','yard','fleet','parts','mac
 1498  var TAB_KEYS  ≈ {earth:1,worlds:1,tech:1,yard:1,fleet:1,ark:1};
 1499  tutBlank() [1]  ≈ return {lock:false,help:false,open:{},fresh:{},seen:{},step:-1,seq:0,q:[],msg:null,nar:nul
 1500  secVis(sec) [1]  ≈ return sectorOpen(G,sec)&&(!U.tut.lock||can('ring2')||sec<1) }
 1501  visRings() [1]  ≈ return U.tut.lock&&!can('ring2')?Math.min(1,SECTORS.length):SECTORS.length }
 1502  ringFree(sec,kind) [1]  ≈ return PLANETS.filter(function(p){ return p.sec===sec&&(!kind||p.kind===kind)&&!G.colonies
 1503  firstCol() [1]  ≈ var t=U.tut; if(t.col&&G.colonies[t.col]) return t.col; return Object.keys(G.colonies)[0]|
 1504  builtHulls() [1]  ≈ return G.ships.filter(function(s){ return s.mode!=='dead'&&s.mode!=='building' }).length }
 1505  halfWorld() [1]  ≈ return Object.keys(G.colonies).filter(function(k){ return wst(k)==='half' })[0]||null }
 1506  lineless() [2]  ≈ var ks=Object.keys(G.colonies); if(!ks.length) return null;
 1508  mineFor() [1]  ≈ var k=Object.keys(G.colonies).filter(function(x){ return planet(x).kind==='mine' })[0]; if
 1509  fcYear() [1]  ≈ var f=G.foodFc||foodForecast(G); return f?f.y:'—' }
 1510  freeHullAtPier() [1]  ≈ return freeAtPier().some(function(s){ return !s.mutiny&&!s.crewWait&&!s.job }) }
 1512  offLine() [1]  a hull that is on no line: free at the pier, or flying home after it set settlers down
 1513  closeAll() [1]  ≈ U.win=null; U.tab=null; U.pop=null; return {} }
 1520  var EX_SPARE  v5.31 (p.27: «я попробовал обменник. Классно перекидал ненужное в нужное… Но игра нигде не учит нас его исполь
 1521  exLow(r) [1]  ≈ var nd=G.need||earthNeed(G), t=trend(r); return (nd[r]||0)>0&&t!==null&&t<-0.05&&G.earth[r
 1522  exPair(get,n,spare) [6]  ≈ var rs=exOpen(); if(rs.length<3||rs.indexOf(get)<0||!(n>=1)) return null;
 1528  exWant(get,n,spare) [2]  ≈ var t=U.tut; if(!t.help||t.seen.mX||!can('earth')||(G.stats.ex||0)>0) return false;
 1530  exHint(code,p) [1]  a refused press draws nothing by itself — her word would wait for the next frame of the game
 1532  var TMSG  the rules: where she points, how, and what the press must be
 1574  hullWorld(sid) [1]  ≈ var s=shipById(G,sid); if(!s) return; var w=s.from||(s.pend&&s.pend.from)||forWorld(s)||(s
 1576  var NAR  the story: Claude's clean copy 15.10 (awaits Nikita), texts in the sheet; V — her voice (the launch, N-01, gav
 1587  var STEPS  twelve steps, one after another; the windows and the numbers a rule needs are taken when it is shown (pre), no
 1601  stepReady(i) [1]  ≈ var s=STEPS[i]; if(!s) return false; return s.when()||(!!s.soft&&stepReady(i+1)) }
 1602  var STEP_SAFE  ≈ 8; // HANDOFF: no hull is lost before the advisor step (G.safe)
 1603  tutOpen(keys) [3]  ≈ var t=U.tut; if(!t.lock) return;
 1606  tutOpenAll() [1]  ≈ var t=U.tut; OPEN_ALL.forEach(function(k){ t.open[k]=1 }); t.fresh={}; ['metal','fuel','pa
 1607  tutPush(id,p) [2]  ≈ var t=U.tut; if(TMSG[id]&&!t.help) return; if(NAR[id]&&!TUTX.story) return;
 1609  tutStep(i) [1]  ≈ var t=U.tut, s=STEPS[i]; t.step=i; tutOpen(s.opens); if(s.go) s.go(); s.q.forEach(function
 1610  evOn() [1]  v4.40: a soft step opened early has no sector to name — N07 said «Space over flows…»
 1611  partsHome() [1]  ≈ return (G.delivered.parts||0)>0||G.earth.parts>0 }
 1613  tutNew() [2]  a new game: step 1 (the main menu and its terminal come before it)
 1616  tutQuiet() [6]  a run already under way (an old save, or the helper turned on in the middle): what has happened is not told ag
 1622  tutLog() [7]  ≈ var t=U.tut, mx=t.seq;
 1629  tutJit() [15]  ≈ var t=U.tut, w=U.win, quiet=!t.msg&&!t.nar&&!t.q.length;
 1644  tutBusy() [1]  ≈ return modal() }
 1645  tutNext() [4]  ≈ var t=U.tut; if(t.msg||t.nar||!U.langPicked||G.over) return;
 1649  msgShow(it) [3]  ≈ var t=U.tut, m=TMSG[it.id]; U.pop=null; var p=m.pre?m.pre():{}; if(p===null) return false;
 1652  msgDone() [1]  ≈ var t=U.tut; if(!t.msg) return; t.msg=null; draw() }
 1653  var NART  ≈ null;
 1654  narShow(it) [4]  ≈ var t=U.tut, N=NAR[it.id], p=it.p||(N.pre?N.pre():{}); if(p===null) return false;
 1658  narDone() [1]  ≈ clearTimeout(NART); if(!U.tut.nar) return; U.tut.nar=null; draw() }
 1660  tutOff() [2]  SKIP THE HELPER (first message) and ≡ Helper off: everything opens at once; the story goes on
 1662  tutOn() [1]  ≈ var t=U.tut; if(t.help) return; t.help=true; tutQuiet(); act(G,'helper',{on:true}) }
 1663  tutTick() [7]  ≈ var t=U.tut; if(!U.langPicked||G.over) return;
 1670  tutHold() [1]  ≈ var t=U.tut; return !!t.msg||!!(t.nar&&t.nar.hold) }
 1672  tutTarget(m) [3]  the press: a rule lets through only its lit thing; her voice closes on any press
 1675  tutClick(ev) [11]  ≈ var t=U.tut, x=ev.target;
 1686  tutKey(e) [7]  ≈ var t=U.tut;
 1694  tutAct(a,v,res) [3]  after a press went through: a 'do' is done when its press succeeded, a 'see' on any press; a tab loses its dot
 1698  tutPlace() [21]  the dark with a cut-out (+6 px, one or two pieces), the yellow ring, the helper over the map — or over the tar
 1719  tutLive(e) [1]  ≈ if(e.getAttribute('aria-disabled')==='true') return false; if(!e.querySelector('[data-act]
 1720  narPlace() [6]  ≈ var n=U.tut.nar, V=el('voice');
 1727  alx(s) [2]  Alexandra's line under the Institute's in a big window; her face — by the key whose text it is (the callers pa
 1732  var FACE  her face (Nikita 04.11, design/ALEXANDRA-FACES.md): the pose by the key of her line — the last line with a pos
 1734  faceOf(keys) [1]  ≈ var f='talk'; keys.forEach(function(k){ if(FACE[k]) f=FACE[k] }); return f }
 1735  faceCls(f) [1]  ≈ return f==='full'?'hav afull':'hav fc fc-'+f }
 1736  icap(right) [1]  ≈ return '<div class="icap">'+esc(T('tut_inst'))+'<span>'+esc(right)+'</span></div>' }
 1738  var TUT_KEEP  in the save: what is open and what was said; the queue is not kept — what the current step has not said yet is
 1739  tutSave() [3]  ≈ var t=U.tut, o={}; TUT_KEEP.forEach(function(k){ if(t[k]!==undefined) o[k]=t[k] });
 1742  tutLoad(o) [5]  a save from before v4.36: everything open, no helper, the story goes on from here
 1747  tutState() [1]  ≈ var t=U.tut; return {lock:t.lock,help:t.help,step:t.step,msg:t.msg&&t.msg.id,mode:t.msg&&t

 1749  ## RENDER
 1750  appZoom() [1]  ≈ return +(el('app').dataset.z||1) }
 1751  drawSide() [3]  v4.42: the chart gives way to the panel instead of hiding under it
 1754  drawWin() [3]  ≈ var w=U.win, h='';
 1757  drawPop() [4]  ≈ var p=U.pop, h='', cls='';
 1761  focusFix() [4]  ≈ var now=Date.now();
 1766  var NIGHT_FX  Nikita, 02.11: «хочется ближе к концу накала» — static and dark over the map for the last NIGHT_FX years, grow
 1767  drawNightFx() [4]  ≈ var e=el('mapbox'); if(!e) return; var left=G.night&&can('night')?nightLeft(G):Infinity, o
 1771  draw() [6]  ≈ if(!G) return;

 1778  ## HULLS: WHERE EACH ONE IS, IN ONE LINE
 1779  hullSt(s) [22]  ≈ var wl=forWorld(s);
 1801  stRow(s,noT) [3]  v5.14: the world card drops « · N years»
 1804  hullRow(s,acts,id,noT) [2]  ≈ var g=hullGen(s);
 1808  pctUp(a,b) [1]  Nikita, 12.11 (F-feedback 11.11, «поколение выше летит чуть быстрее»): no speed number — a percent against the
 1809  specIcons(h) [2]  ≈ var pv=h.gen>0;
 1811  hullCost(h) [1]  ≈ return {metal:h.metal,fuel:h.fuel,parts:h.parts||0,people:h.crew||0} }
 1812  clsSeen(cls) [1]  v4.36: a hull that costs parts shows up once parts are open

 1814  ## THE WORLD WINDOW
 1815  stepOrder(pid) [3]  ≈ var col=!!G.colonies[pid];
 1818  openWorld(pid,focus) [4]  v4.38: the advisor names a hull — open the tab she is on and light her
 1822  var FOCUS  ≈ {evac:'#ovl [data-act="evac"]',add:'#addblk',lift:'#rw-lift',ord:'#ordblk',mach:'#mach'};
 1823  var KW  ≈ {mine:'u_kMine',farm:'u_kFarm',well:'u_kWell',works:'u_kWorks'};
 1824  wsub(p,extra) [1]  ≈ return esc((T(KW[p.kind])+' · '+fill(T('u_ringN'),{n:p.sec+1})+(extra?' · '+extra:'')).toU
 1825  sendFuel(p) [1]  v5.32: the settlers' departure price is counted in the core, in one place
 1826  lobeTxt(p) [1]  ≈ var lb=lobeOf(p.ang), ev=lobeEvents(G,lb); return T('lobe'+lb).toUpperCase()+' · '+(ev.len
 1827  assignable(pid) [2]  ≈ var p=planet(pid);
 1830  pickCourier(pid) [1]  v4.18: the free courier that can lift everyone and gets there first; else the biggest one; v4.33: none that wo
 1831  evacGoing(pid) [1]  ≈ return G.ships.some(function(o){ return o.job==='evac'&&o.dest===pid&&o.mode==='transit' }
 1832  evacW(pid) [1]  ≈ var nh=nextHome(G,pid,'courier'); if(nh&&nh.t<=0) return fill(T('u_evacW_line'),{n:nh.id})
 1833  evacBlock(p) [15]  ≈ var c=G.colonies[p.id];
 1848  liftRow(p) [3]  v5.14 (Nikita 11.11): no «· N years», the colour warns
 1852  var HUB_RES  nodes-1.01 (Nikita 05.11): the hub — build one here, or send this world's goods to one; on a hub, its depot an
 1853  hubCapP() [1]  ≈ return {m:hubCap(G),g:roman((G.gen||0)+1)} }
 1854  hubBlock(p,c,deadW) [16]  ≈ if(p.kind==='works') return '';
 1873  hubStock(c) [1]  v5.31 (Nikita's run 16.11, p.22: «хочу в меню планеты видеть ёмкость хаба, сколько хаб сейчас имеет ресурсов н
 1875  viaSeg(p,c) [6]  v5.17 (Nikita 12.11: «доставка куда земля или хаб была во вкладке линии, а то не ясно куда и как перевести суд
 1882  lineWhyP(code) [1]  nodes-1.01: a hull a line will not take says why — the courier limit, a hub's run to Earth, a hub too far for 
 1883  lineWhyShort(code) [1]  ≈ return code==='range'?T('u_outReach'):fill(T('u_lw_'+code),lineWhyP(code)) }
 1884  machines(p,c) [14]  before the Gen III yards the block is only noise
 1901  pkgCard(p,c,kc,kr,hold) [11]  v5.13 (Nikita 11.11: «ярусы надо поменять на upgrade package, который показывает, сколько он даст сверху и ско
 1914  ghostHub(p) [9]  v5.35 (Nikita's run 16.11, p.21: «заселить хабом задним числом»): a worked-out world founds a hub — the settle
 1923  winWorld(pid) [101]  ≈ var p=planet(pid), c=G.colonies[pid], st=wst(pid), L0='', R='';
 2025  seamShort(pid) [1]  v4.10 (Nikita, 27.09: 'слишком много непонятных цифр'): the seam is told in years at the current pace
 2026  seamLeft(pid) [3]  ≈ var res=G.reserves[pid], c=G.colonies[pid], p=planet(pid);
 2030  picker() [8]  the hull picker: send a free hull, or move one off its line; closed by «keep it where it is» or a press beside
 2040  genPick(cls,pid) [4]  Nikita, 26.10 («мочь строить предыдущее поколение») and F-56: both generations are named with their parts, the
 2044  genSeg(cls,g) [2]  ≈ if(g.prev===null) return ''; var b=function(i){ var h=HULLS[i]; return '<button type="butt
 2047  olderWhy(cls,hi) [2]  v4.42: under a card that offers the generation before — why: the current one wants parts Earth has not got

 2049  ## YARD: WHAT IS BEING BUILT, A FREE HULL OF THE CURRENT GENERATION, THE PIER
 2051  winYard() [18]  v4.49 (Claude's playtest 04.11): the order cards come first — under the list of what is building they slid dow

 2070  ## FLEET: EVERY HULL AND WHERE IT IS (NO PAUSE)
 2071  sideFleet() [12]  ≈ var all=G.ships.filter(function(s){ return s.mode!=='dead' });
 2083  searchFuel(m) [1]  ≈ var w=m.dest&&m.dest!=='earth'?m.dest:(m.origin&&m.origin!=='earth'?m.origin:m.target), p=
 2084  bestSearch(m) [2]  ≈ var where=m.dest&&m.dest!=='earth'?m.dest:(m.origin&&m.origin!=='earth'?m.origin:m.target)

 2087  ## WORLDS: THE LIST, WORST FIRST
 2088  var SEV  ≈ {dead:0,cut:1,starve:2,noline:3,half:4,dry:5,ok:6,settling:7,free:8};
 2089  sideWorlds() [8]  ≈ var list=PLANETS.filter(function(p){ return secVis(p.sec)&&!(G.ghost&&G.ghost[p.id]) }).ma

 2098  ## TECH: THE HULL GENERATION (THE DRIVE PROGRAMME), THE NEXT GENERATION'S SPECS, THE RINGS
 2101  steps(n,of,col) [3]  BRIEF: the rule of the drive does not change — the gate is worlds ever settled (4 + 4·l), the programme runs a
 2104  worksList() [1]  ≈ return Object.keys(G.colonies).filter(function(k){ return planet(k).kind==='works' }) }
 2106  driveHost() [2]  v5.17 (Nikita 12.11: «зачем выбирать, если автоматически это происходит») — no «Run the programme at»: the wor
 2108  startDriveWhy(pid) [4]  ≈ if(G.drive) return 'running';
 2113  driveHelpOn() [1]  Nikita, 26.10: «непонятно что за программа двигателя» — a note that opens and closes any time; the choice stay
 2114  driveHelp(work) [2]  ≈ return '<div class="dhelp"><p>'+esc(T('u_dh1'))+'</p><p>'+esc(T('u_dh2'))+'</p><p>'+esc(fi
 2118  techGains(g,lvl) [7]  v5.16 (Nikita 12.11, draft A of design/tech/tabs.html): Tech on three tabs — OVERVIEW (the programme, what the
 2125  sideTech() [37]  ≈ var g=G.gen||0, lvl=G.driveLvl||0, s=settledCount(G), need=driveReachFor(G), work=driveWor

 2163  ## ARK: THE NIGHT, THE CAPSULE RINGS, THE CONVOY, THE VERDICT
 2165  arkDriveTxt() [6]  ≈ if(arkReady(G)) return [fill(T('u_arkReady'),{g:roman(G.arkMark)}),C.food];
 2172  homeList() [1]  Nikita, 02.11 (35 presses at the end of run 221175121): every hull on a line, in one press — the same two orde
 2174  pierOut() [1]  the hulls at the pier that are not in the convoy yet
 2179  var HIVE_D  v5.10 (design/ARK.md 2g p. 5, drafts design/ark-menu hex-F1/F2/F3 — one window in three states: at rest, the c
 2180  hivePts(cx,cy,r) [1]  ≈ var a=[]; for(var i=0;i<6;i++){ var t=Math.PI/3*i; a.push((cx+r*Math.cos(t)).toFixed(1)+',
 2181  hiveRings() [1]  ≈ var need=1, ab=arkBoard(G); while(arkCaps(need)<ab&&need<12) need++; return Math.max(need,
 2182  hiveSvg(sel) [15]  ≈ var rg=arkRings(G), paid=arkPaid(G), N=hiveRings(), rc=Math.max(6,N+2), r=19*6/rc, cx=262,
 2197  hiveLg(cls,key) [1]  ≈ return '<span><svg width="16" height="14" viewBox="0 0 16 14"><polygon class="hx '+cls+'" 
 2198  winArk() [32]  ≈ if(!G.night) return '<div class="win sm">'+head(esc(T('u_tabArk').toUpperCase()),esc(T('u_

 2231  ## THE ADVISOR: WORLDS ONLY, WORST FIRST (NIKITA 15.10: «НЕ ПОНИМАЮ, ЧТО ДЕЛАТЬ»)
 2237  var QUIET_YEARS  v4.50 (Nikita 05.11, «Да»): a mine, farm or well with no line is grey and out of the count while Earth's stock
 2238  quietDep(p,dep) [2]  no trend yet (first years, after a load): Earth's own burn alone
 2240  advRows() [22]  v4.38: a hull named for one line is not offered to the next
 2264  lineFix(pid,used) [5]  v4.38 (Nikita, 19.10, option A): the one fix for a line that falls behind — a free hull, a spare one off anoth
 2270  var ADV_T  Nikita, 02.11 («всё сливается и глазу тяжело»): five kinds, each with its own mark and colour; the worst kind 
 2271  popAdv() [5]  v4.50: a group of grey rows is grey, its count is the top bar's.filter(function(g){ return g.rows.length }).so
 2276  popMenu() [9]  ≈ return '<div class="menu"><button type="button" data-act="sfx">'+ic('speed',15)+esc(T('u_m

 2286  ## THE MAIN MENU (WORK/MENU.JS, V4.40): IN FRONT OF A NEW RUN WHOSE CLOCK STANDS; ITS TERMINAL TELLS THE START
 2289  menuLang() [1]  v5.05 (Nikita 06.11: «удали смену языка в игре, пусть интерфейс будет только на английском»): the game speaks 
 2290  menuOpen() [11]  ≈ U.menu=true; draw();

 2302  ## SAVE AND LOAD: A FILE, AND THE LAST AUTOSAVE IN THIS BROWSER
 2303  var SAVE_KEY  ≈ 'lb.save';
 2304  dump() [2]  ≈ return JSON.stringify({v:1,G:G,SECTORS:SECTORS,PLANETS:PLANETS,HULLS:HULLS,U:{hist:U.hist,
 2306  undump(t) [9]  ≈ var o=JSON.parse(t,function(k,v){ return v==='__inf'?Infinity:(v==='__-inf'?-Infinity:v) }
 2315  autosave() [1]  ≈ try{ localStorage.setItem(SAVE_KEY,dump()) }catch(e){} }
 2316  loadAuto() [2]  ≈ var t0=null; try{ t0=localStorage.getItem(SAVE_KEY) }catch(e){} if(!t0) return false;
 2318  saveFile() [2]  ≈ var data=dump(), name='last-berth-'+G.seed+'-y'+G.day+'.json';

 2324  ## RUN LOG
 2325  showLog() [1]  ≈ act(G,'export',{}); el('logtxt').value=exportLog(G); el('loghead').textContent=T('runLog')
 2327  saveLog() [5]  v4.11 (Nikita, 28.09: 'экспорт JSON-файла'): the page asks the viewer to save the file; where the runtime is a
 2332  copyLog() [3]  ≈ var ta=el('logtxt'); ta.focus(); ta.select(); var done=false;

 2338  ## PRESSES
 2340  var lineWhy  v4.35 (reviewer): setLine puts the hull on the line and then sails it — no fuel or crew keeps her at the pier 
 2341  lineRes(res,sid,pid) [1]  ≈ var s=shipById(G,sid); if((res==='fuel'||res==='crew')&&s&&s.from===pid){ lineWhy[sid]=res
 2342  lineWait(sid) [1]  ≈ return lineWhy[sid]?whyText(lineWhy[sid]):'' }
 2343  resLeft(sid) [1]  ≈ toast(esc(fill(T('u_resLeft'),{n:sid})),'warn',6000,false) }
 2344  doAct(a,b) [85]  ≈ var d=b.dataset, res=null, okc=null, okp=null, v=d.v;

 2462  ## THE MAP TURNS, MOVES AND ZOOMS (V5.05): DRAG = TURN, RIGHT DRAG / SHIFT / TWO FINGERS = MOVE, WHEEL / PINCH = ZOOM
 2486  var UI_STEPS  desktop first (Nikita 16.10): below 1180×700 the whole desk is scaled down, nothing reflows.
 2487  uiScale() [1]  ≈ if(U.uiScale===undefined){ U.uiScale=1; try{ var v=+localStorage.getItem('lb.uiScale'); if
 2488  uiScaleNext() [2]  ≈ var i=UI_STEPS.indexOf(uiScale()); U.uiScale=UI_STEPS[(i+1)%UI_STEPS.length];
 2490  fit() [3]  ≈ var a=el('app'), w=window.innerWidth, h=window.innerHeight, zmax=Math.min(w/1180,h/700),

 2495  ## LOOP
 2497  var MS  v4.31 (Nikita, 13.10, F-45: '4x too fast'): 1x 1.5 s, 2x 1.0 s, 4x 0.6 s, 10x 0.2 s a year
 2500  clockOn(from) [1]  v4.46: the run's clock (G.clock, see clockOut in core.js) — starts at the New Game press, saved with the run. 
 2501  clockTick(dt) [2]  ≈ var c=G&&G.clock; if(!c||G.over||document.hidden) return; dt=Math.min(dt,1000); c.ms+=dt;
 2504  m3frame(ts) [1]  v5.05: the 3D chart turns its spheres and sends its wave between the years, 20 a second; v5.07: at once when t
 2505  frame(ts) [25]  ≈ if(!U.last) U.last=ts;
 2531  tutMute() [1]  everything open, no voices, no helper: the scenarios' hook and the menu's Test play
 2532  start(seed) [13]  a new game: the helper and the voices again (Test play muted only its own run)
```

## menu.js (399 строк)

```
    6  var LBMENU  LAST BERTH — the main menu and the start-up terminal. v4.40 (Nikita 23–24.10: design/menu-v1.html variant 5 — 
    7  var O  ≈ null, ROOT=null, UI=null, CV=null, GLX=null, OPEN=false, SEL=1, BUSY=false;
    8  T(k,p) [1]  ≈ return O.T(k,p) }
    9  snd() [1]  ≈ return !!(O&&O.sound()) }
   10  esc(s) [1]  ≈ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;',
   11  mark() [1]  ≈ return '<svg class="mmk" viewBox="0 0 120 120" aria-hidden="true"><use href="#i-markf"/></
   12  phone() [1]  ≈ return !!(ROOT&&ROOT.classList.contains('phone')) }

   14  ## THE SCENE: A FIELD OF HEX COLUMNS RUNNING AT THE CAMERA (WEBGL2), THE STARS OVER IT
   15  var PAL  ≈ {ink:'#F2F1EC',mid:'#9C9B95',dim:'#5E5D58',ppl:'#FFD23F',earth:'#4FA3FF',food:'#3DDC84',fu
   16  rgba(hex,a) [1]  ≈ var n=parseInt(hex.slice(1),16); return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+a
   17  rng(s) [1]  ≈ return function(){ s=(s*1664525+1013904223)%4294967296; return s/4294967296 } }
   18  hsh(n) [1]  ≈ n=Math.sin(n)*43758.5453; return n-Math.floor(n) }
   19  vn3(x,y,z) [4]  ≈ var xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z), xf=x-xi, yf=y-yi, zf=z-zi, f=fun
   23  skyStars(c,w,h,t,st,yMax,n) [2]  ≈ if(st.reset||!st.sk||st.skn!==n){ var rg=rng(99); st.sk=[]; st.skn=n; for(var i=0;i<n;i++)
   25  fbm2(x,y,z) [1]  ≈ return (vn3(x,y,z)*.55+vn3(x*2.1+7.3,y*2.1+1.9,z*1.3)*.3+vn3(x*4.3+3.1,y*4.3+8.8,z*1.7)*.1
   27  hexGround(c,w,h,t,st,ph,mode) [18]  the same field flat, for a browser without WebGL2. hex ground in perspective: the world is a hexagonal field, 
   45  hexRelief2D(c,w,h,t,st,ph) [1]  ≈ hexGround(c,w,h,t,st,ph,'relief') }
   48  var PTR  the camera leans after the pointer; a new item flashes the field (PULSE)
   49  ptrMove(e) [1]  ≈ PTR.tx=(e.clientX/innerWidth-.5)*2; PTR.ty=(e.clientY/innerHeight-.5)*2 }
   50  ptrLoop() [1]  ≈ if(!OPEN) return; PTR.x+=(PTR.tx-PTR.x)*.05; PTR.y+=(PTR.ty-PTR.y)*.05; requestAnimationFr
   51  pulseAge() [1]  ≈ return (performance.now()-PULSE.at)/1000 }
   53  sceneStart(cv) [9]  the scene runs while its canvas is in the page and rests under the terminal; without WebGL2 the same field is 
   62  flatStart(cv,t0) [6]  ≈ var c2=document.createElement('canvas'); c2.className='mcv'; cv.parentNode.replaceChild(c2

   69  ## THE MENU: WHAT THE GAME CAN DO AT ITS START (CONTINUE THE AUTOSAVE, A NEW RUN, A SAVE FILE, LANGUAGE, SOUND)
   70  items() [6]  ≈ var s=O.save(); return [
   76  firstOn() [1]  ≈ var I=items(); for(var i=0;i<I.length;i++) if(!I[i].off) return i; return 0 }
   77  drawUI() [4]  ≈ if(!UI) return; var I=items(); if(I[SEL]&&I[SEL].off) SEL=firstOn();
   81  select(i) [1]  ≈ if(i===SEL) return; SEL=i; PULSE.at=performance.now(); UI.querySelectorAll('.mit').forEach
   82  act(i) [6]  v4.46: the run's clock starts at the press, the terminal included
   88  test() [1]  ≈ if(BUSY) return; diveThen(function(){ O.test(); fadeOut() }) }
   90  var NOTE  a word in the menu itself (a save that would not load): the game's toasts are under the menu
   91  note(txt) [1]  ≈ var m=UI&&UI.querySelector('.mmsg'); if(!m) return; m.textContent=txt; m.classList.add('on

   93  ## THE DIVE: THE CAMERA SPEEDS OVER THE FIELD, PAST ITS EDGE AND INTO SPACE; THEN BLACK
   94  var DIVE  ≈ {at:Infinity,back:-1e9}, DIVE_MS=4200;
   95  diveBack() [1]  ≈ DIVE.at=Infinity; DIVE.back=performance.now(); BUSY=false; ROOT.classList.remove('diving')
   96  diveThen(fn) [3]  ≈ if(BUSY) return; BUSY=true; if(!GLX){ fn(); return }
   99  smst(a,b,x) [1]  ≈ var t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t) }
  101  var HEX_VS  ≈ `#version 300 es
  130  var HEX_FS  ≈ `#version 300 es
  160  var SKY_VS  ≈ `#version 300 es
  162  var SKY_FS  ≈ `#version 300 es
  186  glProg(gl,vs,fs) [2]  ≈ function sh(t,s){ var o=gl.createShader(t); gl.shaderSource(o,s); gl.compileShader(o); if(
  188  hexMesh() [6]  ≈ var P=[], N=[], k, a0, a1, R=.94;
  196  hexScene(gl,ph) [17]  the scene; null when a shader does not compile (the flat field takes over)

  215  ## SOUND: THE MENU'S LOW DRONE (TICKS ON HOVER, A SOFT CHORD ON A CHOICE), DUCKED UNDER THE TERMINAL
  216  var MA  ≈ {c:null,m:null,duck:false};
  217  maSet() [1]  ≈ if(!MA.c) return; MA.m.gain.setTargetAtTime((snd()&&!MA.duck)?.5:0,MA.c.currentTime,.35) }
  218  maStart() [6]  ≈ if(MA.c||!snd()) return; try{ var c=new (window.AudioContext||window.webkitAudioContext)()
  224  maTone(f,dur,g,type,delay,slide) [1]  ≈ if(!MA.c||!snd()||MA.duck) return; var c=MA.c, t=c.currentTime+(delay||0), o=c.createOscil
  225  maClick(kind) [1]  ≈ if(kind==='hover'){ maTone(1180,.07,.05,'sine') } else if(kind==='select'){ maTone(70,.5,.
  226  maDuck(on) [1]  ≈ MA.duck=on; maSet() }
  227  maStop() [1]  ≈ var c=MA.c; MA.c=null; MA.duck=false; if(c){ try{ c.close() }catch(e){} } }
  230  auStart() [13]  the terminal's sound: a fan, a 50 Hz buzz, a whining disk; it rises while the machine works and calms as the s
  243  auLevel() [3]  ≈ var a=BT.au; if(!a) return; var t=a.c.currentTime, ns=BT.ns, w=BT.act;
  246  auClick(v) [1]  ≈ var a=BT.au; if(!a) return; var c=a.c, s=c.createBufferSource(), g=c.createGain(), t=c.cur
  247  auBeep(f,ms,vol) [1]  ≈ var a=BT.au; if(!a) return; var c=a.c, o=c.createOscillator(), g=c.createGain(), t=c.curre
  248  auTone(type,f0,f1,dur,g,delay) [3]  ≈ var a=BT.au; if(!a) return; var c=a.c, t=c.currentTime+(delay||0), o=c.createOscillator(),
  251  auNoise(f0,f1,dur,g,q,delay) [3]  ≈ var a=BT.au; if(!a) return; var c=a.c, t=c.currentTime+(delay||0), s=c.createBufferSource(
  254  auPad(type,f0,f1,dur,g,delay) [1]  ≈ var a=BT.au; if(!a) return; var c=a.c, t=c.currentTime+(delay||0), o=c.createOscillator(),
  255  auClickAt(v,delay) [1]  ≈ setTimeout(function(){ auClick(v) },delay*1000) }
  256  auWork(k,d) [8]  ≈ var i, notes;
  264  auLoc(k) [1]  ≈ if(k===1){ auNoise(250,1500,1.6,.06,.8); auPad('sine',150,300,1.8,.05); auTone('sine',880,
  265  auLine(cls,sp) [1]  ≈ if(!BT.au) return; if(cls==='f'){ auTone('sine',165,150,.16,.05); auTone('sine',110,110,.2
  266  auErr() [1]  ≈ auBeep(196,110,.035); setTimeout(function(){ auBeep(147,170,.035) },180) }
  267  auPost() [1]  ≈ auBeep(620,140,.03) }
  268  auSend() [1]  ≈ auClick(.03); auTone('triangle',392,392,.09,.05); auTone('triangle',587,587,.14,.05,.075) 
  269  auDegauss() [1]  ≈ auTone('sine',55,22,.7,.22); auNoise(100,900,.5,.09,.6) }
  270  auCalm() [1]  ≈ auTone('sine',220,220,2.6,.03,.1); auTone('sine',330,330,2.4,.022,.2); auTone('sine',440,4
  271  auStop() [1]  ≈ var a=BT.au; BT.au=null; if(!a) return; try{ a.m.gain.setTargetAtTime(0,a.c.currentTime,.2

  273  ## 
  278  var PRE  the run before the first question: l — a line (class, key), w — a pause, t — a working bar (key, ms), loc — th
  282  var SYS  the six systems, in order: their sound, the right verb (of four), how many lines the start-up prints
  283  sk(s,f,n) [1]  ≈ return 'tm_'+s.k+'_'+f+(n||'') }
  284  var NOISE  ≈ [1,.85,.66,.48,.32,.16,0], GLY='▒░▓█#@%&?/\\<>|01ΞΨ§¤µ¦ƒ';
  285  var PF  ≈ {def:{bp:350,wh:124,fan:.026},air:{bp:540,wh:150,fan:.05},hatch:{bp:150,wh:62,fan:.03},tap
  286  var BT  ≈ {pf:PF.def,timers:[],run:0,fin:null,ask:null,busy:false,box:null,q:null,ov:null,ns:1,act:f
  289  planetSVG() [11]  the panel on the right: the sector grid, the system with its lit orbit, the wireframe Earth
  300  locRows() [1]  ≈ return '<div class="loc"><div class="lr r1"><span>'+esc(T('tm_sector'))+'</span><b>00/AE</
  301  var BLIPS  ≈ [[-30,-25],[22,-38],[40,12],[-8,32],[-44,14],[10,-4]];
  302  addBlip(k) [1]  ≈ var g=BT.ov&&BT.ov.querySelector('.blips'), p=BLIPS[k-1]; if(!g||!p) return; g.insertAdjac
  303  trimBox() [1]  ≈ var box=BT.box; if(!box) return; while(box.scrollHeight>box.clientHeight+2&&box.children.l
  305  hudTick() [3]  the clock in the corner and the wait under the question
  308  glyph() [1]  ≈ return GLY.charAt((Math.random()*GLY.length)|0) }
  309  scrambleAll() [6]  ≈ var box=BT.box; if(!box) return; var ns=BT.ns+(BT.act?.45:0), k;
  315  setNoise(n) [1]  ≈ BT.ns=NOISE[Math.min(6,n)]; auLevel() }
  316  termClear() [1]  ≈ BT.run++; BT.timers.forEach(clearTimeout); BT.timers=[]; clearInterval(BT.tick); clearInte
  317  newLine(cls,text) [1]  ≈ var box=BT.box, d=document.createElement('div'); d.className='bl '+cls; d._t=text; d._typi
  318  btype(cls,text,done,sp) [4]  ≈ var d=newLine(cls,text), run=BT.run, i=0, tm, b=sp?sp*3.6:38;
  322  memtest(done) [4]  ≈ var d=newLine('',''), run=BT.run, n=0, tm, end=T('tm_mtEnd'); d._typing=true;
  326  think(label,ms,done,sig) [10]  ≈ if(sig) auWork(sig,ms/1000); var run=BT.run, th=newLine('tk',''), hx=newLine('hx',''), t0=
  336  seq(list,fn,done) [1]  ≈ var k=0; (function go(){ if(k>=list.length){ done(); return } var it=list[k++]; fn(it,go,k
  338  termAsk(s,next) [10]  one system asks for its verb: a wrong one is refused with the reason and asked again; the right one starts it
  348  termPlay() [16]  ≈ maDuck(true); ROOT.classList.remove('diving'); termClear();
  365  termEnd() [1]  the end of the terminal, by its last line, SKIP or Esc: the run begins, the black lifts off the map
  366  termKey(e) [3]  ≈ if(e.key==='Escape'){ termEnd(); return }

  370  ## OPEN, CLOSE, PRESSES
  371  onClick(e) [4]  ≈ if(!OPEN) return; e.stopPropagation(); var t=e.target; maStart();
  375  onOver(e) [1]  ≈ if(!OPEN||BUSY||BT.ov) return; var it=e.target.closest&&e.target.closest('.mit[data-i]'); 
  377  onKey(e) [8]  the keys belong to the menu while it is up: nothing reaches the game under it
  385  onResize() [1]  ≈ if(ROOT) ROOT.classList.toggle('phone',innerWidth<720) }
  386  onVis() [1]  ≈ [MA.c,BT.au&&BT.au.c].forEach(function(c){ if(!c) return; if(document.hidden) c.suspend();
  387  var WIRED  ≈ false;
  388  open(opts) [4]  ≈ O=opts; ROOT=document.getElementById('menu'); if(!ROOT) return; OPEN=true; BUSY=false; SEL
  393  close() [3]  gone at once (the scenarios' hook, a file loaded) or lifting off the map
  396  fadeOut() [1]  ≈ if(!OPEN) return; ROOT.classList.add('out'); setTimeout(close,650) }
```

