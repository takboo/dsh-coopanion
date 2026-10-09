import { loadBody, knownScheme } from './upstream/body-host.js';
import { createSfx } from './upstream/sound.js';
import { createSpeech } from './speech.js';
const PACK_LIMIT = 128 * 1024 * 1024;
import { browserCharacters } from './character-library.js';
const BUILTIN_ID = 'whale';
const $ = id => document.getElementById(id);
const native = window.dshPetBridge;
const pet = $('pet'), bubble = $('bubble'), conversations = $('conversations'), chat = $('chat'), menu = $('menu'), characters = $('characters');
const labels = { idle: '陪你工作', thinking: '在想事情', working: '正在忙', waiting: '等你确认', happy: '完成啦', error: '需要关注', sleeping: '休息中' };
const library = native?.characters ?? browserCharacters;
const sfx = createSfx({ storageKey: 'dsh-pet.sound.v2', volume: .35 });
const nameIn = names => names?.zh ?? names?.en ?? Object.values(names ?? {})[0] ?? '';
let body, previewBody, previewCharacter, activeView, activeScheme, activeName = 'DeepSeek 大肥鱼', libraryState, libraryBusy = false;
let appliedMood, appliedControls, speech, speechExpires = Infinity, pressing = false, pointerDistance = 0, pointerStart, previewScheme = "", reducedNeedsStep = true;
const label = mood => `${activeName} · ${labels[mood] ?? labels.idle}`;
let options = { size: 180, roam: true, notifications: true, bubbleDurationMs: 12000 };
let snapshot = { mood: 'idle', text: '你好。点点我，或双击和我说话。', sessionId: null, sessions: [] };
let x = innerWidth * .68, y = innerHeight - 155, moving = false, hovered = false, asleep = false, muted = false, toastTimer, noticeSession;
let presentationKey, renderedSessionId = null, pendingSelection, reactionUntil = 0, reactionMood, bubbleSession, demoTimer;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionPreference.matches;
motionPreference.addEventListener('change', event => { reduced = event.matches; });

function send(action) {
  if (native) { native.action(action); return; }
  if (action.type === 'chat') {
    speak(`收到「${action.text}」！这是演示回复。安装到 Harness 后，我会交给当前对话。`, 'happy');
  }
  if (action.type === 'select') {
    const session = snapshot.sessions.find(session => session.id === action.sessionId);
    if (session) snapshot = { ...snapshot, ...session, sessionId: session.id };
    render();
  }
  if (action.type === 'open-session') speak('桌面版会打开对应的 Harness 会话。', 'idle');
}

