// Проверка frostpunk: node design/fusions/test/frostpunk.js [bots|ui|all]
const { chromium } = require('E:/ClaudeCowork/last-berth/node_modules/playwright');
const path = require('path'), fs = require('fs');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'frostpunk.html').replace(/\\/g, '/');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const SEEDS = [11, 22, 33, 44, 55, 66, 77, 88];
const mode = process.argv[2] || 'all';

/* Бот живёт в странице и играет только через window.GAME — теми же действиями, что и игрок. */
function installBot() {
  const C = GAME.CORE;
  const MIXED = ['n1', 'c3', 'c2', 'n4', 'n5', 'c6', 'n7', 'c8'];
  const ORDER = { c: ['c1', 'c3', 'c2', 'c4', 'c5', 'c6', 'c7', 'c8'], n: ['n1', 'n3', 'n2', 'n4', 'n5', 'n6', 'n7', 'n8'] };

  function pickCase(g, st) {
    if (!g.case || g.answered) return;
    const scores = g.case.opts.map((o) => {
      let fx = Object.assign({}, o.fx);
      if (o.p !== undefined) { const a = o.ok.fx, b = o.no.fx; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (typeof (a[k] || 0) === 'number') fx[k] = (fx[k] || 0) + o.p * (a[k] || 0) + (1 - o.p) * (b[k] || 0); }
      const v = (k) => fx[k] || 0;
      const named = v('name') - v('cross') - v('crossR');
      if (st === 'blindHarsh') return v('fear') * 2 - v('trust') * 2 - named * 3 + (v('food') + v('metal') + v('fuel')) * .2;
      if (st === 'blindKind') return v('trust') * 2 - v('fear') * 2 + named * 3 + v('promise') * .3 + v('ppl') * .1;
      // разумные: цена ресурса зависит от запаса, настроение бережётся у края, ветка задаёт склонность
      const f = C.calc(g);
      const w = (k) => { const left = f.net[k] < 0 ? g[k] / -f.net[k] : 99; return left < 3 ? 1.2 : left < 6 ? .6 : g[k] > 150 ? .08 : .25 };
      let u = v('food') * w('food') + v('metal') * w('metal') + v('fuel') * w('fuel') + v('ark') * 1 + v('ppl') * 1.3;
      const tw = g.trust < 22 ? 1.6 : g.trust > 65 ? .1 : .45, fw = g.fear > 62 ? 1.6 : g.fear < 25 ? .05 : .35;
      u += v('trust') * tw - v('fear') * fw - v('hate') * .3 - v('promise') * (st === 'count' ? 1 : .35);
      if (fx.eff) u += 8;
      u += named * (st === 'names' ? 2.2 : .7);
      return u;
    });
    let best = 0; scores.forEach((s, i) => { if (s > scores[best]) best = i });
    C.answer(g, best);
  }

  function signP(g, st) {
    if (g.cool > 0) return;
    const b = (st === 'count' || st === 'blindHarsh') ? 'c' : 'n';
    for (const id of (st === 'mixed' ? MIXED : ORDER[b])) {
      const why = C.whySign(g, id); if (why) continue;
      const p = C.PBY[id], fx = p.fx || {};
      if (st === 'count') { // считает край: не подписывает то, что сейчас доведёт до бунта
        if (g.fear + (fx.fear || 0) > 72) continue; if (g.trust + (fx.trust || 0) < 12 && id !== 'c7') continue; if (id === 'c7' && g.trust > 25) continue;
      }
      if (st === 'names') { // считает цену: не обещает больше, чем строит, и не отдаёт верфь голосу
        if (id === 'n8' && (g.ark < g.pop * .4 || g.promise > 10)) continue; if (id === 'n7' && g.trust > 40) continue; if (id === 'n5' && C.handsFree(g) < 5 && g.food < 40) continue;
      }
      C.sign(g, id); return;
    }
  }

  function manage(g, st) {
    const s = g.s;
    g.worlds.forEach((w) => { if (w.built && !w.dark && w.hands > 0 && s >= w.darkAt - 1) C.setHands(g, w.id, -99); });
    // постройка
    const yards = g.slots.filter((x) => x.type === 'yard').length, farms = g.slots.filter((x) => x.type === 'farm').length, meds = g.slots.filter((x) => x.type === 'med').length;
    const empty = g.slots.filter((x) => !x.type), f0 = C.calc(g), foodHands = (f0.U.food) / (C.FARM * f0.e);
    const liveLine = (r) => g.worlds.filter((w) => w.built && !w.dark && !w.empty && w.res === r && (w.darkAt - s) > 2).length;
    const newLine = (r) => g.worlds.filter((w) => !w.built && !w.dark && w.res === r && w.darkAt - s > 3).sort((a, b) => a.d - b.d)[0];
    const tryB = (id, t) => !C.build(g, id, t);
    let done = g.bAct;
    const room = empty[0] && empty[0].id;
    if (!done && room && s >= 3 && yards < 1) done = tryB(room, 'yard');
    if (!done && room && g.pop >= C.housing(g) - 12 && (f0.net.food > -5 || g.food > 80) && s < 20) done = tryB(room, 'house');
    if (!done && room && farms * 20 < foodHands + 4) done = tryB(room, 'farm');
    const depLeft = (r) => g.worlds.filter((w) => w.built && !w.dark && !w.empty && w.res === r && (w.darkAt - s) > 2).reduce((a, w) => a + w.dep, 0);
    if (!done && (!liveLine('metal') || depLeft('metal') < 80) && newLine('metal')) done = tryB(newLine('metal').id);
    if (!done && (!liveLine('fuel') || depLeft('fuel') < 60) && newLine('fuel')) done = tryB(newLine('fuel').id);
    if (!done && room && s >= 3 && yards < 1) done = tryB(room, 'yard');
    if (!done && s >= 6 && liveLine('metal') < 2 && newLine('metal')) done = tryB(newLine('metal').id);
    if (!done && s >= 6 && liveLine('fuel') < 2 && newLine('fuel')) done = tryB(newLine('fuel').id);
    if (!done && room && s >= 8 && meds < 1) done = tryB(room, 'med');
    if (!done && room && s >= 10 && yards < 2) done = tryB(room, 'yard');
    // разборка в конце: жильё и выработанное идут на металл, пока верфь голодна
    if (!done && s >= 20 && g.metal < 60) { const sc = g.slots.filter((x) => x.type === 'house')[0] || g.slots.filter((x) => x.type === 'med')[0]; if (sc) done = !C.scrap(g, sc.id); }
    // руки: кольца снимаются бесплатно, миры — только если надо
    g.slots.forEach((x) => { if (x.hands) C.setHands(g, x.id, -99) });
    const add = (x, k) => C.setHands(g, x.id, k || 5);
    const fs = () => g.slots.filter((x) => x.type === 'farm' && x.hands < 20);
    let guard = 0;
    // рационы
    while (C.handsFree(g) > 0 && guard++ < 60) { const f = C.calc(g); const need = g.food > f.U.food * 1.5 ? -f.U.food * .25 : 2; if (f.net.food >= need) break; const t = fs()[0]; if (!t) break; if (add(t)) break; }
    // топливо: хватит ли запаса до конца с учётом холода
    guard = 0;
    let burn = 0; for (let t = s; t <= 24; t++) burn += 3 + .4 * t + (t >= 16 ? (t - 15) * 3.2 : 0); // запас до конца известен заранее: холод в расписании
    while (C.handsFree(g) > 0 && guard++ < 40) { const f = C.calc(g); const left = Math.max(1, 17 - s); if (s >= 16 ? f.net.fuel * (25 - s) + g.fuel > 5 : (g.fuel + f.net.fuel * left) > burn * .6) break; const w = g.worlds.filter((x) => x.res === 'fuel' && x.built && !x.dark && !x.empty && x.hands < 20 && s < x.darkAt - 1).sort((a, b) => b.rate - a.rate)[0]; if (!w) break; if (add(w)) break; }
    // медблок
    const med = g.slots.find((x) => x.type === 'med'); if (med && C.handsFree(g) >= 5) add(med);
    // верфь: сначала твёрдая доля рук, иначе ковчег не начнётся никогда
    guard = 0; const yShare = s < 5 ? 0 : s < 12 ? .2 : .32;
    while (C.handsFree(g) > 0 && guard++ < 30) { const yard = g.slots.filter((x) => x.type === 'yard' && x.hands < 20)[0]; const yh = g.slots.filter((x) => x.type === 'yard').reduce((a, x) => a + x.hands, 0); if (!yard || yh >= C.handsTotal(g) * yShare || g.metal < 25) break; if (add(yard)) break; }
    // верфь и металл поровну по нужде
    guard = 0;
    while (C.handsFree(g) > 0 && guard++ < 60) { const f = C.calc(g); const yard = g.slots.filter((x) => x.type === 'yard' && x.hands < 20)[0]; const demand = f.seatsMax * C.seatCost(g); const net = f.P.metal - (f.U.metal - f.seats * C.seatCost(g)) - demand; const mw = g.worlds.filter((x) => x.res === 'metal' && x.built && !x.dark && !x.empty && x.hands < 20 && s < x.darkAt - 1).sort((a, b) => b.rate - a.rate)[0];
      if (((net < 0 && g.metal < 90) || g.metal < 40 || !yard) && mw) { if (add(mw)) break; } else if (yard) { if (add(yard)) break; } else { const t = fs()[0]; if (!t || add(t)) break; } }
  }

  function board(g, st) {
    const B = g.board, get = (id) => B.groups.find((x) => x.id === id), put = (id, n) => { const gr = get(id); if (gr) C.setBoard(g, id, n === undefined ? gr.c : n) };
    const crewN = Math.ceil(B.seats * .12), mechN = Math.ceil(B.seats * .1);
    if (st === 'blindKind') { ['prom', 'kids', 'old', 'hate', 'rest', 'crew', 'mech'].forEach((i) => put(i)); }
    else if (st === 'blindHarsh') { ['crew', 'mech', 'rest', 'hate'].forEach((i) => put(i)); put('kids'); }
    else if (st === 'count') { put('crew', crewN); put('mech', mechN); put('kids'); put('crew'); put('mech'); put('rest'); put('prom'); put('old'); }
    else { put('prom'); put('crew', crewN); put('mech', mechN); put('kids'); put('old'); put('rest'); put('crew'); put('mech'); const h = get('hate'); if (h) { const on = B.groups.reduce((a, x) => a + x.on, 0); put('hate', Math.floor(on * .15)); } }
    C.launch(g);
  }

  window.BOT = {
    play(seed, st, headless, until) {
      const g = GAME.newGame(seed, headless);
      let hist = [];
      while (g.stage === 'shift' && !g.over) {
        if (until && g.s >= until) return g;
        if (st === 'idle') { C.endShift(g, true); continue; }
        pickCase(g, st); if (g.stage !== 'shift') break;
        signP(g, st); if (g.stage !== 'shift') break;
        manage(g, st);
        C.endShift(g, true);
      }
      if (until === 'berth') return g;
      if (g.stage === 'berth') { if (st === 'idle') C.launch(g); else board(g, st); if (g.stage === 'berth') { g.stage = 'result'; g.res = { win: false, souls: 0, names: C.liveNames(g), left: g.pop, title: 'нет мест', lines: [], q: '', year: 3600, lost: 0 } } }
      return { seed, st, over: g.over || 'end', s: g.s, pop: g.pop, seats: Math.floor(g.ark), home: g.board ? g.board.home : 0, souls: g.res ? g.res.souls : 0, names: g.res ? g.res.names : 0, win: !!(g.res && g.res.win), trust: Math.round(g.trust), ppl: g.pop, fear: Math.round(g.fear), hate: Math.round(g.hate), promise: Math.round(g.promise), dead: g.stats.dead };
    },
    step(st, g) { pickCase(g, st); signP(g, st); manage(g, st); C.endShift(g, true); },
    board,
  };
}

