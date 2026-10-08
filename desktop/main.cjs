const { app, BrowserWindow, ipcMain, Notification, screen, Menu, Tray, nativeImage } = require('electron');
const { join } = require('node:path');
app.setName('小鲸');
if (process.env.DSH_PET_TEST_DATA_DIR) {
  app.setPath('userData', process.env.DSH_PET_TEST_DATA_DIR);
  app.setPath('crashDumps', join(process.env.DSH_PET_TEST_DATA_DIR, 'crashes'));
}
if (process.platform === 'win32') app.setAppUserModelId('dev.takboo.dsh-coopanion');

// Used only by the virtual-display test; normal installations retain Chromium's sandbox.
if (process.env.DSH_PET_TEST_NO_SANDBOX === '1') app.commandLine.appendSwitch('no-sandbox');
if (process.env.DSH_PET_TEST_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
  app.commandLine.appendSwitch('remote-debugging-port', process.env.DSH_PET_TEST_DEBUG_PORT);
}
app.commandLine.appendSwitch('disable-gpu');
let win, tray, options, lastFrame, poll;
let interactive = null;
const notices = new Set();
function forward(message) { if (win && !win.isDestroyed()) win.webContents.send('pet:update', message); }
function hit(active) {
  if (!win || win.isDestroyed() || active === interactive) return;
  interactive = active;
  win.setIgnoreMouseEvents(!active, { forward: true });
}
function show() { win?.showInactive(); }
function bounds() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  return display.workArea;
}

process.on('message', message => {
  if (!message || typeof message !== 'object') return;
  if (message.type === 'quit') { app.quit(); return; }
  if (message.type === 'init') { options = message.options; lastFrame = message; forward(message); }
  if (message.type === 'snapshot') { lastFrame = { type: 'init', options, snapshot: message.snapshot }; forward(message); }
  if (message.type === 'notice') {
    forward(message);
    if (options?.notifications && Notification.isSupported()) {
      const notice = new Notification({ title: message.notice.title, body: message.notice.body, silent: true });
      notices.add(notice);
      notice.on('close', () => notices.delete(notice));
      notice.on('click', () => { show(); process.send?.({ type: 'action', action: { type: 'select', sessionId: message.notice.sessionId } }); });
      notice.show();
    }
  }
});
process.on('disconnect', () => app.quit());
process.on('SIGTERM', () => app.quit());

app.whenReady().then(async () => {
  win = new BrowserWindow({ ...screen.getPrimaryDisplay().workArea, transparent: true, frame: false, resizable: false, skipTaskbar: true, hasShadow: false, show: false, alwaysOnTop: true, backgroundColor: '#00000000', webPreferences: { preload: join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (process.platform === 'darwin') app.dock?.hide();
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('did-finish-load', () => { if (lastFrame) forward(lastFrame); });
  ipcMain.on('pet:hit', (event, active) => { if (event.sender === win.webContents && typeof active === 'boolean') hit(active); });
  ipcMain.on('pet:action', (event, action) => {
    if (event.sender !== win.webContents || !action || typeof action !== 'object') return;
    if (action.type === 'hide') { win.hide(); return; }
    if (action.type === 'move-display') { win.setBounds(bounds()); forward({ type: 'display-changed' }); return; }
    if (action.type !== 'chat' && action.type !== 'select') return;
    process.send?.({ type: 'action', action });
  });
  await win.loadFile(join(__dirname, '../web/index.html'));
  hit(false); show();
  // Pointer polling restores hit testing even when a click-through page receives no mousemove.
  poll = setInterval(() => {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    const p = screen.getCursorScreenPoint(), b = win.getBounds();
    forward({ type: 'cursor', x: p.x - b.x, y: p.y - b.y });
  }, 100);
  const icon = nativeImage.createFromPath(join(__dirname, 'icon.png')).resize({ width: 24, height: 20 });
  tray = new Tray(icon); tray.setToolTip('小鲸 · DeepSeek Harness');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: '显示小鲸', click: show }, { label: '隐藏小鲸', click: () => win.hide() }, { type: 'separator' }, { label: '关闭桌宠', click: () => app.quit() }]));
  tray.on('click', show);
  screen.on('display-removed', () => { win.setBounds(screen.getPrimaryDisplay().workArea); forward({ type: 'display-changed' }); });
  screen.on('display-metrics-changed', () => { const b = win.getBounds(); win.setBounds(screen.getDisplayMatching(b).workArea); forward({ type: 'display-changed' }); });
  process.send?.({ type: 'ready' });
}).catch(error => { console.error(error); app.exit(1); });

app.on('before-quit', () => { clearInterval(poll); for (const notice of notices) notice.close(); tray?.destroy(); });
app.on('window-all-closed', () => app.quit());
