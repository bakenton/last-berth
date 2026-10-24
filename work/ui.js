/* LAST BERTH — interface layer. Depends on core.js globals.
   v4.35 (Nikita, 14–16.10: «начинаем полный перенос на новый интерфейс»): the layout of design/ui-v7.html — the map is the
   main screen; six tabs on the left (Earth · Worlds · Tech · Yard · Fleet · Ark), each closed by its own button; a world
   window in the middle, closed by a press beside it, ‹ › to the next world; the strip of resources on top. Earth, the Yard
   and the Ark stop the clock while they are open. Hulls are put on lines by hand only (core v4.34). The prologue is gone:
   the interface opens with everything unlocked; U.tut / can(key) is where the tutorial module plugs in (BRIEF, «Обучение»).
   v4.36 (Nikita 16.10: «модуль tut с Александрой, нарратив и кадры вступления по ui-v7»): the tutorial and the story — see «the
   tutorial and the story» below; a new game opens step by step with the helper, unless the player skipped her. */
(function(){
"use strict";

/* ---------- texts ----------
   v3.6.2 (Nikita, 23.09: "таблица в гугле, в которую будешь грузить все диалоги и реплики"):
   every string the player reads lives in the Google Sheet "LAST BERTH — тексты игры".
   The build bakes it into <script id="lb-texts">; the Earth tab can pull a fresh copy from the
   published CSV when the build carries its link. Code never holds a sentence again. */
var L,LOG,MSG,DEP,GUIDE,VOICE;
var TXT={src:'baked',n:0,at:null};
var TXT_EL=document.getElementById('lb-texts');
var TXT_BAKED=JSON.parse(TXT_EL.textContent);
var TXT_URL=TXT_EL.getAttribute('data-url')||'';
function applyTexts(rows,src){
  var T2={UI:{en:{},ru:{}},LOG:{en:{},ru:{}},MSG:{en:{},ru:{}},RES:{en:{},ru:{}},VOICE:{en:{},ru:{}}};
  var G2={en:[],ru:[]}, n=0;
  rows.forEach(function(r){
    var t=r[0], k=r[1], v={en:r[2],ru:r[3]};
    if(t==='GUIDE'){
      var m=/^p(\d+)\.(title|kicker|b(\d+))$/.exec(k); if(!m) return;
      ['en','ru'].forEach(function(lg){ if(!v[lg]) return;
        var pg=G2[lg][+m[1]-1]=G2[lg][+m[1]-1]||{t:'',k:'',b:[]};
        if(m[2]==='title') pg.t=v[lg]; else if(m[2]==='kicker') pg.k=v[lg]; else pg.b[+m[3]-1]=v[lg]; });
      n++; return;
    }
    if(!T2[t]) return;
    if(v.en) T2[t].en[k]=v.en;
    if(v.ru) T2[t].ru[k]=v.ru;
    n++;
  });
  for(var t in T2){ for(var k in T2[t].en) if(T2[t].ru[k]===undefined) T2[t].ru[k]=T2[t].en[k] }
  function pages(a){ return a.filter(Boolean).map(function(p){ return {t:p.t,k:p.k,b:p.b.filter(function(x){return x!==undefined})} }) }
  L=T2.UI; LOG=T2.LOG; MSG=T2.MSG; DEP=T2.RES; VOICE=T2.VOICE;
  GUIDE={en:pages(G2.en), ru:pages(G2.ru)};
  if(!GUIDE.ru.length) GUIDE.ru=GUIDE.en;
  TXT={src:src, n:n, at:new Date()};
}
applyTexts(TXT_BAKED,'baked');
/* RFC 4180 CSV, enough for a Google Sheets export: quoted cells, doubled quotes, newlines in cells */
function parseCSV(txt){
  var out=[], row=[], cell='', q=false, i=0, c;
  txt=txt.replace(/^﻿/,'');
  for(;i<txt.length;i++){ c=txt[i];
    if(q){ if(c==='"'){ if(txt[i+1]==='"'){ cell+='"'; i++ } else q=false } else cell+=c; continue }
    if(c==='"') q=true;
    else if(c===','){ row.push(cell); cell='' }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&txt[i+1]==='\n') i++; row.push(cell); out.push(row); row=[]; cell='' }
    else cell+=c;
  }
  if(cell!==''||row.length){ row.push(cell); out.push(row) }
  return out;
}
/* Google publishes TSV as plain tab-separated lines (no quoting) — the link Nikita shared is ?output=tsv */
function parseTSV(txt){ return txt.replace(/^\ufeff/,'').split(/\r?\n/).filter(function(l){return l.length}).map(function(l){return l.split('\t')}) }
function sheetRows(txt){
  var first=txt.split(/\r?\n/,1)[0]||'';
  var a=first.indexOf('\t')>=0?parseTSV(txt):parseCSV(txt); if(!a.length) return [];
  var h=a[0].map(function(x){return x.trim().toLowerCase()}), ix={};
  ['table','key','en','ru','status'].forEach(function(c){ ix[c]=h.indexOf(c) });
  if(ix.table<0||ix.key<0||ix.en<0) return [];
  var ph=function(s){ return (String(s||'').match(/\{\w+\}/g)||[]).sort().join() };
  var base={}; TXT_BAKED.forEach(function(r){ base[r[0]+'.'+r[1]]=r });
  return a.slice(1).filter(function(r){ var st=ix.status>=0?(r[ix.status]||'').trim():'live'; return r[ix.key]&&(st===''||st==='live') })
    .map(function(r){ var row=[r[ix.table].trim(),r[ix.key].trim(),r[ix.en]||'',ix.ru>=0?(r[ix.ru]||''):''], b=base[row[0]+'.'+row[1]];
      // a cell that lost or gained a placeholder would print {n} to the player: keep the built-in one
      if(b){ if(row[2]&&ph(row[2])!==ph(b[2])) row[2]=''; if(row[3]&&ph(row[3])!==ph(b[3])) row[3]='' }
      return row });
}
function reloadTexts(){
  if(!TXT_URL){ say('textsNoUrl'); return }
  var done=false, timer=setTimeout(function(){ if(!done){ done=true; say('textsFail') } },8000);
  fetch(TXT_URL+(TXT_URL.indexOf('?')<0?'?':'&')+'t='+Date.now(),{cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error(r.status); return r.text() })
    .then(function(txt){ if(done) return; done=true; clearTimeout(timer);
      var rows=sheetRows(txt); if(!rows.length) throw new Error('empty');
      applyTexts(TXT_BAKED.concat(rows),'sheet'); TXT.n=rows.length; draw(); say('textsOk') })
    .catch(function(){ if(done) return; done=true; clearTimeout(timer); say('textsFail') });
}
function textsVisible(){ return !!TXT_URL || /[?&]dev\b/.test(location.search) }


var TONE={voice:'vo',shift:'ch',first_landfall:'ch',epitaph:'ch',old_night:'ch',ark_sailed:'ch',ark_woke:'ch',ark_grounded:'ch',ark_noconvoy:'ch',ark_drive:'gd',desk_silent:'ch',night_dated:'bd',night_near:'bd',mutiny_warn:'bd',world_cut:'bd',food_horizon:'bd',ark_block:'gd',crash:'bd',reassigned:'hi',surveyed:'gd',drive_mark:'gd',earth_dead:'bd',colony_founded:'gd',delivered:'gd',awaiting:'hi',quota_ok:'gd',relay_up:'gd',ship_returns:'gd',search_found:'gd',punitive_ok:'gd',hyper:'gd',relief_done:'gd',evacuated:'hi',
 quota_miss:'bd',ship_missing:'bd',colony_failed:'bd',ship_written_off:'bd',depleted:'hi',works_idle:'hi',starved:'bd',earth_short:'bd',ev_rich:'gd',ev_seam:'gd',ev_short:'bd',mutiny:'bd',ev_wreck:'bd',ev_disaster:'bd',doomsday:'ch',dropped:'dim',drive_started:'gd',drive_lost:'bd',fragment:'hi',order_sent:'hi'};

var KIND={mine:'kMine',farm:'kFarm',well:'kWell',works:'kWorks'};
var RES=['metal','food','fuel','parts','people'];
/* v3.7 (Nikita, 23.09): a world is drawn in the colour of what it gives — the same colour its resource has everywhere else */
var C={metal:'#C9CFD6',food:'#3DDC84',fuel:'#FF8A1F',parts:'#F2F1EC',people:'#FFD23F',red:'#FF2A1A',ark:'#B48CFF',earth:'#4FA3FF',ink:'#F2F1EC',mid:'#9C9B95',dim:'#5E5D58',bg:'#0B0B0C'};
var KCOL={mine:C.metal,farm:C.food,well:C.fuel,works:C.parts};
/* v4.35 (Nikita 15.10, design/ships-v3 option B): hulls are the game's silhouettes, filled with the colour of their class */
var CLSCOL={courier:'#45D4E8',hauler:'#FF6FB5',freighter:'#F2F1EC'};
var EVCOL={fold:'91,192,235',storm:'255,138,31'};

/* ---------- icons (design/icons-v1.html, accepted 14.10) ---------- */
var ST='fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"', FL='fill="currentColor"';
function gp(d,x){ return '<path d="'+d+'" '+(x||'')+' '+ST+'/>' }
function fp(d,x){ return '<path d="'+d+'" '+(x||'')+' '+FL+'/>' }
var I={
 hold:gp('M3 7 H21 V17 H3 Z')+gp('M7.5 7 V17 M12 7 V17 M16.5 7 V17'),
 speed:gp('M4 17 A8 8 0 1 1 20 17')+gp('M12 16 L16 10'),
 range:gp('M12 12 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0')+gp('M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0','stroke-dasharray="2.5 2"')+gp('M12 12 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0','stroke-dasharray="1.5 2.5" opacity=".6"'),
 lift:gp('M6 3 H18 M6 21 H18 M7 3 C7 9 17 9 17 12 C17 15 7 15 7 21 M17 3 C17 9 7 9 7 12')+fp('M9 19 L12 16 L15 19 Z'),
 night:fp('M15 3 A9.5 9.5 0 1 0 21 17 A8 8 0 0 1 15 3 Z'),
 ark:fp('M2 12 L7 7 H18 L22 12 L18 17 H7 Z')+gp('M10 7 V17 M14 7 V17','stroke="#0B0B0C"'),
 drive:fp('M3 8 H11 V16 H3 Z')+fp('M11 8 L16 5 V19 L11 16 Z')+gp('M18 8 H22 M18 12 H23 M18 16 H22'),
 mine:gp('M5 19 L15 9')+gp('M9 5 C13 3 18 5 20 10 C16 8 13 7 9 5 Z')+fp('M3 20 H9 V22 H3 Z'),
 well:gp('M8 21 L12 4 L16 21 M9.5 15 H14.5 M10.5 10 H13.5')+fp('M12 4 L15 7 H9 Z')+gp('M4 21 H20'),
 farm:gp('M12 21 V6')+fp('M12 6 C9 6 8 3 8 2 C10 2 12 3 12 6 Z M12 10 C9 10 7.5 7.5 7.5 6 C10 6 12 7.5 12 10 Z M12 10 C15 10 16.5 7.5 16.5 6 C14 6 12 7.5 12 10 Z M12 14 C9 14 7.5 11.5 7.5 10 C10 10 12 11.5 12 14 Z M12 14 C15 14 16.5 11.5 16.5 10 C14 10 12 11.5 12 14 Z'),
 works:gp('M12 12 m-3.5 0 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0')+gp('M12 2.5 V5.5 M12 18.5 V21.5 M2.5 12 H5.5 M18.5 12 H21.5 M5.3 5.3 L7.4 7.4 M16.6 16.6 L18.7 18.7 M5.3 18.7 L7.4 16.6 M16.6 7.4 L18.7 5.3','stroke-width="2.6"'),
 free:gp('M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0','stroke-dasharray="3 2.5"')+gp('M12 9 V15 M9 12 H15'),
 workedout:gp('M3 19 H21')+gp('M6 19 L12 11 L18 19','stroke-dasharray="2.5 2"')+gp('M5 5 L19 17','stroke="#FF2A1A"'),
 cutoff:gp('M6 3 H18 M6 21 H18 M7 3 C7 9 17 9 17 12 C17 15 7 15 7 21 M17 3 C17 9 7 9 7 12')+gp('M3 3 L21 21','stroke="#FF2A1A" stroke-width="2.4"'),
 starving:fp('M12 21 C5 18 4 12 6 7 C8 4 11 3 12 3 C13 3 16 4 18 7 C20 12 19 18 12 21 Z','opacity=".9"')+gp('M4 20 L20 4','stroke="#0B0B0C" stroke-width="4"')+gp('M4 20 L20 4','stroke="#FF2A1A" stroke-width="2.2"'),
 settlers:fp('M7 4 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0')+fp('M2.5 14 C2.5 9.5 11.5 9.5 11.5 14 Z')+gp('M13 17 H21 M18 14 L21 17 L18 20'),
 evac:fp('M12 5 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0')+fp('M7.5 15 C7.5 10.5 16.5 10.5 16.5 15 Z')+gp('M12 23 V17.5 M9 20 L12 17 L15 20'),
 fold:gp('M2 12 H9 M6 9 L9 12 L6 15 M22 12 H15 M18 9 L15 12 L18 15'),
 stretch:gp('M9 12 H2 M5 9 L2 12 L5 15 M15 12 H22 M19 9 L22 12 L19 15'),
 storm:fp('M13 2 L5 13 H11 L9 22 L19 9 H13 L15 2 Z'),
 ring:gp('M3 21 A18 18 0 0 1 21 3','stroke-dasharray="3 2.5"')+gp('M3 21 A12 12 0 0 1 15 9')+gp('M15 17 H21 M18 14 V20'),
 loading:gp('M4 12 H20 V20 H4 Z')+gp('M12 2 V10 M9 7 L12 10 L15 7'),
 unloading:gp('M4 12 H20 V20 H4 Z')+gp('M12 10 V2 M9 5 L12 2 L15 5'),
 toEarth:fp('M18 12 m-3.5 0 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0')+gp('M2 12 H11 M8 9 L11 12 L8 15'),
 toWorld:fp('M19 8.5 L22.5 12 L19 15.5 L15.5 12 Z')+gp('M2 12 H11 M8 9 L11 12 L8 15'),
 pier:gp('M12 4 V21 M7 8 H17 M4 15 C4 19 8 21 12 21 C16 21 20 19 20 15')+gp('M12 4 m-2 0 a2 2 0 1 0 4 0'),
 overdue:gp('M12 13 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0')+gp('M12 8 V13.5')+fp('M11 16 H13 V18 H11 Z')+gp('M9 2 H15'),
 mutiny:fp('M8 4 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0')+fp('M3.5 14 C3.5 9.5 12.5 9.5 12.5 14 Z')+gp('M15 6 L21 12 M21 6 L15 12','stroke="#FF2A1A" stroke-width="2.4"')+gp('M3 19 H13'),
 reserve:fp('M2 13 L6 9 H15 L18 13 L15 17 H6 Z')+gp('M18 4 V10 M15.5 4 H20.5','stroke-width="2.2"'),
 kit:gp('M3 8 H21 V20 H3 Z')+gp('M12 14 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0')+gp('M12 9.5 V11 M12 17 V18.5 M7.5 14 H9 M15 14 H16.5'),
 movesTo:gp('M4 18 V12 C4 8 7 6 11 6 H19 M16 3 L19 6 L16 9'),
 assign:fp('M2 12 L6 8 H13 L16 12 L13 16 H6 Z')+gp('M18 12 H23 M20.5 9.5 V14.5'),
 move:gp('M3 8 H19 M16 5 L19 8 L16 11 M21 16 H5 M8 13 L5 16 L8 19'),
 takeoff:fp('M2 12 L6 8 H13 L16 12 L13 16 H6 Z')+gp('M18 12 H23'),
 scrap:fp('M2 12 L6 8 H10 L11.5 10 L10 12 L11.5 14 L10 16 H6 Z')+fp('M13 9 H16 L20 12 L16 15 H13 L14.5 13 L13 12 L14.5 11 Z','transform="translate(2 1)"'),
 upgrade:gp('M10 13 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0')+gp('M10 5 V7.5 M10 18.5 V21 M2 13 H4.5 M15.5 13 H18','stroke-width="2.4"')+gp('M19 9 V2 M16 5 L19 2 L22 5'),
 survey:gp('M3 21 A18 18 0 0 1 21 3')+gp('M3 21 L16 8','stroke-width="2.4"')+fp('M17 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0'),
 send:fp('M6 4 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0')+fp('M1.5 14 C1.5 9.5 10.5 9.5 10.5 14 Z')+fp('M13 12 L17 9 H21 L23 12 L21 15 H17 Z'),
 tEarth:fp('M12 12 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0')+gp('M3 12 H21 M12 3 C8 7 8 17 12 21 C16 17 16 7 12 3','stroke="#0B0B0C" stroke-width="1.4"'),
 tWorlds:gp('M12 12 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0','stroke-dasharray="2 2.5"')+fp('M12 12 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0')+fp('M18.4 5.6 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M4 16 H8 V20 H4 Z'),
 tFleet:fp('M2 7 L5 4 H12 L14 7 L12 10 H5 Z M8 14 L11 11 H18 L20 14 L18 17 H11 Z M3 20 L5 18 H9 L10 20 L9 22 H5 Z'),
 tTech:gp('M5 12 L12 6 L19 12 M5 18 L12 12 L19 18','stroke-width="2.2"')+gp('M5 6 H19','opacity=".5"'),
 warn:fp('M12 3 L22 20 H2 Z')+gp('M12 9 V14 M12 16.5 V17','stroke="#0B0B0C" stroke-width="2.2"'),
 metalA:fp('M3 18 H21 L18 9 H6 Z')+fp('M7 8 H17 L16 5 H8 Z','opacity=".55"'),
 foodA:gp('M12 22 V8')+fp('M12 8 C10 8 9.5 5 12 2 C14.5 5 14 8 12 8 Z M12 12.5 C9 12.5 7 10.5 7 8.5 C10 8.5 12 10 12 12.5 Z M12 12.5 C15 12.5 17 10.5 17 8.5 C14 8.5 12 10 12 12.5 Z M12 17 C9 17 7 15 7 13 C10 13 12 14.5 12 17 Z M12 17 C15 17 17 15 17 13 C14 13 12 14.5 12 17 Z'),
 fuelA:fp('M12 2 C17 9 19 12.5 19 15 A7 7 0 0 1 5 15 C5 12.5 7 9 12 2 Z'),
 partsA:fp('M12 2 L20.5 7 V17 L12 22 L3.5 17 V7 Z')+fp('M12 12 m-3.5 0 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0','fill="#0B0B0C"'),
 peopleA:fp('M12 6 m-3.5 0 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0')+fp('M4 21 C4 13 20 13 20 21 Z'),
 menu:gp('M4 7 H20 M4 12 H20 M4 17 H20')
};
I.build=gp('M3 3 H21 V21 H3 Z','opacity=".45"')+gp('M3 9 H21 M3 15 H21 M9 3 V21 M15 3 V21','opacity=".25" stroke-width="1"')+gp('M5 13 L7.5 10 H15 L18.5 13 L16 16 H7.5 Z');
I.tYard=I.build;
function ic(k,sz,col){ sz=sz||16; return '<svg class="ic" viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'"'+(col?' style="color:'+col+'"':'')+' aria-hidden="true">'+(I[k]||'')+'</svg>' }
var RESI={metal:'metalA',food:'foodA',fuel:'fuelA',parts:'partsA',people:'peopleA'};
function resIc(k,sz){ return ic(RESI[k],sz||14,C[k]) }
function shipIc(cls,sz){ sz=sz||34; return '<svg class="gi" viewBox="0 0 64 40" width="'+sz+'" height="'+(sz*40/64).toFixed(1)+'" style="color:'+CLSCOL[cls]+'" aria-hidden="true"><use href="#i-'+cls+'"/></svg>' }
var WMARK={mine:'<circle r="6"/>',farm:'<rect x="-5.5" y="-5.5" width="11" height="11"/>',well:'<path d="M0-7L7 0L0 7L-7 0Z"/>',works:'<path d="M0-7L7 5.5H-7Z"/>'};
function wmark(kind,on,sz){ sz=sz||14; var m=WMARK[kind].replace('/>',on?' fill="currentColor"/>':' fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.5 2"/>');
  return '<svg viewBox="-9 -9 18 18" width="'+sz+'" height="'+sz+'" style="color:'+(on?KCOL[kind]:C.mid)+';flex:none" aria-hidden="true">'+m+'</svg>' }

/* ---------- state ---------- */
/* U.tut / can(key): the tutorial decides what the player may see; with its lock off everything is open.
   A resource is opened in the core (openRes) the moment the interface shows it — so the tutorial controls Earth's burn. */
var U={tut:tutBlank(), hist:[], lang:'en', langPicked:false, menu:false, speed:2, paused:false, acc:0, last:0, ff:false, shiftStop:true,
  tab:null, win:null, pop:null, filter:'all', addTab:'free', who:{}, scrapArm:null, focus:null, notes:[], driveAt:null, ovlOff:false};
var G=null;
function can(k){ return !U.tut.lock||!!U.tut.open[k] }
function T(k,p){ var s=(L[U.lang][k]!==undefined?L[U.lang][k]:k); return fill(s,p) }
var YRS={en:['year','years','years'],ru:['год','года','лет']};
function yrs(n){ n=Math.abs(Math.round(+n||0)); var a=YRS[U.lang]||YRS.en;
  if(U.lang==='ru'){ var m=n%10, h=n%100; if(h>=11&&h<=14) return a[2]; if(m===1) return a[0]; if(m>=2&&m<=4) return a[1]; return a[2] }
  return n===1?a[0]:a[1] }
function fill(s,p){ if(!p) return s; return String(s).replace(/\{(\w+)\}/g,function(_,k){
  if(k==='yr') return yrs(p.n); if(k==='yrt') return yrs(p.t); if(k==='yrl') return yrs(p.l); if(k==='yrd') return yrs(p.d);
  return p[k]!==undefined?p[k]:'{'+k+'}' }) }
function el(id){ return document.getElementById(id) }
/* v4.8 (Nikita, 27.09: 'игра подтормаживает'): a panel is only rewritten when its markup changed */
var HTMLCACHE={};
/* v4.35 (reviewer): a panel rewritten on every tick kept losing its scroll — the scroll of its lists is carried over while it shows the same thing (key) */
function setHTML(id,html,key){ if(HTMLCACHE[id]===html) return false; HTMLCACHE[id]=html; var e=el(id), keep=null;
  if(key!==undefined&&e._k===key){ keep=[]; e.querySelectorAll('.lst,.bd,.tbl').forEach(function(x){ keep.push(x.scrollTop) }) }
  e._k=key; e.innerHTML=html;
  if(keep&&keep.length){ var n=e.querySelectorAll('.lst,.bd,.tbl'); for(var i=0;i<n.length&&i<keep.length;i++) n[i].scrollTop=keep[i] }
  return true }
function esc(s){ return String(s).replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c] }) }
/* numbers read in groups of three: 27 920 */
function num(x){ var n=Math.round(+x||0), s=String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' '); return (n<0?'−':'')+s }
function dec(x){ return (Math.abs(x)<10?x.toFixed(1):num(x)) }
var ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
function roman(n){ return ROMAN[n]||String(n+1) }
function genB(g,old){ return '<span class="gen'+(old?' old':'')+'">'+roman(g)+'</span>' }
function pname(id){ var p=planet(id); return p?p.name.toUpperCase():id }
function hullName(h){ return fill(T('hullFmt'),{t:T(h.key),n:T('hullNm_'+h.key),g:roman(h.gen||0)}) }   // v4.20: class + Greek name
function hname(s){ return T(shipClass(s))+' '+roman(hullGen(s))+' '+fill(T('hullNo'),{n:s.id}) }
function kindWord(k){ return T(KIND[k]) }

/* ---------- prices: the icon and the number, the short part red; a resource the player has not met is not shown ---------- */
function haveOf(k,E){ return k==='people'?E.people-K.EARTH_KEEP:E[k] }
function price(c,E,sz){ var out='';
  RES.forEach(function(k){ if(!c[k]||!can(k)) return; var sh=E&&haveOf(k,E)<c[k];
    out+='<span class="pr'+(sh?' short':'')+'">'+resIc(k,sz||13)+num(c[k])+'</span>' });
  return out }
/* the first thing Earth is short of, as a why-code with the shortfall */
function shortWhy(c,E){
  for(var i=0;i<RES.length;i++){ var k=RES[i]; if(!c[k]) continue; var have=haveOf(k,E);
    if(have<c[k]) return ['short_'+k,{n:Math.ceil(c[k]-have),k:K.EARTH_KEEP}] }
  return ['ok',null] }
/* v4.12: a blocked button is never mute — off(code,p) marks it, and a press on it says why */
function off(code,p){ return (code&&code!=='ok') ? ' aria-disabled="true" data-why="'+attr(code)+'"'+(p?' data-whyp="'+attr(JSON.stringify(p))+'"':'') : '' }
function offW(w){ return typeof w==='string'?off(w):off(w[0],w[1]) }
function whyText(code,p){ return fill(MSG[U.lang][code]||code,p||null) }
function btn(label,act,data,kind,icon,dis){ var d=''; for(var k in (data||{})) d+=' data-'+k+'="'+attr(data[k])+'"';
  return '<button class="b'+(kind?' '+kind:'')+'" type="button"'+(act?' data-act="'+act+'"':'')+d+(dis||'')+'>'+(icon?ic(icon,15):'')+label+'</button>' }

