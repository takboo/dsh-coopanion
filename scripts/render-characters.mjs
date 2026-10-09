import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

// Renders this repository's original vector artwork; no upstream graphics are copied.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()), headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
  const source = await readFile('characters/source/whale.svg', 'utf8');
  await mkdir('web/characters/whale/assets', { recursive: true });
  for (const [name, selector] of Object.entries({ body: null, tail: '.tail', fin: '.fin', eyes: '.eyes', closed: '.sleep-eyes', spout: '.spout' })) {
    await page.setContent('<style>body{margin:0}svg{display:block}</style>');
    await page.evaluate(({ source, selector }) => {
      const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
      if (selector) {
        const part = svg.querySelector(selector).cloneNode(true);
        svg.replaceChildren(part);
      } else svg.querySelectorAll('.tail,.fin,.eyes,.sleep-eyes,.spout,.ground').forEach(part => part.remove());
      document.body.append(svg);
    }, { source, selector });
    await page.locator('svg').screenshot({ path: `web/characters/whale/assets/${name}.png`, omitBackground: true });
  }
  const keys = values => values.map(([at, value]) => ({ at, value }));
  const idle = [
    { layer: 'tail', property: 'rotation', keys: keys([[0, 0], [.5, 9], [1, 0]]) },
    { layer: 'eyes', property: 'scaleY', keys: keys([[0, 1], [.43, 1], [.45, .08], [.47, 1], [1, 1]]) },
    { layer: 'spout', property: 'scaleY', keys: keys([[0, 1], [.5, .86], [1, 1]]) },
  ];
  const layer = (id, extra = {}) => ({ id, image: `assets/${id}.png`, width: 220, height: 185, ...extra });
  const manifest = {
    format: 'dsh-character', formatVersion: 1, id: 'whale', name: '小鲸', author: 'dsh-coopanion contributors', license: 'MIT', description: '原创蓝色小鲸。会眨眼、摇尾巴，完成任务时挥挥鳍。', canvas: { width: 220, height: 185 },
    renderer: { type: 'layers', layers: [layer('tail', { pivotX: 175 / 220, pivotY: 121 / 185 }), layer('body'), layer('fin', { pivotX: 140 / 220, pivotY: 120 / 185 }), layer('eyes', { pivotX: 90 / 220, pivotY: 90 / 185 }), layer('closed', { opacity: 0 }), layer('spout', { pivotX: 93 / 220, pivotY: 34 / 185 })], animations: {
      idle: { durationMs: 5000, tracks: idle },
      happy: { durationMs: 1000, tracks: [...idle, { layer: 'fin', property: 'rotation', keys: keys([[0, 0], [.5, -20], [1, 0]]) }] },
      sleeping: { durationMs: 4000, tracks: [{ layer: 'eyes', property: 'opacity', keys: keys([[0, 0]]) }, { layer: 'closed', property: 'opacity', keys: keys([[0, 1]]) }, { layer: 'spout', property: 'opacity', keys: keys([[0, .4]]) }] },
    } },
  };
  await writeFile('web/characters/whale/character.json', JSON.stringify(manifest, null, 2) + '\n');
  await writeFile('web/characters/whale/manifest.js', `export const builtinWhale = ${JSON.stringify(manifest, null, 2)};\n`);
  await mkdir('examples/star/assets', { recursive: true });
  const colors = ['#ffc86f', '#ffd78b', '#ffc86f', '#ffc86f', '#ffe5a5', '#ffc86f', '#e7be7d', '#b3c7ed'];
  await page.setViewportSize({ width: 1024, height: 128 });
  await page.evaluate(colors => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128; canvas.style.width = '1024px'; canvas.style.height = '128px';
    document.body.replaceChildren(canvas); const ctx = canvas.getContext('2d');
    for (let frame = 0; frame < 8; frame++) {
      ctx.save(); ctx.translate(frame * 128 + 64, frame === 3 || frame === 5 ? 58 : 64);
      ctx.beginPath();
      for (let n = 0; n < 10; n++) { const angle = -Math.PI / 2 + n * Math.PI / 5, radius = n % 2 ? 27 : 52; const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius; if (!n) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.closePath(); ctx.fillStyle = colors[frame]; ctx.strokeStyle = '#c99444'; ctx.lineWidth = 3; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#58422d';
      if (frame === 6) { ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(18, 0); ctx.stroke(); }
      else { for (const x of [-13, 13]) { ctx.beginPath(); ctx.ellipse(x, -2, 3, frame === 1 ? 1 : 5, 0, 0, Math.PI * 2); ctx.fill(); } }
      ctx.beginPath(); ctx.arc(0, 5, frame === 4 || frame === 5 ? 8 : 5, 0, Math.PI); ctx.strokeStyle = '#58422d'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    }
  }, colors);
  await page.locator('canvas').screenshot({ path: 'examples/star/assets/star.png', omitBackground: true, scale: 'css' });
  const star = { format: 'dsh-character', formatVersion: 1, id: 'paper-star', name: '纸片星星', author: 'dsh-coopanion contributors', license: 'MIT', description: '序列帧示例角色。复制这个目录、替换图片和动画帧，就能制作自己的角色。', canvas: { width: 128, height: 128 }, renderer: { type: 'spritesheet', image: 'assets/star.png', frameWidth: 128, frameHeight: 128, columns: 8, rows: 1, animations: { idle: { frames: [0, 1, 0, 0], fps: 2 }, walk: { frames: [2, 3], fps: 8 }, happy: { frames: [4, 5], fps: 6 }, sleeping: { frames: [6], fps: 1 }, error: { frames: [7], fps: 1 }, dragged: { frames: [1], fps: 1 }, poke: { frames: [4, 5], fps: 6, loop: false } } } };
  await writeFile('examples/star/character.json', JSON.stringify(star, null, 2) + '\n');
  console.log('Original whale layers and the spritesheet example rendered.');
} finally { await browser.close(); }
