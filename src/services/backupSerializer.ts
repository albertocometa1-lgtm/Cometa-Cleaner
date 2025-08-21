import { loadState, upsert, clearAll } from '../storage/storage.js';
import { sha256 } from '../utils/checksum.ts';

export interface ManifestEntry{ path:string; hash:string; }
export interface BackupManifest{ version:number; generatedAt:string; files: ManifestEntry[]; }

export async function exportToDirectory(dir: FileSystemDirectoryHandle){
  const state = await loadState();
  const manifest: BackupManifest = { version:1, generatedAt:new Date().toISOString(), files:[] };
  for(const [name, records] of Object.entries(state)){
    const fileHandle = await dir.getFileHandle(`${name}.json`, {create:true});
    const writable = await fileHandle.createWritable();
    const text = JSON.stringify(records);
    await writable.write(text);
    await writable.close();
    const hash = await sha256(text);
    manifest.files.push({ path: `${name}.json`, hash });
  }
  const manifestHandle = await dir.getFileHandle('backup-manifest.json', {create:true});
  const mw = await manifestHandle.createWritable();
  await mw.write(JSON.stringify(manifest, null, 2));
  await mw.close();
  return manifest;
}

async function readJSON(file: File){
  const text = await file.text();
  return JSON.parse(text);
}

export async function importFromDirectory(dir: FileSystemDirectoryHandle, { merge = false } = {}){
  const manifestFile = await dir.getFileHandle('backup-manifest.json').then(h=>h.getFile());
  const manifest: BackupManifest = await readJSON(manifestFile);
  if(!merge) await clearAll();
  for(const entry of manifest.files){
    const fh = await dir.getFileHandle(entry.path).then(h=>h.getFile());
    const data = await readJSON(fh);
    if(Array.isArray(data)){
      for(const rec of data){ await upsert(entry.path.replace('.json',''), rec); }
    }
  }
}
