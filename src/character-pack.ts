import { z } from 'zod';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export const PACK_LIMIT = 32 * 1024 * 1024;
export const FILE_LIMIT = 16 * 1024 * 1024;
export const FILE_COUNT_LIMIT = 128;
export const ACTIONS = ['idle', 'thinking', 'working', 'waiting', 'happy', 'error', 'sleeping', 'walk', 'dragged', 'poke'] as const;
const path = z.string().max(160).regex(/^assets\/[a-zA-Z0-9_./-]+\.(png|webp)$/).refine(value => !value.split('/').some(part => !part || part === '.' || part === '..'), '素材路径不能包含空目录或 ..');
const id = z.string().regex(/^[a-z][a-z0-9-]{0,47}$/);
const dimension = z.number().int().min(1).max(4096);
const point = z.number().min(-4096).max(4096);
const action = z.enum(ACTIONS);
const key = z.object({ at: z.number().min(0).max(1), value: z.number().min(-4096).max(4096), easing: z.enum(['linear', 'smooth']).default('linear') }).strict();
const track = z.object({ layer: id, property: z.enum(['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity']), keys: z.array(key).min(1).max(64) }).strict();
const clip = z.object({ durationMs: z.number().int().min(100).max(60000), loop: z.boolean().default(true), tracks: z.array(track).max(64) }).strict();
const frameClip = z.object({ frames: z.array(z.number().int().min(0).max(1023)).min(1).max(256), fps: z.number().min(1).max(60), loop: z.boolean().default(true) }).strict();
const layer = z.object({ id, image: path, parent: id.optional(), x: point.default(0), y: point.default(0), width: dimension, height: dimension, pivotX: z.number().min(0).max(1).default(.5), pivotY: z.number().min(0).max(1).default(.5), rotation: z.number().min(-360).max(360).default(0), scaleX: z.number().min(.05).max(5).default(1), scaleY: z.number().min(.05).max(5).default(1), opacity: z.number().min(0).max(1).default(1) }).strict();

export const characterSchema = z.object({
  format: z.literal('dsh-character'), formatVersion: z.literal(1), id,
  name: z.string().min(1).max(60), author: z.string().min(1).max(120), license: z.string().min(1).max(160),
  description: z.string().max(500).default(''),
  canvas: z.object({ width: dimension, height: dimension }).strict().refine(value => value.height / value.width >= .25 && value.height / value.width <= 2, '画布高宽比必须在 0.25–2 之间'),
  motion: z.object({ breathe: z.number().min(0).max(.05).default(.015), bob: z.number().min(0).max(20).default(2), walkBounce: z.number().min(0).max(30).default(3), happyBounce: z.number().min(0).max(30).default(8) }).strict().default({ breathe: .015, bob: 2, walkBounce: 3, happyBounce: 8 }),
  renderer: z.discriminatedUnion('type', [
    z.object({ type: z.literal('image'), image: path }).strict(),
    z.object({ type: z.literal('spritesheet'), image: path, frameWidth: dimension, frameHeight: dimension, columns: z.number().int().min(1).max(64), rows: z.number().int().min(1).max(64), animations: z.partialRecord(action, frameClip).refine(value => !!value.idle, '必须定义 idle 动画') }).strict(),
    z.object({ type: z.literal('layers'), layers: z.array(layer).min(1).max(32), animations: z.partialRecord(action, clip).refine(value => !!value.idle, '必须定义 idle 动画') }).strict(),
  ]),
}).strict();

export type CharacterManifest = z.infer<typeof characterSchema>;
export type CharacterAction = typeof ACTIONS[number];
export interface CharacterPack { manifest: CharacterManifest; assets: Record<string, Uint8Array>; }
export interface CharacterView { manifest: CharacterManifest; assets: Record<string, string>; builtin?: boolean; }

/** Parse the versioned data format and validate hierarchy, timing and atlas references. */
export function validateCharacter(value: unknown): CharacterManifest {
  const result = characterSchema.safeParse(value);
  if (!result.success) throw new Error(`角色清单不符合规范：${result.error.issues.slice(0, 3).map(issue => `${issue.path.join('.')} ${issue.message}`).join('；')}`);
  const manifest = result.data, renderer = manifest.renderer;
  if (renderer.type === 'spritesheet') {
    if (renderer.columns * renderer.frameWidth > 4096 || renderer.rows * renderer.frameHeight > 4096) throw new Error('序列帧图集不能超过 4096×4096');
    for (const animation of Object.values(renderer.animations)) {
      if (animation.frames.some(frame => frame >= renderer.columns * renderer.rows)) throw new Error('动画引用了图集范围外的帧');
    }
  }
  if (renderer.type === 'layers') {
    const layers = new Map(renderer.layers.map(item => [item.id, item]));
    if (layers.size !== renderer.layers.length) throw new Error('图层 id 不能重复');
    for (const item of layers.values()) {
      const visited = new Set([item.id]);
      let parent = item.parent;
      while (parent) {
        if (visited.has(parent)) throw new Error('图层父子关系不能成环');
        visited.add(parent);
        const ancestor = layers.get(parent);
        if (!ancestor) throw new Error(`找不到父图层 ${parent}`);
        parent = ancestor.parent;
      }
    }
    for (const animation of Object.values(renderer.animations)) for (const item of animation.tracks) {
      if (!layers.has(item.layer)) throw new Error(`动画引用了不存在的图层 ${item.layer}`);
      if (new Set(animation.tracks.map(track => `${track.layer}.${track.property}`)).size !== animation.tracks.length) throw new Error('同一动画不能重复控制图层属性');
      if (item.keys.some((key, index) => index > 0 && key.at <= item.keys[index - 1].at)) throw new Error('关键帧时间必须递增');
      for (const key of item.keys) {
        if (item.property === 'opacity' && (key.value < 0 || key.value > 1)) throw new Error('透明度必须在 0–1 之间');
        if (item.property.startsWith('scale') && (key.value < .05 || key.value > 5)) throw new Error('缩放必须在 0.05–5 之间');
        if (item.property === 'rotation' && Math.abs(key.value) > 360) throw new Error('旋转角度必须在 -360–360 之间');
      }
    }
  }
  return manifest;
}

