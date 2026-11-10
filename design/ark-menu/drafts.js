/* Черновики окна ковчега под капсулы (Никита 10.11: капсулы поштучно, цена ступенями, за еду + немного металла, паёк в цене).
   Это НЕ код игры: разметка вставляется в настоящую страницу поверх окна Ark (design/ark-menu/shots.js) — её стили, шрифты и значки.
   Числа — пример: год 2900, Ночь 3802, на борт идут 5 482, капсул куплено 3 400, двигатель Gen V («долетят 75%» — по поколению, не решено).
   Лестница 2 (design/ARK.md §2в): за капсулу по тысячам — еда 2/3/4/5/7/10/14/20, металл 1/2/3/5/8/12/18/27. */
(function(){
  var FOOD=[2,3,4,5,7,10,14,20], MET=[1,2,3,5,8,12,18,27], BOUGHT=3400, ABOARD=5482, WORLDS=640, CROSS=0.75;
  var num=function(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ') };
  var IC={}; function grab(){ [].forEach.call(document.querySelectorAll('svg.ic'),function(s){ var m=/color:\s*(#[0-9A-Fa-f]{6})/.exec(s.getAttribute('style')||''); if(m&&!IC[m[1].toUpperCase()]) IC[m[1].toUpperCase()]=s.outerHTML }) }
  var COL={metal:'#C9CFD6',food:'#3DDC84',fuel:'#FF8A1F',parts:'#5B82F0',people:'#FFD23F'};
  function ic(k,sz){ var h=IC[COL[k]]||''; return h.replace(/width="\d+"/,'width="'+sz+'"').replace(/height="\d+"/,'height="'+sz+'"') }
  function pr(k,n,short){ return '<span class="pr'+(short?' short':'')+'">'+ic(k,12)+num(n)+'</span>' }
  function cost(from,to){ var f=0,m=0; for(var i=0;i<8;i++){ var lo=i*1000, hi=i===7?1e9:(i+1)*1000, k=Math.max(0,Math.min(to,hi)-Math.max(from,lo)); f+=k*FOOD[i]; m+=k*MET[i] } return {food:f,metal:m} }
  var wake=Math.floor(Math.min(BOUGHT,ABOARD)*CROSS), lost=Math.min(BOUGHT,ABOARD)-wake, sleep=ABOARD-Math.min(BOUGHT,ABOARD);

  var css=
  '.am{display:flex;flex-direction:column;gap:16px}'+
  '.am small,.am .lab2{font:500 11px var(--h);letter-spacing:.14em;color:var(--mid);text-transform:uppercase}'+
  '.am-eq{display:flex;align-items:stretch;border:1px solid var(--ln)}'+
  '.am-c{flex:1;padding:12px 16px 13px;display:flex;flex-direction:column;gap:3px;min-width:0}'+
  '.am-c b{font:500 34px/1.05 var(--n);letter-spacing:-.02em;white-space:nowrap}'+
  '.am-c i{font:normal 12.5px var(--h);color:var(--mid);white-space:nowrap}'+
  '.am-op{display:flex;align-items:center;font:400 24px var(--n);color:var(--dim)}'+
  '.am-c.res{flex:1.25;background:rgba(61,220,132,.09);border-left:1px solid var(--food)}'+
  '.am-lad{position:relative;display:flex;align-items:flex-end;gap:3px;height:128px;padding-top:22px}'+
  '.am-st{flex:1;position:relative;border:1px solid var(--dim);border-bottom:2px solid var(--mid);background:var(--pan2)}'+
  '.am-st u{position:absolute;left:0;top:0;bottom:0;background:var(--ark);opacity:.85}'+
  '.am-st em{position:absolute;left:0;right:0;top:-19px;text-align:center;font:500 12px var(--n);font-style:normal;color:var(--mid);background:var(--pan);z-index:2}'+
  '.am-st.now{border-color:var(--ark)}.am-st.now em{color:var(--ink)}'+
  '.am-mk{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed;pointer-events:none}'+
  '.am-mk span{position:absolute;top:-2px;left:6px;font:500 11px var(--h);letter-spacing:.1em;white-space:nowrap;text-transform:uppercase}'+
  '.am-ax{display:flex;gap:3px}.am-ax>div{flex:1;padding-top:6px}.am-ax .prow{justify-content:center;gap:9px;flex-wrap:nowrap}'+
  '.am-buy{display:flex;gap:10px}'+
  '.am-b{flex:1;border:1px solid var(--mid);padding:10px 14px 11px;display:flex;flex-direction:column;gap:6px;background:var(--pan)}'+
  '.am-b.pri{background:var(--ink);border-color:var(--ink);color:#000}.am-b.pri .pr{color:#000}.am-b.pri .pr svg{filter:brightness(.45)}.am-b.pri .am-rt{color:#0A6B33}'+
  '.am-b.off{border-style:dashed;border-color:var(--dim);color:var(--dim)}'+
  '.am-b>b{font:600 15px var(--h);letter-spacing:.1em;text-transform:uppercase}'+
  '.am-rt{font:500 12px var(--h);color:var(--food)}.am-rt.bad{color:var(--red)}'+
  '.am-two{display:flex;gap:22px}.am-two>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}'+
  '.am-fate{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--red);padding:12px 18px}'+
  '.am-fate b{font:700 20px var(--h);letter-spacing:.08em;color:var(--red);text-transform:uppercase}.am-fate i{font:normal 12.5px var(--h);color:var(--mid)}'+
  /* B */
  '.am-hold{display:flex;flex-direction:column;gap:5px}'+
  '.am-row{display:flex;align-items:center;gap:10px}'+
  '.am-row>span{width:48px;text-align:right;font:400 11px var(--n);color:var(--dim)}'+
  '.am-cells{display:flex;gap:4px}'+
  '.am-cells i{width:40px;height:30px;border:1px solid var(--dim);box-sizing:border-box}'+
  '.am-cells i.on{background:var(--ark);border-color:var(--ark)}'+
  '.am-cells i.sel{background:rgba(180,140,255,.28);border-color:var(--ark)}'+
  '.am-cells i.cur{outline:2px solid var(--ink);outline-offset:1px}'+
  '.am-cells i.none{border-style:dotted;border-color:#3a3a40}'+
  '.am-row .prow{gap:8px;min-width:96px}'+
  '.am-row.now .prow .pr{color:var(--ink)}'+
  '.am-big{display:flex;gap:0;border:1px solid var(--ln)}.am-big>div{flex:1;padding:11px 14px;display:flex;flex-direction:column;gap:3px}'+
  '.am-big b{font:500 30px/1.05 var(--n);letter-spacing:-.02em}.am-big i{font:normal 12px var(--h);color:var(--mid)}'+
  '.am-pick{border:1px solid var(--ark);padding:12px 14px;display:flex;flex-direction:column;gap:8px}'+
  '.am-pick h4{margin:0;font:600 15px var(--h);letter-spacing:.1em;text-transform:uppercase}'+
  '.am-line{display:flex;justify-content:space-between;align-items:center;font:400 13px var(--h);color:var(--mid)}.am-line b{font:500 13.5px var(--n);color:var(--ink)}'+
  '.am-go{background:var(--ink);color:#000;text-align:center;padding:9px;font:600 14px var(--h);letter-spacing:.12em;text-transform:uppercase}'+
  '.am-alt{display:flex;justify-content:space-between;align-items:center;gap:10px;font:400 12.5px var(--h);color:var(--mid);border-top:1px solid var(--ln);padding-top:7px}'+
  '.am-top{position:absolute;left:622px;top:9px;display:flex;flex-direction:column;gap:1px;font:500 11px var(--h);letter-spacing:.12em;text-transform:uppercase;color:var(--mid);white-space:nowrap}'+
  '.am-top b{font:500 19px var(--n);letter-spacing:-.01em}';

  function convoy(){ var cv=document.querySelector('#ovl .cv'); var sec=cv&&cv.previousElementSibling; return (sec?sec.outerHTML:'')+(cv?cv.outerHTML:'') }   // настоящие карточки конвоя из окна игры
  function fate(){ return '<div class="am-fate"><div><b>The ark stays</b><br><i>The convoy is short: 1 × Hauler.</i></div><div class="prow" style="gap:14px"><span class="lab2">if the Night came today</span></div></div>' }
  function drive(){ return '<div class="rw"><span>Ark drive</span><b style="color:var(--food)">Gen V · ready</b></div><div class="rw"><span>Crossing</span><b>75%</b></div><div class="rw"><span>With gen VI</span><b style="color:var(--ark)">90%</b></div>' }
  function night(){ return '<div class="sec"><span>The Night</span></div><div class="hero" style="color:#FF2A1A">3802<span>902 years</span></div>' }
  function top(){ return '<div class="am-top" id="amtop"><span>Wake · sleep on</span><span><b style="color:var(--food)">'+num(wake)+'</b> <b style="color:var(--dim)">·</b> <b style="color:var(--ark)">'+num(sleep)+'</b></span></div>' }

  /* A — «уравнение и лестница»: счёт одной строкой, цена — ступенями, покупка — прибавками */
  function A(){ grab();
    var h='<div class="am">';
    h+='<div class="am-eq">'+
      '<div class="am-c"><small>Pods</small><b style="color:var(--ark)">'+num(BOUGHT)+'</b><i>next one: '+pr('food',FOOD[3])+' '+pr('metal',MET[3])+'</i></div><div class="am-op">/</div>'+
      '<div class="am-c"><small>Aboard</small><b style="color:var(--ppl)">'+num(ABOARD)+'</b><i>+'+num(WORLDS)+' still on worlds</i></div><div class="am-op">×</div>'+
      '<div class="am-c"><small>Crossing</small><b>75%</b><i>Gen V drive · VI gives 90%</i></div><div class="am-op">=</div>'+
      '<div class="am-c res"><small>Wake</small><b style="color:var(--food)">'+num(wake)+'</b><i>'+num(sleep)+' sleep on · '+num(lost)+' lost in the crossing</i></div></div>';
    // лестница: высота ступени = цена капсулы (еда + металл)
    h+='<div><div class="sec"><span>Pod price</span><span>one step — 1 000 pods</span></div><div class="am-lad">';
    for(var i=0;i<8;i++){ var p=FOOD[i]+MET[i], ht=Math.round(10+p*1.95), lo=i*1000, fill=Math.max(0,Math.min(1,(BOUGHT-lo)/1000));
      h+='<div class="am-st'+(i===3?' now':'')+'" style="height:'+ht+'px">'+(fill>0?'<u style="width:'+Math.round(fill*100)+'%"></u>':'')+'<em>'+(i===7?'7 001+':num(lo+1)+'–'+num(lo+1000))+'</em></div>' }
    h+='<div class="am-mk" style="left:'+(BOUGHT/8000*100).toFixed(2)+'%;border-color:var(--ark);color:var(--ark)"><span>bought '+num(BOUGHT)+'</span></div>'+
       '<div class="am-mk" style="left:'+(ABOARD/8000*100).toFixed(2)+'%;border-color:var(--ppl);color:var(--ppl)"><span>aboard '+num(ABOARD)+'</span></div></div><div class="am-ax">';
    for(i=0;i<8;i++) h+='<div><div class="prow">'+pr('food',FOOD[i])+pr('metal',MET[i])+'</div></div>';
    h+='</div></div>';
    var c1=cost(BOUGHT,BOUGHT+100), c2=cost(BOUGHT,BOUGHT+1000), c3=cost(BOUGHT,ABOARD);
    h+='<div class="am-buy">'+
      '<div class="am-b pri"><b>+100 pods</b><div class="prow">'+pr('food',c1.food)+pr('metal',c1.metal)+'</div><span class="am-rt">rations last to the Night</span></div>'+
      '<div class="am-b"><b>+1 000 pods</b><div class="prow">'+pr('food',c2.food)+pr('metal',c2.metal)+'</div><span class="am-rt bad">rations end ≈ 3 610 · 192 years before the Night</span></div>'+
      '<div class="am-b off"><b>Everyone aboard · +'+num(ABOARD-BOUGHT)+'</b><div class="prow">'+pr('food',c3.food,true)+pr('metal',c3.metal)+'</div><span class="am-rt bad">620 rations short</span></div></div>';
    h+='<div>'+convoy()+'</div>'+fate();
    return h+'</div>' }

  /* B — «трюм»: каждый квадрат — 100 человек, ряд — ступень цены; покупка — «довести до» */
  function B(){ grab();
    var cells=Math.ceil(ABOARD/100), on=BOUGHT/100, sel=40, h='<div class="am"><div class="am-two"><div style="flex:1.55">';
    h+='<div class="sec"><span>The hold · one square — 100 people</span><span>pod price</span></div><div class="am-hold">';
    for(var r=0;r<6;r++){ h+='<div class="am-row'+(r===3?' now':'')+'"><span>'+num((r+1)*1000)+'</span><div class="am-cells">';
      for(var c=0;c<10;c++){ var k=r*10+c; h+='<i class="'+(k<on?'on':k<sel?'sel':k<cells?'':'none')+(k===sel-1?' cur':'')+'"></i>' }
      h+='</div><div class="prow">'+pr('food',FOOD[r])+pr('metal',MET[r])+'</div></div>' }
    h+='</div><div class="am-line" style="margin-top:4px"><span><i style="display:inline-block;width:12px;height:10px;background:var(--ark);margin-right:6px"></i>pod bought &nbsp;&nbsp; <i style="display:inline-block;width:12px;height:10px;border:1px solid var(--dim);box-sizing:border-box;margin-right:6px"></i>no pod: sleeps on &nbsp;&nbsp; <i style="display:inline-block;width:12px;height:10px;border:1px dotted #3a3a40;box-sizing:border-box;margin-right:6px"></i>nobody yet</span><span>+'+num(WORLDS)+' still on worlds</span></div>';
    h+='</div><div>';
    h+='<div class="am-big"><div style="background:rgba(61,220,132,.09)"><small>Wake</small><b style="color:var(--food)">'+num(wake)+'</b><i>of '+num(ABOARD)+' aboard</i></div><div><small>Sleep on</small><b style="color:var(--ark)">'+num(sleep)+'</b><i>no pod</i></div><div><small>Lost</small><b style="color:var(--mid)">'+num(lost)+'</b><i>crossing 75% · Gen VI: 90%</i></div></div>';
    var c=cost(BOUGHT,sel*100), c5=cost(BOUGHT,5000), ca=cost(BOUGHT,ABOARD);
    h+='<div class="am-pick"><h4>Fill to '+num(sel*100)+'</h4>'+
      '<div class="am-line"><span>Pods</span><b>+'+num(sel*100-BOUGHT)+'</b></div>'+
      '<div class="am-line"><span>Price</span><div class="prow">'+pr('food',c.food)+pr('metal',c.metal)+'</div></div>'+
      '<div class="am-line"><span>Wake</span><b style="color:var(--food)">'+num(wake)+' → '+num(Math.floor(sel*100*CROSS))+'</b></div>'+
      '<div class="am-line"><span>Rations after</span><b style="color:var(--food)">last to the Night</b></div>'+
      '<div class="am-go">Buy '+num(sel*100-BOUGHT)+' pods</div>'+
      '<div class="am-alt"><span>to 5 000</span><div class="prow">'+pr('food',c5.food)+pr('metal',c5.metal)+'</div><span class="am-rt bad">rations end ≈ 3 520</span></div>'+
      '<div class="am-alt"><span>everyone</span><div class="prow">'+pr('food',ca.food,true)+pr('metal',ca.metal)+'</div><span class="am-rt bad">620 rations short</span></div></div>';
    h+='</div></div>';
    h+='<div>'+convoy()+'</div>'+fate();
    return h+'</div>' }

  window.ARKDRAFT={css:css,A:A,B:B,top:top};
})();
