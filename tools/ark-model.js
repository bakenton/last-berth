/* ARK MODEL — дизайн ковчега акта 1 (design/ARK.md), 04.11.2026. Игру не меняет: правила ковчега подменяются в памяти,
   поверх work/core.js (функции, объявленные в конце исходника, перекрывают прежние), боты — tools/sim.js без правок.

   node tools/ark-model.js [variants=base,A,B,C] [bots=idle,greedy,rush,serial,ark,bank] [years=4500] [seeds=11,...,88]
   ARK_CSV=f.tsv — строки по забегам.

   Модель «воронка» (ARK.md §2):
     места      = отсеки × BERTHS          ← металл + топливо, цена k-го отсека растёт ×GROW
     на борту   = min(люди дома + экипажи у причала, места)
     долетят    = на борту × SURV[поколение двигателя − нужное]     ← детали (программа двигателя)
     проснутся  = min(долетят, еда на Земле в день Ночи / RATION)   ← еда, F-60
   Отсек строится BUILD лет, док один (очередь); отсек, который не успеет до Ночи, не продаётся ('arklate').

   Боты — sim.js как есть: их правило «следующий уровень, когда после покупки остаётся запас» работает и с отсеками
   (arkOwed/arkBuy держат прежний смысл «до уровня l»). Одно добавление: бот не покупает места сверх тех, кто вообще
   может сесть (люди дома + все экипажи + население колоний) — это число видно игроку на экране ковчега.
   Стиль hoard (копит в ковчег) — отдельная модель поверх стиля ark, см. hoardStep и ARK.md §6. */
const fs=require('fs'), path=require('path');
const SIM=require('./sim.js');
const CORE=fs.readFileSync(process.env.CORE||path.join(__dirname,'..','work','core.js'),'utf8');

/* варианты: цена отсека k (1..): metal = M0·GROW^(k−1), fuel = F0·GROW^(k−1) (детали не берёт: они у двигателя и конвоя); RATION — еды на одного проснувшегося */
const SV=[0.5,0.75,0.9,1.0];
const V={
  base:null,                                                                                   // v4.49 как есть
  A:{BERTHS:250, M0:2000, F0:0, GROW:1.05, BUILD:0,  RATION:3, SURV:SV},   // пологая: 20 отсеков (5000 мест) = 66k металла
  B:{BERTHS:250, M0:2000, F0:0, GROW:1.10, BUILD:0,  RATION:3, SURV:SV},   // средняя: 20 отсеков = 115k
  C:{BERTHS:250, M0:2000, F0:0, GROW:1.15, BUILD:0,  RATION:3, SURV:SV},   // крутая:  20 отсеков = 205k
  At:{BERTHS:250, M0:2000, F0:0, GROW:1.05, BUILD:40, RATION:3, SURV:SV},  // A + стройка 40 лет на отсек, док один
  Ar:{BERTHS:250, M0:2000, F0:0, GROW:1.05, BUILD:0,  RATION:8, SURV:SV},  // A + паёк 8 еды на проснувшегося
  /* 1-й заход (топливо в цене, F0 = M0/2): у serial к 2800 году кончалось топливо, рейсы вставали, Земля голодала к Ночи —
     serial 5/8 на B и C; см. ARK.md §4 */
  Af:{BERTHS:250, M0:2000, F0:1000, GROW:1.05, BUILD:0, RATION:3, SURV:SV},
};
for(const k of Object.keys(V)) if(process.env['ARK_'+k]) Object.assign(V[k],JSON.parse(process.env['ARK_'+k]));

