// Walks design/start/rewards.html with a real mouse and takes screenshots.
// Usage: node design/start/rewards-shots.js <repo root> <out dir>
const path = require('path'), fs = require('fs');
const repo = process.argv[2], out = process.argv[3];
const { chromium } = require(path.join(repo, 'node_modules', 'playwright'));
const url = 'file:///' + path.join(repo, 'design', 'start', 'rewards.html').replace(/\\/g, '/');
fs.mkdirSync(out, { recursive: true });
const log = [];
function ok(name, cond, extra) { log.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' · ' + extra : '')); }
(async () => {
  const br = await chromium.launch(), errs = [];
  let p = await br.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok('no horizontal scroll at 390', sw <= 390, 'scrollWidth ' + sw);
  ok('icon sheet: 7 common, 7 rare', (await p.locator('#common .it').count()) === 7 && (await p.locator('#rare .it').count()) === 7);
  await p.locator('#rare').scrollIntoViewIfNeeded();
  await p.screenshot({ path: path.join(out, 'r1-icons.png'), fullPage: false });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(out, 'r0-top.png') });
  // R: variant A on two rings, with the world card
  const R = p.locator('#R');
  const tapW = async id => { await R.scrollIntoViewIfNeeded(); const b = await R.locator('[data-rw="' + id + '"]').boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
  const rtxt = async sel => (await R.locator(sel).innerText()).replace(/\s+/g, ' ').trim();
  await R.scrollIntoViewIfNeeded();
  await R.screenshot({ path: path.join(out, 'R1-start.png') });
  ok('R: three rare signs wait on the map', (await R.locator('.pingS').count()) === 3, String(await R.locator('.pingS').count()));
  ok('R: no reward chips until a world is picked', (await R.locator('.rchips').count()) === 0);
  await tapW('marrow');
  await R.screenshot({ path: path.join(out, 'R2-picked.png') });
  ok('R: the card names the rewards and the numbers', /MARROW/.test(await rtxt('#rpanel')) && /DOCK/.test(await rtxt('#rpanel')) && /SLEEPERS \+30/.test(await rtxt('#rpanel')), await rtxt('#rpanel'));
  ok('R: chips under the picked world', (await R.locator('.rchips .chip').count()) === 2);
  await R.locator('[data-rgo]').click();
  await p.waitForTimeout(2600);
  await R.screenshot({ path: path.join(out, 'R3-landed.png') });
  ok('R: resources counted up', (await rtxt('.top')) === '1240 340 85 420 14', await rtxt('.top'));
  ok('R: two rare signs left waiting', (await R.locator('.pingS').count()) === 2);
  await tapW('gallows');
  await R.screenshot({ path: path.join(out, 'R4-node.png') });
  await R.locator('[data-rgo]').click();
  await p.waitForTimeout(2600);
  await tapW('threnody');
  await R.screenshot({ path: path.join(out, 'R5-plain-world.png') });
  ok('R: a plain world shows only its resources', /PARTS \+24/.test(await rtxt('#rpanel')) && !/DOCK|NODE/.test(await rtxt('#rpanel')), await rtxt('#rpanel'));
  for (const id of ['A', 'B', 'C']) {
    const st = p.locator('#' + id);
    await st.scrollIntoViewIfNeeded();
    await st.screenshot({ path: path.join(out, 'r-' + id + '-before.png') });
    const b = await st.locator('[data-go]').boundingBox();
    await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await p.waitForTimeout(900);
    await st.screenshot({ path: path.join(out, 'r-' + id + '-mid.png') });
    await p.waitForTimeout(2200);
    await st.screenshot({ path: path.join(out, 'r-' + id + '-after.png') });
    const t = (await st.locator('.top').innerText()).replace(/\s+/g, ' ').trim();
    ok(id + ': resources counted up', t === '1240 340 125 420 18', t);
    ok(id + ': button says landed', (await st.locator('[data-go]').innerText()) === 'LANDED');
    await st.locator('[data-re]').click();
    ok(id + ': replay resets', (await st.locator('.top').innerText()).replace(/\s+/g, ' ').trim() === '1240 310 85 420 6');
  }
  await p.close();
  p = await br.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url);
  for (const id of ['A', 'B', 'C']) await p.locator('#' + id + ' [data-go]').click();
  await p.waitForTimeout(3200);
  await p.screenshot({ path: path.join(out, 'r-desktop.png'), fullPage: true });
  await br.close();
  ok('no page errors', errs.length === 0, errs.join(' | '));
  console.log(log.join('\n'));
  console.log('size', fs.statSync(path.join(repo, 'design', 'start', 'rewards.html')).size);
})().catch(e => { console.log(log.join('\n')); console.log('CRASH', String(e).slice(0, 500)); process.exit(1); });
