import { loadState, upsert, clearAll } from '../storage/storage.js';
import { sha256 } from '../utils/checksum.ts';

export interface ManifestEntry{ path:string; hash:string; }
export interface BackupManifest{ schemaVersion:number; generatedAt:string; appVersion:string; files: ManifestEntry[]; }

const APP_VERSION = '1';

function mimeToExt(mime:string){
  const sub = (mime||'').split('/')[1]||'';
  return sub === 'jpeg' ? 'jpg' : sub;
}

function dataURLToArrayBuffer(url:string){
  const b64 = url.split(',')[1]||'';
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for(let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToDataURL(buf:ArrayBuffer, mime:string){
  const bytes = new Uint8Array(buf);
  let bin='';
  for(const b of bytes) bin += String.fromCharCode(b);
  return `data:${mime};base64,${btoa(bin)}`;
}

async function getFile(dir: FileSystemDirectoryHandle, path:string){
  const parts = path.split('/');
  let current: FileSystemDirectoryHandle = dir;
  for(let i=0;i<parts.length-1;i++){
    current = await current.getDirectoryHandle(parts[i]);
  }
  const fh = await current.getFileHandle(parts[parts.length-1]);
  return fh.getFile();
}

export async function exportToDirectory(dir: FileSystemDirectoryHandle){
  const state = await loadState();
  const manifest: BackupManifest = { schemaVersion:1, generatedAt:new Date().toISOString(), appVersion:APP_VERSION, files:[] };
  const photosDir = await dir.getDirectoryHandle('photos', {create:true});
  const prefsDir = await dir.getDirectoryHandle('prefs', {create:true});

  for(const [name, records] of Object.entries(state)){
    if(name === 'attachments'){
      const meta:any[] = [];
      for(const rec of records as any[]){
        const ext = mimeToExt(rec.mime||'');
        const filename = `${rec.id}.${ext}`;
        const buf = dataURLToArrayBuffer(rec.url||'');
        const fh = await photosDir.getFileHandle(filename, {create:true});
        const w = await fh.createWritable();
        await w.write(buf);
        await w.close();
        const hash = await sha256(buf);
        manifest.files.push({ path:`photos/${filename}`, hash });
        const {url, ...rest} = rec;
        meta.push({...rest, file:filename});
      }
      const metaHandle = await photosDir.getFileHandle('metadata.json', {create:true});
      const metaText = JSON.stringify(meta);
      const mw = await metaHandle.createWritable();
      await mw.write(metaText);
      await mw.close();
      const metaHash = await sha256(metaText);
      manifest.files.push({ path:'photos/metadata.json', hash: metaHash });
    }else if(name === 'settings'){
      const fileHandle = await prefsDir.getFileHandle(`${name}.json`, {create:true});
      const writable = await fileHandle.createWritable();
      const text = JSON.stringify(records);
      await writable.write(text);
      await writable.close();
      const hash = await sha256(text);
      manifest.files.push({ path:`prefs/${name}.json`, hash });
    }else{
      const fileHandle = await dir.getFileHandle(`${name}.json`, {create:true});
      const writable = await fileHandle.createWritable();
      const text = JSON.stringify(records);
      await writable.write(text);
      await writable.close();
      const hash = await sha256(text);
      manifest.files.push({ path: `${name}.json`, hash });
    }
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
    if(entry.path.startsWith('photos/')) continue; // handled separately
    const file = await getFile(dir, entry.path);
    const data = await readJSON(file);
    if(Array.isArray(data)){
      let table = entry.path.replace(/\.json$/,'');
      if(table.startsWith('prefs/')) table = table.slice('prefs/'.length);
      for(const rec of data){ await upsert(table, rec); }
    }
  }

  // restore photos
  let meta:any[] = [];
  try{
    const metaFile = await getFile(dir, 'photos/metadata.json');
    meta = await readJSON(metaFile);
  }catch{}
  if(Array.isArray(meta)){
    const photosDir = await dir.getDirectoryHandle('photos');
    for(const m of meta){
      const fh = await photosDir.getFileHandle(m.file).then(h=>h.getFile());
      const buf = await fh.arrayBuffer();
      const url = arrayBufferToDataURL(buf, m.mime||'');
      const {file, ...rest} = m;
      await upsert('attachments', {...rest, url});
    }
  }
}
