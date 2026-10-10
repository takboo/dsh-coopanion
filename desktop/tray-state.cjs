const labels = { idle: '陪伴中', thinking: '正在思考', talking: '正在回复', working: '正在工作', waiting: '等待确认', happy: '任务完成', error: '需要关注', sleeping: '休息中' };

/** Desktop and status bar project the same host snapshot and acknowledged preferences. */
function trayState(snapshot = {}, presentation = {}, options = {}, visible = false) {
  const selected = snapshot.sessions?.find(session => session.id === snapshot.sessionId);
  const active = snapshot.active ?? ['thinking', 'talking', 'working', 'waiting'].includes(snapshot.mood);
  const mood = !active && presentation.sleeping ? 'sleeping' : snapshot.mood ?? 'idle';
  const name = presentation.name || 'DeepSeek 大肥鱼';
  return { name, characterId: presentation.characterId || 'whale', scheme: presentation.scheme || '', iconReady: !!presentation.ready, mood, active, sleeping: mood === 'sleeping', visible, roam: options.roam ?? true, notifications: options.notifications ?? true, sound: presentation.sound ?? true,
    sessionId: snapshot.sessionId ?? null, sessionLabel: selected?.label ?? '还没有会话',
    sessions: [...(snapshot.sessions ?? [])].sort((a, b) => Number(b.id === snapshot.sessionId) - Number(a.id === snapshot.sessionId) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).map(session => ({ id: session.id, label: session.label, project: session.project, selected: session.id === snapshot.sessionId, mood: session.mood })),
    tooltip: `${name} · ${labels[mood] ?? labels.idle}\n${selected?.label ?? '还没有会话'}`,
    title: { thinking: '思考', talking: '回复', working: '工作', waiting: '确认', happy: '完成', error: '关注', sleeping: '休息' }[mood] ?? '',
  };
}
module.exports = { trayState };
