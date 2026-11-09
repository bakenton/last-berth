// diag-map — страница-диагностика 3D-карты для живого устройства (v5.07–v5.08, 09.11.2026: «на планшете в Chrome лагает», «при поворотах лагает»).
// Берёт собранную work/page.html, вшивает флаги в отрисовку карты и панель сверху: fps, размер холста, кнопки,
// которые по одной выключают части кадра. Игру не меняет; сохранение в диагностике отключено (не затрёт партию).
// Запуск: node tools/diag-map.js [выход]   (по умолчанию play/DIAG-map.html, вне git)
const fs=require('fs'), path=require('path');
const ROOT=path.resolve(__dirname,'..'), OUT=process.argv[2]||path.join(ROOT,'play','DIAG-map.html');
let s=fs.readFileSync(path.join(ROOT,'work','page.html'),'utf8');
const BOT=fs.readFileSync(path.join(__dirname,'pw11.js'),'utf8').split('const BOT=`')[1].split('`;')[0];
const R=[
  ["var M3D={W:1,H:1,VP:null,dpr:1,fk:'',fl:null,ob:null,ok:'',HX:null,HXR:0,LAY:null,NEB:null,last:0,dirty:true};",
   "var M3D={W:1,H:1,VP:null,dpr:1,fk:'',fl:null,ob:null,ok:'',HX:null,HXR:0,LAY:null,NEB:null,last:0,dirty:true}; window.LBM3D=M3D; window.LBF={};"],
  ["dpr=Math.min(window.devicePixelRatio||1,2)*appZoom();","dpr=Math.min(window.devicePixelRatio||1,2)*appZoom()*(LBF.half?0.5:1);"],
  ["function m3glow(x,col,b){","function m3glow(x,col,b){ if(LBF.noglow) return;"],
  ["function m3sphere(x,cx,cy,cz,rad,col,spin,alpha,bl,body){","function m3sphere(x,cx,cy,cz,rad,col,spin,alpha,bl,body){ if(LBF.nosph) return null;"],
  ["function m3sky(x){","function m3sky(x){ if(LBF.nosky) return;"],
  ["for(hi=0;hi<hx.length;hi++){ var h=hx[hi]; if(h[2]>=FR) continue;","for(hi=0;hi<hx.length;hi++){ var h=hx[hi]; if(LBF.nohex||h[2]>=FR) continue;"],
  ["  m3floor(); x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation='copy'; x.drawImage(M3D.fl,0,0);",
   "  if(!LBF.nofloor) m3floor(); x.setTransform(1,0,0,1,0,0); x.globalCompositeOperation='copy'; if(LBF.nofloor) x.clearRect(0,0,99999,99999); else x.drawImage(M3D.fl,0,0);"],
  ["  m3floorObj(vis); x.setTransform(1,0,0,1,0,0); x.drawImage(M3D.ob,0,0);","  if(!LBF.noob) m3floorObj(vis); x.setTransform(1,0,0,1,0,0); LBF.noob||x.drawImage(M3D.ob,0,0);"],
  ["function m3frame(ts){ if(!G) return; if(M3D.moved){ M3D.moved=false; drawMap(); tutPlace() } if(M3D.dirty||ts-M3D.last>50){ M3D.last=ts; M3D.dirty=false; try{ draw3d(ts) }catch(e){} } }",
   "function m3frame(ts){ if(!G||LBF.nodraw) return; if(LBF.spin){ camTurn(3,0); M3D.moved=true } if(M3D.moved){ M3D.moved=false; if(!LBF.nosvg){ drawMap(); tutPlace() } else { m3prep(); M3D.dirty=true } } if(M3D.dirty||ts-M3D.last>50){ M3D.last=ts; M3D.dirty=false; var t0=performance.now(); try{ draw3d(ts) }catch(e){} window.LBDT=(window.LBDT||0)*0.9+(performance.now()-t0)*0.1 } }"],
  ["function autosave(){ try{","function autosave(){ return; try{"]];
