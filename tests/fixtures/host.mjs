/** Test-only app mounted by the published DSH CLI, using its real session store. */
export const inject = ['sessions', 'appReady'];

export function apply(ctx) {
  let session;
  const action = message => {
    if (message?.type === 'start-task') {
      session = ctx.sessions.create('host-install', { meta: { cwd: '/test/安装验证' } });
      session.append('turn/start', { turn: 1 });
    } else if (message?.type === 'finish-task' && session) {
      session.append('turn/end', { turn: 1, reason: { kind: 'completed' } });
      process.send?.({ type: 'session-log', events: session.log.map(event => event.type) });
    }
  };
  ctx.effect(() => {
    process.on('message', action);
    return () => process.off('message', action);
  });
  ctx.effect(() => ctx.appReady.onReady(() => process.send?.({ type: 'host-ready' })));
}
