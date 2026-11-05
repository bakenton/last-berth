/* FOOD-SWEEP (F-60, итерация 6): варианты «куда девать лишнюю еду» на ботах. Файл core.js не трогается — правки в памяти.
   node tools/food-sweep.js [bots=rush,serial,ark,bank,idle,greedy] [years=4500] [seeds=11,...,88] [variants=base,spoil,farm,eat,arkfood,births]
   Колонки: ушли/сидов · души · год Ночи · еда к концу · лет еды к концу · мин. лет еды после 500 года · уровень ковчега · голод (лет с еды <10 лет запаса). */
const {load,play}=require('./sim.js');
const [botsS='rush,serial,ark,bank,idle,greedy',years='4500',seedsS='11,22,33,44,55,66,77,88',varS='base,spoil,farm,eat,arkfood,births']=process.argv.slice(2);
const B=botsS.split(','), seeds=seedsS.split(',').map(Number);
const VARS={
  base:   {desc:'v4.49', set:()=>{}},
  spoil:  {desc:'порча: сверх 150 лет запаса −3%/год излишка', set:()=>{}, spoil:{years:150,rate:0.03}},
  farm:   {desc:'FARM_RATE 0.55→0.40 — константа в ядре не используется, эффекта нет; фермы ×0.7 — CORE с правкой', set:K=>{K.FARM_RATE=0.40}},
  eat:    {desc:'EARTH_EAT 3.4→4.4 (Земля ест +29%)', set:K=>{K.EARTH_EAT=4.4}},
  arkfood:{desc:'уровни ковчега II–IV: еда ×4, металл ×0.35', set:K=>{K.ARK_FOOD_X=4; K.ARK_LEVELS=K.ARK_LEVELS.map((L,i)=>i?Object.assign({},L,{metal:Math.round(L.metal*0.35)}):L)}},
  births: {desc:'рождаемость до ×2.0 (FED_MAX 1.5→2.0, 120 лет запаса)', set:K=>{K.FED_MAX=2.0}},
  spoil2: {desc:'порча мягкая: сверх 300 лет запаса −1%/год излишка', set:()=>{}, spoil:{years:300,rate:0.01}},
  eat2:   {desc:'EARTH_EAT 3.4→3.7 (Земля ест +9%)', set:K=>{K.EARTH_EAT=3.7}},
  feast2: {desc:'«Рацион роста» мягкий: ест ×1.25, рождаемость до ×1.75; вкл ≥300 лет, выкл <200', set:()=>{}, feast:{on:300,off:200,eat:0.25,max:1.75}},
  feast:  {desc:'переключатель «Рацион роста»: Земля ест ×1.5, рождаемость до ×2.0; бот вкл при ≥150 лет запаса, выкл при <100', set:()=>{}, feast:{on:150,off:100,eat:0.5,max:2.0}}
};
const names=varS.split(',');
console.log('years '+years+' · seeds '+seeds.length);
for(const vn of names){ const V=VARS[vn]; console.log('\n== '+vn+' — '+V.desc+'\nbot\tsailed\tsouls\tnight@\tfoodEnd\tyrsEnd\tminYrs500\tarkLv\thungryYrs');
  for(const b of B){
    const rows=seeds.map(sd=>{ const C=load(process.env.CORE||'core.js'); V.set(C.K); let minY=1e9, hungry=0;
      const t0=C.tick; C.tick=function(G){ t0(G); const nd=(G.need||C.earthNeed(G)).food||1, y=G.earth.food/Math.max(0.1,nd);
        if(V.spoil&&y>V.spoil.years){ const ex=G.earth.food-V.spoil.years*nd; G.earth.food-=ex*V.spoil.rate }
        if(V.feast){ const F=V.feast; if(!G._feast&&y>=F.on) G._feast=true; else if(G._feast&&y<F.off) G._feast=false;
          C.K.FED_MAX=G._feast?F.max:1.5; if(G._feast){ G.earth.food=Math.max(0,G.earth.food-F.eat*nd); G._feastY=(G._feastY||0)+1 } }
        if(G.day>=500&&!G.over){ if(y<minY) minY=y; if(y<10) hungry++ } };
      let end=null; const r=play(C,sd,+years,b,G=>{ end={food:G.earth.food, y:G.earth.food/Math.max(0.1,(G.need||C.earthNeed(G)).food||1), lv:C.arkLevel(G)} });
      return Object.assign(r,{foodEnd:end.food,yrsEnd:end.y,minY:minY===1e9?0:minY,lv:end.lv,hungry}) });
    const avg=f=>+(rows.reduce((a,r)=>a+f(r),0)/rows.length).toFixed(1);
    console.log([b, rows.filter(r=>r.over==='night').length+'/'+rows.length, avg(r=>r.souls), avg(r=>r.night), Math.round(avg(r=>r.foodEnd)), Math.round(avg(r=>r.yrsEnd)), Math.round(avg(r=>r.minY)), avg(r=>r.lv), avg(r=>r.hungry)].join('\t'));
  }
}
