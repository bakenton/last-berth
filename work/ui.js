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
 quota_miss:'bd',ship_missing:'bd',colony_failed:'bd',ship_written_off:'bd',depleted:'hi',works_idle:'hi',starved:'bd',earth_short:'bd',ev_rich:'gd',ev_seam:'gd',ev_short:'bd',mutiny:'bd',ev_wreck:'bd',ev_disaster:'bd',doomsday:'ch',dropped:'dim',drive_started:'gd',drive_lost:'bd',hub_lost:'bd',fragment:'hi',order_sent:'hi'};

var KIND={mine:'kMine',farm:'kFarm',well:'kWell',works:'kWorks'};
var RES=['metal','food','fuel','parts','people'];
/* v3.7 (Nikita, 23.09): a world is drawn in the colour of what it gives — the same colour its resource has everywhere else */
var C={metal:'#C9CFD6',food:'#3DDC84',fuel:'#FF8A1F',parts:'#5B82F0',people:'#FFD23F',red:'#FF2A1A',ark:'#B48CFF',earth:'#4FA3FF',ink:'#F2F1EC',mid:'#9C9B95',dim:'#5E5D58',bg:'#0B0B0C'};
var KCOL={mine:C.metal,farm:C.food,well:C.fuel,works:C.parts};   // v5.04 (Nikita 06.11, 3D-map drafts): parts are blue (#5B82F0, the gear), metal stays light grey — a works and a mine were the same white
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
 hub:gp('M12 2.5 L20.2 7.25 V16.75 L12 21.5 L3.8 16.75 V7.25 Z')+fp('M12 12 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0'),
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
var U={tut:tutBlank(), hist:[], wtab:'world', ttab:'over', lang:'en', langPicked:false, menu:false, speed:2, paused:false, acc:0, last:0, ff:false, shiftStop:true,
  tab:null, win:null, pop:null, filter:'all', addTab:'free', who:{}, scrapArm:null, focus:null, notes:[], ovlOff:false};
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
  var d={}; for(var q in e.d) d[q]=e.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p); if(typeof d.h==='string'&&planet(d.h)) d.h=pname(d.h); if(e.code==='drive_mark'&&typeof d.n==='number') d.n=roman(d.n-1);
  ['s','b','w','h'].forEach(function(k){ if(typeof d[k]==='number'&&Math.abs(d[k])>=1000) d[k]=num(d[k]) });   // v4.42: head counts as on the end window («4 151», not «4151»); years stay as they are
  if(d.dep) d.dep=DEP[U.lang][d.dep]||d.dep; if(d.lobe!==undefined) d.lobe=T('lobe'+d.lobe); if(d.g!==undefined) d.g=roman(d.g); if(d.t!==undefined&&String(e.code).slice(0,4)==='kit_') d.t=roman(d.t-1);
  if(e.code==='exchange'){ d.r=T(d.r); d.a=T(d.a); d.b=T(d.b); d.n=num(d.n); d.x=num(d.x); d.y=num(d.y) }   // nodes-1.02
  if(e.code==='voice'){ var v=voiceLine(e); return v.who+' '+v.name+': '+v.line }
  return fill(tpl,d) }
function toastLast(){ toastOne(G.log[G.log.length-1]) }
function toastOne(e){ if(!e) return;
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
    if(!o.force&&U.pf) return;
    U.voiceLast=G.day;
    /* Nikita, 26.10 («занимают пол-экрана… появлялось только в своём месте»): a quiet word is a strip in its own corner, every word stays in the archive */
    G.letters=G.letters||[]; var L0={id:G.letters.length+1,k:k,role:role,name:name,no:no,d:d||{},seed:seed,sub:o.sub||'',day:G.day,read:!!o.force}; G.letters.push(L0);
    if(o.force) U.pf=L0; else { U.strips=(U.strips||[]).concat([{id:L0.id,until:Date.now()+STRIP_MS}]).slice(-STRIPS); setTimeout(function(){ if(G) drawPF() },STRIP_MS+50) }
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
    if(e.code==='hub_lost') toastOne(e);   // v5.02: the feeders' lines went back to Earth — the player has to see it
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
    else if(NOTE_CODES[e.code]&&!U.ff){ var nd={}; for(var nq in d) nd[nq]=d[nq]; if(nd.p&&planet(nd.p)) nd.p=pname(nd.p); if(e.code==='drive_mark'&&typeof nd.n==='number') nd.n=roman(nd.n-1);   // v4.42: «GENERATION II», as in the title — was «GENERATION 2»
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

/* ---------- the chart in 3D (v5.05, Nikita 06.11: «каркас», «переноси в игру» — design/map3d/e-hybrid.html v3) ----------
   A canvas (#map3d) under the SVG (#map): space, a floor of hex plates with the rings and the lobes on it, the lines foot to foot, the hulls,
   the worlds on stems (height = people) with wire spheres. The SVG on top keeps what the player clicks and reads: one .wd per world at its
   sphere, its name and its people, its alarms — the tip, the tutorial's cut-outs and the scenarios find the worlds where they always did.
   Plane: X right, Z toward the viewer (the old chart's y), Y up; Earth at 0. A world stands on a circle of its ring at its angle, pushed
   apart at POS_GAP (v4.35). The camera: a target on the plane, yaw, pitch (90° = straight down), distance; it fits the visible rings by itself
   until the player turns, moves or zooms it (− + ALL: ALL fits again). */
var CAM={tx:0,tz:0,yaw:0,pitch:52,dist:1700,fov:38}, CFIT=true, CFITK='', MAPDRAGGED=false;
var M3D={W:1,H:1,VP:null,dpr:1,fk:'',ok:'',HX:null,HXR:0,LAY:null,NEB:null,last:0,dirty:true};
var P3={}, P3N=-1, POS_GAP=28, H0=14, HK=1.0, HSTEM=60, RS=11, RF=8, HEXR=46, HUBC='#E040FB', PARTS_BODY='#2F5BD3';
function p3(p){ if(P3N!==PLANETS.length||!P3[p.id]) layout3(); return P3[p.id] }
function layout3(){ var Ls=PLANETS.map(function(q){ var R=SECTORS[q.sec].r; return {id:q.id,x:Math.cos(q.ang)*R,z:Math.sin(q.ang)*R} });
  for(var it=0;it<40;it++){ var moved=false;
    for(var i=0;i<Ls.length;i++) for(var j=i+1;j<Ls.length;j++){ var a=Ls[i], b=Ls[j], dx=b.x-a.x, dz=b.z-a.z, d=Math.hypot(dx,dz)||0.01;
      if(d<POS_GAP){ var k=(POS_GAP-d)/2/d; a.x-=dx*k; a.z-=dz*k; b.x+=dx*k; b.z+=dz*k; moved=true } }
    if(!moved) break }
  P3={}; Ls.forEach(function(o){ P3[o.id]={x:o.x,z:o.z} }); P3N=PLANETS.length }
/* v5.17 (Nikita 12.11: «вместо населения возле имени планеты писать процентаж жилы и чтобы цвет менялся»): what is left of the seam it was born with */
function seamLeftP(q){ var r=G.reserves[q.id]; return (q.kind==='works'||!q.res0||r===Infinity)?null:Math.max(0,Math.min(100,Math.round(r/q.res0*100))) }
function seamPct(q){ var v=seamLeftP(q); return v===null?'':' '+v+'%' }
function seamCol(q){ var v=seamLeftP(q); return v>=50?C.food:v>=20?C.people:v>0?C.red:C.mid }
/* v5.19 (Nikita 12.11: «кол-во людей на планете вообще погоды не делает» → «ровные»): every settled world stands on a stem of one height; a free one lies low over its footprint */
function wH(pid){ var c=G.colonies[pid]; return c?H0+HSTEM*HK+RS:RF }
function node3(n){ if(!n) return null; if(n==='earth') return [0,0,0]; var pp=planet(n); if(!pp) return null; var q=p3(pp); return [q.x,0,q.z] }
function outerR(){ return secRadius(Math.max(0,visRings()-1)) }

/* matrices, column-major as GL */
function m3persp(fov,asp,n,f){ var t=1/Math.tan(fov/2), nf=1/(n-f); return [t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)*nf,-1, 0,0,2*f*n*nf,0] }
function m3sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]] } function m3dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2] }
function m3cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]] } function m3norm(a){ var l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l] }
function m3look(e,c,u){ var z=m3norm(m3sub(e,c)), x=m3norm(m3cross(u,z)), y=m3cross(z,x);
  return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -m3dot(x,e),-m3dot(y,e),-m3dot(z,e),1] }
function m3mul(a,b){ var o=new Array(16); for(var c=0;c<4;c++) for(var r=0;r<4;r++){ var s=0; for(var k=0;k<4;k++) s+=a[k*4+r]*b[c*4+k]; o[c*4+r]=s } return o }
function camUpdate(){ var ph=CAM.pitch*Math.PI/180, th=CAM.yaw*Math.PI/180;
  var e=[CAM.tx+CAM.dist*Math.cos(ph)*Math.sin(th), CAM.dist*Math.sin(ph), CAM.tz+CAM.dist*Math.cos(ph)*Math.cos(th)];
  var up=CAM.pitch>89?[-Math.sin(th),0,-Math.cos(th)]:[0,1,0];
  M3D.VP=m3mul(m3persp(CAM.fov*Math.PI/180,M3D.W/M3D.H,20,30000),m3look(e,[CAM.tx,0,CAM.tz],up)) }
/* a point of the plane's space → desk px inside the map box (w: the depth, for sizes) */
function prj(p){ var m=M3D.VP, x=p[0],y=p[1],z=p[2];
  var cx=m[0]*x+m[4]*y+m[8]*z+m[12], cy=m[1]*x+m[5]*y+m[9]*z+m[13], cw=m[3]*x+m[7]*y+m[11]*z+m[15];
  if(cw<=1) return null; return {x:(cx/cw+1)/2*M3D.W, y:(1-cy/cw)/2*M3D.H, w:cw} }
function pxPer(w){ return M3D.H/(2*w*Math.tan(CAM.fov*Math.PI/360)) }
/* v5.08: the box's size comes from a ResizeObserver — reading clientWidth every frame of a turn made the browser lay the page out again */
function m3size(){ var mb=el('mapbox'), cv=el('map3d');
  if(!M3D.ro&&window.ResizeObserver){ M3D.ro=new ResizeObserver(function(){ M3D.bw=mb.clientWidth; M3D.bh=mb.clientHeight; M3D.dirty=true; if(G) drawMap() }); M3D.ro.observe(mb); M3D.bw=mb.clientWidth; M3D.bh=mb.clientHeight }
  var W=Math.max(1,M3D.ro?M3D.bw:mb.clientWidth), H=Math.max(1,M3D.ro?M3D.bh:mb.clientHeight), dpr=Math.min(window.devicePixelRatio||1,2)*appZoom();
  if(W!==M3D.W||H!==M3D.H||Math.abs(dpr-M3D.dpr)>0.01||cv.width!==Math.round(W*dpr)){ M3D.W=W; M3D.H=H; M3D.dpr=dpr; cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); M3D.fk=''; M3D.ok=''; M3D.NEB=null } }
/* the visible chart in the frame with room for the names: aim at its middle, back off until every world and its footprint sit inside */
function camFit(){ var vis=PLANETS.filter(function(q){ return secVis(q.sec) }), R=outerR();
  var xs=[0,-R*0.6,R*0.6], zs=[0,-R*0.6,R*0.6]; vis.forEach(function(q){ var a=p3(q); xs.push(a.x); zs.push(a.z) });
  CAM.tx=(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2; CAM.tz=(Math.min.apply(null,zs)+Math.max.apply(null,zs))/2;
  CAM.yaw=0; CAM.pitch=M3D.W/M3D.H<0.8?70:52; CAM.dist=300;
  var side=Math.min(110,M3D.W*0.1), top=40, bot=30;
  for(var it=0;it<120;it++){ camUpdate(); var ok=true;
    vis.forEach(function(q){ if(!ok) return; var a=p3(q); [prj([a.x,wH(q.id),a.z]),prj([a.x,0,a.z])].forEach(function(s){ if(!s||s.x<side||s.x>M3D.W-side||s.y<top||s.y>M3D.H-bot) ok=false }) });
    if(ok) break; CAM.dist*=1.05 } }
function camTurn(dx,dy){ CAM.yaw-=dx*0.25; CAM.pitch=Math.max(14,Math.min(89.5,CAM.pitch+dy*0.25)); CFIT=false }
function camPan(dx,dy){ camUpdate(); var s=1/pxPer(CAM.dist), th=CAM.yaw*Math.PI/180, sp=Math.max(0.35,Math.sin(CAM.pitch*Math.PI/180));
  CAM.tx-=(dx*Math.cos(th)+dy*Math.sin(th)/sp)*s; CAM.tz-=(-dx*Math.sin(th)+dy*Math.cos(th)/sp)*s;
  var r=Math.hypot(CAM.tx,CAM.tz), lim=outerR()+200; if(r>lim){ CAM.tx*=lim/r; CAM.tz*=lim/r } CFIT=false }
function camZoom(f){ CAM.dist=Math.max(220,Math.min(12000,CAM.dist*f)); CFIT=false }

/* ---------- the state of a world, as the map, the list and the advisor see it ---------- */
function isDead(pid){ var p=planet(pid); return !!G.colonies[pid]&&!G.colonies[pid].hub&&p.kind!=='works'&&G.reserves[pid]!==Infinity&&G.reserves[pid]<=0&&pileLeft(G,pid)<1 }
function isDry(pid){ var p=planet(pid); return !!G.colonies[pid]&&p.kind!=='works'&&G.reserves[pid]!==Infinity&&G.reserves[pid]<=0 }
function worksHungry(pid){ var p=planet(pid), c=G.colonies[pid]; if(!c||p.kind!=='works') return null;
  var fr=feedRates(G,pid), ym=(c.store.metal||0)/Math.max(0.01,fr.metal||0), yf=(c.store.food||0)/Math.max(0.01,fr.food||0);
  return {metal:ym, food:yf, low:Math.min(ym,yf), idle:(c.idleWorks||0)} }
/* what the works burn a year and what the line brings of each, in the order the hold is filled (needsOf: fuel, metal, food) */
function feedSplit(pid){ var fr=feedRates(G,pid), f=lineFit(G,pid), left=f?f.carries:0, out={};
  (needsOf(G,pid)||[]).forEach(function(k){ var n=fr[k]||0, b=Math.min(n,left); left-=b; out[k]={need:n,brings:b} });
  return out }
function wst(pid){ var c=G.colonies[pid];
  if(G.ghost&&G.ghost[pid]) return 'ghost';
  if(!c) return enRoute(G,pid)?'settling':'free';
  if(isDead(pid)) return 'dead';
  var ll=lastLift(G,pid); if(ll&&ll.st==='cut') return 'cut';
  var wh=worksHungry(pid); if(wh&&wh.idle>5) return 'starve';
  if(!onLine(G,pid).length) return 'noline';
  if(isDry(pid)) return 'dry';
  if(lineThin(pid)) return 'half';
  return 'ok' }
/* Nikita, 26.10 («линия возит меньше или больше на 1 единицу, а уже уведомление»): a line speaks when it matters. Short: it carries
   under half of what it must, or Earth's stock of this resource runs out soon at today's pace. Works: under FORGE_WARN of what they burn,
   at once and not after 90 idle years (forge-stat, 02.11: a thin line is the main reason the works stand). Too many hulls: SPARE_WARN times the need */
var THIN_WARN=0.5, RUNOUT_YEARS=100, FORGE_WARN=0.75, SPARE_WARN=2, SEAM_YEARS=80;
function earthRunout(res){ var t=trend(res); return t!==null&&t<-0.05&&G.earth[res]/-t<RUNOUT_YEARS }
function lineThin(pid){ var f=lineFit(G,pid), lr=lineRate(G,pid); if(!f||!lr||f.gap<=0.01) return false;
  if(planet(pid).kind==='works') return f.carries<f.need*FORGE_WARN;   // v4.38: a hull in the yards for the line counts
  return lr.piling&&lr.sitting>FIT_PILE&&(f.carries<f.need*THIN_WARN||earthRunout(lr.dep)) }
function seamYears(pid){ var c=G.colonies[pid], p=planet(pid); if(!c||p.kind==='works'||G.reserves[pid]===Infinity||G.reserves[pid]<=0) return Infinity; var r=c.pop*p.rich*K.PROD*rateMult(c); return r>0.001?G.reserves[pid]/r:Infinity }
var BAD_ST={dead:1,cut:1,starve:1};

/* ---------- the map ---------- */
function m3rgb(h){ return parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),16) }
function m3ring(cx,cy,cz,rad,n,a0,a1){ var p=[]; a0=a0||0; a1=a1===undefined?Math.PI*2:a1; for(var i=0;i<=n;i++){ var a=a0+(a1-a0)*i/n; p.push([cx+Math.cos(a)*rad,cy,cz+Math.sin(a)*rad]) } return p }
function m3path(x,pts,close){ x.beginPath(); var on=false, m=M3D.VP, W2=M3D.W/2, H2=M3D.H/2;   // prj's math inline: no object a point (hot)
  for(var i=0;i<pts.length;i++){ var p=pts[i], X=p[0], Y=p[1], Z=p[2], cw=m[3]*X+m[7]*Y+m[11]*Z+m[15]; if(cw<=1){ on=false; continue }
    var sx=((m[0]*X+m[4]*Y+m[8]*Z+m[12])/cw+1)*W2, sy=(1-(m[1]*X+m[5]*Y+m[9]*Z+m[13])/cw)*H2; if(on) x.lineTo(sx,sy); else x.moveTo(sx,sy); on=true }
  if(close) x.closePath() }
/* a horizontal circle straight into a path (the same points as m3path(x,m3ring(…)), without the arrays) */
function m3pathRing(x,cx,cy,cz,rad,n,close){ x.beginPath(); var on=false, m=M3D.VP, W2=M3D.W/2, H2=M3D.H/2;
  for(var i=0;i<=n;i++){ var an=Math.PI*2*i/n, X=cx+Math.cos(an)*rad, Z=cz+Math.sin(an)*rad, cw=m[3]*X+m[7]*cy+m[11]*Z+m[15]; if(cw<=1){ on=false; continue }
    var sx=((m[0]*X+m[4]*cy+m[8]*Z+m[12])/cw+1)*W2, sy=(1-(m[1]*X+m[5]*cy+m[9]*Z+m[13])/cw)*H2; if(on) x.lineTo(sx,sy); else x.moveTo(sx,sy); on=true }
  if(close) x.closePath() }
function m3glow(x,col,b,post){ x.shadowColor='rgba('+col+',.9)'; x.shadowBlur=b; x._post=!!post }
/* space: three star layers and a nebula, made once per size; drawn each frame with a little parallax on turning */
function m3rnd(seed){ return function(){ seed=(seed*16807)%2147483647; return seed/2147483647 } }
function m3space(){ var T=1024;
  if(!M3D.LAY) M3D.LAY=[{k:.10,n:420,a:.35,sz:.8,seed:11},{k:.22,n:160,a:.55,sz:1.2,seed:23},{k:.40,n:45,a:.85,sz:1.7,seed:37}].map(function(L){
    var c=document.createElement('canvas'); c.width=c.height=T; var g=c.getContext('2d'), r=m3rnd(L.seed*7919);
    for(var i=0;i<L.n;i++){ var px=r()*T, py=r()*T, q=r(), a=L.a*(.4+q*.6), s=L.sz*(q>.9?1.6:1), tint=r();
      g.fillStyle=tint<.15?'rgba(190,205,255,'+a+')':(tint<.25?'rgba(255,225,190,'+a+')':'rgba(242,241,236,'+a+')'); g.fillRect(px,py,s,s);
      if(L.k>.3&&q>.8){ var gr=g.createRadialGradient(px,py,0,px,py,s*4); gr.addColorStop(0,'rgba(242,241,236,'+(a*.25)+')'); gr.addColorStop(1,'rgba(242,241,236,0)'); g.fillStyle=gr; g.fillRect(px-s*4,py-s*4,s*8,s*8) } }
    return {c:c,k:L.k,T:T} });
  var W=M3D.W, H=M3D.H, N=M3D.NEB=document.createElement('canvas'); N.width=Math.round(W*1.4); N.height=Math.round(H*1.4); var n=N.getContext('2d'), r=m3rnd(4242);
  n.fillStyle='#050506'; n.fillRect(0,0,N.width,N.height);
  [['70,40,120',.13],['40,70,130',.10],['90,40,110',.08],['30,50,90',.10],['60,30,100',.07]].forEach(function(c){ var cx=r()*N.width, cy=r()*N.height*.8, rad=(.25+r()*.35)*Math.max(N.width,N.height);
    var g=n.createRadialGradient(cx,cy,0,cx,cy,rad); g.addColorStop(0,'rgba('+c[0]+','+c[1]+')'); g.addColorStop(.5,'rgba('+c[0]+','+(c[1]*.4)+')'); g.addColorStop(1,'rgba('+c[0]+',0)'); n.fillStyle=g; n.fillRect(0,0,N.width,N.height) }) }
function m3hexes(FR){ if(M3D.HX&&M3D.HXR>=FR) return M3D.HX; var L=[], n=Math.ceil(FR/(HEXR*1.5))+2;
  for(var r=-n;r<=n;r++) for(var q=-2*n;q<=2*n;q++){ var hx=Math.sqrt(3)*HEXR*(q+r/2), hz=1.5*HEXR*r, d=Math.hypot(hx,hz); if(d<FR) L.push([hx,hz,d]) }
  M3D.HX=L; M3D.HXR=FR; return L }
/* ---------- v5.08: the chart through WebGL ----------
   Nikita 09.11 («на планшете в Chrome лагает… при поворотах лагает нереально… Переводи. Я не хочу костыли с проблемами»): the 2D canvas
   gave the GPU a command for every line, plate and shadow — thousands a frame, a shadow a pass of its own. The scene is the same code as
   before, in the same order, but it draws into M3R recorders that turn it into triangles: a line is a strip with mitred joins and a 1 px
   soft edge, a fill a fan, a dash is cut on the way. A frame is a handful of draw calls. The ~1000 plates are built once (M3D.HX) and
   projected by the GPU. The glow is the glowing strokes' own triangles drawn into a half-size buffer and blurred there (sizes as the old
   shadows: 4, 6, 8–10, 12–14), under the sharp strokes, or over them for what was drawn after a sphere's body (pre / post).
   Space: the nebula and three star layers as textures. No WebGL — no chart canvas (the names and alarms on the SVG stay). */
