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
Nel contesto delle impostazioni possono essere esposte funzioni globali:
```js
window.exportBackup(); // restituisce un Blob JSON
window.importBackup(fileOrString); // importa i dati
window.clearAllData(); // svuota lo storage
```

### Test manuali
1. Esegui `node scripts/dev-storage-smoke.mjs` per un test di base.
2. Inserisci dati nell'app, ricarica la pagina: i dati devono persistere.
3. Aggiorna il service worker e riapri: i dati rimangono.
4. Usa `exportBackup`/`importBackup` per verificare l'integrità del JSON.

