/* LONG NIGHT — interface layer. Depends on core.js globals. */
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


var TONE={voice:'vo',shift:'ch',first_landfall:'ch',epitaph:'ch',old_night:'ch',ark_sailed:'ch',ark_woke:'ch',ark_grounded:'ch',ark_drive:'gd',desk_silent:'ch',night_dated:'bd',night_near:'bd',ark_block:'gd',crash:'bd',reassigned:'hi',surveyed:'gd',drive_mark:'gd',earth_dead:'bd',colony_founded:'gd',delivered:'gd',awaiting:'hi',quota_ok:'gd',relay_up:'gd',ship_returns:'gd',search_found:'gd',punitive_ok:'gd',hyper:'gd',relief_done:'gd',evacuated:'hi',
 quota_miss:'bd',revolt:'bd',ship_missing:'bd',colony_failed:'bd',punitive_fail:'bd',demand_unmet:'bd',ship_written_off:'bd',depleted:'hi',demand:'hi',works_idle:'hi',starved:'bd',earth_short:'bd',ev_rich:'gd',ev_seam:'gd',ev_short:'bd',mutiny:'bd',ev_wreck:'bd',ev_disaster:'bd',doomsday:'ch',dropped:'dim',drive_started:'gd',drive_lost:'bd',fragment:'hi',order_sent:'hi'};

var KIND={mine:'kMine',farm:'kFarm',well:'kWell',works:'kWorks'};
var KINDD={mine:'kMineD',farm:'kFarmD',well:'kWellD',works:'kWorksD'};
/* v3.7 (Nikita, 23.09): a world is drawn in the colour of what it gives — the same colour its resource has everywhere else */
var KCOL={mine:'#C9CFD6',farm:'#3DDC84',well:'#FF8A1F',works:'#F2F1EC'};
var RCOL={metal:'#C9CFD6',food:'#3DDC84',fuel:'#FF8A1F',parts:'#F2F1EC',people:'#FFD23F'};
/* quantity with its icon, in its colour: the number is never alone */
function qty(k,n,word){ return '<i class="q c-'+k+'">'+ico(k)+n+(word?' '+(DEP[U.lang][k]||k):'')+'</i>' }
var INK='#F2F1EC', INK2='#9C9B95', INK3='#5E5D58', RED='#FF2A1A', RED2='#FFB1A8';
/* one mark per trade: circle mine, square farm, diamond well, triangle works */
function mark(kind,x,y,r,fillc,strokec,sw){
  var f=' fill="'+fillc+'" stroke="'+strokec+'" stroke-width="'+sw+'"';
  if(kind==='farm') return '<rect x="'+(x-r)+'" y="'+(y-r)+'" width="'+(2*r)+'" height="'+(2*r)+'"'+f+'/>';
  if(kind==='well') return '<rect x="'+(x-r)+'" y="'+(y-r)+'" width="'+(2*r)+'" height="'+(2*r)+'" transform="rotate(45 '+x+' '+y+')"'+f+'/>';
  if(kind==='works') return '<polygon points="'+x+','+(y-r*1.15)+' '+(x+r*1.1)+','+(y+r*0.85)+' '+(x-r*1.1)+','+(y+r*0.85)+'"'+f+'/>';
  return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'"'+f+'/>';
}




/* v4.9: ship messages stack bottom-right; a dead seam shouts bottom-left. Neither stops the clock. */
function toast(html,cls,ms){ var box=el('toasts'); if(!box){ box=document.createElement('div'); box.id='toasts'; document.body.appendChild(box) }
  var t=document.createElement('div'); t.className='tst'+(cls?' '+cls:''); t.innerHTML=html; box.appendChild(t);
  SFX.play(cls==='bad'?'warn':'info');
  while(box.children.length>4) box.removeChild(box.firstChild);
  setTimeout(function(){ t.classList.add('gone'); setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t) },400) }, ms||6000); }
function bigAlert(html,cls,ms){ var a=el('alert'); if(!a){ a=document.createElement('div'); a.id='alert'; document.body.appendChild(a) }
  a.className='show'+(cls?' '+cls:''); a.innerHTML=html; SFX.play(/red/.test(cls||'')?'crit':'bad'); clearTimeout(bigAlert._t); bigAlert._t=setTimeout(function(){ a.className='' }, ms||9000); }
function toastLast(){ var e=G.log[G.log.length-1]; if(!e) return; var tpl=LOG[U.lang][logKey(e)]; if(!tpl) return;
  var d={}; for(var q in e.d) d[q]=e.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p); if(d.dep) d.dep=DEP[U.lang][d.dep]||d.dep; if(d.g!==undefined) d.g=roman(d.g); if(d.t!==undefined&&String(e.code).slice(0,4)==='kit_') d.t=roman(d.t-1);
  if(e.code==='depleted'){ bigAlert('<b>'+T('alertDepleted')+'</b><span>'+esc(fill(tpl,d))+'</span>','red'); return }
  toast(esc(fill(tpl,d)), TONE[e.code]==='bd'?'bad':'', 6000); }
/* v4.10 (Nikita, 27.09): rations low and no farm feeding Earth → yellow blinking block, once a shift */
function foodWatch(){ if(U.pro.on||!G.need) return; var yrs=G.earth.food/Math.max(0.1,G.need.food);
  var farms=0; for(var k in G.colonies){ var c=G.colonies[k]; if(!c.dark&&planet(k).kind==='farm'&&G.reserves[k]>0&&onLine(G,k).length) farms++ }
  if(yrs<K.FOOD_WARN_YEARS&&!farms&&(!U.foodWarnAt||G.day-U.foodWarnAt>=K.SHIFT_YEARS)){ U.foodWarnAt=G.day; bigAlert('<b>'+T('alertFood')+'</b><span>'+esc(fill(T('alertFoodBody'),{n:Math.round(yrs)}))+'</span>','warn blink',12000) } }
/* v4.12 (Nikita, 30.09: "когда я нажал кнопку, я хочу видеть подтверждение нажатия и что действие произошло
   и будет результат или не будет, потому что"): say() is the one voice for every order — green with what
   happened, red with why not. It also sounds. */
var GOOD_CODES={ok:1,lineSet:1,policySet:1,copied:1,saved:1,textsOk:1};
function say(code,p){
  var t=el('toast'); if(!t) return;
  var m=fill(MSG[U.lang][code]||code,p||null);
  t.textContent=m;
  var good=GOOD_CODES[code]||/^ok_/.test(code);
  t.className = good ? 'show good' : (code==='halted' ? 'show' : 'show bad');
  SFX.play(good?'ok':(code==='halted'?'info':'deny'));
  clearTimeout(say._t); say._t=setTimeout(function(){t.className=''},3200);
}
/* v4.12: every sound is synthesised — no files. Browsers keep audio shut until the first gesture,
   so the context is unlocked on pointerdown/keydown. Severity: info < warn < bad < crit. */
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
    voice:function(t){ tone(1320,t,0.05,'sine',0.1); tone(1760,t+0.06,0.14,'sine',0.1) }
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
function off(code,p){ return (code&&code!=='ok') ? ' aria-disabled="true" data-why="'+attr(code)+'"'+(p?' data-whyp="'+attr(JSON.stringify(p))+'"':'') : '' }
/* the first thing Earth is short of, as a why-code with the shortfall */
function shortWhy(c,E){ var keys=['metal','food','fuel','parts','people'];
  for(var i=0;i<keys.length;i++){ var k=keys[i]; if(!c[k]) continue; var have=(k==='people')?E.people-K.EARTH_KEEP:E[k];
    if(have<c[k]) return ['short_'+k,{n:Math.ceil(c[k]-have),k:K.EARTH_KEEP}] }
  return ['ok',null] }
function offCost(c,E){ var w=shortWhy(c,E); return off(w[0],w[1]) }
/* v4.12 (Nikita, 30.09: "чтобы буквы стали картинками"): ship classes by silhouette — boat, trawler, container ship */
function dico(){ return '<svg class="kico" aria-hidden="true" style="width:22px;height:16px;margin-right:6px;vertical-align:-3px"><use href="#i-drive"/></svg>' }   // v4.13
function sico(cls){ return '<svg class="sico sico-'+cls+'" aria-hidden="true"><use href="#i-'+cls+'"/></svg>' }
function kico(kind,cls){ return '<svg class="'+(cls||'kico')+'" aria-hidden="true"><use href="#i-k-'+kind+'"/></svg>' }
function pico(sym,k){ return '<span class="pico"><svg class="pi" aria-hidden="true"><use href="#i-'+sym+'"/></svg>'+(k?ico(k):'')+'</span>' }

var U={hist:[], dockOpen:true, pro:{on:false,stage:0,w:null,calls:[],seen:{}}, start:false, lang:'en', langPicked:false, introStep:0, opening:false, openStep:0, logSeen:0, logBig:false, logMode:'desk', autopause:false, ff:false, shiftStop:true, manual:false, tab:'earth', sel:null, selShip:null, pickShip:null, pickDest:null, advOpen:true, speed:2, paused:true, acc:0, last:0};
var G=null;
function T(k,p){var s=(L[U.lang][k]!==undefined?L[U.lang][k]:k);return fill(s,p)}
var YRS={en:['year','years','years'],ru:['год','года','лет']};
function yrs(n){ n=Math.abs(Math.round(+n||0)); var a=YRS[U.lang]||YRS.en;
  if(U.lang==='ru'){ var m=n%10, h=n%100; if(h>=11&&h<=14) return a[2]; if(m===1) return a[0]; if(m>=2&&m<=4) return a[1]; return a[2] }
  return n===1?a[0]:a[1] }
function fill(s,p){if(!p)return s;return s.replace(/\{(\w+)\}/g,function(_,k){
  if(k==='yr') return yrs(p.n); if(k==='yrt') return yrs(p.t); if(k==='yrl') return yrs(p.l); if(k==='yrd') return yrs(p.d);
  return p[k]!==undefined?p[k]:'{'+k+'}'})}
/* resource icon + coloured number; the short part of a price goes red */
function ico(k){ return '<svg class="ico c-'+k+'"><use href="#i-'+k+'"/></svg>' }
function costHtml(c,E,prefix){
  var out=[], keys=['metal','food','fuel','parts','people'];
  for(var i=0;i<keys.length;i++){ var k=keys[i]; if(!c[k]) continue;
    var have = E ? (k==='people' ? E.people-K.EARTH_KEEP : E[k]) : Infinity;
    out.push('<i class="c-'+k+(have<c[k]?' short':'')+'">'+ico(k)+(prefix||'')+Math.round(c[k])+'</i>'); }
  return '<span class="cost">'+out.join('')+'</span>';
}
function pname(id){var p=planet(id);return p?p.desig+' '+p.name.toUpperCase():id}
function n0(x){return Math.round(x)}
function el(id){return document.getElementById(id)}
/* v4.8 (Nikita, 27.09: 'игра подтормаживает'): a panel is only rewritten when its markup changed */
var HTMLCACHE={};
function setHTML(id,html){ if(HTMLCACHE[id]===html) return false; HTMLCACHE[id]=html; el(id).innerHTML=html; return true }
function esc(s){return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}

/* ---------- the opening: six cards, why the desk exists ----------
   v4.3 (Nikita, 25.09: "игра начинается с картинок и текста — как Земля пришла к тому, что есть; чтобы
   игрок понял, зачем он тут"). Tone chosen by Nikita: the cold institution, not the last chance of mankind —
   the Night must have room to turn the game over later. Text lives in the table (UI open.c1..c6);
   the pictures are procedural SVG in the desk's own black/white/red, one line of red per card at most. */
var OPEN_N=6;
function openStart(){ U.opening=true; U.openStep=0; U.start=false; U.intro=false; }
function openDone(){ U.opening=false; U.openStep=0; U.start=true; }
function openNext(){ if(U.openStep<OPEN_N-1) U.openStep++; else openDone(); }
function openArt(i){
  var W=800,H=240,o='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
  var k;
  if(i===0){ /* the horizon, and a sea with nothing in it */
    o+='<line x1="0" y1="96" x2="'+W+'" y2="96" stroke="var(--ink)" stroke-width="1.5"/>';
    for(k=0;k<9;k++){ var y=112+k*15, op=(0.55-k*0.055).toFixed(2); o+='<line x1="0" y1="'+y+'" x2="'+W+'" y2="'+y+'" stroke="var(--ink3)" stroke-dasharray="'+(26+k*9)+' '+(10+k*7)+'" opacity="'+op+'"/>' }
  } else if(i===1){ /* what earth burns, year on year */
    for(k=0;k<26;k++){ var h=Math.round(28*Math.pow(1.075,k)), x=40+k*28; o+='<rect x="'+x+'" y="'+(206-h)+'" width="18" height="'+h+'" fill="'+(k===25?'var(--red)':'var(--ink)')+'" opacity="'+(k===25?1:(0.35+k*0.025).toFixed(2))+'"/>' }
    o+='<line x1="30" y1="206" x2="'+W+'" y2="206" stroke="var(--ink3)"/>';
  } else if(i===2){ /* a hundred nations, one desk */
    var c=0; for(var r=0;r<5;r++) for(k=0;k<20;k++){ var x2=48+k*37, y2=30+r*40, mid=(r===2&&k===9); c++;
      o+= mid ? '<rect x="'+(x2-12)+'" y="'+(y2-12)+'" width="24" height="24" fill="var(--ink)"/><rect x="'+(x2-3)+'" y="'+(y2-3)+'" width="6" height="6" fill="var(--red)"/>'
              : '<rect x="'+(x2-7)+'" y="'+(y2-7)+'" width="14" height="14" fill="none" stroke="var(--ink3)"/>' }
  } else if(i===3){ /* earth, three worlds, three lines that run on their own */
    var E=[120,120], Ws=[[430,52],[600,128],[720,208]];
    Ws.forEach(function(w,j){ o+='<line x1="'+E[0]+'" y1="'+E[1]+'" x2="'+w[0]+'" y2="'+w[1]+'" stroke="var(--ink3)"/>';
      var t=0.35+j*0.2, mx=E[0]+(w[0]-E[0])*t, my=E[1]+(w[1]-E[1])*t;
      o+='<rect x="'+(mx-4)+'" y="'+(my-4)+'" width="8" height="8" fill="var(--ink)"/>';
      o+='<circle cx="'+w[0]+'" cy="'+w[1]+'" r="8" fill="none" stroke="var(--ink)" stroke-width="1.5"/>' });
    o+='<circle cx="'+E[0]+'" cy="'+E[1]+'" r="22" fill="none" stroke="var(--ink)" stroke-width="2"/><rect x="'+(E[0]-3)+'" y="'+(E[1]-3)+'" width="6" height="6" fill="var(--red)"/>';
  } else if(i===4){ /* the shifts: eighty years each, and the first one is yours */
    var x0=40, x1=760, n=9, step=(x1-x0)/n;
    o+='<line x1="'+x0+'" y1="120" x2="'+x1+'" y2="120" stroke="var(--ink3)"/>';
    o+='<line x1="'+x0+'" y1="120" x2="'+(x0+step)+'" y2="120" stroke="var(--ink)" stroke-width="3"/>';
    for(k=0;k<=n;k++){ var tx=x0+k*step; o+='<line x1="'+tx+'" y1="110" x2="'+tx+'" y2="130" stroke="'+(k<=1?'var(--ink)':'var(--ink3)')+'"/>';
      o+='<text x="'+tx+'" y="152" text-anchor="middle" font-family="var(--mono)" font-size="11" fill="'+(k<=1?'var(--ink)':'var(--ink3)')+'">'+(k*80)+'</text>' }
    o+='<rect x="'+(x0-4)+'" y="'+(120-4)+'" width="8" height="8" fill="var(--red)"/>';
  } else { /* the desk is on */
    o+='<rect x="'+(W/2-6)+'" y="'+(H/2-6)+'" width="12" height="12" fill="var(--red)"><animate attributeName="opacity" values="1;0.15;1" dur="1.6s" repeatCount="indefinite"/></rect>';
  }
  return o+'</svg>';
}
/* ---------- the prologue: "First line" ----------
   v3.8 (playtest 23.09: "1 планета, 1 корабль, минимум метрик; каждый новый счётчик подсвечен и пояснён").
   Six stages, each opened by the player's own action, never by the clock. Stages 0–1 run on rails:
   one thing on the screen answers to a click and it pulses. Everything else is drawn only once the
   player has a reason to look at it. Nothing here touches the core; G.safe only disables the two dice
   that could break a first run (a lost landing, a lost hull). */
