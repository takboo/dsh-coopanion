import { readCharacterPack, packView } from './character-runtime.js';

const BUILTIN_ID = 'deepseek-whale';
const LEGACY_BUILTIN_ID = 'whale';

const open = () => new Promise((resolve, reject) => {
  const request = indexedDB.open('dsh-character-library', 1);
  request.onupgradeneeded = () => { request.result.createObjectStore('packs'); request.result.createObjectStore('settings'); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
async function transact(store, mode, operation) {
  const db = await open();
  try {
    const transaction = db.transaction(store, mode);
    const complete = new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error); });
    const request = operation(transaction.objectStore(store));
    const result = new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const [value] = await Promise.all([result, complete]); return value;
  } finally { db.close(); }
}
const get = (store, id) => transact(store, 'readonly', store => store.get(id));
const put = (store, id, value) => transact(store, 'readwrite', store => store.put(value, id));

/** Browser demonstrations retain data in IndexedDB; Desktop uses its own native store. */
export const browserCharacters = {
  async list() {
    const values = (await transact('packs', 'readonly', store => store.getAll())).filter(value => ![BUILTIN_ID, LEGACY_BUILTIN_ID].includes(value.manifest.id));
    const saved = await get('settings', 'selected');
    const selected = saved === BUILTIN_ID || saved === LEGACY_BUILTIN_ID ? BUILTIN_ID : values.some(value => value.manifest.id === saved) ? saved : BUILTIN_ID;
    return { characters: values.map(value => value.manifest), selected, problems: [] };
  },
  async import(bytes) {
    const view = packView(readCharacterPack(new Uint8Array(bytes)));
    if ([BUILTIN_ID, LEGACY_BUILTIN_ID].includes(view.manifest.id)) throw new Error('该 id 是内置角色的保留 id');
    await put('packs', view.manifest.id, view); return { ...await this.list(), importedId: view.manifest.id };
  },
  async load(id) { const view = await get('packs', id); if (!view) throw new Error('找不到角色，请重新导入'); return view; },
  async select(id) { const selected = id === LEGACY_BUILTIN_ID ? BUILTIN_ID : id; if (selected !== BUILTIN_ID) await this.load(selected); await put('settings', 'selected', selected); },
  async remove(id) { if ([BUILTIN_ID, LEGACY_BUILTIN_ID].includes(id)) throw new Error('不能删除内置大肥鱼'); await transact('packs', 'readwrite', store => store.delete(id)); const library = await this.list(); await this.select(library.selected); return library; },
};
