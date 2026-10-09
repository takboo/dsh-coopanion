/** Test-only app mounted by the published DSH CLI, using its real session store. */
export const inject = ['sessions', 'appReady', 'webServer', 'connection', 'settings'];

export function apply(ctx) {
  let session;
  const action = async message => {
    if (message?.type === 'start-task') {
      session = ctx.sessions.create('host-install', { meta: { cwd: '/test/安装验证' } });
      session.append('turn/start', { turn: 1 });
    } else if (message?.type === 'finish-task' && session) {
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
