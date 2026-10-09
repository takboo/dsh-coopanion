import { ElectronBridge } from '../dist/bridge.js';
const pet = new ElectronBridge();
let timer;
pet.on('failure', error => { console.error(error.message); process.exitCode = 1; clearInterval(timer); });
const phases = [
  ['idle', '你好，我是大肥鱼。这是桌面演示，任务事件是模拟的。'],
  ['thinking', '让我想想，接下来该怎么做…'],
  ['working', '正在看文件 · src/index.ts'],
  ['waiting', '这一步需要你确认，真实插件会引导你回到 Harness。'],
  ['happy', '任务完成啦！一起休息一下吧。🐳'],
];
let phase = 0;
function update(mood, text) { pet.update({ mood, text, sessionId: 'demo', sessions: [{ id: 'demo', label: '桌面演示', mood, text, reply: '' }] }); }
update(...phases[0]);
await pet.start({ size: 150, roam: true, notifications: false, bubbleDurationMs: 12000 });
pet.onAction(action => { if (action?.type === 'chat') update('happy', `收到「${action.text}」！这是演示回复，真实插件会把消息发给 Harness。`); });
timer = setInterval(() => { phase = (phase + 1) % phases.length; update(...phases[phase]); }, 16000);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { clearInterval(timer); await pet.dispose(); });
