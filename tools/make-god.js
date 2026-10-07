/* Собирает work/LAST-BERTH-god.html = work/page.html + tools/god.js. Запуск из корня: node tools/make-god.js
   Исходная страница и play/ не меняются. Нужна свежая сборка (bash tools/regress.sh smoke или py -3 ../tools/build.py в work/). */
const fs=require('fs'),path=require('path');
const R=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(R,'work','page.html'),'utf8');
const god=fs.readFileSync(path.join(__dirname,'god.js'),'utf8');
const out=path.join(R,'work','LAST-BERTH-god.html');
fs.writeFileSync(out,page+'\n<script>\n'+god+'</script>\n');
console.log('god build →',out,'('+Math.round((page.length+god.length)/1024)+' KB)');
