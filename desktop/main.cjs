const { app, BrowserWindow, ipcMain, Notification, screen, Menu, Tray, nativeImage, shell } = require('electron');
const { join } = require('node:path');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { CharacterStore } = require('../dist/character-store.cjs');
const { createPetServer } = require('../dist/figure-server.cjs');
const { trayState } = require('./tray-state.cjs');
app.setName('DeepSeek 大肥鱼');
if (process.env.DSH_PET_TEST_DATA_DIR) {
  app.setPath('userData', process.env.DSH_PET_TEST_DATA_DIR);
  app.setPath('crashDumps', join(process.env.DSH_PET_TEST_DATA_DIR, 'crashes'));
}
if (process.platform === 'win32') app.setAppUserModelId('dev.takboo.dsh-coopanion');

// Used only by the virtual-display test; normal installations retain Chromium's sandbox.
if (process.env.DSH_PET_TEST_NO_SANDBOX === '1') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
}
if (process.env.DSH_PET_TEST_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
  app.commandLine.appendSwitch('remote-debugging-port', process.env.DSH_PET_TEST_DEBUG_PORT);
}
let win, tray, options, lastFrame, poll, assetServer, characters;
let presentation = {}, lastTrayKey, lastIconKey;
let interactive = null;
const notices = new Set();
function forward(message) { if (win && !win.isDestroyed()) win.webContents.send('pet:update', message); }
function hit(active) {
  if (!win || win.isDestroyed() || active === interactive) return;
  interactive = active;
  win.setIgnoreMouseEvents(!active, { forward: true });
  forward({ type: 'hit-state', active });
}
function show() { win?.showInactive(); syncTray(); }
function act(action) { process.send?.({ type: 'action', action }); }
function syncTray() {
  if (!tray || tray.isDestroyed()) return;
  const state = trayState(lastFrame?.snapshot, presentation, options, win?.isVisible());
  const key = JSON.stringify(state);
  if (key === lastTrayKey) return;
  lastTrayKey = key;
  tray.setToolTip(state.tooltip);
  if (process.platform === 'darwin') tray.setTitle(state.title);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `${state.name} · ${state.title || '陪伴中'}`, enabled: false },
    { label: state.sessionLabel, enabled: false },
    { label: '回到当前会话', enabled: !!state.sessionId, click: () => act({ type: 'open-session', sessionId: state.sessionId }) },
    { label: '切换陪伴会话', enabled: !!state.sessions.length, submenu: state.sessions.slice(0, 20).map(session => ({ type: 'radio', label: `${session.label} · ${session.id.replace(/^session[-_:]/, '').slice(-8)}`, checked: session.selected, click: () => act({ type: 'select', sessionId: session.id }) })) },
    { type: 'separator' },
    { label: '说句话', click: () => { show(); forward({ type: 'ui-control', command: 'chat' }); } },
    { label: '角色与配色', click: () => { show(); forward({ type: 'characters' }); } },
    { label: '自在走动', type: 'checkbox', checked: state.roam, click: item => act({ type: 'preference', field: 'roam', value: item.checked }) },
    { label: '休息一下（新任务会唤醒）', type: 'checkbox', checked: state.sleeping, enabled: !state.active, click: () => forward({ type: 'ui-control', command: 'sleep' }) },
    { label: '任务提醒', type: 'checkbox', checked: state.notifications, click: item => act({ type: 'preference', field: 'notifications', value: item.checked }) },
    { label: '动作与说话音效', type: 'checkbox', checked: state.sound, click: () => forward({ type: 'ui-control', command: 'sound' }) },
    { type: 'separator' },
    { label: state.visible ? '暂时藏起来' : '显示伙伴', click: () => state.visible ? win.hide() : show() },
    { label: '关闭桌宠', click: () => app.quit() },
  ]));
  process.send?.({ type: 'tray-state', state });
  const iconKey = `${state.characterId}:${state.scheme}:${state.iconReady}`;
  if (iconKey !== lastIconKey) { lastIconKey = iconKey; void syncIcon(state, iconKey); }
}
async function syncIcon(state, key) {
  try {
    const view = await characters.load(state.characterId);
    const thumb = view.presets.find(preset => preset.id === state.scheme)?.thumb ?? view.thumb;
    let icon = nativeImage.createFromPath(join(__dirname, 'icon.png'));
    if (thumb && /\.(png|webp|jpe?g)$/i.test(thumb)) {
      const response = await fetch(new URL(view.base + thumb, win.webContents.getURL()));
      const bytes = Buffer.from(await response.arrayBuffer());
      if (response.ok && bytes.length < 2 * 1024 * 1024) { const image = nativeImage.createFromBuffer(bytes); if (!image.isEmpty()) icon = image; }
    } else if (win?.isVisible() && state.iconReady) {
      const box = await win.webContents.executeJavaScript("(() => { const b = document.getElementById('pet').getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) }; })()");
      if (box.width > 0 && box.height > 0) { const image = await win.webContents.capturePage(box); if (!image.isEmpty()) icon = image; }
    }
    if (tray && !tray.isDestroyed() && lastIconKey === key) tray.setImage(icon.resize({ height: process.platform === 'darwin' ? 20 : 24 }));
  } catch { /* Keep the packaged icon when a custom pack has no raster thumbnail. */ }
}
function bounds() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  return display.workArea;
}

