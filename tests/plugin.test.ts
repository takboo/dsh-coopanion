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
  expect(() => Config({ size: 500 })).toThrow();
  expect(() => Config({ bubbleDurationMs: 0 })).toThrow();
});

it('keeps the plugin mounted when launch fails, and honors disabled auto-start', async () => {
  const ctx = new Context(); ctx.provide('agents', { list: () => [] });
  const bridge: PetBridge = { start: vi.fn(async () => { throw new Error('test: no display'); }), update: vi.fn(), notify: vi.fn(), onAction: vi.fn(), removeAction: vi.fn(), dispose: vi.fn(async () => {}) };
  const fiber = ctx.plugin(async scope => mountPet(scope, Config({ autoStart: false }), bridge));
  await fiber.await(); expect(bridge.start).not.toHaveBeenCalled();
  expect(ctx.coopanion.status().phase).toBe('stopped');
  expect((await ctx.coopanion.command('start')).phase).toBe('error');
  expect(ctx.coopanion.status().error).toBe('test: no display');
  await fiber.dispose(); await ctx.fiber.dispose();
});

it('registers and disposes exact authenticated Connection routes without taking over the shared Gateway', async () => {
  const ctx = new Context(); ctx.provide('agents', { list: () => [] });
  const routes = new Map<string, { fetch: (request: Request) => Promise<Response> }>();
  ctx.provide('connection', { fetch: { register: (route: { path: string; fetch: (request: Request) => Promise<Response> }) => { routes.set(route.path, route); return () => { routes.delete(route.path); }; } } } as never);
  const bridge: PetBridge = { start: vi.fn(async () => {}), update: vi.fn(), notify: vi.fn(), onAction: vi.fn(), removeAction: vi.fn(), dispose: vi.fn(async () => {}) };
  const fiber = ctx.plugin(async scope => mountPet(scope, Config({ autoStart: false }), bridge)); await fiber.await();
  expect([...routes.keys()]).toEqual(['/api/coopanion/status', '/api/coopanion/control']);
  const invoke = async (payload: unknown) => {
    const response = await routes.get('/api/coopanion/control')!.fetch(new Request('http://localhost/api/coopanion/control', { method: 'POST', body: JSON.stringify({ type: 'client-request', rpcId: 'test', method: 'coopanion/control', payload }) }));
    return response.json();
  };
  expect((await invoke({ command: 'start', electronPath: '/untrusted' })).result.ok).toBe(false);
  expect(bridge.start).not.toHaveBeenCalled();
  expect(await invoke({ command: 'start' })).toEqual({ type: 'server-response', rpcId: 'test', result: { ok: true, value: { phase: 'running', visible: true } } });
  const malformed = await routes.get('/api/coopanion/status')!.fetch(new Request('http://localhost/api/coopanion/status', { method: 'POST', body: '{}' }));
  expect(malformed.status).toBe(400);
  await fiber.dispose(); expect(routes.size).toBe(0); await ctx.fiber.dispose();
});
