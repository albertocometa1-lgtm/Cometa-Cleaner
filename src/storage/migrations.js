import { STORES } from './schema.js';

const migrations = {
  1: (db) => {
    const names = Object.keys(STORES);
    names.forEach(name => {
      if (!db.objectStoreNames.contains(name)) {
        const { keyPath } = STORES[name];
        db.createObjectStore(name, { keyPath });
      }
    });
  }
};

export async function migrate(db, fromVersion, toVersion){
  let current = fromVersion;
  while(current < toVersion){
    const next = current + 1;
    const fn = migrations[next];
    if (fn) fn(db);
    current = next;
  }
}