var PRO_STEPS=6;
function proPick(){
  var w={}; PLANETS.forEach(function(p){ if(p.sec!==0) return; if(!w[p.kind]||p.dist<w[p.kind].dist) w[p.kind]=p });
  return {mine:w.mine&&w.mine.id, farm:w.farm&&w.farm.id, well:w.well&&w.well.id, works:w.works&&w.works.id};
}
function proStart(){
  U.pro={on:true,stage:0,w:proPick(),calls:['cPeople'],seen:{}};
  G.safe=true; U.dockOpen=true; U.tab='earth'; U.sel=null;
}
function proEnd(){ U.pro.on=false; U.pro.stage=PRO_STEPS; G.safe=false; U.pro.calls=['cAdvisor']; var m=0; for(var i=0;i<G.log.length;i++) if((G.log[i].seq||0)>m) m=G.log[i].seq; U.voiceSeq=m; }
function proOn(){ return U.pro.on }
function proStage(){ return U.pro.on?U.pro.stage:PRO_STEPS }
/* what the player may see at this stage */
function proSee(what){
  var st=proStage();
  switch(what){
    case 'metal': return st>=1; case 'food': return st>=2; case 'fuel': return st>=3; case 'parts': return st>=4; case 'people': return true;
    case 'worlds': return st>=2; case 'dock': return st>=3; case 'rings': return st>=5; case 'sectors': return st>=5;
    case 'advisor': return st>=5; case 'stats': return st>=5; case 'survey': return st>=5; case 'full': return !U.pro.on;
  }
  return true;
}
function proWorldVisible(pid){
  if(!U.pro.on||U.pro.stage>=5) return true;
  var w=U.pro.w, order=[w.mine,w.farm,w.well,w.works], i=order.indexOf(pid);
  return i>=0 && i<=Math.max(0,U.pro.stage-1);
}
function proLined(pid){ return G.ships.some(function(s){return s.mode!=='dead'&&s.from===pid}) }
function proFree(){ return G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)}) }
function proUpdate(){
  var P=U.pro; if(!P.on) return;
  var w=P.w, s=P.stage;
  if(s===0&&G.colonies[w.mine]&&proFree().length) P.stage=1;
  else if(s===1&&proLined(w.mine)&&G.delivered.metal>0) P.stage=2;
  else if(s===2&&proLined(w.farm)) P.stage=3;
  else if(s===3&&proLined(w.well)) P.stage=4;
  else if(s===4&&proLined(w.works)) P.stage=5;
  if(P.stage!==s){
    var add={1:['cMetal'],2:['cFood'],3:['cFuel','cDock'],4:['cParts'],5:['cSurvey']}[P.stage]||[];
    P.calls=P.calls.concat(add); U.tab='earth'; U.sel=null;
  }
}
/* the task card: what to do now, and how long the wait is */
function proTask(){
  var P=U.pro, w=P.w, s=P.stage, E=G.earth, d={}, key, hint='', pulse=[];
  var pn=function(id){return pname(id)};
  var flying=G.ships.filter(function(x){return x.mode==='transit'});
  var away=function(pid){ return flying.filter(function(x){return x.dest===pid||x.origin===pid})[0] };
  if(s===0){
    var col=G.colonies[w.mine], sh=away(w.mine);
    if(col){ key='t0c'; d={n:sh?sh.id:'',y:sh?sh.t:0}; if(U.paused) pulse.push('#b-pause') }
    else if(sh){ key='t0b'; d={n:sh.id,y:sh.t}; if(U.paused) pulse.push('#b-pause') }
    else { key='t0'; d={p:pn(w.mine)}; pulse.push('world:'+w.mine,'[data-act="colonize"]') }
  } else if(s===1){
    if(proLined(w.mine)){ key='t1b'; var ln=G.ships.filter(function(x){return x.from===w.mine})[0]; d={y:ln?legDays(G,w.mine,'earth',ln)*2:0}; if(U.paused) pulse.push('#b-pause') }
    else { key='t1'; d={p:pn(w.mine)}; pulse.push('world:'+w.mine,'[data-act="want"][data-c="courier"].plus') }
  } else if(s===2){ key='t2'; d={p:pn(w.farm),n:(proFree()[0]||{}).id||''}; if(!proFree().length&&!G.colonies[w.farm]) key='t2w' }
  else if(s===3){
    var building=G.ships.filter(function(x){return x.mode==='building'})[0];
    if(!G.colonies[w.well]&&!proFree().length&&!away(w.well)){ if(building){ key='t3b'; d={y:building.t} } else { key='t3'; d={p:pn(w.well)}; pulse.push('#dock .dbtn:not(:disabled)') } }
    else { key='t3c'; d={p:pn(w.well)} }
  } else if(s===4){ key='t4'; d={p:pn(w.works)} }
  else { key='t5'; d={} }
  return {key:key,d:d,pulse:pulse};
}
function drawTask(box){
  var t=proTask(), s=U.pro.stage;
  box.className=''; box.classList.toggle('shut',false);
  box.innerHTML='<div id="task"><div class="tk"><span>'+T('taskTitle')+'</span><span>'+fill(T('taskStep'),{a:Math.min(s+1,PRO_STEPS),b:PRO_STEPS})+'</span></div>'+
    '<div class="tt">'+fill(T(t.key),t.d)+'</div>'+
    (s===5?'<button class="btn prim" type="button" data-act="prodone">'+T('t5go')+'</button>':'')+
    '</div>';
  // rails: pulse what the player must touch
  document.querySelectorAll('.rail').forEach(function(e){e.classList.remove('rail')});
  t.pulse.forEach(function(sel){ if(sel.indexOf('world:')===0) return; var e=document.querySelector(sel); if(e) e.classList.add('rail') });
}
/* stages 0–1 are on rails: only these clicks go through */
function railsAllow(ev){
  if(!U.pro.on||U.pro.stage>=2) return true;
  var c=function(sel){ return ev.target.closest&&ev.target.closest(sel) };
  if(c('#pf')||c('#b-pause')||c('[data-spd]')||c('#b-auto')||c('#b-lang')||c('#b-logx')||c('#b-logf')||c('#btm')||c('[data-zoom]')||c('#callout')||c('#intro')||c('#lang')||c('#ov')) return true;
  if(c('[data-act="guide"]')||c('[data-ship]')||c('.tab[data-tab="earth"]')||c('.tab[data-tab="target"]')) return true;
  var t=proTask();
  var g=c('.pnode'); if(g) return t.pulse.indexOf('world:'+g.dataset.p)>=0;
  var b=c('[data-act]'); if(b){ var act='[data-act="'+b.dataset.act+'"]'; return t.pulse.some(function(x){ return x.indexOf(act)===0 }) }   // v4.6: a pulse may carry extra selectors (.plus)
  return false;
}
/* callouts: one at a time, anchored to the thing they explain */
var CALL_ANCHOR={cPeople:'.rcell.r-people',cMetal:'.rcell.r-metal',cFood:'.rcell.r-food',cFuel:'.rcell.r-fuel',cParts:'.rcell.r-parts',cDock:'#dockhd',cAdvisor:'#advhead',cSurvey:'[data-act="survey"]'};
function drawCallout(){
  var old=el('callout'); if(old) old.remove();
  var q=U.pro.calls; if(!q||!q.length) return;
  if(el('intro')&&!el('intro').hidden) return;
  var key=q[0], anchor=document.querySelector(CALL_ANCHOR[key]);
  if(!anchor){ if(key==='cSurvey'){ q.shift(); return } return }
  var app=el('app'), ar=anchor.getBoundingClientRect(), pr=app.getBoundingClientRect();
  var box=document.createElement('div'); box.id='callout';
  box.innerHTML='<i class="ca"></i>'+esc(T(key))+'<br><button class="btn" type="button" data-act="callok">'+T('calloutOk')+'</button>';
  app.appendChild(box);
  var up = key==='cDock';
  var left=Math.max(8,Math.min(ar.left-pr.left, pr.width-310));
  var top = up ? ar.top-pr.top-box.offsetHeight-10 : ar.bottom-pr.top+10;
  // never sit on the task card / advisor: step to its right
  var adv=el('advisor'); if(adv&&!adv.hidden){ var vr=adv.getBoundingClientRect();
    var ox=vr.left-pr.left, oy=vr.top-pr.top;
    if(left<ox+vr.width+8&&left+300>ox&&top<oy+vr.height+8&&top+box.offsetHeight>oy){ left=Math.min(ox+vr.width+12, pr.width-310); box.querySelector('.ca').style.left=Math.max(10,ar.left-pr.left-left+14)+'px' } }
  box.style.left=left+'px'; box.style.top=top+'px';
  if(up) box.classList.add('up');
}
/* previews: what the order will do, before the button is pressed */
function foundPreview(p,n){
  var cap=popCap(p), dep=p.kind==='works'?'parts':p.dep;
  n=Math.max(0,Math.min(n,cap));
  var rate=p.kind==='works'? n*p.rich*K.REFINE : n*p.rich*K.PROD;
  return fill(T('prevFound'),{n:n,r:rate.toFixed(2),dep:DEP[U.lang][dep],cap:cap});
}
function linePreview(p,s){
  var dep=p.kind==='works'?'parts':p.dep;
  return fill(T('prevLine'),{t:legDays(G,p.id,'earth',s)*2,cap:s.cap,dep:DEP[U.lang][dep]});
}


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
    U.voiceLast=G.day;
    U.pf={k:k,role:role,name:name,no:no,d:d||{},seed:seed,sub:o.sub||''};
    U.paused=true; SFX.play('voice');
  }
}
function voiceLine(e){ var v=VOICE[U.lang]||{}; var d={}; for(var q in e.d.d) d[q]=e.d.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p); if(d.dep) d.dep=DEP[U.lang][d.dep]||d.dep; return {who:v[e.d.role]||e.d.role,name:e.d.name,line:fill(v[e.d.k]||e.d.k,d)} }
/* what the log said since last time, and who answers it */
function voiceWatch(){
  if(!G||U.pro.on) return;
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
    else if(e.code==='colony_founded'&&planet(e.d.p)&&planet(e.d.p).kind==='works'&&!U.worksSeen){ U.worksSeen=true; bigAlert('<b>'+T('alertWorks')+'</b><span>'+esc(fill(T('alertWorksBody'),{p:pname(e.d.p),n:driveWorkFor(G)}))+'</span>','warn',14000) }
    else if(e.code==='kit_built') voice('kit_built','role_head',{p:d.p,t:roman(d.t-1),x:d.x},{quiet:true,seed:hash32(0x5d,(+String(d.p).slice(1)||0)+d.t*7),day:e.day,seq:e.seq});
    else if(e.code==='kit_starved') voice('kit_starved','role_head',{p:d.p,t:roman(d.t-1)},{quiet:true,seed:hash32(0x5e,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if(e.code==='colony_founded'){ U.founded++; voice('colony_founded','role_head',{pop:d.pop,p:d.p},{seed:hash32(0x51,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq}) }
    else if(e.code==='ship_missing'){ var sm=shipById(G,d.n); voice('ship_missing','role_duty',{hull:d.n,crew:sm?sm.crew:0},{day:e.day,seq:e.seq}) }
    else if(e.code==='evacuated'||e.code==='evac_partial') voice('evacuated','role_head',{pop:d.pop,p:d.p},{seed:hash32(0x52,(+String(d.p).slice(1)||0)),day:e.day,seq:e.seq});
    else if(e.code==='night_near'&&d.n===100){ var big=null; for(var kk in G.colonies){ if(!G.colonies[kk].dark&&(!big||G.colonies[kk].pop>G.colonies[big].pop)) big=kk } if(big) voice('left_behind','role_head',{p:big},{force:true,seed:hash32(0x53,(+big.slice(1)||0)),day:e.day,seq:e.seq}) }
    else if(e.code==='night_near'&&d.n===25){ var lb=leftBehind(G); voice('ark_closed','role_chief',{left:lb.home+lb.hulls+lb.colonies+lb.transit},{force:true,day:e.day,seq:e.seq}) }
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
function drawPF(){
  var old=el('pf'); if(old) old.remove();
  var f=U.pf; if(!f) return;
  if((el('intro')&&!el('intro').hidden)||(el('ov')&&!el('ov').hidden)) return;   // one window at a time: the desk speaks after the modal
  var v=VOICE[U.lang]||{}, d={}; for(var q in f.d) d[q]=f.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p);
  var box=document.createElement('div'); box.id='pf';
  box.innerHTML='<div id="pfbox"><canvas width="64" height="64"></canvas><div class="pfb">'+
    '<div class="pfk"><span>'+T('pfTitle')+'</span><span>'+String(G.day).padStart(4,'0')+'</span></div>'+
    '<div class="pfn">'+esc(f.name)+'</div>'+
    '<div class="pfm">'+esc(v[f.role]||f.role)+' · '+esc(fill(T('pfNo'),{n:f.no}))+(f.sub?' · '+esc(f.sub):'')+'</div>'+
    '<div class="pfl">'+esc(fill(v[f.k]||f.k,d))+'</div>'+
    '<button class="btn" type="button" data-act="pfok">'+T('pfOk')+'</button></div></div>';
  el('app').appendChild(box);
  drawPortrait(box.querySelector('canvas'),f.seed);
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
function pos(p){
  var R=SECTORS[p.sec].r;
  return {x:CX+Math.cos(p.ang)*R*1.32, y:CY+Math.sin(p.ang)*R*0.90};
}

/* ---------- the viewport ----------
   The chart grows without end but the viewBox used to be a fixed 1000x700, so
   everything past sector 2 (ring radius 346, half-height 350) was drawn outside
   it and simply clipped — Nikita, 22.09: "on ring 4 you cannot see any of the
   following ones". The view now fits the whole chart by itself, and the wheel
   and a drag are there for when it is crowded. Marks are scaled by Z so text
   stays the same size on screen however far out the chart runs. */
var VIEW={x:0,y:0,w:1000,h:700}, VFIT=true, VSECS=-1, MAPDRAGGED=false;
function viewFit(){
  var R=secRadius(Math.max(0,SECTORS.length-1))+58;
  var w=Math.max(1000, R*1.32*2, R*0.90*2*(1000/700));
  for(var it=0;it<4;it++){            // the pad is screen-sized, so it scales with the fit: iterate
    var Z=w/1000;
    var w2=Math.max(1000, (R*1.32+128*Z)*2, (R*0.90+44*Z)*2*(1000/700));
    if(Math.abs(w2-w)<1){ w=w2; break } w=w2;
  }
  VIEW={x:CX-w/2, y:CY-w*0.35, w:w, h:w*0.7};
  VSECS=SECTORS.length;
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

function drawMap(){
  var s='', i, p, xy;
  if(VFIT&&VSECS!==SECTORS.length) viewFit();
  var Z=VIEW.w/1000;                       // world units per screen unit: keep marks constant on screen
  var F=function(n){return (n*Z).toFixed(2)};
  el('map').setAttribute('viewBox',VIEW.x.toFixed(1)+' '+VIEW.y.toFixed(1)+' '+VIEW.w.toFixed(1)+' '+VIEW.h.toFixed(1));
  s+='<rect x="'+VIEW.x.toFixed(1)+'" y="'+VIEW.y.toFixed(1)+'" width="'+VIEW.w.toFixed(1)+'" height="'+VIEW.h.toFixed(1)+'" fill="none" pointer-events="all"/>';
  s+=starfield();
  
  var gnow=G.gen||0;
  for(i=0;i<SECTORS.length;i++){
    if(i>0&&!proSee('sectors')) continue;
    var open=sectorOpen(G,i);
    var cls=classFor(i,gnow);                       // cheapest hull class that can serve this sector
    s+='<ellipse cx="'+CX+'" cy="'+CY+'" rx="'+(SECTORS[i].r*1.32)+'" ry="'+(SECTORS[i].r*0.90)+'" fill="none" stroke="'+(open?'#1B2husk':'#141C25')+'" stroke-width="'+F(1)+'" opacity="'+(open?1:0.5)+'"/>';
    var note='', ncol=(open?INK2:INK3);
    if(!cls){ note=T('needsGen').replace('{g}',roman(genForSector(i))); ncol=RED2 }
    else if(cls!=='courier'){ note=T(cls).toUpperCase()+'+'; ncol=INK2 }
    var lx0=CX+SECTORS[i].r*1.32+8*Z, ly0=CY+((i%3)-1)*20*Z;   // stagger: six names on one line is a smear
    s+='<text x="'+lx0+'" y="'+ly0+'" fill="'+ncol+'" font-size="'+F(10)+'" letter-spacing="'+F(2)+'" class="nm">'+esc(SECTORS[i].name)+'</text>';
    if(note) s+='<text x="'+lx0+'" y="'+(ly0+10*Z)+'" fill="'+ncol+'" font-size="'+F(8.5)+'" letter-spacing="'+F(1)+'">'+esc(note)+'</text>';
  }
  s=s.replace(/#1B2husk/g,'rgba(242,241,236,.16)').replace(/#141C25/g,'rgba(242,241,236,.08)');

  // v4.21 (F-21): the six lobes, the sides of the world — a dotted edge each, a name at the rim
  if(proSee('sectors')){
    var rO=secRadius(SECTORS.length-1)+44, e, me, ca, sa;
    for(i=0;i<LOBES;i++){
      e=lobeEdge(i); ca=Math.cos(e); sa=Math.sin(e);
      s+='<line x1="'+(CX+ca*34*Z)+'" y1="'+(CY+sa*34*Z)+'" x2="'+(CX+ca*rO*1.32)+'" y2="'+(CY+sa*rO*0.90)+'" stroke="rgba(242,241,236,.26)" stroke-width="'+F(1)+'" stroke-dasharray="'+F(2)+' '+F(6)+'" pointer-events="none"/>';
      me=lobeMid(i); ca=Math.cos(me); sa=Math.sin(me);
      s+='<text x="'+(CX+ca*rO*1.32+ca*30*Z)+'" y="'+(CY+sa*rO*0.90+sa*30*Z+(sa>0.9?6*Z:0))+'" fill="'+INK3+'" font-size="'+F(11)+'" letter-spacing="'+F(3)+'" text-anchor="'+(ca>0.1?'start':(ca<-0.1?'end':'middle'))+'" class="nm" pointer-events="none">'+esc(T('lobe'+i).toUpperCase())+'</text>';
    }
  }
  // two rings: where the couriers stop, and where the whole fleet stops
  function ring(lim,col,op,label,up){
    var rr = lim>=SECTORS.length-1 ? secRadius(SECTORS.length-1)+44 : (secRadius(lim)+secRadius(lim+1))/2;
    s+='<ellipse cx="'+CX+'" cy="'+CY+'" rx="'+(rr*1.32)+'" ry="'+(rr*0.90)+'" fill="none" stroke="'+col+'" stroke-width="'+F(1.2)+'" stroke-dasharray="'+F(9)+' '+F(6)+'" opacity="'+op+'"/>';
    var ty=CY+(up?-(rr*0.90+9*Z):(rr*0.90+15*Z));
    s+='<text x="'+CX+'" y="'+ty+'" fill="'+col+'" font-size="'+F(10)+'" letter-spacing="'+F(2)+'" text-anchor="middle">'+esc(label)+'</text>';
  }
  if(proSee('rings')) ring(classRange('courier',gnow),INK3,0.9,fill(T('ringCourier'),{n:classRange('courier',gnow)+1}),false);
  if(proSee('rings')) ring(classRange('freighter',gnow),RED,0.8,fill(T('ringFleet'),{g:roman(gnow),n:classRange('freighter',gnow)+1}),true);
  // links
  for(var k in G.colonies){
    p=planet(k); xy=pos(p); var c=G.colonies[k];
    s+='<line x1="'+CX+'" y1="'+CY+'" x2="'+xy.x+'" y2="'+xy.y+'" stroke="'+(c.dark?RED:KCOL[p.kind])+'" stroke-width="'+F(1)+'" opacity="'+(c.dark?0.85:0.5)+'" '+(c.dark?'stroke-dasharray="'+F(5)+' '+F(4)+'"':'')+'/>';
  }

  // planets
  var terse = Z>1.75;                    // zoomed right out: names only, or the chart is a wall of text
  for(i=0;i<PLANETS.length;i++){
    p=PLANETS[i]; xy=pos(p);
    if(!proWorldVisible(p.id)) continue;
    var open=sectorOpen(G,p.sec), col=G.colonies[p.id], selq=(U.sel===p.id), ghost=!!(G.ghost&&G.ghost[p.id]);
    var railed = U.pro.on && proTask().pulse.indexOf('world:'+p.id)>=0;
    if(ghost){
      s+='<g class="ghost"><text x="'+xy.x+'" y="'+(xy.y+1*Z)+'" fill="'+INK3+'" font-size="'+F(13)+'" text-anchor="middle">×</text>'+
         '<text x="'+(xy.x+12*Z)+'" y="'+(xy.y-2*Z)+'" fill="'+INK3+'" font-size="'+F(10)+'" letter-spacing="'+F(1)+'" class="nm">'+esc(p.name.toUpperCase())+'</text></g>';
      continue;
    }
    var kc=KCOL[p.kind];
    var fillc = col ? (col.dark?RED:kc) : 'none';
    var strokec = col ? (col.dark?RED:kc) : (open?kc:INK3);
    var r = (col?6.5:5)*Z;
    var dead=col&&!col.dark&&G.reserves[p.id]<=0, waitHulls=col&&!col.dark&&!dead&&!onLine(G,p.id).length;
    s+='<g class="pnode'+(dead?' dead':(waitHulls?' waithulls':''))+'" data-p="'+p.id+'" tabindex="0" role="button" aria-label="'+esc(p.desig+' '+p.name)+'">';
    if(dead||waitHulls) s+='<circle class="blinkring" cx="'+xy.x+'" cy="'+xy.y+'" r="'+(r+11*Z)+'" fill="none" stroke="'+(dead?RED:'#4aa3ff')+'" stroke-width="'+F(2)+'"/>';
    if(selq) s+='<circle cx="'+xy.x+'" cy="'+xy.y+'" r="'+(r+8*Z)+'" fill="none" stroke="'+RED+'" stroke-width="'+F(1.5)+'"/>';
    if(railed) s+='<circle class="railring" cx="'+xy.x+'" cy="'+xy.y+'" r="'+(r+14*Z)+'" fill="none" stroke="'+RED+'" stroke-width="'+F(2)+'"/>';
    if(col&&!col.dark){ var lrm=lineRate(G,p.id);
      if(lrm&&(lrm.piling||lrm.makes<=0.001)) s+='<text x="'+(xy.x-1*Z)+'" y="'+(xy.y-r-9*Z)+'" fill="'+(lrm.makes<=0.001?RED:RED2)+'" font-size="'+F(12)+'" text-anchor="middle" class="nm">!</text>';
    }
    s+=(col||!open)?mark(p.kind,xy.x,xy.y,r,fillc,strokec,F(1.2)):'<g opacity="0.6">'+mark(p.kind,xy.x,xy.y,r,fillc,strokec,F(1.2))+'</g>';
    if(open){
      var lx=xy.x+r+7*Z, ly=xy.y-12*Z;
      var detail = !terse || !!col || selq;
      s+='<text x="'+lx+'" y="'+ly+'" fill="'+(col?INK:INK2)+'" font-size="'+F(11)+'" letter-spacing="'+F(1)+'" class="nm">'+esc(p.name.toUpperCase())+'</text>';
      if(detail){
        var kw=T({mine:'mapMine',farm:'mapFarm',well:'mapFuel',works:'mapWorks'}[p.kind]);
        s+='<text x="'+lx+'" y="'+(ly+12*Z)+'" fill="'+(col?INK2:INK3)+'" font-size="'+F(9)+'" letter-spacing="'+F(1)+'">'+kw+' · '+p.dist+'</text>';
        if(col&&!col.dark){
          // live metrics, always on screen: hands, what it makes, what is sitting there
          var cap=popCap(p), hands=Math.round(col.pop);
          var lr2=lineRate(G,p.id);
          var rate = p.kind==='works'
            ? ((col.store.metal>1&&col.store.food>1)? (col.pop*p.rich*K.REFINE) : 0)
            : (lr2? lr2.makes : 0);
          var dep = p.kind==='works'?'parts':p.dep;
          var pile = Math.round(col.store[dep]||0);
          var hcol = hands>=cap*0.8?INK:(hands>=cap*0.4?INK2:RED2);
          var rcol = rate>0.001?INK2:RED;
          /* v4.10 (Nikita, 27.09): only people and the pile, each with its icon */
          var pc=pile>300?RED2:RCOL[dep];
          s+='<use href="#i-people" x="'+lx+'" y="'+(ly+17*Z)+'" width="'+F(9)+'" height="'+F(9)+'" style="color:'+hcol+'"/>'+
             '<text x="'+(lx+11*Z)+'" y="'+(ly+25*Z)+'" font-size="'+F(9)+'" fill="'+hcol+'" letter-spacing="'+F(0.5)+'">'+hands+'</text>'+
             '<use href="#i-'+dep+'" x="'+lx+'" y="'+(ly+29*Z)+'" width="'+F(9)+'" height="'+F(9)+'" style="color:'+pc+'"/>'+
             '<text x="'+(lx+11*Z)+'" y="'+(ly+37*Z)+'" font-size="'+F(9)+'" fill="'+pc+'" letter-spacing="'+F(0.5)+'">'+pile+'</text>';
        } else if(col&&col.dark){
          s+='<text x="'+lx+'" y="'+(ly+24*Z)+'" font-size="'+F(9)+'" fill="'+RED+'" letter-spacing="'+F(1)+'">'+T('mapDark')+'</text>';
        } else {
          /* v4.11 (Nikita, 28.09: '×0.7 и проценты — бесполезно'): an unsettled world says only how many it can hold */
          s+='<use href="#i-people" x="'+lx+'" y="'+(ly+17*Z)+'" width="'+F(9)+'" height="'+F(9)+'" style="color:'+INK3+'"/>'+
             '<text x="'+(lx+11*Z)+'" y="'+(ly+25*Z)+'" font-size="'+F(9)+'" fill="'+INK3+'" letter-spacing="'+F(0.5)+'">'+popCap(p)+'</text>';
        }
      }
    }
    s+='<circle class="hit" cx="'+xy.x+'" cy="'+xy.y+'" r="'+F(20)+'"/></g>';
  }

  // earth
  var nearNight = G.night && nightLeft(G)<=K.NIGHT_NEAR;
  s+='<circle cx="'+CX+'" cy="'+CY+'" r="'+F(26)+'" fill="none" stroke="'+(nearNight?RED:INK)+'" stroke-width="'+F(1)+'" opacity="0.7"/>';
  s+='<circle cx="'+CX+'" cy="'+CY+'" r="'+F(12)+'" fill="'+(nearNight?RED:INK)+'"/>';
  s+='<text x="'+CX+'" y="'+(CY+38*Z)+'" fill="'+INK+'" font-size="'+F(10)+'" letter-spacing="'+F(3)+'" text-anchor="middle" class="nm">'+T('mapEarth')+'</text>';

  // ships
  for(i=0;i<G.ships.length;i++){
    var sh=G.ships[i]; if(sh.mode!=='transit'&&sh.mode!=='missing') continue;
    var A=nodeXY(sh.origin), B=nodeXY(sh.dest||sh.target);
    if(!A||!B) continue;
    var f = sh.total? (1-sh.t/sh.total) : 0;
    if(sh.mode==='missing') f = sh.lastT!==undefined?sh.lastT:0.55; else sh.lastT=f;
    var x=A.x+(B.x-A.x)*f, y=A.y+(B.y-A.y)*f;
    s+='<line x1="'+A.x+'" y1="'+A.y+'" x2="'+B.x+'" y2="'+B.y+'" stroke="'+INK2+'" stroke-width="'+F(0.6)+'" stroke-dasharray="'+F(2)+' '+F(5)+'" opacity="0.35" pointer-events="none"/>';
    if(sh.mode==='missing'){
      s+='<circle cx="'+x+'" cy="'+y+'" r="'+F(8)+'" fill="none" stroke="'+RED+'" stroke-width="'+F(1)+'" stroke-dasharray="'+F(2)+' '+F(3)+'"/>';
      s+='<text x="'+x+'" y="'+y+'" fill="'+RED+'" font-size="'+F(10)+'" text-anchor="middle" class="nm">?</text>';
    } else {
      var scls=shipClass(sh), sw=(scls==='freighter'?28:(scls==='hauler'?20:14)), swz=sw*Z, shz=swz*0.625, flip=(B.x<A.x)?-1:1;
      s+='<use href="#i-'+scls+'" x="'+(-swz/2)+'" y="'+(-shz/2)+'" width="'+swz+'" height="'+shz+'" fill="'+INK+'" pointer-events="none" transform="translate('+x+' '+y+') scale('+flip+' 1)"/>';   // v4.19: a hull parked on a world sat over its centre and ate the click (prologue stage 2)
    }
  }
  el('map').innerHTML=s;
}

/* ---------- header / resources / log ---------- */
function drawHeader(){
  var E=G.earth;
  el('h-day').textContent=G.day;
  ['h-stab','h-reach','h-sectors','h-night'].forEach(function(id){ var c=el(id).parentElement; c.hidden=!proSee('stats') });   // v4.13: Output and Drive cells are gone
  var wt=document.querySelector('.tab[data-tab="worlds"]'); if(wt) wt.hidden=!proSee('worlds');
  el('h-stab').textContent=n0(E.people);
  el('h-stab').className='v'+(G.hungry?' bad':(E.people>120?' good':''));
  var sb=el('h-stabbar'); sb.style.width=Math.max(0,Math.min(100,E.people/3))+'%';
  sb.style.background = G.hungry?'var(--red)':'var(--ink)';
  el('h-sectors').textContent=SECTORS.length;
  el('h-reach').textContent=reach(G);
  var nl=nightLeft(G);
  /* v4.0 — two dates: the year the sun fails, and the year the ark drive is ready at this pace */
  el('h-night').textContent= nl===null? T('nightUnknown') : G.night;
  el('h-night').className='v'+(nl===null?' dim':(nl<=K.NIGHT_NEAR?' bad':' warn'));
  el('h-nightsub').textContent= nl===null? '' : (nl<=0?T('nightNow'):fill(T('nightIn'),{n:nl}));
  var ac=arkHead(); el('h-arkcell').hidden=!ac||!proSee('stats');
  if(ac){ el('h-arkk').textContent=T('hArkDrive')+' '+roman(G.arkMark); el('h-arkd').textContent=ac.v; el('h-arkd').className='v '+ac.c; el('h-arkdsub').textContent=ac.rest; el('h-arkcell').title=ac.sub }
  el('b-pause').textContent=U.paused?'▶':'❚❚';
  el('b-pause').classList.toggle('on',U.paused);
  var b=document.querySelectorAll('[data-spd]');
  for(var i=0;i<b.length;i++) b[i].classList.toggle('on',+b[i].dataset.spd===U.speed&&!U.paused);
  var ap=el('b-auto'); if(ap){ ap.textContent=T('ffBtn'); ap.classList.toggle('on',U.ff); ap.title=T('ffHint') }
  el('b-lang').textContent=U.lang==='en'?'RU':'EN';
  var sb=el('b-sfx'); if(sb){ sb.classList.toggle('mute',!SFX.isOn()); sb.title=T(SFX.isOn()?'sfxOn':'sfxOff'); sb.setAttribute('aria-pressed',SFX.isOn()?'true':'false') }
    var tt=document.querySelectorAll('[data-t]');
  for(i=0;i<tt.length;i++) tt[i].textContent=T(tt[i].dataset.t);
}

/* v4.0: what the second date says. null before the Night has a date. */
function arkHead(){
  if(!G.night) return null;
  var gm=roman(G.arkMark), lvl=G.driveLvl||0, gen=fill(T('genSep'),{g:gm});
  function out(v,c,rest){ return {v:v,c:c,rest:rest,sub:gen+' \u00b7 '+rest} }
  if(arkReady(G)){
    var w=arkWake(G), rest=fill(T('arkdWake'),{w:Math.round(w*100)});
    if(w<1){ var f2=driveForecast(G,lvl+1);
      if(f2.st==='ok'&&f2.y<G.night) rest+=' \u00b7 '+fill(T('arkdNext'),{g:roman(lvl+1),y:f2.y,w:Math.round(wakeAt(G,lvl+1)*100)}); }
    return out(T('arkdReady'),'good',rest);
  }
  var f=driveForecast(G,G.arkMark);
  if(f.st==='ok'){
    var late=f.y-G.night;
    return out('\u2248'+f.y, late>0?'bad':(late>-K.NIGHT_NEAR/2?'warn':'good'),
      fill(T(late>0?'arkdLate':'arkdSpare'),{n:Math.abs(late)})+(settledCount(G)<f.rn?' \u00b7 '+fill(T('arkdReachLater'),{n:f.rn}):''));
  }
  if(f.st==='settled') return out('\u2014','bad',fill(T('arkdReach'),{n:f.n,r:f.r}));
  if(f.st==='host') return out('\u2014','bad',fill(T('arkdHost'),{n:K.DRIVE_POP}));
  return out('\u2014','bad',T('arkdStall'));
}

/* v3.7 (Nikita, 23.09): a resource that is being spent faster than it comes in must say so.
   Earth's own output minus its burn is not the truth — the lines bring most of what arrives — so the
   trend is the real change of the stockpile over the last TREND_YEARS, deliveries included. */
var TREND_YEARS=60;
function trendTick(){
  var E=G.earth, h=U.hist;
  if(h.length&&h[h.length-1].day===G.day) return;
  if(h.length&&h[h.length-1].day>G.day) U.hist=h=[];          // new run
  h.push({day:G.day,metal:E.metal,food:E.food,fuel:E.fuel,parts:E.parts,people:E.people});
  if(h.length>TREND_YEARS+5) h.splice(0,h.length-(TREND_YEARS+5));
}
function trend(k){
  var h=U.hist; if(h.length<6) return null;
  var a=h[Math.max(0,h.length-1-TREND_YEARS)], b=h[h.length-1];
  var yrs=b.day-a.day; if(yrs<5) return null;
  return (b[k]-a[k])/yrs;
}
function trendHtml(k,extra){
  var t=trend(k);
  if(t===null) return '<span class="dim">'+(extra||'')+'</span>';
  var up=t>=0.05, down=t<=-0.05; if(!up&&!down) t=0;
  var arrow=up?'▲':(down?'▼':'—'), cls=up?'up':(down?'down':'flat');
  return '<span class="'+cls+'">'+arrow+' '+(t>0?'+':'')+t.toFixed(1)+T('perYear')+'</span>'+(extra?' <span class="dim">'+extra+'</span>':'');
}
function drawRes(){
  var E=G.earth;
  trendTick();
  function cell(k,v,d,cls){return '<div class="rcell r-'+k+'"><div class="k">'+ico(k)+T(k)+'</div><div class="v'+(cls?' '+cls:'')+'">'+v+'</div><div class="d">'+d+'</div></div>'}
  var nd=G.need||{food:K.EARTH_EAT,metal:K.EARTH_BURN};
  var fd=Math.floor(E.food/Math.max(0.1,nd.food)), md=Math.floor(E.metal/Math.max(0.1,nd.metal));
  el('res').innerHTML=
    (proSee('metal')?cell('metal',n0(E.metal),trendHtml('metal','+'+E.pMetal.toFixed(1)+' −'+nd.metal.toFixed(1)), md<25?'bad':''):'')+
    (proSee('food')?cell('food',n0(E.food),trendHtml('food','+'+E.pFood.toFixed(1)+' −'+nd.food.toFixed(1)), fd<25?'bad':''):'')+
    (proSee('fuel')?cell('fuel',n0(E.fuel),trendHtml('fuel','+'+E.pFuel.toFixed(1)), E.fuel<25?'warn':''):'')+
    (proSee('parts')?cell('parts',n0(E.parts),trendHtml('parts',T('kWorks').toLowerCase()),''):'')+
    cell('people',n0(E.people),trendHtml('people',T('onEarth').toLowerCase()),'');
}

var TRAFFIC={kit_loaded:1,pickup:1,delivered:1,launch_colony:1,launch_evac:1,launch_search:1,launch_punitive:1,order_sent:1,reassigned:1,ship_ordered:1,ship_ready:1,scrapped:1,scrapped_many:1,dropped:1,relay_up:1,relief_done:1};
function drawLog(){
  var out='', n=0, unread=0, unreadBad=false;
  // G.log is capped at 400 and shifts; track "seen" by a running count of entries ever logged
  G.logTotal = G.logTotal||0;
  for(var i=G.log.length-1;i>=0&&n<120;i--){
    var e=G.log[i], tpl=LOG[U.lang][logKey(e)];
    if(!tpl||tpl==='—') continue;
    /* v4.2: three views. 'desk' (default) hides the freight receipts — pickups, deliveries, launches,
       order acknowledgements — that were 45 of the last 60 lines in Nikita's run and buried every voice. */
    var hide = U.logMode==='chron' ? TONE[e.code]!=='ch' : (U.logMode==='desk' ? !!TRAFFIC[e.code] : false);
    if(hide){ if((e.seq||0)>U.logSeen){ unread++; if(TONE[e.code]==='bd') unreadBad=true } continue }
    var d={}; for(var k in e.d) d[k]=e.d[k];
    if(d.p&&planet(d.p)) d.p=pname(d.p);
    if(d.dep) d.dep=DEP[U.lang][d.dep]||d.dep;
    if(d.g!==undefined) d.g=roman(d.g);   // v4.0: generations read as roman numerals, like the header
    if(d.t!==undefined&&String(e.code).slice(0,4)==='kit_') d.t=roman(d.t-1);   // v4.4: kit tiers too
    if(e.code==='voice') d=voiceLine(e);
    var isNew = (e.seq||0) > U.logSeen;
    if(isNew){ unread++; if(TONE[e.code]==='bd') unreadBad=true }
    out+=logLine(e,tpl,d,isNew); n++;
  }
  setHTML('log',out||('<div class="le dim"><span class="d">----</span><span>'+T('logEmpty')+'</span></div>'));
  var bd=el('logbadge'); if(bd){ bd.hidden=!unread; bd.textContent=fill(T('newEntries'),{n:unread}); bd.className=unreadBad?'bad':'' }
  var bx=el('b-logx'); if(bx) bx.textContent=T(U.logBig?'collapse':'expand');
  var bf=el('b-logf'); if(bf){ bf.textContent=T(U.logMode==='chron'?'logChron':(U.logMode==='all'?'logAll':'logDesk')); bf.classList.toggle('on2',U.logMode!=='all') }
  el('btm').classList.toggle('big',!!U.logBig);
}
/* shift lines rotate between variants so a long calm run does not read as one sentence pasted ten times */
function logKey(e){ if(e.code!=='shift') return e.code; var b='shift_'+e.d.k, v=(e.d.n||0)%3; return (v&&LOG[U.lang][b+(v+1)])?b+(v+1):b }
function logLine(e,tpl,d,isNew){
  var ch=TONE[e.code]==='ch';
  if(e.code==='voice') return '<div class="le vo'+(isNew?' new':'')+'"><span class="d">'+String(e.day).padStart(4,'0')+'</span><span><b class="vn">'+esc(d.who)+' '+esc(d.name)+'</b>'+esc(d.line)+'</span></div>';
  return '<div class="le '+(TONE[e.code]||'')+(isNew?' new':'')+'"><span class="d">'+String(e.day).padStart(4,'0')+'</span><span>'+(ch?'<b class="ct">'+T('chronTag')+'</b>':'')+esc(fill(tpl,d))+'</span></div>';
}
/* the last k chronicle lines, for the epilogue */
function chronLines(k){
  var out='', n=0;
  for(var i=G.log.length-1;i>=0&&n<k;i--){ var e=G.log[i]; if(TONE[e.code]!=='ch') continue;
    var tpl=LOG[U.lang][logKey(e)]; if(!tpl) continue;
    var d={}; for(var q in e.d) d[q]=e.d[q]; if(d.p&&planet(d.p)) d.p=pname(d.p); if(d.dep) d.dep=DEP[U.lang][d.dep]||d.dep; if(d.g!==undefined) d.g=roman(d.g); if(d.t!==undefined&&String(e.code).slice(0,4)==='kit_') d.t=roman(d.t-1);
    out=logLine(e,tpl,d,false)+out; n++ }
  return out?'<div class="mhead" style="margin-bottom:6px">'+T('endChron')+'</div><div class="chron">'+out+'</div>':'';
}
function logSeen(){ var m=0; for(var i=0;i<G.log.length;i++) if((G.log[i].seq||0)>m) m=G.log[i].seq; U.logSeen=m; drawLog() }

/* ---------- rail ---------- */
function freeHulls(){return G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!s.mutiny})}
var ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
function roman(n){ return ROMAN[n]||String(n+1) }
function hullName(h){ return fill(T('hullFmt'),{t:T(h.key),n:T('hullNm_'+h.key),g:roman(h.gen||0)}) }   // v4.20: class + Greek name
function nodeName(n){return n==='earth'?T('earthNode'):planet(n).name.toUpperCase()}
function aliveHulls(){return G.ships.filter(function(s){return s.mode!=='dead'&&s.mode!=='missing'})}

function drawAdvice(){
  var box=el('advisor'); if(!box) return;
  if(U.pro.on){ drawTask(box); return }
  document.querySelectorAll('.rail').forEach(function(e){e.classList.remove('rail')});
  var a=advice(G);
  var worst=a.length?a[0].sev:'clear';
  var tab=U.leftTab||'fleet', nShips=G.ships.filter(function(s){return s.mode!=='dead'}).length, nBld=G.ships.filter(function(s){return s.mode==='building'}).length;
  var head='<div class="advtabs"><button type="button" class="advtab'+(tab==='fleet'?' on':'')+'" data-act="lefttab" data-tab="fleet"><span>'+T('flTab')+'</span><b>'+nShips+'</b>'+(nBld?'<small>'+fill(T('flBuilding'),{n:nBld})+'</small>':'')+'</button>'+
    '<button type="button" id="advhead" class="advtab '+worst+(tab==='advice'?' on':'')+'" data-act="lefttab" data-tab="advice"><i class="dotm '+(a.length?a[0].sev:'good')+'"></i><span>'+T('advisor')+'</span><b>'+a.length+'</b></button>'+
    '<button type="button" id="advtog" class="advtog" aria-label="toggle"><em>'+(U.advOpen?'\u2013':'+')+'</em></button></div>';
  var body='';
  if(U.advOpen&&tab==='fleet') body=fleetBody();
  else if(U.advOpen){
    var any=false; for(var kk in G.dismissed){any=true;break}
    var foot = any?'<div class="arow"><span></span><button class="chip go" type="button" data-act="undismiss">'+T('restoreAll')+'</button></div>':'';
    if(!a.length) body='<div class="advbody"><div class="arow dim">'+T('allClear')+'</div>'+foot+'</div>';
    else body='<div class="advbody">'+a.slice(0,8).map(function(x){
      var d={n:x.n,p:x.pid?pname(x.pid):'',h:x.h,c:x.c,g:x.gr!==undefined?roman(x.gr):x.g,y:x.y,l:x.l,r:x.r?(L[U.lang]['lineWait_'+x.r]!==undefined?T('lineWait_'+x.r):x.r):x.r,t:x.t!==undefined?roman(x.t-1):''};   // v4.14: the yard reason reads as a sentence, not a code
      var cls=x.sev==='bad'?'bad':(x.sev==='warn'?'warn':'good');
      var go = x.pid
        ? '<button class="chip go" type="button" data-act="go" data-p="'+x.pid+'">'+T('goThere')+'</button>'
        : '<button class="chip go" type="button" data-act="goearth">'+T('goThere')+'</button>';
      var kill='<button class="chip x" type="button" data-act="dismiss" data-k="'+esc(x.key)+'" title="'+T('dismiss')+'">\u00d7</button>';
      return '<div class="arow"><i class="dotm '+cls+'"></i><span>'+esc(fill(T(x.code),d))+'</span>'+go+kill+'</div>';
    }).join('')+foot+'</div>';
  }
  setHTML('advisor',head+body);
  box.classList.toggle('shut',!U.advOpen);
}

/* clickable pickers that survive a redraw, unlike a native <select> */
function shipChips(list){
  if(!list.length) return '<div class="dim">'+T('noShips')+'</div>';
  if(U.pickShip!==null&&!list.some(function(s){return s.id===U.pickShip})) U.pickShip=null;
  if(U.pickShip===null) U.pickShip=list[0].id;
  // newest generation first, big hulls first inside it, then by number
  var sorted=list.slice().sort(function(a,b){ return (hullGen(b)-hullGen(a)) || (HULLS[b.hull].cap-HULLS[a.hull].cap) || (a.id-b.id) });
  var out='', lastG=null;
  sorted.forEach(function(s){
    var g=hullGen(s);
    if(g!==lastG){ out+='<div class="chipsep">'+fill(T('genSep'),{g:roman(g)})+'</div>'; lastG=g }
    var free = s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to);
    var far = U.sel&&planet(U.sel)&&!canReachSector(s,planet(U.sel).sec);
    var here=U.sel&&planet(U.sel)&&!far&&free ? fill(T('legDays'),{n:legDays(G,U.sel,'earth',s)}) : null;
    var sub=far?fill(T('outOfRange'),{n:shipRange(s)+1}):((s.from&&s.to)?fill(T('lineTo'),{a:nodeName(s.from),b:nodeName(s.to)}):(here||(free?T('freeNow'):shipState(s))));
    out+='<button type="button" class="chip'+(U.pickShip===s.id?' on':'')+(free?' free':'')+(far?' far':'')+'" data-ship="'+s.id+'">'+
      '<b>'+sico(HULLS[s.hull].key)+esc(hullName(HULLS[s.hull]))+'<span class="no">'+esc(fill(T('hullNo'),{n:s.id}))+'</span></b>'+
      '<i>'+esc(fill(T('capacity'),{n:s.cap})+' · '+speedTxt(HULLS[s.hull])+' · '+sub)+'</i></button>';
  });
  return '<div class="chips">'+out+'</div>';
}
/* the hulls a world can actually be given: free at Earth and rated for its sector */
function assignable(pid){
  var p=planet(pid);
  return freeHulls().filter(function(s){return !(s.from&&s.to)&&p&&canReachSector(s,p.sec)});
}
function busyFarLine(pid){
  var p=planet(pid); if(!p) return '';
  var busy=0, far=0;
  G.ships.forEach(function(s){ if(s.mode==='dead'||s.mode==='missing') return;
    var free=s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to);
    if(!free) busy++; else if(!canReachSector(s,p.sec)) far++; });
  return (busy||far)?'<div class="busyfar">'+fill(T('busyFar'),{b:busy,f:far})+'</div>':'';
}


function themed(html,cls,acc){ return html.replace('<div class="blk">','<div class="blk '+cls+'"'+(acc?' style="--acc:'+acc+'"':'')+'>') }   // v4.20: a block with its own colour
function blk(title,body,tag){return '<div class="blk"><h3><span>'+title+'</span>'+(tag||'')+'</h3><div class="bd">'+body+'</div></div>'}
function row(k,v,cls){return '<div class="row"><span>'+k+'</span><b'+(cls?' class="'+cls+'"':'')+'>'+v+'</b></div>'}

function railEarthPro(){
  var E=G.earth, h='', st=U.pro.stage;
  var nd=G.need||{food:K.EARTH_EAT,metal:K.EARTH_BURN};
  if(st>=1) h+=blk(T('burnTitle'),
    row(T('metal'), fill(T('burns'),{n:nd.metal.toFixed(1)})+' · '+fill(T('supplyDays'),{n:Math.floor(E.metal/Math.max(0.1,nd.metal))}), E.metal/Math.max(0.1,nd.metal)<30?'bad':'dim')+
    (st>=2?row(T('food'), fill(T('burns'),{n:nd.food.toFixed(1)})+' · '+fill(T('supplyDays'),{n:Math.floor(E.food/Math.max(0.1,nd.food))}), E.food/Math.max(0.1,nd.food)<30?'bad':'dim'):''));
  var wait=G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)});
  if(wait.length&&st>=2) h+=blk(T('awaiting'), wait.map(function(s){
      return '<div class="wrow free"><div><b>'+sico(HULLS[s.hull].key)+esc(hullName(HULLS[s.hull]))+' '+esc(fill(T('hullNo'),{n:s.id}))+'</b> <span class="dim">'+fill(T('capacity'),{n:s.cap})+'</span></div><span class="pill free">'+T('idleHull')+'</span></div>';
    }).join(''),'<span class="tag a">'+wait.length+'</span>');
  if(st>=5){
    var sc=surveyCost(SECTORS.length), sok=canSurvey(G), nxt=secName(SECTORS.length);
    h+=blk(T('surveyTitle'), row(T('sectorsOpen'),SECTORS.length,'dim')+row(T('settledRow'),settledCount(G),'dim')+
      '<button class="btn '+(sok==='ok'?'prim':'')+'" type="button" data-act="survey"'+(sok==='settled'?off('needsettled',{n:K.SURVEY_REACH*SECTORS.length,r:settledCount(G)}):offCost(sc,E))+'>'+fill(T('surveyBtn'),{s:nxt})+
      '<br><span class="c" style="float:none;color:var(--faint)">'+(sok==='settled'?fill(T('surveyNeed'),{n:K.SURVEY_REACH*SECTORS.length}):costHtml(sc,E))+'</span></button>');
  }
  h+=blk(T('guideBtn'),'<button class="btn" type="button" data-act="guide">'+T('guideBtn')+'</button>');
  return h;
}
function railEarth(){
  if(U.pro.on) return railEarthPro();
  var E=G.earth, h='';
  /* v4.9 (Nikita, 27.09): the two big decisions get big buttons when they are open */
  var bb='';
  if(canSurvey(G)==='ok') bb+='<button class="btn bigbtn" type="button" data-act="survey">'+fill(T('bigSurvey'),{s:secName(SECTORS.length)})+'<small>'+costHtml(surveyCost(SECTORS.length),E)+'</small></button>';
  if(G.night&&canArk(G)==='ok') bb+='<button class="btn bigbtn" type="button" data-act="ark">'+fill(T('bigArk'),{n:K.ARK_BLOCK})+'<small>'+costHtml(arkCost(G),E)+'</small></button>';
  if(bb) h+='<div class="bigrow">'+bb+'</div>';
  /* v4.13 (Nikita, 30.09): the burn block, the stores, the metal ledger and the colony-by-colony census are gone —
     the rail says only what a decision needs.
     v4.19 (Nikita, 05.10): 'Terrestrial output' and 'Hands at home' are gone too — two bare numbers nobody could act on */
  h+=blk(T('earthPop'),
    row(T('people'),n0(E.people),G.hungry?'bad':'good')+
    row(T('reach'),reach(G))+
    row(T('crossings'),'×'+driveSpeed(G).toFixed(2)+(G.driveLvl?' · '+fill(T('driveMark'),{n:G.driveLvl}):''),G.driveLvl?'warn':'dim')
  );

  // charting the next sector — the main thing surplus is for
  var sc=surveyCost(SECTORS.length), sok=canSurvey(G), nxt=secName(SECTORS.length);
  var rneed=K.SURVEY_REACH*SECTORS.length;
  /* v4.13 (Nikita, 30.09: 'чтобы было написано, что это за кнопка вообще'): one sentence on what charting does,
     the price as resource icons (short ones red), reach as its own row */
  h+=blk(T('surveyTitle'),
    '<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('surveyWhat'),{s:nxt})+'</div>'+
    row(T('sectorsOpen'),SECTORS.length,'dim')+
    row(T('surveyReachRow'),settledCount(G)+' / '+rneed,settledCount(G)<rneed?'bad':'good')+
    row(T('surveyPrice'),costHtml(sc,E),'dim')+
    '<button class="btn '+(sok==='ok'?'prim':'')+'" type="button" data-act="survey"'+(sok==='settled'?off('needsettled',{n:rneed,r:settledCount(G)}):offCost(sc,E))+'>'+
      fill(T('surveyBtn'),{s:nxt})+'</button>');
  // the ark, once the Night has a date
  if(G.night){
    var ac=arkCost(G), aok=canArk(G), lb=leftBehind(G), souls=arkSouls(G);
    var amiss=[];
    if(E.metal<ac.metal) amiss.push(fill(T('needM'),{n:Math.ceil(ac.metal-E.metal)}));
    if(E.parts<ac.parts) amiss.push(fill(T('needP'),{n:Math.ceil(ac.parts-E.parts)}));
    if(E.fuel<ac.fuel) amiss.push(fill(T('needF'),{n:Math.ceil(ac.fuel-E.fuel)}));
    if(E.food<ac.food) amiss.push(Math.ceil(ac.food-E.food)+' '+T('food').toLowerCase());
    var ah=arkHead(), wk=arkWake(G);
    h+=blk(T('arkTitle'),
      row(T('hNight'),G.night+' <span class="dim">· '+fill(T('nightIn'),{n:nightLeft(G)})+'</span>','bad')+
      row(T('hArkDrive'),fill(T('genSep'),{g:roman(G.arkMark)})+' <span class="'+ah.c+'">· '+esc(ah.v)+'</span>',ah.c)+
      '<div class="dim" style="font-size:12px;line-height:1.45;text-align:right">'+esc(ah.rest)+'</div>'+
      row(T('arkBerths'),G.ark.berths+' <span class="dim">· '+fill(T('arkBlocks'),{n:G.ark.blocks})+'</span>')+
      row(T('crewHome'),n0(E.people),'dim')+
      row(T('arkSouls'),souls,souls>0?'good':'bad')+
      row(T('arkWakeRow'),wk?Math.floor(souls*wk)+' <span class="dim">· '+Math.round(wk*100)+'%</span>':T('arkNoDrive'),wk?'good':'bad')+
      '<div class="rows" style="margin-top:2px">'+
        row(T('arkLeft'),'','dim')+
        row(' '+T('lbHome'),lb.home,lb.home>0?'warn':'dim')+
        row(' '+T('lbHulls'),lb.hulls,lb.hulls>0?'warn':'dim')+
        row(' '+T('lbCol'),lb.colonies,lb.colonies>0?'warn':'dim')+
        (lb.transit?row(' '+T('lbTransit'),lb.transit,'warn'):'')+
      '</div>'+
      '<button class="btn '+(aok==='ok'?'prim':'')+'" type="button" data-act="ark"'+(aok==='night'?off('night'):offCost(ac,E))+'>'+
        fill(T('arkBuy'),{n:K.ARK_BLOCK})+'<br><span class="c" style="float:none;color:'+(amiss.length?'var(--rust)':'var(--faint)')+'">'+
        (amiss.length?amiss.join(' · '):costHtml(ac,E))+'</span></button>'+
      '<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('arkHint'),{y:G.night})+'</div>'+
      '<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('arkDriveHint'),{g:roman(G.arkMark),a:Math.round(K.ARK_WAKE[0]*100),b:Math.round(K.ARK_WAKE[1]*100),c:Math.round(K.ARK_WAKE[2]*100)})+'</div>',
      '<span class="tag r">'+T('hNight')+'</span>');
  }
  // hulls sitting at Earth with nothing to do
  var wait=G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.mutiny});
  // v4.2: hulls whose crews refused the Night — only the breakers will have them
  var mut=G.ships.filter(function(s){return s.mode==='idle'&&s.at==='earth'&&s.mutiny});
  if(mut.length){
    h+=blk(T('mutinyHdr'), '<div class="dim" style="font-size:12px;line-height:1.45">'+T('mutinyHint')+'</div>'+mut.map(function(s){
      return '<div class="wrow"><div><b>'+T('ship')+' '+s.id+'</b> <span class="dim">'+hullName(HULLS[s.hull])+' · '+n0(s.crew||0)+' '+T('people').toLowerCase()+'</span></div><span class="pill" style="color:var(--red2);border-color:var(--red3)">'+T('mutinied')+'</span></div>'+
        '<button class="btn danger" type="button" data-act="scrap" data-s="'+s.id+'">'+T('scrapOne')+' <span class="c" style="float:none">'+costHtml({metal:scrapValue(HULLS[s.hull]).metal,people:s.crew||0},null,'+')+'</span></button>';
    }).join('<div style="border-top:1px solid var(--line);margin:4px 0"></div>')+
      (mut.length>1?'<button class="btn danger" type="button" data-act="scrapmut">'+fill(T('scrapAllMut'),{n:mut.length})+' <span class="c" style="float:none">'+costHtml({metal:mut.reduce(function(a,s){return a+scrapValue(HULLS[s.hull]).metal},0),people:mut.reduce(function(a,s){return a+(s.crew||0)},0)},null,'+')+'</span></button>':''),
      '<span class="tag r">'+mut.length+'</span>');
  }
  if(wait.length){
    h+=blk(T('awaiting'), wait.map(function(s){
      var last=s.to? pname(s.to) : T('none');
      var manifest=[];
      ['metal','food','parts','people'].forEach(function(kk){ if(s.out&&s.out[kk]>0) manifest.push(n0(s.out[kk])+' '+T(kk==='people'?'sendPeople':kk).toLowerCase()) });
      return '<div class="wrow free"><div>'+
        '<b>'+T('ship')+' '+s.id+'</b> <span class="dim">'+hullName(HULLS[s.hull])+' · '+fill(T('capacity'),{n:s.cap})+'</span>'+
        '<div class="dim" style="font-size:11px">'+T('giveOrders')+'</div>'+assignChips(s)+'</div>'+
        '<span class="pill free">'+T('idleHull')+'</span></div>'+
        '<button class="btn" type="button" data-act="scrap" data-s="'+s.id+'">'+T('scrapOne')+' <span class="c" style="float:none">'+costHtml({metal:scrapValue(HULLS[s.hull]).metal,people:s.crew||0},null,'+')+'</span></button>';   // v4.13: no 'new orders' — a standing order takes it
    }).join('<div style="border-top:1px solid var(--line);margin:4px 0"></div>'),
    '<span class="tag a">'+wait.length+'</span>');
  }
  // hulls overdue: the search block used to live on the Fleet tab
  var missing=G.ships.filter(function(s){return s.mode==='missing'});
  if(missing.length){
    var fh=freeHulls().filter(function(s){return !(s.from&&s.to)});
    var mo=missing.map(function(m){return '<button class="btn" type="button" data-act="search" data-m="'+m.id+'"'+off(fh.length?'ok':'nofree')+'>'+fill(T('searchFor'),{n:m.id})+'<span class="c">'+pname(m.target)+'</span></button>'}).join('');
    h+=blk(T('searchHdr'),(fh.length?shipChips(fh):'<div class="dim">'+T('noShips')+'</div>')+mo,'<span class="tag r">'+missing.length+'</span>');
  }

  // v4.13: the census in three lines — Earth, hulls (crews and passengers), colonies
  var inTr=0, colPop=0;
  for(var i=0;i<G.ships.length;i++) inTr+=(G.ships[i].cargo.people||0);
  for(var ck in G.colonies) colPop+=G.colonies[ck].pop;
  h+=blk(T('population'),
    row(T('popEarth'),ico('people')+n0(E.people),G.hungry?'bad':'good')+
    row(T('popHulls'),ico('people')+n0(crewOut(G)+inTr),'warn')+
    row(T('popCol'),ico('people')+n0(colPop),'dim'));

  var hy, wneed=driveWorkFor(G), gnext=(G.gen||0)+1;
  var unlock='<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('driveUnlocks'),{g:roman(gnext),s:sectorLimit(gnext)+1,x:(1/K.DRIVE_STEP).toFixed(2)})+'</div>';
  if(G.drive){
    var pc=Math.min(100,Math.round(G.driveWork/wneed*100));
    hy=row(fill(T('driveProg'),{g:roman(gnext)}),fill(T('driveRun'),{p:pname(G.drive)}),'warn')+
       '<div class="meter"><i style="width:'+pc+'%"></i></div>'+
       row(' ',Math.round(G.driveWork)+' / '+wneed+' ('+pc+'%)','dim')+unlock+
       '<div class="dim" style="font-size:12px;line-height:1.45">'+T('driveAll')+'</div>';
  } else {
    hy=row(fill(T('driveProg'),{g:roman(gnext)}),costHtml({parts:wneed},E),'dim')+unlock+
       '<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('driveNeed'),{p:K.DRIVE_POP,r:driveReachFor(G)})+'</div>';
  }
  h+=blk(dico()+T('driveTitle'),hy).replace('<div class="blk">','<div class="blk hl">');   // v4.13: marked and lit
  h+=blk(T('runLog'),'<div class="dim" style="font-size:12px;line-height:1.45">'+T('runLogHint')+'</div><button class="btn" type="button" data-act="export">'+T('exportLog')+'</button>'+
    '<button class="btn" type="button" data-act="guide">'+T('guideBtn')+'</button>');
  if(textsVisible()) h+=blk(T('textsTitle'),'<div class="dim" style="font-size:12px;line-height:1.45">'+
    (TXT.src==='sheet'? fill(T('textsLive'),{t:TXT.at.toTimeString().slice(0,5),n:TXT.n}) : fill(T('textsBaked'),{n:TXT.n}))+'</div>'+
    '<button class="btn" type="button" data-act="texts"'+off(TXT_URL?'ok':'textsNoUrl')+'>'+T('textsReload')+'</button>');
  h+=blk(T('newGame'),'<div class="fld"><span>'+T('seed')+'</span><input id="seedin" value="'+G.seed+'"></div><button class="btn" type="button" data-act="new">'+T('newGame')+'</button>');
  return h;
}

