/* SWEEP — «что будет, если константа K.X станет …». Прогон стилей ботов на каждом значении, таблица ушли-на-ковчеге.
   node tools/sweep.js K.NAME v1,v2,v3 [bots=rush,serial,ark] [years=4500] [seeds=11,22,33,44,55,66,77,88]
   Пример: node tools/sweep.js EARTH_BURN 0.8,1,1.2 rush,serial
   Константа правится в памяти, файл core.js не трогается. Первая строка — текущее значение (база). */
const {load,play}=require('./sim.js');
const [name,vals,bots='rush,serial,ark',years='4500',seedsS='11,22,33,44,55,66,77,88']=process.argv.slice(2);
if(!name||!vals){ console.log('usage: node tools/sweep.js K_NAME v1,v2,... [bots] [years] [seeds]'); process.exit(2) }
const key=name.replace(/^K\./,''); const seeds=seedsS.split(',').map(Number); const B=bots.split(',');
const base=load(process.env.CORE||'core.js').K[key];
if(base===undefined){ console.log('K.'+key+' не найдена'); process.exit(1) }
const list=[base].concat(vals.split(',').map(Number).filter(v=>v!==base));
console.log('K.'+key+' (база '+base+') · '+years+' лет · '+seeds.length+' сидов\nvalue\t'+B.map(b=>b+' sailed\t'+b+' souls\t'+b+' worlds').join('\t'));
for(const v of list){
  const cells=[];
  for(const b of B){
    const rows=seeds.map(sd=>{ const C=load(process.env.CORE||'core.js'); C.K[key]=v; return play(C,sd,+years,b) });
    const avg=f=>+(rows.reduce((a,r)=>a+f(r),0)/rows.length).toFixed(1);
    cells.push(rows.filter(r=>r.over==='night').length+'/'+seeds.length, avg(r=>r.souls), avg(r=>r.worlds));
  }
  console.log(v+(v===base?' (база)':'')+'\t'+cells.join('\t'));
}
