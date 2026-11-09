import { it, expect } from 'vitest';
import { build } from 'esbuild';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ElectronBridge as Bridge } from '../src/bridge.ts';
import type { PetControls as Controls } from '../src/controls.ts';

// Keep Electron's real lazy-install entrypoint; replace only the download with
// a deterministic slow installer and a tiny IPC peer, without network access.
async function fixture(install = '') {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-first-electron-'));
  const electron = join(directory, 'node_modules/electron');
  const previous = process.env.ELECTRON_OVERRIDE_DIST_PATH;
  const previousDisplay = process.env.WAYLAND_DISPLAY;
  if (process.platform === 'linux') process.env.WAYLAND_DISPLAY = 'test-only';
  delete process.env.ELECTRON_OVERRIDE_DIST_PATH;
  let bridge: Bridge | undefined;
  const close = async () => {
    await bridge?.dispose();
    if (previous !== undefined) process.env.ELECTRON_OVERRIDE_DIST_PATH = previous;
    if (previousDisplay === undefined) delete process.env.WAYLAND_DISPLAY; else process.env.WAYLAND_DISPLAY = previousDisplay;
    await rm(directory, { recursive: true, force: true });
  };
  try {
    await mkdir(electron, { recursive: true });
    await writeFile(join(directory, 'package.json'), '{"type":"module"}');
    await writeFile(join(electron, 'package.json'), '{"main":"index.js"}');
    await writeFile(join(electron, 'index.js'), await readFile(createRequire(import.meta.url).resolve('electron')));
    await mkdir(join(directory, 'desktop'));
    await writeFile(join(directory, 'desktop/main.cjs'), `process.on('message', m => { if(m.type === 'quit') process.exit(0); }); process.send({type:'ready'});`);
    // A real executable plus a JS main works on Windows as well as POSIX;
    // spawning a shebang-only fixture silently omitted the Windows regression.
    const success = `setTimeout(()=>{fs.mkdirSync(path.join(__dirname,'dist'));const executable=path.join(__dirname,'dist/peer.exe');try{fs.linkSync(process.execPath,executable);}catch(error){if(!['EXDEV','EPERM','EACCES'].includes(error.code))throw error;fs.copyFileSync(process.execPath,executable);fs.chmodSync(executable,0o700);}fs.writeFileSync(path.join(__dirname,'path.txt'),'peer.exe');},800);`;
    await writeFile(join(electron, 'install.js'), `const fs=require('node:fs'),path=require('node:path');fs.writeFileSync(path.join(__dirname,'installer-pid'),String(process.pid));${install || success}`);
    await build({ stdin: { contents: "export { ElectronBridge } from './src/bridge.ts'; export { PetControls } from './src/controls.ts';", resolveDir: process.cwd() }, outfile: join(directory, 'dist/bridge.mjs'), bundle: true, packages: 'external', platform: 'node', format: 'esm' });
    const { ElectronBridge, PetControls } = await import(pathToFileURL(join(directory, 'dist/bridge.mjs')).href);
    bridge = new ElectronBridge();
    return { bridge: bridge!, electron, close, PetControls: PetControls as typeof Controls };
  } catch (error) { await close(); throw error; }
}
const options = { size: 150, roam: false, notifications: false, bubbleDurationMs: 12000 };
it('keeps the Host event loop responsive during Electron first-run preparation', async () => {
  const { bridge, close } = await fixture();
  const ticks: number[] = [];
  const timer = setInterval(() => ticks.push(performance.now()), 20);
  try {
    const began = performance.now();
    ticks.push(began);
    const starting = bridge.start(options);
    const returnedAfter = performance.now() - began;
    await starting;
    ticks.push(performance.now());
    expect(returnedAfter, 'start must yield while Electron installs').toBeLessThan(250);
    expect(Math.max(...ticks.slice(1).map((time, i) => time - ticks[i])), 'Host timers must continue during installation').toBeLessThan(500);
  } finally {
    clearInterval(timer);
    await close();
  }
}, 15000);

it('reports installer failure without launching a native window', async () => {
  const { bridge, close } = await fixture('process.exit(7);');
  try { await expect(bridge.start(options)).rejects.toMatchObject({ recoverable: false, message: expect.stringContaining('(7)') }); }
  finally { await close(); }
});

it('keeps a refused download actionable and shares the attempt with queued start commands', async () => {
  const { bridge, electron, close, PetControls } = await fixture(`
    fs.appendFileSync(path.join(__dirname, 'attempts'), 'started\\n');
    setTimeout(() => {
      console.error('HTTPError: Response code 403 (Forbidden) for https://mirror.invalid/file?token=secret');
      console.error('private stack '.repeat(1024));
      process.exitCode = 1;
    }, 200);`);
  const controls = new PetControls(bridge, () => options);
  try {
    const starting = controls.command('start');
    await Promise.resolve();
    expect(controls.status().phase).toBe('starting');
    const results = await Promise.all([starting, controls.command('start'), controls.command('show')]);
    for (const status of results) {
      expect(status).toMatchObject({ phase: 'error', recoveryAttempt: 0, runtimeFailure: { reason: 'http', httpStatus: 403 } });
      expect(status.error).not.toMatch(/mirror\.invalid|secret|private stack/);
    }
    expect(await readFile(join(electron, 'attempts'), 'utf8')).toBe('started\n');
    await controls.command('start');
    expect(await readFile(join(electron, 'attempts'), 'utf8')).toBe('started\nstarted\n');
  } finally { await controls.dispose(); await close(); }
});

it('cancels runtime preparation, reaps its installer and rejects a concurrent start', async () => {
  const { bridge, electron, close } = await fixture('setInterval(()=>{},1000);');
  const controller = new AbortController();
  const starting = bridge.start(options, { signal: controller.signal, generation: 1 });
  const rejected = expect(starting).rejects.toThrow('启动已取消');
  try {
    await expect(bridge.start(options)).rejects.toThrow('already running or starting');
    let pid = 0;
    for (let i = 0; i < 100 && !pid; i++) {
      try { pid = Number(await readFile(join(electron, 'installer-pid'), 'utf8')); }
      catch { await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    expect(pid).toBeGreaterThan(0);
    controller.abort(); await bridge.dispose(); await rejected;
    expect(() => process.kill(pid, 0)).toThrow();
  } finally { await close(); }
});

it('direct disposal cancels preparation even without a caller lifetime', async () => {
  const { bridge, close } = await fixture('setInterval(()=>{},1000);');
  const starting = bridge.start(options);
  const rejected = expect(starting).rejects.toThrow('启动已取消');
  try { await bridge.dispose(); await rejected; }
  finally { await close(); }
});
