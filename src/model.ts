import { basename } from 'node:path';
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session';

export type Mood = 'idle' | 'thinking' | 'working' | 'waiting' | 'happy' | 'error' | 'sleeping';
export interface PetSession { id: string; label: string; mood: Mood; text: string; reply: string; revision: number; chatAvailable?: boolean; }
export interface PetSnapshot { mood: Mood; text: string; sessionId: string | null; revision: number; sessions: PetSession[]; }
export interface PetNotice { title: string; body: string; sessionId: string; }
interface TaskState { seq: number; turn: number; active: boolean; tools: Map<string, string>; approvals: Set<symbol>; celebrateUntil: number; }
const ready = '准备好了，随时叫我。';

/** Keeps independent task states so background sessions cannot overwrite the selected conversation. */
export class PetModel {
  private sessions = new Map<string, PetSession>();
  private selected: string | null = null;
  private tasks = new Map<string, TaskState>();
  constructor(private readonly now: () => number = Date.now) {}

  observe(session: Pick<Session, 'id' | 'header'>): PetSession | undefined {
    if (session.header.origin === 'subagent') return;
    let item = this.sessions.get(session.id);
    if (!item) {
      // Bound retained presentation state; live Harness sessions remain owned by the host.
      if (this.sessions.size >= 100) {
        const old = [...this.sessions.keys()].find(id => id !== this.selected);
        if (old) { this.sessions.delete(old); this.tasks.delete(old); }
      }
      item = { id: session.id, label: session.header.cwd ? basename(session.header.cwd) : `会话 ${session.id.slice(0, 8)}`, mood: 'idle', text: ready, reply: '', revision: 0 };
      this.sessions.set(session.id, item);
      this.tasks.set(session.id, { seq: -1, turn: 0, active: false, tools: new Map(), approvals: new Set(), celebrateUntil: 0 });
      this.selected ??= session.id;
    }
    return item;
  }

  /** Baseline already-running agents without replaying old completion notifications. */
  running(session: Pick<Session, 'id' | 'header'>): void {
    const item = this.observe(session);
    if (!item || item.mood !== 'idle') return;
    this.tasks.get(item.id)!.active = true;
    this.present(item, 'thinking', '正在处理当前会话…');
  }

  private present(item: PetSession, mood: Mood, text: string): void {
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
    // Late results from a previous turn cannot overwrite a newer turn.
    if ('turn' in event.data && event.data.turn < task.turn) return;
    switch (event.type) {
      case 'turn/start':
        task.turn = event.data.turn; task.active = true; task.tools.clear(); task.approvals.clear(); task.celebrateUntil = 0;
        item.reply = ''; this.present(item, 'thinking', '让我想一想…'); break;
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
        if (text.trim()) { item.reply = text.slice(0, 500); if (!task.tools.size && !task.approvals.size) this.present(item, 'thinking', item.reply); }
        break;
      }
      case 'turn/end': {
        task.turn = event.data.turn; task.active = false; task.tools.clear(); task.approvals.clear(); task.celebrateUntil = 0;
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
    return { mood: item?.mood ?? 'idle', text: item?.text ?? '你好。打开 Harness 会话后就能和我聊天。', sessionId: item?.id ?? null, revision: item?.revision ?? 0, sessions: [...this.sessions.values()].map(s => ({ ...s })) };
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
