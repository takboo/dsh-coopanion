/** Test-only app mounted by the published DSH CLI, using its real session store. */
export const inject = ['sessions', 'appReady', 'webServer', 'connection', 'settings'];

export function apply(ctx) {
  let session;
  const sessions = new Map();
  const action = async message => {
    if (message?.type === 'start-task') {
      const id = message.sessionId ?? 'host-install';
      session = ctx.sessions.create(id, { meta: { cwd: id === 'host-install' ? '/test/安装验证' : '/test/第二会话' } });
      sessions.set(id, session);
      session.append('turn/start', { turn: 1 });
    } else if (message?.type === 'finish-task' && (session = sessions.get(message.sessionId ?? 'host-install'))) {
      session.append('turn/end', { turn: 1, reason: { kind: 'completed' } });
      process.send?.({ type: 'session-log', events: session.log.map(event => event.type) });
    } else if (message?.type === 'follow-system-language') {
      try {
        await ctx.settings.mutate('locale', [{ op: 'unset', path: ['preference'] }]);
        process.send?.({ type: 'system-language-ready' });
      } catch (error) { process.send?.({ type: 'system-language-ready', error: String(error) }); }
    }
  };
  ctx.effect(() => {
    process.on('message', action);
    return () => process.off('message', action);
  });
  ctx.effect(() => ctx.appReady.onReady(async () => {
    const fibers = [...ctx.registry.values()].flatMap(runtime => [...runtime.fibers]).filter(fiber => fiber.parent.fiber.runtime?.name === 'dsh-coopanion');
    const errors = [];
    for (const fiber of fibers) { try { await fiber.await(); } catch (error) { errors.push(String(error)); } }
    const descriptor = ctx.settings.describe().find(entry => entry.ns === 'dsh-coopanion');
    process.send?.({ type: 'host-ready', url: ctx.connection.authenticatedUrl(`http://127.0.0.1:${ctx.webServer.port}/`), services: { errors, customSettingsPage: descriptor?.autoGenerate === false, preferences: descriptor?.value } });
  }));
}
