// node design/help/shots.js — снимки черновиков справки (1440 и 390) в design/help/shots/
const path=require('path'), fs=require('fs'), {chromium}=require('playwright');
const SETS=[['H1','yard'],['H1','world'],['H2','yard'],['H2','world'],['H3','yard'],['H3','world']];
(async()=>{
  const dir=path.join(__dirname,'shots'); fs.mkdirSync(dir,{recursive:true});
  const url='file:///'+path.join(__dirname,'drafts.html').split(path.sep).join('/');
  const b=await chromium.launch(), errs=[]; let n=0;
  for(const [w,h] of [[1440,900],[390,844]]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:w<500?2:1});
    p.on('pageerror',e=>errs.push(String(e)));
    for(const s of SETS){
      await p.goto(url+'#'+s.join(',')); await p.reload(); await p.waitForTimeout(500);
      const over=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      if(over>0) errs.push(w+' '+s.join('-')+': horizontal overflow '+over+'px');
      await p.locator('#stage').screenshot({path:path.join(dir,s.join('-')+'-'+w+'.png')}); n++;
    }
    await p.close();
  }
  await b.close();
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ok: '+n+' shots, no page errors, no horizontal overflow');
})();
