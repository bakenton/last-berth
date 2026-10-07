/* LONG NIGHT — core simulation. No DOM. Pure state + pure-ish mutators. */

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- the chart builds itself ----------
   Sectors are generated on demand and never run out. Each one sits further
   out, digs richer and kills more often than the last. Sector 0 is gentle
   on purpose: it is where the player learns the loop. */
var SECTORS=[];
var PLANETS=[];
/* v4.21 (F-21): the chart is cut into six lobes of 60 degrees, the sides of the world. Lobe 0 is centred on twelve o'clock; ang grows clockwise on screen. */
var LOBES=6, LOBE_ARC=Math.PI*2/6;
function lobeOf(ang){ var a=((ang+LOBE_ARC*2)%(Math.PI*2)+Math.PI*2)%(Math.PI*2); return Math.floor(a/LOBE_ARC)%LOBES }
function lobeEdge(i){ return -LOBE_ARC*2+i*LOBE_ARC }
function lobeMid(i){ return -Math.PI/2+i*LOBE_ARC }

/* v4.21 (Nikita, 06.10): rings carry a number and the name of an Italian figure — generals, artists, politicians, Romans. The pool is long;
   past its end the names come round again with a numeral, so the chart never runs out. */
var RING_NAMES=['Caesar', 'Augustus', 'Scipio', 'Cicero', 'Cato', 'Brutus', 'Sulla', 'Marius', 'Pompey', 'Agrippa', 'Trajan', 'Hadrian', 'Vespasian', 'Constantine', 'Seneca', 'Virgil', 'Ovid', 'Horace', 'Livy', 'Tacitus', 'Pliny', 'Aurelius', 'Gracchus', 'Cincinnatus', 'Fabius', 'Camillus', 'Crassus', 'Lepidus', 'Tiberius', 'Claudius', 'Dante', 'Petrarch', 'Boccaccio', 'Giotto', 'Leonardo', 'Michelangelo', 'Raphael', 'Botticelli', 'Titian', 'Donatello', 'Brunelleschi', 'Caravaggio', 'Bernini', 'Tintoretto', 'Veronese', 'Canaletto', 'Machiavelli', 'Medici', 'Borgia', 'Sforza', 'Galileo', 'Columbus', 'Vespucci', 'Polo', 'Garibaldi', 'Cavour', 'Mazzini', 'Crispi', 'Giolitti', 'Gasperi', 'Verdi', 'Vivaldi', 'Puccini', 'Rossini', 'Paganini', 'Monteverdi', 'Fermi', 'Marconi', 'Volta', 'Galvani', 'Colleoni', 'Gattamelata', 'Montefeltro', 'Malatesta', 'Doria', 'Cadorna', 'Savoy', 'Mantegna', 'Bellini', 'Giorgione', 'Masaccio', 'Cimabue', 'Correggio', 'Parmigianino', 'Tiepolo', 'Modigliani', 'Canova', 'Cellini', 'Gramsci', 'Moro', 'Berlinguer', 'Alberti', 'Palladio', 'Bramante', 'Vasari', 'Cabot', 'Torricelli', 'Cassini', 'Cesalpino', 'Ariosto', 'Tasso', 'Goldoni', 'Manzoni', 'Leopardi', 'Carducci', 'Pirandello', 'Fellini'];
var W_NAMES=['Tallow','Brine','Cinder','Marrow','Solace','Vesper','Gallows','Ferrous','Hollow','Threnody','Kiln','Lantern',
 'Tinder','Ossuary','Harrow','Wick','Pale','Grist','Anvil','Vigil','Loam','Sallow','Cairn','Ember',
 'Mire','Tallowfen','Rook','Quarrel','Dross','Scupper','Bracken','Gannet','Sump','Fallow','Reave','Clinker',
 'Winnow','Barrow','Skein','Tarn','Flense','Culvert','Nettle','Scrim','Lees','Chaff','Coom','Slake'];
var DESIGS=['LV','HD','NR','KX','QT','ZD','BC','GR','TS','WN','PX','MV','AR','EL','SH','UM'];

function secName(i){ var n=RING_NAMES.length, cyc=Math.floor(i/n), nm=RING_NAMES[i%n].toUpperCase(); return (i+1)+' · '+nm+(cyc?' '+(['','II','III','IV','V','VI','VII','VIII','IX','X'][cyc]||(cyc+1)):'') }
function secRadius(i){ return 170+i*88 }

/* every sector gets one of each trade, so the player is never starved of fuel
   the way the hand-built chart starved them (one well in twelve worlds). */
function genSector(rnd, i){
  var kinds = ['mine','mine','farm','well','works'];
  if(rnd()<0.62) kinds.push(rnd()<0.62?'mine':'farm');
  var inner = 16+i*46, outer = 46+i*62;
  var worlds=[], used=[];
  for(var j=0;j<kinds.length;j++){
    var t=(j+rnd()*0.7)/kinds.length;
    var ang=(t*Math.PI*2+rnd()*0.4)%(Math.PI*2);
    var dist=Math.round(inner+(outer-inner)*(0.25+rnd()*0.75));
    var kind=kinds[j];
    var rich = (0.75+i*0.62)*(0.80+rnd()*0.55);
    var hab  = kind==='farm' ? 0.65+rnd()*0.32 : (kind==='works'? 0.12+rnd()*0.22 : 0.18+rnd()*0.45);
    var haz  = Math.min(0.42, 0.04+i*0.031+rnd()*0.07);
    worlds.push({sec:i, dist:dist, kind:kind, rich:+rich.toFixed(2),
                 hab:+hab.toFixed(2), haz:+haz.toFixed(2), ang:+ang.toFixed(3),
                 dep: kind==='mine'?'metal':(kind==='farm'?'food':(kind==='well'?'fuel':'parts'))});
  }
  worlds.sort(function(a,b){return a.dist-b.dist});
  return worlds;
}

/* Appends one more sector to the chart. Called at world-gen and on every survey. */
function openSector(G){
  var i=SECTORS.length;
  var rnd=mulberry32((G.seed^0x9E3779B9)+i*7919);
  SECTORS.push({name:secName(i), r:secRadius(i)});
  var ws=genSector(rnd,i);
  for(var j=0;j<ws.length;j++){
    var w=ws[j], n=PLANETS.length;
    w.id='w'+n;
    w.name=W_NAMES[n%W_NAMES.length]+(n>=W_NAMES.length?' '+(Math.floor(n/W_NAMES.length)+1):'');
    w.desig=DESIGS[(n*5+i)%DESIGS.length]+'-'+(1+(n*7)%97);
    PLANETS.push(w);
    if(G.reserves) G.reserves[w.id]= w.kind==='works' ? Infinity
      : Math.round(w.rich*K.RESERVE_BASE*Math.pow(K.RESERVE_GROW,i)*(w.kind==='farm'?1.5:1));
  }
  G.sectors=SECTORS.length;
  return i;
}

/* what it costs to push the chart one sector further out */
function surveyCost(n){
  return { metal: Math.round(140*Math.pow(1.40,n)),
           food:  Math.round(400*Math.pow(1.52,n)),
           fuel:  Math.round(210*Math.pow(1.48,n)),
           parts: Math.round(40*Math.pow(1.50,n)),   // v3.2: parts were the one gate on every survey
           people: Math.round(K.SURVEY_PEOPLE*Math.pow(K.SURVEY_PEOPLE_GROW,n)) };
}
/* v3.2: the chart is no longer bounded by what the fleet can reach. You may
   chart a sector you cannot yet fly to — seeing the prize before you can take
   it is the pressure the drive programme is supposed to relieve. */
function canSurvey(G){
  var n=SECTORS.length, c=surveyCost(n), E=G.earth;
  if(settledCount(G)<K.SURVEY_REACH*n) return 'settled';
  if(E.metal<c.metal) return 'metal';
  if(E.food<c.food) return 'food';
  if(E.fuel<c.fuel) return 'fuel';
  if(E.parts<c.parts) return 'parts';
  if(E.people-K.EARTH_KEEP<c.people) return 'people';
  return 'ok';
}
function survey(G){
  var chk=canSurvey(G); if(chk!=='ok') return chk;
  var c=surveyCost(SECTORS.length);
  G.earth.metal-=c.metal; G.earth.food-=c.food; G.earth.fuel-=c.fuel; G.earth.parts-=c.parts;
  G.earth.people-=c.people;                       // the survey party stays out there
  G.ledger.metalSurvey=(G.ledger.metalSurvey||0)+c.metal;
  G.ledger.peopleSurvey=(G.ledger.peopleSurvey||0)+c.people;
  var i=openSector(G);
  G.pauseNow=true;
  log(G,'surveyed',{s:secName(i)});
  if(i===5) log(G,'old_night',{});
  return 'ok';
}

/* ---------- hull generations ----------
   Three hulls per generation: small/fast/cheap, middle, big/slow/dear. Each
   generation costs about x5 the last, carries x2.6, and is the ONLY way to
   reach the sectors beyond the previous generation's range. Old hulls keep
   flying where they always flew, but the yards stop building them — that is
   the OpenTTD rule, and it is what makes the game feel like it has eras. */
/* v4.5 (Nikita, 26.09, run 768210301: 'курьеры 5–6 поколений имбовые, тягачи и грузовозы бессмысленны'):
   every class used to grow its hold ×2.4 a generation, so a Generation V courier was a Generation II hauler
   with a courier's speed. Now the classes grow apart — grow: hold per generation; burn: fuel per departure
   relative to a courier (a freighter drinks more per trip, far less per ton). */
var HULL_BASE=[
  {key:'courier',  cap:70,  speed:1.70, metal:40,  fuel:14,  parts:0,  days:7,  reach:0, crew:8,  grow:1.9, burn:1.0},
  {key:'hauler',   cap:240, speed:1.05, metal:130, fuel:45,  parts:26, days:13, reach:3, crew:20, grow:2.4, burn:1.6},
  {key:'freighter',cap:760, speed:0.80, metal:320, fuel:120, parts:85, days:21, reach:6, crew:45, grow:2.8, burn:2.2}
];
var HULLS=[];
function genHull(gen,j){
  var b=HULL_BASE[j], g=gen;
  return {id:HULLS.length, key:b.key, gen:g,
    cap:Math.round(b.cap*Math.pow(b.grow||K.GEN_CAP,g)),   // v4.5: per class
    burn:b.burn||1,
    speed:+(b.speed*Math.pow(K.GEN_SPEED,g)).toFixed(2),
    metal:Math.round(b.metal*Math.pow(K.GEN_COST,g)),
    fuel:Math.round(b.fuel*Math.pow(K.GEN_FUEL,g)),
    parts:Math.round((b.parts||(g?12:0))*Math.pow(K.GEN_PARTS,g)),
    crew:Math.round(b.crew*Math.pow(K.GEN_CREW,g)),
    days:b.days+g*4, reach:g?0:b.reach};
}
function ensureGen(gen){ while(HULLS.length<(gen+1)*3){ var g=Math.floor(HULLS.length/3); for(var j=0;j<3;j++) HULLS.push(genHull(g,j)); } }
/* ---------- range ----------
   v3.2 (Nikita, 22.09): range used to depend on generation alone, with a step of
   +3 sectors per mark. Drive marks arrive faster than the chart grows — mark II
   landed on day 350 of his run with two sectors on the board — so the limit was
   never once reached in 1843 days. It was dead code, and with it the courier was
   strictly the best hull per metal (968 hold / 1310 metal against the hauler's
   3318 / 4260), so 28 of his 36 hulls were couriers.
   Now the CLASS carries the range and the generation shifts it: a small fast
   courier is a short-legged hull, a freighter is the one with the tankage.
   The frontier belongs to the big hulls; the inner rings are courier work. */
var CLASS_RANGE={courier:1, hauler:2, freighter:3};
function classRange(key,gen){ return (CLASS_RANGE[key]||1)+gen }
function hullRange(h){ return h? classRange(h.key,h.gen||0) : 0 }
/* the furthest sector ANY hull of this generation can fly to (the freighter) */
function sectorLimit(gen){ return classRange('freighter',gen) }
function hullGen(s){ return (HULLS[s.hull]&&HULLS[s.hull].gen)||0 }
function shipRange(s){ return hullRange(HULLS[s.hull]) }
function canReachSector(s,sec){ return sec<=shipRange(s) }
/* cheapest class that can serve a sector at this generation; null = nothing can */
function classFor(sec,gen){
  var order=['courier','hauler','freighter'];
  for(var i=0;i<order.length;i++) if(classRange(order[i],gen)>=sec) return order[i];
  return null;
}
/* generation needed before any hull can reach this sector */
function genForSector(sec){ return Math.max(0, sec-CLASS_RANGE.freighter) }