var GLR=null;
var M3SH={
 line:['attribute vec2 a_p; attribute vec2 a_dh; attribute vec4 a_c; uniform vec2 u_res; varying vec4 v_c; varying vec2 v_dh;'+
   'void main(){ gl_Position=vec4(a_p.x/u_res.x*2.0-1.0,1.0-a_p.y/u_res.y*2.0,0.0,1.0); v_c=a_c; v_dh=a_dh; }',
   'precision mediump float; varying vec4 v_c; varying vec2 v_dh;'+
   'void main(){ float a=v_c.a*clamp(v_dh.y+0.5-abs(v_dh.x),0.0,1.0); gl_FragColor=vec4(v_c.rgb*a,a); }'],
 hex:['attribute vec2 a_c; attribute vec3 a_j; uniform mat4 u_vp; uniform vec2 u_css; uniform float u_dpr; uniform vec2 u_hv[6]; uniform float u_mode; uniform float u_hw; uniform float u_al;'+
   'varying float v_a; varying vec2 v_dh;'+
   'vec3 pj(vec2 p){ vec4 c=u_vp*vec4(p.x,0.0,p.y,1.0); return vec3((c.x/c.w+1.0)*0.5*u_css.x*u_dpr,(1.0-c.y/c.w)*0.5*u_css.y*u_dpr,c.w); }'+
   'void main(){ float bad=0.0; for(int i=0;i<6;i++){ vec4 c=u_vp*vec4(a_c.x+u_hv[i].x,0.0,a_c.y+u_hv[i].y,1.0); if(c.w<=1.0) bad=1.0; }'+
   ' int j=int(a_j.x+0.5), jp=int(mod(a_j.x+5.0,6.0)+0.5), jn=int(mod(a_j.x+1.0,6.0)+0.5); vec3 p1=pj(a_c+u_hv[j]); vec2 pos=p1.xy; v_dh=vec2(0.0,10000.0);'+
   ' if(u_mode>0.5){ vec3 p0=pj(a_c+u_hv[jp]), p2=pj(a_c+u_hv[jn]); vec2 e0=normalize(p1.xy-p0.xy), e1=normalize(p2.xy-p1.xy), n0=vec2(-e0.y,e0.x), n1=vec2(-e1.y,e1.x), m=normalize(n0+n1);'+
   '   float o=u_hw+1.0; pos=p1.xy+m*(o/max(dot(m,n1),0.25))*a_j.y; v_dh=vec2(o*a_j.y,u_hw); }'+
   ' v_a=u_al*a_j.z; vec2 r=u_css*u_dpr; gl_Position=bad>0.5?vec4(2.0,2.0,2.0,1.0):vec4(pos.x/r.x*2.0-1.0,1.0-pos.y/r.y*2.0,0.0,1.0); }',
   'precision mediump float; uniform vec3 u_col; varying float v_a; varying vec2 v_dh;'+
   'void main(){ float a=v_a*clamp(v_dh.y+0.5-abs(v_dh.x),0.0,1.0); gl_FragColor=vec4(u_col*a,a); }'],
 tex:['attribute vec2 a_p; uniform vec4 u_rect; uniform vec2 u_res; uniform vec4 u_uv; varying vec2 v_t;'+
   'void main(){ vec2 p=u_rect.xy+a_p*u_rect.zw; gl_Position=vec4(p.x/u_res.x*2.0-1.0,1.0-p.y/u_res.y*2.0,0.0,1.0); v_t=u_uv.xy+a_p*u_uv.zw; }',
   'precision mediump float; uniform sampler2D u_t; varying vec2 v_t; void main(){ gl_FragColor=texture2D(u_t,v_t); }'],
 blur:['attribute vec2 a_p; varying vec2 v_t; void main(){ gl_Position=vec4(a_p*2.0-1.0,0.0,1.0); v_t=a_p; }',
   'precision mediump float; uniform sampler2D u_t; uniform vec2 u_d; uniform float u_w[13]; uniform float u_r; uniform float u_k; varying vec2 v_t;'+
   'void main(){ vec4 acc=texture2D(u_t,v_t)*u_w[0]; for(int i=1;i<13;i++){ if(float(i)>u_r) break; acc+=(texture2D(u_t,v_t+u_d*float(i))+texture2D(u_t,v_t-u_d*float(i)))*u_w[i]; } gl_FragColor=min(acc*u_k,vec4(1.0)); }'],
 sky:['attribute vec2 a_p; void main(){ gl_Position=vec4(a_p*2.0-1.0,0.0,1.0); }',
   'precision mediump float; uniform sampler2D u_n; uniform sampler2D u_l0; uniform sampler2D u_l1; uniform sampler2D u_l2; uniform vec2 u_res; uniform float u_dpr; uniform vec4 u_nr; uniform vec2 u_o0; uniform vec2 u_o1; uniform vec2 u_o2;'+
   'vec4 ov(vec4 b,vec4 t){ return t+b*(1.0-t.a); }'+
   'void main(){ vec2 p=vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y); vec2 nu=(p-u_nr.xy)/u_nr.zw; vec4 c=vec4(5.0/255.0,5.0/255.0,6.0/255.0,1.0);'+
   ' if(nu.x>=0.0&&nu.y>=0.0&&nu.x<=1.0&&nu.y<=1.0) c=texture2D(u_n,nu); vec2 q=p/u_dpr/1024.0;'+
   ' c=ov(c,texture2D(u_l0,q+u_o0)); c=ov(c,texture2D(u_l1,q+u_o1)); c=ov(c,texture2D(u_l2,q+u_o2)); gl_FragColor=c; }']};
function m3glInit(){ var cv=el('map3d'), gl=null;
  try{ gl=cv.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false}) }catch(e){}
  if(!gl){ GLR=false; return false }
  function sh(t,src){ var o=gl.createShader(t); gl.shaderSource(o,src); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o }
  function prog(k){ var p=gl.createProgram(); gl.attachShader(p,sh(gl.VERTEX_SHADER,M3SH[k][0])); gl.attachShader(p,sh(gl.FRAGMENT_SHADER,M3SH[k][1])); gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); var u={}, a={}, i, n;
    n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS); for(i=0;i<n;i++){ var nm=gl.getActiveUniform(p,i).name.replace('[0]',''); u[nm]=gl.getUniformLocation(p,nm) }
    n=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES); for(i=0;i<n;i++){ var an=gl.getActiveAttrib(p,i).name; a[an]=gl.getAttribLocation(p,an) } return {p:p,u:u,a:a} }
  var R={gl:gl,P:{line:prog('line'),hex:prog('hex'),tex:prog('tex'),blur:prog('blur'),sky:prog('sky')},quad:gl.createBuffer(),hexV:gl.createBuffer(),hexI:gl.createBuffer(),hexN:0,hexR:-1,
    tex:{},T:null,lost:false};
  gl.bindBuffer(gl.ARRAY_BUFFER,R.quad); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
  cv.addEventListener('webglcontextlost',function(e){ e.preventDefault(); R.lost=true });
  cv.addEventListener('webglcontextrestored',function(){ GLR=null; M3D.fk=''; M3D.ok=''; M3D.dirty=true });
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  GLR=R; return R }
/* a recorder: the part of the canvas 2D interface the scene uses, into triangles (x, y device px; d, hw: the line's soft edge; rgba bytes) */
var M3COL={};
function m3col(s){ var c=M3COL[s]; if(c) return c; var m;
  if(s.charAt(0)==='#') c=[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16),1];
  else if((m=/rgba?\(([^)]*)\)/.exec(s))){ var p=m[1].split(','); c=[+p[0],+p[1],+p[2],p.length>3?+p[3]:1] } else c=[255,255,255,1];
  M3COL[s]=c; return c }
function M3R(){ this.buf=new ArrayBuffer(1<<18); this.f=new Float32Array(this.buf); this.u8=new Uint8Array(this.buf); this.n=0; this.vbo=null; this.up=-1;
  this.k=1; this.P=[]; this.S=null; this.lineWidth=1; this.strokeStyle='#000'; this.fillStyle='#000'; this.globalAlpha=1; this.dash=[]; this.shadowBlur=0; this.shadowColor='rgba(0,0,0,0)'; this._post=false; this.G=null; this.bx=[1e9,1e9,-1e9,-1e9] }
M3R.prototype={
  reset:function(){ this.n=0; this.up=-1; this.bx=[1e9,1e9,-1e9,-1e9]; this.P=[]; this.S=null; this.dash=[]; this.shadowBlur=0; this._post=false; this.globalAlpha=1; if(this.G) for(var k in this.G) this.G[k].reset() },
  room:function(v){ if((this.n+v)*20<=this.buf.byteLength) return; var nb=new ArrayBuffer(Math.max(this.buf.byteLength*2,(this.n+v)*20*2)); new Uint8Array(nb).set(this.u8.subarray(0,this.n*20)); this.buf=nb; this.f=new Float32Array(nb); this.u8=new Uint8Array(nb) },
  v:function(x,y,d,hw,c,a){ var i=this.n*5, b=this.n*20+16; this.f[i]=x; this.f[i+1]=y; this.f[i+2]=d; this.f[i+3]=hw; this.u8[b]=c[0]; this.u8[b+1]=c[1]; this.u8[b+2]=c[2]; this.u8[b+3]=Math.max(0,Math.min(255,Math.round(a*255))); this.n++ },
  setTransform:function(a){ this.k=a }, beginPath:function(){ this.P=[]; this.S=null },
  moveTo:function(x,y){ this.S=[x*this.k,y*this.k]; this.P.push(this.S) },
  lineTo:function(x,y){ if(!this.S) return this.moveTo(x,y); this.S.push(x*this.k,y*this.k) },
  closePath:function(){ if(this.S) this.S.closed=true },
  arc:function(cx,cy,r,a0,a1){ var k=this.k, full=Math.abs(a1-a0)>=Math.PI*2-1e-6, n=Math.max(16,Math.min(96,Math.ceil(r*k*0.7))), i, e=full?a0+Math.PI*2:a1;
    if(!this.S||full){ this.S=[]; this.P.push(this.S) } for(i=0;i<=n-(full?1:0);i++){ var a=a0+(e-a0)*i/n; this.S.push((cx+Math.cos(a)*r)*k,(cy+Math.sin(a)*r)*k) } if(full) this.S.closed=true },
  setLineDash:function(d){ this.dash=d.slice() }, getLineDash:function(){ return this.dash.slice() },
  fillRect:function(x,y,w,h){ var k=this.k, c=m3col(this.fillStyle), a=c[3]*this.globalAlpha; this.room(6); x*=k; y*=k; w*=k; h*=k;
    this.v(x,y,0,1e4,c,a); this.v(x+w,y,0,1e4,c,a); this.v(x,y+h,0,1e4,c,a); this.v(x,y+h,0,1e4,c,a); this.v(x+w,y,0,1e4,c,a); this.v(x+w,y+h,0,1e4,c,a) },
  fill:function(){ var c=m3col(this.fillStyle), a=c[3]*this.globalAlpha, i, j;
    for(i=0;i<this.P.length;i++){ var S=this.P[i], n=S.length/2; if(n<3) continue; this.room((n-2)*3);
      for(j=1;j<n-1;j++){ this.v(S[0],S[1],0,1e4,c,a); this.v(S[j*2],S[j*2+1],0,1e4,c,a); this.v(S[j*2+2],S[j*2+3],0,1e4,c,a) } } },
  stroke:function(){ var c=m3col(this.strokeStyle), a=c[3]*this.globalAlpha, hw=this.lineWidth*this.k/2, i, g=null, gc, ga, ghw;
    if(this.shadowBlur>0){ var b=this.shadowBlur, cls=b<5?0:(b<7?1:(b<11?2:3)), key=(this._post?'p':'q')+cls; this.G=this.G||{}; g=this.G[key]||(this.G[key]=new M3R()); g.cls=cls; g.post=this._post;
      var sc=m3col(this.shadowColor); gc=sc; ghw=Math.max(hw,1); ga=sc[3]*a*hw/ghw*0.5 }   // ×0.5: added up in the glow buffer, doubled after the blur
    for(i=0;i<this.P.length;i++){ var S=this.P[i]; if(S.length<4) continue; var parts=this.dash.length?m3dash(S,this.dash,this.k):[S];
      for(var j=0;j<parts.length;j++){ var pp=parts[j], cl=!this.dash.length&&!!S.closed; m3line(this,pp,cl,hw,c,a); if(g) m3line(g,pp,cl,ghw,gc,ga) } } } };
/* a dash pattern (desk px, as the canvas: scaled with the transform) cut along a subpath; it starts again at each subpath */
function m3dash(S,D,k){ var out=[], cur=null, di=0, left=D[0]*k, on=true, n=S.length/2, i, closed=!!S.closed;
  function pt(x,y){ if(!cur){ cur=[x,y]; out.push(cur) } else cur.push(x,y) }
  for(i=0;i<(closed?n:n-1);i++){ var x0=S[i*2], y0=S[i*2+1], i1=(i+1)%n, x1=S[i1*2], y1=S[i1*2+1], L=Math.hypot(x1-x0,y1-y0), t=0;
    if(on) pt(x0,y0);
    while(L-t>left){ t+=left; var px=x0+(x1-x0)*t/L, py=y0+(y1-y0)*t/L; if(on){ pt(px,py); cur=null } else pt(px,py); on=!on; di=(di+1)%D.length; left=D[di]*k }
    left-=L-t; if(on) pt(x1,y1) }
  return out.filter(function(p){ return p.length>=4 }) }
/* a polyline as a strip: mitred joins (limit 4), butt ends, a 1 px soft edge on both sides; thinner than 1 px — 1 px and fainter.
   Hot (every stroke of every frame): no allocations, the vertices written straight into the recorder's buffer */
var M3LP=new Float64Array(512), M3LM=new Float64Array(512);
function m3line(R,S,closed,hw,c,a){ var n0=S.length>>1, P=M3LP, M=M3LM, n=0, i;
  if(P.length<n0*2){ P=M3LP=new Float64Array(n0*4); M=M3LM=new Float64Array(n0*4) }
  for(i=0;i<n0;i++){ var x=S[i*2], y=S[i*2+1]; if(n&&Math.abs(P[n*2-2]-x)<1e-3&&Math.abs(P[n*2-1]-y)<1e-3) continue; P[n*2]=x; P[n*2+1]=y; n++ }
  if(closed&&n>2&&Math.abs(P[0]-P[n*2-2])<1e-3&&Math.abs(P[1]-P[n*2-1])<1e-3) n--; if(n<2) return; if(n<3) closed=false;
  if(hw<0.5){ a*=hw*2; hw=0.5 } var o=hw+1;
  for(i=0;i<n;i++){ var hp=closed||i>0, hn=closed||i<n-1, ip=i>0?i-1:n-1, inx=i<n-1?i+1:0, n0x=0, n0y=0, n1x=0, n1y=0, l, ex, ey;
    if(hp){ ex=P[i*2]-P[ip*2]; ey=P[i*2+1]-P[ip*2+1]; l=Math.sqrt(ex*ex+ey*ey)||1; n0x=-ey/l; n0y=ex/l }
    if(hn){ ex=P[inx*2]-P[i*2]; ey=P[inx*2+1]-P[i*2+1]; l=Math.sqrt(ex*ex+ey*ey)||1; n1x=-ey/l; n1y=ex/l }
    if(!hp){ n0x=n1x; n0y=n1y } if(!hn){ n1x=n0x; n1y=n0y }
    var mx=n0x+n1x, my=n0y+n1y, ml=Math.sqrt(mx*mx+my*my); if(ml<1e-6){ mx=n1x; my=n1y; ml=1 } mx/=ml; my/=ml;
    var dt=mx*n1x+my*n1y, sc=o/(dt>0.25?dt:0.25); M[i*2]=mx*sc; M[i*2+1]=my*sc }
  var B=R.bx; for(i=0;i<n;i++){ var qx=P[i*2], qy=P[i*2+1]; if(qx-o<B[0]) B[0]=qx-o; if(qy-o<B[1]) B[1]=qy-o; if(qx+o>B[2]) B[2]=qx+o; if(qy+o>B[3]) B[3]=qy+o }
  var segs=closed?n:n-1; R.room(segs*6);
  var F=R.f, U=R.u8, v=R.n, cr=c[0], cg=c[1], cb=c[2], ca=Math.max(0,Math.min(255,Math.round(a*255)));
  function put(x,y,d){ var k=v*5, q=v*20+16; F[k]=x; F[k+1]=y; F[k+2]=d; F[k+3]=hw; U[q]=cr; U[q+1]=cg; U[q+2]=cb; U[q+3]=ca; v++ }
  for(i=0;i<segs;i++){ var j=i<n-1?i+1:0, ax=P[i*2], ay=P[i*2+1], bx=P[j*2], by=P[j*2+1], amx=M[i*2], amy=M[i*2+1], bmx=M[j*2], bmy=M[j*2+1];
    put(ax+amx,ay+amy,o); put(ax-amx,ay-amy,-o); put(bx+bmx,by+bmy,o); put(bx+bmx,by+bmy,o); put(ax-amx,ay-amy,-o); put(bx-bmx,by-bmy,-o) }
  R.n=v }
/* a recorder's triangles to the GPU (uploaded again only after a reset) and drawn */
function m3draw(R,rec,res){ if(!rec.n) return; var gl=R.gl, L=R.P.line;
  if(!rec.vbo) rec.vbo=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,rec.vbo); if(rec.up!==rec.n){ gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(rec.buf,0,rec.n*20),gl.DYNAMIC_DRAW); rec.up=rec.n }
  gl.useProgram(L.p); gl.uniform2f(L.u.u_res,res[0],res[1]);
  gl.enableVertexAttribArray(L.a.a_p); gl.vertexAttribPointer(L.a.a_p,2,gl.FLOAT,false,20,0);
  gl.enableVertexAttribArray(L.a.a_dh); gl.vertexAttribPointer(L.a.a_dh,2,gl.FLOAT,false,20,8);
  gl.enableVertexAttribArray(L.a.a_c); gl.vertexAttribPointer(L.a.a_c,4,gl.UNSIGNED_BYTE,true,20,16);
  gl.drawArrays(gl.TRIANGLES,0,rec.n); m3off(gl) }
function m3off(gl){ for(var i=0;i<4;i++) gl.disableVertexAttribArray(i) }
/* render targets at half size for the glow */
function m3target(R,w,h){ var gl=R.gl, t={w:w,h:h,tex:gl.createTexture(),fb:gl.createFramebuffer()};
  gl.bindTexture(gl.TEXTURE_2D,t.tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER,t.fb); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t.tex,0); return t }
function m3targets(R,W,H){ var w=Math.max(1,Math.ceil(W/2)), h=Math.max(1,Math.ceil(H/2)); if(R.T&&R.T.w===w&&R.T.h===h) return R.T;
  var gl=R.gl; if(R.T) ['g','t','a'].forEach(function(k){ gl.deleteTexture(R.T[k].tex); gl.deleteFramebuffer(R.T[k].fb) });
  R.T={w:w,h:h,g:m3target(R,w,h),t:m3target(R,w,h),a:m3target(R,w,h)}; return R.T }
function m3quad(R,prog){ var gl=R.gl; gl.bindBuffer(gl.ARRAY_BUFFER,R.quad); gl.enableVertexAttribArray(prog.a.a_p); gl.vertexAttribPointer(prog.a.a_p,2,gl.FLOAT,false,0,0); gl.drawArrays(gl.TRIANGLES,0,6); m3off(gl) }
/* one glow phase: per size class, its strokes into g, blurred across into t, along into a (over what is there); a over the frame.
   All inside the box of the strokes plus the blur's reach (scissor): g is cleared wider than t, t than a, so no stale pixel is read */
var M3SIG=[2,3,4.5,6.6], M3W={};
function m3wts(sg){ var k=sg.toFixed(3); if(M3W[k]) return M3W[k]; var r=Math.min(12,Math.ceil(sg*3)), w=new Float32Array(13), t=0, i;
  for(i=0;i<=r;i++){ w[i]=Math.exp(-i*i/(2*sg*sg)); t+=i?2*w[i]:w[i] } for(i=0;i<=r;i++) w[i]/=t; return (M3W[k]={w:w,r:r}) }
function m3glowPass(R,recs,post,W,H,dst){ var gl=R.gl, T=m3targets(R,W,H), B=R.P.blur, c, jobs=[], U=[1e9,1e9,-1e9,-1e9];
  function grow(b,p){ return [b[0]-p,b[1]-p,b[2]+p,b[3]+p] }
  function half(b){ var x0=Math.max(0,Math.floor(b[0]/2)), y0=Math.max(0,Math.floor((H-b[3])/2)), x1=Math.min(T.w,Math.ceil(b[2]/2)+1), y1=Math.min(T.h,Math.ceil((H-b[1])/2)+1); gl.scissor(x0,y0,Math.max(0,x1-x0),Math.max(0,y1-y0)) }
  for(c=0;c<4;c++){ var key=(post?'p':'q')+c, list=recs.map(function(r){ return r.G&&r.G[key] }).filter(function(g){ return g&&g.n }); if(!list.length) continue;
    var bb=[1e9,1e9,-1e9,-1e9]; list.forEach(function(g){ bb=[Math.min(bb[0],g.bx[0]),Math.min(bb[1],g.bx[1]),Math.max(bb[2],g.bx[2]),Math.max(bb[3],g.bx[3])] });
    var rd=Math.ceil(M3SIG[c]*3)+2, box=grow(bb,rd); jobs.push({c:c,list:list,box:box,rd:rd}); U=[Math.min(U[0],box[0]),Math.min(U[1],box[1]),Math.max(U[2],box[2]),Math.max(U[3],box[3])] }
  if(!jobs.length) return;
  gl.enable(gl.SCISSOR_TEST); gl.clearColor(0,0,0,0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.a.fb); gl.viewport(0,0,T.w,T.h); half(U); gl.clear(gl.COLOR_BUFFER_BIT);
  jobs.forEach(function(j){ var wt=m3wts(M3SIG[j.c]/2);
    gl.bindFramebuffer(gl.FRAMEBUFFER,T.g.fb); half(grow(j.box,j.rd*2+4)); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.ONE,gl.ONE); j.list.forEach(function(g){ m3draw(R,g,[W,H]) }); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);   // the shadows of the old canvas added up where strokes crowd (a sphere's wire): so here
    gl.useProgram(B.p); gl.uniform1i(B.u.u_t,0); gl.activeTexture(gl.TEXTURE0); gl.uniform1fv(B.u.u_w,wt.w); gl.uniform1f(B.u.u_r,wt.r);
    gl.bindFramebuffer(gl.FRAMEBUFFER,T.t.fb); half(grow(j.box,j.rd+2)); gl.bindTexture(gl.TEXTURE_2D,T.g.tex); gl.uniform2f(B.u.u_d,1/T.w,0); gl.uniform1f(B.u.u_k,1); gl.disable(gl.BLEND); m3quad(R,B); gl.enable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER,T.a.fb); half(j.box); gl.bindTexture(gl.TEXTURE_2D,T.t.tex); gl.uniform2f(B.u.u_d,0,1/T.h); gl.uniform1f(B.u.u_k,2); m3quad(R,B) });
  gl.bindFramebuffer(gl.FRAMEBUFFER,dst||null); gl.viewport(0,0,W,H); gl.scissor(Math.max(0,Math.floor(U[0])),Math.max(0,Math.floor(H-U[3])),Math.max(0,Math.ceil(U[2]-U[0])),Math.max(0,Math.ceil(U[3]-U[1])));
  var X=R.P.tex; gl.useProgram(X.p); gl.uniform1i(X.u.u_t,0); gl.bindTexture(gl.TEXTURE_2D,T.a.tex);
  gl.uniform2f(X.u.u_res,W,H); gl.uniform4f(X.u.u_rect,0,H,W,-H); gl.uniform4f(X.u.u_uv,0,0,1,1); m3quad(R,X); gl.disable(gl.SCISSOR_TEST) }
/* a canvas as a texture (premultiplied), kept by key */
function m3tex(R,key,cv,rep){ var gl=R.gl, t=R.tex[key]; if(t&&t.src===cv) return t.tex; if(t) gl.deleteTexture(t.tex);
  var tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,rep?gl.REPEAT:gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,rep?gl.REPEAT:gl.CLAMP_TO_EDGE);
  R.tex[key]={tex:tex,src:cv}; return tex }
/* space as before (the nebula with a little parallax, three star layers tiled 1024 desk px a tile), in one pass over the frame */
function m3skyGL(R,W,H){ if(!M3D.NEB) m3space(); var gl=R.gl, X=R.P.sky, k=M3D.dpr, w=M3D.W, h=M3D.H, span=w*0.4, N=M3D.NEB, i;
  var nx=-(((CAM.yaw*1.2)%span)+span)%span-w*0.05, ny=-(h*0.2)+(CAM.pitch-50)*0.6;
  gl.useProgram(X.p); gl.disable(gl.BLEND);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,m3tex(R,'neb',N,false)); gl.uniform1i(X.u.u_n,0);
  for(i=0;i<3;i++){ var L=M3D.LAY[i], ox=((-CAM.yaw*L.k*12)%L.T+L.T)%L.T, oy=((CAM.pitch*L.k*8)%L.T+L.T)%L.T;
    gl.activeTexture(gl.TEXTURE1+i); gl.bindTexture(gl.TEXTURE_2D,m3tex(R,'lay'+i,L.c,true)); gl.uniform1i(X.u['u_l'+i],1+i); gl.uniform2f(X.u['u_o'+i],ox/L.T,oy/L.T) }
  gl.uniform2f(X.u.u_res,W,H); gl.uniform1f(X.u.u_dpr,k); gl.uniform4f(X.u.u_nr,nx*k,ny*k,N.width*k,N.height*k);
  m3quad(R,X); gl.enable(gl.BLEND); gl.activeTexture(gl.TEXTURE0) }
