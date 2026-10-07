/* HORIZON-CHECK — проверка прогноза еды (v4.28, F-11) на ботах ядра.
   node tools/horizon-check.js [years=4500] [seeds=11,22,33,44,55,66,77,88]      (из work/; core.js рядом)
   Для каждого бота и сида: когда журнал впервые сказал «у кладовых появилась дата» (food_horizon), когда Земля
   впервые осталась без провизии (hungry) и чем кончилось. Хотим: idle/greedy — предупреждение за ≥ K.FOOD_HORIZON лет
   до голода (не ложь); rush/serial/ark/bank — если предупреждение было, то голода либо нет, либо он позже, и доля лет
   «под предупреждением» мала (не крик волка). Ничего не правит. */
const {load,step}=require('./sim.js');
const [years=4500,seedsArg='11,22,33,44,55,66,77,88']=process.argv.slice(2);
const seeds=seedsArg.split(',').map(Number);
const bots=(process.env.BOTS?process.env.BOTS.split(','):['idle','greedy','rush','serial','ark','bank']);
const C=load(process.env.CORE||'core.js');
const H=C.K.FOOD_HORIZON;
console.log('(warn@ = journal pause food_horizon, from K.FOOD_PAUSE_FROM='+C.K.FOOD_PAUSE_FROM+'; warnYrs = years the advisor line was on)');
console.log('bot\tseed\twarn@\thungry@\tlead\tend\tend@\twarnYrs\tworst(lead)');
const agg={};
for(const bot of bots){
  const a=agg[bot]={n:0,warned:0,hungry:0,leadOk:0,leads:[],warnShare:[]};
  for(const sd of seeds){
    const G=C.newGame(sd); const st={idleY:{},fuelHist:[]};
    let warnAt=null, hungryAt=null, warnYrs=0, worstLead=null;
    for(let d=0;d<+years&&!G.over;d++){
      C.tick(G); G.pauseNow=false; step(C,G,bot,d,st);
      if(C.foodShort(G)) warnYrs++;
      if(warnAt===null){ const e=G.log.find(e=>e.code==='food_horizon'); if(e) warnAt=e.day }
      if(hungryAt===null&&G.hungry) hungryAt=G.day;
    }
    const lead=(warnAt!==null&&hungryAt!==null)?hungryAt-warnAt:null;
    a.n++; if(warnAt!==null) a.warned++; if(hungryAt!==null) a.hungry++;
    if(lead!==null){ a.leads.push(lead); if(lead>=H*0.8) a.leadOk++ }
    a.warnShare.push(warnYrs/Math.max(1,G.day));
    console.log([bot,sd,warnAt??'-',hungryAt??'-',lead??'-',G.over||'alive',G.day,warnYrs,''].join('\t'));
  }
}
console.log('\nbot\twarned\thungry\tlead≥'+Math.round(H*0.8)+'\tlead min/avg\twarn share of run');
for(const b of bots){ const a=agg[b]; const avg=x=>x.length?Math.round(x.reduce((s,v)=>s+v,0)/x.length):'-';
  console.log([b,a.warned+'/'+a.n,a.hungry+'/'+a.n,a.leadOk+'/'+a.leads.length,(a.leads.length?Math.min(...a.leads):'-')+'/'+avg(a.leads),(avg(a.warnShare.map(v=>v*100))+'%')].join('\t')) }
