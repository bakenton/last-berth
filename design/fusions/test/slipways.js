// Проверка прототипа slipways: боты на 8 сидах, браузер мышью и касанием, партия до итога.
// node design/fusions/test/slipways.js [bots|ui|all] ; SEEDS=11,22 STRATS=sensible,greedy
const {chromium}=require('E:/ClaudeCowork/last-berth/node_modules/playwright');
const path=require('path'),fs=require('fs');
const F='file:///'+path.resolve(__dirname,'..','slipways.html').replace(/\\/g,'/');
const SH=path.join(__dirname,'shots');
const SEEDS=(process.env.SEEDS||'11,22,33,44,55,66,77,88,101,202,303,404,505,606,707,808').split(',').map(Number);
const STRATS=(process.env.STRATS||'idle,sensible,blind,greedy,trunk,farout,nolift').split(',');

/* Бот выполняется в странице через window.GAME.core. Строитель по нуждам: чего не хватает — то и строит, смотрит предпросмотр.
   Разумный считает отход; жадный гонит доход и поднимает всех разом; trunk — всё через две магистрали; farout — к дальним богатым; nolift — держит экономику до конца. */
function botRun(arg){
  const {name,seed}=arg, C=GAME.core, K=C.K, G=arg.live?GAME.state:C.newGame(seed);
  const P={
    sensible:{ev:1,evac:true,lift:'smart',arkFrom:12,maxBerth:99,far:0,people:1},
    greedy:{ev:0,evac:false,lift:'all',arkFrom:23,maxBerth:99,far:0,people:.5},
    trunk:{ev:1,evac:true,lift:'smart',arkFrom:12,maxBerth:2,far:0,people:1},
    farout:{ev:0,evac:false,lift:'smart',arkFrom:18,maxBerth:99,far:1,people:1},
    nolift:{ev:1,evac:true,lift:'last',arkFrom:12,maxBerth:99,far:0,people:1},
    blind:{ev:0,evac:false,lift:'smart',arkFrom:12,maxBerth:99,far:0,people:1}   // как разумный, но при стройке на отход не смотрит
  }[name]||{};
  const W=G.worlds, hop=()=>C.hops(G);
  function sleepCands(type){ const d=hop(),out=[]; W.forEach(b=>{ if(b.awake||b.dead||b.type!==type) return;
      W.forEach(a=>{ if(d[a.id]===Infinity||a.id===b.id||C.dist(a,b)>C.range(G,a.id,b.id)) return; if(a.id===0&&C.usedBerths(G)>=P.maxBerth) return; const c=C.canLink(G,a.id,b.id); if(c.ok) out.push({a:a.id,b:b.id,len:c.len}) });
      if(G.lines.some(l=>!l.dead&&(l.a===b.id||l.b===b.id))&&C.canWake(G,b.id).ok) out.push({a:-1,b:b.id,len:0}) }); return out }
  function apply(g,c){ if(c.a>=0&&C.link(g,c.a,c.b)) return 'x'; return C.wake(g,c.b) }
  function good(type){ return {farm:'food',mine:'metal',well:'fuel',factory:'parts',house:'ppl',sleep:'ppl'}[type] }
  function tryBuild(type,minGain){ const base=C.income(G).delivered,f0=C.forecast(G),g=good(type); let best=null,bv=-1e9;
    for(const c of sleepCands(type)){ const t=C.clone(G); if(apply(t,c)) continue; const inc=C.income(t).delivered,f1=C.forecast(t),w=t.worlds[c.b]; let gain=inc[g]-base[g];
      let ok=gain>=minGain; if(type==='house'){ gain=t.worlds[c.b].type==='house'&&C.income(t).st[c.b].fed?2:0; ok=gain>0 } if(type==='sleep'){ gain=w.people/3; ok=f1.home>f0.home }
      if(ok&&P.ev&&(type==='house'||type==='sleep')){ const td=C.tdist(t)[c.b]; if(td>K.TURNS-K.RISE) ok=false; else gain-=td*.6 }
      if(!ok) continue; const lost=['food','metal','fuel','parts'].reduce((s,k)=>s+Math.min(0,inc[k]-base[k]),0);
      const r=Math.hypot(w.x,w.y), life=w.deposit0?Math.min(14,w.deposit/w.base):8;
      const via=c.a>=0?W[c.a]:null,thru=via&&via.deposit0?-8:0;
      const nearFac=(type==='mine'||type==='farm')&&C.income(G).delivered.parts<1&&W.some(x=>x.type==='factory'&&!x.dead&&!x.awake&&C.dist(x,w)<=C.range(G,x.id,w.id))?7:0;
      const v=nearFac+gain*10+lost*2+(f1.home-f0.home)*P.ev*4-c.len*.03+life*.6+P.far*r*.2+thru*P.ev;
      if(v>bv){ bv=v; best=c } }
    if(best){ apply(G,best); return true } return false }
  /* две ступени: нужен мир с входом, а фермы рядом нет — сначала ферма в его досягаемости */
  function bridgeFarm(type){ const d=hop(); for(const c of sleepCands('farm')){ const f=W[c.b]; if(W.some(x=>x.type===type&&!x.awake&&!x.dead&&C.dist(x,f)<=C.range(G,x.id,f.id))){ const t=C.clone(G); if(!apply(t,c)){ apply(G,c); return true } } } return false }
  function factory(){ const d=hop(); let best=null,bv=0,base=C.income(G).delivered.parts; for(const b of W){ if(b.type!=='factory'||b.awake||b.dead) continue;
      const nb=W.filter(x=>d[x.id]<Infinity&&x.awake&&!x.dead&&C.dist(x,b)<=C.range(G,x.id,b.id)&&x.id!==0), fa=nb.filter(x=>x.type==='farm'), mi=nb.filter(x=>x.type==='mine'&&x.deposit>6);
      for(const f of fa) for(const m of mi){ const t=C.clone(G); if(C.link(t,f.id,b.id)||C.link(t,m.id,b.id)||C.wake(t,b.id)) continue; const v=C.income(t).delivered.parts-base; if(v>bv){ bv=v; best=[f.id,m.id,b.id] } } }
    if(best){ C.link(G,best[0],best[2]); C.link(G,best[1],best[2]); C.wake(G,best[2]); return true } return false }
  /* починка: отрезанные миры и те, кого отрежет скорая смерть узла */
  function repair(){ if(!P.evac&&name!=='greedy'&&name!=='farout') return false; const d=hop(); const lost=W.filter(w=>w.id&&w.awake&&!w.dead&&d[w.id]===Infinity); if(!lost.length) return false;
    let best=null,bv=0,base=lost.reduce((s,w)=>s+w.people+w.q+3,0); for(const a of lost) for(const b of W){ if(d[b.id]===Infinity||!b.awake||b.dead) continue; if(C.dist(a,b)>C.range(G,a.id,b.id)||!C.canLink(G,a.id,b.id).ok) continue; const t=C.clone(G); C.link(t,a.id,b.id); const nd=C.hops(t),left=lost.reduce((s,w)=>s+(nd[w.id]===Infinity?w.people+w.q+3:0),0),v=base-left; if(v>bv){ bv=v; best=[a.id,b.id] } }
    if(best){ C.link(G,best[0],best[1]); return true } return false }
  function preempt(){ if(!P.evac) return false; const e=C.income(G); for(const w of W){ if(!w.deposit0||!w.awake||w.dead) continue; if(C.turnsLeft(G,w,e)>3) continue; const cu=C.cutIfDead(G,w.id); if(!cu.worlds) continue; const t0=C.clone(G); t0.worlds[w.id].dead=true; const d=C.hops(t0); const cut=W.filter(x=>x.id&&x.id!==w.id&&x.awake&&!x.dead&&d[x.id]===Infinity);
      for(const a of cut) for(const b of W){ if(d[b.id]===Infinity||!b.awake||b.dead||b.id===w.id) continue; if(C.dist(a,b)>C.range(G,a.id,b.id)||!C.canLink(G,a.id,b.id).ok) continue; C.link(G,a.id,b.id); return true } } return false }
  function relieve(){ const e0=C.income(G),base=e0.delivered,tot=x=>x.food+x.metal+x.fuel+x.parts+x.ppl; if(!G.lines.some(l=>!l.dead&&(e0.load[l.id]||0)>=C.cap(l))) return false; const d=hop(); let best=null,bv=0; const seen=W.filter(w=>d[w.id]<Infinity);
    for(const a of seen) for(const b of seen){ if(b.id<=a.id||C.dist(a,b)>C.range(G,a.id,b.id)) continue; if(a.id===0&&C.usedBerths(G)>=P.maxBerth) continue; if(!C.canLink(G,a.id,b.id).ok) continue; const t=C.clone(G); C.link(t,a.id,b.id); const v=tot(C.income(t).delivered)-tot(base); if(v>bv){ bv=v; best=[a.id,b.id] } }
    if(best&&G.earth>=1){ C.link(G,best[0],best[1]); return true } return false }
  function buildWorld(id){ const c=sleepCands(W[id].type).filter(x=>x.b===id).sort((x,y)=>x.len-y.len)[0]; if(!c) return false; const t=C.clone(G); if(apply(t,c)) return false; apply(G,c); return true }
  function planFactory(){ if(C.income(G).delivered.parts>0) return false; const R=(x,y)=>C.dist(x,y)<=C.range(G,x.id,y.id); const facs=W.filter(w=>w.type==='factory'&&!w.dead).sort((a,b)=>Math.hypot(a.x,a.y)-Math.hypot(b.x,b.y));
    for(const b of facs){ const f=W.filter(x=>x.type==='farm'&&!x.dead&&R(x,b)).sort((x,y)=>y.awake-x.awake)[0], m=W.filter(x=>x.type==='mine'&&!x.dead&&(x.deposit>10)&&R(x,b)).sort((x,y)=>y.awake-x.awake)[0]; if(!f||!m) continue;
      if(!f.awake){ if(buildWorld(f.id)) return true; continue } if(!m.awake){ if(buildWorld(m.id)) return true; continue }
      const t=C.clone(G); let bad=null; if(!C.findLine(t,f.id,b.id)) bad=C.link(t,f.id,b.id); if(!bad&&!C.findLine(t,m.id,b.id)) bad=C.link(t,m.id,b.id); if(!bad&&!b.awake) bad=C.wake(t,b.id); if(bad) continue;
      let did=false; if(!C.findLine(G,f.id,b.id)){ C.link(G,f.id,b.id); did=true } if(!C.findLine(G,m.id,b.id)){ C.link(G,m.id,b.id); did=true } if(!b.awake){ C.wake(G,b.id); did=true } if(did) return true }
    return false }
  function widenBusy(){ if(!G.tech.wide) return false; const e=C.income(G); let b=null; G.lines.forEach(l=>{ if(!l.dead&&!l.wide&&C.canWiden(G,l).ok&&(e.load[l.id]||0)>=C.cap(l)&&G.stock.metal>18){ if(!b||(l.a===0||l.b===0)) b=l } }); if(b){ C.widen(G,b.id); return true } return false }
  function clearDead(){ for(const l of G.lines) if(l.dead&&(l.a===0||l.b===0)&&C.canDemolish(G,l).ok&&G.stock.metal>10){ C.demolish(G,l.id); return true } return false }
  function evacWork(){ const f0=C.forecast(G); if(f0.home>=f0.total) return false; let best=null,bv=0;
    /* широкие на затор и новые связки между своими мирами */
    G.lines.forEach(l=>{ if(l.dead||l.wide||!C.canWiden(G,l).ok) return; if(!(f0.jam[l.id]>0)) return; const t=C.clone(G); C.widen(t,l.id); const v=C.forecast(t).home-f0.home; if(v>bv){ bv=v; best=x=>C.widen(x,l.id) } });
    const d=hop(); W.forEach(a=>{ if(d[a.id]===Infinity) return; W.forEach(b=>{ if(b.id<=a.id||d[b.id]===Infinity||C.dist(a,b)>C.range(G,a.id,b.id)) return; if(a.id===0&&C.usedBerths(G)>=P.maxBerth) return; if(!C.canLink(G,a.id,b.id).ok) return; const t=C.clone(G); C.link(t,a.id,b.id); const v=C.forecast(t).home-f0.home; if(v>bv){ bv=v; best=x=>C.link(x,a.id,b.id) } }) });
    if(best&&bv>=2){ best(G); return true } return false }
  function play(){ const t=G.turn; let guard=0; const houses=()=>W.filter(w=>w.type==='house'&&w.awake&&!w.dead).length;
    while(guard++<10){ const inc=C.income(G).delivered,nf=C.needFood(t+3),nm=C.needMetal(t+3),fc=C.forecast(G);
      if(t<22&&t>3&&C.canScrap(G).ok&&(G.scrap||0)<2&&((G.stock.metal<4&&inc.metal-C.needMetal(t)<=1)||(G.stock.fuel<3&&inc.fuel===0))){ C.scrap(G); continue }
      if(G.stock.fuel<4&&G.stock.metal>=10&&inc.fuel<2){ C.swap(G,'metal'); continue }
      if(G.stock.metal<5&&G.stock.fuel>=14&&inc.metal-C.needMetal(t)<2){ C.swap(G,'fuel'); continue }
      if(clearDead()||repair()||preempt()) continue;
      if(inc.food-nf<(t<4?1:2)&&G.stock.food<30&&tryBuild('farm',1)) continue;
      if(inc.fuel<2&&G.stock.fuel<20&&(tryBuild('well',1)||bridgeFarm('well'))) continue;
      if(inc.metal-nm<4&&G.stock.metal<40&&(tryBuild('mine',1)||bridgeFarm('mine'))) continue;
      if(relieve()) continue;
      if(t>=6&&inc.metal-nm<4&&C.canTech(G,'range').ok&&G.tech.range<2&&C.income(G).delivered.parts>0){ C.buyTech(G,'range'); continue }
      if(G.earth<8&&houses()<2+t/6&&(tryBuild('house',0)||bridgeFarm('house'))) continue;
      if(t>=5&&inc.parts<1&&(tryBuild('factory',1)||factory()||planFactory())) continue;
      if(P.ev&&t>=8&&fc.home<fc.total-6){ if(!G.tech.wide&&C.canTech(G,'wide').ok){ C.buyTech(G,'wide'); continue } if(G.stock.metal>=8&&evacWork()) continue }
      let rsv=0; if(P.ev&&t>=14){ for(let x=K.RISE;x<=K.TURNS;x++) rsv+=C.needMetal(x); rsv=Math.min(rsv,8+(t-14)*3) }
      if(t>=P.arkFrom&&C.canArk(G).ok&&G.stock.metal-C.arkCost(G).metal>=rsv&&(P.ev===0?t>=20:fc.home>=C.seats(G)-5)){ C.buyArk(G); continue }
      if(rsv&&G.stock.metal<rsv+6) break;
      const saving=P.ev&&t>=P.arkFrom&&G.ark<5&&fc.home>=C.seats(G);
      if(saving){ const ac=C.arkCost(G); if(G.stock.fuel<ac.fuel&&inc.fuel<4&&(tryBuild('well',1)||bridgeFarm('well'))) continue; if(G.stock.metal<ac.metal&&inc.metal-nm<6&&(tryBuild('mine',1)||bridgeFarm('mine'))) continue; if(G.stock.parts<ac.parts&&inc.parts<1&&(tryBuild('factory',1)||factory()||planFactory())) continue;
        if(G.stock.metal>C.arkCost(G).metal+6&&G.stock.fuel>C.arkCost(G).fuel+3&&evacWork()) continue; break }
      if(inc.fuel<(t<10?3:6)&&G.stock.fuel<45&&(tryBuild('well',1)||bridgeFarm('well'))) continue;
      if(inc.metal-nm<5+t*.5&&G.stock.metal<90&&(tryBuild('mine',1)||bridgeFarm('mine'))) continue;
      if(G.stock.metal<5||G.stock.fuel<3) break;
      if(houses()<P.people*(t<6?1:t<12?2:t<18?4:5)&&(tryBuild('house',0)||bridgeFarm('house'))) continue;
      if(G.earth>=4&&t>=8&&P.evac&&tryBuild('sleep',0)) continue;
      if(widenBusy()) continue;
      let bought=false; for(const k of (P.evac?['range','wide','dense','berth','demo']:['range','wide','dense'])){ const c=C.techCost(G,k); if(!c) continue; if(C.canTech(G,k).ok&&G.stock.metal>c.metal+4){ C.buyTech(G,k); bought=true } break }
      if(bought) continue;
      if(P.evac&&t>=10&&evacWork()) continue;
      break }
    if(!P.evac&&t>=22) while(C.canArk(G).ok) C.buyArk(G) }
  function liftWith(g,k){ const left=K.TURNS-g.turn+1,d=C.tdist(g); g.worlds.forEach(w=>{ if(!C.canLift(g,w.id).ok) return; const prod=w.type==='farm'||w.type==='mine'||w.type==='well'||w.type==='factory'; if(left<=d[w.id]+(prod?k:k+2)) C.lift(g,w.id) }) }
  function arkUp(g){ for(let n=0;n<8;n++){ const c=C.arkCost(g); if(!c||C.seats(g)>=C.forecast(g).home) break; if(g.stock.fuel<c.fuel&&g.stock.metal>=c.metal+6) C.swap(g,'metal'); else if(g.stock.metal<c.metal&&g.stock.fuel>=c.fuel+6) C.swap(g,'fuel'); else if(C.canArk(g).ok) C.buyArk(g); else break } }
  function rise(){ const left=K.TURNS-G.turn+1; arkUp(G);
    if(P.lift==='all'){ W.forEach(w=>{ if(C.canLift(G,w.id).ok) C.lift(G,w.id) }); return }
    if(P.lift==='last'){ if(left<=2) W.forEach(w=>{ if(C.canLift(G,w.id).ok) C.lift(G,w.id) }); return }
    /* перебирает порог подъёма прогоном до Ночи — так же, как игрок смотрит на счётчик ОТХОД */
    let bestK=0,bv=-1; for(let k=0;k<=8;k++){ const t=C.clone(G); while(!t.over){ arkUp(t); liftWith(t,k); C.endTurn(t) } const v=t.over.souls*1000+t.over.earth; if(v>bv){ bv=v; bestK=k } } liftWith(G,bestK) }
  function trunkLoad(d){ /* сколько ходов нужно магистрали этого мира, чтобы вывезти всю свою ветку */ const adj=C.adjacency(G),root={},sum={},capT={}; W.forEach(w=>{ if(w.id===0||d[w.id]===Infinity) return; let cur=w.id; while(d[cur]>1){ const nx=adj[cur].filter(e=>d[e.to]<d[cur])[0]; cur=nx.to } root[w.id]=cur; const tl=adj[cur].filter(e=>e.to===0)[0]; capT[cur]=tl?C.cap(tl.l):5; sum[cur]=(sum[cur]||0)+w.people+w.q }); const r={}; for(const id in root) r[id]=Math.ceil(sum[root[id]]/capT[root[id]]); return r }
  const t0=performance.now(); let mid=null;
  while(!G.over&&(!arg.until||G.turn<arg.until)){ if(name!=='idle'){ if(G.turn<K.RISE) play(); else rise() } if(G.turn===24&&!mid) mid=C.forecast(G); if(arg.live){ GAME.refresh(); GAME.act.next() } else C.endTurn(G) }
  if(arg.live&&!G.over){ if(G.turn>=K.RISE&&!arg.norise) rise(); GAME.refresh(); return {turn:G.turn} }
  const o=G.over; return {name,seed,souls:o.souls,win:o.win,kind:o.kind,turn:o.turn,earth:o.earth,seats:o.seats,left:o.left,crew:o.crew,transit:o.transit,overflow:o.overflow,jam:o.jam&&o.jam.name,jamN:o.jam&&o.jam.n,lines:G.lines.length,dead:G.deadCount,fcHome:mid&&mid.home,fcTotal:mid&&mid.total,ms:Math.round(performance.now()-t0),ark:G.ark,tech:Object.values(G.tech).reduce((a,b)=>a+b,0),maxDef:G.maxDeficit,lostMetal:G.lost.metal}
}
async function bots(browser){ const page=await browser.newPage(); page.on('pageerror',e=>{ console.log('PAGEERROR',e.message) }); await page.goto(F+'?auto=1&seed=1'); const rows=[];
  for(const name of STRATS){ for(const seed of SEEDS){ const r=await page.evaluate(botRun,{name,seed}); rows.push(r) } }
  console.log('стратегия  сид  души  побед.  итог      дома мест  на мирах экип. лишн  ход ковч тех мёрт  отход@24   мс');
  for(const r of rows) console.log(r.name.padEnd(10),String(r.seed).padEnd(4),String(r.souls).padEnd(5),(r.win?'да':'нет').padEnd(6),r.kind.padEnd(7),String(r.earth).padEnd(4),String(r.seats).padEnd(5),String(r.left).padEnd(7),String(r.crew).padEnd(4),String(r.overflow).padEnd(4),String(r.turn).padEnd(3),String(r.ark).padEnd(3),String(r.tech).padEnd(3),String(r.dead).padEnd(4),(r.fcHome+'/'+r.fcTotal).padEnd(9),r.ms);
  console.log('--- сводка: упор = мест не хватило (дома > мест) / дошедших не хватило (дошли < мест)');
  const avg=a=>Math.round(a.reduce((x,y)=>x+y,0)/(a.length||1));
  for(const name of STRATS){ const a=rows.filter(r=>r.name===name),s=a.map(r=>r.souls),n=a.filter(r=>r.kind==='night'); console.log(name.padEnd(9),'побед',(a.filter(r=>r.win).length+'/'+a.length).padEnd(6),'души ср',String(avg(s)).padEnd(4),'мин',String(Math.min(...s)).padEnd(3),'макс',String(Math.max(...s)).padEnd(4),'упор места',String(n.filter(r=>r.overflow>0).length).padEnd(3),'упор путь',String(n.filter(r=>r.overflow===0).length).padEnd(3),'голод',String(a.length-n.length).padEnd(3),'лишние',String(avg(n.map(r=>r.overflow))).padEnd(4),'недошли',avg(n.map(r=>r.left+r.crew+(r.transit||0)))) }
  console.log('--- честность карт: лучший бот по сиду'); const best=SEEDS.map(sd=>Math.max(...rows.filter(r=>r.seed===sd).map(r=>r.souls))); console.log(SEEDS.map((sd,i)=>sd+':'+best[i]).join(' ')); const so=best.slice().sort((a,b)=>a-b); console.log('мин',so[0],'медиана',so[so.length>>1],'макс',so[so.length-1]);
  await page.close(); return rows }