/* the plates: built when the floor's reach changes (a centre, a corner, a side, a fade per vertex), drawn by the GPU from the camera */
function m3hexGL(R,FR,W,H){ var gl=R.gl, X=R.P.hex, j;
  if(R.hexR!==FR){ R.hexR=FR; var hx=m3hexes(FR).filter(function(h){ var f=(FR-h[2])/(FR*0.5); return h[2]<FR&&Math.min(1,f)>=0.02 }), V=[], I=[], b=0;
    hx.forEach(function(h){ var f=Math.max(0,Math.min(1,(FR-h[2])/(FR*0.5))); for(j=0;j<6;j++){ V.push(h[0],h[1],j,0,f) } for(j=1;j<5;j++) I.push(b,b+j,b+j+1); b+=6 });
    R.hexFill=I.length; hx.forEach(function(h){ var f=Math.max(0,Math.min(1,(FR-h[2])/(FR*0.5))); for(j=0;j<6;j++){ V.push(h[0],h[1],j,1,f, h[0],h[1],j,-1,f) }
      for(j=0;j<6;j++){ var a=b+j*2, c=b+((j+1)%6)*2; I.push(a,a+1,c, c,a+1,c+1) } b+=12 });
    R.hexN=I.length; if(b>65535){ R.hexN=0; R.hexFill=0 }
    gl.bindBuffer(gl.ARRAY_BUFFER,R.hexV); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(V),gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,R.hexI); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I),gl.STATIC_DRAW) }
  if(!R.hexN) return; gl.useProgram(X.p);
  var hv=[]; for(j=0;j<6;j++){ var ha=Math.PI/3*j+Math.PI/6; hv.push(Math.cos(ha)*HEXR*.94,Math.sin(ha)*HEXR*.94) }
  gl.uniformMatrix4fv(X.u.u_vp,false,new Float32Array(M3D.VP)); gl.uniform2f(X.u.u_css,M3D.W,M3D.H); gl.uniform1f(X.u.u_dpr,M3D.dpr); gl.uniform2fv(X.u.u_hv,new Float32Array(hv));
  gl.bindBuffer(gl.ARRAY_BUFFER,R.hexV); gl.enableVertexAttribArray(X.a.a_c); gl.vertexAttribPointer(X.a.a_c,2,gl.FLOAT,false,20,0); gl.enableVertexAttribArray(X.a.a_j); gl.vertexAttribPointer(X.a.a_j,3,gl.FLOAT,false,20,8);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,R.hexI);
  gl.uniform1f(X.u.u_mode,0); gl.uniform1f(X.u.u_al,0.9); gl.uniform3f(X.u.u_col,26/255,26/255,30/255); gl.uniform1f(X.u.u_hw,0); gl.drawElements(gl.TRIANGLES,R.hexFill,gl.UNSIGNED_SHORT,0);
  gl.uniform1f(X.u.u_mode,1); gl.uniform1f(X.u.u_al,0.32); gl.uniform3f(X.u.u_col,165/255,162/255,155/255); gl.uniform1f(X.u.u_hw,1.1*M3D.dpr/2); gl.drawElements(gl.TRIANGLES,R.hexN-R.hexFill,gl.UNSIGNED_SHORT,R.hexFill*2);
  m3off(gl) }
/* the floor's lines: the darkening rims (under the plates) and the rings and the lobes (over them) — again only when the camera moves */
function m3floorEmit(fa,fb){ fa.setTransform(M3D.dpr,0,0,M3D.dpr,0,0); fb.setTransform(M3D.dpr,0,0,M3D.dpr,0,0);
  var OUT=outerR(), FR=OUT+420, k, i;
  for(k=0;k<10;k++){ m3pathRing(fa,0,0,0,FR*(1-k*0.075),72,true); fa.fillStyle='rgba(7,7,8,.16)'; fa.fill() }
  fb.setLineDash([2,5]); for(i=0;i<visRings();i++){ m3pathRing(fb,0,0,0,SECTORS[i].r,140); fb.strokeStyle='rgba(235,220,170,.30)'; fb.lineWidth=1; fb.stroke() }
  if(can('sectors')) for(i=0;i<LOBES;i++){ var e=lobeEdge(i); m3path(fb,[[Math.cos(e)*34,0,Math.sin(e)*34],[Math.cos(e)*(OUT+44),0,Math.sin(e)*(OUT+44)]]); fb.strokeStyle='rgba(235,220,170,.18)'; fb.stroke() }
  fb.setLineDash([]) }
/* a world's sphere, wire (Nikita 06.11: «каркас»): three parallels, four meridians turning slowly, a dark body, a glowing limb */
function m3sphere(x,cx,cy,cz,rad,col,spin,alpha,bl,body){ var s=prj([cx,cy,cz]); if(!s) return null; var pr=rad*pxPer(s.w), i, m;
  m3glow(x,col,bl); x.strokeStyle='rgba('+col+','+alpha+')'; x.lineWidth=1;
  [-0.55,0,0.55].forEach(function(la){ m3pathRing(x,cx,cy+Math.sin(la*1.2)*rad,cz,Math.cos(la*1.2)*rad,24); x.stroke() });
  for(m=0;m<4;m++){ var a0=spin+m*Math.PI/4, pts=[]; for(i=0;i<=20;i++){ var b=-Math.PI/2+i/20*Math.PI; pts.push([cx+Math.cos(b)*Math.cos(a0)*rad,cy+Math.sin(b)*rad,cz+Math.cos(b)*Math.sin(a0)*rad]) } m3path(x,pts); x.stroke() }
  x.shadowBlur=0; x.beginPath(); x.arc(s.x,s.y,pr,0,7); x.fillStyle=body!==col?'rgba('+body+',.28)':'rgba(7,7,6,.55)'; x.fill();
  m3glow(x,col,bl*1.4,true); x.strokeStyle='rgba('+col+','+Math.min(1,alpha*1.5)+')'; x.lineWidth=1.4; x.stroke(); x.shadowBlur=0;
  return {x:s.x,y:s.y,r:pr,w:s.w} }
/* the works' orbital ring, tilted: the half behind the sphere before it, the half in front after it */
function m3orbit(x,a,h,front,col){ var rr=RS*1.75, tilt=0.38, c=prj([a.x,h,a.z]), P=[], i; if(!c) return;
  for(i=0;i<=40;i++){ var an=Math.PI*2*i/40, ox=Math.cos(an)*rr, oz=Math.sin(an)*rr; P.push(prj([a.x+ox,h+oz*Math.sin(tilt),a.z+oz*Math.cos(tilt)])) }
  m3glow(x,col,6,front); x.strokeStyle='rgba('+col+',.9)'; x.lineWidth=1.5; x.beginPath();
  for(i=0;i<40;i++){ var p=P[i], q=P[i+1]; if(!p||!q) continue; if(((p.w+q.w)/2<c.w)!==front) continue; x.moveTo(p.x,p.y); x.lineTo(q.x,q.y) }
  x.stroke(); x.shadowBlur=0 }
/* a double line on the floor: a hub's (to Earth, magenta) and a feeder's (to its hub, in its trade's colour) */
function m3dbl(x,a,b,col,wd){ var p=prj(a), q=prj(b); if(!p||!q) return; var dx=q.x-p.x, dy=q.y-p.y, l=Math.hypot(dx,dy)||1, nx=-dy/l*2.2, ny=dx/l*2.2;
  m3glow(x,col,6); x.strokeStyle='rgba('+col+',.95)'; x.lineWidth=wd;
  x.beginPath(); x.moveTo(p.x+nx,p.y+ny); x.lineTo(q.x+nx,q.y+ny); x.moveTo(p.x-nx,p.y-ny); x.lineTo(q.x-nx,q.y-ny); x.stroke(); x.shadowBlur=0 }
function m3wcol(kind){ return m3rgb(KCOL[kind]) }
/* the footprints and the lines on the floor: again when the camera or the chart changes (who is settled, settling, abandoned, a hub, whose line goes where) */
function m3obEmit(x,vis){ var hubc=m3rgb(HUBC), k, p, a; x.setTransform(M3D.dpr,0,0,M3D.dpr,0,0);
  // footprints: settled — two rings in the trade's colour; free — dashed grey; settling — dashed yellow; abandoned — ×
  vis.forEach(function(q){ var st=wst(q.id), on=!!G.colonies[q.id], col=on?m3wcol(q.kind):(st==='settling'?m3rgb(C.people):'156,155,149'); a=p3(q);
    if(st==='ghost') return;   // its × is in the SVG
    if(!on) x.setLineDash([3,3]); if(on) m3glow(x,col,6); m3pathRing(x,a.x,0,a.z,13,32); x.strokeStyle='rgba('+col+','+(on||st==='settling'?.85:.45)+')'; x.lineWidth=1.3; x.stroke();
    if(on){ m3pathRing(x,a.x,0,a.z,19,32); x.strokeStyle='rgba('+col+',.25)'; x.lineWidth=1; x.stroke() } x.setLineDash([]); x.shadowBlur=0;
    if(on&&G.colonies[q.id].hub){ var hp=[]; for(k=0;k<=6;k++){ var ha=Math.PI/3*k; hp.push([a.x+Math.cos(ha)*27,0,a.z+Math.sin(ha)*27]) } x.setLineDash([5,3]); m3glow(x,hubc,8); m3path(x,hp); x.strokeStyle='rgba('+hubc+',.95)'; x.lineWidth=1.8; x.stroke(); x.setLineDash([]); x.shadowBlur=0 } });
  // lines, still: Earth → a world in its trade's colour; Earth → a hub double magenta; a hub → its feeder double in the feeder's colour
  for(k in G.colonies){ p=planet(k); if(!secVis(p.sec)) continue; var lt=lineTo(G,k), A=node3(lt==='earth'?'earth':lt), B=node3(k); if(!A||!B) continue;
    var L=Math.hypot(B[0]-A[0],B[2]-A[2])||1, hubA=lt!=='earth', hubB=!!G.colonies[k].hub, ua=(lt==='earth'?26:27)/L, ub=1-(hubB?27:14)/L; if(ua>=ub) continue;
    var A2=[A[0]+(B[0]-A[0])*ua,0,A[2]+(B[2]-A[2])*ua], B2=[A[0]+(B[0]-A[0])*ub,0,A[2]+(B[2]-A[2])*ub], col=m3wcol(p.kind);
    if(hubA) m3dbl(x,A2,B2,col,1.3); else if(hubB) m3dbl(x,A2,B2,hubc,1.3);
    else { m3path(x,[A2,B2]); m3glow(x,col,4); x.strokeStyle='rgba('+col+',.45)'; x.lineWidth=1.3; x.stroke(); x.shadowBlur=0 } }
}
/* the moving floor: the quiet wave and the events' lobes */
function m3waveEmit(x,t,OUT){ x.setTransform(M3D.dpr,0,0,M3D.dpr,0,0);
  // the quiet wave: one soft ring out of Earth every 9 s
  var wr=((t%9)/9)*(OUT+200); m3pathRing(x,0,0,0,wr,90); x.strokeStyle='rgba(255,210,63,'+(0.10*(1-wr/(OUT+200))).toFixed(3)+')'; x.lineWidth=6; x.stroke();
  // v4.21 (F-21): an event lights its lobe — dashed while announced (blinking), a translucent wedge while it runs
  if(can('events')) (G.dir&&G.dir.ev||[]).forEach(function(ev){ if(ev.lobe===undefined) return; var ec=EVCOL[ev.type]||'255,42,26', a0=lobeEdge(ev.lobe), pts=[[0,0,0]].concat(m3ring(0,0,0,OUT+44,16,a0,a0+LOBE_ARC));
    var bl=ev.state==='warn'?0.45+0.55*Math.abs(Math.sin(t*Math.PI/1.6)):1; m3path(x,pts,true);
    if(ev.state==='active'){ x.fillStyle='rgba('+ec+',.10)'; x.fill() } x.setLineDash(ev.state==='warn'?[6,5]:[3,4]); x.strokeStyle='rgba('+ec+','+(0.7*bl).toFixed(3)+')'; x.lineWidth=1.4; x.stroke(); x.setLineDash([]) });
}
/* the hulls and the worlds, every frame */
function m3dynEmit(x,t,vis){ var i, k; x.setTransform(M3D.dpr,0,0,M3D.dpr,0,0);
  // hulls: the figure of the class (3, 4, 6 sides) in its colour, the yellow nose along the leg; a missing one — a red ring with ?
  for(i=0;i<G.ships.length;i++){ var sh=G.ships[i]; if(sh.mode!=='transit'&&sh.mode!=='missing') continue;
    var SA=node3(sh.origin), SB=node3(sh.dest||sh.target); if(!SA||!SB) continue;
    var f=sh.total?(1-sh.t/sh.total):0; if(sh.mode==='missing') f=sh.lastT!==undefined?sh.lastT:0.55; else sh.lastT=f;
    var f2=Math.min(1,f+0.01), sp=prj([SA[0]+(SB[0]-SA[0])*f,0,SA[2]+(SB[2]-SA[2])*f]), sq=prj([SA[0]+(SB[0]-SA[0])*f2,0,SA[2]+(SB[2]-SA[2])*f2]); if(!sp||!sq) continue;
    var kk=Math.max(.5,Math.min(1,pxPer(sp.w)*1.4));
    if(sh.mode==='missing'){ x.setLineDash([2,3]); x.beginPath(); x.arc(sp.x,sp.y,8*kk,0,7); x.strokeStyle=C.red; x.lineWidth=1; x.stroke(); x.setLineDash([]); continue }   // its ? is in the SVG
    var scls=shipClass(sh), n=scls==='courier'?3:(scls==='hauler'?4:6), ang=Math.atan2(sq.y-sp.y,sq.x-sp.x); x.beginPath();
    for(k=0;k<n;k++){ var aa=ang+Math.PI*2*k/n+(n===4?Math.PI/4:0), rr=(k===0&&n===3?7.5:5.5)*kk, px=sp.x+Math.cos(aa)*rr, py=sp.y+Math.sin(aa)*rr; if(k) x.lineTo(px,py); else x.moveTo(px,py) } x.closePath();
    x.fillStyle='rgba(7,7,6,.8)'; x.fill(); m3glow(x,m3rgb(CLSCOL[scls]),6); x.strokeStyle=CLSCOL[scls]; x.lineWidth=1.5; x.stroke(); x.shadowBlur=0; x.fillStyle=C.people; x.fillRect(sp.x+Math.cos(ang)*7*kk-1.5,sp.y+Math.sin(ang)*7*kk-1.5,3,3) }
  // Earth and the worlds, far first: stems of one height with a tick for every upgrade package, the works' orbit, the sphere
  var list=vis.filter(function(q){ return wst(q.id)!=='ghost' }).map(function(q){ var b=p3(q), s=prj([b.x,wH(q.id),b.z]); return s?{q:q,s:s}:null }).filter(Boolean);
  var es=prj([0,22,0]); if(es) list.push({earth:1,s:es}); list.sort(function(u,v){ return v.s.w-u.s.w });
  list.forEach(function(o){
    if(o.earth){ m3sphere(x,0,22,0,22,m3rgb(C.earth),t*0.3,.8,10); m3pathRing(x,0,0,0,26,40); m3glow(x,'255,210,63',8,true); x.strokeStyle='rgba(255,210,63,.7)'; x.lineWidth=1.4; x.stroke(); x.shadowBlur=0; return }
    var q=o.q, b=p3(q), on=!!G.colonies[q.id], h=wH(q.id), col=on?m3wcol(q.kind):'156,155,149', body=on&&q.kind==='works'?m3rgb(PARTS_BODY):col, rad=on?RS:RF, works=on&&q.kind==='works';
    if(on){ m3glow(x,col,6); m3path(x,[[b.x,0,b.z],[b.x,h-rad,b.z]]); x.strokeStyle='rgba('+col+',.75)'; x.lineWidth=1.6; x.stroke(); x.shadowBlur=0;
      var kt=kitTier(G.colonies[q.id]), top=h-rad-4, sp=kt?Math.min(6,Math.max(2,top-2)/kt):0;   // v5.17 (Nikita 12.11): the ticks are the upgrade packages, not people
      for(var tk=0;tk<kt;tk++){ var tp=prj([b.x,top-tk*sp,b.z]); if(!tp) continue; var tl=5*pxPer(tp.w)+3; x.beginPath(); x.moveTo(tp.x-tl,tp.y); x.lineTo(tp.x+tl,tp.y); x.strokeStyle='rgba(255,210,63,.95)'; x.lineWidth=2.2; x.stroke() } }
    if(works) m3orbit(x,b,h,false,col);
    m3sphere(x,b.x,h,b.z,rad,col,t*0.5+(q.ang*7%6.28),on?.85:.38,on?9:0,body);
    if(works) m3orbit(x,b,h,true,col) })
}
/* the whole scene; the SVG on top is drawn by drawMap from the same camera */
/* the camera for this size and chart: the SVG needs it at once, the canvas draws on the next frame */
function m3prep(){ m3size(); if(CFIT){ var fk=visRings()+'|'+M3D.W+'|'+M3D.H; if(fk!==CFITK){ CFITK=fk; camFit() } } camUpdate() }
var M3RS={fa:null,fb:null,ob:null,wv:null,dy:null};
function draw3d(now){ if(!G||!el('map3d')) return; m3prep(); var R=GLR===null?m3glInit():GLR; if(!R||R.lost) return;
  var gl=R.gl, cv=el('map3d'), W=cv.width, H=cv.height, t=(now||performance.now())/1000, OUT=outerR(), FR=OUT+420, vis=PLANETS.filter(function(q){ return secVis(q.sec) });
  var Q=M3RS; if(!Q.fa){ Q.fa=new M3R(); Q.fb=new M3R(); Q.ob=new M3R(); Q.wv=new M3R(); Q.dy=new M3R() }
  var key=[CAM.tx,CAM.tz,CAM.yaw,CAM.pitch,CAM.dist].map(function(v){ return v.toFixed(2) }).join()+'|'+W+'|'+H+'|'+visRings()+'|'+(can('sectors')?1:0);
  var bgNew=key!==M3D.fk; if(bgNew){ M3D.fk=key; Q.fa.reset(); Q.fb.reset(); m3floorEmit(Q.fa,Q.fb) }
  var sig=key+'#'+vis.map(function(q){ var id=q.id, c=G.colonies[id]; return id+(G.ghost&&G.ghost[id]?'g':c?'c'+(c.hub?'h':'')+lineTo(G,id):enRoute(G,id)?'s':'f') }).join();
  var obNew=sig!==M3D.ok; if(obNew){ M3D.ok=sig; Q.ob.reset(); m3obEmit(Q.ob,vis) }
  Q.wv.reset(); m3waveEmit(Q.wv,t,OUT); Q.dy.reset(); m3dynEmit(Q.dy,t,vis);
  // space and the floor change only with the camera, the footprints and the floor's lines with the camera or the chart: while they move
  // they are drawn straight into the frame; once still, each is baked into a full-size texture (the floor's lines with their glow) and
  // laid down as one quad a frame
  function blit(t){ var X=R.P.tex; gl.useProgram(X.p); gl.uniform1i(X.u.u_t,0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,t.tex); gl.uniform2f(X.u.u_res,W,H); gl.uniform4f(X.u.u_rect,0,H,W,-H); gl.uniform4f(X.u.u_uv,0,0,1,1); m3quad(R,X) }
  function bgDraw(){ m3skyGL(R,W,H); m3draw(R,Q.fa,[W,H]); m3hexGL(R,FR,W,H); m3draw(R,Q.fb,[W,H]) }
  if(R.bg&&(R.bg.w!==W||R.bg.h!==H)){ ['bg','obt'].forEach(function(k){ if(R[k]){ gl.deleteTexture(R[k].tex); gl.deleteFramebuffer(R[k].fb); R[k]=null } }); R.bgOK=false; R.obOK=false }
  if(bgNew||R.bgFR!==FR){ R.bgFR=FR; R.bgOK=false }
  if(R.bgOK){ gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,W,H); gl.disable(gl.BLEND); blit(R.bg); gl.enable(gl.BLEND) }
  else if(!bgNew){ if(!R.bg) R.bg=m3target(R,W,H); gl.bindFramebuffer(gl.FRAMEBUFFER,R.bg.fb); gl.viewport(0,0,W,H); bgDraw(); R.bgOK=true;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.disable(gl.BLEND); blit(R.bg); gl.enable(gl.BLEND) }
  else { gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,W,H); bgDraw() }
  m3draw(R,Q.wv,[W,H]);
  if(obNew) R.obOK=false;
  if(!R.obOK&&!obNew){ if(!R.obt) R.obt=m3target(R,W,H); gl.bindFramebuffer(gl.FRAMEBUFFER,R.obt.fb); gl.viewport(0,0,W,H); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    m3glowPass(R,[Q.ob],false,W,H,R.obt.fb); gl.bindFramebuffer(gl.FRAMEBUFFER,R.obt.fb); m3draw(R,Q.ob,[W,H]); R.obOK=true; gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,W,H) }
  if(R.obOK) blit(R.obt); else m3draw(R,Q.ob,[W,H]);
  m3glowPass(R,R.obOK?[Q.dy]:[Q.ob,Q.dy],false,W,H); m3draw(R,Q.dy,[W,H]); m3glowPass(R,[Q.dy],true,W,H) }
/* the SVG on top: a .wd per world at its sphere (hit, alarms, the open one, its name and people), Earth's, the lobe and ring names.
   v5.08 (Nikita 09.11: turning lags on the tablet): built as text with its positions apart (S.k — the text without them); when only the
   positions changed (the camera turned), the nodes already there get the new numbers instead of a new innerHTML (and its style and layout) */
