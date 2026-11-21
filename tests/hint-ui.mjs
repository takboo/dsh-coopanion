import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { zipSync, strToU8 } from 'fflate';
import { chromium } from 'playwright-core';
import { previewServer } from '../scripts/preview.mjs';
import { recordBodyOrders } from './helpers/body-orders.mjs';
import { controlCompanionClock, advanceCompanion } from './helpers/companionship.mjs';
import { controlNpc, npcTick, npcUntil } from './helpers/npc-life.mjs';
const require = createRequire(import.meta.url);
const { CharacterStore } = require('../dist/character-store.cjs');
const { CompanionStore } = require('../dist/companion-store.cjs');
const { createPetServer } = require('../dist/figure-server.cjs');

const directory = await mkdtemp(join(tmpdir(), 'dsh-hint-ui-'));
const server = previewServer({ dataDir: directory });
server.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;

const runtime = (generation, overrides = {}) => ({
  protocol: 1,
  runtime: { phase: 'running', visible: true, generation, visibilityRevision: 4, suspended: false, ...overrides },
  interactions: [],
});
const hidden = generation => runtime(generation, { visible: false });

const box = (page, selector) => page.locator(selector).evaluate(element => {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return {
    left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
    width: rect.width, height: rect.height,
    clientWidth: element.clientWidth, clientHeight: element.clientHeight,
    scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
    lineHeight: parseFloat(style.lineHeight) || 0,
  };
});

const assertInside = (value, viewport, label) => {
  assert.ok(value.left >= -0.5, `${label}: left edge ${value.left}`);
  assert.ok(value.top >= -0.5, `${label}: top edge ${value.top}`);
  assert.ok(value.right <= viewport.width + 0.5, `${label}: right edge ${value.right} exceeds ${viewport.width}`);
  assert.ok(value.bottom <= viewport.height + 0.5, `${label}: bottom edge ${value.bottom} exceeds ${viewport.height}`);
};

const assertTextFits = (value, label) => {
  assert.ok(value.scrollWidth <= value.clientWidth + 1, `${label}: horizontal overflow ${value.scrollWidth} > ${value.clientWidth}`);
  assert.ok(value.lineHeight > 0, `${label}: line height is not resolved`);
  assert.ok(value.clientHeight + 1 >= value.lineHeight, `${label}: text is clipped above one line (${value.clientHeight} < ${value.lineHeight})`);
  assert.ok(
    value.clientHeight + 1.5 >= Math.min(value.lineHeight * 2, value.scrollHeight),
    `${label}: text is clipped through a line (${value.clientHeight} of ${value.scrollHeight} with line height ${value.lineHeight})`,
  );
};

