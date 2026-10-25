/* LAST BERTH — статический анализ core.js + menu.js + ui.js (ESLint API, только no-undef / no-unused-vars и пр. «ловцы хвостов»).
   node tools/lint.js [workdir] [--all]     по умолчанию work/; без --all печатает только ошибки (no-undef, no-redeclare и т.п.)
   core.js, menu.js (с v4.40: главное меню и терминал) и ui.js грузятся в странице тремя <script> в одном глобальном пространстве, поэтому линтятся склеенными:
   функция ядра, вызванная в ui.js после удаления, даст no-undef; поле/функция, оставшаяся без вызовов, — no-unused-vars (предупреждение).
   Не ловит обращения к полям объектов (G.x) — для удалённой механики грепни поля, как раньше. */
const fs=require('fs'), path=require('path');
const {ESLint}=require('eslint');
const LB=path.resolve(__dirname,'..');
const args=process.argv.slice(2), ALL=args.includes('--all');
const W=path.resolve(args.find(a=>!a.startsWith('--'))||path.join(LB,'work'));
const rd=f=>fs.readFileSync(path.join(W,f),'utf8');
const core=rd('core.js'), ui=rd('ui.js'), menu=fs.existsSync(path.join(W,'menu.js'))?rd('menu.js'):'';
// v4.40: the debug panel (web/debug.js) is the page's last script and calls the core directly — linted with them
const dbg=fs.existsSync(path.join(W,'web','debug.js'))?rd('web/debug.js'):'';
const coreLines=core.split('\n').length, menuLines=menu?menu.split('\n').length:0, uiLines=ui.split('\n').length;
const text=core+'\n'+(menu?menu+'\n':'')+ui+(dbg?'\n'+dbg:'');
const BROWSER=['window','document','navigator','location','localStorage','sessionStorage','console','setTimeout','clearTimeout','setInterval','clearInterval',
 'requestAnimationFrame','cancelAnimationFrame','performance','Audio','AudioContext','webkitAudioContext','Image','Blob','URL','FileReader','XMLHttpRequest','fetch','Event','CustomEvent',
 'MutationObserver','ResizeObserver','IntersectionObserver','getComputedStyle','matchMedia','alert','confirm','prompt','history','screen','innerWidth','innerHeight',
 'devicePixelRatio','HTMLElement','Node','DOMParser','TextEncoder','TextDecoder','atob','btoa','crypto','Worker','OffscreenCanvas','Path2D','navigator','module','exports','require','Float32Array','HTMLCanvasElement'];
(async()=>{
  const eslint=new ESLint({cwd:W,overrideConfigFile:true,overrideConfig:[{
    files:['**/*.js'],
    languageOptions:{ecmaVersion:2022,sourceType:'script',globals:Object.fromEntries(BROWSER.map(g=>[g,'readonly']))},
    linterOptions:{reportUnusedDisableDirectives:false},
    rules:{'no-undef':'error','no-dupe-keys':'error','no-dupe-else-if':'error','no-unreachable':'error','no-self-assign':'error','no-const-assign':'error',
      'no-unused-vars':['warn',{vars:'all',args:'none',caughtErrors:'none'}],'no-use-before-define':'off'}}]});
  const [res]=await eslint.lintText(text,{filePath:path.join(W,'bundle.js')});
  const uiAt=coreLines+1+(menu?menuLines:0);   // the line where ui.js starts in the glued text
  const loc=l=>l<=coreLines?'core.js:'+l:(menu&&l<=coreLines+menuLines?'menu.js:'+(l-coreLines):(l<uiAt+uiLines?'ui.js:'+(l-uiAt+1):'debug.js:'+(l-uiAt-uiLines+1)));
  const msgs=res.messages.map(m=>({e:m.severity===2,w:loc(m.line)+' '+m.ruleId+' '+m.message.replace(/ It's defined.*/,'')}));
  if(res.messages.some(m=>m.fatal)){ console.log('lint: PARSE ERROR\n  '+msgs.filter(x=>x.e).map(x=>x.w).join('\n  ')); process.exit(1) }
  const errs=msgs.filter(x=>x.e), warns=msgs.filter(x=>!x.e);
  console.log('lint: ошибок '+errs.length+' · неиспользуемых '+warns.length+(ALL?'':' (--all)'));
  errs.slice(0,40).forEach(x=>console.log('  ERR  '+x.w));
  if(ALL) warns.forEach(x=>console.log('  warn '+x.w));
  process.exit(errs.length?1:0);
})().catch(e=>{ console.log('lint: упал — '+e.message); process.exit(1) });