function bounds() { return { W: innerWidth, H: innerHeight, floorY: innerHeight - 24, S: options.size / 256 }; }
function previewBounds() { const el = $('character-preview'); return { W: el.clientWidth, H: el.clientHeight, floorY: el.clientHeight - 14, S: Math.min(el.clientWidth, el.clientHeight - 22) / 256 }; }
function position() {
  const layout = body?.layout;
  const box = layout?.box;
  if (box) {
    x = box.x; y = box.y;
    Object.assign(pet.style, { left: `${x}px`, top: `${y}px`, width: `${Math.max(1, box.w)}px`, height: `${Math.max(1, box.h)}px` });
    pet.dataset.mode = layout.mode; pet.dataset.pressing = String(layout.pressing);
    pet.style.cursor = layout.cursor || 'grab';
  }
  const anchor = layout?.bubble ?? { x: x + options.size / 2, y };
  for (const panel of [bubble, conversations, chat, menu, characters]) {
    if (panel.hidden) continue;
    const pw = panel.offsetWidth, ph = panel.offsetHeight;
    const px = Math.max(8, Math.min(innerWidth - pw - 8, anchor.x - pw / 2));
    const py = Math.max(8, Math.min(innerHeight - ph - 12, anchor.y - ph - 18));
    panel.style.left = `${px}px`; panel.style.top = `${py}px`;
    panel.style.setProperty('--tail', `${Math.max(22, Math.min(pw - 22, anchor.x - px))}px`);
  }
}
function speak(text, mood = snapshot.mood, sessionId = null) {
  const source = snapshot.sessions.find(session => session.id === sessionId);
  $('bubble-status').textContent = source?.label ?? '';
  bubble.setAttribute('aria-label', label(mood) + (source ? ` · ${source.label}` : ''));
  bubbleSession = sessionId;
  $('bubble-session').hidden = !sessionId;
  bubble.hidden = !conversations.hidden || !chat.hidden || !menu.hidden || !characters.hidden;
  bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
  speechExpires = Infinity;
  speech = createSpeech({ text, node: $('bubble-text'), immediate: reduced, onCharacter: ch => { sfx.babble(ch); body?.talk(); } });
  bubble.dataset.typing = String(!speech.done);
  bubble.dataset.persistent = String(['waiting', 'error', 'thinking', 'working'].includes(mood));
  position();
}
function react(mood) { reactionMood = mood; reactionUntil = performance.now() + 700; }
function act(actor, pack, word) {
  if (pack?.vocab.some(w => w.id === word) && (!actor.words || actor.words.includes(word))) actor.do(word);
}
function updateMood(now = performance.now()) {
  const mood = asleep ? 'sleeping' : (now < reactionUntil ? reactionMood : snapshot.mood);
  pet.dataset.mood = mood;
  if (!body) return;
  if (mood !== appliedMood && !body.layout?.busy) {
    reducedNeedsStep = true;
    if (appliedMood === 'sleeping' && mood !== 'sleeping') act(body, activeView, 'stand');
    const word = { idle: 'neutral', thinking: 'thinking', working: 'determined', waiting: 'worried', happy: 'happy', error: 'sad', sleeping: 'sleep' }[mood];
    if (word) act(body, activeView, word);
    body.set({ thinking: ['thinking', 'working'].includes(mood), thoughtShown: true });
    appliedMood = mood;
  }
  const dialogOpen = [conversations, chat, menu, characters].some(p => !p.hidden);
  const controls = { roam: options.roam && !reduced && !hovered && !dialogOpen && mood === 'idle' ? 'calm' : 'off', dialogOpen };
  const key = JSON.stringify(controls);
  if (key !== appliedControls) { if (controls.roam === 'off') body.stopWalk(0); body.set(controls); appliedControls = key; }
}

function render() {
  const previous = renderedSessionId;
  const selected = snapshot.sessions.find(session => session.id === snapshot.sessionId);
  const list = $('conversation-list');
  const listKey = JSON.stringify(snapshot.sessions.map(session => [session.id, session.label, session.mood, session.chatAvailable, session.id === snapshot.sessionId]));
  if (list.dataset.key !== listKey) {
    const activeId = document.activeElement?.dataset?.sessionId;
    const entries = snapshot.sessions.map(session => {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'conversation-card';
      card.dataset.sessionId = session.id; card.dataset.mood = session.mood; card.setAttribute('role', 'option'); card.setAttribute('aria-selected', String(session.id === snapshot.sessionId));
      const dot = document.createElement('i'); dot.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span'), name = document.createElement('strong'), detail = document.createElement('small'), mark = document.createElement('b');
      name.textContent = session.label; detail.textContent = `${labels[session.mood] ?? labels.idle} · ${session.id.slice(0, 8)}`; mark.textContent = session.id === snapshot.sessionId ? '正在听' : '听这边';
      copy.append(name, detail); card.append(dot, copy, mark); return card;
    });
    if (!entries.length) {
      const empty = document.createElement('p'); empty.className = 'conversation-empty'; empty.textContent = '还没有可用的对话。先在 Harness 中打开一段对话，我就能听见它。'; entries.push(empty);
    }
    list.replaceChildren(...entries); list.dataset.key = listKey;
    if (activeId) list.querySelector(`[data-session-id="${CSS.escape(activeId)}"]`)?.focus();
  }
  $('chat-current').disabled = !snapshot.sessions.length; $('chat-session-name').textContent = selected?.label ?? '还没有对话';
  $('chat-current').setAttribute('aria-label', selected ? `当前对话：${selected.label}。点击切换` : '还没有可用的对话');
  const enabled = !!snapshot.sessionId && selected?.chatAvailable !== false;
  $('message').disabled = !enabled; $('send').disabled = !enabled;
  $('conversation-open').disabled = !snapshot.sessionId; $('chat-session').disabled = !snapshot.sessionId;
  $('chat-help').textContent = enabled ? `消息会交给「${selected.label}」，回复显示在气泡里。` : snapshot.sessionId ? '这段对话尚未在 Harness 中打开，请先回去打开它。' : '先在 Harness 中打开一段对话，就可以从这里和我说话。';
  if (previous && previous !== snapshot.sessionId) $('message').value = '';
  const key = JSON.stringify([snapshot.sessionId, snapshot.revision, snapshot.mood, snapshot.text]);
  if (key !== presentationKey) {
    const selectionArrived = pendingSelection === snapshot.sessionId;
    const settled = pet.dataset.mood === 'happy' && snapshot.mood === 'idle' && previous === snapshot.sessionId;
    if (!selectionArrived) reactionUntil = 0;
    if (!settled && !selectionArrived) speak(snapshot.text, snapshot.mood, snapshot.sessionId);
    if (selectionArrived) pendingSelection = undefined;
    presentationKey = key;
  }
  renderedSessionId = snapshot.sessionId;
  updateMood(); position();
}