try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
    headless: true,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.hintActions = [];
    window.dshPetBridge = {
      subscribe(fn) { window.n2Receive = fn; },
      action(action) { window.hintActions.push(action); },
      hit() {},
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForSelector('#pet[data-character=whale][data-mode]');
  const receive = message => page.evaluate(message => window.n2Receive(message), message);
  const actions = () => page.evaluate(() => window.hintActions);
  await receive({
    type: 'init',
    options: { locale: 'zh-CN', reminders: true, notifications: true, bubbleDurationMs: 60000 },
    snapshot: { mood: 'idle', sessionId: 'hint-target', sessions: [{ id: 'hint-target', label: 'Hint target', mood: 'idle', chatAvailable: true }], results: [] },
  });
  await receive({ type: 'notification-state', snapshot: runtime(7) });

  const hint = (title, body, sessionId = 'hint-target') => ({ type: 'notice', notice: { title, body, sessionId, kind: 'message' }, generation: 7 });
  const show = async (title, body, sessionId) => {
    await receive(hint(title, body, sessionId));
    await page.locator('#toast:not([hidden])').waitFor();
  };
  const withdraw = async () => {
    await receive({ type: 'notification-state', snapshot: hidden(7) });
    await page.waitForFunction(() => document.getElementById('toast').hidden);
    await receive({ type: 'notification-state', snapshot: runtime(7) });
  };

  // A real hint payload renders and its click carries the exact session identity.
  await show('电话接通了', '挂件正在听你说话', 'hint-source  exact');
  assert.equal(await page.locator('#toast-title').innerText(), '电话接通了');
  assert.equal(await page.locator('#toast-body').innerText(), '挂件正在听你说话');
  await page.locator('#toast').click();
  await page.waitForFunction(() => window.hintActions.some(action => action.type === 'open-session'));
  assert.deepEqual((await actions()).find(action => action.type === 'open-session'), { type: 'open-session', sessionId: 'hint-source  exact' });
  assert.equal(await page.locator('#toast').isVisible(), false, 'clicking a hint dismisses it');

  // Losing the runtime withdraws the hint and showing again does not replay it.
  await show('可见性测试', '窗口隐藏后应当撤下。');
  await receive({ type: 'notification-state', snapshot: hidden(7) });
  await page.waitForFunction(() => document.getElementById('toast').hidden);
  await receive({ type: 'notification-state', snapshot: runtime(7) });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#toast').isVisible(), false, 'restoring visibility does not replay a withdrawn hint');

  // Lock/suspend is a separate runtime failure from plain hiding.
  await show('锁屏测试', '锁屏或休眠后也应撤下。');
  await receive({ type: 'notification-state', snapshot: runtime(7, { suspended: true }) });
  await page.waitForFunction(() => document.getElementById('toast').hidden);
  await receive({ type: 'notification-state', snapshot: runtime(7) });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#toast').isVisible(), false, 'unlocking does not replay a withdrawn hint');

  // A newer generation invalidates the old toast; a stale snapshot does not.
  await show('代次测试', '新一代拉起时清掉旧提示。');
  await receive({ type: 'notification-state', snapshot: runtime(8) });
  await page.waitForFunction(() => document.getElementById('toast').hidden);
  await show('旧代次测试', '旧快照不能误撤新提示。');
  await receive({ type: 'notification-state', snapshot: runtime(6) });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#toast').isVisible(), true, 'a stale generation snapshot cannot withdraw a newer hint');
  await receive({ type: 'notification-state', snapshot: runtime(7) });
  await withdraw();

  // A hint without a forwarded generation still follows the current runtime.
  await receive({ type: 'notice', notice: { title: '无代次提示', body: '普通 toast 也必须受运行时门控。', sessionId: 'hint-target', kind: 'message' } });
  await page.locator('#toast:not([hidden])').waitFor();
  await receive({ type: 'notification-state', snapshot: hidden(7) });
  await page.waitForFunction(() => document.getElementById('toast').hidden);
  await receive({ type: 'notification-state', snapshot: runtime(7) });

  // A recovered window accepts a new hint (the inverse of "do not replay").
  await show('恢复后的新提示', '恢复显示后新的提示仍然要出现。');
  await withdraw();

  // Reduced motion skips host-triggered perform actions.
  const reducedBody = await recordBodyOrders(page);
  await reducedBody.evaluate(() => { window.bodyOrders = []; });
  await receive({ type: 'perform', word: 'nod', generation: 7 });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  assert.deepEqual(await reducedBody.evaluate(() => window.bodyOrders.filter(o => o.t === 'do').map(o => o.word)), []);

  // Legitimate maximum payloads must stay inside the viewport at every text scale.
  const payloads = [
    ['latin', 'T'.repeat(256), 'B'.repeat(2048)],
    ['url', 'U'.repeat(256), `https://example.com/${'a'.repeat(1900)}`],
    ['chinese', '中文标题'.repeat(64), '这是正文。'.repeat(400)],
  ];
  for (const viewport of [{ width: 1200, height: 800 }, { width: 320, height: 640 }]) {
    await page.setViewportSize(viewport);
    for (const scale of [1, 1.25, 1.5]) {
      await receive({ type: 'configure', options: { textScale: scale, locale: 'zh-CN' } });
      await page.waitForFunction(expected => getComputedStyle(document.documentElement).getPropertyValue('--text-scale').trim() === String(expected), scale);
      for (const [name, title, body] of payloads) {
        await show(title, body);
        const label = `${name}@${viewport.width}x${viewport.height}/${scale}`;
        const toast = await box(page, '#toast');
        const titleBox = await box(page, '#toast-title');
        const bodyBox = await box(page, '#toast-body');
        assertInside(toast, viewport, `${label} toast`);
        assertInside(titleBox, viewport, `${label} title`);
        assertInside(bodyBox, viewport, `${label} body`);
        assertTextFits(titleBox, `${label} title`);
        assertTextFits(bodyBox, `${label} body`);
        assert.ok(toast.scrollHeight <= toast.clientHeight + 1, `${label}: toast scrolls vertically (${toast.scrollHeight} > ${toast.clientHeight})`);
        await withdraw();
      }
    }
  }
  assert.deepEqual(errors, []);
  await page.close();
  await verifyPerform(browser, server.address().port);
  await verifyPerformCompanionAndCustom(browser);
  console.log('hint-ui: native hint, perform and layout constraints verified');
} finally {
  if (browser) await browser.close();
  server.close();
  await rm(directory, { recursive: true, force: true });
}

