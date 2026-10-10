import { basename } from 'node:path';
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session';
import type { AssistantStreamFrame } from '@deepseek-ai/dsh-agent';

export type Mood = 'idle' | 'thinking' | 'talking' | 'working' | 'waiting' | 'happy' | 'error' | 'sleeping';
export interface PetSession { id: string; label: string; project: string; cwd: string; prompt: string; createdAt: number; updatedAt: number; mood: Mood; text: string; reply: string; revision: number; active: boolean; streaming: boolean; speechId: string; chatAvailable?: boolean; }
export interface PetSnapshot { mood: Mood; text: string; sessionId: string | null; revision: number; active: boolean; streaming: boolean; speechId: string; sessions: PetSession[]; }
export interface PetNotice { title: string; body: string; sessionId: string; }
interface TaskState { seq: number; turn: number; active: boolean; tools: Map<string, string>; approvals: Set<symbol>; celebrateUntil: number; stream?: { id: string; revision: number; index: number; text: string; blocks: Map<number, string> }; }
type ObservedSession = Pick<Session, 'id' | 'header'> & Partial<Pick<Session, 'snapshotEvents'>>;
const ready = '准备好了，随时叫我。';

/** Keeps independent task states so background sessions cannot overwrite the selected conversation. */
export class PetModel {
  private sessions = new Map<string, PetSession>();
  private selected: string | null = null;
  private tasks = new Map<string, TaskState>();
  constructor(private readonly now: () => number = Date.now) {}

  observe(session: ObservedSession): PetSession | undefined {
    if (session.header.origin === 'subagent') return;
    let item = this.sessions.get(session.id);
    if (!item) {
      // Bound retained presentation state; live Harness sessions remain owned by the host.
      if (this.sessions.size >= 100) {
        const old = [...this.sessions.keys()].find(id => id !== this.selected);
        if (old) { this.sessions.delete(old); this.tasks.delete(old); }
      }
      const project = session.header.cwd ? basename(session.header.cwd) : '未指定项目';
      item = { id: session.id, label: project, project, cwd: session.header.cwd ?? '', prompt: '', createdAt: session.header.createdAt, updatedAt: session.header.createdAt, mood: 'idle', text: ready, reply: '', revision: 0, active: false, streaming: false, speechId: '' };
      this.sessions.set(session.id, item);
      this.tasks.set(session.id, { seq: -1, turn: 0, active: false, tools: new Map(), approvals: new Set(), celebrateUntil: 0 });
      this.selected ??= session.id;
      // Restore identity from public history, without replaying stale task states or notices.
      for (const event of session.snapshotEvents?.() ?? []) this.describe(item, event);
    }
    return item;
  }

  private describe(item: PetSession, event: SessionEvent): void {
    if (event.type !== 'user/message' || event.data.source.kind !== 'user') return;
    const text = event.data.content.filter(p => p.type === 'text').map(p => p.text).join(' ').replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (!item.prompt) item.label = Array.from(text).slice(0, 64).join('');
    item.prompt = Array.from(text).slice(0, 160).join(''); item.updatedAt = event.time;
  }