function receive(message) {
  if (!message || typeof message !== 'object') return;
  switch (message.type) {
    case 'init':
      options = { ...options, ...message.options };
      document.documentElement.style.setProperty('--size', `${options.size}px`);
      if (message.snapshot) snapshot = message.snapshot;
      body?.set({ bounds: bounds() }); render(); break;
    case 'configure':
      options = { ...options, ...message.options };
      document.documentElement.style.setProperty('--size', `${options.size}px`);
      body?.set({ bounds: bounds() });
      $('toggle-roam').textContent = options.roam ? '暂停走动' : '恢复走动';
      render(); break;
    case 'characters': $('open-characters').click(); break;
    case 'snapshot': snapshot = message.snapshot; render(); break;
    case 'notice': {
      if (muted) break;
      noticeSession = message.notice.sessionId;
      $('toast-title').textContent = message.notice.title;
      $('toast-body').textContent = message.notice.body;
      $('toast').hidden = false; clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { $('toast').hidden = true; }, options.bubbleDurationMs); break;
    }
    case 'cursor': hit(message.x, message.y); break;
    case 'display-changed': body?.set({ bounds: bounds() }); body?.place(innerWidth * .6, 1); position(); break;
  }
}

function hit(px, py) {
  const active = pressing || body?.hit({ x: px, y: py }) || [...document.querySelectorAll('.interactive')].some(el => {
    if (el === pet || el.closest('[hidden]')) return false;
    const b = el.getBoundingClientRect();
    return px >= b.left - 2 && px <= b.right + 2 && py >= b.top - 2 && py <= b.bottom + 2;
  });
  native?.hit(!!active);
}

