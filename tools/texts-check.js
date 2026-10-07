/* LAST BERTH — проверка текстов собранной страницы. Код игры не трогает.
   node tools/texts-check.js [page.html] [--warn]      по умолчанию work/page.html
   Ошибки (exit 1): пустой en/ru, разные {плейсхолдеры}, дубль ключа, неизвестная таблица,
     T('x')/say('x') в коде без строки в UI/MSG, круговой тест (страница → CSV → texts-pull.js → те же строки).
   Предупреждения: строка не использована (нет литерала ключа в core/ui), расхождение со свежим CSV в texts/.
   Динамические ключи (LOG, VOICE, shift_*, lobeN) по литералу не найти — для них только счётчик. */
const fs=require('fs'), path=require('path'), cp=require('child_process'), os=require('os');
const LB=path.resolve(__dirname,'..');
const page=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||path.join(LB,'work','page.html'));
const W=path.dirname(page);
const err=[], warn=[];
const ph=s=>(String(s||'').match(/\{\w+\}/g)||[]).sort().join();
const m=fs.readFileSync(page,'utf8').match(/<script type="application\/json" id="lb-texts" data-url="[^"]*">([\s\S]*?)<\/script>/);
if(!m){ console.log('FAIL no lb-texts block in',page); process.exit(1) }
const rows=JSON.parse(m[1]);
const TABLES=new Set(['UI','LOG','MSG','RES','GUIDE','VOICE']);

// 1. строки
const seen=new Set(), byId={};
for(const [t,k,en,ru] of rows){
  const id=t+'.'+k;
  if(!TABLES.has(t)) err.push('таблица '+id);
  if(seen.has(id)) err.push('дубль '+id); seen.add(id); byId[id]={en,ru};
  if(!en||!ru) err.push('пусто '+id+(en?' (ru)':' (en)'));
  else if(ph(en)!==ph(ru)) err.push('плейсхолдеры '+id+'  en['+ph(en)+'] ru['+ph(ru)+']');
}