var K={
  APPETITE:520,        // Earth's daily burn grows with the calendar
  DECAY_KNEE:2400,     // ...and then faster than linear, so no plateau is ever safe
  EVENT_CHANCE:0.006,  // roughly one event every 170 days per run
  EARTH_EAT:3.4,       // rations Earth burns every day per baseline crew
  EARTH_BURN:1.0,      // metal Earth burns every day per baseline crew (v4.23: 2.6 -> 1.0, linear age; Nikita 07.10)
  STARVE_KILL:0.045,   // share of Earth's people lost per day with empty larders
  MEND:0.004,          // share of the dead made good per day once fed again
  QUOTA_PERIOD:40,
  Q_METAL:55, Q_FOOD:45, Q_PARTS:26, Q_PARTS_FROM:5, Q_GROW_M:1.105, Q_GROW_F:1.115, Q_GROW_P:1.12,
  EARTH_DECAY:0.96,
  EARTH_METAL:3.2, EARTH_FOOD:4.3, EARTH_FUEL:1.6, EARTH_PEOPLE:2.0,   // v4.8 (Nikita, 27.09, run 468256117: people stuck at ~80 from year 1400, 14 worlds, cannot expand) 1.5 → 2.0
  EARTH_CREW:70,       // hands at home that give Earth its baseline output
  /* v3.3 (Nikita, 22.09: "людей как-то копится много, будто бы они нафиг не нужны").
     Earth's output used to cap at x1.55, which is reached at 260 hands; his run
     sat at 1377 for the last 1200 days with every extra hand doing nothing, and
     nothing ever spent them. Now hands are the third currency: a hull holds its
     crew for its whole service life, a survey burns a party outright, and the
     output curve keeps paying, with diminishing returns and no ceiling worth
     hitting. Hands at home or hulls in the dark - that is the decision. */
  GEN_CREW:1.6,        // crew per hull scales with the generation, like everything else
  OUT_MAX:1.05, OUT_K:260,   // output = 1 + OUT_MAX*(1-e^(-hands/OUT_K)); matches the old curve at 260
  SURVEY_PEOPLE:40, SURVEY_PEOPLE_GROW:1.35,   // a survey party does not come back
  /* ---- the Long Night (v3.4, Nikita 23.09) ----
     The run used to have no end but starvation. Now the sun is dying on a
     schedule. The date is not known from the start: it is the deep survey (the
     third sector) that brings back the spectra, and from that moment the desk
     has NIGHT_YEARS to build an ark. The ark leaves on the day with whoever is
     standing at home. Hands on hulls, hands on colonies, hands in transit stay.
     So the last act of the game is taking the empire apart: lines released,
     colonies lifted, hulls broken up so their crews walk home. Score = souls. */
  NIGHT_TRIGGER_SECTORS:3, NIGHT_TRIGGER_YEAR:1000,   // dated on the third sector, or by year 1000 regardless
  NIGHT_YEARS:3300,                                   // v4.4 (Nikita 25.09, run 381774366: drive IV at 1794, Night 2994 — 1200 empty years): ×1.5, filled by kits
  ARK_ABOVE:2,                                        // v4.4: the ark drive is this many marks above the one you hold on the day of the date (was 1)
  NIGHT_NEAR:400,                                     // the desk pauses again this close to the end
  DUSK_YEARS:1000,                                    // v4.1: inside this the chronicle turns to the end
  DOOMSDAY_AT:900,                                    // v4.1: the desk logs what Earth has become, once
  /* v3.6 (Nikita, 23.09: "добавить нарратива или стиля"): the chronicle. The desk is an
     institution; every SHIFT_YEARS a new shift takes it and writes one line about what it
     inherited. Lifted worlds get an epitaph, the ark and the famine get a last entry.
     No characters, no dialogue — the log is the story. */
  SHIFT_YEARS:80,
  /* v4.24 (Nikita, 07.10, F-22 trial): the ark is four levels at a fixed price in four resources, seen before it is chosen.
     Two ways to pay: deposits (Earth sets aside an even share every year until the Night) or one purchase with a bulk
     discount. Everyone at home sails; the level only sets how much of what is left on Earth rides along (cap).
     Prices and caps are PROVISIONAL (balance run 07.10: metal at the Night 8-73k for survivors after v4.23). */
  ARK_LEVELS:[
    {metal:1500, parts:300,  food:1000, fuel:800,  cap:{metal:500,  parts:500,  food:1500, fuel:1500}},
    {metal:4000, parts:600,  food:2500, fuel:1800, cap:{metal:1500, parts:1200, food:3000, fuel:3500}},
    {metal:9000, parts:1200, food:5000, fuel:3500, cap:{metal:3000, parts:2500, food:6000, fuel:6000}},
    {metal:18000,parts:2500, food:9000, fuel:6500, cap:{metal:6000, parts:5000, food:9000, fuel:10000}}],
  ARK_BULK:0.85,                                      // buying a level outright costs this share of the price
  ARK_FLOOR_YEARS:15,                                 // deposits never take Earth's metal or rations below this many years of its own burn
  PROD:0.105,
  REFINE:0.075,        // parts per pop per rich per day on a works world
  REFINE_COST:1.2,     // metal burned per part
  REFINE_METAL:1.0,    // metal burned per part
  REFINE_FOOD:0.4,     // rations burned per part
  FARM_RATE:0.55,      // rations come easily; they should not flood Earth
  POP_BASE:35, POP_HAB:70,   // a world's carrying capacity
  EXPORT_AT:55,        // (unused; kept so old saves parse)
  EARTH_KEEP:25,       // hands Earth will never ship out
  UPKEEP:0,        // metal every colony burns per pop per day just to function
  STARVED_OUT:0.60,    // output multiplier when a colony has no metal on site
  STARVED_GRACE:15,    // days a colony coasts on scrap before output drops
  WORKS_LOCAL:0.006,   // token local scrap only; a factory lives on what you haul in
  EAT:0.025,           // notional ration size, used for display only
  GROW:0.0055,         // pop growth per day when calm
  STORE_CAP:400,
  FUEL_PER_DIST:0.135, // charged on every departure (a long line drinks fuel)
  MIN_FOUND:10,
  RESERVE_BASE:2100, RESERVE_GROW:2.15,   // a seam in sector n holds BASE * GROW^n * richness
  SURVEY_REACH:3,      // reach needed per sector already open before the next can be charted
  DEAD_DAYS:260,       // days of famine before the home world is finished
  DRIVE_STEP:1.55,     // each drive mark cuts crossing times again
  /* v4.2 (Nikita's run 820909096: "13k for a freighter is unreachable"): metal cost used to grow x3.2 a
     generation against x2.4 hold, so every new generation was a worse hull per metal and he bought
     couriers for 2800 years. Metal now grows with the hold; the gate on late generations is parts,
     which sat at 12k unused in that run. Bots: pro 38.4 -> 46.9, invariant holds. Claude — awaiting review. */
  GEN_CAP:2.4, GEN_SPEED:1.12, GEN_COST:2.4, GEN_FUEL:2.2, GEN_PARTS:3.4,   // hull generation scaling
  SCRAP_METAL:0.5, SCRAP_PARTS:0.35,   // what the breakers pay
  GEN_OVERLAP:1,       // a generation stays buildable this many generations after the next one lands
  /* range now lives in CLASS_RANGE above: sector limit = class base + generation */
  DRIVE_WORK:110, DRIVE_WORK_GROW:2.4,    // parts-worth of work per mark, and how fast that grows
  DRIVE_REACH:4, DRIVE_REACH_GROW:4,      // reach needed for mark 1, and per mark after
  DRIVE_POP:25,        // an industrial world needs this much labour to host the programme
  DISMISS_YEARS:150,   // v3.8.1: how long a dismissed warning stays quiet
  /* v4.20 (Nikita, 06.10, F-21 'Pulse of the empire'): the middle of the game gets crises. Earth announces that for PULSE_LEN
     years it will burn PULSE_MULT times its usual of one resource, PULSE_WARN years ahead. Food and metal are the burns Earth
     already has; fuel and parts get a drain of the same size (half / a quarter of the metal burn). An unpaid drain kills hands. */
  DIR_FIRST:600, DIR_GAP_MIN:200, DIR_GAP_MAX:300, DIR_MAX:2, EV_WARN:20, CRISIS_WARN:30, CRISIS_LEN:40, FOLD_SPEED:2, DRAG_SPEED:0.6,
  PULSE_MULT:2, PULSE_SHARE:0.6,
  EARTH_METAL_KEEP:25, // v3.8.1: years of Earth's own burn a works line may not take away
  /* v4.0 — two dates (Nikita, 23.09: "why not just leave at once?" — the technology is not there).
     The ark sails only on a drive of generation ARK_DRIVE_MIN or better, and never on the drive you
     already had when the date came: the spectra and the ark drive are one discovery. The header
     carries two years — the Night, and when that drive is ready at the pace the works are keeping.
     Every generation past the minimum shortens the crossing: ARK_WAKE is the share of sleepers who
     wake at the other end. Score = the ones who wake. Claude — awaiting review. */
  ARK_DRIVE_MIN:3,              // driveLvl 3 = the Generation IV drive in the UI
  ARK_WAKE:[0.6,0.8,1.0],       // minimum drive / +1 / +2 and beyond
  PARTS_EMA:40,                 // years the works-output pace is averaged over for the forecast
  /* v4.2 — mutiny (Nikita, 24.09: "хочу, чтобы суда бунтовали и валили на Землю вопреки приказам").
     A crew can count. When the years left to the Night are fewer than (MUTINY_MIN + temper) round
     trips of its line, the crew refuses the next run and brings the hull home; temper is 0..MUTINY_SPREAD
     from the hull's seed, so two captains on the same line break at different years. A mutinied hull
     docks at Earth, its crew stands on the pier (it boards if there is a berth), and it takes no more
     orders. Only the breakers will have it. Far lines break first. Claude — awaiting review. */
  MUTINY_MIN:1.5, MUTINY_SPREAD:1.5,
  MUTINY_WARN:100,     // v4.27 (Nikita, 07.10: 'за 100 лет до начала бунтов сказать игроку, что дата идёт и суда начнут саботировать'): years before the first refusal the desk is told
  /* v4.4 — extraction kits (Nikita, 25.09, run 381774366: a mine gives 15/yr, Earth burns 20/yr, the ark
     wants 15.7k; the hauler IV at 3318 never fills because a stockyard holds 1200; sector-5 seams last
     15,000 years). A kit is cargo: ordered at Earth, it rides out in the hold of a hull on that world's
     line, and only a hull big enough will carry it. Each tier multiplies what the world makes and what
     its stockyard holds, and burns fuel every year — no fuel on site, the machines stand. */
  KIT_METAL:100, KIT_PARTS:90, KIT_GROW:2.0,   // tier k+1 costs BASE × GROW^k; the kit weighs metal+parts. v4.5: parts, not metal — 20k parts sat idle while Earth had 7 metal
  KIT_MAX:4,
  KIT_OUT:1.6,          // output per tier
  KIT_FUEL:2.2,         // fuel a tier burns per year
  KIT_GRACE:15,         // years the machines run on the dregs before they stop
  KIT_GATE_DRIVE:2,     // the engineering programme opens with the Generation III yards (drive mark 2)
  FEED_BUFFER:1.5,      // v4.4: a line brings what the far end burns until the next hull, times this
  FEED_FUEL_FLOOR:200,  // Earth keeps this much fuel back from the machines
  YARD_KEEP:10,         // v4.6: the yards leave Earth this many years of its own metal burn
  RENEW_SLOTS:2,        // v4.6: successors for old hulls in the yards at once
  /* v4.7 (Nikita, 26.09: 'людей в лейте слишком много' — 1,800 idle at the pier, 3,500 left behind). Two sinks:
     Earth empties (hands per year decay with age), and the crossings kill (a share of every crew is lost per
     round trip and the hull re-crews from the pier before it sails again — no hands, no departure). */
  HANDS_HALF:10000,     // hands per year = EARTH_PEOPLE / (1 + year/HANDS_HALF). v4.8: 4000 → 10000 — the decay was biting by 1500, not in the late game
  CREW_LOSS:0.03,       // share of the crew lost per round trip
  CREW_MIN:0.5,         // a hull sails short-handed down to this share of a full crew
  FOUND_KEEP:10,        // v4.7: a founding party leaves this many hands at home on top of EARTH_KEEP — they crew the hulls. v4.8: 25 → 10
  IDLE_SCRAP:10,        // v4.8: an idle hull a generation behind is scrapped by the yards after this many years on the pier
  /* v4.10 (Nikita, 27.09: 'люди — переменная сама по себе'): births follow the larder — 0.5× on an empty one,
     1.5× with FED_YEARS of rations in store. Colonies do not breed (rule); hazard takes a share every year and
     the line brings replacements. */
  FED_MIN:0.5, FED_MAX:1.5, FED_YEARS:80,
  COLONY_LOSS:0.006,    // share of a colony lost per year per unit of hazard (haz 0.15 → 0.09%/yr; 0.02 starved the bots of settlers)
  FOOD_WARN_YEARS:60    // v4.10: rations below this many years with no farm on a line → the yellow block
};

function planet(id){for(var i=0;i<PLANETS.length;i++)if(PLANETS[i].id===id)return PLANETS[i];return null}

/* how many people a world can hold, and how many it wants before it digs at full rate */
function popCap(p){ return Math.round(K.POP_BASE+K.POP_HAB*p.hab) }
function popWant(p){ return popCap(p) }
/* ---------- v4.4: extraction kits ---------- */
function kitTier(c){ return (c&&c.tier)||0 }
function kitLive(c){ return kitTier(c)>0 && !(c.fuelOut>=K.KIT_GRACE) }          // machines standing = no multiplier
function rateMult(c){ return kitLive(c)? Math.pow(K.KIT_OUT,kitTier(c)) : 1 }
/* v4.5 (Nikita, 26.09: 'не хочу, чтобы ресурсы сгорали'): a world's stockyard has no ceiling. What the
   line does not carry waits; the pace of the world is its tier, not its yard. */
function storeCap(c){ return Infinity }
function kitBurn(c){ return K.KIT_FUEL*kitTier(c) }
function kitCost(c){ var t=kitTier(c)+1, m=Math.round(K.KIT_METAL*Math.pow(K.KIT_GROW,t-1)), p=Math.round(K.KIT_PARTS*Math.pow(K.KIT_GROW,t-1));
  return {tier:t, metal:m, parts:p, w:m+p} }
function kitOpen(G){ return (G.driveLvl||0)>=K.KIT_GATE_DRIVE }
/* the biggest hold on this world's line; 0 if nothing runs there */
function lineHold(G,pid){ var best=0; for(var i=0;i<G.ships.length;i++){ var s=G.ships[i]; if(s.mode==='dead'||s.mode==='missing') continue;
  if((s.from===pid&&s.to==='earth')||(s.to===pid&&s.from==='earth')) best=Math.max(best,s.cap) } return best }
function canKit(G,pid){
  var c=G.colonies[pid]; if(!c) return 'nocolony';
  if(!kitOpen(G)) return 'kitgate';
  if(kitTier(c)>=K.KIT_MAX) return 'tiermax';
  if(c.kit||c.kitShip) return 'kitpending';
  var k=kitCost(c);
  if(G.earth.metal<k.metal) return 'metal';
  if(G.earth.parts<k.parts) return 'parts';
  return 'ok';
}
function orderKit(G,pid){
  var r=canKit(G,pid); if(r!=='ok') return r;
  var c=G.colonies[pid], k=kitCost(c);
  G.earth.metal-=k.metal; G.earth.parts-=k.parts; G.ledger.metalYards+=k.metal;
  c.kit={tier:k.tier,metal:k.metal,parts:k.parts,w:k.w,day:G.day};
  log(G,'kit_ordered',{p:pid,t:k.tier,w:k.w});
  return 'ok';
}
/* what a world burns per year that Earth has to send it: works eat metal and rations, kits eat fuel */
function feedRates(G,node){
  var c=G.colonies[node], p=planet(node), r={}; if(!c||!p) return r;
  if(p.kind==='works'){ var want=c.pop*p.rich*K.REFINE*rateMult(c); r.metal=want*K.REFINE_METAL; r.food=want*K.REFINE_FOOD }
  if(kitTier(c)>0) r.fuel=kitBurn(c);
  return r;
}
/* Earth's own output rides on the people left at home — but only so far.
   Past about 170 hands the extra mouths cost more than the extra work,
   which is the pressure that keeps the player settling worlds forever. */
function fedMult(G){ var nd=G.need||earthNeed(G); var yrs=G.earth.food/Math.max(0.1,nd.food||1); return Math.max(K.FED_MIN,Math.min(K.FED_MAX,K.FED_MIN+yrs/K.FED_YEARS)) }   // v4.10: a fed Earth raises more
function handsRate(G){ return K.EARTH_PEOPLE/(1+G.day/K.HANDS_HALF)*fedMult(G) }   // v4.7: Earth empties
function earthOutput(G){
  var h=Math.max(0,G.earth.people-K.EARTH_CREW);
  return 1 + K.OUT_MAX*(1-Math.exp(-h/K.OUT_K));
}
/* hands currently riding hulls rather than working at home */
function crewOut(G){ var n=0; for(var i=0;i<G.ships.length;i++){ var s=G.ships[i]; if(s.mode!=='dead') n+=(s.crew||0) } return n }
/* v3.9.1 (log 519788167: 1562 hands sat on hulls idle at Earth and were counted as left behind): a crew
   whose hull is docked at Earth is standing on the pier. Only hulls away from Earth keep their crews out. */
function crewAway(G){ var n=0; for(var i=0;i<G.ships.length;i++){ var s=G.ships[i]; if(s.mode==='dead') continue; if(s.mode==='idle'&&s.at==='earth') continue; n+=(s.crew||0) } return n }
function crewDocked(G){ return crewOut(G)-crewAway(G) }
/* G.earth.people is the pool of hands Earth can still put on a ship, not the
   billions living there — so it must NOT drive Earth's appetite, or feeding the
   home world well makes it hungrier and every good run eats itself.
   Appetite rises with the calendar alone, faster than linear, so a chart that
   stops growing eventually starves however rich it got. */
function earthNeed(G){
  var d=G.day;
  var age=1 + d/K.APPETITE + (d/K.DECAY_KNEE)*(d/K.DECAY_KNEE);
  var ageM=1 + d/K.APPETITE;     // v4.23 (Nikita, 07.10): metal is the working currency — its burn grows with the calendar only, not squared (food keeps the squared knee)
  return { food:K.EARTH_EAT*age, metal:K.EARTH_BURN*ageM };
}
/* v4.20: what Earth takes a year while a crisis runs — at least the doubled burn, and PULSE_SHARE of what the empire
   has been bringing home of that resource, so the crisis grows with the empire (a fixed number is nothing to a big one) */
function pulseDrain(G,res){
  var nd=earthNeed(G), base= res==='food'?nd.food : res==='metal'?nd.metal : nd.metal*(res==='fuel'?0.5:0.25);
  return Math.max(base*(K.PULSE_MULT-1), K.PULSE_SHARE*((G.inRate&&G.inRate[res])||0));
}
/* v4.21 (Nikita, 06.10, F-21): the director. Events come in three families, each told before it happens:
     fold  (good)  space in a lobe folds — hulls fly FOLD_SPEED times faster there
     drag  (bad)   space in a lobe thickens — hulls fly DRAG_SPEED times as fast
     storm (bad)   space weather in a lobe — nothing can land there, hulls hold in orbit and the stockyards fill
     crisis (bad)  Earth: a breakdown or lost stores — it burns more of one resource (pulseDrain)
   The chance is random, but leans on how rich the player is: many worlds -> more bad, few -> more good; the good pays more than the bad costs. */