/* v4.10 (Nikita, 27.09: 'слишком много непонятных цифр'): the seam is told in years at the current pace, not units */
function seamYears(pid){ var res=G.reserves[pid], c=G.colonies[pid], p=planet(pid); if(!c) return n0(res)+' '+(DEP[U.lang][p.dep]||p.dep);
  var rate=c.pop*p.rich*K.PROD*rateMult(c); if(rate<=0.001) return n0(res)+' '+(DEP[U.lang][p.dep]||p.dep); return fill(T('seamYears'),{n:n0(Math.round(res/rate))}) }
/* v4.11 (Nikita, 28.09): a bar for the pile, and the slice one hull takes per trip — the picked hull if one is
   picked, else the biggest hull on the line */
function pileBar(p,c,dep){
  var pile=Math.max(0,c.store[dep]||0);
  var pk=U.pickShip!==null?shipById(G,U.pickShip):null, hull=(pk&&pk.mode==='idle'&&!(pk.from&&pk.to))?pk:null;
  if(!hull){ var best=null; onLine(G,p.id).forEach(function(o){ if(!o.retire&&(!best||o.cap>best.cap)) best=o }); hull=best }
  var cap=hull?hull.cap:0, scale=Math.max(pile,cap,1), pw=Math.round(pile/scale*100), cw=Math.round(Math.min(cap,pile)/scale*100);
  var lbl= cap ? (pile<1 ? T('pileEmpty') : (cap>=pile ? fill(T('pileAll'),{s:n0(pile),c:n0(cap)}) : fill(T('pileShare'),{s:n0(pile),c:n0(cap),n:n0(cap),p:Math.round(cap/pile*100)}))) : T('pileNoHull');   // v4.18 (Nikita: 'не понятно что означает этот слайдер красный'): numbers, no red   // v4.13: pileNoHull no longer says 'pick one'
  return '<div class="pile"><div class="pile-bar"><i class="pile-fill" style="width:'+pw+'%"></i>'+(cap?'<i class="pile-take" style="width:'+cw+'%"></i>':'')+'</div><div class="pile-lbl dim">'+lbl+'</div></div>';
}
/* v4.18 (Nikita, 04.10: 'при эвакуации снимал население только курьер. Любой свободный по нажатию назначается'):
   the free courier that can lift everyone and gets there first; else the biggest one */
