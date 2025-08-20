// storage & offline bootstrap
import {
  initStorage,
  loadState,
  saveState,
  exportBackup,
  importBackup,
  clearAll
} from "./src/storage/storage.js";

const BUILD_HASH = "1";

// boot persistence layer before registering service worker
await initStorage();
const persisted = await loadState();
window.appState = persisted || {};

function triggerSave(reason) {
  if (!window.appState) return;
  saveState(window.appState, { reason });
}

// autosave events
["input", "change", "blur"].forEach(evt => {
  document.addEventListener(evt, () => triggerSave(evt), true);
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") triggerSave("visibilitychange");
});
window.addEventListener("beforeunload", () => triggerSave("beforeunload"));

// expose backup helpers for UI
window.exportBackup = exportBackup;
window.importBackup = importBackup;
window.clearAllData = clearAll;

function showUpdateToast() {
  if (document.getElementById("updateToast")) return;
  const t = document.createElement("div");
  t.id = "updateToast";
  t.className = "toast";
  t.textContent = "Aggiornamento disponibile ";
  const btn = document.createElement("button");
  btn.textContent = "Aggiorna";
  btn.className = "btn";
  btn.addEventListener("click", () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
    t.remove();
  });
  t.appendChild(btn);
  toastWrap.appendChild(t);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(`/service-worker.js?v=${BUILD_HASH}`)
    .then(reg => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });
    });

  navigator.serviceWorker.addEventListener("message", (evt) => {
    if (evt.data?.type === "SW_UPDATE_AVAILABLE") {
      showUpdateToast();
    }
    if (evt.data?.type === "RELOAD_PAGE") {
      window.location.reload();
    }
  });
}