var SV={k:'',N:null,vb:''};
function drawMap(){
  if(!G) return; m3prep(); M3D.dirty=true; var i, W=M3D.W, H=M3D.H, S={s:'',k:'',n:-1,V:[]};
  function so(tag){ S.n++; S.s+='<'+tag; S.k+='<'+tag }
  function sa(n,v){ var t=' '+n+'="'+v+'"'; S.s+=t; S.k+=t }
  function sp(n,v){ S.s+=' '+n+'="'+v+'"'; S.k+=' '+n+'=""'; S.V.push(S.n,n,String(v)) }
  function sr(t){ S.s+=t; S.k+=t }
  var vb='0 0 '+W+' '+H; if(vb!==SV.vb){ SV.vb=vb; el('map').setAttribute('viewBox',vb) }
  so('rect'); sa('x',0); sa('y',0); sp('width',W); sp('height',H); sa('fill','none'); sa('pointer-events','all'); sr('/>');
  var OUT=outerR(), es=prj([0,22,0]), ef=prj([0,0,0]), er=es?22*pxPer(es.w):20;
  // v4.21 (F-21): the six lobes, a name at the rim, lit by its event
  if(can('sectors')) for(i=0;i<LOBES;i++){ var me=lobeMid(i), lp=prj([Math.cos(me)*(OUT+70),0,Math.sin(me)*(OUT+70)]); if(!lp) continue;
    var le=lobeEvents(G,i), lit=le.length?'rgb('+(EVCOL[le[0].type]||'255,42,26')+')':null, ddx=ef?lp.x-ef.x:0;
    so('text'); sp('x',lp.x.toFixed(1)); sp('y',(lp.y+4).toFixed(1)); sa('fill',lit||C.mid); sa('font-size',12); sa('letter-spacing',2.4); sp('text-anchor',ddx>20?'start':(ddx<-20?'end':'middle')); sa('class','nm'); sa('pointer-events','none'); sr('>'+esc(T('lobe'+i).toUpperCase())+'</text>') }
  // ring names, on the near side of each ring
  var th=CAM.yaw*Math.PI/180;
  for(i=0;i<visRings();i++){ var rq=prj([Math.sin(th)*SECTORS[i].r,0,Math.cos(th)*SECTORS[i].r]); if(!rq) continue;
    so('text'); sp('x',rq.x.toFixed(1)); sp('y',(rq.y+13).toFixed(1)); sa('fill',C.dim); sa('font-size',9); sa('letter-spacing',1.6); sa('text-anchor','middle'); sa('class','nm'); sa('pointer-events','none'); sr('>'+esc(SECTORS[i].name)+'</text>') }
  // the worlds: where their spheres are; names never over a world, never off the map, never on each other (v4.25)
  var boxes=[], L=[];
  if(es) boxes.push({x0:es.x-er,x1:es.x+er,y0:es.y-er,y1:es.y+er+6});
  var GH=[];
  PLANETS.forEach(function(q){ if(!secVis(q.sec)) return; var b=p3(q), on=!!G.colonies[q.id], st=wst(q.id); if(st==='ghost'){ var gp=prj([b.x,0,b.z]); if(gp) GH.push(gp); return }
    var sp3=prj([b.x,wH(q.id),b.z]); if(!sp3) return; var sr3=(on?RS:RF)*pxPer(sp3.w), rr=sr3*(on&&q.kind==='works'?1.8:1);
    boxes.push({x0:sp3.x-rr,x1:sp3.x+rr,y0:sp3.y-sr3,y1:sp3.y+sr3}); L.push({q:q,s:sp3,r:sr3,rr:rr,on:on,st:st}) });
  L.sort(function(u,v){ return (v.on-u.on)||(u.s.w-v.s.w) }).forEach(function(o){
    var q=o.q, nm=q.name.toUpperCase(), pop=o.on?seamPct(q):'', tw=(nm.length*7.2+pop.length*6.6), g=(U.win===q.id?9:5)+(o.rr-o.r), ok=null, sx=o.s.x, sy=o.s.y;
    var cs=[[sx+o.r+g,sy+4],[sx-o.r-g-tw,sy+4],[sx-tw/2,sy-o.r-g-4],[sx-tw/2,sy+o.r+16]];
    for(var j=0;j<cs.length&&!ok;j++){ var bx={x0:cs[j][0]-2,x1:cs[j][0]+tw+2,y0:cs[j][1]-11,y1:cs[j][1]+3}; if(bx.x0<2||bx.x1>W-2) continue;
      if(!boxes.some(function(z){ return bx.x0<z.x1&&z.x0<bx.x1&&bx.y0<z.y1&&z.y0<bx.y1 })) ok=bx }
    o.lab=ok||{x0:cs[0][0]-2,y1:cs[0][1]+3,hidden:true}; if(ok) boxes.push(ok) });
  L.forEach(function(o){ var q=o.q, st=o.st, lab=o.lab;
    so('g'); sa('class','wd'); sa('data-p',q.id); sp('transform','translate('+o.s.x.toFixed(1)+' '+o.s.y.toFixed(1)+')'); sr('>');
    so('circle'); sp('r',Math.max(12,o.rr+4).toFixed(1)); sa('fill','transparent'); sr('/>');
    if(BAD_ST[st]){ so('circle'); sp('r',(o.rr+7).toFixed(1)); sa('fill','none'); sa('stroke',C.red); sa('stroke-width',2); sa('class','alarm'); sr('/>') }
    else if(st==='noline'||st==='half'){ so('circle'); sp('r',(o.rr+7).toFixed(1)); sa('fill','none'); sa('stroke',C.people); sa('stroke-width',1.6); sa('class','alarm'); sr('/>') }
    if(U.win===q.id){ so('circle'); sp('r',(o.rr+11).toFixed(1)); sa('fill','none'); sa('stroke',C.people); sa('stroke-width',2); sr('/>') }
    if(!lab.hidden){ so('text'); sp('x',(lab.x0+2-o.s.x).toFixed(1)); sp('y',(lab.y1-3-o.s.y).toFixed(1)); sa('fill',o.on?C.ink:C.mid); sa('font-size',10.5); sa('letter-spacing',1); sa('class','nm'); sr('>'+esc(q.name.toUpperCase()));
      var sq=o.on?seamPct(q):''; if(sq){ so('tspan'); sa('fill',seamCol(q)); sr('>'+esc(sq)+'</tspan>') } sr('</text>') }
    sr('</g>') });
  // v5.08: the letters the chart canvas drew before WebGL — an abandoned world's ×, a missing hull's ?
  GH.forEach(function(gp){ so('text'); sp('x',gp.x.toFixed(1)); sp('y',(gp.y+4).toFixed(1)); sa('fill','rgba(94,93,88,.8)'); sa('font-size',13); sa('font-family','Geist Mono,monospace'); sa('text-anchor','middle'); sa('pointer-events','none'); sr('>×</text>') });
  G.ships.forEach(function(sh){ if(sh.mode!=='missing') return; var SA=node3(sh.origin), SB=node3(sh.dest||sh.target); if(!SA||!SB) return; var f=sh.lastT!==undefined?sh.lastT:0.55, mp=prj([SA[0]+(SB[0]-SA[0])*f,0,SA[2]+(SB[2]-SA[2])*f]); if(!mp) return;
    so('text'); sp('x',mp.x.toFixed(1)); sp('y',(mp.y+3.5).toFixed(1)); sa('fill',C.red); sa('font-size',10); sa('font-family','Geist Mono,monospace'); sa('text-anchor','middle'); sa('pointer-events','none'); sr('>?</text>') });
  // earth
  var nearNight=G.night&&nightLeft(G)<=K.NIGHT_NEAR, crisis=can('events')&&(G.dir&&G.dir.ev||[]).some(function(ev){ return ev.lobe===undefined });
  if(es){ so('g'); sa('class','wd'); sa('data-act','tab'); sa('data-v','earth'); sp('transform','translate('+es.x.toFixed(1)+' '+es.y.toFixed(1)+')'); sr('>');
    so('circle'); sp('r',(er+5).toFixed(1)); sa('fill','transparent'); sr('/>');
    if(nearNight){ so('circle'); sp('r',(er+8).toFixed(1)); sa('fill','none'); sa('stroke',C.red); sa('stroke-width',2); sa('class','alarm'); sr('/>') }
    if(crisis){ so('circle'); sa('class','evearth'); sp('r',(er+12).toFixed(1)); sa('fill','none'); sa('stroke',C.red); sa('stroke-width',2); sa('pointer-events','none'); sr('/>') }
    sr('</g>') }
  if(S.k===SV.k&&SV.N&&SV.N.length===S.n+1&&SV.N[0]&&SV.N[0].isConnected){ var N=SV.N, V=S.V; for(i=0;i<V.length;i+=3){ var e=N[V[i]]; if(e.getAttribute(V[i+1])!==V[i+2]) e.setAttribute(V[i+1],V[i+2]) } return }
  el('map').innerHTML=S.s; SV.k=S.k; SV.N=el('map').querySelectorAll('*');
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
function drawCards(){ var b=can('yard')?building():[], h='', hk=hackNext(G);
  if(hk&&!hackOn()) h+='<button class="bcard hk" type="button" data-act="hack"><b>'+esc(T('hk_card'))+'</b><span>'+esc(hackWho(hk))+'</span><i>'+esc(T('hk_cardGo'))+'</i></button>';   // v5.09 (Nikita 10.11): the hack never opens by itself — this card, the Tech tab or the Ark window start it
  b.slice(0,3).forEach(function(s){ var w=forWorld(s);
    h+='<button class="bcard" type="button" data-act="tab" data-v="yard">'+shipIc(shipClass(s),26)+'<b>'+esc(T(shipClass(s))+' '+roman(hullGen(s)))+'</b><span>→ '+esc(w?pname(w):T('u_freeHull'))+'</span><i>'+s.t+' '+yrs(s.t)+'</i><u style="width:'+Math.round(hullProgress(s)*100)+'%"></u></button>' });
  if(b.length>3) h+='<div class="more">'+esc(fill(T('u_moreYard'),{n:b.length-3}))+'</div>';
  setHTML('cards',h);
  setHTML('zoom',can('zoom')?'<button type="button" data-act="zoom" data-v="out">−</button><button type="button" data-act="zoom" data-v="in">+</button><button type="button" data-act="zoom" data-v="fit">'+esc(T('u_fit'))+'</button>':'') }

/* ---------- top: the year, the Night, the advisor, the clock ---------- */
/* v4.49 (Claude's playtest 04.11): a world window stops the clock too — at 4× up to 9 years went by while one was read, and the
   redraw every year ate presses in it. A world window still closes on a click outside it (winLight); the tabs do not */
function winPause(){ return !!U.win }
function winLight(){ return !!U.win&&!!planet(U.win) }
function bigKind(){ if(!U.langPicked) return U.menu?null:'lang'; if(G.over) return 'over'; if(G.night&&!G.nightSeen) return 'night'; if(G.shiftOpen) return 'shift'; if(U.notes.length) return 'note'; return null }
function modal(){ return !!U.menu||!!bigKind()||!!U.pf||!el('logbox').hidden||hackOn() }
/* the hack (web/hack.js, Nikita 04.11): a finished drive mark or a paid ark level waits for it (core.js «the hack»).
   v5.09 (Nikita 10.11: «взлом происходит как-то неожиданно… Игрок должен сам решить, когда взламывать»): it never opens by itself.
   A waiting hack shows a card top right (drawCards), a flag on the tab and a button in the Tech panel / the Ark window; any of them
   sets U.hackGo and the hack opens on the next frame. The clock runs while it waits and stands while it is open. */
function hackOn(){ return !!(window.LBhack&&window.LBhack.isOpen()) }
function hackWho(h){ return h.k==='drive'? fill(T('hk_cGen'),{g:roman(h.g)}) : fill(T('hk_cArk'),{l:roman(h.l-1)}) }
function hackCheck(){ var h=G&&!G.over&&hackNext(G); if(!h||!U.hackGo||!window.LBhack||hackOn()||modal()||tutHold()) return; U.hackGo=false;
  var m=(G.hacks||0)+1, n=h.k==='drive'?Math.min(K.HACK_TOP,Math.max(1,h.g||1)):Math.max(1,h.l||1);   // v5.09: the two hacks are told apart — a drive mark meets the serpent at the number of the generation it opens (II → 1: h.g counts from 1), the ark meets the hive with as many rings as the level
  act(G,'hack_open',{k:h.k,lv:n});
  window.LBhack.open({T:T,kind:h.k==='drive'?'serpent':'hive',level:n,who:hackWho(h),seed:G.seed+m*7919,
    lore:T(L[U.lang]['hk_m'+m]!==undefined?'hk_m'+m:'hk_m0'),
    unlock:h.k==='drive'? fill(T('hk_unGen'),{g:roman(h.g)}) : fill(T('hk_unArk'),{l:roman(h.l-1)}),
    onTry:function(r){ if(r.k!=='start') act(G,'hack_'+r.k,{lv:r.lv,t:r.t,hp:r.hp}) },
    onWin:function(){ hackWin(G); autosave(); draw() },
    onLater:function(){ U.hackGo=false; act(G,'hack_later',{lv:n}); draw() } }) }
function halted(){ return U.paused||winPause()||modal()||tutHold() }
/* ❚❚ / Space: a toggle only when the player's own pause is all that holds the clock. With a tab, card or helper holding it
   too the press pins the pause — it used to flip a hidden U.paused, so closing the tab set the clock running (playtest 04.11) */
function pauseToggle(){ U.paused=!(U.paused&&!winPause()&&!modal()&&!tutHold()) }
var SPEEDS=[1,2,4];   // v4.42 (Nikita, 24.10): no 10× — presses were lost to the redraw at that pace
/* v4.46 (Nikita, 03.11: «уведомление вверху не нужно, удалить»): the WAKE number of v4.45 is gone from the top bar; the ark tab keeps it */
function drawTop(){
  var h='<div class="logo"><svg class="mk" viewBox="0 0 120 120" aria-hidden="true"><use href="#i-mark"/></svg>LAST BERTH</div><div class="yr"><small>'+esc(T('u_year'))+'</small><b>'+G.day+'</b></div>';
  if(can('night')&&G.night) h+='<div class="yr night"><small>'+ic('night',11,C.red)+esc(T('u_night'))+'</small><b>'+G.night+'</b><span>'+esc(fill(T('u_yearsN'),{n:nightLeft(G)}))+'</span></div>';
  if(can('ark')&&G.night){ var twk=arkWakeN(G), tab_=arkSouls(G); h+='<div class="yr wso" id="topwake"><small>'+esc(T('u_topWake'))+'</small><b style="color:'+C.food+'">'+num(twk)+'</b><span>·</span><b style="color:'+C.ark+'">'+num(Math.max(0,tab_-twk))+'</b></div>' }
  if(can('advisor')){ var n=advRows().filter(function(r){ return r[0]!==C.mid }).length; h+='<button class="adv'+(U.pop==='adv'?' on':'')+(n?'':' calm')+'" type="button" data-act="pop" data-v="adv">'+ic('warn',15)+'<span>'+esc(T('u_needs'))+'</span><b>'+n+'</b></button>' }
  var hz=halted();
  h+='<div class="spd">'+(hz?'<span class="pz">'+esc(T('u_paused'))+'</span>':'');
  if(can('speed')){ h+='<button type="button" data-act="spd" data-v="0" class="'+(hz?'on pzb':'')+'" title="Space">❚❚</button>';
    SPEEDS.forEach(function(v,i){ h+='<button type="button" data-act="spd" data-v="'+v+'" class="'+(!hz&&U.speed===v?'on':'')+'" title="'+(i+1)+'">'+v+'×</button>' }) }
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
/* v4.42: people are not a stockpile — the settlers and crews you send are a choice, not a trend (year 14 showed «▼ −2.3» while
   Earth grew). The strip and the Earth window show what Earth raises a year, as the shift report does. */
function peopleRate(){ return G.hungry?0:handsRate(G) }
/* v4.49 (Claude's playtest 04.11, Nikita: «а это»): the births multiplier is the main lever of the score and was invisible —
   ×FED_MIN on an empty larder up to ×FED_MAX with FED_YEARS of food in store; 0 while Earth starves */
function birthX(){ return G.hungry?0:fedMult(G) }
function birthCol(x){ return x>=K.FED_MAX-0.005?C.food:(x>=1?C.people:C.red) }
function birthTxt(x){ return '×'+x.toFixed(2) }
function drawRes(){ var E=G.earth, nd=G.need||earthNeed(G), h='';
  trendTick();
  RES.forEach(function(k){
    if(!can(k)){ h+='<div class="rc off"></div>'; return }
    var t=k==='people'?peopleRate():trend(k), tt='';
    if(t!==null){ var up=t>=0.05, dn=t<=-0.05; tt='<span class="'+(up?'up':(dn?'dn':'fl'))+'">'+(up?'▲ +':(dn?'▼ −':'— '))+Math.abs(t).toFixed(1)+esc(T('u_perYr'))+'</span>' }
    var bad=(k==='food'&&(G.hungry||E.food/Math.max(0.1,nd.food)<25))||(k==='metal'&&(G.cold||E.metal/Math.max(0.1,nd.metal)<25))||(k==='fuel'&&E.fuel<30);
    var fc=k==='food'?(G.foodFc||(G.day<200?foodForecast(G):null)):null, ends=fc?'<em>'+esc(fill(T('u_ends'),{y:fc.y}))+'</em>':'';   // v4.36: the core forecasts from year 200; the strip shows the end from year 0
    if(k==='people'){ var bx=birthX(); ends='<em style="color:'+birthCol(bx)+'" title="'+attr(fill(T('u_birthsHint'),{lo:birthTxt(K.FED_MIN),hi:birthTxt(K.FED_MAX),n:K.FED_YEARS,y:Math.floor(E.food/Math.max(0.1,nd.food||1))}))+'">'+esc(fill(T('u_birthTop'),{x:birthTxt(bx)}))+'</em>' }
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
  else if(foodShort(G)) F.earth=[fill(T('u_flFood'),{y:G.foodFc.y}),C.red];
  else if(G.cold||E.metal/Math.max(0.1,nd.metal)<25) F.earth=[T('u_flMetal'),C.red];
  else if(E.fuel<60) F.earth=[T('u_flFuel'),C.people];
  var b=building().length; if(b) F.yard=[fill(T('u_flYard'),{n:b}),C.ink];
  var fr=freeAtPier(), idle=fr.filter(function(s){ return !s.reserve&&!s.mutiny }).length, mut=fr.filter(function(s){ return s.mutiny }).length, cw=G.ships.filter(function(s){ return s.crewWait&&s.mode==='idle' }).length;
  if(cw) F.fleet=[fill(T('u_flCrew'),{n:cw}),C.red];
  else if(idle) F.fleet=[fill(T('u_flIdle'),{n:idle}),C.people];
  else if(mut) F.fleet=[fill(T('u_flMutiny'),{n:mut}),C.red];
  if(G.night){ var cv=arkConvoy(G);
    if(arkRings(G)<1) F.ark=[T('u_flArkNone'),C.ark];
    else if(!arkReady(G)) F.ark=[T('u_flArkDrive'),C.ark];
    else if(cv.ok) F.ark=[T('u_flConvoyOk'),C.food];
    else if(nightLeft(G)<=K.NIGHT_NEAR*2) F.ark=[fill(T('u_flConvoy'),{n:cv.have,k:cv.all}),C.ark] }   // v5.10: the convoy is a share of the fleet — flagged when the end is near
  if(canSurvey(G)==='ok') F.tech=[fill(T('u_flSurvey'),{n:SECTORS.length+1}),C.food];
  else if(!G.drive&&startDriveWhy(driveHost())==='ok') F.tech=[T('u_flDrive'),C.food];
  var hkF=hackNext(G); if(hkF&&!hackOn()) F[hkF.k==='drive'?'tech':'ark']=[T('u_flHack'),C.people];   // v5.09: a waiting hack flags its tab
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
/* nodes-1.02 (Nikita 05.11): Earth's exchange — what to get, which two resources pay, how much; the price in numbers, the refusal with its reason */
var EX_N={parts:[10,50,200],metal:[50,200,1000],food:[50,200,1000],fuel:[50,200,1000]};
function exOpen(){ return EX_RES.filter(function(k){ return can(k)&&isOpen(G,k) }) }
function exBlock(){ var rs=exOpen(); if(rs.length<3) return '';
  if(rs.indexOf(U.exGet)<0) U.exGet=rs.indexOf('parts')>=0?'parts':rs[0];
  var get=U.exGet, pay=rs.filter(function(k){ return k!==get }), pairs=[];
  for(var i=0;i<pay.length;i++) for(var j=i+1;j<pay.length;j++) pairs.push(pay[i]+'+'+pay[j]);
  if(pairs.indexOf(U.exPay)<0) U.exPay=pairs[0];
  var ns=EX_N[get]; if(ns.indexOf(U.exN)<0) U.exN=ns[0];
  var ab=U.exPay.split('+'), n=U.exN, c=exchangeCost(G,get,ab[0],ab[1],n), w=exchangeCheck(G,get,ab[0],ab[1],n);
  if(w===ab[0]||w===ab[1]) w=shortWhy(c,G.earth);
  var segB=function(act,v,on,lab){ return '<button type="button" data-act="'+act+'" data-v="'+v+'" class="'+(on?'on':'')+'">'+lab+'</button>' };
  var h=sec(esc(T('u_ex')),'');
  h+='<div class="lab">'+esc(T('u_exGet'))+'</div><div class="seg wide exs" id="exget" style="padding:2px 0 6px">'+rs.map(function(k){ return segB('exget',k,k===get,resIc(k,13)) }).join('')+'</div>';
  h+='<div class="lab">'+esc(T('u_exPay'))+'</div><div class="seg wide exs" id="expay" style="padding:2px 0 6px">'+pairs.map(function(pr){ var q=pr.split('+'); return segB('expay',pr,pr===U.exPay,resIc(q[0],13)+'+'+resIc(q[1],13)) }).join('')+'</div>';
  h+='<div class="seg wide exs" id="exn" style="padding:2px 0 6px">'+ns.map(function(x){ return segB('exn',x,x===n,'+'+num(x)) }).join('')+'</div>';
  h+='<div class="prow"><span class="lab">'+esc(T('u_price'))+'</span>'+price(c,G.earth)+'</div>';
  return h+btn(resIc(get,13)+' +'+num(n),'exgo',{r:get,a:ab[0],b:ab[1],n:n},'pri full',null,offW(w)) }
function winEarth(){ var E=G.earth, nd=G.need||earthNeed(G), t=peopleRate(), h='';
  h+=sec(esc(T('u_home')))+'<div class="hero" style="color:'+C.people+'">'+num(E.people)+'<span>'+esc(T('u_peopleW'))+(t!==null?' · '+(t>=0?'+':'−')+Math.abs(t).toFixed(1)+esc(T('u_perYr')):'')+'</span></div>';
  var bx=birthX(); h+=row(resIc('people',13)+esc(T('u_births')),birthTxt(bx),birthCol(bx))+hint(esc(fill(T('u_birthsHint'),{lo:birthTxt(K.FED_MIN),hi:birthTxt(K.FED_MAX),n:K.FED_YEARS,y:Math.floor(E.food/Math.max(0.1,nd.food||1))})));
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
  var xb=exBlock(); if(xb) h+='<div id="exblk">'+xb+'</div>';   // v5.01: the tutorial points here (m26)
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
  if(kind==='lang') return '<div class="nwin" id="lang"><svg class="lmark2" viewBox="0 0 120 120" aria-hidden="true"><use href="#i-markf"/></svg><div class="icap">LAST BERTH<span>'+(U.saveDay!==null&&U.saveDay!==undefined?'':'')+'</span></div><div class="langrow"><button class="b pri" type="button" data-lang="en">Start</button></div>'+
    (U.saveDay!==null&&U.saveDay!==undefined?'<button class="b full" type="button" data-act="loadauto">'+esc(fill(L.en.u_continue||'',{y:U.saveDay}))+'</button>':'')+'</div>';
  /* v4.36: the end, the Night and the shift speak in the Institute's voice, Alexandra's line under it (NAR N-13, N-09, N-04) */
  if(kind==='over'){ var btns='<div class="nbtn">'+btn(esc(T('exportLog')),'export')+btn(esc(T('newGame')),'new',null,'pri')+'</div>';
    if(G.over==='night'){ var sl=G.souls||0, lb=G.left||leftBehind(G), tier=sl<=0?0:(sl<300?1:(sl<1200?2:3)), behind=lb.home+lb.hulls+lb.colonies+lb.transit;
      var sailed=!G.grounded&&(G.boarded||0)>0, why='', noWake=sailed?G.boarded-sl:0;
      if(!sailed){ if(G.grounded) why=fill(T('nar_rsDrive'),{g:roman(G.arkMark)}); else why=T('nar_rsLevel') }
      return '<div class="nwin '+(sailed&&tier?'good':'bad')+'">'+icap(T('u_year')+' '+G.day+' · '+T('u_theNight'))+
        (sailed?'<div class="nbig" style="color:'+C.ark+'"><small>'+esc(T('nar_aboard'))+'</small><b>'+num(G.boarded)+'</b></div><p>'+esc(fill(T('nar_N13a'),{n:num(G.boarded)}))+'</p>'
               :'<p>'+esc(fill(T('nar_N13b'),{reason:why}))+'</p>')+'<div class="rws">'+
        rw2(esc(T('statSouls')),num(G.boarded||0),(G.boarded||0)?'good':'bad')+
        rw2(esc(T('statWoke')),G.grounded?esc(T('arkNoDrive')):num(sl)+' · '+Math.round((G.wake||0)*100)+'%',tier?'good':'bad')+(noWake>0?rw2(esc(T('statNoWake')),num(noWake),'warn'):'')+
        rw2(esc(T('statBerths')),arkRings(G)+' · '+num(arkCaps(arkRings(G))))+(G.convoy?rw2(esc(T('statConvoy')),G.convoy.have+' / '+G.convoy.all):'')+(G.cargo?rw2(esc(T('statCargo')),price(G.cargo,null)):'')+
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
/* a word from a crew: only the Night, the ark drive and the last flights still take the whole screen. The rest are strips
   in the corner of the chart: a face, a name, the first line. A press opens the strip where it is; unread ones wait in the archive */
var STRIP_MS=30000, STRIPS=3;
function letterById(id){ return (G.letters||[]).filter(function(l){ return l.id===id })[0]||null }
function letterText(f){ var v=VOICE[U.lang]||{}, d={}; for(var q in f.d) d[q]=f.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p); return {who:v[f.role]||f.role,line:fill(v[f.k]||f.k,d)} }
function letterRow(f,open,fresh){ var t=letterText(f);
  return '<button type="button" class="ltr'+(open?' open':'')+(fresh?' fresh':'')+(f.read?'':' unread')+'" data-act="ltr" data-v="'+f.id+'"><canvas width="64" height="64" data-seed="'+f.seed+'"></canvas><span class="lth"><b>'+esc(f.name)+'</b><i>'+esc(t.who)+' · '+esc(fill(T('pfNo'),{n:f.no}))+(f.sub?' · '+esc(f.sub):'')+'</i><em>'+String(f.day).padStart(4,'0')+'</em></span><span class="ltl">'+esc(t.line)+'</span>'+(open?'<u>'+esc(T('pfOk'))+'</u>':'')+'</button>' }
function paintLetters(box){ box.querySelectorAll('canvas[data-seed]').forEach(function(c){ if(!c._done){ c._done=true; drawPortrait(c,+c.getAttribute('data-seed')) } }) }
function lettersUnread(){ return (G.letters||[]).filter(function(l){ return !l.read }).length }
function drawPF(){
  var L0=el('pfL'), f=U.pf;
  if(f&&!bigKind()){
    if(L0._f===f&&L0._lang===U.lang) return;
    L0._f=f; L0._k=null; L0._lang=U.lang; L0.className='full';
    var t=letterText(f);
    L0.innerHTML='<div class="pfbox"><canvas width="64" height="64"></canvas><div><div class="pfk"><span>'+esc(T('pfTitle'))+'</span><span>'+String(f.day!==undefined?f.day:G.day).padStart(4,'0')+'</span></div>'+
      '<div class="pfn">'+esc(f.name)+'</div><div class="pfm">'+esc(t.who)+' · '+esc(fill(T('pfNo'),{n:f.no}))+(f.sub?' · '+esc(f.sub):'')+'</div>'+
      '<div class="pfl">'+esc(t.line)+'</div>'+btn(esc(T('pfOk')),'pfok',null,'pri')+'</div></div>';
    drawPortrait(L0.querySelector('canvas'),f.seed); return }
  L0._f=null;
  var now=Date.now(), all=G.letters||[]; U.strips=(U.strips||[]).filter(function(s){ return s.until>now||s.id===U.ltOpen });
  if(f||U.win||bigKind()||!all.length){ if(L0.innerHTML){ L0.innerHTML=''; L0._k=null } L0.className=''; return }
  var un=lettersUnread(), key=[U.lang,!!U.tab,un,all.length,U.ltOpen,U.pop==='letters',U.strips.map(function(s){ return s.id }).join()].join('|');
  if(L0._k===key) return;   // built only when something changed, or a press on a strip would be lost to the redraw
  L0._k=key; L0.className=(U.strips.length?'low':'arch')+(U.tab?' beside':'');   // not «side»: the panel's own rule would stretch it to the full height (the card cut off under the top bar, 26.10)
  L0.innerHTML=U.strips.map(function(s){ var l=letterById(s.id); return l?letterRow(l,U.ltOpen===l.id,now-(s.until-STRIP_MS)<2400):'' }).join('')+
    '<button type="button" class="ltarch'+(un?' new':'')+(U.pop==='letters'?' on':'')+'" data-act="pop" data-v="letters">'+ic('peopleA',14)+'<span>'+esc(T('u_letters'))+'</span><b>'+all.length+'</b>'+(un?'<em>'+esc(fill(T('u_lettersNew'),{n:un}))+'</em>':'')+'</button>';
  paintLetters(L0) }
function popLetters(){ var all=(G.letters||[]).slice().reverse();
  return '<div class="ltrs">'+sec(esc(T('u_letters')),all.length)+all.map(function(l){ return letterRow(l,U.ltOpen===l.id) }).join('')+'</div>' }

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
var OPEN_ALL=['people','food','line','speed','fuel','earth','metal','order','yard','fleet','parts','machines','tech','advisor','worlds','sectors','events','ring2','zoom','ring3','night','ark','reserve','lift','evac'];
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
   pre:function(){ closeAll(); var w=PLANETS.filter(function(p){ return p.sec===1&&!(G.ghost&&G.ghost[p.id]) }).sort(function(a,b){ return a.dist-b.dist })[0]; U.tut.r2=w?w.id:null; CFIT=true; CFITK=''; return {} }},
 m18:{at:'#top .night',mode:'see',k:'tut_m18',pre:closeAll},
 m28:{at:'#topwake',mode:'see',k:'tut_m28',pre:closeAll},   // v5.10: WAKE · SLEEP ON in the top bar, told with the date of the Night
 m19:{at:'#tabs [data-v="ark"]',mode:'see',k:'tut_m19',pre:function(){ closeAll(); return {} }},
 /* by occasion: once each, when the thing first happens */
 m7:{at:'#ovl .wh small',mode:'see',k:'tut_m7'},
 m13:{at:'#mach',mode:'see',k:'tut_m13'},
 m27:{at:'#ovl .hold',mode:'see',k:'tut_m27'},   // v5.10: the hive, the first time the Ark window shows it
 m20:{at:'#cvring',mode:'see',k:'tut_m20'},   // v5.10: the convoy is the ring around the hive (was the 3-2-1 block)
 m21:{at:'#rw-lift',mode:'see',k:'tut_m21'},
 m22:{at:'#ovl [data-act="evac"]',mode:'see',k:'tut_m22',pre:function(){ var d=U.tut.dead; if(d&&G.colonies[d]) openWorld(d); return {} }},
 m25:{at:'#hubblk',mode:'see',k:'tut_m25'},   // v5.01: the hub, the first time a world card shows it
 m26:{at:'#exblk',mode:'see',k:'tut_m26'},   // v5.01: Earth's exchange, the first time the Earth tab shows it
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
 {t:'home',opens:['earth'],q:['N03'],soft:1,when:function(){ return (G.delivered.food||0)>0||G.day>=80 }},
 {t:'yard',opens:['metal','order','yard'],q:['m8','mM','m9'],when:function(){ return (reach(G)>=2&&Object.keys(G.colonies).some(function(k){ return !onLine(G,k).length })&&!freeHullAtPier())||(reach(G)>0&&!offLine())||G.day>=150 }},
 {t:'fleet',opens:['fleet'],q:['m10'],soft:1,when:function(){ return builtHulls()>=4||G.day>=300 }},
 {t:'slow',opens:[],q:['m11'],soft:1,when:function(){ return !!halfWorld()||G.day>=400 }},
 {t:'parts',opens:['parts','machines','tech'],q:['m12','m14'],when:function(){ var h=currentHull(G,'hauler'); return (G.delivered.parts||0)>0||G.earth.parts>0||(h!==null&&reach(G)>=HULLS[h].reach)||G.day>=450 }},
 {t:'advisor',opens:['advisor','worlds'],q:['m15'],soft:1,when:function(){ return reach(G)>=5||advRows().length>0||G.day>=500 }},
 {t:'events',opens:['sectors','events'],q:['N07','m17'],soft:1,when:function(){ return evOn()||G.day>=700 }},
 {t:'ring2',opens:['ring2','zoom'],q:['N08','m16'],when:function(){ return !ringFree(0).length||settledCount(G)>=5||G.day>=700||!!G.night }},
 {t:'night',opens:['ring3','night','ark','reserve','lift','evac'],q:['m18','m28','m19'],when:function(){ return !!G.night&&!!G.nightSeen }}
];
function stepReady(i){ var s=STEPS[i]; if(!s) return false; return s.when()||(!!s.soft&&stepReady(i+1)) }
var STEP_SAFE=8;   // HANDOFF: no hull is lost before the advisor step (G.safe)
function tutOpen(keys){ var t=U.tut; if(!t.lock) return;
  keys.forEach(function(k){ if(t.open[k]) return; t.open[k]=1; if(TAB_KEYS[k]) t.fresh[k]=1;
    if(k==='metal'||k==='fuel'||k==='parts') openRes(G,k) }) }
function tutOpenAll(){ var t=U.tut; OPEN_ALL.forEach(function(k){ t.open[k]=1 }); t.fresh={}; ['metal','fuel','parts'].forEach(function(k){ openRes(G,k) }) }
function tutPush(id,p){ var t=U.tut; if(TMSG[id]&&!t.help) return; if(NAR[id]&&!TUTX.story) return;
  if(t.seen[id]) return; t.seen[id]=1; t.q.push({id:id,p:p||null}) }
function tutStep(i){ var t=U.tut, s=STEPS[i]; t.step=i; tutOpen(s.opens); if(s.go) s.go(); s.q.forEach(function(id){ if(id==='N03'&&!(G.delivered.food>0)) return; if(id==='m12'&&!partsHome()) return; if((id==='N07'||id==='m17')&&!evOn()) return; tutPush(id) }) }
function evOn(){ return !!(G.dir&&G.dir.ev&&G.dir.ev.length) }   // v4.40: a soft step opened early has no sector to name — N07 said «Space over  flows…»
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
  if(quiet&&t.step>=9&&!t.seen.N07&&evOn()){ tutPush('N07'); tutPush('m17') }   // v4.40: the events step told when the first event comes
  if(!t.help||!quiet||!w) return;   // the window ones speak only while that window is up
  var c=planet(w)&&G.colonies[w], ll=c&&lastLift(G,w);
  if(w==='earth'||w==='yard'||w==='ark') tutPush('m7');
  if(w==='ark'&&G.night&&can('ark')){ tutPush('m27'); tutPush('m20') }
  if(c&&can('machines')&&(kitOpen(G)||kitTier(c))) tutPush('m13');
  if(c&&can('lift')&&ll&&ll.st!=='going') tutPush('m21');
  if(c&&can('parts')&&planet(w).kind!=='works') tutPush('m25');
  if(w==='earth'&&exOpen().length>=3) tutPush('m26') }
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
function tutHold(){ var t=U.tut; return !!t.msg||!!(t.nar&&t.nar.hold) }
/* the press: a rule lets through only its lit thing; her voice closes on any press */
function tutTarget(m){ var s=typeof m.at==='function'?m.at():m.at, e=s?document.querySelector(s):null;
  if(e&&!e.getClientRects().length){ var wp=e.closest&&e.closest('[data-pan][hidden]'), q=wp&&wp.dataset.pan.split(':'); if(q&&U[q[0]]!==q[1]){ U[q[0]]=q[1]; setTimeout(draw,0) } }   // v5.13/5.16: a tab of the world card or of Tech
  return e&&e.getClientRects().length?e:null }
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
  if(t.msg){ if(mine) e.preventDefault(); if(!e.repeat&&t.msg.mode==='see'&&mine&&!/^[1-4]$/.test(e.key)&&Date.now()-t.msg.at>300) msgDone();
    else if(!e.repeat&&t.msg.mode!=='see'&&e.code==='Space'&&can('speed')){ pauseToggle(); draw() }   // v4.50: Space under a held step pins the pause, as under a window
    return true }
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
      V.innerHTML='<div class="'+faceCls(faceOf(N2.k))+'"></div><div><div class="hnm">'+esc(T('tut_name'))+'</div><div class="vtx">'+N2.k.map(function(k){ return esc(fill(T(k),n.p)) }).join('<br>')+'</div></div><i class="vbar"></i>';
      V.className=''; void V.offsetWidth; V.className='on' }
    V.classList.toggle('side',!!U.tab); var pf=el('pfL'); V.style.bottom=pf.classList.contains('low')?(pf.offsetHeight+24)+'px':'' }   // a crew card at the foot of the map: her voice stands above it
  else if(V._k){ V._k=''; V.className=''; V.innerHTML='' } }
/* Alexandra's line under the Institute's in a big window; her face — by the key whose text it is (the callers pass the text) */
function alx(s){ var k=''; for(var q in FACE) if(T(q)===s){ k=q; break } var f=faceOf([k]);
  return '<div class="alx'+(f==='full'?' full':'')+'"><div class="'+faceCls(f)+'"></div><div><div class="hnm">'+esc(T('tut_name'))+'</div><p>'+esc(s)+'</p></div></div>' }
/* her face (Nikita 04.11, design/ALEXANDRA-FACES.md): the pose by the key of her line — the last line with a pose wins (N05: calm,
   then grief); a key not here is talk. The pictures are web/alexandra (build.py: .fc-<pose>, .afull — full height, the finale).
   The helper keeps the bust (.ava): a rule has no face. N04 and N13 are not in FACES.md — Claude's choice, awaits Nikita. */
var FACE={nar_N02:'happy',nar_N03:'happy',nar_N05_2:'grief',nar_N06_2:'sad',nar_N07:'surprised',nar_N08:'confused',nar_N10_1:'smile',nar_N10_2:'smile',
  nar_N11:'crossed',nar_N12b:'crossed',nar_N12c:'alarm',nar_N04a_a:'smile',nar_N13a_a:'full',nar_N13b_a:'full',nar_N13c_a:'full',nar_N13d_a:'full'};
function faceOf(keys){ var f='talk'; keys.forEach(function(k){ if(FACE[k]) f=FACE[k] }); return f }
function faceCls(f){ return f==='full'?'hav afull':'hav fc fc-'+f }
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
  setHTML('side',h,t+':'+U.filter); el('side').className=t?'on':''; el('app').classList.toggle('sideon',!!t) }   // v4.42: the chart gives way to the panel instead of hiding under it