export function assetPaths(manifest: CharacterManifest): string[] {
  return [...new Set(manifest.renderer.type === 'layers' ? manifest.renderer.layers.map(item => item.image) : [manifest.renderer.image])];
}

/** Recognizes only inert PNG/WebP assets; dimensions are checked before browser decoding. */
export function imageInfo(bytes: Uint8Array): { mime: string; width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0, mime = '';
  if (bytes.length >= 33 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value) && view.getUint32(8) === 13 && strFromU8(bytes.subarray(12, 16)) === 'IHDR') {
    width = view.getUint32(16); height = view.getUint32(20); mime = 'image/png';
    let ended = false;
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const size = view.getUint32(offset), kind = strFromU8(bytes.subarray(offset + 4, offset + 8));
      if (size > bytes.length - offset - 12) throw new Error('PNG 文件已损坏');
      if (kind === 'acTL') throw new Error('请将 APNG 转为序列帧图集');
      if (kind === 'IEND') { ended = true; break; }
      offset += size + 12;
    }
    if (!ended) throw new Error('PNG 文件不完整');
  } else if (bytes.length >= 30 && strFromU8(bytes.subarray(0, 4)) === 'RIFF' && strFromU8(bytes.subarray(8, 12)) === 'WEBP') {
    const kind = strFromU8(bytes.subarray(12, 16));
    if (kind === 'VP8X') {
      if (bytes[20] & 2) throw new Error('请将动态 WebP 转为序列帧图集');
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16); height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (kind === 'VP8L' && bytes[20] === 47) {
      const bits = view.getUint32(21, true); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1;
    } else if (kind === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff;
    }
    mime = 'image/webp';
  }
  if (!width || !height || width > 4096 || height > 4096 || !mime) throw new Error('素材必须是有效的 PNG / 静态 WebP，尺寸不超过 4096×4096');
  return { mime, width, height };
}

/** Reads a flat .dshpet ZIP without executing files or extracting paths to disk. */
export function readCharacterPack(bytes: Uint8Array): CharacterPack {
  if (!bytes.length || bytes.length > PACK_LIMIT) throw new Error('角色包大小必须在 1 字节至 32 MiB 之间');
  let total = 0, count = 0;
  const names = new Set<string>();
  const files = unzipSync(bytes, { filter: file => {
    if (names.has(file.name)) throw new Error('角色包不能包含同名文件');
    names.add(file.name);
    if (++count > FILE_COUNT_LIMIT || file.originalSize > FILE_LIMIT || (total += file.originalSize) > PACK_LIMIT) throw new Error('角色包文件数量或解压大小超出限制');
    if (file.compression === 0 && file.size !== file.originalSize) throw new Error('角色包文件大小记录不一致');
    if (file.name.endsWith('/')) return false;
    if (file.name !== 'character.json' && file.name !== 'README.md' && file.name !== 'LICENSE' && !path.safeParse(file.name).success) throw new Error(`角色包包含不支持的文件：${file.name.slice(0, 160)}`);
    return true;
  } });
  if (!files['character.json'] || files['character.json'].length > 256 * 1024) throw new Error('角色包根目录必须包含 character.json（不超过 256 KiB）');
  const manifest = validateCharacter(JSON.parse(strFromU8(files['character.json'])));
  const assets: Record<string, Uint8Array> = {};
  let pixels = 0;
  for (const file of assetPaths(manifest)) {
    if (!files[file]) throw new Error(`缺少素材：${file}`);
    const info = imageInfo(files[file]);
    if ((pixels += info.width * info.height) > 16 * 1024 * 1024) throw new Error('角色素材的总像素数不能超过 16 Mi 像素');
    if (!file.endsWith(info.mime === 'image/png' ? '.png' : '.webp')) throw new Error(`素材扩展名与内容不符：${file}`);
    if (manifest.renderer.type === 'spritesheet' && (info.width !== manifest.renderer.frameWidth * manifest.renderer.columns || info.height !== manifest.renderer.frameHeight * manifest.renderer.rows)) throw new Error('图集尺寸与 frameWidth / frameHeight / columns / rows 不一致');
    assets[file] = files[file];
  }
  return { manifest, assets };
}

export function createCharacterPack(manifest: unknown, assets: Record<string, Uint8Array>): Uint8Array {
  const normalized = validateCharacter(manifest);
  const bytes = zipSync({ 'character.json': strToU8(JSON.stringify(normalized, null, 2)), ...assets }, { level: 6 });
  readCharacterPack(bytes);
  return bytes;
}
