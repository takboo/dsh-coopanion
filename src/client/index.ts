import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { PetStatus } from '../controls.ts';
import { Settings, type SettingsFace, type Preferences } from './Settings.tsx';
import { en, zh, type LocaleKey } from './locales.ts';
import css from './settings.css';

declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { coopanion: LocaleKey; } }
declare module '@deepseek-ai/cordis' { interface Context { connection: ConnectionHandle; } }
export const inject = ['slots', 'locale', 'configForms', 'connection'];

/** A regular DSH settings section, using Host forms and the authenticated Connection carrier. */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('coopanion', { zh, en }));
  ctx.effect(() => {
    const tag = document.createElement('style'); tag.dataset.plugin = 'dsh-coopanion'; tag.textContent = css;
    document.head.append(tag); return () => tag.remove();
  });
  const face: SettingsFace = {
    form: ctx.configForms.get<Preferences>('dsh-coopanion'),
    local: ctx.connection.isLoopback,
    call: async (command, signal) => {
      const reply = await ctx.connection.rpc.call('/api', command ? 'coopanion/control' : 'coopanion/status', command ? { command } : {}, signal);
      if (!reply.ok) throw new Error(reply.error.message);
      const value = reply.value as PetStatus;
      if (!value || !['stopped', 'starting', 'running', 'stopping', 'error'].includes(value.phase) || typeof value.visible !== 'boolean') throw new Error('Invalid desktop pet status');
      return value;
    },
  };
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'dsh-coopanion', order: 60,
    label: () => ctx.locale.bind('coopanion')('nav'), locale: 'coopanion', inject: () => face,
  }, Settings));
  ctx.inject(['uiWorkspace'], child => {
    if (!ctx.connection.isLoopback) return;
    child.effect(() => {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout>;
      const poll = async () => {
        try {
          const result = await ctx.connection.rpc.call('/api', 'coopanion/navigation', {}, controller.signal);
          if (result.ok && result.value && !controller.signal.aborted) {
            const value = result.value as { sessionId?: unknown };
            if (typeof value.sessionId === 'string') { child.uiWorkspace.openSession(value.sessionId as SessionId); window.focus(); }
          }
        } catch { /* Connection recovery owns transport errors. */ }
        finally { if (!controller.signal.aborted) timer = setTimeout(poll, 750); }
      };
      void poll(); return () => { controller.abort(); clearTimeout(timer); };
    });
  });
}