function drawWin(){ var w=U.win, h='';
  if(w==='earth') h=winEarth(); else if(w==='yard') h=winYard(); else if(w==='ark') h=winArk(); else if(w&&planet(w)) h=winWorld(w);
  setHTML('ovl',h,w); el('ovl').className=h?'on':'' }
function drawPop(){ var p=U.pop, h='', cls='';
  if(p==='adv'){ h=popAdv(); cls='p-adv' } else if(p==='menu'){ h=popMenu(); cls='p-menu' } else if(p&&p.indexOf('pick:')===0){ h=picker(); cls='p-center' } else if(p==='letters'&&G.letters&&G.letters.length){ h=popLetters(); cls='p-letters' }
  if(!h) U.pop=null;
  if(setHTML('pop',h,p)&&p==='letters') paintLetters(el('pop')); el('pop').className=h?'on '+cls:'' }
function focusFix(){ var now=Date.now();
  if(U.focus){ U.focusK=U.focus; U.focusT=now; U.focus=null; var e0=document.querySelector(U.focusK); if(e0) e0.scrollIntoView({block:'nearest'}) }
  if(!U.focusK) return; if(now-U.focusT>3000){ U.focusK=null; return }
  var e=document.querySelector(U.focusK); if(e&&!e.classList.contains('focus')){ e.style.animationDelay=-(now-U.focusT)+'ms'; e.classList.add('focus') } }
/* Nikita, 02.11: «хочется ближе к концу накала» — static and dark over the map for the last NIGHT_FX years, growing to the end. Looks only: the layer takes no clicks and lies under the cards */
var NIGHT_FX=300, NIGHT_FX_LAST=50;   // v4.46 (Nikita, 03.11): from 300 years out
function drawNightFx(){ var e=el('mapbox'); if(!e) return; var left=G.night&&can('night')?nightLeft(G):Infinity, on=left<=NIGHT_FX, last=left<=NIGHT_FX_LAST;
  e.classList.toggle('nfon',on); e.classList.toggle('nflast',last); e.classList.toggle('nfstill',on&&halted()); if(!on) return;
  e.style.setProperty('--nf',(0.1+0.9*(1-Math.max(0,left)/NIGHT_FX)).toFixed(3));
  e.style.setProperty('--nl',(last?Math.pow(1-Math.max(0,left)/NIGHT_FX_LAST,0.7):0).toFixed(3)) }
function draw(){
  if(!G) return;
  voiceWatch(); watchRings(); tutTick();
  drawTop(); drawRes(); drawTabs(); drawMap(); drawNightFx(); drawEvBar(); drawCards(); drawSide(); drawWin(); drawPop(); drawBig(); drawPF(); focusFix(); tutPlace();
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
function stRow(s,noT){ var a=hullSt(s), t=noT&&s.mode==='transit'?a[1].replace(/ · \d+ \S+$/,''):a[1];   // v5.14: the world card drops « · N years»
  return '<span class="hst" style="color:'+a[2]+'">'+ic(a[0],15,a[2])+esc(t)+'</span>'+
    (s.moveTo&&planet(s.moveTo)?'<span class="hst" style="color:'+C.ink+'">'+ic('movesTo',15)+esc(fill(T('u_stMoveTo'),{p:pname(s.moveTo)}))+'</span>':'') }
function hullRow(s,acts,id,noT){ var g=hullGen(s);
  return '<div class="hr"'+(id?' id="'+id+'"':'')+'>'+shipIc(shipClass(s),30)+genB(g,g<(G.gen||0)-1)+'<span class="hn">'+esc(T(shipClass(s))+' '+fill(T('hullNo'),{n:s.id}))+'</span><span class="hs">'+stRow(s,noT)+'</span><span class="ha">'+(acts||'')+'</span></div>' }
/* the speed a hull flies at: its own times the drive's — the drive now, or at mark `at` (v4.49: Tech showed the bare hull speed, the Yard this one) */
/* Nikita, 12.11 (F-feedback 11.11, «поколение выше летит чуть быстрее»): no speed number — a percent against the generation before; the first generation shows none */
function pctUp(a,b){ return '+'+Math.round((b/a-1)*100)+'%' }
function specIcons(h){ var pv=h.gen>0;
  return '<span>'+ic('hold',15,C.mid)+num(h.cap)+'</span>'+(pv?'<span>'+ic('speed',15,C.mid)+pctUp(1,K.GEN_SPEED)+'</span>':'')+'<span>'+ic('range',15,C.mid)+esc(fill(T('u_ringN'),{n:hullRange(h)+1}))+'</span>' }
function hullCost(h){ return {metal:h.metal,fuel:h.fuel,parts:h.parts||0,people:h.crew||0} }
function clsSeen(cls){ return cls==='courier'||can('parts') }   // v4.36: a hull that costs parts shows up once parts are open

/* ---------- the world window ---------- */
function stepOrder(pid){ var col=!!G.colonies[pid];
  return PLANETS.filter(function(p){ return secVis(p.sec)&&!(G.ghost&&G.ghost[p.id])&&(!!G.colonies[p.id])===col })
    .sort(function(a,b){ return a.sec-b.sec||a.ang-b.ang }).map(function(p){ return p.id }) }
function openWorld(pid,focus){ U.pop=null; U.win=pid; U.scrapArm=null; var f=(focus||'').split(':');
  if(f[1]&&(f[0]==='free'||f[0]==='other')) U.addTab=f[0];   // v4.38: the advisor names a hull — open the tab she is on and light her
  U.focus=!focus?null:f[1]?'#'+{free:'ah',other:'ah',oc:'oc',hr:'hr'}[f[0]]+'-'+f[1]:FOCUS[focus];
  if(focus) U.wtab=f[1]?'world':({evac:'world',lift:'world',add:'world',ord:'world',mach:'up'}[focus]||U.wtab) }   // v5.13: the card's tabs
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
  var rs=function(s){ return s.reserve?1:0 };   // v4.50 (Claude's playtest 04.11): a hull kept for the ark goes last (Claude — awaiting review)
  var fit=list.filter(function(s){ return s.cap>=pop }).sort(function(a,b){ return rs(a)-rs(b)||legDays(G,pid,'earth',a)-legDays(G,pid,'earth',b)||a.cap-b.cap });
  if(fit.length) return fit[0];
  return list.sort(function(a,b){ return rs(a)-rs(b)||b.cap-a.cap })[0] }
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
  var v=ll.st==='cut'?T('u_liftCut'):(ll.st==='none'?T('u_liftNone'):String(ll.y));   // v5.14 (Nikita 11.11): no «· N years», the colour warns
  return row(ic('lift',13,C.people)+esc(T('u_lastLift')),esc(v),ll.st==='cut'?C.red:(ll.st==='none'||ll.n<=25?C.red:(ll.n<=K.LIFT_WARN?C.people:null)),'rw-lift') }
/* nodes-1.01 (Nikita 05.11): the hub — build one here, or send this world's goods to one; on a hub, its depot and the hands waiting for its feeders */
var HUB_RES=['metal','food','fuel','parts'];
function hubCapP(){ return {m:hubCap(G),g:roman((G.gen||0)+1)} }
function hubBlock(p,c,deadW){ if(p.kind==='works') return '';
  var pid=p.id, h='';
  var head2=sec(esc(T('u_hub')),esc(fill(T('u_hubN'),{n:hubCount(G),m:hubCap(G)})));
  if(c.hub){ var f=feedersOf(G,pid);
    h+=head2+'<div id="hubstore">';
    HUB_RES.forEach(function(k){ if(can(k)) h+=row(resIc(k,13)+esc(T(k)),num(Math.floor(c.store[k]||0)),C[k]) });
    h+=row(resIc('people',13)+esc(T('u_hubWait')),num(Math.floor(c.wait||0)),C.people)+row(esc(T('u_hubFeeders')),f.length?esc(f.map(pname).join(', ')):'0')+'</div>';
    var rb=hubRefund(G,pid);   // v5.12 (Nikita 11.11): pull the hub down for a quarter of its price
    h+='<div class="prow" id="hubraze"><span class="lab">'+esc(T('u_hubBack'))+'</span><span>'+resIc('metal',13)+num(rb.metal)+' '+resIc('parts',13)+num(rb.parts)+'</span></div>'+btn(esc(T('u_hubRaze')),'hubraze',{p:pid},'full','takeoff');
    return h }
  if(!c.via){ var k2=hubCost(G), w=hubBuildCheck(G,pid);
    if(w==='metal'||w==='parts') w=shortWhy(k2,G.earth); else if(w==='hubCap') w=['hubCap',hubCapP()];
    h+=head2+'<div class="prow"><span class="lab">'+esc(T('u_price'))+'</span>'+price(k2,G.earth)+'</div>'+btn(esc(T('u_hubBuild')),'hubbuild',{p:pid},'full','build',offW(w)) }
  return h }
/* v5.17 (Nikita 12.11: «доставка куда земля или хаб была во вкладке линии, а то не ясно куда и как перевести судно»): where the line runs — Earth or a hub — sits over the hulls of the line, not in the hub block */
function viaSeg(p,c){ if(p.kind==='works'||c.hub||!can('parts')) return '';
  var pid=p.id, hubs=Object.keys(G.colonies).filter(function(k){ return k!==pid&&isHub(G,k)&&!isDead(k) }); if(!hubs.length) return '';
  var cur=c.via||'earth';
  return '<div class="lab">'+esc(T('u_viaTo'))+'</div><div class="seg wide" id="viaseg" style="padding:2px 0 6px">'+
    '<button type="button" data-act="via" data-p="'+pid+'" data-v="earth" class="'+(cur==='earth'?'on':'')+'">'+esc(T('u_viaEarth'))+'</button>'+
    hubs.map(function(k){ var r=hubCheck(G,pid,k); return '<button type="button" data-act="via" data-p="'+pid+'" data-v="'+k+'" class="'+(cur===k?'on':'')+'"'+off(r)+'>'+esc(pname(k))+'</button>' }).join('')+'</div>' }
/* nodes-1.01: a hull a line will not take says why — the courier limit, a hub's run to Earth, a hub too far for a courier, or range */
function lineWhyP(code){ return code==='courierLine'?{n:K.COURIER_LINE}:null }
function lineWhyShort(code){ return code==='range'?T('u_outReach'):fill(T('u_lw_'+code),lineWhyP(code)) }
function machines(p,c){ if(!can('machines')||(!kitOpen(G)&&!kitTier(c))) return '';   // before the Gen III yards the block is only noise
  var kt=kitTier(c), kc=kitCost(c), kr=canKit(G,p.id), hold=lineHold(G,p.id), h='';
  if(kitIdle(G,p.id)){ if(!kt) return '';   // v5.12 (Nikita 11.11): a spent seam sold a tier for +0 that burnt fuel
    return '<div id="mach">'+sec(esc(T('u_machines')),esc(fill(T('u_tierStand'),{t:roman(kt-1)})).toUpperCase())+hint(esc(T('u_kitIdle')))+'</div>' }
  if(kt) h+=sec(esc(T('u_machines')),esc(fill(T(kitLive(c)?'u_tierRun':'u_tierStand'),{t:roman(kt-1)})).toUpperCase());   // v5.13: no machines yet — the package card is the block
  if(kt){ var burn=kitBurn(c); h+=row(resIc('fuel',13)+esc(T('kitFuel')),dec(burn)+esc(T('u_perYr')),C.fuel)+row(resIc('fuel',13)+esc(T('u_fuelOnSite')),esc(fill(T('u_yearsN'),{n:Math.floor((c.store.fuel||0)/Math.max(0.01,burn))})),kitLive(c)?null:C.red);
    if(!kitLive(c)) h+=alertBox('stopped',esc(T('kitStarved'))) }
  if(c.kit) h+=hint(esc(fill(T(hold>=c.kit.w?'u_kitWaiting':'u_kitTooBig'),{t:roman(c.kit.tier-1),w:num(c.kit.w),h:num(hold)})));
  else if(c.kitShip){ var ks=shipById(G,c.kitShip); h+=hint(esc(fill(T('kitAboard'),{n:c.kitShip,y:ks?ks.t:0}))) }
  else if(kr==='kitgate') h+=hint(esc(fill(T('u_kitGate'),{g:roman(K.KIT_GATE_DRIVE)})));
  else if(kr==='tiermax') h+=hint(esc(T('kitMax')));
  else h+=pkgCard(p,c,kc,kr,hold);
  return '<div id="mach">'+h+'</div>' }
/* v5.13 (Nikita 11.11: «ярусы надо поменять на upgrade package, который показывает, сколько он даст сверху и сколько дополнительно будет
   потреблять»): the next tier as a package — what it adds a year, everything more it eats a year (a forge's tier multiplies its metal and
   rations too, not only the fuel), the tiers as pips, the price and the button; the hold rule says what to do */
