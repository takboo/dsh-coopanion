import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { previewServer } from '../scripts/preview.mjs';

const server = previewServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath());
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('#pet').click(); await page.waitForSelector('#bubble:not([hidden])');
  assert.match(await page.locator('#bubble-text').innerText(), /摸摸头|我在呢|小星星/);
  const before = await page.locator('#pet').boundingBox();
  await page.mouse.move(before.x + 70, before.y + 60); await page.mouse.down(); await page.mouse.move(before.x - 140, before.y + 30, { steps: 12 }); await page.mouse.up();
  const after = await page.locator('#pet').boundingBox(); assert.ok(after.x < before.x - 100, 'drag moves the whale');
  await page.locator('[data-demo=thinking]').click(); assert.equal(await page.locator('#pet').getAttribute('data-mood'), 'thinking');
  await page.locator('[data-demo=waiting]').click(); assert.match(await page.locator('#toast-title').innerText(), /等你确认/);
  await page.locator('[data-demo=happy]').click(); assert.equal(await page.locator('#pet').getAttribute('data-mood'), 'happy');
  await page.locator('#pet').dblclick(); await page.locator('#message').fill('你好小鲸'); await page.locator('#send').click();
  await page.waitForFunction(() => document.getElementById('bubble-text').textContent.includes('这是演示回复'));
  assert.match(await page.locator('#bubble-text').innerText(), /你好小鲸/);
  await page.locator('#pet').click({ button: 'right' }); await page.locator('#toggle-sleep').click();
  assert.equal(await page.locator('#pet').getAttribute('data-mood'), 'sleeping');
  await page.locator('#pet').click({ button: 'right' }); await page.locator('#toggle-sleep').click();
  await page.locator('[data-demo=happy]').click();
  await mkdir('artifacts', { recursive: true }); await page.screenshot({ path: 'artifacts/desktop-pet.png' });
  // Host text must stay text even when it contains HTML or script markup.
  await page.locator('#pet').dblclick(); await page.locator('#message').fill('<img src=x onerror="throw 1">'); await page.locator('#send').click();
  await page.waitForFunction(() => document.getElementById('bubble-text').textContent.includes('<img'));
  assert.equal(await page.locator('#bubble-text img').count(), 0); assert.deepEqual(errors, []);
  console.log('UI smoke passed: interaction, drag, task states, notices, chat, sleep, and HTML text isolation.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
