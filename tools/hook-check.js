/* PostToolUse-хук Claude Code (.claude/settings.json): после Edit/Write в work/core.js или work/ui.js — node --check.
   Читает JSON события со stdin. Синтаксическая ошибка → exit 2 и текст в stderr (Claude увидит сразу, а не на smoke).
   Линтер здесь не гоняем: посреди серии правок no-undef шумит; он в regress.sh. */
const cp=require('child_process');
let raw=''; process.stdin.on('data',d=>raw+=d).on('end',()=>{
  let f=''; try{ f=((JSON.parse(raw).tool_input||{}).file_path||'').split('\\').join('/') }catch(e){ process.exit(0) }
  if(!/\/work\/(core|ui)\.js$/.test(f)) process.exit(0);
  const r=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});
  if(r.status!==0){ process.stderr.write('СИНТАКСИС '+f.split('/').slice(-1)[0]+': '+(r.stderr||'').split('\n').slice(0,6).join('\n')); process.exit(2) }
});
