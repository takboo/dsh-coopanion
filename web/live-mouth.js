const BURST_MS = 1200;
const PULSE_INTERVAL_MS = 180;

export function createLiveMouth() {
  let seen = new Map(), burstUntil = -Infinity, nextPulseAt = -Infinity;
  return {
    update(snapshot, now) {
      const sessions = snapshot.sessions?.length ? snapshot.sessions
        : snapshot.sessionId ? [{ ...snapshot, id: snapshot.sessionId }] : [];
      const current = new Map();
      let talking = false, fresh = false;
      for (const session of sessions) {
        const hasSpeechProgress = Number.isSafeInteger(session.speechRevision);
        // Older snapshots and the demo only carry presentation revisions.
        const progress = hasSpeechProgress ? session.speechRevision : session.revision ?? 0;
        const previous = seen.get(session.id);
        const lastProgress = previous?.hasSpeechProgress === hasSpeechProgress ? previous.progress : -Infinity;
        current.set(session.id, { hasSpeechProgress, progress: Math.max(lastProgress, progress) });
        if (session.mood !== 'talking' || session.active === false || session.streaming === false) continue;
        talking = true;
        if (progress > lastProgress && (!hasSpeechProgress || progress > 0)) fresh = true;
      }
      seen = current;
      if (!talking) burstUntil = nextPulseAt = -Infinity;
      else if (fresh) burstUntil = now + BURST_MS;
    },
    pulse(now, enabled) {
      if (!enabled) burstUntil = nextPulseAt = -Infinity;
      if (now >= burstUntil || now < nextPulseAt) return false;
      nextPulseAt = now + PULSE_INTERVAL_MS;
      return true;
    },
  };
}