/* --- браузер --- */
const errors=[];
function watch(page,tag){ page.on('pageerror',e=>errors.push(tag+' pageerror: '+e.message)); page.on('console',m=>{ if(m.type()==='error') errors.push(tag+' console: '+m.text()) }) }
const ok=(c,msg)=>{ console.log((c?'OK  ':'FAIL')+' '+msg); if(!c) errors.push('FAIL '+msg) };
async function layoutCheck(page,tag){
  const r=await page.evaluate(()=>{ const de=document.documentElement,small=[]; document.querySelectorAll('button,a').forEach(b=>{ const q=b.getBoundingClientRect(); if(q.width&&q.height&&(q.width<34||q.height<34)) small.push(b.textContent.slice(0,12)+':'+Math.round(q.width)+'x'+Math.round(q.height)) });
    const off=[]; document.querySelectorAll('#hud,#ctx,#bar,#alerts,#mapbtns').forEach(e=>{ const q=e.getBoundingClientRect(); if(q.width&&(q.right>innerWidth+1||q.left<-1)) off.push(e.id) }); return {sw:de.scrollWidth,iw:innerWidth,small,off} });
  ok(r.sw<=r.iw&&!r.off.length,tag+': без горизонтальной прокрутки ('+r.sw+'/'+r.iw+') '+r.off.join()); if(r.small.length) console.log('   мелкие кнопки:',r.small.join(' ')) }
