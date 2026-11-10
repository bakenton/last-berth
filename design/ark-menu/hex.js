/* Черновики окна ковчега, раунд 2 (Никита 10.11: «мне нравится третий вариант [трюм], только надо его через фирменные гексы сделать
   + передизайнить панель конвоя, добавь ещё 5 черновиков»). Пять вариантов трюма из гексов, в каждом своя панель конвоя.
   НЕ код игры: вставляется в настоящую страницу поверх окна Ark (shots-hex.js). Гекс = 100 человек. Пример тот же, что в раунде 1:
   год 2900, Ночь 3802, на борт 5 482, капсул 3 400, двигатель Gen V («долетят 75%» — по поколению, не решено), лестница 2. */
(function(){
  var FOOD=[2,3,4,5,7,10,14,20], MET=[1,2,3,5,8,12,18,27], BOUGHT=3400, ABOARD=5482, WORLDS=640, CROSS=0.75, S3=Math.sqrt(3);
  var num=function(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ') };
  var IC={}; function grab(){ [].forEach.call(document.querySelectorAll('svg.ic'),function(s){ var m=/color:\s*(#[0-9A-Fa-f]{6})/.exec(s.getAttribute('style')||''); if(m&&!IC[m[1].toUpperCase()]) IC[m[1].toUpperCase()]=s.outerHTML }) }
  var COL={metal:'#C9CFD6',food:'#3DDC84',fuel:'#FF8A1F',parts:'#5B82F0',people:'#FFD23F'}, CC={courier:'#45D4E8',hauler:'#FF6FB5',freighter:'#F2F1EC'};
  function ic(k,sz){ var h=IC[COL[k]]||''; return h.replace(/width="\d+"/,'width="'+sz+'"').replace(/height="\d+"/,'height="'+sz+'"') }
  function icx(k,x,y,sz){ return ic(k,sz).replace('<svg','<svg x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"') }
  function pr(k,n,short){ return '<span class="pr'+(short?' short':'')+'">'+ic(k,12)+num(n)+'</span>' }
  function cost(from,to){ var f=0,m=0; for(var i=0;i<8;i++){ var lo=i*1000, hi=i===7?1e9:(i+1)*1000, k=Math.max(0,Math.min(to,hi)-Math.max(from,lo)); f+=k*FOOD[i]; m+=k*MET[i] } return {food:f,metal:m} }
  var wake=Math.floor(Math.min(BOUGHT,ABOARD)*CROSS), lost=Math.min(BOUGHT,ABOARD)-wake, sleep=ABOARD-Math.min(BOUGHT,ABOARD);
  var ON=BOUGHT/100, CELLS=Math.ceil(ABOARD/100);
  /* гекс: flat — плоская грань сверху; иначе вершина сверху */
  function hp(cx,cy,r,flat){ var a=[]; for(var i=0;i<6;i++){ var t=Math.PI/180*(60*i+(flat?0:30)); a.push((cx+r*Math.cos(t)).toFixed(1)+','+(cy+r*Math.sin(t)).toFixed(1)) } return a.join(' ') }
  function hx(cx,cy,r,flat,cls,extra){ return '<polygon class="hx '+(cls||'')+'" points="'+hp(cx,cy,r,flat)+'"'+(extra||'')+'/>' }
  function st(k,sel){ return k<ON?'on':k<sel?'sel':k<CELLS?'':'none' }
  function sp(x,y,f,m,dim){ var s=String(f), w=s.length*6.9; return '<g'+(dim?' opacity=".4"':'')+'>'+icx('food',x,y-9.5,11)+'<text class="t1 tw" x="'+(x+13)+'" y="'+y+'">'+s+'</text>'+icx('metal',x+20+w,y-9.5,11)+'<text class="t1 tw" x="'+(x+33+w)+'" y="'+y+'">'+m+'</text></g>' }
  function glyph(cls,cx,cy,w,dim){ var h=w*0.625; return '<svg class="gi" x="'+(cx-w/2).toFixed(1)+'" y="'+(cy-h/2).toFixed(1)+'" width="'+w+'" height="'+h+'" viewBox="0 0 64 40" style="color:'+CC[cls]+'"'+(dim?' opacity=".3"':'')+'><use href="#i-'+cls+'"/></svg>' }
  var SHIPS=[['courier','VI','3'],['courier','VI','4'],['courier','V','5'],['hauler','VI','6'],['hauler',null,null],['freighter','V','7']];

  var css=
  '.ah{display:flex;flex-direction:column;gap:14px}.ah small,.ah .lab2{font:500 11px var(--h);letter-spacing:.14em;color:var(--mid);text-transform:uppercase}'+
  '.ah-two{display:flex;gap:22px}.ah-two>div{min-width:0;display:flex;flex-direction:column;gap:10px}.ah-l{flex:1.62}.ah-r{flex:1}'+
  '.ah svg.hold{display:block;width:100%;height:auto;overflow:visible}'+
  '.hx{fill:none;stroke:var(--dim);stroke-width:1}.hx.on{fill:var(--ark);stroke:var(--ark)}.hx.sel{fill:rgba(180,140,255,.26);stroke:var(--ark)}'+
  '.hx.rsel{stroke:var(--ink);stroke-width:1.7}.hx.cur{stroke:var(--ink);stroke-width:2.2}.hx.none{stroke:#34343a;stroke-dasharray:2 3}.hx.core{fill:var(--ink);stroke:var(--ink)}'+
  '.hx.slot{stroke:var(--ark);fill:var(--pan)}.hx.miss{stroke:var(--red);stroke-dasharray:4 3;fill:rgba(255,42,26,.06)}.hx.ok{stroke:var(--food);fill:rgba(61,220,132,.08)}'+
  '.ah text{font-family:var(--n)}.t1{font:500 11px var(--n);fill:var(--mid)}.t2{font:500 10.5px var(--h);letter-spacing:.13em;fill:var(--mid);text-transform:uppercase}'+
  '.tw{fill:var(--ink)}.tr{fill:var(--red)}.tg{fill:var(--food)}.ta{fill:var(--ark)}.td{fill:var(--dim)}.tb{font:500 20px var(--n);fill:var(--ink)}.tk{fill:#000}'+
  '.ah-big{display:flex;border:1px solid var(--ln)}.ah-big>div{flex:1;padding:10px 13px;display:flex;flex-direction:column;gap:3px}'+
  '.ah-big b{font:500 29px/1.05 var(--n);letter-spacing:-.02em}.ah-big i{font:normal 12px var(--h);color:var(--mid);white-space:nowrap}'+
  '.ah-pick{border:1px solid var(--ark);padding:11px 14px;display:flex;flex-direction:column;gap:7px}.ah-pick h4{margin:0;font:600 15px var(--h);letter-spacing:.1em;text-transform:uppercase}'+
  '.ah-line{display:flex;justify-content:space-between;align-items:center;font:400 13px var(--h);color:var(--mid)}.ah-line b{font:500 13.5px var(--n);color:var(--ink)}'+
  '.ah-go{background:var(--ink);color:#000;text-align:center;padding:9px;font:600 14px var(--h);letter-spacing:.12em;text-transform:uppercase}'+
  '.ah-alt{display:flex;justify-content:space-between;align-items:center;gap:10px;font:400 12.5px var(--h);color:var(--mid);border-top:1px solid var(--ln);padding-top:6px}'+
  '.ah-rt{font:500 12px var(--h);color:var(--food)}.ah-rt.bad{color:var(--red)}'+
  '.ah-fate{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--red);padding:9px 16px}'+
  '.ah-fate b{font:700 17px var(--h);letter-spacing:.08em;color:var(--red);text-transform:uppercase;margin-right:14px}.ah-fate i{font:normal 12.5px var(--h);color:var(--mid)}'+
  '.ah-hint{border:1px dashed var(--ln);padding:22px 14px;font:400 13.5px/1.6 var(--h);color:var(--dim);text-align:center}'+
  '.ah-yard{border:1px solid var(--mid);padding:5px 12px;font:600 11.5px var(--h);letter-spacing:.12em;text-transform:uppercase;align-self:flex-start}'+
  '.am-top{position:absolute;left:622px;top:9px;display:flex;flex-direction:column;gap:1px;font:500 11px var(--h);letter-spacing:.12em;text-transform:uppercase;color:var(--mid);white-space:nowrap}.am-top b{font:500 19px var(--n);letter-spacing:-.01em}';

  function big3(){ return '<div class="ah-big"><div style="background:rgba(61,220,132,.09)"><small>Wake</small><b style="color:var(--food)">'+num(wake)+'</b><i>of '+num(ABOARD)+' aboard</i></div><div><small>Sleep on</small><b style="color:var(--ark)">'+num(sleep)+'</b><i>no pod</i></div><div><small>Lost</small><b style="color:var(--mid)">'+num(lost)+'</b><i>crossing 75%</i></div></div>' }
  function pick(title,to,alts){ var c=cost(BOUGHT,to), h='<div class="ah-pick"><h4>'+title+'</h4>'+
      '<div class="ah-line"><span>Pods</span><b>+'+num(to-BOUGHT)+'</b></div><div class="ah-line"><span>Price</span><div class="prow">'+pr('food',c.food)+pr('metal',c.metal)+'</div></div>'+
      '<div class="ah-line"><span>Wake</span><b style="color:var(--food)">'+num(wake)+' → '+num(Math.floor(Math.min(to,ABOARD)*CROSS))+'</b></div>'+
      '<div class="ah-line"><span>Rations after</span><b style="color:var(--food)">last to the Night</b></div><div class="ah-go">Buy '+num(to-BOUGHT)+' pods</div>';
    (alts||[]).forEach(function(a){ var q=a[4]||cost(BOUGHT,a[1]); h+='<div class="ah-alt"><span>'+a[0]+'</span><div class="prow">'+pr('food',q.food,a[3])+pr('metal',q.metal)+'</div><span class="ah-rt bad">'+a[2]+'</span></div>' });
    return h+'</div>' }
  var ALTS=[['to 5 000',5000,'rations end ≈ 3 520'],['everyone',ABOARD,'620 rations short',true]];
  function fate(){ return '<div class="ah-fate"><div><b>The ark stays</b><i>The convoy is short: 1 × Hauler.</i></div><span class="lab2">if the Night came today</span></div>' }
  function sec(a,b){ return '<div class="sec"><span>'+a+'</span>'+(b?'<span>'+b+'</span>':'')+'</div>' }
  function top(){ return '<div class="am-top" id="amtop"><span>Wake · sleep on</span><span><b style="color:var(--food)">'+num(wake)+'</b> <b style="color:var(--dim)">·</b> <b style="color:var(--ark)">'+num(sleep)+'</b></span></div>' }
  function legend(){ return '<div class="ah-line"><span>'+['on','','none'].map(function(c,i){ return '<svg width="16" height="14" viewBox="0 0 16 14" style="vertical-align:-2px;margin-right:5px">'+hx(8,7,7,true,c)+'</svg>'+['pod bought','no pod: sleeps on','nobody yet'][i] }).join(' &nbsp;&nbsp; ')+'</span><span>+'+num(WORLDS)+' still on worlds</span></div>' }

  /* H1 «Соты»: ряды гексов, ряд = ступень цены. Конвой — цепочка из шести гекс-гнёзд с судном и номером. */
  function H1(){ grab(); var r=25, dx=S3*r, dy=1.5*r, x0=92, y0=30, sel=40, s='', k=0;
    for(var row=0;row<6;row++){ var cy=y0+row*dy, off=row%2?dx/2:0;
      s+='<text class="t1 td" x="60" y="'+(cy+4)+'" text-anchor="end">'+num((row+1)*1000)+'</text>';
      for(var c=0;c<10;c++,k++) s+=hx(x0+off+c*dx,cy,r-2,false,st(k,sel)+(k===sel-1?' cur':''));
      s+=sp(x0+10*dx+18,cy+4,FOOD[row],MET[row],row>5) }
    var hold='<svg class="hold" viewBox="0 0 640 '+(y0+5*dy+34)+'">'+s+'</svg>';
    // конвой: цепочка гнёзд
    var R=34, cs='', x=42; SHIPS.forEach(function(sh,i){ if(i===3||i===5) x+=18; var on=!!sh[1];
      cs+=hx(x,46,R-2,true,on?'slot':'miss')+glyph(sh[0],x,38,40,!on)+'<text class="'+(on?'t1':'t1 tr')+'" x="'+x+'" y="62" text-anchor="middle">'+(on?sh[1]+' · '+sh[2]:'empty')+'</text>'; x+=R*2+4 });
    var conv=sec('Convoy · 5 / 6','Gen IV+ · docked at Earth on the day')+'<svg class="hold" viewBox="0 0 640 92">'+cs+'</svg>';
    return '<div class="ah"><div class="ah-two"><div class="ah-l">'+sec('The hold · one hex — 100 people','pod price')+hold+legend()+conv+'</div><div class="ah-r">'+big3()+pick('Fill to 4 000',4000,ALTS)+'<span class="ah-yard">To the yard</span></div></div>'+fate()+'</div>' }

  /* H2 «Улей»: кольца вокруг ядра, кольцо = ступень цены (600 / 1 200 / 1 800 / 2 400 капсул — ступени НЕ по тысяче). Конвой — шесть гнёзд эскорта по вершинам. */
  function H2(){ grab(); var r=15.5, cx=205, cy=196, s='', k=0, D=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]], sel=36;
    s+='<polygon points="'+hp(cx,cy,166,false)+'" fill="none" stroke="#2E2E33" stroke-dasharray="3 5"/>';
    s+=hx(cx,cy,r-1.5,true,'core');
    for(var ring=1;ring<=4;ring++){ var q=0, rr=-ring; for(var side=0;side<6;side++) for(var j=0;j<ring;j++,k++){ s+=hx(cx+r*1.5*q,cy+r*S3*(rr+q/2),r-1.6,true,st(k,sel)); q+=D[side][0]; rr+=D[side][1] } }
    var ang=[-90,-30,30,90,150,210]; SHIPS.forEach(function(sh,i){ var a=ang[i]*Math.PI/180, x=cx+166*Math.cos(a), y=cy+166*Math.sin(a), on=!!sh[1];
      s+=hx(x,y,26,true,on?'slot':'miss')+glyph(sh[0],x,y-3,28,!on)+'<text class="'+(on?'t1':'t1 tr')+'" x="'+x.toFixed(1)+'" y="'+(y+15).toFixed(1)+'" text-anchor="middle" style="font-size:9.5px">'+(on?sh[1]+' · '+sh[2]:'empty')+'</text>' });
    // кольца: цена и заполнение
    var RP=[[2,1],[3,2],[5,5],[9,11],[16,22]], RN=[6,12,18,24,30], cum=0, x0=430, y=92;
    s+='<text class="t2" x="'+x0+'" y="62">Ring · pods · price a pod</text>';
    RN.forEach(function(n,i){ var have=Math.max(0,Math.min(n,ON-cum)), full=have===n, cur=have>0&&!full, yy=y+i*34;
      s+=hx(x0+9,yy-4,9,true,full?'on':cur?'sel cur':i<4?'':'none')+'<text class="t1 '+(cur?'tw':'')+'" x="'+(x0+28)+'" y="'+yy+'">'+['I','II','III','IV','V'][i]+'</text><text class="t1 '+(cur?'tw':'')+'" x="'+(x0+62)+'" y="'+yy+'">'+num(have*100)+' / '+num(n*100)+'</text>'+sp(x0+152,yy,RP[i][0],RP[i][1],i>3); cum+=n });
    s+='<text class="t1 td" x="'+x0+'" y="'+(y+5*34+6)+'">outer rings cost more a pod</text><text class="t1 td" x="'+x0+'" y="'+(y+5*34+24)+'">escort at the six corners</text>';
    var hold='<svg class="hold" viewBox="0 0 640 392">'+s+'</svg>';
    var pk=pick('Fill ring III',3600,[['ring IV',6000,'8 400 rations short',true,{food:22600,metal:27400}]]);
    return '<div class="ah"><div class="ah-two"><div class="ah-l">'+sec('The ark · one hex — 100 people','convoy 5 / 6 · Gen IV+')+hold+legend()+'</div><div class="ah-r">'+big3()+pk+'<span class="ah-yard">To the yard · 1 hauler short</span></div></div>'+fate()+'</div>' }

  /* H3 «Палубы»: ступень = блок 2×5 гексов, блоки стоят лестницей (подъём = цена капсулы). Конвой — три гекса по классам со счётом. */
  function H3(){ grab(); var r=14.5, s='', base=262, w=76, x0=30, sel=40, stair='', k=0;
    for(var t=0;t<8;t++){ var p=FOOD[t]+MET[t], lift=Math.round(p*1.7), bx=x0+t*w, by=base-lift, kk=t*10;
      stair+=(t?' L':'M')+(bx-4)+','+by+' L'+(bx+w-8)+','+by;
      for(var c=0;c<2;c++) for(var q=0;q<5;q++,kk++){ var cxx=bx+r+c*1.5*r, cyy=by-(r*S3/2)-4-(4-q)*r*S3-(c?r*S3/2:0); s+=hx(cxx,cyy,r-1.6,true,(t<7?st(kk,sel):'none')+(kk===sel-1?' cur':'')) }
      s+='<text class="t1 '+(t===3?'tw':'td')+'" x="'+(bx+26)+'" y="'+(by-5*r*S3-r*S3/2-12)+'" text-anchor="middle">'+(t===7?'7 001+':num(t*1000+1000))+'</text>'+sp(bx+2,base+20,FOOD[t],MET[t],t>5) }
    s='<path d="'+stair+'" fill="none" stroke="var(--mid)" stroke-width="1.5"/>'+s;
    s+='<line x1="'+(x0+ABOARD/1000*w-6)+'" y1="18" x2="'+(x0+ABOARD/1000*w-6)+'" y2="'+base+'" stroke="var(--ppl)" stroke-dasharray="3 3"/><text class="t2" x="'+(x0+ABOARD/1000*w)+'" y="26" style="fill:var(--ppl)">aboard '+num(ABOARD)+'</text>';
    var hold='<svg class="hold" viewBox="0 0 640 292">'+s+'</svg>';
    var G=[['courier',3,3],['hauler',1,2],['freighter',1,1]], cs='', x=44; G.forEach(function(g){ var ok=g[1]>=g[2];
      cs+=hx(x,44,36,true,ok?'ok':'miss')+glyph(g[0],x,36,36)+'<text class="tb '+(ok?'':'tr')+'" x="'+x+'" y="66" text-anchor="middle" style="font-size:15px">'+g[1]+' / '+g[2]+'</text><text class="t2" x="'+(x+46)+'" y="40">'+g[0]+'s</text><text class="t1 '+(ok?'tg':'tr')+'" x="'+(x+46)+'" y="58">'+(ok?'ready':(g[2]-g[1])+' short')+'</text>'; x+=206 });
    var conv=sec('Convoy','Gen IV+ · docked at Earth on the day')+'<svg class="hold" viewBox="0 0 640 88">'+cs+'</svg>';
    return '<div class="ah"><div class="ah-two"><div class="ah-l">'+sec('The decks · one hex — 100 people','the higher the deck stands, the dearer the pod')+hold+legend()+conv+'</div><div class="ah-r">'+big3()+pick('Fill to 4 000',4000,ALTS)+'<span class="ah-yard">To the yard</span></div></div>'+fate()+'</div>' }

  /* H4 «Семь сот»: семь больших гексов — семь ступеней, уровень заливки = сколько куплено; нажимается весь гекс. Конвой — шесть точек-гексов и счёт. */
  function H4(){ grab(); var R=66, cx=214, cy=188, d=S3*R, s='', defs='', P=[[cx,cy]], ang=[-90,-30,30,90,150,210];
    ang.forEach(function(a){ P.push([cx+d*Math.cos(a*Math.PI/180),cy+d*Math.sin(a*Math.PI/180)]) });
    P.forEach(function(p,t){ var have=Math.max(0,Math.min(1000,BOUGHT-t*1000)), ppl=Math.max(0,Math.min(1000,ABOARD-t*1000)), f=have/1000, h=S3*R, cur=f>0&&f<1, none=ppl===0, id='hc'+t;
      defs+='<clipPath id="'+id+'"><polygon points="'+hp(p[0],p[1],R-3,true)+'"/></clipPath>';
      if(f>0) s+='<rect clip-path="url(#'+id+')" x="'+(p[0]-R)+'" y="'+(p[1]+h/2-f*h).toFixed(1)+'" width="'+2*R+'" height="'+(f*h).toFixed(1)+'" fill="var(--ark)" opacity="'+(f===1?1:.85)+'"/>';
      s+=hx(p[0],p[1],R-3,true,(cur?'cur':none?'none':'')+(f===1?' on':''),f===1?' style="fill:none"':'');
      var dark=f===1?' tk':'', tc=none?' td':'';
      s+='<text class="t1'+(dark||tc||' tw')+'" x="'+p[0]+'" y="'+(p[1]-22)+'" text-anchor="middle">'+num(t*1000+1)+'–'+num(t*1000+1000)+'</text>'+
         '<text class="tb'+dark+tc+'" x="'+p[0]+'" y="'+(p[1]+3)+'" text-anchor="middle" style="font-size:15.5px">'+(f===1?'full':none?'—':num(have)+' / '+num(ppl))+'</text>';
      s+=(f>=0.3?'<g style="filter:brightness(.25)">':'<g>')+sp(p[0]-28,p[1]+27,FOOD[t],MET[t],none)+'</g>' });
    var x0=436; s+='<text class="t2" x="'+x0+'" y="74">1 000 pods a cell</text><text class="t1 td" x="'+x0+'" y="96">press a cell to fill it</text><text class="t1 td" x="'+x0+'" y="114">the centre is the cheapest</text>'+
      '<text class="t2" x="'+x0+'" y="160">Beyond 7 000</text>'+sp(x0,182,FOOD[7],MET[7])+'<text class="t1 td" x="'+(x0+70)+'" y="182">a pod, no limit</text>';
    // конвой точками
    var cy2=262; s+='<text class="t2" x="'+x0+'" y="'+(cy2-26)+'">Convoy</text><text class="tb tr" x="'+(x0+196)+'" y="'+(cy2-22)+'" text-anchor="end">5 / 6</text>';
    SHIPS.forEach(function(sh,i){ var on=!!sh[1], x=x0+14+i*33; s+='<polygon points="'+hp(x,cy2,14,true)+'" fill="'+(on?CC[sh[0]]:'none')+'" stroke="'+(on?CC[sh[0]]:'var(--red)')+'"'+(on?'':' stroke-dasharray="3 3"')+'/>' });
    s+='<text class="t1 tr" x="'+x0+'" y="'+(cy2+36)+'">1 hauler short</text><text class="t1 td" x="'+x0+'" y="'+(cy2+54)+'">Gen IV+ · docked on the day</text>';
    var hold='<svg class="hold" viewBox="0 0 640 380"><defs>'+defs+'</defs>'+s+'</svg>';
    return '<div class="ah"><div class="ah-two"><div class="ah-l">'+sec('The hold · seven cells','level — pods bought')+hold+'<div class="ah-line"><span>'+num(sleep)+' aboard have no pod</span><span>+'+num(WORLDS)+' still on worlds</span></div></div><div class="ah-r">'+big3()+pick('Fill cell 3 001–4 000',4000,ALTS)+'<span class="ah-yard">To the yard</span></div></div>'+fate()+'</div>' }

  /* H5 «Борт»: полоса сот 12×5, два столбца = ступень, заполняется от носа к корме. Конвой и вердикт слиты в «проверку перед отлётом» из трёх гексов. */
  function H5(){ grab(); var r=23, dx=1.5*r, dy=S3*r, x0=44, y0=74, sel=40, s='', k=0;
    for(var c=0;c<12;c++){ for(var q=0;q<5;q++,k++) s+=hx(x0+c*dx,y0+q*dy+(c%2?dy/2:0),r-2,true,st(k,sel)+(k===sel-1?' cur':''));
      if(c%2===0){ var t=c/2, mx=x0+c*dx+dx/2; s+='<path d="M'+(mx-dx+6)+',38 v-6 h'+(2*dx-12)+' v6" fill="none" stroke="'+(t===3?'var(--ark)':'var(--dim)')+'"/><text class="t1 '+(t===3?'tw':'td')+'" x="'+mx+'" y="24" text-anchor="middle">'+num(t*1000+1000)+'</text>'+sp(mx-24,y0+5*dy+34,FOOD[t],MET[t],t>5) } }
    s+='<text class="t2" x="'+(x0+12*dx+10)+'" y="'+(y0+2*dy-18)+'">to 7 000</text>'+sp(x0+12*dx+10,y0+2*dy+2,FOOD[6],MET[6])+'<text class="t2" x="'+(x0+12*dx+10)+'" y="'+(y0+2*dy+30)+'">beyond</text>'+sp(x0+12*dx+10,y0+2*dy+50,FOOD[7],MET[7]);
    var hold='<svg class="hold" viewBox="0 0 640 '+(y0+5*dy+48)+'">'+s+'</svg>';
    // проверка перед отлётом
    var L='', CH=[['ok','Ark drive','Gen V · ready','tg'],['miss','Convoy','5 / 6 · 1 hauler short','tr'],['slot','Pods','3 400 · wake 2 550','ta']], x=40;
    CH.forEach(function(ch,i){ L+=hx(x,44,30,true,ch[0])+'<text x="'+x+'" y="52" text-anchor="middle" class="tb '+ch[3]+'" style="font-size:22px">'+(ch[0]==='ok'?'✓':ch[0]==='miss'?'✕':'⬡')+'</text><text class="t2" x="'+(x+42)+'" y="36">'+ch[1]+'</text><text class="t1 '+ch[3]+'" x="'+(x+42)+'" y="56">'+ch[2]+'</text>';
      if(i===1) SHIPS.forEach(function(sh,j){ var on=!!sh[1], gx=x+42+j*27+10; L+=on?glyph(sh[0],gx,74,22):'<polygon points="'+hp(gx,74,9,true)+'" fill="none" stroke="var(--red)" stroke-dasharray="2 2"/>' });
      x+=i===1?250:206 });
    var chk='<div style="border:1px solid var(--red);padding:10px 14px 6px">'+
      '<div class="sec" style="border:0;margin:0 0 4px"><span style="color:var(--red);font:700 17px var(--h);letter-spacing:.08em">THE ARK STAYS</span><span>if the Night came today</span></div><svg class="hold" viewBox="0 0 1020 92" style="width:100%">'+L+'</svg></div>';
    return '<div class="ah"><div class="ah-two"><div class="ah-l">'+sec('The hold · one hex — 100 people','bow → stern · two columns — 1 000 pods')+hold+legend()+'</div><div class="ah-r">'+big3()+pick('Fill to 4 000',4000,ALTS)+'</div></div>'+chk+'</div>' }


  /* H2 «Улей», раунд 3 (Никита 10.11: «второй вариант хороший с кольцами как соты. Но цифр пока многовато»): цифры только для решения.
     В покое — два числа итога и счёт конвоя; цена, прирост и рационы появляются, когда нажато кольцо. Таблицы колец, номеров судов и «to 5 000 / everyone» нет. */
  function lean(sel){ grab(); var r=19, cx=262, cy=236, ER=204, s='', k=0, D=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]], selTo=sel?36:0;
    s+='<polygon points="'+hp(cx,cy,ER,false)+'" fill="none" stroke="#2E2E33" stroke-dasharray="3 5"/>';
    s+=hx(cx,cy,r-1.8,true,'core');
    for(var ring=1;ring<=4;ring++){ var q=0, rr=-ring; for(var side=0;side<6;side++) for(var j=0;j<ring;j++,k++){ s+=hx(cx+r*1.5*q,cy+r*S3*(rr+q/2),r-1.9,true,st(k,selTo)+(sel&&ring===3?' rsel':'')); q+=D[side][0]; rr+=D[side][1] } }
    [-90,-30,30,90,150,210].forEach(function(a,i){ var sh=SHIPS[i], t=a*Math.PI/180, x=cx+ER*Math.cos(t), y=cy+ER*Math.sin(t), on=!!sh[1];
      s+=hx(x,y,29,true,on?'slot':'miss')+glyph(sh[0],x,y,36,!on) });
    var hold='<svg class="hold" viewBox="0 0 524 472" style="width:82%;margin:0 auto">'+s+'</svg>';
    var lg='<div class="ah-line" style="justify-content:center;gap:22px">'+['on','','none'].map(function(c,i){ return '<span><svg width="16" height="14" viewBox="0 0 16 14" style="vertical-align:-2px;margin-right:5px">'+hx(8,7,7,true,c)+'</svg>'+['pod','no pod: sleeps on','nobody yet'][i]+'</span>' }).join('')+'</div>';
    var out='<div class="ah-big"><div style="background:rgba(61,220,132,.09)"><small>Wake</small><b style="color:var(--food);font-size:40px">'+num(wake)+'</b><i>crossing 75%</i></div><div><small>Sleep on</small><b style="color:var(--ark);font-size:40px">'+num(sleep)+'</b><i>no pod</i></div></div>';
    var c=cost(BOUGHT,3600), card=sel?
      '<div class="ah-pick"><h4>Ring III</h4><div class="ah-line"><span>Price</span><div class="prow">'+pr('food',c.food)+pr('metal',c.metal)+'</div></div>'+
      '<div class="ah-line"><span>Wake</span><b style="color:var(--food)">+'+num(200*CROSS)+'</b></div><div class="ah-line"><span>Rations</span><b style="color:var(--food)">last to the Night</b></div><div class="ah-go">Fill ring III</div></div>'
      :'<div class="ah-hint">Press a ring to fill it.<br>Outer rings cost more.</div>';
    var ft='<div class="ah-fate"><div><b>The ark stays</b><i>The convoy is short: 1 × Hauler.</i></div><span class="ah-yard" style="align-self:center">To the yard</span></div>';
    return '<div class="ah"><div class="ah-two"><div class="ah-l">'+sec('The ark · one hex — 100 people','convoy 5 / 6')+hold+lg+'</div><div class="ah-r">'+out+card+'</div></div>'+ft+'</div>' }
  function H2a(){ return lean(false) } function H2b(){ return lean(true) }


  /* Раунд 4 (Никита 10.11: «конвой надо переработать… туда засовываешь сколько хочешь судов, и нет цели сколько. Вокруг сот можно сделать
     кольцо гексов другого цвета, которые будут заполняться в зависимости от кол-ва судов в конвое»). Шесть гнёзд эскорта убраны:
     конвой — внешнее кольцо из 36 гексов, судно закрашивает клетки по классу (курьер 1, тягач 2, грузовоз 3). Пример: 5 + 3 + 1 судно = 14 из 36.
     В примере кольцо — ШКАЛА: чем полнее, тем больше долетает (crossing 63%); это предложение Claude, порог или шкала — не решено. */
  function hive(o){ grab(); var r=19, cx=262, cy=236, s='', k=0, D=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]], selTo=o.ring?36:0, FILL=14, cross=0.63, wk=Math.floor(BOUGHT*cross);
    var CV=['courier','courier','courier','courier','courier','hauler','hauler','hauler','hauler','hauler','hauler','freighter','freighter','freighter'];
    function ringCells(ring,fn){ var q=0, rr=-ring, i=0; for(var side=0;side<6;side++) for(var j=0;j<ring;j++,i++){ fn(cx+r*1.5*q,cy+r*S3*(rr+q/2),i); q+=D[side][0]; rr+=D[side][1] } }
    s+=hx(cx,cy,r-1.8,true,'core');
    for(var ring=1;ring<=4;ring++) ringCells(ring,function(x,y){ s+=hx(x,y,r-1.9,true,st(k,selTo)+(o.ring&&ring===3?' rsel':'')); k++ });
    ringCells(6,function(x,y,i){ var on=i<FILL, col=o.byClass&&on?CC[CV[i]]:'#45D4E8';
      s+='<polygon points="'+hp(x,y,r-1.9,true)+'" fill="'+(on?col:'none')+'" stroke="'+(on?col:'rgba(69,212,232,.38)')+'" stroke-width="'+(o.conv?1.8:1)+'"'+(o.conv&&!on?' stroke="var(--ink)"':'')+'/>' });
    var hold='<svg class="hold" viewBox="0 0 524 472" style="width:82%;margin:0 auto">'+s+'</svg>';
    var sw=function(fill,stroke,dash){ return '<svg width="16" height="14" viewBox="0 0 16 14" style="vertical-align:-2px;margin-right:5px"><polygon points="'+hp(8,7,7,true)+'" fill="'+fill+'" stroke="'+stroke+'"'+(dash?' stroke-dasharray="2 3"':'')+'/></svg>' };
    var lg='<div class="ah-line" style="justify-content:center;gap:20px"><span>'+sw('var(--ark)','var(--ark)')+'pod</span><span>'+sw('none','var(--dim)')+'no pod: sleeps on</span><span>'+
      (o.byClass?sw(CC.courier,CC.courier)+sw(CC.hauler,CC.hauler)+sw(CC.freighter,CC.freighter):sw('#45D4E8','#45D4E8'))+'convoy</span></div>';
    var out='<div class="ah-big"><div style="background:rgba(61,220,132,.09)"><small>Wake</small><b style="color:var(--food);font-size:40px">'+num(wk)+'</b><i>crossing 63%</i></div><div><small>Sleep on</small><b style="color:var(--ark);font-size:40px">'+num(sleep)+'</b><i>no pod</i></div></div>';
    var card='<div class="ah-hint">Press a ring to fill it.<br>Purple — pods. Outer — convoy.</div>';
    if(o.conv){ var g=function(cls,off){ return '<div style="flex:1;border:1px '+(off?'dashed var(--dim)':'solid var(--mid)')+';padding:9px 0 7px;display:flex;flex-direction:column;align-items:center;gap:5px;'+(off?'opacity:.45':'')+'"><svg class="gi" viewBox="0 0 64 40" width="44" height="27.5" style="color:'+CC[cls]+'"><use href="#i-'+cls+'"/></svg><span class="lab2" style="color:'+(off?'var(--dim)':'var(--ink)')+'">'+(off?'none free':'add')+'</span></div>' };
      card='<div class="ah-pick" style="border-color:#45D4E8"><h4>Convoy</h4><div class="ah-line"><span>Crossing</span><b>63%</b></div><div class="ah-line"><span>Next hull</span><b style="color:var(--food)">+2%</b></div>'+
        '<div style="display:flex;gap:8px;margin-top:2px">'+g('courier')+g('hauler')+g('freighter',true)+'</div><div class="ah-line" style="margin-top:2px"><span>Hulls docked at Earth on the day</span></div></div>' }
    var ft='<div class="ah-fate" style="border-color:var(--food)"><div><b style="color:var(--food)">The ark sails</b><i>if the Night came today</i></div><span class="ah-yard" style="align-self:center">To the yard</span></div>';
    return '<div class="ah"><div class="ah-two"><div class="ah-l">'+sec('The ark · one hex — 100 people','convoy 14 / 36')+hold+lg+'</div><div class="ah-r">'+out+card+'</div></div>'+ft+'</div>' }
  function C1(){ return hive({}) } function C2(){ return hive({conv:true}) } function C3(){ return hive({byClass:true}) }

  /* Раунд 5 — итог решений Никиты 10.11: проснувшиеся = капсулы × доля флота в конвое; двигатель — только условие отлёта (процента нет);
     кольцо конвоя всегда 36 клеток, закрашено (суда в конвое) / (все суда флота, что летят и что стоят). Пример: флот 23 судна —
     12 в конвое у причала, 2 вызваны и летят домой, 5 у причала вне конвоя, 4 на линиях. Капсул 3 400 → проснутся 3 400 × 12/23. */
  function fin(o){ grab(); var r=19, cx=262, cy=236, s='', k=0, D=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]], selTo=o.ring?36:0, FLEET=23, IN=12, WAY=2, PIER=5, LINES=4;
    var fill=Math.round(36*IN/FLEET), way=Math.round(36*(IN+WAY)/FLEET), wk=Math.floor(BOUGHT*IN/FLEET), sl=ABOARD-wk;
    function ringCells(ring,fn){ var q=0, rr=-ring, i=0; for(var side=0;side<6;side++) for(var j=0;j<ring;j++,i++){ fn(cx+r*1.5*q,cy+r*S3*(rr+q/2),i); q+=D[side][0]; rr+=D[side][1] } }
    s+=hx(cx,cy,r-1.8,true,'core');
    for(var ring=1;ring<=4;ring++) ringCells(ring,function(x,y){ s+=hx(x,y,r-1.9,true,st(k,selTo)+(o.ring&&ring===3?' rsel':'')); k++ });
    ringCells(6,function(x,y,i){ var c='#45D4E8', on=i<fill, wy=!on&&i<way;
      s+='<polygon points="'+hp(x,y,r-1.9,true)+'" fill="'+(on?c:wy?'rgba(69,212,232,.28)':'none')+'" stroke="'+(on||wy?c:'rgba(69,212,232,.38)')+'" stroke-width="'+(o.conv?1.8:1)+'"/>' });
    var hold='<svg class="hold" viewBox="0 0 524 472" style="width:82%;margin:0 auto">'+s+'</svg>';
    var sw=function(fl,stk){ return '<svg width="16" height="14" viewBox="0 0 16 14" style="vertical-align:-2px;margin-right:5px"><polygon points="'+hp(8,7,7,true)+'" fill="'+fl+'" stroke="'+stk+'"/></svg>' };
    var lg='<div class="ah-line" style="justify-content:center;gap:20px"><span>'+sw('var(--ark)','var(--ark)')+'pod</span><span>'+sw('none','var(--dim)')+'no pod</span><span>'+sw('#45D4E8','#45D4E8')+'in the convoy</span><span>'+sw('rgba(69,212,232,.28)','#45D4E8')+'coming home</span></div>';
    var out='<div class="ah-big"><div style="background:rgba(61,220,132,.09)"><small>Wake</small><b style="color:var(--food);font-size:40px">'+num(wk)+'</b><i>if the Night came today</i></div><div><small>Sleep on</small><b style="color:var(--ark);font-size:40px">'+num(sl)+'</b><i>&nbsp;</i></div></div>';
    var card='<div class="ah-hint">Press the hive to buy pods.<br>Press the ring to man the convoy.</div>';
    if(o.conv) card='<div class="ah-pick" style="border-color:#45D4E8"><h4>Convoy</h4>'+
      '<div class="ah-line"><span>In the convoy</span><b>'+IN+' of '+FLEET+' hulls</b></div>'+
      '<div class="ah-alt"><span>At the pier</span><b style="font:500 13.5px var(--n);color:var(--ink)">'+PIER+'</b><span class="ah-yard" style="align-self:center">Add all</span></div>'+
      '<div class="ah-alt"><span>On the lines</span><b style="font:500 13.5px var(--n);color:var(--ink)">'+LINES+'</b><span class="ah-yard" style="align-self:center">Call home</span></div>'+
      '<div class="ah-alt"><span>Coming home</span><b style="font:500 13.5px var(--n);color:var(--ink)">'+WAY+'</b><span style="width:86px"></span></div></div>';
    if(o.ring){ var c=cost(BOUGHT,3600); card='<div class="ah-pick"><h4>Ring III</h4><div class="ah-line"><span>Price</span><div class="prow">'+pr('food',c.food)+pr('metal',c.metal)+'</div></div>'+
      '<div class="ah-line"><span>Pods</span><b>+200</b></div><div class="ah-line"><span>Rations</span><b style="color:var(--food)">last to the Night</b></div><div class="ah-go">Fill ring III</div></div>' }
    var ft='<div class="ah-fate" style="border-color:var(--food)"><div><b style="color:var(--food)">The ark sails</b><i>Ark drive Gen V — ready.</i></div><span class="lab2">if the Night came today</span></div>';
    return {html:'<div class="ah"><div class="ah-two"><div class="ah-l">'+sec('The ark · one hex — 100 people','convoy · the whole fleet fills the ring')+hold+lg+'</div><div class="ah-r">'+out+card+'</div></div>'+ft+'</div>',wk:wk,sl:sl} }
  function F1(){ return fin({}).html } function F2(){ return fin({conv:true}).html } function F3(){ return fin({ring:true}).html }
  function top3(){ var f=fin({}); return '<div class="am-top" id="amtop"><span>Wake · sleep on</span><span><b style="color:var(--food)">'+num(f.wk)+'</b> <b style="color:var(--dim)">·</b> <b style="color:var(--ark)">'+num(f.sl)+'</b></span></div>' }

  window.ARKHEX={css:css,H1:H1,H2:H2,H3:H3,H4:H4,H5:H5,H2a:H2a,H2b:H2b,C1:C1,C2:C2,C3:C3,F1:F1,F2:F2,F3:F3,top3:top3,top:top,top2:function(){ return top().replace('>'+num(wake)+'<','>'+num(Math.floor(BOUGHT*0.63))+'<') }};
})();