function openChat() { characters.hidden = true; conversations.hidden = true; menu.hidden = true; bubble.hidden = true; chat.hidden = false; position(); if (!$('message').disabled) $('message').focus(); }
function openConversations() {
  if (!snapshot.sessions.length) return;
  characters.hidden = true; chat.hidden = true; menu.hidden = true; bubble.hidden = true; conversations.hidden = false; position();
  ($('conversation-list').querySelector('[aria-selected=true]') ?? $('conversation-list').querySelector('button'))?.focus();
}
function closePanels() { conversations.hidden = true; chat.hidden = true; menu.hidden = true; characters.hidden = true; render(); }
pet.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  sfx.unlock(); pressing = true; pointerDistance = 0; pointerStart = { x: event.clientX, y: event.clientY };
  pet.setPointerCapture(event.pointerId);
  body?.pointer('down', { x: event.clientX, y: event.clientY, t: event.timeStamp });
});
function release(event) {
  if (!pressing) return;
  body?.pointer(event.type === 'pointercancel' ? 'cancel' : 'up', { x: event.clientX, y: event.clientY, t: event.timeStamp });
  pressing = false; moving = pointerDistance > 6;
  if (event.type === 'pointerup' && native && (event.screenX < screen.availLeft || event.screenX > screen.availLeft + screen.availWidth)) send({ type: 'move-display' });
}
pet.addEventListener('pointerup', release); pet.addEventListener('pointercancel', release);
pet.addEventListener('click', event => {
  if (moving) { moving = false; return; }
  if (!asleep) react('happy');
  speak(asleep ? '呼…再让我睡一小会儿。' : ['嘿，摸摸头收到啦！🐳', '我在呢。一起把事情做好吧。', '给你一颗小星星 ✦'][Math.floor(Math.random() * 3)], asleep ? 'sleeping' : 'happy');
});
pet.addEventListener('dblclick', openChat);
pet.addEventListener('keydown', event => { if (event.target === pet && ['Enter', ' '].includes(event.key)) { event.preventDefault(); openChat(); } });
pet.addEventListener('contextmenu', event => { event.preventDefault(); characters.hidden = true; conversations.hidden = true; chat.hidden = true; bubble.hidden = true; menu.hidden = !menu.hidden; position(); });
pet.addEventListener('pointerenter', () => { hovered = true; }); pet.addEventListener('pointerleave', () => { hovered = false; });
$('chat-current').onclick = openConversations;
$('conversations-close').onclick = closePanels;
$('chat-close').onclick = closePanels;
$('dismiss').onclick = () => { bubble.hidden = true; };
$('conversation-list').onclick = event => {
  const card = event.target.closest('[data-session-id]');
  const session = card && snapshot.sessions.find(item => item.id === card.dataset.sessionId);
  if (!session || session.id === snapshot.sessionId) { conversations.hidden = true; render(); return; }
  const state = { thinking: '它正在想事情。', working: '它正在忙。', waiting: '它正等你确认。', happy: '它刚刚完成了。', error: '它需要你看一眼。' }[session.mood] ?? '';
  pendingSelection = session.id; conversations.hidden = true; react('happy'); send({ type: 'select', sessionId: session.id });
  speak(`好，我来听「${session.label}」这边。${state}`, session.mood, session.id);
};
function openSession(id) { if (id) { send({ type: 'open-session', sessionId: id }); closePanels(); bubble.hidden = true; } }
$('conversation-open').onclick = () => openSession(snapshot.sessionId);
$('chat-session').onclick = () => openSession(snapshot.sessionId);
$('bubble-session').onclick = () => openSession(bubbleSession);
$('chat-form').onsubmit = event => {
  event.preventDefault(); const text = $('message').value.trim();
  if (!text || !snapshot.sessionId) return;
  send({ type: 'chat', text, sessionId: snapshot.sessionId }); $('message').value = ''; chat.hidden = true;
  speak('消息已交给 Harness。等一会儿，我会把回复带回来。', 'thinking');
  if (!native) setTimeout(() => {
    clearTimeout(demoTimer);
    snapshot.mood = 'happy'; snapshot.text = `收到「${text}」！这是演示回复。真实插件会使用 Harness 的模型。`; snapshot.revision = (snapshot.revision ?? 0) + 1;
    Object.assign(snapshot.sessions[0], { mood: snapshot.mood, text: snapshot.text, revision: snapshot.revision }); render();
    demoTimer = setTimeout(() => { snapshot.mood = 'idle'; snapshot.text = '准备好了，随时叫我。'; snapshot.revision++; Object.assign(snapshot.sessions[0], { mood: snapshot.mood, text: snapshot.text, revision: snapshot.revision }); render(); }, 2500);
  }, 350);
};
$('toggle-roam').onclick = () => { options.roam = !options.roam; $('toggle-roam').textContent = options.roam ? '暂停走动' : '恢复走动'; menu.hidden = true; render(); };
$('toggle-sleep').onclick = () => { asleep = !asleep; if (!asleep) react('happy'); $('toggle-sleep').textContent = asleep ? '叫醒伙伴' : '休息一下'; menu.hidden = true; speak(asleep ? '呼…有重要消息我还是会提醒你的。' : '我醒啦，一起继续吧。', asleep ? 'sleeping' : 'happy'); updateMood(); };
$('toggle-notices').onclick = () => { muted = !muted; $('toggle-notices').textContent = muted ? '开启提醒' : '静音提醒'; menu.hidden = true; speak(muted ? '气泡提醒已静音。系统通知请在插件配置中关闭。' : '气泡提醒已开启。'); };
$('hide').onclick = () => { if (native) send({ type: 'hide' }); else { closePanels(); speak('桌面版可从托盘重新叫出我。'); } };
$('toast').onclick = () => { $('toast').hidden = true; openSession(noticeSession); };
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanels(); });
document.addEventListener('pointerdown', () => sfx.unlock(), { capture: true });
document.addEventListener('pointermove', event => {
  const point = { x: event.clientX, y: event.clientY, t: event.timeStamp };
  if (pressing) pointerDistance = Math.max(pointerDistance, Math.hypot(point.x - pointerStart.x, point.y - pointerStart.y));
  body?.pointer('move', point); hit(point.x, point.y);
});
document.addEventListener('pointerleave', () => body?.pointer('leave', {}));
addEventListener('resize', () => { body?.set({ bounds: bounds() }); previewBody?.set({ bounds: previewBounds() }); position(); });
$('toggle-sound').textContent = sfx.isOn() ? '关闭音效' : '开启音效';
$('toggle-sound').onclick = () => { sfx.set(!sfx.isOn()); $('toggle-sound').textContent = sfx.isOn() ? '关闭音效' : '开启音效'; };


