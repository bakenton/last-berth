// Проверка прототипа metro: node design/fusions/test/metro.js [bots] [ui] [full]  (без аргументов — всё)
const { chromium } = require('E:/ClaudeCowork/last-berth/node_modules/playwright');
const path = require('path'), fs = require('fs');
const FILE = 'file:///' + path.join(__dirname, '..', 'metro.html').replace(/\\/g, '/');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const shot = (n) => path.join(SHOTS, 'metro-' + n + '.png');
const args = process.argv.slice(2), want = (x) => !args.length || args.includes(x);
const SEEDS = [11, 23, 37, 41, 58, 64, 79, 96, 103, 118, 127, 139, 142, 151, 166, 174];
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++ };

/* ---------- мозги ботов: только публичные window.GAME (состояние и действия) ---------- */
function installBots() {
  window.BOT = {
    /* выбор подарка */
    gift(G, pref) { const S = G.S; if (!S.gift) return; let b = 0, bs = -1; S.gift.forEach((g, i) => { const s = pref[g] != null ? pref[g] : 1; if (s > bs) { bs = s; b = i } }); G.act.pickGift(b) },
    worldsSeen(S) { return S.worlds.filter(w => w.id && w.bornAt <= S.t) },
    onLine(S, id) { return S.lines.some(L => !L.removing && L.nodes.includes(id)) },
    /* разумный: линия туда, чего меньше всего; миры ближние, выработанные снимает; копит запас к Подъёму; в Подъём уводит людей и экипажи */
    sensible(G, st, opt) {
      opt = opt || {}; const S = G.S, K = G.K;
      const fleet = S.ships.length + Object.values(S.dock).reduce((a, d) => a + d.built + d.kit, 0), lines = S.lines.filter(L => !L.removing);
      this.gift(G, { line: S.lineCap < 6 && fleet >= S.lineCap + 1 ? 10 : 3, freighter: 8, hauler: 7.5, courier: 6, hold: 6.5, engine: 5, berth: 5, wake: S.people < 12 ? 9 : 4 });
      if (S.phase === 'over') return;
      if (S.phase === 'lift') { if (!opt.noLift) this.lift(G, st); return }
      if (S.t < (st.next || 0)) return; st.next = S.t + 2;
      /* выработанные участки снять, живые оставить */
      S.lines.forEach(L => { if (L.removing) return; const live = L.nodes.filter(id => !id || !S.worlds[id].dead); if (live.length < 2) G.act.removeLine(L.id); else if (live.length < L.nodes.length) G.act.commit(L.id, live) });
      /* суда: туда, где больше груза на место */
      for (const cls of (opt.cls || ['freighter', 'hauler', 'courier'])) { const d = S.dock[cls]; if (d.built + d.kit < 1) continue; if (d.built < 1 && S.stock.metal < G.CLS[cls].metal + 8) continue; if (S.people < G.CLS[cls].crew + 8) continue;
        let best = null, bs = -1; S.lines.forEach(L => { if (L.removing) return; const cap = S.ships.filter(x => x.line === L.id).reduce((a, x) => a + G.CLS[x.cls].cap, 0); const pile = L.nodes.slice(1).reduce((a, id) => a + S.worlds[id].surf + 2, 0) * (1 + L.len / 200); const v = pile / (cap + 1); if (v > bs) { bs = v; best = L } });
        if (best) G.act.deploy(cls, best.id) }
      /* линия без судна при пустом доке: снять судно с линии, где их больше всего */
      const bare = S.lines.find(L => !L.removing && !S.ships.some(x => x.line === L.id && !x.recall));
      if (bare) { const counts = {}; S.ships.forEach(x => { if (!x.recall) counts[x.line] = (counts[x.line] || 0) + 1 }); const donor = S.ships.filter(x => !x.recall && counts[x.line] >= 2)[0]; if (donor) G.act.recall(donor.id, bare.id) }
      /* сколько нужно в секунду на каждый ресурс и сколько уже подключено */
      const prep = S.t > 230, need = { food: G.burn('food', S.t + 40) * (prep ? 2 : 1.4), metal: G.burn('metal', S.t + 40) + (G.seats() < S.people + S.worlds.reduce((a, w) => a + w.pop, 0) ? 2.4 : .6), fuel: (G.burn('fuel', S.t + 40) + S.outr.fuel) * 1.3 + .1 };
      const have = { food: 0, metal: 0, fuel: 0 }, linked = {}; S.lines.forEach(L => { if (L.removing) return; L.nodes.slice(1).forEach(id => { if (!linked[id]) { linked[id] = 1; const w = S.worlds[id]; if (!w.dead) have[w.type] += w.rate } }) });
      const order = G.RES.slice().sort((a, b) => (S.stock[a] + (have[a] - need[a]) * 40) - (S.stock[b] + (have[b] - need[b]) * 40));
      for (const r of order) {
        if (have[r] >= need[r] && S.stock[r] > 25) continue;
        const cand = this.worldsSeen(S).filter(w => w.type === r && !w.dead && !linked[w.id] && w.dep > 12 && (!opt.only || opt.only(w)) && (w.founded || w.cost <= Math.floor(S.people) - 4));
        if (!cand.length) continue;
        const key = w => (opt.far ? -w.ring * 1000 : w.ring * 1000) + G.routeLen([0, w.id]); cand.sort((a, b) => key(a) - key(b));
        const w = cand[0];
        if (G.freeLines() > 0) { if (G.act.commit(null, [0, w.id]).ok) return }
        let bl = null, bd = 1e9; lines.forEach(L => { if (L.nodes.length > 3) return; const e = S.worlds[L.nodes[L.nodes.length - 1]]; const d = Math.hypot(e.x - w.x, e.y - w.y); if (d < bd) { bd = d; bl = L } });
        if (bl && bd < 220) { if (G.act.commit(bl.id, bl.nodes.concat([w.id])).ok) return }
      }
    },
    /* перестройка в Подъём: только то, что есть у игрока — перерисовать линию, снять пустую, вернуть судно. Цена мира — видимое число людей и длина. */
    lift(G, st) {
      const S = G.S, K = G.K, left = K.T - S.t;
      if (S.t > (st.nextLift || 0) && left > 22) { st.nextLift = S.t + 3;
        G.act.dropEmpty();
        const live = () => S.lines.filter(L => !L.removing);
        const served = id => live().some(L => L.nodes.includes(id));
        const dist = w => Math.max(40, G.routeLen([0, w.id]));
        const val = L => L.nodes.slice(1).reduce((a, id) => a + S.worlds[id].pop, 0) / L.len;
        const open = S.worlds.filter(w => w.id && w.founded && w.pop >= 3 && !served(w.id)).sort((a, b) => b.pop / dist(b) - a.pop / dist(a));
        if (open.length) { const w = open[0], near = open.slice(1).find(x => Math.hypot(x.x - w.x, x.y - w.y) < 90 && dist(x) < dist(w));
          const nodes = near ? [0, near.id, w.id] : [0, w.id], v = nodes.slice(1).reduce((a, id) => a + S.worlds[id].pop, 0) / G.routeLen(nodes);
          if (G.freeLines() > 0) G.act.commit(null, nodes);
          else { const worst = live().sort((a, b) => val(a) - val(b))[0]; if (worst && v > val(worst) * 1.3) G.act.commit(worst.id, nodes) } }
        else { /* все обслужены: самую длинную линию укоротить, если её конец не окупает рейс */
          live().forEach(L => { if (L.nodes.length < 3) return; const e = S.worlds[L.nodes[L.nodes.length - 1]], cut = L.nodes.slice(0, -1); if (e.pop / L.len < L.nodes.slice(1, -1).reduce((a, id) => a + S.worlds[id].pop, 0) / G.routeLen(cut) * .5) G.act.commit(L.id, cut) }) }
      }
      /* успеть домой */
      S.ships.forEach(sh => { if (sh.recall) return; const v = G.CLS[sh.cls].v * S.speed * K.LIFT_V * 1.15; if (sh.s / v + 2.5 >= left) G.act.recall(sh.id) });
    }
  };
  window.playBot = function (name, seed, asp) {
    const G = window.GAME; G.pause(true); G.reset(seed, { asp: asp || 1 });
    const st = {}; const B = window.BOT; let guard = 0, snaps = [];
    while (G.S.phase !== 'over' && guard++ < 20000) {
      const S = G.S;
      if (name === 'idle') { if (S.gift) G.act.pickGift(0) }
      else if (name === 'sensible') B.sensible(G, st);
      else if (name === 'nolift') B.sensible(G, st, { noLift: true });
      else if (name === 'far') B.sensible(G, st, { far: true, noLift: true, cls: ['freighter', 'hauler', 'courier'] });
      else if (name === 'near') B.sensible(G, st, { only: w => w.ring <= 1 });
      else if (name === 'metal') B.sensible(G, st, { only: w => w.type === 'metal' });
      G.run(.5, .05);
      if (name === 'sensible' && Math.abs(G.S.t % 60) < .5) snaps.push([Math.round(G.S.t), Math.round(G.S.stock.food), Math.round(G.S.stock.metal), Math.round(G.S.stock.fuel), Math.round(G.S.people), G.seats(), G.S.lines.length, G.S.ships.length]);
    }
    const R = G.S.result || { why: 'stuck', souls: 0, left: 0, seats: 0, win: false }, S = G.S;
    return { name, seed, why: R.why, win: R.win, souls: R.souls, left: R.left, seats: R.seats, t: Math.round(R.t || S.t), found: S.stats.founded, evac: S.stats.evac, carried: S.stats.carried, rate: R.rate, snaps };
  };
}

