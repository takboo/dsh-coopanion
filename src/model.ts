import { basename } from 'node:path';
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session';

export type Mood = 'idle' | 'thinking' | 'working' | 'waiting' | 'happy' | 'error' | 'sleeping';
export interface PetSession { id: string; label: string; mood: Mood; text: string; reply: string; }
export interface PetSnapshot { mood: Mood; text: string; sessionId: string | null; sessions: PetSession[]; }
export interface PetNotice { title: string; body: string; sessionId: string; }

/** Keeps independent task states so background sessions cannot overwrite the selected conversation. */
export class PetModel {
  private sessions = new Map<string, PetSession>();
  private selected: string | null = null;

  observe(session: Pick<Session, 'id' | 'header'>): PetSession | undefined {
    if (session.header.origin === 'subagent') return;
    let item = this.sessions.get(session.id);
    if (!item) {
      // Bound retained presentation state; live Harness sessions remain owned by the host.
      if (this.sessions.size >= 100) {
        const old = [...this.sessions.keys()].find(id => id !== this.selected);
        if (old) this.sessions.delete(old);
      }
      item = { id: session.id, label: session.header.cwd ? basename(session.header.cwd) : `会话 ${session.id.slice(0, 8)}`, mood: 'idle', text: '准备好了，随时叫我。', reply: '' };
      this.sessions.set(session.id, item);
      this.selected ??= session.id;
    }
    return item;
  }

  consume(session: Pick<Session, 'id' | 'header'>, event: SessionEvent): PetNotice | undefined {
    const item = this.observe(session);
    if (!item) return;
    switch (event.type) {
      case 'turn/start':
        item.mood = 'thinking'; item.text = '让我想一想…'; item.reply = ''; break;
      case 'step/start':
        item.mood = 'thinking'; item.text = '正在思考…'; break;
      case 'tool/call':
        item.mood = 'working'; item.text = toolLabel(event.data.name); break;
      case 'tool/result':
        if (event.data.message.isError) {
          item.mood = 'error'; item.text = '这一步遇到了问题，正在处理。';
        } else { item.mood = 'thinking'; item.text = '这一步完成了，继续想想…'; }
        break;
      case 'assistant/message': {
        const text = event.data.message.content.filter(p => p.type === 'text').map(p => p.text).join('\n');
        if (text.trim()) { item.reply = text.slice(0, 500); item.text = item.reply; }
        break;
      }
      case 'turn/end': {
        switch (event.data.reason.kind) {
          case 'completed':
            item.mood = 'happy'; item.text = item.reply || '任务完成啦！🐳';
            return { title: `${item.label} · 任务完成`, body: item.text.slice(0, 180), sessionId: item.id };
          case 'error':
            item.mood = 'error'; item.text = '任务遇到了问题，请回到 Harness 查看详情。';
            return { title: `${item.label} · 需要关注`, body: item.text, sessionId: item.id };
          case 'blocked':
          case 'max-tokens':
            item.mood = 'waiting'; item.text = '任务暂时停下了，请回到 Harness 看看。';
            return { title: `${item.label} · 任务暂停`, body: item.text, sessionId: item.id };
          default:
            item.mood = 'idle'; item.text = '任务已停止，我在这里等你。';
        }
      }
    }
  }

  approval(id: string, tool: string): PetNotice | undefined {
    const item = this.sessions.get(id);
    if (!item) return;
    item.mood = 'waiting'; item.text = `${toolLabel(tool)}前需要你确认，请回到 Harness。`;
    return { title: `${item.label} · 等你确认`, body: item.text, sessionId: id };
  }

  approvalSettled(id: string): void {
    const item = this.sessions.get(id);
    if (item?.mood === 'waiting') { item.mood = 'thinking'; item.text = '确认已处理，等待任务继续…'; }
  }

  select(id: string): boolean {
    if (!this.sessions.has(id)) return false;
    this.selected = id; return true;
  }

  remove(id: string): void {
    this.sessions.delete(id);
    if (this.selected === id) this.selected = this.sessions.keys().next().value ?? null;
  }

  snapshot(): PetSnapshot {
    const item = this.selected ? this.sessions.get(this.selected) : undefined;
    return { mood: item?.mood ?? 'idle', text: item?.text ?? '你好，我是小鲸。打开 Harness 会话后就能和我聊天。', sessionId: item?.id ?? null, sessions: [...this.sessions.values()].map(s => ({ ...s })) };
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
