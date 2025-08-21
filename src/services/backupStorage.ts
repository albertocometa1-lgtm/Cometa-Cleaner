const DB_NAME = 'backup-storage';
const STORE_NAME = 'handles';
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME,1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function saveHandle(handle: FileSystemDirectoryHandle){
  const db = await openDB();
  const tx = db.transaction(STORE_NAME,'readwrite');
  tx.objectStore(STORE_NAME).put(handle,'backupDir');
  return new Promise((res,rej)=>{tx.oncomplete=()=>res(undefined); tx.onerror=()=>rej(tx.error);});
}

async function loadHandle(): Promise<FileSystemDirectoryHandle|null>{
  const db = await openDB();
  const tx = db.transaction(STORE_NAME,'readonly');
  const req = tx.objectStore(STORE_NAME).get('backupDir');
  return new Promise((resolve)=>{
    req.onsuccess = ()=> resolve(req.result || null);
    req.onerror = ()=> resolve(null);
  });
}

export async function requestBackupDir(){
  if(!('showDirectoryPicker' in window)){
    const opfs = await navigator.storage.getDirectory();
    await saveHandle(opfs as unknown as FileSystemDirectoryHandle);
    return opfs as unknown as FileSystemDirectoryHandle;
  }
  const handle = await (window as any).showDirectoryPicker({mode:'readwrite'});
  await handle.requestPermission({mode:'readwrite'});
  if(navigator.storage && (navigator.storage as any).persist){
    try{ await (navigator.storage as any).persist(); }catch{}
  }
  await saveHandle(handle);
  return handle;
}

export async function ensurePermissions(){
  let handle = await loadHandle();
  if(!handle) return null;
  const perm = await (handle as any).queryPermission?.({mode:'readwrite'});
  if(perm === 'granted') return handle;
  if(perm === 'prompt'){
    const res = await (handle as any).requestPermission?.({mode:'readwrite'});
    if(res === 'granted') return handle;
  }
  return null;
}

export async function getOrRequestDir(){
  const h = await ensurePermissions();
  if(h) return h;
  return requestBackupDir();
}
