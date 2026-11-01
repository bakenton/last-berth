// Проверка ftl: node design/fusions/test/ftl.js [bots] [ui]  (без аргументов — всё)
const { chromium } = require('E:/ClaudeCowork/last-berth/node_modules/playwright');
const path = require('path');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'ftl.html').replace(/\\/g, '/');
const SHOTS = path.join(__dirname, 'shots');
const SEEDS = [11, 23, 37, 41, 59, 67, 73, 89];
const want = process.argv.slice(2);
const doBots = !want.length || want.includes('bots'), doUI = !want.length || want.includes('ui');

// Боты работают только через window.GAME; видят те же цифры, что игрок.
const BOT = function (args) {
  const C = GAME.core;
  function dist(a, b) { if (a === b) return 0; const q = [[a, 0]], s = { [a]: 1 }; while (q.length) { const [x, d] = q.shift(); if (x === b) return d; C.NEI[x].forEach(n => { if (!s[n]) { s[n] = 1; q.push([n, d + 1]) } }) } return 9 }
  const tgt = c => c.path.length ? c.path[c.path.length - 1] : (c.to || c.room);
  function powerUp(G, want) {
    Object.keys(want).forEach(k => { const r = G.rooms[k]; const w = Math.min(want[k], r.hpMax); while (r.power > w) GAME.power(k, -1) });
    Object.keys(want).forEach(k => { const r = G.rooms[k]; const w = Math.min(want[k], r.hpMax); while (r.power < w && C.avail() > 0) { if (GAME.power(k, 1)) break } }) }
  function sensiblePower(G) { const need = Math.min(G.rooms.sleep.hpMax, Math.ceil(G.sleepers / 12)); const c = G.crisis; const cold = c && c.ext && c.type === 'cold'; const R = G.reactor - G.down;
    const w = { sleep: need, life: cold ? 2 : 1, eng: 2, scan: 0, farm: 0 }; let left = R - need - w.life - w.eng; const foodLow = G.rations < 12;
    if (left > 0 && foodLow) { w.farm = Math.min(2, left); left -= w.farm } if (left > 0) { w.scan = 1; left-- } if (left > 0) { const q = Math.min(2 - w.farm, left); w.farm += q; left -= q } if (left > 0) { w.eng = 3; left-- } if (left > 0) w.life = 2;
    if (left < 0) w.eng = Math.max(1, R - need - w.life);
    powerUp(G, w) }
  function react(G) {
    const haz = []; C.IDS.forEach(i => { const x = G.rooms[i]; if (x.fire > 0) haz.push({ id: i, p: x.fire + (i === 'sleep' ? 200 : i === 'hold' ? 40 : 0), f: 1 }); if (x.breach > 0) haz.push({ id: i, p: 70 + (i === 'sleep' ? 200 : 0) }) }); haz.sort((a, b) => b.p - a.p);
    const hot = id => G.rooms[id].fire > 0 || G.rooms[id].breach > 0;
    C.IDS.forEach(i => { const x = G.rooms[i]; if (x.vent && x.fire <= 0) GAME.vent(i, false) });
    haz.forEach(h => { if (G.crew.some(c => tgt(c) === h.id)) return; const free = G.crew.filter(c => c.hp > 25 && !hot(tgt(c)) && !(G.crisis && G.crisis.ext && c.skill === 'pilot' && tgt(c) === 'bridge')); free.sort((a, b) => dist(tgt(a), h.id) - dist(tgt(b), h.id)); if (free[0]) GAME.send(free[0].id, h.id); else if (h.f && h.id !== 'sleep' && G.rooms[h.id].fire > 45 && !G.crew.some(c => c.room === h.id || tgt(c) === h.id)) GAME.vent(h.id, true) });
    if (G.crisis && G.crisis.ext && !C.manned() && !G.crew.some(c => tgt(c) === 'bridge')) { const free = G.crew.filter(c => !hot(tgt(c))).sort((a, b) => (b.skill === 'pilot') - (a.skill === 'pilot') || dist(tgt(a), 'bridge') - dist(tgt(b), 'bridge')); if (free[0]) GAME.send(free[0].id, 'bridge') }
    repair(G);
    G.crew.filter(c => c.hp < 30 && !hot(tgt(c)) && tgt(c) !== 'sleep' && c.skill !== 'med').forEach(c => { if (G.crew.some(m => m.skill === 'med' && tgt(m) === 'sleep')) GAME.send(c.id, 'sleep') });
    if (G.crew.length < 4 && G.sleepers > 12) GAME.wake() }
  function repair(G) { const hot = id => G.rooms[id].fire > 0 || G.rooms[id].breach > 0; const dmg = id => { const y = G.rooms[id]; return y.hpMax > 0 && y.hp < y.hpMax };
    ['sleep', 'eng', 'bridge', 'life', 'farm', 'scan'].forEach(i => { const x = G.rooms[i]; if (Math.floor(x.hp + .001) >= x.hpMax || G.crew.some(c => tgt(c) === i)) return; const free = G.crew.filter(c => !hot(tgt(c)) && !dmg(tgt(c)) && !(G.crisis && G.crisis.ext && tgt(c) === 'bridge')); free.sort((a, b) => (b.skill === 'eng') - (a.skill === 'eng') || dist(tgt(a), i) - dist(tgt(b), i)); if (free[0]) GAME.send(free[0].id, i) }) }
  function js(G) { return C.margin() / C.nightStep() }
  function score(G, o, st) { const d = o.d, J = js(G); if (C.afford(d)) return -1e9; let s = 0; const free = Math.max(0, C.beds() - G.sleepers); const ppl = (d.people || 0) + (d.awake || 0);
    if (st === 'runner' && ppl) return -100; if (st === 'greedy') s += ppl * 100; else { const awake = Math.max(0, ppl - (d.people ? free : 0)); s += (ppl - awake) * 2.2 + awake * (G.rations > G.awake * 2 + 10 ? .8 : -.5) }
    s += (d.fuel || 0) * (G.fuel < 4 ? 5 : 2) + (d.metal || 0) * 1.3 + (d.rations || 0) * (G.rations < 10 ? 1.2 : .5) + (d.hull || 0) * .6 + (d.crew ? 7 : 0) + (d.reactor ? 14 : 0) + (d.reveal ? 1 : 0) + (d.sleepers || 0) * 2.2 + (d.crewHp || 0) * .15;
    if (st !== 'greedy') { s -= (d.front || 0) * (J < 2 ? 22 : J < 3 ? 10 : 5); if (o.risk) s -= o.risk.p * 9 } return s }
  function pick(G, st) { const a = G.event.opts; let b = 0, bs = -1e9; a.forEach((o, i) => { const q = score(G, o, st); if (q > bs) { bs = q; b = i } }); return b }
  function shop(G) { const tryB = id => GAME.buy(id) === null; let go = true, n = 0; while (go && n++ < 12) { go = false; if (G.fuel < 5 && tryB('fuel')) go = true; else if (G.hull < 16 && tryB('hull')) go = true; else if (C.IDS.some(i => G.rooms[i].hp < G.rooms[i].hpMax) && tryB('fix')) go = true; else if (G.rations < 8 && tryB('rations')) go = true; else if (G.sleepers > C.beds() - 8 && tryB('pods')) go = true; else if (tryB('reactor')) go = true; else if (G.hull < 22 && tryB('hull')) go = true; else if (G.fuel < 8 && tryB('fuel')) go = true } GAME.leaveShop() }
  function nodeScore(G, n, st) { const cur = C.here(), vis = C.visible(), J = js(G), fw = n.col - cur.col; if (C.canReach(n.id)) return -1e9; let s = fw * 3; const t = vis[n.id] ? n.type : '?';
    if (st === 'runner') return fw * 10 + (t === 'storm' ? -2 : 0) + (t === 'yard' && G.metal >= 4 ? 2 : 0) + (t === 'dead' && G.fuel < 4 ? 2 : 0);
    if (st === 'greedy') { if (t === 'colony' && !n.seen) s += 50; if (t === 'convoy' && !n.seen) s += 40; if (n.seen) s -= 6; return s + (fw < 0 ? -3 : 0) }
    if (n.seen) s -= 8; if (fw < 0) s -= 6; if (fw === 0 && J < 3.2) s -= 8;
    if (t === 'colony') s += J > 2 ? 4 : 2; if (t === 'dead') s += G.fuel < 5 ? 4 : 1.5; if (t === 'yard') s += G.metal >= 3 ? (G.hull < 18 ? 5 : 3) : 0; if (t === 'convoy') s += 1.5; if (t === 'storm') s -= 3; if (t === 'beacon') s += .5; return s }
  function playOne(style, seed, limit) {
    GAME.restart(seed); const G = GAME.state; G.paused = false; let think = 0, react_t = 0, decisions = 0;
    while (G.mode !== 'over' && G.t < limit) {
      if (style === 'idle') { GAME.step(.1); G.fx.length = 0; continue }
      if (G.mode === 'event') { decisions++; if (style === 'passive') { let i = G.event.opts.length - 1; while (i > 0 && C.afford(G.event.opts[i].d)) i--; GAME.choose(i) } else GAME.choose(pick(G, style)); G.fx.length = 0; think = args.think; continue }
      if (G.mode === 'shop') { decisions++; if (style !== 'passive') shop(G); GAME.leaveShop(); think = args.think; continue }
      if (G.mode === 'crisis') { react_t -= .1; if (style !== 'passive' && react_t <= 0) { react_t = args.reaction; sensiblePower(G); react(G) } GAME.step(.1); G.fx.length = 0; continue }
      if (style !== 'passive') { if (react_t <= 0) { react_t = args.reaction; sensiblePower(G); react(G) } react_t -= .1 }
      think -= .1;
      const anyDamage = style === 'sensible' && ['eng', 'sleep', 'bridge', 'life'].some(i => { const x = G.rooms[i]; return x.hp < x.hpMax - .9 });
      if (think <= 0 && !(anyDamage && js(G) > 2)) {
        if (G.fuel < 1) { if (GAME.emergency('metal') && GAME.emergency('mass')) { GAME.step(.1); continue } }
        const nb = C.here().to.map(i => G.map.nodes[i]); nb.sort((a, b) => nodeScore(G, b, style) - nodeScore(G, a, style));
        if (style === 'passive') nb.sort((a, b) => b.col - a.col);
        for (const n of nb) { if (!GAME.jump(n.id)) { break } }
        think = args.think; if (G.mode !== 'map') continue
      }
      GAME.step(.1); G.fx.length = 0
    }
    const r = G.result || { why: 'limit', win: false, souls: 0, onboard: C.souls() };
    return { style, seed, win: r.win, souls: r.souls, why: r.why, onboard: r.onboard, t: Math.round(G.t), jumps: G.stats.jumps, crises: G.stats.crises, crew: G.crew.length, lostCrew: G.lostCrew.length, picked: G.stats.picked, decisions, sector: G.sector, hull: Math.round(G.hull), fuel: Math.floor(G.fuel), rations: Math.floor(G.rations), shadow: Math.round(G.stats.shadow), minJ: +G.stats.minJ.toFixed(1), sleepers: G.sleepers, awake: G.awake, loss: JSON.stringify(G.stats.loss,(k,v)=>typeof v==='number'?Math.round(v):v) } }
  if (args.finish) return playOne(args.style, args.seed, args.limit);
  return args.seeds.map(s => playOne(args.style, s, args.limit)) };

