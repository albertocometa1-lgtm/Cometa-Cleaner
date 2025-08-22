import { ensurePermissions } from '../../services/backupStorage.ts';
import { get } from '../../storage/storage.js';

const freqSelect = document.getElementById('backupFrequency');
const lastEl = document.getElementById('lastBackupInfo');
const importDirBtn = document.getElementById('importFromDir');
const selectDirBtn = document.getElementById('selectBackupDir');
const importZipInput = document.getElementById('importFromZip');

export async function initDataBackup(){
  importDirBtn?.addEventListener('click', async()=>{
    try{
      await (window as any).importBackupFromDir?.();
      await refreshLastInfo();
    }catch(err){ console.error('import failed', err); }
  });

  selectDirBtn?.addEventListener('click', async()=>{
    try{ await (window as any).requestBackupDir?.(); await refreshLastInfo(); }
    catch(err){ console.error('select dir failed', err); }
  });

  importZipInput?.addEventListener('change', async (e)=>{
    const file = (e.target as HTMLInputElement).files?.[0];
    if(!file) return;
    try{
      await (window as any).importBackup?.(file);
      await refreshLastInfo();
    }catch(err){ console.error('zip import failed', err); }
    (e.target as HTMLInputElement).value = '';
  });

  freqSelect?.addEventListener('change', async()=>{
    const days = parseInt((freqSelect as HTMLSelectElement).value,10);
    if(!isNaN(days)) await (window as any).setBackupFrequency?.(days);
  });


  const meta = await get('meta','backup') || {};
  if(freqSelect && meta.freqDays) (freqSelect as HTMLSelectElement).value = String(meta.freqDays);
  await refreshLastInfo(meta);
}

async function refreshLastInfo(meta?: any){
  if(!lastEl) return;
  meta = meta || await get('meta','backup') || {};
  let text = 'Ultimo backup: mai';
  if(meta.lastBackupAt){
    let sizeStr = '';
    try{
      const dir = await ensurePermissions();
      if(dir){
        const total = await dirSize(dir);
        sizeStr = ` (${formatBytes(total)})`;
      }
    }catch(err){ console.warn('size calc failed', err); }
    text = `Ultimo backup: ${new Date(meta.lastBackupAt).toLocaleString()}${sizeStr}`;
  }
  lastEl.textContent = text;
}

async function dirSize(dir: any): Promise<number>{
  let total = 0;
  for await (const [, handle] of (dir as any).entries()){
    if(handle.kind === 'file'){
      const f = await handle.getFile();
      total += f.size;
    }else if(handle.kind === 'directory'){
      total += await dirSize(handle);
    }
  }
  return total;
}

function formatBytes(bytes:number){
  if(bytes >= 1048576) return (bytes/1048576).toFixed(1) + ' MB';
  if(bytes >= 1024) return (bytes/1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

