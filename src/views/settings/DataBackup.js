import { getOrRequestDir } from '../../services/backupStorage.ts';
import { exportToDirectory, importFromDirectory } from '../../services/backupSerializer.ts';

const freqSelect = document.getElementById('backupFrequency');
const lastEl = document.getElementById('lastBackupInfo');
const importDirBtn = document.getElementById('importFromDir');

export async function initDataBackup(){
  importDirBtn?.addEventListener('click', async()=>{
    try{
      const dir = await getOrRequestDir();
      if(dir){ await exportToDirectory(dir); }
    }catch(err){ console.error('backup failed', err); }
  });
}

export async function doImportFromDirectory(){
  if(!('showDirectoryPicker' in window)) return;
  const dir = await (window as any).showDirectoryPicker({mode:'read'});
  await importFromDirectory(dir,{merge:false});
}

