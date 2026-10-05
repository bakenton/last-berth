// Библиотека бота для браузерных сценариев (botStep/botRun). Сценарий pw11 (летопись, v3.6) удалён 01.10.2026 по решению Никиты:
// сломан с v3.8. Файл оставлен под прежним именем: pw12/14/15/18/19/21/22, hero.js, shots2/3 читают BOT отсюда
// читая этот файл и вырезая литерал BOT. Не переименовывать без правки этих файлов; маркер литерала в комментариях не писать.
const BOT=`
function botStep(G,d){
  const E=G.earth;
  const freeH=()=>G.ships.filter(s=>s.mode==='idle'&&s.at==='earth'&&!(s.from&&s.to));
  const lined=pid=>G.ships.some(s=>s.mode!=='dead'&&s.from===pid);
  for(const k in G.colonies){ if(G.colonies[k].dark||lined(k)) continue; const p=planet(k);
    const s=freeH().find(s=>canReachSector(s,p.sec)); if(s) setLine(G,s.id,k,'earth'); }
  if(E.people>K.EARTH_KEEP+30){ let best=null,bv=-1e9;
    for(const p of PLANETS){ if(p.sec>=SECTORS.length||G.colonies[p.id]||G.ghost[p.id]) continue;
      const s=freeH().find(s=>canReachSector(s,p.sec)); if(!s) continue; let v=-p.dist; if(p.kind==='farm'&&E.food<(G.need?G.need.food:5)*40) v+=800; if(v>bv){bv=v;best={p,s}} }
    if(best) colonize(G,best.s.id,best.p.id,26,0); }
  if(freeH().length<2){ let want=0;
    for(const k in G.colonies){ if(!lined(k)) want=Math.max(want,planet(k).sec) }
    for(const p of PLANETS){ if(p.sec<SECTORS.length&&!G.colonies[p.id]&&!G.ghost[p.id]) want=Math.max(want,p.sec) }
    const cands=HULLS.map((h,i)=>({h,i})).filter(x=>x.h.gen===(G.gen||0)).filter(x=>(x.h.reach||0)<=reach(G));
    const fits=cands.filter(x=>canReachSector({hull:x.i},want));
    for(const x of (fits.length?fits:cands).sort((a,b)=>a.h.metal-b.h.metal)){ if(E.metal-x.h.metal<260) continue; if(buildShip(G,x.i)==='ok') break; } }
  if(!G.drive){ for(const k in G.colonies){ const p=planet(k);
    if(p.kind==='works'&&!G.colonies[k].dark&&G.colonies[k].pop>=K.DRIVE_POP&&settledCount(G)>=driveReachFor(G)){ if(startDrive(G,k)==='ok') break; } } }
  if(canSurvey(G)==='ok'){ const nd=G.need||{food:4,metal:3}; if(E.food>nd.food*90&&E.metal>300) survey(G); }
  if(d%120===0) scrapIdle(G,(G.gen||0)-2);
}
window.botRun=function(years){ const G=window.LN; for(let d=0;d<years&&!G.over;d++){ tick(G); G.pauseNow=false; botStep(G,G.day); } };
`;
if(typeof module!=='undefined') module.exports={BOT};
