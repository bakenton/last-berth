/* LAST BERTH — механическая часть закрытия итерации (CLAUDE.md, шаги 6–8). Notion сюда не входит — это руками, по чек-листу в конце вывода.
   node tools/close-iter.js check           что из ритуала не сделано (по умолчанию)
   node tools/close-iter.js bump 4.25       v:'..' в work/core.js
   node tools/close-iter.js ship            work/page.html → play/LAST-BERTH-vX.YY.html (не затирает отличающийся файл без --force)
   Коммит и запись в Notion не делает. Файлы читает/пишет побайтно (CRLF не трогает). */
const fs=require('fs'), path=require('path'), cp=require('child_process');
const LB=path.resolve(__dirname,'..'), P=(...a)=>path.join(LB,...a);
const [cmd='check',arg]=process.argv.slice(2).filter(a=>!a.startsWith('--')), FORCE=process.argv.includes('--force');
const core=fs.readFileSync(P('work','core.js'),'utf8');
const vm=core.match(/\bv:'(\d+\.\d+)'/); if(!vm){ console.log('FAIL: v:\'x.yy\' не найден в work/core.js'); process.exit(1) }
const V=vm[1], playFile=P('play','LAST-BERTH-v'+V+'.html'), page=P('work','page.html');

if(cmd==='bump'){
  if(!/^\d+\.\d+$/.test(arg||'')){ console.log('usage: bump 4.25'); process.exit(2) }
  fs.writeFileSync(P('work','core.js'),core.replace(/\bv:'\d+\.\d+'/,"v:'"+arg+"'"));
  console.log('v '+V+' → '+arg+' (work/core.js). Дальше: сборка, CHANGELOG, HANDOFF.'); process.exit(0)
}
if(cmd==='ship'){
  if(!fs.existsSync(page)){ console.log('FAIL: нет work/page.html — сначала сборка'); process.exit(1) }
  if(fs.existsSync(playFile)&&!fs.readFileSync(playFile).equals(fs.readFileSync(page))&&!FORCE){ console.log('FAIL: '+path.basename(playFile)+' уже есть и отличается — это выпущенная версия; бампни версию или --force'); process.exit(1) }
  fs.copyFileSync(page,playFile); console.log('ok: '+path.relative(LB,playFile)); process.exit(0)
}

// check
const res=[], ok=(c,m)=>res.push([c,m]);
const mt=f=>fs.existsSync(f)?fs.statSync(f).mtimeMs:0;
ok(mt(page)>=Math.max(mt(P('work','core.js')),mt(P('work','ui.js'))),'work/page.html собрана после последней правки core/ui (иначе: cd work && py -3 ../tools/build.py)');
ok(fs.existsSync(playFile)&&fs.readFileSync(playFile).equals(fs.readFileSync(page)),'play/LAST-BERTH-v'+V+'.html есть и совпадает с work/page.html (ship)');
const cl=fs.readFileSync(P('CHANGELOG.md'),'utf8');
ok(new RegExp('^## v'+V.replace('.','\\.')+'\\b','m').test(cl),'CHANGELOG.md: есть раздел «## v'+V+' …»');
const ho=fs.readFileSync(P('HANDOFF.md'),'utf8'), hl=ho.split(/\r?\n/).filter(l=>l.trim()).length;
ok(new RegExp('\\*\\*Версия:\\*\\*\\s*v'+V.replace('.','\\.')+'\\b').test(ho),'HANDOFF.md: строка «Версия» = v'+V);
ok(hl<=20,'HANDOFF.md ≤20 строк (сейчас '+hl+')');
const txtDirty=['new-texts.tsv','changed-texts.tsv'].some(f=>{ try{ return fs.readFileSync(P('work',f),'utf8').trim().length>0 }catch(e){ return false } });
if(txtDirty) ok(fs.readdirSync(P('texts')).some(f=>f.startsWith('texts-v'+V+'-')),'есть новые/изменённые тексты → texts/texts-v'+V+'-append.csv для Никиты');
const git=cp.spawnSync('git',['status','--short'],{cwd:LB,encoding:'utf8'}).stdout.trim();
ok(!git,'git: всё закоммичено'+(git?' — не закоммичено:\n      '+git.split('\n').slice(0,12).join('\n      '):''));
console.log('close-iter v'+V+':'); res.forEach(([c,m])=>console.log('  '+(c?'✓':'✗')+' '+m));
console.log('\nРуками (нужен твой ок, пишет Claude в Notion):\n  ☐ Журнал решений: запись с «Кто решил»\n  ☐ «История версий»: новая запись сверху\n  ☐ «Состояние для Claude» обновлено\n  ☐ карточки F-NN: статусы\n  ☐ regress full --quiet зелёный (или красное объяснено)\n  ☐ reviewer: дифф + страница в браузере');
process.exit(res.every(r=>r[0])?0:1);