function lobeCount(G,lobe){ var n=0; for(var k in G.colonies){ var p=planet(k); if(p&&lobeOf(p.ang)===lobe) n++ } return n }
function lobeEvents(G,lobe){ var out=[]; var E=(G.dir&&G.dir.ev)||[]; for(var i=0;i<E.length;i++) if(E[i].lobe===lobe) out.push(E[i]); return out }
function activeCrisis(G){ var E=(G.dir&&G.dir.ev)||[]; for(var i=0;i<E.length;i++) if((E[i].type==='crisis'||E[i].type==='spoil')&&E[i].state==='active') return E[i]; return null }
/* how fast a hull moves right now: set by the lobe of the world at the other end of its trip */
function shipSpeed(G,s){
  var node=s.dest==='earth'?s.origin:s.dest; if(!node||node==='earth') return 1;
  var p=planet(node); if(!p) return 1;
  var E=lobeEvents(G,lobeOf(p.ang)), f=1;
  for(var i=0;i<E.length;i++){ if(E[i].state!=='active') continue; if(E[i].type==='fold') f*=K.FOLD_SPEED; else if(E[i].type==='drag') f*=K.DRAG_SPEED }
  return f;
}
function stormAt(G,node){
  if(!node||node==='earth') return false; var p=planet(node); if(!p) return false;
  var E=lobeEvents(G,lobeOf(p.ang)); for(var i=0;i<E.length;i++) if(E[i].type==='storm'&&E[i].state==='active') return true;
  return false;
}
function directorStep(G){
  var D=G.dir; if(!D) D=G.dir={next:K.DIR_FIRST,ev:[],n:0,seq:1};
  var R=G.rnd, i, e;
  for(i=D.ev.length-1;i>=0;i--){ e=D.ev[i];
    if(e.state==='warn'&&G.day>=e.start){ e.state='active'; log(G,e.type+'_start',{lobe:e.lobe,dep:e.res,n:e.end-G.day,id:e.id}) }
    else if(e.state==='active'&&G.day>=e.end){ log(G,e.type+'_end',{lobe:e.lobe,dep:e.res,id:e.id}); D.ev.splice(i,1); D.n++; if(e.type==='crisis'||e.type==='spoil') G.pulseShort=false }
  }
  if(G.day<D.next||D.ev.length>=K.DIR_MAX) return;
  if(G.night&&nightLeft(G)<K.NIGHT_NEAR+K.CRISIS_LEN+K.CRISIS_WARN) return;
  var live=reach(G), w=Math.min(1,live/10), badP=0.35+0.3*w;
  var bad=R()<badP && !G.hungry;                            // no new misfortune while Earth is already starving
  var free=[], k, l;
  for(l=0;l<LOBES;l++) if(!lobeEvents(G,l).length) free.push(l);
  var withCol=free.filter(function(x){return lobeCount(G,x)>0});
  var ev=null, id=D.seq++;
  if(!bad){
    var pool=withCol.length?withCol:[];                       // a fold over empty space helps nobody
    if(pool.length){ var lg=pool[Math.floor(R()*pool.length)]; ev={type:'fold',lobe:lg,warn:K.EV_WARN,len:60+Math.floor(R()*61)} }
  } else {
    var kinds=['crisis'];
    if(withCol.length){ kinds.push('drag'); kinds.push('storm') }
    var kd=kinds[Math.floor(R()*kinds.length)];
    if(kd==='crisis'){
      var opts=['food','metal'];
      if(Object.keys(G.colonies).some(function(k2){ return planet(k2).kind==='well'&&G.reserves[k2]>0 })) opts.push('fuel');
      if((G.partsRate||0)>0.05) opts.push('parts');
      var rs=opts[Math.floor(R()*opts.length)];
      ev={type:rs==='food'?'spoil':'crisis',res:rs,warn:K.CRISIS_WARN,len:K.CRISIS_LEN};   // food: lost stores; the rest: broken infrastructure
    } else {
      // punish where the player is rich: the lobe with the most worlds, ties by chance
      var best=-1, cand=[]; withCol.forEach(function(x){ var c=lobeCount(G,x); if(c>best){best=c;cand=[x]} else if(c===best) cand.push(x) });
      ev={type:kd,lobe:cand[Math.floor(R()*cand.length)],warn:K.EV_WARN,len:kd==='storm'?30+Math.floor(R()*31):60+Math.floor(R()*61)};
    }
  }
  if(!ev){ D.next=G.day+40; return }                         // nothing fit; look again soon
  ev.id=id; ev.state='warn'; ev.start=G.day+ev.warn; ev.end=ev.start+ev.len;
  D.ev.push(ev);
  log(G,ev.type+'_warn',{lobe:ev.lobe,dep:ev.res,y:ev.start,n:ev.len,l:ev.warn,id:id});
  D.next=G.day+K.DIR_GAP_MIN+Math.floor(R()*(K.DIR_GAP_MAX-K.DIR_GAP_MIN+1));
}
/* crossings and signal lag both shrink with every drive mark earned */
function driveSpeed(G){ return 1+ (G.driveLvl||0)*(K.DRIVE_STEP-1) }
function driveWorkFor(G){ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,G.driveLvl||0)) }
function driveReachFor(G){ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*(G.driveLvl||0) }

function newGame(seed){
  seed = seed||((Math.random()*1e9)|0);
  var G={
    seed:seed, rnd:mulberry32(seed), day:0, over:null,
    earth:{metal:430, food:230, fuel:240, parts:0, people:128, lost:0, lostCrew:0,
           pMetal:K.EARTH_METAL, pFood:K.EARTH_FOOD, pFuel:K.EARTH_FUEL},
    colonies:{}, ships:[], orders:[], log:[], nextShip:1, nextMissing:1, lines:{},   // v4.6: standing orders per world
    driveLvl:0, gen:0, drive:null, driveWork:0, sectors:0, dismissed:{}, actions:[], ghost:{}, settled:{},
    night:null, nightSeen:false, ark:{mode:null,target:0,paid:{metal:0,parts:0,food:0,fuel:0},lv:0}, souls:0, arkMark:null, partsRate:0, boarded:0, grounded:false,
    pauseNow:false, ledger:{metalOut:0,metalYards:0,metalIn:0,metalSurvey:0}, reserves:{}, delivered:{metal:0,food:0,fuel:0,parts:0,people:0},
    stats:{founded:0,lost:0,recovered:0,peak:0,mutinies:0}
  };
  SECTORS.length=0; PLANETS.length=0; HULLS.length=0; ensureGen(0);
  openSector(G); openSector(G);              // two sectors to start; the rest are surveyed
  G.earth.people-=HULLS[0].crew*2;             // the two hulls you start with are already manned
  for(var i=0;i<2;i++){G.ships.push({id:G.nextShip++,hull:0,cap:HULLS[0].cap,crew:HULLS[0].crew,mode:'idle',t:0,at:'earth',
    target:null,route:null,auto:true, cargo:{metal:0,food:0,fuel:0,parts:0,people:0},out:{metal:0,food:0,parts:0,people:0}, take:{metal:0,food:0,fuel:0,parts:0},missDays:0,bearing:null,job:null});}
  return G;
}

/* reach = live settlements. The relay used to add +2; it is gone (Nikita, 23.09: orders no longer carry anything, so halving lag bought nothing). */
function reach(G){var r=0;for(var k in G.colonies){r+=1}return r}
/* v4.15 (Nikita, 04.10): the gates on PROGRESS — charting a sector, each drive mark — count worlds EVER settled, not worlds held.
   reach() only falls (seams run dry, the colony is evacuated, a ghost cannot be resettled), so a gate on it closes for good:
   in the v4.14 log (seed 966268745) charting needed 6 live colonies, the run peaked at 6 and never stood there again.
   Hull classes keep reach(). A set, not stats.founded: that counts every founding, so a resettled world would count twice. */
function settledCount(G){ var seen=G.settled||{}, n=0, k; for(k in seen) n++; for(k in G.colonies) if(!seen[k]) n++; return n }
function sectorOpen(G,s){return s<SECTORS.length}
function travelDays(G,dist,ship){
  var sp=(ship&&HULLS[ship.hull]&&HULLS[ship.hull].speed)||1;
  return Math.max(1,Math.round(dist/(sp*driveSpeed(G))));
}
function legDays(G,a,b,ship){ return travelDays(G,legDist(a,b),ship) }
function legDist(a,b){
  if(a===b) return 0;
  if(a==='earth') return planet(b).dist;
  if(b==='earth') return planet(a).dist;
  var pa=planet(a), pb=planet(b);
  var ax=Math.cos(pa.ang)*pa.dist, ay=Math.sin(pa.ang)*pa.dist;
  var bx=Math.cos(pb.ang)*pb.dist, by=Math.sin(pb.ang)*pb.dist;
  return Math.max(6, Math.round(Math.sqrt((ax-bx)*(ax-bx)+(ay-by)*(ay-by))));
}

function needsOf(G,node){
  if(node==='earth') return null;
  var p=planet(node), c=G.colonies[node], out=[];
  if(p.kind==='works') out.push('metal','food');
  if(c&&kitTier(c)>0) out.push('fuel');               // v4.4: machines run on fuel
  return out.length?out:null;
}
function exportsOf(G,node){
  if(node==='earth') return ['metal','food'];
  return [planet(node).dep];
}
function loadAt(G,s,node){
  s.cargo={metal:0,food:0,fuel:0,parts:0,people:0};   // v4.4: cargo.kit rides alongside
  var other = node===s.from ? s.to : s.from;
  var wants = needsOf(G,other);
  var room=s.cap;
  if(node==='earth'){
    var cc0=other!=='earth'&&G.colonies[other];
    /* v4.4: the kit rides out first, and only if the whole thing fits */
    if(cc0&&cc0.kit&&room>=cc0.kit.w){ s.cargo.kit=cc0.kit; room-=cc0.kit.w; cc0.kitShip=s.id; cc0.kit=null; log(G,'kit_loaded',{p:other,n:s.id,t:s.cargo.kit.tier}) }
    if(wants&&cc0){
      /* v4.4 (Nikita, run 381774366: works stockyards full of metal that nobody burns): the hold carries what
         the far end will burn until the next hull calls, times FEED_BUFFER, minus what is already there.
         Before this the metal share was a fixed 37.5% of the hold regardless of need (v3.9.1). */
      var rates=feedRates(G,other), nd=G.need||earthNeed(G);
      var hulls=0, rt=Math.max(1,legDays(G,other,'earth',s)*2);
      for(var q=0;q<G.ships.length;q++){ var o=G.ships[q]; if(o.mode==='dead'||o.mode==='missing') continue; if((o.from===other&&o.to==='earth')||(o.to===other&&o.from==='earth')) hulls++ }
      var interval=rt/Math.max(1,hulls);
      for(var i=0;i<wants.length;i++){ var kk=wants[i];
        var need=Math.ceil(Math.max(0,(rates[kk]||0)*interval*K.FEED_BUFFER-(cc0.store[kk]||0)));
        var floor= kk==='fuel' ? Math.max(K.FEED_FUEL_FLOOR,(G.fuelRate||0)*K.EARTH_METAL_KEEP) : Math.max(0,(nd[kk]||0)*K.EARTH_METAL_KEEP);     // Earth keeps this many years of its own burn — fuel included, or the machines ground the fleet
        var got=Math.min(need,room,Math.floor(G.earth[kk]-floor));
        if(got>0){ G.earth[kk]-=got; s.cargo[kk]=got; room-=got; var lk='metal'===kk?'metalOut':(kk+'Out'); G.ledger[lk]=(G.ledger[lk]||0)+got }
      }
    }
    // spare hold goes to hands: a world short of people digs slower than it could
    var cc=other!=='earth'&&G.colonies[other];
    if(cc&&room>0){
      var short=Math.floor(popWant(planet(other))-cc.pop);
      var send=Math.min(short,room,Math.floor(G.earth.people-K.EARTH_KEEP));
      if(send>0){ G.earth.people-=send; s.cargo.people=send; G.ledger.peopleOut=(G.ledger.peopleOut||0)+send }
    }
    return;
  }
  var c=G.colonies[node]; if(!c) return;
  // only load if the far end can actually use it; otherwise fly back empty
  var list;
  if(wants) list=wants.slice();                       // the far end is a works world
  else if(other==='earth') list=[planet(node).dep];   // Earth takes anything
  else return;                                        // a mine has no use for parts

  var each2=Math.floor(room/list.length);
  var took=0;
  s.lastHaul={metal:0,food:0,fuel:0,parts:0};
  for(var j=0;j<list.length;j++){ var k2=list[j];
    var have=Math.floor(c.store[k2]||0);
    var g=Math.min(list.length>1?each2:room, have);
    if(g>0){ c.store[k2]-=g; s.cargo[k2]=g; room-=g; took+=g; s.lastHaul[k2]=g }
  }
  /* v4.11: dead seam and nothing left on the surface — this hull goes home for good */
  if(G.reserves[node]<=0&&planet(node).kind!=='works'){ var left=0; for(var j2=0;j2<list.length;j2++) left+=Math.floor(c.store[list[j2]]||0); if(left<1){ s.homeOnly=node; if(G.lines&&G.lines[node]&&!onLine(G,node).some(function(o){return o.id!==s.id&&!o.homeOnly})) delete G.lines[node] } }
  if(took>0){
    c.lastHaul=s.lastHaul; c.lastHaulDay=G.day;
    c.hauledOut=c.hauledOut||{metal:0,food:0,fuel:0,parts:0};
    for(var k3 in s.lastHaul) c.hauledOut[k3]+=s.lastHaul[k3];
    log(G,'pickup',{n:s.id,p:node,q:Math.round(took),dep:list[0]});
  }
  // a world past its ceiling has mouths it cannot use — send them home
  var ceil=popCap(planet(node));
  if(room>0&&c.pop>ceil){ var ex=Math.min(Math.floor(c.pop-ceil),room); c.pop-=ex; s.cargo.people=ex }
}
function unload(G,s,node){
  var any=s.cargo.metal+s.cargo.food+s.cargo.fuel+s.cargo.parts+s.cargo.people;
  if(node==='earth'){
    G.earth.metal+=s.cargo.metal; G.earth.food+=s.cargo.food; G.earth.fuel+=s.cargo.fuel;
    G.earth.parts+=s.cargo.parts; G.earth.people+=s.cargo.people;
    /* v4.7: the crossing took its share of the crew */
    if(s.crew>0){ s.crewDebt=(s.crewDebt||0)+s.crew*K.CREW_LOSS; var lost=Math.min(Math.floor(s.crewDebt),Math.max(0,s.crew-1)); if(lost>0){ s.crewDebt-=lost; s.crew-=lost; G.earth.lostCrew=(G.earth.lostCrew||0)+lost; G.stats.attrition=(G.stats.attrition||0)+lost; log(G,'crew_lost',{n:s.id,c:lost}) } }
    G.ledger.metalIn+=s.cargo.metal;
    G.delivered.metal+=s.cargo.metal; G.delivered.food+=s.cargo.food;
    G.delivered.fuel+=s.cargo.fuel; G.delivered.parts+=s.cargo.parts; G.delivered.people+=s.cargo.people;
    if(any>0) log(G,'delivered',{n:s.id,m:Math.round(s.cargo.metal),f:Math.round(s.cargo.food),u:Math.round(s.cargo.fuel),t:Math.round(s.cargo.parts),p:Math.round(s.cargo.people)});
  } else {
    var c=G.colonies[node];
    if(c){ c.store.metal=(c.store.metal||0)+s.cargo.metal; c.store.food=(c.store.food||0)+s.cargo.food;
           c.store.fuel=(c.store.fuel||0)+s.cargo.fuel;
           c.store.parts=(c.store.parts||0)+s.cargo.parts; c.pop+=s.cargo.people;
           if(any>0) log(G,'dropped',{n:s.id,p:node,m:Math.round(s.cargo.metal),f:Math.round(s.cargo.food),u:Math.round(s.cargo.fuel)});
           if(s.cargo.kit){ c.tier=s.cargo.kit.tier; c.kitShip=null; c.fuelOut=0; G.stats.kits=(G.stats.kits||0)+1; G.pauseNow=true;
             log(G,'kit_built',{p:node,t:c.tier,n:s.id,x:Math.pow(K.KIT_OUT,c.tier).toFixed(1)}) } }
    else if(s.cargo.kit){ log(G,'kit_lost',{p:node,t:s.cargo.kit.tier}) }
  }
  s.cargo={metal:0,food:0,fuel:0,parts:0,people:0};
}
function temper(G,s){ var h=((s.id*2654435761)^(G.seed|0))>>>0; return K.MUTINY_SPREAD*((h%1000)/1000) }
/* would this crew refuse the run that starts here? (the desk can ask the same question) */
function mutinyDue(G,s,round){ if(!G.night||s.mutiny) return false; var left=nightLeft(G); return left<(K.MUTINY_MIN+temper(G,s))*round }
/* v4.27: the first crew that will refuse, by the same count the crews make — year, line, and the rations Earth
   needs from that day to the Night (the lines stop one by one after it; a larder is the only answer) */