async function bots(browser) {
  const page = await (await browser.newContext()).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(FILE + '?auto=1&seed=1'); await page.evaluate(installBot);
  const table = {};
  for (const st of ['idle', 'count', 'names', 'mixed', 'blindHarsh', 'blindKind']) {
    const rows = [];
    for (const seed of SEEDS) rows.push(await page.evaluate(([s, t]) => BOT.play(s, t, true), [seed, st]));
    table[st] = rows;
    const avg = (k) => Math.round(rows.reduce((a, r) => a + r[k], 0) / rows.length);
    console.log(st.padEnd(11), 'побед', rows.filter((r) => r.win).length + '/8', 'душ', avg('souls'), 'имён', avg('names'), 'мест', avg('seats'), 'дома', avg('home'), 'дов', avg('trust'), 'страх', avg('fear'), 'отказ', avg('hate'), 'обещ', avg('promise'), 'мёртвых', avg('dead'), '| исходы', rows.map((r) => r.over === 'end' ? r.souls : r.over + '@' + r.s).join(' '));
  }
  // тексты: подстановки и запретные слова
  const txt = await page.evaluate(() => { const bad = []; for (let seed = 1; seed <= 40; seed++) { for (const st of ['count', 'names']) { const g = GAME.newGame(seed, true); while (g.stage === 'shift' && !g.over) { if (g.case) { const t = g.case.t + g.case.role + g.case.opts.map((o) => o.l).join(''); if (t.includes('{') || t.includes('undefined') || /Институт|страны|физик|стазис/i.test(t)) bad.push(t); } BOT.step(st, g); } } } return { bad, cases: GAME.CORE.CASES.length, protos: GAME.CORE.PROTOS.length } });
  console.log('дел', txt.cases, 'протоколов', txt.protos, 'битых текстов', txt.bad.length, txt.bad.slice(0, 3));
  if (errs.length) console.log('pageerror', errs);
  await page.context().close();
  return table;
}

