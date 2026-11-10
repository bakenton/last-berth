// Бот взлома: доля побед по уровням для змея (взлом двигателя) и улья (взлом ковчега). Запуск из корня: node tools/hack-bot.js [сидов=30] [уровни=1,2,3,4,5,6]
// Бот простой и один на оба режима — цифры годятся для сравнения уровней между собой, а не как оценка живого игрока:
// целится в ближайшую оранжевую пулю, иначе в цель модуля (LBhack.targets); уходит от пуль поперёк их хода, от мелочи и ячеек — прочь,
// для змея идёт по LBhack.way (точка, откуда виден хвост), для улья держится внизу поля и ходит из стороны в сторону.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright'); const UI=require('./pw-ui.js');
const N=+(process.argv[2]||30), LV=(process.argv[3]||'1,2,3,4,5,6').split(',').map(Number);
(async()=>{ const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined}); const p=await UI.newPage(b); const U=UI.ui(p);
  await U.start('en',11,{hack:true});
  const res=await p.evaluate(({N,LV})=>{
    const bot=(G,input)=>{ const m=G.me; let ax=0, ay=0, aim=null, bd=1e9;
      for(const bl of G.bul){ const d=Math.hypot(bl.x-m.x,bl.y-m.y); if(d<170){ const s=Math.hypot(bl.vx,bl.vy)||1, px=-bl.vy/s, py=bl.vx/s, side=((m.x-bl.x)*px+(m.y-bl.y)*py)>=0?1:-1, w=(170-d)/170*2.2; ax+=px*side*w; ay+=py*side*w; if(bl.k==='o'&&d<140&&d<bd){ bd=d; aim=[bl.x,bl.y] } } }
      for(const e of G.en){ const d=Math.hypot(e.x-m.x,e.y-m.y), R=e.kind==='cell'||e.kind==='core'?95:e.kind==='head'||e.kind==='seg'?150:120; if(d<R){ const w=(R-d)/R*2.6; ax+=(m.x-e.x)/(d||1)*w; ay+=(m.y-e.y)/(d||1)*w } }
      if(!aim){ const ts=LBhack.targets(); if(ts.length) aim=[ts[0].x,ts[0].y] }
      if(G.hive){ const tx=G.WW/2+Math.sin(G.t*.9)*G.WW*.3, ty=G.WH-95; ax+=(tx-m.x)/160; ay+=(ty-m.y)/120 }
      else { const w=LBhack.way(G); if(w){ const d=Math.hypot(w[0]-m.x,w[1]-m.y)||1; ax+=(w[0]-m.x)/d*.9; ay+=(w[1]-m.y)/d*.9 } }
      if(m.x<40) ax+=1; if(m.x>G.WW-40) ax-=1; if(m.y<40) ay+=1; if(m.y>G.WH-40) ay-=1;
      input.mx=ax; input.my=ay; if(aim){ input.ax=aim[0]; input.ay=aim[1] } };
    const out={};
    for(const kind of ['serpent','hive']) for(const lv of LV){ let won=0, t=0, hp=0, to=0;
      for(let s=1;s<=N;s++){ const r=LBhack.sim(lv,s*7919+lv,bot,150,kind); if(r.r==='won'){ won++; t+=r.t; hp+=r.hp } else if(r.r==='timeout') to++ }
      out[kind+' '+lv]={won,of:N,timeout:to,avgT:won?+(t/won).toFixed(1):null,avgHp:won?+(hp/won).toFixed(1):null} }
    return out },{N,LV});
  console.log('режим ур.\tпобед\tтаймаут\tсреднее время победы, с\tжизней осталось');
  for(const k in res){ const r=res[k]; console.log(k+'\t'+r.won+'/'+r.of+'\t'+r.timeout+'\t'+r.avgT+'\t'+r.avgHp) }
  console.log('errs',p.errs.length,p.errs.join(' | ').slice(0,300)); await b.close() })().catch(e=>{ console.log('ERR',String(e&&e.stack||e).slice(0,600)); process.exit(1) });
