import { ensurePermissions } from '../../services/backupStorage.ts';
import { get } from '../../storage/storage.js';
import { getNativeBackupStats, isNativePlatform, restoreLatestNativeBackup } from '../../services/nativeBackup.ts';

const freqSelect = document.getElementById('backupFrequency');
const lastEl = document.getElementById('lastBackupInfo');
const importDirBtn = document.getElementById('importFromDir');
const selectDirBtn = document.getElementById('selectBackupDir');
const importZipInput = document.getElementById('importFromZip');
const nativeContext = isNativePlatform();

export async function initDataBackup(){
  importDirBtn?.addEventListener('click', async()=>{
    try{
      if(nativeContext){
        await restoreLatestNativeBackup();
      }else{
        await window.importBackupFromDir?.();
      }
      await refreshLastInfo();
    }catch(err){ console.error('import failed', err); }
  });

  selectDirBtn?.addEventListener('click', async()=>{
    if(nativeContext){
      alert('I backup automatici vengono salvati nella cartella Documenti dell’app. Puoi recuperarli dalla vista “File” di iOS.');
      return;
    }
    try{ await window.requestBackupDir?.(); await refreshLastInfo(); }
    catch(err){ console.error('select dir failed', err); }
  });

  importZipInput?.addEventListener('change', async (e)=>{
    const input = e.target;
    if(!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    if(!file) return;
    try{
      await window.importBackup?.(file);
      await refreshLastInfo();
    }catch(err){ console.error('zip import failed', err); }
    input.value = '';
  });

  freqSelect?.addEventListener('change', async()=>{
    if(!(freqSelect instanceof HTMLSelectElement)) return;
    const days = parseInt(freqSelect.value,10);
    if(!isNaN(days)) await window.setBackupFrequency?.(days);
  });


  const meta = await get('meta','backup') || {};
  if(nativeContext){
    selectDirBtn?.setAttribute('data-native-mode','true');
    if(importDirBtn) importDirBtn.textContent = 'Ripristina ultimo backup locale';
  }

  if(freqSelect instanceof HTMLSelectElement && meta.freqDays){
    freqSelect.value = String(meta.freqDays);
  }
  await refreshLastInfo(meta);
}

async function refreshLastInfo(meta){
  if(!lastEl) return;
  meta = meta || await get('meta','backup') || {};
  let text = 'Ultimo backup: mai';
  if(nativeContext){
    const stats = await getNativeBackupStats();
    if(stats.lastBackupAt){
      text = `Ultimo backup iOS: ${new Date(stats.lastBackupAt).toLocaleString()} (${formatBytes(stats.totalBytes)})`;
    }
  }else if(meta.lastBackupAt){
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

async function dirSize(dir){
  let total = 0;
  for await (const [, handle] of dir.entries()){
    if(handle.kind === 'file'){
      const f = await handle.getFile();
      total += f.size;
    }else if(handle.kind === 'directory'){
      total += await dirSize(handle);
    }
  }
  return total;
}

function formatBytes(bytes){
  if(bytes >= 1048576) return (bytes/1048576).toFixed(1) + ' MB';
  if(bytes >= 1024) return (bytes/1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

