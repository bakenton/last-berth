/* LAST BERTH — bake the Google Sheet into the build.
   node texts-pull.js <sheet.csv|sheet.tsv> <page.html> [--url=<published csv>|--url=]
   1) Drive: download_file_content(fileId, exportMimeType:'text/csv') -> result JSON on disk -> base64 -> sheet.csv
   2) this script: validates and replaces <script id="lb-texts"> in page.html
   Rules: only status=live (or empty) rows; a cell whose {placeholders} differ from the other language
   is refused and the built-in value is kept; empty cells keep the built-in value. */
const fs=require('fs');
const [,,csvPath,pagePath,...opt]=process.argv;
function parseCSV(txt){ const out=[]; let row=[],cell='',q=false; txt=txt.replace(/^﻿/,'');
  for(let i=0;i<txt.length;i++){ const c=txt[i];
    if(q){ if(c==='"'){ if(txt[i+1]==='"'){cell+='"';i++} else q=false } else cell+=c; continue }
    if(c==='"') q=true; else if(c===','){row.push(cell);cell=''}
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&txt[i+1]==='\n') i++; row.push(cell); out.push(row); row=[]; cell='' }
    else cell+=c; }
  if(cell!==''||row.length){row.push(cell);out.push(row)} return out }
const ph=s=>(String(s||'').match(/\{\w+\}/g)||[]).sort().join();
const page=fs.readFileSync(pagePath,'utf8');
const re=/<script type="application\/json" id="lb-texts" data-url="([^"]*)">([\s\S]*?)<\/script>/;
const m=page.match(re); if(!m) throw new Error('no lb-texts block');
const baked=JSON.parse(m[2]); const base={}; baked.forEach(r=>base[r[0]+'.'+r[1]]=r);
const RAW=fs.readFileSync(csvPath,'utf8');
const a=(RAW.split(/\r?\n/,1)[0]||'').includes('\t') ? RAW.replace(/^\ufeff/,'').split(/\r?\n/).filter(l=>l.length).map(l=>l.split('\t')) : parseCSV(RAW); const h=a[0].map(x=>x.trim().toLowerCase());
const ix={}; ['table','key','en','ru','status'].forEach(c=>ix[c]=h.indexOf(c));
if(ix.table<0||ix.key<0||ix.en<0||ix.ru<0) throw new Error('header must have table,key,en,ru: '+h);
const TABLES=new Set(['UI','LOG','MSG','RES','GUIDE','VOICE']);
const out=[], seen=new Set(), rep={changed:[],added:[],refused:[],dup:[],badTable:[],drafts:0,dropped:[]};
for(const r of a.slice(1)){
  const t=(r[ix.table]||'').trim(), k=(r[ix.key]||'').trim(), st=ix.status>=0?(r[ix.status]||'').trim():'live';
  if(!t&&!k) continue;
  if(st&&st!=='live'){ rep.drafts++; continue }
  if(!TABLES.has(t)){ rep.badTable.push(t+'.'+k); continue }
  // v4.4: the LAST live row for a key wins — a fix appended at the bottom of the sheet overrides the old row,
  // so Nikita never has to hunt for it. Earlier duplicates are reported and dropped.
  const id=t+'.'+k; if(seen.has(id)){ rep.dup.push(id); const j=out.findIndex(x=>x[0]===t&&x[1]===k); if(j>=0) out.splice(j,1) } seen.add(id);
  const b=base[id]; let en=r[ix.en]||'', ru=r[ix.ru]||'';
  if(b){ if(!en) en=b[2]; if(!ru) ru=b[3] }
  if(ph(en)!==ph(ru)){
    if(b&&ph(b[2])===ph(b[3])){ rep.refused.push(id+'  en['+ph(en)+'] ru['+ph(ru)+'] -> built-in kept'); en=b[2]; ru=b[3] }
    else rep.refused.push(id+'  en['+ph(en)+'] ru['+ph(ru)+'] (new row, kept as is)');
  }
  if(!b) rep.added.push(id); else if(b[2]!==en||b[3]!==ru) rep.changed.push(id);
  out.push([t,k,en,ru]);
}
// v4.0: a row that is baked in but not in the sheet yet (tools/texts-pending.tsv) is KEPT, not dropped —
// dropping it silently erased the prologue and the personal files on every pull before Nikita pasted them in.
for(const id in base) if(!seen.has(id)){ rep.dropped.push(id); out.push(base[id].slice(0,4)) }
let url=m[1]; for(const o of opt){ if(o.startsWith('--url=')) url=o.slice(6) }
const js=JSON.stringify(out).replace(/<\//g,'<\\/');
fs.writeFileSync(pagePath,page.replace(re,()=> '<script type="application/json" id="lb-texts" data-url="'+url.replace(/"/g,'&quot;')+'">'+js+'</script>'));
console.log('baked',out.length,'rows · url',url?'set':'none');
for(const k of ['changed','added','refused','dup','badTable','dropped']) if(rep[k].length) console.log((k==='dropped'?'kept, not in sheet yet':k)+' ('+rep[k].length+'):\n  '+rep[k].join('\n  '));
console.log('skipped non-live rows:',rep.drafts);
