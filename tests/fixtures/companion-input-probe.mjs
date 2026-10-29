// Temporary observation only: retain the actual gesture and activity decisions.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const launch = chromium.launch.bind(chromium);
let index = 0;
chromium.launch = async options => {
  const browser = await launch(options), newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args), current = ++index;
    await page.addInitScript(() => {
      window.inputProbe = { start: performance.now(), frames: 0 };
      const frame = () => { window.inputProbe.frames++; requestAnimationFrame(frame); }; requestAnimationFrame(frame);
    });
    await page.context().route('**/companion-touch.js', async route => {
      const response = await route.fetch(), source = await response.text();
      assert.ok(source.includes('export function createCompanionStroke()'));
      await route.fulfill({ response, body: source.replace('export function createCompanionStroke()', 'function actualCreateCompanionStroke()') + `
export function createCompanionStroke() {
  const actual = actualCreateCompanionStroke(), id = (window.strokeProbeId ?? 0) + 1; window.strokeProbeId = id;
  window.strokeProbeTrace ??= [];
  return {
    reset(...args) { window.strokeProbeTrace.push({ id, type: 'reset', at: performance.now() }); return actual.reset(...args); },
    move(point, input) {
      const accepted = actual.move(point, input);
      if (window.strokeProbeTrace.length < 4096) window.strokeProbeTrace.push({ id, type: 'move', point: {...point}, input: {...input}, accepted,
        mode: document.querySelector('#pet')?.dataset.mode, mood: document.querySelector('#pet')?.dataset.mood,
        activity: document.querySelector('#pet')?.dataset.companionActivity });
      return accepted;
    }
  };
}
` });
    });
    // Existing controlled-clock page routes take precedence. Real-clock tests use this observer.
    await page.context().route('**/companionship.js', async route => {
      const response = await route.fetch(), source = await response.text();
      assert.ok(source.includes('export function stepCompanionship('));
      await route.fulfill({ response, body: source.replace('export function stepCompanionship(', 'function actualStepCompanionship(') + `
export function stepCompanionship(state, input, random) {
  const result = actualStepCompanionship(state, input, random);
  window.realCompanionState = result.state; window.realCompanionInput = input;
  window.realCompanionTrace ??= [];
  if (window.realCompanionTrace.length < 200 && (input.action || result.word || result.completed || result.release || state.blocked !== result.state.blocked))
    window.realCompanionTrace.push({ now: input.now, occupied: input.occupied, motionBusy: input.motionBusy, action: input.action,
      word: result.word, completed: result.completed, release: result.release, state: result.state });
  return result;
}
` });
    });
    const close = page.close.bind(page);
    page.close = async (...args) => {
      let state, graphics = [];
      try {
        state = await page.evaluate(() => ({ ...window.inputProbe, end: performance.now(), layout: window.lastNpcLayout,
          npc: window.npcState, companion: window.realCompanionState ?? window.companionState,
          companionInput: window.realCompanionInput ?? window.companionInput, transitions: window.realCompanionTrace,
          strokeTrace: window.strokeProbeTrace, status: document.querySelector('#companion-status')?.textContent }));
        for (const frame of page.frames().filter(frame => frame !== page.mainFrame())) graphics.push(await frame.evaluate(() => {
          const gl = document.querySelector('canvas')?.getContext('webgl2'), debug = gl?.getExtension('WEBGL_debug_renderer_info');
          return { renderer: gl ? gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) : null };
        }));
      } catch { state = { ...state, inspectionFailed: true }; }
      await mkdir('artifacts', { recursive: true });
      await writeFile(`artifacts/companion-input-${process.pid}-${current}.json`, JSON.stringify({ commit, state, graphics }, null, 2) + '\n');
      return close(...args);
    };
    return page;
  };
  return browser;
};
