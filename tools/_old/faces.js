const {chromium}=require(process.env.LB_PLAYWRIGHT||'playwright');
(async()=>{ const b=await chromium.launch({executablePath:process.env.LB_CHROMIUM||undefined}); const p=await b.newPage({viewport:{width:1400,height:300},deviceScaleFactor:2}); const e=[]; p.on('pageerror',x=>e.push(String(x)));
await p.goto(require('url').pathToFileURL((process.env.LB_WORK||require('path').resolve(__dirname,'..','work'))).href+'/faces.html'); await p.waitForTimeout(300); await p.locator('#w').screenshot({path:'deck/faces.png'}); console.log(e); await b.close() })();
