// pw73 — v5.40 (п. 20 фидбека Никиты по партии v5.29: «Ещё надо в игру добавить какую-то музыку на бекграунд… А то скучно»;
//     17.11: «вшиваем всё в файл», «скачивай все»): Scott Buckley, CC-BY 4.0.
//  1  после первого нажатия в партии играет спокойный трек: элемент идёт, громкость поднимается, звук идёт через AudioContext (не CORS-нули);
//  2  ≡ — пункт Music и строка автора; выключение мышью — трек гаснет и встаёт; включение — играет снова;
//  3  конец трека — следующий спокойный, другой, с перекрёстным затуханием;
//  4  Ночь — Fading по кругу; главное меню — музыка гаснет.
// Звук на слух не проверяется. Сборка: PW73_FILE.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js');
const FILE=process.env.PW73_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined,args:['--autoplay-policy=no-user-gesture-required']});
  const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p); const cons=[]; p.on('console',m=>cons.push(m.text()));
  await U.start('en',11); await U.pause(); await p.mouse.click(700,450); await p.waitForTimeout(300); await U.clear();
  const st=()=>p.evaluate(()=>LNmus.state()); const curOf=s=>{ const c=s[s.length-1].cur; return s.find(q=>q.i===c) };
  await p.waitForTimeout(3500); const s1=await st(), c1=curOf(s1);
  ok('1: a calm track plays after the first press', !!c1&&['sleep','place','cobalt','meanwhile'].includes(c1.id)&&!c1.paused&&c1.t>0.5, JSON.stringify(s1));
  ok('1: its volume rises (the fade in), through the AudioContext', !!c1&&c1.vol>0.2&&c1.gain, JSON.stringify(c1));
  ok('1: no «zeroes due to CORS» from the media source', !cons.some(t=>/CORS|zeroes/i.test(t)), cons.filter(t=>/CORS|zeroes/i.test(t)).join(' | '));
  // 2: ≡ Music
  await U.tap('[data-act="pop"][data-v="menu"],#menubtn,[data-act="menu"]').catch(()=>{});
  let m=await p.evaluate(()=>{ const e=document.querySelector('.menu [data-act="mus"]'); const c=document.querySelector('.menu .mcred'); return {btn:e&&e.textContent, cred:c&&c.textContent} });
  if(!m.btn){ await p.evaluate(()=>{ LNU.pop='menu'; LNdraw() }); await p.waitForTimeout(200); m=await p.evaluate(()=>{ const e=document.querySelector('.menu [data-act="mus"]'); const c=document.querySelector('.menu .mcred'); return {btn:e&&e.textContent, cred:c&&c.textContent} }) }
  ok('2: ≡ has «Music ON» and the author\'s credit (CC-BY)', /music/i.test(m.btn||'')&&/on/i.test(m.btn||'')&&/Scott Buckley/.test(m.cred||'')&&/CC-BY/.test(m.cred||''), JSON.stringify(m));
  await U.tap('.menu [data-act="mus"]'); await p.waitForTimeout(7500); const s2=await st(), c2=curOf(s2);
  ok('2: Music OFF with the mouse — the track fades out and stops; remembered', !!c2&&c2.vol===0&&c2.paused&&!s2[s2.length-1].on&&await p.evaluate(()=>localStorage.getItem('lb.mus')==='0'), JSON.stringify(s2));
  await p.evaluate(()=>{ LNU.pop='menu'; LNdraw() }); await p.waitForTimeout(200);
  await U.tap('.menu [data-act="mus"]'); await p.waitForTimeout(2500); const s3=await st(), c3=curOf(s3);
  ok('2: Music ON again — it plays', !!c3&&!c3.paused&&c3.vol>0, JSON.stringify(s3));
  await p.keyboard.press('Escape');
  // 3: the end of a track
  const id0=c3.id; await p.evaluate(()=>LNmus.seek(4)); await p.waitForTimeout(3000); const s4=await st(), c4=curOf(s4);
  ok('3: at a track\'s end the next calm one comes, another one, crossfading', !!c4&&c4.id!==id0&&c4.id!=='fading'&&!c4.paused&&s4.length===3, JSON.stringify(s4));
  await p.waitForTimeout(6000); const s5=await st(); const old=s5.find(q=>q.id===id0);
  ok('3: the old one is silent and stopped after the fade', !old||(old.vol===0&&old.paused), JSON.stringify(s5));
  // 4: the Night, the main menu
  await p.evaluate(()=>{ LN.night=true; LN.nightSeen=true }); await p.waitForTimeout(1500); const s6=await st(), c6=curOf(s6);
  ok('4: from the Night on — Fading, looped', !!c6&&c6.id==='fading'&&!c6.paused, JSON.stringify(s6));
  await p.evaluate(()=>{ LNU.menu=true }); await p.waitForTimeout(7000); const s7=await st(), c7=curOf(s7);
  ok('4: the main menu — the music fades out', !!c7&&c7.vol===0, JSON.stringify(s7));
  await p.evaluate(()=>{ LNU.menu=false }); await p.waitForTimeout(1500); const c8=curOf(await st());
  ok('4: back in the run — the same track again', !!c8&&c8.id==='fading'&&!c8.paused&&c8.vol>0, JSON.stringify(c8));
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
