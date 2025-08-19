# Bug Report: PWA broken on load

## Reproduction Steps
1. Servire la cartella con `python3 -m http.server 8000`.
2. Aprire `http://localhost:8000/` in un browser (riproduzione qui tramite Node).

## Osservati
- Il JS inline in `index.html` non viene eseguito; la console mostra un errore di sintassi.
- Esecuzione dello script con Node:
```
$ node -e "..."
Parse error: Unexpected token 'for'
```

## Regression
- L'errore appare dopo le merge `codex/*` (vedi `git log`).

## Solution
- Rimosse righe residue `codex/*` in `index.html` che provocavano un `SyntaxError` in fase di parsing.
- Aggiornato il riferimento a `main.js?v=2` per sincronizzare la cache del Service Worker.

## Come Testare
1. Avviare `python3 -m http.server 8000`.
2. Aprire `http://localhost:8000/` in un browser.
3. Verificare che l'app carichi senza errori in console.
4. Eseguire il test rapido della sintassi:
   ```
   node - <<'NODE'
   const fs=require('fs');
   const c=fs.readFileSync('index.html','utf8');
   new Function(c.match(/<script>([\s\S]*?)<\/script>/)[1]);
   NODE
   ```
