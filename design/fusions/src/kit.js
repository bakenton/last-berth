/* LAST BERTH fusions — общий набор: случайность по сиду, имена из игры, суда, шапка, голос Александры, звук. */
var LB=(function(){
  var q=new URLSearchParams(location.search);
  var seed=+q.get('seed')||(Date.now()%1e9);
  function rng(s){ s=s>>>0||1; var f=function(){ s=(s+0x6D2B79F5)>>>0; var t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296 };
    f.int=function(a,b){ return a+Math.floor(f()*(b-a+1)) }; f.pick=function(a){ return a[Math.floor(f()*a.length)] };
    f.shuffle=function(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(f()*(i+1)),x=a[i]; a[i]=a[j]; a[j]=x } return a }; return f }
  /* миры — W_NAMES из work/core.js */
  var WORLDS=['Tallow','Brine','Cinder','Marrow','Solace','Vesper','Gallows','Ferrous','Hollow','Threnody','Kiln','Lantern','Tinder','Ossuary','Harrow','Wick','Pale','Grist','Anvil','Vigil','Loam','Sallow','Cairn','Ember'];
  var PEOPLE=['Ана Ковач','Илья Марен','Това Рейн','Сол Данек','Мира Осс','Лев Тарн','Юна Векс','Руслан Гай','Эда Морн','Киран Лод','Нея Сарт','Павел Хорн','Ида Брант','Оскар Вил','Зоя Кейн','Тимур Ренд','Лина Фосс','Арно Тель','Вера Нойс','Давид Ург'];
  /* суда: число граней по классу, жёлтый нос (символы work/web/shell.html, v4.44) */
  var COL={courier:'#45D4E8',hauler:'#FF6FB5',freighter:'#F2F1EC'};
  var SHIP={courier:['48,20 16,29.07 16,10.93','48,20 38.4,22.72 38.4,17.28'],hauler:['58.67,20 32,35.11 5.33,20 32,4.89','58.67,20 42.67,29.07 42.67,10.93'],freighter:['64,20 41.6,38.13 16,38.13 0,20 16,1.87 41.6,1.87','64,20 44.8,35.54 44.8,4.46']};
  function ship(cls,w){ w=w||32; return '<svg viewBox="0 0 64 40" width="'+w+'" height="'+(w*40/64).toFixed(1)+'" aria-hidden="true"><polygon points="'+SHIP[cls][0]+'" fill="'+COL[cls]+'"/><polygon points="'+SHIP[cls][1]+'" fill="#FFD23F"/></svg>' }
  function fmt(n){ n=Math.round(n); var a=Math.abs(n); if(a>=1e9) return (n/1e9).toFixed(1)+'G'; if(a>=1e6) return (n/1e6).toFixed(1)+'M'; if(a>=1e4) return (n/1e3).toFixed(1)+'k'; return String(n) }
  function el(html){ var d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild }
  function esc(s){ return String(s).replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c] }) }

  /* окно: modal(html,[{t:'Текст',cls:'pri',fn:...}]) — кнопка закрывает окно и зовёт fn */
  function modal(html,btns,opts){ opts=opts||{}; var v=el('<div class="lb-veil"><div class="lb-modal">'+html+'<div class="row"></div></div></div>'); var row=v.querySelector('.row');
    (btns&&btns.length?btns:[{t:'Понятно',cls:'pri'}]).forEach(function(b){ var x=document.createElement('button'); x.className='btn '+(b.cls||''); x.textContent=b.t; if(b.off) x.disabled=true; x.onclick=function(){ v.remove(); if(b.fn) b.fn() }; row.appendChild(x) });
    if(opts.tapOut) v.addEventListener('pointerdown',function(e){ if(e.target===v) v.remove() });
    document.body.appendChild(v); return v }

  /* голос Александры: без портрета (операторский макет в игру и прототипы не встраивается); гаснет сам или по нажатию */
  var vT=0;
  function voice(text,ms){ var o=document.getElementById('lb-voice'); if(o) o.remove(); clearTimeout(vT); if(!text) return;
    var v=el('<div id="lb-voice"><small>АЛЕКСАНДРА</small>'+esc(text)+'</div>'); v.onclick=function(){ v.remove() }; document.body.appendChild(v); vT=setTimeout(function(){ v.remove() },ms||7000) }
  var tT=0;
  function toast(text,ms){ var o=document.getElementById('lb-toast'); if(o) o.remove(); clearTimeout(tT); var v=el('<div id="lb-toast">'+esc(text)+'</div>'); document.body.appendChild(v); tT=setTimeout(function(){ v.remove() },ms||1800) }

  /* звук: короткие сигналы, по нажатию ♪ в шапке */
  var ac=null, mute=true;
  function beep(f,d,type,vol){ if(mute) return; try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); var o=ac.createOscillator(),g=ac.createGain(); o.type=type||'square'; o.frequency.value=f||440; g.gain.value=vol||.03; g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+(d||.08)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||.08)) }catch(e){} }

  /* шапка: shell({title:'LAST BERTH',ref:'MINI METRO',help:'<h2>…</h2>…',onRestart:fn}) → вернёт #lb-stage. Подсказка при первом входе (не при ?auto=1) */
  function shell(o){ var top=el('<div id="lb-top"><a href="index.html" title="Все варианты" aria-label="Все варианты">‹</a><div class="t">LAST BERTH <em>× '+esc(o.ref)+'</em></div><div class="sp"></div><button id="lb-snd" title="Звук" aria-label="Звук">♪</button><button id="lb-help" title="Как играть" aria-label="Как играть">?</button><button id="lb-re" title="Заново" aria-label="Заново">↻</button></div>');
    document.body.appendChild(top); var st=el('<div id="lb-stage"></div>'); document.body.appendChild(st);
    var help=function(cb){ modal(o.help,[{t:'Играть',cls:'pri',fn:cb}]) };
    top.querySelector('#lb-help').onclick=function(){ if(o.onPause) o.onPause(true); help(function(){ if(o.onPause) o.onPause(false) }) };
    top.querySelector('#lb-re').onclick=function(){ if(o.onRestart) o.onRestart(); else location.reload() };
    var s=top.querySelector('#lb-snd'); s.style.opacity=.4; s.onclick=function(){ mute=!mute; s.style.opacity=mute?.4:1; beep(660,.06) };
    if(!q.get('auto')){ if(o.onPause) o.onPause(true); help(function(){ if(o.onPause) o.onPause(false); if(o.onStart) o.onStart() }) } else if(o.onStart) o.onStart();
    return st }
  return {seed:seed,q:q,rng:rng,WORLDS:WORLDS,PEOPLE:PEOPLE,COL:COL,ship:ship,fmt:fmt,el:el,esc:esc,modal:modal,voice:voice,toast:toast,beep:beep,shell:shell};
})();
