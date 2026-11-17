// pw76 — v5.42 (Никита 17.11, объём — «Да»):
//  1  п. 15 «За каждой блок капсул нужно давать бонусы» («по твоему решению»): каждое оплаченное кольцо ковчега — готовый курьер поколения
//     верфи у причала, со своим экипажем (людей Земли не берёт); покупка двух колец разом — два курьера; запись ark_gift и тост;
//  2  дрожь кольца: за TREMOR_YEARS до погасания — запись ring_tremor (тост), миры кольца дают вдвое меньше (lineRate), подсказка мира
//     при наведении мышью говорит «ring failing», имя кольца красное; другое кольцо не дрожит; до срока кольцо не гаснет.
// Состояние готовится через ядро и GOD. Снимки: PW76_SHOTS=<папка>. Сборка: PW76_FILE.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW76_SHOTS||null, FILE=process.env.PW76_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  // 1: the ark rings bring couriers
  const g1=await p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; GOD.maxAll(); LN.driveLvl=2; LN.gen=2; ensureGen(2); while(SECTORS.length<3) openSector(LN); tick(LN); LN.pauseNow=false; LN.nightSeen=true;
    const h0=LN.ships.length, p0=LN.earth.people, r1=arkBuy(LN,1), h1=LN.ships.length, p1=LN.earth.people, s1=LN.ships.slice(h0);
    const r3=arkBuy(LN,3), h3=LN.ships.length, gl=LN.log.slice(-20).filter(e=>e.code==='ark_gift').map(e=>e.d.l+'x'+e.d.c);
    return {r1,r3,one:h1-h0,two:h3-h1,cls:s1.map(s=>HULLS[s.hull].key+':'+s.hull+':'+s.mode+':'+s.at+':'+s.crew),yard:currentHull(LN,'courier'),dp:p1-p0,gl} });
  ok('1: one ark ring paid — one courier of the yards\' generation at the pier, with her own crew; Earth\'s people untouched', g1.r1==='ok'&&g1.one===1&&g1.cls.length===1&&g1.cls[0].indexOf('courier:'+g1.yard+':idle:earth:')===0&&+g1.cls[0].split(':').pop()>0&&g1.dp===0, JSON.stringify(g1));
  ok('1: two rings at once — two couriers; one ark_gift line a purchase (with the count)', g1.r3==='ok'&&g1.two===2&&g1.gl.join(',')==='1x1,3x2', JSON.stringify(g1));
  await p.evaluate(()=>{ LNU.notes=[]; LNdraw() }); await p.waitForTimeout(300);
  const t1=await p.evaluate(()=>[...document.querySelectorAll('#toasts .toast, #toast')].map(e=>e.textContent).join(' | '));
  await shot('g1-ark-gift');
  ok('1: the toast says couriers stand at the pier', /couriers at the pier/i.test(t1), t1.slice(0,200));
  // 2: the ring shakes before it goes dark
  const g2=await p.evaluate(()=>{ while(SECTORS.length<K.RING_LAST) openSector(LN); LN.driveLvl=5; LN.gen=5; ensureGen(5);
    const last=K.RING_LAST-1, w=PLANETS.filter(q=>q.sec===last&&q.kind!=='works')[0], w2=PLANETS.filter(q=>q.sec===last-1&&q.kind!=='works')[0];
    [w,w2].forEach(q=>{ LN.colonies[q.id]={pid:q.id,pop:120,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[q.id]=1; LN.reserves[q.id]=Math.max(LN.reserves[q.id],1e5) });
    openDoor(LN); const at=LN.door.dark[last], m0=lineRate(LN,w.id).own;
    LN.day=at-K.TREMOR_YEARS-1; tick(LN); LN.pauseNow=false;
    const tr=LN.log.slice(-15).some(e=>e.code==='ring_tremor'), m1=lineRate(LN,w.id).own, other=ringShakes(LN,last-1), out1=ringOut(LN,last);
    LN.day=at-2; tick(LN); LN.pauseNow=false; const stillThere=!!LN.colonies[w.id];
    LNU.pf=null; LNU.notes=[]; LNdraw(); return {w:w.id,tr,m0,m1,other,out1,stillThere,shakes:ringShakes(LN,last)} });
  ok('2: TREMOR_YEARS before the dark — ring_tremor; its world gives half; the ring inside does not shake; nothing dark before its day', g2.tr&&Math.abs(g2.m1-g2.m0*0.5)<1e-6&&!g2.other&&!g2.out1&&g2.stillThere&&g2.shakes, JSON.stringify(g2));
  await U.clear(); await p.evaluate(()=>LNdraw()); await p.waitForTimeout(300);
  const wd=await p.$('#map .wd[data-p="'+g2.w+'"] circle');
  if(wd){ const bb=await wd.boundingBox(); await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(300) }
  const tip=await p.evaluate(()=>{ const t=document.getElementById('tip'); return t&&t.className==='on'?t.textContent:'' });
  const lab=await p.evaluate(()=>[...document.querySelectorAll('#map text.nm')].filter(t=>/dark in/i.test(t.textContent)).map(t=>t.textContent+'|'+t.getAttribute('fill')).slice(-2));
  await shot('g2-ring-failing');
  ok('2: hovering the world says the ring is failing; the ring\'s name is red', /ring failing/i.test(tip)&&lab.some(l=>/7 · .*dark in \d+\|#FF2A1A/i.test(l)), JSON.stringify({tip,lab}));
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