async function bots(browser) {
  const out = {};
  for (const [lbl, asp, vp] of [['desk', 1440 / 620, { width: 1440, height: 900 }], ['phone', 390 / 590, { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp });
    page.on('pageerror', e => { fails++; console.log('pageerror', e.message) });
    await page.goto(FILE + '?auto=1&seed=1'); await page.evaluate(installBots);
    const names = ['idle', 'sensible', 'nolift', 'far', 'near', 'metal'];
    const res = {};
    for (const n of names) { res[n] = []; for (const s of SEEDS) res[n].push(await page.evaluate(([n, s, a]) => window.playBot(n, s, a), [n, s, asp])) }
    console.log('\n== боты, раскладка ' + lbl + ' ==');
    console.log('бот       побед  души (ср.)  осталось  мест  конец(t)   души по сидам');
    for (const n of names) { const r = res[n], w = r.filter(x => x.win).length, av = k => Math.round(r.reduce((a, x) => a + x[k], 0) / r.length);
      console.log(n.padEnd(9), (w + '/' + r.length).padEnd(6), String(av('souls')).padEnd(11), String(av('left')).padEnd(9), String(av('seats')).padEnd(5), String(av('t')).padEnd(10), r.map(x => x.souls).join(' ')) }
    console.log('sensible по сидам:', res.sensible.map(x => x.why + ':' + x.t).join(' '));
    if (args.includes('trace')) console.log(JSON.stringify(res.sensible[0].snaps));
    const avg = n => res[n].reduce((a, x) => a + x.souls, 0) / SEEDS.length, wins = n => res[n].filter(x => x.win).length;
    ok(wins('idle') === 0 && avg('idle') < 5, lbl + ': бездействие проигрывает');
    ok(wins('sensible') >= SEEDS.length / 2, lbl + ': разумный побеждает хотя бы на половине сидов (' + wins('sensible') + '/' + SEEDS.length + ')');
    for (const x of ['far', 'nolift']) ok(avg(x) * 1.2 <= avg('sensible'), lbl + ': ' + x + ' без перестройки хуже разумного минимум на 20% (' + Math.round(avg(x)) + ' против ' + Math.round(avg('sensible')) + ', ' + Math.round(100 * (1 - avg(x) / avg('sensible'))) + '%)');
    for (const x of ['near', 'metal']) ok(avg(x) < avg('sensible'), lbl + ': ' + x + ' хуже разумного (' + Math.round(avg(x)) + ' < ' + Math.round(avg('sensible')) + ')');
    out[lbl] = res; await page.close();
  }
  return out;
}

/* ---------- настоящая мышь ---------- */
async function dragMouse(page, a, b, steps) { await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: steps || 8 }); await page.mouse.move(b.x, b.y, { steps: steps || 8 }); await page.mouse.up() }
const firstOf = (page, type) => page.evaluate(t => { const S = GAME.S; return S.worlds.find(w => w.id && w.bornAt <= S.t && w.type === t && w.ring === 0).id }, type);
const wPos = (page, id) => page.evaluate(i => GAME.view.world(i), id);
const tokPos = async (page, cls) => { const b = await page.locator('[data-cls=' + cls + ']').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } };
const visible = (page) => page.evaluate(() => document.body.innerText);