for(const [a,b] of R){ if(s.split(a).length!==2) throw new Error('diag-map: в сборке не найдено (или не одно): '+a.slice(0,70)); s=s.replace(a,b) }
const PANEL=`<div id="lbdiag" style="position:fixed;left:8px;top:8px;z-index:2147483647;background:rgba(0,0,0,.88);color:#fff;font:14px/1.35 monospace;padding:8px 10px;border:1px solid #E040FB;max-width:460px">
<div id="lbdi">…</div>
<div id="lbdb" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"></div></div>
<script>${BOT}
(function(){
  var F=window.LBF, B=[['spin','КРУТИТЬ КАМЕРУ'],['noglow','без свечения'],['nosph','без шаров'],['half','холст 50%'],['nofloor','без космоса и пола'],['nosky','без космоса'],['nohex','без гексов'],['noob','без линий на полу'],['nosvg','SVG не следует'],['nodraw','карта не рисуется'],['nofx','без эффектов Ночи']];
  var box=document.getElementById('lbdb');
  function css(b,on){ b.style.cssText='font:14px monospace;padding:8px 10px;border:1px solid #888;background:'+(on?'#E040FB':'#222')+';color:#fff' }
  function redo(){ var M=window.LBM3D; if(M){ M.fk=''; M.ok=''; M.dirty=true; M.W=-1 } var m=document.getElementById('map'), n=document.getElementById('nightfx'); if(m) m.style.visibility=F.nosvg?'hidden':''; if(n) n.style.visibility=F.nofx?'hidden':''; try{ LNdraw() }catch(e){} }
  B.forEach(function(k){ var b=document.createElement('button'); b.type='button'; b.textContent=k[1]; css(b,false); b.onclick=function(e){ e.stopPropagation(); F[k[0]]=!F[k[0]]; css(b,F[k[0]]); redo() }; box.appendChild(b) });
  var f=document.createElement('button'); f.type='button'; f.textContent='заполнить карту (бот, 1800 лет)'; css(f,false); f.onclick=function(e){ e.stopPropagation(); try{ LNtut.off(); botRun(1800); LNU.shiftStop=false; redo() }catch(err){ alert(err) } }; box.appendChild(f);
  var h=document.createElement('button'); h.type='button'; h.textContent='свернуть'; css(h,false); h.onclick=function(e){ e.stopPropagation(); var on=box.style.display!=='none'; box.style.display=on?'none':'flex' }; box.appendChild(h);
  var n=0, t0=performance.now(), fps=0, worst=0, last=t0;
  function tick(t){ n++; worst=Math.max(worst,t-last); last=t; if(t-t0>=1000){ fps=n*1000/(t-t0); n=0; t0=t; show(); worst=0 } requestAnimationFrame(tick) }
  function show(){ var M=window.LBM3D||{}, c=document.getElementById('map3d'), G=window.LN, z=(document.getElementById('app')||{dataset:{}}).dataset.z||1;
    document.getElementById('lbdi').innerHTML='<b style="font-size:20px;color:'+(fps<30?'#ff5a4a':'#5f5')+'">'+fps.toFixed(0)+' fps</b> · худший кадр '+Math.round(worst)+' мс · JS карты '+(window.LBDT||0).toFixed(1)+' мс<br>'+
      'холст '+(c?c.width+'×'+c.height:'—')+' · dpr '+(window.devicePixelRatio||1)+' · стол ×'+(+z).toFixed(2)+'<br>окно '+innerWidth+'×'+innerHeight+' · миров '+(G?Object.keys(G.colonies).length:0)+' · судов '+(G?G.ships.length:0)+' · сохранение выкл.' }
  requestAnimationFrame(tick);
})();</script>`;
if(s.split('</body>').length!==2) throw new Error('diag-map: нет </body>');
s=s.replace('</body>',PANEL+'</body>');
fs.writeFileSync(OUT,s); console.log('diag-map:',OUT,(s.length/1024/1024).toFixed(2)+' МБ');
