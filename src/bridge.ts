import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import type { PetSnapshot, PetNotice } from './model.ts';

export interface DesktopOptions { size: number; roam: boolean; notifications: boolean; bubbleDurationMs: number; electronPath?: string; }
export interface PetBridge {
  start(options: DesktopOptions): Promise<void>;
  update(snapshot: PetSnapshot): void;
  notify(notice: PetNotice): void;
  onAction(listener: (action: unknown) => void): void;
  removeAction(listener: (action: unknown) => void): void;
  dispose(): Promise<void>;
}

/** Owns a separate Electron window; no changes or private IPC in the Harness desktop shell are needed. */
export class ElectronBridge extends EventEmitter implements PetBridge {
  private child?: ChildProcess;
  private latest?: PetSnapshot;
  private closing = false;

  async start(options: DesktopOptions): Promise<void> {
    if (this.child) throw new Error('Desktop pet is already running');
    if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) throw new Error('桌宠需要桌面显示环境。无桌面的云环境可运行 npm run dev 预览，或用 Xvfb 运行桌面测试。');
    const executable: string = options.electronPath ?? createRequire(import.meta.url)('electron');
    const env = { ...process.env };
    // The Harness host runs Electron as Node; the pet needs a normal Electron GUI process.
    delete env.ELECTRON_RUN_AS_NODE;
    const args = [fileURLToPath(new URL('../desktop/main.cjs', import.meta.url))];
    if (env.DSH_PET_TEST_NO_SANDBOX === '1') args.unshift('--no-sandbox');
    const child = spawn(executable, args, { env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
    this.child = child;
    let diagnostic = '';
    child.stderr?.on('data', data => { diagnostic = (diagnostic + data.toString()).slice(-4000); });
    child.on('message', message => {
      if (isRecord(message) && message.type === 'action') this.emit('action', message.action);
    });
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer); child.off('message', ready); child.off('error', failed); child.off('exit', exited);
        if (error) { child.kill(); reject(error); } else resolve();
      };
      const ready = (message: unknown) => {
        if (isRecord(message) && message.type === 'ready') {
          this.send({ type: 'init', options, snapshot: this.latest }); finish();
        }
      };
      const failed = (error: Error) => { this.child = undefined; finish(error); };
      const exited = (code: number | null, signal: string | null) => { this.child = undefined; finish(new Error(`桌宠启动失败 (${signal ?? code}): ${diagnostic}`)); };
      const timer = setTimeout(() => finish(new Error(`桌宠未能在 20 秒内启动: ${diagnostic}`)), 20000);
      child.on('message', ready); child.once('error', failed); child.once('exit', exited);
    });
    child.on('error', error => this.emit('failure', error));
    child.once('exit', code => {
      this.child = undefined;
      if (!this.closing) this.emit('failure', new Error(`桌宠窗口已关闭 (${code})`));
    });
  }

  update(snapshot: PetSnapshot): void { this.latest = snapshot; this.send({ type: 'snapshot', snapshot }); }
  notify(notice: PetNotice): void { this.send({ type: 'notice', notice }); }
  onAction(listener: (action: unknown) => void): void { this.on('action', listener); }
  removeAction(listener: (action: unknown) => void): void { this.off('action', listener); }
  private send(message: object): void {
    if (this.child?.connected) this.child.send(message, error => { if (error && !this.closing) this.emit('failure', error); });
  }

  async dispose(): Promise<void> {
    this.closing = true;
    const child = this.child;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); }, 3000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      if (child.connected) child.send({ type: 'quit' }); else child.kill();
    });
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