async function verifyPerform(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, reducedMotion: 'no-preference' });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.addInitScript(() => {
      window.performLayouts = [];
      addEventListener('message', event => {
        if (event.data?.t === 'frame' && event.data.layout) window.lastPerformLayout = event.data.layout;
      });
      window.dshPetBridge = { subscribe(fn) { window.receive = fn; }, action() {}, hit() {} };
    });
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForSelector('#pet[data-character=whale][data-mode=idle]');
    const receive = message => page.evaluate(message => window.receive(message), message);
    const body = await recordBodyOrders(page);
    const doWords = () => body.evaluate(() => window.bodyOrders.filter(o => o.t === 'do').map(o => o.word));
    const clearOrders = () => body.evaluate(() => { window.bodyOrders = []; });
    const waitFrames = (n = 3) => page.evaluate(count => new Promise(resolve => {
      const step = left => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
      step(count);
    }), n);
    const waitIdle = async () => {
      await page.waitForFunction(() => window.lastPerformLayout?.mode === 'idle' && !window.lastPerformLayout.moving && !window.lastPerformLayout.busy);
      await waitFrames(3);
    };

    await receive({
      type: 'init',
      options: { locale: 'zh-CN', reminders: true, notifications: false, companionship: 'off', roam: false, bubbleDurationMs: 60000 },
      snapshot: { mood: 'idle', sessionId: 'perform-target', sessions: [{ id: 'perform-target', label: 'Perform target', mood: 'idle', chatAvailable: true }], results: [] },
    });
    await receive({ type: 'notification-state', snapshot: runtime(7) });
    await waitIdle();

    // Notifications off does not block perform; pure presentation leaves UI/mood untouched.
    await clearOrders();
    await receive({ type: 'perform', word: 'nod', generation: 7 });
    await waitFrames(2);
    assert.deepEqual(await doWords(), ['nod']);
    assert.equal(await page.locator('#toast').isVisible(), false);
    assert.equal(await page.locator('#bubble').isVisible(), false);
    assert.equal(await page.locator('#interaction').isVisible(), false);
    assert.equal(await page.locator('#pet').getAttribute('data-mood'), 'idle');
    await waitIdle();

    await clearOrders();
    await receive({ type: 'perform', word: 'love', generation: 7 });
    await waitFrames(2);
    assert.deepEqual(await doWords(), ['love']);
    await waitIdle();

    // User-approved in-place hop and flap succeed from idle standing.
    for (const word of ['hop', 'flap']) {
      await clearOrders();
      await receive({ type: 'perform', word, generation: 7 });
      await waitFrames(2);
      assert.deepEqual(await doWords(), [word], `${word} should be allowed from idle standing`);
      await waitIdle();
    }

    // Blocked posture/locomotion/throw words and unknown words are silently dropped in idle standing.
    await clearOrders();
    for (const word of ['sleep', 'sit', 'stand', 'walk', 'run', 'jump', 'dragged', 'unknown-word']) {
      await receive({ type: 'perform', word, generation: 7 });
    }
    await waitFrames(3);
    assert.deepEqual(await doWords(), []);

    // Runtime gates: hidden, suspended, stale generation; restoring visibility does not replay.
    await clearOrders();
    await receive({ type: 'notification-state', snapshot: hidden(7) });
    await receive({ type: 'perform', word: 'nod', generation: 7 });
    await receive({ type: 'notification-state', snapshot: runtime(7, { suspended: true }) });
    await receive({ type: 'perform', word: 'nod', generation: 7 });
    await receive({ type: 'notification-state', snapshot: runtime(7) });
    await receive({ type: 'perform', word: 'nod', generation: 6 });
    await waitFrames(3);
    assert.deepEqual(await doWords(), []);

    // Asleep gate blocks perform until woken.
    await receive({ type: 'ui-control', command: 'sleep' });
    await page.waitForSelector('#pet[data-mood=sleeping][data-mode=sleep]');
    await clearOrders();
    await receive({ type: 'perform', word: 'nod', generation: 7 });
    await waitFrames(3);
    assert.deepEqual(await doWords(), []);
    await receive({ type: 'ui-control', command: 'sleep' });
    await page.waitForSelector('#pet[data-mood=idle]');
    await waitIdle();

    // Pointer press blocks perform until released.
    await page.locator('#pet').dispatchEvent('pointerdown', { button: 0, pointerId: 1, clientX: 600, clientY: 600 });
    await clearOrders();
    await receive({ type: 'perform', word: 'nod', generation: 7 });
    await waitFrames(2);
    assert.deepEqual(await doWords(), []);
    await page.locator('#pet').dispatchEvent('pointerup', { button: 0, pointerId: 1, clientX: 600, clientY: 600 });
    await waitIdle();

    // Back-to-back performs before layout settles: only the first reaches the body.
    await clearOrders();
    await page.evaluate(() => {
      window.receive({ type: 'perform', word: 'dance', generation: 7 });
      window.receive({ type: 'perform', word: 'bow', generation: 7 });
    });
    await waitFrames(3);
    assert.deepEqual(await doWords(), ['dance']);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function verifyPerformCompanionAndCustom(browser) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-perform-ui-'));
  let ownerNow = new Date(2026, 9, 15, 12).getTime();
  const store = new CompanionStore(join(dir, 'care'), () => ownerNow);
  const characters = new CharacterStore(join(dir, 'figures'), resolve('web/upstream/whale'));
  const customManifest = {
    manifest: 2, api: 2, id: 'perform-custom', version: '1.0.0',
    name: { zh: '测试体' }, about: { zh: '测试自定义角色' },
    entry: 'figure.js', export: 'createCustomBody',
    axes: [{ id: 'tone', name: { zh: '色' }, options: [{ id: 'a', name: { zh: '默认' } }] }],
    presets: [{ id: 'a', pick: { tone: 'a' } }],
    vocab: [
      { id: 'neutral', kind: 'expression', names: { zh: ['平'] }, about: { zh: 'neutral' }, seconds: 1 },
      { id: 'happy', kind: 'expression', names: { zh: ['喜'] }, about: { zh: 'happy' }, seconds: 1 },
      { id: 'dragged', kind: 'expression', names: { zh: ['拖'] }, about: { zh: 'dragged' }, seconds: 1 },
      { id: 'nod', kind: 'motion', names: { zh: ['点'] }, about: { zh: 'nod' }, seconds: 1 },
      { id: 'wave', kind: 'motion', names: { zh: ['挥'] }, about: { zh: 'wave' }, seconds: 1 },
      { id: 'look', kind: 'motion', names: { zh: ['看'] }, about: { zh: 'look' }, seconds: 1 },
      { id: 'stand', kind: 'motion', names: { zh: ['站'] }, about: { zh: 'stand' }, seconds: 1 },
      { id: 'sit', kind: 'motion', names: { zh: ['坐'] }, about: { zh: 'sit' }, seconds: 1, lasting: true },
      { id: 'pose', kind: 'motion', names: { zh: ['姿'] }, about: { zh: 'pose' }, seconds: 1, lasting: true },
      { id: 'busy-wave', kind: 'motion', names: { zh: ['忙'] }, about: { zh: 'busy' }, seconds: 1 },
    ],
    sounds: {}, can: { walk: true },
  };
  const customFigure = `
export async function createCustomBody(_base, { host }) {
  let x = host.start?.x ?? 700, busy = false, pendingBusy = false;
  return {
    words: ['neutral', 'happy', 'dragged', 'nod', 'wave', 'look', 'stand', 'sit', 'pose', 'busy-wave'],
    step() { if (pendingBusy) { busy = true; pendingBusy = false; } },
    layout() {
      const b = host.bounds();
      return {
        x, facing: 1, mode: 'idle', busy, moving: false, pressing: false, cursor: 'grab',
        box: { x: x - 60, y: b.floorY - 120, w: 120, h: 120 },
        hit: [{ x, y: b.floorY - 60, r: 60 }],
        bubble: { x, y: b.floorY - 120 },
        side: { x, y: b.floorY - 60, reach: 60 },
      };
    },
    do(word) { if (word === 'busy-wave') pendingBusy = true; },
    place(nx) { x = nx; },
    walk(nx, _run, walkId) { x = nx; host.emit('arrived', { walkId, x: Math.round(x) }); return true; },
    stopWalk() {}, set() {}, pointer() {}, resize() {}, dispose() {},
  };
}`;
  await characters.import(zipSync({ 'figure.json': strToU8(JSON.stringify(customManifest)), 'figure.js': strToU8(customFigure) }));
  const customServer = createPetServer({ webRoot: resolve('web'), store: characters, companions: store });
  customServer.listen(0, '127.0.0.1');
  await once(customServer, 'listening');

  const baseSnap = { mood: 'idle', active: false, sessionId: 'c1', sessions: [{ id: 'c1', label: 'C1', mood: 'idle', active: false, chatAvailable: true }], results: [] };
  const openPage = async () => {
    const page = await browser.newPage({ viewport: { width: 1000, height: 750 }, reducedMotion: 'no-preference' });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await controlCompanionClock(page);
    await controlNpc(page);
    await page.addInitScript(() => {
      window.npcFrameCount = 0;
      addEventListener('message', event => { if (event.data?.t === 'frame' && event.data.layout) { window.lastNpcLayout = event.data.layout; window.npcFrameCount++; } });
      window.dshPetBridge = { subscribe(fn) { window.receive = fn; }, action() {}, hit() {} };
    });
    await page.goto(`http://127.0.0.1:${customServer.address().port}`);
    await page.waitForSelector('#pet[data-mode]');
    const receive = message => page.evaluate(message => window.receive(message), message);
    await receive({ type: 'init', baseline: true, options: { companionship: 'interactive', roam: true, locale: 'zh', notifications: true, bubbleDurationMs: 60000 }, snapshot: baseSnap });
    await receive({ type: 'notification-state', snapshot: runtime(7) });
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => window.companionState?.blocked === false);
    const body = await recordBodyOrders(page);
    return { page, receive, body, errors };
  };
  const waitFrames = (page, n = 3) => page.evaluate(count => new Promise(resolve => {
    const step = left => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
    step(count);
  }), n);
  const waitLayoutFrames = async (page, n = 2) => {
    const start = await page.evaluate(() => window.npcFrameCount);
    await page.waitForFunction(({ target }) => window.npcFrameCount >= target, { target: start + n });
  };

  try {
    // Part A: Built-in whale — NPC walk, NPC sit + recovery, manual play standing pause, invitation shown.
    await characters.select('whale');
    const a = await openPage();
    try {
      // 1. NPC outbound walk: perform('bow') is blocked and does not interrupt the route.
      await npcUntil(a.page, 'outbound');
      assert.ok(await a.page.evaluate(() => !!window.npcState.walkId), 'NPC walk is active');
      await a.body.evaluate(() => { window.bodyOrders = []; });
      await a.receive({ type: 'perform', word: 'bow', generation: 7 });
      await waitFrames(a.page, 2);
      assert.equal(await a.body.evaluate(() => window.bodyOrders.some(o => o.t === 'do' && o.word === 'bow')), false, 'bow is blocked during NPC walk');
      assert.equal(await a.page.evaluate(() => window.npcTrace.some(entry => entry.event?.kind === 'interrupted')), false, 'NPC walk is not interrupted by blocked perform');

      // 2. NPC arrives -> returns home -> sits: perform('look') is blocked, then standing recovers perform('nod').
      await a.page.waitForFunction(() => window.npcState.phase === 'observe', undefined, { timeout: 10000 });
      await npcUntil(a.page, 'return');
      await a.page.waitForFunction(() => window.npcState.phase === 'home' && window.lastNpcLayout?.mode === 'sit', undefined, { timeout: 10000 });
      await a.body.evaluate(() => { window.bodyOrders = []; });
      await a.receive({ type: 'perform', word: 'look', generation: 7 });
      await waitFrames(a.page, 2);
      assert.equal(await a.body.evaluate(() => window.bodyOrders.some(o => o.t === 'do' && o.word === 'look')), false, 'look is blocked while NPC is seated');
      assert.equal(await a.page.locator('#pet').getAttribute('data-mode'), 'sit');
      // Disable companionship so NPC stands up; wait for idle and verify perform recovers.
      await a.receive({ type: 'configure', options: { companionship: 'off' } });
      await a.page.waitForFunction(() => window.lastNpcLayout?.mode === 'idle' && !window.lastNpcLayout.moving);
      await waitFrames(a.page, 3);
      await a.body.evaluate(() => { window.bodyOrders = []; });
      await a.receive({ type: 'perform', word: 'nod', generation: 7 });
      await waitLayoutFrames(a.page, 2);
      assert.deepEqual(await a.body.evaluate(() => window.bodyOrders.filter(o => o.t === 'do').map(o => o.word)), ['nod']);
      await a.page.waitForFunction(() => window.lastNpcLayout?.mode === 'idle' && !window.lastNpcLayout.moving && !window.lastNpcLayout.busy);
      await waitLayoutFrames(a.page, 2);

      // 3. Reverse-order race: hop/flap followed immediately by manual play click before layout settles
      // must defer manual play instead of starting and getting cancelled by crouch on the next frame.
      await a.receive({ type: 'configure', options: { companionship: 'interactive' } });
      await a.page.waitForFunction(() => window.companionState?.blocked === false);
      for (const word of ['hop', 'flap']) {
        await a.body.evaluate(() => { window.bodyOrders = []; });
        const result = await a.page.evaluate(w => {
          window.receive({ type: 'perform', word: w, generation: 7 });
          document.getElementById('companion-play').click();
          return { active: !!window.companionState?.active, feedbackVisible: !document.getElementById('companion-feedback').hidden };
        }, word);
        assert.equal(result.active, false, `${word} pending window blocks immediate manual play start`);
        assert.equal(result.feedbackVisible, true, `${word} shows busy feedback instead of starting`);
        await waitLayoutFrames(a.page, 2);
        assert.equal(await a.body.evaluate(w => window.bodyOrders.some(o => o.t === 'do' && o.word === w), word), true, `${word} reached the body`);
        await a.page.waitForFunction(() => window.lastNpcLayout?.mode === 'idle' && !window.lastNpcLayout.moving && !window.lastNpcLayout.busy);
        await waitLayoutFrames(a.page, 2);
      }

      // 4. Manual companionship standing pause: perform('nod') is blocked and play completes with familiarity.
      await a.page.evaluate(() => { document.getElementById('companion-play').click(); });
      await a.page.waitForFunction(() => !!window.companionState?.active?.manual && !window.lastNpcLayout?.moving);
      await a.body.evaluate(() => { window.bodyOrders = []; });
      await a.receive({ type: 'perform', word: 'nod', generation: 7 });
      await waitFrames(a.page, 2);
      assert.equal(await a.body.evaluate(() => window.bodyOrders.some(o => o.t === 'do' && o.word === 'nod')), false, 'perform is blocked during manual companionship standing pause');
      assert.ok(await a.page.evaluate(() => !!window.companionState?.active?.manual), 'manual companionship stays active');
      // Finish manual companionship steps and verify familiarity increments.
      for (let step = 0; step < 5 && await a.page.evaluate(() => !!window.companionState?.active); step++) {
        const due = await a.page.evaluate(() => window.companionState.active.dueAt);
        await advanceCompanion(a.page, due + 100);
        await a.page.waitForFunction(() => !window.lastNpcLayout?.moving);
      }
      await a.page.waitForFunction(() => !window.companionState?.active && document.querySelector('#companion-status').textContent.includes('1'));
      assert.equal((await store.request({ type: 'read', characterId: 'whale' })).relation.total, 1, 'manual companionship completed and recorded');

      // 4. Invitation shown (greeting finished so companion.active is null): perform is blocked and invitation stays visible.
      const inviteAt = await a.page.evaluate(() => window.companionState.inviteAt);
      await advanceCompanion(a.page, inviteAt + 100);
      await a.page.waitForFunction(() => window.companionState?.invitation === 'shown');
      for (let step = 0; step < 5 && await a.page.evaluate(() => !!window.companionState?.active); step++) {
        const due = await a.page.evaluate(() => window.companionState.active.dueAt);
        await advanceCompanion(a.page, due + 100);
        await a.page.waitForFunction(() => !window.lastNpcLayout?.moving);
      }
      await a.page.waitForFunction(() => !window.companionState?.active && window.companionState?.invitation === 'shown');
      await a.body.evaluate(() => { window.bodyOrders = []; });
      await a.receive({ type: 'perform', word: 'nod', generation: 7 });
      await waitFrames(a.page, 2);
      assert.deepEqual(await a.body.evaluate(() => window.bodyOrders.filter(o => o.t === 'do').map(o => o.word)), []);
      assert.equal(await a.page.locator('#companion-invitation').isVisible(), true, 'invitation remains visible');
      assert.deepEqual(a.errors, []);
    } finally {
      await a.page.close();
    }

    // Part B: Custom API 2 body — dragged & lasting:true blocked, ignored sit + off-companionship recovery, busy-wave vs invitation quota race.
    await characters.select('perform-custom');
    const b = await openPage();
    try {
      // 1. Custom non-lasting 'dragged' and lasting:true 'pose' are both blocked.
      await b.body.evaluate(() => { window.bodyOrders = []; });
      await b.receive({ type: 'perform', word: 'dragged', generation: 7 });
      await b.receive({ type: 'perform', word: 'pose', generation: 7 });
      await waitFrames(b.page, 3);
      assert.deepEqual(await b.body.evaluate(() => window.bodyOrders.filter(o => o.t === 'do').map(o => o.word)), []);

      // 2. Ignored 'sit' + disabling companionship in the exact same turn sit is emitted:
      // look is blocked during the sit-pending window, then unconditional layout sampling clears
      // the guard after 2 real layout frames so a single nod succeeds.
      await npcUntil(b.page, 'outbound');
      await b.page.waitForFunction(() => window.npcState.phase === 'observe', undefined, { timeout: 5000 });
      await b.body.evaluate(() => { window.bodyOrders = []; });
      const sitFrame = await b.page.evaluate(() => new Promise((resolve, reject) => {
        const originalPush = window.npcEvents.push.bind(window.npcEvents);
        let handled = false, steps = 0;
        window.npcEvents.push = (...items) => {
          const out = originalPush(...items);
          if (!handled && items.some(ev => ev.word === 'sit')) {
            handled = true;
            window.npcEvents.push = originalPush;
            // Probe look and turn off companionship on the exact turn sit was emitted (0 post-sit frames).
            queueMicrotask(() => {
              const frameAtSit = window.npcFrameCount;
              window.receive({ type: 'perform', word: 'look', generation: 7 });
              window.receive({ type: 'configure', options: { companionship: 'off' } });
              resolve(frameAtSit);
            });
          }
          return out;
        };
        const advance = () => {
          if (handled) return;
          if (++steps > 100) { window.npcEvents.push = originalPush; reject(new Error('NPC did not emit sit')); return; }
          window.npcNow += 1000;
          requestAnimationFrame(advance);
        };
        requestAnimationFrame(advance);
      }));
      await b.page.waitForFunction(target => window.npcFrameCount >= target, sitFrame + 2);
      assert.equal(await b.page.evaluate(() => window.lastNpcLayout?.mode), 'idle', 'custom body ignored sit and kept reporting idle');
      assert.equal(await b.body.evaluate(() => window.bodyOrders.some(o => o.t === 'do' && o.word === 'look')), false, 'look is blocked on the same turn sit was emitted');
      await b.body.evaluate(() => { window.bodyOrders = []; });
      await b.receive({ type: 'perform', word: 'nod', generation: 7 });
      await waitLayoutFrames(b.page, 1);
      assert.deepEqual(await b.body.evaluate(() => window.bodyOrders.filter(o => o.t === 'do').map(o => o.word)), ['nod'], 'single nod succeeds after 2 real idle layout frames even when companionship was turned off before settlement');

      // 3. Perform arrives first (custom body reports busy on next step) and invitation becomes due immediately: daily quota is not spent.
      await b.receive({ type: 'configure', options: { companionship: 'interactive' } });
      await b.page.waitForFunction(() => window.companionState?.blocked === false && typeof window.companionState.inviteAt === 'number');
      await waitLayoutFrames(b.page, 2);
      const beforeSummary = await store.request({ type: 'read', characterId: 'perform-custom' });
      assert.ok(beforeSummary.invitation.remaining >= 1, 'at least one daily invitation remains before race test');
      const customInviteAt = await b.page.evaluate(() => window.companionState.inviteAt);
      await advanceCompanion(b.page, customInviteAt - 10);
      const preRace = await b.page.evaluate(() => ({
        eligible: window.companionInput?.eligible,
        automatic: window.companionInput?.automatic,
        occupied: window.companionInput?.occupied,
        invitation: window.companionState?.invitation,
        busy: window.lastNpcLayout?.busy,
      }));
      assert.deepEqual(preRace, { eligible: true, automatic: true, occupied: false, invitation: null, busy: false }, 'invitation is ready to reserve right before perform arrives');
      await b.body.evaluate(() => { window.bodyOrders = []; });
      await b.page.evaluate(due => {
        window.companionEvents = [];
        window.receive({ type: 'perform', word: 'busy-wave', generation: 7 });
        window.companionNow = due + 10;
      }, customInviteAt);
      await b.page.waitForFunction(() => window.lastNpcLayout?.busy === true);
      await waitLayoutFrames(b.page, 2);
      assert.equal(await b.body.evaluate(() => window.bodyOrders.some(o => o.t === 'do' && o.word === 'busy-wave')), true, 'busy-wave reached the custom body');
      assert.equal(await b.page.evaluate(() => window.companionEvents.some(e => e.reserveInvitation)), false, 'no invitation reservation was attempted while busy-wave settled');
      const afterSummary = await store.request({ type: 'read', characterId: 'perform-custom' });
      assert.equal(afterSummary.invitation.remaining, beforeSummary.invitation.remaining, 'invitation quota is preserved when perform precedes due invitation');
      assert.equal(await b.page.evaluate(() => window.companionState.invitation), null);
      assert.deepEqual(b.errors, []);
    } finally {
      await b.page.close();
    }
  } finally {
    await new Promise(resolve => customServer.close(resolve));
    await store.close();
    await rm(dir, { recursive: true, force: true });
  }
}
