import type { DesktopOptions, PetBridge } from './bridge.ts';

export type PetCommand = 'start' | 'show' | 'hide' | 'restart' | 'stop' | 'characters';
export interface PetStatus { phase: 'stopped' | 'starting' | 'running' | 'stopping' | 'error'; visible: boolean; error?: string; }

/** The plugin outlives the native process. Commands share one queue, including disposal. */
export class PetControls {
  private state: PetStatus = { phase: 'stopped', visible: false };
  private queue: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private readonly changed = (event: { running: boolean; visible: boolean; error?: string }) => {
    if (this.state.phase === 'starting' || this.state.phase === 'stopping') return;
    this.state = { phase: event.error ? 'error' : event.running ? 'running' : 'stopped', visible: event.visible, ...(event.error ? { error: event.error } : {}) };
  };
  constructor(private readonly bridge: PetBridge, private readonly options: () => DesktopOptions) {
    bridge.onLifecycle?.(this.changed);
  }
  status(): PetStatus { return { ...this.state }; }
  configure(): void { this.bridge.configure?.(this.options()); }
  command(command: PetCommand): Promise<PetStatus> {
    return this.enqueue(async () => {
      if (this.disposed) throw new Error('桌宠插件已停用');
      try {
        if (command === 'stop' || command === 'restart') {
          this.state = { phase: 'stopping', visible: false };
          await this.bridge.dispose();
          this.state = { phase: 'stopped', visible: false };
        }
        if (command !== 'stop' && command !== 'hide' && this.state.phase !== 'running') {
          this.state = { phase: 'starting', visible: false };
          await this.bridge.start(this.options());
          this.state = { phase: 'running', visible: true };
        }
        if (this.state.phase === 'running') {
          this.bridge.control?.(command === 'characters' ? 'characters' : command === 'hide' ? 'hide' : 'show');
          this.state.visible = command !== 'hide';
        }
        return this.status();
      } catch (error) {
        await this.bridge.dispose();
        this.state = { phase: 'error', visible: false, error: String(error instanceof Error ? error.message : error).slice(0, 600) };
        return this.status();
      }
    });
  }
  async dispose(): Promise<void> {
    this.disposed = true;
    await this.enqueue(async () => {
      this.bridge.removeLifecycle?.(this.changed);
      await this.bridge.dispose(); this.state = { phase: 'stopped', visible: false };
    });
  }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const pending = this.queue.then(operation);
    this.queue = pending.catch(() => undefined);
    return pending;
  }
}
