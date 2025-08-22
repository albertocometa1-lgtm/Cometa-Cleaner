import { SCHEMA_VERSION, STORES } from './schema.js';
import { migrate } from './migrations.js';
import { sha256 } from '../utils/checksum.ts';
import { getJSZip, makeBackupFilename } from '../utils/zip.js';

const DB_NAME = 'cometa-cleaner';
const hasIndexedDB = typeof indexedDB !== 'undefined';

const local = (() => {
  if (typeof localStorage !== 'undefined') return localStorage;
  let mem = {};
  return {
    getItem: k => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: k => { delete mem[k]; },
    clear: () => { mem = {}; },
    key: i => Object.keys(mem)[i] || null,
    get length(){ return Object.keys(mem).length; }
  };
})();

let dbPromise = null;
let bc = null;
let dirty = false;
let saveTimer = null;
let lastSave = 0;
let pendingState = {};
let maintenanceMode = false;

function openDB() {
  if (!hasIndexedDB) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = (e) => {
      migrate(req.result, e.oldVersion, e.newVersion);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function initStorage() {
  await openDB();
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel('app-state');
    bc.onmessage = (evt) => {
      if (evt.data?.type === 'state-updated' && typeof window !== 'undefined') {
        // optional: could reload state in background
      }
    };
  }
}

function withStore(name, mode, fn) {
  return openDB().then(db => {
    if (!db) return fn(null);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, mode);
      const store = tx.objectStore(name);
      const result = fn(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  });
}

async function localList(name) {
  const key = `cc_${name}`;
  try {
    return JSON.parse(local.getItem(key) || '[]');
  } catch {
    return [];
  }
}

async function localWrite(name, record) {
  const list = await localList(name);
  const idx = list.findIndex(r => r.id === record.id);
  if (idx >= 0) list[idx] = record; else list.push(record);
  local.setItem(`cc_${name}`, JSON.stringify(list));
}

async function localRemove(name, id) {
  const list = await localList(name);
  const n = list.filter(r => r.id !== id);
  local.setItem(`cc_${name}`, JSON.stringify(n));
}

export async function upsert(table, record) {
  if (!hasIndexedDB) return localWrite(table, { ...record, lastModified: Date.now() });
  return withStore(table, 'readwrite', store => store.put({ ...record, lastModified: Date.now() }));
}

export async function remove(table, id) {
  if (!hasIndexedDB) return localRemove(table, id);
  return withStore(table, 'readwrite', store => store.delete(id));
}

export async function get(table, id) {
  if (!hasIndexedDB) {
    const list = await localList(table);
    return list.find(r => r.id === id) || null;
  }
  return withStore(table, 'readonly', store => store.get(id));
}

export async function list(table) {
  if (!hasIndexedDB) return localList(table);
  return withStore(table, 'readonly', store => store.getAll());
}

export async function loadState() {
  const state = {};
  for (const name of Object.keys(STORES)) {
    state[name] = await list(name);
  }
  return state;
}

function doSave(state) {
  const names = Object.keys(state);
  const ops = names.map(name => {
    const records = Array.isArray(state[name]) ? state[name] : [state[name]];
    return Promise.all(records.map(r => upsert(name, r)));
  });
  return Promise.all(ops).then(() => {
    lastSave = Date.now();
    dirty = false;
    if (bc) bc.postMessage({ type: 'state-updated' });
    return upsert('meta', { id: 'app', lastAutosaveAt: lastSave });
  });
}

export function saveState(partialState, { reason } = {}) {
  if (maintenanceMode) return;
  Object.assign(pendingState, partialState);
  dirty = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const now = Date.now();
    const wait = Math.max(0, 3000 - (now - lastSave));
    setTimeout(async () => {
      const toSave = { ...pendingState };
      pendingState = {};
      await doSave(toSave);
    }, wait);
  }, 600);
}

export async function exportBackup() {
  const JSZip = await getJSZip();
  const state = await loadState();
  const manifest = { version: 1, generatedAt: new Date().toISOString(), files: [] };
  const zip = new JSZip();
  for (const [name, records] of Object.entries(state)) {
    const text = JSON.stringify(records);
    zip.file(`${name}.json`, text);
    const hash = await sha256(text);
    manifest.files.push({ path: `${name}.json`, hash });
  }
  zip.file('backup-manifest.json', JSON.stringify(manifest, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = makeBackupFilename('backup');
  if (typeof File !== 'undefined') {
    return new File([blob], filename, { type: 'application/zip' });
  }
  blob.name = filename;
  return blob;
}

export async function importBackup(input) {
  let source;
  if (input instanceof Blob) {
    source = await input.arrayBuffer();
  } else if (input instanceof ArrayBuffer) {
    source = input;
  } else if (typeof input === 'string') {
    source = new TextEncoder().encode(input);
  } else {
    source = new TextEncoder().encode(JSON.stringify(input));
  }
  const JSZip = await getJSZip();
  const zip = await JSZip.loadAsync(source);
  const manifestText = await zip.file('backup-manifest.json').async('string');
  const manifest = JSON.parse(manifestText);
  for (const entry of manifest.files) {
    const file = zip.file(entry.path);
    if (!file) continue;
    const text = await file.async('string');
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      for (const rec of data) {
        await upsert(entry.path.replace('.json', ''), rec);
      }
    }
  }
}

export async function clearAll() {
  if (!hasIndexedDB) {
    for (let i = local.length - 1; i >= 0; i--) {
      const key = local.key(i);
      if (key && key.startsWith('cc_')) local.removeItem(key);
    }
    return;
  }
  const db = await openDB();
  const names = Object.keys(STORES);
  await Promise.all(names.map(n => withStore(n, 'readwrite', store => store.clear())));
}

export { openDB };
export function setMaintenanceMode(flag){
  maintenanceMode = flag;
}
