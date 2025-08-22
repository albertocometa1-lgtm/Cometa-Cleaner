// storage & offline bootstrap
import {
  initStorage,
  loadState,
  saveState,
  exportBackup,
  importBackup,
  clearAll
} from "./src/storage/storage.js";
import { runScheduledBackup, setBackupFrequency } from "./src/services/backupScheduler.ts";
import { requestBackupDir, getOrRequestDir } from "./src/services/backupStorage.ts";
import { importFromDirectory } from "./src/services/backupSerializer.ts";
import { initDataBackup } from "./src/views/settings/DataBackup.js";

const loaderEl = document.getElementById("loaderOverlay");
const mainEl = document.querySelector("main");
let loaderCount = 0;
let loaderTimer;

function showLoader(){
  loaderCount++;
  if(loaderCount === 1){
    loaderTimer = setTimeout(()=>{
      loaderEl.classList.add("is-active");
      loaderEl.removeAttribute("aria-hidden");
      mainEl.setAttribute("aria-busy","true");
    },200);
  }
}
function hideLoader(){
  loaderCount = Math.max(0, loaderCount-1);
  if(loaderCount === 0){
    clearTimeout(loaderTimer);
    loaderEl.classList.remove("is-active");
    loaderEl.setAttribute("aria-hidden","true");
    mainEl.removeAttribute("aria-busy");
  }
}
window.showLoader = showLoader;
window.hideLoader = hideLoader;

const nativeFetch = window.fetch;
window.fetch = async (...args) => {
  showLoader();
  try {
    return await nativeFetch(...args);
  } finally {
    hideLoader();
  }
};

const BUILD_HASH = "1";

showLoader();
// boot persistence layer before registering service worker
await initStorage();
const persisted = await loadState();
hideLoader();
window.appState = persisted || {};
runScheduledBackup();
await initDataBackup();

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
window.requestBackupDir = requestBackupDir;
window.importBackupFromDir = async () => {
  const dir = await getOrRequestDir();
  if (dir) await importFromDirectory(dir, { merge: false });
};
window.setBackupFrequency = setBackupFrequency;

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