function mutinyForecast(G){ if(!G.night) return null; var best=null;
  for(var i=0;i<G.ships.length;i++){ var s=G.ships[i]; if(s.mode==='dead'||s.mutiny||!s.from||!s.to) continue;
    var pid=s.from==='earth'?s.to:s.from; if(!G.colonies[pid]) continue;
    var y=Math.floor(G.night-(K.MUTINY_MIN+temper(G,s))*legDays(G,pid,'earth',s)*2);
    if(!best||y<best.y) best={y:y,pid:pid} }
  if(!best) return null; var nd=G.need||earthNeed(G);
  best.n=Math.max(0,best.y-G.day); best.f=Math.round(nd.food*Math.max(0,G.night-best.y)); return best }
function sail(G,s){
  var here=s.at, dest = here===s.from ? s.to : s.from;
  if(s.mutiny) return 'mutiny';
  if(dest!=='earth'&&!G.colonies[dest]){ s.from=null;s.to=null; return 'nocolony' }
  if(G.night&&here==='earth'&&mutinyDue(G,s,legDays(G,here,dest,s)*2)){
    // the crew will not go out again: the line is dropped on the pier
    s.mutiny=true; s.from=null; s.to=null; s.pend=null; s.waiting=true; G.stats.mutinies=(G.stats.mutinies||0)+1;
    G.pauseNow=true; log(G,'mutiny',{n:s.id,p:dest,at:'earth'}); return 'mutiny';
  }
  if(here==='earth'){                            // v4.7: sign on replacements for the ones the last crossing took
    var full=(HULLS[s.hull]&&HULLS[s.hull].crew)||0, need=full-(s.crew||0);
    if(need>0){ var can=Math.max(0,Math.min(need,Math.floor(G.earth.people-K.EARTH_KEEP))); if(can>0){ G.earth.people-=can; s.crew+=can; need-=can }
      /* short-handed she still sails, down to CREW_MIN of a full crew; below that she waits on the pier */
      if(need>0&&(s.crew||0)<full*K.CREW_MIN){ if(!s.crewWait){ s.crewWait=true; log(G,'crew_wait',{n:s.id,c:need}) } return 'crew' }
      if(s.crewWait){ s.crewWait=false; log(G,'crew_signed',{n:s.id}) } }
  }
  var d=legDist(here,dest);
  var f=Math.max(1,Math.round(d*K.FUEL_PER_DIST*((HULLS[s.hull]&&HULLS[s.hull].burn)||1)/Math.sqrt(driveSpeed(G))));   // v4.5: by class
  if(G.earth.fuel<f&&here==='earth') return 'fuel';
  if(here==='earth') G.earth.fuel-=f; else G.earth.fuel=Math.max(0,G.earth.fuel-f*0.5);
  G.fuelSpent=(G.fuelSpent||0)+(here==='earth'?f:f*0.5);   // v4.4: the year's departures, for the fuel floor
  loadAt(G,s,here);
  s.waiting=false; s.origin=here; s.dest=dest; s.at=null;
  s.mode='transit'; s.dir = dest==='earth'?'in':'out';
  s.t=legDays(G,here,dest,s); s.total=s.t;
  return 'ok';
}

/* chronicle lines never roll off the cap: the log forgets traffic, not history */
var CHRON={shift:1,first_landfall:1,epitaph:1,old_night:1,ark_sailed:1,desk_silent:1,night_dated:1,ark_drive:1,ark_grounded:1,ark_woke:1,doomsday:1};
function log(G,code,d){G.logSeq=(G.logSeq||0)+1;G.log.push({day:G.day,code:code,d:d||{},seq:G.logSeq});
  if(G.log.length>400){ for(var i=0;i<G.log.length;i++){ if(!CHRON[G.log[i].code]){ G.log.splice(i,1); break } } }}
/* player actions, kept whole for post-run analysis (exported from the UI) */
function act(G,kind,d,res){ G.actions.push({day:G.day,k:kind,d:d||{},r:res||'ok'}) }
function snap(G){
  var E=G.earth, cols=0, pop=0, dry=0;
  for(var k in G.colonies){ var c=G.colonies[k]; cols++; pop+=c.pop; if(G.reserves[k]<=0) dry++ }
  var fleet=G.ships.filter(function(s){return s.mode!=='dead'});
  var idle=fleet.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)}).length;
  return {day:G.day, people:Math.round(E.people), metal:Math.round(E.metal), food:Math.round(E.food),
    fuel:Math.round(E.fuel), parts:Math.round(E.parts), needF:+(G.need?G.need.food:0).toFixed(1),
    needM:+(G.need?G.need.metal:0).toFixed(1), cols:cols, pop:Math.round(pop), dry:dry,
    ships:fleet.length, idle:idle, crew:crewOut(G), out:+earthOutput(G).toFixed(2), hands:+handsRate(G).toFixed(2), attrition:G.stats.attrition||0,
    night:G.night||0, berths:arkSouls(G), arkLv:arkLevel(G), arkMark:G.arkMark, pace:+(G.partsRate||0).toFixed(2),
    arkY:(G.night&&!arkReady(G))?(function(f){return f.st==='ok'?f.y:f.st})(driveForecast(G,G.arkMark)):null,
    sectors:SECTORS.length, drive:G.driveLvl||0, reach:reach(G), settled:settledCount(G),
    hungry:!!G.hungry, famine:G.famine||0};
}
/* v4.4 (Nikita, 25.09): the run log is JSON — the designer reads it with a script, not with his eyes */
function exportLog(G){
  var chart=PLANETS.map(function(p){ var c=G.colonies[p.id];
    return {id:p.id,desig:p.desig,name:p.name,sec:p.sec,kind:p.kind,dist:p.dist,rich:p.rich,hab:p.hab,haz:p.haz,
      seam:G.reserves[p.id]===Infinity?'inf':Math.round(G.reserves[p.id]), ghost:G.ghost[p.id]||null,
      colony:c?{pop:Math.round(c.pop),tier:c.tier||0,kit:c.kit?c.kit.tier:0,kitShip:c.kitShip||null,fuelOut:c.fuelOut||0,founded:c.founded||0,
        store:{m:Math.round(c.store.metal||0),f:Math.round(c.store.food||0),u:Math.round(c.store.fuel||0),p:Math.round(c.store.parts||0)}}:null } });
  var fleet=G.ships.filter(function(s){return s.mode!=='dead'}).map(function(s){ return {id:s.id,hull:HULLS[s.hull].key,gen:hullGen(s),cap:s.cap,mode:s.mode,line:s.from||null,pend:!!s.pend,mutiny:!!s.mutiny,kit:!!(s.cargo&&s.cargo.kit)} });
  var J={game:'LAST BERTH', v:'4.27', constants:K, seed:G.seed, year:G.day, over:G.over||null,
    night:G.night?{year:G.night,berths:arkSouls(G),arkLevel:arkLevel(G),arkMode:G.ark.mode,arkPaid:G.ark.paid,cargo:G.cargo||null,souls:G.over==='night'?G.souls:arkSouls(G),arkDriveGen:G.arkMark+1,ready:arkReady(G),wake:Math.round(arkWake(G)*100),grounded:!!G.grounded,boarded:G.boarded}:null,
    earth:snap(G), stats:G.stats, lines:G.lines||{}, chart:chart, actions:G.actions, snaps:G.snaps||[], fleet:fleet, log:G.log.slice(-120).map(function(l){return {day:l.day,code:l.code,d:l.d}}) };
  return JSON.stringify(J);
}
function exportLogText(G){
  var L=[]; L.push('LAST BERTH run log · seed '+G.seed+' · year '+G.day+(G.over?' · '+G.over:'')+
    (G.night?' · night '+G.night+' · ark level '+arkLevel(G)+' ('+(G.ark.mode||'none')+') · berths '+arkSouls(G)+' · souls '+(G.over==='night'?G.souls:arkSouls(G))+
      ' · ark drive gen '+(G.arkMark+1)+(arkReady(G)?' ready, wake '+Math.round(arkWake(G)*100)+'%':' not ready')+(G.grounded?' · GROUNDED':'')+
      (G.over==='night'&&!G.grounded?' · boarded '+G.boarded:''):''));
  L.push('');
  L.push('CHART');
  for(var i=0;i<PLANETS.length;i++){ var p=PLANETS[i], c=G.colonies[p.id];
    L.push('  '+p.desig+' '+p.name+' s'+p.sec+' '+p.kind+' d'+p.dist+' r'+p.rich+' hab'+p.hab+' haz'+p.haz+
      (c?(' | pop '+Math.round(c.pop)+' store '+JSON.stringify({m:Math.round(c.store.metal||0),f:Math.round(c.store.food||0),u:Math.round(c.store.fuel||0),p:Math.round(c.store.parts||0)})+' seam '+(G.reserves[p.id]===Infinity?'inf':Math.round(G.reserves[p.id]))):' | unsettled')); }
  L.push('');
  L.push('ACTIONS');
  for(var a=0;a<G.actions.length;a++){ var x=G.actions[a]; L.push('  d'+String(x.day).padStart(4)+' '+x.k+' '+JSON.stringify(x.d)+(x.r!=='ok'?' -> '+x.r:'')); }
  L.push('');
  L.push('SNAPSHOTS (every 50 years)');
  var S=G.snaps||[];
  for(var s=0;s<S.length;s++){ L.push('  '+JSON.stringify(S[s])); }
  L.push('');
  L.push('FLEET NOW');
  for(var f=0;f<G.ships.length;f++){ var sh=G.ships[f]; if(sh.mode==='dead') continue;
    L.push('  hull '+sh.id+' '+HULLS[sh.hull].key+' '+sh.mode+(sh.from?' '+sh.from+'<->earth':'')+(sh.pend?' pend':'')+(sh.mutiny?' MUTINY':'')); }
  L.push('');
  L.push('LAST 60 LOG LINES');
  var lg=G.log.slice(-60);
  for(var g=0;g<lg.length;g++){ L.push('  d'+String(lg[g].day).padStart(4)+' '+lg[g].code+' '+JSON.stringify(lg[g].d)); }
  return L.join('\n');
}

/* ---------- actions ---------- */

function buildShip(G,hullId){
  var h=HULLS[hullId]; if(!h) return 'locked';
  if(h.gen>(G.gen||0)) return 'locked';
  if(h.gen<(G.gen||0)-K.GEN_OVERLAP) return 'retired';
  if(reach(G)<h.reach) return 'locked';
  if(G.earth.metal<h.metal||G.earth.fuel<h.fuel||G.earth.parts<(h.parts||0)) return 'cost';
  if(G.earth.people-K.EARTH_KEEP<(h.crew||0)) return 'crew';
  G.earth.metal-=h.metal; G.earth.fuel-=h.fuel; G.earth.parts-=(h.parts||0);
  G.earth.people-=(h.crew||0);                     // she signs on for the life of the hull
  G.ledger.metalYards+=h.metal;
  var s={id:G.nextShip++, hull:hullId, cap:h.cap, gen:h.gen, crew:(h.crew||0), mode:'building', t:h.days, at:'earth',
         target:null, route:null, auto:true, cargo:{metal:0,food:0,fuel:0,parts:0,people:0}, out:{metal:0,food:0,parts:0,people:0}, take:{metal:0,food:0,fuel:0,parts:0}, missDays:0, bearing:null, job:null};
  G.ships.push(s); log(G,'ship_ordered',{n:s.id});
  return 'ok';
}

/* scrapping: an idle hull at Earth comes apart for part of what it cost.
   Old generations pile up (Nikita hit 21 idle couriers by day 600) and
   need a way out that is not "let them rot in the list". */
function scrapValue(h){ return {metal:Math.round(h.metal*K.SCRAP_METAL), parts:Math.round((h.parts||0)*K.SCRAP_PARTS)} }
function scrap(G,shipId){
  var s=shipById(G,shipId); if(!s) return 'noship';
  if(s.mode==='dead') return 'noship';
  if(!(s.mode==='idle'&&s.at==='earth')) return 'busy';
  var v=scrapValue(HULLS[s.hull]);
  G.earth.metal+=v.metal; G.earth.parts+=v.parts;
  G.earth.people+=(s.crew||0);                     // the crew walks off and goes home
  G.ledger.metalScrap=(G.ledger.metalScrap||0)+v.metal;
  var cw=s.crew||0;
  s.mode='dead'; s.crew=0; s.from=null; s.to=null; s.pend=null; s.scrapped=G.day;
  log(G,'scrapped',{n:s.id,m:v.metal,t:v.parts,c:cw});
  return 'ok';
}
function scrapIdle(G,gen){
  var n=0, m=0, p=0;
  for(var i=0;i<G.ships.length;i++){ var s=G.ships[i];
    if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&hullGen(s)===gen){
      var v=scrapValue(HULLS[s.hull]); if(scrap(G,s.id)==='ok'){ n++; m+=v.metal; p+=v.parts } } }
  if(n) log(G,'scrapped_many',{n:n,m:m,t:p,g:gen+1});
  return n?'ok':'none';
}
function shipById(G,id){for(var i=0;i<G.ships.length;i++)if(G.ships[i].id===id)return G.ships[i];return null}

function canDepart(G,s,pid){
  var p=planet(pid);
  if(!p) return 'noplanet';
  if(!sectorOpen(G,p.sec)) return 'sector';
  if(G.ghost&&G.ghost[pid]) return 'ghost';
  if(!canReachSector(s,p.sec)) return 'range';
  if(s.mutiny) return 'mutiny';
  if(s.mode!=='idle'||s.at!=='earth') return 'busy';
  var f=Math.round(p.dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(G)));
  if(G.earth.fuel<f) return 'fuel';
  return 'ok';
}

function launch(G,s,pid,job,cargo){
  var p=planet(pid);
  var f=Math.round(p.dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(G)));
  G.earth.fuel-=f;
  s.cargo={metal:0,food:0,fuel:0,parts:0,people:0};
  for(var k in cargo){s.cargo[k]=cargo[k]; G.earth[k==='people'?'people':k]-=cargo[k];}
  G.ledger.metalOut+=(cargo.metal||0);
  s.waiting=false; s.from=null; s.to=null; s.pend=null;
  s.origin='earth'; s.dest=pid; s.target=pid;
  s.mode='transit'; s.at=null; s.dir='out'; s.t=legDays(G,'earth',pid,s); s.total=s.t; s.job=job;
}

/* v4.14: when no free hull at Earth can lift a world — the nearest rated hull on its way home, or null */
function nextHome(G,pid,cls){ var p=planet(pid), best=null; if(!p) return null;
  for(var i=0;i<G.ships.length;i++){ var s=G.ships[i]; if(s.mode==='dead'||s.mode==='missing'||s.mutiny) continue; if(!canReachSector(s,p.sec)) continue; if(cls&&HULLS[s.hull].key!==cls) continue;
    var t = s.mode==='building' ? s.t : (s.mode==='transit' ? (s.dest==='earth' ? s.t : s.t+legDays(G,s.dest,'earth',s)) : (s.at==='earth' ? 0 : legDays(G,s.at,'earth',s)));
    if(best===null||t<best.t) best={id:s.id,t:t} }
  return best }
function enRoute(G,pid){ for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='transit'&&o.job==='colonize'&&o.dest===pid) return o } return null }
function foundParty(G,s,pid){ return Math.max(0,Math.floor(Math.min(popCap(planet(pid)), s.cap, G.earth.people-K.EARTH_KEEP-K.FOUND_KEEP))) }
function colonize(G,shipId,pid,people,food){
  var s=shipById(G,shipId); if(!s) return 'noship';
  var chk=canDepart(G,s,pid); if(chk!=='ok') return chk;
  if(G.colonies[pid]) return 'taken';
  if(enRoute(G,pid)) return 'enroute';   // v4.8 (Nikita, 27.09: prologue soft-lock — two founding hulls to the same farm)
  /* v4.4 (Nikita, 25.09: "зачем мне выбирать, сколько посадить — ненужное действие"): the founding party
     is as many as the world can use, the hold can carry and Earth can spare. The old arguments are ignored. */
  people=foundParty(G,s,pid);
  if(people<K.MIN_FOUND) return 'people';
  var f=Math.max(1,Math.round(planet(pid).dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(G))));
  G.earth.fuel-=f; G.earth.people-=people;
  s.cargo={metal:0,food:0,fuel:0,parts:0,people:people};
  s.job='colonize'; s.origin='earth'; s.dest=pid; s.at=null; s.waiting=false;
  s.mode='transit'; s.dir='out'; s.t=legDays(G,'earth',pid,s); s.total=s.t;
  log(G,'launch_colony',{n:s.id,p:pid,people:people});
  return 'ok';
}