async function uiDesk(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.goto(FILE + '?seed=23'); await page.waitForTimeout(400);
  const help = await visible(page); ok(help.includes('Последний подъём') && help.includes('Тяните') === false || help.includes('тяните'), 'окно «?» при входе: ' + help.slice(0, 40).replace(/\n/g, ' '));
  await page.screenshot({ path: shot('desk-help') });
  await page.click('.lb-modal .btn.pri'); await page.waitForTimeout(500);
  const earth = await wPos(page, 0);
  await page.screenshot({ path: shot('desk-1-start') });
  const f = await firstOf(page, 'food'), m = await firstOf(page, 'metal'), u = await firstOf(page, 'fuel');
  /* отказ: нажатие в пустоту ничего не ломает, основание снимает людей */
  const p0 = await page.evaluate(() => GAME.S.people);
  await dragMouse(page, earth, await wPos(page, f)); await page.waitForTimeout(150);
  let st = await page.evaluate(() => ({ lines: GAME.S.lines.length, ships: GAME.S.ships.length, people: GAME.S.people, founded: GAME.S.stats.founded }));
  ok(st.lines === 1 && st.ships === 1 && st.founded === 1, 'мышь: линия от Земли к миру, судно встало само');
  ok(st.people < p0, 'мышь: основание стоит людей (' + p0 + ' → ' + st.people.toFixed(1) + ')');
  { const mp = await wPos(page, m); await page.mouse.move(earth.x, earth.y); await page.mouse.down(); await page.mouse.move((earth.x + mp.x) / 2, (earth.y + mp.y) / 2, { steps: 6 }); await page.mouse.move(mp.x, mp.y, { steps: 6 }); await page.mouse.move(mp.x + 50, mp.y + 40, { steps: 3 }); await page.waitForTimeout(80); await page.screenshot({ path: shot('desk-1b-drawing') }); await page.mouse.move(mp.x, mp.y, { steps: 3 }); await page.mouse.up() }
  await dragMouse(page, earth, await wPos(page, u)); await page.waitForTimeout(150);
  st = await page.evaluate(() => ({ lines: GAME.S.lines.length, ships: GAME.S.ships.length })); ok(st.lines === 3 && st.ships === 3, 'мышь: три линии, три судна');
  /* отказ: нет линии */
  await page.mouse.move(earth.x, earth.y); await page.mouse.down(); await page.waitForTimeout(80); const toast = await page.evaluate(() => (document.getElementById('lb-toast') || {}).innerText || ''); await page.mouse.up();
  ok(/Нет свободной линии/.test(toast), 'отказ объясняет причину: ' + toast);
  /* снять участок назад и протянуть заново: концом линии */
  await page.waitForTimeout(6000);
  const moved = await page.evaluate(() => GAME.S.ships.map(s => Math.round(s.s)));
  ok(moved.some(x => x > 0), 'суда движутся: s=' + moved);
  /* движение плавное: позиции на соседних кадрах близки */
  const smooth = await page.evaluate(async () => { const out = []; for (let i = 0; i < 40; i++) { await new Promise(r => requestAnimationFrame(r)); const sh = GAME.S.ships[0]; out.push([sh.rx, sh.ry]) } let mx = 0; for (let i = 1; i < out.length; i++) mx = Math.max(mx, Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1])); return mx });
  ok(smooth < 8, 'плавность: наибольший шаг судна за кадр ' + smooth.toFixed(2) + ' ед.');
  await page.screenshot({ path: shot('desk-2-lines') });
  /* подарок смены: настоящий клик */
  await page.evaluate(() => { GAME.S.t = GAME.S.nextGift - .2 });
  await page.waitForSelector('.gift', { timeout: 3000 }); await page.waitForTimeout(350);
  const giftTxt = await page.locator('#giftv').innerText(); await page.screenshot({ path: shot('desk-3-gift') });
  await page.locator('.gift').first().click(); await page.waitForTimeout(100);
  ok(await page.evaluate(() => !GAME.S.gift), 'подарок выбран мышью: ' + giftTxt.replace(/\n/g, ' ').slice(0, 60));
  /* судно со значка на линию: мышью */
  await page.evaluate(() => { GAME.S.dock.courier.built = 1 }); await page.waitForTimeout(350);
  const shipsBefore = await page.evaluate(() => GAME.S.ships.length);
  const lid = await page.evaluate(() => GAME.S.lines[0].id), lm = await page.evaluate(i => GAME.view.line(i, .5), lid);
  await dragMouse(page, await tokPos(page, 'courier'), lm, 10); await page.waitForTimeout(100);
  ok(await page.evaluate(() => GAME.S.ships.length) === shipsBefore + 1, 'мышь: курьер перетащен на линию');
  /* продление с конца линии */
  await page.evaluate(() => { GAME.S.t = 45; GAME.S.worlds.forEach(w => { if (w.bornAt <= 60) { w.bornAt = 0; w.seen = true } }) }); await page.waitForTimeout(600);
  const ext = await page.evaluate(() => { const S = GAME.S, L = S.lines[0], e = S.worlds[L.nodes[L.nodes.length - 1]]; const near = S.worlds.filter(w => w.id && w.bornAt <= S.t && !L.nodes.includes(w.id) && !S.lines.some(q => q.nodes.includes(w.id))).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0]; return { id: L.id, w: near.id, n: L.nodes.length } });
  await dragMouse(page, await page.evaluate(i => GAME.view.handle(i), ext.id), await wPos(page, ext.w)); await page.waitForTimeout(100);
  const n2 = await page.evaluate(i => GAME.S.lines.find(L => L.id === i).nodes.length, ext.id); ok(n2 === ext.n + 1, 'мышь: линия продлена с конца');
  /* снять участок: потянуть конец назад */
  const prevNode = await page.evaluate(i => { const L = GAME.S.lines.find(L => L.id === i); return L.nodes[L.nodes.length - 2] }, ext.id);
  await dragMouse(page, await page.evaluate(i => GAME.view.handle(i), ext.id), await wPos(page, prevNode)); await page.waitForTimeout(100);
  ok(await page.evaluate(i => GAME.S.lines.find(L => L.id === i).nodes.length, ext.id) === ext.n, 'мышь: участок снят движением назад');
  /* вставить мир в середину линии */
  const ins = await page.evaluate(() => { const S = GAME.S; const L = S.lines[1]; const near = S.worlds.filter(w => w.id && w.bornAt <= S.t && !L.nodes.includes(w.id)).sort((a, b) => a.ring - b.ring)[0]; return { id: L.id, w: near.id, n: L.nodes.length } });
  await dragMouse(page, await page.evaluate(i => GAME.view.line(i, .55), ins.id), await wPos(page, ins.w)); await page.waitForTimeout(100);
  ok(await page.evaluate(i => GAME.S.lines.find(L => L.id === i).nodes.length, ins.id) === ins.n + 1, 'мышь: мир вставлен в середину линии');
  /* пауза, рисовать на паузе */
  await page.locator('[data-spd=p]').click(); const tp = await page.evaluate(() => GAME.S.t); await page.waitForTimeout(300); ok(await page.evaluate(() => GAME.S.t) === tp, 'пауза останавливает время');
  await page.locator('[data-spd="2"]').click(); await page.waitForTimeout(200);
  /* выбор линии и снятие кнопкой */
  const sLid = await page.evaluate(() => GAME.S.lines[2].id);
  await page.locator('[data-line="' + sLid + '"]').click(); await page.waitForTimeout(280);
  const ctx = await page.locator('#ctx').innerText();
  ok(/рейс/.test(ctx) && /Снять линию/i.test(ctx), 'значок линии: панель линии: ' + ctx.replace(/\n/g, ' '));
  await page.locator('[data-a=rmline]').click(); await page.waitForTimeout(150);
  ok(await page.evaluate(i => { const L = GAME.S.lines.find(q => q.id === i); return !L || L.removing }, sLid), 'снять линию: суда идут домой');
  ok(errs.length === 0, 'нет ошибок на странице ' + errs.join('|'));
  await page.close();
}