process.on('message', message => {
  if (!message || typeof message !== 'object') return;
  if (message.type === 'quit') { app.quit(); return; }
  if (message.type === 'init') { options = message.options; lastFrame = message; forward(message); syncTray(); }
  if (message.type === 'configure') { options = message.options; if (lastFrame) lastFrame.options = options; forward(message); syncTray(); }
  if (message.type === 'control') {
    if (message.command === 'hide') win?.hide();
    if (message.command === 'show' || message.command === 'characters') show();
    if (message.command === 'characters') forward({ type: 'characters' });
    // Fixed public Desktop protocol; no renderer-supplied URL or private shell IPC.
    if (message.command === 'focus-harness' && process.env.DSH_PET_TEST_NO_SANDBOX !== '1') void shell.openExternal('dsh://open').catch(() => {});
  }
  if (message.type === 'snapshot') { lastFrame = { type: 'init', options, snapshot: message.snapshot }; forward(message); syncTray(); }
  if (message.type === 'notice') {
    forward(message);
    if (options?.notifications && Notification.isSupported()) {
      const notice = new Notification({ title: message.notice.title, body: message.notice.body, silent: true });
      notices.add(notice);
      notice.on('close', () => notices.delete(notice));
      notice.on('click', () => { process.send?.({ type: 'action', action: { type: 'open-session', sessionId: message.notice.sessionId } }); });
      notice.show();
    }
  }
});
process.on('disconnect', () => app.quit());
process.on('SIGTERM', () => app.quit());

app.whenReady().then(async () => {
  const webRoot = join(__dirname, '../web');
  characters = new CharacterStore(join(app.getPath('userData'), 'figures-v2'), join(webRoot, 'upstream/whale'));
  const prefix = `/${randomBytes(24).toString('hex')}/`;
  assetServer = createPetServer({ webRoot, store: characters, prefix });
  assetServer.listen(0, '127.0.0.1'); await once(assetServer, 'listening');
  let characterOperation = Promise.resolve();
  const characterCall = (channel, operation) => ipcMain.handle(channel, (event, value) => {
    if (event.sender !== win?.webContents || event.senderFrame !== win.webContents.mainFrame) return { ok: false, error: '无效的角色请求' };
    const result = characterOperation.then(async () => {
      try { return { ok: true, value: await operation(value) }; }
      catch (error) { return { ok: false, error: String(error.message ?? error).slice(0, 400) }; }
    });
    characterOperation = result.then(() => undefined);
    return result;
  });
  const characterId = value => { if (typeof value !== 'string') throw new Error('无效的角色 id'); return value; };
  characterCall('pet:characters:list', () => characters.list());
  characterCall('pet:characters:load', value => characters.load(characterId(value)));
  characterCall('pet:characters:select', value => {
    if (!value || typeof value.scheme !== 'string') throw new Error('无效的角色配色');
    return characters.select(characterId(value.id), value.scheme);
  });
  characterCall('pet:characters:remove', value => characters.remove(characterId(value)));
  characterCall('pet:characters:import', value => {
    if (!(value instanceof ArrayBuffer)) throw new Error('请选择 API 2 ZIP 角色包');
    return characters.import(new Uint8Array(value));
  });
  win = new BrowserWindow({ ...screen.getPrimaryDisplay().workArea, transparent: true, frame: false, resizable: false, skipTaskbar: true, hasShadow: false, show: false, alwaysOnTop: true, backgroundColor: '#00000000', webPreferences: { preload: join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  win.setAlwaysOnTop(true, 'floating');
  const visibility = () => { process.send?.({ type: 'visibility', visible: win.isVisible() }); syncTray(); };
  win.on('show', visibility); win.on('hide', visibility);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (process.platform === 'darwin') app.dock?.hide();
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  win.webContents.on('did-finish-load', () => { if (lastFrame) forward(lastFrame); });
  ipcMain.on('pet:hit', (event, active) => { if (event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && typeof active === 'boolean') hit(active); });
  ipcMain.on('pet:action', (event, action) => {
    if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame || !action || typeof action !== 'object') return;
    if (action.type === 'hide') { win.hide(); return; }
    if (action.type === 'move-display') { win.setBounds(bounds()); forward({ type: 'display-changed' }); return; }
    if (action.type === 'presentation') {
      if (typeof action.characterId !== 'string' || !/^[a-z0-9-]{1,32}$/.test(action.characterId) || typeof action.scheme !== 'string' || action.scheme.length > 200 || typeof action.name !== 'string' || action.name.length > 200 || typeof action.sleeping !== 'boolean' || typeof action.sound !== 'boolean') return;
      presentation = { characterId: action.characterId, scheme: action.scheme, name: action.name, sleeping: action.sleeping, sound: action.sound, ready: action.ready === true }; syncTray(); return;
    }
    if (action.type !== 'chat' && action.type !== 'select' && action.type !== 'open-session' && action.type !== 'preference') return;
    process.send?.({ type: 'action', action });
  });
  await win.loadURL(`http://127.0.0.1:${assetServer.address().port}${prefix}`);
  hit(false); show();
  // Pointer polling restores hit testing even when a click-through page receives no mousemove.
  poll = setInterval(() => {
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    const p = screen.getCursorScreenPoint(), b = win.getBounds();
    forward({ type: 'cursor', x: p.x - b.x, y: p.y - b.y });
  }, 100);
  const icon = nativeImage.createFromPath(join(__dirname, 'icon.png')).resize({ height: 24 });
  tray = new Tray(icon); syncTray();
  tray.on('click', show);
  screen.on('display-removed', () => { win.setBounds(screen.getPrimaryDisplay().workArea); forward({ type: 'display-changed' }); });
  screen.on('display-metrics-changed', () => { const b = win.getBounds(); win.setBounds(screen.getDisplayMatching(b).workArea); forward({ type: 'display-changed' }); });
  process.send?.({ type: 'ready' });
}).catch(error => { console.error(error); app.exit(1); });

app.on('before-quit', () => { clearInterval(poll); assetServer?.close(); for (const notice of notices) notice.close(); tray?.destroy(); });
app.on('window-all-closed', () => app.quit());