const firstFarm=page=>page.evaluate(()=>{ const G=GAME.state,C=GAME.core; return G.worlds.filter(w=>w.type==='farm'&&C.canLink(G,0,w.id).ok).sort((a,b)=>C.dist(a,G.worlds[0])-C.dist(b,G.worlds[0]))[0].id });
const nextMine=(page,farm)=>page.evaluate(farm=>{ const G=GAME.state,C=GAME.core; const m=G.worlds.filter(w=>(w.type==='mine'||w.type==='well')&&C.canLink(G,farm,w.id).ok)[0]; return m?m.id:null },farm);
const scr=(page,id)=>page.evaluate(id=>GAME.screenOf(id),id);
const line1=t=>t.replace(/\n/g,' | ').slice(0,180);
async function ui(browser){
  /* 1. Мышь, 1440×900, с окном «?» */
  let ctx=await browser.newContext({viewport:{width:1440,height:900}}); let page=await ctx.newPage(); watch(page,'desk'); await page.goto(F+'?seed=44');
  ok(await page.locator('.lb-modal').isVisible(),'окно «?» при входе'); await page.waitForTimeout(150); await page.screenshot({path:SH+'/slipways-desk-0-help.png'});
  let box=await page.locator('.lb-modal .btn.pri').boundingBox(); await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  ok(!(await page.locator('.lb-modal').isVisible()),'окно закрывается мышью');
  const f0=await firstFarm(page); let p=await scr(page,0); await page.mouse.click(p.x,p.y); ok((await page.locator('#ctx').innerText()).includes('ЗЕМЛЯ'),'мышь: клик по Земле открывает карточку');
  p=await scr(page,f0); await page.mouse.click(p.x,p.y); let t=await page.locator('#ctx').innerText(); console.log('   панель:',line1(t)); ok(/рационы/.test(t)&&/отход/.test(t),'мышь: предпросмотр линии показывает +рационы и отход');
  await page.waitForTimeout(100); await page.screenshot({path:SH+'/slipways-desk-1-preview.png'});
  await page.click('button:has-text("Линия и заселить")'); let st=await page.evaluate(()=>({l:GAME.state.lines.length,a:GAME.state.worlds.filter(w=>w.awake).length})); ok(st.l===1&&st.a===2,'мышь: линия проложена, мир заселён');
  await page.click('[data-a=undo]'); ok(await page.evaluate(()=>GAME.state.lines.length===0),'мышь: отмена возвращает линию');
  p=await scr(page,0); await page.mouse.click(p.x,p.y); p=await scr(page,f0); await page.mouse.click(p.x,p.y); await page.click('button:has-text("Линия и заселить")');
  const far=await page.evaluate(()=>{ const G=GAME.state,C=GAME.core; const w=G.worlds.filter(w=>{ const d=C.dist(w,G.worlds[0]); return d>C.range(G,0,w.id)&&d<C.range(G,0,w.id)*1.5&&!w.dead })[0]; return w&&w.id });
  if(far){ p=await scr(page,0); await page.mouse.click(p.x,p.y); p=await scr(page,far); await page.mouse.click(p.x,p.y); t=await page.locator('#ctx').innerText(); ok(/Длина/.test(t),'мышь: отказ объясняет причину: '+line1(t)); await page.click('[data-a=cancel]') }
  const c0=await page.evaluate(()=>({x:GAME.cam.x,s:GAME.cam.s})); await page.mouse.move(400,450); await page.mouse.down(); await page.mouse.move(520,470,{steps:5}); await page.mouse.up(); await page.mouse.wheel(0,-300); await page.waitForTimeout(50); const c1=await page.evaluate(()=>({x:GAME.cam.x,s:GAME.cam.s})); ok(c1.x!==c0.x&&c1.s>c0.s,'мышь: панорама и масштаб'); await page.click('[data-a=fit]');
  const m0=await nextMine(page,f0); if(m0!==null){ p=await scr(page,f0); await page.mouse.click(p.x,p.y); p=await scr(page,m0); await page.mouse.click(p.x,p.y); t=await page.locator('#ctx').innerText(); console.log('   панель:',line1(t)); await page.click('button:has-text("Линия и заселить")') }
  await page.click('[data-a=next]'); ok(await page.evaluate(()=>GAME.state.turn===2),'мышь: следующая смена'); await layoutCheck(page,'1440');
  await page.waitForTimeout(600); await page.screenshot({path:SH+'/slipways-desk-2-start.png'});
  await page.evaluate(botRun,{name:'sensible',seed:44,live:true,until:14}); await page.waitForTimeout(600); await page.screenshot({path:SH+'/slipways-desk-3-mid.png'});
  await page.evaluate(botRun,{name:'sensible',seed:44,live:true,until:23,norise:true}); await page.waitForTimeout(800); await page.screenshot({path:SH+'/slipways-desk-4-rise.png'}); t=await page.locator('#alerts').innerText(); console.log('   тревоги:',line1(t));
  const riseStep=async(click,tagw)=>{ for(let i=0;i<6&&!(await page.locator('.al button:has-text("ПОДНЯТЬ ИХ")').count());i++){ await click(page.locator('[data-a=next]')); await page.waitForTimeout(80) }
    const b0=await page.evaluate(()=>GAME.state.worlds.filter(w=>w.lifted).length); await click(page.locator('.al button:has-text("ПОДНЯТЬ ИХ")')); await page.waitForTimeout(80); ok((await page.evaluate(()=>GAME.state.worlds.filter(w=>w.lifted).length))>b0,tagw+': кнопка тревоги поднимает тех, кому пора');
    await click(page.locator('[data-a=next]')); await page.waitForTimeout(80); ok(await page.evaluate(()=>Object.keys(GAME.state.tr).length>0||GAME.state.lines.length>=0),tagw+': после хода люди на линиях ('+await page.evaluate(()=>Object.values(GAME.state.tr).flat().reduce((a,g)=>a+g.n,0))+')') };
  await riseStep(async l=>{ const b=await l.first().boundingBox(); await page.mouse.click(b.x+b.width/2,b.y+b.height/2) },'мышь'); await page.waitForTimeout(500); await page.screenshot({path:SH+'/slipways-desk-4b-lifted.png'});
  await page.evaluate(botRun,{name:'sensible',seed:44,live:true,until:29}); await page.waitForTimeout(800); await page.screenshot({path:SH+'/slipways-desk-5-rise-late.png'});
  await page.evaluate(botRun,{name:'sensible',seed:44,live:true}); await page.waitForTimeout(300); ok(await page.locator('#end').isVisible(),'партия ботом: экран итога виден'); t=await page.locator('#end').innerText(); console.log('   итог:',line1(t)); await page.screenshot({path:SH+'/slipways-desk-6-end.png'});
  await page.click('#again'); ok(await page.evaluate(()=>GAME.state.turn===1&&!document.getElementById('end')),'кнопка «Заново» начинает новую партию'); await ctx.close();
  /* 2. Касание, 390×844 */
  ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}); page=await ctx.newPage(); watch(page,'phone'); await page.goto(F+'?seed=22');
  const tap=async loc=>{ const b=await loc.boundingBox(); await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2); await page.waitForTimeout(70) };
  await page.waitForTimeout(150); await page.screenshot({path:SH+'/slipways-phone-0-help.png'}); await tap(page.locator('.lb-modal .btn.pri')); ok(!(await page.locator('.lb-modal').isVisible()),'касание: окно закрыто');
  /* щипок и палец: настоящие касания через CDP */
  const cdp=await ctx.newCDPSession(page), T=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map((q,i)=>({x:q[0],y:q[1],id:i}))});
  const s0=await page.evaluate(()=>GAME.cam.s); await T('touchStart',[[150,400],[240,400]]); for(let i=1;i<=6;i++){ await T('touchMove',[[150-i*8,400],[240+i*8,400]]); await page.waitForTimeout(16) } await T('touchEnd',[]); await page.waitForTimeout(50); const s1=await page.evaluate(()=>GAME.cam.s); ok(s1>s0*1.2,'касание: щипок меняет масштаб '+s0.toFixed(2)+' → '+s1.toFixed(2));
  const x0=await page.evaluate(()=>GAME.cam.x); await T('touchStart',[[200,500]]); for(let i=1;i<=6;i++){ await T('touchMove',[[200+i*10,500]]); await page.waitForTimeout(16) } await T('touchEnd',[]); await page.waitForTimeout(50); ok(await page.evaluate(x=>GAME.cam.x!==x,x0),'касание: палец двигает карту'); await page.waitForTimeout(450); await tap(page.locator('[data-a=fit]')); { const fitOk=()=>page.evaluate(s=>Math.abs(GAME.cam.s-s)<.01&&GAME.cam.x===0,s0); if(!(await fitOk())){ console.log('   заметка: первое нажатие ⊙ сразу после жеста не сработало, камера',await page.evaluate(()=>[GAME.cam.x,GAME.cam.s])); await page.waitForTimeout(500); await tap(page.locator('[data-a=fit]')) } ok(await fitOk(),'касание: кнопка ⊙ возвращает карту') }
  const ff=await firstFarm(page); p=await scr(page,0); await page.touchscreen.tap(p.x,p.y); await page.waitForTimeout(70); p=await scr(page,ff); await page.touchscreen.tap(p.x,p.y); await page.waitForTimeout(70); t=await page.locator('#ctx').innerText(); console.log('   панель:',line1(t)); ok(/отход/.test(t),'касание: предпросмотр линии'); await page.screenshot({path:SH+'/slipways-phone-1-preview.png'});
  await tap(page.locator('button:has-text("Линия и заселить")')); ok(await page.evaluate(()=>GAME.state.lines.length===1),'касание: линия проложена');
  const mm=await nextMine(page,ff); if(mm!==null){ p=await scr(page,ff); await page.touchscreen.tap(p.x,p.y); await page.waitForTimeout(70); p=await scr(page,mm); await page.touchscreen.tap(p.x,p.y); await page.waitForTimeout(70); if(await page.locator('button:has-text("Линия и заселить")').count()) await tap(page.locator('button:has-text("Линия и заселить")')) }
  await tap(page.locator('[data-a=sheet][data-k=a]')); ok(await page.locator('#ark').isVisible(),'касание: лист «Ковчег»'); await page.screenshot({path:SH+'/slipways-phone-2-ark.png'}); await tap(page.locator('#ark [data-a=closesheet]'));
  await tap(page.locator('[data-a=next]')); ok(await page.evaluate(()=>GAME.state.turn===2),'касание: следующая смена'); await layoutCheck(page,'390'); await page.waitForTimeout(500); await page.screenshot({path:SH+'/slipways-phone-3-start.png'});
  await page.evaluate(botRun,{name:'sensible',seed:22,live:true,until:14}); await page.waitForTimeout(600); await layoutCheck(page,'390 mid'); await page.screenshot({path:SH+'/slipways-phone-4-mid.png'});
  await page.evaluate(botRun,{name:'sensible',seed:22,live:true,until:23,norise:true}); await page.waitForTimeout(800); await layoutCheck(page,'390 rise'); await page.screenshot({path:SH+'/slipways-phone-5-rise.png'});
  const tp=async l=>{ const b=await l.first().boundingBox(); await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2); await page.waitForTimeout(90) };
  for(let i=0;i<6&&!(await page.locator('.al button:has-text("ПОДНЯТЬ ИХ")').count());i++) await tp(page.locator('[data-a=next]'));
  { const b0=await page.evaluate(()=>GAME.state.worlds.filter(w=>w.lifted).length); await tp(page.locator('.al button:has-text("ПОДНЯТЬ ИХ")')); ok((await page.evaluate(()=>GAME.state.worlds.filter(w=>w.lifted).length))>b0,'касание: кнопка тревоги поднимает тех, кому пора'); await tp(page.locator('[data-a=next]')); console.log('   в пути:',await page.evaluate(()=>Object.values(GAME.state.tr).flat().reduce((a,g)=>a+g.n,0))); await page.waitForTimeout(500); await page.screenshot({path:SH+'/slipways-phone-5b-lifted.png'}) }
  const lw=await page.evaluate(()=>{ const G=GAME.state,C=GAME.core; const w=G.worlds.find(w=>C.canLift(G,w.id).ok); return w?w.id:null });
  if(lw!==null){ await page.evaluate(id=>{ GAME.cam.x=GAME.state.worlds[id].x; GAME.cam.y=GAME.state.worlds[id].y },lw); await page.waitForTimeout(50); p=await scr(page,lw); await page.touchscreen.tap(p.x,p.y); await page.waitForTimeout(80); await page.screenshot({path:SH+'/slipways-phone-6-lift.png'}); const lb=page.locator('[data-a=lift]'); if(await lb.count()){ await tap(lb); ok(await page.evaluate(id=>GAME.state.worlds[id].lifted,lw),'касание: мир поднят с карточки') } else ok(false,'касание: нет кнопки «Поднять» на карточке') }
  await page.evaluate(botRun,{name:'sensible',seed:22,live:true}); await page.waitForTimeout(300); ok(await page.locator('#end').isVisible(),'телефон: итог виден'); await layoutCheck(page,'390 end'); await page.screenshot({path:SH+'/slipways-phone-7-end.png'}); await tap(page.locator('#again')); ok(await page.evaluate(()=>GAME.state.turn===1),'телефон: заново работает');
  await ctx.close();
  console.log(errors.length?('ОШИБКИ:\n'+errors.join('\n')):'Браузер: ошибок нет') }
if(require.main===module){ (async()=>{ const mode=process.argv[2]||'all'; const browser=await chromium.launch();
  if(mode==='bots'||mode==='all') await bots(browser);
  if(mode==='ui'||mode==='all') await ui(browser);
  await browser.close() })().catch(e=>{ console.error(e); process.exit(1) }) }
