import { ensurePermissions } from './backupStorage.ts';
import { exportToDirectory } from './backupSerializer.ts';
import { get, upsert } from '../storage/storage.js';

const DEFAULT_FREQ_DAYS = 7;
let schedulerInit = false;

declare global {
  interface ServiceWorkerRegistration {
    periodicSync?: {
      register(tag: string, options: { minInterval: number }): Promise<void>;
    };
  }
}

async function tryRegisterPeriodicSync(freq: number): Promise<boolean> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.periodicSync) {
        await reg.periodicSync.register('cometa-backup', {
          minInterval: freq * 86400000,
        });
        return true;
      }
    }
  } catch (err) {
    console.warn('periodicSync registration failed', err);
  }
  return false;
}

function setupVisibilityChecks() {
  const check = () => {
    runScheduledBackup();
  };
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
}

export async function runScheduledBackup() {
  const meta = (await get('meta', 'backup')) || {};
  const freq = meta.freqDays || DEFAULT_FREQ_DAYS;

  if (!schedulerInit) {
    schedulerInit = true;
    await tryRegisterPeriodicSync(freq);
    setupVisibilityChecks();
  }

  const last = meta.lastBackupAt || 0;
  const dir = await ensurePermissions();
  if (!dir) return; // no dir yet
  const now = Date.now();
  if (now - last < freq * 86400000) return;
  try {
    await exportToDirectory(dir);
    await upsert('meta', { id: 'backup', lastBackupAt: now, freqDays: freq });
  } catch (err) {
    console.error('auto backup failed', err);
  }
}

export async function setBackupFrequency(days: number) {
  const meta = (await get('meta', 'backup')) || {};
  await upsert('meta', { id: 'backup', lastBackupAt: meta.lastBackupAt || 0, freqDays: days });
}
