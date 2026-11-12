# MAP — оглавление core.js / ui.js / menu.js

Сгенерировано `python3 tools/map.py > MAP.md` после каждой правки кода. Не править руками.
Навигация: `grep -n <имя> MAP.md` → `sed -n "<строка-40>,<строка+40>p" work/<файл>`. Код целиком не открывать.
Формат: `строка  имя(аргументы) [длина]  назначение`. «≈ …» = комментария нет, показано начало кода.

## core.js (1870 строк)

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
  167  hubCount(G) [1]  ≈ var n=0; for(var k in G.colonies) if(G.colonies[k].hub) n++; return n }
  168  hubCap(G) [1]  ≈ return K.HUB_BASE+(G.gen||0) }
  169  hubCost(G) [1]  ≈ var g=Math.pow(K.HUB_GROW,hubCount(G)); return {metal:Math.round(K.HUB_METAL*g), parts:Mat
  171  hubBuildCheck(G,pid) [5]  why this world cannot become a hub now; 'ok' when it can
  176  buildHub(G,pid) [6]  ≈ var r=hubBuildCheck(G,pid); if(r!=='ok') return r;
  183  feedersHome(G,hub) [6]  v5.02: a hub's feeders go back to Earth with their hulls, as setVia does; a hull that cannot fly to Earth stan
  192  hubRefund(G,pid) [3]  v5.12 (Nikita 11.11: «снести хаб и получить четверть тех ресурсов, что я в него вложил»): a quarter of this hu
  195  razeHub(G,pid) [7]  ≈ var c=G.colonies[pid]; if(!c||!c.hub) return 'nohub';
  203  depotKinds(G,pid) [5]  a hub, or a world that was one: Earth takes the whole depot — less the fuel its own machines drink
  209  kitIdle(G,pid) [1]  v5.12 (Nikita 11.11, a spent hub sold a tier for +0 that burnt fuel): machines on a dead seam have nothing to 
  210  kitDrinks(G,pid) [1]  ≈ return kitTier(G.colonies[pid])>0&&!kitIdle(G,pid) }
  211  lineOk(G,s,pid) [6]  nodes-1.01: the line is full of couriers
  218  lineRefuse(G,s,pid) [7]  nodes-1.01 UI getter: why lineOk refuses this hull on this world's line — a MSG code; 'ok' when it flies. Mirr
  225  hubCheck(G,pid,hub) [9]  ≈ var c=G.colonies[pid], p=planet(pid); if(!c||!p) return 'nocolony';
  234  setVia(G,pid,hub) [12]  ≈ var r=hubCheck(G,pid,hub); if(r!=='ok') return r;
  247  hubHands(G,hub) [2]  hands a hub's line brings from Earth for its feeders: what they lack, less those already waiting at the hub
  250  hubLoad(G,s,hub,w) [9]  a feeder at her hub: the kit and its fuel (written off Earth, as a leg that does not start at Earth burns Eart
  260  classFor(sec,gen) [5]  cheapest class that can serve a sector at this generation; null = nothing can
  266  genForSector(sec) [1]  generation needed before any hull can reach this sector
  268  var K  ≈ {
  431  planet(id) [1]  ≈ for(var i=0;i<PLANETS.length;i++)if(PLANETS[i].id===id)return PLANETS[i];return null}
  434  popCap(p) [1]  how many people a world can hold, and how many it wants before it digs at full rate
  435  popWant(p) [1]  ≈ return popCap(p) }

  436  ## V4.4: EXTRACTION KITS
  437  kitTier(c) [1]  ≈ return (c&&c.tier)||0 }
  438  kitLive(c) [1]  machines standing = no multiplier
  439  rateMult(c) [1]  ≈ return kitLive(c)? Math.pow(K.KIT_OUT,kitTier(c)) : 1 }
  442  storeCap(c) [1]  v4.5 (Nikita, 26.09: 'не хочу, чтобы ресурсы сгорали'): a world's stockyard has no ceiling. What the
  443  kitBurn(c) [1]  ≈ return K.KIT_FUEL*kitTier(c) }
  445  kitGain(G,pid) [3]  v4.31 (Nikita, 13.10, F-37): what the next kit does to this world in numbers — output a year now and with it, 
  448  kitCost(c) [2]  ≈ var t=kitTier(c)+1, m=Math.round(K.KIT_METAL*Math.pow(K.KIT_GROW,t-1)), p=Math.round(K.KIT
  450  kitOpen(G) [1]  ≈ return (G.driveLvl||0)>=K.KIT_GATE_DRIVE }
  452  lineHold(G,pid) [2]  the biggest hold on this world's line; 0 if nothing runs there
  454  canKit(G,pid) [11]  ≈ var c=G.colonies[pid]; if(!c) return 'nocolony';
  465  orderKit(G,pid) [8]  ≈ var r=canKit(G,pid); if(r!=='ok') return r;
  474  feedRates(G,node) [6]  what a world burns per year that Earth has to send it: works eat metal and rations, kits eat fuel
  483  fedMult(G) [1]  Earth's own output rides on the people left at home — but only so far.
  484  handsRate(G) [1]  v4.7: Earth empties
  485  earthOutput(G) [4]  ≈ var h=Math.max(0,G.earth.people-K.EARTH_CREW);
  490  crewOut(G) [1]  hands currently riding hulls rather than working at home
  493  crewAway(G) [1]  v3.9.1 (log 519788167: 1562 hands sat on hulls idle at Earth and were counted as left behind): a crew
  494  crewDocked(G) [1]  ≈ return crewOut(G)-crewAway(G) }
  500  earthNeed(G) [7]  G.earth.people is the pool of hands Earth can still put on a ship, not the
  510  openRes(G,res) [1]  v4.34 (Nikita, 15.10: 'игрок должен всё получать постепенно', option B): a resource is open from the day the p
  511  isOpen(G,res) [1]  a save from before v4.34 has every resource open
  512  burnAge(G,res) [1]  ≈ return 1+Math.max(0,G.day-((G.opened&&G.opened[res])||0))/K.APPETITE }
  513  openPaid(G,c) [1]  ≈ for(var r in c){ if(r!=='people'&&r!=='food'&&(c[r]||0)>0) openRes(G,r) } }
  516  pulseDrain(G,res) [4]  v4.20: what Earth takes a year while a crisis runs — at least the doubled burn, and PULSE_SHARE of what the em
  526  lobeCount(G,lobe) [1]  v4.21 (Nikita, 06.10, F-21): the director. Events come in three families, each told before it happens:
  527  lobeEvents(G,lobe) [1]  ≈ var out=[]; var E=(G.dir&&G.dir.ev)||[]; for(var i=0;i<E.length;i++) if(E[i].lobe===lobe) 
  528  activeCrisis(G) [1]  ≈ var E=(G.dir&&G.dir.ev)||[]; for(var i=0;i<E.length;i++) if((E[i].type==='crisis'||E[i].ty
  530  shipSpeed(G,s) [7]  how fast a hull moves right now: set by the lobe of the world at the other end of its trip
  537  stormAt(G,node) [5]  ≈ if(!node||node==='earth') return false; var p=planet(node); if(!p) return false;
  542  directorStep(G) [41]  ≈ var D=G.dir; if(!D) D=G.dir={next:K.DIR_FIRST,ev:[],n:0,seq:1};
  584  driveSpeed(G) [1]  crossings and signal lag both shrink with every drive mark earned
  585  driveWorkFor(G) [1]  ≈ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,G.driveLvl||0)) }
  586  driveReachFor(G) [1]  ≈ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*(G.driveLvl||0) }
  588  newGame(seed) [19]  ≈ seed = seed||((Math.random()*1e9)|0);
  609  reach(G) [1]  reach = live settlements. The relay used to add +2; it is gone (Nikita, 23.09: orders no longer carry anything
  614  settledCount(G) [1]  v4.15 (Nikita, 04.10): the gates on PROGRESS — charting a sector, each drive mark — count worlds EVER settled,
  615  sectorOpen(G,s) [1]  ≈ return s<SECTORS.length}
  616  travelDays(G,dist,ship) [4]  ≈ var sp=(ship&&HULLS[ship.hull]&&HULLS[ship.hull].speed)||1;
  620  legDays(G,a,b,ship) [1]  ≈ return travelDays(G,legDist(a,b),ship) }
  621  legDist(a,b) [9]  ≈ if(a===b) return 0;
  631  needsOf(G,node) [9]  ≈ if(node==='earth') return null;
  640  exportsOf(G,node) [4]  ≈ if(node==='earth') return ['metal','food'];
  644  loadAt(G,s,node) [65]  v4.4: cargo.kit rides alongside
  709  unload(G,s,node) [25]  ≈ var any=s.cargo.metal+s.cargo.food+s.cargo.fuel+s.cargo.parts+s.cargo.people;
  734  temper(G,s) [1]  ≈ var h=((s.id*2654435761)^(G.seed|0))>>>0; return K.MUTINY_SPREAD*((h%1000)/1000) }
  736  mutinyDue(G,s,round) [1]  would this crew refuse the run that starts here? (the desk can ask the same question)
  739  mutinyForecast(G) [7]  v4.27: the first crew that will refuse, by the same count the crews make — year, line, and the rations Earth
  749  lastLift(G,pid) [13]  v4.33 (Nikita, 13.10: 'не устраивает ощущение, что людей бросают… те люди на планетах обречены, ничего не сдел
  767  foodForecast(G,less) [17]  v4.28 (F-11, Nikita 08.10: the quiet famine — farms ran dry 440 years before the end and the larder warning ca
  786  foodShort(G) [1]  short = the rations run out inside FOOD_HORIZON years. ('Not reaching the Night' was tried and dropped: once t
  789  spentWorld(G,pid) [2]  v5.09 (Nikita 10.11: «делаем, чтоб судно не ходило пустым»): a world whose seam is dead and whose surface is b
  791  sail(G,s) [33]  ≈ var here=s.at, dest = here===s.from ? s.to : s.from;
  826  var CHRON  chronicle lines never roll off the cap: the log forgets traffic, not history
  827  log(G,code,d) [2]  ≈ G.logSeq=(G.logSeq||0)+1;G.log.push({day:G.day,code:code,d:d||{},seq:G.logSeq});
  831  forgeOf(G,k) [1]  F-14 (Nikita, 02.11: 'кузницам не хватает топлива — в лог не идёт'): the run log keeps every world's machines 
  832  forgeEv(G,k,code) [1]  ≈ G.forgeEv=G.forgeEv||[]; if(G.forgeEv.length<4000) G.forgeEv.push({day:G.day,p:k,code:code
  833  feedWhy(G,k,c) [1]  ≈ if(!onLine(G,k).length) return 'noline'; if(c.clip==='room'){ var fit=lineFit(G,k); if(fit
  834  forgeTally(G,k,c,p,want,made) [10]  ≈ var f=forgeOf(G,k), w; f.y++;
  844  forgeLoad(G,k,c,cuts) [1]  ≈ var f=forgeOf(G,k), res; f.loads++; c.clip=null; for(res in cuts){ f.clips[res+'_'+cuts[re
  846  act(G,kind,d,res) [1]  player actions, kept whole for post-run analysis (exported from the UI)
  850  clockOut(G) [2]  v4.46 (Nikita, 03.11: «лог должен писать время партии с нажатия на New Game»): wall-clock of the run, kept by 
  852  snap(G) [14]  ≈ var E=G.earth, cols=0, pop=0, dry=0;
  867  exportLog(G) [13]  v4.4 (Nikita, 25.09): the run log is JSON — the designer reads it with a script, not with his eyes
  880  exportLogText(G) [27]  ≈ var L=[]; L.push('LAST BERTH run log · seed '+G.seed+' · year '+G.day+(G.over?' · '+G.over

  908  ## ACTIONS
  910  buildShip(G,hullId) [16]  ≈ var h=HULLS[hullId]; if(!h) return 'locked';
  930  scrapValue(h) [1]  scrapping: an idle hull at Earth comes apart for part of what it cost.
  931  scrap(G,shipId) [13]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  944  shipById(G,id) [1]  ≈ for(var i=0;i<G.ships.length;i++)if(G.ships[i].id===id)return G.ships[i];return null}
  946  canDepart(G,s,pid) [12]  ≈ var p=planet(pid);
  959  launch(G,s,pid,job,cargo) [11]  ≈ var p=planet(pid);
  972  nextHome(G,pid,cls) [5]  v4.14: when no free hull at Earth can lift a world — the nearest rated hull on its way home, or null
  977  enRoute(G,pid) [1]  ≈ for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='transit'&&o.job==='colon
  978  foundParty(G,s,pid) [1]  ≈ return Math.max(0,Math.floor(Math.min(popCap(planet(pid)), s.cap, G.earth.people-K.EARTH_K
  979  colonize(G,shipId,pid,people,food) [17]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1000  setLine(G,shipId,from,to) [17]  A line is always world <-> Earth. Only Earth consumes, so a leg between two
 1020  clearLine(G,shipId) [1]  v3.8.1 (log 57539013, tester: "нельзя было снять судно"): a line ordered while the hull was in transit
 1023  moveLine(G,shipId,pid) [16]  v4.31 (Nikita, 13.10, F-36): 'move to → world' under a hull of the line panel — off its line and onto the othe

 1039  ## V4.34: LINES ARE MANNED BY HAND (NIKITA, 14–15.10)
 1043  var CLASSES  ≈ ['courier','hauler','freighter'];
 1044  pileLeft(G,pid) [1]  v4.11: what is still on the surface
 1045  shipClass(s) [1]  ≈ return HULLS[s.hull]?HULLS[s.hull].key:'courier' }
 1046  onLine(G,pid) [2]  ≈ var out=[]; for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='dead') conti
 1048  lineCount(G,pid,cls) [1]  ≈ var n=0, ships=onLine(G,pid); for(var i=0;i<ships.length;i++){ if(shipClass(ships[i])===cl
 1050  hullAt(cls,gen) [1]  the hull of a given generation. v4.31 (Nikita, 13.10, F-36): an order always takes the current generation
 1051  currentHull(G,cls) [1]  ≈ var best=null; for(var i=0;i<HULLS.length;i++){ var h=HULLS[i]; if(h.key!==cls) continue; 
 1056  orderHull(G,cls,pid) [7]  v4.42 (Nikita, 24.10): the hull the yards offer in this class — the current generation, or the one before it w
 1063  orderCheck(G,pid,cls,hull) [15]  ≈ if(!G.colonies[pid]) return 'nocolony';
 1079  orderFor(G,pid,cls,hull) [8]  order a new hull of the current generation for this line: paid now, she takes the line when she leaves the yar
 1089  var EX_RES  nodes-1.02: Earth's exchange — get n of one resource for two others, at once. G.stats.ex: exchanges made
 1090  exVal(r) [1]  ≈ return K['EX_V'+String(r).toUpperCase()] }
 1091  exchangeCost(G,get,a,b,n) [1]  ≈ var w=n*exVal(get)*K.EX_K/2, o={}; o[a]=Math.ceil(w/exVal(a)); o[b]=Math.ceil(w/exVal(b));
 1092  exchangeCheck(G,get,a,b,n) [8]  ≈ if(EX_RES.indexOf(get)<0||EX_RES.indexOf(a)<0||EX_RES.indexOf(b)<0) return 'exRes';
 1100  exchange(G,get,a,b,n) [5]  ≈ n=Math.floor(n); var r=exchangeCheck(G,get,a,b,n); if(r!=='ok') return r;
 1105  upgradeSave(G) [6]  v4.34: an older save burns as it did — every resource open from day 0
 1111  setAuto(G,shipId,pid) [1]  ≈ return setLine(G,shipId,'earth',pid) }
 1112  setAutoOld(G,shipId,pid) [7]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1119  setPolicy(G,shipId,pid,deliver,collect) [11]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1130  setRoute(G,shipId,pid,out,take) [13]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1143  dispatch(G,shipId,pid,out,take) [6]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1149  repeatRun(G,shipId) [6]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1155  clearRoute(G,shipId) [1]  ≈ var s=shipById(G,shipId);if(s)s.route=null;return 'ok'}
 1157  runRoute(G,s) [6]  ≈ var pid=s.route; if(!pid) return 'noroute';
 1166  abandon(G,shipId,pid) [12]  v4.18 (Nikita, 04.10): only a courier lifts a settlement
 1180  search(G,shipId,missId) [12]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1196  startDrive(G,pid) [17]  the drive programme is repeatable: every mark cuts crossings and signal lag
 1213  driveDone(G,pid) [4]  ≈ G.driveWork=0; G.drive=null;
 1217  driveMark(G,pid) [7]  ≈ G.driveLvl=(G.driveLvl||0)+1;
 1224  researchHyper(G) [1]  ≈ return 'notworks' }

 1226  ## THE HACK: THE HELM WAKES THE CREW THAT RUNS WHAT WAS JUST WON
 1233  hackPush(G,h) [1]  ≈ (G.hackQ=G.hackQ||[]).push(h); G.pauseNow=true }
 1234  hackNext(G) [1]  ≈ return (G.hackQ&&G.hackQ[0])||null }
 1235  hackWait(G,k) [1]  ≈ return (G.hackQ||[]).some(function(h){ return h.k===k }) }
 1236  hackLevel(G) [1]  ≈ return Math.min(K.HACK_TOP,(G.hacks||0)+1) }
 1237  hackWin(G) [6]  ≈ var h=hackNext(G); if(!h) return 'nohack';

 1244  ## THE LONG NIGHT AND THE ARK
 1245  revealNight(G) [6]  ≈ if(G.night) return;

 1251  ## V4.0: THE SECOND DATE
 1252  workAt(l) [1]  ≈ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,l)) }
 1253  reachAt(l) [1]  ≈ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*l }
 1254  arkReady(G) [1]  ≈ return G.arkMark!==null&&G.arkMark!==undefined&&(G.driveLvl||0)>=G.arkMark }
 1258  driveForecast(G,target) [17]  when the drive reaches generation index `target` at the pace the works keep now.
 1275  nightLeft(G) [1]  ≈ return G.night? Math.max(0,G.night-G.day) : null }
 1276  var ARK_RES  ≈ ['metal','parts','food','fuel'], ARK_PAY=['food','metal'];
 1278  arkCaps(k) [1]  v5.10: the hive. G.ark.rings — rings paid for; G.ark.woke — rings whose hack is won (a run the interface start
 1279  arkUnit(r,i) [2]  the price of capsule No. i (from 0)
 1281  arkRingPrice(k) [3]  ≈ var a=arkCaps(k-1), b=arkCaps(k), o={food:0,metal:0};
 1284  arkPaid(G) [1]  ≈ return (G.ark&&G.ark.rings)||0 }
 1286  arkRings(G) [1]  the rings that hold: paid, and (the hack) their crew woken
 1288  arkOwed(G,k) [1]  what it costs to bring the hive up to ring k: the rings not yet paid, summed
 1289  arkHold(k) [3]  ≈ var H=K.ARK_HOLD, n=H.length, o={}, i, r;
 1293  arkCheck(G,k) [6]  a purchase brings the hive up to ring k in one go. 'ok' or why
 1299  arkBuy(G,k) [8]  ≈ var w=arkCheck(G,k); if(w!=='ok') return w;
 1308  arkFix(G) [1]  a save from before v5.10 held levels I-IV: a level becomes a ring (Claude — awaiting review)
 1313  fleetHull(s) [1]  v5.10: the convoy — the hulls the player set aside for the ark (s.reserve). Its share is those of them standin
 1314  convoyHull(G,s) [1]  ≈ return !!s.reserve&&s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to) }
 1315  arkConvoy(G) [5]  ≈ var all=0, have=0, way=0;
 1322  setReserve(G,shipId,on) [5]  v4.29: a hull set aside for the ark — the yards neither break it up for idling nor take it for a line; a line 
 1328  arkBoard(G) [1]  who boards if the ark left today: everyone on Earth and the crews at the pier — once there is a hive to board 
 1329  arkSouls(G) [1]  ≈ return arkRings(G)>=1 ? arkBoard(G) : 0 }
 1331  arkCapsuled(G) [1]  of them, who has a capsule; and who wakes: the capsuled, by the convoy's share. 0 until the ark drive is there
 1332  arkWakeN(G) [1]  ≈ return arkReady(G) ? Math.floor(arkCapsuled(G)*arkConvoy(G).share+1e-9) : 0 }
 1333  arkWake(G) [1]  the share of those aboard who wake
 1335  arkCargo(G) [1]  what rides along: what is left on Earth, up to the hold of the rings held
 1336  leftBehind(G) [5]  ≈ var col=0; for(var k in G.colonies) col+=G.colonies[k].pop;

 1342  ## THE CHRONICLE
 1344  chronShift(G,cols) [38]  ≈ var E=G.earth, idle=0;

 1383  ## TICK
 1385  lineRate(G,pid) [24]  ≈ var p=planet(pid), c=G.colonies[pid]; if(!c) return null;

 1410  ## V4.38 (NIKITA, 19.10): THE LINE'S FIT — WHICH HULL TO ADD, WHICH ONE RUNS HALF EMPTY
 1414  var FIT_PILE  ≈ 120, // a surface pile this big is the line falling behind, and spare hulls are still clea
 1417  hullYield(G,pid,s) [1]  what one hull carries a year on this world's line, at her speed; a hull number or {hull:i} for one not yet bui
 1421  lineFit(G,pid) [8]  what the line must carry a year (the world's output, or what a works or a kit burns if that is more) against w
 1431  lineSpare(G,pid) [10]  the hulls this line can lose and still carry FIT_SPARE times what it must, the biggest first. None while the w
 1444  lineHelp(G,pid,opt) [18]  what to do about a line that falls behind: {kind:'free'|'move'|'build', sid|cls, add, gap}, or null when the h
 1463  tick(G) [269]  ≈ if(G.over) return;

 1733  ## THE ADVISOR: THE GAME DOES THE ARITHMETIC AND SAYS WHAT WANTS A DECISION
 1735  advice(G) [132]  ≈ var out=[], E=G.earth, i, k;
 1868  dismiss(G,key) [1]  ≈ G.dismissed[key]=G.day; return 'ok' }
 1869  undismissAll(G) [1]  ≈ G.dismissed={}; return 'ok' }