/* ---------- настоящее касание (CDP: touchStart/Move/End идут как у пальца) ---------- */
async function touchDrag(cdp, a, b, steps) { steps = steps || 10;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
  for (let i = 1; i <= steps; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function uiPhone(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.goto(FILE + '?seed=37'); await page.waitForTimeout(400);
  await page.screenshot({ path: shot('phone-help') });
  const b = await page.locator('.lb-modal .btn.pri').boundingBox(); ok(b.height >= 40, 'телефон: кнопка окна ≥ 40 px');
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !document.querySelector('.lb-veil')), 'телефон: окно закрыто касанием');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'телефон: нет горизонтальной прокрутки');
  await page.screenshot({ path: shot('phone-1-start') });
  const earth = await wPos(page, 0), f = await firstOf(page, 'food'), m = await firstOf(page, 'metal'), u = await firstOf(page, 'fuel');
  await touchDrag(cdp, earth, await wPos(page, f)); await page.waitForTimeout(120);
  ok(await page.evaluate(() => GAME.S.lines.length) === 1, 'касание: линия нарисована пальцем');
  { const mp = await wPos(page, m), S0 = (t, x, y) => cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: t === 'touchEnd' ? [] : [{ x, y }] });
    await S0('touchStart', earth.x, earth.y); for (let i = 1; i <= 8; i++) await S0('touchMove', earth.x + (mp.x - earth.x) * i / 8, earth.y + (mp.y - earth.y) * i / 8); await S0('touchMove', mp.x + 30, mp.y - 30); await page.waitForTimeout(80); await page.screenshot({ path: shot('phone-1b-drawing') }); await S0('touchMove', mp.x, mp.y); await S0('touchEnd') }
  await touchDrag(cdp, earth, await wPos(page, u)); await page.waitForTimeout(120);
  ok(await page.evaluate(() => GAME.S.lines.length) === 3, 'касание: три линии');
  /* зоны ≥ 40 px */
  const small = await page.evaluate(() => [...document.querySelectorAll('#dock button,#ctx button')].filter(b => { const r = b.getBoundingClientRect(); return r.width < 40 || r.height < 40 }).map(b => b.className));
  ok(small.length === 0, 'телефон: кнопки ≥ 40 px ' + small.join());
  await page.waitForTimeout(5000); await page.screenshot({ path: shot('phone-2-lines') });
  /* подарок касанием */
  await page.evaluate(() => { GAME.S.t = GAME.S.nextGift - .2 }); await page.waitForSelector('.gift'); await page.waitForTimeout(350);
  await page.screenshot({ path: shot('phone-3-gift') });
  const g = await page.locator('.gift').first().boundingBox(); await touchDrag(cdp, { x: g.x + g.width / 2, y: g.y + g.height / 2 }, { x: g.x + g.width / 2, y: g.y + g.height / 2 }, 1); await page.waitForTimeout(150);
  ok(await page.evaluate(() => !GAME.S.gift), 'касание: подарок выбран');
  /* судно пальцем на линию */
  await page.evaluate(() => { GAME.S.dock.courier.built = 1 }); await page.waitForTimeout(350);
  const nb = await page.evaluate(() => GAME.S.ships.length), lid = await page.evaluate(() => GAME.S.lines[0].id);
  await touchDrag(cdp, await tokPos(page, 'courier'), await page.evaluate(i => GAME.view.line(i, .5), lid)); await page.waitForTimeout(100);
  ok(await page.evaluate(() => GAME.S.ships.length) === nb + 1, 'касание: судно перетащено на линию');
  /* судно с линии вниз: домой */
  const sid = await page.evaluate(i => { const s = GAME.S.ships.find(x => x.line === i && x.s > 15) || GAME.S.ships.find(x => x.s > 15); return s && s.id }, lid);
  if (sid) { const pos = await page.evaluate(i => GAME.view.ship(i), sid), tk = await tokPos(page, 'hauler');
    await touchDrag(cdp, pos, tk, 6); await page.waitForTimeout(80);
    const rec = await page.evaluate(i => { const s = GAME.S.ships.find(x => x.id === i); return !s || s.recall }, sid); ok(rec, 'касание: судно снято вниз, идёт домой') }
  ok(await page.evaluate(() => !GAME.S.gift), 'окно смены не висит');
  /* пауза касанием */
  const ps = await page.locator('[data-spd=p]').boundingBox(); await touchDrag(cdp, { x: ps.x + 20, y: ps.y + 20 }, { x: ps.x + 20, y: ps.y + 20 }, 1); await page.waitForTimeout(150);
  const t1 = await page.evaluate(() => GAME.S.t); await page.waitForTimeout(250); ok(await page.evaluate(() => GAME.S.t) === t1, 'касание: пауза');
  await touchDrag(cdp, { x: ps.x + 20, y: ps.y + 20 }, { x: ps.x + 20, y: ps.y + 20 }, 1);
  ok(errs.length === 0, 'нет ошибок на телефоне ' + errs.join('|'));
  await ctx.close();
}