/* A line is always world <-> Earth. Only Earth consumes, so a leg between two
   colonies was a second way to do the same thing and doubled the UI for nothing
   (Nikita, 22.09). `to` is accepted and ignored so old calls still work. */
function setLine(G,shipId,from,to){
  var s=shipById(G,shipId); if(!s) return 'noship';
  if(from==='earth') from=to;                  // tolerate either argument order
  to='earth';
  if(!from||from==='earth') return 'samenode';
  if(from!=='earth'&&!G.colonies[from]) return 'nocolony';
  if(to!=='earth'&&!G.colonies[to]) return 'nocolony';
  if(s.mode==='dead') return 'noship';
  if(s.mode==='missing') return 'lost';
  if(s.mutiny) return 'mutiny';
  if(!canReachSector(s,planet(from).sec)) return 'range';
  if(s.mode==='building'||s.mode==='transit'){ s.pend={from:from,to:to}; return 'queued' }
  if(from!=='earth'&&G.reserves[from]<=0&&planet(from)&&planet(from).kind!=='works'&&pileLeft(G,from)<1) return 'depleted';   // v4.9/v4.11
  s.pend=null; s.from=from; s.to=to; s.auto=true; s.policy=null; s.retire=null; s.homeOnly=null;
  if(s.mode==='idle'){ if(!s.at) s.at='earth'; var r=sail(G,s); if(r!=='ok') return r }
  if(!s.lineFor){ G.lines=G.lines||{}; var L=G.lines[from]||(G.lines[from]={want:{courier:0,hauler:0,freighter:0},renew:false}); var cls=shipClass(s); if(lineCount(G,from,cls)>(L.want[cls]||0)) L.want[cls]=lineCount(G,from,cls) }   // v4.6: the counters follow the hand
  return 'ok';
}
/* v3.8.1 (log 57539013, tester: "нельзя было снять судно"): a line ordered while the hull was in transit
   sat in s.pend, and Release only cleared from/to — the hull came home and took the queued line anyway. */
function clearLine(G,shipId){var s=shipById(G,shipId);if(s){ var pid=s.from||(s.pend&&s.pend.from); s.from=null;s.to=null;s.pend=null;s.retire=null;
  if(pid&&G.lines&&G.lines[pid]){ var L=G.lines[pid], cls=shipClass(s); L.want[cls]=Math.max(0,Math.min(L.want[cls]||0,lineCount(G,pid,cls))); if(!L.want.courier&&!L.want.hauler&&!L.want.freighter&&!onLine(G,pid).length) delete G.lines[pid] } }return 'ok'}
/* ---------- v4.6: a line is a standing order ----------
   (Nikita, 26.09: 'менеджмент, но не такой быстрый'; 90 build/assign/release clicks a game.) The player says
   'two haulers on Mire'. The yards order what is missing when they can pay for it, a finished hull takes its
   line on its own, a new generation replaces the old one hull by hull, and a hull that is no longer wanted
   comes home and goes to scrap. Manual assignment still works and simply moves the counters. */
var CLASSES=['courier','hauler','freighter'];
function lineOf(G,pid){ return G.lines&&G.lines[pid]||null }
function pileLeft(G,pid){ var c=G.colonies[pid], p=planet(pid); if(!c||!p) return 0; return Math.floor(c.store[p.kind==='works'?'parts':p.dep]||0) }   // v4.11: what is still on the surface
function shipClass(s){ return HULLS[s.hull]?HULLS[s.hull].key:'courier' }
function onLine(G,pid){ var out=[]; for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.mode==='dead') continue;
  if((o.from===pid&&o.to==='earth')||(o.pend&&o.pend.from===pid)||(o.lineFor===pid&&o.mode==='building')) out.push(o) } return out }
function lineCount(G,pid,cls){ var n=0, ships=onLine(G,pid); for(var i=0;i<ships.length;i++){ var o=ships[i]; if(o.retire) continue; if(shipClass(o)===cls) n++ } return n }
function lineWant(G,pid,cls){ var L=lineOf(G,pid); return L?(L.want[cls]||0):0 }
/* v4.17 (Nikita, 04.10: 'в постоянном приказе все ещё суда высшего поколения и не видно судов других'): the hull of a given generation, and the hull a
   standing order will actually take — the generation the player pinned with the slider, else the newest */
function hullAt(cls,gen){ for(var i=0;i<HULLS.length;i++){ if(HULLS[i].key===cls&&HULLS[i].gen===gen) return i } return null }
function lineHull(G,pid,cls){ var L=lineOf(G,pid), g=(L&&L.gen)?L.gen[cls]:undefined; if(g!==undefined&&g!==null){ var i=hullAt(cls,g); if(i!==null) return i } return currentHull(G,cls) }
function lineGenPin(G,pid,cls){ var L=lineOf(G,pid), g=(L&&L.gen)?L.gen[cls]:undefined; return (g===undefined||g===null)?null:g }
function currentHull(G,cls){ var best=null; for(var i=0;i<HULLS.length;i++){ var h=HULLS[i]; if(h.key!==cls) continue; if(h.gen>(G.gen||0)) continue; if(best===null||h.gen>HULLS[best].gen) best=i } return best }
/* why the yards cannot order this class for this line right now; 'ok' when they can */
function yardCheck(G,pid,cls){
  var hi=lineHull(G,pid,cls); if(hi===null) return 'locked';
  var h=HULLS[hi], p=planet(pid); if(!p) return 'noplanet';
  if(h.gen<(G.gen||0)-K.GEN_OVERLAP) return 'retired';      // v4.17: the yards no longer lay down that generation
  if(!canReachSector({hull:hi},p.sec)) return 'range';
  if(reach(G)<h.reach) return 'locked';
  if(G.night&&nightLeft(G)<h.days+K.MUTINY_MIN*legDays(G,pid,'earth',{hull:hi})*2) return 'mutiny';   // no crew would sign — v4.14: the yard time counts too (run 398763448: a 5452-part Courier VI laid down 30 years out, ready with 4 to go, refused at once)
  var nd=G.need||earthNeed(G);
  if(G.earth.metal-h.metal<(nd.metal||0)*K.YARD_KEEP) return 'metal';     // the yards never take Earth below YARD_KEEP years of its own burn
  if(G.earth.fuel-h.fuel<K.FEED_FUEL_FLOOR) return 'fuel';
  if(G.earth.parts<(h.parts||0)) return 'parts';
  if(G.earth.people-K.EARTH_KEEP<(h.crew||0)) return 'crew';
  return 'ok';
}
function setWant(G,pid,cls,n,gen){
  if(!G.colonies[pid]) return 'nocolony';
  if(n>0&&G.reserves[pid]<=0&&pileLeft(G,pid)<1) return 'depleted';   // v4.9/v4.11: nothing to carry — the seam is dead and the pile is gone
  if(CLASSES.indexOf(cls)<0) return 'noclass';
  n=Math.max(0,Math.min(12,Math.round(n)));
  G.lines=G.lines||{};
  var L=G.lines[pid]||(G.lines[pid]={want:{courier:0,hauler:0,freighter:0},renew:false});
  var had=lineCount(G,pid,cls);
  if(gen!==undefined&&gen!==null){                       // v4.17: the player picked a generation for what the yards add next
    gen=Math.max(0,Math.min(G.gen||0,Math.round(gen))); if(hullAt(cls,gen)===null) return 'noclass';
    L.gen=L.gen||{}; if(gen>=(G.gen||0)) delete L.gen[cls]; else L.gen[cls]=gen }       // the newest follows the newest; only an older pick is pinned
  L.want[cls]=n;
  /* fewer wanted than flying: retire the oldest first — they come home and go to scrap */
  if(n<had){ var ships=onLine(G,pid).filter(function(o){return !o.retire&&shipClass(o)===cls}).sort(function(a,b){return hullGen(a)-hullGen(b)});
    for(var i=0;i<had-n;i++){ var o=ships[i]; if(!o) break; retireHull(G,o,'fewer') } }
  if(!L.want.courier&&!L.want.hauler&&!L.want.freighter&&!onLine(G,pid).length) delete G.lines[pid];
  return 'ok';
}
function setRenew(G,pid,on){ var L=lineOf(G,pid); if(!L) return 'noline'; L.renew=!!on; return 'ok' }
function retireHull(G,o,why){
  o.retire=why||'fewer'; o.lineFor=null;
  if(o.mode==='building'){ o.pend=null }                             // it will come out idle and be scrapped
  if(o.mode==='idle'&&o.at==='earth'){ var v=scrapValue(HULLS[o.hull]); o.from=null; o.to=null; o.pend=null; if(scrap(G,o.id)==='ok'){ G.stats.renewed=(G.stats.renewed||0)+1; G.stats.renewMetal=(G.stats.renewMetal||0)+v.metal; log(G,'line_retired',{n:o.id,why:o.retire,m:v.metal}) } }
  // in transit: keeps its line until it is home; the arrival code scraps it
}
/* the yards, once a year */
function yardsTick(G){
  /* v4.8 (Nikita, 27.09: 'старые суда остаются в списке — это баг'): a hull a generation or more behind that has
     sat idle on the pier for IDLE_SCRAP years is broken up; the metal and the crew come back */
  for(var yi=0;yi<G.ships.length;yi++){ var yo=G.ships[yi];
    if(yo.mode==='idle'&&yo.at==='earth'&&!(yo.from&&yo.to)&&!yo.pend&&!yo.job&&!yo.mutiny&&!yo.retire){
      if(hullGen(yo)<(G.gen||0)){ yo.idleY=(yo.idleY||0)+1; if(yo.idleY>=K.IDLE_SCRAP){ var yv=scrapValue(HULLS[yo.hull]); if(scrap(G,yo.id)==='ok'){ G.stats.renewed=(G.stats.renewed||0)+1; G.stats.renewMetal=(G.stats.renewMetal||0)+yv.metal; log(G,'yard_scrap',{n:yo.id,g:hullGen(yo),m:yv.metal}) } } }
      else yo.idleY=0;
    } else yo.idleY=0;
  }
  if(!G.lines) return;
  for(var pid in G.lines){ var L=G.lines[pid], c=G.colonies[pid];
    if(!c){ closeLine(G,pid); continue }
    for(var ci=0;ci<CLASSES.length;ci++){ var cls=CLASSES[ci], want=L.want[cls]||0;
      var have=lineCount(G,pid,cls);
      L.wait=L.wait||{};
      if(have<want&&G.reserves[pid]<=0&&planet(pid).kind!=='works'&&pileLeft(G,pid)<1){ L.wait[cls]='depleted'; continue }   // v4.11: a dead seam gets no new hulls — v4.14 (Nikita, run 398763448: 5901 metal on w10 and no way to call a hull): unless there is still a pile to carry
      if(have<want){
        /* an idle hull of the class already at Earth goes first — the yards do not build what is sitting on the pier */
        var pinG=lineGenPin(G,pid,cls), idle=null, p0=planet(pid); for(var si=0;si<G.ships.length;si++){ var o0=G.ships[si]; if(o0.mode==='idle'&&o0.at==='earth'&&!(o0.from&&o0.to)&&!o0.pend&&!o0.mutiny&&!o0.retire&&!o0.job&&shipClass(o0)===cls&&canReachSector(o0,p0.sec)&&(pinG===null||hullGen(o0)===pinG)&&(!idle||hullGen(o0)>hullGen(idle))) idle=o0 }
        if(idle){ idle.lineFor=pid; var ra=setLine(G,idle.id,pid,'earth'); idle.lineFor=null; if(ra==='ok'||ra==='queued'){ L.wait[cls]=null; log(G,'yard_take',{n:idle.id,p:pid}); continue } }
        var r=yardCheck(G,pid,cls); L.wait[cls]=r==='ok'?null:r;
        if(r==='ok'){ var hi=lineHull(G,pid,cls); if(buildShip(G,hi)==='ok'){ var ns=G.ships[G.ships.length-1]; ns.lineFor=pid; ns.pend={from:pid,to:'earth'}; log(G,'yard_line',{n:ns.id,p:pid,g:hullGen(ns)}); G.stats.yardBuilt=(G.stats.yardBuilt||0)+1 } }
      } else {
        L.wait[cls]=null;
        /* renewal: one old hull per class at a time gets a successor ordered */
        if(L.renew&&want>0&&lineGenPin(G,pid,cls)===null){      // v4.17: a pinned (older) generation is the player's choice — no successor over it
          var ships=onLine(G,pid).filter(function(o){return !o.retire&&shipClass(o)===cls&&o.mode!=='building'});
          var old=null; for(var q=0;q<ships.length;q++){ if(hullGen(ships[q])<(G.gen||0)&&(!old||hullGen(ships[q])<hullGen(old))) old=ships[q] }
          var pendingRenew=onLine(G,pid).some(function(o){return o.mode==='building'&&o.replaces});
          /* v4.6 balance: renewal is paced — at most RENEW_SLOTS successors in the yards at once, and never
             below EARTH_METAL_KEEP years of Earth's own burn (unpaced renewal drained the bots to death) */
          var renewing=0; for(var rq=0;rq<G.ships.length;rq++){ if(G.ships[rq].mode==='building'&&G.ships[rq].replaces) renewing++ }
          var hOld=old?HULLS[currentHull(G,cls)]:null, ndr=G.need||earthNeed(G);
          var rich=hOld&&(G.earth.metal-hOld.metal>=(ndr.metal||0)*K.EARTH_METAL_KEEP);
          /* and only where it pays: a line that already keeps up with the world does not need a bigger hull
             (bots renewed everything and bled 2,300 metal by year 700 for nothing) */
          var lrr=old?lineRate(G,pid):null, pays=!!(lrr&&lrr.piling);
          if(old&&!pendingRenew&&renewing<K.RENEW_SLOTS&&rich&&pays){ var r2=yardCheck(G,pid,cls); L.wait[cls]=r2==='ok'?null:r2;
            if(r2==='ok'){ var hi2=currentHull(G,cls); if(buildShip(G,hi2)==='ok'){ var ns2=G.ships[G.ships.length-1]; ns2.lineFor=pid; ns2.replaces=old.id; ns2.pend={from:pid,to:'earth'}; old.retire='renew'; old.successor=ns2.id; log(G,'yard_renew',{n:ns2.id,o:old.id,p:pid,g:hullGen(ns2)}); G.stats.yardBuilt=(G.stats.yardBuilt||0)+1 } } }
        }
      }
    }
  }
}
function closeLine(G,pid){ var ships=onLine(G,pid); for(var i=0;i<ships.length;i++) retireHull(G,ships[i],'closed'); if(G.lines) delete G.lines[pid] }
function setAuto(G,shipId,pid){ return setLine(G,shipId,'earth',pid) }
function setAutoOld(G,shipId,pid){
  var s=shipById(G,shipId); if(!s) return 'noship';
  if(!G.colonies[pid]) return 'nocolony';
  s.route=pid; s.auto=true; s.policy=null;
  if(s.mode==='idle'&&s.at==='earth'){ var r=runRoute(G,s); if(r!=='ok') return r }
  return 'ok';
}
function setPolicy(G,shipId,pid,deliver,collect){
  var s=shipById(G,shipId); if(!s) return 'noship';
  if(!G.colonies[pid]) return 'nocolony';
  s.route=pid; s.auto=false;
  s.policy={ deliver:{metal:(deliver&&deliver.metal)|0, food:(deliver&&deliver.food)|0,
                      parts:(deliver&&deliver.parts)|0, people:(deliver&&deliver.people)|0},
             collect:{metal:(collect&&collect.metal)|0, food:(collect&&collect.food)|0,
                      fuel:(collect&&collect.fuel)|0, parts:(collect&&collect.parts)|0} };
  if(s.mode==='idle'&&s.at==='earth'){ var r=runRoute(G,s); if(r!=='ok') return r }
  return 'ok';
}
function setRoute(G,shipId,pid,out,take){
  var s=shipById(G,shipId); if(!s) return 'noship';
  if(!G.colonies[pid]) return 'nocolony';
  s.route=pid;
  s.out={metal:(out&&out.metal)|0, food:(out&&out.food)|0, parts:(out&&out.parts)|0, people:(out&&out.people)|0};
  var d={metal:0,food:0,fuel:0,parts:0};
  if(take){ for(var tk in d) d[tk]=Math.max(0,(take[tk]|0)) }
  else { d[planet(pid).dep]=s.cap }
  s.take=d;
  
  if(s.mode==='idle'&&s.at==='earth'){var r=runRoute(G,s); if(r!=='ok'){return r}}
  return 'ok';
}
function dispatch(G,shipId,pid,out,take){
  var s=shipById(G,shipId); if(!s) return 'noship';
  if(s.mode!=='idle'||s.at!=='earth') return 'busy';
  var r=setRoute(G,shipId,pid,out,take);
  return r;
}
function repeatRun(G,shipId){
  var s=shipById(G,shipId); if(!s) return 'noship';
  if(!s.route) return 'noroute';
  if(s.mode!=='idle'||s.at!=='earth') return 'busy';
  return runRoute(G,s);
}
function clearRoute(G,shipId){var s=shipById(G,shipId);if(s)s.route=null;return 'ok'}

