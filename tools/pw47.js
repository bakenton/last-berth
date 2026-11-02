// pw47 — интерфейс по забегу Никиты 26.10–02.11: письма экипажа — полоски и архив, пять типов уведомлений, пороги линии,
// кузница говорит сразу, меню перевода с цифрами линии, карточка верфи с трюмом и выбором поколения. Настоящая мышь.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW47_SHOTS||null;
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900}}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  const box=s=>p.evaluate(s=>{ const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom,r:r.right} },s);
  await U.start('en',309573272);
  await U.pause();

  // the worlds: put straight into the state, the founding is tested elsewhere
  const W=await p.evaluate(()=>{ const G=LN, by=k=>PLANETS.filter(q=>q.sec<=1&&q.kind===k).sort((a,b)=>a.dist-b.dist);
    G.earth.metal=90000; G.earth.food=90000; G.earth.fuel=90000; G.earth.parts=2000; G.earth.people=6000; G.opened={food:1,metal:1,fuel:1,parts:1};
    G.gen=2; G.driveLvl=2; ensureGen(2); LNtut.off();
    const w={mine:by('mine')[0].id,mine2:by('mine')[1].id,farm:by('farm')[0].id,well:by('well')[0].id,works:by('works')[0].id,dead:by('mine')[2].id};
    Object.keys(G.colonies).forEach(k=>{ delete G.colonies[k] }); G.ships.forEach(s=>{ s.mode='dead'; s.from=s.to=null });
    Object.values(w).forEach(id=>{ G.colonies[id]={pop:popWant(planet(id)),store:{metal:500,food:500,fuel:500,parts:0},founded:G.day,tier:0,hauledOut:{}}; if(planet(id).kind!=='works') G.reserves[id]=900000 });
    LNdraw(); return w });
  const hull=(id,cls,gen)=>p.evaluate(a=>{ const G=LN, hi=HULLS.findIndex(h=>h.key===a.cls&&h.gen===(a.gen===undefined?G.gen:a.gen)); G.earth.parts=Math.max(G.earth.parts,20000); G.earth.people=6000; buildShip(G,hi); const s=G.ships[G.ships.length-1]; s.mode='idle'; s.at='earth'; s.t=0; if(a.id&&setLine(G,s.id,a.id,'earth')!=='ok'){ s.from=a.id; s.to='earth' } LNdraw(); return s.id },{id,cls,gen});
  const rows=()=>p.evaluate(()=>LNI.adv().map(r=>({t:r[1],s:r[2],c:r[0],w:r[3],k:r[6]})));
  const typeOf=async(id)=>(await rows()).filter(r=>r.w===id).map(r=>r.k);

  // === 1. the thresholds of a line
  await hull(W.mine,'freighter');
  const fitTo=(id,x)=>p.evaluate(a=>{ const G=LN, c=G.colonies[a.id], f=lineFit(G,a.id), s=f.hulls[0]; s.cap=Math.round(s.cap*(lineRate(G,a.id).makes*a.x)/f.carries); c.store[planet(a.id).dep]=600; LNdraw(); const g=lineFit(G,a.id); return g.carries/g.need },{id,x});
  let r=await fitTo(W.mine,0.92);
  ok('a line a little short says nothing', !(await typeOf(W.mine)).includes('line')&&await p.evaluate(id=>LNI.wst(id)==='ok',W.mine),'share '+r+' '+JSON.stringify(await rows()));
  r=await fitTo(W.mine,0.4);
  ok('a line under half of what it must speaks', (await typeOf(W.mine)).includes('line')&&await p.evaluate(id=>LNI.wst(id)==='half',W.mine),'share '+r);
  r=await fitTo(W.mine,1.4);
  await hull(W.mine,'courier');
  ok('a line with 1.4× and a hull to spare stays quiet', !(await typeOf(W.mine)).includes('line'),JSON.stringify(await rows()));
  await p.evaluate(id=>{ const G=LN, f=lineFit(G,id); f.hulls.forEach(s=>{ s.cap=Math.round(s.cap*(lineRate(G,id).makes*3)/f.carries) }); G.colonies[id].store[planet(id).dep]=0; LNdraw() },W.mine);
  ok('a line carrying over twice the need gets the grey row', (await rows()).some(q=>q.w===W.mine&&q.k==='line'),JSON.stringify(await rows()));

  // === 2. the works speak at once, with the percent and the hull to add
  await hull(W.works,'courier');
  const fg=await p.evaluate(id=>{ const G=LN, f=lineFit(G,id); f.hulls[0].cap=Math.max(1,Math.round(f.hulls[0].cap*(f.need*0.4)/f.carries)); LNdraw(); const g=lineFit(G,id); return {share:g.carries/g.need,idle:G.colonies[id].idleWorks||0} },W.works);
  const fr=(await rows()).filter(q=>q.w===W.works&&q.k==='forge')[0];
  ok('thin line to the works: a row with the percent, no idle years needed', fg.idle===0&&!!fr&&/\d+% of what the works burn/.test(fr.t)&&/\+[\d.,]+ a year/.test(fr.s),JSON.stringify(fg)+' '+JSON.stringify(fr));

  // === 3. the five kinds: noline (farm has no hull), seam, evac, forge, line
  await p.evaluate(a=>{ const G=LN; G.reserves[a.mine2]=lineRate(G,a.mine2).makes*40; G.reserves[a.dead]=0; G.colonies[a.dead].store={metal:0,food:0,fuel:0,parts:0}; LNdraw() },W);
  await hull(W.well,'freighter'); await hull(W.mine2,'freighter');
  await p.evaluate(id=>{ const G=LN, f=lineFit(G,id); f.hulls[0].cap=Math.max(1,Math.round(f.hulls[0].cap*(f.need*0.3)/f.carries)); G.colonies[id].store[planet(id).dep]=800; LNdraw() },W.well);
  const kinds=[...new Set((await rows()).map(q=>q.k))].sort();
  ok('all five kinds are on the list', ['evac','forge','line','noline','seam'].every(k=>kinds.includes(k)),kinds.join());
  await U.clear();   // the state set above opens a note about the first works
  await U.tap('#top [data-act="pop"][data-v="adv"]'); await p.evaluate(()=>LNdraw());
  const dom=await p.evaluate(()=>({heads:[...document.querySelectorAll('.advl .advh')].map(e=>e.innerText.replace(/\s+/g,' ')),cols:[...document.querySelectorAll('.advl .advh')].map(e=>getComputedStyle(e).color),chips:document.querySelectorAll('.advl .advc span').length,first:document.querySelector('.advl button').getAttribute('data-t')}));
  ok('groups: a head with a count for each kind, each in its own colour', dom.heads.length===5&&dom.chips===5&&new Set(dom.cols).size===5&&dom.heads.every(h=>/\d$/.test(h)),JSON.stringify(dom));
  ok('the urgent kind comes first', dom.first==='evac',dom.first);
  await shot('adv-types');
  await U.tap('#pop .advl button[data-t="seam"]');
  ok('a row opens its world', await p.evaluate(id=>LNU.win===id,W.mine2));
  await U.closeWin();

  // === 4. the move menu
  const sid=await hull(W.mine2,'courier');
  await p.evaluate(a=>{ LNU.pop='pick:move:'+a; LNdraw() },sid);
  const pk=await p.evaluate(a=>{ const b=document.querySelector('#pop [data-act="pickgo"][data-v$=":'+a+'"]'), n=b.querySelector('b').getBoundingClientRect(), i=b.querySelector('i').getBoundingClientRect(); return {t:b.innerText.replace(/\s+/g,' '),gap:i.left-n.right,w:document.querySelector('.pick').getBoundingClientRect().width,sw:document.querySelector('.pick').scrollWidth-document.querySelector('.pick').clientWidth} },W.well);
  const want=await p.evaluate(a=>{ const f=lineFit(LN,a.w), y=hullYield(LN,a.w,shipById(LN,a.s)); return {c:f.carries,m:f.need,y} },{w:W.well,s:sid});
  ok('menu: ring and kind right by the name', pk.gap>=0&&pk.gap<24&&/ring \d+ · \w+/i.test(pk.t),JSON.stringify(pk));
  ok('menu: what the line carries, must carry, what this hull adds', /[\d.,\s]+ of [\d.,\s]+\/yr · \+[\d.,\s]+/.test(pk.t),pk.t+' '+JSON.stringify(want));
  ok('menu: fits, no sideways scroll', pk.sw<=0,pk.sw);
  await shot('move-menu');
  await U.tap('#pop [data-act="pickgo"][data-v$=":'+W.well+'"]');
  ok('menu: a click moves the hull', await p.evaluate(a=>{ const s=shipById(LN,a.s); return s.moveTo===a.w||s.from===a.w||s.to===a.w||(s.pend&&s.pend.to===a.w) },{w:W.well,s:sid}));

  // === 5. the card: the hold, both generations with their parts, the player chooses
  await p.evaluate(()=>{ LN.earth.parts=5000; LNdraw() });
  await U.openWorld(W.mine);
  let oc=await p.evaluate(()=>{ const c=document.querySelector('#oc-hauler'); return {t:c.innerText.replace(/\s+/g,' '),hold:c.querySelector('.oh').innerText,seg:[...c.querySelectorAll('.ogen button')].map(b=>b.innerText.replace(/\s+/g,' ')),on:c.querySelector('.ogen .on').innerText.replace(/\s+/g,' ')} });
  const hv=await p.evaluate(()=>{ const c=HULLS[currentHull(LN,'hauler')], o=HULLS.find(h=>h.key==='hauler'&&h.gen===c.gen-1); return {c:c.cap,cp:c.parts,oc:o.cap,op:o.parts} });
  ok('card: the hold is on it', oc.hold.replace(/\s/g,'')===String(hv.c),JSON.stringify(oc)+JSON.stringify(hv));
  ok('card: both generations with their parts', oc.seg.length===2&&/III/.test(oc.seg[0])&&/II/.test(oc.seg[1])&&oc.seg[0].replace(/\s/g,'').includes(String(hv.cp))&&oc.seg[1].replace(/\s/g,'').includes(String(hv.op)),JSON.stringify(oc.seg));
  await shot('card-gen');
  await U.tap('#oc-hauler .ogen button:not(.on)');
  oc=await p.evaluate(()=>{ const c=document.querySelector('#oc-hauler'); return {name:c.querySelector('b').innerText,hold:c.querySelector('.oh').innerText} });
  ok('card: the mouse picks the generation before, with parts to spare for the current one', /II$/.test(oc.name)&&!/III/.test(oc.name)&&oc.hold.replace(/\s/g,'')===String(hv.oc),JSON.stringify(oc));
  const before=await p.evaluate(()=>LN.ships.length);
  await U.tap('#oc-hauler [data-act="order"]');
  ok('card: the order builds that generation', await p.evaluate(a=>{ const s=LN.ships[LN.ships.length-1]; return LN.ships.length===a+1&&hullGen(s)===LN.gen-1&&shipClass(s)==='hauler' },before));
  await U.closeWin();
  await U.tap('#tabs [data-act="tab"][data-v="yard"]');
  ok('yard: the same choice, hold and all', await p.evaluate(()=>[...document.querySelectorAll('.ord.big .oc')].some(c=>c.querySelectorAll('.ogen button').length===2&&/\d/.test(c.querySelector('.ico3').innerText))));
  await shot('yard-gen');
  await U.tap('#tabs [data-act="tab"][data-v="yard"]');

  // === 6. letters: a strip in its own corner, opens where it is, the archive keeps all
  const say=()=>p.evaluate(()=>{ const G=LN; LNU.voiceLast=-1000; log(G,'colony_failed',{n:5,p:Object.keys(G.colonies)[0]}); LNdraw(); return G.letters.length });
  const n1=await say();
  ok('a quiet word is a strip, the clock runs on', await p.isVisible('#pfL.low .ltr')&&await p.evaluate(()=>!LNU.pf&&!LNI.big()),n1);
  let bx=await box('#pfL .ltr');
  ok('the strip is narrow: under a tenth of the screen tall', bx.h<90&&bx.w<=430,JSON.stringify(bx));
  await shot('letter-strip');
  for(const t of ['tech','worlds','fleet']){
    await U.tap('#tabs [data-act="tab"][data-v="'+t+'"]');
    await p.evaluate(()=>LNdraw());
    bx=await box('#pfL .ltr'); const side=await box('#side > *'), col=await box('#pfL');
    ok('panel '+t+': whole strip on screen, beside the panel, no empty block', bx.y>100&&bx.b<=900&&bx.x>=side.r&&col.h<200,JSON.stringify({bx,col}));
    if(t==='tech') await shot('letter-tech');
    await U.tap('#tabs [data-act="tab"][data-v="'+t+'"]');
  }
  bx=await box('#pfL .ltr .ltl');
  await U.tap('#pfL .ltr');
  const bo=await box('#pfL .ltr .ltl');
  const whole=await p.evaluate(()=>{ const e=document.querySelector('#pfL .ltr .ltl'); return {line:e.innerText,ov:e.scrollWidth-e.clientWidth,read:LN.letters[LN.letters.length-1].read,ok:!!document.querySelector('#pfL .ltr u')} });
  ok('a press opens it where it is, the line is whole and read', whole.read&&whole.ov<=0&&whole.ok&&whole.line.length>5,JSON.stringify(whole));
  await shot('letter-open');
  await U.tap('#pfL .ltr');
  ok('a second press puts it away, the archive stays', !(await p.isVisible('#pfL .ltr'))&&await p.isVisible('#pfL .ltarch'));
  await say(); await p.evaluate(()=>{ LNU.strips=[]; LNdraw() });
  const arch=await p.evaluate(()=>document.querySelector('#pfL .ltarch').innerText.replace(/\s+/g,' '));
  ok('an unread letter gone from the corner is counted on the archive', /1 new/i.test(arch),arch);
  await U.tap('#pfL .ltarch');
  const al=await p.evaluate(()=>({n:document.querySelectorAll('#pop .ltr').length,all:LN.letters.length,painted:[...document.querySelectorAll('#pop canvas')].every(c=>c._done)}));
  ok('archive: every letter, faces drawn', al.n===al.all&&al.n>=2&&al.painted,JSON.stringify(al));
  await U.tap('#pop .ltr');
  ok('archive: a press opens the letter, nothing unread is left', await p.isVisible('#pop .ltr.open')&&await p.evaluate(()=>LN.letters.every(l=>l.read)));
  await shot('letter-archive');
  await U.tap('#pfL .ltarch');
  ok('archive: its button closes it', !(await p.isVisible('#pop .ltrs')));
  ok('saved with the run', await p.evaluate(()=>JSON.parse(JSON.stringify(LN)).letters.length===LN.letters.length));
  await p.evaluate(()=>{ LN.letters=[]; LN.night=LN.day+500; LN.nightSeen=true; LNU.voiceLast=-1000; log(LN,'ark_drive',{g:3,w:60,y:LN.night}); LNdraw() });
  const full=await p.evaluate(()=>({pf:!!LNU.pf,cls:document.getElementById('pfL').className}));
  if(full.pf){ ok('a forced word still takes the screen and stops the clock', full.cls==='full'&&await p.isVisible('#pfL.full [data-act="pfok"]')); await U.tap('#pfL [data-act="pfok"]');
    ok('and stays in the archive, read', await p.evaluate(()=>LN.letters.length===1&&LN.letters[0].read)) }

  // === 7. Russian
  await p.evaluate(()=>{ LNU.lang='ru'; LNU.pop='adv'; LNdraw() });
  const ru=await p.evaluate(()=>document.querySelector('.advl').innerText);
  ok('RU: the heads and the rows are Russian', /Эвакуация|На линии нет судов/i.test(ru)&&/завод|жила|судов/i.test(ru),ru.replace(/\s+/g,' ').slice(0,200));
  await shot('adv-ru');
  ok('no page errors', p.errs.length===0,p.errs.join(' | '));
  await b.close();
 }catch(e){ out.push('ERROR '+String(e&&e.stack||e).slice(0,600)) }
 console.log(out.join('\n'));
 process.exit(out.some(l=>/^(FAIL|ERROR)/.test(l))?1:0);
})();
