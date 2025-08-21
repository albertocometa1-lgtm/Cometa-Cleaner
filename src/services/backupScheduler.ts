import { getOrRequestDir, ensurePermissions } from './backupStorage.ts';
import { exportToDirectory } from './backupSerializer.ts';
import { get, upsert } from '../storage/storage.js';

const DEFAULT_FREQ_DAYS = 7;

export async function runScheduledBackup(){
  const meta = await get('meta','backup') || {};
  const freq = meta.freqDays || DEFAULT_FREQ_DAYS;
  const last = meta.lastBackupAt || 0;
  const dir = await ensurePermissions();
  if(!dir) return; // no dir yet
  const now = Date.now();
  if(now - last < freq*86400000) return;
  try{
    await exportToDirectory(dir);
    await upsert('meta',{id:'backup', lastBackupAt: now, freqDays: freq});
  }catch(err){ console.error('auto backup failed', err); }
}

export async function setBackupFrequency(days:number){
  const meta = await get('meta','backup') || {};
  await upsert('meta',{id:'backup', lastBackupAt: meta.lastBackupAt||0, freqDays: days});
}