function runRoute(G,s){
  var pid=s.route; if(!pid) return 'noroute';
  var chk=canDepart(G,s,pid); if(chk!=='ok') return chk;
  launch(G,s,pid,'haul',{});
  return 'ok';
}



function abandon(G,shipId,pid){
  var s=shipById(G,shipId); if(!s) return 'noship';
  if(!HULLS[s.hull]||HULLS[s.hull].key!=='courier') return 'evacCourier';   // v4.18 (Nikita, 04.10): only a courier lifts a settlement
  var c=G.colonies[pid]; if(!c) return 'nocolony';
  for(var i=0;i<G.ships.length;i++){ var o=G.ships[i]; if(o.job==='evac'&&o.dest===pid&&o.mode==='transit') return 'evacuating' }
  var chk=canDepart(G,s,pid); if(chk!=='ok') return chk;
  if(c.kit){ G.earth.metal+=c.kit.metal; G.earth.parts+=c.kit.parts; c.kit=null }   // v4.4: a kit not yet shipped goes back to the yards
  if(G.lines&&G.lines[pid]) closeLine(G,pid);   // v4.6: the standing order dies with the world; the hulls come home to scrap
  launch(G,s,pid,'evac',{});
  log(G,'launch_evac',{n:s.id,p:pid});
  return 'ok';
}


function search(G,shipId,missId){
  var s=shipById(G,shipId); if(!s) return 'noship';
  var m=null;for(var i=0;i<G.ships.length;i++)if(G.ships[i].id===missId&&G.ships[i].mode==='missing')m=G.ships[i];
  if(!m) return 'nomissing';
  var where = m.dest&&m.dest!=='earth' ? m.dest : (m.origin&&m.origin!=='earth' ? m.origin : m.target);
  if(!where||!planet(where)) return 'noplanet';
  var chk=canDepart(G,s,where); if(chk!=='ok') return chk;
  launch(G,s,where,'search',{});
  s.searchFor=missId;
  log(G,'launch_search',{n:s.id,m:missId});
  return 'ok';
}

/* the drive programme is repeatable: every mark cuts crossings and signal lag
   again, costs more parts than the last, and demands more reach. There is no
   final mark, which is where the endless half of the progression lives. */
function startDrive(G,pid){
  if(G.drive) return 'running';
  if(settledCount(G)<driveReachFor(G)) return 'settled';
  var c=G.colonies[pid], p=planet(pid);
  if(!c) return 'nocolony';
  if(!p||p.kind!=='works') return 'notworks';
  if(c.pop<K.DRIVE_POP) return 'pop';
  G.drive=pid; G.driveWork=0;
  for(var wk in G.colonies){ if(planet(wk).kind==='works'){
    G.driveWork+=(G.colonies[wk].store.parts||0); G.colonies[wk].store.parts=0 } }
  var fromHome=Math.min(G.earth.parts, driveWorkFor(G));   // the yards ship their stock to the programme
  G.earth.parts-=fromHome; G.driveWork+=fromHome;
  log(G,'drive_started',{p:pid,n:G.driveLvl+1});
  if(G.driveWork>=driveWorkFor(G)) driveDone(G,pid);
  return 'ok';
}
function driveDone(G,pid){
  G.driveWork=0; G.drive=null; G.driveLvl=(G.driveLvl||0)+1;
  G.gen=G.driveLvl; ensureGen(G.gen);
  G.pauseNow=true; log(G,'drive_mark',{p:pid,n:G.driveLvl+1,s:sectorLimit(G.gen)});
  if(G.arkMark!==null&&G.arkMark!==undefined&&G.driveLvl>=G.arkMark)
    log(G,'ark_drive',{g:G.driveLvl,w:Math.round(arkWake(G)*100),y:G.night});
}
function researchHyper(G){ return 'notworks' }

/* ---------- the Long Night and the ark ---------- */
function revealNight(G){
  if(G.night) return;
  G.night=G.day+K.NIGHT_YEARS; G.pauseNow=true;
  G.arkMark=Math.max(K.ARK_DRIVE_MIN,(G.driveLvl||0)+K.ARK_ABOVE);   // v4.4: two marks above, not one
  log(G,'night_dated',{y:G.night,n:K.NIGHT_YEARS});
}
/* ---------- v4.0: the second date ---------- */
function workAt(l){ return Math.round(K.DRIVE_WORK*Math.pow(K.DRIVE_WORK_GROW,l)) }
function reachAt(l){ return K.DRIVE_REACH+K.DRIVE_REACH_GROW*l }
function arkReady(G){ return G.arkMark!==null&&G.arkMark!==undefined&&(G.driveLvl||0)>=G.arkMark }
/* share of the sleepers who wake at the other end, on the drive you have now (0 = the ark cannot sail) */
function arkWake(G){ if(!arkReady(G)) return 0; var i=Math.min(K.ARK_WAKE.length-1,(G.driveLvl||0)-G.arkMark); return K.ARK_WAKE[i] }
function wakeAt(G,l){ if(G.arkMark===null||l<G.arkMark) return 0; return K.ARK_WAKE[Math.min(K.ARK_WAKE.length-1,l-G.arkMark)] }
/* when the drive reaches generation index `target` at the pace the works keep now.
   st: done | ok (y = year) | reach (the next mark wants more worlds) | host (no works world can host) | stalled (no parts coming in).
   rn = the reach the last mark on the way will want; the date assumes you get there. */
function driveForecast(G,target){
  var lvl=G.driveLvl||0;
  if(lvl>=target) return {st:'done'};
  var r=settledCount(G), rn=reachAt(target-1);
  if(!G.drive){
    if(r<reachAt(lvl)) return {st:'settled',n:reachAt(lvl),r:r,rn:rn};
    var host=false; for(var k in G.colonies){ var c=G.colonies[k]; if(planet(k).kind==='works'&&c.pop>=K.DRIVE_POP) host=true }
    if(!host) return {st:'host',rn:rn};
  }
  var have=G.drive? G.driveWork : G.earth.parts;
  if(!G.drive) for(var k2 in G.colonies){ if(planet(k2).kind==='works') have+=(G.colonies[k2].store.parts||0) }
  var left=Math.max(0,workAt(lvl)-have);
  for(var l=lvl+1;l<target;l++) left+=workAt(l);
  var rate=G.partsRate||0;
  if(rate<0.05) return {st:'stalled',rn:rn};
  return {st:'ok',y:G.day+Math.ceil(left/rate),left:Math.round(left),rate:rate,rn:rn};
}
function nightLeft(G){ return G.night? Math.max(0,G.night-G.day) : null }
var ARK_RES=['metal','parts','food','fuel'];
function arkPrice(l){ var L=K.ARK_LEVELS[l-1]; return L?{metal:L.metal,parts:L.parts,food:L.food,fuel:L.fuel}:null }
/* the highest level whose whole price has been paid in (credit, at full price) */
function arkLevel(G){ var lv=0;
  for(var l=1;l<=K.ARK_LEVELS.length;l++){ var c=arkPrice(l), ok=true;
    for(var i=0;i<4;i++){ if(G.ark.paid[ARK_RES[i]]+1e-6<c[ARK_RES[i]]) ok=false }
    if(!ok) break; lv=l }
  return lv }
/* what is still owed on the way to level l, at full price */
function arkOwed(G,l){ var c=arkPrice(l), o={}; for(var i=0;i<4;i++){ var r=ARK_RES[i]; o[r]=Math.max(0,c[r]-G.ark.paid[r]) } return o }
function arkCap(l){ var L=K.ARK_LEVELS[l-1]; return L?L.cap:{metal:0,parts:0,food:0,fuel:0} }
function arkFloor(G,r){ var nd=G.need||earthNeed(G); return r==='metal'?nd.metal*K.ARK_FLOOR_YEARS : r==='food'?nd.food*K.ARK_FLOOR_YEARS : r==='fuel'?K.FEED_FUEL_FLOOR : 0 }
/* the way is chosen once: 'deposit' or 'buy'. A level can only be raised. 'ok' or why */
function arkCheck(G,l,mode){
  if(!G.night) return 'night';
  if(!arkPrice(l)) return 'arklevel';
  if(G.ark.mode&&G.ark.mode!==mode) return 'arkmode';
  if(l<=(mode==='deposit'?G.ark.target:arkLevel(G))) return 'arkhave';
  return 'ok' }
function arkBuy(G,l){
  var w=arkCheck(G,l,'buy'); if(w!=='ok') return w;
  var o=arkOwed(G,l), E=G.earth, cost={}, i, r;
  for(i=0;i<4;i++){ r=ARK_RES[i]; cost[r]=Math.ceil(o[r]*K.ARK_BULK); if(E[r]<cost[r]) return r }
  var c=arkPrice(l); for(i=0;i<4;i++){ r=ARK_RES[i]; E[r]-=cost[r]; G.ark.paid[r]=Math.max(G.ark.paid[r],c[r]) }
  G.ark.mode='buy'; G.ark.target=l; G.ark.lv=l;
  log(G,'ark_bought',{l:l}); return 'ok' }
function arkPlan(G,l){
  var w=arkCheck(G,l,'deposit'); if(w!=='ok') return w;
  G.ark.mode='deposit'; G.ark.target=l; log(G,'ark_plan',{l:l}); return 'ok' }
/* what the deposits take this year: the owed share spread evenly over the years left, never below the floor */
function arkYearly(G){ if(G.ark.mode!=='deposit'||!G.night) return null;
  var left=Math.max(1,G.night-G.day), o=arkOwed(G,G.ark.target), E=G.earth, out={};
  for(var i=0;i<4;i++){ var r=ARK_RES[i]; out[r]=Math.min(o[r]/left,Math.max(0,E[r]-arkFloor(G,r))) } return out }
function arkDepositTick(G){
  var y=arkYearly(G); if(!y) return;
  for(var i=0;i<4;i++){ var r=ARK_RES[i], c=arkPrice(G.ark.target)[r]; if(y[r]>0){ G.earth[r]-=y[r]; G.ark.paid[r]+=y[r]; if(c-G.ark.paid[r]<1e-6) G.ark.paid[r]=c } }
  var lv=arkLevel(G); if(lv>G.ark.lv){ G.ark.lv=lv; log(G,'ark_level',{l:lv}) } }
/* who would sail if the ark left today: everyone at home and at the pier, if a level has been paid in */
function arkSouls(G){ return arkLevel(G)>=1 ? Math.max(0,Math.floor(G.earth.people)+crewDocked(G)) : 0 }
/* what rides along: what is left on Earth, up to the cap of the level */
function arkCargo(G){ var cap=arkCap(arkLevel(G)), out={}; for(var i=0;i<4;i++){ var r=ARK_RES[i]; out[r]=Math.max(0,Math.min(Math.floor(G.earth[r]),cap[r])) } return out }
function leftBehind(G){
  var col=0; for(var k in G.colonies) col+=G.colonies[k].pop;
  var tr=0; for(var i=0;i<G.ships.length;i++) tr+=(G.ships[i].cargo.people||0);
  return { home:Math.max(0,Math.floor(G.earth.people)+crewDocked(G)-arkSouls(G)), hulls:crewAway(G), colonies:Math.round(col), transit:Math.round(tr) };
}

/* ---------- the chronicle ----------
   One line per shift. The mood is picked by what the new shift walks into, worst first. */
function chronShift(G,cols){
  var E=G.earth, idle=0;
  for(var i=0;i<G.ships.length;i++){ var s=G.ships[i]; if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)) idle++ }
  var no=Math.round(G.day/K.SHIFT_YEARS)+1, left=nightLeft(G), k;
  /* v4.1: the world lives by the date. The first shift after the date, then every other shift, writes
     about the era rather than the chart: 'dated' once, 'long' while the Night is far, 'dusk' inside the
     last thousand years. The other shifts keep reporting worlds, so the chronicle still carries facts. */
  var era=null;
  if(left!==null&&left>K.NIGHT_NEAR){
    if(!G.datedShift){ G.datedShift=no; era='dated' }
    else if((no-G.datedShift)%2===1) era= left<=K.DUSK_YEARS ? 'dusk' : 'long';
  }
  if(G.hungry) k='hungry';
  else if(left!==null&&left<=K.NIGHT_NEAR) k='night';
  else if(era) k=era;
  else if(!cols) k='empty';
  else if(idle>=4) k='idle';
  else if(cols>(G.lastShiftCols||0)) k='grow';
  else if(cols<(G.lastShiftCols||0)) k='shrink';
  else k='calm';
  G.lastShiftCols=cols;
  log(G,'shift',{n:no,k:k,c:cols,h:Math.round(E.people),i:idle,n2:left||0,b:arkSouls(G)});
  /* v4.5 (Nikita, 26.09: 'менеджмент, но не такой быстрый'): the shift is the unit of the game. Every
     SHIFT_YEARS the desk stops and hands the new shift a report of the eighty years just gone; the UI
     decides whether to actually pause (never inside the prologue, never for bots). */
  var m=G.shiftMark||{delivered:{metal:0,food:0,fuel:0,parts:0,people:0},founded:0,lost:0,mutinies:0,kits:0,sectors:2,drive:0,cols:0,evac:0,berths:0,arkLv:0,day:0};
  var ev=0; for(var q in G.ghost) ev++; for(var q2 in G.reserves){ } 
  G.shiftReport={no:no,k:k,day:G.day,years:G.day-(m.day||0),
    d:{metal:Math.round(G.delivered.metal-m.delivered.metal),food:Math.round(G.delivered.food-m.delivered.food),fuel:Math.round(G.delivered.fuel-m.delivered.fuel),parts:Math.round(G.delivered.parts-m.delivered.parts),people:Math.round(G.delivered.people-m.delivered.people)},
    founded:G.stats.founded-m.founded, lost:G.stats.lost-m.lost, mutinies:(G.stats.mutinies||0)-m.mutinies, kits:(G.stats.kits||0)-m.kits,
    sectors:SECTORS.length-m.sectors, drive:(G.driveLvl||0)-m.drive, cols:cols, colsWas:m.cols, idle:idle, hands:Math.round(E.people),
    berths:arkSouls(G), berthsWas:m.berths, arkLv:arkLevel(G), left:left, hungry:!!G.hungry,
    built:(G.stats.yardBuilt||0)-(m.built||0), renewed:(G.stats.renewed||0)-(m.renewed||0), renewMetal:(G.stats.renewMetal||0)-(m.renewMetal||0),
    attrition:(G.stats.attrition||0)-(m.attrition||0), handsRate:+handsRate(G).toFixed(2)};
  G.shiftMark={delivered:{metal:G.delivered.metal,food:G.delivered.food,fuel:G.delivered.fuel,parts:G.delivered.parts,people:G.delivered.people},
    founded:G.stats.founded,lost:G.stats.lost,mutinies:G.stats.mutinies||0,kits:G.stats.kits||0,sectors:SECTORS.length,drive:G.driveLvl||0,cols:cols,berths:arkSouls(G),arkLv:arkLevel(G),day:G.day,built:G.stats.yardBuilt||0,renewed:G.stats.renewed||0,renewMetal:G.stats.renewMetal||0,attrition:G.stats.attrition||0};
  G.shiftOpen=true;
}

/* ---------- tick ---------- */

