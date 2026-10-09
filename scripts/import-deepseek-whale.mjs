import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { chromium } from 'playwright-core';
import { validateCharacter, assetPaths, imageInfo } from '../dist/character-pack.js';
import { syncDeepseekBuiltin } from './sync-deepseek-builtin.mjs';

// Only PNG artwork is read from upstream. No upstream model, figure or engine code executes.
const directory = resolve('characters/deepseek-whale');
const source = JSON.parse(await readFile(join(directory, 'source.json'), 'utf8'));
if (!/^[a-f0-9]{40}$/.test(source.commit) || source.directory !== 'packages/cortico-world-desktop-pet/web/whale') throw new Error('Invalid pinned artwork source');
const cache = resolve(process.env.DSH_CHARACTER_CACHE ?? '.cache/character-source', source.commit);
const urls = {};
for (const file of source.files) {
  if (!/^(tex|feat)\/[a-zA-Z0-9_]+\.png$/.test(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid artwork source inventory');
  const target = join(cache, file.path);
  let bytes;
  try { bytes = await readFile(target); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!bytes) {
    const response = await fetch(`https://raw.githubusercontent.com/Pal-AI-Lab/Coopanion/${source.commit}/${source.directory}/${file.path}`, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Artwork download failed: ${file.path} (${response.status})`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Artwork checksum mismatch: ${file.path}`);
  imageInfo(new Uint8Array(bytes));
  await mkdir(join(cache, file.path.split('/')[0]), { recursive: true });
  await writeFile(target, bytes);
  urls[file.path] = `data:image/png;base64,${bytes.toString('base64')}`;
}
await mkdir(join(directory, 'assets'), { recursive: true });

// Hand-authored flat layer placement; the mesh rig is deliberately not part of this format.
// Coordinates reference the original cutouts, rounded to our own 216 x 272 logical canvas.
const pieces = [
  ['hair-back', 'hair_back', 39, 48, 144, 174, 'head'],
  ['tail', 'tail', 24, 172, 83, 40],
  ['hair-back-curl', 'hair_back_curl', 74, 172, 41, 48, 'head'],
  ['leg-front', 'leg_front', 120, 169, 44, 87],
  ['leg-back', 'leg_back', 96, 173, 40, 85],
  ['arm-far', 'arm_far', 145, 163, 29, 40],
  ['torso', 'torso_up', 106, 148, 49, 47],
  ['hair-right', 'hair_front_right', 147, 148, 30, 43, 'head'],
  ['arm-far-hand', 'arm_far_end_front', 157, 184, 17, 19, 'arm-far'],
  ['skirt', 'skirt', 80, 168, 98, 61],
  ['skirt-sitting', 'skirt_sit', 47, 169, 152, 69],
  ['hair-left', 'hair_front_left', 61, 119, 45, 77, 'head'],
  ['waist-bow', 'waist_bow_front', 85, 168, 30, 33],
  ['bow-sitting', 'waist_bow_sit_front', 80, 169, 40, 29],
  ['arm-near', 'arm_near', 94, 158, 29, 55],
  ['fin-far', 'fin_far', 166, 104, 39, 39, 'head'],
  ['sidelocks', 'sidelocks', 88, 124, 98, 49, 'head'],
  ['head', 'face', 100, 74, 76, 82],
  // Facial expressions are inserted here, behind bangs and the near fin.
  ['fin-near', 'fin_near', 37, 100, 60, 43, 'head'],
  ['headdress', 'headdress', 73, 39, 115, 72, 'head'],
  ['bangs', 'bangs', 81, 52, 112, 100, 'head'],
  ['bow', 'bow', 66, 95, 29, 24, 'head'],
  ['ahoge', 'ahoge', 87, 20, 53, 36, 'head'],
];
const locations = new Map(pieces.map(([id, , x, y]) => [id, [x - 16, y - 8]]));
const pivots = { head: [.4, .98], tail: [.88, .5], 'arm-near': [.68, .15], 'arm-far': [.3, .15], 'leg-front': [.55, .12], 'leg-back': [.5, .12], 'fin-near': [.83, .44], 'fin-far': [.16, .52], ahoge: [.62, .92], 'hair-back': [.64, .2] };
const layers = [];
const expressions = ['neutral', 'blink', 'happy', 'sleeping', 'dragged', 'error', 'waiting', 'poke'];
for (const [id, texture, , , width, height, parent] of pieces) {
  await copyFile(join(cache, 'tex', `${texture}.png`), join(directory, 'assets', `${id}.png`));
  const [x, y] = locations.get(id), [px, py] = parent ? locations.get(parent) : [0, 0];
  const pivot = pivots[id] ?? [.5, .5];
  layers.push({ id, image: `assets/${id}.png`, ...(parent ? { parent } : {}), x: x - px, y: y - py, width, height, pivotX: pivot[0], pivotY: pivot[1], ...(id.endsWith('sitting') ? { opacity: 0 } : {}) });
  if (id === 'head') for (const expression of expressions) layers.push({ id: `face-${expression}`, parent: 'head', image: `assets/face-${expression}.png`, x: -84, y: -66, width: 216, height: 272, opacity: expression === 'neutral' ? 1 : 0 });
}

// Precompose only facial cutouts to stay within v1's layer limit; these are texture assets,
// not recorded upstream animations. All motion below is authored for our own keyframe engine.
const featureBoxes = {
  eyeL_ball: [585, 630, 710, 748], eyeL_iris: [611, 629, 707, 748], eyeL_lash: [549, 609, 714, 715],
  eyeR_ball: [819, 635, 886, 745], eyeR_iris: [822, 636, 874, 744], eyeR_lash: [825, 617, 911, 701],
  neutral_mouth: [758, 764, 773, 775],
  happy_eyeL: [554, 651, 699, 756], happy_eyeR: [792, 659, 877, 754], happy_mouth: [715, 740, 772, 783],
  sleep_eyeL: [557, 672, 696, 721], sleep_eyeR: [789, 681, 874, 726], sleep_mouth: [739, 758, 763, 772],
  drag_eyeL: [577, 619, 685, 720], drag_eyeR: [795, 631, 875, 727], drag_mouth: [709, 745, 766, 764],
  dizzy_eyeL: [568, 607, 701, 733], dizzy_eyeR: [784, 608, 878, 732], dizzy_mouth: [711, 761, 782, 779],
  surprised_eyeL: [535, 594, 716, 758], surprised_eyeR: [818, 601, 904, 751], surprised_mouth: [751, 747, 791, 795],
  love_eyeL: [539, 607, 706, 776], love_eyeR: [799, 608, 888, 768], love_mouth: [723, 748, 785, 792],
};
const features = {
  neutral: ['eyeL_ball', 'eyeL_iris', 'eyeL_lash', 'eyeR_ball', 'eyeR_iris', 'eyeR_lash', 'neutral_mouth'],
  blink: ['sleep_eyeL', 'sleep_eyeR', 'neutral_mouth'], happy: ['happy_eyeL', 'happy_eyeR', 'happy_mouth'],
  sleeping: ['sleep_eyeL', 'sleep_eyeR', 'sleep_mouth'], dragged: ['drag_eyeL', 'drag_eyeR', 'drag_mouth'],
  error: ['dizzy_eyeL', 'dizzy_eyeR', 'dizzy_mouth'], waiting: ['surprised_eyeL', 'surprised_eyeR', 'surprised_mouth'],
  poke: ['love_eyeL', 'love_eyeR', 'love_mouth'],
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()), headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  for (const expression of expressions) {
    const png = await page.evaluate(async ({ urls, names, boxes }) => {
      const canvas = document.createElement('canvas'); canvas.width = 432; canvas.height = 544;
      const ctx = canvas.getContext('2d'); ctx.scale(2, 2);
      const draw = async (url, box) => { const img = new Image(); img.src = url; await img.decode(); ctx.drawImage(img, ...box); };
      await draw(urls['tex/eye_creases.png'], [110, 101, 44, 10]);
      await draw(urls['tex/brows.png'], [102, 89, 58, 9]);
      for (const name of names) {
        const [x1, y1, x2, y2] = boxes[name];
        await draw(urls[`feat/${name}.png`], [(x1 - 650) * .19 + 112, (y1 - 1363) * .19 + 248, (x2 - x1) * .19, (y2 - y1) * .19]);
      }
      return canvas.toDataURL('image/png').split(',')[1];
    }, { urls, names: features[expression], boxes: featureBoxes });
    await writeFile(join(directory, 'assets', `face-${expression}.png`), Buffer.from(png, 'base64'));
  }
} finally { await browser.close(); }

const track = (layer, property, values) => ({ layer, property, keys: values.map(([at, value]) => ({ at, value, easing: 'smooth' })) });
const hold = (layer, property, value) => track(layer, property, [[0, value]]);
const sway = (layer, low, high) => track(layer, 'rotation', [[0, low], [.5, high], [1, low]]);
const face = name => [hold('face-neutral', 'opacity', 0), hold(`face-${name}`, 'opacity', 1)];
const gentle = () => [sway('tail', -3, 6), sway('ahoge', -3, 4), sway('fin-near', -2, 3), sway('hair-back', -.5, 1), sway('head', -.8, .8)];
const blink = () => [track('face-neutral', 'opacity', [[0, 1], [.58, 1], [.6, 0], [.64, 0], [.66, 1], [1, 1]]), track('face-blink', 'opacity', [[0, 0], [.58, 0], [.6, 1], [.64, 1], [.66, 0], [1, 0]])];
const animations = {
  idle: { durationMs: 5000, tracks: [...gentle(), ...blink()] },
  thinking: { durationMs: 3500, tracks: [...gentle().filter(t => t.layer !== 'head'), ...blink(), sway('head', -4, -2), hold('arm-near', 'rotation', -15)] },
  working: { durationMs: 1400, tracks: [...gentle().filter(t => t.layer !== 'head'), sway('head', -1, 2), sway('arm-near', -8, 4)] },
  waiting: { durationMs: 2500, tracks: [...gentle().filter(t => t.layer !== 'head'), ...face('waiting'), sway('head', -5, -3)] },
  happy: { durationMs: 1200, tracks: [...gentle(), ...face('happy'), sway('arm-near', 75, 115), sway('fin-far', -5, 5)] },
  error: { durationMs: 600, tracks: [...face('error'), sway('head', -3, 3), sway('tail', -4, 1)] },
  walk: { durationMs: 800, tracks: [...gentle().filter(t => t.layer !== 'head'), sway('leg-front', -9, 9), sway('leg-back', 9, -9), sway('arm-near', 6, -6), sway('head', -1, 1)] },
  dragged: { durationMs: 1200, tracks: [...face('dragged'), sway('arm-near', -22, -12), sway('tail', -12, 8), sway('ahoge', -10, 6)] },
  poke: { durationMs: 700, loop: false, tracks: [...face('poke'), track('head', 'rotation', [[0, 0], [.3, -5], [.7, 3], [1, 0]]), sway('fin-near', -7, 7)] },
  sleeping: { durationMs: 4000, tracks: [...face('sleeping'), hold('skirt', 'opacity', 0), hold('waist-bow', 'opacity', 0), hold('skirt-sitting', 'opacity', 1), hold('bow-sitting', 'opacity', 1), hold('leg-front', 'opacity', 0), hold('leg-back', 'opacity', 0), hold('head', 'y', 90), hold('torso', 'y', 164), hold('arm-far', 'y', 179), hold('arm-near', 'y', 174), hold('skirt-sitting', 'y', 185), hold('bow-sitting', 'y', 185), sway('head', -4, -2), sway('tail', -2, 0)] },
};
const manifest = validateCharacter({ format: 'dsh-character', formatVersion: 1, id: 'deepseek-whale', name: 'DeepSeek 大肥鱼', author: 'Pal-AI-Lab；原设：溟月（上善无形）；女仆二创：ZipZipPipe', license: '素材权利沿用上游声明，见随包 LICENSE；动画适配 MIT', description: 'Coopanion 的 DeepSeek 原配色鲸鱼女仆。适配本项目的分层关键帧：眨眼、摆尾、挥手、走路、坐姿睡眠及任务表情。', canvas: { width: 216, height: 272 }, motion: { breathe: .008, bob: 1, walkBounce: 4, happyBounce: 5 }, renderer: { type: 'layers', layers, animations } });
await writeFile(join(directory, 'character.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const file of assetPaths(manifest)) imageInfo(new Uint8Array(await readFile(join(directory, file))));
await syncDeepseekBuiltin();
console.log(`DeepSeek 大肥鱼适配完成：${layers.length} 图层，${Object.keys(animations).length} 动作；素材来源 ${source.commit}`);
