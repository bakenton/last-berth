// Сборка прототипов-слияний: src/<id>.html + kit.css + kit.js + шрифты игры → design/fusions/<id>.html (один файл, работает двойным кликом).
// node design/fusions/build.js [id…]   В src/<id>.html: <style>/*KIT*/</style> и <script>/*KIT*/</script> в <head> — сюда встанет набор.
const fs=require('fs'),path=require('path');
const D=__dirname,S=path.join(D,'src');
const rd=f=>fs.readFileSync(f,{encoding:'utf-8'});
const fonts=rd(path.join(D,'..','..','work','web','fonts.css')),css=rd(path.join(S,'kit.css')),js=rd(path.join(S,'kit.js'));
const ids=process.argv.slice(2).length?process.argv.slice(2):fs.readdirSync(S).filter(f=>f.endsWith('.html')).map(f=>f.slice(0,-5));
for(const id of ids){ let h=rd(path.join(S,id+'.html'));
  if(!h.includes('<style>/*KIT*/</style>')||!h.includes('<script>/*KIT*/</script>')) throw new Error(id+': нет меток /*KIT*/');
  h=h.replace('<style>/*KIT*/</style>',()=>'<style>'+fonts+css+'</style>').replace('<script>/*KIT*/</script>',()=>'<script>'+js+'</script>');
  fs.writeFileSync(path.join(D,id+'.html'),h,{encoding:'utf-8'}); console.log(id,Math.round(h.length/1024)+' КБ') }
