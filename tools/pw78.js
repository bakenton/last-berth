// pw78 — v5.43 (Nikita 18.11: «Берём его» — the notices after Clash of Clans; scope v5.43 «Делай»):
//  1  the shift: no window, the clock does not stop; the shift's two orders come to the objective card (what · reward · TAKE);
//     TAKE pressed with the mouse → the order is on the card, the answer is one line at the top of the chart;
//  2  the tabs: a badge (a number / «!») instead of the worded flag; the words are the button's title; red for an alarm;
//  3  the log does not pop up: a loss (here a hull written off) waits behind LOSSES with a red badge; opening the list clears the badge;
//     an empty ring going dark is no loss; a seam running dry is in the list and is not a toast.
// State through the core and GOD. Shots: PW78_SHOTS=<dir>. Build: PW78_FILE.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const UI=require('./pw-ui.js'); const path=require('path');
const SHOTS=process.env.PW78_SHOTS||null, FILE=process.env.PW78_FILE||'page.html';
const out=[]; const ok=(n,c,x)=>out.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' — '+String(x).slice(0,300):''));
(async()=>{ try{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  const p=await UI.newPage(b,{vp:{width:1440,height:900},file:FILE}); const U=UI.ui(p);
  const shot=async n=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}) };
  await U.start('en',11); await U.pause(); await p.waitForTimeout(300);
  // a game with two worlds, just before a shift
  await p.evaluate(()=>{ LN.safe=true; GOD.maxAll(); const ws=PLANETS.filter(q=>q.sec===0&&q.kind!=='works').slice(0,2);
    ws.forEach(q=>{ LN.colonies[q.id]={pid:q.id,pop:120,store:{metal:0,food:0,fuel:0,parts:0},founded:LN.day}; (LN.settled=LN.settled||{})[q.id]=1; LN.reserves[q.id]=Math.max(LN.reserves[q.id]||0,1e5) });
    LN.stats.founded=Math.max(LN.stats.founded||0,2); ordersOf(LN).offer=[]; ordersOf(LN).on=null;
    LN.day=K.SHIFT_YEARS*3-3; LNU.notes=[]; LNdraw() });
  await U.clear();
  // 1: play through the shift on the page's own clock
  const d0=await p.evaluate(()=>LN.day);
  await U.play(10); let seenWin=false;
  for(let i=0;i<40;i++){ await p.waitForTimeout(150); const s=await p.evaluate(()=>({day:LN.day,big:LNI.big(),win:!!document.querySelector('#shiftwin')})); if(s.big==='shift'||s.win) seenWin=true; if(s.day>=d0+6) break }
  const run=await p.evaluate(()=>({day:LN.day,paused:LNU.paused,offer:(LN.orders.offer||[]).length,no:(LN.orders.offer[0]||{}).no}));
  await U.pause(); await p.evaluate(()=>{ LNU.notes=[]; LNdraw() }); await U.clear();
  ok('1: the shift passes without a window and without stopping the clock', !seenWin&&run.day>=d0+6&&run.offer===2, JSON.stringify(run));
  const card=await p.evaluate(()=>{ const c=document.querySelector('#cards .ordc'); return c?{t:c.innerText.replace(/\s+/g,' '),rows:c.querySelectorAll('.orc').length,take:c.querySelectorAll('[data-act="ordtake"]').length,rw:[...c.querySelectorAll('.rw')].map(r=>r.title)}:null });
  await shot('g1-card-orders');
  ok('1: the two orders are on the objective card — what, the reward (its words on hover), TAKE', card&&card.rows===2&&card.take===2&&/SHIFT \d+ · PICK ONE/i.test(card.t)&&card.rw.every(t=>/people|hull/i.test(t)), JSON.stringify(card));
  await U.tap('#cards .ordc [data-act="ordtake"]'); await p.waitForTimeout(300);
  const tk=await p.evaluate(()=>{ const t=document.querySelector('#toasts .toast'); const r=t?t.getBoundingClientRect():null; return {on:!!LN.orders.on,card:!!document.querySelector('#cards .ordc'),line:!!document.querySelector('#cards .ocard .sg.ord'),toast:t?t.textContent:'',n:document.querySelectorAll('#toasts .toast').length,top:r?Math.round(r.top):null} });
  await shot('g1-taken');
  ok('1: TAKE with the mouse — the order is on the card, the offer gone; the answer is one line at the top of the chart', tk.on&&!tk.card&&tk.line&&tk.toast.length>0&&tk.n===1&&tk.top!==null&&tk.top<200, JSON.stringify(tk));
  // 2: the tabs' badges
  const bd=await p.evaluate(()=>{ const s=LN.ships.find(x=>x.mode!=='dead'&&x.mode!=='building'); if(s){ s.mode='idle'; s.at='earth'; s.from=null; s.to=null; s.reserve=false; s.mutiny=false; s.pend=null } LNU.notes=[]; LNdraw();
    const f=document.querySelector('#tabs [data-v="fleet"]'); const e=f&&f.querySelector('.bdg'); return {flag:document.querySelectorAll('#tabs .flag').length,b:e?e.textContent:'',red:e?e.classList.contains('red'):null,title:f?f.getAttribute('title'):'',want:LNI.flags().fleet} });
  await shot('g2-badges');
  ok('2: the fleet tab wears a badge with the number of idle hulls; no worded flag; the words are its title', bd.flag===0&&bd.want&&bd.b===String(bd.want[2])&&!bd.red&&/pier/i.test(bd.title||''), JSON.stringify(bd));
  // 3: a loss waits behind LOSSES; nothing pops up
  await p.waitForTimeout(4200);   // the answer to TAKE has faded
  const l1=await p.evaluate(()=>{ log(LN,'ship_written_off',{n:77,c:4}); log(LN,'depleted',{p:Object.keys(LN.colonies)[0]}); log(LN,'ring_dark',{r:'VII',c:0,h:0,s:0,k:0}); LN.pauseNow=true; LNdraw(); return 1 });
  await U.play(2); await p.waitForTimeout(700); await U.pause();
  const l2=await p.evaluate(()=>{ const bt=document.querySelector('#pfL .ltarch.loss'); const e=bt&&bt.querySelector('.bdg'); return {btn:!!bt,n:bt?bt.querySelector('b').textContent:'',badge:e?e.textContent:'',toasts:[...document.querySelectorAll('#toasts .toast')].map(t=>t.textContent)} });
  await shot('g3-losses-button');
  ok('3: a hull written off and a dry seam — LOSSES with a red badge 2; the empty ring is not counted; no toast', l1&&l2.btn&&l2.n==='2'&&l2.badge==='2'&&!l2.toasts.length, JSON.stringify(l2));
  await U.tap('#pfL .ltarch.loss'); await p.waitForTimeout(300);
  const l3=await p.evaluate(()=>({rows:[...document.querySelectorAll('#pop .lss .lsr')].map(r=>r.textContent),badge:!!document.querySelector('#pfL .ltarch.loss .bdg')}));
  await shot('g3-losses-list');
  ok('3: the list opens with the two lines; the badge is gone once seen', l3.rows.length===2&&/77/.test(l3.rows.join('|'))&&!l3.badge, JSON.stringify(l3));
  // 4 (the reviewer): the order taken answers with its result — the one line at the top; a save from before LOSSES has seen its old losses
  await U.clear(); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const o=LN.orders.on; log(LN,'order_done_people',{k:o?o.k:'hulls',n:37,t:o?o.k:''}); LNdraw() }); await U.play(2); await p.waitForTimeout(500); await U.pause();
  const od=await p.evaluate(()=>[...document.querySelectorAll('#toasts .toast')].map(t=>t.className+'|'+t.textContent));
  ok('4: an order done — one green line at the top says it', od.length===1&&/good/.test(od[0]), JSON.stringify(od));
  const sv=await p.evaluate(()=>{ log(LN,'ship_written_off',{n:78,c:2}); const s=JSON.parse(LNsave()); delete s.G.lossSeen; LNload(JSON.stringify(s)); LNU.pop=null; LNdraw();
    const bt=document.querySelector('#pfL .ltarch.loss'); return {btn:!!bt,badge:!!(bt&&bt.querySelector('.bdg'))} });
  ok('4: a save from before LOSSES loads with its old losses seen (no red badge)', sv.btn&&!sv.badge, JSON.stringify(sv));
  ok('no page errors', !p.errs.length, p.errs.join(' | '));
  await b.close();
}catch(e){ out.push('FAIL crash — '+(e&&e.stack||e)) }
  console.log(out.join('\n')); const f=out.filter(l=>l.startsWith('FAIL')).length; console.log((out.length-f)+'/'+out.length+' PASS'); process.exit(f?1:0) })();
