import { it, expect } from 'vitest';
import { createSpeech } from '../web/speech.js';
import { shortSessionIds } from '../web/session-ui.js';
import tray from '../desktop/tray-state.cjs';

it('keeps the visible Unicode prefix and punctuation pause when live speech is extended', () => {
  const node = { textContent: '' }, spoken = [];
  const speech = createSpeech({ text: '你好，', node, onCharacter: ch => spoken.push(ch) });
  speech.step(.1); expect(node.textContent).toBe('你好');
  expect(speech.update('你好，🐳继续')).toBe(true); expect(node.textContent).toBe('你好');
  speech.step(.05); expect(node.textContent).toBe('你好，');
  speech.step(.1); expect(node.textContent).toBe('你好，');
  speech.step(.3); expect(node.textContent).toBe('你好，🐳继续');
  expect(spoken).toEqual(['你', '好', '🐳', '继', '续']);
  expect(speech.update('另一段')).toBe(false);
});

it('distinguishes host IDs with the same session prefix and collision-prone first six characters', () => {
  const ids = shortSessionIds([{ id: 'session-abcdef-111' }, { id: 'session-abcdef-222' }, { id: 'session-987654321' }]);
  expect(new Set(ids.values()).size).toBe(3);
  expect([...ids.values()].every(id => !id.startsWith('session-'))).toBe(true);
});

it('projects selected session, appearance, visibility and preferences into the macOS status bar', () => {
  const snapshot = { sessionId: 'b', mood: 'talking', active: true, sessions: [{ id: 'a', label: '菜单' }, { id: 'b', label: '修复同步', mood: 'talking' }] };
  const state = tray.trayState(snapshot, { characterId: 'whale', scheme: 'harness', name: '大肥鱼', sleeping: true, sound: false }, { roam: false, notifications: false }, true);
  expect(state).toMatchObject({ sessionId: 'b', sessionLabel: '修复同步', mood: 'talking', title: '回复', sleeping: false, characterId: 'whale', scheme: 'harness', visible: true, roam: false, notifications: false, sound: false });
  expect(state.sessions.map(s => s.selected)).toEqual([true, false]);
  expect(state.tooltip).toContain('正在回复');
  expect(tray.trayState({ ...snapshot, mood: 'idle', active: false }, { sleeping: true }).title).toBe('休息');
});
