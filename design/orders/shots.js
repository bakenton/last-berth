// node design/orders/shots.js [round2] — снимки черновиков целей и завода (1440 и 390) в design/orders/shots/
const path=require('path'), fs=require('fs'), {chromium}=require('playwright');
const R={drafts:{file:'drafts.html',sets:[['A','now','j'],['B','R1','j'],['C','R2','j']]},
         round2:{file:'round2.html',sets:[['B1','W1'],['B2','W2'],['B3','W3']]}};
(async()=>{
  const r=R[process.argv[2]||'drafts'], pre=process.argv[2]==='round2'?'r2-':'';
  const dir=path.join(__dirname,'shots'); fs.mkdirSync(dir,{recursive:true});
  const url='file:///'+path.join(__dirname,r.file).replace(/\\/g,'/');
  const b=await chromium.launch(), errs=[]; let n=0;
  for(const [w,h] of [[1440,900],[390,844]]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:w<500?2:1});
    p.on('pageerror',e=>errs.push(String(e)));
    for(const s of r.sets){
      await p.goto(url+'#'+s.join(',')); await p.reload(); await p.waitForTimeout(500);
      const over=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      if(over>0) errs.push(w+' '+s[0]+': horizontal overflow '+over+'px');
      await p.screenshot({path:path.join(dir,pre+s[0]+'-'+s[1]+'-'+w+'.png'),fullPage:true}); n++;
    }
    await p.close();
  }
  await b.close();
  console.log(errs.length?'ERRORS\n'+errs.join('\n'):'ok: '+n+' shots, no page errors, no horizontal overflow');
})();