function lineRate(G,pid){
  var p=planet(pid), c=G.colonies[pid]; if(!c) return null;
  var makes = (p.kind==='works' ? c.pop*p.rich*K.REFINE
            : (G.reserves[pid]>0 ? c.pop*p.rich*K.PROD : 0))*rateMult(c);   // v4.4: kits
  // count the hulls actually standing on a line that touches this world.
  // (this used to test s.route, which lines have not set since v0.9 — every
  //  running line reported "carries nothing", so the panel, the map marker and
  //  the advisor all claimed the ships were idle while they were hauling.)
  var hulls=0, carries=0, trip=0;
  for(var i=0;i<G.ships.length;i++){ var s=G.ships[i];
    if(s.mode==='dead'||s.mode==='missing') continue;
    if(!(s.from&&s.to)) continue;
    if(s.from!==pid&&s.to!==pid) continue;
    var rt=Math.max(1,legDays(G,s.from,s.to,s)*2);
    hulls++; carries+=s.cap/rt;
    if(!trip||rt<trip) trip=rt;
  }
  var dep = p.kind==='works'?'parts':p.dep;
  var sitting = c.store[dep]||0;
  return {makes:makes, carries:carries, hulls:hulls, trip:trip, dep:dep,
          sitting:sitting, dry:(G.reserves[pid]!==Infinity&&G.reserves[pid]<=0),
          short: makes-carries, piling: makes>carries+0.01};
}

function tick(G){
  if(G.over) return;
  G.day++;
  if(G.day%50===0){ G.snaps=G.snaps||[]; G.snaps.push(snap(G)); }
  G.inRate=G.inRate||{}; G._dl=G._dl||{};                 // v4.20: EMA of what arrives home per year, per resource
  ['metal','food','fuel','parts'].forEach(function(k){ var cur=(G.delivered&&G.delivered[k])||0, dd=cur-(G._dl[k]||0); G._dl[k]=cur; G.inRate[k]=(G.inRate[k]||0)*0.98+dd*0.02 });
  G.fuelRate=(G.fuelRate||0)*0.95+(G.fuelSpent||0)*0.05; G.fuelSpent=0;   // v4.4: EMA of fuel the fleet burns per year
  var E=G.earth, R=G.rnd;

  var ef=earthOutput(G)*(G.cold?0.7:1);        // no metal at home, the yards run slow
  E.crewF=ef;
  E.pMetal=K.EARTH_METAL*ef; E.pFood=K.EARTH_FOOD*ef; E.pFuel=K.EARTH_FUEL*ef;
  E.metal+=E.pMetal; E.food+=E.pFood; E.fuel+=E.pFuel;
  if(!G.hungry) E.people+=handsRate(G);        // v4.7: a fed home world keeps turning out colonists, fewer every century

  // ---- the yards (v4.6) ----
  yardsTick(G);
  // ---- ships ----
  for(var i=0;i<G.ships.length;i++){
    var s=G.ships[i];
    if(s.mode==='building'){s.t--;if(s.t<=0){s.mode='idle';s.at='earth';log(G,'ship_ready',{n:s.id});
        if(s.retire){ var rv=scrapValue(HULLS[s.hull]); s.pend=null; s.from=null; s.to=null; if(scrap(G,s.id)==='ok'){ G.stats.renewed=(G.stats.renewed||0)+1; G.stats.renewMetal=(G.stats.renewMetal||0)+rv.metal; log(G,'line_retired',{n:s.id,why:s.retire,m:rv.metal}) } continue }
        if(s.pend&&G.colonies[s.pend.from]){ var pf=s.pend.from; s.pend=null; var pr=setLine(G,s.id,pf,'earth'); s.lineFor=null; if(pr!=='ok'){ s.waiting=true; G.pauseNow=true; log(G,'awaiting',{n:s.id}) } continue }
      }continue}
    if(s.mode==='missing'){
      s.missDays++;
      var p1=R();
      if(p1<0.025){ s.bearing=Math.round(R()*100); log(G,'fragment',{n:s.id,b:s.bearing}); }
      else if(p1<0.050){ s.mode='transit'; s.dir='in'; s.t=Math.max(3,Math.round(s.total*0.7)); s.total=s.t; G.pauseNow=true; log(G,'ship_returns',{n:s.id,d:s.missDays}); }
      else if(p1<0.054||s.missDays>300){ var cl=s.crew||0; s.mode='dead'; s.crew=0; G.stats.lost++;
        G.earth.lostCrew=(G.earth.lostCrew||0)+cl; log(G,'ship_written_off',{n:s.id,c:cl});
        if(s.cargo&&s.cargo.kit){ for(var kc in G.colonies) if(G.colonies[kc].kitShip===s.id){ G.colonies[kc].kitShip=null; log(G,'kit_lost',{p:kc,t:s.cargo.kit.tier}) } } }
      continue;
    }
    if(s.mode==='idle'){ if(s.from&&s.to) sail(G,s); continue }
    if(s.mode!=='transit') continue;

    if(s.t===s.total){
      var pd = s.dest==='earth' ? null : planet(s.dest);
      if(s.dest!=='earth'&&!pd){ s.dest='earth'; s.dir='in'; pd=null }   // lost its destination: limp home
      var hz = (pd ? pd.haz : 0.02) * Math.pow(0.7, hullGen(s));
      if(!G.safe&&R()<hz*0.085){ s.mode='missing'; s.missDays=0; G.pauseNow=true; log(G,'ship_missing',{n:s.id,p:s.dest==='earth'?s.origin:s.dest}); continue; }
    }
    var sp=shipSpeed(G,s);                                    // v4.21: folded or thickened space
    if(sp===1&&!s.acc) s.t--;
    else { s.acc=(s.acc||0)+sp; var stp=Math.floor(s.acc); s.acc-=stp; if(stp<1) continue; s.t-=stp }
    if(s.t>0) continue;
    if(s.dest!=='earth'&&stormAt(G,s.dest)){ s.t=1; s.held=(s.held||0)+1; continue }   // v4.21: a storm — no landing, hold in orbit

    // arrived
    var node=s.dest;
    s.at=node; s.mode='idle'; s.dir=null;
    if(s.job==='colonize'){
      var p=planet(node);
      if(!G.safe&&R()<p.haz*0.5){ var cf=s.crew||0; s.mode='dead'; s.crew=0; G.stats.lost++;
        G.earth.lostCrew=(G.earth.lostCrew||0)+cf; log(G,'colony_failed',{n:s.id,p:node}); continue }
      G.colonies[node]={pid:node,pop:s.cargo.people,
        store:{metal:0,food:0,fuel:0,parts:0},founded:G.day};
      G.stats.founded++; (G.settled=G.settled||{})[node]=G.day;
      log(G,'colony_founded',{p:node,pop:Math.round(s.cargo.people)});
      if(G.stats.founded===1) log(G,'first_landfall',{p:node});
      s.cargo={metal:0,food:0,fuel:0,parts:0,people:0};
      s.job=null; s.from=null; s.to=null; s.origin=node; s.dest='earth';
      s.mode='transit'; s.dir='in'; s.t=legDays(G,node,'earth',s); s.total=s.t;
      continue;
    }
    if(s.job==='evac'){
      var ce=G.colonies[node];
      if(ce){
        var lift=Math.min(Math.floor(ce.pop),s.cap);
        s.cargo={metal:0,food:0,fuel:0,parts:0,people:lift};
        // whatever was on the surface goes with them, as far as the hold allows
        var roomE=Math.max(0,s.cap-lift);
        ['metal','food','fuel','parts'].forEach(function(kk){ var g=Math.min(roomE,Math.floor(ce.store[kk]||0)); if(g>0){ s.cargo[kk]=g; roomE-=g } });
        delete G.colonies[node];
        if(G.reserves[node]!==Infinity&&G.reserves[node]<=0){ G.ghost[node]=G.day }
        for(var q=0;q<G.ships.length;q++){ var o=G.ships[q]; if(o.from===node){ o.from=null; o.to=null } if(o.pend&&o.pend.from===node) o.pend=null }
        if(G.drive===node){ G.drive=null; log(G,'drive_lost',{p:node}) }
        log(G,lift<ce.pop-0.5?'evac_partial':'evacuated',{p:node,pop:lift});
        var ho=ce.hauledOut||{}, pe=planet(node), qd=pe.kind==='works'?'parts':pe.dep;
        log(G,'epitaph',{p:node,f:ce.founded||0,y:G.day,n:G.day-(ce.founded||0),q:Math.round(ho[qd]||0),dep:qd,pop:lift});
      }
      s.job=null; s.origin=node; s.dest='earth'; s.mode='transit'; s.dir='in'; s.t=legDays(G,node,'earth',s); s.total=s.t;
      continue;
    }
    if(s.job==='search'){
      var found=null;
      for(var q2=0;q2<G.ships.length;q2++){ var m2=G.ships[q2]; if(m2.id===s.searchFor&&m2.mode==='missing') found=m2 }
      if(found&&R()<0.55){ found.mode='transit'; found.dir='in'; found.origin=node; found.dest='earth'; found.t=legDays(G,node,'earth',found); found.total=found.t; log(G,'search_found',{n:found.id}) }
      else log(G,'search_empty2',{p:node});
      s.job=null; s.searchFor=null; s.origin=node; s.dest='earth'; s.mode='transit'; s.dir='in'; s.t=legDays(G,node,'earth',s); s.total=s.t;
      continue;
    }
    unload(G,s,node);
    if(node!=='earth'&&s.from&&s.to&&!s.mutiny&&mutinyDue(G,s,legDays(G,node,'earth',s)*2)){
      // v4.2: the crew loads, sails home, and will not come back. The word goes out from the far end.
      s.mutiny=true; s.pend=null; s.lineFor=null; s.retire=null; G.stats.mutinies=(G.stats.mutinies||0)+1;
      log(G,'mutiny',{n:s.id,p:node,at:'far'});
      loadAt(G,s,node);                       // they take what is on the ground; the line is still set here
      s.from=null; s.to=null; s.origin=node; s.dest='earth'; s.mode='transit'; s.dir='in'; s.t=legDays(G,node,'earth',s); s.total=s.t;
      continue;
    }
    if(s.pend){ s.from=s.pend.from; s.to=s.pend.to; s.pend=null; s.auto=true; s.policy=null;
      log(G,'reassigned',{n:s.id,a:s.from,b:s.to}); }
    if(s.homeOnly){ var hp=s.homeOnly; s.homeOnly=null; s.from=null; s.to=null; s.pend=null; s.waiting=true; log(G,'nothing_left',{n:s.id,p:hp}); continue }
    if(s.retire){ var v0=scrapValue(HULLS[s.hull]); s.from=null; s.to=null; s.pend=null; if(scrap(G,s.id)==='ok'){ G.stats.renewed=(G.stats.renewed||0)+1; G.stats.renewMetal=(G.stats.renewMetal||0)+v0.metal; log(G,'line_retired',{n:s.id,why:s.retire,m:v0.metal}) } continue }
    if(s.from&&s.to) sail(G,s);
    else if(node!=='earth'){ s.origin=node; s.dest='earth'; s.mode='transit'; s.dir='in'; s.t=legDays(G,node,'earth',s); s.total=s.t }   // v4.14: a hull released in flight lands with no line — it heads home; the yards only see hulls at Earth
    else { s.waiting=true; G.pauseNow=true; log(G,'awaiting',{n:s.id}) }
  }

  // ---- colonies ----
  var partsMade=0;   // v4.0: the pace the ark-drive forecast reads
  for(var k in G.colonies){
    var c=G.colonies[k], p=planet(k);

    // works worlds convert; everyone else digs or grows from a finite seam
    // v4.10: hazard takes its share; the line brings the replacements
    if(c.pop>K.MIN_FOUND){ c.lossDebt=(c.lossDebt||0)+c.pop*p.haz*K.COLONY_LOSS; var cl=Math.floor(c.lossDebt); if(cl>0){ c.lossDebt-=cl; c.pop=Math.max(K.MIN_FOUND,c.pop-cl); G.stats.colonyLoss=(G.stats.colonyLoss||0)+cl } }
    // v4.4: the machines drink first; dry for KIT_GRACE years and they stand
    if(kitTier(c)>0){ var burn=kitBurn(c);
      if((c.store.fuel||0)>=burn){ c.store.fuel-=burn; if(c.fuelOut>=K.KIT_GRACE) log(G,'kit_running',{p:k,t:c.tier}); c.fuelOut=0 }
      else { c.store.fuel=0; c.fuelOut=(c.fuelOut||0)+1; if(c.fuelOut===K.KIT_GRACE) log(G,'kit_starved',{p:k,t:c.tier}) } }
    var mult=rateMult(c);
    if(p.kind==='works'){
      c.store.metal=(c.store.metal||0)+c.pop*K.WORKS_LOCAL;
      c.store.food=(c.store.food||0)+c.pop*K.WORKS_LOCAL*0.6;
      var want=c.pop*p.rich*K.REFINE*mult;
      var canM=(c.store.metal||0)/K.REFINE_METAL, canF=(c.store.food||0)/K.REFINE_FOOD;
      var made=Math.min(want,canM,canF);
      if(made>0.0001){
        c.store.metal-=made*K.REFINE_METAL; c.store.food-=made*K.REFINE_FOOD; c.idleWorks=0; partsMade+=made;
        if(G.drive){
          G.driveWork+=made;
          if(G.driveWork>=driveWorkFor(G)) driveDone(G,G.drive);
        } else c.store.parts=(c.store.parts||0)+made;
      } else { c.idleWorks=(c.idleWorks||0)+1; if(c.idleWorks===120){ log(G,'works_idle',{p:k}) } }
    } else {
      var out=Math.min(c.pop*p.rich*K.PROD*mult, G.reserves[k]);
      G.reserves[k]-=out;
      c.store[p.dep]=(c.store[p.dep]||0)+out;
      if(G.reserves[k]<=0&&!c.dry){c.dry=true;G.pauseNow=true;log(G,'depleted',{p:k})}
      /* v4.11 (Nikita, 28.09: 'судно снимается с линии, хотя на складе ещё что-то лежит'): the seam is dead but the
         pile is carried out to the last ton; a hull stands down only when it lands and finds nothing (loadAt) */
    }
    // colonies do not breed. Hands arrive on ships or they do not arrive at all.
  }

  G.partsRate=(G.partsRate||0)+(partsMade-(G.partsRate||0))/K.PARTS_EMA;

  // ---- Earth burns to stay alive ----
  directorStep(G);
  var nd=earthNeed(G);
  G.need=nd;
  var pa=activeCrisis(G);
  if(pa){                                                      // v4.20: the crisis drain, any of the four
    var dr=pulseDrain(G,pa.res);
    if(E[pa.res]>=dr){ E[pa.res]-=dr; G.pulseShort=false }
    else { E[pa.res]=0; var d2=Math.max(0.2,E.people*K.STARVE_KILL*0.5); E.people=Math.max(0,E.people-d2); E.lost=(E.lost||0)+d2;
      if(!G.pulseShort){ G.pulseShort=true; G.pauseNow=true; log(G,'pulse_short',{dep:pa.res}) } }
  }
  var hungry=false, cold=false;
  if(E.food>=nd.food) E.food-=nd.food; else { E.food=0; hungry=true }
  if(E.metal>=nd.metal) E.metal-=nd.metal; else { E.metal=0; cold=true }
  G.hungry=hungry; G.cold=cold;
  if(hungry){                                   // no rations: the home world buries people
    var died=Math.max(0.4,E.people*K.STARVE_KILL);
    E.people=Math.max(0,E.people-died); E.lost=(E.lost||0)+died;
    if(!G.lacking){G.lacking=true;G.pauseNow=true;log(G,'earth_short',{})}
  } else {
    G.lacking=false;
    if(E.lost>0.5){ var back=Math.min(E.lost,E.people*K.MEND+0.2); E.lost-=back }  // recovery is slow
  }

  // ---- something happens out there ----
  if(R()<K.EVENT_CHANCE){
    var keys=Object.keys(G.colonies).filter(function(k){return G.reserves[k]>0});   // v4.11: a dead seam has no pockets and no surprises
    if(keys.length){
      var k=keys[Math.floor(R()*keys.length)], c=G.colonies[k], p=planet(k), roll=R();
      if(roll<0.42){
        var b=Math.round(c.pop*p.rich*K.PROD*40*(0.6+R()));
        c.store[p.dep]=(c.store[p.dep]||0)+b;
        log(G,'ev_rich',{p:k,q:b,dep:p.dep}); G.pauseNow=true;
      } else if(roll<0.58&&G.reserves[k]!==Infinity&&G.reserves[k]>0){
        /* v4.1 (Nikita, 24.09: "жила оказалась больше или меньше, чем планировали"): the mirror of ev_seam */
        var cut=Math.round(G.reserves[k]*(0.25+R()*0.3));
        G.reserves[k]=Math.max(1,G.reserves[k]-cut);
        log(G,'ev_short',{p:k,q:cut,dep:p.dep}); G.pauseNow=true;
      } else if(roll<0.74){
        var lost=Math.round((c.store[p.dep]||0)*(0.25+R()*0.4));
        c.store[p.dep]=Math.max(0,(c.store[p.dep]||0)-lost);
        log(G,'ev_wreck',{p:k,q:lost,dep:p.dep}); G.pauseNow=true;
      } else if(roll<0.88){
        var died=Math.round(c.pop*(0.10+R()*0.15));
        c.pop=Math.max(4,c.pop-died);
        log(G,'ev_disaster',{p:k,q:died}); G.pauseNow=true;
      } else {
        var seam=Math.round(K.RESERVE_BASE*Math.pow(K.RESERVE_GROW,p.sec)*p.rich*(0.15+R()*0.25));
        if(G.reserves[k]!==Infinity){ G.reserves[k]+=seam; c.dry=false; log(G,'ev_seam',{p:k,q:seam,dep:p.dep}); G.pauseNow=true }
      }
    }
  }

  var settled=0; for(var k in G.colonies) settled++;
  if(settled>G.stats.peak) G.stats.peak=settled;
  if(G.day%K.SHIFT_YEARS===0) chronShift(G,settled);

  // ---- the Long Night ----
  if(!G.night&&(SECTORS.length>=K.NIGHT_TRIGGER_SECTORS||G.day>=K.NIGHT_TRIGGER_YEAR)) revealNight(G);
  if(G.night){
    arkDepositTick(G);
    var left=G.night-G.day;
    if(left===K.NIGHT_NEAR||left===100||left===25){ G.pauseNow=true; log(G,'night_near',{n:left,s:arkSouls(G)}) }
    if(!G.mutinyWarned){ var mf=mutinyForecast(G); if(mf&&mf.n<=K.MUTINY_WARN){ G.mutinyWarned=true; G.pauseNow=true; log(G,'mutiny_warn',{n:mf.n,p:mf.pid,f:mf.f,h:Math.round(E.food)}) } }
    if(left===K.DOOMSDAY_AT) log(G,'doomsday',{n:left,b:arkSouls(G),h:Math.round(E.people)});
    if(left<=0){
      G.left=leftBehind(G); G.over='night';
      if(!arkReady(G)){
        // v4.0: an ark without a drive is a monument, not a boat; v4.24: no level paid and no drive is just 'no ark'
        G.boarded=0; G.souls=0; G.grounded=arkLevel(G)>=1; G.cargo=null;
        log(G,'night',{s:0});
        if(G.grounded) log(G,'ark_grounded',{b:arkSouls(G),g:G.arkMark});
        return;
      }
      G.boarded=arkSouls(G); G.wake=arkWake(G); G.souls=Math.floor(G.boarded*G.wake); G.cargo=G.boarded>0?arkCargo(G):null;
      log(G,'night',{s:G.boarded});
      /* v4.14 (run 398763448 review): with no ark or nobody at home there is no departure to chronicle */
      if(G.boarded>0){ log(G,'ark_sailed',{s:G.boarded,b:G.left.home+G.left.hulls+G.left.colonies+G.left.transit});
        log(G,'ark_woke',{w:G.souls,s:G.boarded,g:G.driveLvl||0}) }
      return;
    }
  }
  // there is no victory screen any more — the chart runs as far as you can push it.
  // The only ending is the home world going quiet, and it has to actually arrive.
  if(hungry){
    G.famine=(G.famine||0)+1;
    if(G.famine===1||G.famine===Math.round(K.DEAD_DAYS*0.6)){ G.pauseNow=true; log(G,'earth_dead',{n:K.DEAD_DAYS-G.famine}) }
    if(G.famine>=K.DEAD_DAYS){ G.over='lose'; log(G,'lose',{}); log(G,'desk_silent',{n:K.DEAD_DAYS}) }
  } else if(G.famine) G.famine=Math.max(0,G.famine-1);   // fed days pay famine back one for one, no faster
}