function pickCourier(pid){ var p=planet(pid), c=G.colonies[pid], pop=c?Math.floor(c.pop):0;
  var list=freeHulls().filter(function(s){ return !(s.from&&s.to)&&!s.pend&&!s.job&&!s.retire&&HULLS[s.hull].key==='courier'&&p&&canReachSector(s,p.sec) });
  if(!list.length) return null;
  var fit=list.filter(function(s){return s.cap>=pop}).sort(function(a,b){ return legDays(G,pid,'earth',a)-legDays(G,pid,'earth',b) || a.cap-b.cap });
  if(fit.length) return fit[0];
  return list.sort(function(a,b){return b.cap-a.cap})[0] }
function evacInfo(p,c){
  var evg=G.ships.some(function(o){return o.job==='evac'&&o.dest===p.id&&o.mode==='transit'}); if(evg) return '';
  var s=pickCourier(p.id), pop=Math.floor(c.pop);
  if(!s){ var nh=nextHome(G,p.id,'courier'); return '<div class="warn" style="font-size:12px;line-height:1.45;margin-top:6px">'+esc(fill(T('evacNoCourierHint'),{w:nh?fill(T('evacW_wait'),{n:nh.id,l:nh.t}):T('evacW_orderC')}))+'</div>' }
  return '<div class="'+(s.cap<pop?'warn':'dim')+'" style="font-size:12px;line-height:1.45;margin-top:6px">'+esc(fill(T(s.cap<pop?'evacShort':'evacWho'),{n:s.id,h:hullName(HULLS[s.hull]),c:s.cap,k:pop,l:pop-s.cap,y:legDays(G,p.id,'earth',s)}))+'</div>';
}
/* v4.17 (Nikita, 04.10: 'когда планета истощается, то блокируется всё. Можно только нажать эвакуировать'): a spent world offers one thing
   v4.18 (Nikita, 04.10): …but only when the surface is empty too. While the pile lasts, hulls can still be sent to collect it */
