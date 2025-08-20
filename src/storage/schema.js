export const SCHEMA_VERSION = 1;

export const STORES = {
  settings: { keyPath: 'id' },
  users: { keyPath: 'id' },
  rooms: { keyPath: 'id' },
  cleanings: { keyPath: 'id' },
  attachments: { keyPath: 'id' },
  meta: { keyPath: 'id' }
};

export function getStoreNames(){
  return Object.keys(STORES);
}
