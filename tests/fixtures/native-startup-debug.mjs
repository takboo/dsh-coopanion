// Temporary CI diagnostic: compare a native inactive window with Page.bringToFront.
// Reports only this isolated fixture's geometry, frame cadence and sanitized errors.
import { createServer } from 'node:net';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { ElectronBridge } from '../../dist/bridge.js';

const directory = await mkdtemp(join(tmpdir(), 'dsh-native-startup-debug-'));
const portServer = createServer(); portServer.listen(0, '127.0.0.1'); await once(portServer, 'listening');
const port = portServer.address().port; await new Promise(resolve => portServer.close(resolve));
Object.assign(process.env, { DSH_PET_TEST_DATA_DIR: directory, DSH_PET_TEST_NO_SANDBOX: '1', DSH_PET_TEST_DEBUG_PORT: String(port) });
const bridge = new ElectronBridge();
let browser;
let electronPath;
if (process.env.DSH_STARTUP_DEBUG_SOFTWARE_GL === '1') {
  electronPath = join(directory, 'software-electron');
  const executable = createRequire(import.meta.url)('electron');
  const quote = value => "'" + value.replaceAll("'", "'\"'\"'") + "'";
  await writeFile(electronPath, '#!/bin/sh\nexec ' + quote(executable) + ' --use-gl=angle --use-angle=swiftshader-webgl "$@"\n', { mode: 0o700 });
}
const safe = value => String(value).replace(/https?:\/\/[^\s"'<>]+/g, '[url]').slice(0, 500);
const report = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), platform: process.platform, arch: process.arch, lifecycle: [], errors: [], console: [], samples: [] };
bridge.onLifecycle(({ running, visible, generation, visibilityRevision, suspended, desiredVisible }) => report.lifecycle.push({ running, visible, generation, visibilityRevision, suspended, desiredVisible }));
bridge.on('failure', error => report.errors.push({ source: 'bridge', name: error.name, message: safe(error.message) }));
try {
  bridge.update({ mood: 'thinking', active: true, sessionId: null, sessions: [], results: [] });
  await bridge.start({ locale: 'en', size: 150, roam: false, notifications: false, ...(electronPath ? { electronPath } : {}) });
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages()[0];
  page.on('pageerror', error => report.errors.push({ source: 'page', name: error.name, message: safe(error.message) }));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) report.console.push({ type: message.type(), text: safe(message.text()) }); });
  const observe = async label => {
    const frames = [];
    for (const frame of page.frames()) {
      frames.push(await frame.evaluate(() => new Promise(resolve => {
        let ticks = 0, done = false;
        const next = () => { if (!done) { ticks++; requestAnimationFrame(next); } };
        requestAnimationFrame(next);
        setTimeout(() => {
          done = true;
          const pet = document.getElementById('pet');
          resolve({ visibility: document.visibilityState, width: innerWidth, height: innerHeight, dpr: devicePixelRatio, animationFrames: ticks,
            pet: pet ? { hidden: pet.hidden, mode: pet.dataset.mode ?? null, character: pet.dataset.character ?? null, hostReady: pet.dataset.hostReady ?? null } : null,
            canvases: [...document.querySelectorAll('canvas')].map(canvas => ({ width: canvas.width, height: canvas.height })), frames: document.querySelectorAll('iframe').length,
            status: document.getElementById('character-status')?.textContent?.replace(/https?:\/\/[^\s"'<>]+/g, '[url]').slice(0, 500) });
        }, 1000);
      })));
    }
    report.samples.push({ label, frames });
  };
  const visible = async timeout => { try { await page.waitForSelector('#pet[data-host-ready=true][data-mode]', { timeout }); return true; } catch { return false; } };
  report.inactiveReady = await visible(10000);
  await observe('inactive');
  if (!report.inactiveReady) await page.screenshot({ path: 'artifacts/native-startup-debug-before.png' });
  await page.bringToFront();
  report.frontReady = await visible(10000);
  await observe('front');
  console.log('Native startup diagnostic: ' + JSON.stringify({ inactiveReady: report.inactiveReady, frontReady: report.frontReady, samples: report.samples, errors: report.errors, console: report.console }));
  if (!report.inactiveReady) process.exitCode = 1;
} finally {
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/native-startup-debug.json', JSON.stringify(report, null, 2) + '\n');
  await bridge.dispose();
  await browser?.close();
  await rm(directory, { recursive: true, force: true });
}
