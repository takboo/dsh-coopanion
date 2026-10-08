import { describe, it, expect } from 'vitest';
import { PetModel } from '../src/model.ts';
import { SessionId, SessionSeq, type SessionEvent, type Session } from '@deepseek-ai/dsh-session';
import { createAssistantMessage, ToolCallId } from '@deepseek-ai/dsh-llm';

function session(id: string, origin?: 'subagent'): Pick<Session, 'id' | 'header'> {
  return { id: SessionId(id), header: { version: 4, id: SessionId(id), createdAt: 0, isSeeded: false, cwd: `/project/${id}`, origin } };
}
function event<T extends SessionEvent['type']>(type: T, data: Extract<SessionEvent, { type: T }>['data']): SessionEvent {
  return { type, data, seq: SessionSeq(0), time: 0 } as SessionEvent;
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
});