  /** Live chunks are not session events. Keep attempt identity and ordering separate from durable seq. */
  stream(session: ObservedSession, frame: AssistantStreamFrame): boolean {
    const item = this.observe(session);
    if (!item) return false;
    const task = this.tasks.get(item.id)!;
    if (frame.type === 'start') {
      if (frame.turn < task.turn || (frame.turn === task.turn && !task.active && task.seq >= 0) || (task.stream && frame.revision <= task.stream.revision)) return false;
      task.turn = frame.turn; task.active = true;
      task.stream = { id: frame.attemptId, revision: frame.revision, index: -1, text: '', blocks: new Map() };
      item.streaming = true; item.speechId = frame.attemptId;
      if (!task.tools.size && !task.approvals.size) this.present(item, 'thinking', '正在思考…');
      return true;
    }
    const stream = task.stream;
    if (!task.active || !stream || stream.id !== frame.attemptId || stream.revision !== frame.revision || frame.index <= stream.index) return false;
    stream.index = frame.index;
    if (frame.type === 'end') {
      item.streaming = false;
      if (frame.outcome.kind === 'abandoned' && !task.tools.size && !task.approvals.size) this.present(item, 'thinking', '正在重新准备回复…');
      return true;
    }
    const chunk = frame.chunk;
    if (chunk.type === 'text-delta' || (chunk.type === 'block-end' && chunk.block.type === 'text')) {
      if (chunk.type === 'text-delta') stream.blocks.set(chunk.index, ((stream.blocks.get(chunk.index) ?? '') + chunk.text).slice(0, 1200));
      else if (chunk.block.type === 'text') stream.blocks.set(chunk.index, chunk.block.text.slice(0, 1200));
      stream.text = [...stream.blocks.entries()].sort(([a], [b]) => a - b).map(([, text]) => text).join('\n').slice(0, 1200);
      if (stream.text.trim()) {
        item.reply = stream.text;
        if (!task.tools.size && !task.approvals.size) this.present(item, 'talking', item.reply);
      }
    } else if (chunk.type === 'reasoning-delta' && !stream.text && !task.tools.size && !task.approvals.size) {
      // The pet signals reasoning without exposing private reasoning content.
      this.present(item, 'thinking', '正在思考…');
    }
    return true;
  }

  detached(id: string): void { const task = this.tasks.get(id); if (task) task.stream = undefined; }

  idle(id: string): void {
    const item = this.sessions.get(id), task = this.tasks.get(id);
    if (!item || !task?.active) return;
    task.active = false; task.stream = undefined; task.tools.clear(); task.approvals.clear(); item.streaming = false;
    this.present(item, 'idle', ready);
  }

  /** A newly-created foreground conversation should immediately become visible. */
  created(session: Pick<Session, 'id' | 'header'>): boolean {
    const item = this.observe(session);
    if (!item) return false;
    this.selected = item.id;
    const task = this.tasks.get(item.id)!;
    if (!task.active && item.mood === 'idle') {
      this.present(item, 'happy', '发现新会话啦！我已经准备好了。');
      task.celebrateUntil = this.now() + 2500;
    }
    return true;
  }

  /** Baseline already-running agents without replaying old completion notifications. */
  running(session: Pick<Session, 'id' | 'header'>): void {
    const item = this.observe(session);
    if (!item || this.tasks.get(item.id)!.active) return;
    this.tasks.get(item.id)!.active = true;
    this.present(item, 'thinking', '正在处理当前会话…');
  }

  private present(item: PetSession, mood: Mood, text: string): void {
    item.active = this.tasks.get(item.id)!.active;
    if (item.mood === mood && item.text === text) return;
    item.mood = mood; item.text = text; item.revision++;
  }

  /** Celebration has a deadline independent of UI refreshes or other sessions. */
  settle(): boolean {
    let changed = false;
    for (const [id, task] of this.tasks) {
      if (!task.celebrateUntil || this.now() < task.celebrateUntil) continue;
      task.celebrateUntil = 0;
      const item = this.sessions.get(id)!;
      if (!task.active && item.mood === 'happy') { this.present(item, 'idle', ready); changed = true; }
    }
    return changed;
  }

