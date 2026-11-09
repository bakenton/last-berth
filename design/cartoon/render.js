// The built page -> frames and sound -> mp4. Needs Playwright (Chromium) and ffmpeg.
//   node design/cartoon/build.js && node design/cartoon/render.js            -> LAST-BERTH-cartoon.mp4
//   node design/cartoon/render.js --shots 5,20,35 [--dir <folder>]           -> stills only (seconds)
//   node design/cartoon/render.js --audio                                    -> cartoon.mp3 (build.js embeds it)
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const here=__dirname,page0='file://'+path.join(here,'LAST-BERTH-cartoon.html');
const arg=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1]};
(async()=>{
  const browser=await chromium.launch(process.env.LB_CHROMIUM?{executablePath:process.env.LB_CHROMIUM}:{});
  const page=await browser.newPage({viewport:{width:1920,height:900}});
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));page.on('console',m=>{if(m.type()=='error')errs.push(m.text())});
  await page.addInitScript(()=>{window.CT_HEADLESS=true});
  await page.goto(page0);await page.evaluate(()=>CT.ready);
  const info=await page.evaluate(()=>({DUR:CT.DUR,FPS:CT.FPS,W:CT.W,H:CT.H,scenes:CT.SCENES.map(s=>s.id+'@'+s.a)}));
  console.log(info.W+'x'+info.H,info.DUR+' s',info.scenes.join(' '));
  const shots=arg('--shots');
  if(shots){const dir=arg('--dir')||path.join(here,'shots');fs.mkdirSync(dir,{recursive:true});
    for(const s of shots.split(',')){const b=await page.evaluate(t=>CT.frame(t,0.9),+s);fs.writeFileSync(path.join(dir,'t'+String(s).padStart(5,'0')+'.jpg'),Buffer.from(b,'base64'))}
    console.log('shots',shots,'->',dir);if(errs.length)console.log('PAGE ERRORS',errs);await browser.close();return}
  if(process.argv.includes('--audio')){const w=path.join(here,'.audio.wav'),m=path.join(here,'cartoon.mp3');
    fs.writeFileSync(w,Buffer.from(await page.evaluate(()=>CT.wav()),'base64'));
    await new Promise(r=>spawn('ffmpeg',['-y','-loglevel','error','-i',w,'-c:a','libmp3lame','-b:a','128k',m],{stdio:'inherit'}).on('close',r));
    fs.unlinkSync(w);console.log('audio',m,(fs.statSync(m).size/1024).toFixed(0)+' KB');await browser.close();return}
  const wav=path.join(here,'.audio.wav'),out=arg('--out')||path.join(here,'LAST-BERTH-cartoon.mp4');
  fs.writeFileSync(wav,Buffer.from(await page.evaluate(()=>CT.wav()),'base64'));
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(info.FPS),'-c:v','mjpeg','-i','-','-i',wav,
    '-c:v','libx264','-preset','slow','-crf',arg('--crf')||'21','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  const n=Math.floor(info.DUR*info.FPS),t0=Date.now();
  for(let i=0;i<n;i++){const b=await page.evaluate(t=>CT.frame(t,0.93),i/info.FPS);
    if(!ff.stdin.write(Buffer.from(b,'base64')))await new Promise(r=>ff.stdin.once('drain',r));
    if(i%300==0)console.log('frame',i,'/',n,((Date.now()-t0)/1000).toFixed(0)+' s')}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));fs.unlinkSync(wav);
  console.log('done',out,(fs.statSync(out).size/1048576).toFixed(1)+' MB');if(errs.length)console.log('PAGE ERRORS',errs);
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