/* ---------- перестройка линии в Подъём настоящим указателем: от конца линии назад к Земле и к брошенному миру ---------- */
async function liftRebuild(page, ctx, lbl, touch) {
  await page.evaluate(() => GAME.pause(true)); await page.waitForTimeout(700);
  const barTxt = await page.locator('#ctx').innerText(); ok(/Дойдут/.test(barTxt) && /останутся/.test(barTxt), lbl + ': панель Подъёма: ' + barTxt.replace(/\s+/g, ' '));
  const plan = await page.evaluate(() => { const S = GAME.S, base = GAME.forecast().souls; let best = null;
    S.lines.filter(L => !L.removing).forEach(L => S.worlds.filter(w => w.id && w.founded && w.pop >= 3 && !L.nodes.includes(w.id)).forEach(w => { const seq = [GAME.view.handle(L.id)].concat(L.nodes.slice(0, -1).reverse().map(i => GAME.view.world(i)), [GAME.view.world(w.id)]), others = S.worlds.filter(o => o.id && o.bornAt <= S.t && o.id !== w.id && !L.nodes.includes(o.id)).map(o => GAME.view.world(o.id));
      const clear = others.every(o => seq.every((a, i) => { if (!i) return true; const b = seq[i - 1], dx = a.x - b.x, dy = a.y - b.y, u = Math.max(0, Math.min(1, ((o.x - b.x) * dx + (o.y - b.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(b.x + dx * u - o.x, b.y + dy * u - o.y) > 34 }));
      if (!clear) return; const f = GAME.forecast(() => GAME.act.commit(L.id, [0, w.id])); if (f.souls <= base) return; if (!best || f.souls > best.souls) best = { line: L.id, w: w.id, souls: f.souls, nodes: L.nodes.slice(), name: w.name } }));
    return { base, best, marks: Object.keys(GAME.forecast().worlds).length, lost: Object.keys(GAME.forecast().ships).length } });
  ok(plan.marks > 0, lbl + ': прогноз метит миры «не успеют» (' + plan.marks + '), судов не вернётся ' + plan.lost);
  const pts = [await page.evaluate(i => GAME.view.handle(i), plan.best.line)];
  for (let i = plan.best.nodes.length - 2; i >= 0; i--) pts.push(await page.evaluate(i => GAME.view.world(i), plan.best.nodes[i]));
  pts.push(await page.evaluate(i => GAME.view.world(i), plan.best.w));
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  const send = (t, q) => cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: q ? [{ x: q.x, y: q.y }] : [] });
  if (touch) await send('touchStart', pts[0]); else { await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down() }
  for (let i = 1; i < pts.length; i++) for (let k = 1; k <= 10; k++) { const q = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 10, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 10 }; if (touch) await send('touchMove', q); else await page.mouse.move(q.x, q.y); }
  await page.waitForTimeout(120); await page.screenshot({ path: shot(lbl + '-7b-redraw') });
  if (touch) await send('touchEnd'); else await page.mouse.up();
  await page.waitForTimeout(700);
  const after = await page.evaluate(i => ({ nodes: GAME.S.lines.find(L => L.id === i).nodes, souls: GAME.forecast().souls }), plan.best.line);
  ok(after.nodes.includes(plan.best.w) && after.nodes.length <= plan.best.nodes.length + 2, lbl + (touch ? ': касание' : ': мышь') + ': линия перерисована в Подъём на ' + plan.best.name);
  ok(after.souls > plan.base, lbl + ': прогноз вырос после перерисовки: ' + plan.base + ' → ' + after.souls);
  await page.screenshot({ path: shot(lbl + '-7c-rebuilt') });
  await page.evaluate(() => GAME.pause(false)); await page.waitForTimeout(1500);
  await page.screenshot({ path: shot(lbl + '-7d-flying') }); await page.evaluate(() => GAME.pause(true));
}

/* ---------- партия целиком: бот до экрана итога, в браузере, с рисованием ---------- */
async function fullGame(browser, vp, lbl, touch) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: !!touch, isMobile: !!touch, deviceScaleFactor: touch ? 2 : 1 });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.goto(FILE + '?auto=1&seed=41'); await page.evaluate(installBots); await page.waitForTimeout(100);
  await page.evaluate(() => { const G = GAME, st = {}; G.pause(true); window._done = false; const stepN = (until, noLift) => { let g = 0; while (G.S.phase !== 'over' && G.S.t < until && g++ < 40000) { BOT.sensible(G, st, { noLift: !!noLift }); G.run(.5, .05) } }; window._to = stepN });
  const mid = async (t, name) => { await page.evaluate(x => window._to(x, true), t); await page.evaluate(() => { GAME.pause(false); document.querySelector('[data-spd="1"]').dispatchEvent(new Event('noop')) }); await page.waitForTimeout(1600); await page.screenshot({ path: shot(lbl + '-' + name) }); await page.evaluate(() => GAME.pause(true)) };
  await mid(90, '4-t090'); await mid(240, '5-mid'); await mid(375, '6-prelift'); await mid(405, '7-lift');
  await page.evaluate(() => GAME.pause(false)); const fps = await page.evaluate(() => new Promise(r => { let n = 0, t0 = performance.now(); (function f() { n++; if (performance.now() - t0 > 1000) r(n); else requestAnimationFrame(f) })() })); await page.evaluate(() => GAME.pause(true)); console.log('     кадров в секунду в Подъёме (' + lbl + '): ' + fps); ok(fps >= 30, lbl + ': частота кадров ≥ 30');
  await liftRebuild(page, ctx, lbl, touch);
  await mid(462, '8-night');
  if (!touch) { /* финал в реальном времени настоящей мышью: кнопка тревоги уводит суда, время доходит до Ночи */
    await page.evaluate(() => window._to(466)); await page.evaluate(() => { GAME.pause(false) }); await page.waitForTimeout(500);
    if (await page.evaluate(() => GAME.S.phase) === 'lift') { const al = await page.locator('#ctx').innerText(); ok(/Все суда домой/i.test(al), lbl + ': тревога с действием: ' + al.replace(/\s+/g, ' '));
      await page.locator('[data-a=recallAll]').click(); await page.waitForTimeout(150); ok(await page.evaluate(() => GAME.S.ships.every(s => s.recall)), lbl + ': все суда идут домой'); await page.screenshot({ path: shot(lbl + '-8b-recall') });
      await page.locator('[data-spd="2"]').click(); await page.waitForSelector('#end', { timeout: 15000 }) }
  }
  await page.evaluate(() => window._to(9999)); await page.waitForSelector('#end', { timeout: 8000 }); await page.waitForTimeout(1600);
  await page.screenshot({ path: shot(lbl + '-9-end') });
  const txt = await page.locator('#end').innerText(); ok(/душ на борту/.test(txt), lbl + ': экран итога виден: ' + txt.replace(/\n+/g, ' / ').slice(0, 110));
  const s0 = await page.evaluate(() => GAME.S.seed);
  const btn = page.locator('#again'); const bb = await btn.boundingBox(); ok(bb.height >= 40, lbl + ': кнопка заново ≥ 40 px');
  if (touch) await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); else await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ t: GAME.S.t, phase: GAME.S.phase, lines: GAME.S.lines.length, end: !!document.getElementById('end') }));
  ok(after.phase === 'play' && after.lines === 0 && !after.end && after.t < 2, lbl + ': «заново» начинает новую партию');
  ok(errs.length === 0, lbl + ': нет ошибок ' + errs.join('|'));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  if (want('bots')) await bots(browser);
  if (want('ui')) { await uiDesk(browser); await uiPhone(browser) }
  if (want('full')) { await fullGame(browser, { width: 1440, height: 900 }, 'desk', false); await fullGame(browser, { width: 390, height: 844 }, 'phone', true) }
  await browser.close();
  console.log(fails ? '\nПАДЕНИЙ: ' + fails : '\nВСЁ ЗЕЛЁНОЕ'); process.exit(fails ? 1 : 0);
})();
