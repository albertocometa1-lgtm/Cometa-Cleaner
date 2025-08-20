import { SCHEMA_VERSION, STORES } from './schema.js';
import { migrate } from './migrations.js';

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
  const data = await loadState();
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export async function importBackup(input) {
  let text;
  if (input instanceof Blob) text = await input.text();
  else if (typeof input === 'string') text = input;
  else text = JSON.stringify(input);
  const data = JSON.parse(text);
  for (const name of Object.keys(data)) {
    const arr = data[name];
    if (Array.isArray(arr)) {
      for (const rec of arr) {
        await upsert(name, rec);
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
