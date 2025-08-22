import { getOrRequestDir, requestBackupDir } from '../../services/backupStorage.ts';
import { importFromDirectory } from '../../services/backupSerializer.ts';
import { setBackupFrequency } from '../../services/backupScheduler.ts';
import { get } from '../../storage/storage.js';

const freqSelect = document.getElementById('backupFrequency');
const lastEl = document.getElementById('lastBackupInfo');
const importDirBtn = document.getElementById('importFromDir');
const selectDirBtn = document.getElementById('selectBackupDir');

export async function initDataBackup(){
  importDirBtn?.addEventListener('click', async()=>{
    try{
      await doImportFromDirectory();
    }catch(err){ console.error('import failed', err); }
  });

  selectDirBtn?.addEventListener('click', async()=>{
    try{ await requestBackupDir(); }catch(err){ console.error('select dir failed', err); }
  });

  freqSelect?.addEventListener('change', async()=>{
    const days = parseInt((freqSelect as HTMLSelectElement).value,10);
    if(!isNaN(days)) await setBackupFrequency(days);
  });

  const meta = await get('meta','backup') || {};
  if(freqSelect && meta.freqDays) (freqSelect as HTMLSelectElement).value = String(meta.freqDays);
  if(lastEl){
    lastEl.textContent = meta.lastBackupAt
      ? `Ultimo backup: ${new Date(meta.lastBackupAt).toLocaleString()}`
      : 'Ultimo backup: mai';
  }
}

export async function doImportFromDirectory(){
  const dir = await getOrRequestDir();
  if(dir){ await importFromDirectory(dir,{merge:false}); }
}

