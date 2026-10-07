/* LAST BERTH — CSV для Никиты из work/new-texts.tsv и work/changed-texts.tsv.
   node tools/texts-csv.js <where> [version] [--since=<коммит>]   только строки, которых нет в tsv того коммита (по умолчанию HEAD: правки итерации до коммита); version по умолчанию из work/core.js; пишет texts/texts-v<version>-append.csv
   Без заголовка (CLAUDE.md): table,key,en,ru,where,status=live,note=new|changed. Ключ в обоих tsv — берётся последний. */
const fs=require('fs'), path=require('path');
const cp=require('child_process');
const LB=path.resolve(__dirname,'..'), A=process.argv.slice(2), where=A[0], SINCE=((A.find(a=>a.startsWith('--since='))||'').slice(8))||'HEAD';
if(!where){ console.log('usage: node tools/texts-csv.js "<where, напр. v4.25 ark>" [version]'); process.exit(2) }
const ver=(A[1]&&!A[1].startsWith('--')?A[1]:'')||(fs.readFileSync(path.join(LB,'work','core.js'),'utf8').match(/\bv:'(\d+\.\d+)'/)||[])[1];
const base=f=>{ const r=cp.spawnSync('git',['show',SINCE+':work/'+f],{cwd:LB,encoding:'utf8'}); return new Set(r.status===0?r.stdout.split(/\r?\n/):[]) };
const rd=(f,note)=>{ const old=base(f); try{ return fs.readFileSync(path.join(LB,'work',f),'utf8').split(/\r?\n/).filter(l=>l.trim()&&!old.has(l)).map(l=>{ const c=l.split('\t'); if(c.length<4){ console.log('FAIL: '+f+': ждал table⇥key⇥en⇥ru, строка: '+l.slice(0,60)); process.exit(1) } return [c[0],c[1],c[2],c.slice(3).join('\t'),note] }) }catch(e){ return [] } };
const rows=[...rd('new-texts.tsv','new'),...rd('changed-texts.tsv','changed')], last={}; rows.forEach(r=>last[r[0]+'.'+r[1]]=r);
const q=s=>/[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
const out=Object.values(last).map(r=>[r[0],r[1],q(r[2]),q(r[3]),q(where),'live',r[4]].join(',')).join('\n')+'\n';
const f=path.join(LB,'texts','texts-v'+ver+'-append.csv'); fs.writeFileSync(f,out,'utf8');
console.log('ok: '+path.relative(LB,f)+' · '+Object.keys(last).length+' строк');
