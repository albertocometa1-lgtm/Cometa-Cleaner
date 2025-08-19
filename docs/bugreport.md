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

## Nuovo stato dopo fix
- L'app continua a non avviarsi su ambienti privi di `structuredClone`.
- Esecuzione del JS mostra:
  ```
  ReferenceError: structuredClone is not defined
  ```

## Soluzione
- Aggiunto polyfill per `structuredClone` in `index.html` per garantire compatibilità con browser meno recenti.

## Come Testare
1. Avviare `python3 -m http.server 8000`.
2. Aprire `http://localhost:8000/` in un browser.
3. Verificare che l'app carichi senza errori in console.
4. Per replicare il vecchio errore:
   ```
   node - <<'NODE'
   const fs=require('fs');
   const vm=require('vm');
   const script=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
   const sandbox={navigator:{},localStorage:{getItem:()=>null,setItem:()=>{}},document:{getElementById:()=>({})}}; sandbox.window=sandbox;
   vm.createContext(sandbox);
   try{ vm.runInContext(script,sandbox); console.log('ok'); }catch(e){ console.error(e); }
   NODE
   ```
   L'output non deve contenere `ReferenceError: structuredClone is not defined`.
