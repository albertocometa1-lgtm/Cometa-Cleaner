let jszipPromise;

export async function getJSZip(){
  if(!jszipPromise){
    jszipPromise = import('../vendor/jszip.min.js').then(m=>m.default || globalThis.JSZip);
  }
  return jszipPromise;
}

export function makeBackupFilename(prefix='backup'){
  const d = new Date();
  const pad = (n)=>String(n).padStart(2,'0');
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.zip`;
}