function pkgCard(p,c,kc,kr,hold){ var kg=kitGain(G,p.id); if(!kg) return '';
  var d=Math.max(0,kg.with-kg.now), res=kg.res, extra=[];
  if(p.kind==='works'){ extra.push(['metal',d*K.REFINE_METAL]); extra.push(['food',d*K.REFINE_FOOD]) }
  extra.push(['fuel',K.KIT_FUEL]);
  var pips=''; for(var i=0;i<K.KIT_MAX;i++) pips+='<u class="'+(i<kitTier(c)?'on':'')+'"></u>';
  var cost={metal:kc.metal,parts:kc.parts}, w=(kr==='metal'||kr==='parts')?shortWhy(cost,G.earth):kr;
  return '<div class="pk" id="pkg"><div class="pk-h"><span class="pi">'+ic('upgrade',18,C.people)+'</span><b>'+esc(fill(T('u_pkg_'+(p.kind==='works'?'works':p.kind)),{t:roman(kc.tier-1)}))+'</b><span class="pips">'+pips+'</span></div>'+
    '<div class="pk-g">'+resIc(res,20)+'<span style="color:'+C[res]+'">+'+dec(d)+'</span><small>'+esc(fill(T('u_pkgGain'),{r:T(res).toLowerCase()}))+'</small></div>'+
    '<div class="pk-x"><span class="l">'+esc(T('u_pkgEats'))+'</span>'+extra.filter(function(x){ return can(x[0]) }).map(function(x){ return '<span>'+resIc(x[0],12)+'+'+dec(x[1])+'</span>' }).join('')+'<span class="l">'+esc(T('u_pkgYear'))+'</span></div>'+
    '<div class="pk-f"><span>'+price(cost,G.earth)+'</span>'+btn(esc(T('u_pkgOrder')),'kit',{p:p.id},'pri','upgrade',offW(w))+'</div>'+
    (hold<kc.w?'<div class="pk-n">'+ic('hold',14,C.red)+'<span>'+esc(fill(T('u_pkgHold'),{w:num(kc.w),h:num(hold)}))+'</span></div>':'')+'</div>' }
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
    L0+=row(esc(T('u_sector')),esc(lobeTxt(p)));
    L0+=sec(esc(T('u_found')))+row(resIc('people',13)+esc(T('u_settlers')),esc(fill(T('u_peopleN'),{n:party})),C.people)+'<div class="lab">'+esc(T('u_whoGoes'))+'</div>';
    if(hs.length) L0+=hs.map(function(s){ return '<button type="button" class="radio'+(who===s?' on':'')+'" data-act="who" data-p="'+pid+'" data-s="'+s.id+'"><i></i>'+shipIc(shipClass(s),26)+genB(hullGen(s))+'<b>'+esc(fill(T('hullNo'),{n:s.id}))+'</b><span>'+(s.reserve?'<em style="color:'+C.ark+';font-style:normal">'+esc(T('u_stReserve'))+'</em> · ':'')+esc(fill(T('u_whoLine'),{c:num(s.cap),n:legDays(G,'earth',pid,s)}))+'</span></button>' }).join('');
    else L0+='<div class="why">'+esc(freeAtPier().filter(function(s){ return !s.mutiny&&!s.crewWait }).length?fill(T('u_noneReach'),{n:p.sec+1}):T('u_noFree'))+'</div>';
    var w=!who?'nofree':(party<K.MIN_FOUND?['fewhands',{n:K.MIN_FOUND-party}]:shortWhy({fuel:fuel,people:party},G.earth));
    if(enRoute(G,pid)) w='enroute';
    L0+='<div class="prow"><span class="lab">'+esc(T('u_price'))+'</span>'+price({fuel:fuel,people:party},G.earth)+'</div>'+btn(esc(T('u_sendSettlers')),'send',{p:pid},'pri full','send',offW(w==='ok'||(w[0]==='ok')?'ok':w));
    return '<div class="win sm">'+head(esc(pname(pid)),wsub(p,T('u_free')),wmark(p.kind,false,16))+'<div class="bd">'+L0+'</div>'+nav+'</div>' }
  if(st==='dead') return '<div class="win sm">'+head(esc(pname(pid)),wsub(p,T('u_workedOut')),wmark(p.kind,true,16))+'<div class="bd"><div class="big mid">'+ic('workedout',22,C.mid)+esc(T('u_seamDead'))+'</div>'+
    row(resIc('people',13)+esc(T('people')),num(c.pop),C.people)+liftRow(p)+(can('parts')?'<div id="hubblk">'+hubBlock(p,c,true)+'</div>':'')+evacBlock(p)+'</div>'+nav+'</div>';   // v5.12 (Nikita 11.11): a hub on a worked-out world
  var lr=lineRate(G,pid);
  L0+=sec(esc(T('u_world')));
  if(p.kind==='works'){ var wh=worksHungry(pid), fr=feedRates(G,pid);
    var MK='<div id="rw-carries">'+row(resIc('parts',13)+esc(T('u_makes')),wh.idle>5?'0':dec(lr.makes)+esc(T('u_perYr')))+row(ic('toEarth',13,C.mid)+esc(T('u_lineCarries')),dec(lr.carries)+esc(T('u_perYr')))+row(esc(T('u_onSurface')),num(c.store.parts||0))+'</div>';
    L0+=MK+row(resIc('people',13)+esc(T('people')),num(c.pop),C.people)+liftRow(p);
    /* v4.46 (Nikita, 03.11: «игра не говорит, сколько топлива нужно и сколько возится»): each thing the works burn, what the line brings of it and how long the stock lasts */
    var fd=feedSplit(pid), ff=lineFit(G,pid), yr={metal:wh.metal,food:wh.food,fuel:(c.store.fuel||0)/Math.max(0.01,fr.fuel||0)};
    L0+=sec(esc(T('u_eats')));
    Object.keys(fd).forEach(function(k){ var f=fd[k];
      L0+=row(resIc(k,13)+esc(T(k)),esc(fill(T('u_feedRow'),{n:dec(f.need),b:dec(f.brings)})),yr[k]<10||f.brings<f.need*0.95?C.red:null) });
    if(wh.idle>5) L0+=alertBox('starving',esc(T('u_worksIdle')));
    else if(wh.low<10) L0+=alertBox('starving',esc(fill(T('u_worksLow'),{n:Math.floor(wh.low)})));
  } else {
    var dry=isDry(pid);
    var shareC=lr.makes>0.001?Math.min(1,lr.carries/lr.makes):1, shortC=lr.carries<lr.makes*0.8&&!dry;
    L0+='<div id="rw-carries">'+row(resIc(dep,13)+esc(T('u_worldGives')),dec(lr.makes)+esc(T('u_perYr')))+row(ic('toEarth',13,C.mid)+esc(T('u_lineCarries')),dec(lr.carries)+esc(T('u_perYr')),shortC?C.people:null)+
      '<div class="bar flow"><u style="width:'+Math.round(shareC*100)+'%;background:'+(shortC?C.people:KCOL[p.kind])+'"></u></div></div>'+
      row(esc(T('u_deposit')),dry?esc(T('u_dryShort')):esc(seamLeft(pid)),dry?C.red:null)+row(esc(T('u_onSurface')),num(c.store[dep]||0))+
      row(resIc('people',13)+esc(T('people')),num(c.pop),C.people)+liftRow(p);
    if(dry&&!c.hub) L0+=alertBox('workedout',esc(fill(T('u_dryLead'),{n:num(pileLeft(G,pid)),r:T(dep).toLowerCase()})),true);
  }
  var hb=can('parts')?hubBlock(p,c):'', HB=hb?'<div id="hubblk">'+hb+'</div>':'';   // v5.01: the hub's price takes parts — not before the player sees them; the tutorial points here (m25)
  var MB=machines(p,c);
  if(can('evac')) L0+=evacBlock(p);
  // the line: the hulls on it, a free hull or one from another line, or a new one from the yards
  var on=onLine(G,pid).sort(function(a,b){ return a.id-b.id });
  R+=sec(esc(T('u_onLine')),esc(fill(T('u_hullsN'),{n:on.length})).toUpperCase())+viaSeg(p,c);
  R+=on.length?on.map(function(s){ return hullRow(s,(can('fleet')&&s.mode!=='building'&&s.mode!=='missing'?btn(esc(T('u_move')),'pick',{v:'move:'+s.id},'','move'):'')+btn(esc(T('u_takeOff')),'unroute',{s:s.id},'','takeoff'),'hr-'+s.id,true) }).join(''):'<div class="why">'+esc(T('u_noHulls'))+'</div>';
  var free=freeAtPier().filter(function(s){ return !s.mutiny&&!s.crewWait&&!s.job }), other=G.ships.filter(function(s){ return s.mode!=='dead'&&s.mode!=='missing'&&!s.mutiny&&((s.from&&s.to&&s.from!==pid)||(s.pend&&s.pend.from!==pid))&&s.mode!=='building'&&s.moveTo!==pid });
  var tab=U.addTab==='other'&&can('fleet')?'other':'free', pool=tab==='free'?free:other;
  R+='<div id="addblk"><div class="sec"><span>'+esc(T('u_addHull'))+'</span><span class="seg"><button type="button" data-act="addtab" data-v="free" class="'+(tab==='free'?'on':'')+'">'+esc(fill(T('u_segFree'),{n:free.length}))+'</button>'+(can('fleet')?'<button type="button" data-act="addtab" data-v="other" class="'+(tab==='other'?'on':'')+'">'+esc(fill(T('u_segOther'),{n:other.length}))+'</button>':'')+'</span></div><div class="lst">';
  R+=pool.length?pool.sort(function(a,b){ return hullGen(b)-hullGen(a)||b.cap-a.cap }).map(function(s){ var lw=lineRefuse(G,s,pid), ok=lw==='ok', wl=s.from||(s.pend&&s.pend.from);
    return '<div class="hr'+(ok?'':' dis')+'" id="ah-'+s.id+'">'+shipIc(shipClass(s),30)+genB(hullGen(s),hullGen(s)<(G.gen||0)-1)+'<span class="hn">'+esc(T(shipClass(s))+' '+fill(T('hullNo'),{n:s.id}))+'</span><span class="hs">'+
      (ok?'<span class="hst">'+ic('hold',15,C.mid)+num(s.cap)+'</span>'+(tab==='other'?'<span class="hst">'+esc(fill(T('u_fromLine'),{p:pname(wl)}))+'</span>':(s.reserve?'<span class="hst" style="color:'+C.ark+'">'+esc(T('u_stReserve'))+'</span>':''))
         :'<span class="hst" style="color:'+C.red+'">'+ic('range',15,C.red)+esc(lw==='range'?fill(T('u_tooShort'),{n:shipRange(s)+1}):lineWhyShort(lw))+'</span>')+
      '</span><span class="ha">'+(ok?btn(esc(T(tab==='free'?'u_assign':'u_moveHere')),tab==='free'?'assign':'move',{s:s.id,p:pid},'pri','assign'):'')+'</span></div>' }).join('')
    :'<div class="why dim">'+esc(T(tab==='free'?'u_noFreePier':'u_noOther'))+'</div>';
  R+='</div></div>';
  if(can('order')){
    R+='<div id="ordblk">'+sec(esc(T('u_orderNew')),esc(fill(T('u_yardGen'),{g:roman(G.gen||0)})))+'<div class="ord">';
    CLASSES.forEach(function(cls){ var gp=genPick(cls,pid); if(!gp||!clsSeen(cls)) return; var hi=gp.hi, h=HULLS[hi];   // v4.42: the generation before while the current one wants parts Earth has not got
      if(reach(G)<h.reach){ R+='<div class="oc dis">'+shipIc(cls,40)+'<b>'+esc(T(cls)+' '+roman(h.gen))+'</b><div class="why dim">'+esc(fill(T('u_needLive'),{n:h.reach}))+'</div></div>'; return }
      var w=orderCheck(G,pid,cls,hi); if(w==='cost'||w==='crew') w=shortWhy(hullCost(h),G.earth); if(w==='range') w=lineRefuse(G,{hull:hi},pid); var lwo=(w==='courierLine'||w==='hubCourier'||w==='hubHop');
      var okb=(typeof w==='string'?w:w[0])==='ok';
      R+='<div class="oc'+(okb?'':' dis')+'" id="oc-'+cls+'">'+shipIc(cls,40)+'<b>'+esc(T(cls)+' '+roman(h.gen))+'</b>'+genSeg(cls,gp)+
        '<div class="oh">'+ic('hold',14,C.mid)+num(h.cap)+'</div>'+(w==='range'||lwo?'':'<div class="oy">'+esc(fill(T('u_lineAdds'),{n:dec(hullYield(G,pid,{hull:hi}))}))+'</div>')+'<div class="prow">'+price(hullCost(h),G.earth,12)+'</div>'+
        (w==='range'?'<div class="why">'+esc(fill(T('u_tooShort'),{n:hullRange(h)+1}))+'</div>':lwo?'<div class="why">'+esc(lineWhyShort(w))+'</div>':btn(esc(fill(T('u_buildYrs'),{n:h.days})),'order',{p:pid,c:cls,h:hi},'pri','build',offW(w)))+olderWhy(cls,hi)+'</div>' });
    R+='</div></div>' }
  /* v5.13 (Nikita 11.11, variant C of design/world-card/tabs.html): the card is a rail of tabs — WORLD · LINE · UPGRADE · HUB.
     All panels stay in the page (the tutorial and the advisor find their blocks), the ones not chosen are hidden; a dot on a tab
     says where to look: red — the world or its line is short, yellow — a package can be ordered now. */
  var lineBad=!on.length||(p.kind==='works'?!!(lineFit(G,pid)&&lineFit(G,pid).carries<lineFit(G,pid).need*0.95):lr.carries<lr.makes*0.8&&!isDry(pid));
  var worldBad=p.kind==='works'?(worksHungry(pid).idle>5||worksHungry(pid).low<10):isDry(pid);
  /* v5.17 (Nikita 12.11: «я не понимаю сколько на миру производится и сколько линия возит … просто их объединить»): WORLD and LINE are one tab — the world's numbers, then the hulls that carry them */
  var tabs=[['world','tWorlds',L0+R,worldBad||lineBad?'red':''],['up','upgrade',MB,canKit(G,pid)==='ok'?'up':''],['hub','hub',HB,'']].filter(function(t){ return t[2] });
  if(!tabs.some(function(t){ return t[0]===U.wtab })) U.wtab='world';
  var rail='<div class="wrail">'+tabs.map(function(t){ var on1=t[0]===U.wtab; return '<button type="button" data-act="wtab" data-v="'+t[0]+'" class="'+(on1?'on':'')+'">'+ic(t[1],20)+'<span>'+esc(T('u_wt_'+t[0]))+'</span>'+(t[3]?'<i class="wdot '+t[3]+'"></i>':'')+'</button>' }).join('')+'</div>';
  var pans=tabs.map(function(t){ return '<div class="wpan" data-wtab="'+t[0]+'" data-pan="wtab:'+t[0]+'"'+(t[0]===U.wtab?'':' hidden')+'>'+t[2]+'</div>' }).join('');
  return '<div class="win wt">'+head(esc(pname(pid)),wsub(p),wmark(p.kind,true,16))+'<div class="bd wtb">'+rail+'<div class="wbody">'+pans+'</div></div>'+nav+'</div>' }
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
    (ws.length?ws.map(function(k){ var p=planet(k), lw=lineRefuse(G,s,k), ok=lw==='ok';
      var f=lineFit(G,k), gap=f&&f.gap>0.01;   // Nikita, 02.11: what the line carries, what it must, what this hull would add; ring and kind right by the name
      return '<button type="button" '+(ok?'data-act="pickgo" data-v="'+kind+':'+s.id+':'+k+'"':'class="dis"'+off(lw,lineWhyP(lw)))+'>'+wmark(p.kind,true)+'<b>'+esc(pname(k))+'</b><i>'+esc(fill(T('u_ringN'),{n:p.sec+1})+' · '+kindWord(p.kind).toLowerCase())+'</i><span'+(ok&&gap?' class="short"':'')+'>'+esc(ok&&f?fill(T('u_pickRate'),{c:dec(f.carries),m:dec(f.need),a:dec(hullYield(G,k,s))}):lineWhyShort(lw))+'</span></button>' }).join(''):'<div class="why">'+esc(T('u_noWorlds'))+'</div>')+
    '</div><button type="button" class="cancel" data-act="pop" data-v="">'+esc(T('u_keep'))+'</button></div>' }

/* Nikita, 26.10 («мочь строить предыдущее поколение») and F-56: both generations are named with their parts, the player chooses. Until then the yards offer what orderHull offers */
function genPick(cls,pid){ var ci=currentHull(G,cls); if(ci===null) return null; var c=HULLS[ci], prev=null;
  for(var i=0;i<HULLS.length;i++){ var o=HULLS[i]; if(o.key===cls&&o.gen===c.gen-1&&o.gen>=(G.gen||0)-K.GEN_OVERLAP&&reach(G)>=o.reach) prev=i }
  var sel=U.ordSel&&U.ordSel[cls], hi=(sel===ci||(prev!==null&&sel===prev))?sel:orderHull(G,cls,pid);
  return {hi:hi,ci:ci,prev:prev} }
function genSeg(cls,g){ if(g.prev===null) return ''; var b=function(i){ var h=HULLS[i]; return '<button type="button" data-act="ordgen" data-v="'+cls+':'+i+'" class="'+(g.hi===i?'on':'')+'">'+roman(h.gen)+' '+resIc('parts',11)+num(h.parts||0)+'</button>' };
  return '<div class="seg ogen">'+b(g.ci)+b(g.prev)+'</div>' }
/* v4.42: under a card that offers the generation before — why: the current one wants parts Earth has not got */
function olderWhy(cls,hi){ var ci=currentHull(G,cls); if(ci===null||ci===hi) return ''; var c=HULLS[ci]; if(G.earth.parts>=(c.parts||0)) return '';
  return '<div class="why dim">'+esc(fill(T('u_olderGen'),{g:roman(c.gen),n:num(Math.ceil((c.parts||0)-G.earth.parts))}))+'</div>' }