/* новые правила — исходник дописывается в конец core.js; X — параметры варианта */
const RULES=`
function arkX(){ return K.ARK_X }
function arkPrice(l){ var X=arkX(), g=Math.pow(X.GROW,l-1); return {metal:Math.round(X.M0*g), parts:0, food:0, fuel:Math.round(X.F0*g)} }
function arkBuilt(G){ var d=G.ark.done||[], n=0; for(var i=0;i<d.length;i++) if(d[i]<=G.day) n++; return n }
function arkPaidN(G){ return (G.ark.done||[]).length }
function arkLevel(G){ return arkBuilt(G) }
function arkSeats(G){ return arkBuilt(G)*arkX().BERTHS }
function arkNextDone(G,k){ var d=G.ark.done||[], last=d.length?d[d.length-1]:G.day; return Math.max(G.day,last)+arkX().BUILD*k }
/* what blocks paidN+1..l cost; Infinity when the l-th cannot finish before the Night or when nobody could fill it (bot cap) */
function arkOwed(G,l){ var n=arkPaidN(G), o={metal:0,parts:0,food:0,fuel:0};
  if(l<=n) return o;
  if(G.night&&arkNextDone(G,l-n)>G.night) return {metal:1e12,parts:0,food:0,fuel:1e12};
  if(G.arkCapSeats!==undefined&&(l-1)*arkX().BERTHS>=G.arkCapSeats) return {metal:1e12,parts:0,food:0,fuel:1e12};
  for(var k=n+1;k<=l;k++){ var c=arkPrice(k); o.metal+=c.metal; o.fuel+=c.fuel } return o }
function arkCheck(G,l){ if(!G.night) return 'night'; if(l<=arkPaidN(G)) return 'arkhave';
  if(arkNextDone(G,l-arkPaidN(G))>G.night) return 'arklate'; return 'ok' }
function arkBuy(G,l){ var w=arkCheck(G,l); if(w!=='ok') return w;
  var o=arkOwed(G,l), E=G.earth; if(E.metal<o.metal) return 'metal'; if(E.fuel<o.fuel) return 'fuel';
  E.metal-=o.metal; E.fuel-=o.fuel; G.ark.paid.metal+=o.metal; G.ark.paid.fuel+=o.fuel;
  G.ark.done=G.ark.done||[]; while(arkPaidN(G)<l){ G.ark.done.push(arkNextDone(G,1)) }
  G.ark.lv=arkPaidN(G); log(G,'ark_bought',{l:l}); return 'ok' }
function arkPeople(G){ return Math.max(0,Math.floor(G.earth.people)+crewDocked(G)) }
function arkSouls(G){ return arkBuilt(G)>=1 ? Math.min(arkPeople(G),arkSeats(G)) : 0 }
function arkSurv(G){ if(!arkReady(G)) return 0; var X=arkX(); return X.SURV[Math.min(X.SURV.length-1,(G.driveLvl||0)-G.arkMark)] }
/* share of the boarded who wake: the crossing (drive) and the stores (food on Earth on the day / RATION) */
function arkWake(G){ var b=arkSouls(G); if(!b) return arkSurv(G); var s=b*arkSurv(G), f=Math.floor(G.earth.food/arkX().RATION); return Math.min(s,f)/b }
function arkCargo(G){ return null }
`;
/* sim.load reads a path; feed it a temp file so its export list stays the single source */
const os=require('os');
function coreFor(vn){
  const X=V[vn]; const src=X? CORE+'\n'+RULES : CORE;
  const f=path.join(os.tmpdir(),'ark-model-'+vn+'-'+process.pid+'.js'); fs.writeFileSync(f,src);
  const C=SIM.load(f); fs.unlinkSync(f);
  if(X){ C.K.ARK_X=X; C.K.ARK_LEVELS=new Array(60).fill({}); C.K.ARK_LVL_WAKE=[0] }
  return C;
}

/* «копит в ковчег» (hoard): решения стиля ark (рост стоит за 1200 лет до Ночи) + с HOARD_LEFT лет до Ночи (1500) каждые
   5 лет покупает столько отсеков, сколько оставляет Земле 150 лет своего расхода металла (+500) и 500 топлива — вместо
   «по одному в 10 лет при запасе 300 лет» у sim.js. Модель игрока, который видит счёт мест и платит в ковчег всё лишнее. */
const HOARD_LEFT=+(process.env.HOARD_LEFT||1500);   // за сколько лет до Ночи начинает копить
function hoardStep(C,G,d){
  if(!G.night) return; const left=C.nightLeft(G); if(left>HOARD_LEFT||d%5) return;
  const E=G.earth, need=G.need||{food:5,metal:3};
  for(let l=60;l>C.arkLevel(G);l--){ const o=C.arkOwed(G,l);
    if(E.metal-o.metal>=need.metal*150+500&&E.fuel-o.fuel>=500){ if(C.arkBuy(G,l)==='ok') break } }
}