  consume(session: Pick<Session, 'id' | 'header'>, event: SessionEvent): PetNotice | undefined {
    const item = this.observe(session);
    if (!item) return;
    const task = this.tasks.get(item.id)!;
    if (event.seq <= task.seq) return;
    task.seq = event.seq;
    this.describe(item, event);
    // Late results from a previous turn cannot overwrite a newer turn.
    if ('turn' in event.data && event.data.turn < task.turn) return;
    switch (event.type) {
      case 'turn/start':
        task.turn = event.data.turn; task.active = true; task.tools.clear(); task.approvals.clear(); task.celebrateUntil = 0;
        task.stream = undefined; item.reply = ''; item.streaming = false; item.speechId = ''; item.updatedAt = event.time;
        this.present(item, 'thinking', '让我想一想…'); break;
      case 'step/start':
        task.active = true;
        if (!task.approvals.size && !task.tools.size) this.present(item, 'thinking', '正在思考…'); break;
      case 'tool/call':
        if (!task.active) break;
        task.tools.set(event.data.callId, event.data.name);
        if (!task.approvals.size) this.present(item, 'working', toolLabel(event.data.name)); break;
      case 'tool/result':
        if (!task.active) break;
        task.tools.delete(event.data.message.toolCallId);
        if (task.approvals.size) break;
        if (task.tools.size) { this.present(item, 'working', toolLabel(task.tools.values().next().value!)); break; }
        if (event.data.message.isError) {
          this.present(item, 'error', '这一步遇到了问题，正在处理。');
        } else { this.present(item, 'thinking', '这一步完成了，继续想想…'); }
        break;
      case 'assistant/message': {
        const text = event.data.message.content.filter(p => p.type === 'text').map(p => p.text).join('\n');
        if (!task.active) break;
        item.streaming = false;
        if (text.trim()) { item.reply = text.slice(0, 1200); if (!task.tools.size && !task.approvals.size) this.present(item, 'talking', item.reply); }
        break;
      }
      case 'turn/end': {
        task.turn = event.data.turn; task.active = false; task.tools.clear(); task.approvals.clear(); task.celebrateUntil = 0;
        task.stream = undefined; item.streaming = false;
        switch (event.data.reason.kind) {
          case 'completed':
            this.present(item, 'happy', item.reply || '任务完成啦！🐳'); task.celebrateUntil = this.now() + 2500;
            return { title: `${item.label} · 任务完成`, body: item.text.slice(0, 180), sessionId: item.id };
          case 'error':
            this.present(item, 'error', '任务遇到了问题，请回到 Harness 查看详情。');
            return { title: `${item.label} · 需要关注`, body: item.text, sessionId: item.id };
          case 'blocked':
          case 'max-tokens':
            this.present(item, 'waiting', '任务暂时停下了，请回到 Harness 看看。');
            return { title: `${item.label} · 任务暂停`, body: item.text, sessionId: item.id };
          default:
            this.present(item, 'idle', '任务已停止，我在这里等你。');
        }
      }
    }
  }

  approval(id: string, tool: string, token: symbol = Symbol()): PetNotice | undefined {
    const item = this.sessions.get(id);
    if (!item) return;
    const task = this.tasks.get(id)!; task.active = true; task.approvals.add(token); task.celebrateUntil = 0;
    this.present(item, 'waiting', `${toolLabel(tool)}前需要你确认，请回到 Harness。`);
    return { title: `${item.label} · 等你确认`, body: item.text, sessionId: id };
  }

  approvalSettled(id: string, token?: symbol): void {
    const item = this.sessions.get(id);
    const task = this.tasks.get(id);
    if (!item || !task?.active) return;
    if (token ? !task.approvals.delete(token) : !task.approvals.size) return;
    if (!token) task.approvals.clear();
    if (!task.approvals.size && item.mood === 'waiting') {
      this.present(item, task.tools.size ? 'working' : 'thinking', task.tools.size ? toolLabel(task.tools.values().next().value!) : '确认已处理，等待任务继续…');
    }
  }

  select(id: string): boolean {
    if (!this.sessions.has(id)) return false;
    this.selected = id; return true;
  }

  remove(id: string): void {
    this.sessions.delete(id);
    this.tasks.delete(id);
    if (this.selected === id) this.selected = this.sessions.keys().next().value ?? null;
  }

  snapshot(): PetSnapshot {
    const item = this.selected ? this.sessions.get(this.selected) : undefined;
    this.settle();
    return { mood: item?.mood ?? 'idle', text: item?.text ?? '你好。打开 Harness 会话后就能和我聊天。', sessionId: item?.id ?? null, revision: item?.revision ?? 0, active: item?.active ?? false, streaming: item?.streaming ?? false, speechId: item?.speechId ?? '', sessions: [...this.sessions.values()].map(s => ({ ...s })) };
  }
}

function toolLabel(name: string): string {
  if (/read|cat|view/.test(name)) return '正在看文件';
  if (/search|grep|find/.test(name)) return '正在查找';
  if (/write|edit|patch/.test(name)) return '正在写代码';
  if (/bash|shell|exec|terminal/.test(name)) return '正在运行命令';
  if (/web|browse|fetch/.test(name)) return '正在浏览';
  return `正在使用 ${name.slice(0, 60)}`;
}