/* ---------- messages ---------- */
/* v4.9 / v4.12 (Nikita, 30.09: 'когда я нажал кнопку, я хочу видеть подтверждение'): every order answers — a toast at the
   foot of the map, green with what happened, red with why not. Nothing here stops the clock. */
function toast(html,cls,ms,snd){ var box=el('toasts'); if(!box) return;
  var t=document.createElement('div'); t.className='toast'+(cls?' '+cls:''); t.innerHTML=html; box.insertBefore(t,box.firstChild);
  if(snd!==false) SFX.play(snd||(cls==='bad'?'warn':'info'));
  while(box.children.length>5) box.removeChild(box.lastChild);
  setTimeout(function(){ t.classList.add('gone'); setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t) },400) }, ms||6000) }
var GOOD_CODES={ok:1,lineSet:1,policySet:1,copied:1,saved:1,textsOk:1,queued:1};
function say(code,p){ var good=GOOD_CODES[code]||/^ok_/.test(code);
  toast(esc(whyText(code,p)), good?'good':(code==='halted'?'':'bad'), 3600, false);
  SFX.play(good?'ok':(code==='halted'?'info':'deny')) }
function logText(e){ var tpl=LOG[U.lang][logKey(e)]; if(!tpl) return '';
  var d={}; for(var q in e.d) d[q]=e.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p); if(d.dep) d.dep=DEP[U.lang][d.dep]||d.dep; if(d.lobe!==undefined) d.lobe=T('lobe'+d.lobe); if(d.g!==undefined) d.g=roman(d.g); if(d.t!==undefined&&String(e.code).slice(0,4)==='kit_') d.t=roman(d.t-1);
  if(e.code==='voice'){ var v=voiceLine(e); return v.who+' '+v.name+': '+v.line }
  return fill(tpl,d) }
function toastLast(){ var e=G.log[G.log.length-1]; if(!e) return;
  if(NOTE_CODES[e.code]&&!U.ff) return;   // v4.30: these stop the desk with a full-screen notice (voiceWatch)
  var t=logText(e); if(!t) return;
  if(e.code==='depleted'){ toast('<b>'+esc(T('alertDepleted'))+'</b>&nbsp;'+esc(t),'bad',9000,'bad'); return }
  toast(esc(t), TONE[e.code]==='bd'?'bad':'', 6000) }
/* v4.10 (Nikita, 27.09): rations low and no farm feeding Earth → a yellow line, once a shift */
function foodWatch(){ if(!G.need) return; var y=G.earth.food/Math.max(0.1,G.need.food);
  var farms=0; for(var k in G.colonies){ if(planet(k).kind==='farm'&&G.reserves[k]>0&&onLine(G,k).length) farms++ }
  if(y<K.FOOD_WARN_YEARS&&!farms&&(!U.foodWarnAt||G.day-U.foodWarnAt>=K.SHIFT_YEARS)){ U.foodWarnAt=G.day; toast('<b>'+esc(T('alertFood'))+'</b>&nbsp;'+esc(fill(T('u_alertFoodBody'),{n:Math.round(y)})),'warn',12000,'bad') } }
/* shift lines rotate between variants so a long calm run does not read as one sentence pasted ten times */
function logKey(e){ if(e.code!=='shift') return e.code; var b='shift_'+e.d.k, v=(e.d.n||0)%3; return (v&&LOG[U.lang][b+(v+1)])?b+(v+1):b }

var SFX=(function(){
  var ctx=null, master=null, on=true, lastAt={};
  try{ on=localStorage.getItem('lb.sfx')!=='0' }catch(e){}
  function ac(){ if(ctx) return ctx; var C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
    ctx=new C(); master=ctx.createGain(); master.gain.value=0.5; master.connect(ctx.destination); return ctx }
  function unlock(){ var c=ac(); if(c&&c.state==='suspended') c.resume() }
  function tone(f,t0,dur,type,vol,f2){ var c=ac(); if(!c) return; var o=c.createOscillator(), g=c.createGain();
    o.type=type||'square'; o.frequency.setValueAtTime(f,t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol||0.2,t0+0.006); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0+dur+0.02) }
  function noise(t0,dur,vol){ var c=ac(); if(!c) return; var n=Math.floor(c.sampleRate*dur), b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
    for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    var src=c.createBufferSource(); src.buffer=b; var hp=c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2500;
    var g=c.createGain(); g.gain.value=vol||0.15; src.connect(hp); hp.connect(g); g.connect(master); src.start(t0) }
  var P={
    click:function(t){ noise(t,0.018,0.14); tone(1900,t,0.025,'square',0.05) },
    tab:  function(t){ tone(1000,t,0.035,'square',0.06) },
    ok:   function(t){ tone(660,t,0.06,'square',0.11); tone(990,t+0.07,0.1,'square',0.11) },
    deny: function(t){ tone(170,t,0.09,'square',0.15); tone(120,t+0.1,0.13,'square',0.13) },
    info: function(t){ tone(880,t,0.09,'sine',0.14) },
    warn: function(t){ tone(560,t,0.09,'square',0.13); tone(440,t+0.12,0.16,'square',0.13) },
    bad:  function(t){ for(var i=0;i<3;i++) tone(220,t+i*0.17,0.11,'sawtooth',0.17) },
    crit: function(t){ for(var i=0;i<4;i++) tone(360,t+i*0.24,0.16,'sawtooth',0.2,200) },
    voice:function(t){ tone(1320,t,0.05,'sine',0.1); tone(1760,t+0.06,0.14,'sine',0.1) },
    evgood:function(t){ tone(523,t,0.12,'triangle',0.15); tone(659,t+0.11,0.12,'triangle',0.15); tone(784,t+0.22,0.2,'triangle',0.15) },   // v4.21: an event for the better — three rising notes
    evbad: function(t){ tone(330,t,0.2,'triangle',0.17); tone(247,t+0.22,0.28,'triangle',0.17,196) }   // …and for the worse — two falling ones
  };
  function play(k){ if(!on) return; var c=ac(); if(!c||c.state!=='running') return;
    var now=performance.now(); if(lastAt[k]&&now-lastAt[k]<45) return; lastAt[k]=now; var f=P[k]; if(f) f(c.currentTime) }
  function set(v){ on=!!v; try{ localStorage.setItem('lb.sfx',on?'1':'0') }catch(e){} }
  document.addEventListener('pointerdown',unlock,true); document.addEventListener('keydown',unlock,true);
  return {play:play,set:set,isOn:function(){return on}};
})();
/* v4.12: the press mark — a square that blooms where the pointer hit, so a click is seen even when the
   panel under it is redrawn in the same frame */
function pressFx(x,y,kind){ if(!(x>0||y>0)) return; var d=document.createElement('div'); d.className='pfx'+(kind?' '+kind:'');
  d.style.left=x+'px'; d.style.top=y+'px'; document.body.appendChild(d); setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d) },400) }