```

## ui.js (2157 строк)

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
  160  ic(k,sz,col) [1]  ≈ sz=sz||16; return '<svg class="ic" viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'"'+(co
  161  var RESI  ≈ {metal:'metalA',food:'foodA',fuel:'fuelA',parts:'partsA',people:'peopleA'};
  162  resIc(k,sz) [1]  ≈ return ic(RESI[k],sz||14,C[k]) }
  163  shipIc(cls,sz) [1]  ≈ sz=sz||34; return '<svg class="gi" viewBox="0 0 64 40" width="'+sz+'" height="'+(sz*40/64)
  164  var WMARK  ≈ {mine:'<circle r="6"/>',farm:'<rect x="-5.5" y="-5.5" width="11" height="11"/>',well:'<pat
  165  wmark(kind,on,sz) [2]  ≈ sz=sz||14; var m=WMARK[kind].replace('/>',on?' fill="currentColor"/>':' fill="none" stroke

  168  ## STATE
  171  var U  U.tut / can(key): the tutorial decides what the player may see; with its lock off everything is open.
  173  var G  ≈ null;
  174  can(k) [1]  ≈ return !U.tut.lock||!!U.tut.open[k] }
  175  T(k,p) [1]  ≈ var s=(L[U.lang][k]!==undefined?L[U.lang][k]:k); return fill(s,p) }
  176  var YRS  ≈ {en:['year','years','years'],ru:['год','года','лет']};
  177  yrs(n) [3]  ≈ n=Math.abs(Math.round(+n||0)); var a=YRS[U.lang]||YRS.en;
  180  fill(s,p) [3]  ≈ if(!p) return s; return String(s).replace(/\{(\w+)\}/g,function(_,k){
  183  el(id) [1]  ≈ return document.getElementById(id) }
  185  var HTMLCACHE  v4.8 (Nikita, 27.09: 'игра подтормаживает'): a panel is only rewritten when its markup changed
  187  setHTML(id,html,key) [5]  v4.35 (reviewer): a panel rewritten on every tick kept losing its scroll — the scroll of its lists is carried 
  192  esc(s) [1]  ≈ return String(s).replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[
  194  num(x) [1]  numbers read in groups of three: 27 920
  195  dec(x) [1]  ≈ return (Math.abs(x)<10?x.toFixed(1):num(x)) }
  196  var ROMAN  ≈ ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  197  roman(n) [1]  ≈ return ROMAN[n]||String(n+1) }
  198  genB(g,old) [1]  ≈ return '<span class="gen'+(old?' old':'')+'">'+roman(g)+'</span>' }
  199  pname(id) [1]  ≈ var p=planet(id); return p?p.name.toUpperCase():id }
  200  hullName(h) [1]  v4.20: class + Greek name
  201  hname(s) [1]  ≈ return T(shipClass(s))+' '+roman(hullGen(s))+' '+fill(T('hullNo'),{n:s.id}) }
  202  kindWord(k) [1]  ≈ return T(KIND[k]) }

  204  ## PRICES: THE ICON AND THE NUMBER, THE SHORT PART RED; A RESOURCE THE PLAYER HAS NOT MET IS NOT SHOWN
  205  haveOf(k,E) [1]  ≈ return k==='people'?E.people-K.EARTH_KEEP:E[k] }
  206  price(c,E,sz) [4]  ≈ var out='';
  211  shortWhy(c,E) [4]  the first thing Earth is short of, as a why-code with the shortfall
  216  off(code,p) [1]  v4.12: a blocked button is never mute — off(code,p) marks it, and a press on it says why
  217  offW(w) [1]  ≈ return typeof w==='string'?off(w):off(w[0],w[1]) }
  218  whyText(code,p) [1]  ≈ return fill(MSG[U.lang][code]||code,p||null) }
  219  btn(label,act,data,kind,icon,dis) [2]  ≈ var d=''; for(var k in (data||{})) d+=' data-'+k+'="'+attr(data[k])+'"';

  222  ## MESSAGES
  225  toast(html,cls,ms,snd) [5]  v4.9 / v4.12 (Nikita, 30.09: 'когда я нажал кнопку, я хочу видеть подтверждение'): every order answers — a toa
  230  var GOOD_CODES  ≈ {ok:1,lineSet:1,policySet:1,copied:1,saved:1,textsOk:1,queued:1};
  231  say(code,p) [3]  ≈ var good=GOOD_CODES[code]||/^ok_/.test(code);
  234  logText(e) [7]  v4.42: head counts as on the end window («4 151», not «4151»); years stay as they are
  241  toastLast() [1]  ≈ toastOne(G.log[G.log.length-1]) }
  242  toastOne(e) [5]  v4.30: these stop the desk with a full-screen notice (voiceWatch)
  248  foodWatch() [3]  v4.10 (Nikita, 27.09): rations low and no farm feeding Earth → a yellow line, once a shift
  252  logKey(e) [1]  shift lines rotate between variants so a long calm run does not read as one sentence pasted ten times
  254  var SFX  ≈ (function(){
  289  pressFx(x,y,kind) [2]  v4.12: the press mark — a square that blooms where the pointer hit, so a click is seen even when the
  292  attr(v) [1]  v4.12: a blocked button is never mute — off(code,p) marks it, and a click on it says why (see the click handle

  294  ## PERSONAL FILES
  300  var VOICE_GAP  ≈ 50, CAPT_TENURE=30;
  301  hash32(a,b) [1]  ≈ var h=(a|0)^0x9E3779B9; h=Math.imul(h^(b|0),0x85EBCA6B); h^=h>>>13; h=Math.imul(h,0xC2B2AE
  302  personName(seed) [1]  ≈ var pool=(T('names')||'').split(/\s+/).filter(Boolean); if(!pool.length) return '—'; retur
  303  serviceNo(seed) [1]  ≈ return 1000+(Math.abs(hash32(seed,77))%9000) }
  304  voiceKeys(trigger) [1]  ≈ return Object.keys(VOICE.en||{}).filter(function(k){ return k.indexOf(trigger+'.')===0 }) 
  305  voice(trigger,role,d,o) [19]  ≈ o=o||{}; var keys=voiceKeys(trigger); if(!keys.length) return;
  325  voiceLine(e) [1]  ≈ var v=VOICE[U.lang]||{}; var d={}; for(var q in e.d.d) d[q]=e.d.d[q]; if(d.p&&planet(d.p))
  327  voiceWatch() [56]  what the log said since last time, and who answers it
  384  drawPortrait(cv,seed) [40]  the face: 64×64, bone on black, ordered dither — nobody drew it, and it is different every time

  425  ## THE CHART IN 3D (V5.05, NIKITA 06.11: «КАРКАС», «ПЕРЕНОСИ В ИГРУ» — DESIGN/MAP3D/E-HYBRID.HTML V3)
  432  var CAM  ≈ {tx:0,tz:0,yaw:0,pitch:52,dist:1700,fov:38}, CFIT=true, CFITK='', MAPDRAGGED=false;
  433  var M3D  ≈ {W:1,H:1,VP:null,dpr:1,fk:'',ok:'',HX:null,HXR:0,LAY:null,NEB:null,last:0,dirty:true};
  434  var P3  ≈ {}, P3N=-1, POS_GAP=28, H0=14, HK=1.0, HSTEM=60, RS=11, RF=8, HEXR=46, HUBC='#E040FB', PAR
  435  p3(p) [1]  ≈ if(P3N!==PLANETS.length||!P3[p.id]) layout3(); return P3[p.id] }
  436  layout3() [6]  ≈ var Ls=PLANETS.map(function(q){ var R=SECTORS[q.sec].r; return {id:q.id,x:Math.cos(q.ang)*
  443  seamLeftP(q) [1]  v5.17 (Nikita 12.11: «вместо населения возле имени планеты писать процентаж жилы и чтобы цвет менялся»): what 
  444  seamPct(q) [1]  ≈ var v=seamLeftP(q); return v===null?'':' '+v+'%' }
  445  seamCol(q) [1]  ≈ var v=seamLeftP(q); return v>=50?C.food:v>=20?C.people:v>0?C.red:C.mid }
  447  wH(pid) [1]  v5.19 (Nikita 12.11: «кол-во людей на планете вообще погоды не делает» → «ровные»): every settled world stands
  448  node3(n) [1]  ≈ if(!n) return null; if(n==='earth') return [0,0,0]; var pp=planet(n); if(!pp) return null;
  449  outerR() [1]  ≈ return secRadius(Math.max(0,visRings()-1)) }
  452  m3persp(fov,asp,n,f) [1]  matrices, column-major as GL
  453  m3sub(a,b) [1]  ≈ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]] } function m3dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a
  454  m3cross(a,b) [1]  ≈ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]] } function m3norm(a){
  455  m3look(e,c,u) [2]  ≈ var z=m3norm(m3sub(e,c)), x=m3norm(m3cross(u,z)), y=m3cross(z,x);
  457  m3mul(a,b) [1]  ≈ var o=new Array(16); for(var c=0;c<4;c++) for(var r=0;r<4;r++){ var s=0; for(var k=0;k<4;k
  458  camUpdate() [4]  ≈ var ph=CAM.pitch*Math.PI/180, th=CAM.yaw*Math.PI/180;
  463  prj(p) [3]  a point of the plane's space → desk px inside the map box (w: the depth, for sizes)
  466  pxPer(w) [1]  ≈ return M3D.H/(2*w*Math.tan(CAM.fov*Math.PI/360)) }
  468  m3size() [4]  v5.08: the box's size comes from a ResizeObserver — reading clientWidth every frame of a turn made the browser
  473  camFit() [8]  the visible chart in the frame with room for the names: aim at its middle, back off until every world and its 
  481  camTurn(dx,dy) [1]  ≈ CAM.yaw-=dx*0.25; CAM.pitch=Math.max(14,Math.min(89.5,CAM.pitch+dy*0.25)); CFIT=false }
  482  camPan(dx,dy) [3]  ≈ camUpdate(); var s=1/pxPer(CAM.dist), th=CAM.yaw*Math.PI/180, sp=Math.max(0.35,Math.sin(CA
  485  camZoom(f) [1]  ≈ CAM.dist=Math.max(220,Math.min(12000,CAM.dist*f)); CFIT=false }

  487  ## THE STATE OF A WORLD, AS THE MAP, THE LIST AND THE ADVISOR SEE IT
  488  isDead(pid) [1]  ≈ var p=planet(pid); return !!G.colonies[pid]&&!G.colonies[pid].hub&&p.kind!=='works'&&G.res
  489  isDry(pid) [1]  ≈ var p=planet(pid); return !!G.colonies[pid]&&p.kind!=='works'&&G.reserves[pid]!==Infinity&
  490  worksHungry(pid) [3]  ≈ var p=planet(pid), c=G.colonies[pid]; if(!c||p.kind!=='works') return null;
  494  feedSplit(pid) [3]  what the works burn a year and what the line brings of each, in the order the hold is filled (needsOf: fuel, m
  497  wst(pid) [10]  ≈ var c=G.colonies[pid];
  510  var THIN_WARN  Nikita, 26.10 («линия возит меньше или больше на 1 единицу, а уже уведомление»): a line speaks when it matters
  511  earthRunout(res) [1]  ≈ var t=trend(res); return t!==null&&t<-0.05&&G.earth[res]/-t<RUNOUT_YEARS }
  512  lineThin(pid) [3]  v4.38: a hull in the yards for the line counts
  515  seamYears(pid) [1]  ≈ var c=G.colonies[pid], p=planet(pid); if(!c||p.kind==='works'||G.reserves[pid]===Infinity|
  516  var BAD_ST  ≈ {dead:1,cut:1,starve:1};

  518  ## THE MAP
  519  m3rgb(h) [1]  ≈ return parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),1
  520  m3ring(cx,cy,cz,rad,n,a0,a1) [1]  ≈ var p=[]; a0=a0||0; a1=a1===undefined?Math.PI*2:a1; for(var i=0;i<=n;i++){ var a=a0+(a1-a0
  521  m3path(x,pts,close) [4]  prj's math inline: no object a point (hot)
  526  m3pathRing(x,cx,cy,cz,rad,n,close) [4]  a horizontal circle straight into a path (the same points as m3path(x,m3ring(…)), without the arrays)
  530  m3glow(x,col,b,post) [1]  ≈ x.shadowColor='rgba('+col+',.9)'; x.shadowBlur=b; x._post=!!post }
  532  m3rnd(seed) [1]  space: three star layers and a nebula, made once per size; drawn each frame with a little parallax on turning
  533  m3space() [11]  ≈ var T=1024;
  544  m3hexes(FR) [3]  ≈ if(M3D.HX&&M3D.HXR>=FR) return M3D.HX; var L=[], n=Math.ceil(FR/(HEXR*1.5))+2;

  547  ## V5.08: THE CHART THROUGH WEBGL
  555  var GLR  ≈ null;
  556  var M3SH  ≈ {
  583  m3glInit() [15]  ≈ var cv=el('map3d'), gl=null;
  599  var M3COL  a recorder: the part of the canvas 2D interface the scene uses, into triangles (x, y device px; d, hw: the lin
  600  m3col(s) [4]  ≈ var c=M3COL[s]; if(c) return c; var m;
  604  M3R() [2]  ≈ this.buf=new ArrayBuffer(1<<18); this.f=new Float32Array(this.buf); this.u8=new Uint8Array
  628  m3dash(S,D,k) [7]  a dash pattern (desk px, as the canvas: scaled with the transform) cut along a subpath; it starts again at eac
  637  var M3LP  a polyline as a strip: mitred joins (limit 4), butt ends, a 1 px soft edge on both sides; thinner than 1 px — 
  638  m3line(R,S,closed,hw,c,a) [18]  ≈ var n0=S.length>>1, P=M3LP, M=M3LM, n=0, i;
  657  m3draw(R,rec,res) [7]  a recorder's triangles to the GPU (uploaded again only after a reset) and drawn
  664  m3off(gl) [1]  ≈ for(var i=0;i<4;i++) gl.disableVertexAttribArray(i) }
  666  m3target(R,w,h) [5]  render targets at half size for the glow
  671  m3targets(R,W,H) [3]  ≈ var w=Math.max(1,Math.ceil(W/2)), h=Math.max(1,Math.ceil(H/2)); if(R.T&&R.T.w===w&&R.T.h==
  674  m3quad(R,prog) [1]  ≈ var gl=R.gl; gl.bindBuffer(gl.ARRAY_BUFFER,R.quad); gl.enableVertexAttribArray(prog.a.a_p)
  677  var M3SIG  one glow phase: per size class, its strokes into g, blurred across into t, along into a (over what is there); 
  678  m3wts(sg) [2]  ≈ var k=sg.toFixed(3); if(M3W[k]) return M3W[k]; var r=Math.min(12,Math.ceil(sg*3)), w=new F
  680  m3glowPass(R,recs,post,W,H,dst) [18]  ≈ var gl=R.gl, T=m3targets(R,W,H), B=R.P.blur, c, jobs=[], U=[1e9,1e9,-1e9,-1e9];
  699  m3tex(R,key,cv,rep) [5]  a canvas as a texture (premultiplied), kept by key
  705  m3skyGL(R,W,H) [8]  space as before (the nebula with a little parallax, three star layers tiled 1024 desk px a tile), in one pass 
  714  m3hexGL(R,FR,W,H) [16]  the plates: built when the floor's reach changes (a centre, a corner, a side, a fade per vertex), drawn by the
  731  m3floorEmit(fa,fb) [6]  the floor's lines: the darkening rims (under the plates) and the rings and the lobes (over them) — again only 
  738  m3sphere(x,cx,cy,cz,rad,col,spin,alph) [7]  a world's sphere, wire (Nikita 06.11: «каркас»): three parallels, four meridians turning slowly, a dark body, 
  746  m3orbit(x,a,h,front,col) [5]  the works' orbital ring, tilted: the half behind the sphere before it, the half in front after it
  752  m3dbl(x,a,b,col,wd) [3]  a double line on the floor: a hub's (to Earth, magenta) and a feeder's (to its hub, in its trade's colour)
  755  m3wcol(kind) [1]  ≈ return m3rgb(KCOL[kind]) }
  757  m3obEmit(x,vis) [14]  the footprints and the lines on the floor: again when the camera or the chart changes (who is settled, settlin
  772  m3waveEmit(x,t,OUT) [8]  the moving floor: the quiet wave and the events' lobes
  781  m3dynEmit(x,t,vis) [24]  the hulls and the worlds, every frame
  807  m3prep() [1]  the camera for this size and chart: the SVG needs it at once, the canvas draws on the next frame
  808  var M3RS  ≈ {fa:null,fb:null,ob:null,wv:null,dy:null};
  809  draw3d(now) [25]  ≈ if(!G||!el('map3d')) return; m3prep(); var R=GLR===null?m3glInit():GLR; if(!R||R.lost) ret
  837  var SV  the SVG on top: a .wd per world at its sphere (hit, alarms, the open one, its name and people), Earth's, the l
  838  drawMap() [54]  ≈ if(!G) return; m3prep(); M3D.dirty=true; var i, W=M3D.W, H=M3D.H, S={s:'',k:'',n:-1,V:[]};
  892  drawTip(g) [9]  ≈ var tip=el('tip'); if(!g||!G){ tip.className=''; return }
  901  drawEvBar() [5]  ≈ var E=(can('events')&&G.dir&&G.dir.ev)||[], h='', live=false;
  907  building() [1]  v4.35: what the yards are building, top right of the map — the three nearest, and how many more
  908  hullProgress(s) [1]  ≈ var h=HULLS[s.hull], tot=Math.max(1,h?h.days:1); return Math.max(0,Math.min(1,1-(s.t||0)/t
  909  forWorld(s) [1]  ≈ return s.lineFor||(s.pend&&s.pend.from)||null }
  910  drawCards() [7]  v5.09 (Nikita 10.11): the hack never opens by itself — this card, the Tech tab or the Ark window start it

  918  ## TOP: THE YEAR, THE NIGHT, THE ADVISOR, THE CLOCK
  921  winPause() [1]  v4.49 (Claude's playtest 04.11): a world window stops the clock too — at 4× up to 9 years went by while one wa
  922  winLight() [1]  ≈ return !!U.win&&!!planet(U.win) }
  923  bigKind() [1]  ≈ if(!U.langPicked) return U.menu?null:'lang'; if(G.over) return 'over'; if(G.night&&!G.nigh
  924  modal() [1]  ≈ return !!U.menu||!!bigKind()||!!U.pf||!el('logbox').hidden||hackOn() }
  929  hackOn() [1]  the hack (web/hack.js, Nikita 04.11): a finished drive mark or a paid ark level waits for it (core.js «the hac
  930  hackWho(h) [1]  ≈ return h.k==='drive'? fill(T('hk_cGen'),{g:roman(h.g)}) : fill(T('hk_cArk'),{l:roman(h.l-1
  931  hackCheck() [9]  v5.09: the two hacks are told apart — a drive mark meets the serpent at the number of the generation it opens 
  940  halted() [1]  ≈ return U.paused||winPause()||modal()||tutHold() }
  943  pauseToggle() [1]  ❚❚ / Space: a toggle only when the player's own pause is all that holds the clock. With a tab, card or helper 
  944  var SPEEDS  ≈ [1,2,4]; // v4.42 (Nikita, 24.10): no 10× — presses were lost to the redraw at that pace
  946  drawTop() [12]  v4.46 (Nikita, 03.11: «уведомление вверху не нужно, удалить»): the WAKE number of v4.45 is gone from the top b
  960  var TREND_YEARS  v3.7 (Nikita, 23.09): a resource that is being spent faster than it comes in must say so. The trend is the rea
  961  trendTick() [5]  ≈ var E=G.earth, h=U.hist;
  966  trend(k) [1]  ≈ var h=U.hist; if(h.length<6) return null; var a=h[Math.max(0,h.length-1-TREND_YEARS)], b=h
  969  peopleRate() [1]  v4.42: people are not a stockpile — the settlers and crews you send are a choice, not a trend (year 14 showed 
  972  birthX() [1]  v4.49 (Claude's playtest 04.11, Nikita: «а это»): the births multiplier is the main lever of the score and was
  973  birthCol(x) [1]  ≈ return x>=K.FED_MAX-0.005?C.food:(x>=1?C.people:C.red) }
  974  birthTxt(x) [1]  ≈ return '×'+x.toFixed(2) }
  975  drawRes() [11]  ≈ var E=G.earth, nd=G.need||earthNeed(G), h='';

  987  ## TABS AND THEIR FLAGS
  990  var TABS  BRIEF (Nikita 14.10): the flags speak of Earth, the yard, the fleet and the ark; the advisor is for worlds onl
  991  freeAtPier() [1]  ≈ return G.ships.filter(function(s){ return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)
  992  flags() [20]  Earth: hunger, then the larder, then metal and fuel
 1012  drawTabs() [7]  ≈ var F=flags(), h='';

 1020  ## WINDOW PIECES
 1021  head(title,sub,icon) [1]  ≈ return '<div class="wh">'+(icon||'')+'<b>'+title+'</b><small>'+(sub||'')+'</small></div>' 
 1022  sec(l,r,id) [1]  ≈ return '<div class="sec"'+(id?' id="'+id+'"':'')+'><span>'+l+'</span>'+(r!==undefined&&r!=
 1023  row(l,v,col,id) [1]  ≈ return '<div class="rw"'+(id?' id="'+id+'"':'')+'><span>'+l+'</span><b'+(col?' style="colo
 1024  hint(t,cls) [1]  ≈ return '<div class="hint'+(cls?' '+cls:'')+'">'+t+'</div>' }
 1025  alertBox(icon,t,warn) [1]  ≈ return '<div class="alert'+(warn?' warn':'')+'">'+ic(icon,16,warn?C.people:C.red)+'<span>'

 1027  ## EARTH: ONLY HOME AND ITS BURN (BRIEF)
 1029  var EX_N  nodes-1.02 (Nikita 05.11): Earth's exchange — what to get, which two resources pay, how much; the price in num
 1030  exOpen() [1]  ≈ return EX_RES.filter(function(k){ return can(k)&&isOpen(G,k) }) }
 1031  exBlock() [15]  ≈ var rs=exOpen(); if(rs.length<3) return '';
 1046  winEarth() [20]  ≈ var E=G.earth, nd=G.need||earthNeed(G), t=peopleRate(), h='';

 1067  ## BIG WINDOWS: LANGUAGE, THE END, THE NIGHT, THE SHIFT, NOTES — ONE AT A TIME, TIME STANDS
 1068  var NOTE_CODES  ≈ {drive_mark:'noteDrive',mutiny_warn:'noteArk',food_horizon:'noteEarth',night_near:'noteArk
 1069  evName(t) [1]  ≈ return T('ev'+t.charAt(0).toUpperCase()+t.slice(1)) }
 1070  note(o) [1]  ≈ U.notes.push(o) }
 1071  chronLines(k) [4]  ≈ var out='', n=0;
 1075  rw2(k,v,cls) [1]  ≈ return '<div class="rw"><span>'+k+'</span><b class="'+(cls||'')+'">'+v+'</b></div>' }
 1076  bigHtml(kind) [46]  ≈ if(kind==='lang') return '<div class="nwin" id="lang"><svg class="lmark2" viewBox="0 0 120
 1122  drawBig() [3]  the shift window is built once: its checkbox keeps its state

 1126  ## PERSONAL FILES: A FACE FOR A CREW, AT THE FOOT OF THE MAP, OR THE WHOLE SCREEN FOR THE MOMENTS THAT MATTER
 1129  var STRIP_MS  a word from a crew: only the Night, the ark drive and the last flights still take the whole screen. The rest a
 1130  letterById(id) [1]  ≈ return (G.letters||[]).filter(function(l){ return l.id===id })[0]||null }
 1131  letterText(f) [1]  ≈ var v=VOICE[U.lang]||{}, d={}; for(var q in f.d) d[q]=f.d[q]; if(d.p&&planet(d.p)) d.p=pna
 1132  letterRow(f,open,fresh) [2]  ≈ var t=letterText(f);
 1134  paintLetters(box) [1]  ≈ box.querySelectorAll('canvas[data-seed]').forEach(function(c){ if(!c._done){ c._done=true;
 1135  lettersUnread() [1]  ≈ return (G.letters||[]).filter(function(l){ return !l.read }).length }
 1136  drawPF() [19]  ≈ var L0=el('pfL'), f=U.pf;
 1155  popLetters() [2]  ≈ var all=(G.letters||[]).slice().reverse();
 1159  freeWorlds() [1]  the Night stop, the no-free-worlds stop and the ring note — v4.30/v4.16, now as notes that open the Tech tab
 1160  watchRings() [7]  ≈ if(U.gk!==G){ U.gk=G; U.noFreeAt=null; U.ringNoted=undefined; U.notes=[] }

 1167  ## THE TUTORIAL AND THE STORY (V4.36; DESIGN/UI-V7.HTML, BRIEF «ОБУЧЕНИЕ» AND «НАРРАТИВ В МАКЕТЕ»)
 1180  var TUTX  TUTX: off/story — this run goes without the helper and the voices (Test play, the scenarios' hook); hook — the
 1181  helpPref() [1]  ≈ return !TUTX.off }
 1182  var OPEN_ALL  ≈ ['people','food','line','speed','fuel','earth','metal','order','yard','fleet','parts','mac
 1183  var TAB_KEYS  ≈ {earth:1,worlds:1,tech:1,yard:1,fleet:1,ark:1};
 1184  tutBlank() [1]  ≈ return {lock:false,help:false,open:{},fresh:{},seen:{},step:-1,seq:0,q:[],msg:null,nar:nul
 1185  secVis(sec) [1]  ≈ return sectorOpen(G,sec)&&(!U.tut.lock||can('ring2')||sec<1) }
 1186  visRings() [1]  ≈ return U.tut.lock&&!can('ring2')?Math.min(1,SECTORS.length):SECTORS.length }
 1187  ringFree(sec,kind) [1]  ≈ return PLANETS.filter(function(p){ return p.sec===sec&&(!kind||p.kind===kind)&&!G.colonies
 1188  firstCol() [1]  ≈ var t=U.tut; if(t.col&&G.colonies[t.col]) return t.col; return Object.keys(G.colonies)[0]|
 1189  builtHulls() [1]  ≈ return G.ships.filter(function(s){ return s.mode!=='dead'&&s.mode!=='building' }).length }
 1190  halfWorld() [1]  ≈ return Object.keys(G.colonies).filter(function(k){ return wst(k)==='half' })[0]||null }
 1191  lineless() [2]  ≈ var ks=Object.keys(G.colonies); if(!ks.length) return null;
 1193  mineFor() [1]  ≈ var k=Object.keys(G.colonies).filter(function(x){ return planet(x).kind==='mine' })[0]; if
 1194  fcYear() [1]  ≈ var f=G.foodFc||foodForecast(G); return f?f.y:'—' }
 1195  freeHullAtPier() [1]  ≈ return freeAtPier().some(function(s){ return !s.mutiny&&!s.crewWait&&!s.job }) }
 1197  offLine() [1]  a hull that is on no line: free at the pier, or flying home after it set settlers down
 1198  closeAll() [1]  ≈ U.win=null; U.tab=null; U.pop=null; return {} }
 1200  var TMSG  the rules: where she points, how, and what the press must be
 1236  hullWorld(sid) [1]  ≈ var s=shipById(G,sid); if(!s) return; var w=s.from||(s.pend&&s.pend.from)||forWorld(s)||(s
 1238  var NAR  the story: Claude's clean copy 15.10 (awaits Nikita), texts in the sheet; V — her voice (the launch, N-01, gav
 1249  var STEPS  twelve steps, one after another; the windows and the numbers a rule needs are taken when it is shown (pre), no
 1263  stepReady(i) [1]  ≈ var s=STEPS[i]; if(!s) return false; return s.when()||(!!s.soft&&stepReady(i+1)) }
 1264  var STEP_SAFE  ≈ 8; // HANDOFF: no hull is lost before the advisor step (G.safe)
 1265  tutOpen(keys) [3]  ≈ var t=U.tut; if(!t.lock) return;
 1268  tutOpenAll() [1]  ≈ var t=U.tut; OPEN_ALL.forEach(function(k){ t.open[k]=1 }); t.fresh={}; ['metal','fuel','pa
 1269  tutPush(id,p) [2]  ≈ var t=U.tut; if(TMSG[id]&&!t.help) return; if(NAR[id]&&!TUTX.story) return;
 1271  tutStep(i) [1]  ≈ var t=U.tut, s=STEPS[i]; t.step=i; tutOpen(s.opens); if(s.go) s.go(); s.q.forEach(function
 1272  evOn() [1]  v4.40: a soft step opened early has no sector to name — N07 said «Space over flows…»
 1273  partsHome() [1]  ≈ return (G.delivered.parts||0)>0||G.earth.parts>0 }
 1275  tutNew() [2]  a new game: step 1 (the main menu and its terminal come before it)
 1278  tutQuiet() [6]  a run already under way (an old save, or the helper turned on in the middle): what has happened is not told ag
 1284  tutLog() [7]  ≈ var t=U.tut, mx=t.seq;
 1291  tutJit() [14]  ≈ var t=U.tut, w=U.win, quiet=!t.msg&&!t.nar&&!t.q.length;
 1305  tutBusy() [1]  ≈ return modal() }
 1306  tutNext() [4]  ≈ var t=U.tut; if(t.msg||t.nar||!U.langPicked||G.over) return;
 1310  msgShow(it) [3]  ≈ var t=U.tut, m=TMSG[it.id]; U.pop=null; var p=m.pre?m.pre():{}; if(p===null) return false;
 1313  msgDone() [1]  ≈ var t=U.tut; if(!t.msg) return; t.msg=null; draw() }
 1314  var NART  ≈ null;
 1315  narShow(it) [4]  ≈ var t=U.tut, N=NAR[it.id], p=it.p||(N.pre?N.pre():{}); if(p===null) return false;
 1319  narDone() [1]  ≈ clearTimeout(NART); if(!U.tut.nar) return; U.tut.nar=null; draw() }
 1321  tutOff() [2]  SKIP THE HELPER (first message) and ≡ Helper off: everything opens at once; the story goes on
 1323  tutOn() [1]  ≈ var t=U.tut; if(t.help) return; t.help=true; tutQuiet(); act(G,'helper',{on:true}) }
 1324  tutTick() [7]  ≈ var t=U.tut; if(!U.langPicked||G.over) return;
 1331  tutHold() [1]  ≈ var t=U.tut; return !!t.msg||!!(t.nar&&t.nar.hold) }
 1333  tutTarget(m) [3]  the press: a rule lets through only its lit thing; her voice closes on any press
 1336  tutClick(ev) [11]  ≈ var t=U.tut, x=ev.target;
 1347  tutKey(e) [7]  ≈ var t=U.tut;
 1355  tutAct(a,v,res) [3]  after a press went through: a 'do' is done when its press succeeded, a 'see' on any press; a tab loses its dot
 1359  tutPlace() [21]  the dark with a cut-out (+6 px, one or two pieces), the yellow ring, the helper over the map — or over the tar
 1380  tutLive(e) [1]  ≈ if(e.getAttribute('aria-disabled')==='true') return false; if(!e.querySelector('[data-act]
 1381  narPlace() [6]  ≈ var n=U.tut.nar, V=el('voice');
 1388  alx(s) [2]  Alexandra's line under the Institute's in a big window; her face — by the key whose text it is (the callers pa
 1393  var FACE  her face (Nikita 04.11, design/ALEXANDRA-FACES.md): the pose by the key of her line — the last line with a pos
 1395  faceOf(keys) [1]  ≈ var f='talk'; keys.forEach(function(k){ if(FACE[k]) f=FACE[k] }); return f }
 1396  faceCls(f) [1]  ≈ return f==='full'?'hav afull':'hav fc fc-'+f }
 1397  icap(right) [1]  ≈ return '<div class="icap">'+esc(T('tut_inst'))+'<span>'+esc(right)+'</span></div>' }
 1399  var TUT_KEEP  in the save: what is open and what was said; the queue is not kept — what the current step has not said yet is
 1400  tutSave() [3]  ≈ var t=U.tut, o={}; TUT_KEEP.forEach(function(k){ if(t[k]!==undefined) o[k]=t[k] });
 1403  tutLoad(o) [5]  a save from before v4.36: everything open, no helper, the story goes on from here
 1408  tutState() [1]  ≈ var t=U.tut; return {lock:t.lock,help:t.help,step:t.step,msg:t.msg&&t.msg.id,mode:t.msg&&t

 1410  ## RENDER
 1411  appZoom() [1]  ≈ return +(el('app').dataset.z||1) }
 1412  drawSide() [3]  v4.42: the chart gives way to the panel instead of hiding under it
 1415  drawWin() [3]  ≈ var w=U.win, h='';
 1418  drawPop() [4]  ≈ var p=U.pop, h='', cls='';
 1422  focusFix() [4]  ≈ var now=Date.now();
 1427  var NIGHT_FX  Nikita, 02.11: «хочется ближе к концу накала» — static and dark over the map for the last NIGHT_FX years, grow
 1428  drawNightFx() [4]  ≈ var e=el('mapbox'); if(!e) return; var left=G.night&&can('night')?nightLeft(G):Infinity, o
 1432  draw() [6]  ≈ if(!G) return;

 1439  ## HULLS: WHERE EACH ONE IS, IN ONE LINE
 1440  hullSt(s) [22]  ≈ var wl=forWorld(s);
 1462  stRow(s,noT) [3]  v5.14: the world card drops « · N years»
 1465  hullRow(s,acts,id,noT) [2]  ≈ var g=hullGen(s);
 1469  pctUp(a,b) [1]  Nikita, 12.11 (F-feedback 11.11, «поколение выше летит чуть быстрее»): no speed number — a percent against the
 1470  specIcons(h) [2]  ≈ var pv=h.gen>0;
 1472  hullCost(h) [1]  ≈ return {metal:h.metal,fuel:h.fuel,parts:h.parts||0,people:h.crew||0} }
 1473  clsSeen(cls) [1]  v4.36: a hull that costs parts shows up once parts are open

 1475  ## THE WORLD WINDOW
 1476  stepOrder(pid) [3]  ≈ var col=!!G.colonies[pid];
 1479  openWorld(pid,focus) [4]  v4.38: the advisor names a hull — open the tab she is on and light her
 1483  var FOCUS  ≈ {evac:'#ovl [data-act="evac"]',add:'#addblk',lift:'#rw-lift',ord:'#ordblk',mach:'#mach'};
 1484  var KW  ≈ {mine:'u_kMine',farm:'u_kFarm',well:'u_kWell',works:'u_kWorks'};
 1485  wsub(p,extra) [1]  ≈ return esc((T(KW[p.kind])+' · '+fill(T('u_ringN'),{n:p.sec+1})+(extra?' · '+extra:'')).toU
 1486  sendFuel(p) [1]  ≈ return Math.max(1,Math.round(p.dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(G)))) }
 1487  lobeTxt(p) [1]  ≈ var lb=lobeOf(p.ang), ev=lobeEvents(G,lb); return T('lobe'+lb).toUpperCase()+' · '+(ev.len
 1488  assignable(pid) [2]  ≈ var p=planet(pid);
 1491  pickCourier(pid) [7]  v4.18: the free courier that can lift everyone and gets there first; else the biggest one; v4.33: none that wo
 1498  evacGoing(pid) [1]  ≈ return G.ships.some(function(o){ return o.job==='evac'&&o.dest===pid&&o.mode==='transit' }
 1499  evacW(pid) [1]  ≈ var nh=nextHome(G,pid,'courier'); if(nh&&nh.t<=0) return fill(T('u_evacW_line'),{n:nh.id})
 1500  evacBlock(p) [8]  ≈ var c=G.colonies[p.id];
 1508  liftRow(p) [3]  v5.14 (Nikita 11.11): no «· N years», the colour warns
 1512  var HUB_RES  nodes-1.01 (Nikita 05.11): the hub — build one here, or send this world's goods to one; on a hub, its depot an
 1513  hubCapP() [1]  ≈ return {m:hubCap(G),g:roman((G.gen||0)+1)} }
 1514  hubBlock(p,c,deadW) [14]  ≈ if(p.kind==='works') return '';
 1529  viaSeg(p,c) [6]  v5.17 (Nikita 12.11: «доставка куда земля или хаб была во вкладке линии, а то не ясно куда и как перевести суд
 1536  lineWhyP(code) [1]  nodes-1.01: a hull a line will not take says why — the courier limit, a hub's run to Earth, a hub too far for 
 1537  lineWhyShort(code) [1]  ≈ return code==='range'?T('u_outReach'):fill(T('u_lw_'+code),lineWhyP(code)) }
 1538  machines(p,c) [13]  before the Gen III yards the block is only noise
 1554  pkgCard(p,c,kc,kr,hold) [11]  v5.13 (Nikita 11.11: «ярусы надо поменять на upgrade package, который показывает, сколько он даст сверху и ско
 1565  winWorld(pid) [83]  ≈ var p=planet(pid), c=G.colonies[pid], st=wst(pid), L0='', R='';
 1649  seamShort(pid) [1]  v4.10 (Nikita, 27.09: 'слишком много непонятных цифр'): the seam is told in years at the current pace
 1650  seamLeft(pid) [3]  ≈ var res=G.reserves[pid], c=G.colonies[pid], p=planet(pid);
 1654  picker() [8]  the hull picker: send a free hull, or move one off its line; closed by «keep it where it is» or a press beside
 1664  genPick(cls,pid) [4]  Nikita, 26.10 («мочь строить предыдущее поколение») and F-56: both generations are named with their parts, the
 1668  genSeg(cls,g) [2]  ≈ if(g.prev===null) return ''; var b=function(i){ var h=HULLS[i]; return '<button type="butt
 1671  olderWhy(cls,hi) [2]  v4.42: under a card that offers the generation before — why: the current one wants parts Earth has not got

 1673  ## YARD: WHAT IS BEING BUILT, A FREE HULL OF THE CURRENT GENERATION, THE PIER
 1675  winYard() [18]  v4.49 (Claude's playtest 04.11): the order cards come first — under the list of what is building they slid dow

 1694  ## FLEET: EVERY HULL AND WHERE IT IS (NO PAUSE)
 1695  sideFleet() [12]  ≈ var all=G.ships.filter(function(s){ return s.mode!=='dead' });
 1707  searchFuel(m) [1]  ≈ var w=m.dest&&m.dest!=='earth'?m.dest:(m.origin&&m.origin!=='earth'?m.origin:m.target), p=
 1708  bestSearch(m) [2]  ≈ var where=m.dest&&m.dest!=='earth'?m.dest:(m.origin&&m.origin!=='earth'?m.origin:m.target)

 1711  ## WORLDS: THE LIST, WORST FIRST
 1712  var SEV  ≈ {dead:0,cut:1,starve:2,noline:3,half:4,dry:5,ok:6,settling:7,free:8};
 1713  sideWorlds() [8]  ≈ var list=PLANETS.filter(function(p){ return secVis(p.sec)&&!(G.ghost&&G.ghost[p.id]) }).ma

 1722  ## TECH: THE HULL GENERATION (THE DRIVE PROGRAMME), THE NEXT GENERATION'S SPECS, THE RINGS
 1725  steps(n,of,col) [3]  BRIEF: the rule of the drive does not change — the gate is worlds ever settled (4 + 4·l), the programme runs a
 1728  worksList() [1]  ≈ return Object.keys(G.colonies).filter(function(k){ return planet(k).kind==='works' }) }
 1730  driveHost() [2]  v5.17 (Nikita 12.11: «зачем выбирать, если автоматически это происходит») — no «Run the programme at»: the wor
 1732  startDriveWhy(pid) [4]  ≈ if(G.drive) return 'running';
 1737  driveHelpOn() [1]  Nikita, 26.10: «непонятно что за программа двигателя» — a note that opens and closes any time; the choice stay
 1738  driveHelp(work) [2]  ≈ return '<div class="dhelp"><p>'+esc(T('u_dh1'))+'</p><p>'+esc(T('u_dh2'))+'</p><p>'+esc(fi
 1742  techGains(g,lvl) [7]  v5.16 (Nikita 12.11, draft A of design/tech/tabs.html): Tech on three tabs — OVERVIEW (the programme, what the
 1749  sideTech() [36]  ≈ var g=G.gen||0, lvl=G.driveLvl||0, s=settledCount(G), need=driveReachFor(G), work=driveWor

 1786  ## ARK: THE NIGHT, THE CAPSULE RINGS, THE CONVOY, THE VERDICT
 1788  arkDriveTxt() [6]  ≈ if(arkReady(G)) return [fill(T('u_arkReady'),{g:roman(G.arkMark)}),C.food];
 1795  homeList() [1]  Nikita, 02.11 (35 presses at the end of run 221175121): every hull on a line, in one press — the same two orde
 1797  pierOut() [1]  the hulls at the pier that are not in the convoy yet
 1802  var HIVE_D  v5.10 (design/ARK.md 2g p. 5, drafts design/ark-menu hex-F1/F2/F3 — one window in three states: at rest, the c
 1803  hivePts(cx,cy,r) [1]  ≈ var a=[]; for(var i=0;i<6;i++){ var t=Math.PI/3*i; a.push((cx+r*Math.cos(t)).toFixed(1)+',
 1804  hiveRings() [1]  ≈ var need=1, ab=arkBoard(G); while(arkCaps(need)<ab&&need<12) need++; return Math.max(need,
 1805  hiveSvg(sel) [15]  ≈ var rg=arkRings(G), paid=arkPaid(G), N=hiveRings(), rc=Math.max(6,N+2), r=19*6/rc, cx=262,
 1820  hiveLg(cls,key) [1]  ≈ return '<span><svg width="16" height="14" viewBox="0 0 16 14"><polygon class="hx '+cls+'" 
 1821  winArk() [25]  ≈ if(!G.night) return '<div class="win sm">'+head(esc(T('u_tabArk').toUpperCase()),esc(T('u_

 1847  ## THE ADVISOR: WORLDS ONLY, WORST FIRST (NIKITA 15.10: «НЕ ПОНИМАЮ, ЧТО ДЕЛАТЬ»)
 1853  var QUIET_YEARS  v4.50 (Nikita 05.11, «Да»): a mine, farm or well with no line is grey and out of the count while Earth's stock
 1854  quietDep(p,dep) [2]  no trend yet (first years, after a load): Earth's own burn alone
 1856  advRows() [22]  v4.38: a hull named for one line is not offered to the next
 1880  lineFix(pid,used) [5]  v4.38 (Nikita, 19.10, option A): the one fix for a line that falls behind — a free hull, a spare one off anoth
 1886  var ADV_T  Nikita, 02.11 («всё сливается и глазу тяжело»): five kinds, each with its own mark and colour; the worst kind 
 1887  popAdv() [5]  v4.50: a group of grey rows is grey, its count is the top bar's.filter(function(g){ return g.rows.length }).so
 1892  popMenu() [8]  ≈ return '<div class="menu"><button type="button" data-act="sfx">'+ic('speed',15)+esc(T('u_m

 1901  ## THE MAIN MENU (WORK/MENU.JS, V4.40): IN FRONT OF A NEW RUN WHOSE CLOCK STANDS; ITS TERMINAL TELLS THE START
 1904  menuLang() [1]  v5.05 (Nikita 06.11: «удали смену языка в игре, пусть интерфейс будет только на английском»): the game speaks 
 1905  menuOpen() [11]  ≈ U.menu=true; draw();

 1917  ## SAVE AND LOAD: A FILE, AND THE LAST AUTOSAVE IN THIS BROWSER
 1918  var SAVE_KEY  ≈ 'lb.save';
 1919  dump() [2]  ≈ return JSON.stringify({v:1,G:G,SECTORS:SECTORS,PLANETS:PLANETS,HULLS:HULLS,U:{hist:U.hist,
 1921  undump(t) [9]  ≈ var o=JSON.parse(t,function(k,v){ return v==='__inf'?Infinity:(v==='__-inf'?-Infinity:v) }
 1930  autosave() [1]  ≈ try{ localStorage.setItem(SAVE_KEY,dump()) }catch(e){} }
 1931  loadAuto() [2]  ≈ var t0=null; try{ t0=localStorage.getItem(SAVE_KEY) }catch(e){} if(!t0) return false;
 1933  saveFile() [2]  ≈ var data=dump(), name='last-berth-'+G.seed+'-y'+G.day+'.json';

 1939  ## RUN LOG
 1940  showLog() [1]  ≈ act(G,'export',{}); el('logtxt').value=exportLog(G); el('loghead').textContent=T('runLog')
 1942  saveLog() [5]  v4.11 (Nikita, 28.09: 'экспорт JSON-файла'): the page asks the viewer to save the file; where the runtime is a
 1947  copyLog() [3]  ≈ var ta=el('logtxt'); ta.focus(); ta.select(); var done=false;

 1953  ## PRESSES
 1955  var lineWhy  v4.35 (reviewer): setLine puts the hull on the line and then sails it — no fuel or crew keeps her at the pier 
 1956  lineRes(res,sid,pid) [1]  ≈ var s=shipById(G,sid); if((res==='fuel'||res==='crew')&&s&&s.from===pid){ lineWhy[sid]=res
 1957  lineWait(sid) [1]  ≈ return lineWhy[sid]?whyText(lineWhy[sid]):'' }
 1958  resLeft(sid) [1]  ≈ toast(esc(fill(T('u_resLeft'),{n:sid})),'warn',6000,false) }
 1959  doAct(a,b) [76]  ≈ var d=b.dataset, res=null, okc=null, okp=null, v=d.v;

 2068  ## THE MAP TURNS, MOVES AND ZOOMS (V5.05): DRAG = TURN, RIGHT DRAG / SHIFT / TWO FINGERS = MOVE, WHEEL / PINCH = ZOOM
 2092  var UI_STEPS  desktop first (Nikita 16.10): below 1180×700 the whole desk is scaled down, nothing reflows.
 2093  uiScale() [1]  ≈ if(U.uiScale===undefined){ U.uiScale=1; try{ var v=+localStorage.getItem('lb.uiScale'); if
 2094  uiScaleNext() [2]  ≈ var i=UI_STEPS.indexOf(uiScale()); U.uiScale=UI_STEPS[(i+1)%UI_STEPS.length];
 2096  fit() [3]  ≈ var a=el('app'), w=window.innerWidth, h=window.innerHeight, zmax=Math.min(w/1180,h/700),

 2101  ## LOOP
 2103  var MS  v4.31 (Nikita, 13.10, F-45: '4x too fast'): 1x 1.5 s, 2x 1.0 s, 4x 0.6 s, 10x 0.2 s a year
 2106  clockOn(from) [1]  v4.46: the run's clock (G.clock, see clockOut in core.js) — starts at the New Game press, saved with the run. 
 2107  clockTick(dt) [2]  ≈ var c=G&&G.clock; if(!c||G.over||document.hidden) return; dt=Math.min(dt,1000); c.ms+=dt;
 2110  m3frame(ts) [1]  v5.05: the 3D chart turns its spheres and sends its wave between the years, 20 a second; v5.07: at once when t
 2111  frame(ts) [25]  ≈ if(!U.last) U.last=ts;
 2137  tutMute() [1]  everything open, no voices, no helper: the scenarios' hook and the menu's Test play
 2138  start(seed) [11]  a new game: the helper and the voices again (Test play muted only its own run)
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

