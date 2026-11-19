// pw72 — v5.38 (п. 19 фидбека Никиты по партии v5.29: «вращение космоса на бекграунде + добавить какие-то космические явления. Кометы и тд.
//     Чтобы чуть поживее было»):
//  1  небо поворачивается само по реальному времени, и на паузе тоже; кадры идут, ошибок нет;
//  2  комета, метеор и вспышка звезды появляются (по таймеру — здесь вызваны хуком LNsky.spawn), рисуются за полом и гаснут в свой срок;
//  3  «Reduce motion» в системе — небо стоит, явлений нет.
// Снимки: PW72_SHOTS=<папка>. Сборка: PW72_FILE.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW72_SHOTS||null, FILE=process.env.PW72_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const shot=async(pg,n)=>{ if(SHOTS) await pg.screenshot({path:path.join(SHOTS,n+'.png')}) };
  {
    const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
    await U.start('en',11); await U.pause(); await p.waitForTimeout(600);
    const a0=await p.evaluate(()=>LNsky.ang()); await p.waitForTimeout(2500); const a1=await p.evaluate(()=>LNsky.ang());
    ok("1: the sky turns on its own while the run is paused (v5.44: 240 s a turn)", a1>a0&&a1-a0<0.3, JSON.stringify({a0,a1}));
    const st=await p.evaluate(()=>!!LNsky.get()&&!LNsky.still()); ok('1: the sky state is there, motion allowed', st);
    await shot(p,'s1-sky');
    const sp=await p.evaluate(()=>['c','m','f'].map(k=>LNsky.spawn(k)));
    await p.waitForTimeout(350); const live=await p.evaluate(()=>LNsky.get().list.map(o=>o.k).join(''));
    await shot(p,'s2-meteor-comet-flare');
    ok('2: a comet, a meteor and a flare are on the sky', /c/.test(live)&&/m/.test(live)&&/f/.test(live), JSON.stringify({sp,live}));
    await p.waitForTimeout(3000); await shot(p,'s3-comet-later');
    const l2=await p.evaluate(t0s=>LNsky.get().list.filter(o=>t0s.indexOf(o.t0)>=0).map(o=>o.k).join(''), sp.map(o=>o.t0));   // only the ones this scenario called: the sky's own timer may send another
    ok('2: the meteor is gone in its second, the comet still crosses', !/m/.test(l2)&&/c/.test(l2), l2);
    await p.waitForTimeout(14000); const l3=await p.evaluate(t0s=>LNsky.get().list.filter(o=>t0s.indexOf(o.t0)>=0).length, sp.map(o=>o.t0));
    ok('2: the comet and the flare fade out in their time', l3===0, l3);
    // zoomed in on a 390 px phone the same sky
    await p.setViewportSize({width:390,height:844}); await p.waitForTimeout(500); await p.evaluate(()=>LNsky.spawn('c')); await p.waitForTimeout(1500); await shot(p,'s4-390-comet');
    ok('no page errors', !p.errs.length, p.errs.join(' | '));
    await p.close() }
  {
    const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}); const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(String(e))); p.file=FILE;
    const U=UI.ui(p); await U.start('en',11); await U.pause(); await p.waitForTimeout(600);
    const r=await p.evaluate(()=>{ const s=LNsky.get(); return {still:LNsky.still(), ang:LNsky.ang(), n:s?s.list.length:0} });
    await p.evaluate(()=>LNsky.spawn('c')); await p.waitForTimeout(300); const n2=await p.evaluate(()=>LNsky.get().list.length);
    ok('3: «reduce motion» — the sky stands, no comet lives', r.still&&r.ang===0&&n2===0, JSON.stringify({r,n2}));
    ok('3: no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close() }
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