let last = performance.now();
function animate(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  updateMood(now);
  body?.tick(reduced && !reducedNeedsStep && !pressing && !['air', 'drag', 'wake'].includes(body.layout?.mode) ? 0 : dt); reducedNeedsStep = false;
  if (!characters.hidden || libraryBusy) previewBody?.tick(reduced ? 0 : dt);
  if (speech && !bubble.hidden) {
    if (reduced) speech.finish(); else speech.step(dt);
    bubble.dataset.typing = String(!speech.done);
    if (speech.done && speechExpires === Infinity && bubble.dataset.persistent !== 'true') speechExpires = now + options.bubbleDurationMs;
    if (now >= speechExpires) bubble.hidden = true;
  }
  position(); requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

if (native) native.subscribe(receive);
else {
  document.body.classList.add('preview'); $('demo').hidden = false;
  options.size = 190; document.documentElement.style.setProperty('--size', '190px');
  snapshot.sessionId = 'demo'; snapshot.sessions = [
    { id: 'demo', label: '演示会话', mood: 'idle', text: snapshot.text, revision: 0 },
    { id: 'demo-notes', label: '另一个想法', mood: 'working', text: '正在整理刚才的想法…', revision: 0 },
  ];
  const texts = { thinking: '让我想一想，怎样把这个功能做好…', working: '正在看文件 · src/index.ts', waiting: '下一步需要你确认。真实插件会引导你回到 Harness。', happy: '任务完成啦！要不要休息一下？🐳', error: '任务遇到了问题，请回到 Harness 查看详情。' };
  document.querySelectorAll('[data-demo]').forEach(button => { button.onclick = () => {
    clearTimeout(demoTimer);
    snapshot.mood = button.dataset.demo; snapshot.text = texts[snapshot.mood]; snapshot.revision = (snapshot.revision ?? 0) + 1;
    Object.assign(snapshot.sessions[0], { mood: snapshot.mood, text: snapshot.text, revision: snapshot.revision }); render();
    if (snapshot.mood === 'happy') demoTimer = setTimeout(() => { snapshot.mood = 'idle'; snapshot.text = '准备好了，随时叫我。'; snapshot.revision++; Object.assign(snapshot.sessions[0], { mood: snapshot.mood, text: snapshot.text, revision: snapshot.revision }); render(); }, 2500);
    if (['happy', 'waiting', 'error'].includes(snapshot.mood)) receive({ type: 'notice', notice: { title: label(snapshot.mood), body: snapshot.text, sessionId: 'demo' } });
  }; });
  y = innerHeight - pet.offsetHeight - 42; render();
}

async function setCharacter(view, scheme = '') {
  const next = await loadBody({ layer: $('body-layer'), pack: view, start: { x: body?.layout?.x ?? innerWidth * .68, facing: body?.layout?.facing ?? 1, scheme }, theme: 'light', bounds: bounds(),
    onSound: (name, kind, ...args) => sfx.play(name, kind, ...args),
    onError: error => { $('character-status').textContent = `角色运行失败：${error.message}`; if (body === next && view.id !== BUILTIN_ID) void restoreBuiltin(); },
  });
  body?.dispose(); body = next; activeView = view; activeScheme = knownScheme(view, scheme); activeName = nameIn(view.name);
  appliedMood = appliedControls = undefined;
  sfx.usePack(view.base, view.sounds);
  pet.dataset.character = view.id; pet.dataset.scheme = activeScheme;
  const accent = view.presets.find(p => p.id === activeScheme)?.accent ?? view.axes[0]?.options.find(o => o.id === activeScheme)?.accent ?? '#4d6bfe';
  document.documentElement.style.setProperty('--skin-eye', accent);
  $('chat-title').textContent = `和${activeName}说话`;
  pet.setAttribute('aria-label', `${activeName}，点击互动，双击聊天，右键菜单，拖动移动`);
  render();
}
async function restoreBuiltin() {
  try { const view = await library.load(BUILTIN_ID); await setCharacter(view); await library.select(BUILTIN_ID, activeScheme); }
  catch (error) { $('character-status').textContent = `无法加载内置角色：${error.message}`; }
}
function setBusy(value) {
  libraryBusy = value;
  for (const id of ['character-select', 'character-import', 'character-use', 'character-scheme', 'character-action', 'character-test']) $(id).disabled = value;
  for (const el of $('character-axes').querySelectorAll('select')) el.disabled = value;
  $('character-use').disabled = value || !previewCharacter;
  $('character-remove').disabled = value || $('character-select').value === BUILTIN_ID;
}
function fillSchemes(pack, scheme) {
  previewScheme = knownScheme(pack, scheme);
  const choices = pack.presets.map(p => new Option(nameIn(p.name) || p.id, p.id));
  choices.push(new Option(pack.axes.length ? '自定义搭配' : '默认', '__custom'));
  $('character-scheme').replaceChildren(...choices);
  $('character-scheme').value = pack.presets.some(p => p.id === previewScheme) ? previewScheme : '__custom';
  const preset = pack.presets.find(p => p.id === previewScheme), parts = previewScheme.split('-');
  $('character-axes').replaceChildren(...pack.axes.map((axis, i) => {
    const label = document.createElement('label'); label.textContent = nameIn(axis.name);
    const select = document.createElement('select'); select.dataset.axis = axis.id; select.setAttribute('aria-label', nameIn(axis.name));
    select.replaceChildren(...axis.options.map(o => new Option(nameIn(o.name), o.id)));
    select.value = preset?.pick[axis.id] ?? parts[i]; label.append(select); return label;
  }));
  $('character-axes').hidden = pack.axes.length === 0 || (pack.axes.length === 1 && pack.axes[0].options.every(o => pack.presets.some(p => p.pick[pack.axes[0].id] === o.id)));
}
async function preview(id) {
  previewCharacter = undefined; previewBody?.dispose(); previewBody = undefined;
  const view = await library.load(id);
  fillSchemes(view, libraryState.schemes[id]);
  $('character-action').replaceChildren(...view.vocab.map(w => new Option(w.names.zh?.[0] ?? w.id, w.id)));
  $('character-action').value = view.vocab.some(w => w.id === 'wave') ? 'wave' : view.vocab[0]?.id ?? '';
  const next = await loadBody({ layer: $('character-preview'), pack: view, start: { x: previewBounds().W / 2, facing: 1, scheme: previewScheme }, theme: 'light', bounds: previewBounds(),
    onError: error => { previewCharacter = undefined; $('character-status').textContent = `预览失败：${error.message}`; setBusy(false); },
  });
  previewBody = next; previewBody.set({ roam: 'off' }); previewCharacter = view;
  $('character-about').textContent = nameIn(view.about);
  $('character-credit').textContent = `作者：${view.author ?? '未注明'} · ${view.credits?.map(c => c.name).join('、') ?? ''} · 许可：${view.builtin ? '代码 AGPL-3.0-or-later；素材见权利声明' : view.license ?? '由角色作者注明'}`;
  $('character-use').textContent = pet.dataset.character === id ? '正在使用' : '使用角色';
}
async function refreshCharacters(selected) {
  libraryState = await library.list();
  $('character-select').replaceChildren(...libraryState.characters.map(pack => new Option(nameIn(pack.name), pack.id)));
  $('character-select').value = selected ?? libraryState.selected;
  if (!$('character-select').value) $('character-select').value = BUILTIN_ID;
  await preview($('character-select').value);
  if (libraryState.problems.length) $('character-status').textContent = libraryState.problems.join('；');
}
async function characterOperation(operation) {
  if (libraryBusy) return;
  setBusy(true);
  try { await operation(); }
  catch (error) { $('character-status').textContent = `操作未完成：${String(error.message ?? error).slice(0, 400)}`; }
  finally { setBusy(false); position(); }
}
$('open-characters').onclick = () => {
  closePanels(); bubble.hidden = true; characters.hidden = false; position();
  void characterOperation(() => refreshCharacters(pet.dataset.character));
};
$('characters-close').onclick = () => { previewBody?.dispose(); previewBody = undefined; closePanels(); };
$('character-select').onchange = () => void characterOperation(() => preview($('character-select').value));
$('character-scheme').onchange = () => void characterOperation(async () => {
  const scheme = $('character-scheme').value;
  const custom = [...$('character-axes').querySelectorAll('select')].map(el => el.value).join('-');
  fillSchemes(previewCharacter, scheme === '__custom' ? custom : scheme);
  await previewBody?.setScheme(previewScheme, { fade: reduced ? 0 : .25 });
  $('character-use').textContent = '使用这个配色';
});
$('character-axes').onchange = () => void characterOperation(async () => {
  const scheme = [...$('character-axes').querySelectorAll('select')].map(el => el.value).join('-');
  fillSchemes(previewCharacter, scheme);
  await previewBody?.setScheme(previewScheme, { fade: reduced ? 0 : .25 });
  $('character-use').textContent = '使用这个搭配';
});
$('character-test').onclick = () => { if (previewBody && previewCharacter) act(previewBody, previewCharacter, $('character-action').value); };
$('character-import').onclick = () => $('character-file').click();
$('character-file').onchange = () => void characterOperation(async () => {
  const file = $('character-file').files[0]; if (!file) return;
  try {
    if (file.size > PACK_LIMIT) throw new Error('角色包不能超过 128 MiB');
    const after = await library.import(await file.arrayBuffer());
    await refreshCharacters(after.importedId);
    $('character-status').textContent = '已导入。预览满意后点击使用角色。';
  } finally { $('character-file').value = ''; }
});
$('character-use').onclick = () => void characterOperation(async () => {
  if (!previewCharacter) return;
  const scheme = previewScheme;
  if (activeView?.id === previewCharacter.id && activeView.revision === previewCharacter.revision) {
    await body.setScheme(scheme, { fade: reduced ? 0 : .25 }); activeScheme = scheme; pet.dataset.scheme = scheme;
  } else await setCharacter(previewCharacter, scheme);
  await library.select(previewCharacter.id, scheme);
  $('character-use').textContent = '正在使用'; $('character-status').textContent = '已切换，重启后会保留这个角色和配色。';
});
$('character-remove').onclick = () => void characterOperation(async () => {
  const id = $('character-select').value;
  if (pet.dataset.character === id) await restoreBuiltin();
  previewBody?.dispose(); previewBody = undefined;
  await library.remove(id); await refreshCharacters(); $('character-status').textContent = '已删除本地角色包。';
});
void (async () => {
  setBusy(true);
  try {
    libraryState = await library.list();
    try { await setCharacter(await library.load(libraryState.selected), libraryState.schemes[libraryState.selected]); }
    catch (error) { await restoreBuiltin(); $('character-status').textContent = `已恢复内置大肥鱼：${String(error.message ?? error).slice(0, 300)}`; }
  } catch (error) { $('character-status').textContent = `角色加载失败：${error.message}`; }
  finally { setBusy(false); }
})();
