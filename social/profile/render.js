// Profile kit renderer: node social/profile/render.js [sheet] [A B C ...]
// sheet -> out/avatars-sheet.png (390 px wide, x2); letters -> out/avatar-<id>.png (1024x1024).
const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
const path=require('path'), fs=require('fs');
const dir=__dirname, out=path.join(dir,'out');
const url=n=>'file:///'+path.join(dir,n).replace(/\\/g,'/');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const args=process.argv.slice(2); const want=args.length?args:['sheet'];
  const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined});
  for(const a of want){
    if(/^sheet\d?$/.test(a)){
      const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
      await p.goto(url('avatars.html')+(a.length>5?'?set='+a.slice(5):'')); await p.evaluate(()=>document.fonts.ready);
      await p.screenshot({path:path.join(out,'avatars-'+a+'.png'),fullPage:true}); await p.close();
    }else if(/^banner/.test(a)){
      const [,kind]=a.split(':'); const size=kind==='yt'?{width:2560,height:1440}:kind==='itch'?{width:630,height:500}:{width:1500,height:500};
      const p=await b.newPage({viewport:size,deviceScaleFactor:1});
      await p.goto(url('banner.html')+'?k='+(kind||'x')); await p.evaluate(()=>document.fonts.ready);
      await p.screenshot({path:path.join(out,'banner-'+(kind||'x')+'.png')}); await p.close();
    }else{
      const p=await b.newPage({viewport:{width:1024,height:1024},deviceScaleFactor:1});
      await p.goto(url('avatars.html')+'?one='+a);
      await p.screenshot({path:path.join(out,'avatar-'+a+'.png')}); await p.close();
    }
    console.log('ok',a);
  }
  await b.close();
})().catch(e=>{ console.error(e); process.exit(1) });