function depletedBlock(p,c){
  var dep=p.kind==='works'?'parts':p.dep, left=Math.floor((c.store&&c.store[dep])||0);
  var evg=G.ships.some(function(o){return o.job==='evac'&&o.dest===p.id&&o.mode==='transit'});
  return blk(T('depletedTitle'),
    '<div class="bad" style="font-weight:600;margin-bottom:4px">'+T('depletedLead')+'</div>'+
    '<div class="dim" style="font-size:12px;line-height:1.45;margin-bottom:10px">'+(left>0?fill(T('depletedLeft'),{n:n0(left),r:T(dep).toLowerCase()}):T('depletedNone'))+'</div>'+
    '<button class="btn danger bigbtn" type="button" data-act="evac" data-p="'+p.id+'"'+off(evg?'evacuating':'ok')+'>'+(evg?T('evacGoing'):T('evac'))+'</button>'+evacInfo(p,c));
}
function lineGenBox(max){
  if(!max) return '';
  var sel=lineGenSel();
  return '<div class="lg-box"><div class="lg-hd"><span>'+T('lineGen')+'</span><b>'+roman(sel)+(sel===max?' \u00b7 '+T('lineGenNewest'):'')+'</b></div>'+
    '<div class="lg-row"><button type="button" class="btn sm" data-act="lgen" data-d="-1">\u25c0</button>'+genTrack(sel,max)+
    '<button type="button" class="btn sm" data-act="lgen" data-d="1">\u25b6</button></div>'+
    (sel<max-K.GEN_OVERLAP?'<div class="warn" style="font-size:11.5px;margin-top:3px">'+T('lineGenRetired')+'</div>':'')+'</div>';
}
function railTarget(){
  if(!U.sel) return blk(T('tabTarget'),'<div class="dim">'+T('selectPlanet')+'</div>');
  var p=planet(U.sel), h='';
  if(!proWorldVisible(p.id)) return blk(T('tabTarget'),'<div class="dim">'+T('selectPlanet')+'</div>');
  if(!sectorOpen(G,p.sec)) return blk(pname(p.id),'<div class="dim">'+T('unsurveyed')+'</div>');
  if(G.ghost&&G.ghost[p.id]) return blk(pname(p.id),'<div class="dim">'+fill(T('ghostWorld'),{d:G.ghost[p.id]})+'</div>');
  var res=G.reserves[p.id];
  h+=blk(pname(p.id),
    '<div style="color:'+KCOL[p.kind]+';font-weight:600;display:flex;align-items:center;gap:7px">'+kico(p.kind,'kico')+T(KIND[p.kind])+'</div>'+
    '<div class="dim" style="font-size:12px;line-height:1.45">'+T(KINDD[p.kind])+'</div>'+
    '<div class="rows" style="margin-top:4px">'+
    row(T('sector'),p.sec+1)+
    row(T('travel'),fill(T('days'),{n:travelDays(G,p.dist)}))+
    (isFinite(res)? row(pico('pile',p.kind==='works'?'parts':p.dep)+T('seamLeft'), res>0? seamYears(p.id) : T('depleted'), res>0?'':'bad') : '')+
    '</div>',
    '<span class="tag">'+SECTORS[p.sec].name+'</span>');
  h=themed(h,'wc wc-head',KCOL[p.kind]);

  var c=G.colonies[p.id];
  var hulls=assignable(p.id);
  var bf=busyFarLine(p.id);

  if(c&&!c.dark&&isFinite(res)&&res<=0&&pileLeft(G,p.id)<1) return h+depletedBlock(p,c);   // v4.17/v4.18: seam spent AND surface empty — only evacuation
  if(c&&!c.dark&&isFinite(res)&&res<=0){ var dl=pileLeft(G,p.id), dd=p.kind==='works'?'parts':p.dep;   // v4.18: seam spent, pile still there — collect it
    h+=blk(T('dryTitle'),'<div class="warn" style="font-size:12.5px;line-height:1.45">'+fill(T('dryLead'),{n:n0(dl),r:T(dd).toLowerCase()})+'</div>') }
  if(!c){
    /* v4.4 (Nikita, 25.09): no settlers/rations fields — the party is as many as the world takes, the hold
       carries and Earth spares; the preview says the number. */
    var fs0=hulls.length?shipById(G,pick()):null, er=enRoute(G,p.id);
    var party=fs0?foundParty(G,fs0,p.id):0, fewHands=fs0&&party<K.MIN_FOUND;
    if(er){ h+=blk(T('found'),'<div class="dim">'+fill(T('foundEnroute'),{n:er.id,y:er.t})+'</div>'); return h }   // v4.8: one party at a time
    h+=blk(T('found'),
      (hulls.length?(shipChips(hulls)+bf+
      '<div id="prev">'+(fewHands?'<span class="warn">'+fill(T('foundFew'),{n:K.MIN_FOUND-party})+'</span>':foundPreview(p,party))+'</div>'+
      '<button class="btn prim" type="button" data-act="colonize" data-p="'+p.id+'"'+(fewHands?off('fewhands',{n:K.MIN_FOUND-party}):'')+'>'+T('found')+'</button>')
      :'<div class="dim">'+T(freeHulls().length?'noFree':'noFreeAny')+'</div>'+bf));   // v4.13: 'none can reach' only when some exist
    return h;
  }

  var rep=reported(G,p.id), r=rep.r, l=rep.lag;
  var tag = c.dark?'<span class="tag r">'+T('dark')+'</span>':'<span class="tag t">'+fill(T('ago'),{n:rep.age})+'</span>';
  var ub=Math.min(100,r.unrest);
  var stores=[];
  ['metal','food','fuel','parts'].forEach(function(kk){ if(r.store[kk]>0) stores.push(qty(kk,n0(r.store[kk]),true)) });
  var lrB=c.dark?null:lineRate(G,p.id), depB=p.kind==='works'?'parts':p.dep;
  var bigVerdict='', bigCls='dim';
  if(lrB){ if(lrB.makes<=0.001) { bigVerdict=T('verdictDead'); bigCls='bad' } else if(!lrB.hulls){ bigVerdict=T('verdictNoLine'); bigCls='bad' } else if(lrB.piling){ bigVerdict=T('verdictPileShort'); bigCls='bad' } else { bigVerdict=T('verdictOkShort'); bigCls='good' } }
  h+='<div class="blk bigstat wc wc-body" style="--acc:'+KCOL[p.kind]+'"><div class="bs-row">'+
      '<div class="bs"><small>'+T('bsStock')+'</small><b>'+pico('house',depB)+n0(c.store[depB]||0)+'</b></div>'+
      '<div class="bs"><small>'+T('bsHands')+'</small><b>'+ico('people')+n0(c.pop)+'</b></div>'+
      '<div class="bs"><small>'+T('bsMakes')+'</small><b>'+pico('plant')+(lrB&&lrB.makes>0.001?lrB.makes.toFixed(1)+T('perYear'):'—')+'</b></div>'+
    '</div>'+(bigVerdict?'<div class="bs-verdict '+bigCls+'">'+bigVerdict+'</div>':'')+(lrB&&lrB.hulls?'<div class="bs-rates dim">'+fill(T('rateLine'),{m:lrB.makes.toFixed(1),h:lrB.carries.toFixed(1)})+'</div>':'')+pileBar(p,c,depB)+
    '<div class="pile-lbl dim">'+T('hauledSoFar')+' <b class="c-'+depB+'">'+qty(depB,n0((c.hauledOut||{})[depB]||0),true)+'</b></div></div>';   // v4.13: the haul record in one line
  // v4.20 (Nikita, 06.10): the 'Last report' block is gone - the world card above says it all

  // why they are angry — the actual per-day arithmetic
  if(!c.dark && K.UNREST_ON){
    var wr='';
    wr+=row(T('wSilence'),'+'+(l/K.SILENCE).toFixed(2)+T('perYear'),'warn');
    if(r.neglect>K.NEGLECT_DAYS) wr+=row(T('wNeglect'),'+'+K.NEGLECT_RATE.toFixed(2)+T('perYear'),'bad');
    wr+=row(T('wHaul'),'+'+K.HAUL_RESENT.toFixed(1)+' '+(U.lang==='ru'?'за полный трюм':'per full hold'),'dim');
    wr+=row(T('wCalm'),'−'+K.CALM.toFixed(2)+T('perYear'),'good');
    wr+=row(T('selfFed'),'✓','good');
    h+=blk(T('why'),'<div class="rows">'+wr+'</div>');
  }

  /* v4.13 (Nikita, 30.09): 'Line health' is gone — the big status above already gives the verdict */
  if(!c.dark) h+=freeHullsBlock(p);   // v4.16 (F-03): idle hulls that can reach this world, one tap to send
  if(!c.dark) h+=lineBlock(p,c);   // v4.6: the standing order; v4.13: it carries the evacuation button too

  // v4.4: the engineering block — what the machines do here, and the next kit
  if(!c.dark){
    var kt=kitTier(c), kc=kitCost(c), kr=canKit(G,p.id), hold=lineHold(G,p.id), kb='';
    var kname=T({mine:'kitMine',farm:'kitFarm',well:'kitWell',works:'kitWorks'}[p.kind]);
    kb+=row(T('kitTier'), kt? roman(kt-1)+' · ×'+Math.pow(K.KIT_OUT,kt).toFixed(1) : T('kitNone.'+p.kind), kt?(kitLive(c)?'good':'bad'):'dim');
    if(kt) kb+=row(T('kitFuel'), qty('fuel',kitBurn(c).toFixed(1)+T('perYear'))+' · '+T('dashStock').toLowerCase()+' '+qty('fuel',n0(c.store.fuel||0)), kitLive(c)?'dim':'bad');
    if(kt&&!kitLive(c)) kb+='<div class="bad" style="font-size:12px">'+T('kitStarved')+'</div>';
    if(c.kit) kb+='<div class="warn" style="font-size:12px;line-height:1.45">'+fill(T(hold>=c.kit.w?'kitWaiting':'kitTooBig'),{t:roman(c.kit.tier-1),w:c.kit.w,h:hold})+'</div>';
    else if(c.kitShip){ var ks=shipById(G,c.kitShip); kb+='<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('kitAboard'),{n:c.kitShip,y:ks?ks.t:0})+'</div>' }
    else if(kr==='kitgate') kb+='<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('kitGate'),{g:roman(K.KIT_GATE_DRIVE)})+'</div>';
    else if(kr==='tiermax') kb+='<div class="dim" style="font-size:12px">'+T('kitMax')+'</div>';
    else {
      kb+='<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('kitHint'),{k:kname,x:K.KIT_OUT.toFixed(1),f:(K.KIT_FUEL*kc.tier).toFixed(1)})+'</div>'+
          '<button class="btn'+(kr==='ok'?' prim':'')+'" type="button" data-act="kit" data-p="'+p.id+'"'+((kr==='metal'||kr==='parts')?offCost({metal:kc.metal,parts:kc.parts},G.earth):off(kr))+'>'+fill(T('kitOrder'),{t:roman(kc.tier-1)})+
          '<span class="c">'+costHtml({metal:kc.metal,parts:kc.parts},G.earth)+'</span></button>'+
          '<div class="'+(hold>=kc.w?'dim':'warn')+'" style="font-size:12px">'+fill(T('kitWeight'),{w:kc.w,h:hold})+'</div>';
    }
    h+=blk(kname,kb+kico(p.kind,'wm'),kt?'<span class="tag t">'+roman(kt-1)+'</span>':'').replace('<div class="blk">','<div class="blk kb sb sb-kit">');
  }
  /* v4.13 (Nikita, 30.09): the Orders block is gone — the standing order counters are the only way to put hulls on
     a line (the yards take an idle hull at Earth first, then build). What was left in Orders: the drive programme
     (its own marked block) and evacuation (a button under the standing order). Enforcement on a silent world stays. */
  if(c.dark){
    h+=blk(T('orders'), hulls.length?(shipChips(hulls)+bf+
      '<button class="btn danger" type="button" data-act="punit" data-p="'+p.id+'">'+T('punit')+'<br><span class="c" style="float:none;color:var(--faint)">'+fill(T('punitCost'),{n:K.PUNITIVE_POP,p:Math.round(K.PUNITIVE_P*100)})+'</span></button>')
      :'<div class="dim">'+T('noShips')+'</div>');
  } else if(p.kind==='works'){
    var dh='';
    if(!G.drive){
      var dmiss=[];
      if(settledCount(G)<driveReachFor(G)) dmiss.push(fill(T('needSettled'),{n:driveReachFor(G)}));
      if(c.pop<K.DRIVE_POP) dmiss.push(T('population')+' '+K.DRIVE_POP);
      /* v4.10 (Nikita, 27.09: 'непонятно, как получать суда следующих поколений'): say what it is and what it costs */
      dh+='<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('driveExplain'),{n:driveWorkFor(G),g:roman((G.driveLvl||0)+1)})+'</div>';
      dh+='<button class="btn '+(dmiss.length?'':'bigbtn')+'" type="button" data-act="drive" data-p="'+p.id+'"'+(dmiss.length?(settledCount(G)<driveReachFor(G)?off('needsettled',{n:driveReachFor(G),r:settledCount(G)}):off('pop')):'')+'>'+T('driveHost')+
        (dmiss.length?'<br><span class="c" style="float:none;color:var(--rust)">'+dmiss.join(' · ')+'</span>':'')+'</button>';
    } else if(G.drive===p.id) dh+=row(T('driveTitle'),Math.round(G.driveWork)+' / '+driveWorkFor(G),'warn')+'<div class="meter"><i style="width:'+Math.min(100,Math.round(G.driveWork/driveWorkFor(G)*100))+'%"></i></div>';
    else dh+='<div class="dim" style="font-size:12px;line-height:1.45">'+fill(T('driveElsewhere'),{p:pname(G.drive)})+'</div>';
    h+=blk(dico()+T('driveTitle'),dh).replace('<div class="blk">','<div class="blk hl">');
  }
  return h;
}
/* v4.6: the line as a standing order — 'two haulers here'; the yards do the rest */
function lineBlock(p,c){
  var L=lineOf(G,p.id)||{want:{courier:0,hauler:0,freighter:0},renew:true,wait:{}};
  var all=onLine(G,p.id), rows='';
  for(var ci=0;ci<CLASSES.length;ci++){ var cls=CLASSES[ci];
    var selG=lineGenSel(), hi=hullAt(cls,selG); if(hi===null) hi=currentHull(G,cls); var hh=hi!==null?HULLS[hi]:null;   // v4.17: the generation on the track
    if(!hh||reach(G)<hh.reach) continue;                      // v4.10 (Nikita, 27.09): classes not yet open stay off the card
    var want=L.want[cls]||0;
    var flying=all.filter(function(o){return !o.retire&&shipClass(o)===cls&&o.mode!=='building'}).length;
    var yard=all.filter(function(o){return shipClass(o)===cls&&o.mode==='building'}).length;
    var retiring=all.filter(function(o){return o.retire&&shipClass(o)===cls&&o.mode!=='building'}).length;
    var reachOk=!!(hh&&canReachSector({hull:hi},p.sec)&&reach(G)>=hh.reach);
    var meta= hh ? (reachOk ? fill(T('lineMeta'),{c:n0(hh.cap),y:legDays(G,p.id,'earth',{hull:hi})*2,m:n0(hh.metal)}) : T('lineRange')) : T('lineLocked');
    var st='';
    if(hh&&!c.dark){ var pl=pileLeft(G,p.id); st+=fill(T('lineTrip'),{n:n0(Math.min(hh.cap,pl||hh.cap)),p:pl>0?Math.min(100,Math.round(hh.cap/pl*100)):100}) }
    if(flying) st+=(st?' · ':'')+fill(T('lineFlying'),{n:flying});
    if(yard) st+=(st?' · ':'')+fill(T('lineYard'),{n:yard});
    if(retiring) st+=(st?' · ':'')+fill(T('lineRetiring'),{n:retiring});
    var gmap={}; all.forEach(function(o){ if(!o.retire&&shipClass(o)===cls){ var gg=hullGen(o); gmap[gg]=(gmap[gg]||0)+1 } });
    var gtxt=Object.keys(gmap).sort(function(a,b){return a-b}).map(function(g){ return roman(+g)+'\u00d7'+gmap[g] }).join(' \u00b7 ');
    if(gtxt) st+=(st?' \u00b7 ':'')+fill(T('lineGens'),{g:gtxt});
    var idleSel=freeFor(cls,p.id,selG), buildable=selG>=(G.gen||0)-K.GEN_OVERLAP;
    var wr=L.wait&&L.wait[cls];
    if(want>flying+yard&&wr) st+=(st?' · ':'')+'<span class="warn">'+T('lineWait_'+wr)+'</span>';
    rows+='<div class="so-row"><span class="so-name"><b>'+sico(cls)+(hh?hullName(hh):T(cls))+'</b><small>'+meta+'</small></span>'+   // v4.13: .so-row is big now (CSS)
      '<span class="so-cnt"><button class="btn sm" type="button" data-act="want" data-p="'+p.id+'" data-c="'+cls+'" data-n="'+(want-1)+'"'+off(want<=0?'why_zero':'ok')+'>&minus;</button>'+
      '<b>'+want+'</b><button class="btn sm plus" type="button" data-act="want" data-p="'+p.id+'" data-c="'+cls+'" data-g="'+selG+'" data-n="'+(want+1)+'"'+off(!reachOk?'range':(want>=12?'why_max':(G.reserves[p.id]<=0&&pileLeft(G,p.id)<1?'depleted':((!buildable&&!idleSel)?'gen_retired':'ok'))))+'>+</button></span>'+
      '<span class="so-st dim">'+(st||T('lineNone'))+'</span></div>';
  }
  /* v4.8 (Nikita, 27.09: 'хочу знать, чего и сколько на планете и какие суда там работают') */
  var hl='';
  all.slice().sort(function(a,b){return a.id-b.id}).forEach(function(o){
    var where= o.mode==='building' ? fill(T('lhYard'),{y:o.t}) : (o.mode==='idle' ? T('lhPier') : (o.dir==='out'? fill(T('lhOut'),{y:o.t}) : fill(T('lhBack'),{y:o.t})));
    var note= o.retire ? ' · <span class="warn">'+T('lhRetire')+'</span>' : (o.replaces?' · '+T('lhSuccessor'):'');
    hl+='<div class="lh"><b>'+sico(shipClass(o))+fill(T('lhName'),{n:o.id})+' · '+hullName(HULLS[o.hull])+'</b><span class="dim">'+where+note+(o.mode==='building'?'':' <button class="chip x" type="button" data-act="unroute" data-s="'+o.id+'" title="'+T('clear')+'">×</button>')+'</span></div>';   // v4.13: release lives here, the separate block is gone
  });
  var ren=(lineOf(G,p.id)&&(G.gen||0)>=2)?'<button class="btn" type="button" data-act="renew" data-p="'+p.id+'" data-on="'+(L.renew?0:1)+'">'+T(L.renew?'lineRenewOn':'lineRenewOff')+'</button>':'';
  /* v4.13 (Nikita, 30.09): the counters come first and big — silhouette, class, number; the hulls serving the line
     sit under them; evacuation is the last button */
  var evg=G.ships.some(function(o){return o.job==='evac'&&o.dest===p.id&&o.mode==='transit'});
  var ev='<button class="btn danger" type="button" data-act="evac" data-p="'+p.id+'"'+off(evg?'evacuating':'ok')+'>'+(evg?T('evacGoing'):T('evac'))+'</button>'+evacInfo(p,c);   // v4.18: who goes, and whether everyone fits
  return themed(blk(T('lineT'),'<div class="dim line-hint">'+T('lineUpkeepHint')+'</div>'+lineGenBox(G.gen||0)+rows+(hl?'<div class="lhs" style="margin-top:8px"><div class="dim" style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px">'+T('lineHulls')+'</div>'+hl+'</div>':'<div class="lhs dim" style="margin-top:8px">'+T('lineNoHulls')+'</div>')+ren+ev, lineOf(G,p.id)?'<span class="tag t">'+T('lineOn')+'</span>':''),'sb sb-line');
}

function supplyRow(label,have,rate,bad){
  var d=Math.floor(have/Math.max(0.001,rate));
  var cls = have<=0?'bad' : (d<30?'warn':'good');
  return '<div class="row"><span>'+label+'</span><b class="'+cls+'">'+n0(have)+
    ' <span class="dim" style="font-weight:400">· '+(have<=0?T('runningOut'):fill(T('daysLeft'),{n:d}))+'</span></b></div>';
}
function fldNum(id,label,val){
  return '<label class="fld2"><span>'+label+'</span><input id="'+id+'" value="'+val+'"></label>';
}
function tog(id,label,on){
  return '<button type="button" class="tg'+(on?' on':'')+'" id="'+id+'" data-tog="1" aria-pressed="'+(!!on)+'">'+label+'</button>';
}
function shipState(s){
  if(s.mode==='building') return fill(T('mBuild'),{n:s.t});
  if(s.mode==='idle') return T('mIdle');
  if(s.mode==='missing') return fill(T('mMissing'),{n:s.missDays})+(s.bearing!==null&&s.bearing!==undefined?' · '+fill(T('bearing'),{n:s.bearing}):'');
  if(s.mode==='transit') return fill(T('mTransit'),{p:(s.dest==='earth'?T('earthNode'):pname(s.dest||s.target)),n:s.t})+(s.pend?' · '+T('retarget'):'');
  return T('mDead');
}
function railWorlds(){
  var keys=Object.keys(G.colonies).filter(proWorldVisible);
  if(!keys.length) return blk(T('worldsTab'),'<div class="dim">'+T('noWorlds')+'</div>');
  keys.sort(function(a,b){return planet(a).dist-planet(b).dist});
  var rows='';
  /* v4.13 (Nikita, 30.09): a world is five lines — hulls on the line, hauled out, stockyard and seam, people,
     years from Earth. The per-hull list and the rates are on the Target tab. */
  keys.forEach(function(k){
    var c=G.colonies[k], p=planet(k), dep=p.kind==='works'?'parts':p.dep;
    var res=G.reserves[k];
    var lines=G.ships.filter(function(s){return s.mode!=='dead'&&((s.from===k||s.to===k)||(s.pend&&s.pend.from===k))});
    var seam= p.kind==='works' ? '' : ' <span class="dim">· '+(res===Infinity?'∞':(res>0?seamYears(k):T('depleted')))+'</span>';
    rows+='<div class="lrow">'+
      '<div class="row"><span><b style="color:'+KCOL[p.kind]+'">'+kico(p.kind,'kico')+p.name.toUpperCase()+'</b> <span class="dim">'+T(KIND[p.kind]).split(' ')[0]+(kitTier(c)?' \u2699'+roman(kitTier(c)-1):'')+'</span></span>'+
        '<b class="'+(lines.length?'good':'warn')+'">'+lines.length+' '+T('wHulls')+'</b></div>'+
      '<div class="row"><span>'+T('wHauled')+'</span><b>'+qty(dep,n0((c.hauledOut||{})[dep]||0),true)+'</b></div>'+
      '<div class="row"><span>'+T('wStockSeam')+'</span><b class="'+(res>0||p.kind==='works'?'':'bad')+'">'+qty(dep,n0(c.store[dep]||0),true)+seam+'</b></div>'+
      '<div class="row"><span>'+T('population')+'</span><b>'+ico('people')+n0(c.pop)+'</b></div>'+
      '<div class="row"><span>'+T('wTravel')+'</span><b class="dim">'+fill(T('days'),{n:travelDays(G,p.dist)})+'</b></div>'+
      '</div>';
  });
  return blk(T('worldsTab'),rows,'<span class="tag t">'+keys.length+'</span>');
}
/* the yard dock, bottom-left of the chart: build, scrap, and the ark, without scrolling the rail */
function drawDock(){
  var d=el('dock'); if(!d) return;
  d.hidden=!proSee('dock'); if(d.hidden){ setHTML('dock',''); return }
  var E=G.earth, gnow=G.gen||0, h='';
  h+='<div class="dockhd" id="dockhd"><span>'+fill(T('genNow'),{n:roman(gnow)})+'</span><span class="dim" style="flex:0 0 auto;letter-spacing:0;text-transform:none;font-weight:400">'+fill(T('genReach'),{n:sectorLimit(gnow)+1})+'</span><em>'+(U.dockOpen?'\u2013':'+')+'</em></div><div class="dockbody">';
  /* v4.9 (Nikita, 27.09: 'хочу видеть, какие суда строятся и сколько ещё'): the yard queue sits above the buttons */
  /* v4.17 (Nikita, 04.10: 'в меню покупок убрать то какое судно строится и сколько времени'): the yard queue lives in the fleet panel now */
  var gens=[gnow]; if(gnow-K.GEN_OVERLAP>=0) gens.push(gnow-K.GEN_OVERLAP);
  gens.forEach(function(gg){
    var rowh='';
    for(var i=0;i<HULLS.length;i++){ var hl=HULLS[i]; if(hl.gen!==gg) continue;
      var c={metal:hl.metal,fuel:hl.fuel,parts:hl.parts||0,people:hl.crew||0};
      var ok = reach(G)>=hl.reach && E.metal>=c.metal && E.fuel>=c.fuel && E.parts>=c.parts && E.people-K.EARTH_KEEP>=c.people;
      var need = reach(G)<hl.reach ? '<span class="dsub bad">'+fill(T('needR'),{n:hl.reach})+'</span>' : '';
      rowh+='<button type="button" class="dbtn" data-act="build" data-h="'+i+'"'+(reach(G)<hl.reach?off('needreach',{n:hl.reach,r:reach(G)}):offCost(c,E))+'>'+
        '<b><span class="hn">'+sico(hl.key)+esc(hullName(hl))+'</span><small title="'+esc(T('speedTip'))+'">'+esc(fill(T('capacity'),{n:hl.cap})+' · '+speedTxt(hl))+'</small></b>'+
        '<span class="dsub">'+esc(fill(T('hullReach'),{n:hullRange(hl)+1})+' · '+fill(T('buildTime'),{n:hl.days}))+'</span>'+need+
        costHtml(c,E)+'</button>';
    }
    if(rowh) h+='<div class="dockrow">'+rowh+'</div>';
  });
  // idle hulls of older generations: one button per generation
  var idleOld={}; G.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&hullGen(s)<gnow){ (idleOld[hullGen(s)]=idleOld[hullGen(s)]||[]).push(s) } });
  Object.keys(idleOld).forEach(function(g){ var list=idleOld[g], m=0, pp=0; list.forEach(function(s){ m+=scrapValue(HULLS[s.hull]).metal; pp+=s.crew||0 });
    h+='<div class="dockrow"><button type="button" class="dbtn wide" data-act="scrapgen" data-g="'+g+'"><b>'+esc(fill(T('scrapIdleGen'),{g:roman(+g),n:list.length}))+'</b>'+costHtml({metal:m,people:pp},null,'+')+'</button></div>';
  });
  if(G.night){
    var ac=arkCost(G), aok=canArk(G)==='ok';
    h+='<div class="dockrow"><button type="button" class="dbtn wide ark" data-act="ark"'+offCost(ac,E)+'><b>'+esc(fill(T('dockArk'),{n:K.ARK_BLOCK}))+'<small>'+G.ark.berths+' · '+fill(T('nightIn'),{n:nightLeft(G)})+'</small></b>'+costHtml(ac,E)+'</button></div>';
  }
  setHTML('dock',h+'</div>');
  d.classList.toggle('shut',!U.dockOpen);
  if(!U.dockOpen) d.style.height='';
}
/* the advisor may grow down, the dock may grow up; neither may cover the other */
function layoutPanels(){
  var a=el('advisor'), d=el('dock'), m=el('mapwrap'); if(!a||!d||!m) return;
  var mh=m.clientHeight, dh=d.offsetHeight;
  var room=mh-12-dh-12-12;                         // map height minus dock, minus margins
  var sg=el('ringsign');   // v4.16: on a phone the sign spans the map top; the advisor starts under whatever height it has
  if(window.innerWidth<=640&&sg&&sg.offsetHeight) a.style.top=(sg.offsetTop+sg.offsetHeight+8)+'px'; else a.style.top='';
  room-=(parseInt(a.style.top,10)||12)-12;
  a.style.maxHeight=Math.max(120,Math.min(mh*0.46,room))+'px';
  d.style.maxHeight=Math.max(120,mh-12-a.offsetHeight-12-12)+'px';
}
function drawRail(){
  if(U.tab==='fleet') U.tab='worlds';
  var h = U.tab==='earth'?railEarth():(U.tab==='target'?railTarget():railWorlds());
  setHTML('railbody',h);
  var tb=document.querySelectorAll('.tab');
  for(var i=0;i<tb.length;i++) tb[i].classList.toggle('on',tb[i].dataset.tab===U.tab);
}

