const $ = id => document.getElementById(id);
const native = window.dshPetBridge;
const pet = $('pet'), bubble = $('bubble'), chat = $('chat'), menu = $('menu');
const labels = { idle: '小鲸 · 陪你工作', thinking: '小鲸 · 在想事情', working: '小鲸 · 正在忙', waiting: '小鲸 · 等你确认', happy: '小鲸 · 完成啦', error: '小鲸 · 需要关注', sleeping: '小鲸 · 休息中' };
const icons = { idle: '✦', thinking: '◌', working: '⚙', waiting: '!', happy: '✧', error: '!', sleeping: 'z' };
let options = { size: 150, roam: true, notifications: true, bubbleDurationMs: 12000 };
let snapshot = { mood: 'idle', text: '你好，我是小鲸。点点我，或双击和我说话。', sessionId: null, sessions: [] };
let x = innerWidth * .68, y = innerHeight - 155, dragging, moving = false, hovered = false, asleep = false, muted = false, bubbleTimer, toastTimer, target = x, noticeSession;
let roamAt = performance.now() + 8000;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function send(action) {
  if (native) { native.action(action); return; }
  if (action.type === 'chat') {
    speak(`收到「${action.text}」！这是演示回复。安装到 Harness 后，我会转交给所选会话。`, 'happy');
  }
  if (action.type === 'select') { snapshot.sessionId = action.sessionId; render(); }
}

function position() {
  const w = pet.offsetWidth, h = pet.offsetHeight;
  x = Math.max(8, Math.min(innerWidth - w - 28, x));
  y = Math.max(12, Math.min(innerHeight - h - 22, y));
  pet.style.left = `${x}px`; pet.style.top = `${y}px`;
  for (const panel of [bubble, chat, menu]) {
    if (panel.hidden) continue;
    const pw = panel.offsetWidth, ph = panel.offsetHeight;
    const px = Math.max(8, Math.min(innerWidth - pw - 8, x + w / 2 - pw / 2));
    const py = Math.max(8, y - ph - 17);
    panel.style.left = `${px}px`; panel.style.top = `${py}px`;
    panel.style.setProperty('--tail', `${Math.max(15, Math.min(pw - 28, x + w / 2 - px))}px`);
  }
}

function speak(text, mood = snapshot.mood) {
  clearTimeout(bubbleTimer);
  $('bubble-text').textContent = text;
  $('bubble-status').textContent = labels[mood] ?? labels.idle;
  pet.dataset.mood = asleep ? 'sleeping' : mood;
  $('mood-icon').textContent = icons[pet.dataset.mood];
  bubble.hidden = !chat.hidden || !menu.hidden;
  position();
  if (!['waiting', 'error', 'thinking', 'working'].includes(mood)) bubbleTimer = setTimeout(() => { bubble.hidden = true; }, options.bubbleDurationMs);
}

function render() {
  const select = $('sessions'), previous = select.value;
  select.replaceChildren();
  for (const session of snapshot.sessions) { const opt = new Option(session.label, session.id); select.add(opt); }
  if (!snapshot.sessions.length) select.add(new Option('请先在 Harness 打开一个会话', ''));
  select.value = snapshot.sessionId ?? '';
  const enabled = !!snapshot.sessionId;
  $('message').disabled = !enabled; $('send').disabled = !enabled;
  $('chat-help').textContent = enabled ? '消息会发送给所选会话，回复显示在气泡里。' : '小鲸仍然可以互动；AI 聊天需要一个已打开的 Harness 会话。';
  if (previous && previous !== select.value) $('message').value = '';
  speak(snapshot.text);
}

function receive(message) {
  if (!message || typeof message !== 'object') return;
  switch (message.type) {
    case 'init':
      options = { ...options, ...message.options };
      document.documentElement.style.setProperty('--size', `${options.size}px`);
      if (message.snapshot) snapshot = message.snapshot;
      y = innerHeight - pet.offsetHeight - 22; render(); break;
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
    case 'display-changed': x = innerWidth * .6; target = x; y = innerHeight - pet.offsetHeight - 22; position(); break;
  }
}

function hit(px, py) {
  const active = !!dragging || [...document.querySelectorAll('.interactive')].some(el => {
    if (el.hidden) return false;
    const b = el.getBoundingClientRect();
    return px >= b.left - 2 && px <= b.right + 22 && py >= b.top - 2 && py <= b.bottom + 2;
  });
  native?.hit(active);
}

