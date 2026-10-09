import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { validateCharacter, readCharacterPack, createCharacterPack, PACK_LIMIT } from '../src/character-pack.ts';
import { CharacterStore } from '../src/character-store.ts';
import { AnimationClock, sampleKeys, clipProgress, type AnimationState } from '../src/animation.ts';

const star = JSON.parse(readFileSync('examples/star/character.json', 'utf8'));
const image = new Uint8Array(readFileSync('examples/star/assets/star.png'));
const archive = () => createCharacterPack(star, { 'assets/star.png': image });
const state: AnimationState = { mood: 'idle', moving: false, dragging: false, facing: 1, reducedMotion: false };

describe('data-only character packages', () => {
  it('round-trips an authored spritesheet, keeps credits, and supplies optional defaults', () => {
    const { manifest, assets } = readCharacterPack(archive());
    expect(manifest.id).toBe('paper-star'); expect(manifest.author).toBe(star.author); expect(manifest.license).toBe('MIT');
    expect(manifest.motion.breathe).toBe(.015); expect(assets['assets/star.png']).toEqual(image);
  });
  it('rejects code, escaping asset paths, missing files and incompatible format versions', () => {
    expect(() => readCharacterPack(zipSync({ 'character.json': strToU8(JSON.stringify(star)), 'assets/star.png': image, 'assets/run.js': strToU8('alert(1)') }))).toThrow(/不支持/);
    expect(() => readCharacterPack(zipSync({ '../character.json': strToU8('{}') }))).toThrow(/不支持/);
    expect(() => createCharacterPack({ ...star, renderer: { type: 'image', image: 'assets/../secret.png' } }, {})).toThrow(/清单/);
    expect(() => createCharacterPack(star, {})).toThrow(/缺少素材/);
    expect(() => validateCharacter({ ...star, formatVersion: 2 })).toThrow(/清单/);
  });
  it('rejects oversized ZIP entries before decompression and invalid image geometry', () => {
    const bytes = zipSync({ 'character.json': strToU8('{}') });
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < bytes.length - 28; i++) if (view.getUint32(i, true) === 0x02014b50) { view.setUint32(i + 24, PACK_LIMIT + 1, true); break; }
    expect(() => readCharacterPack(bytes)).toThrow(/超出限制/);
    const stored = zipSync({ 'character.json': strToU8('{}') }, { level: 0 });
    const storedView = new DataView(stored.buffer, stored.byteOffset, stored.byteLength);
    for (let i = 0; i < stored.length - 28; i++) if (storedView.getUint32(i, true) === 0x02014b50) { storedView.setUint32(i + 24, 0, true); break; }
    expect(() => readCharacterPack(stored)).toThrow(/大小记录/);
    expect(() => createCharacterPack({ ...star, renderer: { ...star.renderer, columns: 7 } }, { 'assets/star.png': image })).toThrow(/范围外|图集尺寸/);
    expect(() => createCharacterPack(star, { 'assets/star.png': strToU8('<svg/>') })).toThrow(/PNG/);
    const animated = new Uint8Array(image.length + 12);
    animated.set(image.subarray(0, 33)); animated.set(strToU8('acTL'), 37); animated.set(image.subarray(33), 45);
    expect(() => createCharacterPack(star, { 'assets/star.png': animated })).toThrow(/APNG/);
  });
  it('rejects circular layers, missing parent references and ambiguous keyframes', () => {
    const layered = { ...star, renderer: { type: 'layers', layers: [{ id: 'body', image: 'assets/star.png', width: 128, height: 128, parent: 'body' }], animations: { idle: { durationMs: 1000, tracks: [] } } } };
    expect(() => validateCharacter(layered)).toThrow(/成环/);
    layered.renderer.layers[0].parent = 'missing'; expect(() => validateCharacter(layered)).toThrow(/父图层/);
    const valid = { ...layered, renderer: { ...layered.renderer, layers: [{ id: 'body', image: 'assets/star.png', width: 128, height: 128 }], animations: { idle: { durationMs: 1000, tracks: [{ layer: 'body', property: 'rotation', keys: [{ at: .5, value: 0 }, { at: .5, value: 20 }] }] } } } };
    expect(() => validateCharacter(valid)).toThrow(/递增/);
  });
});

describe('animation state and timeline', () => {
  it('prioritizes drag and sleep, plays atlas frames, and falls back for unsupported moods', () => {
    const clock = new AnimationClock(validateCharacter(star));
    expect(clock.step(.05, { ...state, mood: 'happy' }).action).toBe('happy');
    for (let i = 0; i < 4; i++) clock.step(.05, { ...state, mood: 'happy' });
    expect(clock.step(0, { ...state, mood: 'happy' }).frame).toBe(5);
    expect(clock.step(.01, { ...state, moving: true }).action).toBe('walk');
    expect(clock.step(.01, { ...state, moving: true, mood: 'sleeping' }).action).toBe('sleeping');
    expect(clock.step(.01, { ...state, dragging: true, mood: 'sleeping' }).action).toBe('dragged');
    expect(clock.step(.01, { ...state, mood: 'thinking' }).action).toBe('idle');
  });
  it('holds non-looping final poses, interpolates eased keys, and honors reduced motion', () => {
    expect(clipProgress(1500, 1000, false)).toBe(1); expect(clipProgress(1500, 1000, true)).toBe(.5);
    expect(sampleKeys([{ at: 0, value: 0, easing: 'linear' }, { at: 1, value: 100, easing: 'smooth' }], .25)).toBe(15.625);
    const clock = new AnimationClock(validateCharacter(star)); clock.poke();
    expect(clock.step(.05, state).action).toBe('poke');
    expect(clock.step(.05, { ...state, reducedMotion: true })).toMatchObject({ frame: 4, bob: 0, scale: 1, tilt: 0 });
  });
});

it('persists selection and credits, repairs imports, rejects modified archives, and removes only the chosen character', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-characters-'));
  try {
    const store = new CharacterStore(directory);
    await store.import(archive()); await store.select('paper-star');
    const reopened = new CharacterStore(directory);
    expect((await reopened.list()).selected).toBe('paper-star');
    expect((await reopened.load('paper-star')).assets['assets/star.png']).toMatch(/^data:image\/png;base64,/);
    const index = JSON.parse(await readFile(join(directory, 'paper-star.json'), 'utf8'));
    await writeFile(join(directory, `paper-star-${index.hash}.dshpet`), 'corrupt');
    await expect(reopened.load('paper-star')).rejects.toThrow(/损坏/);
    await reopened.import(archive()); expect((await reopened.load('paper-star')).manifest.license).toBe('MIT');
    await writeFile(join(directory, 'paper-star.json'), '{');
    expect((await reopened.list()).problems).toHaveLength(1);
    await reopened.import(archive()); expect((await reopened.list()).problems).toEqual([]);
    const reserved = createCharacterPack({ ...star, id: 'deepseek-whale' }, { 'assets/star.png': image });
    await expect(reopened.import(reserved)).rejects.toThrow(/内置角色/);
    await expect(reopened.load('../secret')).rejects.toThrow(/无效/);
    expect(await reopened.remove('paper-star')).toMatchObject({ characters: [], selected: 'deepseek-whale' });
    await writeFile(join(directory, '.selection.json'), JSON.stringify({ id: 'whale' }));
    expect((await reopened.list()).selected).toBe('deepseek-whale');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