// 2. ключи в коде
const src=['core.js','ui.js'].map(f=>{ try{ return fs.readFileSync(path.join(W,f),'utf8') }catch(e){ return '' } }).join('\n');
if(!src) warn.push('core.js/ui.js рядом со страницей не найдены — проверка ключей пропущена');
else{
  const lit=(re,tb)=>{ let x; while((x=re.exec(src))){ if(!byId[tb+'.'+x[1]]) err.push('в коде '+tb+' «'+x[1]+'», строки в таблице нет') } };
  lit(/\bT\('([A-Za-z0-9_.]+)'(?!\s*\+)/g,'UI'); lit(/\bsay\('([A-Za-z0-9_.]+)'(?!\s*\+)/g,'MSG');
  // неиспользованные: ключ как литерал в кавычках, либо как префикс динамического ключа ('lobe'+n)
  const html=fs.readFileSync(page,'utf8').replace(/<script type="application\/json" id="lb-texts"[\s\S]*?<\/script>/,'');
  const all=src+'\n'+html;
  const quoted=new Set(); let x; const q=/['"`]([A-Za-z0-9_.]+)['"`]/g; while((x=q.exec(all))) quoted.add(x[1]);
  const prefixes=[...all.matchAll(/['"]([A-Za-z0-9_.]+)['"]\s*\+/g)].map(a=>a[1]);
  const unused={}; let dyn=0;
  for(const [t,k] of rows){
    if(t==='UI'||t==='MSG'){ const base=k.split('.')[0];
      if(quoted.has(k)||quoted.has(base)||prefixes.some(p=>k.startsWith(p))) continue;
      (unused[t]=unused[t]||[]).push(k) } else dyn++ }
  for(const t in unused) warn.push('не использовано в коде, '+t+' ('+unused[t].length+'): '+unused[t].slice(0,25).join(' ')+(unused[t].length>25?' …':''));
  if(dyn) warn.push('LOG/VOICE/RES/GUIDE: '+dyn+' строк с динамическими ключами — по литералу не проверяются');
}

// 3. круговой тест: страница → CSV → texts-pull.js → те же строки
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'lbtx-'));
try{
  const esc=s=>'"'+String(s).replace(/"/g,'""')+'"';
  const csv=['table,key,en,ru,where,status,note',...rows.map(r=>[r[0],r[1],esc(r[2]),esc(r[3]),'','live',''].join(','))].join('\n');
  fs.writeFileSync(path.join(tmp,'sheet.csv'),csv,'utf8');
  fs.writeFileSync(path.join(tmp,'page.html'),fs.readFileSync(page,'utf8'),'utf8');
  cp.execFileSync('node',[path.join(__dirname,'texts-pull.js'),path.join(tmp,'sheet.csv'),path.join(tmp,'page.html')],{stdio:'pipe'});
  const m2=fs.readFileSync(path.join(tmp,'page.html'),'utf8').match(/id="lb-texts"[^>]*>([\s\S]*?)<\/script>/);
  const back=JSON.parse(m2[1]); let bad=0;
  if(back.length!==rows.length) err.push('круговой тест: строк '+rows.length+' → '+back.length);
  rows.forEach((r,i)=>{ const b=back[i]; if(!b||b[0]!==r[0]||b[1]!==r[1]||b[2]!==r[2]||b[3]!==r[3]){ if(bad++<5) err.push('круговой тест: расходится '+r[0]+'.'+r[1]) } });
}catch(e){ err.push('круговой тест упал: '+String(e.stderr||e.message).split('\n')[0]) }
fs.rmSync(tmp,{recursive:true,force:true});

// 4. свежий кумулятивный CSV из texts/: последняя live-строка ключа должна совпасть со сборкой
try{
  const dir=path.join(LB,'texts');
  const ver=f=>(f.match(/v(\d+)\.(\d+)/)||[0,0,0]).slice(1).map(Number);
  const files=fs.readdirSync(dir).filter(f=>/\.csv$/.test(f)).sort((a,b)=>{ const A=ver(a),B=ver(b); return A[0]-B[0]||A[1]-B[1] });
  if(files.length){
    const last=files[files.length-1], txt=fs.readFileSync(path.join(dir,last),'utf8').replace(/^﻿/,'');
    const out=[]; let row=[],cell='',qq=false;
    for(let i=0;i<txt.length;i++){ const c=txt[i];
      if(qq){ if(c==='"'){ if(txt[i+1]==='"'){cell+='"';i++} else qq=false } else cell+=c; continue }
      if(c==='"') qq=true; else if(c===','){row.push(cell);cell=''}
      else if(c==='\n'||c==='\r'){ if(c==='\r'&&txt[i+1]==='\n') i++; row.push(cell); out.push(row); row=[]; cell='' } else cell+=c }
    if(cell!==''||row.length){ row.push(cell); out.push(row) }
    const fin={}; for(const r of out){ if(r.length<4||!r[0]||(r[5]&&r[5].trim()!=='live')) continue; fin[r[0].trim()+'.'+r[1].trim()]=r }
    const diff=Object.keys(fin).filter(id=>byId[id]&&(byId[id].en!==fin[id][2]||byId[id].ru!==fin[id][3]));
    const gone=Object.keys(fin).filter(id=>!byId[id]);
    if(diff.length) warn.push(last+': '+diff.length+' строк отличаются от сборки (лист получит старый текст): '+diff.slice(0,8).join(' '));
    if(gone.length) warn.push(last+': '+gone.length+' ключей нет в сборке: '+gone.slice(0,8).join(' '));
  }
}catch(e){ warn.push('сверка с texts/ не удалась: '+e.message) }

console.log('texts-check: '+rows.length+' строк · ошибок '+err.length+' · предупреждений '+warn.length);
err.slice(0,30).forEach(e=>console.log('  ERR  '+e)); warn.forEach(w=>console.log('  warn '+w));
process.exit(err.length&&!process.argv.includes('--warn')?1:0);
