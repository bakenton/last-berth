# MAP — оглавление core.js / ui.js

Сгенерировано `python3 tools/map.py > MAP.md` после каждой правки кода. Не править руками.
Навигация: `grep -n <имя> MAP.md` → `sed -n "<строка-40>,<строка+40>p" work/<файл>`. Код целиком не открывать.
Формат: `строка  имя(аргументы) [длина]  назначение`. «≈ …» = комментария нет, показано начало кода.

## core.js (1534 строк)

```
    3  mulberry32(a) [1]  LONG NIGHT — core simulation. No DOM. Pure state + pure-ish mutators.

    5  ## THE CHART BUILDS ITSELF
    9  var SECTORS  ≈ [];
   10  var PLANETS  ≈ [];
   12  var SEC_NAMES  ≈ ['NEAR DRIFT','THE SHOAL','OUTER DARK','THE WASTE','LONG SILENCE','OLD NIGHT','THE THRESHI
   13  var W_NAMES  ≈ ['Tallow','Brine','Cinder','Marrow','Solace','Vesper','Gallows','Ferrous','Hollow','Threno
   17  var DESIGS  ≈ ['LV','HD','NR','KX','QT','ZD','BC','GR','TS','WN','PX','MV','AR','EL','SH','UM'];
   19  secName(i) [1]  ≈ return i<SEC_NAMES.length ? SEC_NAMES[i] : 'SECTOR '+(i+1) }
   20  secRadius(i) [1]  ≈ return 170+i*88 }
   24  genSector(rnd,i) [20]  every sector gets one of each trade, so the player is never starved of fuel
   46  openSector(G) [17]  Appends one more sector to the chart. Called at world-gen and on every survey.
   65  surveyCost(n) [7]  what it costs to push the chart one sector further out
   75  canSurvey(G) [10]  v3.2: the chart is no longer bounded by what the fleet can reach. You may
   85  survey(G) [13]  ≈ var chk=canSurvey(G); if(chk!=='ok') return chk;

   99  ## HULL GENERATIONS
  109  var HULL_BASE  v4.5 (Nikita, 26.09, run 768210301: 'курьеры 5–6 поколений имбовые, тягачи и грузовозы бессмысленны'):
  114  var HULLS  ≈ [];
  115  genHull(gen,j) [12]  ≈ var b=HULL_BASE[j], g=gen;
  127  ensureGen(gen) [1]  ≈ while(HULLS.length<(gen+1)*3){ var g=Math.floor(HULLS.length/3); for(var j=0;j<3;j++) HULL

  128  ## RANGE
  138  var CLASS_RANGE  ≈ {courier:1, hauler:2, freighter:3};
  139  classRange(key,gen) [1]  ≈ return (CLASS_RANGE[key]||1)+gen }
  140  hullRange(h) [1]  ≈ return h? classRange(h.key,h.gen||0) : 0 }
  142  sectorLimit(gen) [1]  the furthest sector ANY hull of this generation can fly to (the freighter)
  143  hullGen(s) [1]  ≈ return (HULLS[s.hull]&&HULLS[s.hull].gen)||0 }
  144  shipRange(s) [1]  ≈ return hullRange(HULLS[s.hull]) }
  145  canReachSector(s,sec) [1]  ≈ return sec<=shipRange(s) }
  147  classFor(sec,gen) [5]  cheapest class that can serve a sector at this generation; null = nothing can
  153  genForSector(sec) [1]  generation needed before any hull can reach this sector
  155  var K  ≈ {
  299  planet(id) [1]  ≈ for(var i=0;i<PLANETS.length;i++)if(PLANETS[i].id===id)return PLANETS[i];return null}
  302  popCap(p) [1]  how many people a world can hold, and how many it wants before it digs at full rate
  303  popWant(p) [1]  ≈ return popCap(p) }

  304  ## V4.4: EXTRACTION KITS
  305  kitTier(c) [1]  ≈ return (c&&c.tier)||0 }
  306  kitLive(c) [1]  machines standing = no multiplier
  307  rateMult(c) [1]  ≈ return kitLive(c)? Math.pow(K.KIT_OUT,kitTier(c)) : 1 }
  310  storeCap(c) [1]  v4.5 (Nikita, 26.09: 'не хочу, чтобы ресурсы сгорали'): a world's stockyard has no ceiling. What the
  311  kitBurn(c) [1]  ≈ return K.KIT_FUEL*kitTier(c) }
  312  kitCost(c) [2]  ≈ var t=kitTier(c)+1, m=Math.round(K.KIT_METAL*Math.pow(K.KIT_GROW,t-1)), p=Math.round(K.KIT
  314  kitOpen(G) [1]  ≈ return (G.driveLvl||0)>=K.KIT_GATE_DRIVE }
  316  lineHold(G,pid) [2]  the biggest hold on this world's line; 0 if nothing runs there
  318  canKit(G,pid) [11]  ≈ var c=G.colonies[pid]; if(!c) return 'nocolony';
  329  orderKit(G,pid) [8]  ≈ var r=canKit(G,pid); if(r!=='ok') return r;
  338  feedRates(G,node) [6]  what a world burns per year that Earth has to send it: works eat metal and rations, kits eat fuel
  347  fedMult(G) [1]  Earth's own output rides on the people left at home — but only so far.
  348  handsRate(G) [1]  v4.7: Earth empties
  349  earthOutput(G) [4]  ≈ var h=Math.max(0,G.earth.people-K.EARTH_CREW);
  354  crewOut(G) [1]  hands currently riding hulls rather than working at home
  357  crewAway(G) [1]  v3.9.1 (log 519788167: 1562 hands sat on hulls idle at Earth and were counted as left behind): a crew
  358  crewDocked(G) [1]  ≈ return crewOut(G)-crewAway(G) }
  364  earthNeed(G) [5]  G.earth.people is the pool of hands Earth can still put on a ship, not the
  370  driveSpeed(G) [1]  crossings and signal lag both shrink with every drive mark earned
  371  driveWorkFor(G) [1]  ≈ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,G.driveLvl||0)) }
  372  driveReachFor(G) [1]  ≈ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*(G.driveLvl||0) }
  374  newGame(seed) [19]  ≈ seed = seed||((Math.random()*1e9)|0);
  395  reach(G) [1]  reach = live settlements. The relay used to add +2; it is gone (Nikita, 23.09: orders no longer carry anything
  400  settledCount(G) [1]  v4.15 (Nikita, 04.10): the gates on PROGRESS — charting a sector, each drive mark — count worlds EVER settled,
  401  sectorOpen(G,s) [1]  ≈ return s<SECTORS.length}
  402  travelDays(G,dist,ship) [4]  ≈ var sp=(ship&&HULLS[ship.hull]&&HULLS[ship.hull].speed)||1;
  406  legDays(G,a,b,ship) [1]  ≈ return travelDays(G,legDist(a,b),ship) }
  407  legDist(a,b) [9]  ≈ if(a===b) return 0;
  416  lagDays(G,pid) [6]  ≈ var p=planet(pid), base=p.dist*K.LAG_K;
  423  needsOf(G,node) [7]  ≈ if(node==='earth') return null;
  430  exportsOf(G,node) [4]  ≈ if(node==='earth') return ['metal','food'];
  434  loadAt(G,s,node) [61]  v4.4: cargo.kit rides alongside
  495  unload(G,s,node) [23]  ≈ var any=s.cargo.metal+s.cargo.food+s.cargo.fuel+s.cargo.parts+s.cargo.people;
  518  temper(G,s) [1]  ≈ var h=((s.id*2654435761)^(G.seed|0))>>>0; return K.MUTINY_SPREAD*((h%1000)/1000) }
  520  mutinyDue(G,s,round) [1]  would this crew refuse the run that starts here? (the desk can ask the same question)
  521  sail(G,s) [27]  ≈ var here=s.at, dest = here===s.from ? s.to : s.from;
  550  var CHRON  chronicle lines never roll off the cap: the log forgets traffic, not history
  551  log(G,code,d) [2]  ≈ G.logSeq=(G.logSeq||0)+1;G.log.push({day:G.day,code:code,d:d||{},seq:G.logSeq});
  554  act(G,kind,d,res) [1]  player actions, kept whole for post-run analysis (exported from the UI)
  555  snap(G) [14]  ≈ var E=G.earth, cols=0, pop=0, dry=0;
  570  exportLog(G) [12]  v4.4 (Nikita, 25.09): the run log is JSON — the designer reads it with a script, not with his eyes
  582  exportLogText(G) [27]  ≈ var L=[]; L.push('LAST BERTH run log · seed '+G.seed+' · year '+G.day+(G.over?' · '+G.over

  610  ## ACTIONS
  612  buildShip(G,hullId) [15]  ≈ var h=HULLS[hullId]; if(!h) return 'locked';
  631  scrapValue(h) [1]  scrapping: an idle hull at Earth comes apart for part of what it cost.
  632  scrap(G,shipId) [13]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  645  scrapIdle(G,gen) [8]  ≈ var n=0, m=0, p=0;
  653  shipById(G,id) [1]  ≈ for(var i=0;i<G.ships.length;i++)if(G.ships[i].id===id)return G.ships[i];return null}
  655  canDepart(G,s,pid) [12]  ≈ var p=planet(pid);
  668  launch(G,s,pid,job,cargo) [11]  ≈ var p=planet(pid);
  681  nextHome(G,pid,cls) [5]  v4.14: when no free hull at Earth can lift a world — the nearest rated hull on its way home, or null
  686  enRoute(G,pid) [1]  ≈ for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='transit'&&o.job==='colon
  687  foundParty(G,s,pid) [1]  ≈ return Math.max(0,Math.floor(Math.min(popCap(planet(pid)), s.cap, G.earth.people-K.EARTH_K
  688  colonize(G,shipId,pid,people,food) [17]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  709  setLine(G,shipId,from,to) [18]  A line is always world <-> Earth. Only Earth consumes, so a leg between two
  729  clearLine(G,shipId) [2]  v3.8.1 (log 57539013, tester: "нельзя было снять судно"): a line ordered while the hull was in transit

  731  ## V4.6: A LINE IS A STANDING ORDER
  736  var CLASSES  ≈ ['courier','hauler','freighter'];
  737  lineOf(G,pid) [1]  ≈ return G.lines&&G.lines[pid]||null }
  738  pileLeft(G,pid) [1]  v4.11: what is still on the surface
  739  shipClass(s) [1]  ≈ return HULLS[s.hull]?HULLS[s.hull].key:'courier' }
  740  onLine(G,pid) [2]  ≈ var out=[]; for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='dead') conti
  742  lineCount(G,pid,cls) [1]  ≈ var n=0, ships=onLine(G,pid); for(var i=0;i<ships.length;i++){ var o=ships[i]; if(o.retire
  743  lineWant(G,pid,cls) [1]  ≈ var L=lineOf(G,pid); return L?(L.want[cls]||0):0 }
  746  hullAt(cls,gen) [1]  v4.17 (Nikita, 04.10: 'в постоянном приказе все ещё суда высшего поколения и не видно судов других'): the hull
  747  lineHull(G,pid,cls) [1]  ≈ var L=lineOf(G,pid), g=(L&&L.gen)?L.gen[cls]:undefined; if(g!==undefined&&g!==null){ var i
  748  lineGenPin(G,pid,cls) [1]  ≈ var L=lineOf(G,pid), g=(L&&L.gen)?L.gen[cls]:undefined; return (g===undefined||g===null)?n
  749  currentHull(G,cls) [1]  ≈ var best=null; for(var i=0;i<HULLS.length;i++){ var h=HULLS[i]; if(h.key!==cls) continue; 
  751  yardCheck(G,pid,cls) [14]  why the yards cannot order this class for this line right now; 'ok' when they can
  765  setWant(G,pid,cls,n,gen) [18]  v4.9/v4.11: nothing to carry — the seam is dead and the pile is gone
  783  setRenew(G,pid,on) [1]  ≈ var L=lineOf(G,pid); if(!L) return 'noline'; L.renew=!!on; return 'ok' }
  784  retireHull(G,o,why) [6]  it will come out idle and be scrapped
  791  yardsTick(G) [44]  the yards, once a year
  835  closeLine(G,pid) [1]  ≈ var ships=onLine(G,pid); for(var i=0;i<ships.length;i++) retireHull(G,ships[i],'closed'); 
  836  setAuto(G,shipId,pid) [1]  ≈ return setLine(G,shipId,'earth',pid) }
  837  setAutoOld(G,shipId,pid) [7]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  844  setPolicy(G,shipId,pid,deliver,collect) [11]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  855  setRoute(G,shipId,pid,out,take) [13]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  868  dispatch(G,shipId,pid,out,take) [6]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  874  repeatRun(G,shipId) [6]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  880  clearRoute(G,shipId) [1]  ≈ var s=shipById(G,shipId);if(s)s.route=null;return 'ok'}
  882  runRoute(G,s) [7]  ≈ var pid=s.route; if(!pid) return 'noroute';
  890  buildRelay(G,pid) [1]  ≈ return 'off' }
  891  buildRelayOld(G,pid) [13]  ≈ var c=G.colonies[pid]; if(!c) return 'nocolony';
  905  relief(G,pid) [11]  ≈ if(!K.UNREST_ON) return 'off';
  917  abandon(G,shipId,pid) [13]  v4.18 (Nikita, 04.10): only a courier lifts a settlement
  931  punitive(G,shipId,pid) [9]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  941  search(G,shipId,missId) [12]  ≈ var s=shipById(G,shipId); if(!s) return 'noship';
  957  startDrive(G,pid) [16]  the drive programme is repeatable: every mark cuts crossings and signal lag
  973  driveDone(G,pid) [7]  ≈ G.driveWork=0; G.drive=null; G.driveLvl=(G.driveLvl||0)+1;
  980  researchHyper(G) [1]  ≈ return 'notworks' }

  982  ## THE LONG NIGHT AND THE ARK
  983  revealNight(G) [6]  ≈ if(G.night) return;

  989  ## V4.0: THE SECOND DATE
  990  workAt(l) [1]  ≈ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,l)) }
  991  reachAt(l) [1]  ≈ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*l }
  992  arkReady(G) [1]  ≈ return G.arkMark!==null&&G.arkMark!==undefined&&(G.driveLvl||0)>=G.arkMark }
  994  arkWake(G) [1]  share of the sleepers who wake at the other end, on the drive you have now (0 = the ark cannot sail)
  995  wakeAt(G,l) [1]  ≈ if(G.arkMark===null||l<G.arkMark) return 0; return K.ARK_WAKE[Math.min(K.ARK_WAKE.length-1
  999  driveForecast(G,target) [17]  when the drive reaches generation index `target` at the pace the works keep now.
 1016  nightLeft(G) [1]  ≈ return G.night? Math.max(0,G.night-G.day) : null }
 1017  arkCost(G) [7]  ≈ var k=G.ark.blocks;
 1024  canArk(G) [9]  ≈ if(!G.night) return 'night';
 1033  buildArk(G) [8]  ≈ var chk=canArk(G); if(chk!=='ok') return chk;
 1042  arkSouls(G) [1]  who would sail if the ark left today: berths, or hands at home, whichever is fewer
 1043  leftBehind(G) [5]  ≈ var col=0; for(var k in G.colonies) if(!G.colonies[k].dark) col+=G.colonies[k].pop;

 1049  ## THE CHRONICLE
 1051  chronShift(G,cols) [38]  ≈ var E=G.earth, idle=0;

 1090  ## TICK
 1092  snapshot(G,c) [8]  ≈ c.hist.push({day:G.day,pop:Math.round(c.pop),unrest:Math.round(c.unrest),
 1100  lineRate(G,pid) [23]  ≈ var p=planet(pid), c=G.colonies[pid]; if(!c) return null;
 1123  reported(G,pid) [9]  never hand the panel an empty report
 1133  tick(G) [263]  ≈ if(G.over) return;

 1397  ## THE ADVISOR: THE GAME DOES THE ARITHMETIC AND SAYS WHAT WANTS A DECISION
 1399  advice(G) [132]  ≈ var out=[], E=G.earth, i, k;
 1532  dismiss(G,key) [1]  ≈ G.dismissed[key]=G.day; return 'ok' }
 1533  undismissAll(G) [1]  ≈ G.dismissed={}; return 'ok' }
```

