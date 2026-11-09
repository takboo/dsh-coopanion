import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { RuntimePreparationError } from './desktop-lifecycle.ts';

function installerFailure(stderr: string, code: number | null): RuntimePreparationError {
  // Electron prints the error before its stack. Only extract allowlisted
  // diagnostics: URLs can contain credentials and stacks expose local paths.
  const summary = stderr.split(/\r?\n/, 1)[0] ?? '';
  const status = /^HTTPError: Response code ([45]\d\d)\b/.exec(summary);
  if (status) return new RuntimePreparationError({ reason: 'http', httpStatus: Number(status[1]) });
  if (/\b(?:ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ENETUNREACH|ETIMEDOUT)\b|^TypeError: fetch failed\b/.test(summary)) {
    return new RuntimePreparationError({ reason: 'network' });
  }
  return new RuntimePreparationError({ reason: 'install' }, code === null ? undefined : String(code));
}

// Electron 44's index.js may spawnSync its installer. Resolve files without
// executing that entrypoint, then prepare missing binaries off the Host loop.
export async function electronExecutable(signal: AbortSignal): Promise<string> {
  let directory: string;
  try { directory = dirname(createRequire(import.meta.url).resolve('electron')); }
  catch { throw new RuntimePreparationError({ reason: 'unavailable' }); }
  async function installed(): Promise<string | undefined> {
    let relative: string;
    try { relative = await readFile(join(directory, 'path.txt'), 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; relative = ''; }
    if (process.env.ELECTRON_OVERRIDE_DIST_PATH) return join(process.env.ELECTRON_OVERRIDE_DIST_PATH, relative || 'electron');
    if (!relative) return;
    const executable = join(directory, 'dist', relative);
    try { await access(executable); return executable; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  if (signal.aborted) throw new Error('桌宠启动已取消');
  const existing = await installed();
  if (existing) return existing;
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new Error('桌宠启动已取消')); return; }
    const child = spawn(process.execPath, [join(directory, 'install.js')], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true,
    });
    let stderr = '';
    child.stderr.on('data', (data: Buffer) => {
      if (stderr.length < 512) stderr += data.subarray(0, 512 - stderr.length).toString();
    });
    let failure: Error | undefined, killTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = (error: Error) => {
      if (failure) return;
      failure = error; child.kill();
      killTimer = setTimeout(() => child.kill('SIGKILL'), 1000);
    };
    const aborted = () => stop(new Error('桌宠启动已取消'));
    const timer = setTimeout(() => stop(new RuntimePreparationError({ reason: 'timeout' })), 240_000);
    signal.addEventListener('abort', aborted, { once: true });
    const finish = (error?: Error) => {
      clearTimeout(timer); clearTimeout(killTimer); signal.removeEventListener('abort', aborted);
      if (failure || error) reject(failure ?? error); else resolve();
    };
    child.once('error', () => { failure ??= new RuntimePreparationError({ reason: 'unavailable' }); });
    child.once('close', code => finish(code === 0 ? undefined : installerFailure(stderr, code)));
    if (signal.aborted) aborted();
  });
  if (signal.aborted) throw new Error('桌宠启动已取消');
  const executable = await installed();
  if (!executable) throw new RuntimePreparationError({ reason: 'unavailable' });
  return executable;
}
