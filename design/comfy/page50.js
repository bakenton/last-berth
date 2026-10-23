// round 8: gallery page design/pult-50.html from pult50.js (images: intro/cand/f1_H##.webp)
const fs = require('fs'), path = require('path');
const P = require('./pult50.js');
const items = Object.keys(P).map(Number).sort((a, b) => a - b).map(n => ({ id: P[n].id, ru: P[n].ru, ref: P[n].ref }));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cards = items.map(it => `<figure class="c" data-id="${it.id}"><button class="im" aria-label="Открыть ${it.id}"><img loading="lazy" src="intro/cand/f1_${it.id}.webp" alt="${esc(it.ru)}" width="1536" height="640"></button><figcaption><b>${it.id}</b> ${esc(it.ru)}<small>${esc(it.ref)}</small></figcaption><button class="st" aria-pressed="false" title="Отметить">★</button></figure>`).join('\n');
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Пульт: 50 вариантов</title>
<style>
:root{--bg:#0d0f12;--card:#16191e;--ink:#e6e2d8;--dim:#8d929b;--acc:#f0b84a;--line:#262a31}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.4 system-ui,sans-serif}
header{position:sticky;top:0;z-index:2;background:rgba(13,15,18,.94);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
h1{font-size:17px;margin:0;font-weight:600}header p{margin:0;color:var(--dim);font-size:13px;flex:1 1 260px}
header button{background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer}
header button[aria-pressed=true]{border-color:var(--acc);color:var(--acc)}#n{color:var(--acc)}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:14px;padding:16px}
@media(max-width:520px){main{grid-template-columns:1fr;padding:12px 16px}}
.c{margin:0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden;position:relative}
.c.on{border-color:var(--acc)}.im{display:block;padding:0;border:0;background:#000;width:100%;cursor:zoom-in}
img{display:block;width:100%;height:auto}figcaption{padding:8px 44px 10px 10px}figcaption b{color:var(--acc);margin-right:4px}
small{display:block;color:var(--dim);font-size:12.5px;margin-top:2px}
.st{position:absolute;right:6px;bottom:8px;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--dim);font-size:17px;cursor:pointer}
.c.on .st{color:#111;background:var(--acc);border-color:var(--acc)}body.only .c:not(.on){display:none}
#lb{position:fixed;inset:0;background:#000;display:none;flex-direction:column;justify-content:center;z-index:5}
#lb.open{display:flex}#lb img{max-height:82vh;object-fit:contain}#lb p{text-align:center;margin:10px 16px;color:var(--ink)}
#lb p small{display:inline;margin-left:6px}
</style></head><body>
<header><h1>Пульт: 50 вариантов</h1><p>Зал, экипаж, Александра и старший смены одинаковые во всех кадрах, меняется только Пульт. Под кадром источник идеи (по памяти). ★ отмечает понравившиеся.</p>
<span>отмечено: <b id="n">0</b></span><button id="only" aria-pressed="false">только ★</button><button id="copy">скопировать номера</button></header>
<main>
${cards}
</main>
<div id="lb" role="dialog" aria-modal="true"><img alt=""><p></p></div>
<script>
const K='pult50-stars',cards=[...document.querySelectorAll('.c')];let S=new Set();
try{S=new Set(JSON.parse(localStorage.getItem(K)||'[]'))}catch(e){}
const sync=()=>{cards.forEach(c=>{const on=S.has(c.dataset.id);c.classList.toggle('on',on);c.querySelector('.st').setAttribute('aria-pressed',on)});document.getElementById('n').textContent=S.size;try{localStorage.setItem(K,JSON.stringify([...S]))}catch(e){}};
cards.forEach(c=>c.querySelector('.st').onclick=()=>{S.has(c.dataset.id)?S.delete(c.dataset.id):S.add(c.dataset.id);sync()});
const only=document.getElementById('only');only.onclick=()=>{const v=document.body.classList.toggle('only');only.setAttribute('aria-pressed',v)};
document.getElementById('copy').onclick=e=>{const t=[...S].sort().join(', ')||'ничего не отмечено';(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>e.target.textContent='скопировано: '+t,()=>prompt('Номера:',t))};
const lb=document.getElementById('lb'),li=lb.querySelector('img'),lp=lb.querySelector('p');let at=0;
const vis=()=>cards.filter(c=>c.offsetParent);
const show=i=>{const v=vis();at=(i+v.length)%v.length;const c=v[at];li.src=c.querySelector('img').src;lp.innerHTML=c.querySelector('figcaption').innerHTML;lb.classList.add('open')};
cards.forEach(c=>c.querySelector('.im').onclick=()=>show(vis().indexOf(c)));
lb.onclick=e=>{const x=e.clientX/innerWidth;x<.3?show(at-1):x>.7?show(at+1):lb.classList.remove('open')};
addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='Escape')lb.classList.remove('open');if(e.key==='ArrowLeft')show(at-1);if(e.key==='ArrowRight')show(at+1)});
let tx=0;lb.addEventListener('touchstart',e=>tx=e.touches[0].clientX,{passive:true});lb.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>50){e.preventDefault();show(at+(d<0?1:-1))}});
sync();
</script></body></html>`;
fs.writeFileSync(path.join(__dirname, '..', 'pult-50.html'), html, 'utf8');
console.log('pult-50.html', items.length, 'cards', html.length, 'bytes');
