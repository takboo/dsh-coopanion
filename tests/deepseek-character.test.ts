import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { strToU8, unzipSync } from 'fflate';
import { ACTIONS, assetPaths, validateCharacter, createCharacterPack, readCharacterPack } from '../src/character-pack.ts';
import { AnimationClock, sampleKeys } from '../src/animation.ts';

const root = 'characters/deepseek-whale/';
const manifest = validateCharacter(JSON.parse(readFileSync(root + 'character.json', 'utf8')));
const assets = Object.fromEntries(assetPaths(manifest).map(path => [path, new Uint8Array(readFileSync(root + path))]));

it('packages the attributed DeepSeek artwork with its rights notice and pinned source integrity', () => {
  const source = JSON.parse(readFileSync(root + 'source.json', 'utf8'));
  const sourceHashes = new Set(source.files.map((file: { sha256: string }) => file.sha256));
  const copied = Object.entries(assets).filter(([path]) => !path.startsWith('assets/face-'));
  expect(copied).toHaveLength(23);
  for (const [, bytes] of copied) expect(sourceHashes.has(createHash('sha256').update(bytes).digest('hex'))).toBe(true);
  const license = readFileSync(root + 'LICENSE', 'utf8');
  const bytes = createCharacterPack(manifest, { ...assets, LICENSE: strToU8(license), 'README.md': new Uint8Array(readFileSync(root + 'README.md')) });
  const parsed = readCharacterPack(bytes);
  expect(parsed.manifest.id).toBe('deepseek-whale');
  expect(parsed.manifest.author).toMatch(/Pal-AI-Lab.*ZipZipPipe/);
  expect(parsed.manifest.license).toMatch(/上游声明/);
  expect(Buffer.from(unzipSync(bytes).LICENSE).toString()).toContain(source.commit);
  expect(license).toContain('溟月'); expect(license).toContain('AGPL 授权之外');
  expect(Object.keys(parsed.assets)).toHaveLength(31);
});

it('supplies every Harness action with matching expressions and a seated sleeping pose', () => {
  const renderer = manifest.renderer;
  if (renderer.type !== 'layers') throw new Error('DeepSeek pack must use layered keyframes');
  expect(Object.keys(renderer.animations).sort()).toEqual([...ACTIONS].sort());
  for (const action of ACTIONS) {
    const clock = new AnimationClock(manifest); if (action === 'poke') clock.poke();
    expect(clock.step(0, { mood: action, moving: action === 'walk', dragging: action === 'dragged', facing: 1, reducedMotion: false }).action).toBe(action);
  }
  const opacity = (action: 'happy' | 'sleeping', layer: string) => sampleKeys(renderer.animations[action]!.tracks.find(track => track.layer === layer && track.property === 'opacity')!.keys, .5);
  expect(opacity('happy', 'face-neutral')).toBe(0); expect(opacity('happy', 'face-happy')).toBe(1);
  expect(opacity('sleeping', 'face-sleeping')).toBe(1); expect(opacity('sleeping', 'skirt')).toBe(0);
  expect(opacity('sleeping', 'skirt-sitting')).toBe(1); expect(opacity('sleeping', 'leg-front')).toBe(0);
});