/* v4.12: a blocked button is never mute — off(code,p) marks it, and a click on it says why (see the click handler) */
function attr(v){ return String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;') }

/* ---------- personal files ----------
   v3.9 (Nikita, 23.09: "симулятор безликого логиста", "люди сменяются чаще, чем корабли приходят,
   личности ничто, винтики"). Roles and hulls persist; people do not. At a few moments the desk gets a
   face: a procedural portrait, a role, a name, a service number, one line from the VOICE table. The line
   goes to the journal always; the window opens at most once per VOICE_GAP years, except the moments
   that matter (the date, a last flight, the pier). Nothing here touches the core. */
var VOICE_GAP=50, CAPT_TENURE=30;
function hash32(a,b){ var h=(a|0)^0x9E3779B9; h=Math.imul(h^(b|0),0x85EBCA6B); h^=h>>>13; h=Math.imul(h,0xC2B2AE35); return (h^(h>>>16))|0 }
function personName(seed){ var pool=(T('names')||'').split(/\s+/).filter(Boolean); if(!pool.length) return '—'; return pool[Math.abs(seed)%pool.length].toUpperCase() }
function serviceNo(seed){ return 1000+(Math.abs(hash32(seed,77))%9000) }
function voiceKeys(trigger){ return Object.keys(VOICE.en||{}).filter(function(k){ return k.indexOf(trigger+'.')===0 }) }
function voice(trigger,role,d,o){
  o=o||{}; var keys=voiceKeys(trigger); if(!keys.length) return;
  var seed=hash32(G.seed^(o.day!==undefined?o.day:G.day), (o.seed||0)^((o.seq||0)*7919));
  var k=keys[Math.abs(hash32(seed,3))%keys.length];
  var name=personName(seed), no=serviceNo(seed);
  log(G,'voice',{k:k,role:role,name:name,no:no,d:d||{}});
  if(o.quiet) return;   // v4.1: most of the world speaks in the journal only; the window is for the moments that matter
  if(o.force || G.day-(U.voiceLast||0)>=VOICE_GAP){
    /* v4.30 (Nikita, 11.10: 'уведомления от экипажей норм, но пусть они не перекрывают весь экран, внизу вылазят'):
       a crew's word is a card at the foot of the chart and the clock runs on; only the Night, the ark drive and
       the last flights (force) still take the whole screen. */
    if(!o.force&&U.pf&&!U.pf.low) return;
    U.voiceLast=G.day;
    U.pf={k:k,role:role,name:name,no:no,d:d||{},seed:seed,sub:o.sub||'',low:!o.force,day:G.day};
    SFX.play('voice');
  }
}
['fold','drag','storm','crisis','spoil'].forEach(function(t){ var g=t==='fold'; TONE[t+'_warn']=g?'gd':'bd'; TONE[t+'_start']=g?'gd':'bd'; TONE[t+'_end']='gd' }); TONE.pulse_short='bd';   // v4.21: the director's events
function voiceLine(e){ var v=VOICE[U.lang]||{}; var d={}; for(var q in e.d.d) d[q]=e.d.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p); if(d.dep) d.dep=DEP[U.lang][d.dep]||d.dep; if(d.lobe!==undefined) d.lobe=T('lobe'+d.lobe); return {who:v[e.d.role]||e.d.role,name:e.d.name,line:fill(v[e.d.k]||e.d.k,d)} }
/* what the log said since last time, and who answers it */
function voiceWatch(){
  if(!G) return;
  U.voiceSeq=U.voiceSeq||0; U.voy=U.voy||{}; U.capt=U.capt||{}; U.founded=U.founded||0;
  var i, e, maxSeq=U.voiceSeq;
  /* v4.2 fix: voice() pushes to G.log, and a full log (400) drops its oldest entry on every push — so
     iterating G.log itself skipped every second new entry once the log was full. Snapshot first. */
  var fresh=[]; for(i=0;i<G.log.length;i++){ if((G.log[i].seq||0)>U.voiceSeq) fresh.push(G.log[i]) }
  for(i=0;i<fresh.length;i++){ e=fresh[i]; if(e.seq>maxSeq) maxSeq=e.seq;
    var d=e.d||{};
    /* v4.1 (Nikita, 24.09: "хочу больше сообщений с лором и переживаниями"): the Institute physicist
       brings the date and the drive; the shift chief reports what Earth becomes; captains and heads
       speak on losses and on the seams. Windows only for the date, the ark drive, the square and a lost
       hull; everything else is a journal line. */
    if(e.code==='night_dated'){ var f0=driveForecast(G,G.arkMark);
      /* v4.14: {fy} is a whole sentence — a year at this pace, or why there is no year yet */
      var fy0= f0.st==='ok' ? fill(T('fyOk'),{y:f0.y}) : fill(T('fyNone'),{w: f0.st==='settled'?fill(T('arkdReach'),{n:f0.n,r:f0.r}):(f0.st==='host'?fill(T('arkdHost'),{n:K.DRIVE_POP}):T('arkdStall'))});
      voice('night_dated','role_sci',{y:d.y,g:roman(G.arkMark),fy:fy0},{force:true,day:e.day,seq:e.seq}) }
    else if(e.code==='ark_drive') voice('ark_drive','role_sci',{g:roman(d.g),w:d.w,y:d.y},{force:true,day:e.day,seq:e.seq});
    else if(e.code==='doomsday') voice('doomsday','role_chief',{n:d.n,b:d.b,h:d.h},{force:true,day:e.day,seq:e.seq});
    else if(e.code==='shift'&&d.k==='dated') voice('date_shift','role_chief',{y:G.night},{quiet:true,day:e.day,seq:e.seq});
    else if(e.code==='mutiny') voice('mutiny','role_captain',{hull:d.n,p:d.p},{seed:hash32(0x5c,d.n),day:e.day,seq:e.seq,sub:fill(T('pfHull'),{n:d.n,k:U.capt[d.n]||1})});
    else if(e.code==='colony_failed') voice('crash','role_captain',{hull:d.n,p:d.p},{seed:hash32(0x56,d.n),day:e.day,seq:e.seq,sub:fill(T('pfHull'),{n:d.n,k:U.capt[d.n]||1})});
    else if(e.code==='ship_written_off') voice('written_off','role_duty',{hull:d.n,crew:d.c},{quiet:true,day:e.day,seq:e.seq});
    else if(e.code==='ev_seam') voice('seam_more','role_head',{p:d.p,q:d.q,dep:d.dep},{quiet:true,seed:hash32(0x57,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if(e.code==='ev_short') voice('seam_less','role_head',{p:d.p,q:d.q,dep:d.dep},{quiet:true,seed:hash32(0x58,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if(e.code==='ev_rich') voice('seam_rich','role_head',{p:d.p,q:d.q,dep:d.dep},{quiet:true,seed:hash32(0x59,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if(e.code==='ev_wreck') voice('wreck','role_head',{p:d.p,q:d.q,dep:d.dep},{quiet:true,seed:hash32(0x5a,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if(e.code==='ev_disaster') voice('disaster','role_head',{p:d.p,q:d.q},{quiet:true,seed:hash32(0x5b,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if(/^(fold|drag|storm|crisis|spoil)_(warn|start)$/.test(e.code)){ var dd={}; for(var qq in d) dd[qq]=d[qq]; if(dd.dep) dd.dep=DEP[U.lang][dd.dep]||dd.dep; if(dd.lobe!==undefined) dd.lobe=T('lobe'+dd.lobe);
      var evt=e.code.split('_')[0], evg=evt==='fold', evtxt=fill(LOG[U.lang][e.code],dd);
      /* v4.30 (Nikita, 11.10): the warning stops the desk on the whole screen; while the event runs, the bar on the chart blinks */
      if(/_warn$/.test(e.code)&&!U.ff) note({k:T('noteEvent'),title:evName(evt)+' · '+(d.lobe!==undefined?T('lobe'+d.lobe):T('earthNode')),body:evtxt,cls:evg?'good':'bad',snd:evg?'evgood':'evbad'});
      else toast(esc(evtxt), evg?'':'bad', 9000, evg?'evgood':'evbad') }
    else if(e.code==='night_near'&&d.n===100){ var big=null; for(var kk in G.colonies){ if((!big||G.colonies[kk].pop>G.colonies[big].pop)) big=kk } if(big) voice('left_behind','role_head',{p:big},{force:true,seed:hash32(0x53,(+big.slice(1)||0)),day:e.day,seq:e.seq}) }
    else if(e.code==='night_near'&&d.n===25){ var lb=leftBehind(G); voice('ark_closed','role_chief',{left:lb.home+lb.hulls+lb.colonies+lb.transit},{force:true,day:e.day,seq:e.seq}) }
    else if(NOTE_CODES[e.code]&&!U.ff){ var nd={}; for(var nq in d) nd[nq]=d[nq]; if(nd.p&&planet(nd.p)) nd.p=pname(nd.p);
      note(e.code==='drive_mark' ? {k:T('noteDrive'),title:fill(T('newGenTitle'),{g:roman(G.gen||0)}),body:fill(LOG[U.lang][e.code],nd)+' '+T('u_newGenBody'),cls:'good',snd:'evgood'}
                                 : {k:T('noteWarn'),title:T(NOTE_CODES[e.code]),body:fill(LOG[U.lang][e.code],nd),cls:'bad',snd:'crit'}) }
    else if(e.code==='colony_founded'&&planet(e.d.p)&&planet(e.d.p).kind==='works'&&!U.worksSeen){ U.worksSeen=true; toast('<b>'+esc(T('alertWorks'))+'</b>&nbsp;'+esc(fill(T('u_worksBody'),{p:pname(e.d.p),n:driveWorkFor(G)})),'warn',14000) }
    else if(e.code==='kit_built') voice('kit_built','role_head',{p:d.p,t:roman(d.t-1),x:d.x},{quiet:true,seed:hash32(0x5d,(+String(d.p).slice(1)||0)+d.t*7),day:e.day,seq:e.seq});
    else if(e.code==='kit_starved') voice('kit_starved','role_head',{p:d.p,t:roman(d.t-1)},{quiet:true,seed:hash32(0x5e,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if(e.code==='colony_founded'){ U.founded++; voice('colony_founded','role_head',{pop:d.pop,p:d.p},{seed:hash32(0x51,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq}) }
    else if(e.code==='ship_missing'){ var sm=shipById(G,d.n); voice('ship_missing','role_duty',{hull:d.n,crew:sm?sm.crew:0},{day:e.day,seq:e.seq}) }
    else if(e.code==='evacuated'||e.code==='evac_partial') voice('evacuated','role_head',{pop:d.pop,p:d.p},{seed:hash32(0x52,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if((e.code==='launch_colony'||e.code==='launch_evac')&&G.night){ var sh=shipById(G,d.n); if(sh&&sh.total*2>nightLeft(G)) voice('last_flight','role_captain',{hull:d.n},{force:true,seed:hash32(0x54,d.n),day:e.day,seq:e.seq,sub:fill(T('pfHull'),{n:d.n,k:U.capt[d.n]||1})}) }
  }
  U.voiceSeq=maxSeq;
  // captains: a crossing longer than a career hands the hull to the next one
  for(i=0;i<G.ships.length;i++){ var s=G.ships[i];
    if(s.mode==='transit'){ if(!U.voy[s.id]) U.voy[s.id]=G.day }
    else if(s.mode==='idle'&&s.at==='earth'&&U.voy[s.id]){ var dur=G.day-U.voy[s.id]; delete U.voy[s.id];
      if(dur>=CAPT_TENURE){ U.capt[s.id]=(U.capt[s.id]||1)+1; voice('captain_new','role_captain',{hull:s.id,k:U.capt[s.id]},{seed:hash32(0x55,s.id*1000+U.capt[s.id]),sub:fill(T('pfHull'),{n:s.id,k:U.capt[s.id]})}) } }
    else if(s.mode==='dead'||s.mode==='missing'){ delete U.voy[s.id] }
  }
}
/* the face: 64×64, bone on black, ordered dither — nobody drew it, and it is different every time */
function drawPortrait(cv,seed){
  var r=mulberry32(seed), W=64, H=64, ctx=cv.getContext('2d');
  cv.width=W; cv.height=H;
  var fw=20+Math.floor(r()*9), fh=27+Math.floor(r()*9), cx=32+Math.floor(r()*5)-2, cy=34+Math.floor(r()*4)-2;
  var eyeY=cy-Math.floor(fh*0.12)-Math.floor(r()*3), gap=Math.floor(fw*0.36)+Math.floor(r()*3), eyeS=1+Math.floor(r()*2);
  var browT=Math.floor(r()*5)-2, noseL=Math.floor(fh*0.28)+Math.floor(r()*4), mouthW=Math.floor(fw*0.45)+Math.floor(r()*5), mouthY=cy+Math.floor(fh*0.32)+Math.floor(r()*3);
  var hair=Math.floor(r()*5), glasses=r()<0.22, beard=r()<0.25, light=r()<0.5?-1:1, sag=r()*0.35;
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
  // head: a lit ellipse with a shadow on one side
  var g=ctx.createLinearGradient(cx-fw,0,cx+fw,0);
  if(light<0){ g.addColorStop(0,'#f0f0f0'); g.addColorStop(0.6,'#b0b0b0'); g.addColorStop(1,'#505050') }
  else { g.addColorStop(0,'#505050'); g.addColorStop(0.4,'#b0b0b0'); g.addColorStop(1,'#f0f0f0') }
  ctx.fillStyle='#202020'; ctx.fillRect(0,0,W,H);                       // a dim wall behind the head, so the hair reads
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(cx,cy,fw,fh,0,0,Math.PI*2); ctx.fill();
  // neck and shoulders
  ctx.fillStyle='#6a6a6a'; ctx.fillRect(cx-Math.floor(fw*0.35),cy+fh-4,Math.floor(fw*0.7),12);
  ctx.fillStyle='#4a4a4a'; ctx.beginPath(); ctx.ellipse(cx,H+6,fw+18,16,0,Math.PI,Math.PI*2); ctx.fill();
  // hair
  ctx.fillStyle='#606060';
  if(hair===1){ ctx.beginPath(); ctx.ellipse(cx,cy-fh*0.55,fw+1,fh*0.55,0,Math.PI,Math.PI*2); ctx.fill() }
  else if(hair===2){ ctx.beginPath(); ctx.ellipse(cx,cy-fh*0.5,fw+2,fh*0.62,0,Math.PI,Math.PI*2); ctx.fill(); ctx.fillRect(cx-fw-2,cy-fh*0.5,6,fh*0.9); ctx.fillRect(cx+fw-4,cy-fh*0.5,6,fh*0.9) }
  else if(hair===3){ ctx.beginPath(); ctx.ellipse(cx+light*3,cy-fh*0.6,fw-2,fh*0.45,0,Math.PI,Math.PI*2); ctx.fill() }
  else if(hair===4){ ctx.fillStyle='#707070'; ctx.beginPath(); ctx.ellipse(cx,cy-fh*0.62,fw+3,fh*0.42,0,Math.PI,Math.PI*2); ctx.fill(); ctx.fillRect(cx-fw-3,cy-fh*0.62,2*fw+6,3) }
  // brows, eyes
  ctx.fillStyle='#101010';
  ctx.fillRect(cx-gap-3,eyeY-4-browT,7,2); ctx.fillRect(cx+gap-4,eyeY-4+browT,7,2);
  ctx.fillStyle='#f0f0f0'; ctx.fillRect(cx-gap-2,eyeY-1,5,3); ctx.fillRect(cx+gap-3,eyeY-1,5,3);
  ctx.fillStyle='#000'; ctx.fillRect(cx-gap-1+Math.floor(sag*2),eyeY,eyeS+1,2); ctx.fillRect(cx+gap-2+Math.floor(sag*2),eyeY,eyeS+1,2);
  if(glasses){ ctx.strokeStyle='#e8e8e8'; ctx.lineWidth=1; ctx.strokeRect(cx-gap-4.5,eyeY-3.5,9,7); ctx.strokeRect(cx+gap-4.5,eyeY-3.5,9,7); ctx.beginPath(); ctx.moveTo(cx-gap+4.5,eyeY); ctx.lineTo(cx+gap-4.5,eyeY); ctx.stroke() }
  // nose, mouth
  ctx.fillStyle='#2a2a2a'; ctx.fillRect(cx+light,eyeY+3,1,noseL); ctx.fillRect(cx-1,eyeY+3+noseL,3,1);
  ctx.fillStyle='#181818'; ctx.fillRect(cx-Math.floor(mouthW/2),mouthY,mouthW,2);
  if(beard){ ctx.fillStyle='rgba(20,20,20,.75)'; ctx.beginPath(); ctx.ellipse(cx,cy+fh*0.6,fw*0.8,fh*0.38,0,0,Math.PI); ctx.fill() }
  // ordered dither to two colours: black and bone
  var img=ctx.getImageData(0,0,W,H), p=img.data, B=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
  for(var y=0;y<H;y++) for(var x=0;x<W;x++){ var i=(y*W+x)*4; var v=(p[i]*0.299+p[i+1]*0.587+p[i+2]*0.114)/255;
    var on = v > (B[y&3][x&3]+0.5)/16;
    p[i]=on?0xF2:0; p[i+1]=on?0xF1:0; p[i+2]=on?0xEC:0; p[i+3]=255 }
  ctx.putImageData(img,0,0);
}

/* ---------- map geometry ---------- */
var STARS=null;
function starfield(){
  if(STARS) return STARS;
  var r=mulberry32(9137), o='';
  for(var i=0;i<190;i++){
    var x=(r()*1000).toFixed(1), y=(r()*700).toFixed(1), q=r();
    o+='<rect x="'+x+'" y="'+y+'" width="'+(q>0.93?1.6:1)+'" height="'+(q>0.93?1.6:1)+'" fill="#F2F1EC" opacity="'+(0.08+q*0.22).toFixed(2)+'"/>';
  }
  STARS=o; return o;
}
var CX=500, CY=350;
function nodeXY(n){ if(!n) return null; if(n==='earth') return {x:CX,y:CY}; var pp=planet(n); return pp?pos(pp):null }
/* v4.35 (regress, seed 309573272: BRINE sat under SOLACE — a world stands on its ring at its angle, and two worlds of one ring
   can share an angle): worlds closer than POS_GAP are pushed apart, once per chart */
var POSC={}, POSN=-1, POS_GAP=28;
function pos(p){ if(POSN!==PLANETS.length||!POSC[p.id]) layoutPos(); return POSC[p.id] }
function layoutPos(){ var Ls=PLANETS.map(function(q){ var R=SECTORS[q.sec].r; return {id:q.id,x:CX+Math.cos(q.ang)*R*1.32,y:CY+Math.sin(q.ang)*R*0.90} });
  for(var it=0;it<40;it++){ var moved=false;
    for(var i=0;i<Ls.length;i++) for(var j=i+1;j<Ls.length;j++){ var a=Ls[i], b=Ls[j], dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||0.01;
      if(d<POS_GAP){ var k=(POS_GAP-d)/2/d; a.x-=dx*k; a.y-=dy*k; b.x+=dx*k; b.y+=dy*k; moved=true } }
    if(!moved) break }
  POSC={}; Ls.forEach(function(o){ POSC[o.id]={x:o.x,y:o.y} }); POSN=PLANETS.length }

/* ---------- the viewport ----------
   The chart grows without end but the viewBox used to be a fixed 1000x700, so
   everything past sector 2 (ring radius 346, half-height 350) was drawn outside
   it and simply clipped — Nikita, 22.09: "on ring 4 you cannot see any of the
   following ones". The view now fits the whole chart by itself, and the wheel
   and a drag are there for when it is crowded. Marks are scaled by Z so text
   stays the same size on screen however far out the chart runs. */
var VIEW={x:0,y:0,w:1000,h:700}, VFIT=true, VSECS=-1, MAPDRAGGED=false;
function viewFit(){
  var R=secRadius(Math.max(0,visRings()-1))+58;
  var W0=visRings()<SECTORS.length?640:1000;   // v4.36: while the tutorial shows one ring, the chart comes closer (ui-v7)
  var w=Math.max(W0, R*1.32*2, R*0.90*2*(1000/700));
  for(var it=0;it<4;it++){            // the pad is screen-sized, so it scales with the fit: iterate
    var Z=w/1000;
    var w2=Math.max(W0, (R*1.32+128*Z)*2, (R*0.90+44*Z)*2*(1000/700));
    if(Math.abs(w2-w)<1){ w=w2; break } w=w2;
  }
  VIEW={x:CX-w/2, y:CY-w*0.35, w:w, h:w*0.7};
  VSECS=visRings();
}
function viewZoom(f,ax,ay){
  var w=Math.max(280,Math.min(9000,VIEW.w*f));
  f=w/VIEW.w;
  if(ax===undefined){ax=VIEW.x+VIEW.w/2; ay=VIEW.y+VIEW.h/2}
  VIEW={x:ax-(ax-VIEW.x)*f, y:ay-(ay-VIEW.y)*f, w:w, h:w*0.7};
  VFIT=false;
}
function viewPt(ev){
  var m=el('map'), r=m.getBoundingClientRect();
  // the viewBox is letterboxed by preserveAspectRatio=meet: find the real scale
  var sc=Math.min(r.width/VIEW.w, r.height/VIEW.h);
  var ox=(r.width-VIEW.w*sc)/2, oy=(r.height-VIEW.h*sc)/2;
  return {x:VIEW.x+(ev.clientX-r.left-ox)/sc, y:VIEW.y+(ev.clientY-r.top-oy)/sc, sc:sc};
}

/* ---------- the state of a world, as the map, the list and the advisor see it ---------- */
function isDead(pid){ var p=planet(pid); return !!G.colonies[pid]&&p.kind!=='works'&&G.reserves[pid]!==Infinity&&G.reserves[pid]<=0&&pileLeft(G,pid)<1 }
function isDry(pid){ var p=planet(pid); return !!G.colonies[pid]&&p.kind!=='works'&&G.reserves[pid]!==Infinity&&G.reserves[pid]<=0 }
function worksHungry(pid){ var p=planet(pid), c=G.colonies[pid]; if(!c||p.kind!=='works') return null;
  var fr=feedRates(G,pid), ym=(c.store.metal||0)/Math.max(0.01,fr.metal||0), yf=(c.store.food||0)/Math.max(0.01,fr.food||0);
  return {metal:ym, food:yf, low:Math.min(ym,yf), idle:(c.idleWorks||0)} }
function wst(pid){ var c=G.colonies[pid];
  if(G.ghost&&G.ghost[pid]) return 'ghost';
  if(!c) return enRoute(G,pid)?'settling':'free';
  if(isDead(pid)) return 'dead';
  var ll=lastLift(G,pid); if(ll&&ll.st==='cut') return 'cut';
  var wh=worksHungry(pid); if(wh&&wh.idle>5) return 'starve';
  if(!onLine(G,pid).length) return 'noline';
  if(isDry(pid)) return 'dry';
  var lr=lineRate(G,pid); if(lr&&lr.piling&&lr.sitting>FIT_PILE&&lineFit(G,pid).gap>0.01) return 'half';   // v4.38: a hull in the yards for the line counts
  return 'ok' }
var BAD_ST={dead:1,cut:1,starve:1};

/* ---------- the map ---------- */
function drawMap(){
  var s='', i, p, xy;
  if(VFIT&&VSECS!==visRings()) viewFit();
  var Z=VIEW.w/1000, F=function(n){ return (n*Z).toFixed(2) };
  el('map').setAttribute('viewBox',VIEW.x.toFixed(1)+' '+VIEW.y.toFixed(1)+' '+VIEW.w.toFixed(1)+' '+VIEW.h.toFixed(1));
  s+='<rect x="'+(VIEW.x-VIEW.w)+'" y="'+(VIEW.y-VIEW.h)+'" width="'+(VIEW.w*3)+'" height="'+(VIEW.h*3)+'" fill="none" pointer-events="all"/>';
  s+=starfield();
  // v4.25 (Nikita, 07.10): labels must not sit on each other — world names pick a free corner, ring names slide along the arc
  var LBL={}, boxes=[], hit=function(a,b){ return a.x0<b.x1&&b.x0<a.x1&&a.y0<b.y1&&b.y0<a.y1 }, nHit=function(b){ var n=0; boxes.forEach(function(o){ if(hit(b,o)) n++ }); return n };
  boxes.push({x0:CX-30*Z,x1:CX+30*Z,y0:CY-30*Z,y1:CY+30*Z});
  PLANETS.filter(function(q){ return secVis(q.sec) }).sort(function(a,b){ return (G.colonies[b.id]?1:0)-(G.colonies[a.id]?1:0) }).forEach(function(q){
    var c=pos(q), rr=8*Z, w=q.name.length*8*Z, best=null, bn=1e9;
    [[1,-10],[-1,-10],[1,16],[-1,16]].forEach(function(v){
      var lx=c.x+v[0]*(rr+4*Z), ly=c.y+v[1]*Z, bx=v[0]>0?lx:lx-w;
      var b={x0:bx-2*Z,x1:bx+w+2*Z,y0:ly-10*Z,y1:ly+3*Z,L:{x:lx,y:ly,a:v[0]<0?1:0}}, n=nHit(b);
      if(n<bn){ bn=n; best=b } });
    LBL[q.id]=best.L; boxes.push(best) });
  for(i=0;i<visRings();i++){
    var rxN=SECTORS[i].r*1.32, ryN=SECTORS[i].r*0.90;
    s+='<ellipse cx="'+CX+'" cy="'+CY+'" rx="'+rxN+'" ry="'+ryN+'" fill="none" stroke="rgba(242,241,236,.28)" stroke-width="'+F(1)+'" stroke-dasharray="'+F(1)+' '+F(5)+'"/>';
    s+='<path id="rn'+i+'" d="M'+(CX-rxN)+' '+CY+' A'+rxN+' '+ryN+' 0 0 1 '+(CX+rxN)+' '+CY+'" fill="none" stroke="none"/>';
    var tw=SECTORS[i].name.length*7*Z, tab=[0], tk, tl=0, ptx=function(u){ return {x:CX-rxN*Math.cos(u),y:CY-ryN*Math.sin(u)} };
    for(tk=1;tk<=120;tk++){ var pa=ptx(Math.PI*(tk-1)/120), pb=ptx(Math.PI*tk/120); tl+=Math.hypot(pb.x-pa.x,pb.y-pa.y); tab.push(tl) }
    var atLen=function(l){ var k=1; while(k<120&&tab[k]<l) k++; var u=Math.PI*((k-1)+(l-tab[k-1])/Math.max(1e-6,tab[k]-tab[k-1]))/120; return ptx(u) };
    var bestF=0.6, bestN=1e9, fc;
    for(fc=0;fc<=40;fc++){ var f=0.6+((fc%2)?1:-1)*Math.ceil(fc/2)*0.02; if(f<0.05||f+tw/tl>0.97) continue;
      var nn=0, kk; for(kk=0;kk<=5;kk++){ var q2=atLen(f*tl+tw*kk/5); nn+=nHit({x0:q2.x-tw/10-1*Z,x1:q2.x+tw/10+1*Z,y0:q2.y-14*Z,y1:q2.y+2*Z}) }
      if(nn<bestN){ bestN=nn; bestF=f; if(!nn) break } }
    for(tk=0;tk<=5;tk++){ var q3=atLen(bestF*tl+tw*tk/5); boxes.push({x0:q3.x-tw/10,x1:q3.x+tw/10,y0:q3.y-14*Z,y1:q3.y+2*Z}) }
    s+='<text fill="'+C.dim+'" font-size="'+F(9)+'" letter-spacing="'+F(1.6)+'" class="nm" dy="'+F(-4)+'" pointer-events="none"><textPath href="#rn'+i+'" startOffset="'+(bestF*100).toFixed(1)+'%">'+esc(SECTORS[i].name)+'</textPath></text>';
  }
  var rO=secRadius(visRings()-1)+44;
  // v4.21 (F-21): the six lobes, the sides of the world — a dotted edge each, a name at the rim
  if(can('sectors')) for(i=0;i<LOBES;i++){
    var e=lobeEdge(i), ca=Math.cos(e), sa=Math.sin(e);
    s+='<line x1="'+(CX+ca*34*Z)+'" y1="'+(CY+sa*34*Z)+'" x2="'+(CX+ca*rO*1.32)+'" y2="'+(CY+sa*rO*0.90)+'" stroke="'+C.dim+'" stroke-width="'+F(1.2)+'" stroke-dasharray="'+F(1.5)+' '+F(5)+'" pointer-events="none"/>';
    var me=lobeMid(i); ca=Math.cos(me); sa=Math.sin(me);
    var le=lobeEvents(G,i), lit=le.length?'rgb('+(EVCOL[le[0].type]||'255,42,26')+')':null;
    s+='<text x="'+(CX+ca*rO*1.32+ca*24*Z)+'" y="'+(CY+sa*rO*0.90+sa*24*Z+(sa>0.9?6*Z:0))+'" fill="'+(lit||C.mid)+'" font-size="'+F(12)+'" letter-spacing="'+F(2.4)+'" text-anchor="'+(ca>0.1?'start':(ca<-0.1?'end':'middle'))+'" class="nm" pointer-events="none">'+esc(T('lobe'+i).toUpperCase())+'</text>';
  }
  // v4.21 (F-21): an event lights its lobe — a dashed outline while it is announced, a translucent wedge while it runs; Earth blinks for a crisis
  if(can('events')) (G.dir&&G.dir.ev||[]).forEach(function(ev){
    var ec=EVCOL[ev.type]||'255,42,26';
    if(ev.lobe!==undefined){
      var a0=lobeEdge(ev.lobe), a1=a0+LOBE_ARC, pts=CX+','+CY, jj;
      for(jj=0;jj<=14;jj++){ var aa=a0+(a1-a0)*jj/14; pts+=' '+(CX+Math.cos(aa)*rO*1.32)+','+(CY+Math.sin(aa)*rO*0.90) }
      s+='<polygon points="'+pts+'" fill="'+(ev.state==='active'?'rgba('+ec+',.10)':'none')+'" stroke="rgba('+ec+',.7)" stroke-width="'+F(1.4)+'" stroke-dasharray="'+(ev.state==='warn'?F(6)+' '+F(5):F(3)+' '+F(4))+'"'+(ev.state==='warn'?' class="evwarn"':'')+' pointer-events="none"/>';
    } else s+='<circle class="evearth" cx="'+CX+'" cy="'+CY+'" r="'+(30*Z)+'" fill="none" stroke="'+C.red+'" stroke-width="'+F(2)+'" pointer-events="none"/>';
  });
  for(var k in G.colonies){ p=planet(k); xy=pos(p);
    s+='<line x1="'+CX+'" y1="'+CY+'" x2="'+xy.x+'" y2="'+xy.y+'" stroke="'+KCOL[p.kind]+'" stroke-opacity=".45" stroke-width="'+F(1.6)+'" pointer-events="none"/>' }
  // ships: the silhouette of the class, in its colour
  for(i=0;i<G.ships.length;i++){
    var sh=G.ships[i]; if(sh.mode!=='transit'&&sh.mode!=='missing') continue;
    var A=nodeXY(sh.origin), B=nodeXY(sh.dest||sh.target); if(!A||!B) continue;
    var f = sh.total? (1-sh.t/sh.total) : 0;
    if(sh.mode==='missing') f = sh.lastT!==undefined?sh.lastT:0.55; else sh.lastT=f;
    var x=A.x+(B.x-A.x)*f, y=A.y+(B.y-A.y)*f;
    if(sh.mode==='missing'){
      s+='<circle cx="'+x+'" cy="'+y+'" r="'+F(8)+'" fill="none" stroke="'+C.red+'" stroke-width="'+F(1)+'" stroke-dasharray="'+F(2)+' '+F(3)+'"/><text x="'+x+'" y="'+(y+3.5*Z)+'" fill="'+C.red+'" font-size="'+F(10)+'" text-anchor="middle" class="nm">?</text>';
    } else { var scls=shipClass(sh), sw=({courier:20,hauler:22,freighter:28})[scls]*Z, shz=sw*0.625, flip=(B.x<A.x)?-1:1;
      s+='<use href="#i-'+scls+'" x="'+(-sw/2)+'" y="'+(-shz)+'" width="'+sw+'" height="'+shz+'" fill="'+CLSCOL[scls]+'" pointer-events="none" transform="translate('+x+' '+y+') scale('+flip+' 1)"/>' }
  }
  // worlds
  for(i=0;i<PLANETS.length;i++){
    p=PLANETS[i]; if(!secVis(p.sec)) continue; xy=pos(p);
    var st=wst(p.id), on=!!G.colonies[p.id], LB=LBL[p.id];
    if(st==='ghost'){ s+='<g pointer-events="none"><text x="'+xy.x+'" y="'+(xy.y+4*Z)+'" fill="'+C.dim+'" font-size="'+F(13)+'" text-anchor="middle">×</text><text x="'+LB.x+'" y="'+LB.y+'" fill="'+C.dim+'" font-size="'+F(10)+'" letter-spacing="'+F(1)+'" class="nm"'+(LB.a?' text-anchor="end"':'')+'>'+esc(p.name.toUpperCase())+'</text></g>'; continue }
    s+='<g class="wd" data-p="'+p.id+'" transform="translate('+xy.x+' '+xy.y+')">';
    if(BAD_ST[st]) s+='<circle r="'+F(15)+'" fill="none" stroke="'+C.red+'" stroke-width="'+F(2)+'" class="alarm"/>';
    else if(st==='noline'||st==='half') s+='<circle r="'+F(15)+'" fill="none" stroke="'+C.people+'" stroke-width="'+F(1.6)+'" class="alarm"/>';
    if(U.win===p.id) s+='<circle r="'+F(19)+'" fill="none" stroke="'+C.ink+'" stroke-width="'+F(2)+'"/>';
    s+='<circle r="'+F(13)+'" fill="transparent"/>';
    s+='<g transform="scale('+Z.toFixed(3)+')" '+(on?'fill="'+KCOL[p.kind]+'"':'fill="'+C.bg+'" stroke="'+(st==='settling'?C.people:C.mid)+'" stroke-width="1.6" stroke-dasharray="3 2.5"')+'>'+({mine:'<circle r="7"/>',farm:'<rect x="-6.5" y="-6.5" width="13" height="13"/>',well:'<path d="M0-8L8 0L0 8L-8 0Z"/>',works:'<path d="M0-8L8 6.5H-8Z"/>'}[p.kind])+'</g>';
    s+='<text x="'+(LB.x-xy.x)+'" y="'+(LB.y-xy.y)+'" fill="'+(on?C.ink:C.mid)+'" font-size="'+F(10.5)+'" letter-spacing="'+F(1)+'" class="nm"'+(LB.a?' text-anchor="end"':'')+'>'+esc(p.name.toUpperCase())+'</text></g>';
  }
  // earth
  var nearNight=G.night&&nightLeft(G)<=K.NIGHT_NEAR;
  s+='<g class="wd" data-act="tab" data-v="earth" transform="translate('+CX+' '+CY+') scale('+Z.toFixed(3)+')">'+(nearNight?'<circle r="21" fill="none" stroke="'+C.red+'" stroke-width="2" class="alarm"/>':'')+'<circle r="15" fill="'+C.earth+'"/><path d="M-15 0H15M0-15C-7-8-7 8 0 15C7 8 7-8 0-15" stroke="#0B0B0C" stroke-width="1.4" fill="none"/></g>';
  el('map').innerHTML=s;
  if(el('tip').className) drawTip(document.querySelector('#map .wd[data-p]:hover'));   // the node under the pointer was just replaced
}
function drawTip(g){ var tip=el('tip'); if(!g||!G){ tip.className=''; return }
  var pid=g.dataset.p, p=planet(pid); if(!p){ tip.className=''; return }
  var c=G.colonies[pid], dep=p.kind==='works'?'parts':p.dep, h='';
  h+=wmark(p.kind,!!c)+'<b>'+esc(p.name.toUpperCase())+'</b><span>'+esc(kindWord(p.kind).toUpperCase())+'</span>';
  if(p.kind!=='works'&&isFinite(G.reserves[pid])) h+='<em>'+resIc(dep,12)+num(Math.max(0,G.reserves[pid]))+'</em>';
  if(c) h+='<em>'+resIc('people',12)+num(c.pop)+'</em><em>'+shipIc('hauler',18)+onLine(G,pid).length+'</em>';
  tip.innerHTML=h;
  var r=g.getBoundingClientRect(), mb=el('mapbox').getBoundingClientRect(), z=appZoom();
  tip.style.left=((r.right-mb.left)/z+8)+'px'; tip.style.top=((r.top-mb.top)/z-6)+'px'; tip.className='on' }
function drawEvBar(){
  var E=(can('events')&&G.dir&&G.dir.ev)||[], h='', live=false;
  E.forEach(function(ev){ var on=ev.state==='active'; if(on) live=true; var col='rgb('+(EVCOL[ev.type]||'255,42,26')+')';
    h+='<div class="evc'+(on?' on':'')+'" style="border-color:'+col+'">'+ic(ev.type==='fold'?'fold':(ev.type==='drag'?'stretch':'storm'),16,col)+'<b style="color:'+col+'">'+esc((evName(ev.type)+' · '+(ev.lobe!==undefined?T('lobe'+ev.lobe):T('earthNode'))).toUpperCase())+'</b><span>'+esc(fill(T(on?'evLeft':'evIn'),{n:Math.max(0,(on?ev.end:ev.start)-G.day)}))+'</span></div>' });
  setHTML('evbar',h); el('evbar').classList.toggle('blink',live) }
/* v4.35: what the yards are building, top right of the map — the three nearest, and how many more */
function building(){ return G.ships.filter(function(s){ return s.mode==='building' }).sort(function(a,b){ return a.t-b.t }) }
function hullProgress(s){ var h=HULLS[s.hull], tot=Math.max(1,h?h.days:1); return Math.max(0,Math.min(1,1-(s.t||0)/tot)) }
function forWorld(s){ return s.lineFor||(s.pend&&s.pend.from)||null }
function drawCards(){ var b=can('yard')?building():[], h='';
  b.slice(0,3).forEach(function(s){ var w=forWorld(s);
    h+='<button class="bcard" type="button" data-act="tab" data-v="yard">'+shipIc(shipClass(s),26)+'<b>'+esc(T(shipClass(s))+' '+roman(hullGen(s)))+'</b><span>→ '+esc(w?pname(w):T('u_freeHull'))+'</span><i>'+s.t+' '+yrs(s.t)+'</i><u style="width:'+Math.round(hullProgress(s)*100)+'%"></u></button>' });
  if(b.length>3) h+='<div class="more">'+esc(fill(T('u_moreYard'),{n:b.length-3}))+'</div>';
  setHTML('cards',h);
  setHTML('zoom',can('zoom')?'<button type="button" data-act="zoom" data-v="out">−</button><button type="button" data-act="zoom" data-v="in">+</button><button type="button" data-act="zoom" data-v="fit">'+esc(T('u_fit'))+'</button>':'') }

/* ---------- top: the year, the Night, the advisor, the clock ---------- */
function winPause(){ return U.win==='earth'||U.win==='yard'||U.win==='ark' }
function bigKind(){ if(!U.langPicked) return U.menu?null:'lang'; if(G.over) return 'over'; if(G.night&&!G.nightSeen) return 'night'; if(G.shiftOpen) return 'shift'; if(U.notes.length) return 'note'; return null }
function modal(){ return !!U.menu||!!bigKind()||!!(U.pf&&!U.pf.low)||!el('logbox').hidden }
function halted(){ return U.paused||winPause()||modal()||tutHold() }
var SPEEDS=[1,2,4,10];
function drawTop(){
  var h='<div class="logo"><svg class="mk" viewBox="0 0 120 120" aria-hidden="true"><use href="#i-mark"/></svg>LAST BERTH</div><div class="yr"><small>'+esc(T('u_year'))+'</small><b>'+G.day+'</b></div>';
  if(can('night')&&G.night) h+='<div class="yr night"><small>'+ic('night',11,C.red)+esc(T('u_night'))+'</small><b>'+G.night+'</b><span>'+esc(fill(T('u_yearsN'),{n:nightLeft(G)}))+'</span></div>';
  if(can('advisor')){ var n=advRows().filter(function(r){ return r[0]!==C.mid }).length; h+='<button class="adv'+(U.pop==='adv'?' on':'')+(n?'':' calm')+'" type="button" data-act="pop" data-v="adv">'+ic('warn',15)+'<span>'+esc(T('u_needs'))+'</span><b>'+n+'</b></button>' }
  var hz=halted();
  h+='<div class="spd">'+(hz?'<span class="pz">'+esc(T('u_paused'))+'</span>':'');
  if(can('speed')){ h+='<button type="button" data-act="spd" data-v="0" class="'+(hz?'on pzb':'')+'" title="Space">❚❚</button>';
    SPEEDS.forEach(function(v,i){ h+='<button type="button" data-act="spd" data-v="'+v+'" class="'+(!hz&&U.speed===v?'on':'')+'" title="'+(i+1)+'">'+v+'×</button>' }) }
  if(can('skip')) h+='<button type="button" data-act="skip">'+esc(T('u_skip'))+'</button>';
  h+='<button type="button" data-act="pop" data-v="menu" class="'+(U.pop==='menu'?'on':'')+'" aria-label="menu">≡</button></div>';
  setHTML('top',h);
}
/* v3.7 (Nikita, 23.09): a resource that is being spent faster than it comes in must say so. The trend is the real change of the
   stockpile over the last TREND_YEARS, deliveries included. */
var TREND_YEARS=60;
function trendTick(){ var E=G.earth, h=U.hist;
  if(h.length&&h[h.length-1].day===G.day) return;
  if(h.length&&h[h.length-1].day>G.day) U.hist=h=[];
  h.push({day:G.day,metal:E.metal,food:E.food,fuel:E.fuel,parts:E.parts,people:E.people});
  if(h.length>TREND_YEARS+5) h.splice(0,h.length-(TREND_YEARS+5)) }
function trend(k){ var h=U.hist; if(h.length<6) return null; var a=h[Math.max(0,h.length-1-TREND_YEARS)], b=h[h.length-1]; var y=b.day-a.day; if(y<5) return null; return (b[k]-a[k])/y }
function drawRes(){ var E=G.earth, nd=G.need||earthNeed(G), h='';
  trendTick();
  RES.forEach(function(k){
    if(!can(k)){ h+='<div class="rc off"></div>'; return }
    var t=trend(k), tt='';
    if(t!==null){ var up=t>=0.05, dn=t<=-0.05; tt='<span class="'+(up?'up':(dn?'dn':'fl'))+'">'+(up?'▲ +':(dn?'▼ −':'— '))+Math.abs(t).toFixed(1)+esc(T('u_perYr'))+'</span>' }
    var bad=(k==='food'&&(G.hungry||E.food/Math.max(0.1,nd.food)<25))||(k==='metal'&&(G.cold||E.metal/Math.max(0.1,nd.metal)<25))||(k==='fuel'&&E.fuel<30);
    var fc=k==='food'?(G.foodFc||(G.day<200?foodForecast(G):null)):null, ends=fc?'<em>'+esc(fill(T('u_ends'),{y:fc.y}))+'</em>':'';   // v4.36: the core forecasts from year 200; the strip shows the end from year 0
    h+='<div class="rc'+(bad?' bad':'')+'" data-r="'+k+'"><small>'+resIc(k,13)+esc(T(k).toUpperCase())+ends+'</small><b style="color:'+C[k]+'">'+num(E[k])+'</b>'+tt+'</div>' });
  setHTML('res',h) }

/* ---------- tabs and their flags ---------- */
/* BRIEF (Nikita 14.10): the flags speak of Earth, the yard, the fleet and the ark; the advisor is for worlds only.
   v4.35: Tech gets a flag too when a ring can be charted or the drive programme can start (Claude — awaiting review). */
var TABS=[['earth','tEarth','u_tabEarth',C.earth],['worlds','tWorlds','u_tabWorlds',C.metal],['tech','tTech','u_tabTech',C.ink],['yard','tYard','u_tabYard',C.ink],['fleet','tFleet','u_tabFleet',C.ink],['ark','ark','u_tabArk',C.ark]];
function freeAtPier(){ return G.ships.filter(function(s){ return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.pend }) }
function flags(){ var F={}, E=G.earth, nd=G.need||earthNeed(G);
  // Earth: hunger, then the larder, then metal and fuel
  if(G.hungry) F.earth=[T('u_flHungry'),C.red];
  else if(G.night&&G.foodFc&&G.foodFc.y<G.night) F.earth=[fill(T('u_flFoodNight'),{y:G.foodFc.y}),C.red];
  else if(foodShort(G)) F.earth=[fill(T('u_flFood'),{y:G.foodFc.y}),C.red];
  else if(G.cold||E.metal/Math.max(0.1,nd.metal)<25) F.earth=[T('u_flMetal'),C.red];
  else if(E.fuel<60) F.earth=[T('u_flFuel'),C.people];
  var b=building().length; if(b) F.yard=[fill(T('u_flYard'),{n:b}),C.ink];
  var fr=freeAtPier(), idle=fr.filter(function(s){ return !s.reserve&&!s.mutiny }).length, mut=fr.filter(function(s){ return s.mutiny }).length, cw=G.ships.filter(function(s){ return s.crewWait&&s.mode==='idle' }).length;
  if(cw) F.fleet=[fill(T('u_flCrew'),{n:cw}),C.red];
  else if(idle) F.fleet=[fill(T('u_flIdle'),{n:idle}),C.people];
  else if(mut) F.fleet=[fill(T('u_flMutiny'),{n:mut}),C.red];
  if(G.night){ var cv=arkConvoy(G), sh=0; for(var c in cv.need) sh+=Math.max(0,cv.need[c]-(cv.have[c]||0));
    if(arkLevel(G)<1) F.ark=[T('u_flArkNone'),C.ark];
    else if(!arkReady(G)) F.ark=[T('u_flArkDrive'),C.ark];
    else F.ark=sh?[fill(T('u_flConvoy'),{n:sh}),C.ark]:[T('u_flConvoyOk'),C.food] }
  if(canSurvey(G)==='ok') F.tech=[fill(T('u_flSurvey'),{n:SECTORS.length+1}),C.food];
  else if(!G.drive&&startDriveWhy(driveHost())==='ok') F.tech=[T('u_flDrive'),C.food];
  return F }
function drawTabs(){ var F=flags(), h='';
  TABS.forEach(function(t){ var k=t[0];
    if(!can(k)){ h+='<div class="tab tlk"></div>'; return }
    var on=U.win===k||U.tab===k, f=F[k];
    h+='<button class="tab'+(on?' on':'')+'" type="button" data-act="tab" data-v="'+k+'">'+ic(t[1],30,on?((k==='earth'||k==='ark')?t[3]:'#000'):t[3])+'<span>'+esc(T(t[2]).toUpperCase())+'</span>'+(U.tut.fresh[k]&&!on?'<i class="new"></i>':'')+
      (f&&!U.win&&!U.tab&&!U.pop?'<em class="flag" style="color:'+f[1]+';border-color:'+f[1]+'">'+esc(f[0])+'</em>':'')+'</button>' });
  setHTML('tabs',h) }

/* ---------- window pieces ---------- */
function head(title,sub,icon){ return '<div class="wh">'+(icon||'')+'<b>'+title+'</b><small>'+(sub||'')+'</small></div>' }
function sec(l,r,id){ return '<div class="sec"'+(id?' id="'+id+'"':'')+'><span>'+l+'</span>'+(r!==undefined&&r!==''?'<span>'+r+'</span>':'')+'</div>' }
function row(l,v,col,id){ return '<div class="rw"'+(id?' id="'+id+'"':'')+'><span>'+l+'</span><b'+(col?' style="color:'+col+'"':'')+'>'+v+'</b></div>' }
function hint(t,cls){ return '<div class="hint'+(cls?' '+cls:'')+'">'+t+'</div>' }
function alertBox(icon,t,warn){ return '<div class="alert'+(warn?' warn':'')+'">'+ic(icon,16,warn?C.people:C.red)+'<span>'+t+'</span></div>' }

/* ---------- Earth: only home and its burn (BRIEF) ---------- */
function winEarth(){ var E=G.earth, nd=G.need||earthNeed(G), t=trend('people'), h='';
  h+=sec(esc(T('u_home')))+'<div class="hero" style="color:'+C.people+'">'+num(E.people)+'<span>'+esc(T('u_peopleW'))+(t!==null?' · '+(t>=0?'+':'−')+Math.abs(t).toFixed(1)+esc(T('u_perYr')):'')+'</span></div>';
  h+=row(resIc('food',13)+esc(T('u_foodUntil')),G.foodFc?'≈ '+G.foodFc.y:esc(T(G.night?'u_foodPastNight':'u_foodLong')),G.foodFc?C.red:null);
  if(can('night')&&G.night) h+=row(ic('night',13,C.red)+esc(T('u_night')),G.night+' · '+esc(fill(T('u_yearsN'),{n:nightLeft(G)})),C.red);
  h+=row(esc(T('u_liveWorlds')),reach(G))+row(esc(T('u_crossings')),'×'+driveSpeed(G).toFixed(2));
  var pop=0, tr=0; for(var ck in G.colonies) pop+=G.colonies[ck].pop; for(var i=0;i<G.ships.length;i++) tr+=(G.ships[i].cargo.people||0);
  h+=row(esc(T('u_onHulls')),num(crewOut(G)+tr))+row(esc(T('u_onWorlds')),num(pop));
  if(G.hungry) h+=alertBox('starving',esc(T('u_alHungry')));
  else if(G.night&&G.foodFc&&G.foodFc.y<G.night) h+=alertBox('starving',esc(fill(T('u_alFoodNight'),{n:G.night-G.foodFc.y})));
  else if(foodShort(G)) h+=alertBox('starving',esc(fill(T('u_alFood'),{y:G.foodFc.y})));
  if(G.cold) h+=alertBox('warn',esc(T('u_alCold')));
  h+=sec(esc(T('u_burns')));
  RES.forEach(function(k){ if(k==='people'||!can(k)) return; var v=(k==='food'?nd.food:(k==='metal'?nd.metal:(nd[k]||0)));
    if(k!=='food'&&k!=='metal'&&!v) return;
    var y=E[k]/Math.max(0.01,v);
    h+=row(resIc(k,13)+esc(T(k)),dec(v)+esc(T('u_perYr'))+' · '+(v>0?esc(fill(T('u_yearsN'),{n:Math.floor(y)})):'—'),C[k]) });
  var ap=activeCrisis(G); if(ap) h+=alertBox('warn',esc(fill(T('u_alCrisis'),{r:T(ap.res),n:Math.max(0,ap.end-G.day)})),true);
  return '<div class="win sm">'+head(esc(T('u_tabEarth').toUpperCase()),esc(T('u_timePaused')),ic('tEarth',18,C.earth))+'<div class="bd">'+h+'</div></div>' }

/* ---------- big windows: language, the end, the Night, the shift, notes — one at a time, time stands ---------- */
var NOTE_CODES={drive_mark:'noteDrive',mutiny_warn:'noteArk',food_horizon:'noteEarth',night_near:'noteArk'};
function evName(t){ return T('ev'+t.charAt(0).toUpperCase()+t.slice(1)) }
function note(o){ U.notes.push(o) }
function chronLines(k){ var out='', n=0;
  for(var i=G.log.length-1;i>=0&&n<k;i--){ var e=G.log[i]; if(TONE[e.code]!=='ch') continue; var t=logText(e); if(!t) continue;
    out='<div><b>'+String(e.day).padStart(4,'0')+'</b>'+esc(t)+'</div>'+out; n++ }
  return out?'<div class="chron">'+out+'</div>':'' }
function rw2(k,v,cls){ return '<div class="rw"><span>'+k+'</span><b class="'+(cls||'')+'">'+v+'</b></div>' }
function bigHtml(kind){
  if(kind==='lang') return '<div class="nwin" id="lang"><svg class="lmark2" viewBox="0 0 120 120" aria-hidden="true"><use href="#i-markf"/></svg><div class="icap">LAST BERTH<span>'+(U.saveDay!==null&&U.saveDay!==undefined?'':'')+'</span></div><p>Choose a language.<br>Выберите язык.</p><div class="langrow"><button class="b pri" type="button" data-lang="en">English</button><button class="b pri" type="button" data-lang="ru">Русский</button></div>'+
    (U.saveDay!==null&&U.saveDay!==undefined?'<button class="b full" type="button" data-act="loadauto">'+esc(fill(L[U.saveLang||'en'].u_continue||'',{y:U.saveDay}))+'</button>':'')+'</div>';
  /* v4.36: the end, the Night and the shift speak in the Institute's voice, Alexandra's line under it (NAR N-13, N-09, N-04) */
  if(kind==='over'){ var btns='<div class="nbtn">'+btn(esc(T('exportLog')),'export')+btn(esc(T('newGame')),'new',null,'pri')+'</div>';
    if(G.over==='night'){ var sl=G.souls||0, lb=G.left||leftBehind(G), tier=sl<=0?0:(sl<300?1:(sl<1200?2:3)), behind=lb.home+lb.hulls+lb.colonies+lb.transit;
      var sailed=!G.grounded&&(G.boarded||0)>0, why='';
      if(!sailed){ if(G.grounded&&G.groundedWhy==='convoy'){ var cv=arkConvoy(G), sh=[]; CLASSES.forEach(function(c){ var d=cv.need[c]-(cv.have[c]||0); if(d>0) sh.push(d+' × '+T(c)) }); why=fill(T('nar_rsConvoy'),{s:sh.join(', '),g:roman(convoyGen(G))}) }
        else if(G.grounded) why=fill(T('nar_rsDrive'),{g:roman(G.arkMark)}); else why=T('nar_rsLevel') }
      return '<div class="nwin '+(sailed&&tier?'good':'bad')+'">'+icap(T('u_year')+' '+G.day+' · '+T('u_theNight'))+
        (sailed?'<div class="nbig" style="color:'+C.ark+'"><small>'+esc(T('nar_aboard'))+'</small><b>'+num(G.boarded)+'</b></div><p>'+esc(fill(T('nar_N13a'),{n:num(G.boarded)}))+'</p>'
               :'<p>'+esc(fill(T('nar_N13b'),{reason:why}))+'</p>')+'<div class="rws">'+
        rw2(esc(T('statSouls')),G.boarded||0,(G.boarded||0)?'good':'bad')+
        rw2(esc(T('statWoke')),G.grounded?esc(T(G.groundedWhy==='convoy'?'arkNoConvoy':'arkNoDrive')):sl+' · '+Math.round((G.wake||0)*100)+'%',tier?'good':'bad')+
        rw2(esc(T('statBerths')),arkLevel(G)+' / '+K.ARK_LEVELS.length)+(G.cargo?rw2(esc(T('statCargo')),price(G.cargo,null)):'')+
        rw2(esc(T('statLeft')),num(behind)+' · '+lb.hulls+' '+esc(T('lbHulls'))+' · '+lb.colonies+' '+esc(T('lbCol')),'warn')+
        rw2(esc(T('statDay')),G.day)+rw2(esc(T('statSec')),SECTORS.length)+rw2(esc(T('statPeak')),G.stats.peak)+rw2(esc(T('statDrive')),G.driveLvl||0)+(G.stats.mutinies?rw2(esc(T('statMutiny')),G.stats.mutinies,'warn'):'')+'</div>'+
        chronLines(3)+alx(T(sailed?'nar_N13a_a':'nar_N13b_a'))+btns+'</div>' }
    return '<div class="nwin bad">'+icap(T('u_year')+' '+G.day)+'<div class="nbig" style="color:'+C.red+'"><small>'+esc(T('food'))+'</small><b>0</b></div><p>'+esc(T(G.night?'nar_N13c':'nar_N13d'))+'</p><div class="rws">'+
      rw2(esc(T('statDay')),G.day)+rw2(esc(T('statSec')),SECTORS.length)+rw2(esc(T('statCol')),G.stats.founded)+rw2(esc(T('statPeak')),G.stats.peak)+rw2(esc(T('statDrive')),G.driveLvl||0)+rw2(esc(T('statLost')),G.stats.lost)+'</div>'+
      chronLines(3)+alx(T(G.night?'nar_N13c_a':'nar_N13d_a'))+btns+'</div>' }
  if(kind==='night') return '<div class="nwin bad">'+icap(T('u_year')+' '+G.day)+'<div class="nbig" style="color:'+C.red+'"><small>'+esc(T('u_night'))+'</small><b>'+G.night+'</b></div>'+
    ['nar_N09_1','nar_N09_2','nar_N09_3'].map(function(k){ return '<p>'+esc(fill(T(k),{year:G.night}))+'</p>' }).join('')+
    '<div class="rws">'+rw2(ic('drive',13,C.ark)+esc(T('u_arkDrive')),esc(fill(T('u_genPlus'),{g:roman(G.arkMark)})),'warn')+'</div>'+'<div class="nbtn">'+btn(esc(T('u_continueBtn')),'nightok',null,'pri')+'</div></div>';
  if(kind==='shift'){ var R=G.shiftReport||{}, sd=R.d||{}, rows='';
    var got=[]; ['metal','food','fuel','parts'].forEach(function(kk){ if(sd[kk]>0&&can(kk)) got.push('<span class="pr">'+resIc(kk,13)+num(sd[kk])+'</span>') });
    rows+=rw2(esc(T('shDelivered')),got.length?got.join(' '):esc(T('nothing')),got.length?'good':'bad');
    if(sd.people>0) rows+=rw2(esc(T('shPeople')),num(sd.people),'dim');
    rows+=rw2(esc(T('shWorlds')),R.cols+(R.founded?' '+esc(fill(T('shFounded'),{n:R.founded})):''),R.cols>R.colsWas?'good':(R.cols<R.colsWas?'warn':'dim'));
    if(R.sectors>0) rows+=rw2(esc(T('shSectors')),esc(fill(T('shSectorsN'),{n:R.sectors})),'good');
    if(R.drive>0) rows+=rw2(esc(T('shDrive')),esc(fill(T('shDriveN'),{n:R.drive})),'good');
    if(R.kits>0) rows+=rw2(esc(T('shKits')),R.kits,'good');
    if(R.built>0) rows+=rw2(esc(T('shBuilt')),R.built,'dim');
    if(R.attrition>0) rows+=rw2(esc(T('shAttrition')),R.attrition,'bad');
    rows+=rw2(esc(T('shHandsRate')),esc(fill(T('shHandsRateN'),{n:(R.handsRate||0).toFixed(2)})),(R.handsRate||0)<1?'warn':'dim');
    if(R.lost>0) rows+=rw2(esc(T('shLost')),R.lost,'bad');
    if(R.mutinies>0) rows+=rw2(esc(T('shMutiny')),R.mutinies,'bad');
    rows+=rw2(esc(T('shHands')),num(R.hands)+(R.idle?' '+esc(fill(T('shIdle'),{n:R.idle})):''),R.hungry?'bad':'dim');
    if(R.left!==null&&R.left!==undefined) rows+=rw2(esc(T('shLeft')),esc(fill(T('shLeftN'),{n:R.left,b:R.berths})),R.left<=K.NIGHT_NEAR?'bad':'warn');
    var k1=Math.max(1,(R.no||2)-1);   // the report at year 80 is the hand-over of shift 1
    return '<div class="nwin" id="shiftwin">'+icap(T('u_shiftCap')+' · '+T('u_year')+' '+G.day)+'<p>'+esc(k1===1?T('nar_N04a'):fill(T('nar_N04b'),{k:k1}))+'</p><div class="rws">'+rows+'</div>'+alx(T(k1===1?'nar_N04a_a':'nar_N04b_a'))+
      '<div class="nbtn"><label><input type="checkbox" id="shstop" checked> '+esc(T('shiftStop'))+'</label>'+btn(esc(T('shiftGo')),'shiftok',null,'pri')+'</div></div>' }
  if(kind==='note'){ var n=U.notes[0];
    if(!n.shown){ n.shown=true; SFX.play(n.snd||'info') }
    return '<div class="nwin '+(n.cls||'')+'"><div class="icap">'+esc(n.k)+'<span>'+G.day+'</span></div><h2>'+esc(n.title)+'</h2><p>'+esc(n.body)+'</p><div class="nbtn">'+
      (n.go?btn(esc(n.goL||T('u_open')),'notego',{v:n.go},'pri'):'')+btn(esc(T(n.go?'noFreeLater':'noteOk')),'noteok',null,n.go?'':'pri')+'</div></div>' }
  return '' }
function drawBig(){ var k=bigKind(), L0=el('noteL'), key=k==='shift'?'shift'+G.day:null;
  if(key&&L0.dataset.k===key){ L0.className='on'; return }   // the shift window is built once: its checkbox keeps its state
  var h=k?bigHtml(k):''; L0.dataset.k=key||''; setHTML('noteL',h); L0.className=h?'on':'' }

/* ---------- personal files: a face for a crew, at the foot of the map, or the whole screen for the moments that matter ---------- */
function drawPF(){
  var L0=el('pfL'), f=U.pf;
  if(!f||(!f.low&&bigKind())||(f.low&&U.win)){ if(L0._f){ L0._f=null; L0.innerHTML='' } L0.className=''; return }
  if(L0._f===f&&L0._lang===U.lang&&L0._tab===!!U.tab) return;   // v4.30: the card is built once, or a press on it would be lost to the redraw
  L0._f=f; L0._lang=U.lang; L0._tab=!!U.tab; L0.className=f.low?'low'+(U.tab?' side':''):'full';
  if(f.low&&!f.timer) f.timer=setTimeout(function(){ if(U.pf===f){ U.pf=null; drawPF() } },20000);
  var v=VOICE[U.lang]||{}, d={}; for(var q in f.d) d[q]=f.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p);
  L0.innerHTML='<div class="pfbox"><canvas width="64" height="64"></canvas><div><div class="pfk"><span>'+esc(T('pfTitle'))+'</span><span>'+String(f.day!==undefined?f.day:G.day).padStart(4,'0')+'</span></div>'+
    '<div class="pfn">'+esc(f.name)+'</div><div class="pfm">'+esc(v[f.role]||f.role)+' · '+esc(fill(T('pfNo'),{n:f.no}))+(f.sub?' · '+esc(f.sub):'')+'</div>'+
    '<div class="pfl">'+esc(fill(v[f.k]||f.k,d))+'</div>'+btn(esc(T('pfOk')),'pfok',null,f.low?'':'pri')+'</div></div>';
  drawPortrait(L0.querySelector('canvas'),f.seed) }

/* the Night stop, the no-free-worlds stop and the ring note — v4.30/v4.16, now as notes that open the Tech tab */
function freeWorlds(){ var out=[]; for(var i=0;i<PLANETS.length;i++){ var p=PLANETS[i]; if(!sectorOpen(G,p.sec)) continue; if(G.colonies[p.id]||(G.ghost&&G.ghost[p.id])) continue; out.push(p) } return out }
function watchRings(){
  if(U.gk!==G){ U.gk=G; U.noFreeAt=null; U.ringNoted=undefined; U.notes=[] }
  if(G.over||!U.langPicked||!can('tech')) return;
  if(!freeWorlds().length&&U.noFreeAt!==SECTORS.length&&!(G.night&&!G.nightSeen)){ U.noFreeAt=SECTORS.length; note({k:T('noteRing'),title:T('noFreeTitle'),body:T('u_noFreeBody'),cls:'bad',snd:'crit',go:'tech',goL:T('u_toTech')}) }
  if(U.ringNoted===undefined) U.ringNoted=SECTORS.length-1+(canSurvey(G)==='ok'?1:0);
  if(canSurvey(G)==='ok'&&U.ringNoted<SECTORS.length&&!U.ff){ U.ringNoted=SECTORS.length; note({k:T('noteRing'),title:fill(T('ringSignTitle'),{s:secName(SECTORS.length)}),body:T('u_ringBody'),cls:'good',snd:'evgood',go:'tech',goL:T('u_toTech')}) }
}
/* ---------- the tutorial and the story (v4.36; design/ui-v7.html, BRIEF «Обучение» and «Нарратив в макете») ----------
   A step opens by the state of the run, never by a timer, and a later step that is ready pulls the earlier ones with it —
   nobody gets stuck. While Alexandra speaks a rule, time stops, the screen dims and only the lit thing is bright: 'do' — only
   the lit thing can be pressed (a miss shakes the ring); 'see' — GOT IT or any press. A 'do' whose button is refused or gone
   turns into a 'see'. A resource shows up the moment it is first needed, and the tutorial opens it in the core then (openRes):
   no price and no burn uses a resource the player cannot see yet. The story (NAR) goes through the same queue — never at
   once with a rule, the story first. V — her voice (no dim, time runs, 8 s or a press; Claude: time
   stands while a rule waits right behind it); W — a big window (the shift, the Night, the end — bigHtml).
   U.tut: lock — what is not open is hidden; help — the rules speak; the story speaks either way. v4.41 (Nikita 24.10): every new
   game starts with the helper; turned off in the game, it is off for that run only (nothing is kept in the browser). An old save
   without U.tut has everything open and no helper. */
/* TUTX: off/story — this run goes without the helper and the voices (Test play, the scenarios' hook); hook — the scenarios' hook
   (LNtut.off): it holds for every next run of the page, Test play only for its own */
var TUTX={story:true,off:false,hook:false};
function helpPref(){ return !TUTX.off }
var OPEN_ALL=['people','food','line','speed','fuel','earth','skip','metal','order','yard','fleet','parts','machines','tech','advisor','worlds','sectors','events','ring2','zoom','ring3','night','ark','reserve','lift','evac'];
var TAB_KEYS={earth:1,worlds:1,tech:1,yard:1,fleet:1,ark:1};
function tutBlank(){ return {lock:false,help:false,open:{},fresh:{},seen:{},step:-1,seq:0,q:[],msg:null,nar:null} }
function secVis(sec){ return sectorOpen(G,sec)&&(!U.tut.lock||can('ring2')||sec<1) }
function visRings(){ return U.tut.lock&&!can('ring2')?Math.min(1,SECTORS.length):SECTORS.length }
function ringFree(sec,kind){ return PLANETS.filter(function(p){ return p.sec===sec&&(!kind||p.kind===kind)&&!G.colonies[p.id]&&!(G.ghost&&G.ghost[p.id])&&!enRoute(G,p.id) }).sort(function(a,b){ return a.dist-b.dist }) }
function firstCol(){ var t=U.tut; if(t.col&&G.colonies[t.col]) return t.col; return Object.keys(G.colonies)[0]||null }
function builtHulls(){ return G.ships.filter(function(s){ return s.mode!=='dead'&&s.mode!=='building' }).length }
function halfWorld(){ return Object.keys(G.colonies).filter(function(k){ return wst(k)==='half' })[0]||null }
function lineless(){ var ks=Object.keys(G.colonies); if(!ks.length) return null;
  return ks.slice().sort(function(a,b){ return onLine(G,a).length-onLine(G,b).length||(G.colonies[b].day||0)-(G.colonies[a].day||0) })[0] }
function mineFor(){ var k=Object.keys(G.colonies).filter(function(x){ return planet(x).kind==='mine' })[0]; if(k) return k; var f=ringFree(0,'mine')[0]; return f?f.id:null }
function fcYear(){ var f=G.foodFc||foodForecast(G); return f?f.y:'—' }
function freeHullAtPier(){ return freeAtPier().some(function(s){ return !s.mutiny&&!s.crewWait&&!s.job }) }
/* a hull that is on no line: free at the pier, or flying home after it set settlers down */
function offLine(){ return G.ships.some(function(s){ return s.mode!=='dead'&&s.mode!=='missing'&&s.mode!=='building'&&!(s.from&&s.to)&&!s.pend&&!s.lineFor&&!s.mutiny&&!s.crewWait }) }
function closeAll(){ U.win=null; U.tab=null; U.pop=null; return {} }
/* the rules: where she points, how, and what the press must be */
var TMSG={
 m0:{at:'#res [data-r="food"]',mode:'see',k:'tut_m0',pre:function(){ closeAll(); return {y:fcYear()} }},
 m1:{at:function(){ return '#map .wd[data-p="'+U.tut.farm+'"]' },mode:'do',k:'tut_m1',hit:function(){ var f=U.tut.farm; openWorld(f); tutAct('world',f); draw() },
   pre:function(){ closeAll(); var f=ringFree(0,'farm')[0]; U.tut.farm=f?f.id:null; return f?{p:pname(f.id)}:null }, done:function(a,v){ return a==='world'&&v===U.tut.farm }},
 m2:{at:'#ovl [data-act="send"]',also:'#ovl .prow',mode:'do',k:'tut_m2',opens:['fuel'],
   pre:function(){ var f=U.tut.farm; if(!f||G.colonies[f]||enRoute(G,f)) return null; if(U.win!==f) openWorld(f); return {} }, done:function(a,v,res){ return a==='send'&&res==='ok' }},
 m3:{at:'#top .spd',mode:'do',k:'tut_m3',
   pre:function(){ var s=G.ships.filter(function(x){ return x.job==='colonize'&&x.mode==='transit' })[0]; if(!s) return null; return {p:pname(s.dest)} }, done:function(a,v){ return a==='spd'&&v!=='0' }},
 m4:{at:'#ovl [data-act="assign"]',mode:'do',k:'tut_m4',
   pre:function(){ var pid=firstCol(); if(!pid) return null; openWorld(pid); return {p:pname(pid)} }, done:function(a,v,res){ return (a==='assign'||a==='pickgo')&&res==='ok' }},
 m8:{at:'#ordblk',mode:'do',k:'tut_m8',pre:function(){ var pid=lineless(); if(!pid||freeHullAtPier()) return null; openWorld(pid); return {} }, done:function(a,v,res){ return a==='order'&&res==='ok' }},
 mM:{at:'#res [data-r="metal"]',mode:'see',k:'tut_mM',pre:function(){ closeAll(); var m=mineFor(); return {p:m?pname(m):'—'} }},
 m9:{at:'#cards',mode:'see',k:'tut_m9',pre:function(){ closeAll(); return building().length?{}:null }},
 m10:{at:'#tabs [data-v="fleet"]',mode:'see',k:'tut_m10',pre:closeAll},
 m11:{at:'#rw-carries',mode:'see',k:'tut_m11',pre:function(){ var pid=halfWorld(); if(!pid) return null; openWorld(pid); var lr=lineRate(G,pid); return {p:pname(pid),m:dec(lr.makes),c:dec(lr.carries)} }},
 m12:{at:'#res [data-r="parts"]',mode:'see',k:'tut_m12',pre:function(){ if(!partsHome()) return null; return closeAll() }},
 m14:{at:'#tabs [data-v="tech"]',mode:'see',k:'tut_m14',pre:closeAll},
 m15:{at:'#top .adv',mode:'see',k:'tut_m15',pre:closeAll},
 m17:{at:'#evbar',mode:'see',k:'tut_m17',pre:closeAll},
 m16:{at:function(){ return '#map .wd[data-p="'+U.tut.r2+'"]' },mode:'see',k:'tut_m16',
   pre:function(){ closeAll(); var w=PLANETS.filter(function(p){ return p.sec===1&&!(G.ghost&&G.ghost[p.id]) }).sort(function(a,b){ return a.dist-b.dist })[0]; U.tut.r2=w?w.id:null; VFIT=true; VSECS=-1; return {} }},
 m18:{at:'#top .night',mode:'see',k:'tut_m18',pre:closeAll},
 m19:{at:'#tabs [data-v="ark"]',mode:'see',k:'tut_m19',pre:function(){ closeAll(); return {g:roman(convoyGen(G))} }},
 /* by occasion: once each, when the thing first happens */
 m7:{at:'#ovl .wh small',mode:'see',k:'tut_m7'},
 m13:{at:'#mach',mode:'see',k:'tut_m13'},
 m20:{at:'#convoy',mode:'see',k:'tut_m20'},
 m21:{at:'#rw-lift',mode:'see',k:'tut_m21'},
 m22:{at:'#ovl [data-act="evac"]',mode:'see',k:'tut_m22',pre:function(){ var d=U.tut.dead; if(d&&G.colonies[d]) openWorld(d); return {} }},
 m24:{at:function(){ return '#hr-'+U.tut.late },mode:'see',k:'tut_m24',pre:function(){ hullWorld(U.tut.late); return {} }},
 m23:{at:function(){ return '#hr-'+U.tut.mut },mode:'see',k:'tut_m23',pre:function(){ hullWorld(U.tut.mut); return {} }}
};
function hullWorld(sid){ var s=shipById(G,sid); if(!s) return; var w=s.from||(s.pend&&s.pend.from)||forWorld(s)||(s.dest&&s.dest!=='earth'?s.dest:s.origin); if(w&&G.colonies[w]) openWorld(w); else closeAll() }
/* the story: Claude's clean copy 15.10 (awaits Nikita), texts in the sheet; V — her voice (the launch, N-01, gave way to the terminal in v4.40) */
var NAR={
 N02:{f:'V',k:['nar_N02'],pre:function(){ var pid=firstCol(); return pid?{world:pname(pid),n:num(G.colonies[pid].pop)}:null }},
 N03:{f:'V',k:['nar_N03'],pre:function(){ return {year:fcYear()} }},
 N05:{f:'V',k:['nar_N05_1','nar_N05_2']}, N06:{f:'V',k:['nar_N06_1','nar_N06_2']},
 N07:{f:'V',k:['nar_N07'],pre:function(){ var ev=(G.dir&&G.dir.ev||[])[0]; return {sector:ev?(ev.lobe!==undefined?T('lobe'+ev.lobe):T('earthNode')).toUpperCase():''} }},
 N08:{f:'V',k:['nar_N08']}, N10:{f:'V',k:['nar_N10_1','nar_N10_2']}, N11:{f:'V',k:['nar_N11']},
 N12a:{f:'V',k:['nar_N12a']}, N12b:{f:'V',k:['nar_N12b']}, N12c:{f:'V',k:['nar_N12c']}
};
/* twelve steps, one after another; the windows and the numbers a rule needs are taken when it is shown (pre), not when the step
   opens. Each step also opens by a year (Claude — awaits review), so nobody waits forever for a thing that will not happen;
   a soft step is passed when the next one is ready (it has nothing that the next one needs). */
var STEPS=[
 {t:'hunger',opens:['people','food','line'],q:['m0','m1','m2']},
 {t:'time',opens:['speed'],q:['m3'],when:function(){ return reach(G)>0||G.ships.some(function(s){ return s.job==='colonize' })||G.day>0 }},
 {t:'line',opens:['fuel'],q:['N02','m4'],when:function(){ return reach(G)>0||G.day>=40 },go:function(){ U.tut.col=Object.keys(G.colonies)[0] }},
 {t:'home',opens:['earth','skip'],q:['N03'],soft:1,when:function(){ return (G.delivered.food||0)>0||G.day>=80 }},
 {t:'yard',opens:['metal','order','yard'],q:['m8','mM','m9'],when:function(){ return (reach(G)>=2&&Object.keys(G.colonies).some(function(k){ return !onLine(G,k).length })&&!freeHullAtPier())||(reach(G)>0&&!offLine())||G.day>=150 }},
 {t:'fleet',opens:['fleet'],q:['m10'],soft:1,when:function(){ return builtHulls()>=4||G.day>=300 }},
 {t:'slow',opens:[],q:['m11'],soft:1,when:function(){ return !!halfWorld()||G.day>=400 }},
 {t:'parts',opens:['parts','machines','tech'],q:['m12','m14'],when:function(){ var h=currentHull(G,'hauler'); return (G.delivered.parts||0)>0||G.earth.parts>0||(h!==null&&reach(G)>=HULLS[h].reach)||G.day>=450 }},
 {t:'advisor',opens:['advisor','worlds'],q:['m15'],soft:1,when:function(){ return reach(G)>=5||advRows().length>0||G.day>=500 }},
 {t:'events',opens:['sectors','events'],q:['N07','m17'],soft:1,when:function(){ return !!(G.dir&&G.dir.ev&&G.dir.ev.length)||G.day>=700 }},
 {t:'ring2',opens:['ring2','zoom'],q:['N08','m16'],when:function(){ return !ringFree(0).length||settledCount(G)>=5||G.day>=700||!!G.night }},
 {t:'night',opens:['ring3','night','ark','reserve','lift','evac'],q:['m18','m19'],when:function(){ return !!G.night&&!!G.nightSeen }}
];
function stepReady(i){ var s=STEPS[i]; if(!s) return false; return s.when()||(!!s.soft&&stepReady(i+1)) }
var STEP_SAFE=8;   // HANDOFF: no hull is lost before the advisor step (G.safe)
function tutOpen(keys){ var t=U.tut; if(!t.lock) return;
  keys.forEach(function(k){ if(t.open[k]) return; t.open[k]=1; if(TAB_KEYS[k]) t.fresh[k]=1;
    if(k==='metal'||k==='fuel'||k==='parts') openRes(G,k) }) }
function tutOpenAll(){ var t=U.tut; OPEN_ALL.forEach(function(k){ t.open[k]=1 }); t.fresh={}; ['metal','fuel','parts'].forEach(function(k){ openRes(G,k) }) }
function tutPush(id,p){ var t=U.tut; if(TMSG[id]&&!t.help) return; if(NAR[id]&&!TUTX.story) return;
  if(t.seen[id]) return; t.seen[id]=1; t.q.push({id:id,p:p||null}) }
function tutStep(i){ var t=U.tut, s=STEPS[i]; t.step=i; tutOpen(s.opens); if(s.go) s.go(); s.q.forEach(function(id){ if(id==='N03'&&!(G.delivered.food>0)) return; if(id==='m12'&&!partsHome()) return; tutPush(id) }) }
function partsHome(){ return (G.delivered.parts||0)>0||G.earth.parts>0 }
/* a new game: step 1 (the main menu and its terminal come before it) */
function tutNew(){ var on=helpPref(); U.tut=tutBlank(); var t=U.tut; t.lock=on; t.help=on;
  if(!on) tutOpenAll(); tutStep(0); t.seq=G.log.length?G.log[G.log.length-1].seq||0:0 }
/* a run already under way (an old save, or the helper turned on in the middle): what has happened is not told again */
function tutQuiet(){ var t=U.tut, i;
  i=Math.max(0,t.step); while(i+1<STEPS.length&&stepReady(i+1)) i++; t.step=i;
  for(var k=0;k<=t.step;k++) STEPS[k].q.forEach(function(id){ t.seen[id]=1 });
  if(Object.keys(G.colonies).some(isDead)){ t.seen.N06=1; t.seen.m22=1 }
  if(G.ships.some(function(s){ return s.mode==='missing' })){ t.seen.m24=1 }
  t.seq=G.log.length?G.log[G.log.length-1].seq||0:0 }
function tutLog(){ var t=U.tut, mx=t.seq;
  for(var i=0;i<G.log.length;i++){ var e=G.log[i], d=e.d||{}; if((e.seq||0)<=t.seq) continue; if(e.seq>mx) mx=e.seq;
    if(e.code==='ship_written_off'){ var s=shipById(G,d.n); tutPush('N05',{ship:s?hname(s):fill(T('hullNo'),{n:d.n}),n:num(d.c||0)}) }
    else if(e.code==='world_cut') tutPush('N10',{world:pname(d.p),n:num(d.n||0)});
    else if(e.code==='mutiny'&&!t.seen.N11){ t.mut=d.n; var sm=shipById(G,d.n); tutPush('N11',{ship:sm?hname(sm):fill(T('hullNo'),{n:d.n})}); tutPush('m23') }
    else if(e.code==='night_near'){ var nn={400:'N12a',100:'N12b',25:'N12c'}[d.n]; if(nn) tutPush(nn) } }
  t.seq=mx }
function tutJit(){ var t=U.tut, w=U.win, quiet=!t.msg&&!t.nar&&!t.q.length;
  if(!t.seen.N06||!t.seen.m22){ var dk=Object.keys(G.colonies).filter(isDead)[0]; if(dk){ t.dead=dk; tutPush('N06',{world:pname(dk),n:num(G.colonies[dk].pop)}); tutPush('m22') } }
  if(!t.seen.m24){ var ms=G.ships.filter(function(s){ return s.mode==='missing' })[0]; if(ms){ t.late=ms.id; tutPush('m24') } }
  if(quiet&&t.step>=3&&!t.seen.N03&&G.delivered.food>0) tutPush('N03');   // the step opened by its year: the first cargo is told when it comes
  if(quiet&&t.help&&t.step>=7&&!t.seen.m12&&partsHome()) tutPush('m12');
  if(!t.help||!quiet||!w) return;   // the window ones speak only while that window is up
  var c=planet(w)&&G.colonies[w], ll=c&&lastLift(G,w);
  if(w==='earth'||w==='yard'||w==='ark') tutPush('m7');
  if(w==='ark'&&G.night&&can('ark')) tutPush('m20');
  if(c&&can('machines')&&(kitOpen(G)||kitTier(c))) tutPush('m13');
  if(c&&can('lift')&&ll&&ll.st!=='going') tutPush('m21') }
function tutBusy(){ return modal() }
function tutNext(){ var t=U.tut; if(t.msg||t.nar||!U.langPicked||G.over) return;
  while(t.q.length&&!tutBusy()){ var it=t.q.shift();
    if(NAR[it.id]){ if(narShow(it)) return; continue }
    if(msgShow(it)) return } }
function msgShow(it){ var t=U.tut, m=TMSG[it.id]; U.pop=null; var p=m.pre?m.pre():{}; if(p===null) return false;
  if(m.opens) tutOpen(m.opens);
  t.msg={id:it.id,p:p,mode:m.mode,first:it.id==='m0',at:Date.now()}; return true }
function msgDone(){ var t=U.tut; if(!t.msg) return; t.msg=null; draw() }
var NART=null;
function narShow(it){ var t=U.tut, N=NAR[it.id], p=it.p||(N.pre?N.pre():{}); if(p===null) return false;
  clearTimeout(NART); t.nar={id:it.id,p:p,f:N.f,k:String(Math.random()),i:0,hold:false};
  if(N.f==='V'){ t.nar.hold=!!(t.help&&t.q.length&&TMSG[t.q[0].id]); SFX.play('voice'); NART=setTimeout(narDone,8000) }
  return true }
function narDone(){ clearTimeout(NART); if(!U.tut.nar) return; U.tut.nar=null; draw() }
/* SKIP THE HELPER (first message) and ≡ Helper off: everything opens at once; the story goes on */
function tutOff(){ var t=U.tut; if(t.lock){ G.safe=false; t.lock=false; tutOpenAll() } t.help=false;
  t.q=t.q.filter(function(x){ return !TMSG[x.id] }); t.msg=null; act(G,'helper',{on:false}) }
function tutOn(){ var t=U.tut; if(t.help) return; t.help=true; tutQuiet(); act(G,'helper',{on:true}) }
function tutTick(){ var t=U.tut; if(!U.langPicked||G.over) return;
  tutLog();
  if(t.step>=0&&stepReady(t.step+1)) tutStep(t.step+1);
  if(t.lock&&t.step===0&&!t.msg&&!t.q.length&&!t.open.speed&&!G.ships.some(function(s){ return s.job==='colonize' })) tutOpen(['speed']);   // never stuck on a stopped clock
  tutJit();
  if(t.lock) G.safe=t.step<STEP_SAFE;
  tutNext() }
/* is there something she wants to say before the clock runs on (SKIP stops there) */
function tutWants(){ var t=U.tut; return !!t.q.length||(t.step>=0&&stepReady(t.step+1)) }
function tutHold(){ var t=U.tut; return !!t.msg||!!(t.nar&&t.nar.hold) }
/* the press: a rule lets through only its lit thing; her voice closes on any press */
function tutTarget(m){ var s=typeof m.at==='function'?m.at():m.at, e=s?document.querySelector(s):null; return e&&e.getClientRects().length?e:null }
function tutClick(ev){ var t=U.tut, x=ev.target;
  if(t.msg){ var b=x.closest('#helper [data-act]');
    if(b){ if(b.dataset.act==='tutok'){ if(Date.now()-t.msg.at>300) msgDone() } else if(b.dataset.act==='tutskip'){ tutOff(); draw() } return true }
    if(x.closest('#helper')) return true;
    var m=TMSG[t.msg.id], tg=tutTarget(m), t2=m.also&&document.querySelector(m.also);
    if((tg&&tg.contains(x))||(t2&&t2.contains(x))) return false;
    if(t.msg.mode==='see'){ if(Date.now()-t.msg.at>300) msgDone(); return true }   // a double press does not skip the next rule
    var rr=el('tutRing').getBoundingClientRect(); if(m.hit&&ev.clientX>=rr.left&&ev.clientX<=rr.right&&ev.clientY>=rr.top&&ev.clientY<=rr.bottom){ m.hit(); return true }
    var r=el('tutRing'), r2=el('tutRing2'); [r,r2].forEach(function(q){ q.classList.remove('shk'); void q.offsetWidth; q.classList.add('shk') }); SFX.play('deny'); return true }
  if(t.nar&&t.nar.f==='V'){ var onV=!!x.closest('#voice'); narDone(); return onV||!!t.msg }
  return false }
function tutKey(e){ var t=U.tut;
  var mine=e.code==='Space'||e.key==='Enter'||e.key==='Escape'||/^[1-4]$/.test(e.key);
  if(t.msg){ if(mine) e.preventDefault(); if(!e.repeat&&t.msg.mode==='see'&&mine&&!/^[1-4]$/.test(e.key)&&Date.now()-t.msg.at>300) msgDone(); return true }
  if(t.lock&&!can('speed')&&(e.code==='Space'||/^[1-4]$/.test(e.key))) return true;
  return false }
/* after a press went through: a 'do' is done when its press succeeded, a 'see' on any press; a tab loses its dot */
function tutAct(a,v,res){ var t=U.tut; if(a==='tab'&&t.fresh[v]) delete t.fresh[v];
  if(!t.msg) return; var m=TMSG[t.msg.id];
  if(t.msg.mode==='do'?m.done(a,v,res):true){ t.msg=null } }
/* the dark with a cut-out (+6 px, one or two pieces), the yellow ring, the helper over the map — or over the target */
function tutPlace(){ var t=U.tut, Lr=el('tutL'), Rg=el('tutRing'), Rg2=el('tutRing2'), hp=el('helper');
  narPlace(); el('toasts').style.visibility=t.msg?'hidden':'';   // the toasts wait while she speaks: they sat on the lit thing
  if(!t.msg){ if(hp._k){ hp._k=''; hp.innerHTML='' } Lr.className=''; Rg.style.display='none'; Rg2.style.display='none'; hp.className=''; return }
  var m=TMSG[t.msg.id], tg=tutTarget(m), t2=m.also?tutTarget({at:m.also}):null;
  if(t.msg.mode==='do'&&(!tg||!tutLive(tg))) t.msg.mode='see';   // its button is refused or gone: she only shows it
  var key=t.msg.id+'|'+U.lang+'|'+t.msg.mode;
  if(hp._k!==key){ hp._k=key; hp.innerHTML='<div class="hav ava"></div><div><div class="hnm">'+esc(T('tut_name'))+'</div><div class="htx">'+esc(fill(T(m.k),t.msg.p))+'</div><div class="hbt">'+
    (t.msg.first?btn(esc(T('tut_skipHelper')),'tutskip'):'')+(t.msg.mode==='see'?btn(esc(T('tut_gotIt')),'tutok',null,'pri'):'')+'</div></div>' }
  hp.className='on'; Lr.className='on';
  var ar=el('app').getBoundingClientRect(), z=appZoom(), W=ar.width/z, H=ar.height/z, hh=hp.offsetHeight, top=H-hh-16, left=82+Math.max(0,(W-82-640)/2), P=6;
  var box=function(e){ var r=e.getBoundingClientRect(); return {x0:Math.max(0,(r.left-ar.left)/z-P),y0:Math.max(0,(r.top-ar.top)/z-P),x1:Math.min(W,(r.right-ar.left)/z+P),y1:Math.min(H,(r.bottom-ar.top)/z+P)} };
  var ring=function(R,b){ if(!b){ R.style.display='none'; return } R.style.display='block'; R.style.left=b.x0+'px'; R.style.top=b.y0+'px'; R.style.width=(b.x1-b.x0)+'px'; R.style.height=(b.y1-b.y0)+'px' };
  var rect=function(b){ return ','+b.x0+'px '+b.y0+'px,'+b.x1+'px '+b.y0+'px,'+b.x1+'px '+b.y1+'px,'+b.x0+'px '+b.y1+'px,'+b.x0+'px '+b.y0+'px' };
  if(tg){ var a=box(tg), b=t2?box(t2):null;
    if(b&&a.x0<b.x1&&b.x0<a.x1&&a.y0<b.y1&&b.y0<a.y1){ a={x0:Math.min(a.x0,b.x0),y0:Math.min(a.y0,b.y0),x1:Math.max(a.x1,b.x1),y1:Math.max(a.y1,b.y1)}; b=null }
    Lr.style.clipPath='polygon(evenodd,0 0,'+W+'px 0,'+W+'px '+H+'px,0 '+H+'px,0 0'+rect(a)+(b?',0 0'+rect(b):'')+')';
    ring(Rg,a); ring(Rg2,b);
    var lo=Math.min(a.y0,b?b.y0:1e9), hi=Math.max(a.y1,b?b.y1:0);
    if(hi>top-10) top=Math.max(104,lo-hh-16) }
  else { Lr.style.clipPath='none'; ring(Rg,null); ring(Rg2,null) }
  hp.style.left=left+'px'; hp.style.top=top+'px' }
function tutLive(e){ if(e.getAttribute('aria-disabled')==='true') return false; if(!e.querySelector('[data-act]')) return true; return !!e.querySelector('[data-act]:not([aria-disabled="true"])') }
function narPlace(){ var n=U.tut.nar, V=el('voice');
  if(n&&n.f==='V'){ if(V._k!==n.k+U.lang){ V._k=n.k+U.lang; var N2=NAR[n.id];
      V.innerHTML='<div class="hav ava"></div><div><div class="hnm">'+esc(T('tut_name'))+'</div><div class="vtx">'+N2.k.map(function(k){ return esc(fill(T(k),n.p)) }).join('<br>')+'</div></div><i class="vbar"></i>';
      V.className=''; void V.offsetWidth; V.className='on' }
    V.classList.toggle('side',!!U.tab); var pf=el('pfL'); V.style.bottom=pf.classList.contains('low')?(pf.offsetHeight+24)+'px':'' }   // a crew card at the foot of the map: her voice stands above it
  else if(V._k){ V._k=''; V.className=''; V.innerHTML='' } }
/* Alexandra's line under the Institute's in a big window */
function alx(s){ return '<div class="alx"><div class="hav ava"></div><div><div class="hnm">'+esc(T('tut_name'))+'</div><p>'+esc(s)+'</p></div></div>' }
function icap(right){ return '<div class="icap">'+esc(T('tut_inst'))+'<span>'+esc(right)+'</span></div>' }
/* in the save: what is open and what was said; the queue is not kept — what the current step has not said yet is said again */
var TUT_KEEP=['lock','help','open','fresh','seen','step','seq','farm','col','dead','late','mut','r2'];
function tutSave(){ var t=U.tut, o={}; TUT_KEEP.forEach(function(k){ if(t[k]!==undefined) o[k]=t[k] });
  var sn={}; for(var k in t.seen) sn[k]=1; t.q.forEach(function(x){ delete sn[x.id] }); if(t.msg) delete sn[t.msg.id]; if(t.nar) delete sn[t.nar.id];
  o.seen=sn; return o }
function tutLoad(o){ clearTimeout(NART); U.tut=tutBlank(); var t=U.tut;
  if(!o){ tutOpenAll(); t.step=0; tutQuiet(); return }   // a save from before v4.36: everything open, no helper, the story goes on from here
  TUT_KEEP.forEach(function(k){ if(o[k]!==undefined) t[k]=o[k] });
  if(!t.lock) tutOpenAll();
  var st=STEPS[t.step]; if(st) st.q.forEach(function(id){ tutPush(id) }) }
function tutState(){ var t=U.tut; return {lock:t.lock,help:t.help,step:t.step,msg:t.msg&&t.msg.id,mode:t.msg&&t.msg.mode,nar:t.nar&&t.nar.id,q:t.q.map(function(x){ return x.id }),open:Object.keys(t.open),fresh:Object.keys(t.fresh)} }

/* ---------- render ---------- */
function appZoom(){ return +(el('app').dataset.z||1) }
function drawSide(){ var t=U.tab, h='';
  if(t==='worlds') h=sideWorlds(); else if(t==='tech') h=sideTech(); else if(t==='fleet') h=sideFleet();
  setHTML('side',h,t+':'+U.filter); el('side').className=t?'on':'' }
function drawWin(){ var w=U.win, h='';
  if(w==='earth') h=winEarth(); else if(w==='yard') h=winYard(); else if(w==='ark') h=winArk(); else if(w&&planet(w)) h=winWorld(w);
  setHTML('ovl',h,w); el('ovl').className=h?'on':'' }
function drawPop(){ var p=U.pop, h='', cls='';
  if(p==='adv'){ h=popAdv(); cls='p-adv' } else if(p==='menu'){ h=popMenu(); cls='p-menu' } else if(p&&p.indexOf('pick:')===0){ h=picker(); cls='p-center' }
  if(!h) U.pop=null;
  setHTML('pop',h,p); el('pop').className=h?'on '+cls:'' }
function focusFix(){ var now=Date.now();
  if(U.focus){ U.focusK=U.focus; U.focusT=now; U.focus=null; var e0=document.querySelector(U.focusK); if(e0) e0.scrollIntoView({block:'nearest'}) }
  if(!U.focusK) return; if(now-U.focusT>3000){ U.focusK=null; return }
  var e=document.querySelector(U.focusK); if(e&&!e.classList.contains('focus')){ e.style.animationDelay=-(now-U.focusT)+'ms'; e.classList.add('focus') } }
function draw(){
  if(!G) return;
  voiceWatch(); watchRings(); tutTick();
  drawTop(); drawRes(); drawTabs(); drawMap(); drawEvBar(); drawCards(); drawSide(); drawWin(); drawPop(); drawBig(); drawPF(); focusFix(); tutPlace();
  var m=el('map'); if(m.pauseAnimations){ if(halted()) m.pauseAnimations(); else m.unpauseAnimations() }
}

/* ---------- hulls: where each one is, in one line ---------- */
function hullSt(s){
  var wl=forWorld(s);
  if(s.mode==='building') return ['build',fill(T('u_stYard'),{n:s.t,p:wl?pname(wl):T('u_freeHull')}),C.mid];
  if(s.mode==='missing') return ['overdue',fill(T('u_stMissing'),{n:s.missDays||0}),C.red];
  if(s.mutiny) return ['mutiny',T('u_stMutiny'),C.red];
  if(s.mode==='transit'){
    if(s.job==='colonize') return ['settlers',fill(T('u_stSettlers'),{n:num(s.cargo.people||0),p:pname(s.dest),t:s.t}),C.people];
    if(s.job==='evac') return s.dest==='earth'?['evac',fill(T('u_stEvacHome'),{n:num(s.cargo.people||0),t:s.t}),C.people]:['evac',fill(T('u_stEvacOut'),{p:pname(s.dest),t:s.t}),C.people];
    if(s.job==='search') return ['overdue',fill(T('u_stSearch'),{p:pname(s.dest==='earth'?s.origin:s.dest),t:s.t}),C.mid];
    if(s.cargo&&s.cargo.kit) return ['kit',fill(T('u_stKit'),{k:roman(s.cargo.kit.tier-1),t:s.t}),C.people];
    if(s.dest==='earth') return ['toEarth',fill(T('u_stHome'),{t:s.t}),C.mid];
    return ['toWorld',fill(T('u_stOut'),{p:pname(s.dest),t:s.t}),C.mid];
  }
  if(s.at==='earth'||!s.at){
    if(s.crewWait) return ['mutiny',T('u_stCrew'),C.red];
    if(s.reserve) return ['reserve',T('u_stReserve'),C.ark];
    if(s.from&&s.to) return ['unloading',T('u_stAtEarth'),C.mid];
    if(s.pend) return ['pier',fill(T('u_stPend'),{p:pname(s.pend.from)}),C.people];
    return ['pier',T('u_stFree'),C.people];
  }
  return ['loading',fill(T('u_stLoading'),{p:pname(s.at)}),C.mid];
}
function stRow(s){ var a=hullSt(s);
  return '<span class="hst" style="color:'+a[2]+'">'+ic(a[0],15,a[2])+esc(a[1])+'</span>'+
    (s.moveTo&&planet(s.moveTo)?'<span class="hst" style="color:'+C.ink+'">'+ic('movesTo',15)+esc(fill(T('u_stMoveTo'),{p:pname(s.moveTo)}))+'</span>':'') }
function hullRow(s,acts,id){ var g=hullGen(s);
  return '<div class="hr"'+(id?' id="'+id+'"':'')+'>'+shipIc(shipClass(s),30)+genB(g,g<(G.gen||0)-1)+'<span class="hn">'+esc(T(shipClass(s))+' '+fill(T('hullNo'),{n:s.id}))+'</span><span class="hs">'+stRow(s)+'</span><span class="ha">'+(acts||'')+'</span></div>' }
function speedTxt(hl){ return (hl.speed*driveSpeed(G)).toFixed(2) }
function specIcons(h){ return '<span>'+ic('hold',15,C.mid)+num(h.cap)+'</span><span>'+ic('speed',15,C.mid)+speedTxt(h)+'</span><span>'+ic('range',15,C.mid)+esc(fill(T('u_ringN'),{n:hullRange(h)+1}))+'</span>' }
function hullCost(h){ return {metal:h.metal,fuel:h.fuel,parts:h.parts||0,people:h.crew||0} }
function clsSeen(cls){ return cls==='courier'||can('parts') }   // v4.36: a hull that costs parts shows up once parts are open

/* ---------- the world window ---------- */
function stepOrder(pid){ var col=!!G.colonies[pid];
  return PLANETS.filter(function(p){ return secVis(p.sec)&&!(G.ghost&&G.ghost[p.id])&&(!!G.colonies[p.id])===col })
    .sort(function(a,b){ return a.sec-b.sec||a.ang-b.ang }).map(function(p){ return p.id }) }
function openWorld(pid,focus){ U.pop=null; U.win=pid; U.scrapArm=null; var f=(focus||'').split(':');
  if(f[1]&&(f[0]==='free'||f[0]==='other')) U.addTab=f[0];   // v4.38: the advisor names a hull — open the tab she is on and light her
  U.focus=!focus?null:f[1]?'#'+{free:'ah',other:'ah',oc:'oc',hr:'hr'}[f[0]]+'-'+f[1]:FOCUS[focus] }
var FOCUS={evac:'#ovl [data-act="evac"]',add:'#addblk',lift:'#rw-lift',ord:'#ordblk',mach:'#mach'};
var KW={mine:'u_kMine',farm:'u_kFarm',well:'u_kWell',works:'u_kWorks'};
function wsub(p,extra){ return esc((T(KW[p.kind])+' · '+fill(T('u_ringN'),{n:p.sec+1})+(extra?' · '+extra:'')).toUpperCase()) }
function sendFuel(p){ return Math.max(1,Math.round(p.dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(G)))) }
function lobeTxt(p){ var lb=lobeOf(p.ang), ev=lobeEvents(G,lb); return T('lobe'+lb).toUpperCase()+' · '+(ev.length?evName(ev[0].type):T('u_calm')) }
function assignable(pid){ var p=planet(pid);
  return G.ships.filter(function(s){ return s.mode==='idle'&&s.at==='earth'&&!s.mutiny&&!s.crewWait&&!(s.from&&s.to)&&!s.pend&&!s.job&&canReachSector(s,p.sec) }) }
/* v4.18: the free courier that can lift everyone and gets there first; else the biggest one; v4.33: none that would miss the Night */
function pickCourier(pid){ var c=G.colonies[pid], pop=c?Math.floor(c.pop):0;
  var list=assignable(pid).filter(function(s){ return shipClass(s)==='courier'&&!(G.night&&nightLeft(G)<legDays(G,'earth',pid,s)*2) });
  if(!list.length) return null;
  var fit=list.filter(function(s){ return s.cap>=pop }).sort(function(a,b){ return legDays(G,pid,'earth',a)-legDays(G,pid,'earth',b)||a.cap-b.cap });
  if(fit.length) return fit[0];
  return list.sort(function(a,b){ return b.cap-a.cap })[0] }
function evacGoing(pid){ return G.ships.some(function(o){ return o.job==='evac'&&o.dest===pid&&o.mode==='transit' }) }
function evacW(pid){ var nh=nextHome(G,pid,'courier'); if(nh&&nh.t<=0) return fill(T('u_evacW_line'),{n:nh.id}); return nh?fill(T('u_evacW_wait'),{n:nh.id,l:nh.t}):T('u_evacW_orderC') }
function evacBlock(p){ var c=G.colonies[p.id];
  if(evacGoing(p.id)) return btn(esc(T('evacGoing')),'evac',{p:p.id},'red full','evac',off('evacuating'));
  var ll=lastLift(G,p.id);
  if(ll&&ll.st==='cut') return alertBox('cutoff',esc(fill(T('liftCut'),{k:num(ll.pop)})))+btn(esc(T('u_evacLate')),'evac',{p:p.id},'full','evac',off('evacLate',{p:pname(p.id)}));
  var s=pickCourier(p.id), pop=Math.floor(c.pop), ef=Math.round(p.dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(G)));
  if(s&&G.earth.fuel<ef) return btn(esc(T('u_evacuate')),'evac',{p:p.id},'red full','evac',off('short_fuel',{n:Math.ceil(ef-G.earth.fuel)}));
  if(!s) return btn(esc(T('u_evacuate')),'evac',{p:p.id},'red full','evac',off('evacNoCourier',{p:pname(p.id),w:evacW(p.id)}));
  return btn(esc(T('u_evacuate')),'evac',{p:p.id},'red full','evac')+hint(esc(fill(T(s.cap<pop?'u_evacShort':'u_evacWho'),{h:T('courier')+' '+fill(T('hullNo'),{n:s.id}),c:s.cap,k:pop,l:pop-s.cap,t:legDays(G,p.id,'earth',s)})),'c') }
function liftRow(p){ var ll=lastLift(G,p.id); if(!can('lift')||!ll||ll.st==='going') return '';
  var v=ll.st==='cut'?T('u_liftCut'):(ll.st==='none'?T('u_liftNone'):ll.y+' · '+fill(T('u_yearsN'),{n:ll.n}));
  return row(ic('lift',13,C.people)+esc(T('u_lastLift')),esc(v),ll.st==='cut'?C.red:(ll.st==='none'||ll.n<=25?C.red:(ll.n<=K.LIFT_WARN?C.people:null)),'rw-lift') }
function machines(p,c){ if(!can('machines')||(!kitOpen(G)&&!kitTier(c))) return '';   // before the Gen III yards the block is only noise
  var kt=kitTier(c), kc=kitCost(c), kr=canKit(G,p.id), hold=lineHold(G,p.id), h='';
  h+=sec(esc(T('u_machines')),esc(kt?fill(T(kitLive(c)?'u_tierRun':'u_tierStand'),{t:roman(kt-1)}):T('u_tierNone')).toUpperCase());
  if(kt){ var burn=kitBurn(c); h+=row(resIc('fuel',13)+esc(T('kitFuel')),dec(burn)+esc(T('u_perYr')),C.fuel)+row(resIc('fuel',13)+esc(T('u_fuelOnSite')),esc(fill(T('u_yearsN'),{n:Math.floor((c.store.fuel||0)/Math.max(0.01,burn))})),kitLive(c)?null:C.red);
    if(!kitLive(c)) h+=alertBox('stopped',esc(T('kitStarved'))) }
  if(c.kit) h+=hint(esc(fill(T(hold>=c.kit.w?'u_kitWaiting':'u_kitTooBig'),{t:roman(c.kit.tier-1),w:num(c.kit.w),h:num(hold)})));
  else if(c.kitShip){ var ks=shipById(G,c.kitShip); h+=hint(esc(fill(T('kitAboard'),{n:c.kitShip,y:ks?ks.t:0}))) }
  else if(kr==='kitgate') h+=hint(esc(fill(T('u_kitGate'),{g:roman(K.KIT_GATE_DRIVE)})));
  else if(kr==='tiermax') h+=hint(esc(T('kitMax')));
  else { var kg=kitGain(G,p.id);
    if(kg) h+=hint(esc(fill(T('u_kitGain'),{t:roman(kc.tier-1),x:dec(kg.now),y:dec(kg.with),f:dec(kg.fuel)})));
    var cost={metal:kc.metal,parts:kc.parts}, w=(kr==='metal'||kr==='parts')?shortWhy(cost,G.earth):kr;
    h+='<div class="prow">'+price(cost,G.earth)+btn(esc(fill(T('u_kitOrder'),{t:roman(kc.tier-1)})),'kit',{p:p.id},'pri','upgrade',offW(w))+'</div>';
    if(hold<kc.w) h+=hint(esc(fill(T('u_kitHold'),{w:num(kc.w),h:num(hold)}))) }
  return '<div id="mach">'+h+'</div>' }
function winWorld(pid){
  var p=planet(pid), c=G.colonies[pid], st=wst(pid), L0='', R='';
  var nav=stepOrder(pid).length>1?'<button class="nav l" type="button" data-act="step" data-v="-1">‹</button><button class="nav r" type="button" data-act="step" data-v="1">›</button>':'';
  var dep=p.kind==='works'?'parts':p.dep;
  if(st==='ghost') return '<div class="win sm">'+head(esc(pname(pid)),wsub(p),wmark(p.kind,false,16))+'<div class="bd">'+hint(esc(fill(T('ghostWorld'),{d:G.ghost[pid]})))+'</div>'+nav+'</div>';
  if(st==='settling'){ var er=enRoute(G,pid);
    return '<div class="win sm">'+head(esc(pname(pid)),wsub(p,T('u_inTransit')),wmark(p.kind,false,16))+'<div class="bd">'+sec(esc(T('u_settlersWay')))+
      '<div class="trn">'+shipIc(shipClass(er),30)+genB(hullGen(er))+'<b>'+esc(hname(er))+' · '+esc(fill(T('u_peopleN'),{n:num(er.cargo.people||0)}))+'</b><span>'+esc(fill(T('u_landsIn'),{n:er.t}))+'</span></div>'+
      '<div class="bar"><u style="width:'+Math.round((1-er.t/Math.max(1,er.total))*100)+'%;background:'+C.people+'"></u></div></div>'+nav+'</div>' }
  if(!c){
    var hs=assignable(pid), who=hs.filter(function(s){ return s.id===U.who[pid] })[0];
    if(!who&&hs.length){ who=hs.slice().sort(function(a,b){ return (a.reserve?1:0)-(b.reserve?1:0)||foundParty(G,b,pid)-foundParty(G,a,pid)||legDays(G,'earth',pid,a)-legDays(G,'earth',pid,b) })[0]; U.who[pid]=who.id }
    var party=who?foundParty(G,who,pid):0, fuel=sendFuel(p);
    L0+=sec(esc(T('u_world')))+(!can(dep)?'':p.kind==='works'?row(esc(T('u_makes')),esc(T('parts')),C.parts):row(esc(T('u_deposit')),resIc(dep,13)+num(G.reserves[pid]),KCOL[p.kind]));   // a resource the player has not met yet is not shown
    L0+=row(esc(T('u_crossing')),esc(fill(T('u_oneWay'),{n:legDays(G,'earth',pid,who||{hull:currentHull(G,'courier')})})))+row(esc(T('u_sector')),esc(lobeTxt(p)));
    L0+=sec(esc(T('u_found')))+row(resIc('people',13)+esc(T('u_settlers')),esc(fill(T('u_peopleN'),{n:party})),C.people)+'<div class="lab">'+esc(T('u_whoGoes'))+'</div>';
    if(hs.length) L0+=hs.map(function(s){ return '<button type="button" class="radio'+(who===s?' on':'')+'" data-act="who" data-p="'+pid+'" data-s="'+s.id+'"><i></i>'+shipIc(shipClass(s),26)+genB(hullGen(s))+'<b>'+esc(fill(T('hullNo'),{n:s.id}))+'</b><span>'+(s.reserve?'<em style="color:'+C.ark+';font-style:normal">'+esc(T('u_stReserve'))+'</em> · ':'')+esc(fill(T('u_whoLine'),{c:num(s.cap),n:legDays(G,'earth',pid,s)}))+'</span></button>' }).join('');
    else L0+='<div class="why">'+esc(freeAtPier().filter(function(s){ return !s.mutiny&&!s.crewWait }).length?fill(T('u_noneReach'),{n:p.sec+1}):T('u_noFree'))+'</div>';
    var w=!who?'nofree':(party<K.MIN_FOUND?['fewhands',{n:K.MIN_FOUND-party}]:shortWhy({fuel:fuel,people:party},G.earth));
    if(enRoute(G,pid)) w='enroute';
    L0+='<div class="prow"><span class="lab">'+esc(T('u_price'))+'</span>'+price({fuel:fuel,people:party},G.earth)+'</div>'+btn(esc(T('u_sendSettlers')),'send',{p:pid},'pri full','send',offW(w==='ok'||(w[0]==='ok')?'ok':w));
    return '<div class="win sm">'+head(esc(pname(pid)),wsub(p,T('u_free')),wmark(p.kind,false,16))+'<div class="bd">'+L0+'</div>'+nav+'</div>' }
  if(st==='dead') return '<div class="win sm">'+head(esc(pname(pid)),wsub(p,T('u_workedOut')),wmark(p.kind,true,16))+'<div class="bd"><div class="big mid">'+ic('workedout',22,C.mid)+esc(T('u_seamDead'))+'</div>'+
    row(resIc('people',13)+esc(T('people')),num(c.pop),C.people)+liftRow(p)+evacBlock(p)+'</div>'+nav+'</div>';
  var lr=lineRate(G,pid);
  L0+=sec(esc(T('u_world')));
  if(p.kind==='works'){ var wh=worksHungry(pid), fr=feedRates(G,pid);
    L0+=row(resIc('people',13)+esc(T('people')),num(c.pop),C.people)+liftRow(p);
    L0+=sec(esc(T('u_eats')))+row(resIc('metal',13)+esc(T('metal')),dec(fr.metal||0)+esc(T('u_perYr'))+' · '+esc(fill(T('u_yearsN'),{n:Math.floor(wh.metal)})),wh.metal<10?C.red:null)+
      row(resIc('food',13)+esc(T('food')),dec(fr.food||0)+esc(T('u_perYr'))+' · '+esc(fill(T('u_yearsN'),{n:Math.floor(wh.food)})),wh.food<10?C.red:null);
    if(wh.idle>5) L0+=alertBox('starving',esc(T('u_worksIdle')));
    else if(wh.low<10) L0+=alertBox('starving',esc(fill(T('u_worksLow'),{n:Math.floor(wh.low)})));
    L0+=sec(esc(T('u_makes')))+'<div id="rw-carries">'+row(resIc('parts',13)+esc(T('parts')),wh.idle>5?'0':dec(lr.makes)+esc(T('u_perYr')))+row(esc(T('u_onSurface')),num(c.store.parts||0))+row(esc(T('u_lineCarries')),dec(lr.carries)+esc(T('u_perYr')))+'</div>';
  } else {
    var dry=isDry(pid);
    L0+=row(resIc(dep,13)+esc(T('u_deposit')),dry?esc(T('u_dryShort')):esc(seamLeft(pid)),dry?C.red:KCOL[p.kind])+row(esc(T('u_onSurface')),num(c.store[dep]||0))+
      '<div id="rw-carries">'+row(esc(T('u_worldGives')),dec(lr.makes)+esc(T('u_perYr')))+row(esc(T('u_lineCarries')),dec(lr.carries)+esc(T('u_perYr')),(lr.carries<lr.makes*0.8)?C.people:null)+'</div>'+
      row(resIc('people',13)+esc(T('people')),num(c.pop),C.people)+liftRow(p);
    if(dry) L0+=alertBox('workedout',esc(fill(T('u_dryLead'),{n:num(pileLeft(G,pid)),r:T(dep).toLowerCase()})),true);
  }
  L0+=machines(p,c);
  if(can('evac')) L0+=evacBlock(p);
  // the line: the hulls on it, a free hull or one from another line, or a new one from the yards
  var on=onLine(G,pid).sort(function(a,b){ return a.id-b.id });
  R+=sec(esc(T('u_onLine')),esc(fill(T('u_hullsN'),{n:on.length})).toUpperCase());
  R+=on.length?on.map(function(s){ return hullRow(s,(can('fleet')&&s.mode!=='building'&&s.mode!=='missing'?btn(esc(T('u_move')),'pick',{v:'move:'+s.id},'','move'):'')+btn(esc(T('u_takeOff')),'unroute',{s:s.id},'','takeoff'),'hr-'+s.id) }).join(''):'<div class="why">'+esc(T('u_noHulls'))+'</div>';
  var free=freeAtPier().filter(function(s){ return !s.mutiny&&!s.crewWait&&!s.job }), other=G.ships.filter(function(s){ return s.mode!=='dead'&&s.mode!=='missing'&&!s.mutiny&&((s.from&&s.to&&s.from!==pid)||(s.pend&&s.pend.from!==pid))&&s.mode!=='building'&&s.moveTo!==pid });
  var tab=U.addTab==='other'&&can('fleet')?'other':'free', pool=tab==='free'?free:other;
  R+='<div id="addblk"><div class="sec"><span>'+esc(T('u_addHull'))+'</span><span class="seg"><button type="button" data-act="addtab" data-v="free" class="'+(tab==='free'?'on':'')+'">'+esc(fill(T('u_segFree'),{n:free.length}))+'</button>'+(can('fleet')?'<button type="button" data-act="addtab" data-v="other" class="'+(tab==='other'?'on':'')+'">'+esc(fill(T('u_segOther'),{n:other.length}))+'</button>':'')+'</span></div><div class="lst">';
  R+=pool.length?pool.sort(function(a,b){ return hullGen(b)-hullGen(a)||b.cap-a.cap }).map(function(s){ var ok=canReachSector(s,p.sec), wl=s.from||(s.pend&&s.pend.from);
    return '<div class="hr'+(ok?'':' dis')+'" id="ah-'+s.id+'">'+shipIc(shipClass(s),30)+genB(hullGen(s),hullGen(s)<(G.gen||0)-1)+'<span class="hn">'+esc(T(shipClass(s))+' '+fill(T('hullNo'),{n:s.id}))+'</span><span class="hs">'+
      (ok?'<span class="hst">'+ic('hold',15,C.mid)+num(s.cap)+' · '+ic('speed',15,C.mid)+esc(fill(T('u_roundTrip'),{n:legDays(G,pid,'earth',s)*2}))+'</span>'+(tab==='other'?'<span class="hst">'+esc(fill(T('u_fromLine'),{p:pname(wl)}))+'</span>':(s.reserve?'<span class="hst" style="color:'+C.ark+'">'+esc(T('u_stReserve'))+'</span>':''))
         :'<span class="hst" style="color:'+C.red+'">'+ic('range',15,C.red)+esc(fill(T('u_tooShort'),{n:shipRange(s)+1}))+'</span>')+
      '</span><span class="ha">'+(ok?btn(esc(T(tab==='free'?'u_assign':'u_moveHere')),tab==='free'?'assign':'move',{s:s.id,p:pid},'pri','assign'):'')+'</span></div>' }).join('')
    :'<div class="why dim">'+esc(T(tab==='free'?'u_noFreePier':'u_noOther'))+'</div>';
  R+='</div></div>';
  if(can('order')){
    R+='<div id="ordblk">'+sec(esc(T('u_orderNew')),esc(fill(T('u_yardGen'),{g:roman(G.gen||0)})))+'<div class="ord">';
    CLASSES.forEach(function(cls){ var hi=currentHull(G,cls); if(hi===null||!clsSeen(cls)) return; var h=HULLS[hi];
      if(reach(G)<h.reach){ R+='<div class="oc dis">'+shipIc(cls,40)+'<b>'+esc(T(cls)+' '+roman(h.gen))+'</b><div class="why dim">'+esc(fill(T('u_needLive'),{n:h.reach}))+'</div></div>'; return }
      var w=orderCheck(G,pid,cls); if(w==='cost'||w==='crew') w=shortWhy(hullCost(h),G.earth);
      var okb=(typeof w==='string'?w:w[0])==='ok';
      R+='<div class="oc'+(okb?'':' dis')+'" id="oc-'+cls+'">'+shipIc(cls,40)+'<b>'+esc(T(cls)+' '+roman(h.gen))+'</b>'+
        (w==='range'?'':'<div class="oy">'+esc(fill(T('u_lineAdds'),{n:dec(hullYield(G,pid,{hull:hi}))}))+'</div>')+'<div class="prow">'+price(hullCost(h),G.earth,12)+'</div>'+
        (w==='range'?'<div class="why">'+esc(fill(T('u_tooShort'),{n:hullRange(h)+1}))+'</div>':btn(esc(fill(T('u_buildYrs'),{n:h.days})),'order',{p:pid,c:cls},'pri','build',offW(w)))+'</div>' });
    R+='</div></div>' }
  return '<div class="win">'+head(esc(pname(pid)),wsub(p),wmark(p.kind,true,16))+'<div class="bd two"><div>'+L0+'</div><div>'+R+'</div></div>'+nav+'</div>' }
/* v4.10 (Nikita, 27.09: 'слишком много непонятных цифр'): the seam is told in years at the current pace */
function seamShort(pid){ var res=G.reserves[pid], c=G.colonies[pid], p=planet(pid), rate=c?c.pop*p.rich*K.PROD*rateMult(c):0; return rate<=0.001?num(res):fill(T('u_yShort'),{n:num(res/rate)}) }
function seamLeft(pid){ var res=G.reserves[pid], c=G.colonies[pid], p=planet(pid);
  var rate=c?c.pop*p.rich*K.PROD*rateMult(c):0; if(rate<=0.001) return num(res);
  return fill(T('u_yearsN'),{n:num(res/rate)}) }
/* the hull picker: send a free hull, or move one off its line; closed by «keep it where it is» or a press beside it */
function picker(){ var a=U.pop.split(':'), kind=a[1], s=shipById(G,+a[2]); if(!s) return '';
  var here=s.from||(s.pend&&s.pend.from);
  var ws=Object.keys(G.colonies).filter(function(k){ return k!==here&&!isDead(k)&&!evacGoing(k) }).sort(function(x,y){ return planet(x).sec-planet(y).sec||planet(x).ang-planet(y).ang });
  return '<div class="pick">'+sec(esc(fill(T(kind==='move'?'u_moveTo':'u_sendTo'),{h:hname(s)})).toUpperCase())+'<div class="lst">'+
    (ws.length?ws.map(function(k){ var p=planet(k), ok=canReachSector(s,p.sec);
      return '<button type="button" '+(ok?'data-act="pickgo" data-v="'+kind+':'+s.id+':'+k+'"':'class="dis"')+'>'+wmark(p.kind,true)+'<b>'+esc(pname(k))+'</b><span>'+esc(ok?fill(T('u_ringN'),{n:p.sec+1})+' · '+fill(T('u_hullsN'),{n:onLine(G,k).length}):T('u_outReach'))+'</span></button>' }).join(''):'<div class="why">'+esc(T('u_noWorlds'))+'</div>')+
    '</div><button type="button" class="cancel" data-act="pop" data-v="">'+esc(T('u_keep'))+'</button></div>' }

/* ---------- Yard: what is being built, a free hull of the current generation, the pier ---------- */
function winYard(){ var g=G.gen||0, b=building(), pier=freeAtPier(), h='';
  h+=sec(esc(T('u_inYards')),b.length);
  h+=b.length?b.map(function(s){ var w=forWorld(s); return '<div class="yr2">'+shipIc(shipClass(s),30)+'<b>'+esc(T(shipClass(s))+' '+roman(hullGen(s))+' '+fill(T('hullNo'),{n:s.id}))+'</b><span>→ '+esc(w?fill(T('u_lineOf'),{p:pname(w)}):T('u_freeHull'))+'</span><div class="bar"><u style="width:'+Math.round(hullProgress(s)*100)+'%"></u></div><i>'+esc(fill(T('u_yearsN'),{n:s.t}))+'</i></div>' }).join(''):hint(esc(T('u_yardsIdle')));
  h+=sec(esc(T('u_buildFree')))+'<div class="ord big">';
  CLASSES.forEach(function(cls){ var hi=currentHull(G,cls); if(hi===null||!clsSeen(cls)) return; var hl=HULLS[hi], c=hullCost(hl);
    var w=reach(G)<hl.reach?['needreach',{n:hl.reach,r:reach(G)}]:shortWhy(c,G.earth), okb=w[0]==='ok';
    h+='<div class="oc'+(okb?'':' dis')+'">'+shipIc(cls,64)+'<b>'+esc(T(cls)+' '+roman(hl.gen))+'</b><div class="ico3">'+specIcons(hl)+'</div><div class="prow">'+price(c,G.earth)+'</div>'+
      (reach(G)<hl.reach?'<div class="why dim">'+esc(fill(T('u_needLive'),{n:hl.reach}))+'</div>':btn(esc(fill(T('u_buildYrs'),{n:hl.days})),'build',{h:hi},'pri','build',offW(w)))+'</div>' });
  h+='</div>'+sec(esc(T('u_atPier')),esc(fill(T('u_hullsN'),{n:pier.length})).toUpperCase());
  h+=pier.length?'<div class="pier">'+pier.sort(function(a,b){ return (b.reserve?1:0)-(a.reserve?1:0)||hullGen(b)-hullGen(a)||a.id-b.id }).map(function(s){ var v=scrapValue(HULLS[s.hull]), arm=U.scrapArm===s.id;
    return '<div class="pc'+(s.reserve?' res':'')+(s.mutiny?' mut':'')+'">'+shipIc(shipClass(s),34)+genB(hullGen(s),hullGen(s)<g-1)+'<b>'+esc(fill(T('hullNo'),{n:s.id}))+'</b>'+
      (s.reserve?'<em>'+ic('reserve',14,C.ark)+esc(T('u_stReserve').toUpperCase())+'</em>':(s.mutiny?'<em>'+ic('mutiny',14,C.red)+esc(T('u_stMutiny').toUpperCase())+'</em>':''))+
      '<div>'+(G.night&&can('reserve')&&!s.mutiny?btn(esc(T(s.reserve?'u_release':'u_reserve')),'reserve',{s:s.id,on:s.reserve?0:1},'','reserve',(!s.reserve&&hullGen(s)<convoyGen(G))?off('convoy_old',{g:roman(convoyGen(G))}):''):'')+
      (s.reserve?'':(arm?'<button class="b red" type="button" data-act="scrap" data-s="'+s.id+'">'+esc(T('u_scrapSure'))+' '+price({metal:v.metal,parts:v.parts,people:s.crew||0},null,11)+'</button>':btn(esc(T('u_scrap')),'scrap',{s:s.id},'','scrap')))+'</div></div>' }).join('')+'</div>':hint(esc(T('u_pierEmpty')));
  return '<div class="win wide">'+head(esc(T('u_tabYard').toUpperCase()),esc(fill(T('u_genPaused'),{g:roman(g)})),ic('tYard',18))+'<div class="bd">'+h+'</div></div>' }

/* ---------- Fleet: every hull and where it is (no pause) ---------- */
function sideFleet(){ var all=G.ships.filter(function(s){ return s.mode!=='dead' });
  var F={all:function(){ return true }, free:function(s){ return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.pend },
    lines:function(s){ return s.mode!=='building'&&!!((s.from&&s.to)||s.pend) }, yards:function(s){ return s.mode==='building' },
    away:function(s){ return s.mode==='missing'||!!s.job||!!s.mutiny }};
  var f=F[U.filter]?U.filter:'all', list=all.filter(F[f]).sort(function(a,b){ return a.id-b.id });
  var seg=['all','free','lines','yards','away'].map(function(k){ return '<button type="button" data-act="filter" data-v="'+k+'" class="'+(f===k?'on':'')+'">'+esc(fill(T('u_fl_'+k),{n:all.filter(F[k]).length}))+'</button>' }).join('');
  var rows=list.map(function(s){ var acts='', wl=s.from||(s.pend&&s.pend.from)||forWorld(s);
    if(F.free(s)&&!s.mutiny&&!s.crewWait&&!s.job) acts=btn(esc(T('u_send')),'pick',{v:'send:'+s.id},'pri','assign');
    else if(s.mode==='missing') acts=btn(esc(T('u_search')),'search',{m:s.id},'','overdue',!bestSearch(s)?off('nofree'):(G.earth.fuel<searchFuel(s)?off('fuel'):''));
    else if(wl&&planet(wl)) acts='<button type="button" class="lnk" data-act="world" data-v="'+wl+'">'+esc(pname(wl))+' →</button>';
    return hullRow(s,acts) }).join('');
  return '<div class="side">'+head(esc(T('u_tabFleet').toUpperCase()),esc(fill(T('u_hullsN'),{n:all.length})).toUpperCase(),ic('tFleet',18))+'<div class="seg wide">'+seg+'</div><div class="lst tall">'+(rows||hint(esc(T('u_none'))))+'</div></div>' }
function searchFuel(m){ var w=m.dest&&m.dest!=='earth'?m.dest:(m.origin&&m.origin!=='earth'?m.origin:m.target), p=w&&planet(w); return p?Math.round(p.dist*K.FUEL_PER_DIST/Math.sqrt(driveSpeed(G))):0 }
function bestSearch(m){ var where=m.dest&&m.dest!=='earth'?m.dest:(m.origin&&m.origin!=='earth'?m.origin:m.target); if(!where||!planet(where)) return null;
  return assignable(where).sort(function(a,b){ return legDays(G,'earth',where,a)-legDays(G,'earth',where,b) })[0]||null }

/* ---------- Worlds: the list, worst first ---------- */
var SEV={dead:0,cut:1,starve:2,noline:3,half:4,dry:5,ok:6,settling:7,free:8};
function sideWorlds(){ var list=PLANETS.filter(function(p){ return secVis(p.sec)&&!(G.ghost&&G.ghost[p.id]) }).map(function(p){ return {p:p,st:wst(p.id)} });
  list.sort(function(a,b){ return SEV[a.st]-SEV[b.st]||a.p.sec-b.p.sec||a.p.ang-b.p.ang });
  var live=Object.keys(G.colonies).length, fr=list.filter(function(x){ return x.st==='free' }).length;
  var rows=list.map(function(x){ var p=x.p, c=G.colonies[p.id], n=c?onLine(G,p.id).length:0, st=x.st, red=SEV[st]<=2, col=red?C.red:((st==='noline'||st==='half'||st==='settling')?C.people:C.mid);
    var icn={dead:'workedout',cut:'cutoff',starve:'starving',noline:'warn',half:'warn',dry:'workedout',settling:'settlers',free:'free'}[st];
    var left=!c?'—':(p.kind==='works'?'—':(isDry(p.id)?'0':seamShort(p.id)));
    return '<button type="button" class="tr'+(red?' red':'')+(st==='free'?' free':'')+'" data-act="world" data-v="'+p.id+'"><span>'+wmark(p.kind,!!c)+'<b>'+esc(pname(p.id))+'</b></span><span>'+(p.sec+1)+'</span><span>'+esc(left)+'</span><span style="color:'+(!c||n?'':C.red)+'">'+(c?n:'—')+'</span><span style="color:'+C.people+'">'+(c?num(c.pop):'—')+'</span><span style="color:'+col+'">'+(icn?ic(icn,14,col):'')+esc(T('u_ws_'+st))+'</span></button>' }).join('');
  return '<div class="side">'+head(esc(T('u_tabWorlds').toUpperCase()),esc(fill(T('u_liveFree'),{l:live,f:fr})).toUpperCase(),ic('tWorlds',18,C.metal))+'<div class="tbl"><div class="th"><span>'+esc(T('u_thWorld'))+'</span><span>'+esc(T('u_thRing'))+'</span><span>'+esc(T('u_thLeft'))+'</span><span>'+esc(T('u_thHulls'))+'</span><span>'+esc(T('people'))+'</span><span>'+esc(T('u_thState'))+'</span></div>'+rows+'</div></div>' }

/* ---------- Tech: the hull generation (the drive programme), the next generation's specs, the rings ---------- */
/* BRIEF: the rule of the drive does not change — the gate is worlds ever settled (4 + 4·l), the programme runs at a works,
   it is fed with the parts of the works (110·2.4^l). A strip of cells is never longer than 12: one cell may stand for several worlds. */
function steps(n,of,col){ var per=Math.max(1,Math.ceil(of/12)), cells=Math.ceil(of/per), full=Math.floor(n/per), part=(n%per)/per, h='<div class="steps">';
  for(var i=0;i<cells;i++){ var bg=i<full?'background:'+col+';border-color:'+col:(i===full&&part?'background:linear-gradient(90deg,'+col+' '+(part*100)+'%,transparent '+(part*100)+'%);border-color:'+col:''); h+='<div class="st" style="'+bg+'"></div>' }
  return h+'</div>'+(per>1?hint(esc(fill(T('u_cellIs'),{k:per,n:Math.min(n,of),m:of}))):'') }
function worksList(){ return Object.keys(G.colonies).filter(function(k){ return planet(k).kind==='works' }) }
function driveHost(){ var ws=worksList(), u=U.driveAt;
  if(u&&ws.indexOf(u)>=0&&G.colonies[u].pop>=K.DRIVE_POP) return u;
  var best=null; ws.forEach(function(k){ if(G.colonies[k].pop>=K.DRIVE_POP&&(!best||G.colonies[k].pop>G.colonies[best].pop)) best=k }); return best }
function startDriveWhy(pid){ if(G.drive) return 'running';
  if(settledCount(G)<driveReachFor(G)) return ['needsettled',{n:driveReachFor(G),r:settledCount(G)}];
  if(!pid) return worksList().length?['nohost',{n:K.DRIVE_POP}]:['nohost',{n:K.DRIVE_POP}];
  return 'ok' }
function sideTech(){ var g=G.gen||0, lvl=G.driveLvl||0, s=settledCount(G), need=driveReachFor(G), work=driveWorkFor(G), h='';
  h+=sec(esc(T('u_hullGen')),roman(g)+' → '+roman(g+1));
  h+='<div class="gnow"><span class="gen big">'+roman(g)+'</span>'+ic('tTech',18,C.mid)+'<span class="gen big nx">'+roman(g+1)+'</span>'+(G.drive?'<span class="gtx">'+esc(fill(T('u_driveAt'),{p:pname(G.drive)}))+'</span>':'')+'</div>';
  h+='<div class="lab">'+esc(fill(T('u_step1'),{n:Math.min(s,need),m:need}))+'</div>'+steps(s,need,C.food);
  var ws=worksList(), have=G.drive?G.driveWork:G.earth.parts+ws.reduce(function(a,k){ return a+(G.colonies[k].store.parts||0) },0);
  h+='<div class="lab">'+esc(fill(T('u_step2'),{n:num(Math.min(have,work)),m:num(work)}))+'</div><div class="bar"><u style="width:'+Math.min(100,Math.round(have/work*100))+'%;background:'+C.parts+'"></u></div>';
  if(ws.length) h+=hint(ws.map(function(k){ var c=G.colonies[k], p=planet(k), wh=worksHungry(k), r=wh.idle>5?0:c.pop*p.rich*K.REFINE*rateMult(c); return ic('works',13,C.parts)+' '+esc(pname(k))+' '+dec(r)+esc(T('u_perYr')) }).join(' · '));
  else h+=hint(esc(T('u_noWorks')));
  if(!G.drive){ var host=driveHost();
    if(ws.length) h+='<div class="lab">'+esc(T('u_runAt'))+'</div><div class="chips">'+ws.map(function(k){ var ok=G.colonies[k].pop>=K.DRIVE_POP, on=k===host;
      return '<button type="button" data-act="driveat" data-v="'+k+'" class="'+(on?'on':'')+'"'+(ok?'':off('pop'))+'>'+ic('works',15,on?'#000':C.parts)+esc(pname(k))+'</button>' }).join('')+'</div>';
    var w=startDriveWhy(host), lbl=(typeof w!=='string'&&w[0]==='needsettled')?fill(T('u_startMore'),{n:need-s}):T('u_start');
    h+=btn(esc(lbl),'drive',{p:host||''},'pri full','tTech',offW(w)) }
  // the next generation
  h+='<div class="lab">'+esc(fill(T('u_genGives'),{g:roman(g+1)}))+'</div><div class="spec"><div class="sh"><span></span><span>'+ic('hold',13,C.mid)+esc(T('u_hold'))+'</span><span>'+ic('speed',13,C.mid)+esc(T('u_speedH'))+'</span><span>'+ic('range',13,C.mid)+esc(T('u_reachH'))+'</span></div>';
  CLASSES.forEach(function(cls,j){ var a=HULLS[currentHull(G,cls)], b=genHull(g+1,j);
    h+='<div class="sr"><span>'+shipIc(cls,30)+'<b>'+esc(T(cls))+'</b></span><span><i>'+num(a.cap)+'</i>'+num(b.cap)+'</span><span><i>'+a.speed.toFixed(2)+'</i>'+b.speed.toFixed(2)+'</span><span><i>'+(hullRange(a)+1)+'</i>'+esc(fill(T('u_ringN'),{n:hullRange(b)+1}))+'</span></div><div class="sp">'+price(hullCost(b),null,12)+'</div>' });
  h+='</div>';
  if(G.night&&can('ark')&&G.arkMark!==null){ var wn=Math.round(wakeAt(G,lvl)*100), wx=Math.round(wakeAt(G,lvl+1)*100); if(wx>wn) h+=hint('<span style="color:'+C.ark+'">'+ic('ark',14,C.ark)+' '+esc(fill(T('u_arkWakeNext'),{a:wn,b:wx}))+'</span>') }
  // rings
  var sn=K.SURVEY_REACH*SECTORS.length, sc=surveyCost(SECTORS.length), sv=canSurvey(G);
  h+=sec(esc(T('u_rings')),esc(fill(T('u_charted'),{n:SECTORS.length})).toUpperCase());
  h+='<div class="gnow"><span class="rnum">'+ic('ring',22,C.food)+esc(fill(T('u_ringNext'),{s:secName(SECTORS.length)}))+'</span><span class="gtx">'+esc(fill(T('u_settledOf'),{n:Math.min(s,sn),m:sn}))+'</span></div>'+steps(s,sn,C.food);
  h+='<div class="prow">'+price(sc,G.earth)+'</div>';
  var sw=sv==='settled'?['needsettled',{n:sn,r:s}]:(sv==='ok'?'ok':shortWhy(sc,G.earth));
  h+=btn(esc(sv==='settled'?fill(T('u_surveyMore'),{n:sn-s}):T('u_survey')),'survey',null,'pri full','survey',offW(sw));
  var lim=sectorLimit(g), beyond=freeWorlds().filter(function(p){ return p.sec>lim }).length;
  if(beyond) h+=hint(esc(fill(T('u_beyond'),{k:beyond,n:lim+1,g:roman(g+1)})));
  return '<div class="side">'+head(esc(T('u_tech').toUpperCase()),'',ic('tTech',18))+'<div class="tbl">'+h+'</div></div>' }

/* ---------- Ark: the Night, the levels, the convoy, the verdict ---------- */
function arkDriveTxt(){ if(arkReady(G)) return [fill(T('u_arkReady'),{g:roman(G.arkMark)}),C.food];
  var f=driveForecast(G,G.arkMark);
  if(f.st==='ok') return [fill(T('u_arkBy'),{g:roman(G.arkMark),y:f.y}),f.y>G.night?C.red:(f.y>G.night-K.NIGHT_NEAR/2?C.people:C.food)];
  if(f.st==='settled') return [fill(T('u_arkNeedW'),{g:roman(G.arkMark),n:f.n,r:f.r}),C.red];
  if(f.st==='host') return [fill(T('u_arkNoHost'),{g:roman(G.arkMark)}),C.red];
  return [fill(T('u_arkStall'),{g:roman(G.arkMark)}),C.red] }
function winArk(){
  if(!G.night) return '<div class="win sm">'+head(esc(T('u_tabArk').toUpperCase()),esc(T('u_timePaused')),ic('ark',18,C.ark))+'<div class="bd"><div class="big mid">'+ic('night',22,C.mid)+esc(T('u_noDate'))+'</div>'+hint(esc(fill(T('u_noDateHint'),{n:K.NIGHT_TRIGGER_SECTORS,y:K.NIGHT_TRIGGER_YEAR})))+'</div></div>';
  var lv=arkLevel(G), top=K.ARK_LEVELS.length, ad=arkDriveTxt(), lvl=G.driveLvl||0, h='';
  h+='<div class="arktop"><div>'+sec(esc(T('u_theNight')))+'<div class="hero" style="color:'+C.red+'">'+G.night+'<span>'+esc(fill(T('u_yearsN'),{n:nightLeft(G)}))+'</span></div>'+
    row(ic('drive',13,C.ark)+esc(T('u_arkDrive')),esc(ad[0]),ad[1])+row(esc(T('u_wake')),arkReady(G)?Math.round(arkWake(G)*100)+'%':'—');
  if(lvl+1>=G.arkMark&&wakeAt(G,lvl+1)>arkWake(G)){ var f2=driveForecast(G,lvl+1); h+=row(esc(fill(T('u_withGen'),{g:roman(lvl+1),y:f2.st==='ok'?'≈ '+f2.y:'—'})),Math.round(wakeAt(G,lvl+1)*100)+'%',C.ark) }
  h+='</div><div>'+sec(esc(T('u_levels')),lv+' / '+top)+'<div class="lv">';
  for(var l=1;l<=top;l++){ var cap=arkCap(l), cls=l<=lv?'paid':(l===lv+1?'next':'');
    h+='<div class="lc '+cls+'"><b>'+roman(l-1)+'</b><span>'+esc(T('u_takesAlong'))+'</span><div class="prow">'+price(cap,null,11)+'</div>';
    if(l<=lv) h+='<em>'+esc(T('u_paid'))+'</em>';
    else { var owed=arkOwed(G,l), w=arkCheck(G,l); if(w==='ok') w=shortWhy(owed,G.earth);
      h+='<span>'+esc(T('u_price'))+'</span><div class="prow">'+price(owed,G.earth,11)+'</div>'+(l===lv+1||(typeof w!=='string'&&w[0]==='ok')?btn(esc(fill(T('u_buyLv'),{l:roman(l-1)})),'arkbuy',{l:l},(typeof w!=='string'&&w[0]==='ok')?'pri':'',null,offW(w)):'') }
    h+='</div>' }
  h+='</div></div></div>';
  var cv=arkConvoy(G), pier=G.ships.filter(function(s){ return convoyHull(G,s) }).sort(function(a,b){ return (b.reserve?1:0)-(a.reserve?1:0)||hullGen(b)-hullGen(a) });
  h+='<div id="convoy">'+sec(esc(fill(T('u_convoy'),{a:cv.need.courier,b:cv.need.hauler,c:cv.need.freighter})),esc(fill(T('u_genPlus'),{g:roman(cv.gen)})).toUpperCase())+'<div class="cv">';
  CLASSES.forEach(function(cls){ var mine=pier.filter(function(s){ return shipClass(s)===cls }); h+='<div class="cg">';
    for(var i=0;i<cv.need[cls];i++){ var s=mine[i]; h+='<div class="slot'+(s?' on':'')+'">'+shipIc(cls,40)+'<span>'+esc(s?T(cls)+' '+roman(hullGen(s))+' '+fill(T('hullNo'),{n:s.id}):T('u_empty').toUpperCase())+'</span></div>' }
    h+='</div>' });
  h+='</div>'+hint(esc(fill(T('u_convoyHint'),{g:roman(cv.gen)})))+btn(esc(T('u_toYard')),'tab',{v:'yard'},'','tYard')+'</div>';
  var short=[]; CLASSES.forEach(function(c){ var d=cv.need[c]-(cv.have[c]||0); if(d>0) short.push(d+' × '+T(c)) });
  var lb=leftBehind(G), souls=arkSouls(G), wk=arkWake(G), stays=lv<1?T('u_vNoLevel'):(!arkReady(G)?fill(T('u_vNoDrive'),{g:roman(G.arkMark)}):(!cv.ok?fill(T('u_vConvoy'),{s:short.join(', ')}):null));
  h+=sec(esc(T('u_ifToday')))+'<div class="verdict'+(stays?'':' ok')+'"><b>'+esc(T(stays?'u_arkStays':'u_arkSails'))+'</b><span>'+esc(stays||fill(T('u_vSails'),{s:num(souls),w:num(Math.floor(souls*wk)),l:num(lb.home+lb.hulls+lb.colonies+lb.transit)}))+'</span><i>'+esc(fill(T('u_vBoard'),{s:num(souls)}))+'</i></div>';
  return '<div class="win wide">'+head(esc(T('u_tabArk').toUpperCase()),esc(T('u_timePaused')),ic('ark',18,C.ark))+'<div class="bd">'+h+'</div></div>' }

/* ---------- the advisor: worlds only, worst first (Nikita 15.10: «не понимаю, что делать») ----------
   A row says the problem in numbers, what follows, and a button that names the fix; the button opens the world with the
   place of the fix lit (a yellow ring that fades in ~3 s). */
function advRows(){ if(!G) return []; var out=[], used=[];   // v4.38: a hull named for one line is not offered to the next
  Object.keys(G.colonies).forEach(function(pid){ var p=planet(pid), c=G.colonies[pid], st=wst(pid), w=pname(pid), dep=p.kind==='works'?'parts':p.dep, going=evacGoing(pid);
    if(going) return;
    if(st==='dead') out.push([C.red,fill(T('u_aDead'),{w:w}),fill(T('u_aDeadC'),{n:num(c.pop)}),pid,T('u_fixEvac'),'evac']);
    else if(st==='cut') out.push([C.red,fill(T('u_aCut'),{w:w}),fill(T('u_aCutC'),{n:num(c.pop)}),pid,T('u_fixSee'),'lift']);
    else if(st==='starve'){ var wh=worksHungry(pid); out.push([C.red,fill(T('u_aStarve'),{w:w,r:T(wh.food<wh.metal?'food':'metal').toLowerCase()}),T('u_aStarveC'),pid,T('u_fixAdd'),'add']) }
    var ll=lastLift(G,pid); if(can('lift')&&ll&&ll.st==='open'&&ll.n<=K.LIFT_WARN) out.push([ll.n<=25?C.red:C.people,fill(T('u_aLift'),{w:w,n:ll.n,y:ll.y}),fill(T('u_aLiftC'),{n:num(c.pop)}),pid,T('u_fixEvac'),'evac']);
    if(st==='noline') out.push([C.people,fill(T('u_aNoLine'),{w:w}),T('u_aNoLineC'),pid,T('u_fixAdd'),'add']);
    else if(st==='half'){ var lr=lineRate(G,pid), hp=lineFix(pid,used);
      out.push([C.people,fill(T('u_aHalf'),{w:w,c:dec(lr.carries),m:dec(lr.makes),r:T(dep).toLowerCase()}),hp?hp[0]:fill(T('u_aHalfC'),{n:num(lr.sitting)}),pid,hp?hp[1]:T('u_fixAdd'),hp?hp[2]:'add']) }
    else if(st==='ok'&&can('fleet')){ var sp=lineSpare(G,pid);   // v4.38: a hull too many — last in the list, grey
      if(sp.length){ var sf=lineFit(G,pid); out.push([C.mid,fill(T('u_aSpare'),{w:w,c:dec(sf.carries),m:dec(sf.need),r:T(dep).toLowerCase()}),sp.length>1?fill(T('u_aSpareN'),{n:sp.length,h:hname(sp[0])}):fill(T('u_aSpareC'),{h:hname(sp[0])}),pid,T('u_fixHull'),'hr:'+sp[0].id]) } }
    else if(st==='dry') out.push([C.people,fill(T('u_aDry'),{w:w,n:num(pileLeft(G,pid)),r:T(dep).toLowerCase()}),T('u_aDryC'),pid,T('u_fixSee'),'add']);
    if(can('machines')&&c.kit&&lineHold(G,pid)<c.kit.w) out.push([C.people,fill(T('u_aKit'),{w:w,t:roman(c.kit.tier-1),n:num(c.kit.w),h:num(lineHold(G,pid))}),T('u_aKitC'),pid,T('u_fixOrder'),'ord']);
    if(can('machines')&&kitTier(c)>0&&!kitLive(c)) out.push([C.people,fill(T('u_aKitFuel'),{w:w}),T('u_aKitFuelC'),pid,T('u_fixSee'),'mach']);
  });
  var rk=function(r){ return r[0]===C.red?0:r[0]===C.mid?2:1 };
  return out.sort(function(a,b){ return rk(a)-rk(b) }) }
/* v4.38 (Nikita, 19.10, option A): the one fix for a line that falls behind — a free hull, a spare one off another line,
   or the smallest new hull that closes the gap: [what to do, button, focus], or null when the hulls coming close it */
function lineFix(pid,used){ var h=lineHelp(G,pid,{noMove:!can('fleet'),cls:clsSeen,used:used}); if(!h) return null; if(h.sid!=null) used.push(h.sid);
  var d={a:dec(h.add),g:dec(h.gap)}, s=h.sid!=null?shipById(G,h.sid):null;
  if(h.kind==='free'){ d.h=hname(s); return [fill(T('u_aFixFree'),d),T('u_assign'),'free:'+s.id] }
  if(h.kind==='move'){ d.h=hname(s); d.p=pname(h.from); return [fill(T('u_aFixMove'),d),T('u_moveHere'),'other:'+s.id] }
  d.h=T(h.cls)+' '+roman(HULLS[h.hull].gen); return [fill(T('u_aFixBuild'),d),T('u_fixOrder'),can('order')?'oc:'+h.cls:'add'] }
function popAdv(){ var a=advRows();
  return '<div class="advl">'+(a.length?a.map(function(r){ return '<button type="button" data-act="world" data-v="'+r[3]+'" data-f="'+r[5]+'"><i style="background:'+r[0]+'"></i><b>'+esc(r[1])+'</b><span>'+esc(r[2])+'</span><em>'+esc(r[4])+' →</em></button>' }).join(''):'<div class="none">'+esc(T('u_advNone'))+'</div>')+'</div>' }
function popMenu(){
  return '<div class="menu"><button type="button" data-act="lang">'+ic('tWorlds',15)+esc(T('u_mLang'))+' <b>'+(U.lang==='en'?'EN':'RU')+'</b> · '+(U.lang==='en'?'RU':'EN')+'</button>'+
    '<button type="button" data-act="sfx">'+ic('speed',15)+esc(T('u_mSound'))+' <b>'+esc(T(SFX.isOn()?'u_on':'u_off'))+'</b></button>'+
    '<button type="button" data-act="help">'+ic('peopleA',15)+esc(T('u_mHelp'))+' <b>'+esc(T(U.tut.help?'u_on':'u_off'))+'</b></button><hr>'+
    '<button type="button" data-act="save">'+ic('unloading',15)+esc(T('u_mSave'))+'</button><button type="button" data-act="load">'+ic('loading',15)+esc(T('u_mLoad'))+'</button>'+
    '<button type="button" data-act="export">'+ic('unloading',15)+esc(T('u_mExport'))+'</button>'+
    (textsVisible()?'<button type="button" data-act="texts">'+ic('loading',15)+esc(T('textsReload'))+'</button>':'')+'<hr>'+
    '<div class="seedrow">'+esc(T('seed'))+' <input id="seedin" value="'+G.seed+'"></div><button type="button" data-act="new">'+ic('free',15)+esc(T('newGame'))+'</button></div>' }

/* ---------- the main menu (work/menu.js, v4.40): in front of a new run whose clock stands; its terminal tells the start ---------- */
var LANG_KEY='lb.lang';
/* the menu speaks the language of the save on record, else the one chosen here last time, else the browser's */
function menuLang(){ var l=null; try{ l=localStorage.getItem(LANG_KEY) }catch(e){} if(U.saveLang&&U.saveDay!==null) return U.saveLang; if(l==='en'||l==='ru') return l;
  return /^ru\b/i.test((navigator.language||'')+'')?'ru':'en' }
function menuOpen(){ U.menu=true; draw();
  LBMENU.open({T:function(k,p){ return T(k,p) }, v:VERSION.v, lang:function(){ return U.lang },
    save:function(){ return U.saveDay!==null&&U.saveDay!==undefined?{y:U.saveDay,w:U.saveWorlds||0}:null },
    sound:function(){ return SFX.isOn() }, setSound:function(on){ SFX.set(on) },
    setLang:function(l){ U.lang=l; try{ localStorage.setItem(LANG_KEY,l) }catch(e){} draw() },
    cont:function(){ U.langPicked=true; if(loadAuto()) return true; U.langPicked=false; return T('mn_contFail') },
    load:function(){ el('loadin').click() },
    newRun:function(){ U.langPicked=true; act(G,'menu',{go:'new'}) },
    test:function(){ U.langPicked=true; tutMute(); act(G,'menu',{go:'test'}) },
    closed:function(){ U.menu=false; draw() }}) }

/* ---------- save and load: a file, and the last autosave in this browser ---------- */
var SAVE_KEY='lb.save';
function dump(){ return JSON.stringify({v:1,G:G,SECTORS:SECTORS,PLANETS:PLANETS,HULLS:HULLS,U:{hist:U.hist,voiceSeq:U.voiceSeq,voiceLast:U.voiceLast,voy:U.voy,capt:U.capt,founded:U.founded,shiftStop:U.shiftStop,speed:U.speed,lang:U.lang,tut:tutSave()}},
  function(k,v){ if(k==='rnd') return undefined; if(v===Infinity) return '__inf'; if(v===-Infinity) return '__-inf'; return v }) }
function undump(t){ var o=JSON.parse(t,function(k,v){ return v==='__inf'?Infinity:(v==='__-inf'?-Infinity:v) });
  if(!o||!o.G||!o.SECTORS) throw new Error('not a save');
  SECTORS.length=0; o.SECTORS.forEach(function(x){ SECTORS.push(x) }); PLANETS.length=0; o.PLANETS.forEach(function(x){ PLANETS.push(x) }); HULLS.length=0; o.HULLS.forEach(function(x){ HULLS.push(x) });
  G=o.G; G.rnd=mulberry32((G.seed^0x51ED27)+G.day*131);   // the dice after a load are not the original ones
  var u=o.U||{}; if(!U.langPicked&&u.lang) U.lang=u.lang; ['hist','voiceSeq','voiceLast','voy','capt','founded','shiftStop','speed'].forEach(function(k){ if(u[k]!==undefined) U[k]=u[k] });
  tutLoad(u.tut);
  U.win=null; U.tab=null; U.pop=null; U.notes=[]; U.pf=null; U.paused=true; U.acc=0; U.gk=G; U.noFreeAt=SECTORS.length; U.ringNoted=undefined; U.foodWarnAt=null; U.worksSeen=true; U.who={}; U.driveAt=null; U.focusK=null; U.scrapArm=null; lineWhy={}; U.langPicked=true; HTMLCACHE={};
  VFIT=true; VSECS=-1; POSN=-1; window.LN=G; draw() }
function autosave(){ try{ localStorage.setItem(SAVE_KEY,dump()) }catch(e){} }
function loadAuto(){ var t0=null; try{ t0=localStorage.getItem(SAVE_KEY) }catch(e){} if(!t0) return false;
  try{ undump(t0); say('ok_loadgame',{y:G.day}); return true }catch(e){ say('loadfail'); return false } }
function saveFile(){ var data=dump(), name='last-berth-'+G.seed+'-y'+G.day+'.json';
  try{ var b=new Blob([data],{type:'application/json'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(u) },500); say('ok_savegame') }catch(e){ say('savefail') } }
el('loadin').addEventListener('change',function(){ var f=this.files&&this.files[0]; if(!f) return; var r=new FileReader();
  r.onload=function(){ var fromMenu=U.menu; if(fromMenu) U.langPicked=true;
    try{ undump(String(r.result)); say('ok_loadgame',{y:G.day}); if(fromMenu) LBMENU.fadeOut() }catch(e){ if(fromMenu){ U.langPicked=false; LBMENU.note(whyText('loadfail')) } say('loadfail') } }; r.readAsText(f); this.value='' });

/* ---------- run log ---------- */
function showLog(){ act(G,'export',{}); el('logtxt').value=exportLog(G); el('loghead').textContent=T('runLog'); el('b-savelog').textContent=T('saveBtn'); el('b-copylog').textContent=T('copyBtn'); el('b-closelog').textContent=T('closeBtn'); el('logbox').hidden=false; el('logtxt').focus(); el('logtxt').select() }
/* v4.11 (Nikita, 28.09: 'экспорт JSON-файла'): the page asks the viewer to save the file; where the runtime is absent it falls back to a blob link */
function saveLog(){ var data=exportLog(G), name='last-berth-'+G.seed+'-'+G.day+'.json';
  var api=(window.claude&&window.claude.use)?window.claude.use('downloads'):Promise.resolve(null);
  api.then(function(dl){
    if(dl&&dl.save){ return dl.save({filename:name,data:data}).then(function(){ say('saved') },function(e){ if(!(e&&e.code==='declined')) say('savefail') }) }
    try{ var b=new Blob([data],{type:'application/json'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(u) },500); say('saved') }catch(e){ say('savefail') } }) }
function copyLog(){ var ta=el('logtxt'); ta.focus(); ta.select(); var done=false;
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(ta.value).then(function(){ say('copied') },function(){ say('copyfail') }); done=true } }catch(e){}
  if(!done){ try{ done=document.execCommand('copy') }catch(e){} say(done?'copied':'copyfail') } }

/* ---------- skip: the clock runs on until something wants the desk ---------- */
function skipAhead(){ if(modal()||tutHold()||G.over) return; if(winPause()) U.win=null; var t0=performance.now(), d0=G.day;
  for(var i=0;i<500&&!G.over;i++){ tick(G);
    if(G.shiftOpen){ if(!U.shiftStop) G.shiftOpen=false; else break }
    if(G.night&&!G.nightSeen) break;
    if(G.pauseNow){ G.pauseNow=false; toastLast(); break }
    if(tutWants()) break;   // v4.36: she has something to say
    if(performance.now()-t0>1500) break }
  act(G,'skip',{from:d0,to:G.day}); U.paused=true; toast(esc(fill(T('u_skipped'),{n:G.day-d0,y:G.day})),'',4000); autosave(); draw() }

/* ---------- presses ---------- */
/* v4.35 (reviewer): setLine puts the hull on the line and then sails it — no fuel or crew keeps her at the pier on the line, which is not a refusal */
var lineWhy={};
function lineRes(res,sid,pid){ var s=shipById(G,sid); if((res==='fuel'||res==='crew')&&s&&s.from===pid){ lineWhy[sid]=res; return 'ok' } delete lineWhy[sid]; return res }
function lineWait(sid){ return lineWhy[sid]?whyText(lineWhy[sid]):'' }
function resLeft(sid){ toast(esc(fill(T('u_resLeft'),{n:sid})),'warn',6000,false) }
function doAct(a,b){
  var d=b.dataset, res=null, okc=null, okp=null, v=d.v;
  if(a==='tab'){ U.pop=null; U.scrapArm=null; if(v==='worlds'||v==='tech'||v==='fleet'){ U.tab=U.tab===v?null:v; U.win=null } else U.win=U.win===v?null:v; SFX.play('tab') }
  else if(a==='world'){ openWorld(v,d.f) }
  else if(a==='step'){ var O=stepOrder(U.win), i=O.indexOf(U.win); if(O.length) U.win=O[(i+(+v)+O.length)%O.length]; U.scrapArm=null }
  else if(a==='pop'){ U.pop=(U.pop===v||!v)?null:v; U.scrapArm=null }
  else if(a==='spd'){ if(v==='0') U.paused=!U.paused; else { U.speed=+v; U.paused=false; act(G,'speed',{x:U.speed}) } }
  else if(a==='skip') { skipAhead(); return }
  else if(a==='zoom'){ if(v==='fit'){ VFIT=true; viewFit() } else viewZoom(v==='in'?0.75:1.35) }
  else if(a==='addtab') U.addTab=v;
  else if(a==='filter') U.filter=v;
  else if(a==='who') U.who[d.p]=+d.s;
  else if(a==='assign'){ var wr=(shipById(G,+d.s)||{}).reserve; res=setLine(G,+d.s,d.p,'earth'); act(G,'line',{p:d.p,hull:+d.s},res); okc='ok_assign'; okp={n:+d.s,p:pname(d.p)}; res=lineRes(res,+d.s,d.p); if(res==='ok'&&lineWait(+d.s)){ okc='ok_assignWait'; okp.w=lineWait(+d.s) } if(wr&&res==='ok') resLeft(+d.s) }
  else if(a==='move'){ res=moveLine(G,+d.s,d.p); act(G,'move',{p:d.p,hull:+d.s},res); okc='ok_assign'; okp={n:+d.s,p:pname(d.p)}; if(res==='queued'){ res='ok'; okc='ok_moveDock' } }
  else if(a==='unroute'){ res=clearLine(G,+d.s); act(G,'release',{hull:+d.s},res); okc='ok_release' }
  else if(a==='pick'){ U.pop='pick:'+v }
  else if(a==='pickgo'){ var pk=v.split(':'), sid=+pk[1], pid=pk[2]; U.pop=null;
    if(pk[0]==='move'){ res=moveLine(G,sid,pid); act(G,'move',{p:pid,hull:sid},res); okc='ok_assign'; okp={n:sid,p:pname(pid)}; if(res==='queued'){ res='ok'; okc='ok_moveDock' } }
    else { var wr2=(shipById(G,sid)||{}).reserve; res=setLine(G,sid,pid,'earth'); act(G,'line',{p:pid,hull:sid},res); okc='ok_assign'; okp={n:sid,p:pname(pid)}; res=lineRes(res,sid,pid); if(res==='ok'&&lineWait(sid)){ okc='ok_assignWait'; okp.w=lineWait(sid) } if(wr2&&res==='ok') resLeft(sid) } }
  else if(a==='order'){ res=orderFor(G,d.p,d.c); act(G,'order',{p:d.p,c:d.c},res); if(res==='ok'){ var oh=HULLS[currentHull(G,d.c)]; okc='ok_order'; okp={p:pname(d.p),c:hullName(oh),y:oh.days} } }
  else if(a==='build'){ var bh=HULLS[+d.h]; res=buildShip(G,+d.h); act(G,'build',{hull:bh.key,gen:bh.gen},res); okc='ok_build'; okp={n:G.nextShip-1,h:hullName(bh),y:bh.days} }
  else if(a==='reserve'){ var ron=d.on==='1'; res=setReserve(G,+d.s,ron); act(G,'reserve',{hull:+d.s,on:ron},res); okc=ron?'ok_reserve':'ok_unreserve'; okp={n:+d.s} }
  else if(a==='scrap'){ var sid2=+d.s; if(U.scrapArm!==sid2){ U.scrapArm=sid2 } else { U.scrapArm=null; res=scrap(G,sid2); act(G,'scrap',{hull:sid2},res); okc='ok_scrap' } }
  else if(a==='evac'){ var ep=d.p, ec=pickCourier(ep), ecol=G.colonies[ep];
    if(!ec){ say('evacNoCourier',{p:pname(ep),w:evacW(ep)}); act(G,'evacuate',{p:ep},'evacNoHull'); draw(); return }
    res=abandon(G,ec.id,ep); act(G,'evacuate',{p:ep,hull:ec.id},res);
    if(res==='ok'&&ecol&&ec.cap<Math.floor(ecol.pop)){ okc='ok_evac_short'; okp={n:hullName(HULLS[ec.hull]),p:pname(ep),c:ec.cap,l:Math.floor(ecol.pop)-ec.cap} } else { okc='ok_evac'; okp={p:pname(ep)} } }
  else if(a==='kit'){ var kct=kitCost(G.colonies[d.p]||{}).tier; res=orderKit(G,d.p); act(G,'kit',{p:d.p,t:kct},res); okc='ok_kit'; okp={p:pname(d.p),t:roman(kct-1)} }
  else if(a==='send'){ var sp=d.p, ss=shipById(G,U.who[sp]); if(!ss){ res='nofree' } else { var np=foundParty(G,ss,sp), wasRes=ss.reserve; res=colonize(G,ss.id,sp,np,0); if(res==='ok'&&wasRes){ setReserve(G,ss.id,false); resLeft(ss.id) } act(G,'colonize',{p:sp,hull:ss.id,people:np},res); okc='ok_found'; okp={p:pname(sp),n:np} } }
  else if(a==='driveat') U.driveAt=v;
  else if(a==='drive'){ var dp=d.p||driveHost(); res=startDrive(G,dp); act(G,'drive',{p:dp,mark:(G.driveLvl||0)+1},res); okc='ok_drive'; okp={p:pname(dp)} }
  else if(a==='survey'){ var nsec=secName(SECTORS.length); res=survey(G); act(G,'survey',{sector:SECTORS.length},res); okc='ok_survey'; okp={s:nsec} }
  else if(a==='arkbuy'){ res=arkBuy(G,+d.l); act(G,'arkbuy',{l:+d.l},res); okc='ok_arkbuy'; okp={n:roman(+d.l-1)}; if(res==='metal'||res==='parts'||res==='food'||res==='fuel'){ var sw=shortWhy(arkOwed(G,+d.l),G.earth); say(sw[0],sw[1]); draw(); return } }
  else if(a==='search'){ var m=shipById(G,+d.m), hs=m?bestSearch(m):null; res=hs?search(G,hs.id,+d.m):'nofree'; act(G,'search',{m:+d.m},res); okc='ok_search'; okp={n:+d.m} }
  else if(a==='nightok'){ G.nightSeen=true }
  else if(a==='shiftok'){ var cb=el('shstop'); if(cb) U.shiftStop=cb.checked; G.shiftOpen=false; act(G,'shift_go',{stop:U.shiftStop}); autosave() }
  else if(a==='noteok') U.notes.shift();
  else if(a==='notego'){ U.notes.shift(); U.win=null; U.tab=v||null }
  else if(a==='pfok') U.pf=null;
  else if(a==='export'){ U.pop=null; showLog(); draw(); return }
  else if(a==='savelog'){ saveLog(); return }
  else if(a==='copylog'){ copyLog(); return }
  else if(a==='closelog'){ el('logbox').hidden=true }
  else if(a==='lang'){ U.lang=U.lang==='en'?'ru':'en' }
  else if(a==='sfx'){ SFX.set(!SFX.isOn()); if(SFX.isOn()) SFX.play('ok') }
  else if(a==='help'){ if(U.tut.help) tutOff(); else tutOn() }
  else if(a==='save'){ U.pop=null; autosave(); saveFile() }
  else if(a==='load'){ U.pop=null; el('loadin').click() }
  else if(a==='loadauto'){ loadAuto(); return }
  else if(a==='texts'){ reloadTexts(); return }
  else if(a==='new'){ var sv=el('seedin'); start(sv?(parseInt(sv.value,10)||0):0); return }
  if(res) say(res==='ok'?(okc||'ok'):(res==='queued'?'queued':res), res==='ok'?okp:null);
  tutAct(a,v,res); draw() }
document.addEventListener('click',function(ev){
  if(MAPDRAGGED){ MAPDRAGGED=false; return }
  var t=ev.target; if(!t.closest) return;
  if(G&&tutClick(ev)) return;
  var hitb=t.closest('button,[data-act],#map .wd');
  if(hitb&&hitb.getAttribute('aria-disabled')==='true'){
    var wp=null; try{ wp=hitb.dataset.whyp?JSON.parse(hitb.dataset.whyp):null }catch(e){}
    pressFx(ev.clientX,ev.clientY,'bad'); say(hitb.dataset.why||'off',wp); hitb.classList.remove('shake'); void hitb.offsetWidth; hitb.classList.add('shake'); return }
  if(hitb&&hitb.tagName==='BUTTON'){ if(!hitb.classList.contains('tab')) SFX.play('click'); pressFx(ev.clientX,ev.clientY) }
  var lb=t.closest('[data-lang]');
  if(lb){ U.lang=lb.dataset.lang; U.langPicked=true; draw(); return }
  var g=t.closest('#map .wd[data-p]'); if(g){ try{ window.getSelection().removeAllRanges() }catch(e){} openWorld(g.dataset.p); SFX.play('click'); tutAct('world',g.dataset.p); draw(); return }
  var b=t.closest('[data-act]');
  if(b&&b.dataset.act!=='pop'&&U.pop&&!b.closest('#pop')&&b.dataset.act!=='tab'&&b.dataset.act!=='world'){ U.pop=null }
  if(!b){
    if(U.pop&&!t.closest('#pop .advl,#pop .menu,#pop .pick')){ U.pop=null; U.scrapArm=null; draw(); return }
    if(t.id==='ovl'&&U.win&&!winPause()){ U.win=null; U.scrapArm=null; draw(); return }
    if(U.scrapArm&&!t.closest('.pc')){ U.scrapArm=null; draw() }
    return }
  doAct(b.dataset.act,b) });
document.addEventListener('keydown',function(e){
  if(!G||e.target.tagName==='INPUT') return;
  if(tutKey(e)) return;
  var k=bigKind();
  if(k==='shift'&&(e.code==='Space'||e.key==='Enter')){ e.preventDefault(); var cb=el('shstop'); if(cb) U.shiftStop=cb.checked; G.shiftOpen=false; draw(); return }
  if(k==='note'&&e.key==='Enter'){ e.preventDefault(); U.notes.shift(); draw(); return }
  if(k) return;
  if(e.key==='Escape'){ if(U.pop) U.pop=null; else if(U.win&&!winPause()) U.win=null; else if(U.win) U.win=null; else if(U.tab) U.tab=null; draw(); return }
  if(U.win&&planet(U.win)&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){ var O=stepOrder(U.win), i=O.indexOf(U.win); U.win=O[(i+(e.key==='ArrowLeft'?-1:1)+O.length)%O.length]; draw(); return }
  if(e.code==='Space'){ e.preventDefault(); U.paused=!U.paused; draw() }
  var sp={'1':1,'2':2,'3':4,'4':10}[e.key]; if(sp){ U.speed=sp; U.paused=false; draw() } });
document.addEventListener('mouseover',function(e){ var g=e.target.closest&&e.target.closest('#map .wd[data-p]'); drawTip(g) });

/* ---------- the map is pannable and zoomable ---------- */
(function(){
  var m=el('map');
  m.addEventListener('wheel',function(e){ e.preventDefault(); var pt=viewPt(e); viewZoom(e.deltaY>0?1.12:0.89,pt.x,pt.y); drawMap(); tutPlace() },{passive:false});
  /* No setPointerCapture: capturing on the <svg> retargets the following click to the <svg> itself and worlds stop being
     clickable (Nikita, 22.09: «не могу играть»). Move and up live on window, so a drag that leaves the map ends cleanly. */
  var drag=null;
  m.addEventListener('pointerdown',function(e){ if(e.button!==0) return; drag={x:e.clientX,y:e.clientY,vx:VIEW.x,vy:VIEW.y,moved:false,sc:viewPt(e).sc} });
  window.addEventListener('pointermove',function(e){ if(!drag) return; var dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<5) return; drag.moved=true; m.classList.add('drag'); VFIT=false;
    VIEW.x=drag.vx-dx/drag.sc; VIEW.y=drag.vy-dy/drag.sc; drawMap(); tutPlace() });
  function end(){ if(!drag) return; if(drag.moved) MAPDRAGGED=true; drag=null; m.classList.remove('drag') }
  window.addEventListener('pointerup',end); window.addEventListener('pointercancel',end);
})();
/* desktop first (Nikita 16.10): below 1180×700 the whole desk is scaled down, nothing reflows */
function fit(){ var a=el('app'), w=window.innerWidth, h=window.innerHeight, z=Math.min(1,w/1180,h/700);
  a.dataset.z=z; a.style.transform=z<1?'scale('+z+')':''; a.style.width=(w/z)+'px'; a.style.height=(h/z)+'px' }
window.addEventListener('resize',function(){ fit(); if(G){ drawMap(); tutPlace() } });

/* ---------- loop ---------- */
/* v4.31 (Nikita, 13.10, F-45: '4x too fast'): 1x 1.5 s, 2x 1.0 s, 4x 0.6 s, 10x 0.2 s a year */
var MS={1:1500,2:1000,4:600,10:200};
function frame(ts){
  if(!U.last) U.last=ts;
  var dt=ts-U.last; U.last=ts;
  if(G&&!halted()&&!G.over){
    U.acc+=dt; var step=MS[U.speed]||600, did=false;
    try{
      while(U.acc>=step){ U.acc-=step; tick(G); did=true;
        if(G.shiftOpen){ if(!U.shiftStop||U.ff) G.shiftOpen=false; else { SFX.play('info'); U.acc=0; autosave(); break } }
        if(G.night&&!G.nightSeen){ SFX.play('crit'); U.acc=0; break }
        if(G.pauseNow){ G.pauseNow=false; toastLast() }
        foodWatch();
        if(G.day%20===0) autosave();
        if(G.over) break }
      if(did) draw();
    }catch(e){
      // never let one bad tick kill the clock: pause, tell the player, keep the loop alive
      U.paused=true; U.acc=0;
      try{ log(G,'crash',{msg:String(e&&e.message||e),day:G.day}); act(G,'CRASH',{msg:String(e&&e.message||e)}) }catch(_){}
      try{ toast(esc(fill(T('crashToast'),{msg:String(e&&e.message||e)})),'bad',15000) }catch(_){}
      try{ draw() }catch(_){}
    }
  } else U.acc=0;
  requestAnimationFrame(frame);
}
/* everything open, no voices, no helper: the scenarios' hook and the menu's Test play */
function tutMute(){ TUTX.off=true; TUTX.story=false; clearTimeout(NART); var t=U.tut; t.nar=null; t.q=[]; t.msg=null; if(t.lock){ G.safe=false; t.lock=false; tutOpenAll() } t.help=false; draw() }
function start(seed){
  if(!TUTX.hook){ TUTX.off=false; TUTX.story=true }   // a new game: the helper and the voices again (Test play muted only its own run)
  G=newGame(seed||undefined); tutNew();
  U.win=null; U.tab=null; U.pop=null; U.paused=true; U.acc=0; U.hist=[]; U.pf=null; U.voiceSeq=0; U.voiceLast=0; U.voy={}; U.capt={}; U.founded=0; U.notes=[]; U.who={}; U.scrapArm=null; U.gk=null; U.driveAt=null; U.foodWarnAt=null; U.worksSeen=false; U.focusK=null; lineWhy={}; HTMLCACHE={};
  VFIT=true; VSECS=-1; POSN=-1; viewFit();
  window.LN=G; window.LNU=U; window.LNdraw=draw;   // dev hooks for the Playwright scenarios
  window.LNsave=dump; window.LNload=undump; window.LNI={halted:halted,big:bigKind,adv:advRows,wst:wst,flags:flags,tut:tutState,hname:hname};   // v4.35: what the interface derives, for the scenarios and the bot player
  window.LNtut={off:function(){ TUTX.hook=true; LBMENU.close(); tutMute() }};   // v4.36: the scenarios' hook «всё открыто»: no voices, no helper; v4.40: and no main menu — the language window stands instead
  draw();
}
(function(){ U.saveDay=null; try{ var t0=localStorage.getItem(SAVE_KEY); if(t0){ var m=/"G":\{"seed":-?\d+,"day":(\d+)/.exec(t0); if(m) U.saveDay=+m[1]; var lg=/"lang":"(en|ru)"/.exec(t0); U.saveLang=lg?lg[1]:'en';
  try{ var o=JSON.parse(t0); U.saveWorlds=Object.keys((o.G&&o.G.colonies)||{}).length }catch(e){ U.saveWorlds=0 } } }catch(e){}
  U.lang=menuLang() })();
fit();
start();
menuOpen();
requestAnimationFrame(frame);
})();
