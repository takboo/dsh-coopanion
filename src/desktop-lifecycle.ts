/** Shared Host/native lifetime contract. Only explicitly recoverable failures retry. */
export interface StartLifetime { signal: AbortSignal; generation: number; visible?: boolean; }
export interface NativeLifecycle {
  running: boolean; visible: boolean; error?: string;
  generation?: number; visibilityRevision?: number; suspended?: boolean;
  desiredVisible?: boolean; unexpected?: boolean;
}
export class NativeStartError extends Error {
  constructor(message: string, readonly recoverable: boolean) { super(message); this.name = 'NativeStartError'; }
}

export type RuntimeFailure = { reason: 'http'; httpStatus: number } | { reason: 'network' | 'timeout' | 'unavailable' | 'install' };
export class RuntimePreparationError extends NativeStartError {
  constructor(readonly failure: RuntimeFailure, detail?: string) {
    const cause = failure.reason === 'http' ? `download rejected (HTTP ${failure.httpStatus})` : {
      network: 'download connection failed', timeout: 'download or installation timed out (240 seconds)',
      unavailable: 'installer or executable unavailable', install: 'installation failed',
    }[failure.reason];
    super(`Electron runtime is missing: ${cause}${detail ? ` (${detail})` : ''}. Prepare Electron or configure electronPath, then start the pet again.`, false);
  }
}
