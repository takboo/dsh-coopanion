/** Strip the uninformative host prefix and extend IDs only when necessary to distinguish them. */
export function shortSessionIds(sessions) {
  const ids = sessions.map(s => s.id.replace(/^session[-_:]/, '') || s.id);
  return new Map(sessions.map((session, i) => {
    let length = Math.min(6, ids[i].length);
    while (length < ids[i].length && ids.some((id, j) => j !== i && id.slice(0, length) === ids[i].slice(0, length))) length++;
    return [session.id, ids[i].slice(0, length)];
  }));
}

export function sessionTime(session) {
  const time = session.updatedAt || session.createdAt;
  return time ? new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(time) : '时间未记录';
}

/** One focus for chat, one aggregate signal for work happening elsewhere. */
export function sessionActivity(snapshot) {
  const sessions = snapshot.sessions ?? [];
  const waiting = sessions.filter(s => s.mood === 'waiting');
  const errors = sessions.filter(s => s.mood === 'error');
  const unread = sessions.reduce((n, s) => n + (s.unread ?? 0), 0);
  const busy = sessions.filter(s => s.active ?? ['thinking', 'talking', 'working'].includes(s.mood));
  const focusedActive = snapshot.active ?? ['thinking', 'talking', 'working'].includes(snapshot.mood);
  const background = sessions.filter(s => s.id !== snapshot.sessionId);
  const pending = background.filter(s => s.unread || ['waiting', 'error'].includes(s.mood));
  const fallback = errors[0]?.mood ?? waiting[0]?.mood ?? busy[0]?.mood;
  const mood = focusedActive || ['waiting', 'error', 'happy'].includes(snapshot.mood) ? snapshot.mood : fallback ?? snapshot.mood ?? 'idle';
  return { mood, active: focusedActive || busy.length > 0, waiting: waiting.length, errors: errors.length, unread, busy: busy.length, pending: pending.length,
    icon: errors.length ? 'error' : waiting.length ? 'waiting' : mood === 'idle' && unread ? 'unread' : mood };
}
