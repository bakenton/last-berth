# MAP — оглавление core.js / ui.js

Сгенерировано `python3 tools/map.py > MAP.md` после каждой правки кода. Не править руками.
Навигация: `grep -n <имя> MAP.md` → `sed -n "<строка-40>,<строка+40>p" work/<файл>`. Код целиком не открывать.
Формат: `строка  имя(аргументы) [длина]  назначение`. «≈ …» = комментария нет, показано начало кода.

## core.js (1626 строк)

```
    3  mulberry32(a) [1]  LONG NIGHT — core simulation. No DOM. Pure state + pure-ish mutators.

    5  ## THE CHART BUILDS ITSELF
    9  var SECTORS  ≈ [];
   10  var PLANETS  ≈ [];
   12  var LOBES  v4.21 (F-21): the chart is cut into six lobes of 60 degrees, the sides of the world. Lobe 0 is centred on twel
   13  lobeOf(ang) [1]  ≈ var a=((ang+LOBE_ARC*2)%(Math.PI*2)+Math.PI*2)%(Math.PI*2); return Math.floor(a/LOBE_ARC)%
   14  lobeEdge(i) [1]  ≈ return -LOBE_ARC*2+i*LOBE_ARC }
   15  lobeMid(i) [1]  ≈ return -Math.PI/2+i*LOBE_ARC }
   19  var RING_NAMES  v4.21 (Nikita, 06.10): rings carry a number and the name of an Italian figure — generals, artists, politicians
   20  var W_NAMES  ≈ ['Tallow','Brine','Cinder','Marrow','Solace','Vesper','Gallows','Ferrous','Hollow','Threno
   24  var DESIGS  ≈ ['LV','HD','NR','KX','QT','ZD','BC','GR','TS','WN','PX','MV','AR','EL','SH','UM'];
   26  secName(i) [1]  ≈ var n=RING_NAMES.length, cyc=Math.floor(i/n), nm=RING_NAMES[i%n].toUpperCase(); return (i+
   27  secRadius(i) [1]  ≈ return 170+i*88 }
   31  genSector(rnd,i) [20]  every sector gets one of each trade, so the player is never starved of fuel
   53  openSector(G) [17]  Appends one more sector to the chart. Called at world-gen and on every survey.
   72  surveyCost(n) [7]  what it costs to push the chart one sector further out
   82  canSurvey(G) [10]  v3.2: the chart is no longer bounded by what the fleet can reach. You may
   92  survey(G) [13]  ≈ var chk=canSurvey(G); if(chk!=='ok') return chk;

  106  ## HULL GENERATIONS
  116  var HULL_BASE  v4.5 (Nikita, 26.09, run 768210301: 'курьеры 5–6 поколений имбовые, тягачи и грузовозы бессмысленны'):
  121  var HULLS  ≈ [];
  122  genHull(gen,j) [12]  ≈ var b=HULL_BASE[j], g=gen;
  134  ensureGen(gen) [1]  ≈ while(HULLS.length<(gen+1)*3){ var g=Math.floor(HULLS.length/3); for(var j=0;j<3;j++) HULL

  135  ## RANGE
  145  var CLASS_RANGE  ≈ {courier:1, hauler:2, freighter:3};
  146  classRange(key,gen) [1]  ≈ return (CLASS_RANGE[key]||1)+gen }
  147  hullRange(h) [1]  ≈ return h? classRange(h.key,h.gen||0) : 0 }
  149  sectorLimit(gen) [1]  the furthest sector ANY hull of this generation can fly to (the freighter)
  150  hullGen(s) [1]  ≈ return (HULLS[s.hull]&&HULLS[s.hull].gen)||0 }
  151  shipRange(s) [1]  ≈ return hullRange(HULLS[s.hull]) }
  152  canReachSector(s,sec) [1]  ≈ return sec<=shipRange(s) }
  154  classFor(sec,gen) [5]  cheapest class that can serve a sector at this generation; null = nothing can
  160  genForSector(sec) [1]  generation needed before any hull can reach this sector
  162  var K  ≈ {
  310  planet(id) [1]  ≈ for(var i=0;i<PLANETS.length;i++)if(PLANETS[i].id===id)return PLANETS[i];return null}
  313  popCap(p) [1]  how many people a world can hold, and how many it wants before it digs at full rate
  314  popWant(p) [1]  ≈ return popCap(p) }

  315  ## V4.4: EXTRACTION KITS
  316  kitTier(c) [1]  ≈ return (c&&c.tier)||0 }
  317  kitLive(c) [1]  machines standing = no multiplier
  318  rateMult(c) [1]  ≈ return kitLive(c)? Math.pow(K.KIT_OUT,kitTier(c)) : 1 }
  321  storeCap(c) [1]  v4.5 (Nikita, 26.09: 'не хочу, чтобы ресурсы сгорали'): a world's stockyard has no ceiling. What the
  322  kitBurn(c) [1]  ≈ return K.KIT_FUEL*kitTier(c) }
  324  kitGain(G,pid) [3]  v4.31 (Nikita, 13.10, F-37): what the next kit does to this world in numbers — output a year now and with it, 
  327  kitCost(c) [2]  ≈ var t=kitTier(c)+1, m=Math.round(K.KIT_METAL*Math.pow(K.KIT_GROW,t-1)), p=Math.round(K.KIT
  329  kitOpen(G) [1]  ≈ return (G.driveLvl||0)>=K.KIT_GATE_DRIVE }
  331  lineHold(G,pid) [2]  the biggest hold on this world's line; 0 if nothing runs there
  333  canKit(G,pid) [10]  ≈ var c=G.colonies[pid]; if(!c) return 'nocolony';
  343  orderKit(G,pid) [8]  ≈ var r=canKit(G,pid); if(r!=='ok') return r;
  352  feedRates(G,node) [6]  what a world burns per year that Earth has to send it: works eat metal and rations, kits eat fuel
  361  fedMult(G) [1]  Earth's own output rides on the people left at home — but only so far.
  362  handsRate(G) [1]  v4.7: Earth empties
  363  earthOutput(G) [4]  ≈ var h=Math.max(0,G.earth.people-K.EARTH_CREW);
  368  crewOut(G) [1]  hands currently riding hulls rather than working at home
  371  crewAway(G) [1]  v3.9.1 (log 519788167: 1562 hands sat on hulls idle at Earth and were counted as left behind): a crew
  372  crewDocked(G) [1]  ≈ return crewOut(G)-crewAway(G) }
  378  earthNeed(G) [7]  G.earth.people is the pool of hands Earth can still put on a ship, not the
  388  openRes(G,res) [1]  v4.34 (Nikita, 15.10: 'игрок должен всё получать постепенно', option B): a resource is open from the day the p
  389  isOpen(G,res) [1]  a save from before v4.34 has every resource open
  390  burnAge(G,res) [1]  ≈ return 1+Math.max(0,G.day-((G.opened&&G.opened[res])||0))/K.APPETITE }
  391  openPaid(G,c) [1]  ≈ for(var r in c){ if(r!=='people'&&r!=='food'&&(c[r]||0)>0) openRes(G,r) } }
  394  pulseDrain(G,res) [4]  v4.20: what Earth takes a year while a crisis runs — at least the doubled burn, and PULSE_SHARE of what the em
  404  lobeCount(G,lobe) [1]  v4.21 (Nikita, 06.10, F-21): the director. Events come in three families, each told before it happens:
  405  lobeEvents(G,lobe) [1]  ≈ var out=[]; var E=(G.dir&&G.dir.ev)||[]; for(var i=0;i<E.length;i++) if(E[i].lobe===lobe) 
  406  activeCrisis(G) [1]  ≈ var E=(G.dir&&G.dir.ev)||[]; for(var i=0;i<E.length;i++) if((E[i].type==='crisis'||E[i].ty
  408  shipSpeed(G,s) [7]  how fast a hull moves right now: set by the lobe of the world at the other end of its trip
  415  stormAt(G,node) [5]  ≈ if(!node||node==='earth') return false; var p=planet(node); if(!p) return false;
  420  directorStep(G) [41]  ≈ var D=G.dir; if(!D) D=G.dir={next:K.DIR_FIRST,ev:[],n:0,seq:1};
  462  driveSpeed(G) [1]  crossings and signal lag both shrink with every drive mark earned
  463  driveWorkFor(G) [1]  ≈ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,G.driveLvl||0)) }
  464  driveReachFor(G) [1]  ≈ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*(G.driveLvl||0) }
  466  newGame(seed) [19]  ≈ seed = seed||((Math.random()*1e9)|0);
  487  reach(G) [1]  reach = live settlements. The relay used to add +2; it is gone (Nikita, 23.09: orders no longer carry anything
  492  settledCount(G) [1]  v4.15 (Nikita, 04.10): the gates on PROGRESS — charting a sector, each drive mark — count worlds EVER settled,
  493  sectorOpen(G,s) [1]  ≈ return s<SECTORS.length}
  494  travelDays(G,dist,ship) [4]  ≈ var sp=(ship&&HULLS[ship.hull]&&HULLS[ship.hull].speed)||1;
  498  legDays(G,a,b,ship) [1]  ≈ return travelDays(G,legDist(a,b),ship) }
  499  legDist(a,b) [9]  ≈ if(a===b) return 0;
  509  needsOf(G,node) [7]  ≈ if(node==='earth') return null;
  516  exportsOf(G,node) [4]  ≈ if(node==='earth') return ['metal','food'];
  520  loadAt(G,s,node) [60]  v4.4: cargo.kit rides alongside
  580  unload(G,s,node) [24]  ≈ var any=s.cargo.metal+s.cargo.food+s.cargo.fuel+s.cargo.parts+s.cargo.people;
  604  temper(G,s) [1]  ≈ var h=((s.id*2654435761)^(G.seed|0))>>>0; return K.MUTINY_SPREAD*((h%1000)/1000) }
  606  mutinyDue(G,s,round) [1]  would this crew refuse the run that starts here? (the desk can ask the same question)
  609  mutinyForecast(G) [7]  v4.27: the first crew that will refuse, by the same count the crews make — year, line, and the rations Earth
  619  lastLift(G,pid) [13]  v4.33 (Nikita, 13.10: 'не устраивает ощущение, что людей бросают… те люди на планетах обречены, ничего не сдел
  637  foodForecast(G) [17]  v4.28 (F-11, Nikita 08.10: the quiet famine — farms ran dry 440 years before the end and the larder warning ca
  656  foodShort(G) [1]  short = the rations run out inside FOOD_HORIZON years. ('Not reaching the Night' was tried and dropped: once t
  657  sail(G,s) [28]  ≈ var here=s.at, dest = here===s.from ? s.to : s.from;
  687  var CHRON  chronicle lines never roll off the cap: the log forgets traffic, not history
  688  log(G,code,d) [2]  ≈ G.logSeq=(G.logSeq||0)+1;G.log.push({day:G.day,code:code,d:d||{},seq:G.logSeq});
  691  act(G,kind,d,res) [1]  player actions, kept whole for post-run analysis (exported from the UI)
  692  snap(G) [14]  ≈ var E=G.earth, cols=0, pop=0, dry=0;
  707  exportLog(G) [12]  v4.4 (Nikita, 25.09): the run log is JSON — the designer reads it with a script, not with his eyes
  719  exportLogText(G) [27]  ≈ var L=[]; L.push('LAST BERTH run log · seed '+G.seed+' · year '+G.day+(G.over?' · '+G.over

  747  ## ACTIONS
  749  buildShip(G,hullId) [15]  ≈ var h=HULLS[hullId]; if(!h) return 'locked';
  768  scrapValue(h) [1]  scrapping: an idle hull at Earth comes apart for part of what it cost.
  769  scrap(G,shipId) [13]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  782  shipById(G,id) [1]  ≈ for(var i=0;i<G.ships.length;i++)if(G.ships[i].id===id)return G.ships[i];return null}
  784  canDepart(G,s,pid) [12]  ≈ var p=planet(pid);
  797  launch(G,s,pid,job,cargo) [11]  ≈ var p=planet(pid);
  810  nextHome(G,pid,cls) [5]  v4.14: when no free hull at Earth can lift a world — the nearest rated hull on its way home, or null
  815  enRoute(G,pid) [1]  ≈ for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='transit'&&o.job==='colon
  816  foundParty(G,s,pid) [1]  ≈ return Math.max(0,Math.floor(Math.min(popCap(planet(pid)), s.cap, G.earth.people-K.EARTH_K
  817  colonize(G,shipId,pid,people,food) [17]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  838  setLine(G,shipId,from,to) [17]  A line is always world <-> Earth. Only Earth consumes, so a leg between two
  858  clearLine(G,shipId) [1]  v3.8.1 (log 57539013, tester: "нельзя было снять судно"): a line ordered while the hull was in transit
  861  moveLine(G,shipId,pid) [16]  v4.31 (Nikita, 13.10, F-36): 'move to → world' under a hull of the line panel — off its line and onto the othe

  877  ## V4.34: LINES ARE MANNED BY HAND (NIKITA, 14–15.10)
  881  var CLASSES  ≈ ['courier','hauler','freighter'];
  882  pileLeft(G,pid) [1]  v4.11: what is still on the surface
  883  shipClass(s) [1]  ≈ return HULLS[s.hull]?HULLS[s.hull].key:'courier' }
  884  onLine(G,pid) [2]  ≈ var out=[]; for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='dead') conti
  886  lineCount(G,pid,cls) [1]  ≈ var n=0, ships=onLine(G,pid); for(var i=0;i<ships.length;i++){ if(shipClass(ships[i])===cl
  888  hullAt(cls,gen) [1]  the hull of a given generation. v4.31 (Nikita, 13.10, F-36): an order always takes the current generation
  889  currentHull(G,cls) [1]  ≈ var best=null; for(var i=0;i<HULLS.length;i++){ var h=HULLS[i]; if(h.key!==cls) continue; 
  891  orderCheck(G,pid,cls) [14]  why a new hull of this class cannot be ordered for this line right now; 'ok' when it can
  906  orderFor(G,pid,cls) [7]  order a new hull of the current generation for this line: paid now, she takes the line when she leaves the yar
  914  upgradeSave(G) [6]  v4.34: a save from before manual lines — the standing orders are dropped, the hulls on the lines stay where th
  920  setAuto(G,shipId,pid) [1]  ≈ return setLine(G,shipId,'earth',pid) }
  921  setAutoOld(G,shipId,pid) [7]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  928  setPolicy(G,shipId,pid,deliver,collect) [11]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  939  setRoute(G,shipId,pid,out,take) [13]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  952  dispatch(G,shipId,pid,out,take) [6]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  958  repeatRun(G,shipId) [6]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  964  clearRoute(G,shipId) [1]  ≈ var s=shipById(G,shipId);if(s)s.route=null;return 'ok'}
  966  runRoute(G,s) [6]  ≈ var pid=s.route; if(!pid) return 'noroute';
  975  abandon(G,shipId,pid) [12]  v4.18 (Nikita, 04.10): only a courier lifts a settlement
  989  search(G,shipId,missId) [12]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
 1005  startDrive(G,pid) [16]  the drive programme is repeatable: every mark cuts crossings and signal lag
 1021  driveDone(G,pid) [7]  ≈ G.driveWork=0; G.drive=null; G.driveLvl=(G.driveLvl||0)+1;
 1028  researchHyper(G) [1]  ≈ return 'notworks' }

 1030  ## THE LONG NIGHT AND THE ARK
 1031  revealNight(G) [6]  ≈ if(G.night) return;

 1037  ## V4.0: THE SECOND DATE
 1038  workAt(l) [1]  ≈ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,l)) }
 1039  reachAt(l) [1]  ≈ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*l }
 1040  arkReady(G) [1]  ≈ return G.arkMark!==null&&G.arkMark!==undefined&&(G.driveLvl||0)>=G.arkMark }
 1042  arkWake(G) [1]  share of the sleepers who wake at the other end, on the drive you have now (0 = the ark cannot sail)
 1043  wakeAt(G,l) [1]  ≈ if(G.arkMark===null||l<G.arkMark) return 0; return K.ARK_WAKE[Math.min(K.ARK_WAKE.length-1
 1047  driveForecast(G,target) [17]  when the drive reaches generation index `target` at the pace the works keep now.
 1064  nightLeft(G) [1]  ≈ return G.night? Math.max(0,G.night-G.day) : null }
 1065  var ARK_RES  ≈ ['metal','parts','food','fuel'];
 1066  arkPrice(l) [1]  ≈ var L=K.ARK_LEVELS[l-1]; return L?{metal:L.metal,parts:L.parts,food:L.food,fuel:L.fuel}:nu
 1068  arkLevel(G) [5]  the highest level whose whole price has been paid in (credit, at full price)
 1074  arkOwed(G,l) [1]  what is still owed on the way to level l, at full price
 1075  arkCap(l) [1]  ≈ var L=K.ARK_LEVELS[l-1]; return L?L.cap:{metal:0,parts:0,food:0,fuel:0} }
 1077  arkCheck(G,l) [5]  v4.29: a level is bought in one go (what is still owed on the way to it, at full price). 'ok' or why
 1082  arkBuy(G,l) [7]  ≈ var w=arkCheck(G,l); if(w!=='ok') return w;
 1091  convoyGen(G) [1]  v4.29: the convoy — hulls docked at Earth, of the ark drive's generation or ARK_CONVOY_BELOW under it. The ark
 1092  convoyHull(G,s) [1]  v4.31 (F-35): a mutinied crew refuses to fly, not to board — the hull counts
 1093  arkConvoy(G) [5]  ≈ var need=K.ARK_CONVOY, have={courier:0,hauler:0,freighter:0}, ok=true, k;
 1100  setReserve(G,shipId,on) [5]  v4.29: a hull set aside for the ark — the yards neither break it up for idling nor take it for a line; a line 
 1106  arkSouls(G) [1]  who would sail if the ark left today: everyone at home and at the pier, if a level has been paid in
 1108  arkCargo(G) [1]  what rides along: what is left on Earth, up to the cap of the level
 1109  leftBehind(G) [5]  ≈ var col=0; for(var k in G.colonies) col+=G.colonies[k].pop;

 1115  ## THE CHRONICLE
 1117  chronShift(G,cols) [38]  ≈ var E=G.earth, idle=0;

 1156  ## TICK
 1158  lineRate(G,pid) [23]  ≈ var p=planet(pid), c=G.colonies[pid]; if(!c) return null;

 1182  ## V4.38 (NIKITA, 19.10): THE LINE'S FIT — WHICH HULL TO ADD, WHICH ONE RUNS HALF EMPTY
 1186  var FIT_PILE  ≈ 120, // a surface pile this big is the line falling behind, and spare hulls are still clea
 1189  hullYield(G,pid,s) [1]  what one hull carries a year on this world's line, at her speed; a hull number or {hull:i} for one not yet bui
 1193  lineFit(G,pid) [8]  what the line must carry a year (the world's output, or what a works or a kit burns if that is more) against w
 1203  lineSpare(G,pid) [10]  the hulls this line can lose and still carry FIT_SPARE times what it must, the biggest first. None while the w
 1216  lineHelp(G,pid,opt) [18]  what to do about a line that falls behind: {kind:'free'|'move'|'build', sid|cls, add, gap}, or null when the h
 1235  tick(G) [253]  ≈ if(G.over) return;

 1489  ## THE ADVISOR: THE GAME DOES THE ARITHMETIC AND SAYS WHAT WANTS A DECISION
 1491  advice(G) [132]  ≈ var out=[], E=G.earth, i, k;
 1624  dismiss(G,key) [1]  ≈ G.dismissed[key]=G.day; return 'ok' }
 1625  undismissAll(G) [1]  ≈ G.dismissed={}; return 'ok' }
```

