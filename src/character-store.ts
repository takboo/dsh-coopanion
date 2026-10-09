import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readCharacterPack, validateCharacter, imageInfo, PACK_LIMIT, type CharacterManifest, type CharacterView } from './character-pack.ts';

export interface CharacterLibrary { characters: CharacterManifest[]; selected: string; problems: string[]; }
const validId = (id: string) => /^[a-z][a-z0-9-]{0,47}$/.test(id) && id !== 'whale';
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Stores data-only archives in the pet's own userData directory; all paths derive from validated ids and hashes. */
export class CharacterStore {
  constructor(readonly directory: string) {}
  private async atomic(file: string, value: string | Uint8Array): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const temp = `${file}.${randomUUID()}.tmp`;
    try { await writeFile(temp, value, { mode: 0o600 }); await rename(temp, file); }
    finally { await rm(temp, { force: true }); }
  }
  private async metadata(id: string): Promise<{ manifest: CharacterManifest; hash: string }> {
    if (!validId(id)) throw new Error('无效的角色 id');
    const path = join(this.directory, `${id}.json`);
    if ((await stat(path)).size > 256 * 1024) throw new Error('角色索引过大');
    const value = JSON.parse(await readFile(path, 'utf8'));
    const manifest = validateCharacter(value.manifest);
    if (manifest.id !== id || typeof value.hash !== 'string' || !/^[a-f0-9]{64}$/.test(value.hash)) throw new Error('角色索引无效，请重新导入');
    return { manifest, hash: value.hash };
  }
  private archive(id: string, hash: string): string { return join(this.directory, `${id}-${hash}.dshpet`); }
  async list(): Promise<CharacterLibrary> {
    await mkdir(this.directory, { recursive: true });
    const characters: CharacterManifest[] = [], problems: string[] = [];
    for (const file of await readdir(this.directory)) {
      if (!file.endsWith('.json') || !validId(file.slice(0, -5))) continue;
      try { characters.push((await this.metadata(file.slice(0, -5))).manifest); }
      catch (error) { problems.push(`无法读取角色 ${file.slice(0, -5)}：${error instanceof Error ? error.message : '索引错误'}`); }
    }
    let selected = 'whale';
    try {
      const path = join(this.directory, '.selection.json');
      if ((await stat(path)).size <= 256) {
        const value = JSON.parse(await readFile(path, 'utf8'));
        if (value.id === 'whale' || characters.some(item => item.id === value.id)) selected = value.id;
      }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') problems.push('角色选择记录损坏，已恢复小鲸'); }
    return { characters: characters.sort((a, b) => a.name.localeCompare(b.name)), selected, problems };
  }
  async import(bytes: Uint8Array): Promise<CharacterLibrary & { importedId: string }> {
    const { manifest } = readCharacterPack(bytes);
    if (!validId(manifest.id)) throw new Error('whale 是内置角色的保留 id');
    let previous: Awaited<ReturnType<CharacterStore['metadata']>> | undefined;
    try { previous = await this.metadata(manifest.id); }
    catch (error) {
      // A validated import can repair a malformed index; filesystem failures still surface.
      const code = (error as NodeJS.ErrnoException).code;
      if (code && code !== 'ENOENT') throw error;
    }
    const hash = digest(bytes);
    await this.atomic(this.archive(manifest.id, hash), bytes);
    await this.atomic(join(this.directory, `${manifest.id}.json`), JSON.stringify({ hash, manifest }));
    if (previous && previous.hash !== hash) await rm(this.archive(manifest.id, previous.hash), { force: true });
    return { ...await this.list(), importedId: manifest.id };
  }
  async load(id: string): Promise<CharacterView> {
    const { hash } = await this.metadata(id), path = this.archive(id, hash);
    if ((await stat(path)).size > PACK_LIMIT) throw new Error('角色包大小超出限制');
    const bytes = await readFile(path);
    if (digest(bytes) !== hash) throw new Error('角色包已损坏，请重新导入');
    const { manifest, assets } = readCharacterPack(bytes);
    if (manifest.id !== id) throw new Error('角色包与索引不匹配');
    return { manifest, assets: Object.fromEntries(Object.entries(assets).map(([path, data]) => [path, `data:${imageInfo(data).mime};base64,${Buffer.from(data).toString('base64')}`])) };
  }
  async select(id: string): Promise<void> {
    if (id !== 'whale') await this.metadata(id);
    await this.atomic(join(this.directory, '.selection.json'), JSON.stringify({ id }));
  }
  async remove(id: string): Promise<CharacterLibrary> {
    const { hash } = await this.metadata(id);
    await rm(join(this.directory, `${id}.json`));
    await rm(this.archive(id, hash), { force: true });
    const library = await this.list();
    await this.select(library.selected);
    return library;
  }
}
