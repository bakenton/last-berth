// pw74 — v5.41: конец игры, итерация 1 (Никита 16–17.11: «Точка невозврата и все… Если ты перешёл границу дальше только ночь»; «ночь… дата
//     ночи будет известна только после того, как мы откроем эту дверь… за это время игрок должен будет разобрать всю свою империю и посадить
//     все в ковчег»; «7-е кольцо последнее, 8-го нет»; объём — «Да»):
//  1  третье кольцо открывает ковчег без даты: вверху «????», кольцо ковчега покупается до двери;
//  2  после кольца VII вместо SURVEY — кнопка двери на карте; нажатие мышью — окно: что будет, «нельзя отменить», готовность ковчега;
//     короткое нажатие на «удерживайте» ничего не делает; удержание ~2 с — дверь открыта, у Ночи дата (через DOOR_YEARS), вверху год;
//  3  у колец — «гаснет через N»; мир и судно на кольце VII: за DARK_WARN лет — ring_dark_near, в срок — ring_dark: мир пропал вместе с людьми,
//     судно там — тоже, мира нет на карте; лететь туда нельзя (ringDark);
//  4  потолки: разведка — 'last', двигатель на поколении VII — 'genlast'; 390 px — окно двери в экране.
// Клики — мышью; состояние готовится через ядро и GOD. Снимки: PW74_SHOTS=<папка>. Сборка: PW74_FILE.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW74_SHOTS||null, FILE=process.env.PW74_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n,sel)=>{ if(!SHOTS) return; const f=path.join(SHOTS,n+'.png'); const e=sel&&await pg.$(sel); if(e&&await e.isVisible()) await e.screenshot({path:f}); else await pg.screenshot({path:f}) };
  const tickN=(p,n)=>p.evaluate(n=>{ for(let i=0;i<n;i++){ tick(LN); LN.pauseNow=false; LN.shiftOpen=false } LNU.notes=[]; LNdraw() },n);
  for(const [tag,vp] of [['',{width:1440,height:900}],['-390',{width:390,height:844}]]){
    const p=await UI.newPage(b,{vp,file:FILE}); const U=UI.ui(p);
    await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
    // 1: three rings — the ark is known, no date
    const s1=await p.evaluate(()=>{ LN.safe=true; LN.sig={hub:1,ark:1,drive:1}; GOD.maxAll(); while(SECTORS.length<3) openSector(LN);
      for(let i=0;i<3;i++){ tick(LN); LN.pauseNow=false } LN.nightSeen=true; LNU.notes=[]; LNdraw();
      const hd=document.querySelector('.yr.night'); return {known:nightKnown(LN), night:LN.night, mark:LN.arkMark, hd:hd&&hd.textContent, buy:arkBuy(LN,1), rings:arkRings(LN)} });
    ok('1'+tag+': ring III opens the ark with no date — the top says ????, ring 1 of the ark is bought before the door', s1.known&&!s1.night&&/\?\?\?\?/.test(s1.hd||'')&&s1.buy==='ok'&&s1.rings===1, JSON.stringify(s1));
    // 2: the last ring, the door
    await p.evaluate(()=>{ LN.driveLvl=5; LN.gen=5; ensureGen(5); GOD.maxAll(); while(SECTORS.length<K.RING_LAST) openSector(LN);
      const w=PLANETS.filter(q=>q.sec<2&&q.kind!=='works').sort((a,b)=>a.dist-b.dist).slice(0,8); w.forEach(q=>{ LNU.win=q.id; GOD.settle(); LNU.win=null });
      LNU.tab=null; LNU.win=null; LNU.notes=[]; LNdraw() });
    await p.waitForTimeout(400); await p.evaluate(()=>LNdraw()); await p.waitForTimeout(200);
    const rb=await p.evaluate(()=>{ const e=document.getElementById('ringbtn'), bt=e&&e.querySelector('.b'); return {vis:!!e&&!e.hidden, door:!!bt&&bt.classList.contains('door'), txt:e&&e.textContent, sv:canSurvey(LN), cd:canDoor(LN)} });
    await U.clear(); await p.waitForTimeout(200); await shot(p,'d1-door-on-chart'+tag);
    ok('2'+tag+': past ring VII there is no survey («last») — the chart holds the door: «Only the Night»', rb.vis&&rb.door&&/only the night/i.test(rb.txt||'')&&rb.sv==='last'&&rb.cd==='ok', JSON.stringify(rb));
    await U.tap('#ringbtn .b.door'); await p.waitForTimeout(300);
    const w=await p.evaluate(()=>{ const e=document.querySelector('.win.door'); if(!e) return null; const r=e.getBoundingClientRect(); return {txt:e.textContent, checks:e.querySelectorAll('.ock').length, inScr:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1, hold:!!document.getElementById('doorhold')} });
    await shot(p,'d2-door-window'+tag,'.win.door');
    ok('2'+tag+': the press opens the door\'s window: what it does, «cannot be undone», the ark\'s three checks, the held button, inside the screen', !!w&&/cannot be undone/i.test(w.txt)&&/goes? dark|go dark/i.test(w.txt)&&w.checks===3&&w.hold&&w.inScr, JSON.stringify(w));
    await U.tap('#doorhold'); await p.waitForTimeout(400);
    const n0=await p.evaluate(()=>LN.night);
    ok('2'+tag+': a press alone does nothing', !n0, n0);
    const hb=await (await p.$('#doorhold')).boundingBox(); await p.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2); await p.mouse.down(); await p.waitForTimeout(800);
    await shot(p,'d3-door-holding'+tag,'.win.door'); await p.waitForTimeout(1500); await p.mouse.up(); await p.waitForTimeout(400);
    const n1=await p.evaluate(()=>{ LNU.notes=[]; LNdraw(); const hd=document.querySelector('.yr.night b'); return {night:LN.night, day:LN.day, door:LN.door&&LN.door.at, win:LNU.win, hd:hd&&hd.textContent} });
    ok('2'+tag+': held ~2 s — the door is open: the Night dated '+'DOOR_YEARS ahead, the window closed, the year on top', n1.night===n1.day+500&&n1.door===n1.day&&!n1.win&&n1.hd===String(n1.night), JSON.stringify(n1));
    if(!tag){
      // 3: the rings say when they go dark; a world and a hull on ring VII
      await p.evaluate(()=>{ LNU.pop=null; LN.nightSeen=true; LNdraw() }); await p.waitForTimeout(300);
      const lab=await p.evaluate(()=>[...document.querySelectorAll('#map text.nm')].map(t=>t.textContent).filter(t=>/dark in/i.test(t)));
      await shot(p,'d4-rings-dark-in');
      ok('3: the ring names say when they go dark', lab.length>=7&&lab.some(t=>/dark in 150/.test(t)), JSON.stringify(lab));
      const s3=await p.evaluate(()=>{ const last=K.RING_LAST-1, w=PLANETS.filter(q=>q.sec===last&&q.kind!=='works')[0]; LN.safe=true;
        LN.colonies[w.id]={pid:w.id,pop:120,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[w.id]=LN.day;
        const h=currentHull(LN,'courier'); buildShip(LN,h); const s=LN.ships[LN.ships.length-1]; s.mode='transit'; s.at=null; s.origin='earth'; s.dest=w.id; s.dir='out'; s.t=99999; s.total=99999;
        const adv=advice(LN).filter(a=>a.code==='a_ringdark')[0]; const at=LN.door.dark[last];
        LN.day=at-K.DARK_WARN-1; tick(LN); LN.pauseNow=false; const near=LN.log.slice(-15).some(e=>e.code==='ring_dark_near');
        LN.day=at-1; tick(LN); LN.pauseNow=false; const lg=LN.log.slice(-25).filter(e=>e.code==='ring_dark'||e.code==='world_dark').map(e=>e.code);
        LNU.notes=[]; LNdraw(); return {w:w.id, adv:adv&&adv.n, near, lg, gone:!LN.colonies[w.id], ship:s.mode, out:ringOut(LN,last), dep:canDepart(LN,LN.ships.find(q=>q.mode==='idle'&&q.at==='earth')||s,w.id), onMap:!!document.querySelector('#map .wd[data-p="'+w.id+'"]')} });
      await shot(p,'d5-ring-gone-dark');
      ok('3: the advisor counts down to ring VII going dark with its people', s3.adv===150, JSON.stringify(s3));
      ok('3: DARK_WARN years before — ring_dark_near; on the day — ring_dark: the world gone with its people, the hull there lost', s3.near&&s3.lg.includes('ring_dark')&&s3.lg.includes('world_dark')&&s3.gone&&s3.ship==='dead'&&s3.out, JSON.stringify(s3));
      ok('3: the dark ring\'s worlds leave the chart, and nothing flies there', !s3.onMap&&(s3.dep==='ringDark'||s3.dep==='noship'), JSON.stringify(s3));
      // 4: the caps
      const c4=await p.evaluate(()=>{ LN.drive=null; LN.driveLvl=K.GEN_LAST; LN.gen=K.GEN_LAST; ensureGen(LN.gen); return {sv:canSurvey(LN), sd:startDrive(LN), cd:canDoor(LN)} });
      ok('4: the caps — no ring past VII («last»), no drive past Generation VII («genlast»), the door only once', c4.sv==='last'&&c4.sd==='genlast'&&c4.cd==='doorOpen', JSON.stringify(c4));
      ok('no page errors', !p.errs.length, p.errs.join(' | ')) }
    await p.close() }
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