function showLog(){
  var box=el('logbox'); if(!box) return;
  act(G,'export',{});
  el('logtxt').value=exportLog(G);
  box.hidden=false;
  el('logtxt').focus(); el('logtxt').select();
}
/* v4.11 (Nikita, 28.09: 'экспорт JSON-файла'): the page asks the viewer to save the file; where the runtime is absent
   (a local .html) it falls back to a blob link */
function saveLog(){
  var data=exportLog(G), name='last-berth-'+G.seed+'-'+G.day+'.json';
  var api=(window.claude&&window.claude.use)?window.claude.use('downloads'):Promise.resolve(null);
  api.then(function(dl){
    if(dl&&dl.save){ return dl.save({filename:name,data:data}).then(function(){ say('saved') },function(e){ if(!(e&&e.code==='declined')) say('savefail') }) }
    try{ var b=new Blob([data],{type:'application/json'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(u) },500); say('saved') }catch(e){ say('savefail') }
  });
}
function copyLog(){
  var ta=el('logtxt'); ta.focus(); ta.select();
  var done=false;
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(ta.value).then(function(){ say('copied') },function(){ say('copyfail') }); done=true } }catch(e){}
  if(!done){ try{ done=document.execCommand('copy') }catch(e){} say(done?'copied':'copyfail') }
}
function drawLang(){
  var b=el('lang'); if(!b) return;
  b.hidden=!!U.langPicked;
}
function drawIntro(){
  var b=el('intro'); if(!b) return;
  if(G.night&&!G.nightSeen&&U.langPicked&&!U.intro){
    b.hidden=false;
    el('introbox').innerHTML='<h2 class="bad">'+T('nightT')+'</h2>'+
      '<div class="gbody"><p class="gkick" style="font-size:13.5px;color:var(--text)">'+fill(T('nightB'),{y:G.night,n:K.NIGHT_YEARS})+'</p>'+
        '<p class="gkick" style="font-size:13.5px;color:var(--text)">'+fill(T('nightDrive'),{g:roman(G.arkMark)})+'</p></div>'+
      '<div class="gnav"><span class="grow"></span><button class="btn prim" type="button" data-act="nightok">'+T('nightGo')+'</button></div>';
    return;
  }
  if(G.shiftOpen&&U.langPicked&&!U.opening&&!U.pro.on&&U.shiftStop){
    var R=G.shiftReport||{}, sd=R.d||{}, rows='';
    function srow(k,v,cls){ return '<div class="row"><span>'+k+'</span><b'+(cls?' class="'+cls+'"':'')+'>'+v+'</b></div>' }
    var got=[]; ['metal','food','fuel','parts'].forEach(function(kk){ if(sd[kk]>0) got.push(qty(kk,n0(sd[kk]),true)) });
    rows+=srow(T('shDelivered'), got.length?got.join(' · '):T('nothing'), got.length?'good':'bad');
    if(sd.people>0) rows+=srow(T('shPeople'), n0(sd.people),'dim');
    rows+=srow(T('shWorlds'), R.cols+(R.founded?' <span class="dim">'+fill(T('shFounded'),{n:R.founded})+'</span>':''), R.cols>R.colsWas?'good':(R.cols<R.colsWas?'warn':'dim'));
    if(R.sectors>0) rows+=srow(T('shSectors'), fill(T('shSectorsN'),{n:R.sectors}),'good');
    if(R.drive>0) rows+=srow(T('shDrive'), fill(T('shDriveN'),{n:R.drive}),'good');
    if(R.kits>0) rows+=srow(T('shKits'), R.kits,'good');
    if(R.built>0) rows+=srow(T('shBuilt'), R.built,'dim');
    if(R.renewed>0) rows+=srow(T('shRenewed'), fill(T('shRenewedN'),{n:R.renewed,m:n0(R.renewMetal||0)}),'dim');
    if(R.attrition>0) rows+=srow(T('shAttrition'), R.attrition,'bad');
    rows+=srow(T('shHandsRate'), fill(T('shHandsRateN'),{n:(R.handsRate||0).toFixed(2)}), (R.handsRate||0)<1?'warn':'dim');
    if(R.lost>0) rows+=srow(T('shLost'), R.lost,'bad');
    if(R.mutinies>0) rows+=srow(T('shMutiny'), R.mutinies,'bad');
    rows+=srow(T('shHands'), n0(R.hands)+(R.idle?' <span class="dim">'+fill(T('shIdle'),{n:R.idle})+'</span>':''), R.hungry?'bad':'dim');
    if(R.left!==null&&R.left!==undefined) rows+=srow(T('shLeft'), fill(T('shLeftN'),{n:R.left,b:R.berths}), R.left<=K.NIGHT_NEAR?'bad':'warn');
    var tpl=LOG[U.lang][logKey({code:'shift',d:{k:R.k,n:R.no}})]||'';
    var line=tpl?fill(tpl,{n:R.no,k:R.k,c:R.cols,h:R.hands,i:R.idle,n2:R.left||0,b:R.berths}):'';
    b.hidden=false; el('introbox').className='shift';
    el('introbox').innerHTML='<h2>'+fill(T('shiftT'),{n:R.no})+'</h2>'+
      '<div class="gbody"><p class="gkick">'+esc(line)+'</p><div class="rows">'+rows+'</div></div>'+
      '<div class="gnav"><label class="dim" style="font-size:12px;display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" id="shstop" checked> '+T('shiftStop')+'</label>'+
      '<span class="grow"></span><button class="btn prim" type="button" data-act="shiftok">'+T('shiftGo')+'</button></div>';
    return;
  }
  if(U.opening&&U.langPicked){
    b.hidden=false; el('introbox').className='opening';
    var oi=Math.max(0,Math.min(OPEN_N-1,U.openStep)), od='';
    for(var q=0;q<OPEN_N;q++) od+='<i class="'+(q<=oi?'on':'')+'"></i>';
    el('introbox').innerHTML=
      '<div class="oart" data-act="onext">'+openArt(oi)+'</div>'+
      '<p class="otext">'+T('open.c'+(oi+1))+'</p>'+
      '<div class="gsteps">'+od+'</div>'+
      '<div class="gnav">'+
        (oi<OPEN_N-1?'<button class="btn" type="button" data-act="oskip">'+T('openSkip')+'</button>':'')+
        '<span class="grow gnum">'+fill(T('gStep'),{a:oi+1,b:OPEN_N})+'</span>'+
        '<button class="btn prim" type="button" data-act="onext">'+(oi<OPEN_N-1?T('openNext'):T('openBegin'))+'</button>'+
      '</div>';
    return;
  }
  el('introbox').className='';
  if(U.start&&U.langPicked){
    b.hidden=false;
    el('introbox').innerHTML='<div id="startbox"><h2>'+T('startT')+'</h2><p>'+T('startB')+'</p>'+
      '<button class="btn prim" type="button" data-act="prologue">'+T('startPro')+'</button>'+
      '<button class="btn" type="button" data-act="gskip">'+T('startSkip')+'</button>'+
      '<button class="btn" type="button" data-act="guide">'+T('startGuide')+'</button>'+
      '<button class="btn" type="button" data-act="opening">'+T('startOpen')+'</button></div>';
    return;
  }
  if(!U.intro||!U.langPicked){ b.hidden=true; return }
  b.hidden=false;
  var pages=GUIDE[U.lang], n=pages.length, i=Math.max(0,Math.min(n-1,U.introStep)), pg=pages[i];
  var dots=''; for(var d=0;d<n;d++) dots+='<i class="'+(d<=i?'on':'')+'"></i>';
  el('introbox').innerHTML=
    '<h2>'+esc(pg.t)+'</h2>'+
    '<div class="gsteps">'+dots+'</div>'+
    '<p class="gkick">'+pg.k+'</p>'+
    '<div class="gbody"><ul>'+pg.b.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div>'+
    '<div class="gnav">'+
      (i>0?'<button class="btn" type="button" data-act="gback">'+T('gBack')+'</button>':'')+
      '<span class="grow gnum">'+fill(T('gStep'),{a:i+1,b:n})+'</span>'+
      (i<n-1?'<button class="btn" type="button" data-act="gskip">'+T('gSkip')+'</button>':'')+
      '<button class="btn prim" type="button" data-act="'+(i<n-1?'gnext':'intro')+'">'+(i<n-1?T('gNext'):T('gDone'))+'</button>'+
    '</div>';
}
function drawOverlay(){
  var o=el('ov');
  if(!G.over){o.hidden=true;return}
  o.hidden=false;
  if(G.over==='night'){
    var sl=G.souls||0, lb=G.left||leftBehind(G), tier= sl<=0?0:(sl<300?1:(sl<1200?2:3));
    var behind=lb.home+lb.hulls+lb.colonies+lb.transit;
    /* v4.0: the score is the ones who wake; a grounded ark gets its own verdict */
    el('ovbox').innerHTML='<h2 class="'+(tier?'good':'bad')+'">'+T(tier?'endNightT':'endNight0')+'</h2>'+
      '<p>'+(G.grounded? fill(T('endNightDrive'),{b:G.ark.berths,g:roman(G.arkMark)}) : fill(T('endNightB'+tier),{s:sl}))+'</p>'+
      '<div class="rows">'+row(T('statSouls'),G.boarded||0,(G.boarded||0)?'good':'bad')+
        row(T('statWoke'),G.grounded?T('arkNoDrive'):sl+' <span class="dim">· '+Math.round((G.wake||0)*100)+'%</span>',tier?'good':'bad')+
        row(T('statBerths'),G.ark.berths)+
        row(T('statLeft'),behind+' <span class="dim">· '+lb.hulls+' '+T('lbHulls')+' · '+lb.colonies+' '+T('lbCol')+'</span>','warn')+
        row(T('statDay'),G.day)+row(T('statSec'),SECTORS.length)+row(T('statPeak'),G.stats.peak)+row(T('statDrive'),G.driveLvl||0)+(G.stats.mutinies?row(T('statMutiny'),G.stats.mutinies,'warn'):'')+'</div>'+
      chronLines(3)+
      '<button class="btn" type="button" data-act="export">'+T('exportLog')+'</button>'+
      '<button class="btn prim" type="button" data-act="new">'+T('newGame')+'</button>';
    return;
  }
  el('ovbox').innerHTML='<h2 class="bad">'+T('endT')+'</h2>'+
    '<p>'+T('endB')+'</p>'+
    '<div class="rows">'+row(T('statDay'),G.day)+row(T('statSec'),SECTORS.length)+
      row(T('statCol'),G.stats.founded)+row(T('statPeak'),G.stats.peak)+
      row(T('statDrive'),G.driveLvl||0)+row(T('statLost'),G.stats.lost)+'</div>'+
    chronLines(3)+
    '<button class="btn" type="button" data-act="export">'+T('exportLog')+'</button>'+
    '<button class="btn prim" type="button" data-act="new">'+T('newGame')+'</button>';
}