## ui.js (1791 строк)

```

    5  ## TEXTS
   11  var TXT  ≈ {src:'baked',n:0,at:null};
   12  var TXT_EL  ≈ document.getElementById('lb-texts');
   13  var TXT_BAKED  ≈ JSON.parse(TXT_EL.textContent);
   14  var TXT_URL  ≈ TXT_EL.getAttribute('data-url')||'';
   15  applyTexts(rows,src) [24]  ≈ var T2={UI:{en:{},ru:{}},LOG:{en:{},ru:{}},MSG:{en:{},ru:{}},RES:{en:{},ru:{}},VOICE:{en:{
   41  parseCSV(txt) [13]  RFC 4180 CSV, enough for a Google Sheets export: quoted cells, doubled quotes, newlines in cells
   55  parseTSV(txt) [1]  Google publishes TSV as plain tab-separated lines (no quoting) — the link Nikita shared is ?output=tsv
   56  sheetRows(txt) [14]  ≈ var first=txt.split(/\r?\n/,1)[0]||'';
   70  reloadTexts() [10]  ≈ if(!TXT_URL){ say('textsNoUrl'); return }
   80  textsVisible() [1]  ≈ return !!TXT_URL || /[?&]dev\b/.test(location.search) }
   83  var TONE  ≈ {voice:'vo',shift:'ch',first_landfall:'ch',epitaph:'ch',old_night:'ch',ark_sailed:'ch',ark
   86  var KIND  ≈ {mine:'kMine',farm:'kFarm',well:'kWell',works:'kWorks'};
   87  var KINDD  ≈ {mine:'kMineD',farm:'kFarmD',well:'kWellD',works:'kWorksD'};
   89  var KCOL  v3.7 (Nikita, 23.09): a world is drawn in the colour of what it gives — the same colour its resource has every
   90  var RCOL  ≈ {metal:'#C9CFD6',food:'#3DDC84',fuel:'#FF8A1F',parts:'#F2F1EC',people:'#FFD23F'};
   92  qty(k,n,word) [1]  quantity with its icon, in its colour: the number is never alone
   93  var INK  ≈ '#F2F1EC', INK2='#9C9B95', INK3='#5E5D58', RED='#FF2A1A', RED2='#FFB1A8';
   95  mark(kind,x,y,r,fillc,strokec,sw) [7]  one mark per trade: circle mine, square farm, diamond well, triangle works
  107  toast(html,cls,ms) [5]  v4.9: ship messages stack bottom-right; a dead seam shouts bottom-left. Neither stops the clock.
  112  bigAlert(html,cls,ms) [2]  ≈ var a=el('alert'); if(!a){ a=document.createElement('div'); a.id='alert'; document.body.ap
  114  toastLast() [4]  ≈ var e=G.log[G.log.length-1]; if(!e) return; var tpl=LOG[U.lang][logKey(e)]; if(!tpl) retur
  119  foodWatch() [3]  v4.10 (Nikita, 27.09): rations low and no farm feeding Earth → yellow blinking block, once a shift
  125  var GOOD_CODES  v4.12 (Nikita, 30.09: "когда я нажал кнопку, я хочу видеть подтверждение нажатия и что действие произошло
  126  say(code,p) [9]  ≈ var t=el('toast'); if(!t) return;
  137  var SFX  v4.12: every sound is synthesised — no files. Browsers keep audio shut until the first gesture,
  170  pressFx(x,y,kind) [2]  v4.12: the press mark — a square that blooms where the pointer hit, so a click is seen even when the
  173  attr(v) [1]  v4.12: a blocked button is never mute — off(code,p) marks it, and a click on it says why (see the click handle
  174  off(code,p) [1]  ≈ return (code&&code!=='ok') ? ' aria-disabled="true" data-why="'+attr(code)+'"'+(p?' data-w
  176  shortWhy(c,E) [4]  the first thing Earth is short of, as a why-code with the shortfall
  180  offCost(c,E) [1]  ≈ var w=shortWhy(c,E); return off(w[0],w[1]) }
  182  dico() [1]  v4.12 (Nikita, 30.09: "чтобы буквы стали картинками"): ship classes by silhouette — boat, trawler, container s
  183  sico(cls) [1]  ≈ return '<svg class="sico sico-'+cls+'" aria-hidden="true"><use href="#i-'+cls+'"/></svg>' 
  184  kico(kind,cls) [1]  ≈ return '<svg class="'+(cls||'kico')+'" aria-hidden="true"><use href="#i-k-'+kind+'"/></svg
  185  pico(sym,k) [1]  ≈ return '<span class="pico"><svg class="pi" aria-hidden="true"><use href="#i-'+sym+'"/></sv
  187  var U  ≈ {hist:[], dockOpen:true, pro:{on:false,stage:0,w:null,calls:[],seen:{}}, start:false, lang
  188  var G  ≈ null;
  189  T(k,p) [1]  ≈ var s=(L[U.lang][k]!==undefined?L[U.lang][k]:k);return fill(s,p)}
  190  var YRS  ≈ {en:['year','years','years'],ru:['год','года','лет']};
  191  yrs(n) [3]  ≈ n=Math.abs(Math.round(+n||0)); var a=YRS[U.lang]||YRS.en;
  194  fill(s,p) [3]  ≈ if(!p)return s;return s.replace(/\{(\w+)\}/g,function(_,k){
  198  ico(k) [1]  resource icon + coloured number; the short part of a price goes red
  199  costHtml(c,E,prefix) [7]  ≈ var out=[], keys=['metal','food','fuel','parts','people'];
  206  pname(id) [1]  ≈ var p=planet(id);return p?p.desig+' '+p.name.toUpperCase():id}
  207  n0(x) [1]  ≈ return Math.round(x)}
  208  el(id) [1]  ≈ return document.getElementById(id)}
  210  var HTMLCACHE  v4.8 (Nikita, 27.09: 'игра подтормаживает'): a panel is only rewritten when its markup changed
  211  setHTML(id,html) [1]  ≈ if(HTMLCACHE[id]===html) return false; HTMLCACHE[id]=html; el(id).innerHTML=html; return t
  212  esc(s) [1]  ≈ return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c

  214  ## THE OPENING: SIX CARDS, WHY THE DESK EXISTS
  219  var OPEN_N  ≈ 6;
  220  openStart() [1]  ≈ U.opening=true; U.openStep=0; U.start=false; U.intro=false; }
  221  openDone() [1]  ≈ U.opening=false; U.openStep=0; U.start=true; }
  222  openNext() [1]  ≈ if(U.openStep<OPEN_N-1) U.openStep++; else openDone(); }
  223  openArt(i) [32]  www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';

  255  ## THE PROLOGUE: "FIRST LINE"
  261  var PRO_STEPS  ≈ 6;
  262  proPick() [4]  ≈ var w={}; PLANETS.forEach(function(p){ if(p.sec!==0) return; if(!w[p.kind]||p.dist<w[p.kin
  266  proStart() [4]  ≈ U.pro={on:true,stage:0,w:proPick(),calls:['cPeople'],seen:{}};
  270  proEnd() [1]  ≈ U.pro.on=false; U.pro.stage=PRO_STEPS; G.safe=false; U.pro.calls=['cAdvisor']; var m=0; fo
  271  proOn() [1]  ≈ return U.pro.on }
  272  proStage() [1]  ≈ return U.pro.on?U.pro.stage:PRO_STEPS }
  274  proSee(what) [9]  what the player may see at this stage
  283  proWorldVisible(pid) [5]  ≈ if(!U.pro.on||U.pro.stage>=5) return true;
  288  proLined(pid) [1]  ≈ return G.ships.some(function(s){return s.mode!=='dead'&&s.from===pid}) }
  289  proFree() [1]  ≈ return G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)}
  290  proUpdate() [13]  ≈ var P=U.pro; if(!P.on) return;
  304  proTask() [22]  the task card: what to do now, and how long the wait is
  326  drawTask(box) [11]  ≈ var t=proTask(), s=U.pro.stage;
  338  railsAllow(ev) [10]  stages 0–1 are on rails: only these clicks go through
  349  var CALL_ANCHOR  callouts: one at a time, anchored to the thing they explain
  350  drawCallout() [20]  ≈ var old=el('callout'); if(old) old.remove();
  371  foundPreview(p,n) [6]  previews: what the order will do, before the button is pressed
  377  linePreview(p,s) [4]  ≈ var dep=p.kind==='works'?'parts':p.dep;

  383  ## PERSONAL FILES
  389  var VOICE_GAP  ≈ 50, CAPT_TENURE=30;
  390  hash32(a,b) [1]  ≈ var h=(a|0)^0x9E3779B9; h=Math.imul(h^(b|0),0x85EBCA6B); h^=h>>>13; h=Math.imul(h,0xC2B2AE
  391  personName(seed) [1]  ≈ var pool=(T('names')||'').split(/\s+/).filter(Boolean); if(!pool.length) return '—'; retur
  392  serviceNo(seed) [1]  ≈ return 1000+(Math.abs(hash32(seed,77))%9000) }
  393  voiceKeys(trigger) [1]  ≈ return Object.keys(VOICE.en||{}).filter(function(k){ return k.indexOf(trigger+'.')===0 }) 
  394  voice(trigger,role,d,o) [13]  ≈ o=o||{}; var keys=voiceKeys(trigger); if(!keys.length) return;
  407  voiceLine(e) [1]  ≈ var v=VOICE[U.lang]||{}; var d={}; for(var q in e.d.d) d[q]=e.d.d[q]; if(d.p&&planet(d.p))
  409  voiceWatch() [47]  what the log said since last time, and who answers it
  457  drawPortrait(cv,seed) [40]  the face: 64×64, bone on black, ordered dither — nobody drew it, and it is different every time
  497  drawPF() [15]  ≈ var old=el('pf'); if(old) old.remove();

  513  ## MAP GEOMETRY
  514  var STARS  ≈ null;
  515  starfield() [9]  ≈ if(STARS) return STARS;
  524  var CX  ≈ 500, CY=350;
  525  nodeXY(n) [1]  ≈ if(!n) return null; if(n==='earth') return {x:CX,y:CY}; var pp=planet(n); return pp?pos(pp
  526  pos(p) [4]  ≈ var R=SECTORS[p.sec].r;

  531  ## THE VIEWPORT
  538  var VIEW  ≈ {x:0,y:0,w:1000,h:700}, VFIT=true, VSECS=-1, MAPDRAGGED=false;
  539  viewFit() [11]  ≈ var R=secRadius(Math.max(0,SECTORS.length-1))+58;
  550  viewZoom(f,ax,ay) [7]  ≈ var w=Math.max(280,Math.min(9000,VIEW.w*f));
  557  viewPt(ev) [7]  the viewBox is letterboxed by preserveAspectRatio=meet: find the real scale
  565  drawMap() [125]  ≈ var s='', i, p, xy;

  691  ## HEADER / RESOURCES / LOG
  692  drawHeader() [28]  ≈ var E=G.earth;
  722  arkHead() [20]  v4.0: what the second date says. null before the Night has a date.
  746  var TREND_YEARS  v3.7 (Nikita, 23.09): a resource that is being spent faster than it comes in must say so.
  747  trendTick() [7]  ≈ var E=G.earth, h=U.hist;
  754  trend(k) [6]  ≈ var h=U.hist; if(h.length<6) return null;
  760  trendHtml(k,extra) [7]  ≈ var t=trend(k);
  767  drawRes() [13]  ≈ var E=G.earth;
  781  var TRAFFIC  ≈ {kit_loaded:1,pickup:1,delivered:1,launch_colony:1,launch_evac:1,launch_search:1,launch_pu
  782  drawLog() [27]  G.log is capped at 400 and shifts; track "seen" by a running count of entries ever logged
  810  logKey(e) [1]  shift lines rotate between variants so a long calm run does not read as one sentence pasted ten times
  811  logLine(e,tpl,d,isNew) [5]  ≈ var ch=TONE[e.code]==='ch';
  817  chronLines(k) [8]  the last k chronicle lines, for the epilogue
  825  logSeen() [1]  ≈ var m=0; for(var i=0;i<G.log.length;i++) if((G.log[i].seq||0)>m) m=G.log[i].seq; U.logSeen

  827  ## RAIL
  828  freeHulls() [1]  ≈ return G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!s.mutiny})}
  829  var ROMAN  ≈ ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
  830  roman(n) [1]  ≈ return ROMAN[n]||String(n+1) }
  831  hullName(h) [1]  ≈ return T(h.key)+' '+roman(h.gen||0) }
  832  nodeName(n) [1]  ≈ return n==='earth'?T('earthNode'):planet(n).name.toUpperCase()}
  833  aliveHulls() [1]  ≈ return G.ships.filter(function(s){return s.mode!=='dead'&&s.mode!=='missing'})}
  835  drawAdvice() [29]  ≈ var box=el('advisor'); if(!box) return;
  866  shipChips(list) [20]  clickable pickers that survive a redraw, unlike a native <select>
  887  assignable(pid) [4]  the hulls a world can actually be given: free at Earth and rated for its sector
  891  busyFarLine(pid) [8]  ≈ var p=planet(pid); if(!p) return '';
  901  blk(title,body,tag) [1]  ≈ return '<div class="blk"><h3><span>'+title+'</span>'+(tag||'')+'</h3><div class="bd">'+bod
  902  row(k,v,cls) [1]  ≈ return '<div class="row"><span>'+k+'</span><b'+(cls?' class="'+cls+'"':'')+'>'+v+'</b></di
  904  railEarthPro() [19]  ≈ var E=G.earth, h='', st=U.pro.stage;
  923  railEarth() [123]  ≈ if(U.pro.on) return railEarthPro();
 1048  seamYears(pid) [2]  v4.10 (Nikita, 27.09: 'слишком много непонятных цифр'): the seam is told in years at the current pace, not uni
 1052  pileBar(p,c,dep) [8]  v4.11 (Nikita, 28.09): a bar for the pile, and the slice one hull takes per trip — the picked hull if one is
 1062  pickCourier(pid) [6]  v4.18 (Nikita, 04.10: 'при эвакуации снимал население только курьер. Любой свободный по нажатию назначается'):
 1068  evacInfo(p,c) [6]  ≈ var evg=G.ships.some(function(o){return o.job==='evac'&&o.dest===p.id&&o.mode==='transit'}
 1076  depletedBlock(p,c) [8]  v4.17 (Nikita, 04.10: 'когда планета истощается, то блокируется всё. Можно только нажать эвакуировать'): a spe
 1084  lineGenBox(max) [8]  ≈ if(!max) return '';
 1092  railTarget() [117]  ≈ if(!U.sel) return blk(T('tabTarget'),'<div class="dim">'+T('selectPlanet')+'</div>');
 1210  lineBlock(p,c) [42]  v4.6: the line as a standing order — 'two haulers here'; the yards do the rest
 1253  supplyRow(label,have,rate,bad) [6]  ≈ var d=Math.floor(have/Math.max(0.001,rate));
 1259  fldNum(id,label,val) [3]  ≈ return '<label class="fld2"><span>'+label+'</span><input id="'+id+'" value="'+val+'"></lab
 1262  tog(id,label,on) [3]  ≈ return '<button type="button" class="tg'+(on?' on':'')+'" id="'+id+'" data-tog="1" aria-pr
 1265  shipState(s) [7]  ≈ if(s.mode==='building') return fill(T('mBuild'),{n:s.t});
 1272  railWorlds() [23]  ≈ var keys=Object.keys(G.colonies).filter(proWorldVisible);
 1296  drawDock() [34]  the yard dock, bottom-left of the chart: build, scrap, and the ark, without scrolling the rail
 1331  layoutPanels() [10]  the advisor may grow down, the dock may grow up; neither may cover the other
 1341  drawRail() [7]  ≈ if(U.tab==='fleet') U.tab='worlds';
 1349  showLog() [7]  ≈ var box=el('logbox'); if(!box) return;
 1358  saveLog() [8]  v4.11 (Nikita, 28.09: 'экспорт JSON-файла'): the page asks the viewer to save the file; where the runtime is a
 1366  copyLog() [6]  ≈ var ta=el('logtxt'); ta.focus(); ta.select();
 1372  drawLang() [4]  ≈ var b=el('lang'); if(!b) return;
 1376  drawIntro() [78]  ≈ var b=el('intro'); if(!b) return;
 1454  drawOverlay() [29]  ≈ var o=el('ov');

 1484  ## V4.17 (NIKITA, 04.10, BATCH 2)
 1487  hullProgress(s) [1]  ≈ var h=HULLS[s.hull], tot=Math.max(1,h?h.days:1); return Math.max(0,Math.min(1,1-(s.t||0)/t
 1488  cargoTxt(s) [1]  ≈ var out=[]; ['metal','food','fuel','parts','people'].forEach(function(k){ var v=s.cargo&&s
 1489  fleetRow(s) [15]  ≈ var h=HULLS[s.hull], cls=h.key, free=s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to), st,
 1504  fleetBody() [14]  ≈ var ships=G.ships.filter(function(s){return s.mode!=='dead'});
 1518  genTrack(sel,max) [5]  ≈ var out='<div class="gtrack" data-gtrack="1" data-max="'+max+'" role="slider" aria-valuemi
 1523  lineGenSel() [1]  ≈ var g=(U.lineGen===undefined||U.lineGen===null)?(G.gen||0):U.lineGen; return Math.max(0,Ma
 1524  setLineGen(g,max) [1]  ≈ g=Math.max(0,Math.min(max,g)); if(U.lineGen===g) return; U.lineGen=(g>=(G.gen||0))?null:g;
 1525  genFromX(x) [2]  ≈ var t=document.querySelector('.gtrack'); if(!t) return; var max=+t.dataset.max, r=t.getBou

 1527  ## V4.16 (NIKITA, 04.10: 'ИНТЕРФЕЙС — САМАЯ ГЛАВНАЯ ЧАСТЬ ФИДБЕКА')
 1530  freeWorlds() [1]  ≈ var out=[]; for(var i=0;i<PLANETS.length;i++){ var p=PLANETS[i]; if(!sectorOpen(G,p.sec)) 
 1531  speedTxt(hl) [1]  ≈ return (hl.speed*driveSpeed(G)/(MS[1]/1000)).toFixed(2)+' '+T('speedUnit') }
 1532  freeFor(cls,pid,gen) [1]  ≈ var p=planet(pid), n=0; G.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&!
 1533  assignChips(s) [6]  ≈ var out=''; for(var k in G.colonies){ var c=G.colonies[k]; if(c.dark) continue; var p=plan
 1539  freeHullsBlock(p) [8]  ≈ var hs=assignable(p.id).filter(function(s){return !s.retire&&!s.pend});
 1547  watchRings() [6]  ≈ if(U.gk!==G){ U.gk=G; U.genSeen=G.gen||0; U.newGen=null; U.noFreeAt=null }
 1553  showNoFree() [5]  ≈ var d=document.createElement('div'); d.id='nofree';
 1558  closeNoFree() [1]  ≈ var d=el('nofree'); if(d&&d.parentNode) d.parentNode.removeChild(d); if(U.nfResume){ U.pau
 1559  drawSign() [15]  ≈ var e=el('ringsign'); if(!e) return;
 1574  draw() [1]  ≈ proUpdate();voiceWatch();watchRings();drawHeader();drawMap();drawRes();drawLog();drawRail(

 1582  ## ACTIONS
 1585  pick(pid) [4]  v4.14 (Nikita, run 398763448: 15 of 15 evacuations answered 'not at Earth'): the picked hull is only honoured 
 1589  tgOn(id) [1]  ≈ var e=el(id);return e&&e.classList.contains('on')?1:0}
 1590  num(id,d) [1]  ≈ var e=el(id);if(!e)return d;var v=parseInt(e.value,10);return isNaN(v)?d:Math.max(0,v)}

 1717  ## THE MAP IS PANNABLE AND ZOOMABLE

 1750  ## LOOP
 1754  var MS  v4.2 (Nikita, 24.09: "игра слишком быстрая — сообщения не читаются"): the old clock ran a whole
 1755  frame(ts) [25]  ≈ if(!U.last) U.last=ts;
 1781  start(seed) [7]  ≈ G=newGame(seed||undefined);
```

