# Firebase iOS Config Files

Posiziona qui il file `GoogleService-Info.plist` scaricato dalla console Firebase per la build iOS di Cometa Cleaner.

## Come aggiungere il file
1. Accedi alla console Firebase → **Project settings** → scheda dell'app iOS e scarica `GoogleService-Info.plist`.
2. Copia il file in questa cartella con il nome originale: `ios/firebase/GoogleService-Info.plist`.
3. Se vuoi versionarlo, aggiungilo a Git:
   ```bash
   git add ios/firebase/GoogleService-Info.plist
   git commit -m "Add Firebase iOS config"
   ```
   > In alternativa, aggiungi il file alla `.gitignore` se preferisci distribuirlo tramite un canale sicuro.
4. Quando apri il progetto in Xcode, trascina il file dal percorso `ios/firebase/GoogleService-Info.plist` nel target dell'app e assicurati che sia incluso in **Copy Bundle Resources**.

Seguendo queste istruzioni tutti i collaboratori sapranno dove trovare il file di configurazione iOS di Firebase.
