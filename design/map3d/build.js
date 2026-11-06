/* map3d/build.js — one file per draft for the phone: data, scripts and styles inlined (no fonts: the system monospace stands in).
   node design/map3d/build.js → design/map3d/single/*.html */
const fs=require('fs'), path=require('path'), D=__dirname, O=path.join(D,'single');
fs.mkdirSync(O,{recursive:true});
['a-plane','b-svg','c-pins','d-holo','e-hybrid','e-hybrid-v1','e-hybrid-v2'].forEach(n=>{
  let s=fs.readFileSync(path.join(D,n+'.html'),'utf8');
  s=s.replace(/<link rel="stylesheet" href="\.\.\/\.\.\/work\/web\/fonts\.css">/,'');
  s=s.replace(/<link rel="stylesheet" href="common\.css">/,()=>'<style>'+fs.readFileSync(path.join(D,'common.css'),'utf8')+'</style>');
  s=s.replace(/<script src="([\w.-]+\.js)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(path.join(D,f),'utf8').replace(/<\/script/g,'<\\/script')+'</script>');
  s=s.replace(/href="index\.html"/g,'href="#"');
  fs.writeFileSync(path.join(O,n+'.html'),s); console.log(n, (s.length/1024).toFixed(1)+' KB') });
