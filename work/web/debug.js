/* DEBUG — the developer panel, built into every page (Nikita, 24.10: no separate god build; started from the main menu,
   button Test play — v4.43). Until LBdebug.on() nothing is on screen and no key is caught; window.GOD (the actions) is there always —
   the scenarios and the bot player call it. Open/close: the DEBUG tab bottom left or the ` key (Ё in the RU layout).
   Works only through the hooks LN/LNU/LNdraw/LNsave/LNload and the global functions of the core. Not game text: the panel
   speaks Russian, like the other developer tools. */
(function(){
if(window.LBdebug) return;
var G=function(){return window.LN}, U=function(){return window.LNU};
var KEY='lb.debug.slot.', ON=false, p=null, tab=null;
function draw(){ try{ window.LNdraw() }catch(e){ console.warn('debug draw',e) } }
function mark(what){ var g=G(); g.godUsed=(g.godUsed||0)+1; (g.godLog=g.godLog||[]).push(g.day+': '+what); if(g.godLog.length>200) g.godLog.shift() }
function say(t){ var o=document.getElementById('god-msg'); if(o) o.textContent=t }
function pause(){ U().paused=true }

/* ---- actions ---- */
var A={
  skip:function(n){ var g=G(), t0=g.day, t=performance.now();
    for(var i=0;i<n&&!g.over;i++){ tick(g); g.pauseNow=false; g.shiftOpen=false; if(performance.now()-t>8000){ say('прервано по времени на году '+g.day); break } }
    mark('skip '+(g.day-t0)+'y'); pause(); draw(); say('год '+g.day) },
  toNight:function(left){ var g=G(); if(!g.night){ say('Ночь не датирована — сначала «открыть Ночь»'); return }
    var n=g.night-left-g.day; if(n<=0){ say('уже позже'); return } A.skip(n) },
  res:function(k,n){ var g=G(); g.earth[k]+=n; mark(k+' +'+n); draw() },
  maxAll:function(){ var E=G().earth; E.metal=E.food=E.fuel=E.parts=50000; E.people=Math.max(E.people,3000); mark('max'); draw() },
  safe:function(){ var g=G(); g.safe=!g.safe; mark('safe '+g.safe); say('safe (корабли не пропадают): '+g.safe) },
  night:function(){ revealNight(G()); mark('reveal night'); draw() },
  nightIn:function(n){ var g=G(); if(!g.night) revealNight(g); g.night=g.day+n; mark('night in '+n); draw() },
  drive:function(){ var g=G(); g.driveLvl=(g.driveLvl||0)+1; g.gen=g.driveLvl; ensureGen(g.gen); while(SECTORS.length<Math.min(sectorLimit(g.gen),SECTORS.length+2)) openSector(g); mark('drive '+g.driveLvl); draw() },
  chart:function(){ openSector(G()); mark('chart'); draw() },
  arkReady:function(){ var g=G(); if(!g.night) revealNight(g); g.driveLvl=g.arkMark; g.gen=g.driveLvl; ensureGen(g.gen); mark('ark ready'); draw() },
  hull:function(i){ var g=G(), h=HULLS[i]; if(!h) return;
    var s={id:g.nextShip++,hull:i,cap:h.cap,gen:h.gen,crew:h.crew||0,mode:'idle',t:0,at:'earth',target:null,route:null,auto:true,
      cargo:{metal:0,food:0,fuel:0,parts:0,people:0},out:{metal:0,food:0,parts:0,people:0},take:{metal:0,food:0,fuel:0,parts:0},missDays:0,bearing:null,job:null};
    g.ships.push(s); mark('free hull '+h.key+' #'+s.id); draw(); return s },
  settle:function(){ var g=G(), pid=U().win; if(!pid||!planet(pid)){ say('открой мир на карте'); return }
    if(g.colonies[pid]){ say('уже заселён'); return }
    var gen=g.gen||0, i=HULLS.map(function(h,j){return j}).filter(function(j){return HULLS[j].gen===gen&&HULLS[j].key==='courier'})[0]; if(i===undefined) i=0;
    var s=A.hull(i); var r=colonize(g,s.id,pid,26,0); mark('settle '+pid+' → '+r); say('settle '+pid+': '+r+' (дальше — промотай время)'); draw() },
  fill:function(){ var g=G(), pid=U().win; if(!pid||!g.colonies[pid]){ say('открой заселённый мир'); return }
    g.reserves[pid]=1e7; g.colonies[pid].dry=false; mark('fill reserve '+pid); draw() },
  event:function(){ var g=G(); if(!g.dir) g.dir={next:0,ev:[],n:0,seq:1}; g.dir.next=g.day; mark('director now'); say('режиссёр: событие со следующего года') },
  noPro:function(){ var u=U(), g=G(); u.voiceSeq=g.logSeq||0; u.notes=[]; u.shiftStop=false; if(window.LNtut) window.LNtut.off(); draw(); say('окна событий сброшены, смены без остановки, обучение и голоса выключены') },
  inf:null,
  infToggle:function(){ if(A.inf){ clearInterval(A.inf); A.inf=null; say('∞ Земля: выкл') } else { A.inf=setInterval(function(){ var E=G().earth; ['metal','food','fuel','parts'].forEach(function(k){ if(E[k]<20000) E[k]=20000 }) },200); say('∞ Земля: вкл (ресурсы ≥20000)') } },
  save:function(slot){ try{ localStorage.setItem(KEY+slot,window.LNsave()); say('слот '+slot+' записан (год '+G().day+')') }catch(e){ say('не влезло в localStorage — ≡ Save в файл') } },
  load:function(slot){ var t=null; try{ t=localStorage.getItem(KEY+slot) }catch(e){} if(!t){ say('слот '+slot+' пуст'); return } window.LNload(t); say('слот '+slot+' загружен (год '+G().day+')') }
};
window.GOD=A;

/* ---- the panel: built on the first LBdebug.on() ---- */
var css='#god{position:fixed;right:8px;bottom:8px;z-index:99999;width:296px;max-height:92vh;overflow:auto;background:#14100fee;color:#e8e0d0;font:11px/1.35 ui-monospace,Consolas,monospace;border:1px solid #c0392b;padding:8px;display:none}'
 +'#god.on{display:block}#god h4{margin:8px 0 3px;font-size:10px;letter-spacing:.12em;color:#c0392b;font-weight:700}#god h4:first-child{margin-top:0}'
 +'#god button{font:inherit;color:inherit;background:#2a2321;border:1px solid #5a4a45;padding:2px 6px;margin:1px 1px 1px 0;cursor:pointer}#god button:hover{background:#c0392b;color:#fff}'
 +'#god-tab{position:fixed;left:6px;bottom:6px;z-index:99998;font:700 10px ui-monospace,Consolas,monospace;color:#fff;background:#c0392b;border:0;padding:3px 7px;opacity:.55;cursor:pointer}#god-tab:hover{opacity:1}'
 +'#god-st{color:#9a8f85;white-space:pre-wrap;margin:2px 0;min-height:6.75em}#god-msg{color:#f1c40f;min-height:13px}';
var b=function(label,fn,title){ return '<button type="button" data-g="'+fn+'"'+(title?' title="'+title+'"':'')+'>'+label+'</button>' };
function build(){
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  p=document.createElement('div'); p.id='god';
  p.innerHTML='<div style="color:#c0392b;font-weight:700">DEBUG <span style="float:right;cursor:pointer" data-g="close">×</span></div><div id="god-st"></div><div id="god-msg"></div>'
   +'<h4>ВРЕМЯ</h4>'+b('+1','skip:1')+b('+10','skip:10')+b('+50','skip:50')+b('+100','skip:100')+b('+500','skip:500')+b('+1000','skip:1000')+b('до Ночи −400','toNight:400')+b('−150','toNight:150')+b('−10','toNight:10')
   +'<h4>ЗЕМЛЯ</h4>'+b('металл +2k','res:metal:2000')+b('еда +2k','res:food:2000')+b('топл +2k','res:fuel:2000')+b('детали +500','res:parts:500')+b('люди +300','res:people:300')+b('всё 50k','maxAll')+b('∞ вкл/выкл','infToggle')+b('safe вкл/выкл','safe','корабли не пропадают, не гибнут')
   +'<h4>ПРОГРЕСС</h4>'+b('открыть Ночь','night')+b('Ночь через 300','nightIn:300')+b('Ночь через 30','nightIn:30')+b('+метка привода','drive')+b('+сектор','chart')+b('ковчег-гейт готов','arkReady')+b('режиссёр сейчас','event')+b('без обучения и окон','noPro')
   +'<h4>МИРЫ (открытый на карте)</h4>'+b('заселить','settle','бесплатный курьер + colonize')+b('залежь ∞','fill')
   +'<h4>КОРАБЛИ (свободные, на Земле)</h4><div id="god-hulls"></div>'
   +'<h4>СЛОТЫ (в этом браузере; файл — ≡ Save/Load)</h4>'+['1','2','3'].map(function(s){ return b('save '+s,'save:'+s)+b('load '+s,'load:'+s) }).join('<br>');
  document.body.appendChild(p);
  tab=document.createElement('button'); tab.type='button'; tab.id='god-tab'; tab.textContent='DEBUG'; document.body.appendChild(tab);
  tab.addEventListener('click',function(e){ e.stopPropagation(); toggle() });
  document.addEventListener('keydown',function(e){ if(!ON||(e.target&&e.target.tagName==='INPUT')) return; if(e.key==='`'||e.key==='ё'||e.key==='Ё'||e.code==='Backquote'){ e.preventDefault(); toggle() } },true);
  p.addEventListener('click',function(e){ e.stopPropagation(); var t=e.target.closest('[data-g]'); if(!t) return;
    var a=t.getAttribute('data-g').split(':'), f=a[0];
    if(f==='close') return toggle();
    if(f==='hull') return A.hull(+a[1]);
    var args=a.slice(1).map(function(x){ return /^-?\d+$/.test(x)?+x:x });
    try{ A[f].apply(null,args) }catch(err){ say('ошибка: '+err.message); console.error(err) }
    refresh() });
  p.addEventListener('pointerdown',function(e){ e.stopPropagation() },true);
  setInterval(refresh,500) }
function toggle(){ p.classList.toggle('on'); refresh() }
function refresh(){ if(!p||!p.classList.contains('on')) return; var g=G(); if(!g) return;
  var s; try{ s=snap(g) }catch(e){ s={} }
  document.getElementById('god-st').textContent='год '+g.day+' · seed '+g.seed+(g.night?' · Ночь '+g.night:'')+(g.safe?' · SAFE':'')+(A.inf?' · ∞':'')+'\nлюди '+s.people+' еда '+s.food+' мет '+s.metal+' топл '+s.fuel+' дет '+s.parts+'\nколоний '+s.cols+' кораблей '+s.ships+' gen '+(g.gen||0)+' метка '+(g.driveLvl||0)+(g.over?'\nКОНЕЦ: '+g.over:'')+(U().win?'\nокно: '+U().win:'');
  var hs='', gen=g.gen||0; HULLS.forEach(function(h,i){ if(h.gen>=gen-1&&h.gen<=gen) hs+=b(h.key+' g'+h.gen,'hull:'+i) }); document.getElementById('god-hulls').innerHTML=hs }

window.LBdebug={
  on:function(open){ if(!p) build(); ON=true; tab.hidden=false; if(open&&!p.classList.contains('on')) toggle() },
  isOn:function(){ return ON }
};
})();