function run(vn,bot,seed,years){
  const C=coreFor(vn), X=V[vn];
  const G=C.newGame(seed); const st={idleY:{},fuelHist:[]};
  const style=bot==='hoard'?'ark':bot;
  let ready=0, snap=null, people0=0;
  for(let d=0;d<years&&!G.over;d++){
    if(X&&G.night){ // the bot cap: seats nobody could fill are not bought
      let col=0; for(const k in G.colonies) col+=G.colonies[k].pop;
      G.arkCapSeats=Math.floor(G.earth.people)+C.leftBehind(G).hulls+crewDockedOf(C,G)+Math.round(col) }
    if(G.night&&C.nightLeft(G)===1) snap=snapOf(C,G,X);
    C.tick(G); G.pauseNow=false; SIM.step(C,G,style,d,st);
    if(bot==='hoard'&&X) hoardStep(C,G,d);
    if(!ready&&G.night&&C.arkReady(G)&&C.arkConvoy(G).ok&&C.arkLevel(G)>=1) ready=G.day;
  }
  const s=snap||snapOf(C,G,X);
  return {vn,bot,seed,over:G.over||'alive',night:G.night||0,ready, souls:G.over==='night'?(G.souls||0):0,
    boarded:G.boarded||0, ...s, sailed:G.over==='night'&&(G.souls||0)>0?1:0};
}
function crewDockedOf(C,G){ let n=0; for(const s of G.ships){ if(s.mode!=='dead'&&s.mode==='idle'&&s.at==='earth') n+=(s.crew||0) } return n }
function snapOf(C,G,X){
  const E=G.earth, nd=G.need||{food:1,metal:1};
  const people=Math.max(0,Math.floor(E.people)+crewDockedOf(C,G));
  const seats=X? C.arkLevel(G)*X.BERTHS : (C.arkLevel(G)>=1?people:0);
  return {people, seats, blocks:C.arkLevel(G), dg:G.arkMark!=null?(G.driveLvl||0)-G.arkMark:-9,
    food:Math.round(E.food), foodYrs:Math.round(E.food/Math.max(0.1,nd.food)), metal:Math.round(E.metal), parts:Math.round(E.parts), fuel:Math.round(E.fuel),
    paidM:Math.round(G.ark.paid.metal||0), paidP:Math.round(G.ark.paid.parts||0), paidF:Math.round(G.ark.paid.food||0), paidU:Math.round(G.ark.paid.fuel||0)};
}

if(require.main===module){
  const [vs='base,A,B,C',bs='idle,greedy,rush,serial,ark,bank',ys='4500',ss='11,22,33,44,55,66,77,88']=process.argv.slice(2);
  const seeds=ss.split(',').map(Number), rows=[];
  const avg=(R,f)=>Math.round(R.reduce((a,r)=>a+f(r),0)/Math.max(1,R.length));
  const med=(R,f)=>{ const a=R.map(f).sort((x,y)=>x-y); return a.length?a[a.length>>1]:0 };
  console.log(['var','bot','sailed','souls','min','max','boarded','people','seats','blocks','dgen','food@N','foodYrs','woken/food','metal@N','parts@N','fuel@N','paidM','paidFuel','night','ready','ready-N'].join('\t'));
  for(const vn of vs.split(',')) for(const b of bs.split(',')){
    const R=seeds.map(sd=>run(vn,b,sd,+ys)); rows.push(...R);
    const X=V[vn], sl=R.filter(r=>r.sailed);
    console.log([vn,b,sl.length+'/'+R.length,avg(R,r=>r.souls),Math.min(...R.map(r=>r.souls)),Math.max(...R.map(r=>r.souls)),avg(R,r=>r.boarded),avg(R,r=>r.people),avg(R,r=>r.seats),
      avg(R,r=>r.blocks),(R.reduce((a,r)=>a+Math.max(-1,r.dg),0)/R.length).toFixed(1),med(R,r=>r.food),med(R,r=>r.foodYrs),
      X?Math.round(100*R.reduce((a,r)=>a+Math.min(1,r.food/X.RATION/Math.max(1,r.boarded)),0)/R.length)+'%':'-',
      med(R,r=>r.metal),med(R,r=>r.parts),med(R,r=>r.fuel),avg(R,r=>r.paidM),avg(R,r=>r.paidU),avg(R,r=>r.night),
      sl.length?avg(sl.filter(r=>r.ready),r=>r.ready):0, sl.length?avg(sl.filter(r=>r.ready),r=>r.night-r.ready):0].join('\t'));
  }
  if(process.env.ARK_CSV){ const K=Object.keys(rows[0]); fs.writeFileSync(process.env.ARK_CSV,[K.join('\t')].concat(rows.map(r=>K.map(k=>r[k]).join('\t'))).join('\n')+'\n') }
}
module.exports={V,run,coreFor};