(async () => {
  const b = await chromium.launch(); let fails = 0;
  const errs = [];
  function watch(p, tag) { p.on('pageerror', e => { errs.push(tag + ': ' + e.message) }); p.on('console', m => { if (m.type() === 'error') errs.push(tag + ': ' + m.text()) }) }
  const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fails++ };

  if (doBots) {
    const p = await b.newPage(); watch(p, 'bots'); await p.goto(FILE + '?auto=1&seed=1');
    const table = {}; const styles = ['idle', 'passive', 'runner', 'sensible', 'greedy', 'slow', 'slow6'];
    for (const st of styles) table[st] = await p.evaluate(BOT, { style: st.startsWith('slow') ? 'sensible' : st, seeds: SEEDS, limit: 3000, think: st.startsWith('slow') ? 12 : 8, reaction: st === 'slow' ? 3 : st === 'slow6' ? 6 : 1.0 });
    console.log('бот       ' + SEEDS.map(s => String(s).padStart(5)).join('') + '   побед  ср.душ   мин  кризисов  экипаж-  (N ночь, H корпус, E пусто, L лимит)');
    for (const st of styles) { const r = table[st]; const w = r.filter(x => x.win).length, av = r.reduce((a, x) => a + x.souls, 0) / r.length, tm = r.reduce((a, x) => a + x.t + x.decisions * 6, 0) / r.length / 60, cr = r.reduce((a, x) => a + x.crises, 0) / r.length, lc = r.reduce((a, x) => a + x.lostCrew, 0) / r.length;
      console.log(st.padEnd(10) + r.map(x => String(x.win ? x.souls : ({ night: 'N', hull: 'H', empty: 'E', limit: 'L' }[x.why])).padStart(5)).join('') + '   ' + (w + '/8').padEnd(6) + ' ' + av.toFixed(1).padStart(6) + ' ' + tm.toFixed(1).padStart(5) + ' ' + cr.toFixed(1).padStart(8) + ' ' + lc.toFixed(1).padStart(8)) }
    for (const st of ['sensible', 'slow', 'slow6', 'runner']) { const L = {}; table[st].forEach(x => { const o = JSON.parse(x.loss); for (const k in o) L[k] = (L[k] || 0) + o[k] / 8 }); const pk = table[st].reduce((a, x) => a + x.picked, 0) / 8; console.log('потери ' + st + ': взято ' + pk.toFixed(0) + ' · ' + Object.keys(L).map(k => k + ' ' + L[k].toFixed(0)).join(' · ') + ' · экипажа ' + (table[st].reduce((a, x) => a + x.lostCrew, 0) / 8).toFixed(1) + ' · minJ ' + (table[st].reduce((a, x) => a + x.minJ, 0) / 8).toFixed(1)) }
    const win = st => table[st].filter(x => x.win).length, avg = st => table[st].reduce((a, x) => a + x.souls, 0) / 8;
    check(win('idle') === 0, 'бездействие проигрывает');
    check(win('passive') === 0 || avg('passive') < avg('sensible') * .3, 'без реакции на кризисы — ничтожный счёт');
    check(win('sensible') >= 4, 'разумный побеждает хотя бы на половине сидов');
    check(avg('greedy') < avg('sensible'), 'жадный хуже разумного');
    check(avg('runner') < avg('sensible'), 'беглец хуже разумного');
    const uns = await p.evaluate(() => { GAME.restart(5); const G = GAME.state; G.paused = false; G.crew.forEach(c => { if (c.room === 'sleep') c.room = 'bridge' }); G.rooms.sleep.breach = 100; G.mode = 'crisis'; G.crisis = { type: 'breach', name: 'x', t: 0, ext: false, charge: 0, need: 100, next: 9, strikes: [], frost: 9, before: 25, shocks: 0, nextShock: 9 }; const s0 = G.sleepers; let o20 = 0, s20 = 0; for (let i = 0; i < 400; i++) { GAME.step(.1); if (i === 199) { o20 = G.rooms.sleep.o2; s20 = s0 - G.sleepers } } return { o20: Math.round(o20), s20, s40: s0 - G.sleepers } });
    check(uns.s40 >= 5, 'пробоина в спальном блоке без людей: воздух ' + uns.o20 + '% через 20 с, погибло ' + uns.s20 + ' за 20 с, ' + uns.s40 + ' за 40 с');
    if (process.env.DETAIL) for (const st of process.env.DETAIL.split(',')) table[st].forEach(x => console.log(JSON.stringify(x)));
    await p.close()
  }

  if (doUI) {
    // === компьютер, настоящая мышь
    { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); watch(p, 'desk');
      await p.goto(FILE + '?seed=7'); await p.waitForSelector('.lb-modal'); await p.screenshot({ path: SHOTS + '/ftl-desk-1-help.png' });
      const help = await p.innerText('.lb-modal'); check(/Ночь/.test(help) && /Шлюз/.test(help), 'окно ? открыто при входе');
      await p.click('.lb-modal .btn.pri'); await p.waitForTimeout(300);
      const nb = await p.evaluate(() => { const G = GAME.state; return GAME.core.here().to.filter(i => G.map.nodes[i].col > 0)[0] }); let xy = await p.evaluate(i => GAME.ui.nodeXY(i), nb);
      await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(150); let info = await p.innerText('#info'); check(/топливо/.test(info), 'выбор узла показывает цену: ' + info.replace(/\n/g, ' / '));
      await p.screenshot({ path: SHOTS + '/ftl-desk-2-map.png' });
      const f0 = await p.evaluate(() => GAME.state.fuel); await p.click('#act'); await p.waitForTimeout(250); check(await p.evaluate(() => GAME.state.fuel) === f0 - 1, 'прыжок мышью тратит топливо');
      if (await p.$('.lb-modal.ev')) { await p.screenshot({ path: SHOTS + '/ftl-desk-3-event.png' }); const tx = await p.innerText('.lb-modal.ev'); check(tx.length > 20, 'событие: ' + tx.slice(0, 70).replace(/\n/g, ' ')); await p.click('.lb-modal.ev .row .btn:not([disabled])'); await p.waitForTimeout(200) }
      await p.evaluate(() => { document.querySelectorAll('.lb-veil').forEach(e => e.remove()); const G = GAME.state; G.mode = 'map'; G.event = null; G.crisis = null; GAME.crisis('fire') }); await p.waitForTimeout(250);
      check(await p.evaluate(() => GAME.state.paused) === true, 'первый кризис ставит паузу');
      await p.screenshot({ path: SHOTS + '/ftl-desk-4-crisis.png' });
      const fire = await p.evaluate(() => GAME.core.IDS.filter(i => GAME.state.rooms[i].fire > 0)[0]);
      const cid = await p.evaluate(f => GAME.state.crew.filter(c => c.room !== f)[0].id, fire);
      await p.click(`.ch[data-id="${cid}"]`); xy = await p.evaluate(i => GAME.ui.roomXY(i), fire); await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(80);
      check(await p.evaluate(([c, f]) => { const x = GAME.state.crew.find(q => q.id === c); return x.path[x.path.length - 1] === f || x.to === f }, [cid, fire]), 'мышь: человек послан в горящий отсек');
      await p.click('#pause'); await p.waitForTimeout(3500); await p.screenshot({ path: SHOTS + '/ftl-desk-5-working.png' });
      const other = await p.evaluate(f => GAME.core.IDS.filter(i => i !== f && i !== 'sleep' && !GAME.state.crew.some(c => c.room === i || c.to === i))[0], fire); xy = await p.evaluate(i => GAME.ui.roomXY(i), other); await p.mouse.click(xy.x, xy.y); await p.waitForTimeout(100); const lab = await p.innerText('#act'); check(/ШЛЮЗ/.test(lab), 'отсек: кнопка шлюза: ' + lab); await p.click('#act'); await p.waitForTimeout(700); check(await p.evaluate(i => GAME.state.rooms[i].vent, other), 'шлюз открыт мышью'); const o2 = await p.evaluate(i => GAME.state.rooms[i].o2, other); check(o2 < 90, 'вакуум вытягивает воздух: ' + Math.round(o2)); await p.screenshot({ path: SHOTS + '/ftl-desk-6-vent.png' }); await p.click('#act');
      await p.mouse.click(5, 500); // снять выбор
      // шлюз с человеком внутри: смерть, имя, голос
      { const v = await p.evaluate(() => { const G = GAME.state; const c = G.crew.find(x => !x.to && !x.path.length && G.rooms[x.room].fire <= 0 && x.room !== 'sleep'); return { id: c.id, name: c.name, room: c.room } }); const r = await p.evaluate(i => GAME.ui.roomXY(i), v.room); await p.mouse.click(r.x, r.y); await p.waitForTimeout(80); await p.click('#act'); await p.waitForTimeout(5000); const dead = await p.evaluate(n => GAME.state.lostCrew.some(c => c.name === n), v.name); const said = await p.locator('#lb-voice').innerText().catch(() => ''); check(dead && said.includes(v.name), 'шлюз убил человека, голос назвал имя: ' + said.split(String.fromCharCode(10)).join(' ')); await p.screenshot({ path: SHOTS + '/ftl-desk-8-death.png' }); await p.evaluate(i => GAME.vent(i, false), v.room); await p.mouse.click(5, 500) }
      const drag = await p.evaluate(() => { const c = GAME.state.crew[0]; return { id: c.id, x: c._x, y: c._y } }); const box = await p.locator('#ship').boundingBox(); const to = await p.evaluate(() => GAME.ui.roomXY('farm'));
      await p.mouse.move(box.x + drag.x, box.y + drag.y); await p.mouse.down(); await p.mouse.move(to.x, to.y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(80); check(await p.evaluate(id => { const c = GAME.state.crew.find(q => q.id === id); return c.path[c.path.length - 1] === 'farm' || c.to === 'farm' || c.room === 'farm' }, drag.id), 'перетаскивание: человек послан');
      await p.evaluate(BOT, { finish: 1, style: 'sensible', seed: 11, limit: 3000, think: 5, reaction: 1, seeds: [] }); await p.waitForSelector('#end', { timeout: 4000 }); await p.waitForTimeout(150); await p.screenshot({ path: SHOTS + '/ftl-desk-9-end.png' }); const et = await p.innerText('#end'); check(/ДУШ НА БОРТУ/.test(et), 'экран итога: ' + et.split('\n').slice(0, 3).join(' / '));
      await p.click('#again'); await p.waitForTimeout(250); check(await p.evaluate(() => GAME.state.t < 2 && !document.querySelector('#end')), 'кнопка Заново работает');
      await p.evaluate(() => { const G = GAME.state; G.paused = false; for (let i = 0; i < 2; i++) { G.mode = 'event'; G.event = { kick: '', world: '', text: '', opts: [{ t: '', d: { sector: 1 }, say: '' }] }; GAME.choose(0) } GAME.core.send(G.crew[0].id, 'bridge'); GAME.crisis('storm') }); await p.waitForTimeout(6500); await p.screenshot({ path: SHOTS + '/ftl-desk-7-storm.png' });
      await ctx.close() }

    // === телефон, настоящее касание
    { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await ctx.newPage(); watch(p, 'phone');
      const tap = async (x, y) => { await p.touchscreen.tap(x, y); await p.waitForTimeout(120) }; const tapSel = async s => { await p.locator(s).first().scrollIntoViewIfNeeded(); const q = await p.locator(s).first().boundingBox(); await tap(q.x + q.width / 2, q.y + q.height / 2) };
      await p.goto(FILE + '?seed=7'); await p.waitForSelector('.lb-modal'); await p.screenshot({ path: SHOTS + '/ftl-phone-1-help.png' }); await tapSel('.lb-modal .btn.pri'); await p.waitForTimeout(300);
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'телефон: нет горизонтальной прокрутки');
      await p.screenshot({ path: SHOTS + '/ftl-phone-2-map.png' });
      const nb = await p.evaluate(() => { const G = GAME.state; return GAME.core.here().to.filter(i => G.map.nodes[i].col > 0)[0] }); let xy = await p.evaluate(i => GAME.ui.nodeXY(i), nb); await tap(xy.x, xy.y); const info = await p.innerText('#info'); check(/топливо/.test(info), 'касание узла: ' + info.replace(/\n/g, ' / '));
      const f0 = await p.evaluate(() => GAME.state.fuel); await tapSel('#act'); await p.waitForTimeout(200); check(await p.evaluate(() => GAME.state.fuel) === f0 - 1, 'прыжок касанием');
      if (await p.$('.lb-modal.ev')) { await p.screenshot({ path: SHOTS + '/ftl-phone-3-event.png' }); await tapSel('.lb-modal.ev .row .btn:not([disabled])'); await p.waitForTimeout(200) }
      await p.evaluate(() => { document.querySelectorAll('.lb-veil').forEach(e => e.remove()); const G = GAME.state; G.mode = 'map'; G.event = null; G.crisis = null; GAME.crisis('fire') }); await p.waitForTimeout(300); await p.screenshot({ path: SHOTS + '/ftl-phone-4-crisis.png' });
      const fire = await p.evaluate(() => GAME.core.IDS.filter(i => GAME.state.rooms[i].fire > 0)[0]); const cid = await p.evaluate(f => GAME.state.crew.filter(c => c.room !== f)[0].id, fire);
      await tapSel(`.ch[data-id="${cid}"]`); xy = await p.evaluate(i => GAME.ui.roomXY(i), fire); await tap(xy.x, xy.y); check(await p.evaluate(([c, f]) => { const x = GAME.state.crew.find(q => q.id === c); return x.path[x.path.length - 1] === f || x.to === f }, [cid, fire]), 'касание: человек послан в огонь');
      const pow0 = await p.evaluate(() => GAME.state.rooms.scan.power); await tapSel('[data-s="scan"] [data-d="-1"]'); check(await p.evaluate(() => GAME.state.rooms.scan.power) === pow0 - 1, 'касание: энергия снята');
      const small = await p.evaluate(() => [...document.querySelectorAll('#pow button,#crew .ch,#pause,#act,#alarmB')].filter(e => e.offsetParent && (e.getBoundingClientRect().height < 40 || e.getBoundingClientRect().width < 38)).map(e => e.id || e.className)); check(small.length === 0, 'зоны нажатия в норме: ' + small.join(','));
      await tapSel('#pause'); await p.waitForTimeout(2500); await p.screenshot({ path: SHOTS + '/ftl-phone-5-working.png' });
      { const snap = () => p.evaluate(() => JSON.stringify([GAME.state.crew.map(c => c.path.join() + c.to), GAME.core.IDS.map(i => GAME.state.rooms[i].power)])); const lab = await p.$('#alarm.on #alarmB:visible') ? await p.innerText('#alarmB') : ''; if (lab) { const a = await snap(); await tapSel('#alarmB'); const z = await snap(); check(a !== z, 'кнопка тревоги действует: ' + lab) } }
      // настоящее перетаскивание пальцем (CDP)
      { const cdp = await ctx.newCDPSession(p); const sb = await p.locator('#ship').boundingBox(); const c0 = await p.evaluate(() => { const c = GAME.state.crew.find(q => !q.to && !q.path.length && q.room !== 'bridge'); return { id: c.id, x: c._x, y: c._y } }); const toR = await p.evaluate(() => GAME.ui.roomXY('bridge')); const P = (x, y) => [{ x: sb.x + x, y: sb.y + y }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: P(c0.x, c0.y) }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: (sb.x + c0.x + toR.x) / 2, y: (sb.y + c0.y + toR.y) / 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: toR.x, y: toR.y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(100);
        check(await p.evaluate(id => { const c = GAME.state.crew.find(q => q.id === id); return c && (c.path[c.path.length - 1] === 'bridge' || c.to === 'bridge') }, c0.id), 'палец: человек перетащен на мостик') }
      const al = await p.$('#alarm.on'); if (al) console.log('     тревога: ' + (await p.innerText('#alarm')).replace(/\n/g, ' | '));
      await p.evaluate(BOT, { finish: 1, style: 'sensible', seed: 23, limit: 3000, think: 5, reaction: 1, seeds: [] }); await p.waitForSelector('#end', { timeout: 4000 }); await p.waitForTimeout(150); await p.screenshot({ path: SHOTS + '/ftl-phone-9-end.png' }); await tapSel('#again'); await p.waitForTimeout(350); check(await p.evaluate(() => !document.querySelector('#end') && GAME.state.t < 2), 'телефон: Заново работает');
      await p.evaluate(() => { const G = GAME.state; G.paused = false; G.mode = 'event'; G.event = { kick: '', world: '', text: '', opts: [{ t: '', d: { sector: 1 }, say: '' }] }; GAME.choose(0); GAME.crisis('storm') }); await p.waitForTimeout(7000); await p.screenshot({ path: SHOTS + '/ftl-phone-7-storm.png' });
      await p.setViewportSize({ width: 360, height: 620 }); await p.waitForTimeout(400); await p.screenshot({ path: SHOTS + '/ftl-phone-8-short.png' });
      await ctx.close() }
  }
  await b.close();
  if (errs.length) { console.log('ОШИБКИ БРАУЗЕРА:\n' + [...new Set(errs)].join('\n')); fails++ }
  console.log(fails ? 'ПРОВАЛОВ: ' + fails : 'ВСЁ ЗЕЛЁНОЕ'); process.exit(fails ? 1 : 0)
})();
