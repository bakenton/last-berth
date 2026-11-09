// One file out of index.html + cartoon.js + the fonts of the game + Alexandra's portraits + the sound:
//   node design/cartoon/build.js            ->  design/cartoon/LAST-BERTH-cartoon.html (opens by double click)
// The sound is synthesised by the page itself (slow, ~20 s), so it is rendered once and embedded:
//   node design/cartoon/build.js && node design/cartoon/render.js --audio && node design/cartoon/build.js
// Then the film: node design/cartoon/render.js  ->  LAST-BERTH-cartoon.mp4
const fs=require('fs'),path=require('path');
const here=__dirname,root=path.join(here,'..','..');
const rd=f=>fs.readFileSync(f,'utf8');
let html=rd(path.join(here,'index.html'));
const fonts=rd(path.join(root,'work','web','fonts.css'));
const faces=['full','talk','smile','resolve','sad','grief'];
const assets={};
for(const n of faces)assets[n]='data:image/webp;base64,'+fs.readFileSync(path.join(here,'..','alexandra',n+'.webp')).toString('base64');
const code=rd(path.join(here,'cartoon.js'));
const put=(tag,body)=>{const re=new RegExp('<!--'+tag+'-->[\\s\\S]*?<!--/'+tag+'-->');if(!re.test(html))throw new Error('no slot '+tag);html=html.replace(re,()=>body)};
put('FONTS','<style>'+fonts+'</style>');
const mp3=path.join(here,'cartoon.mp3');
const audio=fs.existsSync(mp3)?'window.CT_AUDIO="data:audio/mpeg;base64,'+fs.readFileSync(mp3).toString('base64')+'";':'';
put('ASSETS','<script>window.CT_ASSETS='+JSON.stringify(assets)+';'+audio+'</script>');
put('CODE','<script>'+code.replace(/<\/script/g,'<\\/script')+'</script>');
const out=path.join(here,'LAST-BERTH-cartoon.html');
fs.writeFileSync(out,html,'utf8');
console.log('built',path.relative(root,out),(fs.statSync(out).size/1024).toFixed(0)+' KB',audio?'with sound':'SILENT (no cartoon.mp3)');
