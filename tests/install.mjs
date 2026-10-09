import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { importCharacter } from './helpers/characters.mjs';

const version = process.env.DSH_TEST_VERSION ?? '0.2.0-rc.2';
assert.ok(['0.2.0-rc.2', '0.2.1-alpha.1'].includes(version), 'test only advertised DSH versions');
const project = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
const archive = resolve(process.env.DSH_TEST_PACKAGE ?? join(process.env.DSH_TEST_PACKAGE_DIR ?? project, `${manifest.name}-${manifest.version}.tgz`));
assert.ok(existsSync(archive), 'run npm pack before the installation test');
const root = await mkdtemp(join(tmpdir(), 'dsh-coopanion-install-'));
const runtime = process.env.DSH_TEST_RUNTIME ? resolve(process.env.DSH_TEST_RUNTIME) : join(root, 'runtime');
const home = join(root, 'home');
const profileName = 'coopanion-install';
const profile = join(home, 'profiles', profileName);
const environment = {
  ...process.env, DSH_HOME: home, DSH_TELEMETRY_DISABLED: '1',
  XDG_CONFIG_HOME: root, XDG_CACHE_HOME: join(root, 'cache'),
  XDG_DATA_HOME: join(root, 'data'), XDG_STATE_HOME: join(root, 'state'),
  PATH: `${join(project, 'node_modules', '.bin')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
  DSH_PET_TEST_DATA_DIR: join(root, 'pet'), DSH_PET_TEST_NO_SANDBOX: '1',
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let display, host, browser;
let hostLog = '';

async function run(command, args, cwd = project) {
  const child = spawn(command, args, { cwd, env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const collect = chunk => { output = (output + chunk.toString()).slice(-32000); };
  child.stdout.on('data', collect); child.stderr.on('data', collect);
  const deadline = setTimeout(() => child.kill('SIGKILL'), 240000);
  try {
    const [code, signal] = await once(child, 'exit');
    assert.equal(signal, null, output);
    assert.equal(code, 0, output);
    return output;
  } finally { clearTimeout(deadline); }
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const finished = once(child, 'exit');
  child.kill('SIGTERM');
  const deadline = setTimeout(() => child.kill('SIGKILL'), 10000);
  try { await finished; } finally { clearTimeout(deadline); }
}

try {
  if (!process.env.DSH_TEST_RUNTIME) {
    console.log(`Preparing published DSH ${version} in an isolated test directory…`);
    await mkdir(runtime, { recursive: true });
    await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--prefix', runtime, '--no-audit', '--no-fund', `@deepseek-ai/dsh@${version}`]);
  }
  const cliDir = join(runtime, 'node_modules', '@deepseek-ai', 'dsh');
  assert.equal(JSON.parse(await readFile(join(cliDir, 'package.json'), 'utf8')).version, version);
  const cli = join(cliDir, 'lib', 'bin.js');
  const bootFile = join(runtime, 'node_modules', '@deepseek-ai', 'dsh-app-boot', 'lib', 'index.js');
  const { evaluatePluginCompatibility } = await import(pathToFileURL(bootFile).href);
  assert.equal(evaluatePluginCompatibility(manifest, {}, version), undefined);
  const previous = structuredClone(manifest);
  previous.version = '0.1.0';
  for (const peer of Object.keys(previous.peerDependencies)) {
    if (peer.startsWith('@deepseek-ai/dsh-')) previous.peerDependencies[peer] = '^0.2.1-alpha.1';
  }
  if (version === '0.2.0-rc.2') assert.equal(evaluatePluginCompatibility(previous, {}, version)?.exempted, false, 'reproduce the previous release rejection');
  assert.ok(evaluatePluginCompatibility(manifest, {}, '0.2.0-rc.1'), 'unverified versions remain incompatible');

  await mkdir(profile, { recursive: true });
  await writeFile(join(profile, 'package.json'), JSON.stringify({ name: 'coopanion-install-profile', private: true, dependencies: {}, dsh: { profile: { bundles: [] } } }));
  await writeFile(join(profile, 'pnpm-workspace.yaml'), 'packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\n');
  console.log(`Installing ${manifest.name}@${manifest.version} with the real DSH ${version} plugin command…`);
  const installLog = await run(process.execPath, [cli, 'plugin', '--profile', profileName, 'add', archive]);
  assert.ok(!installLog.includes('installation rejected'), installLog);
  const installedProfile = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'));
  assert.ok(installedProfile.dependencies[manifest.name]);
  assert.ok(installedProfile.dsh.profile.bundles.includes(manifest.name), 'installer discovers and activates the packaged bundle');
  assert.equal(existsSync(join(profile, 'compatibility.json')), false, 'no risk exemption is used');
  const installed = join(profile, 'node_modules', manifest.name);
  assert.equal(JSON.parse(await readFile(join(installed, 'package.json'), 'utf8')).version, manifest.version);

  // A test overlay supplies real host services; the released bundle and its apply() are unchanged.
  const fixture = fileURLToPath(new URL('./fixtures/host.mjs', import.meta.url));
  await writeFile(join(profile, 'cordis.patch.yml'), `- insert:\n    - id: install-sessions\n      name: '@deepseek-ai/dsh-session'\n    - id: install-agents\n      name: '@deepseek-ai/dsh-agent'\n    - id: install-observer\n      name: ${JSON.stringify(fixture)}\n- id: dsh-coopanion\n  config:\n    size: 150\n    roam: false\n    notifications: true\n    bubbleDurationMs: 12000\n`);
  if (process.platform === 'linux' && !environment.DISPLAY) {
    const number = 100 + process.pid % 1000;
    display = spawn(process.env.XVFB_PATH ?? 'Xvfb', [`:${number}`, '-screen', '0', '1200x800x24', '-nolisten', 'tcp'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let displayError; display.on('error', error => { displayError = error; });
    for (let n = 0; n < 30 && !existsSync(`/tmp/.X11-unix/X${number}`); n++) {
      if (displayError) throw displayError;
      if (display.exitCode !== null) throw new Error('Xvfb exited before creating its socket');
      await pause(100);
    }
    assert.ok(existsSync(`/tmp/.X11-unix/X${number}`), 'Xvfb is ready');
    environment.DISPLAY = `:${number}`;
  }
  const listener = createServer(); listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  environment.DSH_PET_TEST_DEBUG_PORT = String(port);
  console.log(`Starting the installed bundle through the published DSH ${version} profile loader…`);
  host = spawn(process.execPath, [cli, '--profile', profileName], { cwd: root, env: environment, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const collect = chunk => { hostLog = (hostLog + chunk.toString()).slice(-32000); };
  host.stdout.on('data', collect); host.stderr.on('data', collect);
  await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => finish(new Error(`Host startup timed out:\n${hostLog}`)), 120000);
    const ready = message => { if (message?.type === 'host-ready') finish(); };
    const ended = (code, signal) => finish(new Error(`Host exited ${signal ?? code}:\n${hostLog}`));
    const failed = error => finish(error);
    function finish(error) {
      clearTimeout(timeout); host.off('message', ready); host.off('exit', ended); host.off('error', failed);
      if (error) reject(error); else resolveReady();
    }
    host.on('message', ready); host.once('exit', ended); host.once('error', failed);
  });
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages()[0];
  await page.waitForSelector('#pet');
  assert.equal(await page.locator('#demo').isVisible(), false);
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  await page.waitForSelector('#pet[data-character=whale]');
  await page.locator('#pet').click({ button: 'right' }); await page.locator('#open-characters').click();
  await importCharacter(page, join(process.env.DSH_TEST_PACKAGE_DIR ?? project, 'paper-star.dshpet'));
  await page.waitForFunction(() => document.getElementById('character-select').value === 'paper-star' && !document.getElementById('character-use').disabled);
  await page.locator('#character-use').click(); await page.waitForSelector('#pet[data-character=paper-star]');
  host.send({ type: 'start-task' });
  await page.waitForFunction(() => document.getElementById('pet').dataset.mood === 'thinking');
  const logged = new Promise(resolveLog => {
    const receive = message => { if (message?.type === 'session-log') { host.off('message', receive); resolveLog(message.events); } };
    host.on('message', receive);
  });
  host.send({ type: 'finish-task' });
  await page.waitForFunction(() => document.getElementById('pet').dataset.mood === 'happy');
  await page.waitForSelector('#toast:not([hidden])');
  assert.match(await page.locator('#toast-title').innerText(), /任务完成/);
  assert.ok((await logged).includes('turn/end'), 'notification comes from the real host session log');
  await mkdir(join(project, 'artifacts'), { recursive: true });
  await page.screenshot({ path: join(project, 'artifacts', `installed-${version}.png`) });
  await stop(host);
  assert.equal(host.exitCode, 0, hostLog);
  await writeFile(join(project, 'artifacts', `install-${version}.json`), JSON.stringify({ dsh: version, plugin: `${manifest.name}@${manifest.version}`, package: archive, installed: true, profileLoader: true, nativeWindow: true, customCharacter: true, sessionNotifications: true, riskExemption: false, cleanShutdown: true }, null, 2) + '\n');
  console.log(`Installation smoke passed on DSH ${version}: package admission, bundle activation, actual host loader, Electron window, session notification, and clean shutdown.`);
} catch (error) {
  if (hostLog) console.error(hostLog);
  throw error;
} finally {
  await stop(host);
  if (browser) await browser.close();
  await stop(display);
  await rm(root, { recursive: true, force: true });
}
