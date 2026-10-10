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
