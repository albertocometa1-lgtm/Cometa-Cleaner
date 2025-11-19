# Cometa Cleaner

App di esempio per la gestione delle pulizie domestiche in modalità PWA.

## Toolchain & build

Il progetto utilizza [Vite](https://vitejs.dev/) per l'impacchettamento della web app e [Capacitor 7](https://capacitorjs.com/) per generare il contenitore nativo iOS pronto per l'App Store.

```bash
npm install
npm run dev        # sviluppo PWA
npm run build      # bundle production + metadati build
npm run sync:ios   # copia degli asset dentro il progetto Xcode
npm run open:ios   # apre Xcode (richiede macOS)
```

La cartella `dist/` viene popolata da `npm run build` e quindi sincronizzata in `ios/App/App/public` tramite Capacitor. Il file `scripts/postbuild.mjs` allinea il valore `BUILD_HASH` usato dal service worker e genera `dist/build-meta.json`, utile per automatizzare versioni e release.

## Asset binari da aggiungere a mano

Per ridurre il peso della repo non vengono tracciati gli asset PNG (icone PWA, icone native e splash screen). Prima di eseguire una build destinata allo store:

1. Crea le cartelle indicate in `BINARY_ASSETS.md` (esistono già `public/icons/` e `ios/App/App/Assets.xcassets/…`).
2. Esporta i file elencati nella tabella con le dimensioni richieste.
3. Copia i PNG nei percorsi suggeriti e riesegui `npm run build && npm run sync:ios`.

Trovi il dettaglio completo (percorso, risoluzione, scopo) nel file [`BINARY_ASSETS.md`](./BINARY_ASSETS.md).

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

Il servizio di backup salva periodicamente tutti i dati dell'app:

* **Web / desktop:** l'utente autorizza una cartella tramite File System Access API (con fallback a OPFS). I backup vengono esportati come struttura di file leggibile.
* **App iOS (Capacitor):** quando l'app gira in una WebView nativa non viene mostrato il picker di cartelle (non supportato). I backup vengono invece serializzati come ZIP (riutilizzando lo stesso formato dell'esportazione manuale) e scritti automaticamente nella cartella `CometaCleaner/Backups` all'interno dei Documenti dell'app, accessibile dall'app File di iOS o da Finder.

Funzioni globali esposte nel browser:

```js
requestBackupDir();      // abilita la cartella di backup (solo Web)
importBackupFromDir();   // importa una struttura esportata precedentemente
setBackupFrequency(days);// aggiorna la frequenza schedulata
saveNativeBackupNow();   // forza la creazione di uno ZIP locale su iOS
```

I dispositivi iOS possono ripristinare l'ultimo ZIP salvato direttamente dall'app (impostazioni → Ripristina ultimo backup locale) grazie al bridge con `@capacitor/filesystem`.

## Foto delle pulizie

Le immagini allegate alle pulizie vengono salvate in uno store dedicato (`attachments`).
Per ogni foto sono persistiti metadati (id, `cleaningId`, MIME, dimensione e `createdAt`) e un URL base64.
I task memorizzano solo l'id dell'allegato e l'immagine viene recuperata dallo store quando necessario.

### Test manuali
1. Esegui `node scripts/dev-storage-smoke.mjs` per un test di base.
2. Inserisci dati nell'app, ricarica la pagina: i dati devono persistere.
3. Aggiorna il service worker e riapri: i dati rimangono.
4. Usa `exportBackup`/`importBackup` per verificare l'integrità dello ZIP.

