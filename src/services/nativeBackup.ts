import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { exportBackup, importBackup } from '../storage/storage.js';
import { makeBackupFilename } from '../utils/zip.js';

const BACKUP_FOLDER = 'CometaCleaner/Backups';

function isNative(){
  return Capacitor.isNativePlatform();
}

async function ensureFolder(){
  if(!isNative()) return;
  try{
    await Filesystem.mkdir({ path: BACKUP_FOLDER, directory: Directory.Documents, recursive: true });
  }catch(err){
    if((err as any)?.message?.includes('EEXIST')) return;
  }
}

async function blobToBase64(blob: Blob): Promise<string>{
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for(const b of bytes){
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function base64ToUint8Array(data: string): Uint8Array{
  const bin = atob(data);
  const buf = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

export function isNativePlatform(){
  return isNative();
}

export async function saveNativeBackup(){
  if(!isNative()) return null;
  await ensureFolder();
  const file = await exportBackup();
  const payload = await blobToBase64(file);
  const filename = file.name || makeBackupFilename('backup');
  await Filesystem.writeFile({
    path: `${BACKUP_FOLDER}/${filename}`,
    directory: Directory.Documents,
    data: payload,
    encoding: 'base64',
    recursive: true
  });
  return filename;
}

export async function listNativeBackups(){
  if(!isNative()) return [];
  await ensureFolder();
  const { files } = await Filesystem.readdir({ path: BACKUP_FOLDER, directory: Directory.Documents });
  return files
    .filter((f: any) => f.type === 'file' && f.name.endsWith('.zip'))
    .sort((a: any, b: any) => (b.ctime || 0) - (a.ctime || 0));
}

export async function getNativeBackupStats(){
  const files = await listNativeBackups();
  const latest = files[0];
  const total = files.reduce((sum: number, f: any) => sum + (f.size || 0), 0);
  return {
    totalBytes: total,
    lastBackupAt: latest?.ctime || null,
    fileCount: files.length
  };
}

export async function restoreLatestNativeBackup(){
  if(!isNative()) throw new Error('Backup nativi disponibili solo dentro l’app.');
  const files = await listNativeBackups();
  if(!files.length) throw new Error('Nessun backup salvato sul dispositivo.');
  const filename = files[0].name;
  const { data } = await Filesystem.readFile({ path: `${BACKUP_FOLDER}/${filename}`, directory: Directory.Documents });
  const bytes = base64ToUint8Array(data);
  await importBackup(bytes.buffer);
  return filename;
}
