// v3.6.2 check: texts moved to the sheet — the player must see exactly what v3.6.1 showed (EN + RU),
// except the map labels that used to be hard-coded English. Real mouse for every click.
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const fs=require('fs');
const BOT=fs.readFileSync('pw11.js','utf8').split('const BOT=`')[1].split('`;')[0];
async function capture(b,file,lang){
  const p=await b.newPage({viewport:{width:1600,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  const tap=async sel=>{const L=p.locator(sel).first(); await L.scrollIntoViewIfNeeded(); const bb=await L.boundingBox(); if(!bb) throw new Error('no '+sel); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(90)};
  const txt=async sel=>(await p.evaluate(s=>{const e=document.querySelector(s);return e?e.textContent:''},sel)).replace(/\s+/g,' ').trim();
  await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/'+file); await p.waitForTimeout(300);
  await p.evaluate(()=>{ document.getElementById('seedin').value='309573272'; document.querySelector('[data-act="new"]').click(); });
  const S={};
  await tap('[data-lang="'+lang+'"]');
  for(let i=0;i<6;i++){ S['guide'+i]=await txt('#introbox'); if(i<5) await tap('[data-act="gnext"]'); }
  await tap('[data-act="intro"]');
  S.hdr=await txt('#hdr'); S.res=await txt('#res'); S.rail0=await txt('#railbody'); S.dock0=await txt('#dock'); S.adv0=await txt('#advisor');
  await p.addScriptTag({content:BOT});
  await p.evaluate(()=>botRun(520));
  await tap('.tab[data-tab="worlds"]'); S.worlds=await txt('#railbody');
  if(await p.isVisible('#intro')){ S.night=await txt('#introbox'); await tap('[data-act="nightok"]'); }
  await tap('.tab[data-tab="earth"]'); S.earth=await txt('#railbody');
  S.log=await txt('#log'); S.adv=await txt('#advisor'); S.dock=await txt('#dock'); S.hdr2=await txt('#hdr');
  await tap('#b-logf'); S.chron=await txt('#log'); await tap('#b-logf');
  const k=await p.evaluate(()=>{const G=window.LN; return Object.keys(G.colonies).find(k=>G.ships.some(s=>s.from===k))});
  const bb=await p.locator('[data-p="'+k+'"] circle.hit').boundingBox(); await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2); await p.waitForTimeout(120);
  S.target=await txt('#railbody');
  S.map=await p.evaluate(()=>[...document.querySelectorAll('#map text')].map(t=>t.textContent).join('|'));
  // a toast from MSG
  await p.evaluate(()=>{ window.LN.earth.people=0 }); await tap('.tab[data-tab="earth"]');
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('[data-act="survey"]')][0]; }); 
  // ending
  // v4.24: build ark by buying level 1 (was buildArk which added berths incrementally)
  await p.evaluate(()=>{ const G=window.LN; G.earth.people=900; G.earth.metal=1e4; G.earth.parts=1e4; G.earth.fuel=1e4; G.earth.food=1e4; if(!G.night) revealNight(G); G.nightSeen=true; arkBuy(G,1); G.night=G.day+2; for(let i=0;i<3;i++){ tick(G); G.pauseNow=false } });
  await tap('.tab[data-tab="worlds"]'); await p.waitForTimeout(150);
  S.end=await txt('#ovbox');
  await p.close();
  return {S,errs};
}
(async()=>{
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  for(const lang of ['en','ru']){
    const A=await capture(b,'long-night-old.html',lang), B=await capture(b,'long-night.html',lang);
    let same=0, diff=[];
    for(const k of Object.keys(A.S)){ if(A.S[k]===B.S[k]) same++; else diff.push(k) }
    console.log(`[${lang}] identical ${same}/${Object.keys(A.S).length} · errors old ${A.errs.length} new ${B.errs.length}`, B.errs.slice(0,3));
    for(const k of diff){
      const a=A.S[k], c=B.S[k]; let i=0; while(i<a.length&&a[i]===c[i]) i++;
      console.log(`  ${k}: first difference at ${i}\n    old: …${a.slice(Math.max(0,i-40),i+80)}\n    new: …${c.slice(Math.max(0,i-40),i+80)}`);
    }
    // raw keys leaking (T() returns the key when a string is missing)
    const leak=Object.values(B.S).join(' ').match(/\b(a_[a-z]+[A-Za-z]*|[a-z]+[A-Z][A-Za-z]+)\b/g)||[];
    const oldLeak=new Set(Object.values(A.S).join(' ').match(/\b(a_[a-z]+[A-Za-z]*|[a-z]+[A-Z][A-Za-z]+)\b/g)||[]);
    console.log(`  camelCase tokens only in new: ${[...new Set(leak)].filter(x=>!oldLeak.has(x)).join(', ')||'none'}`);
  }
  await b.close();
})();
