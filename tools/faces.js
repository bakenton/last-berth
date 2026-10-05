const {chromium}=require('/opt/node-tools/node_modules/playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:1400,height:300},deviceScaleFactor:2}); const e=[]; p.on('pageerror',x=>e.push(String(x)));
await p.goto('file:///home/claude/ln/faces.html'); await p.waitForTimeout(300); await p.locator('#w').screenshot({path:'deck/faces.png'}); console.log(e); await b.close() })();