/* ---------- Yard: what is being built, a free hull of the current generation, the pier ---------- */
/* v4.49 (Claude's playtest 04.11): the order cards come first — under the list of what is building they slid down a row with every order */
function winYard(){ var g=G.gen||0, b=building(), pier=freeAtPier(), h='';
  h+=sec(esc(T('u_buildFree')))+'<div class="ord big">';
  CLASSES.forEach(function(cls){ var gp=genPick(cls); if(!gp||!clsSeen(cls)) return; var hi=gp.hi, hl=HULLS[hi], c=hullCost(hl);   // v4.42: see orderHull
    var w=reach(G)<hl.reach?['needreach',{n:hl.reach,r:reach(G)}]:shortWhy(c,G.earth), okb=w[0]==='ok';
    h+='<div class="oc'+(okb?'':' dis')+'">'+shipIc(cls,64)+'<b>'+esc(T(cls)+' '+roman(hl.gen))+'</b>'+genSeg(cls,gp)+'<div class="ico3">'+specIcons(hl)+'</div><div class="prow">'+price(c,G.earth)+'</div>'+
      (reach(G)<hl.reach?'<div class="why dim">'+esc(fill(T('u_needLive'),{n:hl.reach}))+'</div>':btn(esc(fill(T('u_buildYrs'),{n:hl.days})),'build',{h:hi},'pri','build',offW(w)))+olderWhy(cls,hi)+'</div>' });
  h+='</div>'+sec(esc(T('u_inYards')),b.length);
  h+=b.length?b.map(function(s){ var w=forWorld(s); return '<div class="yr2">'+shipIc(shipClass(s),30)+'<b>'+esc(T(shipClass(s))+' '+roman(hullGen(s))+' '+fill(T('hullNo'),{n:s.id}))+'</b><span>→ '+esc(w?fill(T('u_lineOf'),{p:pname(w)}):T('u_freeHull'))+'</span><div class="bar"><u style="width:'+Math.round(hullProgress(s)*100)+'%"></u></div><i>'+esc(fill(T('u_yearsN'),{n:s.t}))+'</i></div>' }).join(''):hint(esc(T('u_yardsIdle')));
  h+=sec(esc(T('u_atPier')),esc(fill(T('u_hullsN'),{n:pier.length})).toUpperCase());
  /* v5.17 (Nikita 12.11: «хочу чтобы во вкладке yard судна были рассортированы»): by class — Courier, Hauler, Freighter, each under its name and count; the newest generation first, then by number */
  var pcard=function(s){ var v=scrapValue(HULLS[s.hull]), arm=U.scrapArm===s.id;
    return '<div class="pc'+(s.reserve?' res':'')+(s.mutiny?' mut':'')+'">'+shipIc(shipClass(s),34)+genB(hullGen(s),hullGen(s)<g-1)+'<b>'+esc(fill(T('hullNo'),{n:s.id}))+'</b>'+
      (s.reserve?'<em>'+ic('reserve',14,C.ark)+esc(T('u_stReserve').toUpperCase())+'</em>':(s.mutiny?'<em>'+ic('mutiny',14,C.red)+esc(T('u_stMutiny').toUpperCase())+'</em>':''))+
      '<div>'+(G.night&&can('reserve')?btn(esc(T(s.reserve?'u_release':'u_reserve')),'reserve',{s:s.id,on:s.reserve?0:1},'','reserve'):'')+
      (s.reserve?'':(arm?'<button class="b red" type="button" data-act="scrap" data-s="'+s.id+'">'+esc(T('u_scrapSure'))+' '+price({metal:v.metal,parts:v.parts,people:s.crew||0},null,11)+'</button>':btn(esc(T('u_scrap')),'scrap',{s:s.id},'','scrap')))+'</div></div>' };
  h+=pier.length?CLASSES.map(function(cls){ var l=pier.filter(function(s){ return shipClass(s)===cls }).sort(function(a,b){ return hullGen(b)-hullGen(a)||a.id-b.id });
    return l.length?'<div class="lab pcl">'+shipIc(cls,18)+esc(T(cls))+' · '+l.length+'</div><div class="pier">'+l.map(pcard).join('')+'</div>':'' }).join(''):hint(esc(T('u_pierEmpty')));
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
/* v5.17 (Nikita 12.11: «зачем выбирать, если автоматически это происходит») — no «Run the programme at»: the works with the most people */
function driveHost(){ var ws=worksList();
  var best=null; ws.forEach(function(k){ if(G.colonies[k].pop>=K.DRIVE_POP&&(!best||G.colonies[k].pop>G.colonies[best].pop)) best=k }); return best }
function startDriveWhy(pid){ if(G.drive) return 'running';
  if(settledCount(G)<driveReachFor(G)) return ['needsettled',{n:driveReachFor(G),r:settledCount(G)}];
  if(!pid) return worksList().length?['nohost',{n:K.DRIVE_POP}]:['nohost',{n:K.DRIVE_POP}];
  return 'ok' }
/* Nikita, 26.10: «непонятно что за программа двигателя» — a note that opens and closes any time; the choice stays between runs */
function driveHelpOn(){ if(U.driveHelp===undefined){ U.driveHelp=false; try{ U.driveHelp=localStorage.getItem('lb.driveHelp')==='1' }catch(e){} } return U.driveHelp }
function driveHelp(work){
  return '<div class="dhelp"><p>'+esc(T('u_dh1'))+'</p><p>'+esc(T('u_dh2'))+'</p><p>'+esc(fill(T('u_dh3'),{n:num(work)}))+'</p><p>'+esc(T('u_dh4'))+'</p>'+'</div>' }
/* v5.16 (Nikita 12.11, draft A of design/tech/tabs.html): Tech on three tabs — OVERVIEW (the programme, what the drive gives, the next ring), DRIVE (the new hulls, the works), RINGS.
   The drive speeds up every hull, old ones too, and cuts the fuel of a trip — shown as numbers, the new hulls add their own +12% */
function techGains(g,lvl){ var d0=driveSpeed(G), d1=driveSpeed({driveLvl:lvl+1}), h='';
  var row=function(icn,col,t,sub,v,cls){ return '<div class="g'+(cls?' '+cls:'')+'">'+(icn?ic(icn,16,col):resIc('fuel',16))+'<span>'+esc(t)+(sub?'<small>'+esc(sub)+'</small>':'')+'</span><b>'+v+'</b></div>' };
  h+=row('speed',C.ink,T('u_gFleet'),fill(T('u_gFleetSub'),{n:G.ships.filter(function(s){ return s.mode!=='dead' }).length}),pctUp(d0,d1));
  if(can('fuel')) h+=row(null,null,T('u_gFuel'),T('u_gFuelSub'),'−'+Math.round((1-Math.sqrt(d0/d1))*100)+'%');
  h+=row('tYard',C.ink,fill(T('u_gHulls'),{g:roman(g+1)}),fill(T('u_gHullsSub'),{c:pctUp(1,K.GEN_CAP),s:pctUp(1,K.GEN_SPEED)}),'');
  if(can('ark')&&G.arkMark===g+1) h+=row('ark',C.ark,T('u_gArk'),fill(T('u_gArkSub'),{g:roman(g+1)}),'✓','ark');
  return '<div class="gains"><div class="gt">'+esc(fill(T('u_genGives'),{g:roman(g+1)}))+'</div>'+h+'</div>' }
function sideTech(){ var g=G.gen||0, lvl=G.driveLvl||0, s=settledCount(G), need=driveReachFor(G), work=driveWorkFor(G);
  var ws=worksList(), have=G.drive?G.driveWork:G.earth.parts+ws.reduce(function(a,k){ return a+(G.colonies[k].store.parts||0) },0), host=G.drive?null:driveHost();
  var sn=K.SURVEY_REACH*SECTORS.length, sc=surveyCost(SECTORS.length), sv=canSurvey(G);
  var ringRow=function(){ var sw=sv==='settled'?['needsettled',{n:sn,r:s}]:(sv==='ok'?'ok':shortWhy(sc,G.earth));
    return '<div class="gnow"><span class="rnum">'+ic('ring',22,C.food)+esc(fill(T('u_ringNext'),{s:secName(SECTORS.length)}))+'</span><span class="gtx">'+esc(fill(T('u_settledOf'),{n:Math.min(s,sn),m:sn}))+'</span></div>'+
      '<div class="prow">'+price(sc,G.earth)+'</div>'+btn(esc(sv==='settled'?fill(T('u_surveyMore'),{n:sn-s}):T('u_survey')),'survey',null,'pri full','survey',offW(sw)) };
  // OVERVIEW
  var o=sec(esc(T('u_hullGen'))+'<button type="button" class="qm'+(driveHelpOn()?' on':'')+'" data-act="drivehelp" aria-expanded="'+driveHelpOn()+'" title="'+attr(T('u_dhQ'))+'" aria-label="'+attr(T('u_dhQ'))+'">?</button>',roman(g)+' → '+roman(g+1));
  if(driveHelpOn()) o+=driveHelp(work);
  o+='<div class="gnow"><span class="gen big">'+roman(g)+'</span>'+ic('tTech',18,C.mid)+'<span class="gen big nx">'+roman(g+1)+'</span>'+(G.drive?'<span class="gtx">'+esc(fill(T('u_driveAt'),{p:pname(G.drive)}))+'</span>':'')+'</div>';
  var hkT=hackNext(G); if(hkT&&hkT.k==='drive'&&!hackOn()) o+='<div id="hkneed">'+alertBox('tTech',esc(fill(T('u_hackNeed'),{w:hackWho(hkT)})),true)+btn(esc(T('u_hackStart')),'hack',null,'pri full','tTech')+'</div>';   // v5.09: the player starts the hack
  o+='<div class="lab">'+esc(fill(T('u_step1'),{n:Math.min(s,need),m:need}))+'</div>'+steps(s,need,C.food);
  o+='<div class="lab">'+esc(fill(T('u_step2'),{n:num(Math.min(have,work)),m:num(work)}))+'</div><div class="bar"><u style="width:'+Math.min(100,Math.round(have/work*100))+'%;background:'+C.parts+'"></u></div>';
  if(!ws.length) o+=hint(esc(T('u_noWorks')));
  if(!G.drive){ var w=startDriveWhy(host), lbl=(typeof w!=='string'&&w[0]==='needsettled')?fill(T('u_startMore'),{n:need-s}):T('u_start');
    o+=btn(esc(lbl),'drive',{p:host||''},'pri full','tTech',offW(w)) }
  o+=techGains(g,lvl);
  o+=sec(esc(T('u_ringNextH')),esc(fill(T('u_charted'),{n:SECTORS.length})).toUpperCase())+ringRow();
  var lim=sectorLimit(g), beyond=freeWorlds().filter(function(p){ return p.sec>lim }).length;
  if(beyond) o+=hint(esc(fill(T('u_beyond'),{k:beyond,n:lim+1,g:roman(g+1)})));
  // DRIVE
  var d=sec(esc(T('u_hullGen')),roman(g)+' → '+roman(g+1))+'<div class="gains flat">'+
    '<div class="g">'+ic('speed',16,C.ink)+'<span>'+esc(T('u_gEvery'))+'</span><b>'+pctUp(driveSpeed(G),driveSpeed({driveLvl:lvl+1}))+'</b></div>'+
    (can('fuel')?'<div class="g">'+resIc('fuel',16)+'<span>'+esc(T('u_gFuel'))+'</span><b>−'+Math.round((1-Math.sqrt(driveSpeed(G)/driveSpeed({driveLvl:lvl+1})))*100)+'%</b></div>':'')+'</div>';
  d+=sec(esc(fill(T('u_gHulls'),{g:roman(g+1)})))+'<div class="spec"><div class="sh"><span></span><span>'+ic('hold',13,C.mid)+esc(T('u_hold'))+'</span><span>'+ic('speed',13,C.mid)+esc(T('u_speedH'))+'</span><span>'+ic('range',13,C.mid)+esc(T('u_reachH'))+'</span></div>';
  CLASSES.forEach(function(cls,j){ var a=HULLS[currentHull(G,cls)], b=genHull(g+1,j);
    d+='<div class="sr"><span>'+shipIc(cls,30)+'<b>'+esc(T(cls))+'</b></span><span><i>'+num(a.cap)+'</i>'+num(b.cap)+'</span><span>'+pctUp(1,Math.pow(K.GEN_SPEED,b.gen-a.gen))+'</span><span><i>'+(hullRange(a)+1)+'</i>'+esc(fill(T('u_ringN'),{n:hullRange(b)+1}))+'</span></div><div class="sp">'+price(hullCost(b),null,12)+'</div>' });
  d+='</div>';
  d+=sec(esc(T('u_worksParts')),num(Math.min(have,work))+' / '+num(work));
  if(ws.length) d+=ws.map(function(k){ var c=G.colonies[k], p=planet(k), wh=worksHungry(k), r=wh.idle>5?0:c.pop*p.rich*K.REFINE*rateMult(c);
    return '<div class="wkr">'+ic('works',14,C.parts)+'<span>'+esc(pname(k))+' <i>'+resIc('people',11)+num(Math.round(c.pop))+'</i></span><b>'+dec(r)+esc(T('u_perYr'))+'</b></div>' }).join('');
  else d+=hint(esc(T('u_noWorks')));
  var tabs=[['over',T('u_tt_over'),o],['drive',fill(T('u_tt_drive'),{g:roman(g+1)}),d]];
  var bar='<div class="ttabs">'+tabs.map(function(t){ return '<button type="button" data-act="ttab" data-v="'+t[0]+'" class="'+(U.ttab===t[0]?'on':'')+'">'+esc(t[1])+'</button>' }).join('')+'</div>';
  var pans=tabs.map(function(t){ return '<div class="tpan" data-pan="ttab:'+t[0]+'"'+(t[0]===U.ttab?'':' hidden')+'>'+t[2]+'</div>' }).join('');
  return '<div class="side">'+head(esc(T('u_tech').toUpperCase()),'',ic('tTech',18))+bar+'<div class="tbl">'+pans+'</div></div>' }

/* ---------- Ark: the Night, the capsule rings, the convoy, the verdict ----------
   v5.10 (design/ARK.md 2g): the rules of the hive in the old frame — the hive drawing of design/ark-menu comes next */
function arkDriveTxt(){ if(arkReady(G)) return [fill(T('u_arkReady'),{g:roman(G.arkMark)}),C.food];
  var f=driveForecast(G,G.arkMark);
  if(f.st==='ok') return [fill(T('u_arkBy'),{g:roman(G.arkMark),y:f.y}),f.y>G.night?C.red:(f.y>G.night-K.NIGHT_NEAR/2?C.people:C.food)];
  if(f.st==='settled') return [fill(T('u_arkNeedW'),{g:roman(G.arkMark),n:f.n,r:f.r}),C.red];
  if(f.st==='host') return [fill(T('u_arkNoHost'),{g:roman(G.arkMark)}),C.red];
  return [fill(T('u_arkStall'),{g:roman(G.arkMark)}),C.red] }
/* Nikita, 02.11 (35 presses at the end of run 221175121): every hull on a line, in one press — the same two orders the hull rows give. A hull on an evacuation or a landing finishes first */
function homeList(){ return G.ships.filter(function(s){ return s.mode!=='dead'&&s.mode!=='missing'&&s.mode!=='building'&&!s.reserve&&!s.job&&(s.from||s.pend) }) }
/* the hulls at the pier that are not in the convoy yet */
function pierOut(){ return freeAtPier().filter(function(s){ return !s.reserve&&!s.job }) }
/* v5.10 (design/ARK.md 2g p. 5, drafts design/ark-menu hex-F1/F2/F3 — one window in three states: at rest, the convoy pressed, a ring
   pressed). The hive: a hex is 100 people; ring k of cells is block k (6k cells = 600k pods). A cell is purple when its ring is
   bought, an outline when a person stands there with no pod, dotted when nobody does. Outside, the convoy ring: always 36 cells,
   full by the share of the fleet standing in the convoy. U.arkSel — what is pressed: a ring number, 'c' (the convoy) or nothing. */
var HIVE_D=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]], HIVE_S3=Math.sqrt(3);
function hivePts(cx,cy,r){ var a=[]; for(var i=0;i<6;i++){ var t=Math.PI/3*i; a.push((cx+r*Math.cos(t)).toFixed(1)+','+(cy+r*Math.sin(t)).toFixed(1)) } return a.join(' ') }
function hiveRings(){ var need=1, ab=arkBoard(G); while(arkCaps(need)<ab&&need<12) need++; return Math.max(need,arkPaid(G)+1) }
function hiveSvg(sel){
  var rg=arkRings(G), paid=arkPaid(G), N=hiveRings(), rc=Math.max(6,N+2), r=19*6/rc, cx=262, cy=236, cv=arkConvoy(G);
  var people=Math.ceil(arkBoard(G)/100), k=0, s='<polygon class="hx core" points="'+hivePts(cx,cy,r-1.8)+'"/>', ring, side, j;
  var at=function(q,rr){ return [cx+r*1.5*q,cy+r*HIVE_S3*(rr+q/2)] };
  for(ring=1;ring<=N;ring++){ var q=0, rr=-ring, g='';
    for(side=0;side<6;side++) for(j=0;j<ring;j++,k++){ var xy=at(q,rr), man=k<people;
      var cls=ring<=rg?(man?'on':'on spare'):(ring<=paid?'wait':(typeof sel==='number'&&ring<=sel?'sel':(man?'':'none')));
      g+='<polygon class="hx '+cls+(sel===ring?' rsel':'')+'" points="'+hivePts(xy[0],xy[1],r-1.9)+'"/>'; q+=HIVE_D[side][0]; rr+=HIVE_D[side][1] }
    s+='<g class="hr" data-act="arksel" data-v="'+ring+'">'+g+'</g>' }
  var way=Math.min(cv.cells-cv.lit,cv.all?Math.ceil(cv.cells*cv.way/cv.all):0), per=cv.cells/6, c='', q2=0, r2=-rc;
  for(side=0;side<6;side++){ for(j=0;j<per;j++){ var i=side*per+j, f=j/per*rc, xy2=at(q2+HIVE_D[side][0]*f,r2+HIVE_D[side][1]*f);
      c+='<polygon class="hx cv'+(i<cv.lit?' on':(i<cv.lit+way?' way':''))+'" points="'+hivePts(xy2[0],xy2[1],r-1.9)+'"/>' }
    q2+=HIVE_D[side][0]*rc; r2+=HIVE_D[side][1]*rc }
  s+='<g class="hr'+(sel==='c'?' csel':'')+'" id="cvring" data-act="arksel" data-v="c">'+c+'</g>';
  return '<svg class="hold" viewBox="0 0 524 472" role="img">'+s+'</svg>' }
function hiveLg(cls,key){ return '<span><svg width="16" height="14" viewBox="0 0 16 14"><polygon class="hx '+cls+'" points="'+hivePts(8,7,6.5)+'"/></svg>'+esc(T(key))+'</span>' }
function winArk(){
  if(!G.night) return '<div class="win sm">'+head(esc(T('u_tabArk').toUpperCase()),esc(T('u_timePaused')),ic('ark',18,C.ark))+'<div class="bd"><div class="big mid">'+ic('night',22,C.mid)+esc(T('u_noDate'))+'</div>'+hint(esc(fill(T('u_noDateHint'),{n:K.NIGHT_TRIGGER_SECTORS,y:K.NIGHT_TRIGGER_YEAR})))+'</div></div>';
  var rg=arkRings(G), paid=arkPaid(G), ad=arkDriveTxt(), cv=arkConvoy(G), ab=arkSouls(G), wk=arkWakeN(G), sel=U.arkSel, card='';
  if(typeof sel==='number'&&sel<=paid) sel=U.arkSel=null;
  var hkA=hackNext(G), hk=(hkA&&hkA.k==='ark'&&!hackOn())?'<div id="hkneed">'+alertBox('ark',esc(fill(T('u_hackNeed'),{w:hackWho(hkA)})),true)+btn(esc(T('u_hackStart')),'hack',null,'pri full','ark')+'</div>':'';   // v5.09
  var big='<div class="ah-big"><div class="wk" id="arkwake"><small>'+esc(T('u_wake'))+'</small><b>'+num(wk)+'</b><i>'+esc(T('u_ifToday'))+'</i></div><div class="sl" id="arksleep"><small>'+esc(T('u_sleepOn'))+'</small><b>'+num(Math.max(0,ab-wk))+'</b><i>&nbsp;</i></div></div>';
  if(sel==='c'){ var po=can('reserve')?pierOut():[], hl=can('reserve')?homeList():[];
    card='<div class="ah-pick cvp" id="arkcard"><h4>'+esc(T('statConvoy'))+'</h4><div class="ah-line"><span>'+esc(T('u_cvIn'))+'</span><b>'+esc(fill(T('u_cvOf'),{a:cv.have,b:cv.all}))+'</b></div>'+
      '<div class="ah-alt"><span>'+esc(T('u_cvPier'))+'</span><b>'+po.length+'</b>'+(po.length?btn(esc(T('u_cvAdd')),'allpier',null,'sm'):'<span class="nob"></span>')+'</div>'+
      '<div class="ah-alt"><span>'+esc(T('u_cvLines'))+'</span><b>'+hl.length+'</b>'+(hl.length?btn(esc(T(U.homeArm?'u_cvSure':'u_cvCall')),'allhome',null,U.homeArm?'sm red':'sm'):'<span class="nob"></span>')+'</div>'+
      '<div class="ah-alt"><span>'+esc(T('u_cvWay'))+'</span><b>'+cv.way+'</b><span class="nob"></span></div></div>' }
  else if(typeof sel==='number'){ var owed=arkOwed(G,sel), w=arkCheck(G,sel), fc=foodForecast(G,owed.food), fc0=fc?foodForecast(G):null; if(w==='ok') w=shortWhy(owed,G.earth);
    var can1=typeof w!=='string'&&w[0]==='ok';
    card='<div class="ah-pick" id="arkcard"><h4>'+esc(fill(T('u_hiveRing'),{n:roman(sel-1)}))+'</h4><div class="ah-line"><span>'+esc(T('u_price'))+'</span><div class="prow">'+price(owed,G.earth,12)+'</div></div>'+
      '<div class="ah-line"><span>'+esc(T('u_pods'))+'</span><b>+'+num(arkCaps(sel)-arkCaps(paid))+'</b></div>'+
      '<div class="ah-line"><span>'+esc(T('u_hold'))+'</span><div class="prow">'+price(arkHold(sel),null,12)+'</div></div>'+
      '<div class="ah-line" id="arkfed"><span>'+esc(T('u_arkRations'))+'</span><b style="color:'+(fc?(fc0&&fc0.y<=fc.y?C.people:C.red):C.food)+'">'+esc(fc?(fc0?fill(T('u_arkFamine2'),{y:fc.y,z:fc0.y}):fill(T('u_arkFamine'),{y:fc.y})):T('u_arkFed'))+'</b></div>'+   // 2g p. 6: the larder after the purchase, before the press
      btn(esc(fill(T('u_buyLv'),{l:roman(sel-1)})),'arkbuy',{l:sel},can1&&!(fc&&!fc0)?'pri full':'full',null,offW(w))+'</div>' }
  else card='<div class="ah-hint">'+esc(T('u_arkHint1'))+'<br>'+esc(T('u_arkHint2'))+'</div>';
  var stays=rg<1?T('u_vNoLevel'):(!arkReady(G)?ad[0]:null);
  var mute=!stays&&wk<1 ? T(cv.have<1?'u_vNoConvoy':'u_vNoWake') : null;   // reviewer, 10.11: it sails and nobody wakes — said in the verdict, not in green
  var fate='<div class="ah-fate'+(stays?'':(mute?' warn':' ok'))+'" id="arkfate"><div><b>'+esc(T(stays?'u_arkStays':'u_arkSails'))+'</b><i>'+(mute?'':ic('drive',13,C.ark)+' ')+esc(stays||mute||(T('u_arkDrive')+' · '+ad[0]))+'</i></div><span class="lab2">'+esc(T('u_ifToday'))+'</span></div>';
  var lg='<div class="ah-lg">'+hiveLg('on','u_lgPod')+hiveLg('','u_lgNoPod')+hiveLg('cv on','u_lgConvoy')+hiveLg('cv way','u_lgWay')+'</div>';
  return '<div class="win wide">'+head(esc(T('u_tabArk').toUpperCase()),esc(T('u_timePaused')),ic('ark',18,C.ark))+'<div class="bd"><div class="ah"><div class="ah-two"><div class="ah-l">'+
    sec(esc(T('u_hiveHead')),esc(T('u_hiveConvoy')))+hiveSvg(sel)+lg+'</div><div class="ah-r">'+hk+big+card+'</div></div>'+fate+'</div></div></div>' }

/* ---------- the advisor: worlds only, worst first (Nikita 15.10: «не понимаю, что делать») ----------
   A row says the problem in numbers, what follows, and a button that names the fix; the button opens the world with the
   place of the fix lit (a yellow ring that fades in ~3 s). */
/* v4.50 (Nikita 05.11, «Да»): a mine, farm or well with no line is grey and out of the count while Earth's stock of what it digs lasts
   QUIET_YEARS — at Earth's own burn or at the real fall of the stock, whichever is faster (fuel has no burn of its own: at least QUIET_FUEL).
   The works always count — parts are always short (Claude — awaiting review) */
var QUIET_YEARS=200, QUIET_FUEL=1000;
function quietDep(p,dep){ if(p.kind==='works') return false; var t=trend(dep)||0, nd=G.need||earthNeed(G);   // no trend yet (first years, after a load): Earth's own burn alone
  return G.earth[dep]>=QUIET_YEARS*Math.max(nd[dep]||0,-t,dep==='fuel'?QUIET_FUEL/QUIET_YEARS:0.1) }
