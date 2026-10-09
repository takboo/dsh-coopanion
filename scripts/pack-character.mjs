import { readFile, writeFile, stat, realpath } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { createCharacterPack, validateCharacter, assetPaths, FILE_LIMIT } from '../dist/character-pack.js';

const source = process.argv[2];
if (!source) throw new Error('用法：npm run character:pack -- <角色目录> [输出.dshpet]');
const root = await realpath(resolve(source));
const manifest = validateCharacter(JSON.parse(await readFile(join(root, 'character.json'), 'utf8')));
const assets = {};
for (const path of assetPaths(manifest)) {
  const file = await realpath(join(root, path));
  if (!file.startsWith(root + sep) || (await stat(file)).size > FILE_LIMIT) throw new Error(`素材必须位于角色目录内且不超过 16 MiB：${path}`);
  assets[path] = new Uint8Array(await readFile(file));
}
for (const name of ['README.md', 'LICENSE']) {
  try {
    const file = await realpath(join(root, name));
    if (!file.startsWith(root + sep)) throw new Error(`${name} 必须位于角色目录内`);
    if ((await stat(file)).size > 256 * 1024) throw new Error(`${name} 不能超过 256 KiB`);
    assets[name] = new Uint8Array(await readFile(file));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const output = resolve(process.argv[3] ?? `${manifest.id}.dshpet`);
const bytes = createCharacterPack(manifest, assets);
await writeFile(output, bytes);
console.log(`角色包已验证并生成：${output}（${bytes.length} 字节）`);