async function visibleText(page) { return (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 200); }
const boxC = async (loc) => { const b = await loc.boundingBox(); if (!b) throw new Error('нет элемента'); return [b.x + b.width / 2, b.y + b.height / 2]; };

async function ui(browser) {
  const problems = [];
  for (const cfg of [{ tag: 'desk', vp: { width: 1440, height: 900 }, touch: false }, { tag: 'phone', vp: { width: 390, height: 844 }, touch: true }]) {
    const ctx = await browser.newContext({ viewport: cfg.vp, hasTouch: cfg.touch, isMobile: cfg.touch, deviceScaleFactor: cfg.touch ? 2 : 1 });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()) });
    const press = async (loc) => { await loc.scrollIntoViewIfNeeded(); const [x, y] = await boxC(loc); if (cfg.touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(40); };
    const shot = (n) => page.screenshot({ path: path.join(SHOTS, `frostpunk-${cfg.tag}-${n}.png`) });
    const hscroll = async (w) => { const o = await page.evaluate(() => { const L = document.getElementById('layer'); return { d: document.documentElement.scrollWidth, w: innerWidth, l: L.scrollWidth, lw: L.clientWidth, p: document.getElementById('panel').scrollWidth, pw: document.getElementById('panel').clientWidth } }); if (o.d > o.w || o.l > o.lw + 1 || o.p > o.pw + 1) problems.push(cfg.tag + ' гориз.прокрутка ' + w + ' ' + JSON.stringify(o)); };

    await page.goto(FILE + '?seed=44'); await page.waitForSelector('.lb-modal'); await shot('0help');
    await press(page.locator('.lb-modal .btn.pri'));
    // первое дело читаем и отвечаем
    await page.waitForSelector('.card .txt'); await page.waitForTimeout(60); await shot('1case');
    console.log(cfg.tag, 'дело:', (await page.locator('.card .txt').innerText()).slice(0, 120));
    await hscroll('дело');
    await press(page.locator('.opt').first()); await page.waitForSelector('#aftok');
    console.log(cfg.tag, 'после:', (await page.locator('.card .say').innerText()).replace(/\n/g, ' ').slice(0, 120));
    await press(page.locator('#aftok')); await page.waitForTimeout(80);
    // отказ: сейчас кнопка +, потом постройка на мире
    await shot('2field');
    const world = page.locator('#map [data-id^="w"]').nth(1); await press(world); await page.waitForTimeout(60);
    const panel1 = await page.locator('#panel').innerText(); console.log(cfg.tag, 'панель мира:', panel1.replace(/\s+/g, ' ').slice(0, 110));
    const buildBtn = page.locator('[data-build]'); if (await buildBtn.count()) { await press(buildBtn); await page.waitForTimeout(50); }
    const plus = page.locator('[data-h="5"]'); if (await plus.count() && await plus.isEnabled()) await press(plus);
    // пустой отсек
    await press(page.locator('#map [data-id="a2"]')); await page.waitForTimeout(40);
    const offB = await page.locator('.bo').first().innerText(); console.log(cfg.tag, 'отсек:', offB.replace(/\s+/g, ' ').slice(0, 80));
    await shot('3build');
    // книга
    await press(page.locator('#tabs [data-tab="book"]')); await page.waitForTimeout(40); await shot('4book');
    await press(page.locator('[data-p="n1"]')); await page.waitForSelector('.lb-modal .pd'); await page.waitForTimeout(40); await shot('5proto');
    await press(page.locator('.lb-modal .btn.warn')); await page.waitForTimeout(60);
    const signed = await page.evaluate(() => GAME.G.signed.join(',')); if (signed !== 'n1') problems.push(cfg.tag + ' протокол не подписан: ' + signed);
    await press(page.locator('#endbtn')); await page.waitForTimeout(100);
    const s2 = await page.evaluate(() => GAME.G.s); if (s2 !== 2) problems.push(cfg.tag + ' смена не сдана: ' + s2);
    // второе дело
    await page.waitForSelector('.opt'); await press(page.locator('.opt').last()); await press(page.locator('#aftok')); await page.waitForTimeout(60);
    await hscroll('2');

    // партия ботом: дальше через GAME с отрисовкой, снимки середины и холода
    await page.evaluate(installBot);
    await page.evaluate(() => { const g = GAME.G; while (g.s < 12 && g.stage === 'shift') BOT.step('count', g); g.notes = []; if (!g.answered) GAME.CORE.answer(g, 0); GAME.redraw() });
    await page.waitForTimeout(100); await shot('6mid'); await hscroll('середина');
    await press(page.locator('#tabs [data-tab="book"]')); await page.waitForTimeout(40); await shot('6midbook');
    await press(page.locator('#tabs [data-tab="room"]')); await page.waitForTimeout(40);
    await page.evaluate(() => { const g = GAME.G; while (g.s < 20 && g.stage === 'shift') BOT.step('count', g); GAME.redraw() });
    await page.waitForTimeout(120); await shot('7cold'); // дело или следствие поверх
    const noteOk = page.locator('#noteok'); let guard = 0; while (await noteOk.count() && guard++ < 6) { await press(noteOk); await page.waitForTimeout(40); }
    if (await page.locator('.opt').count()) { await shot('7case'); await press(page.locator('.opt').first()); await press(page.locator('#aftok')); await page.waitForTimeout(80); }
    await shot('7field');
    await page.evaluate(() => { const g = GAME.G; while (g.stage === 'shift') BOT.step('count', g); g.notes = []; GAME.redraw() });
    await page.waitForSelector('.berth'); await page.waitForTimeout(100); await shot('8berth'); await hscroll('причал');
    // на причале настоящими нажатиями
    const plusB = page.locator('.gr .ctl button:last-child').first(); if (await plusB.count()) await press(plusB);
    await page.waitForTimeout(40);
    await page.evaluate(() => { BOT.board; const g = GAME.G; const B = g.board; for (const gr of B.groups) { GAME.CORE.setBoard(g, gr.id, gr.c) } GAME.redraw() });
    await page.waitForTimeout(50); await shot('8berth2');
    await page.locator('#launchbtn').scrollIntoViewIfNeeded(); await page.waitForTimeout(40);
    await press(page.locator('#launchbtn')); await page.waitForSelector('.res'); await page.waitForTimeout(80); await shot('9result');
    console.log(cfg.tag, 'итог:', (await page.locator('.res').innerText()).replace(/\s+/g, ' ').slice(0, 300));
    await page.locator('#again').scrollIntoViewIfNeeded(); await press(page.locator('#again')); await page.waitForTimeout(80);
    const after = await page.evaluate(() => ({ s: GAME.G.s, stage: GAME.G.stage })); if (after.s !== 1 || after.stage !== 'shift') problems.push(cfg.tag + ' заново не сработало');
    if (!(await page.locator('.card .txt').count())) problems.push(cfg.tag + ' после заново нет дела');
    // малые зоны
    await press(page.locator('.opt').first()); await press(page.locator('#aftok')); await page.waitForTimeout(40);
    if (cfg.touch) { const small = await page.evaluate(() => [...document.querySelectorAll('#foot button,#tabs button,.al button')].filter((b) => b.getBoundingClientRect().height < 40).map((b) => b.textContent)); if (small.length) problems.push('мелкие кнопки: ' + small.join(',')); }
    // ветка ИМЕНА до причала: целые группы, настоящие нажатия, итог
    await page.evaluate(() => { GAME.newGame(55, false); const g = GAME.G; while (g.stage === 'shift') BOT.step('names', g); g.notes = []; GAME.redraw() });
    await page.waitForSelector('.berth'); await page.waitForTimeout(80); await shot('names-berth');
    for (const id of ['crew', 'kids', 'prom']) { const b = page.locator(`.tgl[data-g="${id}"]`); if (await b.count()) await press(b); await page.waitForTimeout(30); }
    await page.locator('.bsum').scrollIntoViewIfNeeded(); await page.waitForTimeout(40); await shot('names-berth2');
    console.log(cfg.tag, 'причал ИМЕНА:', (await page.locator('.bsum').innerText()).replace(/\s+/g, ' '), '|', (await page.locator('.loss').innerText()));
    await press(page.locator('#launchbtn')); await page.waitForSelector('.res'); await page.waitForTimeout(60); await shot('names-result');
    console.log(cfg.tag, 'итог ИМЕНА:', (await page.locator('.res').innerText()).replace(/\s+/g, ' ').slice(0, 420));
    if (errs.length) problems.push(cfg.tag + ' ' + errs.join(' | '));
    await ctx.close();
  }
  console.log(problems.length ? 'ПРОБЛЕМЫ:\n' + problems.join('\n') : 'интерфейс: без ошибок');
}

(async () => {
  const browser = await chromium.launch();
  if (mode === 'bots' || mode === 'all') await bots(browser);
  if (mode === 'ui' || mode === 'all') await ui(browser);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1) });
