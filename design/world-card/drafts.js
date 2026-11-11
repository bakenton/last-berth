/* Черновики карточки мира (фидбек Никиты 11.11, пп. 4, 5, 8, 9, 10). Это НЕ код игры: разметка вставляется в настоящую страницу
   поверх открытого окна мира (design/world-card/shots.js) — её стили, шрифты и значки; числа считает ядро этой партии.
   A — пакет улучшения отдельной карточкой: прирост крупно, добавочный расход строкой, полоска ярусов.
   B — прирост прямо в строках «ест» и «даёт» (столбец «с пакетом»), под ними — короткая строка пакета с ценой и кнопкой.
   Общее для обоих: «ест» = расход в год + сколько везёт линия (красным, если меньше), без годов; у судов — без «рейс N лет». */
(function(){
  var num=function(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ') };
  var dec=function(n){ return (Math.round(n*10)/10).toFixed(1) };
  var ROM=['I','II','III','IV','V'];
  var COL={metal:'#C9CFD6',food:'#3DDC84',fuel:'#FF8A1F',parts:'#5B82F0',people:'#FFD23F',red:'#FF4D4D',mid:'#8A8F98'};
  var NAME={metal:'Metal',food:'Rations',fuel:'Fuel',parts:'Parts'};
  var PKG={works:'Forge package',metal:'Mining package',food:'Farm package',fuel:'Well package'};
  var IC={};
  function grab(){
    ['metal','food','fuel','parts','people'].forEach(function(k){ var s=document.querySelector('#res .rc[data-r="'+k+'"] svg'); if(s&&!IC[k]) IC[k]=s.outerHTML });
    var u=document.querySelector('#ovl [data-act="kit"] svg'); if(u&&!IC.up) IC.up=u.outerHTML;
    var h=document.querySelector('#ovl .oh svg'); if(h&&!IC.hold) IC.hold=h.outerHTML }
  function ic(k,sz){ var h=IC[k]||''; return h.replace(/width="[\d.]+"/,'width="'+sz+'"').replace(/height="[\d.]+"/,'height="'+sz+'"') }

  function data(pid){ var c=LN.colonies[pid], p=planet(pid), works=p.kind==='works', dep=works?'parts':p.dep;
    var fr=feedRates(LN,pid), f=lineFit(LN,pid), left=f?f.carries:0, eats=[];
    (needsOf(LN,pid)||[]).forEach(function(k){ var n=fr[k]||0, b=Math.min(n,left); left-=b; eats.push({k:k,need:n,brings:b}) });
    var lr=lineRate(LN,pid), kg=kitGain(LN,pid), kc=kitCost(c), d=kg?kg.with-kg.now:0;
    var extra=[]; if(works){ extra.push({k:'metal',n:d*K.REFINE_METAL}); extra.push({k:'food',n:d*K.REFINE_FOOD}) } extra.push({k:'fuel',n:K.KIT_FUEL});
    return {c:c,p:p,works:works,dep:dep,eats:eats,lr:lr,gain:d,extra:extra,kc:kc,tier:kitTier(c),max:K.KIT_MAX,hold:lineHold(LN,pid),
      pkg:PKG[works?'works':dep]||'Upgrade package', pile:Math.floor(c.store[dep]||0) } }

  var css=
  '.wc{display:flex;flex-direction:column;gap:6px}'+
  '.wc .g3{display:grid;grid-template-columns:1fr auto auto;column-gap:14px;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)}'+
  '.wc .g3>span:first-child{display:flex;align-items:center;gap:7px}'+
  '.wc .g3 b{font:500 14px var(--n);text-align:right}'+
  '.wc .g3 i{font:normal 12.5px var(--n);color:var(--mid);text-align:right;min-width:72px}'+
  '.wc .g3 i.short{color:#FF4D4D}'+
  '.wc .g3 em{font:normal 12.5px var(--n);text-align:right;min-width:52px;font-style:normal}'+
  '.wc .g3.g4,.wc .colh{grid-template-columns:1fr auto auto auto}'+
  '.wc .colh{display:grid;column-gap:14px;font:500 10px var(--h);letter-spacing:.14em;color:var(--dim);text-transform:uppercase}'+
  '.wc .colh span{text-align:right;min-width:72px}'+
  '.pk{margin-top:10px;border:1px solid var(--ln);border-left:3px solid #FFD23F;background:rgba(255,210,63,.05);padding:12px 14px;display:flex;flex-direction:column;gap:8px}'+
  '.pk-h{display:flex;align-items:center;gap:10px}'+
  '.pk-h .pi{width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:1px solid #FFD23F;color:#FFD23F}'+
  '.pk-h b{font:600 12px var(--h);letter-spacing:.16em;text-transform:uppercase;flex:1}'+
  '.pips{display:flex;gap:3px}.pips u{width:14px;height:6px;border:1px solid #FFD23F;text-decoration:none}.pips u.on{background:#FFD23F}'+
  '.pk-g{font:500 26px/1.1 var(--n);display:flex;align-items:center;gap:8px}.pk-g small{font:normal 13px var(--h);color:var(--mid)}'+
  '.pk-x{display:flex;flex-wrap:wrap;gap:4px 12px;font:normal 12.5px var(--n);color:#FF8A80;align-items:center}.pk-x .l{font:500 10px var(--h);letter-spacing:.14em;color:var(--mid);text-transform:uppercase}'+
  '.pk-x span{display:inline-flex;align-items:center;gap:4px}'+
  '.pk-f{display:flex;align-items:center;justify-content:space-between;gap:10px}'+
  '.pk-n{display:flex;align-items:center;gap:7px;font:normal 12.5px var(--h);color:#FF4D4D;border-top:1px dashed rgba(255,77,77,.35);padding-top:7px}'+
  '.pkb{margin-top:8px;display:flex;align-items:center;gap:10px;border:1px solid var(--ln);border-left:3px solid #FFD23F;padding:8px 10px;background:rgba(255,210,63,.05)}'+
  '.pkb b{font:600 11.5px var(--h);letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}.pkb .t{display:flex;flex-direction:column;gap:5px}'+
  '.pkb .sp{flex:1}';

  function eatsRows(D,withCol){ return D.eats.map(function(e){ var short=e.brings<e.need*0.95;
    var ex=D.extra.filter(function(x){ return x.k===e.k })[0];
    return '<div class="g3'+(withCol?' g4':'')+'"><span>'+ic(e.k,13)+NAME[e.k]+'</span><b style="color:'+(short?COL.red:'')+'">'+dec(e.need)+'/yr</b><i class="'+(short?'short':'')+'">line '+dec(e.brings)+'</i>'+
      (withCol?'<em style="color:#FF8A80">'+(ex?'+'+dec(ex.n):'')+'</em>':'')+'</div>' }).join('') }
  function head(t,r){ return '<div class="sec"><span>'+t+'</span>'+(r?'<span>'+r+'</span>':'')+'</div>' }
  function people(D){ return '<div class="g3"><span>'+ic('people',13)+'People</span><b style="color:'+COL.people+'">'+num(D.c.pop)+'</b><i></i></div>' }
  function pips(D){ var h=''; for(var i=0;i<D.max;i++) h+='<u class="'+(i<D.tier?'on':'')+'"></u>'; return '<span class="pips">'+h+'</span>' }
  function priceH(D){ return '<span class="pr" style="margin-right:10px">'+ic('metal',12)+num(D.kc.metal)+'</span><span class="pr">'+ic('parts',12)+num(D.kc.parts)+'</span>' }
  function need(D){ return D.hold>=D.kc.w?'':'<div class="pk-n">'+ic('hold',14)+'Needs a hull with a hold of '+num(D.kc.w)+'+ on this line · biggest '+num(D.hold)+'</div>' }
  function alarm(){ var a=document.querySelector('#ovl .win .bd .alert'); return a?a.outerHTML:'' }
  function makes(D,withCol){ var lr=D.lr;
    return head(D.works?'Makes':'Gives')+
      '<div class="g3'+(withCol?' g4':'')+'"><span>'+ic(D.dep,13)+NAME[D.dep]+'</span><b>'+dec(lr.makes)+'/yr</b><i class="'+(lr.carries<lr.makes*0.8?'short':'')+'">line '+dec(lr.carries)+'</i>'+(withCol?'<em style="color:'+COL[D.dep]+'">+'+dec(D.gain)+'</em>':'')+'</div>'+
      '<div class="g3'+(withCol?' g4':'')+'"><span>On the surface</span><b>'+num(D.pile)+'</b><i></i>'+(withCol?'<em></em>':'')+'</div>' }
  function deposit(){ var r=[].filter.call(document.querySelectorAll('#ovl .win .bd .rw'),function(x){ return /Deposit/.test(x.innerText) })[0]; return r?r.outerHTML:'' }

  function A(pid){ var D=data(pid), h='<div class="wc">';
    h+=head('World')+(D.works?'':deposit())+people(D);
    if(D.works) h+=head('Eats')+eatsRows(D,false)+alarm();
    h+=makes(D,false);
    if(D.tier<D.max){
      h+='<div class="pk"><div class="pk-h"><span class="pi">'+ic('up',18)+'</span><b>'+D.pkg+' '+ROM[D.kc.tier-1]+'</b>'+pips(D)+'</div>'+
        '<div class="pk-g">'+ic(D.dep,20)+'<span style="color:'+COL[D.dep]+'">+'+dec(D.gain)+'</span><small>'+NAME[D.dep].toLowerCase()+' a year</small></div>'+
        '<div class="pk-x"><span class="l">and eats</span>'+D.extra.map(function(x){ return '<span>'+ic(x.k,12)+'+'+dec(x.n)+'</span>' }).join('')+'<span class="l">a year</span></div>'+
        '<div class="pk-f"><span>'+priceH(D)+'</span><button class="b pri" type="button">'+ic('up',15)+'Order</button></div>'+need(D)+'</div>' }
    return h+'</div>' }

  function B(pid){ var D=data(pid), h='<div class="wc">';
    h+=head('World')+(D.works?'':deposit())+people(D);
    var hc='<div class="colh"><span></span><span>a year</span><span style="min-width:52px">+ package</span></div>';
    if(D.works) h+=head('Eats')+hc+eatsRows(D,true)+(D.extra.some(function(x){ return x.k==='fuel' })&&!D.eats.some(function(e){ return e.k==='fuel' })?'<div class="g3 g4" style="opacity:.75"><span>'+ic('fuel',13)+'Fuel</span><b>—</b><i></i><em style="color:#FF8A80">+'+dec(K.KIT_FUEL)+'</em></div>':'')+alarm();
    else h+=head('Eats')+hc+'<div class="g3 g4" style="opacity:.75"><span>'+ic('fuel',13)+'Fuel</span><b>—</b><i></i><em style="color:#FF8A80">+'+dec(K.KIT_FUEL)+'</em></div>';
    h+=makes(D,true);
    if(D.tier<D.max) h+='<div class="pkb">'+ic('up',18)+'<span class="t"><b>'+D.pkg+' '+ROM[D.kc.tier-1]+'</b>'+pips(D)+'</span><span class="sp"></span>'+priceH(D)+'<button class="b pri" type="button">Order</button></div>'+need(D);
    return h+'</div>' }

  // the right column: hull rows lose «round trip N years»
  function noYears(){ [].forEach.call(document.querySelectorAll('#ovl .hst'),function(s){ if(/round trip/.test(s.textContent)){ var t=s.innerHTML; s.innerHTML=t.replace(/ · <svg[\s\S]*$/,'') } });
    [].forEach.call(document.querySelectorAll('#ovl .hr span'),function(x){ if(/Earth/.test(x.textContent)&&/\d+ years?/.test(x.textContent)&&x.querySelectorAll('span').length===0) x.innerHTML=x.innerHTML.replace(/\s*·\s*\d+ years?/,'') }) }

  window.WCDRAFT={css:css,grab:grab,A:A,B:B,noYears:noYears};
})();