## ui.js (1555 строк)

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
   97  var KCOL  ≈ {mine:C.metal,farm:C.food,well:C.fuel,works:C.parts};
   99  var CLSCOL  v4.35 (Nikita 15.10, design/ships-v3 option B): hulls are the game's silhouettes, filled with the colour of th
  100  var EVCOL  ≈ {fold:'91,192,235',storm:'255,138,31'};

  102  ## ICONS (DESIGN/ICONS-V1.HTML, ACCEPTED 14.10)
  103  var ST  ≈ 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linec
  104  gp(d,x) [1]  ≈ return '<path d="'+d+'" '+(x||'')+' '+ST+'/>' }
  105  fp(d,x) [1]  ≈ return '<path d="'+d+'" '+(x||'')+' '+FL+'/>' }
  106  var I  ≈ {
  159  ic(k,sz,col) [1]  ≈ sz=sz||16; return '<svg class="ic" viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'"'+(co
  160  var RESI  ≈ {metal:'metalA',food:'foodA',fuel:'fuelA',parts:'partsA',people:'peopleA'};
  161  resIc(k,sz) [1]  ≈ return ic(RESI[k],sz||14,C[k]) }
  162  shipIc(cls,sz) [1]  ≈ sz=sz||34; return '<svg class="gi" viewBox="0 0 64 40" width="'+sz+'" height="'+(sz*40/64)
  163  var WMARK  ≈ {mine:'<circle r="6"/>',farm:'<rect x="-5.5" y="-5.5" width="11" height="11"/>',well:'<pat
  164  wmark(kind,on,sz) [2]  ≈ sz=sz||14; var m=WMARK[kind].replace('/>',on?' fill="currentColor"/>':' fill="none" stroke

  167  ## STATE
  170  var U  U.tut / can(key): the tutorial decides what the player may see; with its lock off everything is open.
  172  var G  ≈ null;
  173  can(k) [1]  ≈ return !U.tut.lock||!!U.tut.open[k] }
  174  T(k,p) [1]  ≈ var s=(L[U.lang][k]!==undefined?L[U.lang][k]:k); return fill(s,p) }
  175  var YRS  ≈ {en:['year','years','years'],ru:['год','года','лет']};
  176  yrs(n) [3]  ≈ n=Math.abs(Math.round(+n||0)); var a=YRS[U.lang]||YRS.en;
  179  fill(s,p) [3]  ≈ if(!p) return s; return String(s).replace(/\{(\w+)\}/g,function(_,k){
  182  el(id) [1]  ≈ return document.getElementById(id) }
  184  var HTMLCACHE  v4.8 (Nikita, 27.09: 'игра подтормаживает'): a panel is only rewritten when its markup changed
  186  setHTML(id,html,key) [5]  v4.35 (reviewer): a panel rewritten on every tick kept losing its scroll — the scroll of its lists is carried 
  191  esc(s) [1]  ≈ return String(s).replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[
  193  num(x) [1]  numbers read in groups of three: 27 920
  194  dec(x) [1]  ≈ return (Math.abs(x)<10?x.toFixed(1):num(x)) }
  195  var ROMAN  ≈ ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  196  roman(n) [1]  ≈ return ROMAN[n]||String(n+1) }
  197  genB(g,old) [1]  ≈ return '<span class="gen'+(old?' old':'')+'">'+roman(g)+'</span>' }
  198  pname(id) [1]  ≈ var p=planet(id); return p?p.name.toUpperCase():id }
  199  hullName(h) [1]  v4.20: class + Greek name
  200  hname(s) [1]  ≈ return T(shipClass(s))+' '+roman(hullGen(s))+' '+fill(T('hullNo'),{n:s.id}) }
  201  kindWord(k) [1]  ≈ return T(KIND[k]) }

  203  ## PRICES: THE ICON AND THE NUMBER, THE SHORT PART RED; A RESOURCE THE PLAYER HAS NOT MET IS NOT SHOWN
  204  haveOf(k,E) [1]  ≈ return k==='people'?E.people-K.EARTH_KEEP:E[k] }
  205  price(c,E,sz) [4]  ≈ var out='';
  210  shortWhy(c,E) [4]  the first thing Earth is short of, as a why-code with the shortfall
  215  off(code,p) [1]  v4.12: a blocked button is never mute — off(code,p) marks it, and a press on it says why
  216  offW(w) [1]  ≈ return typeof w==='string'?off(w):off(w[0],w[1]) }
  217  whyText(code,p) [1]  ≈ return fill(MSG[U.lang][code]||code,p||null) }
  218  btn(label,act,data,kind,icon,dis) [2]  ≈ var d=''; for(var k in (data||{})) d+=' data-'+k+'="'+attr(data[k])+'"';

  221  ## MESSAGES
  224  toast(html,cls,ms,snd) [5]  v4.9 / v4.12 (Nikita, 30.09: 'когда я нажал кнопку, я хочу видеть подтверждение'): every order answers — a toa
  229  var GOOD_CODES  ≈ {ok:1,lineSet:1,policySet:1,copied:1,saved:1,textsOk:1,queued:1};
  230  say(code,p) [3]  ≈ var good=GOOD_CODES[code]||/^ok_/.test(code);
  233  logText(e) [4]  ≈ var tpl=LOG[U.lang][logKey(e)]; if(!tpl) return '';
  237  toastLast() [5]  v4.30: these stop the desk with a full-screen notice (voiceWatch)
  243  foodWatch() [3]  v4.10 (Nikita, 27.09): rations low and no farm feeding Earth → a yellow line, once a shift
  247  logKey(e) [1]  shift lines rotate between variants so a long calm run does not read as one sentence pasted ten times
  249  var SFX  ≈ (function(){
  284  pressFx(x,y,kind) [2]  v4.12: the press mark — a square that blooms where the pointer hit, so a click is seen even when the
  287  attr(v) [1]  v4.12: a blocked button is never mute — off(code,p) marks it, and a click on it says why (see the click handle

  289  ## PERSONAL FILES
  295  var VOICE_GAP  ≈ 50, CAPT_TENURE=30;
  296  hash32(a,b) [1]  ≈ var h=(a|0)^0x9E3779B9; h=Math.imul(h^(b|0),0x85EBCA6B); h^=h>>>13; h=Math.imul(h,0xC2B2AE
  297  personName(seed) [1]  ≈ var pool=(T('names')||'').split(/\s+/).filter(Boolean); if(!pool.length) return '—'; retur
  298  serviceNo(seed) [1]  ≈ return 1000+(Math.abs(hash32(seed,77))%9000) }
  299  voiceKeys(trigger) [1]  ≈ return Object.keys(VOICE.en||{}).filter(function(k){ return k.indexOf(trigger+'.')===0 }) 
  300  voice(trigger,role,d,o) [17]  ≈ o=o||{}; var keys=voiceKeys(trigger); if(!keys.length) return;
  318  voiceLine(e) [1]  ≈ var v=VOICE[U.lang]||{}; var d={}; for(var q in e.d.d) d[q]=e.d.d[q]; if(d.p&&planet(d.p))
  320  voiceWatch() [55]  what the log said since last time, and who answers it
  376  drawPortrait(cv,seed) [40]  the face: 64×64, bone on black, ordered dither — nobody drew it, and it is different every time

  417  ## MAP GEOMETRY
  418  var STARS  ≈ null;
  419  starfield() [9]  ≈ if(STARS) return STARS;
  428  var CX  ≈ 500, CY=350;
  429  nodeXY(n) [1]  ≈ if(!n) return null; if(n==='earth') return {x:CX,y:CY}; var pp=planet(n); return pp?pos(pp
  432  var POSC  v4.35 (regress, seed 309573272: BRINE sat under SOLACE — a world stands on its ring at its angle, and two worl
  433  pos(p) [1]  ≈ if(POSN!==PLANETS.length||!POSC[p.id]) layoutPos(); return POSC[p.id] }
  434  layoutPos() [6]  ≈ var Ls=PLANETS.map(function(q){ var R=SECTORS[q.sec].r; return {id:q.id,x:CX+Math.cos(q.an

  441  ## THE VIEWPORT
  448  var VIEW  ≈ {x:0,y:0,w:1000,h:700}, VFIT=true, VSECS=-1, MAPDRAGGED=false;
  449  viewFit() [12]  v4.36: while the tutorial shows one ring, the chart comes closer (ui-v7)
  461  viewZoom(f,ax,ay) [7]  ≈ var w=Math.max(280,Math.min(9000,VIEW.w*f));
  468  viewPt(ev) [7]  the viewBox is letterboxed by preserveAspectRatio=meet: find the real scale

  476  ## THE STATE OF A WORLD, AS THE MAP, THE LIST AND THE ADVISOR SEE IT
  477  isDead(pid) [1]  ≈ var p=planet(pid); return !!G.colonies[pid]&&p.kind!=='works'&&G.reserves[pid]!==Infinity&
  478  isDry(pid) [1]  ≈ var p=planet(pid); return !!G.colonies[pid]&&p.kind!=='works'&&G.reserves[pid]!==Infinity&
  479  worksHungry(pid) [3]  ≈ var p=planet(pid), c=G.colonies[pid]; if(!c||p.kind!=='works') return null;
  482  wst(pid) [10]  ≈ var c=G.colonies[pid];
  492  var BAD_ST  ≈ {dead:1,cut:1,starve:1};

  494  ## THE MAP
  495  drawMap() [82]  ≈ var s='', i, p, xy;
  577  drawTip(g) [9]  ≈ var tip=el('tip'); if(!g||!G){ tip.className=''; return }
  586  drawEvBar() [5]  ≈ var E=(can('events')&&G.dir&&G.dir.ev)||[], h='', live=false;
  592  building() [1]  v4.35: what the yards are building, top right of the map — the three nearest, and how many more
  593  hullProgress(s) [1]  ≈ var h=HULLS[s.hull], tot=Math.max(1,h?h.days:1); return Math.max(0,Math.min(1,1-(s.t||0)/t
  594  forWorld(s) [1]  ≈ return s.lineFor||(s.pend&&s.pend.from)||null }
  595  drawCards() [6]  ≈ var b=can('yard')?building():[], h='';

  602  ## TOP: THE YEAR, THE NIGHT, THE ADVISOR, THE CLOCK
  603  winPause() [1]  ≈ return U.win==='earth'||U.win==='yard'||U.win==='ark' }
  604  bigKind() [1]  ≈ if(!U.langPicked) return 'lang'; if(G.over) return 'over'; if(G.night&&!G.nightSeen) retur
  605  modal() [1]  ≈ return !!bigKind()||!!(U.pf&&!U.pf.low)||!el('logbox').hidden }
  606  halted() [1]  ≈ return U.paused||winPause()||modal()||tutHold() }
  607  var SPEEDS  ≈ [1,2,4,10];
  608  drawTop() [12]  ≈ var h='<div class="logo"><svg class="mk" viewBox="0 0 120 120" aria-hidden="true"><use hre
  622  var TREND_YEARS  v3.7 (Nikita, 23.09): a resource that is being spent faster than it comes in must say so. The trend is the rea
  623  trendTick() [5]  ≈ var E=G.earth, h=U.hist;
  628  trend(k) [1]  ≈ var h=U.hist; if(h.length<6) return null; var a=h[Math.max(0,h.length-1-TREND_YEARS)], b=h
  629  drawRes() [10]  ≈ var E=G.earth, nd=G.need||earthNeed(G), h='';

  640  ## TABS AND THEIR FLAGS
  643  var TABS  BRIEF (Nikita 14.10): the flags speak of Earth, the yard, the fleet and the ark; the advisor is for worlds onl
  644  freeAtPier() [1]  ≈ return G.ships.filter(function(s){ return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)
  645  flags() [19]  Earth: hunger, then the larder, then metal and fuel
  664  drawTabs() [7]  ≈ var F=flags(), h='';

  672  ## WINDOW PIECES
  673  head(title,sub,icon) [1]  ≈ return '<div class="wh">'+(icon||'')+'<b>'+title+'</b><small>'+(sub||'')+'</small></div>' 
  674  sec(l,r,id) [1]  ≈ return '<div class="sec"'+(id?' id="'+id+'"':'')+'><span>'+l+'</span>'+(r!==undefined&&r!=
  675  row(l,v,col,id) [1]  ≈ return '<div class="rw"'+(id?' id="'+id+'"':'')+'><span>'+l+'</span><b'+(col?' style="colo
  676  hint(t,cls) [1]  ≈ return '<div class="hint'+(cls?' '+cls:'')+'">'+t+'</div>' }
  677  alertBox(icon,t,warn) [1]  ≈ return '<div class="alert'+(warn?' warn':'')+'">'+ic(icon,16,warn?C.people:C.red)+'<span>'

  679  ## EARTH: ONLY HOME AND ITS BURN (BRIEF)
  680  winEarth() [18]  ≈ var E=G.earth, nd=G.need||earthNeed(G), t=trend('people'), h='';

  699  ## BIG WINDOWS: LANGUAGE, THE END, THE NIGHT, THE SHIFT, NOTES — ONE AT A TIME, TIME STANDS
  700  var NOTE_CODES  ≈ {drive_mark:'noteDrive',mutiny_warn:'noteArk',food_horizon:'noteEarth',night_near:'noteArk
  701  evName(t) [1]  ≈ return T('ev'+t.charAt(0).toUpperCase()+t.slice(1)) }
  702  note(o) [1]  ≈ U.notes.push(o) }
  703  chronLines(k) [4]  ≈ var out='', n=0;
  707  rw2(k,v,cls) [1]  ≈ return '<div class="rw"><span>'+k+'</span><b class="'+(cls||'')+'">'+v+'</b></div>' }
  708  bigHtml(kind) [47]  ≈ if(kind==='lang') return '<div class="nwin" id="lang"><svg class="lmark2" viewBox="0 0 120
  755  drawBig() [3]  the shift window is built once: its checkbox keeps its state

  759  ## PERSONAL FILES: A FACE FOR A CREW, AT THE FOOT OF THE MAP, OR THE WHOLE SCREEN FOR THE MOMENTS THAT MATTER
  760  drawPF() [11]  ≈ var L0=el('pfL'), f=U.pf;
  773  freeWorlds() [1]  the Night stop, the no-free-worlds stop and the ring note — v4.30/v4.16, now as notes that open the Tech tab
  774  watchRings() [7]  ≈ if(U.gk!==G){ U.gk=G; U.noFreeAt=null; U.ringNoted=undefined; U.notes=[] }

  781  ## THE TUTORIAL AND THE STORY (V4.36; DESIGN/UI-V7.HTML, BRIEF «ОБУЧЕНИЕ» AND «НАРРАТИВ В МАКЕТЕ»)
  791  var HELP_KEY  TUTX: the scenarios' hook (LNtut.off) mutes the launch, the voices and the helper
  792  helpPref() [1]  ≈ if(TUTX.off) return false; try{ return localStorage.getItem(HELP_KEY)!=='0' }catch(e){ ret
  793  setHelpPref(on) [1]  ≈ try{ localStorage.setItem(HELP_KEY,on?'1':'0') }catch(e){} }
  794  var OPEN_ALL  ≈ ['people','food','line','speed','fuel','earth','skip','metal','order','yard','fleet','part
  795  var TAB_KEYS  ≈ {earth:1,worlds:1,tech:1,yard:1,fleet:1,ark:1};
  796  tutBlank() [1]  ≈ return {lock:false,help:false,open:{},fresh:{},seen:{},step:-1,seq:0,q:[],msg:null,nar:nul
  797  secVis(sec) [1]  ≈ return sectorOpen(G,sec)&&(!U.tut.lock||can('ring2')||sec<1) }
  798  visRings() [1]  ≈ return U.tut.lock&&!can('ring2')?Math.min(1,SECTORS.length):SECTORS.length }
  799  ringFree(sec,kind) [1]  ≈ return PLANETS.filter(function(p){ return p.sec===sec&&(!kind||p.kind===kind)&&!G.colonies
  800  firstCol() [1]  ≈ var t=U.tut; if(t.col&&G.colonies[t.col]) return t.col; return Object.keys(G.colonies)[0]|
  801  builtHulls() [1]  ≈ return G.ships.filter(function(s){ return s.mode!=='dead'&&s.mode!=='building' }).length }
  802  halfWorld() [1]  ≈ return Object.keys(G.colonies).filter(function(k){ return wst(k)==='half' })[0]||null }
  803  lineless() [2]  ≈ var ks=Object.keys(G.colonies); if(!ks.length) return null;
  805  mineFor() [1]  ≈ var k=Object.keys(G.colonies).filter(function(x){ return planet(x).kind==='mine' })[0]; if
  806  fcYear() [1]  ≈ var f=G.foodFc||foodForecast(G); return f?f.y:'—' }
  807  freeHullAtPier() [1]  ≈ return freeAtPier().some(function(s){ return !s.mutiny&&!s.crewWait&&!s.job }) }
  809  offLine() [1]  a hull that is on no line: free at the pier, or flying home after it set settlers down
  810  closeAll() [1]  ≈ U.win=null; U.tab=null; U.pop=null; return {} }
  812  var TMSG  the rules: where she points, how, and what the press must be
  844  hullWorld(sid) [1]  ≈ var s=shipById(G,sid); if(!s) return; var w=s.from||(s.pend&&s.pend.from)||forWorld(s)||(s
  846  var NAR  the story: Claude's clean copy 15.10 (awaits Nikita), texts in the sheet; E — launch, V — her voice
  858  var STEPS  twelve steps, one after another; the windows and the numbers a rule needs are taken when it is shown (pre), no
  872  stepReady(i) [1]  ≈ var s=STEPS[i]; if(!s) return false; return s.when()||(!!s.soft&&stepReady(i+1)) }
  873  var STEP_SAFE  ≈ 8; // HANDOFF: no hull is lost before the advisor step (G.safe)
  874  tutOpen(keys) [3]  ≈ var t=U.tut; if(!t.lock) return;
  877  tutOpenAll() [1]  ≈ var t=U.tut; OPEN_ALL.forEach(function(k){ t.open[k]=1 }); t.fresh={}; ['metal','fuel','pa
  878  tutPush(id,p) [2]  ≈ var t=U.tut; if(TMSG[id]&&!t.help) return; if(NAR[id]&&!TUTX.story) return; if(id==='N01'&
  880  tutStep(i) [1]  ≈ var t=U.tut, s=STEPS[i]; t.step=i; tutOpen(s.opens); if(s.go) s.go(); s.q.forEach(function
  881  partsHome() [1]  ≈ return (G.delivered.parts||0)>0||G.earth.parts>0 }
  883  tutNew() [2]  a new game: the launch screen, then step 1
  886  tutQuiet() [6]  a run already under way (an old save, or the helper turned on in the middle): what has happened is not told ag
  892  tutLog() [7]  ≈ var t=U.tut, mx=t.seq;
  899  tutJit() [11]  ≈ var t=U.tut, w=U.win, quiet=!t.msg&&!t.nar&&!t.q.length;
  910  tutBusy() [1]  ≈ return modal() }
  911  tutNext() [4]  ≈ var t=U.tut; if(t.msg||t.nar||!U.langPicked||G.over) return;
  915  msgShow(it) [3]  ≈ var t=U.tut, m=TMSG[it.id]; U.pop=null; var p=m.pre?m.pre():{}; if(p===null) return false;
  918  msgDone() [1]  ≈ var t=U.tut; if(!t.msg) return; t.msg=null; draw() }
  919  var NART  ≈ null;
  920  narShow(it) [5]  ≈ var t=U.tut, N=NAR[it.id], p=it.p||(N.pre?N.pre():{}); if(p===null) return false;
  925  narDone() [1]  ≈ clearTimeout(NART); if(!U.tut.nar) return; U.tut.nar=null; draw() }
  926  launchFrame(i) [1]  ≈ var L0=el('launch'); L0.querySelectorAll('.lfr').forEach(function(f,j){ f.classList.toggle
  927  launchStep() [2]  a press while the last frame dives in must not stop it
  929  launchEnd() [1]  ≈ var L0=el('launch'); if(!U.tut.nar||L0.classList.contains('out')) return; clearTimeout(NAR
  931  tutOff() [2]  SKIP THE HELPER (first message) and ≡ Helper off: everything opens at once; the story goes on
  933  tutOn() [1]  ≈ var t=U.tut; setHelpPref(true); if(t.help) return; t.help=true; tutQuiet(); act(G,'helper'
  934  tutTick() [7]  ≈ var t=U.tut; if(!U.langPicked||G.over) return;
  942  tutWants() [1]  is there something she wants to say before the clock runs on (SKIP stops there)
  943  tutHold() [1]  ≈ var t=U.tut; return !!t.msg||!!(t.nar&&(t.nar.f==='E'||t.nar.hold)) }
  945  tutTarget(m) [1]  the press: the launch takes it; a rule lets through only its lit thing; her voice closes on any press
  946  tutClick(ev) [12]  ≈ var t=U.tut, x=ev.target;
  958  tutKey(e) [6]  ≈ var t=U.tut;
  965  tutAct(a,v,res) [3]  after a press went through: a 'do' is done when its press succeeded, a 'see' on any press; a tab loses its dot
  969  tutPlace() [21]  the dark with a cut-out (+6 px, one or two pieces), the yellow ring, the helper over the map — or over the tar
  990  tutLive(e) [1]  ≈ if(e.getAttribute('aria-disabled')==='true') return false; if(!e.querySelector('[data-act]
  991  narPlace() [11]  ≈ var n=U.tut.nar, L0=el('launch'), V=el('voice');
 1003  alx(s) [1]  Alexandra's line under the Institute's in a big window
 1004  icap(right) [1]  ≈ return '<div class="icap">'+esc(T('tut_inst'))+'<span>'+esc(right)+'</span></div>' }
 1006  var TUT_KEEP  in the save: what is open and what was said; the queue is not kept — what the current step has not said yet is
 1007  tutSave() [3]  ≈ var t=U.tut, o={}; TUT_KEEP.forEach(function(k){ if(t[k]!==undefined) o[k]=t[k] });
 1010  tutLoad(o) [5]  a save from before v4.36: everything open, no helper, the story goes on from here
 1015  tutState() [1]  ≈ var t=U.tut; return {lock:t.lock,help:t.help,step:t.step,msg:t.msg&&t.msg.id,mode:t.msg&&t

 1017  ## RENDER
 1018  appZoom() [1]  ≈ return +(el('app').dataset.z||1) }
 1019  drawSide() [3]  ≈ var t=U.tab, h='';
 1022  drawWin() [3]  ≈ var w=U.win, h='';
 1025  drawPop() [4]  ≈ var p=U.pop, h='', cls='';
 1029  focusFix() [4]  ≈ var now=Date.now();
 1033  draw() [6]  ≈ if(!G) return;

 1040  ## HULLS: WHERE EACH ONE IS, IN ONE LINE
 1041  hullSt(s) [22]  ≈ var wl=forWorld(s);
 1063  stRow(s) [3]  ≈ var a=hullSt(s);
 1066  hullRow(s,acts,id) [2]  ≈ var g=hullGen(s);
 1068  speedTxt(hl) [1]  ≈ return (hl.speed*driveSpeed(G)).toFixed(2) }
 1069  specIcons(h) [1]  ≈ return '<span>'+ic('hold',15,C.mid)+num(h.cap)+'</span><span>'+ic('speed',15,C.mid)+speedT
 1070  hullCost(h) [1]  ≈ return {metal:h.metal,fuel:h.fuel,parts:h.parts||0,people:h.crew||0} }
 1071  clsSeen(cls) [1]  v4.36: a hull that costs parts shows up once parts are open

 1073  ## THE WORLD WINDOW
 1074  stepOrder(pid) [3]  ≈ var col=!!G.colonies[pid];
 1077  openWorld(pid,focus) [3]  v4.38: the advisor names a hull — open the tab she is on and light her
 1080  var FOCUS  ≈ {evac:'#ovl [data-act="evac"]',add:'#addblk',lift:'#rw-lift',ord:'#ordblk',mach:'#mach'};
 1081  var KW  ≈ {mine:'u_kMine',farm:'u_kFarm',well:'u_kWell',works:'u_kWorks'};
 1082  wsub(p,extra) [1]  ≈ return esc((T(KW[p.kind])+' · '+fill(T('u_ringN'),{n:p.sec+1})+(extra?' · '+extra:'')).toU
 1083  sendFuel(p) [1]  ≈ return Math.max(1,Math.round(p.dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(G)))) }
 1084  lobeTxt(p) [1]  ≈ var lb=lobeOf(p.ang), ev=lobeEvents(G,lb); return T('lobe'+lb).toUpperCase()+' · '+(ev.len
 1085  assignable(pid) [2]  ≈ var p=planet(pid);
 1088  pickCourier(pid) [6]  v4.18: the free courier that can lift everyone and gets there first; else the biggest one; v4.33: none that wo
 1094  evacGoing(pid) [1]  ≈ return G.ships.some(function(o){ return o.job==='evac'&&o.dest===pid&&o.mode==='transit' }
 1095  evacW(pid) [1]  ≈ var nh=nextHome(G,pid,'courier'); if(nh&&nh.t<=0) return fill(T('u_evacW_line'),{n:nh.id})
 1096  evacBlock(p) [8]  ≈ var c=G.colonies[p.id];
 1104  liftRow(p) [3]  ≈ var ll=lastLift(G,p.id); if(!can('lift')||!ll||ll.st==='going') return '';
 1107  machines(p,c) [15]  before the Gen III yards the block is only noise
 1122  winWorld(pid) [67]  ≈ var p=planet(pid), c=G.colonies[pid], st=wst(pid), L0='', R='';
 1190  seamShort(pid) [1]  v4.10 (Nikita, 27.09: 'слишком много непонятных цифр'): the seam is told in years at the current pace
 1191  seamLeft(pid) [3]  ≈ var res=G.reserves[pid], c=G.colonies[pid], p=planet(pid);
 1195  picker() [7]  the hull picker: send a free hull, or move one off its line; closed by «keep it where it is» or a press beside

 1203  ## YARD: WHAT IS BEING BUILT, A FREE HULL OF THE CURRENT GENERATION, THE PIER
 1204  winYard() [15]  ≈ var g=G.gen||0, b=building(), pier=freeAtPier(), h='';

 1220  ## FLEET: EVERY HULL AND WHERE IT IS (NO PAUSE)
 1221  sideFleet() [12]  ≈ var all=G.ships.filter(function(s){ return s.mode!=='dead' });
 1233  searchFuel(m) [1]  ≈ var w=m.dest&&m.dest!=='earth'?m.dest:(m.origin&&m.origin!=='earth'?m.origin:m.target), p=
 1234  bestSearch(m) [2]  ≈ var where=m.dest&&m.dest!=='earth'?m.dest:(m.origin&&m.origin!=='earth'?m.origin:m.target)

 1237  ## WORLDS: THE LIST, WORST FIRST
 1238  var SEV  ≈ {dead:0,cut:1,starve:2,noline:3,half:4,dry:5,ok:6,settling:7,free:8};
 1239  sideWorlds() [8]  ≈ var list=PLANETS.filter(function(p){ return secVis(p.sec)&&!(G.ghost&&G.ghost[p.id]) }).ma

 1248  ## TECH: THE HULL GENERATION (THE DRIVE PROGRAMME), THE NEXT GENERATION'S SPECS, THE RINGS
 1251  steps(n,of,col) [3]  BRIEF: the rule of the drive does not change — the gate is worlds ever settled (4 + 4·l), the programme runs a
 1254  worksList() [1]  ≈ return Object.keys(G.colonies).filter(function(k){ return planet(k).kind==='works' }) }
 1255  driveHost() [3]  ≈ var ws=worksList(), u=U.driveAt;
 1258  startDriveWhy(pid) [4]  ≈ if(G.drive) return 'running';
 1262  sideTech() [29]  ≈ var g=G.gen||0, lvl=G.driveLvl||0, s=settledCount(G), need=driveReachFor(G), work=driveWor

 1292  ## ARK: THE NIGHT, THE LEVELS, THE CONVOY, THE VERDICT
 1293  arkDriveTxt() [6]  ≈ if(arkReady(G)) return [fill(T('u_arkReady'),{g:roman(G.arkMark)}),C.food];
 1299  winArk() [24]  ≈ if(!G.night) return '<div class="win sm">'+head(esc(T('u_tabArk').toUpperCase()),esc(T('u_

 1324  ## THE ADVISOR: WORLDS ONLY, WORST FIRST (NIKITA 15.10: «НЕ ПОНИМАЮ, ЧТО ДЕЛАТЬ»)
 1327  advRows() [18]  v4.38: a hull named for one line is not offered to the next
 1347  lineFix(pid,used) [5]  v4.38 (Nikita, 19.10, option A): the one fix for a line that falls behind — a free hull, a spare one off anoth
 1352  popAdv() [2]  ≈ var a=advRows();
 1354  popMenu() [8]  ≈ return '<div class="menu"><button type="button" data-act="lang">'+ic('tWorlds',15)+esc(T('

 1363  ## SAVE AND LOAD: A FILE, AND THE LAST AUTOSAVE IN THIS BROWSER
 1364  var SAVE_KEY  ≈ 'lb.save';
 1365  dump() [2]  ≈ return JSON.stringify({v:1,G:G,SECTORS:SECTORS,PLANETS:PLANETS,HULLS:HULLS,U:{hist:U.hist,
 1367  undump(t) [8]  ≈ var o=JSON.parse(t,function(k,v){ return v==='__inf'?Infinity:(v==='__-inf'?-Infinity:v) }
 1375  autosave() [1]  ≈ try{ localStorage.setItem(SAVE_KEY,dump()) }catch(e){} }
 1376  saveFile() [2]  ≈ var data=dump(), name='last-berth-'+G.seed+'-y'+G.day+'.json';

 1381  ## RUN LOG
 1382  showLog() [1]  ≈ act(G,'export',{}); el('logtxt').value=exportLog(G); el('loghead').textContent=T('runLog')
 1384  saveLog() [5]  v4.11 (Nikita, 28.09: 'экспорт JSON-файла'): the page asks the viewer to save the file; where the runtime is a
 1389  copyLog() [3]  ≈ var ta=el('logtxt'); ta.focus(); ta.select(); var done=false;

 1393  ## SKIP: THE CLOCK RUNS ON UNTIL SOMETHING WANTS THE DESK
 1394  skipAhead() [8]  ≈ if(modal()||tutHold()||G.over) return; if(winPause()) U.win=null; var t0=performance.now()

 1403  ## PRESSES
 1405  var lineWhy  v4.35 (reviewer): setLine puts the hull on the line and then sails it — no fuel or crew keeps her at the pier 
 1406  lineRes(res,sid,pid) [1]  ≈ var s=shipById(G,sid); if((res==='fuel'||res==='crew')&&s&&s.from===pid){ lineWhy[sid]=res
 1407  lineWait(sid) [1]  ≈ return lineWhy[sid]?whyText(lineWhy[sid]):'' }
 1408  resLeft(sid) [1]  ≈ toast(esc(fill(T('u_resLeft'),{n:sid})),'warn',6000,false) }
 1409  doAct(a,b) [53]  ≈ var d=b.dataset, res=null, okc=null, okp=null, v=d.v;

 1495  ## THE MAP IS PANNABLE AND ZOOMABLE
 1510  fit() [2]  desktop first (Nikita 16.10): below 1180×700 the whole desk is scaled down, nothing reflows

 1514  ## LOOP
 1516  var MS  v4.31 (Nikita, 13.10, F-45: '4x too fast'): 1x 1.5 s, 2x 1.0 s, 4x 0.6 s, 10x 0.2 s a year
 1517  frame(ts) [24]  ≈ if(!U.last) U.last=ts;
 1541  start(seed) [9]  ≈ G=newGame(seed||undefined); tutNew();
```

