import { it, expect, vi } from 'vitest';
import { Context } from '@deepseek-ai/cordis';
import { SessionId, SessionSeq, type Session } from '@deepseek-ai/dsh-session';
import { Config, mountPet } from '../src/index.ts';
import type { PetBridge } from '../src/bridge.ts';
import type { Agent } from '@deepseek-ai/dsh-agent';

it('uses the real Cordis event bus, delegates approval, logs user input through the agent, and releases resources', async () => {
  const ctx = new Context();
  const session = { id: SessionId('live'), header: { origin: undefined, version: 4, id: SessionId('live'), createdAt: 0, isSeeded: false, cwd: '/project/live' } } as Session;
  const followup = vi.fn();
  const agent: Agent = {
    id: session.id, session, followup, ctx, options: {}, status: 'idle',
    inbox: { nextTurn: [], nextStep: [], clear() {}, append() {}, prepend() {}, replace: () => false, remove: () => false, splice: () => [] },
    cancel() {}, send() {}, steer() {}, inject() {}, whenIdle: async () => {},
    runMaintenance: task => task(new AbortController().signal),
  };
  ctx.provide('agents', { list: () => [agent], withInitiator: (_agent: Agent, fn: () => void) => fn() });
  let action: ((action: unknown) => void) | undefined;
  const bridge: PetBridge = { start: vi.fn(async () => {}), update: vi.fn(), notify: vi.fn(), onAction: fn => { action = fn; }, removeAction: () => { action = undefined; }, dispose: vi.fn(async () => {}) };
  const fiber = ctx.plugin(async ctx => mountPet(ctx, Config(), bridge));
  await fiber.await();
  expect(bridge.start).toHaveBeenCalledOnce();
  ctx.emit('session/event', session, { seq: SessionSeq(0), type: 'turn/start', data: { turn: 1 }, time: 0 });
  expect(bridge.update).toHaveBeenLastCalledWith(expect.objectContaining({ mood: 'thinking' }));
  const delegated = vi.fn(async () => ({ status: 'denied' }));
  const outcome = await ctx.waterfall('approval/request', { agent, toolName: 'bash' }, delegated as never);
  expect(outcome).toEqual({ status: 'denied' }); expect(delegated).toHaveBeenCalledOnce();
  expect(bridge.notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'live · 等你确认' }));
  action?.({ type: 'chat', sessionId: 'live', text: '  你好  ' });
  expect(followup).toHaveBeenCalledWith(expect.objectContaining({ role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '你好' }] }));
  expect(followup.mock.calls[0][0].id).toBeTruthy();
  action?.({ type: 'chat', sessionId: 'missing', text: 'send somewhere else' });
  action?.({ type: 'chat', sessionId: 'live', text: 'x'.repeat(2001) });
  expect(followup).toHaveBeenCalledTimes(1);
  await fiber.dispose(); expect(action).toBeUndefined(); expect(bridge.dispose).toHaveBeenCalledOnce();
  await ctx.fiber.dispose();
});

it('rejects invalid configuration before starting a desktop process', () => {
  expect(() => Config({ ...Config(), size: 500 })).toThrow();
  expect(() => Config({ ...Config(), bubbleDurationMs: 0 })).toThrow();
});