/* ---------- the advisor: the game does the arithmetic and says what wants a decision ----------
   Pure. Returns [{code, sev, pid?, sid?, hull?, n?}] ordered worst-first. */
function advice(G){
  var out=[], E=G.earth, i, k;
  var nd=G.need||earthNeed(G);

  var fd=Math.floor(E.food/Math.max(0.1,nd.food)), md=Math.floor(E.metal/Math.max(0.1,nd.metal));
  if(G.hungry) out.push({code:'a_starving',sev:'bad',n:Math.round(E.people)});
  else if(fd<25) out.push({code:'a_food',sev:fd<10?'bad':'warn',n:fd});
  if(G.cold) out.push({code:'a_cold',sev:'bad'});
  else if(md<25) out.push({code:'a_metal',sev:md<10?'bad':'warn',n:md});
  var hasWell=false; for(k in G.colonies){ var pw=planet(k); if(pw&&pw.kind==='well'&&G.reserves[k]>0) hasWell=true }
  if(!hasWell&&E.fuel<260&&Object.keys(G.colonies).length>=2) out.push({code:'a_nowell',sev:E.fuel<60?'bad':'warn',n:Math.round(E.fuel)});
  else if(E.fuel<30) out.push({code:'a_fuel',sev:E.fuel<12?'bad':'warn',n:Math.round(E.fuel)});
  // hulls of a retired generation sitting idle are metal on the slipway
  var oldIdle=G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&hullGen(s)<(G.gen||0)}).length;
  if(oldIdle>=4) out.push({code:'a_scrap',sev:'ok',n:oldIdle,g:(G.gen||0)});

  for(k in G.colonies){
    var c=G.colonies[k], p=planet(k);
    if(!p) continue;
    var lines=G.ships.filter(function(s){return s.mode!=='dead'&&s.from&&s.to&&(s.from===k||s.to===k)});
    var lr=lineRate(G,k);
    var dep = p.kind==='works'?'parts':p.dep;
    var sitting = Math.round(c.store[dep]||0);
    var dry = G.reserves[k]!==Infinity && G.reserves[k]<=0;

    var cap=popCap(p), miss=Math.floor(cap-c.pop);

    // a worked-out seam with a full warehouse still has something to haul.
    // never tell the player there is nothing to take while the store is full.
    if(dry&&sitting>20){ out.push({code:'a_lastload',sev:'warn',pid:k,n:sitting}); continue }
    if(dry){ if(lines.length) out.push({code:'a_dry',sev:'bad',pid:k,n:lines.length}); continue }

    // v4.6: the standing order waits on the yards
    var Lk=lineOf(G,k); if(Lk&&Lk.wait){ for(var wc in Lk.wait){ var wr=Lk.wait[wc]; if(wr&&(Lk.want[wc]||0)>lineCount(G,k,wc)){ out.push({code:(wr==='metal'||wr==='parts'||wr==='fuel'||wr==='crew')?'a_yard_cost':(wr==='mutiny'?'a_yard_mutiny':'a_yard_range'),sev:'warn',pid:k,c:wc,r:wr}); break } } }
    // v4.4: kits
    if(c.kit&&lines.length&&lineHold(G,k)<c.kit.w) out.push({code:'a_kithold',sev:'warn',pid:k,n:c.kit.w,t:c.kit.tier});
    if(c.kit&&!lines.length) out.push({code:'a_kithold',sev:'warn',pid:k,n:c.kit.w,t:c.kit.tier});
    if(kitTier(c)>0&&(c.fuelOut||0)>=K.KIT_GRACE) out.push({code:'a_kitfuel',sev:'warn',pid:k,t:c.tier});
    if(!lines.length){
      // one message, not three: no line means nothing leaves and no hands arrive
      out.push({code: miss>cap*0.3?'a_nolineShort':'a_noline', sev:'warn', pid:k, n:miss});
    } else {
      if(lr&&lr.piling&&sitting>120) out.push({code:'a_pile',sev:'warn',pid:k,n:sitting});
      // a factory with a line is being fed; only speak up if it has sat idle a long while
      if(p.kind==='works'&&(c.idleWorks||0)>90) out.push({code:'a_feedslow',sev:'warn',pid:k,n:c.idleWorks});
    }
    if(p.kind==='works'&&!lines.length&&(c.store.metal<2||c.store.food<2)) out.push({code:'a_feed',sev:'bad',pid:k});
  }

  var idle=G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)});
  if(idle.length&&idle.length-oldIdle>0) out.push({code:'a_idle',sev:'warn',n:idle.length,sid:idle[0].id});

  var free=null, fleetLim=sectorLimit(G.gen||0);
  for(i=0;i<PLANETS.length;i++){ var pp=PLANETS[i];
    if(!G.colonies[pp.id]&&!G.ghost[pp.id]&&sectorOpen(G,pp.sec)&&pp.sec<=fleetLim){ free=pp.id; break } }
  if(free&&idle.length&&E.people>=K.MIN_FOUND+K.EARTH_KEEP) out.push({code:'a_settle',sev:'ok',pid:free,sid:idle[0].id});

  for(i=HULLS.length-1;i>=0;i--){ var h=HULLS[i];
    if(h.gen!==(G.gen||0)) continue;
    if(reach(G)>=h.reach&&E.metal>=h.metal&&E.fuel>=h.fuel&&E.parts>=(h.parts||0)&&E.people-K.EARTH_KEEP>=(h.crew||0)){ out.push({code:'a_build',sev:'ok',hull:i}); break } }
  // v4.4: one kit suggestion at a time — the richest world with a line that can carry it and a seam worth it
  if(kitOpen(G)){ var bk=null, bv=0;
    for(k in G.colonies){ var ck=G.colonies[k], pk=planet(k); if(!pk) continue; if(canKit(G,k)!=='ok') continue;
      var kk2=kitCost(ck); if(lineHold(G,k)<kk2.w) continue;
      if(G.reserves[k]!==Infinity&&G.reserves[k]<ck.pop*pk.rich*K.PROD*Math.pow(K.KIT_OUT,kk2.tier)*150) continue;   // seam would be gone inside 150 years
      var v=ck.pop*pk.rich; if(v>bv){ bv=v; bk={pid:k,t:kk2.tier} } }
    if(bk) out.push({code:'a_kit',sev:'ok',pid:bk.pid,t:bk.t}) }
  // v4.4: rations pile up for the ark — say so, or the player reads it as waste
  if(G.night&&fd>60) out.push({code:'a_foodpile',sev:'ok',n:fd});
  // v4.10 (Nikita, 27.09): a flock of couriers where one hauler would do
  for(k in G.colonies){ var Lb=lineOf(G,k); if(!Lb) continue; var nc=lineCount(G,k,'courier'); if(nc<3) continue;
    var hi=currentHull(G,'hauler'); if(hi===null||!canReachSector({hull:hi},planet(k).sec)||reach(G)<HULLS[hi].reach) continue;
    out.push({code:'a_bigger',sev:'ok',pid:k,n:nc}); break }
  // v4.7: hulls on the pier with no hands to sign
  var cw=0; for(i=0;i<G.ships.length;i++){ if(G.ships[i].crewWait&&G.ships[i].mode==='idle') cw++ }
  if(cw) out.push({code:'a_crew',sev:'bad',n:cw});
  // hands with nothing to do: the v3.3 problem, said out loud
  if(E.people-K.EARTH_KEEP>420) out.push({code:'a_idlehands',sev:'ok',n:Math.round(E.people)});
  // the Long Night
  if(G.night){
    var nl=nightLeft(G), souls=arkSouls(G), lb=leftBehind(G);
    if(nl<=K.NIGHT_NEAR){
      if(lb.hulls+lb.colonies>souls*0.25) out.push({code:'a_nightrecall',sev:'bad',n:nl,h:lb.hulls,c:lb.colonies});
    }
    if(!arkReady(G)){
      /* two thousand years of a red line nobody can act on yet is noise: it turns bad inside 2×NIGHT_NEAR */
      var fc=driveForecast(G,G.arkMark), gm=G.arkMark, sv2=nl<=K.NIGHT_NEAR*2?'bad':'warn';
      if(fc.st==='ok'&&fc.y>G.night) out.push({code:'a_arkd_late',sev:sv2,gr:gm,y:fc.y,l:fc.y-G.night});
      else if(fc.st==='ok'&&fc.y>G.night-K.NIGHT_NEAR/2) out.push({code:'a_arkd_tight',sev:'warn',gr:gm,y:fc.y,l:G.night-fc.y});
      else if(fc.st==='settled') out.push({code:'a_arkd_reach',sev:sv2,gr:gm,n:fc.n,r:fc.r});
      else if(fc.st==='host') out.push({code:'a_arkd_host',sev:sv2,gr:gm,n:K.DRIVE_POP});
      else if(fc.st==='stalled') out.push({code:'a_arkd_stall',sev:sv2,gr:gm});
    }
    /* v4.5 (run 768210301: nine Generation V couriers bought in the last 300 years never sailed once — every
       crew refused). Say it before the metal is spent: the shortest line still open already refuses. */
    var minRt=null; for(k in G.colonies){ var probe={hull:HULLS.length-3};
      var rt=legDays(G,k,'earth',probe)*2; if(minRt===null||rt<minRt) minRt=rt }
    if(minRt!==null&&nl<K.MUTINY_MIN*minRt) out.push({code:'a_lastbuild',sev:'warn',n:Math.round(minRt),l:nl});
    var mfc=mutinyForecast(G); if(mfc&&mfc.n>0&&mfc.n<=K.MUTINY_WARN) out.push({code:'a_mutinysoon',sev:mfc.n<=30?'bad':'warn',n:mfc.n,pid:mfc.pid,l:mfc.f,h:Math.round(G.earth.food)});
    var mut=0; for(i=0;i<G.ships.length;i++){ if(G.ships[i].mutiny&&G.ships[i].mode==='idle') mut++ }
    if(mut) out.push({code:'a_mutiny',sev:'warn',n:mut});
    if(!G.ark.mode) out.push({code:'a_ark',sev:nl<=K.NIGHT_NEAR?'warn':'ok'});   // v4.24: nothing chosen yet
  }

  if(!G.drive&&settledCount(G)>=driveReachFor(G)){
    for(k in G.colonies){ if(planet(k)&&planet(k).kind==='works'&&G.colonies[k].pop>=K.DRIVE_POP){
      out.push({code:'a_drive',sev:'ok',pid:k,n:(G.driveLvl||0)+1}); break } }
  }
  var sv=canSurvey(G);
  if(sv==='ok') out.push({code:'a_survey',sev:'ok',n:SECTORS.length+1});

  /* v3.2: the chart may now run past the fleet. Two different messages:
     nothing left within range (build the next generation) and nothing left
     at all (chart further out). */
  var freeNear=0, freeFar=0;
  for(i=0;i<PLANETS.length;i++){ var pz=PLANETS[i];
    if(G.colonies[pz.id]||G.ghost[pz.id]) continue;
    if(pz.sec<=fleetLim) freeNear++; else freeFar++; }
  if(!freeNear&&freeFar) out.push({code:'a_genwall',sev:'warn',n:(G.gen||0)+2});
  if(!freeNear&&!freeFar&&sv!=='ok') out.push({code:'a_chartfull',sev:'ok'});

  var rank={bad:0,warn:1,ok:2};
  out.forEach(function(x,n){ x.key=x.code+':'+(x.pid||x.hull||''); });
  /* v3.8.1 (log 57539013): a_metal was dismissed in year 108 and never seen again; Earth ran dry for the
     last 1100 years of the run with the warning silenced. A dismissal now lasts K.DISMISS_YEARS, and a
     warning that has turned bad ignores it. */
  out=out.filter(function(x){ var d=G.dismissed[x.key]; if(d===undefined) return true; if(x.sev==='bad') return true; return G.day-d>K.DISMISS_YEARS });
  out.sort(function(a,b){return rank[a.sev]-rank[b.sev]});
  return out;
}

function dismiss(G,key){ G.dismissed[key]=G.day; return 'ok' }
function undismissAll(G){ G.dismissed={}; return 'ok' }