/* ---------- v4.17 (Nikita, 04.10, batch 2) ----------
   F-12/F-13 the top-left panel is the FLEET (every hull, bars for hulls in the yards); the advisor is its second tab
   F-16 a generation track in the standing order */
function hullProgress(s){ var h=HULLS[s.hull], tot=Math.max(1,h?h.days:1); return Math.max(0,Math.min(1,1-(s.t||0)/tot)) }
function cargoTxt(s){ var out=[]; ['metal','food','fuel','parts','people'].forEach(function(k){ var v=s.cargo&&s.cargo[k]; if(v>=1) out.push(qty(k,n0(v),true)) }); return out.join(' ') }
function fleetRow(s){
  var h=HULLS[s.hull], cls=h.key, free=s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to), st, sub=[];
  var dest = s.pend&&s.pend.from?pname(s.pend.from):(s.lineFor?pname(s.lineFor):((s.from&&s.from!=='earth')?pname(s.from):''));
  if(s.mode==='building') st=fill(T('flYards'),{y:s.t});
  else if(free) st=T('flFree');
  else st=shipState(s);
  sub.push(esc(fill(T('capacity'),{n:s.cap})+' \u00b7 '+speedTxt(h)));
  if(s.crew) sub.push(esc(n0(s.crew)+' '+T('people').toLowerCase()));
  var cg=(s.mode!=='building')?cargoTxt(s):''; if(cg) sub.push(cg);
  if(s.mutiny) sub.push('<span class="bad">'+esc(T('mutinied'))+'</span>');
  if(s.retire) sub.push('<span class="warn">'+esc(T('lhRetire'))+'</span>');
  var bar = s.mode==='building' ? '<div class="pbar" title="'+esc(fill(T('flYards'),{y:s.t}))+'"><i style="width:'+Math.round(hullProgress(s)*100)+'%"></i></div>' : '';
  return '<div class="fl-row'+(free?' free':'')+(s.mode==='building'?' bld':'')+'"><div class="fl-top"><b>'+sico(cls)+esc(hullName(h))+' '+esc(fill(T('hullNo'),{n:s.id}))+'</b>'+
    (dest?'<span class="fl-to">\u2192 '+esc(dest)+'</span>':'')+'<span class="fl-st">'+esc(st)+'</span></div>'+bar+'<div class="fl-sub dim">'+sub.join(' \u00b7 ')+'</div></div>';
}
function fleetBody(){
  var ships=G.ships.filter(function(s){return s.mode!=='dead'});
  if(!ships.length) return '<div class="advbody"><div class="arow dim">'+T('flEmpty')+'</div></div>';
  var bld=[],free=[],work=[],other=[];
  ships.forEach(function(s){
    if(s.mode==='building') bld.push(s);
    else if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)) free.push(s);
    else if(s.mode==='missing'||s.mutiny) other.push(s);
    else work.push(s);
  });
  bld.sort(function(a,b){return a.t-b.t}); free.sort(function(a,b){return a.id-b.id}); work.sort(function(a,b){return a.id-b.id}); other.sort(function(a,b){return a.id-b.id});
  function grp(title,list){ return list.length?'<div class="fl-grp">'+esc(title)+' <b>'+list.length+'</b></div>'+list.map(fleetRow).join(''):'' }
  return '<div class="advbody fleet">'+grp(T('flGrpYards'),bld)+grp(T('flGrpFree'),free)+grp(T('flGrpWork'),work)+grp(T('flGrpOther'),other)+'</div>';
}
function genTrack(sel,max){
  var out='<div class="gtrack" data-gtrack="1" data-max="'+max+'" role="slider" aria-valuemin="0" aria-valuemax="'+max+'" aria-valuenow="'+sel+'">';
  for(var i=0;i<=max;i++) out+='<i class="gseg'+(i<=sel?' fill':'')+(i===sel?' on':'')+(i<(G.gen||0)-K.GEN_OVERLAP?' old':'')+'"><u>'+roman(i)+'</u></i>';
  return out+'</div>';
}
function lineGenSel(){ var g=(U.lineGen===undefined||U.lineGen===null)?(G.gen||0):U.lineGen; return Math.max(0,Math.min(G.gen||0,g)) }
function setLineGen(g,max){ g=Math.max(0,Math.min(max,g)); if(U.lineGen===g) return; U.lineGen=(g>=(G.gen||0))?null:g; draw() }
function genFromX(x){ var t=document.querySelector('.gtrack'); if(!t) return; var max=+t.dataset.max, r=t.getBoundingClientRect(); if(r.width<=0) return;
  setLineGen(Math.round((x-r.left)/r.width*max),max) }
/* ---------- v4.16 (Nikita, 04.10: 'интерфейс — самая главная часть фидбека') ----------
   F-04 the sign + the full-screen "no free worlds" stop, F-05 new-generation panel, F-06 range line,
   F-08 speed unit, F-01/F-02 what a standing order does, F-03 idle-hull menus */
function freeWorlds(){ var out=[]; for(var i=0;i<PLANETS.length;i++){ var p=PLANETS[i]; if(!sectorOpen(G,p.sec)) continue; if(G.colonies[p.id]||(G.ghost&&G.ghost[p.id])) continue; out.push(p) } return out }
function speedTxt(hl){ return (hl.speed*driveSpeed(G)/(MS[1]/1000)).toFixed(2)+' '+T('speedUnit') }
function freeFor(cls,pid,gen){ var p=planet(pid), n=0; G.ships.forEach(function(s){ if(s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to)&&!s.pend&&!s.mutiny&&!s.retire&&!s.job&&shipClass(s)===cls&&p&&canReachSector(s,p.sec)&&(gen===undefined||gen===null||hullGen(s)===gen)) n++ }); return n }
function assignChips(s){
  var out=''; for(var k in G.colonies){ var c=G.colonies[k]; if(c.dark) continue; var p=planet(k); if(!p||!canReachSector(s,p.sec)) continue;
    if(G.reserves[k]<=0&&p.kind!=='works'&&pileLeft(G,k)<1) continue;
    out+='<button class="chip" type="button" data-act="assign" data-s="'+s.id+'" data-p="'+k+'"><b>\u2192 '+esc(pname(k))+'</b></button>' }
  return out?'<div class="dim" style="font-size:11px;margin-top:4px">'+T('assignTo')+'</div><div class="chips">'+out+'</div>':'';
}
function freeHullsBlock(p){
  var hs=assignable(p.id).filter(function(s){return !s.retire&&!s.pend});
  var body= hs.length ? hs.map(function(s){
    return '<div class="wrow free"><div><b>'+sico(HULLS[s.hull].key)+esc(hullName(HULLS[s.hull]))+' '+esc(fill(T('hullNo'),{n:s.id}))+'</b> <span class="dim">'+esc(fill(T('capacity'),{n:s.cap})+' \u00b7 '+speedTxt(HULLS[s.hull])+' \u00b7 '+fill(T('legDays'),{n:legDays(G,p.id,'earth',s)}))+'</span></div>'+
      '<button class="btn sm" type="button" data-act="assign" data-s="'+s.id+'" data-p="'+p.id+'">'+T('assignHere')+'</button></div>' }).join('')
    : '<div class="dim">'+T('freeNone')+'</div>';
  return themed(blk(T('freeHulls'),body,hs.length?'<span class="tag a">'+hs.length+'</span>':''),'sb sb-free');
}
function watchRings(){
  if(U.gk!==G){ U.gk=G; U.genSeen=G.gen||0; U.newGen=null; U.noFreeAt=null }
  if((G.gen||0)>U.genSeen){ U.genSeen=G.gen||0; U.newGen=G.gen||0 }
  if(U.pro.on||!proSee('survey')||G.over||!U.langPicked) return;
  if(!freeWorlds().length&&U.noFreeAt!==SECTORS.length&&!el('nofree')){ U.noFreeAt=SECTORS.length; showNoFree() }
}
function showNoFree(){
  var d=document.createElement('div'); d.id='nofree';
  d.innerHTML='<div class="nf-box"><h2>'+T('noFreeTitle')+'</h2><p>'+T('noFreeBody')+'</p><div class="nf-row"><button class="btn bigbtn" type="button" data-act="nofreego">'+T('noFreeGo')+'</button><button class="btn" type="button" data-act="nofreeclose">'+T('noFreeLater')+'</button></div></div>';
  document.body.appendChild(d); U.nfResume=!U.paused; U.paused=true; SFX.play('crit');
}
function closeNoFree(){ var d=el('nofree'); if(d&&d.parentNode) d.parentNode.removeChild(d); if(U.nfResume){ U.paused=false; U.nfResume=false } }
function drawSign(){
  var e=el('ringsign'); if(!e) return;
  if(U.pro.on||!proSee('survey')||!U.langPicked){ e.innerHTML=''; return }
  var nxt=secName(SECTORS.length), sok=canSurvey(G), need=K.SURVEY_REACH*SECTORS.length, free=freeWorlds(), lim=sectorLimit(G.gen||0);
  var line, cls='rs';
  if(sok==='ok'){ line=fill(T('ringSignGo'),{s:nxt}); cls+=' ok' }
  else if(sok==='settled') line=fill(T('ringSignSettled'),{r:settledCount(G),n:need});
  else { var w=shortWhy(surveyCost(SECTORS.length),G.earth); line=fill(MSG[U.lang][w[0]]||w[0],w[1]) }
  if(!free.length) cls+=' urgent';
  var beyond=free.filter(function(p){return p.sec>lim}).length, rng='';
  if(beyond) rng=fill(T('rangeWarn'),{g:roman(G.gen||0),n:lim+1,k:beyond});
  e.innerHTML='<button type="button" class="'+cls+'" data-act="gotosurvey"><b>'+esc(fill(T('ringSignTitle'),{s:nxt}))+'</b><span>'+esc(line)+'</span></button>'+
    (rng?'<div class="rs-range">'+esc(rng)+'</div>':'')+
    ((U.newGen!==null&&U.newGen!==undefined)?'<button type="button" class="ng blink" data-act="gotodock"><b>'+esc(fill(T('newGenTitle'),{g:roman(U.newGen)}))+'</b><span>'+esc(T('newGenBody'))+'</span></button>':'');
}
function draw(){proUpdate();voiceWatch();watchRings();drawHeader();drawMap();drawRes();drawLog();drawRail();drawDock();drawSign();drawAdvice();layoutPanels();drawOverlay();drawLang();drawIntro();drawCallout();drawPF()}
window.addEventListener('resize',function(){ layoutPanels() });
/* v4.17: the generation track is dragged with a pointer and survives the redraws (the pointer is tracked on the document) */
document.addEventListener('pointerdown',function(e){ var t=e.target.closest&&e.target.closest('.gtrack'); if(!t) return; U.gdrag=true; genFromX(e.clientX); e.preventDefault() });
document.addEventListener('pointermove',function(e){ if(U.gdrag) genFromX(e.clientX) });
document.addEventListener('pointerup',function(){ U.gdrag=false });
document.addEventListener('pointercancel',function(){ U.gdrag=false });

