import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-user-approval';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import z from '@deepseek-ai/schemastery';
import { ElectronBridge, isRecord, type PetBridge, type DesktopOptions } from './bridge.ts';
import { PetModel } from './model.ts';

export const name = 'dsh-coopanion';
export const inject = ['agents'];
export interface Config extends DesktopOptions {}
export const Config: z<Config> = z.object({
  size: z.number().min(90).max(240).default(150),
  roam: z.boolean().default(true),
  notifications: z.boolean().default(true),
  bubbleDurationMs: z.number().min(2000).max(60000).default(12000),
  electronPath: z.string(),
});

/** Mounts the pet on public Harness events, delegates approvals, and routes explicit user chat to a selected live agent. */
export async function apply(ctx: Context, config: Config): Promise<void> {
  await mountPet(ctx, Config(config), new ElectronBridge());
}

/** Shared assembly used by integration tests with an IPC substitute for the native window. */
export async function mountPet(ctx: Context, options: Config, bridge: PetBridge): Promise<void> {
  const model = new PetModel();
  const update = () => bridge.update(model.snapshot());
  const notice = (value: ReturnType<PetModel['consume']>) => { if (value && options.notifications) bridge.notify(value); };
  ctx.effect(() => () => bridge.dispose());
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
  await bridge.start(options);
}
