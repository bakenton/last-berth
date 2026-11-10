/* ja-shots — японская сборка в настоящем браузере: меню, терминал, первый шаг обучения, вкладки, окно мира, взлом; 1440×900 и 390×844.
   node tools/ja-shots.js            → work/playtest/ja-shots/*.png + список: латиница в видимом тексте, обрезанные надписи, ошибки страницы.
   Код игры не трогает; проверяет файл play/JA/LAST-BERTH-v<версия>-ja.html. */
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path'),url=require('url');
const ROOT=path.resolve(__dirname,'..');
const v=(fs.readFileSync(path.join(ROOT,'work','core.js'),'utf8').match(/var VERSION=\{v:'([^']+)'\}/)||[])[1];
const FILE=path.join(ROOT,'play','JA','LAST-BERTH-v'+v+'-ja.html');
const OUT=path.join(ROOT,'work','playtest','ja-shots'); fs.mkdirSync(OUT,{recursive:true});
const out=[]; const say=(t)=>{ out.push(t); console.log(t) };
// видимый текст с латинскими словами (кроме имён собственных кода: LAST BERTH, WASD, коды команд) и обрезанные надписи
const audit=()=>{ const lat=new Set(), clip=[]; const skip=/^(LAST BERTH|WASD|Esc|HULL\.GEN|ARK\.LVL|json|rpm|atm|bar|mg|DEBUG)/;
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); let n;
  while((n=w.nextNode())){ const e=n.parentElement; if(!e||e.closest('#god,#god-tab,script,style')) continue; const r=e.getBoundingClientRect(); if(!r.width||!r.height) continue;
    const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0) continue;
    const t=n.textContent.trim(); if(!t) continue;
    (t.match(/[A-Za-z][A-Za-z']{2,}(?: [A-Za-z']{2,})*/g)||[]).forEach(x=>{ if(!skip.test(x)&&!/^(I{1,3}|IV|V|VI{0,3}|IX|X)$/.test(x)) lat.add(x) });
    if((cs.overflow==='hidden'||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+1&&e.children.length===0) clip.push(t.slice(0,40)+' ['+e.clientWidth+'<'+e.scrollWidth+']') }
  return {lat:[...lat].slice(0,40),clip:[...new Set(clip)].slice(0,30)} };
(async()=>{ const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  for(const vp of [{width:1440,height:900},{width:390,height:844}]){ const tag=vp.width+'';
    const p=await b.newPage({viewport:vp}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
    const shot=async name=>{ await p.waitForTimeout(250); await p.screenshot({path:path.join(OUT,tag+'-'+name+'.png')});
      const a=await p.evaluate(audit); if(a.lat.length) say(tag+' '+name+' латиница: '+a.lat.join(' | ')); if(a.clip.length) say(tag+' '+name+' обрезано: '+a.clip.join(' | ')) };
    const click=async sel=>{ const r=await p.locator(sel).first().boundingBox(); if(!r) return false; await p.mouse.click(r.x+r.width/2,r.y+r.height/2); await p.waitForTimeout(200); return true };
    await p.goto(url.pathToFileURL(FILE).href); await p.waitForTimeout(900);
    say(tag+' lang='+await p.evaluate(()=>document.documentElement.lang)+' · шрифт текста: '+await p.evaluate(()=>{ const e=document.querySelector('#menu .mit')||document.body; return getComputedStyle(e).fontFamily.slice(0,60) }));
    await shot('01-menu');
    // новая игра → терминал
    await click('#menu .mit[data-id="new"]'); for(let i=0;i<80&&!(await p.isVisible('#menu .mterm'));i++) await p.waitForTimeout(150);
    await p.waitForTimeout(6000); await shot('02-terminal');
    await click('#menu [data-m="skip"]'); for(let i=0;i<30&&await p.evaluate(()=>LNU.menu);i++) await p.waitForTimeout(100);
    await p.waitForTimeout(1200); await shot('03-tutorial');
    // всё открыто: вкладки и окна на прожитой партии (панель отладки двигает время и даёт ресурсы)
    await p.evaluate(()=>{ LNtut.off(); LNU.shiftStop=false; LNdraw() });
    const closeBig=async()=>{ for(let i=0;i<10;i++){ await p.evaluate(()=>LNdraw()); const k=await p.evaluate(()=>LNI.big()); const s=k==='shift'?'[data-act="shiftok"]':k==='night'?'[data-act="nightok"]':k==='note'?'[data-act="noteok"]':null; if(!s) break; await click(s) }
      for(let i=0;i<4&&await p.isVisible('#pfL [data-act="pfok"]');i++) await click('#pfL [data-act="pfok"]') };
    const tabs=await p.evaluate(()=>[...document.querySelectorAll('#tabs [data-act="tab"]')].map(e=>e.dataset.v));
    await shot('04-game');
    for(const t of tabs){ await closeBig(); await click('#tabs [data-act="tab"][data-v="'+t+'"]'); await shot('05-tab-'+t); await click('#tabs [data-act="tab"][data-v="'+t+'"]') }
    // окно свободного мира
    const pid=await p.evaluate(()=>{ const e=document.querySelector('#map .wd[data-p]'); return e?e.dataset.p:null });
    if(pid){ const pt=await p.evaluate(pid=>{ const c=document.querySelector('#map .wd[data-p="'+pid+'"] circle[fill="transparent"]'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} },pid);
      if(pt){ await p.mouse.click(pt.x,pt.y); await shot('06-world'); await p.keyboard.press('Escape') } }
    // время идёт: отчёт смены и что придёт само
    await p.evaluate(()=>{ LNU.shiftStop=true; LNU.speed=10; LNU.paused=false; LNdraw() });
    for(let i=0;i<120&&(await p.evaluate(()=>LNI.big()))!=='shift';i++) await p.waitForTimeout(250);
    await shot('07-shift'); await closeBig();
    say(tag+' ошибок страницы: '+errs.length+(errs.length?' — '+errs.slice(0,3).join(' ; ').slice(0,300):''));
    await p.close() }
  await b.close(); fs.writeFileSync(path.join(OUT,'report.txt'),out.join('\n')+'\n','utf8');
})().catch(e=>{ console.error('FAIL',e); process.exit(1) });