function openChat() { menu.hidden = true; bubble.hidden = true; chat.hidden = false; position(); if (!$('message').disabled) $('message').focus(); }
function closePanels() { chat.hidden = true; menu.hidden = true; render(); }
pet.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button')) return;
  dragging = { pointer: event.pointerId, sx: event.clientX, sy: event.clientY, x, y, distance: 0 };
  pet.setPointerCapture(event.pointerId); pet.classList.add('dragging'); moving = false;
});
pet.addEventListener('pointermove', event => {
  if (!dragging) return;
  const dx = event.clientX - dragging.sx, dy = event.clientY - dragging.sy;
  dragging.distance = Math.max(dragging.distance, Math.hypot(dx, dy));
  x = dragging.x + dx; y = dragging.y + dy; target = x; position();
});
function release(event) {
  if (!dragging || event.pointerId !== dragging.pointer) return;
  moving = dragging.distance > 6; dragging = undefined; pet.classList.remove('dragging');
  if (event.type === 'pointerup' && native && (event.screenX < screen.availLeft || event.screenX > screen.availLeft + screen.availWidth)) send({ type: 'move-display' });
  y = innerHeight - pet.offsetHeight - 22; position(); roamAt = performance.now() + 10000;
}
pet.addEventListener('pointerup', release); pet.addEventListener('pointercancel', release);
pet.addEventListener('click', event => {
  if (moving || event.target.closest('button')) { moving = false; return; }
  speak(asleep ? '呼…再让我睡一小会儿。' : ['嘿，摸摸头收到啦！🐳', '我在呢。一起把事情做好吧。', '给你一颗小星星 ✦'][Math.floor(Math.random() * 3)], asleep ? 'sleeping' : 'happy');
});
pet.addEventListener('dblclick', event => { if (!event.target.closest('button')) openChat(); });
pet.addEventListener('keydown', event => { if (event.target === pet && ['Enter', ' '].includes(event.key)) { event.preventDefault(); openChat(); } });
pet.addEventListener('contextmenu', event => { event.preventDefault(); chat.hidden = true; bubble.hidden = true; menu.hidden = !menu.hidden; position(); });
pet.addEventListener('pointerenter', () => { hovered = true; }); pet.addEventListener('pointerleave', () => { hovered = false; });
$('open-chat').onclick = openChat;
$('open-menu').onclick = () => { chat.hidden = true; bubble.hidden = true; menu.hidden = !menu.hidden; position(); };
$('chat-close').onclick = closePanels;
$('dismiss').onclick = () => { bubble.hidden = true; };
$('sessions').onchange = event => { $('message').value = ''; send({ type: 'select', sessionId: event.target.value }); };
$('chat-form').onsubmit = event => {
  event.preventDefault(); const text = $('message').value.trim();
  if (!text || !snapshot.sessionId) return;
  send({ type: 'chat', text, sessionId: snapshot.sessionId }); $('message').value = ''; chat.hidden = true;
  speak('消息已交给 Harness。等一会儿，我会把回复带回来。', 'thinking');
  if (!native) setTimeout(() => speak(`收到「${text}」！这是演示回复。真实插件会使用 Harness 的模型。`, 'happy'), 350);
};
$('toggle-roam').onclick = () => { options.roam = !options.roam; $('toggle-roam').textContent = options.roam ? '暂停走动' : '恢复走动'; menu.hidden = true; render(); };
$('toggle-sleep').onclick = () => { asleep = !asleep; $('toggle-sleep').textContent = asleep ? '叫醒小鲸' : '休息一下'; menu.hidden = true; speak(asleep ? '呼…有重要消息我还是会提醒你的。' : '我醒啦，一起继续吧。', asleep ? 'sleeping' : 'happy'); };
$('toggle-notices').onclick = () => { muted = !muted; $('toggle-notices').textContent = muted ? '开启提醒' : '静音提醒'; menu.hidden = true; speak(muted ? '气泡提醒已静音。系统通知请在插件配置中关闭。' : '气泡提醒已开启。'); };
$('hide').onclick = () => { if (native) send({ type: 'hide' }); else { closePanels(); speak('桌面版可从托盘重新叫出我。'); } };
$('toast').onclick = () => { send({ type: 'select', sessionId: noticeSession }); $('toast').hidden = true; openChat(); };
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanels(); });
document.addEventListener('pointermove', event => hit(event.clientX, event.clientY));
addEventListener('resize', () => { y = innerHeight - pet.offsetHeight - 22; target = Math.max(8, Math.min(innerWidth - pet.offsetWidth - 28, target)); position(); });

let last = performance.now();
function animate(now) {
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (options.roam && !reduced && !asleep && !dragging && !hovered && chat.hidden && menu.hidden && snapshot.mood === 'idle') {
    if (now > roamAt) { target = 12 + Math.random() * Math.max(1, innerWidth - pet.offsetWidth - 60); roamAt = now + 18000; }
    const distance = target - x;
    if (Math.abs(distance) > 1) { x += Math.sign(distance) * Math.min(Math.abs(distance), dt * 25); position(); }
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

if (native) native.subscribe(receive);
else {
  document.body.classList.add('preview'); $('demo').hidden = false;
  options.size = 190; document.documentElement.style.setProperty('--size', '190px');
  snapshot.sessionId = 'demo'; snapshot.sessions = [{ id: 'demo', label: '演示会话' }];
  const texts = { thinking: '让我想一想，怎样把这个功能做好…', working: '正在看文件 · src/index.ts', waiting: '下一步需要你确认。真实插件会引导你回到 Harness。', happy: '任务完成啦！要不要休息一下？🐳', error: '任务遇到了问题，请回到 Harness 查看详情。' };
  document.querySelectorAll('[data-demo]').forEach(button => { button.onclick = () => {
    snapshot.mood = button.dataset.demo; snapshot.text = texts[snapshot.mood]; render();
    if (['happy', 'waiting', 'error'].includes(snapshot.mood)) receive({ type: 'notice', notice: { title: labels[snapshot.mood], body: snapshot.text, sessionId: 'demo' } });
  }; });
  y = innerHeight - pet.offsetHeight - 42; render();
}
