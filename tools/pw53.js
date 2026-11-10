// v5.09 (Никита 10.11: «делаем, чтоб судно не ходило пустым») — выработанный мир с пустой поверхностью:
//   судно у причала на его линии не уходит в рейс и сразу свободно; судно, уже летящее туда, разворачивается и встаёт свободным у Земли;
//   эвакуация летит как раньше; завод (works) и мир с грузом на поверхности — как раньше.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b); const U=UI.ui(p);
  await U.start('en',309573272);
  await p.evaluate(()=>{ LNU.shiftStop=false; LNU.paused=true; LN.safe=true;   // без пропаж и катастроф: проверяется правило, а не кости
    window.COL=()=>({pop:40,unrest:0,relay:false,dark:false,pending:null,store:{metal:0,food:0,fuel:0,parts:0},hist:[],demand:null,neglect:0,founded:0,tier:0,fuelOut:0});
    window.TICK=n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } };
    window.HULL=()=>{ LN.earth.metal=1e5; LN.earth.people=Math.max(LN.earth.people,400); buildShip(LN,HULLS.findIndex(h=>h.gen===(LN.gen||0)&&h.key==='courier')); const s=LN.ships[LN.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; s.crew=HULLS[s.hull].crew; return s.id };
    LN.earth.fuel=1e5; LN.earth.food=1e5 });
  const ids=await p.evaluate(()=>{ const far=PLANETS.filter(q=>q.sec<=1&&q.kind==='mine').sort((a,b)=>b.dist-a.dist), mine=far[0].id, mine2=(far[1]||far[0]).id, works=(PLANETS.find(q=>q.sec<=1&&q.kind==='works')||{}).id||null;
    [mine,mine2,works].forEach(id=>{ if(id&&!LN.colonies[id]) LN.colonies[id]=Object.assign({pid:id},COL()) }); return {mine,mine2,works} });
  ok('two mines in reach for the test', ids.mine&&ids.mine2&&ids.mine!==ids.mine2, JSON.stringify(ids));

  // 1. в пути туда: мир опустел — разворот оттуда, где она есть, груз домой, у Земли свободна
  const r1=await p.evaluate(id=>{ LN.reserves[id]=0; LN.colonies[id].store.metal=30; const a=HULL(); setLine(LN,a,id,'earth'); TICK(1); const s=shipById(LN,a);
    const leg=s.total, st0={mode:s.mode,dir:s.dir,dest:s.dest}; TICK(3); const flown=s.total-s.t;
    LN.colonies[id].store.metal=0;                                  // груз с поверхности пропал (событие) или его забрало другое судно
    TICK(1); const st1={mode:s.mode,dir:s.dir,dest:s.dest,t:s.t,total:s.total,from:s.from};
    let n=0; while(s.mode==='transit'&&n<400){ TICK(1); n++ }
    window.A=a; return {leg,flown,st0,st1,back:n,mode:s.mode,at:s.at,from:s.from,waiting:!!s.waiting,log:LN.log.filter(l=>l.code==='nothing_left'&&l.d.n===a).length} },ids.mine);
  ok('hull was outbound on the line', r1.st0.mode==='transit'&&r1.st0.dir==='out'&&r1.st0.dest===ids.mine, JSON.stringify(r1.st0));
  ok('world stripped while she is on the way: she turns for Earth at once', r1.st1.dir==='in'&&r1.st1.dest==='earth'&&r1.st1.mode==='transit', JSON.stringify(r1.st1));
  ok('the way home is as long as the way flown (not the whole leg and back)', r1.back<=r1.flown+2&&r1.back<r1.leg, 'leg '+r1.leg+' · flown '+r1.flown+' · home in '+r1.back);
  ok('at Earth she stands down free and says so (nothing_left)', r1.mode==='idle'&&r1.at==='earth'&&!r1.from&&r1.waiting&&r1.log===1, JSON.stringify({mode:r1.mode,at:r1.at,from:r1.from,log:r1.log}));

  // 2. у причала на линии выработанного мира: в рейс не уходит, свободна сразу, топливо не тратится
  const r2=await p.evaluate(id=>{ LN.reserves[id]=50; LN.colonies[id].store.metal=5; const h=HULL(); setLine(LN,h,id,'earth'); const s=shipById(LN,h);   // линия взята, пока мир жив
    LN.reserves[id]=0; LN.colonies[id].store.metal=0; const f0=LN.earth.fuel; const was={from:s.from,mode:s.mode};
    TICK(1); window.H2=h; return {was,mode:s.mode,at:s.at,from:s.from,to:s.to,waiting:!!s.waiting,fuel:Math.round(f0-LN.earth.fuel),log:LN.log.filter(l=>l.code==='nothing_left'&&l.d.n===h).length,line:onLine(LN,id).length} },ids.mine2);
  ok('docked hull on a spent world\'s line does not sail', r2.mode==='idle'&&r2.at==='earth', JSON.stringify(r2));
  ok('her line is dropped and she is free at once (nothing_left, nobody on the line)', !r2.from&&!r2.to&&r2.waiting&&r2.log===1&&r2.line===0, JSON.stringify(r2));
  ok('no fuel burnt on a flight that did not happen', r2.fuel<=0, r2.fuel);

  // 3. эвакуация на выработанный мир летит как раньше
  const r3=await p.evaluate(id=>{ const e=HULL(); const r=abandon(LN,e,id); TICK(2); const s=shipById(LN,e); return {r,mode:s.mode,job:s.job,dest:s.dest,dir:s.dir} },ids.mine2);
  ok('an evacuation flight to the spent world still goes', r3.r==='ok'&&r3.mode==='transit'&&r3.job==='evac'&&r3.dest===ids.mine2, JSON.stringify(r3));

  // 4. мир с грузом на поверхности при мёртвой жиле — рейс есть; завод без продукта — рейс есть
  const r4=await p.evaluate(({id,works})=>{ LN.reserves[id]=0; LN.colonies[id].store.metal=500; const h=HULL(); setLine(LN,h,id,'earth'); TICK(2); const s=shipById(LN,h); const pile={mode:s.mode,dest:s.dest,from:s.from};
    let w=null; if(works){ const k=HULL(); const rr=setLine(LN,k,works,'earth'); TICK(2); const q=shipById(LN,k); w={rr,mode:q.mode,dest:q.dest,from:q.from} } return {pile,w} },{id:ids.mine,works:ids.works});
  ok('dead seam but a pile on the surface: the hull goes for it', r4.pile.mode==='transit'&&r4.pile.dest===ids.mine, JSON.stringify(r4.pile));
  if(r4.w) ok('a works with nothing made yet keeps its line', r4.w.mode==='transit'&&r4.w.from===ids.works, JSON.stringify(r4.w));

  // 5. в интерфейсе: судно во Флоте свободно, окно выработанного мира открывается, ошибок страницы нет
  await p.evaluate(()=>LNdraw()); await U.clear(); await U.tab('fleet'); await U.tap('#side [data-act="filter"][data-v="free"]');
  const fl=await p.evaluate(()=>({a:!!document.querySelector('#side [data-act="pick"][data-v="send:'+window.A+'"]'),h:!!document.querySelector('#side [data-act="pick"][data-v="send:'+window.H2+'"]')}));
  ok('Fleet → Free lists both hulls with a Send button', fl.a&&fl.h, JSON.stringify(fl));
  await U.tab('fleet');
  const toast=await p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent.trim()).join(' | '));
  ok('no raw code or placeholder in what the player was told', !/undefined|\{[a-z]+\}|nothing_left/.test(toast), toast.slice(0,200));
  ok('no page errors', p.errs.length===0, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL scenario ran to the end — '+e.message.split('\n')[0]) }
  console.log(out.join('\n')); console.log(out.filter(x=>x.startsWith('PASS')).length+'/'+out.filter(x=>/^(PASS|FAIL)/.test(x)).length);
})();