/* ---------- actions ---------- */
/* v4.14 (Nikita, run 398763448: 15 of 15 evacuations answered 'not at Earth'): the picked hull is only honoured while it is
   actually free at Earth and rated for the sector; otherwise the biggest free hull that can reach is taken */
function pick(pid){ var p=pid?planet(pid):null, s=U.pickShip!==null?shipById(G,U.pickShip):null;
  if(s&&s.mode==='idle'&&s.at==='earth'&&!s.mutiny&&(!p||canReachSector(s,p.sec))) return s.id;
  var list=freeHulls().filter(function(o){return !p||canReachSector(o,p.sec)}).sort(function(a,b){return b.cap-a.cap});
  return list.length?list[0].id:undefined }
function tgOn(id){var e=el(id);return e&&e.classList.contains('on')?1:0}
function num(id,d){var e=el(id);if(!e)return d;var v=parseInt(e.value,10);return isNaN(v)?d:Math.max(0,v)}

document.addEventListener('click',function(ev){
  if(MAPDRAGGED){ MAPDRAGGED=false; return }
  var hit=ev.target.closest?ev.target.closest('button,.pnode'):null;
  if(!railsAllow(ev)){ if(hit){ SFX.play('deny'); pressFx(ev.clientX,ev.clientY,'bad') } return }
  if(hit){
    if(hit.getAttribute('aria-disabled')==='true'){
      var wp=null; try{ wp=hit.dataset.whyp?JSON.parse(hit.dataset.whyp):null }catch(e){}
      pressFx(ev.clientX,ev.clientY,'bad'); say(hit.dataset.why||'off',wp);
      hit.classList.remove('shake'); void hit.offsetWidth; hit.classList.add('shake'); return }
    SFX.play(hit.classList.contains('tab')?'tab':'click'); pressFx(ev.clientX,ev.clientY);
  }
  var g=ev.target.closest?ev.target.closest('.pnode'):null;
  if(g){try{window.getSelection().removeAllRanges()}catch(e){} U.sel=g.dataset.p;U.tab='target';draw();return}
  var b=ev.target.closest?ev.target.closest('[data-act]'):null;
  if(b){
    var a=b.dataset.act, res=null, okc=null, okp=null;
    if(a==='build'){ var bh=HULLS[+b.dataset.h]; res=buildShip(G,+b.dataset.h); act(G,'build',{hull:bh.key,gen:bh.gen},res); okc='ok_build'; okp={n:G.nextShip-1,h:hullName(bh),y:bh.days} }
    else if(a==='drive'){ res=startDrive(G,b.dataset.p); act(G,'drive',{p:b.dataset.p,mark:(G.driveLvl||0)+1},res); okc='ok_drive'; okp={p:pname(b.dataset.p)} }
    else if(a==='colonize'){ var fsh=shipById(G,pick()); var np=fsh?foundParty(G,fsh,b.dataset.p):0; res=colonize(G,pick(),b.dataset.p,np,0); act(G,'colonize',{p:b.dataset.p,hull:pick(),people:np},res); okc='ok_found'; okp={p:pname(b.dataset.p),n:np} }
    else if(a==='kit'){ var kct=kitCost(G.colonies[b.dataset.p]||{}).tier; res=orderKit(G,b.dataset.p); act(G,'kit',{p:b.dataset.p,t:kct},res); okc='ok_kit'; okp={p:pname(b.dataset.p),t:roman(kct-1)} }
    else if(a==='route'){ if(U.pickShip===null) res='noPick'; else res=setLine(G,pick(),b.dataset.p,'earth'); act(G,'line',{p:b.dataset.p,hull:pick()},res);
      if(res==='ok'&&G.night){ var lsh=shipById(G,pick()); if(lsh&&legDays(G,b.dataset.p,'earth',lsh)*2>nightLeft(G)) voice('last_flight','role_captain',{hull:lsh.id},{force:true,seed:hash32(0x54,lsh.id),sub:fill(T('pfHull'),{n:lsh.id,k:(U.capt||{})[lsh.id]||1})}) } }
    else if(a==='survey'){ var nsec=secName(SECTORS.length); res=survey(G); act(G,'survey',{sector:SECTORS.length},res); okc='ok_survey'; okp={s:nsec} }
    else if(a==='ark'){ res=buildArk(G); act(G,'ark',{berths:G.ark.berths},res); okc='ok_ark'; okp={n:G.ark.berths} }
    else if(a==='nightok'){ G.nightSeen=true; el('intro').hidden=true; draw(); return }
    else if(a==='shiftok'){ var cb=el('shstop'); if(cb) U.shiftStop=cb.checked; G.shiftOpen=false; el('intro').hidden=true; U.paused=false; act(G,'shift_go',{stop:U.shiftStop}); draw(); return }
    else if(a==='scrap'){ res=scrap(G,+b.dataset.s); act(G,'scrap',{hull:+b.dataset.s},res); okc='ok_scrap' }
    else if(a==='scrapgen'){ res=scrapIdle(G,+b.dataset.g); act(G,'scrapgen',{gen:+b.dataset.g},res); okc='ok_scrap' }
    else if(a==='scrapmut'){ var nm=0; G.ships.slice().forEach(function(s){ if(s.mutiny&&s.mode==='idle'&&s.at==='earth'&&scrap(G,s.id)==='ok') nm++ }); res=nm?'ok':'noship'; act(G,'scrapmut',{n:nm},res); okc='ok_scrap' }
    else if(a==='intro'){ U.intro=false; U.start=!!U.fromStart; U.fromStart=false; draw(); return }
    else if(a==='prologue'){ U.start=false; U.intro=false; proStart(); draw(); return }
    else if(a==='want'){ var wn=parseInt(b.dataset.n,10), wpid=b.dataset.p, wcls=b.dataset.c, wbefore=lineCount(G,wpid,wcls), wg=(b.dataset.g!==undefined&&wn>wbefore)?parseInt(b.dataset.g,10):undefined;
      res=setWant(G,wpid,wcls,wn,wg); act(G,'want',{p:wpid,c:wcls,n:wn,g:wg},res); okc='ok_want'; okp={p:pname(wpid),n:wn,c:T(wcls)};
      /* v4.16 (F-01, F-02): say whether a free hull goes first or the yards build a new one — and for which world */
      if(res==='ok'&&wn>wbefore){ var wpin=lineGenPin(G,wpid,wcls), wneed=wn-wbefore-freeFor(wcls,wpid,wpin===null?undefined:wpin);
        if(wneed<=0) okc='ok_want_free';
        else { var wyc=yardCheck(G,wpid,wcls), whi=lineHull(G,wpid,wcls);
          if(wyc==='ok'){ okc='ok_want_build'; okp.k=wneed; okp.y=whi!==null?HULLS[whi].days:0 }
          else { okc='want_wait'; okp.w=T('lineWait_'+wyc) } } } }
    else if(a==='renew'){ res=setRenew(G,b.dataset.p,b.dataset.on==='1'); act(G,'renew',{p:b.dataset.p,on:b.dataset.on==='1'},res); okc=b.dataset.on==='1'?'ok_renew_on':'ok_renew_off' }
    else if(a==='onext'){ openNext(); draw(); return }
    else if(a==='oskip'){ openDone(); draw(); return }
    else if(a==='opening'){ openStart(); draw(); return }
    else if(a==='prodone'){ proEnd(); draw(); return }
    else if(a==='callok'){ U.pro.calls.shift(); draw(); return }
    else if(a==='pfok'){ U.pf=null; draw(); return }
    else if(a==='gnext'){ U.introStep++; drawIntro(); return }
    else if(a==='gback'){ U.introStep--; drawIntro(); return }
    else if(a==='gskip'){ U.intro=false; U.start=!!U.fromStart; U.fromStart=false; draw(); return }
    else if(a==='guide'){ U.fromStart=U.start; U.intro=true; U.start=false; U.introStep=0; drawIntro(); return }
    else if(a==='dismiss'){ dismiss(G,b.dataset.k); act(G,'dismiss',{k:b.dataset.k}); drawAdvice(); return }
    else if(a==='export'){ showLog(); return }
    else if(a==='texts'){ reloadTexts(); return }
    else if(a==='copylog'){ copyLog(); return }
    else if(a==='savelog'){ saveLog(); return }
    else if(a==='closelog'){ el('logbox').hidden=true; return }
    else if(a==='undismiss'){ undismissAll(G); drawAdvice(); return }
    else if(a==='go'){ U.sel=b.dataset.p; U.tab='target'; draw(); return }
    else if(a==='goearth'){ U.tab='earth'; draw(); return }
    else if(a==='unroute'){ res=clearLine(G,+b.dataset.s); act(G,'release',{hull:+b.dataset.s},res); okc='ok_release' }
    else if(a==='assign'){ res=setLine(G,+b.dataset.s,b.dataset.p,'earth'); act(G,'line',{p:b.dataset.p,hull:+b.dataset.s},res); okc='ok_assign'; okp={n:+b.dataset.s,p:pname(b.dataset.p)} }
    else if(a==='lefttab'){ U.leftTab=b.dataset.tab; U.advOpen=true; draw(); return }
    else if(a==='lgen'){ setLineGen(lineGenSel()+(+b.dataset.d),G.gen||0); return }
    else if(a==='gotosurvey'){ U.tab='earth'; draw(); return }
    else if(a==='gotodock'){ U.dockOpen=true; U.newGen=null; draw(); return }
    else if(a==='nofreego'){ closeNoFree(); U.tab='earth'; draw(); return }
    else if(a==='nofreeclose'){ closeNoFree(); draw(); return }
    else if(a==='repeat') res=repeatRun(G,+b.dataset.s);
    else if(a==='pickship'){ U.pickShip=+b.dataset.s; U.tab='target'; draw(); return }
    else if(a==='relief') res=relief(G,b.dataset.p);
    else if(a==='evac'){ var ec=pickCourier(b.dataset.p), epid=b.dataset.p, ecol=G.colonies[epid], eh=ec?ec.id:undefined; res=eh===undefined?'evacNoHull':abandon(G,eh,epid);
      if(res==='evacNoHull'){ var nh=nextHome(G,epid,'courier'); say('evacNoCourier',{p:pname(epid),w:nh?fill(T('evacW_wait'),{n:nh.id,l:nh.t}):T('evacW_orderC')}); act(G,'evacuate',{p:epid},res); draw(); return }
      if(res==='ok'&&ecol&&ec.cap<Math.floor(ecol.pop)){ act(G,'evacuate',{p:epid,hull:eh},res); say('ok_evac_short',{n:eh,p:pname(epid),c:ec.cap,l:Math.floor(ecol.pop)-ec.cap}); draw(); return } act(G,'evacuate',{p:b.dataset.p},res); okc='ok_evac'; okp={p:pname(b.dataset.p)} }
    else if(a==='punit'){ var ph=pick(b.dataset.p); res=ph===undefined?'nofree':punitive(G,ph,b.dataset.p) }
    else if(a==='search') res=search(G,pick(),+b.dataset.m);
    else if(a==='new'){var sv=el('seedin');start(sv?(parseInt(sv.value,10)||0):0);return}
    if(res) say(res==='ok'?(a==='route'?'policySet':(okc||'ok')):res, res==='ok'?okp:null);
    draw(); return;
  }
  var lb=ev.target.closest?ev.target.closest('[data-lang]'):null;
  if(lb){ U.lang=lb.dataset.lang; U.langPicked=true; U.introStep=0; openStart(); draw(); return }
  var zb=ev.target.closest?ev.target.closest('[data-zoom]'):null;
  if(zb){ var z=zb.dataset.zoom;
    if(z==='fit'){ VFIT=true; viewFit() } else viewZoom(z==='in'?0.75:1.35);
    drawMap(); return }
  if(ev.target.closest&&ev.target.closest('#advtog')){ U.advOpen=!U.advOpen; if(!U.advOpen) el('advisor').style.height=''; drawAdvice(); layoutPanels(); return }
  if(ev.target.closest&&ev.target.closest('#dockhd')){ U.dockOpen=!U.dockOpen; drawDock(); layoutPanels(); return }
  var sc=ev.target.closest?ev.target.closest('[data-ship]'):null;
  if(sc){ U.pickShip=+sc.dataset.ship; draw(); return }
  var md=ev.target.closest?ev.target.closest('[data-mode]'):null;
  if(md){ U.manual = md.dataset.mode==='manual'; draw(); return }
  var tg=ev.target.closest?ev.target.closest('[data-tog]'):null;
  if(tg){ tg.classList.toggle('on'); tg.setAttribute('aria-pressed',tg.classList.contains('on')); return }
  var t=ev.target.closest?ev.target.closest('.tab'):null;
  if(t){U.tab=t.dataset.tab;draw();return}
  if(ev.target.id==='b-pause'){U.paused=!U.paused;draw();return}
  if(ev.target.dataset&&ev.target.dataset.spd){U.speed=+ev.target.dataset.spd;U.paused=false;act(G,'speed',{x:U.speed});draw();return}
  if(ev.target.id==='b-auto'){U.ff=!U.ff;act(G,'ff',{on:U.ff});draw();return}
  if(ev.target.id==='b-lang'){U.lang=U.lang==='en'?'ru':'en';draw();return}
  if(ev.target.id==='b-sfx'){SFX.set(!SFX.isOn()); if(SFX.isOn()) SFX.play('ok'); drawHeader();return}
  if(ev.target.id==='b-logx'){U.logBig=!U.logBig;logSeen();return}
  if(ev.target.id==='b-logf'){U.logMode= U.logMode==='desk'?'all':(U.logMode==='all'?'chron':'desk');drawLog();return}
  if(ev.target.closest&&ev.target.closest('#btm')){logSeen();return}
});
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='INPUT') return;
  if(G.shiftOpen&&U.langPicked&&!U.opening&&!U.pro.on&&U.shiftStop&&(e.code==='Space'||e.key==='Enter')){ e.preventDefault(); var cb0=el('shstop'); if(cb0) U.shiftStop=cb0.checked; G.shiftOpen=false; el('intro').hidden=true; U.paused=false; draw(); return }
  if(U.opening&&U.langPicked){
    if(e.code==='Space'||e.key==='Enter'||e.key==='ArrowRight'){ e.preventDefault(); openNext(); draw() }
    else if(e.key==='Escape'){ e.preventDefault(); openDone(); draw() }
    return;
  }
  if(e.code==='Space'){e.preventDefault();U.paused=!U.paused;draw()}
  if(e.key==='1'){U.speed=1;U.paused=false;draw()}
  if(e.key==='2'){U.speed=2;U.paused=false;draw()}
  if(e.key==='3'){U.speed=4;U.paused=false;draw()}
  if(e.key==='4'){U.speed=10;U.paused=false;draw()}
});
document.addEventListener('keypress',function(e){
  var g=e.target.closest?e.target.closest('.pnode'):null;
  if(g&&(e.key==='Enter'||e.key===' ')){U.sel=g.dataset.p;U.tab='target';draw()}
});

el('btm').addEventListener('mouseenter',function(){ if(el('logbadge')&&!el('logbadge').hidden) logSeen() });

/* ---------- the map is pannable and zoomable ----------
   Auto-fit keeps the whole chart on screen; this is for when it gets crowded. */
(function(){
  var m=el('map'); if(!m) return;
  m.addEventListener('wheel',function(e){
    e.preventDefault();
    var pt=viewPt(e);
    viewZoom(e.deltaY>0?1.12:0.89, pt.x, pt.y);
    drawMap();
  },{passive:false});
  /* No setPointerCapture here. Capturing on the <svg> retargets the following
     click to the <svg> itself, so ev.target.closest('.pnode') found nothing and
     worlds stopped being clickable entirely (Nikita, 22.09: "не могу играть").
     The move and up listeners live on window instead, so a drag that leaves the
     map still ends cleanly. */
  var drag=null;
  m.addEventListener('pointerdown',function(e){
    if(e.button!==0) return;
    drag={x:e.clientX,y:e.clientY,vx:VIEW.x,vy:VIEW.y,moved:false,sc:viewPt(e).sc};
  });
  window.addEventListener('pointermove',function(e){
    if(!drag) return;
    var dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    if(!drag.moved&&Math.abs(dx)+Math.abs(dy)<5) return;
    drag.moved=true; m.classList.add('drag'); VFIT=false;
    VIEW.x=drag.vx-dx/drag.sc; VIEW.y=drag.vy-dy/drag.sc;
    drawMap();
  });
  function end(){ if(!drag) return; if(drag.moved) MAPDRAGGED=true; drag=null; m.classList.remove('drag') }
  window.addEventListener('pointerup',end);
  window.addEventListener('pointercancel',end);
})();

/* ---------- loop ---------- */
/* v4.2 (Nikita, 24.09: "игра слишком быстрая — сообщения не читаются"): the old clock ran a whole
   2900-year game in 11 real minutes at 3x. 1x is now a year every 1.5 s (a game is about an hour),
   10x is for the empty stretches. */
var MS={1:1500,2:750,4:375,10:150};
function frame(ts){
  if(!U.last) U.last=ts;
  var dt=ts-U.last; U.last=ts;
  if(!U.paused&&!G.over){
    U.acc+=dt;
    var step=MS[U.speed]||300, did=false;
    try{
      while(U.acc>=step){U.acc-=step;tick(G);did=true;
        /* v4.9 (Nikita, 27.09: 'остановка только на смене и при Ночи — железно'): nothing else stops the clock */
        if(G.shiftOpen){ if(U.pro.on||!U.shiftStop||U.ff) G.shiftOpen=false; else { U.paused=true; SFX.play('info'); break } }
        if(G.night&&!G.nightSeen&&!U.pro.on){ U.paused=true; SFX.play('crit'); break }
        if(G.pauseNow){ G.pauseNow=false; toastLast() }
        foodWatch();
        if(G.over)break}
      if(did) draw();
    }catch(e){
      // never let one bad tick kill the clock: pause, tell the player, keep the loop alive
      U.paused=true; U.acc=0;
      try{ log(G,'crash',{msg:String(e&&e.message||e),day:G.day}); act(G,'CRASH',{msg:String(e&&e.message||e)}); }catch(_){}
      try{ var tt=el('toast'); tt.textContent=fill(T('crashToast'),{msg:String(e&&e.message||e)}); tt.className='show bad'; }catch(_){}
      try{ draw() }catch(_){}
    }
  }
  requestAnimationFrame(frame);
}

function start(seed){
  G=newGame(seed||undefined);
  U.sel=null;U.tab='earth';U.paused=true;U.acc=0;U.intro=false;U.introStep=0;U.start=true;U.pro={on:false,stage:0,w:null,calls:[],seen:{}};U.hist=[];U.pf=null;U.voiceSeq=0;U.voiceLast=0;U.voy={};U.capt={};U.founded=0;
  VFIT=true; VSECS=-1; viewFit();
  window.LN=G; window.LNU=U; window.LNdraw=draw;   // dev hooks for the Playwright scenarios
  draw();
}
start();
requestAnimationFrame(frame);
})();
