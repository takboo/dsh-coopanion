import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { assetPaths, validateCharacter } from '../dist/character-pack.js';

export async function syncDeepseekBuiltin() {
  const source = resolve('characters/deepseek-whale');
  const target = resolve('web/characters/deepseek-whale');
  const manifest = validateCharacter(JSON.parse(await readFile(join(source, 'character.json'), 'utf8')));
  await rm(target, { recursive: true, force: true });
  await mkdir(join(target, 'assets'), { recursive: true });
  for (const path of assetPaths(manifest)) await copyFile(join(source, path), join(target, path));
  for (const name of ['README.md', 'LICENSE']) await copyFile(join(source, name), join(target, name));
  await writeFile(join(target, 'character.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(target, 'manifest.js'), `export const builtinDeepseekWhale = ${JSON.stringify(manifest, null, 2)};\n`);
  console.log(`内置大肥鱼已同步：${assetPaths(manifest).length} 个素材`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await syncDeepseekBuiltin();
