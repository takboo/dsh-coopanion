import { describe, it, expect } from 'vitest';
import { PetModel } from '../src/model.ts';
import { SessionId, SessionSeq, type SessionEvent, type Session } from '@deepseek-ai/dsh-session';
import { createAssistantMessage, createToolResultMessage, ToolCallId } from '@deepseek-ai/dsh-llm';

function session(id: string, origin?: 'subagent'): Pick<Session, 'id' | 'header'> {
  return { id: SessionId(id), header: { version: 4, id: SessionId(id), createdAt: 0, isSeeded: false, cwd: `/project/${id}`, origin } };
}
let seq = 0;
function event<T extends SessionEvent['type']>(type: T, data: Extract<SessionEvent, { type: T }>['data']): SessionEvent {
  return { type, data, seq: SessionSeq(seq++), time: 0 } as SessionEvent;
}
describe('Harness task presentation', () => {
  it('shows task work and assistant replies, then issues a completion notification', () => {
    const m = new PetModel(), s = session('one');
    m.consume(s, event('turn/start', { turn: 1 })); expect(m.snapshot().mood).toBe('thinking');
    m.consume(s, event('tool/call', { turn: 1, step: 1, name: 'read_file', callId: ToolCallId('t1'), arguments: '{}' }));
    expect(m.snapshot().text).toBe('正在看文件');
    const message = createAssistantMessage({ content: [{ type: 'text', text: '做好了！' }], source: { provider: 'test', model: 'test' } });
    m.consume(s, event('assistant/message', { turn: 1, step: 1, message, stream: [] }));
    expect(m.consume(s, event('turn/end', { turn: 1, reason: { kind: 'completed' } }))?.body).toBe('做好了！');
    expect(m.snapshot().mood).toBe('happy');
  });
  it('keeps background sessions and subagents from changing the selected task', () => {
    const m = new PetModel(), a = session('one'), b = session('two');
    m.consume(a, event('turn/start', { turn: 1 }));
    const n = m.consume(b, event('turn/end', { turn: 1, reason: { kind: 'completed' } }));
    expect(n?.sessionId).toBe('two'); expect(m.snapshot().sessionId).toBe('one'); expect(m.snapshot().mood).toBe('thinking');
    m.consume(session('child', 'subagent'), event('turn/start', { turn: 1 }));
    expect(m.snapshot().sessions).toHaveLength(2); expect(m.select('missing')).toBe(false);
    m.select('two'); expect(m.snapshot().mood).toBe('happy');
    m.remove('two'); expect(m.snapshot().sessionId).toBe('one');
  });
  it('distinguishes canceled, blocked and failed turns from successful completion', () => {
    const m = new PetModel(), s = session('one');
    m.consume(s, event('turn/start', { turn: 1 }));
    expect(m.consume(s, event('turn/end', { turn: 1, reason: { kind: 'interrupted' } }))).toBeUndefined();
    expect(m.snapshot().mood).toBe('idle');
    expect(m.consume(s, event('turn/end', { turn: 2, reason: { kind: 'blocked' } }))?.title).toContain('暂停');
    expect(m.consume(s, event('turn/end', { turn: 3, reason: { kind: 'error', error: { code: 'UNKNOWN', message: 'test' } } }))?.title).toContain('需要关注');
    expect(m.snapshot().mood).toBe('error');
  });
  it('does not erase a settled task when an approval finishes late', () => {
    const m = new PetModel(), s = session('one'); m.observe(s);
    expect(m.approval('one', 'bash')?.title).toContain('确认');
    m.consume(s, event('turn/end', { turn: 1, reason: { kind: 'completed' } }));
    m.approvalSettled('one'); expect(m.snapshot().mood).toBe('happy');
  });
  it('returns to idle after completion without extending its deadline on selection or background activity', () => {
    let now = 1000;
    const m = new PetModel(() => now), a = session('one'), b = session('two');
    m.consume(a, event('turn/start', { turn: 1 }));
    const completed = event('turn/end', { turn: 1, reason: { kind: 'completed' } });
    expect(m.consume(a, completed)?.sessionId).toBe('one');
    const revision = m.snapshot().revision;
    expect(m.consume(a, completed)).toBeUndefined();
    now += 1500; m.consume(b, event('turn/start', { turn: 1 }));
    m.select('two'); m.select('one'); expect(m.snapshot().revision).toBe(revision);
    now += 1000; expect(m.settle()).toBe(true); expect(m.snapshot().mood).toBe('idle');
    expect(m.snapshot().text).not.toContain('完成');
    expect(m.settle()).toBe(false);
  });
  it('starts with the current running task and cancels a previous celebration when a new turn begins', () => {
    let now = 1000; const m = new PetModel(() => now), s = session('one');
    m.running(s); expect(m.snapshot().mood).toBe('thinking');
    m.consume(s, event('turn/end', { turn: 1, reason: { kind: 'completed' } }));
    m.consume(s, event('turn/start', { turn: 2 }));
    now += 10000; expect(m.settle()).toBe(false); expect(m.snapshot().mood).toBe('thinking');
  });
  it('keeps working until all parallel tools finish and waiting until all approvals finish', () => {
    const m = new PetModel(), s = session('one');
    m.consume(s, event('turn/start', { turn: 1 }));
    for (const id of ['a', 'b']) m.consume(s, event('tool/call', { turn: 1, step: 1, callId: ToolCallId(id), name: 'bash', arguments: '{}' }));
    const first = Symbol(), second = Symbol(); m.approval('one', 'bash', first); m.approval('one', 'bash', second);
    m.approvalSettled('one', first); expect(m.snapshot().mood).toBe('waiting');
    m.approvalSettled('one', second); expect(m.snapshot().mood).toBe('working');
    for (const id of ['a', 'b']) {
      m.consume(s, event('tool/result', { turn: 1, step: 1, message: createToolResultMessage({ callId: ToolCallId(id), content: [], isError: false }) }));
      expect(m.snapshot().mood).toBe(id === 'a' ? 'working' : 'thinking');
    }
  });
  it('ignores stale turn events and approval settlements from a previous turn', () => {
    const m = new PetModel(), s = session('one'), old = Symbol(), current = Symbol();
    m.consume(s, event('turn/start', { turn: 1 })); m.approval('one', 'bash', old);
    m.consume(s, event('turn/end', { turn: 1, reason: { kind: 'completed' } }));
    m.consume(s, event('turn/start', { turn: 2 })); m.approval('one', 'bash', current);
    m.approvalSettled('one', old); expect(m.snapshot().mood).toBe('waiting');
    expect(m.consume(s, event('turn/end', { turn: 1, reason: { kind: 'completed' } }))).toBeUndefined();
    expect(m.snapshot().mood).toBe('waiting');
    m.approvalSettled('one', current); expect(m.snapshot().mood).toBe('thinking');
  });
});
