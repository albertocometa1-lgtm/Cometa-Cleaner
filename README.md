# Cometa Cleaner

App di esempio per la gestione delle pulizie domestiche in modalità PWA.

## Offline-first & Backup

La persistenza locale è gestita tramite IndexedDB con fallback a localStorage.

### Avvio
1. All'avvio l'app inizializza lo storage (`initStorage`) e ripristina lo stato salvato (`loadState`).
2. Se esistono dati salvati vengono riapplicati automaticamente.

### Autosalvataggio
- Eventi `input`, `change`, `blur`, `visibilitychange` e `beforeunload` attivano un salvataggio con debounce di ~600ms e rate limit di 3s.
- Più tab vengono sincronizzate tramite `BroadcastChannel`.

### Backup manuale
Quando la File System Access API non è disponibile, i dati vengono esportati/importati tramite file ZIP generati con [JSZip](https://stuk.github.io/jszip/), nominati `backup-YYYYMMDD-HHMM.zip`.
Nel contesto delle impostazioni possono essere esposte funzioni globali:
```js
window.exportBackup(); // restituisce un File ZIP
window.importBackup(fileOrBlob); // importa i dati da uno ZIP
window.clearAllData(); // svuota lo storage
```

## Backup locale automatico

Il servizio di backup salva periodicamente tutti i dati dell'app in una cartella scelta dall'utente utilizzando la File System Access API (con fallback a OPFS).

Funzioni disponibili nel contesto globale:

```js
requestBackupDir(); // permette di scegliere/autorizarre la cartella di backup
importBackupFromDir(); // importa i dati da una cartella precedentemente esportata (merge o sovrascrivi)
setBackupFrequency(days); // imposta la frequenza dell'export automatico
```

## Foto delle pulizie

Le immagini allegate alle pulizie vengono salvate in uno store dedicato (`attachments`).
Per ogni foto sono persistiti metadati (id, `cleaningId`, MIME, dimensione e `createdAt`) e un URL base64.
I task memorizzano solo l'id dell'allegato e l'immagine viene recuperata dallo store quando necessario.

### Test manuali
1. Esegui `node scripts/dev-storage-smoke.mjs` per un test di base.
2. Inserisci dati nell'app, ricarica la pagina: i dati devono persistere.
3. Aggiorna il service worker e riapri: i dati rimangono.
4. Usa `exportBackup`/`importBackup` per verificare l'integrità dello ZIP.

