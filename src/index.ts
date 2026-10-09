import type { Context, Volatile } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-settings';
import type {} from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-user-approval';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import z from '@deepseek-ai/schemastery';
import { ElectronBridge, isRecord, type PetBridge, type DesktopOptions } from './bridge.ts';
import { PetModel } from './model.ts';
import { PetControls } from './controls.ts';
import { z as wire } from 'zod';

export const name = 'dsh-coopanion';
export const inject = ['agents'];
export interface Config {
  size: Volatile<number>; roam: Volatile<boolean>; notifications: Volatile<boolean>;
  bubbleDurationMs: Volatile<number>; autoStart: Volatile<boolean>; electronPath?: string;
}
export const Config = z.object({
  size: z.number().min(90).max(240).default(150).volatile(),
  roam: z.boolean().default(true).volatile(),
  notifications: z.boolean().default(true).volatile(),
  bubbleDurationMs: z.number().min(2000).max(60000).default(12000).volatile(),
  autoStart: z.boolean().default(true).volatile(),
  electronPath: z.string(),
});

/** Mounts the pet on public Harness events, delegates approvals, and routes explicit user chat to a selected live agent. */
export async function apply(ctx: Context, config: Config): Promise<void> {
  ctx.inject(['settings'], child => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)); });
  await mountPet(ctx, config, new ElectronBridge());
}

/** Shared assembly used by integration tests with an IPC substitute for the native window. */
export async function mountPet(ctx: Context, options: Config, bridge: PetBridge): Promise<void> {
  const model = new PetModel();
  const currentOptions = (): DesktopOptions => ({ size: options.size.get(), roam: options.roam.get(), notifications: options.notifications.get(), bubbleDurationMs: options.bubbleDurationMs.get(), electronPath: options.electronPath });
  const controls = new PetControls(bridge, currentOptions);
  ctx.provide('coopanion', controls);
  const update = () => bridge.update(model.snapshot());
  const notice = (value: ReturnType<PetModel['consume']>) => { if (value && options.notifications.get()) bridge.notify(value); };
  ctx.effect(() => () => controls.dispose());
  ctx.on('settings/document-updated', ns => { if (ns === 'dsh-coopanion') controls.configure(); });
  ctx.inject(['connection'], child => {
    const dispatch = async (endpoint: string, payload: unknown, signal: AbortSignal) => {
      try {
        if (signal.aborted) throw new Error('请求已取消');
        if (endpoint === 'status') {
          wire.object({}).strict().parse(payload);
          return { ok: true, value: controls.status() };
        }
        if (endpoint !== 'control') throw new Error('未知的桌宠操作');
        const { command } = wire.object({ command: wire.enum(['start', 'show', 'hide', 'restart', 'stop', 'characters']) }).strict().parse(payload);
        return { ok: true, value: await controls.command(command) };
      } catch (error) { return { ok: false, error: { code: 'coopanion/rejected', message: String(error instanceof Error ? error.message : error).slice(0, 600), details: {} } }; }
    };
    // Exact Connection routes coexist with the Gateway's exclusive /api interceptor.
    // The Connection carrier applies its normal Host/Origin and authentication checks.
    for (const endpoint of ['status', 'control'] as const) {
      child.effect(() => child.connection.fetch.register({
        path: `/api/coopanion/${endpoint}`, methods: ['POST'], requestBody: 'buffered',
        fetch: async request => {
          const parsed = wire.object({ type: wire.literal('client-request'), rpcId: wire.string().min(1).max(128), method: wire.literal(`coopanion/${endpoint}`), payload: wire.unknown() }).strict().safeParse(await request.json().catch(() => undefined));
          if (!parsed.success) return Response.json({ error: 'Invalid desktop pet request' }, { status: 400 });
          return Response.json({ type: 'server-response', rpcId: parsed.data.rpcId, result: await dispatch(endpoint, parsed.data.payload, request.signal) });
        },
      }));
    }
  });
  for (const agent of ctx.agents.list()) model.observe(agent.session);
  ctx.on('agent/created', ({ agent }) => { model.observe(agent.session); update(); return undefined; });
  ctx.on('session/event', (session, event) => { notice(model.consume(session, event)); update(); });
  ctx.on('session/disposed', session => { model.remove(session.id); update(); });
  ctx.on('approval/request', async (request, next) => {
    model.observe(request.agent.session);
    notice(model.approval(request.agent.id, request.toolName)); update();
    try { return await next(); }
    finally { model.approvalSettled(request.agent.id); update(); }
  });
  const onAction = (action: unknown) => {
    if (!isRecord(action)) return;
    if (action.type === 'select' && typeof action.sessionId === 'string') { model.select(action.sessionId); update(); return; }
    if (action.type !== 'chat' || typeof action.text !== 'string' || typeof action.sessionId !== 'string') return;
    const text = action.text.trim();
    if (!text || text.length > 2000 || !model.select(action.sessionId)) return;
    const id = model.snapshot().sessionId;
    const agent = ctx.agents.list().find(agent => agent.id === id);
    if (!agent || agent.session.header.origin === 'subagent') { model.remove(action.sessionId); update(); return; }
    try {
      ctx.agents.withInitiator(agent, () => agent.followup(createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })));
      update();
    } catch (error) {
      bridge.notify({ title: '消息未能发送', body: '请回到 Harness 检查会话状态。', sessionId: action.sessionId });
      ctx.logger.warn(`Desktop pet chat failed: ${String(error)}`);
    }
  };
  ctx.effect(() => { bridge.onAction(onAction); return () => bridge.removeAction(onAction); });
  if (bridge instanceof ElectronBridge) {
    const onFailure = (error: Error) => ctx.logger.warn(error.message);
    ctx.effect(() => { bridge.on('failure', onFailure); return () => bridge.off('failure', onFailure); });
  }
  update();
  if (options.autoStart.get()) {
    const status = await controls.command('start');
    if (status.error) ctx.logger.warn(status.error);
  }
}

declare module '@deepseek-ai/cordis' { interface Context { coopanion: PetControls; } }
