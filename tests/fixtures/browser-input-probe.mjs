// Temporary isolated probe. Change only the Chromium binary; keep test assertions intact.
import { chromium } from 'playwright-core';
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const backend = process.env.DSH_INPUT_PROBE_BROWSER ?? 'shell';
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const launch = chromium.launch.bind(chromium);
let index = 0;
chromium.launch = async (options = {}) => {
  const browser = await launch({ ...options, ...(backend === 'full' ? { executablePath: chromium.executablePath() } : {}) });
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => {
    const page = await newPage(...args), current = ++index;
    await page.addInitScript(() => {
      window.inputProbe = { start: performance.now(), frames: 0, events: [] };
      const frame = () => { window.inputProbe.frames++; requestAnimationFrame(frame); }; requestAnimationFrame(frame);
      document.addEventListener('pointermove', event => {
        const layout = window.lastNpcLayout, box = layout?.box;
        window.inputProbe.events.push({ at: performance.now(), x: event.clientX, y: event.clientY, trusted: event.isTrusted,
          target: event.target.id, mode: layout?.mode ?? null,
          reportedCircleHit: !!box && event.clientX >= box.x && event.clientX <= box.x + box.w && event.clientY >= box.y && event.clientY <= box.y + box.h && layout.hit.some(c => Math.hypot(event.clientX - c.x, event.clientY - c.y) < c.r),
          blocked: window.companionState?.blocked ?? null, activity: window.companionState?.active?.kind ?? null });
      }, { capture: true });
    });
    const close = page.close.bind(page);
    page.close = async (...args) => {
      let state, graphics = [];
      try {
        state = await page.evaluate(() => ({ ...window.inputProbe, end: performance.now(), layout: window.lastNpcLayout,
          npc: window.npcState, companion: window.companionState, status: document.querySelector('#companion-status')?.textContent }));
        for (const frame of page.frames().filter(frame => frame !== page.mainFrame())) {
          graphics.push(await frame.evaluate(() => {
            const gl = document.querySelector('canvas')?.getContext('webgl2');
            const debug = gl?.getExtension('WEBGL_debug_renderer_info');
            return { renderer: gl ? gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER) : null };
          }));
        }
      } catch { state = { ...state, inspectionFailed: true }; }
      await mkdir('artifacts', { recursive: true });
      await writeFile(`artifacts/browser-input-${backend}-${process.pid}-${current}.json`, JSON.stringify({ commit, backend, state, graphics }, null, 2) + '\n');
      return close(...args);
    };
    return page;
  };
  return browser;
};