function advRows(){ if(!G) return []; var out=[], used=[];   // v4.38: a hull named for one line is not offered to the next
  Object.keys(G.colonies).forEach(function(pid){ var p=planet(pid), c=G.colonies[pid], st=wst(pid), w=pname(pid), dep=p.kind==='works'?'parts':p.dep, going=evacGoing(pid);
    if(going) return;
    if(st==='dead') out.push([C.red,fill(T('u_aDead'),{w:w}),fill(T('u_aDeadC'),{n:num(c.pop)}),pid,T('u_fixEvac'),'evac','evac']);
    else if(st==='cut') out.push([C.red,fill(T('u_aCut'),{w:w}),fill(T('u_aCutC'),{n:num(c.pop)}),pid,T('u_fixSee'),'lift','evac']);
    else if(st==='starve'){ var wh=worksHungry(pid); out.push([C.red,fill(T('u_aStarve'),{w:w,r:T(wh.food<wh.metal?'food':'metal').toLowerCase()}),T('u_aStarveC'),pid,T('u_fixAdd'),'add','forge']) }
    var ll=lastLift(G,pid); if(can('lift')&&ll&&ll.st==='open'&&ll.n<=K.LIFT_WARN) out.push([ll.n<=25?C.red:C.people,fill(T('u_aLift'),{w:w,n:ll.n,y:ll.y}),fill(T('u_aLiftC'),{n:num(c.pop)}),pid,T('u_fixEvac'),'evac','evac']);
    var sy=seamYears(pid); if(sy<SEAM_YEARS&&st!=='dead'&&st!=='cut') out.push([C.people,fill(T('u_aSeam'),{w:w,n:num(sy)}),T('u_aSeamC'),pid,T('u_fixSee'),'add','seam']);
    if(st==='noline') out.push([quietDep(p,dep)?C.mid:C.people,fill(T('u_aNoLine'),{w:w}),T('u_aNoLineC'),pid,T('u_fixAdd'),'add','noline']);
    else if(st==='half'&&p.kind==='works'){ var ff=lineFit(G,pid), fh=lineFix(pid,used);   // Nikita, 02.11 (forge-stat): the works say it the moment the line is thin
      out.push([C.people,fill(T('u_aForge'),{w:w,c:dec(ff.carries),n:dec(ff.need)}),fh?fh[0]:T('u_aForgeC'),pid,fh?fh[1]:T('u_fixAdd'),fh?fh[2]:'add','forge']) }
    else if(st==='half'){ var lr=lineRate(G,pid), hp=lineFix(pid,used);
      out.push([C.people,fill(T('u_aHalf'),{w:w,c:dec(lr.carries),m:dec(lr.makes),r:T(dep).toLowerCase()}),hp?hp[0]:fill(T('u_aHalfC'),{n:num(lr.sitting)}),pid,hp?hp[1]:T('u_fixAdd'),hp?hp[2]:'add','line']) }
    else if(st==='ok'&&can('fleet')){ var sp=lineSpare(G,pid), sf=lineFit(G,pid);   // v4.38: a hull too many — last in the list, grey
      if(sp.length&&sf.carries>=sf.need*SPARE_WARN) out.push([C.mid,fill(T('u_aSpare'),{w:w,c:dec(sf.carries),m:dec(sf.need),r:T(dep).toLowerCase()}),sp.length>1?fill(T('u_aSpareN'),{n:sp.length,h:hname(sp[0])}):fill(T('u_aSpareC'),{h:hname(sp[0])}),pid,T('u_fixHull'),'hr:'+sp[0].id,'line']) }
    else if(st==='dry') out.push([C.people,fill(T('u_aDry'),{w:w,n:num(pileLeft(G,pid)),r:T(dep).toLowerCase()}),T('u_aDryC'),pid,T('u_fixSee'),'add','seam']);
    if(can('machines')&&c.kit&&lineHold(G,pid)<c.kit.w) out.push([C.people,fill(T('u_aKit'),{w:w,t:roman(c.kit.tier-1),n:num(c.kit.w),h:num(lineHold(G,pid))}),T('u_aKitC'),pid,T('u_fixOrder'),'ord','line']);
    // v4.46: a thin line already speaks for the machines — one card a world
    if(can('machines')&&kitTier(c)>0&&!kitLive(c)&&st!=='half'&&st!=='starve') out.push([C.people,fill(T('u_aKitFuel'),{w:w}),T('u_aKitFuelC'),pid,T('u_fixSee'),'mach',p.kind==='works'?'forge':'line']);
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
/* Nikita, 02.11 («всё сливается и глазу тяжело»): five kinds, each with its own mark and colour; the worst kind first, a count for each. Red still means urgent, grey means it can wait */
var ADV_T=[{k:'evac',i:'send',c:'#FF2A1A',l:'u_atEvac'},{k:'forge',i:'kit',c:'#FF8A1F',l:'u_atForge'},{k:'noline',i:'takeoff',c:'#FFD23F',l:'u_atNoLine'},{k:'seam',i:'survey',c:'#4FA3FF',l:'u_atSeam'},{k:'line',i:'hold',c:'#B48CFF',l:'u_atLine'}];
function popAdv(){ var a=advRows(), rk=function(r){ return r[0]===C.red?0:r[0]===C.mid?2:1 };
  if(!a.length) return '<div class="advl"><div class="none">'+esc(T('u_advNone'))+'</div></div>';
  var gs=ADV_T.map(function(t,i){ var rows=a.filter(function(r){ return r[6]===t.k }); var w=rows.reduce(function(m,r){ return Math.min(m,rk(r)) },9), live=rows.filter(function(r){ return r[0]!==C.mid }).length; return {t:t,i:i,rows:rows,w:w,c:w===2?C.mid:t.c,n:live||rows.length} })   // v4.50: a group of grey rows is grey, its count is the top bar's.filter(function(g){ return g.rows.length }).sort(function(x,y){ return x.w-y.w||x.i-y.i });
  return '<div class="advl"><div class="advc">'+gs.map(function(g){ return '<span style="color:'+g.c+'">'+ic(g.t.i,14,g.c)+'<b>'+g.n+'</b></span>' }).join('')+'</div>'+gs.map(function(g){
    return '<div class="advh" style="color:'+g.c+'">'+ic(g.t.i,15,g.c)+'<span>'+esc(T(g.t.l))+'</span><b>'+g.n+'</b></div>'+g.rows.map(function(r){ return '<button type="button" data-t="'+g.t.k+'" data-act="world" data-v="'+r[3]+'" data-f="'+r[5]+'"><i style="background:'+(r[0]===C.mid?C.mid:g.t.c)+'"></i><b'+(r[0]===C.red?' style="color:'+C.red+'"':(r[0]===C.mid?' style="color:'+C.mid+'"':''))+'>'+esc(r[1])+'</b><span>'+esc(r[2])+'</span><em>'+esc(r[4])+' →</em></button>' }).join('') }).join('')+'</div>' }
function popMenu(){
  return '<div class="menu"><button type="button" data-act="sfx">'+ic('speed',15)+esc(T('u_mSound'))+' <b>'+esc(T(SFX.isOn()?'u_on':'u_off'))+'</b></button>'+
    '<button type="button" data-act="uisize">'+ic('tWorlds',15)+esc(T('u_mSize'))+' <b>'+Math.round(uiScale()*100)+'%</b></button>'+
    '<button type="button" data-act="help">'+ic('peopleA',15)+esc(T('u_mHelp'))+' <b>'+esc(T(U.tut.help?'u_on':'u_off'))+'</b></button><hr>'+
    '<button type="button" data-act="save">'+ic('unloading',15)+esc(T('u_mSave'))+'</button><button type="button" data-act="load">'+ic('loading',15)+esc(T('u_mLoad'))+'</button>'+
    '<button type="button" data-act="export">'+ic('unloading',15)+esc(T('u_mExport'))+'</button>'+
    (textsVisible()?'<button type="button" data-act="texts">'+ic('loading',15)+esc(T('textsReload'))+'</button>':'')+'<hr>'+
    '<div class="seedrow">'+esc(T('seed'))+' <input id="seedin" value="'+G.seed+'"></div><button type="button" data-act="new">'+ic('free',15)+esc(T('newGame'))+'</button></div>' }

/* ---------- the main menu (work/menu.js, v4.40): in front of a new run whose clock stands; its terminal tells the start ---------- */
/* v5.05 (Nikita 06.11: «удали смену языка в игре, пусть интерфейс будет только на английском»): the game speaks English only — no language
   item in the menu or in ≡, a save in Russian loads in English. The RU column stays in the sheet and the build; nothing in the game switches to it */
function menuLang(){ return 'en' }
function menuOpen(){ U.menu=true; draw();
  LBMENU.open({T:function(k,p){ return T(k,p) }, v:VERSION.v, lang:function(){ return U.lang },
    save:function(){ return U.saveDay!==null&&U.saveDay!==undefined?{y:U.saveDay,w:U.saveWorlds||0}:null },
    sound:function(){ return SFX.isOn() }, setSound:function(on){ SFX.set(on) },
    size:function(){ return uiScale() }, sizeNext:function(){ return uiScaleNext() },
    cont:function(){ U.langPicked=true; if(loadAuto()) return true; U.langPicked=false; return T('mn_contFail') },
    load:function(){ el('loadin').click() },
    pressNew:function(){ clockOn('new') },
    newRun:function(){ U.langPicked=true; act(G,'menu',{go:'new'}) },
    test:function(){ U.langPicked=true; clockOn('test'); tutMute(); act(G,'menu',{go:'test'}); if(window.LBdebug) window.LBdebug.on(true) },   // v4.43 (Nikita, 25.10): Test play opens the debug panel (web/debug.js)
    closed:function(){ U.menu=false; draw() }}) }

/* ---------- save and load: a file, and the last autosave in this browser ---------- */
var SAVE_KEY='lb.save';
function dump(){ return JSON.stringify({v:1,G:G,SECTORS:SECTORS,PLANETS:PLANETS,HULLS:HULLS,U:{hist:U.hist,voiceSeq:U.voiceSeq,voiceLast:U.voiceLast,voy:U.voy,capt:U.capt,founded:U.founded,shiftStop:U.shiftStop,speed:U.speed,lang:U.lang,tut:tutSave()}},
  function(k,v){ if(k==='rnd') return undefined; if(v===Infinity) return '__inf'; if(v===-Infinity) return '__-inf'; return v }) }
function undump(t){ var o=JSON.parse(t,function(k,v){ return v==='__inf'?Infinity:(v==='__-inf'?-Infinity:v) });
  if(!o||!o.G||!o.SECTORS) throw new Error('not a save');
  SECTORS.length=0; o.SECTORS.forEach(function(x){ SECTORS.push(x) }); PLANETS.length=0; o.PLANETS.forEach(function(x){ PLANETS.push(x) }); HULLS.length=0; o.HULLS.forEach(function(x){ HULLS.push(x) });
  G=o.G; arkFix(G); G.rnd=mulberry32((G.seed^0x51ED27)+G.day*131);   // the dice after a load are not the original ones
  if(!G.clock){ clockOn('save'); G.clock.year=G.day }   // a save from before v4.46: the clock counts from the load
  var u=o.U||{}; ['hist','voiceSeq','voiceLast','voy','capt','founded','shiftStop','speed'].forEach(function(k){ if(u[k]!==undefined) U[k]=u[k] }); if(SPEEDS.indexOf(U.speed)<0) U.speed=4;   // a save from before v4.42 may hold 10×
  tutLoad(u.tut);
  U.win=null; U.tab=null; U.pop=null; U.notes=[]; U.pf=null; U.paused=true; U.acc=0; U.gk=G; U.noFreeAt=SECTORS.length; U.ringNoted=undefined; U.foodWarnAt=null; U.worksSeen=true; U.who={}; U.focusK=null; U.scrapArm=null; U.strips=[]; U.ltOpen=null; U.ordSel={}; lineWhy={}; U.langPicked=true; HTMLCACHE={};
  CFIT=true; CFITK=''; P3N=-1; window.LN=G; draw() }
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

/* v4.50 (Nikita 05.11: «пропуск целиком, нельзя проматывать время, можно только его скорость менять»): Skip is gone — the clock has only its speeds */

/* ---------- presses ---------- */
/* v4.35 (reviewer): setLine puts the hull on the line and then sails it — no fuel or crew keeps her at the pier on the line, which is not a refusal */
var lineWhy={};
function lineRes(res,sid,pid){ var s=shipById(G,sid); if((res==='fuel'||res==='crew')&&s&&s.from===pid){ lineWhy[sid]=res; return 'ok' } delete lineWhy[sid]; return res }
function lineWait(sid){ return lineWhy[sid]?whyText(lineWhy[sid]):'' }
function resLeft(sid){ toast(esc(fill(T('u_resLeft'),{n:sid})),'warn',6000,false) }
function doAct(a,b){
  var d=b.dataset, res=null, okc=null, okp=null, v=d.v;
  if(a!=='allhome') U.homeArm=false;
  if(a==='tab'){ U.pop=null; U.scrapArm=null; if(v==='worlds'||v==='tech'||v==='fleet'){ U.tab=U.tab===v?null:v; U.win=null; if(v==='tech') U.ttab='over' } else U.win=U.win===v?null:v; SFX.play('tab') }
  else if(a==='world'){ openWorld(v,d.f) }
  else if(a==='step'){ var O=stepOrder(U.win), i=O.indexOf(U.win); if(O.length) U.win=O[(i+(+v)+O.length)%O.length]; U.scrapArm=null }
  else if(a==='pop'){ U.pop=(U.pop===v||!v)?null:v; U.scrapArm=null }
  else if(a==='spd'){ if(v==='0') pauseToggle(); else { U.speed=+v; U.paused=false; act(G,'speed',{x:U.speed}) } }
  else if(a==='hack'){ U.hackGo=true }   // v5.09: the player starts the hack; hackCheck opens it on the next frame
  else if(a==='zoom'){ if(v==='fit'){ CFIT=true; CFITK='' } else camZoom(v==='in'?0.75:1.35) }
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
  else if(a==='order'){ var ohi=d.h!==undefined?+d.h:null; res=orderFor(G,d.p,d.c,ohi); act(G,'order',{p:d.p,c:d.c,h:ohi},res); if(res==='ok'){ var oh=HULLS[ohi!==null?ohi:currentHull(G,d.c)]; okc='ok_order'; okp={p:pname(d.p),c:hullName(oh),y:oh.days} } }
  else if(a==='hubbuild'){ var hc0=onLine(G,d.p).length; res=buildHub(G,d.p); act(G,'hub',{p:d.p},res); okc='ok_hub'; okp={p:pname(d.p)};
    if(res==='ok'){ var hd=hc0-onLine(G,d.p).length; if(hd>0){ okc='ok_hubDrop'; okp.n=hd } }
    else if(res==='metal'||res==='parts'){ var hw=shortWhy(hubCost(G),G.earth); say(hw[0],hw[1]); draw(); return }
    else if(res==='hubCap'){ say('hubCap',hubCapP()); draw(); return } }
  else if(a==='wtab'){ U.wtab=v; draw(); return }
  else if(a==='ttab'){ U.ttab=v; draw(); return }
  else if(a==='hubraze'){ res=razeHub(G,d.p); act(G,'hubRaze',{p:d.p},res); okc='ok_hubRaze'; okp={p:pname(d.p)} }
  else if(a==='via'){ var vc0=onLine(G,d.p).length; res=setVia(G,d.p,v); act(G,'via',{p:d.p,h:v},res); okc='ok_via'; okp={p:pname(d.p),h:v==='earth'?T('u_viaEarth'):pname(v)};
    if(res==='ok'){ var vd=vc0-onLine(G,d.p).length; if(vd>0){ okc='ok_viaDrop'; okp.n=vd } } }
  else if(a==='build'){ var bh=HULLS[+d.h]; res=buildShip(G,+d.h); act(G,'build',{hull:bh.key,gen:bh.gen},res); okc='ok_build'; okp={n:G.nextShip-1,h:hullName(bh),y:bh.days} }
  else if(a==='drivehelp'){ U.driveHelp=!driveHelpOn(); try{ localStorage.setItem('lb.driveHelp',U.driveHelp?'1':'0') }catch(e){} }
  else if(a==='allhome'){ if(!U.homeArm) U.homeArm=true; else { U.homeArm=false; var hl=homeList(); hl.forEach(function(s){ res=setReserve(G,s.id,true); act(G,'reserve',{hull:s.id,on:true},res) }); okc='ok_allhome'; okp={n:hl.length} } }
  else if(a==='arksel'){ var av=v==='c'?'c':Math.max(+v,arkPaid(G)+1); U.arkSel=U.arkSel===av?null:av }
  else if(a==='allpier'){ var pl=pierOut(); pl.forEach(function(s){ res=setReserve(G,s.id,true); act(G,'reserve',{hull:s.id,on:true},res) }); res='ok'; okc='ok_allpier'; okp={n:pl.length} }
  else if(a==='reserve'){ var ron=d.on==='1'; res=setReserve(G,+d.s,ron); act(G,'reserve',{hull:+d.s,on:ron},res); okc=ron?'ok_reserve':'ok_unreserve'; okp={n:+d.s} }
  else if(a==='scrap'){ var sid2=+d.s; if(U.scrapArm!==sid2){ U.scrapArm=sid2 } else { U.scrapArm=null; res=scrap(G,sid2); act(G,'scrap',{hull:sid2},res); okc='ok_scrap' } }
  else if(a==='evac'){ var ep=d.p, ec=pickCourier(ep), ecol=G.colonies[ep];
    if(!ec){ say('evacNoCourier',{p:pname(ep),w:evacW(ep)}); act(G,'evacuate',{p:ep},'evacNoHull'); draw(); return }
    res=abandon(G,ec.id,ep); act(G,'evacuate',{p:ep,hull:ec.id},res);
    if(res==='ok'&&ecol&&ec.cap<Math.floor(ecol.pop)){ okc='ok_evac_short'; okp={n:hullName(HULLS[ec.hull]),p:pname(ep),c:ec.cap,l:Math.floor(ecol.pop)-ec.cap} } else { okc='ok_evac'; okp={p:pname(ep)} } }
  else if(a==='kit'){ var kct=kitCost(G.colonies[d.p]||{}).tier; res=orderKit(G,d.p); act(G,'kit',{p:d.p,t:kct},res); okc='ok_kit'; okp={p:pname(d.p),t:roman(kct-1)} }
  else if(a==='send'){ var sp=d.p, ss=shipById(G,U.who[sp]); if(!ss){ res='nofree' } else { var np=foundParty(G,ss,sp), wasRes=ss.reserve; res=colonize(G,ss.id,sp,np,0); if(res==='ok'&&wasRes){ setReserve(G,ss.id,false); resLeft(ss.id) } act(G,'colonize',{p:sp,hull:ss.id,people:np},res); okc='ok_found'; okp={p:pname(sp),n:np} } }
  else if(a==='drive'){ var dp=d.p||driveHost(); res=startDrive(G,dp); act(G,'drive',{p:dp,mark:(G.driveLvl||0)+1},res); okc='ok_drive'; okp={p:pname(dp)} }
  else if(a==='survey'){ var nsec=secName(SECTORS.length); res=survey(G); act(G,'survey',{sector:SECTORS.length},res); okc='ok_survey'; okp={s:nsec} }
  else if(a==='exget') U.exGet=v;
  else if(a==='expay') U.exPay=v;
  else if(a==='exn') U.exN=+v;
  else if(a==='exgo'){ var xn=+d.n; res=exchange(G,d.r,d.a,d.b,xn); act(G,'exchange',{r:d.r,n:xn,a:d.a,b:d.b},res); okc='ok_ex'; okp={n:num(xn),r:T(d.r)};
    if(res===d.a||res===d.b){ var xw=shortWhy(exchangeCost(G,d.r,d.a,d.b,xn),G.earth); say(xw[0],xw[1]); draw(); return } }
  else if(a==='arkbuy'){ res=arkBuy(G,+d.l); act(G,'arkbuy',{l:+d.l},res); okc='ok_arkbuy'; okp={n:roman(+d.l-1)}; if(res==='ok') U.arkSel=null; if(res==='metal'||res==='parts'||res==='food'||res==='fuel'){ var sw=shortWhy(arkOwed(G,+d.l),G.earth); say(sw[0],sw[1]); draw(); return } }
  else if(a==='search'){ var m=shipById(G,+d.m), hs=m?bestSearch(m):null; res=hs?search(G,hs.id,+d.m):'nofree'; act(G,'search',{m:+d.m},res); okc='ok_search'; okp={n:+d.m} }
  else if(a==='nightok'){ G.nightSeen=true }
  else if(a==='shiftok'){ var cb=el('shstop'); if(cb) U.shiftStop=cb.checked; G.shiftOpen=false; act(G,'shift_go',{stop:U.shiftStop}); autosave() }
  else if(a==='noteok') U.notes.shift();
  else if(a==='notego'){ U.notes.shift(); U.win=null; U.tab=v||null; if(U.tab) U.paused=true }   // v4.50 (Claude's playtest 04.11): a side tab does not hold the clock — the note's way there pins the pause (~80 years lost at 4×)
  else if(a==='pfok') U.pf=null;
  else if(a==='ltr'){ var lid=+v, lt=letterById(lid); if(lt){ lt.read=true; if(U.ltOpen===lid){ U.ltOpen=null; U.strips=(U.strips||[]).filter(function(s){ return s.id!==lid }) } else U.ltOpen=lid } }
  else if(a==='ordgen'){ var og=v.split(':'); U.ordSel=U.ordSel||{}; U.ordSel[og[0]]=+og[1] }
  else if(a==='export'){ U.pop=null; showLog(); draw(); return }
  else if(a==='savelog'){ saveLog(); return }
  else if(a==='copylog'){ copyLog(); return }
  else if(a==='closelog'){ el('logbox').hidden=true }
  else if(a==='sfx'){ SFX.set(!SFX.isOn()); if(SFX.isOn()) SFX.play('ok') }
  else if(a==='uisize'){ uiScaleNext() }   // v5.03: the desk's size; the ≡ list stays open, its number follows
  else if(a==='help'){ if(U.tut.help) tutOff(); else tutOn() }
  else if(a==='save'){ U.pop=null; autosave(); saveFile() }
  else if(a==='load'){ U.pop=null; el('loadin').click() }
  else if(a==='loadauto'){ loadAuto(); return }
  else if(a==='texts'){ reloadTexts(); return }
  else if(a==='new'){ var sv=el('seedin'); start(sv?(parseInt(sv.value,10)||0):0); clockOn('new'); return }
  if(res==='range'){ var rp=d.p, rs=null, rh=null;   // nodes-1.01: 'range' from lineOk may be the courier limit or a hub — say which
    if(a==='pickgo'){ var pk2=v.split(':'); rp=pk2[2]; rs=shipById(G,+pk2[1]) } else if(a==='order') rh={hull:d.h!==undefined?+d.h:currentHull(G,d.c)}; else if(d.s) rs=shipById(G,+d.s);
    var rr=(rs||rh)&&rp?lineRefuse(G,rs||rh,rp):'range'; if(rr!=='ok') res=rr }
  if(res) say(res==='ok'?(okc||'ok'):(res==='queued'?'queued':res), res==='ok'?okp:lineWhyP(res));
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
  if(lb){ U.lang='en'; U.langPicked=true; draw(); return }   // v5.05: English only — the start window has one button
  var g=t.closest('#map .wd[data-p]'); if(g){ try{ window.getSelection().removeAllRanges() }catch(e){} openWorld(g.dataset.p); SFX.play('click'); tutAct('world',g.dataset.p); draw(); return }
  var b=t.closest('[data-act]');
  if(b&&b.dataset.act!=='pop'&&U.pop&&!b.closest('#pop')&&b.dataset.act!=='tab'&&b.dataset.act!=='world'){ U.pop=null }
  if(!b){
    if(U.pop&&!t.closest('#pop .advl,#pop .menu,#pop .pick,#pop .ltrs')){ U.pop=null; U.scrapArm=null; draw(); return }
    if(t.id==='ovl'&&winLight()){ U.win=null; U.scrapArm=null; draw(); return }
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
  if(e.key==='Escape'){ if(U.pop) U.pop=null; else if(U.win) U.win=null; else if(U.tab) U.tab=null; draw(); return }
  if(U.win&&planet(U.win)&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){ var O=stepOrder(U.win), i=O.indexOf(U.win); U.win=O[(i+(e.key==='ArrowLeft'?-1:1)+O.length)%O.length]; draw(); return }
  if(e.code==='Space'){ e.preventDefault(); pauseToggle(); draw() }
  var sp={'1':1,'2':2,'3':4}[e.key]; if(sp){ U.speed=sp; U.paused=false; draw() } });
document.addEventListener('mouseover',function(e){ var g=e.target.closest&&e.target.closest('#map .wd[data-p]'); drawTip(g) });

/* ---------- the map turns, moves and zooms (v5.05): drag = turn, right drag / shift / two fingers = move, wheel / pinch = zoom ----------
   No setPointerCapture: capturing on the <svg> retargets the following click to the <svg> itself and worlds stop being clickable
   (Nikita, 22.09: «не могу играть»). Move and up live on window, so a drag that leaves the map ends cleanly; a drag is not a click (MAPDRAGGED). */
(function(){
  var m=el('map'), P={}, drag=null, pinch=null;
  function moved(){ M3D.moved=true }   // v5.08: the SVG and the cut-outs follow the camera once a frame, not on every pointer move (120 a second on a tablet)
  m.addEventListener('contextmenu',function(e){ e.preventDefault() });
  m.addEventListener('wheel',function(e){ e.preventDefault(); camZoom(e.deltaY>0?1.12:0.89); moved() },{passive:false});
  m.addEventListener('pointerdown',function(e){ P[e.pointerId]={x:e.clientX,y:e.clientY}; if(!drag) MAPDRAGGED=false; if(!drag) drag={x0:e.clientX,y0:e.clientY,moved:false,pan:e.button===2||e.shiftKey}; pinch=null });
  window.addEventListener('pointermove',function(e){ var p=P[e.pointerId]; if(!p||!drag) return; var z=appZoom(), dx=(e.clientX-p.x)/z, dy=(e.clientY-p.y)/z; p.x=e.clientX; p.y=e.clientY;
    if(!drag.moved){ if(Math.abs(e.clientX-drag.x0)+Math.abs(e.clientY-drag.y0)<5) return; drag.moved=true; m.classList.add('drag') }
    var ids=Object.keys(P);
    if(ids.length>=2){ var a=P[ids[0]], b=P[ids[1]], d=Math.hypot(a.x-b.x,a.y-b.y)||1; if(pinch) camZoom(pinch/d); pinch=d; camPan(dx/2,dy/2) }
    else if(drag.pan) camPan(dx,dy); else camTurn(dx,dy);
    moved() });
  function end(e){ if(!P[e.pointerId]) return; delete P[e.pointerId]; pinch=null; if(Object.keys(P).length) return;
    if(drag&&drag.moved) MAPDRAGGED=true; drag=null; m.classList.remove('drag') }
  window.addEventListener('pointerup',end); window.addEventListener('pointercancel',end);
})();
/* desktop first (Nikita 16.10): below 1180×700 the whole desk is scaled down, nothing reflows.
   v5.03 (Nikita 06.11: «если монитор большой, всё крошечное»): it also grows — the desk is drawn as if the screen were 1440×860
   (1.26× on 1920×1080, 1.67× on 2560×1440), never below 1× on a screen that fits 1180×700; the player's size from the menu
   (UI_STEPS, lb.uiScale) multiplies that, and the desk is never narrower than 1180×700 of its own pixels.
   --ah is the desk's own height: 100vh inside a scaled desk is the screen's, not the desk's */
var UI_STEPS=[0.8,0.9,1,1.15,1.3,1.5];
function uiScale(){ if(U.uiScale===undefined){ U.uiScale=1; try{ var v=+localStorage.getItem('lb.uiScale'); if(UI_STEPS.indexOf(v)>=0) U.uiScale=v }catch(e){} } return U.uiScale }
function uiScaleNext(){ var i=UI_STEPS.indexOf(uiScale()); U.uiScale=UI_STEPS[(i+1)%UI_STEPS.length];
  try{ localStorage.setItem('lb.uiScale',String(U.uiScale)) }catch(e){} fit(); if(G){ drawMap(); tutPlace() } return U.uiScale }
function fit(){ var a=el('app'), w=window.innerWidth, h=window.innerHeight, zmax=Math.min(w/1180,h/700),
  auto=Math.max(Math.min(1,zmax),Math.min(w/1440,h/860)), z=Math.max(0.3,Math.min(zmax,auto*uiScale()));
  a.dataset.z=z; a.style.transform=z!==1?'scale('+z+')':''; a.style.width=(w/z)+'px'; a.style.height=(h/z)+'px'; a.style.setProperty('--ah',(h/z)+'px') }
window.addEventListener('resize',function(){ fit(); if(G){ drawMap(); tutPlace() } });

/* ---------- loop ---------- */
/* v4.31 (Nikita, 13.10, F-45: '4x too fast'): 1x 1.5 s, 2x 1.0 s, 4x 0.6 s, 10x 0.2 s a year */
var MS={1:1500,2:1000,4:600,10:200};   // v4.42: 10 has no button or key — only the scenarios reach it (LNU.speed=10)
/* v4.46: the run's clock (G.clock, see clockOut in core.js) — starts at the New Game press, saved with the run. A hidden tab and a
   frame gap over a second do not count: the player is away */
function clockOn(from){ if(G) G.clock={from:from,at:new Date().toISOString(),ms:0,run:0,sp:{}} }
function clockTick(dt){ var c=G&&G.clock; if(!c||G.over||document.hidden) return; dt=Math.min(dt,1000); c.ms+=dt;
  if(!halted()){ c.run+=dt; c.sp[U.speed]=(c.sp[U.speed]||0)+dt } }
/* v5.05: the 3D chart turns its spheres and sends its wave between the years, 20 a second; v5.07: at once when the camera or the chart moved */
function m3frame(ts){ if(!G) return; if(M3D.moved){ M3D.moved=false; drawMap(); tutPlace() } if(M3D.dirty||ts-M3D.last>50){ M3D.last=ts; M3D.dirty=false; try{ draw3d(ts) }catch(e){} } }
function frame(ts){
  if(!U.last) U.last=ts;
  var dt=ts-U.last; U.last=ts; clockTick(dt); hackCheck();
  m3frame(ts);
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
  G.hackGate=!TUTX.hook||!!window.LBHACKTEST; U.hackGo=false;   // the hack (Nikita 04.11): a player's run; the scenarios' hook «всё открыто» skips it unless a scenario asks
  U.win=null; U.tab=null; U.pop=null; U.paused=true; U.acc=0; U.hist=[]; U.pf=null; U.voiceSeq=0; U.voiceLast=0; U.voy={}; U.capt={}; U.founded=0; U.notes=[]; U.who={}; U.scrapArm=null; U.gk=null; U.foodWarnAt=null; U.worksSeen=false; U.focusK=null; U.strips=[]; U.ltOpen=null; U.ordSel={}; lineWhy={}; HTMLCACHE={};
  CFIT=true; CFITK=''; P3N=-1;
  window.LN=G; window.LNU=U; window.LNdraw=draw;   // dev hooks for the Playwright scenarios
  window.LNsave=dump; window.LNload=undump; window.LNI={halted:halted,big:bigKind,adv:advRows,wst:wst,flags:flags,tut:tutState,hname:hname};   // v4.35: what the interface derives, for the scenarios and the bot player
  window.LNtut={off:function(){ TUTX.hook=true; if(!window.LBHACKTEST) G.hackGate=false; LBMENU.close(); tutMute() }};   // v4.36: the scenarios' hook «всё открыто»: no voices, no helper; v4.40: and no main menu — the language window stands instead
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
