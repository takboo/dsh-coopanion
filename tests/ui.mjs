import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { zipSync, strToU8 } from 'fflate';
import { previewServer } from '../scripts/preview.mjs';
import { importCharacter } from './helpers/characters.mjs';

const directory = await mkdtemp(join(tmpdir(), 'dsh-figure-ui-'));
const server = previewServer({ dataDir: directory }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()), headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const speechDone = page => page.waitForSelector('#bubble[data-typing=false]');
const mainFrame = page => page.locator('#body-layer iframe').contentFrame();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.setDefaultTimeout(12000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const petClick = async (options = {}, twice = false) => {
    const box = await page.locator('#pet').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.locator('#pet')[twice ? 'dblclick' : 'click'](options);
  };
  const openSessionPicker = async () => { await petClick({}, true); await page.locator('#chat-current').click(); };
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForSelector('#pet[data-character=whale][data-mode]'); console.log('UI: native figure ready');
  assert.match(await page.locator('#pet').getAttribute('aria-label'), /^DeepSeek 大肥鱼，/);
  assert.equal(await page.locator('#body-layer iframe').getAttribute('sandbox'), 'allow-scripts');
  assert.equal(await mainFrame(page).locator('canvas').count(), 1);
  const canvas = mainFrame(page).locator('canvas');
  const beforePixels = await canvas.evaluate(c => c.toDataURL());
  await page.waitForTimeout(400); assert.notEqual(await canvas.evaluate(c => c.toDataURL()), beforePixels, 'native mesh, face and spring animation produces changing pixels');

  await openSessionPicker();
  assert.equal(await page.locator('#conversation-list .conversation-card').count(), 2);
  await page.locator('#conversation-list [data-session-id=demo-notes]').click(); await speechDone(page);
  assert.match(await page.locator('#bubble-text').innerText(), /好，我来听.*另一个想法.*正在忙/);
  await openSessionPicker(); await page.locator('#conversation-list [data-session-id=demo]').click();
  console.log('UI: sessions passed'); await petClick(); await page.waitForSelector('#bubble[data-typing=true]');
  const partial = await page.locator('#bubble-text').textContent();
  await speechDone(page); const completed = await page.locator('#bubble-text').textContent();
  assert.ok(completed.length > partial.length, 'speech is typed progressively');
  assert.match(completed, /摸摸头|我在呢|小星星/);

  console.log('UI: speech passed'); const before = await page.locator('#pet').boundingBox();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down(); await page.mouse.move(before.x - 150, before.y + 50, { steps: 16 });
  await page.waitForFunction(() => document.getElementById('pet').dataset.mode === 'drag');
  await page.mouse.up();
  await page.waitForFunction(() => document.getElementById('pet').dataset.mode !== 'drag' && document.getElementById('pet').dataset.mode !== 'air');
  const after = await page.locator('#pet').boundingBox(); assert.ok(after.x < before.x - 100, 'upstream drag/drop physics moves the body');
  console.log('UI: physics passed'); await page.locator('[data-demo=thinking]').click(); assert.equal(await page.locator('#pet').getAttribute('data-mood'), 'thinking');
  await page.locator('[data-demo=waiting]').click(); assert.match(await page.locator('#toast-title').innerText(), /等你确认/);
  await page.locator('[data-demo=happy]').click(); assert.equal(await page.locator('#pet').getAttribute('data-mood'), 'happy');
  await petClick({}, true); await page.locator('#message').fill('<img src=x onerror="throw 1">'); await page.locator('#send').click();
  await page.waitForFunction(() => document.getElementById('bubble-text').textContent.includes('这是演示回复')); await speechDone(page);
  assert.match(await page.locator('#bubble-text').innerText(), /<img/); assert.equal(await page.locator('#bubble-text img').count(), 0);
  await petClick({ button: 'right' }); await page.locator('#toggle-sleep').click();
  await page.waitForFunction(() => document.getElementById('pet').dataset.mode === 'sleep');
  await petClick({ button: 'right' }); await page.locator('#toggle-sleep').click();
  await page.waitForFunction(() => document.getElementById('pet').dataset.mode !== 'sleep');

  console.log('UI: opening manager'); await petClick({ button: 'right' }); await page.locator('#open-characters').click();
  await page.waitForFunction(() => !document.getElementById('character-use').disabled);
  assert.equal(await page.locator('#character-scheme option').count(), 9);
  await page.locator('#character-scheme').selectOption('claude');
  await page.waitForFunction(() => !document.getElementById('character-use').disabled);
  await page.locator('#character-use').click(); await page.waitForSelector('#pet[data-scheme=claude]');
  const preview = page.locator('#character-preview iframe').contentFrame();
  const image1 = await preview.locator('canvas').evaluate(c => c.toDataURL());
  await page.locator('#character-action').selectOption('dance'); await page.locator('#character-test').click();
  await page.waitForTimeout(400); assert.notEqual(await preview.locator('canvas').evaluate(c => c.toDataURL()), image1);
  await mkdir('artifacts', { recursive: true }); await page.screenshot({ path: 'artifacts/character-library.png' });
  await page.reload(); await page.waitForSelector('#pet[data-character=whale][data-scheme=claude]');

  console.log('UI: opening manager'); await petClick({ button: 'right' }); await page.locator('#open-characters').click();
  await importCharacter(page, 'paper-star.zip');
  await page.waitForFunction(() => document.getElementById('character-select').value === 'paper-star' && !document.getElementById('character-use').disabled);
  await page.locator('#character-use').click(); await page.waitForSelector('#pet[data-character=paper-star]');
  assert.match(await page.locator('#character-credit').innerText(), /AGPL/);
  await page.locator('#characters-close').click();
  await page.locator('[data-demo=thinking]').click();
  await mainFrame(page).locator('[data-talk]').evaluate(async () => {
    await new Promise((resolve, reject) => { const start = performance.now(); const check = () => { if (+document.querySelector('[data-talk]').dataset.talk > .2) resolve(); else if (performance.now() - start > 3000) reject(new Error('no mouth pulses')); else requestAnimationFrame(check); }; check(); });
  });
  await page.reload(); await page.waitForSelector('#pet[data-character=paper-star]');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-demo=waiting]').click();
  assert.equal(await page.locator('#bubble').getAttribute('data-typing'), 'false', 'reduced motion shows speech immediately');
  await petClick({ button: 'right' }); await page.locator('#open-characters').click();
  await page.waitForFunction(() => !document.getElementById('character-use').disabled);
  await page.locator('#character-scheme').selectOption('night');
  await page.waitForFunction(() => !document.getElementById('character-use').disabled);
  await page.locator('#character-use').click(); await page.waitForSelector('#pet[data-scheme=night]');
  await page.locator('#characters-close').click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  console.log('UI: opening manager'); await petClick({ button: 'right' }); await page.locator('#open-characters').click();
  const legacy = zipSync({ 'character.json': strToU8('{}') });
  await importCharacter(page, { name: 'legacy.zip', mimeType: 'application/zip', buffer: Buffer.from(legacy) });
  await page.waitForFunction(() => document.getElementById('character-status').textContent.includes('操作未完成'));
  assert.equal(await page.locator('#pet').getAttribute('data-character'), 'paper-star');
  await page.locator('#character-remove').click(); await page.waitForSelector('#pet[data-character=whale]');
  await page.waitForFunction(() => !document.querySelector('#character-select option[value=paper-star]'));
  await page.locator('#characters-close').click();
  assert.equal(await page.locator('#bubble').isVisible(), false, 'closing the manager does not replay old speech');

  // Imported code is confined to the opaque frame and cannot reach the native bridge, page, or API.
  const sandboxManifest = JSON.parse(await readFile('examples/star/figure.json', 'utf8'));
  sandboxManifest.id = 'sandbox-check'; sandboxManifest.name.zh = '沙箱验证';
  const malicious = `export async function createStarBody(base, {host}) {
    let parentBlocked=false, fetchBlocked=false;
    try { parent.document.body; } catch { parentBlocked=true; }
    try { await fetch(new URL('../../../api/characters/list',base)); } catch { fetchBlocked=true; }
    if (!parentBlocked || !fetchBlocked || window.dshPetBridge || window.require) throw new Error('sandbox escaped');
    host.root.dataset.isolated='true';
    return {step(){}, do(){}, layout(){return {x:300,box:{x:250,y:600,w:100,h:100},hit:[{x:300,y:650,r:40}],bubble:{x:300,y:600}}}};
  }`;
  console.log('UI: opening manager'); await petClick({ button: 'right' }); await page.locator('#open-characters').click();
  await importCharacter(page, { name: 'sandbox.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'figure.json': strToU8(JSON.stringify(sandboxManifest)), 'figure.js': strToU8(malicious) })) });
  await page.waitForFunction(() => document.getElementById('character-select').value === 'sandbox-check' && !document.getElementById('character-use').disabled);
  assert.equal(await page.locator('#character-preview iframe').contentFrame().locator('#root').getAttribute('data-isolated'), 'true');
  await page.locator('#character-select').selectOption('whale'); await page.waitForFunction(() => !document.getElementById('character-use').disabled);
  await page.locator('#character-scheme').selectOption('deepseek'); await page.waitForFunction(() => !document.getElementById('character-use').disabled);
  await page.locator('#character-use').click(); await page.locator('#characters-close').click();
  await petClick(); await speechDone(page); await page.screenshot({ path: 'artifacts/desktop-pet.png' });
  assert.deepEqual(errors, []);
  console.log('UI passed: native WebGL animation, speech/mouth synchronization, physics, sessions, chat, outfits, API 2 import, persistence, rejection and sandbox isolation.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
