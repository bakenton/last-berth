// Walks design/start/fog.html with a real mouse and takes screenshots. Usage: node fogshots.js <repo> <outdir>
const path = require('path'), fs = require('fs');
const repo = process.argv[2], out = process.argv[3];
const { chromium } = require(path.join(repo, 'node_modules', 'playwright'));
const url = 'file:///' + path.join(repo, 'design', 'start', 'fog.html').replace(/\\/g, '/');
fs.mkdirSync(out, { recursive: true });
const log = [];
function ok(name, cond, extra) { log.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : '')); }
async function clickSvg(p, sel) { await p.evaluate(() => window.scrollTo(0, 0)); const b = await p.locator(sel).boundingBox(); const hit = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.getAttribute("data-cell") || e.getAttribute("data-w") || e.tagName) : "none"; }, [b.x + b.width / 2, b.y + b.height / 2]); if (process.env.DBG) console.log("click", sel, "->", hit); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
async function clickCell(p, r, l) { await p.evaluate(() => window.scrollTo(0, 0)); const b = await p.locator("#map").boundingBox(); const k = b.width / 410, RR = [0, 60, 104, 144, 182], a = -Math.PI / 2 + l * Math.PI / 3 + 0.33 * Math.PI / 3; const x = b.x + (205 + RR[r] * Math.cos(a)) * k, y = b.y + (192 + RR[r] * Math.sin(a) * 0.78) * k; const hit = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.getAttribute("data-cell") || e.getAttribute("data-w") || e.tagName) : "none"; }, [x, y]); if (process.env.DBG) console.log("cell", r + "-" + l, "->", hit); await p.mouse.click(x, y); }
async function txt(p, sel) { return (await p.locator(sel).innerText()).replace(/\s+/g, ' ').trim(); }
(async () => {
  const br = await chromium.launch();
  const errs = [];
  // ---- phone
  let p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url);
  await p.screenshot({ path: path.join(out, 'p1-year0.png') });
  ok('year 0: night unknown', (await txt(p, '#top')).includes('????'), await txt(p, '#top'));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok('no horizontal scroll at 390', sw <= 390, 'scrollWidth ' + sw);
  ok('fog cells drawn', (await p.locator('.fog').count()) === 18, String(await p.locator('.fog').count()));
  ok('nothing to scout at year 0', (await p.locator('.fog.av').count()) === 0);
  // a fog sector that cannot be scouted yet
  await clickCell(p, 2, 5);
  await p.screenshot({ path: path.join(out, 'p2-fog-locked.png') });
  ok('locked sector names its world and the reason', /THRENODY/.test(await txt(p, '#panel')) && /Needs a world/.test(await txt(p, '#panel')), await txt(p, '#panel'));
  // land on Marrow: memory block
  await clickSvg(p, '[data-w="marrow"]');
  await p.screenshot({ path: path.join(out, 'p3-world.png') });
  await p.locator('[data-act="send"]').click();
  await p.screenshot({ path: path.join(out, 'p4-find-memory.png') });
  await p.locator('[data-act="hack"]').click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(out, 'p5-date.png') });
  ok('memory block gives a digit of the date', (await txt(p, '#nd')) === '3???', await txt(p, '#nd'));
  ok('settling opens a sector to scouting', (await p.locator('.fog.av').count()) === 1, String(await p.locator('.fog.av').count()));
  // scout the sector over Marrow
  await clickCell(p, 2, 4);
  await p.locator('[data-act="scout"]').click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(out, 'p6-scouted.png') });
  ok('scouting shows the world and its find', /HOLLOW/.test(await txt(p, '#panel')) && /SLEEPERS/.test(await txt(p, '#panel')), await txt(p, '#panel'));
  // land on Hollow: sleepers; then Solace: blueprint, pick one
  await p.locator('.row[data-w="hollow"]').click();
  await p.locator('[data-act="send"]').click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(out, 'p7-find-sleepers.png') });
  ok('sleepers find', /60 sleepers/.test(await txt(p, '#panel')), await txt(p, '#panel'));
  await clickSvg(p, '[data-w="solace"]');
  await p.locator('[data-act="send"]').click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(out, 'p8-find-blueprint.png') });
  await p.locator('[data-act="pick"]').first().click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(out, 'p9-picked.png') });
  ok('blueprint picked', /SECOND SLIP/.test(await txt(p, '#panel')), await txt(p, '#panel'));
  ok('found strip counts three', (await p.locator('#strip .ic').count()) === 3, String(await p.locator('#strip .ic').count()));
  // scout towards the node and the hull in dock
  await clickCell(p, 2, 5);
  await p.locator('[data-act="scout"]').click();
  await p.locator('.row[data-w="threnody"]').click();
  await p.locator('[data-act="send"]').click();
  await p.locator('[data-act="hack"]').click();
  await clickCell(p, 2, 0);
  await p.locator('[data-act="scout"]').click();
  await p.locator('.row[data-w="vesper"]').click();
  await p.locator('[data-act="send"]').click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(out, 'p10-node.png') });
  ok('second block: 33??', (await txt(p, '#nd')) === '33??', await txt(p, '#nd'));
  ok('node find', /hub/.test(await txt(p, '#panel')), await txt(p, '#panel'));
  // as it is now
  await p.locator('[data-m="now"]').click();
  await p.screenshot({ path: path.join(out, 'p11-now.png') });
  ok('NOW mode shows no fog', (await p.locator('.fog').count()) === 0);
  await p.close();
  // ---- desktop
  p = await br.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url);
  await p.screenshot({ path: path.join(out, 'd1-year0.png') });
  await clickSvg(p, '[data-w="cinder"]');
  await p.locator('[data-act="send"]').click();
  await clickCell(p, 2, 2);
  await p.locator('[data-act="scout"]').click();
  await p.locator('.row[data-w="ferrous"]').click();
  await p.locator('[data-act="send"]').click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(out, 'd2-dock.png') });
  ok('desktop: hull in dock', /courier/.test(await txt(p, '#panel')), await txt(p, '#panel'));
  await br.close();
  ok('no page errors', errs.length === 0, errs.join(' | '));
  console.log(log.join('\n'));
  console.log('size', fs.statSync(path.join(repo, 'design', 'start', 'fog.html')).size);
})().catch(e => { console.log(log.join('\n')); console.log('CRASH', String(e).slice(0, 600)); process.exit(1); });
