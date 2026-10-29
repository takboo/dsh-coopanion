// Loaded only by the controlled native lifecycle probe. No paths, URLs or text.
const { app, BrowserWindow } = require('electron');
function trace(phase) {
  let windows = [], inspectionFailed = false;
  const resources = {};
  try {
    windows = app.isReady() ? BrowserWindow.getAllWindows().map(win => ({
      destroyed: win.isDestroyed(), visible: !win.isDestroyed() && win.isVisible(),
      loading: !win.isDestroyed() && !win.webContents.isDestroyed() && win.webContents.isLoading(),
    })) : [];
    for (const name of process.getActiveResourcesInfo()) resources[name] = (resources[name] ?? 0) + 1;
  } catch { inspectionFailed = true; }
  try { if (process.connected) process.send({ type: 'lifecycle-shutdown-trace', phase, windows, resources, inspectionFailed }, () => {}); } catch {}
}
process.prependListener('message', message => {
  if (message?.type !== 'quit') return;
  trace('quit-received');
  setImmediate(() => trace('quit-immediate'));
  setTimeout(() => trace('quit-after-one-second'), 1000).unref();
});
app.on('browser-window-created', (_event, win) => {
  win.on('close', () => trace('window-close'));
  win.on('closed', () => trace('window-closed'));
});
for (const event of ['before-quit', 'will-quit', 'quit']) app.on(event, () => trace(event));
